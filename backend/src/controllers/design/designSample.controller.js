const path = require("path");
const fs = require("fs");
const asyncHandler = require("../../utils/asyncHandler");
const ResponseHelper = require("../../utils/ResponseHelper");
const DesignSampleService = require("../../services/design/designSample.service");

const saveUploadedFile = (file) => {
  if (!file) return { fileId: null, fileUrl: null };
  const uploadRoot = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
  }
  const ext = path.extname(file.originalname || "") || ".png";
  const filename = `sample-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const targetPath = path.join(uploadRoot, filename);
  if (file.buffer) {
    fs.writeFileSync(targetPath, file.buffer);
    return { fileId: filename, fileUrl: `/uploads/${filename}` };
  }
  return { fileId: file.filename || null, fileUrl: file.filename ? `/uploads/${file.filename}` : null };
};

/**
 * Design Samples & Approvals Controller
 */
const uploadSample = asyncHandler(async (req, res) => {
  let { fileId, fileUrl } = saveUploadedFile(req.file);
  const sampleData = {
    ...req.body,
    fileId: fileId || req.body.fileId,
    fileUrl: fileUrl || req.body.fileUrl,
  };

  const sample = await DesignSampleService.uploadSample(req.params.id, sampleData, req.user);
  return ResponseHelper.created(res, sample, "Design sample uploaded as DRAFT");
});

const patchSample = asyncHandler(async (req, res) => {
  let { fileId, fileUrl } = saveUploadedFile(req.file);
  const sampleData = {
    ...req.body,
    ...(fileId && { fileId }),
    ...(fileUrl && { fileUrl }),
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

const listAllSamples = asyncHandler(async (req, res) => {
  const samples = await DesignSampleService.listAllSamples(req.query.limit || 50);
  return ResponseHelper.ok(res, "Sample designs retrieved successfully", samples);
});

const rejectSampleDesign = asyncHandler(async (req, res) => {
  const result = await DesignSampleService.rejectSampleDesign(req.params.id, req.body, req.user);
  return ResponseHelper.ok(res, "Sample rejected. Returned for revision.", result);
});

const approveDesign = asyncHandler(async (req, res) => {
  const result = await DesignSampleService.approveDesign(
    req.params.id,
    req.body,
    req.user
  );
  return ResponseHelper.ok(res, "Artwork approved successfully", result);
});

const submitProofDirect = asyncHandler(async (req, res) => {
  const result = await DesignSampleService.submitProofDirect(
    req.params.id,
    req.body,
    req.user
  );
  return ResponseHelper.ok(res, "Sample proof submitted for review successfully", result);
});

module.exports = {
  uploadSample,
  patchSample,
  submitSample,
  listSamples,
  listAllSamples,
  decide,
  approveDesign,
  rejectSampleDesign,
  submitProofDirect,
};
