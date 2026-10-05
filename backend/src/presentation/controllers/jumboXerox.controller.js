const GetAllJumboXeroxMachines = require("../../application/use-cases/jumbo-xerox/GetAllJumboXeroxMachines");
const GetJumboXeroxMachineById = require("../../application/use-cases/jumbo-xerox/GetJumboXeroxMachineById");
const SaveJumboXeroxMachine = require("../../application/use-cases/jumbo-xerox/SaveJumboXeroxMachine");
const UpdateJumboXeroxMachine = require("../../application/use-cases/jumbo-xerox/UpdateJumboXeroxMachine");
const DeleteJumboXeroxMachine = require("../../application/use-cases/jumbo-xerox/DeleteJumboXeroxMachine");
const GetAllJumboXeroxReadings = require("../../application/use-cases/jumbo-xerox/GetAllJumboXeroxReadings");
const SaveJumboXeroxReading = require("../../application/use-cases/jumbo-xerox/SaveJumboXeroxReading");
const DeleteJumboXeroxReading = require("../../application/use-cases/jumbo-xerox/DeleteJumboXeroxReading");
const {
  SaveJumboXeroxMachineDto,
  CreateJumboXeroxMachineDto,
  UpdateJumboXeroxMachineDto,
  JumboXeroxMachineResponseDto,
  SaveJumboXeroxReadingDto,
} = require("../../application/dto");

const jumboXeroxRepository = require("../../infrastructure/database/mongoose/repositories/MongoJumboXeroxRepository");
const jumboXeroxReadingRepository = require("../../infrastructure/database/mongoose/repositories/MongoJumboXeroxReadingRepository");
const branchRepository = require("../../infrastructure/database/mongoose/repositories/MongoBranchRepository");
const { asyncHandler, ResponseHelper } = require("../../shared");

const getAllMachinesUseCase = new GetAllJumboXeroxMachines({ jumboXeroxRepository });
const getMachineByIdUseCase = new GetJumboXeroxMachineById({ jumboXeroxRepository });
const saveMachineUseCase = new SaveJumboXeroxMachine({ jumboXeroxRepository, branchRepository });
const updateMachineUseCase = new UpdateJumboXeroxMachine({ jumboXeroxRepository, branchRepository });
const deleteMachineUseCase = new DeleteJumboXeroxMachine({ jumboXeroxRepository });

const getAllReadingsUseCase = new GetAllJumboXeroxReadings({ jumboXeroxReadingRepository });
const saveReadingUseCase = new SaveJumboXeroxReading({ jumboXeroxReadingRepository });
const deleteReadingUseCase = new DeleteJumboXeroxReading({ jumboXeroxReadingRepository });

// Machines CRUD
const getAllMachines = asyncHandler(async (req, res) => {
  const machines = await getAllMachinesUseCase.execute(req.query);
  const responseDto = JumboXeroxMachineResponseDto.fromEntities(machines);
  return ResponseHelper.success(res, responseDto, "Jumbo Xerox machines retrieved");
});

const getMachineById = asyncHandler(async (req, res) => {
  const machine = await getMachineByIdUseCase.execute(req.params.id);
  const responseDto = JumboXeroxMachineResponseDto.fromEntity(machine);
  return ResponseHelper.success(res, responseDto, "Jumbo Xerox machine details retrieved");
});

const saveMachine = asyncHandler(async (req, res) => {
  const machineDto = CreateJumboXeroxMachineDto.fromRequest(req);
  const created = await saveMachineUseCase.execute(machineDto);
  const responseDto = JumboXeroxMachineResponseDto.fromEntity(created);
  return ResponseHelper.created(res, responseDto, "Machine created successfully");
});

const updateMachine = asyncHandler(async (req, res) => {
  const updateDto = UpdateJumboXeroxMachineDto.fromRequest(req);
  const updated = await updateMachineUseCase.execute(req.params.id, updateDto);
  const responseDto = JumboXeroxMachineResponseDto.fromEntity(updated);
  return ResponseHelper.success(res, responseDto, "Machine updated successfully");
});

const deleteMachine = asyncHandler(async (req, res) => {
  await deleteMachineUseCase.execute(req.params.id);
  return ResponseHelper.success(res, null, "Machine deleted successfully");
});

// Readings CRUD
const getAllReadings = asyncHandler(async (req, res) => {
  const readings = await getAllReadingsUseCase.execute(req.query);
  return ResponseHelper.success(res, readings, "Jumbo Xerox readings retrieved");
});

const saveReading = asyncHandler(async (req, res) => {
  const readingDto = SaveJumboXeroxReadingDto.fromRequest(req);
  const { reading, isNew } = await saveReadingUseCase.execute(readingDto);
  if (isNew) {
    return ResponseHelper.created(res, reading, "Jumbo Xerox reading saved");
  }
  return ResponseHelper.success(res, reading, "Jumbo Xerox reading updated");
});

const deleteReading = asyncHandler(async (req, res) => {
  await deleteReadingUseCase.execute(req.params.id);
  return ResponseHelper.success(res, null, "Jumbo Xerox reading deleted");
});

module.exports = {
  getAllMachines,
  getMachineById,
  saveMachine,
  updateMachine,
  deleteMachine,
  getAllReadings,
  saveReading,
  deleteReading,
};
