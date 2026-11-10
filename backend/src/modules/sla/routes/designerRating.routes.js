const express = require("express");
const router = express.Router();
const designerRatingController = require("../controllers/designerRating.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { authorizePermission } = require("../../../middleware/security/permission.middleware");

// All routes require authentication
router.use(authenticate);

router.get(
  "/",
  authorizePermission("design", "read"),
  designerRatingController.listRatings
);

module.exports = router;
