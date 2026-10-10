import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import CustomerProofApprovalView from "../components/CustomerProofApprovalView";
import {
  getCustomerDesignApproval,
  managerRecordCustomerDecision
} from "../api/designProofApi";
import "../styles/designV3.css";

export default function ManagerSampleApprovalPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async (targetId) => {
    if (!targetId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getCustomerDesignApproval(targetId);
      const item = data?.approval || data?.assignment || data;
      setAssignment(item || null);
    } catch (err) {
      console.error("Failed to load sample approval:", err);
      setAssignment(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(id || "des_2026_00001");
  }, [id]);

  const handleManagerRecordDecision = async (payload) => {
    setIsProcessing(true);
    try {
      const targetId = assignment.id || assignment.assignmentNo || id;
      const res = await managerRecordCustomerDecision(targetId, payload);
      alert(res?.message || "Customer decision recorded successfully.");
      loadData(targetId);
    } catch (err) {
      console.error("Manager record decision error:", err);
      alert(err.response?.data?.message || err.message || "Failed to record customer decision.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "40px" }}>
      {isLoading ? (
        <div style={{ padding: "100px 20px", textAlign: "center", color: "#64748b" }}>
          <Loader2 size={36} style={{ animation: "spin 1s linear infinite", margin: "0 auto 14px", color: "#047857" }} />
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
            Loading Sample Approval #{id}...
          </p>
        </div>
      ) : (
        <CustomerProofApprovalView
          assignment={assignment}
          isManagerView={true}
          onManagerRecordDecision={handleManagerRecordDecision}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
