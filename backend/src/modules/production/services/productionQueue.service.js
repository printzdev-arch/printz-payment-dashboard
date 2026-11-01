const productionOperationRepository = require("../models/ProductionOperation");
const productionOrderRepository = require("../models/ProductionOrder");

const ADMIN_ROLES = ["admin", "super_admin", "superadmin", "owner"];
const ACTIVE_STATUSES = ["IN_PROGRESS", "RUNNING"]; // RUNNING = legacy value
const FINISHED_STATUSES = ["COMPLETED", "SKIPPED"];
const PRIORITY_RANK = { URGENT: 0, RUSH: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

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

const isTrue = (v) => v === true || String(v).toLowerCase() === "true";
const isFalse = (v) => v === false || String(v).toLowerCase() === "false";

/**
 * An operation may start when everything it depends on is finished.
 * dependsOn lists sequence numbers (parallel operations); when empty,
 * every lower sequence number counts (strict sequence).
 */
const prerequisitesDone = (op, sortedOps) => {
  const deps =
    Array.isArray(op.dependsOn) && op.dependsOn.length > 0
      ? sortedOps.filter((p) => op.dependsOn.includes(p.sequenceNo))
      : sortedOps.filter((p) => p.sequenceNo < op.sequenceNo);
  return deps.every((p) => FINISHED_STATUSES.includes(p.status));
};

const availabilityFor = (op, parentOrder, ready) => {
  if (parentOrder?.status === "ON_HOLD" && !FINISHED_STATUSES.includes(op.status)) return "ON_HOLD";
  if (ACTIVE_STATUSES.includes(op.status)) return "IN_PROGRESS";
  if (op.status === "PENDING") return ready ? "READY" : "BLOCKED";
  return op.status; // PAUSED, FAILED, COMPLETED, SKIPPED, ON_HOLD
};

class ProductionQueueService {
  /**
   * Every queue row for the user's scope, unpaginated.
   * Shared by getQueue and getQueueCounts so both use identical rules.
   */
  static async buildRows(filters = {}, user = null) {
    const branchId = scopeBranch(filters.branchId, user);

    // PLANNED / IN_PROGRESS / ON_HOLD orders only
    const activeOrders = await productionOrderRepository.findActiveOrders(branchId);
    if (!activeOrders || activeOrders.length === 0) return [];

    const orderMap = {};
    activeOrders.forEach((o) => {
      orderMap[String(o._id)] = o;
    });

    const allOps = await productionOperationRepository.findByProductionOrders(Object.keys(orderMap));

    const opsByOrder = {};
    allOps.forEach((op) => {
      const key = String(op.productionOrderId || "");
      if (!opsByOrder[key]) opsByOrder[key] = [];
      opsByOrder[key].push(op);
    });

    const rows = [];

    for (const [orderId, ops] of Object.entries(opsByOrder)) {
      const sorted = [...ops].sort((a, b) => a.sequenceNo - b.sequenceNo);
      const order = orderMap[orderId];
      const job = order?.jobOrderId && typeof order.jobOrderId === "object" ? order.jobOrderId : {};
      const snapshot = order?.specificationsSnapshot || {};

      for (const op of sorted) {
        const ready = prerequisitesDone(op, sorted);
        const availabilityStatus = availabilityFor(op, order, ready);

        const employee = op.assignedEmployeeId && typeof op.assignedEmployeeId === "object" ? op.assignedEmployeeId : null;
        const machineDoc = op.machineId && typeof op.machineId === "object" ? op.machineId : null;
        const plannedQty = op.plannedQty || order?.plannedQty || 0;
        const doneQty = op.completedQty || 0;

        rows.push({
          id: String(op._id),
          operationId: String(op._id),
          productionOrderId: orderId,
          productionNo: order?.productionNo || "",
          jobOrderId: idOf(order?.jobOrderId || op.jobOrderId),
          jobNo: job.jobNo || "",
          branchId: idOf(order?.branchId || op.branchId),
          customerName: job.customerName || job.customerSnapshot?.name || "",
          customerMobile: job.customerPhone || job.customerSnapshot?.mobile || "",
          productName: snapshot.productName || job.title || "",
          dueDate: job.dueDate || order?.plannedEnd || null,

          operationCode: op.operationCode,
          operationName: op.operationName,
          sequenceNo: op.sequenceNo,
          dependsOn: op.dependsOn || [],
          instructions: op.instructions || "",

          status: op.status === "RUNNING" ? "IN_PROGRESS" : op.status,
          availabilityStatus,
          isAvailable: availabilityStatus === "READY",
          pausedReason: op.pausedReason || "",
          failureReason: op.failureReason || "",
          priority: String(order?.priority || "NORMAL").toUpperCase(),

          plannedQty,
          inputQty: op.inputQty || 0,
          outputQty: op.outputQty || 0,
          completedQty: doneQty,
          wastageQty: op.wastageQty || 0,
          remainingQty: Math.max(0, plannedQty - doneQty),
          progress: op.status === "COMPLETED" ? 100 : plannedQty > 0 ? Math.min(99, Math.round((doneQty / plannedQty) * 100)) : 0,

          machineId: machineDoc ? String(machineDoc._id) : idOf(op.machineId) || null,
          machine: machineDoc ? machineDoc.printerName || machineDoc.model || "" : op.machine || "",
          assignedEmployeeId: employee ? String(employee._id) : idOf(op.assignedEmployeeId) || null,
          operator: employee ? employee.name || employee.email || "" : op.operatorName || "",

          plannedStart: op.plannedStart || null,
          plannedEnd: op.plannedEnd || null,
          estimatedMinutes: op.estimatedMinutes || 0,
          startAt: op.startAt || null,
          endAt: op.endAt || null,
          workedMinutes: op.workedMinutes || 0,
          remarks: op.remarks || "",

          isRework: Boolean(op.isRework),
          isReprint: Boolean(op.isReprint),
          cycleType: op.cycleType || "ORIGINAL",
          cycleNo: op.cycleNo || 0,
        });
      }
    }

    return rows;
  }

  /**
   * Production Tracking queue.
   * filters: operationCode, mine, search, status (comma separated, matches
   * availabilityStatus or status), isRework, cycleType, branchId, page, limit
   */
  static async getQueue(filters = {}, user = null) {
    const { operationCode, mine, search, status, isRework, cycleType, priority, machine, page = 1, limit = 50 } = filters;

    let rows = await this.buildRows(filters, user);

    if (operationCode) {
      const code = String(operationCode).toUpperCase().trim();
      rows = rows.filter((r) => r.operationCode === code);
    }
    if (priority && String(priority).toUpperCase() !== "ALL") {
      const p = String(priority).toUpperCase().trim();
      const group = p === "URGENT" ? ["URGENT", "RUSH"] : [p];
      rows = rows.filter((r) => group.includes(r.priority));
    }
    if (machine && String(machine).toUpperCase() !== "ALL") {
      const m = String(machine).trim().toLowerCase();
      rows = rows.filter((r) => String(r.machine || "").trim().toLowerCase() === m);
    }
    if (isTrue(mine) && user) {
      rows = rows.filter((r) => r.assignedEmployeeId === String(user._id));
    }
    if (isTrue(isRework)) rows = rows.filter((r) => r.isRework);
    if (isFalse(isRework)) rows = rows.filter((r) => !r.isRework);
    if (cycleType) {
      const ct = String(cycleType).toUpperCase().trim();
      rows = rows.filter((r) => r.cycleType === ct);
    }
    if (status) {
      const wanted = String(status)
        .split(",")
        .map((s) => s.toUpperCase().trim())
        .filter((s) => s && s !== "ALL");
      if (wanted.length) {
        // One source of truth: availabilityStatus, the same value the tab counts use.
        // (Matching the raw status too put an operation in two tabs, e.g. a
        // running operation of an order on hold.)
        rows = rows.filter((r) => wanted.includes(r.availabilityStatus));
      }
    }
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      rows = rows.filter((r) =>
        [r.productionNo, r.jobNo, r.customerName, r.productName, r.operationName, r.operator, r.machine]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }

    // Urgent first, then earliest planned start, then by order and sequence
    rows.sort((a, b) => {
      const pr = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
      if (pr !== 0) return pr;
      const as = a.plannedStart ? new Date(a.plannedStart).getTime() : Infinity;
      const bs = b.plannedStart ? new Date(b.plannedStart).getTime() : Infinity;
      if (as !== bs) return as - bs;
      if (a.productionNo !== b.productionNo) return a.productionNo < b.productionNo ? -1 : 1;
      return a.sequenceNo - b.sequenceNo;
    });

    const pageNo = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
    const start = (pageNo - 1) * pageSize;
    const items = rows.slice(start, start + pageSize);

    return { items, queue: items, total: rows.length, page: pageNo, limit: pageSize };
  }

  /**
   * Counts for the tracking tabs and the dashboard.
   * {
   *   total,
   *   byStatus:    { READY, BLOCKED, IN_PROGRESS, PAUSED, ON_HOLD, FAILED, COMPLETED, SKIPPED },
   *   byOperation: { PRINT: n, ... }   (operations that still need work)
   *   operationCodes, machines: every value present, for the filter dropdowns
   *   rework:      open rework operations
   *   qcPending:   production orders waiting for QC
   * }
   */
  static async getQueueCounts(branchId = null, user = null) {
    const scoped = scopeBranch(branchId, user);
    const rows = await this.buildRows({ branchId: scoped }, user);

    const byStatus = {};
    const byOperation = {};
    const operationCodes = new Set();
    const machines = new Set();
    let rework = 0;

    rows.forEach((r) => {
      byStatus[r.availabilityStatus] = (byStatus[r.availabilityStatus] || 0) + 1;
      if (r.operationCode) operationCodes.add(r.operationCode);
      if (r.machine) machines.add(r.machine);

      const needsWork = !FINISHED_STATUSES.includes(r.status);
      if (needsWork) {
        const code = r.operationCode || "OTHER";
        byOperation[code] = (byOperation[code] || 0) + 1;
        if (r.isRework) rework += 1;
      }
    });

    const qcQuery = { status: "QC" };
    if (scoped) qcQuery.branchId = scoped;
    const qcPending = await productionOrderRepository.countDocuments(qcQuery);

    return {
      total: rows.length,
      byStatus,
      byOperation,
      // Every operation / machine present in the queue, for the filter dropdowns
      operationCodes: [...operationCodes].sort(),
      machines: [...machines].sort(),
      rework,
      qcPending,
    };
  }
}

module.exports = ProductionQueueService;