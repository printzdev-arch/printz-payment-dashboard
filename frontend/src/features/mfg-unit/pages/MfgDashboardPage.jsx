import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Eye, Hourglass, ImageIcon, Palette, PackageCheck, Users, Workflow } from "lucide-react";
import mfgApi from "../api/mfgApi";
import AvailabilitySwitch from "../components/AvailabilitySwitch";
import { AVAILABILITY, availabilityTone, getMfgRole } from "../utils/mfgRole";
import KpiCard from "../../sale-order/components/common/KpiCard";
import Section from "../../sale-order/components/common/Section";
import { OrderStatusBadge, PriorityTag } from "../../sale-order/components/common/OrderStatusBadge";
import { errorMessage, formatDate, formatDateTime } from "../../sale-order/utils/format";
import "../../sale-order/styles/sale-order.css";
import "../styles/mfg-unit.css";

const sum = (counts, keys) => keys.reduce((a, k) => a + Number(counts?.[k] || 0), 0);

export default function MfgDashboardPage() {
  const navigate = useNavigate();
  const me = useMemo(() => getMfgRole(), []);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError("");
      setData(await mfgApi.dashboard());
    } catch (err) {
      setError(errorMessage(err, "Could not load the dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="so-page"><div className="so-loading">Loading your dashboard...</div></div>;

  const counts = data?.counts || {};
  const first = (me.name || "").split(" ")[0] || "there";
  const notifications = data?.notifications || [];

  const notificationsCard = (
    <Section icon={Bell} title="Notifications" subtitle="Latest updates about your orders">
      {notifications.length === 0 ? (
        <div className="so-hint">You are all caught up.</div>
      ) : (
        <ul className="mfg-notes">
          {notifications.slice(0, 8).map((n) => (
            <li key={n._id}>
              <strong>{n.title}</strong>
              <span>{n.message}</span>
              <small>{formatDateTime(n.createdAt)}</small>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );

  /* ── Unit manager / admin ─────────────────────────────────────────────── */
  if (data?.role !== "mfg_designer") {
    const designers = data?.designers || [];
    return (
      <div className="so-page">
        <div className="so-header">
          <div className="so-title">
            <h1>Manufacturing Dashboard</h1>
            <p>Orders and designers of your unit at a glance</p>
          </div>
          <div className="so-header-actions">
            <button type="button" className="so-btn primary" onClick={() => navigate("/mfg/queue")}>
              <Hourglass size={15} /> Open Waiting Queue
            </button>
          </div>
        </div>

        {error && <div className="so-alert error"><span>{error}</span></div>}

        <div className="so-kpi-grid">
          <KpiCard icon={Hourglass} tone="amber" value={sum(counts, ["PLACED", "WAITING_FOR_DESIGNER"])} label="Waiting for a Designer" />
          <KpiCard icon={Workflow} tone="blue" value={counts.ASSIGNED || 0} label="Assigned, Not Started" />
          <KpiCard icon={Palette} tone="purple" value={sum(counts, ["IN_DESIGN", "CHANGES_REQUESTED"])} label="In Design" />
          <KpiCard icon={ImageIcon} tone="red" value={counts.SENT_FOR_APPROVAL || 0} label="Awaiting Customer" />
          <KpiCard icon={PackageCheck} tone="green" value={counts.APPROVED || 0} label="Approved" />
        </div>

        <div className="so-detail-grid">
          <div className="so-detail-main">
            <Section icon={Users} title="Designers" subtitle="Availability and current workload" flush>
              <div className="so-table-wrap">
                <table className="so-table">
                  <thead>
                    <tr><th>Designer</th><th>Availability</th><th>Orders in hand</th></tr>
                  </thead>
                  <tbody>
                    {designers.length === 0 ? (
                      <tr><td colSpan={3}><div className="so-empty">No designers are set up for this unit yet.</div></td></tr>
                    ) : (
                      designers.map((d) => (
                        <tr key={d._id}>
                          <td className="strong">{d.displayName}</td>
                          <td>
                            <span className={`so-badge ${availabilityTone[d.availability] || "slate"}`}>
                              {AVAILABILITY.find((a) => a.value === d.availability)?.label || d.availability}
                            </span>
                          </td>
                          <td>{d.activeOrders} of {d.maxActiveOrders}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
          <div className="so-detail-side">{notificationsCard}</div>
        </div>
      </div>
    );
  }

  /* ── Designer ─────────────────────────────────────────────────────────── */
  const orders = data?.orders || [];
  const profile = data?.profile;

  return (
    <div className="so-page">
      <div className="so-header">
        <div className="so-title">
          <h1>Hello, {first}</h1>
          <p>Here are the orders assigned to you</p>
        </div>
      </div>

      {error && <div className="so-alert error"><span>{error}</span></div>}

      <Section icon={Workflow} title="Your availability" subtitle="New orders are only assigned to you while you are Available">
        {profile ? (
          <AvailabilitySwitch value={profile.availability} onChanged={() => load(true)} />
        ) : (
          <div className="so-alert warn" style={{ marginBottom: 0 }}>
            <span>Your designer profile is not set up yet. Please ask your unit manager.</span>
          </div>
        )}
      </Section>

      <div className="so-kpi-grid">
        <KpiCard icon={Workflow} tone="blue" value={orders.length} label="Orders in Hand" />
        <KpiCard icon={Palette} tone="purple" value={counts.ASSIGNED || 0} label="Ready to Start" />
        <KpiCard icon={ImageIcon} tone="amber" value={sum(counts, ["IN_DESIGN", "CHANGES_REQUESTED"])} label="In Design" />
        <KpiCard icon={Hourglass} tone="red" value={counts.SENT_FOR_APPROVAL || 0} label="Awaiting Customer" />
        <KpiCard icon={PackageCheck} tone="green" value={counts.APPROVED || 0} label="Approved" />
      </div>

      <div className="so-detail-grid">
        <div className="so-detail-main">
          <Section icon={Palette} title="My Orders" subtitle="Urgent orders and nearest delivery dates first" flush>
            <div className="so-table-wrap">
              <table className="so-table">
                <thead>
                  <tr>
                    <th>Order No.</th><th>Customer</th><th>Deliver By</th><th>Priority</th><th>Design</th><th>Status</th><th className="right">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="so-empty">
                          <ImageIcon size={32} />
                          <strong>No orders in hand</strong>
                          New orders are assigned to you automatically while you are Available.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o._id} className="clickable" onClick={() => navigate(`/mfg/orders/${o._id}`)}>
                        <td className="strong">{o.orderNo}</td>
                        <td>{o.customerSnapshot?.name}</td>
                        <td>{formatDate(o.expectedDeliveryDate)}</td>
                        <td><PriorityTag priority={o.priority} /></td>
                        <td>{o.currentDesignVersion ? `v${o.currentDesignVersion}` : <span className="muted">—</span>}</td>
                        <td><OrderStatusBadge status={o.status} /></td>
                        <td className="right">
                          <button type="button" className="so-icon-btn" title="Open order"><Eye size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
        <div className="so-detail-side">{notificationsCard}</div>
      </div>
    </div>
  );
}
