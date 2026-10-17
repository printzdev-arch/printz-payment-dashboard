const mongoose = require("mongoose");
const Estimate = require("../../models/estimate/Estimate");
const JobOrder = require("../../models/job-order/JobOrder");
const Customer = require("../../models/customer/Customer");
const ErrorHelper = require("../../utils/ApiError");
const { getDatePrefix } = require("../../utils/dateUtils");

class EstimateService {
  /**
   * Create a new commercial estimate
   */
  static async createEstimate(payload = {}, user = null) {
    let jobOrderId = payload.jobId || payload.jobOrderId;
    let job = null;

    if (jobOrderId) {
      if (mongoose.Types.ObjectId.isValid(String(jobOrderId))) {
        job = await JobOrder.findById(jobOrderId);
      }
      if (!job && payload.jobNo) {
        job = await JobOrder.findOne({ jobNo: payload.jobNo });
      }
    } else if (payload.jobNo) {
      job = await JobOrder.findOne({ jobNo: payload.jobNo });
    }

    if (job) {
      jobOrderId = job._id;
    }

    let customerId = payload.customerId || job?.customerId;
    if (customerId && !mongoose.Types.ObjectId.isValid(String(customerId))) {
      const custDoc = await Customer.findOne({
        $or: [
          { customerCode: String(customerId) },
          { mobile: payload.customerMobile || job?.customerPhone },
        ],
      });
      if (custDoc) customerId = custDoc._id;
      else customerId = null;
    }

    if (!customerId && job?.customerId) {
      customerId = job.customerId;
    }

    const branchId = payload.branchId || job?.branchId || user?.branchId;
    if (!branchId) {
      throw ErrorHelper.badRequest("Branch ID is required for estimate.");
    }

    // Customer snapshot
    const customerSnapshot = {
      name: payload.customerName || job?.customerName || "Customer",
      mobile: payload.customerMobile || job?.customerPhone || "",
      email: payload.customerEmail || "",
      company: payload.customerCompany || "",
      address: payload.customerAddress || "",
      gstin: payload.customerGstin || "",
    };

    // Calculate totals from items & lines if provided
    let calculatedSubtotal = 0;
    const formattedItems = (payload.items || []).map((it, idx) => {
      let itemSubtotal = 0;
      const lines = Array.isArray(it.lines) ? it.lines : [];

      if (lines.length > 0) {
        lines.forEach((l) => {
          const qty = Number(l.quantity) || 1;
          const rate = Number(l.rate || l.unitRate || l.unitPrice) || 0;
          itemSubtotal += qty * rate;
        });
      } else {
        const qty = Number(it.quantity) || 1;
        const rate = Number(it.rate || it.unitRate || it.unitPrice) || 0;
        itemSubtotal = qty * rate;
      }

      calculatedSubtotal += itemSubtotal;

      return {
        lineNo: idx + 1,
        jobItemId: it.jobItemId || it.id || null,
        itemName: it.itemName || "Item",
        description: it.description || "",
        quantity: Number(it.quantity) || 1,
        unit: it.unit || "PCS",
        unitRate: Number(it.rate || it.unitRate || it.unitPrice) || (lines[0]?.rate || 0),
        taxRate: Number(payload.tax?.rate || it.taxRate || 0),
        amount: itemSubtotal,
        totalPrice: itemSubtotal,
        lines,
      };
    });

    const subtotal = payload.subtotal !== undefined ? Number(payload.subtotal) : calculatedSubtotal;
    
    // Calculate discount
    let discountAmount = 0;
    let discountPercentage = 0;
    if (payload.discount) {
      if (typeof payload.discount === "number") {
        discountAmount = payload.discount;
      } else if (payload.discount.type === "PERCENTAGE") {
        discountPercentage = Number(payload.discount.value) || 0;
        discountAmount = (subtotal * discountPercentage) / 100;
      } else if (payload.discount.type === "FIXED" || payload.discount.type === "AMOUNT") {
        discountAmount = Number(payload.discount.value) || 0;
      }
    } else if (payload.discountAmount) {
      discountAmount = Number(payload.discountAmount);
    }

    const taxableAmount = Math.max(0, subtotal - discountAmount);

    // Calculate tax
    let taxRate = 0;
    if (payload.tax) {
      taxRate = Number(payload.tax.rate || payload.tax.taxRate || 0);
    } else if (payload.taxRate) {
      taxRate = Number(payload.taxRate);
    }
    const taxAmount = payload.taxAmount !== undefined ? Number(payload.taxAmount) : (taxableAmount * taxRate) / 100;

    const grandTotal = payload.grandTotal !== undefined ? Number(payload.grandTotal) : taxableAmount + taxAmount;

    // Generate estimate number: EST-YYYYMMDD-XXXX
    const datePrefix = getDatePrefix();
    const countEstimates = await Estimate.countDocuments();
    const estimateNo = `EST-${datePrefix}-${String(countEstimates + 1).padStart(4, "0")}`;

    const versionNo = Number(payload.versionNumber) || (payload.version ? parseInt(String(payload.version).replace(/\D/g, "")) : 1) || 1;

    const estimate = await Estimate.create({
      estimateNo,
      jobOrderId: jobOrderId && mongoose.Types.ObjectId.isValid(String(jobOrderId)) ? jobOrderId : null,
      branchId: mongoose.Types.ObjectId.isValid(String(branchId)) ? branchId : user?.branchId,
      customerId: customerId && mongoose.Types.ObjectId.isValid(String(customerId)) ? customerId : null,
      customerSnapshot,
      title: payload.title || (job ? `Quotation for ${job.title}` : "Commercial Quotation"),
      versionNo,
      status: payload.status || "SENT",
      items: formattedItems,
      subtotal,
      discountAmount,
      discountPercentage,
      taxAmount,
      grandTotal,
      validUntil: payload.validUntil ? new Date(payload.validUntil) : null,
      termsAndConditions: payload.termsAndConditions || "",
      revisionNotes: payload.customerNotes || payload.revisionNotes || "",
      createdBy: user?._id || null,
    });

    // If linked to job order, update job's estimatedPrice & grandTotal
    if (job) {
      job.estimatedPrice = grandTotal;
      job.grandTotal = grandTotal;
      await job.save();
    }

    const estObj = estimate.toObject ? estimate.toObject() : { ...estimate };
    return {
      ...estObj,
      id: estimate._id,
      jobNo: payload.jobNo || job?.jobNo || null,
      jobId: jobOrderId,
    };
  }

  /**
   * List estimates
   */
  static async listEstimates(query = {}, user = null) {
    const filter = {};
    if (query.branchId) filter.branchId = query.branchId;
    if (query.status) filter.status = query.status;
    if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;
    if (query.customerId) filter.customerId = query.customerId;

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Estimate.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Estimate.countDocuments(filter),
    ]);

    const enriched = items.map((e) => ({
      ...e,
      id: e._id,
    }));

    return { items: enriched, estimates: enriched, total, page, limit };
  }

  /**
   * Get single estimate by ID or estimateNo
   */
  static async getEstimateById(id) {
    let estimate = null;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      estimate = await Estimate.findById(id).lean();
    }
    if (!estimate) {
      estimate = await Estimate.findOne({ estimateNo: String(id).toUpperCase() }).lean();
    }
    if (!estimate) {
      throw ErrorHelper.notFound(`Estimate not found with identifier: ${id}`);
    }

    return {
      ...estimate,
      id: estimate._id,
    };
  }

  /**
   * Update estimate
   */
  static async updateEstimate(id, payload = {}, user = null) {
    const estimate = await Estimate.findById(id);
    if (!estimate) {
      throw ErrorHelper.notFound(`Estimate not found with ID: ${id}`);
    }

    const allowed = [
      "status",
      "validUntil",
      "revisionNotes",
      "termsAndConditions",
      "discountAmount",
      "discountPercentage",
      "taxAmount",
      "grandTotal",
      "approvedAt",
      "rejectedAt",
    ];

    allowed.forEach((f) => {
      if (payload[f] !== undefined) {
        estimate[f] = payload[f];
      }
    });

    estimate.updatedBy = user?._id || null;
    await estimate.save();

    const estObj = estimate.toObject ? estimate.toObject() : { ...estimate };
    return {
      ...estObj,
      id: estimate._id,
    };
  }
}

module.exports = EstimateService;
