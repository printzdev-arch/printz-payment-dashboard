const GetAllPastDateRequests = require("../../application/use-cases/past-date-requests/GetAllPastDateRequests");
const GetPastDateRequestById = require("../../application/use-cases/past-date-requests/GetPastDateRequestById");
const CreatePastDateRequest = require("../../application/use-cases/past-date-requests/CreatePastDateRequest");
const UpdatePastDateRequest = require("../../application/use-cases/past-date-requests/UpdatePastDateRequest");
const DeletePastDateRequest = require("../../application/use-cases/past-date-requests/DeletePastDateRequest");
const {
  CreatePastDateRequestDto,
  UpdatePastDateRequestDto,
  PastDateRequestResponseDto,
} = require("../../application/dto");

const pastDateRequestRepository = require("../../infrastructure/database/mongoose/repositories/MongoPastDateRequestRepository");
const { asyncHandler, ResponseHelper } = require("../../shared");

const getAllPastDateRequestsUseCase = new GetAllPastDateRequests({ pastDateRequestRepository });
const getPastDateRequestByIdUseCase = new GetPastDateRequestById({ pastDateRequestRepository });
const createPastDateRequestUseCase = new CreatePastDateRequest({ pastDateRequestRepository });
const updatePastDateRequestUseCase = new UpdatePastDateRequest({ pastDateRequestRepository });
const deletePastDateRequestUseCase = new DeletePastDateRequest({ pastDateRequestRepository });

const getAllRequests = asyncHandler(async (req, res) => {
  const requests = await getAllPastDateRequestsUseCase.execute(req.query);
  const responseDto = PastDateRequestResponseDto.fromEntities(requests);
  return ResponseHelper.success(res, responseDto, "Past date requests retrieved successfully");
});

const getRequestById = asyncHandler(async (req, res) => {
  const request = await getPastDateRequestByIdUseCase.execute(req.params.id);
  const responseDto = PastDateRequestResponseDto.fromEntity(request);
  return ResponseHelper.success(res, responseDto, "Past date request retrieved successfully");
});

const createRequest = asyncHandler(async (req, res) => {
  const requestDto = CreatePastDateRequestDto.fromRequest(req);
  requestDto.validate();
  const request = await createPastDateRequestUseCase.execute(requestDto);
  const responseDto = PastDateRequestResponseDto.fromEntity(request);
  return ResponseHelper.created(res, responseDto, "Past date request submitted successfully");
});

const updateRequest = asyncHandler(async (req, res) => {
  const updateDto = UpdatePastDateRequestDto.fromRequest(req);
  updateDto.validate();
  const request = await updatePastDateRequestUseCase.execute(req.params.id, updateDto);
  const responseDto = PastDateRequestResponseDto.fromEntity(request);
  return ResponseHelper.success(res, responseDto, "Past date request updated successfully");
});

const deleteRequest = asyncHandler(async (req, res) => {
  await deletePastDateRequestUseCase.execute(req.params.id);
  return ResponseHelper.success(res, null, "Past date request deleted successfully");
});

module.exports = {
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequest,
  deleteRequest,
};
