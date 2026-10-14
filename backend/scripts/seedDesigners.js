const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");

async function seed() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/newprintz_db";
  await mongoose.connect(uri);
  const names = [
    { name: "Ali Hassan", code: "EMP-001" },
    { name: "Siti Rahman", code: "EMP-002" },
    { name: "Kumar Anil", code: "EMP-003" },
    { name: "John Lee", code: "EMP-004" },
    { name: "Nur Aisyah", code: "EMP-005" },
  ];

  // Deactivate old test designers so only these 5 are active designers
  await mongoose.connection.collection("users").updateMany(
    { role: "designer", name: { $nin: names.map((n) => n.name) } },
    { $set: { isActive: false, role: "user" } }
  );

  for (const item of names) {
    const doc = {
      name: item.name,
      username: item.name.toLowerCase().replace(/ /g, "_"),
      email: item.name.toLowerCase().replace(/ /g, ".") + "@printz.com",
      role: "designer",
      isActive: true,
      code: item.code,
    };
    await mongoose.connection.collection("users").updateOne(
      { name: item.name },
      { $set: doc },
      { upsert: true }
    );
  }

  console.log("Seeded the 5 active designers successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
