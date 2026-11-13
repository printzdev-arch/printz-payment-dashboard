const printerReadingService = require("../services/printerReading.service");
const {
  CreatePrinterReadingDto,
  UpdatePrinterReadingDto,
  PrinterReadingResponseDto,
} = require("../../dto");
const { asyncHandler, ResponseHelper } = require("../../../utils");
const { sendPagingHeaders } = require("../../../utils/helpers/pagination");

const getAllReadings = asyncHandler(async (req, res) => {
  const readings = await printerReadingService.getAllReadings(req.query);
  sendPagingHeaders(res, readings);
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

const getScanCheck = asyncHandler(async (req, res) => {
  const scanCheckService = require("../services/scanCheck.service");
  const result = await scanCheckService.getScanCheck({
    branchName: req.query.branchName || req.query.branch || req.query.branchId,
    date: req.query.date,
  });
  return ResponseHelper.success(res, result, "Scan check retrieved successfully");
});

module.exports = {
  getScanCheck,
  getAllReadings,
  getReadingById,
  saveReading,
  updateReading,
  deleteReading,
};
