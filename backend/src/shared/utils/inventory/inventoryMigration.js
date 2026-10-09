/**
 * Standalone Inventory Migration Script
 * Migrates legacy `stocks` into `inventoryItems`, `inventoryBalances`, and `inventoryTransactions`.
 *
 * NOTE: DO NOT EXECUTE AUTOMATICALLY.
 * Run manually if approved: node src/shared/utils/inventory/inventoryMigration.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../../../infrastructure/database/mongoose/connection");
const InventoryItem = require("../../../infrastructure/database/mongoose/models/inventory/InventoryItem");
const InventoryBalance = require("../../../infrastructure/database/mongoose/models/inventory/InventoryBalance");
const InventoryTransaction = require("../../../infrastructure/database/mongoose/models/inventory/InventoryTransaction");
const numberSequenceService = require("../../../application/services/common/numberSequence.service");

async function migrateLegacyStocks() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(" 📦 STARTING INVENTORY MIGRATION FROM LEGACY STOCKS");
  console.log("═══════════════════════════════════════════════════════════════════");

  await connectDB();
  const db = mongoose.connection.db;

  const legacyStocks = await db.collection("stocks").find({}).toArray();
  console.log(`ℹ️  Found ${legacyStocks.length} legacy stock records`);

  let itemsCreated = 0;
  let balancesCreated = 0;
  let transactionsCreated = 0;

  // 1. Group stocks by stockId to create distinct inventoryItems
  const stockMap = new Map();
  for (const stock of legacyStocks) {
    const code = (stock.stockId || stock.code || `STK-${stock._id}`).toUpperCase().trim();
    if (!stockMap.has(code)) {
      stockMap.set(code, {
        itemCode: code,
        name: stock.itemName || stock.name || code,
        category: (stock.category || stock.stockType || "GENERAL").toUpperCase().trim(),
        unit: (stock.unit || "PCS").toUpperCase().trim(),
        saleRate: Number(stock.amount || stock.price || 0),
        purchaseRate: Number(stock.purchaseRate || 0),
        taxRate: Number(stock.taxRate || 0),
        reorderLevel: Number(stock.reorderLevel || 10),
        isActive: stock.isActive !== undefined ? Boolean(stock.isActive) : true,
      });
    }
  }

  // Insert or update InventoryItems
  const itemDocMap = new Map();
  for (const [code, itemData] of stockMap.entries()) {
    let item = await InventoryItem.findOne({ itemCode: code });
    if (!item) {
      item = await InventoryItem.create(itemData);
      itemsCreated++;
    }
    itemDocMap.set(code, item);
  }
  console.log(`✅ Items processed: ${itemDocMap.size} (${itemsCreated} new created)`);

  // 2. Create inventoryBalances and OPENING transactions
  const systemAdminUser = await db.collection("users").findOne({ role: { $in: ["admin", "SUPER_ADMIN"] } });
  const adminId = systemAdminUser ? systemAdminUser._id : new mongoose.Types.ObjectId("600000000000000000000001");

  for (const stock of legacyStocks) {
    const code = (stock.stockId || stock.code || `STK-${stock._id}`).toUpperCase().trim();
    const item = itemDocMap.get(code);
    if (!item || !stock.branchId) continue;

    const qty = Number(stock.qty || stock.quantity || 0);

    // Check if balance already exists
    const existingBalance = await InventoryBalance.findOne({
      itemId: item._id,
      branchId: stock.branchId,
    });

    if (!existingBalance) {
      // Create Balance
      await InventoryBalance.create({
        itemId: item._id,
        branchId: stock.branchId,
        quantity: qty,
        updatedAt: new Date(),
      });
      balancesCreated++;

      // Create OPENING transaction if quantity > 0
      if (qty > 0) {
        const txnNo = await numberSequenceService.generateBusinessNumber("INVENTORY_TRANSACTION", {
          prefix: "TXN",
        });

        await InventoryTransaction.create({
          transactionNo: txnNo,
          itemId: item._id,
          branchId: stock.branchId,
          type: "OPENING",
          quantity: qty,
          referenceType: "ADJUSTMENT",
          referenceId: stock._id,
          performedBy: adminId,
          transactionDate: stock.createdAt || new Date(),
          notes: "Opening balance from legacy stocks migration",
          createdAt: new Date(),
        });
        transactionsCreated++;
      }
    }
  }

  console.log(`✅ Balances created: ${balancesCreated}`);
  console.log(`✅ Opening transactions recorded: ${transactionsCreated}`);
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(" 🎉 MIGRATION COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════════");
}

module.exports = { migrateLegacyStocks };

if (require.main === module) {
  migrateLegacyStocks()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
