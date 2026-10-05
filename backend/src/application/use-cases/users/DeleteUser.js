const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeleteUser {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(id, hardDelete = true) {
    const deletedUser = await this.userRepository.delete(id, hardDelete);
    if (!deletedUser) {
      throw ErrorHelper.notFound("User not found");
    }
    return { _id: id };
  }
}

module.exports = DeleteUser;
