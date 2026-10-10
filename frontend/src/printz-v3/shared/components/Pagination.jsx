import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown
} from "lucide-react";

/**
 * Reusable Enterprise Pagination Component for PrintZ V3
 *
 * @param {number} currentPage - Current active page (1-based)
 * @param {number} totalItems - Total records count
 * @param {number} pageSize - Number of items per page
 * @param {function} onPageChange - Callback when page changes
 * @param {function} [onPageSizeChange] - Optional callback when page size changes
 * @param {number[]} [pageSizeOptions] - Page size choices
 * @param {boolean} [showPageSizeSelector=true]
 * @param {boolean} [showTotalCount=true]
 * @param {string} [className]
 */
export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  showPageSizeSelector = true,
  showTotalCount = true,
  className = ""
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  const handlePageClick = (page) => {
    if (page >= 1 && page <= totalPages && page !== safeCurrentPage) {
      if (onPageChange) onPageChange(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, safeCurrentPage - 1);
      let end = Math.min(totalPages - 1, safeCurrentPage + 1);

      if (safeCurrentPage <= 3) {
        end = 4;
      } else if (safeCurrentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push("...");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div
      className={`v3-pagination-container ${className}`}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 20px",
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        fontSize: "13px",
        color: "#64748b",
        flexWrap: "wrap",
        gap: "14px"
      }}
    >
      {/* Left: Range Info & Page Size Selector */}
      <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
        {showTotalCount && (
          <div>
            Showing <strong style={{ color: "#0f172a" }}>{startItem}</strong> to{" "}
            <strong style={{ color: "#0f172a" }}>{endItem}</strong> of{" "}
            <strong style={{ color: "#047857" }}>{totalItems}</strong> entries
          </div>
        )}

        {showPageSizeSelector && onPageSizeChange && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>Rows per page:</span>
            <div style={{ position: "relative" }}>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                style={{
                  padding: "5px 24px 5px 10px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  backgroundColor: "#f8fafc",
                  outline: "none",
                  cursor: "pointer",
                  appearance: "none"
                }}
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <div
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "#64748b"
                }}
              >
                <ChevronDown size={13} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Page Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        {/* First Page */}
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={safeCurrentPage === 1}
          title="First Page"
          style={{
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #e2e8f0",
            backgroundColor: safeCurrentPage === 1 ? "#f8fafc" : "#ffffff",
            color: safeCurrentPage === 1 ? "#cbd5e1" : "#475569",
            borderRadius: "6px",
            cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer"
          }}
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => handlePageClick(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          title="Previous Page"
          style={{
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #e2e8f0",
            backgroundColor: safeCurrentPage === 1 ? "#f8fafc" : "#ffffff",
            color: safeCurrentPage === 1 ? "#cbd5e1" : "#475569",
            borderRadius: "6px",
            cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer"
          }}
        >
          <ChevronLeft size={15} />
        </button>

        {/* Number Buttons */}
        {getPageNumbers().map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  width: "28px",
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: "13px",
                  lineHeight: "32px"
                }}
              >
                …
              </span>
            );
          }

          const isActive = p === safeCurrentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => handlePageClick(p)}
              style={{
                minWidth: "32px",
                height: "32px",
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: isActive ? "1px solid #047857" : "1px solid #e2e8f0",
                backgroundColor: isActive ? "#047857" : "#ffffff",
                color: isActive ? "#ffffff" : "#334155",
                fontWeight: isActive ? 800 : 700,
                borderRadius: "6px",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Next Page */}
        <button
          type="button"
          onClick={() => handlePageClick(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          title="Next Page"
          style={{
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #e2e8f0",
            backgroundColor: safeCurrentPage === totalPages ? "#f8fafc" : "#ffffff",
            color: safeCurrentPage === totalPages ? "#cbd5e1" : "#475569",
            borderRadius: "6px",
            cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer"
          }}
        >
          <ChevronRight size={15} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => handlePageClick(totalPages)}
          disabled={safeCurrentPage === totalPages}
          title="Last Page"
          style={{
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #e2e8f0",
            backgroundColor: safeCurrentPage === totalPages ? "#f8fafc" : "#ffffff",
            color: safeCurrentPage === totalPages ? "#cbd5e1" : "#475569",
            borderRadius: "6px",
            cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer"
          }}
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
}
