import React, { useState, useEffect, useMemo } from "react";
import { X, Clock, AlertCircle } from "lucide-react";
import attendanceApi from "../api/attendanceApi";
import SearchableEmployeeSelect from "./SearchableEmployeeSelect";
import { DateField } from "../../../../shared/ui/selects/CalendarSelect";
import BranchSelect from "../../../../shared/ui/selects/BranchSelect";
import TimeField from "../../../../shared/ui/selects/TimeField";

export default function RecordPermissionModal({
  isOpen,
  onClose,
  onSave,
  employees = [],
  branches = [],
  selectedBranchId = "",
  editingPermission = null,
}) {
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(null);

  const [branchId, setBranchId] = useState("");
  const [modalEmployees, setModalEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [permissionDate, setPermissionDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [durationHours, setDurationHours] = useState(2);
  const [reason, setReason] = useState("");

  const empList = useMemo(() => {
    const source = modalEmployees.length
      ? modalEmployees
      : Array.isArray(employees)
      ? employees
      : Array.isArray(employees?.items)
      ? employees.items
      : [];
    if (!branchId) return source;
    return source.filter((emp) => {
      const bId = emp.branchId?._id || emp.branchId;
      return String(bId || "") === String(branchId);
    });
  }, [employees, modalEmployees, branchId]);

  // The popup loads the employees of the chosen branch itself
  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    attendanceApi
      .getEmployees({ status: "ACTIVE", limit: 100, ...(branchId ? { filterBranchId: branchId } : {}) })
      .then((data) => {
        if (!cancelled) setModalEmployees(Array.isArray(data) ? data : data?.items || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, branchId]);

  useEffect(() => {
    if (isOpen) {
      if (editingPermission) {
        const empId = editingPermission.employeeId?._id || editingPermission.employeeId || "";
        setEmployeeId(empId);
        setBranchId(
          String(
            editingPermission.branchId?._id ||
              editingPermission.branchId ||
              editingPermission.employeeId?.branchId?._id ||
              editingPermission.employeeId?.branchId ||
              selectedBranchId ||
              ""
          )
        );
        setPermissionDate(editingPermission.permissionDate || "");
        setStartTime(editingPermission.startTime || "10:00");
        setEndTime(editingPermission.endTime || "12:00");
        setDurationHours(editingPermission.durationHours || 2);
        setReason(editingPermission.reason || "");
        if (empId) fetchBalance(empId);
      } else {
        const todayStr = new Date().toISOString().split("T")[0];
        setBranchId(String(selectedBranchId || ""));
        setEmployeeId("");
        setBalance(null);
        setPermissionDate(todayStr);
        setStartTime("10:00");
        setEndTime("12:00");
        setDurationHours(2);
        setReason("");
      }
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingPermission]);

  // Recalculate duration whenever start or end time changes
  useEffect(() => {
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      if (endMin > startMin) {
        const diff = (endMin - startMin) / 60;
        setDurationHours(Math.round(diff * 100) / 100);
      } else {
        setDurationHours(0);
      }
    }
  }, [startTime, endTime]);

  const fetchBalance = async (empId) => {
    if (!empId) return;
    try {
      setBalanceLoading(true);
      const res = await attendanceApi.getEmployeePermissionBalance(empId);
      setBalance(res?.data || res);
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleEmployeeChange = (e) => {
    const val = e.target.value;
    setEmployeeId(val);
    fetchBalance(val);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!branchId) {
      setError("Please select a branch.");
      return;
    }
    if (!employeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!permissionDate) {
      setError("Please select a date.");
      return;
    }
    if (!startTime || !endTime) {
      setError("Please specify valid start and end times.");
      return;
    }
    if (durationHours <= 0) {
      setError("End time must be after start time.");
      return;
    }
    if (!reason.trim()) {
      setError("Reason for permission is required.");
      return;
    }

    if (balance && durationHours > balance.remainingHours) {
      setError(
        `Requested duration of ${durationHours}h exceeds remaining monthly allowance of ${balance.remainingHours}h.`
      );
      return;
    }

    try {
      setLoading(true);
      const payload = {
        employeeId,
        branchId: branchId || selectedBranchId || undefined,
        permissionDate,
        startTime,
        endTime,
        durationHours,
        reason: reason.trim(),
      };

      if (editingPermission?._id) {
        await attendanceApi.updatePermission(editingPermission._id, payload);
      } else {
        await attendanceApi.createPermission(payload);
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to record permission.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "520px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={18} />
            </div>
            <h2>{editingPermission ? "Edit Permission" : "Record Permission"}</h2>
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
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-field">
              <label>Branch <span className="required">*</span></label>
              <BranchSelect
                valueKey="id"
                lockToUserBranch
                branches={branches}
                value={branchId}
                placeholder="Select branch"
                onChange={(e) => {
                  const id = e.target.value;
                  setBranchId(id);
                  // A different branch means a different list of employees
                  if (id !== branchId) {
                    setEmployeeId("");
                    setBalance(null);
                  }
                }}
              />
            </div>

            <div className="form-field">
              <label>Employee <span className="required">*</span></label>
              <SearchableEmployeeSelect
                value={employeeId}
                onChange={(val) => {
                  setEmployeeId(val);
                  fetchBalance(val);
                }}
                employees={empList}
                branches={branches}
                placeholder={branchId ? "Search employee by name or code..." : "Select a branch first"}
                disabled={!branchId}
                required
              />
            </div>

            {/* Live Monthly Balance Banner */}
            {balance && (
              <div style={{ backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#065f46", fontWeight: 700 }}>MONTHLY ALLOWANCE</div>
                  <div style={{ fontSize: "13px", color: "#047857" }}>
                    Total: <strong>{balance.monthlyAllowanceHours ?? 4}h</strong> &bull; Used: <strong>{balance.usedHours ?? 0}h</strong>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "#065f46", fontWeight: 700 }}>REMAINING</div>
                  <div style={{ fontSize: "16px", color: "#059669", fontWeight: 800 }}>
                    {balance.remainingHours ?? 4}h
                  </div>
                </div>
              </div>
            )}

            <div className="form-group-row">
              <div className="form-field">
                <label>Date <span className="required">*</span></label>
                <DateField
                  value={permissionDate}
                  onChange={(e) => setPermissionDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label>Duration (Calculated)</label>
                <input
                  type="text"
                  value={`${durationHours}h`}
                  readOnly
                  style={{ backgroundColor: "#f8fafc", fontWeight: 700, color: "#059669" }}
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-field">
                <label>Start Time (HH:mm) <span className="required">*</span></label>
                <TimeField
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label>End Time (HH:mm) <span className="required">*</span></label>
                <TimeField
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label>Reason <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g. Doctor Visit, Personal Work, Bank Work"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-printz-outline" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-printz-primary" disabled={loading}>
              {loading ? "Saving..." : (editingPermission ? "Update Permission" : "Save Permission")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
