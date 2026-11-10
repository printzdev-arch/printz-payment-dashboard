/**
 * Backs up the whole database to local files. It only reads; nothing is changed.
 *
 * Every collection is written as one line of Extended JSON per document, which keeps
 * ObjectIds and dates exactly (restore with the matching import). Index definitions are
 * saved too. A manifest.json lists each collection with its document count, and the script
 * re-counts afterwards to confirm every document was written.
 *
 * Usage:  node scripts/backup-database.js [outputFolder]
 * Default output: backend/backups/<database>-<timestamp>/
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const { EJSON } = mongoose.mongo.BSON;

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI / MONGODB_URI is not set.");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve(process.argv[2] || path.join(__dirname, "..", "backups", `${db.databaseName}-${stamp}`));
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Database: ${db.databaseName}\nWriting to: ${outDir}\n`);

  const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."))
    .sort();

  const manifest = { database: db.databaseName, createdAt: new Date().toISOString(), collections: {} };
  let problems = 0;

  for (const name of collections) {
    const file = path.join(outDir, `${name}.ndjson`);
    const out = fs.createWriteStream(file);
    let written = 0;

    for await (const doc of db.collection(name).find({})) {
      if (!out.write(EJSON.stringify(doc, { relaxed: false }) + "\n")) {
        await new Promise((resolve) => out.once("drain", resolve));
      }
      written += 1;
    }
    await new Promise((resolve, reject) => {
      out.end(resolve);
      out.on("error", reject);
    });

    let indexes = [];
    try {
      indexes = await db.collection(name).indexes();
    } catch (_) {}

    const nowCount = await db.collection(name).countDocuments({});
    // A write during the backup can change the live count, so a mismatch is reported, not fatal
    const note = nowCount === written ? "" : ` (live count is now ${nowCount})`;
    if (nowCount !== written) problems += 1;
    manifest.collections[name] = { documents: written, file: path.basename(file), indexes };
    console.log(`  ${name.padEnd(40)} ${String(written).padStart(8)} docs${note}`);
  }

  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  const total = Object.values(manifest.collections).reduce((s, c) => s + c.documents, 0);
  console.log(`\nDone: ${collections.length} collections, ${total} documents.`);
  if (problems) console.log(`${problems} collection(s) changed while the backup ran; re-run if you need an exact snapshot.`);
  console.log(`Backup folder: ${outDir}`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Backup failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
