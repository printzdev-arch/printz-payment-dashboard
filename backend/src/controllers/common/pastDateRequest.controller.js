const pastDateRequestService = require("../../services/common/pastDateRequest.service");
const {
  CreatePastDateRequestDto,
  UpdatePastDateRequestDto,
  PastDateRequestResponseDto,
} = require("../../utils/dto");
const { asyncHandler, ResponseHelper } = require("../../utils");

const getAllRequests = asyncHandler(async (req, res) => {
  const requests = await pastDateRequestService.getAllRequests(req.query);
  const responseDto = PastDateRequestResponseDto.fromEntities(requests);
  return ResponseHelper.success(res, responseDto, "Past date requests retrieved successfully");
});

const getRequestById = asyncHandler(async (req, res) => {
  const request = await pastDateRequestService.getRequestById(req.params.id);
  const responseDto = PastDateRequestResponseDto.fromEntity(request);
  return ResponseHelper.success(res, responseDto, "Past date request retrieved successfully");
});

const createRequest = asyncHandler(async (req, res) => {
  const requestDto = CreatePastDateRequestDto.fromRequest(req);
  const request = await pastDateRequestService.createRequest(requestDto);
  const responseDto = PastDateRequestResponseDto.fromEntity(request);
  return ResponseHelper.created(res, responseDto, "Past date request submitted successfully");
});

const updateRequest = asyncHandler(async (req, res) => {
  const updateDto = UpdatePastDateRequestDto.fromRequest(req);
  const request = await pastDateRequestService.updateRequest(req.params.id, updateDto);
  const responseDto = PastDateRequestResponseDto.fromEntity(request);
  return ResponseHelper.success(res, responseDto, "Past date request updated successfully");
});

const deleteRequest = asyncHandler(async (req, res) => {
  await pastDateRequestService.deleteRequest(req.params.id);
  return ResponseHelper.success(res, null, "Past date request deleted successfully");
});

module.exports = {
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequest,
  deleteRequest,
};
