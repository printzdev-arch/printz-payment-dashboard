import React, { useState, useEffect } from "react";
import { X, Play } from "lucide-react";
import jobFlowApi from "../api/productionApi";
import { toast } from "react-toastify";

export const OperationStartModal = ({
  isOpen,
  onClose,
  operation,
  productionOrder,
  onSuccess,
}) => {
  const [machineId, setMachineId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [machines, setMachines] = useState([]);
  const [inputQuantity, setInputQuantity] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [operators, setOperators] = useState([]);

  // Machines come from the existing machine list; only available operators are offered
  useEffect(() => {
    if (!isOpen) return;
    const listOf = (res) => {
      const body = res?.data || res || {};
      return Array.isArray(body) ? body : body.items || [];
    };
    jobFlowApi.getMachines({ lookup: true }).then((r) => setMachines(listOf(r))).catch(() => setMachines([]));
    jobFlowApi.getOperators({ lookup: true }).then((r) => setOperators(listOf(r))).catch(() => setOperators([]));
  }, [isOpen]);

  useEffect(() => {
    if (!operation) return;
    const idOf = (v) => (v && typeof v === "object" ? v._id || v.id || "" : v || "");
    setMachineId(String(idOf(operation.machineId) || ""));
    setOperatorId(String(idOf(operation.assignedEmployeeId) || ""));
    setInputQuantity(
      operation.inputQty || operation.plannedQty || productionOrder?.plannedQty || ""
    );
    setRemarks(operation.remarks || "");
  }, [operation, productionOrder]);

  if (!isOpen || !operation) return null;

  const opName = operation.operationName || operation.operation || operation.operationCode;
  const jobNumber = productionOrder?.jobNo || productionOrder?.jobOrderNo || "—";
  const seq = operation.sequenceNo || operation.sequence || "—";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(Number(inputQuantity) > 0)) {
      toast.error("Input quantity must be greater than zero.");
      return;
    }
    if (!machineId) {
      toast.error("Please choose the machine.");
      return;
    }
    if (!operatorId) {
      toast.error("Please choose the operator.");
      return;
    }

    setSubmitting(true);
    try {
      const opId = operation._id || operation.id;
      // The server stamps the real start time, so we do not send one.
      await jobFlowApi.startOperation(opId, {
        machineId,
        machine: machines.find((m) => String(m.id) === String(machineId))?.name || undefined,
        assignedEmployeeId: operatorId,
        inputQty: Number(inputQuantity),
        remarks: remarks.trim(),
      });
      toast.success(`Operation "${opName}" started.`);
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
          <div className="prod-modal-header-left">
            <div className="prod-modal-icon-badge green">
              <Play size={18} />
            </div>
            <div>
              <h3 className="jf-modal-title">Start Production Operation</h3>
              <span className="prod-modal-subtitle">
                Step #{seq}: {opName}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm prod-modal-close-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="jf-modal-body prod-modal-body-stack">
            <div className="prod-modal-info-box">
              <div>
                <span className="prod-modal-label">Job Order No:</span>
                <strong className="prod-modal-val">{jobNumber}</strong>
              </div>
              <div>
                <span className="prod-modal-label">Operation Code:</span>
                <span className="jf-badge jf-badge-info">{operation.operationCode || operation.code || "—"}</span>
              </div>
              <div>
                <span className="prod-modal-label">Sequence No:</span>
                <strong className="prod-modal-val">#{seq}</strong>
              </div>
            </div>

            <div className="prod-modal-grid-2">
              <div className="jf-form-group">
                <label className="jf-label">Assigned Operator</label>
                <select className="jf-input" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} required>
                  <option value="">Select operator</option>
                  {operators.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}{o.role ? ` (${o.role})` : ""}</option>
                  ))}
                </select>
                {operators.length === 0 && (
                  <span className="prod-field-hint">No available operators. Add or enable one in Production &gt; Operators.</span>
                )}
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Machine *</label>
                <select className="jf-input" value={machineId} onChange={(e) => setMachineId(e.target.value)} required>
                  <option value="">Select machine</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id} disabled={m.underMaintenance}>
                      {m.name}{m.underMaintenance ? " (under maintenance)" : ""}
                    </option>
                  ))}
                </select>
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
              <span className="prod-field-hint">
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
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="jf-btn jf-btn-primary prod-btn-with-icon"
              disabled={submitting}
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