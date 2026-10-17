/**
 * API - Customer Master Management & Quick Lookup Swagger / OpenAPI Spec
 */

module.exports = {
  tags: [
    { name: "Customers", description: "Customer Master Management & Quick POS/Job Lookup" },
  ],
  schemas: {
    CustomerTypeEnum: {
      type: "string",
      enum: ["WALK_IN", "B2B", "REGULAR"],
      example: "WALK_IN",
      description: "Classification of customer profile",
    },
    CustomerResponse: {
      type: "object",
      properties: {
        _id: { $ref: "#/components/schemas/ObjectId" },
        customerCode: { type: "string", example: "CUST-00001", description: "Sequential code" },
        name: { type: "string", example: "Acme Corporation" },
        mobile: { type: "string", example: "9876543210" },
        email: { type: "string", example: "contact@acme.com", nullable: true },
        gstin: { type: "string", example: "33AABCT1332L1ZV", nullable: true },
        address: { type: "string", example: "123 Anna Salai, Chennai", nullable: true },
        customerType: { $ref: "#/components/schemas/CustomerTypeEnum" },
        creditLimit: { type: "number", example: 50000 },
        outstandingBalance: { type: "number", example: 12500 },
        branchId: { $ref: "#/components/schemas/ObjectId", nullable: true },
        isActive: { type: "boolean", example: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    CustomerCreateRequest: {
      type: "object",
      required: ["name", "mobile"],
      properties: {
        customerCode: { type: "string", example: "CUST-00001", description: "Optional explicit code" },
        name: { type: "string", example: "Acme Corporation" },
        mobile: { type: "string", example: "9876543210" },
        email: { type: "string", example: "contact@acme.com" },
        gstin: { type: "string", example: "33AABCT1332L1ZV" },
        address: { type: "string", example: "123 Anna Salai, Chennai" },
        customerType: { $ref: "#/components/schemas/CustomerTypeEnum" },
        creditLimit: { type: "number", example: 50000, default: 0 },
        branchId: { $ref: "#/components/schemas/ObjectId", description: "Branch assignment" },
        isActive: { type: "boolean", default: true },
      },
    },
    CustomerUpdateRequest: {
      type: "object",
      properties: {
        name: { type: "string", example: "Acme Corporation Pvt Ltd" },
        mobile: { type: "string", example: "9876543210" },
        email: { type: "string", example: "billing@acme.com" },
        gstin: { type: "string", example: "33AABCT1332L1ZV" },
        address: { type: "string", example: "123 Anna Salai, Chennai 600002" },
        customerType: { $ref: "#/components/schemas/CustomerTypeEnum" },
        creditLimit: { type: "number", example: 75000 },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        isActive: { type: "boolean" },
      },
    },
  },
  paths: {
    "/customers": {
      get: {
        tags: ["Customers"],
        summary: "List customers with pagination and filtering",
        operationId: "getCustomers",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "customerType", in: "query", schema: { $ref: "#/components/schemas/CustomerTypeEnum" } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
          { name: "branchId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "q", in: "query", schema: { type: "string" }, description: "Search by name, mobile, code, or GSTIN" },
        ],
        responses: {
          200: { description: "Customers list retrieved successfully" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
      post: {
        tags: ["Customers"],
        summary: "Register new customer",
        operationId: "createCustomer",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CustomerCreateRequest" },
            },
          },
        },
        responses: {
          201: { description: "Customer created successfully" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          409: { description: "Duplicate customerCode" },
        },
      },
    },
    "/customers/search": {
      get: {
        tags: ["Customers"],
        summary: "Search centralized customer master across all branches",
        description: "Searches active customer master records across all branches by name, normalized mobile/phone, email, customerCode, or company name. Returns safe customer fields for Job Cart, POS, and Job Order creation. Excludes sensitive internal financial data.",
        operationId: "searchCustomers",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search keyword matching name, mobile number, code, email, or company name" },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 }, description: "Result limit (1-100)" },
        ],
        responses: {
          200: {
            description: "Matching customer records returned across all branches",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/CustomerResponse" },
                    },
                    message: { type: "string", example: "Customer search completed" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/customers/{id}": {
      get: {
        tags: ["Customers"],
        summary: "Get customer by ID",
        operationId: "getCustomerById",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: { description: "Customer details retrieved" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Customer not found" },
        },
      },
      patch: {
        tags: ["Customers"],
        summary: "Update customer details",
        operationId: "updateCustomer",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CustomerUpdateRequest" },
            },
          },
        },
        responses: {
          200: { description: "Customer updated successfully" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Customer not found" },
        },
      },
      delete: {
        tags: ["Customers"],
        summary: "Delete customer",
        operationId: "deleteCustomer",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: { description: "Customer deleted successfully" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Customer not found" },
        },
      },
    },
    "/customers/{id}/deactivate": {
      post: {
        tags: ["Customers"],
        summary: "Deactivate customer",
        operationId: "deactivateCustomer",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: { description: "Customer deactivated successfully" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Customer not found" },
        },
      },
    },
    "/customers/{id}/activate": {
      post: {
        tags: ["Customers"],
        summary: "Reactivate customer",
        operationId: "activateCustomer",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: { description: "Customer activated successfully" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Customer not found" },
        },
      },
    },
  },
};
