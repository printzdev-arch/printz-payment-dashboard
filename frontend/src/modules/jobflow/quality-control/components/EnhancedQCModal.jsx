import React, { useEffect, useMemo, useState } from "react";
import { X, CheckCircle2, AlertTriangle } from "lucide-react";
import jobFlowApi from "../api/qcApi";
import { toast } from "react-toastify";
import StyledSelect from "../../../../shared/ui/selects/StyledSelect";

const DEFECT_TYPES = [
  "Color shift / density",
  "Print smear / smudge",
  "Cutting / trim misalignment",
  "Lamination bubbles / wrinkles",
  "Folding / binding fault",
  "Wrong size / quantity",
  "Other",
];

/**
 * QC inspection: how many pieces were checked, pass or issue, and for an issue how many were rejected and why.
 * Rejected pieces go to rework; if every piece is rejected the order goes to a reprint (decided automatically).
 */
export const EnhancedQCModal = ({ isOpen, onClose, productionOrder, onSuccess }) => {
  const [checked, setChecked] = useState("");
  const [result, setResult] = useState("PASS");
  const [rejected, setRejected] = useState("");
  const [defectType, setDefectType] = useState("");
  const [reworkStep, setReworkStep] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // The steps of this order (one per operation type; steps added by an earlier rework are not repeated)
  const steps = useMemo(() => {
    const seen = new Set();
    const list = (Array.isArray(productionOrder?.operations) ? productionOrder.operations : []).filter((op) => {
      if (op.isRework || op.isReprint) return false;
      const code = op.operationCode || op.code || op.operationName;
      if (!code || seen.has(code)) return false;
      seen.add(code);
      return true;
    });
    return list.length > 0 ? list : [{ operationCode: "PRINT", operationName: "Printing" }];
  }, [productionOrder]);

  useEffect(() => {
    if (!productionOrder) return;
    const q = Number(productionOrder.quantity) || Number(productionOrder.actualQty) || Number(productionOrder.plannedQty) || 0;
    setChecked(q);
    setResult("PASS");
    setRejected("");
    setDefectType("");
    setReworkStep(steps[0]?.operationCode || "PRINT");
    setNotes("");
  }, [productionOrder, steps]);

  if (!isOpen || !productionOrder) return null;

  const total = Number(checked) || 0;
  const rej = Math.min(Number(rejected) || 0, total);
  const accepted = Math.max(0, total - rej);
  const orderQty = Math.max(total, Number(productionOrder.actualQty) || 0);
  const action = rej > 0 && rej >= orderQty ? "REPRINT" : "REWORK";
  const jobNo = productionOrder.jobOrderNo || productionOrder.jobNo || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (total <= 0) return toast.error("Enter how many pieces were checked.");
    if (result === "ISSUE") {
      if (rej <= 0) return toast.error("Enter how many pieces were rejected.");
      if (!defectType) return toast.error("Choose the defect type.");
    }

    setSubmitting(true);
    try {
      const payload =
        result === "PASS"
          ? { checkType: "FINAL", result: "PASS", quantityChecked: total, acceptedQty: total, rejectedQty: 0, correctiveAction: "NONE" }
          : {
              checkType: "FINAL",
              result: "ISSUE",
              quantityChecked: total,
              acceptedQty: accepted,
              rejectedQty: rej,
              defects: [{ description: defectType, severity: "MAJOR", affectedQuantity: rej }],
              issueDetails: notes.trim() || defectType,
              comments: notes.trim(),
              correctiveAction: action,
              reworkOperationCode: action === "REWORK" ? reworkStep : undefined,
              restartFromOperationCode: action === "REPRINT" ? "PRINT" : undefined,
              reprintQuantity: action === "REPRINT" ? rej : undefined,
            };

      await jobFlowApi.performQualityCheck(productionOrder._id || productionOrder.id, payload);

      if (result === "PASS") toast.success(`${jobNo} passed QC and is ready for delivery.`);
      else if (action === "REWORK") toast.info(`${rej} piece(s) sent back for rework.`);
      else toast.warning(`All ${rej} pieces were rejected. A reprint was requested for approval.`);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save the inspection.");
    } finally {
      setSubmitting(false);
    }
  };

  const choice = (value, active, danger) => ({
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.75rem",
    borderRadius: "8px",
    fontWeight: 700,
    cursor: "pointer",
    border: active ? `2px solid ${danger ? "#dc2626" : "#059669"}` : "1px solid #cbd5e1",
    background: active ? (danger ? "#fef2f2" : "#ecfdf5") : "#ffffff",
    color: active ? (danger ? "#b91c1c" : "#047857") : "#334155",
  });

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-scroll" style={{ maxWidth: "560px" }}>
        <div className="jf-modal-header">
          <div>
            <h3 className="jf-modal-title">QC Inspection</h3>
            <div style={{ fontSize: "0.8125rem", color: "#1e293b", marginTop: "2px" }}>
              {[jobNo, productionOrder.customerName, productionOrder.productName].filter(Boolean).join(" · ")}
            </div>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose} aria-label="Close" style={{ padding: "0.35rem" }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="jf-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="jf-form-group">
              <label className="jf-label jf-label-required">Pieces checked</label>
              <input type="number" min="1" className="jf-input" value={checked} onChange={(e) => setChecked(e.target.value)} required />
            </div>

            <div className="jf-form-group">
              <label className="jf-label jf-label-required">Result</label>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="button" style={choice("PASS", result === "PASS", false)} onClick={() => setResult("PASS")}>
                  <CheckCircle2 size={18} /> Pass
                </button>
                <button type="button" style={choice("ISSUE", result === "ISSUE", true)} onClick={() => setResult("ISSUE")}>
                  <AlertTriangle size={18} /> Issue found
                </button>
              </div>
            </div>

            {result === "ISSUE" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="jf-form-group">
                    <label className="jf-label jf-label-required">Rejected pieces</label>
                    <input type="number" min="1" max={total || undefined} className="jf-input" value={rejected} onChange={(e) => setRejected(e.target.value)} autoFocus />
                  </div>
                  <div className="jf-form-group">
                    <label className="jf-label jf-label-required">Defect type</label>
                    <StyledSelect className="jf-select" value={defectType} onChange={(e) => setDefectType(e.target.value)}>
                      <option value="">Select</option>
                      {DEFECT_TYPES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </StyledSelect>
                  </div>
                </div>

                {action === "REWORK" && (
                  <div className="jf-form-group">
                    <label className="jf-label">Redo from step</label>
                    <StyledSelect className="jf-select" value={reworkStep} onChange={(e) => setReworkStep(e.target.value)}>
                      {steps.map((op, i) => (
                        <option key={op.operationCode || i} value={op.operationCode || op.operationName}>
                          {op.operationName || op.operationCode}
                        </option>
                      ))}
                    </StyledSelect>
                  </div>
                )}

                <div className="jf-form-group">
                  <label className="jf-label">Notes (optional)</label>
                  <textarea className="jf-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Where the defect is, or how to fix it" />
                </div>

                <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", background: action === "REPRINT" ? "#fef2f2" : "#fffbeb", color: action === "REPRINT" ? "#991b1b" : "#92400e", fontSize: "0.8125rem", fontWeight: 600 }}>
                  {rej <= 0
                    ? "Enter the rejected pieces to see what happens next."
                    : action === "REPRINT"
                    ? `All ${rej} pieces are rejected, so the whole quantity goes to a reprint (needs approval).`
                    : `${rej} piece(s) go back for rework. The other ${accepted} are accepted.`}
                </div>
              </>
            )}
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className={`jf-btn ${result === "PASS" ? "jf-btn-primary" : "jf-btn-danger"}`} disabled={submitting}>
              {submitting ? "Saving..." : result === "PASS" ? "Submit — Pass" : "Submit — Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnhancedQCModal;
