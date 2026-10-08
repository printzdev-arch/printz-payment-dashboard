const asyncHandler = require("../../../shared/asyncHandler");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const DesignSampleService = require("../../../application/services/design/designSample.service");

/**
 * Design Samples & Approvals Controller
 */
const uploadSample = asyncHandler(async (req, res) => {
  const sampleData = {
    ...req.body,
    fileId: req.file ? req.file.filename : req.body.fileId,
    fileUrl: req.file ? `/uploads/${req.file.filename}` : req.body.fileUrl,
  };

  const sample = await DesignSampleService.uploadSample(req.params.id, sampleData, req.user);
  return ResponseHelper.created(res, sample, "Design sample uploaded as DRAFT");
});

const patchSample = asyncHandler(async (req, res) => {
  const sampleData = {
    ...req.body,
    ...(req.file && {
      fileId: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
    }),
  };

  const sample = await DesignSampleService.patchSample(
    req.params.id,
    req.params.sampleId,
    sampleData,
    req.user
  );
  return ResponseHelper.ok(res, "Draft sample updated successfully", sample);
});

const submitSample = asyncHandler(async (req, res) => {
  const sample = await DesignSampleService.submitSample(
    req.params.id,
    req.params.sampleId,
    req.body,
    req.user
  );
  return ResponseHelper.ok(res, "Sample submitted for customer approval", sample);
});

const listSamples = asyncHandler(async (req, res) => {
  const samples = await DesignSampleService.listSamples(req.params.id);
  return ResponseHelper.ok(res, "Job samples retrieved successfully", samples);
});

const decide = asyncHandler(async (req, res) => {
  const sample = await DesignSampleService.decide(
    req.params.id,
    req.params.sampleId,
    req.body,
    req.user
  );
  return ResponseHelper.ok(res, "Sample approval decision recorded successfully", sample);
});

module.exports = {
  uploadSample,
  patchSample,
  submitSample,
  listSamples,
  decide,
};
