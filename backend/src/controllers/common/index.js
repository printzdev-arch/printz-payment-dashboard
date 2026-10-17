/**
 * Controllers Module: common
 */
const approvalController = require("./approval.controller");
const attachmentController = require("./attachment.controller");
const auditLogController = require("./auditLog.controller");
const numberSequenceController = require("./numberSequence.controller");
const branchController = require("./branch.controller");
const departmentController = require("./department.controller");
const designationController = require("./designation.controller");
const generalController = require("./general.controller");
const jumboXeroxController = require("./jumboXerox.controller");
const pastDateRequestController = require("./pastDateRequest.controller");
const printerController = require("./printer.controller");
const printerReadingController = require("./printerReading.controller");
const reportController = require("./report.controller");
const stockController = require("./stock.controller");
const totalAmountController = require("./totalAmount.controller");

module.exports = {
  approvalController,
  attachmentController,
  auditLogController,
  numberSequenceController,
  branchController,
  departmentController,
  designationController,
  generalController,
  jumboXeroxController,
  pastDateRequestController,
  printerController,
  printerReadingController,
  reportController,
  stockController,
  totalAmountController,
};
