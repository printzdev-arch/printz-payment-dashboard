import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  Play,
  CheckCircle2,
  PauseCircle,
  Printer,
  Clock,
  AlertCircle,
  Layers,
  Cpu,
  User,
  Sparkles,
  FileCheck,
  AlertTriangle,
  ChevronRight,
  Eye,
  Check
} from "lucide-react";
import {
  getOperationDetails,
  startProductionOperation,
  completeProductionOperation,
  holdProductionOrder,
  resumeProductionOrder,
  getAvailableMachines
} from "../api/productionApi";
import HoldOrderModal from "./HoldOrderModal";
import JobCardPrintModal from "./JobCardPrintModal";

export default function OperationExecutionView({
  operationId,
  onBack,
  onSelectNextOperation,
  currentUser = { name: "Karthik V", role: "Operator" },
  branchName = "Kothanur"
}) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [machines, setMachines] = useState([]);

  // Live execution form state
  const [selectedMachine, setSelectedMachine] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [inputQty, setInputQty] = useState(1000);
  const [outputQty, setOutputQty] = useState(1000);
  const [wastageQty, setWastageQty] = useState(0);
  const [wastageReason, setWastageReason] = useState("Setup / Make-Ready");
  const [remarks, setRemarks] = useState("");
  const [materials, setMaterials] = useState([]);

  // Modals
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [isJobCardModalOpen, setIsJobCardModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live elapsed timer for running operations
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOperationDetails(operationId);
      setData(res);
      const op = res?.operation;
      if (op) {
        setSelectedMachine(op.assignedMachine || op.machine || "");
        setOperatorName(op.operator || currentUser?.name || "Karthik V");
        setInputQty(op.inputQty || op.plannedQty || res.productionOrder?.plannedQty || 1000);
        setOutputQty(op.completedQty || op.plannedQty || res.productionOrder?.plannedQty || 1000);
        setWastageQty(op.wastageQty || 0);
        setWastageReason(op.wastageReason || "Setup / Make-Ready");
        setRemarks(op.processRemarks || "");

        // Set materials if available
        if (op.materialsConsumed && op.materialsConsumed.length > 0) {
          setMaterials(op.materialsConsumed);
        } else if (res.productionOrder?.materialsPlanned) {
          setMaterials(
            res.productionOrder.materialsPlanned.map((m) => ({
              ...m,
              actualQty: m.plannedQty || m.quantity || 1
            }))
          );
        }
      }
    } catch (err) {
      console.error("Failed to fetch operation details:", err);
      setError("Unable to load operation execution details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (operationId) {
      fetchDetails();
    }
    getAvailableMachines().then((res) => setMachines(res || [])).catch(() => {});
  }, [operationId]);

  // Elapsed timer tick
  useEffect(() => {
    let interval = null;
    if (data?.operation?.status === "RUNNING") {
      const startTimestamp = data.operation.startAt ? new Date(data.operation.startAt).getTime() : Date.now();
      interval = setInterval(() => {
        const now = Date.now();
        const diffSecs = Math.max(0, Math.floor((now - startTimestamp) / 1000));
        setElapsedSeconds(diffSecs);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [data?.operation?.status, data?.operation?.startAt]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    setIsSubmitting(true);
    try {
      await startProductionOperation(operationId, {
        machine: selectedMachine,
        operator: operatorName,
        notes: remarks
      });
      await fetchDetails();
    } catch (err) {
      console.error("Failed to start operation:", err);
      alert(err.response?.data?.message || "Failed to start operation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      await completeProductionOperation(operationId, {
        completedQty: Number(outputQty),
        wastageQty: Number(wastageQty),
        wastageReason: Number(wastageQty) > 0 ? wastageReason : "",
        processRemarks: remarks,
        materialsConsumed: materials
      });
      await fetchDetails();
    } catch (err) {
      console.error("Failed to complete operation:", err);
      alert(err.response?.data?.message || "Failed to complete operation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHold = async (payload) => {
    if (!data?.productionOrder) return;
    try {
      await holdProductionOrder(data.productionOrder.id, payload);
      await fetchDetails();
    } catch (err) {
      console.error("Failed to hold order:", err);
    }
  };

  const handleResume = async () => {
    if (!data?.productionOrder) return;
    try {
      await resumeProductionOrder(data.productionOrder.id, { notes: "Resumed from live console" });
      await fetchDetails();
    } catch (err) {
      console.error("Failed to resume order:", err);
    }
  };

  if (loading) {
    return (
      <div className="prod-container" style={{ textAlign: "center", padding: "80px 20px" }}>
        <Activity size={32} className="prod-spin" style={{ margin: "0 auto 12px auto", color: "#047857" }} />
        <h3 style={{ color: "#0f172a", fontSize: "16px" }}>Loading Operation Execution Console...</h3>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="prod-container" style={{ textAlign: "center", padding: "80px 20px" }}>
        <AlertCircle size={32} color="#dc2626" style={{ margin: "0 auto 12px auto" }} />
        <h3 style={{ color: "#0f172a", fontSize: "16px" }}>{error || "Operation not found."}</h3>
        <button type="button" onClick={onBack} className="prod-btn-primary" style={{ marginTop: "16px" }}>
          <ArrowLeft size={14} /> Back to Production Queue
        </button>
      </div>
    );
  }

  const { operation, productionOrder, allOperations = [] } = data;
  const isCompleted = operation.status === "COMPLETED";
  const isRunning = operation.status === "RUNNING";
  const isOnHold = productionOrder?.status === "ON_HOLD" || operation.status === "ON_HOLD";
  const isReady = !isCompleted && !isRunning && !isOnHold;

  // Find next operation in sequence
  const nextOp = allOperations.find((op) => op.sequenceNo === operation.sequenceNo + 1);

  return (
    <div className="prod-container">
      {/* Header Bar matching Screenshot 1 & 2 */}
      <div className="prod-header-bar">
        <div className="prod-title-group">
          <div className="prod-breadcrumb">
            <span className="prod-breadcrumb-link" onClick={onBack}>
              Production Queue
            </span>
            <span>/</span>
            <span className="prod-breadcrumb-link" onClick={onBack}>
              {productionOrder.productionNo}
            </span>
            <span>/</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>
              Step {operation.sequenceNo}: {operation.name || operation.operationName}
            </span>
          </div>
          <h1 className="prod-title">
            <Activity size={22} color="#047857" />
            {operation.name || operation.operationName} • {productionOrder.productionNo}
          </h1>
          <p className="prod-subtitle">
            Job Ref: <strong>{productionOrder.jobNo}</strong> • Customer: <strong>{productionOrder.customerName}</strong> • Lead Operator: <strong>{operatorName || "Karthik V"}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button type="button" onClick={onBack} className="prod-btn-secondary">
            <ArrowLeft size={14} /> Back to Queue
          </button>

          <button
            type="button"
            onClick={() => setIsJobCardModalOpen(true)}
            className="prod-btn-secondary"
            title="Print Job Traveler Card"
          >
            <Printer size={14} /> Print Job Card
          </button>

          {isOnHold ? (
            <button
              type="button"
              onClick={handleResume}
              className="prod-btn-primary"
              style={{ background: "#047857" }}
            >
              Resume Order ▶
            </button>
          ) : (
            !isCompleted && (
              <button
                type="button"
                onClick={() => setIsHoldModalOpen(true)}
                className="prod-btn-secondary"
                style={{ color: "#dc2626", borderColor: "#fca5a5" }}
              >
                <PauseCircle size={14} /> Hold Order
              </button>
            )
          )}
        </div>
      </div>

      {/* Stepper Progress Bar matching PrintZ Workflow */}
      <div className="prod-stepper-container" style={{ marginBottom: "20px" }}>
        <div className="prod-stepper-track">
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Enquiry</span>
            <span className="prod-step-sub">15 Sep</span>
          </div>
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Estimation</span>
            <span className="prod-step-sub">16 Sep</span>
          </div>
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Design</span>
            <span className="prod-step-sub">17 Sep</span>
          </div>
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Sample Approval</span>
            <span className="prod-step-sub">18 Sep</span>
          </div>
          <div className={`prod-step-item ${operation.sequenceNo === 1 ? "prod-step-active" : operation.sequenceNo > 1 ? "prod-step-completed" : ""}`}>
            <div className="prod-step-icon-wrap">
              {operation.sequenceNo > 1 ? "✓" : "5"}
            </div>
            <span className="prod-step-label">Printing</span>
            <span className="prod-step-sub">{operation.sequenceNo === 1 ? (isRunning ? "Running" : isCompleted ? "Done" : "Ready") : "Step 1"}</span>
          </div>
          <div className={`prod-step-item ${operation.sequenceNo === 2 ? "prod-step-active" : operation.sequenceNo > 2 ? "prod-step-completed" : ""}`}>
            <div className="prod-step-icon-wrap">
              {operation.sequenceNo > 2 ? "✓" : "6"}
            </div>
            <span className="prod-step-label">Finishing</span>
            <span className="prod-step-sub">{operation.sequenceNo === 2 ? (isRunning ? "Running" : isCompleted ? "Done" : "Ready") : "Step 2"}</span>
          </div>
          <div className="prod-step-item">
            <div className="prod-step-icon-wrap">7</div>
            <span className="prod-step-label">Packing</span>
            <span className="prod-step-sub">Upcoming</span>
          </div>
          <div className="prod-step-item">
            <div className="prod-step-icon-wrap">8</div>
            <span className="prod-step-label">QC</span>
            <span className="prod-step-sub">Upcoming</span>
          </div>
          <div className="prod-step-item">
            <div className="prod-step-icon-wrap">9</div>
            <span className="prod-step-label">Ready</span>
            <span className="prod-step-sub">Pending</span>
          </div>
          <div className="prod-step-item">
            <div className="prod-step-icon-wrap">10</div>
            <span className="prod-step-label">Delivered</span>
            <span className="prod-step-sub">Pending</span>
          </div>
          <div className="prod-step-item">
            <div className="prod-step-icon-wrap">11</div>
            <span className="prod-step-label">Invoiced</span>
            <span className="prod-step-sub">Pending</span>
          </div>
        </div>
      </div>

      {/* Main Execution Layout Grid (8 cols / 4 cols) */}
      <div className="prod-exec-layout">
        {/* LEFT COLUMN: Metrics, Specs, Sample, Sequence Table */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* KPI Metrics */}
          <div className="prod-kpi-grid">
            <div className="prod-kpi-card">
              <div className="prod-kpi-title">
                <Layers size={13} /> Target Qty
              </div>
              <div className="prod-kpi-value">{(operation.plannedQty || productionOrder.plannedQty || 1000).toLocaleString()}</div>
              <div className="prod-kpi-sub">Planned output units</div>
            </div>

            <div className="prod-kpi-card">
              <div className="prod-kpi-title" style={{ color: "#047857" }}>
                <CheckCircle2 size={13} /> Good Output
              </div>
              <div className="prod-kpi-value" style={{ color: "#047857" }}>
                {isCompleted ? (operation.completedQty || 0).toLocaleString() : isRunning ? Number(outputQty || 0).toLocaleString() : "—"}
              </div>
              <div className="prod-kpi-sub">{isCompleted ? "Verified good pieces" : "Estimated good units"}</div>
            </div>

            <div className="prod-kpi-card">
              <div className="prod-kpi-title" style={{ color: "#d97706" }}>
                <AlertTriangle size={13} /> Wastage Recorded
              </div>
              <div className="prod-kpi-value" style={{ color: Number(wastageQty) > 0 ? "#dc2626" : "#0f172a" }}>
                {isCompleted ? `${operation.wastageQty || 0} pcs` : isRunning ? `${wastageQty || 0} pcs` : "0 pcs"}
              </div>
              <div className="prod-kpi-sub">Make-ready / Setup scrap</div>
            </div>

            <div className="prod-kpi-card">
              <div className="prod-kpi-title">
                <Clock size={13} /> Est. Duration
              </div>
              <div className="prod-kpi-value">{operation.estimatedMinutes || 25}m</div>
              <div className="prod-kpi-sub">Cycle {productionOrder.currentCycleNo || 0}</div>
            </div>
          </div>

          {/* Job Specifications Card */}
          <div className="prod-card">
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
              <Cpu size={16} color="#047857" />
              Technical Job Specifications & Parameters
            </h3>
            <div className="prod-spec-grid">
              <div className="prod-spec-item">
                <span className="prod-spec-label">Paper / Stock</span>
                <span className="prod-spec-val">{productionOrder.requirementSnapshot?.paper || "Art Card 350 GSM"}</span>
              </div>
              <div className="prod-spec-item">
                <span className="prod-spec-label">Finished Size</span>
                <span className="prod-spec-val">{productionOrder.requirementSnapshot?.size || "3.5 x 2.0 inches"}</span>
              </div>
              <div className="prod-spec-item">
                <span className="prod-spec-label">Color / Printing</span>
                <span className="prod-spec-val">{productionOrder.requirementSnapshot?.colors || "4/4 Full Color (CMYK)"}</span>
              </div>
              <div className="prod-spec-item">
                <span className="prod-spec-label">Lamination</span>
                <span className="prod-spec-val">{productionOrder.requirementSnapshot?.lamination || "Velvet Matte Both Sides"}</span>
              </div>
              <div className="prod-spec-item">
                <span className="prod-spec-label">Special Finishing</span>
                <span className="prod-spec-val">{productionOrder.requirementSnapshot?.finishing || "Spot UV Front + Gold Foil"}</span>
              </div>
              <div className="prod-spec-item">
                <span className="prod-spec-label">Cutting / Die</span>
                <span className="prod-spec-val">{productionOrder.requirementSnapshot?.cutting || "Die Cut + Rounded Corners"}</span>
              </div>
            </div>
          </div>

          {/* Approved Proof / Sample Preview Card (Screenshot 1 & 2 reference) */}
          <div className="prod-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={16} color="#d97706" />
                Approved Customer Design Sample (V2)
              </h3>
              <span style={{ fontSize: "11px", color: "#047857", background: "#dcfce7", padding: "3px 8px", borderRadius: "12px", fontWeight: 600 }}>
                Approved by Customer on 18 Sep
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "16px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{
                height: "110px",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                borderRadius: "6px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#f8fafc",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
              }}>
                <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#fbbf24" }}>
                  APEX GLOBAL
                </div>
                <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>
                  LUXURY BUSINESS CARDS
                </div>
                <div style={{ position: "absolute", bottom: "4px", right: "6px", fontSize: "8.5px", background: "rgba(0,0,0,0.6)", padding: "1px 4px", borderRadius: "3px", color: "#34d399" }}>
                  PROOF v2.0
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", justifyContent: "center", gap: "4px" }}>
                <div><strong>Proof Reference:</strong> {productionOrder.approvedSample?.version || "Proof_ApexCards_v2.pdf"}</div>
                <div><strong>Color Profile:</strong> ISO Coated v2 (300 DPI High-Res)</div>
                <div><strong>Bleed & Trim:</strong> 3mm Bleed, 2mm Safe Zone Verified</div>
                <div style={{ color: "#64748b", fontSize: "11px", marginTop: "2px" }}>
                  * Operators must ensure color registration and foil alignment match this approved sample.
                </div>
              </div>
            </div>
          </div>

          {/* Full Production Sequence Routing Table */}
          <div className="prod-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                <Layers size={16} color="#047857" />
                Production Routing Sequence ({allOperations.length} Steps)
              </h3>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Order: <strong>{productionOrder.productionNo}</strong></span>
            </div>

            <table className="prod-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}>#</th>
                  <th>Operation Name</th>
                  <th>Machine Station</th>
                  <th>Lead Operator</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "right", paddingRight: "16px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {allOperations.map((op) => {
                  const isCurrent = op.id === operation.id;
                  const isOpCompleted = op.status === "COMPLETED";
                  const isOpRunning = op.status === "RUNNING";
                  const isOpReady = op.computedStatus === "READY" || op.status === "READY";

                  return (
                    <tr
                      key={op.id || op.sequenceNo}
                      style={{
                        backgroundColor: isCurrent ? "#ecfdf5" : "inherit",
                        fontWeight: isCurrent ? 600 : 400
                      }}
                    >
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {op.sequenceNo}
                      </td>
                      <td>
                        <strong style={{ color: isCurrent ? "#047857" : "#0f172a" }}>
                          {op.name || op.operationName}
                        </strong>
                        {isCurrent && <span style={{ marginLeft: "6px", fontSize: "10.5px", color: "#047857" }}>(Current View)</span>}
                      </td>
                      <td style={{ fontSize: "11.5px", color: "#475569" }}>
                        {op.assignedMachine || op.machine || "Available"}
                      </td>
                      <td style={{ fontSize: "11.5px", color: "#475569" }}>
                        {op.operator || "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isOpCompleted ? (
                          <span className="prod-status-tag completed" style={{ fontSize: "10px", padding: "2px 8px" }}>
                            <Check size={10} /> Done
                          </span>
                        ) : isOpRunning ? (
                          <span className="prod-status-tag running" style={{ fontSize: "10px", padding: "2px 8px" }}>
                            <Clock size={10} /> Running
                          </span>
                        ) : isOpReady ? (
                          <span className="prod-status-tag ready" style={{ fontSize: "10px", padding: "2px 8px" }}>
                            <Play size={10} /> Ready
                          </span>
                        ) : (
                          <span className="prod-status-tag blocked" style={{ fontSize: "10px", padding: "2px 8px" }}>
                            Queued
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "16px" }}>
                        {!isCurrent && (
                          <button
                            type="button"
                            className="prod-btn-secondary"
                            style={{ padding: "3px 8px", fontSize: "10.5px" }}
                            onClick={() => onSelectNextOperation && onSelectNextOperation(op.id)}
                          >
                            Switch <ChevronRight size={10} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Operation Execution Console (Screenshot 1 & 2) */}
        <div className="prod-exec-card">
          <div className="prod-exec-card-header">
            <div className="prod-exec-card-title">
              <Activity size={16} />
              Operation Execution Console
            </div>
            {isRunning && (
              <div className="prod-timer-badge">
                <Clock size={12} color="#047857" />
                {formatTimer(elapsedSeconds)}
              </div>
            )}
          </div>

          <div className="prod-exec-card-body">
            {/* Status Indicator Banner */}
            <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Current Stage Status:</span>
              {isOnHold ? (
                <span className="prod-status-tag on-hold">
                  <PauseCircle size={12} /> ON HOLD
                </span>
              ) : isRunning ? (
                <span className="prod-status-tag running">
                  <Clock size={12} /> ACTIVE / RUNNING
                </span>
              ) : isCompleted ? (
                <span className="prod-status-tag completed">
                  <CheckCircle2 size={12} /> COMPLETED ✓
                </span>
              ) : isReady ? (
                <span className="prod-status-tag ready">
                  <Play size={12} /> READY TO START
                </span>
              ) : (
                <span className="prod-status-tag blocked">
                  <AlertCircle size={12} /> QUEUED (BLOCKED)
                </span>
              )}
            </div>

            {/* Execution Form */}
            <form onSubmit={handleComplete}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  <Cpu size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                  Machine Station
                </label>
                <select
                  className="prod-form-input"
                  value={selectedMachine}
                  onChange={(e) => setSelectedMachine(e.target.value)}
                  disabled={isCompleted || isSubmitting}
                  required
                >
                  <option value="">-- Select Machine --</option>
                  {machines.length > 0 ? (
                    machines.map((m) => (
                      <option key={m.id || m.machineId || m.name} value={m.name || m.machineName}>
                        {m.name || m.machineName} ({m.technology || m.type || "Active"})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Heidelberg Speedmaster XL 75">Heidelberg Speedmaster XL 75 (Offset)</option>
                      <option value="Konica Minolta AccurioPress C4080">Konica Minolta AccurioPress C4080 (Digital)</option>
                      <option value="Polar 115 High-Speed Cutter">Polar 115 High-Speed Cutter</option>
                      <option value="Komfi Amiga 52 Thermal Laminator">Komfi Amiga 52 Thermal Laminator</option>
                    </>
                  )}
                </select>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  <User size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                  Lead Operator
                </label>
                <input
                  type="text"
                  className="prod-form-input"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  disabled={isCompleted || isSubmitting}
                  required
                />
              </div>

              {/* Quantities Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Good Output (pcs) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="prod-form-input"
                    value={outputQty}
                    onChange={(e) => setOutputQty(e.target.value)}
                    disabled={isCompleted || isSubmitting || !isRunning}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Wastage / Scrap (pcs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="prod-form-input"
                    value={wastageQty}
                    onChange={(e) => setWastageQty(e.target.value)}
                    disabled={isCompleted || isSubmitting || !isRunning}
                  />
                </div>
              </div>

              {Number(wastageQty) > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    <AlertTriangle size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px", color: "#d97706" }} />
                    Wastage Reason
                  </label>
                  <select
                    className="prod-form-input"
                    value={wastageReason}
                    onChange={(e) => setWastageReason(e.target.value)}
                    disabled={isCompleted || isSubmitting || !isRunning}
                  >
                    <option value="Setup / Make-Ready">Setup / Make-Ready Waste</option>
                    <option value="Color Calibration / Registration">Color Calibration / Registration</option>
                    <option value="Paper Jam / Feed Issue">Paper Jam / Feed Issue</option>
                    <option value="Die-Cut / Crease Misalignment">Die-Cut / Crease Misalignment</option>
                    <option value="Coating / Foil Defect">Coating / Foil Defect</option>
                    <option value="Operator Trim Variation">Operator Trim Variation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              {/* Material Consumption Logging Table */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Material Consumption Record
                </label>
                <table className="prod-mat-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th style={{ textAlign: "right" }}>Actual Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.length > 0 ? (
                      materials.map((m, idx) => (
                        <tr key={idx}>
                          <td>{m.name || m.materialName || "Raw Material"}</td>
                          <td style={{ textAlign: "right" }}>
                            {isCompleted ? (
                              <span>{m.actualQty || m.quantity || m.plannedQty} {m.unit || "units"}</span>
                            ) : (
                              <input
                                type="number"
                                step="any"
                                style={{ width: "70px", padding: "2px 4px", fontSize: "11px", textAlign: "right", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                                value={m.actualQty !== undefined ? m.actualQty : m.plannedQty || 1}
                                onChange={(e) => {
                                  const updated = [...materials];
                                  updated[idx].actualQty = Number(e.target.value);
                                  setMaterials(updated);
                                }}
                                disabled={!isRunning}
                              />
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} style={{ color: "#94a3b8", textAlign: "center" }}>
                          Standard job consumables allocated
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Remarks */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Operator Process Notes / Observations
                </label>
                <textarea
                  className="prod-form-input"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Calibration, speed settings, registration notes..."
                  disabled={isCompleted || isSubmitting}
                />
              </div>

              {/* Action Buttons depending on state */}
              {isReady && !isOnHold && (
                <button
                  type="button"
                  onClick={handleStart}
                  className="prod-btn-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "10px", background: "#047857" }}
                  disabled={isSubmitting}
                >
                  <Play size={14} /> Start Operation Now ▶
                </button>
              )}

              {isRunning && !isOnHold && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    type="submit"
                    className="prod-btn-primary"
                    style={{ width: "100%", justifyContent: "center", padding: "10px", background: "#047857" }}
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 size={15} /> Confirm & Mark Completed ✓
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsHoldModalOpen(true)}
                    className="prod-btn-secondary"
                    style={{ width: "100%", justifyContent: "center", color: "#b45309", borderColor: "#fcd34d" }}
                  >
                    <PauseCircle size={14} /> Pause / Put On Hold
                  </button>
                </div>
              )}

              {isCompleted && (
                <div>
                  <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "12px", textAlign: "center", color: "#047857", marginBottom: "12px" }}>
                    <CheckCircle2 size={20} style={{ margin: "0 auto 4px auto" }} />
                    <div style={{ fontWeight: 700, fontSize: "13px" }}>Stage Completed Successfully!</div>
                    <div style={{ fontSize: "11.5px", color: "#065f46" }}>
                      Output: {operation.completedQty || outputQty} pcs • Waste: {operation.wastageQty || wastageQty} pcs
                    </div>
                  </div>

                  {nextOp ? (
                    <button
                      type="button"
                      onClick={() => onSelectNextOperation && onSelectNextOperation(nextOp.id)}
                      className="prod-btn-primary"
                      style={{ width: "100%", justifyContent: "center", padding: "10px", background: "#0284c7", borderColor: "#0284c7" }}
                    >
                      Proceed to Step {nextOp.sequenceNo}: {nextOp.name || nextOp.operationName} <ArrowLeft size={14} style={{ transform: "rotate(180deg)" }} />
                    </button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ textAlign: "center", fontSize: "11.5px", color: "#047857", background: "#f0fdf4", padding: "8px", borderRadius: "6px", fontWeight: 600 }}>
                        All operations completed! Ready for QC inspection.
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate("/v3/quality-control")}
                        className="prod-btn-primary"
                        style={{ width: "100%", justifyContent: "center", padding: "10px", background: "#059669", borderColor: "#059669", fontWeight: 700 }}
                      >
                        Proceed to Quality Control (Step 10) ➔
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isOnHold && (
                <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "12px", textAlign: "center", color: "#b91c1c" }}>
                  <PauseCircle size={20} style={{ margin: "0 auto 4px auto" }} />
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>Order is Currently ON HOLD</div>
                  <div style={{ fontSize: "11.5px" }}>Click 'Resume Order' in header to restart operations.</div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Hold Order Modal */}
      <HoldOrderModal
        isOpen={isHoldModalOpen}
        onClose={() => setIsHoldModalOpen(false)}
        productionOrder={productionOrder}
        onConfirmHold={handleHold}
      />

      {/* Printable Job Traveler Modal */}
      <JobCardPrintModal
        isOpen={isJobCardModalOpen}
        onClose={() => setIsJobCardModalOpen(false)}
        productionOrder={{
          ...productionOrder,
          operations: allOperations
        }}
      />
    </div>
  );
}
