const ErrorHelper = require("../../shared/errors/ErrorHelper");

class CreateSaleDto {
  constructor({
    branchID,
    branchName,
    managerID,
    invoiceNo,
    date,
    itemsSold,
    subtotal,
    gst,
    grandTotal,
    totalAmount,
    paymentStatus = "Paid",
  } = {}) {
    this.branchID = typeof branchID === "string" ? branchID.trim() : "";
    this.branchName =
      typeof branchName === "string"
        ? branchName.trim()
        : this.branchID || "";
    this.managerID = managerID;
    this.invoiceNo =
      typeof invoiceNo === "string" ? invoiceNo.trim().toUpperCase() : "";
    this.date =
      typeof date === "string"
        ? date.trim()
        : new Date().toISOString().split("T")[0];
    this.itemsSold = Array.isArray(itemsSold) ? itemsSold : [];
    this.paymentStatus = paymentStatus || "Paid";

    // Recalculate and normalize monetary values securely on backend
    let calculatedSubtotal = 0;
    this.itemsSold = this.itemsSold.map((item) => {
      const itemID = item.itemID
        ? String(item.itemID).trim()
        : item.id
        ? String(item.id).trim()
        : "";
      const name = item.name ? String(item.name).trim() : "";
      const quantity = Number(item.quantity);
      const unitPrice = Number(
        item.unitPrice !== undefined ? item.unitPrice : item.price
      );
      const lineTotal =
        !isNaN(quantity) && !isNaN(unitPrice)
          ? Number((quantity * unitPrice).toFixed(2))
          : 0;
      calculatedSubtotal += lineTotal;

      return {
        itemID,
        name,
        quantity,
        unitPrice: !isNaN(unitPrice) ? Number(unitPrice.toFixed(2)) : NaN,
        totalAmount: lineTotal,
      };
    });

    this.subtotal = Number(calculatedSubtotal.toFixed(2));
    this.gst = Number((this.subtotal * 0.18).toFixed(2));
    this.grandTotal = Number((this.subtotal + this.gst).toFixed(2));
    this.totalAmount = this.grandTotal;
  }

  static fromRequest(req) {
    const body = req.body || {};
    const managerID = body.managerID || req.user?.id || req.user?._id;
    return new CreateSaleDto({ ...body, managerID });
  }

  validate() {
    if (!this.branchID && !this.branchName) {
      throw ErrorHelper.badRequest("Branch is required.");
    }
    if (!this.managerID) {
      throw ErrorHelper.badRequest("Manager ID is required.");
    }
    if (!this.invoiceNo) {
      throw ErrorHelper.badRequest("Invoice number is required.");
    }
    if (!this.date || !/^\d{4}-\d{2}-\d{2}$/.test(this.date)) {
      throw ErrorHelper.badRequest(
        "Date is required and must be in YYYY-MM-DD format."
      );
    }
    if (!Array.isArray(this.itemsSold) || this.itemsSold.length === 0) {
      throw ErrorHelper.badRequest("Sale must contain at least one item.");
    }
    for (const item of this.itemsSold) {
      if (!item.name) {
        throw ErrorHelper.badRequest("Item name is required for all items.");
      }
      if (isNaN(item.quantity) || item.quantity < 1) {
        throw ErrorHelper.badRequest(`Invalid quantity for item: ${item.name}`);
      }
      if (isNaN(item.unitPrice) || item.unitPrice < 0) {
        throw ErrorHelper.badRequest(`Invalid price for item: ${item.name}`);
      }
    }
  }
}

class SaleResponseDto {
  static serialize(sale) {
    if (!sale) return null;
    const doc = sale.toJSON ? sale.toJSON() : sale;
    const id = doc.id || (doc._id ? doc._id.toString() : "");
    const createdAt = doc.createdAt || new Date();

    return {
      id,
      _id: doc._id || id,
      branchID: doc.branchID,
      branchName: doc.branchName,
      managerID: doc.managerID,
      invoiceNo: doc.invoiceNo,
      date: doc.date,
      itemsSold: (doc.itemsSold || []).map((item) => ({
        itemID: item.itemID,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: item.totalAmount,
      })),
      subtotal: doc.subtotal,
      gst: doc.gst,
      grandTotal: doc.grandTotal,
      totalAmount: doc.totalAmount,
      paymentStatus: doc.paymentStatus || "Paid",
      createdAt: createdAt,
      updatedAt: doc.updatedAt || createdAt,
      timestamp: createdAt,
    };
  }

  static serializeList(sales = []) {
    return sales.map((s) => SaleResponseDto.serialize(s));
  }
}

module.exports = {
  CreateSaleDto,
  SaleResponseDto,
};
