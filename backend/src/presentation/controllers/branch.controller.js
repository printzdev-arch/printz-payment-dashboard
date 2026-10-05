const GetAllBranches = require("../../application/use-cases/branches/GetAllBranches");
const GetBranchById = require("../../application/use-cases/branches/GetBranchById");
const CreateBranch = require("../../application/use-cases/branches/CreateBranch");
const UpdateBranch = require("../../application/use-cases/branches/UpdateBranch");
const DeleteBranch = require("../../application/use-cases/branches/DeleteBranch");
const { CreateBranchDto, UpdateBranchDto } = require("../../application/dto");
const branchRepository = require("../../infrastructure/database/mongoose/repositories/MongoBranchRepository");
const { asyncHandler, ResponseHelper } = require("../../shared");

const getAllBranchesUseCase = new GetAllBranches({ branchRepository });
const getBranchByIdUseCase = new GetBranchById({ branchRepository });
const createBranchUseCase = new CreateBranch({ branchRepository });
const updateBranchUseCase = new UpdateBranch({ branchRepository });
const deleteBranchUseCase = new DeleteBranch({ branchRepository });

const getAllBranches = asyncHandler(async (req, res) => {
  const branches = await getAllBranchesUseCase.execute();
  return ResponseHelper.success(res, branches, "Branches retrieved successfully");
});

const getBranchById = asyncHandler(async (req, res) => {
  const branch = await getBranchByIdUseCase.execute(req.params.id);
  return ResponseHelper.success(res, branch, "Branch retrieved successfully");
});

const createBranch = asyncHandler(async (req, res) => {
  const createBranchDto = CreateBranchDto.fromRequest(req);
  const branch = await createBranchUseCase.execute(createBranchDto);
  return ResponseHelper.created(res, branch, "Branch created successfully");
});

const updateBranch = asyncHandler(async (req, res) => {
  const updateBranchDto = UpdateBranchDto.fromRequest(req);
  const branch = await updateBranchUseCase.execute(req.params.id, updateBranchDto);
  return ResponseHelper.success(res, branch, "Branch updated successfully");
});

const deleteBranch = asyncHandler(async (req, res) => {
  const result = await deleteBranchUseCase.execute(req.params.id);
  return ResponseHelper.success(res, null, "Branch deleted successfully");
});

module.exports = {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
};
