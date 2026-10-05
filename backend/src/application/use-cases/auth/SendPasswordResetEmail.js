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

    const clientUrls = (process.env.CLIENT_URL || "http://localhost:3000").split(",");
    const baseUrl = clientUrls[0].trim();
    const resetUrl = `${baseUrl}/forgot-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    return {
      success: true,
      message: `Password reset email sent successfully to ${user.email}`,
      email: user.email,
    };
  }
}

module.exports = new SendPasswordResetEmail();
