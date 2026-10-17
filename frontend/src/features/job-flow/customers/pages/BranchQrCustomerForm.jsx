import React, { useState, useEffect } from "react";
import {
  QrCode,
  CheckCircle,
  Clock,
  ShieldCheck,
  Sparkles,
  UserCheck,
  AlertCircle,
  AlertOctagon,
  Loader2,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import jobFlowApi from "../api/customersApi";
import { toast } from "react-toastify";

const getManagerBranchInfo = () => {
  try {
    if (typeof window !== "undefined" && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlCode = urlParams.get("branchCode") || urlParams.get("code") || urlParams.get("branch");
      if (urlCode) {
        return { branchName: "", branchCode: urlCode.trim(), branchId: null, isManager: false, isLocked: false };
      }
    }

    const userBranch = localStorage.getItem("userBranchName");
    const userObj = JSON.parse(localStorage.getItem("user") || "{}");
    const printzUser = JSON.parse(localStorage.getItem("printz_user") || "{}");

    const branchName =
      (userBranch && userBranch.trim()) ||
      (userObj.branch && userObj.branch.trim()) ||
      (userObj.branchName && userObj.branchName.trim()) ||
      (printzUser.branch && printzUser.branch.trim()) ||
      (printzUser.branchName && printzUser.branchName.trim()) ||
      "Banaswadii";

    const branchCode =
      (userObj.branchCode && userObj.branchCode.trim()) ||
      (printzUser.branchCode && printzUser.branchCode.trim()) ||
      "BN";

    const branchId =
      userObj.branchId ||
      (userObj.branchIds && userObj.branchIds[0]) ||
      printzUser.branchId ||
      "489571a9af51836599708543";

    const isManager =
      userObj.role === "manager" ||
      userObj.role === "branch_manager" ||
      printzUser.role === "manager" ||
      Boolean(userBranch || userObj.branch);

    return { branchName, branchCode, branchId, isManager, isLocked: isManager };
  } catch (e) {
    return { branchName: "Banaswadii", branchCode: "BN", branchId: "489571a9af51836599708543", isManager: true, isLocked: true };
  }
};

const matchBranch = (bList = [], target = {}) => {
  if (!Array.isArray(bList) || bList.length === 0) return null;

  // 1. Strict ID match
  if (target.branchId) {
    const idMatch = bList.find((b) => String(b._id || b.id) === String(target.branchId));
    if (idMatch) return idMatch;
  }

  // 2. Strict Code match
  if (target.branchCode) {
    const cleanTargetCode = target.branchCode.trim().toUpperCase();
    const codeMatch = bList.find(
      (b) => (b.code || "").trim().toUpperCase() === cleanTargetCode
    );
    if (codeMatch) return codeMatch;
  }

  // 3. Name match (case-insensitive)
  if (target.branchName) {
    const cleanTargetName = target.branchName.trim().toLowerCase();
    const exactNameMatch = bList.find(
      (b) => (b.name || b.branchName || "").trim().toLowerCase() === cleanTargetName
    );
    if (exactNameMatch) return exactNameMatch;

    const containsMatch = bList.find((b) => {
      const bn = (b.name || b.branchName || "").trim().toLowerCase();
      return bn.includes(cleanTargetName) || cleanTargetName.includes(bn);
    });
    if (containsMatch) return containsMatch;
  }

  // 4. Default: Look specifically for Banaswadi (manager default)
  const banaswadiMatch = bList.find((b) => {
    const bn = (b.name || b.branchName || "").toLowerCase();
    return bn.includes("banaswadi") || (b.code || "").toUpperCase() === "BN";
  });
  if (banaswadiMatch) return banaswadiMatch;

  return bList[0];
};

export const BranchQrCustomerForm = () => {
  const navigate = useNavigate();
  const managerInfo = getManagerBranchInfo();
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    branchName: managerInfo.branchName || "Banaswadii (BN)",
    branchCode: managerInfo.branchCode || "BN",
    branchId: managerInfo.branchId || "489571a9af51836599708543",
    name: "",
    phone: "",
    email: "",
    companyName: "",
    gstin: "",
    customerType: "QR",
    customerSource: "INDIVIDUAL",
  });

  const [existingCustomer, setExistingCustomer] = useState(null);
  const [matchInfo, setMatchInfo] = useState(null);
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    const mgr = getManagerBranchInfo();
    jobFlowApi.getBranches()
      .then((res) => {
        const list = res?.data || res?.items || res || [];
        if (Array.isArray(list) && list.length > 0) {
          setBranches(list);
          const matched = matchBranch(list, mgr);
          if (matched) {
            setFormData((prev) => ({
              ...prev,
              branchName: `${matched.name} (${matched.code})`,
              branchCode: matched.code,
              branchId: matched._id || matched.id,
            }));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Debounced check on name, phone/mobile, and email
  useEffect(() => {
    const rawName = (formData.name || "").trim();
    const rawPhone = (formData.phone || "").trim();
    const rawEmail = (formData.email || "").trim();

    const hasEnoughPhone = rawPhone.replace(/\D/g, "").length >= 7;
    const hasEnoughEmail = rawEmail.includes("@") && rawEmail.length >= 5;
    const hasEnoughName = rawName.length >= 3;

    if (!hasEnoughPhone && !hasEnoughEmail && !hasEnoughName) {
      setExistingCustomer(null);
      setMatchInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingCustomer(true);
        const res = await jobFlowApi.checkCustomerExists({
          name: hasEnoughName ? rawName : undefined,
          phone: hasEnoughPhone ? rawPhone : undefined,
          email: hasEnoughEmail ? rawEmail : undefined,
          gstin: (formData.gstin || "").trim() || undefined,
          company: (formData.companyName || "").trim() || undefined,
        });

        const data = res?.data || res || {};
        if (data.exists && data.customer) {
          setExistingCustomer(data.customer);
          setMatchInfo({
            matchType: data.matchType,
            customer: data.customer,
          });
          toast.error(
            `Customer "${data.customer.name}" (${data.customer.customerCode || "Existing"}) already exists (matched by ${data.matchType}). Registration is not allowed!`,
            { autoClose: 5000, toastId: "customer-match-notify" }
          );
        } else {
          setExistingCustomer(null);
          setMatchInfo(null);
        }
      } catch (err) {
        // silently ignore check errors
      } finally {
        setCheckingCustomer(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.name, formData.phone, formData.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBranchChange = (e) => {
    const code = e.target.value;
    const b = branches.find((item) => item.code === code);
    setFormData((prev) => ({
      ...prev,
      branchCode: code,
      branchName: b ? `${b.name} (${b.code})` : code,
      branchId: b?._id || b?.id,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error("Name and Phone Number are required");
      return;
    }

    // STRICT CHECK: Disallow registration if customer already exists
    if (matchInfo && matchInfo.customer) {
      toast.error(
        `Customer "${matchInfo.customer.name}" (${matchInfo.customer.customerCode || "Existing"}) already exists in records! Registration is not allowed.`,
        { autoClose: 5000 }
      );
      return;
    }

    setLoading(true);
    try {
      // Immediate server check prior to submission
      const checkRes = await jobFlowApi.checkCustomerExists({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || undefined,
        gstin: (formData.gstin || "").trim() || undefined,
        company: (formData.companyName || "").trim() || undefined,
      });
      const checkData = checkRes?.data || checkRes || {};
      if (checkData.exists && checkData.customer) {
        setExistingCustomer(checkData.customer);
        setMatchInfo({ matchType: checkData.matchType, customer: checkData.customer });
        toast.error(
          `Customer "${checkData.customer.name}" (${checkData.customer.customerCode || "Existing"}) already exists! Registration is not allowed.`,
          { autoClose: 5000 }
        );
        setLoading(false);
        return;
      }
      const activeCode = formData.branchCode || (branches[0]?.code) || "BN";
      const payload = {
        branchCode: activeCode,
        branch: activeCode,
        branchId: formData.branchId,
        customerName: formData.name.trim(),
        customerPhone: formData.phone.trim(),
        customerType: "QR",
        customerSource: formData.companyName || formData.customerSource === "COMPANY" ? "COMPANY" : "INDIVIDUAL",
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        mobile: formData.phone.trim(),
        email: formData.email?.trim() || undefined,
        company: formData.companyName?.trim() || undefined,
        companyName: formData.companyName?.trim() || undefined,
        gstin: formData.gstin?.trim() || undefined,
        onlyCustomerRegistration: true,
      };

      // 1. Submit public customer registration (validates & matches central customer, stages in customerRequests with PENDING)
      const res = await jobFlowApi.submitPublicJobRequest(payload);
      const resData = res?.data || res || {};
      setSubmissionResult(resData);

      setSubmitted(true);
      toast.success(
        matchInfo
          ? `Customer profile (${matchInfo.customer.customerCode || "Existing"}) linked and enquiry staged!`
          : "Customer registered successfully and enquiry staged!"
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit customer registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#062817", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      {managerInfo.isManager && (
        <div style={{ width: "100%", maxWidth: "960px", marginBottom: "0.85rem", display: "flex", justifyContent: "flex-start" }}>
          <button
            type="button"
            onClick={() => navigate("/customers")}
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
              padding: "0.45rem 0.9rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              transition: "all 0.18s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)")}
          >
            <ArrowLeft size={16} />
            <span>← Back to Customer Directory</span>
          </button>
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          maxWidth: "960px",
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        }}
      >
        {/* Left Branding Column */}
        <div
          style={{
            background: "linear-gradient(180deg, #064e3b 0%, #062817 100%)",
            color: "#ffffff",
            padding: "2.5rem 1.75rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Sparkles size={28} style={{ color: "#34d399" }} />
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>PrintZ</h1>
            </div>
            <p style={{ color: "#a7f3d0", fontSize: "0.875rem", marginTop: 0 }}>Your Print Partner</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <UserCheck size={24} style={{ color: "#34d399" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>Centralized Profiles</div>
                <div style={{ fontSize: "0.75rem", color: "#a7f3d0" }}>Auto-deduplicated by Phone & Email</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Clock size={24} style={{ color: "#34d399" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>Fast Counter Intake</div>
                <div style={{ fontSize: "0.75rem", color: "#a7f3d0" }}>Instant registration via QR scan</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <ShieldCheck size={24} style={{ color: "#34d399" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>Safe & Secure</div>
                <div style={{ fontSize: "0.75rem", color: "#a7f3d0" }}>Enterprise multi-branch directory</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: "0.75rem", color: "#6ee7b7" }}>
            Scan QR Code at branch counter to register new customers or stage walk-in requests.
          </div>
        </div>

        {/* Right Form Column */}
        <div style={{ padding: "2.5rem" }}>
          {!submitted ? (
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.2rem 0.5rem", borderRadius: "4px", backgroundColor: "#ecfdf5", color: "#065f46", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                    <QrCode size={14} /> Branch QR Self-Service
                  </div>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    Customer Registration
                  </h2>
                  <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "4px 0 0 0" }}>
                    Checks existing records across all branches; auto-links matching profiles or generates a new Customer Code.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>Branch:</span>
                  <select
                    name="branchCode"
                    value={formData.branchCode}
                    onChange={handleBranchChange}
                    disabled={managerInfo.isLocked}
                    className="jf-select"
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.8125rem",
                      backgroundColor: managerInfo.isLocked ? "#f8fafc" : "#ffffff",
                      cursor: managerInfo.isLocked ? "default" : "pointer",
                      fontWeight: 600,
                      color: "#0f172a",
                    }}
                    title={managerInfo.isLocked ? `Locked to Manager's Branch: ${formData.branchName}` : "Select branch"}
                  >
                    {branches && branches.length > 0 ? (
                      branches.map((b) => (
                        <option key={b._id || b.id || b.code} value={b.code}>
                          {b.name} ({b.code})
                        </option>
                      ))
                    ) : (
                      <option value={formData.branchCode}>
                        {formData.branchName}
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {/* Duplicate Detection Alert Banner: Strictly blocks registration */}
              {matchInfo && matchInfo.customer ? (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1.5px solid #ef4444",
                    borderRadius: "10px",
                    padding: "1rem 1.15rem",
                    marginBottom: "1.25rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.85rem",
                    boxShadow: "0 4px 6px -1px rgb(239 68 68 / 0.15)",
                  }}
                >
                  <div style={{ color: "#dc2626", marginTop: "2px", flexShrink: 0 }}>
                    <AlertOctagon size={24} />
                  </div>
                  <div style={{ flex: 1, fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                      <strong style={{ color: "#991b1b", fontSize: "0.95rem" }}>
                        Registration Not Allowed: Customer Already Exists!
                      </strong>
                      <span
                        style={{
                          backgroundColor: "#fee2e2",
                          color: "#991b1b",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                        }}
                      >
                        {matchInfo.customer.customerCode || "ALREADY REGISTERED"}
                      </span>
                      <span
                        style={{
                          backgroundColor: "#fef3c7",
                          color: "#92400e",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                          fontWeight: 600,
                          fontSize: "0.725rem",
                        }}
                      >
                        Matched by {matchInfo.matchType}
                      </span>
                    </div>
                    <div style={{ color: "#7f1d1d", lineHeight: 1.5 }}>
                      A customer profile is already registered under <strong>{matchInfo.customer.name}</strong> (Phone: {matchInfo.customer.mobile || matchInfo.customer.phone || "—"}
                      {matchInfo.customer.email ? ` • Email: ${matchInfo.customer.email}` : ""}
                      {matchInfo.customer.branchId?.name ? ` • Branch: ${matchInfo.customer.branchId.name}` : ""}).
                      <br />
                      <strong>New registration is not allowed for existing customers.</strong> Please use their existing customer profile for new job orders.
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Customer Information Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 0.65rem 0" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Customer Identification
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {checkingCustomer && (
                    <span style={{ fontSize: "0.725rem", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Loader2 size={12} className="animate-spin" /> Checking records...
                    </span>
                  )}
                  {!checkingCustomer && !matchInfo && (formData.name || formData.phone) && (
                    <span style={{ fontSize: "0.725rem", color: "#059669", fontWeight: 600 }}>
                      ✓ Unique / New Customer
                    </span>
                  )}
                </div>
              </div>

              {/* Customer Source Selector */}
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.825rem", cursor: "pointer", fontWeight: 600, color: formData.customerSource === "INDIVIDUAL" ? "#065f46" : "#64748b" }}>
                  <input
                    type="radio"
                    name="customerSource"
                    value="INDIVIDUAL"
                    checked={formData.customerSource === "INDIVIDUAL"}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customerSource: e.target.value }))}
                  />
                  <User size={15} /> Individual Customer
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.825rem", cursor: "pointer", fontWeight: 600, color: formData.customerSource === "COMPANY" ? "#065f46" : "#64748b" }}>
                  <input
                    type="radio"
                    name="customerSource"
                    value="COMPANY"
                    checked={formData.customerSource === "COMPANY"}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customerSource: e.target.value }))}
                  />
                  <Building2 size={15} /> Company / Business
                </label>
              </div>

              {/* Form Inputs Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label jf-label-required" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Full Name</span>
                    {matchInfo?.matchType === "Name" && (
                      <span style={{ color: "#dc2626", fontSize: "0.725rem", fontWeight: 700 }}>⚠️ Name Already Registered</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter customer name"
                    className="jf-input"
                    style={{
                      border: matchInfo?.matchType === "Name" ? "1.5px solid #ef4444" : undefined,
                      backgroundColor: matchInfo?.matchType === "Name" ? "#fef2f2" : undefined,
                    }}
                    required
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label jf-label-required" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Phone / Mobile</span>
                    {matchInfo?.matchType === "Phone" && (
                      <span style={{ color: "#dc2626", fontSize: "0.725rem", fontWeight: 700 }}>⚠️ Phone Already Registered</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    className="jf-input"
                    style={{
                      border: matchInfo?.matchType === "Phone" ? "1.5px solid #ef4444" : undefined,
                      backgroundColor: matchInfo?.matchType === "Phone" ? "#fef2f2" : undefined,
                    }}
                    required
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Email ID</span>
                    {matchInfo?.matchType === "Email" && (
                      <span style={{ color: "#dc2626", fontSize: "0.725rem", fontWeight: 700 }}>⚠️ Email Already Registered</span>
                    )}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="customer@example.com"
                    className="jf-input"
                    style={{
                      border: matchInfo?.matchType === "Email" ? "1.5px solid #ef4444" : undefined,
                      backgroundColor: matchInfo?.matchType === "Email" ? "#fef2f2" : undefined,
                    }}
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Optional business name"
                    className="jf-input"
                  />
                </div>
                <div className="jf-form-group" style={{ gridColumn: "span 2" }}>
                  <label className="jf-label">Tax ID / GSTIN (optional)</label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    className="jf-input"
                  />
                </div>
              </div>

              {/* Informative Callout: Print Request happens during Job Order shift */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  padding: "0.85rem 1rem",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  fontSize: "0.8125rem",
                  color: "#475569",
                }}
              >
                <FileText size={18} style={{ color: "#059669", flexShrink: 0 }} />
                <div>
                  <strong>Print Request Notice:</strong> Specific print products, quantities, paper specs, and artwork will be entered when shifting this staged enquiry into an active <strong>Job Order</strong> from the dashboard.
                </div>
              </div>

              <button
                type="submit"
                className={`jf-btn ${matchInfo ? "jf-btn-secondary" : "jf-btn-primary"}`}
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  backgroundColor: matchInfo ? "#f1f5f9" : undefined,
                  color: matchInfo ? "#94a3b8" : undefined,
                  borderColor: matchInfo ? "#cbd5e1" : undefined,
                  cursor: matchInfo ? "not-allowed" : "pointer",
                }}
                disabled={loading || Boolean(matchInfo)}
                title={matchInfo ? "Customer already exists. Registration is not allowed." : "Register Customer"}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Registering...
                  </>
                ) : matchInfo ? (
                  "Customer Already Registered — Not Allowed to Register"
                ) : (
                  "Register Customer"
                )}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <CheckCircle size={56} style={{ color: "#10b981", margin: "0 auto 1rem" }} />
              <h2 style={{ fontSize: "1.45rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#0f172a" }}>
                {matchInfo ? "Customer Profile Linked & Enquiry Staged!" : "Customer Registered & Enquiry Staged!"}
              </h2>
              <p style={{ color: "#64748b", margin: "0 0 1.5rem 0", fontSize: "0.875rem" }}>
                Customer <strong>{formData.name}</strong> has been {matchInfo ? "verified and linked" : "registered"} in the central system. Enquiry request has been queued in <code>customerRequests</code>.
              </p>

              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.25rem", textAlign: "left", maxWidth: "440px", margin: "0 auto 1.5rem auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#64748b" }}>Customer Code:</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>
                    {submissionResult?.customer?.customerCode || submissionResult?.customerCode || "CUST-RECORD"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#64748b" }}>Customer Name:</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{formData.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#64748b" }}>Phone / Mobile:</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{formData.phone}</span>
                </div>
                {formData.email && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#64748b" }}>Email ID:</span>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{formData.email}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#64748b" }}>Enquiry Staged Ref:</span>
                  <span style={{ fontWeight: 700, color: "#059669" }}>
                    {submissionResult?.requestNo || "REQ-STAGED"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#64748b" }}>Status:</span>
                  <span style={{ fontWeight: 700, color: "#d97706", backgroundColor: "#fef3c7", padding: "2px 8px", borderRadius: "4px" }}>
                    PENDING
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#64748b" }}>Branch:</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{formData.branchName}</span>
                </div>
              </div>

              <div style={{ backgroundColor: "#f0fdf4", border: "1px dashed #86efac", borderRadius: "8px", padding: "0.75rem 1rem", maxWidth: "440px", margin: "0 auto 1.5rem auto", fontSize: "0.775rem", color: "#166534", textAlign: "left" }}>
                ℹ️ <strong>Next Step:</strong> Shift this enquiry to a <strong>Job Order</strong> via the dashboard to configure specific print requirements, finishing options, and artwork files.
              </div>

              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={() => {
                  setSubmitted(false);
                  setFormData((prev) => ({
                    ...prev,
                    name: "",
                    phone: "",
                    email: "",
                    companyName: "",
                    gstin: "",
                  }));
                  setExistingCustomer(null);
                  setMatchInfo(null);
                }}
              >
                Register Another Customer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchQrCustomerForm;
