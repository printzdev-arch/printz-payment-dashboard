const jobOrderRepository = require("../models/JobOrder");
const jobItemRepository = require("../models/JobItem");
const Sale = require("../../pos/models/Sale");
const Branch = require("../../branches/models/Branch");
const JobWorkflowService = require("./jobWorkflow.service");
const ProductionStateService = require("../../production/services/productionState.service");
const { emitJobEvent } = require("./jobEvents.emitter");
const ErrorHelper = require("../../../utils/errors/ApiError");
const { getTodayDateString } = require("../../../utils/helpers/dateUtils");

class JobInvoiceService {
  /**
   * Generate final invoice / sale receipt for a completed Job Order.
   */
  static async invoice(jobId, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    const isEligibleForInvoice =
      job.estimationStatus === "APPROVED" ||
      ["READY", "DELIVERED", "COMPLETED", "SETTLED", "APPROVED", "DESIGN", "PRODUCTION", "PACKING", "QC"].includes(job.status) ||
      ["ESTIMATE_APPROVAL", "DESIGN_QUEUE", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "PRODUCTION_PLANNING", "PRINTING", "FINISHING", "PACKING", "QC", "READY", "DELIVERY", "COMPLETED"].includes(job.currentStage);

    if (!isEligibleForInvoice) {
      throw ErrorHelper.conflict(`Invoice can only be generated after estimate approval. Current: stage '${job.currentStage}', status '${job.status}'`);
    }

    // Check if an invoice already exists for this job
    const existingSale = await Sale.findOne({
      $or: [{ jobOrderId: job._id }, { notes: new RegExp(job.jobNo, "i") }],
    });

    if (existingSale) {
      return existingSale;
    }

    const items = await jobItemRepository.findByJobOrderId(job._id);
    const branch = await Branch.findById(job.branchId);

    const invoiceNo = `INV-${Date.now().toString().slice(-8)}`;

    const saleItems = items.map((it) => ({
      itemID: it.itemId ? String(it.itemId) : String(it._id),
      name: it.itemName || it.description || "Print Service",
      quantity: it.quantity || 1,
      unitPrice: it.unitRate || it.unitPrice || 0,
      totalAmount: it.amount || it.totalPrice || 0,
    }));

    const todayStr = getTodayDateString();
    const subtotal = job.subtotal || totalAmount;
    const gst = job.taxAmount || 0;
    const grandTotal = job.grandTotal || totalAmount;

    const sale = await Sale.create({
      branchID: branch ? String(branch.code || branch._id) : String(job.branchId),
      branchName: branch ? branch.name : "Main Branch",
      managerID: user._id,
      jobOrderId: job._id,
      invoiceNo,
      date: todayStr,
      itemsSold: saleItems.length > 0 ? saleItems : [
        {
          itemID: String(job._id),
          name: job.title || "Print Service",
          quantity: 1,
          unitPrice: grandTotal,
          totalAmount: grandTotal,
        }
      ],
      subtotal,
      gst,
      grandTotal,
      totalAmount: grandTotal,
      paymentStatus: "Paid",
    });

    job.paymentStatus = "PAID";
    job.invoiceNo = invoiceNo;
    job.invoiceId = sale._id;
    await job.save();

    await JobWorkflowService.recordEvent(job, "INVOICE", {
      actorId: user._id,
      notes: `Invoice ${invoiceNo} generated.`,
    });

    await ProductionStateService.logAudit({
      action: "INVOICE_CREATE",
      resource: "JobOrder",
      resourceId: job._id,
      user,
      branchId: job.branchId,
      details: { invoiceNo, saleId: sale._id, totalAmount: grandTotal },
    });

    emitJobEvent("job.invoiced", { jobId: String(job._id), invoiceNo, saleId: String(sale._id) });

    return {
      sale,
      job,
    };
  }

  /**
   * Get invoice for a Job Order.
   */
  static async getInvoice(jobId, user = null) {
    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    const sale = await Sale.findOne({
      $or: [{ jobOrderId: job._id }, { notes: new RegExp(job.jobNo, "i") }],
    });

    if (!sale) {
      throw ErrorHelper.notFound("No invoice found for this Job Order.");
    }

    return sale;
  }
}

module.exports = JobInvoiceService;
