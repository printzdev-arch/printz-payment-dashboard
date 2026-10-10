/**
 * Authentication Data Transfer Objects
 */

class LoginDto {
  constructor({ email, identifier, username, phone, password } = {}) {
    const rawId = email || identifier || username || phone || "";
    this.email = typeof rawId === "string" ? rawId.trim() : "";
    this.identifier = this.email;
    this.password = typeof password === "string" ? password : "";
  }

  static fromRequest(req) {
    return new LoginDto(req.body || {});
  }
}

class RefreshTokenDto {
  constructor({ refreshToken } = {}) {
    this.refreshToken = typeof refreshToken === "string" ? refreshToken.trim() : "";
  }

  static fromRequest(req) {
    const token = req.body?.refreshToken || req.headers?.["x-refresh-token"];
    return new RefreshTokenDto({ refreshToken: token });
  }
}

class LogoutDto {
  constructor({ userId, refreshToken, accessToken } = {}) {
    this.userId = userId || null;
    this.refreshToken = typeof refreshToken === "string" ? refreshToken.trim() : null;
    this.accessToken = typeof accessToken === "string" ? accessToken.trim() : null;
  }

  static fromRequest(req) {
    let token = null;
    if (req.headers?.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    return new LogoutDto({
      userId: req.user?._id || req.user?.id || null,
      refreshToken: req.body?.refreshToken || req.headers?.["x-refresh-token"] || null,
      accessToken: token || req.body?.accessToken || null,
    });
  }
}

class ForgotPasswordDto {
  constructor({ email, userId } = {}) {
    this.email = typeof email === "string" ? email.trim() : "";
    this.userId = userId || null;
  }

  static fromRequest(req) {
    return new ForgotPasswordDto(req.body || {});
  }
}

class ResetPasswordDto {
  constructor({ email, token, newPassword, password } = {}) {
    this.email = typeof email === "string" ? email.trim() : "";
    this.token = typeof token === "string" ? token.trim() : "";
    this.newPassword = typeof (newPassword || password) === "string" ? newPassword || password : "";
  }

  static fromRequest(req) {
    return new ResetPasswordDto(req.body || {});
  }
}

module.exports = {
  LoginDto,
  RefreshTokenDto,
  LogoutDto,
  ForgotPasswordDto,
  ResetPasswordDto,
};
