/**
 * PERMANENTLY DELETES every login that is not on the keep list (scripts/keep-logins.js).
 * Run it yourself, in your own terminal.
 *
 * What it does:
 *   - only touches the "users" collection; employees, orders, payments and audit logs are left alone,
 *   - saves a full copy of every login it deletes to backups/deleted-users-<time>.json first,
 *   - refuses to run if any login on the keep list is missing from the database (a sign it is
 *     pointed at the wrong database), and
 *   - asks you to type DELETE before it removes anything.
 *
 * Things that point at a deleted login (for example the person who created an order, or an
 * audit log entry) will then point at nothing. Disabling instead (disable-other-logins.js)
 * avoids that.
 *
 * Usage:
 *   node scripts/delete-other-logins.js                    # dry run: lists who would be deleted
 *   node scripts/delete-other-logins.js --confirm-delete   # asks you to type DELETE, then deletes
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const mongoose = require("mongoose");

const KEEP = require("./keep-logins");
const { EJSON } = mongoose.mongo.BSON;

const CONFIRM = process.argv.includes("--confirm-delete");

const ask = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI / MONGODB_URI is not set.");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(`Database: ${db.databaseName}`);
  console.log(`Mode: ${CONFIRM ? "DELETE (will ask you to confirm)" : "DRY RUN (no changes)"}\n`);

  const keepEmails = Object.values(KEEP).flat().map((e) => e.toLowerCase());
  const users = await db.collection("users").find({}).sort({ role: 1, name: 1 }).toArray();
  const byEmail = new Map(users.map((u) => [String(u.email || "").toLowerCase().trim(), u]));

  const missing = keepEmails.filter((e) => !byEmail.has(e));
  if (missing.length) {
    throw new Error(`Stopping: these logins on the keep list are not in this database: ${missing.join(", ")}`);
  }

  const keepSet = new Set(keepEmails);
  const toDelete = users.filter((u) => !keepSet.has(String(u.email || "").toLowerCase().trim()));

  console.log(`Keeping ${keepEmails.length} logins. Would delete ${toDelete.length}:`);
  toDelete.forEach((u) => console.log(`  ${String(u.email).padEnd(40)} ${String(u.role).padEnd(18)} ${u.name}`));

  if (!toDelete.length) {
    console.log("\nNothing to delete.");
  } else if (!CONFIRM) {
    console.log("\nDry run only. Run again with --confirm-delete to delete these permanently.");
  } else {
    const answer = await ask(`\nType DELETE to permanently delete ${toDelete.length} logins from ${db.databaseName}: `);
    if (answer !== "DELETE") {
      console.log("Not confirmed. Nothing was deleted.");
    } else {
      const dir = path.join(__dirname, "..", "backups");
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `deleted-users-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
      fs.writeFileSync(file, EJSON.stringify(toDelete, { relaxed: false }, 2));
      console.log(`Saved a copy of the ${toDelete.length} logins to ${file}`);

      const res = await db.collection("users").deleteMany({ _id: { $in: toDelete.map((u) => u._id) } });
      console.log(`Deleted ${res.deletedCount} login(s).`);
    }
  }
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
