/**
 * Authentication Module Swagger Documentation
 */

module.exports = {
  tags: [{ name: "Authentication" }],
  schemas: {
    LoginRequest: {
      type: "object",
      required: ["password"],
      properties: {
        email: {
          type: "string",
          format: "email",
          example: "manager@printz.in",
          description: "Registered email address (or username/phone)",
        },
        username: {
          type: "string",
          example: "manager",
          description: "Alternative login identifier",
        },
        phone: {
          type: "string",
          example: "9876543210",
          description: "Alternative mobile number identifier",
        },
        password: {
          type: "string",
          example: "SecretPassword123",
          description: "Account password",
        },
      },
    },
    LoginResponse: {
      type: "object",
      properties: {
        accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
        refreshToken: { type: "string", example: "d9e8f7c6b5a4..." },
        expiresIn: { type: "string", example: "8h" },
        user: {
          type: "object",
          properties: {
            id: { $ref: "#/components/schemas/ObjectId" },
            name: { type: "string", example: "John Manager" },
            email: { type: "string", example: "manager@printz.in" },
            role: { type: "string", example: "manager" },
            branchId: { $ref: "#/components/schemas/ObjectId" },
            organizationId: { $ref: "#/components/schemas/ObjectId" },
            permissions: {
              type: "array",
              items: { type: "string", example: "job.create" },
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
          example: "d9e8f7c6b5a4...",
          description: "Long-lived refresh token obtained during login",
        },
      },
    },
    LogoutRequest: {
      type: "object",
      properties: {
        refreshToken: {
          type: "string",
          example: "d9e8f7c6b5a4...",
          description: "Refresh token to invalidate",
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
        description: "Authenticates employee or admin credentials and returns access and refresh JWT tokens.",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: {
          200: {
            description: "Login successful with token payload",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
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
        description: "Exchanges a valid long-lived refresh token for a newly signed access token.",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshTokenRequest" } } },
        },
        responses: {
          200: {
            description: "Token refreshed successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
          401: {
            description: "Invalid or expired refresh token",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UnauthorizedErrorResponse" } } },
          },
        },
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
