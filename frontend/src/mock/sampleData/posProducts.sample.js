/**
 * PrintZ Sample Data - POS Products & Categories (Step 7)
 */

export const samplePosCategories = [
  "All",
  "Printing",
  "Xerox",
  "Lamination",
  "Binding",
  "Scanning",
  "Design",
  "Finishing",
  "Other"
];

export const samplePosProducts = [
  {
    "productId": "prd_001",
    "productCode": "PRN-A4-COL",
    "productName": "A4 Colour Print",
    "category": "Printing",
    "type": "SERVICE",
    "unit": "page",
    "sellingPrice": 10,
    "costPrice": 3.5,
    "taxRate": 18,
    "stockTracked": false,
    "consumptionTemplate": [
      {
        "consumable": "A4 Maplitho 70 GSM",
        "type": "PAPER",
        "ratio": 1,
        "unit": "sheet",
        "stockItemId": "stk_001",
        "defaultStock": 1240
      },
      {
        "consumable": "Colour toner clicks",
        "type": "INK_TONER",
        "ratio": 1,
        "unit": "click",
        "defaultStock": null
      }
    ],
    "isActive": true
  },
  {
    "productId": "prd_002",
    "productCode": "PRN-A4-BW",
    "productName": "A4 Black & White Print",
    "category": "Printing",
    "type": "SERVICE",
    "unit": "page",
    "sellingPrice": 3,
    "costPrice": 0.8,
    "taxRate": 18,
    "stockTracked": false,
    "consumptionTemplate": [
      {
        "consumable": "A4 Maplitho 70 GSM",
        "type": "PAPER",
        "ratio": 1,
        "unit": "sheet",
        "stockItemId": "stk_001",
        "defaultStock": 1240
      },
      {
        "consumable": "Black toner clicks",
        "type": "INK_TONER",
        "ratio": 1,
        "unit": "click",
        "defaultStock": null
      }
    ],
    "isActive": true
  },
  {
    "productId": "prd_003",
    "productCode": "PRN-A3-COL",
    "productName": "A3 Colour Print",
    "category": "Printing",
    "type": "SERVICE",
    "unit": "page",
    "sellingPrice": 20,
    "costPrice": 7,
    "taxRate": 18,
    "stockTracked": false,
    "consumptionTemplate": [
      {
        "consumable": "A3 JK Colorlok 80 GSM",
        "type": "PAPER",
        "ratio": 1,
        "unit": "sheet",
        "stockItemId": "stk_002",
        "defaultStock": 450
      },
      {
        "consumable": "Colour toner clicks",
        "type": "INK_TONER",
        "ratio": 2,
        "unit": "click",
        "defaultStock": null
      }
    ],
    "isActive": true
  },
  {
    "productId": "prd_004",
    "productCode": "XRX-A4",
    "productName": "A4 Photocopy / Xerox",
    "category": "Xerox",
    "type": "SERVICE",
    "unit": "page",
    "sellingPrice": 2,
    "costPrice": 0.6,
    "taxRate": 18,
    "stockTracked": false,
    "consumptionTemplate": [
      {
        "consumable": "A4 Maplitho 70 GSM",
        "type": "PAPER",
        "ratio": 1,
        "unit": "sheet",
        "stockItemId": "stk_001",
        "defaultStock": 1240
      },
      {
        "consumable": "Black toner clicks",
        "type": "INK_TONER",
        "ratio": 1,
        "unit": "click",
        "defaultStock": null
      }
    ],
    "isActive": true
  },
  {
    "productId": "prd_005",
    "productCode": "LAM-A4-MATT",
    "productName": "Lamination - A4 Matt",
    "category": "Lamination",
    "type": "SERVICE",
    "unit": "sheet",
    "sellingPrice": 30,
    "costPrice": 8,
    "taxRate": 18,
    "stockTracked": true,
    "stockQuantity": 150,
    "consumptionTemplate": [
      {
        "consumable": "Lamination Pouches A4 125 Mic",
        "type": "LAMINATION",
        "ratio": 1,
        "unit": "pouch",
        "stockItemId": "stk_003",
        "defaultStock": 150
      }
    ],
    "isActive": true
  },
  {
    "productId": "prd_006",
    "productCode": "LAM-A4-GLOSS",
    "productName": "Lamination - A4 Glossy",
    "category": "Lamination",
    "type": "SERVICE",
    "unit": "sheet",
    "sellingPrice": 25,
    "costPrice": 6.5,
    "taxRate": 18,
    "stockTracked": true,
    "stockQuantity": 200,
    "consumptionTemplate": [
      {
        "consumable": "Lamination Pouches A4 80 Mic",
        "type": "LAMINATION",
        "ratio": 1,
        "unit": "pouch",
        "defaultStock": 200
      }
    ],
    "isActive": true
  },
  {
    "productId": "prd_007",
    "productCode": "BND-SPIRAL",
    "productName": "Spiral Binding (Up to 100 pages)",
    "category": "Binding",
    "type": "SERVICE",
    "unit": "book",
    "sellingPrice": 50,
    "costPrice": 15,
    "taxRate": 18,
    "stockTracked": true,
    "stockQuantity": 80,
    "consumptionTemplate": [
      {
        "consumable": "Spiral Rings 12mm Black",
        "type": "BINDING",
        "ratio": 1,
        "unit": "ring",
        "stockItemId": "stk_004",
        "defaultStock": 80
      },
      {
        "consumable": "PVC Transparent OHP Sheet",
        "type": "COVER",
        "ratio": 2,
        "unit": "sheet",
        "defaultStock": 160
      }
    ],
    "isActive": true
  },
  {
    "productId": "prd_008",
    "productCode": "BND-WIRO",
    "productName": "Wiro Binding (Twin Loop)",
    "category": "Binding",
    "type": "SERVICE",
    "unit": "book",
    "sellingPrice": 80,
    "costPrice": 25,
    "taxRate": 18,
    "stockTracked": true,
    "stockQuantity": 45,
    "consumptionTemplate": [
      {
        "consumable": "Wiro Ring Metal 14mm",
        "type": "BINDING",
        "ratio": 1,
        "unit": "ring",
        "defaultStock": 45
      }
    ],
    "isActive": true
  },
  {
    "productId": "prd_009",
    "productCode": "SCN-A4",
    "productName": "High-Res Document Scanning",
    "category": "Scanning",
    "type": "SERVICE",
    "unit": "page",
    "sellingPrice": 5,
    "costPrice": 0.5,
    "taxRate": 18,
    "stockTracked": false,
    "consumptionTemplate": [],
    "isActive": true
  },
  {
    "productId": "prd_010",
    "productCode": "PHT-4X6",
    "productName": "Photo Print 4×6 Glossy",
    "category": "Printing",
    "type": "SERVICE",
    "unit": "pcs",
    "sellingPrice": 20,
    "costPrice": 5,
    "taxRate": 18,
    "stockTracked": true,
    "stockQuantity": 300,
    "consumptionTemplate": [
      {
        "consumable": "Glossy Photo Paper 4×6 230 GSM",
        "type": "PAPER",
        "ratio": 1,
        "unit": "sheet",
        "defaultStock": 300
      }
    ],
    "isActive": true
  },
  {
    "productId": "prd_011",
    "productCode": "PS268",
    "productName": "Metal Key Chain - Engraving",
    "category": "Finishing",
    "type": "PHYSICAL",
    "unit": "pcs",
    "sellingPrice": 249,
    "costPrice": 90,
    "taxRate": 18,
    "stockTracked": true,
    "stockQuantity": 8,
    "consumptionTemplate": [
      {
        "consumable": "Blank Metal Key Chain Base",
        "type": "MATERIAL",
        "ratio": 1,
        "unit": "pcs",
        "defaultStock": 8
      }
    ],
    "isActive": true
  },
  {
    "productId": "prd_012",
    "productCode": "VC-QUICK-100",
    "productName": "Visiting Card Quick Pack (100 pcs)",
    "category": "Printing",
    "type": "SERVICE",
    "unit": "pack",
    "sellingPrice": 350,
    "costPrice": 110,
    "taxRate": 18,
    "stockTracked": false,
    "consumptionTemplate": [
      {
        "consumable": "Art Card 300 GSM A4",
        "type": "PAPER",
        "ratio": 10,
        "unit": "sheet",
        "defaultStock": 500
      }
    ],
    "isActive": true
  },
  {
    "productId": "prd_013",
    "productCode": "DSG-QUICK",
    "productName": "Quick Graphic Touch-up / Editing",
    "category": "Design",
    "type": "SERVICE",
    "unit": "job",
    "sellingPrice": 150,
    "costPrice": 0,
    "taxRate": 18,
    "stockTracked": false,
    "consumptionTemplate": [],
    "isActive": true
  },
  {
    "productId": "prd_014",
    "productCode": "BAN-FLEX",
    "productName": "Flex Banner Printing",
    "category": "Printing",
    "type": "SERVICE",
    "unit": "sq.ft",
    "sellingPrice": 25,
    "costPrice": 9,
    "taxRate": 18,
    "stockTracked": false,
    "consumptionTemplate": [
      {
        "consumable": "Frontlit Flex Media 280 GSM",
        "type": "MEDIA",
        "ratio": 1,
        "unit": "sq.ft",
        "defaultStock": 1200
      }
    ],
    "isActive": true
  },
  {
    "productId": "prd_015",
    "productCode": "ID-POUCH",
    "productName": "ID Card Holder & Lanyard",
    "category": "Finishing",
    "type": "PHYSICAL",
    "unit": "set",
    "sellingPrice": 35,
    "costPrice": 12,
    "taxRate": 18,
    "stockTracked": true,
    "stockQuantity": 95,
    "consumptionTemplate": [
      {
        "consumable": "Transparent ID Pouch + Satin Lanyard",
        "type": "STATIONERY",
        "ratio": 1,
        "unit": "set",
        "defaultStock": 95
      }
    ],
    "isActive": true
  }
];
