import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import "./DataTable.css";
import Pagination from "../Pagination";

/**
 * Modern, reusable, purely presentational DataTable matching PrintZ design language.
 *
 * Props:
 * - title: string | ReactNode (Table title, e.g. "Branch List")
 * - subtitle: string (Table subtitle, e.g. "View, edit or delete branch details")
 * - icon: ReactNode (Icon inside header badge)
 * - columns: Array<{
 *     key: string,
 *     label: string,
 *     sortable?: boolean,
 *     align?: 'left' | 'center' | 'right',
 *     render?: (row: any, index: number) => ReactNode,
 *     width?: string
 *   }>
 * - data: Array<any>
 * - loading: boolean
 * - emptyMessage?: string
 * - onEdit?: (row: any) => void
 * - onDelete?: (row: any) => void
 * - filterComponent?: ReactNode (optional controls like Date Filter or custom dropdowns)
 * - searchable?: boolean (default: true)
 * - searchPlaceholder?: string (default: "Search...")
 * - searchKeys?: string[] (keys to search on, defaults to all column keys)
 * - pagination?: boolean (default: true)
 * - pageSize?: number (default: 10)
 * - customActions?: (row: any) => ReactNode
 */
const DataTable = ({
  title,
  subtitle,
  icon,
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No records found",
  onView,
  onEdit,
  onDelete,
  filterComponent,
  searchable = true,
  searchPlaceholder = "Search...",
  searchKeys,
  pagination = true,
  pageSize = 10,
  pageSizeOptions,
  customActions,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  // Search filtering
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      if (searchKeys && searchKeys.length > 0) {
        return searchKeys.some((k) => {
          const val = item[k];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(query);
        });
      }
      return Object.values(item).some((val) => {
        if (typeof val === "string" || typeof val === "number") {
          return String(val).toLowerCase().includes(query);
        }
        return false;
      });
    });
  }, [data, searchQuery, searchKeys]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key] ?? "";
      const bVal = b[sortConfig.key] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / currentPageSize) || 1;
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const startIndex = (currentPage - 1) * currentPageSize;
    return sortedData.slice(startIndex, startIndex + currentPageSize);
  }, [sortedData, pagination, currentPage, currentPageSize]);

  const handleSort = (key) => {
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

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const hasActionColumn = onView || onEdit || onDelete || customActions;

  return (
    <div className="printz-table-card">
      {(title || subtitle || searchable || filterComponent) && (
        <div className="printz-table-header-wrap">
          <div className="printz-table-title-area">
            {icon && <div className="printz-table-icon-badge">{icon}</div>}
            <div className="printz-table-title-text">
              {title && <h3>{title}</h3>}
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>

          <div className="printz-table-controls-area">
            {searchable && (
              <div className="printz-search-box">
                <Search size={16} />
                <input
                  type="text"
                  className="printz-search-input"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
            {filterComponent}
          </div>
        </div>
      )}

      <div className="printz-table-scroll">
        <table className="printz-modern-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  style={{
                    textAlign: col.align || "left",
                    width: col.width || "auto",
                  }}
                  className={col.sortable !== false ? "sortable" : ""}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="printz-th-content">
                    {col.label}
                    {col.sortable !== false && (
                      <ArrowUpDown
                        size={13}
                        className={`printz-sort-arrows ${
                          sortConfig.key === col.key ? "active" : ""
                        }`}
                      />
                    )}
                  </span>
                </th>
              ))}
              {hasActionColumn && (
                <th style={{ textAlign: "center", width: "120px" }}>ACTIONS</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (hasActionColumn ? 1 : 0)}
                  className="printz-table-loading"
                >
                  <div className="printz-spinner" />
                  <span>Loading records...</span>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (hasActionColumn ? 1 : 0)}
                  className="printz-table-empty"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                const globalIndex =
                  pagination ? (currentPage - 1) * currentPageSize + rowIdx : rowIdx;

                return (
                  <tr key={row.id || row._id || rowIdx}>
                    {columns.map((col, colIdx) => (
                      <td
                        key={col.key || colIdx}
                        style={{ textAlign: col.align || "left" }}
                      >
                        {col.render
                          ? col.render(row, globalIndex)
                          : row[col.key] ?? "-"}
                      </td>
                    ))}

                    {hasActionColumn && (
                      <td style={{ textAlign: "center" }}>
                        <div className="printz-actions-group">
                          {customActions && customActions(row, globalIndex)}
                          {onView && (
                            <button
                              type="button"
                              className="printz-btn-action-view"
                              title="View Details"
                              onClick={() => onView(row)}
                            >
                              <Eye size={15} />
                            </button>
                          )}
                          {onEdit && (
                            <button
                              type="button"
                              className="printz-btn-action-edit"
                              title="Edit"
                              onClick={() => onEdit(row)}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              className="printz-btn-action-delete"
                              title="Delete"
                              onClick={() => onDelete(row)}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && !loading && sortedData.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={sortedData.length}
          itemsPerPage={currentPageSize}
          onPageChange={handlePageChange}
          onItemsPerPageChange={setCurrentPageSize}
          pageSizeOptions={pageSizeOptions || [10, 20, 50, 100]}
          itemLabel="entries"
        />
      )}
    </div>
  );
};

export default DataTable;
