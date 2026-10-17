const printerService = require("../../services/common/printer.service");
const { CreatePrinterDto, UpdatePrinterDto, PrinterResponseDto } = require("../../utils/dto");
const { asyncHandler, ResponseHelper } = require("../../utils");

const getAllPrinters = asyncHandler(async (req, res) => {
  const printers = await printerService.getAllPrinters(req.query);
  return ResponseHelper.success(
    res,
    PrinterResponseDto.fromEntities(printers),
    "Printers retrieved successfully"
  );
});

const getPrinterById = asyncHandler(async (req, res) => {
  const printer = await printerService.getPrinterById(req.params.id);
  return ResponseHelper.success(
    res,
    PrinterResponseDto.fromEntity(printer),
    "Printer retrieved successfully"
  );
});

const createPrinter = asyncHandler(async (req, res) => {
  const createPrinterDto = CreatePrinterDto.fromRequest(req);
  const printer = await printerService.createPrinter(createPrinterDto);
  return ResponseHelper.created(
    res,
    PrinterResponseDto.fromEntity(printer),
    "Printer created successfully"
  );
});

const updatePrinter = asyncHandler(async (req, res) => {
  const updatePrinterDto = UpdatePrinterDto.fromRequest(req);
  const printer = await printerService.updatePrinter(req.params.id, updatePrinterDto);
  return ResponseHelper.success(
    res,
    PrinterResponseDto.fromEntity(printer),
    "Printer updated successfully"
  );
});

const deletePrinter = asyncHandler(async (req, res) => {
  const result = await printerService.deletePrinter(req.params.id);
  return ResponseHelper.success(res, result, "Printer deleted successfully");
});

module.exports = {
  getAllPrinters,
  getPrinterById,
  createPrinter,
  updatePrinter,
  deletePrinter,
};
