import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Clock, Eye, FilePen, FileText, Hourglass, PackageCheck, Palette, Plus, Search, ShoppingBag } from "lucide-react";
import saleOrderApi from "../api/saleOrderApi";
import KpiCard from "../components/common/KpiCard";
import Pagination from "../components/common/Pagination";
import SaleOrderInvoiceModal from "../components/common/SaleOrderInvoiceModal";
import { OrderStatusBadge, PriorityTag } from "../components/common/OrderStatusBadge";
import { LIST_STATUS_FILTERS } from "../utils/saleOrderStatus";
import { errorMessage, formatDate, formatMoney } from "../utils/format";
import "../styles/sale-order.css";

const IN_PROGRESS = "PLACED,WAITING_FOR_DESIGNER,ASSIGNED,IN_DESIGN,CHANGES_REQUESTED";
const APPROVED_ONWARDS = "APPROVED,PRINTING,DISPATCHED,RECEIVED_AT_BRANCH,DELIVERED";

export default function SaleOrdersListPage() {
  const navigate = useNavigate();
  const scope = useMemo(() => saleOrderApi.getUserScope(), []);

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(scope.branchId);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [kpis, setKpis] = useState({ total: 0, draft: 0, inProgress: 0, awaiting: 0, approved: 0 });
  const [invoiceModalOrder, setInvoiceModalOrder] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    if (scope.isAdmin) saleOrderApi.getBranches().then(setBranches);
  }, [scope.isAdmin]);

  // Debounce the search box so we do not call the server on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = { page, limit: pageSize };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (search) params.search = search;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (branchId) params.branchId = branchId;
      const res = await saleOrderApi.list(params);
      setRows(Array.isArray(res?.data) ? res.data : []);
      setTotal(Number(res?.meta?.total ?? res?.total ?? 0));
    } catch (err) {
      setError(errorMessage(err, "Could not load sale orders."));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, priority, search, fromDate, toDate, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  // Summary cards follow the branch selection only (not the table filters)
  useEffect(() => {
    const base = branchId ? { branchId } : {};
    Promise.all([
      saleOrderApi.count(base),
      saleOrderApi.count({ ...base, status: "DRAFT" }),
      saleOrderApi.count({ ...base, status: IN_PROGRESS }),
      saleOrderApi.count({ ...base, status: "SENT_FOR_APPROVAL" }),
      saleOrderApi.count({ ...base, status: APPROVED_ONWARDS }),
    ])
      .then(([t, d, p, a, ap]) => setKpis({ total: t, draft: d, inProgress: p, awaiting: a, approved: ap }))
      .catch(() => {});
  }, [branchId]);

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="so-page">
      <div className="so-header">
        <div className="so-title">
          <h1>Sale Order Details</h1>
         
        </div>
        <div className="so-header-actions">
          {scope.isAdmin && (
            <select className="so-pill-select" value={branchId} onChange={(e) => resetPage(setBranchId)(e.target.value)}>
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          )}
          <button type="button" className="btn-printz-primary so-btn primary" onClick={() => navigate("/sale-orders/new")}>
            <Plus size={16} /> New Sale Order
          </button>
        </div>
      </div>

      <div className="so-kpi-grid printz-kpi-grid">
        <KpiCard
          icon={ClipboardList}
          tone="green"
          value={kpis.total}
          label="Total Orders"
          active={!status}
          onClick={() => resetPage(setStatus)("")}
        />
        <KpiCard
          icon={FilePen}
          tone="blue"
          value={kpis.draft}
          label="Drafts"
          active={status === "DRAFT"}
          onClick={() => resetPage(setStatus)(status === "DRAFT" ? "" : "DRAFT")}
        />
        <KpiCard
          icon={Palette}
          tone="purple"
          value={kpis.inProgress}
          label="With the Design Team"
          active={status === IN_PROGRESS}
          onClick={() => resetPage(setStatus)(status === IN_PROGRESS ? "" : IN_PROGRESS)}
        />
        <KpiCard
          icon={Hourglass}
          tone="amber"
          value={kpis.awaiting}
          label="Awaiting Customer"
          active={status === "SENT_FOR_APPROVAL"}
          onClick={() => resetPage(setStatus)(status === "SENT_FOR_APPROVAL" ? "" : "SENT_FOR_APPROVAL")}
        />
        <KpiCard
          icon={PackageCheck}
          tone="teal"
          value={kpis.approved}
          label="Approved & Beyond"
          active={status === APPROVED_ONWARDS}
          onClick={() => resetPage(setStatus)(status === APPROVED_ONWARDS ? "" : APPROVED_ONWARDS)}
        />
      </div>

      <div className="so-filters">
        <select className="so-select" value={status} onChange={(e) => resetPage(setStatus)(e.target.value)}>
          {LIST_STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
          {status === IN_PROGRESS && <option value={IN_PROGRESS}>With the Design Team</option>}
          {status === APPROVED_ONWARDS && <option value={APPROVED_ONWARDS}>Approved & Beyond</option>}
        </select>
        <select className="so-select" value={priority} onChange={(e) => resetPage(setPriority)(e.target.value)}>
          <option value="">All Priority</option>
          <option value="URGENT">Urgent</option>
          <option value="NORMAL">Normal</option>
        </select>
        <input type="date" className="so-input date" title="From date" value={fromDate} onChange={(e) => resetPage(setFromDate)(e.target.value)} />
        <input type="date" className="so-input date" title="To date" value={toDate} onChange={(e) => resetPage(setToDate)(e.target.value)} />
        <div className="so-search">
          <Search size={16} />
          <input
            className="so-input"
            placeholder="Search by order no., customer name or mobile..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="so-card spaced">
        {error && <div className="so-error-bar">{error}</div>}
        <div className="so-table-wrap">
          <table className="so-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th>Order No.</th>
                <th>Customer</th>
                <th>Deliver By</th>
                <th>Priority</th>
                <th className="right">Total</th>
                <th className="right">Balance</th>
                <th>Designer</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="so-loading">Loading sale orders...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="so-empty">
                      <ShoppingBag size={34} />
                      <strong>No sale orders found</strong>
                      {status || priority || search || fromDate || toDate
                        ? "Try changing or clearing the filters."
                        : "Create your first sale order to get started."}
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((o, i) => (
                  <tr key={o._id} className="clickable" onClick={() => navigate(`/sale-orders/${o._id}`)}>
                    <td>{(page - 1) * pageSize + i + 1}</td>
                    <td>
                      <span className="strong">{o.status === "DRAFT" ? "Draft" : o.orderNo}</span>
                    </td>
                    <td>
                      <span className="strong">{o.customerSnapshot?.name || "—"}</span>
                      <div className="muted">{o.customerSnapshot?.mobile}</div>
                    </td>
                    <td>
                      <Clock size={12} style={{ verticalAlign: "-1px", color: "#94a3b8" }} /> {formatDate(o.expectedDeliveryDate)}
                    </td>
                    <td><PriorityTag priority={o.priority} /></td>
                    <td className="right strong">{formatMoney(o.grandTotal)}</td>
                    <td className="right" style={{ color: Number(o.balanceDue) > 0 ? "#b45309" : "#15803d", fontWeight: 600 }}>
                      {formatMoney(o.balanceDue)}
                    </td>
                    <td>{o.currentAssignment?.designerName || <span className="muted">—</span>}</td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td className="right" onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                        {/* 1. View Order Details (Eye Icon) */}
                        <button
                          type="button"
                          className="so-icon-btn"
                          title="View Order Details"
                          onClick={() => navigate(`/sale-orders/${o._id}`)}
                        >
                          <Eye size={16} />
                        </button>

                        {/* 2. View Invoice (Invoice Icon) */}
                        <button
                          type="button"
                          className="so-icon-btn"
                          title={o.status === "DRAFT" ? "Invoice not available for draft" : "View Invoice"}
                          disabled={o.status === "DRAFT"}
                          onClick={() => {
                            if (o.status !== "DRAFT") {
                              setInvoiceModalOrder(o);
                              setShowInvoiceModal(true);
                            }
                          }}
                          style={{
                            color: o.status === "DRAFT" ? "#cbd5e1" : "#0284c7",
                            cursor: o.status === "DRAFT" ? "not-allowed" : "pointer",
                          }}
                        >
                          <FileText size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </div>

      <SaleOrderInvoiceModal
        isOpen={showInvoiceModal}
        order={invoiceModalOrder}
        onClose={() => {
          setShowInvoiceModal(false);
          setInvoiceModalOrder(null);
        }}
      />
    </div>
  );
}
