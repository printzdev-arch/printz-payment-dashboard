/**
 * Delivery Order Data Transfer Objects
 * Maps all properties between Mongoose DeliveryOrder documents and Frontend UI contracts
 */

class DeliveryOrderDto {
  static toResponse(order) {
    if (!order) return null;
    const doc = typeof order.toObject === "function" ? order.toObject() : order;
    const rawId = doc._id || doc.id;
    const idStr = rawId ? (rawId.toString ? rawId.toString() : String(rawId)) : null;

    const jObj = doc.jobOrderId && typeof doc.jobOrderId === "object" ? doc.jobOrderId : null;
    const jobOrderIdStr = jObj
      ? (jObj._id ? jObj._id.toString() : String(jObj.id || ""))
      : (doc.jobOrderId ? doc.jobOrderId.toString() : null);

    const bObj = doc.branchId && typeof doc.branchId === "object" ? doc.branchId : null;
    const branchIdStr = bObj
      ? (bObj._id ? bObj._id.toString() : String(bObj.id || ""))
      : (doc.branchId ? doc.branchId.toString() : null);

    const pObj = doc.proofId && typeof doc.proofId === "object" ? doc.proofId : null;
    const proofIdStr = pObj
      ? (pObj._id ? pObj._id.toString() : String(pObj.id || ""))
      : (doc.proofId ? doc.proofId.toString() : null);

    const isOtpVerified = Boolean(doc.isOtpVerified || doc.otpVerified);
    const proofSubmitted = Boolean(doc.proofId || doc.signatureUrl || doc.proofSubmitted);

    return {
      _id: idStr,
      id: idStr,
      deliveryNo: doc.deliveryNo || "",
      jobOrderId: jObj || jobOrderIdStr,
      jobNo: jObj?.jobNo || doc.jobNo || "",
      branchId: bObj || branchIdStr,
      branchName: bObj?.name || doc.branchName || "",
      customerId: doc.customerId || (jObj?.customerId ? String(jObj.customerId) : null),
      customerName: doc.customerName || jObj?.customerName || "Customer",
      customerPhone: doc.customerPhone || jObj?.customerPhone || "",
      deliveryAddress: doc.deliveryAddress || jObj?.customerSnapshot?.address || "Counter Pickup",
      deliveryType: doc.deliveryType || "DELIVERY",
      quantity: typeof doc.quantity === "number" ? doc.quantity : (jObj?.quantity || 0),
      items: (doc.items || []).map((it) => ({
        itemId: it.itemId || it._id || null,
        jobItemId: it.jobItemId || it.itemId || it._id || null,
        name: it.itemName || it.name || "",
        itemName: it.itemName || it.name || "",
        description: it.description || "",
        quantity: typeof it.quantity === "number" ? it.quantity : 0,
        unit: it.unit || "pcs",
      })),
      status: doc.status || "READY",

      // Driver / Courier assignment
      deliveryPersonName: doc.deliveryPersonName || doc.driverName || "",
      driverName: doc.deliveryPersonName || doc.driverName || "",
      deliveryPersonPhone: doc.deliveryPersonPhone || doc.driverPhone || "",
      driverPhone: doc.deliveryPersonPhone || doc.driverPhone || "",
      assignedEmployeeId: doc.assignedEmployeeId || null,
      vehicle: doc.vehicle || doc.vehicleNumber || "",
      vehicleNumber: doc.vehicleNumber || doc.vehicle || "",
      expectedDeliveryDate: doc.expectedDeliveryDate || null,
      deliveryTime: doc.deliveryTime || "",
      instructions: doc.instructions || "",

      // Packing & Dispatch
      packedAt: doc.packedAt || null,
      packedBy: doc.packedBy || null,
      packingNotes: doc.packingNotes || "",
      itemsVerified: Boolean(doc.itemsVerified),
      dispatchedAt: doc.dispatchedAt || null,
      dispatchedBy: doc.dispatchedBy || null,
      dispatchNotes: doc.dispatchNotes || "",

      // Proof & OTP
      pickupOtp: doc.pickupOtp || null,
      isOtpVerified,
      otpVerified: isOtpVerified,
      proofId: pObj || proofIdStr,
      proofSubmitted,
      signatureUrl: doc.signatureUrl || null,
      receivedBy: doc.receivedBy || doc.recipientName || "",
      recipientName: doc.recipientName || doc.receivedBy || "",
      recipientPhone: doc.recipientPhone || "",
      deliveredAt: doc.deliveredAt || null,
      deliveredBy: doc.deliveredBy || null,
      remarks: doc.remarks || "",

      createdAt: doc.createdAt || null,
      updatedAt: doc.updatedAt || null,
    };
  }

  static toResponseList(orders = []) {
    if (!Array.isArray(orders)) return [];
    return orders.map(DeliveryOrderDto.toResponse);
  }
}

module.exports = DeliveryOrderDto;
