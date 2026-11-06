const dns = require("dns");
const mongoose = require("mongoose");
const env = require("./env");

// Ensure DNS resolution succeeds for MongoDB Atlas SRV connection strings in Windows environments
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Ignore fallback if custom DNS servers cannot be set
}

let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on("connected", () => {
    console.log(`[MongoDB] Connection established to ${mongoose.connection.host}/${mongoose.connection.name}`);
  });

  mongoose.connection.on("error", (err) => {
    console.error(`[MongoDB] Connection error: ${err.message}`);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Connection disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("[MongoDB] Connection reconnected");
  });

  const handleShutdown = async (signal) => {
    console.log(`[MongoDB] Received ${signal}. Closing database connection...`);
    await disconnectDB();
    process.exit(0);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
};

/**
 * Connect to MongoDB database via Mongoose.
 */
const connectDB = async () => {
  registerConnectionListeners();

  const uri = env.MONGODB_URI || env.MONGO_URI || "mongodb://127.0.0.1:27017/newprintz_db";

  try {
    const conn = await mongoose.connect(uri, {
      // Set MONGO_AUTO_INDEX=false once indexes are built to speed up startup
      autoIndex: process.env.MONGO_AUTO_INDEX !== "false",
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 15000,
    });
    console.log(` MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`\n❌ MongoDB Connection Error: ${error.message}`);
    if (uri.includes("mongodb.net")) {
      console.warn(
        `\n⚠️  MongoDB Atlas Connection Failed (IP Whitelist / Network):\n` +
        `Your current IP address must be added to your MongoDB Atlas cluster whitelist.\n` +
        `Please check Atlas Network Access: https://cloud.mongodb.com -> Network Access -> Add IP Address (0.0.0.0/0).\n`
      );
    }
    throw error;
  }
};

/**
 * Disconnect from MongoDB for testing or graceful shutdown.
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log(" MongoDB Disconnected");
  } catch (error) {
    console.error(` Error during MongoDB disconnect: ${error.message}`);
  }
};

connectDB.connectDB = connectDB;
connectDB.connectDatabase = connectDB;
connectDB.disconnectDB = disconnectDB;
connectDB.disconnectDatabase = disconnectDB;

module.exports = connectDB;

