/**
 * Initial Factory Seeds for Master Settings
 * Only used for initial database seeding when collections are empty.
 */

const CATEGORY_GROUPS = {
  PRINT_SUBSTRATE: { key: "print_substrate", title: "Print & Substrates" },
  COLORS_SIDES: { key: "colors_sides", title: "Colors & Sides" },
  FINISHING_EFFECTS: { key: "finishing_effects", title: "Finishing & Effects" },
  ORDER_WORKFLOW: { key: "order_workflow", title: "Orders & Logistics" },
};

const INITIAL_MASTER_CATEGORIES = [
  { category: "productTypes", displayName: "Product Types", categoryGroup: CATEGORY_GROUPS.PRINT_SUBSTRATE.key, icon: "Layers", order: 1 },
  { category: "paperTypes", displayName: "Paper Substrates", categoryGroup: CATEGORY_GROUPS.PRINT_SUBSTRATE.key, icon: "FileText", order: 2 },
  { category: "paperGsmList", displayName: "Paper GSM / Weights", categoryGroup: CATEGORY_GROUPS.PRINT_SUBSTRATE.key, icon: "Scale", order: 3 },
  { category: "sizes", displayName: "Sizes & Dimensions", categoryGroup: CATEGORY_GROUPS.PRINT_SUBSTRATE.key, icon: "Maximize2", order: 4 },
  { category: "colors", displayName: "Color Modes", categoryGroup: CATEGORY_GROUPS.COLORS_SIDES.key, icon: "Palette", order: 5 },
  { category: "printingSides", displayName: "Printing Sides", categoryGroup: CATEGORY_GROUPS.COLORS_SIDES.key, icon: "Repeat", order: 6 },
  { category: "laminationTypes", displayName: "Lamination Films", categoryGroup: CATEGORY_GROUPS.FINISHING_EFFECTS.key, icon: "Shield", order: 7 },
  { category: "finishingEffects", displayName: "Finishing Effects", categoryGroup: CATEGORY_GROUPS.FINISHING_EFFECTS.key, icon: "Sparkles", order: 8 },
  { category: "finishingServicesList", displayName: "Post-Press Services", categoryGroup: CATEGORY_GROUPS.FINISHING_EFFECTS.key, icon: "Scissors", order: 9 },
  { category: "proofRequirements", displayName: "Proof Requirements", categoryGroup: CATEGORY_GROUPS.ORDER_WORKFLOW.key, icon: "CheckSquare", order: 10 },
  { category: "deliveryMethods", displayName: "Delivery & Fulfillment", categoryGroup: CATEGORY_GROUPS.ORDER_WORKFLOW.key, icon: "Truck", order: 11 },
  { category: "paymentMethods", displayName: "Payment Channels", categoryGroup: CATEGORY_GROUPS.ORDER_WORKFLOW.key, icon: "CreditCard", order: 12 },
  { category: "productionOperations", displayName: "Production Operations Sequence", categoryGroup: CATEGORY_GROUPS.ORDER_WORKFLOW.key, icon: "Settings", order: 13 },
];

const INITIAL_MASTER_ITEMS = [
  // productTypes
  { category: "productTypes", name: "Business Cards", order: 1, isDefault: true },
  { category: "productTypes", name: "Flyers / Leaflets", order: 2 },
  { category: "productTypes", name: "Brochures", order: 3 },
  { category: "productTypes", name: "Booklets / Catalogues", order: 4 },
  { category: "productTypes", name: "Posters (A3/A2/A1)", order: 5 },
  { category: "productTypes", name: "Banners (Roll-up / Tarpaulin)", order: 6 },
  { category: "productTypes", name: "Stickers / Labels", order: 7 },
  { category: "productTypes", name: "Letterheads", order: 8 },
  { category: "productTypes", name: "Envelopes", order: 9 },
  { category: "productTypes", name: "Presentation Folders", order: 10 },
  { category: "productTypes", name: "Money Packets", order: 11 },
  { category: "productTypes", name: "Notepads", order: 12 },

  // paperTypes
  { category: "paperTypes", name: "Art Card", order: 1, isDefault: true },
  { category: "paperTypes", name: "Art Paper", order: 2 },
  { category: "paperTypes", name: "Simili Paper", order: 3 },
  { category: "paperTypes", name: "Kraft Paper", order: 4 },
  { category: "paperTypes", name: "Synthetic YUPO", order: 5 },
  { category: "paperTypes", name: "Linen Textured", order: 6 },
  { category: "paperTypes", name: "Ivory Board", order: 7 },
  { category: "paperTypes", name: "Metallic Pearl", order: 8 },
  { category: "paperTypes", name: "Carbonless NCR", order: 9 },

  // paperGsmList
  { category: "paperGsmList", name: "260 gsm", order: 1, isDefault: true },
  { category: "paperGsmList", name: "310 gsm", order: 2 },
  { category: "paperGsmList", name: "350 gsm", order: 3 },
  { category: "paperGsmList", name: "157 gsm", order: 4 },
  { category: "paperGsmList", name: "128 gsm", order: 5 },
  { category: "paperGsmList", name: "100 gsm", order: 6 },
  { category: "paperGsmList", name: "80 gsm", order: 7 },

  // sizes
  { category: "sizes", name: "90 x 54 mm (Standard)", order: 1, isDefault: true },
  { category: "sizes", name: "A4 (210 x 297 mm)", order: 2 },
  { category: "sizes", name: "A5 (148 x 210 mm)", order: 3 },
  { category: "sizes", name: "A3 (297 x 420 mm)", order: 4 },
  { category: "sizes", name: "A6 (105 x 148 mm)", order: 5 },
  { category: "sizes", name: "A2 (420 x 594 mm)", order: 6 },
  { category: "sizes", name: "A1 (594 x 841 mm)", order: 7 },
  { category: "sizes", name: "Custom Size", order: 8 },

  // colors
  { category: "colors", name: "Full Color (CMYK)", order: 1, isDefault: true },
  { category: "colors", name: "Black & White (K-Only)", order: 2 },
  { category: "colors", name: "2 Spot Colors", order: 3 },
  { category: "colors", name: "Full Color + White Underbase", order: 4 },

  // printingSides
  { category: "printingSides", name: "Double Sided", order: 1, isDefault: true },
  { category: "printingSides", name: "Single Sided", order: 2 },

  // laminationTypes
  { category: "laminationTypes", name: "Matte", order: 1, isDefault: true },
  { category: "laminationTypes", name: "Gloss", order: 2 },
  { category: "laminationTypes", name: "Velvet Soft Touch", order: 3 },
  { category: "laminationTypes", name: "Holographic Rainbow", order: 4 },
  { category: "laminationTypes", name: "None", order: 5 },

  // finishingEffects
  { category: "finishingEffects", name: "None", order: 1, isDefault: true },
  { category: "finishingEffects", name: "Die-Cut Round Corners", order: 2 },
  { category: "finishingEffects", name: "Spot UV (Front)", order: 3 },
  { category: "finishingEffects", name: "Spot UV (Double-sided)", order: 4 },
  { category: "finishingEffects", name: "Gold Foil Stamping", order: 5 },
  { category: "finishingEffects", name: "Silver Foil Stamping", order: 6 },
  { category: "finishingEffects", name: "Rose Gold Foil", order: 7 },
  { category: "finishingEffects", name: "Embossing", order: 8 },
  { category: "finishingEffects", name: "Debossing", order: 9 },

  // finishingServicesList
  { category: "finishingServicesList", name: "Lamination", config: "Gloss / Matte", defaultPrice: 15, unit: "side", order: 1 },
  { category: "finishingServicesList", name: "Cutting", config: "Standard Trim", defaultPrice: 5, unit: "job", order: 2 },
  { category: "finishingServicesList", name: "Trimming", config: "Flush Edge", defaultPrice: 5, unit: "job", order: 3 },
  { category: "finishingServicesList", name: "Binding", config: "Saddle Stitch", defaultPrice: 20, unit: "book", order: 4 },
  { category: "finishingServicesList", name: "Folding", config: "Half / Letter Fold", defaultPrice: 8, unit: "sheet", order: 5 },
  { category: "finishingServicesList", name: "Creasing", config: "Single Line", defaultPrice: 8, unit: "sheet", order: 6 },
  { category: "finishingServicesList", name: "Die Cutting", config: "Custom Shape", defaultPrice: 35, unit: "job", order: 7 },
  { category: "finishingServicesList", name: "Foiling", config: "Gold Metallic", defaultPrice: 40, unit: "side", order: 8 },
  { category: "finishingServicesList", name: "UV Coating", config: "Spot / Flood", defaultPrice: 30, unit: "side", order: 9 },
  { category: "finishingServicesList", name: "Mounting", config: "Foam Board", defaultPrice: 18, unit: "piece", order: 10 },
  { category: "finishingServicesList", name: "Perforation", config: "Tear-off Line", defaultPrice: 10, unit: "sheet", order: 11 },
  { category: "finishingServicesList", name: "Numbering", config: "Sequential Red", defaultPrice: 12, unit: "job", order: 12 },
  { category: "finishingServicesList", name: "Packing", config: "Shrink Wrap 100s", defaultPrice: 5, unit: "pack", order: 13 },

  // proofRequirements
  { category: "proofRequirements", name: "Digital PDF Proof", order: 1, isDefault: true },
  { category: "proofRequirements", name: "Hardcopy Digital Proof", order: 2 },
  { category: "proofRequirements", name: "Offset Wet Proof", order: 3 },
  { category: "proofRequirements", name: "No Proof (Direct Run)", order: 4 },

  // deliveryMethods
  { category: "deliveryMethods", name: "Branch Counter Self-Pickup", order: 1, isDefault: true },
  { category: "deliveryMethods", name: "Local Dispatch / Delivery", order: 2 },
  { category: "deliveryMethods", name: "Express Courier Service", order: 3 },
  { category: "deliveryMethods", name: "Lalamove / Grab Express", order: 4 },

  // paymentMethods
  { category: "paymentMethods", name: "Cash", order: 1, isDefault: true },
  { category: "paymentMethods", name: "Credit / Debit Card", order: 2 },
  { category: "paymentMethods", name: "DuitNow QR Pay", order: 3 },
  { category: "paymentMethods", name: "Online Bank Transfer", order: 4 },
  { category: "paymentMethods", name: "Cheque", order: 5 },

  // productionOperations (Default Sequence)
  {
    category: "productionOperations",
    name: "Printing",
    code: "PRINT",
    config: JSON.stringify({ machine: "Digital Printer 01", operator: "Vijay", duration: "2h", estimatedMinutes: 120, dependency: "-" }),
    order: 1,
    isDefault: true,
  },
  {
    category: "productionOperations",
    name: "Lamination",
    code: "LAMINATION",
    config: JSON.stringify({ machine: "Lamination 01", operator: "Suresh", duration: "1h", estimatedMinutes: 60, dependency: "Printing" }),
    order: 2,
    isDefault: true,
  },
  {
    category: "productionOperations",
    name: "Cutting",
    code: "CUTTING",
    config: JSON.stringify({ machine: "Cutter 01", operator: "Vijay", duration: "1.5h", estimatedMinutes: 90, dependency: "Lamination" }),
    order: 3,
    isDefault: true,
  },
  {
    category: "productionOperations",
    name: "Folding",
    code: "FOLDING",
    config: JSON.stringify({ machine: "Folding 01", operator: "Arun", duration: "1h", estimatedMinutes: 60, dependency: "Cutting" }),
    order: 4,
    isDefault: true,
  },
  {
    category: "productionOperations",
    name: "Packing",
    code: "PACKING",
    config: JSON.stringify({ machine: "Packing 01", operator: "Karthik", duration: "1h", estimatedMinutes: 60, dependency: "Folding" }),
    order: 5,
    isDefault: true,
  },
];

module.exports = {
  CATEGORY_GROUPS,
  INITIAL_MASTER_CATEGORIES,
  INITIAL_MASTER_ITEMS,
};
