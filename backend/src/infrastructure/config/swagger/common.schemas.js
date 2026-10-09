/**
 * API 00 - Global Common & Reusable OpenAPI Schemas
 */

module.exports = {
  // Reusable Base Types
  DecimalString: {
    type: "string",
    example: "500.00",
    description: "Decimal128 representation as a precise string (avoids floating point errors)",
  },
  ObjectId: {
    type: "string",
    example: "66ac12345678901234567890",
    pattern: "^[a-fA-F0-9]{24}$",
    description: "24-character hexadecimal MongoDB ObjectId string",
  },
  DateTimeString: {
    type: "string",
    format: "date-time",
    example: "2026-10-08T09:00:00.000Z",
    description: "ISO 8601 UTC timestamp",
  },

  // Pagination & Envelopes
  PaginationMeta: {
    type: "object",
    properties: {
      page: { type: "integer", example: 1, description: "Current page number" },
      limit: { type: "integer", example: 20, description: "Items per page (max: 100)" },
      total: { type: "integer", example: 145, description: "Total count of matching records" },
      totalPages: { type: "integer", example: 8, description: "Total number of pages" },
    },
  },
  ValidationErrorDetail: {
    type: "object",
    properties: {
      field: { type: "string", example: "email" },
      message: { type: "string", example: "Valid email address is required" },
      value: { type: "string", example: "user@invalid" },
    },
  },
  UnauthorizedErrorResponse: {
    type: "object",
    required: ["success", "message", "code"],
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Invalid email or password" },
      code: { type: "string", example: "UNAUTHORIZED" },
    },
  },
  ValidationErrorResponse: {
    type: "object",
    required: ["success", "message", "code"],
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Validation failed" },
      code: { type: "string", example: "VALIDATION_ERROR" },
      details: {
        type: "array",
        items: { $ref: "#/components/schemas/ValidationErrorDetail" },
      },
    },
  },
  ApiErrorResponse: {
    type: "object",
    required: ["success", "message", "code"],
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "An error occurred processing the request" },
      code: {
        type: "string",
        example: "BAD_REQUEST",
        enum: [
          "VALIDATION_ERROR",
          "UNAUTHORIZED",
          "INVALID_TOKEN",
          "TOKEN_EXPIRED",
          "FORBIDDEN",
          "NOT_FOUND",
          "CONFLICT",
          "BAD_REQUEST",
          "VERSION_CONFLICT",
          "INVALID_TRANSITION",
          "PREVIOUS_OPERATION_OPEN",
          "INSUFFICIENT_STOCK",
          "NO_ELIGIBLE_DESIGNER",
          "PERIOD_LOCKED",
          "ACCOUNT_LOCKED",
          "INTERNAL_SERVER_ERROR",
        ],
      },
    },
  },
  ApiSuccessResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean", example: true },
      data: { type: "object" },
    },
  },

  // Common Enums
  JobPriorityEnum: {
    type: "string",
    enum: ["NORMAL", "URGENT", "LOW", "HIGH"],
    example: "NORMAL",
  },
  JobStageEnum: {
    type: "string",
    enum: [
      "ENQUIRY",
      "ESTIMATION",
      "ESTIMATE_APPROVAL",
      "DESIGN_QUEUE",
      "DESIGN_ASSIGNED",
      "DESIGN_IN_PROGRESS",
      "SAMPLE_APPROVAL",
      "REVISION",
      "PRODUCTION_PLANNING",
      "PRINTING",
      "FINISHING",
      "PACKING",
      "QC",
      "READY",
      "DELIVERY",
      "COMPLETED",
      "ON_HOLD",
      "CANCELLED",
    ],
    example: "DESIGN_QUEUE",
  },
  JobStatusEnum: {
    type: "string",
    enum: ["DRAFT", "PENDING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"],
    example: "IN_PROGRESS",
  },
  AssignmentStatusEnum: {
    type: "string",
    enum: ["ACTIVE", "COMPLETED", "REASSIGNED", "REJECTED"],
    example: "ACTIVE",
  },
  SampleStatusEnum: {
    type: "string",
    enum: ["DRAFT", "SUBMITTED", "APPROVED", "REVISION_REQUIRED"],
    example: "SUBMITTED",
  },
  ProductionStatusEnum: {
    type: "string",
    enum: ["PLANNED", "IN_PROGRESS", "ON_HOLD", "QC", "COMPLETED", "CANCELLED"],
    example: "PLANNED",
  },
  OperationStatusEnum: {
    type: "string",
    enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED", "SKIPPED"],
    example: "PENDING",
  },
  QCResultEnum: {
    type: "string",
    enum: ["PASS", "ISSUE"],
    example: "PASS",
  },
  DeliveryStatusEnum: {
    type: "string",
    enum: ["READY", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
    example: "READY",
  },
  PaymentStatusEnum: {
    type: "string",
    enum: ["UNPAID", "PARTIAL", "PAID", "REFUNDED"],
    example: "PAID",
  },
  PaymentModeEnum: {
    type: "string",
    enum: ["CASH", "UPI", "CARD", "NET_BANKING", "CREDIT", "CHEQUE"],
    example: "CASH",
  },
};
