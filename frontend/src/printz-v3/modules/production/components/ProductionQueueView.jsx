import React, { useState, useEffect } from "react";
import {
  Layers,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  PauseCircle,
  Search,
  Filter,
  RefreshCw,
  Printer,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Cpu,
  User,
  Activity
} from "lucide-react";
import {
  getProductionQueue,
  startProductionOperation,
  completeProductionOperation,
  holdProductionOrder,
  resumeProductionOrder,
  getAvailableMachines
} from "../api/productionApi";
import StartOperationModal from "./StartOperationModal";
import CompleteOperationModal from "./CompleteOperationModal";
import HoldOrderModal from "./HoldOrderModal";
import JobCardPrintModal from "./JobCardPrintModal";

export default function ProductionQueueView({
  onSelectOperation,
  onNavigateToPlanning,
  branchName = "Kothanur",
  currentUser = { name: "Karthik V", role: "Operator" }
}) {
  const [queueData, setQueueData] = useState({
    operations: [],
    metrics: { total: 0, ready: 0, running: 0, blocked: 0, completed: 0, onHold: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [machines, setMachines] = useState([]);

  // Modals state
  const [selectedOpForStart, setSelectedOpForStart] = useState(null);
  const [selectedOpForComplete, setSelectedOpForComplete] = useState(null);
  const [selectedOrderForHold, setSelectedOrderForHold] = useState(null);
  const [selectedOrderForTraveler, setSelectedOrderForTraveler] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await getProductionQueue({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
        search: searchQuery || undefined
      });
      setQueueData(res || { operations: [], metrics: {} });
    } catch (err) {
      console.error("Failed to load production queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    getAvailableMachines().then((res) => setMachines(res || [])).catch(() => {});
  }, [statusFilter, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQueue();
  };

  const handleStartOperation = async (payload) => {
    if (!selectedOpForStart) return;
    try {
      await startProductionOperation(selectedOpForStart.id, payload);
      fetchQueue();
      // If user started it, optionally open execution screen directly
      if (onSelectOperation) {
        onSelectOperation(selectedOpForStart.id);
      }
    } catch (err) {
      console.error("Error starting operation:", err);
    }
  };

  const handleCompleteOperation = async (payload) => {
    if (!selectedOpForComplete) return;
    try {
      await completeProductionOperation(selectedOpForComplete.id, payload);
      fetchQueue();
    } catch (err) {
      console.error("Error completing operation:", err);
    }
  };

  const handleHoldOrder = async (payload) => {
    if (!selectedOrderForHold) return;
    try {
      await holdProductionOrder(selectedOrderForHold.id, payload);
      fetchQueue();
    } catch (err) {
      console.error("Error holding order:", err);
    }
  };

  const handleResumeOrder = async (orderId) => {
    try {
      await resumeProductionOrder(orderId, { notes: "Resumed by operator" });
      fetchQueue();
    } catch (err) {
      console.error("Error resuming order:", err);
    }
  };

  const opsList = Array.isArray(queueData) ? queueData : (queueData.operations || []);
  const filteredOps = opsList.filter((op) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (op.productionNo && op.productionNo.toLowerCase().includes(q)) ||
      (op.jobNo && op.jobNo.toLowerCase().includes(q)) ||
      (op.customerName && op.customerName.toLowerCase().includes(q)) ||
      (op.operationName && op.operationName.toLowerCase().includes(q)) ||
      (op.name && op.name.toLowerCase().includes(q)) ||
      (op.assignedMachine && op.assignedMachine.toLowerCase().includes(q)) ||
      (op.operator && op.operator.toLowerCase().includes(q))
    );
  });

  const metrics = queueData.metrics || {
    total: opsList.length,
    ready: opsList.filter((o) => o.isReady || o.status === "READY" || o.status === "CLAIMED").length,
    running: opsList.filter((o) => o.isRunning || o.status === "RUNNING").length,
    blocked: opsList.filter((o) => o.isBlocked || o.status === "BLOCKED").length,
    completed: opsList.filter((o) => o.isCompleted || o.status === "COMPLETED").length,
    onHold: opsList.filter((o) => o.isOnHold || o.status === "ON_HOLD").length
  };

  return (
    <div className="prod-container">
      {/* Header Bar */}
      <div className="prod-header-bar">
        <div className="prod-title-group">
          <div className="prod-breadcrumb">
            <span className="prod-breadcrumb-link" onClick={onNavigateToPlanning}>
              Production Planning
            </span>
            <span>/</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>Production Queue & Execution</span>
          </div>
          <h1 className="prod-title">
            <Activity size={22} color="#047857" />
            Live Production Queue
          </h1>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={fetchQueue}
            className="prod-btn-secondary"
            title="Refresh queue"
          >
            <RefreshCw size={13} className={loading ? "prod-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={onNavigateToPlanning}
            className="prod-btn-primary"
          >
            + New Production Plan
          </button>
        </div>
      </div>

      {/* Metric KPI Cards Bar */}
      <div className="prod-kpi-grid">
        <div
          className="prod-kpi-card"
          style={{ cursor: "pointer", borderColor: statusFilter === "ALL" ? "#047857" : "#e2e8f0" }}
          onClick={() => setStatusFilter("ALL")}
        >
          <div className="prod-kpi-title">
            <Layers size={13} /> Total Operations
          </div>
          <div className="prod-kpi-value">{metrics.total || 0}</div>
          <div className="prod-kpi-sub">Across all planned orders</div>
        </div>

        <div
          className="prod-kpi-card"
          style={{ cursor: "pointer", borderColor: statusFilter === "READY" ? "#16a34a" : "#e2e8f0", background: statusFilter === "READY" ? "#f0fdf4" : "#ffffff" }}
          onClick={() => setStatusFilter("READY")}
        >
          <div className="prod-kpi-title" style={{ color: "#16a34a" }}>
            <Play size={13} /> Ready To Start
          </div>
          <div className="prod-kpi-value" style={{ color: "#16a34a" }}>{metrics.ready || 0}</div>
          <div className="prod-kpi-sub">Predecessor completed</div>
        </div>

        <div
          className="prod-kpi-card"
          style={{ cursor: "pointer", borderColor: statusFilter === "RUNNING" ? "#d97706" : "#e2e8f0", background: statusFilter === "RUNNING" ? "#fffbeb" : "#ffffff" }}
          onClick={() => setStatusFilter("RUNNING")}
        >
          <div className="prod-kpi-title" style={{ color: "#d97706" }}>
            <Clock size={13} /> In-Progress / Running
          </div>
          <div className="prod-kpi-value" style={{ color: "#d97706" }}>{metrics.running || 0}</div>
          <div className="prod-kpi-sub">Active on shop floor</div>
        </div>

        <div
          className="prod-kpi-card"
          style={{ cursor: "pointer", borderColor: statusFilter === "BLOCKED" ? "#64748b" : "#e2e8f0" }}
          onClick={() => setStatusFilter("BLOCKED")}
        >
          <div className="prod-kpi-title">
            <AlertCircle size={13} /> Blocked / Queued
          </div>
          <div className="prod-kpi-value" style={{ color: "#64748b" }}>{metrics.blocked || 0}</div>
          <div className="prod-kpi-sub">Awaiting prior sequence</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="prod-card" style={{ marginBottom: "16px", padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", flex: "1 1 300px", maxWidth: "450px" }}>
            <div style={{ position: "relative", width: "100%" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }} />
              <input
                type="text"
                className="prod-form-input"
                style={{ paddingLeft: "32px", fontSize: "12px" }}
                placeholder="Search by Order #, Job #, Customer, Machine, Operator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="prod-btn-secondary" style={{ padding: "6px 12px" }}>
              Search
            </button>
          </form>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Status:</span>
              <select
                className="prod-form-input"
                style={{ width: "auto", padding: "5px 10px", fontSize: "12px" }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="READY">Ready to Start</option>
                <option value="RUNNING">In-Progress (Running)</option>
                <option value="BLOCKED">Blocked (In Queue)</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On Hold</option>
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
                <option value="URGENT">Urgent / Express</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Operations Queue Table */}
      <div className="prod-card" style={{ padding: "0", overflow: "hidden" }}>
        <table className="prod-table" style={{ width: "100%", margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: "50px", textAlign: "center" }}>Seq</th>
              <th>Order / Job Reference</th>
              <th>Operation / Workstation</th>
              <th>Assigned Machine</th>
              <th>Assigned Operator</th>
              <th style={{ textAlign: "center" }}>Target Qty</th>
              <th style={{ textAlign: "center" }}>Output / Waste</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "right", paddingRight: "20px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <RefreshCw size={24} className="prod-spin" style={{ margin: "0 auto 10px auto", display: "block", color: "#047857" }} />
                  Loading live production queue operations...
                </td>
              </tr>
            ) : filteredOps.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <Layers size={32} style={{ margin: "0 auto 10px auto", display: "block", opacity: 0.3 }} />
                  No production operations match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredOps.map((op) => {
                const isReady = op.computedStatus === "READY" || op.status === "READY";
                const isRunning = op.status === "RUNNING";
                const isBlocked = op.computedStatus === "BLOCKED" || op.status === "BLOCKED" || (op.status === "PENDING" && !isReady);
                const isCompleted = op.status === "COMPLETED";
                const isOnHold = op.status === "ON_HOLD" || op.orderStatus === "ON_HOLD";

                return (
                  <tr
                    key={op.id || `${op.productionOrderId}-${op.sequenceNo}`}
                    style={{
                      backgroundColor: isRunning ? "#fefce8" : "inherit",
                      transition: "background-color 0.15s ease"
                    }}
                  >
                    {/* Sequence # */}
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#0f172a" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: isCompleted ? "#dcfce7" : isRunning ? "#fef3c7" : "#f1f5f9",
                        color: isCompleted ? "#15803d" : isRunning ? "#b45309" : "#475569",
                        fontSize: "11px"
                      }}>
                        {op.sequenceNo}
                      </span>
                    </td>

                    {/* Order & Job Info */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "12.5px" }}>
                          {op.productionNo}
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {op.jobNo} • <strong>{op.customerName}</strong>
                        </span>
                        <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                          {op.productName}
                        </span>
                      </div>
                    </td>

                    {/* Operation */}
                    <td>
                      <div>
                        <strong style={{ color: "#0f172a", fontSize: "12.5px" }}>
                          {op.name || op.operationName}
                        </strong>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          Type: <span style={{ textTransform: "capitalize" }}>{(op.type || op.operationType || "Station").toLowerCase()}</span> • Est: {op.estimatedMinutes || 25}m
                        </div>
                      </div>
                    </td>

                    {/* Machine */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "#334155" }}>
                        <Cpu size={13} color="#64748b" />
                        <span>{op.assignedMachine || op.machine || "Any Available"}</span>
                      </div>
                    </td>

                    {/* Operator */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "#334155" }}>
                        <User size={13} color="#64748b" />
                        <span>{op.operator || "Unassigned"}</span>
                      </div>
                    </td>

                    {/* Planned Qty */}
                    <td style={{ textAlign: "center", fontWeight: 600, color: "#0f172a", fontSize: "12px" }}>
                      {(op.plannedQty || 1000).toLocaleString()} pcs
                    </td>

                    {/* Output / Waste */}
                    <td style={{ textAlign: "center", fontSize: "11.5px" }}>
                      {isCompleted ? (
                        <div>
                          <strong style={{ color: "#047857" }}>{(op.completedQty || op.plannedQty || 0).toLocaleString()}</strong>
                          <span style={{ color: "#94a3b8", marginLeft: "4px" }}>
                            ({op.wastageQty || 0} w)
                          </span>
                        </div>
                      ) : isRunning ? (
                        <span style={{ color: "#b45309", fontWeight: 600 }}>In Process</span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td style={{ textAlign: "center" }}>
                      {isOnHold ? (
                        <span className="prod-status-tag on-hold">
                          <PauseCircle size={11} /> On Hold
                        </span>
                      ) : isRunning ? (
                        <span className="prod-status-tag running">
                          <Clock size={11} /> Running
                        </span>
                      ) : isReady ? (
                        <span className="prod-status-tag ready">
                          <Play size={11} /> Ready
                        </span>
                      ) : isCompleted ? (
                        <span className="prod-status-tag completed">
                          <CheckCircle2 size={11} /> Completed
                        </span>
                      ) : (
                        <span className="prod-status-tag blocked" title="Waiting on preceding sequence step">
                          <AlertCircle size={11} /> Queued
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: "right", paddingRight: "16px" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        {isReady && !isOnHold && (
                          <button
                            type="button"
                            className="prod-btn-primary"
                            style={{ padding: "5px 10px", fontSize: "11.5px", background: "#047857" }}
                            onClick={() => setSelectedOpForStart(op)}
                          >
                            <Play size={12} /> Start
                          </button>
                        )}

                        {isRunning && !isOnHold && (
                          <>
                            <button
                              type="button"
                              className="prod-btn-primary"
                              style={{ padding: "5px 10px", fontSize: "11.5px", background: "#0284c7", borderColor: "#0284c7" }}
                              onClick={() => onSelectOperation && onSelectOperation(op.id)}
                            >
                              <Activity size={12} /> Live Console
                            </button>
                            <button
                              type="button"
                              className="prod-btn-primary"
                              style={{ padding: "5px 10px", fontSize: "11.5px", background: "#16a34a", borderColor: "#16a34a" }}
                              onClick={() => setSelectedOpForComplete(op)}
                            >
                              <CheckCircle2 size={12} /> Complete
                            </button>
                          </>
                        )}

                        {isBlocked && (
                          <button
                            type="button"
                            className="prod-btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "11px", opacity: 0.7 }}
                            disabled
                            title="Cannot start until previous sequence finishes"
                          >
                            Waiting Step {op.sequenceNo - 1}
                          </button>
                        )}

                        {isCompleted && (
                          <button
                            type="button"
                            className="prod-btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => onSelectOperation && onSelectOperation(op.id)}
                          >
                            View Record
                          </button>
                        )}

                        {/* Order Actions: Traveler / Hold */}
                        <button
                          type="button"
                          className="prod-btn-secondary"
                          style={{ padding: "5px", color: "#64748b" }}
                          title="Print Job Traveler Card"
                          onClick={() => setSelectedOrderForTraveler({
                            productionNo: op.productionNo,
                            jobNo: op.jobNo,
                            customerName: op.customerName,
                            customerMobile: op.customerMobile,
                            customerCode: op.customerCode,
                            productName: op.productName,
                            requiredQty: op.plannedQty,
                            plannedQty: op.plannedQty,
                            priority: op.priority,
                            operations: filteredOps.filter(o => o.productionNo === op.productionNo)
                          })}
                        >
                          <Printer size={13} />
                        </button>

                        {!isCompleted && (
                          isOnHold ? (
                            <button
                              type="button"
                              className="prod-btn-secondary"
                              style={{ padding: "4px 8px", fontSize: "11px", color: "#047857", borderColor: "#86efac" }}
                              onClick={() => handleResumeOrder(op.productionOrderId || op.productionNo)}
                            >
                              Resume
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="prod-btn-secondary"
                              style={{ padding: "4px 8px", fontSize: "11px", color: "#dc2626" }}
                              title="Place order on hold"
                              onClick={() => setSelectedOrderForHold({
                                id: op.productionOrderId || op.productionNo,
                                productionNo: op.productionNo,
                                customerName: op.customerName
                              })}
                            >
                              Hold
                            </button>
                          )
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

      {/* Start Operation Modal */}
      <StartOperationModal
        isOpen={Boolean(selectedOpForStart)}
        onClose={() => setSelectedOpForStart(null)}
        operation={selectedOpForStart}
        productionOrder={selectedOpForStart}
        onConfirmStart={handleStartOperation}
        currentUser={currentUser}
        machines={machines}
      />

      {/* Complete Operation Modal */}
      <CompleteOperationModal
        isOpen={Boolean(selectedOpForComplete)}
        onClose={() => setSelectedOpForComplete(null)}
        operation={selectedOpForComplete}
        productionOrder={selectedOpForComplete}
        onConfirmComplete={handleCompleteOperation}
      />

      {/* Hold Order Modal */}
      <HoldOrderModal
        isOpen={Boolean(selectedOrderForHold)}
        onClose={() => setSelectedOrderForHold(null)}
        productionOrder={selectedOrderForHold}
        onConfirmHold={handleHoldOrder}
      />

      {/* Job Card Printable Traveler */}
      <JobCardPrintModal
        isOpen={Boolean(selectedOrderForTraveler)}
        onClose={() => setSelectedOrderForTraveler(null)}
        productionOrder={selectedOrderForTraveler}
      />
    </div>
  );
}
