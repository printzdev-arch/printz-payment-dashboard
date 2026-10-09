class GetRoles {
  constructor({ roleRepository }) {
    this.roleRepository = roleRepository;
  }

  async execute() {
    return this.roleRepository.findAll();
  }
}

module.exports = GetRoles;
