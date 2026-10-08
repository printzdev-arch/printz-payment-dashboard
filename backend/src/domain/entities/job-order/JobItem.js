class JobItem {
  constructor({
    id = null,
    jobOrderId,
    lineNo = 1,
    itemType = "PRINT",
    itemId = null,
    itemName,
    description = "",
    quantity = 1,
    unit = "PCS",
    unitPrice = 0,
    unitRate = 0,
    taxRate = 0,
    amount = 0,
    totalPrice = 0,
    needsProduction = true,
    paperType = "",
    paperSize = "",
    printingType = "",
    colorMode = "",
    sides = "SINGLE",
    finishing = [],
    materials = [],
    specification = "",
    estimatedCost = 0,
    estimatedPrice = 0,
    productionQty = 0,
    customerRequirements = "",
    remarks = "",
    approvedSample = null,
  }) {
    this.id = id;
    this.jobOrderId = jobOrderId;
    this.lineNo = lineNo;
    this.itemType = itemType;
    this.itemId = itemId;
    this.itemName = itemName || description || "Print Item";
    this.description = description || this.itemName;
    this.quantity = quantity;
    this.unit = unit;
    this.unitPrice = unitPrice || unitRate;
    this.unitRate = unitRate || unitPrice;
    this.taxRate = taxRate;
    this.amount = amount || totalPrice || (this.quantity * this.unitRate);
    this.totalPrice = this.amount;
    this.needsProduction = needsProduction;
    this.paperType = paperType;
    this.paperSize = paperSize;
    this.printingType = printingType;
    this.colorMode = colorMode;
    this.sides = sides;
    this.finishing = finishing;
    this.materials = materials;
    this.specification = specification;
    this.estimatedCost = estimatedCost;
    this.estimatedPrice = estimatedPrice;
    this.productionQty = productionQty || quantity;
    this.customerRequirements = customerRequirements;
    this.remarks = remarks;
    this.approvedSample = approvedSample;
  }
}

module.exports = JobItem;
