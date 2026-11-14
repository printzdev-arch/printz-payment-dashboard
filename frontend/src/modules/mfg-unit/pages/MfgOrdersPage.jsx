import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, PackageSearch, Search } from "lucide-react";
import saleOrderApi from "../../sale-order/api/saleOrderApi";
import DataTable from "../../../shared/ui/DataTable/DataTable";
import PageBanner from "../components/PageBanner";
import { PriorityTag } from "../../sale-order/components/common/OrderStatusBadge";
import { errorMessage, formatDate } from "../../sale-order/utils/format";
import { stageInfo, takenByLabel } from "../utils/mfgStages";
import "../../sale-order/styles/sale-order.css";
import "../styles/mfg-unit.css";

// Drafts never reach the unit, so they are left out of "All"
const ALL_UNIT_STATUSES =
  "PLACED,WAITING_FOR_DESIGNER,ASSIGNED,IN_DESIGN,SENT_FOR_APPROVAL,CHANGES_REQUESTED,APPROVED,PRINTING,DISPATCHED,RECEIVED_AT_BRANCH,DELIVERED,CANCELLED";

const FILTERS = [
  { value: "", label: "All Orders" },
  { value: "PLACED,WAITING_FOR_DESIGNER,ASSIGNED", label: "In Queue" },
  { value: "IN_DESIGN,CHANGES_REQUESTED", label: "In Design" },
  { value: "SENT_FOR_APPROVAL", label: "Awaiting Customer" },
  { value: "APPROVED", label: "Ready to Print" },
  { value: "PRINTING", label: "Printing / Ready to Dispatch" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "RECEIVED_AT_BRANCH,DELIVERED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];


// Every order sent to the unit. Open one to do whatever its next step is.
export default function MfgOrdersPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialStatus = FILTERS.some((f) => f.value === params.get("status")) ? params.get("status") : "";
  const [status, setStatus] = useState(initialStatus);
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
      const res = await saleOrderApi.list({ page, limit: pageSize, status: status || ALL_UNIT_STATUSES, search: search || undefined });
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
      <PageBanner title="Manufacturing" highlight="Orders" subtitle="Every order sent to the manufacturing unit, its current stage and who took it." />

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
        <DataTable
          searchable={false}
          loading={loading}
          data={rows}
          onRowClick={(o) => navigate(`/mfg/orders/${o._id}`)}
          emptyMessage={
            <div className="so-empty">
              <PackageSearch size={34} />
              <strong>No orders found</strong>
              {status || search ? "Try changing or clearing the filters." : "Orders will appear here once the branches place them."}
            </div>
          }
          serverPagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}
          columns={[
            { key: "sno", label: "#", width: "44px", render: (o, i) => i + 1 },
            { key: "orderNo", label: "Order No.", render: (o) => <span className="strong">{o.orderNo}</span> },
            {
              key: "customer",
              label: "Customer",
              render: (o) => (
                <>
                  {o.customerSnapshot?.name}
                  <div className="muted">{o.customerSnapshot?.mobile}</div>
                </>
              ),
            },
            { key: "expectedDeliveryDate", label: "Deliver By", render: (o) => formatDate(o.expectedDeliveryDate) },
            { key: "priority", label: "Priority", render: (o) => <PriorityTag priority={o.priority} /> },
            { key: "takenBy", label: "Taken By", render: (o) => takenByLabel(o) || <span className="muted">Not taken</span> },
            {
              key: "design",
              label: "Design",
              render: (o) => (o.currentDesignVersion ? `v${o.currentDesignVersion}` : <span className="muted">—</span>),
            },
            {
              key: "stage",
              label: "Current Stage",
              render: (o) => <span className={`so-badge ${stageInfo(o).tone}`}>{stageInfo(o).label}</span>,
            },
            {
              key: "open",
              label: "Open",
              align: "right",
              render: () => (
                <button type="button" className="so-icon-btn" title="Open order">
                  <Eye size={16} />
                </button>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
