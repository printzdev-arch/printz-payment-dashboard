/**
 * Request bodies for POST endpoints whose fields were not declared anywhere else.
 * Every field here was taken from the code that reads it (controller / service), so Swagger UI shows what the
 * API actually accepts. Keyed "POST /path"; `example` is the ready-to-send body, `required` lists mandatory
 * fields and `descriptions` explains the fields.
 *
 * Endpoints that take no body at all (activate, deactivate, resume, ...) are not listed on purpose.
 */
const BRANCH_ID = "489571a9af51836599708543";
const ROLE_ID = "6ac74535f1be9ed87e02a967";
const today = new Date().toISOString().slice(0, 10);
const year = Number(today.slice(0, 4));
const month = Number(today.slice(5, 7));

const reasonOnly = (reason, verb) => ({
  example: { reason },
  descriptions: { reason: `Why the account is being ${verb} (optional, recorded in the audit log)` },
});

module.exports = {
  // Users
  "POST /users/{id}/unlock": reasonOnly("Manual unlock by administrator", "unlocked"),
  "POST /users/{id}/disable": reasonOnly("Left the company", "disabled"),
  "POST /users/{id}/enable": reasonOnly("Rejoined the company", "enabled"),

  // Employee shifts
  "POST /employees/{id}/shifts": {
    example: { destinationBranchId: BRANCH_ID, fromDate: today, toDate: today, roleId: ROLE_ID, remarks: "Covering for leave" },
    required: ["destinationBranchId", "fromDate", "toDate"],
    descriptions: {
      destinationBranchId: "Branch the employee is temporarily moved to",
      fromDate: "First day of the shift (YYYY-MM-DD)",
      toDate: "Last day of the shift (YYYY-MM-DD)",
      roleId: "Role to use at the destination branch (optional)",
      remarks: "Free text note (optional)",
    },
  },
  "POST /employees/shifts/{shiftId}/cancel": {
    example: { reason: "Plan changed" },
    descriptions: { reason: "Why the shift is cancelled (optional)" },
  },
  "POST /employees/shifts/{shiftId}/end-early": {
    example: { effectiveDate: today },
    required: ["effectiveDate"],
    descriptions: { effectiveDate: "Last day the employee works at the destination branch (YYYY-MM-DD)" },
  },

  // Customer portal
  "POST /customer/estimates/{id}/accept": {
    example: { comments: "Looks good, please proceed" },
    descriptions: { comments: "Customer note stored with the estimate (optional)" },
  },
  "POST /customer/estimates/{id}/reject": {
    example: { comments: "Price is too high, please revise" },
    descriptions: { comments: "Why the estimate is rejected (also accepted as `reason`)" },
  },

  // POS
  "POST /sale-receipts/{id}/complete": {
    example: {
      paymentMode: "CASH",
      amountPaid: 590,
      saleDate: today,
      customerName: "Walk-in customer",
      customerMobile: "9876543210",
      remarks: "Paid in full at the counter",
      idempotencyKey: "complete-0001",
    },
    descriptions: {
      paymentMode: "How the customer paid, one of CASH, UPI, CARD, BANK, CREDIT, SPLIT",
      amountPaid: "Amount received now",
      saleDate: "Date of the sale (defaults to today)",
      idempotencyKey: "Send the same key to retry safely without completing the sale twice",
    },
  },

  // Design
  "POST /design/jobs/{id}/reject-sample": {
    example: { reason: "Please change the logo colour" },
    required: ["reason"],
    descriptions: { reason: "What the customer wants changed (also accepted as `revisionReason`)" },
  },

  // Production
  "POST /production-operations/{id}/start": {
    example: { machineId: "6ac744bdda30708a779235c7", assignedEmployeeId: "6ac74652f1faee851df1867e", inputQty: 1000, remarks: "Started on machine 2" },
    descriptions: {
      machineId: "Machine used for this step (optional)",
      assignedEmployeeId: "Operator doing the work (optional)",
      inputQty: "Quantity put into this step (optional)",
      remarks: "Free text note (optional)",
    },
  },
  "POST /production-orders/{id}/resume": {
    example: { reason: "Material arrived" },
    descriptions: { reason: "Why the order is resumed (optional)" },
  },
  "POST /production-orders/plan/{id}": {
    example: { action: "DRAFT" },
    descriptions: { isDraft: "true saves the plan as a draft (same as action DRAFT)", action: "DRAFT saves the plan without changing the status; leave out to confirm the plan" },
  },
  "POST /production/plan/{id}": {
    example: { action: "DRAFT" },
    descriptions: { isDraft: "true saves the plan as a draft (same as action DRAFT)", action: "DRAFT saves the plan without changing the status; leave out to confirm the plan" },
  },
  "POST /job-orders/{id}/production/plan": {
    example: { action: "DRAFT" },
    descriptions: { isDraft: "true saves the plan as a draft (same as action DRAFT)", action: "DRAFT saves the plan without changing the status; leave out to confirm the plan" },
  },
  "POST /production/job-orders/{id}/production/plan": {
    example: { action: "DRAFT" },
    descriptions: { isDraft: "true saves the plan as a draft (same as action DRAFT)", action: "DRAFT saves the plan without changing the status; leave out to confirm the plan" },
  },
  "POST /production-resources/operators": {
    example: { name: "Ravi Kumar", phone: "9876543210", branchId: BRANCH_ID },
    required: ["name"],
    descriptions: { name: "At least 2 characters", phone: "7-15 digits, may include + and -", branchId: "Branch the operator belongs to" },
  },
  "POST /production/production-resources/operators": {
    example: { name: "Ravi Kumar", phone: "9876543210", branchId: BRANCH_ID },
    required: ["name"],
    descriptions: { name: "At least 2 characters", phone: "7-15 digits, may include + and -", branchId: "Branch the operator belongs to" },
  },

  // Delivery
  "POST /delivery-orders/review-job/{jobOrderId}": {
    example: { reviewNotes: "All items checked, ready for delivery" },
    descriptions: { reviewNotes: "Notes from the delivery review (also accepted as `notes`)" },
  },
  "POST /delivery-orders/{id}/pack": {
    example: { packedQuantity: 1000, packingNotes: "2 cartons, sealed" },
    descriptions: { packedQuantity: "Quantity packed (also accepted as `quantity`)", packingNotes: "Packing notes (also accepted as `notes`, `remarks`)" },
  },
  "POST /delivery-orders/{id}/dispatch": {
    example: { vehicleNumber: "KA01AB1234", dispatchNotes: "Handed to driver" },
    descriptions: { vehicleNumber: "Vehicle used for delivery (also accepted as `vehicle`)", dispatchNotes: "Dispatch notes (also accepted as `notes`, `remarks`)" },
  },

  "POST /design/jobs/{id}/submit-proof": {
    example: { fileUrl: "https://example.com/files/proof-v1.pdf", notes: "First proof for approval", customerPhone: "9876543210" },
    descriptions: {
      fileUrl: "Link to the proof file (an uploaded file is used when sent)",
      notes: "Note shown with the proof (also accepted as `comments`)",
      customerPhone: "Customer number the proof link is sent to (optional)",
    },
  },

  "POST /design/jobs/{id}/approve": {
    example: { customerApproved: true, customerName: "Acme Technologies", customerFeedback: "Approved as shown", notes: "Approved on call", planNow: true },
    descriptions: {
      customerApproved: "true when the customer has approved the artwork",
      customerName: "Who approved it",
      customerFeedback: "Customer comments (optional)",
      notes: "Internal note (optional)",
      planNow: "true moves the job straight to production planning (optional)",
    },
  },

  "POST /design/jobs/{id}/approve-proof": {
    example: { customerApproved: true, customerName: "Acme Technologies", customerFeedback: "Approved as shown", notes: "Approved on call", planNow: true },
    descriptions: {
      customerApproved: "true when the customer has approved the artwork",
      customerName: "Who approved it",
      customerFeedback: "Customer comments (optional)",
      notes: "Internal note (optional)",
      planNow: "true moves the job straight to production planning (optional)",
    },
  },

  "POST /design/jobs/{id}/complete": {
    example: { customerApproved: true, customerName: "Acme Technologies", customerFeedback: "Approved as shown", notes: "Approved on call", planNow: true },
    descriptions: {
      customerApproved: "true when the customer has approved the artwork",
      customerName: "Who approved it",
      customerFeedback: "Customer comments (optional)",
      notes: "Internal note (optional)",
      planNow: "true moves the job straight to production planning (optional)",
    },
  },

  "POST /customer/design-approvals/{id}/approve": {
    example: { customerApproved: true, customerName: "Acme Technologies", customerFeedback: "Approved as shown", notes: "Approved on call", planNow: true },
    descriptions: {
      customerApproved: "true when the customer has approved the artwork",
      customerName: "Who approved it",
      customerFeedback: "Customer comments (optional)",
      notes: "Internal note (optional)",
      planNow: "true moves the job straight to production planning (optional)",
    },
  },

  // Attendance
  "POST /attendance/generate-holidays": {
    example: { branchId: BRANCH_ID, year, month },
    required: ["branchId"],
    descriptions: {
      branchId: "Branch to create holiday attendance for",
      year: "Use with `month` to cover a whole month",
      month: "Month number 1-12",
      date: "A single day (YYYY-MM-DD). When sent it is used instead of year and month",
    },
  },

  // Salary
  "POST /salary/runs": {
    example: { branchId: BRANCH_ID, payrollMonth: month, payrollYear: year },
    required: ["branchId", "payrollMonth", "payrollYear"],
    descriptions: { branchId: "Branch to run payroll for", payrollMonth: "Month number 1-12", payrollYear: "Four digit year" },
  },
};
