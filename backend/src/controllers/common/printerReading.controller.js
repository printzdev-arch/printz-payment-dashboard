const printerReadingService = require("../../services/common/printerReading.service");
const {
  CreatePrinterReadingDto,
  UpdatePrinterReadingDto,
  PrinterReadingResponseDto,
} = require("../../utils/dto");
const { asyncHandler, ResponseHelper } = require("../../utils");

const getAllReadings = asyncHandler(async (req, res) => {
  const readings = await printerReadingService.getAllReadings(req.query);
  const responseDto = PrinterReadingResponseDto.fromEntities(readings);
  return ResponseHelper.success(res, responseDto, "Printer readings retrieved successfully");
});

const getReadingById = asyncHandler(async (req, res) => {
  const reading = await printerReadingService.getReadingById(req.params.id);
  const responseDto = PrinterReadingResponseDto.fromEntity(reading);
  return ResponseHelper.success(res, responseDto, "Printer reading retrieved successfully");
});

const saveReading = asyncHandler(async (req, res) => {
  const readingDto = CreatePrinterReadingDto.fromRequest(req);
  const { reading, isNew } = await printerReadingService.saveReading(readingDto);
  const responseDto = PrinterReadingResponseDto.fromEntity(reading);
  if (isNew) {
    return ResponseHelper.created(res, responseDto, "Printer reading saved successfully");
  }
  return ResponseHelper.success(res, responseDto, "Printer reading updated successfully");
});

const updateReading = asyncHandler(async (req, res) => {
  const updateDto = UpdatePrinterReadingDto.fromRequest(req);
  const reading = await printerReadingService.updateReading(req.params.id, updateDto);
  const responseDto = PrinterReadingResponseDto.fromEntity(reading);
  return ResponseHelper.success(res, responseDto, "Printer reading updated successfully");
});

const deleteReading = asyncHandler(async (req, res) => {
  await printerReadingService.deleteReading(req.params.id);
  return ResponseHelper.success(res, null, "Printer reading deleted successfully");
});

module.exports = {
  getAllReadings,
  getReadingById,
  saveReading,
  updateReading,
  deleteReading,
};
