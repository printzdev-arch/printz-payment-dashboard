const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const app = require("./app");
const connectDB = require("./infrastructure/database/mongoose/connection");
const env = require("./infrastructure/config/env");

const startServer = async () => {
  try {
    // Connect to Database
    await connectDB();  

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

