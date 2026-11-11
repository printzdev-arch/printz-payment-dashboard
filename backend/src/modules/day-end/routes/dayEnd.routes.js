const express = require("express");
const router = express.Router();
const dayEndController = require("../controllers/dayEnd.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { authorizeRoles } = require("../../../middleware/security/role.middleware");

router.use(authenticate);

// Branch manager closes the day: builds the PDF and emails it to the admin
router.post("/close", authorizeRoles("BRANCH_MANAGER", "MANAGER"), dayEndController.closeDay);

module.exports = router;
