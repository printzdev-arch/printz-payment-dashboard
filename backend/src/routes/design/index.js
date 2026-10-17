const express = require("express");
const designRoutes = require("./design.routes");

const router = express.Router();
router.use("/", designRoutes);

module.exports = {
  router,
  designRoutes,
};
