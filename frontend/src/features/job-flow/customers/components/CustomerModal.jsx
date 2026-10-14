import React, { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import jobFlowApi from "../api/customersApi";
import { toast } from "react-toastify";

const DEFAULT_MANAGER_BRANCH_NAME = "Banaswadii";
const DEFAULT_MANAGER_BRANCH_ID = "489571a9af51836599708543";

const getActiveBranchInfo = () => {
  try {
    const userBranch = localStorage.getItem("userBranchName");
    const userObj = JSON.parse(localStorage.getItem("user") || "{}");
    const printzUser = JSON.parse(localStorage.getItem("printz_user") || "{}");
    const branchName =
      (userBranch && userBranch.trim()) ||
      (userObj.branch && userObj.branch.trim()) ||
      (userObj.branchName && userObj.branchName.trim()) ||
      (printzUser.branch && printzUser.branch.trim()) ||
      (printzUser.branchName && printzUser.branchName.trim()) ||
      DEFAULT_MANAGER_BRANCH_NAME;
    const branchId =
      userObj.branchId ||
      (userObj.branchIds && userObj.branchIds[0]) ||
      printzUser.branchId ||
      DEFAULT_MANAGER_BRANCH_ID;
    return { branchName: branchName || DEFAULT_MANAGER_BRANCH_NAME, branchId: branchId || DEFAULT_MANAGER_BRANCH_ID };
  } catch (e) {
    return { branchName: DEFAULT_MANAGER_BRANCH_NAME, branchId: DEFAULT_MANAGER_BRANCH_ID };
  }
};

const findManagerBranch = (bList, activeBranch) => {
  if (!bList || !bList.length) return null;

  // 1. Strict ID match
  if (activeBranch.branchId) {
    const idMatch = bList.find((b) => String(b._id || b.id) === String(activeBranch.branchId));
    if (idMatch) return idMatch;
  }

  // 2. Exact name match (case-insensitive)
  if (activeBranch.branchName) {
    const cleanActive = activeBranch.branchName.trim().toLowerCase();
    const exactNameMatch = bList.find(
      (b) => (b.name || b.branchName || "").trim().toLowerCase() === cleanActive
    );
    if (exactNameMatch) return exactNameMatch;

    // 3. b.name contains active branch (e.g. "PRINTZ SHOP BANASWADI" contains "banaswadi")
    const containsMatch = bList.find(
      (b) => (b.name || b.branchName || "").trim().toLowerCase().includes(cleanActive)
    );
    if (containsMatch) return containsMatch;

    // 4. active branch contains b.name ONLY IF b.name is at least 3 characters (avoids single letter "B")
    const reverseSubMatch = bList.find((b) => {
      const bn = (b.name || b.branchName || "").trim().toLowerCase();
      return bn.length >= 3 && cleanActive.includes(bn);
    });
    if (reverseSubMatch) return reverseSubMatch;
  }

  // 5. Look specifically for Banaswadi (manager default)
  const banaswadiMatch = bList.find((b) =>
    (b.name || b.branchName || "").toLowerCase().includes("banaswadi")
  );
  if (banaswadiMatch) return banaswadiMatch;

  return bList[0];
};

const normalizePhoneDigits = (phone) => {
  if (!phone) return "";
  let digits = String(phone).replace(/[^\d]/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits;
};

const getNextSequentialCustomerCode = (custList = []) => {
  let maxSeq = 142;
  if (Array.isArray(custList) && custList.length > 0) {
    custList.forEach((c) => {
      const code = c?.customerCode || c?.code || "";
      const match = String(code).match(/^(?:CUST|CUS)-0*(\d{1,4})$/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxSeq && val < 5000) {
          maxSeq = val;
        }
      }
    });
  }
  const nextVal = maxSeq + 1;
  return `CUST-${String(nextVal).padStart(5, "0")}`;
};

export const CustomerModal = ({ isOpen, onClose, customer, onSaved }) => {
  const activeBranch = getActiveBranchInfo();
  const [formData, setFormData] = useState({
    customerType: "Individual",
    name: "",
    customerCode: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postcode: "",
    country: "Malaysia",
    companyName: "",
    gstin: "",
    defaultBranch: activeBranch.branchName || DEFAULT_MANAGER_BRANCH_NAME,
    remarks: "",
  });

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(customer || null);
  const [matchedExistingCustomer, setMatchedExistingCustomer] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({
    name: null,
    phone: null,
    email: null,
  });

  const handleReuseProfile = (matched) => {
    if (!matched) return;
    setEditingCustomer(matched);
    setFormData({
      customerType: matched.customerType || (matched.type === "company" ? "Company" : "Individual"),
      name: matched.name || "",
      customerCode: matched.customerCode || matched.code || "",
      phone: normalizePhoneDigits(matched.phone || matched.mobile || "").slice(0, 10),
      email: matched.email || "",
      addressLine1: matched.address || "",
      addressLine2: "",
      city: "",
      state: "",
      postcode: "",
      country: "Malaysia",
      companyName: matched.companyName || matched.company || "",
      gstin: matched.gstin || "",
      defaultBranch: activeBranch.branchName || DEFAULT_MANAGER_BRANCH_NAME,
      remarks: matched.remarks || "",
    });
    setFieldErrors({ name: null, phone: null, email: null });
    setMatchedExistingCustomer(null);
    toast.info(`Reusing existing profile for ${matched.name} (${matched.customerCode}). Fill missing details and save.`);
  };

  // Duplicate check for Name
  const checkDuplicateName = (nameVal, custList = existingCustomers) => {
    const trimmed = (nameVal || "").trim().toLowerCase();
    if (!trimmed) {
      setFieldErrors((prev) => ({ ...prev, name: null }));
      return null;
    }
    const currentCustId = customer?._id || customer?.id;
    const match = custList.find((c) => {
      if (currentCustId && String(c._id || c.id) === String(currentCustId)) return false;
      return (c.name || "").trim().toLowerCase() === trimmed;
    });

    if (match) {
      const msg = `Customer with name '${nameVal.trim()}' already exists. Please give a different name.`;
      setFieldErrors((prev) => ({ ...prev, name: msg }));
      toast.warning(msg, { toastId: `dup-name-${trimmed}` });
      return match;
    } else {
      setFieldErrors((prev) => ({ ...prev, name: null }));
      return null;
    }
  };

  // Duplicate check for Phone Number
  const checkDuplicatePhone = (phoneVal, custList = existingCustomers) => {
    const raw = String(phoneVal || "").replace(/\D/g, "");
    if (!raw) {
      setFieldErrors((prev) => ({ ...prev, phone: null }));
      return null;
    }
    if (raw.length !== 10) {
      const msg = "Phone number must be exactly 10 digits.";
      setFieldErrors((prev) => ({ ...prev, phone: msg }));
      return { error: msg };
    }
    const currentCustId = customer?._id || customer?.id;

    const match = custList.find((c) => {
      if (currentCustId && String(c._id || c.id) === String(currentCustId)) return false;
      const cMobile = (c.mobile || c.phone || "").trim();
      if (!cMobile) return false;
      const cDigits = normalizePhoneDigits(cMobile);
      return cDigits === raw;
    });

    if (match) {
      setMatchedExistingCustomer(match);
      setFieldErrors((prev) => ({ ...prev, phone: null }));
      return match;
    } else {
      if (matchedExistingCustomer && matchedExistingCustomer.phone === raw) {
        setMatchedExistingCustomer(null);
      }
      setFieldErrors((prev) => ({ ...prev, phone: null }));
      return null;
    }
  };

  // Duplicate check for Email ID
  const checkDuplicateEmail = (emailVal, custList = existingCustomers) => {
    const trimmed = (emailVal || "").trim().toLowerCase();
    if (!trimmed) {
      setFieldErrors((prev) => ({ ...prev, email: null }));
      return null;
    }
    const currentCustId = customer?._id || customer?.id;
    const match = custList.find((c) => {
      if (currentCustId && String(c._id || c.id) === String(currentCustId)) return false;
      return (c.email || "").trim().toLowerCase() === trimmed;
    });

    if (match) {
      const msg = `Customer with email '${emailVal.trim()}' already exists. Please give a different email.`;
      setFieldErrors((prev) => ({ ...prev, email: msg }));
      toast.warning(msg, { toastId: `dup-email-${trimmed}` });
      return match;
    } else {
      setFieldErrors((prev) => ({ ...prev, email: null }));
      return null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFieldErrors({ name: null, phone: null, email: null });

      if (customer) {
        setFormData({
          customerType: customer.customerType || (customer.type === "company" ? "Company" : "Individual"),
          name: customer.name || "",
          customerCode: customer.customerCode || customer.code || "",
          phone: normalizePhoneDigits(customer.phone || customer.mobile || "").slice(0, 10),
          email: customer.email || "",
          addressLine1: customer.address?.line1 || customer.addressLine1 || "",
          addressLine2: customer.address?.line2 || customer.addressLine2 || "",
          city: customer.address?.city || customer.city || "",
          state: customer.address?.state || customer.state || "",
          postcode: customer.address?.postcode || customer.postcode || "",
          country: customer.address?.country || customer.country || "Malaysia",
          companyName: customer.companyName || (customer.type === "company" ? customer.name : ""),
          gstin: customer.gstin || customer.taxNo || "",
          defaultBranch: customer.defaultBranch || customer.branchId?.name || customer.branchName || activeBranch.branchName || DEFAULT_MANAGER_BRANCH_NAME,
          remarks: customer.remarks || "",
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          customerCode: getNextSequentialCustomerCode(existingCustomers),
        }));
      }

      // Fetch customer list for instant duplicate checks & sequential customerCode
      jobFlowApi.getCustomers({ limit: 100 })
        .then((res) => {
          const list = res?.data || (Array.isArray(res) ? res : []);
          setExistingCustomers(list);
          if (!customer) {
            setFormData((prev) => ({
              ...prev,
              customerCode: getNextSequentialCustomerCode(list),
            }));
          }
        })
        .catch(() => {});

      // Fetch branches dynamically and default to manager's branch
      jobFlowApi.getBranches()
        .then((res) => {
          const bList = res?.data || res?.items || (Array.isArray(res) ? res : []);
          if (Array.isArray(bList) && bList.length > 0) {
            setBranches(bList);
            if (!customer) {
              const mgrBranch = findManagerBranch(bList, activeBranch);
              if (mgrBranch) {
                setFormData((prev) => ({
                  ...prev,
                  defaultBranch: mgrBranch.name || mgrBranch.branchName || DEFAULT_MANAGER_BRANCH_NAME,
                }));
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: digitsOnly }));
      if (fieldErrors.phone) {
        setFieldErrors((prev) => ({ ...prev, phone: null }));
      }
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    const phoneDigits = String(formData.phone || "").replace(/\D/g, "");
    if (!phoneDigits) {
      toast.error("Phone number is required");
      setFieldErrors((prev) => ({ ...prev, phone: "Phone number is required" }));
      return;
    }
    if (phoneDigits.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      setFieldErrors((prev) => ({ ...prev, phone: "Phone number must be exactly 10 digits" }));
      return;
    }

    const activeTarget = editingCustomer || matchedExistingCustomer || customer;

    // 1. Check duplicate Name (only if not updating an existing profile)
    if (!activeTarget) {
      const dupName = checkDuplicateName(formData.name);
      if (dupName) {
        toast.error(`Customer with name '${formData.name.trim()}' already exists. Please give a different name.`);
        return;
      }

      // 2. Check duplicate Phone Number
      const dupPhone = checkDuplicatePhone(phoneDigits);
      if (dupPhone && !dupPhone.customerCode) {
        toast.error(`Customer with phone number '${phoneDigits}' already exists. Please give a different phone number.`);
        return;
      }

      // 3. Check duplicate Email
      if (formData.email && formData.email.trim()) {
        const dupEmail = checkDuplicateEmail(formData.email);
        if (dupEmail && !dupEmail.customerCode) {
          toast.error(`Customer with email '${formData.email.trim()}' already exists. Please give a different email.`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const backendCustomerType = formData.customerType === "Company" ? "B2B" : "REGULAR";
      const formattedAddress = [
        formData.addressLine1,
        formData.addressLine2,
        formData.city,
        formData.state,
        formData.postcode,
        formData.country,
      ]
        .filter(Boolean)
        .join(", ");

      const activeInfo = getActiveBranchInfo();
      let matchedBranch = branches.find(
        (b) =>
          (b._id || b.id) === formData.defaultBranch ||
          (b.name && b.name.toLowerCase() === (formData.defaultBranch || "").toLowerCase()) ||
          (b.branchName && b.branchName.toLowerCase() === (formData.defaultBranch || "").toLowerCase())
      );

      if (!matchedBranch) {
        matchedBranch = findManagerBranch(branches, activeInfo);
      }

      let branchId =
        matchedBranch?._id ||
        matchedBranch?.id ||
        activeInfo.branchId ||
        DEFAULT_MANAGER_BRANCH_ID;

      const payload = {
        name: formData.name.trim(),
        customerCode: (formData.customerCode || "").trim().toUpperCase() || undefined,
        mobile: formData.phone.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || undefined,
        customerType: customer?.customerType || (customer?.source === "QR_CODE" ? "QR" : "WALK_IN"),
        customerSource: formData.customerType === "Company" ? "COMPANY" : "INDIVIDUAL",
        type: formData.customerType.toLowerCase(),
        company: formData.customerType === "Company" ? (formData.companyName || formData.name).trim() : undefined,
        companyName: formData.customerType === "Company" ? (formData.companyName || formData.name).trim() : undefined,
        gstin: formData.gstin?.trim() || undefined,
        address: formattedAddress || undefined,
        branchId: branchId,
        remarks: formData.remarks?.trim() || undefined,
      };

      let savedResult;
      const targetId = activeTarget?._id || activeTarget?.id;
      if (targetId) {
        savedResult = await jobFlowApi.updateCustomer(targetId, payload);
        toast.success(`Customer profile updated successfully (Reused ${payload.name} - ${activeTarget.customerCode || "CUST"})`);
      } else {
        savedResult = await jobFlowApi.createCustomer(payload);
        const newCust = savedResult?.data || savedResult;
        toast.success(
          `Customer ${newCust?.name || payload.name} (${newCust?.customerCode || payload.customerCode || ""}) registered successfully`
        );
      }

      const savedCust = savedResult?.data || savedResult;
      if (onSaved) onSaved(savedCust, !customer);
      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to save customer";
      toast.error(errMsg);
      // Map backend duplicate error message directly to the corresponding field error banner
      if (errMsg.toLowerCase().includes("name")) {
        setFieldErrors((prev) => ({ ...prev, name: errMsg }));
      } else if (errMsg.toLowerCase().includes("phone") || errMsg.toLowerCase().includes("mobile")) {
        setFieldErrors((prev) => ({ ...prev, phone: errMsg }));
      } else if (errMsg.toLowerCase().includes("email")) {
        setFieldErrors((prev) => ({ ...prev, email: errMsg }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-lg" style={{ maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="jf-modal-header">
          <div>
            <h2 className="jf-modal-title">
              {editingCustomer || customer ? "Edit / Reuse Customer Profile" : "Register Customer Information"}
            </h2>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Staff Assisted Intake • Central Customer Master Search
            </div>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <div className="jf-modal-body" style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "1.5rem" }}>
            {/* Flowchart YES Branch: Existing Customer Found Alert & One-Click Reuse */}
            {matchedExistingCustomer && !editingCustomer && (
              <div style={{ backgroundColor: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#065f46", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span>✔</span> Customer Exists in Central Master!
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#047857" }}>
                    Found profile for <strong>{matchedExistingCustomer.name}</strong> ({matchedExistingCustomer.customerCode || "CUST"}) with phone {matchedExistingCustomer.mobile || matchedExistingCustomer.phone}.
                  </div>
                </div>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary jf-btn-sm"
                  style={{ whiteSpace: "nowrap" }}
                  onClick={() => handleReuseProfile(matchedExistingCustomer)}
                >
                  Reuse Profile & Fill Missing Details
                </button>
              </div>
            )}

            {editingCustomer && (
              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.5rem 0.75rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "0.8125rem", color: "#1e40af" }}>
                  Reusing profile for <strong>{editingCustomer.name}</strong> ({editingCustomer.customerCode}). Filling missing details will update this centralized record.
                </div>
                {!customer && (
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    onClick={() => {
                      setEditingCustomer(null);
                      setFormData((prev) => ({ ...prev, name: "", phone: "", email: "", customerCode: getNextSequentialCustomerCode(existingCustomers) }));
                    }}
                  >
                    Clear & Create New
                  </button>
                )}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
              {/* Basic Information */}
              <div className="jf-card" style={{ marginBottom: 0, display: "flex", flexDirection: "column" }}>
                <h3 className="jf-card-title" style={{ fontSize: "0.95rem", marginBottom: "1.25rem" }}>
                  Basic Information
                </h3>

                <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="jf-label">Customer Type</label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      background: "#f1f5f9",
                      padding: "4px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, customerType: "Individual" }))}
                      style={{
                        padding: "7px 0",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        fontWeight: formData.customerType === "Individual" ? 600 : 500,
                        background: formData.customerType === "Individual" ? "#ffffff" : "transparent",
                        color: formData.customerType === "Individual" ? "#2563eb" : "#64748b",
                        boxShadow: formData.customerType === "Individual" ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" : "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, customerType: "Company" }))}
                      style={{
                        padding: "7px 0",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        fontWeight: formData.customerType === "Company" ? 600 : 500,
                        background: formData.customerType === "Company" ? "#ffffff" : "transparent",
                        color: formData.customerType === "Company" ? "#2563eb" : "#64748b",
                        boxShadow: formData.customerType === "Company" ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" : "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      Company
                    </button>
                  </div>
                </div>

                <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="jf-label jf-label-required">Customer Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={() => checkDuplicateName(formData.name)}
                    placeholder="e.g. John Tan"
                    className="jf-input"
                    style={{ borderColor: fieldErrors.name ? "#ef4444" : undefined, width: "100%", boxSizing: "border-box" }}
                    required
                  />
                  {fieldErrors.name && (
                    <div
                      style={{
                        marginTop: "0.4rem",
                        padding: "0.45rem 0.65rem",
                        borderRadius: "6px",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#b91c1c",
                        fontSize: "0.8rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        lineHeight: 1.4,
                      }}
                    >
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.name}</span>
                    </div>
                  )}
                </div>

                <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="jf-label">Customer Code</label>
                  <input
                    type="text"
                    name="customerCode"
                    value={formData.customerCode}
                    onChange={handleChange}
                    placeholder="e.g. CUST-00143"
                    className="jf-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </div>

                <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="jf-label jf-label-required">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={() => checkDuplicatePhone(formData.phone)}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    className="jf-input"
                    style={{ borderColor: fieldErrors.phone ? "#ef4444" : undefined, width: "100%", boxSizing: "border-box" }}
                    required
                  />
                  {fieldErrors.phone && (
                    <div
                      style={{
                        marginTop: "0.4rem",
                        padding: "0.45rem 0.65rem",
                        borderRadius: "6px",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#b91c1c",
                        fontSize: "0.8rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        lineHeight: 1.4,
                      }}
                    >
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.phone}</span>
                    </div>
                  )}
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => checkDuplicateEmail(formData.email)}
                    placeholder="john.tan@email.com"
                    className="jf-input"
                    style={{ borderColor: fieldErrors.email ? "#ef4444" : undefined, width: "100%", boxSizing: "border-box" }}
                  />
                  {fieldErrors.email && (
                    <div
                      style={{
                        marginTop: "0.4rem",
                        padding: "0.45rem 0.65rem",
                        borderRadius: "6px",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#b91c1c",
                        fontSize: "0.8rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        lineHeight: 1.4,
                      }}
                    >
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Address & Additional Information */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div className="jf-card" style={{ marginBottom: 0 }}>
                  <h3 className="jf-card-title" style={{ fontSize: "0.95rem", marginBottom: "1.25rem" }}>
                    Address Information
                  </h3>

                  <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                    <label className="jf-label">Address Line 1</label>
                    <input
                      type="text"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleChange}
                      placeholder="12, Jalan Sri Petaling"
                      className="jf-input"
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  </div>

                  <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                    <label className="jf-label">Address Line 2</label>
                    <input
                      type="text"
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleChange}
                      placeholder="Taman Sri Petaling"
                      className="jf-input"
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div className="jf-form-group" style={{ minWidth: 0 }}>
                      <label className="jf-label">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="Kuala Lumpur"
                        className="jf-input"
                        style={{ width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                    <div className="jf-form-group" style={{ minWidth: 0 }}>
                      <label className="jf-label">State</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="Wilayah Persekutuan"
                        className="jf-input"
                        style={{ width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="jf-form-group" style={{ minWidth: 0 }}>
                      <label className="jf-label">Postcode</label>
                      <input
                        type="text"
                        name="postcode"
                        value={formData.postcode}
                        onChange={handleChange}
                        placeholder="57000"
                        className="jf-input"
                        style={{ width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                    <div className="jf-form-group" style={{ minWidth: 0 }}>
                      <label className="jf-label">Country</label>
                      <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="jf-input"
                        style={{ width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                </div>

                <div className="jf-card" style={{ marginBottom: 0 }}>
                  <h3 className="jf-card-title" style={{ fontSize: "0.95rem", marginBottom: "1.25rem" }}>
                    Additional Information
                  </h3>

                  {formData.customerType === "Company" && (
                    <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                      <label className="jf-label">Company Name</label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="ABC Marketing Sdn Bhd"
                        className="jf-input"
                        style={{ width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                  )}

                  <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                    <label className="jf-label">GSTIN / Tax No</label>
                    <input
                      type="text"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleChange}
                      placeholder="123456789012"
                      className="jf-input"
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  </div>

                  <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                    <label className="jf-label">Default Branch</label>
                    <select
                      name="defaultBranch"
                      value={formData.defaultBranch}
                      onChange={handleChange}
                      className="jf-select"
                      style={{ width: "150px", boxSizing: "border-box" }}
                    >
                      {branches.length === 0 && (
                        <option value={formData.defaultBranch || DEFAULT_MANAGER_BRANCH_NAME}>
                          {formData.defaultBranch || DEFAULT_MANAGER_BRANCH_NAME}
                        </option>
                      )}
                      {branches.map((b) => (
                        <option key={b._id || b.id} value={b.name || b.branchName}>
                          {b.name || b.branchName} ({b.code || b.branchCode || "BR"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="jf-form-group">
                    <label className="jf-label">Remarks</label>
                    <input
                      type="text"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleChange}
                      placeholder="Preferred contact via WhatsApp"
                      className="jf-input"
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="jf-btn jf-btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;
