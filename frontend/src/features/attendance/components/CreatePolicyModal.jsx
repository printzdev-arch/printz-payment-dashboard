import React, { useState, useEffect } from "react";
import {
  X,
  Users,
  Settings,
  Clock,
  Coffee,
  Calendar,
  ShieldCheck,
  Check,
  ArrowRight,
} from "lucide-react";
import attendanceApi from "../api/attendanceApi";

const SECTIONS = [
  { id: "basic", label: "Basic Details", icon: Users },
  { id: "shift", label: "Shift Configuration", icon: Settings },
  { id: "hours", label: "Working Hours", icon: Clock },
  { id: "time", label: "Time Rules", icon: Clock },
  { id: "break", label: "Break Rules", icon: Coffee },
  { id: "weekly", label: "Weekly Schedule", icon: Calendar },
  { id: "monthly", label: "Monthly Rules", icon: Calendar },
  { id: "overtime", label: "Overtime & Permission", icon: ShieldCheck },
];

const DAYS_OF_WEEK = [
  { id: 0, label: "Sun" },
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
];

export default function CreatePolicyModal({ isOpen, onClose, onSave, branches = [], editingPolicy = null }) {
  const [activeSection, setActiveSection] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    branchId: "",
    description: "",
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    workingHoursPerDay: 8,
    halfDayHours: 4,
    fullDayHours: 8,
    lateGraceMinutes: 15,
    earlyCheckoutGraceMinutes: 10,
    breakDurationMinutes: 60,
    weeklyOffDays: [0], // Default Sunday
    monthlyLeaveAllowance: 4,
    overtimeEnabled: true,
    permissionEnabled: true,
    maxPermissionHoursPerDay: 2,
    maxPermissionHoursPerMonth: 4,
    isActive: true,
  });

  useEffect(() => {
    if (editingPolicy) {
      setFormData({
        name: editingPolicy.name || "",
        code: editingPolicy.code || "",
        branchId: editingPolicy.branchId?._id || editingPolicy.branchId || "",
        description: editingPolicy.description || "",
        shiftStartTime: editingPolicy.shiftStartTime || "09:00",
        shiftEndTime: editingPolicy.shiftEndTime || "18:00",
        workingHoursPerDay: editingPolicy.workingHoursPerDay ?? 8,
        halfDayHours: editingPolicy.halfDayHours ?? 4,
        fullDayHours: editingPolicy.fullDayHours ?? 8,
        lateGraceMinutes: editingPolicy.lateGraceMinutes ?? 15,
        earlyCheckoutGraceMinutes: editingPolicy.earlyCheckoutGraceMinutes ?? 10,
        breakDurationMinutes: editingPolicy.breakDurationMinutes ?? 60,
        weeklyOffDays: Array.isArray(editingPolicy.weeklyOffDays) ? editingPolicy.weeklyOffDays : [0],
        monthlyLeaveAllowance: editingPolicy.monthlyLeaveAllowance ?? 4,
        overtimeEnabled: editingPolicy.overtimeEnabled !== undefined ? Boolean(editingPolicy.overtimeEnabled) : true,
        permissionEnabled: editingPolicy.permissionEnabled !== undefined ? Boolean(editingPolicy.permissionEnabled) : true,
        maxPermissionHoursPerDay: editingPolicy.maxPermissionHoursPerDay ?? 2,
        maxPermissionHoursPerMonth: editingPolicy.maxPermissionHoursPerMonth ?? 4,
        isActive: editingPolicy.isActive !== undefined ? Boolean(editingPolicy.isActive) : true,
      });
    } else {
      setFormData({
        name: "",
        code: "",
        branchId: branches[0]?._id || "",
        description: "",
        shiftStartTime: "09:00",
        shiftEndTime: "18:00",
        workingHoursPerDay: 8,
        halfDayHours: 4,
        fullDayHours: 8,
        lateGraceMinutes: 15,
        earlyCheckoutGraceMinutes: 10,
        breakDurationMinutes: 60,
        weeklyOffDays: [0],
        monthlyLeaveAllowance: 4,
        overtimeEnabled: true,
        permissionEnabled: true,
        maxPermissionHoursPerDay: 2,
        maxPermissionHoursPerMonth: 4,
        isActive: true,
      });
    }
    setActiveSection("basic");
    setError("");
  }, [editingPolicy, branches, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleWeeklyOffToggle = (dayId) => {
    setFormData((prev) => {
      const current = prev.weeklyOffDays || [];
      if (current.includes(dayId)) {
        return { ...prev, weeklyOffDays: current.filter((d) => d !== dayId) };
      } else {
        return { ...prev, weeklyOffDays: [...current, dayId] };
      }
    });
  };

  const handleNextOrSubmit = async () => {
    const currentIndex = SECTIONS.findIndex((s) => s.id === activeSection);
    if (currentIndex < SECTIONS.length - 1) {
      // Validate basic section
      if (activeSection === "basic") {
        if (!formData.name.trim()) {
          setError("Policy Name is required.");
          return;
        }
        if (!formData.code.trim()) {
          setError("Policy Code is required.");
          return;
        }
        if (!formData.branchId) {
          setError("Please select a Branch.");
          return;
        }
      }
      setError("");
      setActiveSection(SECTIONS[currentIndex + 1].id);
    } else {
      // Final submit
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!formData.name.trim() || !formData.code.trim() || !formData.branchId) {
      setError("Please fill in all mandatory fields (Name, Code, Branch).");
      setActiveSection("basic");
      return;
    }

    try {
      setLoading(true);
      let res;
      if (editingPolicy?._id) {
        res = await attendanceApi.updatePolicy(editingPolicy._id, formData);
      } else {
        res = await attendanceApi.createPolicy(formData);
      }
      onSave(res);
      onClose();
    } catch (err) {
      const data = err?.response?.data;
      const details = Array.isArray(data?.details)
        ? data.details.map((d) => d?.message).filter(Boolean).join(" ")
        : "";
      setError(details || data?.message || err?.message || "Failed to save attendance policy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        {/* Header */}
        <div className="modal-header">
          <h2>{editingPolicy ? "Edit Attendance Policy" : "Create Attendance Policy"}</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "10px 24px", fontSize: "13px", borderBottom: "1px solid #fee2e2" }}>
            {error}
          </div>
        )}

        {/* 2-Column Body: Sidebar Navigation + Dynamic Section Form */}
        <div className="policy-modal-layout">
          {/* Step Navigation Sidebar */}
          <div className="policy-modal-sidebar">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  type="button"
                  key={sec.id}
                  className={`policy-step-item ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setError("");
                    setActiveSection(sec.id);
                  }}
                >
                  <Icon size={16} />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form Content Area */}
          <div className="policy-modal-content">
            {activeSection === "basic" && (
              <>
                <div className="form-group-row">
                  <div className="form-field">
                    <label>
                      Policy Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g. Standard Policy"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-field">
                    <label>
                      Policy Code <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="code"
                      placeholder="e.g. STD-CHN"
                      value={formData.code}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>
                    Branch <span className="required">*</span>
                  </label>
                  <select name="branchId" value={formData.branchId} onChange={handleChange}>
                    <option value="">Select branch...</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    name="description"
                    placeholder="Standard day shift policy for Chennai branch"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            {activeSection === "shift" && (
              <>
                <div className="form-group-row">
                  <div className="form-field">
                    <label>Shift Start Time (HH:mm) <span className="required">*</span></label>
                    <input
                      type="time"
                      name="shiftStartTime"
                      value={formData.shiftStartTime}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-field">
                    <label>Shift End Time (HH:mm) <span className="required">*</span></label>
                    <input
                      type="time"
                      name="shiftEndTime"
                      value={formData.shiftEndTime}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <p style={{ fontSize: "12px", color: "#475569", margin: 0 }}>
                  Standard day shifts or overnight shifts (end time on the following calendar day) are both supported.
                </p>
              </>
            )}

            {activeSection === "hours" && (
              <div className="form-group-row">
                <div className="form-field">
                  <label>Working Hours Per Day</label>
                  <input
                    type="number"
                    step="0.5"
                    name="workingHoursPerDay"
                    value={formData.workingHoursPerDay}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-field">
                  <label>Full Day Hours Threshold</label>
                  <input
                    type="number"
                    step="0.5"
                    name="fullDayHours"
                    value={formData.fullDayHours}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-field">
                  <label>Half Day Hours Threshold</label>
                  <input
                    type="number"
                    step="0.5"
                    name="halfDayHours"
                    value={formData.halfDayHours}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {activeSection === "time" && (
              <div className="form-group-row">
                <div className="form-field">
                  <label>Late Grace (Minutes)</label>
                  <input
                    type="number"
                    name="lateGraceMinutes"
                    value={formData.lateGraceMinutes}
                    onChange={handleChange}
                  />
                  <span style={{ fontSize: "11px", color: "#475569" }}>Admin-configured grace before late arrival flag.</span>
                </div>
                <div className="form-field">
                  <label>Early Checkout Grace (Minutes)</label>
                  <input
                    type="number"
                    name="earlyCheckoutGraceMinutes"
                    value={formData.earlyCheckoutGraceMinutes}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {activeSection === "break" && (
              <div className="form-field">
                <label>Break Duration (Minutes)</label>
                <input
                  type="number"
                  name="breakDurationMinutes"
                  value={formData.breakDurationMinutes}
                  onChange={handleChange}
                />
              </div>
            )}

            {activeSection === "weekly" && (
              <div className="form-field">
                <label>Weekly Off Days (Non-working regular days)</label>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  {DAYS_OF_WEEK.map((d) => {
                    const isOff = formData.weeklyOffDays.includes(d.id);
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => handleWeeklyOffToggle(d.id)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "8px",
                          border: isOff ? "1px solid #059669" : "1px solid #cbd5e1",
                          backgroundColor: isOff ? "#ecfdf5" : "#ffffff",
                          color: isOff ? "#059669" : "#475569",
                          fontWeight: isOff ? "700" : "500",
                          cursor: "pointer",
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <span style={{ fontSize: "11px", color: "#475569", marginTop: "6px" }}>
                  Selected days are automatically identified as Weekly Off for employees under this policy.
                </span>
              </div>
            )}

            {activeSection === "monthly" && (
              <div className="form-field">
                <label>Monthly Paid Leave Allowance (Days)</label>
                <input
                  type="number"
                  name="monthlyLeaveAllowance"
                  value={formData.monthlyLeaveAllowance}
                  onChange={handleChange}
                />
              </div>
            )}

            {activeSection === "overtime" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <label className="switch">
                    <input
                      type="checkbox"
                      name="overtimeEnabled"
                      checked={formData.overtimeEnabled}
                      onChange={handleChange}
                    />
                    <span className="slider"></span>
                  </label>
                  <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#1e293b" }}>
                    Enable Overtime Calculations
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <label className="switch">
                    <input
                      type="checkbox"
                      name="permissionEnabled"
                      checked={formData.permissionEnabled}
                      onChange={handleChange}
                    />
                    <span className="slider"></span>
                  </label>
                  <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#1e293b" }}>
                    Enable Permission Requests
                  </span>
                </div>

                {formData.permissionEnabled && (
                  <div className="form-group-row">
                    <div className="form-field">
                      <label>Max Permission Hours / Day</label>
                      <input
                        type="number"
                        step="0.5"
                        name="maxPermissionHoursPerDay"
                        value={formData.maxPermissionHoursPerDay}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-field">
                      <label>Max Permission Hours / Month</label>
                      <input
                        type="number"
                        step="0.5"
                        name="maxPermissionHoursPerMonth"
                        value={formData.maxPermissionHoursPerMonth}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Step / Submit Button */}
        <div className="modal-footer">
          <button type="button" className="btn-printz-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="btn-printz-primary" onClick={handleNextOrSubmit} disabled={loading}>
            {activeSection === "overtime" ? (
              loading ? "Saving..." : (editingPolicy ? "Update Policy" : "Save Policy")
            ) : (
              <>
                <span>Next</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
