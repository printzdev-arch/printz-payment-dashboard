const mongoose = require("mongoose");
const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoJobOrderRepository");
const productionOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOrderRepository");
const productionOperationRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOperationRepository");
const ProductionStateService = require("./productionState.service");
const RoundRobinService = require("./roundRobin.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const JobItem = require("../../../infrastructure/database/mongoose/models/job-order/JobItem");

class ProductionPlanningService {
  /**
   * Create initial UNASSIGNED production order when design is approved.
   * Remains in UNASSIGNED status until the user clicks 'Plan Production'.
   */
  static async createUnassignedOrder(jobOrderId, user = null) {
    const job = await jobOrderRepository.findById(jobOrderId);
    if (!job) return null;

    let itemsToProduce = [];
    if (job.items && job.items.length > 0) {
      itemsToProduce = job.items.filter((item) => item.needsProduction !== false);
    } else {
      const dbItems = await mongoose.model("JobItem").find({ jobOrderId: job._id }).lean();
      if (dbItems && dbItems.length > 0) {
        itemsToProduce = dbItems.filter((item) => item.needsProduction !== false);
      }
    }
    if (itemsToProduce.length === 0) {
      itemsToProduce = [{ _id: new mongoose.Types.ObjectId(), itemName: job.title || "Print Job", quantity: job.quantity || 1 }];
    }

    const created = [];
    for (const item of itemsToProduce) {
      const existing = await productionOrderRepository.findOne({
        jobOrderId: job._id,
        jobItemId: item._id,
        status: { $ne: "CANCELLED" },
      });
      if (existing) {
        created.push(existing);
        continue;
      }

      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const countToday = await productionOrderRepository.countToday();
      const productionNo = `PO-${datePrefix}-${String(countToday + 1).padStart(4, "0")}`;

      const po = await productionOrderRepository.create({
        productionNo,
        jobOrderId: job._id,
        jobItemId: item._id,
        branchId: job.branchId,
        status: "UNASSIGNED",
        priority: job.priority || "NORMAL",
        plannedQty: item.quantity || job.quantity || 1,
        plannedStart: null,
        machineId: null,
        assignedEmployeeIds: [],
        cycleNo: 0,
        cycleType: "ORIGINAL",
      });
      created.push(po);
    }
    return created;
  }

  /**
   * Plan production for a Job Order.
   * Creates ProductionOrder(s) and dynamic sequential operations.
   */
  static async planProduction(jobOrderId, planOverrides = {}, user = null) {
    const job = await jobOrderRepository.findById(jobOrderId);
    if (!job) {
      throw ErrorHelper.notFound(`Job Order not found with ID: ${jobOrderId}`);
    }

    if (job.stage === "CANCELLED" || job.stage === "COMPLETED") {
      throw ErrorHelper.badRequest(`Cannot plan production for Job Order in stage '${job.stage}'.`);
    }

    const currentStage = job.currentStage || job.stage;
    const prematureStages = [
      "ENQUIRY",
      "ESTIMATION",
      "ESTIMATE_APPROVAL",
      "DESIGN_QUEUE",
      "DESIGN_ASSIGNED",
      "DESIGN_IN_PROGRESS",
      "SAMPLE_APPROVAL",
      "REVISION",
    ];
    if (prematureStages.includes(currentStage)) {
      throw ErrorHelper.conflict(
        `Cannot plan production while Job is in stage '${currentStage}'. Job must reach 'PRODUCTION_PLANNING' first.`
      );
    }

    let itemsToProduce = [];
    if (job.items && job.items.length > 0) {
      itemsToProduce = job.items.filter((item) => item.needsProduction !== false);
    } else {
      const dbItems = await mongoose.model("JobItem").find({ jobOrderId: job._id }).lean();
      if (dbItems && dbItems.length > 0) {
        itemsToProduce = dbItems.filter((item) => item.needsProduction !== false);
      }
    }

    if (itemsToProduce.length === 0) {
      itemsToProduce = [
        {
          _id: new mongoose.Types.ObjectId(),
          itemName: job.title || "Print Job",
          quantity: 1,
          finishing: [],
        },
      ];
    }

    const createdProductionOrders = [];

    for (const item of itemsToProduce) {
      // Check for existing production order
      let productionOrder = await productionOrderRepository.findOne({
        jobOrderId: job._id,
        jobItemId: item._id,
        status: { $ne: "CANCELLED" },
      });

      const plannedQty = item.quantity || job.quantity || 1;
      const rawPriority = String(planOverrides.priority || job.priority || "NORMAL").toUpperCase();
      const normalizedPriority = rawPriority === "RUSH" ? "URGENT" : (["LOW", "NORMAL", "HIGH", "URGENT"].includes(rawPriority) ? rawPriority : "NORMAL");
      const plannedStart = planOverrides.plannedStartDate || planOverrides.plannedStart || new Date();
      const machine = planOverrides.machine || null;
      const assignedEmployees = Array.isArray(planOverrides.assignedEmployees)
        ? planOverrides.assignedEmployees
        : (planOverrides.assignedEmployees ? [planOverrides.assignedEmployees] : []);

      if (productionOrder) {
        productionOrder.status = "PLANNED";
        productionOrder.plannedStart = plannedStart;
        productionOrder.priority = normalizedPriority;
        if (machine) productionOrder.machine = machine;
        if (assignedEmployees.length > 0) productionOrder.assignedEmployees = assignedEmployees;
        if (planOverrides.machineId) productionOrder.machineId = planOverrides.machineId;
        if (planOverrides.assignedEmployeeIds) productionOrder.assignedEmployeeIds = planOverrides.assignedEmployeeIds;
        await productionOrderRepository.save(productionOrder);
      } else {
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const countToday = await productionOrderRepository.countToday();
        const productionNo = `PO-${datePrefix}-${String(countToday + 1).padStart(4, "0")}`;

        productionOrder = await productionOrderRepository.create({
          productionNo,
          jobOrderId: job._id,
          jobItemId: item._id,
          branchId: job.branchId,
          status: "PLANNED",
          priority: normalizedPriority,
          plannedQty,
          plannedStart,
          machine,
          assignedEmployees,
          machineId: planOverrides.machineId || null,
          assignedEmployeeIds: planOverrides.assignedEmployeeIds || [],
          cycleNo: 0,
          cycleType: "ORIGINAL",
          approvedSample: item.approvedSample || {
            fileUrl: null,
            thumbnailUrl: null,
            customerComments: "",
          },
        });
      }

      createdProductionOrders.push(productionOrder);

      // Clear any prior pending operations for this order before generating fresh ones
      await productionOperationRepository.deleteMany({ productionOrderId: productionOrder._id });

      // Generate operations: PRINT -> finishing[] -> PACKING (without duplicate packing)
      let sequenceNo = 1;
      const operationsToCreate = [];

      if (planOverrides.operations && Array.isArray(planOverrides.operations) && planOverrides.operations.length > 0) {
        for (const op of planOverrides.operations) {
          operationsToCreate.push({
            productionOrderId: productionOrder._id,
            jobOrderId: job._id,
            branchId: job.branchId,
            operationCode: (op.operationCode || op.operationName || "PRINT").toUpperCase().trim(),
            operationName: op.operationName || op.operation || "Printing",
            sequenceNo: sequenceNo++,
            machineId: planOverrides.machineId || null,
            machine: op.machine || planOverrides.machine || "Floor Station",
            assignedEmployeeId: (planOverrides.assignedEmployeeIds && planOverrides.assignedEmployeeIds[0]) || null,
            assignedEmployee: (planOverrides.assignedEmployees && planOverrides.assignedEmployees[0]) || "Assigned",
            plannedQty,
            inputQty: plannedQty,
            completedQty: 0,
            cycleNo: 0,
            cycleType: "ORIGINAL",
            status: op.status || "PENDING",
          });
        }
      } else {
        // 1. PRINT Operation
        const printOperator = await RoundRobinService.getNextEmployee(job.branchId, "PRINT");
        operationsToCreate.push({
          productionOrderId: productionOrder._id,
          jobOrderId: job._id,
          branchId: job.branchId,
          operationCode: "PRINT",
          operationName: "Printing",
          sequenceNo: sequenceNo++,
          machineId: planOverrides.machineId || null,
          machine: planOverrides.machine || "Floor Station",
          assignedEmployeeId: printOperator ? printOperator._id : null,
          plannedQty,
          inputQty: plannedQty,
          completedQty: 0,
          cycleNo: 0,
          cycleType: "ORIGINAL",
          status: "PENDING",
        });

        // 2. Finishing Operations strictly from jobItems.finishing[]
        let hasPacking = false;
        if (item.finishing && Array.isArray(item.finishing)) {
          for (const finishingItem of item.finishing) {
            const name = (finishingItem.name || finishingItem.option || "").trim();
            const opCode = (finishingItem.code || finishingItem.process || "FINISHING").toUpperCase().trim();
            if (name.toLowerCase().includes("pack") || opCode.includes("PACK")) {
              hasPacking = true;
            }
            const finishingOperator = await RoundRobinService.getNextEmployee(job.branchId, opCode);
            operationsToCreate.push({
              productionOrderId: productionOrder._id,
              jobOrderId: job._id,
              branchId: job.branchId,
              operationCode: opCode,
              operationName: name || opCode,
              sequenceNo: sequenceNo++,
              machine: planOverrides.machine || "Floor Workstation",
              assignedEmployeeId: finishingOperator ? finishingOperator._id : null,
              plannedQty,
              inputQty: plannedQty,
              completedQty: 0,
              cycleNo: 0,
              cycleType: "ORIGINAL",
              status: "PENDING",
              remarks: finishingItem.notes || "",
            });
          }
        }

        // 3. PACKING Operation (only if NOT already included in finishing)
        if (!hasPacking) {
          const packingOperator = await RoundRobinService.getNextEmployee(job.branchId, "PACKING");
          operationsToCreate.push({
            productionOrderId: productionOrder._id,
            jobOrderId: job._id,
            branchId: job.branchId,
            operationCode: "PACKING",
            operationName: "Packing",
            sequenceNo: sequenceNo++,
            machine: "Packing Station",
            assignedEmployeeId: packingOperator ? packingOperator._id : null,
            plannedQty,
            inputQty: plannedQty,
            completedQty: 0,
            cycleNo: 0,
            cycleType: "ORIGINAL",
            status: "PENDING",
          });
        }
      }

      await productionOperationRepository.insertMany(operationsToCreate);

      // Audit & Workflow events
      await ProductionStateService.logAudit({
        action: "PRODUCTION_PLANNED",
        resource: "ProductionOrder",
        resourceId: productionOrder._id,
        user,
        branchId: job.branchId,
        details: {
          productionNo: productionOrder.productionNo,
          jobOrderId: job._id,
          operationsCount: operationsToCreate.length,
        },
      });

      await ProductionStateService.dispatchWorkflowEvent({
        jobOrderId: job._id,
        productionOrderId: productionOrder._id,
        eventType: "production.planned",
        stage: "PLANNED",
        performedBy: user ? user._id : null,
        details: { productionNo: productionOrder.productionNo, plannedQty },
      });

      await ProductionStateService.createNotification({
        role: "production",
        branchId: job.branchId,
        title: "New Production Planned",
        message: `Production Order ${productionOrder.productionNo} for Job ${job.jobNo || job._id} has been planned and queued.`,
        entityType: "PRODUCTION",
        entityId: productionOrder._id,
      });
    }

    // Update job stage
    await ProductionStateService.updateJobStage(job._id, "PLANNED", "IN_PRODUCTION");

    return createdProductionOrders;
  }
}

module.exports = ProductionPlanningService;
