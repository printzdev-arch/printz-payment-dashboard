import React, { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, Undo2, X } from "lucide-react";
import { toast } from "react-toastify";
import DataTable from "../../../../shared/ui/DataTable/DataTable";
import StyledSelect from "../../../../shared/ui/selects/StyledSelect";
import { isAdminUser } from "../../../../shared/utils/deleteRequest";
import {
  approveDeleteRequest,
  cancelDeleteRequest,
  getDeleteRequestTypes,
  listDeleteRequests,
  rejectDeleteRequest,
} from "../../api/deleteRequestsApi";
import "../../../hr/employees/styles/employees.css";

/**
 * Delete Requests: a manager's delete waits here until an admin approves it.
 * Admins see every request and can approve (the record is deleted) or reject (it is kept).
 * Everyone else sees their own requests and can withdraw one that is still waiting.
 */

const STATUS_LABEL = { PENDING: "Waiting", PROCESSING: "Working", APPROVED: "Approved", REJECTED: "Rejected", CANCELLED: "Withdrawn" };
const STATUS_CLASS = { PENDING: "emp-badge-left", PROCESSING: "emp-badge-left", APPROVED: "emp-badge-active", REJECTED: "emp-badge-inactive", CANCELLED: "emp-badge-inactive" };

const errorMessage = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const when = (v) =>
  v ? new Date(v).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function DeleteRequests() {
  const admin = isAdminUser();
  const [filters, setFilters] = useState({ status: "PENDING", resourceType: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(0);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    getDeleteRequestTypes().then(setTypes).catch(() => setTypes([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listDeleteRequests({ page, limit: pageSize, status: filters.status, resourceType: filters.resourceType });
      setRows(result.items || []);
      setTotal(result.total || 0);
      setPending(result.pending || 0);
    } catch (e) {
      setRows([]);
      setTotal(0);
      toast.error(errorMessage(e, "Could not load delete requests."));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const changeFilter = (key) => (e) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
    setPage(1);
  };

  const run = async (row, action) => {
    setBusyId(row._id);
    try {
      await action();
      await load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not complete that."));
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const approve = (row) => {
    if (!window.confirm(`Approve and delete "${row.resourceLabel}"?\nThis removes the record permanently.`)) return;
    const note = window.prompt("Note for the requester (optional):") || "";
    run(row, async () => {
      await approveDeleteRequest(row._id, note);
      toast.success(`"${row.resourceLabel}" was deleted.`);
    });
  };

  const reject = (row) => {
    const note = window.prompt(`Why is the delete of "${row.resourceLabel}" being rejected? (optional)`);
    if (note === null) return;
    run(row, async () => {
      await rejectDeleteRequest(row._id, note);
      toast.info("Request rejected. The record was kept.");
    });
  };

  const withdraw = (row) => {
    if (!window.confirm("Withdraw this delete request?")) return;
    run(row, async () => {
      await cancelDeleteRequest(row._id);
      toast.info("Request withdrawn.");
    });
  };

  return (
    <div className="emp-page">
      <div className="emp-header">
        <div>
          <h1>Delete Requests</h1>
        </div>
        {admin && pending > 0 && filters.status !== "PENDING" && <span className="emp-badge emp-badge-left">{pending} waiting</span>}
      </div>

      <div className="emp-card">
        <DataTable
          className="dr-table"
          mobileCards
          searchable={false}
          loading={loading}
          data={rows}
          emptyMessage="No delete requests."
          serverPagination={{
            page,
            pageSize,
            total,
            onPageChange: (n) => setPage(Math.max(1, n)),
            onPageSizeChange: (n) => {
              setPageSize(n);
              setPage(1);
            },
          }}
          filterComponent={
            <div className="dr-filters">
              <StyledSelect searchable={false} style={{ width: "170px" }} value={filters.status} onChange={changeFilter("status")}>
                <option value="PENDING">Waiting</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Withdrawn</option>
                <option value="">All statuses</option>
              </StyledSelect>
              <StyledSelect searchable={false} style={{ width: "200px" }} value={filters.resourceType} onChange={changeFilter("resourceType")}>
                <option value="">All record types</option>
                {types.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </StyledSelect>
              <button type="button" className="dr-refresh" onClick={load} disabled={loading} title="Refresh" aria-label="Refresh">
                <RefreshCw size={15} className={loading ? "spin" : ""} />
              </button>
            </div>
          }
          columns={[
            { key: "requestedAt", label: "Requested", render: (r) => when(r.requestedAt) },
            {
              key: "resourceLabel",
              label: "Record",
              render: (r) => (
                <>
                  <div className="emp-cell-name">{r.resourceLabel || "—"}</div>
                  <div className="emp-cell-sub">{r.resourceTypeLabel}</div>
                </>
              ),
            },
            { key: "branchName", label: "Branch", render: (r) => r.branchName || "—" },
            { key: "requestedByName", label: "Requested by", render: (r) => r.requestedByName || "—" },
            {
              key: "reason",
              label: "Reason",
              render: (r) => (
                <div style={{ maxWidth: 280, whiteSpace: "normal" }}>
                  {r.reason}
                  {r.decisionNote ? <div className="emp-cell-sub">Admin: {r.decisionNote}</div> : null}
                  {r.executionError ? <div className="emp-error">Could not delete: {r.executionError}</div> : null}
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <>
                  <span className={`emp-badge ${STATUS_CLASS[r.status] || "emp-badge-inactive"}`}>{STATUS_LABEL[r.status] || r.status}</span>
                  {r.decidedByName && r.status !== "PENDING" ? <div className="emp-cell-sub">{r.decidedByName}</div> : null}
                </>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              align: "right",
              render: (r) => (
                <div className="emp-actions">
                  {r.status === "PENDING" && admin && (
                    <>
                      <button type="button" className="emp-btn emp-btn-icon emp-btn-danger" title="Approve and delete" aria-label="Approve and delete" disabled={busyId === r._id} onClick={() => approve(r)}>
                        <Check size={15} />
                      </button>
                      <button type="button" className="emp-btn emp-btn-icon" title="Reject and keep the record" aria-label="Reject" disabled={busyId === r._id} onClick={() => reject(r)}>
                        <X size={15} />
                      </button>
                    </>
                  )}
                  {r.status === "PENDING" && !admin && (
                    <button type="button" className="emp-btn emp-btn-icon" title="Withdraw this request" aria-label="Withdraw" disabled={busyId === r._id} onClick={() => withdraw(r)}>
                      <Undo2 size={15} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
