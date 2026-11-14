import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import salaryApi from "../api/salaryApi";
import { flagIfMaintenance } from "../utils/salaryGuards";
import { DateField } from "../../../../shared/ui/selects/CalendarSelect";
import StyledSelect from "../../../../shared/ui/selects/StyledSelect";

export default function RecordRepaymentModal({
  isOpen,
  onClose,
  onSuccess,
  selectedLoan = null,
}) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    loanId: "",
    amount: "",
    repaymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "CASH",
    referenceNumber: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      setError("");
      setFormData({
        loanId: selectedLoan ? String(selectedLoan._id) : "",
        amount: selectedLoan?.emiAmount ? String(selectedLoan.emiAmount) : "",
        repaymentDate: new Date().toISOString().split("T")[0],
        paymentMethod: "CASH",
        referenceNumber: "",
        notes: "",
      });
      loadLoans();
    }
  }, [isOpen, selectedLoan]);

  const loadLoans = async () => {
    try {
      const res = await salaryApi.listLoans({ status: "ACTIVE", limit: 100 });
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setLoans(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load loans:", err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    try {
      if (!formData.loanId) {
        setError("Please select a loan.");
        return;
      }
      if (!formData.amount || Number(formData.amount) <= 0) {
        setError("Please enter a valid repayment amount.");
        return;
      }

      setLoading(true);
      setError("");

      const activeLoan = loans.find((l) => String(l._id) === String(formData.loanId)) || selectedLoan;

      const outstanding = Number(activeLoan?.outstandingBalance);
      if (Number.isFinite(outstanding) && Number(formData.amount) > outstanding) {
        setError(`Repayment cannot exceed the outstanding balance (₹${outstanding.toLocaleString("en-IN")}).`);
        return;
      }

      const remarks = [formData.referenceNumber && `Ref: ${formData.referenceNumber}`, formData.notes]
        .filter(Boolean)
        .join(" — ");

      const payload = {
        employeeLoanId: formData.loanId,
        amount: Number(formData.amount),
        repaymentDate: formData.repaymentDate,
        paymentMethod: formData.paymentMethod,
        remarks: remarks || undefined,
      };

      await salaryApi.createLoanRepayment(payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      if (!flagIfMaintenance(err)) setError(err?.response?.data?.message || err?.message || "Failed to record repayment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="salary-modal-overlay">
      <div className="salary-modal-card" style={{ maxWidth: "520px" }}>
        <div className="salary-modal-header">
          <h3 className="salary-modal-title">Record Loan Repayment</h3>
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

            <div className="salary-form-group" style={{ marginBottom: "14px" }}>
              <label>Select Loan <span className="req">*</span></label>
              <StyledSelect
                className="salary-form-select"
                value={formData.loanId}
                onChange={(e) => {
                  const sel = loans.find((l) => String(l._id) === String(e.target.value));
                  setFormData({
                    ...formData,
                    loanId: e.target.value,
                    amount: sel?.emiAmount ? String(sel.emiAmount) : formData.amount,
                  });
                }}
                required
              >
                <option value="">Select Employee Loan</option>
                {loans.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.loanNumber} - {l.employeeId?.name || "Employee"} (Outstanding: ₹{Number(l.outstandingBalance || 0).toLocaleString("en-IN")})
                  </option>
                ))}
              </StyledSelect>
            </div>

            <div className="salary-form-grid" style={{ marginBottom: "14px" }}>
              <div className="salary-form-group">
                <label>Amount Paid (₹) <span className="req">*</span></label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="e.g. 2000"
                  className="salary-form-input"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="salary-form-group">
                <label>Payment Method <span className="req">*</span></label>
                <StyledSelect
                  className="salary-form-select"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer / UPI</option>
                  <option value="OTHER">Other</option>
                </StyledSelect>
              </div>
            </div>

            <div className="salary-form-grid" style={{ marginBottom: "14px" }}>
              <div className="salary-form-group">
                <label>Repayment Date <span className="req">*</span></label>
                <DateField
                  value={formData.repaymentDate}
                  onChange={(e) => setFormData({ ...formData, repaymentDate: e.target.value })}
                  required
                />
              </div>

              <div className="salary-form-group">
                <label>Reference / UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. UPI / Cheque #"
                  className="salary-form-input"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="salary-form-group">
              <label>Notes / Remarks</label>
              <textarea
                className="salary-form-textarea"
                placeholder="Optional repayment notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="salary-modal-footer">
            <button type="button" className="btn-salary-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-salary-primary" disabled={loading}>
              {loading ? "Recording..." : "Record Repayment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
