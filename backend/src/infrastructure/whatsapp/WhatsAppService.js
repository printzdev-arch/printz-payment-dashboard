const https = require("https");
const http = require("http");
const { URL } = require("url");

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v19.0";
    this.apiToken = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_API_KEY || null;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || null;
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null;
    this.approvalBaseUrl =
      process.env.APPROVAL_BASE_URL ||
      process.env.APP_URL ||
      (process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",")[0] : "http://localhost:5173");
  }

  /**
   * Check if WhatsApp Business API provider is fully configured
   */
  isConfigured() {
    return Boolean(this.apiToken && this.phoneNumberId);
  }

  /**
   * Validate provider configuration and return diagnostic status
   */
  getConfigurationStatus() {
    const isConfigured = this.isConfigured();
    return {
      isConfigured,
      provider: isConfigured ? "META_WHATSAPP_BUSINESS_API" : "MOCK_DEVELOPMENT",
      apiUrl: this.apiUrl,
      hasToken: Boolean(this.apiToken),
      hasPhoneNumberId: Boolean(this.phoneNumberId),
      hasBusinessAccountId: Boolean(this.businessAccountId),
      approvalBaseUrl: this.approvalBaseUrl,
      missingFields: [
        !this.apiToken && "WHATSAPP_API_TOKEN (or WHATSAPP_API_KEY)",
        !this.phoneNumberId && "WHATSAPP_PHONE_NUMBER_ID",
      ].filter(Boolean),
    };
  }

  /**
   * Format and normalize phone number for WhatsApp E.164 standard
   */
  normalizePhoneNumber(phone) {
    if (!phone) return "";
    let cleaned = String(phone).replace(/[^\d+]/g, "").trim();
    if (cleaned.startsWith("+")) {
      cleaned = cleaned.substring(1);
    }
    // If standard 10-digit Indian number without country code, prefix 91
    if (cleaned.length === 10) {
      cleaned = `91${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Internal HTTP POST request with retry support
   */
  async _postJson(endpointUrl, payload, headers = {}, retries = 2) {
    const url = new URL(endpointUrl);
    const postData = JSON.stringify(payload);
    const client = url.protocol === "https:" ? https : http;

    const options = {
      method: "POST",
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        ...headers,
      },
      timeout: 10000,
    };

    let lastError = null;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        return await new Promise((resolve, reject) => {
          const req = client.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              let parsed;
              try {
                parsed = JSON.parse(data);
              } catch (_) {
                parsed = { raw: data };
              }
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ statusCode: res.statusCode, body: parsed });
              } else {
                const err = new Error(
                  `WhatsApp API error (${res.statusCode}): ${
                    parsed.error?.message || parsed.message || JSON.stringify(parsed)
                  }`
                );
                err.statusCode = res.statusCode;
                err.response = parsed;
                reject(err);
              }
            });
          });

          req.on("error", (err) => reject(err));
          req.on("timeout", () => {
            req.destroy();
            reject(new Error("WhatsApp API request timed out"));
          });

          req.write(postData);
          req.end();
        });
      } catch (err) {
        lastError = err;
        const isClientError = err.statusCode && err.statusCode >= 400 && err.statusCode < 500;
        if (isClientError || attempt > retries) {
          throw lastError;
        }
        // Exponential backoff
        await new Promise((res) => setTimeout(res, attempt * 500));
      }
    }

    throw lastError;
  }

  /**
   * Send WhatsApp sample design approval message with public review link
   */
  async sendDesignApprovalMessage({
    to,
    customerName,
    jobNo,
    versionNo,
    approvalUrl,
    sampleComments = "",
  }) {
    const recipient = this.normalizePhoneNumber(to);
    if (!recipient) {
      return {
        success: false,
        delivered: false,
        error: "Recipient phone number is invalid or missing",
        status: "FAILED",
      };
    }

    // Fallback/Mock mode if real provider is not configured
    if (!this.isConfigured()) {
      const mockMessageId = `mock-wa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      if (process.env.NODE_ENV !== "test") {
        console.log("\n=======================================================");
        console.log("[WHATSAPP MOCK DISPATCH — Live Provider Not Configured]");
        console.log(`Recipient: +${recipient} (${customerName || "Customer"})`);
        console.log(`Job Order: ${jobNo} (Version ${versionNo})`);
        console.log(`Approval Link: ${approvalUrl}`);
        if (sampleComments) console.log(`Notes: ${sampleComments}`);
        console.log(`Mock Message ID: ${mockMessageId}`);
        console.log("To configure real WhatsApp, set WHATSAPP_API_TOKEN & WHATSAPP_PHONE_NUMBER_ID");
        console.log("=======================================================\n");
      }

      return {
        success: true,
        delivered: false,
        simulated: true,
        provider: "MOCK",
        messageId: mockMessageId,
        status: "MOCK",
        recipient,
        approvalUrl,
      };
    }

    // Real Meta WhatsApp Cloud API Dispatch
    const endpoint = `${this.apiUrl.replace(/\/+$/, "")}/${this.phoneNumberId}/messages`;
    const messageText =
      `Hello ${customerName || "Valued Customer"},\n\n` +
      `Your design sample for Job #${jobNo} (Version ${versionNo}) is ready for review.\n\n` +
      `${sampleComments ? `Designer Notes: "${sampleComments}"\n\n` : ""}` +
      `Please review and approve or request revisions here:\n` +
      `${approvalUrl}\n\n` +
      `Thank you for choosing PrintZ!`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: {
        preview_url: true,
        body: messageText,
      },
    };

    try {
      const result = await this._postJson(endpoint, payload, {
        Authorization: `Bearer ${this.apiToken}`,
      });

      const messageId =
        result.body?.messages?.[0]?.id || `wa-${Date.now()}`;

      return {
        success: true,
        delivered: true,
        provider: "META_WHATSAPP_BUSINESS_API",
        messageId,
        status: "SENT",
        recipient,
        approvalUrl,
      };
    } catch (err) {
      console.error("[WhatsAppService] Dispatch error:", err.message);
      return {
        success: false,
        delivered: false,
        provider: "META_WHATSAPP_BUSINESS_API",
        error: err.message,
        status: "FAILED",
        recipient,
        approvalUrl,
      };
    }
  }
}

module.exports = new WhatsAppService();
