const mongoose = require("mongoose");
const branchRepository = require("../../../infrastructure/database/mongoose/repositories/MongoBranchRepository");
const customerRepository = require("../../../infrastructure/database/mongoose/repositories/customer/MongooseCustomerRepository");
const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobOrderRepository");
const jobFileRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobFileRepository");
const JobOrderService = require("../job-order/jobOrder.service");
const Customer = require("../../../infrastructure/database/mongoose/models/customer/Customer");
const CustomerMatchingService = require("../customer/customerMatching.service");
const numberSequenceService = require("../common/numberSequence.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const { emitJobEvent } = require("../../../shared/events/job-order/jobEvents.emitter");

class PublicJobRequestService {
  /**
   * Validate and resolve branch by public code
   */
  static async resolveBranch(branchCode) {
    if (!branchCode || typeof branchCode !== "string") {
      throw ErrorHelper.badRequest("Branch code is required to identify the authorized branch.");
    }

    const cleanCode = branchCode.trim().toUpperCase();
    const branch = await branchRepository.findByCode(cleanCode);

    if (!branch) {
      throw ErrorHelper.notFound(`No authorized branch found with code '${cleanCode}'.`);
    }

    return branch;
  }

  /**
   * Normalize and match or create a customer record using centralized customer matching
   */
  static async resolveCustomer(customerData, branch) {
    const rawMobile = String(customerData.customerPhone || "").trim();
    if (!rawMobile) {
      throw ErrorHelper.badRequest("Customer mobile number is required.");
    }

    const rawName = String(customerData.customerName || "").trim();
    if (!rawName) {
      throw ErrorHelper.badRequest("Customer name is required.");
    }

    const matchResult = await CustomerMatchingService.matchOrCreateCustomer(
      {
        name: rawName,
        mobile: rawMobile,
        phone: rawMobile,
        email: customerData.customerEmail,
        company: customerData.customerCompany,
        companyName: customerData.customerCompany,
        address: customerData.customerAddress,
        gstin: customerData.customerGstin,
      },
      { branchId: branch._id }
    );

    return matchResult.customer;
  }

  /**
   * Process and create customer self-service job request
   */
  static async createJobRequest(dto, uploadedFiles = []) {
    // 1. Resolve and validate branch strictly via branch code
    const branch = await this.resolveBranch(dto.branchCode);

    // 2. Resolve or create customer safely
    const customer = await this.resolveCustomer(dto, branch);

    // 3. Check idempotency if key supplied
    if (dto.idempotencyKey) {
      const existingJob = await jobOrderRepository.findByIdempotencyKey(dto.idempotencyKey);
      if (existingJob) {
        return {
          isDuplicate: true,
          job: existingJob,
          jobNo: existingJob.jobNo,
          message: "A job order with this idempotency key has already been received.",
        };
      }
    }

    // 4. Construct Item with Printing Specs
    const lineItem = {
      itemName: dto.title || "Print Job Item",
      description: dto.customerRequirements || dto.title || "",
      quantity: dto.quantity || 1,
      unit: "PCS",
      paperSize: dto.paperSize || "",
      paperType: dto.paperType || "",
      printingType: dto.printingType || "",
      colorMode: dto.colorMode || "CMYK",
      sides: dto.sides || "SINGLE",
      finishing: dto.finishing || [],
      customerRequirements: dto.customerRequirements || "",
      remarks: dto.remarks || "",
      needsProduction: true,
    };

    // 5. Construct JobOrder Payload
    const jobPayload = {
      title: dto.title || "Print Job Request",
      jobType: dto.jobType || "PRINT_JOB",
      branchId: branch._id,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.mobile,
      customerSnapshot: {
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email || dto.customerEmail || "",
        company: customer.company || dto.customerCompany || "",
        address: customer.address || dto.customerAddress || "",
        gstin: customer.gstin || dto.customerGstin || "",
      },
      quantity: dto.quantity || 1,
      dueDate: dto.dueDate || null,
      customerRequirements: dto.customerRequirements || "",
      remarks: dto.remarks || "",
      notes: "Submitted via Customer QR Mobile Form",
      items: [lineItem],
      draft: true, // Ensures it starts in valid ENQUIRY stage & DRAFT status
      idempotencyKey: dto.idempotencyKey || null,
    };

    // Public customer actor context for internal logging
    const customerActor = {
      _id: customer._id,
      name: customer.name,
      role: "customer",
      branchId: branch._id,
      isPublic: true,
    };

    // 6. Create JobOrder via Module 06 service
    const createdJob = await JobOrderService.create(jobPayload, customerActor);

    // 7. Attach uploaded files or reference attachments if provided
    const attachmentsToSave = [...(dto.attachments || [])];

    if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
      for (const f of uploadedFiles) {
        attachmentsToSave.push({
          fileName: f.originalname || f.filename || "artwork",
          fileUrl: f.path || `/uploads/${f.filename}`,
          mimeType: f.mimetype || "application/octet-stream",
          fileSize: f.size || 0,
          fileCategory: "CUSTOMER_SAMPLE",
        });
      }
    }

    if (attachmentsToSave.length > 0) {
      for (let idx = 0; idx < attachmentsToSave.length; idx++) {
        const att = attachmentsToSave[idx];
        await jobFileRepository.create({
          jobOrderId: createdJob._id,
          fileCategory: att.fileCategory || "REFERENCE",
          fileName: att.fileName || `reference-file-${idx + 1}`,
          fileUrl: att.fileUrl || "",
          attachmentId: att.attachmentId || null,
          fileSize: att.fileSize || 0,
          mimeType: att.mimeType || "",
          versionNo: 1,
          uploadedAt: new Date(),
        });
      }
    }

    emitJobEvent("job.request.submitted", {
      jobId: String(createdJob._id),
      jobNo: createdJob.jobNo,
      branchId: String(branch._id),
      branchCode: branch.code,
      customerId: String(customer._id),
      isPublic: true,
    });

    return {
      isDuplicate: false,
      jobId: createdJob._id,
      jobNo: createdJob.jobNo,
      branchId: branch._id,
      customerId: customer._id,
      title: createdJob.title,
      stage: createdJob.currentStage || "ENQUIRY",
      status: createdJob.status || "DRAFT",
      quantity: createdJob.quantity,
      branch: {
        id: branch._id,
        code: branch.code,
        name: branch.name,
      },
      customer: {
        id: customer._id,
        name: customer.name,
        mobile: customer.mobile,
      },
      createdAt: createdJob.createdAt,
      message: `Your job request has been received under reference #${createdJob.jobNo}. Our team will review your specifications and generate an estimate.`,
    };
  }

  /**
   * Generate or retrieve branch QR public request configuration
   */
  static async getBranchQrConfig(branchId, authContext = {}) {
    if (!branchId || !mongoose.Types.ObjectId.isValid(String(branchId))) {
      throw ErrorHelper.badRequest(`Invalid branch ID: '${branchId}'`);
    }

    const branch = await branchRepository.findById(branchId);
    if (!branch) {
      throw ErrorHelper.notFound(`Branch with ID '${branchId}' not found`);
    }

    // RBAC: Check if user belongs to this branch or is admin/manager
    if (authContext.user && authContext.user.role !== "admin") {
      const userBranchId = String(authContext.user.branchId || "");
      if (userBranchId && userBranchId !== String(branch._id)) {
        throw ErrorHelper.forbidden("You are not authorized to view QR configuration for this branch.");
      }
    }

    const appUrl =
      process.env.APP_URL ||
      process.env.PUBLIC_APP_URL ||
      (process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",")[0] : "http://localhost:5173");

    const cleanBaseUrl = appUrl.replace(/\/+$/, "");
    const jobRequestUrl = `${cleanBaseUrl}/public/job-requests?branchCode=${encodeURIComponent(branch.code)}`;

    return {
      branchId: branch._id,
      branchCode: branch.code,
      branchName: branch.name,
      branchType: branch.branchType,
      publicJobRequestUrl: jobRequestUrl,
    };
  }
}

module.exports = PublicJobRequestService;
