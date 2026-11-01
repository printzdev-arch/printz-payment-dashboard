import React from "react";

export const StatusBadge = ({ status, domain }) => {
  if (!status) return null;

  const s = String(status).toUpperCase();

  let colorClass = "jf-badge-gray";
  let label = status;

  // Domain-specific or general overrides
  if (s === "CLOSED") {
    colorClass = "jf-badge-dark";
    label = "Closed 🔒";
  } else if (s === "OPEN") {
    colorClass = "jf-badge-blue";
    label = "Open";
  } else if (s === "DRAFT") {
    colorClass = domain === "invoice" ? "jf-badge-outline" : "jf-badge-gray";
    label = "Draft";
  } else if (s === "PENDING_APPROVAL") {
    colorClass = "jf-badge-amber";
    label = "Pending Approval";
  } else if (s === "FINALIZED") {
    colorClass = "jf-badge-purple";
    label = "Finalized";
  } else if (s === "PACKED") {
    colorClass = "jf-badge-purple";
    label = "Packed";
  } else if (s === "OUT_FOR_DELIVERY") {
    colorClass = "jf-badge-amber";
    label = "Out for Delivery";
  } else if (s === "UNPAID") {
    colorClass = "jf-badge-red";
    label = "Unpaid";
  } else if (s === "PARTIAL") {
    colorClass = "jf-badge-amber";
    label = "Partial";
  } else if (s === "ASSIGNED") {
    colorClass = "jf-badge-blue";
    label = "Assigned";
  } else if (s === "READY") {
    colorClass = "jf-badge-gray";
    label = "Ready";
  } else if (["ACTIVE", "APPROVED", "PASS", "COMPLETED", "DELIVERED", "VERIFIED", "PAID"].includes(s)) {
    colorClass = "jf-badge-green";
  } else if (["PENDING", "WAITING", "NEW", "HOLD", "UNASSIGNED"].includes(s)) {
    colorClass = "jf-badge-amber";
  } else if (["IN_PROGRESS", "IN_PRODUCTION", "PLANNED", "ACCEPTED"].includes(s)) {
    colorClass = "jf-badge-blue";
  } else if (["REVISION", "REJECTED", "FAIL", "ISSUE", "CANCELLED", "OVERDUE"].includes(s)) {
    colorClass = s === "CANCELLED" && domain === "invoice" ? "jf-badge-strikethrough" : "jf-badge-red";
  } else if (["QC", "SAMPLE_REVIEW", "SPECIAL"].includes(s)) {
    colorClass = "jf-badge-purple";
  }

  // Format label for display if not custom-set above
  if (label === status) {
    if (s === "REVISION" || s === "REJECTED") {
      label = "Revision";
    } else {
      label = s.replace(/_/g, " ").toLowerCase();
      label = label.charAt(0).toUpperCase() + label.slice(1);
    }
  }

  return <span className={`jf-badge ${colorClass}`}>{label}</span>;
};

export default StatusBadge;

