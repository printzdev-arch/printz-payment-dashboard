import React from "react";

/**
 * PrintzKpiGrid
 * Responsive grid container for PrintzKpiCards.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.minWidth="200px"]
 * @param {string} [props.gap="12px"]
 * @param {string} [props.marginBottom="16px"]
 * @param {string} [props.className=""]
 */
export const PrintzKpiGrid = ({
  children,
  minWidth = "200px",
  gap = "12px",
  marginBottom = "14px",
  className = "",
  style = {},
}) => {
  return (
    <div
      className={`printz-kpi-grid ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${minWidth}, 100%), 1fr))`,
        gap,
        marginBottom,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default PrintzKpiGrid;