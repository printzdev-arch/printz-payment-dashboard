import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SelectField from "./selects/SelectField";
import "../styles/printzTheme.css";

/**
 * Universal PrintZ Pagination Component
 *
 * Left: Showing 1–20 of 2,611  -- [ 20 ▼ ]
 * Right: Prev  1 2 3 ... 131  Next
 *
 * Props:
 * - currentPage: number (1-based index)
 * - totalItems: number (total count of filtered/loaded items)
 * - itemsPerPage: number (items visible per page)
 * - onPageChange: (page: number) => void
 * - onItemsPerPageChange?: (limit: number) => void
 * - pageSizeOptions?: number[] (default: [5, 10, 20, 50, 100]; 5 is always offered)
 * - itemLabel?: string (default: "items")
 * - variant?: "compact" | "default" (default: "compact", the standard look used by every table)
 */
const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions: pageSizeOptionsProp = [5, 10, 20, 50, 100],
  itemLabel = "items",
  variant = "compact", // "compact" (default: "Showing 1 to 5 of 40", Rows select, 3 page numbers + …) | "default" (older numbered style)
}) => {
  // Every table offers 5 rows per page, whatever list the page passes; keep the current size in the list too
  const pageSizeOptions = Array.from(new Set([5, ...pageSizeOptionsProp, itemsPerPage])).sort((a, b) => a - b);
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Compute 1-indexed item start and end ranges
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (variant === "compact") {
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    // three page numbers around the current page, the rest as "…"
    const windowStart = Math.min(Math.max(safePage - 1, 1), Math.max(1, totalPages - 2));
    const windowPages = Array.from({ length: Math.min(3, totalPages) }, (_, i) => windowStart + i);
    const items = [
      ...(windowStart > 1 ? ["…l"] : []),
      ...windowPages,
      ...(windowPages[windowPages.length - 1] < totalPages ? ["…r"] : []),
    ];
    const btn = (active, disabled) => ({
      minWidth: "32px",
      height: "32px",
      padding: "0 8px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "10px",
      fontSize: "13px",
      fontWeight: 600,
      color: active ? "#ffffff" : "#334155",
      background: active ? "linear-gradient(135deg, #059669, #047857)" : "#ffffff",
      border: active ? "1px solid #059669" : "1px solid #e2e8f0",
      boxShadow: active ? "0 2px 6px rgba(5, 150, 105, 0.3)" : "none",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      fontFamily: "inherit",
    });
    return (
      <div
        className="printz-pagination-bar printz-pagination-compact"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px",
          flexWrap: "wrap",
          gap: "12px",
          width: "100%",
          boxSizing: "border-box",
          fontSize: "13px",
          color: "#475569",
        }}
      >
        <span>
          Showing {startItem} to {endItem} of {totalItems.toLocaleString("en-IN")} {itemLabel}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {onItemsPerPageChange && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <span>Rows:</span>
              <SelectField
                compact
                dropUp
                searchable={false}
                value={itemsPerPage}
                options={pageSizeOptions}
                onChange={(e) => {
                  onItemsPerPageChange(Number(e.target.value));
                  if (onPageChange) onPageChange(1);
                }}
              />
            </div>
          )}
          <button
            type="button"
            aria-label="Previous page"
            style={btn(false, safePage <= 1 || totalItems === 0)}
            disabled={safePage <= 1 || totalItems === 0}
            onClick={() => onPageChange(safePage - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          {items.map((p) =>
            typeof p === "string" ? (
              <span key={p} style={{ color: "#64748b", userSelect: "none" }}>…</span>
            ) : (
              <button key={p} type="button" style={btn(p === safePage, false)} onClick={() => onPageChange(p)}>
                {p}
              </button>
            )
          )}
          <button
            type="button"
            aria-label="Next page"
            style={btn(false, safePage >= totalPages || totalItems === 0)}
            disabled={safePage >= totalPages || totalItems === 0}
            onClick={() => onPageChange(safePage + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  // Generate pagination pill numbers with smart ellipsis for large page sets
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const showLeftEllipsis = currentPage > 4;
    const showRightEllipsis = currentPage < totalPages - 3;

    if (!showLeftEllipsis && showRightEllipsis) {
      // Near start: 1, 2, 3, 4, 5, '...', totalPages
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (showLeftEllipsis && !showRightEllipsis) {
      // Near end: 1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages
      pages.push(
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      // Middle: 1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages
      );
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className="printz-pagination-bar"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 20px",
        background: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        flexWrap: "wrap",
        gap: "12px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Left Side: Showing 1–20 of 2,611  -- [ 20 ▼ ] */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            color: "#475569",
            fontWeight: 500,
          }}
        >
          Showing{" "}
          <strong style={{ color: "#0f172a", fontWeight: 700 }}>
            {startItem}–{endItem}
          </strong>{" "}
          of{" "}
          <strong style={{ color: "#0f172a", fontWeight: 700 }}>
            {totalItems.toLocaleString("en-IN")}
          </strong>{" "}
          {itemLabel}
        </span>

        {onItemsPerPageChange && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginLeft: "4px",
            }}
          >
            <span style={{ color: "#64748b", fontSize: "12px" }}>—</span>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#f8fafc",
                border: "1.5px solid #e2e8f0",
                borderRadius: "8px",
                padding: "2px 6px",
                height: "30px",
                boxSizing: "border-box",
              }}
            >
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  onItemsPerPageChange(newLimit);
                  if (onPageChange) onPageChange(1);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#0f172a",
                  cursor: "pointer",
                  outline: "none",
                  padding: "0 4px",
                  fontFamily: "inherit",
                }}
                title="Rows per page"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Right Side: Prev  1 2 3 ... 131  Next */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || totalItems === 0}
          className="printz-page-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            height: "32px",
            padding: "0 10px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            color: "#334155",
            borderRadius: "7px",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor:
              currentPage === 1 || totalItems === 0 ? "not-allowed" : "pointer",
            opacity: currentPage === 1 || totalItems === 0 ? 0.45 : 1,
            transition: "all 0.15s ease",
            fontFamily: "inherit",
          }}
        >
          <ChevronLeft size={15} />
          <span>Prev</span>
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {pages.map((pageNum, idx) => {
            if (pageNum === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    padding: "0 4px",
                    color: "#475569",
                    fontWeight: 700,
                    letterSpacing: "1px",
                    fontSize: "13px",
                    userSelect: "none",
                  }}
                >
                  ...
                </span>
              );
            }

            const isActive = currentPage === pageNum;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                style={{
                  minWidth: "32px",
                  height: "32px",
                  padding: "0 6px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "7px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: isActive ? "#ffffff" : "#475569",
                  background: isActive ? "#059669" : "transparent",
                  border: isActive ? "1px solid #059669" : "1px solid transparent",
                  boxShadow: isActive ? "0 2px 6px rgba(5, 150, 105, 0.25)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  fontFamily: "inherit",
                }}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalItems === 0}
          className="printz-page-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            height: "32px",
            padding: "0 10px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            color: "#334155",
            borderRadius: "7px",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor:
              currentPage === totalPages || totalItems === 0
                ? "not-allowed"
                : "pointer",
            opacity: currentPage === totalPages || totalItems === 0 ? 0.45 : 1,
            transition: "all 0.15s ease",
            fontFamily: "inherit",
          }}
        >
          <span>Next</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
