const env = require("./env");
const { connectDB, disconnectDB } = require("./database");
const corsOptions = require("./cors");
const swaggerDocument = require("./swagger");

module.exports = {
  env,
  connectDB,
  disconnectDB,
  corsOptions,
  swaggerDocument,
};
