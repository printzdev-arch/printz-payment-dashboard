import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Search,
  Plus,
  Calendar,
  CalendarCheck,
  Play,
  Check,
  Pause,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Clock,
  X,
  RefreshCw,
  Eye,
  Ban,
  Pencil,
} from "lucide-react";
import productionApi from "../api/productionApi";
import PriorityBadge from "../../shared/components/PriorityBadge";
import ProductionOrderActionsModal from "../components/ProductionOrderActionsModal";
import "../styles/production-orders.css";
import "../styles/production-theme.css";

import Pagination from "../../../../components/common/Pagination";
/* ---------- helpers ---------- */

// Database value -> label shown to users
const STATUS_LABELS = {
  UNASSIGNED: "Unplanned",
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  QC: "Awaiting QC",
  QC_PASSED: "QC Passed",
  QC_ISSUE: "QC Issue",
  REWORK_REQUIRED: "Rework Required",
  REPRINT_REQUIRED: "Reprint Required",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const OP_STATUS_LABELS = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  RUNNING: "In Progress",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  FAILED: "Failed",
  SKIPPED: "Skipped",
  ON_HOLD: "On Hold",
};

const CLOSED = ["COMPLETED", "CANCELLED"];

// Existing stylesheet uses "in-production" for the In Progress pill
const pillClass = (status) =>
  `pill-status-${String(status === "IN_PROGRESS" ? "IN_PRODUCTION" : status || "PLANNED")
    .toLowerCase()
    .replace(/_/g, "-")}`;

const planningLabel = (o) => {
  if (o.status !== "UNASSIGNED") return "Planned";
  return o.planningStatus === "DRAFT" ? "Draft" : "Unplanned";
};

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt)
    ? "—"
    : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt)
    ? "—"
    : dt.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const fmtNum = (n) => (n === undefined || n === null ? "—" : Number(n).toLocaleString("en-US"));

const errorMessage = (err, fallback) => {
  const d = err?.response?.data;
  const details = Array.isArray(d?.details) ? d.details.map((x) => x?.message).filter(Boolean).join(" ") : "";
  return details || d?.message || err?.message || fallback;
};

// Which lifecycle actions are valid for a status
const actionsFor = (status) => ({
  hold: ["PLANNED", "IN_PROGRESS"].includes(status),
  resume: status === "ON_HOLD",
  cancel: !CLOSED.includes(status) && status !== "QC_PASSED",
});

/* ---------- details modal ---------- */
function OrderDetailsModal({ orderId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    productionApi
      .getProductionOrderById(orderId)
      .then((res) => alive && setData(res?.data || res?.productionOrder || res))
      .catch((e) => alive && setError(errorMessage(e, "Could not load this job order.")));
    return () => {
      alive = false;
    };
  }, [orderId]);

  const ops = data?.operations || [];
  const history = [...(data?.statusHistory || [])].reverse();

  return (
    <div className="po2-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="po2-modal" role="dialog" aria-modal="true">
        <div className="po2-modal-head">
          <div>
            <h3>{data?.jobNo || data?.jobOrderNo || "Job Order"}</h3>
            {data && (
              <span className="po2-sub">
                {data.customerName || "—"} · {data.productName || "—"}
              </span>
            )}
          </div>
          <button type="button" className="po2-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="po2-modal-body">
          {error && <div className="po2-error">{error}</div>}
          {!data && !error && <div className="po2-muted">Loading…</div>}

          {data && (
            <>
              <div className="po2-facts">
                <Fact label="Status">
                  <span className={`po-pill ${pillClass(data.status)}`}>
                    {STATUS_LABELS[data.status] || data.status}
                  </span>
                </Fact>
                <Fact label="Priority">{["URGENT", "HIGH", "RUSH"].includes(String(data.priority || "").toUpperCase()) ? "Urgent" : "Normal"}</Fact>
                <Fact label="Progress">{data.progressPct ?? 0}%</Fact>
                <Fact label="Due Date">{fmtDate(data.dueDate)}</Fact>
                <Fact label="Planned Qty">{fmtNum(data.plannedQty)}</Fact>
                <Fact label="Produced Qty">{fmtNum(data.actualQty)}</Fact>
                <Fact label="Approved Qty">{fmtNum(data.approvedQty)}</Fact>
                <Fact label="Rejected Qty">{fmtNum(data.rejectedQty)}</Fact>
                <Fact label="Planned Start">{fmtDate(data.plannedStart)}</Fact>
                <Fact label="Planned End">{fmtDate(data.plannedEnd)}</Fact>
                <Fact label="Actual Start">{fmtDateTime(data.actualStart)}</Fact>
                <Fact label="Actual End">{fmtDateTime(data.actualEnd)}</Fact>
                <Fact label="Machine">{data.machine || "—"}</Fact>
                <Fact label="Operators">
                  {(data.assignedEmployees || []).length ? data.assignedEmployees.join(", ") : "—"}
                </Fact>
                <Fact label="Branch">{data.branchName || "—"}</Fact>
                <Fact label="Cycle">
                  {data.cycleType === "ORIGINAL" || !data.cycleType ? "Original" : `${data.cycleType} R${data.cycleNo}`}
                </Fact>
              </div>

              {data.holdReason && data.status === "ON_HOLD" && (
                <div className="po2-note po2-note-warn">On hold: {data.holdReason}</div>
              )}
              {data.cancelReason && data.status === "CANCELLED" && (
                <div className="po2-note po2-note-danger">Cancelled: {data.cancelReason}</div>
              )}

              <h4 className="po2-section">Operations</h4>
              {ops.length === 0 ? (
                <div className="po2-muted">No operations yet. Plan this order first.</div>
              ) : (
                <div className="po2-table-wrap">
                  <table className="po2-table">
                    <thead>
                      <tr>
                                <th>Operation</th>
                        <th>Status</th>
                        <th>Machine</th>
                        <th>Operator</th>
                        <th className="num">Output</th>
                        <th className="num">Waste</th>
                        <th className="num">Min</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ops.map((op) => (
                        <tr key={op._id}>
                          <td>{op.sequenceNo}</td>
                          <td>
                            {op.operationName || op.operationCode}
                            {op.isRework && <span className="po2-tag">Rework</span>}
                            {op.isReprint && <span className="po2-tag">Reprint</span>}
                          </td>
                          <td>{OP_STATUS_LABELS[op.status] || op.status}</td>
                          <td>{op.machineId?.printerName || op.machine || "—"}</td>
                          <td>{op.assignedEmployeeId?.name || op.operatorName || "—"}</td>
                          <td className="num">{fmtNum(op.outputQty)}</td>
                          <td className="num">{fmtNum(op.wastageQty)}</td>
                          <td className="num">{op.workedMinutes ? Math.round(op.workedMinutes) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(data.qualityChecks || []).length > 0 && (
                <>
                  <h4 className="po2-section">Quality Checks</h4>
                  <ul className="po2-list">
                    {data.qualityChecks.map((qc) => (
                      <li key={qc._id}>
                        <strong>{qc.result}</strong> · accepted {fmtNum(qc.acceptedQty)} / rejected{" "}
                        {fmtNum(qc.rejectedQty)}
                        {qc.correctiveAction && qc.correctiveAction !== "NONE" ? ` · ${qc.correctiveAction}` : ""}
                        <span className="po2-muted"> · {fmtDateTime(qc.checkedAt)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <h4 className="po2-section">Status History</h4>
              {history.length === 0 ? (
                <div className="po2-muted">No status changes recorded.</div>
              ) : (
                <ul className="po2-list">
                  {history.map((h, i) => (
                    <li key={i}>
                      {h.from ? `${STATUS_LABELS[h.from] || h.from} → ` : ""}
                      <strong>{STATUS_LABELS[h.to] || h.to}</strong>
                      {h.reason ? ` · ${h.reason}` : ""}
                      <span className="po2-muted"> · {fmtDateTime(h.changedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, children }) {
  return (
    <div className="po2-fact">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

/* ---------- page ---------- */
export default function ProductionOrdersPage() {
  const navigate = useNavigate();
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [planningFilter, setPlanningFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [moreFilters, setMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [branches, setBranches] = useState([]);

  const [menuFor, setMenuFor] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [detailsId, setDetailsId] = useState(null);

  const dateRef = useRef(null);
  const menuRef = useRef(null);

  // Debounce the search box so we do not call the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Branch list (only useful for users who can see several branches)
  useEffect(() => {
    productionApi
      .getBranches()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : res?.items || res?.branches || [];
        setBranches(list);
      })
      .catch(() => setBranches([]));
  }, []);

  const filterParams = useMemo(() => {
    const p = {};
    if (branchFilter !== "ALL") p.branchId = branchFilter;
    if (dateFrom) p.from = dateFrom;
    if (dateTo) p.to = dateTo;
    return p;
  }, [branchFilter, dateFrom, dateTo]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = { ...filterParams, page, limit: rowsPerPage };
      if (debouncedSearch) params.search = debouncedSearch;
      // "Draft" = an unplanned order whose plan was saved as a draft
      if (statusFilter === "DRAFT") {
        params.status = "UNASSIGNED";
        params.planningStatus = "DRAFT";
      } else if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      if (planningFilter !== "ALL" && statusFilter !== "DRAFT") params.planningStatus = planningFilter;

      const res = await productionApi.getProductionOrders(params);
      const list = Array.isArray(res?.data) ? res.data : res?.items || [];
      setOrders(list);
      setTotal(res?.total ?? res?.meta?.total ?? list.length);
    } catch (e) {
      setOrders([]);
      setTotal(0);
      setLoadError(errorMessage(e, "Could not load production orders."));
    } finally {
      setLoading(false);
    }
  }, [filterParams, page, rowsPerPage, debouncedSearch, statusFilter, planningFilter]);

  const loadStats = useCallback(async () => {
    try {
      const res = await productionApi.getProductionStats(filterParams);
      setStats(res?.data || res);
    } catch (e) {
      setStats(null);
    }
  }, [filterParams]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refreshAll = () => {
    loadOrders();
    loadStats();
  };

  // close popovers on outside click
  useEffect(() => {
    const h = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) setDateOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuFor(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // const cards = useMemo(() => {
  //   const s = stats || {};
  //   const v = (k) => (stats ? s[k] ?? 0 : "—");
  //   return [
  //     { label: "Total Orders", value: v("total"), icon: Calendar },
  //     { label: "Unplanned", value: v("unplanned"), icon: ClipboardList },
  //     { label: "Planned", value: v("planned"), icon: CalendarCheck },
  //     { label: "In Progress", value: v("inProgress"), icon: Play },
  //     { label: "Awaiting QC", value: v("awaitingQc"), icon: ShieldCheck },
  //     { label: "On Hold", value: v("onHold"), icon: Pause },
  //     { label: "Completed", value: v("completed"), icon: Check },
  //     { label: "Delayed", value: v("delayed"), icon: Clock },
  //   ];
  // }, [stats]);

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const rowId = (o) => o._id || o.id;

  const openAction = (o, type) => {
    setMenuFor(null);
    setSelectedOrder(o);
    setActionType(type);
  };

  const handlePrimary = (o) => {
    if (o.nextAction === "PLAN") {
      navigate("/production/planning", {
        state: { jobNo: o.jobNo || o.jobOrderNo, productionOrderId: rowId(o) },
      });
      return;
    }
    setDetailsId(rowId(o));
  };

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("ALL");
    setBranchFilter("ALL");
    setPlanningFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const withReset = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const pageNumbers = useMemo(() => {
    const max = 5;
    let s = Math.max(1, currentPage - 2);
    let e = Math.min(totalPages, s + max - 1);
    s = Math.max(1, e - max + 1);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }, [currentPage, totalPages]);

  const dateLabel = dateFrom || dateTo ? `${fmtDate(dateFrom)} - ${fmtDate(dateTo)}` : "All dates";

  return (
    <div className="production-orders-page">
      {/* Page header */}
      <header className="po-header">
        <span className="po-header-icon">
          <ClipboardList size={26} />
        </span>
        <div>
          <h1>Production Orders</h1>
          
        </div>
      </header>

      {/* Filters */}
      <section className="po-filters" aria-label="Filters">
        <div className="po-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by job order no, customer, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {branches.length > 1 && (
          <label className="po-field">
            <span>Branch</span>
            <select value={branchFilter} onChange={withReset(setBranchFilter)}>
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b._id || b.id} value={b._id || b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="po-field">
          <span>Status</span>
          <select value={statusFilter} onChange={withReset(setStatusFilter)}>
            <option value="ALL">All</option>
            <option value="DRAFT">Draft</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <div className="po-field po-date" ref={dateRef}>
          <span>Date Range</span>
          <button type="button" className="po-date-btn" onClick={() => setDateOpen((v) => !v)}>
            {dateLabel}
            <Calendar size={16} />
          </button>
          {dateOpen && (
            <div className="po-date-pop">
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
            </div>
          )}
        </div>
      </section>

      {loadError && (
        <div className="po2-banner" role="alert">
          <span>
            <AlertTriangle size={16} className="po2-banner-icon" />
            {loadError}
          </span>
          <button type="button" onClick={refreshAll}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Table */}
      <section className="po-card">
        <div className="po-card-head">
          <div className="po-card-title">
            <span className="po-card-title-icon">
              <ClipboardList size={16} />
            </span>
            <h2>Production Orders</h2>
          </div>
         
        </div>

        <div className="po-table-wrap">
          <table className="po-table">
            <thead>
              <tr>
                <th>Job Order No</th>
                <th>Customer</th>
                <th>Product</th>
                <th className="num">Order Qty</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Planned</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="po-empty-row">
                  <td colSpan="8">Loading production orders…</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr className="po-empty-row">
                  <td colSpan="8">
                    {loadError ? "Could not load production orders." : "No production orders match the current filters."}
                  </td>
                </tr>
              ) : (
                orders.map((o, i) => {
                  const id = rowId(o);
                  const can = actionsFor(o.status);
                  return (
                    <tr key={id}>
                      <td data-label="Job Order No" className="po-number">
                        {o.jobNo || o.jobOrderNo || "—"}
                      </td>
                      <td data-label="Customer">{o.customerName || "—"}</td>
                      <td data-label="Product">{o.productName || "—"}</td>
                      <td data-label="Order Qty" className="num">
                        {fmtNum(o.quantity ?? o.plannedQty)}
                      </td>
                      <td data-label="Status">
                        {o.status === "UNASSIGNED" && o.planningStatus === "DRAFT" ? (
                          <span className="po-pill pill-status-draft">Draft</span>
                        ) : (
                          <span className={`po-pill ${pillClass(o.status)}`}>
                            {STATUS_LABELS[o.status] || o.status}
                          </span>
                        )}
                      </td>
                      <td data-label="Priority">
                        <PriorityBadge priority={o.priority} />
                      </td>
                      <td data-label="Planned">
                        {o.plannedStart || o.plannedEnd ? `${fmtDate(o.plannedStart)} – ${fmtDate(o.plannedEnd)}` : "—"}
                      </td>
                      <td className="col-actions" data-label="">
                        <div className="po-actions">
                          {o.nextAction === "PLAN" ? (
                            <button type="button" className="po-btn po-btn-sm po-btn-primary" onClick={() => handlePrimary(o)}>
                              {o.planningStatus === "DRAFT" ? "Continue" : "Plan"}
                            </button>
                          ) : (
                            <button type="button" className="po-icon-btn" title="View" aria-label="View" onClick={() => handlePrimary(o)}>
                              <Eye size={15} />
                            </button>
                          )}
                          {["PLANNED", "IN_PROGRESS"].includes(o.status) && (
                            <button
                              type="button"
                              className="po-icon-btn"
                              title="Revise plan"
                              aria-label="Revise plan"
                              onClick={() =>
                                navigate("/production/planning", { state: { jobNo: o.jobNo || o.jobOrderNo, productionOrderId: rowId(o) } })
                              }
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {can.hold && (
                            <button
                              type="button"
                              className="po-icon-btn"
                              title="Put on hold"
                              aria-label="Put on hold"
                              onClick={() => openAction(o, "HOLD")}
                            >
                              <Pause size={14} />
                            </button>
                          )}
                          {can.resume && (
                            <button
                              type="button"
                              className="po-icon-btn"
                              title="Resume"
                              aria-label="Resume"
                              onClick={() => openAction(o, "RESUME")}
                            >
                              <Play size={14} />
                            </button>
                          )}
                          {can.cancel && (
                            <button
                              type="button"
                              className="po-icon-btn po-icon-btn--danger"
                              title="Cancel order"
                              aria-label="Cancel order"
                              onClick={() => openAction(o, "CANCEL")}
                            >
                              <Ban size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          variant="compact"
          currentPage={currentPage}
          totalItems={total}
          itemsPerPage={rowsPerPage}
          onPageChange={(n) => setPage(Math.min(Math.max(1, n), totalPages))}
          onItemsPerPageChange={(n) => setRowsPerPage(n)}
          pageSizeOptions={[5, 10, 20, 25, 50, 100]}
          itemLabel="records"
        />
      </section>

      {actionType && selectedOrder && (
        <ProductionOrderActionsModal
          isOpen={true}
          actionType={actionType}
          productionOrder={selectedOrder}
          onClose={() => {
            setActionType(null);
            setSelectedOrder(null);
          }}
          onSuccess={refreshAll}
        />
      )}

      {detailsId && <OrderDetailsModal orderId={detailsId} onClose={() => setDetailsId(null)} />}
    </div>
  );
}