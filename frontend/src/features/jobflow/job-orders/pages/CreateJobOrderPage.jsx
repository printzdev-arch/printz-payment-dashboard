import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  Save,
  CheckCircle,
  Plus,
  Trash2,
  Upload,
  FileText,
  Sparkles,
  Search,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import CustomerModal from "../../customers/components/CustomerModal";
import JobTypeBadge from "../../shared/components/JobTypeBadge";
import { useMasterDefaults } from "../../master-settings";
import jobFlowApi from "../api/jobOrdersApi";
import { toast } from "react-toastify";

const getManagerBranch = () => {
  try {
    const userBranch = localStorage.getItem("userBranchName");
    if (userBranch && userBranch.trim()) return userBranch.trim();
    const userObj = JSON.parse(localStorage.getItem("user") || "{}");
    if (userObj.branch && userObj.branch.trim()) return userObj.branch.trim();
    if (userObj.branchName && userObj.branchName.trim()) return userObj.branchName.trim();
    const printzUser = JSON.parse(localStorage.getItem("printz_user") || "{}");
    if (printzUser.branch && printzUser.branch.trim()) return printzUser.branch.trim();
    if (printzUser.branchName && printzUser.branchName.trim()) return printzUser.branchName.trim();
  } catch (e) {}
  return "Main Branch";
};

export const CreateJobOrderPage = ({ isModal = false, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId");

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const isDesigner = (storedUser.role || "").toLowerCase() === "designer" || location.pathname.includes("designer-jobs");

  const managerBranch = getManagerBranch();
  const masterDefaults = useMasterDefaults();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);

  // Customer search & combobox state
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const customerDropdownRef = useRef(null);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live debounced customer search to ensure freshly created customers are always found
  useEffect(() => {
    if (!customerSearchTerm.trim() || customerSearchTerm.length < 2) return;
    const timer = setTimeout(() => {
      jobFlowApi.searchCustomers(customerSearchTerm)
        .then((res) => {
          const items = res?.data || (Array.isArray(res) ? res : []);
          if (Array.isArray(items) && items.length > 0) {
            setCustomers((prev) => {
              const ids = new Set(prev.map((c) => c._id || c.id));
              const fresh = items.filter((it) => !ids.has(it._id || it.id));
              return [...prev, ...fresh];
            });
          }
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearchTerm]);

  // Form State
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    customerCode: "",
    customerPhone: "",
    customerEmail: "",
    branchName: managerBranch || "Main Branch",
    jobType: "",
    jobTitle: "",
    targetDueDate: "",
    deliveryMethod: "",
    referenceNo: "",
    remarks: "",

    productType: "",
    quantity: "",
    paperType: "",
    paperGsm: "",
    size: "",
    color: "",
    printingSide: "",
    lamination: "",
    finishing: "",
    proofRequirement: "",

    finishingServices: [],
    additionalServices: [],

    uploadedFiles: [],
    specialInstructions: "",
  });

  const selectCustomer = (cust) => {
    setFormData((prev) => ({
      ...prev,
      customerId: cust._id || cust.id,
      customerName: cust.name || cust.companyName || "",
      customerCode: cust.customerCode || cust.code || "",
      customerPhone: cust.phone || cust.mobile || "",
      customerEmail: cust.email || "",
      branchName: prev.branchName || managerBranch || "Main Branch",
    }));
    setCustomerSearchTerm(`${cust.customerCode || cust.code || ""} - ${cust.name || cust.companyName || ""}`.replace(/^ - /, ""));
    setIsCustomerDropdownOpen(false);
  };

  useEffect(() => {
    if (preselectedCustomerId) {
      jobFlowApi.getCustomerById(preselectedCustomerId)
        .then((res) => {
          const cust = res?.data || res;
          if (cust && (cust._id || cust.id)) {
            setCustomers((prev) => {
              const exists = prev.some((c) => (c._id || c.id) === (cust._id || cust.id));
              return exists ? prev : [cust, ...prev];
            });
            selectCustomer(cust);
          }
        })
        .catch(() => {});
    }

    jobFlowApi.getCustomers({ limit: 50 })
      .then((res) => {
        const list = res?.data?.items || res?.data || [];
        if (Array.isArray(list)) {
          setCustomers((prev) => {
            const existingIds = new Set(prev.map((c) => c._id || c.id));
            const fresh = list.filter((c) => !existingIds.has(c._id || c.id));
            return [...prev, ...fresh];
          });
          if (preselectedCustomerId) {
            const match = list.find((c) => (c._id || c.id) === preselectedCustomerId);
            if (match) selectCustomer(match);
          }
        }
      })
      .catch(() => {});

    jobFlowApi.getBranches()
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) setBranches(res.data);
      })
      .catch(() => {});
  }, [preselectedCustomerId]);

  const selectedLabel = formData.customerId ? `${formData.customerCode} - ${formData.customerName}` : "";
  const isInputShowingSelectedLabel = Boolean(selectedLabel && customerSearchTerm.trim().toLowerCase() === selectedLabel.trim().toLowerCase());

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearchTerm.trim() || isInputShowingSelectedLabel) return true;
    const term = customerSearchTerm.toLowerCase().trim();
    const name = (c.name || c.companyName || "").toLowerCase();
    const code = (c.customerCode || c.code || "").toLowerCase();
    const phone = (c.phone || c.mobile || "").toLowerCase();
    const email = (c.email || "").toLowerCase();
    return name.includes(term) || code.includes(term) || phone.includes(term) || email.includes(term);
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addQuickFinishing = (name, defaultPrice = 0.50, unit = "sheets") => {
    const existing = formData.finishingServices.find((s) => s.name === name);
    if (existing) {
      toast.info(`${name} is already in the list.`);
      return;
    }
    const newService = {
      id: Date.now(),
      name,
      config: "Standard",
      unitPrice: defaultPrice,
      quantity: formData.quantity || 500,
      total: (formData.quantity || 500) * defaultPrice,
      unit,
    };
    setFormData((prev) => ({
      ...prev,
      finishingServices: [...prev.finishingServices, newService],
    }));
    toast.success(`Added ${name}`);
  };

  const removeFinishingService = (id) => {
    setFormData((prev) => ({
      ...prev,
      finishingServices: prev.finishingServices.filter((s) => s.id !== id),
    }));
  };

  const finishingTotal = formData.finishingServices.reduce(
    (sum, s) => sum + (Number(s.total) || (Number(s.quantity || 0) * Number(s.unitPrice || 0))),
    0
  );

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newEntries = files.map((f) => ({
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      type: "Artwork File",
    }));

    setFormData((prev) => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...newEntries],
    }));
    toast.success(`${files.length} file(s) attached.`);
  };

  const removeFile = (idx) => {
    setFormData((prev) => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmitJob = async (isDraft = false) => {
    if (!formData.customerId && !formData.customerName) {
      toast.error("Please select or specify a customer.");
      return;
    }

    setLoading(true);
    try {
      let selectedBranchId = formData.branchId;
      if (!selectedBranchId || !/^[0-9a-fA-F]{24}$/.test(selectedBranchId)) {
        try {
          const userObj = JSON.parse(localStorage.getItem("user") || "{}");
          selectedBranchId = userObj.branchId || (userObj.branchIds && userObj.branchIds[0]);
        } catch (_) {}
      }
      if (!selectedBranchId || !/^[0-9a-fA-F]{24}$/.test(selectedBranchId)) {
        const mgrBranch = getManagerBranch();
        const matched = branches.find(
          (b) =>
            (b.name && b.name.toLowerCase().includes((formData.branchName || mgrBranch).toLowerCase())) ||
            (b.branchName && b.branchName.toLowerCase().includes((formData.branchName || mgrBranch).toLowerCase()))
        );
        if (matched) selectedBranchId = matched._id || matched.id;
      }
      if (!selectedBranchId && branches.length > 0) {
        selectedBranchId = branches[0]?._id || branches[0]?.id;
      }

      const payload = {
        branchId: selectedBranchId || undefined,
        customerId: formData.customerId || undefined,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        branchName: formData.branchName,
        jobType: formData.jobType || "Print Only",
        title: formData.jobTitle || "Custom Print Order",
        dueDate: formData.targetDueDate,
        deliveryMethod: formData.deliveryMethod,
        referenceNo: formData.referenceNo,
        notes: formData.remarks,
        specialInstructions: formData.specialInstructions,
        status: isDraft ? "DRAFT" : "SUBMITTED",
        items: [
          {
            itemName: formData.jobTitle || "Custom Print Order",
            quantity: Number(formData.quantity) || 1,
            unitPrice: 0,
            specifications: {
              productType: formData.productType,
              paperType: formData.paperType,
              paperGsm: formData.paperGsm,
              size: formData.size,
              color: formData.color,
              printingSide: formData.printingSide,
              lamination: formData.lamination,
              finishing: formData.finishing,
            },
            finishing: (formData.finishingServices || []).map((s, idx) => ({
              code: (s.code || s.name || "FINISHING").toUpperCase().replace(/\s+/g, "_"),
              name: s.name,
              config: s.config || "Standard",
              quantity: Number(s.quantity) || Number(formData.quantity) || 500,
              unitPrice: Number(s.unitPrice) || 0,
              sequence: idx + 1,
              notes: s.notes || "",
            })),
            needsProduction: true,
          },
        ],
        specs: {
          jobType: formData.jobType || "Print Only",
          productType: formData.productType,
          quantity: Number(formData.quantity),
          paperType: formData.paperType,
          paperGsm: formData.paperGsm,
          size: formData.size,
          color: formData.color,
          printingSide: formData.printingSide,
          lamination: formData.lamination,
          finishing: formData.finishing,
        },
        finishingServices: formData.finishingServices,
        additionalServices: formData.additionalServices,
        attachments: formData.uploadedFiles,
      };

      const res = await jobFlowApi.createJobOrder(payload);
      toast.success(isDraft ? "Job saved as draft." : "Job Order created successfully!");
      const newId = res?.data?._id || res?.data?.id || (res?.data && typeof res.data === "string" ? res.data : "");
      if (newId) {
        try {
          localStorage.setItem("printz_active_job_id", newId);
        } catch (_) {}
      }
      if (isDraft) {
        navigate(`/jobflow/jobs${newId ? `?id=${newId}` : ""}`);
      } else {
        if (newId) {
          try {
            const qty = Number(formData.quantity) || 500;
            const baseRate = 0.40;
            const estimateItems = [
              {
                lineNo: 1,
                itemName: formData.jobTitle || `${formData.productType || "Print Job"} - ${qty} pcs`,
                description: `${formData.paperType || "Standard"} ${formData.paperGsm || ""} (${formData.size || "Standard"})`,
                unitRate: baseRate,
                unitPrice: baseRate,
                quantity: qty,
                unit: "PCS",
                taxRate: 8,
              },
              ...(formData.finishingServices || []).map((svc, idx) => ({
                lineNo: idx + 2,
                itemName: `Finishing: ${svc.name}`,
                description: `${svc.config || "Standard"} (${svc.quantity || qty} ${svc.unit || "sheets"})`,
                unitRate: Number(svc.unitPrice) || 0,
                unitPrice: Number(svc.unitPrice) || 0,
                quantity: Number(svc.quantity) || qty,
                unit: (svc.unit || "PCS").toUpperCase(),
                taxRate: 8,
              })),
            ];
            await jobFlowApi.submitEstimate(newId, {
              items: estimateItems,
              finishingServices: formData.finishingServices || [],
              discountAmount: 0,
            });
          } catch (e) {
            console.warn("Auto submit estimate:", e);
          }
        }
        if (onSuccess) {
          toast.success(isDesigner ? "Designer Job Order created successfully!" : "Job order created successfully!");
          onSuccess(res?.data || res);
          return;
        }
        if (isDesigner) {
          toast.success("Designer Job Order created successfully!");
          navigate(`/jobflow/designer-jobs?id=${newId || ""}`);
        } else {
          navigate(`/jobflow/estimates?jobId=${newId || ""}&new=true`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create job order");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(isDesigner ? "/jobflow/designer-jobs" : "/jobflow/jobs");
    }
  };

  const formBody = (
    <>
      <div className="jf-create-job-grid">
        {/* ========================================================================= */}
        {/* CARD 1: Basic Details (Row 1, Column 1)                                   */}
        {/* ========================================================================= */}
        <div className="jf-card">
          <div className="jf-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="jf-card-title">Basic Details</h3>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setIsCustomerModalOpen(true);
              }}
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#059669",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                padding: "4px 10px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.15s ease",
              }}
            >
              <Plus size={14} /> Create Customer
            </button>
          </div>

          <div className="jf-card-body-stretch">
            <div className="jf-form-grid-2col">
              {/* Row 1: Customer (Spans 2 columns) */}
              <div className="jf-form-group" style={{ gridColumn: "1 / -1", position: "relative" }} ref={customerDropdownRef}>
                <label
                  className="jf-label jf-label-required"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span>Customer</span>
                  {formData.customerId && (
                    <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>
                      ✓ Selected: {formData.customerCode}
                    </span>
                  )}
                </label>
                <div style={{ position: "relative" }}>
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#475569",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type="text"
                    className="jf-input"
                    style={{ paddingLeft: "2.25rem", paddingRight: "4rem" }}
                    placeholder="Search customer by name, code or phone..."
                    value={customerSearchTerm}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: "0.5rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    {customerSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearchTerm("");
                          setFormData((prev) => ({
                            ...prev,
                            customerId: "",
                            customerName: "",
                            customerCode: "",
                            customerPhone: "",
                            customerEmail: "",
                          }));
                          setIsCustomerDropdownOpen(true);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#475569",
                          cursor: "pointer",
                          padding: "2px",
                          display: "flex",
                        }}
                        title="Clear customer search"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#475569",
                        cursor: "pointer",
                        padding: "2px",
                        display: "flex",
                      }}
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>

                {/* Autocomplete Dropdown */}
                {isCustomerDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: "4px",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.5rem",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                      zIndex: 100,
                      maxHeight: "260px",
                      overflowY: "auto",
                    }}
                  >
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => {
                        const isSelected = (c._id || c.id) === formData.customerId;
                        return (
                          <div
                            key={c._id || c.id}
                            onClick={() => selectCustomer(c)}
                            style={{
                              padding: "0.625rem 0.875rem",
                              cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9",
                              background: isSelected ? "#ecfdf5" : "transparent",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "#f8fafc";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    background: "#e2e8f0",
                                    color: "#1e293b",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  {c.customerCode || c.code || "CUST"}
                                </span>
                                <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>
                                  {c.name || c.companyName}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "2px" }}>
                                📞 {c.phone || c.mobile || "N/A"} • ✉️ {c.email || "N/A"}
                              </div>
                            </div>
                            {isSelected && <Check size={16} color="#059669" />}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: "1rem", textAlign: "center", color: "#475569", fontSize: "0.875rem" }}>
                        No customers found matching "{customerSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Row 2: Branch & Job Type */}
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Branch</label>
                <select
                  className="jf-select"
                  value={formData.branchName}
                  onChange={(e) => {
                    const bName = e.target.value;
                    const matched = branches.find((b) => (b.branchName || b.name) === bName);
                    setFormData((prev) => ({
                      ...prev,
                      branchName: bName,
                      branchId: matched?._id || matched?.id || prev.branchId,
                    }));
                  }}
                >
                  {branches.length === 0 && (
                    <option value={managerBranch}>{managerBranch} (Your Branch)</option>
                  )}
                  {branches.map((b) => (
                    <option key={b._id || b.id} value={b.branchName || b.name}>
                      {b.branchName || b.name} ({b.code || b.branchCode || "BR"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="jf-form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="jf-label jf-label-required">Job Type</label>
                  {formData.jobType && <JobTypeBadge jobType={formData.jobType} size="sm" />}
                </div>
                <select
                  className="jf-select"
                  value={formData.jobType}
                  onChange={(e) => handleInputChange("jobType", e.target.value)}
                >
                  <option value="">Select Job Type</option>
                  <option value="Print & Design">Print & Design</option>
                  <option value="Print Only">Print Only (Artwork Provided)</option>
                  <option value="Design Only">Design Only</option>
                </select>
                {formData.jobType === "Print Only" && (
                  <div style={{ fontSize: "0.74rem", color: "#6b21a8", marginTop: "4px", background: "#f5f3ff", padding: "4px 8px", borderRadius: "6px", border: "1px solid #ddd6fe" }}>
                    ⚡ <strong>Print Only:</strong> Goes directly till Invoice with <strong>Full Amount payment</strong> (No Advance). Order winds up & completes directly after invoice (does not go to production).
                  </div>
                )}
                {formData.jobType === "Design Only" && (
                  <div style={{ fontSize: "0.74rem", color: "#1d4ed8", marginTop: "4px", background: "#eff6ff", padding: "4px 8px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                    🎨 <strong>Design Only:</strong> Goes till Design Sample Approval. Once sample is approved, order <strong>Closes & Completes</strong>.
                  </div>
                )}
                {formData.jobType === "Print & Design" && (
                  <div style={{ fontSize: "0.74rem", color: "#065f46", marginTop: "4px", background: "#ecfdf5", padding: "4px 8px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                    🔄 <strong>Print & Design:</strong> Full end-to-end pipeline (Estimation → Advance Invoice → Design → Sample Approval → Production → Delivery).
                  </div>
                )}
              </div>

              {/* Row 3: Job Title (Spans 2 columns) */}
              <div className="jf-form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="jf-label jf-label-required">Job Title</label>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="e.g. Business Cards - New Design"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                  required
                />
              </div>

              {/* Row 4: Target Due Date & Delivery Method */}
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Target Due Date</label>
                <input
                  type="date"
                  className="jf-input"
                  value={formData.targetDueDate}
                  onChange={(e) => handleInputChange("targetDueDate", e.target.value)}
                  required
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Delivery Method</label>
                <select
                  className="jf-select"
                  value={formData.deliveryMethod}
                  onChange={(e) => handleInputChange("deliveryMethod", e.target.value)}
                >
                  <option value="">Select Delivery Method</option>
                  {(masterDefaults.deliveryMethods.length > 0
                    ? masterDefaults.deliveryMethods
                    : [
                        { name: "Branch Counter Self-Pickup" },
                        { name: "Local Dispatch / Delivery" },
                        { name: "Express Courier Service" },
                      ]
                  ).map((dm) => (
                    <option key={dm.name} value={dm.name}>
                      {dm.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 5: Reference No & Remarks */}
              <div className="jf-form-group">
                <label className="jf-label">Reference No. (Optional)</label>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="e.g. PO-12345"
                  value={formData.referenceNo}
                  onChange={(e) => handleInputChange("referenceNo", e.target.value)}
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Remarks (Optional)</label>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="Any general order remarks..."
                  value={formData.remarks}
                  onChange={(e) => handleInputChange("remarks", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 2: Print Specifications (Row 1, Column 2)                             */}
        {/* ========================================================================= */}
        <div className="jf-card">
          <div className="jf-card-header">
            <h3 className="jf-card-title">Print Specifications</h3>
          </div>

          <div className="jf-card-body-stretch">
            <div className="jf-form-grid-2col">
              {/* Row 1: Product Type & Quantity */}
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Product Type</label>
                <select
                  className="jf-select"
                  value={formData.productType}
                  onChange={(e) => handleInputChange("productType", e.target.value)}
                >
                  <option value="">Select Product Type</option>
                  {(masterDefaults.productTypes.length > 0
                    ? masterDefaults.productTypes
                    : [{ name: "Business Cards" }, { name: "Flyers / Leaflets" }, { name: "Brochures" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Quantity</label>
                <input
                  type="number"
                  className="jf-input"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value === "" ? "" : Number(e.target.value))}
                  min="1"
                />
              </div>

              {/* Row 2: Paper Type & Paper GSM */}
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Paper Type</label>
                <select
                  className="jf-select"
                  value={formData.paperType}
                  onChange={(e) => handleInputChange("paperType", e.target.value)}
                >
                  <option value="">Select Paper Type</option>
                  {(masterDefaults.paperTypes.length > 0
                    ? masterDefaults.paperTypes
                    : [{ name: "Art Card" }, { name: "Art Paper" }, { name: "Simili Paper" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Paper GSM</label>
                <select
                  className="jf-select"
                  value={formData.paperGsm}
                  onChange={(e) => handleInputChange("paperGsm", e.target.value)}
                >
                  <option value="">Select Paper GSM</option>
                  {(masterDefaults.paperGsmList.length > 0
                    ? masterDefaults.paperGsmList
                    : [{ name: "260 gsm" }, { name: "310 gsm" }, { name: "157 gsm" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3: Size & Color */}
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Size</label>
                <select
                  className="jf-select"
                  value={formData.size}
                  onChange={(e) => handleInputChange("size", e.target.value)}
                >
                  <option value="">Select Size</option>
                  {(masterDefaults.sizes.length > 0
                    ? masterDefaults.sizes
                    : [{ name: "90 x 54 mm (Standard)" }, { name: "A4 (210 x 297 mm)" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Color</label>
                <select
                  className="jf-select"
                  value={formData.color}
                  onChange={(e) => handleInputChange("color", e.target.value)}
                >
                  <option value="">Select Color</option>
                  {(masterDefaults.colors.length > 0
                    ? masterDefaults.colors
                    : [{ name: "Full Color (CMYK)" }, { name: "Black & White (K-Only)" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 4: Printing Side & Lamination */}
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Printing Side</label>
                <select
                  className="jf-select"
                  value={formData.printingSide}
                  onChange={(e) => handleInputChange("printingSide", e.target.value)}
                >
                  <option value="">Select Printing Side</option>
                  {(masterDefaults.printingSides.length > 0
                    ? masterDefaults.printingSides
                    : [{ name: "Double Sided" }, { name: "Single Sided" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Lamination (If any)</label>
                <select
                  className="jf-select"
                  value={formData.lamination}
                  onChange={(e) => handleInputChange("lamination", e.target.value)}
                >
                  <option value="">None / Select Lamination</option>
                  {(masterDefaults.laminationTypes.length > 0
                    ? masterDefaults.laminationTypes
                    : [{ name: "Matte" }, { name: "Gloss" }, { name: "None" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 5: Finishing Effect & Proof Requirement */}
              <div className="jf-form-group">
                <label className="jf-label">Finishing Effect</label>
                <select
                  className="jf-select"
                  value={formData.finishing}
                  onChange={(e) => handleInputChange("finishing", e.target.value)}
                >
                  <option value="">None / Select Finishing</option>
                  {(masterDefaults.finishingEffects.length > 0
                    ? masterDefaults.finishingEffects
                    : [{ name: "None" }, { name: "Die-Cut Round Corners" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Proof Requirement</label>
                <select
                  className="jf-select"
                  value={formData.proofRequirement}
                  onChange={(e) => handleInputChange("proofRequirement", e.target.value)}
                >
                  <option value="">Select Proof Requirement</option>
                  {(masterDefaults.proofRequirements.length > 0
                    ? masterDefaults.proofRequirements
                    : [{ name: "Digital PDF Proof" }, { name: "Hardcopy Digital Proof" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 3: Add Finishing Services (Row 2, Column 1)                           */}
        {/* ========================================================================= */}
        <div className="jf-card">
          <div className="jf-card-header">
            <h3 className="jf-card-title">Add Finishing Services</h3>
          </div>

          <div className="jf-card-body-stretch">
            {/* Quick Add Chips */}
            <div style={{ marginBottom: "1rem" }}>
              <span className="jf-label">Quick Add (Common Services):</span>
              <div className="jf-chips-wrap">
                {(masterDefaults.finishingServicesList.length > 0
                  ? masterDefaults.finishingServicesList.map((s) => s.name)
                  : [
                      "Lamination",
                      "Cutting",
                      "Trimming",
                      "Binding",
                      "Folding",
                      "Creasing",
                      "Die Cutting",
                      "Foiling",
                      "UV Coating",
                      "Mounting",
                      "Perforation",
                      "Numbering",
                      "Packing",
                    ]
                ).map((svc) => (
                  <button
                    key={svc}
                    type="button"
                    className="jf-chip-btn"
                    onClick={() => addQuickFinishing(svc)}
                  >
                    + {svc}
                  </button>
                ))}
              </div>
            </div>

            {/* Finishing Services Table (Static 3 rows, scrollable for 4+ rows) */}
            <div className="jf-table-scroll-3rows" style={{ marginBottom: "1rem" }}>
              <table className="jf-table">
                <thead>
                  <tr>
                    <th style={{ width: "28px", padding: "0.5rem 0.5rem" }}>#</th>
                    <th style={{ padding: "0.5rem 0.5rem" }}>Finishing Service</th>
                    <th style={{ padding: "0.5rem 0.5rem" }}>Config</th>
                    <th style={{ padding: "0.5rem 0.5rem" }}>Price</th>
                    <th style={{ padding: "0.5rem 0.5rem" }}>Qty</th>
                    <th style={{ padding: "0.5rem 0.5rem" }}>Total</th>
                    <th style={{ padding: "0.5rem 0.5rem", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.finishingServices.map((svc, idx) => (
                    <tr key={svc.id}>
                      <td style={{ padding: "0.35rem 0.5rem" }}>{idx + 1}</td>
                      <td style={{ padding: "0.35rem 0.5rem", whiteSpace: "nowrap" }}><strong>{svc.name}</strong></td>
                      <td style={{ padding: "0.35rem 0.5rem" }}>
                        <select
                          className="jf-select"
                          style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem", height: "28px", width: "auto", minWidth: "105px" }}
                          value={svc.config}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              finishingServices: prev.finishingServices.map((s) => s.id === svc.id ? { ...s, config: val } : s),
                            }));
                          }}
                        >
                          <option value="Matte">Matte</option>
                          <option value="Gloss">Gloss</option>
                          <option value="Trim to 90 x 54 mm">Trim to 90 x 54 mm</option>
                          <option value="Spiral (Black)">Spiral (Black)</option>
                          <option value="Shrink Wrap">Shrink Wrap</option>
                        </select>
                      </td>
                      <td style={{ padding: "0.35rem 0.5rem", whiteSpace: "nowrap" }}>RM {svc.unitPrice.toFixed(2)}</td>
                      <td style={{ padding: "0.35rem 0.5rem" }}>{svc.quantity}</td>
                      <td style={{ padding: "0.35rem 0.5rem", whiteSpace: "nowrap" }}><strong>RM {svc.total.toFixed(2)}</strong></td>
                      <td style={{ padding: "0.35rem 0.5rem", textAlign: "right" }}>
                        <button
                          type="button"
                          className="jf-btn jf-btn-danger-outline jf-btn-sm"
                          style={{ padding: "2px 6px" }}
                          onClick={() => removeFinishingService(svc.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {formData.finishingServices.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "#475569", padding: "2rem" }}>
                        No finishing services added yet. Click a chip above to add.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Bar pinned to bottom */}
            <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
              <span style={{ fontWeight: 600, color: "#166534", fontSize: "0.875rem" }}>Estimated Finishing & Services Total:</span>
              <span style={{ fontSize: "1.125rem", fontWeight: 700, color: "#15803d" }}>RM {finishingTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 4: Upload Artwork & References (Row 2, Column 2)                      */}
        {/* ========================================================================= */}
        <div className="jf-card">
          <div className="jf-card-header">
            <h3 className="jf-card-title">Upload Artwork & References</h3>
          </div>

          <div className="jf-card-body-stretch">
            {/* Dropzone */}
            <label className="jf-dropzone" style={{ display: "block", marginBottom: "1rem", padding: "1.25rem 1rem" }}>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.ai,.psd"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <Upload size={28} style={{ color: "var(--jf-primary)", margin: "0 auto 0.5rem" }} />
              <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.875rem" }}>
                Drag and drop files here or <span style={{ color: "var(--jf-primary)", textDecoration: "underline" }}>click to upload</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "4px" }}>
                Supported formats: PDF, JPG, PNG, AI, PSD, CDR (Max 10MB)
              </div>
            </label>

            {/* Uploaded Files List */}
            {formData.uploadedFiles.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <h4 style={{ fontSize: "0.8125rem", margin: "0 0 0.5rem 0", color: "#0f172a", fontWeight: 600 }}>
                  Uploaded Files ({formData.uploadedFiles.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "140px", overflowY: "auto" }}>
                  {formData.uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0.75rem",
                        border: "1px solid var(--jf-border)",
                        borderRadius: "6px",
                        background: "#f8fafc",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FileText size={16} style={{ color: "#ef4444" }} />
                        <div>
                          <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{file.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#475569" }}>{file.size} • {file.type}</div>
                        </div>
                      </div>
                      <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" style={{ padding: "2px 6px" }} onClick={() => removeFile(idx)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special Instructions pinned to bottom */}
            <div className="jf-form-group" style={{ marginTop: "auto" }}>
              <label className="jf-label">Special Instructions (Optional)</label>
              <textarea
                className="jf-textarea"
                rows={3}
                value={formData.specialInstructions}
                onChange={(e) => handleInputChange("specialInstructions", e.target.value)}
                placeholder="Mention specific Pantone codes, packaging requirements or sample signoff instructions..."
                style={{ minHeight: "68px" }}
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 5: Preview Sample (Row 3, Column 1)                                   */}
        {/* ========================================================================= */}
        <div className="jf-card">
          <div className="jf-card-header">
            <h3 className="jf-card-title">Preview Sample</h3>
          </div>

          <div className="jf-card-body-stretch">
            <div
              style={{
                background: "linear-gradient(135deg, #064e3b 0%, #10b981 100%)",
                borderRadius: "8px",
                height: "155px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                textAlign: "center",
                padding: "1rem",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            >
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.5px" }}>PrintZ</div>
                <div style={{ fontSize: "0.8125rem", color: "#a7f3d0", marginTop: "4px" }}>Your Print Partner</div>
                <div style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "4px", marginTop: "10px", display: "inline-block" }}>
                  {(formData.productType || "New Print Order") + (formData.size ? ` • ${formData.size}` : "")}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
              <div style={{ background: "#f8fafc", padding: "0.875rem", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8125rem", color: "#475569", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                <div><strong>Specs:</strong> {[formData.paperGsm, formData.paperType].filter(Boolean).join(" ") || "-"}</div>
                <div><strong>Color:</strong> {formData.color ? `${formData.color}${formData.printingSide ? ` (${formData.printingSide})` : ""}` : "-"}</div>
                <div><strong>Lamination:</strong> {formData.lamination || "-"}</div>
                <div><strong>Quantity:</strong> {formData.quantity ? `${formData.quantity} pcs` : "-"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 6: Order Summary & Submission (Row 3, Column 2)                       */}
        {/* ========================================================================= */}
        <div className="jf-card" style={{ border: "1px solid #cbd5e1" }}>
          <div className="jf-card-header">
            <h3 className="jf-card-title">Order Summary & Submission</h3>
          </div>

          <div className="jf-card-body-stretch">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", fontSize: "0.8125rem", background: "#f8fafc", padding: "0.875rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div><span style={{ color: "#475569" }}>Customer:</span> <strong>{formData.customerName || "Not selected"}</strong></div>
              <div><span style={{ color: "#475569" }}>Branch:</span> {formData.branchName || "Main Branch"}</div>
              <div><span style={{ color: "#475569" }}>Job Title:</span> <strong>{formData.jobTitle || "Not specified"}</strong></div>
              <div><span style={{ color: "#475569" }}>Job Type:</span> {formData.jobType || "-"}</div>
              <div><span style={{ color: "#475569" }}>Specs:</span> {formData.quantity ? `${formData.quantity} pcs (${formData.productType || "Print"})` : "-"}</div>
              <div><span style={{ color: "#475569" }}>Due Date:</span> {formData.targetDueDate || "-"}</div>
              <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem", marginTop: "0.25rem", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#475569" }}>Finishing Total:</span>
                <strong style={{ color: "#15803d" }}>RM {finishingTotal.toFixed(2)}</strong>
              </div>
            </div>

            <div style={{ marginTop: "auto", paddingTop: "1rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end", alignItems: "center" }}>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={handleCancelClick}
              >
                Cancel
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={() => handleSubmitJob(false)}
                disabled={loading}
              >
                <CheckCircle size={16} /> {loading ? "Creating..." : (isDesigner ? "Create Designer Job" : "Create Job Order")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Registration Modal for Quick Customer Add */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSaved={(newCust) => {
          if (newCust) {
            setCustomers((prev) => [newCust, ...prev]);
            selectCustomer(newCust);
          }
        }}
      />
    </>
  );

  if (isModal) {
    return (
      <div className="jf-create-job-modal-wrapper" style={{ padding: 0 }}>
        {formBody}
      </div>
    );
  }

  return (
    <JobFlowLayout
      title={isDesigner ? "Create Designer Job Order" : "Create Job Order"}
      actions={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            onClick={handleCancelClick}
          >
            Cancel
          </button>
          <button
            type="button"
            className="jf-btn jf-btn-primary jf-btn-sm"
            onClick={() => handleSubmitJob(false)}
            disabled={loading}
          >
            <CheckCircle size={14} /> {loading ? "Creating..." : (isDesigner ? "Create Designer Job" : "Create Job Order")}
          </button>
        </div>
      }
    >
      {formBody}
    </JobFlowLayout>
  );
};

export default CreateJobOrderPage;
