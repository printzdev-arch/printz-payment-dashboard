/**
 * API 02 - Common Services, Audit Logs, Approvals, Attachments & Number Sequences Swagger
 */

module.exports = {
  tags: [
    { name: "Approvals" },
    { name: "Attachments" },
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
    ApprovalDecisionRequest: {
      type: "object",
      properties: {
        reason: { type: "string", example: "Discount authorized for bulk VIP customer" },
        comments: { type: "string", example: "Approved" },
      },
    },
    AttachmentUploadRequest: {
      type: "object",
      required: ["entityType", "entityId"],
      properties: {
        entityType: { type: "string", example: "JobOrder" },
        entityId: { $ref: "#/components/schemas/ObjectId" },
        file: { type: "string", format: "binary", description: "Binary file payload" },
        fileName: { type: "string", example: "artwork.pdf" },
      },
    },
  },
  paths: {
    "/approvals": {
      get: {
        tags: ["Approvals"],
        summary: "List Approvals",
        operationId: "listApprovals",
        description: "Retrieves pending and resolved discount/credit limit approval requests.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: {
            description: "Approvals list",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/approvals/counts": {
      get: {
        tags: ["Approvals"],
        summary: "Get Approval Counts",
        operationId: "getApprovalCounts",
        description: "Retrieves aggregate counts of approvals by status.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Approval counts",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/approvals/{id}": {
      get: {
        tags: ["Approvals"],
        summary: "Get Approval by ID",
        operationId: "getApprovalById",
        description: "Retrieves approval request details by ObjectId.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Approval retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/approvals/{id}/approve": {
      post: {
        tags: ["Approvals"],
        summary: "Approve Request",
        operationId: "approveApprovalRequest",
        description: "Approves a pending authorization request.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApprovalDecisionRequest" } } },
        },
        responses: {
          200: {
            description: "Approval granted",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/approvals/{id}/cancel": {
      post: {
        tags: ["Approvals"],
        summary: "Cancel Request",
        operationId: "cancelApprovalRequest",
        description: "Cancels an open approval request.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApprovalDecisionRequest" } } },
        },
        responses: {
          200: {
            description: "Approval cancelled",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/approvals/{id}/reject": {
      post: {
        tags: ["Approvals"],
        summary: "Reject Request",
        operationId: "rejectApprovalRequest",
        description: "Rejects a pending authorization request.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApprovalDecisionRequest" } } },
        },
        responses: {
          200: {
            description: "Approval rejected",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/attachments": {
      get: {
        tags: ["Attachments"],
        summary: "List Attachments",
        operationId: "listAttachments",
        description: "Lists attachments associated with business entities.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "entityType", in: "query", schema: { type: "string" } },
          { name: "entityId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: {
            description: "Attachments list",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["Attachments"],
        summary: "Upload Attachment",
        operationId: "uploadAttachment",
        description: "Uploads a file (form field `file`) and links it to a business record with `entityType` and `entityId`.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary" },
                  entityType: { type: "string", example: "JobOrder" },
                  entityId: { $ref: "#/components/schemas/ObjectId" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Attachment uploaded",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/attachments/{id}": {
      delete: {
        tags: ["Attachments"],
        summary: "Delete Attachment",
        operationId: "deleteAttachment",
        description: "Deletes an attachment document.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Attachment deleted",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/attachments/{id}/url": {
      get: {
        tags: ["Attachments"],
        summary: "Get Attachment URL",
        operationId: "getAttachmentUrl",
        description: "Generates secure access or pre-signed URL for an attachment.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Attachment URL retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/number-sequences": {
      get: {
        tags: ["Number Sequences"],
        summary: "List Number Sequences",
        operationId: "listNumberSequences",
        description: "Returns active sequential number counters across branches.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Number sequences",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
  },
};
