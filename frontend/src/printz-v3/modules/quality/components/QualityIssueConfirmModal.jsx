import React, { useState } from "react";
import { AlertTriangle, X, RefreshCw, Printer, AlertCircle } from "lucide-react";

export default function QualityIssueConfirmModal({
  isOpen,
  onClose,
  productionOrder,
  quantityChecked,
  acceptedQty,
  rejectedQty,
  defects = [],
  correctiveAction = "REWORK",
  restartOperation = "PRINTING",
  issueDetails = "",
  comments = "",
  onConfirmIssue,
  isSubmitting = false
}) {
  if (!isOpen || !productionOrder) return null;

  const [selectedAction, setSelectedAction] = useState(correctiveAction || "REWORK");
  const [selectedRestartOp, setSelectedRestartOp] = useState(restartOperation || "PRINTING");

  const operations = productionOrder.operations || [];

  const handleConfirm = () => {
    onConfirmIssue({
      correctiveAction: selectedAction,
      restartFromOperationCode: selectedRestartOp
    });
  };

  return (
    <div className="qc-modal-overlay">
      <div className="qc-modal-content" style={{ maxWidth: "540px" }}>
        <div className="qc-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#fee2e2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                Log Quality Control Issue
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "#64748b" }}>
                Order #{productionOrder.productionNo} • {productionOrder.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="qc-modal-body">
          {/* Quantity Summary */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            background: "#fff5f5",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "14px"
          }}>
            <div>
              <span style={{ fontSize: "10.5px", color: "#991b1b", display: "block" }}>Total Inspected</span>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>{Number(quantityChecked || 0).toLocaleString()} pcs</strong>
            </div>
            <div>
              <span style={{ fontSize: "10.5px", color: "#991b1b", display: "block" }}>Accepted Good</span>
              <strong style={{ fontSize: "14px", color: "#047857" }}>{Number(acceptedQty || 0).toLocaleString()} pcs</strong>
            </div>
            <div>
              <span style={{ fontSize: "10.5px", color: "#991b1b", display: "block" }}>Rejected Defect</span>
              <strong style={{ fontSize: "14px", color: "#dc2626" }}>{Number(rejectedQty || 0).toLocaleString()} pcs</strong>
            </div>
          </div>

          {/* Logged Defects */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
              Logged Defect Breakdown ({defects.length})
            </label>
            <div style={{ maxHeight: "100px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px" }}>
              {defects.length > 0 ? (
                defects.map((d, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", padding: "4px 6px", borderBottom: i < defects.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{d.code || d.name}</span>
                    <span style={{ color: "#dc2626", fontWeight: 700 }}>{d.quantity} pcs ({d.severity})</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "11px", color: "#64748b", textAlign: "center" }}>Standard Quality Deviation</div>
              )}
            </div>
          </div>

          {/* Corrective Action Selection */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              Corrective Action Strategy *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setSelectedAction("REWORK")}
                style={{
                  border: selectedAction === "REWORK" ? "2px solid #d97706" : "1px solid #cbd5e1",
                  background: selectedAction === "REWORK" ? "#fffbeb" : "#ffffff",
                  padding: "10px",
                  borderRadius: "8px",
                  textAlign: "left",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "12px", color: "#b45309" }}>
                  <RefreshCw size={14} /> REWORK
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
                  Correct existing stock by repeating the affected operation.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction("REPRINT")}
                style={{
                  border: selectedAction === "REPRINT" ? "2px solid #dc2626" : "1px solid #cbd5e1",
                  background: selectedAction === "REPRINT" ? "#fef2f2" : "#ffffff",
                  padding: "10px",
                  borderRadius: "8px",
                  textAlign: "left",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "12px", color: "#dc2626" }}>
                  <Printer size={14} /> REPRINT
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
                  Reproduce {rejectedQty} pcs from scratch (requires approval).
                </div>
              </button>
            </div>
          </div>

          {/* Affected Restart Operation Selection */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
              Restart From Operation *
            </label>
            <select
              className="prod-form-input"
              value={selectedRestartOp}
              onChange={(e) => setSelectedRestartOp(e.target.value)}
              required
            >
              {operations.length > 0 ? (
                operations.map((op) => (
                  <option key={op.sequenceNo} value={op.operationCode || op.name || op.operationName}>
                    Step {op.sequenceNo}: {op.name || op.operationName} ({op.operationCode || op.type})
                  </option>
                ))
              ) : (
                <>
                  <option value="PRINTING">Step 1: Printing (Digital / Offset)</option>
                  <option value="LAMINATION">Step 2: Lamination (Thermal Matt)</option>
                  <option value="CUTTING">Step 3: Precision Cutting & Trimming</option>
                  <option value="PACKING">Step 4: Packaging & Boxing</option>
                </>
              )}
            </select>
            <span style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px", display: "block" }}>
              * Rework will restart only from this affected station, preserving completed predecessor steps.
            </span>
          </div>

          {issueDetails && (
            <div style={{ fontSize: "11.5px", color: "#475569", marginBottom: "8px" }}>
              <strong>Issue Explanation:</strong> "{issueDetails}"
            </div>
          )}

          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "8px 12px", fontSize: "11px", color: "#b45309", display: "flex", gap: "6px", alignItems: "center" }}>
            <AlertCircle size={14} />
            <span>
              {selectedAction === "REWORK"
                ? "Submitting will create Rework Cycle (R1) and return the order to Production Queue."
                : "Submitting will log a formal Reprint Request in 'REQUESTED' status awaiting Manager Authorization."}
            </span>
          </div>
        </div>

        <div className="qc-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="qc-btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="qc-btn-danger"
            disabled={isSubmitting}
            style={{ background: selectedAction === "REWORK" ? "#d97706" : "#dc2626", borderColor: selectedAction === "REWORK" ? "#d97706" : "#dc2626" }}
          >
            {isSubmitting ? "Creating Request..." : `Confirm & Create ${selectedAction} Request ▶`}
          </button>
        </div>
      </div>
    </div>
  );
}
