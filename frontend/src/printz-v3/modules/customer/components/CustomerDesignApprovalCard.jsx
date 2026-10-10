import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ArrowRight, Clock, AlertCircle } from "lucide-react";

/**
 * CustomerDesignApprovalCard
 * Displays pending or approved design proofs on the Customer Dashboard / Portal
 */
export default function CustomerDesignApprovalCard({
  jobNo = "JOB-2026-00001",
  itemName = "Business Card",
  proofVersion = "V1",
  status = "Awaiting Approval",
  assignmentId = "des_2026_00001",
  submittedOn = "07 Oct 2026, 03:30 PM",
  onReview
}) {
  const navigate = useNavigate();

  const handleReviewClick = () => {
    if (onReview) {
      onReview(assignmentId);
    } else {
      navigate(`/v3/customer/proof/${assignmentId}`);
    }
  };

  const isApproved = status === "APPROVED" || status === "Approved" || status === "DESIGN_APPROVED";
  const isRevision = status === "REVISION_REQUESTED" || status === "Changes Requested";

  return (
    <div
      className="v3-card"
      style={{
        padding: "16px 18px",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        transition: "all 0.2s ease",
        marginBottom: "12px"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Design Approval Required
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
            <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
              {itemName}
            </h4>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#047857",
                backgroundColor: "#ecfdf5",
                padding: "1px 6px",
                borderRadius: "4px",
                border: "1px solid #a7f3d0"
              }}
            >
              Proof {proofVersion}
            </span>
          </div>
        </div>

        <div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: isApproved ? "#166534" : isRevision ? "#991b1b" : "#047857",
              backgroundColor: isApproved ? "#dcfce7" : isRevision ? "#fee2e2" : "#ecfdf5",
              padding: "3px 8px",
              borderRadius: "999px",
              border: `1px solid ${isApproved ? "#bbf7d0" : isRevision ? "#fecaca" : "#a7f3d0"}`
            }}
          >
            {isApproved ? "Approved" : isRevision ? "Changes Requested" : "Awaiting Approval"}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px", color: "#64748b", marginBottom: "14px", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
        <div>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>Job Reference:</span><br />
          <strong style={{ fontFamily: "monospace", color: "#047857" }}>{jobNo}</strong>
        </div>
        <div>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>Submitted:</span><br />
          <strong style={{ color: "#334155" }}>{submittedOn}</strong>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={handleReviewClick}
          className="v3-btn-primary"
          style={{
            fontSize: "12px",
            height: "32px",
            padding: "0 14px",
            backgroundColor: "#047857",
            borderColor: "#047857",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <span>Review Sample</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
