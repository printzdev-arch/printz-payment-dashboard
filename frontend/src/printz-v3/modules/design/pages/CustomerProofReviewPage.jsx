import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import CustomerProofApprovalView from "../components/CustomerProofApprovalView";
import {
  getCustomerDesignApproval,
  customerApproveProof,
  customerRequestProofChanges
} from "../api/designProofApi";
import "../styles/designV3.css";

export default function CustomerProofReviewPage() {
  const { id, token } = useParams();
  const activeId = token || id;
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async (targetId) => {
    if (!targetId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCustomerDesignApproval(targetId);
      const item = data?.approval || data?.assignment || data;
      setAssignment(item || null);
    } catch (err) {
      console.error("Failed to load customer design proof:", err);
      setError("Failed to load design proof from database.");
      setAssignment(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeId || "des_2026_00001");
  }, [activeId]);

  const handleApprove = async ({ proofVersion, comments }) => {
    setIsProcessing(true);
    try {
      const targetId = assignment.id || assignment.assignmentNo || id;
      const res = await customerApproveProof(targetId, { proofVersion, comments });
      alert(res?.message || "Sample proof approved successfully! The manufacturing team will now begin production.");
      loadData(targetId);
    } catch (err) {
      console.error("Approve proof error:", err);
      alert(err.response?.data?.message || err.message || "Failed to approve design proof.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestRevision = async ({ proofVersion, comments }) => {
    setIsProcessing(true);
    try {
      const targetId = assignment.id || assignment.assignmentNo || id;
      const res = await customerRequestProofChanges(targetId, { proofVersion, comments });
      alert(res?.message || "Revision requested. The designer has been notified to prepare an updated proof.");
      loadData(targetId);
    } catch (err) {
      console.error("Request revision error:", err);
      alert(err.response?.data?.message || err.message || "Failed to submit revision request.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", overflowY: "auto", backgroundColor: "#f8fafc", paddingBottom: "80px", boxSizing: "border-box" }}>
      {isLoading ? (
        <div style={{ padding: "100px 20px", textAlign: "center", color: "#64748b" }}>
          <Loader2 size={36} style={{ animation: "spin 1s linear infinite", margin: "0 auto 14px", color: "#047857" }} />
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
            Loading Design Proof #{id}...
          </p>
          <span style={{ fontSize: "12px", color: "#64748b" }}>Connecting securely to PrintZ Design Portal</span>
        </div>
      ) : error ? (
        <div style={{ maxWidth: "600px", margin: "60px auto", padding: "0 16px" }}>
          <div style={{ border: "1px solid #f87171", backgroundColor: "#fef2f2", padding: "28px", borderRadius: "14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <AlertCircle size={28} color="#dc2626" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: "16px", color: "#991b1b" }}>Proof Link Expired or Not Found</strong>
                <p style={{ margin: "6px 0 16px 0", fontSize: "13px", color: "#b91c1c", lineHeight: "1.5" }}>
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/customer-register")}
                  className="v3-btn-secondary"
                  style={{ fontSize: "12px" }}
                >
                  <ArrowLeft size={14} /> Go to Customer Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <CustomerProofApprovalView
          assignment={assignment}
          isManagerView={false}
          onApprove={handleApprove}
          onRequestRevision={handleRequestRevision}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
