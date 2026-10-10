const express = require("express");
const router = express.Router();
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const publicJobRequestController = require("../../controllers/public/publicJobRequest.controller");
const publicDesignApprovalController = require("../../controllers/public/publicDesignApproval.controller");
const { publicJobRequestValidator } = require("../../validators/public/publicJobRequest.validator");
const { publicApprovalDecisionValidator } = require("../../validators/public/publicDesignApproval.validator");

// ── Rate Limiters for Public Abuse Protection ──
const jobRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many job requests submitted from this IP. Please wait a few minutes before trying again.",
    code: "TOO_MANY_REQUESTS",
  },
});

const previewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 preview requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many design preview requests. Please try again later.",
    code: "TOO_MANY_REQUESTS",
  },
});

const decisionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 decision submissions per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many approval attempts from this IP. Please try again later.",
    code: "TOO_MANY_REQUESTS",
  },
});

// ── File upload configuration for reference artwork (Max 25MB per file, up to 5 files) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 5,
  },
});

// Optional file upload middleware that won't fail if request is JSON
const optionalUpload = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    return upload.array("files", 5)(req, res, next);
  }
  next();
};

// ──────────────── REQUIREMENT 1: Customer QR Job Request ────────────────
router.post(
  "/job-requests",
  jobRequestLimiter,
  optionalUpload,
  publicJobRequestValidator,
  publicJobRequestController.submitJobRequest
);

// ──────────────── REQUIREMENT 2: WhatsApp Design Sample Approval ────────────────
router.get(
  "/design-approvals/:token",
  previewLimiter,
  publicDesignApprovalController.getPreview
);

router.get(
  "/design-approvals/:token/artwork",
  previewLimiter,
  publicDesignApprovalController.getArtwork
);

router.post(
  "/design-approvals/:token/decision",
  decisionLimiter,
  publicApprovalDecisionValidator,
  publicDesignApprovalController.submitDecision
);

module.exports = router;
