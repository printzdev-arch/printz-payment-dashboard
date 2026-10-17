const mongoose = require("mongoose");
const Designation = require("../../models/common/Designation");
const Department = require("../../models/common/Department");
const Employee = require("../../models/auth/Employee");
const AuditHelper = require("../../utils/helpers/common/AuditHelper");
const ApiError = require("../../utils/ApiError");

class DesignationService {
  async createDesignation({ name, code, departmentId, description, isActive }, user = {}) {
    if (!name || !code) {
      throw ApiError.badRequest("Designation name and code are required.");
    }

    const normalizedCode = code.trim().toUpperCase();
    const existing = await Designation.findOne({ code: normalizedCode });
    if (existing) {
      throw ApiError.conflict(`Designation with code '${normalizedCode}' already exists.`);
    }

    if (departmentId) {
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw ApiError.badRequest("Invalid departmentId format.");
      }
      const dept = await Department.findById(departmentId);
      if (!dept || !dept.isActive) {
        throw ApiError.badRequest("Department does not exist or is inactive.");
      }
    }

    const designation = await Designation.create({
      name: name.trim(),
      code: normalizedCode,
      departmentId: departmentId || null,
      description: description ? description.trim() : "",
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    await AuditHelper.log({
      action: "DESIGNATION_CREATE",
      actorId: user._id || user.id,
      actorName: user.email,
      entityType: "DESIGNATION",
      entityId: designation._id,
      after: designation.toObject ? designation.toObject() : designation,
    });

    return designation;
  }

  async getDesignations(queryFilter = {}) {
    const query = {};
    if (queryFilter.isActive !== undefined) {
      query.isActive = queryFilter.isActive === "true" || queryFilter.isActive === true;
    }
    if (queryFilter.departmentId && mongoose.Types.ObjectId.isValid(queryFilter.departmentId)) {
      query.departmentId = queryFilter.departmentId;
    }
    return Designation.find(query)
      .populate("departmentId", "name code")
      .sort({ name: 1 })
      .lean();
  }

  async getDesignationById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Designation not found.");
    }
    const designation = await Designation.findById(id)
      .populate("departmentId", "name code")
      .lean();
    if (!designation) {
      throw ApiError.notFound("Designation not found.");
    }
    return designation;
  }

  async updateDesignation(id, { name, code, departmentId, description, isActive }, user = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Designation not found.");
    }

    const designation = await Designation.findById(id);
    if (!designation) {
      throw ApiError.notFound("Designation not found.");
    }

    const beforeState = designation.toObject();

    if (code) {
      const normalizedCode = code.trim().toUpperCase();
      if (normalizedCode !== designation.code) {
        const existing = await Designation.findOne({
          code: normalizedCode,
          _id: { $ne: designation._id },
        });
        if (existing) {
          throw ApiError.conflict(`Designation with code '${normalizedCode}' already exists.`);
        }
        designation.code = normalizedCode;
      }
    }

    if (departmentId !== undefined) {
      if (departmentId === null || departmentId === "") {
        designation.departmentId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(departmentId)) {
          throw ApiError.badRequest("Invalid departmentId format.");
        }
        const dept = await Department.findById(departmentId);
        if (!dept || !dept.isActive) {
          throw ApiError.badRequest("Department does not exist or is inactive.");
        }
        designation.departmentId = departmentId;
      }
    }

    if (name !== undefined) designation.name = name.trim();
    if (description !== undefined) designation.description = description.trim();
    if (isActive !== undefined) {
      if (!isActive && designation.isActive) {
        const activeEmployeeCount = await Employee.countDocuments({
          designationId: designation._id,
          employmentStatus: "ACTIVE",
          isActive: true,
        });
        if (activeEmployeeCount > 0) {
          throw ApiError.conflict(
            `Cannot deactivate designation: ${activeEmployeeCount} active employee(s) hold this designation.`
          );
        }
      }
      designation.isActive = Boolean(isActive);
    }

    await designation.save();

    await AuditHelper.log({
      action: "DESIGNATION_UPDATE",
      actorId: user._id || user.id,
      actorName: user.email,
      entityType: "DESIGNATION",
      entityId: designation._id,
      before: beforeState,
      after: designation.toObject(),
    });

    return designation;
  }

  async deactivateDesignation(id, user = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Designation not found.");
    }

    const designation = await Designation.findById(id);
    if (!designation) {
      throw ApiError.notFound("Designation not found.");
    }

    const activeEmployeeCount = await Employee.countDocuments({
      designationId: designation._id,
      employmentStatus: "ACTIVE",
      isActive: true,
    });

    if (activeEmployeeCount > 0) {
      throw ApiError.conflict(
        `Cannot deactivate designation: ${activeEmployeeCount} active employee(s) hold this designation.`
      );
    }

    const beforeState = designation.toObject();
    designation.isActive = false;
    await designation.save();

    await AuditHelper.log({
      action: "DESIGNATION_DEACTIVATE",
      actorId: user._id || user.id,
      actorName: user.email,
      entityType: "DESIGNATION",
      entityId: designation._id,
      before: beforeState,
      after: designation.toObject(),
    });

    return designation;
  }

  async activateDesignation(id, user = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Designation not found.");
    }

    const designation = await Designation.findById(id);
    if (!designation) {
      throw ApiError.notFound("Designation not found.");
    }

    const beforeState = designation.toObject();
    designation.isActive = true;
    await designation.save();

    await AuditHelper.log({
      action: "DESIGNATION_ACTIVATE",
      actorId: user._id || user.id,
      actorName: user.email,
      entityType: "DESIGNATION",
      entityId: designation._id,
      before: beforeState,
      after: designation.toObject(),
    });

    return designation;
  }
}

module.exports = new DesignationService();
