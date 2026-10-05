const GetAllTotalAmounts = require("../../application/use-cases/total-amounts/GetAllTotalAmounts");
const GetTotalAmountById = require("../../application/use-cases/total-amounts/GetTotalAmountById");
const SaveTotalAmount = require("../../application/use-cases/total-amounts/SaveTotalAmount");
const UpdateTotalAmount = require("../../application/use-cases/total-amounts/UpdateTotalAmount");
const DeleteTotalAmount = require("../../application/use-cases/total-amounts/DeleteTotalAmount");
const {
  SaveTotalAmountDto,
  UpdateTotalAmountDto,
  TotalAmountResponseDto,
} = require("../../application/dto");

const totalAmountReadingRepository = require("../../infrastructure/database/mongoose/repositories/MongoTotalAmountReadingRepository");
const { asyncHandler, ResponseHelper } = require("../../shared");

const getAllTotalAmountsUseCase = new GetAllTotalAmounts({ totalAmountReadingRepository });
const getTotalAmountByIdUseCase = new GetTotalAmountById({ totalAmountReadingRepository });
const saveTotalAmountUseCase = new SaveTotalAmount({ totalAmountReadingRepository });
const updateTotalAmountUseCase = new UpdateTotalAmount({ totalAmountReadingRepository });
const deleteTotalAmountUseCase = new DeleteTotalAmount({ totalAmountReadingRepository });

const getAllTotalAmounts = asyncHandler(async (req, res) => {
  const readings = await getAllTotalAmountsUseCase.execute(req.query);
  return ResponseHelper.success(
    res,
    TotalAmountResponseDto.fromEntities(readings),
    "Total amount readings retrieved successfully"
  );
});

const getTotalAmountById = asyncHandler(async (req, res) => {
  const reading = await getTotalAmountByIdUseCase.execute(req.params.id);
  return ResponseHelper.success(
    res,
    TotalAmountResponseDto.fromEntity(reading),
    "Record retrieved"
  );
});

const saveTotalAmount = asyncHandler(async (req, res) => {
  const totalAmountDto = SaveTotalAmountDto.fromRequest(req);
  const { reading, isNew } = await saveTotalAmountUseCase.execute(totalAmountDto);
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
  const reading = await updateTotalAmountUseCase.execute(req.params.id, updateDto);
  return ResponseHelper.success(
    res,
    TotalAmountResponseDto.fromEntity(reading),
    "Record updated"
  );
});

const deleteTotalAmount = asyncHandler(async (req, res) => {
  await deleteTotalAmountUseCase.execute(req.params.id);
  return ResponseHelper.success(res, null, "Record deleted successfully");
});

module.exports = {
  getAllTotalAmounts,
  getTotalAmountById,
  saveTotalAmount,
  updateTotalAmount,
  deleteTotalAmount,
};

