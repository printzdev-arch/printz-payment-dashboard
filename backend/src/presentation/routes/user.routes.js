const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const { createUserValidator, updateUserValidator } = require("../validators/user.validator");

// All user routes require authentication
router.use(authenticate);

// User profile endpoints
router.get("/profile", userController.getProfile);
router.get("/me", userController.getProfile);

// Admin-only endpoints for user creation and deletion
router.post("/", authorizeRoles("admin"), createUserValidator, userController.createUser);
router.get("/", authorizeRoles("admin"), userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.put("/:id", updateUserValidator, userController.updateUser);
router.delete("/:id", authorizeRoles("admin"), userController.deleteUser);

module.exports = router;
