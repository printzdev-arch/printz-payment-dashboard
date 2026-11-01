const express = require("express");
const router = express.Router();
const productionResourceController = require("../controllers/productionResource.controller");
const { authenticate } = require("../../../middleware/auth.middleware");
const { authorizePermission } = require("../../../middleware/permission.middleware");
const { idParamValidator } = require("../validators/production.validator");

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

module.exports = router;