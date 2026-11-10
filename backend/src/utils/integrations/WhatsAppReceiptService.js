/**
 * WhatsAppService
 * Integration service for WhatsApp receipt dispatch via:
 * 1. Meta WhatsApp Cloud API (Graph API)
 * 2. Twilio WhatsApp Messaging API
 * 3. Custom WhatsApp Gateway / Webhook
 */

class WhatsAppService {
  /**
   * Determine active WhatsApp provider configuration from environment.
   */
  getProviderConfig() {
    // 1. Meta WhatsApp Cloud API
    const metaToken =
      process.env.WHATSAPP_API_KEY ||
      process.env.WHATSAPP_ACCESS_TOKEN ||
      process.env.META_WHATSAPP_TOKEN ||
      null;
    const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || null;
    const metaApiVersion = process.env.WHATSAPP_API_VERSION || "v19.0";

    if (metaToken && metaPhoneId) {
      return {
        provider: "META",
        token: metaToken,
        phoneNumberId: metaPhoneId,
        apiVersion: metaApiVersion,
        isConfigured: true,
      };
    }

    // 2. Twilio WhatsApp API
    const twilioSid = process.env.TWILIO_ACCOUNT_SID || null;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || null;
    const twilioFrom =
      process.env.TWILIO_WHATSAPP_FROM ||
      process.env.TWILIO_PHONE_NUMBER ||
      null;

    if (twilioSid && twilioAuthToken && twilioFrom) {
      const fromFormatted = twilioFrom.startsWith("whatsapp:")
        ? twilioFrom
        : `whatsapp:${twilioFrom}`;

      return {
        provider: "TWILIO",
        accountSid: twilioSid,
        authToken: twilioAuthToken,
        from: fromFormatted,
        isConfigured: true,
      };
    }

    // 3. Custom / Gateway Endpoint
    const customUrl = process.env.WHATSAPP_API_URL || null;
    if (customUrl && metaToken) {
      return {
        provider: "CUSTOM",
        url: customUrl,
        token: metaToken,
        isConfigured: true,
      };
    }

    return {
      provider: null,
      isConfigured: false,
    };
  }

  /**
   * Check if any WhatsApp provider is actively configured.
   */
  isConfigured() {
    return this.getProviderConfig().isConfigured;
  }

  /**
   * Clean and normalize phone number to E.164 standard digits.
   * Prepends default country code (91) for 10-digit numbers.
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;
    const str = String(phone).trim();
    if (!str) return null;

    // Keep only digits and '+'
    const cleaned = str.replace(/[^\d+]/g, "");
    if (!cleaned) return null;

    // Strip leading '+'
    let digits = cleaned.replace(/^\+/, "");

    // If 10 digits (e.g. Indian national mobile), prepend default country code
    if (digits.length === 10) {
      const defaultCode = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "91").replace(/\D/g, "");
      digits = `${defaultCode}${digits}`;
    }

    // Validate length (E.164 allows 10-15 digits)
    if (digits.length < 10 || digits.length > 15) {
      return null;
    }

    return digits;
  }

  /**
   * Build formatted WhatsApp text message for a sale receipt.
   */
  formatReceiptMessage(receiptData, branchName = null) {
    const receiptNo = receiptData.receiptNo || "N/A";
    const dateStr = receiptData.saleDate
      ? new Date(receiptData.saleDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : new Date().toLocaleString();
    const customerName = receiptData.customerSnapshot?.name || "Customer";

    const items = Array.isArray(receiptData.items) ? receiptData.items : [];
    let itemsText = "";
    if (items.length > 0) {
      itemsText = items
        .map((it, idx) => {
          const name = it.productName || "Item";
          const qty = it.quantity || 1;
          const rate = Number(it.unitPrice || 0).toFixed(2);
          const total = Number(it.lineTotal || 0).toFixed(2);
          return `${idx + 1}. *${name}* × ${qty} @ ₹${rate} = ₹${total}`;
        })
        .join("\n");
    } else {
      itemsText = "No items listed";
    }

    const subtotal = Number(receiptData.subtotal || 0).toFixed(2);
    const discount = Number(receiptData.discountAmount || 0).toFixed(2);
    const tax = Number(receiptData.taxAmount || 0).toFixed(2);
    const grandTotal = Number(receiptData.grandTotal || 0).toFixed(2);
    const paid = Number(receiptData.amountPaid || 0).toFixed(2);
    const balance = Math.max(
      0,
      Number(receiptData.grandTotal || 0) - Number(receiptData.amountPaid || 0)
    ).toFixed(2);
    const paymentMode = receiptData.paymentMode || "N/A";
    const paymentStatus = receiptData.paymentStatus || "UNPAID";

    const branchHeader = branchName ? `📍 *Branch:* ${branchName}\n` : "";

    return (
      `🧾 *PRINTZ DIGITAL PRINTING — SALE RECEIPT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Receipt No:* ${receiptNo}\n` +
      `*Date:* ${dateStr}\n` +
      `*Customer:* ${customerName}\n` +
      branchHeader +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*ITEMS:*\n` +
      `${itemsText}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Subtotal: ₹${subtotal}\n` +
      (Number(discount) > 0 ? `Discount: -₹${discount}\n` : "") +
      `Tax: ₹${tax}\n` +
      `*Grand Total: ₹${grandTotal}*\n` +
      `Amount Paid: ₹${paid} (${paymentMode})\n` +
      (Number(balance) > 0 ? `*Balance Due: ₹${balance}*\n` : "") +
      `Payment Status: *${paymentStatus}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Thank you for choosing PrintZ!`
    );
  }

  /**
   * Dispatch the WhatsApp receipt message to the recipient.
   */
  async sendReceiptMessage({ to, receiptData, branchName = null }) {
    const config = this.getProviderConfig();

    if (!config.isConfigured) {
      const err = new Error(
        "Messaging integration provider is not configured/disabled in environment. " +
          "Please configure WHATSAPP_API_KEY and WHATSAPP_PHONE_NUMBER_ID (for Meta WhatsApp Cloud API) " +
          "or TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM (for Twilio WhatsApp API)."
      );
      err.statusCode = 422;
      err.code = "INTEGRATION_DISABLED";
      throw err;
    }

    const formattedTo = this.formatPhoneNumber(to);
    if (!formattedTo) {
      const err = new Error(
        `Invalid phone number format '${to}'. A valid mobile number (10-15 digits) is required for WhatsApp sharing.`
      );
      err.statusCode = 400;
      err.code = "INVALID_PHONE_NUMBER";
      throw err;
    }

    const messageText = this.formatReceiptMessage(receiptData, branchName);

    if (config.provider === "META") {
      return this._sendViaMeta({
        config,
        to: formattedTo,
        text: messageText,
        receiptNo: receiptData.receiptNo,
      });
    }

    if (config.provider === "TWILIO") {
      return this._sendViaTwilio({
        config,
        to: formattedTo,
        text: messageText,
        receiptNo: receiptData.receiptNo,
      });
    }

    if (config.provider === "CUSTOM") {
      return this._sendViaCustom({
        config,
        to: formattedTo,
        text: messageText,
        receiptData,
      });
    }

    const err = new Error("Unsupported WhatsApp messaging provider configuration.");
    err.statusCode = 422;
    err.code = "INTEGRATION_DISABLED";
    throw err;
  }

  /**
   * Send text message via Meta WhatsApp Cloud API.
   */
  async _sendViaMeta({ config, to, text, receiptNo }) {
    const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: text,
      },
    };

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      const err = new Error(`WhatsApp provider network error: ${networkErr.message}`);
      err.statusCode = 502;
      err.code = "PROVIDER_NETWORK_ERROR";
      throw err;
    }

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg =
        responseBody?.error?.message ||
        responseBody?.message ||
        `HTTP ${response.status} from WhatsApp Cloud API`;
      const err = new Error(`WhatsApp delivery failed: ${msg}`);
      err.statusCode = response.status >= 500 ? 502 : 422;
      err.code = "PROVIDER_ERROR";
      err.details = responseBody?.error || responseBody;
      throw err;
    }

    const messageId = responseBody?.messages?.[0]?.id || "unknown";
    return {
      success: true,
      provider: "META",
      messageId,
      recipient: to,
    };
  }

  /**
   * Send text message via Twilio WhatsApp API.
   */
  async _sendViaTwilio({ config, to, text, receiptNo }) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
    const twilioTo = to.startsWith("+") ? `whatsapp:${to}` : `whatsapp:+${to}`;

    const params = new URLSearchParams();
    params.append("To", twilioTo);
    params.append("From", config.from);
    params.append("Body", text);

    const authHeader = `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`;

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
    } catch (networkErr) {
      const err = new Error(`Twilio provider network error: ${networkErr.message}`);
      err.statusCode = 502;
      err.code = "PROVIDER_NETWORK_ERROR";
      throw err;
    }

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = responseBody?.message || `HTTP ${response.status} from Twilio WhatsApp API`;
      const err = new Error(`WhatsApp delivery failed: ${msg}`);
      err.statusCode = response.status >= 500 ? 502 : 422;
      err.code = "PROVIDER_ERROR";
      err.details = responseBody;
      throw err;
    }

    const messageId = responseBody?.sid || "unknown";
    return {
      success: true,
      provider: "TWILIO",
      messageId,
      recipient: to,
    };
  }

  /**
   * Send message via custom WhatsApp Gateway.
   */
  async _sendViaCustom({ config, to, text, receiptData }) {
    let response;
    try {
      response = await fetch(config.url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          message: text,
          receiptNo: receiptData.receiptNo,
          grandTotal: receiptData.grandTotal,
        }),
      });
    } catch (networkErr) {
      const err = new Error(`WhatsApp gateway network error: ${networkErr.message}`);
      err.statusCode = 502;
      err.code = "PROVIDER_NETWORK_ERROR";
      throw err;
    }

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = responseBody?.message || `HTTP ${response.status} from WhatsApp Gateway`;
      const err = new Error(`WhatsApp delivery failed: ${msg}`);
      err.statusCode = response.status >= 500 ? 502 : 422;
      err.code = "PROVIDER_ERROR";
      err.details = responseBody;
      throw err;
    }

    const messageId = responseBody?.messageId || responseBody?.id || "unknown";
    return {
      success: true,
      provider: "CUSTOM",
      messageId,
      recipient: to,
    };
  }
}

module.exports = new WhatsAppService();
