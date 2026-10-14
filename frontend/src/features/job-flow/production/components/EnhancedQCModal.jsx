import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  FileText,
  RotateCcw,
  Printer,
  Eye,
} from "lucide-react";
import jobFlowApi from "../api/productionApi";
import { toast } from "react-toastify";

export const EnhancedQCModal = ({
  isOpen,
  onClose,
  productionOrder,
  onSuccess,
}) => {
  const [qcType, setQcType] = useState("FINAL");
  const [result, setResult] = useState("PASS");
  const [quantityChecked, setQuantityChecked] = useState(1000);
  const [acceptedQty, setAcceptedQty] = useState(1000);
  const [rejectedQty, setRejectedQty] = useState(0);

  // Defect repeatable list
  const [defects, setDefects] = useState([]);

  // Corrective action when result === "ISSUE"
  const [correctiveAction, setCorrectiveAction] = useState("REWORK");
  const [reworkOperationCode, setReworkOperationCode] = useState("PRINT");
  const [restartFromOperationCode, setRestartFromOperationCode] = useState("PRINT");
  const [reprintQuantity, setReprintQuantity] = useState(0);

  const [issueDetails, setIssueDetails] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (productionOrder) {
      const q =
        Number(productionOrder.actualQty) ||
        Number(productionOrder.plannedQty) ||
        1000;
      setQuantityChecked(q);
      setAcceptedQty(q);
      setRejectedQty(0);
      setReprintQuantity(q);
      setResult("PASS");
      setDefects([]);
      setIssueDetails("");
      setComments("");
    }
  }, [productionOrder]);

  if (!isOpen || !productionOrder) return null;

  const handleCheckedChange = (val) => {
    const q = Math.max(0, Number(val) || 0);
    setQuantityChecked(q);
    if (result === "PASS") {
      setAcceptedQty(q);
      setRejectedQty(0);
    } else {
      setRejectedQty(Math.max(0, q - acceptedQty));
    }
  };

  const handleAcceptedChange = (val) => {
    const a = Math.max(0, Number(val) || 0);
    setAcceptedQty(a);
    setRejectedQty(Math.max(0, quantityChecked - a));
    if (correctiveAction === "REPRINT") {
      setReprintQuantity(Math.max(0, quantityChecked - a));
    }
  };

  const handleRejectedChange = (val) => {
    const r = Math.max(0, Number(val) || 0);
    setRejectedQty(r);
    setAcceptedQty(Math.max(0, quantityChecked - r));
    if (correctiveAction === "REPRINT") {
      setReprintQuantity(r);
    }
  };

  const handleAddDefect = () => {
    setDefects((prev) => [
      ...prev,
      {
        defectCode: `DEF-0${prev.length + 1}`,
        description: "Surface blemish or color offset",
        severity: "MAJOR",
        affectedQuantity: rejectedQty > 0 ? rejectedQty : 50,
        issueDetails: "",
      },
    ]);
  };

  const handleRemoveDefect = (index) => {
    setDefects((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateDefect = (index, field, value) => {
    setDefects((prev) =>
      prev.map((d, idx) => (idx === index ? { ...d, [field]: value } : d))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const qCheck = Number(quantityChecked);
    const qAcc = Number(acceptedQty);
    const qRej = Number(rejectedQty);

    if (qCheck <= 0) {
      toast.error("Quantity Checked must be greater than zero.");
      return;
    }

    if (qAcc + qRej !== qCheck) {
      toast.error(
        `Quantity balance error: Accepted (${qAcc}) + Rejected (${qRej}) must equal Quantity Checked (${qCheck}).`
      );
      return;
    }

    if (result === "ISSUE") {
      if (qRej <= 0) {
        toast.error("Rejected Quantity must be greater than zero when reporting an Issue.");
        return;
      }
      if (!issueDetails.trim() && defects.length === 0) {
        toast.error("Please provide issue details or add defects explaining the quality failure.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const orderId = productionOrder._id || productionOrder.id;
      const payload = {
        checkType: qcType,
        result,
        quantityChecked: qCheck,
        acceptedQty: qAcc,
        rejectedQty: qRej,
        defects,
        issueDetails:
          issueDetails ||
          (defects.length > 0 ? defects.map((d) => `${d.severity}: ${d.description}`).join("; ") : ""),
        correctiveAction: result === "PASS" ? "NONE" : correctiveAction,
        reworkOperationCode: correctiveAction === "REWORK" ? reworkOperationCode : undefined,
        restartFromOperationCode: correctiveAction === "REPRINT" ? restartFromOperationCode : undefined,
        reprintQuantity: correctiveAction === "REPRINT" ? Number(reprintQuantity) || qRej : undefined,
        comments,
      };

      await jobFlowApi.performQualityCheck(orderId, payload);

      if (result === "PASS") {
        toast.success(
          `Production Order ${productionOrder.orderNumber} PASSED QC! Moved to Delivery Order preparation.`
        );
      } else if (correctiveAction === "REWORK") {
        toast.info(
          `Targeted rework initiated on step "${reworkOperationCode}" for ${qRej} defective pieces.`
        );
      } else {
        toast.warning(
          `Full reprint request submitted for manager approval (${reprintQuantity || qRej} pieces).`
        );
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record quality check.");
    } finally {
      setSubmitting(false);
    }
  };

  // Extract available operations from order to populate rework dropdown
  const availableOps = Array.isArray(productionOrder.operations)
    ? productionOrder.operations
    : [
        { operationCode: "PRINT", operationName: "Printing" },
        { operationCode: "LAMINATION", operationName: "Lamination" },
        { operationCode: "CUTTING", operationName: "Cutting & Trimming" },
        { operationCode: "BINDING", operationName: "Binding" },
        { operationCode: "PACKING", operationName: "Packing" },
      ];

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-lg">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                background: result === "PASS" ? "#dcfce7" : "#fee2e2",
                color: result === "PASS" ? "#15803d" : "#dc2626",
                padding: "6px",
                borderRadius: "8px",
                display: "flex",
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="jf-modal-title">Quality Control (QC) Inspection</h3>
              <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                Order #{productionOrder.orderNumber || "PO"} • Job #
                {productionOrder.jobOrderNo || productionOrder.jobOrderId?.jobNo || "JO"}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            onClick={onClose}
            style={{ padding: "4px" }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="jf-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Section A: Production Information (Read-only) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "0.75rem",
                padding: "0.875rem",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "0.8125rem",
              }}
            >
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Customer:</span>
                <strong style={{ color: "#0f172a" }}>
                  {productionOrder.customerName || "Customer"}
                </strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Job Item / Product:</span>
                <strong style={{ color: "#0f172a" }}>
                  {productionOrder.productName || productionOrder.title || "Print Job"}
                </strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Planned Quantity:</span>
                <strong style={{ color: "#0f172a" }}>
                  {productionOrder.plannedQty || 1000} units
                </strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Actual Production:</span>
                <strong style={{ color: "#166534" }}>
                  {productionOrder.actualQty || productionOrder.plannedQty || 1000} units
                </strong>
              </div>
            </div>

            {/* Section B: Inspection Information */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: "1rem" }}>
              <div className="jf-form-group">
                <label className="jf-label">Inspection Stage</label>
                <select
                  className="jf-input"
                  value={qcType}
                  onChange={(e) => setQcType(e.target.value)}
                >
                  <option value="FINAL">FINAL (Post-Packing Inspection)</option>
                  <option value="STAGE">STAGE (In-Process Check)</option>
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Quantity Checked *</label>
                <input
                  type="number"
                  min="1"
                  className="jf-input"
                  value={quantityChecked}
                  onChange={(e) => handleCheckedChange(e.target.value)}
                  required
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Accepted Qty *</label>
                <input
                  type="number"
                  min="0"
                  className="jf-input"
                  value={acceptedQty}
                  onChange={(e) => handleAcceptedChange(e.target.value)}
                  required
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Rejected Qty *</label>
                <input
                  type="number"
                  min="0"
                  className="jf-input"
                  value={rejectedQty}
                  onChange={(e) => handleRejectedChange(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Section D: QC Result Selector */}
            <div className="jf-form-group">
              <label className="jf-label">QC Verdict *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <button
                  type="button"
                  className={`jf-btn ${result === "PASS" ? "jf-btn-primary" : "jf-btn-secondary"}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.75rem",
                  }}
                  onClick={() => {
                    setResult("PASS");
                    setAcceptedQty(quantityChecked);
                    setRejectedQty(0);
                  }}
                >
                  <CheckCircle2 size={18} />
                  PASS (Ready for Delivery)
                </button>

                <button
                  type="button"
                  className={`jf-btn ${result === "ISSUE" ? "jf-btn-danger" : "jf-btn-secondary"}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.75rem",
                  }}
                  onClick={() => {
                    setResult("ISSUE");
                    if (rejectedQty === 0) {
                      setRejectedQty(Math.max(1, Math.round(quantityChecked * 0.1)));
                      setAcceptedQty(Math.max(0, quantityChecked - Math.max(1, Math.round(quantityChecked * 0.1))));
                    }
                  }}
                >
                  <AlertTriangle size={18} />
                  ISSUE FOUND (Requires Rework or Reprint)
                </button>
              </div>
            </div>

            {/* When ISSUE is chosen: Corrective Action + Defect Builder */}
            {result === "ISSUE" && (
              <div
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  padding: "1rem",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div>
                  <h4 style={{ margin: "0 0 0.5rem 0", color: "#9f1239", fontSize: "0.9375rem" }}>
                    Corrective Action Decision
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        background: "#ffffff",
                        padding: "0.625rem",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="correctiveAction"
                        checked={correctiveAction === "REWORK"}
                        onChange={() => setCorrectiveAction("REWORK")}
                      />
                      <div>
                        <strong style={{ display: "block", fontSize: "0.8125rem", color: "#0f172a" }}>
                          Targeted Rework
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          Reopen defective finishing operation without restarting completed print
                        </span>
                      </div>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        background: "#ffffff",
                        padding: "0.625rem",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="correctiveAction"
                        checked={correctiveAction === "REPRINT"}
                        onChange={() => setCorrectiveAction("REPRINT")}
                      />
                      <div>
                        <strong style={{ display: "block", fontSize: "0.8125rem", color: "#0f172a" }}>
                          Full Reprint
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          Request supervisor approval for fresh media run from Prepress/Print
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {correctiveAction === "REWORK" ? (
                  <div className="jf-form-group">
                    <label className="jf-label">Defective Operation to Reopen *</label>
                    <select
                      className="jf-input"
                      value={reworkOperationCode}
                      onChange={(e) => setReworkOperationCode(e.target.value)}
                    >
                      {availableOps.map((op, idx) => (
                        <option
                          key={idx}
                          value={op.operationCode || op.code || op.operationName}
                        >
                          Step #{op.sequenceNo || idx + 1}: {op.operationName || op.operation} ({op.operationCode || "OP"})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="jf-form-group">
                      <label className="jf-label">Reprint Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        className="jf-input"
                        value={reprintQuantity}
                        onChange={(e) => setReprintQuantity(e.target.value)}
                        required
                      />
                    </div>
                    <div className="jf-form-group">
                      <label className="jf-label">Restart From Stage</label>
                      <select
                        className="jf-input"
                        value={restartFromOperationCode}
                        onChange={(e) => setRestartFromOperationCode(e.target.value)}
                      >
                        <option value="PRINT">PRINT (Full Batch Rerun)</option>
                        <option value="PREPRESS">PREPRESS (Pre-press File Setup)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Section C: Repeatable Defect List */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #fed7aa",
                    borderRadius: "8px",
                    padding: "0.875rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <strong style={{ fontSize: "0.875rem", color: "#0f172a" }}>
                      Defect Log / Specific Imperfections
                    </strong>
                    <button
                      type="button"
                      className="jf-btn jf-btn-secondary jf-btn-sm"
                      onClick={handleAddDefect}
                      style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
                    >
                      <Plus size={14} /> Add Defect Item
                    </button>
                  </div>

                  {defects.length === 0 ? (
                    <div
                      style={{
                        padding: "0.75rem",
                        textAlign: "center",
                        background: "#fff7ed",
                        borderRadius: "6px",
                        color: "#9a3412",
                        fontSize: "0.8125rem",
                      }}
                    >
                      No individual defect codes logged. Add specific defects or enter summary below.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {defects.map((def, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 2fr 1.2fr 1fr auto",
                            gap: "0.5rem",
                            alignItems: "center",
                            background: "#fff7ed",
                            padding: "0.5rem",
                            borderRadius: "6px",
                          }}
                        >
                          <input
                            type="text"
                            className="jf-input jf-input-sm"
                            placeholder="Code"
                            value={def.defectCode}
                            onChange={(e) => handleUpdateDefect(idx, "defectCode", e.target.value)}
                          />
                          <input
                            type="text"
                            className="jf-input jf-input-sm"
                            placeholder="Description"
                            value={def.description}
                            onChange={(e) => handleUpdateDefect(idx, "description", e.target.value)}
                          />
                          <select
                            className="jf-input jf-input-sm"
                            value={def.severity}
                            onChange={(e) => handleUpdateDefect(idx, "severity", e.target.value)}
                          >
                            <option value="MINOR">MINOR</option>
                            <option value="MAJOR">MAJOR</option>
                            <option value="CRITICAL">CRITICAL</option>
                          </select>
                          <input
                            type="number"
                            min="1"
                            className="jf-input jf-input-sm"
                            placeholder="Qty"
                            value={def.affectedQuantity}
                            onChange={(e) => handleUpdateDefect(idx, "affectedQuantity", e.target.value)}
                          />
                          <button
                            type="button"
                            className="jf-btn jf-btn-danger jf-btn-sm"
                            style={{ padding: "4px 8px" }}
                            onClick={() => handleRemoveDefect(idx)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Issue Details / Corrective Instructions *</label>
                  <textarea
                    className="jf-input"
                    rows="2"
                    value={issueDetails}
                    onChange={(e) => setIssueDetails(e.target.value)}
                    placeholder="Describe specific defect location, root cause, and how operator should resolve..."
                  />
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="jf-form-group">
              <label className="jf-label">Inspector Sign-off Comments</label>
              <textarea
                className="jf-input"
                rows="2"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Inspected against approved proof; color density, margin trims, and binding rigidity verified..."
              />
            </div>
          </div>

          <div className="jf-modal-footer">
            <button
              type="button"
              className="jf-btn jf-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`jf-btn ${result === "PASS" ? "jf-btn-primary" : "jf-btn-danger"}`}
              disabled={submitting}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {submitting ? (
                "Submitting Inspection..."
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Submit QC Result ({result})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnhancedQCModal;
