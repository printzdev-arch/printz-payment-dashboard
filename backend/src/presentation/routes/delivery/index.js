const express = require("express");
const router = express.Router();
const deliveryOrdersRoutes = require("./deliveryOrders.routes");
const deliveryProofsRoutes = require("./deliveryProofs.routes");

router.use("/orders", deliveryOrdersRoutes);
router.use("/proofs", deliveryProofsRoutes);

module.exports = {
  router,
  deliveryOrdersRoutes,
  deliveryProofsRoutes,
};
