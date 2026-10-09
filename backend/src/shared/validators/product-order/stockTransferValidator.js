const ErrorHelper = require("../../errors/ErrorHelper");

const validateDispatch = (req, res, next) => {
  const { items } = req.body;
  if (items && Array.isArray(items)) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.dispatchedQty !== undefined && Number(it.dispatchedQty) <= 0) {
        return next(ErrorHelper.badRequest(`Item at index ${i} dispatchedQty must be greater than zero`));
      }
    }
  }
  next();
};

const validateReceive = (req, res, next) => {
  const { items } = req.body;
  if (items && Array.isArray(items)) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.receivedQty !== undefined && Number(it.receivedQty) < 0) {
        return next(ErrorHelper.badRequest(`Item at index ${i} receivedQty cannot be negative`));
      }
    }
  }
  next();
};

module.exports = {
  validateDispatch,
  validateReceive,
};
