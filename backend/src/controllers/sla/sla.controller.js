const asyncHandler = require("../../utils/asyncHandler");
const ResponseHelper = require("../../utils/ResponseHelper");
const slaService = require("../../services/sla/sla.service");
const SlaStatusDto = require("../../utils/dto/sla/SlaStatusDto");

const getJobOrderSla = asyncHandler(async (req, res) => {
  const result = await slaService.evaluate(req.params.id);
  return ResponseHelper.ok(
    res,
    "Job SLA evaluation retrieved successfully",
    SlaStatusDto.toResponse(result)
  );
});

const getSlaSummary = asyncHandler(async (req, res) => {
  const summary = await slaService.getSummary(req.query);
  return ResponseHelper.ok(res, "SLA summary retrieved successfully", summary);
});

const getAtRiskSla = asyncHandler(async (req, res) => {
  const atRisk = await slaService.getAtRisk(req.query);
  return ResponseHelper.ok(res, "At-risk SLA segments retrieved successfully", atRisk);
});

module.exports = {
  getJobOrderSla,
  getSlaSummary,
  getAtRiskSla,
};
