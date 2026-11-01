const mongoose = require("mongoose");
const productionOperationRepository = require("../models/ProductionOperation");
const productionOrderRepository = require("../models/ProductionOrder");
const ErrorHelper = require("../../../utils/ApiError");

const ADMIN_ROLES = ["admin", "super_admin", "superadmin", "owner"];
const ACTIVE_STATUSES = ["IN_PROGRESS", "RUNNING"]; // RUNNING = legacy value
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

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

const scopeBranch = (branchId, user) => {
  if (user && !ADMIN_ROLES.includes(String(user.role || "").toLowerCase()) && user.branchId) {
    return String(user.branchId);
  }
  return branchId || null;
};

const getModel = (name) => (mongoose.models && mongoose.models[name]) || null;

/* ────────────────────────────────────────────────────────────────────────── */
/* Time helpers                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Reporting window. Defaults to the last 30 days.
 * from / to are YYYY-MM-DD (or any date string).
 */
const resolveRange = (query = {}) => {
  const now = new Date();
  let to = query.to ? new Date(query.to) : now;
  if (query.to && /^\d{4}-\d{2}-\d{2}$/.test(String(query.to))) {
    to = new Date(`${query.to}T23:59:59.999`);
  }
  let from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * DAY_MS);
  if (isNaN(from)) from = new Date(to.getTime() - 30 * DAY_MS);
  if (isNaN(to)) to = now;
  if (from > to) from = new Date(to.getTime() - DAY_MS);
  const days = Math.max(1, Math.ceil((to - from) / DAY_MS));
  return { from, to, days };
};

const minutesSince = (from, to = new Date()) => {
  if (!from) return 0;
  const diff = (new Date(to) - new Date(from)) / 60000;
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
};

// Time worked on an operation, including the segment that is still running
const workedMinutes = (op, now = new Date()) => {
  let total = Number(op.workedMinutes) || 0;
  if (isActive(op.status)) {
    const log = op.pauseLog || [];
    const last = log[log.length - 1];
    const segStart = last && last.resumedAt ? last.resumedAt : op.startAt;
    total += minutesSince(segStart, now);
  }
  return total;
};

// Minutes this operation spent paused (a pause that is still open counts up to now)
const pausedMinutes = (op, now = new Date()) =>
  (op.pauseLog || []).reduce((sum, p) => sum + minutesSince(p.pausedAt, p.resumedAt || now), 0);

/* ────────────────────────────────────────────────────────────────────────── */
/* Normalisers                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

const roleName = (role) => {
  if (!role) return "";
  if (typeof role === "string") return role;
  return role.name || role.roleName || role.title || "";
};

const normalizeMachine = (p) => {
  const status = String(p.status || p.state || "");
  return {
    id: String(p._id),
    name: p.printerName || p.name || p.model || "Machine",
    type: p.printerType || p.type || p.category || "Machine",
    model: p.model || "",
    serial: p.serialNumber || p.serialNo || p.serial || "",
    branchId: idOf(p.branchId),
    underMaintenance:
      /maint|service|repair/i.test(status) || p.isUnderMaintenance === true || p.maintenance === true,
    inactive: p.isActive === false || /inactive|retired|disabled/i.test(status),
    notes: p.notes || "",
  };
};

const normalizeUser = (u) => ({
  id: String(u._id),
  name: u.name || u.fullName || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "User",
  email: u.email || "",
  phone: u.phone || u.mobile || u.phoneNumber || "",
  role: roleName(u.role),
  branchId: idOf(u.branchId),
});

/* ────────────────────────────────────────────────────────────────────────── */
/* Data loading                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

const loadMachines = async (branch) => {
  const Printer = getModel("Printer");
  if (!Printer) return [];
  const docs = await Printer.find({}).limit(1000).lean();
  return docs
    .map(normalizeMachine)
    .filter((m) => !m.inactive)
    // Branch is compared here because the Printer schema may not define branchId
    .filter((m) => !branch || !m.branchId || m.branchId === String(branch));
};

const loadUsersById = async (ids) => {
  const User = getModel("User");
  const clean = [...new Set(ids.filter((i) => isObjectId(i)))];
  if (!User || clean.length === 0) return {};
  const docs = await User.find({ _id: { $in: clean } }).lean();
  return Object.fromEntries(docs.map((u) => [String(u._id), normalizeUser(u)]));
};

// Users who hold an operator-type role, so idle operators also show up.
// Role storage differs between projects, so any failure just means "none found".
const loadOperatorUsers = async (branch) => {
  const User = getModel("User");
  if (!User) return [];
  try {
    const filter = { role: { $regex: /operator|production|press|pressman|finish|bindery|packing/i } };
    if (branch) filter.branchId = branch;
    const docs = await User.find(filter).limit(500).lean();
    return docs.map(normalizeUser);
  } catch (e) {
    return [];
  }
};

/**
 * Operations the resource screens look at:
 *  - everything that started or ended inside the window, and
 *  - everything running, paused or waiting right now.
 */
const loadOperations = async (range, branch) => {
  const windowFilter = {
    $or: [
      { startAt: { $gte: range.from, $lte: range.to } },
      { endAt: { $gte: range.from, $lte: range.to } },
      { status: { $in: [...ACTIVE_STATUSES, "PAUSED"] } },
    ],
  };
  const filter = branch ? { $and: [windowFilter, { branchId: branch }] } : windowFilter;
  const ops = await productionOperationRepository.find(filter).lean();

  // Pending work for operators and machines (planned or running orders only)
  const orderFilter = { status: { $in: ["PLANNED", "IN_PROGRESS"] } };
  if (branch) orderFilter.branchId = branch;
  const activeOrders = await productionOrderRepository.find(orderFilter).select("_id").lean();
  const activeIds = new Set(activeOrders.map((o) => String(o._id)));
  const queued = activeIds.size
    ? await productionOperationRepository
        .find({
          status: "PENDING",
          productionOrderId: { $in: [...activeIds] },
          $or: [{ machineId: { $ne: null } }, { assignedEmployeeId: { $ne: null } }],
        })
        .lean()
    : [];

  return { ops, queued };
};

// Production order / job details for the operations that are running or paused
const loadOrderInfo = async (ops) => {
  const ids = [...new Set(ops.map((o) => idOf(o.productionOrderId)).filter(isObjectId))];
  if (ids.length === 0) return {};
  const orders = await productionOrderRepository
    .find({ _id: { $in: ids } })
    .populate("jobOrderId", "jobNo title customerName dueDate")
    .lean();
  return Object.fromEntries(
    orders.map((o) => {
      const job = o.jobOrderId && typeof o.jobOrderId === "object" ? o.jobOrderId : {};
      return [
        String(o._id),
        {
          productionOrderId: String(o._id),
          productionNo: o.productionNo || "",
          jobNo: job.jobNo || "",
          productName: o.specificationsSnapshot?.productName || job.title || "",
          customerName: job.customerName || "",
          plannedQty: o.plannedQty || 0,
          plannedEnd: o.plannedEnd || null,
          progressPct: o.progressPct || 0,
        },
      ];
    })
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Metrics                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const emptyStats = () => ({
  totalOps: 0,
  completedOps: 0,
  failedOps: 0,
  workedMin: 0,
  pausedMin: 0,
  inputQty: 0,
  outputQty: 0,
  wastageQty: 0,
});

const addOp = (stats, op, now) => {
  stats.totalOps += 1;
  if (op.status === "COMPLETED") {
    stats.completedOps += 1;
    stats.inputQty += Number(op.inputQty) || 0;
    stats.outputQty += Number(op.outputQty) || 0;
    stats.wastageQty += Number(op.wastageQty) || 0;
  }
  if (op.status === "FAILED") stats.failedOps += 1;
  stats.workedMin += workedMinutes(op, now);
  stats.pausedMin += pausedMinutes(op, now);
};

const yieldPct = (s) => (s.inputQty > 0 ? round((s.outputQty / s.inputQty) * 100) : null);

const currentJobOf = (op, orderInfo, now) => {
  if (!op) return null;
  const info = orderInfo[idOf(op.productionOrderId)] || {};
  const planned = Number(op.plannedQty) || info.plannedQty || 0;
  const done = Number(op.completedQty) || 0;
  return {
    operationId: String(op._id),
    operationName: op.operationName || op.operationCode,
    status: isActive(op.status) ? "IN_PROGRESS" : op.status,
    productionNo: info.productionNo || "",
    jobNo: info.jobNo || "",
    productName: info.productName || "",
    customerName: info.customerName || "",
    quantity: planned,
    startedAt: op.startAt || null,
    expectedEnd: op.plannedEnd || info.plannedEnd || null,
    pausedReason: op.pausedReason || "",
    workedMinutes: round(workedMinutes(op, now)),
    progress: planned > 0 ? Math.min(99, Math.round((done / planned) * 100)) : info.progressPct || 0,
  };
};

const opKeyForMachine = (op, nameToId) => {
  if (op.machineId) return idOf(op.machineId);
  const name = String(op.machine || "").trim().toLowerCase();
  return name && nameToId[name] ? nameToId[name] : "";
};

const opSummary = (op, orderInfo) => {
  const info = orderInfo[idOf(op.productionOrderId)] || {};
  return {
    id: String(op._id),
    productionNo: info.productionNo || "",
    jobNo: info.jobNo || "",
    productName: info.productName || "",
    operationName: op.operationName || op.operationCode,
    status: isActive(op.status) ? "IN_PROGRESS" : op.status,
    machine: op.machine || "",
    operator: op.operatorName || "",
    startAt: op.startAt || null,
    endAt: op.endAt || null,
    inputQty: op.inputQty || 0,
    outputQty: op.outputQty || 0,
    wastageQty: op.wastageQty || 0,
    workedMinutes: round(workedMinutes(op)),
  };
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Service                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

class ProductionResourceService {
  /**
   * Machines with live status and performance for a window.
   * query: branchId, from, to, shiftHours (default 8), search, type, status, lookup=true (list only)
   */
  static async getMachines(query = {}, user = null) {
    const branch = scopeBranch(query.branchId, user);
    const machines = await loadMachines(branch);

    if (String(query.lookup).toLowerCase() === "true") {
      const items = machines.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        model: m.model,
        branchId: m.branchId,
        underMaintenance: m.underMaintenance,
      }));
      return { items, summary: { machines: items.length }, range: null };
    }

    const range = resolveRange(query);
    const shiftHours = Math.max(1, Math.min(24, Number(query.shiftHours) || 8));
    const availableMin = range.days * shiftHours * 60;
    const now = new Date();

    const { ops, queued } = await loadOperations(range, branch);
    const nameToId = {};
    machines.forEach((m) => {
      nameToId[m.name.toLowerCase()] = m.id;
    });

    const live = ops.filter((o) => isActive(o.status) || o.status === "PAUSED");
    const orderInfo = await loadOrderInfo(live);
    const operatorIds = live.map((o) => idOf(o.assignedEmployeeId));
    const users = await loadUsersById(operatorIds);

    const byMachine = {};
    ops.forEach((op) => {
      const key = opKeyForMachine(op, nameToId);
      if (!key) return;
      (byMachine[key] = byMachine[key] || []).push(op);
    });
    const queuedByMachine = {};
    queued.forEach((op) => {
      const key = opKeyForMachine(op, nameToId);
      if (key) queuedByMachine[key] = (queuedByMachine[key] || 0) + 1;
    });

    let items = machines.map((m) => {
      const mOps = byMachine[m.id] || [];
      const stats = emptyStats();
      mOps.forEach((op) => addOp(stats, op, now));

      const running = mOps.find((o) => isActive(o.status));
      const paused = mOps.find((o) => o.status === "PAUSED");
      const current = running || paused || null;

      let status = "IDLE";
      if (m.underMaintenance) status = "MAINTENANCE";
      else if (running) status = "RUNNING";
      else if (paused) status = "PAUSED";

      const runningMin = Math.min(stats.workedMin, availableMin);
      const operatorId = current ? idOf(current.assignedEmployeeId) : "";
      const operator = operatorId ? users[operatorId] : null;

      return {
        ...m,
        status,
        currentJob: currentJobOf(current, orderInfo, now),
        operatorId,
        operatorName: operator ? operator.name : current?.operatorName || "",
        queuedOps: queuedByMachine[m.id] || 0,
        totalOps: stats.totalOps,
        completedOps: stats.completedOps,
        failedOps: stats.failedOps,
        runningHours: round(runningMin / 60),
        idleHours: round(Math.max(0, availableMin - runningMin) / 60),
        downtimeHours: round(stats.pausedMin / 60),
        utilization: round((runningMin / availableMin) * 100),
        yield: yieldPct(stats),
        outputQty: stats.outputQty,
        wastageQty: stats.wastageQty,
      };
    });

    const summary = {
      machines: items.length,
      running: items.filter((m) => m.status === "RUNNING").length,
      paused: items.filter((m) => m.status === "PAUSED").length,
      idle: items.filter((m) => m.status === "IDLE").length,
      maintenance: items.filter((m) => m.status === "MAINTENANCE").length,
    };

    if (query.type) items = items.filter((m) => m.type === query.type);
    if (query.status && query.status !== "ALL") {
      const wanted = String(query.status).toUpperCase().split(",");
      items = items.filter((m) => wanted.includes(m.status));
    }
    if (query.search && String(query.search).trim()) {
      const q = String(query.search).trim().toLowerCase();
      items = items.filter((m) =>
        [m.name, m.type, m.model, m.serial, m.operatorName, m.currentJob?.jobNo, m.currentJob?.productionNo, m.currentJob?.productName]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }

    return {
      items,
      summary,
      range: { from: range.from, to: range.to, days: range.days, shiftHours },
    };
  }

  static async getMachineById(id, query = {}, user = null) {
    if (!isObjectId(id)) throw ErrorHelper.badRequest(`Invalid machine ID: ${id}`);
    const { items, range } = await this.getMachines({ ...query, search: "", status: "ALL", type: "" }, user);
    const machine = items.find((m) => m.id === String(id));
    if (!machine) throw ErrorHelper.notFound(`Machine not found with ID: ${id}`);

    const branch = scopeBranch(query.branchId, user);
    const rangeObj = resolveRange(query);
    const { ops } = await loadOperations(rangeObj, branch);
    const nameToId = { [machine.name.toLowerCase()]: machine.id };
    const mine = ops.filter((o) => opKeyForMachine(o, nameToId) === machine.id);

    const orderInfo = await loadOrderInfo(mine);
    const recent = [...mine]
      .sort((a, b) => new Date(b.startAt || 0) - new Date(a.startAt || 0))
      .slice(0, 25)
      .map((o) => opSummary(o, orderInfo));

    // Who ran this machine in the window
    const people = {};
    mine.forEach((o) => {
      const uid = idOf(o.assignedEmployeeId) || `name:${o.operatorName || ""}`;
      if (uid === "name:") return;
      const p = people[uid] || { operatorId: idOf(o.assignedEmployeeId), name: o.operatorName || "", ops: 0, lastAt: null };
      p.ops += 1;
      const at = o.endAt || o.startAt;
      if (at && (!p.lastAt || new Date(at) > new Date(p.lastAt))) p.lastAt = at;
      people[uid] = p;
    });
    const users = await loadUsersById(Object.values(people).map((p) => p.operatorId));
    const operatorHistory = Object.values(people)
      .map((p) => ({ ...p, name: users[p.operatorId]?.name || p.name || "Unknown" }))
      .sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0));

    // Pauses = downtime entries
    const downtime = [];
    mine.forEach((o) => {
      (o.pauseLog || []).forEach((p) => {
        downtime.push({
          operationName: o.operationName || o.operationCode,
          productionNo: orderInfo[idOf(o.productionOrderId)]?.productionNo || "",
          reason: p.reason || "",
          pausedAt: p.pausedAt,
          resumedAt: p.resumedAt || null,
          minutes: round(minutesSince(p.pausedAt, p.resumedAt || new Date())),
        });
      });
    });
    downtime.sort((a, b) => new Date(b.pausedAt) - new Date(a.pausedAt));

    return { machine, recentOperations: recent, operatorHistory, downtime: downtime.slice(0, 25), range };
  }

  /**
   * Operators with workload and productivity for a window.
   * query: branchId, from, to, search, status (WORKING|AVAILABLE|PAUSED), lookup=true (list only)
   */
  static async getOperators(query = {}, user = null) {
    const branch = scopeBranch(query.branchId, user);
    const baseUsers = await loadOperatorUsers(branch);

    if (String(query.lookup).toLowerCase() === "true") {
      const items = baseUsers.map((u) => ({ id: u.id, name: u.name, role: u.role, branchId: u.branchId }));
      return { items, summary: { operators: items.length }, range: null };
    }

    const range = resolveRange(query);
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { ops, queued } = await loadOperations(range, branch);

    const live = ops.filter((o) => isActive(o.status) || o.status === "PAUSED");
    const orderInfo = await loadOrderInfo(live);

    const opUserIds = [...ops, ...queued].map((o) => idOf(o.assignedEmployeeId)).filter(Boolean);
    const extraUsers = await loadUsersById(opUserIds);
    const people = { ...extraUsers };
    baseUsers.forEach((u) => {
      people[u.id] = people[u.id] || u;
    });

    const byUser = {};
    ops.forEach((op) => {
      const uid = idOf(op.assignedEmployeeId);
      if (uid) (byUser[uid] = byUser[uid] || []).push(op);
    });
    const queuedByUser = {};
    queued.forEach((op) => {
      const uid = idOf(op.assignedEmployeeId);
      if (uid) queuedByUser[uid] = (queuedByUser[uid] || 0) + 1;
    });

    let items = Object.values(people).map((u) => {
      const uOps = byUser[u.id] || [];
      const stats = emptyStats();
      uOps.forEach((op) => addOp(stats, op, now));

      const running = uOps.find((o) => isActive(o.status));
      const paused = uOps.find((o) => o.status === "PAUSED");
      const current = running || paused || null;
      const completedToday = uOps.filter(
        (o) => o.status === "COMPLETED" && o.endAt && new Date(o.endAt) >= startOfToday
      ).length;
      const workedHours = stats.workedMin / 60;
      const lastTouch = uOps
        .map((o) => o.endAt || o.startAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))[0];

      return {
        ...u,
        status: running ? "WORKING" : paused ? "PAUSED" : "AVAILABLE",
        currentTask: currentJobOf(current, orderInfo, now),
        machine: current?.machine || "",
        completedToday,
        completedOps: stats.completedOps,
        failedOps: stats.failedOps,
        totalOps: stats.totalOps,
        queued: queuedByUser[u.id] || 0,
        workedHours: round(workedHours),
        outputQty: stats.outputQty,
        wastageQty: stats.wastageQty,
        yield: yieldPct(stats),
        productivity: workedHours > 0 ? round(stats.outputQty / workedHours) : null, // good pieces per hour
        lastActiveAt: lastTouch || null,
      };
    });

    const summary = {
      operators: items.length,
      working: items.filter((o) => o.status === "WORKING").length,
      paused: items.filter((o) => o.status === "PAUSED").length,
      available: items.filter((o) => o.status === "AVAILABLE").length,
    };

    if (branch) items = items.filter((o) => !o.branchId || o.branchId === String(branch));
    if (query.status && query.status !== "ALL") {
      const wanted = String(query.status).toUpperCase().split(",");
      items = items.filter((o) => wanted.includes(o.status));
    }
    if (query.search && String(query.search).trim()) {
      const q = String(query.search).trim().toLowerCase();
      items = items.filter((o) =>
        [o.name, o.role, o.email, o.machine, o.currentTask?.jobNo, o.currentTask?.productName]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    items.sort((a, b) => a.name.localeCompare(b.name));

    return {
      items,
      summary,
      range: { from: range.from, to: range.to, days: range.days },
    };
  }

  static async getOperatorById(id, query = {}, user = null) {
    if (!isObjectId(id)) throw ErrorHelper.badRequest(`Invalid operator ID: ${id}`);
    const { items, range } = await this.getOperators({ ...query, search: "", status: "ALL" }, user);
    const operator = items.find((o) => o.id === String(id));
    if (!operator) throw ErrorHelper.notFound(`Operator not found with ID: ${id}`);

    const branch = scopeBranch(query.branchId, user);
    const { ops } = await loadOperations(resolveRange(query), branch);
    const mine = ops.filter((o) => idOf(o.assignedEmployeeId) === operator.id);
    const orderInfo = await loadOrderInfo(mine);

    const recent = [...mine]
      .sort((a, b) => new Date(b.startAt || 0) - new Date(a.startAt || 0))
      .slice(0, 25)
      .map((o) => opSummary(o, orderInfo));

    const machineList = await loadMachines(branch);
    const idToName = Object.fromEntries(machineList.map((m) => [m.id, m.name]));
    const machineCounts = {};
    mine.forEach((o) => {
      const name = o.machine || idToName[idOf(o.machineId)] || "";
      if (name) machineCounts[name] = (machineCounts[name] || 0) + 1;
    });
    const machinesUsed = Object.entries(machineCounts)
      .map(([name, count]) => ({ name, operations: count }))
      .sort((a, b) => b.operations - a.operations);

    return { operator, recentOperations: recent, machinesUsed, range };
  }
}

module.exports = ProductionResourceService;