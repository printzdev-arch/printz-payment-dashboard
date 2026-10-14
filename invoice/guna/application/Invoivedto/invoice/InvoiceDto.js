class InvoiceDto {
  static toResponse(invoice) {
    if (!invoice) return null;
    const doc = invoice.toObject ? invoice.toObject() : invoice;

    return {
      id: doc._id || doc.id,
      invoiceNumber: doc.invoiceNumber,
      invoiceType: doc.invoiceType,
      status: doc.status,
      jobOrderId: doc.jobOrderId,
      jobNo: doc.jobNo,
      customerId: doc.customerId,
      customerSnapshot: doc.customerSnapshot,
      branchId: doc.branchId,
      branchSnapshot: doc.branchSnapshot,
      estimateId: doc.estimateId,
      deliveryOrderId: doc.deliveryOrderId,
      invoiceDate: doc.invoiceDate,
      dueDate: doc.dueDate,
      currency: doc.currency || "INR",
      items: (doc.items || []).map((it) => ({
        id: it._id || it.id,
        jobOrderItemId: it.jobOrderItemId,
        itemId: it.itemId,
        itemCode: it.itemCode,
        itemName: it.itemName,
        description: it.description,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountType: it.discountType,
        discountValue: it.discountValue,
        discountAmount: it.discountAmount,
        taxRate: it.taxRate,
        taxableAmount: it.taxableAmount,
        cgstAmount: it.cgstAmount,
        sgstAmount: it.sgstAmount,
        igstAmount: it.igstAmount,
        taxAmount: it.taxAmount,
        lineTotal: it.lineTotal,
      })),
      additionalCharges: doc.additionalCharges || [],
      subtotal: doc.subtotal,
      discountTotal: doc.discountTotal,
      additionalChargesTotal: doc.additionalChargesTotal,
      taxableAmount: doc.taxableAmount,
      cgstTotal: doc.cgstTotal,
      sgstTotal: doc.sgstTotal,
      igstTotal: doc.igstTotal,
      taxTotal: doc.taxTotal,
      grandTotal: doc.grandTotal,
      advanceApplied: doc.advanceApplied,
      paidAmount: doc.paidAmount,
      creditAdjustedAmount: doc.creditAdjustedAmount,
      balanceDue: doc.balanceDue,
      estimateAmountSnapshot: doc.estimateAmountSnapshot,
      varianceAmount: doc.varianceAmount,
      variancePercentage: doc.variancePercentage,
      approvalRequired: doc.approvalRequired,
      approvalId: doc.approvalId,
      approvedBy: doc.approvedBy,
      approvedAt: doc.approvedAt,
      approvalRemarks: doc.approvalRemarks,
      createdBy: doc.createdBy,
      finalizedBy: doc.finalizedBy,
      finalizedAt: doc.finalizedAt,
      remarks: doc.remarks,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toListResponse(paginatedResult) {
    return {
      items: (paginatedResult.items || []).map((i) => this.toResponse(i)),
      total: paginatedResult.total,
      page: paginatedResult.page,
      limit: paginatedResult.limit,
      totalPages: paginatedResult.totalPages,
    };
  }
}

module.exports = InvoiceDto;
