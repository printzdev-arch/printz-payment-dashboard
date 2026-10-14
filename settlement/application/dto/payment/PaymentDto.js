class PaymentDto {
  static toResponse(payment) {
    if (!payment) return null;
    const doc = payment.toObject ? payment.toObject() : payment;
    return {
      id: doc._id,
      paymentNo: doc.paymentNo,
      invoiceId: doc.invoiceId?._id || doc.invoiceId,
      invoiceNumber: doc.invoiceId?.invoiceNumber || doc.invoiceNumber || null,
      jobOrderId: doc.jobOrderId?._id || doc.jobOrderId,
      customerId: doc.customerId?._id || doc.customerId,
      branchId: doc.branchId?._id || doc.branchId,
      branchName: doc.branchId?.name || null,
      amount: doc.amount,
      paymentMode: doc.paymentMode,
      paymentReference: doc.paymentReference,
      paymentDate: doc.paymentDate,
      status: doc.status,
      collectedBy: doc.collectedBy?._id || doc.collectedBy,
      collectorName: doc.collectedBy?.name || null,
      remarks: doc.remarks,
      idempotencyKey: doc.idempotencyKey,
      voidReason: doc.voidReason || null,
      voidedBy: doc.voidedBy?._id || doc.voidedBy || null,
      voidedAt: doc.voidedAt || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toResponseList(payments) {
    return (payments || []).map(PaymentDto.toResponse);
  }
}

module.exports = PaymentDto;
