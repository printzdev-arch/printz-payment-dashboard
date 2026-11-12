const express = require("express");
const router = express.Router();
const branchController = require("../controllers/branch.controller");
const publicJobRequestController = require("../../public/controllers/publicJobRequest.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { authorizeRoles } = require("../../../middleware/security/role.middleware");
const { createBranchValidator, updateBranchValidator } = require("./branch.validator");

// All branch routes require authentication
router.use(authenticate);

router.get("/", branchController.getAllBranches);
router.get("/:id", branchController.getBranchById);
router.get("/:branchId/job-request-qr", publicJobRequestController.getBranchQrConfig);

router.post("/", authorizeRoles("admin", "SUPER_ADMIN", "ADMIN"), createBranchValidator, branchController.createBranch);
router.put("/:id", authorizeRoles("admin"), updateBranchValidator, branchController.updateBranch);
router.delete("/:id", authorizeRoles("admin"), branchController.deleteBranch);

module.exports = router;
