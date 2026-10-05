/**
 * General Domain Data Transfer Objects (Category, FinalizedDate)
 */

class CreateCategoryDto {
  constructor({ categoryId, categoryName, name } = {}) {
    this.categoryId = typeof categoryId === "string" ? categoryId.trim() : (categoryId !== undefined && categoryId !== null ? String(categoryId).trim() : "");
    this.categoryName = typeof categoryName === "string" ? categoryName.trim() : (typeof name === "string" ? name.trim() : "");
  }

  static fromRequest(req) {
    return new CreateCategoryDto(req.body || {});
  }
}

class FinalizeDateDto {
  constructor({ branchName, branch, date, finalizedBy, notes } = {}) {
    this.branchName = (branchName || branch || "").trim();
    this.branch = this.branchName;
    this.date = date || new Date().toISOString().split("T")[0];
    this.finalizedBy = finalizedBy ? finalizedBy.trim() : "Admin";
    this.notes = notes ? notes.trim() : "";
  }

  static fromRequest(req) {
    const data = { ...req.body };
    if (req.user && !data.finalizedBy) {
      data.finalizedBy = req.user.name || req.user.email;
    }
    return new FinalizeDateDto(data);
  }
}

module.exports = {
  CreateCategoryDto,
  FinalizeDateDto,
};
