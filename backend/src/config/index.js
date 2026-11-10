const env = require("./env");
const { connectDB, disconnectDB } = require("./database");
const corsOptions = require("./cors");

module.exports = {
  env,
  connectDB,
  disconnectDB,
  corsOptions,
};
