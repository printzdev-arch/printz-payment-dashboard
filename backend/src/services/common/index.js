/**
 * Services Module: common
 */
const approvalService = require("./approval.service");
const attachmentService = require("./attachment.service");
const auditLogService = require("./auditLog.service");
const numberSequenceService = require("./numberSequence.service");
const branchService = require("./branch.service");
const departmentService = require("./department.service");
const designationService = require("./designation.service");
const generalService = require("./general.service");
const jumboXeroxService = require("./jumboXerox.service");
const pastDateRequestService = require("./pastDateRequest.service");
const printerService = require("./printer.service");
const printerReadingService = require("./printerReading.service");
const reportService = require("./report.service");
const stockService = require("./stock.service");
const totalAmountService = require("./totalAmount.service");

module.exports = {
  approvalService,
  attachmentService,
  auditLogService,
  numberSequenceService,
  branchService,
  departmentService,
  designationService,
  generalService,
  jumboXeroxService,
  pastDateRequestService,
  printerService,
  printerReadingService,
  reportService,
  stockService,
  totalAmountService,
};
