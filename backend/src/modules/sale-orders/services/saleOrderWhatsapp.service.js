const crypto = require("crypto");
const whatsappProvider = require("../../../utils/integrations/WhatsAppService");
const Attachment = require("../../attachments/models/Attachment");
const { SaleOrder, WhatsappMessage } = require("../models");
const { NOTIFICATION, SALE_ORDER_SETTINGS } = require("../models/saleOrder.constants");
const { err, idStr, toObjectId, notify } = require("./saleOrder.helpers");

const STATUS_RANK = { QUEUED: 0, SENT: 1, DELIVERED: 2, READ: 3 };

const publicFileUrl = (storageKey) => {
  const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, "");
  return `${base}/uploads/${storageKey}`;
};

/**
 * Log and send one template message. Returns the saved whatsappMessages row.
 * The row is written first (QUEUED) so a duplicate click can be detected, then updated with the result.
 */
async function sendLogged({ order, design = null, purpose, templateName, bodyParams, imageUrl = null, actor }) {
  const toNumber = order.customerSnapshot.whatsappNumber;
  const row = await WhatsappMessage.create({
    orderId: order._id,
    designId: design?._id || null,
    purpose,
    toNumber,
    templateName,
    templateParams: { params: bodyParams },
    mediaUrl: imageUrl,
    status: "QUEUED",
    sentBy: toObjectId(actor.userId),
    sentAt: new Date(),
  });

  const result = await whatsappProvider.sendTemplate({ to: toNumber, templateName, bodyParams, imageUrl });

  row.status = result.success ? "SENT" : "FAILED";
  row.providerMessageId = result.messageId || null;
  row.error = result.success ? null : result.error || "WhatsApp send failed";
  row.statusUpdatedAt = new Date();
  await row.save();
  return row;
}

/** Design approval request: preview image + order number. */
async function sendDesignApproval(order, design, actor) {
  const preview = await Attachment.findById(design.previewAttachmentId).lean();
  if (!preview) throw err(422, "PREVIEW_REQUIRED", "This design version has no preview image.");

  return sendLogged({
    order,
    design,
    purpose: "DESIGN_APPROVAL",
    templateName: SALE_ORDER_SETTINGS.whatsappTemplates.designApproval,
    bodyParams: [order.customerSnapshot.name, order.orderNo],
    imageUrl: publicFileUrl(preview.storageKey),
    actor,
  });
}

/** Optional "ready for pickup" message that shows the balance due. */
async function sendReadyForPickup(order, actor) {
  return sendLogged({
    order,
    purpose: "READY_FOR_PICKUP",
    templateName: SALE_ORDER_SETTINGS.whatsappTemplates.readyForPickup,
    bodyParams: [order.customerSnapshot.name, order.orderNo, String(order.balanceDue)],
    actor,
  });
}

/** Optional payment receipt message. */
async function sendPaymentReceipt(order, payment, actor) {
  return sendLogged({
    order,
    purpose: "PAYMENT_RECEIPT",
    templateName: SALE_ORDER_SETTINGS.whatsappTemplates.paymentReceipt,
    bodyParams: [order.customerSnapshot.name, order.orderNo, payment.receiptNo, String(payment.amount)],
    actor,
  });
}

/** True when the same version was already sent (or is being sent) within the duplicate window. */
async function wasSentRecently(designId) {
  const since = new Date(Date.now() - SALE_ORDER_SETTINGS.duplicateSendSeconds * 1000);
  const recent = await WhatsappMessage.findOne({
    designId,
    purpose: "DESIGN_APPROVAL",
    status: { $ne: "FAILED" },
    sentAt: { $gte: since },
  })
    .select("_id")
    .lean();
  return Boolean(recent);
}

/** Verify Meta's X-Hub-Signature-256 header against the raw request body. */
function verifySignature(rawBody, headerValue) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) throw err(503, "WEBHOOK_NOT_CONFIGURED", "WhatsApp webhook secret is not configured.");
  if (!rawBody || !headerValue) throw err(403, "INVALID_SIGNATURE", "Missing webhook signature.");

  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(String(headerValue));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw err(403, "INVALID_SIGNATURE", "Webhook signature does not match.");
  }
}

/** Meta calls this once to prove the endpoint is ours. */
function verifyChallenge(query) {
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!token) throw err(503, "WEBHOOK_NOT_CONFIGURED", "WhatsApp verify token is not configured.");
  if (query["hub.mode"] === "subscribe" && query["hub.verify_token"] === token) return query["hub.challenge"];
  throw err(403, "INVALID_VERIFY_TOKEN", "Webhook verification failed.");
}

/**
 * Apply delivery / read ticks and tell the designer and branch when the customer replies.
 * A reply is not an approval: staff still record the decision.
 */
async function handleWebhook(body) {
  let updated = 0;
  let replies = 0;

  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};

      for (const s of value.statuses || []) {
        const next = String(s.status || "").toUpperCase();
        const row = await WhatsappMessage.findOne({ providerMessageId: s.id });
        if (!row) continue;
        const isFailure = next === "FAILED";
        const isForward = (STATUS_RANK[next] ?? -1) > (STATUS_RANK[row.status] ?? -1);
        if (!isFailure && !isForward) continue; // ignore out-of-order or repeated updates
        row.status = isFailure ? "FAILED" : next;
        if (isFailure) row.error = s.errors?.[0]?.title || "Delivery failed";
        row.statusUpdatedAt = new Date();
        await row.save();
        updated++;
      }

      for (const m of value.messages || []) {
        const from = String(m.from || "");
        const last = await WhatsappMessage.findOne({
          purpose: "DESIGN_APPROVAL",
          toNumber: { $regex: `${from.slice(-10)}$` },
        })
          .sort({ sentAt: -1 })
          .lean();
        if (!last) continue;
        const order = await SaleOrder.findById(last.orderId).lean();
        if (!order) continue;

        const text = m.text?.body || `(${m.type || "message"})`;
        const userIds = [idStr(order.createdBy)];
        if (order.currentAssignment?.designerUserId) userIds.push(idStr(order.currentAssignment.designerUserId));
        await notify({
          userIds,
          branchId: order.orderBranchId,
          type: NOTIFICATION.CUSTOMER_REPLY,
          title: "Customer replied on WhatsApp",
          message: `Order ${order.orderNo}: "${String(text).slice(0, 120)}"`,
          orderId: order._id,
        });
        replies++;
      }
    }
  }
  return { updated, replies };
}

module.exports = {
  sendDesignApproval,
  sendReadyForPickup,
  sendPaymentReceipt,
  wasSentRecently,
  verifySignature,
  verifyChallenge,
  handleWebhook,
  publicFileUrl,
};
