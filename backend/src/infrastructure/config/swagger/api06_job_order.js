/**
 * API 06 - Custom Job Orders Lifecycle & Estimation Swagger
 */

module.exports = {
  tags: [
    { name: "API 06 — Job Orders Lifecycle" },
  ],
  schemas: {
    JobOrderCreateRequest: {
      type: "object",
      required: ["branchId", "items"],
      properties: {
        branchId: { $ref: "#/components/schemas/ObjectId" },
        customerId: { $ref: "#/components/schemas/ObjectId", nullable: true },
        customerSnapshot: {
          type: "object",
          properties: {
            name: { type: "string", example: "Acme Prints Ltd" },
            mobile: { type: "string", example: "9876543210" },
            email: { type: "string", example: "contact@acmeprints.com" },
            company: { type: "string", example: "Acme Corp" },
            gstin: { type: "string", example: "29AAAAA0000A1Z5" },
          },
        },
        priority: { $ref: "#/components/schemas/JobPriorityEnum" },
        jobType: { type: "string", example: "VISITING_CARD" },
        title: { type: "string", example: "Premium Visiting Cards 500 pcs" },
        dueDate: { $ref: "#/components/schemas/DateTimeString", nullable: true },
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["description", "quantity", "unitRate"],
            properties: {
              description: { type: "string", example: "350 GSM Velvet Touch Visiting Cards" },
              quantity: { type: "number", example: 500 },
              unit: { type: "string", example: "PCS" },
              unitRate: { type: "number", example: 2.5 },
              taxRate: { type: "number", example: 18 },
              finishing: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    code: { type: "string", example: "LAMINATION" },
                    name: { type: "string", example: "Velvet Matt Lamination" },
                  },
                },
              },
              materials: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    itemId: { $ref: "#/components/schemas/ObjectId" },
                    quantity: { type: "number", example: 25 },
                    unit: { type: "string", example: "SHEET" },
                  },
                },
              },
            },
          },
        },
        submitForEstimateApproval: { type: "boolean", example: true },
        isPrintReady: { type: "boolean", example: false, description: "If true, validated print-ready file bypasses design stages" },
      },
    },
    JobOrderResponse: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        jobNo: { type: "string", example: "JOB-202610-0001" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        title: { type: "string", example: "Premium Visiting Cards 500 pcs" },
        currentStage: { $ref: "#/components/schemas/JobStageEnum" },
        status: { $ref: "#/components/schemas/JobStatusEnum" },
        priority: { $ref: "#/components/schemas/JobPriorityEnum" },
        jobType: { type: "string", example: "VISITING_CARD" },
        customerSnapshot: { type: "object" },
        subtotal: { $ref: "#/components/schemas/DecimalString" },
        taxAmount: { $ref: "#/components/schemas/DecimalString" },
        grandTotal: { $ref: "#/components/schemas/DecimalString" },
        estimationStatus: { type: "string", enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"], example: "APPROVED" },
        isPrintReady: { type: "boolean", example: false },
        createdAt: { $ref: "#/components/schemas/DateTimeString" },
      },
    },
    JobWorkflowEventResponse: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        jobOrderId: { $ref: "#/components/schemas/ObjectId" },
        fromStage: { $ref: "#/components/schemas/JobStageEnum" },
        toStage: { $ref: "#/components/schemas/JobStageEnum" },
        durationMinutes: { type: "number", example: 45.5 },
        actorId: { $ref: "#/components/schemas/ObjectId" },
        timestamp: { $ref: "#/components/schemas/DateTimeString" },
      },
    },
  },
  paths: {
    "/job-orders": {
      get: {
        tags: ["API 06 — Job Orders Lifecycle"],
        operationId: "getJobOrders",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "stage", in: "query", schema: { $ref: "#/components/schemas/JobStageEnum" } },
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/JobStatusEnum" } },
          { name: "priority", in: "query", schema: { $ref: "#/components/schemas/JobPriorityEnum" } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Filter by jobNo, title, or customer name" },
          { name: "branchId", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Paginated list of job orders", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
      post: {
        tags: ["API 06 — Job Orders Lifecycle"],
        description: "Creates a new JobOrder, items, and initial workflow event inside an ACID transaction.",
        operationId: "createJobOrder",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/JobOrderCreateRequest" } } },
        },
        responses: {
          201: { description: "Job Order created successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
          422: { description: "Validation failure", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } } },
        },
      },
    },
    "/job-orders/{id}": {
      get: {
        tags: ["API 06 — Job Orders Lifecycle"],
        operationId: "getJobOrderById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Complete job details with items and workflow status", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
          404: { description: "Job not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } } },
        },
      },
    },
    "/job-orders/{id}/estimate/approve": {
      post: {
        tags: ["API 06 — Job Orders Lifecycle"],
        description: "Customer or manager approves job estimate. Moves job to DESIGN_QUEUE (or PRODUCTION_PLANNING if isPrintReady is true).",
        operationId: "approveJobEstimate",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { comments: { type: "string", example: "Approved by client via phone" } } } } },
        },
        responses: {
          200: { description: "Estimate approved", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
          409: { description: "Invalid stage transition", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } } },
        },
      },
    },
    "/job-orders/{id}/estimate/reject": {
      post: {
        tags: ["API 06 — Job Orders Lifecycle"],
        description: "Rejects estimate and returns job order to ESTIMATION stage for re-pricing.",
        operationId: "rejectJobEstimate",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string", example: "Client requested discount" } } } } },
        },
        responses: {
          200: { description: "Estimate rejected and returned to ESTIMATION", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/job-orders/{id}/workflow-events": {
      get: {
        tags: ["API 06 — Job Orders Lifecycle"],
        description: "Returns full chronological stage transition event timeline with durations for SLA calculations.",
        operationId: "getJobWorkflowEvents",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Workflow event timeline",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "array", items: { $ref: "#/components/schemas/JobWorkflowEventResponse" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/job-orders/{id}/job-card": {
      get: {
        tags: ["API 06 — Job Orders Lifecycle"],
        description: "Generates job card production traveler data including job specs, materials, finishing, barcode, and routing.",
        operationId: "getJobCard",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Job card traveler data", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/job-orders/{id}/invoice": {
      post: {
        tags: ["API 06 — Job Orders Lifecycle"],
        description: "Creates official finalized sales invoice for completed job order without duplicating material consumption.",
        operationId: "createJobInvoice",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          201: { description: "Invoice generated successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
  },
};
