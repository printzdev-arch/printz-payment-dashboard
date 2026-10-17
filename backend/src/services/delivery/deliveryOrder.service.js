const mongoose = require("mongoose");
const deliveryOrderRepository = require("../../models/delivery/DeliveryOrder");
const deliveryProofRepository = require("../../models/delivery/DeliveryProof");
const productionStateRepository = require("../../models/production/ProductionState");
const JobOrder = require("../../models/job-order/JobOrder");
const User = require("../../models/auth/User");
const Employee = require("../../models/auth/Employee");
const ProductionOrder = require("../../models/production/ProductionOrder");
const ProductionOperation = require("../../models/production/ProductionOperation");
const QualityCheck = require("../../models/production/QualityCheck");
const ReprintRequest = require("../../models/production/ReprintRequest");
const ProductionStateService = require("../production/productionState.service");
const DeliveryProofService = require("./deliveryProof.service");
const numberSequenceService = require("../common/numberSequence.service");
const WhatsAppService = require("../../utils/integrations/WhatsAppService");
const ErrorHelper = require("../../utils/ApiError");
const { getDatePrefix, getTodayDateString } = require("../../utils/dateUtils");

class DeliveryOrderService {
  /**
   * Helper: Extracts authorized branch IDs for the user.
   * Returns null if user is a Super Admin or Admin (global/unrestricted access).
   * Returns array of string branch IDs otherwise.
   */
  static getUserBranchIds(user) {
    if (!user) return [];
    if (
      user.role === "admin" ||
      user.role === "SUPER_ADMIN" ||
      user.roleCode === "SUPER_ADMIN" ||
      user.roleCode === "ADMIN" ||
      user.roleCode === "INTERNAL_ADMIN"
    ) {
      return null;
    }

    const branchIds = (user.branchIds || [])
      .map((b) => (b && b._id ? b._id.toString() : (b ? b.toString() : "")))
      .filter(Boolean);

    if (user.branchId) {
      const bId = user.branchId._id ? user.branchId._id.toString() : user.branchId.toString();
      if (bId && !branchIds.includes(bId)) {
        branchIds.push(bId);
      }
    }

    return branchIds;
  }

  /**
   * Helper: Enforces that the caller has authorization for the given branch.
   */
  static assertBranchAccess(branchId, user) {
    if (!user) {
      throw ErrorHelper.unauthorized("Authentication required.");
    }
    const authorizedBranches = this.getUserBranchIds(user);
    if (authorizedBranches === null) {
      return true; // Admin has global access
    }

    const bIdStr = branchId && branchId._id ? branchId._id.toString() : (branchId ? branchId.toString() : "");
    if (!bIdStr || !authorizedBranches.includes(bIdStr)) {
      throw ErrorHelper.forbidden("Access denied: You are not authorized for this branch's delivery orders.");
    }
    return true;
  }

  /**
   * Helper: Verifies that all production operations and QC checks for a job are complete.
   * Recognizes QC_PASSED as valid only when all operations are complete and QC passed.
   */
  static async assertJobProductionComplete(jobOrderId) {
    const [activeProdOrders, activeReprints] = await Promise.all([
      ProductionOrder.find({
        jobOrderId,
        status: { $ne: "CANCELLED" },
      }).lean(),
      ReprintRequest.find({
        jobOrderId,
        status: { $in: ["REQUESTED", "APPROVED", "IN_PRODUCTION"] },
      }).lean(),
    ]);

    if (activeReprints.length > 0) {
      throw ErrorHelper.badRequest(
        "Cannot proceed with delivery: There are unresolved reprint requests for this job."
      );
    }

    if (activeProdOrders.length > 0) {
      // 1. Every non-cancelled production order must have reached QC_PASSED or COMPLETED
      const incompleteOrders = activeProdOrders.filter(
        (p) => !["COMPLETED", "QC_PASSED"].includes(p.status)
      );
      if (incompleteOrders.length > 0) {
        const statuses = incompleteOrders.map((p) => p.status).join(", ");
        throw ErrorHelper.badRequest(
          `Cannot proceed with delivery: Production operations are not completed (found orders in status: ${statuses}).`
        );
      }

      // 2. All operations for these production orders must be COMPLETED or SKIPPED
      const orderIds = activeProdOrders.map((p) => p._id);
      const pendingOps = await ProductionOperation.find({
        productionOrderId: { $in: orderIds },
        status: { $in: ["PENDING", "RUNNING", "FAILED"] },
      }).lean();

      if (pendingOps.length > 0) {
        const opNames = pendingOps.map((op) => `${op.operationName || op.operationCode} (${op.status})`).join(", ");
        throw ErrorHelper.badRequest(
          `Cannot proceed with delivery: Incomplete production operations found: ${opNames}.`
        );
      }

      // 3. For any order in QC_PASSED, ensure the latest QC inspection is not FAIL or ISSUE
      const latestQcChecks = await QualityCheck.find({
        productionOrderId: { $in: orderIds },
      })
        .sort({ checkedAt: -1 })
        .lean();

      const latestByOrder = {};
      latestQcChecks.forEach((qc) => {
        const oId = qc.productionOrderId.toString();
        if (!latestByOrder[oId]) {
          latestByOrder[oId] = qc;
        }
      });

      for (const p of activeProdOrders) {
        const latestQc = latestByOrder[p._id.toString()];
        if (latestQc && ["FAIL", "ISSUE"].includes(latestQc.result)) {
          throw ErrorHelper.badRequest(
            `Cannot proceed with delivery: Quality control failed for order ${p.productionNo} (${latestQc.result}). Requires resolution.`
          );
        }
      }
    }

    return true;
  }

  /**
   * List delivery orders with pagination, multi-field filters, and branch security.
   */
  static async findAll(query = {}, user = null) {
    const filterQuery = { ...query };

    // Enforce branch security for non-admin callers
    if (user) {
      const authorizedBranches = this.getUserBranchIds(user);
      if (authorizedBranches !== null) {
        if (filterQuery.branchId) {
          this.assertBranchAccess(filterQuery.branchId, user);
        } else {
          filterQuery.branchId = { $in: authorizedBranches };
        }

        // Delivery staff scoped to their assignments or branch
        if (user.role === "delivery") {
          filterQuery.$or = [
            { assignedEmployeeId: user._id },
            { branchId: { $in: authorizedBranches } },
          ];
        }
      }
    }

    return deliveryOrderRepository.findAll(filterQuery);
  }

  /**
   * Helper: Get active employee staff members for delivery allocation
   */
  static async getDeliveryStaff(query = {}, user = null) {
    const filter = {
      employmentStatus: "ACTIVE",
      isActive: { $ne: false },
    };
    if (query.branchId) {
      filter.branchId = query.branchId;
    }
    const staff = await Employee.find(filter)
      .select("name mobile employeeCode email address designation branchId")
      .lean();
    return staff;
  }

  /**
   * Get single delivery order by ID with branch security check
   */
  static async findById(id, user = null) {
    const order = await deliveryOrderRepository.findByIdWithDetails(id);
    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    if (user) {
      this.assertBranchAccess(order.branchId, user);

      if (user.role === "delivery") {
        const isAssigned =
          (order.assignedEmployeeId && order.assignedEmployeeId.toString() === user._id.toString()) ||
          (user.phone && order.deliveryPersonPhone === user.phone);
        const authorizedBranches = this.getUserBranchIds(user) || [];
        const orderBranchStr = order.branchId?._id ? order.branchId._id.toString() : order.branchId?.toString();
        if (!isAssigned && !authorizedBranches.includes(orderBranchStr)) {
          throw ErrorHelper.forbidden("Access denied: You are not assigned to this delivery order.");
        }
      }
    }

    return order;
  }

  /**
   * Step 1: Manager Reviews Job
   * Lists jobs that have passed QC and are ready for delivery review.
   * Enforces branch authorization and checks production & QC completion.
   */
  static async getReadyJobsForDelivery(query = {}, user = null) {
    const filter = {
      $or: [
        { currentStage: { $in: ["READY", "DELIVERY", "READY_FOR_DELIVERY"] } },
        { stage: { $in: ["READY", "DELIVERY", "READY_FOR_DELIVERY"] } },
        { status: { $in: ["READY", "READY_FOR_DELIVERY"] } },
      ],
      status: { $nin: ["CANCELLED", "DELIVERED", "ON_HOLD", "DRAFT"] },
    };

    if (user) {
      const authorizedBranches = this.getUserBranchIds(user);
      if (authorizedBranches !== null) {
        if (query.branchId) {
          this.assertBranchAccess(query.branchId, user);
          filter.branchId = query.branchId;
        } else {
          filter.branchId = { $in: authorizedBranches };
        }
      } else if (query.branchId) {
        filter.branchId = query.branchId;
      }
    } else if (query.branchId) {
      filter.branchId = query.branchId;
    }

    if (query.search) {
      const term = query.search.trim();
      filter.$or = [
        { jobNo: { $regex: term, $options: "i" } },
        { customerName: { $regex: term, $options: "i" } },
        { customerPhone: { $regex: term, $options: "i" } },
        { title: { $regex: term, $options: "i" } },
      ];
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const candidateJobs = await JobOrder.find(filter)
      .populate("branchId", "name code")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Verify production completeness for each candidate
    const eligibleJobs = [];
    for (const job of candidateJobs) {
      try {
        await this.assertJobProductionComplete(job._id);
        eligibleJobs.push(job);
      } catch (_) {
        // Incomplete production or QC, not eligible for delivery
      }
    }

    // Attach existing delivery order if any
    const jobIds = eligibleJobs.map((j) => j._id);
    const deliveryOrders = await deliveryOrderRepository.findAll({
      jobOrderId: { $in: jobIds },
      limit: 100,
    });

    const deliveryMap = {};
    (deliveryOrders.items || []).forEach((d) => {
      const jId = d.jobOrderId?._id ? d.jobOrderId._id.toString() : d.jobOrderId?.toString();
      if (jId) deliveryMap[jId] = d;
    });

    const enrichedJobs = eligibleJobs.map((job) => ({
      ...job,
      deliveryOrder: deliveryMap[job._id.toString()] || null,
      isDeliveryPrepared: Boolean(deliveryMap[job._id.toString()]),
    }));

    const total = await JobOrder.countDocuments(filter);
    return { items: enrichedJobs, total, page, limit };
  }

  /**
   * Step 1: Manager reviews job and marks as ready for delivery.
   * Status remains READY (not changing READY_FOR_DELIVERY into status).
   */
  static async reviewJob(jobOrderId, reviewData = {}, user = null) {
    const job = await JobOrder.findById(jobOrderId);
    if (!job) {
      throw ErrorHelper.notFound(`Job Order not found with ID: ${jobOrderId}`);
    }

    // Enforce branch authorization
    this.assertBranchAccess(job.branchId, user);

    // Verify job eligibility
    if (job.status === "CANCELLED" || job.status === "DELIVERED") {
      throw ErrorHelper.badRequest(
        `Job Order ${job.jobNo} is in status '${job.status}' and cannot be reviewed for delivery.`
      );
    }
    const isReadyForDelivery =
      job.stage === "READY" ||
      job.currentStage === "READY" ||
      job.stage === "READY_FOR_DELIVERY" ||
      job.currentStage === "READY_FOR_DELIVERY" ||
      job.currentStage === "DELIVERY" ||
      job.status === "READY";

    if (!isReadyForDelivery) {
      throw ErrorHelper.badRequest(
        `Job Order ${job.jobNo} has not reached READY stage (current stage: ${job.stage || job.currentStage}).`
      );
    }

    // Ensure all production operations and QC are completed
    await this.assertJobProductionComplete(job._id);

    // Map items from job
    const mappedItems = Array.isArray(job.items)
      ? job.items.map((i) => ({
          itemId: i._id || i.itemId || null,
          jobItemId: i._id || i.itemId || null,
          name: i.itemName || i.name || "Item",
          itemName: i.itemName || i.name || "Item",
          description: i.description || "",
          quantity: i.quantity || 0,
          unit: i.unit || "PCS",
        }))
      : [];

    const finalQuantity = job.quantity !== undefined
      ? job.quantity
      : (mappedItems.length > 0
          ? mappedItems.reduce((s, it) => s + (it.quantity || 0), 0)
          : (job.totalQuantity || 1));

    let deliveryOrder = await deliveryOrderRepository.findOne({ jobOrderId });

    if (!deliveryOrder) {
      // Auto-generate DO-xxxxx sequence
      let deliveryNo;
      try {
        deliveryNo = await numberSequenceService.generateBusinessNumber("DELIVERY_ORDER", {
          prefix: "DO",
          padLength: 5,
          branchId: job.branchId?.toString(),
        });
      } catch (_) {
        const datePrefix = getDatePrefix();
        const count = await deliveryOrderRepository.countDocuments();
        deliveryNo = `DO-${datePrefix}-${String(count + 1).padStart(4, "0")}`;
      }

      deliveryOrder = await deliveryOrderRepository.create({
        deliveryNo,
        jobOrderId: job._id,
        branchId: job.branchId,
        customerId: job.customerId ? String(job.customerId) : null,
        customerName: job.customerName || "Customer",
        customerPhone: job.customerPhone || "",
        deliveryAddress: job.customerSnapshot?.address || "",
        quantity: finalQuantity,
        items: mappedItems,
        status: "READY",
        reviewedBy: user ? user._id : null,
        reviewedAt: new Date(),
        reviewNotes: reviewData.reviewNotes || reviewData.notes || "Job reviewed and ready for delivery",
        pickupOtp: Math.floor(100000 + Math.random() * 900000).toString(),
      });
    } else {
      // Safe sync: Only synchronize items and quantity if DO is in READY status
      if (deliveryOrder.status === "READY") {
        deliveryOrder.quantity = finalQuantity;
        if (!deliveryOrder.items || deliveryOrder.items.length === 0 || mappedItems.length > 0) {
          deliveryOrder.items = mappedItems;
        }
      }
      deliveryOrder.reviewedBy = user ? user._id : null;
      deliveryOrder.reviewedAt = new Date();
      if (reviewData.reviewNotes || reviewData.notes) {
        deliveryOrder.reviewNotes = reviewData.reviewNotes || reviewData.notes;
      }
      if (!deliveryOrder.pickupOtp) {
        deliveryOrder.pickupOtp = Math.floor(100000 + Math.random() * 900000).toString();
      }
      await deliveryOrder.save();
    }

    await ProductionStateService.logAudit({
      action: "DELIVERY_JOB_REVIEWED",
      resource: "DeliveryOrder",
      resourceId: deliveryOrder._id,
      user,
      branchId: deliveryOrder.branchId,
      details: { jobNo: job.jobNo, deliveryNo: deliveryOrder.deliveryNo },
    });

    return deliveryOrder;
  }

  /**
   * Step 2: Enter Delivery Details (DO-xxxxx)
   * Create delivery order with full details and persistence.
   */
  static async createDeliveryOrder(data = {}, user = null) {
    const { jobOrderId } = data;
    if (!jobOrderId) {
      throw ErrorHelper.badRequest("Job Order ID is required to create a delivery order");
    }

    const job = await JobOrder.findById(jobOrderId);
    if (!job) {
      throw ErrorHelper.notFound(`Job Order not found with ID: ${jobOrderId}`);
    }

    // Enforce branch access
    this.assertBranchAccess(job.branchId, user);

    // Verify production completion
    await this.assertJobProductionComplete(job._id);

    // If delivery order already exists for this job, update it idempotently
    let existing = await deliveryOrderRepository.findOne({ jobOrderId });
    if (existing) {
      return this.updateDeliveryDetails(existing._id, data, user);
    }

    // Generate DO-xxxxx sequence
    let deliveryNo = data.deliveryNo;
    if (!deliveryNo) {
      try {
        deliveryNo = await numberSequenceService.generateBusinessNumber("DELIVERY_ORDER", {
          prefix: "DO",
          padLength: 5,
          branchId: (data.branchId || job.branchId)?.toString(),
        });
      } catch (_) {
        const datePrefix = getDatePrefix();
        const count = await deliveryOrderRepository.countDocuments();
        deliveryNo = `DO-${datePrefix}-${String(count + 1).padStart(4, "0")}`;
      }
    }

    const pickupOtp = data.pickupOtp || Math.floor(100000 + Math.random() * 900000).toString();

    const mappedItems = Array.isArray(job.items)
      ? job.items.map((i) => ({
          itemId: i._id || i.itemId || null,
          jobItemId: i._id || i.itemId || null,
          name: i.itemName || i.name || "Item",
          itemName: i.itemName || i.name || "Item",
          description: i.description || "",
          quantity: i.quantity || 0,
          unit: i.unit || "PCS",
        }))
      : [];

    const finalQuantity = data.quantity !== undefined
      ? data.quantity
      : (job.quantity !== undefined
          ? job.quantity
          : (mappedItems.length > 0
              ? mappedItems.reduce((s, it) => s + (it.quantity || 0), 0)
              : (job.totalQuantity || 1)));

    const orderData = {
      deliveryNo,
      jobOrderId: job._id,
      branchId: data.branchId || job.branchId,
      customerId: data.customerId || (job.customerId ? String(job.customerId) : null),
      customerName: data.customerName || job.customerName || "Customer",
      customerPhone: data.customerPhone || job.customerPhone || "",
      deliveryAddress: data.deliveryAddress || job.customerSnapshot?.address || "",
      deliveryType: data.deliveryType || "DELIVERY",
      quantity: finalQuantity,
      items: (data.items && data.items.length > 0) ? data.items : mappedItems,
      status: "READY",
      deliveryPersonName: data.deliveryPersonName || "",
      deliveryPersonPhone: data.deliveryPersonPhone || "",
      assignedEmployeeId: data.assignedEmployeeId || null,
      vehicleNumber: data.vehicleNumber || data.vehicle || "",
      vehicle: data.vehicle || data.vehicleNumber || "",
      deliveryTime: data.deliveryTime || "",
      instructions: data.instructions || "",
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
      reviewedBy: user ? user._id : null,
      reviewedAt: new Date(),
      reviewNotes: data.reviewNotes || "",
      pickupOtp,
    };

    const newOrder = await deliveryOrderRepository.create(orderData);

    await ProductionStateService.logAudit({
      action: "DELIVERY_ORDER_CREATED",
      resource: "DeliveryOrder",
      resourceId: newOrder._id,
      user,
      branchId: newOrder.branchId,
      details: { deliveryNo: newOrder.deliveryNo, jobNo: job.jobNo },
    });

    return newOrder;
  }

  /**
   * Step 2: Update delivery details
   */
  static async updateDeliveryDetails(id, data = {}, user = null) {
    const order = await deliveryOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    this.assertBranchAccess(order.branchId, user);

    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      throw ErrorHelper.badRequest(`Cannot modify delivery order in status '${order.status}'`);
    }

    const allowedFields = [
      "deliveryPersonName",
      "deliveryPersonPhone",
      "assignedEmployeeId",
      "vehicleNumber",
      "vehicle",
      "deliveryAddress",
      "deliveryType",
      "deliveryTime",
      "instructions",
      "expectedDeliveryDate",
      "customerPhone",
      "customerName",
      "quantity",
      "items",
      "reviewNotes",
    ];

    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        if (field === "expectedDeliveryDate" && data[field]) {
          order[field] = new Date(data[field]);
        } else {
          order[field] = data[field];
        }
      }
    });

    if (data.vehicle && !data.vehicleNumber) {
      order.vehicleNumber = data.vehicle;
    }

    await order.save();

    await ProductionStateService.logAudit({
      action: "DELIVERY_DETAILS_UPDATED",
      resource: "DeliveryOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: { deliveryNo: order.deliveryNo },
    });

    return order;
  }

  /**
   * Step 3: Assign and Send Details
   * Updates status to ASSIGNED only after successful validation.
   */
  static async assignDeliveryPerson(id, assignData = {}, user = null) {
    const order = await deliveryOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    this.assertBranchAccess(order.branchId, user);

    // Eligible only from READY or ASSIGNED
    if (order.status !== "READY" && order.status !== "ASSIGNED") {
      throw ErrorHelper.badRequest(
        `Cannot assign delivery order in status '${order.status}'. Assignment is only permitted for READY orders.`
      );
    }

    const {
      deliveryPersonName,
      deliveryPersonPhone,
      vehicle,
      vehicleNumber,
      assignedEmployeeId,
      instructions,
      expectedDeliveryDate,
      sendWhatsApp = true,
      sendSystemNotification = true,
    } = assignData;

    // Validate assigned employee / user if ID provided
    if (assignedEmployeeId) {
      let emp = null;
      if (mongoose.Types.ObjectId.isValid(assignedEmployeeId)) {
        emp = (await Employee.findById(assignedEmployeeId)) || (await User.findById(assignedEmployeeId));
      }

      if (emp) {
        if (emp.isActive === false || emp.employmentStatus === "INACTIVE" || emp.status === "DISABLED") {
          throw ErrorHelper.badRequest("Assigned delivery person/employee is inactive.");
        }

        // Check assigned employee's branch access
        const empBranchStr = emp.branchId?._id ? emp.branchId._id.toString() : (emp.branchId ? emp.branchId.toString() : "");
        const empBranchIds = (emp.branchIds || []).map((b) => (b && b._id ? b._id.toString() : b.toString()));
        const orderBranchStr = order.branchId?.toString();

        if (empBranchStr && empBranchStr !== orderBranchStr && !empBranchIds.includes(orderBranchStr)) {
          throw ErrorHelper.badRequest("Assigned delivery person does not have branch access to this order's branch.");
        }

        order.assignedEmployeeId = emp._id;
        if (!deliveryPersonName) {
          order.deliveryPersonName = emp.name;
        }
        if (!deliveryPersonPhone) {
          order.deliveryPersonPhone = emp.mobile || emp.phone || "";
        }
      } else {
        // If not found in DB but rider name was given, proceed with custom rider name
        if (!deliveryPersonName) {
          throw ErrorHelper.badRequest(`Assigned delivery person/employee not found with ID: ${assignedEmployeeId}`);
        }
      }
    }

    if (deliveryPersonName) order.deliveryPersonName = deliveryPersonName;
    if (deliveryPersonPhone) order.deliveryPersonPhone = deliveryPersonPhone;
    if (vehicle || vehicleNumber) {
      order.vehicle = vehicle || vehicleNumber;
      order.vehicleNumber = vehicleNumber || vehicle;
    }
    if (instructions) order.instructions = instructions;
    if (expectedDeliveryDate) order.expectedDeliveryDate = new Date(expectedDeliveryDate);

    if (!order.pickupOtp) {
      order.pickupOtp = Math.floor(100000 + Math.random() * 900000).toString();
    }

    order.status = "ASSIGNED";
    order.assignedAt = new Date();
    order.assignedBy = user ? user._id : null;

    // Notifications
    const channels = [];

    // 1. In-app system notification
    if (sendSystemNotification) {
      try {
        await ProductionStateService.createNotification({
          userId: order.assignedEmployeeId || null,
          role: "delivery",
          branchId: order.branchId,
          title: `Delivery Assigned: ${order.deliveryNo}`,
          message: `Delivery order ${order.deliveryNo} has been assigned to ${order.deliveryPersonName || "you"}.`,
          type: "INFO",
          entityType: "DELIVERY",
          entityId: order._id,
        });
        channels.push("SYSTEM");
      } catch (err) {
        console.error("System notification failed:", err.message);
      }
    }

    // 2. WhatsApp notification
    if (sendWhatsApp) {
      const isWaConfigured = WhatsAppService.isConfigured();
      const job = await JobOrder.findById(order.jobOrderId).lean();
      const jobNo = job ? job.jobNo : "";

      if (isWaConfigured) {
        if (order.deliveryPersonPhone) {
          try {
            const waRes = await WhatsAppService.sendDeliveryNotification({
              to: order.deliveryPersonPhone,
              recipientRole: "DRIVER",
              recipientName: order.deliveryPersonName,
              deliveryNo: order.deliveryNo,
              jobNo,
              deliveryType: order.deliveryType,
              address: order.deliveryAddress,
              deliveryTime: order.deliveryTime,
              instructions: order.instructions,
              expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.toDateString() : "",
              vehicle: order.vehicleNumber || order.vehicle,
            });

            if (waRes.success && waRes.delivered) {
              channels.push("WHATSAPP_DRIVER");
              order.whatsappMessageId = waRes.messageId;
              order.whatsappStatus = "SENT";
            } else {
              order.whatsappStatus = "FAILED";
            }
          } catch (err) {
            order.whatsappStatus = "FAILED";
            console.error("WhatsApp driver notification failed:", err.message);
          }
        }

        const customerPhone = order.customerPhone || job?.customerPhone;
        if (customerPhone) {
          try {
            const waRes = await WhatsAppService.sendDeliveryNotification({
              to: customerPhone,
              recipientRole: "CUSTOMER",
              recipientName: order.customerName,
              deliveryNo: order.deliveryNo,
              jobNo,
              deliveryPersonName: order.deliveryPersonName,
              deliveryPersonPhone: order.deliveryPersonPhone,
              vehicle: order.vehicleNumber || order.vehicle,
              address: order.deliveryAddress,
              deliveryTime: order.deliveryTime,
              expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.toDateString() : "",
              otp: order.pickupOtp,
              deliveryType: order.deliveryType,
            });

            if (waRes.success && waRes.delivered) {
              channels.push("WHATSAPP_CUSTOMER");
            }
          } catch (err) {
            console.error("WhatsApp customer notification failed:", err.message);
          }
        }
      } else {
        // WhatsApp is not configured - do not claim a real message was sent
        order.whatsappStatus = "NOT_SENT";
      }
    }

    order.notificationSent = channels.includes("SYSTEM") || channels.includes("WHATSAPP_DRIVER");
    order.notificationSentAt = new Date();
    order.notificationChannels = channels;

    await order.save();

    await ProductionStateService.logAudit({
      action: "DELIVERY_ASSIGNED",
      resource: "DeliveryOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: {
        deliveryNo: order.deliveryNo,
        assignedTo: order.deliveryPersonName,
        channels,
      },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: order.jobOrderId,
      eventType: "delivery.assigned",
      stage: "DELIVERY",
      performedBy: user ? user._id : null,
      details: { deliveryNo: order.deliveryNo, deliveryPersonName: order.deliveryPersonName },
    });

    return order;
  }

  /**
   * Step 4: Pack and Verify Goods (Stage: PACKED)
   * Enforces that order must be ASSIGNED and production/QC completed.
   */
  static async pack(id, packData = {}, user = null) {
    const order = await deliveryOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    this.assertBranchAccess(order.branchId, user);

    // Idempotent return if already packed
    if (order.status === "PACKED") {
      return order;
    }

    // Must be in a valid pre-pack status (READY, REVIEWED, or ASSIGNED)
    const validPrePackStatuses = ["READY", "REVIEWED", "ASSIGNED"];
    if (!validPrePackStatuses.includes(order.status)) {
      throw ErrorHelper.badRequest(
        `Cannot pack delivery order with status '${order.status}'. Expected READY or ASSIGNED.`
      );
    }

    // Verify production and QC completeness
    await this.assertJobProductionComplete(order.jobOrderId);

    // Validate packed quantity
    if (packData.packedQuantity !== undefined || packData.quantity !== undefined) {
      const pQty = Number(packData.packedQuantity !== undefined ? packData.packedQuantity : packData.quantity);
      if (isNaN(pQty) || pQty <= 0) {
        throw ErrorHelper.badRequest("Packed quantity must be a positive number.");
      }

      if (pQty !== order.quantity && !packData.notes && !packData.remarks && !packData.packingNotes) {
        throw ErrorHelper.badRequest(
          `Quantity discrepancy: Packed quantity (${pQty}) differs from delivery quantity (${order.quantity}). Please provide remarks/reason for the difference.`
        );
      }
      order.quantity = pQty;
    }

    order.status = "PACKED";
    order.packedAt = new Date();
    order.packedBy = user ? user._id : null;
    order.itemsVerified = true;
    if (packData.packingNotes || packData.notes || packData.remarks) {
      order.packingNotes = packData.packingNotes || packData.notes || packData.remarks;
    }

    await order.save();

    await ProductionStateService.logAudit({
      action: "DELIVERY_PACKED",
      resource: "DeliveryOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: { deliveryNo: order.deliveryNo, notes: order.packingNotes },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: order.jobOrderId,
      eventType: "delivery.packed",
      stage: "PACKING",
      performedBy: user ? user._id : null,
      details: { deliveryNo: order.deliveryNo },
    });

    return order;
  }

  /**
   * Step 5: Dispatch or Counter Pickup (Stage: OUT_FOR_DELIVERY)
   * Only PACKED delivery orders can be dispatched.
   */
  static async dispatch(id, dispatchData = {}, user = null) {
    const order = await deliveryOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    this.assertBranchAccess(order.branchId, user);

    // Idempotent return if already dispatched
    if (order.status === "OUT_FOR_DELIVERY") {
      return order;
    }

    // Auto-complete packing if dispatched directly from READY, REVIEWED, or ASSIGNED
    if (order.status !== "PACKED") {
      if (!order.packedAt) {
        order.packedAt = new Date();
        order.packedBy = user ? user._id : null;
        order.itemsVerified = true;
      }
    }

    if (dispatchData.deliveryType) {
      order.deliveryType = dispatchData.deliveryType;
    }
    if (dispatchData.dispatchNotes || dispatchData.notes || dispatchData.remarks) {
      order.dispatchNotes = dispatchData.dispatchNotes || dispatchData.notes || dispatchData.remarks;
    }
    if (dispatchData.vehicle || dispatchData.vehicleNumber) {
      order.vehicle = dispatchData.vehicle || dispatchData.vehicleNumber;
      order.vehicleNumber = dispatchData.vehicleNumber || dispatchData.vehicle;
    }

    order.status = "OUT_FOR_DELIVERY";
    order.dispatchedAt = new Date();
    order.dispatchedBy = user ? user._id : null;

    await order.save();

    // Transition Job Order stage to DELIVERY
    await ProductionStateService.updateJobStage(order.jobOrderId, "DELIVERY");

    await ProductionStateService.logAudit({
      action: "DELIVERY_DISPATCHED",
      resource: "DeliveryOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: { deliveryNo: order.deliveryNo, deliveryType: order.deliveryType },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: order.jobOrderId,
      eventType: "delivery.dispatched",
      stage: "DELIVERY",
      performedBy: user ? user._id : null,
      details: { deliveryNo: order.deliveryNo, deliveryType: order.deliveryType },
    });

    return order;
  }

  /**
   * Step 6: Record Handover Evidence
   * Persists evidence to deliveryProofs without prematurely marking status DELIVERED.
   */
  static async recordHandoverEvidence(id, evidenceData = {}, user = null) {
    const order = await deliveryOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    this.assertBranchAccess(order.branchId, user);

    // If order was already delivered, return existing proof idempotently
    if (order.status === "DELIVERED") {
      if (order.proofId) {
        const existingProof = await deliveryProofRepository.findById(order.proofId);
        return { proof: existingProof, deliveryOrder: order, message: "Delivery already completed" };
      }
    }

    if (order.status === "CANCELLED") {
      throw ErrorHelper.badRequest("Cannot record evidence for a CANCELLED delivery order.");
    }

    // Must be in OUT_FOR_DELIVERY state (or counter pickup packed)
    if (order.status !== "OUT_FOR_DELIVERY") {
      throw ErrorHelper.badRequest(
        `Cannot record handover evidence before order is dispatched. Expected status OUT_FOR_DELIVERY, current status is '${order.status}'.`
      );
    }

    const {
      recipientName,
      recipientPhone,
      recipientRelationship = "CUSTOMER",
      signatureUrl,
      otp,
      remarks = "",
      deliveryPhotos = [],
      proofType = "SIGNATURE",
      location,
      deliveryType,
    } = evidenceData;

    const finalRecipient = (recipientName || order.recipientName || order.receivedBy || "").trim();
    if (!finalRecipient) {
      throw ErrorHelper.badRequest("Recipient name (recipientName) is required.");
    }

    // Verify OTP if provided
    let otpVerified = false;
    if (otp) {
      if (order.pickupOtp && String(otp).trim() === String(order.pickupOtp).trim()) {
        otpVerified = true;
      } else {
        throw ErrorHelper.badRequest("Invalid Handover OTP provided.");
      }
    }

    // Validate photo URLs are safe
    const sanitizedPhotos = Array.isArray(deliveryPhotos)
      ? deliveryPhotos
          .map((p) => {
            const url = typeof p === "string" ? p : p.url;
            if (url && (url.includes("..") || url.startsWith("/etc/") || url.startsWith("C:\\Windows"))) {
              return null; // Strip insecure path references
            }
            return typeof p === "string" ? { url: p } : p;
          })
          .filter(Boolean)
      : [];

    // Create handover evidence document in deliveryProofs collection
    const proof = await DeliveryProofService.createProof(
      {
        deliveryOrderId: order._id,
        deliveryNo: order.deliveryNo,
        jobOrderId: order.jobOrderId,
        branchId: order.branchId,
        recipientName: finalRecipient,
        recipientPhone: recipientPhone || order.recipientPhone || order.customerPhone || "",
        recipientRelationship,
        deliveryType: deliveryType || order.deliveryType || "DELIVERY",
        signatureUrl: signatureUrl || order.signatureUrl || null,
        otp: otp || null,
        otpVerified,
        deliveryPhotos: sanitizedPhotos,
        remarks: remarks || order.remarks || "",
        proofType,
        location: location || { latitude: null, longitude: null, address: "" },
        deliveredBy: user ? user._id : null,
        deliveryPersonName: order.deliveryPersonName || (user ? user.name : ""),
        deliveredAt: new Date(),
        status: "VERIFIED",
        handoverStage: "DELIVERED",
      },
      user
    );

    // Save evidence on delivery order without changing status to DELIVERED yet
    order.proofId = proof._id;
    order.recipientName = finalRecipient;
    order.receivedBy = finalRecipient;
    if (recipientPhone) order.recipientPhone = recipientPhone;
    if (signatureUrl) order.signatureUrl = signatureUrl;
    if (otpVerified) order.isOtpVerified = true;
    if (remarks) order.remarks = remarks;

    await order.save();

    await ProductionStateService.logAudit({
      action: "DELIVERY_HANDOVER_RECORDED",
      resource: "DeliveryOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: {
        deliveryNo: order.deliveryNo,
        proofNo: proof.proofNo,
        recipientName: finalRecipient,
        proofType,
      },
    });

    return { proof, deliveryOrder: order, message: "Handover evidence recorded successfully" };
  }

  /**
   * Step 7: Final Delivery Receipt (STAGE DELIVERED)
   * Transitions DeliveryOrder to DELIVERED and completes Job Order.
   */
  static async deliver(id, data = {}, user = null) {
    const order = await deliveryOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    this.assertBranchAccess(order.branchId, user);

    // Idempotent return if already delivered
    if (order.status === "DELIVERED") {
      return order;
    }

    if (order.status === "CANCELLED") {
      throw ErrorHelper.badRequest("Cannot deliver a CANCELLED delivery order.");
    }

    // Must be in OUT_FOR_DELIVERY status
    if (order.status !== "OUT_FOR_DELIVERY") {
      throw ErrorHelper.badRequest(
        `Cannot deliver order before it is dispatched (OUT_FOR_DELIVERY). Current status is '${order.status}'.`
      );
    }

    const finalRecipient = (data.receivedBy || order.receivedBy || order.recipientName || "").trim();
    if (!finalRecipient) {
      throw ErrorHelper.badRequest("Receiver name (receivedBy) is required to complete delivery.");
    }

    // If proof not yet recorded and evidence was passed in request, auto-record proof now
    if (!order.proofId && (data.signatureUrl || data.otp || data.deliveryPhotos)) {
      await this.recordHandoverEvidence(
        id,
        {
          recipientName: finalRecipient,
          recipientPhone: data.recipientPhone || order.recipientPhone,
          signatureUrl: data.signatureUrl,
          otp: data.otp,
          remarks: data.remarks,
          deliveryPhotos: data.deliveryPhotos,
        },
        user
      );
    }

    order.status = "DELIVERED";
    order.deliveredAt = new Date();
    order.deliveredBy = user ? user._id : null;
    order.receivedBy = finalRecipient;
    order.recipientName = finalRecipient;
    if (data.remarks) order.remarks = data.remarks;

    await order.save();

    // Aggregate total delivered quantity across ALL completed deliveries for this JobOrder
    const deliveredOrdersResult = await deliveryOrderRepository.findAll({
      jobOrderId: order.jobOrderId,
      status: "DELIVERED",
      limit: 1000,
    });
    const deliveredOrdersList = Array.isArray(deliveredOrdersResult)
      ? deliveredOrdersResult
      : (deliveredOrdersResult?.items || []);

    const totalDeliveredQty = deliveredOrdersList.reduce(
      (sum, d) => sum + (Number(d.quantity) || 0),
      0
    );

    const job = await JobOrder.findById(order.jobOrderId);
    const requiredJobQty = Number(job?.quantity || job?.totalQuantity || 0);

    const isFullyDelivered = requiredJobQty > 0
      ? totalDeliveredQty >= requiredJobQty
      : true;

    if (isFullyDelivered) {
      // Full fulfillment: Mark Job Order COMPLETED and DELIVERED (ready for Step 9: Invoicing)
      await ProductionStateService.updateJobStage(order.jobOrderId, "COMPLETED", "DELIVERED");

      await ProductionStateService.dispatchWorkflowEvent({
        jobOrderId: order.jobOrderId,
        eventType: "delivery.delivered",
        stage: "COMPLETED",
        performedBy: user ? user._id : null,
        details: {
          deliveryNo: order.deliveryNo,
          receivedBy: finalRecipient,
          deliveredBatchQty: order.quantity,
          totalDeliveredQty,
          requiredJobQty,
          isFullDelivery: true,
        },
      });
    } else {
      // Partial delivery: Keep Job Order in DELIVERY stage and ACTIVE status until remaining balance is delivered
      await ProductionStateService.updateJobStage(order.jobOrderId, "DELIVERY", "ACTIVE");

      await ProductionStateService.dispatchWorkflowEvent({
        jobOrderId: order.jobOrderId,
        eventType: "delivery.partial_delivered",
        stage: "DELIVERY",
        performedBy: user ? user._id : null,
        details: {
          deliveryNo: order.deliveryNo,
          receivedBy: finalRecipient,
          deliveredBatchQty: order.quantity,
          totalDeliveredQty,
          requiredJobQty,
          remainingQty: Math.max(0, requiredJobQty - totalDeliveredQty),
          isFullDelivery: false,
        },
      });
    }

    // Create Job Approval record for delivery handover
    await productionStateRepository.createJobApproval({
      jobOrderId: order.jobOrderId,
      approvalType: "DELIVERY",
      status: "APPROVED",
      decidedBy: user ? user._id : null,
      decidedAt: new Date(),
      remarks: `Delivered ${order.quantity} units to ${finalRecipient} (${isFullyDelivered ? "Full fulfillment" : `Partial fulfillment: ${totalDeliveredQty}/${requiredJobQty}`}). ${data.remarks || order.remarks || ""}`,
    });

    await ProductionStateService.logAudit({
      action: "DELIVERED",
      resource: "DeliveryOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: {
        deliveryNo: order.deliveryNo,
        receivedBy: finalRecipient,
        quantity: order.quantity,
        totalDeliveredQty,
        requiredJobQty,
        isFullyDelivered,
      },
    });

    return order;
  }

  /**
   * Generate fresh 6-digit handover OTP
   */
  static async generateOtp(id, user = null) {
    const order = await deliveryOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    this.assertBranchAccess(order.branchId, user);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    order.pickupOtp = otp;
    await order.save();

    return { deliveryNo: order.deliveryNo, otp };
  }

  /**
   * Verify handover OTP
   */
  static async verifyOtp(id, otp, user = null) {
    const order = await deliveryOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    this.assertBranchAccess(order.branchId, user);

    if (!order.pickupOtp || String(otp).trim() !== String(order.pickupOtp).trim()) {
      return { verified: false, message: "Invalid OTP" };
    }

    order.isOtpVerified = true;
    await order.save();

    return { verified: true, message: "OTP successfully verified" };
  }

  /**
   * Get proof for a delivery order
   */
  static async getProof(id, user = null) {
    const order = await deliveryOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    this.assertBranchAccess(order.branchId, user);

    if (order.proofId) {
      return deliveryProofRepository.findById(order.proofId);
    }
    return deliveryProofRepository.findLatestByDeliveryOrderId(id);
  }
}

module.exports = DeliveryOrderService;
