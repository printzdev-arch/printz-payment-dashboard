/**
 * API 00 - User Management Swagger
 */

module.exports = {
  tags: [
    { name: "API — Users" },
  ],
  schemas: {
    CreateUserRequest: {
      type: "object",
      required: ["email", "employeeId", "password"],
      properties: {
        username: { type: "string", example: "anita@printz.in", description: "Login username (defaults to email)" },
        email: { type: "string", example: "anita@printz.in", description: "Account email address" },
        employeeId: { $ref: "#/components/schemas/ObjectId", description: "Linked Employee Master record ObjectId (authoritative source of role and branch access)" },
        password: { type: "string", example: "AdminEnteredPassword", description: "Account password (min 6 characters)" },
        sendInvite: { type: "boolean", example: false, description: "Send invitation email with initial login setup" },
      },
    },
    UpdateUserRequest: {
      type: "object",
      properties: {
        name: { type: "string", example: "Rajesh Kumar" },
        email: { type: "string", example: "rajesh@printz.in" },
        password: { type: "string", example: "NewSecret123" },
        role: {
          type: "string",
          enum: ["admin", "manager", "designer", "production", "operator", "staff"],
          example: "designer",
        },
        phone: { type: "string", example: "9876543210" },
        branch: { type: "string", example: "Main Branch" },
        location: { type: "string", example: "Chennai" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        isActive: { type: "boolean", example: true },
      },
    },
    UserResponse: {
      type: "object",
      properties: {
        _id: { $ref: "#/components/schemas/ObjectId" },
        name: { type: "string", example: "Rajesh Kumar" },
        email: { type: "string", example: "rajesh@printz.in" },
        role: { type: "string", example: "designer" },
        phone: { type: "string", example: "9876543210" },
        branch: { type: "string", example: "Main Branch" },
        location: { type: "string", example: "Chennai" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        isActive: { type: "boolean", example: true },
        createdAt: { $ref: "#/components/schemas/DateTimeString" },
        updatedAt: { $ref: "#/components/schemas/DateTimeString" },
      },
    },
  },
  paths: {
    "/users": {
      get: {
        tags: ["API — Users"],
        operationId: "getAllUsers",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["API — Users"],
        operationId: "createUser",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUserRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/users/me": {
      get: {
        tags: ["API — Users"],
        operationId: "getCurrentUserProfile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/users/profile": {
      get: {
        tags: ["API — Users"],
        operationId: "getUserProfile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["API — Users"],
        operationId: "getUserById",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      put: {
        tags: ["API — Users"],
        operationId: "updateUser",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateUserRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      delete: {
        tags: ["API — Users"],
        operationId: "deleteUser",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/users/{id}/lock": {
      post: {
        tags: ["API — Users"],
        operationId: "lockUser",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string", example: "Suspicious activity detected" },
                  lockoutMinutes: { type: "number", example: 15 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/users/{id}/unlock": {
      post: {
        tags: ["API — Users"],
        operationId: "unlockUser",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/users/{id}/disable": {
      post: {
        tags: ["API — Users"],
        operationId: "disableUser",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/users/{id}/enable": {
      post: {
        tags: ["API — Users"],
        operationId: "enableUser",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
  },
};
