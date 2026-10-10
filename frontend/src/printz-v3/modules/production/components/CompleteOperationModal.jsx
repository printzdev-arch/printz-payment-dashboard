import React, { useState, useEffect } from "react";
import { CheckCircle2, X, AlertTriangle, Layers, FileText } from "lucide-react";

export default function CompleteOperationModal({
  isOpen,
  onClose,
  operation,
  productionOrder,
  onConfirmComplete
}) {
  if (!isOpen || !operation) return null;

  const targetQty = operation.plannedQty || productionOrder?.plannedQty || 1000;
  const [completedQty, setCompletedQty] = useState(operation.completedQty || targetQty);
  const [wastageQty, setWastageQty] = useState(operation.wastageQty || 0);
  const [wastageReason, setWastageReason] = useState(operation.wastageReason || "Setup / Make-Ready");
  const [remarks, setRemarks] = useState(operation.processRemarks || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (operation) {
      setCompletedQty(operation.completedQty || targetQty);
      setWastageQty(operation.wastageQty || 0);
    }
  }, [operation, targetQty]);

  const totalAccounted = Number(completedQty || 0) + Number(wastageQty || 0);
  const wastagePercent = totalAccounted > 0 ? ((Number(wastageQty || 0) / totalAccounted) * 100).toFixed(1) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirmComplete({
        completedQty: Number(completedQty),
        wastageQty: Number(wastageQty),
        wastageReason: Number(wastageQty) > 0 ? wastageReason : "",
        processRemarks: remarks
      });
      onClose();
    } catch (err) {
      console.error("Failed to complete operation:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="prod-modal-overlay">
      <div className="prod-modal-content" style={{ maxWidth: "560px" }}>
        <div className="prod-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#dcfce7",
              color: "#15803d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                Complete Operation: {operation.name || operation.operationName}
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "#64748b" }}>
                Order #{productionOrder?.productionNo || operation.productionNo} • Step {operation.sequenceNo}
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

        <form onSubmit={handleSubmit}>
          <div className="prod-modal-body">
            {/* Target vs Accounted Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
              background: "#f8fafc",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              marginBottom: "16px"
            }}>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Planned Target</span>
                <strong style={{ fontSize: "15px", color: "#0f172a" }}>{targetQty.toLocaleString()} pcs</strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Total Accounted</span>
                <strong style={{ fontSize: "15px", color: totalAccounted < targetQty ? "#b45309" : "#047857" }}>
                  {totalAccounted.toLocaleString()} pcs
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Wastage Rate</span>
                <strong style={{ fontSize: "15px", color: Number(wastagePercent) > 5 ? "#dc2626" : "#475569" }}>
                  {wastagePercent}%
                </strong>
              </div>
            </div>

            {/* Inputs Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Good / Completed Qty (pcs) *
                </label>
                <input
                  type="number"
                  min="0"
                  className="prod-form-input"
                  value={completedQty}
                  onChange={(e) => setCompletedQty(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Wastage / Scrap Qty (pcs)
                </label>
                <input
                  type="number"
                  min="0"
                  className="prod-form-input"
                  value={wastageQty}
                  onChange={(e) => setWastageQty(e.target.value)}
                />
              </div>
            </div>

            {Number(wastageQty) > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  <AlertTriangle size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px", color: "#d97706" }} />
                  Primary Wastage Reason
                </label>
                <select
                  className="prod-form-input"
                  value={wastageReason}
                  onChange={(e) => setWastageReason(e.target.value)}
                >
                  <option value="Setup / Make-Ready">Setup / Make-Ready Waste</option>
                  <option value="Color Calibration / Registration">Color Calibration / Registration</option>
                  <option value="Paper Jam / Feed Issue">Paper Jam / Feed Issue</option>
                  <option value="Die-Cut / Crease Misalignment">Die-Cut / Crease Misalignment</option>
                  <option value="Coating / Foil Defect">Coating / Foil Defect</option>
                  <option value="Operator Trim Variation">Operator Trim Variation</option>
                  <option value="Other">Other (Specify in Remarks)</option>
                </select>
              </div>
            )}

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                <FileText size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                Process & Quality Observations / Remarks
              </label>
              <textarea
                className="prod-form-input"
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Good register, accurate cutting boundaries, ready for next step..."
              />
            </div>

            <div className="prod-notice-box" style={{ background: "#ecfdf5", borderColor: "#a7f3d0" }}>
              <CheckCircle2 size={15} style={{ color: "#047857" }} />
              <span>
                Completing will mark this step as <strong>COMPLETED</strong> and automatically unlock the next operation (if any) in the sequence.
              </span>
            </div>
          </div>

          <div className="prod-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="prod-btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="prod-btn-primary"
              disabled={isSubmitting || Number(completedQty) < 0}
              style={{ background: "#047857", borderColor: "#047857" }}
            >
              {isSubmitting ? "Completing..." : "Confirm & Mark Completed ✓"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
