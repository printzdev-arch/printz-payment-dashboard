import React from "react";
import "../../styles/sale-order.css";

export default function KpiCard({
  icon: Icon,
  tone = "green",
  value,
  label,
  active = false,
  onClick,
}) {
  const renderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) {
      return React.cloneElement(Icon, {
        size: Icon.props?.size || 20,
        strokeWidth: Icon.props?.strokeWidth || 2.3,
        color: Icon.props?.color || "#ffffff",
      });
    }
    return <Icon size={20} strokeWidth={2.3} color="#ffffff" />;
  };

  return (
    <div
      className={`printz-kpi-card so-kpi ${tone} ${active ? "active" : ""} ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="printz-kpi-top so-kpi-top">
        <div className={`printz-summary-icon so-kpi-icon ${tone}`}>
          {renderIcon()}
        </div>
        <div className="printz-kpi-values so-kpi-values">
          <div className="printz-kpi-number so-kpi-value">{value ?? 0}</div>
          <div className="printz-kpi-label">{label}</div>
        </div>
      </div>
    </div>
  );
}

