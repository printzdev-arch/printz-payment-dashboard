import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  User,
  Phone,
  Mail,
  Building,
  MapPin,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from "lucide-react";
import FormInput from "../../../shared/components/FormInput";
import Badge from "../../../shared/components/Badge";
import { createCustomer, verifyBranchQrSession } from "../api/customerApi";
import { validateCustomerForm, normalizeCustomerData } from "../utils/customerValidation";
import "../styles/customerV3.css";

/**
 * PrintZ V3 - Mobile QR Self-Registration Page
 * Standalone, lightweight, mobile-responsive page for customers scanning branch QR code.
 */
export default function MobileCustomerRegisterPage() {
  const [searchParams] = useSearchParams();
  const branchParam = searchParams.get("branch") || "BR001";
  const branchNameParam = searchParams.get("branchName") || "Banaswadi Branch";

  const [branchInfo, setBranchInfo] = useState({
    code: branchParam,
    name: branchNameParam
  });
  const [isValidatingBranch, setIsValidatingBranch] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    companyName: "",
    gstNumber: "",
    address: "",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "",
    customerType: "INDIVIDUAL"
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [registeredCustomer, setRegisteredCustomer] = useState(null);

  // Validate branch context on load
  useEffect(() => {
    async function checkBranch() {
      try {
        const data = await verifyBranchQrSession(branchParam);
        if (data && data.branch) {
          setBranchInfo(data.branch);
        }
      } catch (err) {
        console.warn("Branch QR verification fallback:", err);
      } finally {
        setIsValidatingBranch(false);
      }
    }
    checkBranch();
  }, [branchParam]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const { isValid, errors: validationErrors } = validateCustomerForm(formData);
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload = normalizeCustomerData({
        ...formData,
        branchId: branchInfo.id || "64f1a2b3c4d5e6f7a8b90001",
        branchName: branchInfo.name || "Banaswadi",
        source: "QR",
        customerType: formData.companyName || formData.gstNumber ? "BUSINESS" : "INDIVIDUAL"
      });

      const response = await createCustomer(payload);
      if (response && (response.customer || response.success)) {
        setRegisteredCustomer(response.customer || response);
      }
    } catch (err) {
      console.error("QR Registration error:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Registration failed. Please check your network and try again.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="v3-mobile-reg-page">
      <div className="v3-mobile-reg-wrapper">
        {/* Brand Header */}
        <div className="v3-mobile-reg-brand">
          <div className="v3-mobile-reg-logo">
            P
          </div>
          <h1 className="v3-mobile-reg-title">
            Print<span style={{ color: "#34d399" }}>Z</span>
          </h1>
          <div className="v3-mobile-reg-branch-badge">
            <span>📍</span> {branchInfo.name || "PrintZ Centre"} ({branchInfo.code || "BR001"})
          </div>
        </div>

        {/* Main Card Container */}
        <div className="v3-mobile-reg-card">
          {registeredCustomer ? (
            /* Success View */
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "20px", padding: "10px 0" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "18px", backgroundColor: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", boxShadow: "0 4px 12px rgba(5, 150, 105, 0.15)" }}>
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Registration Successful!
                </h2>
                <p style={{ fontSize: "12.5px", color: "#64748b", marginTop: "6px" }}>
                  Welcome, <strong>{registeredCustomer.name}</strong>. Your profile is active in our store queue.
                </p>
              </div>

              <div style={{ padding: "16px", backgroundColor: "#f0fdf4", borderRadius: "16px", border: "1.5px solid #bbf7d0", textAlign: "left", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <span style={{ color: "#64748b" }}>Customer Code:</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#065f46", fontSize: "15px", backgroundColor: "#dcfce7", padding: "2px 8px", borderRadius: "6px" }}>
                    {registeredCustomer.customerCode}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <span style={{ color: "#64748b" }}>Registered Mobile:</span>
                  <strong style={{ fontFamily: "monospace", color: "#0f172a" }}>
                    {registeredCustomer.mobile}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <span style={{ color: "#64748b" }}>Store Branch:</span>
                  <strong style={{ color: "#0f172a" }}>
                    {registeredCustomer.branchName || branchInfo.name}
                  </strong>
                </div>
              </div>

              <div style={{ padding: "14px", borderRadius: "12px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "12px", color: "#334155", textAlign: "left" }}>
                <strong style={{ color: "#0f172a", display: "block", marginBottom: "4px" }}>Next Steps:</strong>
                Please share your registered mobile number (<strong>{registeredCustomer.mobile}</strong>) with the front-desk executive to start your print order.
              </div>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="v3-mobile-reg-btn-submit"
              >
                Register Another Customer
              </button>
            </div>
          ) : (
            /* Registration Form View */
            <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="v3-mobile-reg-header">
                <h2>Register your details</h2>
                <p>Quick self-registration for fast job order processing</p>
              </div>

              {serverError && (
                <div style={{ padding: "12px 14px", borderRadius: "10px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                  <span>{serverError}</span>
                </div>
              )}

              <FormInput
                label="Full Name"
                name="name"
                required
                placeholder="Your Name (e.g. Arun Kumar)"
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
                placeholder="10-digit mobile number"
                value={formData.mobile}
                onChange={handleInputChange}
                error={errors.mobile}
                icon={Phone}
                helperText="We will send job updates and invoices to this number"
              />

              <FormInput
                label="Email Address (Optional)"
                name="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                icon={Mail}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <FormInput
                  label="Company / Shop Name"
                  name="companyName"
                  placeholder="Optional business name"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  icon={Building}
                />

                <FormInput
                  label="GST Number"
                  name="gstNumber"
                  maxLength={15}
                  placeholder="Optional GSTIN"
                  value={formData.gstNumber}
                  onChange={handleInputChange}
                  error={errors.gstNumber}
                  icon={FileSpreadsheet}
                />
              </div>

              <FormInput
                label="Street Address / City"
                name="address"
                placeholder="Your locality / address"
                value={formData.address}
                onChange={handleInputChange}
                icon={MapPin}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="v3-mobile-reg-btn-submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting Details...
                  </>
                ) : (
                  <>
                    Continue & Get Customer Code
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              <div className="v3-mobile-reg-privacy">
                <ShieldCheck size={14} color="#059669" />
                <span>Your information is protected under PrintZ privacy policy</span>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="v3-mobile-reg-footer">
          PrintZ Cloud Operations • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
