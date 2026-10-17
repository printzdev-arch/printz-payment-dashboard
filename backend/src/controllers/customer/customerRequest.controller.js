const CustomerRequest = require("../../models/customer/CustomerRequest");
const Customer = require("../../models/customer/Customer");
const JobOrderService = require("../../services/job-order/jobOrder.service");
const CustomerMatchingService = require("../../services/customer/customerMatching.service");
const { asyncHandler, ResponseHelper } = require("../../utils");
const ErrorHelper = require("../../utils/ApiError");

/**
 * Controller for Customer Requests (Web/QR Enquiry Staging)
 */
class CustomerRequestController {
  /**
   * List customer requests with filters and pagination
   */
  static getCustomerRequests = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      source,
      branchId,
      q,
    } = req.query;

    const query = {};

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (source && source !== "ALL") {
      query.source = source;
    }

    if (branchId && branchId !== "ALL") {
      query.branchId = branchId;
    }

    if (q && q.trim()) {
      const term = q.trim();
      const regex = new RegExp(term, "i");
      query.$or = [
        { requestNo: regex },
        { customerName: regex },
        { customerPhone: regex },
        { customerEmail: regex },
        { customerCompany: regex },
        { title: regex },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      CustomerRequest.find(query)
        .populate("branchId", "name code")
        .populate("customerId", "customerCode name mobile phone email company companyName gstin address customerType customerSource")
        .populate("convertedJobOrderId", "jobNo status currentStage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      CustomerRequest.countDocuments(query),
    ]);

    // Resiliently resolve customerId for enquiries that don't have it linked yet
    for (const item of data) {
      if (!item.customerId && item.customerPhone) {
        const found = await Customer.findOne({
          $or: [{ mobile: item.customerPhone }, { phone: item.customerPhone }],
        }).select("customerCode name mobile phone email company companyName gstin address customerType customerSource").lean();
        if (found) {
          item.customerId = found;
          CustomerRequest.findByIdAndUpdate(item._id, { customerId: found._id }).catch(() => {});
        }
      }
    }

    return ResponseHelper.success(
      res,
      data,
      "Customer requests retrieved successfully",
      200,
      {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      }
    );
  });

  /**
   * Get single customer request by ID
   */
  static getCustomerRequestById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const request = await CustomerRequest.findById(id)
      .populate("branchId", "name code address phone")
      .populate("customerId", "customerCode name mobile email company gstin address")
      .populate("convertedJobOrderId", "jobNo title status currentStage totalAmount")
      .lean();

    if (!request) {
      throw ErrorHelper.notFound(`Customer request not found with ID: ${id}`);
    }

    return ResponseHelper.success(res, request, "Customer request details retrieved");
  });

  /**
   * Update enquiry status (e.g. UNDER_REVIEW, REJECTED, CANCELLED)
   */
  static updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, remarks, rejectionReason } = req.body;

    const request = await CustomerRequest.findById(id);
    if (!request) {
      throw ErrorHelper.notFound(`Customer request not found with ID: ${id}`);
    }

    if (status) request.status = status;
    if (remarks !== undefined) request.remarks = remarks;
    if (rejectionReason !== undefined) request.rejectionReason = rejectionReason;
    if (req.user) {
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
    }

    await request.save();

    return ResponseHelper.success(res, request, "Customer request updated successfully");
  });

  /**
   * Convert enquiry staging record into an active Job Order
   */
  static convertToJobOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const request = await CustomerRequest.findById(id);
    if (!request) {
      throw ErrorHelper.notFound(`Customer request not found with ID: ${id}`);
    }

    if (request.status === "CONVERTED_TO_JOB" && request.convertedJobOrderId) {
      return ResponseHelper.success(
        res,
        { jobOrderId: request.convertedJobOrderId },
        "Request already converted to Job Order"
      );
    }

    // 1. Resolve or verify customer profile
    const matchResult = await CustomerMatchingService.matchOrCreateCustomer(
      {
        name: request.customerName,
        mobile: request.customerPhone,
        phone: request.customerPhone,
        email: request.customerEmail,
        company: request.customerCompany,
        companyName: request.customerCompany,
        address: request.customerAddress,
        gstin: request.customerGstin,
        customerType: request.source === "QR_CODE" ? "QR" : "WALK_IN",
        customerSource: request.customerCompany ? "COMPANY" : "INDIVIDUAL",
      },
      { branchId: request.branchId, source: request.source }
    );
    const customer = matchResult.customer;

    // 2. Build Job Order payload
    const jobItems =
      Array.isArray(request.items) && request.items.length > 0
        ? request.items
        : [
            {
              itemName: request.title || "Print Job",
              description: request.customerRequirements || "",
              quantity: 1,
              unit: "PCS",
              paperSize: "",
              paperType: "",
              printingType: "",
              colorMode: "CMYK",
              sides: "SINGLE",
              finishing: [],
              customerRequirements: request.customerRequirements || "",
              remarks: request.remarks || "",
            },
          ];

    const jobPayload = {
      title: request.title || "Print Job Order",
      jobType: "PRINT_JOB",
      branchId: request.branchId,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.mobile,
      customerSnapshot: {
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email || "",
        company: customer.company || "",
        address: customer.address || "",
        gstin: customer.gstin || "",
      },
      dueDate: request.dueDate || null,
      customerRequirements: request.customerRequirements || "",
      remarks: request.remarks || "",
      notes: `Converted from Customer Enquiry ${request.requestNo} (${request.source})`,
      items: jobItems,
      draft: false,
    };

    const userActor = req.user || {
      _id: null,
      name: "Staff",
      role: "counter_staff",
      branchId: request.branchId,
    };

    const createdJob = await JobOrderService.create(jobPayload, userActor);

    // 3. Update customer request status
    request.status = "CONVERTED_TO_JOB";
    request.convertedJobOrderId = createdJob._id;
    request.customerId = customer._id;
    if (req.user) {
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
    }
    await request.save();

    return ResponseHelper.success(
      res,
      {
        request,
        jobOrder: createdJob,
      },
      "Customer enquiry successfully converted to Job Order",
      201
    );
  });
}

module.exports = CustomerRequestController;
