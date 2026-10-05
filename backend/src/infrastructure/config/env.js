const path = require("path");
const dotenv = require("dotenv");

// Load backend/.env first (relative to this file)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
// Fallback for root or environment-level .env
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/printz_payment_dashboard",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "printz_default_access_secret_2026",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "15m",
  JWT_SECRET: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || "printz_default_access_secret_2026",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRES_IN || "100m",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "printz_default_refresh_secret_2026",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000,http://localhost:5173",
};

