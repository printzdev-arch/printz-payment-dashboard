const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class LoginUser {
  constructor({ userRepository, tokenService, passwordService }) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.passwordService = passwordService;
  }

  async execute({ email, identifier, password }) {
    const loginKey = email || identifier;
    if (!loginKey) {
      throw ErrorHelper.badRequest("Email or phone number is required");
    }
    if (!password) {
      throw ErrorHelper.badRequest("Password is required");
    }

    const user = this.userRepository.findByEmailOrPhone
      ? await this.userRepository.findByEmailOrPhone(loginKey)
      : await this.userRepository.findByEmail(loginKey);

    if (!user) {
      throw ErrorHelper.unauthorized("Invalid email or password");
    }

    if (!user.isActive) {
      throw ErrorHelper.forbidden("Account has been deactivated. Please contact an administrator.");
    }

    const isMatch = await this.passwordService.comparePassword(password, user.password);
    if (!isMatch) {
      throw ErrorHelper.unauthorized("Invalid email or password");
    }

    const userId = (user._id || user.id || "").toString();
    const tokenPayload = {
      userId,
      role: user.role,
      branch: user.branch,
      email: user.email,
    };

    const tokenPair = this.tokenService.generateTokenPair(tokenPayload);

    return {
      token: tokenPair.accessToken,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        _id: user._id,
        id: user._id,
        uid: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        branch: user.branch,
        branchId: user.branchId,
        location: user.location,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
      },
    };
  }
}

module.exports = LoginUser;

