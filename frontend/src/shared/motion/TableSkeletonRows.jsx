import React, { useMemo } from "react";
import { isReducedMotionPreferred } from "./motionTokens";

/**
 * Reusable TableSkeletonRows component
 * Generates natural-looking skeleton shimmer rows for any HTML table.
 *
 * @param {Object} props
 * @param {number} [props.rowCount=5] - Number of skeleton rows to display
 * @param {number} props.columnCount - Number of table columns (td per tr)
 * @param {string} [props.rowHeight="16px"]
 */
export const TableSkeletonRows = ({
  rowCount = 5,
  columnCount = 6,
  rowHeight = "15px",
}) => {
  const prefersReduced = useMemo(() => isReducedMotionPreferred(), []);

  // Diverse natural widths for realism
  const widths = ["75%", "90%", "60%", "85%", "45%", "80%", "68%"];

  return (
    <>
      {Array.from({ length: rowCount }).map((_, rIdx) => (
        <tr
          key={`printz-table-skeleton-${rIdx}`}
          className="printz-skeleton-tr"
          style={{
            borderBottom: "1px solid #f1f5f9",
            opacity: 1 - rIdx * 0.08, // Subtle downward depth fade
          }}
        >
          {Array.from({ length: columnCount }).map((_, cIdx) => {
            const width = widths[(rIdx + cIdx) % widths.length];
            return (
              <td
                key={`printz-table-skeleton-cell-${rIdx}-${cIdx}`}
                style={{
                  padding: "14px 16px",
                  verticalAlign: "middle",
                }}
              >
                <div
                  className={`printz-table-skeleton-bar ${
                    prefersReduced ? "reduced" : ""
                  }`}
                  style={{
                    height: rowHeight,
                    width,
                    maxWidth: "100%",
                    borderRadius: "6px",
                    animationDelay: `${(rIdx * 0.08 + cIdx * 0.04).toFixed(2)}s`,
                  }}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
};

export default TableSkeletonRows;