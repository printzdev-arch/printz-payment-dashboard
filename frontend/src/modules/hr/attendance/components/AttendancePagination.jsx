import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Modern, professional, reusable pagination component for Attendance module
 * Left side: dynamic rows per page selector + record count info
 * Right side: optional extra action buttons + pagination controls
 */
export default function AttendancePagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  itemName = "records",
  extraActions = null,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const fromIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const toIndex = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (safeCurrentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "...",
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      "...",
      totalPages,
    ];
  };

  const pages = getPageNumbers();

  return (
    <div className="attendance-pagination-container">
      {/* ─── Left: Dynamic rows per page selector & record count info ─── */}
      <div className="attendance-pagination-left">
        <div className="attendance-rows-per-page">
          <label htmlFor="rows-per-page-select" className="rows-label">
            Rows per page:
          </label>
          <div className="rows-select-wrapper">
            <select
              id="rows-per-page-select"
              className="rows-select-input"
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                if (onPageSizeChange) {
                  onPageSizeChange(newSize);
                }
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="attendance-pagination-divider" />

        <div className="attendance-pagination-info">
          Showing <span className="highlight">{fromIndex}</span> to{" "}
          <span className="highlight">{toIndex}</span> of{" "}
          <span className="highlight">{totalItems}</span> {itemName}
        </div>
      </div>

      {/* ─── Right: Optional Extra Actions + Pagination Controls ─────── */}
      <div className="attendance-pagination-right">
        {extraActions && (
          <div className="attendance-pagination-extra-actions">
            {extraActions}
          </div>
        )}

        <div className="attendance-pagination-controls">
          {/* Previous Page Button */}
          <button
            type="button"
            className="pagination-nav-btn"
            disabled={safeCurrentPage <= 1}
            onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft size={16} />
            <span className="nav-btn-text">Previous</span>
          </button>

          {/* Page Numbers */}
          <div className="pagination-pages-list">
            {pages.map((p, idx) => {
              if (p === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="pagination-ellipsis"
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
                  className={`pagination-page-btn ${isActive ? "active" : ""}`}
                  onClick={() => onPageChange(p)}
                  aria-current={isActive ? "page" : undefined}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Page Button */}
          <button
            type="button"
            className="pagination-nav-btn"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
            title="Next Page"
            aria-label="Next Page"
          >
            <span className="nav-btn-text">Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
