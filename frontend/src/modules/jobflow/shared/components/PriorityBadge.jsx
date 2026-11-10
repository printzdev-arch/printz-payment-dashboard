import React from "react";

/**
 * Job priority has two values: Normal and Urgent.
 * Older records may hold Low / Medium / High / Rush; they are shown as Normal (Low, Medium) or Urgent (High, Rush).
 */
export const normalizePriority = (value) => {
  const v = String(value || "").trim().toUpperCase();
  return v === "URGENT" || v === "HIGH" || v === "RUSH" ? "URGENT" : "NORMAL";
};

export const PriorityBadge = ({ priority, style = {} }) => {
  const urgent = normalizePriority(priority) === "URGENT";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.6rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        background: urgent ? "#fee2e2" : "#f1f5f9",
        color: urgent ? "#b91c1c" : "#475569",
        ...style,
      }}
    >
      {urgent ? "Urgent" : "Normal"}
    </span>
  );
};

export default PriorityBadge;
