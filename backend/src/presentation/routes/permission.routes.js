const express = require("express");
const router = express.Router();
const roleController = require("../controllers/role.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.use(authenticate);

// Get catalogue of system permissions
router.get("/", roleController.getPermissionsCatalogue);
router.get("/catalogue", roleController.getPermissionsCatalogue);

module.exports = router;
