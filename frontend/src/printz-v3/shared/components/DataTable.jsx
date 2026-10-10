import React from "react";
import { Loader2, Inbox } from "lucide-react";
import Pagination from "./Pagination";
import "../../modules/customer/styles/customerV3.css";

/**
 * Reusable Enterprise DataTable Component for PrintZ V3
 *
 * @param {Array} columns - Column configurations
 * @param {Array} data - Array of row items
 * @param {string} [keyField='id'] - Unique key property on each row
 * @param {boolean} [isLoading=false] - Loading state
 * @param {string|React.ReactNode} [emptyMessage='No records found'] - Empty message
 * @param {function} [onRowClick] - Row click handler: (row, idx) => void
 * @param {number} [minRows] - Minimum row slots to render (defaults to pagination.pageSize or 5)
 * @param {boolean} [fixedRows=true] - Keep table height static with empty row placeholders
 * @param {number} [rowHeight=56] - Height in px for each row slot
 * @param {object} [pagination] - Optional pagination config
 * @param {string} [className] - Wrapper CSS class name
 */
export default function DataTable({
  columns = [],
  data = [],
  keyField = "id",
  isLoading = false,
  emptyMessage = "No records found",
  onRowClick,
  minRows,
  fixedRows = true,
  rowHeight = 56,
  pagination,
  className = ""
}) {
  // Determine effective minimum row slots
  const effectiveMinRows =
    minRows !== undefined
      ? minRows
      : fixedRows && pagination?.pageSize
      ? pagination.pageSize
      : 0;

  // Calculate missing placeholder rows
  const emptyRowsCount =
    !isLoading && data.length > 0 && effectiveMinRows > data.length
      ? effectiveMinRows - data.length
      : 0;

  return (
    <div
      className={`v3-datatable-card ${className}`}
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)"
      }}
    >
      <div className="v3-table-wrapper" style={{ width: "100%", overflowX: "auto" }}>
        <table className="v3-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  style={{
                    padding: "13px 16px",
                    backgroundColor: "#f8fafc",
                    color: "#334155",
                    fontWeight: 800,
                    borderBottom: "1px solid #e2e8f0",
                    textTransform: "uppercase",
                    fontSize: "12px",
                    letterSpacing: "0.04em",
                    textAlign: col.align || "left",
                    width: col.width || "auto",
                    ...col.headerStyle
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "#64748b",
                    height: effectiveMinRows ? `${effectiveMinRows * rowHeight}px` : "200px"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "10px" }}>
                    <Loader2 size={26} style={{ animation: "spin 1s linear infinite", color: "#047857" }} />
                    <span style={{ fontSize: "14px", fontWeight: 700 }}>Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "#64748b",
                    height: effectiveMinRows ? `${effectiveMinRows * rowHeight}px` : "200px"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "8px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        backgroundColor: "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#94a3b8"
                      }}
                    >
                      <Inbox size={22} />
                    </div>
                    <strong style={{ fontSize: "14px", color: "#1e293b" }}>
                      {typeof emptyMessage === "string" ? emptyMessage : "No records found"}
                    </strong>
                    {typeof emptyMessage !== "string" && emptyMessage}
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* Real Data Rows */}
                {data.map((row, rowIdx) => {
                  const rowKey =
                    row[keyField] || row.id || row._id || row.code || row.customerCode || rowIdx;
                  return (
                    <tr
                      key={rowKey}
                      onClick={() => onRowClick && onRowClick(row, rowIdx)}
                      style={{
                        cursor: onRowClick ? "pointer" : "default",
                        transition: "background-color 0.15s ease",
                        borderBottom: "1px solid #f1f5f9",
                        height: `${rowHeight}px`
                      }}
                    >
                      {columns.map((col, colIdx) => {
                        const cellValue = col.key ? row[col.key] : undefined;
                        return (
                          <td
                            key={`${rowKey}-${col.key || colIdx}`}
                            style={{
                              padding: "11px 16px",
                              textAlign: col.align || "left",
                              color: "#1e293b",
                              verticalAlign: "middle",
                              fontSize: "13.5px",
                              ...col.cellStyle
                            }}
                          >
                            {col.render
                              ? col.render(cellValue, row, rowIdx)
                              : cellValue !== undefined && cellValue !== null
                              ? String(cellValue)
                              : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Static Placeholder Empty Rows */}
                {emptyRowsCount > 0 &&
                  Array.from({ length: emptyRowsCount }).map((_, emptyIdx) => (
                    <tr
                      key={`placeholder-row-${emptyIdx}`}
                      style={{
                        height: `${rowHeight}px`,
                        borderBottom: emptyIdx === emptyRowsCount - 1 ? "none" : "1px solid #f8fafc",
                        backgroundColor: "#ffffff",
                        pointerEvents: "none"
                      }}
                    >
                      {columns.map((col, colIdx) => (
                        <td
                          key={`empty-cell-${emptyIdx}-${colIdx}`}
                          style={{
                            padding: "11px 16px",
                            color: "transparent",
                            userSelect: "none"
                          }}
                        >
                          &nbsp;
                        </td>
                      ))}
                    </tr>
                  ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Embedded Pagination */}
      {pagination && (
        <Pagination
          currentPage={pagination.currentPage || 1}
          totalItems={pagination.totalItems || data.length}
          pageSize={pagination.pageSize || 10}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          pageSizeOptions={pagination.pageSizeOptions}
          showPageSizeSelector={pagination.showPageSizeSelector}
          showTotalCount={pagination.showTotalCount}
        />
      )}
    </div>
  );
}
