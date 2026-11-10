/**
 * Keeps a fixed list of logins and DISABLES every other login.
 *
 * Disabled means the person can no longer sign in and no longer appears in the active lists
 * (status = DISABLED, isActive = false). The record itself is kept, so orders, payments, audit
 * logs and notifications that point to the person keep working, and a login can be switched
 * back on. Nothing is deleted.
 *
 * Usage:
 *   node scripts/disable-other-logins.js            # dry run, changes nothing
 *   node scripts/disable-other-logins.js --apply    # disables the logins that are not on the list
 *   node scripts/disable-other-logins.js --restore  # switches back on the logins this script disabled
 */
require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");

const User = require(path.join(__dirname, "../src/modules/auth/models/User"));

const APPLY = process.argv.includes("--apply");
const RESTORE = process.argv.includes("--restore");
const MARK = "Disabled by disable-other-logins script";

const KEEP = require("./keep-logins");

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/printz";
  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${RESTORE ? "RESTORE" : APPLY ? "APPLY (will write)" : "DRY RUN (no changes)"}\n`);

  if (RESTORE) {
    // Straight to the collection: the marker is not in the schema, and Mongoose could otherwise
    // drop the unknown field from the filter and match every login.
    const res = await User.collection.updateMany(
      { metadataNote: MARK },
      { $set: { status: "ACTIVE", isActive: true }, $unset: { metadataNote: "" } }
    );
    console.log(`Switched back on ${res.modifiedCount} login(s).`);
    await mongoose.disconnect();
    return;
  }

  const keepSet = new Set(Object.values(KEEP).flat().map((e) => e.toLowerCase()));
  const users = await User.find({}).sort({ role: 1, name: 1 }).lean();
  const byEmail = new Map(users.map((u) => [String(u.email || "").toLowerCase().trim(), u]));

  console.log("KEEP");
  for (const [group, emails] of Object.entries(KEEP)) {
    console.log(`  ${group}`);
    emails.forEach((e) => {
      const u = byEmail.get(e);
      console.log(`    ${e.padEnd(34)} ${u ? `${u.role} | ${u.status}` : "NOT FOUND in the database"}`);
    });
  }

  const toDisable = users.filter((u) => !keepSet.has(String(u.email || "").toLowerCase().trim()) && u.status !== "DISABLED");
  const alreadyOff = users.filter((u) => !keepSet.has(String(u.email || "").toLowerCase().trim()) && u.status === "DISABLED");

  console.log(`\nDISABLE (${toDisable.length})`);
  toDisable.forEach((u) => console.log(`  ${String(u.email).padEnd(40)} ${String(u.role).padEnd(18)} ${u.name}`));
  if (alreadyOff.length) console.log(`\nAlready disabled, left as they are: ${alreadyOff.length}`);

  if (!APPLY) {
    console.log("\nDry run only. Run again with --apply to disable these.");
  } else {
    const ids = toDisable.map((u) => u._id);
    const res = await User.collection.updateMany(
      { _id: { $in: ids } },
      { $set: { status: "DISABLED", isActive: false, metadataNote: MARK } }
    );
    console.log(`\nDisabled ${res.modifiedCount} login(s). Undo with: node scripts/disable-other-logins.js --restore`);
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
