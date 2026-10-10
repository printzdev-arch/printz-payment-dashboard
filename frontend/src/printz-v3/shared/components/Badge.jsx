import React from "react";
import "../../modules/customer/styles/customerV3.css";

const VARIANT_CLASS_MAP = {
  active: "v3-badge-active",
  success: "v3-badge-active",
  business: "v3-badge-business",
  b2b: "v3-badge-b2b",
  individual: "v3-badge-individual",
  walkin: "v3-badge-walkin",
  qr: "v3-badge-qr",
  warning: "v3-badge-qr",
  danger: "v3-badge-individual",
  neutral: "v3-badge"
};

export default function Badge({ children, variant = "neutral", className = "" }) {
  const normalizedVariant = (variant || "neutral").toLowerCase().replace(/[^a-z0-9]/g, "");
  const variantClass = VARIANT_CLASS_MAP[normalizedVariant] || "v3-badge";

  return (
    <span className={`v3-badge ${variantClass} ${className}`}>
      {children}
    </span>
  );
}
