/**
 * API 08 - Production Planning, Dynamic Operations, QC, Reprint & Delivery Swagger
 */

module.exports = {
  tags: [
    { name: "API 08 — Production & Operations" },
    { name: "API 08 — Quality Control & Reprint" },
    { name: "API 08 — Delivery & Logistics" },
  ],
  schemas: {
    ProductionOrderResponse: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        productionNo: { type: "string", example: "PO-202610-0001" },
        jobOrderId: { $ref: "#/components/schemas/ObjectId" },
        status: { $ref: "#/components/schemas/ProductionStatusEnum" },
        priority: { $ref: "#/components/schemas/JobPriorityEnum" },
        plannedQty: { type: "number", example: 500 },
        completedQty: { type: "number", example: 500 },
        createdAt: { $ref: "#/components/schemas/DateTimeString" },
      },
    },
    ProductionOperationResponse: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        productionOrderId: { $ref: "#/components/schemas/ObjectId" },
        operationCode: { type: "string", example: "PRINT" },
        operationName: { type: "string", example: "Printing" },
        sequenceNo: { type: "integer", example: 1 },
        status: { $ref: "#/components/schemas/OperationStatusEnum" },
        plannedQty: { type: "number", example: 500 },
        inputQty: { type: "number", example: 500 },
        outputQty: { type: "number", example: 500 },
        startedAt: { $ref: "#/components/schemas/DateTimeString", nullable: true },
        completedAt: { $ref: "#/components/schemas/DateTimeString", nullable: true },
      },
    },
    QualityCheckRequest: {
      type: "object",
      required: ["checkType", "result", "quantityChecked", "acceptedQty"],
      properties: {
        jobOrderId: { $ref: "#/components/schemas/ObjectId" },
        checkType: { type: "string", enum: ["INITIAL", "IN_PROCESS", "FINAL"], example: "FINAL" },
        result: { $ref: "#/components/schemas/QCResultEnum" },
        quantityChecked: { type: "number", example: 500 },
        acceptedQty: { type: "number", example: 500 },
        rejectedQty: { type: "number", example: 0 },
        comments: { type: "string", example: "Color registration and cuts are clean." },
        defects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              code: { type: "string", example: "INK_SMUDGE" },
              description: { type: "string", example: "Minor ink smudge on corners" },
              severity: { type: "string", enum: ["MINOR", "MAJOR", "CRITICAL"], example: "MAJOR" },
            },
          },
        },
        correctiveAction: { type: "string", enum: ["NONE", "REWORK", "REPRINT"], example: "NONE" },
      },
    },
    DeliveryOrderResponse: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        deliveryNo: { type: "string", example: "DO-202610-0001" },
        jobOrderId: { $ref: "#/components/schemas/ObjectId" },
        status: { $ref: "#/components/schemas/DeliveryStatusEnum" },
        packedAt: { $ref: "#/components/schemas/DateTimeString", nullable: true },
        dispatchedAt: { $ref: "#/components/schemas/DateTimeString", nullable: true },
        deliveredAt: { $ref: "#/components/schemas/DateTimeString", nullable: true },
        receivedBy: { type: "string", example: "John Smith" },
      },
    },
  },
  paths: {
    "/job-orders/{id}/production/plan": {
      post: {
        tags: ["API 08 — Production & Operations"],
        description: "Creates ProductionOrder and generates dynamic sequential operations (PRINT -> finishing[] -> PACKING).",
        operationId: "planProduction",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          201: { description: "Production plan created with sequential operations", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
          409: { description: "Job not in PRODUCTION_PLANNING stage", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } } },
        },
      },
    },
    "/production-orders": {
      get: {
        tags: ["API 08 — Production & Operations"],
        operationId: "getProductionOrders",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/ProductionStatusEnum" } },
          { name: "priority", in: "query", schema: { $ref: "#/components/schemas/JobPriorityEnum" } },
        ],
        responses: {
          200: { description: "List of production orders", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-operations/{id}/start": {
      post: {
        tags: ["API 08 — Production & Operations"],
        description: "Validates preceding operation is COMPLETED. If preceding operation is open, returns 409 PREVIOUS_OPERATION_OPEN.",
        operationId: "startProductionOperation",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Operation started (status: RUNNING)", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
          409: { description: "Conflict - PREVIOUS_OPERATION_OPEN", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } } },
        },
      },
    },
    "/production-operations/{id}/complete": {
      post: {
        tags: ["API 08 — Production & Operations"],
        description: "Records output quantity, updates status to COMPLETED, and executes single-instance material consumption.",
        operationId: "completeProductionOperation",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { outputQty: { type: "number", example: 500 } } } } },
        },
        responses: {
          200: { description: "Operation completed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
          422: { description: "Insufficient raw material stock for consumption", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } } },
        },
      },
    },
    "/production-orders/{id}/quality-checks": {
      post: {
        tags: ["API 08 — Quality Control & Reprint"],
        description: "Submits QC results. On PASS, marks job READY and creates DeliveryOrder. On ISSUE, triggers REWORK or REPRINT.",
        operationId: "submitQualityCheck",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/QualityCheckRequest" } } },
        },
        responses: {
          201: { description: "Quality check recorded", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/reprint-requests": {
      get: {
        tags: ["API 08 — Quality Control & Reprint"],
        operationId: "getReprintRequests",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "List of reprint authorization requests", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/delivery-orders": {
      get: {
        tags: ["API 08 — Delivery & Logistics"],
        operationId: "getDeliveryOrders",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "status", in: "query", schema: { $ref: "#/components/schemas/DeliveryStatusEnum" } }],
        responses: {
          200: { description: "Delivery fulfillment orders", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/delivery-orders/{id}/pack": {
      post: {
        tags: ["API 08 — Delivery & Logistics"],
        operationId: "packDeliveryOrder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Delivery status updated to PACKED", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/delivery-orders/{id}/dispatch": {
      post: {
        tags: ["API 08 — Delivery & Logistics"],
        operationId: "dispatchDeliveryOrder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Delivery status updated to OUT_FOR_DELIVERY", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/delivery-orders/{id}/deliver": {
      post: {
        tags: ["API 08 — Delivery & Logistics"],
        description: "Records customer receipt, transitions delivery to DELIVERED, and marks JobOrder COMPLETED.",
        operationId: "completeDeliveryOrder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { receivedBy: { type: "string", example: "John Smith" }, remarks: { type: "string", example: "Delivered to office" } } } } },
        },
        responses: {
          200: { description: "Job Order and Delivery marked COMPLETED", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
  },
};
