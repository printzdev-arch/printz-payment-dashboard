import React from "react";
import { X, Clock, Calendar, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function ViewAttendanceModal({ isOpen, onClose, record }) {
  if (!isOpen || !record) return null;

  const emp = record.employeeId || {};
  const branch = record.branchId || {};
  const policySnapshot = record.policySnapshot || {};

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "560px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={18} />
            </div>
            <h2>Attendance Details</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Employee Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", padding: "14px 18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>{emp.employeeCode || "N/A"}</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{emp.name || "Employee"}</div>
              <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                {branch.name || "Branch"} &bull; {record.attendanceDate}
              </div>
            </div>
            <div>
              <span className={`status-badge ${(record.status || "present").toLowerCase().replace("_", "-")}`}>
                {record.status}
              </span>
            </div>
          </div>

          {/* Time & Hours Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: "#475569", fontWeight: 600 }}>CHECK-IN</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                {record.checkIn || "--:--"}
              </div>
              {record.lateArrival ? (
                <div style={{ fontSize: "11px", color: "#d97706", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                  <AlertTriangle size={12} />
                  <span>Late by {record.lateMinutes || 0} min</span>
                </div>
              ) : (
                <div style={{ fontSize: "11px", color: "#16a34a", marginTop: "4px" }}>On Time</div>
              )}
            </div>

            <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: "#475569", fontWeight: 600 }}>CHECK-OUT</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                {record.checkOut || "--:--"}
              </div>
              {record.earlyCheckout ? (
                <div style={{ fontSize: "11px", color: "#d97706", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                  <AlertTriangle size={12} />
                  <span>Early checkout by {record.earlyCheckoutMinutes || 0} min</span>
                </div>
              ) : (
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>Regular Checkout</div>
              )}
            </div>

            <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: "#475569", fontWeight: 600 }}>WORKED / PAID HOURS</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#059669", marginTop: "2px" }}>
                {record.workingHoursPerDay || 0}h / {record.paidWorkingHours || record.workingHoursPerDay || 0}h paid
              </div>
            </div>

            <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: "#475569", fontWeight: 600 }}>OVERTIME</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                {record.overtimeHours || 0}h
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
                Status: {record.overtimeStatus || "NONE"}
              </div>
            </div>
          </div>

          {/* Permissions section if any */}
          {((record.permissions && record.permissions.length > 0) || record.permission) && (
            <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={14} color="#059669" />
                <span>Approved Permissions</span>
              </div>
              {record.permissions && record.permissions.length > 0 ? (
                record.permissions.map((p, idx) => (
                  <div key={idx} style={{ fontSize: "12px", color: "#475569", display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: idx < record.permissions.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                    <span>{p.startTime} - {p.endTime} ({p.durationHours}h)</span>
                    <span style={{ fontStyle: "italic" }}>{p.reason}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "12px", color: "#475569" }}>
                  {record.permission.durationHours}h ({record.permission.startTime || ""} - {record.permission.endTime || ""}) &bull; {record.permission.reason || "Permission"}
                </div>
              )}
            </div>
          )}

          {/* Policy Snapshot details */}
          {policySnapshot.name && (
            <div style={{ fontSize: "11.5px", color: "#475569", backgroundColor: "#f1f5f9", padding: "10px 14px", borderRadius: "8px" }}>
              <strong>Applied Policy Snapshot:</strong> {policySnapshot.name} ({policySnapshot.shiftStartTime} - {policySnapshot.shiftEndTime}, Late Grace: {policySnapshot.lateGraceMinutes}m)
            </div>
          )}

          {record.remarks && (
            <div style={{ fontSize: "12.5px", color: "#334155" }}>
              <strong>Remarks:</strong> {record.remarks}
            </div>
          )}

          {record.isLocked && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#059669", backgroundColor: "#ecfdf5", padding: "8px 12px", borderRadius: "6px" }}>
              <ShieldCheck size={16} />
              <span>Attendance record finalized and locked.</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-printz-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
