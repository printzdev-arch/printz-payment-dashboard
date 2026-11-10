const express = require("express");
const requireDeleteApproval = require("../../delete-requests/middleware/requireDeleteApproval");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");

router.use(authenticate);

router.get("/", paymentController.getAllPayments);
router.get("/:id", paymentController.getPaymentById);
router.post("/", paymentController.createPayment);
router.put("/:id", paymentController.updatePayment);
router.delete("/:id", requireDeleteApproval("payment"), paymentController.deletePayment);

module.exports = router;
