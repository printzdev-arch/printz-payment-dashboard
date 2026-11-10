import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Inbox
} from "lucide-react";
import { TableSkeletonRows } from "../../../../shared/ui/motion";
import Pagination from "../../../../shared/ui/Pagination";

/**
 * JobFlowDataTable
 * Enterprise Reusable Table Component for All List Views in PrintZ JobFlow
 *
 * Features:
 * - Built-in client-side or server-friendly search filter across all row keys
 * - Multi-column sorting with visual indicators
 * - Configurable rows per page dropdown (5, 10, 25, 50, 100)
 * - Previous / Next & First / Last pagination controls with numbered page pills
 * - Entry range summary ("Showing 1 to 10 of 42 entries")
 * - Interactive row selection with click handler
 * - Loading skeleton states and empty placeholder
 */
export const JobFlowDataTable = ({
  columns = [],
  data = [],
  loading = false,
  sortable = false,
  sortControls = true,
  headerFontSize,
  searchable = true,
  searchPlaceholder = "Search records...",
  searchKeys = [],
  defaultSortKey = "",
  defaultSortDir = "asc",
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 25, 50, 100],
  emptyMessage = "No records found matching criteria.",
  onRowClick = null,
  selectedRowId = null,
  rowKey = "_id",
  customActions = null,
  pagination = true,
  className = "",
  style = {},
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: sortable ? defaultSortKey : "",
    direction: defaultSortDir,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Helper to extract nested values like 'customer.name'
  const getNestedValue = (obj, path) => {
    if (!obj || !path) return "";
    return path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : ""), obj);
  };

  // 1. Filter Data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase().trim();

    return data.filter((row) => {
      // If specific searchKeys provided, only search those
      if (searchKeys.length > 0) {
        return searchKeys.some((k) => {
          const val = getNestedValue(row, k);
          return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
        });
      }

      // Otherwise search all column keys and general common fields
      for (const col of columns) {
        if (col.key) {
          const val = getNestedValue(row, col.key);
          if (val !== null && val !== undefined && String(val).toLowerCase().includes(term)) {
            return true;
          }
        }
      }

      // Also search standard fallback fields
      const fallbacks = ["jobNo", "orderNumber", "deliveryNo", "name", "customerName", "title", "code", "status"];
      for (const f of fallbacks) {
        if (row[f] && String(row[f]).toLowerCase().includes(term)) return true;
      }

      return false;
    });
  }, [data, searchTerm, searchKeys, columns]);

  // 2. Sort Data
  const sortedData = useMemo(() => {
    if (!sortable || !sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = getNestedValue(a, sortConfig.key);
      const bVal = getNestedValue(b, sortConfig.key);

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Handle numbers
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (sortConfig.direction === "asc") {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [filteredData, sortConfig, sortable]);

  // 3. Pagination Slicing
  const totalEntries = sortedData.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;

  // Reset to page 1 if current page exceeds total pages
  const validPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const startIndex = (validPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, validPage, pageSize, pagination]);

  // Handle column header sort toggle
  const handleSort = (key, colSortable = true) => {
    if (!sortable || colSortable === false || !key) return;

    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  // Generate numbered page buttons with smart ellipsis (e.g. 1, 2, 3 ... N)
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    const showLeftEllipsis = validPage > 4;
    const showRightEllipsis = validPage < totalPages - 3;

    if (!showLeftEllipsis && showRightEllipsis) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (showLeftEllipsis && !showRightEllipsis) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", validPage - 1, validPage, validPage + 1, "...", totalPages);
    }
    return pages;
  };

  const startIndex = totalEntries === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endIndex = Math.min(validPage * pageSize, totalEntries);

  return (
    <div
      className={`jf-datatable-container ${className}`}
      style={{
        background: "#ffffff",
        borderRadius: "var(--jf-radius, 8px)",
        border: "1px solid var(--jf-border, #e2e8f0)",
        boxShadow: "var(--jf-shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1))",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* ──────────────── Top Toolbar (Search, Page Size & Custom Actions) ──────────────── */}
      {(searchable || customActions) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.875rem 1.25rem",
            borderBottom: "1px solid var(--jf-border, #e2e8f0)",
            background: "#ffffff",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          {searchable && (
            <div style={{ position: "relative", minWidth: "260px", flex: 1, maxWidth: "420px" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#475569",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                className="jf-input"
                style={{
                  paddingLeft: "2.25rem",
                  paddingRight: searchTerm ? "2rem" : "0.75rem",
                  fontSize: "0.875rem",
                  background: "#f8fafc",
                }}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  style={{
                    position: "absolute",
                    right: "0.6rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#475569",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                  }}
                  onClick={() => setSearchTerm("")}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {customActions}
          </div>
        </div>
      )}

      {/* ──────────────── Main Table ──────────────── */}
      <div className="jf-table-wrap" style={{ border: "none", borderRadius: 0, overflowX: "auto" }}>
        <table className="jf-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((col, idx) => {
                const isSorted = Boolean(sortable) && sortConfig.key === col.key;
                const canSort = Boolean(sortable) && sortControls && col.sortable !== false && Boolean(col.key);

                return (
                  <th
                    key={col.key || idx}
                    style={{
                      fontSize: headerFontSize || undefined,
                      cursor: canSort ? "pointer" : "default",
                      userSelect: "none",
                      textAlign: col.align || "left",
                      width: col.width || undefined,
                      minWidth: col.minWidth || undefined,
                      whiteSpace: "nowrap",
                    }}
                    onClick={() => canSort && handleSort(col.key, col.sortable)}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        justifyContent: col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start",
                        width: "100%",
                      }}
                    >
                      <span>{col.label || col.header}</span>
                      {canSort && (
                        <span style={{ color: isSorted ? "var(--jf-primary, #15803d)" : "#94a3b8" }}>
                          {isSorted ? (
                            sortConfig.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <TableSkeletonRows
                rowCount={pageSize > 6 ? 6 : Math.max(3, pageSize)}
                columnCount={columns.length}
              />
            ) : paginatedData.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#475569" }}>
                    <Inbox size={40} style={{ color: "#64748b", marginBottom: "0.75rem" }} />
                    <p style={{ margin: 0, fontWeight: 600, color: "#334155" }}>{emptyMessage}</p>
                    {searchTerm && (
                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary jf-btn-sm"
                        style={{ marginTop: "0.75rem" }}
                        onClick={() => setSearchTerm("")}
                      >
                        Clear Search Filter
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              paginatedData.map((row, rIdx) => {
                const id = row[rowKey] || row._id || row.id || rIdx;
                const isSelected = selectedRowId !== null && (selectedRowId === id || selectedRowId === row._id || selectedRowId === row.id);

                return (
                  <tr
                    key={id}
                    className="printz-row-animated"
                    onClick={() => onRowClick && onRowClick(row)}
                    style={{
                      cursor: onRowClick ? "pointer" : "default",
                      backgroundColor: isSelected ? "#f0fdf4" : undefined,
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    {columns.map((col, cIdx) => {
                      const value = getNestedValue(row, col.key);
                      return (
                        <td
                          key={col.key || cIdx}
                          style={{
                            textAlign: col.align || "left",
                            width: col.width || undefined,
                            minWidth: col.minWidth || undefined,
                          }}
                        >
                          {col.render ? col.render(value, row, rIdx) : (value ?? "-")}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ──────────────── Bottom Pagination Footer ──────────────── */}
      {pagination && (
        <Pagination
          variant="compact"
          currentPage={validPage}
          totalItems={totalEntries}
          itemsPerPage={pageSize}
          onPageChange={(p) => setCurrentPage(Math.min(Math.max(1, p), totalPages))}
          onItemsPerPageChange={(n) => setPageSize(n)}
          pageSizeOptions={pageSizeOptions}
          itemLabel="entries"
        />
      )}
    </div>
  );
};

export default JobFlowDataTable;
