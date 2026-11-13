const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/database");
const env = require("./config/env");

const startServer = async () => {
  try {
    // Connect to Database
    await connectDB();

    // The estimate number was removed; drop its old unique index so new estimates (which have no number) can be saved
    try {
      await require("./modules/estimates/models/Estimate").collection.dropIndex("estimateNo_1");
    } catch (e) {
      // Index already gone (or collection not created yet)
    }

    // Link branches and orders to the manufacturing unit that already exists in the database (none is created)
    try {
      const { ensureManufacturingUnit } = require("./modules/sale-orders/services/saleOrder.service");
      await ensureManufacturingUnit();
    } catch (e) {
      console.warn("[Server] ensureManufacturingUnit notice:", e.message);
    }

    // Start background schedulers after DB connection is established
    if (env.NODE_ENV !== "test") {
      require("./modules/sale-orders/services").saleOrderSchedulerService.startScheduler();
    }

    const server = app.listen(env.PORT, () => {
      console.log(` Printz Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(` API Documentation available at: http://localhost:${env.PORT}/api-docs`);
    });

    // Handle unhandled promise rejections gracefully
    process.on("unhandledRejection", (err) => {
      console.error(` Unhandled Rejection: ${err.message}`);
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      console.error(` Uncaught Exception: ${err.message}`);
    });
  } catch (err) {
    console.error(` Server startup failed: ${err.message}`);
  }
};

startServer();
