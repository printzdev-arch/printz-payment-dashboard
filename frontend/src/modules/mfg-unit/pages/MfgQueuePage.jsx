import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, Hand, Hourglass, ListChecks, RefreshCw, Search, UserCheck } from "lucide-react";
import mfgApi from "../api/mfgApi";
import DataTable from "../../../shared/ui/DataTable/DataTable";
import PageBanner from "../components/PageBanner";
import { stageInfo, takenByLabel, waitingText } from "../utils/mfgStages";
import { PriorityTag } from "../../sale-order/components/common/OrderStatusBadge";
import { errorMessage, formatDate, formatDateTime, initialsOf } from "../../sale-order/utils/format";
import "../../sale-order/styles/sale-order.css";
import "../styles/mfg-unit.css";

const TABS = [
  { key: "all", label: "All Orders", icon: ListChecks, color: "blue" },
  { key: "waiting", label: "Not Taken", icon: Hourglass, color: "orange" },
  { key: "taken", label: "Taken", icon: UserCheck, color: "green" },
];

// The unit's shared board: every open order, and who took it. Everyone at the unit sees the same list.
// An order nobody has taken yet can be taken from here.
export default function MfgQueuePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState(TABS.some((t) => t.key === params.get("show")) ? params.get("show") : "all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [takingId, setTakingId] = useState("");

  const load = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError("");
      setRows(await mfgApi.queue());
    } catch (err) {
      setError(errorMessage(err, "Could not load the orders."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const waiting = rows.filter((o) => o.isQueued).length;
    return { all: rows.length, waiting, taken: rows.length - waiting };
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((o) => {
      if (tab === "waiting" && !o.isQueued) return false;
      if (tab === "taken" && o.isQueued) return false;
      if (!q) return true;
      return [o.orderNo, o.customerSnapshot?.name, o.customerSnapshot?.mobile, o.currentAssignment?.designerName].some((v) =>
        String(v || "").toLowerCase().includes(q)
      );
    });
  }, [rows, tab, search]);

  const take = async (order) => {
    try {
      setTakingId(order._id);
      await mfgApi.take(order._id);
      toast.success(`You took ${order.orderNo}. Start the design.`);
      navigate(`/mfg/orders/${order._id}`);
    } catch (err) {
      toast.error(errorMessage(err, "Could not take this order."));
      load(true);
    } finally {
      setTakingId("");
    }
  };

  return (
    <div className="so-page">
      <PageBanner
        title="Manufacturing"
        highlight="Queue"
        subtitle="Every open order of the unit and who took it. Take an order that nobody has taken yet."
        actions={
          <button type="button" className="so-btn secondary" onClick={() => load(true)}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <div className="so-filters" style={{ flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`so-btn ${tab === t.key ? "primary" : "secondary"}`}
            onClick={() => setTab(t.key)}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      <div className="so-filters">
        <div className="so-search">
          <Search size={16} />
          <input className="so-input" placeholder="Search by order no., customer or who took it..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="so-card spaced">
        {error && <div className="so-error-bar">{error}</div>}
        <DataTable mobileCards
          searchable={false}
          loading={loading}
          data={visible}
          onRowClick={(o) => navigate(`/mfg/orders/${o._id}`)}
          emptyMessage={
            <div className="so-empty">
              <Hourglass size={34} />
              <strong>Nothing here</strong>
              {search ? "No order matches your search." : tab === "waiting" ? "Every order has been taken." : "New orders appear here as soon as a branch places them."}
            </div>
          }
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
            { key: "priority", label: "Priority", render: (o) => <PriorityTag priority={o.priority} /> },
            { key: "expectedDeliveryDate", label: "Deliver By", render: (o) => formatDate(o.expectedDeliveryDate) },
            {
              key: "stage",
              label: "Current Stage",
              render: (o) => {
                const stage = stageInfo(o);
                return (
                  <>
                    <span className={`so-badge ${stage.tone}`}>{stage.label}</span>
                    {o.currentDesignVersion ? <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>Design v{o.currentDesignVersion}</div> : null}
                  </>
                );
              },
            },
            {
              key: "takenBy",
              label: "Taken By",
              render: (o) => {
                const by = takenByLabel(o);
                return o.isQueued ? (
                  <>
                    <span className="muted">Not taken yet</span>
                    <div style={{ fontSize: 12, marginTop: 2, color: o.minutesWaiting > 60 ? "#b45309" : "#64748b", fontWeight: 600 }}>
                      Waiting {waitingText(o.minutesWaiting)}
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="so-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initialsOf(by)}</span>
                    <div>
                      <strong>{by || "—"}</strong>
                      {o.currentAssignment?.assignedAt && (
                        <div className="muted" style={{ fontSize: 12 }}>Taken {formatDateTime(o.currentAssignment.assignedAt)}</div>
                      )}
                    </div>
                  </div>
                );
              },
            },
            {
              key: "action",
              label: "Action",
              align: "right",
              render: (o) =>
                o.isQueued ? (
                  <button
                    type="button"
                    className="so-btn primary sm"
                    disabled={Boolean(takingId)}
                    onClick={(e) => {
                      e.stopPropagation();
                      take(o);
                    }}
                  >
                    <Hand size={13} /> {takingId === o._id ? "Taking..." : "Take order"}
                  </button>
                ) : (
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
