import React from "react";
import { Briefcase, Calendar, AlertTriangle, Layers, FileText } from "lucide-react";
import { PRIORITY_OPTIONS, SOURCE_OPTIONS } from "../constants/jobConstants";
import FormInput from "../../../shared/components/FormInput";
import "../../customer/styles/customerV3.css";
import "../styles/jobV3.css";

export default function JobBasicInfoCard({
  formData,
  errors = {},
  onChange
}) {
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="v3-card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div className="v3-card-icon">
          <Briefcase size={18} />
        </div>
        <div>
          <h3 className="v3-card-title">2. Job Overview & Schedule</h3>
        </div>
      </div>

      <div className="v3-grid-12">
        {/* Job Title (6 cols) */}
        <div className="v3-col-6">
          <FormInput
            id="jobTitle"
            name="jobTitle"
            label="Job Title / Project Name"
            required
            value={formData.jobTitle || ""}
            onChange={onChange}
            placeholder="e.g. Visiting Cards for Sales Team, Tri-Fold Brochure, 10x4 Flex Banner"
            icon={Briefcase}
            error={errors.jobTitle}
          />
        </div>

        {/* Priority (3 cols) */}
        <div className="v3-col-3">
          <div className="v3-form-group">
            <label className="v3-form-label">
              Priority Level <span className="v3-required-star">*</span>
            </label>
            <div className="v3-input-wrapper">
              <select
                id="priority"
                name="priority"
                value={formData.priority || "NORMAL"}
                onChange={onChange}
                className={`v3-input no-icon ${errors.priority ? "has-error" : ""}`}
                style={{ fontWeight: 600 }}
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.priority && <p className="v3-error-text">{errors.priority}</p>}
          </div>
        </div>

        {/* Source (3 cols) */}
        <div className="v3-col-3">
          <div className="v3-form-group">
            <label className="v3-form-label">Order Source</label>
            <div className="v3-input-wrapper">
              <select
                id="source"
                name="source"
                value={formData.source || "WALK_IN"}
                onChange={onChange}
                className="v3-input no-icon"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Expected Delivery Date (6 cols) */}
        <div className="v3-col-6">
          <FormInput
            id="expectedDeliveryDate"
            name="expectedDeliveryDate"
            label="Promised Delivery Date"
            type="date"
            min={todayStr}
            value={formData.expectedDeliveryDate || ""}
            onChange={onChange}
            icon={Calendar}
            error={errors.expectedDeliveryDate}
          />
        </div>

        {/* General Job Notes (6 cols) */}
        <div className="v3-col-6">
          <div className="v3-form-group">
            <label className="v3-form-label">Customer Instructions / Global Notes</label>
            <input
              type="text"
              name="notes"
              value={formData.notes || ""}
              onChange={onChange}
              placeholder="e.g. Deliver before 5 PM Friday, Urgent for weekend exhibition"
              className="v3-input no-icon"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
