import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "../../styles/printzTheme.css";

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
 * - pageSizeOptions?: number[] (default: [10, 20, 50, 100])
 * - itemLabel?: string (default: "items")
 */
const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = "items",
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Compute 1-indexed item start and end ranges
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

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
            color: "#64748b",
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
            <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>
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
                    color: "#94a3b8",
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
