import "../styles/completed-production.css";
import "../styles/production-theme.css";
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  CheckCircle2,
  Package,
  Settings,
  Hourglass,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileText,
  Layers,
  Printer,
  User,
  Check,
  Clock,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import productionApi from "../api/productionApi";

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

// Orders that have finished every operation. They move to QC automatically,
// so "Ready for QC" = waiting for inspection, "QC Passed" = inspection done.
const READY_STATUSES = ["QC"];
const DONE_STATUSES = ["QC_PASSED", "COMPLETED"];
const COMPLETED_STATUSES = [...READY_STATUSES, ...DONE_STATUSES];

const ROWS_PER_PAGE = 8;
const TABS = [
  { key: "READY_QC", label: "Ready for QC", count: "ready" },
  { key: "QC_DONE", label: "QC Passed", count: "done" },
  { key: "ALL_COMPLETED", label: "All Completed", count: "total" },
];

const toList = (res) => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  return d?.items || d?.branches || d?.data || [];
};

const errorMessage = (err, fallback) => {
  const d = err?.response?.data;
  const details = Array.isArray(d?.details) ? d.details.map((x) => x?.message).filter(Boolean).join(" ") : "";
  return details || d?.message || err?.message || fallback;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

const fmtDateTime = (d) =>
  d
    ? `${new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${new Date(
        d
      ).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
    : "—";

const fmtMinutes = (mins) => {
  const m = Math.round(Number(mins) || 0);
  if (m <= 0) return "—";
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r ? `${h} h ${r} min` : `${h} h`;
};

const operatorOf = (op) => op.operatorName || op.assignedEmployeeId?.name || "—";
const machineOf = (op) => op.machine || op.machineId?.printerName || op.machineId?.model || "—";

const statusLabel = (status) => (READY_STATUSES.includes(status) ? "Ready for QC" : "QC Passed");

// Server order -> row shown in the table / details dialog
const mapOrder = (o) => {
  const ops = Array.isArray(o.operations) ? o.operations : [];
  const finishedOps = ops.filter((op) => op.status === "COMPLETED");
  const startTimes = ops.map((op) => op.startAt).filter(Boolean).map((d) => new Date(d).getTime());
  const waste = ops.reduce((sum, op) => sum + (Number(op.wastageQty) || 0), 0);
  const worked = ops.reduce((sum, op) => sum + (Number(op.workedMinutes) || 0), 0);

  // Materials: sum the same item across operations
  const materials = new Map();
  ops.forEach((op) => {
    (op.consumptionRecords || []).forEach((r) => {
      const key = `${r.itemName}|${r.unit || ""}`;
      const entry = materials.get(key) || { name: r.itemName, unit: r.unit || "", qty: 0, usedIn: new Set() };
      entry.qty += Number(r.quantity) || 0;
      entry.usedIn.add(op.operationName || op.operationCode);
      materials.set(key, entry);
    });
  });

  const completedAt = o.actualEnd || o.updatedAt;
  const lastRemark = [...ops].reverse().find((op) => op.remarks)?.remarks;

  return {
    id: String(o._id || o.id),
    status: o.status,
    poNumber: o.productionNo || "—",
    jobNumber: o.jobNo || o.jobOrderNo || o.jobOrderId?.jobNo || "—",
    customer: o.customerName || o.jobOrderId?.customerName || "—",
    product: o.productName || o.jobOrderId?.title || "—",
    branch: o.branchName || o.branchId?.name || "",
    priority: o.priority || "",
    totalQty: Number(o.plannedQty) || 0,
    completedQty: Number(o.actualQty || o.approvedQty || o.plannedQty) || 0,
    completedAt,
    completedDate: fmtDate(completedAt),
    startedAt: startTimes.length ? new Date(Math.min(...startTimes)) : o.actualStart || null,
    workedMinutes: worked,
    wasteQty: waste,
    operationsDone: `${finishedOps.length}/${ops.length}`,
    operations: ops,
    materials: [...materials.values()].map((m) => ({ ...m, usedIn: [...m.usedIn].join(", ") })),
    thumbnail: o.sampleImageUrl || o.designProofUrl || "",
    remarks: [o.notes, lastRemark].filter(Boolean).join(" • ") || "—",
  };
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Page                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export const CompletedProductionPage = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState(""); // "" = all branches
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [productFilter, setProductFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [activeSubTab, setActiveSubTab] = useState("READY_QC");
  const [page, setPage] = useState(1);

  const [branches, setBranches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailsModalOrder, setDetailsModalOrder] = useState(null);
  const dateRef = useRef(null);

  /* branches for the filter */
  useEffect(() => {
    productionApi
      .getBranches()
      .then((res) => setBranches(toList(res)))
      .catch(() => setBranches([]));
  }, []);

  /* debounce the search box */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const h = (e) => dateRef.current && !dateRef.current.contains(e.target) && setDateOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e) => e.key === "Escape" && setDetailsModalOrder(null);
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  /* real data: every order that finished production, for the chosen branch / dates / search */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { status: COMPLETED_STATUSES.join(","), limit: 500 };
      if (branchFilter) params.branchId = branchFilter;
      if (dateFrom) params.completedFrom = dateFrom;
      if (dateTo) params.completedTo = dateTo;
      if (debouncedSearch) params.search = debouncedSearch;

      const [res, st] = await Promise.all([
        productionApi.getProductionOrders(params),
        productionApi.getProductionStats(branchFilter ? { branchId: branchFilter } : {}).catch(() => null),
      ]);
      const list = Array.isArray(res?.data) ? res.data : res?.items || [];
      setOrders(list.map(mapOrder));
      setStats(st?.data || st || null);
    } catch (e) {
      setOrders([]);
      setError(errorMessage(e, "Could not load completed production orders."));
    } finally {
      setLoading(false);
    }
  }, [branchFilter, dateFrom, dateTo, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  /* dropdown options come from the loaded orders */
  const productOptions = useMemo(
    () => [...new Set(orders.map((o) => o.product).filter((v) => v && v !== "—"))].sort(),
    [orders]
  );
  const customerOptions = useMemo(
    () => [...new Set(orders.map((o) => o.customer).filter((v) => v && v !== "—"))].sort(),
    [orders]
  );

  /* tab + product + customer filters (search, branch and dates ran on the server) */
  const matching = useMemo(
    () =>
      orders.filter((o) => {
        if (customerFilter !== "All" && o.customer !== customerFilter) return false;
        if (productFilter !== "All" && o.product !== productFilter) return false;
        return true;
      }),
    [orders, productFilter, customerFilter]
  );

  const counts = useMemo(
    () => ({
      ready: matching.filter((o) => READY_STATUSES.includes(o.status)).length,
      done: matching.filter((o) => DONE_STATUSES.includes(o.status)).length,
      total: matching.length,
    }),
    [matching]
  );

  const filteredOrders = useMemo(() => {
    if (activeSubTab === "READY_QC") return matching.filter((o) => READY_STATUSES.includes(o.status));
    if (activeSubTab === "QC_DONE") return matching.filter((o) => DONE_STATUSES.includes(o.status));
    return matching;
  }, [matching, activeSubTab]);

  const kpis = [
    { label: "Total Production Orders", value: stats?.total ?? "—", icon: Package },
    { label: "Completed Orders", value: stats ? (stats.awaitingQc || 0) + (stats.completed || 0) : "—", icon: Settings },
    { label: "Ready for QC", value: stats?.awaitingQc ?? "—", icon: CheckCircle2 },
    { label: "Awaiting Remaining Operations", value: stats?.inProgress ?? "—", icon: Hourglass },
    { label: "QC Passed", value: stats?.completed ?? "—", icon: ShieldCheck },
  ];

  /* pagination */
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
  const pagedOrders = filteredOrders.slice(startIdx, startIdx + ROWS_PER_PAGE);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, currentPage - 3),
    Math.max(0, currentPage - 3) + 5
  );

  const hasActiveFilters =
    searchTerm || branchFilter || dateFrom || dateTo || productFilter !== "All" || customerFilter !== "All";

  const handleReset = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setBranchFilter("");
    setProductFilter("All");
    setCustomerFilter("All");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const resetPage = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const dateLabel =
    dateFrom || dateTo ? `${dateFrom ? fmtDate(dateFrom) : "Any"} - ${dateTo ? fmtDate(dateTo) : "Any"}` : "All dates";

  const d = detailsModalOrder;

  return (
    <div className="completed-production-page">
      {/* Header */}
      <header className="cp-header">
        <div className="cp-header-main">
          <span className="cp-header-icon">
            <Check size={26} strokeWidth={3} />
          </span>
          <div>
            <h1>Completed Production</h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#475569" }}>
              Orders that finished every operation. They go to QC automatically.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="cp-btn cp-btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={15} /> {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button type="button" className="cp-btn cp-btn-primary" onClick={() => navigate("/jobflow/qc")}>
            <ShieldCheck size={15} /> Open Quality Control <ChevronRight size={15} />
          </button>
        </div>
      </header>

      {/* Filters */}
      <section className="cp-filters" aria-label="Filters">
        <div className="cp-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by PO, job number, customer, product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {branches.length > 1 && (
          <label className="cp-field">
            <span>Branch</span>
            <select value={branchFilter} onChange={resetPage(setBranchFilter)}>
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b._id || b.id} value={b._id || b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="cp-field cp-date" ref={dateRef}>
          <span>Completed Date</span>
          <button type="button" className="cp-date-btn" onClick={() => setDateOpen((v) => !v)}>
            {dateLabel}
            <Calendar size={16} />
          </button>
          {dateOpen && (
            <div className="cp-date-pop">
              <label>
                From
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  className="cp-btn cp-btn-ghost cp-btn-sm"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setPage(1);
                  }}
                >
                  Clear dates
                </button>
              )}
            </div>
          )}
        </div>

        <label className="cp-field">
          <span>Product</span>
          <select value={productFilter} onChange={resetPage(setProductFilter)}>
            <option value="All">All</option>
            {productOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="cp-field">
          <span>Customer</span>
          <select value={customerFilter} onChange={resetPage(setCustomerFilter)}>
            <option value="All">All</option>
            {customerOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="cp-btn cp-btn-ghost cp-reset" onClick={handleReset} disabled={!hasActiveFilters}>
          Reset
        </button>
      </section>

      {error && (
        <div
          role="alert"
          style={{ background: "#fef2f2", color: "#b91c1c", padding: "10px 16px", borderRadius: 8, margin: "0 0 14px", fontSize: 13 }}
        >
          {error}
        </div>
      )}

      {/* KPI cards */}
      <section className="cp-stats" aria-label="Summary">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div className="cp-stat" key={label}>
            <Icon size={34} strokeWidth={1.8} className="cp-stat-icon" />
            <div>
              <div className="cp-stat-label">{label}</div>
              <div className="cp-stat-value">{value}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Tabs */}
      <div className="cp-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeSubTab === t.key}
            className={activeSubTab === t.key ? "is-active" : ""}
            onClick={() => {
              setActiveSubTab(t.key);
              setPage(1);
            }}
          >
            {t.label} ({counts[t.count]})
          </button>
        ))}
      </div>

      {/* Table card */}
      <section className="cp-card">
        <div className="cp-table-wrap">
          <table className="cp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>PO Number</th>
                <th>Job Number</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Branch</th>
                <th>Total Qty</th>
                <th>Completed Qty</th>
                <th>Completed Date</th>
                <th>Status</th>
                <th className="col-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="cp-empty-row">
                  <td colSpan={11}>Loading completed orders…</td>
                </tr>
              ) : pagedOrders.length === 0 ? (
                <tr className="cp-empty-row">
                  <td colSpan={11}>
                    {hasActiveFilters
                      ? "No completed orders match these filters."
                      : "No production order has finished all its operations yet."}
                  </td>
                </tr>
              ) : (
                pagedOrders.map((order, idx) => (
                  <tr key={order.id}>
                    <td className="col-index" data-label="#">{startIdx + idx + 1}</td>
                    <td className="cp-po" data-label="PO Number">{order.poNumber}</td>
                    <td data-label="Job Number">{order.jobNumber}</td>
                    <td data-label="Customer">{order.customer}</td>
                    <td data-label="Product">{order.product}</td>
                    <td data-label="Branch">{order.branch || "—"}</td>
                    <td data-label="Total Qty">{order.totalQty.toLocaleString()} pcs</td>
                    <td data-label="Completed Qty">{order.completedQty.toLocaleString()} pcs</td>
                    <td data-label="Completed Date">{order.completedDate || "—"}</td>
                    <td data-label="Status">
                      <span className="cp-pill">{statusLabel(order.status)}</span>
                    </td>
                    <td className="col-actions" data-label="">
                      <div className="cp-actions">
                        {READY_STATUSES.includes(order.status) && (
                          <button
                            type="button"
                            className="cp-btn cp-btn-sm cp-btn-outline"
                            onClick={() => navigate("/jobflow/qc")}
                          >
                            <ShieldCheck size={14} /> Open QC
                          </button>
                        )}
                        <button
                          type="button"
                          className="cp-icon-btn"
                          title="View production details"
                          aria-label="View production details"
                          onClick={() => setDetailsModalOrder(order)}
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="cp-foot">
          <div className="cp-foot-info">
            <span>
              {filteredOrders.length === 0
                ? "Showing 0 records"
                : `Showing ${startIdx + 1} to ${Math.min(startIdx + ROWS_PER_PAGE, filteredOrders.length)} of ${filteredOrders.length} records`}
            </span>
          </div>

          <nav className="cp-pager" aria-label="Pagination">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page">
              <ChevronLeft size={16} />
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                className={n === currentPage ? "is-active" : ""}
                aria-current={n === currentPage ? "page" : undefined}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Next page">
              <ChevronRight size={16} />
            </button>
          </nav>
        </footer>
      </section>

      {/* Production Details modal */}
      {d && (
        <div className="cp-overlay" onClick={() => setDetailsModalOrder(null)}>
          <div className="cp-modal cp-modal-lg" role="dialog" aria-modal="true" aria-label="Production Details" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-head">
              <div className="cp-modal-title">
                <span className="cp-modal-icon sq"><FileText size={18} /></span>
                <h3>Production Details</h3>
              </div>
              <button type="button" className="cp-close" onClick={() => setDetailsModalOrder(null)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="cp-modal-body">
              <div className="cp-job">
                {d.thumbnail ? <img src={d.thumbnail} alt="" /> : null}
                <div className="cp-job-info">
                  <div className="cp-job-no">
                    {d.poNumber} <i>|</i> {d.jobNumber}
                  </div>
                  <div className="cp-job-product">{d.product}</div>
                  <div className="cp-job-customer">{d.customer}</div>
                </div>
                <span className="cp-pill cp-pill-lg">
                  <CheckCircle2 size={15} /> {statusLabel(d.status)}
                </span>
              </div>

              <div className="cp-info-grid">
                {[
                  [Settings, "Operations Done", d.operationsDone],
                  [Printer, "Branch", d.branch || "—"],
                  [Calendar, "Production Started", fmtDateTime(d.startedAt)],
                  [Calendar, "Production Finished", fmtDateTime(d.completedAt)],
                  [Clock, "Total Worked Time", fmtMinutes(d.workedMinutes)],
                  [User, "Priority", d.priority || "—"],
                ].map(([Icon, label, val]) => (
                  <div className="cp-info" key={label}>
                    <Icon size={20} />
                    <div>
                      <span>{label}</span>
                      <strong>{val}</strong>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cp-panel">
                <h4><Settings size={16} /> Operation Output</h4>
                <div className="cp-output">
                  <div>
                    <span>Planned Quantity</span>
                    <strong>{d.totalQty.toLocaleString()} pcs</strong>
                  </div>
                  <div>
                    <span>Completed Quantity</span>
                    <strong>{d.completedQty.toLocaleString()} pcs</strong>
                  </div>
                  <div>
                    <span>Rejected / Waste</span>
                    <strong>{d.wasteQty.toLocaleString()} pcs</strong>
                  </div>
                </div>
              </div>

              <div className="cp-panel">
                <h4><Layers size={16} /> Operations</h4>
                <div className="cp-mat-wrap">
                  <table className="cp-mat">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Operation</th>
                        <th>Operator</th>
                        <th>Machine</th>
                        <th>Started</th>
                        <th>Finished</th>
                        <th>Time</th>
                        <th>Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.operations.length === 0 ? (
                        <tr>
                          <td colSpan={8}>No operations recorded.</td>
                        </tr>
                      ) : (
                        d.operations.map((op, i) => (
                          <tr key={op._id || i}>
                            <td>{op.sequenceNo || i + 1}</td>
                            <td>{op.operationName || op.operationCode}</td>
                            <td>{operatorOf(op)}</td>
                            <td>{machineOf(op)}</td>
                            <td>{fmtDateTime(op.startAt)}</td>
                            <td>{fmtDateTime(op.endAt)}</td>
                            <td>{fmtMinutes(op.workedMinutes)}</td>
                            <td>{(Number(op.completedQty) || 0).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cp-panel">
                <h4><Layers size={16} /> Materials Consumed</h4>
                <div className="cp-mat-wrap">
                  <table className="cp-mat">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Material</th>
                        <th>Consumed Qty</th>
                        <th>Unit</th>
                        <th>Used In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.materials.length === 0 ? (
                        <tr>
                          <td colSpan={5}>No material consumption was recorded.</td>
                        </tr>
                      ) : (
                        d.materials.map((m, i) => (
                          <tr key={`${m.name}-${i}`}>
                            <td>{i + 1}</td>
                            <td>{m.name}</td>
                            <td>{m.qty.toLocaleString()}</td>
                            <td>{m.unit}</td>
                            <td>{m.usedIn}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cp-panel">
                <h4><MessageSquare size={16} /> Remarks</h4>
                <p className="cp-remarks">{d.remarks}</p>
              </div>
            </div>

            <div className="cp-modal-foot">
              <button type="button" className="cp-btn cp-btn-ghost" onClick={() => setDetailsModalOrder(null)}>
                Close
              </button>
              {READY_STATUSES.includes(d.status) && (
                <button type="button" className="cp-btn cp-btn-primary" onClick={() => navigate("/jobflow/qc")}>
                  <ShieldCheck size={15} /> Open Quality Control
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletedProductionPage;
