import React from "react";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Footer shared by the salary tables: "Showing x to y of z" with a manual
// rows-per-page selector and page buttons.
export default function SalaryPagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  unit = "items",
  hidden = false,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="salary-pagination-bar" style={hidden ? { display: "none" } : undefined}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          Rows per page
          <select
            className="salary-filter-select"
            style={{ width: "auto", padding: "4px 8px" }}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <span>
          Showing {from} to {to} of {total} {unit}
        </span>
      </span>

      <div className="salary-page-buttons">
        <button
          type="button"
          className="salary-page-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          &lt;
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            className={`salary-page-btn ${page === p ? "active" : ""}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="salary-page-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          &gt;
        </button>
      </div>
    </div>
  );
}
