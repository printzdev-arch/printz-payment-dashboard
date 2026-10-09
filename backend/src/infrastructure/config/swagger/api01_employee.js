/**
 * API - Employee Master Swagger
 */

module.exports = {
  tags: [
    { name: "API — Employee Master" },
  ],
  schemas: {
    EmployeeRequest: {
      type: "object",
      required: ["name", "mobile", "email", "branchId"],
      properties: {
        name: { type: "string", example: "Anita Sharma", description: "Employee full name" },
        mobile: { type: "string", example: "9876543210", description: "10-digit mobile number" },
        email: { type: "string", example: "anita@printz.in", description: "Employee work or personal email" },
        address: { type: "string", example: "123 Main Street, Bangalore", description: "Residential address" },
        joiningDate: { type: "string", format: "date", example: "2026-10-08", description: "Date of joining (defaults to today)" },
        branchId: { $ref: "#/components/schemas/ObjectId", description: "Primary branch assignment ObjectId" },
        departmentId: { $ref: "#/components/schemas/ObjectId", nullable: true, description: "Assigned department ObjectId" },
        designationId: { $ref: "#/components/schemas/ObjectId", nullable: true, description: "Assigned designation ObjectId" },
        roleId: { $ref: "#/components/schemas/ObjectId", nullable: true, description: "Primary functional role ObjectId" },
        reportingManagerId: { $ref: "#/components/schemas/ObjectId", nullable: true, description: "Direct reporting manager Employee ObjectId" },
        employmentStatus: { type: "string", enum: ["ACTIVE", "INACTIVE", "LEFT"], example: "ACTIVE" },
        isActive: { type: "boolean", example: true },
      },
    },
  },
  paths: {
    "/employees": {
      get: {
        tags: ["API — Employee Master"],
        operationId: "getEmployees",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["API — Employee Master"],
        operationId: "createEmployee",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/EmployeeRequest" } } },
        },
        responses: {
          201: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/employees/{id}": {
      get: {
        tags: ["Employees"],
        operationId: "getEmployeeById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "",
          },
        },
      },
      put: {
        tags: ["Employees"],
        operationId: "updateEmployee",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/EmployeeRequest" } } },
        },
        responses: {
          200: {
            description: "",
          },
        },
      },
      patch: {
        tags: ["Employees"],
        operationId: "patchEmployee",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/EmployeeRequest" } } },
        },
        responses: {
          200: {
            description: "",
          },
        },
      },
    },
    "/employees/{id}/deactivate": {
      post: {
        tags: ["Employees"],
        operationId: "deactivateEmployee",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "",
          },
        },
      },
    },
    "/departments": {
      get: {
        tags: ["Departments"],
        operationId: "getDepartments",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "",
          },
        },
      },
      post: {
        tags: ["Departments"],
        operationId: "createDepartment",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "code"],
                properties: {
                  name: { type: "string", example: "Design & Creative" },
                  code: { type: "string", example: "DES" },
                  description: { type: "string", example: "Graphic and pre-press design department" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "",
          },
        },
      },
    },
    "/departments/{id}": {
      get: {
        tags: ["Departments"],
        operationId: "getDepartmentById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "",
          },
        },
      },
      put: {
        tags: ["Departments"],
        operationId: "updateDepartment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Design & Creative" },
                  code: { type: "string", example: "DES" },
                  description: { type: "string", example: "Graphic design department" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "",
          },
        },
      },
    },
    "/departments/{id}/activate": {
      patch: {
        tags: ["Departments"],
        operationId: "activateDepartment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "",
          },
        },
      },
    },
    "/departments/{id}/deactivate": {
      patch: {
        tags: ["Departments"],
        operationId: "deactivateDepartment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "",
          },
        },
      },
    },
    "/designations": {
      get: {
        tags: ["Designations"],
        operationId: "getDesignations",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "",
          },
        },
      },
      post: {
        tags: ["Designations"],
        operationId: "createDesignation",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "code"],
                properties: {
                  name: { type: "string", example: "Senior Graphic Designer" },
                  code: { type: "string", example: "SR_DES" },
                  departmentId: { $ref: "#/components/schemas/ObjectId" },
                  level: { type: "number", example: 2 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "",
          },
        },
      },
    },
    "/designations/{id}": {
      get: {
        tags: ["Designations"],
        operationId: "getDesignationById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "",
          },
        },
      },
      put: {
        tags: ["Designations"],
        operationId: "updateDesignation",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Senior Graphic Designer" },
                  code: { type: "string", example: "SR_DES" },
                  level: { type: "number", example: 3 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "",
          },
        },
      },
    },
    "/designations/{id}/activate": {
      patch: {
        tags: ["Designations"],
        operationId: "activateDesignation",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "",
          },
        },
      },
    },
    "/designations/{id}/deactivate": {
      patch: {
        tags: ["Designations"],
        operationId: "deactivateDesignation",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "",
          },
        },
      },
    },
  },
};
