/**
 * PrintZ V3 - Design & Proof Approval Constants (Step 5 & Step 6)
 */

export const DESIGN_STATUS = {
  PENDING_ASSIGNMENT: "PENDING_ASSIGNMENT",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  PROOF_PENDING: "PROOF_PENDING",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  APPROVED: "APPROVED",
  COMPLETED: "COMPLETED"
};

export const DESIGN_STATUS_META = {
  [DESIGN_STATUS.PENDING_ASSIGNMENT]: {
    label: "Awaiting Allocation",
    badge: "warning",
    color: "#d97706",
    bg: "#fef3c7"
  },
  [DESIGN_STATUS.ASSIGNED]: {
    label: "Assigned • Pending Acceptance",
    badge: "business",
    color: "#0284c7",
    bg: "#e0f2fe"
  },
  [DESIGN_STATUS.IN_PROGRESS]: {
    label: "Design in Progress",
    badge: "info",
    color: "#059669",
    bg: "#ecfdf5"
  },
  [DESIGN_STATUS.PROOF_PENDING]: {
    label: "Awaiting Customer Approval",
    badge: "purple",
    color: "#7c3aed",
    bg: "#f3e8ff"
  },
  [DESIGN_STATUS.REVISION_REQUESTED]: {
    label: "Revision Requested",
    badge: "danger",
    color: "#dc2626",
    bg: "#fee2e2"
  },
  [DESIGN_STATUS.APPROVED]: {
    label: "Design Approved • Ready for Production",
    badge: "success",
    color: "#16a34a",
    bg: "#dcfce7"
  },
  [DESIGN_STATUS.COMPLETED]: {
    label: "Completed",
    badge: "neutral",
    color: "#475569",
    bg: "#f1f5f9"
  }
};

export const PROOF_DECISION = {
  APPROVED: "APPROVED",
  REVISION_REQUESTED: "REVISION_REQUESTED"
};

export const PROOF_WORKFLOW_EVENTS = {
  PROOF_SUBMITTED: "PROOF_SUBMITTED",
  PROOF_VIEWED: "PROOF_VIEWED",
  PROOF_APPROVED: "PROOF_APPROVED",
  PROOF_REVISION_REQUESTED: "PROOF_REVISION_REQUESTED",
  DESIGN_REVISION_STARTED: "DESIGN_REVISION_STARTED",
  PROOF_RESUBMITTED: "PROOF_RESUBMITTED",
  DESIGN_APPROVED: "DESIGN_APPROVED"
};

export const PROOF_AUDIT_EVENTS = {
  PROOF_VIEWED: "PROOF_VIEWED",
  PROOF_APPROVED: "PROOF_APPROVED",
  PROOF_REVISION_REQUESTED: "PROOF_REVISION_REQUESTED",
  PROOF_VERSION_CREATED: "PROOF_VERSION_CREATED",
  DESIGN_APPROVED: "DESIGN_APPROVED",
  DESIGN_REVISION_STARTED: "DESIGN_REVISION_STARTED"
};

export const DESIGN_PRIORITY = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT"
};

export const DESIGN_PRIORITY_META = {
  LOW: { label: "Low", color: "#64748b", bg: "#f1f5f9" },
  NORMAL: { label: "Normal", color: "#0284c7", bg: "#e0f2fe" },
  HIGH: { label: "High Priority", color: "#d97706", bg: "#fef3c7" },
  URGENT: { label: "Urgent (Overdue / Express)", color: "#dc2626", bg: "#fee2e2" }
};

export const REJECTION_REASONS_DESIGNER = [
  { code: "INSUFFICIENT_INPUT", label: "Insufficient input from customer / Missing high-res logo" },
  { code: "AT_CAPACITY", label: "Currently at capacity / SLA risk" },
  { code: "OUT_OF_OFFICE", label: "On leave / Scheduled out of office" },
  { code: "SPECIALIZATION_MISMATCH", label: "Requires 3D / specialized illustration skill" },
  { code: "OTHER", label: "Other technical constraint" }
];

