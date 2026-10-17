/**
 * Employee, Department, and Designation Master Swagger Documentation
 */

module.exports = {
  tags: [
    { name: "Employees" },
    { name: "Departments" },
    { name: "Designations" },
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
        departmentId: { $ref: "#/components/schemas/ObjectId", nullable: true, description: "Assigned department ObjectId" },
        designationId: { $ref: "#/components/schemas/ObjectId", nullable: true, description: "Assigned designation ObjectId" },
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
        departmentId: { $ref: "#/components/schemas/ObjectId" },
        designationId: { $ref: "#/components/schemas/ObjectId" },
        roleId: { $ref: "#/components/schemas/ObjectId" },
        reportingManagerId: { $ref: "#/components/schemas/ObjectId" },
        employmentStatus: { type: "string", enum: ["ACTIVE", "INACTIVE", "LEFT"], example: "ACTIVE" },
        isActive: { type: "boolean", example: true },
      },
    },
    DepartmentRequest: {
      type: "object",
      required: ["name", "code"],
      properties: {
        name: { type: "string", example: "Design & Creative", description: "Department name" },
        code: { type: "string", example: "DES", description: "Unique department code" },
        description: { type: "string", example: "Graphic and pre-press design department" },
        isActive: { type: "boolean", example: true },
      },
    },
    DesignationRequest: {
      type: "object",
      required: ["name", "code"],
      properties: {
        name: { type: "string", example: "Senior Designer", description: "Designation title" },
        code: { type: "string", example: "SR_DES", description: "Unique designation code" },
        departmentId: { $ref: "#/components/schemas/ObjectId", nullable: true },
        level: { type: "number", example: 3, description: "Seniority hierarchy level" },
        description: { type: "string", example: "Senior graphic design lead" },
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
        description: "Retrieves employees filtered by branch, department, designation, and active status.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "departmentId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "designationId", in: "query", schema: { $ref: "#/components/schemas/ObjectId" } },
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
    "/departments": {
      get: {
        tags: ["Departments"],
        summary: "List Departments",
        operationId: "listDepartments",
        description: "Retrieves all company organizational departments.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of departments",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["Departments"],
        summary: "Create Department",
        operationId: "createDepartment",
        description: "Creates a new organizational department record.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/DepartmentRequest" } } },
        },
        responses: {
          201: {
            description: "Department created successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/departments/{id}": {
      get: {
        tags: ["Departments"],
        summary: "Get Department by ID",
        operationId: "getDepartmentById",
        description: "Retrieves a department record by ObjectId.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Department retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      put: {
        tags: ["Departments"],
        summary: "Replace Department",
        operationId: "replaceDepartment",
        description: "Fully replaces department information.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/DepartmentRequest" } } },
        },
        responses: {
          200: {
            description: "Department updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      patch: {
        tags: ["Departments"],
        summary: "Update Department",
        operationId: "updateDepartment",
        description: "Partially updates department fields.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/DepartmentRequest" } } },
        },
        responses: {
          200: {
            description: "Department updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/departments/{id}/activate": {
      post: {
        tags: ["Departments"],
        summary: "Activate Department",
        operationId: "activateDepartment",
        description: "Reactivates a deactivated department.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Department activated successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/departments/{id}/deactivate": {
      post: {
        tags: ["Departments"],
        summary: "Deactivate Department",
        operationId: "deactivateDepartment",
        description: "Deactivates a department from active assignment.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Department deactivated successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/designations": {
      get: {
        tags: ["Designations"],
        summary: "List Designations",
        operationId: "listDesignations",
        description: "Retrieves all company organizational designations.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of designations",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["Designations"],
        summary: "Create Designation",
        operationId: "createDesignation",
        description: "Creates a new job designation record.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/DesignationRequest" } } },
        },
        responses: {
          201: {
            description: "Designation created successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/designations/{id}": {
      get: {
        tags: ["Designations"],
        summary: "Get Designation by ID",
        operationId: "getDesignationById",
        description: "Retrieves designation details by ObjectId.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Designation retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      put: {
        tags: ["Designations"],
        summary: "Replace Designation",
        operationId: "replaceDesignation",
        description: "Fully replaces designation properties.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/DesignationRequest" } } },
        },
        responses: {
          200: {
            description: "Designation replaced",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      patch: {
        tags: ["Designations"],
        summary: "Update Designation",
        operationId: "updateDesignation",
        description: "Partially updates designation properties.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/DesignationRequest" } } },
        },
        responses: {
          200: {
            description: "Designation updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/designations/{id}/activate": {
      post: {
        tags: ["Designations"],
        summary: "Activate Designation",
        operationId: "activateDesignation",
        description: "Reactivates a deactivated designation.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Designation activated successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/designations/{id}/deactivate": {
      post: {
        tags: ["Designations"],
        summary: "Deactivate Designation",
        operationId: "deactivateDesignation",
        description: "Deactivates a designation from active assignment.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Designation deactivated successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
  },
};
