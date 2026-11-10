const express = require("express");
const router = express.Router();
const controller = require("../controllers/whatsappWebhook.controller");

// No login: the provider is trusted by its signature (see the controller)
router.get("/whatsapp", controller.verify);
router.post("/whatsapp", controller.receive);

module.exports = router;
