import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, PackageSearch, Search } from "lucide-react";
import saleOrderApi from "../../sale-order/api/saleOrderApi";
import Pagination from "../../sale-order/components/common/Pagination";
import { OrderStatusBadge, PriorityTag } from "../../sale-order/components/common/OrderStatusBadge";
import { errorMessage, formatDate } from "../../sale-order/utils/format";
import { getMfgRole } from "../utils/mfgRole";
import "../../sale-order/styles/sale-order.css";
import "../styles/mfg-unit.css";

// Drafts belong to the branch; the unit only sees orders from "placed" onwards
const UNIT_STATUSES =
  "PLACED,WAITING_FOR_DESIGNER,ASSIGNED,IN_DESIGN,SENT_FOR_APPROVAL,CHANGES_REQUESTED,APPROVED,PRINTING,DISPATCHED,RECEIVED_AT_BRANCH,DELIVERED,CANCELLED";

const FILTERS = [
  { value: "", label: "All Status" },
  { value: "PLACED,WAITING_FOR_DESIGNER", label: "Waiting for Designer" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_DESIGN,CHANGES_REQUESTED", label: "In Design" },
  { value: "SENT_FOR_APPROVAL", label: "Awaiting Customer" },
  { value: "APPROVED", label: "Approved" },
  { value: "PRINTING,DISPATCHED,RECEIVED_AT_BRANCH,DELIVERED", label: "Production & Beyond" },
];

export default function MfgOrdersPage() {
  const navigate = useNavigate();
  const me = useMemo(() => getMfgRole(), []);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const res = await saleOrderApi.list({ page, limit: pageSize, status: status || UNIT_STATUSES, search: search || undefined });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setTotal(Number(res?.meta?.total ?? res?.total ?? 0));
    } catch (err) {
      setError(errorMessage(err, "Could not load orders."));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="so-page">
      <div className="so-header">
        <div className="so-title">
          <h1>{me.isManager ? "All Orders" : "My Orders"}</h1>
          <p>{me.isManager ? "Every order sent to your manufacturing unit" : "Orders assigned to you"}</p>
        </div>
      </div>

      <div className="so-filters">
        <select className="so-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <div className="so-search">
          <Search size={16} />
          <input className="so-input" placeholder="Search by order no. or customer..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
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
                {me.isManager && <th>Designer</th>}
                <th>Design</th>
                <th>Status</th>
                <th className="right">Open</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="so-loading">Loading orders...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="so-empty">
                      <PackageSearch size={34} />
                      <strong>No orders found</strong>
                      {status || search ? "Try changing or clearing the filters." : "Orders will appear here once the branches place them."}
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((o, i) => (
                  <tr key={o._id} className="clickable" onClick={() => navigate(`/mfg/orders/${o._id}`)}>
                    <td>{(page - 1) * pageSize + i + 1}</td>
                    <td className="strong">{o.orderNo}</td>
                    <td>{o.customerSnapshot?.name}<div className="muted">{o.customerSnapshot?.mobile}</div></td>
                    <td>{formatDate(o.expectedDeliveryDate)}</td>
                    <td><PriorityTag priority={o.priority} /></td>
                    {me.isManager && <td>{o.currentAssignment?.designerName || <span className="muted">Not assigned</span>}</td>}
                    <td>{o.currentDesignVersion ? `v${o.currentDesignVersion}` : <span className="muted">—</span>}</td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td className="right"><button type="button" className="so-icon-btn" title="Open order"><Eye size={16} /></button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
      </div>
    </div>
  );
}
