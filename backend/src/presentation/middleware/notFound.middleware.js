const ErrorHelper = require("../../shared/errors/ErrorHelper");

const notFound = (req, res, next) => {
  next(ErrorHelper.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFound;
