class GetAllUsers {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(filters = {}) {
    return this.userRepository.findAll(filters);
  }
}

module.exports = GetAllUsers;
