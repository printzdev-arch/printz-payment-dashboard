const env = require("./env");

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Printz Payment Dashboard API",
    version: "1.0.0",
    description:
      "Comprehensive, production-ready REST API documentation for Printz Payment Dashboard built with Node.js, Express, MongoDB Atlas, and JWT RBAC.",
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}`,
      description: "Local Development Server",
    },
  ],
  tags: [
    { name: "Authentication" },
    { name: "Branches" },
    { name: "Categories" },
    { name: "Jumbo Xerox" },
    { name: "Past Date Requests" },
    { name: "Payments to Collect" },
    { name: "Printer Readings" },
    { name: "Printers" },
    { name: "Reports & KPIs" },
    { name: "Revenue & Total Amounts" },
    { name: "Stocks" },
    { name: "Sales" },
    { name: "Users & RBAC" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token in the format: Bearer <token>",
      },
    },
    schemas: {
      BranchRequest: {
        type: "object",
        required: ["name", "code"],
        properties: {
          name: { type: "string", example: "Banaswadii" },
          code: { type: "string", example: "BN" },
          address: { type: "string", example: "No 3 Hanumanth Reddy complex, Annaiah Reddy Layout, Dodda Banaswadi, Bengaluru, Karnataka 560043" },
          branchType: { type: "string", example: "retail" },
          weeklyOffDays: { type: "array", items: { type: "string" }, example: [] },
        },
      },
      CategoryRequest: {
        type: "object",
        required: ["categoryId", "categoryName"],
        properties: {
          categoryId: { type: "string", example: "001", description: "Unique category code/id" },
          categoryName: { type: "string", example: "Calendars & Diaries", description: "Category name" },
        },
      },
      JumboXeroxMachineRequest: {
        type: "object",
        required: ["branchId", "printerId", "printerName", "size", "type", "unitPrice"],
        properties: {
          branchId: { type: "string", example: "489571a9af51836599708543", description: "Branch ObjectId" },
          printerId: { type: "string", example: "PS-BA-003", description: "Printer ID" },
          printerRef: { type: "string", example: "408c9ac20b70d08cbbc876c8", description: "Optional printer ObjectId" },
          printerName: { type: "string", example: "CANON TX5300", description: "Printer / machine name" },
          size: { type: "string", example: "A2", description: "Print size (e.g. A0, A1, A2)" },
          type: { type: "string", example: "SCAN", description: "Print type (e.g. SCAN, COLOUR, BW)" },
          unitPrice: { type: "number", example: 50, description: "Unit price per copy/sqft" },
          isActive: { type: "boolean", example: true, description: "Machine active status" },
          clonedFrom: { type: "string", example: "HBR LAYOUT", description: "Optional clone source" },
          movedFrom: { type: "string", example: null, description: "Optional source branch" },
          reason: { type: "string", example: null, description: "Optional change reason" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "admin@printz.shop" },
          password: { type: "string", example: "Admin@123" },
        },
      },
      RefreshTokenRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            description: "The long-lived refresh token received during login",
          },
        },
      },
      LogoutRequest: {
        type: "object",
        properties: {
          refreshToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            description: "Optional refresh token to invalidate on logout",
          },
        },
      },
      PastDateRequest: {
        type: "object",
        required: ["requestedDate"],
        properties: {
          branchId: { type: "string", nullable: true, example: "6346c3abf048eeecec3bc41f", description: "Branch ObjectId (null if appliesToAllBranches is true)" },
          appliesToAllBranches: { type: "boolean", example: false },
          requestedBy: { type: "string", example: "6qzk3qUvvsVbgSakVTOL97avv2l1" },
          requestedDate: { type: "string", example: "2025-09-01 09:00:00" },
          status: { type: "string", enum: ["Pending", "Approved", "Rejected"], example: "Approved" },
          type: { type: "string", example: "Manual Admin Grant" },
        },
      },
      PastDateRequestUpdateRequest: {
        type: "object",
        properties: {
          branchId: { type: "string", nullable: true, example: "6346c3abf048eeecec3bc41f" },
          appliesToAllBranches: { type: "boolean", example: false },
          status: { type: "string", enum: ["Pending", "Approved", "Rejected"], example: "Approved" },
          type: { type: "string", example: "Manual Admin Grant" },
          requestedDate: { type: "string", example: "2025-09-01 09:00:00" },
        },
      },
      PaymentRequest: {
        type: "object",
        required: ["branchId", "date"],
        properties: {
          branchId: { type: "string", example: "6346c3abf048eeecec3bc41f", description: "Branch ObjectId" },
          date: { type: "string", example: "2025-09-01", description: "Payment record date (YYYY-MM-DD)" },
          balance: { type: "number", example: 1700 },
          paymentCollectedTillNow: { type: "number", example: 0 },
          paymentToBeCollected: { type: "number", example: 1700 },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: { type: "number", example: 500 },
                date: { type: "string", example: "2025-09-02" },
                paymentMethod: { type: "string", example: "upi" },
                collectedAt: { type: "string", format: "date-time", example: "2025-09-02T10:30:00.000Z" },
              },
            },
            example: [],
          },
        },
      },
      PaymentUpdateRequest: {
        type: "object",
        properties: {
          branchId: { type: "string", example: "6346c3abf048eeecec3bc41f" },
          date: { type: "string", example: "2025-09-01" },
          balance: { type: "number", example: 1700 },
          paymentCollectedTillNow: { type: "number", example: 0 },
          paymentToBeCollected: { type: "number", example: 1700 },
          items: {
            type: "array",
            items: { type: "object" },
          },
        },
      },
      PrinterReadingRequest: {
        type: "object",
        required: ["date"],
        properties: {
          branchId: { type: "string", example: "0d896e6ab4aec6c1062e37d3", description: "Branch ObjectId" },
          date: { type: "string", example: "2026-07-18", description: "Date (YYYY-MM-DD)" },
          readings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                printerId: { type: "string", example: "PS-LR-003" },
                printerRef: { type: "string", example: "a13d10f60655a63bd6ccd067" },
                jobType: { type: "string", example: "SCAN" },
                startingReading: { type: "number", example: 33518 },
                finalReading: { type: "number", example: 33518 },
                noOfCopies: { type: "number", example: 0 },
                price: { type: "number", example: 10 },
                total: { type: "number", example: 0 },
                isPreLoaded: { type: "boolean", example: true },
              },
            },
            example: [
              {
                printerId: "PS-LR-003",
                printerRef: "a13d10f60655a63bd6ccd067",
                jobType: "SCAN",
                startingReading: 33518,
                finalReading: 33518,
                noOfCopies: 0,
                price: 10,
                total: 0,
                isPreLoaded: true,
              },
              {
                printerId: "PS-LR-003",
                printerRef: "a13d10f60655a63bd6ccd067",
                jobType: "TOTAL",
                startingReading: 168057,
                finalReading: 168143,
                noOfCopies: 86,
                price: 10,
                total: 860,
                isPreLoaded: true,
              },
            ],
          },
          userId: { type: "string", example: "3uPZoGLyh1VBMlCw5CknhaVxIeh2" },
          isFinalSubmitted: { type: "boolean", example: false },
          isLocked: { type: "boolean", example: false },
          needsReview: { type: "boolean", example: false },
        },
      },
      PrinterReadingUpdateRequest: {
        type: "object",
        properties: {
          branchId: { type: "string", example: "0d896e6ab4aec6c1062e37d3" },
          date: { type: "string", example: "2026-07-18" },
          readings: {
            type: "array",
            items: { type: "object" },
          },
          userId: { type: "string", example: "3uPZoGLyh1VBMlCw5CknhaVxIeh2" },
          finalSubmittedAt: { type: "string", format: "date-time", example: null },
          finalSubmittedBy: { type: "string", example: null },
          isFinalSubmitted: { type: "boolean", example: false },
          isLocked: { type: "boolean", example: false },
          needsReview: { type: "boolean", example: false },
        },
      },
      PrinterRequest: {
        type: "object",
        required: ["printerName"],
        properties: {
          branchId: { type: "string", example: "6346c3abf048eeecec3bc41f", description: "Branch ObjectId" },
          printerId: { type: "string", example: "PS-LR-003", description: "Printer Identifier" },
          printerName: { type: "string", example: "CANON TX5300", description: "Printer Name" },
          printerType: { type: "string", example: "Laser" },
          brand: { type: "string", example: "Canon" },
          model: { type: "string", example: "TX5300" },
          customServices: { type: "array", items: { type: "string" }, example: ["SCAN", "TOTAL"] },
          prices: { type: "array", items: { type: "number" }, example: [10, 10] },
          rates: { type: "object", example: { A4_BW: 2, A4_COLOR: 10 } },
          colorRates: { type: "object", example: { A4: 10, A3: 20 } },
          bwRates: { type: "object", example: { A4: 2, A3: 4 } },
          location: { type: "string", example: "Banaswadi" },
          status: { type: "string", enum: ["Active", "Inactive", "Under Maintenance"], example: "Active" },
          isActive: { type: "boolean", example: true },
        },
      },
      PrinterUpdateRequest: {
        type: "object",
        properties: {
          branchId: { type: "string", example: "6346c3abf048eeecec3bc41f" },
          printerId: { type: "string", example: "PS-LR-003" },
          printerName: { type: "string", example: "CANON TX5300" },
          printerType: { type: "string", example: "Laser" },
          brand: { type: "string", example: "Canon" },
          model: { type: "string", example: "TX5300" },
          customServices: { type: "array", items: { type: "string" }, example: ["SCAN", "TOTAL"] },
          prices: { type: "array", items: { type: "number" }, example: [10, 10] },
          rates: { type: "object", example: { A4_BW: 2, A4_COLOR: 10 } },
          colorRates: { type: "object", example: { A4: 10, A3: 20 } },
          bwRates: { type: "object", example: { A4: 2, A3: 4 } },
          location: { type: "string", example: "Banaswadi" },
          status: { type: "string", enum: ["Active", "Inactive", "Under Maintenance"], example: "Active" },
          isActive: { type: "boolean", example: true },
        },
      },
      StockItemRequest: {
        type: "object",
        required: ["itemName"],
        properties: {
          branchId: { type: "string", example: "90de925fff02b4a3fcb27926", description: "Branch ObjectId" },
          stockId: { type: "string", example: "PS69", description: "Stock SKU/Code" },
          itemName: { type: "string", example: "BACKLIT FRAME A1 SIZE WITH FRAME" },
          category: { type: "string", example: "FRAME" },
          description: { type: "string", example: "" },
          amount: { type: "number", example: 9999 },
          qty: { type: "number", example: 10 },
          stockType: { type: "string", example: "consumable" },
          unit: { type: "string", example: "pcs" },
          minThreshold: { type: "number", example: 10 },
          branchName: { type: "string", example: "Banaswadi" },
          status: { type: "string", example: "Active" },
        },
      },
      StockItemUpdateRequest: {
        type: "object",
        properties: {
          branchId: { type: "string", example: "90de925fff02b4a3fcb27926" },
          stockId: { type: "string", example: "PS69" },
          itemName: { type: "string", example: "BACKLIT FRAME A1 SIZE WITH FRAME" },
          category: { type: "string", example: "FRAME" },
          description: { type: "string", example: "" },
          amount: { type: "number", example: 9999 },
          qty: { type: "number", example: 10 },
          stockType: { type: "string", example: "consumable" },
          unit: { type: "string", example: "pcs" },
          minThreshold: { type: "number", example: 10 },
          branchName: { type: "string", example: "Banaswadi" },
          status: { type: "string", example: "Active" },
        },
      },
      StockReadingRequest: {
        type: "object",
        required: ["date"],
        properties: {
          branchId: { type: "string", example: "6346c3abf048eeecec3bc41f", description: "Branch ObjectId" },
          branchName: { type: "string", example: "Banaswadi" },
          date: { type: "string", example: "2025-09-01" },
          stocks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                stockId: { type: "string", example: "PS106" },
                itemName: { type: "string", example: "A3 GLASS FRAME WITHOUT PRINT" },
                openingStock: { type: "number", example: 2 },
                addedStock: { type: "number", example: 0 },
                closingStock: { type: "number", example: 2 },
                sold: { type: "number", example: 0 },
                amount: { type: "number", example: 790 },
              },
            },
            example: [
              {
                stockId: "PS106",
                itemName: "A3 GLASS FRAME WITHOUT PRINT",
                openingStock: 2,
                addedStock: 0,
                closingStock: 2,
                sold: 0,
                amount: 790,
              },
            ],
          },
          totalAmount: { type: "number", example: 570 },
          userId: { type: "string", example: "LbY2o5uEsjXivyCUtiHmMRdpBQd2" },
          isFinalSubmitted: { type: "boolean", example: false },
          isLocked: { type: "boolean", example: false },
          needsReview: { type: "boolean", example: false },
        },
      },
      StockReadingUpdateRequest: {
        type: "object",
        properties: {
          branchId: { type: "string", example: "6346c3abf048eeecec3bc41f" },
          branchName: { type: "string", example: "Banaswadi" },
          date: { type: "string", example: "2025-09-01" },
          stocks: { type: "array", items: { type: "object" } },
          totalAmount: { type: "number", example: 570 },
          userId: { type: "string", example: "LbY2o5uEsjXivyCUtiHmMRdpBQd2" },
          isFinalSubmitted: { type: "boolean", example: false },
          isLocked: { type: "boolean", example: false },
          needsReview: { type: "boolean", example: false },
        },
      },
      TotalAmountRequest: {
        type: "object",
        required: ["date"],
        properties: {
          branchId: { type: "string", example: "d5b8e416e73ab3ca1f2fc958", description: "Branch ObjectId" },
          branchName: { type: "string", example: "Banaswadi" },
          date: { type: "string", example: "2026-07-28" },
          totalAmount: { type: "number", example: 13185 },
          cash: { type: "number", example: 1532 },
          online: { type: "number", example: 11659 },
          balance: { type: "number", example: 0 },
          expenses: { type: "number", example: 0 },
          rows: {
            type: "array",
            items: { type: "object" },
            example: [
              {
                amount: 4857,
                itemName: "TOTAL CANON 8986",
                key: "printer_PS-BA-008",
                printerId: "PS-BA-008",
                type: "printer",
                printerRef: "556b742530528a4301fe7198",
              },
            ],
          },
          previousBalanceRows: { type: "array", items: { type: "object" }, example: [] },
          userId: { type: "string", example: "LIlHUrBKK9hWpNgXNXOjyopMiLg2" },
          isFinalSubmitted: { type: "boolean", example: false },
          isLocked: { type: "boolean", example: false },
          needsReview: { type: "boolean", example: false },
        },
      },
      TotalAmountUpdateRequest: {
        type: "object",
        properties: {
          branchId: { type: "string", example: "d5b8e416e73ab3ca1f2fc958" },
          branchName: { type: "string", example: "Banaswadi" },
          date: { type: "string", example: "2026-07-28" },
          totalAmount: { type: "number", example: 13185 },
          cash: { type: "number", example: 1532 },
          online: { type: "number", example: 11659 },
          balance: { type: "number", example: 0 },
          expenses: { type: "number", example: 0 },
          rows: { type: "array", items: { type: "object" } },
          previousBalanceRows: { type: "array", items: { type: "object" } },
          userId: { type: "string", example: "LIlHUrBKK9hWpNgXNXOjyopMiLg2" },
          isFinalSubmitted: { type: "boolean", example: false },
          isLocked: { type: "boolean", example: false },
          needsReview: { type: "boolean", example: false },
        },
      },
      UserCreateRequest: {
        type: "object",
        required: ["name", "email", "password", "role"],
        properties: {
          name: { type: "string", example: "Manager Banaswadi" },
          email: { type: "string", example: "manager@printz.shop" },
          password: { type: "string", example: "Manager@123" },
          role: { type: "string", enum: ["admin", "manager"], example: "manager" },
          branch: { type: "string", example: "Banaswadi" },
          branchId: { type: "string", example: "6346c3abf048eeecec3bc41f" },
          location: { type: "string", example: "Bangalore" },
          phone: { type: "string", example: "9876543210" },
          permissions: {
            type: "object",
            example: {
              printers: { read: true, create: true, update: true, delete: false },
              printerReadings: { read: true, create: true, update: true, delete: false },
            },
          },
        },
      },
      UserUpdateRequest: {
        type: "object",
        properties: {
          name: { type: "string", example: "Manager Banaswadi" },
          email: { type: "string", example: "manager@printz.shop" },
          password: { type: "string", example: "Manager@123" },
          role: { type: "string", enum: ["admin", "manager"], example: "manager" },
          branch: { type: "string", example: "Banaswadi" },
          branchId: { type: "string", example: "6346c3abf048eeecec3bc41f" },
          location: { type: "string", example: "Bangalore" },
          phone: { type: "string", example: "9876543210" },
          permissions: {
            type: "object",
            example: {
              printers: { read: true, create: true, update: true, delete: false },
              printerReadings: { read: true, create: true, update: true, delete: false },
            },
          },
          isActive: { type: "boolean", example: true },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: {
          200: { description: "Login successful with JWT token" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Authentication"],
        security: [{ bearerAuth: [] }, {}],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LogoutRequest" },
            },
          },
        },
        responses: {
          200: { description: "Logged out successfully" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Authentication"],
        responses: {
          200: { description: "Profile data" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Authentication"],
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshTokenRequest" } } },
        },
        responses: {
          200: { description: "Token refreshed successfully with new Access & Refresh tokens" },
          400: { description: "Refresh token missing or malformed" },
          401: { description: "Refresh token expired or invalid" },
        },
      },
    },
    "/api/branches": {
      get: {
        tags: ["Branches"],
        responses: { 200: { description: "Branches list" }, 401: { description: "Unauthorized" } },
      },
      post: {
        tags: ["Branches"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/BranchRequest" } } },
        },
        responses: {
          201: { description: "Branch created" },
          400: { description: "Bad Request" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          409: { description: "Conflict - Duplicate name or code" },
        },
      },
    },
    "/api/branches/{id}": {
      get: {
        tags: ["Branches"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Branch details" },
          400: { description: "Invalid branch ID format" },
          401: { description: "Unauthorized" },
          404: { description: "Branch not found" },
        },
      },
      put: {
        tags: ["Branches"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/BranchRequest" } } },
        },
        responses: {
          200: { description: "Branch updated" },
          400: { description: "Invalid branch ID format" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Branch not found" },
          409: { description: "Conflict - Duplicate name or code" },
        },
      },
      patch: {
        tags: ["Branches"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/BranchRequest" } } },
        },
        responses: {
          200: { description: "Branch updated" },
          400: { description: "Invalid branch ID format" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Branch not found" },
          409: { description: "Conflict - Duplicate name or code" },
        },
      },
      delete: {
        tags: ["Branches"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Branch deleted" },
          400: { description: "Invalid branch ID format" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Branch not found" },
        },
      },
    },
    "/api/general/categories": {
      get: {
        tags: ["Categories"],
        responses: { 200: { description: "Categories list" } },
      },
      post: {
        tags: ["Categories"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CategoryRequest" } } },
        },
        responses: { 201: { description: "Category created" } },
      },
    },
    "/api/general/finalized-dates": {
      get: {
        tags: ["Categories"],
        parameters: [{ name: "branchName", in: "query", schema: { type: "string" } }],
        responses: { 200: { description: "List of finalized dates" } },
      },
      post: {
        tags: ["Categories"],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { 201: { description: "Finalized" } },
      },
    },
    "/api/jumbo-xerox/machines": {
      get: {
        tags: ["Jumbo Xerox"],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Filter by branch ObjectId" },
          { name: "printerId", in: "query", schema: { type: "string" }, description: "Filter by printer ID" },
          { name: "size", in: "query", schema: { type: "string" }, description: "Filter by print size" },
          { name: "type", in: "query", schema: { type: "string" }, description: "Filter by print type" },
          { name: "isActive", in: "query", schema: { type: "boolean" }, description: "Filter by active status" },
        ],
        responses: { 200: { description: "List of machines" } },
      },
      post: {
        tags: ["Jumbo Xerox"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/JumboXeroxMachineRequest" } } },
        },
        responses: { 201: { description: "Machine created successfully" } },
      },
    },
    "/api/jumbo-xerox/machines/{id}": {
      get: {
        tags: ["Jumbo Xerox"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Machine details" } },
      },
      put: {
        tags: ["Jumbo Xerox"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/JumboXeroxMachineRequest" } } },
        },
        responses: { 200: { description: "Machine updated successfully" } },
      },
      delete: {
        tags: ["Jumbo Xerox"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Machine deleted successfully" } },
      },
    },
    "/api/jumbo-xerox/readings": {
      get: {
        tags: ["Jumbo Xerox"],
        parameters: [
          { name: "branchName", in: "query", schema: { type: "string" } },
          { name: "date", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "List of readings" } },
      },
      post: {
        tags: ["Jumbo Xerox"],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { 201: { description: "Saved" } },
      },
    },
    "/api/jumbo-xerox/readings/{id}": {
      delete: {
        tags: ["Jumbo Xerox"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Deleted" } },
      },
    },
    "/api/past-date-requests": {
      get: {
        tags: ["Past Date Requests"],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Filter by branch ObjectId" },
          { name: "requestedBranch", in: "query", schema: { type: "string" }, description: "Filter by branch name or code" },
          { name: "status", in: "query", schema: { type: "string", enum: ["Pending", "Approved", "Rejected"] } },
          { name: "requestedDate", in: "query", schema: { type: "string" }, description: "Filter by date (YYYY-MM-DD)" },
          { name: "type", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Requests list" } },
      },
      post: {
        tags: ["Past Date Requests"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PastDateRequest" } } },
        },
        responses: { 201: { description: "Past date request submitted successfully" } },
      },
    },
    "/api/past-date-requests/{id}": {
      get: {
        tags: ["Past Date Requests"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Request retrieved successfully" } },
      },
      put: {
        tags: ["Past Date Requests"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PastDateRequestUpdateRequest" } } },
        },
        responses: { 200: { description: "Past date request updated successfully" } },
      },
      delete: {
        tags: ["Past Date Requests"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Past date request deleted successfully" } },
      },
    },
    "/api/payments": {
      get: {
        tags: ["Payments to Collect"],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Filter by branch ObjectId" },
          { name: "branchName", in: "query", schema: { type: "string" }, description: "Filter by branch name / code" },
          { name: "date", in: "query", schema: { type: "string" }, description: "Filter by date (YYYY-MM-DD)" },
        ],
        responses: { 200: { description: "Payments list" } },
      },
      post: {
        tags: ["Payments to Collect"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentRequest" } } },
        },
        responses: { 201: { description: "Payment record created successfully" } },
      },
    },
    "/api/payments/{id}": {
      get: {
        tags: ["Payments to Collect"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Payment record retrieved successfully" } },
      },
      put: {
        tags: ["Payments to Collect"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentUpdateRequest" } } },
        },
        responses: { 200: { description: "Payment record updated successfully" } },
      },
      delete: {
        tags: ["Payments to Collect"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Payment record deleted successfully" } },
      },
    },
    "/api/printer-readings": {
      get: {
        tags: ["Printer Readings"],
        parameters: [
          { name: "branchName", in: "query", schema: { type: "string" } },
          { name: "date", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Readings list" } },
      },
      post: {
        tags: ["Printer Readings"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PrinterReadingRequest" } } },
        },
        responses: { 201: { description: "Printer reading saved successfully" } },
      },
    },
    "/api/printer-readings/{id}": {
      get: {
        tags: ["Printer Readings"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Printer reading retrieved successfully" } },
      },
      put: {
        tags: ["Printer Readings"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PrinterReadingUpdateRequest" } } },
        },
        responses: { 200: { description: "Printer reading updated successfully" } },
      },
      delete: {
        tags: ["Printer Readings"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Reading deleted" } },
      },
    },
    "/api/printers": {
      get: {
        tags: ["Printers"],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Filter by branch ObjectId" },
          { name: "branchName", in: "query", schema: { type: "string" }, description: "Filter by branch name" },
          { name: "status", in: "query", schema: { type: "string" }, description: "Filter by status (Active/Inactive)" },
        ],
        responses: { 200: { description: "List of printers" } },
      },
      post: {
        tags: ["Printers"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PrinterRequest" } } },
        },
        responses: { 201: { description: "Printer registered successfully" } },
      },
    },
    "/api/printers/{id}": {
      get: {
        tags: ["Printers"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Printer ObjectId or printerId (e.g. PS-LR-003)" }],
        responses: { 200: { description: "Printer details" }, 404: { description: "Not found" } },
      },
      put: {
        tags: ["Printers"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Printer ObjectId or printerId" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PrinterUpdateRequest" } } },
        },
        responses: { 200: { description: "Printer updated successfully" } },
      },
      delete: {
        tags: ["Printers"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Printer ObjectId or printerId" }],
        responses: { 200: { description: "Printer deleted successfully" } },
      },
    },
    "/api/reports/dashboard-summary": {
      get: {
        tags: ["Reports & KPIs"],
        parameters: [
          { name: "dates", in: "query", schema: { type: "string" }, description: "Comma-separated dates" },
          { name: "branches", in: "query", schema: { type: "string" }, description: "Comma-separated branches" },
        ],
        responses: { 200: { description: "Dashboard summary aggregates" } },
      },
    },
    "/api/reports/monthly-revenue": {
      get: {
        tags: ["Reports & KPIs"],
        parameters: [
          { name: "year", in: "query", schema: { type: "string" }, description: "Target year (e.g. 2026)" },
          { name: "branchName", in: "query", schema: { type: "string" }, description: "Optional branch name" },
        ],
        responses: { 200: { description: "Monthly revenue breakdown" } },
      },
    },
    "/api/stocks/items": {
      get: {
        tags: ["Stocks"],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Filter by branch ObjectId" },
          { name: "branchName", in: "query", schema: { type: "string" }, description: "Filter by branch name" },
          { name: "category", in: "query", schema: { type: "string" }, description: "Filter by item category" },
        ],
        responses: { 200: { description: "Items list" } },
      },
      post: {
        tags: ["Stocks"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/StockItemRequest" } } },
        },
        responses: { 201: { description: "Stock item saved successfully" } },
      },
    },
    "/api/stocks/items/{id}": {
      get: {
        tags: ["Stocks"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Stock item details" }, 404: { description: "Not found" } },
      },
      put: {
        tags: ["Stocks"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/StockItemUpdateRequest" } } },
        },
        responses: { 200: { description: "Stock item updated successfully" } },
      },
      delete: {
        tags: ["Stocks"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Stock item deleted successfully" } },
      },
    },
    "/api/stocks/readings": {
      get: {
        tags: ["Stocks"],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Filter by branch ObjectId" },
          { name: "branchName", in: "query", schema: { type: "string" }, description: "Filter by branch name" },
          { name: "date", in: "query", schema: { type: "string" }, description: "Filter by date (YYYY-MM-DD)" },
        ],
        responses: { 200: { description: "Stock readings list" } },
      },
      post: {
        tags: ["Stocks"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/StockReadingRequest" } } },
        },
        responses: { 201: { description: "Stock reading saved successfully" } },
      },
    },
    "/api/stocks/readings/{id}": {
      get: {
        tags: ["Stocks"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Stock reading details" }, 404: { description: "Not found" } },
      },
      put: {
        tags: ["Stocks"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/StockReadingUpdateRequest" } } },
        },
        responses: { 200: { description: "Stock reading updated successfully" } },
      },
      delete: {
        tags: ["Stocks"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Stock reading deleted successfully" } },
      },
    },
    "/api/total-amounts": {
      get: {
        tags: ["Revenue & Total Amounts"],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Filter by branch ObjectId" },
          { name: "branchName", in: "query", schema: { type: "string" }, description: "Filter by branch name" },
          { name: "date", in: "query", schema: { type: "string" }, description: "Filter by date (YYYY-MM-DD)" },
        ],
        responses: { 200: { description: "Total amounts list" } },
      },
      post: {
        tags: ["Revenue & Total Amounts"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/TotalAmountRequest" } } },
        },
        responses: { 201: { description: "Saved" } },
      },
    },
    "/api/total-amounts/{id}": {
      get: {
        tags: ["Revenue & Total Amounts"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Reading details" } },
      },
      put: {
        tags: ["Revenue & Total Amounts"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/TotalAmountUpdateRequest" } } },
        },
        responses: { 200: { description: "Reading updated" } },
      },
      delete: {
        tags: ["Revenue & Total Amounts"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Deleted" } },
      },
    },
    "/api/users": {
      get: {
        tags: ["Users & RBAC"],
        parameters: [
          { name: "role", in: "query", schema: { type: "string", enum: ["admin", "manager"] } },
          { name: "branch", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Array of users" },
          403: { description: "Forbidden" },
        },
      },
      post: {
        tags: ["Users & RBAC"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UserCreateRequest" } } },
        },
        responses: {
          201: { description: "User created" },
          400: { description: "Validation error" },
        },
      },
    },
    "/api/users/{id}": {
      get: {
        tags: ["Users & RBAC"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "User found" }, 404: { description: "Not found" } },
      },
      put: {
        tags: ["Users & RBAC"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UserUpdateRequest" } } },
        },
        responses: { 200: { description: "User updated" } },
      },
      delete: {
        tags: ["Users & RBAC"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "User deleted" } },
      },
    },
    "/api/general/sales": {
      get: {
        tags: ["Sales"],
        summary: "List sales records with optional branch and date filters",
        parameters: [
          { name: "branchName", in: "query", schema: { type: "string" } },
          { name: "branchID", in: "query", schema: { type: "string" } },
          { name: "date", in: "query", schema: { type: "string" } },
          { name: "startDate", in: "query", schema: { type: "string" } },
          { name: "endDate", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Sales records retrieved successfully" },
        },
      },
      post: {
        tags: ["Sales"],
        summary: "Record a new sale transaction",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["branchID", "invoiceNo", "date", "itemsSold"],
                properties: {
                  branchID: { type: "string", example: "BR001" },
                  branchName: { type: "string", example: "Main Branch" },
                  managerID: { type: "string", example: "66f49a1b2c3d4e5f6a7b8c99" },
                  invoiceNo: { type: "string", example: "K8X9A21BC" },
                  date: { type: "string", example: "2026-10-02" },
                  itemsSold: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["itemID", "name", "quantity", "unitPrice"],
                      properties: {
                        itemID: { type: "string", example: "stk_101" },
                        name: { type: "string", example: "A4 Paper" },
                        quantity: { type: "number", example: 2 },
                        unitPrice: { type: "number", example: 150 },
                        totalAmount: { type: "number", example: 300 },
                      },
                    },
                  },
                  subtotal: { type: "number", example: 300 },
                  gst: { type: "number", example: 54 },
                  grandTotal: { type: "number", example: 354 },
                  totalAmount: { type: "number", example: 354 },
                  paymentStatus: { type: "string", enum: ["Paid", "Pending", "Cancelled"], default: "Paid" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Sale recorded successfully" },
          400: { description: "Validation error" },
          409: { description: "Invoice number already exists" },
        },
      },
    },
    "/api/general/sales/{id}": {
      get: {
        tags: ["Sales"],
        summary: "Get sale details by ID or Invoice Number",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Sale found" },
          404: { description: "Sale not found" },
        },
      },
    },
  },
};

module.exports = swaggerDocument;
