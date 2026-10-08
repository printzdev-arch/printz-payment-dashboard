/**
 * OpenAPI 3.0 Documentation Module for Production, QC, Reprint & Delivery
 */
const productionSwagger = {
  tags: [
    {
      name: "Production Planning",
      description: "Trigger production planning and generate dynamic sequential operations",
    },
    {
      name: "Production Orders",
      description: "Manage production orders, scheduling, hold, resume, and cancellation",
    },
    {
      name: "Production Operations",
      description: "Manage individual operation lifecycle (start, complete, fail, skip, assign, claim)",
    },
    {
      name: "Production Queue",
      description: "View available ready-to-run sequential operations and stage counts",
    },
    {
      name: "Quality Control",
      description: "Quality control inspection, pass/issue decisions, defect logging, and reports",
    },
    {
      name: "Reprint Requests",
      description: "Reprint requests, manager approvals, rejections, and production re-opening",
    },
    {
      name: "Delivery Orders",
      description: "Packaging, dispatch, tracking, and final customer delivery hand-over",
    },
  ],

  schemas: {
    ProductionOrder: {
      type: "object",
      properties: {
        _id: { type: "string", example: "66b01234567890abcdef0001" },
        productionNo: { type: "string", example: "PO-20261006-0001" },
        jobOrderId: { type: "string", example: "66b01234567890abcdef0002" },
        jobItemId: { type: "string", example: "66b01234567890abcdef0003" },
        branchId: { type: "string", example: "489571a9af51836599708543" },
        status: {
          type: "string",
          enum: ["PLANNED", "IN_PROGRESS", "ON_HOLD", "QC", "COMPLETED", "CANCELLED"],
          example: "PLANNED",
        },
        priority: {
          type: "string",
          enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
          example: "HIGH",
        },
        plannedQty: { type: "number", example: 500 },
        actualQty: { type: "number", example: 500 },
        plannedStart: { type: "string", format: "date-time", example: "2026-10-06T10:00:00.000Z" },
        actualStart: { type: "string", format: "date-time", example: "2026-10-06T10:15:00.000Z" },
        actualEnd: { type: "string", format: "date-time", example: "2026-10-06T12:30:00.000Z" },
        machineId: { type: "string", example: "408c9ac20b70d08cbbc876c8" },
        assignedEmployeeIds: {
          type: "array",
          items: { type: "string" },
          example: ["6346c3abf048eeecec3bc41f"],
        },
        cycleNo: { type: "number", example: 0 },
        cycleType: { type: "string", enum: ["ORIGINAL", "REPRINT", "REWORK"], example: "ORIGINAL" },
        parentProductionOrderId: { type: "string", example: null },
        reprintRequestId: { type: "string", example: null },
        approvedSample: {
          type: "object",
          properties: {
            fileUrl: { type: "string", example: "https://storage.printz.shop/samples/sample-001.pdf" },
            thumbnailUrl: { type: "string", example: "https://storage.printz.shop/samples/sample-001-thumb.jpg" },
            customerComments: { type: "string", example: "Approved with vibrant CMYK profile" },
            approvedAt: { type: "string", format: "date-time", example: "2026-10-06T09:30:00.000Z" },
          },
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },

    ProductionOperation: {
      type: "object",
      properties: {
        _id: { type: "string", example: "66b01234567890abcdef0004" },
        productionOrderId: { type: "string", example: "66b01234567890abcdef0001" },
        operationCode: {
          type: "string",
          enum: [
            "PRINT",
            "CUTTING",
            "LAMINATION",
            "BINDING",
            "FOLDING",
            "CREASING",
            "SPIRAL_BINDING",
            "UV",
            "MOUNTING",
            "HEAT_PRESS",
            "PACKING",
          ],
          example: "PRINT",
        },
        operationName: { type: "string", example: "Printing" },
        sequenceNo: { type: "integer", example: 1 },
        machineId: { type: "string", example: "408c9ac20b70d08cbbc876c8" },
        assignedEmployeeId: { type: "string", example: "6346c3abf048eeecec3bc41f" },
        plannedQty: { type: "number", example: 500 },
        inputQty: { type: "number", example: 500 },
        outputQty: { type: "number", example: 500 },
        completedQty: { type: "number", example: 500 },
        status: {
          type: "string",
          enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED", "SKIPPED"],
          example: "PENDING",
        },
        cycleNo: { type: "number", example: 0 },
        cycleType: { type: "string", enum: ["ORIGINAL", "REPRINT", "REWORK"], example: "ORIGINAL" },
        startAt: { type: "string", format: "date-time" },
        endAt: { type: "string", format: "date-time" },
        remarks: { type: "string", example: "Colour calibrated with 300 GSM art paper" },
        isRework: { type: "boolean", example: false },
        isReprint: { type: "boolean", example: false },
      },
    },

    ProductionQueueItem: {
      type: "object",
      properties: {
        _id: { type: "string", example: "66b01234567890abcdef0004" },
        operationCode: { type: "string", example: "PRINT" },
        sequenceNo: { type: "integer", example: 1 },
        status: { type: "string", example: "PENDING" },
        plannedQty: { type: "number", example: 500 },
        isAvailable: { type: "boolean", example: true },
        productionOrder: { $ref: "#/components/schemas/ProductionOrder" },
        jobOrder: {
          type: "object",
          properties: {
            jobNo: { type: "string", example: "JOB-2026-1001" },
            title: { type: "string", example: "Corporate Brochures" },
            dueDate: { type: "string", format: "date-time", example: "2026-10-07T18:00:00.000Z" },
            priority: { type: "string", example: "HIGH" },
          },
        },
        customer: {
          type: "object",
          properties: {
            name: { type: "string", example: "Acme Corporation" },
            phone: { type: "string", example: "9876543210" },
          },
        },
      },
    },

    QualityCheck: {
      type: "object",
      properties: {
        _id: { type: "string", example: "66b01234567890abcdef0005" },
        productionOrderId: { type: "string", example: "66b01234567890abcdef0001" },
        jobOrderId: { type: "string", example: "66b01234567890abcdef0002" },
        checkType: { type: "string", enum: ["FINAL", "STAGE"], example: "FINAL" },
        checkedBy: { type: "string", example: "6346c3abf048eeecec3bc41f" },
        checkedAt: { type: "string", format: "date-time" },
        result: { type: "string", enum: ["PASS", "ISSUE", "FAIL", "CONDITIONAL"], example: "PASS" },
        quantityChecked: { type: "number", example: 500 },
        acceptedQty: { type: "number", example: 500 },
        rejectedQty: { type: "number", example: 0 },
        defects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              code: { type: "string", example: "INK_SMUDGE" },
              description: { type: "string", example: "Minor ink smudge on 10 sheets" },
              severity: { type: "string", enum: ["MINOR", "MAJOR", "CRITICAL"], example: "MINOR" },
            },
          },
        },
        issueDetails: { type: "string", example: "" },
        correctiveAction: { type: "string", enum: ["REWORK", "REPRINT", "NONE"], example: "NONE" },
        reprintRequestId: { type: "string", example: null },
        reworkOperationCode: { type: "string", example: null },
        restartFromOperationCode: { type: "string", example: null },
        comments: { type: "string", example: "All quality thresholds met. Print registration accurate." },
      },
    },

    ReprintRequest: {
      type: "object",
      properties: {
        _id: { type: "string", example: "66b01234567890abcdef0006" },
        jobOrderId: { type: "string", example: "66b01234567890abcdef0002" },
        requestedBy: { type: "string", example: "6346c3abf048eeecec3bc41f" },
        reason: { type: "string", example: "Lamination bubble defect on 50 units" },
        quantity: { type: "number", example: 50 },
        sourceStage: { type: "string", enum: ["QC", "PACKING", "FINISHING", "PRINTING", "DELIVERY"], example: "QC" },
        restartFromOperationCode: { type: "string", example: "PRINT" },
        cycleNo: { type: "number", example: 1 },
        details: { type: "string", example: "Colour mismatch with approved sample." },
        status: {
          type: "string",
          enum: ["REQUESTED", "APPROVED", "IN_PRODUCTION", "COMPLETED", "REJECTED"],
          example: "REQUESTED",
        },
        approvedBy: { type: "string", example: null },
        approvedAt: { type: "string", format: "date-time" },
        markAsUrgent: { type: "boolean", example: false },
        managerComments: { type: "string", example: "Approved. Prioritise in print queue." },
        reopenedAt: { type: "string", format: "date-time" },
        completedAt: { type: "string", format: "date-time" },
      },
    },

    DeliveryOrder: {
      type: "object",
      properties: {
        _id: { type: "string", example: "66b01234567890abcdef0007" },
        deliveryNo: { type: "string", example: "DO-20261006-0001" },
        jobOrderId: { type: "string", example: "66b01234567890abcdef0002" },
        branchId: { type: "string", example: "489571a9af51836599708543" },
        customerName: { type: "string", example: "Acme Corporation" },
        quantity: { type: "number", example: 500 },
        status: {
          type: "string",
          enum: ["READY", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
          example: "READY",
        },
        packedAt: { type: "string", format: "date-time" },
        dispatchedAt: { type: "string", format: "date-time" },
        deliveredAt: { type: "string", format: "date-time" },
        receivedBy: { type: "string", example: "John Doe (Receiving Manager)" },
        remarks: { type: "string", example: "Delivered in 5 sealed boxes" },
      },
    },

    ProductionPlanRequest: {
      type: "object",
      properties: {
        plannedStart: { type: "string", format: "date-time", example: "2026-10-06T11:00:00.000Z" },
        machineId: { type: "string", example: "408c9ac20b70d08cbbc876c8" },
        assignedEmployeeIds: {
          type: "array",
          items: { type: "string" },
          example: ["6346c3abf048eeecec3bc41f"],
        },
      },
    },

    OperationAssignRequest: {
      type: "object",
      properties: {
        assignedEmployeeId: {
          type: "string",
          example: "6346c3abf048eeecec3bc41f",
          description: "Target employee ObjectId. Leave null for strict Round Robin automatic assignment.",
        },
      },
    },

    OperationStartRequest: {
      type: "object",
      properties: {
        machineId: { type: "string", example: "408c9ac20b70d08cbbc876c8" },
        inputQty: { type: "number", example: 520 },
      },
    },

    OperationCompleteRequest: {
      type: "object",
      properties: {
        outputQty: { type: "number", example: 500 },
        completedQty: { type: "number", example: 500 },
        remarks: { type: "string", example: "Colour balanced and calibrated" },
        consumption: {
          type: "array",
          items: {
            type: "object",
            properties: {
              itemId: { type: "string", example: "90de925fff02b4a3fcb27926" },
              quantity: { type: "number", example: 270 },
              consumptionType: { type: "string", example: "PAPER" },
            },
          },
          example: [
            { itemId: "90de925fff02b4a3fcb27926", quantity: 270, consumptionType: "PAPER" },
          ],
        },
      },
    },

    QualityCheckRequest: {
      type: "object",
      properties: {
        checkType: { type: "string", enum: ["FINAL", "STAGE"], example: "FINAL" },
        result: { type: "string", enum: ["PASS", "ISSUE"], example: "PASS" },
        quantityChecked: { type: "number", example: 500 },
        acceptedQty: { type: "number", example: 500 },
        rejectedQty: { type: "number", example: 0 },
        defects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              code: { type: "string", example: "INK_SMUDGE" },
              description: { type: "string", example: "Top sheets smudged" },
              severity: { type: "string", enum: ["MINOR", "MAJOR", "CRITICAL"], example: "MAJOR" },
            },
          },
        },
        issueDetails: { type: "string", example: "" },
        correctiveAction: { type: "string", enum: ["REWORK", "REPRINT", "NONE"], example: "NONE" },
        reprintQuantity: { type: "number", example: 50 },
        reworkOperationCode: { type: "string", example: "PRINT" },
        comments: { type: "string", example: "Quality check passed with excellence." },
      },
    },

    ReprintCreateRequest: {
      type: "object",
      properties: {
        jobItemId: { type: "string", example: "66b01234567890abcdef0003" },
        reason: { type: "string", example: "Damaged during post-finishing lamination" },
        quantity: { type: "number", example: 50 },
        sourceStage: { type: "string", enum: ["PACKING", "QC"], example: "QC" },
      },
    },

    ReprintRejectRequest: {
      type: "object",
      properties: {
        comments: { type: "string", example: "Defect within acceptable commercial variance" },
      },
    },

    DeliveryDeliverRequest: {
      type: "object",
      properties: {
        receivedBy: { type: "string", example: "Mr. Arthur Pendelton" },
        remarks: { type: "string", example: "Received in good order and signed invoice" },
      },
    },
  },

  paths: {
    // Production Planning
    "/api/job-orders/{id}/production/plan": {
      post: {
        tags: ["Production Planning"],
        summary: "Plan production for a Job Order",
        description:
          "Finds the Job Order and creates one Production Order per production-required item. Dynamically generates sequential operations (PRINT -> finishing[] -> PACKING). Prevents duplicate production orders and assigns initial operators via Strict Round Robin.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "query", required: false, schema: { type: "string" }, description: "Job Order ObjectId" },
        ],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ProductionPlanRequest" } } },
        },
        responses: {
          201: { description: "Production orders planned and queued successfully" },
          400: { description: "Bad Request - No items require production" },
          404: { description: "Job Order not found" },
          409: { description: "Conflict - Production order already exists" },
        },
      },
    },

    // Production Orders
    "/api/production-orders": {
      get: {
        tags: ["Production Orders"],
        summary: "List production orders with filtering and pagination",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", required: false, schema: { type: "string" }, description: "Filter by branch ObjectId" },
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["PLANNED", "IN_PROGRESS", "ON_HOLD", "QC", "COMPLETED", "CANCELLED"] } },
          { name: "jobOrderId", in: "query", required: false, schema: { type: "string" } },
          { name: "machineId", in: "query", required: false, schema: { type: "string" } },
          { name: "priority", in: "query", required: false, schema: { type: "string", enum: ["LOW", "NORMAL", "HIGH", "URGENT"] } },
          { name: "page", in: "query", required: false, schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: { description: "Paginated list of production orders" },
        },
      },
    },

    "/api/production-orders/{id}": {
      get: {
        tags: ["Production Orders"],
        summary: "Get production order by ID with full operation timeline and QC records",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "query", required: false, schema: { type: "string" }, description: "Production Order ObjectId" },
        ],
        responses: {
          200: { description: "Production order details" },
          404: { description: "Production Order not found" },
        },
      },
      patch: {
        tags: ["Production Orders"],
        summary: "Update production order details",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "query", required: false, schema: { type: "string" } },
        ],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: {
          200: { description: "Production order updated successfully" },
        },
      },
    },

    "/api/production-orders/{id}/hold": {
      post: {
        tags: ["Production Orders"],
        summary: "Place production order on hold",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string", example: "Awaiting paper stock arrival" } } } } },
        },
        responses: {
          200: { description: "Production order placed on hold" },
        },
      },
    },

    "/api/production-orders/{id}/resume": {
      post: {
        tags: ["Production Orders"],
        summary: "Resume production order from hold",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "Production order resumed successfully" },
        },
      },
    },

    "/api/production-orders/{id}/cancel": {
      post: {
        tags: ["Production Orders"],
        summary: "Cancel production order and all pending operations",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string", example: "Customer cancelled order" } } } } },
        },
        responses: {
          200: { description: "Production order cancelled" },
        },
      },
    },

    "/api/production-orders/{id}/operations": {
      put: {
        tags: ["Production Orders"],
        summary: "Reorder or update pending finishing operations",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "array", items: { type: "object" } } } },
        },
        responses: {
          200: { description: "Operations updated successfully" },
        },
      },
    },

    // Production Queue & Operations
    "/api/production-operations/queue": {
      get: {
        tags: ["Production Queue"],
        summary: "Get production queue operations (Sequential Availability)",
        description:
          "Returns operations ready for execution in strict sequence. An operation is only available if all preceding operations in its sequence are COMPLETED or SKIPPED.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "operationCode", in: "query", required: false, schema: { type: "string" }, description: "Filter by operation code (e.g. PRINT, LAMINATION, PACKING)" },
          { name: "branchId", in: "query", required: false, schema: { type: "string" } },
          { name: "mine", in: "query", required: false, schema: { type: "boolean" }, description: "Filter operations assigned to the authenticated user" },
          { name: "page", in: "query", required: false, schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: { description: "List of available queue operations" },
        },
      },
    },

    "/api/production-operations/queue/counts": {
      get: {
        tags: ["Production Queue"],
        summary: "Get operation queue counts by stage & QC pending",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "branchId", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Counts breakdown",
            content: {
              "application/json": {
                example: { success: true, data: { PRINT: 7, LAMINATION: 3, PACKING: 4, QC_PENDING: 2 } },
              },
            },
          },
        },
      },
    },

    "/api/production-operations/{id}/assign": {
      post: {
        tags: ["Production Operations"],
        summary: "Assign employee to operation (or auto-assign via strict Round Robin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/OperationAssignRequest" } } },
        },
        responses: {
          200: { description: "Operation assigned" },
        },
      },
    },

    "/api/production-operations/{id}/claim": {
      post: {
        tags: ["Production Operations"],
        summary: "Operator claims an available operation",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "Operation claimed successfully" },
        },
      },
    },

    "/api/production-operations/{id}/start": {
      post: {
        tags: ["Production Operations"],
        summary: "Start an operation: PENDING -> RUNNING",
        description:
          "Enforces sequence validation: validates that all prior operations in sequence are completed. Updates JobOrder stage accordingly.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/OperationStartRequest" } } },
        },
        responses: {
          200: { description: "Operation started" },
          409: { description: "Conflict - Previous operation still open" },
        },
      },
    },

    "/api/production-operations/{id}/complete": {
      post: {
        tags: ["Production Operations"],
        summary: "Complete an operation: RUNNING -> COMPLETED with Inventory Consumption",
        description:
          "Validates and records actual outputs. Deducts material consumption from inventory atomically (creating JOB_CONSUMPTION transaction). If stock is insufficient, returns 422 INSUFFICIENT_STOCK. When all operations complete, automatically moves order to QC.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/OperationCompleteRequest" } } },
        },
        responses: {
          200: { description: "Operation completed successfully" },
          422: { description: "Unprocessable Entity - Insufficient stock in inventory" },
        },
      },
    },

    "/api/production-operations/{id}/fail": {
      post: {
        tags: ["Production Operations"],
        summary: "Mark operation as FAILED (machine/material error)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object", properties: { remarks: { type: "string", example: "Paper jam damaged print heads" } } } } },
        },
        responses: {
          200: { description: "Operation marked as failed" },
        },
      },
    },

    "/api/production-operations/{id}/retry": {
      post: {
        tags: ["Production Operations"],
        summary: "Retry a failed operation: FAILED -> PENDING",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "Operation reset for retry in queue" },
        },
      },
    },

    "/api/production-operations/{id}/skip": {
      post: {
        tags: ["Production Operations"],
        summary: "Skip a finishing operation: PENDING -> SKIPPED",
        description: "Only finishing operations can be skipped. PRINT and PACKING cannot be skipped.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object", properties: { remarks: { type: "string", example: "Client requested no lamination" } } } } },
        },
        responses: {
          200: { description: "Operation skipped" },
          400: { description: "Cannot skip essential operation PRINT or PACKING" },
        },
      },
    },

    // Quality Control
    "/api/quality-checks/pending": {
      get: {
        tags: ["Quality Control"],
        summary: "Get production orders pending QC inspection",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "branchId", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "List of pending QC orders" },
        },
      },
    },

    "/api/production-orders/{id}/quality-checks": {
      post: {
        tags: ["Quality Control"],
        summary: "Perform Quality Check on a Production Order (PASS / ISSUE)",
        description:
          "If PASS: marks production order COMPLETED. When all sibling orders are complete, marks Job Order READY and creates Delivery Order in READY status.\nIf ISSUE: records defects and triggers chosen corrective action (REWORK: appends new PENDING operations; REPRINT: creates reprint request).",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" }, description: "Production Order ObjectId" }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/QualityCheckRequest" } } },
        },
        responses: {
          201: { description: "Quality check recorded successfully" },
        },
      },
    },

    "/api/quality-checks": {
      get: {
        tags: ["Quality Control"],
        summary: "List all quality checks with filtering",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "jobOrderId", in: "query", required: false, schema: { type: "string" } },
          { name: "productionOrderId", in: "query", required: false, schema: { type: "string" } },
          { name: "result", in: "query", required: false, schema: { type: "string", enum: ["PASS", "ISSUE", "FAIL", "CONDITIONAL"] } },
          { name: "checkedBy", in: "query", required: false, schema: { type: "string" } },
          { name: "from", in: "query", required: false, schema: { type: "string" } },
          { name: "to", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "List of quality checks" },
        },
      },
    },

    "/api/quality-checks/{id}": {
      get: {
        tags: ["Quality Control"],
        summary: "Get quality check details by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "Quality check details" },
        },
      },
    },

    "/api/quality-checks/{id}/report": {
      get: {
        tags: ["Quality Control"],
        summary: "Generate official QC inspection report data",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "QC Inspection Report" },
        },
      },
    },

    // Reprint Requests
    "/api/reprint-requests": {
      get: {
        tags: ["Reprint Requests"],
        summary: "List reprint requests",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "jobOrderId", in: "query", required: false, schema: { type: "string" } },
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["REQUESTED", "APPROVED", "IN_PRODUCTION", "COMPLETED", "REJECTED"] } },
        ],
        responses: {
          200: { description: "List of reprint requests" },
        },
      },
    },

    "/api/job-orders/{id}/reprint-requests": {
      post: {
        tags: ["Reprint Requests"],
        summary: "Submit a reprint request for a Job Order",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ReprintCreateRequest" } } },
        },
        responses: {
          201: { description: "Reprint request submitted" },
        },
      },
    },

    "/api/reprint-requests/{id}/approve": {
      post: {
        tags: ["Reprint Requests"],
        summary: "Approve a reprint request and reopen production cycle",
        description:
          "Sets status to APPROVED/IN_PRODUCTION. Reopens production cycle by appending new operations (PRINT -> finishing -> PACKING) with the reprint quantity to the production order.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "Reprint request approved and production cycle reopened" },
        },
      },
    },

    "/api/reprint-requests/{id}/reject": {
      post: {
        tags: ["Reprint Requests"],
        summary: "Reject a reprint request",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ReprintRejectRequest" } } },
        },
        responses: {
          200: { description: "Reprint request rejected" },
        },
      },
    },

    // Delivery Orders
    "/api/delivery-orders": {
      get: {
        tags: ["Delivery Orders"],
        summary: "List delivery orders",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", required: false, schema: { type: "string" } },
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["READY", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] } },
          { name: "jobOrderId", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "List of delivery orders" },
        },
      },
    },

    "/api/delivery-orders/{id}": {
      get: {
        tags: ["Delivery Orders"],
        summary: "Get delivery order by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "Delivery order details" },
        },
      },
    },

    "/api/delivery-orders/{id}/pack": {
      post: {
        tags: ["Delivery Orders"],
        summary: "Mark delivery order as packed",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "Delivery order marked as PACKED" },
        },
      },
    },

    "/api/delivery-orders/{id}/dispatch": {
      post: {
        tags: ["Delivery Orders"],
        summary: "Dispatch delivery order (OUT_FOR_DELIVERY)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "Delivery order dispatched" },
        },
      },
    },

    "/api/delivery-orders/{id}/deliver": {
      post: {
        tags: ["Delivery Orders"],
        summary: "Complete final customer delivery hand-over",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "query", required: false, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/DeliveryDeliverRequest" } } },
        },
        responses: {
          200: { description: "Delivery order completed and Job Order marked DELIVERED" },
        },
      },
    },
  },
};

module.exports = productionSwagger;
