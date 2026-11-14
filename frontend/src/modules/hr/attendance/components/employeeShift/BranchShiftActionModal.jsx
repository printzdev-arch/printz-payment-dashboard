import React, { useState, useEffect } from "react";
import { X, Ban, CalendarX, ArrowRight } from "lucide-react";
import branchShiftApi from "../../api/branchShiftApi";
import { toDateKey, formatShiftDate, todayKey } from "./shiftUtils";
import { DateField } from "../../../../../shared/ui/selects/CalendarSelect";

// type: "cancel" (scheduled shifts) | "end" (end an active shift early)
export default function BranchShiftActionModal({ isOpen, onClose, onSuccess, shift, type }) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fromKey = toDateKey(shift?.fromDate);
  const toKey = toDateKey(shift?.toDate);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    if (type === "end") {
      // Default to today, kept inside the shift's date range
      const today = todayKey();
      setValue(today < fromKey ? fromKey : today);
    } else {
      setValue("");
    }
  }, [isOpen, type, fromKey]);

  if (!isOpen || !shift) return null;

  const isCancel = type === "cancel";
  const emp = shift.employeeId || {};

  const handleConfirm = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      setError("");
      if (isCancel) {
        await branchShiftApi.cancelShift(shift._id, value.trim());
      } else {
        await branchShiftApi.endShiftEarly(shift._id, value);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Action failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "480px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className={`shift-modal-icon ${isCancel ? "danger" : "warn"}`}>
              {isCancel ? <Ban size={18} /> : <CalendarX size={18} />}
            </div>
            <h2>{isCancel ? "Cancel Shift" : "End Shift Early"}</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="attendance-alert error" role="alert" style={{ margin: "0 20px 12px" }}><span>{error}</span></div>}

        <div className="shift-modal-body">
          <div className="shift-summary">
            <div className="shift-summary-emp">
              <div>
                <div className="shift-summary-name">{emp.name || "Employee"}</div>
                {emp.employeeCode && <div className="shift-summary-code">{emp.employeeCode}</div>}
              </div>
            </div>
            <div className="shift-summary-rows">
              <div className="shift-summary-row">
                <span>Route</span>
                <strong>
                  {shift.sourceBranchId?.name || "-"} <ArrowRight size={13} /> {shift.branchId?.name || "-"}
                </strong>
              </div>
              <div className="shift-summary-row">
                <span>Period</span>
                <strong>{formatShiftDate(shift.fromDate)} – {formatShiftDate(shift.toDate)}</strong>
              </div>
            </div>
          </div>

          {isCancel ? (
            <div className="form-field">
              <label>Reason for cancelling</label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Optional"
              />
              <span className="shift-hint">
                A shift can only be cancelled before attendance is recorded at the destination branch.
              </span>
            </div>
          ) : (
            <div className="form-field">
              <label>
                Last working day at destination branch <span className="required">*</span>
              </label>
              <DateField
                value={value}
                min={fromKey}
                max={toKey}
                onChange={(e) => setValue(e.target.value)}
              />
              <span className="shift-hint">After this day the employee returns to the home branch.</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-printz-outline" onClick={onClose} disabled={submitting}>
            Back
          </button>
          <button
            type="button"
            className="btn-printz-primary"
            onClick={handleConfirm}
            disabled={submitting || (!isCancel && !value)}
          >
            {submitting ? "Saving..." : isCancel ? "Confirm Cancel" : "Confirm End Early"}
          </button>
        </div>
      </div>
    </div>
  );
}
