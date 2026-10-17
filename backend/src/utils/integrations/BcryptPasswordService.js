const bcrypt = require("bcryptjs");

/**
 * BcryptPasswordService
 * Infrastructure service implementing password hashing and comparison.
 */
class BcryptPasswordService {
  constructor(saltRounds = 10) {
    this.saltRounds = saltRounds;
  }

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(this.saltRounds);
    return bcrypt.hash(password, salt);
  }

  async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = new BcryptPasswordService();
