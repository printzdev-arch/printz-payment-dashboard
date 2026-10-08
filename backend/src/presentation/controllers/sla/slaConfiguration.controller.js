const asyncHandler = require("../../../shared/asyncHandler");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const slaConfigurationService = require("../../../application/services/sla/slaConfiguration.service");
const SlaConfigurationDto = require("../../../application/dto/sla/SlaConfigurationDto");

const listConfigurations = asyncHandler(async (req, res) => {
  const configs = await slaConfigurationService.list(req.query);
  return ResponseHelper.ok(
    res,
    "SLA Configurations retrieved successfully",
    SlaConfigurationDto.toResponseList(configs)
  );
});

const getConfigurationById = asyncHandler(async (req, res) => {
  const config = await slaConfigurationService.getById(req.params.id);
  return ResponseHelper.ok(
    res,
    "SLA Configuration retrieved successfully",
    SlaConfigurationDto.toResponse(config)
  );
});

const createConfiguration = asyncHandler(async (req, res) => {
  const config = await slaConfigurationService.create(req.body, req.user);
  return ResponseHelper.created(
    res,
    "SLA Configuration created successfully",
    SlaConfigurationDto.toResponse(config)
  );
});

const updateConfiguration = asyncHandler(async (req, res) => {
  const config = await slaConfigurationService.update(req.params.id, req.body, req.user);
  return ResponseHelper.ok(
    res,
    "SLA Configuration updated successfully",
    SlaConfigurationDto.toResponse(config)
  );
});

const deactivateConfiguration = asyncHandler(async (req, res) => {
  const config = await slaConfigurationService.deactivate(req.params.id, req.user);
  return ResponseHelper.ok(
    res,
    "SLA Configuration deactivated successfully",
    SlaConfigurationDto.toResponse(config)
  );
});

module.exports = {
  listConfigurations,
  getConfigurationById,
  createConfiguration,
  updateConfiguration,
  deactivateConfiguration,
};
