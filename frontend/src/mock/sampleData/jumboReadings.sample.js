/**
 * PrintZ Sample Data - Jumbo Xerox Machines & Large Format Plotter Readings
 */

const getToday = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split("T")[0];
};

const today = getToday(0);
const yesterday = getToday(1);

export const sampleJumboMachines = [
  {
    _id: "jumbo_m01",
    id: "jumbo_m01",
    name: "Canon Plotter TM-5300 (36 inch)",
    machineName: "Canon Plotter TM-5300",
    branchName: "Banaswadi",
    status: "active",
    rates: { a0Bw: 120, a0Color: 350, a1Bw: 70, a1Color: 220, a2Bw: 45, a2Color: 140, tracingA0: 250, tracingA1: 150 },
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    _id: "jumbo_m02",
    id: "jumbo_m02",
    name: "HP DesignJet T830 MFP",
    machineName: "HP DesignJet T830",
    branchName: "Lingrajpuram",
    status: "active",
    rates: { a0Bw: 110, a0Color: 330, a1Bw: 65, a1Color: 200, a2Bw: 40, a2Color: 130, tracingA0: 240, tracingA1: 140 },
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    _id: "jumbo_m03",
    id: "jumbo_m03",
    name: "Epson SureColor T5170",
    machineName: "Epson SureColor T5170",
    branchName: "Kammanahalli",
    status: "active",
    rates: { a0Bw: 120, a0Color: 340, a1Bw: 70, a1Color: 210, a2Bw: 45, a2Color: 135, tracingA0: 245, tracingA1: 145 },
    createdAt: "2025-01-01T00:00:00.000Z"
  }
];

export const sampleJumboReadings = [
  {
    _id: "jread_001",
    id: "jread_001",
    machineId: "jumbo_m01",
    machineName: "Canon Plotter TM-5300 (36 inch)",
    branchName: "Banaswadi",
    date: today,
    a0Count: 5,
    a1Count: 12,
    a2Count: 8,
    totalPrints: 25,
    totalAmount: 3100,
    details: [
      { size: "A0 Color", quantity: 3, rate: 350, amount: 1050 },
      { size: "A0 B/W", quantity: 2, rate: 120, amount: 240 },
      { size: "A1 Color", quantity: 6, rate: 220, amount: 1320 },
      { size: "A1 B/W", quantity: 6, rate: 70, amount: 420 },
      { size: "A2 B/W", quantity: 8, rate: 45, amount: 360 }
    ],
    createdAt: new Date().toISOString()
  },
  {
    _id: "jread_101",
    id: "jread_101",
    machineId: "jumbo_m01",
    machineName: "Canon Plotter TM-5300 (36 inch)",
    branchName: "Banaswadi",
    date: yesterday,
    a0Count: 4,
    a1Count: 8,
    a2Count: 6,
    totalPrints: 18,
    totalAmount: 2400,
    details: [
      { size: "A0 Color", quantity: 2, rate: 350, amount: 700 },
      { size: "A1 Color", quantity: 5, rate: 220, amount: 1100 },
      { size: "A1 B/W", quantity: 3, rate: 70, amount: 210 },
      { size: "A2 B/W", quantity: 6, rate: 45, amount: 270 }
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];
