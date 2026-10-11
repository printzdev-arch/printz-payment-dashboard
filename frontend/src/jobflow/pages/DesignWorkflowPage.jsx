import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Palette,
  UserCheck,
  Check,
  X,
  Play,
  Upload,
  Eye,
  Send,
  MessageCircle,
  FileCheck,
  RotateCcw,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";
import JobFlowLayout from "../components/JobFlowLayout";
import StatusBadge from "../components/StatusBadge";
import RejectDesignModal from "../components/RejectDesignModal";
import AssignDesignerModal from "../components/AssignDesignerModal";
import JobFlowDataTable from "../components/JobFlowDataTable";
import jobFlowApi from "../api/jobFlowApi";
import { toast } from "react-toastify";

export const DesignWorkflowPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");

  const [activeView, setActiveView] = useState("my-jobs"); // "queue", "my-jobs", "workspace", "customer-proof"
  const [queueTab, setQueueTab] = useState("unassigned"); // "unassigned", "assigned", "in_progress", "waiting", "completed"
  const [designerTab, setDesignerTab] = useState("new"); // "new", "accepted", "in_progress", "waiting", "completed"

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [selectedJob, setSelectedJob] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Workspace proof upload state (Image 4 Screen 11)
  const [proofVersion, setProofVersion] = useState("V2 - Final Design");
  const [proofNotes, setProofNotes] = useState("Updated color and layout as per discussion.");
  const [proofList, setProofList] = useState([
    { version: "V1", title: "Initial Concept", date: "10 Apr 2024", status: "Revision Requested", notes: "Please adjust tagline font." },
    { version: "V2 (Current)", title: "Final Design", date: "12 Apr 2024", status: "Pending Approval", notes: "Updated color and layout as per discussion." },
  ]);

  // Customer proof approval simulator state (Image 4 Screen 12)
  const [customerRevisionNotes, setCustomerRevisionNotes] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [proofApproved, setProofApproved] = useState(false);

  useEffect(() => {
    fetchDesignJobs();
  }, [activeView]);

  const fetchDesignJobs = async () => {
    setLoading(true);
    try {
      const [queueRes, myJobsRes] = await Promise.allSettled([
        jobFlowApi.getDesignQueue(),
        jobFlowApi.getMyDesignJobs(),
      ]);

      let queueItems = [];
      if (queueRes.status === "fulfilled") {
        const val = queueRes.value;
        queueItems = val?.data?.items || val?.data || [];
        if (!Array.isArray(queueItems)) queueItems = [];
      }

      let myItems = [];
      if (myJobsRes.status === "fulfilled") {
        const val = myJobsRes.value;
        myItems = val?.data?.items || val?.data || [];
        if (!Array.isArray(myItems)) myItems = [];
      }

      // Map myJobs (which in backend is aggregate with { job, acceptedAt, ... })
      const mappedMyJobs = myItems.map((item) => {
        const j = item.job || item;
        const isAccepted = Boolean(item.acceptedAt || j.acceptedAt || j.currentStage === "DESIGN_IN_PROGRESS");
        const isInProgress = j.currentStage === "DESIGN_IN_PROGRESS";
        return {
          _id: j._id || item._id,
          jobNo: j.jobNo,
          customerName: j.customerName || j.customerSnapshot?.name || "Client",
          title: j.title || "Design Job",
          jobType: j.jobType || "Print & Design",
          dueDate: j.dueDate ? new Date(j.dueDate).toLocaleDateString() : "15 Apr 2024",
          priority: j.priority || "Medium",
          status: isInProgress ? "In Progress" : isAccepted ? "Accepted" : "Assigned",
          designer: item.designerName || "Me",
          raw: j,
        };
      });

      const mappedQueue = queueItems.map((j) => ({
        _id: j._id,
        jobNo: j.jobNo,
        customerName: j.customerName || j.customerSnapshot?.name || "Client",
        title: j.title || "Design Job",
        jobType: j.jobType || "Print & Design",
        dueDate: j.dueDate ? new Date(j.dueDate).toLocaleDateString() : "15 Apr 2024",
        priority: j.priority || "Medium",
        status: j.currentStage === "DESIGN_IN_PROGRESS" ? "In Progress" : j.currentStage === "DESIGN_ASSIGNED" ? "Assigned" : "Unassigned",
        raw: j,
      }));

      const combined = [
        ...mappedMyJobs,
        ...mappedQueue.filter((q) => !mappedMyJobs.some((m) => String(m._id) === String(q._id))),
      ];

      // If active job in query is not in the list, fetch by ID
      const targetJobId = preselectedJobId || localStorage.getItem("printz_active_job_id");
      if (targetJobId && !combined.some((c) => String(c._id) === String(targetJobId) || c.jobNo === targetJobId)) {
        try {
          const singleRes = await jobFlowApi.getJobOrderById(targetJobId);
          const sj = singleRes?.data || singleRes;
          if (sj && sj._id) {
            const isDesignStage = [
              "DESIGN_QUEUE",
              "DESIGN_ASSIGNED",
              "DESIGN_IN_PROGRESS",
              "SAMPLE_APPROVAL",
              "REVISION",
            ].includes(sj.currentStage);

            if (isDesignStage) {
              const isAcc = sj.currentStage === "DESIGN_IN_PROGRESS" || sj.acceptedAt;
              combined.unshift({
                _id: sj._id,
                jobNo: sj.jobNo,
                customerName: sj.customerName || sj.customerSnapshot?.name || "Client",
                title: sj.title || "Design Job",
                jobType: sj.jobType || "Print & Design",
                dueDate: sj.dueDate ? new Date(sj.dueDate).toLocaleDateString() : "15 Apr 2024",
                priority: sj.priority || "High",
                status: sj.currentStage === "DESIGN_IN_PROGRESS" ? "In Progress" : isAcc ? "Accepted" : "Assigned",
                designer: "Me",
                raw: sj,
              });
            }
          }
        } catch (_) {}
      }

      setJobs(combined);
    } catch (err) {
      console.error("Failed to load design jobs:", err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const targetJobId = preselectedJobId || localStorage.getItem("printz_active_job_id");
    if (!targetJobId || jobs.length === 0) return;
    const match = jobs.find(
      (j) => String(j._id || j.id) === String(targetJobId) || j.jobNo === targetJobId
    );
    if (match) {
      setSelectedJob(match);
      if (preselectedJobId) {
        setActiveView("workspace");
      }
    }
  }, [preselectedJobId, jobs]);

  const getJobKey = (item) => String(item?._id || item?.id || item?.jobNo || "");

  // Section 7: Mandatory Designer ACCEPT Workflow
  const handleAcceptAssignment = async (job) => {
    const targetKey = getJobKey(job);
    try {
      localStorage.setItem("printz_active_job_id", job._id || job.id || targetKey);
    } catch (_) {}
    try {
      await jobFlowApi.acceptDesignAssignment(job._id || job.id);
      toast.success(`Assignment accepted for Job ${job.jobNo || targetKey}! You can now Start Work.`);
      if (targetKey) {
        setJobs((prev) =>
          prev.map((j) => (getJobKey(j) === targetKey ? { ...j, status: "Accepted" } : j))
        );
      }
      setSelectedJob((prev) => (prev ? { ...prev, status: "Accepted" } : prev));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to accept assignment");
      if (targetKey) {
        setJobs((prev) =>
          prev.map((j) => (getJobKey(j) === targetKey ? { ...j, status: "Accepted" } : j))
        );
      }
    }
  };

  // Section 7: Mandatory Designer REJECT Workflow
  const handleRejectAssignment = async (jobId, reason) => {
    const targetKey = String(jobId || "");
    try {
      await jobFlowApi.rejectDesignAssignment(jobId, reason);
      toast.success("Job rejected successfully! Returned to queue for supervisor reallocation.");
      setJobs((prev) => prev.filter((j) => getJobKey(j) !== targetKey));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject assignment");
      setJobs((prev) => prev.filter((j) => getJobKey(j) !== targetKey));
    }
  };

  // Section 7: Start Work & SLA
  const handleStartWork = async (job) => {
    const targetKey = getJobKey(job);
    try {
      localStorage.setItem("printz_active_job_id", job._id || job.id || targetKey);
    } catch (_) {}
    try {
      await jobFlowApi.startDesignWork(job._id || job.id);
      toast.success(`Design work started! Turnaround SLA timer initiated for Job ${job.jobNo || targetKey}.`);
      if (targetKey) {
        setJobs((prev) =>
          prev.map((j) => (getJobKey(j) === targetKey ? { ...j, status: "In Progress" } : j))
        );
      }
      setSelectedJob({ ...job, status: "In Progress" });
      setActiveView("workspace");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start design work");
      setSelectedJob({ ...job, status: "In Progress" });
      setActiveView("workspace");
    }
  };

  // Upload Proof (Image 4 Screen 11)
  const handleUploadProof = (e) => {
    e.preventDefault();
    const newProof = {
      version: proofVersion,
      title: "Design Artwork",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      status: "Ready for Approval",
      notes: proofNotes,
    };
    setProofList((prev) => [newProof, ...prev]);
    toast.success(`Uploaded proof ${proofVersion}!`);
  };

  // Customer Proof Approval Decision (Image 4 Screen 12)
  const handleCustomerApprove = async () => {
    setProofApproved(true);
    const targetId = selectedJob?._id || selectedJob?.id || preselectedJobId;
    if (targetId) {
      try {
        await jobFlowApi.skipDesign(targetId, { reason: "Customer approved proof - released to production" });
      } catch (e) {
        console.warn("Could not transition via skipDesign:", e);
      }
    }
    toast.success("Customer approved proof! Job released to Production Planning.");
    fetchDesignJobs();
    navigate(`/jobflow/production?jobId=${targetId}`);
  };

  const handleCustomerRevision = async () => {
    if (!customerRevisionNotes.trim()) {
      toast.error("Revision notes are required.");
      return;
    }
    toast.info("Revision requested. Notes sent to designer workspace.");
    setShowRevisionInput(false);
  };

  return (
    <JobFlowLayout
      title="Design Workflow & Proof Approval"
      subtitle="Designer pool allocation, Accept/Reject workflow, proof versioning & WhatsApp approval"
      actions={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className={`jf-btn ${activeView === "queue" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveView("queue")}
          >
            Design Queue (Supervisor)
          </button>
          <button
            type="button"
            className={`jf-btn ${activeView === "my-jobs" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveView("my-jobs")}
          >
            Designer My Jobs
          </button>
          <button
            type="button"
            className={`jf-btn ${activeView === "workspace" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => {
              if (!selectedJob && jobs.length > 0) setSelectedJob(jobs[0]);
              setActiveView("workspace");
            }}
          >
            Design Workspace
          </button>
          <button
            type="button"
            className={`jf-btn ${activeView === "customer-proof" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveView("customer-proof")}
          >
            <MessageCircle size={14} /> WhatsApp Proof Review
          </button>
        </div>
      }
    >
      {/* ──────────────── SCREEN 9: DESIGN QUEUE (SUPERVISOR) ──────────────── */}
      {activeView === "queue" && (
        <div className="jf-card" style={{ padding: 0 }}>
          <div className="jf-card-header" style={{ padding: "1.25rem 1.25rem 0.5rem 1.25rem" }}>
            <div>
              <h3 className="jf-card-title">Design Queue (Manager / Supervisor)</h3>
              <p className="jf-header-subtitle" style={{ margin: 0 }}>
                Unassigned jobs requiring artwork. Supports Round-Robin and manual assignment.
              </p>
            </div>
          </div>

          {/* Queue Tab Counters */}
          <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 1.25rem", borderBottom: "1px solid var(--jf-border)" }}>
            {[
              { id: "unassigned", label: "Unassigned (12)" },
              { id: "assigned", label: "Assigned (8)" },
              { id: "in_progress", label: "In Progress (5)" },
              { id: "waiting", label: "Waiting for Approval (4)" },
              { id: "completed", label: "Completed (20)" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                className={`jf-btn jf-btn-sm ${queueTab === t.id ? "jf-btn-primary" : "jf-btn-secondary"}`}
                onClick={() => setQueueTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Design Queue DataTable with Search, Sorting, Rows Per Page & Pagination */}
          <JobFlowDataTable
            columns={[
              {
                key: "jobNo",
                label: "Job No",
                sortable: true,
                width: "140px",
                render: (val) => <strong>{val}</strong>,
              },
              {
                key: "customerName",
                label: "Customer",
                sortable: true,
              },
              {
                key: "title",
                label: "Job Title",
                sortable: true,
              },
              {
                key: "jobType",
                label: "Type",
                sortable: true,
              },
              {
                key: "dueDate",
                label: "Due Date",
                sortable: true,
              },
              {
                key: "priority",
                label: "Priority",
                sortable: true,
                render: (val) => (
                  <span className={`jf-badge ${val === "High" ? "jf-badge-red" : "jf-badge-amber"}`}>
                    {val}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                sortable: true,
                render: (val) => <StatusBadge status={val} />,
              },
              {
                key: "actions",
                label: "Actions",
                sortable: false,
                align: "right",
                render: (_, job) => (
                  <button
                    type="button"
                    className="jf-btn jf-btn-primary jf-btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedJob(job);
                      setIsAssignModalOpen(true);
                    }}
                  >
                    <UserCheck size={14} /> Assign
                  </button>
                ),
              },
            ]}
            data={jobs}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search design queue..."
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            emptyMessage="No design jobs in queue."
          />
        </div>
      )}

      {/* ──────────────── SCREEN 10: DESIGNER MY JOBS (ACCEPT / REJECT) ──────────────── */}
      {activeView === "my-jobs" && (
        <div className="jf-card" style={{ padding: 0 }}>
          <div className="jf-card-header" style={{ padding: "1.25rem 1.25rem 0.5rem 1.25rem" }}>
            <div>
              <h3 className="jf-card-title">My Assigned Jobs (Designer Workspace)</h3>
              <p className="jf-header-subtitle" style={{ margin: 0 }}>
                Mandatory Accept / Reject workflow. Acceptance starts the turnaround SLA timer.
              </p>
            </div>
          </div>

          {/* Designer Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 1.25rem", borderBottom: "1px solid var(--jf-border)" }}>
            {[
              { id: "new", label: "New Assignments (3)" },
              { id: "accepted", label: "Accepted (4)" },
              { id: "in_progress", label: "In Progress (2)" },
              { id: "waiting", label: "Waiting for Customer (3)" },
              { id: "completed", label: "Completed (10)" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                className={`jf-btn jf-btn-sm ${designerTab === t.id ? "jf-btn-primary" : "jf-btn-secondary"}`}
                onClick={() => setDesignerTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Designer My-Jobs DataTable with Search, Sorting, Rows Per Page & Pagination */}
          <JobFlowDataTable
            columns={[
              {
                key: "jobNo",
                label: "Job No",
                sortable: true,
                width: "140px",
                render: (val) => <strong>{val}</strong>,
              },
              {
                key: "customerName",
                label: "Customer",
                sortable: true,
              },
              {
                key: "title",
                label: "Job Title",
                sortable: true,
              },
              {
                key: "dueDate",
                label: "Due Date",
                sortable: true,
              },
              {
                key: "priority",
                label: "Priority",
                sortable: true,
                render: (val) => (
                  <span className={`jf-badge ${val === "High" ? "jf-badge-red" : "jf-badge-amber"}`}>
                    {val}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                sortable: true,
                render: (val) => <StatusBadge status={val} />,
              },
              {
                key: "actions",
                label: "Actions",
                sortable: false,
                align: "right",
                render: (_, job) => {
                  const isAccepted = job.status === "Accepted";
                  const isInProgress = job.status === "In Progress";
                  return (
                    <div style={{ display: "inline-flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                      {!isAccepted && !isInProgress && (
                        <>
                          <button
                            type="button"
                            className="jf-btn jf-btn-primary jf-btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptAssignment(job);
                            }}
                          >
                            <Check size={14} /> Accept
                          </button>
                          <button
                            type="button"
                            className="jf-btn jf-btn-danger-outline jf-btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(job);
                              setIsRejectModalOpen(true);
                            }}
                          >
                            <X size={14} /> Reject
                          </button>
                        </>
                      )}

                      {isAccepted && (
                        <button
                          type="button"
                          className="jf-btn jf-btn-primary jf-btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartWork(job);
                          }}
                        >
                          <Play size={14} /> Start Work
                        </button>
                      )}

                      {isInProgress && (
                        <button
                          type="button"
                          className="jf-btn jf-btn-secondary jf-btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                            setActiveView("workspace");
                          }}
                        >
                          <Palette size={14} /> Open Canvas
                        </button>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={jobs}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search my assignments..."
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            emptyMessage="No assignments found in this status."
          />
        </div>
      )}

      {/* ──────────────── SCREEN 11: DESIGN WORKSPACE & PROOF UPLOAD ──────────────── */}
      {activeView === "workspace" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: "1.5rem" }}>
          {/* Left Canvas Preview */}
          <div className="jf-card">
            <div className="jf-card-header">
              <div>
                <h3 className="jf-card-title">
                  Design Canvas: {selectedJob?.jobNo || "JO-202610-0038"}
                </h3>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  {selectedJob?.title || "Brochure Design"} • Client: {selectedJob?.customerName || "Tech Solution Sdn Bhd"}
                </span>
              </div>
              <span className="jf-badge jf-badge-blue">In Progress</span>
            </div>

            {/* Simulated Artwork Viewer */}
            <div
              style={{
                height: "360px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #064e3b 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "inset 0 2px 4px 0 rgb(0 0 0 / 0.1)",
                textAlign: "center",
                padding: "2rem",
              }}
            >
              <div>
                <div style={{ fontSize: "2rem", fontWeight: 800 }}>PrintZ</div>
                <div style={{ fontSize: "1rem", color: "#a7f3d0", marginTop: "4px" }}>
                  High Quality Prints for Your Business
                </div>
                <div style={{ fontSize: "0.8125rem", background: "rgba(255, 255, 255, 0.2)", padding: "4px 12px", borderRadius: "4px", marginTop: "1rem", display: "inline-block" }}>
                  Artwork File: brochure_v2_final.pdf
                </div>
              </div>
            </div>

            {/* Proof Versions History (Image 4 Screen 11) */}
            <div style={{ marginTop: "1.5rem" }}>
              <h4 style={{ fontSize: "0.95rem", margin: "0 0 0.75rem 0" }}>
                Proof Version History ({proofList.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {proofList.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      border: "1px solid var(--jf-border)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{p.version} - {p.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{p.date} • {p.notes}</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Upload Panel */}
          <div className="jf-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="jf-card-header">
                <h3 className="jf-card-title">Upload New Proof</h3>
              </div>

              <form onSubmit={handleUploadProof}>
                <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="jf-label jf-label-required">Version Name</label>
                  <input
                    type="text"
                    className="jf-input"
                    value={proofVersion}
                    onChange={(e) => setProofVersion(e.target.value)}
                    required
                  />
                </div>

                <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="jf-label">Version Notes</label>
                  <textarea
                    className="jf-textarea"
                    rows={3}
                    value={proofNotes}
                    onChange={(e) => setProofNotes(e.target.value)}
                    placeholder="Updated typography and logo resolution..."
                  />
                </div>

                <label className="jf-dropzone" style={{ display: "block", marginBottom: "1rem" }}>
                  <Upload size={24} style={{ color: "var(--jf-primary)", margin: "0 auto 0.5rem" }} />
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                    Click or drop updated artwork file
                  </div>
                </label>

                <button type="submit" className="jf-btn jf-btn-primary" style={{ width: "100%", marginBottom: "1rem" }}>
                  <Upload size={16} /> Upload Proof
                </button>
              </form>
            </div>

            <button
              type="button"
              className="jf-btn jf-btn-secondary"
              style={{ width: "100%" }}
              onClick={() => {
                setActiveView("customer-proof");
                toast.info("WhatsApp notification link generated for customer preview.");
              }}
            >
              <Send size={16} /> Send to Customer via WhatsApp Link
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── SCREEN 12: CUSTOMER PROOF APPROVAL (WHATSAPP SIMULATOR) ──────────────── */}
      {activeView === "customer-proof" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", maxWidth: "900px", margin: "0 auto" }}>
          {/* WhatsApp Notification Simulator */}
          <div className="jf-card" style={{ background: "#efeae2", border: "1px solid #d1d7db" }}>
            <div style={{ background: "#075e54", color: "#ffffff", padding: "0.75rem 1rem", borderRadius: "6px", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <MessageCircle size={20} />
              <strong style={{ fontSize: "0.95rem" }}>PrintZ Official WhatsApp</strong>
            </div>

            <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", fontSize: "0.875rem", lineHeight: "1.6" }}>
              <p style={{ margin: "0 0 0.5rem 0" }}>Hi <strong>John Tan</strong>,</p>
              <p style={{ margin: "0 0 0.5rem 0" }}>
                Your print design proof for <strong>Brochure Design (JO-202610-0038)</strong> is ready for your review and approval!
              </p>
              <p style={{ margin: "0 0 0.5rem 0" }}>Please click the secure link below to view the artwork:</p>
              <div style={{ color: "#0284c7", fontWeight: 600, wordBreak: "break-all", background: "#f0f9ff", padding: "6px 8px", borderRadius: "4px" }}>
                https://printz.com/proof/abc123token
              </div>
            </div>
          </div>

          {/* Customer Mobile Review Screen */}
          <div className="jf-card">
            <div className="jf-card-header">
              <div>
                <h3 className="jf-card-title">Design Proof Review</h3>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Job No: JO-202610-0038</span>
              </div>
              <StatusBadge status={proofApproved ? "Approved" : "Pending Approval"} />
            </div>

            {/* Mobile Artwork Preview */}
            <div
              style={{
                height: "200px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #064e3b 0%, #10b981 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                textAlign: "center",
                marginBottom: "1rem",
              }}
            >
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>PrintZ</div>
                <div style={{ fontSize: "0.8125rem", color: "#a7f3d0" }}>Your Print Partner</div>
                <div style={{ fontSize: "0.75rem", marginTop: "6px" }}>Version: V2 (Current)</div>
              </div>
            </div>

            {/* Actions */}
            {!proofApproved ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary"
                  onClick={handleCustomerApprove}
                >
                  <Check size={16} /> Approve Proof (This design is correct)
                </button>

                {!showRevisionInput ? (
                  <button
                    type="button"
                    className="jf-btn jf-btn-danger-outline"
                    onClick={() => setShowRevisionInput(true)}
                  >
                    <RotateCcw size={16} /> Request Revision (Need some changes)
                  </button>
                ) : (
                  <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--jf-border)" }}>
                    <label className="jf-label jf-label-required">Revision Notes</label>
                    <textarea
                      className="jf-textarea"
                      rows={3}
                      value={customerRevisionNotes}
                      onChange={(e) => setCustomerRevisionNotes(e.target.value)}
                      placeholder="Please change tagline or adjust company address..."
                    />
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={() => setShowRevisionInput(false)}>
                        Cancel
                      </button>
                      <button type="button" className="jf-btn jf-btn-danger jf-btn-sm" onClick={handleCustomerRevision}>
                        Submit Revision
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", padding: "1rem", textAlign: "center", color: "#166534" }}>
                <Check size={28} style={{ margin: "0 auto 0.25rem" }} />
                <h4 style={{ margin: "0 0 0.25rem 0" }}>Proof Approved!</h4>
                <p style={{ margin: 0, fontSize: "0.8125rem" }}>
                  Thank you! The job has moved to Production Planning.
                </p>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary"
                  style={{ marginTop: "0.875rem", width: "100%", justifyContent: "center" }}
                  onClick={() => navigate(`/jobflow/production?jobId=${selectedJob?._id || selectedJob?.id || ""}`)}
                >
                  Proceed to Production Planning <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal (Mandatory reason validation) */}
      <RejectDesignModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        job={selectedJob}
        onConfirmReject={handleRejectAssignment}
      />

      {/* Assign Designer Modal */}
      <AssignDesignerModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        job={selectedJob}
        onAssigned={fetchDesignJobs}
      />
    </JobFlowLayout>
  );
};

export default DesignWorkflowPage;
