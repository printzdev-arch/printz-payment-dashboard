const express = require("express");
const router = express.Router();
const customerPortalController = require("../../controllers/customerPortal/customerPortal.controller");

// Customer portal routes (can be public or authenticated)
router.get("/estimates/:id", customerPortalController.getCustomerEstimate);
router.post("/estimates/:id/accept", customerPortalController.acceptCustomerEstimate);
router.post("/estimates/:id/reject", customerPortalController.rejectCustomerEstimate);

router.get("/design-approvals", customerPortalController.getCustomerDesignApprovals);
router.post("/design-approvals/:id/approve", customerPortalController.approveCustomerDesign);

module.exports = router;
