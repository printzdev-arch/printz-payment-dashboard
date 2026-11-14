const pastDateRequestService = require("../services/pastDateRequest.service");
const {
  CreatePastDateRequestDto,
  UpdatePastDateRequestDto,
  PastDateRequestResponseDto,
} = require("../../dto");
const { asyncHandler, ResponseHelper } = require("../../../utils");
const { sendPagingHeaders } = require("../../../utils/helpers/pagination");

// Older requests stored only the user's id in "requestedBy": show "Name (email)" instead
const OBJECT_ID = /^[a-f0-9]{24}$/i;
async function showRequesterNames(list) {
  const items = (Array.isArray(list) ? list : [list]).filter(Boolean);
  const ids = [...new Set(items.map((r) => String(r.requestedBy || "")).filter((v) => OBJECT_ID.test(v)))];
  if (ids.length === 0) return list;
  const User = require("../../auth/models/User");
  const mongoose = require("mongoose");
  const users = await User.find({ _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } }).select("name email").lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  items.forEach((r) => {
    const u = byId.get(String(r.requestedBy || ""));
    if (u && u.name) r.requestedBy = `${u.name}${u.email ? ` (${u.email})` : ""}`;
  });
  return list;
}

const getAllRequests = asyncHandler(async (req, res) => {
  const requests = await pastDateRequestService.getAllRequests(req.query);
  sendPagingHeaders(res, requests);
  const responseDto = await showRequesterNames(PastDateRequestResponseDto.fromEntities(requests));
  return ResponseHelper.success(res, responseDto, "Past date requests retrieved successfully");
});

const getRequestById = asyncHandler(async (req, res) => {
  const request = await pastDateRequestService.getRequestById(req.params.id);
  const responseDto = await showRequesterNames(PastDateRequestResponseDto.fromEntity(request));
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
