const express = require("express");
const router = express.Router();
const totalAmountController = require("../controllers/totalAmount.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const requireDeleteApproval = require("../../delete-requests/middleware/requireDeleteApproval");

router.use(authenticate);

router.get("/", totalAmountController.getAllTotalAmounts);
router.get("/:id", totalAmountController.getTotalAmountById);
router.post("/", totalAmountController.saveTotalAmount);
router.put("/:id", totalAmountController.updateTotalAmount);
router.delete("/:id", requireDeleteApproval("totalAmount"), totalAmountController.deleteTotalAmount);

module.exports = router;
