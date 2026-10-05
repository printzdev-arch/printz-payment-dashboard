const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class CreateUser {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(userData) {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw ErrorHelper.conflict("User with this email already exists");
    }

    const user = await this.userRepository.create({
      name: userData.name,
      email: userData.email.toLowerCase().trim(),
      password: userData.password,
      phone: userData.phone || "",
      branch: userData.branch || "",
      location: userData.location || "",
      role: userData.role || "manager",
      permissions: userData.permissions || {},
      isActive: true,
    });

    return user;
  }
}

module.exports = CreateUser;
