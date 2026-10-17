/**
 * Job Estimate DTOs (Module 06)
 */

class EstimateItemDto {
  constructor(data = {}) {
    this.lineNo = Number(data.lineNo);
    this.unitRate = Number(data.unitRate) || 0;
    this.taxRate = data.taxRate !== undefined ? Number(data.taxRate) : undefined;
  }
}

class EstimateDto {
  constructor(data = {}) {
    this.items = Array.isArray(data.items) ? data.items.map((i) => new EstimateItemDto(i)) : [];
    this.discountAmount = data.discountAmount !== undefined ? Number(data.discountAmount) : undefined;
  }
}

class ApproveEstimateDto {
  constructor(data = {}) {
    this.comments = data.comments || "";
    this.skipDesign = Boolean(data.skipDesign);
  }
}

class RejectEstimateDto {
  constructor(data = {}) {
    this.rejectionReason = data.rejectionReason || data.reason || "Estimate rejected";
    this.cancel = Boolean(data.cancel);
  }
}

module.exports = {
  EstimateItemDto,
  EstimateDto,
  ApproveEstimateDto,
  RejectEstimateDto,
};
