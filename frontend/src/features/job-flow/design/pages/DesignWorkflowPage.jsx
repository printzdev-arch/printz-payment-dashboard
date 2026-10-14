import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import RejectDesignModal from "../components/RejectDesignModal";
import AssignDesignerModal from "../components/AssignDesignerModal";
import ViewDesignJobModal from "../components/ViewDesignJobModal";
import jobFlowApi from "../api/designApi";
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

// Default designers fallback matching the 5 active staff
const INITIAL_DESIGNERS = [
  { _id: "des-01", name: "Ali Hassan", email: "ali.hassan@printz.com", currentLoad: 0, openJobs: 0, maxLoad: 5, isActive: true },
  { _id: "des-02", name: "Siti Rahman", email: "siti.rahman@printz.com", currentLoad: 0, openJobs: 0, maxLoad: 5, isActive: true },
  { _id: "des-03", name: "Kumar Anil", email: "kumar.anil@printz.com", currentLoad: 0, openJobs: 0, maxLoad: 5, isActive: true },
  { _id: "des-04", name: "John Lee", email: "john.lee@printz.com", currentLoad: 0, openJobs: 0, maxLoad: 5, isActive: true },
  { _id: "des-05", name: "Nur Aisyah", email: "nur.aisyah@printz.com", currentLoad: 0, openJobs: 0, maxLoad: 5, isActive: true },
];

export const DesignWorkflowPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");
  const urlView = searchParams.get("view");
  const urlTab = searchParams.get("tab") || searchParams.get("status");

  const isWorkbenchRoute =
    location.pathname.includes("/workbench") ||
    location.pathname.includes("/workspace") ||
    urlView === "workbench" ||
    urlView === "workspace";

  // Main navigation view
  const [activeView, setActiveView] = useState(
    isWorkbenchRoute
      ? "workbench"
      : urlView === "queue"
        ? "queue"
        : urlView === "my-jobs"
          ? "my-jobs"
          : urlView === "customer-proof"
            ? "customer-proof"
            : "queue"
  );

  useEffect(() => {
    if (isWorkbenchRoute) {
      setActiveView("workbench");
    } else if (urlView === "queue") {
      setActiveView("queue");
    } else if (urlView === "my-jobs") {
      setActiveView("my-jobs");
    } else if (urlView === "customer-proof") {
      setActiveView("customer-proof");
    }
  }, [urlView, location.pathname, isWorkbenchRoute]);

  // Status Filter Pill
  const [statusFilter, setStatusFilter] = useState(urlTab || "all");
  const [showFilterBar, setShowFilterBar] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection & Modal states
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState(null);

  // Design Workbench states
  const [uploadedSampleUrl, setUploadedSampleUrl] = useState(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [designNotes, setDesignNotes] = useState("Use company colors and add contact details.");
  const [previewModalFile, setPreviewModalFile] = useState(null);

  const customerFiles = [
    {
      id: "ref-1",
      name: "Reference_Design.jpg",
      size: "2.4 MB",
      type: "image",
      url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "ref-2",
      name: "Logo.png",
      size: "512 KB",
      type: "image",
      url: "/logo.png",
    },
    {
      id: "ref-3",
      name: "Content_Details.pdf",
      size: "1.1 MB",
      type: "pdf",
      url: "#",
    },
  ];

  // Current active job for workbench (falling back to ABC Marketing Flyer if queue is empty or no selection yet)
  const currentWorkbenchJob = useMemo(() => {
    if (selectedJob) return selectedJob;
    if (jobs.length > 0) {
      const inProg = jobs.find((j) => j.status === "In Progress" || j.status === "Assigned");
      return inProg || jobs[0];
    }
    return {
      _id: "demo-workbench-001",
      jobNo: "JO-20250810-001",
      customerName: "ABC Marketing",
      title: "Flyer - A5",
      size: "A5 (148 × 210 mm)",
      quantity: 500,
      assignedDate: "10 Aug 2025",
      targetDate: "12 Aug 2025",
      slaDue: "12 Aug 2025",
      priority: "High",
      status: "In Progress",
      designerName: "Ahmed Raza",
      specialInstructions: "Use company colors and add contact details.",
    };
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
    link.href = uploadedSampleUrl || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000";
    link.download = `${currentWorkbenchJob.jobNo || "JO-20250810-001"}_Proof.jpg`;
    link.target = "_blank";
    link.click();
    toast.success("Download started!");
  };

  const handleSubmitForReview = async () => {
    toast.success("Design submitted for review successfully!");
    setActiveView("customer-proof");
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
  const [designers, setDesigners] = useState(INITIAL_DESIGNERS);
  const [nextDesignerId, setNextDesignerId] = useState(null);
  const [isAddDesignerOpen, setIsAddDesignerOpen] = useState(false);
  const [newDesignerName, setNewDesignerName] = useState("");
  const [newDesignerEmail, setNewDesignerEmail] = useState("");
  const [newDesignerMaxLoad, setNewDesignerMaxLoad] = useState(5);
  const [addingDesigner, setAddingDesigner] = useState(false);
  const [editingDesignerId, setEditingDesignerId] = useState(null);
  const [editingDesignerLoad, setEditingDesignerLoad] = useState(5);
  const [savingDesignerId, setSavingDesignerId] = useState(null);

  // Sub-workspace states (for My Jobs, Canvas & Customer Proof)
  const [selectedDesignerProfile, setSelectedDesignerProfile] = useState("all");
  const [designerTab, setDesignerTab] = useState("all");
  const [approvedJobIds, setApprovedJobIds] = useState(new Set());
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
      // 1. Fetch live queue jobs directly from MongoDB
      const res = await jobFlowApi.getDesignQueue();
      const rawQueue = res?.data || res?.items || res || [];
      const queueArray = Array.isArray(rawQueue) ? rawQueue : [];

      const mapped = queueArray.map((single) => {
        const designer =
          single.designerId?.name ||
          single.designerName ||
          (single.designerId ? "Assigned Designer" : "- Unassigned");

        const stage = single.currentStage || single.stage || "DESIGN_QUEUE";
        let statusDisplay = "Waiting";
        if (stage === "DESIGN_QUEUE") statusDisplay = "Waiting";
        else if (stage === "DESIGN_ASSIGNED") statusDisplay = "Assigned";
        else if (stage === "DESIGN_IN_PROGRESS") statusDisplay = "In Progress";
        else if (stage === "SAMPLE_APPROVAL" || stage === "CUSTOMER_PROOF") statusDisplay = "Proof Sent";
        else if (stage === "REVISION") statusDisplay = "Revision";
        else if (stage === "COMPLETED" || stage === "PRODUCTION_PLANNING") statusDisplay = "Completed";

        const rawPriority = (single.priority || "NORMAL").toUpperCase();
        let priorityDisplay = "Normal";
        if (rawPriority === "HIGH" || rawPriority === "URGENT") priorityDisplay = "High";
        else if (rawPriority === "LOW") priorityDisplay = "Low";

        return {
          _id: single._id || single.id,
          jobNo: single.jobNo || single.orderNumber || `JO-${String(single._id).slice(-6)}`,
          customerName: single.customerName || single.customerSnapshot?.name || "Direct Customer",
          title: single.title || single.items?.[0]?.itemName || "Custom Print Order",
          priority: priorityDisplay,
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
          slaDue: single.dueDate ? new Date(single.dueDate).toLocaleDateString() : "Pending",
          quantity: single.quantity || single.items?.[0]?.quantity || 1,
          size: single.specs?.size || single.items?.[0]?.specifications?.size || "Standard",
          color: single.specs?.color || single.items?.[0]?.specifications?.color || "4C / 0C",
          paperType: single.specs?.paperType || single.items?.[0]?.specifications?.paperType || "Standard Paper",
          specialInstructions: single.remarks || single.customerRequirements || "",
          raw: single,
        };
      });

      setJobs(mapped);

      // Preselected job from URL query
      if (preselectedJobId) {
        const match = mapped.find((j) => String(j._id) === String(preselectedJobId) || j.jobNo === preselectedJobId);
        if (match) {
          setSelectedJob(match);
          setIsAssignModalOpen(true);
        }
      }

      // 2. Fetch live designer pool from MongoDB
      try {
        const poolRes = await jobFlowApi.getDesignerPool();
        const rawDesigners =
          poolRes?.designers ||
          poolRes?.data?.designers ||
          (Array.isArray(poolRes?.data) ? poolRes.data : null) ||
          (Array.isArray(poolRes) ? poolRes : []);
        if (Array.isArray(rawDesigners) && rawDesigners.length > 0) {
          setDesigners(rawDesigners);
          if (rawDesigners[0]?.maxLoad) {
            setGlobalMaxLoad(rawDesigners[0].maxLoad);
          }
        }
        if (poolRes?.nextDesigner) {
          setNextDesignerId(poolRes.nextDesigner);
        }
      } catch (poolErr) {
        console.warn("Could not load designer pool:", poolErr);
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

  // Tab counts based on current jobs matching user tabs: all, pending, assigned, redesign/revision, completed
  const counts = useMemo(() => {
    return {
      all: jobs.length,
      pending: jobs.filter(
        (j) =>
          j.status === "Waiting" ||
          !j.designerName ||
          j.designerName === "- Unassigned" ||
          j.stage === "DESIGN_QUEUE"
      ).length,
      assigned: jobs.filter(
        (j) =>
          (j.status === "Assigned" || j.status === "In Progress" || j.status === "Proof Sent") &&
          j.designerName &&
          j.designerName !== "- Unassigned"
      ).length,
      redesign: jobs.filter(
        (j) => j.status === "Revision" || j.stage === "REVISION"
      ).length,
      completed: jobs.filter(
        (j) =>
          j.status === "Completed" ||
          j.stage === "COMPLETED" ||
          j.stage === "PRODUCTION_PLANNING"
      ).length,
    };
  }, [jobs]);

  // All active jobs for Designer My Jobs view
  const activeMyJobs = useMemo(() => {
    return jobs.filter(
      (j) =>
        j.status === "Assigned" ||
        j.status === "In Progress" ||
        j.status === "Waiting" ||
        j.stage === "DESIGN_ASSIGNED" ||
        j.stage === "DESIGN_IN_PROGRESS" ||
        j.stage === "DESIGN_QUEUE"
    );
  }, [jobs]);

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

  // Active selected designer object (null when "all")
  const activeSelectedDesigner = useMemo(() => {
    if (selectedDesignerProfile === "all") return null;
    return (
      designers.find((d) => String(d._id || d.userId || d.employeeId) === String(selectedDesignerProfile)) ||
      designers.find((d) => (d.name || "").toLowerCase() === String(selectedDesignerProfile).toLowerCase()) ||
      null
    );
  }, [selectedDesignerProfile, designers]);

  // Filtered jobs for current profile view in My Jobs
  const displayedMyJobs = useMemo(() => {
    if (selectedDesignerProfile === "all") {
      return activeMyJobs;
    }
    const currentDes = activeSelectedDesigner;
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
  }, [activeMyJobs, selectedDesignerProfile, activeSelectedDesigner]);

  // Filtered jobs based on active tab
  const filteredJobs = useMemo(() => {
    if (statusFilter === "all") return jobs;
    if (statusFilter === "pending")
      return jobs.filter(
        (j) =>
          j.status === "Waiting" ||
          !j.designerName ||
          j.designerName === "- Unassigned" ||
          j.stage === "DESIGN_QUEUE"
      );
    if (statusFilter === "assigned")
      return jobs.filter(
        (j) =>
          (j.status === "Assigned" || j.status === "In Progress" || j.status === "Proof Sent") &&
          j.designerName &&
          j.designerName !== "- Unassigned"
      );
    if (statusFilter === "redesign" || statusFilter === "revision")
      return jobs.filter((j) => j.status === "Revision" || j.stage === "REVISION");
    if (statusFilter === "completed")
      return jobs.filter(
        (j) =>
          j.status === "Completed" ||
          j.stage === "COMPLETED" ||
          j.stage === "PRODUCTION_PLANNING"
      );
    return jobs;
  }, [jobs, statusFilter]);

  // Sliced pagination
  const totalPages = Math.ceil(filteredJobs.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredJobs.length);
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  // Handle Select All Checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRowIds(new Set(filteredJobs.map((j) => j._id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Allocate Now handler (batch Round Robin)
  const handleAllocateNow = async () => {
    setLoading(true);
    try {
      if (selectedRowIds.size > 0) {
        const selectedList = jobs.filter((j) => selectedRowIds.has(j._id));
        let count = 0;
        for (const j of selectedList) {
          try {
            await jobFlowApi.autoAssignDesigner(j._id);
            count++;
          } catch (e) {
            console.error(`Auto-assign failed for ${j.jobNo}:`, e);
          }
        }
        toast.success(`Allocated ${count} selected job(s) via Round Robin!`);
        setSelectedRowIds(new Set());
      } else {
        const res = await jobFlowApi.autoAssignQueue();
        const count = Array.isArray(res?.data) ? res.data.length : res?.length || 0;
        toast.success(`Round Robin allocated ${count} pending queue job(s)!`);
      }
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

  // Add designer to pool
  const handleAddDesigner = async (e) => {
    e.preventDefault();
    if (!newDesignerName.trim()) {
      toast.error("Designer name is required");
      return;
    }
    setAddingDesigner(true);
    try {
      await jobFlowApi.addDesignerToPool({
        name: newDesignerName.trim(),
        email: newDesignerEmail.trim() || undefined,
        maxLoad: Number(newDesignerMaxLoad) || 5,
      });
      toast.success(`Designer ${newDesignerName} added successfully!`);
      setIsAddDesignerOpen(false);
      setNewDesignerName("");
      setNewDesignerEmail("");
      setNewDesignerMaxLoad(5);
      await fetchDesignData();
    } catch (err) {
      console.error("Failed to add designer:", err);
      toast.error(err.response?.data?.message || "Failed to add designer");
    } finally {
      setAddingDesigner(false);
    }
  };

  // Update specific designer limit
  const handleUpdateDesignerLimit = async (desId, newLimit) => {
    setSavingDesignerId(desId);
    try {
      await jobFlowApi.updateDesignerInPool(desId, { maxLoad: Number(newLimit) });
      toast.success("Designer workload limit updated!");
      setDesigners((prev) =>
        prev.map((d) =>
          String(d._id || d.userId || d.employeeId) === String(desId)
            ? { ...d, maxLoad: Number(newLimit) }
            : d
        )
      );
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
    setApprovedJobIds((prev) => new Set(prev).add(jobIdStr));
    setJobs((prev) =>
      prev.map((j) => (String(j._id || j.id) === jobIdStr ? { ...j, status: "In Progress" } : j))
    );
    try {
      await jobFlowApi.acceptDesignAssignment(job._id || job.id);
      toast.success(`Design assignment for ${job.jobNo} accepted!`);
    } catch {
      toast.info(`Design assignment for ${job.jobNo} marked accepted.`);
    }
  };

  const handleRejectAssignment = async (jobId, reason) => {
    try {
      await jobFlowApi.rejectDesignAssignment(jobId, reason);
      toast.success("Design rejected. Returned to queue.");
      fetchDesignData();
    } catch {
      toast.error("Failed to reject assignment");
    }
  };

  const handleCustomerApprove = async () => {
    const targetJob = currentWorkbenchJob || selectedJob;
    const jobId = targetJob?._id || targetJob?.id;
    setApprovingProof(true);
    try {
      if (jobId) {
        await jobFlowApi.approveArtworkProof(jobId, {
          notes: "Customer approved artwork proof",
          customerFeedback: "Approved via WhatsApp / Design Workflow",
        });
      }
      toast.success("Customer approved artwork! Proceeding to Production Planning.");
      navigate(`/jobflow/production?tab=orders&jobId=${jobId || ""}`);
    } catch (err) {
      console.error("Proof approval error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to process customer approval");
    } finally {
      setApprovingProof(false);
    }
  };

  return (
    <JobFlowLayout
      title="PrintZ Design Queue"
      subtitle="Round Robin Designer Allocation & Workflow Control"
      actions={
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className={`jf-btn ${activeView === "queue" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveView("queue")}
          >
            Design Queue (Supervisor)
          </button>
          <button
            type="button"
            className={`jf-btn ${activeView === "workbench" || activeView === "workspace"
                ? "dw-btn-nav-active"
                : "jf-btn-secondary"
              } jf-btn-sm`}
            onClick={() => {
              if (!selectedJob && jobs.length > 0) setSelectedJob(jobs[0]);
              setActiveView("workbench");
            }}
          >
            <Palette size={14} /> Design Workbench
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
            className={`jf-btn ${activeView === "customer-proof" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveView("customer-proof")}
          >
            <MessageCircle size={14} /> WhatsApp Proof Review
          </button>
        </div>
      }
    >
      {/* ──────────────── SCREEN 1: DESIGN QUEUE (SUPERVISOR) ──────────────── */}
      {activeView === "queue" && (
        <>
          {/* Top Header & Round Robin Setting */}
          <div className="dq-top-header-wrapper">
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
                    style={{ cursor: "pointer", color: "#64748b" }}
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
          </div>

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
                  <p className="dq-table-toolbar-subtitle">
                    These approved job orders are ready to be assigned to a designer using the round robin method.
                  </p>
                </div>
              </div>

              <div className="dq-table-toolbar-right">
                <button
                  type="button"
                  className="dq-btn-allocate-now"
                  onClick={handleAllocateNow}
                  disabled={loading}
                  title="Assign eligible jobs using Round Robin"
                >
                  <RefreshCw size={14} className={loading ? "jf-spin" : ""} />
                  <span>Allocate Now</span>
                </button>
                <button
                  type="button"
                  className="dq-btn-toolbar"
                  onClick={() => {
                    fetchDesignData();
                    toast.info("Refreshed latest design jobs from database");
                  }}
                  disabled={loading}
                  title="Refresh queue"
                >
                  <RotateCcw size={14} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  className={`dq-btn-toolbar ${showFilterBar ? "active" : ""}`}
                  onClick={() => setShowFilterBar(!showFilterBar)}
                  title="Toggle filters"
                >
                  <Filter size={14} />
                  <span>Filter</span>
                </button>
              </div>
            </div>

            {/* Tabs above table: all, pending, assigned, redesign/revision, completed */}
            <div className="dq-main-tabs">
              {[
                { id: "all", label: "All", count: counts.all },
                { id: "pending", label: "Pending", count: counts.pending },
                { id: "assigned", label: "Assigned", count: counts.assigned },
                { id: "redesign", label: "Redesign / Revision", count: counts.redesign },
                { id: "completed", label: "Completed", count: counts.completed },
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
                  <span className="dq-main-tab-badge">{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="dq-jobs-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={filteredJobs.length > 0 && selectedRowIds.size === filteredJobs.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Job Order No.</th>
                    <th>Customer</th>
                    <th>Job Item</th>
                    <th>Priority</th>
                    <th>Designer</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && jobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                          <RefreshCw size={18} className="jf-spin" style={{ color: "#16a34a" }} />
                          <span>Loading design orders from database...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedJobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                        No job orders found in design queue.
                      </td>
                    </tr>
                  ) : (
                    paginatedJobs.map((job) => {
                      const isChecked = selectedRowIds.has(job._id);
                      const isUnassigned = !job.designerName || job.designerName === "- Unassigned";
                      const isAllocated =
                        (!isUnassigned && Boolean(job.designerName)) ||
                        ["Assigned", "In Progress", "Proof Sent", "Revision", "Completed"].includes(job.status);

                      return (
                        <tr key={job._id} style={{ background: isChecked ? "#f0fdf4" : undefined }}>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectRow(job._id)}
                            />
                          </td>
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
                          </td>
                          <td style={{ fontWeight: 500, color: "#1e293b" }}>{job.customerName}</td>
                          <td style={{ color: "#334155" }}>{job.title}</td>
                          <td>
                            <span
                              className={
                                job.priority === "High"
                                  ? "dq-badge-high"
                                  : job.priority === "Low"
                                    ? "dq-badge-low"
                                    : "dq-badge-normal"
                              }
                            >
                              {job.priority}
                            </span>
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
                              <span style={{ color: "#94a3b8", fontSize: "0.8125rem" }}>- Unassigned</span>
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
                                      : job.status === "Proof Sent"
                                        ? "dq-status-proof-sent"
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
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.85rem 1.25rem",
                borderTop: "1px solid #f1f5f9",
                fontSize: "0.8125rem",
                color: "#64748b",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div>
                Showing {filteredJobs.length === 0 ? 0 : startIndex + 1} to {endIndex} of {filteredJobs.length} job orders
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    style={{ padding: "0.2rem 0.5rem" }}
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    &lt;
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNo) => (
                    <button
                      key={pageNo}
                      type="button"
                      className={`jf-btn ${currentPage === pageNo ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
                      style={{
                        padding: "0.2rem 0.6rem",
                        background: currentPage === pageNo ? "#2563eb" : undefined,
                        borderColor: currentPage === pageNo ? "#2563eb" : undefined,
                        color: currentPage === pageNo ? "#ffffff" : undefined,
                      }}
                      onClick={() => setCurrentPage(pageNo)}
                    >
                      {pageNo}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    style={{ padding: "0.2rem 0.5rem" }}
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ──────────────── DESIGNER QUEUE (BELOW DESIGN QUEUE TABLE) ──────────────── */}
          <div className="dq-designer-queue-card">
            <div className="dq-designer-queue-header">
              <div>
                <h4 className="dq-designer-queue-title">
                  <Users size={18} style={{ color: "#2563eb" }} />
                  <span>Designer Queue</span>
                </h4>
                <p className="dq-designer-queue-subtitle">
                  Active designers available for Round Robin allocation. Manage capacity and individual max loads.
                </p>
              </div>
              <button
                type="button"
                className="dq-btn-add-designer"
                onClick={() => setIsAddDesignerOpen(true)}
              >
                <Plus size={15} /> Add Designer
              </button>
            </div>

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
                  {designers.map((des, index) => {
                    const desId = des._id || des.userId || des.employeeId;
                    const isEditing = editingDesignerId === desId;
                    const loadCount = des.openJobs !== undefined ? des.openJobs : (des.currentLoad || 0);

                    return (
                      <tr key={desId || index}>
                        <td style={{ color: "#64748b" }}>{index + 1}</td>
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
                        <td style={{ color: "#64748b", fontSize: "0.8125rem" }}>
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
                            <button
                              type="button"
                              className="jf-btn jf-btn-secondary jf-btn-sm"
                              style={{ padding: "0.25rem 0.65rem", fontSize: "0.78125rem" }}
                              onClick={() => {
                                setEditingDesignerId(desId);
                                setEditingDesignerLoad(des.maxLoad || 5);
                              }}
                            >
                              Set Limit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <h3 className="jf-card-title" style={{ margin: 0 }}>Designer Work Queue</h3>
                {selectedDesignerProfile === "all" ? (
                  <span className="jf-badge jf-badge-blue" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                    <Users size={14} /> All Designers Queue
                  </span>
                ) : (
                  <span className="jf-badge jf-badge-purple" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                    <UserCheck size={14} /> Profile: {activeSelectedDesigner?.name || "Designer"}
                  </span>
                )}
              </div>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
                {selectedDesignerProfile === "all"
                  ? `Unified queue showing all ${displayedMyJobs.length} active jobs across all ${designers.length} designers in rotation.`
                  : `Showing personal queue for ${activeSelectedDesigner?.name || "selected designer"} (${displayedMyJobs.length} active jobs).`}
              </p>
            </div>

            {/* Profile Switcher Dropdown */}
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
          </div>

          {/* Quick-switch profile pills bar */}
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

          {/* Selected Profile Banner (Single Designer Profile) */}
          {selectedDesignerProfile !== "all" && activeSelectedDesigner && (
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
                  <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.15rem" }}>
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

                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  style={{ background: "#ffffff" }}
                  onClick={() => setSelectedDesignerProfile("all")}
                >
                  <Users size={14} /> View All Designers Queue
                </button>
              </div>
            </div>
          )}

          {/* Unified Queue Banner (When viewing all designers) */}
          {selectedDesignerProfile === "all" && (
            <div className="dq-profile-info-banner unified">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Users size={24} color="#2563eb" />
                <div>
                  <strong style={{ fontSize: "0.9375rem", color: "#1e3a8a" }}>
                    All Designers Queue (Unified Overview)
                  </strong>
                  <div style={{ fontSize: "0.8125rem", color: "#475569", marginTop: "0.15rem" }}>
                    Showing all jobs across all designer queues. Click any designer pill above to filter to their individual profile.
                  </div>
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

          {/* Table Container */}
          <div style={{ padding: "1.25rem" }}>
            {displayedMyJobs.length === 0 ? (
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
                  {displayedMyJobs.map((j) => {
                    const isAccepted = approvedJobIds.has(String(j._id)) || j.status === "In Progress";
                    return (
                      <tr key={j._id}>
                        <td><strong>{j.jobNo}</strong></td>
                        <td>{j.customerName}</td>
                        <td>{j.title}</td>
                        <td>
                          <span className={j.priority === "High" ? "dq-badge-high" : "dq-badge-normal"}>
                            {j.priority}
                          </span>
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
                            <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "0.8125rem" }}>
                              - Unassigned
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="dq-status-in-progress">{isAccepted ? "Accepted" : "Assigned"}</span>
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
              <p>Create and edit the design for this job order.</p>
            </div>
            <div className="dw-header-actions">
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

          {/* Horizontal Top Specs Card */}
          <div className="dw-summary-bar">
            <div className="dw-summary-item">
              <span className="dw-summary-label">Job Order No.</span>
              <span
                className="dw-summary-val dw-summary-val-green"
                onClick={() => {
                  setSelectedJob(currentWorkbenchJob);
                  setIsAssignModalOpen(true);
                }}
                title="View full job details"
              >
                {currentWorkbenchJob.jobNo || "JO-20250810-001"}
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
              <span
                className={
                  currentWorkbenchJob.priority === "High"
                    ? "dq-badge-high"
                    : currentWorkbenchJob.priority === "Low"
                      ? "dq-badge-low"
                      : "dq-badge-normal"
                }
                style={{ padding: "0.2rem 0.6rem" }}
              >
                {currentWorkbenchJob.priority || "High"}
              </span>
            </div>
          </div>

          {/* Main 3-Column Grid */}
          <div className="dw-main-grid">
            {/* ───── COLUMN 1: CUSTOMER REFERENCES ───── */}
            <div className="dw-card">
              <h3 className="dw-card-title">
                <Paperclip size={18} style={{ color: "#16a34a" }} />
                Customer References
              </h3>
              <p className="dw-card-subtitle">
                Files attached by the customer for this job.
              </p>

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
                <span style={{ fontSize: "0.78125rem", color: "#64748b" }}>
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
                      {currentWorkbenchJob.jobNo || "JO-20250810-001"}
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
                    <span
                      className={
                        currentWorkbenchJob.priority === "High"
                          ? "dq-badge-high"
                          : currentWorkbenchJob.priority === "Low"
                            ? "dq-badge-low"
                            : "dq-badge-normal"
                      }
                      style={{ padding: "0.15rem 0.55rem", fontSize: "0.75rem" }}
                    >
                      {currentWorkbenchJob.priority || "High"}
                    </span>
                  </div>
                  <div className="dw-details-row">
                    <span className="dw-details-label">Status</span>
                    <span className="dw-status-in-progress">
                      {currentWorkbenchJob.status || "In Progress"}
                    </span>
                  </div>
                  <div className="dw-details-row">
                    <span className="dw-details-label">Designer</span>
                    <span className="dw-details-val">
                      {currentWorkbenchJob.designerName || "Ahmed Raza"}
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
                        color: "#64748b",
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

      {/* ──────────────── SCREEN 4: WHATSAPP PROOF REVIEW ──────────────── */}
      {activeView === "customer-proof" && (
        <div className="jf-card" style={{ maxWidth: "600px", margin: "0 auto", padding: "1.5rem" }}>
          <h3 className="jf-card-title">Customer WhatsApp Proof Approval</h3>
          <div style={{ background: "#eff6ff", padding: "1rem", borderRadius: "8px", margin: "1rem 0" }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#1e40af" }}>
              Customer Link Generated for: <strong>{selectedJob?.customerName || "Customer"}</strong> (Job {selectedJob?.jobNo || "JO-2025-003"})
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              className="jf-btn jf-btn-primary"
              style={{ flex: 1, background: "#15803d", borderColor: "#15803d" }}
              disabled={approvingProof}
              onClick={handleCustomerApprove}
            >
              <Check size={16} /> {approvingProof ? "Approving..." : "Customer Approves"}
            </button>
            <button
              type="button"
              className="jf-btn jf-btn-secondary"
              style={{ flex: 1, color: "#dc2626" }}
              onClick={() => {
                toast.warn("Customer requested revision.");
                setActiveView("queue");
              }}
            >
              <RotateCcw size={16} /> Request Revision
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── DESIGN JOB DETAILS MODAL (POP-UP - IMAGE 2) ──────────────── */}
      <AssignDesignerModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
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
        }}
        job={viewingJob}
        onOpenWorkbench={(j) => {
          setSelectedJob(j);
          setActiveView("workbench");
        }}
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

      {/* ──────────────── ADD DESIGNER MODAL ──────────────── */}
      {isAddDesignerOpen && (
        <div className="dq-modal-overlay" onClick={() => setIsAddDesignerOpen(false)}>
          <div
            className="dq-modal-drawer"
            style={{ maxWidth: "440px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dq-modal-header">
              <h3 className="dq-modal-title">Add Designer to Pool</h3>
              <button
                type="button"
                className="jf-btn-icon"
                onClick={() => setIsAddDesignerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDesigner}>
              <div className="dq-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.35rem", color: "#1e293b" }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="jf-input"
                    placeholder="e.g. Sarah Tan"
                    value={newDesignerName}
                    onChange={(e) => setNewDesignerName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.35rem", color: "#1e293b" }}>
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    className="jf-input"
                    placeholder="e.g. sarah.tan@printz.com"
                    value={newDesignerEmail}
                    onChange={(e) => setNewDesignerEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.35rem", color: "#1e293b" }}>
                    Max Concurrent Load Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className="jf-input"
                    value={newDesignerMaxLoad}
                    onChange={(e) => setNewDesignerMaxLoad(e.target.value)}
                  />
                </div>
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
                  onClick={() => setIsAddDesignerOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="jf-btn jf-btn-primary"
                  disabled={addingDesigner}
                >
                  {addingDesigner ? "Saving..." : "Add Designer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
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
    </JobFlowLayout>
  );
};

export default DesignWorkflowPage;
