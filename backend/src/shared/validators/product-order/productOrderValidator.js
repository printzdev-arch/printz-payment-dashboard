const ErrorHelper = require("../../errors/ErrorHelper");

const validateCreateOrder = (req, res, next) => {
  const { requestingBranchId, items } = req.body;
  if (!requestingBranchId) {
    return next(ErrorHelper.badRequest("requestingBranchId is required"));
  }
  if (!Array.isArray(items) || items.length === 0) {
    return next(ErrorHelper.badRequest("items array must contain at least one line item"));
  }
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it.itemId || !it.requestedQty || Number(it.requestedQty) <= 0) {
      return next(ErrorHelper.badRequest(`Item at index ${i} must have a valid itemId and positive requestedQty`));
    }
  }
  next();
};

const validateUpdateItems = (req, res, next) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return next(ErrorHelper.badRequest("items array must contain at least one line item"));
  }
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it.itemId || !it.requestedQty || Number(it.requestedQty) <= 0) {
      return next(ErrorHelper.badRequest(`Item at index ${i} must have a valid itemId and positive requestedQty`));
    }
  }
  next();
};

const validateReject = (req, res, next) => {
  const { comments, reason, remarks } = req.body;
  const text = comments || reason || remarks;
  if (!text || String(text).trim() === "") {
    return next(ErrorHelper.badRequest("Rejection reason/comments are required"));
  }
  next();
};

module.exports = {
  validateCreateOrder,
  validateUpdateItems,
  validateReject,
};
