const mongoose = require("mongoose");
const productionOperationRepository = require("../models/ProductionOperation");
const productionOrderRepository = require("../models/ProductionOrder");

const ADMIN_ROLES = ["admin", "super_admin", "superadmin", "owner"];
const ACTIVE_STATUSES = ["IN_PROGRESS", "RUNNING"]; // RUNNING = legacy value
const CLOSED_STATUSES = ["COMPLETED", "CANCELLED"];
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const SHIFT_HOURS = Number(process.env.PRODUCTION_SHIFT_HOURS) || 8;
const MAX_BUCKETS = 10;

const isObjectId = (v) => OBJECT_ID_RE.test(String(v || ""));
const isActive = (s) => ACTIVE_STATUSES.includes(s);
const round = (n, d = 1) => {
  const f = 10 ** d;
  return Math.round((Number(n) || 0) * f) / f;
};
const idOf = (v) => {
  if (!v) return "";
  if (typeof v === "object" && v._id) return String(v._id);
  return String(v);
};
const getModel = (name) => (mongoose.models && mongoose.models[name]) || null;
const safeRequire = (p) => {
  try {
    return require(p);
  } catch (e) {
    return null;
  }
};
const reprintModel = () => getModel("ReprintRequest") || safeRequire("../models/ReprintRequest");

const scopeBranch = (branchId, user) => {
  if (user && !ADMIN_ROLES.includes(String(user.role || "").toLowerCase()) && user.branchId) return String(user.branchId);
  return isObjectId(branchId) ? String(branchId) : null;
};

const resolveRange = (query = {}) => {
  const now = new Date();
  let to = query.to ? new Date(query.to) : now;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(query.to || ""))) to = new Date(`${query.to}T23:59:59.999`);
  let from = query.from ? new Date(query.from) : new Date(to.getFullYear(), to.getMonth(), 1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(query.from || ""))) from = new Date(`${query.from}T00:00:00.000`);
  if (isNaN(to)) to = now;
  if (isNaN(from)) from = new Date(to.getFullYear(), to.getMonth(), 1);
  if (from > to) from = new Date(to.getTime() - DAY_MS);
  const length = to - from;
  return { from, to, length, days: Math.max(1, Math.ceil(length / DAY_MS)), prevFrom: new Date(from.getTime() - length - 1), prevTo: new Date(from.getTime() - 1) };
};

const minutesBetween = (a, b) => {
  if (!a || !b) return 0;
  const m = (new Date(b) - new Date(a)) / 60000;
  return Number.isFinite(m) && m > 0 ? m : 0;
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

// Percentage change against the previous period. null = nothing to compare with.
const trendOf = (current, previous) => {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const jobOf = (o) => (o.jobOrderId && typeof o.jobOrderId === "object" ? o.jobOrderId : {});
const productOf = (o) => o.specificationsSnapshot?.productName || jobOf(o).title || "";
const goodQty = (o) => Number(o.approvedQty) || Number(o.actualQty) || 0;

const STATUS_GROUPS = [
  { key: "UNASSIGNED", label: "Pending Planning", statuses: ["UNASSIGNED"] },
  { key: "PLANNED", label: "Planned", statuses: ["PLANNED"] },
  { key: "IN_PRODUCTION", label: "In Production", statuses: ["IN_PROGRESS"] },
  { key: "QC", label: "QC / Corrections", statuses: ["QC", "QC_PASSED", "QC_ISSUE", "REWORK_REQUIRED", "REPRINT_REQUIRED"] },
  { key: "ON_HOLD", label: "On Hold", statuses: ["ON_HOLD"] },
  { key: "COMPLETED", label: "Completed", statuses: ["COMPLETED"] },
  { key: "CANCELLED", label: "Cancelled", statuses: ["CANCELLED"] },
];

class ProductionDashboardService {
  async getDashboard(query = {}, user) {
    const now = new Date();
    const range = resolveRange(query);
    const branch = scopeBranch(query.branchId, user);
    const withBranch = (f) => (branch ? { ...f, branchId: branch } : f);
    const inRange = (field, from = range.from, to = range.to) => ({ [field]: { $gte: from, $lte: to } });

    const Reprint = reprintModel();
    const populateJob = (q) => q.populate("jobOrderId", "jobNo title customerName dueDate");

    const [
      createdOrders,
      prevCreated,
      completedNow,
      completedPrev,
      inProductionNow,
      pendingPlanningNow,
      reworkOpen,
      reprintsNow,
      reprintsPrev,
      scheduleOrders,
      ongoing,
      pending,
      reworkOps,
      reprintRows,
      windowOps,
      openOrders,
      heldOrders,
      failedOps,
      pausedOps,
    ] = await Promise.all([
      productionOrderRepository.find(withBranch(inRange("createdAt"))).select("status").lean(),
      productionOrderRepository.countDocuments(withBranch(inRange("createdAt", range.prevFrom, range.prevTo))),
      productionOrderRepository.countDocuments(withBranch({ status: "COMPLETED", ...inRange("actualEnd") })),
      productionOrderRepository.countDocuments(withBranch({ status: "COMPLETED", ...inRange("actualEnd", range.prevFrom, range.prevTo) })),
      productionOrderRepository.countDocuments(withBranch({ status: "IN_PROGRESS" })),
      productionOrderRepository.countDocuments(withBranch({ status: "UNASSIGNED" })),
      productionOperationRepository.countDocuments(withBranch({ isRework: true, status: { $in: ["PENDING", "IN_PROGRESS", "RUNNING", "PAUSED", "ON_HOLD"] } })),
      Reprint ? Reprint.countDocuments(withBranch(inRange("createdAt"))) : 0,
      Reprint ? Reprint.countDocuments(withBranch(inRange("createdAt", range.prevFrom, range.prevTo))) : 0,
      productionOrderRepository
        .find(withBranch({ status: { $ne: "CANCELLED" }, $or: [inRange("plannedEnd"), inRange("actualEnd")] }))
        .select("plannedQty approvedQty actualQty plannedEnd actualEnd status")
        .lean(),
      populateJob(productionOrderRepository.find(withBranch({ status: "IN_PROGRESS" })).sort({ updatedAt: -1 }).limit(5)).lean(),
      populateJob(productionOrderRepository.find(withBranch({ status: "UNASSIGNED" })).sort({ plannedEnd: 1, createdAt: 1 }).limit(5)).lean(),
      productionOperationRepository
        .find(withBranch({ isRework: true, $or: [inRange("createdAt"), inRange("startAt"), inRange("endAt")] }))
        .select("status")
        .lean(),
      Reprint ? Reprint.find(withBranch(inRange("createdAt"))).select("status").lean() : [],
      productionOperationRepository
        .find(withBranch({ machineId: { $ne: null }, $or: [inRange("startAt"), inRange("endAt"), { status: { $in: [...ACTIVE_STATUSES, "PAUSED"] } }] }))
        .select("machineId status startAt endAt workedMinutes pauseLog")
        .lean(),
      populateJob(productionOrderRepository.find(withBranch({ status: { $nin: CLOSED_STATUSES }, plannedEnd: { $lt: now } })).sort({ plannedEnd: 1 }).limit(5)).lean(),
      populateJob(productionOrderRepository.find(withBranch({ status: "ON_HOLD" })).sort({ updatedAt: -1 }).limit(3)).lean(),
      productionOperationRepository
        .find(withBranch({ status: "FAILED", endAt: { $gte: new Date(now - 7 * DAY_MS) } }))
        .sort({ endAt: -1 })
        .limit(3)
        .populate("productionOrderId", "productionNo")
        .lean(),
      productionOperationRepository
        .find(withBranch({ status: "PAUSED" }))
        .select("operationName operationCode pausedReason pauseLog productionOrderId")
        .populate("productionOrderId", "productionNo")
        .limit(20)
        .lean(),
    ]);

    /* KPI cards (trend only where the figure is comparable between periods) */
    const reprintPending = reprintRows.filter((r) => r.status === "REQUESTED").length;
    const kpis = {
      totalOrders: { value: createdOrders.length, trend: trendOf(createdOrders.length, prevCreated) },
      inProduction: { value: inProductionNow, trend: null },
      completed: { value: completedNow, trend: trendOf(completedNow, completedPrev) },
      pendingPlanning: { value: pendingPlanningNow, trend: null },
      rework: { value: reworkOpen, trend: null },
      reprints: { value: reprintsNow, trend: trendOf(reprintsNow, reprintsPrev) },
    };

    /* Planned vs completed quantity, grouped into at most MAX_BUCKETS slices */
    const stepDays = Math.max(1, Math.ceil(range.days / MAX_BUCKETS));
    const stepMs = stepDays * DAY_MS;
    const bucketCount = Math.max(1, Math.ceil(range.length / stepMs));
    const progress = Array.from({ length: bucketCount }, (_, i) => ({
      start: new Date(range.from.getTime() + i * stepMs),
      planned: 0,
      completed: 0,
    }));
    const slot = (date) => {
      const i = Math.floor((new Date(date) - range.from) / stepMs);
      return i >= 0 && i < bucketCount ? progress[i] : null;
    };
    scheduleOrders.forEach((o) => {
      if (o.plannedEnd) {
        const s = slot(o.plannedEnd);
        if (s) s.planned += Number(o.plannedQty) || 0;
      }
      if (o.actualEnd) {
        const s = slot(o.actualEnd);
        if (s) s.completed += goodQty(o) || (o.status === "COMPLETED" ? Number(o.plannedQty) || 0 : 0);
      }
    });

    /* Status distribution of the orders created in the period */
    const distribution = STATUS_GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      count: createdOrders.filter((o) => g.statuses.includes(o.status)).length,
    })).filter((g) => g.count > 0);

    /* Machine utilization, busiest five */
    const byMachine = {};
    windowOps.forEach((op) => {
      const id = idOf(op.machineId);
      byMachine[id] = (byMachine[id] || 0) + workedMinutes(op, now);
    });
    const Printer = getModel("Printer");
    const machineIds = Object.keys(byMachine).filter(isObjectId);
    const printers = Printer && machineIds.length ? await Printer.find({ _id: { $in: machineIds } }).lean() : [];
    const nameOf = Object.fromEntries(printers.map((p) => [String(p._id), p.printerName || p.name || p.model || "Machine"]));
    const availableMin = SHIFT_HOURS * 60 * range.days;
    const machines = Object.entries(byMachine)
      .map(([id, minutes]) => ({ id, name: nameOf[id] || "Unknown machine", utilization: round(Math.min(100, (minutes / availableMin) * 100)) }))
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 5);

    /* Tables */
    const ongoingOrders = ongoing.map((o) => {
      const planned = Number(o.plannedQty) || 0;
      const progressPct = Math.min(100, Math.round(Number(o.progressPct) || 0));
      return {
        id: String(o._id),
        productionNo: o.productionNo,
        jobNo: jobOf(o).jobNo || "",
        product: productOf(o),
        plannedQty: planned,
        completedQty: Number(o.actualQty) || Math.round((planned * progressPct) / 100),
        progress: progressPct,
        status: o.status,
      };
    });

    const pendingPlanning = pending.map((o) => ({
      id: String(o._id),
      productionNo: o.productionNo,
      jobNo: jobOf(o).jobNo || "",
      customer: jobOf(o).customerName || "",
      product: productOf(o),
      totalQty: Number(o.plannedQty) || 0,
      requiredDate: jobOf(o).dueDate || o.plannedEnd || null,
    }));

    /* Rework & reprint */
    const count = (list, statuses) => list.filter((r) => statuses.includes(r.status)).length;
    const corrections = [
      {
        type: "Rework",
        total: reworkOps.length,
        pending: count(reworkOps, ["PENDING"]),
        inProduction: count(reworkOps, ["IN_PROGRESS", "RUNNING", "PAUSED", "ON_HOLD"]),
        completed: count(reworkOps, ["COMPLETED", "SKIPPED"]),
      },
      {
        type: "Reprint",
        total: reprintRows.length,
        pending: count(reprintRows, ["REQUESTED"]),
        inProduction: count(reprintRows, ["APPROVED", "IN_PRODUCTION"]),
        completed: count(reprintRows, ["COMPLETED"]),
      },
    ];

    /* Alerts built from live data */
    const alerts = [];
    openOrders.forEach((o) => {
      const days = Math.max(1, Math.ceil((now - new Date(o.plannedEnd)) / DAY_MS));
      alerts.push({ at: o.plannedEnd, message: `${o.productionNo} is ${days} day${days > 1 ? "s" : ""} past its planned end`, type: "Delay" });
    });
    heldOrders.forEach((o) => alerts.push({ at: o.updatedAt, message: `${o.productionNo} on hold${o.holdReason ? `: ${o.holdReason}` : ""}`, type: "Hold" }));
    failedOps.forEach((op) =>
      alerts.push({ at: op.endAt, message: `${idOf(op.productionOrderId) && op.productionOrderId.productionNo ? op.productionOrderId.productionNo : "Order"} · ${op.operationName || op.operationCode} failed${op.failureReason ? ` (${op.failureReason})` : ""}`, type: "Failure" })
    );
    pausedOps.forEach((op) => {
      const open = (op.pauseLog || []).filter((p) => !p.resumedAt).pop();
      if (open && minutesBetween(open.pausedAt, now) >= 120) {
        alerts.push({ at: open.pausedAt, message: `${op.productionOrderId?.productionNo || "Order"} · ${op.operationName || op.operationCode} paused over 2 hours${open.reason ? ` (${open.reason})` : ""}`, type: "Paused" });
      }
    });
    if (reprintPending > 0) {
      alerts.push({ at: now, message: `${reprintPending} reprint request${reprintPending > 1 ? "s" : ""} waiting for approval`, type: "Approval" });
    }
    alerts.sort((a, b) => new Date(b.at) - new Date(a.at));

    return {
      range: { from: range.from, to: range.to, days: range.days },
      generatedAt: now,
      kpis,
      progress: progress.map((p) => ({ date: p.start, planned: p.planned, completed: p.completed })),
      distribution,
      totalOrders: createdOrders.length,
      machines,
      ongoingOrders,
      pendingPlanning,
      corrections,
      alerts: alerts.slice(0, 8),
    };
  }
}

module.exports = new ProductionDashboardService();