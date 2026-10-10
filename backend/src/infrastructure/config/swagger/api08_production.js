/**
 * API 08 - Production Planning, Dynamic Operations, QC, Reprint & Delivery Swagger
 */

module.exports = {
  tags: [
    { name: "Production & Operations", description: "Production orders, sequential operations, and shop-floor tracking" },
    { name: "Quality Control & Reprint", description: "QC inspections, defect reporting, and reprint authorization" },
    { name: "Delivery & Logistics", description: "Packaging, dispatch, and final delivery order fulfillment" },
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
    "/production-orders": {
      get: {
        tags: ["Production & Operations"],
        summary: "List Production Orders",
        description: "Returns production orders filtered by status, priority, or branch.",
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
    "/production-orders/{id}": {
      get: {
        tags: ["Production & Operations"],
        summary: "Get Production Order by ID",
        description: "Retrieves complete details of a production order including operation progress.",
        operationId: "getProductionOrderById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Production order details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
      patch: {
        tags: ["Production & Operations"],
        summary: "Update Production Order Details",
        description: "Updates priority, notes, or target schedules for a production order.",
        operationId: "patchProductionOrder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { notes: { type: "string" }, priority: { $ref: "#/components/schemas/JobPriorityEnum" } } } } },
        },
        responses: {
          200: { description: "Production order updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-orders/{id}/operations": {
      put: {
        tags: ["Production & Operations"],
        summary: "Update Production Order Operations Sequence",
        description: "Modifies or re-sequences the operations planned for a production order.",
        operationId: "updateProductionOrderOperations",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { operations: { type: "array", items: { type: "object" } } } } } },
        },
        responses: {
          200: { description: "Operations sequence updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-orders/{id}/hold": {
      post: {
        tags: ["Production & Operations"],
        summary: "Hold Production Order",
        description: "Places production order on hold, pausing all in-progress operations.",
        operationId: "holdProductionOrder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string", example: "Waiting for paper stock arrival" } } } } },
        },
        responses: {
          200: { description: "Production order held", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-orders/{id}/resume": {
      post: {
        tags: ["Production & Operations"],
        summary: "Resume Production Order",
        description: "Resumes production order from held status back to in-production.",
        operationId: "resumeProductionOrder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Production order resumed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-orders/{id}/cancel": {
      post: {
        tags: ["Production & Operations"],
        summary: "Cancel Production Order",
        description: "Cancels production order and marks remaining operations cancelled.",
        operationId: "cancelProductionOrder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string", example: "Customer cancelled job" } } } } },
        },
        responses: {
          200: { description: "Production order cancelled", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-orders/{id}/quality-checks": {
      post: {
        tags: ["Production & Operations"],
        summary: "Perform Quality Check on Production Order",
        description: "Submits QC inspection results for a specific production order.",
        operationId: "submitProductionOrderQualityCheck",
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
    "/production-operations/queue": {
      get: {
        tags: ["Production & Operations"],
        summary: "List Operations in Production Queue",
        description: "Returns actionable operations in the production queue.",
        operationId: "getProductionOperationsQueue",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Production operations queue", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-operations/queue/counts": {
      get: {
        tags: ["Production & Operations"],
        summary: "Get Production Queue Counts by Operation",
        description: "Returns counts of queue items grouped by machine or operation type.",
        operationId: "getProductionOperationsQueueCounts",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Queue counts retrieved", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-operations/{id}/assign": {
      post: {
        tags: ["Production & Operations"],
        summary: "Assign Operator to Production Operation",
        description: "Assigns a specific machine operator or technician to an operation.",
        operationId: "assignProductionOperation",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["operatorId"], properties: { operatorId: { $ref: "#/components/schemas/ObjectId" } } } } },
        },
        responses: {
          200: { description: "Operator assigned", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-operations/{id}/claim": {
      post: {
        tags: ["Production & Operations"],
        summary: "Claim Production Operation",
        description: "Current authenticated operator claims the operation from the queue.",
        operationId: "claimProductionOperation",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Operation claimed by operator", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-operations/{id}/start": {
      post: {
        tags: ["Production & Operations"],
        summary: "Start Production Operation",
        description: "Validates preceding operation is COMPLETED and transitions status to RUNNING.",
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
        tags: ["Production & Operations"],
        summary: "Complete Production Operation",
        description: "Records output quantity, updates status to COMPLETED, and executes single-instance material consumption.",
        operationId: "completeProductionOperation",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { outputQty: { type: "number", example: 500 } } } } },
        },
        responses: {
          200: { description: "Operation completed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-operations/{id}/fail": {
      post: {
        tags: ["Production & Operations"],
        summary: "Fail Production Operation",
        description: "Marks operation as FAILED due to machine breakdown, defect, or material issue.",
        operationId: "failProductionOperation",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string", example: "Machine paper jam" } } } } },
        },
        responses: {
          200: { description: "Operation marked failed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-operations/{id}/retry": {
      post: {
        tags: ["Production & Operations"],
        summary: "Retry Production Operation",
        description: "Resets a failed operation back to PENDING or RUNNING for re-execution.",
        operationId: "retryProductionOperation",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Operation reset for retry", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-operations/{id}/skip": {
      post: {
        tags: ["Production & Operations"],
        summary: "Skip Production Operation",
        description: "Skips an optional or unnecessary operation in the sequence.",
        operationId: "skipProductionOperation",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string" } } } } },
        },
        responses: {
          200: { description: "Operation skipped", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-queue": {
      get: {
        tags: ["Production & Operations"],
        summary: "List Live Production Queue",
        description: "Returns high-level production queue items across the branch shop floor.",
        operationId: "getProductionQueue",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Live production queue", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/production-queue/counts": {
      get: {
        tags: ["Production & Operations"],
        summary: "Get Production Queue Aggregated Counts",
        description: "Returns summary counts of active, pending, and completed production tasks.",
        operationId: "getProductionQueueCounts",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Production queue summary counts", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/quality-checks": {
      get: {
        tags: ["Quality Control & Reprint"],
        summary: "List Quality Checks",
        description: "Returns historical quality check records.",
        operationId: "getQualityChecks",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Quality check inspection list", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/quality-checks/pending": {
      get: {
        tags: ["Quality Control & Reprint"],
        summary: "List Pending Quality Checks",
        description: "Returns jobs completed from production awaiting QC inspection.",
        operationId: "getPendingQualityChecks",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Pending quality checks list", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/quality-checks/{id}": {
      get: {
        tags: ["Quality Control & Reprint"],
        summary: "Get Quality Check by ID",
        description: "Retrieves specific quality check details including defect observations.",
        operationId: "getQualityCheckById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Quality check details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/quality-checks/{id}/report": {
      get: {
        tags: ["Quality Control & Reprint"],
        summary: "Generate Quality Check Inspection Report",
        description: "Generates formatted inspection certificate report for customer delivery.",
        operationId: "getQualityCheckReport",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Quality report summary", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/reprint-requests": {
      get: {
        tags: ["Quality Control & Reprint"],
        summary: "List Reprint Requests",
        description: "Returns reprint requests awaiting manager approval.",
        operationId: "getReprintRequests",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "List of reprint authorization requests", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/reprint-requests/{id}": {
      get: {
        tags: ["Quality Control & Reprint"],
        summary: "Get Reprint Request by ID",
        description: "Retrieves details of a specific reprint authorization request.",
        operationId: "getReprintRequestById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Reprint request details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/reprint-requests/{id}/approve": {
      post: {
        tags: ["Quality Control & Reprint"],
        summary: "Approve Reprint Authorization Request",
        description: "Manager approves reprint, generating a new production order for defective quantity.",
        operationId: "approveReprintRequest",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { approvalNotes: { type: "string" } } } } },
        },
        responses: {
          200: { description: "Reprint approved and routed to production", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/reprint-requests/{id}/reject": {
      post: {
        tags: ["Quality Control & Reprint"],
        summary: "Reject Reprint Authorization Request",
        description: "Manager rejects reprint authorization request with explanatory reason.",
        operationId: "rejectReprintRequest",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { rejectionReason: { type: "string", example: "Customer approved defects" } } } } },
        },
        responses: {
          200: { description: "Reprint request rejected", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/delivery-orders": {
      get: {
        tags: ["Delivery & Logistics"],
        summary: "List Delivery Orders",
        description: "Returns delivery fulfillment orders filtered by status.",
        operationId: "getDeliveryOrders",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "status", in: "query", schema: { $ref: "#/components/schemas/DeliveryStatusEnum" } }],
        responses: {
          200: { description: "Delivery fulfillment orders", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/delivery-orders/{id}": {
      get: {
        tags: ["Delivery & Logistics"],
        summary: "Get Delivery Order by ID",
        description: "Retrieves complete details and tracking status of a delivery order.",
        operationId: "getDeliveryOrderById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Delivery order details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/delivery-orders/{id}/pack": {
      post: {
        tags: ["Delivery & Logistics"],
        summary: "Mark Delivery Order as Packed",
        description: "Updates delivery fulfillment order status to PACKED.",
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
        tags: ["Delivery & Logistics"],
        summary: "Dispatch Delivery Order for Shipment",
        description: "Updates delivery fulfillment order status to OUT_FOR_DELIVERY / DISPATCHED.",
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
        tags: ["Delivery & Logistics"],
        summary: "Record Final Delivery Receipt",
        description: "Records customer receipt signature, transitions delivery to DELIVERED, and completes JobOrder.",
        operationId: "deliverDeliveryOrder",
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
