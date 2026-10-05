const mongoose = require("mongoose");
const env = require("../../config/env");

/**
 * Connect to MongoDB database via Mongoose.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 15000,
    });
    console.log(` MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(` MongoDB Connection Error: ${error.message}`);
    // Do not crash server in dev so health endpoint reports database error gracefully
    if (env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
};

module.exports = connectDB;

