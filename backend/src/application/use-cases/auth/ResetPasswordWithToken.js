const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const User = require("../../../infrastructure/database/mongoose/models/User");

class ResetPasswordWithToken {
  async execute({ token, email, newPassword }) {
    if (!newPassword || newPassword.length < 6) {
      throw ErrorHelper.badRequest("New password must be at least 6 characters long");
    }

    const query = {
      email: email.toLowerCase().trim(),
    };

    if (token) {
      query.resetPasswordToken = token;
      query.resetPasswordExpires = { $gt: new Date() };
    }

    const user = await User.findOne(query);

    if (!user) {
      throw ErrorHelper.badRequest("Invalid or expired password reset token");
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return {
      success: true,
      message: "Password has been successfully updated",
    };
  }
}

module.exports = new ResetPasswordWithToken();
