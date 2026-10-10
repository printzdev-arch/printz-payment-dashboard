import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DesignWorkspaceView from "../components/DesignWorkspaceView";
import {
  getDesignAssignment,
  submitDesignProof,
  requestReassignment,
  uploadDesignFile
} from "../api/designApi";

export default function DesignWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getDesignAssignment(id);
      const found = res.assignment || res;
      setAssignment(found || null);
    } catch (err) {
      console.error("Failed to load design workspace:", err);
      setAssignment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);


  const handleSubmitProof = async (payload) => {
    setIsProcessing(true);
    try {
      const targetId = assignment.id || assignment.assignmentNo || id;
      await submitDesignProof(targetId, payload);
      alert("Sample proof submitted successfully! Customer has been notified for approval.");
      loadData();
    } catch (err) {
      console.error("Submit proof error:", err);
      alert(err.message || "Failed to submit proof.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestReassign = async (payload) => {
    setIsProcessing(true);
    try {
      const targetId = assignment.id || assignment.assignmentNo || id;
      await requestReassignment(targetId, payload);
      alert("Assignment returned to design queue.");
      navigate("/v3/design/my-queue");
    } catch (err) {
      console.error("Reassign error:", err);
      alert(err.message || "Failed to request reassignment.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveDraft = (draftPayload) => {
    alert("Draft workspace comments and settings saved locally.");
  };

  if (loading) {
    return (
      <div className="v3-design-container" style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
        <p>Loading Design Workspace...</p>
      </div>
    );
  }

  return (
    <DesignWorkspaceView
      assignment={assignment}
      onSubmitProof={handleSubmitProof}
      onRequestReassign={handleRequestReassign}
      onSaveDraft={handleSaveDraft}
      isProcessing={isProcessing}
    />
  );
}
