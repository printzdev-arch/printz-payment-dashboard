import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import salaryApi from "../api/salaryApi";
import { flagIfMaintenance } from "../utils/salaryGuards";
import StyledSelect from "../../../../shared/ui/selects/StyledSelect";

const EMPTY_FORM = {
  code: "",
  name: "",
  componentType: "EARNING", // EARNING | DEDUCTION
  calculationType: "FIXED", // FIXED | PERCENTAGE | PER_DAY | PER_HOUR | MANUAL
  defaultAmount: "",
  percentageOf: "BASIC", // BASIC | GROSS | MONTHLY_SALARY (only for PERCENTAGE)
  isTaxable: false,
  description: "",
  isActive: true,
};

const PREVIEW_BASIC = 15000;

export default function CreateComponentModal({ isOpen, onClose, onSuccess, branchId = "", branchName = "", editing = null }) {
  const isEdit = Boolean(editing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (isOpen) {
      setError("");
      setFormData(
        editing
          ? {
              code: editing.code || "",
              name: editing.name || "",
              componentType: editing.componentType || "EARNING",
              calculationType: editing.calculationType || "FIXED",
              defaultAmount: editing.defaultAmount ?? "",
              percentageOf: editing.percentageOf || "BASIC",
              isTaxable: Boolean(editing.isTaxable),
              description: editing.description || "",
              isActive: editing.isActive !== false,
            }
          : EMPTY_FORM
      );
    }
  }, [isOpen, editing]);

  if (!isOpen) return null;

  const isPercentage = formData.calculationType === "PERCENTAGE";
  const amountNum = Number(formData.defaultAmount) || 0;
  const previewAmount = isPercentage ? Math.round((PREVIEW_BASIC * amountNum) / 100) : amountNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!branchId && !isEdit) {
      setError("Select a branch on the Salary Setup page first. Components belong to one branch.");
      return;
    }
    if (!formData.code.trim() || !formData.name.trim()) {
      setError("Component Code and Name are required.");
      return;
    }
    if (formData.code.trim().length < 2) {
      setError("Component Code must be at least 2 characters.");
      return;
    }
    if (isPercentage && (amountNum <= 0 || amountNum > 100)) {
      setError("Percentage must be greater than 0 and not more than 100.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        branchId,
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        componentType: formData.componentType,
        calculationType: formData.calculationType,
        defaultAmount: amountNum,
        isTaxable: Boolean(formData.isTaxable),
        isActive: Boolean(formData.isActive),
      };
      if (isPercentage) payload.percentageOf = formData.percentageOf;
      if (formData.description.trim()) payload.description = formData.description.trim();

      if (isEdit) await salaryApi.updateComponent(editing._id, payload);
      else await salaryApi.createComponent(payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      if (!flagIfMaintenance(err)) setError(err?.response?.data?.message || err?.message || isEdit ? "Failed to update component." : "Failed to create component.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="salary-modal-overlay">
      <div className="salary-modal-card" style={{ maxWidth: "560px" }}>
        <div className="salary-modal-header">
          <h3 className="salary-modal-title">
            {isEdit ? "Edit Salary Component" : "Add Salary Component"}{branchName ? ` — ${branchName}` : ""}
          </h3>
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

            <div className="salary-form-grid" style={{ marginBottom: "14px" }}>
              <div className="salary-form-group">
                <label>Component Code <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. BASIC, HRA, PF"
                  className="salary-form-input"
                  style={{ textTransform: "uppercase" }}
                  value={formData.code}
                  readOnly={isEdit}
                  title={isEdit ? "The code cannot be changed" : undefined}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>

              <div className="salary-form-group">
                <label>Component Name <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. House Rent Allowance"
                  className="salary-form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="salary-form-grid" style={{ marginBottom: "14px" }}>
              <div className="salary-form-group">
                <label>Component Type <span className="req">*</span></label>
                <StyledSelect
                  className="salary-form-select"
                  value={formData.componentType}
                  onChange={(e) => setFormData({ ...formData, componentType: e.target.value })}
                >
                  <option value="EARNING">Earning</option>
                  <option value="DEDUCTION">Deduction</option>
                </StyledSelect>
              </div>

              <div className="salary-form-group">
                <label>Calculation Type <span className="req">*</span></label>
                <StyledSelect
                  className="salary-form-select"
                  value={formData.calculationType}
                  onChange={(e) => setFormData({ ...formData, calculationType: e.target.value })}
                >
                  <option value="FIXED">Fixed Amount</option>
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="PER_DAY">Per Day (rate × days worked + paid leave)</option>
                  <option value="PER_HOUR">Per Hour (rate × regular hours)</option>
                  <option value="MANUAL">Manual (entered per employee)</option>
                </StyledSelect>
              </div>
            </div>

            <div className="salary-form-grid" style={{ marginBottom: "14px" }}>
              <div className="salary-form-group">
                <label>
                  {isPercentage
                    ? "Default Percentage (%)"
                    : formData.calculationType === "PER_DAY"
                    ? "Default Rate per Day (₹)"
                    : formData.calculationType === "PER_HOUR"
                    ? "Default Rate per Hour (₹)"
                    : "Default Amount (₹)"}
                </label>
                <input
                  type="number"
                  min="0"
                  max={isPercentage ? "100" : undefined}
                  step="any"
                  placeholder={isPercentage ? "e.g. 40" : "e.g. 2000"}
                  className="salary-form-input"
                  value={formData.defaultAmount}
                  onChange={(e) => setFormData({ ...formData, defaultAmount: e.target.value })}
                />
              </div>

              {isPercentage && (
                <div className="salary-form-group">
                  <label>Percentage Of <span className="req">*</span></label>
                  <StyledSelect
                    className="salary-form-select"
                    value={formData.percentageOf}
                    onChange={(e) => setFormData({ ...formData, percentageOf: e.target.value })}
                  >
                    <option value="BASIC">Basic</option>
                    <option value="GROSS">Gross</option>
                    <option value="MONTHLY_SALARY">Monthly Salary</option>
                  </StyledSelect>
                </div>
              )}
            </div>

            <div className="salary-form-group" style={{ marginBottom: "14px" }}>
              <label>Description</label>
              <textarea
                className="salary-form-textarea"
                placeholder="Optional information about this component"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", gap: "20px", marginBottom: "14px", flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formData.isTaxable}
                  onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })}
                />
                Is Taxable
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>

            {isPercentage && amountNum > 0 && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", color: "#14532d" }}>
                <div style={{ fontWeight: 600, marginBottom: "6px" }}>Calculation Preview (example)</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Basic Salary</span>
                  <span>₹{PREVIEW_BASIC.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{formData.code.toUpperCase() || "Component"} Percentage</span>
                  <span>{amountNum}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: "4px", borderTop: "1px dashed #86efac", paddingTop: "4px" }}>
                  <span>Calculated Amount</span>
                  <span>₹{previewAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}
          </div>

          <div className="salary-modal-footer">
            <button type="button" className="btn-salary-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-salary-primary" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Component"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
