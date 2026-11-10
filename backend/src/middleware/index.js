const { authenticate, optionalAuthenticate } = require("./security/auth.middleware");
const { authorizeRoles } = require("./security/role.middleware");
const { requirePermission, authorizePermission } = require("./security/permission.middleware");
const { validate, validateRequest } = require("./request/validation.middleware");
const { upload, uploadSingle, uploadMultiple, optionalUpload } = require("./request/upload.middleware");
const errorHandler = require("./errors/error.middleware");
const notFound = require("./errors/notFound.middleware");

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
