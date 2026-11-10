const express = require("express");
const { requireAdmin } = require("../../../middleware/security/admin.middleware");
const router = express.Router();
const masterSettingController = require("../controllers/masterSetting.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");

// Public/Read-authenticated: all users can view master defaults
router.get("/", masterSettingController.getAllSettings);
router.get("/:category", masterSettingController.getCategory);

// Mutations require authentication
router.post("/:category/items", authenticate, requireAdmin, masterSettingController.addItem);
router.put("/:category/items/:itemId", authenticate, requireAdmin, masterSettingController.updateItem);
router.delete("/:category/items/:itemId", authenticate, requireAdmin, masterSettingController.deleteItem);

// Reset routes
router.post("/:category/reset", authenticate, requireAdmin, masterSettingController.resetCategory);
router.post("/reset-all", authenticate, requireAdmin, masterSettingController.resetAll);

module.exports = router;
