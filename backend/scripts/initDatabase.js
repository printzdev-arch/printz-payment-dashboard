const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const fs = require("fs");
const mongoose = require("mongoose");
const env = require("../src/infrastructure/config/env");

/**
 * Recursively find all model .js files in the models directory
 */
function getModelFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getModelFiles(fullPath, files);
    } else if (item.endsWith(".js") && !item.includes("index.js")) {
      files.push(fullPath);
    }
  }
  return files;
}

async function initDatabase() {
  const uri = process.env.MONGO_URI || env.MONGO_URI || "mongodb://127.0.0.1:27017/newprintz_db";
  console.log(`Connecting to MongoDB at: ${uri}`);

  await mongoose.connect(uri, {
    autoIndex: true,
  });

  console.log(`Successfully connected to database: ${mongoose.connection.name}`);

  // Load centralized models first
  try {
    require("../src/infrastructure/database/mongoose/models");
  } catch (err) {
    console.warn("Notice loading index barrel:", err.message);
  }

  // Load all individual model files
  const modelsDir = path.join(__dirname, "../src/infrastructure/database/mongoose/models");
  const modelFiles = getModelFiles(modelsDir);
  for (const file of modelFiles) {
    try {
      require(file);
    } catch (err) {
      console.warn(`Warning loading model from ${path.basename(file)}:`, err.message);
    }
  }

  const registeredModelNames = Object.keys(mongoose.models);
  console.log(`Total Mongoose models registered: ${registeredModelNames.length}`);

  const createdCollections = new Set();

  for (const modelName of registeredModelNames) {
    const model = mongoose.models[modelName];
    try {
      await model.createCollection();
      await model.syncIndexes();
      createdCollections.add(model.collection.name);
      console.log(` Created collection & synced indexes: [${model.collection.name}] (${modelName})`);
    } catch (err) {
      console.error(` Error setting up [${modelName}]: ${err.message}`);
    }
  }

  const existingCollections = await mongoose.connection.db.listCollections().toArray();
  console.log("\n=======================================================");
  console.log(`Initialization complete for database: [${mongoose.connection.name}]`);
  console.log(`Total active collections in database: ${existingCollections.length}`);
  console.log("Collections list:");
  existingCollections.forEach((c, idx) => {
    console.log(`  ${idx + 1}. ${c.name}`);
  });
  console.log("=======================================================\n");

  await mongoose.disconnect();
}

initDatabase().catch((err) => {
  console.error("Database initialization failed:", err);
  process.exit(1);
});
