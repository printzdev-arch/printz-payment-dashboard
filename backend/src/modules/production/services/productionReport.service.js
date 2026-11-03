const mongoose = require("mongoose");
const productionOperationRepository = require("../models/ProductionOperation");
const productionOrderRepository = require("../models/ProductionOrder");
const ErrorHelper = require("../../../utils/ApiError");

const ADMIN_ROLES = ["admin", "super_admin", "superadmin", "owner"];
const ACTIVE_STATUSES = ["IN_PROGRESS", "RUNNING"]; // RUNNING = legacy value
const CLOSED_ORDER_STATUSES = ["COMPLETED", "CANCELLED"];
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const ROW_LIMIT = 2000;
const SHIFT_HOURS = Number(process.env.PRODUCTION_SHIFT_HOURS) || 8;

/* ────────────────────────────────────────────────────────────────────────── */
/* Small helpers                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

const isObjectId = (v) => OBJECT_ID_RE.test(String(v || ""));
const isActive = (status) => ACTIVE_STATUSES.includes(status);
const round = (n, d = 1) => {
  const f = 10 ** d;
  return Math.round((Number(n) || 0) * f) / f;
};
const idOf = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getModel = (name) => (mongoose.models && mongoose.models[name]) || null;
const safeRequire = (p) => {
  try {
    return require(p);
  } catch (e) {
    return null;
  }
};
const reprintModel = () => getModel("ReprintRequest") || safeRequire("../models/ReprintRequest");
const qualityCheckModel = () => getModel("QualityCheck") || safeRequire("../models/QualityCheck");

const scopeBranch = (branchId, user) => {
  if (user && !ADMIN_ROLES.includes(String(user.role || "").toLowerCase()) && user.branchId) {
    return String(user.branchId);
  }
  return isObjectId(branchId) ? String(branchId) : null;
};

const resolveRange = (query = {}) => {
  const now = new Date();
  let to = query.to ? new Date(query.to) : now;
  if (query.to && /^\d{4}-\d{2}-\d{2}$/.test(String(query.to))) to = new Date(`${query.to}T23:59:59.999`);
  let from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * DAY_MS);
  if (query.from && /^\d{4}-\d{2}-\d{2}$/.test(String(query.from))) from = new Date(`${query.from}T00:00:00.000`);
  if (isNaN(from)) from = new Date(to.getTime() - 30 * DAY_MS);
  if (isNaN(to)) to = now;
  if (from > to) from = new Date(to.getTime() - DAY_MS);
  const days = Math.max(1, Math.ceil((to - from) / DAY_MS));
  return { from, to, days };
};

const minutesBetween = (from, to) => {
  if (!from || !to) return 0;
  const diff = (new Date(to) - new Date(from)) / 60000;
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
};

const workedMinutes = (op, now) => {
  let total = Number(op.workedMinutes) || 0;
  if (isActive(op.status)) {
    const log = op.pauseLog || [];
    const last = log[log.length - 1];
    total += minutesBetween(last && last.resumedAt ? last.resumedAt : op.startAt, now);
  }
  return total;
};

const pausedMinutes = (op, now) =>
  (op.pauseLog || []).reduce((sum, p) => sum + minutesBetween(p.pausedAt, p.resumedAt || now), 0);

const mostCommon = (list) => {
  const counts = {};
  list.filter(Boolean).forEach((v) => {
    counts[v] = (counts[v] || 0) + 1;
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : "";
};

const col = (key, label, type = "text", align) => ({ key, label, type, align: align || (type === "text" || type === "status" || type === "date" ? "left" : "right") });

/* ────────────────────────────────────────────────────────────────────────── */
/* Shared lookups                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

const loadNames = async (modelName, ids, pickName) => {
  const Model = getModel(modelName);
  const clean = [...new Set(ids.filter(isObjectId))];
  if (!Model || clean.length === 0) return {};
  const docs = await Model.find({ _id: { $in: clean } }).lean();
  return Object.fromEntries(docs.map((d) => [String(d._id), pickName(d)]));
};

const machineName = (p) => p.printerName || p.name || p.model || "Machine";
const machineType = (p) => p.printerType || p.type || p.category || "Machine";
const userName = (u) => u.name || u.fullName || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "User";

const loadMachineMap = async (ids) => {
  const Printer = getModel("Printer");
  const clean = [...new Set(ids.filter(isObjectId))];
  if (!Printer || clean.length === 0) return {};
  const docs = await Printer.find({ _id: { $in: clean } }).lean();
  return Object.fromEntries(docs.map((d) => [String(d._id), { name: machineName(d), type: machineType(d) }]));
};

const opFilter = (ctx, extra = {}) => {
  const f = { ...extra };
  if (ctx.branch) f.branchId = ctx.branch;
  if (isObjectId(ctx.query.machineId)) f.machineId = ctx.query.machineId;
  if (isObjectId(ctx.query.operatorId)) f.assignedEmployeeId = ctx.query.operatorId;
  return f;
};

const inWindow = (range) => ({
  $or: [{ startAt: { $gte: range.from, $lte: range.to } }, { endAt: { $gte: range.from, $lte: range.to } }],
});

const hasResourceFilter = (query) => isObjectId(query.machineId) || isObjectId(query.operatorId);

// Order ids that have operations on the chosen machine / operator
const orderIdsForResources = async (ctx) => {
  const ops = await productionOperationRepository
    .find(opFilter(ctx, inWindow(ctx.range)))
    .select("productionOrderId")
    .lean();
  return [...new Set(ops.map((o) => idOf(o.productionOrderId)))];
};

const orderBaseFilter = async (ctx, dateField = "createdAt") => {
  const filter = { [dateField]: { $gte: ctx.range.from, $lte: ctx.range.to } };
  if (ctx.branch) filter.branchId = ctx.branch;
  if (ctx.query.priority && ctx.query.priority !== "ALL") filter.priority = String(ctx.query.priority).toUpperCase();
  if (hasResourceFilter(ctx.query)) filter._id = { $in: await orderIdsForResources(ctx) };
  return filter;
};

const populateJob = (q) => q.populate("jobOrderId", "jobNo title customerName dueDate");
const jobOf = (o) => (o.jobOrderId && typeof o.jobOrderId === "object" ? o.jobOrderId : {});
const productOf = (o) => o.specificationsSnapshot?.productName || jobOf(o).title || "";

const statTile = (label, value, tone) => ({ label, value, tone: tone || "neutral" });

/* ────────────────────────────────────────────────────────────────────────── */
/* 1. Production summary                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

const isDelayedOrder = (o, now) => {
  if (!o.plannedEnd || o.status === "CANCELLED") return false;
  const end = CLOSED_ORDER_STATUSES.includes(o.status) ? o.actualEnd || o.updatedAt : now;
  return new Date(end) > new Date(o.plannedEnd);
};

const buildSummary = async (ctx) => {
  const orders = await populateJob(productionOrderRepository.find(await orderBaseFilter(ctx)))
    .sort({ createdAt: -1 })
    .limit(ROW_LIMIT)
    .lean();
  const ids = orders.map((o) => o._id);
  const ops = ids.length ? await productionOperationRepository.find({ productionOrderId: { $in: ids } }).select("productionOrderId wastageQty").lean() : [];
  const waste = {};
  ops.forEach((op) => {
    const k = idOf(op.productionOrderId);
    waste[k] = (waste[k] || 0) + (Number(op.wastageQty) || 0);
  });

  const rows = orders.map((o) => {
    const job = jobOf(o);
    const start = o.actualStart;
    const end = o.actualEnd;
    return {
      productionNo: o.productionNo,
      jobNo: job.jobNo || o.productionNo || "",
      customer: job.customerName || "",
      product: productOf(o),
      cycle: o.cycleType === "ORIGINAL" ? "Original" : `${o.cycleType === "REPRINT" ? "Reprint" : "Rework"} R${o.cycleNo}`,
      priority: o.priority,
      plannedQty: Number(o.plannedQty) || 0,
      goodOutput: Number(o.approvedQty) || Number(o.actualQty) || 0,
      waste: waste[String(o._id)] || 0,
      leadTimeHours: start && end ? round(minutesBetween(start, end) / 60) : null,
      delayed: isDelayedOrder(o, ctx.now) ? "Yes" : "No",
      status: o.status,
    };
  });

  const completed = orders.filter((o) => o.status === "COMPLETED").length;
  const active = orders.filter((o) => !CLOSED_ORDER_STATUSES.includes(o.status) && o.status !== "UNASSIGNED").length;
  const delayed = orders.filter((o) => isDelayedOrder(o, ctx.now)).length;

  return {
    columns: [
      col("jobNo", "Job Order No"),
      col("customer", "Customer"),
      col("product", "Product"),
      col("cycle", "Cycle"),
      col("priority", "Priority"),
      col("plannedQty", "Planned Qty", "number"),
      col("goodOutput", "Good Output", "number"),
      col("waste", "Recorded Waste", "number"),
      col("leadTimeHours", "Lead Time (hrs)", "hours"),
      col("delayed", "Delayed"),
      col("status", "Status", "status"),
    ],
    rows,
    summary: [
      statTile("Created", orders.length),
      statTile("Completed", completed, "good"),
      statTile("Active", active),
      statTile("Delayed", delayed, delayed ? "bad" : "good"),
    ],
  };
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 2. Operation performance                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

const buildOpPerformance = async (ctx) => {
  const ops = await productionOperationRepository
    .find(opFilter(ctx, { status: "COMPLETED", endAt: { $gte: ctx.range.from, $lte: ctx.range.to } }))
    .lean();

  const groups = {};
  ops.forEach((op) => {
    const key = op.operationCode;
    const g = (groups[key] = groups[key] || { name: op.operationName || op.operationCode, std: [], actual: [] });
    if (Number(op.estimatedMinutes) > 0) g.std.push(Number(op.estimatedMinutes));
    g.actual.push(workedMinutes(op, ctx.now));
    g.count = (g.count || 0) + 1;
  });

  const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);
  const rows = Object.entries(groups)
    .map(([code, g]) => {
      const std = avg(g.std);
      const actual = avg(g.actual);
      const variance = std !== null && actual !== null ? round(actual - std) : null;
      return {
        operation: g.name,
        code,
        batches: g.count,
        standardMinutes: std === null ? null : round(std),
        actualMinutes: actual === null ? null : round(actual),
        varianceMinutes: variance,
        efficiency: std && actual ? round((std / actual) * 100) : null,
      };
    })
    .sort((a, b) => b.batches - a.batches);

  const withEff = rows.filter((r) => r.efficiency !== null);
  return {
    columns: [
      col("operation", "Operation"),
      col("code", "Code"),
      col("batches", "Batches", "number"),
      col("standardMinutes", "Planned Avg (min)", "number"),
      col("actualMinutes", "Actual Avg (min)", "number"),
      col("varianceMinutes", "Variance (min)", "number"),
      col("efficiency", "Throughput Efficiency", "percent"),
    ],
    rows,
    summary: [
      statTile("Operations Completed", ops.length),
      statTile("Operation Types", rows.length),
      statTile("Average Efficiency", withEff.length ? `${round(withEff.reduce((s, r) => s + r.efficiency, 0) / withEff.length)}%` : "—"),
    ],
    note: "Planned time is the estimate saved during planning. Efficiency = planned ÷ actual. Positive variance means slower than planned.",
  };
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 3. Machine utilization                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const buildMachineUtilization = async (ctx) => {
  const ops = await productionOperationRepository
    .find(opFilter(ctx, { machineId: isObjectId(ctx.query.machineId) ? ctx.query.machineId : { $ne: null }, ...inWindow(ctx.range) }))
    .lean();
  const machines = await loadMachineMap(ops.map((o) => idOf(o.machineId)));

  const groups = {};
  ops.forEach((op) => {
    const id = idOf(op.machineId);
    const g = (groups[id] = groups[id] || { ops: 0, done: 0, worked: 0, paused: 0, output: 0, input: 0 });
    g.ops += 1;
    if (op.status === "COMPLETED") {
      g.done += 1;
      g.output += Number(op.outputQty) || 0;
      g.input += Number(op.inputQty) || 0;
    }
    g.worked += workedMinutes(op, ctx.now);
    g.paused += pausedMinutes(op, ctx.now);
  });

  const availableHours = SHIFT_HOURS * ctx.range.days;
  const rows = Object.entries(groups)
    .map(([id, g]) => {
      const running = g.worked / 60;
      return {
        machine: machines[id]?.name || "Unknown machine",
        category: machines[id]?.type || "",
        operations: g.ops,
        runningHours: round(running),
        idleHours: round(Math.max(0, availableHours - running)),
        downtimeHours: round(g.paused / 60),
        utilization: round(Math.min(100, (running / availableHours) * 100)),
        yield: g.input > 0 ? round((g.output / g.input) * 100) : null,
      };
    })
    .sort((a, b) => b.utilization - a.utilization);

  return {
    columns: [
      col("machine", "Machine"),
      col("category", "Category"),
      col("operations", "Operations", "number"),
      col("runningHours", "Running Hours", "hours"),
      col("idleHours", "Idle Hours", "hours"),
      col("downtimeHours", "Downtime (Pauses)", "hours"),
      col("utilization", "Utilization", "percent"),
      col("yield", "Yield", "percent"),
    ],
    rows,
    summary: [
      statTile("Machines Used", rows.length),
      statTile("Avg Utilization", rows.length ? `${round(rows.reduce((s, r) => s + r.utilization, 0) / rows.length)}%` : "—"),
      statTile("Total Running Hours", round(rows.reduce((s, r) => s + r.runningHours, 0))),
      statTile("Total Downtime Hours", round(rows.reduce((s, r) => s + r.downtimeHours, 0))),
    ],
    note: `Utilization compares worked time with ${SHIFT_HOURS} hours per day over ${ctx.range.days} day(s). Downtime is time operations spent paused.`,
  };
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 4. Operator productivity                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

const buildOperatorProductivity = async (ctx) => {
  const ops = await productionOperationRepository
    .find(opFilter(ctx, { assignedEmployeeId: isObjectId(ctx.query.operatorId) ? ctx.query.operatorId : { $ne: null }, ...inWindow(ctx.range) }))
    .lean();
  const users = await loadNames("User", ops.map((o) => idOf(o.assignedEmployeeId)), userName);
  const machines = await loadMachineMap(ops.map((o) => idOf(o.machineId)));

  const groups = {};
  ops.forEach((op) => {
    const id = idOf(op.assignedEmployeeId);
    const g = (groups[id] = groups[id] || { ops: 0, done: 0, failed: 0, worked: 0, output: 0, input: 0, stations: [] });
    g.ops += 1;
    if (op.status === "COMPLETED") {
      g.done += 1;
      g.output += Number(op.outputQty) || 0;
      g.input += Number(op.inputQty) || 0;
    }
    if (op.status === "FAILED") g.failed += 1;
    g.worked += workedMinutes(op, ctx.now);
    g.stations.push(machines[idOf(op.machineId)]?.name || op.machine || "");
  });

  const rows = Object.entries(groups)
    .map(([id, g]) => ({
      operator: users[id] || "Unknown operator",
      station: mostCommon(g.stations),
      operations: g.ops,
      completed: g.done,
      failed: g.failed,
      goodOutput: g.output,
      hours: round(g.worked / 60),
      perHour: g.worked > 0 ? round(g.output / (g.worked / 60), 0) : null,
      yield: g.input > 0 ? round((g.output / g.input) * 100) : null,
    }))
    .sort((a, b) => b.goodOutput - a.goodOutput);

  return {
    columns: [
      col("operator", "Operator"),
      col("station", "Main Machine"),
      col("operations", "Operations", "number"),
      col("completed", "Completed", "number"),
      col("failed", "Failed", "number"),
      col("goodOutput", "Good Output", "number"),
      col("hours", "Time Logged", "hours"),
      col("perHour", "Pieces / Hour", "number"),
      col("yield", "Yield", "percent"),
    ],
    rows,
    summary: [
      statTile("Operators", rows.length),
      statTile("Operations Completed", rows.reduce((s, r) => s + r.completed, 0), "good"),
      statTile("Good Output", rows.reduce((s, r) => s + r.goodOutput, 0)),
    ],
  };
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 5. Wastage                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

const buildWastage = async (ctx) => {
  const ops = await productionOperationRepository
    .find(opFilter(ctx, { status: { $in: ["COMPLETED", "FAILED"] }, endAt: { $gte: ctx.range.from, $lte: ctx.range.to } }))
    .lean();

  const groups = {};
  ops.forEach((op) => {
    const g = (groups[op.operationCode] = groups[op.operationCode] || { name: op.operationName || op.operationCode, input: 0, output: 0, waste: 0, failed: 0, reasons: [] });
    if (op.status === "COMPLETED") {
      g.input += Number(op.inputQty) || 0;
      g.output += Number(op.outputQty) || 0;
    }
    g.waste += Number(op.wastageQty) || 0;
    if (op.status === "FAILED") {
      g.failed += 1;
      g.waste += Number(op.affectedQty) || 0;
      g.reasons.push(op.failureReason);
    }
  });

  const rows = Object.entries(groups)
    .map(([code, g]) => ({
      operation: g.name,
      code,
      input: g.input,
      goodOutput: g.output,
      waste: g.waste,
      wastePct: g.input > 0 ? round((g.waste / g.input) * 100) : null,
      failures: g.failed,
      reason: mostCommon(g.reasons) || "—",
    }))
    .sort((a, b) => b.waste - a.waste);

  const totalWaste = rows.reduce((s, r) => s + r.waste, 0);
  const totalInput = rows.reduce((s, r) => s + r.input, 0);
  return {
    columns: [
      col("operation", "Operation"),
      col("code", "Code"),
      col("input", "Total Input", "number"),
      col("goodOutput", "Good Output", "number"),
      col("waste", "Waste", "number"),
      col("wastePct", "Waste %", "percent"),
      col("failures", "Failed Ops", "number"),
      col("reason", "Main Failure Reason"),
    ],
    rows,
    summary: [
      statTile("Total Waste", totalWaste, totalWaste ? "bad" : "good"),
      statTile("Waste %", totalInput > 0 ? `${round((totalWaste / totalInput) * 100)}%` : "—"),
      statTile("Failed Operations", rows.reduce((s, r) => s + r.failures, 0)),
    ],
    note: "Waste adds recorded wastage on completed operations and the affected quantity on failed ones.",
  };
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 6. Rework                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

const buildRework = async (ctx) => {
  const ops = await productionOperationRepository
    .find(opFilter(ctx, { isRework: true, $or: [{ createdAt: { $gte: ctx.range.from, $lte: ctx.range.to } }, ...inWindow(ctx.range).$or] }))
    .sort({ createdAt: -1 })
    .limit(ROW_LIMIT)
    .lean();

  const orders = await populateJob(productionOrderRepository.find({ _id: { $in: [...new Set(ops.map((o) => idOf(o.productionOrderId)))] } })).lean();
  const orderMap = Object.fromEntries(orders.map((o) => [String(o._id), o]));
  const users = await loadNames("User", ops.map((o) => idOf(o.assignedEmployeeId)), userName);

  const rows = ops.map((op) => {
    const order = orderMap[idOf(op.productionOrderId)] || {};
    return {
      productionNo: order.productionNo || "",
      jobNo: jobOf(order).jobNo || order.productionNo || "",
      product: productOf(order),
      operation: op.operationName || op.operationCode,
      cycle: `R${op.cycleNo || 0}`,
      operator: users[idOf(op.assignedEmployeeId)] || op.operatorName || "",
      status: op.status,
      recoveredQty: Number(op.outputQty) || Number(op.completedQty) || 0,
      waste: Number(op.wastageQty) || 0,
      laborHours: round(workedMinutes(op, ctx.now) / 60),
      reason: op.instructions || op.remarks || "",
    };
  });

  return {
    columns: [
      col("jobNo", "Job Order No"),
      col("product", "Product"),
      col("operation", "Rework Operation"),
      col("cycle", "Cycle"),
      col("operator", "Operator"),
      col("status", "Status", "status"),
      col("recoveredQty", "Recovered Qty", "number"),
      col("waste", "Waste", "number"),
      col("laborHours", "Labor Hours", "hours"),
      col("reason", "Reason / Instructions"),
    ],
    rows,
    summary: [
      statTile("Rework Operations", rows.length),
      statTile("Completed", rows.filter((r) => r.status === "COMPLETED").length, "good"),
      statTile("Recovered Qty", rows.reduce((s, r) => s + r.recoveredQty, 0)),
      statTile("Labor Hours", round(rows.reduce((s, r) => s + r.laborHours, 0))),
    ],
  };
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 7. Reprints                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

const buildReprint = async (ctx) => {
  const Reprint = reprintModel();
  if (!Reprint) return { columns: [], rows: [], summary: [], note: "Reprint requests are not available." };

  const filter = { createdAt: { $gte: ctx.range.from, $lte: ctx.range.to } };
  if (ctx.branch) filter.branchId = ctx.branch;
  const requests = await Reprint.find(filter).populate("jobOrderId", "jobNo title customerName").sort({ createdAt: -1 }).limit(ROW_LIMIT).lean();

  const rows = requests.map((r) => {
    const job = r.jobOrderId && typeof r.jobOrderId === "object" ? r.jobOrderId : {};
    return {
      requestNo: r.requestNo || String(r._id).slice(-6),
      jobNo: job.jobNo || "",
      customer: job.customerName || "",
      defectType: r.defectType || "—",
      reason: r.reason || "",
      sourceStage: r.sourceStage || "",
      quantity: Number(r.quantity) || 0,
      cycle: `R${r.cycleNo || 1}`,
      requestedAt: r.createdAt,
      decidedAt: r.approvedAt || null,
      completedAt: r.completedAt || null,
      status: r.status === "REQUESTED" ? "PENDING" : r.status,
    };
  });

  const topDefect = mostCommon(requests.map((r) => r.defectType));
  return {
    columns: [
      col("requestNo", "Request No"),
      col("jobNo", "Job No"),
      col("customer", "Customer"),
      col("defectType", "Defect"),
      col("reason", "Reason"),
      col("sourceStage", "Found At"),
      col("quantity", "Quantity", "number"),
      col("cycle", "Cycle"),
      col("requestedAt", "Requested", "date"),
      col("decidedAt", "Approved", "date"),
      col("completedAt", "Completed", "date"),
      col("status", "Status", "status"),
    ],
    rows,
    summary: [
      statTile("Requests", rows.length),
      statTile("Pending", rows.filter((r) => r.status === "PENDING").length, "warn"),
      statTile("Reprinted Qty", rows.filter((r) => r.status !== "REJECTED").reduce((s, r) => s + r.quantity, 0)),
      statTile("Top Defect", topDefect || "—"),
    ],
  };
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 8. Delivery delays                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

const buildDeliveryDelays = async (ctx) => {
  const base = { status: { $ne: "CANCELLED" }, plannedEnd: { $ne: null } };
  if (ctx.branch) base.branchId = ctx.branch;
  if (ctx.query.priority && ctx.query.priority !== "ALL") base.priority = String(ctx.query.priority).toUpperCase();
  if (hasResourceFilter(ctx.query)) base._id = { $in: await orderIdsForResources(ctx) };

  // Orders due inside the window, or still open and already past their date
  const orders = await populateJob(
    productionOrderRepository.find({
      ...base,
      $or: [
        { plannedEnd: { $gte: ctx.range.from, $lte: ctx.range.to } },
        { status: { $nin: CLOSED_ORDER_STATUSES }, plannedEnd: { $lt: ctx.now } },
      ],
    })
  )
    .limit(ROW_LIMIT)
    .lean();

  const ids = orders.map((o) => o._id);
  const ops = ids.length ? await productionOperationRepository.find({ productionOrderId: { $in: ids } }).sort({ sequenceNo: 1 }).lean() : [];
  const opsByOrder = {};
  ops.forEach((op) => {
    (opsByOrder[idOf(op.productionOrderId)] = opsByOrder[idOf(op.productionOrderId)] || []).push(op);
  });

  const bottleneck = (list = []) => {
    const open = list.find((op) => !["COMPLETED", "SKIPPED"].includes(op.status));
    if (open) return `${open.operationName || open.operationCode} (${open.status === "PENDING" ? "not started" : open.status.toLowerCase().replace("_", " ")})`;
    const slowest = [...list].sort((a, b) => workedMinutes(b, ctx.now) + pausedMinutes(b, ctx.now) - (workedMinutes(a, ctx.now) + pausedMinutes(a, ctx.now)))[0];
    return slowest ? `${slowest.operationName || slowest.operationCode} (slowest)` : "—";
  };

  const examined = orders.length;
  const late = [];
  orders.forEach((o) => {
    const closed = CLOSED_ORDER_STATUSES.includes(o.status);
    const due = new Date(o.plannedEnd);
    const finished = closed ? new Date(o.actualEnd || o.updatedAt) : ctx.now;
    if (finished <= due) return;
    const job = jobOf(o);
    late.push({
      productionNo: o.productionNo,
      jobNo: job.jobNo || "",
      customer: job.customerName || "",
      priority: o.priority,
      dueDate: due,
      finishedAt: closed ? finished : null,
      delayDays: round((finished - due) / DAY_MS),
      bottleneck: closed ? "—" : bottleneck(opsByOrder[String(o._id)]),
      status: o.status,
    });
  });
  late.sort((a, b) => b.delayDays - a.delayDays);

  const onTimePct = examined ? round(((examined - late.length) / examined) * 100) : null;
  return {
    columns: [
      col("jobNo", "Job Order No"),
      col("customer", "Customer"),
      col("priority", "Priority"),
      col("dueDate", "Planned End", "date"),
      col("finishedAt", "Finished", "date"),
      col("delayDays", "Days Late", "number"),
      col("bottleneck", "Held Up At"),
      col("status", "Status", "status"),
    ],
    rows: late,
    summary: [
      statTile("Orders Checked", examined),
      statTile("Late Orders", late.length, late.length ? "bad" : "good"),
      statTile("On-Time Rate", onTimePct === null ? "—" : `${onTimePct}%`, onTimePct !== null && onTimePct < 90 ? "warn" : "good"),
      statTile("Longest Delay (days)", late[0] ? late[0].delayDays : 0),
    ],
    note: "Compares each order's planned end with its actual finish, or with today for orders still open.",
  };
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 9. Material consumption                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const buildMaterials = async (ctx) => {
  const orders = await productionOrderRepository.find(await orderBaseFilter(ctx)).select("materials").limit(ROW_LIMIT).lean();
  const ids = orders.map((o) => o._id);
  const ops = ids.length ? await productionOperationRepository.find({ productionOrderId: { $in: ids } }).select("consumptionRecords").lean() : [];

  const map = {};
  const entry = (name, unit) => {
    const key = `${String(name || "").trim().toLowerCase()}|${String(unit || "").trim().toLowerCase()}`;
    return (map[key] = map[key] || { material: String(name || "").trim() || "Unnamed", unit: unit || "", planned: 0, actual: 0 });
  };

  orders.forEach((o) => (o.materials || []).forEach((m) => (entry(m.name, m.unit).planned += Number(m.requiredQty) || 0)));
  ops.forEach((op) => (op.consumptionRecords || []).forEach((c) => (entry(c.itemName, c.unit).actual += Number(c.quantity) || 0)));

  const rows = Object.values(map)
    .map((m) => {
      const variance = round(m.actual - m.planned, 2);
      return {
        material: m.material,
        unit: m.unit,
        planned: round(m.planned, 2),
        actual: round(m.actual, 2),
        variance,
        variancePct: m.planned > 0 ? round((variance / m.planned) * 100) : null,
        result: m.planned === 0 ? "UNPLANNED" : variance > 0 ? "OVER" : "WITHIN",
      };
    })
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  return {
    columns: [
      col("material", "Material"),
      col("unit", "Unit"),
      col("planned", "Planned", "number"),
      col("actual", "Consumed", "number"),
      col("variance", "Variance", "number"),
      col("variancePct", "Variance %", "percent"),
      col("result", "Result", "status"),
    ],
    rows,
    summary: [
      statTile("Materials", rows.length),
      statTile("Over Plan", rows.filter((r) => r.result === "OVER").length, "warn"),
      statTile("Unplanned Use", rows.filter((r) => r.result === "UNPLANNED").length),
    ],
    note: "Planned comes from each order's material plan; consumed comes from quantities entered when operations were completed. Names are matched by text.",
  };
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 10. Job production history                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

const buildJobHistory = async (ctx) => {
  const term = String(ctx.query.jobNo || ctx.query.search || "").trim();
  const orderId = isObjectId(ctx.query.productionOrderId) ? ctx.query.productionOrderId : null;
  const columns = [
    col("at", "When", "date"),
    col("jobNo", "Job Order No"),
    col("event", "Event"),
    col("detail", "Details"),
    col("by", "By"),
  ];
  if (!term && !orderId) {
    return { columns, rows: [], summary: [], note: "Enter a job order number to see its history." };
  }

  const orderFilter = {};
  if (orderId) {
    orderFilter._id = orderId;
  } else {
    const JobOrder = getModel("JobOrder");
    const jobs = JobOrder ? await JobOrder.find({ jobNo: new RegExp(`^${escapeRegex(term)}$`, "i") }).select("_id").lean() : [];
    orderFilter.$or = [{ productionNo: new RegExp(`^${escapeRegex(term)}$`, "i") }];
    if (jobs.length) orderFilter.$or.push({ jobOrderId: { $in: jobs.map((j) => j._id) } });
  }
  if (ctx.branch) orderFilter.branchId = ctx.branch;

  const orders = await populateJob(productionOrderRepository.find(orderFilter)).sort({ createdAt: 1 }).limit(50).lean();
  if (orders.length === 0) return { columns, rows: [], summary: [], note: `No job order found for "${term}".` };

  const ids = orders.map((o) => o._id);
  const ops = await productionOperationRepository.find({ productionOrderId: { $in: ids } }).sort({ sequenceNo: 1 }).lean();
  const QC = qualityCheckModel();
  const checks = QC ? await QC.find({ productionOrderId: { $in: ids } }).lean() : [];
  const Reprint = reprintModel();
  const reprints = Reprint ? await Reprint.find({ $or: [{ productionOrderId: { $in: ids } }, { _id: { $in: orders.map((o) => o.reprintRequestId).filter(Boolean) } }] }).lean() : [];

  const userIds = [];
  orders.forEach((o) => (o.statusHistory || []).forEach((h) => userIds.push(idOf(h.changedBy))));
  ops.forEach((op) => (op.pauseLog || []).forEach((p) => userIds.push(idOf(p.pausedBy))));
  checks.forEach((c) => userIds.push(idOf(c.checkedBy)));
  const users = await loadNames("User", userIds, userName);
  const orderJobNo = Object.fromEntries(orders.map((o) => [String(o._id), jobOf(o).jobNo || o.productionNo || ""]));

  const events = [];
  const push = (at, jobNo, event, detail = "", by = "") => at && events.push({ at: new Date(at), jobNo, event, detail, by });

  orders.forEach((o) => {
    const jNo = orderJobNo[String(o._id)] || "";
    push(o.createdAt, jNo, "Production started", `${o.cycleType === "ORIGINAL" ? "Original" : o.cycleType} cycle, planned qty ${o.plannedQty || 0}`);
    (o.statusHistory || []).forEach((h) =>
      push(h.changedAt, jNo, `Status: ${h.from || "—"} → ${h.to}`, h.reason || "", users[idOf(h.changedBy)] || "")
    );
  });

  ops.forEach((op) => {
    const no = orderJobNo[idOf(op.productionOrderId)] || "";
    const name = op.operationName || op.operationCode;
    const tag = op.isRework ? `${name} (rework)` : name;
    push(op.startAt, no, `${tag} started`, [op.machine && `Machine: ${op.machine}`, op.operatorName && `Operator: ${op.operatorName}`].filter(Boolean).join(" · "), op.operatorName);
    (op.pauseLog || []).forEach((p) => {
      push(p.pausedAt, no, `${tag} paused`, p.reason || "", users[idOf(p.pausedBy)] || "");
      push(p.resumedAt, no, `${tag} resumed`, "");
    });
    if (op.endAt) {
      const detail =
        op.status === "FAILED"
          ? `Reason: ${op.failureReason || "—"} · affected ${op.affectedQty || 0}`
          : op.status === "SKIPPED"
          ? op.remarks || ""
          : `Output ${op.outputQty || 0} · waste ${op.wastageQty || 0} · worked ${round(workedMinutes(op, ctx.now))} min`;
      push(op.endAt, no, `${tag} ${op.status.toLowerCase().replace("_", " ")}`, detail, op.operatorName);
    }
  });

  checks.forEach((c) =>
    push(
      c.checkedAt || c.createdAt,
      orderNo[idOf(c.productionOrderId)],
      `QC ${String(c.result || "").toLowerCase()}`,
      `Checked ${c.quantityChecked || 0} · accepted ${c.acceptedQty || 0} · rejected ${c.rejectedQty || 0}${c.correctiveAction ? ` · action: ${c.correctiveAction}` : ""}`,
      users[idOf(c.checkedBy)] || ""
    )
  );

  reprints.forEach((r) => {
    const no = orderJobNo[idOf(r.productionOrderId)] || "";
    push(r.createdAt, no, `Reprint requested (${r.requestNo || ""})`, `${r.quantity || 0} pcs · ${r.defectType || r.reason || ""}`);
    push(r.approvedAt, no, r.status === "REJECTED" ? "Reprint rejected" : "Reprint approved", r.rejectionReason || r.managerComments || "");
    push(r.completedAt, no, "Reprint completed", "");
  });

  events.sort((a, b) => a.at - b.at);
  const job = jobOf(orders[0]);
  return {
    columns,
    rows: events,
    summary: [
      statTile("Job Order No", job.jobNo || orders[0].productionNo),
      statTile("Customer", job.customerName || "—"),
      
      statTile("Events", events.length),
    ],
  };
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Registry                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

const REPORTS = {
  SUMMARY: { title: "Production Summary", description: "Created, completed, active and delayed orders overview", build: buildSummary },
  OP_PERFORMANCE: { title: "Operation Performance", description: "Planned vs actual time per operation", build: buildOpPerformance },
  MACHINE_UTILIZATION: { title: "Machine Utilization", description: "Running hours, downtime and idle capacity per machine", build: buildMachineUtilization },
  OPERATOR_PRODUCTIVITY: { title: "Operator Productivity", description: "Completed operations and good output per operator", build: buildOperatorProductivity },
  PRODUCTION_WASTAGE: { title: "Production Wastage", description: "Waste quantities and failure reasons by operation", build: buildWastage },
  REWORK_ANALYSIS: { title: "Rework Analysis", description: "Rework operations, recovered output and labor hours", build: buildRework },
  REPRINT_ANALYSIS: { title: "Reprint Analysis", description: "Reprint requests, defects and decisions", build: buildReprint },
  DELIVERY_DELAYS: { title: "Delivery Delay Analysis", description: "Late orders and where they are held up", build: buildDeliveryDelays },
  MATERIAL_CONSUMPTION: { title: "Material Consumption", description: "Planned vs consumed materials", build: buildMaterials },
  JOB_HISTORY: { title: "Job Production History", description: "Chronological timeline of every stage on a job", build: buildJobHistory },
};

/* ────────────────────────────────────────────────────────────────────────── */
/* CSV export                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

const csvCell = (value, type) => {
  if (value === null || value === undefined) return "";
  let text = value;
  if (type === "date" || value instanceof Date) {
    const d = new Date(value);
    text = isNaN(d) ? "" : d.toISOString().replace("T", " ").slice(0, 16);
  }
  text = String(text);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

class ProductionReportService {
  listReports() {
    return Object.entries(REPORTS).map(([id, r]) => ({ id, title: r.title, description: r.description }));
  }

  async getReport(type, query = {}, user) {
    const def = REPORTS[String(type || "").toUpperCase()];
    if (!def) throw ErrorHelper.badRequest(`Unknown report '${type}'. Use one of: ${Object.keys(REPORTS).join(", ")}.`);

    const ctx = {
      query,
      user,
      now: new Date(),
      range: resolveRange(query),
      branch: scopeBranch(query.branchId, user),
    };
    const result = await def.build(ctx);

    return {
      type: String(type).toUpperCase(),
      title: def.title,
      description: def.description,
      range: { from: ctx.range.from, to: ctx.range.to, days: ctx.range.days },
      generatedAt: ctx.now,
      columns: result.columns,
      rows: result.rows,
      total: result.rows.length,
      truncated: result.rows.length >= ROW_LIMIT,
      summary: result.summary || [],
      note: result.note || "",
    };
  }

  async exportCsv(type, query = {}, user) {
    const report = await this.getReport(type, query, user);
    const lines = [report.columns.map((c) => csvCell(c.label)).join(",")];
    report.rows.forEach((row) => lines.push(report.columns.map((c) => csvCell(row[c.key], c.type)).join(",")));
    const stamp = (d) => new Date(d).toISOString().slice(0, 10);
    return {
      filename: `production-${report.type.toLowerCase()}-${stamp(report.range.from)}-to-${stamp(report.range.to)}.csv`,
      content: `﻿${lines.join("\r\n")}\r\n`,
    };
  }
}

module.exports = new ProductionReportService();