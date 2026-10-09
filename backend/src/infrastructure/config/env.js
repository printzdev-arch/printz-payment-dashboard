const path = require("path");
const dotenv = require("dotenv");

// Load backend/.env first (relative to this file)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
// Fallback for root or environment-level .env
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

const DEFAULT_INSECURE_SECRETS = new Set([
  "printz_default_access_secret_2026",
  "printz_default_refresh_secret_2026",
  "secret",
  "changeme",
  "password",
]);

function validateConfig() {
  if (isProduction) {
    const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || DEFAULT_INSECURE_SECRETS.has(accessSecret) || accessSecret.length < 32) {
      throw new Error(
        "[FATAL SECURITY ERROR] In production, JWT_ACCESS_SECRET (or JWT_SECRET) must be explicitly configured with at least 32 characters and cannot use default fallback keys."
      );
    }

    if (!refreshSecret || DEFAULT_INSECURE_SECRETS.has(refreshSecret) || refreshSecret.length < 32) {
      throw new Error(
        "[FATAL SECURITY ERROR] In production, JWT_REFRESH_SECRET must be explicitly configured with at least 32 characters and cannot use default fallback keys."
      );
    }

    if (!process.env.MONGO_URI) {
      throw new Error("[FATAL CONFIG ERROR] MONGO_URI must be configured in production environment.");
    }
  }
}

// Run validation
validateConfig();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV,
  isProduction,
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/printz_payment_dashboard",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || (isProduction ? undefined : "printz_default_access_secret_2026"),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "15m",
  JWT_SECRET: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || (isProduction ? undefined : "printz_default_access_secret_2026"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || (isProduction ? undefined : "printz_default_refresh_secret_2026"),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000,http://localhost:5173",
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
  validateConfig,
};
