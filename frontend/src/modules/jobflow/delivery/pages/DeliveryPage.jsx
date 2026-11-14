import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { RefreshCw } from "lucide-react";
import JobFlowLayout from "../../../../layouts/JobFlowLayout/JobFlowLayout";
import DataTable from "../../../../shared/ui/DataTable/DataTable";
import PriorityBadge from "../../shared/components/PriorityBadge";
import deliveryApi from "../api/deliveryApi";
import settlementApi from "../../settlement/api/settlementApi";
import "../styles/delivery.css";

import CreateDeliveryOrderModal from "../components/CreateDeliveryOrderModal";
import AssignDeliveryModal from "../components/AssignDeliveryModal";
import HandoverProofModal from "../components/HandoverProofModal";
import ViewDeliveryProofModal from "../components/ViewDeliveryProofModal";
import CashierSettlementModal from "../../settlement/components/CashierSettlementModal";

/**
 * Delivery
 * The customer's delivery method (chosen on the job order) decides the type, so there are two tabs:
 *   Self Pickup       : ready to collect -> handed over at the counter
 *   Dispatch Delivery : to assign -> ready to dispatch -> out for delivery -> delivered
 * Only orders that passed QC appear (from the server); nothing is guessed on this page.
 */

const TYPES = {
  PICKUP: {
    label: "Self Pickup",
    chips: [
      { key: "READY", label: "Ready to collect" },
      { key: "DONE", label: "Handed over" },
    ],
  },
  DISPATCH: {
    label: "Dispatch Delivery",
    chips: [
      { key: "ASSIGN", label: "To assign" },
      { key: "DISPATCH", label: "Ready to dispatch" },
      { key: "OUT", label: "Out for delivery" },
      { key: "DELIVERED", label: "Delivered" },
    ],
  },
};

const STATE_LABEL = {
  READY: ["Ready to collect", "#fef3c7", "#b45309"],
  DONE: ["Handed over", "#dcfce7", "#15803d"],
  ASSIGN: ["To assign", "#f1f5f9", "#475569"],
  DISPATCH: ["Ready to dispatch", "#fef3c7", "#b45309"],
  OUT: ["Out for delivery", "#dbeafe", "#1d4ed8"],
  DELIVERED: ["Delivered", "#dcfce7", "#15803d"],
};

const listOf = (res) => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  return d?.items || d?.data || [];
};
const errorMessage = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const typeOf = (deliveryType) => (deliveryType === "COUNTER_PICKUP" ? "PICKUP" : "DISPATCH");

const hasStaff = (d) => {
  const name = String(d?.deliveryPersonName || "").trim();
  return Boolean((name && name !== "Unassigned" && name !== "-" && name !== "undefined") || d?.assignedEmployeeId);
};

/** Which step of its type a row is at. */
const stateOf = (row) => {
  if (row.kind === "JOB") return row.type === "PICKUP" ? "READY" : "ASSIGN";
  const s = row.status;
  if (s === "DELIVERED") return row.type === "PICKUP" ? "DONE" : "DELIVERED";
  if (row.type === "PICKUP") return "READY";
  if (s === "OUT_FOR_DELIVERY") return "OUT";
  return (s === "ASSIGNED" || s === "PACKED") && hasStaff(row.d) ? "DISPATCH" : "ASSIGN";
};

const pill = ([label, bg, color]) => (
  <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap", background: bg, color }}>
    {label}
  </span>
);

const Tab = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="jf-btn"
    style={{
      padding: "0.55rem 1rem",
      borderRadius: "8px",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      border: active ? "1px solid var(--jf-primary, #059669)" : "1px solid #cbd5e1",
      background: active ? "var(--jf-primary, #059669)" : "#ffffff",
      color: active ? "#ffffff" : "#334155",
      boxShadow: active ? "0 2px 4px rgba(21,128,61,0.2)" : "none",
    }}
  >
    {children}
  </button>
);

const Count = ({ active, n }) => (
  <span style={{ background: active ? "rgba(255,255,255,0.25)" : "#f1f5f9", color: active ? "#ffffff" : "#0f172a", padding: "0.1rem 0.5rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 700 }}>
    {n}
  </span>
);

export const DeliveryPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get("tab") || "").toUpperCase();
  const preselectedJobId = searchParams.get("jobId");

  // The old "job closure" tab lives on the Settlement page
  useEffect(() => {
    if (["CLOSURE", "JOB_CLOSURE", "CLOSURE_QUEUE"].includes(tabParam)) {
      navigate("/jobflow/settlement?tab=CLOSURE_QUEUE", { replace: true });
    }
  }, [tabParam, navigate]);

  const [tab, setTab] = useState(() => {
    if (tabParam === "PICKUP" || tabParam === "DISPATCH") return tabParam;
    try {
      const saved = sessionStorage.getItem("delivery_active_tab");
      if (saved === "PICKUP" || saved === "DISPATCH") return saved;
    } catch {}
    return "DISPATCH";
  });
  const [chip, setChip] = useState(TYPES[tab].chips[0].key);

  const [loading, setLoading] = useState(true);
  const [readyJobs, setReadyJobs] = useState([]);
  const [orders, setOrders] = useState([]);

  const [jobForOrder, setJobForOrder] = useState(null); // create the delivery order for a job that has none yet
  const [orderForAssign, setOrderForAssign] = useState(null);
  const [orderForHandover, setOrderForHandover] = useState(null);
  const [orderForProof, setOrderForProof] = useState(null);
  const [invoiceForCashier, setInvoiceForCashier] = useState(null);
  const [dispatchTarget, setDispatchTarget] = useState(null);
  const [dispatchNote, setDispatchNote] = useState("");
  const [busy, setBusy] = useState(false);

  const changeTab = (next) => {
    setTab(next);
    setChip(TYPES[next].chips[0].key);
    try {
      sessionStorage.setItem("delivery_active_tab", next);
    } catch {}
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set("tab", next);
        return n;
      },
      { replace: true }
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [rj, ro] = await Promise.allSettled([
      deliveryApi.getReadyJobsForDelivery({ limit: 200 }),
      deliveryApi.getDeliveryOrders({ limit: 500 }),
    ]);
    if (rj.status === "rejected" && ro.status === "rejected") {
      toast.error(errorMessage(ro.reason, "Could not load deliveries."));
    }
    setReadyJobs(rj.status === "fulfilled" ? listOf(rj.value) : []);
    setOrders(ro.status === "fulfilled" ? listOf(ro.value) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- rows ---------- */
  const rows = useMemo(() => {
    const readyById = {};
    readyJobs.forEach((j) => {
      readyById[String(j._id || j.id)] = j;
    });

    const orderRows = orders
      .filter((d) => d.status !== "CANCELLED")
      .map((d) => {
        const jObj = d.jobOrderId && typeof d.jobOrderId === "object" ? d.jobOrderId : null;
        const jobId = String(jObj?._id || d.jobOrderId || "");
        const ready = readyById[jobId];
        const total = Number(d.grandTotal || jObj?.grandTotal || jObj?.totalAmount || 0);
        const adv = Number(d.advancePaid || jObj?.advancePaid || 0);
        const delivered = d.status === "DELIVERED";
        // The ready list carries the invoice balance; a delivered order is always fully paid (the server requires it)
        const balance = delivered ? 0 : ready ? Number(ready.balanceDue || 0) : Math.max(0, total - adv);
        const type = typeOf(d.deliveryType);
        const order = {
          ...d,
          _id: d._id || d.id,
          jobOrderId: jObj?._id || d.jobOrderId,
          jobNo: jObj?.jobNo || d.jobNo || "",
          customerName: d.customerName || jObj?.customerName || "Customer",
          customerPhone: d.customerPhone || jObj?.customerPhone || "",
          deliveryAddress: type === "PICKUP" ? "" : d.deliveryAddress || jObj?.customerSnapshot?.address || "",
          deliveryPersonName: d.deliveryPersonName || d.driverName || "",
          deliveryPersonPhone: d.deliveryPersonPhone || d.driverPhone || "",
          vehicle: d.vehicle || d.vehicleNumber || "",
          balanceDue: balance,
        };
        return {
          kind: "ORDER",
          key: String(order._id),
          jobId,
          type,
          status: d.status,
          d: order,
          jobNo: order.jobNo,
          deliveryNo: d.deliveryNo,
          priority: jObj?.priority || ready?.priority || "NORMAL",
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          address: order.deliveryAddress,
          staff: order.deliveryPersonName,
          vehicle: order.vehicle,
          quantity: order.quantity,
          balanceDue: balance,
        };
      });

    const withOrder = new Set(orderRows.map((r) => r.jobId));
    const jobRows = readyJobs
      .filter((j) => !withOrder.has(String(j._id || j.id)) && !j.deliveryOrder)
      .map((j) => {
        const id = String(j._id || j.id);
        const type = typeOf(j.deliveryType);
        return {
          kind: "JOB",
          key: `job-${id}`,
          jobId: id,
          type,
          status: "NEW",
          jobNo: j.jobNo || j.orderNumber || "",
          deliveryNo: "",
          priority: j.priority || "NORMAL",
          customerName: j.customerName || j.customerSnapshot?.name || "Customer",
          customerPhone: j.customerPhone || j.customerSnapshot?.mobile || "",
          address: type === "PICKUP" ? "" : j.customerSnapshot?.address || j.deliveryAddress || "",
          staff: "",
          vehicle: "",
          quantity: j.quantity,
          balanceDue: Number(j.balanceDue || 0),
          // what the "create delivery order" popup needs
          job: {
            ...j,
            _id: j._id || j.id,
            customerName: j.customerName || j.customerSnapshot?.name || "Customer",
            customerPhone: j.customerPhone || j.customerSnapshot?.mobile || "",
            deliveryAddress: j.customerSnapshot?.address || j.deliveryAddress || "",
            deliveryType: j.deliveryType,
            title: j.title || j.productType || "Print Order",
            deliveryOrder: null,
            isDeliveryPrepared: false,
          },
        };
      });

    return [...orderRows, ...jobRows].map((r) => ({ ...r, state: stateOf(r) }));
  }, [readyJobs, orders]);

  // Opened from a job (?jobId=): show where that job is
  useEffect(() => {
    if (loading || !preselectedJobId) return;
    const hit = rows.find((r) => r.jobId === preselectedJobId || r.jobNo === preselectedJobId);
    if (hit) {
      setTab(hit.type);
      setChip(hit.state);
    }
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("jobId");
        return n;
      },
      { replace: true }
    );
  }, [loading, preselectedJobId, rows, setSearchParams]);

  const tabRows = rows.filter((r) => r.type === tab);
  const chipRows = tabRows.filter((r) => r.state === chip);
  const openCount = (t) => rows.filter((r) => r.type === t && !["DONE", "DELIVERED"].includes(r.state)).length;
  const chipCount = (key) => tabRows.filter((r) => r.state === key).length;

  /* ---------- actions ---------- */
  const openSettlement = async (row) => {
    const d = row.d || {};
    const direct = d.raw?.invoiceId || d.invoiceId;
    if (direct) return setInvoiceForCashier(direct);
    try {
      const res = await settlementApi.getJobInvoice(row.jobId);
      const invId = res?.data?._id || res?.data?.id;
      if (invId) return setInvoiceForCashier(invId);
    } catch {}
    toast.error("No invoice was found for this job. Create the invoice first.");
  };

  const confirmDispatch = async () => {
    const row = dispatchTarget;
    if (!row) return;
    setBusy(true);
    try {
      const id = row.d._id;
      await deliveryApi.dispatchDeliveryOrder(id, dispatchNote.trim() ? { dispatchNotes: dispatchNote.trim() } : {});
      let otp = "";
      try {
        const res = await deliveryApi.generateOtp(id);
        otp = res?.data?.otp || res?.otp || "";
      } catch {}
      toast.success(
        otp
          ? `${row.jobNo} is out for delivery. Handover code: ${otp}. Give this code to the customer; it is not sent automatically.`
          : `${row.jobNo} is out for delivery.`,
        { autoClose: otp ? 12000 : 5000 }
      );
      setDispatchTarget(null);
      setDispatchNote("");
      await load();
      setChip("OUT");
    } catch (err) {
      toast.error(errorMessage(err, "Could not dispatch the order."));
    } finally {
      setBusy(false);
    }
  };

  // Self pickup: pack the order (if it is not packed yet), then open the handover screen
  const startPickupHandover = async (row) => {
    const d = row.d;
    try {
      if (d.status !== "PACKED") {
        setBusy(true);
        await deliveryApi.packDeliveryOrder(d._id, {});
        await load();
      }
      setOrderForHandover({ ...d, status: "PACKED" });
    } catch (err) {
      toast.error(errorMessage(err, "Could not prepare the order for handover."));
    } finally {
      setBusy(false);
    }
  };

  const actionsFor = (row) => {
    const btn = (label, onClick, kind = "primary", disabled = false) => (
      <button type="button" className={`jf-btn jf-btn-${kind} jf-btn-sm`} onClick={onClick} disabled={disabled || busy}>
        {label}
      </button>
    );
    const due = row.balanceDue > 0;
    switch (row.state) {
      case "READY": // self pickup
        if (row.kind === "JOB") return btn("Create order", () => setJobForOrder({ ...row.job, readOnly: false }));
        return due ? btn(`Collect ${money(row.balanceDue)}`, () => openSettlement(row)) : btn("Hand over", () => startPickupHandover(row));
      case "ASSIGN":
        if (row.kind === "JOB") return btn("Create order", () => setJobForOrder({ ...row.job, readOnly: false }));
        return btn("Assign", () => setOrderForAssign(row.d));
      case "DISPATCH":
        return (
          <div style={{ display: "inline-flex", gap: "0.4rem" }}>
            {btn("Re-assign", () => setOrderForAssign(row.d), "secondary")}
            {due ? btn(`Collect ${money(row.balanceDue)}`, () => openSettlement(row)) : btn("Dispatch", () => setDispatchTarget(row))}
          </div>
        );
      case "OUT":
        return due ? btn(`Collect ${money(row.balanceDue)}`, () => openSettlement(row)) : btn("Mark delivered", () => setOrderForHandover(row.d));
      default: // DONE / DELIVERED
        return btn("View proof", () => setOrderForProof(row.d), "secondary");
    }
  };

  /* ---------- table ---------- */
  const columns = useMemo(() => {
    const cols = [
      {
        key: "jobNo",
        label: "Job No",
        sortable: true,
        render: (val, row) => (
          <div style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{val || "—"}</div>
        ),
      },
      { key: "priority", label: "Priority", sortable: true, render: (val) => <PriorityBadge priority={val} /> },
      {
        key: "customerName",
        label: "Customer",
        sortable: true,
        render: (val, row) => (
          <div>
            <div style={{ fontWeight: 600 }}>{val}</div>
            {row.customerPhone ? <div style={{ fontSize: "0.75rem", color: "#475569" }}>{row.customerPhone}</div> : null}
          </div>
        ),
      },
    ];
    if (tab === "DISPATCH") {
      cols.push(
        { key: "address", label: "Address", render: (val) => <span style={{ display: "inline-block", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }} title={val}>{val || "—"}</span> },
        {
          key: "staff",
          label: "Delivery person",
          render: (val, row) =>
            val ? (
              <div>
                <div style={{ fontWeight: 600 }}>{val}</div>
                {row.vehicle ? <div style={{ fontSize: "0.75rem", color: "#475569" }}>{row.vehicle}</div> : null}
              </div>
            ) : (
              <span style={{ color: "#94a3b8" }}>Not assigned</span>
            ),
        }
      );
    }
    cols.push(
      { key: "quantity", label: "Qty", sortable: true, render: (val) => (Number(val) > 0 ? Number(val).toLocaleString() : "—") },
      {
        key: "balanceDue",
        label: "Payment",
        sortable: true,
        render: (val) =>
          Number(val) > 0 ? <strong style={{ color: "#dc2626" }}>{money(val)} due</strong> : <strong style={{ color: "#15803d" }}>Paid</strong>,
      },
      { key: "state", label: "Status", render: (val) => pill(STATE_LABEL[val] || [val, "#f1f5f9", "#475569"]) },
      { key: "actions", label: "Action", sortable: false, align: "right", render: (_, row) => actionsFor(row) }
    );
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, busy, rows]);

  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {Object.entries(TYPES).map(([key, t]) => (
            <Tab key={key} active={tab === key} onClick={() => changeTab(key)}>
              {t.label} <Count active={tab === key} n={openCount(key)} />
            </Tab>
          ))}
        </div>
        <button type="button" className="jf-btn jf-btn-secondary" onClick={load} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <RefreshCw size={14} /> {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {TYPES[tab].chips.map((c) => (
          <Tab key={c.key} active={chip === c.key} onClick={() => setChip(c.key)}>
            {c.label} <Count active={chip === c.key} n={chipCount(c.key)} />
          </Tab>
        ))}
      </div>

      <DataTable renderWithValue
        key={`${tab}-${chip}`}
        columns={columns}
        data={chipRows}
        loading={loading}
        sortable
        sortControls={false}
        searchPlaceholder="Search by job, customer, phone or address..."
        searchKeys={["jobNo", "customerName", "customerPhone", "address", "staff"]}
        rowKey="key"
        emptyMessage="Nothing here right now."
      />

      {dispatchTarget && (
        <div className="jf-modal-overlay" onClick={() => !busy && setDispatchTarget(null)}>
          <div className="jf-modal jf-modal-md" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="jf-modal-header">
              <h2 className="jf-modal-title">Dispatch {dispatchTarget.jobNo}</h2>
            </div>
            <div className="jf-modal-body" style={{ display: "grid", gap: "0.75rem" }}>
              <div style={{ fontSize: "0.875rem", color: "#475569" }}>
                {dispatchTarget.customerName}
                {dispatchTarget.address ? ` · ${dispatchTarget.address}` : ""}
                <br />
                Delivery person: <strong>{dispatchTarget.staff || "—"}</strong>
              </div>
              <div className="jf-form-group">
                <label className="jf-label">Note (optional)</label>
                <textarea className="jf-textarea" rows={2} value={dispatchNote} onChange={(e) => setDispatchNote(e.target.value)} placeholder="Anything the delivery person should know" />
              </div>
            </div>
            <div className="jf-modal-footer">
              <button type="button" className="jf-btn jf-btn-secondary" onClick={() => setDispatchTarget(null)} disabled={busy}>Cancel</button>
              <button type="button" className="jf-btn jf-btn-primary" onClick={confirmDispatch} disabled={busy}>{busy ? "Dispatching..." : "Dispatch"}</button>
            </div>
          </div>
        </div>
      )}

      <CreateDeliveryOrderModal
        isOpen={Boolean(jobForOrder)}
        onClose={() => setJobForOrder(null)}
        job={jobForOrder}
        readOnly={Boolean(jobForOrder?.readOnly)}
        onCreated={() => load()}
      />
      <AssignDeliveryModal
        isOpen={Boolean(orderForAssign)}
        onClose={() => setOrderForAssign(null)}
        deliveryOrder={orderForAssign}
        onAssigned={() => load()}
      />
      <HandoverProofModal
        isOpen={Boolean(orderForHandover)}
        onClose={() => setOrderForHandover(null)}
        deliveryOrder={orderForHandover}
        onDelivered={() => {
          load();
          setChip(tab === "PICKUP" ? "DONE" : "DELIVERED");
        }}
      />
      <ViewDeliveryProofModal isOpen={Boolean(orderForProof)} onClose={() => setOrderForProof(null)} deliveryOrder={orderForProof} />
      <CashierSettlementModal
        isOpen={Boolean(invoiceForCashier)}
        onClose={() => setInvoiceForCashier(null)}
        invoiceId={invoiceForCashier}
        onPaymentComplete={() => load()}
      />
    </div>
  );

  if (embedded) return content;
  return (
    <JobFlowLayout title="Delivery" activeStep={5}>
      {content}
    </JobFlowLayout>
  );
};

export default DeliveryPage;
