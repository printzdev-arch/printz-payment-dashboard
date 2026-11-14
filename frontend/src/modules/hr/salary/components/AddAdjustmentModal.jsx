import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import salaryApi from "../api/salaryApi";
import { flagIfMaintenance } from "../utils/salaryGuards";
import BranchSelect from "../../../../shared/ui/selects/BranchSelect";

export default function AddAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  branches = [],
  initialBranchId = "",
}) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const now = new Date();
  const [formData, setFormData] = useState({
    employeeId: "",
    branchId: initialBranchId || "",
    type: "INCENTIVE",
    amount: "",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    reason: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      setError("");
      setFormData({
        employeeId: "",
        branchId: initialBranchId || (branches[0]?._id ? String(branches[0]._id) : ""),
        type: "INCENTIVE",
        amount: "",
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        reason: "",
        notes: "",
      });
      loadEmployees();
    }
  }, [isOpen, initialBranchId]);

  const loadEmployees = async () => {
    try {
      const data = await salaryApi.getEmployees({ limit: 200, status: "ACTIVE" });
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  };

  // The backend rejects adjustments once the period's run is approved, paid or
  // locked; warn up front instead of after submit.
  const [periodRunStatus, setPeriodRunStatus] = useState("");
  useEffect(() => {
    if (!isOpen || !formData.branchId) {
      setPeriodRunStatus("");
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await salaryApi.listRuns({ branchId: formData.branchId, limit: 100 });
        const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
        const run = (Array.isArray(list) ? list : []).find(
          (r) =>
            Number(r.payrollYear) === Number(formData.year) &&
            Number(r.payrollMonth) === Number(formData.month)
        );
        if (!cancelled) setPeriodRunStatus(run?.status || "");
      } catch {
        if (!cancelled) setPeriodRunStatus("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, formData.branchId, formData.year, formData.month]);
  const periodClosed = ["APPROVED", "PAID", "LOCKED"].includes(periodRunStatus);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    try {
      if (!formData.employeeId) {
        setError("Please select an employee.");
        return;
      }
      if (!formData.amount || Number(formData.amount) <= 0) {
        setError("Please enter a valid amount.");
        return;
      }
      if (!formData.reason) {
        setError("Please enter a reason.");
        return;
      }

      setLoading(true);
      setError("");

      if (!formData.branchId) {
        setError("Please select a branch.");
        return;
      }

      const description = formData.notes.trim()
        ? `${formData.reason.trim()} — ${formData.notes.trim()}`
        : formData.reason.trim();

      const payload = {
        employeeId: formData.employeeId,
        branchId: formData.branchId,
        adjustmentType: formData.type,
        amount: Number(formData.amount),
        payrollYear: Number(formData.year),
        payrollMonth: Number(formData.month),
        description,
      };

      await salaryApi.createAdjustment(payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      if (!flagIfMaintenance(err)) setError(err?.response?.data?.message || err?.message || "Failed to create adjustment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="salary-modal-overlay">
      <div className="salary-modal-card" style={{ maxWidth: "540px" }}>
        <div className="salary-modal-header">
          <h3 className="salary-modal-title">Add Monthly Adjustment</h3>
          <button type="button" className="salary-modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="salary-modal-body">
            {error && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
                {error}
              </div>
            )}
            {periodClosed && (
              <div style={{ background: "#fef3c7", color: "#92400e", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
                The payroll run for this month is already {periodRunStatus.toLowerCase()}, so new adjustments can no longer be added for it.
              </div>
            )}

            <div className="salary-form-grid" style={{ marginBottom: "14px" }}>
              <div className="salary-form-group">
                <label>Employee <span className="req">*</span></label>
                <select
                  className="salary-form-select"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees
                    .filter((emp) => {
                      if (!formData.branchId) return true;
                      const empBranch = emp.branchId?._id || emp.branchId;
                      return !empBranch || String(empBranch) === String(formData.branchId);
                    })
                    .map((emp) => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.employeeCode ? `[${emp.employeeCode}] ` : ""}{emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="salary-form-group">
                <label>Branch</label>
                <BranchSelect
                  valueKey="id"
                  branches={branches}
                  value={formData.branchId}
                  placeholder="Select Branch"
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value, employeeId: "" })}
                />
              </div>
            </div>

            <div className="salary-form-grid" style={{ marginBottom: "14px" }}>
              <div className="salary-form-group">
                <label>Adjustment Type <span className="req">*</span></label>
                <select
                  className="salary-form-select"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <optgroup label="Additions (Incentives & Allowances)">
                    <option value="INCENTIVE">Incentive / Bonus (+)</option>
                    <option value="OTHER_EARNING">Other Earning (+)</option>
                  </optgroup>
                  <optgroup label="Deductions">
                    <option value="ADVANCE">Advance Salary (-)</option>
                    <option value="SHORTAGE">Cash / Till Shortage (-)</option>
                    <option value="WASTAGE">Material Wastage (-)</option>
                    <option value="EMPLOYEE_PURCHASE">Employee Purchase (-)</option>
                    <option value="OTHER_DEDUCTION">Other Deduction (-)</option>
                  </optgroup>
                </select>
              </div>

              <div className="salary-form-group">
                <label>Amount (₹) <span className="req">*</span></label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="e.g. 1500"
                  className="salary-form-input"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="salary-form-grid" style={{ marginBottom: "14px" }}>
              <div className="salary-form-group">
                <label>Payroll Month <span className="req">*</span></label>
                <select
                  className="salary-form-select"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                >
                  {[
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                  ].map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="salary-form-group">
                <label>Payroll Year <span className="req">*</span></label>
                <input
                  type="number"
                  className="salary-form-input"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="salary-form-group" style={{ marginBottom: "14px" }}>
              <label>Reason / Title <span className="req">*</span></label>
              <input
                type="text"
                placeholder="e.g. Diwali festive bonus, Paper roll damage penalty, etc."
                className="salary-form-input"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
              />
            </div>

            <div style={{ fontSize: "12px", color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", marginBottom: "14px" }}>
              Approved attendance overtime is calculated by payroll automatically. Do not add it here as an adjustment, or it will be paid twice.
            </div>

            <div className="salary-form-group">
              <label>Additional Notes</label>
              <textarea
                className="salary-form-textarea"
                placeholder="Optional explanation or reference number"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="salary-modal-footer">
            <button type="button" className="btn-salary-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-salary-primary" disabled={loading || periodClosed}>
              {loading ? "Adding..." : "Add Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
