/**
 * Request bodies that are accepted by the API as written, keyed by "METHOD /path".
 * They take precedence over the older schema-level examples in payload.examples.js and are used for
 * generated operations too. `scripts/verifySwagger.js` sends every one of these to the running server,
 * so a body that drifts from the validation rules is caught the next time that script runs.
 */
const BRANCH_ID = "489571a9af51836599708543"; // Banaswadii
const USER_ID = "6acf819c312242e3bde22bfb"; // Banaswadi Manager
const ITEM_ID = "6ac744bdda30708a779235c7";
const JOB_ID = "6ac908bc857903d973a34c12";
const EMPLOYEE_ID = "6ac74652f1faee851df1867e"; // Priya Raman (EMP-00002)
const EMPLOYEE_BRANCH_ID = "6ac74535f1be9ed87e02a966"; // Koramangala Main: salary and attendance must use the employee's own branch
const today = new Date().toISOString().slice(0, 10);
const month = Number(today.slice(5, 7));
const year = Number(today.slice(0, 4));

module.exports = {
  // Auth & users
  "POST /auth/login": { email: "admin@gmail.com", password: "your-password" },
  "PUT /users/{id}": { name: "Karthik Raja", email: "karthik@printz.shop", role: "manager", phone: "9876543210", branchId: BRANCH_ID, isActive: true },
  "POST /roles": {
    code: "SENIOR_DESIGNER",
    name: "Senior Graphic Designer",
    description: "Full access to the artwork queue and proof approvals",
    permissions: [{ permissionCode: "job.order.view", scope: "BRANCH" }],
  },

  // General masters
  "POST /general/finalized-dates": { branchName: "Banaswadii", date: today, notes: "Day closed" },
  "POST /general/inventory-movements": { action: "consume", type: "stock", itemId: ITEM_ID, quantity: 5 },
  "POST /general/sales": {
    branchID: BRANCH_ID,
    branchName: "Banaswadii",
    managerID: USER_ID,
    invoiceNo: `INV-API-${year}${month}`,
    date: today,
    itemsSold: [{ itemID: ITEM_ID, name: "Visiting cards", quantity: 2, unitPrice: 250, totalAmount: 500 }],
    subtotal: 500,
    gst: 90,
    grandTotal: 590,
    totalAmount: 590,
  },

  // Printers
  "POST /jumbo-xerox/machines": { branchId: BRANCH_ID, printerId: ITEM_ID, printerName: "HP PageWide XL 5200", size: "A0", type: "Color", unitPrice: 25 },
  "POST /jumbo-xerox/configurations": { branchId: BRANCH_ID, printerId: ITEM_ID, printerName: "HP PageWide XL 5200", size: "A0", type: "Color", unitPrice: 25 },
  "POST /past-date-requests": { branchId: BRANCH_ID, requestedBranch: "Banaswadii", requestedDate: today },

  // Stocks
  "POST /stocks/items": { itemName: "Gloss Lamination Film Roll 25 Micron", category: "Lamination", unit: "ROLL", quantity: 22, branchId: BRANCH_ID },
  "POST /stocks/readings": { date: today, branchId: BRANCH_ID, itemId: ITEM_ID, quantity: 20 },

  // POS
  "POST /sale-receipts": {
    branchId: BRANCH_ID,
    customer: { name: "Rajesh Kumar", mobile: "9876543210" },
    items: [{ productId: ITEM_ID, quantity: 2, unitPrice: 250, taxRate: 18 }],
    payments: [{ mode: "CASH", amount: 590 }],
  },
  "POST /sale-receipts/calculate": { items: [{ productId: ITEM_ID, quantity: 2, unitPrice: 250, taxRate: 18 }], discountAmount: 0 },
  "POST /sale-receipts/checkout": {
    branchId: BRANCH_ID,
    customer: { name: "Rajesh Kumar", mobile: "9876543210" },
    items: [{ productId: ITEM_ID, quantity: 2, unitPrice: 250, taxRate: 18 }],
    payments: [{ mode: "CASH", amount: 590 }],
  },

  // Payments to collect
  "POST /payments": { branchId: BRANCH_ID, date: today, balance: 1500, paymentCollectedTillNow: 2000, paymentToBeCollected: 1500, items: [] },

  // Job orders & design
  "POST /job-orders/{id}/assignments/reassign": { target: "ROUND_ROBIN", reason: "Reassigned for urgent turnaround" },
  "POST /job-orders/{id}/designer-ratings": { ratingSource: "MANAGER", rating: 5, feedback: "Excellent speed and layout" },
  "POST /sla-configurations": { stage: "DESIGN_QUEUE", jobType: "BROCHURE", priority: "URGENT", targetMinutes: 90, warningMinutes: 60, isActive: true },

  // Production & delivery
  "POST /production/orders/{id}/hold": { reason: "Waiting for paper stock" },
  "POST /production/orders/{id}/cancel": { reason: "Customer cancelled the job" },
  "POST /production/production-orders/{id}/hold": { reason: "Waiting for paper stock" },
  "POST /production/production-orders/{id}/cancel": { reason: "Customer cancelled the job" },
  "POST /production-operations/{id}/pause": { reason: "Machine maintenance" },
  "POST /production/operations/{id}/pause": { reason: "Machine maintenance" },
  "POST /production/production-operations/{id}/pause": { reason: "Machine maintenance" },
  "POST /production/operations/{id}/skip": { reason: "Not needed for this job" },
  "POST /production/production-operations/{id}/skip": { reason: "Not needed for this job" },
  "POST /production/reprint-requests/{id}/reject": { rejectionReason: "Defect is within tolerance" },
  "POST /production/reprints/{id}/reject": { rejectionReason: "Defect is within tolerance" },
  "POST /quality-checks": { productionOrderId: ITEM_ID, checkType: "FINAL", result: "PASS", quantityChecked: 100, acceptedQty: 100, rejectedQty: 0 },
  "POST /production/quality-checks": { productionOrderId: ITEM_ID, checkType: "FINAL", result: "PASS", quantityChecked: 100, acceptedQty: 100, rejectedQty: 0 },
  "POST /delivery-orders": { jobOrderId: JOB_ID, branchId: BRANCH_ID, deliveryType: "DELIVERY" },
  "POST /delivery/orders": { jobOrderId: JOB_ID, branchId: BRANCH_ID, deliveryType: "DELIVERY" },
  "POST /production/delivery-orders": { jobOrderId: JOB_ID, branchId: BRANCH_ID, deliveryType: "DELIVERY" },
  "POST /delivery-proofs": { recipientName: "Ravi Kumar", branchId: BRANCH_ID, jobOrderId: JOB_ID, deliveryNo: "DEL-0001", deliveryOrderId: ITEM_ID },
  "POST /delivery/proofs": { recipientName: "Ravi Kumar", branchId: BRANCH_ID, jobOrderId: JOB_ID, deliveryNo: "DEL-0001", deliveryOrderId: ITEM_ID },

  // Customers, estimates, invoices
  "POST /customers/qr": { branchCode: "BN", name: "Suresh Babu", mobile: "9000000011" },
  "POST /estimates": { branchId: BRANCH_ID, customerId: JOB_ID, customerName: "Suresh Babu", customerMobile: "9876543210", items: [{ itemName: "Visiting cards", quantity: 100, rate: 5 }] },
  "POST /invoices/draft": { jobOrderId: JOB_ID, items: [], additionalCharges: [], remarks: "Draft invoice", dueDate: today },
  "PATCH /invoices/{id}": { items: [], additionalCharges: [], remarks: "Updated remarks", dueDate: today },
  "POST /invoices/{id}/calculate": { items: [], additionalCharges: [] },
  "POST /master-settings/{category}/items": { name: "Matte Lamination" },

  // Attendance & salary
  "POST /attendance/check-in": { employeeId: EMPLOYEE_ID, branchId: EMPLOYEE_BRANCH_ID, attendanceDate: today, checkIn: "09:30" },
  "POST /attendance/check-out": { employeeId: EMPLOYEE_ID, branchId: EMPLOYEE_BRANCH_ID, attendanceDate: today, checkOut: "18:30" },
  "POST /attendance/permissions": { employeeId: EMPLOYEE_ID, permissionDate: today, startTime: "14:00", endTime: "15:00", reason: "Bank work" },
  "POST /salary/structures": { employeeId: EMPLOYEE_ID, branchId: EMPLOYEE_BRANCH_ID, effectiveFrom: today, monthlySalary: 25000 },
  "POST /salary/adjustments": { employeeId: EMPLOYEE_ID, branchId: EMPLOYEE_BRANCH_ID, payrollMonth: month, payrollYear: year, adjustmentType: "INCENTIVE", amount: 500, description: "Festival bonus" },
  "POST /salary/loans": { employeeId: EMPLOYEE_ID, branchId: EMPLOYEE_BRANCH_ID, loanAmount: 10000, loanDate: today, emiAmount: 1000 },
  "POST /salary/loan-repayments": { employeeLoanId: ITEM_ID, amount: 1000 },
  "POST /salary/loans/{id}/skip-month": { month, year, reason: "Festival month" },
  "POST /salary/loans/{id}/unskip-month": { month, year },
};


