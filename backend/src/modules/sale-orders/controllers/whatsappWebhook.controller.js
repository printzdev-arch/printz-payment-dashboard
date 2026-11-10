const { saleOrderWhatsappService } = require("../services");
const { asyncHandler } = require("../../../utils");

/** GET /webhooks/whatsapp - Meta's one-time endpoint verification. */
const verify = asyncHandler(async (req, res) => {
  const challenge = saleOrderWhatsappService.verifyChallenge(req.query);
  return res.status(200).send(String(challenge));
});

/** POST /webhooks/whatsapp - signed delivery / read status and customer replies. */
const receive = asyncHandler(async (req, res) => {
  saleOrderWhatsappService.verifySignature(req.rawBody, req.headers["x-hub-signature-256"]);
  const result = await saleOrderWhatsappService.handleWebhook(req.body);
  return res.status(200).json({ success: true, ...result });
});

module.exports = { verify, receive };
