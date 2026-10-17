const mongoose = require("mongoose");
const jobOrderRepository = require("../../models/job-order/JobOrder");
const productionOrderRepository = require("../../models/production/ProductionOrder");
const productionOperationRepository = require("../../models/production/ProductionOperation");
const ProductionStateService = require("./productionState.service");
const RoundRobinService = require("./roundRobin.service");
const ErrorHelper = require("../../utils/ApiError");
const JobItem = require("../../models/job-order/JobItem");
const { getDatePrefix } = require("../../utils/dateUtils");

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

      const datePrefix = getDatePrefix();
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
        const datePrefix = getDatePrefix();
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

  /**
   * Get eligible jobs for production planning (GET /production/planning)
   */
  static async getEligibleJobsForPlanning(branchId = null, query = {}) {
    const JobOrderModel = mongoose.model("JobOrder");
    const JobItemModel = mongoose.model("JobItem");
    const ProductionOrderModel = mongoose.model("ProductionOrder");

    // Fetch active jobs
    const filter = {
      status: { $nin: ["CANCELLED", "DELIVERED"] },
    };
    if (branchId) filter.branchId = branchId;

    const jobs = await JobOrderModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const jobIds = jobs.map((j) => j._id);
    const [allItems, activeOrders] = await Promise.all([
      JobItemModel.find({ jobOrderId: { $in: jobIds } }).lean(),
      ProductionOrderModel.find({
        jobOrderId: { $in: jobIds },
        status: { $ne: "CANCELLED" },
      }).lean(),
    ]);

    const itemsByJob = {};
    allItems.forEach((it) => {
      const jId = String(it.jobOrderId);
      if (!itemsByJob[jId]) itemsByJob[jId] = [];
      itemsByJob[jId].push(it);
    });

    const ordersByJobItem = {};
    activeOrders.forEach((o) => {
      if (o.jobItemId) {
        ordersByJobItem[String(o.jobItemId)] = o;
      }
      if (o.jobOrderId) {
        ordersByJobItem[`job_${o.jobOrderId}`] = o;
      }
    });

    const eligibleList = [];

    for (const job of jobs) {
      const items = itemsByJob[String(job._id)] || [
        {
          _id: job._id,
          jobItemId: `item_${job._id}_1`,
          itemName: job.title || "Print Job",
          quantity: job.quantity || 1,
        },
      ];

      for (const item of items) {
        const itemIdentifier = item.jobItemId || String(item._id);
        const existingOrder = ordersByJobItem[String(item._id)] || ordersByJobItem[itemIdentifier] || ordersByJobItem[`job_${job._id}`];
        const isPlanned = Boolean(existingOrder && existingOrder.status !== "CANCELLED");

        eligibleList.push({
          jobItemId: itemIdentifier,
          id: itemIdentifier,
          _id: itemIdentifier,
          jobId: String(job._id),
          jobOrderId: String(job._id),
          jobNo: job.jobNo || "JOB-000",
          customerCode: job.customerCode || "CUS-001",
          customerName: job.customerName || job.customerSnapshot?.name || "Customer",
          customerMobile: job.customerPhone || job.customerSnapshot?.mobile || "",
          customerCompany: job.customerCompany || job.customerSnapshot?.company || "",
          customerEmail: job.customerSnapshot?.email || "",
          branchId: job.branchId,
          branchName: job.branchName || "Main Branch",
          productName: item.itemName || job.title,
          productType: item.productType || "Brochure",
          requiredQuantity: Number(item.quantity) || Number(job.quantity) || 1,
          priority: job.priority || "NORMAL",
          planningStatus: isPlanned ? "PLANNED" : "UNPLANNED",
          hasActiveOrder: isPlanned,
          activeProductionNo: existingOrder?.productionNo || null,
          dueDate: job.dueDate,
          designRequired: Boolean(item.designRequired),
          designStatus: "APPROVED",
          suggestedOperations: [
            {
              operationCode: "PRINTING",
              operationName: "Digital Colour Printing",
              sequenceNo: 1,
              isRequired: true,
              estimatedMinutes: 30,
            },
            {
              operationCode: "LAMINATION",
              operationName: "Gloss Lamination",
              sequenceNo: 2,
              isRequired: true,
              estimatedMinutes: 20,
            },
            {
              operationCode: "CUTTING",
              operationName: "Precision Cutting & Creasing",
              sequenceNo: 3,
              isRequired: true,
              estimatedMinutes: 15,
            },
            {
              operationCode: "PACKING",
              operationName: "Packaging & Bundling",
              sequenceNo: 4,
              isRequired: true,
              estimatedMinutes: 10,
            },
          ],
        });
      }
    }

    return eligibleList;
  }

  /**
   * Get single eligible job by item ID (GET /production/planning/:id)
   */
  static async getEligibleJobById(itemId) {
    const list = await this.getEligibleJobsForPlanning();
    const found = list.find((j) => j.jobItemId === itemId || j.id === itemId || j.jobId === itemId || j.jobNo === itemId);
    if (!found) {
      throw ErrorHelper.notFound(`Eligible job item not found for production planning: ${itemId}`);
    }
    return found;
  }

  /**
   * Direct production order creation (POST /production/orders)
   */
  static async createProductionOrderDirect(payload = {}, user = null) {
    const JobOrderModel = mongoose.model("JobOrder");
    const JobItemModel = mongoose.model("JobItem");
    const ProductionOrderModel = mongoose.model("ProductionOrder");
    const ProductionOperationModel = mongoose.model("ProductionOperation");

    const targetJobItemId = payload.jobItemId || payload.id;
    let jobItem = null;
    let job = null;

    if (targetJobItemId) {
      if (mongoose.Types.ObjectId.isValid(String(targetJobItemId))) {
        jobItem = await JobItemModel.findById(targetJobItemId).lean();
      }
      if (!jobItem) {
        jobItem = await JobItemModel.findOne({ jobItemId: String(targetJobItemId) }).lean();
      }
    }

    if (jobItem?.jobOrderId) {
      job = await JobOrderModel.findById(jobItem.jobOrderId).lean();
    } else if (payload.jobOrderId || payload.jobId) {
      const jId = payload.jobOrderId || payload.jobId;
      if (mongoose.Types.ObjectId.isValid(String(jId))) {
        job = await JobOrderModel.findById(jId).lean();
      }
      if (!job && payload.jobNo) {
        job = await JobOrderModel.findOne({ jobNo: payload.jobNo }).lean();
      }
    } else if (payload.jobNo) {
      job = await JobOrderModel.findOne({ jobNo: payload.jobNo }).lean();
    }

    if (!job) {
      job = await JobOrderModel.findOne().sort({ createdAt: -1 }).lean();
    }

    if (!job) {
      throw ErrorHelper.badRequest("No job order found for production planning.");
    }

    const jobOrderId = job._id;
    const resolvedJobItemId = jobItem?._id || (mongoose.Types.ObjectId.isValid(String(targetJobItemId)) ? targetJobItemId : null) || (job.items && job.items[0]?._id) || new mongoose.Types.ObjectId();
    const plannedQty = Number(payload.plannedQty) || Number(jobItem?.quantity) || Number(job.quantity) || 1;

    // Sequential order number generation: PR-KO-YYMM-XXXX
    const datePrefix = getDatePrefix();
    const countOrders = await ProductionOrderModel.countDocuments();
    const productionNo = `PR-KO-${datePrefix.slice(2, 6)}-${String(countOrders + 1).padStart(4, "0")}`;

    // Raw operations from payload
    const rawOps = Array.isArray(payload.operations) && payload.operations.length > 0
      ? payload.operations
      : [
          { operationCode: "PRINTING", operationName: "Printing", sequenceNo: 1 },
          { operationCode: "FINISHING", operationName: "Finishing", sequenceNo: 2 },
          { operationCode: "PACKING", operationName: "Packing", sequenceNo: 3 },
        ];

    // Create ProductionOrder document
    const branchId = payload.branchId || job.branchId || user?.branchId;
    const productionOrder = await ProductionOrderModel.create({
      productionNo,
      jobOrderId,
      jobItemId: resolvedJobItemId,
      branchId: mongoose.Types.ObjectId.isValid(String(branchId)) ? branchId : user?.branchId,
      status: "PLANNED",
      priority: payload.priority || job.priority || "NORMAL",
      plannedQty,
      actualQty: 0,
      plannedStart: payload.plannedStart ? new Date(payload.plannedStart) : new Date(),
      expectedCompletion: payload.expectedCompletion ? new Date(payload.expectedCompletion) : null,
      notes: payload.notes || payload.allowanceReason || "",
      allowanceReason: payload.allowanceReason || "",
      cycleNo: 0,
      cycleType: "ORIGINAL",
      createdBy: user?._id || null,
    });

    // Create operations in ProductionOperation collection
    const createdOperations = [];
    for (let idx = 0; idx < rawOps.length; idx++) {
      const op = rawOps[idx];
      const seq = op.sequenceNo || (idx + 1);
      const createdOp = await ProductionOperationModel.create({
        productionOrderId: productionOrder._id,
        jobOrderId,
        branchId: productionOrder.branchId,
        sequenceNo: seq,
        operationCode: (op.operationCode || op.operationName || "PRINTING").toUpperCase().trim(),
        operationName: op.operationName || op.operationCode || "Printing",
        machineId: mongoose.Types.ObjectId.isValid(String(op.machineId || op.defaultMachineId)) ? (op.machineId || op.defaultMachineId) : null,
        machine: op.machineName || op.defaultMachineName || op.machine || "Floor Station",
        assignedEmployeeId: mongoose.Types.ObjectId.isValid(String(op.assignedEmployeeId)) ? op.assignedEmployeeId : null,
        plannedQty,
        inputQty: plannedQty,
        completedQty: 0,
        status: "PENDING",
        remarks: op.remarks || "",
      });
      createdOperations.push({
        ...createdOp.toObject(),
        operationId: String(createdOp._id),
        id: String(createdOp._id),
      });
    }

    // Update JobOrder stage to IN_PRODUCTION
    await JobOrderModel.findByIdAndUpdate(jobOrderId, {
      $set: {
        stage: "IN_PRODUCTION",
        currentStage: "IN_PRODUCTION",
        status: "IN_PRODUCTION",
      },
    });

    const orderObj = productionOrder.toObject ? productionOrder.toObject() : { ...productionOrder };
    return {
      ...orderObj,
      id: String(productionOrder._id),
      productionOrderId: String(productionOrder._id),
      jobNo: job.jobNo,
      customerName: job.customerName || job.customerSnapshot?.name || "Customer",
      customerMobile: job.customerPhone || job.customerSnapshot?.mobile || "",
      operations: createdOperations,
    };
  }
}

module.exports = ProductionPlanningService;
