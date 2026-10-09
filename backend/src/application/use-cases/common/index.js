const { CreateAuditLog, GetAuditLogs } = require("./AuditLogUseCases");
const CreateApproval = require("./CreateApproval");
const ApproveRequest = require("./ApproveRequest");
const RejectRequest = require("./RejectRequest");
const UploadAttachment = require("./UploadAttachment");
const GenerateSequenceNumber = require("./GenerateSequenceNumber");

module.exports = {
  CreateAuditLog,
  GetAuditLogs,
  CreateApproval,
  ApproveRequest,
  RejectRequest,
  UploadAttachment,
  GenerateSequenceNumber,
};
