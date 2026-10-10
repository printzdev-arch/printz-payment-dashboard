import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Phone,
  Building,
  User,
  CheckCircle2,
  Clock,
  Printer,
  FileSpreadsheet,
  Scissors,
  Sparkles,
  Layers,
  FileText,
  Check,
  Calculator,
  Palette
} from "lucide-react";
import Badge from "../../../shared/components/Badge";
import { FINISHING_OPTIONS } from "../constants/jobConstants";
import "../../customer/styles/customerV3.css";
import "../styles/jobV3.css";

export default function JobDetailsView({
  job,
  onBack,
  className = ""
}) {
  const navigate = useNavigate();

  if (!job) {
    return (
      <div className="v3-card" style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "#64748b" }}>No job details found.</p>
        <button
          type="button"
          onClick={onBack || (() => navigate("/v3/jobs"))}
          className="v3-btn-secondary"
          style={{ fontSize: "12px", marginTop: "12px" }}
        >
          <ArrowLeft size={14} /> Back to Job Orders
        </button>
      </div>
    );
  }

  const getFinishingLabel = (fin) => {
    if (!fin) return "";
    if (typeof fin === "object") {
      return fin.name || fin.label || fin.code || fin.notes || "Finishing Option";
    }
    return FINISHING_OPTIONS.find((f) => f.id === fin)?.label || String(fin);
  };

  const items = job.items || [];
  const totalUnits = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const hasEstimate = !!(job.estimateId || job.estimateNo);

  // Workflow Pipeline Steps
  const workflowSteps = [
    { id: "CUSTOMER", label: "Customer Registration", status: "completed" },
    { id: "REQUIREMENTS", label: "Requirements Captured", status: "completed" },
    { id: "ESTIMATE", label: "Estimation & Pricing", status: hasEstimate ? "completed" : "current" },
    { id: "DESIGN", label: "Artwork & Proof", status: "pending" },
    { id: "PRODUCTION", label: "Print Production", status: "pending" },
    { id: "QC_DELIVERY", label: "QC & Dispatch", status: "pending" }
  ];

  const handleEstimateAction = () => {
    const jobId = job.id || job._id || job.jobId || job.jobNo;
    if (job.estimateId) {
      navigate(`/v3/estimates/${job.estimateId}`);
    } else {
      navigate(`/v3/estimates/new?jobId=${jobId}`, { state: { job } });
    }
  };

  return (
    <div className={`v3-job-container ${className}`}>
      {/* Top Header Card */}
      <div className="v3-job-header">
        <div className="v3-job-header-left">
          <div className="v3-breadcrumb">
            <span className="v3-breadcrumb-root">PrintZ V3</span>
            <span>/</span>
            <span>Job Orders</span>
            <span>/</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{job.jobNo || job.id}</span>
          </div>

          <div className="v3-job-title-row">
            <h1 className="v3-job-header-title">{job.jobTitle || "Job Order Details"}</h1>
            <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 800, padding: "3px 10px", backgroundColor: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: "6px" }}>
              {job.jobNo || job.jobId || "JOB-2026-00000"}
            </span>
            <Badge variant={job.priority === "URGENT" ? "danger" : job.priority === "HIGH" ? "warning" : "business"}>
              {job.priority || "NORMAL"}
            </Badge>
            <Badge variant={job.status === "REQUIREMENT_CAPTURED" ? "active" : "neutral"}>
              {job.status === "REQUIREMENT_CAPTURED" ? "Requirements Captured (Step 2 Completed)" : job.status || "DRAFT"}
            </Badge>
          </div>

          <p className="v3-job-header-sub">
            Order created on {job.createdAt ? new Date(job.createdAt).toLocaleString() : "Today"} • Branch: <strong>{job.branchName || "Banaswadi"}</strong>
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={onBack || (() => navigate("/v3/jobs"))}
            className="v3-btn-secondary"
            style={{ fontSize: "12px" }}
          >
            <ArrowLeft size={14} /> Back to Job List
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="v3-btn-secondary"
            style={{ fontSize: "12px" }}
          >
            <Printer size={14} /> Print Job Sheet
          </button>

          <button
            type="button"
            onClick={handleEstimateAction}
            className="v3-btn-secondary"
            style={{ fontSize: "12px" }}
          >
            <Calculator size={14} /> {hasEstimate ? `View Quotation (${job.estimateNo})` : "Create Commercial Estimate"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/design")}
            className="v3-btn-primary"
            style={{ fontSize: "12px", backgroundColor: "#0284c7", borderColor: "#0284c7", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Palette size={14} /> Design Workflow & Assignment →
          </button>
        </div>
      </div>

      {/* Step Pipeline Tracker */}
      <div className="v3-step-pipeline">
        {workflowSteps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className={`v3-step-node ${step.status}`}>
              <div className="v3-step-circle">
                {step.status === "completed" ? (
                  <Check size={16} />
                ) : step.status === "current" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div className="v3-step-label">{step.label}</div>
              <div className="v3-step-date">
                {step.status === "completed" ? "Done" : step.status === "current" ? "Active" : "Upcoming"}
              </div>
            </div>
            {idx < workflowSteps.length - 1 && (
              <div className={`v3-step-line ${step.status === "completed" ? "active" : ""}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Overview Grid: Customer Snapshot & Job Schedule */}
      <div className="v3-grid-12">
        {/* Customer Information Card */}
        <div className="v3-col-6">
          <div className="v3-card" style={{ padding: "20px", height: "100%", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div className="v3-card-icon">
                <User size={18} />
              </div>
              <div>
                <h3 className="v3-card-title">Customer Profile</h3>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>Customer Name:</span>
                <strong style={{ color: "#0f172a" }}>{job.customerName || "Customer"}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>Customer Code:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#047857" }}>
                  {job.customerCode || "—"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>Mobile Number:</span>
                <strong>{job.customerMobile || "—"}</strong>
              </div>

              {job.customerCompany && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                  <span style={{ color: "#64748b" }}>Company:</span>
                  <strong>{job.customerCompany}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Job Schedule & Notes Card */}
        <div className="v3-col-6">
          <div className="v3-card" style={{ padding: "20px", height: "100%", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div className="v3-card-icon" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="v3-card-title">Schedule & Delivery</h3>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>Promised Delivery:</span>
                <strong style={{ color: "#047857" }}>
                  {job.expectedDeliveryDate || "Standard Production SLA"}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>Order Source:</span>
                <strong>{job.source || "WALK_IN"}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>Total Items / Units:</span>
                <strong>{items.length} Items ({totalUnits.toLocaleString()} units)</strong>
              </div>

              {job.notes && (
                <div style={{ background: "#fffbeb", padding: "10px 12px", borderRadius: "8px", border: "1px solid #fde68a", fontSize: "12px", color: "#92400e" }}>
                  <strong>Global Note:</strong> {job.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Technical Specifications for each Job Item */}
      <div className="v3-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div className="v3-card-icon">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="v3-card-title">Manufacturing Specifications ({items.length} Items)</h3>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {items.map((item, idx) => (
            <div key={item.jobItemId || idx} className="v3-item-card" style={{ margin: 0 }}>
              <div className="v3-item-card-header">
                <div className="v3-item-badge-title">
                  <div className="v3-item-index-badge">{idx + 1}</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                      {item.itemName || `Item #${idx + 1}`}
                    </h4>
                    <span style={{ fontSize: "12px", color: "#047857", fontWeight: 700 }}>
                      Quantity: {Number(item.quantity || 0).toLocaleString()} {item.unit || "PCS"}
                    </span>
                  </div>
                </div>

                <Badge variant="business">{item.productType || "Custom Print"}</Badge>
              </div>

              <div className="v3-grid-12">
                {/* Size */}
                <div className="v3-col-3">
                  <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      Dimensions
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                      {item.size?.type === "CUSTOM"
                        ? `${item.size.width} × ${item.size.height} ${item.size.unit}`
                        : item.size?.presetName || "Standard Size"}
                    </div>
                  </div>
                </div>

                {/* Printing Side & Colour */}
                <div className="v3-col-3">
                  <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      Print Specifications
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                      {item.printing?.side === "DOUBLE_SIDE" ? "Double Side" : "Single Side"} • {item.printing?.colourMode || "Colour"}
                    </div>
                  </div>
                </div>

                {/* Material & GSM */}
                <div className="v3-col-3">
                  <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      Substrate / Paper
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                      {item.material?.paperType || "Art Card"} ({item.material?.gsm || 300} GSM)
                    </div>
                  </div>
                </div>

                {/* Design Service */}
                <div className="v3-col-3">
                  <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      Artwork & Design
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: item.designRequired ? "#047857" : "#64748b", marginTop: "4px" }}>
                      {item.designRequired ? "🎨 In-House Design Needed" : "✓ Customer Artwork Ready"}
                    </div>
                  </div>
                </div>

                {/* Finishing Tags (12 cols) */}
                <div className="v3-col-12">
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "6px" }}>
                    Post-Press Finishing Requirements:
                  </div>
                  <div className="v3-chips-grid">
                    {(item.finishing || []).length > 0 ? (
                      item.finishing.map((finItem, finIdx) => {
                        const finKey = typeof finItem === "object" ? (finItem._id || finItem.code || finItem.name || finIdx) : (finItem || finIdx);
                        return (
                          <span
                            key={String(finKey)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              backgroundColor: "#ecfdf5",
                              color: "#047857",
                              border: "1px solid #a7f3d0",
                              fontSize: "12px",
                              fontWeight: 600
                            }}
                          >
                            <Scissors size={11} />
                            {getFinishingLabel(finItem)}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>Standard Trim Cutting</span>
                    )}
                  </div>
                </div>

                {/* Notes if present */}
                {(item.designNotes || item.notes) && (
                  <div className="v3-col-12">
                    <div style={{ background: "#f1f5f9", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", color: "#334155" }}>
                      {item.designNotes && <div><strong>Design Brief:</strong> {item.designNotes}</div>}
                      {item.notes && <div><strong>Technical Note:</strong> {item.notes}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
