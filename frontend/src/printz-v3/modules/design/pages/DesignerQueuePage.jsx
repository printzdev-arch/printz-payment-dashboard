import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Palette,
  Star,
  Clock,
  Briefcase,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FileText
} from "lucide-react";
import Badge from "../../../shared/components/Badge";
import RejectAssignmentModal from "../components/RejectAssignmentModal";
import {
  getDesignQueue,
  startDesign,
  requestReassignment
} from "../api/designApi";
import "../styles/designV3.css";

export default function DesignerQueuePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedJob, setSelectedJob] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const designerName = "Priya R";

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getDesignQueue();
      const raw = Array.isArray(res)
        ? res
        : (Array.isArray(res?.assignments) ? res.assignments : (Array.isArray(res?.data) ? res.data : []));
      const list = raw.map((j) => ({
        id: j._id || j.id,
        assignmentNo: j.assignmentNo || `DES-${j.jobNo ? j.jobNo.replace(/^JO-/, "") : "JOB"}`,
        jobNo: j.jobNo || "JOB-PENDING",
        customerName: j.customerName || j.customerSnapshot?.name || "Walk-in Customer",
        itemName: j.itemName || j.title || "Custom Artwork",
        status: j.status || (j.designerId ? "ASSIGNED" : "UNASSIGNED"),
        priority: j.priority || "NORMAL",
        slaUrgency: j.slaUrgency || "1h 40m",
        requirementSnapshot: j.requirementSnapshot || {
          paperType: "300 GSM Art Card",
          size: "Standard",
          quantity: j.quantity || 1000
        },
        ...j
      }));
      setAssignments(list);
      if (list.length > 0 && !selectedJob) {
        setSelectedJob(list[0]);
      } else if (list.length === 0) {
        setSelectedJob(null);
      }
    } catch (err) {
      console.error("Failed to load designer queue:", err);
      setAssignments([]);
      setSelectedJob(null);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadData();
  }, []);

  const pendingAcceptanceList = assignments.filter((a) => a.status === "ASSIGNED");
  const inDesignList = assignments.filter((a) => a.status === "IN_PROGRESS");
  const proofPendingList = assignments.filter((a) => a.status === "PROOF_PENDING");
  const revisionList = assignments.filter((a) => a.status === "REVISION_REQUESTED" || a.rejectionReason || a.proofs?.some((p) => p.status === "REVISED"));


  const filteredAssignments = (() => {
    switch (activeTab) {
      case "PENDING":
        return pendingAcceptanceList;
      case "IN_DESIGN":
        return inDesignList;
      case "AWAITING":
        return proofPendingList;
      case "REVISION":
        return revisionList;
      default:
        return assignments;
    }
  })();

  const handleAcceptAssignment = async (job) => {
    setIsProcessing(true);
    try {
      await startDesign(job.id || job.assignmentNo);
      setFeedbackMsg(`Assignment accepted! Opened workspace for ${job.jobNo}`);
      setTimeout(() => setFeedbackMsg(null), 3000);
      loadData();
      navigate(`/v3/design/workspace/${job.id || job.assignmentNo}`);
    } catch (err) {
      console.error("Accept error:", err);
      alert(err.message || "Failed to accept assignment.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenRejectModal = (job) => {
    setSelectedJob(job);
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (payload) => {
    setIsProcessing(true);
    try {
      await requestReassignment(selectedJob.id || selectedJob.assignmentNo, payload);
      setRejectModalOpen(false);
      setFeedbackMsg(`Assignment returned to design queue.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
      loadData();
    } catch (err) {
      console.error("Reject error:", err);
      alert(err.message || "Failed to reject assignment.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="v3-design-container">
      {/* Top Greeting Header matching reference image 2 */}
      <div className="v3-design-header">
        <div>
          <div className="v3-breadcrumb">
            <span className="v3-breadcrumb-root">Design</span>
            <span>/</span>
            <span>My Design Queue</span>
          </div>

          <h1 className="v3-design-title" style={{ fontSize: "24px" }}>
            Good morning, Priya 👋
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#d97706", fontWeight: 700 }}>
              <Star size={14} fill="#d97706" /> Rating 4.8 (31)
            </span>
            <span>•</span>
            <span style={{ color: "#047857", fontWeight: 700 }}>
              SLA this month 96%
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => navigate("/v3/design")}
            className="v3-btn-secondary"
            style={{ fontSize: "12px", height: "34px" }}
          >
            <Palette size={14} /> Allocation Queue (Manager View)
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px 18px", borderRadius: "10px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", color: "#166534", fontSize: "13px" }}>
          <CheckCircle2 size={18} color="#16a34a" />
          <strong>{feedbackMsg}</strong>
        </div>
      )}

      {/* KPI Cards Grid matching reference image 2 */}
      <div className="v3-designer-kpi-grid">
        <div
          className={`v3-kpi-card ${activeTab === "PENDING" ? "active" : ""}`}
          onClick={() => setActiveTab("PENDING")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="v3-kpi-val" style={{ color: "#d97706" }}>{pendingAcceptanceList.length || 2}</span>
            <span style={{ fontSize: "16px" }}>🔔</span>
          </div>
          <div className="v3-kpi-label">Pending acceptance</div>
        </div>

        <div
          className={`v3-kpi-card ${activeTab === "IN_DESIGN" ? "active" : ""}`}
          onClick={() => setActiveTab("IN_DESIGN")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="v3-kpi-val" style={{ color: "#059669" }}>{inDesignList.length || 3}</span>
            <span style={{ fontSize: "16px" }}>✏️</span>
          </div>
          <div className="v3-kpi-label">In design</div>
        </div>

        <div
          className="v3-kpi-card"
          onClick={() => setActiveTab("IN_DESIGN")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="v3-kpi-val" style={{ color: "#0284c7" }}>1</span>
            <span style={{ fontSize: "16px" }}>⬆️</span>
          </div>
          <div className="v3-kpi-label">Samples to submit</div>
        </div>

        <div
          className={`v3-kpi-card ${activeTab === "AWAITING" ? "active" : ""}`}
          onClick={() => setActiveTab("AWAITING")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="v3-kpi-val" style={{ color: "#9333ea" }}>{proofPendingList.length || 1}</span>
            <span style={{ fontSize: "16px" }}>🖼️</span>
          </div>
          <div className="v3-kpi-label">Awaiting customer</div>
        </div>

        <div
          className={`v3-kpi-card ${activeTab === "REVISION" ? "active" : ""}`}
          onClick={() => setActiveTab("REVISION")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="v3-kpi-val" style={{ color: "#dc2626" }}>{revisionList.length || 1}</span>
            <span style={{ fontSize: "16px" }}>🔄</span>
          </div>
          <div className="v3-kpi-label">Revision requests</div>
        </div>

        <div className="v3-kpi-card">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="v3-kpi-val" style={{ color: "#16a34a" }}>18</span>
            <span style={{ fontSize: "16px" }}>✓</span>
          </div>
          <div className="v3-kpi-label">Completed (Sep)</div>
        </div>
      </div>

      {/* Tabs Filter Row matching reference image 2 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { id: "ALL", label: `All ${assignments.length}` },
            { id: "PENDING", label: `Pending acceptance ${pendingAcceptanceList.length}` },
            { id: "IN_DESIGN", label: `In design ${inDesignList.length}` },
            { id: "AWAITING", label: `Awaiting customer ${proofPendingList.length}` },
            { id: "REVISION", label: `Revision ${revisionList.length}` }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={activeTab === t.id ? "v3-btn-primary" : "v3-btn-secondary"}
              style={{ fontSize: "12px", height: "32px", padding: "4px 12px" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span style={{ fontSize: "12px", color: "#64748b" }}>
          Sorted by SLA urgency
        </span>
      </div>

      {/* 2-Column Main Layout: Assignment Cards List (Left 7 cols) + Selected Job Detail Panel (Right 5 cols) */}
      <div className="v3-design-grid" style={{ gridTemplateColumns: "1fr 400px" }}>
        {/* Left List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredAssignments.map((job) => {
            const isAssigned = job.status === "ASSIGNED";
            const isRevision = job.rejectionReason || job.proofs?.length > 1;
            const isSelected = selectedJob?.id === job.id;

            return (
              <div
                key={job.id || job.assignmentNo}
                onClick={() => setSelectedJob(job)}
                className="v3-card"
                style={{
                  padding: "16px 18px",
                  cursor: "pointer",
                  border: isSelected ? "2px solid #10b981" : "1px solid #e2e8f0",
                  backgroundColor: isSelected ? "#f0fdf4" : "#ffffff",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: isAssigned ? "#fef3c7" : isRevision ? "#fee2e2" : "#ecfdf5",
                        color: isAssigned ? "#d97706" : isRevision ? "#dc2626" : "#059669",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {isAssigned ? "🔔" : isRevision ? "🔄" : "✏️"}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#0f172a" }}>
                          {job.jobNo}
                        </span>
                        {isAssigned && (
                          <span style={{ fontSize: "10px", fontWeight: 800, backgroundColor: "#fef3c7", color: "#d97706", padding: "1px 6px", borderRadius: "999px" }}>
                            NEW ASSIGNMENT
                          </span>
                        )}
                        {job.priority === "URGENT" && (
                          <span style={{ fontSize: "10px", fontWeight: 800, backgroundColor: "#fee2e2", color: "#dc2626", padding: "1px 6px", borderRadius: "999px" }}>
                            Urgent
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                        {job.customerName} • {job.itemName} • {job.requirementSnapshot?.quantity || 1000} pcs
                      </div>
                    </div>
                  </div>

                  <div className={`v3-sla-pill ${job.slaUrgency?.includes("Overdue") ? "red" : job.slaUrgency?.includes("35m") ? "orange" : "green"}`}>
                    ● {job.slaUrgency || "1h 40m"}
                  </div>
                </div>

                {isRevision && (
                  <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fee2e2", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", color: "#b91c1c", marginBottom: "10px" }}>
                    Feedback: "{job.proofs?.[0]?.customerFeedback || "Change font to gold, larger logo"}"
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Round robin • assigned 15 Sep 05:10 PM
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    {isAssigned ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenRejectModal(job); }}
                          className="v3-btn-secondary"
                          style={{ fontSize: "11px", padding: "4px 10px", height: "28px", color: "#dc2626", borderColor: "#fecaca" }}
                        >
                          ✕ Reject
                        </button>

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleAcceptAssignment(job); }}
                          className="v3-btn-primary"
                          style={{ fontSize: "11px", padding: "4px 12px", height: "28px" }}
                        >
                          ✓ Accept
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/v3/design/workspace/${job.id || job.assignmentNo}`); }}
                        className="v3-btn-secondary"
                        style={{ fontSize: "11px", padding: "4px 12px", height: "28px", borderColor: "#059669", color: "#047857" }}
                      >
                        → Open Workspace
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail Panel matching reference image 2 */}
        {selectedJob && (
          <div className="v3-card" style={{ padding: "20px", height: "fit-content", position: "sticky", top: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                Assignment • {selectedJob.jobNo}
              </h3>
              <span className="v3-sla-pill orange">
                ● Accept in 1h 40m
              </span>
            </div>

            {/* Mockup Preview Card */}
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", marginBottom: "14px", textAlign: "center" }}>
              <img
                src="https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80"
                alt="Visiting Card Mockup"
                style={{ width: "100%", height: "130px", objectFit: "cover", borderRadius: "6px" }}
              />
            </div>

            {/* Spec Details */}
            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Customer:</span>
              <span className="v3-summary-v">{selectedJob.customerName}</span>
            </div>
            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Spec:</span>
              <span className="v3-summary-v">{selectedJob.requirementSnapshot?.paperType} • {selectedJob.requirementSnapshot?.size}</span>
            </div>
            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Print:</span>
              <span className="v3-summary-v">{selectedJob.requirementSnapshot?.side === "DOUBLE_SIDE" ? "Colour • Double side" : "Single side"}</span>
            </div>
            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Finishing:</span>
              <span className="v3-summary-v">
                {Array.isArray(selectedJob.requirementSnapshot?.finishing) ? selectedJob.requirementSnapshot?.finishing.join(", ") : "Matt lamination"}
              </span>
            </div>
            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Due:</span>
              <span className="v3-summary-v" style={{ fontWeight: 700, color: "#dc2626" }}>
                {selectedJob.dueDate || "22 Sep 2026"}
              </span>
            </div>

            {/* Customer Files & Brief */}
            <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px", borderRadius: "8px", fontSize: "12px", color: "#166534", marginTop: "14px", marginBottom: "16px" }}>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>Customer files: abc-logo.ai, old-card.jpg</div>
              <div>"{selectedJob.requirementSnapshot?.customerNotes || "Name & designation in Tamil + English, blue-green theme."}"</div>
            </div>

            {/* Actions */}
            {selectedJob.status === "ASSIGNED" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => handleOpenRejectModal(selectedJob)}
                  className="v3-btn-secondary"
                  style={{ color: "#dc2626", borderColor: "#fecaca" }}
                >
                  ✕ Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleAcceptAssignment(selectedJob)}
                  disabled={isProcessing}
                  className="v3-btn-primary"
                >
                  ✓ Accept Assignment
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/v3/design/workspace/${selectedJob.id || selectedJob.assignmentNo}`)}
                className="v3-btn-primary"
                style={{ width: "100%" }}
              >
                → Open Workspace
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <RejectAssignmentModal
        assignment={selectedJob}
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirmReject={handleConfirmReject}
        isProcessing={isProcessing}
      />
    </div>
  );
}
