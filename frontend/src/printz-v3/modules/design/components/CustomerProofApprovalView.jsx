import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Download,
  Maximize2,
  Minimize2,
  GitCompare,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  Clock,
  Check,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  X,
  Layers,
  ChevronRight
} from "lucide-react";
import CustomerApproveProofModal from "./CustomerApproveProofModal";
import CustomerRequestProofChangesModal from "./CustomerRequestProofChangesModal";
import ProofCompareModal from "./ProofCompareModal";
import "../styles/designV3.css";

export default function CustomerProofApprovalView({
  assignment,
  isManagerView = false,
  onApprove,
  onRequestRevision,
  onManagerRecordDecision,
  isProcessing = false
}) {
  const navigate = useNavigate();

  const proofs = assignment?.proofs || [];
  const activeProof = proofs.length > 0 ? proofs[proofs.length - 1] : null;

  const [selectedVersion, setSelectedVersion] = useState(activeProof?.version || 1);
  const [activeFace, setActiveFace] = useState("ALL"); // "ALL" | "FRONT" | "BACK"
  const [zoomLevel, setZoomLevel] = useState(100);
  const [customerComment, setCustomerComment] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // Sync selected version if proofs change
  useEffect(() => {
    if (activeProof?.version) {
      setSelectedVersion(activeProof.version);
    }
  }, [activeProof?.version]);

  // Handle ESC key for fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  if (!assignment) {
    return (
      <div className="v3-design-container" style={{ textAlign: "center", padding: "60px 20px" }}>
        <p style={{ color: "#64748b", fontSize: "15px" }}>Design proof approval record not found.</p>
      </div>
    );
  }

  const req = assignment.requirementSnapshot || {};
  const currentDisplayedProof =
    proofs.find((p) => p.version === selectedVersion) || activeProof || {};
  const previousProof =
    proofs.find((p) => p.version === selectedVersion - 1) ||
    (selectedVersion > 1 ? proofs[0] : null);

  const isApproved = assignment.status === "APPROVED";
  const isRevisionRequested = assignment.status === "REVISION_REQUESTED";
  const isProofPending = assignment.status === "PROOF_PENDING";

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 50));
  };

  const handleApproveConfirm = ({ comments }) => {
    setApproveModalOpen(false);
    if (onApprove) {
      onApprove({
        proofVersion: activeProof?.version || selectedVersion,
        comments: comments || customerComment
      });
    }
  };

  const handleRevisionConfirm = ({ comments }) => {
    setRejectModalOpen(false);
    if (onRequestRevision) {
      onRequestRevision({
        proofVersion: activeProof?.version || selectedVersion,
        comments
      });
    }
  };

  const formattedSubmittedDate =
    currentDisplayedProof.uploadedAt ||
    assignment.updatedAt ||
    "07 Oct 2026, 03:30 PM";

  return (
    <div className="v3-design-container">
      {/* 1. Header & Breadcrumb */}
      <div className="v3-design-header">
        <div>
          <div className="v3-breadcrumb" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "12px", color: "#64748b" }}>
            <span
              onClick={() => navigate(isManagerView ? "/v3/design/queue" : "/customer-register")}
              style={{ cursor: "pointer", color: "#64748b", fontWeight: 600 }}
            >
              Dashboard
            </span>
            <span>/</span>
            <span
              onClick={() => navigate(isManagerView ? "/v3/design/queue" : "/customer-register")}
              style={{ cursor: "pointer", color: "#64748b", fontWeight: 600 }}
            >
              Design Approvals
            </span>
            <span>/</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#047857" }}>
              {assignment.jobNo || "JOB-2026-00001"}
            </span>
          </div>

          <h1 className="v3-design-title" style={{ margin: "6px 0 2px 0", fontSize: "24px", fontWeight: 900, color: "#0f172a" }}>
            DESIGN PROOF REVIEW
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            Review your design sample and approve it or request changes.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => navigate(isManagerView ? "/v3/design/queue" : "/customer-register")}
            className="v3-btn-secondary"
            style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <ArrowLeft size={15} /> Back to Jobs
          </button>
        </div>
      </div>

      {/* 2. Top Status Bar (Horizontal Row on Desktop / Stacked on Mobile) */}
      <div className="v3-proof-top-statusbar">
        <div>
          <div className="v3-status-field-label">JOB NUMBER</div>
          <div className="v3-status-field-value" style={{ fontFamily: "monospace", color: "#047857" }}>
            {assignment.jobNo || "JOB-2026-00001"}
          </div>
        </div>

        <div>
          <div className="v3-status-field-label">JOB ITEM</div>
          <div className="v3-status-field-value">{assignment.itemName || "Business Card"}</div>
        </div>

        <div>
          <div className="v3-status-field-label">PROOF VERSION</div>
          <div className="v3-status-field-value">V{currentDisplayedProof.version || selectedVersion}</div>
        </div>

        <div>
          <div className="v3-status-field-label">STATUS</div>
          <div className="v3-status-field-value">
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                color: isApproved
                  ? "#166534"
                  : isRevisionRequested
                  ? "#991b1b"
                  : "#047857",
                backgroundColor: isApproved
                  ? "#dcfce7"
                  : isRevisionRequested
                  ? "#fee2e2"
                  : "#ecfdf5",
                border: `1px solid ${
                  isApproved
                    ? "#bbf7d0"
                    : isRevisionRequested
                    ? "#fecaca"
                    : "#a7f3d0"
                }`
              }}
            >
              {isApproved
                ? "Design Approved"
                : isRevisionRequested
                ? "Changes Requested"
                : "Awaiting Approval"}
            </span>
          </div>
        </div>

        <div>
          <div className="v3-status-field-label">SUBMITTED ON</div>
          <div className="v3-status-field-value" style={{ fontSize: "12px", color: "#334155" }}>
            {formattedSubmittedDate}
          </div>
        </div>
      </div>

      {/* 3. Main 12-Column Responsive Layout (8 cols Left / 4 cols Right) */}
      <div className="v3-proof-layout-grid">
        {/* ===================== LEFT COLUMN (8 Cols): Design Sample Preview ===================== */}
        <div>
          <div className="v3-preview-card">
            {/* Header: Title & Proof Version Badge */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={18} color="#047857" />
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                  Design Sample
                </h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#047857", backgroundColor: "#ecfdf5", padding: "2px 8px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                  Proof V{currentDisplayedProof.version || selectedVersion}
                </span>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  className="v3-btn-secondary"
                  style={{ fontSize: "12px", padding: "4px 8px", height: "28px" }}
                  title="Fullscreen preview"
                >
                  <Maximize2 size={13} /> Fullscreen
                </button>
              </div>
            </div>

            {/* Preview Toolbar */}
            <div className="v3-preview-toolbar">
              {/* Left: File name */}
              <div style={{ fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                <FileText size={14} color="#059669" />
                <span>
                  {currentDisplayedProof.filename || `${assignment.itemName ? assignment.itemName.toLowerCase().replace(/\s+/g, "-") : "sample"}-proof-v${selectedVersion}.pdf`}
                </span>
              </div>

              {/* Center: Page / Face Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", marginRight: "4px" }}>Face:</span>
                <button
                  type="button"
                  onClick={() => setActiveFace("ALL")}
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: activeFace === "ALL" ? 700 : 500,
                    backgroundColor: activeFace === "ALL" ? "#047857" : "#ffffff",
                    color: activeFace === "ALL" ? "#ffffff" : "#475569",
                    border: "1px solid #cbd5e1",
                    cursor: "pointer"
                  }}
                >
                  Dual View (1 & 2)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFace("FRONT")}
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: activeFace === "FRONT" ? 700 : 500,
                    backgroundColor: activeFace === "FRONT" ? "#047857" : "#ffffff",
                    color: activeFace === "FRONT" ? "#ffffff" : "#475569",
                    border: "1px solid #cbd5e1",
                    cursor: "pointer"
                  }}
                >
                  Front (1 / 2)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFace("BACK")}
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: activeFace === "BACK" ? 700 : 500,
                    backgroundColor: activeFace === "BACK" ? "#047857" : "#ffffff",
                    color: activeFace === "BACK" ? "#ffffff" : "#475569",
                    border: "1px solid #cbd5e1",
                    cursor: "pointer"
                  }}
                >
                  Back (2 / 2)
                </button>
              </div>

              {/* Right: Zoom Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="v3-btn-secondary"
                  style={{ padding: "2px 6px", height: "26px" }}
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span style={{ fontSize: "11px", fontWeight: 700, minWidth: "38px", textAlign: "center" }}>
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="v3-btn-secondary"
                  style={{ padding: "2px 6px", height: "26px" }}
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            </div>

            {/* Preview Canvas with Zoom Transform */}
            <div className="v3-preview-canvas-wrapper">
              <div
                className="v3-preview-canvas-content"
                style={{
                  transform: `scale(${zoomLevel / 100})`
                }}
              >
                {/* Front Side Card Artwork */}
                {(activeFace === "ALL" || activeFace === "FRONT") && (
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                      width: "300px",
                      height: "175px",
                      padding: "18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      position: "relative",
                      overflow: "hidden",
                      boxSizing: "border-box"
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: "75px",
                        height: "100%",
                        background: "#064e3b",
                        transform: "skewX(-18deg) translateX(24px)"
                      }}
                    />
                    <div>
                      <div
                        style={{
                          display: "inline-block",
                          background: "#10b981",
                          color: "#ffffff",
                          fontWeight: 800,
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px"
                        }}
                      >
                        ABC
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a", marginTop: "6px" }}>
                        ABC PRINTERS
                      </div>
                      <div style={{ fontSize: "8px", color: "#64748b", letterSpacing: "1px" }}>
                        PRINT • DESIGN • DELIVER
                      </div>
                    </div>

                    <div style={{ position: "relative", zIndex: 2 }}>
                      <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>
                        {assignment.customerContactPerson || assignment.customerName || "Arjun Kumar"}
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>Managing Director</div>
                      <div style={{ fontSize: "9px", color: "#475569", marginTop: "4px", lineHeight: "1.3" }}>
                        📞 {assignment.customerMobile || "+91 98765 43210"}<br />
                        ✉️ {assignment.customerEmail || "arjun@abcprinters.com"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Back Side Card Artwork */}
                {(activeFace === "ALL" || activeFace === "BACK") && (
                  <div
                    style={{
                      background: "#064e3b",
                      borderRadius: "10px",
                      border: "1px solid #047857",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      width: "300px",
                      height: "175px",
                      padding: "18px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      textAlign: "center",
                      boxSizing: "border-box"
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: "24px", letterSpacing: "2px" }}>ABC</div>
                    <div style={{ fontSize: "10px", color: "#a7f3d0", letterSpacing: "1.5px", marginTop: "6px", fontWeight: 600 }}>
                      PRINT • DESIGN • DELIVER
                    </div>
                    <div style={{ fontSize: "8px", color: "#6ee7b7", marginTop: "8px" }}>
                      www.abcprinters.com
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Version Switcher Tabs & Tools */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginTop: "16px",
                paddingTop: "14px",
                borderTop: "1px solid #e2e8f0"
              }}
            >
              {/* Version selector pills */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>Versions:</span>
                {proofs.map((p) => {
                  const isCur = p.version === activeProof?.version;
                  const isSel = p.version === selectedVersion;
                  return (
                    <button
                      key={p.version}
                      type="button"
                      onClick={() => setSelectedVersion(p.version)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 700,
                        border: isSel ? "1px solid #047857" : "1px solid #e2e8f0",
                        backgroundColor: isSel ? "#ecfdf5" : "#ffffff",
                        color: isSel ? "#047857" : "#64748b",
                        cursor: "pointer"
                      }}
                    >
                      v{p.version} {isCur ? "(current)" : ""}
                    </button>
                  );
                })}
              </div>

              {/* Action Toolbar */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => alert(`Downloading high-resolution ${assignment.itemName || "design"} proof V${selectedVersion}...`)}
                  className="v3-btn-secondary"
                  style={{ fontSize: "12px", height: "32px", padding: "0 10px" }}
                >
                  <Download size={13} /> Download
                </button>

                {proofs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCompareModalOpen(true)}
                    className="v3-btn-secondary"
                    style={{ fontSize: "12px", height: "32px", padding: "0 10px", color: "#047857", borderColor: "#a7f3d0" }}
                  >
                    <GitCompare size={13} /> Compare v1 — v2
                  </button>
                )}
              </div>
            </div>

            {/* Proof History Timeline */}
            <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                Proof History
              </h4>
              <div className="v3-proof-timeline">
                {/* Proof V1 */}
                <div className="v3-proof-timeline-item">
                  <div className={`v3-proof-timeline-dot ${proofs.length > 1 ? "revision" : "pending"}`} />
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                    Proof V1 • Initial Submission
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Submitted on 07 Oct 2026, 03:30 PM by {assignment.assignedDesignerName || "Priya R"}
                  </div>
                  {proofs.length > 1 && (
                    <div style={{ marginTop: "4px", fontSize: "11px", color: "#b91c1c", background: "#fef2f2", padding: "4px 8px", borderRadius: "4px", border: "1px solid #fecaca" }}>
                      🔄 <strong>Changes Requested:</strong> "{previousProof?.customerFeedback || "Logo too small, add Tamil name."}"
                    </div>
                  )}
                </div>

                {/* Proof V2 if exists */}
                {proofs.length > 1 && (
                  <div className="v3-proof-timeline-item">
                    <div className={`v3-proof-timeline-dot ${isApproved ? "" : "pending"}`} />
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                      Proof V2 • Revised Artwork
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Submitted on 07 Oct 2026, 05:10 PM by {assignment.assignedDesignerName || "Priya R"}
                    </div>
                    {isApproved && (
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#166534", background: "#f0fdf4", padding: "4px 8px", borderRadius: "4px", border: "1px solid #bbf7d0" }}>
                        ✓ <strong>Approved by Customer:</strong> Ready for Production.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===================== RIGHT COLUMN (4 Cols): Details & Customer Actions ===================== */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Card 1: Design Details (Read-only Two-column key/value) */}
          <div className="v3-card" style={{ padding: "18px" }}>
            <h3 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
              Design Details
            </h3>

            <div className="v3-specs-table-grid">
              <div className="v3-spec-row">
                <span className="v3-spec-label">Job Number</span>
                <span className="v3-spec-value" style={{ fontFamily: "monospace", color: "#047857" }}>
                  {assignment.jobNo || "JOB-2026-00001"}
                </span>
              </div>

              <div className="v3-spec-row">
                <span className="v3-spec-label">Item</span>
                <span className="v3-spec-value">{assignment.itemName || "Business Card"}</span>
              </div>

              <div className="v3-spec-row">
                <span className="v3-spec-label">Quantity</span>
                <span className="v3-spec-value">{req.quantity || 500} {req.unit || "pcs"}</span>
              </div>

              <div className="v3-spec-row">
                <span className="v3-spec-label">Size</span>
                <span className="v3-spec-value">{req.size || "3.5 × 2 inch"}</span>
              </div>

              <div className="v3-spec-row">
                <span className="v3-spec-label">Printing</span>
                <span className="v3-spec-value">{req.sides || "Double Side"}</span>
              </div>

              <div className="v3-spec-row">
                <span className="v3-spec-label">Colour</span>
                <span className="v3-spec-value">{req.colors || "Full Colour"}</span>
              </div>

              <div className="v3-spec-row">
                <span className="v3-spec-label">Paper</span>
                <span className="v3-spec-value">{req.paper || "300 GSM Art Card"}</span>
              </div>

              <div className="v3-spec-row">
                <span className="v3-spec-label">Finishing</span>
                <span className="v3-spec-value">{req.lamination || "Matte Lamination"}</span>
              </div>
            </div>

            <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="v3-spec-label">Design Status</span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: isApproved ? "#166534" : isRevisionRequested ? "#991b1b" : "#047857",
                  backgroundColor: isApproved ? "#dcfce7" : isRevisionRequested ? "#fee2e2" : "#ecfdf5",
                  padding: "2px 8px",
                  borderRadius: "6px"
                }}
              >
                {isApproved
                  ? "Design Approved"
                  : isRevisionRequested
                  ? "Changes Requested"
                  : "Awaiting Customer Approval"}
              </span>
            </div>
          </div>

          {/* Card 2: Designer Message */}
          <div className="v3-card" style={{ padding: "16px" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
              Designer Message
            </h4>
            <div style={{ fontSize: "12px", color: "#334155", lineHeight: "1.5", background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              "{currentDisplayedProof.comments || "Please review the attached sample and confirm whether the design is ready for production."}"
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "11px", color: "#64748b" }}>
              <span>Submitted by: <strong>{assignment.assignedDesignerName || "Priya R (Designer)"}</strong></span>
              <span>{formattedSubmittedDate}</span>
            </div>
          </div>

          {/* Card 3: Customer Comments */}
          {!isApproved && !isRevisionRequested && (
            <div className="v3-card" style={{ padding: "16px" }}>
              <h4 style={{ margin: "0 0 6px 0", fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                Customer Comments
              </h4>
              <textarea
                className="v3-textarea"
                rows={3}
                placeholder="Add a comment (optional)"
                value={customerComment}
                maxLength={500}
                onChange={(e) => setCustomerComment(e.target.value)}
                style={{ fontSize: "12px", minHeight: "80px" }}
              />
              <div className="v3-char-counter">{customerComment.length} / 500</div>
            </div>
          )}

          {/* Card 4: Customer Action Card (Your Decision) */}
          <div className="v3-card" style={{ padding: "18px" }}>
            {isApproved ? (
              /* Approved State Card */
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "#047857",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 10px auto"
                  }}
                >
                  <Check size={24} />
                </div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 900, color: "#065f46" }}>
                  ✓ Design Approved
                </h3>
                <div style={{ fontSize: "12px", color: "#047857", fontWeight: 600 }}>
                  Approved Proof: V{activeProof?.version || selectedVersion}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  Approved On: 07 Oct 2026, 05:30 PM
                </div>

                <div
                  style={{
                    marginTop: "14px",
                    padding: "10px 12px",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#047857"
                  }}
                >
                  ● Next Stage: READY FOR PRODUCTION
                </div>
              </div>
            ) : isRevisionRequested ? (
              /* Revision Requested State Card */
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "#d97706",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 10px auto"
                  }}
                >
                  <RotateCcw size={22} />
                </div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 800, color: "#92400e" }}>
                  DESIGN REVISION REQUESTED
                </h3>
                <p style={{ margin: "4px 0 10px 0", fontSize: "12px", color: "#b45309" }}>
                  Your change request has been sent to the graphic designer.
                </p>

                <div
                  style={{
                    padding: "10px 12px",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "#92400e",
                    textAlign: "left"
                  }}
                >
                  <strong>Requested Changes:</strong><br />
                  "{assignment.revisionHistory?.[0]?.feedback || "Please change the phone number and enlarge the logo."}"
                </div>

                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "10px" }}>
                  Status: <strong>Revision in progress (Preparing Proof V{(activeProof?.version || 1) + 1})</strong>
                </div>
              </div>
            ) : (
              /* Active Pending Review State */
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                  Your Decision
                </h3>
                <p style={{ margin: "0 0 14px 0", fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>
                  Please review the design sample carefully before confirming your decision.
                </p>

                {/* Primary & Secondary Action Buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(true)}
                    disabled={isProcessing}
                    className="v3-btn-secondary"
                    style={{
                      fontSize: "12px",
                      height: "38px",
                      borderColor: "#cbd5e1",
                      color: "#334155",
                      fontWeight: 700
                    }}
                  >
                    <RotateCcw size={13} /> Request Changes
                  </button>

                  <button
                    type="button"
                    onClick={() => setApproveModalOpen(true)}
                    disabled={isProcessing}
                    className="v3-btn-primary"
                    style={{
                      fontSize: "12px",
                      height: "38px",
                      backgroundColor: "#047857",
                      borderColor: "#047857",
                      fontWeight: 700
                    }}
                  >
                    <Check size={14} /> Approve Sample
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Fullscreen Canvas Overlay Modal */}
      {isFullscreen && (
        <div className="v3-fullscreen-overlay">
          <div className="v3-fullscreen-header">
            <div>
              <strong style={{ fontSize: "16px" }}>
                {assignment.jobNo} • {assignment.itemName} (Proof V{selectedVersion})
              </strong>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Press ESC to exit fullscreen
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                padding: "6px"
              }}
            >
              <X size={24} />
            </button>
          </div>

          <div className="v3-fullscreen-body">
            <div
              style={{
                display: "flex",
                gap: "24px",
                justifyContent: "center",
                alignItems: "center",
                transform: `scale(${zoomLevel / 100})`,
                transition: "transform 0.2s ease-out"
              }}
            >
              {/* Front Side Fullscreen */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                  width: "360px",
                  height: "210px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "85px",
                    height: "100%",
                    background: "#064e3b",
                    transform: "skewX(-18deg) translateX(24px)"
                  }}
                />
                <div>
                  <div
                    style={{
                      display: "inline-block",
                      background: "#10b981",
                      color: "#ffffff",
                      fontWeight: 800,
                      fontSize: "11px",
                      padding: "2px 6px",
                      borderRadius: "4px"
                    }}
                  >
                    ABC
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 900, color: "#0f172a", marginTop: "8px" }}>
                    ABC PRINTERS
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748b", letterSpacing: "1px" }}>
                    PRINT • DESIGN • DELIVER
                  </div>
                </div>

                <div style={{ position: "relative", zIndex: 2 }}>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                    {assignment.customerContactPerson || assignment.customerName || "Arjun Kumar"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Managing Director</div>
                  <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px" }}>
                    📞 {assignment.customerMobile || "+91 98765 43210"}<br />
                    ✉️ {assignment.customerEmail || "arjun@abcprinters.com"}
                  </div>
                </div>
              </div>

              {/* Back Side Fullscreen */}
              <div
                style={{
                  background: "#064e3b",
                  borderRadius: "12px",
                  border: "1px solid #047857",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                  width: "360px",
                  height: "210px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  textAlign: "center"
                }}
              >
                <div style={{ fontWeight: 900, fontSize: "28px", letterSpacing: "2px" }}>ABC</div>
                <div style={{ fontSize: "11px", color: "#a7f3d0", letterSpacing: "1.5px", marginTop: "8px", fontWeight: 600 }}>
                  PRINT • DESIGN • DELIVER
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modals */}
      <CustomerApproveProofModal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        onConfirm={handleApproveConfirm}
        isProcessing={isProcessing}
        proofVersion={activeProof?.version || selectedVersion}
        jobNo={assignment.jobNo || "JOB-2026-00001"}
        itemName={assignment.itemName || "Business Card"}
      />

      <CustomerRequestProofChangesModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onSubmit={handleRevisionConfirm}
        isProcessing={isProcessing}
        proofVersion={activeProof?.version || selectedVersion}
        jobNo={assignment.jobNo || "JOB-2026-00001"}
        itemName={assignment.itemName || "Business Card"}
      />

      <ProofCompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        proofs={proofs}
      />
    </div>
  );
}
