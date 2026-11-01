/**
 * API 04 - Point of Sale (POS) & Sale Receipts Swagger Documentation
 */

module.exports = {
  tags: [{ name: "POS Sale Receipts" }],
  schemas: {
    SaleReceiptItemSchema: {
      type: "object",
      required: ["itemName", "quantity", "unitPrice"],
      properties: {
        itemId: { $ref: "#/components/schemas/ObjectId", nullable: true },
        itemCode: { type: "string", example: "PAPER-300GSM" },
        itemName: { type: "string", example: "300 GSM Matte Paper" },
        quantity: { type: "number", example: 10 },
        unitPrice: { type: "number", example: 5.0 },
        discountAmount: { type: "number", example: 0 },
        taxRate: { type: "number", example: 18 },
        unit: { type: "string", example: "SHEET" },
        isStockTracked: { type: "boolean", example: true },
        notes: { type: "string", example: "Front desk print run" },
      },
    },
    SalePaymentSchema: {
      type: "object",
      required: ["amount", "mode"],
      properties: {
        mode: { $ref: "#/components/schemas/PaymentModeEnum" },
        amount: { type: "number", example: 59.0 },
        reference: { type: "string", example: "UPI-TXN-12345" },
        collectedAt: { $ref: "#/components/schemas/DateTimeString" },
      },
    },
    CreateSaleReceiptRequest: {
      type: "object",
      required: ["branchId", "items"],
      properties: {
        branchId: { $ref: "#/components/schemas/ObjectId" },
        customer: {
          type: "object",
          properties: {
            name: { type: "string", example: "Walk-in Customer" },
            mobile: { type: "string", example: "9876543210" },
            email: { type: "string", format: "email", example: "customer@example.com" },
            address: { type: "string", example: "Bangalore" },
            gstin: { type: "string", example: "29AAAAA0000A1Z5" },
          },
        },
        items: {
          type: "array",
          items: { $ref: "#/components/schemas/SaleReceiptItemSchema" },
        },
        payments: {
          type: "array",
          items: { $ref: "#/components/schemas/SalePaymentSchema" },
        },
        discountAmount: { type: "number", example: 0 },
        notes: { type: "string", example: "Counter checkout" },
        idempotencyKey: { type: "string", example: "pos-uuid-987" },
      },
    },
    UpdateSaleReceiptRequest: {
      type: "object",
      properties: {
        customer: {
          type: "object",
          properties: {
            name: { type: "string", example: "Updated Customer Name" },
            mobile: { type: "string", example: "9876543210" },
          },
        },
        notes: { type: "string", example: "Updated sale notes" },
        discountAmount: { type: "number", example: 10 },
      },
    },
    CalculateSaleReceiptRequest: {
      type: "object",
      required: ["items"],
      properties: {
        items: {
          type: "array",
          items: { $ref: "#/components/schemas/SaleReceiptItemSchema" },
        },
        discountAmount: { type: "number", example: 0 },
      },
    },
    RecordPaymentRequest: {
      type: "object",
      required: ["amount", "paymentMode"],
      properties: {
        amount: { type: "number", example: 59.0 },
        paymentMode: { $ref: "#/components/schemas/PaymentModeEnum" },
        paymentReference: { type: "string", example: "CASH" },
      },
    },
    ShareReceiptRequest: {
      type: "object",
      properties: {
        channel: { type: "string", enum: ["WHATSAPP", "EMAIL", "SMS"], example: "WHATSAPP" },
        recipient: { type: "string", example: "+919876543210" },
      },
    },
  },
  paths: {
    "/sale-receipts": {
      get: {
        tags: ["POS Sale Receipts"],
        summary: "List Sale Receipts",
        operationId: "listSaleReceipts",
        description: "Retrieves paginated point of sale receipts filtered by branch, date, payment status.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["DRAFT", "COMPLETED", "VOIDED"] } },
          { name: "paymentStatus", in: "query", schema: { $ref: "#/components/schemas/PaymentStatusEnum" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: {
            description: "List of sale receipts",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["POS Sale Receipts"],
        summary: "Create Sale Receipt",
        operationId: "createSaleReceipt",
        description: "Creates a new POS sale receipt entry.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateSaleReceiptRequest" } } },
        },
        responses: {
          201: {
            description: "Sale receipt created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/sale-receipts/calculate": {
      post: {
        tags: ["POS Sale Receipts"],
        summary: "Calculate Sale Receipt Total",
        operationId: "calculateSaleReceiptTotal",
        description: "Computes subtotals, GST tax breakdown, discounts, and grand totals prior to submission.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CalculateSaleReceiptRequest" } } },
        },
        responses: {
          200: {
            description: "Calculation results",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/sale-receipts/checkout": {
      post: {
        tags: ["POS Sale Receipts"],
        summary: "Checkout Sale Receipt",
        operationId: "checkoutSaleReceipt",
        description: "Creates, executes payment, and marks sale receipt completed in a single step with stock deductions.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateSaleReceiptRequest" } } },
        },
        responses: {
          201: {
            description: "POS checkout completed",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/sale-receipts/{id}": {
      get: {
        tags: ["POS Sale Receipts"],
        summary: "Get Sale Receipt by ID",
        operationId: "getSaleReceiptById",
        description: "Retrieves complete details of a specific sale receipt.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Sale receipt retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
          404: {
            description: "Sale receipt not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } },
          },
        },
      },
      patch: {
        tags: ["POS Sale Receipts"],
        summary: "Update Sale Receipt",
        operationId: "updateSaleReceipt",
        description: "Updates customer metadata or notes on a draft sale receipt.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateSaleReceiptRequest" } } },
        },
        responses: {
          200: {
            description: "Sale receipt updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      delete: {
        tags: ["POS Sale Receipts"],
        summary: "Delete Sale Receipt",
        operationId: "deleteSaleReceipt",
        description: "Deletes a draft uncompleted sale receipt.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Sale receipt deleted",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/sale-receipts/{id}/complete": {
      post: {
        tags: ["POS Sale Receipts"],
        summary: "Complete Sale Receipt",
        operationId: "completeSaleReceipt",
        description: "Finalizes a draft sale receipt, deducing tracked inventory stock and locking the bill.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Sale receipt completed",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/sale-receipts/{id}/export": {
      get: {
        tags: ["POS Sale Receipts"],
        summary: "Export Sale Receipt",
        operationId: "exportSaleReceipt",
        description: "Exports receipt data in PDF or structured receipt format.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Receipt export data",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/sale-receipts/{id}/items": {
      put: {
        tags: ["POS Sale Receipts"],
        summary: "Replace Sale Receipt Items",
        operationId: "replaceSaleReceiptItems",
        description: "Replaces line items on a draft receipt and recalculates totals.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items"],
                properties: {
                  items: { type: "array", items: { $ref: "#/components/schemas/SaleReceiptItemSchema" } },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Receipt items replaced",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/sale-receipts/{id}/payments": {
      post: {
        tags: ["POS Sale Receipts"],
        summary: "Add Payment to Sale Receipt",
        operationId: "addSaleReceiptPayment",
        description: "Applies a payment (cash, UPI, card) to an outstanding or partial receipt.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RecordPaymentRequest" } } },
        },
        responses: {
          200: {
            description: "Payment recorded",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/sale-receipts/{id}/print": {
      get: {
        tags: ["POS Sale Receipts"],
        summary: "Print Sale Receipt",
        operationId: "printSaleReceipt",
        description: "Returns thermal ESC/POS or standard print formatting layout.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Print formatting payload",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/sale-receipts/{id}/share": {
      post: {
        tags: ["POS Sale Receipts"],
        summary: "Share Sale Receipt",
        operationId: "shareSaleReceipt",
        description: "Dispatches digital receipt via WhatsApp, SMS, or Email.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ShareReceiptRequest" } } },
        },
        responses: {
          200: {
            description: "Receipt shared",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/sale-receipts/{id}/void": {
      post: {
        tags: ["POS Sale Receipts"],
        summary: "Void Sale Receipt",
        operationId: "voidSaleReceipt",
        description: "Voids an issued sale receipt and returns consumed inventory items back to branch stock balance.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { reason: { type: "string", example: "Customer cancelled before print" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Receipt voided",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
  },
};
