/**
 * API 04 - Point of Sale (POS) & Sale Receipts Swagger
 */

module.exports = {
  tags: [
    { name: "POS Sale Receipts" },
  ],
  schemas: {
    POSCheckoutRequest: {
      type: "object",
      required: ["branchId", "items", "paymentMode"],
      properties: {
        branchId: { $ref: "#/components/schemas/ObjectId" },
        customerId: { $ref: "#/components/schemas/ObjectId", nullable: true },
        customerName: { type: "string", example: "Walk-in Customer" },
        customerMobile: { type: "string", example: "9876543210" },
        paymentMode: { $ref: "#/components/schemas/PaymentModeEnum" },
        paymentReference: { type: "string", example: "CASH_REF_001" },
      },
    },
  },
  paths: {
    "/sale-receipts": {
      get: {
        tags: ["POS Sale Receipts"],
        operationId: "getSaleReceipts",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["POS Sale Receipts"],
        operationId: "createSaleReceipt",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "" } },
      },
    },
    "/sale-receipts/{id}": {
      get: {
        tags: ["POS Sale Receipts"],
        operationId: "getSaleReceiptById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
      patch: {
        tags: ["POS Sale Receipts"],
        operationId: "patchSaleReceipt",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
      delete: {
        tags: ["POS Sale Receipts"],
        operationId: "deleteSaleReceipt",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/sale-receipts/{id}/complete": {
      post: {
        tags: ["POS Sale Receipts"],
        operationId: "completeSaleReceipt",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/sale-receipts/{id}/report": {
      get: {
        tags: ["POS Sale Receipts"],
        operationId: "getSaleReceiptReport",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/sale-receipts/{id}/item": {
      put: {
        tags: ["POS Sale Receipts"],
        operationId: "updateSaleReceiptItem",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/sale-receipts/{id}/payments": {
      post: {
        tags: ["POS Sale Receipts"],
        operationId: "addSaleReceiptPayment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/sale-receipts/{id}/print": {
      get: {
        tags: ["POS Sale Receipts"],
        operationId: "printSaleReceipt",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/sale-receipts/{id}/share": {
      post: {
        tags: ["POS Sale Receipts"],
        operationId: "shareSaleReceipt",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/sale-receipts/{id}/void": {
      post: {
        tags: ["POS Sale Receipts"],
        operationId: "voidSaleReceipt",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/sale-receipts/calculate": {
      post: {
        tags: ["POS Sale Receipts"],
        operationId: "calculateSaleReceipt",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
    },
    "/sale-receipts/checkout": {
      post: {
        tags: ["POS Sale Receipts"],
        operationId: "checkoutSaleReceipt",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/POSCheckoutRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
  },
};
