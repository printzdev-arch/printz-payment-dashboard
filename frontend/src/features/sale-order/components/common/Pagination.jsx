import React from "react";
import "../../styles/sale-order.css";

export const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Footer under the tables: "Showing x to y of z", rows-per-page and page buttons (server-side paging).
export default function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange, unit = "orders" }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  // Show a window of pages around the current one when there are many
  const pages = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let p = start; p <= Math.min(totalPages, start + 4); p += 1) pages.push(p);

  return (
    <div className="so-pagination">
      <span style={{ display: "inline-flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Rows per page
          <select
            className="so-select"
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

      <div className="so-page-buttons">
        <button type="button" className="so-page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          &lt;
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`so-page-btn ${page === p ? "active" : ""}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button type="button" className="so-page-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          &gt;
        </button>
      </div>
    </div>
  );
}
