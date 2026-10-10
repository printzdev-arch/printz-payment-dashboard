/**
 * PrintZ Sample Data - Daily Revenue & Financial Totals
 */

const getToday = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split("T")[0];
};

const today = getToday(0);
const yesterday = getToday(1);

export const sampleTotalAmounts = [
  // --- TODAY ---
  {
    _id: "tot_001",
    id: "tot_001",
    branchName: "Banaswadi",
    branchId: "64f1a2b3c4d5e6f7a8b90001",
    date: today,
    cashAmount: 3200,
    upiAmount: 5800,
    cardAmount: 1200,
    creditAmount: 450,
    expenseAmount: 600,
    totalAmount: 10650,
    expenses: [
      { description: "Tea & Snacks for Staff", amount: 150 },
      { description: "Courier dispatch charges", amount: 450 }
    ],
    rows: [
      { type: "printer", description: "Counter Xerox & B/W", amount: 2265 },
      { type: "printer", description: "Color Printing & Photo", amount: 1800 },
      { type: "jumbo", description: "Architectural Blueprints", amount: 3100 },
      { type: "stock", description: "Paper Reams & Spiral", amount: 1500 },
      { type: "service", description: "Lamination & ID Cards", amount: 1985 }
    ],
    status: "submitted",
    createdAt: new Date().toISOString()
  },
  {
    _id: "tot_002",
    id: "tot_002",
    branchName: "Kammanahalli",
    branchId: "64f1a2b3c4d5e6f7a8b90002",
    date: today,
    cashAmount: 2100,
    upiAmount: 4300,
    cardAmount: 800,
    creditAmount: 0,
    expenseAmount: 200,
    totalAmount: 7200,
    expenses: [{ description: "Cleaning supplies", amount: 200 }],
    rows: [
      { type: "printer", description: "Printing & Copying", amount: 4500 },
      { type: "stock", description: "Stationery sales", amount: 2700 }
    ],
    status: "submitted",
    createdAt: new Date().toISOString()
  },
  {
    _id: "tot_003",
    id: "tot_003",
    branchName: "Lingrajpuram",
    branchId: "64f1a2b3c4d5e6f7a8b90004",
    date: today,
    cashAmount: 4500,
    upiAmount: 8900,
    cardAmount: 2200,
    creditAmount: 800,
    expenseAmount: 850,
    totalAmount: 16400,
    expenses: [
      { description: "Machine servicing lubricant", amount: 500 },
      { description: "Staff lunch subsidy", amount: 350 }
    ],
    rows: [
      { type: "printer", description: "Versant Production Prints", amount: 9800 },
      { type: "jumbo", description: "DesignJet Posters", amount: 4200 },
      { type: "stock", description: "Binding Materials", amount: 2400 }
    ],
    status: "submitted",
    createdAt: new Date().toISOString()
  },
  {
    _id: "tot_004",
    id: "tot_004",
    branchName: "Thanisandra",
    branchId: "64f1a2b3c4d5e6f7a8b90005",
    date: today,
    cashAmount: 1800,
    upiAmount: 3200,
    cardAmount: 500,
    creditAmount: 0,
    expenseAmount: 150,
    totalAmount: 5500,
    expenses: [{ description: "Stationery for register", amount: 150 }],
    rows: [
      { type: "printer", description: "Photo Prints & Documents", amount: 3800 },
      { type: "service", description: "Passport Photos", amount: 1700 }
    ],
    status: "submitted",
    createdAt: new Date().toISOString()
  },
  {
    _id: "tot_005",
    id: "tot_005",
    branchName: "HBR Layout",
    branchId: "64f1a2b3c4d5e6f7a8b90008",
    date: today,
    cashAmount: 2400,
    upiAmount: 4600,
    cardAmount: 1100,
    creditAmount: 200,
    expenseAmount: 300,
    totalAmount: 8300,
    expenses: [{ description: "Packing tapes & boxes", amount: 300 }],
    rows: [
      { type: "printer", description: "B/W Heavy Duty Xerox", amount: 5100 },
      { type: "stock", description: "Files & Folders", amount: 3200 }
    ],
    status: "submitted",
    createdAt: new Date().toISOString()
  },

  // --- YESTERDAY ---
  {
    _id: "tot_101",
    id: "tot_101",
    branchName: "Banaswadi",
    branchId: "64f1a2b3c4d5e6f7a8b90001",
    date: yesterday,
    cashAmount: 3800,
    upiAmount: 6200,
    cardAmount: 1500,
    creditAmount: 300,
    expenseAmount: 400,
    totalAmount: 11800,
    expenses: [{ description: "Electricity meter top-up", amount: 400 }],
    rows: [
      { type: "printer", description: "Color Printing", amount: 4800 },
      { type: "jumbo", description: "Plotter Drawings", amount: 3400 },
      { type: "stock", description: "Paper sales", amount: 3600 }
    ],
    status: "submitted",
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    _id: "tot_102",
    id: "tot_102",
    branchName: "Kammanahalli",
    branchId: "64f1a2b3c4d5e6f7a8b90002",
    date: yesterday,
    cashAmount: 2800,
    upiAmount: 5100,
    cardAmount: 900,
    creditAmount: 0,
    expenseAmount: 250,
    totalAmount: 8800,
    expenses: [{ description: "Packaging materials", amount: 250 }],
    rows: [
      { type: "printer", description: "College Project Binding", amount: 5600 },
      { type: "stock", description: "Stationery", amount: 3200 }
    ],
    status: "submitted",
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    _id: "tot_103",
    id: "tot_103",
    branchName: "Lingrajpuram",
    branchId: "64f1a2b3c4d5e6f7a8b90004",
    date: yesterday,
    cashAmount: 5200,
    upiAmount: 9400,
    cardAmount: 3100,
    creditAmount: 500,
    expenseAmount: 900,
    totalAmount: 18200,
    expenses: [{ description: "Bulk carton transport", amount: 900 }],
    rows: [
      { type: "printer", description: "Production Printing", amount: 11400 },
      { type: "jumbo", description: "Blueprints", amount: 4800 },
      { type: "service", description: "Lamination", amount: 2000 }
    ],
    status: "submitted",
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];
