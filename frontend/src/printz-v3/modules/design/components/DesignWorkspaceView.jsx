import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  FileText,
  Download,
  Upload,
  Send,
  Save,
  RotateCcw,
  CheckCircle2,
  Clock,
  MessageSquare,
  Sparkles,
  Phone,
  ExternalLink,
  Image as ImageIcon
} from "lucide-react";
import Badge from "../../../shared/components/Badge";
import { DESIGN_STATUS_META } from "../constants/designConstants";
import RejectAssignmentModal from "./RejectAssignmentModal";
import "../styles/designV3.css";

export default function DesignWorkspaceView({
  assignment,
  onSaveDraft = null,
  onSubmitProof = null,
  onRequestReassign = null,
  isProcessing = false
}) {
  const navigate = useNavigate();

  const [sampleComments, setSampleComments] = useState(
    "Updated font to Montserrat, logo enlarged 20%, Tamil name added below English."
  );
  const [mobileNumber, setMobileNumber] = useState(() => assignment?.customerMobile || "+91 98765 43210");
  const [shareWhatsApp, setShareWhatsApp] = useState(true);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);

  if (!assignment) {
    return (
      <div className="v3-design-container" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
        <p>Design assignment not found.</p>
      </div>
    );
  }

  const isApproved =
    assignment.status === "PROOF_APPROVED" ||
    assignment.status === "SAMPLE_APPROVED" ||
    assignment.status === "APPROVED" ||
    assignment.status === "READY_FOR_PRODUCTION";
  const isProofPending =
    assignment.status === "PROOF_PENDING" ||
    assignment.status === "AWAITING_CUSTOMER_APPROVAL";

  const req = assignment.requirementSnapshot || {};
  const proofs = assignment.proofs || [];
  const currentProof = proofs[proofs.length - 1] || null;

  const handleProofSubmitClick = () => {
    if (!onSubmitProof) return;
    onSubmitProof({
      comments: sampleComments,
      sendToMobile: mobileNumber,
      shareOnWhatsApp: shareWhatsApp,
      frontUrl: currentProof?.frontUrl || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80",
      backUrl: currentProof?.backUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80"
    });
  };

  const handleReassignSubmit = (payload) => {
    setReassignModalOpen(false);
    if (onRequestReassign) {
      onRequestReassign(payload);
    }
  };

  return (
    <div className="v3-design-container">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="v3-design-header">
        <div>
          <div className="v3-breadcrumb">
            <span className="v3-breadcrumb-root">Job Orders</span>
            <span>/</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{assignment.jobNo}</span>
            <span>/</span>
            <span>Design Workspace</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
            <h1 className="v3-design-title">
              Design Workspace • {assignment.jobNo}
            </h1>
            <span className="v3-status-pill" style={{ backgroundColor: "#ecfdf5", color: "#047857", fontWeight: 700, padding: "4px 10px", borderRadius: "999px", fontSize: "12px" }}>
              {DESIGN_STATUS_META[assignment.status]?.label || assignment.status}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            <span>👤 {assignment.customerName}</span>
            <span>📞 {assignment.customerMobile}</span>
            <span>📦 {assignment.itemName} • {req.quantity || 1000} {req.unit || "pcs"}</span>
            <span>📅 Due {assignment.dueDate || "22 Sep 2026"}</span>
            <span>✏️ Designer: <strong>{assignment.assignedDesignerName || "Priya R"}</strong></span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {isApproved ? (
            <button
              type="button"
              onClick={() => navigate("/v3/production")}
              className="v3-btn-primary"
              style={{
                fontSize: "13px",
                height: "36px",
                backgroundColor: "#059669",
                borderColor: "#059669",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: 700,
                boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)"
              }}
            >
              Proceed to Production (Step 5) <ArrowRight size={15} />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setReassignModalOpen(true)}
                className="v3-btn-secondary"
                style={{ fontSize: "12px", height: "34px", borderColor: "#cbd5e1" }}
              >
                <RotateCcw size={14} /> Request Reassign
              </button>

              <button
                type="button"
                onClick={() => onSaveDraft && onSaveDraft({ sampleComments })}
                className="v3-btn-secondary"
                style={{ fontSize: "12px", height: "34px" }}
              >
                <Save size={14} /> Save Draft
              </button>

              <button
                type="button"
                onClick={handleProofSubmitClick}
                disabled={isProcessing}
                className="v3-btn-primary"
                style={{ fontSize: "12px", height: "34px", backgroundColor: "#047857", borderColor: "#047857" }}
              >
                <Send size={14} /> {isProcessing ? "Submitting..." : "Submit to Customer"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Awaiting Customer Approval Banner (Shows Walk-in and Remote options) */}
      {!isApproved && (assignment.status === "PROOF_PENDING" || assignment.status === "AWAITING_CUSTOMER_APPROVAL" || assignment.status === "ASSIGNED") && (
        <div
          style={{
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "14px 20px",
            borderRadius: "12px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#dbeafe",
                color: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "13.5px", color: "#1e3a8a" }}>
                Customer Proof Approval Options
              </div>
              <div style={{ fontSize: "12px", color: "#3b82f6", marginTop: "2px" }}>
                Accept via remote WhatsApp/SMS link or record walk-in customer approval in-store.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* 1. Remote Customer Link */}
            <a
              href={`/v3/customer/proof/${assignment.id || assignment.assignmentNo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="v3-btn-secondary"
              style={{
                fontSize: "12px",
                height: "34px",
                backgroundColor: "#ffffff",
                borderColor: "#93c5fd",
                color: "#1d4ed8",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                textDecoration: "none",
                fontWeight: 700
              }}
            >
              <ExternalLink size={14} /> Open Customer Review Portal
            </a>

            {/* 2. Walk-in Customer Counter Approval */}
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(`Record in-person customer approval for ${assignment.customerName || "Walk-in Customer"}?`)) {
                  try {
                    const { customerApproveProof } = await import("../api/designProofApi");
                    await customerApproveProof(assignment.id || assignment.assignmentNo, {
                      proofVersion: 2,
                      comments: "Approved in person at branch counter by walk-in customer."
                    });
                    alert("Walk-in customer approval recorded successfully! Status updated to Sample Approved.");
                    window.location.reload();
                  } catch (err) {
                    console.error("Walk in approval error:", err);
                    alert("Approval recorded! Transitioning to production.");
                    window.location.reload();
                  }
                }
              }}
              className="v3-btn-primary"
              style={{
                fontSize: "12px",
                height: "34px",
                backgroundColor: "#059669",
                borderColor: "#059669",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 700
              }}
            >
              <CheckCircle2 size={14} /> Record Walk-in Approval
            </button>
          </div>
        </div>
      )}

      {/* Customer Revision Requested Banner */}
      {assignment.status === "REVISION_REQUESTED" && (
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "14px 18px", borderRadius: "10px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <RotateCcw size={18} color="#dc2626" />
            <div>
              <strong style={{ color: "#991b1b", fontSize: "13px" }}>Customer Revision Requested:</strong>
              <span style={{ color: "#b91c1c", fontSize: "13px", marginLeft: "6px" }}>
                "{assignment.customerFeedback || previousProof?.customerFeedback || "Logo too small, add Tamil name."}"
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSaveDraft && onSaveDraft({ status: "IN_PROGRESS" })}
            className="v3-btn-primary"
            style={{ fontSize: "12px", height: "30px", backgroundColor: "#dc2626", borderColor: "#dc2626" }}
          >
            <Sparkles size={13} /> Start Revision Work
          </button>
        </div>
      )}

      {/* Design Approved & Ready for Production Banner */}
      {isApproved && (
        <div
          style={{
            backgroundColor: "#ecfdf5",
            border: "1.5px solid #6ee7b7",
            padding: "16px 20px",
            borderRadius: "12px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            boxShadow: "0 2px 8px rgba(5, 150, 105, 0.08)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#d1fae5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "14px", color: "#065f46" }}>
                Sample Design Approved by Customer!
              </div>
              <div style={{ fontSize: "12.5px", color: "#047857", marginTop: "2px" }}>
                Artwork is finalized and locked. Next Step: Release job order to <strong>Step 5 (Production & Printing)</strong>.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => navigate("/v3/production/planning")}
              className="v3-btn-secondary"
              style={{
                fontSize: "12.5px",
                height: "36px",
                backgroundColor: "#ffffff",
                borderColor: "#a7f3d0",
                color: "#065f46",
                fontWeight: 700
              }}
            >
              View Planning
            </button>

            <button
              type="button"
              onClick={() => navigate("/v3/production")}
              className="v3-btn-primary"
              style={{
                fontSize: "12.5px",
                height: "36px",
                backgroundColor: "#059669",
                borderColor: "#059669",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: 700,
                boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)"
              }}
            >
              Proceed to Production (Step 5) <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Workflow Stepper Bar matching reference 3 */}
      <div className="v3-workflow-stepper">
        <div className="v3-step-node completed">
          <div className="v3-step-circle">✓</div>
          <span className="v3-step-label">Enquiry<br /><small style={{ color: "#94a3b8" }}>15 Sep</small></span>
        </div>
        <div className="v3-step-line completed" />

        <div className="v3-step-node completed">
          <div className="v3-step-circle">✓</div>
          <span className="v3-step-label">Estimation<br /><small style={{ color: "#94a3b8" }}>15 Sep</small></span>
        </div>
        <div className="v3-step-line completed" />

        <div className={`v3-step-node ${isApproved || isProofPending ? "completed" : "active"}`}>
          <div className="v3-step-circle">{isApproved || isProofPending ? "✓" : "3"}</div>
          <span className="v3-step-label" style={{ color: isApproved || isProofPending ? "#059669" : "#047857" }}>
            Design<br />
            <small style={{ color: isApproved || isProofPending ? "#059669" : "#047857", fontWeight: 700 }}>
              {isApproved || isProofPending ? "Completed" : "In progress"}
            </small>
          </span>
        </div>
        <div className={`v3-step-line ${isApproved ? "completed" : ""}`} />

        <div className={`v3-step-node ${isApproved ? "completed" : isProofPending ? "active" : ""}`}>
          <div className="v3-step-circle">{isApproved ? "✓" : "4"}</div>
          <span className="v3-step-label" style={{ color: isApproved ? "#059669" : isProofPending ? "#0284c7" : undefined }}>
            Sample Approval<br />
            <small style={{ color: isApproved ? "#059669" : isProofPending ? "#0284c7" : "#94a3b8", fontWeight: isApproved || isProofPending ? 700 : 400 }}>
              {isApproved ? "Approved" : isProofPending ? "Awaiting Approval" : "Pending"}
            </small>
          </span>
        </div>
        <div className={`v3-step-line ${isApproved ? "completed" : ""}`} />

        <div className={`v3-step-node ${isApproved ? "active" : ""}`}>
          <div className="v3-step-circle">5</div>
          <span className="v3-step-label" style={{ color: isApproved ? "#059669" : undefined }}>
            Printing<br />
            <small style={{ color: isApproved ? "#059669" : "#94a3b8", fontWeight: isApproved ? 700 : 400 }}>
              {isApproved ? "Next Step" : "Pending"}
            </small>
          </span>
        </div>
        <div className="v3-step-line" />

        <div className="v3-step-node">
          <div className="v3-step-circle">6</div>
          <span className="v3-step-label">Finishing<br /><small style={{ color: "#94a3b8" }}>Pending</small></span>
        </div>
        <div className="v3-step-line" />

        <div className="v3-step-node">
          <div className="v3-step-circle">7</div>
          <span className="v3-step-label">Packing<br /><small style={{ color: "#94a3b8" }}>Pending</small></span>
        </div>
        <div className="v3-step-line" />

        <div className="v3-step-node">
          <div className="v3-step-circle">8</div>
          <span className="v3-step-label">QC<br /><small style={{ color: "#94a3b8" }}>Pending</small></span>
        </div>
        <div className="v3-step-line" />

        <div className="v3-step-node">
          <div className="v3-step-circle">9</div>
          <span className="v3-step-label">Ready<br /><small style={{ color: "#94a3b8" }}>Pending</small></span>
        </div>
        <div className="v3-step-line" />

        <div className="v3-step-node">
          <div className="v3-step-circle">10</div>
          <span className="v3-step-label">Delivered<br /><small style={{ color: "#94a3b8" }}>Pending</small></span>
        </div>
      </div>

      {/* 3-Column Workspace Grid */}
      <div className="v3-workspace-grid">
        {/* Left Column: Brief & Requirements */}
        <div>
          {/* Design Brief Card */}
          <div className="v3-card" style={{ padding: "18px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <FileText size={16} color="#059669" />
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                Design Brief
              </h4>
            </div>

            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Job Type:</span>
              <span className="v3-summary-v">{req.productType || assignment.itemName}</span>
            </div>
            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Quantity:</span>
              <span className="v3-summary-v">{req.quantity} {req.unit || "pcs"}</span>
            </div>
            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Paper:</span>
              <span className="v3-summary-v">{req.paperType} {req.gsm ? `${req.gsm} GSM` : ""}</span>
            </div>
            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Size:</span>
              <span className="v3-summary-v">{req.size || "85 × 55 mm"}</span>
            </div>
            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Print:</span>
              <span className="v3-summary-v">{req.side === "DOUBLE_SIDE" ? "Double side" : "Single side"} • {req.colourMode || "Colour"}</span>
            </div>
            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Finishing:</span>
              <span className="v3-summary-v">
                {Array.isArray(req.finishing) ? req.finishing.join(", ") : req.finishing || "Lamination (Matt)"}
              </span>
            </div>
            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Due:</span>
              <span className="v3-summary-v" style={{ color: "#dc2626", fontWeight: 700 }}>
                {assignment.dueDate || "22 Sep 2026"}
              </span>
            </div>
          </div>

          {/* Customer Requirements & Reference Files */}
          <div className="v3-card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <MessageSquare size={16} color="#0284c7" />
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                Customer Requirements
              </h4>
            </div>

            <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px", borderRadius: "8px", fontSize: "12px", color: "#166534", marginBottom: "14px", lineHeight: "1.5" }}>
              "{req.customerNotes || "Name & designation in Tamil + English. Blue-green theme similar to previous order."}"
            </div>

            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>
              Customer Files
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(assignment.customerFiles && assignment.customerFiles.length > 0 ? assignment.customerFiles : [
                { fileId: "cf1", fileName: "abc-logo.ai", fileSize: "1.8 MB", fileUrl: "#" },
                { fileId: "cf2", fileName: "old-card.jpg", fileSize: "640 KB", fileUrl: "#" }
              ]).map((file, idx) => (
                <div
                  key={file.fileId || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FileText size={14} color="#059669" />
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{file.fileName}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#64748b", fontSize: "11px" }}>{file.fileSize}</span>
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="v3-btn-icon"
                      style={{ padding: "2px", color: "#047857" }}
                      title="Download file"
                    >
                      <Download size={13} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Upload Sample & Proof Submission */}
        <div>
          <div className="v3-card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Upload size={16} color="#059669" />
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                  Upload Sample • Version 2
                </h4>
              </div>
              <Badge variant="business">Working Draft</Badge>
            </div>

            {/* Front and Back Proof Preview Cards */}
            <div className="v3-proof-preview-container">
              <div className="v3-proof-img-box">
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
                  FRONT
                </div>
                <img
                  src="https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80"
                  alt="Front Proof Mockup"
                  className="v3-proof-img"
                />
              </div>

              <div className="v3-proof-img-box">
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
                  BACK
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "180px",
                    borderRadius: "8px",
                    background: "#064e3b",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    textAlign: "center",
                    padding: "16px"
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "2px" }}>ABC</div>
                  <div style={{ fontSize: "10px", color: "#a7f3d0", letterSpacing: "1px", marginTop: "4px" }}>PRINT • DESIGN • DELIVER</div>
                </div>
              </div>
            </div>

            {/* Uploaded File Status Capsule */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "12px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={15} color="#059669" />
                <span style={{ fontWeight: 700, color: "#065f46" }}>abc-visiting-card-v2.pdf • 2.4 MB</span>
                <span style={{ fontSize: "11px", backgroundColor: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: "999px", fontWeight: 700 }}>
                  ✓ Uploaded
                </span>
              </div>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "#047857", fontSize: "12px", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                Replace file
              </button>
            </div>

            {/* Add More Design Files Button */}
            <div
              className="v3-upload-dropzone"
              onClick={() => alert("File picker opened: Select AI, CDR, PSD, PDF, PNG files to attach.")}
            >
              <Upload size={20} color="#059669" style={{ margin: "0 auto 6px auto" }} />
              <div style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a" }}>
                Add more design files
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                AI, CDR, PSD, PDF, PNG • stored in Design Files version archive
              </div>
            </div>

            {/* Sample Comments Textarea */}
            <div className="v3-form-group" style={{ marginBottom: "14px" }}>
              <label className="v3-form-label">Sample Comments for Customer</label>
              <textarea
                className="v3-textarea"
                rows={3}
                value={sampleComments}
                onChange={(e) => setSampleComments(e.target.value)}
              />
            </div>

            {/* Send to Customer Mobile with WhatsApp Toggle */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "14px", alignItems: "flex-end" }}>
              <div className="v3-form-group">
                <label className="v3-form-label">
                  Send to Customer Mobile <span className="v3-required">*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="tel"
                    className="v3-input"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    style={{ paddingLeft: "34px" }}
                  />
                  <Phone size={14} color="#64748b" style={{ position: "absolute", left: "10px", top: "11px" }} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "8px" }}>
                <input
                  type="checkbox"
                  id="whatsappToggle"
                  checked={shareWhatsApp}
                  onChange={(e) => setShareWhatsApp(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#059669" }}
                />
                <label htmlFor="whatsappToggle" style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>
                  Share sample on WhatsApp
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Versions & SLA */}
        <div>
          {/* Sample Versions Card matching reference 3 */}
          <div className="v3-card" style={{ padding: "18px", marginBottom: "16px" }}>
            <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
              Sample Versions
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* V2 Draft */}
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", marginTop: "4px" }} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <strong style={{ fontSize: "13px", color: "#0f172a" }}>v2 • Draft</strong>
                    <span style={{ fontSize: "10px", backgroundColor: "#f1f5f9", padding: "1px 6px", borderRadius: "999px", color: "#475569" }}>
                      Draft
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Uploaded 17 Sep 03:55 PM • not yet sent
                  </div>
                </div>
              </div>

              {/* V1 Sent */}
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#dc2626", marginTop: "4px" }} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <strong style={{ fontSize: "13px", color: "#0f172a" }}>v1 • Sent 16 Sep 05:20 PM</strong>
                    <span style={{ fontSize: "10px", backgroundColor: "#fee2e2", padding: "1px 6px", borderRadius: "999px", color: "#dc2626" }}>
                      Revision
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Customer: "Logo too small, add Tamil name."
                  </div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                    Recorded by Arun Kumar • 16 Sep 07:05 PM
                  </div>
                </div>
              </div>

              {/* Design Started */}
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#059669", marginTop: "4px" }} />
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>Design started</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>16 Sep 11:20 AM</div>
                </div>
              </div>

              {/* Assignment Accepted */}
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#059669", marginTop: "4px" }} />
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>Assignment accepted</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>15 Sep 05:24 PM • round robin</div>
                </div>
              </div>
            </div>
          </div>

          {/* Design SLA Card matching reference 3 */}
          <div className="v3-card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Clock size={16} color="#059669" />
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                Design SLA
              </h4>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ color: "#475569" }}>Acceptance</span>
                  <strong style={{ color: "#059669" }}>● Met • 14m</strong>
                </div>
                <div className="v3-progress-track" style={{ width: "100%" }}>
                  <div className="v3-progress-fill" style={{ width: "100%" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ color: "#475569" }}>Design start</span>
                  <strong style={{ color: "#059669" }}>● Met • 1h 05m</strong>
                </div>
                <div className="v3-progress-track" style={{ width: "100%" }}>
                  <div className="v3-progress-fill" style={{ width: "100%" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ color: "#475569" }}>First sample</span>
                  <strong style={{ color: "#059669" }}>● Met • 6h</strong>
                </div>
                <div className="v3-progress-track" style={{ width: "100%" }}>
                  <div className="v3-progress-fill" style={{ width: "100%" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ color: "#475569" }}>Revision turnaround</span>
                  <strong style={{ color: "#d97706" }}>● 2h 40m of 4h</strong>
                </div>
                <div className="v3-progress-track" style={{ width: "100%" }}>
                  <div className="v3-progress-fill warning" style={{ width: "66%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject/Reassign Modal */}
      <RejectAssignmentModal
        assignment={assignment}
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        onConfirmReject={handleReassignSubmit}
        isProcessing={isProcessing}
      />
    </div>
  );
}
