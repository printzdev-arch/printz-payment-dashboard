const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class GetCurrentUser {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw ErrorHelper.notFound("User not found");
    }
    return user;
  }
}

module.exports = GetCurrentUser;
