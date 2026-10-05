/**
 * Branch Domain Entity
 */
class Branch {
  constructor({
    id,
    _id,
    name,
    location = "",
    address = "",
    phone = "",
    managerId = null,
    isActive = true,
    createdAt,
    updatedAt,
  }) {
    this.id = id || _id;
    this._id = _id || id;
    this.name = name ? name.trim() : "";
    this.location = location ? location.trim() : "";
    this.address = address ? address.trim() : "";
    this.phone = phone ? phone.trim() : "";
    this.managerId = managerId;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Branch;
