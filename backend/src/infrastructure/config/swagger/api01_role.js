/**
 * API - Roles & Permissions Swagger
 */

module.exports = {
  tags: [
    { name: "Roles & Permissions" },
  ],
  schemas: {
    RoleRequest: {
      type: "object",
      required: ["roleCode", "roleName"],
      properties: {
        roleCode: { type: "string", example: "DESIGNER" },
        roleName: { type: "string", example: "Graphic Designer" },
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
        operationId: "getPermissions",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "",
          },
        },
      },
    },
    "/roles": {
      get: {
        tags: ["Roles & Permissions"],
        operationId: "getRoles",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "",
          },
        },
      },
      post: {
        tags: ["Roles & Permissions"],
        operationId: "createRole",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RoleRequest" } } },
        },
        responses: {
          201: {
            description: "",
          },
        },
      },
    },
    "/roles/{id}": {
      get: {
        tags: ["Roles & Permissions"],
        operationId: "getRoleById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "",
          },
        },
      },
      put: {
        tags: ["Roles & Permissions"],
        operationId: "updateRole",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RoleRequest" } } },
        },
        responses: {
          200: {
            description: "",
          },
        },
      },
      delete: {
        tags: ["Roles & Permissions"],
        operationId: "deleteRole",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "",
          },
        },
      },
    },
    "/roles/matrix": {
      get: {
        tags: ["Roles & Permissions"],
        operationId: "getRolesMatrix",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "",
          },
        },
      },
    },
    "/roles/permissions/catalogue": {
      get: {
        tags: ["Roles & Permissions"],
        operationId: "getPermissionsCatalogue",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "",
          },
        },
      },
    },
  },
};
