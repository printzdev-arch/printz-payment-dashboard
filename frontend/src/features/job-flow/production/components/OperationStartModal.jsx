import React, { useState, useEffect } from "react";
import { X, Play, Clock, CheckCircle, AlertCircle } from "lucide-react";
import jobFlowApi from "../api/productionApi";
import { toast } from "react-toastify";

export const OperationStartModal = ({
  isOpen,
  onClose,
  operation,
  productionOrder,
  onSuccess,
}) => {
  const [machine, setMachine] = useState("");
  const [assignedEmployee, setAssignedEmployee] = useState("");
  const [inputQuantity, setInputQuantity] = useState(1000);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (operation) {
      setMachine(operation.machine || operation.machineId?.name || "Digital Press 01");
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      setAssignedEmployee(
        operation.assignedEmployee ||
        operation.operatorId?.name ||
        storedUser.name ||
        "Production Operator"
      );
      setInputQuantity(
        operation.inputQty ||
        operation.plannedQty ||
        productionOrder?.plannedQty ||
        1000
      );
      setRemarks(operation.remarks || "");
    }
  }, [operation, productionOrder]);

  if (!isOpen || !operation) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Number(inputQuantity) <= 0) {
      toast.error("Input quantity must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      const opId = operation._id || operation.id;
      const payload = {
        machine,
        assignedEmployee,
        inputQty: Number(inputQuantity),
        remarks,
        actualStart: new Date(),
      };

      await jobFlowApi.startOperation(opId, payload);
      toast.success(`Operation "${operation.operationName || operation.operation}" started!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start operation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                background: "#dcfce7",
                color: "#15803d",
                padding: "6px",
                borderRadius: "8px",
                display: "flex",
              }}
            >
              <Play size={18} />
            </div>
            <div>
              <h3 className="jf-modal-title">Start Production Operation</h3>
              <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                Step #{operation.sequenceNo || operation.sequence}:{" "}
                {operation.operationName || operation.operation}
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
          <div className="jf-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Read-only Context Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
                padding: "0.75rem",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "0.8125rem",
              }}
            >
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Production Order:</span>
                <strong style={{ color: "#0f172a" }}>
                  {productionOrder?.orderNumber || "PO-CURRENT"}
                </strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Job Order No:</span>
                <strong style={{ color: "#0f172a" }}>
                  {productionOrder?.jobOrderNo || productionOrder?.jobOrderId?.jobNo || "JO-CURRENT"}
                </strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Operation Code:</span>
                <span className="jf-badge jf-badge-info">
                  {operation.operationCode || operation.code || "OP"}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Sequence No:</span>
                <strong style={{ color: "#0f172a" }}>
                  #{operation.sequenceNo || operation.sequence || 1}
                </strong>
              </div>
            </div>

            {/* Editable Start Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="jf-form-group">
                <label className="jf-label">Assigned Operator *</label>
                <input
                  type="text"
                  className="jf-input"
                  value={assignedEmployee}
                  onChange={(e) => setAssignedEmployee(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  required
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Machine / Station *</label>
                <input
                  type="text"
                  className="jf-input"
                  value={machine}
                  onChange={(e) => setMachine(e.target.value)}
                  placeholder="e.g. Konica Minolta AccurioPress"
                  required
                />
              </div>
            </div>

            <div className="jf-form-group">
              <label className="jf-label">Input Quantity (Sheets/Pieces) *</label>
              <input
                type="number"
                min="1"
                className="jf-input"
                value={inputQuantity}
                onChange={(e) => setInputQuantity(e.target.value)}
                required
              />
              <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                Total stock/pieces fed into this operation.
              </span>
            </div>

            <div className="jf-form-group">
              <label className="jf-label">Start Remarks / Pre-run Checklist Notes</label>
              <textarea
                className="jf-input"
                rows="2"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Calibration verified, media aligned, ink levels checked..."
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
              className="jf-btn jf-btn-primary"
              disabled={submitting}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {submitting ? (
                "Starting..."
              ) : (
                <>
                  <Play size={16} />
                  Start Operation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OperationStartModal;
