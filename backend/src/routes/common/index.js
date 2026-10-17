/**
 * Routes Module: common
 */
const approvalRoutes = require("./approval.routes");
const attachmentRoutes = require("./attachment.routes");
const auditLogRoutes = require("./auditLog.routes");
const numberSequenceRoutes = require("./numberSequence.routes");
const branchRoutes = require("./branch.routes");
const departmentRoutes = require("./department.routes");
const designationRoutes = require("./designation.routes");
const generalRoutes = require("./general.routes");
const jumboXeroxRoutes = require("./jumboXerox.routes");
const pastDateRequestRoutes = require("./pastDateRequest.routes");
const printerRoutes = require("./printer.routes");
const printerReadingRoutes = require("./printerReading.routes");
const reportRoutes = require("./report.routes");
const stockRoutes = require("./stock.routes");
const totalAmountRoutes = require("./totalAmount.routes");

module.exports = {
  approvalRoutes,
  attachmentRoutes,
  auditLogRoutes,
  numberSequenceRoutes,
  branchRoutes,
  departmentRoutes,
  designationRoutes,
  generalRoutes,
  jumboXeroxRoutes,
  pastDateRequestRoutes,
  printerRoutes,
  printerReadingRoutes,
  reportRoutes,
  stockRoutes,
  totalAmountRoutes,
};
