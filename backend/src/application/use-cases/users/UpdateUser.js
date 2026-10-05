const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class UpdateUser {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(id, updateData) {
    const updatedUser = await this.userRepository.update(id, updateData);
    if (!updatedUser) {
      throw ErrorHelper.notFound("User not found");
    }
    return updatedUser;
  }
}

module.exports = UpdateUser;
