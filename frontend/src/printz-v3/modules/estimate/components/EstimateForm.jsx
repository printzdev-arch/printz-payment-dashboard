import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  Save,
  CheckCircle2,
  Send,
  Eye,
  ArrowLeft,
  Plus,
  AlertCircle,
  FileText,
  User,
  Briefcase,
  Calendar,
  Layers,
  Scissors,
  Sparkles,
  Info
} from "lucide-react";
import EstimateLineItemRow from "./EstimateLineItemRow";
import EstimatePreviewModal from "./EstimatePreviewModal";
import SendEstimateModal from "./SendEstimateModal";
import { TAX_RATES, DEFAULT_TERMS_AND_CONDITIONS } from "../constants/estimateConstants";
import {
  calculateEstimateTotals,
  generateDefaultLinesForJobItem,
  formatCurrency,
  roundToTwo
} from "../utils/estimateCalculations";
import { createEstimate, updateEstimate, markEstimateReady, sendEstimateToCustomer } from "../api/estimateApi";
import { getJobById } from "../../job/api/jobApi";
import "../../customer/styles/customerV3.css";
import "../../job/styles/jobV3.css";
import "../styles/estimateV3.css";

export default function EstimateForm({
  jobId,
  initialJob = null,
  initialEstimate = null,
  branchName = "Banaswadi",
  branchId = "64f1a2b3c4d5e6f7a8b90001",
  onSaved = null
}) {
  const navigate = useNavigate();

  const [job, setJob] = useState(initialJob);
  const [isLoadingJob, setIsLoadingJob] = useState(!initialJob && !!jobId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Form State
  const [estimateData, setEstimateData] = useState(() => {
    if (initialEstimate) {
      const items = (initialEstimate.items || []).map((it, idx) => {
        const qty = Number(it.quantity || 1);
        const unit = it.unit || "PCS";
        const unitRate = Number(it.unitRate || it.unitPrice || it.rate || 0);
        let lines = (Array.isArray(it.lines) && it.lines.length > 0) ? it.lines : [];
        if (lines.length === 0) {
          if (unitRate > 0) {
            lines = [
              {
                lineId: it._id || `line_${idx + 1}`,
                description: it.itemName || it.description || `Item #${idx + 1}`,
                category: it.itemType || "PRINT",
                quantity: qty,
                unit: unit,
                rate: unitRate,
                amount: roundToTwo(qty * unitRate),
                notes: it.specification || ""
              }
            ];
          } else {
            lines = generateDefaultLinesForJobItem({
              ...it,
              itemName: it.itemName || it.description || `Item #${idx + 1}`,
              quantity: qty,
              unit: unit
            });
          }
        }
        return {
          ...it,
          jobItemId: it.jobItemId || it.id || it._id || `item_${idx + 1}`,
          itemName: it.itemName || it.description || "Print Item",
          productType: it.productType || it.itemName || "Custom Print",
          quantity: qty,
          unit: unit,
          unitRate: unitRate,
          lines: lines
        };
      });

      return {
        ...initialEstimate,
        items,
        discount: initialEstimate.discount || { type: "PERCENTAGE", value: 0, amount: 0 },
        tax: initialEstimate.tax || { type: "GST", rate: 18 },
        deliveryCharge: initialEstimate.deliveryCharge || 0
      };
    }

    return {
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      discount: { type: "PERCENTAGE", value: 0, amount: 0 },
      tax: { type: "GST", rate: 18 },
      deliveryCharge: 0,
      termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS,
      customerNotes: "",
      internalNotes: "",
      items: []
    };
  });

  // Modal states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [activeSavedEstimate, setActiveSavedEstimate] = useState(initialEstimate || null);

  // Fetch Job details if not preloaded
  useEffect(() => {
    if (!job && jobId) {
      setIsLoadingJob(true);
      getJobById(jobId)
        .then((fetchedJob) => {
          setJob(fetchedJob);
          setEstimateData((prev) => {
            const hasExistingLines = prev.items && prev.items.some((i) => i.lines && i.lines.length > 0);
            if (hasExistingLines) return prev;

            const baseItems = (prev.items && prev.items.length > 0) ? prev.items : (fetchedJob?.items || []);
            const populatedItems = baseItems.map((it, idx) => {
              const qty = Number(it.quantity) || Number(fetchedJob?.quantity) || 1;
              const unit = it.unit || "PCS";
              return {
                jobItemId: it.jobItemId || it.id || it._id || `item_${Date.now()}_${idx}`,
                itemName: it.itemName || it.description || fetchedJob?.title || "Print Item",
                productType: it.productType || it.itemName || fetchedJob?.title || "Custom Print",
                quantity: qty,
                unit: unit,
                lines: (Array.isArray(it.lines) && it.lines.length > 0)
                  ? it.lines
                  : generateDefaultLinesForJobItem({ ...it, quantity: qty, unit })
              };
            });
            return { ...prev, items: populatedItems };
          });
        })
        .catch((err) => {
          console.error("Failed to fetch job for estimate:", err);
          setServerError("Failed to load job order details for quotation.");
        })
        .finally(() => {
          setIsLoadingJob(false);
        });
    } else if (job && (!estimateData.items || estimateData.items.length === 0 || !estimateData.items.some(i => i.lines && i.lines.length > 0))) {
      const baseItems = (estimateData.items && estimateData.items.length > 0) ? estimateData.items : (job.items || []);
      const initialItems = baseItems.map((it, idx) => {
        const qty = Number(it.quantity) || Number(job.quantity) || 1;
        const unit = it.unit || "PCS";
        return {
          jobItemId: it.jobItemId || it.id || it._id || `item_${Date.now()}_${idx}`,
          itemName: it.itemName || it.description || job.title || "Print Item",
          productType: it.productType || it.itemName || job.title || "Custom Print",
          quantity: qty,
          unit: unit,
          lines: (Array.isArray(it.lines) && it.lines.length > 0)
            ? it.lines
            : generateDefaultLinesForJobItem({ ...it, quantity: qty, unit })
        };
      });
      setEstimateData((prev) => ({ ...prev, items: initialItems }));
    }
  }, [jobId, job, initialEstimate]);

  // Dynamic Real-time Calculations
  const calculated = calculateEstimateTotals({
    items: estimateData.items,
    discount: estimateData.discount,
    tax: estimateData.tax,
    deliveryCharge: estimateData.deliveryCharge
  });

  // Handle line item change
  const handleLineChange = (itemIndex, lineIndex, updatedLine) => {
    setEstimateData((prev) => {
      const newItems = [...prev.items];
      const targetItem = { ...newItems[itemIndex] };
      const newLines = [...targetItem.lines];
      newLines[lineIndex] = updatedLine;
      targetItem.lines = newLines;
      newItems[itemIndex] = targetItem;
      return { ...prev, items: newItems };
    });
  };

  // Add line item
  const handleAddLine = (itemIndex) => {
    setEstimateData((prev) => {
      const newItems = [...prev.items];
      const targetItem = { ...newItems[itemIndex] };
      const newLine = {
        lineId: `line_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        description: "",
        category: "OTHER",
        quantity: targetItem.quantity || 1,
        unit: targetItem.unit || "PCS",
        rate: 0,
        amount: 0,
        notes: ""
      };
      targetItem.lines = [...(targetItem.lines || []), newLine];
      newItems[itemIndex] = targetItem;
      return { ...prev, items: newItems };
    });
  };

  // Remove line item
  const handleRemoveLine = (itemIndex, lineIndex) => {
    setEstimateData((prev) => {
      const newItems = [...prev.items];
      const targetItem = { ...newItems[itemIndex] };
      targetItem.lines = targetItem.lines.filter((_, idx) => idx !== lineIndex);
      newItems[itemIndex] = targetItem;
      return { ...prev, items: newItems };
    });
  };

  // Save / Update Draft
  const handleSave = async (isMarkReady = false) => {
    setServerError(null);

    // Basic Validation
    if (calculated.subtotal <= 0 && isMarkReady) {
      setServerError("Please specify positive pricing components before marking estimate as Ready.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        jobId: job?.id || job?._id || job?.jobId || jobId,
        customerId: job?.customerId,
        branchId: job?.branchId || branchId,
        branchName: job?.branchName || branchName,
        items: estimateData.items,
        discount: estimateData.discount,
        tax: estimateData.tax,
        deliveryCharge: estimateData.deliveryCharge,
        validUntil: estimateData.validUntil,
        termsAndConditions: estimateData.termsAndConditions,
        customerNotes: estimateData.customerNotes,
        internalNotes: estimateData.internalNotes,
        status: isMarkReady ? "READY" : (estimateData.status || "DRAFT")
      };

      let result;
      let createdOrUpdatedEstimate = null;

      if (initialEstimate?.id || initialEstimate?._id || activeSavedEstimate?.id) {
        const estId = initialEstimate?.id || initialEstimate?._id || activeSavedEstimate?.id;
        result = await updateEstimate(estId, payload);
        createdOrUpdatedEstimate = result?.estimate || result;
        if (isMarkReady) {
          const readyRes = await markEstimateReady(estId);
          if (readyRes?.estimate) {
            createdOrUpdatedEstimate = readyRes.estimate;
          }
        }
      } else {
        result = await createEstimate(payload);
        createdOrUpdatedEstimate = result?.estimate || result;
        const newEstId = createdOrUpdatedEstimate?.id || createdOrUpdatedEstimate?._id || createdOrUpdatedEstimate?.jobId;
        if (isMarkReady && newEstId) {
          const readyRes = await markEstimateReady(newEstId);
          if (readyRes?.estimate) {
            createdOrUpdatedEstimate = readyRes.estimate;
          }
        }
      }

      const savedEst = createdOrUpdatedEstimate || result?.estimate || result;
      setActiveSavedEstimate(savedEst);

      if (isMarkReady) {
        navigate("/v3/design");
      } else if (onSaved) {
        onSaved(savedEst);
      } else {
        const destId =
          savedEst?._id ||
          savedEst?.id ||
          savedEst?.estimateId ||
          savedEst?.jobId ||
          payload.jobId;

        if (destId && destId !== "undefined") {
          navigate(`/v3/estimates/${destId}`);
        } else {
          navigate("/v3/estimates");
        }
      }
    } catch (err) {
      console.error("Save estimate error:", err);
      setServerError(err.response?.data?.message || err.message || "Failed to save quotation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dispatch / Send Estimate to customer
  const handleConfirmSend = async (sendPayload) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      let estId = activeSavedEstimate?.id || initialEstimate?.id || initialEstimate?._id;

      // If estimate hasn't been saved to DB yet, save it first as READY
      if (!estId) {
        const createPayload = {
          jobId: job?.id || job?._id || job?.jobId || jobId,
          customerId: job?.customerId,
          branchId: job?.branchId || branchId,
          branchName: job?.branchName || branchName,
          items: estimateData.items,
          discount: estimateData.discount,
          tax: estimateData.tax,
          deliveryCharge: estimateData.deliveryCharge,
          validUntil: estimateData.validUntil,
          termsAndConditions: estimateData.termsAndConditions,
          customerNotes: estimateData.customerNotes,
          internalNotes: estimateData.internalNotes,
          status: "READY"
        };
        const created = await createEstimate(createPayload);
        estId = created?.estimate?.id || created?.id;
      }

      const sentResult = await sendEstimateToCustomer(estId, sendPayload);
      const sentEst = sentResult?.estimate || sentResult;
      setSendModalOpen(false);

      const destId =
        sentEst?._id ||
        sentEst?.id ||
        sentEst?.estimateId ||
        sentEst?.jobId ||
        estId;

      if (onSaved) {
        onSaved(sentEst);
      } else if (destId && destId !== "undefined") {
        navigate(`/v3/estimates/${destId}`);
      } else {
        navigate("/v3/estimates");
      }
    } catch (err) {
      console.error("Send estimate error:", err);
      setServerError(err.response?.data?.message || err.message || "Failed to dispatch estimate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingJob) {
    return (
      <div className="v3-estimate-container" style={{ padding: "60px 0", textAlign: "center", color: "#64748b" }}>
        <Calculator size={36} style={{ animation: "pulse 1.5s infinite", margin: "0 auto 12px", color: "#047857" }} />
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Loading Job Order specifications...</p>
      </div>
    );
  }

  return (
    <div className="v3-estimate-container">
      {/* Header */}
      <div className="v3-estimate-header">
        <div>
          <div className="v3-breadcrumb">
            <span className="v3-breadcrumb-root">PrintZ V3</span>
            <span>/</span>
            <span>Job Orders</span>
            <span>/</span>
            <span>Commercial Estimate</span>
          </div>
          <div className="v3-estimate-title-row">
            <h1 className="v3-estimate-header-title">
              {initialEstimate ? `Edit Estimate ${initialEstimate.estimateNo}` : "Create Commercial Estimate"}
            </h1>
            <span className="v3-estimate-pill">
              {initialEstimate?.estimateNo || "NEW QUOTATION"}
            </span>
            <span className="v3-branch-pill">📍 {branchName}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="v3-btn-secondary"
            style={{ fontSize: "12px" }}
          >
            <ArrowLeft size={14} /> Back
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="v3-btn-secondary"
            style={{ fontSize: "12px", borderColor: "#047857", color: "#047857" }}
          >
            <Eye size={14} /> Preview Quote
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            className="v3-btn-secondary"
            style={{ fontSize: "12px", borderColor: "#94a3b8" }}
          >
            <Save size={14} /> Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            className="v3-btn-primary"
            style={{ fontSize: "12px" }}
          >
            <CheckCircle2 size={14} /> Mark as Ready
          </button>
        </div>
      </div>

      {/* Global Server Error Banner */}
      {serverError && (
        <div className="v3-warning-box" style={{ marginBottom: "20px", borderColor: "#f87171", backgroundColor: "#fef2f2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={20} color="#dc2626" />
            <div>
              <strong style={{ fontSize: "13px", color: "#991b1b" }}>Quotation Error:</strong>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#b91c1c" }}>{serverError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Read-only Job & Customer Reference Snapshot */}
      <div className="v3-info-grid-2">
        {/* Customer Details */}
        <div className="v3-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div className="v3-card-icon">
              <User size={16} />
            </div>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
              Customer Details
            </h4>
          </div>

          <div className="v3-summary-kv-row">
            <span className="v3-summary-k">Customer Name</span>
            <span className="v3-summary-v">{job?.customerName || "—"}</span>
          </div>
          <div className="v3-summary-kv-row">
            <span className="v3-summary-k">Customer Code</span>
            <span className="v3-summary-v" style={{ fontFamily: "monospace", color: "#047857" }}>
              {job?.customerCode || "—"}
            </span>
          </div>
          <div className="v3-summary-kv-row">
            <span className="v3-summary-k">Mobile Number</span>
            <span className="v3-summary-v">{job?.customerMobile || "—"}</span>
          </div>
          {job?.customerCompany && (
            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Company</span>
              <span className="v3-summary-v">{job.customerCompany}</span>
            </div>
          )}
        </div>

        {/* Job Order Details */}
        <div className="v3-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div className="v3-card-icon" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
              <Briefcase size={16} />
            </div>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
              Job Order Reference
            </h4>
          </div>

          <div className="v3-summary-kv-row">
            <span className="v3-summary-k">Job Order Number</span>
            <span className="v3-summary-v" style={{ fontFamily: "monospace", color: "#047857" }}>
              {job?.jobNo || jobId}
            </span>
          </div>
          <div className="v3-summary-kv-row">
            <span className="v3-summary-k">Job Title</span>
            <span className="v3-summary-v">{job?.jobTitle || "Print Order"}</span>
          </div>
          <div className="v3-summary-kv-row">
            <span className="v3-summary-k">Promised Delivery</span>
            <span className="v3-summary-v">{job?.expectedDeliveryDate || "Standard SLA"}</span>
          </div>
          <div className="v3-summary-kv-row">
            <span className="v3-summary-k">Item Count / Units</span>
            <span className="v3-summary-v">
              {job?.items?.length || 1} Products ({Number(job?.totalQuantity || 0).toLocaleString()} Total Units)
            </span>
          </div>
        </div>
      </div>

      {/* 12-Column Main Pricing Layout: 8 cols lines / 4 cols summary */}
      <div className="v3-estimate-layout-grid">
        {/* LEFT 8 COLUMNS: Job Items & Pricing Line Tables */}
        <div>
          {estimateData.items.map((item, itemIdx) => {
            const correspondingJobItem = (job?.items || [])[itemIdx] || null;
            return (
              <div key={item.jobItemId || itemIdx} className="v3-card" style={{ padding: "20px", marginBottom: "20px" }}>
                {/* Item Header & Technical Requirement Tags */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="v3-item-index-badge">{itemIdx + 1}</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                        {item.itemName} — {Number(item.quantity || 0).toLocaleString()} {item.unit || "PCS"}
                      </h3>
                      {correspondingJobItem && (
                        <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 6px", background: "#f1f5f9", borderRadius: "4px", color: "#475569" }}>
                            📄 {correspondingJobItem.material?.paperType || "Paper"} ({correspondingJobItem.material?.gsm || 300} GSM)
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 6px", background: "#f1f5f9", borderRadius: "4px", color: "#475569" }}>
                            🖨️ {correspondingJobItem.printing?.side === "DOUBLE_SIDE" ? "Double Side" : "Single Side"}
                          </span>
                          {correspondingJobItem.finishing?.length > 0 && (
                            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 6px", background: "#ecfdf5", borderRadius: "4px", color: "#047857" }}>
                              ✂️ {correspondingJobItem.finishing.join(", ")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddLine(itemIdx)}
                    className="v3-btn-secondary"
                    style={{ fontSize: "11px", padding: "6px 12px", height: "32px" }}
                  >
                    <Plus size={13} /> Add Charge Line
                  </button>
                </div>

                {/* Line Items Table */}
                <div className="v3-lines-table-wrapper">
                  <table className="v3-lines-table">
                    <thead>
                      <tr>
                        <th style={{ width: "32px", textAlign: "center" }}>#</th>
                        <th>Description / Pricing Item</th>
                        <th style={{ width: "160px" }}>Category</th>
                        <th style={{ width: "95px", textAlign: "right" }}>Qty</th>
                        <th style={{ width: "95px" }}>Unit</th>
                        <th style={{ width: "105px", textAlign: "right" }}>Rate (₹)</th>
                        <th style={{ width: "115px", textAlign: "right" }}>Amount (₹)</th>
                        <th style={{ width: "40px" }} />
                      </tr>
                    </thead>
                    <tbody>
                      {(item.lines || []).map((line, lineIdx) => (
                        <EstimateLineItemRow
                          key={line.lineId || lineIdx}
                          line={line}
                          index={lineIdx}
                          totalLines={item.lines.length}
                          onChange={(idx, updated) => handleLineChange(itemIdx, idx, updated)}
                          onRemove={(idx) => handleRemoveLine(itemIdx, idx)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Terms & Notes Card */}
          <div className="v3-card" style={{ padding: "20px" }}>
            <h3 className="v3-card-title" style={{ marginBottom: "14px" }}>
              Terms & Customer Instructions
            </h3>

            <div className="v3-grid-12">
              {/* Terms & Conditions (12 cols) */}
              <div className="v3-col-12">
                <div className="v3-form-group">
                  <label className="v3-form-label">Terms & Conditions (Shown on Quotation & PDF)</label>
                  <textarea
                    rows={4}
                    className="v3-input no-icon"
                    style={{ height: "auto", padding: "10px 12px", fontFamily: "inherit" }}
                    value={estimateData.termsAndConditions || ""}
                    onChange={(e) => setEstimateData((prev) => ({ ...prev, termsAndConditions: e.target.value }))}
                  />
                </div>
              </div>

              {/* Customer Notes (6 cols) */}
              <div className="v3-col-6">
                <div className="v3-form-group">
                  <label className="v3-form-label">Customer Quotation Note</label>
                  <input
                    type="text"
                    className="v3-input no-icon"
                    value={estimateData.customerNotes || ""}
                    onChange={(e) => setEstimateData((prev) => ({ ...prev, customerNotes: e.target.value }))}
                    placeholder="e.g. Free delivery on orders above ₹5,000"
                  />
                </div>
              </div>

              {/* Internal Staff Notes (6 cols) */}
              <div className="v3-col-6">
                <div className="v3-form-group">
                  <label className="v3-form-label">Internal Staff Notes (Hidden from Customer)</label>
                  <input
                    type="text"
                    className="v3-input no-icon"
                    value={estimateData.internalNotes || ""}
                    onChange={(e) => setEstimateData((prev) => ({ ...prev, internalNotes: e.target.value }))}
                    placeholder="e.g. Special paper discount requested by sales head"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 4 COLUMNS: Sticky Financial Summary & Dispatch Actions */}
        <div>
          <div className="v3-sticky-summary-panel">
            <div className="v3-summary-title">
              <span>Financial Summary</span>
              <Calculator size={18} color="#047857" />
            </div>

            {/* Subtotal */}
            <div className="v3-calc-row">
              <span>Subtotal:</span>
              <strong style={{ fontSize: "14px" }}>{formatCurrency(calculated.subtotal)}</strong>
            </div>

            {/* Discount Control */}
            <div style={{ margin: "10px 0", background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Commercial Discount</span>
                <div style={{ display: "inline-flex", background: "#e2e8f0", borderRadius: "4px", padding: "2px" }}>
                  <button
                    type="button"
                    onClick={() =>
                      setEstimateData((prev) => ({
                        ...prev,
                        discount: { ...prev.discount, type: "PERCENTAGE" }
                      }))
                    }
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                      backgroundColor: estimateData.discount?.type === "PERCENTAGE" ? "#047857" : "transparent",
                      color: estimateData.discount?.type === "PERCENTAGE" ? "#ffffff" : "#475569"
                    }}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEstimateData((prev) => ({
                        ...prev,
                        discount: { ...prev.discount, type: "AMOUNT" }
                      }))
                    }
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                      backgroundColor: estimateData.discount?.type === "AMOUNT" ? "#047857" : "transparent",
                      color: estimateData.discount?.type === "AMOUNT" ? "#ffffff" : "#475569"
                    }}
                  >
                    ₹ Fixed
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="v3-table-input"
                  style={{ textAlign: "right" }}
                  value={estimateData.discount?.value === 0 ? "" : (estimateData.discount?.value ?? "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEstimateData((prev) => ({
                      ...prev,
                      discount: {
                        ...prev.discount,
                        value: val === "" ? "" : Math.max(0, Number(val) || 0)
                      }
                    }));
                  }}
                  placeholder="0"
                />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#dc2626", minWidth: "80px", textAlign: "right" }}>
                  -{formatCurrency(calculated.discount.amount)}
                </span>
              </div>
            </div>

            {/* Delivery Charge */}
            <div style={{ margin: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Delivery / Shipping (₹)</span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                className="v3-table-input"
                style={{ textAlign: "right" }}
                value={estimateData.deliveryCharge === 0 ? "" : (estimateData.deliveryCharge ?? "")}
                onChange={(e) => {
                  const val = e.target.value;
                  setEstimateData((prev) => ({
                    ...prev,
                    deliveryCharge: val === "" ? "" : Math.max(0, Number(val) || 0)
                  }));
                }}
                placeholder="0.00"
              />
            </div>

            {/* Taxable Amount */}
            <div className="v3-calc-row" style={{ paddingTop: "6px" }}>
              <span>Taxable Amount:</span>
              <strong>{formatCurrency(calculated.taxableAmount)}</strong>
            </div>

            {/* Tax Configuration Selector */}
            <div style={{ margin: "10px 0" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                Applicable Tax Rate
              </label>
              <select
                className="v3-table-select"
                style={{ width: "100%", height: "36px" }}
                value={`${estimateData.tax?.type}_${estimateData.tax?.rate}`}
                onChange={(e) => {
                  const [tType, tRate] = e.target.value.split("_");
                  setEstimateData((prev) => ({
                    ...prev,
                    tax: { type: tType, rate: Number(tRate) }
                  }));
                }}
              >
                {TAX_RATES.map((tr) => (
                  <option key={`${tr.type}_${tr.rate}`} value={`${tr.type}_${tr.rate}`}>
                    {tr.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tax Details Split */}
            {calculated.tax.type === "GST" ? (
              <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: "6px", fontSize: "12px", color: "#475569", marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span>CGST ({calculated.tax.cgstRate}%):</span>
                  <strong>{formatCurrency(calculated.tax.cgstAmount)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>SGST ({calculated.tax.sgstRate}%):</span>
                  <strong>{formatCurrency(calculated.tax.sgstAmount)}</strong>
                </div>
              </div>
            ) : (
              <div className="v3-calc-row">
                <span>IGST ({calculated.tax.rate}%):</span>
                <strong>{formatCurrency(calculated.tax.taxAmount)}</strong>
              </div>
            )}

            <div className="v3-calc-divider" />

            {/* Prominent Grand Total Display */}
            <div className="v3-grand-total-box">
              <div>
                <span className="v3-grand-total-label">Grand Total</span>
                <div style={{ fontSize: "11px", color: "#065f46" }}>All inclusive quotation</div>
              </div>
              <span className="v3-grand-total-value">
                {formatCurrency(calculated.grandTotal)}
              </span>
            </div>

            {/* Validity Date Picker */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "4px" }}>
                Quotation Validity Until
              </label>
              <div className="v3-input-wrapper">
                <input
                  type="date"
                  className="v3-input no-icon"
                  min={new Date().toISOString().split("T")[0]}
                  value={estimateData.validUntil || ""}
                  onChange={(e) => setEstimateData((prev) => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setSendModalOpen(true)}
                disabled={isSubmitting || calculated.grandTotal <= 0}
                className="v3-btn-primary"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "12px",
                  fontSize: "13px",
                  backgroundColor: "#0284c7",
                  borderColor: "#0284c7"
                }}
              >
                <Send size={15} /> Send Quotation to Customer
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSubmitting || calculated.grandTotal <= 0}
                className="v3-btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: "13px" }}
              >
                <CheckCircle2 size={15} /> Mark as Ready
              </button>

              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSubmitting}
                className="v3-btn-secondary"
                style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: "13px" }}
              >
                <Save size={15} /> Save Draft
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EstimatePreviewModal
        estimate={{
          ...estimateData,
          estimateNo: initialEstimate?.estimateNo || "EST-2026-DRAFT",
          version: initialEstimate?.version || "V1",
          jobNo: job?.jobNo || jobId,
          jobTitle: job?.jobTitle || "Print Job",
          customerName: job?.customerName || "Customer",
          customerCode: job?.customerCode || "—",
          customerMobile: job?.customerMobile || "—",
          customerCompany: job?.customerCompany || "",
          branchName: job?.branchName || branchName,
          createdAt: new Date().toISOString(),
          subtotal: calculated.subtotal,
          discount: calculated.discount,
          taxableAmount: calculated.taxableAmount,
          tax: calculated.tax,
          deliveryCharge: calculated.deliveryCharge,
          grandTotal: calculated.grandTotal
        }}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onMarkReady={() => handleSave(true)}
        onSend={() => setSendModalOpen(true)}
      />

      <SendEstimateModal
        estimate={{
          ...estimateData,
          estimateNo: activeSavedEstimate?.estimateNo || initialEstimate?.estimateNo || "EST-2026-00001",
          jobNo: job?.jobNo || jobId,
          customerName: job?.customerName || "Customer",
          customerMobile: job?.customerMobile || "—",
          grandTotal: calculated.grandTotal,
          validUntil: estimateData.validUntil
        }}
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        onConfirmSend={handleConfirmSend}
        isSending={isSubmitting}
      />
    </div>
  );
}
