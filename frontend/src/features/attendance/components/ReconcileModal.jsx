import React, { useState, useEffect } from "react";
import { X, CheckSquare, AlertCircle } from "lucide-react";
import attendanceApi from "../api/attendanceApi";

export default function ReconcileModal({ isOpen, onClose, onSuccess, branchId, date }) {
  const [loading, setLoading] = useState(false);
  const [missingData, setMissingData] = useState(null);
  const [autoFillAbsent, setAutoFillAbsent] = useState(true);
  const [remarks, setRemarks] = useState("Reconciled by Admin");
  const [error, setError] = useState("");
  // Per-employee leave choice: "" (use default) | "PAID" | "UNPAID"
  const [leaveChoice, setLeaveChoice] = useState({});

  useEffect(() => {
    if (isOpen && branchId && date) {
      setLeaveChoice({});
      loadMissing();
    }
  }, [isOpen, branchId, date]);

  const loadMissing = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await attendanceApi.getMissingAttendance({
        branchId,
        attendanceDate: date,
      });
      setMissingData(res?.data || res);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load missing attendance.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleReconcile = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError("");
      // Payroll treats paid and unpaid leave differently, so leave days are
      // submitted as explicit records with their leave type.
      const leaveRecords = Object.entries(leaveChoice)
        .filter(([, type]) => type === "PAID" || type === "UNPAID")
        .map(([employeeId, leavePaymentType]) => ({
          employeeId,
          status: "ON_LEAVE",
          leavePaymentType,
        }));

      await attendanceApi.reconcileAttendance({
        branchId,
        attendanceDate: date,
        autoFillAbsent,
        remarks: remarks.trim(),
        records: leaveRecords,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to reconcile attendance.");
    } finally {
      setLoading(false);
    }
  };

  const missingList = missingData?.missingEmployees || [];

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "560px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckSquare size={18} />
            </div>
            <h2>Resolve / Reconcile Attendance</h2>
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

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ backgroundColor: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#475569" }}>Date: <strong>{date}</strong></div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
              Missing Attendance: {missingData ? missingList.length : "Checking..."} employee(s)
            </div>
          </div>

          {missingList.length > 0 ? (
            <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              {missingList.map((emp) => (
                <div key={emp._id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "12.5px" }}>
                  <span><strong>{emp.employeeCode}</strong> &bull; {emp.name}</span>
                  <select
                    value={leaveChoice[emp._id] || ""}
                    onChange={(e) => setLeaveChoice({ ...leaveChoice, [emp._id]: e.target.value })}
                    style={{ fontSize: "12px", padding: "2px 6px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    title="Choose how this day is recorded"
                  >
                    <option value="">{autoFillAbsent ? "Absent (auto-fill)" : "Leave unrecorded"}</option>
                    <option value="PAID">On Leave — Paid</option>
                    <option value="UNPAID">On Leave — Unpaid</option>
                  </select>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "16px", textAlign: "center", color: "#059669", fontSize: "13px", backgroundColor: "#ecfdf5", borderRadius: "8px" }}>
              No missing attendance entries found for this date.
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            <label className="switch">
              <input
                type="checkbox"
                checked={autoFillAbsent}
                onChange={(e) => setAutoFillAbsent(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
              Auto-fill remaining missing employees as Absent
            </span>
          </div>

          <div className="form-field">
            <label>Reconciliation Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. End of day reconciliation by Admin"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-printz-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-printz-primary"
            onClick={handleReconcile}
            disabled={loading || (missingList.length === 0 && !autoFillAbsent) || (!autoFillAbsent && !Object.values(leaveChoice).some(Boolean))}
          >
            {loading ? "Reconciling..." : "Confirm Reconciliation"}
          </button>
        </div>
      </div>
    </div>
  );
}
