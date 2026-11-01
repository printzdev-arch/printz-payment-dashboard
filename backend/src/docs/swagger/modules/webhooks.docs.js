/** Provider webhooks. These are called by Meta, not by the app, and have no login. */
const { jsonBody, errors } = require("../lib/openapi");

module.exports = {
  tags: [{ name: "Webhooks", description: "Callbacks from external providers. Authenticated by signature, not by login." }],
  schemas: {
    WhatsappWebhookPayload: {
      type: "object",
      description: "Meta WhatsApp Cloud API event: message delivery/read statuses and customer replies.",
      additionalProperties: true,
      example: { object: "whatsapp_business_account", entry: [{ id: "WABA_ID", changes: [{ field: "messages", value: { statuses: [] } }] }] },
    },
  },
  paths: {
    "/webhooks/whatsapp": {
      // Mounted at the site root, outside /api
      servers: [{ url: "/", description: "Site root" }],
      get: {
        tags: ["Webhooks"],
        operationId: "verifyWhatsappWebhook",
        summary: "Verify the WhatsApp webhook",
        description: "Meta calls this once when the webhook is registered. Returns `hub.challenge` as plain text when `hub.verify_token` matches.",
        security: [],
        parameters: [
          { name: "hub.mode", in: "query", schema: { type: "string", example: "subscribe" } },
          { name: "hub.verify_token", in: "query", schema: { type: "string" } },
          { name: "hub.challenge", in: "query", schema: { type: "string", example: "1158201444" } },
        ],
        responses: { 200: { description: "The challenge value", content: { "text/plain": { schema: { type: "string", example: "1158201444" } } } }, ...errors(403), 503: { description: "The verify token is not configured on this server." } },
      },
      post: {
        tags: ["Webhooks"],
        operationId: "receiveWhatsappWebhook",
        summary: "Receive WhatsApp delivery and reply events",
        description: "Updates the delivery and read ticks of sent designs and raises a notification for customer replies. A reply never approves a design. The `X-Hub-Signature-256` header is checked against the raw body.",
        security: [],
        parameters: [{ name: "X-Hub-Signature-256", in: "header", required: true, schema: { type: "string", example: "sha256=..." } }],
        requestBody: jsonBody("WhatsappWebhookPayload"),
        responses: { 200: { description: "Processed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } }, ...errors(401) },
      },
    },
  },
};

