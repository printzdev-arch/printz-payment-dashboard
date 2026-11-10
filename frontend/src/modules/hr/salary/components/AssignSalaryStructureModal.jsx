import React, { useState, useEffect } from "react";
import { X, Check, ChevronRight, ChevronLeft, ArrowRight } from "lucide-react";
import salaryApi from "../api/salaryApi";
import { flagIfMaintenance } from "../utils/salaryGuards";

export default function AssignSalaryStructureModal({
  isOpen,
  onClose,
  onSuccess,
  branches = [],
  initialBranchId = "",
  initialEmployeeId = "",
}) {
  const [step, setStep] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    employeeId: "",
    branchId: initialBranchId || "",
    effectiveFrom: new Date().toISOString().split("T")[0],
    monthlySalary: "",
    remarks: "",
    components: [],
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError("");
      setFormData({
        employeeId: initialEmployeeId || "",
        branchId: initialBranchId || (branches[0]?._id ? String(branches[0]._id) : ""),
        effectiveFrom: new Date().toISOString().split("T")[0],
        monthlySalary: "",
        remarks: "",
        components: [],
      });
      loadEmployees();
    }
  }, [isOpen, initialBranchId]);

  // The component catalog is per branch, so reload it when the branch changes.
  useEffect(() => {
    if (!isOpen) return;
    setFormData((prev) => (prev.components.length ? { ...prev, components: [] } : prev));
    loadComponents(formData.branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, formData.branchId]);

  const loadEmployees = async () => {
    try {
      const data = await salaryApi.getEmployees({ limit: 200, status: "ACTIVE" });
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  };

  const loadComponents = async (branchId) => {
    try {
      const res = await salaryApi.listComponents(branchId ? { branchId } : {});
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setComponents(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load components:", err);
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
      if (!formData.monthlySalary || Number(formData.monthlySalary) <= 0) {
        setError("Please enter a valid monthly salary.");
        return;
      }
      if (!formData.effectiveFrom) {
        setError("Please enter the effective date.");
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

  const handleToggleComponent = (comp) => {
    setFormData((prev) => {
      const exists = prev.components.find((c) => String(c.componentId) === String(comp._id));
      if (exists) {
        return {
          ...prev,
          components: prev.components.filter((c) => String(c.componentId) !== String(comp._id)),
        };
      }
      return {
        ...prev,
        components: [
          ...prev.components,
          {
            componentId: comp._id,
            name: comp.name,
            code: comp.code,
            componentType: comp.componentType,
            calculationType: comp.calculationType || "FIXED",
            percentageOf: comp.percentageOf || "BASIC",
            value: comp.defaultAmount || 0,
          },
        ],
      };
    });
  };

  const handleComponentValueChange = (compId, val) => {
    setFormData((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        String(c.componentId) === String(compId) ? { ...c, value: Number(val) || 0 } : c
      ),
    }));
  };

  // Amount a component contributes, for the review preview only. The backend
  // payroll engine remains the source of truth for actual earnings.
  const monthlyBase = Number(formData.monthlySalary) || 0;
  const basicAmount = (() => {
    const basic = formData.components.find((c) => c.code === "BASIC");
    if (!basic) return monthlyBase;
    return basic.calculationType === "PERCENTAGE" ? (monthlyBase * basic.value) / 100 : basic.value;
  })();
  const componentAmount = (c) => {
    if (c.calculationType !== "PERCENTAGE") return Number(c.value) || 0;
    const base = c.percentageOf === "BASIC" ? basicAmount : monthlyBase;
    return Math.round((base * (Number(c.value) || 0)) / 100);
  };
  const earningsTotal = formData.components
    .filter((c) => c.componentType === "EARNING")
    .reduce((sum, c) => sum + componentAmount(c), 0);
  const deductionsTotal = formData.components
    .filter((c) => c.componentType === "DEDUCTION")
    .reduce((sum, c) => sum + componentAmount(c), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    try {
      setLoading(true);
      setError("");

      if (!formData.branchId) {
        setError("Please select a branch.");
        return;
      }

      const payload = {
        employeeId: formData.employeeId,
        branchId: formData.branchId,
        monthlySalary: Number(formData.monthlySalary),
        effectiveFrom: formData.effectiveFrom,
        remarks: formData.remarks || undefined,
        components: formData.components.map((c) => ({
          componentId: c.componentId,
          amount: c.calculationType === "PERCENTAGE" ? 0 : c.value,
          percentage: c.calculationType === "PERCENTAGE" ? c.value : 0,
          isEnabled: true,
        })),
      };

      await salaryApi.createStructure(payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      if (!flagIfMaintenance(err)) setError(err?.response?.data?.message || err?.message || "Failed to assign salary structure.");
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = employees.find((emp) => String(emp._id || emp.id) === String(formData.employeeId));

  return (
    <div className="salary-modal-overlay">
      <div className="salary-modal-card">
        {/* Header */}
        <div className="salary-modal-header">
          <h3 className="salary-modal-title">Assign Salary Structure</h3>
          <button type="button" className="salary-modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Stepper */}
        <div style={{ padding: "16px 24px 0 24px" }}>
          <div className="salary-modal-stepper">
            <div className={`salary-stepper-step ${step >= 1 ? "active" : ""}`} onClick={() => setStep(1)}>
              <span className="salary-stepper-num">{step > 1 ? <Check size={14} /> : "1"}</span>
              <span className="salary-stepper-label">Basic Details</span>
            </div>
            <ArrowRight size={14} color="#94a3b8" />
            <div className={`salary-stepper-step ${step >= 2 ? "active" : ""}`} onClick={() => step > 1 && setStep(2)}>
              <span className="salary-stepper-num">{step > 2 ? <Check size={14} /> : "2"}</span>
              <span className="salary-stepper-label">Salary Components</span>
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
                  <label>
                    Employee <span className="req">*</span>
                  </label>
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
                  <label>
                    Effective From <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    className="salary-form-input"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                  />
                </div>

                <div className="salary-form-group">
                  <label>
                    Monthly Salary (₹) <span className="req">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="e.g. 25000"
                    className="salary-form-input"
                    value={formData.monthlySalary}
                    onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                  />
                </div>
              </div>

              <div className="salary-form-group">
                <label>Remarks</label>
                <textarea
                  className="salary-form-textarea"
                  placeholder="e.g. Annual increment 2026, initial probation offer, etc."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 14px 0" }}>
                Select applicable earnings and deductions for this employee (optional component breakdown):
              </p>

              {components.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", color: "#94a3b8", background: "#f8fafc", borderRadius: "8px" }}>
                  No predefined salary components found. You can proceed with the base monthly salary or create components under the Salary Components tab.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {components.map((comp) => {
                    const isSelected = formData.components.some((c) => String(c.componentId) === String(comp._id));
                    const selectedComp = formData.components.find((c) => String(c.componentId) === String(comp._id));

                    return (
                      <div
                        key={comp._id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          border: "1px solid",
                          borderColor: isSelected ? "#a7f3d0" : "#e2e8f0",
                          background: isSelected ? "#f0fdf4" : "#ffffff",
                          borderRadius: "8px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleComponent(comp)}
                            style={{ cursor: "pointer", width: "16px", height: "16px" }}
                          />
                          <div>
                            <span style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a" }}>
                              {comp.name} ({comp.code})
                            </span>
                            <span
                              style={{
                                marginLeft: "8px",
                                fontSize: "11px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: comp.componentType === "EARNING" ? "#dcfce7" : "#fee2e2",
                                color: comp.componentType === "EARNING" ? "#15803d" : "#b91c1c",
                                fontWeight: 600,
                              }}
                            >
                              {comp.componentType}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                              {comp.calculationType === "PERCENTAGE"
                                ? `% of ${(comp.percentageOf || "BASIC").replace("_", " ").toLowerCase()}:`
                                : "Amount (₹):"}
                            </span>
                            <input
                              type="number"
                              min="0"
                              style={{ width: "90px", padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                              value={selectedComp?.value || ""}
                              onChange={(e) => handleComponentValueChange(comp._id, e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "18px", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", color: "#0f172a" }}>Summary Confirmation</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#64748b" }}>Employee:</span>{" "}
                  <strong>{selectedEmployee?.name || selectedEmployee?.employeeCode || formData.employeeId}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Monthly Salary:</span>{" "}
                  <strong style={{ color: "#107548", fontSize: "15px" }}>₹ {Number(formData.monthlySalary).toLocaleString("en-IN")}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Effective From:</span>{" "}
                  <strong>{formData.effectiveFrom}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Active Components:</span>{" "}
                  <strong>{formData.components.length} components selected</strong>
                </div>
                {formData.remarks && (
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ color: "#64748b" }}>Remarks:</span> <em>{formData.remarks}</em>
                  </div>
                )}
                {formData.components.length > 0 && (
                  <div style={{ gridColumn: "span 2", borderTop: "1px dashed #cbd5e1", paddingTop: "10px" }}>
                    <div style={{ fontWeight: 600, marginBottom: "6px" }}>Calculation Preview</div>
                    {formData.components.map((c) => (
                      <div key={c.componentId} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>
                          {c.name} ({c.componentType === "EARNING" ? "+" : "−"})
                        </span>
                        <span>₹ {componentAmount(c).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: "6px" }}>
                      <span>Components: earnings / deductions</span>
                      <span>
                        ₹ {earningsTotal.toLocaleString("en-IN")} / ₹ {deductionsTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "6px" }}>
                      The monthly salary above is the base; component amounts are its breakdown and are not added on top of it. Final amounts are decided by the payroll calculation.
                    </div>
                  </div>
                )}
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
              {loading ? "Saving Structure..." : "Save Salary Structure"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
