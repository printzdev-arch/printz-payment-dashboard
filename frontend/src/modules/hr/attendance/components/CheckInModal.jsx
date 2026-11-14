import React, { useState, useEffect } from "react";
import { X, LogIn } from "lucide-react";
import attendanceApi from "../api/attendanceApi";
import TimeField from "../../../../shared/ui/selects/TimeField";

export default function CheckInModal({ isOpen, onClose, onCheckInSuccess, employee, branchId, date }) {
  const [time, setTime] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      setTime(`${hh}:${mm}`);
      setRemarks("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!time) {
      setError("Please specify check-in time.");
      return;
    }

    try {
      setLoading(true);
      await attendanceApi.recordCheckIn({
        employeeId: employee._id,
        branchId,
        attendanceDate: date,
        checkIn: time,
        remarks: remarks.trim(),
        source: "WEB_MOBILE",
      });
      onCheckInSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to record check-in.");
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
              <LogIn size={18} />
            </div>
            <h2>Record Check-In</h2>
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

        <form onSubmit={handleSubmit}>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ backgroundColor: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>{employee.employeeCode}</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>{employee.name}</div>
              <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>Date: {date}</div>
            </div>

            <div className="form-field">
              <label>Check-In Time (HH:mm) <span className="required">*</span></label>
              <TimeField
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label>Remarks / Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. On-time morning shift check-in"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-printz-outline" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-printz-primary" disabled={loading}>
              {loading ? "Checking In..." : "Confirm Check-In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
