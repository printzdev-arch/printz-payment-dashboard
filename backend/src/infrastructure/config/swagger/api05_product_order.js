/**
 * API 05 - Product Orders & Stock Transfers Swagger Documentation
 */

module.exports = {
  tags: [
    { name: "Product Orders" },
    { name: "Stock Transfers" },
  ],
  schemas: {
    ProductOrderRequest: {
      type: "object",
      required: ["requestingBranchId", "items"],
      properties: {
        requestingBranchId: { $ref: "#/components/schemas/ObjectId" },
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["itemId", "requestedQty"],
            properties: {
              itemId: { $ref: "#/components/schemas/ObjectId" },
              requestedQty: { type: "number", example: 100 },
              unit: { type: "string", example: "SHEET" },
            },
          },
        },
        remarks: { type: "string", example: "Weekly branch stock refill" },
      },
    },
    ProductOrderDecisionRequest: {
      type: "object",
      properties: {
        remarks: { type: "string", example: "Approved for warehouse transfer" },
        reason: { type: "string", example: "Approved" },
      },
    },
    DispatchTransferRequest: {
      type: "object",
      properties: {
        dispatchNotes: { type: "string", example: "Dispatched via logistics van" },
        carrierName: { type: "string", example: "Internal Delivery" },
        trackingNumber: { type: "string", example: "TRK-001" },
      },
    },
    ReceiveTransferRequest: {
      type: "object",
      properties: {
        receiptNotes: { type: "string", example: "Received all goods in good condition" },
      },
    },
  },
  paths: {
    "/product-orders": {
      get: {
        tags: ["Product Orders"],
        summary: "List Product Orders",
        operationId: "listProductOrders",
        description: "Retrieves list of product requisitions between branches and central warehouse.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "branchId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: {
            description: "Product orders list",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["Product Orders"],
        summary: "Create Product Order",
        operationId: "createProductOrder",
        description: "Creates a new internal branch product order requisition.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ProductOrderRequest" } } },
        },
        responses: {
          201: {
            description: "Product order created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/product-orders/pending-approval": {
      get: {
        tags: ["Product Orders"],
        summary: "Get Pending Approval Product Orders",
        operationId: "getPendingApprovalProductOrders",
        description: "Retrieves orders requiring manager or warehouse supervisor approval.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Pending approval orders",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/product-orders/{id}": {
      get: {
        tags: ["Product Orders"],
        summary: "Get Product Order by ID",
        operationId: "getProductOrderById",
        description: "Retrieves details of a product order by ObjectId.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Product order details",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      patch: {
        tags: ["Product Orders"],
        summary: "Update Product Order",
        operationId: "updateProductOrder",
        description: "Updates remarks or headers on a draft product order.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ProductOrderRequest" } } },
        },
        responses: {
          200: {
            description: "Product order updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/product-orders/{id}/items": {
      put: {
        tags: ["Product Orders"],
        summary: "Replace Product Order Items",
        operationId: "replaceProductOrderItems",
        description: "Replaces item lines on a draft product order.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ProductOrderRequest" } } },
        },
        responses: {
          200: {
            description: "Order items replaced",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/product-orders/{id}/submit": {
      post: {
        tags: ["Product Orders"],
        summary: "Submit Product Order",
        operationId: "submitProductOrder",
        description: "Submits draft product order for authorization.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Order submitted for approval",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/product-orders/{id}/approve": {
      post: {
        tags: ["Product Orders"],
        summary: "Approve Product Order",
        operationId: "approveProductOrder",
        description: "Approves product order and generates stock transfer record.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/ProductOrderDecisionRequest" } } },
        },
        responses: {
          200: {
            description: "Order approved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/product-orders/{id}/reject": {
      post: {
        tags: ["Product Orders"],
        summary: "Reject Product Order",
        operationId: "rejectProductOrder",
        description: "Rejects product order requisition.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/ProductOrderDecisionRequest" } } },
        },
        responses: {
          200: {
            description: "Order rejected",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/product-orders/{id}/cancel": {
      post: {
        tags: ["Product Orders"],
        summary: "Cancel Product Order",
        operationId: "cancelProductOrder",
        description: "Cancels an open product order.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Order cancelled",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/stock-transfers": {
      get: {
        tags: ["Stock Transfers"],
        summary: "List Stock Transfers",
        operationId: "listStockTransfers",
        description: "Lists inter-branch stock transfers and movement statuses.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "DISPATCHED", "RECEIVED", "CANCELLED"] } },
          { name: "sourceBranchId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "destinationBranchId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: {
            description: "Stock transfers retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/stock-transfers/{id}": {
      get: {
        tags: ["Stock Transfers"],
        summary: "Get Stock Transfer by ID",
        operationId: "getStockTransferById",
        description: "Retrieves details of a specific stock transfer record.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Stock transfer retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/stock-transfers/{id}/dispatch": {
      post: {
        tags: ["Stock Transfers"],
        summary: "Dispatch Stock Transfer",
        operationId: "dispatchStockTransfer",
        description: "Dispatches approved stock transfer from source warehouse, creating TRANSFER_OUT transactions.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/DispatchTransferRequest" } } },
        },
        responses: {
          200: {
            description: "Transfer dispatched",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/stock-transfers/{id}/receive": {
      post: {
        tags: ["Stock Transfers"],
        summary: "Receive Stock Transfer",
        operationId: "receiveStockTransfer",
        description: "Confirms delivery receipt at requesting branch, adding items into branch inventory balance with TRANSFER_IN ledger entries.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/ReceiveTransferRequest" } } },
        },
        responses: {
          200: {
            description: "Transfer received and stock added",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/stock-transfers/{id}/cancel": {
      post: {
        tags: ["Stock Transfers"],
        summary: "Cancel Stock Transfer",
        operationId: "cancelStockTransfer",
        description: "Cancels an open stock transfer before dispatch.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Transfer cancelled",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
  },
};
