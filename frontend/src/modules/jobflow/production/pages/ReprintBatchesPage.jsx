import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Printer,
  RefreshCw,
  Search,
  Eye,
  RotateCcw,
  Play,
  Pause,
  Check,
  XCircle,
  SkipForward,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import productionApi from "../api/productionApi";
import ReprintDecisionModal from "../components/ReprintDecisionModal";
import OperationStartModal from "../components/OperationStartModal";
import OperationCompleteModal from "../components/OperationCompleteModal";
import OperationFailModal from "../components/OperationFailModal";
import OperationSkipModal from "../components/OperationSkipModal";
import OperationPauseModal from "../components/OperationPauseModal";
import "../styles/reprint-batches.css";
import "../styles/production-theme.css";

import DataTable from "../../../../shared/ui/DataTable/DataTable";
import StyledSelect from "../../../../shared/ui/selects/StyledSelect";
/* ────────────────────────────────────────────────────────────────────────── */
/* Constants and helpers                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 10;

const REPRINT_STATUS_LABEL = {
  REQUESTED: "Pending Approval",
  APPROVED: "Approved",
  IN_PRODUCTION: "In Production",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

const REWORK_STATUS_LABEL = {
  READY: "Ready",
  BLOCKED: "Waiting",
  IN_PROGRESS: "In Progress",
  PAUSED: "Paused",
  ON_HOLD: "On Hold",
  FAILED: "Failed",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
};

const OP_STATUS_LABEL = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  RUNNING: "In Progress",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  FAILED: "Failed",
  SKIPPED: "Skipped",
};

const num = (n) => (n === undefined || n === null ? "—" : Number(n).toLocaleString("en-US"));

const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt)
    ? "—"
    : dt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const errorMessage = (err, fallback) => {
  const d = err?.response?.data;
  const details = Array.isArray(d?.details) ? d.details.map((x) => x?.message).filter(Boolean).join(" ") : "";
  return details || d?.message || err?.message || fallback;
};

const titleCase = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

const isEssential = (row) => /PRINT|PACK/i.test(row?.operationCode || "");

// Props the operation modals expect
const modalOperation = (row) => ({ ...row, operatorName: row.operator });
const modalOrder = (row) => ({ jobNo: row.jobNo, plannedQty: row.plannedQty });

function Pill({ tone, children }) {
  return <span className={`status-pill rb-pill rb-${tone}`}>{children}</span>;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Reprint details                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function ReprintDetailsModal({ request, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const id = request._id || request.id;

  useEffect(() => {
    let alive = true;
    productionApi
      .getReprintRequestById(id)
      .then((res) => alive && setDetail(res?.data || res))
      .catch((e) => alive && setError(errorMessage(e, "Could not load the full history.")));
    return () => {
      alive = false;
    };
  }, [id]);

  const r = detail?.reprintRequest || request;
  const cycles = detail?.cycles || [];
  const history = (detail?.history || []).filter((h) => String(h._id) !== String(id));

  return (
    <div className="jf-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="jf-modal rb-modal">
        <div className="jf-modal-header">
          <div>
            <h3 className="jf-modal-title">{request.requestNo || "Reprint Request"}</h3>
            <span className="rb-muted">
              {request.jobNo || "—"} · {request.customerName || "—"} · {request.productName || "—"}
            </span>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm rb-btn-close-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="jf-modal-body rb-modal-body">
          <div className="rb-facts">
            <div>
              <span>Status</span>
              <Pill tone={String(request.status).toLowerCase()}>{REPRINT_STATUS_LABEL[request.status] || request.status}</Pill>
            </div>
            <div>
              <span>Reprint Qty</span>
              <strong>{num(request.requestedQty ?? r.quantity)}</strong>
            </div>
            <div>
              <span>Job Order No</span>
              <strong>{request.jobNo || "—"}</strong>
            </div>
            <div>
              <span>Restart From</span>
              <strong>{r.restartFromOperationCode || "PRINT"}</strong>
            </div>
            <div>
              <span>Source Stage</span>
              <strong>{r.sourceStage || "QC"}</strong>
            </div>
            <div>
              <span>Cycle</span>
              <strong>R{r.cycleNo ?? request.cycleNo ?? "—"}</strong>
            </div>
            <div>
              <span>Requested By</span>
              <strong>{request.requestedByName || r.requestedBy?.name || "—"}</strong>
            </div>
            <div>
              <span>Requested On</span>
              <strong>{fmtDateTime(r.createdAt || request.createdAt)}</strong>
            </div>
            {r.approvedAt && (
              <div>
                <span>Approved On</span>
                <strong>{fmtDateTime(r.approvedAt)}</strong>
              </div>
            )}
            {r.markAsUrgent && (
              <div>
                <span>Priority</span>
                <strong>Urgent</strong>
              </div>
            )}
          </div>

          <div className="rb-block">
            <span className="rb-label">Reason</span>
            <p>{r.reason || request.reason || "—"}</p>
            {(r.defectType || request.defectType) && <p className="rb-muted">Defect type: {r.defectType || request.defectType}</p>}
            {r.details && <p className="rb-muted">{r.details}</p>}
          </div>

          {r.managerComments && (
            <div className="rb-block">
              <span className="rb-label">Manager Comments</span>
              <p>{r.managerComments}</p>
            </div>
          )}
          {r.rejectionReason && (
            <div className="rb-note rb-note--danger">Rejected: {r.rejectionReason}</div>
          )}

          {error && <div className="rb-note rb-note--danger">{error}</div>}
          {!detail && !error && <div className="rb-muted">Loading production cycles…</div>}

          {cycles.length > 0 && (
            <>
              <h4 className="rb-section">Production Cycles</h4>
              {cycles.map((c) => (
                <div key={`${c.cycleType}-${c.cycleNo}`} className="rb-cycle">
                  <div className="rb-cycle-head">
                    <strong>{c.title}</strong>
                    <span className="rb-muted">
                      {c.productionOrder?.jobNo || c.productionOrder?.jobOrderNo || "Cycle Active"} · {c.status}
                    </span>
                  </div>
                  <div className="rb-ops">
                    {(c.operations || []).map((op, i) => (
                      <span key={op._id || i} className={`rb-op rb-op--${String(op.status || "PENDING").toLowerCase()}`}>
                        {op.sequenceNo}. {op.operationName || op.operationCode} · {OP_STATUS_LABEL[op.status] || op.status}
                      </span>
                    ))}
                  </div>
                  {c.qc && (
                    <div className="rb-muted">
                      QC: {c.qc.result} — accepted {num(c.qc.acceptedQty)}, rejected {num(c.qc.rejectedQty)}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {history.length > 0 && (
            <>
              <h4 className="rb-section">Other Reprint Requests for this Job</h4>
              <ul className="rb-list">
                {history.map((h) => (
                  <li key={h._id}>
                    <strong>{h.requestNo}</strong> · {num(h.quantity)} pcs · {REPRINT_STATUS_LABEL[h.status] || h.status}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="jf-modal-footer">
          <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Reprint tab                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

function ReprintTab({ onChanged }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [details, setDetails] = useState(null);
  const [decision, setDecision] = useState(null); // { request, type }

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: pageSize };
      if (debounced) params.search = debounced;
      if (status !== "ALL") params.status = status;
      const res = await productionApi.getReprintRequests(params);
      const list = Array.isArray(res?.data) ? res.data : res?.items || [];
      setRows(list);
      setTotal(res?.total ?? res?.meta?.total ?? list.length);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(errorMessage(e, "Could not load reprint requests."));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debounced, status]);

  useEffect(() => {
    load();
  }, [load]);

  const afterDecision = () => {
    load();
    if (onChanged) onChanged();
  };

  return (
    <>
      <div className="jf-card rb-filter-card">
        <div className="rb-filter-row">
          <div className="rb-search">
            <Search size={16} />
            <input
              type="text"
              className="jf-input"
              placeholder="Search request #, job #, customer, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <StyledSelect
            className="jf-input jf-input-sm rb-select-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Statuses</option>
            {Object.entries(REPRINT_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </StyledSelect>

          {(search || status !== "ALL") && (
            <button
              type="button"
              className="jf-btn jf-btn-secondary jf-btn-sm"
              onClick={() => {
                setSearch("");
                setDebounced("");
                setStatus("ALL");
                setPage(1);
              }}
            >
              Reset
            </button>
          )}
          <button
            type="button"
            className="jf-btn jf-btn-secondary rb-refresh-icon rb-refresh-end"
            title="Refresh"
            aria-label="Refresh"
            onClick={() => {
              load();
              if (onChanged) onChanged();
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <DataTable mobileCards
        searchable={false}
        loading={loading}
        data={error ? [] : rows}
        pageSizeOptions={[5, 10, 20, 25, 50, 100]}
        serverPagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}
        emptyMessage={
          error ? (
            <>
              <div>{error}</div>
              <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={load}>
                Try again
              </button>
            </>
          ) : (
            "No reprint requests found."
          )
        }
        columns={[
          { key: "requestNo", label: "Request", render: (r) => <b className="rb-request-no">{r.requestNo || "—"}</b> },
          { key: "jobNo", label: "Job NO", render: (r) => <b>{r.jobNo || "—"}</b> },
          {
            key: "customer",
            label: "Customer & Product",
            render: (r) => (
              <>
                <b>{r.customerName || "—"}</b>
                <div className="rb-muted">{r.productName || "—"}</div>
              </>
            ),
          },
          { key: "qty", label: "Reprint Qty", render: (r) => <span className="rb-qty-pill">{num(r.requestedQty ?? r.quantity)} pcs</span> },
          {
            key: "reason",
            label: "Defect Reason",
            className: "rb-col-defect",
            render: (r) => (
              <div className="rb-defect-box">
                <div>{r.reason || "QC defect recorded"}</div>
                <div className="rb-muted rb-defect-subtitle">
                  {r.defectType ? `${r.defectType} · ` : ""}Restart: {r.restartFromOperationCode || "PRINT"}
                </div>
              </div>
            ),
          },
          { key: "requestedByName", label: "Requested By", render: (r) => r.requestedByName || "—" },
          { key: "createdAt", label: "Requested On", render: (r) => fmtDateTime(r.createdAt) },
          {
            key: "status",
            label: "Status",
            render: (r) => <Pill tone={String(r.status).toLowerCase()}>{REPRINT_STATUS_LABEL[r.status] || r.status}</Pill>,
          },
          {
            key: "actions",
            label: "Actions",
            render: (r) => (
              <div className="rb-actions-group">
                {r.status === "REQUESTED" && (
                  <>
                    <button type="button" className="btn btn-small btn-success" onClick={() => setDecision({ request: r, type: "APPROVE" })}>
                      Approve
                    </button>
                    <button type="button" className="btn btn-small btn-danger" onClick={() => setDecision({ request: r, type: "REJECT" })}>
                      Reject
                    </button>
                  </>
                )}
                <button type="button" className="btn btn-small btn-secondary" onClick={() => setDetails(r)} aria-label="View details">
                  <Eye size={13} />
                </button>
              </div>
            ),
          },
        ]}
      />

      {details && <ReprintDetailsModal request={details} onClose={() => setDetails(null)} />}

      {decision && (
        <ReprintDecisionModal
          isOpen
          actionType={decision.type}
          reprintRequest={decision.request}
          onClose={() => setDecision(null)}
          onSuccess={afterDecision}
        />
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Rework tab                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function ReworkTab({ onChanged }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [modal, setModal] = useState(null); // { type, row }
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { isRework: true, page, limit: pageSize };
      if (debounced) params.search = debounced;
      if (status !== "ALL") params.status = status;
      const res = await productionApi.getOperationQueue(params);
      const list = Array.isArray(res?.data) ? res.data : res?.items || [];
      setRows(list);
      setTotal(res?.total ?? res?.meta?.total ?? list.length);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(errorMessage(e, "Could not load rework tasks."));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debounced, status]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    load();
    if (onChanged) onChanged();
  };

  const direct = async (type, row) => {
    setBusyId(row.id);
    try {
      if (type === "RESUME") {
        await productionApi.resumeOperation(row.id);
        toast.success("Rework operation resumed.");
      } else if (type === "RETRY") {
        await productionApi.retryOperation(row.id);
        toast.success("Rework operation reset. It is back in the queue.");
      }
      refresh();
    } catch (e) {
      toast.error(errorMessage(e, "That action could not be completed."));
    } finally {
      setBusyId(null);
    }
  };

  const modalProps = modal
    ? {
        isOpen: true,
        operation: modalOperation(modal.row),
        productionOrder: modalOrder(modal.row),
        onClose: () => setModal(null),
        onSuccess: refresh,
      }
    : null;

  return (
    <>
      <div className="jf-card rb-filter-card">
        <div className="rb-filter-row">
          <div className="rb-search">
            <Search size={16} />
            <input
              type="text"
              className="jf-input"
              placeholder="Search by job #, customer, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <StyledSelect
            className="jf-input jf-input-sm rb-select-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Statuses</option>
            {["READY", "IN_PROGRESS", "PAUSED", "FAILED", "COMPLETED"].map((k) => (
              <option key={k} value={k}>
                {REWORK_STATUS_LABEL[k]}
              </option>
            ))}
          </StyledSelect>

          {(search || status !== "ALL") && (
            <button
              type="button"
              className="jf-btn jf-btn-secondary jf-btn-sm"
              onClick={() => {
                setSearch("");
                setDebounced("");
                setStatus("ALL");
                setPage(1);
              }}
            >
              Reset
            </button>
          )}
          <button
            type="button"
            className="jf-btn jf-btn-secondary rb-refresh-icon rb-refresh-end"
            title="Refresh"
            aria-label="Refresh"
            onClick={() => {
              load();
              if (onChanged) onChanged();
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <DataTable mobileCards
        searchable={false}
        loading={loading}
        data={error ? [] : rows}
        pageSizeOptions={[5, 10, 20, 25, 50, 100]}
        serverPagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}
        emptyMessage={
          error ? (
            <>
              <div>{error}</div>
              <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={load}>
                Try again
              </button>
            </>
          ) : (
            <>
              <RotateCcw size={30} className="rb-empty-icon" />
              <div className="rb-empty-title">No rework tasks</div>
              <div className="rb-muted">When QC sends an order back for rework, its tasks appear here.</div>
            </>
          )
        }
        columns={[
          { key: "jobNo", label: "Job No", render: (row) => <b>{row.jobNo || "—"}</b> },
          {
            key: "customer",
            label: "Customer & Product",
            render: (row) => (
              <>
                <b>{row.customerName || "—"}</b>
                <div className="rb-muted">{row.productName || "—"}</div>
              </>
            ),
          },
          {
            key: "operation",
            label: "Rework Operation",
            render: (row) => (
              <>
                <b>{row.operationName || row.operationCode}</b>
                <div className="rb-muted">Step #{row.sequenceNo}</div>
              </>
            ),
          },
          {
            key: "defect",
            label: "Defect / Instructions",
            className: "rb-col-defect",
            render: (row) => (
              <div className="rb-defect-box">
                <div>{row.remarks || row.failureReason || "Sent back by QC"}</div>
                {row.instructions && <div className="rb-muted rb-defect-subtitle">{row.instructions}</div>}
              </div>
            ),
          },
          { key: "plannedQty", label: "Affected Qty", render: (row) => <span className="rb-qty-pill">{num(row.plannedQty)} pcs</span> },
          {
            key: "machine",
            label: "Machine / Operator",
            render: (row) => (
              <>
                {row.machine || "—"}
                <div className="rb-muted">{row.operator || "Unassigned"}</div>
              </>
            ),
          },
          {
            key: "priority",
            label: "Priority",
            render: (row) => {
              const urgent = ["URGENT", "HIGH", "RUSH"].includes(String(row.priority || "").toUpperCase());
              return <Pill tone={urgent ? "rejected" : "completed"}>{urgent ? "Urgent" : "Normal"}</Pill>;
            },
          },
          {
            key: "status",
            label: "Status",
            render: (row) => {
              const s = row.availabilityStatus;
              return <Pill tone={`op-${String(s).toLowerCase()}`}>{REWORK_STATUS_LABEL[s] || s}</Pill>;
            },
          },
          {
            key: "action",
            label: "Action",
            render: (row) => {
              const s = row.availabilityStatus;
              const busy = busyId === row.id;
              const canSkip = !isEssential(row) && ["READY", "BLOCKED", "PAUSED", "FAILED"].includes(s);
              return (
                <div className="rb-actions-group">
                  {s === "READY" && (
                    <button type="button" className="btn btn-small btn-success" onClick={() => setModal({ type: "START", row })}>
                      <Play size={12} /> Start
                    </button>
                  )}
                  {s === "IN_PROGRESS" && (
                    <>
                      <button type="button" className="btn btn-small btn-success" onClick={() => setModal({ type: "COMPLETE", row })}>
                        <Check size={12} /> Complete
                      </button>
                      <button type="button" className="btn btn-small btn-secondary" onClick={() => setModal({ type: "PAUSE", row })}>
                        <Pause size={12} /> Pause
                      </button>
                    </>
                  )}
                  {s === "PAUSED" && (
                    <button type="button" className="btn btn-small btn-success" disabled={busy} onClick={() => direct("RESUME", row)}>
                      <Play size={12} /> Resume
                    </button>
                  )}
                  {s === "FAILED" && (
                    <button type="button" className="btn btn-small btn-success" disabled={busy} onClick={() => direct("RETRY", row)}>
                      <RotateCcw size={12} /> Retry
                    </button>
                  )}
                  {(s === "IN_PROGRESS" || s === "PAUSED") && (
                    <button type="button" className="btn btn-small btn-danger" onClick={() => setModal({ type: "FAIL", row })}>
                      <XCircle size={12} /> Fail
                    </button>
                  )}
                  {canSkip && (
                    <button type="button" className="btn btn-small btn-secondary" onClick={() => setModal({ type: "SKIP", row })}>
                      <SkipForward size={12} /> Skip
                    </button>
                  )}
                  {["COMPLETED", "SKIPPED", "BLOCKED", "ON_HOLD"].includes(s) && !canSkip && <span className="rb-muted">—</span>}
                </div>
              );
            },
          },
        ]}
      />

      {modalProps && (
        <>
          {modal.type === "START" && <OperationStartModal {...modalProps} />}
          {modal.type === "COMPLETE" && <OperationCompleteModal {...modalProps} />}
          {modal.type === "FAIL" && <OperationFailModal {...modalProps} />}
          {modal.type === "SKIP" && <OperationSkipModal {...modalProps} />}
          {modal.type === "PAUSE" && <OperationPauseModal {...modalProps} />}
        </>
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Page                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export function ReprintBatchesPage({ initialTab = "REWORK" }) {
  const [tab, setTab] = useState(initialTab);

  // Opening /production/reprints or /production/rework lands on the matching tab
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const [reworkOpen, setReworkOpen] = useState(null);
  const [reprintPending, setReprintPending] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadCounts = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([
        productionApi.getOperationQueueCounts(),
        productionApi.getReprintRequests({ status: "REQUESTED", limit: 1 }),
      ]);
      const counts = c?.data || c;
      setReworkOpen(counts?.rework ?? 0);
      setReprintPending(p?.total ?? p?.meta?.total ?? 0);
    } catch (e) {
      /* tabs just show no numbers */
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts, reloadKey]);

  const tabs = useMemo(
    () => [
      { id: "REWORK", label: "Rework", count: reworkOpen, hint: "open tasks" },
      { id: "REPRINT", label: "Reprint", count: reprintPending, hint: "awaiting approval" },
    ],
    [reworkOpen, reprintPending]
  );

  return (
    <div className="reprint-batches-page">


      <div className="rb-top-row">
        <div className="rb-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`rb-tab ${tab === t.id ? "is-active" : ""}`}
              onClick={() => setTab(t.id)}
              title={t.count != null ? `${t.count} ${t.hint}` : undefined}
            >
              {t.label}
              {t.count != null && <span className="rb-tab-count">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {tab === "REWORK" ? (
        <ReworkTab onChanged={loadCounts} />
      ) : (
        <ReprintTab onChanged={loadCounts} />
      )}
    </div>
  );
}

export default ReprintBatchesPage;