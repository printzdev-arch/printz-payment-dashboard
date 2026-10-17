/**
 * Roles and Permissions Swagger Documentation
 */

module.exports = {
  tags: [{ name: "Roles & Permissions" }],
  schemas: {
    RoleRequest: {
      type: "object",
      required: ["roleCode", "roleName"],
      properties: {
        roleCode: { type: "string", example: "DESIGNER", description: "Unique uppercase role code" },
        roleName: { type: "string", example: "Graphic Designer", description: "Human-readable role name" },
        description: { type: "string", example: "Responsible for client artwork and sample approvals" },
        permissions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              permissionCode: { type: "string", example: "job.order.view" },
              scope: { type: "string", enum: ["SELF", "ASSIGNED", "BRANCH", "ALL"], example: "ASSIGNED" },
            },
          },
        },
      },
    },
    PermissionRequest: {
      type: "object",
      required: ["permissionCode", "module", "action"],
      properties: {
        permissionCode: { type: "string", example: "job.order.create" },
        module: { type: "string", example: "job-order" },
        action: { type: "string", example: "create" },
        description: { type: "string", example: "Permission to create custom job orders" },
      },
    },
  },
  paths: {
    "/permissions": {
      get: {
        tags: ["Roles & Permissions"],
        summary: "List Permissions",
        operationId: "listPermissions",
        description: "Retrieves all system access permissions defined across modules.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of system permissions",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/permissions/catalogue": {
      get: {
        tags: ["Roles & Permissions"],
        summary: "Get Permissions Catalogue",
        operationId: "getPermissionsCatalogue",
        description: "Retrieves complete categorized permission catalogue.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Permission catalogue retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/roles": {
      get: {
        tags: ["Roles & Permissions"],
        summary: "List Roles",
        operationId: "listRoles",
        description: "Retrieves all defined user roles and associated permission assignments.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of roles retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["Roles & Permissions"],
        summary: "Create Role",
        operationId: "createRole",
        description: "Creates a new system role with designated module permissions.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RoleRequest" } } },
        },
        responses: {
          201: {
            description: "Role created successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/roles/matrix": {
      get: {
        tags: ["Roles & Permissions"],
        summary: "Get Role Permission Matrix",
        operationId: "getRolePermissionMatrix",
        description: "Returns a cross-tabulated matrix of all roles against all system permissions.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Role permission matrix retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/roles/permissions": {
      get: {
        tags: ["Roles & Permissions"],
        summary: "Get Role Permissions",
        operationId: "getRolePermissions",
        description: "Returns assigned permissions for roles.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Role permissions retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/roles/permissions/catalogue": {
      get: {
        tags: ["Roles & Permissions"],
        summary: "Get Role Permissions Catalogue",
        operationId: "getRolePermissionsCatalogue",
        description: "Returns available granular permission tokens for role configuration.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Permissions catalogue retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/roles/{id}": {
      get: {
        tags: ["Roles & Permissions"],
        summary: "Get Role by ID",
        operationId: "getRoleById",
        description: "Retrieves a specific role definition by ObjectId.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Role details retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      put: {
        tags: ["Roles & Permissions"],
        summary: "Replace Role",
        operationId: "replaceRole",
        description: "Fully replaces an existing role and permission assignments.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RoleRequest" } } },
        },
        responses: {
          200: {
            description: "Role replaced successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      patch: {
        tags: ["Roles & Permissions"],
        summary: "Update Role",
        operationId: "updateRole",
        description: "Partially updates an existing role.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RoleRequest" } } },
        },
        responses: {
          200: {
            description: "Role updated successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      delete: {
        tags: ["Roles & Permissions"],
        summary: "Delete Role",
        operationId: "deleteRole",
        description: "Deletes a custom user role if not currently bound to active employees.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Role deleted successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/roles/{id}/deactivate": {
      post: {
        tags: ["Roles & Permissions"],
        summary: "Deactivate Role",
        operationId: "deactivateRole",
        description: "Deactivates a role from assignment.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Role deactivated successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
  },
};
