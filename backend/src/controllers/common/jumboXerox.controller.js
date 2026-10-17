const jumboXeroxService = require("../../services/common/jumboXerox.service");
const {
  CreateJumboXeroxMachineDto,
  UpdateJumboXeroxMachineDto,
  JumboXeroxMachineResponseDto,
  SaveJumboXeroxReadingDto,
} = require("../../utils/dto");
const { asyncHandler, ResponseHelper } = require("../../utils");

// Machines CRUD
const getAllMachines = asyncHandler(async (req, res) => {
  const machines = await jumboXeroxService.getAllMachines(req.query);
  const responseDto = JumboXeroxMachineResponseDto.fromEntities(machines);
  return ResponseHelper.success(res, responseDto, "Jumbo Xerox machines retrieved");
});

const getMachineById = asyncHandler(async (req, res) => {
  const machine = await jumboXeroxService.getMachineById(req.params.id);
  const responseDto = JumboXeroxMachineResponseDto.fromEntity(machine);
  return ResponseHelper.success(res, responseDto, "Jumbo Xerox machine details retrieved");
});

const saveMachine = asyncHandler(async (req, res) => {
  const machineDto = CreateJumboXeroxMachineDto.fromRequest(req);
  const created = await jumboXeroxService.saveMachine(machineDto);
  const responseDto = JumboXeroxMachineResponseDto.fromEntity(created);
  return ResponseHelper.created(res, responseDto, "Machine created successfully");
});

const updateMachine = asyncHandler(async (req, res) => {
  const updateDto = UpdateJumboXeroxMachineDto.fromRequest(req);
  const updated = await jumboXeroxService.updateMachine(req.params.id, updateDto);
  const responseDto = JumboXeroxMachineResponseDto.fromEntity(updated);
  return ResponseHelper.success(res, responseDto, "Machine updated successfully");
});

const deleteMachine = asyncHandler(async (req, res) => {
  await jumboXeroxService.deleteMachine(req.params.id);
  return ResponseHelper.success(res, null, "Machine deleted successfully");
});

// Readings CRUD
const getAllReadings = asyncHandler(async (req, res) => {
  const readings = await jumboXeroxService.getAllReadings(req.query);
  return ResponseHelper.success(res, readings, "Jumbo Xerox readings retrieved");
});

const saveReading = asyncHandler(async (req, res) => {
  const readingDto = SaveJumboXeroxReadingDto.fromRequest(req);
  const { reading, isNew } = await jumboXeroxService.saveReading(readingDto);
  if (isNew) {
    return ResponseHelper.created(res, reading, "Jumbo Xerox reading saved");
  }
  return ResponseHelper.success(res, reading, "Jumbo Xerox reading updated");
});

const deleteReading = asyncHandler(async (req, res) => {
  await jumboXeroxService.deleteReading(req.params.id);
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
