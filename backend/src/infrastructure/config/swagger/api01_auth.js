/**
 * API - Authentication Swagger
 */

module.exports = {
  tags: [
    { name: "API — Authentication" },
  ],
  schemas: {
    LoginRequest: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", example: "manager@gmail.com", description: "Registered email address or username" },
        password: { type: "string", example: "123456", description: "User password" },
      },
    },
    RefreshTokenRequest: {
      type: "object",
      required: ["refreshToken"],
      properties: {
        refreshToken: {
          type: "string",
          example: "<refresh-token-example>",
          description: "Long-lived refresh token obtained during login",
        },
      },
    },
  },
  paths: {
    "/auth/login": {
      post: {
        tags: ["API — Authentication"],
        operationId: "login",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: {
          200: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["API — Authentication"],
        operationId: "refreshToken",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshTokenRequest" } } },
        },
        responses: {
          200: {
            description: "",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["API — Authentication"],
        operationId: "getCurrentUser",
        security: [{ bearerAuth: [] }],
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

