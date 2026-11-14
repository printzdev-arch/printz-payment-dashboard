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

// Operators (list only, used by the queue, start-operation and report filters): GET /production-resources/operators
router.get("/operators", authorizePermission("production", "read"), productionResourceController.getOperators);
// Stock items (read only, from the existing stock collection): GET /production-resources/stocks?search=
router.get("/stocks", authorizePermission("production", "read"), productionResourceController.getStocks);

module.exports = router;