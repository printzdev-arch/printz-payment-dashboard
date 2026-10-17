const mongoose = require("mongoose");
const env = require("./env");

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
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(` MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(` MongoDB Connection Error: ${error.message}`);
    if (uri.includes("mongodb.net")) {
      console.warn(" Attempting fallback to local MongoDB on 127.0.0.1:27017/newprintz_db...");
      try {
        const localConn = await mongoose.connect("mongodb://127.0.0.1:27017/newprintz_db", {
          autoIndex: true,
          serverSelectionTimeoutMS: 5000,
        });
        console.log(` Connected to local MongoDB fallback: ${localConn.connection.host}/${localConn.connection.name}`);
        return localConn;
      } catch (localErr) {
        console.error(` Local MongoDB fallback failed: ${localErr.message}`);
      }
    }
    if (env.NODE_ENV === "production") {
      process.exit(1);
    }
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

