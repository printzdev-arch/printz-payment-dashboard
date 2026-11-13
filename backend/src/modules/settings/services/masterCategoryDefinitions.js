/**
 * Which setting lists exist (product types, paper types, ...). This is the structure the Master Settings screens are
 * built on, not data: it holds no items. Every value inside these lists is entered by an admin and lives in the database.
 */

const CATEGORY_GROUPS = {
  PRINT_SUBSTRATE: { key: "print_substrate", title: "Print & Substrates" },
  COLORS_SIDES: { key: "colors_sides", title: "Colors & Sides" },
  FINISHING_EFFECTS: { key: "finishing_effects", title: "Finishing & Effects" },
  ORDER_WORKFLOW: { key: "order_workflow", title: "Orders & Logistics" },
};

const MASTER_CATEGORY_DEFINITIONS = [
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
  // Roles offered in the Employees screen. Name = label shown, Code = the system role code,
  // Config = NO_LOGIN for a role that does not sign in (leave empty when a login is required).
  { category: "employeeRoles", displayName: "Employee Roles", categoryGroup: CATEGORY_GROUPS.ORDER_WORKFLOW.key, icon: "Users", order: 14 },
];

module.exports = {
  CATEGORY_GROUPS,
  MASTER_CATEGORY_DEFINITIONS,
};
