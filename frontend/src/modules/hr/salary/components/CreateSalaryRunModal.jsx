import React, { useState, useEffect } from "react";
import { X, Check, ArrowRight, ChevronRight, Users } from "lucide-react";
import salaryApi from "../api/salaryApi";
import { flagIfMaintenance } from "../utils/salaryGuards";
import BranchSelect from "../../../../shared/ui/selects/BranchSelect";
import StyledSelect from "../../../../shared/ui/selects/StyledSelect";

export default function CreateSalaryRunModal({
  isOpen,
  onClose,
  onSuccess,
  branches = [],
  initialBranchId = "",
}) {
  const [step, setStep] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const now = new Date();
  const isFuturePeriod = (year, month) =>
    Number(year) > now.getFullYear() ||
    (Number(year) === now.getFullYear() && Number(month) > now.getMonth() + 1);
  const [formData, setFormData] = useState({
    branchId: initialBranchId || "",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    notes: `Monthly payroll run for ${now.toLocaleString("en-US", { month: "long" })} ${now.getFullYear()}`,
    includeInactiveEmployees: false,
    customWorkingDays: "",
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError("");
      setFormData({
        branchId: initialBranchId || (branches[0]?._id ? String(branches[0]._id) : ""),
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        notes: `Monthly payroll run for ${now.toLocaleString("en-US", { month: "long" })} ${now.getFullYear()}`,
        includeInactiveEmployees: false,
        customWorkingDays: "",
      });
      loadEmployees(initialBranchId || (branches[0]?._id ? String(branches[0]._id) : ""));
    }
  }, [isOpen, initialBranchId]);

  const loadEmployees = async (branchId) => {
    try {
      const params = { limit: 300 };
      if (branchId) params.branchId = branchId;
      const data = await salaryApi.getEmployees(params);
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  };

  if (!isOpen) return null;

  const handleNext = () => {
    setError("");
    if (step === 1) {
      if (!formData.branchId) {
        setError("Please select a branch.");
        return;
      }
      if (isFuturePeriod(formData.year, formData.month)) {
        setError("The payroll period has not started yet. Choose the current or a past month.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    try {
      setLoading(true);
      setError("");

      const payload = {
        branchId: formData.branchId,
        payrollYear: Number(formData.year),
        payrollMonth: Number(formData.month),
      };

      await salaryApi.createRun(payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      if (!flagIfMaintenance(err)) setError(err?.response?.data?.message || err?.message || "Failed to create salary run.");
    } finally {
      setLoading(false);
    }
  };

  const selectedBranch = branches.find((b) => String(b._id) === String(formData.branchId));
  const monthName = new Date(formData.year, formData.month - 1).toLocaleString("en-US", { month: "long" });

  return (
    <div className="salary-modal-overlay">
      <div className="salary-modal-card">
        <div className="salary-modal-header">
          <h3 className="salary-modal-title">Create Monthly Salary Run</h3>
          <button type="button" className="salary-modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Stepper */}
        <div style={{ padding: "16px 24px 0 24px" }}>
          <div className="salary-modal-stepper">
            <div className={`salary-stepper-step ${step >= 1 ? "active" : ""}`} onClick={() => setStep(1)}>
              <span className="salary-stepper-num">{step > 1 ? <Check size={14} /> : "1"}</span>
              <span className="salary-stepper-label">Run Details</span>
            </div>
            <ArrowRight size={14} color="#94a3b8" />
            <div className={`salary-stepper-step ${step >= 2 ? "active" : ""}`} onClick={() => step > 1 && setStep(2)}>
              <span className="salary-stepper-num">{step > 2 ? <Check size={14} /> : "2"}</span>
              <span className="salary-stepper-label">Employee Selection</span>
            </div>
            <ArrowRight size={14} color="#94a3b8" />
            <div className={`salary-stepper-step ${step >= 3 ? "active" : ""}`} onClick={() => step > 2 && setStep(3)}>
              <span className="salary-stepper-num">3</span>
              <span className="salary-stepper-label">Review & Create</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="salary-modal-body">
          {error && (
            <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="salary-form-grid full" style={{ gap: "16px" }}>
              <div className="salary-form-grid">
                <div className="salary-form-group">
                  <label>Payroll Month <span className="req">*</span></label>
                  <StyledSelect
                    className="salary-form-select"
                    value={formData.month}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      const mName = new Date(formData.year, m - 1).toLocaleString("en-US", { month: "long" });
                      setFormData({
                        ...formData,
                        month: m,
                        notes: `Monthly payroll run for ${mName} ${formData.year}`,
                      });
                    }}
                  >
                    {[
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                    ].map((m, idx) => (
                      <option key={idx + 1} value={idx + 1} disabled={isFuturePeriod(formData.year, idx + 1)}>{m}</option>
                    ))}
                  </StyledSelect>
                </div>

                <div className="salary-form-group">
                  <label>Payroll Year <span className="req">*</span></label>
                  <input
                    type="number"
                    className="salary-form-input"
                    value={formData.year}
                    max={now.getFullYear()}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="salary-form-group">
                <label>Branch <span className="req">*</span></label>
                <BranchSelect
                  valueKey="id"
                  branches={branches}
                  value={formData.branchId}
                  placeholder="Select Branch"
                  required
                  onChange={(e) => {
                    const bId = e.target.value;
                    setFormData({ ...formData, branchId: bId });
                    loadEmployees(bId);
                  }}
                />
              </div>

            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#dcfce7", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users size={22} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>
                    {employees.length} Employees in Branch
                  </h4>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
                    Eligible employees in <strong>{selectedBranch?.name || "selected branch"}</strong> with an effective salary structure are included when you calculate the run.
                  </p>
                </div>
              </div>

              <div style={{ fontSize: "12.5px", color: "#334155", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px" }}>
                One salary run is allowed per branch and month. Calculation uses each employee's effective salary structure, the branch attendance for the period, approved overtime, pending adjustments and active loan EMIs. Make sure attendance for this period is reconciled and finalized before you calculate.
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "18px", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", color: "#0f172a" }}>Salary Run Confirmation</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#64748b" }}>Period:</span>{" "}
                  <strong>{monthName} {formData.year}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Branch:</span>{" "}
                  <strong>{selectedBranch?.name || "Selected Branch"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Initial State:</span>{" "}
                  <span className="badge-salary-status draft">DRAFT</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="salary-modal-footer">
          <button type="button" className="btn-salary-secondary" onClick={step === 1 ? onClose : handleBack} disabled={loading}>
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 3 ? (
            <button type="button" className="btn-salary-primary" onClick={handleNext}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" className="btn-salary-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating Run..." : "Create DRAFT Salary Run"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
