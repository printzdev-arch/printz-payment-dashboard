const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class GetUserById {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(id) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw ErrorHelper.notFound("User not found");
    }
    return user;
  }
}

module.exports = GetUserById;
