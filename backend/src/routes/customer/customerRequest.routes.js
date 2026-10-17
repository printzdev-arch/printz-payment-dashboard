const express = require("express");
const router = express.Router();
const CustomerRequestController = require("../../controllers/customer/customerRequest.controller");
const { authenticate } = require("../../middleware/auth.middleware");

// All routes require authentication for staff / branch managers
router.use(authenticate);

// List customer requests with filters
router.get("/", CustomerRequestController.getCustomerRequests);

// Get single customer request details
router.get("/:id", CustomerRequestController.getCustomerRequestById);

// Update status (UNDER_REVIEW, REJECTED, CANCELLED)
router.patch("/:id/status", CustomerRequestController.updateStatus);

// Convert staged enquiry directly to active Job Order
router.post("/:id/convert-to-job", CustomerRequestController.convertToJobOrder);

module.exports = router;
