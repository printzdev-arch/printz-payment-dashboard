/**
 * PrintZ Master Data - INVENTORY & PURCHASING
 * Collections: inventoryItems, inventoryBalances, inventoryTransactions / inventoryMovements
 */

export const sampleInventoryItems = [
  {
    "_id": "64f1a2b3c4d5e6f7a8b90501",
    "id": "stk_001",
    "itemCode": "ITM-FLX-001",
    "name": "Star Flex Banner 340 GSM (Roll 10ft)",
    "itemName": "Star Flex Banner 340 GSM (Roll 10ft)",
    "categoryId": "64f1a2b3c4d5e6f7a8b90901",
    "category": "Large Format Media",
    "branchName": "Banaswadi",
    "itemType": "RAW_MATERIAL",
    "unit": "SQFT",
    "costPrice": 12.0,
    "unitPrice": 12.0,
    "sellingPrice": 35.0,
    "reorderLevel": 500,
    "minStockLevel": 500,
    "quantity": 1800,
    "isStockTracked": true,
    "isActive": true,
    "status": "In Stock",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T00:00:00.000Z"
  },
  {
    "_id": "64f1a2b3c4d5e6f7a8b90502",
    "id": "stk_002",
    "itemCode": "ITM-ART-300",
    "name": "Art Card 300 GSM SRA3 (12x18)",
    "itemName": "Art Card 300 GSM SRA3 (12x18)",
    "categoryId": "64f1a2b3c4d5e6f7a8b90902",
    "category": "Paper & Media",
    "branchName": "Banaswadi",
    "itemType": "RAW_MATERIAL",
    "unit": "SHEET",
    "costPrice": 3.5,
    "unitPrice": 3.5,
    "sellingPrice": 10.0,
    "reorderLevel": 200,
    "minStockLevel": 200,
    "quantity": 1200,
    "isStockTracked": true,
    "isActive": true,
    "status": "In Stock",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T00:00:00.000Z"
  },
  {
    "_id": "64f1a2b3c4d5e6f7a8b90503",
    "id": "stk_003",
    "itemCode": "ITM-ART-250",
    "name": "Art Paper 250 GSM A3+ (13x19)",
    "itemName": "Art Paper 250 GSM A3+ (13x19)",
    "categoryId": "64f1a2b3c4d5e6f7a8b90902",
    "category": "Paper & Media",
    "branchName": "Kammanahalli",
    "itemType": "RAW_MATERIAL",
    "unit": "SHEET",
    "costPrice": 4.2,
    "unitPrice": 4.2,
    "sellingPrice": 12.0,
    "reorderLevel": 300,
    "minStockLevel": 300,
    "quantity": 2500,
    "isStockTracked": true,
    "isActive": true,
    "status": "In Stock",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T00:00:00.000Z"
  }
];

export const sampleStockItems = sampleInventoryItems;

export const sampleInventoryBalances = [
  {
    "_id": "64f1a2b3c4d5e6f7a8b90551",
    "itemId": "64f1a2b3c4d5e6f7a8b90501",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "currentStock": 1800,
    "reservedStock": 280,
    "availableStock": 1520,
    "updatedAt": "2026-10-08T09:30:00.000Z"
  },
  {
    "_id": "64f1a2b3c4d5e6f7a8b90552",
    "itemId": "64f1a2b3c4d5e6f7a8b90503",
    "branchId": "64f1a2b3c4d5e6f7a8b90002",
    "currentStock": 2500,
    "reservedStock": 504,
    "availableStock": 1996,
    "updatedAt": "2026-10-09T08:30:00.000Z"
  }
];

export const sampleInventoryTransactions = [
  {
    "_id": "64f1a2b3c4d5e6f7a8b90581",
    "itemId": "64f1a2b3c4d5e6f7a8b90503",
    "branchId": "64f1a2b3c4d5e6f7a8b90002",
    "type": "JOB_CONSUMPTION",
    "quantity": -504,
    "balanceAfter": 1996,
    "referenceType": "JobOrder",
    "referenceId": "64f1a2b3c4d5e6f7a8b90045",
    "performedBy": "64f2a1b2c3d4e5f6a7b80088",
    "notes": "Sheets issued for Job JO-KM-2610-0045 (1000 Brochures)",
    "createdAt": "2026-10-09T11:35:00.000Z"
  }
];

export const sampleInventoryMovements = sampleInventoryTransactions;

export default {
  sampleInventoryItems,
  sampleStockItems,
  sampleInventoryBalances,
  sampleInventoryTransactions,
  sampleInventoryMovements
};
