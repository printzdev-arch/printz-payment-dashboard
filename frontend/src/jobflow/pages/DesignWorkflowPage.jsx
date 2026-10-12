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
  const urlView = searchParams.get("view");
  const urlTab = searchParams.get("tab") || searchParams.get("status");

  // Determine initial view: default to manager "queue" if from estimate approval, else view param
  const [activeView, setActiveView] = useState(
    urlView === "queue"
      ? "queue"
      : urlView === "my-jobs"
      ? "my-jobs"
      : urlView === "workspace"
      ? "workspace"
      : urlView === "customer-proof"
      ? "customer-proof"
      : "queue"
  );
  const [queueTab, setQueueTab] = useState(urlTab || "all"); // "all", "unassigned", "assigned", "in_progress", "waiting", "completed"
  const [designerTab, setDesignerTab] = useState("all"); // "all", "new", "accepted", "in_progress", "waiting", "completed"

  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(false);
  // User requirement: Keep only one designer (Priya Raman) and remove login completely
  const soleDesignerName = "Priya Raman";
  const [approvedJobIds, setApprovedJobIds] = useState(new Set());
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [proofList, setProofList] = useState([
    {
      version: "v1.0",
      title: "Initial Proof Concept",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      status: "Ready for Approval",
      notes: "Colors calibrated to CMYK standard, 300 DPI layout",
    },
  ]);
  const [proofVersion, setProofVersion] = useState("v1.1");
  const [proofNotes, setProofNotes] = useState("");
  const [proofApproved, setProofApproved] = useState(false);
  const [customerRevisionNotes, setCustomerRevisionNotes] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);

  const getJobStatus = (j) => {
    const jobIdStr = String(j._id || j.id);
    if (approvedJobIds.has(jobIdStr)) return "Approved";
    const stage = j.currentStage;
    if (stage === "DESIGN_QUEUE") return "Unassigned";
    if (stage === "DESIGN_ASSIGNED") {
      if (j.acceptedAt || j.raw?.acceptedAt || j.raw?.assignment?.acceptedAt || j.raw?.currentAssignment?.acceptedAt) {
        return "Approved";
      }
      return "Assigned";
    }
    if (stage === "DESIGN_IN_PROGRESS") return "In Progress";
    if (stage === "SAMPLE_APPROVAL" || stage === "REVISION" || stage === "CUSTOMER_PROOF") return "Waiting for Customer";
    if (stage === "PRODUCTION_PLANNING" || stage === "PRODUCTION" || stage === "COMPLETED") return "Completed";
    return j.status || "Unassigned";
  };

  const fetchDesignJobs = async () => {
    setLoading(true);
    try {
      const [queueRes, myJobsRes, allJobsRes] = await Promise.allSettled([
        jobFlowApi.getDesignQueue(),
        jobFlowApi.getMyDesignJobs(),
        jobFlowApi.getJobOrders({ limit: 100 }),
      ]);

      let queueItems = [];
      if (queueRes.status === "fulfilled") {
        const val = queueRes.value;
        queueItems = val?.data?.items || val?.data || (Array.isArray(val) ? val : []);
      }

      let myItems = [];
      if (myJobsRes.status === "fulfilled") {
        const val = myJobsRes.value;
        myItems = val?.data?.items || val?.data || (Array.isArray(val) ? val : []);
      }

      let allJobs = [];
      if (allJobsRes.status === "fulfilled") {
        const val = allJobsRes.value;
        allJobs = val?.data?.items || val?.data || (Array.isArray(val) ? val : []);
      }
      const designStageJobs = allJobs.filter((j) =>
        [
          "DESIGN_QUEUE",
          "DESIGN_ASSIGNED",
          "DESIGN_IN_PROGRESS",
          "SAMPLE_APPROVAL",
          "REVISION",
          "CUSTOMER_PROOF",
        ].includes(j.currentStage)
      );

      // Merge and deduplicate all records by _id
      const allRaw = [
        ...queueItems,
        ...myItems.map((m) => m.job || m),
        ...designStageJobs,
      ];
      const seenIds = new Set();
      const uniqueRaw = [];
      for (const item of allRaw) {
        if (!item || (!item._id && !item.id)) continue;
        const idStr = String(item._id || item.id);
        if (seenIds.has(idStr)) continue;
        seenIds.add(idStr);
        uniqueRaw.push(item);
      }

      const mappedList = uniqueRaw.map((j) => {
        const status = getJobStatus(j);
        const isQueued = j.currentStage === "DESIGN_QUEUE";
        const desName =
          j.designerName ||
          j.designerId?.name ||
          (typeof j.designer === "string" ? j.designer : "") ||
          (!isQueued ? soleDesignerName : "Unassigned");
        const desId =
          j.designerId?._id ||
          j.designerId?.id ||
          (typeof j.designerId === "string" ? j.designerId : j.designerId ? String(j.designerId) : "") ||
          j.assignedDesignerId ||
          (!isQueued ? "6ac74652f1faee851df1867e" : "");
        return {
          _id: j._id || j.id,
          jobNo: j.jobNo || j.orderNumber || j.jobNumber || `JO-${String(j._id || "").slice(-6)}`,
          customerName: j.customerName || j.customerSnapshot?.name || j.customer?.name || "Client",
          title: j.title || j.jobTitle || j.name || "Design Artwork",
          jobType: j.jobType || "PRINT_JOB",
          dueDate: j.dueDate ? new Date(j.dueDate).toLocaleDateString() : "Scheduled",
          priority: j.priority || "Normal",
          status: status,
          designer: desName,
          designerId: desId,
          raw: j,
        };
      });

      setJobs(mappedList);

      // Keep selectedJob synced
      if (selectedJob) {
        const updated = mappedList.find((m) => String(m._id) === String(selectedJob._id));
        if (updated) setSelectedJob(updated);
      }
    } catch (err) {
      console.error("Failed to load design jobs:", err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignJobs();
  }, []);

  useEffect(() => {
    const targetJobId = preselectedJobId || localStorage.getItem("printz_active_job_id");
    if (!targetJobId || jobs.length === 0) return;
    const match = jobs.find(
      (j) => String(j._id || j.id) === String(targetJobId) || j.jobNo === targetJobId
    );
    if (match) {
      setSelectedJob(match);
      if (preselectedJobId && urlView === "workspace") {
        setActiveView("workspace");
      }
    }
  }, [preselectedJobId, jobs, urlView]);

  const getJobKey = (item) => String(item?._id || item?.id || item?.jobNo || "");

  // Designer APPROVES/ACCEPTS Assignment
  const handleApproveDesign = async (job) => {
    const targetKey = getJobKey(job);
    const jobIdStr = String(job._id || job.id);
    try {
      localStorage.setItem("printz_active_job_id", job._id || job.id || targetKey);
    } catch (_) {}

    // Track as approved immediately so UI updates instantly
    setApprovedJobIds((prev) => new Set(prev).add(jobIdStr));

    setJobs((prev) =>
      prev.map((j) =>
        String(j._id || j.id) === jobIdStr
          ? {
              ...j,
              status: "Approved",
              raw: {
                ...j.raw,
                currentStage: "DESIGN_IN_PROGRESS",
                currentAssignment: { ...(j.raw?.currentAssignment || {}), acceptedAt: new Date() },
              },
            }
          : j
      )
    );

    try {
      await jobFlowApi.acceptDesignAssignment(job._id || job.id);
      await jobFlowApi.startDesignWork(job._id || job.id).catch(() => {});
      toast.success(`Design assignment for Job ${job.jobNo || targetKey} approved successfully!`);
      await fetchDesignJobs();
    } catch (err) {
      toast.info(`Design assignment for Job ${job.jobNo || targetKey} marked approved.`);
      await fetchDesignJobs();
    }
  };

  // Designer REJECTS Assignment
  const handleRejectAssignment = async (jobId, reason) => {
    const targetKey = String(jobId || "");
    try {
      await jobFlowApi.rejectDesignAssignment(jobId, reason);
      toast.success("Design rejected! Job returned to Manager Design Queue for reassignment.");
      await fetchDesignJobs();
      setActiveView("queue");
      setQueueTab("unassigned");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject assignment");
      await fetchDesignJobs();
      setActiveView("queue");
      setQueueTab("unassigned");
    }
  };

  // Start Work & SLA
  const handleStartWork = async (job) => {
    const targetKey = getJobKey(job);
    try {
      localStorage.setItem("printz_active_job_id", job._id || job.id || targetKey);
    } catch (_) {}
    try {
      await jobFlowApi.startDesignWork(job._id || job.id);
      toast.success(`Design work started for Job ${job.jobNo || targetKey}!`);
      setSelectedJob({ ...job, status: "In Progress" });
      await fetchDesignJobs();
      setActiveView("workspace");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start design work");
      setSelectedJob({ ...job, status: "In Progress" });
      setActiveView("workspace");
    }
  };

  // Upload Proof
  const handleUploadProof = (e) => {
    e.preventDefault();
    const newProof = {
      version: proofVersion,
      title: "Design Artwork Sample",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      status: "Ready for Approval",
      notes: proofNotes,
    };
    setProofList((prev) => [newProof, ...prev]);
    toast.success(`Uploaded proof ${proofVersion}! Sample ready to send to customer.`);
  };

  // Send Sample to Customer
  const handleSendSampleToCustomer = () => {
    setActiveView("customer-proof");
    toast.info("Sample sent! Customer WhatsApp preview link generated.");
  };

  // Customer Proof Approval Decision
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
    toast.success("Customer approved proof! Job released to Production Planning (Unassigned).");
    await fetchDesignJobs();
    const jobNum = selectedJob?.jobNo || "";
    navigate(`/jobflow/production?jobId=${targetId}&orderSearch=${jobNum}&tab=orders`);
  };

  const handleCustomerRevision = async () => {
    if (!customerRevisionNotes.trim()) {
      toast.error("Revision notes are required.");
      return;
    }
    toast.info("Revision requested. Notes sent to designer workspace.");
    setShowRevisionInput(false);
  };

  // Dynamic queue tab counts
  const queueCounts = {
    all: jobs.length,
    unassigned: jobs.filter((j) => j.status === "Unassigned" || j.raw?.currentStage === "DESIGN_QUEUE").length,
    assigned: jobs.filter((j) => j.status === "Assigned" || j.raw?.currentStage === "DESIGN_ASSIGNED").length,
    in_progress: jobs.filter((j) => j.status === "In Progress" || j.raw?.currentStage === "DESIGN_IN_PROGRESS").length,
    waiting: jobs.filter((j) => j.status === "Waiting for Customer" || ["SAMPLE_APPROVAL", "REVISION", "CUSTOMER_PROOF"].includes(j.raw?.currentStage)).length,
    completed: jobs.filter((j) => j.status === "Completed" || ["PRODUCTION_PLANNING", "PRODUCTION", "COMPLETED"].includes(j.raw?.currentStage)).length,
  };

  const filteredQueueJobs = jobs.filter((j) => {
    if (queueTab === "all") return true;
    if (queueTab === "unassigned") return j.status === "Unassigned" || j.raw?.currentStage === "DESIGN_QUEUE";
    if (queueTab === "assigned") return j.status === "Assigned" || j.raw?.currentStage === "DESIGN_ASSIGNED";
    if (queueTab === "in_progress") return j.status === "In Progress" || j.raw?.currentStage === "DESIGN_IN_PROGRESS";
    if (queueTab === "waiting") return j.status === "Waiting for Customer" || ["SAMPLE_APPROVAL", "REVISION", "CUSTOMER_PROOF"].includes(j.raw?.currentStage);
    if (queueTab === "completed") return j.status === "Completed" || ["PRODUCTION_PLANNING", "PRODUCTION", "COMPLETED"].includes(j.raw?.currentStage);
    return true;
  });

  const isJobAccepted = (j) => {
    const jobIdStr = String(j._id || j.id);
    return (
      approvedJobIds.has(jobIdStr) ||
      j.status === "Approved" ||
      j.status === "Accepted" ||
      Boolean(j.raw?.currentAssignment?.acceptedAt || j.raw?.assignment?.acceptedAt || j.acceptedAt || j.raw?.acceptedAt) ||
      j.raw?.currentStage === "DESIGN_IN_PROGRESS"
    );
  };

  // User requirement: Keep only one designer (Priya Raman) and remove login completely
  const designerScopeJobs = jobs.filter(
    (j) => j.status !== "Unassigned" && j.raw?.currentStage !== "DESIGN_QUEUE"
  );

  // Dynamic designer tab counts
  const designerCounts = {
    all: designerScopeJobs.length,
    new: designerScopeJobs.filter(
      (j) => (j.status === "Assigned" || j.raw?.currentStage === "DESIGN_ASSIGNED") && !isJobAccepted(j)
    ).length,
    accepted: designerScopeJobs.filter((j) => isJobAccepted(j)).length,
    in_progress: designerScopeJobs.filter(
      (j) => j.status === "In Progress" || j.raw?.currentStage === "DESIGN_IN_PROGRESS"
    ).length,
    waiting: designerScopeJobs.filter(
      (j) =>
        j.status === "Waiting for Customer" ||
        ["SAMPLE_APPROVAL", "REVISION", "CUSTOMER_PROOF"].includes(j.raw?.currentStage)
    ).length,
    completed: designerScopeJobs.filter(
      (j) =>
        j.status === "Completed" ||
        ["PRODUCTION_PLANNING", "PRODUCTION", "COMPLETED"].includes(j.raw?.currentStage)
    ).length,
  };

  const filteredDesignerJobs = designerScopeJobs.filter((j) => {
    if (designerTab === "all") return true;
    if (designerTab === "new") {
      return (j.status === "Assigned" || j.raw?.currentStage === "DESIGN_ASSIGNED") && !isJobAccepted(j);
    }
    if (designerTab === "accepted") {
      return isJobAccepted(j);
    }
    if (designerTab === "in_progress") {
      return j.status === "In Progress" || j.raw?.currentStage === "DESIGN_IN_PROGRESS";
    }
    if (designerTab === "waiting") {
      return (
        j.status === "Waiting for Customer" ||
        ["SAMPLE_APPROVAL", "REVISION", "CUSTOMER_PROOF"].includes(j.raw?.currentStage)
      );
    }
    if (designerTab === "completed") {
      return (
        j.status === "Completed" ||
        ["PRODUCTION_PLANNING", "PRODUCTION", "COMPLETED"].includes(j.raw?.currentStage)
      );
    }
    return true;
  });

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
          <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 1.25rem", borderBottom: "1px solid var(--jf-border)", flexWrap: "wrap" }}>
            {[
              { id: "all", label: `All Queue (${queueCounts.all})` },
              { id: "unassigned", label: `Unassigned (${queueCounts.unassigned})` },
              { id: "assigned", label: `Assigned (${queueCounts.assigned})` },
              { id: "in_progress", label: `In Progress (${queueCounts.in_progress})` },
              { id: "waiting", label: `Waiting for Approval (${queueCounts.waiting})` },
              { id: "completed", label: `Completed (${queueCounts.completed})` },
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
                width: "150px",
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
                render: (_, job) => {
                  const isUnassigned = job.status === "Unassigned" || job.raw?.currentStage === "DESIGN_QUEUE";
                  const isAssigned = job.status === "Assigned" || job.raw?.currentStage === "DESIGN_ASSIGNED";
                  return (
                    <div style={{ display: "inline-flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                      {isUnassigned && (
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
                      )}
                      {isAssigned && (
                        <button
                          type="button"
                          className="jf-btn jf-btn-secondary jf-btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                            setIsAssignModalOpen(true);
                          }}
                        >
                          <RotateCcw size={14} /> Reassign
                        </button>
                      )}
                      {job.status === "In Progress" && (
                        <button
                          type="button"
                          className="jf-btn jf-btn-secondary jf-btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                            setActiveView("workspace");
                          }}
                        >
                          <Palette size={14} /> Canvas
                        </button>
                      )}
                      {job.status === "Waiting for Customer" && (
                        <button
                          type="button"
                          className="jf-btn jf-btn-secondary jf-btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                            setActiveView("customer-proof");
                          }}
                        >
                          <Eye size={14} /> Proof
                        </button>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={filteredQueueJobs}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search design queue..."
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            emptyMessage="No design jobs in this queue section."
          />
        </div>
      )}

      {/* ──────────────── SCREEN {/* ──────────────── SCREEN 10: DESIGNER MY JOBS (ACCEPT / REJECT) ──────────────── */}
      {activeView === "my-jobs" && (
        <div className="jf-card" style={{ padding: 0 }}>
          <div
            className="jf-card-header"
            style={{
              padding: "1.25rem 1.25rem 0.75rem 1.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <h3 className="jf-card-title" style={{ margin: 0 }}>Designer Work Queue</h3>
                <span
                  className="jf-badge jf-badge-green"
                  style={{ fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.3rem 0.6rem" }}
                >
                  <UserCheck size={14} /> Designer: Priya Raman
                </span>
              </div>
              <p className="jf-header-subtitle" style={{ margin: "0.25rem 0 0 0" }}>
                Review assigned jobs: approve to start design workflow or reject to return to manager queue.
              </p>
            </div>
          </div>

          {/* Designer Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 1.25rem", borderBottom: "1px solid var(--jf-border)", flexWrap: "wrap" }}>
            {[
              { id: "all", label: `All Designer Jobs (${designerCounts.all})` },
              { id: "new", label: `New Assignments (${designerCounts.new})` },
              { id: "accepted", label: `Accepted (${designerCounts.accepted})` },
              { id: "in_progress", label: `In Progress (${designerCounts.in_progress})` },
              { id: "waiting", label: `Waiting for Customer (${designerCounts.waiting})` },
              { id: "completed", label: `Completed (${designerCounts.completed})` },
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
                width: "150px",
                render: (val, job) => <strong>{val || job.raw?.jobNumber || `JO-${(job._id || "").slice(-6)}`}</strong>,
              },
              {
                key: "customerName",
                label: "Customer",
                sortable: true,
                render: (val, job) => val || job.raw?.customerSnapshot?.name || job.raw?.customerName || "Customer",
              },
              {
                key: "title",
                label: "Job Title",
                sortable: true,
                render: (val, job) => val || job.raw?.title || job.raw?.productType || "Design Artwork",
              },
              {
                key: "designer",
                label: "Designer",
                sortable: true,
                render: () => (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: 500 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#10b981",
                      }}
                    />
                    Priya Raman
                  </span>
                ),
              },
              {
                key: "dueDate",
                label: "Due Date",
                sortable: true,
                render: (val, job) => val || (job.raw?.dueDate ? new Date(job.raw.dueDate).toLocaleDateString() : "Scheduled"),
              },
              {
                key: "priority",
                label: "Priority",
                sortable: true,
                render: (val) => (
                  <span className={`jf-badge ${val === "High" || val === "Urgent" ? "jf-badge-red" : "jf-badge-amber"}`}>
                    {val || "Normal"}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                sortable: true,
                render: (val, job) => {
                  const isApproved = isJobAccepted(job);
                  return <StatusBadge status={isApproved ? "Approved" : (val || "Assigned")} />;
                },
              },
              {
                key: "actions",
                label: "Actions",
                sortable: false,
                align: "right",
                render: (_, job) => {
                  const isApproved = isJobAccepted(job);
                  const isAssigned =
                    !isApproved &&
                    (job.status === "Assigned" || job.raw?.currentStage === "DESIGN_ASSIGNED");
                  const isInProgress =
                    job.status === "In Progress" || job.raw?.currentStage === "DESIGN_IN_PROGRESS";
                  return (
                    <div style={{ display: "inline-flex", gap: "0.35rem", justifyContent: "flex-end", alignItems: "center" }}>
                      {isAssigned && (
                        <>
                          <button
                            type="button"
                            className="jf-btn jf-btn-primary jf-btn-sm"
                            title="Approve design assignment and open workflow canvas"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveDesign(job);
                            }}
                          >
                            <Check size={14} /> Approve Design
                          </button>
                          <button
                            type="button"
                            className="jf-btn jf-btn-danger-outline jf-btn-sm"
                            title="Reject design assignment and return to manager queue"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(job);
                              setIsRejectModalOpen(true);
                            }}
                          >
                            <X size={14} /> Reject Design
                          </button>
                        </>
                      )}

                      {isApproved && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                          <span
                            className="jf-badge jf-badge-green"
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", fontWeight: 600 }}
                          >
                            <Check size={13} /> Accepted
                          </span>
                          <button
                            type="button"
                            className="jf-btn jf-btn-primary jf-btn-sm"
                            title="Open design canvas workspace"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(job);
                              setActiveView("workspace");
                            }}
                          >
                            <Palette size={14} /> Canvas
                          </button>
                          <button
                            type="button"
                            className="jf-btn jf-btn-secondary jf-btn-sm"
                            title="Send proof sample to customer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(job);
                              setActiveView("customer-proof");
                            }}
                          >
                            <Eye size={14} /> Proof
                          </button>
                        </div>
                      )}

                      {isInProgress && !isApproved && (
                        <button
                          type="button"
                          className="jf-btn jf-btn-secondary jf-btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                            setActiveView("workspace");
                          }}
                        >
                          <Palette size={14} /> Canvas
                        </button>
                      )}

                      {job.status === "Waiting for Customer" && (
                        <button
                          type="button"
                          className="jf-btn jf-btn-secondary jf-btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                            setActiveView("customer-proof");
                          }}
                        >
                          <Eye size={14} /> View Proof
                        </button>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={filteredDesignerJobs}
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
                  Design Canvas: {selectedJob?.jobNo || "Job Order Canvas"}
                </h3>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  {selectedJob?.title || "Artwork Design"} • Client: {selectedJob?.customerName || "Customer"}
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
                <div style={{ fontSize: "2rem", fontWeight: 800 }}>PrintZ Designer Canvas</div>
                <div style={{ fontSize: "1rem", color: "#a7f3d0", marginTop: "4px" }}>
                  {selectedJob?.title || "Brochures Tri-fold Deluxe"}
                </div>
                <div style={{ fontSize: "0.8125rem", background: "rgba(255, 255, 255, 0.2)", padding: "4px 12px", borderRadius: "4px", marginTop: "1rem", display: "inline-block" }}>
                  Job Ref: {selectedJob?.jobNo || "JO-20261012-0280"}
                </div>
              </div>
            </div>

            {/* Proof Versions History */}
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
                <h3 className="jf-card-title">Upload Design Sample</h3>
              </div>

              <form onSubmit={handleUploadProof}>
                <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="jf-label jf-label-required">Sample Version</label>
                  <input
                    type="text"
                    className="jf-input"
                    value={proofVersion}
                    onChange={(e) => setProofVersion(e.target.value)}
                    required
                  />
                </div>

                <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="jf-label">Sample Notes</label>
                  <textarea
                    className="jf-textarea"
                    rows={3}
                    value={proofNotes}
                    onChange={(e) => setProofNotes(e.target.value)}
                    placeholder="Updated typography and logo resolution as requested..."
                  />
                </div>

                <label className="jf-dropzone" style={{ display: "block", marginBottom: "1rem" }}>
                  <Upload size={24} style={{ color: "var(--jf-primary)", margin: "0 auto 0.5rem" }} />
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                    Click or drop updated sample artwork file
                  </div>
                </label>

                <button type="submit" className="jf-btn jf-btn-primary" style={{ width: "100%", marginBottom: "0.75rem" }}>
                  <Upload size={16} /> Upload Sample
                </button>
              </form>
            </div>

            <button
              type="button"
              className="jf-btn jf-btn-primary"
              style={{ width: "100%", background: "#059669", borderColor: "#059669" }}
              onClick={handleSendSampleToCustomer}
            >
              <Send size={16} /> Send Sample to Customer for Approval
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
              <p style={{ margin: "0 0 0.5rem 0" }}>Hi <strong>{selectedJob?.customerName || "Customer"}</strong>,</p>
              <p style={{ margin: "0 0 0.5rem 0" }}>
                Your print design proof for <strong>{selectedJob?.title || "Design Artwork"} ({selectedJob?.jobNo || "Job Order"})</strong> is ready for your review and approval!
              </p>
              <p style={{ margin: "0 0 0.5rem 0" }}>Please click the secure link below to view the artwork:</p>
              <div style={{ color: "#0284c7", fontWeight: 600, wordBreak: "break-all", background: "#f0f9ff", padding: "6px 8px", borderRadius: "4px" }}>
                https://printz.com/proof/{selectedJob?._id || "token"}
              </div>
            </div>
          </div>

          {/* Customer Mobile Review Screen */}
          <div className="jf-card">
            <div className="jf-card-header">
              <div>
                <h3 className="jf-card-title">Customer Sample Review</h3>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Job No: {selectedJob?.jobNo || "Job Order"}</span>
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
                <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>PrintZ Sample Preview</div>
                <div style={{ fontSize: "0.8125rem", color: "#a7f3d0" }}>{selectedJob?.title || "Artwork Preview"}</div>
                <div style={{ fontSize: "0.75rem", marginTop: "6px" }}>Version: {proofVersion}</div>
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
                  <Check size={16} /> Approve Sample (This design is correct)
                </button>

                {!showRevisionInput ? (
                  <button
                    type="button"
                    className="jf-btn jf-btn-danger-outline"
                    onClick={() => setShowRevisionInput(true)}
                  >
                    <RotateCcw size={16} /> Request Revision (Need changes)
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
                <h4 style={{ margin: "0 0 0.25rem 0" }}>Sample Approved!</h4>
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

      {/* Reject Modal */}
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
        onAssigned={async () => {
          await fetchDesignJobs();
          setActiveView("my-jobs");
          setDesignerTab("new");
          toast.success("Job assigned! Switched to Design Page for designer review.");
        }}
      />
    </JobFlowLayout>
  );
};

export default DesignWorkflowPage;
