const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async getTransporter() {
    if (this.transporter) return this.transporter;

    const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : "";
    const smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, "").trim() : "";

    if (smtpUser && smtpPass) {
      if (process.env.SMTP_SERVICE || (!process.env.SMTP_HOST && smtpUser.includes("@gmail.com"))) {
        this.transporter = nodemailer.createTransport({
          service: process.env.SMTP_SERVICE || "gmail",
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
        console.log(`[EmailService] Real SMTP enabled via ${process.env.SMTP_SERVICE || "gmail"} (${smtpUser})`);
        return this.transporter;
      }

      if (process.env.SMTP_HOST) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: Number(process.env.SMTP_PORT) === 465 || process.env.SMTP_SECURE === "true",
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
        console.log(`[EmailService] Real SMTP enabled via ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`);
        return this.transporter;
      }
    }

    console.warn("\n=========================================================================");
    console.warn("[EmailService WARNING] No SMTP credentials configured in backend/.env.");
    console.warn("To receive emails in real inboxes, set SMTP_USER and SMTP_PASS in backend/.env.");
    console.warn("=========================================================================\n");

    this.transporter = {
      sendMail: async (mailOptions) => {
        console.log("\n=======================================================");
        console.log("[DEV MODE - PASSWORD RESET EMAIL NOTIFICATION]");
        console.log(`Recipient: ${mailOptions.to}`);
        console.log(`Subject  : ${mailOptions.subject}`);
        console.log("-------------------------------------------------------");
        console.log(mailOptions.text || mailOptions.html);
        console.log("=======================================================\n");
        return { messageId: "dev-" + Date.now(), isMock: true };
      },
    };
    return this.transporter;
  }

  async sendPasswordResetEmail({ to, name, resetUrl }) {
    const transporter = await this.getTransporter();
    const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : "";
    const isGmail = process.env.SMTP_SERVICE === "gmail" || smtpUser.includes("@gmail.com");
    const fromAddress = isGmail
      ? `"Printz Enterprise" <${smtpUser}>`
      : process.env.SMTP_FROM || `"Printz Enterprise" <${smtpUser || "no-reply@printz.shop"}>`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #059669; margin: 0;">Printz Enterprise</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
        </div>
        
        <p style="font-size: 15px; color: #1e293b;">Hello <strong>${name || "User"}</strong>,</p>
        
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          An administrator has requested a password reset for your account (<strong>${to}</strong>).
          Please click the button below to set a new password. This link will remain valid for 1 hour.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          If the button above does not work, copy and paste the following link into your browser:<br/>
          <a href="${resetUrl}" style="color: #059669; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
          If you did not request this password reset, please contact your system administrator.
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: "Password Reset Request — Printz Portal",
      html: htmlContent,
      text: `Hello ${name || "User"},\n\nA password reset was requested for your account. Reset your password here: ${resetUrl}\n\nThis link is valid for 1 hour.`,
    });

    if (nodemailer.getTestMessageUrl && info && info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[Email Preview URL]: ${previewUrl}`);
      }
    }

    return info;
  }
}

module.exports = new EmailService();
