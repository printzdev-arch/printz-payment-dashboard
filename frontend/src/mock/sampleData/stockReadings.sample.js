/**
 * PrintZ Sample Data - Daily Stock Consumption & Reconciliation
 */

const today = new Date().toISOString().split("T")[0];

export const sampleStockReadings = [
  {
    _id: "stk_read_001",
    id: "stk_read_001",
    branchName: "Banaswadi",
    date: today,
    items: [
      { itemId: "stk_001", itemName: "JK Copier A4 Paper 75 GSM (Ream)", openingStock: 50, received: 0, damaged: 0, used: 5, closingStock: 45 },
      { itemId: "stk_003", itemName: "Lamination Pouches A4 125 Mic (Pack 100)", openingStock: 13, received: 0, damaged: 0, used: 1, closingStock: 12 }
    ],
    createdAt: new Date().toISOString()
  }
];
