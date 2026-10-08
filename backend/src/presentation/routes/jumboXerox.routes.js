const express = require("express");
const router = express.Router();
const jumboXeroxController = require("../controllers/jumboXerox.controller");
const { authenticate } = require("../middleware/auth.middleware");

const { authorizeRoles } = require("../middleware/role.middleware");

router.use(authenticate);

// Machines config (Admin only for setup/deletion)
router.get("/machines", jumboXeroxController.getAllMachines);
router.get("/machines/:id", jumboXeroxController.getMachineById);
router.post("/machines", authorizeRoles("admin"), jumboXeroxController.saveMachine);
router.put("/machines/:id", authorizeRoles("admin"), jumboXeroxController.updateMachine);
router.delete("/machines/:id", authorizeRoles("admin"), jumboXeroxController.deleteMachine);

// Configurations alias for machines
router.get("/configurations", jumboXeroxController.getAllMachines);
router.get("/configurations/:id", jumboXeroxController.getMachineById);
router.post("/configurations", authorizeRoles("admin"), jumboXeroxController.saveMachine);
router.put("/configurations/:id", authorizeRoles("admin"), jumboXeroxController.updateMachine);
router.delete("/configurations/:id", authorizeRoles("admin"), jumboXeroxController.deleteMachine);

// Daily readings
router.get("/readings", jumboXeroxController.getAllReadings);
router.post("/readings", jumboXeroxController.saveReading);
router.delete("/readings/:id", authorizeRoles("admin"), jumboXeroxController.deleteReading);

module.exports = router;
