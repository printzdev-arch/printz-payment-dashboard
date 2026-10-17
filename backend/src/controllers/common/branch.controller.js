const branchService = require("../../services/common/branch.service");
const { CreateBranchDto, UpdateBranchDto } = require("../../utils/dto");
const { asyncHandler, ResponseHelper } = require("../../utils");

const getAllBranches = asyncHandler(async (req, res) => {
  const branches = await branchService.getAllBranches();
  return ResponseHelper.success(res, branches, "Branches retrieved successfully");
});

const getBranchById = asyncHandler(async (req, res) => {
  const branch = await branchService.getBranchById(req.params.id);
  return ResponseHelper.success(res, branch, "Branch retrieved successfully");
});

const createBranch = asyncHandler(async (req, res) => {
  const createBranchDto = CreateBranchDto.fromRequest(req);
  const branch = await branchService.createBranch(createBranchDto);
  return ResponseHelper.created(res, branch, "Branch created successfully");
});

const updateBranch = asyncHandler(async (req, res) => {
  const updateBranchDto = UpdateBranchDto.fromRequest(req);
  const branch = await branchService.updateBranch(req.params.id, updateBranchDto);
  return ResponseHelper.success(res, branch, "Branch updated successfully");
});

const deleteBranch = asyncHandler(async (req, res) => {
  await branchService.deleteBranch(req.params.id);
  return ResponseHelper.success(res, null, "Branch deleted successfully");
});

module.exports = {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
};
