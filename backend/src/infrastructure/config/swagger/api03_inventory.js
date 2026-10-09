/**
 * API 03 - Inventory Master, Balances, Ledger & Purchase Receipts Swagger / OpenAPI Documentation
 */

module.exports = {
  tags: [
    { name: "Inventory Items", description: "Inventory item master catalog and CRUD operations" },
    { name: "Inventory Balances", description: "Multi-branch stock balances, POS search, and warehouse lookup" },
    { name: "Inventory Transactions", description: "Immutable stock ledger, opening balances, adjustments, and issues" },
    { name: "Purchase Receipts", description: "Draft, post, and cancel purchase receipt entries" },
  ],
  schemas: {
    InventoryItemRequest: {
      type: "object",
      required: ["itemCode", "name", "unit"],
      properties: {
        itemCode: { type: "string", example: "PAPER-300GSM", description: "Unique, stable item code" },
        name: { type: "string", example: "300 GSM Matte Paper" },
        category: { type: "string", example: "PAPER", description: "e.g. PAPER, INK_TONER, GIFT, FRAME" },
        hsnCode: { type: "string", example: "4802", description: "Harmonized System of Nomenclature code" },
        unit: { type: "string", example: "SHEET", default: "PCS", description: "e.g. PCS, SHEET, KG, BOTTLE, BOX" },
        purchaseRate: { type: "number", example: 2.5, description: "Default purchase rate" },
        saleRate: { type: "number", example: 5.0, description: "Default selling price" },
        taxRate: { type: "number", example: 18, description: "Applicable GST tax percentage (0-100)" },
        reorderLevel: { type: "number", example: 50, description: "Low stock alert threshold" },
        isActive: { type: "boolean", example: true, default: true },
        isStockTracked: { type: "boolean", example: true, default: true },
      },
    },
    InventoryItemUpdateRequest: {
      type: "object",
      description: "Fields to update (itemCode is immutable and cannot be changed)",
      properties: {
        name: { type: "string", example: "300 GSM Matte Paper Premium" },
        category: { type: "string", example: "PAPER" },
        hsnCode: { type: "string", example: "4802" },
        unit: { type: "string", example: "SHEET" },
        purchaseRate: { type: "number", example: 2.75 },
        saleRate: { type: "number", example: 5.5 },
        taxRate: { type: "number", example: 18 },
        reorderLevel: { type: "number", example: 75 },
        isActive: { type: "boolean", example: true },
        isStockTracked: { type: "boolean", example: true },
      },
    },
    InventoryOpeningStockRequest: {
      type: "object",
      required: ["branchId", "lines"],
      properties: {
        branchId: { $ref: "#/components/schemas/ObjectId", description: "Branch receiving initial opening stock" },
        lines: {
          type: "array",
          items: {
            type: "object",
            required: ["itemId", "quantity"],
            properties: {
              itemId: { $ref: "#/components/schemas/ObjectId" },
              quantity: { type: "number", example: 100, description: "Opening stock quantity (must be positive)" },
              notes: { type: "string", example: "Initial branch inventory setup" },
            },
          },
        },
      },
    },
    InventoryAdjustmentRequest: {
      type: "object",
      required: ["branchId", "itemId", "quantity", "notes"],
      properties: {
        branchId: { $ref: "#/components/schemas/ObjectId" },
        itemId: { $ref: "#/components/schemas/ObjectId" },
        quantity: { type: "number", example: -5, description: "Positive to add stock, negative to reduce stock" },
        notes: { type: "string", example: "Damaged stock correction in warehouse" },
      },
    },
    InventoryIssueRequest: {
      type: "object",
      required: ["branchId", "itemId", "quantity"],
      properties: {
        branchId: { $ref: "#/components/schemas/ObjectId" },
        itemId: { $ref: "#/components/schemas/ObjectId" },
        quantity: { type: "number", example: 10, description: "Positive quantity consumed internally" },
        consumptionType: {
          type: "string",
          enum: ["PRINTING_ASSET", "PAPER", "INK_TONER", "OTHER_CONSUMABLE"],
          example: "PAPER",
        },
        notes: { type: "string", example: "Internal printing job material usage" },
      },
    },
    PurchaseReceiptItemRequest: {
      type: "object",
      required: ["itemId", "quantity", "purchaseRate"],
      properties: {
        itemId: { $ref: "#/components/schemas/ObjectId" },
        quantity: { type: "number", example: 50, description: "Quantity received" },
        purchaseRate: { type: "number", example: 150, description: "Rate per unit" },
        amount: { type: "number", example: 7500, description: "Optional line total (auto-calculated if omitted)" },
      },
    },
    PurchaseReceiptRequest: {
      type: "object",
      required: ["branchId", "supplierName", "items"],
      properties: {
        branchId: { $ref: "#/components/schemas/ObjectId" },
        supplierName: { type: "string", example: "Supreme Paper Mills Ltd" },
        supplierInvoiceNo: { type: "string", example: "INV-9901" },
        receivedDate: { type: "string", format: "date", example: "2026-10-09" },
        items: {
          type: "array",
          items: { $ref: "#/components/schemas/PurchaseReceiptItemRequest" },
        },
        remarks: { type: "string", example: "Standard monthly stock replenishment" },
      },
    },
    PurchaseReceiptUpdateRequest: {
      type: "object",
      properties: {
        supplierName: { type: "string", example: "Supreme Paper Mills Ltd" },
        supplierInvoiceNo: { type: "string", example: "INV-9901-REV" },
        receivedDate: { type: "string", format: "date", example: "2026-10-09" },
        items: {
          type: "array",
          items: { $ref: "#/components/schemas/PurchaseReceiptItemRequest" },
        },
        remarks: { type: "string", example: "Updated delivery line items" },
      },
    },
  },
  paths: {
    "/inventory-items": {
      get: {
        tags: ["Inventory Items"],
        summary: "List inventory items with search and filters",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "category", in: "query", schema: { type: "string" }, description: "Filter by category (e.g. PAPER, INK_TONER)" },
          { name: "isActive", in: "query", schema: { type: "boolean" }, description: "Filter active or inactive items" },
          { name: "q", in: "query", schema: { type: "string" }, description: "Search query across itemCode, name, and hsnCode" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: { description: "Inventory items retrieved successfully" },
        },
      },
      post: {
        tags: ["Inventory Items"],
        summary: "Create new inventory item",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/InventoryItemRequest" } } },
        },
        responses: {
          201: { description: "Inventory item created successfully" },
          409: { description: "Item code already exists (DUPLICATE)" },
        },
      },
    },
    "/inventory-items/{id}": {
      get: {
        tags: ["Inventory Items"],
        summary: "Get inventory item details with branch balances",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Inventory item details retrieved with balances" },
          404: { description: "Inventory item not found" },
        },
      },
      patch: {
        tags: ["Inventory Items"],
        summary: "Update inventory item details (itemCode is immutable)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/InventoryItemUpdateRequest" } } },
        },
        responses: {
          200: { description: "Inventory item updated successfully" },
          404: { description: "Inventory item not found" },
        },
      },
    },
    "/inventory-items/{id}/activate": {
      post: {
        tags: ["Inventory Items"],
        summary: "Activate an inventory item",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Inventory item activated successfully" },
        },
      },
    },
    "/inventory-items/{id}/deactivate": {
      post: {
        tags: ["Inventory Items"],
        summary: "Deactivate an inventory item",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Inventory item deactivated successfully" },
        },
      },
    },
    "/inventory-balances": {
      get: {
        tags: ["Inventory Balances"],
        summary: "List multi-branch inventory balances with item details",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "category", in: "query", schema: { type: "string" }, description: "Filter by item category" },
          { name: "lowStock", in: "query", schema: { type: "boolean" }, description: "Filter items where quantity <= reorderLevel" },
          { name: "q", in: "query", schema: { type: "string" }, description: "Search query across itemCode, name, category, HSN" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: { description: "Inventory balances retrieved successfully" },
        },
      },
    },
    "/inventory-balances/low-stock": {
      get: {
        tags: ["Inventory Balances"],
        summary: "Get low stock and out-of-stock items requiring reordering",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" }, description: "Optional branch filter" },
          { name: "category", in: "query", schema: { type: "string" }, description: "Filter by item category" },
          { name: "q", in: "query", schema: { type: "string" }, description: "Search query across item code, name, category, HSN" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: { description: "Low stock inventory records retrieved successfully" },
        },
      },
    },
    "/inventory-balances/search": {
      get: {
        tags: ["Inventory Balances"],
        summary: "Search active inventory balances for POS sale receipt creation",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "q", in: "query", schema: { type: "string" }, description: "Search query across item code, name, HSN" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: { description: "POS active inventory items retrieved successfully" },
        },
      },
    },
    "/inventory-balances/warehouse": {
      get: {
        tags: ["Inventory Balances"],
        summary: "List inventory balances located at warehouse branches",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "q", in: "query", schema: { type: "string" }, description: "Search query across warehouse items" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: { description: "Warehouse inventory balances retrieved successfully" },
        },
      },
    },
    "/inventory-transactions": {
      get: {
        tags: ["Inventory Transactions"],
        summary: "Query immutable inventory ledger history",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "itemId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "branchId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "type", in: "query", schema: { type: "string" }, description: "OPENING, PURCHASE, SALE, ISSUE, RETURN, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, JOB_CONSUMPTION" },
          { name: "consumptionType", in: "query", schema: { type: "string" } },
          { name: "referenceType", in: "query", schema: { type: "string" } },
          { name: "referenceId", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
          { name: "performedBy", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: { description: "Inventory transactions retrieved successfully" },
        },
      },
    },
    "/inventory-transactions/{id}": {
      get: {
        tags: ["Inventory Transactions"],
        summary: "Get single inventory transaction details",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Inventory transaction retrieved successfully" },
          404: { description: "Transaction not found" },
        },
      },
    },
    "/inventory-transactions/opening": {
      post: {
        tags: ["Inventory Transactions"],
        summary: "Record initial opening stock (only allowed when no prior balance exists)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/InventoryOpeningStockRequest" } } },
        },
        responses: {
          201: { description: "Opening stock recorded successfully" },
          400: { description: "Balance already exists or invalid request" },
        },
      },
    },
    "/inventory-transactions/adjustments": {
      post: {
        tags: ["Inventory Transactions"],
        summary: "Record positive or negative stock adjustment (high volumes trigger approval)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/InventoryAdjustmentRequest" } } },
        },
        responses: {
          201: { description: "Stock adjustment posted or submitted for approval" },
          422: { description: "Insufficient stock for negative adjustment" },
        },
      },
    },
    "/inventory-transactions/issues": {
      post: {
        tags: ["Inventory Transactions"],
        summary: "Record internal consumption issue (e.g. PAPER, INK_TONER)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/InventoryIssueRequest" } } },
        },
        responses: {
          201: { description: "Stock issue recorded successfully" },
          422: { description: "Insufficient stock" },
        },
      },
    },
    "/purchase-receipts": {
      get: {
        tags: ["Purchase Receipts"],
        summary: "List purchase receipts with status and date filters",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["DRAFT", "POSTED", "CANCELLED"] } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: { description: "Purchase receipts retrieved successfully" },
        },
      },
      post: {
        tags: ["Purchase Receipts"],
        summary: "Create new purchase receipt in DRAFT status",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PurchaseReceiptRequest" } } },
        },
        responses: {
          201: { description: "Purchase receipt draft created successfully" },
        },
      },
    },
    "/purchase-receipts/{id}": {
      get: {
        tags: ["Purchase Receipts"],
        summary: "Get purchase receipt details by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Purchase receipt retrieved successfully" },
          404: { description: "Purchase receipt not found" },
        },
      },
      patch: {
        tags: ["Purchase Receipts"],
        summary: "Update purchase receipt (only permitted while in DRAFT status)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PurchaseReceiptUpdateRequest" } } },
        },
        responses: {
          200: { description: "Purchase receipt draft updated successfully" },
          400: { description: "Cannot edit non-draft receipt" },
        },
      },
    },
    "/purchase-receipts/{id}/post": {
      post: {
        tags: ["Purchase Receipts"],
        summary: "Post purchase receipt (creates PURCHASE ledger transactions and increments balances)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Purchase receipt posted successfully and stock updated" },
          400: { description: "Receipt is already POSTED or CANCELLED" },
        },
      },
    },
    "/purchase-receipts/{id}/cancel": {
      post: {
        tags: ["Purchase Receipts"],
        summary: "Cancel purchase receipt (reverses stock with compensating ADJUSTMENT transactions if posted)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Purchase receipt cancelled successfully" },
          400: { description: "Receipt is already CANCELLED" },
          422: { description: "Insufficient stock to reverse posted receipt" },
        },
      },
    },
  },
};
