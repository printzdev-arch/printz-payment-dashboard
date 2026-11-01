const { authenticate, optionalAuthenticate } = require("./auth.middleware");
const { authorizeRoles } = require("./role.middleware");
const { requirePermission, authorizePermission } = require("./permission.middleware");
const { validate, validateRequest } = require("./validation.middleware");
const { upload, uploadSingle, uploadMultiple, optionalUpload } = require("./upload.middleware");
const errorHandler = require("./error.middleware");
const notFound = require("./notFound.middleware");

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorizeRoles,
  requirePermission,
  authorizePermission,
  validate,
  validateRequest,
  upload,
  uploadSingle,
  uploadMultiple,
  optionalUpload,
  errorHandler,
  notFound,
};
