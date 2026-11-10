const mongoose = require("mongoose");
const jobOrderRepository = require("../../job-orders/models/JobOrder");
const productionOrderRepository = require("../models/ProductionOrder");
const productionOperationRepository = require("../models/ProductionOperation");
const ProductionStateService = require("./productionState.service");
const ErrorHelper = require("../../../utils/errors/ApiError");
const ProductionHelper = require("./ProductionHelper");
const { getDatePrefix } = require("../../../utils/helpers/dateUtils");
const {
  SUPPORTED_OPERATIONS,
  normalizeOperationCode,
  buildSpecificationSnapshot,
  deriveDynamicOperations,
  validateOperationSequence,
} = require("./productionSpecificationHelper");
const { calculateMaterials } = require("./productionMaterialCalculator");
const ProductionOperator = require("../models/ProductionOperator");

// Operators named in a plan must exist and be available; their name is stored on the operation
const checkPlanOperators = async (ops) => {
  const ids = [...new Set(ops.map((o) => (o.assignedEmployeeId ? String(o.assignedEmployeeId) : "")).filter(Boolean))];
  if (ids.length === 0) return;
  const found = await ProductionOperator.find({ _id: { $in: ids } }).lean();
  const byId = Object.fromEntries(found.map((o) => [String(o._id), o]));
  for (const op of ops) {
    if (!op.assignedEmployeeId) continue;
    const operator = byId[String(op.assignedEmployeeId)];
    if (!operator) {
      // An assignment made before operators existed (it pointed at a user record): keep the saved name, drop the link
      op.assignedEmployeeId = null;
      continue;
    }
    if (operator.isActive === false) {
      throw ErrorHelper.conflict(`Operator ${operator.name} is not available (${op.operationName}). Choose another operator.`);
    }
    op.operatorName = operator.name;
  }
};

// Stock list used to show available stock next to the automatically calculated materials
const loadStockItems = async () => {
  try {
    const StockItem = require("../../stocks/models/StockItem");
    return await StockItem.find({}).select("itemName qty quantity currentStock unit branchId").lean();
  } catch (_) {
    return [];
  }
};

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const isObjectId = (v) => OBJECT_ID_RE.test(String(v || ""));
const idOf = (v) => (v && typeof v === "object" && v._id ? String(v._id) : v ? String(v) : "");

const ADMIN_ROLES = ["admin", "super_admin", "superadmin", "owner"];
const SHIFT_MINUTES = 480; // 8 hour working day used for the machine capacity check
const BUSY_OP_STATUSES = ["PENDING", "IN_PROGRESS", "RUNNING", "PAUSED"];
const PLAN_EDITABLE_STATUSES = ["UNASSIGNED", "PLANNED", "IN_PROGRESS"];
const PROTECTED_OP_STATUSES = ["IN_PROGRESS", "RUNNING", "PAUSED", "COMPLETED", "SKIPPED", "FAILED"];

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const scopeBranch = (branchId, user) => {
  if (user && !ADMIN_ROLES.includes(String(user.role || "").toLowerCase()) && user.branchId) {
    return String(user.branchId);
  }
  return branchId || null;
};

const normalizePriority = (value, fallback = "NORMAL") => {
  // Two priorities: NORMAL and URGENT (HIGH / RUSH count as urgent)
  const raw = String(value || fallback).toUpperCase().trim();
  return ["URGENT", "HIGH", "RUSH"].includes(raw) ? "URGENT" : "NORMAL";
};

// "2h", "1.5h", "45m", 90 -> minutes
const durationToMinutes = (value) => {
  if (typeof value === "number") return Math.round(value);
  const m = String(value || "").trim().match(/^([\d.]+)\s*(h|hr|hrs|hour|hours|m|min|mins)?$/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  return /^m/i.test(m[2] || "") ? Math.round(n) : Math.round(n * 60);
};

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dayCount = (start, end) => {
  if (!start || !end) return 1;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
};

const itemsForJob = async (job) => {
  let list = [];
  if (job.items && job.items.length > 0) {
    list = job.items;
  } else {
    list = await mongoose.model("JobItem").find({ jobOrderId: job._id }).lean();
  }
  // Exclude finishing services: finishing services are post-press operations on the main printed product,
  // NOT separate production orders.
  const mainItems = (list || []).filter((item) => {
    if (item.needsProduction === false) return false;
    const typeUpper = String(item.itemType || item.productType || "").toUpperCase();
    if (typeUpper === "FINISHING" || typeUpper === "SERVICE") return false;
    const nameUpper = String(item.itemName || item.name || item.title || "").toUpperCase().trim();
    if (nameUpper.startsWith("FINISHING:") || nameUpper.startsWith("FINISHING -") || nameUpper.startsWith("FINISHING ")) return false;
    return true;
  });

  return mainItems;
};

/**
 * Steps the job order requires. They come from the job's own requirements, so a plan cannot drop them.
 * Only the original production order has them; rework and reprint orders run a subset on purpose.
 */
const requiredOperationsFor = (order, job, item) => {
  if (order.cycleType && order.cycleType !== "ORIGINAL") return [];
  return deriveDynamicOperations(item || {}, job || {}).map((op) => ({
    operationCode: op.operationCode,
    operationName: op.operationName,
  }));
};

const itemForOrder = async (order, job) => {
  if (!order.jobItemId) return {};
  const embedded = job.items?.find((i) => String(i._id) === String(order.jobItemId));
  if (embedded) return embedded;
  const doc = await mongoose.model("JobItem").findById(order.jobItemId).lean();
  return doc || {};
};

/**
 * Turn operations from the planning form into ProductionOperation documents.
 * Keeps the schedule, instructions, resources and dependencies the form sends
 * (the generic helper drops them).
 */
const normalizePlanOperations = (rawOps = [], plannedQty = 0) => {
  const ops = rawOps.map((op, idx) => {
    const rawCode = op.operationCode || op.operationName || "";
    const code =
      normalizeOperationCode(rawCode) ||
      String(rawCode).toUpperCase().trim().replace(/\s+/g, "_");
    if (!code) {
      throw ErrorHelper.badRequest(`Operation #${idx + 1} has no operation code or name.`);
    }
    const meta = SUPPORTED_OPERATIONS[code] || { name: code, estimatedMinutes: 20 };

    const estimatedMinutes =
      Number(op.estimatedMinutes) || durationToMinutes(op.duration) || meta.estimatedMinutes || 20;

    return {
      sequenceNo: Number(op.sequenceNo) || idx + 1,
      operationCode: code,
      operationName: op.operationName || meta.name,
      machine: op.machine || op.machineName || "",
      machineId: isObjectId(op.machineId) ? op.machineId : null,
      operatorName: op.operator || op.operatorName || "",
      assignedEmployeeId: isObjectId(op.assignedEmployeeId) ? op.assignedEmployeeId : null,
      plannedStart: toDate(op.plannedStart),
      plannedEnd: toDate(op.plannedEnd || op.plannedStart),
      estimatedMinutes,
      instructions: op.instructions || "",
      remarks: op.remarks || "",
      _dependencyName: op.dependency && op.dependency !== "-" ? String(op.dependency) : null,
      _dependsOnInput: Array.isArray(op.dependsOn) ? op.dependsOn.map(Number).filter(Number.isFinite) : [],
      plannedQty,
      inputQty: plannedQty,
      completedQty: 0,
      status: "PENDING",
    };
  });

  // Resolve dependency names ("Printing") into sequence numbers
  ops.forEach((op) => {
    let dependsOn = op._dependsOnInput;
    if (op._dependencyName && dependsOn.length === 0) {
      const wanted = op._dependencyName.toLowerCase();
      const target = ops.find(
        (o) =>
          o !== op &&
          (o.operationName.toLowerCase() === wanted || o.operationCode.toLowerCase() === wanted)
      );
      if (target) dependsOn = [target.sequenceNo];
    }
    op.dependsOn = dependsOn.filter((s) => s !== op.sequenceNo);
    delete op._dependencyName;
    delete op._dependsOnInput;
  });

  return ops;
};

class ProductionPlanningService {
  /* ──────────────────────────────────────────────────────────────────────── */
  /* Automatic order generation                                               */
  /* ──────────────────────────────────────────────────────────────────────── */

  /**
   * Create the UNASSIGNED production order(s) for an approved job.
   * Idempotent: repeated calls or events return the existing orders.
   * Called from the job-stage event listener, never from a list endpoint.
   */
  static async createUnassignedOrder(jobOrderId, user = null) {
    const job = await jobOrderRepository.findById(jobOrderId);
    if (!job) return null;

    const jobTypeStr = String(job.jobType || "").toUpperCase();
    if (jobTypeStr.includes("DESIGN") && !jobTypeStr.includes("PRINT")) {
      // Design Only winds up directly after sample approval, never enters production
      return [];
    }

    // Jobs without item records get ONE order with jobItemId = null
    // (a random id here would create a duplicate order on every call).
    let items = await itemsForJob(job);
    if (items.length === 0) {
      items = [{ _id: null, itemName: job.title || "Print Job", quantity: job.quantity || 1 }];
    }

    const created = [];
    for (const item of items) {
      const itemId = item._id || null;

      const existing = await productionOrderRepository.findOne({
        jobOrderId: job._id,
        jobItemId: itemId,
        cycleType: "ORIGINAL",
        status: { $ne: "CANCELLED" },
      });

      if (existing) {
        if (!existing.specificationsSnapshot || Object.keys(existing.specificationsSnapshot).length === 0) {
          existing.specificationsSnapshot = buildSpecificationSnapshot(item, job);
          await productionOrderRepository.save(existing);
        }
        created.push(existing);
        continue;
      }

      const productionNo = await productionOrderRepository.nextProductionNo(`PO-${getDatePrefix()}`);
      const specificationsSnapshot = buildSpecificationSnapshot(item, job);
      const dynamicOps = deriveDynamicOperations(item, job);
      const plannedQty = Number(item.quantity || job.quantity || 1);

      // Upsert narrows the window for two simultaneous events creating the same order
      const po = await productionOrderRepository.findOneAndUpdate(
        { jobOrderId: job._id, jobItemId: itemId, cycleType: "ORIGINAL", cycleNo: 0, status: { $ne: "CANCELLED" } },
        {
          $setOnInsert: {
            productionNo,
            jobOrderId: job._id,
            jobItemId: itemId,
            branchId: job.branchId,
            status: "UNASSIGNED",
            planningStatus: "UNPLANNED",
            priority: normalizePriority(job.priority),
            plannedQty,
            plannedStart: null,
            plannedEnd: job.dueDate || null,
            machineId: null,
            assignedEmployeeIds: [],
            cycleNo: 0,
            cycleType: "ORIGINAL",
            specificationsSnapshot,
            operationsSnapshot: dynamicOps,
            approvedSample: item.approvedSample || undefined,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      // Suggested operations are stored once per order
      const opCount = await productionOperationRepository.countDocuments({ productionOrderId: po._id });
      if (opCount === 0 && dynamicOps.length > 0) {
        await productionOperationRepository.insertMany(
          dynamicOps.map((op) => ({
            productionOrderId: po._id,
            jobOrderId: job._id,
            branchId: job.branchId,
            operationCode: op.operationCode,
            operationName: op.operationName,
            sequenceNo: op.sequenceNo,
            machine: op.machine || "",
            estimatedMinutes: op.estimatedMinutes || 0,
            plannedQty,
            inputQty: plannedQty,
            completedQty: 0,
            status: "PENDING",
            remarks: op.remarks || "",
          }))
        );

      }

      created.push(po);
    }
    return created;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Planning (save draft / confirm / revise)                                 */
  /* ──────────────────────────────────────────────────────────────────────── */

  /**
   * Find the production order(s) to plan.
   * `identifier` may be a production order id (preferred), a job order id,
   * or a job item id.
   */
  static async resolveTargetOrders(identifier) {
    if (!isObjectId(identifier)) {
      throw ErrorHelper.badRequest(`Invalid ID: ${identifier}`);
    }

    const direct = await productionOrderRepository.findById(identifier);
    if (direct) return { orders: [direct], job: await jobOrderRepository.findById(direct.jobOrderId) };

    let job = await jobOrderRepository.findById(identifier);
    if (!job) {
      const orderByItem = await productionOrderRepository.findOne({
        jobItemId: identifier,
        cycleType: "ORIGINAL",
        status: { $ne: "CANCELLED" },
      });
      if (orderByItem) {
        return { orders: [orderByItem], job: await jobOrderRepository.findById(orderByItem.jobOrderId) };
      }
      throw ErrorHelper.notFound(`No production order or job order found for ID: ${identifier}`);
    }

    let orders = await productionOrderRepository.find({
      jobOrderId: job._id,
      cycleType: "ORIGINAL",
      status: { $ne: "CANCELLED" },
    });
    if (orders.length === 0) {
      const currentStage = job.currentStage || job.stage;
      if (["CANCELLED", "COMPLETED"].includes(job.stage)) {
        throw ErrorHelper.badRequest(`Cannot plan production for a job in stage '${job.stage}'.`);
      }
      if (currentStage !== "PRODUCTION_PLANNING") {
        throw ErrorHelper.conflict(
          `Job is in stage '${currentStage}'. It must reach 'PRODUCTION_PLANNING' before production can be planned.`
        );
      }
      orders = (await this.createUnassignedOrder(job._id)) || [];
    }
    return { orders, job };
  }

  /**
   * Plan production.
   *
   * plan.action: "DRAFT"  -> save without changing status
   *              "CONFIRM" or "RELEASE" -> validate and set the order to PLANNED
   * plan.isDraft === true is treated as DRAFT.
   * Already planned or running orders can be revised; operations that have
   * started or finished are never touched.
   */
  static async planProduction(identifier, plan = {}, user = null) {
    const action = String(plan.action || "").toUpperCase();
    const isDraft = plan.isDraft === true || action === "DRAFT";

    const { orders, job } = await this.resolveTargetOrders(identifier);
    if (!job) {
      throw ErrorHelper.notFound("Job order for this production order was not found.");
    }

    const results = [];
    for (const order of orders) {
      results.push(await this.applyPlan(order, job, plan, isDraft, user));
    }
    return results;
  }

  static async applyPlan(order, job, plan, isDraft, user) {
    ProductionHelper.assertBranchAccess(order.branchId, user, `Production order ${order.productionNo}`);
    if (!PLAN_EDITABLE_STATUSES.includes(order.status)) {
      throw ErrorHelper.conflict(
        `Production order ${order.productionNo} is ${order.status} and its plan can no longer be changed.`
      );
    }
    if (isDraft && order.status !== "UNASSIGNED") {
      throw ErrorHelper.badRequest("Only an unplanned order can be saved as a draft. Confirm the revision instead.");
    }

    const item = await itemForOrder(order, job);
    const plannedQty = order.plannedQty || Number(item.quantity || job.quantity || 1);

    // ── Schedule ──
    const plannedStart = toDate(plan.plannedStartDate || plan.plannedStart) || order.plannedStart || new Date();
    const plannedEnd =
      toDate(plan.plannedEndDate || plan.plannedEnd || plan.targetDueDate) || order.plannedEnd || null;
    if (plannedEnd && plannedEnd < plannedStart) {
      throw ErrorHelper.badRequest("Planned end date cannot be before the planned start date.");
    }

    // ── Operations: keep protected ones, replace the PENDING ones ──
    const existingOps = await productionOperationRepository.find({ productionOrderId: order._id });
    const protectedOps = existingOps.filter((o) => PROTECTED_OP_STATUSES.includes(o.status));

    let newOps;
    // An empty list means every editable step was removed; only a missing list keeps the existing steps
    if (Array.isArray(plan.operations)) {
      newOps = normalizePlanOperations(plan.operations, plannedQty);
      // Protected operations are not re-sent as editable; drop any clash by sequence
      const protectedSeqs = new Set(protectedOps.map((o) => o.sequenceNo));
      const clash = newOps.find((o) => protectedSeqs.has(o.sequenceNo));
      if (clash) {
        throw ErrorHelper.conflict(
          `Sequence #${clash.sequenceNo} belongs to an operation that has already started or finished.`
        );
      }
    } else {
      // No operations sent: keep whatever PENDING operations already exist
      newOps = existingOps
        .filter((o) => !PROTECTED_OP_STATUSES.includes(o.status))
        .map((o) => o.toObject());
    }

    const allOpsForValidation = [
      ...protectedOps.map((o) => ({ sequenceNo: o.sequenceNo, operationCode: o.operationCode, operationName: o.operationName })),
      ...newOps,
    ];

    // ── Materials ──
    const materials = await this.resolveMaterials(plan.materials, order.materials);

    // ── Validation (full on confirm; light on draft) ──
    if (!isDraft) {
      if (!plannedEnd) {
        throw ErrorHelper.badRequest("Planned end date is required to confirm the plan.");
      }
      if (allOpsForValidation.length === 0) {
        throw ErrorHelper.badRequest("Add at least one operation before confirming the plan.");
      }
      validateOperationSequence(allOpsForValidation);

      // Steps required by the job order cannot be removed from the plan
      const present = new Set(allOpsForValidation.map((o) => o.operationCode));
      const missing = requiredOperationsFor(order, job, item).filter((r) => !present.has(r.operationCode));
      if (missing.length > 0) {
        throw ErrorHelper.conflict(
          `The job order requires: ${missing.map((m) => m.operationName).join(", ")}. These steps cannot be removed from the plan.`
        );
      }

      newOps.forEach((op) => {
        if (op.plannedStart && op.plannedEnd && op.plannedEnd < op.plannedStart) {
          throw ErrorHelper.badRequest(
            `Operation '${op.operationName}' (Seq #${op.sequenceNo}) ends before it starts.`
          );
        }
      });

      await checkPlanOperators(newOps);
      await this.assertNoMachineConflicts(order, newOps);

      const short = materials.filter((m) => (Number(m.shortage) || 0) > 0);
      if (short.length > 0 && plan.allowShortage !== true) {
        throw ErrorHelper.conflict(
          `Material shortage: ${short.map((m) => `${m.name} (short ${m.shortage} ${m.unit || ""})`).join(", ")}. ` +
            `Raise a purchase request, or confirm with allowShortage to proceed.`
        );
      }
    }

    // ── Persist operations ──
    // New steps go in first and the old pending ones are removed afterwards, so a failure part-way
    // never leaves the order without its steps.
    const oldPendingIds = existingOps.filter((o) => o.status === "PENDING").map((o) => o._id);
    let insertedOps = [];
    if (newOps.length > 0) {
      insertedOps = await productionOperationRepository.insertMany(
        newOps.map((op) => ({
          productionOrderId: order._id,
          jobOrderId: job._id,
          branchId: job.branchId,
          operationCode: op.operationCode,
          operationName: op.operationName,
          sequenceNo: op.sequenceNo,
          dependsOn: op.dependsOn || [],
          machine: op.machine || "",
          machineId: op.machineId || null,
          operatorName: op.operatorName || "",
          assignedEmployeeId: op.assignedEmployeeId || null,
          plannedStart: op.plannedStart || null,
          plannedEnd: op.plannedEnd || null,
          estimatedMinutes: op.estimatedMinutes || 0,
          instructions: op.instructions || "",
          remarks: op.remarks || "",
          plannedQty,
          inputQty: plannedQty,
          completedQty: 0,
          status: "PENDING",
        }))
      );
    }
    if (oldPendingIds.length > 0) {
      try {
        await productionOperationRepository.deleteMany({ _id: { $in: oldPendingIds } });
      } catch (err) {
        // roll the new steps back so the old plan stays intact
        if (insertedOps.length > 0) {
          await productionOperationRepository.deleteMany({ _id: { $in: insertedOps.map((d) => d._id) } }).catch(() => {});
        }
        throw err;
      }
    }

    // ── Persist the order ──
    const allOps = await productionOperationRepository.findByProductionOrder(order._id);
    const firstPlanned = allOps.find((o) => o.operatorName || o.machine);

    order.plannedStart = plannedStart;
    if (plannedEnd) order.plannedEnd = plannedEnd;
    order.priority = normalizePriority(plan.priority, order.priority || "NORMAL");
    if (plan.notes !== undefined) order.notes = String(plan.notes);
    if (plan.manager) order.productionManager = String(plan.manager);
    order.leadOperator = plan.leadOperator || order.leadOperator || firstPlanned?.operatorName || "";
    order.machine = plan.machine || order.machine || firstPlanned?.machine || null;
    if (plan.machineId && isObjectId(plan.machineId)) order.machineId = plan.machineId;
    if (Array.isArray(plan.assignedEmployees)) order.assignedEmployees = plan.assignedEmployees;
    if (Array.isArray(plan.assignedEmployeeIds)) {
      order.assignedEmployeeIds = plan.assignedEmployeeIds.filter(isObjectId);
    }
    if (materials.length > 0 || Array.isArray(plan.materials)) order.materials = materials;
    if (!order.specificationsSnapshot || Object.keys(order.specificationsSnapshot).length === 0) {
      order.specificationsSnapshot = buildSpecificationSnapshot(item, job);
    }
    order.operationsSnapshot = allOps.map((o) => ({
      sequenceNo: o.sequenceNo,
      operationCode: o.operationCode,
      operationName: o.operationName,
      status: o.status,
    }));

    if (isDraft) {
      order.planningStatus = "DRAFT";
      await productionOrderRepository.save(order);

    } else {
      const wasUnplanned = order.status === "UNASSIGNED";
      order.planningStatus = "PLANNED";
      order.planVersion = (order.planVersion || 0) + 1;
      order.planHistory.push({
        version: order.planVersion,
        savedAt: new Date(),
        savedBy: user ? user._id : null,
        snapshot: {
          reason: plan.revisionReason || (wasUnplanned ? "Initial plan" : "Plan revised"),
          plannedStart,
          plannedEnd,
          priority: order.priority,
          operations: allOps.map((o) => ({
            sequenceNo: o.sequenceNo,
            operationCode: o.operationCode,
            machine: o.machine,
            operatorName: o.operatorName,
            plannedStart: o.plannedStart,
            plannedEnd: o.plannedEnd,
            status: o.status,
          })),
          materials,
        },
      });

      if (wasUnplanned) {
        await ProductionStateService.transitionOrder(order, "PLANNED", {
          reason: "Production plan confirmed",
          user,
        });
        await ProductionStateService.updateJobStage(job._id, "PLANNED", "IN_PRODUCTION");

        await ProductionStateService.createNotification({
          role: "production",
          branchId: order.branchId,
          title: "New Production Planned",
          message: `Production Order ${order.productionNo} for Job ${job.jobNo || job._id} has been planned and queued.`,
          entityType: "PRODUCTION",
          entityId: order._id,
        });
      } else {
        await productionOrderRepository.save(order);
      }

      await ProductionStateService.dispatchWorkflowEvent({
        jobOrderId: job._id,
        productionOrderId: order._id,
        eventType: wasUnplanned ? "production.planned" : "production.plan.revised",
        stage: "PLANNED",
        performedBy: user ? user._id : null,
        details: { productionNo: order.productionNo, plannedQty, planVersion: order.planVersion },
      });
    }

    await ProductionStateService.updateOrderProgress(order._id);

    const fresh = order.toObject ? order.toObject() : { ...order };
    return { ...fresh, id: String(order._id), operations: allOps };
  }

  /**
   * Material lines from the plan. When a line carries an inventory itemId the
   * stock figure is read from Inventory; otherwise the figure sent by the
   * client is used and flagged as unverified.
   */
  static async resolveMaterials(rawMaterials, fallback = []) {
    if (!Array.isArray(rawMaterials)) return fallback || [];

    let StockItem = null;
    try {
      StockItem = require("../../stocks/models/StockItem");
    } catch (_) {
      StockItem = null;
    }

    const lines = [];
    for (const m of rawMaterials) {
      const requiredQty = Number(m.requiredQty) || 0;
      let availableStock = Number(m.availableStock) || 0;
      let verified = false;
      let stockId = null;

      // The stock model's own findById returns the document (or null); stock ids are not always ObjectIds
      if (StockItem && m.itemId) {
        const stock = await StockItem.findById(m.itemId).catch(() => null);
        if (stock) {
          availableStock = Number(stock.qty ?? stock.quantity ?? stock.currentStock ?? 0);
          verified = true;
          stockId = String(stock._id);
        }
      }

      const shortage = Math.max(0, requiredQty - availableStock);
      lines.push({
        itemId: verified ? stockId : null,
        name: m.name,
        spec: m.spec || "",
        requiredQty,
        unit: m.unit || "pcs",
        availableStock,
        shortage,
        relatedOperation: m.relatedOperation || "General",
        remarks: m.remarks || (verified ? "" : "Stock not verified against Inventory"),
      });
    }
    return lines;
  }

  /**
   * Day-level capacity check: a machine (real machineId only) can carry about
   * 8 working hours per day. Names without a machineId cannot be checked.
   */
  static async assertNoMachineConflicts(order, ops) {
    for (const op of ops) {
      if (!op.machineId || !op.plannedStart || !op.plannedEnd) continue;

      const overlapping = await productionOperationRepository.find({
        productionOrderId: { $ne: order._id },
        machineId: op.machineId,
        status: { $in: BUSY_OP_STATUSES },
        plannedStart: { $lte: op.plannedEnd },
        plannedEnd: { $gte: op.plannedStart },
      });
      if (overlapping.length === 0) continue;

      const otherMinutes = overlapping.reduce((sum, o) => sum + (o.estimatedMinutes || 0), 0);
      const capacity = SHIFT_MINUTES * dayCount(op.plannedStart, op.plannedEnd);
      if (otherMinutes + (op.estimatedMinutes || 0) > capacity) {
        const first = overlapping[0];
        throw ErrorHelper.conflict(
          `Machine conflict for '${op.operationName}': the machine is already booked ` +
            `(${first.operationCode}, ${new Date(first.plannedStart).toISOString().slice(0, 10)} to ` +
            `${new Date(first.plannedEnd).toISOString().slice(0, 10)}). Choose another machine or reschedule.`
        );
      }
    }
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Planning list                                                            */
  /* ──────────────────────────────────────────────────────────────────────── */

  /**
   * Orders waiting to be planned (GET /production/planning).
   * Each row is a production order that was auto-generated from an approved
   * job, so only eligible jobs appear and no job is listed twice.
   * mode=REVISE lists orders that already have a plan (PLANNED / IN_PROGRESS).
   */
  static async getEligibleJobsForPlanning(branchId = null, query = {}, user = null) {
    const revise = String(query.mode || "").toUpperCase() === "REVISE";
    const filter = {
      status: revise ? { $in: ["PLANNED", "IN_PROGRESS"] } : "UNASSIGNED",
      cycleType: "ORIGINAL",
    };
    const scopedBranch = scopeBranch(branchId, user);
    if (scopedBranch) filter.branchId = scopedBranch;
    if (query.planningStatus) filter.planningStatus = String(query.planningStatus).toUpperCase();

    const rawOrders = await productionOrderRepository
      .find(filter)
      .populate("jobOrderId")
      .populate("branchId", "name code")
      .sort({ createdAt: -1 })
      .limit(Math.min(500, parseInt(query.limit, 10) || 200))
      .lean();

    // Orders wrongly created for finishing services are hidden (a read never deletes; startup cleanup removes them)
    const orders = rawOrders.filter((order) => {
      const pName = String(order.specificationsSnapshot?.productName || "").toUpperCase().trim();
      return !(pName.startsWith("FINISHING:") || pName.startsWith("FINISHING -") || pName.startsWith("FINISHING "));
    });

    const ops = await productionOperationRepository.findByProductionOrders(orders.map((o) => o._id));
    const opsByOrder = {};
    ops.forEach((op) => {
      const key = String(op.productionOrderId);
      if (!opsByOrder[key]) opsByOrder[key] = [];
      opsByOrder[key].push(op);
    });

    const stockItems = await loadStockItems();
    return orders.map((order) => this.toPlanningRow(order, opsByOrder[String(order._id)] || [], stockItems));
  }

  static toPlanningRow(order, ops = [], stockItems = [], requiredOperationCodes = []) {
    const job = order.jobOrderId && typeof order.jobOrderId === "object" ? order.jobOrderId : {};
    const branch = order.branchId && typeof order.branchId === "object" ? order.branchId : {};
    const snapshot = order.specificationsSnapshot || {};
    const id = String(order._id);

    return {
      id,
      _id: id,
      productionOrderId: id,
      productionNo: order.productionNo,
      jobItemId: order.jobItemId ? String(order.jobItemId) : null,
      jobId: String(job._id || order.jobOrderId),
      jobOrderId: String(job._id || order.jobOrderId),
      jobNo: job.jobNo || "",
      jobType: job.jobType || "",
      customerName: job.customerName || job.customerSnapshot?.name || "",
      customerMobile: job.customerPhone || job.customerSnapshot?.mobile || "",
      customerCompany: job.customerCompany || job.customerSnapshot?.company || "",
      branchId: branch._id || order.branchId,
      branchName: branch.name || "",
      productName: snapshot.productName || job.title || "",
      requiredQuantity: order.plannedQty,
      priority: order.priority,
      status: order.status,
      planningStatus: order.planningStatus || "UNPLANNED",
      planVersion: order.planVersion || 0,
      plannedStart: order.plannedStart || null,
      plannedEnd: order.plannedEnd || null,
      notes: order.notes || "",
      productionManager: order.productionManager || "",
      approvedSample: order.approvedSample || null,
      unit: job.unit || snapshot.unit || "pcs",
      dueDate: job.dueDate || order.plannedEnd || null,
      designStatus: "APPROVED",
      specificationsSnapshot: snapshot,
      materials: order.materials || [],
      // Steps the job order requires (they cannot be deleted from the plan)
      requiredOperationCodes,
      // Materials worked out from the quantity and specifications; used until the manager saves a plan
      suggestedMaterials:
        order.materials && order.materials.length > 0
          ? []
          : calculateMaterials(
              snapshot,
              order.plannedQty,
              stockItems.filter(
                (s) => !s.branchId || !branch._id && !order.branchId || String(s.branchId) === String(branch._id || order.branchId)
              )
            ),
      suggestedOperations: ops
        .sort((a, b) => a.sequenceNo - b.sequenceNo)
        .map((op) => ({
          operationCode: op.operationCode,
          operationName: op.operationName,
          sequenceNo: op.sequenceNo,
          dependsOn: op.dependsOn || [],
          status: op.status || "PENDING",
          machineId: idOf(op.machineId),
          machine: op.machine || "",
          assignedEmployeeId: idOf(op.assignedEmployeeId),
          operatorName: op.operatorName || "",
          plannedStart: op.plannedStart || null,
          plannedEnd: op.plannedEnd || null,
          estimatedMinutes: op.estimatedMinutes || 20,
          instructions: op.instructions || "",
          remarks: op.remarks || "",
        })),
    };
  }

  /**
   * One order waiting to be planned (GET /production/planning/:id).
   * Accepts a production order id, job item id, job id or job number.
   */
  static async getEligibleJobById(identifier, user = null) {
    let order = null;
    if (isObjectId(identifier)) {
      order = await productionOrderRepository
        .findOne({
          $or: [{ _id: identifier }, { jobItemId: identifier }, { jobOrderId: identifier }],
          cycleType: "ORIGINAL",
          status: { $ne: "CANCELLED" },
        })
        .populate("jobOrderId")
        .populate("branchId", "name code")
        .lean();
    }
    if (!order) {
      const job = await mongoose.model("JobOrder").findOne({ jobNo: String(identifier) }).select("_id").lean();
      if (job) {
        order = await productionOrderRepository
          .findOne({ jobOrderId: job._id, cycleType: "ORIGINAL", status: { $ne: "CANCELLED" } })
          .populate("jobOrderId")
          .populate("branchId", "name code")
          .lean();
      }
    }
    if (!order) {
      throw ErrorHelper.notFound(`No production order found for planning: ${identifier}`);
    }

    // Compare the stored branch id (a populated branch that no longer exists would come back empty)
    const rawBranch = await productionOrderRepository.findById(order._id).select("branchId").lean();
    const scopedBranch = scopeBranch(null, user);
    const orderBranch = String(rawBranch?.branchId || "");
    if (scopedBranch && orderBranch && scopedBranch !== orderBranch) {
      throw ErrorHelper.notFound(`No production order found for planning: ${identifier}`);
    }

    const ops = await productionOperationRepository.findByProductionOrders([order._id]);
    const jobDoc = order.jobOrderId && typeof order.jobOrderId === "object" ? order.jobOrderId : {};
    const requiredCodes = requiredOperationsFor(order, jobDoc, await itemForOrder(order, jobDoc)).map((r) => r.operationCode);
    return this.toPlanningRow(order, ops, await loadStockItems(), requiredCodes);
  }
}

module.exports = ProductionPlanningService;