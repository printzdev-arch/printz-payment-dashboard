const express = require("express");
const router = express.Router();
const designerRatingController = require("../../controllers/sla/designerRating.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");

// All routes require authentication
router.use(authenticate);

router.get(
  "/",
  authorizePermission("design", "read"),
  designerRatingController.listRatings
);

module.exports = router;
