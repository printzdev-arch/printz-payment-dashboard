import React from "react";
import { Printer, Palette, Layers } from "lucide-react";

export const JobTypeBadge = ({ jobType, size = "md", style = {} }) => {
  if (!jobType) return null;

  const raw = String(jobType).trim();
  const upper = raw.toUpperCase();

  const isPrintOnly =
    (upper.includes("PRINT") && !upper.includes("DESIGN")) ||
    upper === "PRINT_ONLY" ||
    upper === "PRINT ONLY";

  const isDesignOnly =
    (upper.includes("DESIGN") && !upper.includes("PRINT")) ||
    upper === "DESIGN_ONLY" ||
    upper === "DESIGN ONLY";

  let config = {
    label: "PRINT & DESIGN",
    icon: Layers,
    bg: "#ecfdf5",
    color: "#065f46",
    border: "#a7f3d0",
  };

  if (isPrintOnly) {
    config = {
      label: "PRINT ONLY",
      icon: Printer,
      bg: "#f5f3ff",
      color: "#6b21a8",
      border: "#ddd6fe",
    };
  } else if (isDesignOnly) {
    config = {
      label: "DESIGN ONLY",
      icon: Palette,
      bg: "#eff6ff",
      color: "#1d4ed8",
      border: "#bfdbfe",
    };
  }

  const Icon = config.icon;
  const isSm = size === "sm";

  return (
    <span
      className="jf-job-type-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSm ? "3px" : "5px",
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        borderRadius: "9999px",
        padding: isSm ? "1px 7px" : "3px 9px",
        fontSize: isSm ? "0.68rem" : "0.74rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <Icon size={isSm ? 11 : 13} />
      <span>{config.label}</span>
    </span>
  );
};

export default JobTypeBadge;

