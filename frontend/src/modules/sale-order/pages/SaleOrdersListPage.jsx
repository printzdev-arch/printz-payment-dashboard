import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Eye, FilePen, FileText, Hourglass, PackageCheck, Palette, Plus, Search, ShoppingBag } from "lucide-react";
import saleOrderApi from "../api/saleOrderApi";

import DataTable from "../../../shared/ui/DataTable/DataTable";
import SaleOrderInvoiceModal from "../components/common/SaleOrderInvoiceModal";
import { OrderStatusBadge, PriorityTag } from "../components/common/OrderStatusBadge";
import { LIST_STATUS_FILTERS } from "../utils/saleOrderStatus";
import { errorMessage, formatDate, formatMoney } from "../utils/format";
import BranchSelect from "../../../shared/ui/selects/BranchSelect";
import { DateField } from "../../../shared/ui/selects/CalendarSelect";
import SelectField from "../../../shared/ui/selects/SelectField";
import "../styles/sale-order.css";
import canDo from "../../../shared/utils/permissions";

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
            <BranchSelect
              valueKey="id"
              allowAll
              allOptionLabel="All Branches"
              allOptionValue=""
              branches={branches}
              value={branchId}
              onChange={(e) => resetPage(setBranchId)(e.target.value)}
              style={{ minWidth: "200px" }}
            />
          )}
          {canDo("sale-orders", "create") && (
            <button type="button" className="btn-printz-primary so-btn primary" onClick={() => navigate("/sale-orders/new")}>
              <Plus size={16} /> New Sale Order
            </button>
          )}
        </div>
      </div>


      <div className="so-filters">
        <SelectField
          searchable={false}
          value={status}
          onChange={(e) => resetPage(setStatus)(e.target.value)}
          options={[
            ...LIST_STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label })),
            ...(status === IN_PROGRESS ? [{ value: IN_PROGRESS, label: "With the Design Team" }] : []),
            ...(status === APPROVED_ONWARDS ? [{ value: APPROVED_ONWARDS, label: "Approved & Beyond" }] : []),
          ]}
        />
        <SelectField
          searchable={false}
          value={priority}
          onChange={(e) => resetPage(setPriority)(e.target.value)}
          options={[
            { value: "", label: "All Priority" },
            { value: "URGENT", label: "Urgent" },
            { value: "NORMAL", label: "Normal" },
          ]}
        />
        <DateField title="From date" placeholder="From date" value={fromDate} onChange={(e) => resetPage(setFromDate)(e.target.value)} />
        <DateField title="To date" placeholder="To date" value={toDate} onChange={(e) => resetPage(setToDate)(e.target.value)} />
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
        <DataTable
          mobileCards
          searchable={false}
          loading={loading}
          data={rows}
          onRowClick={(o) => navigate(`/sale-orders/${o._id}`)}
          emptyMessage={
            <div className="so-empty">
              <ShoppingBag size={34} />
              <strong>No sale orders found</strong>
              {status || priority || search || fromDate || toDate
                ? "Try changing or clearing the filters."
                : "Create your first sale order to get started."}
            </div>
          }
          serverPagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}
          columns={[
            { key: "sno", label: "#", width: "44px", className: "printz-cell-hide-mobile", render: (o, i) => i + 1 },
            {
              key: "orderNo",
              label: "Order No.",
              className: "printz-cell-lead",
              render: (o) => <span className="strong">{o.status === "DRAFT" ? "Draft" : o.orderNo}</span>,
            },
            {
              key: "customer",
              label: "Customer",
              render: (o) => (
                <>
                  <span className="strong">{o.customerSnapshot?.name || "—"}</span>
                  <div className="muted">{o.customerSnapshot?.mobile}</div>
                </>
              ),
            },
            {
              key: "expectedDeliveryDate",
              label: "Deliver By",
              render: (o) => formatDate(o.expectedDeliveryDate),
            },
            { key: "priority", label: "Priority", render: (o) => <PriorityTag priority={o.priority} /> },
            {
              key: "grandTotal",
              label: "Total",
              align: "right",
              render: (o) => <span className="strong">{formatMoney(o.grandTotal)}</span>,
            },
            {
              key: "balanceDue",
              label: "Balance",
              align: "right",
              render: (o) => (
                <span style={{ color: Number(o.balanceDue) > 0 ? "#b45309" : "#15803d", fontWeight: 600 }}>
                  {formatMoney(o.balanceDue)}
                </span>
              ),
            },
            {
              key: "designer",
              label: "Designer",
              render: (o) => o.currentAssignment?.designerName || <span className="muted">—</span>,
            },
            { key: "status", label: "Status", render: (o) => <OrderStatusBadge status={o.status} /> },
            {
              key: "actions",
              label: "Actions",
              align: "right",
              className: "printz-cell-actions",
              render: (o) => (
                <div
                  style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}
                  onClick={(e) => e.stopPropagation()}
                >
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
              ),
            },
          ]}
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
