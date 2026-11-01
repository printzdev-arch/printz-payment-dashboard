/** Reusable parameters (components.parameters). */
module.exports = {
  Page: { name: "page", in: "query", description: "Page number, starting at 1.", schema: { type: "integer", minimum: 1, default: 1 } },
  Limit: { name: "limit", in: "query", description: "Items per page (maximum 100).", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
  Search: { name: "search", in: "query", description: "Free-text search.", schema: { type: "string" } },
  IdempotencyKey: {
    name: "Idempotency-Key",
    in: "header",
    required: false,
    description:
      "Unique value per attempt (for example a UUID). Repeating the same key with the same order returns the original result instead of taking the payment twice. The same key on a different order returns 409 DUPLICATE_REQUEST.",
    schema: { type: "string", example: "7f1c2d9a-3b4e-4c61-9a0f-2b8f6c1e5d34" },
  },
};
