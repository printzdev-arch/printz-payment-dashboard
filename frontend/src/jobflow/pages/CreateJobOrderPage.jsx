import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  Upload,
  FileText,
  Eye,
  Download,
  Edit,
  Sparkles,
  Search,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import JobFlowLayout from "../components/JobFlowLayout";
import Stepper from "../components/Stepper";
import CustomerModal from "../components/CustomerModal";
import jobFlowApi from "../api/jobFlowApi";
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

const STEPS = [
  "Basic Details",
  "Specifications",
  "Finishing & Services",
  "Attachments",
  "Review & Save",
];

export const CreateJobOrderPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId");

  const managerBranch = getManagerBranch();
  const [currentStep, setCurrentStep] = useState(1);
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
    // Step 1: Basic Details
    customerId: "",
    customerName: "",
    customerCode: "",
    customerPhone: "",
    customerEmail: "",
    branchName: managerBranch || "Main Branch",
    jobType: "Print & Design",
    jobTitle: "Business Cards - New Design",
    targetDueDate: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
    deliveryMethod: "Customer Pickup",
    referenceNo: "PO-12345",
    remarks: "Urgent order. Please confirm sample before bulk run.",

    // Step 2: Specifications
    productType: "Business Cards",
    quantity: 500,
    paperType: "Art Card",
    paperGsm: "260 gsm",
    size: "90 x 54 mm (Standard)",
    color: "Full Color (CMYK)",
    printingSide: "Double Sided",
    lamination: "Matte",
    finishing: "None",

    // Step 3: Finishing & Services
    finishingServices: [
      { id: 1, name: "Lamination", config: "Matte", unitPrice: 0.50, quantity: 500, total: 250.00, unit: "sheets" },
      { id: 2, name: "Cutting", config: "Trim to 90 x 54 mm", unitPrice: 0.10, quantity: 500, total: 50.00, unit: "sheets" },
      { id: 3, name: "Packing", config: "Shrink Wrap", unitPrice: 0.20, quantity: 5, total: 1.00, unit: "packs" },
    ],
    additionalServices: [],

    // Step 4: Attachments
    uploadedFiles: [
      { name: "business-card-design-final.pdf", size: "2.4 MB", type: "Artwork File" },
      { name: "logo-reference.png", size: "1.1 MB", type: "Reference File" },
    ],
    specialInstructions: "Use company logo as per attached file. Matte lamination. Ensure correct color matching.",
  });

  const selectCustomer = (cust) => {
    setFormData((prev) => ({
      ...prev,
      customerId: cust._id || cust.id,
      customerName: cust.name || cust.companyName,
      customerCode: cust.customerCode || cust.code || "CUST-00124",
      customerPhone: cust.phone || cust.mobile || "012-345 6789",
      customerEmail: cust.email || "client@email.com",
      branchName: prev.branchName || managerBranch || "Main Branch",
    }));
    setCustomerSearchTerm(`${cust.customerCode || cust.code || "CUST"} - ${cust.name || cust.companyName}`);
    setIsCustomerDropdownOpen(false);
  };

  useEffect(() => {
    // If preselectedCustomerId is provided in URL, directly fetch and select that customer
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

    // Load active customers and branches
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
          } else if (list.length > 0 && !formData.customerId) {
            selectCustomer(list[0]);
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

  // Quick Add Finishing Service (Image 2 Screen 3)
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

  // File Upload Simulator / Handler
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

  // Submission
  const handleSubmitJob = async (isDraft = false) => {
    if (!formData.customerId && !formData.customerName) {
      toast.error("Please select or specify a customer.");
      setCurrentStep(1);
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
        jobType: formData.jobType || "PRINT_JOB",
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
            finishing: formData.finishingServices || [],
            needsProduction: true,
          },
        ],
        specs: {
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
            const finishingCost = formData.finishingServices.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
            const baseAmount = finishingCost > 0 ? finishingCost : 250;
            const unitRate = Math.round((baseAmount / qty) * 100) / 100;
            await jobFlowApi.submitEstimate(newId, {
              items: [
                {
                  lineNo: 1,
                  itemName: formData.jobTitle || `${formData.productType || "Print Job"} - ${qty} pcs`,
                  description: `${formData.paperType || "Standard"} ${formData.paperGsm || ""} (${formData.size || "Standard"})`,
                  unitRate: unitRate,
                  unitPrice: unitRate,
                  quantity: qty,
                  unit: "PCS",
                  taxRate: 8,
                },
              ],
              discountAmount: 0,
            });
          } catch (e) {
            console.warn("Auto submit estimate:", e);
          }
        }
        // Auto-shift for approval page
        navigate(`/jobflow/estimates?jobId=${newId || ""}&new=true`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create job order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <JobFlowLayout
      title="Create Job Order"
      subtitle="5-Step Production Intake Wizard with dynamic specifications & finishing configurations"
      actions={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            onClick={() => navigate("/jobflow/jobs")}
          >
            Cancel
          </button>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            onClick={() => handleSubmitJob(true)}
            disabled={loading}
          >
            <Save size={14} /> Save as Draft
          </button>
        </div>
      }
    >
      {/* 5-Step Stepper */}
      <Stepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={(step) => setCurrentStep(step)}
      />

      {/* STEP 1: Basic Details (Image 1 Screen 5) */}
      {currentStep === 1 && (
        <div className="jf-card">
          <div className="jf-card-header">
            <h3 className="jf-card-title">Basic Details</h3>
            <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Step 1 of 5</span>
          </div>

          <div className="jf-form-grid" style={{ marginBottom: "1.5rem" }}>
            <div className="jf-form-group" style={{ position: "relative" }} ref={customerDropdownRef}>
              <label
                className="jf-label jf-label-required"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>Customer</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {formData.customerId && (
                    <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>
                      ✓ Selected: {formData.customerCode}
                    </span>
                  )}
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
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "2px 8px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <Plus size={12} /> Add Customer
                  </button>
                </div>
              </label>
              <div style={{ position: "relative" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#64748b",
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
                        color: "#94a3b8",
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
                      color: "#64748b",
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
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                              📞 {c.phone || c.mobile || "N/A"} • ✉️ {c.email || "N/A"}
                            </div>
                          </div>
                          {isSelected && <Check size={16} color="#059669" />}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "0.875rem" }}>
                      No customers found matching "{customerSearchTerm}"
                    </div>
                  )}
                </div>
              )}
            </div>

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
              <label className="jf-label jf-label-required">Job Type</label>
              <select
                className="jf-select"
                value={formData.jobType}
                onChange={(e) => handleInputChange("jobType", e.target.value)}
              >
                <option value="Print & Design">Print & Design</option>
                <option value="Print Only">Print Only (Artwork Provided)</option>
                <option value="Design Only">Design Only</option>
              </select>
            </div>

            <div className="jf-form-group">
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
                <option value="Customer Pickup">Customer Pickup</option>
                <option value="In-House Delivery">In-House Staff Delivery</option>
                <option value="Courier">Courier / Dispatch Service</option>
              </select>
            </div>

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
                placeholder="Urgent order. Please confirm sample."
                value={formData.remarks}
                onChange={(e) => handleInputChange("remarks", e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="jf-btn jf-btn-primary"
              onClick={() => setCurrentStep(2)}
            >
              Next: Specifications <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Specifications (Image 1 Screen 6) */}
      {currentStep === 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: "1.5rem" }}>
          <div className="jf-card">
            <div className="jf-card-header">
              <h3 className="jf-card-title">Print Specifications</h3>
              <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Step 2 of 5</span>
            </div>

            <div className="jf-form-grid" style={{ marginBottom: "1.5rem" }}>
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Product Type</label>
                <select
                  className="jf-select"
                  value={formData.productType}
                  onChange={(e) => handleInputChange("productType", e.target.value)}
                >
                  <option value="Business Cards">Business Cards</option>
                  <option value="Flyers / Leaflets">Flyers / Leaflets</option>
                  <option value="Brochures">Brochures (Bi-Fold / Tri-Fold)</option>
                  <option value="Booklets / Catalogues">Booklets / Catalogues</option>
                  <option value="Posters (A3/A2/A1)">Posters (A3/A2/A1)</option>
                  <option value="Banners (Roll-up / Tarpaulin)">Banners (Roll-up / Tarpaulin)</option>
                  <option value="Stickers / Labels">Stickers / Labels (Die-cut)</option>
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Quantity</label>
                <input
                  type="number"
                  className="jf-input"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", Number(e.target.value))}
                  min="1"
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Paper Type</label>
                <select
                  className="jf-select"
                  value={formData.paperType}
                  onChange={(e) => handleInputChange("paperType", e.target.value)}
                >
                  <option value="Art Card">Art Card</option>
                  <option value="Art Paper">Art Paper</option>
                  <option value="Simili Paper">Simili Paper (Woodfree)</option>
                  <option value="Kraft Paper">Kraft Paper</option>
                  <option value="Synthetic YUPO">Synthetic YUPO (Waterproof)</option>
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Paper GSM</label>
                <select
                  className="jf-select"
                  value={formData.paperGsm}
                  onChange={(e) => handleInputChange("paperGsm", e.target.value)}
                >
                  <option value="260 gsm">260 gsm</option>
                  <option value="310 gsm">310 gsm</option>
                  <option value="157 gsm">157 gsm</option>
                  <option value="128 gsm">128 gsm</option>
                  <option value="80 gsm">80 gsm</option>
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Size</label>
                <select
                  className="jf-select"
                  value={formData.size}
                  onChange={(e) => handleInputChange("size", e.target.value)}
                >
                  <option value="90 x 54 mm (Standard)">90 x 54 mm (Standard)</option>
                  <option value="A4 (210 x 297 mm)">A4 (210 x 297 mm)</option>
                  <option value="A5 (148 x 210 mm)">A5 (148 x 210 mm)</option>
                  <option value="A3 (297 x 420 mm)">A3 (297 x 420 mm)</option>
                  <option value="Custom Size">Custom Size</option>
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Color</label>
                <select
                  className="jf-select"
                  value={formData.color}
                  onChange={(e) => handleInputChange("color", e.target.value)}
                >
                  <option value="Full Color (CMYK)">Full Color (CMYK)</option>
                  <option value="Black & White (K-Only)">Black & White (K-Only)</option>
                  <option value="2 Spot Colors">2 Spot Colors (Pantone)</option>
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Printing Side</label>
                <select
                  className="jf-select"
                  value={formData.printingSide}
                  onChange={(e) => handleInputChange("printingSide", e.target.value)}
                >
                  <option value="Double Sided">Double Sided</option>
                  <option value="Single Sided">Single Sided</option>
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Lamination (If any)</label>
                <select
                  className="jf-select"
                  value={formData.lamination}
                  onChange={(e) => handleInputChange("lamination", e.target.value)}
                >
                  <option value="Matte">Matte</option>
                  <option value="Gloss">Gloss</option>
                  <option value="Velvet Soft Touch">Velvet Soft Touch</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setCurrentStep(1)}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={() => setCurrentStep(3)}
              >
                Next: Finishing & Services <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Product Preview Card */}
          <div className="jf-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="jf-card-header">
                <h3 className="jf-card-title">Preview Sample</h3>
              </div>
              <div
                style={{
                  background: "linear-gradient(135deg, #064e3b 0%, #10b981 100%)",
                  borderRadius: "8px",
                  height: "180px",
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
                    {formData.productType} • {formData.size}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "1rem", fontSize: "0.8125rem", color: "#475569" }}>
                <div><strong>Specs:</strong> {formData.paperGsm} {formData.paperType}</div>
                <div><strong>Color:</strong> {formData.color} ({formData.printingSide})</div>
                <div><strong>Lamination:</strong> {formData.lamination}</div>
              </div>
            </div>

            <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" style={{ marginTop: "1rem" }}>
              <Sparkles size={14} /> Change Sample
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Finishing & Services (Image 2 Screen 3) */}
      {currentStep === 3 && (
        <div className="jf-card">
          <div className="jf-card-header">
            <div>
              <h3 className="jf-card-title">Add Finishing Services</h3>
              <p className="jf-header-subtitle" style={{ margin: 0 }}>
                Select the finishing options required for this job. Available options are dynamically configured by the system.
              </p>
            </div>
            <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Step 3 of 5</span>
          </div>

          {/* Quick Add Chips (Image 2 Screen 3) */}
          <div style={{ marginBottom: "1.5rem" }}>
            <span className="jf-label">Quick Add (Common Services):</span>
            <div className="jf-chips-wrap">
              {["Lamination", "Cutting", "Binding", "Folding", "Creasing", "Perforation", "Numbering", "Packing"].map((svc) => (
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

          {/* Finishing Services Table */}
          <div className="jf-table-wrap" style={{ marginBottom: "1.5rem" }}>
            <table className="jf-table">
              <thead>
                <tr>
                  <th style={{ width: "30px" }}>#</th>
                  <th>Finishing Service</th>
                  <th>Configuration</th>
                  <th>Unit Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {formData.finishingServices.map((svc, idx) => (
                  <tr key={svc.id}>
                    <td>{idx + 1}</td>
                    <td><strong>{svc.name}</strong></td>
                    <td>
                      <select
                        className="jf-select"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.8125rem" }}
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
                    <td>RM {svc.unitPrice.toFixed(2)} / {svc.unit}</td>
                    <td>{svc.quantity} {svc.unit}</td>
                    <td><strong>RM {svc.total.toFixed(2)}</strong></td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="jf-btn jf-btn-danger-outline jf-btn-sm"
                        onClick={() => removeFinishingService(svc.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", padding: "1rem", borderRadius: "8px", border: "1px solid #bbf7d0", marginBottom: "1.5rem" }}>
            <span style={{ fontWeight: 600, color: "#166534" }}>Estimated Finishing & Services Total:</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "#15803d" }}>RM {finishingTotal.toFixed(2)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button
              type="button"
              className="jf-btn jf-btn-secondary"
              onClick={() => setCurrentStep(2)}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              className="jf-btn jf-btn-primary"
              onClick={() => setCurrentStep(4)}
            >
              Next: Attachments <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Attachments (Image 2 Screen 4) */}
      {currentStep === 4 && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.5rem" }}>
          <div className="jf-card">
            <div className="jf-card-header">
              <h3 className="jf-card-title">Upload Artwork & References</h3>
              <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Step 4 of 5</span>
            </div>

            {/* Dropzone */}
            <label className="jf-dropzone" style={{ display: "block", marginBottom: "1.5rem" }}>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.ai,.psd"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <Upload size={32} style={{ color: "var(--jf-primary)", margin: "0 auto 0.5rem" }} />
              <div style={{ fontWeight: 600, color: "#0f172a" }}>
                Drag and drop files here or <span style={{ color: "var(--jf-primary)", textDecoration: "underline" }}>click to upload</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                Supported formats: PDF, JPG, PNG, AI, PSD, CDR (Max 10MB each)
              </div>
            </label>

            {/* Uploaded Files List */}
            <h4 style={{ fontSize: "0.9rem", margin: "0 0 0.75rem 0", color: "#0f172a" }}>
              Uploaded Files ({formData.uploadedFiles.length})
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {formData.uploadedFiles.map((file, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem",
                    border: "1px solid var(--jf-border)",
                    borderRadius: "6px",
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <FileText size={20} style={{ color: "#ef4444" }} />
                    <div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{file.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{file.size} • {file.type}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={() => removeFile(idx)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setCurrentStep(3)}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={() => setCurrentStep(5)}
              >
                Next: Review & Save <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Guidelines & Special Instructions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="jf-card">
              <h3 className="jf-card-title" style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>
                File Guidelines
              </h3>
              <ul style={{ paddingLeft: "1.25rem", fontSize: "0.8125rem", color: "#475569", lineHeight: "1.6" }}>
                <li>Use high resolution files (300 DPI)</li>
                <li>Prefer PDF, AI, PSD for best printing quality</li>
                <li>All fonts should be outlined (if possible)</li>
                <li>Include reference samples if available</li>
                <li>Maximum file size: 10MB per file</li>
              </ul>
            </div>

            <div className="jf-card">
              <h3 className="jf-card-title" style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>
                Special Instructions (Optional)
              </h3>
              <textarea
                className="jf-textarea"
                rows={4}
                value={formData.specialInstructions}
                onChange={(e) => handleInputChange("specialInstructions", e.target.value)}
                placeholder="Mention specific Pantone codes, packaging requirements or sample signoff instructions..."
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Review & Save (Image 2 Screen 5) */}
      {currentStep === 5 && (
        <div className="jf-card">
          <div className="jf-card-header">
            <h3 className="jf-card-title">Job Order Summary</h3>
            <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Step 5 of 5</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            {/* Customer & Basic Details */}
            <div className="jf-card" style={{ marginBottom: 0, padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a" }}>Customer & Basic Details</h4>
                <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={() => setCurrentStep(1)}>
                  <Edit size={12} /> Edit
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8125rem" }}>
                <div><span style={{ color: "#64748b" }}>Customer:</span> <strong>{formData.customerName}</strong></div>
                <div><span style={{ color: "#64748b" }}>Branch:</span> {formData.branchName}</div>
                <div><span style={{ color: "#64748b" }}>Job Title:</span> <strong>{formData.jobTitle}</strong></div>
                <div><span style={{ color: "#64748b" }}>Job Type:</span> {formData.jobType}</div>
                <div><span style={{ color: "#64748b" }}>Target Due Date:</span> {formData.targetDueDate}</div>
                <div><span style={{ color: "#64748b" }}>Delivery Method:</span> {formData.deliveryMethod}</div>
              </div>
            </div>

            {/* Specifications */}
            <div className="jf-card" style={{ marginBottom: 0, padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a" }}>Print Specifications</h4>
                <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={() => setCurrentStep(2)}>
                  <Edit size={12} /> Edit
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8125rem" }}>
                <div><span style={{ color: "#64748b" }}>Product Type:</span> <strong>{formData.productType}</strong></div>
                <div><span style={{ color: "#64748b" }}>Quantity:</span> <strong>{formData.quantity} pcs</strong></div>
                <div><span style={{ color: "#64748b" }}>Paper Type & GSM:</span> {formData.paperGsm} {formData.paperType}</div>
                <div><span style={{ color: "#64748b" }}>Size:</span> {formData.size}</div>
                <div><span style={{ color: "#64748b" }}>Color:</span> {formData.color}</div>
                <div><span style={{ color: "#64748b" }}>Printing Side:</span> {formData.printingSide}</div>
                <div><span style={{ color: "#64748b" }}>Lamination:</span> {formData.lamination}</div>
              </div>
            </div>
          </div>

          {/* Finishing & Attachments Overview */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div className="jf-card" style={{ marginBottom: 0, padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a" }}>Finishing & Services</h4>
                <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={() => setCurrentStep(3)}>
                  <Edit size={12} /> Edit
                </button>
              </div>

              <table className="jf-table" style={{ fontSize: "0.8125rem" }}>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Config</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.finishingServices.map((s, idx) => (
                    <tr key={idx}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.config}</td>
                      <td>{s.quantity} {s.unit}</td>
                      <td>RM {s.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ textAlign: "right", marginTop: "0.75rem", fontWeight: 700, color: "var(--jf-primary)" }}>
                Finishing Total: RM {finishingTotal.toFixed(2)}
              </div>
            </div>

            <div className="jf-card" style={{ marginBottom: 0, padding: "1rem" }}>
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", color: "#0f172a" }}>
                Attachments ({formData.uploadedFiles.length})
              </h4>
              <ul style={{ paddingLeft: "1.25rem", fontSize: "0.8125rem", color: "#475569" }}>
                {formData.uploadedFiles.map((f, idx) => (
                  <li key={idx} style={{ marginBottom: "0.25rem" }}>
                    <strong>{f.name}</strong> ({f.size}) - {f.type}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              className="jf-btn jf-btn-secondary"
              onClick={() => setCurrentStep(4)}
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => handleSubmitJob(true)}
                disabled={loading}
              >
                <Save size={16} /> Save as Draft
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={() => handleSubmitJob(false)}
                disabled={loading}
              >
                <CheckCircle size={16} /> {loading ? "Creating..." : "Create Job Order"}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </JobFlowLayout>
  );
};

export default CreateJobOrderPage;
