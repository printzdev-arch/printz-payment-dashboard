/**
 * Employee Swagger Documentation
 */

module.exports = {
  tags: [
    { name: "Employees" },
  ],
  schemas: {
    EmployeeRequest: {
      type: "object",
      required: ["name", "mobile", "email", "branchId"],
      properties: {
        name: { type: "string", example: "Anita Sharma", description: "Employee full name" },
        mobile: { type: "string", example: "9876543210", description: "10-digit mobile number" },
        email: { type: "string", format: "email", example: "anita@printz.in", description: "Employee email address" },
        address: { type: "string", example: "123 Main Street, Bangalore", description: "Residential address" },
        joiningDate: { type: "string", format: "date", example: "2026-10-08", description: "Date of joining" },
        branchId: { $ref: "#/components/schemas/ObjectId", description: "Primary branch ObjectId" },
        roleId: { $ref: "#/components/schemas/ObjectId", nullable: true, description: "Primary functional role ObjectId" },
        reportingManagerId: { $ref: "#/components/schemas/ObjectId", nullable: true, description: "Reporting manager Employee ObjectId" },
        employmentStatus: { type: "string", enum: ["ACTIVE", "INACTIVE", "LEFT"], example: "ACTIVE" },
        isActive: { type: "boolean", example: true },
      },
    },
    EmployeePatchRequest: {
      type: "object",
      properties: {
        name: { type: "string", example: "Anita Sharma" },
        mobile: { type: "string", example: "9876543210" },
        email: { type: "string", format: "email", example: "anita@printz.in" },
        address: { type: "string", example: "456 Residency Road, Bangalore" },
        joiningDate: { type: "string", format: "date", example: "2026-10-08" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        roleId: { $ref: "#/components/schemas/ObjectId" },
        reportingManagerId: { $ref: "#/components/schemas/ObjectId" },
        employmentStatus: { type: "string", enum: ["ACTIVE", "INACTIVE", "LEFT"], example: "ACTIVE" },
        isActive: { type: "boolean", example: true },
      },
    },
  },
  paths: {
    "/employees": {
      get: {
        tags: ["Employees"],
        summary: "List Employees",
        operationId: "listEmployees",
        description: "Retrieves employees filtered by branch, role and active status.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE", "LEFT"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: {
            description: "Employees retrieved successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["Employees"],
        summary: "Create Employee",
        operationId: "createEmployee",
        description: "Registers a new employee master record with assigned branch and roles.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/EmployeeRequest" } } },
        },
        responses: {
          201: {
            description: "Employee created successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/employees/{id}": {
      get: {
        tags: ["Employees"],
        summary: "Get Employee by ID",
        operationId: "getEmployeeById",
        description: "Retrieves detailed employee profile by MongoDB ObjectId.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Employee found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
          404: {
            description: "Employee not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } },
          },
        },
      },
      patch: {
        tags: ["Employees"],
        summary: "Update Employee",
        operationId: "updateEmployee",
        description: "Partially updates an existing employee profile.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/EmployeePatchRequest" } } },
        },
        responses: {
          200: {
            description: "Employee updated successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/employees/{id}/deactivate": {
      post: {
        tags: ["Employees"],
        summary: "Deactivate Employee",
        operationId: "deactivateEmployee",
        description: "Deactivates an employee account and revokes active system assignments.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Employee deactivated successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
  },
};
