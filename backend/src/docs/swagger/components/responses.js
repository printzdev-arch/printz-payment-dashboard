/**
 * Reusable error responses (components.responses). Reference them with
 * { $ref: "#/components/responses/NotFound" } instead of repeating the schema per endpoint.
 */
const errorBody = (code, message, extra = {}) => ({
  "application/json": {
    schema: { $ref: "#/components/schemas/ApiErrorResponse" },
    example: { success: false, code, message, ...extra },
  },
});

module.exports = {
  BadRequest: { description: "The request is malformed or failed validation.", content: errorBody("VALIDATION_ERROR", "Validation failed", { details: [{ field: "email", message: "Valid email address is required" }] }) },
  Unauthorized: { description: "Missing, invalid or expired access token. Log in again or use the refresh token.", content: errorBody("UNAUTHORIZED", "Invalid token. Please authenticate.") },
  Forbidden: { description: "Signed in, but the role or branch is not allowed to do this.", content: errorBody("FORBIDDEN", "You do not have permission to perform this action.") },
  NotFound: { description: "The record does not exist, or is not visible to this user.", content: errorBody("NOT_FOUND", "Record not found.") },
  Conflict: { description: "The record is not in a state that allows this action, or the request was already processed.", content: errorBody("INVALID_STATUS", "This action is not allowed in the current status.") },
  Unprocessable: { description: "The request is well-formed but a business rule failed. The `code` says which one.", content: errorBody("INVALID_AMOUNT", "Advance must be more than 0 and not more than the order total.") },
  TooManyRequests: { description: "Rate limit exceeded. Try again later.", content: errorBody("TOO_MANY_REQUESTS", "Too many requests, please try again later.") },
  ServerError: { description: "Unexpected server error.", content: errorBody("INTERNAL_SERVER_ERROR", "Something went wrong.") },
};
