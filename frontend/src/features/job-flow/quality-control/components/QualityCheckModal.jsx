import React, { useState } from "react";
import { X, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import jobFlowApi from "../api/qcApi";
import { toast } from "react-toastify";

export const QualityCheckModal = ({ isOpen, onClose, productionOrder, onCompleted }) => {
  const [result, setResult] = useState("PASS");
  const [quantityChecked, setQuantityChecked] = useState(500);
  const [acceptedQty, setAcceptedQty] = useState(500);
  const [rejectedQty, setRejectedQty] = useState(0);
  const [correctiveAction, setCorrectiveAction] = useState("REWORK");
  const [reworkOperationCode, setReworkOperationCode] = useState("LAMINATION");
  const [issueDetails, setIssueDetails] = useState("");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (productionOrder) {
      const planned = productionOrder.plannedQty || productionOrder.actualQty || 500;
      setQuantityChecked(planned);
      setAcceptedQty(planned);
      setRejectedQty(0);
      setResult("PASS");
    }
  }, [productionOrder]);

  if (!isOpen || !productionOrder) return null;

  const handleCheckedChange = (val) => {
    const q = Number(val) || 0;
    setQuantityChecked(q);
    if (result === "PASS") {
      setAcceptedQty(q);
      setRejectedQty(0);
    } else {
      setRejectedQty(q - acceptedQty);
    }
  };

  const handleAcceptedChange = (val) => {
    const a = Number(val) || 0;
    setAcceptedQty(a);
    setRejectedQty(Math.max(0, quantityChecked - a));
  };

  const handleRejectedChange = (val) => {
    const r = Number(val) || 0;
    setRejectedQty(r);
    setAcceptedQty(Math.max(0, quantityChecked - r));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (acceptedQty + rejectedQty !== quantityChecked) {
      toast.error(`Quantity mismatch: Accepted (${acceptedQty}) + Rejected (${rejectedQty}) must equal Checked (${quantityChecked})`);
      return;
    }

    if (result !== "PASS" && !issueDetails.trim()) {
      toast.error("Please describe the defect / issue details.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        result,
        quantityChecked,
        acceptedQty,
        rejectedQty,
        issueDetails,
        comments,
        correctiveAction: result === "PASS" ? "NONE" : correctiveAction,
        reworkOperationCode: correctiveAction === "REWORK" ? reworkOperationCode : undefined,
        restartFromOperationCode: correctiveAction === "REPRINT" ? "PRINT" : undefined,
      };

      await jobFlowApi.performQualityCheck(productionOrder._id || productionOrder.id, payload);

      if (result === "PASS") {
        toast.success("Quality inspection PASSED! Ready for Manager Delivery Order.");
      } else if (correctiveAction === "REWORK") {
        toast.info(`Defect logged. Targeted rework task routed to ${reworkOperationCode} without restarting completed steps.`);
      } else {
        toast.warning("Full-production reprint request submitted for Manager approval.");
      }

      if (onCompleted) onCompleted();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record QC check");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-lg">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldCheck size={22} style={{ color: "var(--jf-primary)" }} />
            <h2 className="jf-modal-title">Quality Control Inspection</h2>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="jf-modal-body">
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: 0 }}>
              Order No: <strong>{productionOrder.orderNumber || productionOrder.jobNo || "PO-202610-0018"}</strong> •{" "}
              {productionOrder.productType || "Business Cards"}
            </p>

            {/* Result Selector */}
            <div className="jf-form-group" style={{ marginBottom: "1.25rem" }}>
              <label className="jf-label">Inspection Verdict</label>
              <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
                <button
                  type="button"
                  className={`jf-btn ${result === "PASS" ? "jf-btn-primary" : "jf-btn-secondary"}`}
                  onClick={() => {
                    setResult("PASS");
                    setAcceptedQty(quantityChecked);
                    setRejectedQty(0);
                  }}
                  style={{ flex: 1 }}
                >
                  <ShieldCheck size={16} /> PASS (Eligible for Delivery)
                </button>
                <button
                  type="button"
                  className={`jf-btn ${result === "ISSUE" ? "jf-btn-danger" : "jf-btn-secondary"}`}
                  onClick={() => {
                    setResult("ISSUE");
                    setRejectedQty(Math.max(1, rejectedQty));
                    setAcceptedQty(Math.max(0, quantityChecked - Math.max(1, rejectedQty)));
                  }}
                  style={{ flex: 1 }}
                >
                  <AlertTriangle size={16} /> ISSUE DETECTED (Rework / Reprint)
                </button>
              </div>
            </div>

            {/* Quantities Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Checked Qty</label>
                <input
                  type="number"
                  className="jf-input"
                  value={quantityChecked}
                  onChange={(e) => handleCheckedChange(e.target.value)}
                  min="1"
                  required
                />
              </div>
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Accepted Qty</label>
                <input
                  type="number"
                  className="jf-input"
                  value={acceptedQty}
                  onChange={(e) => handleAcceptedChange(e.target.value)}
                  min="0"
                  required
                />
              </div>
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Rejected Qty</label>
                <input
                  type="number"
                  className="jf-input"
                  value={rejectedQty}
                  onChange={(e) => handleRejectedChange(e.target.value)}
                  min="0"
                  required
                />
              </div>
            </div>

            {/* If Defect / Issue */}
            {result === "ISSUE" && (
              <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "8px", padding: "1rem", marginBottom: "1.25rem" }}>
                <h4 style={{ margin: "0 0 0.75rem 0", color: "#9f1239", fontSize: "0.95rem" }}>
                  Defect-Specific Routing & Rework Options
                </h4>

                <div className="jf-form-group" style={{ marginBottom: "0.75rem" }}>
                  <label className="jf-label jf-label-required">Corrective Action Strategy</label>
                  <div style={{ display: "flex", gap: "1.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="correctiveAction"
                        value="REWORK"
                        checked={correctiveAction === "REWORK"}
                        onChange={() => setCorrectiveAction("REWORK")}
                      />
                      Targeted Operation Rework (Don't restart previous steps)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="correctiveAction"
                        value="REPRINT"
                        checked={correctiveAction === "REPRINT"}
                        onChange={() => setCorrectiveAction("REPRINT")}
                      />
                      Full-Production Reprint (Requires Manager Approval)
                    </label>
                  </div>
                </div>

                {correctiveAction === "REWORK" && (
                  <div className="jf-form-group" style={{ marginBottom: "0.75rem" }}>
                    <label className="jf-label jf-label-required">Affected Operation (Resume Here)</label>
                    <select
                      className="jf-select"
                      value={reworkOperationCode}
                      onChange={(e) => setReworkOperationCode(e.target.value)}
                    >
                      <option value="LAMINATION">Lamination (e.g. film bubbles, wrinkles)</option>
                      <option value="CUTTING">Cutting / Trimming (e.g. size mismatch, off-cut)</option>
                      <option value="BINDING">Binding (e.g. spiral alignment, glue gap)</option>
                      <option value="COATING">UV Coating / Varnish</option>
                      <option value="PACKING">Packing & Shrink-wrap</option>
                    </select>
                  </div>
                )}

                <div className="jf-form-group">
                  <label className="jf-label jf-label-required">Defect Description / Notes</label>
                  <textarea
                    className="jf-textarea"
                    placeholder="Describe specific defect observed during inspection..."
                    value={issueDetails}
                    onChange={(e) => setIssueDetails(e.target.value)}
                    rows={3}
                    required
                  />
                </div>
              </div>
            )}

            <div className="jf-form-group">
              <label className="jf-label">General Inspector Comments</label>
              <input
                type="text"
                className="jf-input"
                placeholder="Optional inspector remarks or packaging checklist confirmation"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className={`jf-btn ${result === "PASS" ? "jf-btn-primary" : "jf-btn-danger"}`}
              disabled={loading}
            >
              {loading ? "Recording..." : (result === "PASS" ? "Confirm QC Pass" : "Submit Issue & Route")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QualityCheckModal;
