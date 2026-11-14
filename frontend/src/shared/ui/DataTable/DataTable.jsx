import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Eye,
  Inbox,
} from "lucide-react";
import "./DataTable.css";
import Pagination from "../Pagination";
import { TableSkeletonRows } from "../motion";

// Reads values like "customer.name" from nested rows
const getValue = (obj, path) => {
  if (!obj || !path) return undefined;
  return String(path).split(".").reduce((acc, part) => (acc !== null && acc !== undefined ? acc[part] : undefined), obj);
};

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
 * - paginationVariant?: "compact" | "default" (compact, the default: "Showing 1 to 5 of 20 entries", Rows select, 3 page numbers + …)
 * - serverPagination?: { page, pageSize, total, onPageChange(page), onPageSizeChange(size) } — when the API pages the data,
 *     pass the current page of rows in `data` and this; the table then does not slice, search or sort rows itself
 * - mobileCards?: boolean (on phones every row becomes a card, each value labelled with its column; a column can set
 *     className (e.g. "printz-cell-lead" shows the cell first, unlabelled; "printz-cell-actions" for button cells))
 * - renderWithValue?: boolean (columns call render(value, row, index) instead of render(row, index); the cell value is read from the column key, which may be nested like "customer.name")
 * - defaultSortKey?: string, defaultSortDir?: "asc" | "desc", sortControls?: boolean (default true; false hides the sort arrows)
 * - rowKey?: string (field that identifies a row, default id / _id), selectedRowId?: any (highlights that row)
 * - className?: string, style?: object (on the table card), headerFontSize?: string
 * - rowRenderer?: (row, index) => <tr>…</tr> (draws the whole row itself, for tables whose rows are too custom for columns; headings, paging and styling still come from DataTable)
 * - summaryRow?: { [columnKey]: ReactNode } (a highlighted totals row under the data, one cell per column; columns without a key entry stay empty)
 * - columns[].group?: string (columns that share a group name get one merged heading above them, e.g. "SOLD" over Pages and Qty)
 * - footer?: ReactNode (shown under the rows, above the pagination, e.g. bulk or admin action buttons)
 * - rowTitle?: (row: any) => string (tooltip shown over a row)
 * - onRowClick?: (row: any) => void (makes whole rows clickable)
 * - rowClassName?: (row: any) => string (extra class per row, e.g. to highlight rows)
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
  sortable = false,
  pagination = true,
  pageSize = 10,
  pageSizeOptions,
  paginationVariant = "compact",
  serverPagination,
  customActions,
  rowClassName,
  onRowClick,
  mobileCards = false,
  rowTitle,
  footer,
  summaryRow,
  rowRenderer,
  renderWithValue = false,
  defaultSortKey = null,
  defaultSortDir = "asc",
  sortControls = true,
  rowKey,
  selectedRowId = null,
  className = "",
  style,
  headerFontSize,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: sortable ? defaultSortKey : null, direction: defaultSortDir });
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(pageSize);
  const isServer = Boolean(serverPagination);
  const currentPage = isServer ? serverPagination.page : localPage;
  const currentPageSize = isServer ? serverPagination.pageSize : localPageSize;
  const setCurrentPage = isServer ? serverPagination.onPageChange : setLocalPage;
  const setCurrentPageSize = isServer ? serverPagination.onPageSizeChange : setLocalPageSize;
  const totalItems = isServer ? serverPagination.total : null;

  // Search filtering
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      if (searchKeys && searchKeys.length > 0) {
        return searchKeys.some((k) => {
          const val = getValue(item, k);
          return val !== undefined && val !== null && String(val).toLowerCase().includes(query);
        });
      }
      const matches = (val) => (typeof val === "string" || typeof val === "number") && String(val).toLowerCase().includes(query);
      return (
        Object.values(item).some(matches) ||
        columns.some((col) => col.key && matches(getValue(item, col.key)))
      );
    });
  }, [data, searchQuery, searchKeys, columns]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortable || !sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = getValue(a, sortConfig.key) ?? "";
      const bVal = getValue(b, sortConfig.key) ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig, sortable]);

  // Pagination
  const totalPages = Math.ceil((isServer ? totalItems : sortedData.length) / currentPageSize) || 1;
  // Data can shrink (filters, deletes); never stay on a page that no longer exists
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    if (!pagination || isServer) return sortedData;
    const startIndex = (safePage - 1) * currentPageSize;
    return sortedData.slice(startIndex, startIndex + currentPageSize);
  }, [sortedData, pagination, isServer, safePage, currentPageSize]);

  const handleSort = (key) => {
    if (!sortable) return;
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

  const hasGroups = columns.some((col) => col.group);
  // Top heading row: a merged cell for each run of columns that share a group, the rest span both heading rows
  const groupedTop = [];
  if (hasGroups) {
    columns.forEach((col, idx) => {
      const last = groupedTop[groupedTop.length - 1];
      if (col.group && last && last.group === col.group) last.span += 1;
      else groupedTop.push(col.group ? { group: col.group, span: 1, key: `g-${idx}` } : { col, key: col.key || idx });
    });
  }

  const renderTh = (col, key, rowSpan) => {
    const canSort = Boolean(sortable) && sortControls && col.sortable !== false && Boolean(col.key);
    return (
      <th
        key={key}
        rowSpan={rowSpan}
        style={{
          textAlign: col.align || "left",
          width: col.width || "auto",
          minWidth: col.minWidth || undefined,
          fontSize: headerFontSize || undefined,
          cursor: canSort ? "pointer" : "default",
        }}
        className={`${canSort ? "sortable" : ""} ${col.className || ""}`.trim()}
        onClick={() => canSort && handleSort(col.key)}
      >
        <span className="printz-th-content">
          {col.label || col.header}
          {canSort && <ArrowUpDown size={13} className={`printz-sort-arrows ${sortConfig.key === col.key ? "active" : ""}`} />}
        </span>
      </th>
    );
  };

  return (
    <div className={`printz-dt-card ${className}`.trim()} style={style}>
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
        <table className={`printz-modern-table ${mobileCards ? "printz-table-cards printz-dt-cards" : ""}`.trim()}>
          <thead>
            {hasGroups ? (
              <>
                <tr>
                  {groupedTop.map((cell) =>
                    cell.group ? (
                      <th key={cell.key} colSpan={cell.span} className="printz-th-group" style={{ textAlign: "center" }}>
                        {cell.group}
                      </th>
                    ) : (
                      renderTh(cell.col, cell.key, 2)
                    )
                  )}
                  {hasActionColumn && (
                    <th rowSpan={2} style={{ textAlign: "center", width: "120px" }}>ACTIONS</th>
                  )}
                </tr>
                <tr>{columns.filter((col) => col.group).map((col, idx) => renderTh(col, col.key || idx))}</tr>
              </>
            ) : (
              <tr>
                {columns.map((col, idx) => renderTh(col, col.key || idx))}
                {hasActionColumn && (
                  <th style={{ textAlign: "center", width: "120px" }}>ACTIONS</th>
                )}
              </tr>
            )}
          </thead>
          <tbody>
            {loading ? (
              <TableSkeletonRows
                rowCount={currentPageSize > 6 ? 6 : Math.max(3, currentPageSize)}
                columnCount={columns.length + (hasActionColumn ? 1 : 0)}
              />
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (hasActionColumn ? 1 : 0)}
                  className="printz-table-empty"
                >
                  {typeof emptyMessage === "string" ? (
                    <div className="printz-empty-block">
                      <Inbox size={36} />
                      <p>{emptyMessage}</p>
                      {searchQuery && (
                        <button type="button" className="printz-empty-clear" onClick={() => setSearchQuery("")}>
                          Clear Search Filter
                        </button>
                      )}
                    </div>
                  ) : (
                    emptyMessage
                  )}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                const globalIndex =
                  pagination ? (safePage - 1) * currentPageSize + rowIdx : rowIdx;
                if (rowRenderer) return <React.Fragment key={(rowKey && row[rowKey]) || row.id || row._id || rowIdx}>{rowRenderer(row, globalIndex)}</React.Fragment>;
                const id = (rowKey && row[rowKey]) || row.id || row._id || rowIdx;
                const isSelected = selectedRowId !== null && (selectedRowId === id || selectedRowId === row._id || selectedRowId === row.id);

                return (
                  <tr
                    key={id}
                    className={`printz-row-animated ${onRowClick ? "printz-row-clickable" : ""} ${isSelected ? "printz-row-selected" : ""} ${rowClassName ? rowClassName(row) || "" : ""}`.trim()}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    title={rowTitle ? rowTitle(row) : undefined}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={col.key || colIdx}
                        style={{ textAlign: col.align || "left", minWidth: col.minWidth || undefined }}
                        className={col.className}
                        data-label={typeof col.label === "string" ? col.label : undefined}
                      >
                        {col.render
                          ? renderWithValue
                            ? col.render(getValue(row, col.key), row, globalIndex)
                            : col.render(row, globalIndex)
                          : getValue(row, col.key) ?? "-"}
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
          {summaryRow && !loading && (
            <tfoot>
              <tr className="printz-summary-row">
                {columns.map((col, idx) => (
                  <td key={col.key || idx} style={{ textAlign: col.align || "left" }}>
                    {summaryRow[col.key] ?? ""}
                  </td>
                ))}
                {hasActionColumn && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {footer && <div className="printz-table-footer">{footer}</div>}

      {pagination && !loading && (isServer ? totalItems : sortedData.length) > 0 && (
        <Pagination
          currentPage={safePage}
          totalItems={isServer ? totalItems : sortedData.length}
          itemsPerPage={currentPageSize}
          onPageChange={handlePageChange}
          onItemsPerPageChange={setCurrentPageSize}
          pageSizeOptions={pageSizeOptions || (paginationVariant === "compact" ? [5, 10, 20, 50, 100] : [10, 20, 50, 100])}
          itemLabel="entries"
          variant={paginationVariant}
        />
      )}
    </div>
  );
};

export default DataTable;
