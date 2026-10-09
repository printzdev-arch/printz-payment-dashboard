const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class GetRoleById {
  constructor({ roleRepository }) {
    this.roleRepository = roleRepository;
  }

  async execute(id) {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw ErrorHelper.notFound("Role not found.");
    }
    return role;
  }
}

module.exports = GetRoleById;
