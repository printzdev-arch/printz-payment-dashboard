import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Hourglass, RefreshCw, UserCog } from "lucide-react";
import mfgApi from "../api/mfgApi";
import AssignDesignerModal from "../components/AssignDesignerModal";
import { OrderStatusBadge, PriorityTag } from "../../sale-order/components/common/OrderStatusBadge";
import { errorMessage, formatDate } from "../../sale-order/utils/format";
import "../../sale-order/styles/sale-order.css";
import "../styles/mfg-unit.css";

const waitingText = (mins) => {
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h} h ${mins % 60} min` : `${Math.floor(h / 24)} d ${h % 24} h`;
};

// Orders that no designer has picked up yet. URGENT first, then oldest.
export default function MfgQueuePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setRows(await mfgApi.queue());
    } catch (err) {
      setError(errorMessage(err, "Could not load the waiting queue."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="so-page">
      <div className="so-header">
        <div className="so-title">
          <h1>Waiting Queue</h1>
          <p>Orders waiting for a designer. They are assigned automatically when a designer becomes available.</p>
        </div>
        <div className="so-header-actions">
          <button type="button" className="so-btn secondary" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
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
                <th>Priority</th>
                <th>Waiting</th>
                <th>Deliver By</th>
                <th>Status</th>
                <th className="right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="so-loading">Loading queue...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="so-empty">
                      <Hourglass size={34} />
                      <strong>The queue is empty</strong>
                      Every placed order has a designer.
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((o, i) => (
                  <tr key={o._id}>
                    <td>{i + 1}</td>
                    <td>
                      <button type="button" className="so-back-link" style={{ margin: 0, color: "#0f172a", fontWeight: 700 }} onClick={() => navigate(`/mfg/orders/${o._id}`)}>
                        {o.orderNo}
                      </button>
                    </td>
                    <td>{o.customerSnapshot?.name}</td>
                    <td><PriorityTag priority={o.priority} /></td>
                    <td style={{ color: o.minutesWaiting > 60 ? "#b45309" : undefined, fontWeight: 600 }}>{waitingText(o.minutesWaiting)}</td>
                    <td>{formatDate(o.expectedDeliveryDate)}</td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td className="right">
                      <button type="button" className="so-btn primary sm" onClick={() => setAssigning(o)}>
                        <UserCog size={13} /> Assign
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AssignDesignerModal
        isOpen={Boolean(assigning)}
        order={assigning}
        mode="assign"
        onClose={() => setAssigning(null)}
        onDone={() => {
          setAssigning(null);
          toast.success("Order assigned");
          load();
        }}
      />
    </div>
  );
}
