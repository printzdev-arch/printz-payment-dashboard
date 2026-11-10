const express = require("express");
const router = express.Router();
const productionResourceController = require("../controllers/productionResource.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { authorizePermission } = require("../../../middleware/security/permission.middleware");
const { idParamValidator } = require("./production.validator");

router.use(authenticate);

// Machines: GET /production-resources/machines   (?from=&to=&branchId=&status=&type=&search=&lookup=true)
router.get("/machines", authorizePermission("production", "read"), productionResourceController.getMachines);
router.get(
  "/machines/:id",
  idParamValidator("id"),
  authorizePermission("production", "read"),
  productionResourceController.getMachineById
);

// Operators: GET /production-resources/operators
router.get("/operators", authorizePermission("production", "read"), productionResourceController.getOperators);
router.get(
  "/operators/:id",
  idParamValidator("id"),
  authorizePermission("production", "read"),
  productionResourceController.getOperatorById
);

// Add / edit operators (availability is part of the edit)
router.post("/operators", authorizePermission("production", "update"), productionResourceController.createOperator);
router.patch(
  "/operators/:id",
  idParamValidator("id"),
  authorizePermission("production", "update"),
  productionResourceController.updateOperator
);

// Stock items (read only, from the existing stock collection): GET /production-resources/stocks?search=
router.get("/stocks", authorizePermission("production", "read"), productionResourceController.getStocks);

module.exports = router;