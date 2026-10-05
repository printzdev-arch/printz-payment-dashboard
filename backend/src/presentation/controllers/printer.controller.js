const GetAllPrinters = require("../../application/use-cases/printers/GetAllPrinters");
const GetPrinterById = require("../../application/use-cases/printers/GetPrinterById");
const CreatePrinter = require("../../application/use-cases/printers/CreatePrinter");
const UpdatePrinter = require("../../application/use-cases/printers/UpdatePrinter");
const DeletePrinter = require("../../application/use-cases/printers/DeletePrinter");
const { CreatePrinterDto, UpdatePrinterDto, PrinterResponseDto } = require("../../application/dto");
const printerRepository = require("../../infrastructure/database/mongoose/repositories/MongoPrinterRepository");
const { asyncHandler, ResponseHelper } = require("../../shared");

const getAllPrintersUseCase = new GetAllPrinters({ printerRepository });
const getPrinterByIdUseCase = new GetPrinterById({ printerRepository });
const createPrinterUseCase = new CreatePrinter({ printerRepository });
const updatePrinterUseCase = new UpdatePrinter({ printerRepository });
const deletePrinterUseCase = new DeletePrinter({ printerRepository });

const getAllPrinters = asyncHandler(async (req, res) => {
  const printers = await getAllPrintersUseCase.execute(req.query);
  return ResponseHelper.success(
    res,
    PrinterResponseDto.fromEntities(printers),
    "Printers retrieved successfully"
  );
});

const getPrinterById = asyncHandler(async (req, res) => {
  const printer = await getPrinterByIdUseCase.execute(req.params.id);
  return ResponseHelper.success(
    res,
    PrinterResponseDto.fromEntity(printer),
    "Printer retrieved successfully"
  );
});

const createPrinter = asyncHandler(async (req, res) => {
  const createPrinterDto = CreatePrinterDto.fromRequest(req);
  const printer = await createPrinterUseCase.execute(createPrinterDto);
  return ResponseHelper.created(
    res,
    PrinterResponseDto.fromEntity(printer),
    "Printer created successfully"
  );
});

const updatePrinter = asyncHandler(async (req, res) => {
  const updatePrinterDto = UpdatePrinterDto.fromRequest(req);
  const printer = await updatePrinterUseCase.execute(req.params.id, updatePrinterDto);
  return ResponseHelper.success(
    res,
    PrinterResponseDto.fromEntity(printer),
    "Printer updated successfully"
  );
});

const deletePrinter = asyncHandler(async (req, res) => {
  const result = await deletePrinterUseCase.execute(req.params.id);
  return ResponseHelper.success(res, result, "Printer deleted successfully");
});

module.exports = {
  getAllPrinters,
  getPrinterById,
  createPrinter,
  updatePrinter,
  deletePrinter,
};

