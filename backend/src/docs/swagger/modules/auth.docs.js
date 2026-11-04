/**
 * Authentication Module Swagger Documentation
 */

module.exports = {
  tags: [{ name: "Authentication" }],
  schemas: {
    LoginRequest: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: {
          type: "string",
          format: "email",
          example: "user@example.com",
          description: "Registered email address",
        },
        password: {
          type: "string",
          example: "your-password",
          description: "Account password",
        },
      },
    },
    // The login response is the only place the access and refresh tokens are issued to the caller.
    LoginResponse: {
      type: "object",
      required: ["success", "message", "data"],
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Login successful" },
        data: {
          type: "object",
          required: ["accessToken", "refreshToken"],
          properties: {
            accessToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWM3NDRiZGRhMzA3MDhhNzc5MjM1Y2EiLCJyb2xlIjoiQURNSU4iLCJicmFuY2giOiJCTiIsImVtYWlsIjoiYWRtaW5AcHJpbnR6LnNob3AiLCJpYXQiOjE3OTM2ODE4MzAsImV4cCI6MTc5MzY4MjczMH0.fcImxdj-11iBO5_ZnN0xmtk4vpyXqO5NkqcW-FKJfjo",
            },
            refreshToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWM3NDRiZGRhMzA3MDhhNzc5MjM1Y2EiLCJlbWFpbCI6ImFkbWluQHByaW50ei5zaG9wIiwiaWF0IjoxNzkzNjgxODMwLCJleHAiOjE3OTQyODY2MzB9.at8qZnq-rXx9xY0orw7vOTH2N-hfr_eH75kABjZjY3w",
            },
          },
        },
      },
    },
    RefreshTokenResponse: {
      type: "object",
      required: ["success", "message", "data"],
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Token refreshed successfully" },
        data: {
          type: "object",
          required: ["accessToken", "refreshToken"],
          properties: {
            accessToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWM3NDRiZGRhMzA3MDhhNzc5MjM1Y2EiLCJyb2xlIjoiQURNSU4iLCJicmFuY2giOiJCTiIsImVtYWlsIjoiYWRtaW5AcHJpbnR6LnNob3AiLCJpYXQiOjE3OTM2ODE4MzAsImV4cCI6MTc5MzY4MjczMH0.fcImxdj-11iBO5_ZnN0xmtk4vpyXqO5NkqcW-FKJfjo",
            },
            refreshToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWM3NDRiZGRhMzA3MDhhNzc5MjM1Y2EiLCJlbWFpbCI6ImFkbWluQHByaW50ei5zaG9wIiwiaWF0IjoxNzkzNjgxODMwLCJleHAiOjE3OTQyODY2MzB9.at8qZnq-rXx9xY0orw7vOTH2N-hfr_eH75kABjZjY3w",
            },
          },
        },
      },
    },
    RefreshTokenRequest: {
      type: "object",
      required: ["refreshToken"],
      properties: {
        refreshToken: {
          type: "string",
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWM3NDRiZGRhMzA3MDhhNzc5MjM1Y2EiLCJlbWFpbCI6ImFkbWluQHByaW50ei5zaG9wIiwiaWF0IjoxNzkzNjgxODMwLCJleHAiOjE3OTQyODY2MzB9.at8qZnq-rXx9xY0orw7vOTH2N-hfr_eH75kABjZjY3w",
        },
      },
    },
    LogoutRequest: {
      type: "object",
      properties: {
        refreshToken: {
          type: "string",
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWM3NDRiZGRhMzA3MDhhNzc5MjM1Y2EiLCJlbWFpbCI6ImFkbWluQHByaW50ei5zaG9wIiwiaWF0IjoxNzkzNjgxODMwLCJleHAiOjE3OTQyODY2MzB9.at8qZnq-rXx9xY0orw7vOTH2N-hfr_eH75kABjZjY3w",
        },
      },
    },
    ForgotPasswordRequest: {
      type: "object",
      required: ["email"],
      properties: {
        email: {
          type: "string",
          format: "email",
          example: "user@printz.in",
          description: "Registered email address to receive reset link",
        },
      },
    },
    ResetPasswordRequest: {
      type: "object",
      required: ["email", "token", "newPassword"],
      properties: {
        email: {
          type: "string",
          format: "email",
          example: "user@printz.in",
          description: "Target account email address",
        },
        token: {
          type: "string",
          example: "9a8b7c6d5e4f3a2b1c0d",
          description: "Cryptographic password reset token received via email",
        },
        newPassword: {
          type: "string",
          example: "SecureNewPassword123!",
          description: "New password (minimum 6 characters)",
        },
      },
    },
  },
  paths: {
    "/auth/forgot-password": {
      post: {
        tags: ["Authentication"],
        summary: "Forgot Password Request",
        operationId: "forgotPassword",
        description: "Initiates password recovery by emailing a secure reset link. Rate limited to 5 requests per 15 minutes.",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ForgotPasswordRequest" } } },
        },
        responses: {
          200: {
            description: "Password reset instructions sent",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
          400: {
            description: "Invalid email supplied",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } },
          },
          429: {
            description: "Too many reset attempts",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login User",
        operationId: "loginUser",
        description: "Authenticates user credentials and returns access and refresh tokens.",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: {
          200: {
            description: "Login successful with token payload",
            content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } },
          },
          400: {
            description: "Validation error - missing credentials",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationErrorResponse" } } },
          },
          401: {
            description: "Invalid email or password",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UnauthorizedErrorResponse" } } },
          },
          429: {
            description: "Rate limit exceeded (30 attempts/15min)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Logout User",
        operationId: "logoutUser",
        description: "Invalidates the active session and blacklists refresh token.",
        security: [{ bearerAuth: [] }, {}],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LogoutRequest" } } },
        },
        responses: {
          200: {
            description: "Logged out successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get Current Authenticated User",
        operationId: "getCurrentUser",
        description: "Returns the profile, role, permissions, and branch scope of the currently authenticated token bearer.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Authenticated user details retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
          401: {
            description: "Unauthorized - missing or invalid token",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UnauthorizedErrorResponse" } } },
          },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh Access Token",
        operationId: "refreshAccessToken",
        description: "Exchanges a valid refresh token for a newly signed access token and refresh token.",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshTokenRequest" } } },
        },
        responses: {
          200: {
            description: "Token refreshed successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshTokenResponse" } } },
          },
          401: {
            description: "Invalid or expired refresh token",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UnauthorizedErrorResponse" } } },
          },
        },
      },
    },
    "/auth/refresh-token": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh Access Token (alias)",
        operationId: "refreshAccessTokenAlias",
        description: "Refresh access token.",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshTokenRequest" } } },
        },
        responses: {
          200: {
            description: "Token refreshed successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshTokenResponse" } } },
          },
          401: {
            description: "Invalid or expired refresh token",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UnauthorizedErrorResponse" } } },
          },
        },
      },
    },
    "/auth/designers": {
      get: {
        tags: ["Authentication"],
        summary: "List designers",
        operationId: "listAuthDesigners",
        description: "Designer users, for assignment pickers.",
        security: [],
        responses: { 200: { description: "Designers", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } } },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Authentication"],
        summary: "Reset Password with Token",
        operationId: "resetPasswordWithToken",
        description: "Completes password reset using verified token and establishes a new account password.",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ResetPasswordRequest" } } },
        },
        responses: {
          200: {
            description: "Password reset successful",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
          400: {
            description: "Invalid or expired reset token",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } },
          },
        },
      },
    },
    "/auth/send-reset-email": {
      post: {
        tags: ["Authentication"],
        summary: "Send Password Reset Email",
        operationId: "sendPasswordResetEmail",
        description: "Alias for forgot-password endpoint to trigger a recovery email.",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ForgotPasswordRequest" } } },
        },
        responses: {
          200: {
            description: "Password reset email dispatched",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
  },
};
