const express = require("express");
const router = express.Router();
const slaConfigurationController = require("../controllers/slaConfiguration.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { authorizePermission } = require("../../../middleware/security/permission.middleware");
const {
  createSlaConfigValidator,
  updateSlaConfigValidator,
} = require("./sla.validator");

// All routes require authentication
router.use(authenticate);

router.get(
  "/",
  authorizePermission("sla", "read"),
  slaConfigurationController.listConfigurations
);

router.get(
  "/:id",
  authorizePermission("sla", "read"),
  slaConfigurationController.getConfigurationById
);

router.post(
  "/",
  createSlaConfigValidator,
  authorizePermission("sla", "create"),
  slaConfigurationController.createConfiguration
);

router.patch(
  "/:id",
  updateSlaConfigValidator,
  authorizePermission("sla", "update"),
  slaConfigurationController.updateConfiguration
);

router.post(
  "/:id/deactivate",
  authorizePermission("sla", "update"),
  slaConfigurationController.deactivateConfiguration
);

module.exports = router;
