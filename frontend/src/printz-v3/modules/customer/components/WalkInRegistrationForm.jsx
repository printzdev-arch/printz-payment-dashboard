import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  Building,
  FileSpreadsheet,
  MapPin,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ArrowRight,
  Lock,
  Hash
} from "lucide-react";
import FormInput from "../../../shared/components/FormInput";
import { createCustomer, searchCustomers, getCustomers } from "../api/customerApi";
import { validateCustomerForm, normalizeCustomerData } from "../utils/customerValidation";
import "../styles/customerV3.css";

// Helper to compute next customer ID placeholder if needed
function getNextCustomerCode() {
  return "";
}

export default function WalkInRegistrationForm({
  branchName = "Banaswadii",
  branchId = "489571a9af51836599708543",
  initialValues = null,
  onCustomerCreated,
  onSelectExistingCustomer,
  onCancel,
  onMobileChange,
  className = ""
}) {
  const [autoCode, setAutoCode] = useState(getNextCustomerCode());

  const initialFormState = {
    customerCode: initialValues?.customerCode || autoCode,
    customerType: "INDIVIDUAL",
    name: initialValues?.name || "",
    mobile: initialValues?.mobile || "",
    email: initialValues?.email || "",
    companyName: initialValues?.companyName || "",
    gstNumber: initialValues?.gstNumber || "",
    contactPerson: initialValues?.contactPerson || "",
    address: initialValues?.address || "",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: initialValues?.pincode || "",
    whatsAppOptIn: true
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateCustomer, setDuplicateCustomer] = useState(null);
  const [allowDuplicateOverride, setAllowDuplicateOverride] = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    const nextCode = getNextCustomerCode();
    setAutoCode(nextCode);
    if (!formData.customerCode || formData.customerCode.startsWith("CUS-")) {
      setFormData((prev) => ({
        ...prev,
        customerCode: initialValues?.customerCode || nextCode
      }));
    }
  }, []);

  useEffect(() => {
    if (initialValues) {
      setFormData((prev) => ({
        ...prev,
        ...initialValues,
        customerCode: initialValues.customerCode || prev.customerCode || autoCode
      }));
    }
  }, [initialValues]);

  // Real-time mobile duplicate check when 10 digits are entered
  useEffect(() => {
    const cleanMobile = (formData.mobile || "").replace(/\D/g, "");
    if (onMobileChange) {
      onMobileChange(cleanMobile);
    }
    if (cleanMobile.length === 10) {
      checkMobileDuplicate(cleanMobile);
    } else {
      setDuplicateCustomer(null);
      setAllowDuplicateOverride(false);
    }
  }, [formData.mobile]);

  const checkMobileDuplicate = async (mobileNumber) => {
    setIsCheckingDuplicate(true);
    try {
      const results = await searchCustomers(mobileNumber, "");
      const exactMatch = results.find(
        (c) => (c.mobile || "").replace(/\D/g, "") === mobileNumber
      );
      if (exactMatch) {
        setDuplicateCustomer(exactMatch);
      } else {
        setDuplicateCustomer(null);
      }
    } catch (err) {
      console.error("Duplicate check failed:", err);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (serverError) setServerError(null);
  };

  const handleCustomerTypeToggle = (type) => {
    setFormData((prev) => ({
      ...prev,
      customerType: type
    }));
  };

  const handleReset = () => {
    const freshCode = getNextCustomerCode();
    setAutoCode(freshCode);
    setFormData({
      ...initialFormState,
      customerCode: freshCode
    });
    setErrors({});
    setDuplicateCustomer(null);
    setAllowDuplicateOverride(false);
    setServerError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const { isValid, errors: validationErrors } = validateCustomerForm(formData);
    if (!isValid) {
      setErrors(validationErrors);
      const firstErrorKey = Object.keys(validationErrors)[0];
      const elem = document.getElementById(firstErrorKey);
      if (elem) elem.focus();
      return;
    }

    if (duplicateCustomer && !allowDuplicateOverride) {
      setServerError("Existing customer detected with this mobile number. Use existing customer or confirm override.");
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload = normalizeCustomerData({
        ...formData,
        customerCode: formData.customerCode || autoCode,
        branchId,
        branchName,
        source: "WALK_IN",
        allowDuplicate: allowDuplicateOverride
      });

      const response = await createCustomer(payload);
      if (response && (response.customer || response.success)) {
        const createdCustomer = response.customer || response;
        if (onCustomerCreated) {
          onCustomerCreated(createdCustomer);
        }
      }
    } catch (err) {
      console.error("Failed to save customer:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to register customer. Please try again.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`v3-card ${className}`}
      style={{
        padding: "20px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        boxSizing: "border-box"
      }}
    >
      {/* Card Header & Customer Type Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#047857" }}>
            <User size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
              Walk-in Customer Registration
            </h3>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
            Customer Type <span style={{ color: "#e11d48" }}>*</span>
          </span>
          <div style={{ display: "inline-flex", background: "#ffffff", padding: "2px", borderRadius: "8px", border: "1px solid #cbd5e1", gap: "2px" }}>
            <button
              type="button"
              onClick={() => handleCustomerTypeToggle("INDIVIDUAL")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                backgroundColor: formData.customerType === "INDIVIDUAL" ? "#047857" : "transparent",
                color: formData.customerType === "INDIVIDUAL" ? "#ffffff" : "#475569",
                transition: "all 0.15s ease"
              }}
            >
              <User size={12} />
              <span>Individual (B2C)</span>
            </button>

            <button
              type="button"
              onClick={() => handleCustomerTypeToggle("BUSINESS")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                backgroundColor: formData.customerType === "BUSINESS" ? "#047857" : "transparent",
                color: formData.customerType === "BUSINESS" ? "#ffffff" : "#475569",
                transition: "all 0.15s ease"
              }}
            >
              <Building size={12} />
              <span>Business (B2B)</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
        {/* Server Error Alert */}
        {serverError && (
          <div style={{ padding: "10px 14px", backgroundColor: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "8px", color: "#be123c", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={15} />
            <span>{serverError}</span>
          </div>
        )}

        {/* Row 1: Non-editable Customer ID, Customer Name & Mobile Number */}
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", gap: "12px" }}>
          {/* Customer ID / Customer Code (Non-editable Auto-Generated) */}
          <div className="v3-form-group">
            <label className="v3-form-label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span>Customer ID</span>
              <Lock size={11} color="#64748b" />
            </label>
            <div className="v3-input-wrapper">
              <input
                type="text"
                name="customerCode"
                value={formData.customerCode || autoCode}
                readOnly
                disabled
                title="System generated Customer ID (Non-editable)"
                className="v3-input"
                style={{
                  backgroundColor: "#f8fafc",
                  color: "#047857",
                  fontFamily: "monospace",
                  fontWeight: 800,
                  fontSize: "13px",
                  cursor: "not-allowed",
                  borderColor: "#cbd5e1"
                }}
              />
              <div className="v3-input-icon">
                <Hash size={14} color="#047857" />
              </div>
            </div>
            <span style={{ fontSize: "10px", color: "#64748b" }}>Auto-generated</span>
          </div>

          <FormInput
            label="Customer Name"
            name="name"
            required
            placeholder="e.g. ABC Printers / Arjun Kumar"
            value={formData.name}
            onChange={handleInputChange}
            error={errors.name}
            icon={User}
          />

          <FormInput
            label="Mobile Number"
            name="mobile"
            required
            maxLength={10}
            placeholder="e.g. 9876543210"
            value={formData.mobile}
            onChange={handleInputChange}
            error={errors.mobile}
            icon={Phone}
          />
        </div>

        {/* Row 2: Email Address & Company Name */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <FormInput
            label="Email Address"
            name="email"
            type="email"
            placeholder="e.g. client@company.com"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            icon={Mail}
          />

          <FormInput
            label="Company / Business Name"
            name="companyName"
            placeholder="e.g. Vortex Architects Pvt Ltd"
            value={formData.companyName}
            onChange={handleInputChange}
            error={errors.companyName}
            icon={Building}
          />
        </div>

        {/* Row 3: GSTIN & Contact Person */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <FormInput
            label="GST Number (GSTIN)"
            name="gstNumber"
            maxLength={15}
            placeholder="e.g. 29ABCDE1234F1Z5"
            value={formData.gstNumber}
            onChange={handleInputChange}
            error={errors.gstNumber}
            icon={FileSpreadsheet}
          />

          <FormInput
            label="Contact Person Name"
            name="contactPerson"
            placeholder="e.g. Mr. Arjun Kumar"
            value={formData.contactPerson}
            onChange={handleInputChange}
            error={errors.contactPerson}
            icon={User}
          />
        </div>

        {/* Address Sub-Heading */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
          <MapPin size={15} color="#047857" />
          <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
            Address Details
          </span>
        </div>

        {/* Row 4: Street Address (Full Width) */}
        <div>
          <FormInput
            label="Street Address / Landmark"
            name="address"
            placeholder="e.g. #45, CMR Road, 2nd Block"
            value={formData.address}
            onChange={handleInputChange}
            error={errors.address}
            icon={MapPin}
          />
        </div>

        {/* Row 5: City, State, Pincode (3 columns) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <FormInput
            label="City"
            name="city"
            placeholder="e.g. Bengaluru"
            value={formData.city}
            onChange={handleInputChange}
            error={errors.city}
            icon={Building}
          />

          {/* State Dropdown */}
          <div className="v3-form-group">
            <label className="v3-form-label">
              State <span className="v3-required-star">*</span>
            </label>
            <div className="v3-input-wrapper">
              <select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="v3-input no-icon"
                style={{ appearance: "none", cursor: "pointer" }}
              >
                <option value="Karnataka">Karnataka</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
                <option value="Telangana">Telangana</option>
                <option value="Kerala">Kerala</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Gujarat">Gujarat</option>
              </select>
              <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#64748b" }}>
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          <FormInput
            label="Pincode"
            name="pincode"
            maxLength={6}
            placeholder="e.g. 560043"
            value={formData.pincode}
            onChange={handleInputChange}
            error={errors.pincode}
            icon={MapPin}
          />
        </div>

        {/* WhatsApp Notification Checkbox */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#334155", marginTop: "2px" }}>
          <input
            id="whatsAppOptIn"
            name="whatsAppOptIn"
            type="checkbox"
            checked={formData.whatsAppOptIn}
            onChange={handleInputChange}
            style={{ width: "16px", height: "16px", accentColor: "#047857", cursor: "pointer" }}
          />
          <label htmlFor="whatsAppOptIn" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>Send digital job estimates, proof approvals, and invoice updates via</span>
            <strong style={{ color: "#047857" }}>WhatsApp</strong>
          </label>
        </div>

        {/* Action Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "14px",
            borderTop: "1px solid #f1f5f9",
            marginTop: "auto"
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="v3-btn-secondary"
            style={{ fontSize: "12px", padding: "8px 14px" }}
          >
            <RotateCcw size={13} />
            <span>Reset Form</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting || (Boolean(duplicateCustomer) && !allowDuplicateOverride)}
            className="v3-btn-primary"
            style={{ fontSize: "12px", padding: "8px 20px", backgroundColor: "#047857", borderColor: "#047857" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                <span>Saving Customer...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Customer & Continue</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
