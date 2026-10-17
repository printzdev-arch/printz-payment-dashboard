import React from "react";
import { MotionCard } from "./MotionCard";
import { MotionCounter } from "./MotionCounter";

/**
 * Color map for icon squircle and badge pill
 */
const COLOR_THEMES = {
  green: {
    iconClass: "green",
    badgeBg: "#ecfdf5",
    badgeColor: "#059669",
  },
  blue: {
    iconClass: "blue",
    badgeBg: "#eff6ff",
    badgeColor: "#2563eb",
  },
  orange: {
    iconClass: "orange",
    badgeBg: "#fff7ed",
    badgeColor: "#ea580c",
  },
  teal: {
    iconClass: "teal",
    badgeBg: "#ecfeff",
    badgeColor: "#0891b2",
  },
  purple: {
    iconClass: "purple",
    badgeBg: "#f5f3ff",
    badgeColor: "#7c3aed",
  },
  pink: {
    iconClass: "pink",
    badgeBg: "#fdf2f8",
    badgeColor: "#db2777",
  },
};

/**
 * PrintzKpiCard
 * Standardized PrintZ Dashboard KPI Metric Card matching managerdashboard design.
 *
 * @param {Object} props
 * @param {string} props.title - Metric title (e.g. "Active Printers")
 * @param {number|string} props.value - Numeric or string value
 * @param {string} [props.prefix=""] - E.g. "₹"
 * @param {string} [props.suffix=""]
 * @param {number} [props.decimals=0]
 * @param {React.ReactNode} props.icon - Lucide icon element
 * @param {'green'|'blue'|'orange'|'teal'|'purple'|'pink'} [props.color="green"]
 * @param {string} [props.badge] - Pill badge text (e.g. "Today", "MFP / SFP")
 * @param {string} [props.badgeBg] - Custom pill background color
 * @param {string} [props.badgeColor] - Custom pill text color
 * @param {Function} [props.onClick] - Optional click handler (e.g. to filter table)
 * @param {number} [props.delay=0] - Entrance animation delay
 * @param {string} [props.className=""]
 */
export const PrintzKpiCard = ({
  title,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  icon,
  color = "green",
  badge,
  badgeBg,
  badgeColor,
  onClick,
  delay = 0,
  className = "",
  style = {},
}) => {
  const theme = COLOR_THEMES[color] || COLOR_THEMES.green;
  const isNumeric = typeof value === "number" || (!isNaN(Number(value)) && value !== "" && value !== null);

  return (
    <MotionCard
      hoverLift={true}
      delay={delay}
      onClick={onClick}
      className={`printz-summary-card ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        padding: "14px 16px",
        minHeight: "84px",
        boxSizing: "border-box",
        minWidth: 0,
        maxWidth: "100%",
        ...style,
      }}
    >
      <div className="printz-summary-card-main" style={{ gap: "12px", alignItems: "center" }}>
        {icon && (
          <div className={`printz-summary-icon ${theme.iconClass}`}>
            {icon}
          </div>
        )}

        <div className="printz-summary-content" style={{ minWidth: 0, flex: 1 }}>
          <div
            className="printz-summary-label"
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: "4px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={title}
          >
            {title}
          </div>

          <div
            className="printz-summary-value-row"
            style={{ alignItems: "center", flexWrap: "wrap", rowGap: "4px" }}
          >
            <span
              className="printz-summary-value"
              style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a" }}
            >
              {isNumeric ? (
                <MotionCounter
                  value={Number(value)}
                  prefix={prefix}
                  suffix={suffix}
                  decimals={decimals}
                />
              ) : (
                <span>
                  {prefix}
                  {value}
                  {suffix}
                </span>
              )}
            </span>

            {badge && (
              <span
                className="printz-summary-badge-pill"
                style={{
                  background: badgeBg || theme.badgeBg,
                  color: badgeColor || theme.badgeColor,
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  whiteSpace: "nowrap",
                }}
              >
                {badge}
              </span>
            )}
          </div>
        </div>
      </div>
    </MotionCard>
  );
};

export default PrintzKpiCard;