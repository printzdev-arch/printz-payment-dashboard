const mongoose = require("mongoose");
const Designation = require("../../infrastructure/database/mongoose/models/Designation");
const Department = require("../../infrastructure/database/mongoose/models/Department");
const Employee = require("../../infrastructure/database/mongoose/models/Employee");
const auditService = require("../../infrastructure/audit/AuditService");
const { asyncHandler, ResponseHelper } = require("../../shared");
const ErrorHelper = require("../../shared/errors/ErrorHelper");

const createDesignation = asyncHandler(async (req, res) => {
  const { name, code, departmentId, description, isActive } = req.body || {};
  if (!name || !code) {
    throw ErrorHelper.badRequest("Designation name and code are required.");
  }

  const normalizedCode = code.trim().toUpperCase();
  const existing = await Designation.findOne({ code: normalizedCode });
  if (existing) {
    throw ErrorHelper.conflict(`Designation with code '${normalizedCode}' already exists.`);
  }

  if (departmentId) {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ErrorHelper.badRequest("Invalid departmentId format.");
    }
    const dept = await Department.findById(departmentId);
    if (!dept || !dept.isActive) {
      throw ErrorHelper.badRequest("Department does not exist or is inactive.");
    }
  }

  const designation = await Designation.create({
    name: name.trim(),
    code: normalizedCode,
    departmentId: departmentId || null,
    description: description ? description.trim() : "",
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  await auditService.log({
    event: "DESIGNATION_CREATED",
    action: "DESIGNATION_CREATE",
    userId: req.user?._id || req.user?.id,
    userEmail: req.user?.email,
    resourceType: "Designation",
    resourceId: designation._id,
    after: designation.toObject(),
    status: "SUCCESS",
  });

  return ResponseHelper.created(res, designation, "Designation created successfully.");
});

const getDesignations = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === "true";
  }
  if (req.query.departmentId && mongoose.Types.ObjectId.isValid(req.query.departmentId)) {
    query.departmentId = req.query.departmentId;
  }
  const designations = await Designation.find(query)
    .populate("departmentId", "name code")
    .sort({ name: 1 })
    .lean();
  return ResponseHelper.success(res, designations, "Designations retrieved successfully.");
});

const getDesignationById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw ErrorHelper.notFound("Designation not found.");
  }
  const designation = await Designation.findById(req.params.id)
    .populate("departmentId", "name code")
    .lean();
  if (!designation) {
    throw ErrorHelper.notFound("Designation not found.");
  }
  return ResponseHelper.success(res, designation, "Designation retrieved successfully.");
});

const updateDesignation = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw ErrorHelper.notFound("Designation not found.");
  }

  const designation = await Designation.findById(req.params.id);
  if (!designation) {
    throw ErrorHelper.notFound("Designation not found.");
  }

  const { name, code, departmentId, description, isActive } = req.body || {};
  const beforeState = designation.toObject();

  if (code) {
    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode !== designation.code) {
      const existing = await Designation.findOne({
        code: normalizedCode,
        _id: { $ne: designation._id },
      });
      if (existing) {
        throw ErrorHelper.conflict(`Designation with code '${normalizedCode}' already exists.`);
      }
      designation.code = normalizedCode;
    }
  }

  if (departmentId !== undefined) {
    if (departmentId && !mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ErrorHelper.badRequest("Invalid departmentId format.");
    }
    if (departmentId) {
      const dept = await Department.findById(departmentId);
      if (!dept || !dept.isActive) {
        throw ErrorHelper.badRequest("Department does not exist or is inactive.");
      }
    }
    designation.departmentId = departmentId || null;
  }

  if (name !== undefined) designation.name = name.trim();
  if (description !== undefined) designation.description = description.trim();
  if (isActive !== undefined) {
    if (!isActive && designation.isActive) {
      // Check if active employees are assigned to this designation
      const activeEmployeeCount = await Employee.countDocuments({
        designationId: designation._id,
        employmentStatus: "ACTIVE",
        isActive: true,
      });
      if (activeEmployeeCount > 0) {
        throw ErrorHelper.conflict(
          `Cannot deactivate designation: ${activeEmployeeCount} active employee(s) are assigned to this designation.`
        );
      }
    }
    designation.isActive = Boolean(isActive);
  }

  await designation.save();

  await auditService.log({
    event: "DESIGNATION_UPDATED",
    action: "DESIGNATION_UPDATE",
    userId: req.user?._id || req.user?.id,
    userEmail: req.user?.email,
    resourceType: "Designation",
    resourceId: designation._id,
    before: beforeState,
    after: designation.toObject(),
    status: "SUCCESS",
  });

  return ResponseHelper.success(res, designation, "Designation updated successfully.");
});

const deactivateDesignation = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw ErrorHelper.notFound("Designation not found.");
  }

  const designation = await Designation.findById(req.params.id);
  if (!designation) {
    throw ErrorHelper.notFound("Designation not found.");
  }

  const activeEmployeeCount = await Employee.countDocuments({
    designationId: designation._id,
    employmentStatus: "ACTIVE",
    isActive: true,
  });

  if (activeEmployeeCount > 0) {
    throw ErrorHelper.conflict(
      `Cannot deactivate designation: ${activeEmployeeCount} active employee(s) are assigned to this designation.`
    );
  }

  const beforeState = designation.toObject();
  designation.isActive = false;
  await designation.save();

  await auditService.log({
    event: "DESIGNATION_DEACTIVATED",
    action: "DESIGNATION_DEACTIVATE",
    userId: req.user?._id || req.user?.id,
    userEmail: req.user?.email,
    resourceType: "Designation",
    resourceId: designation._id,
    before: beforeState,
    after: designation.toObject(),
    status: "SUCCESS",
  });

  return ResponseHelper.success(res, designation, "Designation deactivated successfully.");
});

const activateDesignation = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw ErrorHelper.notFound("Designation not found.");
  }

  const designation = await Designation.findById(req.params.id);
  if (!designation) {
    throw ErrorHelper.notFound("Designation not found.");
  }

  const beforeState = designation.toObject();
  designation.isActive = true;
  await designation.save();

  await auditService.log({
    event: "DESIGNATION_ACTIVATED",
    action: "DESIGNATION_ACTIVATE",
    userId: req.user?._id || req.user?.id,
    userEmail: req.user?.email,
    resourceType: "Designation",
    resourceId: designation._id,
    before: beforeState,
    after: designation.toObject(),
    status: "SUCCESS",
  });

  return ResponseHelper.success(res, designation, "Designation activated successfully.");
});

module.exports = {
  createDesignation,
  getDesignations,
  getDesignationById,
  updateDesignation,
  deactivateDesignation,
  activateDesignation,
};
