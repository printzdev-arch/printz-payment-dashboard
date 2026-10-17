const express = require("express");
const router = express.Router();
const estimateController = require("../../controllers/estimate/estimate.controller");
const { authenticate } = require("../../middleware/auth.middleware");

// Routes can be used with or without auth depending on workflow
router.post("/", authenticate, estimateController.createEstimate);
router.get("/", authenticate, estimateController.getEstimates);
router.get("/:id", authenticate, estimateController.getEstimateById);
router.patch("/:id", authenticate, estimateController.updateEstimate);

module.exports = router;
