/**
 * PrintZ Sample Data - Past Date Change Requests & Finalized Day Closures
 */

const getToday = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split("T")[0];
};

const yesterday = getToday(1);
const twoDaysAgo = getToday(2);

export const samplePastDateRequests = [
  {
    _id: "pdr_001",
    id: "pdr_001",
    requestedBranch: "Banaswadi",
    targetDate: yesterday,
    reason: "Power outage occurred during closing meter recording. Need to update final closing counter.",
    status: "approved",
    adminRemarks: "Approved. Please update before 6 PM.",
    requestedBy: "ba@printz.shop",
    requestedByName: "Arun Kumar (Banaswadi)",
    approvedBy: "admin@printz.shop",
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    _id: "pdr_002",
    id: "pdr_002",
    requestedBranch: "Kammanahalli",
    targetDate: twoDaysAgo,
    reason: "Stock delivery received late in the evening after day closure.",
    status: "pending",
    requestedBy: "kam@printz.shop",
    requestedByName: "Rajesh Sharma (Kammanahalli)",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];

export const sampleFinalizedDates = [
  {
    _id: "fin_001",
    id: "fin_001",
    branchName: "Banaswadi",
    date: twoDaysAgo,
    finalized: true,
    finalizedBy: "admin@printz.shop",
    finalizedAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    _id: "fin_002",
    id: "fin_002",
    branchName: "Kammanahalli",
    date: twoDaysAgo,
    finalized: true,
    finalizedBy: "admin@printz.shop",
    finalizedAt: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];
