const express = require("express");
const router = express.Router();
const multer = require("multer");
const attachmentController = require("../../controllers/common/attachment.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/permission.middleware");
const PERMISSIONS = require("../../../shared/constants/permissions");

// Memory storage for multer (buffer is passed to service)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
});

router.use(authenticate);

// Upload new file attachment
router.post(
  "/",
  requirePermission(PERMISSIONS.COMMON.ATTACHMENT_UPLOAD, { branchField: "branchId" }),
  upload.single("file"),
  attachmentController.uploadAttachment
);

// List attachments
router.get("/", attachmentController.getAttachments);

// Get download / preview URL
router.get("/:id/url", attachmentController.getAttachmentUrl);

// Delete attachment
router.delete("/:id", attachmentController.deleteAttachment);

module.exports = router;
