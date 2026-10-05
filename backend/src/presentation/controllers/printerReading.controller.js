const GetAllPrinterReadings = require("../../application/use-cases/printer-readings/GetAllPrinterReadings");
const GetPrinterReadingById = require("../../application/use-cases/printer-readings/GetPrinterReadingById");
const SavePrinterReading = require("../../application/use-cases/printer-readings/SavePrinterReading");
const UpdatePrinterReading = require("../../application/use-cases/printer-readings/UpdatePrinterReading");
const DeletePrinterReading = require("../../application/use-cases/printer-readings/DeletePrinterReading");
const {
  CreatePrinterReadingDto,
  UpdatePrinterReadingDto,
  PrinterReadingResponseDto,
} = require("../../application/dto");
const printerReadingRepository = require("../../infrastructure/database/mongoose/repositories/MongoPrinterReadingRepository");
const { asyncHandler, ResponseHelper } = require("../../shared");

const getAllPrinterReadingsUseCase = new GetAllPrinterReadings({ printerReadingRepository });
const getPrinterReadingByIdUseCase = new GetPrinterReadingById({ printerReadingRepository });
const savePrinterReadingUseCase = new SavePrinterReading({ printerReadingRepository });
const updatePrinterReadingUseCase = new UpdatePrinterReading({ printerReadingRepository });
const deletePrinterReadingUseCase = new DeletePrinterReading({ printerReadingRepository });

const getAllReadings = asyncHandler(async (req, res) => {
  const readings = await getAllPrinterReadingsUseCase.execute(req.query);
  const responseDto = PrinterReadingResponseDto.fromEntities(readings);
  return ResponseHelper.success(res, responseDto, "Printer readings retrieved successfully");
});

const getReadingById = asyncHandler(async (req, res) => {
  const reading = await getPrinterReadingByIdUseCase.execute(req.params.id);
  const responseDto = PrinterReadingResponseDto.fromEntity(reading);
  return ResponseHelper.success(res, responseDto, "Printer reading retrieved successfully");
});

const saveReading = asyncHandler(async (req, res) => {
  const readingDto = CreatePrinterReadingDto.fromRequest(req);
  const { reading, isNew } = await savePrinterReadingUseCase.execute(readingDto);
  const responseDto = PrinterReadingResponseDto.fromEntity(reading);
  if (isNew) {
    return ResponseHelper.created(res, responseDto, "Printer reading saved successfully");
  }
  return ResponseHelper.success(res, responseDto, "Printer reading updated successfully");
});

const updateReading = asyncHandler(async (req, res) => {
  const updateDto = UpdatePrinterReadingDto.fromRequest(req);
  const reading = await updatePrinterReadingUseCase.execute(req.params.id, updateDto);
  const responseDto = PrinterReadingResponseDto.fromEntity(reading);
  return ResponseHelper.success(res, responseDto, "Printer reading updated successfully");
});

const deleteReading = asyncHandler(async (req, res) => {
  await deletePrinterReadingUseCase.execute(req.params.id);
  return ResponseHelper.success(res, null, "Printer reading deleted successfully");
});

module.exports = {
  getAllReadings,
  getReadingById,
  saveReading,
  updateReading,
  deleteReading,
};
