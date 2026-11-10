/**
 * One-off cleanup for the 21 records that scripts/verifySwagger.js created on 2026-11-05 ~13:30-13:31 UTC.
 *
 *   node scripts/cleanup-swagger-test-data.js            # DRY RUN: only shows what it finds
 *   node scripts/cleanup-swagger-test-data.js --delete   # really deletes those exact records
 *
 * It only touches the exact _id values listed below. Audit logs are left alone on purpose.
 * Delete this file after use.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const dns = require("dns");
try { dns.setServers(["8.8.8.8", "1.1.1.1"]); } catch (e) { /* ignore */ }
const mongoose = require("mongoose");

const TARGETS = {
  finalizedDates: ["6aec850c98d6192107a9346d"],
  inventoryMovements: ["6aec850c7815a61962d051aa"],
  sales: ["6aec850c7815a61962d051b0"],
  printers: ["6aec850c7815a61962d051b7"],
  jumboXeroxPricing: ["6aec850e7815a61962d051d2", "6aec850e7815a61962d051de"],
  jumboXeroxReadings: ["6aec850f7815a61962d051e9"],
  pastDateRequests: ["6aec850f7815a61962d051f0"],
  paymentToBeCollected: ["6aec850f7815a61962d051fb"],
  totalAmountReadings: ["6aec85107815a61962d0520c"],
  stocks: ["6aec85117815a61962d05219"],
  stockReadings: ["6aec85127815a61962d05225"],
  purchaseReceipts: ["6aec85147815a61962d0525f"],
  jobOrders: ["6aec85187815a61962d052ac"],
  jobItems: ["6aec85187815a61962d052ae"],
  jobWorkflowEvents: ["6aec85187815a61962d052b2", "6aec85187815a61962d052ba", "6aec85197815a61962d052d0"],
  jobApprovals: ["6aec85197815a61962d052c4"],
  estimates: ["6aec85197815a61962d052c7"],
  estimateApprovals: ["6aec85197815a61962d052c9"],
};

(async () => {
  const doDelete = process.argv.includes("--delete");
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const db = mongoose.connection.db;
  let found = 0, removed = 0;
  for (const [col, ids] of Object.entries(TARGETS)) {
    const oids = ids.map((i) => new mongoose.Types.ObjectId(i));
    const docs = await db.collection(col).find({ _id: { $in: oids } }).toArray();
    found += docs.length;
    console.log(`${col}: found ${docs.length} of ${ids.length}`);
    if (doDelete && docs.length) {
      const r = await db.collection(col).deleteMany({ _id: { $in: oids } });
      removed += r.deletedCount;
    }
  }
  console.log(doDelete ? `Deleted ${removed} records.` : `DRY RUN: ${found} records found. Re-run with --delete to remove them.`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
