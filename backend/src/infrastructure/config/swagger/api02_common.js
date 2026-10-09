/**
 * API 02 - Common Services, Audit Logs, Approvals, Attachments & Number Sequences
 */

module.exports = {
  tags: [
    { name: "Approvals" },
    { name: "Attachments" },
    { name: "Audit Logs" },
    { name: "Number Sequences" },
  ],
  schemas: {
    AuditLogResponse: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        actor: {
          type: "object",
          properties: {
            userId: { $ref: "#/components/schemas/ObjectId" },
            username: { type: "string", example: "admin_user" },
            role: { type: "string", example: "admin" },
          },
        },
        action: { type: "string", example: "STATUS_CHANGE" },
        entityType: { type: "string", example: "JobOrder" },
        entityId: { $ref: "#/components/schemas/ObjectId" },
        before: { type: "object", description: "State snapshot prior to mutation" },
        after: { type: "object", description: "State snapshot following mutation" },
        timestamp: { $ref: "#/components/schemas/DateTimeString" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
      },
    },
    NumberSequenceResponse: {
      type: "object",
      properties: {
        sequenceType: { type: "string", example: "JOB_ORDER" },
        prefix: { type: "string", example: "JOB" },
        currentValue: { type: "integer", example: 1042 },
        formattedNumber: { type: "string", example: "JOB-202610-0042" },
      },
    },
  },
  paths: {
    "/approvals": {
      get: {
        tags: ["Approvals"],
        operationId: "getApprovals",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/approvals/{id}": {
      get: {
        tags: ["Approvals"],
        operationId: "getApprovalById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/approvals/{id}/approve": {
      post: {
        tags: ["Approvals"],
        operationId: "approveApproval",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/approvals/{id}/cancel": {
      post: {
        tags: ["Approvals"],
        operationId: "cancelApproval",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/approvals/{id}/reject": {
      post: {
        tags: ["Approvals"],
        operationId: "rejectApproval",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/approvals/counts": {
      get: {
        tags: ["Approvals"],
        operationId: "getApprovalCounts",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/attachments": {
      get: {
        tags: ["Attachments"],
        operationId: "getAttachments",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "" },
        },
      },
      post: {
        tags: ["Attachments"],
        operationId: "uploadAttachment",
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: "" },
        },
      },
    },
    "/attachments/{id}": {
      delete: {
        tags: ["Attachments"],
        operationId: "deleteAttachment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/attachments/{id}/url": {
      get: {
        tags: ["Attachments"],
        operationId: "getAttachmentUrl",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/audit-logs": {
      get: {
        tags: ["Audit Logs"],
        operationId: "getAuditLogs",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/audit-logs/{id}": {
      get: {
        tags: ["Audit Logs"],
        operationId: "getAuditLogById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/audit-logs/employee-activity/{employeeId}": {
      get: {
        tags: ["Audit Logs"],
        operationId: "getEmployeeActivityAuditLogs",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "employeeId", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/audit-logs/entity/{entityType}/{entityId}": {
      get: {
        tags: ["Audit Logs"],
        operationId: "getEntityAuditLogs",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "entityType", in: "path", required: true, schema: { type: "string" } },
          { name: "entityId", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/audit-logs/logins": {
      get: {
        tags: ["Audit Logs"],
        operationId: "getLoginAuditLogs",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/audit-logs/summary": {
      get: {
        tags: ["Audit Logs"],
        operationId: "getAuditSummary",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "" },
        },
      },
    },
    "/number-sequences": {
      get: {
        tags: ["Number Sequences"],
        operationId: "getNumberSequences",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "" },
        },
      },
    },
  },
};
