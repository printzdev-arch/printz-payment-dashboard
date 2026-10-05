const express = require("express");
const router = express.Router();
const pastDateRequestController = require("../controllers/pastDateRequest.controller");
const { authenticate } = require("../middleware/auth.middleware");

const { authorizeRoles } = require("../middleware/role.middleware");

router.use(authenticate);

router.get("/", pastDateRequestController.getAllRequests);
router.get("/:id", pastDateRequestController.getRequestById);
router.post("/", pastDateRequestController.createRequest);
router.put("/:id", authorizeRoles("admin"), pastDateRequestController.updateRequest);
router.delete("/:id", authorizeRoles("admin"), pastDateRequestController.deleteRequest);

module.exports = router;
