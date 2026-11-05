import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  Palette,
  UserCheck,
  Users,
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
  RefreshCw,
  Info,
  Settings,
  MoreVertical,
  ChevronDown,
  Filter,
  Plus,
  Save,
  Download,
  Paperclip,
  Phone,
  Globe,
  Edit2,
  FileText,
  LogOut,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  CheckCheck,
  ExternalLink,
  Copy,
  Power,
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import PriorityBadge from "../../shared/components/PriorityBadge";
import Pagination from "../../../../components/common/Pagination";
import StatusBadge from "../../shared/components/StatusBadge";
import JobTypeBadge from "../../shared/components/JobTypeBadge";
import RejectDesignModal from "../components/RejectDesignModal";
import AssignDesignerModal from "../components/AssignDesignerModal";
import ViewDesignJobModal from "../components/ViewDesignJobModal";
import jobFlowApi from "../api/designApi";
import { useAuth } from "../../../../context/AuthContext";
import { toast } from "react-toastify";
import "../styles/design.css";

// Helper avatar color
const getAvatarColor = (name = "") => {
  const colors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#4f46e5"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name = "") => {
  if (!name || name === "- Unassigned") return "UA";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};


// Shown when a job has no proof file yet (no stock photos)
const NO_PROOF_IMG = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%23475569%22%20font-family%3D%22sans-serif%22%20font-size%3D%2218%22%20text-anchor%3D%22middle%22%3ENo%20proof%20uploaded%3C%2Ftext%3E%3C%2Fsvg%3E";

export const DesignWorkflowPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, role, logout } = useAuth();

  const storedUser = (() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("printz_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  })();
  const storedRole = (localStorage.getItem("userRole") || storedUser?.role || "").toLowerCase();
  const effectiveRole = (role || currentUser?.role || storedRole || "").toLowerCase();
  const effectiveName = (currentUser?.name || storedUser?.name || localStorage.getItem("userName") || "").toLowerCase();
  const effectiveEmail = (currentUser?.email || storedUser?.email || localStorage.getItem("userEmail") || "").toLowerCase();

  // Same people the server lets run the queue and approve proofs
  const isManagerOrAdmin = [
    "manager",
    "branch_manager",
    "branch_manager1",
    "store_manager",
    "admin",
    "super_admin",
    "superadmin",
  ].includes(effectiveRole);

  const isDesignerUser =
    !isManagerOrAdmin &&
    (effectiveRole === "designer" ||
      location.pathname.startsWith("/designer") ||
      location.pathname.includes("/workbench") ||
      location.pathname.includes("/workspace") ||
      [
        "ali hassan",
        "siti rahman",
        "kumar anil",
        "john lee",
        "nur aisyah",
        "guna",
      ].some((name) => effectiveName.includes(name)) ||
      [
        "ali.hassan",
        "siti.rahman",
        "kumar.anil",
        "john.lee",
        "nur.aisyah",
        "guna@",
        "guna",
      ].some((prefix) => effectiveEmail.includes(prefix)));

  const preselectedJobId = searchParams.get("jobId");
  const handledPreselectedJobRef = useRef(null);

  const clearPreselectedJobParam = useCallback(() => {
    if (preselectedJobId) {
      handledPreselectedJobRef.current = preselectedJobId;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("jobId");
        return next;
      }, { replace: true });
    }
  }, [preselectedJobId, setSearchParams]);

  const urlView = searchParams.get("view") || searchParams.get("tab");
  const urlTab = searchParams.get("status");

  const isWorkbenchRoute =
    isDesignerUser &&
    (location.pathname.includes("/workbench") ||
      location.pathname.includes("/workspace") ||
      urlView === "workbench" ||
      urlView === "workspace");

  // Main navigation view (designers default directly to their My Jobs queue; managers always stay in queue)
  const [activeView, setActiveView] = useState(() => {
    if (isWorkbenchRoute) return "workbench";
    if (isDesignerUser) {
      if (urlView === "workbench" || urlView === "my-jobs") {
        return urlView;
      }
      return "my-jobs";
    }
    return (urlView && urlView !== "workbench" && urlView !== "workspace" && urlView !== "my-jobs" && urlView !== "customer-proof") ? urlView : "queue";
  });

  // Strict manager restriction: managers can NEVER access the workbench
  useEffect(() => {
    if (!isDesignerUser && (activeView === "workbench" || activeView === "workspace")) {
      setActiveView("queue");
    }
  }, [isDesignerUser, activeView]);

  useEffect(() => {
    const currentView = searchParams.get("view") || searchParams.get("tab");
    if (isDesignerUser && (currentView === "queue" || !currentView)) {
      setActiveView("my-jobs");
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("view", "my-jobs");
        return next;
      }, { replace: true });
    } else if (isWorkbenchRoute) {
      setActiveView("workbench");
    } else if (currentView === "queue") {
      if (isDesignerUser) {
        setActiveView("my-jobs");
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("view", "my-jobs");
          return next;
        }, { replace: true });
      } else {
        setActiveView("queue");
      }
    } else if (currentView === "my-jobs") {
      // The designers' own job list is for designers only; managers stay in the queue
      if (isDesignerUser) {
        setActiveView("my-jobs");
      } else {
        setActiveView("queue");
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("view", "queue");
          return next;
        }, { replace: true });
      }
    } else if (currentView === "customer-proof") {
      // The customer proof review is a popup now, not a page
      setActiveView(isDesignerUser ? "my-jobs" : "queue");
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("view", isDesignerUser ? "my-jobs" : "queue");
        return next;
      }, { replace: true });
    } else if (currentView === "workbench" || currentView === "workspace") {
      setActiveView("workbench");
    } else if (isDesignerUser && !currentView) {
      setActiveView("my-jobs");
    }
  }, [searchParams, location.pathname, isWorkbenchRoute, isDesignerUser, setSearchParams]);

  const handleViewChange = (newView) => {
    setActiveView(newView);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("view", newView);
      return next;
    });
  };


  // Status Filter Pill
  const [statusFilter, setStatusFilter] = useState(urlTab || "all");
  const [showFilterBar, setShowFilterBar] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal & Selection states
  const [jobs, setJobs] = useState([]);
  const [rejectedAssignments, setRejectedAssignments] = useState([]);
  const [sampleDesigns, setSampleDesigns] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState(null);
  const [isViewingOnly, setIsViewingOnly] = useState(false);

  // Sample Approval Decision Modal states
  const [isSampleDecisionModalOpen, setIsSampleDecisionModalOpen] = useState(false);
  const [selectedSampleForDecision, setSelectedSampleForDecision] = useState(null);
  const [decisionMode, setDecisionMode] = useState("approve"); // "approve" | "reject"
  const [decisionApprovalType, setDecisionApprovalType] = useState("customer"); // "customer" | "manager"
  const [decisionCustomerName, setDecisionCustomerName] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [submittingSampleDecision, setSubmittingSampleDecision] = useState(false);
  const [previewSampleProofUrl, setPreviewSampleProofUrl] = useState(null);

  // Design Workbench states
  const [uploadedSampleUrl, setUploadedSampleUrl] = useState(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [designNotes, setDesignNotes] = useState("");
  const [previewModalFile, setPreviewModalFile] = useState(null);

  // Reference files come from the job order; none are invented here
  const customerFiles = [];

  // Current active job for workbench (falling back to ABC Marketing Flyer if queue is empty or no selection yet)
  const currentWorkbenchJob = useMemo(() => {
    if (selectedJob) return selectedJob;
    if (jobs.length > 0) {
      const inProg = jobs.find((j) => j.status === "In Progress" || j.status === "Assigned");
      return inProg || jobs[0];
    }
    return { _id: null, jobNo: "", customerName: "", title: "", status: "", designerName: "", specialInstructions: "" };
  }, [selectedJob, jobs]);

  const handleSampleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedSampleUrl(event.target.result);
      toast.success(`Uploaded sample file: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveWorkbench = () => {
    toast.success("Design draft saved successfully!");
  };

  const handleDownloadProof = () => {
    toast.info("Preparing design proof for download...");
    const link = document.createElement("a");
    const proofFile = uploadedSampleUrl || currentWorkbenchJob?.designProofUrl || currentWorkbenchJob?.raw?.designProofUrl;
    if (!proofFile) {
      toast.error("There is no proof file to download yet.");
      return;
    }
    link.href = proofFile;
    link.download = `${currentWorkbenchJob.jobNo || "job"}_Proof.jpg`;
    link.target = "_blank";
    link.click();
    toast.success("Download started!");
  };

  const handleSubmitForReview = async () => {
    const isRevisionJob =
      currentWorkbenchJob.status === "Revision" ||
      currentWorkbenchJob.stage === "REVISION" ||
      currentWorkbenchJob.designStatus === "REVISION" ||
      currentWorkbenchJob.designStatus === "REJECTED_SAMPLE" ||
      currentWorkbenchJob.designStatus === "STARTED_REVISION" ||
      currentWorkbenchJob.isRedesign;

    const currentDes = activeSelectedDesigner || currentUser;
    const targetName = (currentDes?.name || effectiveName || "").toLowerCase().trim();
    const targetEmail = (currentDes?.email || effectiveEmail || "").toLowerCase().trim();
    const targetId = String(currentDes?._id || currentDes?.userId || currentDes?.employeeId || "");

    const assignedName = (currentWorkbenchJob.designerName || "").toLowerCase().trim();
    const assignedEmail = (currentWorkbenchJob.designerEmail || "").toLowerCase().trim();
    const assignedId = String(currentWorkbenchJob.designerId || currentWorkbenchJob.raw?.designerId?._id || currentWorkbenchJob.raw?.designerId || "");

    const isAssignedToMe =
      !isDesignerUser ||
      !assignedName ||
      assignedName === "- unassigned" ||
      (targetId && assignedId && targetId === assignedId) ||
      (targetEmail && assignedEmail && targetEmail === assignedEmail) ||
      (targetName && assignedName && (targetName === assignedName || targetName.includes(assignedName) || assignedName.includes(targetName)));

    if (isRevisionJob && !isAssignedToMe) {
      toast.error(`Unauthorized: Redesign must be performed exclusively by the assigned designer (${currentWorkbenchJob.designerName}).`);
      return;
    }

    const jobId = currentWorkbenchJob._id || currentWorkbenchJob.id;
    const proofUrl =
      uploadedSampleUrl ||
      currentWorkbenchJob.raw?.designProofUrl ||
      currentWorkbenchJob.designProofUrl ||
      "";
    if (!proofUrl) {
      toast.error("Upload the proof file before sending it for approval.");
      return;
    }

    let submitResult = null;
    let approvalUrl = "";

    try {
      const res = await jobFlowApi.submitSampleProof(jobId, {
        fileUrl: proofUrl,
        notes: designNotes,
      });
      submitResult = res?.data?.data || res?.data || res || {};
      // A walk-in customer has no approval link: the manager approves the proof in person
      approvalUrl = submitResult?.approvalUrl || "";
    } catch (err) {
      toast.error(err.response?.data?.message || "The proof could not be submitted for approval.");
      return;
    }

    // Build the updated job object with Pending Sample Approvals status
    const updatedJob = {
      ...currentWorkbenchJob,
      status: "Pending Sample Approvals",
      stage: "SAMPLE_APPROVAL",
      designStatus: "PENDING_SAMPLE_APPROVAL",
      designProofUrl: proofUrl,
      approvalUrl: approvalUrl,
      proofUrl: proofUrl,
      isRevisionStarted: false,
      revisionStartedAt: null,
      raw: {
        ...(currentWorkbenchJob.raw || {}),
        stage: "SAMPLE_APPROVAL",
        currentStage: "SAMPLE_APPROVAL",
        designStatus: "PENDING_SAMPLE_APPROVAL",
        designProofUrl: proofUrl,
        approvalUrl: approvalUrl,
        isRevisionStarted: false,
      },
    };

    // 1. Optimistically update jobs array
    setJobs((prevJobs) =>
      prevJobs.map((j) =>
        String(j._id || j.id) === String(jobId) || j.jobNo === currentWorkbenchJob.jobNo
          ? { ...j, ...updatedJob }
          : j
      )
    );

    // 2. Optimistically add / update sample in sampleDesigns array so it appears immediately in Manager's Sample Approvals
    setSampleDesigns((prevSamples) => {
      const targetJobNo = currentWorkbenchJob.jobNo;
      const existingIdx = prevSamples.findIndex(
        (s) => String(s.jobId || s._id) === String(jobId) || s.jobNo === targetJobNo
      );
      const newSampleEntry = {
        _id: submitResult?.sampleId || `sample-${jobId}-${Date.now()}`,
        sampleId: submitResult?.sampleId || null,
        jobId: String(jobId),
        jobNo: currentWorkbenchJob.jobNo,
        customerName: currentWorkbenchJob.customerName || "Customer",
        customerPhone: currentWorkbenchJob.raw?.customerPhone || currentWorkbenchJob.customerPhone || "",
        jobItem: currentWorkbenchJob.title || currentWorkbenchJob.jobItem || "Custom Print Order",
        designerName: currentWorkbenchJob.designerName !== "- Unassigned" ? currentWorkbenchJob.designerName : "Assigned Designer",
        designerEmail: currentWorkbenchJob.designerEmail || "",
        versionNo: submitResult?.versionNo || 1,
        revisionNo: 0,
        fileUrl: proofUrl,
        status: "SUBMITTED",
        customerFeedback: "", // Empty ensures getApprovalStatus returns type: "pending", label: "Pending"
        isManagerApproval: false,
        submittedAt: new Date().toISOString(),
        approvalUrl: approvalUrl,
        token: submitResult?.token,
        jobOrder: updatedJob,
      };
      if (existingIdx >= 0) {
        const copy = [...prevSamples];
        copy[existingIdx] = { ...copy[existingIdx], ...newSampleEntry };
        return copy;
      }
      return [newSampleEntry, ...prevSamples];
    });

    // 3. Clear revision started tracker for this job
    if (jobId) {
      setStartedRevisionJobIds((prev) => {
        const next = new Set(prev);
        next.delete(String(jobId));
        try {
          localStorage.setItem("printz_started_revision_jobs", JSON.stringify(Array.from(next)));
        } catch (_) {}
        return next;
      });
    }

    // 4. Update selectedJob for Screen 4 (WhatsApp Customer Proof)
    setSelectedJob(updatedJob);

    toast.success("Design proof submitted! Status changed to Pending Sample Approvals.");
    setActiveView(isDesignerUser ? "my-jobs" : "queue");
    setProofPopup(true);

    try {
      await fetchDesignData();
    } catch (_) {}
  };

  const handlePreviewFile = (file) => {
    setPreviewModalFile(file);
  };

  const handleDownloadFile = (file) => {
    toast.info(`Downloading ${file.name}...`);
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.name;
    link.target = "_blank";
    link.click();
  };

  // Round Robin setting state
  const [globalMaxLoad, setGlobalMaxLoad] = useState(5);
  const [savingGlobalMaxLoad, setSavingGlobalMaxLoad] = useState(false);

  // Designer Queue states
  const [designers, setDesigners] = useState([]);
  const [allDesigners, setAllDesigners] = useState([]); // includes inactive, for the Designer Queue table
  const [designerPageSize, setDesignerPageSize] = useState(5);
  const [editDesigner, setEditDesigner] = useState(null); // { id, name, email, mobile, maxLoad }
  const [savingEditDesigner, setSavingEditDesigner] = useState(false);
  const [nextDesignerId, setNextDesignerId] = useState(null);
  const [editingDesignerId, setEditingDesignerId] = useState(null);
  const [editingDesignerLoad, setEditingDesignerLoad] = useState(5);
  const [savingDesignerId, setSavingDesignerId] = useState(null);
  const [designerPage, setDesignerPage] = useState(1);
  const [proofPopup, setProofPopup] = useState(false);
  const [queueSearch, setQueueSearch] = useState("");
  const [designerFilter, setDesignerFilter] = useState("all");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");
  const [showAddDesigner, setShowAddDesigner] = useState(false);
  const [addingDesigner, setAddingDesigner] = useState(false);
  const [newDesigner, setNewDesigner] = useState({ name: "", email: "", mobile: "", password: "", maxLoad: 5 });

  // Sub-workspace states (for My Jobs, Canvas & Customer Proof)
  const [selectedDesignerProfile, setSelectedDesignerProfile] = useState("all");

  // Automatically sync profile to logged-in designer
  useEffect(() => {
    if (isDesignerUser) {
      const myEmail = (effectiveEmail || "").toLowerCase();
      const myName = (effectiveName || "").toLowerCase();
      const matched = designers.find(
        (d) =>
          (d.email && d.email.toLowerCase() === myEmail) ||
          (d.name && d.name.toLowerCase() === myName) ||
          (currentUser && String(d._id) === String(currentUser._id || currentUser.id))
      );
      if (matched) {
        setSelectedDesignerProfile(String(matched._id || matched.userId || matched.employeeId));
      } else if (myName) {
        const foundByName = designers.find((d) => (d.name || "").toLowerCase().includes(myName) || myName.includes((d.name || "").toLowerCase()));
        if (foundByName) {
          setSelectedDesignerProfile(String(foundByName._id || foundByName.userId || foundByName.employeeId));
        } else {
          setSelectedDesignerProfile(myName);
        }
      }
    }
  }, [currentUser, isDesignerUser, designers, effectiveEmail, effectiveName]);

  const [designerTab, setDesignerTab] = useState("all");
  const [designerSubTab, setDesignerSubTab] = useState("assigned"); // 'assigned' | 'revision' | 'rejected'
  const [approvedJobIds, setApprovedJobIds] = useState(new Set());
  const [startedRevisionJobIds, setStartedRevisionJobIds] = useState(() => {
    try {
      const stored = localStorage.getItem("printz_started_revision_jobs");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  // Action for designer to start revision/redesign work
  const handleStartRedesign = async (job) => {
    const jId = String(job._id || job.id);
    try {
      await jobFlowApi.startDesignWork(jId);
    } catch (err) {
      toast.error(err.response?.data?.message || "The revision could not be started.");
      return;
    }

    setStartedRevisionJobIds((prev) => {
      const next = new Set(prev);
      next.add(jId);
      try {
        localStorage.setItem("printz_started_revision_jobs", JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });

    setJobs((prevJobs) =>
      prevJobs.map((j) =>
        String(j._id) === jId
          ? { ...j, designStatus: "STARTED_REVISION", isRevisionStarted: true, revisionStartedAt: new Date().toISOString() }
          : j
      )
    );

    toast.success(`Revision workflow started for ${job.jobNo}! Button updated to Open to Workbench.`);
  };

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
  const [customerRevisionNotes, setCustomerRevisionNotes] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [approvingProof, setApprovingProof] = useState(false);

  // Initialize and fetch live MongoDB data
  const fetchDesignData = async () => {
    setLoading(true);
    try {
      // 1. Fetch live queue jobs and auxiliary design data in parallel to prevent waterfall timeouts
      const [queueSettled, poolSettled, rejSettled, samplesSettled] = await Promise.allSettled([
        jobFlowApi.getDesignQueue(),
        jobFlowApi.getDesignerPool({ includeInactive: true }),
        jobFlowApi.getRejectedAssignments(),
        jobFlowApi.getAllSampleDesigns(),
      ]);

      if (queueSettled.status === "rejected") {
        console.warn("Error fetching design queue:", queueSettled.reason);
        if (queueSettled.reason?.code === "ECONNABORTED" || queueSettled.reason?.message?.includes("timeout")) {
          toast.warning("Design queue query took longer than expected; using cached data.");
        }
      }

      const res = queueSettled.status === "fulfilled" ? queueSettled.value : null;
      const rawQueue = res?.data || res?.items || res || [];
      const queueArray = Array.isArray(rawQueue) ? rawQueue : [];

      const mapped = queueArray.map((single) => {
        const designer =
          single.designerId?.name ||
          single.designerName ||
          (single.designerId ? "Assigned Designer" : "- Unassigned");

        const stage = single.currentStage || single.stage || "DESIGN_QUEUE";
        const rawDesignStatus = single.designStatus || single.raw?.designStatus || "";
        const hasDesigner = Boolean(
          single.designerId ||
          (single.designerName && single.designerName !== "- Unassigned" && single.designerName !== "Unassigned")
        );

        const isStartedRev = Boolean(
          single.isRevisionStarted ||
          single.raw?.isRevisionStarted ||
          rawDesignStatus === "STARTED_REVISION" ||
          startedRevisionJobIds.has(String(single._id || single.id))
        );

        const isRejectedInitial = Boolean(
          rawDesignStatus === "REJECTED" ||
          (single.designRejectionReason && !hasDesigner && rawDesignStatus !== "REJECTED_SAMPLE")
        );

        const isRevisionStage = Boolean(
          rawDesignStatus === "REJECTED_SAMPLE" ||
          rawDesignStatus === "STARTED_REVISION" ||
          rawDesignStatus === "REVISION" ||
          stage === "REVISION"
        );

        let resolvedDesignStatus = "UNASSIGNED";
        let statusDisplay = "Waiting";

        if (rawDesignStatus === "COMPLETED" || stage === "COMPLETED" || stage === "PRODUCTION_PLANNING") {
          resolvedDesignStatus = "COMPLETED";
          statusDisplay = "Approved";
        } else if (isRevisionStage) {
          if (isStartedRev) {
            resolvedDesignStatus = "STARTED_REVISION";
            statusDisplay = "Revision Started";
          } else {
            resolvedDesignStatus = "REJECTED_SAMPLE";
            statusDisplay = "Revision Required";
          }
        } else if (
          rawDesignStatus === "PENDING_SAMPLE_APPROVAL" ||
          rawDesignStatus === "SAMPLE_APPROVAL" ||
          stage === "SAMPLE_APPROVAL" ||
          stage === "CUSTOMER_PROOF"
        ) {
          resolvedDesignStatus = "PENDING_SAMPLE_APPROVAL";
          statusDisplay = "Pending Sample Approvals";
        } else if (isRejectedInitial) {
          resolvedDesignStatus = "REJECTED";
          statusDisplay = "Rejected";
        } else if (rawDesignStatus === "IN_PROGRESS" || stage === "DESIGN_IN_PROGRESS") {
          resolvedDesignStatus = "IN_PROGRESS";
          statusDisplay = "In Progress";
        } else if (rawDesignStatus === "PENDING_DESIGNER_APPROVAL" || stage === "DESIGN_ASSIGNED" || hasDesigner) {
          resolvedDesignStatus = "PENDING_DESIGNER_APPROVAL";
          statusDisplay = "Assigned";
        } else {
          resolvedDesignStatus = "UNASSIGNED";
          statusDisplay = "Waiting";
        }

        const rawPriority = (single.priority || "NORMAL").toUpperCase();
        const priorityDisplay = ["URGENT", "HIGH", "RUSH"].includes(rawPriority) ? "Urgent" : "Normal";

        const rejectionReason =
          single.designRejectionReason ||
          single.rejectionReason ||
          single.raw?.designRejectionReason ||
          "";

        const cleanProofUrl = (url) => {
          if (!url || typeof url !== "string") return null;
          if (url.includes("proofs.com")) return null;
          return url;
        };

        const rejectedProof =
          cleanProofUrl(single.rejectedSampleUrl) ||
          cleanProofUrl(single.raw?.rejectedSampleUrl) ||
          cleanProofUrl(single.designProofUrl) ||
          cleanProofUrl(single.raw?.designProofUrl) ||
          null;

        const rejectionDate =
          single.sampleRejectedAt ||
          single.raw?.sampleRejectedAt ||
          single.updatedAt ||
          single.raw?.updatedAt ||
          null;

        const resolvedProofUrl =
          cleanProofUrl(single.designProofUrl) ||
          cleanProofUrl(single.proofUrl) ||
          cleanProofUrl(single.raw?.designProofUrl) ||
          cleanProofUrl(single.raw?.proofUrl) ||
          null;

        return {
          _id: single._id || single.id,
          jobNo: single.jobNo || single.orderNumber || `JO-${String(single._id).slice(-6)}`,
          customerName: single.customerName || single.customerSnapshot?.name || "Direct Customer",
          title: single.title || single.items?.[0]?.itemName || "Custom Print Order",
          priority: priorityDisplay,
          jobType: single.jobType || single.specs?.jobType || "",
          isDesignOnly: (() => {
            const t = String(single.jobType || single.specs?.jobType || "").toUpperCase();
            return t.includes("DESIGN") && !t.includes("PRINT");
          })(),
          designerName: designer,
          designerId:
            single.designerId?._id ||
            (typeof single.designerId === "string"
              ? single.designerId
              : single.designerId
                ? String(single.designerId)
                : null),
          designerEmail: single.designerId?.email || "",
          status: statusDisplay,
          stage: stage,
          isRejected: isRejectedInitial,
          rejectionReason,
          designStatus: resolvedDesignStatus,
          designRejectionReason: rejectionReason,
          rejectedSampleUrl: rejectedProof,
          sampleRejectedAt: rejectionDate,
          designProofUrl: resolvedProofUrl,
          proofUrl: resolvedProofUrl,
          sampleVersion: single.sampleVersion || single.raw?.sampleVersion || "Proof v1.0",
          slaDue: single.dueDate ? new Date(single.dueDate).toLocaleDateString() : "Pending",
          quantity: single.quantity || single.items?.[0]?.quantity || 1,
          size: single.specs?.size || single.items?.[0]?.specifications?.size || "Standard",
          color: single.specs?.color || single.items?.[0]?.specifications?.color || "4C / 0C",
          paperType: single.specs?.paperType || single.items?.[0]?.specifications?.paperType || "Standard Paper",
          specialInstructions: single.remarks || single.customerRequirements || "",
          isRevisionStarted: isStartedRev,
          revisionStartedAt: single.revisionStartedAt || single.raw?.revisionStartedAt || null,
          raw: single,
        };
      });

      // Filter out any Print Only jobs from design queue completely
      const designEligibleMapped = mapped.filter((j) => {
        const jobTypeStr = String(j.raw?.jobType || j.raw?.specs?.jobType || "").toUpperCase();
        const isPrintOnly = jobTypeStr.includes("PRINT") && !jobTypeStr.includes("DESIGN");
        return !isPrintOnly;
      });

      const combined = designEligibleMapped;

      setJobs(combined);

      // Sync any started revision job IDs from backend into local set
      const backendStartedRevIds = queueArray
        .filter((s) => s.isRevisionStarted || s.raw?.isRevisionStarted)
        .map((s) => String(s._id || s.id));
      if (backendStartedRevIds.length > 0) {
        setStartedRevisionJobIds((prev) => {
          const next = new Set(prev);
          backendStartedRevIds.forEach((id) => next.add(id));
          return next;
        });
      }

      // Preselected job from URL query (only open once on initial load if job is not already allocated)
      if (preselectedJobId && handledPreselectedJobRef.current !== preselectedJobId) {
        const match = combined.find((j) => String(j._id) === String(preselectedJobId) || j.jobNo === preselectedJobId);
        const isAlreadyAssigned =
          match &&
          (match.status !== "Waiting" ||
            (match.designerName && match.designerName !== "- Unassigned"));

        if (match && !isAlreadyAssigned) {
          handledPreselectedJobRef.current = preselectedJobId;
          setSelectedJob(match);
          setIsAssignModalOpen(true);
        } else if (match && isAlreadyAssigned) {
          handledPreselectedJobRef.current = preselectedJobId;
        }
      }


      // 2. Process live designer pool from MongoDB
      if (poolSettled?.status === "fulfilled") {
        const poolRes = poolSettled.value;
        const rawDesigners =
          poolRes?.designers ||
          poolRes?.data?.designers ||
          (Array.isArray(poolRes?.data) ? poolRes.data : null) ||
          (Array.isArray(poolRes) ? poolRes : []);
        // The pool is the six branch designers, exactly as the server returns them
        if (Array.isArray(rawDesigners)) {
          // Inactive designers stay in the Designer Queue table (so they can be re-activated) but not in the work pool
          setAllDesigners(rawDesigners);
          const activeDesigners = rawDesigners.filter((d) => d.isActive !== false);
          setDesigners(activeDesigners);
          if (activeDesigners[0]?.maxLoad) {
            setGlobalMaxLoad(activeDesigners[0].maxLoad);
          }
        }
        if (poolRes?.nextDesigner) {
          setNextDesignerId(poolRes.nextDesigner);
        }
      } else if (poolSettled?.status === "rejected") {
        console.warn("Could not load designer pool:", poolSettled.reason);
      }

      // 3. Process live rejected assignments from MongoDB
      if (rejSettled?.status === "fulfilled") {
        const rejRes = rejSettled.value;
        const rejList = rejRes?.data || rejRes || [];
        if (Array.isArray(rejList)) {
          setRejectedAssignments(rejList);
        }
      } else if (rejSettled?.status === "rejected") {
        console.warn("Could not load rejected assignments:", rejSettled.reason);
      }

      // 4. Process live sample designs from MongoDB
      if (samplesSettled?.status === "fulfilled") {
        const samplesRes = samplesSettled.value;
        const samplesList = samplesRes?.data || samplesRes || [];
        if (Array.isArray(samplesList)) {
          setSampleDesigns(samplesList);
        }
      } else if (samplesSettled?.status === "rejected") {
        console.warn("Could not load sample designs:", samplesSettled.reason);
      }
    } catch (err) {
      console.error("Error fetching live MongoDB design data:", err);
      toast.error("Failed to load design queue from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignData();
  }, [preselectedJobId]);

  // Combined designer rejected assignments
  const combinedRejections = useMemo(() => {
    const list = [...rejectedAssignments];
    const seenJobNos = new Set(list.map((r) => r.jobNo));

    for (const j of jobs) {
      if ((j.isRejected || j.designStatus === "REJECTED" || j.designRejectionReason) && !seenJobNos.has(j.jobNo)) {
        const isPending = !j.designerName || j.designerName === "- Unassigned";
        list.push({
          _id: `live-rej-${j._id}`,
          assignmentId: null,
          jobId: j._id,
          jobNo: j.jobNo,
          customerName: j.customerName,
          jobItem: j.title,
          jobType: j.jobType,
          priority: j.priority,
          rejectedBy: "Designer",
          rejectionReason: j.rejectionReason || j.designRejectionReason || "Allocation rejected",
          rejectedAt: j.raw?.updatedAt || new Date().toISOString(),
          currentDesigner: isPending ? null : j.designerName,
          currentStage: j.stage || "DESIGN_QUEUE",
          isPendingReallocation: isPending,
          status: isPending ? "Pending Reallocation" : "Assigned",
          jobOrder: j.raw || j,
        });
        seenJobNos.add(j.jobNo);
      }
    }
    return list;
  }, [rejectedAssignments, jobs]);

  // Combined sample designs for Sample Approvals tab (strictly PENDING_SAMPLE_APPROVAL)
  const combinedSamples = useMemo(() => {
    // Only pending samples belong in the Sample Approvals table
    const list = sampleDesigns.filter(
      (s) => s.status !== "APPROVED" && s.status !== "REVISION_REQUIRED"
    );
    const seenJobIds = new Set(list.map((s) => String(s.jobId || s._id)));

    for (const j of jobs) {
      const jId = String(j._id);
      if (!seenJobIds.has(jId)) {
        const isPendingSample =
          j.designStatus === "PENDING_SAMPLE_APPROVAL" ||
          j.stage === "SAMPLE_APPROVAL" ||
          j.stage === "CUSTOMER_PROOF" ||
          j.status === "Pending Sample Approvals" ||
          j.status === "Proof Sent";

        const isCompleted =
          j.designStatus === "COMPLETED" ||
          j.stage === "COMPLETED" ||
          j.stage === "PRODUCTION_PLANNING" ||
          j.status === "Completed";

        const isRevision =
          j.designStatus === "REJECTED_SAMPLE" ||
          j.designStatus === "STARTED_REVISION" ||
          j.designStatus === "REVISION" ||
          j.stage === "REVISION" ||
          j.status === "Revision";

        if (isPendingSample && !isCompleted && !isRevision) {
          const custName = j.customerName || j.raw?.customerName || "Customer";
          list.push({
            _id: `live-sample-${jId}`,
            sampleId: null,
            jobId: jId,
            jobNo: j.jobNo,
            customerName: custName,
            customerPhone: j.raw?.customerPhone || j.customerPhone || "",
            jobItem: j.title || "Custom Print Order",
            jobType: j.jobType,
            designerName: j.designerName !== "- Unassigned" ? j.designerName : "Assigned Designer",
            designerEmail: j.designerEmail || "",
            versionNo: j.raw?.versionNo || 1,
            revisionNo: 0,
            fileUrl: j.raw?.designProofUrl || j.designProofUrl || NO_PROOF_IMG,
            status: "SUBMITTED",
            customerFeedback: "",
            isManagerApproval: false,
            submittedAt: j.raw?.updatedAt || j.raw?.createdAt || new Date().toISOString(),
            priority: j.priority,
            jobOrder: j.raw || j,
          });
          seenJobIds.add(jId);
        }
      }
    }
    return list;
  }, [sampleDesigns, jobs]);

  // Tab counts based on current jobs matching user tabs: all, pending, assigned, redesign/revision, samples, completed, rejected
  const counts = useMemo(() => {
    return {
      all: jobs.length,
      pending: jobs.filter(
        (j) =>
          (j.designStatus === "UNASSIGNED" ||
            !j.designerName ||
            j.designerName === "- Unassigned" ||
            j.designerName === "Unassigned") &&
          j.designStatus !== "REJECTED" &&
          j.designStatus !== "REJECTED_SAMPLE" &&
          j.designStatus !== "STARTED_REVISION" &&
          j.stage !== "REVISION"
      ).length,
      assigned: jobs.filter(
        (j) =>
          (j.designStatus === "PENDING_DESIGNER_APPROVAL" ||
            j.designStatus === "IN_PROGRESS" ||
            j.status === "Assigned" ||
            j.status === "In Progress") &&
          j.designStatus !== "PENDING_SAMPLE_APPROVAL" &&
          j.designStatus !== "COMPLETED" &&
          j.designStatus !== "REJECTED_SAMPLE" &&
          j.designStatus !== "STARTED_REVISION" &&
          j.stage !== "SAMPLE_APPROVAL" &&
          j.stage !== "REVISION" &&
          j.stage !== "PRODUCTION_PLANNING" &&
          j.designerName &&
          j.designerName !== "- Unassigned" &&
          j.designerName !== "Unassigned"
      ).length,
      redesign: jobs.filter(
        (j) =>
          j.designStatus === "REJECTED_SAMPLE" ||
          j.designStatus === "STARTED_REVISION" ||
          j.designStatus === "REVISION" ||
          j.stage === "REVISION" ||
          j.status === "Revision"
      ).length,
      samples: combinedSamples.length,
      completed: jobs.filter(
        (j) =>
          j.designStatus === "COMPLETED" ||
          j.stage === "COMPLETED" ||
          j.stage === "PRODUCTION_PLANNING" ||
          j.status === "Completed" ||
          j.status === "Approved"
      ).length,
      rejected: combinedRejections.length,
    };
  }, [jobs, combinedRejections, combinedSamples]);

  // All active jobs for Designer My Jobs view
  const activeMyJobs = useMemo(() => {
    return jobs.filter(
      (j) =>
        j.designStatus === "PENDING_DESIGNER_APPROVAL" ||
        j.designStatus === "IN_PROGRESS" ||
        j.designStatus === "PENDING_SAMPLE_APPROVAL" ||
        j.designStatus === "REJECTED_SAMPLE" ||
        j.designStatus === "STARTED_REVISION" ||
        j.status === "Assigned" ||
        j.status === "In Progress" ||
        j.status === "Waiting" ||
        j.status === "Revision" ||
        j.status === "Pending Sample Approvals" ||
        j.status === "Proof Sent" ||
        j.stage === "DESIGN_ASSIGNED" ||
        j.stage === "DESIGN_IN_PROGRESS" ||
        j.stage === "DESIGN_QUEUE" ||
        j.stage === "SAMPLE_APPROVAL" ||
        j.stage === "CUSTOMER_PROOF" ||
        j.stage === "REVISION" ||
        j.designStatus === "REVISION" ||
        j.raw?.designStatus === "REVISION" ||
        combinedSamples.some(
          (s) => String(s.jobId || s._id) === String(j._id) && s.status === "REVISION_REQUIRED"
        )
    );
  }, [jobs, combinedSamples]);

  // Active job counts mapped per designer in the pool
  const designerQueueCounts = useMemo(() => {
    const countsMap = {};
    for (const des of designers) {
      const dId = String(des._id || des.userId || des.employeeId || "");
      const dName = (des.name || "").toLowerCase().trim();
      const dEmail = (des.email || "").toLowerCase().trim();

      countsMap[dId] = activeMyJobs.filter((j) => {
        const jId = String(j.designerId || j.raw?.designerId?._id || j.raw?.designerId || "");
        const jName = (j.designerName || "").toLowerCase().trim();
        const jEmail = (j.designerEmail || "").toLowerCase().trim();

        if (dId && jId && jId === dId) return true;
        if (dName && jName && (jName === dName || jName.includes(dName) || dName.includes(jName))) return true;
        if (dEmail && jEmail && jEmail === dEmail) return true;
        return false;
      }).length;
    }
    return countsMap;
  }, [activeMyJobs, designers]);

  // Active selected designer object (null when "all" in supervisor mode, or logged in designer)
  const activeSelectedDesigner = useMemo(() => {
    if (selectedDesignerProfile === "all") {
      if (isDesignerUser && currentUser) {
        const myEmail = (currentUser.email || "").toLowerCase();
        const myName = (currentUser.name || "").toLowerCase();
        return (
          designers.find((d) => (d.email && d.email.toLowerCase() === myEmail) || (d.name && d.name.toLowerCase() === myName)) ||
          designers[0]
        );
      }
      return null;
    }
    return (
      designers.find((d) => String(d._id || d.userId || d.employeeId) === String(selectedDesignerProfile)) ||
      designers.find((d) => (d.name || "").toLowerCase() === String(selectedDesignerProfile).toLowerCase()) ||
      designers.find((d) => (d.email || "").toLowerCase() === String(selectedDesignerProfile).toLowerCase()) ||
      null
    );
  }, [selectedDesignerProfile, designers, isDesignerUser, currentUser]);


  // Filtered jobs for current profile view in My Jobs
  const displayedMyJobs = useMemo(() => {
    const currentDes = activeSelectedDesigner;
    if (selectedDesignerProfile === "all") {
      if (isDesignerUser && currentDes) {
        const dId = String(currentDes._id || currentDes.userId || currentDes.employeeId || "");
        const dName = (currentDes.name || "").toLowerCase().trim();
        const dEmail = (currentDes.email || "").toLowerCase().trim();

        return activeMyJobs.filter((j) => {
          const jId = String(j.designerId || j.raw?.designerId?._id || j.raw?.designerId || "");
          const jName = (j.designerName || "").toLowerCase().trim();
          const jEmail = (j.designerEmail || "").toLowerCase().trim();

          if (dId && jId && jId === dId) return true;
          if (dName && jName && (jName === dName || jName.includes(dName) || dName.includes(jName))) return true;
          if (dEmail && jEmail && jEmail === dEmail) return true;
          return false;
        });
      }
      return activeMyJobs;
    }
    if (!currentDes) return activeMyJobs;

    const dId = String(currentDes._id || currentDes.userId || currentDes.employeeId || "");
    const dName = (currentDes.name || "").toLowerCase().trim();
    const dEmail = (currentDes.email || "").toLowerCase().trim();

    return activeMyJobs.filter((j) => {
      const jId = String(j.designerId || j.raw?.designerId?._id || j.raw?.designerId || "");
      const jName = (j.designerName || "").toLowerCase().trim();
      const jEmail = (j.designerEmail || "").toLowerCase().trim();

      if (dId && jId && jId === dId) return true;
      if (dName && jName && (jName === dName || jName.includes(dName) || dName.includes(jName))) return true;
      if (dEmail && jEmail && jEmail === dEmail) return true;
      return false;
    });
  }, [activeMyJobs, selectedDesignerProfile, activeSelectedDesigner, isDesignerUser]);

  // Filtered rejected assignments for the specific logged-in designer / selected profile
  const myDesignerRejections = useMemo(() => {
    const currentDes = activeSelectedDesigner;
    const targetName = (currentDes?.name || effectiveName || currentUser?.name || "").toLowerCase().trim();
    const targetEmail = (currentDes?.email || effectiveEmail || currentUser?.email || "").toLowerCase().trim();
    const targetId = String(currentDes?._id || currentDes?.userId || currentDes?.employeeId || currentUser?._id || "");

    return combinedRejections.filter((rej) => {
      // In supervisor mode with "all", show all rejections in this tab
      if (selectedDesignerProfile === "all" && !isDesignerUser) return true;

      const rejName = (rej.rejectedBy || "").toLowerCase().trim();
      const rejEmail = (rej.rejectedByEmail || "").toLowerCase().trim();
      const rejDesId = String(rej.designerId || rej.employeeId || "");

      if (targetId && rejDesId && targetId === rejDesId) return true;
      if (targetName && rejName && (rejName === targetName || rejName.includes(targetName) || targetName.includes(rejName))) return true;
      if (targetEmail && rejEmail && targetEmail === rejEmail) return true;
      return false;
    });
  }, [combinedRejections, activeSelectedDesigner, effectiveName, effectiveEmail, currentUser, selectedDesignerProfile, isDesignerUser]);

  // Dedicated filtered lists for Designer sub-tabs
  const myRevisionJobs = useMemo(() => {
    return displayedMyJobs.filter((j) => {
      const isRev =
        j.designStatus === "REJECTED_SAMPLE" ||
        j.designStatus === "STARTED_REVISION" ||
        j.designStatus === "REVISION" ||
        j.raw?.designStatus === "REJECTED_SAMPLE" ||
        j.raw?.designStatus === "STARTED_REVISION" ||
        j.raw?.designStatus === "REVISION" ||
        j.status === "Revision" ||
        j.stage === "REVISION" ||
        combinedSamples.some(
          (s) => String(s.jobId || s._id) === String(j._id) && s.status === "REVISION_REQUIRED"
        );
      return isRev;
    });
  }, [displayedMyJobs, combinedSamples]);

  const myAssignedJobs = useMemo(() => {
    return displayedMyJobs.filter((j) => {
      const isRev =
        j.designStatus === "REJECTED_SAMPLE" ||
        j.designStatus === "STARTED_REVISION" ||
        j.designStatus === "REVISION" ||
        j.raw?.designStatus === "REJECTED_SAMPLE" ||
        j.raw?.designStatus === "STARTED_REVISION" ||
        j.raw?.designStatus === "REVISION" ||
        j.status === "Revision" ||
        j.stage === "REVISION" ||
        combinedSamples.some(
          (s) => String(s.jobId || s._id) === String(j._id) && s.status === "REVISION_REQUIRED"
        );
      return !isRev;
    });
  }, [displayedMyJobs, combinedSamples]);

  // Standardized helper for Sample Approvals status: only "Approved by Customer", "Approved by Manager", or "Pending"
  const getApprovalStatus = useCallback((sample, targetJob) => {
    const isApproved =
      sample.status === "APPROVED" ||
      sample.currentStage === "COMPLETED" ||
      sample.currentStage === "PRODUCTION_PLANNING" ||
      targetJob?.status === "Completed" ||
      targetJob?.stage === "COMPLETED" ||
      targetJob?.stage === "PRODUCTION_PLANNING";

    const isRevision =
      sample.status === "REVISION_REQUIRED" ||
      sample.currentStage === "REVISION" ||
      targetJob?.status === "Revision" ||
      targetJob?.stage === "REVISION";

    if (isRevision) {
      return {
        type: "revision",
        label: "Revision Required",
        reason: sample.revisionReason || targetJob?.rejectionReason || targetJob?.designRejectionReason || "Revision requested",
      };
    }

    if (isApproved) {
      const feedback = String(sample.customerFeedback || targetJob?.customerFeedback || "").trim();
      const approvedBy = String(sample.approvedBy || targetJob?.approvedBy || "");
      const isManager =
        Boolean(sample.isManagerApproval || targetJob?.isManagerApproval || targetJob?.raw?.isManagerApproval) ||
        feedback.toLowerCase().includes("approved by manager") ||
        feedback.toLowerCase().includes("manager") ||
        approvedBy.toLowerCase().includes("manager") ||
        approvedBy.toLowerCase().includes("admin") ||
        approvedBy.toLowerCase().includes("supervisor");

      if (isManager) {
        const mgrName = sample.approvedBy || targetJob?.approvedBy || storedUser?.name || "Manager";
        return {
          type: "approved_manager",
          label: `Approved by Manager (${mgrName})`,
        };
      }

      const custName = sample.customerName || targetJob?.customerName || "Customer";
      return {
        type: "approved_customer",
        label: `Approved by Customer (${custName})`,
      };
    }

    return {
      type: "pending",
      label: "Pending",
    };
  }, [storedUser]);

  // Filtered jobs based on active tab
  const tabJobs = useMemo(() => {
    if (statusFilter === "all") return jobs;
    if (statusFilter === "pending")
      return jobs.filter(
        (j) =>
          (j.designStatus === "UNASSIGNED" ||
            !j.designerName ||
            j.designerName === "- Unassigned" ||
            j.designerName === "Unassigned") &&
          j.designStatus !== "REJECTED" &&
          j.designStatus !== "REJECTED_SAMPLE" &&
          j.designStatus !== "STARTED_REVISION" &&
          j.stage !== "REVISION"
      );
    if (statusFilter === "assigned")
      return jobs.filter(
        (j) =>
          (j.designStatus === "PENDING_DESIGNER_APPROVAL" ||
            j.designStatus === "IN_PROGRESS" ||
            j.status === "Assigned" ||
            j.status === "In Progress") &&
          j.designStatus !== "PENDING_SAMPLE_APPROVAL" &&
          j.designStatus !== "COMPLETED" &&
          j.designStatus !== "REJECTED_SAMPLE" &&
          j.designStatus !== "STARTED_REVISION" &&
          j.stage !== "SAMPLE_APPROVAL" &&
          j.stage !== "REVISION" &&
          j.stage !== "PRODUCTION_PLANNING" &&
          j.designerName &&
          j.designerName !== "- Unassigned" &&
          j.designerName !== "Unassigned"
      );
    if (statusFilter === "redesign" || statusFilter === "revision")
      return jobs.filter(
        (j) =>
          j.designStatus === "REJECTED_SAMPLE" ||
          j.designStatus === "STARTED_REVISION" ||
          j.designStatus === "REVISION" ||
          j.stage === "REVISION" ||
          j.status === "Revision"
      );
    if (statusFilter === "completed" || statusFilter === "approved")
      return jobs.filter(
        (j) =>
          j.designStatus === "COMPLETED" ||
          j.stage === "COMPLETED" ||
          j.stage === "PRODUCTION_PLANNING" ||
          j.status === "Completed" ||
          j.status === "Approved"
      );
    return jobs;
  }, [jobs, statusFilter]);

  // One search box + a designer filter for every tab of the queue
  const isUnassignedName = (n) => !n || n === "- Unassigned" || n === "Unassigned" || n === "Assigned Designer";
  const matchesQueue = (item) => {
    const q = queueSearch.trim().toLowerCase();
    const designerName = item.designerName || item.currentDesigner || "";
    if (designerFilter === "unassigned") {
      if (!isUnassignedName(designerName)) return false;
    } else if (designerFilter !== "all") {
      if (String(designerName).trim().toLowerCase() !== designerFilter.toLowerCase()) return false;
    }
    if (jobTypeFilter !== "all") {
      const t = String(item.jobType || item.jobOrder?.jobType || item.raw?.jobType || "").toUpperCase();
      const designOnly = t.includes("DESIGN") && !t.includes("PRINT");
      const printAndDesign = t.includes("DESIGN") && t.includes("PRINT");
      if (jobTypeFilter === "design_only" && !designOnly) return false;
      if (jobTypeFilter === "print_design" && !printAndDesign) return false;
    }
    if (!q) return true;
    return [item.jobNo, item.customerName, item.title, item.jobItem, designerName, item.jobType]
      .some((v) => String(v || "").toLowerCase().includes(q));
  };
  const filteredJobs = useMemo(
    () => tabJobs.filter(matchesQueue),
    [tabJobs, queueSearch, designerFilter, jobTypeFilter] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const shownRejections = useMemo(
    () => combinedRejections.filter(matchesQueue),
    [combinedRejections, queueSearch, designerFilter, jobTypeFilter] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const shownSamples = useMemo(
    () => combinedSamples.filter(matchesQueue),
    [combinedSamples, queueSearch, designerFilter, jobTypeFilter] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Active list based on active tab
  const activeList =
    statusFilter === "rejected"
      ? shownRejections
      : statusFilter === "samples"
      ? shownSamples
      : filteredJobs;

  // Sliced pagination
  const totalPages = Math.ceil(activeList.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, activeList.length);
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);
  const paginatedRejections = shownRejections.slice(startIndex, endIndex);
  const paginatedSamples = shownSamples.slice(startIndex, endIndex);

  // Designer Queue table: paged
  const DESIGNER_PAGE_SIZE = designerPageSize;
  const designerTotalPages = Math.max(1, Math.ceil(allDesigners.length / DESIGNER_PAGE_SIZE));
  const safeDesignerPage = Math.min(designerPage, designerTotalPages);
  const designerStart = (safeDesignerPage - 1) * DESIGNER_PAGE_SIZE;
  const pagedDesigners = allDesigners.slice(designerStart, designerStart + DESIGNER_PAGE_SIZE);

  // Manager approve or reject sample proof
  const handleConfirmSampleDecision = async () => {
    if (!selectedSampleForDecision) return;
    setSubmittingSampleDecision(true);
    try {
      const targetJobId = selectedSampleForDecision.jobId || selectedSampleForDecision._id;
      if (decisionMode === "approve") {
        const isCust = decisionApprovalType === "customer";
        const mgrName = storedUser?.name || currentUser?.name || "Manager";
        const customerName = isCust
          ? (decisionCustomerName.trim() || selectedSampleForDecision.customerName || "Customer")
          : null;
        const feedback = isCust
          ? `Approved by Customer (${customerName})`
          : `Approved by Manager (${mgrName})`;

        const approvalRes = await jobFlowApi.approveSampleDesign(targetJobId, {
          customerName,
          isCustomerApproval: isCust,
          isManagerApproval: !isCust,
          approvedBy: !isCust ? mgrName : customerName,
          customerFeedback: feedback,
          notes: decisionNotes,
        });

        const rawType = String(selectedSampleForDecision.jobType || selectedSampleForDecision.jobOrder?.jobType || "").toUpperCase();
        const isDesignOnly = rawType.includes("DESIGN") && !rawType.includes("PRINT");

        // Optimistically update jobs and sampleDesigns so UI reflects immediately
        setJobs((prevJobs) =>
          prevJobs.map((j) => {
            if (String(j._id) === String(targetJobId) || j.jobNo === selectedSampleForDecision.jobNo) {
              const jobIsDesignOnly = isDesignOnly || (String(j.jobType || "").toUpperCase().includes("DESIGN") && !String(j.jobType || "").toUpperCase().includes("PRINT"));
              return {
                ...j,
                status: jobIsDesignOnly ? "READY" : "Approved",
                stage: jobIsDesignOnly ? "READY" : "PRODUCTION_PLANNING",
                currentStage: jobIsDesignOnly ? "READY" : "PRODUCTION_PLANNING",
                designStatus: "COMPLETED",
                customerFeedback: feedback,
                isManagerApproval: !isCust,
                isCustomerApproval: isCust,
                approvedBy: !isCust ? mgrName : customerName,
              };
            }
            return j;
          })
        );

        setSampleDesigns((prevSamples) =>
          prevSamples.map((s) => {
            if (String(s.jobId || s._id) === String(targetJobId) || s.jobNo === selectedSampleForDecision.jobNo) {
              return {
                ...s,
                status: "APPROVED",
                isConfirmed: true,
                customerFeedback: feedback,
                isManagerApproval: !isCust,
                isCustomerApproval: isCust,
                approvedBy: !isCust ? mgrName : customerName,
              };
            }
            return s;
          })
        );

        if (isDesignOnly) {
          const bal = approvalRes?.balanceDue != null
            ? Number(approvalRes.balanceDue)
            : (selectedSampleForDecision.balanceDue != null
                ? Number(selectedSampleForDecision.balanceDue)
                : Number(selectedSampleForDecision?.jobOrder?.balanceDue || 0));

          toast.success(
            `Customer approved design for #${selectedSampleForDecision.jobNo || targetJobId}! Balance in Invoice: ₹${bal.toFixed(2)} — please collect remaining balance in Invoice.`,
            { autoClose: 9000 }
          );
        } else {
          toast.success(`Sample design approved successfully! (${feedback})`);
        }
      } else {
        if (!decisionNotes.trim()) {
          toast.error("Please enter revision requirements / reason for rejection.");
          setSubmittingSampleDecision(false);
          return;
        }

        const rejectionReason = decisionNotes.trim();

        await jobFlowApi.rejectSampleDesign(targetJobId, {
          reason: rejectionReason,
          notes: rejectionReason,
        });

        // Remove from startedRevisionJobIds so redesign requires Start button again
        setStartedRevisionJobIds((prev) => {
          const next = new Set(prev);
          next.delete(String(targetJobId));
          try {
            localStorage.setItem("printz_started_revision_jobs", JSON.stringify(Array.from(next)));
          } catch (e) {}
          return next;
        });

        // Optimistically update jobs and sampleDesigns so it displays immediately in Redesign/Revision table
        setJobs((prevJobs) =>
          prevJobs.map((j) => {
            if (String(j._id) === String(targetJobId) || j.jobNo === selectedSampleForDecision.jobNo) {
              return {
                ...j,
                status: "Revision",
                stage: "REVISION",
                designStatus: "REVISION",
                isRevisionStarted: false,
                revisionStartedAt: null,
                rejectionReason: rejectionReason,
                designRejectionReason: rejectionReason,
              };
            }
            return j;
          })
        );

        setSampleDesigns((prevSamples) =>
          prevSamples.map((s) => {
            if (String(s.jobId || s._id) === String(targetJobId) || s.jobNo === selectedSampleForDecision.jobNo) {
              return {
                ...s,
                status: "REVISION_REQUIRED",
                revisionReason: rejectionReason,
                customerFeedback: rejectionReason,
              };
            }
            return s;
          })
        );

        toast.success("Sample rejected and sent to Redesign / Revision.");
        setStatusFilter("redesign");
      }

      setIsSampleDecisionModalOpen(false);
      setSelectedSampleForDecision(null);
      await fetchDesignData();
    } catch (err) {
      console.error("Error submitting sample decision:", err);
      toast.error(err.response?.data?.message || "Failed to process sample decision. Please try again.");
    } finally {
      setSubmittingSampleDecision(false);
    }
  };

  // Allocate Now handler (batch Round Robin for pending queue)
  const handleAllocateNow = async () => {
    setLoading(true);
    try {
      const res = await jobFlowApi.autoAssignQueue();
      const count = Array.isArray(res?.data) ? res.data.length : res?.length || 0;
      toast.success(`Round Robin allocated ${count} pending queue job(s)!`);
      await fetchDesignData();
    } catch (err) {
      console.error("Batch allocation error:", err);
      toast.error("Allocation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Save global max load setting
  const handleSaveGlobalMaxLoad = async () => {
    if (!globalMaxLoad || globalMaxLoad < 1) {
      toast.error("Please enter a valid max load limit (minimum 1)");
      return;
    }
    setSavingGlobalMaxLoad(true);
    try {
      await jobFlowApi.updateGlobalMaxLoad(globalMaxLoad);
      toast.success(`Max load updated to ${globalMaxLoad} active jobs per designer!`);
      setDesigners((prev) => prev.map((d) => ({ ...d, maxLoad: Number(globalMaxLoad) })));
    } catch (err) {
      console.error("Failed to update max load limit:", err);
      toast.error("Failed to update global max load setting");
    } finally {
      setSavingGlobalMaxLoad(false);
    }
  };

  // Add a designer: saved in the database and added to the round-robin pool
  const handleAddDesigner = async (e) => {
    e.preventDefault();
    const name = newDesigner.name.trim();
    const email = newDesigner.email.trim();
    if (name.length < 2) return toast.error("Enter the designer's name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Enter a valid email address");
    if (newDesigner.password.trim().length < 6) return toast.error("Password is required (at least 6 characters)");
    setAddingDesigner(true);
    try {
      await jobFlowApi.addDesignerToPool({
        name,
        email,
        mobile: newDesigner.mobile.trim(),
        password: newDesigner.password.trim(),
        maxLoad: Number(newDesigner.maxLoad) || 5,
      });
      toast.success(`${name} added to the designer pool`);
      setShowAddDesigner(false);
      setNewDesigner({ name: "", email: "", mobile: "", password: "", maxLoad: 5 });
      await fetchDesignData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add designer");
    } finally {
      setAddingDesigner(false);
    }
  };

  // Make a designer active / inactive (inactive designers get no new jobs)
  const handleToggleDesignerActive = async (des) => {
    const desId = des._id || des.userId || des.employeeId;
    const makeActive = des.isActive === false;
    setSavingDesignerId(desId);
    try {
      await jobFlowApi.updateDesignerInPool(desId, { isActive: makeActive });
      toast.success(`${des.name} is now ${makeActive ? "active" : "inactive"}`);
      await fetchDesignData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update designer status");
    } finally {
      setSavingDesignerId(null);
    }
  };

  // Save edited designer details
  const handleSaveEditDesigner = async (e) => {
    e.preventDefault();
    if (!editDesigner) return;
    const name = editDesigner.name.trim();
    const email = editDesigner.email.trim();
    if (name.length < 2) return toast.error("Enter the designer's name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Enter a valid email address");
    if (editDesigner.password.trim() && editDesigner.password.trim().length < 6) return toast.error("Password must be at least 6 characters");
    setSavingEditDesigner(true);
    try {
      await jobFlowApi.updateDesignerInPool(editDesigner.id, {
        name,
        email,
        mobile: editDesigner.mobile.trim(),
        maxLoad: Number(editDesigner.maxLoad) || 5,
        ...(editDesigner.password.trim() ? { password: editDesigner.password.trim() } : {}),
      });
      toast.success("Designer details updated");
      setEditDesigner(null);
      await fetchDesignData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update designer");
    } finally {
      setSavingEditDesigner(false);
    }
  };

  // Update specific designer limit
  const handleUpdateDesignerLimit = async (desId, newLimit) => {
    setSavingDesignerId(desId);
    try {
      await jobFlowApi.updateDesignerInPool(desId, { maxLoad: Number(newLimit) });
      toast.success("Designer workload limit updated!");
      const patchLimit = (prev) =>
        prev.map((d) =>
          String(d._id || d.userId || d.employeeId) === String(desId)
            ? { ...d, maxLoad: Number(newLimit) }
            : d
        );
      setDesigners(patchLimit);
      setAllDesigners(patchLimit);
      setEditingDesignerId(null);
    } catch (err) {
      console.error("Failed to update designer limit:", err);
      toast.error("Failed to update designer limit");
    } finally {
      setSavingDesignerId(null);
    }
  };

  // Callback from AssignDesignerModal
  const handleAssignmentCompleted = (assignedInfo) => {
    setIsAssignModalOpen(false);
    setSelectedJob(null);
    clearPreselectedJobParam();

    if (assignedInfo && assignedInfo.jobId) {
      setJobs((prev) =>
        prev.map((j) => {
          if (String(j._id || j.id) === String(assignedInfo.jobId)) {
            return {
              ...j,
              status: "Assigned",
              stage: "DESIGN_ASSIGNED",
              designerName: assignedInfo.designerName || j.designerName,
            };
          }
          return j;
        })
      );
    }
    fetchDesignData();
  };

  // Sub-tab workflows for "My Jobs"
  const handleApproveDesign = async (job) => {
    const jobIdStr = String(job._id || job.id);
    try {
      await jobFlowApi.acceptDesignAssignment(job._id || job.id);
      setApprovedJobIds((prev) => new Set(prev).add(jobIdStr));
      setJobs((prev) =>
        prev.map((j) => (String(j._id || j.id) === jobIdStr ? { ...j, status: "In Progress", stage: "DESIGN_IN_PROGRESS" } : j))
      );
      toast.success(`Design assignment for ${job.jobNo} accepted! Workbench is now unlocked.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "This design assignment could not be accepted.");
    } finally {
      fetchDesignData();
    }
  };

  const handleRejectAssignment = async (jobId, reason) => {
    setIsRejectModalOpen(false);
    try {
      await jobFlowApi.rejectDesignAssignment(jobId, reason);
      toast.success("Design rejected. Returned to supervisor queue.");
    } catch (err) {
      toast.error(err.response?.data?.message || "This design assignment could not be rejected.");
    } finally {
      fetchDesignData();
    }
  };


  const handleCustomerApprove = async () => {
    if (!isManagerOrAdmin) {
      toast.error("Only a manager can approve a design proof.");
      return;
    }
    const targetJob = currentWorkbenchJob || selectedJob;
    const jobId = targetJob?._id || targetJob?.id;
    setApprovingProof(true);
    try {
      if (jobId) {
        const custName = targetJob?.customerName || "Customer";
        await jobFlowApi.approveArtworkProof(jobId, {
          notes: "Customer approved artwork proof",
          isCustomerApproval: true,
          customerFeedback: `Approved by Customer (${custName})`,
        });
      }

      const updatedApprovedJob = {
        ...(targetJob || {}),
        status: "Approved",
        stage: "PRODUCTION_PLANNING",
        designStatus: "COMPLETED",
        isCustomerApproval: true,
        customerFeedback: `Approved by Customer (${targetJob?.customerName || "Customer"})`,
      };

      setSelectedJob(updatedApprovedJob);
      setJobs((prev) =>
        prev.map((j) =>
          String(j._id || j.id) === String(jobId) || j.jobNo === targetJob?.jobNo
            ? { ...j, ...updatedApprovedJob }
            : j
        )
      );

      toast.success("Customer approved artwork! Status changed to Approved and handed off to Production.");
    } catch (err) {
      console.error("Proof approval error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to process customer approval");
    } finally {
      setApprovingProof(false);
    }
  };

  const handleCustomerReject = async () => {
    if (!isManagerOrAdmin) {
      toast.error("Only a manager can return a design proof for changes.");
      return;
    }
    const targetJob = currentWorkbenchJob || selectedJob;
    const jobId = targetJob?._id || targetJob?.id;
    const reason = prompt("Enter customer revision feedback / required adjustments:") || "Customer requested revision of artwork proof";
    if (!reason || !reason.trim()) return;

    try {
      if (jobId && typeof jobId === "string" && jobId.length === 24) {
        await jobFlowApi.rejectSampleDesign(jobId, {
          reason: `Customer: ${reason.trim()}`,
          notes: reason.trim(),
        });
      }

      setJobs((prev) =>
        prev.map((j) =>
          String(j._id) === String(jobId) || j.jobNo === targetJob?.jobNo
            ? {
                ...j,
                status: "Revision",
                stage: "REVISION",
                designStatus: "REVISION",
                rejectionReason: reason.trim(),
                designRejectionReason: reason.trim(),
              }
            : j
        )
      );

      setSampleDesigns((prev) =>
        prev.map((s) =>
          String(s.jobId || s._id) === String(jobId) || s.jobNo === targetJob?.jobNo
            ? {
                ...s,
                status: "REVISION_REQUIRED",
                revisionReason: reason.trim(),
                customerFeedback: reason.trim(),
              }
            : s
        )
      );

      toast.success("Customer requested revision! Job moved to Redesign / Revision.");
      if (isDesignerUser) {
        setActiveView("my-jobs");
      } else {
        setStatusFilter("redesign");
        setActiveView("queue");
      }
      await fetchDesignData();
    } catch (err) {
      console.error("Customer reject error:", err);
      toast.error("Failed to process customer revision request");
    }
  };


  return (
    <JobFlowLayout
      hideHeader
      title={isDesignerUser ? "PrintZ Creative Studio" : "PrintZ Design Workflow"}
      subtitle={
        isDesignerUser
          ? `Interactive Design Workspace • ${activeSelectedDesigner?.name || currentUser?.name || "Designer"}`
          : "Round Robin Designer Allocation & Workflow Control"
      }
    >
      {/* ──────────────── TOP NAVIGATION & DESIGNER STUDIO BAR ──────────────── */}
     
     

      {/* ──────────────── SCREEN 1: DESIGN QUEUE (SUPERVISOR) ──────────────── */}
      {!isDesignerUser && activeView === "queue" && (

        <>
          {/* Top Header & Round Robin Setting */}
          {/* <div className="dq-top-header-wrapper">
            <div className="dq-header-titles">
              <h2>Designer Allocation (Round Robin)</h2>
              <p>Automatically assign approved job orders to designers using round robin method.</p>
            </div>

            <div className="dq-rr-setting-card">
              <div className="dq-rr-setting-title">
                <Settings size={16} style={{ color: "#16a34a" }} />
                <span>Round Robin Setting</span>
              </div>
              <div className="dq-rr-setting-row">
                <span className="dq-rr-setting-label">
                  Max Load (Active Jobs per Designer)
                  <span
                    title="The maximum concurrent active jobs any designer can hold in Round Robin rotation"
                    style={{ cursor: "pointer", color: "#475569" }}
                  >
                    <Info size={14} />
                  </span>
                </span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className="dq-rr-input-load"
                  value={globalMaxLoad}
                  onChange={(e) => setGlobalMaxLoad(e.target.value)}
                />
                <button
                  type="button"
                  className="dq-rr-save-btn"
                  disabled={savingGlobalMaxLoad}
                  onClick={handleSaveGlobalMaxLoad}
                >
                  {savingGlobalMaxLoad ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div> */}

          {/* Main Card: Pending Job Orders for Designer Allocation */}
          <div className="dq-main-table-card">
            {/* Toolbar */}
            <div className="dq-table-toolbar">
              <div className="dq-table-toolbar-left">
                <div className="dq-table-icon-square">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="dq-table-toolbar-title">Pending Job Orders for Designer Allocation</h3>

                </div>
              </div>
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "nowrap", flex: "1 1 auto", justifyContent: "flex-end", minWidth: 0 }}>
                <input
                  type="search"
                  className="jf-input"
                  placeholder="Search job no, customer, item or designer"
                  value={queueSearch}
                  onChange={(e) => {
                    setQueueSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ height: 38, flex: "1 1 220px", minWidth: 160, maxWidth: 320 }}
                />
                <select
                  className="jf-select"
                  value={designerFilter}
                  onChange={(e) => {
                    setDesignerFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ height: 38, flex: "0 0 auto", width: 170 }}
                  title="Filter by designer"
                >
                  <option value="all">All Designers</option>
                  <option value="unassigned">Unassigned</option>
                  {designers.map((d) => (
                    <option key={d._id || d.email} value={d.name}>{d.name}</option>
                  ))}
                </select>
                <select
                  className="jf-select"
                  value={jobTypeFilter}
                  onChange={(e) => {
                    setJobTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ height: 38, flex: "0 0 auto", width: 160 }}
                  title="Filter by job type"
                >
                  <option value="all">All Job Types</option>
                  <option value="design_only">Design Only</option>
                  <option value="print_design">Print &amp; Design</option>
                </select>
              </div>
            </div>

            {/* Tabs above table: all, pending, assigned, redesign/revision, samples, completed, rejected */}
            <div className="dq-main-tabs">
              {[
                { id: "all", label: "All", count: counts.all },
                { id: "pending", label: "Pending", count: counts.pending },
                { id: "assigned", label: "Assigned", count: counts.assigned },
                { id: "redesign", label: "Redesign / Revision", count: counts.redesign },
                { id: "samples", label: "Sample Approvals", count: counts.samples, isSampleTab: true },
                { id: "completed", label: "Approved", count: counts.completed },
                { id: "rejected", label: "Rejected / Reallocations", count: counts.rejected, isRejectedTab: true },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`dq-main-tab-btn ${statusFilter === tab.id ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setCurrentPage(1);
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`dq-main-tab-badge ${
                      tab.isRejectedTab && tab.count > 0
                        ? "is-rejected"
                        : tab.isSampleTab && tab.count > 0
                        ? "is-sample"
                        : ""
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="dq-jobs-table">
                <thead>
                  {statusFilter === "rejected" ? (
                    <tr>
                      <th>Job Order No.</th>
                      <th>Priority</th>
                      <th>Customer</th>
                      <th>Job Item</th>
                      <th>Rejected By</th>
                      <th>Rejection Reason</th>
                      <th>Rejected At</th>
                      <th>Current Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  ) : statusFilter === "samples" ? (
                    <tr>
                      <th>Job Order No.</th>
                      <th>Priority</th>
                      <th>Customer</th>
                      <th>Job Item</th>
                      <th>Designer</th>
                      <th>Sample Proof</th>
                      <th>Submitted On</th>
                      <th>Approval Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  ) : statusFilter === "redesign" || statusFilter === "revision" ? (
                    <tr>
                      <th>Job Order No.</th>
                      <th>Priority</th>
                      <th>Customer</th>
                      <th>Job Item</th>
                      <th>Assigned Designer</th>
                      <th>Rejected Sample Preview</th>
                      <th>Rejection Reason</th>
                      <th>Rejection Date</th>
                      <th>Current Revision Status</th>
                      <th style={{ textAlign: "right" }}>Available Actions</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Job Order No.</th>
                      <th>Customer</th>
                      <th>Job Item</th>
                      <th>Priority</th>
                      <th>Designer</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {statusFilter === "rejected" ? (
                    loading && combinedRejections.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", color: "#475569" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                            <RefreshCw size={18} className="jf-spin" style={{ color: "#16a34a" }} />
                            <span>Loading rejected assignments...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedRejections.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", color: "#475569" }}>
                          No designer rejections recorded. All assignments accepted cleanly.
                        </td>
                      </tr>
                    ) : (
                      paginatedRejections.map((rej) => {
                        const targetJob =
                          jobs.find((j) => String(j._id || j.id) === String(rej.jobId)) ||
                          (rej.jobOrder?._id
                            ? {
                                _id: rej.jobOrder._id,
                                jobNo: rej.jobOrder.jobNo || rej.jobNo,
                                customerName: rej.jobOrder.customerName || rej.customerName,
                                title: rej.jobOrder.title || rej.jobItem,
                                priority: rej.jobOrder.priority || rej.priority,
                                designerName: rej.currentDesigner || "- Unassigned",
                                status: rej.isPendingReallocation ? "Waiting" : "Assigned",
                                stage: rej.currentStage,
                                isRejected: true,
                                rejectionReason: rej.rejectionReason,
                                raw: rej.jobOrder,
                              }
                            : rej);

                        const isPending =
                          rej.isPendingReallocation ||
                          !rej.currentDesigner ||
                          rej.currentDesigner === "- Unassigned";

                        return (
                          <tr key={rej._id || rej.assignmentId}>
                            <td>
                              <span
                                className="dq-jobno-link"
                                onClick={() => {
                                  setViewingJob(targetJob);
                                  setIsViewModalOpen(true);
                                }}
                                title="Click to view job details & requirements"
                              >
                                {rej.jobNo}
                              </span>
                              <div style={{ marginTop: "4px" }}>
                                <JobTypeBadge jobType={rej.jobType || targetJob?.jobType} size="sm" />
                              </div>
                            </td>
<td><PriorityBadge priority={rej.jobOrder?.priority || rej.priority} /></td>
                            <td style={{ fontWeight: 500, color: "#1e293b" }}>{rej.customerName}</td>
                            <td style={{ color: "#334155" }}>{rej.jobItem}</td>
                            <td>
                              <div className="dq-designer-chip">
                                <span
                                  className="dq-avatar"
                                  style={{ backgroundColor: getAvatarColor(rej.rejectedBy) }}
                                >
                                  {getInitials(rej.rejectedBy)}
                                </span>
                                <span style={{ fontWeight: 600, color: "#dc2626" }}>{rej.rejectedBy}</span>
                              </div>
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.4rem",
                                  background: "#fff1f2",
                                  border: "1px solid #ffe4e6",
                                  color: "#9f1239",
                                  padding: "0.3rem 0.65rem",
                                  borderRadius: "7px",
                                  fontSize: "0.78125rem",
                                  maxWidth: "280px",
                                  lineHeight: 1.35,
                                }}
                                title={rej.rejectionReason}
                              >
                                <AlertCircle size={13} style={{ flexShrink: 0, color: "#e11d48" }} />
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {rej.rejectionReason}
                                </span>
                              </div>
                            </td>
                            <td style={{ color: "#475569", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                              {rej.rejectedAt
                                ? new Date(rej.rejectedAt).toLocaleString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })
                                : "—"}
                            </td>
                            <td>
                              {isPending ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.22rem 0.65rem",
                                    borderRadius: "9999px",
                                    background: "#fef2f2",
                                    color: "#dc2626",
                                    border: "1px solid #fecaca",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background: "#dc2626",
                                    }}
                                  />
                                  Pending Reallocation
                                </span>
                              ) : (
                                <div
                                  className="dq-designer-chip"
                                  style={{
                                    background: "#f0fdf4",
                                    border: "1px solid #bbf7d0",
                                    padding: "0.2rem 0.55rem",
                                  }}
                                >
                                  <span
                                    className="dq-avatar"
                                    style={{
                                      backgroundColor: getAvatarColor(rej.currentDesigner),
                                      width: 20,
                                      height: 20,
                                      fontSize: "0.65rem",
                                    }}
                                  >
                                    {getInitials(rej.currentDesigner)}
                                  </span>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "#166534",
                                      fontSize: "0.78125rem",
                                    }}
                                  >
                                    Assigned: {rej.currentDesigner}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                                {isPending ? (
                                  <button
                                    type="button"
                                    className="dq-btn-table-reallocate"
                                    title="Reallocate rejected job to designer"
                                    onClick={() => {
                                      setSelectedJob(targetJob);
                                      setIsAssignModalOpen(true);
                                    }}
                                  >
                                    Reallocate
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="dq-btn-table-view"
                                    title="View job details"
                                    onClick={() => {
                                      setViewingJob(targetJob);
                                      setIsViewModalOpen(true);
                                    }}
                                  >
                                    <Eye size={13} />
                                    <span>View</span>
                                  </button>
                                )}
                                {isPending && (
                                  <button
                                    type="button"
                                    className="dq-btn-table-more"
                                    title="View details"
                                    onClick={() => {
                                      setViewingJob(targetJob);
                                      setIsViewModalOpen(true);
                                    }}
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )
                  ) : statusFilter === "samples" ? (
                    loading && combinedSamples.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", color: "#475569" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                            <RefreshCw size={18} className="jf-spin" style={{ color: "#16a34a" }} />
                            <span>Loading sample designs from database...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedSamples.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", color: "#475569" }}>
                          No sample designs currently awaiting approval.
                        </td>
                      </tr>
                    ) : (
                      paginatedSamples.map((sample) => {
                        const targetJob =
                          jobs.find((j) => String(j._id || j.id) === String(sample.jobId)) ||
                          sample.jobOrder ||
                          sample;

                        const customerName = sample.customerName || targetJob?.customerName || "Customer";
                        const approvalInfo = getApprovalStatus(sample, targetJob);
                        const isPending = approvalInfo.type === "pending";

                        return (
                          <tr key={sample._id || sample.sampleId || sample.jobId}>
                            <td>
                              <span
                                className="dq-jobno-link"
                                onClick={() => {
                                  setViewingJob(targetJob);
                                  setIsViewModalOpen(true);
                                }}
                                title="Click to view job details & specifications"
                              >
                                {sample.jobNo}
                              </span>
                              <div style={{ marginTop: "4px" }}>
                                <JobTypeBadge jobType={sample.jobType || targetJob?.jobType} size="sm" />
                              </div>
                            </td>
<td><PriorityBadge priority={sample.jobOrder?.priority || sample.priority} /></td>
                            <td style={{ fontWeight: 600, color: "#1e293b" }}>{customerName}</td>
                            <td style={{ color: "#334155" }}>{sample.jobItem}</td>
                            <td>
                              <div className="dq-designer-chip">
                                <span
                                  className="dq-avatar"
                                  style={{ backgroundColor: getAvatarColor(sample.designerName) }}
                                >
                                  {getInitials(sample.designerName)}
                                </span>
                                <span style={{ fontWeight: 600, color: "#1e293b" }}>{sample.designerName}</span>
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="dq-btn-sample-proof"
                                onClick={() => setPreviewSampleProofUrl(sample.fileUrl)}
                                title="Click to preview artwork sample proof"
                              >
                                <Eye size={13} />
                                <span>Proof v{sample.versionNo || 1}.0</span>
                              </button>
                            </td>
                            <td style={{ color: "#475569", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                              {sample.submittedAt
                                ? new Date(sample.submittedAt).toLocaleString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })
                                : "—"}
                            </td>
                            <td>
                              {approvalInfo.type === "approved_customer" || approvalInfo.type === "approved_manager" ? (
                                <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: "0.2rem" }}>
                                  <div
                                    className={approvalInfo.type === "approved_customer" ? "dq-badge-approved-customer" : "dq-badge-approved-manager"}
                                    title={approvalInfo.label}
                                  >
                                    <CheckCircle2
                                      size={13}
                                      style={{ flexShrink: 0, color: approvalInfo.type === "approved_customer" ? "#047857" : "#1d4ed8" }}
                                    />
                                    <span>Approved</span>
                                  </div>
                                  <span style={{ fontSize: "0.75rem", color: "#475569", paddingLeft: "0.2rem" }}>
                                    by {String(approvalInfo.label || "").replace(/^Approveds*(bys*)?/i, "") || (approvalInfo.type === "approved_manager" ? "Manager" : "Customer")}
                                  </span>
                                </div>
                              ) : approvalInfo.type === "revision" ? (
                                <div className="dq-badge-sample-revision" title={approvalInfo.reason || "Revision requested"}>
                                  <RotateCcw size={13} style={{ flexShrink: 0, color: "#be123c" }} />
                                  <span>Revision Required</span>
                                </div>
                              ) : (
                                <div className="dq-badge-sample-pending">
                                  <Clock size={13} style={{ flexShrink: 0, color: "#b45309" }} />
                                  <span>Pending</span>
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "0.45rem", alignItems: "center" }}>
                                {isPending && (
                                  <>
                                    <button
                                      type="button"
                                      className="dq-btn-action-approve"
                                      aria-label="Approve"
                                      onClick={() => {
                                        setSelectedSampleForDecision(sample);
                                        setDecisionMode("approve");
                                        setDecisionApprovalType("manager");
                                        setDecisionCustomerName(customerName);
                                        setDecisionNotes("");
                                        setIsSampleDecisionModalOpen(true);
                                      }}
                                      title="Accept / Approve Sample Design"
                                    >
                                      <Check size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      className="dq-btn-action-reject"
                                      aria-label="Reject"
                                      onClick={() => {
                                        setSelectedSampleForDecision(sample);
                                        setDecisionMode("reject");
                                        setDecisionNotes("");
                                        setIsSampleDecisionModalOpen(true);
                                      }}
                                      title="Reject / Request Revision"
                                    >
                                      <X size={15} />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  className="dq-btn-table-more"
                                  title="View job order"
                                  onClick={() => {
                                    setViewingJob(targetJob);
                                    setIsViewModalOpen(true);
                                  }}
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )
                  ) : (
                    loading && jobs.length === 0 ? (
                      <tr>
                        <td colSpan={statusFilter === "redesign" || statusFilter === "revision" ? 10 : 7} style={{ textAlign: "center", padding: "2.5rem", color: "#475569" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                            <RefreshCw size={18} className="jf-spin" style={{ color: "#16a34a" }} />
                            <span>Loading design orders from database...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedJobs.length === 0 ? (
                      <tr>
                        <td colSpan={statusFilter === "redesign" || statusFilter === "revision" ? 10 : 7} style={{ textAlign: "center", padding: "2.5rem", color: "#475569" }}>
                          {statusFilter === "redesign" || statusFilter === "revision"
                            ? "No sample revision / redesign orders found."
                            : "No job orders found in design queue."}
                        </td>
                      </tr>
                    ) : (
                      paginatedJobs.map((job) => {
                        const isUnassigned = !job.designerName || job.designerName === "- Unassigned";
                        const isAllocated =
                          (!isUnassigned && Boolean(job.designerName)) ||
                          ["Assigned", "In Progress", "Pending Sample Approvals", "Proof Sent", "Revision", "Completed"].includes(job.status);
                        const isRejectedJob = Boolean(
                          job.isRejected ||
                          job.designStatus === "REJECTED" ||
                          job.designRejectionReason ||
                          job.rejectionReason ||
                          job.raw?.designStatus === "REJECTED" ||
                          job.raw?.designRejectionReason
                        );

                        // ── Dedicated Table Rows for Redesign / Revision (9 Required Columns) ──
                        if (statusFilter === "redesign" || statusFilter === "revision") {
                          const isStarted = Boolean(
                            job.isRevisionStarted ||
                            job.designStatus === "STARTED_REVISION" ||
                            startedRevisionJobIds.has(String(job._id))
                          );
                          const rejReason =
                            job.rejectionReason ||
                            job.designRejectionReason ||
                            job.raw?.designRejectionReason ||
                            "Revision requested by client or manager";
                          const rejProof =
                            job.rejectedSampleUrl ||
                            job.designProofUrl ||
                            job.raw?.designProofUrl ||
                            NO_PROOF_IMG;
                          const rejDate =
                            job.sampleRejectedAt ||
                            job.raw?.sampleRejectedAt ||
                            job.raw?.updatedAt ||
                            job.updatedAt;

                          const currentDes = activeSelectedDesigner || currentUser;
                          const targetName = (currentDes?.name || effectiveName || "").toLowerCase().trim();
                          const targetEmail = (currentDes?.email || effectiveEmail || "").toLowerCase().trim();
                          const targetId = String(currentDes?._id || currentDes?.userId || currentDes?.employeeId || "");
                          const assignedName = (job.designerName || "").toLowerCase().trim();
                          const assignedEmail = (job.designerEmail || "").toLowerCase().trim();
                          const assignedId = String(job.designerId || job.raw?.designerId?._id || job.raw?.designerId || "");

                          const isMyJob =
                            isDesignerUser &&
                            ((targetId && assignedId && targetId === assignedId) ||
                              (targetEmail && assignedEmail && targetEmail === assignedEmail) ||
                              (targetName && assignedName && (targetName === assignedName || targetName.includes(assignedName) || assignedName.includes(targetName))));

                          return (
                            <tr key={job._id}>
                              {/* 1. Job Order Number */}
                              <td>
                                <span
                                  className="dq-jobno-link"
                                  onClick={() => {
                                    setViewingJob(job);
                                    setIsViewModalOpen(true);
                                  }}
                                  title="Click to view job details & requirements"
                                >
                                  {job.jobNo}
                                </span>
                                <div style={{ marginTop: "4px" }}>
                                  <JobTypeBadge jobType={job.jobType} size="sm" />
                                </div>
                              </td>
<td><PriorityBadge priority={job.priority} /></td>

                              {/* 2. Customer */}
                              <td style={{ fontWeight: 600, color: "#1e293b" }}>{job.customerName}</td>

                              {/* 3. Job Item */}
                              <td style={{ color: "#334155" }}>{job.title}</td>

                              {/* 4. Assigned Designer */}
                              <td>
                                {!isUnassigned ? (
                                  <div className="dq-designer-chip">
                                    <span
                                      className="dq-avatar"
                                      style={{ backgroundColor: getAvatarColor(job.designerName) }}
                                    >
                                      {getInitials(job.designerName)}
                                    </span>
                                    <span style={{ fontWeight: 600, color: "#1e293b" }}>{job.designerName}</span>
                                  </div>
                                ) : (
                                  <span style={{ color: "#475569", fontSize: "0.8125rem" }}>- Unassigned</span>
                                )}
                              </td>

                              {/* 5. Rejected Sample Preview */}
                              <td>
                                <button
                                  type="button"
                                  className="dq-btn-sample-proof"
                                  onClick={() => setPreviewSampleProofUrl(rejProof)}
                                  title="Click to preview rejected artwork sample"
                                >
                                  <Eye size={13} />
                                  <span>Proof Preview</span>
                                </button>
                              </td>

                              {/* 6. Rejection Reason */}
                              <td>
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                    background: "#fff1f2",
                                    border: "1px solid #ffe4e6",
                                    color: "#9f1239",
                                    padding: "0.3rem 0.65rem",
                                    borderRadius: "7px",
                                    fontSize: "0.78125rem",
                                    maxWidth: "240px",
                                    lineHeight: 1.35,
                                  }}
                                  title={rejReason}
                                >
                                  <AlertCircle size={13} style={{ flexShrink: 0, color: "#e11d48" }} />
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {rejReason}
                                  </span>
                                </div>
                              </td>

                              {/* 7. Rejection Date */}
                              <td style={{ color: "#475569", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                                {rejDate
                                  ? new Date(rejDate).toLocaleString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    })
                                  : "—"}
                              </td>

                              {/* 8. Current Revision Status */}
                              <td>
                                {isStarted ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.35rem",
                                      padding: "0.22rem 0.65rem",
                                      borderRadius: "9999px",
                                      background: "#ecfdf5",
                                      border: "1px solid #a7f3d0",
                                      color: "#047857",
                                      fontSize: "0.78125rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    <CheckCircle2 size={12} color="#059669" />
                                    <span>Started by Designer</span>
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.35rem",
                                      padding: "0.22rem 0.65rem",
                                      borderRadius: "9999px",
                                      background: "#fffbeb",
                                      border: "1px solid #fde68a",
                                      color: "#b45309",
                                      fontSize: "0.78125rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    <Clock size={12} color="#d97706" />
                                    <span>Pending Start</span>
                                  </span>
                                )}
                              </td>

                              {/* 9. Available Actions */}
                              <td style={{ textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                                  {isMyJob ? (
                                    !isStarted ? (
                                      <button
                                        type="button"
                                        className="jf-btn jf-btn-primary jf-btn-sm"
                                        style={{
                                          background: "#ea580c",
                                          borderColor: "#ea580c",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.35rem",
                                        }}
                                        onClick={() => handleStartRedesign(job)}
                                        title="Click to start revision process"
                                      >
                                        <Play size={13} />
                                        <span>Start Revision</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="jf-btn jf-btn-primary jf-btn-sm"
                                        style={{
                                          background: "#16a34a",
                                          borderColor: "#16a34a",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.35rem",
                                        }}
                                        onClick={() => {
                                          setSelectedJob({ ...job, isRedesign: true, revisionReason: rejReason });
                                          setActiveView("workbench");
                                        }}
                                        title="Open workbench to work on redesign"
                                      >
                                        <Palette size={13} />
                                        <span>Open to Workbench</span>
                                      </button>
                                    )
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="dq-btn-table-reallocate"
                                        title="Reallocate rejected revision to designer"
                                        onClick={() => {
                                          setSelectedJob(job);
                                          setIsAssignModalOpen(true);
                                        }}
                                      >
                                        Reallocate
                                      </button>
                                      <button
                                        type="button"
                                        className="dq-btn-table-view"
                                        title="View job details"
                                        onClick={() => {
                                          setViewingJob(job);
                                          setIsViewModalOpen(true);
                                        }}
                                      >
                                        <Eye size={13} />
                                        <span>View</span>
                                      </button>
                                    </>
                                  )}
                                  {isMyJob && (
                                    <button
                                      type="button"
                                      className="dq-btn-table-more"
                                      title="View details"
                                      onClick={() => {
                                        setViewingJob(job);
                                        setIsViewModalOpen(true);
                                      }}
                                    >
                                      <MoreVertical size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        // ── Standard Table Rows for Other Tabs (Pending, Assigned, Completed) ──
                        return (
                          <tr key={job._id}>
                            <td>
                              <span
                                className="dq-jobno-link"
                                onClick={() => {
                                  setViewingJob(job);
                                  setIsViewModalOpen(true);
                                }}
                                title="Click to view job details & requirements"
                              >
                                {job.jobNo}
                              </span>
                              <div style={{ marginTop: "4px" }}>
                                <JobTypeBadge jobType={job.jobType} size="sm" />
                              </div>
                            </td>
                            <td style={{ fontWeight: 500, color: "#1e293b" }}>{job.customerName}</td>
                            <td style={{ color: "#334155" }}>{job.title}</td>
                            <td>
                              <PriorityBadge priority={job.priority} />
                            </td>
                            <td>
                              {!isUnassigned ? (
                                <div className="dq-designer-chip">
                                  <span
                                    className="dq-avatar"
                                    style={{ backgroundColor: getAvatarColor(job.designerName) }}
                                  >
                                    {getInitials(job.designerName)}
                                  </span>
                                  <span style={{ fontWeight: 500 }}>{job.designerName}</span>
                                </div>
                              ) : (
                                <span style={{ color: "#475569", fontSize: "0.8125rem" }}>- Unassigned</span>
                              )}
                            </td>
                            <td>
                              <span
                                className={
                                  job.status === "Waiting"
                                    ? "dq-status-waiting"
                                    : job.status === "Assigned"
                                      ? "dq-status-assigned"
                                      : job.status === "In Progress"
                                        ? "dq-status-in-progress"
                                        : (job.status === "Pending Sample Approvals" || job.status === "Proof Sent")
                                          ? "dq-status-pending-sample"
                                          : job.status === "Revision"
                                            ? "dq-status-revision"
                                            : "dq-status-completed"
                                }
                              >
                                {job.status}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                                {isAllocated ? (
                                  <button
                                    type="button"
                                    className="dq-btn-table-view"
                                    title="View job details, requirements & status"
                                    onClick={() => {
                                      setViewingJob(job);
                                      setIsViewModalOpen(true);
                                    }}
                                  >
                                    <Eye size={13} />
                                    <span>View</span>
                                  </button>
                                ) : isRejectedJob ? (
                                  <button
                                    type="button"
                                    className="dq-btn-table-reallocate"
                                    title={
                                      job.rejectionReason || job.designRejectionReason
                                        ? `Rejected: ${job.rejectionReason || job.designRejectionReason} - Click to reallocate`
                                        : "Reallocate to designer"
                                    }
                                    onClick={() => {
                                      setSelectedJob(job);
                                      setIsAssignModalOpen(true);
                                    }}
                                  >
                                    Reallocate
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="dq-btn-table-allocate"
                                    title="Allocate to designer"
                                    onClick={() => {
                                      setSelectedJob(job);
                                      setIsAssignModalOpen(true);
                                    }}
                                  >
                                    Allocate
                                  </button>
                                )}
                                {!isAllocated && (
                                  <button
                                    type="button"
                                    className="dq-btn-table-more"
                                    title="View details"
                                    onClick={() => {
                                      setViewingJob(job);
                                      setIsViewModalOpen(true);
                                    }}
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )
                  )}
                  {/* Keep the table the same height as the selected rows-per-page: blank rows fill the unused space */}
                  {!loading &&
                    activeList.length > 0 &&
                    Array.from({ length: Math.max(0, pageSize - (endIndex - startIndex)) }, (_, i) => (
                      <tr key={`dq-filler-${i}`} className="dq-filler-row" aria-hidden="true">
                        <td colSpan={9} />
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            <Pagination
              variant="compact"
              currentPage={currentPage}
              totalItems={activeList.length}
              itemsPerPage={pageSize}
              onPageChange={(p) => setCurrentPage(Math.min(Math.max(1, p), totalPages))}
              onItemsPerPageChange={(n) => setPageSize(n)}
              pageSizeOptions={[5, 10, 20, 25, 50, 100]}
              itemLabel={statusFilter === "rejected" ? "rejected orders" : "job orders"}
            />
          </div>

          {/* ──────────────── DESIGNER QUEUE (BELOW DESIGN QUEUE TABLE) ──────────────── */}
          <div className="dq-designer-queue-card">
            <div className="dq-designer-queue-header">
              <div>
                <h4 className="dq-designer-queue-title">
                  <Users size={18} style={{ color: "#2563eb" }} />
                  <span>Designer Queue</span>
                </h4>
              </div>
              {isManagerOrAdmin && (
                <button
                  type="button"
                  className="jf-btn jf-btn-primary jf-btn-sm"
                  onClick={() => setShowAddDesigner(true)}
                >
                  + Add Designer
                </button>
              )}
            </div>

            {showAddDesigner && (
              <div className="jf-modal-overlay" onClick={() => !addingDesigner && setShowAddDesigner(false)}>
                <div className="jf-modal jf-modal-md" onClick={(e) => e.stopPropagation()}>
                  <div className="jf-modal-header">
                    <h2 className="jf-modal-title">Add Designer</h2>
                  </div>
                  <form onSubmit={handleAddDesigner}>
                    <div className="jf-modal-body" style={{ display: "grid", gap: "0.85rem" }}>
                      <div className="jf-form-group">
                        <label className="jf-label jf-label-required">Designer Name</label>
                        <input className="jf-input" value={newDesigner.name} onChange={(e) => setNewDesigner((p) => ({ ...p, name: e.target.value }))} required autoFocus />
                      </div>
                      <div className="jf-form-group">
                        <label className="jf-label jf-label-required">Email (login)</label>
                        <input type="email" className="jf-input" value={newDesigner.email} onChange={(e) => setNewDesigner((p) => ({ ...p, email: e.target.value }))} required />
                      </div>
                      <div className="jf-form-group">
                        <label className="jf-label">Mobile</label>
                        <input className="jf-input" value={newDesigner.mobile} onChange={(e) => setNewDesigner((p) => ({ ...p, mobile: e.target.value }))} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                        <div className="jf-form-group">
                          <label className="jf-label jf-label-required">Password</label>
                          <input type="password" className="jf-input" placeholder="At least 6 characters" minLength={6} required value={newDesigner.password} onChange={(e) => setNewDesigner((p) => ({ ...p, password: e.target.value }))} autoComplete="new-password" />
                        </div>
                        <div className="jf-form-group">
                          <label className="jf-label">Max Load</label>
                          <input type="number" min="1" max="50" className="jf-input" value={newDesigner.maxLoad} onChange={(e) => setNewDesigner((p) => ({ ...p, maxLoad: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                    <div className="jf-modal-footer">
                      <button type="button" className="jf-btn jf-btn-secondary" onClick={() => setShowAddDesigner(false)} disabled={addingDesigner}>Cancel</button>
                      <button type="submit" className="jf-btn jf-btn-primary" disabled={addingDesigner}>{addingDesigner ? "Saving..." : "Save Designer"}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {editDesigner && (
              <div className="jf-modal-overlay" onClick={() => !savingEditDesigner && setEditDesigner(null)}>
                <div className="jf-modal jf-modal-md" onClick={(e) => e.stopPropagation()}>
                  <div className="jf-modal-header">
                    <h2 className="jf-modal-title">Edit Designer</h2>
                  </div>
                  <form onSubmit={handleSaveEditDesigner}>
                    <div className="jf-modal-body" style={{ display: "grid", gap: "0.85rem" }}>
                      <div className="jf-form-group">
                        <label className="jf-label jf-label-required">Designer Name</label>
                        <input className="jf-input" value={editDesigner.name} onChange={(e) => setEditDesigner((p) => ({ ...p, name: e.target.value }))} required autoFocus />
                      </div>
                      <div className="jf-form-group">
                        <label className="jf-label jf-label-required">Email (login)</label>
                        <input type="email" className="jf-input" value={editDesigner.email} onChange={(e) => setEditDesigner((p) => ({ ...p, email: e.target.value }))} required />
                      </div>
                      <div className="jf-form-group">
                        <label className="jf-label">New Password</label>
                        <input type="password" className="jf-input" placeholder="Leave blank to keep the current password" minLength={6} value={editDesigner.password} onChange={(e) => setEditDesigner((p) => ({ ...p, password: e.target.value }))} autoComplete="new-password" />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                        <div className="jf-form-group">
                          <label className="jf-label">Mobile</label>
                          <input className="jf-input" value={editDesigner.mobile} onChange={(e) => setEditDesigner((p) => ({ ...p, mobile: e.target.value }))} />
                        </div>
                        <div className="jf-form-group">
                          <label className="jf-label">Max Load</label>
                          <input type="number" min="1" max="50" className="jf-input" value={editDesigner.maxLoad} onChange={(e) => setEditDesigner((p) => ({ ...p, maxLoad: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                    <div className="jf-modal-footer">
                      <button type="button" className="jf-btn jf-btn-secondary" onClick={() => setEditDesigner(null)} disabled={savingEditDesigner}>Cancel</button>
                      <button type="submit" className="jf-btn jf-btn-primary" disabled={savingEditDesigner}>{savingEditDesigner ? "Saving..." : "Save Changes"}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div style={{ overflowX: "auto" }}>
              <table className="dq-panel-table">
                <thead>
                  <tr>
                    <th style={{ width: "35px" }}>#</th>
                    <th>Designer Name</th>
                    <th>Email / Code</th>
                    <th style={{ textAlign: "center" }}>Current Load</th>
                    <th style={{ textAlign: "center" }}>Max Load Limit</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDesigners.map((des, pageIndex) => {
                    const index = designerStart + pageIndex;
                    const desId = des._id || des.userId || des.employeeId;
                    const isEditing = editingDesignerId === desId;
                    const loadCount = des.openJobs !== undefined ? des.openJobs : (des.currentLoad || 0);

                    return (
                      <tr key={desId || index}>
                        <td style={{ color: "#475569" }}>{index + 1}</td>
                        <td>
                          <div className="dq-designer-chip">
                            <span
                              className="dq-avatar"
                              style={{ backgroundColor: getAvatarColor(des.name) }}
                            >
                              {getInitials(des.name)}
                            </span>
                            <span style={{ fontWeight: 600 }}>{des.name}</span>
                          </div>
                        </td>
                        <td style={{ color: "#475569", fontSize: "0.8125rem" }}>
                          {des.email || des.employeeCode || "-"}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>
                          <span
                            style={{
                              color: loadCount >= (des.maxLoad || 5) ? "#dc2626" : "#0f172a",
                              background: loadCount >= (des.maxLoad || 5) ? "#fee2e2" : "#f1f5f9",
                              padding: "0.2rem 0.55rem",
                              borderRadius: "12px",
                              fontSize: "0.78125rem",
                            }}
                          >
                            {loadCount}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {isEditing ? (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                              <input
                                type="number"
                                min="1"
                                max="50"
                                className="dq-rr-input-load"
                                style={{ width: "55px", height: "30px", fontSize: "0.8125rem" }}
                                value={editingDesignerLoad}
                                onChange={(e) => setEditingDesignerLoad(e.target.value)}
                                autoFocus
                              />
                              <button
                                type="button"
                                className="jf-btn jf-btn-primary jf-btn-sm"
                                style={{
                                  padding: "0.2rem 0.5rem",
                                  fontSize: "0.75rem",
                                  background: "#16a34a",
                                  borderColor: "#16a34a",
                                }}
                                disabled={savingDesignerId === desId}
                                onClick={() => handleUpdateDesignerLimit(desId, editingDesignerLoad)}
                                title="Save limit"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                type="button"
                                className="jf-btn jf-btn-secondary jf-btn-sm"
                                style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem" }}
                                onClick={() => setEditingDesignerId(null)}
                                title="Cancel"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontWeight: 600, color: "#1e293b" }}>
                              {des.maxLoad || 5}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={des.isActive !== false ? "dq-badge-active" : "dq-badge-low"}>
                            {des.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {!isEditing && (
                            <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                className="jf-btn jf-btn-secondary jf-btn-sm"
                                style={{ padding: "0.3rem 0.5rem" }}
                                title="Edit designer details"
                                aria-label="Edit designer details"
                                onClick={() =>
                                  setEditDesigner({
                                    id: desId,
                                    name: des.name || "",
                                    email: des.email || "",
                                    mobile: des.mobile || "",
                                    password: "",
                                    maxLoad: des.maxLoad || 5,
                                  })
                                }
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                className="jf-btn jf-btn-sm"
                                style={{
                                  padding: "0.3rem 0.5rem",
                                  background: des.isActive !== false ? "#fee2e2" : "#dcfce7",
                                  color: des.isActive !== false ? "#b91c1c" : "#15803d",
                                  border: `1px solid ${des.isActive !== false ? "#fecaca" : "#bbf7d0"}`,
                                }}
                                title={des.isActive !== false ? "Make inactive" : "Make active"}
                                aria-label={des.isActive !== false ? "Make inactive" : "Make active"}
                                disabled={savingDesignerId === desId}
                                onClick={() => handleToggleDesignerActive(des)}
                              >
                                <Power size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              variant="compact"
              currentPage={safeDesignerPage}
              totalItems={allDesigners.length}
              itemsPerPage={designerPageSize}
              onPageChange={(p) => setDesignerPage(Math.min(Math.max(1, p), designerTotalPages))}
              onItemsPerPageChange={(n) => setDesignerPageSize(n)}
              pageSizeOptions={[5, 10, 20, 25, 50, 100]}
              itemLabel="designers"
            />
          </div>
        </>
      )}

      {/* ──────────────── SCREEN 2: DESIGNER MY JOBS (PROFILE SWITCHER & UNIFIED QUEUE) ──────────────── */}
      {activeView === "my-jobs" && (
        <div className="jf-card" style={{ padding: 0 }}>
          {/* Card Header & Profile Switcher */}
          <div
            className="jf-card-header"
            style={{
              padding: "1.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <h3 className="jf-card-title" style={{ margin: 0 }}>
                  {isDesignerUser ? "My Assigned Design Jobs & Invitations" : "Designer Work Queue"}
                </h3>
                {!isDesignerUser && (
                  selectedDesignerProfile === "all" ? (
                    <span className="jf-badge jf-badge-blue" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                      <Users size={14} /> All Designers Queue
                    </span>
                  ) : (
                    <span className="jf-badge jf-badge-purple" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                      <UserCheck size={14} /> Profile: {activeSelectedDesigner?.name || "Designer"}
                    </span>
                  )
                )}
              </div>
              
            </div>

            {/* Designer Workload Bar (Right-aligned in header, clean & neat) */}
            {isDesignerUser && activeSelectedDesigner && (
              <div className="dq-workload-container" style={{ minWidth: "190px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78125rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                  <span>Workload Load</span>
                  <span>
                    {designerQueueCounts[String(activeSelectedDesigner._id || activeSelectedDesigner.userId || activeSelectedDesigner.employeeId)] || displayedMyJobs.length} / {activeSelectedDesigner.maxLoad || 5} Jobs
                  </span>
                </div>
                <div className="dq-workload-track" style={{ height: "6px" }}>
                  {(() => {
                    const load = designerQueueCounts[String(activeSelectedDesigner._id || activeSelectedDesigner.userId || activeSelectedDesigner.employeeId)] || displayedMyJobs.length;
                    const max = activeSelectedDesigner.maxLoad || 5;
                    const pct = Math.min(100, Math.round((load / max) * 100));
                    const fillColor = pct >= 100 ? "#ef4444" : pct >= 60 ? "#f59e0b" : "#16a34a";
                    return <div className="dq-workload-fill" style={{ width: `${pct}%`, backgroundColor: fillColor }} />;
                  })()}
                </div>
              </div>
            )}

            {/* Profile Switcher Dropdown (Only for Supervisors/Managers) */}
            {!isDesignerUser && (
              <div className="dq-profile-switcher-wrapper">
                <label htmlFor="designer-profile-select" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#475569" }}>
                  Switch Profile:
                </label>
                <select
                  id="designer-profile-select"
                  className="dq-profile-select-control"
                  value={selectedDesignerProfile}
                  onChange={(e) => setSelectedDesignerProfile(e.target.value)}
                >
                  <option value="all">
                    🌐 All Designers Queue ({activeMyJobs.length} Total Jobs)
                  </option>
                  {designers.map((des) => {
                    const desId = String(des._id || des.userId || des.employeeId);
                    const count = designerQueueCounts[desId] || 0;
                    return (
                      <option key={desId} value={desId}>
                        👤 {des.name} ({count} {count === 1 ? "job" : "jobs"} / max {des.maxLoad || 5})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Quick-switch profile pills bar (Only for Supervisors/Managers) */}
          {!isDesignerUser && (
            <div className="dq-profile-pills-bar">
              <button
                type="button"
                className={`dq-profile-pill-item ${selectedDesignerProfile === "all" ? "active" : ""}`}
                onClick={() => setSelectedDesignerProfile("all")}
              >
                <Globe size={14} />
                <span>All Designers</span>
                <span className="dq-profile-pill-badge">{activeMyJobs.length}</span>
              </button>
              {designers.map((des) => {
                const desId = String(des._id || des.userId || des.employeeId);
                const isSelected = selectedDesignerProfile === desId;
                const count = designerQueueCounts[desId] || 0;
                return (
                  <button
                    key={desId}
                    type="button"
                    className={`dq-profile-pill-item ${isSelected ? "active" : ""}`}
                    onClick={() => setSelectedDesignerProfile(desId)}
                  >
                    <span
                      className="dq-avatar"
                      style={{
                        width: "20px",
                        height: "20px",
                        fontSize: "0.65rem",
                        backgroundColor: getAvatarColor(des.name),
                      }}
                    >
                      {getInitials(des.name)}
                    </span>
                    <span>{des.name}</span>
                    <span className="dq-profile-pill-badge">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected Profile Banner (Single Designer Profile - Managers Only) */}
          {!isDesignerUser && selectedDesignerProfile !== "all" && activeSelectedDesigner && (
            <div className="dq-profile-info-banner">
              <div className="dq-profile-details">
                <span
                  className="dq-profile-avatar-lg"
                  style={{ backgroundColor: getAvatarColor(activeSelectedDesigner.name) }}
                >
                  {getInitials(activeSelectedDesigner.name)}
                </span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <strong style={{ fontSize: "1rem", color: "#0f172a" }}>
                      {activeSelectedDesigner.name}
                    </strong>
                    <span className="jf-badge jf-badge-green" style={{ fontSize: "0.72rem" }}>
                      <UserCheck size={12} /> Active Rotation
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#475569", marginTop: "0.15rem" }}>
                    {activeSelectedDesigner.email || "Prepress Designer"} • Capacity: {activeSelectedDesigner.maxLoad || 5} concurrent jobs
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                <div className="dq-workload-container">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78125rem", fontWeight: 600, color: "#334155" }}>
                    <span>Workload Load</span>
                    <span>
                      {designerQueueCounts[String(activeSelectedDesigner._id || activeSelectedDesigner.userId || activeSelectedDesigner.employeeId)] || 0} / {activeSelectedDesigner.maxLoad || 5} Jobs
                    </span>
                  </div>
                  <div className="dq-workload-track">
                    {(() => {
                      const load = designerQueueCounts[String(activeSelectedDesigner._id || activeSelectedDesigner.userId || activeSelectedDesigner.employeeId)] || 0;
                      const max = activeSelectedDesigner.maxLoad || 5;
                      const pct = Math.min(100, Math.round((load / max) * 100));
                      const fillColor = pct >= 100 ? "#ef4444" : pct >= 60 ? "#f59e0b" : "#16a34a";
                      return <div className="dq-workload-fill" style={{ width: `${pct}%`, backgroundColor: fillColor }} />;
                    })()}
                  </div>
                </div>

                {!isDesignerUser && (
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    style={{ background: "#ffffff" }}
                    onClick={() => setSelectedDesignerProfile("all")}
                  >
                    <Users size={14} /> View All Designers Queue
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Unified Queue Banner (When viewing all designers - Managers Only) */}
          {!isDesignerUser && selectedDesignerProfile === "all" && (
            <div className="dq-profile-info-banner unified">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Users size={24} color="#2563eb" />
                <div>
                  <strong style={{ fontSize: "0.9375rem", color: "#1e3a8a" }}>
                    All Designers Queue (Unified Overview)
                  </strong>
                  
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <span className="jf-badge jf-badge-blue" style={{ fontWeight: 700 }}>
                  {displayedMyJobs.length} Total Jobs in Queue
                </span>
                <span className="jf-badge jf-badge-gray">
                  {designers.length} Active Staff
                </span>
              </div>
            </div>
          )}

          {/* Sub-tabs for Designer: Assigned Jobs vs Revision / Redesign vs Rejected History */}
          <div className="dq-main-tabs" style={{ padding: "0 1.25rem", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <button
              type="button"
              className={`dq-main-tab-btn ${designerSubTab === "assigned" ? "active" : ""}`}
              onClick={() => setDesignerSubTab("assigned")}
            >
              <span>Assigned Jobs & Invitations</span>
              <span className="dq-main-tab-badge">
                {myAssignedJobs.length}
              </span>
            </button>
            <button
              type="button"
              className={`dq-main-tab-btn ${designerSubTab === "revision" ? "active" : ""}`}
              onClick={() => setDesignerSubTab("revision")}
            >
              <span>Revision / Redesign</span>
              <span
                className={`dq-main-tab-badge ${myRevisionJobs.length > 0 ? "is-revision" : ""}`}
                style={myRevisionJobs.length > 0 ? { background: "#ea580c", color: "#ffffff" } : {}}
              >
                {myRevisionJobs.length}
              </span>
            </button>
            <button
              type="button"
              className={`dq-main-tab-btn ${designerSubTab === "rejected" ? "active" : ""}`}
              onClick={() => setDesignerSubTab("rejected")}
            >
              <span>Rejected History</span>
              <span className={`dq-main-tab-badge ${myDesignerRejections.length > 0 ? "is-rejected" : ""}`}>
                {myDesignerRejections.length}
              </span>
            </button>
          </div>

          {/* Table Container */}
          <div style={{ padding: "1.25rem" }}>
            {designerSubTab === "assigned" ? (
              myAssignedJobs.length === 0 ? (
                <div className="dq-empty-queue-card">
                  <Palette size={40} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
                  <h4>
                    {selectedDesignerProfile === "all"
                      ? "No Active Jobs in Queue"
                      : `No Active Jobs for ${activeSelectedDesigner?.name || "this designer"}`}
                  </h4>
                  <p>
                    {selectedDesignerProfile === "all"
                      ? "There are currently no assigned or in-progress jobs waiting in the queue. You can assign jobs from the Design Queue."
                      : `${activeSelectedDesigner?.name || "This designer"} currently has no jobs assigned or in progress. Switch to All Designers Queue or allocate new work.`}
                  </p>
                  <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                    {!isDesignerUser && (
                      <>
                        {selectedDesignerProfile !== "all" && (
                          <button
                            type="button"
                            className="jf-btn jf-btn-primary jf-btn-sm"
                            onClick={() => setSelectedDesignerProfile("all")}
                          >
                            <Users size={14} /> View All Designers Queue
                          </button>
                        )}
                        <button
                          type="button"
                          className="jf-btn jf-btn-secondary jf-btn-sm"
                          onClick={() => setActiveView("queue")}
                        >
                          Go to Design Queue (Supervisor)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <table className="dq-panel-table">
                  <thead>
                    <tr>
                      <th>Job No</th>
                      <th>Customer</th>
                      <th>Title</th>
                      <th>Priority</th>
                      <th>Assigned Designer</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAssignedJobs.map((j) => {
                      const isAccepted =
                        approvedJobIds.has(String(j._id)) ||
                        j.status === "In Progress" ||
                        j.status === "Pending Sample Approvals" ||
                        j.status === "Proof Sent";
                      return (
                        <tr key={j._id}>
                          <td><strong>{j.jobNo}</strong></td>
                          <td>{j.customerName}</td>
                          <td>{j.title}</td>
                          <td>
                            <PriorityBadge priority={j.priority} />
                          </td>
                          <td>
                            {j.designerName && j.designerName !== "- Unassigned" ? (
                              <div className="dq-designer-chip">
                                <span
                                  className="dq-avatar"
                                  style={{ backgroundColor: getAvatarColor(j.designerName) }}
                                >
                                  {getInitials(j.designerName)}
                                </span>
                                <span style={{ fontWeight: 600 }}>{j.designerName}</span>
                              </div>
                            ) : (
                              <span style={{ color: "#475569", fontStyle: "italic", fontSize: "0.8125rem" }}>
                                - Unassigned
                              </span>
                            )}
                          </td>
                          <td>
                            <span
                              className={
                                j.status === "Pending Sample Approvals" || j.status === "Proof Sent"
                                  ? "dq-status-pending-sample"
                                  : j.status === "In Progress" || isAccepted
                                  ? "dq-status-in-progress"
                                  : "dq-status-assigned"
                              }
                            >
                              {j.status || (isAccepted ? "In Progress" : "Assigned")}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {!isAccepted ? (
                              <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                                <button
                                  type="button"
                                  className="jf-btn jf-btn-primary jf-btn-sm"
                                  style={{ background: "#15803d", borderColor: "#15803d" }}
                                  onClick={() => handleApproveDesign(j)}
                                >
                                  <Check size={14} /> Accept Job
                                </button>
                                <button
                                  type="button"
                                  className="jf-btn jf-btn-secondary jf-btn-sm"
                                  style={{ color: "#dc2626" }}
                                  onClick={() => {
                                    setSelectedJob(j);
                                    setIsRejectModalOpen(true);
                                  }}
                                >
                                  <X size={14} /> Reject
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="jf-btn jf-btn-primary jf-btn-sm"
                                style={{ background: "#16a34a", borderColor: "#16a34a" }}
                                onClick={() => {
                                  setSelectedJob(j);
                                  setActiveView("workbench");
                                }}
                              >
                                <Palette size={14} /> Open Workbench
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : designerSubTab === "revision" ? (
              myRevisionJobs.length === 0 ? (
                <div className="dq-empty-queue-card">
                  <RotateCcw size={40} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
                  <h4>No Redesign / Revision Jobs</h4>
                  <p>
                    {activeSelectedDesigner?.name || "This designer"} currently has no jobs waiting for redesign or revision.
                  </p>
                </div>
              ) : (
                <table className="dq-panel-table">
                  <thead>
                    <tr>
                      <th>Job Order No.</th>
                      <th>Priority</th>
                      <th>Customer</th>
                      <th>Job Item</th>
                      <th>Rejected Sample Preview</th>
                      <th>Rejection Reason</th>
                      <th>Rejection Date</th>
                      <th>Current Revision Status</th>
                      <th style={{ textAlign: "right" }}>Available Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRevisionJobs.map((j) => {
                      const isStarted =
                        Boolean(j.isRevisionStarted || j.raw?.isRevisionStarted) ||
                        j.designStatus === "STARTED_REVISION" ||
                        startedRevisionJobIds.has(String(j._id));
                      const revisionReason =
                        j.rejectionReason ||
                        j.designRejectionReason ||
                        j.raw?.designRejectionReason ||
                        combinedSamples.find(
                          (s) => String(s.jobId || s._id) === String(j._id) && s.status === "REVISION_REQUIRED"
                        )?.revisionReason ||
                        "Revision requested by client or manager";
                      const rejProof =
                        j.rejectedSampleUrl ||
                        j.designProofUrl ||
                        j.raw?.designProofUrl ||
                        NO_PROOF_IMG;
                      const rejDate =
                        j.sampleRejectedAt ||
                        j.raw?.sampleRejectedAt ||
                        j.raw?.updatedAt ||
                        j.updatedAt;

                      return (
                        <tr key={j._id}>
                          {/* 1. Job Order No. */}
                          <td>
                            <span
                              className="dq-jobno-link"
                              onClick={() => {
                                setViewingJob(j);
                                setIsViewModalOpen(true);
                              }}
                              title="Click to view job specifications"
                            >
                              <strong>{j.jobNo}</strong>
                            </span>
                          </td>
<td><PriorityBadge priority={j.priority} /></td>

                          {/* 2. Customer */}
                          <td style={{ fontWeight: 600, color: "#1e293b" }}>{j.customerName}</td>

                          {/* 3. Job Item */}
                          <td style={{ color: "#334155" }}>{j.title}</td>

                          {/* 4. Rejected Sample Preview */}
                          <td>
                            <button
                              type="button"
                              className="dq-btn-sample-proof"
                              onClick={() => setPreviewSampleProofUrl(rejProof)}
                              title="Click to preview rejected artwork sample"
                            >
                              <Eye size={13} />
                              <span>Proof Preview</span>
                            </button>
                          </td>

                          {/* 5. Rejection Reason */}
                          <td>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                background: "#fff1f2",
                                border: "1px solid #ffe4e6",
                                color: "#9f1239",
                                padding: "0.3rem 0.65rem",
                                borderRadius: "7px",
                                fontSize: "0.78125rem",
                                maxWidth: "240px",
                                lineHeight: 1.35,
                              }}
                              title={revisionReason}
                            >
                              <RotateCcw size={13} style={{ flexShrink: 0, color: "#be123c" }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {revisionReason}
                              </span>
                            </div>
                          </td>

                          {/* 6. Rejection Date */}
                          <td style={{ color: "#475569", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                            {rejDate
                              ? new Date(rejDate).toLocaleString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              : "—"}
                          </td>

                          {/* 7. Current Revision Status */}
                          <td>
                            {isStarted ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  padding: "0.22rem 0.65rem",
                                  borderRadius: "9999px",
                                  background: "#ecfdf5",
                                  border: "1px solid #a7f3d0",
                                  color: "#047857",
                                  fontSize: "0.78125rem",
                                  fontWeight: 600,
                                }}
                              >
                                <CheckCircle2 size={12} color="#059669" />
                                <span>Started by Designer</span>
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  padding: "0.22rem 0.65rem",
                                  borderRadius: "9999px",
                                  background: "#fffbeb",
                                  border: "1px solid #fde68a",
                                  color: "#b45309",
                                  fontSize: "0.78125rem",
                                  fontWeight: 600,
                                }}
                              >
                                <Clock size={12} color="#d97706" />
                                <span>Pending Start</span>
                              </span>
                            )}
                          </td>

                          {/* 8. Available Actions */}
                          <td style={{ textAlign: "right" }}>
                            {!isStarted ? (
                              <button
                                type="button"
                                className="jf-btn jf-btn-primary jf-btn-sm"
                                style={{
                                  background: "#ea580c",
                                  borderColor: "#ea580c",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                }}
                                onClick={() => handleStartRedesign(j)}
                                title="Click to start revision process"
                              >
                                <Play size={14} /> Start Revision
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="jf-btn jf-btn-primary jf-btn-sm"
                                style={{
                                  background: "#16a34a",
                                  borderColor: "#16a34a",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                }}
                                onClick={() => {
                                  setSelectedJob({ ...j, isRedesign: true, revisionReason });
                                  setActiveView("workbench");
                                }}
                                title="Open workbench to work on redesign"
                              >
                                <Palette size={14} /> Open to Workbench
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : (
              /* Rejected History Tab for this specific designer */
              myDesignerRejections.length === 0 ? (
                <div className="dq-empty-queue-card">
                  <RotateCcw size={40} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
                  <h4>No Rejected Jobs in History</h4>
                  <p>
                    {activeSelectedDesigner?.name || "This designer"} has not rejected any design allocations. All assigned jobs were accepted or are currently in progress.
                  </p>
                </div>
              ) : (
                <table className="dq-panel-table">
                  <thead>
                    <tr>
                      <th>Job Order No.</th>
                      <th>Priority</th>
                      <th>Customer</th>
                      <th>Job Item</th>
                      <th>Rejected On</th>
                      <th>Rejection Reason</th>
                      <th>Current Allocation Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myDesignerRejections.map((rej) => {
                      const targetJob =
                        jobs.find((j) => String(j._id || j.id) === String(rej.jobId)) ||
                        rej.jobOrder ||
                        rej;
                      const isPending =
                        rej.isPendingReallocation ||
                        !rej.currentDesigner ||
                        rej.currentDesigner === "- Unassigned";

                      return (
                        <tr key={rej._id || rej.assignmentId || rej.jobId}>
                          <td>
                            <span
                              className="dq-jobno-link"
                              onClick={() => {
                                setViewingJob(targetJob);
                                setIsViewingOnly(true);
                                setIsViewModalOpen(true);
                              }}
                              title="Click to view job details"
                            >
                              {rej.jobNo}
                            </span>
                          </td>
<td><PriorityBadge priority={rej.jobOrder?.priority || rej.priority} /></td>
                          <td style={{ fontWeight: 600, color: "#1e293b" }}>{rej.customerName}</td>
                          <td style={{ color: "#334155" }}>{rej.jobItem}</td>
                          <td style={{ color: "#475569", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                            {rej.rejectedAt
                              ? new Date(rej.rejectedAt).toLocaleString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              : "—"}
                          </td>
                          <td>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                background: "#fff1f2",
                                border: "1px solid #ffe4e6",
                                color: "#9f1239",
                                padding: "0.3rem 0.65rem",
                                borderRadius: "7px",
                                fontSize: "0.78125rem",
                                maxWidth: "280px",
                                lineHeight: 1.35,
                              }}
                              title={rej.rejectionReason}
                            >
                              <AlertCircle size={13} style={{ flexShrink: 0, color: "#e11d48" }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {rej.rejectionReason}
                              </span>
                            </div>
                          </td>
                          <td>
                            {isPending ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  padding: "0.22rem 0.65rem",
                                  borderRadius: "9999px",
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  color: "#dc2626",
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                }}
                              >
                                <Clock size={12} />
                                Pending Reallocation
                              </span>
                            ) : isDesignerUser ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  padding: "0.22rem 0.65rem",
                                  borderRadius: "9999px",
                                  background: "#f0fdf4",
                                  border: "1px solid #bbf7d0",
                                  color: "#15803d",
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                }}
                              >
                                <UserCheck size={12} />
                                Allocated to other designer
                              </span>
                            ) : (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                                <span
                                  className="dq-avatar"
                                  style={{
                                    width: "22px",
                                    height: "22px",
                                    fontSize: "0.65rem",
                                    backgroundColor: getAvatarColor(rej.currentDesigner),
                                  }}
                                >
                                  {getInitials(rej.currentDesigner)}
                                </span>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: "#166534",
                                    fontSize: "0.78125rem",
                                  }}
                                >
                                  Reallocated: {rej.currentDesigner}
                                </span>
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="dq-btn-table-view"
                              title="View job details"
                              onClick={() => {
                                setViewingJob(targetJob);
                                setIsViewingOnly(true);
                                setIsViewModalOpen(true);
                              }}
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      )}

      {/* ──────────────── SCREEN 3: DESIGN WORKBENCH (GREEN COLOR THEME) ──────────────── */}
      {(activeView === "workbench" || activeView === "workspace") && (
        <div className="dw-container">
          {/* Top Header & Actions */}
          <div className="dw-header-wrapper">
            <div className="dw-header-titles">
              <h2>Design Workbench</h2>
             
            </div>
            <div className="dw-header-actions">
              <button
                type="button"
                className="dw-btn-outline"
                onClick={() => setActiveView("my-jobs")}
                title="Return to Invitations & Queue"
              >
                <ArrowLeft size={15} style={{ color: "#16a34a" }} />
                My Invitations
              </button>
              <button
                type="button"
                className="dw-btn-outline"
                onClick={handleSaveWorkbench}
              >
                <Save size={15} style={{ color: "#16a34a" }} />
                Save
              </button>
              <button
                type="button"
                className="dw-btn-outline"
                onClick={handleDownloadProof}
              >
                <Download size={15} style={{ color: "#16a34a" }} />
                Download Proof
              </button>
              <button
                type="button"
                className="dw-btn-primary-green"
                onClick={handleSubmitForReview}
              >
                <Upload size={15} />
                Submit for Review
              </button>
            </div>

          </div>

          {/* Redesign / Revision Requirements Banner */}
          {(() => {
            const isRevisionJob =
              currentWorkbenchJob.status === "Revision" ||
              currentWorkbenchJob.stage === "REVISION" ||
              currentWorkbenchJob.designStatus === "REVISION" ||
              currentWorkbenchJob.isRedesign;
            const revReason =
              currentWorkbenchJob.rejectionReason ||
              currentWorkbenchJob.designRejectionReason ||
              currentWorkbenchJob.revisionReason ||
              "Client requested revisions";

            const currentDes = activeSelectedDesigner || currentUser;
            const targetName = (currentDes?.name || effectiveName || "").toLowerCase().trim();
            const targetEmail = (currentDes?.email || effectiveEmail || "").toLowerCase().trim();
            const targetId = String(currentDes?._id || currentDes?.userId || currentDes?.employeeId || "");

            const assignedName = (currentWorkbenchJob.designerName || "").toLowerCase().trim();
            const assignedEmail = (currentWorkbenchJob.designerEmail || "").toLowerCase().trim();
            const assignedId = String(currentWorkbenchJob.designerId || currentWorkbenchJob.raw?.designerId?._id || currentWorkbenchJob.raw?.designerId || "");

            const isAssignedToMe =
              !isDesignerUser ||
              !assignedName ||
              assignedName === "- unassigned" ||
              (targetId && assignedId && targetId === assignedId) ||
              (targetEmail && assignedEmail && targetEmail === assignedEmail) ||
              (targetName && assignedName && (targetName === assignedName || targetName.includes(assignedName) || assignedName.includes(targetName)));

            if (isRevisionJob) {
              return (
                <div
                  style={{
                    background: isAssignedToMe ? "#fff7ed" : "#fef2f2",
                    border: `1px solid ${isAssignedToMe ? "#fdba74" : "#fecaca"}`,
                    borderRadius: "10px",
                    padding: "0.85rem 1.25rem",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <RotateCcw size={22} color={isAssignedToMe ? "#ea580c" : "#dc2626"} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: isAssignedToMe ? "#c2410c" : "#991b1b", display: "block", fontSize: "0.9rem" }}>
                      Redesign / Revision Required
                    </strong>
                    <div style={{ fontSize: "0.8125rem", color: isAssignedToMe ? "#9a3412" : "#7f1d1d", marginTop: "0.2rem" }}>
                      <strong>Revision Feedback:</strong> {revReason}
                    </div>
                    {!isAssignedToMe && (
                      <div style={{ fontSize: "0.78125rem", color: "#dc2626", fontWeight: 700, marginTop: "0.25rem" }}>
                        Restricted: Redesign can only be performed by the specific assigned designer: {currentWorkbenchJob.designerName}.
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        background: isAssignedToMe ? "#fed7aa" : "#fee2e2",
                        color: isAssignedToMe ? "#9a3412" : "#991b1b",
                        padding: "0.25rem 0.65rem",
                        borderRadius: "9999px",
                        fontWeight: 700,
                        display: "inline-block",
                      }}
                    >
                      Assigned Designer: {currentWorkbenchJob.designerName}
                    </span>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Horizontal Top Specs Card */}
          <div className="dw-summary-bar">
            <div className="dw-summary-item">
              <span className="dw-summary-label">Job Order No.</span>
              <span
                className="dw-summary-val dw-summary-val-green"
                onClick={() => {
                  setViewingJob(currentWorkbenchJob);
                  setIsViewModalOpen(true);
                }}
                title="View full job details"
              >
                {currentWorkbenchJob.jobNo || "-"}
              </span>
            </div>
            <div className="dw-summary-item">
              <span className="dw-summary-label">Customer</span>
              <span className="dw-summary-val">
                {currentWorkbenchJob.customerName || "ABC Marketing"}
              </span>
            </div>
            <div className="dw-summary-item">
              <span className="dw-summary-label">Job Item</span>
              <span className="dw-summary-val">
                {currentWorkbenchJob.title || "Flyer - A5"}
              </span>
            </div>
            <div className="dw-summary-item">
              <span className="dw-summary-label">Size</span>
              <span className="dw-summary-val">
                {currentWorkbenchJob.size || "A5 (148 × 210 mm)"}
              </span>
            </div>
            <div className="dw-summary-item">
              <span className="dw-summary-label">Quantity</span>
              <span className="dw-summary-val">
                {currentWorkbenchJob.quantity || 500}
              </span>
            </div>
            <div className="dw-summary-item">
              <span className="dw-summary-label">Target Date</span>
              <span className="dw-summary-val dw-summary-val-red">
                {currentWorkbenchJob.targetDate || currentWorkbenchJob.slaDue || "12 Aug 2025"}
              </span>
            </div>
            <div className="dw-summary-item">
              <span className="dw-summary-label">Priority</span>
              <PriorityBadge priority={currentWorkbenchJob.priority} />
            </div>
          </div>

          {/* Main 3-Column Grid */}
          <div className="dw-main-grid">
            {/* ───── COLUMN 1: CUSTOMER REFERENCES ───── */}
            <div className="dw-card">
              <h3 className="dw-card-title">
                <Paperclip size={18} style={{ color: "#16a34a" }} />
                Customer References
              </h3><br></br>

              {customerFiles.map((file) => (
                <div key={file.id} className="dw-ref-file-box">
                  <div
                    className="dw-file-icon-box"
                    style={{
                      background: file.type === "pdf" ? "#fee2e2" : "#dcfce7",
                      color: file.type === "pdf" ? "#dc2626" : "#16a34a",
                    }}
                  >
                    {file.type === "pdf" ? <FileText size={18} /> : <Palette size={18} />}
                  </div>
                  <div className="dw-file-meta">
                    <div className="dw-file-name" title={file.name}>
                      {file.name}
                    </div>
                    <div className="dw-file-size">{file.size}</div>
                    <div className="dw-file-actions">
                      <button
                        type="button"
                        className="dw-file-action-btn"
                        onClick={() => handlePreviewFile(file)}
                      >
                        <Eye size={12} /> Preview
                      </button>
                      <button
                        type="button"
                        className="dw-file-action-btn"
                        onClick={() => handleDownloadFile(file)}
                      >
                        <Download size={12} /> Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ───── COLUMN 2: ARTWORK CANVAS PREVIEW ───── */}
            <div className="dw-canvas-card">
              <div className="dw-flyer-poster">
                {uploadedSampleUrl ? (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      minHeight: "490px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#f8fafc",
                    }}
                  >
                    <img
                      src={uploadedSampleUrl}
                      alt="Proof Artwork"
                      style={{
                        width: "100%",
                        height: "auto",
                        maxHeight: "560px",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setUploadedSampleUrl(null)}
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        background: "rgba(15, 23, 42, 0.75)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "50%",
                        width: "28px",
                        height: "28px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Reset to default flyer design"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="dw-flyer-inner">
                    {/* Brand header */}
                    <div className="dw-flyer-brand">
                      <div className="dw-flyer-brand-icon">P</div>
                      <span className="dw-flyer-brand-text">PrintZ</span>
                    </div>

                    {/* Headline */}
                    <h1 className="dw-flyer-heading">
                      Quality<br />
                      <span className="dw-flyer-heading-green">Prints for</span><br />
                      Your Business
                    </h1>

                    <div className="dw-flyer-divider" />

                    {/* Check item list */}
                    <div className="dw-flyer-checklist">
                      <div className="dw-flyer-check-item">
                        <span className="dw-flyer-check-icon">📇</span>
                        <span>Business Cards</span>
                      </div>
                      <div className="dw-flyer-check-item">
                        <span className="dw-flyer-check-icon">📄</span>
                        <span>Flyers</span>
                      </div>
                      <div className="dw-flyer-check-item">
                        <span className="dw-flyer-check-icon">🪧</span>
                        <span>Banners</span>
                      </div>
                      <div className="dw-flyer-check-item">
                        <span className="dw-flyer-check-icon">📑</span>
                        <span>Brochures</span>
                      </div>
                    </div>

                    {/* Architectural visual */}
                    <div className="dw-flyer-building-graphic">

                      <img
                        src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=450&auto=format&fit=crop&q=80"
                        alt="Corporate Architecture"
                      />
                    </div>

                    {/* Curved green flowing ribbons */}
                    <svg className="dw-flyer-wave-svg" viewBox="0 0 440 160" preserveAspectRatio="none">
                      <path
                        d="M 0,90 Q 110,30 220,80 T 440,60 L 440,160 L 0,160 Z"
                        fill="#059669"
                        opacity="0.85"
                      />
                      <path
                        d="M 0,110 Q 120,60 240,110 T 440,80 L 440,160 L 0,160 Z"
                        fill="#16a34a"
                      />
                      <path
                        d="M 0,135 Q 140,90 280,135 T 440,110 L 440,160 L 0,160 Z"
                        fill="#064e3b"
                      />
                    </svg>

                    {/* Footer Contact Info */}
                    <div className="dw-flyer-footer">
                      <div className="dw-flyer-contact-row">
                        <Phone size={13} />
                        <span>+91 98765 43210</span>
                      </div>
                      <div className="dw-flyer-contact-row">
                        <Globe size={13} />
                        <span>www.printz.com</span>
                      </div>
                      <div className="dw-flyer-dots">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div key={i} className="dw-flyer-dot" />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Sample Box */}
              <div className="dw-upload-box">
                <Upload size={24} style={{ color: "#16a34a" }} />
                <label htmlFor="sample-upload-input" className="dw-btn-upload-sample">
                  <Upload size={14} /> Upload Sample
                </label>
                <input
                  id="sample-upload-input"
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: "none" }}
                  onChange={handleSampleFileUpload}
                />
                <span style={{ fontSize: "0.78125rem", color: "#475569" }}>
                  Upload the edited design file (JPG, PNG or PDF)
                </span>
              </div>
            </div>

            {/* ───── COLUMN 3: JOB DETAILS & DESIGN NOTES ───── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Job Details Card */}
              <div className="dw-card">
                <h3 className="dw-card-title">Job Details</h3>
                <div className="dw-details-list" style={{ marginTop: "1rem" }}>
                  <div className="dw-details-row">
                    <span className="dw-details-label">Job Order No.</span>
                    <span className="dw-details-val">
                      {currentWorkbenchJob.jobNo || "-"}
                    </span>
                  </div>
                  <div className="dw-details-row">
                    <span className="dw-details-label">Customer</span>
                    <span className="dw-details-val">
                      {currentWorkbenchJob.customerName || "ABC Marketing"}
                    </span>
                  </div>
                  <div className="dw-details-row">
                    <span className="dw-details-label">Job Item</span>
                    <span className="dw-details-val">
                      {currentWorkbenchJob.title || "Flyer - A5"}
                    </span>
                  </div>
                  <div className="dw-details-row">
                    <span className="dw-details-label">Size</span>
                    <span className="dw-details-val">
                      {currentWorkbenchJob.size || "A5 (148 × 210 mm)"}
                    </span>
                  </div>
                  <div className="dw-details-row">
                    <span className="dw-details-label">Quantity</span>
                    <span className="dw-details-val">
                      {currentWorkbenchJob.quantity || 500}
                    </span>
                  </div>
                  <div className="dw-details-row">
                    <span className="dw-details-label">Assigned Date</span>
                    <span className="dw-details-val">
                      {currentWorkbenchJob.assignedDate || "10 Aug 2025"}
                    </span>
                  </div>
                  <div className="dw-details-row">
                    <span className="dw-details-label">Target Date</span>
                    <span className="dw-details-val" style={{ color: "#dc2626" }}>
                      {currentWorkbenchJob.targetDate || currentWorkbenchJob.slaDue || "12 Aug 2025"}
                    </span>
                  </div>
                  <div className="dw-details-row">
                    <span className="dw-details-label">Priority</span>
                    <PriorityBadge priority={currentWorkbenchJob.priority} />
                  </div>
                  <div className="dw-details-row">
                    <span className="dw-details-label">Status</span>
                    <span
                      className={
                        currentWorkbenchJob.status === "Pending Sample Approvals" || currentWorkbenchJob.status === "Proof Sent"
                          ? "dq-status-pending-sample"
                          : currentWorkbenchJob.status === "Revision"
                          ? "dq-status-revision"
                          : currentWorkbenchJob.status === "Completed"
                          ? "dq-status-completed"
                          : currentWorkbenchJob.status === "Waiting"
                          ? "dq-status-waiting"
                          : "dw-status-in-progress"
                      }
                    >
                      {currentWorkbenchJob.status || "In Progress"}
                    </span>
                  </div>
                  <div className="dw-details-row">
                    <span className="dw-details-label">Designer</span>
                    <span className="dw-details-val">
                      {currentWorkbenchJob.designerName || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Design Notes Card */}
              <div className="dw-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className="dw-card-title">Design Notes</h3>
                  {!isEditingNotes ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingNotes(true)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#16a34a",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingNotes(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#475569",
                        fontSize: "0.8125rem",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {isEditingNotes ? (
                  <div style={{ marginTop: "0.75rem" }}>
                    <textarea
                      value={designNotes}
                      onChange={(e) => setDesignNotes(e.target.value)}
                      rows={3}
                      className="jf-textarea"
                      style={{ width: "100%", fontSize: "0.8125rem", borderColor: "#86efac" }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                      <button
                        type="button"
                        className="dw-btn-primary-green"
                        style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}
                        onClick={() => {
                          setIsEditingNotes(false);
                          toast.success("Design notes saved!");
                        }}
                      >
                        Save Notes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="dw-notes-box">
                    {designNotes}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── CUSTOMER PROOF REVIEW (POPUP) ──────────────── */}
      {proofPopup && (() => {
        const activeProofJob = selectedJob || currentWorkbenchJob;
        const isProofJobApproved = Boolean(
          activeProofJob?.designStatus === "COMPLETED" ||
          activeProofJob?.status === "Approved" ||
          activeProofJob?.status === "Completed" ||
          activeProofJob?.stage === "COMPLETED" ||
          activeProofJob?.stage === "PRODUCTION_PLANNING" ||
          activeProofJob?.raw?.designStatus === "COMPLETED" ||
          activeProofJob?.raw?.stage === "COMPLETED" ||
          activeProofJob?.raw?.stage === "PRODUCTION_PLANNING" ||
          Boolean(activeProofJob?.isCustomerApproval || activeProofJob?.isManagerApproval)
        );

        return (
          <div className="jf-modal-overlay" onClick={() => setProofPopup(false)} style={{ overflowY: "auto", alignItems: "flex-start", padding: "1.5rem 1rem" }}>
          <div className="wp-approval-container" onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: "1rem", width: "100%" }}>
            {/* Top navigation actions */}
            <div className="wp-top-nav-bar">
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={() => setProofPopup(false)}
                >
                  <X size={14} /> Close
                </button>
              </div>

              <button
                type="button"
                className="jf-btn jf-btn-primary jf-btn-sm"
                style={{ background: "#7c3aed", borderColor: "#7c3aed" }}
                onClick={() => {
                  setProofPopup(false);
                  setStatusFilter("samples");
                  if (!isDesignerUser) setActiveView("queue");
                }}
              >
                <Clock size={14} /> View in Manager's Sample Approvals ({counts.samples})
              </button>
            </div>

            {/* Main Card */}
            <div className="wp-approval-card">
              {/* Header band */}
              <div className="wp-header-band">
                <div className="wp-header-title-box">
                  <div className="wp-header-icon-box">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <h2 className="wp-header-title">Customer WhatsApp Proof Approval</h2>
                    <p className="wp-header-subtitle">
                      {isProofJobApproved ? (
                        <>
                          Artwork proof approved • Status changed to <strong>Approved</strong> (Handed off to Production)
                        </>
                      ) : (
                        <>
                          Automated review link dispatched • Status changed to <strong>Pending Sample Approvals</strong>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="wp-status-pills">
                  <span className="wp-badge-dispatched">
                    <CheckCircle2 size={13} style={{ color: "#86efac" }} />
                    <span>WhatsApp Message Sent</span>
                  </span>
                  {isProofJobApproved ? (
                    <span
                      className="wp-badge-approved-status"
                      style={{
                        background: "#dcfce7",
                        color: "#15803d",
                        border: "1px solid #86efac",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "9999px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      <CheckCircle2 size={13} style={{ color: "#16a34a" }} />
                      <span>Approved</span>
                    </span>
                  ) : (
                    <span className="wp-badge-pending-status">
                      <Clock size={13} />
                      <span>Pending Sample Approvals</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="wp-body">
                {/* Job Metadata Grid */}
                <div className="wp-info-grid">
                  <div className="wp-info-col">
                    <span className="wp-info-label">Job Order No.</span>
                    <span className="wp-info-value" style={{ color: "#16a34a" }}>
                      {selectedJob?.jobNo || currentWorkbenchJob?.jobNo || "-"}
                    </span>
                  </div>
                  <div className="wp-info-col">
                    <span className="wp-info-label">Customer</span>
                    <span className="wp-info-value">
                      {selectedJob?.customerName || currentWorkbenchJob?.customerName || "Customer"}
                    </span>
                  </div>
                  <div className="wp-info-col">
                    <span className="wp-info-label">Customer Mobile</span>
                    <span className="wp-info-value">
                      {selectedJob?.customerPhone ||
                        selectedJob?.raw?.customerPhone ||
                        selectedJob?.raw?.customerSnapshot?.phone ||
                        "-"}
                    </span>
                  </div>
                  <div className="wp-info-col">
                    <span className="wp-info-label">Job Item / Title</span>
                    <span className="wp-info-value">
                      {selectedJob?.title || selectedJob?.jobItem || currentWorkbenchJob?.title || "Custom Print Order"}
                    </span>
                  </div>
                  <div className="wp-info-col">
                    <span className="wp-info-label">Assigned Designer</span>
                    <span className="wp-info-value">
                      {selectedJob?.designerName || currentWorkbenchJob?.designerName || "Assigned Designer"}
                    </span>
                  </div>
                  <div className="wp-info-col">
                    <span className="wp-info-label">Quantity & Size</span>
                    <span className="wp-info-value">
                      {selectedJob?.quantity || currentWorkbenchJob?.quantity || 500} pcs •{" "}
                      {selectedJob?.size || currentWorkbenchJob?.size || "Standard"}
                    </span>
                  </div>
                </div>

                {/* WhatsApp Link Box */}
                <div className="wp-link-box">
                  <div className="wp-link-header">
                    <div className="wp-link-header-left">
                      <MessageCircle size={16} />
                      <span>WhatsApp Approval Link (Customer View)</span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 600 }}>
                      Active 48h Token Link
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8125rem", color: "#166534" }}>
                    The client receives this secure link on their WhatsApp chat. They can review the design proof and approve or request revisions instantly.
                  </p>
                  <div className="wp-link-input-group">
                    <span className="wp-link-text">
                      {selectedJob?.approvalUrl ||
                        `http://localhost:3000/approve-design?jobId=${selectedJob?._id || currentWorkbenchJob?._id || "demo"}`}
                    </span>
                    <button
                      type="button"
                      className="wp-btn-copy"
                      onClick={() => {
                        const link =
                          selectedJob?.approvalUrl ||
                          `http://localhost:3000/approve-design?jobId=${selectedJob?._id || currentWorkbenchJob?._id || "demo"}`;
                        navigator.clipboard?.writeText(link);
                        toast.success("WhatsApp approval link copied to clipboard!");
                      }}
                      title="Copy approval link"
                    >
                      <Copy size={13} /> Copy Link
                    </button>
                    <a
                      href={
                        selectedJob?.approvalUrl ||
                        `http://localhost:3000/approve-design?jobId=${selectedJob?._id || currentWorkbenchJob?._id || "demo"}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="wp-btn-external"
                      title="Open customer approval page in new tab"
                    >
                      <ExternalLink size={13} /> Open
                    </a>
                  </div>
                </div>

                {/* Proof Artwork Preview Card */}
                <div className="wp-proof-preview-card">
                  <img
                    src={
                      selectedJob?.designProofUrl ||
                      selectedJob?.proofUrl ||
                      uploadedSampleUrl ||
                      currentWorkbenchJob?.raw?.designProofUrl ||
                      NO_PROOF_IMG
                    }
                    alt="Proof preview"
                    className="wp-proof-thumb"
                  />
                  <div className="wp-proof-details">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
                        Submitted Artwork Sample Proof
                      </span>
                      <span
                        style={{
                          background: "#dcfce7",
                          color: "#15803d",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "9999px",
                        }}
                      >
                        Proof v1.0
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.8125rem", color: "#475569" }}>
                      Uploaded high-resolution sample file ready for customer evaluation and manager sign-off.
                    </p>
                    <div>
                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary jf-btn-sm"
                        onClick={() =>
                          setPreviewSampleProofUrl(
                            selectedJob?.designProofUrl ||
                              selectedJob?.proofUrl ||
                              uploadedSampleUrl ||
                              currentWorkbenchJob?.raw?.designProofUrl ||
                              NO_PROOF_IMG
                          )
                        }
                      >
                        <Eye size={13} /> Preview Full Artwork
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
                    Proof approval (branch manager):
                  </div>
                  {isProofJobApproved ? (
                    <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
                      <button
                        type="button"
                        className="jf-btn"
                        disabled
                        style={{
                          flex: 1,
                          background: "#15803d",
                          color: "#ffffff",
                          borderColor: "#15803d",
                          padding: "0.65rem 1rem",
                          cursor: "not-allowed",
                          opacity: 0.95,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                        }}
                      >
                        <CheckCircle2 size={16} /> Approved
                      </button>
                    </div>
                  ) : (
                    <div className="wp-actions-grid">
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary"
                        style={{ background: "#15803d", borderColor: "#15803d", padding: "0.65rem 1rem" }}
                        disabled={approvingProof || !isManagerOrAdmin}
                        onClick={handleCustomerApprove}
                      >
                        <Check size={16} /> {approvingProof ? "Processing..." : isManagerOrAdmin ? "Approve Proof (Manager)" : "Waiting for manager approval"}
                      </button>

                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary"
                        style={{ color: "#dc2626", borderColor: "#fecaca", padding: "0.65rem 1rem" }}
                        disabled={!isManagerOrAdmin}
                        onClick={handleCustomerReject}
                      >
                        <RotateCcw size={16} /> Customer Requests Revision
                      </button>
                    </div>
                  )}

                  <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
                    <button
                      type="button"
                      className="jf-btn jf-btn-secondary"
                      style={{
                        background: "#f8fafc",
                        borderColor: "#cbd5e1",
                        color: "#334155",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                      }}
                      onClick={() => {
                        setStatusFilter("samples");
                        setActiveView("queue");
                      }}
                    >
                      <span>Go to Manager's Sample Approvals Table</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        );
      })()}

      {/* ──────────────── DESIGN JOB DETAILS MODAL (POP-UP - IMAGE 2) ──────────────── */}
      <AssignDesignerModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedJob(null);
          clearPreselectedJobParam();
        }}
        job={selectedJob}
        designerPool={designers}
        nextDesignerId={nextDesignerId}
        onAssigned={handleAssignmentCompleted}
      />

      {/* ──────────────── VIEW DESIGN JOB MODAL (JOB DETAILS, REQUIREMENTS, CURRENT STATUS) ──────────────── */}
      <ViewDesignJobModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingJob(null);
          setIsViewingOnly(false);
        }}
        job={viewingJob}
        isDesignerUser={isDesignerUser}
        isViewingOnly={isViewingOnly || (isDesignerUser && viewingJob?.isRejected)}
        currentDesignerName={
          activeSelectedDesigner?.name ||
          currentUser?.name ||
          storedUser?.name ||
          localStorage.getItem("userName") ||
          ""
        }
        onOpenWorkbench={
          isDesignerUser
            ? (j) => {
                setSelectedJob(j);
                setActiveView("workbench");
              }
            : null
        }
        onReassign={(j) => {
          setSelectedJob(j);
          setIsAssignModalOpen(true);
        }}
      />

      {/* ──────────────── REJECT MODAL ──────────────── */}
      <RejectDesignModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        job={selectedJob}
        onConfirmReject={handleRejectAssignment}
      />

      {/* ──────────────── CUSTOMER FILE PREVIEW MODAL ──────────────── */}
      {previewModalFile && (
        <div className="dq-modal-overlay" onClick={() => setPreviewModalFile(null)}>
          <div
            className="dq-modal-drawer"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dq-modal-header">
              <h3 className="dq-modal-title">Preview: {previewModalFile.name}</h3>
              <button
                type="button"
                className="jf-btn-icon"
                onClick={() => setPreviewModalFile(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="dq-modal-body" style={{ textAlign: "center", padding: "1.5rem" }}>
              {previewModalFile.type === "image" ? (
                <img
                  src={previewModalFile.url}
                  alt={previewModalFile.name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "380px",
                    borderRadius: "8px",
                    objectFit: "contain",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
              ) : (
                <div
                  style={{
                    padding: "2.5rem 1.5rem",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  <FileText size={48} style={{ color: "#dc2626", margin: "0 auto 1rem auto" }} />
                  <p style={{ margin: "0 0 0.5rem 0", fontWeight: 700, fontSize: "1rem" }}>
                    {previewModalFile.name}
                  </p>
                  <p style={{ color: "#475569", fontSize: "0.85rem", margin: 0 }}>
                    Size: {previewModalFile.size} • Customer Reference Document
                  </p>
                </div>
              )}
            </div>
            <div
              style={{
                padding: "1rem 1.25rem",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                background: "#f8fafc",
              }}
            >
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setPreviewModalFile(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="dw-btn-primary-green"
                onClick={() => handleDownloadFile(previewModalFile)}
              >
                <Download size={14} /> Download File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── SAMPLE APPROVAL / REJECTION DECISION MODAL ──────────────── */}
      {isSampleDecisionModalOpen && selectedSampleForDecision && (
        <div className="dq-modal-overlay" onClick={() => setIsSampleDecisionModalOpen(false)}>
          <div
            className="dq-modal-drawer"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dq-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: decisionMode === "approve" ? "#ecfdf5" : "#fff1f2",
                    color: decisionMode === "approve" ? "#059669" : "#e11d48",
                  }}
                >
                  {decisionMode === "approve" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                </div>
                <div>
                  <h3 className="dq-modal-title" style={{ margin: 0, fontSize: "1.05rem" }}>
                    {decisionMode === "approve" ? "Accept & Approve Sample Design" : "Reject Sample / Request Revision"}
                  </h3>
                  <div style={{ margin: "0.15rem 0 0 0", fontSize: "0.78125rem", color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>Job Order: <strong style={{ color: "#1e293b" }}>{selectedSampleForDecision.jobNo}</strong></span>
                    <JobTypeBadge jobType={selectedSampleForDecision.jobType || selectedSampleForDecision.jobOrder?.jobType} size="sm" />
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="jf-btn-icon"
                onClick={() => setIsSampleDecisionModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dq-modal-body" style={{ padding: "1.25rem 1.5rem" }}>
              {(() => {
                const rawType = String(selectedSampleForDecision.jobType || selectedSampleForDecision.jobOrder?.jobType || "").toUpperCase();
                const isDesignOnly = rawType.includes("DESIGN") && !rawType.includes("PRINT");
                if (!isDesignOnly) return null;
                return (
                  <div
                    style={{
                      marginBottom: "1rem",
                      padding: "0.75rem 1rem",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>🎯</span>
                    <div>
                      <div style={{ fontWeight: 700, color: "#1e40af", fontSize: "0.85rem" }}>
                        Design Only Workflow
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#2563eb" }}>
                        Approving this sample will <strong>close and complete this job order</strong> immediately (bypassing production planning and printing).
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Sample Overview Card */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "0.9rem 1.1rem",
                  marginBottom: "1.25rem",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.65rem",
                  fontSize: "0.8125rem",
                }}
              >
                <div>
                  <span style={{ color: "#475569", display: "block", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 600 }}>Customer</span>
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>{selectedSampleForDecision.customerName}</span>
                </div>
                <div>
                  <span style={{ color: "#475569", display: "block", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 600 }}>Designer</span>
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>{selectedSampleForDecision.designerName}</span>
                </div>
                <div>
                  <span style={{ color: "#475569", display: "block", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 600 }}>Job Item</span>
                  <span style={{ color: "#334155" }}>{selectedSampleForDecision.jobItem}</span>
                </div>
                <div>
                  <span style={{ color: "#475569", display: "block", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 600 }}>Sample Proof</span>
                  <button
                    type="button"
                    onClick={() => setPreviewSampleProofUrl(selectedSampleForDecision.fileUrl)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#059669",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <Eye size={12} /> Preview Proof (v{selectedSampleForDecision.versionNo || 1}.0)
                  </button>
                </div>
              </div>

              {(() => {
                const isSampleAlreadyApproved = Boolean(
                  selectedSampleForDecision &&
                  (selectedSampleForDecision.status === "APPROVED" ||
                   selectedSampleForDecision.isApproved ||
                   selectedSampleForDecision.isConfirmed ||
                   selectedSampleForDecision.customerFeedback?.toLowerCase().includes("approved") ||
                   selectedSampleForDecision.jobOrder?.designStatus === "COMPLETED" ||
                   selectedSampleForDecision.jobOrder?.status === "Completed" ||
                   selectedSampleForDecision.jobOrder?.status === "Approved")
                );

                return (
                  <>
                    {decisionMode === "approve" ? (
                      <div>
                        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, marginBottom: "0.5rem", color: "#1e293b" }}>
                          Approval Authorization
                        </label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1.1rem" }}>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "0.65rem",
                              padding: "0.75rem 0.95rem",
                              border: decisionApprovalType === "customer" ? "2px solid #059669" : "1px solid #e2e8f0",
                              borderRadius: "10px",
                              background: decisionApprovalType === "customer" ? "#ecfdf5" : "#ffffff",
                              cursor: isSampleAlreadyApproved ? "not-allowed" : "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name="approvalType"
                              value="customer"
                              disabled={isSampleAlreadyApproved}
                              checked={decisionApprovalType === "customer"}
                              onChange={() => !isSampleAlreadyApproved && setDecisionApprovalType("customer")}
                              style={{ marginTop: "0.2rem", accentColor: "#059669", cursor: isSampleAlreadyApproved ? "not-allowed" : "pointer" }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, color: "#065f46", fontSize: "0.875rem" }}>
                                Approved by Customer
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#047857" }}>
                                Customer directly approved sample artwork via WhatsApp, email, or in-person.
                              </div>
                            </div>
                          </label>

                          <label
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "0.65rem",
                              padding: "0.75rem 0.95rem",
                              border: decisionApprovalType === "manager" ? "2px solid #2563eb" : "1px solid #e2e8f0",
                              borderRadius: "10px",
                              background: decisionApprovalType === "manager" ? "#eff6ff" : "#ffffff",
                              cursor: isSampleAlreadyApproved ? "not-allowed" : "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name="approvalType"
                              value="manager"
                              disabled={isSampleAlreadyApproved}
                              checked={decisionApprovalType === "manager"}
                              onChange={() => !isSampleAlreadyApproved && setDecisionApprovalType("manager")}
                              style={{ marginTop: "0.2rem", accentColor: "#2563eb", cursor: isSampleAlreadyApproved ? "not-allowed" : "pointer" }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, color: "#1e40af", fontSize: "0.875rem" }}>
                                Approved by Manager
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#1d4ed8" }}>
                                Manager verified layout specifications and approved on store behalf.
                              </div>
                            </div>
                          </label>
                        </div>

                        {decisionApprovalType === "customer" && (
                          <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.35rem", color: "#1e293b" }}>
                              Customer Name <span style={{ color: "#dc2626" }}>*</span>
                            </label>
                            <input
                              type="text"
                              className="jf-input"
                              disabled={isSampleAlreadyApproved}
                              value={decisionCustomerName}
                              onChange={(e) => setDecisionCustomerName(e.target.value)}
                              placeholder="Enter customer name who approved"
                              style={{
                                width: "100%",
                                background: isSampleAlreadyApproved ? "#f8fafc" : "#ffffff",
                                cursor: isSampleAlreadyApproved ? "not-allowed" : "text",
                              }}
                            />
                            <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                              <CheckCircle2 size={12} />
                              <span>
                                Status will display: <strong>Approved by Customer ({decisionCustomerName.trim() || selectedSampleForDecision.customerName})</strong>
                              </span>
                            </div>
                          </div>
                        )}

                        {decisionApprovalType === "manager" && (
                          <div style={{ marginBottom: "1rem" }}>
                            <div
                              style={{
                                fontSize: "0.78125rem",
                                color: "#1d4ed8",
                                background: "#eff6ff",
                                border: "1px solid #bfdbfe",
                                padding: "0.6rem 0.85rem",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                              }}
                            >
                              <CheckCircle2 size={14} color="#2563eb" />
                              <span>
                                Status will display: <strong>Approved by Manager ({storedUser?.name || "Manager"})</strong>
                              </span>
                            </div>
                          </div>
                        )}

                        <div>
                          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.35rem", color: "#1e293b" }}>
                            Approval Notes / Confirmation Channel (Optional)
                          </label>
                          <textarea
                            className="jf-textarea"
                            rows={2}
                            disabled={isSampleAlreadyApproved}
                            value={decisionNotes}
                            onChange={(e) => setDecisionNotes(e.target.value)}
                            placeholder="e.g. Proof approved by customer via WhatsApp at 11:30 AM"
                            style={{
                              width: "100%",
                              background: isSampleAlreadyApproved ? "#f8fafc" : "#ffffff",
                              cursor: isSampleAlreadyApproved ? "not-allowed" : "text",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.35rem", color: "#1e293b" }}>
                          Rejection Reason & Required Changes <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <textarea
                          className="jf-textarea"
                          rows={4}
                          value={decisionNotes}
                          onChange={(e) => setDecisionNotes(e.target.value)}
                          placeholder="Specify the revisions requested by customer or manager (e.g., logo alignment, color adjustments, typo correction)..."
                          style={{ width: "100%" }}
                          required
                        />
                        <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.35rem" }}>
                          This will mark the sample as <strong>Revision Required</strong> and notify the designer.
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div
              style={{
                padding: "1rem 1.25rem",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                background: "#f8fafc",
              }}
            >
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setIsSampleDecisionModalOpen(false)}
                disabled={submittingSampleDecision}
              >
                {selectedSampleForDecision &&
                (selectedSampleForDecision.status === "APPROVED" ||
                 selectedSampleForDecision.isApproved ||
                 selectedSampleForDecision.isConfirmed ||
                 selectedSampleForDecision.customerFeedback?.toLowerCase().includes("approved") ||
                 selectedSampleForDecision.jobOrder?.designStatus === "COMPLETED" ||
                 selectedSampleForDecision.jobOrder?.status === "Completed" ||
                 selectedSampleForDecision.jobOrder?.status === "Approved")
                  ? "Close"
                  : "Cancel"}
              </button>
              {decisionMode === "approve" ? (
                selectedSampleForDecision &&
                (selectedSampleForDecision.status === "APPROVED" ||
                 selectedSampleForDecision.isApproved ||
                 selectedSampleForDecision.isConfirmed ||
                 selectedSampleForDecision.customerFeedback?.toLowerCase().includes("approved") ||
                 selectedSampleForDecision.jobOrder?.designStatus === "COMPLETED" ||
                 selectedSampleForDecision.jobOrder?.status === "Completed" ||
                 selectedSampleForDecision.jobOrder?.status === "Approved") ? (
                  <button
                    type="button"
                    className="dw-btn-primary-green"
                    disabled
                    style={{
                      background: "#15803d",
                      borderColor: "#15803d",
                      cursor: "not-allowed",
                      opacity: 0.95,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <CheckCheck size={14} /> Confirmed
                  </button>
                ) : (
                  <button
                    type="button"
                    className="dw-btn-primary-green"
                    onClick={handleConfirmSampleDecision}
                    disabled={submittingSampleDecision || (decisionApprovalType === "customer" && !decisionCustomerName.trim())}
                  >
                    {submittingSampleDecision ? "Approving..." : (
                      <>
                        <Check size={14} /> {(() => {
                          const rawType = String(selectedSampleForDecision?.jobType || selectedSampleForDecision?.jobOrder?.jobType || "").toUpperCase();
                          return rawType.includes("DESIGN") && !rawType.includes("PRINT")
                            ? "Approve Sample (Send to Invoice to Collect Balance) →"
                            : "Confirm & Approve Sample";
                        })()}
                      </>
                    )}
                  </button>
                )
              ) : (
                <button
                  type="button"
                  style={{
                    background: "#dc2626",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.5rem 1.1rem",
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                  onClick={handleConfirmSampleDecision}
                  disabled={submittingSampleDecision || !decisionNotes.trim()}
                >
                  {submittingSampleDecision ? "Submitting..." : (
                    <>
                      <X size={14} /> Return for Revision
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── ARTWORK SAMPLE PROOF PREVIEW MODAL ──────────────── */}
      {previewSampleProofUrl && (
        <div className="dq-modal-overlay" onClick={() => setPreviewSampleProofUrl(null)}>
          <div
            className="dq-modal-drawer"
            style={{ maxWidth: "680px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dq-modal-header">
              <h3 className="dq-modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Eye size={16} /> Artwork Sample Proof
              </h3>
              <button
                type="button"
                className="jf-btn-icon"
                onClick={() => setPreviewSampleProofUrl(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="dq-modal-body" style={{ textAlign: "center", padding: "1.25rem" }}>
              {previewSampleProofUrl.endsWith(".pdf") ? (
                <iframe
                  src={previewSampleProofUrl}
                  title="Artwork Proof PDF"
                  style={{ width: "100%", height: "450px", border: "none", borderRadius: "8px" }}
                />
              ) : (
                <img
                  src={previewSampleProofUrl}
                  alt="Sample Artwork Proof"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "450px",
                    borderRadius: "10px",
                    objectFit: "contain",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                  }}
                />
              )}
            </div>
            <div
              style={{
                padding: "0.85rem 1.25rem",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <a
                href={previewSampleProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.8125rem",
                  color: "#059669",
                  textDecoration: "none",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <ExternalLink size={14} /> Open in new tab
              </a>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setPreviewSampleProofUrl(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </JobFlowLayout>
  );
};

export default DesignWorkflowPage;
