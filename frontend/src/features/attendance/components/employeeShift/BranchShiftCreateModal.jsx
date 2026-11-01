import React, { useState, useMemo, useEffect } from "react";
import { X, ArrowLeftRight } from "lucide-react";
import branchShiftApi from "../../api/branchShiftApi";
import ShiftEmployeePicker from "./ShiftEmployeePicker";
import { todayKey } from "./shiftUtils";

const idOf = (v) => String(v?._id || v || "");

export default function BranchShiftCreateModal({ isOpen, onClose, onSuccess, branches = [] }) {
  const [employee, setEmployee] = useState(null);
  const [branchId, setBranchId] = useState("");
  const [fromDate, setFromDate] = useState(todayKey());
  const [toDate, setToDate] = useState(todayKey());
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Start every opening with a clean form
  useEffect(() => {
    if (!isOpen) return;
    setEmployee(null);
    setBranchId("");
    setFromDate(todayKey());
    setToDate(todayKey());
    setRemarks("");
    setError("");
  }, [isOpen]);

  const homeBranchId = idOf(employee?.branchId);

  // The destination can be any branch except the employee's home branch
  const destinationBranches = useMemo(
    () => branches.filter((b) => idOf(b) !== homeBranchId),
    [branches, homeBranchId]
  );

  const homeBranchName = useMemo(() => {
    if (!employee) return "";
    if (employee.branchId?.name) return employee.branchId.name;
    return branches.find((b) => idOf(b) === homeBranchId)?.name || "";
  }, [employee, branches, homeBranchId]);

  if (!isOpen) return null;

  const handleEmployeeChange = (emp) => {
    setEmployee(emp);
    if (emp && idOf(emp.branchId) === branchId) setBranchId("");
    setError("");
  };

  const validate = () => {
    if (!employee) return "Select an employee.";
    if (!branchId) return "Select a destination branch.";
    if (!fromDate || !toDate) return "Select both start and end dates.";
    if (fromDate > toDate) return "Start date cannot be after the end date.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      await branchShiftApi.createShift(employee._id, {
        branchId,
        fromDate,
        toDate,
        remarks: remarks.trim(),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to create shift.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "560px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="shift-modal-icon">
              <ArrowLeftRight size={18} />
            </div>
            <h2>Create Branch Shift</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="shift-modal-error">{error}</div>}

          <div className="shift-modal-body">
            <div className="form-field">
              <label>
                Employee <span className="required">*</span>
              </label>
              <ShiftEmployeePicker value={employee} onChange={handleEmployeeChange} />
              {homeBranchName && <span className="shift-hint">Home branch: {homeBranchName}</span>}
            </div>

            <div className="form-field">
              <label>
                Destination Branch <span className="required">*</span>
              </label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={!employee}>
                <option value="">{employee ? "Select branch..." : "Select an employee first"}</option>
                {destinationBranches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                    {b.code ? ` (${b.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group-row">
              <div className="form-field">
                <label>
                  From Date <span className="required">*</span>
                </label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="form-field">
                <label>
                  To Date <span className="required">*</span>
                </label>
                <input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>

            <div className="form-field">
              <label>Reason</label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Machine operator support for large order volume"
              />
            </div>

            <div className="shift-note">
              The employee's home branch and payroll stay unchanged. During these dates they appear in the
              destination branch's attendance list, and return to the home branch automatically after the end
              date.
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-printz-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-printz-primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create Shift"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
