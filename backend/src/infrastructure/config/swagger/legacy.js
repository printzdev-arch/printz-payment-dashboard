/**
 * Legacy & Support Modules Swagger (Branches, Categories, Printers, Jumbo Xerox, Payments, Reports, Past Date Requests, Stocks, Total Amounts, Sales)
 */

module.exports = {
  tags: [
    { name: "Branches" },
    { name: "Categories" },
    { name: "Jumbo Xerox" },
    { name: "Past Date Requests" },
    { name: "Payments to Collect" },
    { name: "Printer Readings" },
    { name: "Printers" },
    { name: "Reports & KPIs" },
    { name: "Revenue & Total Amounts" },
    { name: "Sales" },
    { name: "Stocks" },
  ],
  schemas: {
    BranchRequest: {
      type: "object",
      required: ["name", "code"],
      properties: {
        name: { type: "string", example: "Koramangala Main Branch" },
        code: { type: "string", example: "BR01" },
        address: { type: "string", example: "123 5th Block, Koramangala, Bengaluru" },
        branchType: { type: "string", enum: ["retail", "warehouse", "corporate"], example: "retail" },
        isActive: { type: "boolean", example: true },
      },
    },
    CategoryRequest: {
      type: "object",
      required: ["categoryId", "categoryName"],
      properties: {
        categoryId: { type: "string", example: "CAT-001" },
        categoryName: { type: "string", example: "Visiting Cards & Stationery" },
      },
    },
    PrinterRequest: {
      type: "object",
      required: ["name", "branchId"],
      properties: {
        name: { type: "string", example: "Konica Minolta C3070" },
        model: { type: "string", example: "AccurioPress C3070" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        serialNumber: { type: "string", example: "KM-2024-998" },
      },
    },
    PrinterReadingRequest: {
      type: "object",
      required: ["branchId", "printerId", "readingDate", "totalCount"],
      properties: {
        branchId: { $ref: "#/components/schemas/ObjectId" },
        printerId: { $ref: "#/components/schemas/ObjectId" },
        readingDate: { type: "string", format: "date", example: "2026-10-08" },
        totalCount: { type: "number", example: 12450 },
        colorCount: { type: "number", example: 8200 },
        bwCount: { type: "number", example: 4250 },
      },
    },
    JumboXeroxMachineRequest: {
      type: "object",
      required: ["machineName", "branchId"],
      properties: {
        machineName: { type: "string", example: "Xerox Wide-Format 510" },
        model: { type: "string", example: "WF-510" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        status: { type: "string", enum: ["active", "maintenance", "inactive"], example: "active" },
      },
    },
    JumboXeroxReadingRequest: {
      type: "object",
      required: ["machineId", "readingDate", "startReading", "endReading"],
      properties: {
        machineId: { $ref: "#/components/schemas/ObjectId" },
        readingDate: { type: "string", format: "date", example: "2026-10-08" },
        startReading: { type: "number", example: 1000 },
        endReading: { type: "number", example: 1250 },
        remarks: { type: "string", example: "Architectural blueprint prints" },
      },
    },
    PastDateRequest: {
      type: "object",
      required: ["branchId", "requestDate", "reason"],
      properties: {
        branchId: { $ref: "#/components/schemas/ObjectId" },
        requestDate: { type: "string", format: "date", example: "2026-10-07" },
        reason: { type: "string", example: "System maintenance downtime correction" },
      },
    },
    PaymentRequest: {
      type: "object",
      required: ["amount", "paymentMode"],
      properties: {
        customerId: { $ref: "#/components/schemas/ObjectId", nullable: true },
        amount: { type: "number", example: 2500.0 },
        paymentMode: { $ref: "#/components/schemas/PaymentModeEnum" },
        transactionReference: { type: "string", example: "UPI-202610-9988" },
        notes: { type: "string", example: "Advance payment for bulk brochure order" },
      },
    },
    TotalAmountRequest: {
      type: "object",
      required: ["branchId", "date", "cashAmount", "onlineAmount"],
      properties: {
        branchId: { $ref: "#/components/schemas/ObjectId" },
        date: { type: "string", format: "date", example: "2026-10-08" },
        cashAmount: { type: "number", example: 15400.0 },
        onlineAmount: { type: "number", example: 28600.0 },
        totalAmount: { type: "number", example: 44000.0 },
      },
    },
    StockItemRequest: {
      type: "object",
      required: ["itemName", "unit"],
      properties: {
        itemName: { type: "string", example: "Gloss Paper Roll 36 Inch" },
        category: { type: "string", example: "Paper Rolls" },
        unit: { type: "string", example: "ROLL" },
        minStockLevel: { type: "number", example: 5 },
        currentStock: { type: "number", example: 20 },
      },
    },
    StockReadingRequest: {
      type: "object",
      required: ["itemId", "branchId", "recordedCount"],
      properties: {
        itemId: { $ref: "#/components/schemas/ObjectId" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        recordedCount: { type: "number", example: 18 },
        recordedDate: { type: "string", format: "date", example: "2026-10-08" },
      },
    },
    SaleRequest: {
      type: "object",
      required: ["customerName", "amount"],
      properties: {
        customerName: { type: "string", example: "Priya Enterprises" },
        amount: { type: "number", example: 1850.0 },
        description: { type: "string", example: "Brochure and banner printing" },
      },
    },
  },
  paths: {
    "/branches": {
      get: {
        tags: ["Branches"],
        operationId: "getBranches",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Branches"],
        operationId: "createBranch",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/BranchRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/branches/{id}": {
      get: {
        tags: ["Branches"],
        operationId: "getBranchById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
      put: {
        tags: ["Branches"],
        operationId: "updateBranch",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/BranchRequest" } } },
        },
        responses: { 200: { description: "" } },
      },
      patch: {
        tags: ["Branches"],
        operationId: "patchBranch",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
      delete: {
        tags: ["Branches"],
        operationId: "deleteBranch",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/general/categories": {
      get: {
        tags: ["Categories"],
        operationId: "getCategories",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Categories"],
        operationId: "createCategory",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CategoryRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/general/finalized-dates": {
      get: {
        tags: ["Categories"],
        operationId: "getFinalizedDates",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Categories"],
        operationId: "setFinalizedDate",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  branchId: { $ref: "#/components/schemas/ObjectId" },
                  finalizedDate: { type: "string", format: "date", example: "2026-10-08" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/general/sales": {
      get: {
        tags: ["Sales"],
        operationId: "getSales",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Sales"],
        operationId: "createSale",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SaleRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/general/sales/{id}": {
      get: {
        tags: ["Sales"],
        operationId: "getSaleById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/printers": {
      get: {
        tags: ["Printers"],
        operationId: "getPrinters",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Printers"],
        operationId: "createPrinter",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PrinterRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/printers/{id}": {
      get: {
        tags: ["Printers"],
        operationId: "getPrinterById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
      put: {
        tags: ["Printers"],
        operationId: "updatePrinter",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PrinterRequest" } } },
        },
        responses: { 200: { description: "" } },
      },
      delete: {
        tags: ["Printers"],
        operationId: "deletePrinter",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/printer-readings": {
      get: {
        tags: ["Printer Readings"],
        operationId: "getPrinterReadings",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Printer Readings"],
        operationId: "createPrinterReading",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PrinterReadingRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/printer-readings/{id}": {
      get: {
        tags: ["Printer Readings"],
        operationId: "getPrinterReadingById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
      put: {
        tags: ["Printer Readings"],
        operationId: "updatePrinterReading",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PrinterReadingRequest" } } },
        },
        responses: { 200: { description: "" } },
      },
      delete: {
        tags: ["Printer Readings"],
        operationId: "deletePrinterReading",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/jumbo-xerox/machines": {
      get: {
        tags: ["Jumbo Xerox"],
        operationId: "getJumboXeroxMachines",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Jumbo Xerox"],
        operationId: "createJumboXeroxMachine",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/JumboXeroxMachineRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/jumbo-xerox/machines/{id}": {
      get: {
        tags: ["Jumbo Xerox"],
        operationId: "getJumboXeroxMachineById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
      put: {
        tags: ["Jumbo Xerox"],
        operationId: "updateJumboXeroxMachine",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/JumboXeroxMachineRequest" } } },
        },
        responses: { 200: { description: "" } },
      },
      delete: {
        tags: ["Jumbo Xerox"],
        operationId: "deleteJumboXeroxMachine",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/jumbo-xerox/readings": {
      get: {
        tags: ["Jumbo Xerox"],
        operationId: "getJumboXeroxReadings",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Jumbo Xerox"],
        operationId: "createJumboXeroxReading",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/JumboXeroxReadingRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/jumbo-xerox/readings/{id}": {
      delete: {
        tags: ["Jumbo Xerox"],
        operationId: "deleteJumboXeroxReading",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/past-date-requests": {
      get: {
        tags: ["Past Date Requests"],
        operationId: "getPastDateRequests",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Past Date Requests"],
        operationId: "createPastDateRequest",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PastDateRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/past-date-requests/{id}": {
      get: {
        tags: ["Past Date Requests"],
        operationId: "getPastDateRequestById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
      put: {
        tags: ["Past Date Requests"],
        operationId: "updatePastDateRequest",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PastDateRequest" } } },
        },
        responses: { 200: { description: "" } },
      },
      delete: {
        tags: ["Past Date Requests"],
        operationId: "deletePastDateRequest",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/payments": {
      get: {
        tags: ["Payments to Collect"],
        operationId: "getPayments",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Payments to Collect"],
        operationId: "createPayment",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/payments/{id}": {
      get: {
        tags: ["Payments to Collect"],
        operationId: "getPaymentById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
      put: {
        tags: ["Payments to Collect"],
        operationId: "updatePayment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentRequest" } } },
        },
        responses: { 200: { description: "" } },
      },
      delete: {
        tags: ["Payments to Collect"],
        operationId: "deletePayment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/reports/dashboard-summary": {
      get: {
        tags: ["Reports & KPIs"],
        operationId: "getReportsDashboardSummary",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
    },
    "/reports/monthly-revenue": {
      get: {
        tags: ["Reports & KPIs"],
        operationId: "getReportsMonthlyRevenue",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
    },
    "/total-amounts": {
      get: {
        tags: ["Revenue & Total Amounts"],
        operationId: "getTotalAmounts",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Revenue & Total Amounts"],
        operationId: "createTotalAmount",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/TotalAmountRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/total-amounts/{id}": {
      get: {
        tags: ["Revenue & Total Amounts"],
        operationId: "getTotalAmountById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
      put: {
        tags: ["Revenue & Total Amounts"],
        operationId: "updateTotalAmount",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/TotalAmountRequest" } } },
        },
        responses: { 200: { description: "" } },
      },
      delete: {
        tags: ["Revenue & Total Amounts"],
        operationId: "deleteTotalAmount",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/stocks/items": {
      get: {
        tags: ["Stocks"],
        operationId: "getStockItems",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Stocks"],
        operationId: "createStockItem",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/StockItemRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/stocks/items/{id}": {
      get: {
        tags: ["Stocks"],
        operationId: "getStockItemById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
      put: {
        tags: ["Stocks"],
        operationId: "updateStockItem",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/StockItemRequest" } } },
        },
        responses: { 200: { description: "" } },
      },
      delete: {
        tags: ["Stocks"],
        operationId: "deleteStockItem",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
    "/stocks/readings": {
      get: {
        tags: ["Stocks"],
        operationId: "getStockReadings",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "" } },
      },
      post: {
        tags: ["Stocks"],
        operationId: "createStockReading",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/StockReadingRequest" } } },
        },
        responses: { 201: { description: "" } },
      },
    },
    "/stocks/readings/{id}": {
      get: {
        tags: ["Stocks"],
        operationId: "getStockReadingById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
      put: {
        tags: ["Stocks"],
        operationId: "updateStockReading",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/StockReadingRequest" } } },
        },
        responses: { 200: { description: "" } },
      },
      delete: {
        tags: ["Stocks"],
        operationId: "deleteStockReading",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: { 200: { description: "" } },
      },
    },
  },
};
