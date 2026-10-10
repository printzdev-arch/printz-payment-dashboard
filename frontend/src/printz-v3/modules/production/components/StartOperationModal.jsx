import React, { useState } from "react";
import { Play, X, User, Cpu, Clock, AlertCircle } from "lucide-react";

export default function StartOperationModal({
  isOpen,
  onClose,
  operation,
  productionOrder,
  onConfirmStart,
  currentUser = { name: "Karthik V", role: "Operator" },
  machines = []
}) {
  if (!isOpen || !operation) return null;

  const [selectedMachine, setSelectedMachine] = useState(
    operation.assignedMachine || operation.machine || ""
  );
  const [operatorName, setOperatorName] = useState(
    operation.operator || currentUser?.name || "Karthik V"
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirmStart({
        machine: selectedMachine,
        operator: operatorName,
        notes: notes
      });
      onClose();
    } catch (err) {
      console.error("Failed to start operation:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="prod-modal-overlay">
      <div className="prod-modal-content" style={{ maxWidth: "520px" }}>
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
              <Play size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                Start Operation: {operation.name || operation.operationName}
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
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Customer</span>
                  <strong style={{ color: "#0f172a" }}>{productionOrder?.customerName || "Apex Global Traders"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Target Quantity</span>
                  <strong style={{ color: "#0f172a" }}>{(operation.plannedQty || productionOrder?.plannedQty || 1000).toLocaleString()} pcs</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Est. Duration</span>
                  <strong style={{ color: "#0f172a" }}>{operation.estimatedMinutes || 25} mins</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Job Item</span>
                  <strong style={{ color: "#0f172a" }}>{productionOrder?.productName || "Luxury Cards"}</strong>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                <Cpu size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                Assigned Production Machine
              </label>
              <select
                className="prod-form-input"
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                required
              >
                <option value="">-- Select Machine --</option>
                {machines.length > 0 ? (
                  machines.map((m) => (
                    <option key={m.id || m.machineId || m.name} value={m.name || m.machineName}>
                      {m.name || m.machineName} ({m.technology || m.type || "Available"})
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

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                <User size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                Assigned Lead Operator
              </label>
              <input
                type="text"
                className="prod-form-input"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="Operator Name"
                required
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                <Clock size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                Starting Setup Notes (Optional)
              </label>
              <textarea
                className="prod-form-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Calibration checks, plate registration verified, ink fountain filled..."
              />
            </div>

            <div className="prod-notice-box">
              <AlertCircle size={15} />
              <span>Starting will mark operation as <strong>RUNNING</strong> and lock sequencing for subsequent operations.</span>
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
              disabled={isSubmitting}
              style={{ background: "#047857", borderColor: "#047857" }}
            >
              {isSubmitting ? "Starting..." : "Confirm & Start Operation ▶"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
