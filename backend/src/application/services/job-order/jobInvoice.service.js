const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobOrderRepository");
const jobItemRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobItemRepository");
const Sale = require("../../../infrastructure/database/mongoose/models/Sale");
const Branch = require("../../../infrastructure/database/mongoose/models/Branch");
const JobWorkflowService = require("./jobWorkflow.service");
const ProductionStateService = require("../production/productionState.service");
const { emitJobEvent } = require("../../../shared/events/job-order/jobEvents.emitter");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class JobInvoiceService {
  /**
   * Generate final invoice / sale receipt for a completed Job Order.
   */
  static async invoice(jobId, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    if (!["READY", "DELIVERED"].includes(job.status)) {
      throw ErrorHelper.conflict(`Invoice can only be generated when Job is 'READY' or 'DELIVERED'. Current: '${job.status}'`);
    }

    // Check if an invoice already exists for this job
    const existingSale = await Sale.findOne({
      $or: [{ jobOrderId: job._id }, { notes: new RegExp(job.jobNo, "i") }],
    });

    if (existingSale) {
      throw ErrorHelper.conflict("An invoice already exists for this Job Order.");
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

    const todayStr = new Date().toISOString().slice(0, 10);
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
