import React from "react";

export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const s = String(status).toUpperCase();

  let colorClass = "jf-badge-gray";
  let label = status;

  if (["ACTIVE", "APPROVED", "PASS", "COMPLETED", "DELIVERED", "VERIFIED", "PAID"].includes(s)) {
    colorClass = "jf-badge-green";
  } else if (["PENDING", "WAITING", "READY", "PACKED", "NEW", "HOLD", "DRAFT", "UNASSIGNED"].includes(s)) {
    colorClass = "jf-badge-amber";
  } else if (["IN_PROGRESS", "IN_PRODUCTION", "PLANNED", "ASSIGNED", "OUT_FOR_DELIVERY", "ACCEPTED"].includes(s)) {
    colorClass = "jf-badge-blue";
  } else if (["REVISION", "REJECTED", "FAIL", "ISSUE", "CANCELLED", "OVERDUE"].includes(s)) {
    colorClass = "jf-badge-red";
  } else if (["QC", "SAMPLE_REVIEW", "SPECIAL"].includes(s)) {
    colorClass = "jf-badge-purple";
  }

  // Format label for display
  label = s.replace(/_/g, " ").toLowerCase();
  label = label.charAt(0).toUpperCase() + label.slice(1);

  return <span className={`jf-badge ${colorClass}`}>{label}</span>;
};

export default StatusBadge;
