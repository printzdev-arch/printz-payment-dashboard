import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Download, PackageCheck, PackageSearch, Printer, RefreshCw, Search, Send, Truck } from "lucide-react";
import mfgApi from "../api/mfgApi";
import saleOrderApi from "../../sale-order/api/saleOrderApi";
import FinishPrintModal from "../components/FinishPrintModal";
import DispatchModal from "../components/DispatchModal";
import { OrderStatusBadge, PriorityTag } from "../../sale-order/components/common/OrderStatusBadge";
import { errorMessage, formatDate, formatDateTime } from "../../sale-order/utils/format";
import { typeLabel } from "../../sale-order/utils/saleOrderStatus";
import { getMfgRole } from "../utils/mfgRole";
import "../../sale-order/styles/sale-order.css";
import "../styles/mfg-unit.css";

const TABS = [
  { key: "print", label: "Ready to Print", icon: Printer, empty: "No approved orders are waiting to be printed." },
  { key: "printing", label: "Printing", icon: PackageCheck, empty: "Nothing is being printed right now." },
  { key: "dispatch", label: "Ready to Dispatch", icon: Truck, empty: "No finished prints are waiting to be dispatched." },
  { key: "sent", label: "Dispatched", icon: Send, empty: "Nothing has been dispatched yet." },
];

// Which step an order is at on this page
const stageOf = (o) => {
  if (o.status === "APPROVED") return "print";
  if (o.status === "PRINTING") return o.printing?.completedAt ? "dispatch" : "printing";
  if (o.status === "DISPATCHED") return "sent";
  return null;
};

// Work queue for the shop floor: print the approved orders, then pack and dispatch them to the branch.
export default function MfgPrintDispatchPage() {
  const navigate = useNavigate();
  const me = useMemo(() => getMfgRole(), []);
  const canWork = me.isDesigner || me.isAdmin; // the designer prints and dispatches; an admin can step in

  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("print");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [modal, setModal] = useState({ type: "", order: null }); // finish | dispatch

  const load = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError("");
      const res = await saleOrderApi.list({ page: 1, limit: 100, status: "APPROVED,PRINTING,DISPATCHED" });
      setOrders(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(errorMessage(err, "Could not load the orders."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const g = { print: [], printing: [], dispatch: [], sent: [] };
    orders.forEach((o) => {
      const s = stageOf(o);
      if (s) g[s].push(o);
    });
    return g;
  }, [orders]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return grouped[tab].filter(
      (o) => !q || `${o.orderNo} ${o.customerSnapshot?.name || ""} ${o.customerSnapshot?.mobile || ""}`.toLowerCase().includes(q)
    );
  }, [grouped, tab, search]);

  // The list does not carry items or design files, so the action fetches the full order first
  const withDetail = async (order, fn) => {
    try {
      setBusyId(order._id);
      const detail = await saleOrderApi.get(order._id);
      await fn(detail);
    } catch (err) {
      toast.error(errorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setBusyId("");
    }
  };

  const downloadPrintFile = (order) =>
    withDetail(order, async (detail) => {
      const approved = (detail.designs || []).find((d) => d.status === "APPROVED");
      if (!approved?.hasPrintFile) {
        toast.info("The designer did not attach a print file to the approved version.");
        return;
      }
      await mfgApi.downloadPrintFile(order._id, approved.versionNo);
    });

  const startPrint = (order) =>
    withDetail(order, async () => {
      await mfgApi.startPrint(order._id);
      toast.success(`Printing started for ${order.orderNo}`);
      setTab("printing");
      await load(true);
    });

  const openModal = (type, order) => withDetail(order, async (detail) => setModal({ type, order: detail }));

  const closeModal = () => setModal({ type: "", order: null });
  const afterModal = (message, nextTab) => async () => {
    closeModal();
    toast.success(message);
    setTab(nextTab);
    await load(true);
  };

  const columns = 5;

  return (
    <div className="so-page">
      <div className="so-header">
        <div className="so-title">
          <h1>Print & Dispatch</h1>
          <p>{canWork ? "Print the approved orders, then send them to the branch" : "Orders in printing and dispatch (view only)"}</p>
        </div>
        <div className="so-header-actions">
          <button type="button" className="so-btn secondary" onClick={() => load(true)}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="mfg-stage-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`mfg-stage-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <t.icon size={18} />
            <span className="count">{grouped[t.key].length}</span>
            <span className="label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="so-filters">
        <div className="so-search">
          <Search size={16} />
          <input className="so-input" placeholder="Search by order no. or customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="so-card spaced">
        {error && <div className="so-error-bar">{error}</div>}
        <div className="so-table-wrap">
          <table className="so-table">
            <thead>
              <tr>
                <th>Order No.</th>
                <th>Customer</th>
                <th>Deliver By</th>
                <th>Priority</th>
                {tab === "sent" ? <th>Dispatch</th> : <th>Status</th>}
                <th className="right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns} className="so-loading">Loading orders...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns}>
                    <div className="so-empty">
                      <PackageSearch size={34} />
                      <strong>{search ? "No orders match your search" : TABS.find((t) => t.key === tab).empty}</strong>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((o) => {
                  const busy = busyId === o._id;
                  return (
                    <tr key={o._id} className="clickable" onClick={() => navigate(`/mfg/orders/${o._id}`)}>
                      <td className="strong">{o.orderNo}</td>
                      <td>{o.customerSnapshot?.name}<div className="muted">{o.customerSnapshot?.mobile}</div></td>
                      <td>{formatDate(o.expectedDeliveryDate)}</td>
                      <td><PriorityTag priority={o.priority} /></td>
                      {tab === "sent" ? (
                        <td>
                          {o.dispatch?.dispatchNo}
                          <div className="muted">
                            {typeLabel(o.dispatch?.mode)} · {o.dispatch?.packages} pkg · {formatDateTime(o.dispatch?.dispatchedAt)}
                          </div>
                        </td>
                      ) : (
                        <td><OrderStatusBadge status={o.status} /></td>
                      )}
                      <td className="right" onClick={(e) => e.stopPropagation()}>
                        <div className="mfg-row-actions">
                          {(tab === "print" || tab === "printing") && (
                            <button type="button" className="so-btn secondary sm" disabled={busy} onClick={() => downloadPrintFile(o)}>
                              <Download size={13} /> Print File
                            </button>
                          )}
                          {canWork && tab === "print" && (
                            <button type="button" className="so-btn primary sm" disabled={busy} onClick={() => startPrint(o)}>
                              <Printer size={13} /> Start Printing
                            </button>
                          )}
                          {canWork && tab === "printing" && (
                            <button type="button" className="so-btn primary sm" disabled={busy} onClick={() => openModal("finish", o)}>
                              <PackageCheck size={13} /> Finish Printing
                            </button>
                          )}
                          {canWork && tab === "dispatch" && (
                            <button type="button" className="so-btn primary sm" disabled={busy} onClick={() => openModal("dispatch", o)}>
                              <Truck size={13} /> Dispatch
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
      </div>

      <FinishPrintModal
        isOpen={modal.type === "finish"}
        order={modal.order}
        onClose={closeModal}
        onDone={afterModal("Printing finished. The order is ready to dispatch.", "dispatch")}
      />
      <DispatchModal
        isOpen={modal.type === "dispatch"}
        order={modal.order}
        onClose={closeModal}
        onDone={afterModal("Order dispatched to the branch.", "sent")}
      />
    </div>
  );
}
