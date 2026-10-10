import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  FileText,
  Layers
} from "lucide-react";
import CustomerSelectorCard from "./CustomerSelectorCard";
import JobBasicInfoCard from "./JobBasicInfoCard";
import JobItemCard from "./JobItemCard";
import JobReviewSummary from "./JobReviewSummary";
import { createJob } from "../api/jobApi";
import { getCustomerById } from "../../customer/api/customerApi";
import { validateJobForm, normalizeJobData } from "../utils/jobValidation";
import "../../customer/styles/customerV3.css";
import "../styles/jobV3.css";

export default function JobCreationForm({
  initialCustomerId = null,
  initialCustomer = null,
  branchName = "Banaswadii",
  branchId = "489571a9af51836599708543",
  onJobCreated,
  onCancel
}) {
  const navigate = useNavigate();

  const [selectedCustomer, setSelectedCustomer] = useState(initialCustomer);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);

  // Default empty item template
  const createDefaultItem = (index = 0) => ({
    jobItemId: `item_${Date.now()}_${index + 1}`,
    itemName: "",
    productType: "",
    quantity: "",
    unit: "PCS",
    size: {
      type: "CUSTOM",
      presetName: "Custom Dimension",
      width: "",
      height: "",
      unit: "INCH"
    },
    printing: {
      side: "SINGLE_SIDE",
      colourMode: "COLOUR"
    },
    material: {
      paperType: "Art Card",
      gsm: 300,
      paperSize: "SRA3",
      notes: ""
    },
    finishing: [],
    designRequired: true,
    designNotes: "",
    notes: ""
  });

  const initialValidId = initialCustomer?._id || (/^[0-9a-fA-F]{24}$/.test(String(initialCustomer?.id || "")) ? initialCustomer.id : (/^[0-9a-fA-F]{24}$/.test(String(initialCustomerId || "")) ? initialCustomerId : ""));

  const [formData, setFormData] = useState({
    customerId: initialValidId,
    customerCode: initialCustomer?.customerCode || "",
    customerName: initialCustomer?.name || "",
    customerMobile: initialCustomer?.mobile || initialCustomer?.phone || "",
    customerPhone: initialCustomer?.mobile || initialCustomer?.phone || "",
    customerCompany: initialCustomer?.companyName || initialCustomer?.company || "",
    branchId: branchId,
    branchName: branchName,
    jobTitle: "",
    priority: "NORMAL",
    source: "WALK_IN",
    expectedDeliveryDate: "",
    notes: "",
    items: [createDefaultItem(0)]
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Fetch or sync customer details if provided via initialCustomer or initialCustomerId
  useEffect(() => {
    if (initialCustomer) {
      handleCustomerSelect(initialCustomer);
    } else if (initialCustomerId && !selectedCustomer) {
      setIsLoadingCustomer(true);
      getCustomerById(initialCustomerId)
        .then((cus) => {
          if (cus) {
            handleCustomerSelect(cus);
          }
        })
        .catch((err) => console.error("Could not fetch customer by ID:", err))
        .finally(() => setIsLoadingCustomer(false));
    }
  }, [initialCustomer, initialCustomerId]);

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);

    // Auto-detect Order Source based on the customer's registration channel
    let detectedSource = "WALK_IN";
    if (customer?.source) {
      const srcUpper = String(customer.source).toUpperCase();
      if (srcUpper.includes("QR") || srcUpper.includes("MOBILE")) {
        detectedSource = "QR";
      } else if (srcUpper.includes("PHONE") || srcUpper.includes("WHATSAPP") || srcUpper.includes("CALL")) {
        detectedSource = "PHONE";
      } else if (srcUpper.includes("ONLINE") || srcUpper.includes("WEB") || srcUpper.includes("EMAIL")) {
        detectedSource = "ONLINE";
      } else if (srcUpper.includes("WALK")) {
        detectedSource = "WALK_IN";
      }
    }

    const validCusId = customer._id || (/^[0-9a-fA-F]{24}$/.test(String(customer.id || "")) ? customer.id : (/^[0-9a-fA-F]{24}$/.test(String(customer.customerId || "")) ? customer.customerId : ""));
    const phone = customer.mobile || customer.phone || "";

    setFormData((prev) => ({
      ...prev,
      customerId: validCusId,
      customerCode: customer.customerCode || "",
      customerName: customer.name || "",
      customerMobile: phone,
      customerPhone: phone,
      customerCompany: customer.companyName || customer.company || "",
      source: detectedSource
    }));

    if (errors.customerId) {
      setErrors((prev) => ({ ...prev, customerId: null }));
    }
  };

  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (serverError) setServerError(null);
  };

  const handleItemChange = (index, updatedItem) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = updatedItem;
      return { ...prev, items: newItems };
    });

    // Clear item-specific errors
    const cleanedErrors = { ...errors };
    Object.keys(cleanedErrors).forEach((key) => {
      if (key.startsWith(`items[${index}]`)) {
        delete cleanedErrors[key];
      }
    });
    setErrors(cleanedErrors);
  };

  const handleAddItem = () => {
    const newItem = createDefaultItem(formData.items.length);
    newItem.itemName = "";
    newItem.productType = "Custom Print";
    newItem.finishing = ["CUTTING"];
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  const handleDuplicateItem = (index) => {
    const itemToClone = formData.items[index];
    const cloned = {
      ...itemToClone,
      jobItemId: `item_${Date.now()}_${formData.items.length + 1}`,
      itemName: `${itemToClone.itemName} (Copy)`
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, cloned]
    }));
  };

  const handleSave = async (isDraft = false) => {
    if (isSubmitting) return;

    // Validate payload
    const { isValid, errors: validationErrors } = validateJobForm(formData, isDraft);
    if (!isValid) {
      setErrors(validationErrors);
      // Auto-scroll to first error element
      const firstErrorKey = Object.keys(validationErrors)[0];
      const elem = document.getElementById(firstErrorKey) || document.querySelector(".v3-item-card");
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload = normalizeJobData(formData, isDraft);
      const response = await createJob(payload);

      if (response && (response.job || response.data || response._id || response.id)) {
        const createdJob = response.job || response.data || response;
        if (onJobCreated) {
          onJobCreated(createdJob);
        } else {
          navigate(`/v3/jobs/${createdJob.id || createdJob._id || createdJob.jobId || createdJob.jobNo}`);
        }
      }
    } catch (err) {
      console.error("Job creation failed:", err);
      setServerError(
        err.response?.data?.message || err.message || "Failed to create job. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItemCount = formData.items?.length || 0;
  const totalUnits = (formData.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);

  return (
    <div className="v3-job-container">
      {/* Top Header */}
      <div className="v3-job-header">
        <div className="v3-job-header-left">
          <div className="v3-breadcrumb">
            <span className="v3-breadcrumb-root">PrintZ V3</span>
            <span>/</span>
            <span>Job Management</span>
            <span>/</span>
            <span>New Job Order</span>
          </div>
          <div className="v3-job-title-row">
            <h1 className="v3-job-header-title">Create New Job Order</h1>
            <span className="v3-branch-pill">📍 {branchName}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={onCancel || (() => navigate(-1))}
            className="v3-btn-secondary"
            style={{ fontSize: "12px" }}
          >
            <ArrowLeft size={14} /> Back
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            className="v3-btn-secondary"
            style={{ fontSize: "12px", borderColor: "#94a3b8" }}
          >
            <Save size={14} /> Save Draft
          </button>
        </div>
      </div>

      {/* Global Server Error Banner */}
      {serverError && (
        <div className="v3-warning-box" style={{ borderColor: "#f87171", backgroundColor: "#fef2f2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={20} color="#dc2626" />
            <div>
              <strong style={{ fontSize: "13px", color: "#991b1b" }}>Job Creation Error:</strong>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#b91c1c" }}>{serverError}</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Customer Information */}
      <CustomerSelectorCard
        customer={selectedCustomer}
        onSelectCustomer={handleCustomerSelect}
        branchName={branchName}
        error={errors.customerId}
      />

      {/* SECTION 2: Job Information */}
      <JobBasicInfoCard
        formData={formData}
        errors={errors}
        onChange={handleBasicInfoChange}
      />

      {/* SECTION 3: Job Items & Technical Specifications */}
      <div className="v3-card" style={{ padding: "20px" }}>
        <div className="v3-items-header-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="v3-card-icon">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="v3-card-title">3. Job Items & Manufacturing Specifications</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="v3-btn-primary"
            style={{ fontSize: "12px", padding: "8px 16px" }}
          >
            <Plus size={14} /> Add Another Job Item
          </button>
        </div>

        {errors.items && (
          <div className="v3-warning-box" style={{ marginBottom: "16px", borderColor: "#fca5a5", backgroundColor: "#fef2f2" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "#b91c1c", fontWeight: 600 }}>
              ⚠️ {errors.items}
            </p>
          </div>
        )}

        {/* List of Job Item Cards */}
        {formData.items.map((item, idx) => (
          <JobItemCard
            key={item.jobItemId || idx}
            item={item}
            index={idx}
            totalItems={formData.items.length}
            errors={errors}
            onChange={handleItemChange}
            onRemove={handleRemoveItem}
            onDuplicate={handleDuplicateItem}
          />
        ))}

        <div style={{ textAlign: "center", paddingTop: "10px" }}>
          <button
            type="button"
            onClick={handleAddItem}
            className="v3-btn-secondary"
            style={{ fontSize: "12px", padding: "8px 20px" }}
          >
            <Plus size={14} /> + Add Another Item to this Job Order
          </button>
        </div>
      </div>

      {/* SECTION 4: Review Before Final Save */}
      <JobReviewSummary
        formData={formData}
        customer={selectedCustomer}
      />

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="v3-sticky-action-bar">
        <div className="v3-sticky-action-inner">
          <div className="v3-sticky-left-summary">
            <span style={{ fontWeight: 600 }}>
              Customer: <strong style={{ color: "#0f172a" }}>{selectedCustomer ? selectedCustomer.name : "Not Selected"}</strong>
            </span>
            <span>•</span>
            <span>
              Items: <strong>{totalItemCount}</strong> ({totalUnits.toLocaleString()} units)
            </span>
          </div>

          <div className="v3-sticky-right-actions">
            <button
              type="button"
              onClick={onCancel || (() => navigate(-1))}
              className="v3-btn-secondary"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
              className="v3-btn-secondary"
              style={{ fontWeight: 700 }}
            >
              {isSubmitting ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
              Save Draft
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="v3-btn-primary"
              style={{ padding: "10px 24px", fontSize: "14px" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Creating Job Order...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Create Job & Capture Requirements
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
