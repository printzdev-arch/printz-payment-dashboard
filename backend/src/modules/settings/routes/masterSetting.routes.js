const express = require("express");
const router = express.Router();
const masterSettingController = require("../controllers/masterSetting.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");

// Public/Read-authenticated: all users can view master defaults
router.get("/", masterSettingController.getAllSettings);
router.get("/:category", masterSettingController.getCategory);

// Mutations require authentication
router.post("/:category/items", authenticate, masterSettingController.addItem);
router.put("/:category/items/:itemId", authenticate, masterSettingController.updateItem);
router.delete("/:category/items/:itemId", authenticate, masterSettingController.deleteItem);

// Reset routes
router.post("/:category/reset", authenticate, masterSettingController.resetCategory);
router.post("/reset-all", authenticate, masterSettingController.resetAll);

module.exports = router;
