const designationService = require("../../services/common/designation.service");
const { asyncHandler, ResponseHelper } = require("../../utils");

const createDesignation = asyncHandler(async (req, res) => {
  const designation = await designationService.createDesignation(req.body || {}, req.user);
  return ResponseHelper.created(res, designation, "Designation created successfully.");
});

const getDesignations = asyncHandler(async (req, res) => {
  const designations = await designationService.getDesignations(req.query);
  return ResponseHelper.success(res, designations, "Designations retrieved successfully.");
});

const getDesignationById = asyncHandler(async (req, res) => {
  const designation = await designationService.getDesignationById(req.params.id);
  return ResponseHelper.success(res, designation, "Designation retrieved successfully.");
});

const updateDesignation = asyncHandler(async (req, res) => {
  const designation = await designationService.updateDesignation(req.params.id, req.body || {}, req.user);
  return ResponseHelper.success(res, designation, "Designation updated successfully.");
});

const deactivateDesignation = asyncHandler(async (req, res) => {
  const designation = await designationService.deactivateDesignation(req.params.id, req.user);
  return ResponseHelper.success(res, designation, "Designation deactivated successfully.");
});

const activateDesignation = asyncHandler(async (req, res) => {
  const designation = await designationService.activateDesignation(req.params.id, req.user);
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
