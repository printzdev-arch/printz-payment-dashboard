const mongoose = require("mongoose");
const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoJobOrderRepository");
const productionOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOrderRepository");
const productionOperationRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOperationRepository");
const ProductionStateService = require("./productionState.service");
const RoundRobinService = require("./roundRobin.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class ProductionPlanningService {
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

    const itemsToProduce =
      job.items && job.items.length > 0
        ? job.items.filter((item) => item.needsProduction !== false)
        : [
            {
              _id: new mongoose.Types.ObjectId(),
              itemName: job.title || "Print Job",
              quantity: 1,
              finishing: [],
            },
          ];

    if (itemsToProduce.length === 0) {
      throw ErrorHelper.badRequest("No items in this Job Order require production.");
    }

    const createdProductionOrders = [];

    for (const item of itemsToProduce) {
      // Check for existing production order to prevent duplicates
      const existing = await productionOrderRepository.findOne({
        jobOrderId: job._id,
        jobItemId: item._id,
        status: { $ne: "CANCELLED" },
      });

      if (existing) {
        createdProductionOrders.push(existing);
        continue;
      }

      // Generate unique production number: PO-YYYYMMDD-XXXX
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const countToday = await productionOrderRepository.countToday();
      const productionNo = `PO-${datePrefix}-${String(countToday + 1).padStart(4, "0")}`;

      const plannedQty = item.quantity || 1;

      // Create Production Order
      const productionOrder = await productionOrderRepository.create({
        productionNo,
        jobOrderId: job._id,
        jobItemId: item._id,
        branchId: job.branchId,
        status: "PLANNED",
        priority: job.priority || "NORMAL",
        plannedQty,
        plannedStart: planOverrides.plannedStart || new Date(),
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

      // Generate operations: PRINT -> finishing[] -> PACKING
      let sequenceNo = 1;
      const operationsToCreate = [];

      // 1. PRINT Operation
      // Use Round Robin for initial auto-assignment if requested
      const printOperator = await RoundRobinService.getNextEmployee(job.branchId, "PRINT");

      operationsToCreate.push({
        productionOrderId: productionOrder._id,
        jobOrderId: job._id,
        branchId: job.branchId,
        operationCode: "PRINT",
        operationName: "Printing",
        sequenceNo: sequenceNo++,
        machineId: planOverrides.machineId || null,
        assignedEmployeeId: printOperator ? printOperator._id : null,
        plannedQty,
        inputQty: plannedQty,
        cycleNo: 0,
        cycleType: "ORIGINAL",
        status: "PENDING",
      });

      // 2. Finishing Operations from jobItems.finishing[]
      if (item.finishing && Array.isArray(item.finishing)) {
        for (const finishingItem of item.finishing) {
          const opCode = (finishingItem.code || "FINISHING").toUpperCase().trim();
          const opName = finishingItem.name || opCode;
          const finishingOperator = await RoundRobinService.getNextEmployee(job.branchId, opCode);

          operationsToCreate.push({
            productionOrderId: productionOrder._id,
            jobOrderId: job._id,
            branchId: job.branchId,
            operationCode: opCode,
            operationName: opName,
            sequenceNo: sequenceNo++,
            assignedEmployeeId: finishingOperator ? finishingOperator._id : null,
            plannedQty,
            inputQty: plannedQty,
            cycleNo: 0,
            cycleType: "ORIGINAL",
            status: "PENDING",
            remarks: finishingItem.notes || "",
          });
        }
      }

      // 3. PACKING Operation
      const packingOperator = await RoundRobinService.getNextEmployee(job.branchId, "PACKING");
      operationsToCreate.push({
        productionOrderId: productionOrder._id,
        jobOrderId: job._id,
        branchId: job.branchId,
        operationCode: "PACKING",
        operationName: "Packaging & Packing",
        sequenceNo: sequenceNo++,
        assignedEmployeeId: packingOperator ? packingOperator._id : null,
        plannedQty,
        inputQty: plannedQty,
        cycleNo: 0,
        cycleType: "ORIGINAL",
        status: "PENDING",
      });

      await productionOperationRepository.insertMany(operationsToCreate);

      // Audit & Workflow events
      await ProductionStateService.logAudit({
        action: "PRODUCTION_PLANNED",
        resource: "ProductionOrder",
        resourceId: productionOrder._id,
        user,
        branchId: job.branchId,
        details: {
          productionNo,
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
        details: { productionNo, plannedQty },
      });

      await ProductionStateService.createNotification({
        role: "production",
        branchId: job.branchId,
        title: "New Production Planned",
        message: `Production Order ${productionNo} for Job ${job.jobNo || job._id} has been planned and queued.`,
        entityType: "PRODUCTION",
        entityId: productionOrder._id,
      });

      createdProductionOrders.push(productionOrder);
    }

    // Update job stage
    await ProductionStateService.updateJobStage(job._id, "PLANNED", "IN_PRODUCTION");

    return createdProductionOrders;
  }
}

module.exports = ProductionPlanningService;
