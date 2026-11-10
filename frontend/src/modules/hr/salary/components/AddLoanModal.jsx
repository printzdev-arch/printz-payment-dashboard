import React, { useState, useEffect } from "react";
import { X, Check, ArrowRight, ChevronRight } from "lucide-react";
import salaryApi from "../api/salaryApi";
import { flagIfMaintenance } from "../utils/salaryGuards";

export default function AddLoanModal({
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

  const [formData, setFormData] = useState({
    employeeId: "",
    branchId: initialBranchId || "",
    loanNumber: `LN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    principalAmount: "",
    emiAmount: "",
    loanDate: new Date().toISOString().split("T")[0],
    disbursedDate: new Date().toISOString().split("T")[0],
    remarks: "",
    autoDeduct: true,
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError("");
      setFormData({
        employeeId: "",
        branchId: initialBranchId || (branches[0]?._id ? String(branches[0]._id) : ""),
        loanNumber: `LN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        principalAmount: "",
        emiAmount: "",
        loanDate: new Date().toISOString().split("T")[0],
        disbursedDate: new Date().toISOString().split("T")[0],
        remarks: "",
        autoDeduct: true,
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

  if (!isOpen) return null;

  const handleNext = () => {
    setError("");
    if (step === 1) {
      if (!formData.employeeId) {
        setError("Please select an employee.");
        return;
      }
      if (!formData.principalAmount || Number(formData.principalAmount) <= 0) {
        setError("Please enter a valid loan amount.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.emiAmount || Number(formData.emiAmount) <= 0) {
        setError("Please enter a valid EMI amount.");
        return;
      }
      if (Number(formData.emiAmount) > Number(formData.principalAmount)) {
        setError("Monthly EMI cannot be larger than the principal loan amount.");
        return;
      }
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
    if (!formData.branchId) {
      setError("Please select a branch.");
      return;
    }
    try {
      setLoading(true);
      setError("");

      const payload = {
        employeeId: formData.employeeId,
        branchId: formData.branchId,
        loanNumber: formData.loanNumber || undefined,
        loanAmount: Number(formData.principalAmount),
        emiAmount: Number(formData.emiAmount),
        loanDate: formData.loanDate,
        remarks: formData.remarks || undefined,
        autoDeduct: formData.autoDeduct,
      };

      await salaryApi.createLoan(payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      if (!flagIfMaintenance(err)) setError(err?.response?.data?.message || err?.message || "Failed to create loan.");
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = employees.find((emp) => String(emp._id || emp.id) === String(formData.employeeId));
  const estimatedMonths =
    formData.principalAmount && formData.emiAmount && Number(formData.emiAmount) > 0
      ? Math.ceil(Number(formData.principalAmount) / Number(formData.emiAmount))
      : 0;

  return (
    <div className="salary-modal-overlay">
      <div className="salary-modal-card">
        <div className="salary-modal-header">
          <h3 className="salary-modal-title">Add Employee Loan</h3>
          <button type="button" className="salary-modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Stepper */}
        <div style={{ padding: "16px 24px 0 24px" }}>
          <div className="salary-modal-stepper">
            <div className={`salary-stepper-step ${step >= 1 ? "active" : ""}`} onClick={() => setStep(1)}>
              <span className="salary-stepper-num">{step > 1 ? <Check size={14} /> : "1"}</span>
              <span className="salary-stepper-label">Loan Details</span>
            </div>
            <ArrowRight size={14} color="#94a3b8" />
            <div className={`salary-stepper-step ${step >= 2 ? "active" : ""}`} onClick={() => step > 1 && setStep(2)}>
              <span className="salary-stepper-num">{step > 2 ? <Check size={14} /> : "2"}</span>
              <span className="salary-stepper-label">EMI & Terms</span>
            </div>
            <ArrowRight size={14} color="#94a3b8" />
            <div className={`salary-stepper-step ${step >= 3 ? "active" : ""}`} onClick={() => step > 2 && setStep(3)}>
              <span className="salary-stepper-num">3</span>
              <span className="salary-stepper-label">Review & Save</span>
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
                  <label>Employee <span className="req">*</span></label>
                  <select
                    className="salary-form-select"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
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
                  <select
                    className="salary-form-select"
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value, employeeId: "" })}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="salary-form-grid">
                <div className="salary-form-group">
                  <label>Loan Number</label>
                  <input
                    type="text"
                    className="salary-form-input"
                    value={formData.loanNumber}
                    onChange={(e) => setFormData({ ...formData, loanNumber: e.target.value })}
                  />
                </div>

                <div className="salary-form-group">
                  <label>Loan Amount (₹) <span className="req">*</span></label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 25000"
                    className="salary-form-input"
                    value={formData.principalAmount}
                    onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
                  />
                </div>
              </div>

              <div className="salary-form-group">
                <label>Remarks / Purpose</label>
                <textarea
                  className="salary-form-textarea"
                  placeholder="e.g. Festival advance, emergency medical loan, personal loan, etc."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="salary-form-grid full" style={{ gap: "16px" }}>
              <div className="salary-form-grid">
                <div className="salary-form-group">
                  <label>Monthly EMI Amount (₹) <span className="req">*</span></label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 2500"
                    className="salary-form-input"
                    value={formData.emiAmount}
                    onChange={(e) => setFormData({ ...formData, emiAmount: e.target.value })}
                  />
                </div>

                <div className="salary-form-group">
                  <label>Estimated Payoff Duration</label>
                  <input
                    type="text"
                    disabled
                    className="salary-form-input"
                    style={{ background: "#f8fafc" }}
                    value={estimatedMonths > 0 ? `~${estimatedMonths} months` : "Enter EMI amount"}
                  />
                </div>
              </div>

              <div className="salary-form-grid">
                <div className="salary-form-group">
                  <label>Loan Sanction Date</label>
                  <input
                    type="date"
                    className="salary-form-input"
                    value={formData.loanDate}
                    onChange={(e) => setFormData({ ...formData, loanDate: e.target.value })}
                  />
                </div>

              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px" }}>
                <input
                  type="checkbox"
                  style={{ marginTop: "3px" }}
                  checked={formData.autoDeduct}
                  onChange={(e) => setFormData({ ...formData, autoDeduct: e.target.checked })}
                />
                <span style={{ fontSize: "13px", color: "#334155" }}>
                  <strong>Auto-deduct EMI from salary</strong>
                  <br />
                  {formData.autoDeduct
                    ? "The EMI is taken in every payroll run. You can skip a single month later if the employee asks."
                    : "Payroll will not touch this loan. Record each repayment yourself on the Loan Repayments tab."}
                </span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "18px", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", color: "#0f172a" }}>Loan Application Summary</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#64748b" }}>Borrower:</span>{" "}
                  <strong>{selectedEmployee?.name || formData.employeeId}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Loan Number:</span>{" "}
                  <strong>{formData.loanNumber}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Total Loan Amount:</span>{" "}
                  <strong style={{ color: "#107548", fontSize: "15px" }}>₹ {Number(formData.principalAmount).toLocaleString("en-IN")}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Monthly Salary EMI:</span>{" "}
                  <strong style={{ color: "#b45309" }}>₹ {Number(formData.emiAmount).toLocaleString("en-IN")} / month</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Tenor:</span>{" "}
                  <strong>{estimatedMonths} Months</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Sanction Date:</span>{" "}
                  <strong>{formData.loanDate}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>EMI collection:</span>{" "}
                  <strong>{formData.autoDeduct ? "Auto from salary" : "Manual repayments"}</strong>
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
              {loading ? "Creating Loan..." : "Confirm & Disburse Loan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
