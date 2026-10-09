const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeleteRole {
  constructor({ roleRepository }) {
    this.roleRepository = roleRepository;
  }

  async execute(id) {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw ErrorHelper.notFound("Role not found.");
    }

    if (role.isSystem) {
      throw ErrorHelper.forbidden("Built-in system roles cannot be deleted.");
    }

    return this.roleRepository.delete(id);
  }
}

module.exports = DeleteRole;
