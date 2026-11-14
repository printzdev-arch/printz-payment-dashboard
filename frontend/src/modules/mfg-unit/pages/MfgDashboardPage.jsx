import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Eye, Hourglass, ImageIcon, Palette, PackageCheck, Printer, RefreshCw, Truck, Workflow } from "lucide-react";
import mfgApi from "../api/mfgApi";
import DataTable from "../../../shared/ui/DataTable/DataTable";
import PageBanner from "../components/PageBanner";
import { currentUser } from "../utils/mfgStages";
import { PrintzKpiCard, PrintzKpiGrid } from "../../../shared/ui/motion";
import Section from "../../sale-order/components/common/Section";
import { OrderStatusBadge, PriorityTag } from "../../sale-order/components/common/OrderStatusBadge";
import { errorMessage, formatDate, formatDateTime } from "../../sale-order/utils/format";
import "../../sale-order/styles/sale-order.css";
import "../styles/mfg-unit.css";

const sum = (counts, keys) => keys.reduce((a, k) => a + Number(counts?.[k] || 0), 0);

// The same dashboard for everyone at the unit: what is waiting at each step, and the orders you took.
export default function MfgDashboardPage() {
  const navigate = useNavigate();
  const me = useMemo(() => currentUser(), []);
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

  if (loading) return <div className="so-page"><div className="so-loading">Loading the dashboard...</div></div>;

  const counts = data?.counts || {};
  const myOrders = data?.myOrders || [];
  const notifications = data?.notifications || [];
  const first = (me.name || "").split(" ")[0] || "there";
  const printingNow = Math.max(0, Number(counts.PRINTING || 0) - Number(counts.READY_TO_DISPATCH || 0));

  return (
    <div className="so-page">
      <PageBanner
        title="Manufacturing"
        highlight="Dashboard"
        subtitle={`Hello, ${first}. Everything the unit is working on. Take an order from the queue to start.`}
        actions={
          <>
            <button type="button" className="so-btn secondary" onClick={() => load(true)}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" className="so-btn primary" onClick={() => navigate("/mfg/queue")}>
              <Hourglass size={15} /> Open Queue
            </button>
          </>
        }
      />

      {error && <div className="so-alert error"><span>{error}</span></div>}

      <PrintzKpiGrid minWidth="190px">
        <PrintzKpiCard icon={<Hourglass size={20} />} color="orange" value={sum(counts, ["PLACED", "WAITING_FOR_DESIGNER", "ASSIGNED"])} title="In Queue" onClick={() => navigate("/mfg/queue?show=waiting")} />
        <PrintzKpiCard icon={<Palette size={20} />} color="purple" value={sum(counts, ["IN_DESIGN", "CHANGES_REQUESTED"])} title="In Design" onClick={() => navigate("/mfg/orders?status=IN_DESIGN,CHANGES_REQUESTED")} />
        <PrintzKpiCard icon={<ImageIcon size={20} />} color="pink" value={counts.SENT_FOR_APPROVAL || 0} title="Awaiting Customer" onClick={() => navigate("/mfg/orders?status=SENT_FOR_APPROVAL")} />
        <PrintzKpiCard icon={<PackageCheck size={20} />} color="green" value={counts.APPROVED || 0} title="Ready to Print" onClick={() => navigate("/mfg/orders?status=APPROVED")} />
        <PrintzKpiCard icon={<Printer size={20} />} color="blue" value={printingNow} title="Printing" onClick={() => navigate("/mfg/orders?status=PRINTING")} />
        <PrintzKpiCard icon={<Truck size={20} />} color="teal" value={counts.READY_TO_DISPATCH || 0} title="Ready to Dispatch" onClick={() => navigate("/mfg/orders?status=PRINTING")} />
      </PrintzKpiGrid>

      <div className="so-detail-grid">
        <div className="so-detail-main">
          <Section icon={Workflow} title="Orders you took" subtitle="Still open. Anyone at the unit can work on them too." flush>
            <DataTable
              searchable={false}
              data={myOrders}
              pageSize={5}
              onRowClick={(o) => navigate(`/mfg/orders/${o._id}`)}
              emptyMessage={
                <div className="so-empty">
                  <ImageIcon size={32} />
                  <strong>You have no open orders</strong>
                  Take an order from the queue to start working on it.
                </div>
              }
              columns={[
                { key: "orderNo", label: "Order No.", render: (o) => <span className="strong">{o.orderNo}</span> },
                { key: "customer", label: "Customer", render: (o) => o.customerSnapshot?.name },
                { key: "expectedDeliveryDate", label: "Deliver By", render: (o) => formatDate(o.expectedDeliveryDate) },
                { key: "priority", label: "Priority", render: (o) => <PriorityTag priority={o.priority} /> },
                {
                  key: "design",
                  label: "Design",
                  render: (o) => (o.currentDesignVersion ? `v${o.currentDesignVersion}` : <span className="muted">—</span>),
                },
                { key: "status", label: "Status", render: (o) => <OrderStatusBadge status={o.status} /> },
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
          </Section>
        </div>

        <div className="so-detail-side">
          <Section icon={Bell} title="Notifications" subtitle="Latest updates about the unit's orders">
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
        </div>
      </div>
    </div>
  );
}
