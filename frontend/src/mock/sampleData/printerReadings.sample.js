/**
 * PrintZ Sample Data - Daily Printer Meter Readings
 */

const getToday = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split("T")[0];
};

const today = getToday(0);
const yesterday = getToday(1);
const twoDaysAgo = getToday(2);

export const samplePrinterReadings = [
  // --- TODAY ---
  {
    _id: "pread_001",
    id: "pread_001",
    printerId: "prn_001",
    printerName: "Canon iR-ADV C3530i #1",
    branchName: "Banaswadi",
    branchId: "64f1a2b3c4d5e6f7a8b90001",
    date: today,
    openingReading: 147800,
    closingReading: 148200,
    totalCopies: 400,
    bwCopies: 320,
    colorCopies: 80,
    bwAmount: 640,
    colorAmount: 800,
    totalAmount: 1440,
    remarks: "Regular operation",
    createdAt: new Date().toISOString()
  },
  {
    _id: "pread_002",
    id: "pread_002",
    printerId: "prn_002",
    printerName: "HP LaserJet MFP M528",
    branchName: "Banaswadi",
    branchId: "64f1a2b3c4d5e6f7a8b90001",
    date: today,
    openingReading: 68350,
    closingReading: 68900,
    totalCopies: 550,
    bwCopies: 550,
    colorCopies: 0,
    bwAmount: 825,
    colorAmount: 0,
    totalAmount: 825,
    remarks: "High B/W volume today",
    createdAt: new Date().toISOString()
  },
  {
    _id: "pread_003",
    id: "pread_003",
    printerId: "prn_003",
    printerName: "Konica Minolta bizhub C360i",
    branchName: "Kammanahalli",
    branchId: "64f1a2b3c4d5e6f7a8b90002",
    date: today,
    openingReading: 104100,
    closingReading: 104500,
    totalCopies: 400,
    bwCopies: 300,
    colorCopies: 100,
    bwAmount: 600,
    colorAmount: 1000,
    totalAmount: 1600,
    remarks: "College project printing",
    createdAt: new Date().toISOString()
  },
  {
    _id: "pread_004",
    id: "pread_004",
    printerId: "prn_004",
    printerName: "Xerox Versant 180",
    branchName: "Lingrajpuram",
    branchId: "64f1a2b3c4d5e6f7a8b90004",
    date: today,
    openingReading: 237800,
    closingReading: 238400,
    totalCopies: 600,
    bwCopies: 200,
    colorCopies: 400,
    bwAmount: 500,
    colorAmount: 4800,
    totalAmount: 5300,
    remarks: "Bulk catalog run",
    createdAt: new Date().toISOString()
  },

  // --- YESTERDAY ---
  {
    _id: "pread_101",
    id: "pread_101",
    printerId: "prn_001",
    printerName: "Canon iR-ADV C3530i #1",
    branchName: "Banaswadi",
    branchId: "64f1a2b3c4d5e6f7a8b90001",
    date: yesterday,
    openingReading: 147350,
    closingReading: 147800,
    totalCopies: 450,
    bwCopies: 350,
    colorCopies: 100,
    bwAmount: 700,
    colorAmount: 1000,
    totalAmount: 1700,
    remarks: "Standard day",
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    _id: "pread_102",
    id: "pread_102",
    printerId: "prn_003",
    printerName: "Konica Minolta bizhub C360i",
    branchName: "Kammanahalli",
    branchId: "64f1a2b3c4d5e6f7a8b90002",
    date: yesterday,
    openingReading: 103700,
    closingReading: 104100,
    totalCopies: 400,
    bwCopies: 280,
    colorCopies: 120,
    bwAmount: 560,
    colorAmount: 1200,
    totalAmount: 1760,
    remarks: "Brochures printing",
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },

  // --- 2 DAYS AGO ---
  {
    _id: "pread_201",
    id: "pread_201",
    printerId: "prn_001",
    printerName: "Canon iR-ADV C3530i #1",
    branchName: "Banaswadi",
    branchId: "64f1a2b3c4d5e6f7a8b90001",
    date: twoDaysAgo,
    openingReading: 146900,
    closingReading: 147350,
    totalCopies: 450,
    bwCopies: 300,
    colorCopies: 150,
    bwAmount: 600,
    colorAmount: 1500,
    totalAmount: 2100,
    remarks: "Exam papers + certificates",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];
