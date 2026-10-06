const crypto = require("crypto");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const User = require("../../../infrastructure/database/mongoose/models/User");
const emailService = require("../../../infrastructure/email/EmailService");

class SendPasswordResetEmail {
  async execute({ email, userId }) {
    let user = null;

    if (userId) {
      user = await User.findById(userId);
    }

    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      throw ErrorHelper.notFound("User not found with the provided details");
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    const clientUrls = (process.env.CLIENT_URL || "http://localhost:5173").split(",");
    const baseUrl = clientUrls.find((u) => u.includes("5173")) || clientUrls[0].trim();
    const resetUrl = `${baseUrl}/forgot-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    const isRealSmtp = Boolean(
      (process.env.SMTP_HOST || process.env.SMTP_SERVICE) &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    return {
      success: true,
      message: isRealSmtp
        ? `Password reset email sent successfully to ${user.email}`
        : `Password reset link generated. (Configure SMTP_USER & SMTP_PASS in backend/.env for inbox delivery)`,
      email: user.email,
      resetUrl: isRealSmtp ? undefined : resetUrl,
      isRealSmtp,
    };
  }
}

module.exports = new SendPasswordResetEmail();
