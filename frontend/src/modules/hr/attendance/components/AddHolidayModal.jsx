import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import attendanceApi from "../api/attendanceApi";

export default function AddHolidayModal({
  isOpen,
  onClose,
  onSave,
  branches = [],
  selectedBranchId = "",
  selectedYear = new Date().getFullYear(),
  editingHoliday = null,
  calendarId = null,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("PUBLIC");
  const [scope, setScope] = useState("Branch"); // "Branch" or "Organization"
  const [branchId, setBranchId] = useState(selectedBranchId || "");

  useEffect(() => {
    if (editingHoliday) {
      setDate(editingHoliday.date || "");
      setName(editingHoliday.name || "");
      setType(editingHoliday.type || "PUBLIC");
      setScope(editingHoliday.scope === "Organization" || !editingHoliday.branchId ? "Organization" : "Branch");
      setBranchId(editingHoliday.branchId?._id || editingHoliday.branchId || selectedBranchId || "");
    } else {
      setDate("");
      setName("");
      setType("PUBLIC");
      setScope("Branch");
      setBranchId(selectedBranchId || branches[0]?._id || "");
    }
    setError("");
  }, [editingHoliday, selectedBranchId, branches, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!date) {
      setError("Holiday date is required.");
      return;
    }
    if (!name.trim()) {
      setError("Holiday name is required.");
      return;
    }
    if (scope === "Branch" && !branchId) {
      setError("Please select a Branch for this branch holiday.");
      return;
    }

    try {
      setLoading(true);
      const effectiveBranchId = scope === "Branch" ? branchId : null;
      const holidayYear = parseInt(date.substring(0, 4), 10) || selectedYear;

      // 1. Check if calendar exists for this branch/year or create/update it
      const calendarsRes = await attendanceApi.getHolidayCalendars({
        year: holidayYear,
        branchId: effectiveBranchId || undefined,
      });

      // The list can come back bare or wrapped ({ calendars: [...] }), as in AttendanceSetupPage
      const payload = calendarsRes?.data || calendarsRes || [];
      const calendarList = Array.isArray(payload)
        ? payload
        : payload?.calendars || payload?.items || calendarsRes?.items || [];
      let calendar = calendarList.find(
        (c) =>
          c.year === holidayYear &&
          (effectiveBranchId ? (c.branchId?._id || c.branchId) === effectiveBranchId : !c.branchId)
      );

      const holidayItem = {
        date,
        name: name.trim(),
        type,
        isOptional: type === "OPTIONAL",
        description: `${type} Holiday`,
      };

      // Editing a holiday into a different calendar (another branch, or another year)
      // is a move: it must be added to the target calendar and removed from the original one.
      const originalCalendarId = editingHoliday?.calendarId;
      const isMove = Boolean(
        editingHoliday && originalCalendarId && (!calendar || String(calendar._id) !== String(originalCalendarId))
      );

      if (calendar) {
        // Update existing calendar holidays array
        let existingHolidays = [...(calendar.holidays || [])];
        if (editingHoliday && !isMove) {
          existingHolidays = existingHolidays.map((h) => (h.date === editingHoliday.date ? holidayItem : h));
        } else {
          // Check for duplicate date
          const dup = existingHolidays.find((h) => h.date === date);
          if (dup) {
            setError(`A holiday ('${dup.name}') already exists on ${date}.`);
            setLoading(false);
            return;
          }
          existingHolidays.push(holidayItem);
        }

        await attendanceApi.updateHolidayCalendar(calendar._id, {
          holidays: existingHolidays,
        });
      } else {
        // Create new calendar
        const calName = effectiveBranchId
          ? `Branch Holiday Calendar ${holidayYear}`
          : `Organization Holiday Calendar ${holidayYear}`;

        await attendanceApi.createHolidayCalendar({
          name: calName,
          year: holidayYear,
          branchId: effectiveBranchId,
          holidays: [holidayItem],
          isActive: true,
        });
      }

      if (isMove) {
        // Remove the holiday from the calendar it came from (after the add succeeded)
        const originalRes = await attendanceApi.getHolidayCalendarById(originalCalendarId);
        const originalPayload = originalRes?.data || originalRes || {};
        const original = originalPayload.calendar || originalPayload;
        const remaining = (original.holidays || []).filter((h) => h.date !== editingHoliday.date);
        await attendanceApi.updateHolidayCalendar(originalCalendarId, { holidays: remaining });
      }

      onSave();
      onClose();
    } catch (err) {
      // Validation failures carry the specific reason in `details`; show it instead of the generic text
      const data = err?.response?.data;
      const detail = Array.isArray(data?.details) ? data.details.map((d) => d?.message).find(Boolean) : null;
      setError(detail || data?.message || err?.message || "Failed to save holiday.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "540px" }}>
        <div className="modal-header">
          <h2>{editingHoliday ? "Edit Holiday" : "Add Holiday"}</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "10px 24px", fontSize: "13px", borderBottom: "1px solid #fee2e2" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group-row">
              <div className="form-field">
                <label>
                  Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label>
                  Holiday Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pongal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-field">
                <label>
                  Type <span className="required">*</span>
                </label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="FESTIVAL">FESTIVAL</option>
                  <option value="OPTIONAL">OPTIONAL</option>
                  <option value="COMPANY">COMPANY</option>
                </select>
              </div>

              <div className="form-field">
                <label>
                  Scope <span className="required">*</span>
                </label>
                <div className="radio-options-row">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="scope"
                      value="Branch"
                      checked={scope === "Branch"}
                      onChange={(e) => setScope(e.target.value)}
                    />
                    Branch
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="scope"
                      value="Organization"
                      checked={scope === "Organization"}
                      onChange={(e) => setScope(e.target.value)}
                    />
                    Organization
                  </label>
                </div>
              </div>
            </div>

            {scope === "Branch" && (
              <div className="form-field">
                <label>
                  Branch <span className="required">*</span>
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  required={scope === "Branch"}
                >
                  <option value="">Select branch...</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-printz-outline" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-printz-primary" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
