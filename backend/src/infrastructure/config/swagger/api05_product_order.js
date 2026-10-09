/**
 * API 05 - Product Orders & Stock Transfers Swagger
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
  },
  paths: {
    "/product-orders": {
      get: {
        tags: ["Product Orders"],
        operationId: "getProductOrders",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Product Orders"],
        operationId: "createProductOrder",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ProductOrderRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/product-orders/{id}": {
      get: {
        tags: ["Product Orders"],
        operationId: "getProductOrderById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
      patch: {
        tags: ["Product Orders"],
        operationId: "patchProductOrder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/product-orders/{id}/approve": {
      post: {
        tags: ["Product Orders"],
        operationId: "approveProductOrder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/product-orders/{id}/cancel": {
      post: {
        tags: ["Product Orders"],
        operationId: "cancelProductOrder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/product-orders/{id}/items": {
      put: {
        tags: ["Product Orders"],
        operationId: "updateProductOrderItems",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/product-orders/{id}/reject": {
      post: {
        tags: ["Product Orders"],
        operationId: "rejectProductOrder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/product-orders/{id}/submit": {
      post: {
        tags: ["Product Orders"],
        operationId: "submitProductOrder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/product-orders/pending-approval": {
      get: {
        tags: ["Product Orders"],
        operationId: "getPendingApprovalProductOrders",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
    },
    "/stock-transfers": {
      get: {
        tags: ["Stock Transfers"],
        operationId: "getStockTransfers",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Stock Transfers"],
        operationId: "createStockTransfer",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "" } },
      },
    },
    "/stock-transfers/{id}": {
      get: {
        tags: ["Stock Transfers"],
        operationId: "getStockTransferById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/stock-transfers/{id}/cancel": {
      post: {
        tags: ["Stock Transfers"],
        operationId: "cancelStockTransfer",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/stock-transfers/{id}/dispatch": {
      post: {
        tags: ["Stock Transfers"],
        operationId: "dispatchStockTransfer",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/stock-transfers/{id}/receive": {
      post: {
        tags: ["Stock Transfers"],
        operationId: "receiveStockTransfer",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
  },
};
