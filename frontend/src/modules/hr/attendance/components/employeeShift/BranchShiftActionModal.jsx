import React, { useState, useEffect } from "react";
import { X, Ban, CalendarX } from "lucide-react";
import branchShiftApi from "../../api/branchShiftApi";
import { toDateKey, formatShiftDate, todayKey } from "./shiftUtils";

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

        {error && <div className="shift-modal-error">{error}</div>}

        <div className="shift-modal-body">
          <div className="shift-note">
            <strong>{emp.name}</strong> {emp.employeeCode ? `(${emp.employeeCode})` : ""}
            <br />
            {shift.sourceBranchId?.name} &rarr; {shift.branchId?.name}
            <br />
            {formatShiftDate(shift.fromDate)} to {formatShiftDate(shift.toDate)}
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
              <input
                type="date"
                value={value}
                min={fromKey}
                max={toKey}
                onChange={(e) => setValue(e.target.value)}
              />
              <span className="shift-hint">
                Must be before the current end date. After this day the employee returns to the home branch.
              </span>
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
