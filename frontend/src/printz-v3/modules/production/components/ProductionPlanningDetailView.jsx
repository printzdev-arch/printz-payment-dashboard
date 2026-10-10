import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Building,
  User,
  Phone,
  Printer,
  Scissors,
  Package,
  Sparkles,
  Plus,
  Trash2,
  ArrowRight,
  Eye,
  Check
} from "lucide-react";
import CreateOrderConfirmModal from "./CreateOrderConfirmModal";
import OrderCreatedSuccessModal from "./OrderCreatedSuccessModal";
import { createProductionOrder, getAvailableMachines } from "../api/productionApi";

export default function ProductionPlanningDetailView({
  jobItem,
  onBack,
  onOrderCreated,
  branchName = "Kothanur"
}) {
  const navigate = useNavigate();
  if (!jobItem) return null;

  const [machines, setMachines] = useState([]);
  const [plannedQty, setPlannedQty] = useState(jobItem.requiredQuantity || 1000);
  const [priority, setPriority] = useState(jobItem.priority || "NORMAL");
  const [allowanceReason, setAllowanceReason] = useState("4% machine setup and trim allowance");
  const [plannedStart, setPlannedStart] = useState("2026-10-22");
  const [plannedStartTime, setPlannedStartTime] = useState("09:00");
  const [expectedCompletion, setExpectedCompletion] = useState(jobItem.dueDate || "2026-10-22");
  const [expectedCompletionTime, setExpectedCompletionTime] = useState("17:00");
  const [notes, setNotes] = useState(jobItem.requirementSnapshot?.customerNotes || "");
  
  // Operations sequence state initialized from suggestedOperations
  const [operations, setOperations] = useState(jobItem.suggestedOperations || [
    {
      operationCode: "PRINTING",
      operationName: "Printing",
      sequenceNo: 1,
      isRequired: true,
      estimatedMinutes: 30,
      defaultMachineId: "mach_001",
      defaultMachineName: "Konica Minolta 558E",
      remarks: "Digital colour print on Art Card 300 GSM"
    },
    {
      operationCode: "LAMINATION",
      operationName: "Lamination - Matt",
      sequenceNo: 2,
      isRequired: true,
      estimatedMinutes: 20,
      defaultMachineId: "mach_003",
      defaultMachineName: "Laminator L-02",
      remarks: "Thermal Matt lamination double side"
    },
    {
      operationCode: "CUTTING",
      operationName: "Cutting",
      sequenceNo: 3,
      isRequired: true,
      estimatedMinutes: 15,
      defaultMachineId: "mach_004",
      defaultMachineName: "Guillotine G-01",
      remarks: "Precision trim to finished size"
    },
    {
      operationCode: "PACKING",
      operationName: "Packing",
      sequenceNo: 4,
      isRequired: true,
      estimatedMinutes: 10,
      defaultMachineId: "mach_006",
      defaultMachineName: "Packing & Boxing Station",
      remarks: "Pack in labelled cartons"
    }
  ]);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      const data = await getAvailableMachines();
      setMachines(data || []);
    } catch (err) {
      console.error("Failed to load machines:", err);
    }
  };

  const handleMachineChange = (index, machineId) => {
    const matched = machines.find((m) => m.machineId === machineId);
    const updated = [...operations];
    updated[index] = {
      ...updated[index],
      machineId,
      machineName: matched ? matched.machineName : "To be assigned",
      defaultMachineId: machineId,
      defaultMachineName: matched ? matched.machineName : "To be assigned"
    };
    setOperations(updated);
  };

  const handleTimeChange = (index, minutes) => {
    const updated = [...operations];
    updated[index] = {
      ...updated[index],
      estimatedMinutes: Number(minutes) || 0
    };
    setOperations(updated);
  };

  const handleRemarksChange = (index, remarks) => {
    const updated = [...operations];
    updated[index] = {
      ...updated[index],
      remarks
    };
    setOperations(updated);
  };

  const handleRemoveOperation = (index) => {
    if (operations.length <= 1) {
      alert("At least one production operation is required.");
      return;
    }
    const filtered = operations.filter((_, idx) => idx !== index);
    const resequenced = filtered.map((op, idx) => ({
      ...op,
      sequenceNo: idx + 1
    }));
    setOperations(resequenced);
  };

  const handleAddOptionalOperation = () => {
    const newSeq = operations.length + 1;
    const newOp = {
      operationCode: "CREASING",
      operationName: "Creasing & Folding",
      sequenceNo: newSeq,
      isRequired: false,
      estimatedMinutes: 15,
      defaultMachineId: "mach_005",
      defaultMachineName: "Creaser & Folder C-01",
      remarks: "Optional spine score or fold"
    };
    setOperations([...operations, newOp]);
  };

  const handleOpenConfirm = () => {
    setErrorMsg("");
    if (plannedQty <= 0) {
      setErrorMsg("Planned quantity must be greater than zero.");
      return;
    }
    if (operations.length === 0) {
      setErrorMsg("Please configure at least one production operation.");
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmCreateOrder = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        jobOrderId: jobItem.jobId,
        jobItemId: jobItem.jobItemId,
        plannedQty: Number(plannedQty),
        priority,
        allowanceReason: plannedQty !== jobItem.requiredQuantity ? allowanceReason : "",
        plannedStart: `${plannedStart}T${plannedStartTime}:00.000Z`,
        expectedCompletion: `${expectedCompletion}T${expectedCompletionTime}:00.000Z`,
        operations,
        notes
      };

      const response = await createProductionOrder(payload);
      const created = response?.productionOrder || response?.data || response;
      if (created && (created.productionOrderId || created.productionNo || created.id)) {
        setCreatedOrder(created);
        setIsConfirmOpen(false);
        if (onOrderCreated) {
          onOrderCreated(created);
        } else {
          setIsSuccessOpen(true);
        }
      } else {
        setIsConfirmOpen(false);
        setIsSuccessOpen(true);
      }
    } catch (err) {
      console.error("Order creation error:", err);
      const msg = err.response?.data?.message || err.message || "Unable to create production order.";
      setErrorMsg(msg);
      setIsConfirmOpen(false);
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reqQty = jobItem.requiredQuantity || 1000;
  const allowanceAmount = plannedQty - reqQty;
  const allowancePercent = reqQty > 0 ? Math.round((allowanceAmount / reqQty) * 100) : 0;

  return (
    <div className="prod-container">
      {/* Top Header & Breadcrumb */}
      <div className="prod-header-bar">
        <div className="prod-title-group">
          <div className="prod-breadcrumb">
            <span className="prod-breadcrumb-link" onClick={onBack}>
              Production Planning
            </span>
            <span>/</span>
            <span>Planning</span>
            <span>/</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>{jobItem.jobNo}</span>
          </div>
          <h1 className="prod-title">
            <Layers size={22} color="#047857" />
            Production Planning • {jobItem.jobNo}
          </h1>
          <p className="prod-subtitle">
            Customer: <strong>{jobItem.customerName}</strong> • Item: <strong>{jobItem.productName}</strong>
          </p>
        </div>

        <button type="button" onClick={onBack} className="prod-btn-secondary">
          <ArrowLeft size={14} /> Back to Planning Queue
        </button>
      </div>

      {/* Stepper Progress Bar matching PrintZ ERP reference */}
      <div className="prod-stepper-container">
        <div className="prod-stepper-track">
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Enquiry</span>
            <span className="prod-step-sub">15 Sep</span>
          </div>
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Estimation</span>
            <span className="prod-step-sub">15 Sep</span>
          </div>
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Design</span>
            <span className="prod-step-sub">16 Sep</span>
          </div>
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Sample Approval</span>
            <span className="prod-step-sub">17 Sep</span>
          </div>
          <div className="prod-step-item prod-step-active">
            <div className="prod-step-icon-wrap">⚙</div>
            <span className="prod-step-label">Planning</span>
            <span className="prod-step-sub" style={{ color: "#047857", fontWeight: 700 }}>In progress</span>
          </div>
          <div className="prod-step-item prod-step-pending">
            <div className="prod-step-icon-wrap">🖨</div>
            <span className="prod-step-label">Printing</span>
            <span className="prod-step-sub">Pending</span>
          </div>
          <div className="prod-step-item prod-step-pending">
            <div className="prod-step-icon-wrap">✂</div>
            <span className="prod-step-label">Finishing</span>
            <span className="prod-step-sub">Pending</span>
          </div>
          <div className="prod-step-item prod-step-pending">
            <div className="prod-step-icon-wrap">📦</div>
            <span className="prod-step-label">Packing</span>
            <span className="prod-step-sub">Pending</span>
          </div>
          <div className="prod-step-item prod-step-pending">
            <div className="prod-step-icon-wrap">🛡</div>
            <span className="prod-step-label">QC</span>
            <span className="prod-step-sub">Pending</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", fontSize: "13px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/v3/production/orders")}
            style={{
              backgroundColor: "#b91c1c",
              color: "#ffffff",
              border: "none",
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>Go to Live Production Orders</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Main 12-Column Planning Grid */}
      <div className="prod-planning-layout">
        {/* Left 8 Columns */}
        <div>
          {/* 1. Job Summary Card */}
          <div className="prod-card">
            <div className="prod-card-header">
              <h3 className="prod-card-title">
                <FileCheck size={16} /> Job Summary
              </h3>
              <span className={`prod-badge prod-badge-${priority.toLowerCase()}`}>
                Priority: {priority}
              </span>
            </div>

            <div className="prod-info-grid">
              <div className="prod-info-cell">
                <span className="prod-info-label">Job Number</span>
                <span className="prod-info-val" style={{ fontFamily: "monospace", color: "#047857" }}>
                  {jobItem.jobNo}
                </span>
              </div>
              <div className="prod-info-cell">
                <span className="prod-info-label">Customer</span>
                <span className="prod-info-val">{jobItem.customerName}</span>
              </div>
              <div className="prod-info-cell">
                <span className="prod-info-label">Mobile</span>
                <span className="prod-info-val">{jobItem.customerMobile}</span>
              </div>
              <div className="prod-info-cell">
                <span className="prod-info-label">Product Item</span>
                <span className="prod-info-val">{jobItem.productName}</span>
              </div>
              <div className="prod-info-cell">
                <span className="prod-info-label">Required Quantity</span>
                <span className="prod-info-val">{reqQty.toLocaleString()} {jobItem.unit || "PCS"}</span>
              </div>
              <div className="prod-info-cell">
                <span className="prod-info-label">Expected Delivery</span>
                <span className="prod-info-val">{jobItem.expectedDelivery || jobItem.dueDate || "22 Oct 2026"}</span>
              </div>
            </div>
          </div>

          {/* 2. Requirement Snapshot & Approved Sample Card */}
          <div className="prod-card">
            <div className="prod-card-header">
              <h3 className="prod-card-title">
                <Sparkles size={16} /> Production Requirement & Approved Sample
              </h3>
              <span style={{ fontSize: "11px", color: "#047857", fontWeight: 700 }}>
                Sample Version {jobItem.sampleVersion || "V2"} Approved
              </span>
            </div>

            <div className="prod-spec-grid">
              <div className="prod-spec-row">
                <span className="prod-spec-key">Product:</span>
                <span className="prod-spec-value">{jobItem.productName}</span>
              </div>
              <div className="prod-spec-row">
                <span className="prod-spec-key">Finished Size:</span>
                <span className="prod-spec-value">{jobItem.requirementSnapshot?.size || "85 × 55 mm"}</span>
              </div>
              <div className="prod-spec-row">
                <span className="prod-spec-key">Printing Side:</span>
                <span className="prod-spec-value">{jobItem.requirementSnapshot?.printing || "Double Side (Colour)"}</span>
              </div>
              <div className="prod-spec-row">
                <span className="prod-spec-key">Colour Mode:</span>
                <span className="prod-spec-value">{jobItem.requirementSnapshot?.colourMode || "CMYK • Double side"}</span>
              </div>
              <div className="prod-spec-row">
                <span className="prod-spec-key">Paper / Substrate:</span>
                <span className="prod-spec-value">{jobItem.requirementSnapshot?.paperType || "Art Card 300 GSM (SRA3)"}</span>
              </div>
              <div className="prod-spec-row">
                <span className="prod-spec-key">Imposition:</span>
                <span className="prod-spec-value">{jobItem.requirementSnapshot?.imposition || "12-up • 87 sheets"}</span>
              </div>
            </div>

            {/* Approved Sample Thumbnail Display */}
            {jobItem.approvedSample && (
              <div className="prod-proof-card">
                <div style={{ display: "flex", gap: "8px" }}>
                  {jobItem.approvedSample.frontUrl && (
                    <img
                      src={jobItem.approvedSample.frontUrl}
                      alt="Front Sample"
                      className="prod-proof-thumb"
                    />
                  )}
                  {jobItem.approvedSample.backUrl && (
                    <img
                      src={jobItem.approvedSample.backUrl}
                      alt="Back Sample"
                      className="prod-proof-thumb"
                    />
                  )}
                </div>
                <div className="prod-proof-meta">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#047857", fontWeight: 700 }}>
                    <CheckCircle2 size={14} /> Approved Proof {jobItem.sampleVersion || "v2"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#334155", marginTop: "3px", fontStyle: "italic" }}>
                    "{jobItem.sampleComments || "Looks good. Please go ahead with printing. Make sure colours match screen."}"
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "4px" }}>
                    Approved by {jobItem.customerName} on {new Date(jobItem.sampleApprovedAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Production Process & Operations Builder */}
          <div className="prod-card">
            <div className="prod-card-header">
              <h3 className="prod-card-title">
                <Layers size={16} /> Production Operations ({operations.length} Steps)
              </h3>
              <button
                type="button"
                onClick={handleAddOptionalOperation}
                className="prod-btn-secondary"
                style={{ fontSize: "11px", padding: "4px 10px" }}
              >
                <Plus size={13} /> Add Operation
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="prod-ops-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>Seq</th>
                    <th style={{ width: "160px" }}>Operation</th>
                    <th style={{ width: "210px" }}>Machine Assignment</th>
                    <th style={{ width: "100px" }}>Est. Time</th>
                    <th>Process Remarks</th>
                    <th style={{ width: "40px", textAlign: "center" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: "center" }}>
                        <span className="prod-seq-badge">{idx + 1}</span>
                      </td>
                      <td>
                        <strong style={{ color: "#0f172a", display: "block" }}>{op.operationName}</strong>
                        <span style={{ fontSize: "10.5px", color: "#64748b", fontFamily: "monospace" }}>
                          {op.operationCode}
                        </span>
                      </td>
                      <td>
                        <select
                          className="prod-select-input"
                          value={op.machineId || op.defaultMachineId || ""}
                          onChange={(e) => handleMachineChange(idx, e.target.value)}
                        >
                          <option value="">Select Machine...</option>
                          {machines.map((m) => (
                            <option key={m.machineId} value={m.machineId}>
                              {m.machineName} ({m.category})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <input
                            type="number"
                            className="prod-text-input"
                            style={{ width: "60px", textAlign: "center" }}
                            value={op.estimatedMinutes || 20}
                            onChange={(e) => handleTimeChange(idx, e.target.value)}
                          />
                          <span style={{ fontSize: "10.5px", color: "#64748b" }}>min</span>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="prod-text-input"
                          value={op.remarks || ""}
                          onChange={(e) => handleRemarksChange(idx, e.target.value)}
                          placeholder="Process instructions..."
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveOperation(idx)}
                          style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                          title="Remove step"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="prod-notice-box">
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <div>
                Deterministic sequential flow: <strong>{operations.map((o) => o.operationName).join(" → ")}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Planning Summary & Release */}
        <div>
          <div className="prod-card" style={{ position: "sticky", top: "16px" }}>
            <div className="prod-card-header">
              <h3 className="prod-card-title">
                <Clock size={16} /> Planning Parameters
              </h3>
              <span className="prod-badge prod-badge-planned">Cycle 0</span>
            </div>

            {/* Quantity Planning */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                Planned Quantity *
              </label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="number"
                  className="prod-text-input"
                  style={{ fontSize: "14px", fontWeight: 700, color: "#047857" }}
                  value={plannedQty}
                  onChange={(e) => setPlannedQty(Number(e.target.value))}
                  min={1}
                />
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                  / {reqQty.toLocaleString()} pcs
                </span>
              </div>

              {allowanceAmount > 0 && (
                <div style={{ fontSize: "11px", color: "#047857", fontWeight: 600, marginTop: "4px" }}>
                  +{allowanceAmount} pcs ({allowancePercent}% production setup allowance)
                </div>
              )}
            </div>

            {/* Allowance Reason if != Required */}
            {plannedQty !== reqQty && (
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Allowance Reason
                </label>
                <input
                  type="text"
                  className="prod-text-input"
                  value={allowanceReason}
                  onChange={(e) => setAllowanceReason(e.target.value)}
                  placeholder="Reason for quantity variation..."
                />
              </div>
            )}

            {/* Priority Selector */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                Production Priority
              </label>
              <select
                className="prod-select-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High (Urgent Dispatch)</option>
                <option value="URGENT">Urgent (Express)</option>
              </select>
            </div>

            {/* Planned Schedule */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                Planned Start Schedule
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "6px" }}>
                <input
                  type="date"
                  className="prod-text-input"
                  value={plannedStart}
                  onChange={(e) => setPlannedStart(e.target.value)}
                />
                <input
                  type="time"
                  className="prod-text-input"
                  value={plannedStartTime}
                  onChange={(e) => setPlannedStartTime(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                Expected Completion
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "6px" }}>
                <input
                  type="date"
                  className="prod-text-input"
                  value={expectedCompletion}
                  onChange={(e) => setExpectedCompletion(e.target.value)}
                />
                <input
                  type="time"
                  className="prod-text-input"
                  value={expectedCompletionTime}
                  onChange={(e) => setExpectedCompletionTime(e.target.value)}
                />
              </div>
            </div>

            {/* Production Order Summary Box */}
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Production No:</span>
                <span style={{ fontFamily: "monospace", color: "#047857", fontWeight: 600 }}>Auto-Assigned</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Initial Status:</span>
                <span className="prod-badge prod-badge-planned">PLANNED</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Total Steps:</span>
                <strong>{operations.length} Operations</strong>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleOpenConfirm}
              className="prod-btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "10px 16px", fontSize: "13px" }}
            >
              <CheckCircle2 size={16} />
              Create Production Order
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <CreateOrderConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmCreateOrder}
        isSubmitting={isSubmitting}
        planningData={{
          jobNo: jobItem.jobNo,
          customerName: jobItem.customerName,
          productName: jobItem.productName,
          requiredQty: reqQty,
          plannedQty,
          priority,
          operations,
          plannedStart,
          expectedCompletion
        }}
      />

      {/* Success Modal */}
      <OrderCreatedSuccessModal
        isOpen={isSuccessOpen}
        productionOrder={createdOrder}
        onClose={() => setIsSuccessOpen(false)}
        onBackToPlanning={() => {
          setIsSuccessOpen(false);
          onBack();
        }}
        onViewOrder={(order) => {
          setIsSuccessOpen(false);
          if (onOrderCreated) {
            onOrderCreated(order);
          }
        }}
      />
    </div>
  );
}
