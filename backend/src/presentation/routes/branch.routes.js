const express = require("express");
const router = express.Router();
const branchController = require("../controllers/branch.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

// All branch routes require authentication
router.use(authenticate);

router.get("/", branchController.getAllBranches);
router.get("/:id", branchController.getBranchById);

router.post("/", authorizeRoles("admin", "SUPER_ADMIN", "ADMIN"), branchController.createBranch);
router.put("/:id", authorizeRoles("admin"), branchController.updateBranch);
router.patch("/:id", authorizeRoles("admin"), branchController.updateBranch);
router.delete("/:id", authorizeRoles("admin"), branchController.deleteBranch);

module.exports = router;
