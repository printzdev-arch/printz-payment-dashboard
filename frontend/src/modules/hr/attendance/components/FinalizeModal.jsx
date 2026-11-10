import React, { useState } from "react";
import { X, Lock, ShieldCheck } from "lucide-react";
import attendanceApi from "../api/attendanceApi";

export default function FinalizeModal({ isOpen, onClose, onSuccess, branchId, date }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleFinalize = async () => {
    try {
      setLoading(true);
      setError("");
      await attendanceApi.finalizeAttendance({
        branchId,
        attendanceDate: date,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to finalize attendance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "460px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Lock size={18} />
            </div>
            <h2>Finalize & Lock Attendance</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "10px 24px", fontSize: "13px", borderBottom: "1px solid #fee2e2" }}>
            {error}
          </div>
        )}

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ backgroundColor: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "14px", color: "#0f172a", fontWeight: 700 }}>
              Attendance Date: {date}
            </div>
            <p style={{ fontSize: "12.5px", color: "#475569", margin: "6px 0 0 0" }}>
              Finalizing locks all daily attendance records for this branch on the selected date. Once locked, records cannot be edited or deleted by branch managers without Super Admin reopening.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-printz-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="btn-printz-primary" onClick={handleFinalize} disabled={loading}>
            {loading ? "Locking..." : "Confirm & Finalize"}
          </button>
        </div>
      </div>
    </div>
  );
}
