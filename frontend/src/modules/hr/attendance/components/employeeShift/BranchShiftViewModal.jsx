import React from "react";
import { X, Eye } from "lucide-react";
import {
  formatShiftDate,
  formatDateTime,
  shiftDayCount,
  getShiftStatus,
} from "./shiftUtils";

const Row = ({ label, children }) => (
  <div className="shift-detail-row">
    <span className="shift-detail-label">{label}</span>
    <span className="shift-detail-value">{children || "-"}</span>
  </div>
);

export default function BranchShiftViewModal({ isOpen, onClose, shift }) {
  if (!isOpen || !shift) return null;

  const emp = shift.employeeId || {};
  const status = getShiftStatus(shift);
  const days = shiftDayCount(shift.fromDate, shift.toDate);

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "520px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="shift-modal-icon">
              <Eye size={18} />
            </div>
            <h2>Shift Details</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="shift-modal-body">
          <div className="shift-detail-grid">
            <Row label="Employee">
              {emp.name} {emp.employeeCode ? `(${emp.employeeCode})` : ""}
            </Row>
            <Row label="Status">
              <span className={`status-badge shift-${status.toLowerCase()}`}>{status}</span>
            </Row>
            <Row label="Home Branch">{shift.sourceBranchId?.name}</Row>
            <Row label="Destination Branch">{shift.branchId?.name}</Row>
            <Row label="From">{formatShiftDate(shift.fromDate)}</Row>
            <Row label="To">{formatShiftDate(shift.toDate)}</Row>
            <Row label="Duration">{days ? `${days} day${days === 1 ? "" : "s"}` : ""}</Row>
            <Row label="Reason">{shift.remarks}</Row>
            <Row label="Created By">{shift.createdBy?.name}</Row>
            <Row label="Approved On">{formatDateTime(shift.approvedAt)}</Row>

            {shift.endedEarlyAt && <Row label="Ended Early On">{formatDateTime(shift.endedEarlyAt)}</Row>}
            {shift.status === "CANCELLED" && (
              <>
                <Row label="Cancelled On">{formatDateTime(shift.cancelledAt)}</Row>
                <Row label="Cancel Reason">{shift.cancellationReason}</Row>
              </>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-printz-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
