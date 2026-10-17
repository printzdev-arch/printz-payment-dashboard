const totalAmountService = require("../../services/common/totalAmount.service");
const {
  SaveTotalAmountDto,
  UpdateTotalAmountDto,
  TotalAmountResponseDto,
} = require("../../utils/dto");
const { asyncHandler, ResponseHelper } = require("../../utils");

const getAllTotalAmounts = asyncHandler(async (req, res) => {
  const readings = await totalAmountService.getAllTotalAmounts(req.query);
  return ResponseHelper.success(
    res,
    TotalAmountResponseDto.fromEntities(readings),
    "Total amount readings retrieved successfully"
  );
});

const getTotalAmountById = asyncHandler(async (req, res) => {
  const reading = await totalAmountService.getTotalAmountById(req.params.id);
  return ResponseHelper.success(
    res,
    TotalAmountResponseDto.fromEntity(reading),
    "Record retrieved"
  );
});

const saveTotalAmount = asyncHandler(async (req, res) => {
  const totalAmountDto = SaveTotalAmountDto.fromRequest(req);
  const { reading, isNew } = await totalAmountService.saveTotalAmount(totalAmountDto);
  if (isNew) {
    return ResponseHelper.created(
      res,
      TotalAmountResponseDto.fromEntity(reading),
      "Total amount reading created successfully"
    );
  }
  return ResponseHelper.success(
    res,
    TotalAmountResponseDto.fromEntity(reading),
    "Total amount reading updated successfully"
  );
});

const updateTotalAmount = asyncHandler(async (req, res) => {
  const updateDto = UpdateTotalAmountDto.fromRequest(req);
  const reading = await totalAmountService.updateTotalAmount(req.params.id, updateDto);
  return ResponseHelper.success(
    res,
    TotalAmountResponseDto.fromEntity(reading),
    "Record updated"
  );
});

const deleteTotalAmount = asyncHandler(async (req, res) => {
  await totalAmountService.deleteTotalAmount(req.params.id);
  return ResponseHelper.success(res, null, "Record deleted successfully");
});

module.exports = {
  getAllTotalAmounts,
  getTotalAmountById,
  saveTotalAmount,
  updateTotalAmount,
  deleteTotalAmount,
};
