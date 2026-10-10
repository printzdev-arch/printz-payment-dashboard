import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Printer,
  ChevronRight,
  Eye,
  History,
  Layers,
  Sparkles
} from "lucide-react";
import { getQcQueue } from "../api/qualityApi";
import QcHistoryTimelineModal from "./QcHistoryTimelineModal";

export default function QualityControlQueueView({
  onSelectOrderForInspection,
  onNavigateToReprints,
  branchName = "Kothanur",
  currentUser = { name: "Lakshmi P", role: "qc_inspector" }
}) {
  const [queueData, setQueueData] = useState({
    items: [],
    metrics: { total: 0, pendingQc: 0, passed: 0, reworkIssues: 0, reprintIssues: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await getQcQueue({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
        search: searchQuery || undefined
      });
      setQueueData(res || { items: [], metrics: {} });
    } catch (err) {
      console.error("Failed to load QC queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQueue();
  };

  const rawItems = Array.isArray(queueData) ? queueData : (queueData.items || []);
  const metrics = (!Array.isArray(queueData) && queueData.metrics && queueData.metrics.total !== undefined) ? queueData.metrics : {
    total: rawItems.length,
    pendingQc: rawItems.filter((i) => !i.qcStatus || i.qcStatus === "PENDING").length,
    passed: rawItems.filter((i) => i.qcStatus === "PASSED").length,
    reworkIssues: rawItems.filter((i) => i.qcStatus === "REWORK_REQUESTED" || i.qcStatus === "ISSUE_DETECTED").length,
    reprintIssues: rawItems.filter((i) => i.qcStatus === "REPRINT_REQUESTED").length
  };

  const items = rawItems.filter((order) => {
    if (statusFilter !== "ALL") {
      if (statusFilter === "PENDING" && order.qcStatus && order.qcStatus !== "PENDING") return false;
      if (statusFilter === "PASSED" && order.qcStatus !== "PASSED") return false;
      if (statusFilter === "REWORK_REQUESTED" && order.qcStatus !== "REWORK_REQUESTED" && order.qcStatus !== "ISSUE_DETECTED") return false;
      if (statusFilter === "REPRINT_REQUESTED" && order.qcStatus !== "REPRINT_REQUESTED") return false;
    }
    if (priorityFilter !== "ALL" && (order.priority || "NORMAL").toUpperCase() !== priorityFilter.toUpperCase()) return false;
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        (order.productionNo && order.productionNo.toLowerCase().includes(q)) ||
        (order.jobNo && order.jobNo.toLowerCase().includes(q)) ||
        (order.customerName && order.customerName.toLowerCase().includes(q)) ||
        (order.productName && order.productName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="qc-container">
      {/* Header Bar */}
      <div className="qc-header-bar">
        <div className="qc-title-group">
          <div className="qc-breadcrumb">
            <span className="qc-breadcrumb-link">Production Workflow</span>
            <span>/</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>Quality Control</span>
          </div>
          <h1 className="qc-title">
            <ShieldCheck size={22} color="#047857" />
            Quality Control
          </h1>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={fetchQueue}
            className="qc-btn-secondary"
            title="Refresh queue"
          >
            <RefreshCw size={13} className={loading ? "prod-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={onNavigateToReprints}
            className="qc-btn-secondary"
            style={{ color: "#c2410c", borderColor: "#fdba74" }}
          >
            <Printer size={13} /> Reprint Requests ({metrics.reprintIssues || 0})
          </button>
        </div>
      </div>

      {/* Metric KPI Cards Bar */}
      <div className="qc-kpi-grid">
        <div
          className="qc-kpi-card"
          style={{ cursor: "pointer", borderColor: statusFilter === "ALL" ? "#047857" : "#e2e8f0" }}
          onClick={() => setStatusFilter("ALL")}
        >
          <div className="qc-kpi-title">
            <Layers size={13} /> Total In Queue
          </div>
          <div className="qc-kpi-value">{metrics.total || 0}</div>
          <div className="qc-kpi-sub">Produced orders requiring review</div>
        </div>

        <div
          className="qc-kpi-card"
          style={{ cursor: "pointer", borderColor: statusFilter === "PENDING" ? "#d97706" : "#e2e8f0", background: statusFilter === "PENDING" ? "#fffbeb" : "#ffffff" }}
          onClick={() => setStatusFilter("PENDING")}
        >
          <div className="qc-kpi-title" style={{ color: "#d97706" }}>
            <Clock size={13} /> Pending QC
          </div>
          <div className="qc-kpi-value" style={{ color: "#d97706" }}>{metrics.pendingQc || 0}</div>
          <div className="qc-kpi-sub">Awaiting inspector verification</div>
        </div>

        <div
          className="qc-kpi-card"
          style={{ cursor: "pointer", borderColor: statusFilter === "PASSED" ? "#16a34a" : "#e2e8f0", background: statusFilter === "PASSED" ? "#f0fdf4" : "#ffffff" }}
          onClick={() => setStatusFilter("PASSED")}
        >
          <div className="qc-kpi-title" style={{ color: "#16a34a" }}>
            <CheckCircle2 size={13} /> Passed / Cleared
          </div>
          <div className="qc-kpi-value" style={{ color: "#16a34a" }}>{metrics.passed || 0}</div>
          <div className="qc-kpi-sub">Ready for packing dispatch</div>
        </div>

        <div
          className="qc-kpi-card"
          style={{ cursor: "pointer", borderColor: statusFilter === "REWORK_REQUESTED" ? "#dc2626" : "#e2e8f0", background: statusFilter === "REWORK_REQUESTED" ? "#fef2f2" : "#ffffff" }}
          onClick={() => setStatusFilter("REWORK_REQUESTED")}
        >
          <div className="qc-kpi-title" style={{ color: "#dc2626" }}>
            <AlertTriangle size={13} /> Corrective Issues
          </div>
          <div className="qc-kpi-value" style={{ color: "#dc2626" }}>
            {(metrics.reworkIssues || 0) + (metrics.reprintIssues || 0)}
          </div>
          <div className="qc-kpi-sub">Rework / Reprint cycles</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="qc-card" style={{ padding: "14px 18px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", flex: "1 1 300px", maxWidth: "450px" }}>
            <div style={{ position: "relative", width: "100%" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }} />
              <input
                type="text"
                className="prod-form-input"
                style={{ paddingLeft: "32px", fontSize: "12px" }}
                placeholder="Search by Production #, Job #, Customer, Product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="qc-btn-secondary" style={{ padding: "6px 12px" }}>
              Search
            </button>
          </form>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>QC Status:</span>
              <select
                className="prod-form-input"
                style={{ width: "auto", padding: "5px 10px", fontSize: "12px" }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Inspection</option>
                <option value="PASSED">Passed (Cleared)</option>
                <option value="REWORK_REQUESTED">Rework Logged</option>
                <option value="REPRINT_REQUESTED">Reprint Requested</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Priority:</span>
              <select
                className="prod-form-input"
                style={{ width: "auto", padding: "5px 10px", fontSize: "12px" }}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="ALL">All Priorities</option>
                <option value="HIGH">High Priority</option>
                <option value="NORMAL">Normal</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* QC Queue Table */}
      <div className="qc-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="prod-table" style={{ width: "100%", margin: 0 }}>
          <thead>
            <tr>
              <th>Production No</th>
              <th>Job No</th>
              <th>Customer</th>
              <th>Product / Item</th>
              <th style={{ textAlign: "center" }}>Produced Qty</th>
              <th style={{ textAlign: "center" }}>Production Status</th>
              <th style={{ textAlign: "center" }}>Priority</th>
              <th style={{ textAlign: "center" }}>Completed At</th>
              <th style={{ textAlign: "center" }}>QC Status</th>
              <th style={{ textAlign: "right", paddingRight: "20px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <RefreshCw size={24} className="prod-spin" style={{ margin: "0 auto 10px auto", display: "block", color: "#047857" }} />
                  Loading quality control inspection queue...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <ShieldCheck size={32} style={{ margin: "0 auto 10px auto", display: "block", opacity: 0.3 }} />
                  No completed production orders currently awaiting QC.
                </td>
              </tr>
            ) : (
              items.map((order) => {
                const orderId = order.id || order.productionOrderId || order.productionNo;
                const isPassed = order.qcStatus === "PASSED";
                const isRework = order.qcStatus === "REWORK_REQUESTED" || order.qcStatus === "ISSUE_DETECTED";
                const isReprint = order.qcStatus === "REPRINT_REQUESTED";
                const isPending = !isPassed && !isRework && !isReprint;

                return (
                  <tr key={orderId}>
                    {/* Production No */}
                    <td>
                      <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "12.5px" }}>
                        {order.productionNo}
                      </span>
                      {order.currentCycleNo && order.currentCycleNo !== 0 && (
                        <span style={{ marginLeft: "4px", fontSize: "10px", background: "#fef3c7", color: "#b45309", padding: "1px 5px", borderRadius: "3px", fontWeight: 700 }}>
                          Cycle {order.currentCycleNo}
                        </span>
                      )}
                    </td>

                    {/* Job No */}
                    <td style={{ fontSize: "12px", color: "#475569" }}>
                      {order.jobNo}
                    </td>

                    {/* Customer */}
                    <td>
                      <strong style={{ color: "#0f172a", fontSize: "12.5px" }}>
                        {order.customerName}
                      </strong>
                      <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                        {order.customerCode} • {order.customerMobile}
                      </div>
                    </td>

                    {/* Product Item */}
                    <td style={{ fontSize: "12px", color: "#334155" }}>
                      {order.productName || "Print Job"}
                    </td>

                    {/* Produced Qty */}
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#0f172a" }}>
                      {(order.producedQty || order.plannedQty || 1000).toLocaleString()} pcs
                    </td>

                    {/* Production Status */}
                    <td style={{ textAlign: "center" }}>
                      <span className="prod-status-tag completed" style={{ fontSize: "10px" }}>
                        {order.status || "QC"}
                      </span>
                    </td>

                    {/* Priority */}
                    <td style={{ textAlign: "center" }}>
                      <span style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        color: order.priority === "HIGH" ? "#dc2626" : "#475569"
                      }}>
                        {order.priority || "NORMAL"}
                      </span>
                    </td>

                    {/* Completed At */}
                    <td style={{ textAlign: "center", fontSize: "11px", color: "#64748b" }}>
                      {order.completedAt ? new Date(order.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "10:45 AM"}
                    </td>

                    {/* QC Status */}
                    <td style={{ textAlign: "center" }}>
                      {isPassed ? (
                        <span className="qc-status-pill passed">
                          <CheckCircle2 size={10} /> PASSED
                        </span>
                      ) : isRework ? (
                        <span className="qc-status-pill rework">
                          <AlertTriangle size={10} /> REWORK
                        </span>
                      ) : isReprint ? (
                        <span className="qc-status-pill reprint">
                          <Printer size={10} /> REPRINT
                        </span>
                      ) : (
                        <span className="qc-status-pill pending">
                          <Clock size={10} /> PENDING
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: "right", paddingRight: "16px" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        <button
                          type="button"
                          className="qc-btn-primary"
                          style={{ padding: "5px 12px", fontSize: "11.5px" }}
                          onClick={() => onSelectOrderForInspection(orderId)}
                        >
                          <ShieldCheck size={12} /> Inspect
                        </button>

                        <button
                          type="button"
                          className="qc-btn-secondary"
                          style={{ padding: "5px 8px", color: "#64748b" }}
                          title="View Lifecycle Timeline"
                          onClick={() => setSelectedOrderForHistory({
                            id: orderId,
                            productionNo: order.productionNo
                          })}
                        >
                          <History size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* QC History Timeline Modal */}
      {selectedOrderForHistory && (
        <QcHistoryTimelineModal
          isOpen={Boolean(selectedOrderForHistory)}
          onClose={() => setSelectedOrderForHistory(null)}
          productionOrderId={selectedOrderForHistory.id}
          productionNo={selectedOrderForHistory.productionNo}
        />
      )}
    </div>
  );
}
