const express = require("express");
const jobOrderRoutes = require("./jobOrder.routes");

const router = express.Router();
router.use("/", jobOrderRoutes);

module.exports = {
  router,
  jobOrderRoutes,
};
