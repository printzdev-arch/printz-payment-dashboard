import React from "react";
import {
  Layers,
  ArrowLeft,
  ArrowRight,
  Play,
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
  Eye,
  Hash,
  Activity
} from "lucide-react";

export default function ProductionOrderDetailView({
  productionOrder,
  onBack,
  onNavigateToPlanning,
  onSelectOperation = null,
  onNavigateToQueue = null,
  branchName = "Kothanur"
}) {
  if (!productionOrder) return null;

  const {
    productionNo,
    jobNo,
    customerName,
    customerMobile,
    customerCode,
    productName,
    status = "PLANNED",
    priority = "NORMAL",
    requiredQty = 1000,
    plannedQty = 1000,
    allowancePercent = 0,
    allowanceReason,
    plannedStart,
    expectedCompletion,
    approvedSample,
    requirementSnapshot,
    operations = [],
    notes,
    currentCycleNo = 0,
    createdAt,
    createdBy,
    auditLog = []
  } = productionOrder;

  const totalMinutes = operations.reduce((sum, op) => sum + (op.estimatedMinutes || 20), 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const formattedDuration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const handleStartFirstOp = () => {
    if (operations.length > 0 && onSelectOperation) {
      onSelectOperation(operations[0].operationId || operations[0].id || `${productionOrder.id}_op_1`);
    } else if (onNavigateToQueue) {
      onNavigateToQueue();
    }
  };

  return (
    <div className="prod-container">
      {/* Header Bar */}
      <div className="prod-header-bar">
        <div className="prod-title-group">
          <div className="prod-breadcrumb">
            <span className="prod-breadcrumb-link" onClick={onBack}>
              Production Orders
            </span>
            <span>/</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>{productionNo}</span>
          </div>
          <h1 className="prod-title">
            <Layers size={22} color="#047857" />
            Production Order • {productionNo}
          </h1>
          <p className="prod-subtitle">
            Job Reference: <strong>{jobNo}</strong> • Customer: <strong>{customerName}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button type="button" onClick={onBack} className="prod-btn-secondary">
            <ArrowLeft size={14} /> Back to Orders
          </button>
          <button
            type="button"
            onClick={handleStartFirstOp}
            className="prod-btn-primary"
            style={{
              backgroundColor: "#059669",
              borderColor: "#059669",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 700,
              boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)"
            }}
          >
            <Play size={14} /> Start Machine Operation 1 <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Stepper Progress Bar matching PrintZ Reference */}
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
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Planning</span>
            <span className="prod-step-sub" style={{ color: "#047857", fontWeight: 700 }}>Order Created</span>
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

      {/* Metrics Row */}
      <div className="prod-stats-grid">
        <div className="prod-stat-box">
          <div className="prod-stat-icon" style={{ backgroundColor: "#ecfdf5", color: "#047857" }}>
            <Layers size={18} />
          </div>
          <div>
            <p className="prod-stat-value">{plannedQty?.toLocaleString()}</p>
            <p className="prod-stat-label">
              Planned Qty {allowancePercent > 0 ? `(incl. ${allowancePercent}% allowance)` : ""}
            </p>
          </div>
        </div>

        <div className="prod-stat-box">
          <div className="prod-stat-icon" style={{ backgroundColor: "#eff6ff", color: "#1d4ed8" }}>
            <Clock size={18} />
          </div>
          <div>
            <p className="prod-stat-value">{formattedDuration}</p>
            <p className="prod-stat-label">Est. Total Runtime</p>
          </div>
        </div>

        <div className="prod-stat-box">
          <div className="prod-stat-icon" style={{ backgroundColor: "#f0fdf4", color: "#15803d" }}>
            <Activity size={18} />
          </div>
          <div>
            <p className="prod-stat-value">{operations.length} Steps</p>
            <p className="prod-stat-label">Configured Operations</p>
          </div>
        </div>

        <div className="prod-stat-box">
          <div className="prod-stat-icon" style={{ backgroundColor: "#faf5ff", color: "#7e22ce" }}>
            <Building size={18} />
          </div>
          <div>
            <p className="prod-stat-value">Cycle {currentCycleNo}</p>
            <p className="prod-stat-label">Original Run</p>
          </div>
        </div>
      </div>

      {/* 12-Column Detail Grid */}
      <div className="prod-planning-layout">
        {/* Left 8 Columns */}
        <div>
          {/* 1. Job Reference & Spec Details */}
          <div className="prod-card">
            <div className="prod-card-header">
              <h3 className="prod-card-title">
                <FileCheck size={16} /> Order Overview & Specifications
              </h3>
              <span className="prod-badge prod-badge-planned">Status: {status}</span>
            </div>

            <div className="prod-info-grid">
              <div className="prod-info-cell">
                <span className="prod-info-label">Production Order No</span>
                <span className="prod-info-val" style={{ fontFamily: "monospace", color: "#047857", fontSize: "13px" }}>
                  {productionNo}
                </span>
              </div>
              <div className="prod-info-cell">
                <span className="prod-info-label">Job Number</span>
                <span className="prod-info-val" style={{ fontFamily: "monospace" }}>{jobNo}</span>
              </div>
              <div className="prod-info-cell">
                <span className="prod-info-label">Customer</span>
                <span className="prod-info-val">{customerName}</span>
              </div>
              <div className="prod-info-cell">
                <span className="prod-info-label">Product Item</span>
                <span className="prod-info-val">{productName}</span>
              </div>
              <div className="prod-info-cell">
                <span className="prod-info-label">Required Quantity</span>
                <span className="prod-info-val">{requiredQty?.toLocaleString()} pcs</span>
              </div>
              <div className="prod-info-cell">
                <span className="prod-info-label">Priority</span>
                <span className={`prod-badge prod-badge-${priority.toLowerCase()}`}>{priority}</span>
              </div>
            </div>

            {allowanceReason && (
              <div style={{ marginTop: "12px", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "6px", fontSize: "11.5px", color: "#475569" }}>
                <strong>Quantity Allowance Note:</strong> {allowanceReason}
              </div>
            )}
          </div>

          {/* 2. Approved Sample Reference */}
          {approvedSample && (
            <div className="prod-card">
              <div className="prod-card-header">
                <h3 className="prod-card-title">
                  <Sparkles size={16} /> Approved Sample Snapshot
                </h3>
                <span style={{ fontSize: "11px", color: "#047857", fontWeight: 700 }}>
                  Locked Proof Version {approvedSample.version || 2}
                </span>
              </div>

              <div className="prod-proof-card">
                <div style={{ display: "flex", gap: "8px" }}>
                  {approvedSample.frontUrl && (
                    <img
                      src={approvedSample.frontUrl}
                      alt="Front Sample"
                      className="prod-proof-thumb"
                    />
                  )}
                  {approvedSample.backUrl && (
                    <img
                      src={approvedSample.backUrl}
                      alt="Back Sample"
                      className="prod-proof-thumb"
                    />
                  )}
                </div>
                <div className="prod-proof-meta">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#047857", fontWeight: 700 }}>
                    <CheckCircle2 size={14} /> Approved Sample Reference
                  </div>
                  <div style={{ fontSize: "11px", color: "#334155", marginTop: "3px", fontStyle: "italic" }}>
                    "{approvedSample.comments || "Approved for manufacturing run. Strictly adhere to proofs."}"
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "4px" }}>
                    Approved by {approvedSample.approvedBy || customerName} • File: {approvedSample.fileName || "sample-proof.pdf"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Operations Sequence */}
          <div className="prod-card">
            <div className="prod-card-header">
              <h3 className="prod-card-title">
                <Layers size={16} /> Production Operations Sequence ({operations.length})
              </h3>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Initialized in PENDING state
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="prod-ops-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "center", width: "40px" }}>Seq</th>
                    <th>Operation</th>
                    <th>Machine Assignment</th>
                    <th>Operator</th>
                    <th style={{ textAlign: "right" }}>Planned Qty</th>
                    <th>Est. Time</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center", width: "110px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op, idx) => (
                    <tr key={op.operationId || idx}>
                      <td style={{ textAlign: "center" }}>
                        <span className="prod-seq-badge">{op.sequenceNo || idx + 1}</span>
                      </td>
                      <td>
                        <strong style={{ color: "#0f172a", display: "block" }}>{op.operationName}</strong>
                        <span style={{ fontSize: "10.5px", color: "#64748b", fontFamily: "monospace" }}>
                          {op.operationCode}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "#334155" }}>
                          {op.machineName || "To be assigned"}
                        </span>
                      </td>
                      <td style={{ fontSize: "11.5px", color: "#64748b" }}>
                        {op.assignedEmployeeName || "Queue Dispatch"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {op.plannedQty?.toLocaleString()} pcs
                      </td>
                      <td style={{ fontSize: "11.5px", color: "#334155" }}>
                        {op.estimatedMinutes || 20} min
                      </td>
                      <td>
                        <span className={`prod-badge prod-badge-${(op.status || "PENDING").toLowerCase()}`}>
                          {op.status || "PENDING"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {op.status === "COMPLETED" ? (
                          <span style={{ fontSize: "11.5px", color: "#059669", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <CheckCircle2 size={13} /> Done
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectOperation) {
                                onSelectOperation(op.operationId || op.id || `${productionOrder.id || 'po'}_op_${op.sequenceNo || idx + 1}`);
                              } else if (onNavigateToQueue) {
                                onNavigateToQueue();
                              }
                            }}
                            className="prod-btn-primary"
                            style={{
                              fontSize: "11px",
                              padding: "4px 10px",
                              height: "26px",
                              backgroundColor: "#059669",
                              borderColor: "#059669",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontWeight: 700
                            }}
                          >
                            <Play size={11} /> Start Op
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="prod-notice-box">
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <div>
                Order is planned and awaiting queue release. No machine execution or inventory deduction occurs until operations are started.
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Columns */}
        <div>
          {/* Planning Summary Card */}
          <div className="prod-card">
            <div className="prod-card-header">
              <h3 className="prod-card-title">
                <Clock size={16} /> Schedule & Release Info
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Order Status:</span>
                <span className="prod-badge prod-badge-planned">{status}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Cycle Number:</span>
                <strong>Cycle {currentCycleNo} (Original)</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Planned Start:</span>
                <strong>{new Date(plannedStart || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Expected Completion:</span>
                <strong>{new Date(expectedCompletion || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Planned By:</span>
                <span>{createdBy || "Branch Manager"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Branch:</span>
                <span>{branchName}</span>
              </div>
            </div>

            {notes && (
              <div style={{ marginTop: "14px", padding: "10px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11.5px" }}>
                <span style={{ fontWeight: 700, color: "#475569", display: "block", marginBottom: "2px" }}>Planning Notes:</span>
                <span style={{ color: "#334155" }}>{notes}</span>
              </div>
            )}
          </div>

          {/* Audit Events Card */}
          <div className="prod-card">
            <div className="prod-card-header">
              <h3 className="prod-card-title">
                <Activity size={16} /> Order Audit Trail
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "11.5px" }}>
              {(auditLog.length > 0 ? auditLog : [
                {
                  event: "PRODUCTION_PLANNING_STARTED",
                  actor: createdBy || "Branch Manager",
                  timestamp: createdAt || new Date().toISOString(),
                  notes: "Operations sequence and machinery configured"
                },
                {
                  event: "PRODUCTION_ORDER_CREATED",
                  actor: createdBy || "Branch Manager",
                  timestamp: createdAt || new Date().toISOString(),
                  notes: `Production Order ${productionNo} generated in PLANNED state`
                }
              ]).map((log, idx) => (
                <div key={idx} style={{ padding: "8px 10px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <strong style={{ color: "#047857", fontFamily: "monospace", fontSize: "10.5px" }}>{log.event}</strong>
                    <span style={{ color: "#94a3b8", fontSize: "10px" }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ color: "#334155" }}>{log.notes}</div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>By {log.actor}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
