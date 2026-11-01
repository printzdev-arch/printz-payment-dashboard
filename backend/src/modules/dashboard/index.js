const dashboardRoutes = require("./routes/dashboard.routes");
const dashboardController = require("./controllers/dashboard.controller");
const { dashboardService } = require("./services/dashboard.service");

module.exports = {
  dashboardRoutes,
  dashboardController,
  dashboardService,
};
