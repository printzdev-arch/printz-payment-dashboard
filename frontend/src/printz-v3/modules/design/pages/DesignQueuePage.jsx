import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Palette,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import DesignerAllocationSequence from "../components/DesignerAllocationSequence";
import DesignerPoolPanel from "../components/DesignerPoolPanel";
import DesignQueueTable from "../components/DesignQueueTable";
import AssignDesignerModal from "../components/AssignDesignerModal";
import {
  getDesignQueue,
  getDesignerPool,
  assignDesigner,
  autoAllocateDesigners
} from "../api/designApi";
import "../styles/designV3.css";

export default function DesignQueuePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [designerFilter, setDesignerFilter] = useState("ALL");

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const assignPanelRef = React.useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [queueRes, poolRes] = await Promise.all([
        getDesignQueue({
          priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
          search: search || undefined
        }),
        getDesignerPool()
      ]);
      const rawList = Array.isArray(queueRes)
        ? queueRes
        : (Array.isArray(queueRes?.assignments) ? queueRes.assignments : (Array.isArray(queueRes?.data) ? queueRes.data : []));

      const list = rawList.map((j) => {
        const designer = j.designerId;
        const designerName = (typeof designer === "object" ? designer?.name : j.designerName) || j.assignedDesignerName || (designer ? "Assigned Designer" : "");
        return {
          id: j._id || j.id,
          _id: j._id || j.id,
          assignmentNo: j.assignmentNo || `DES-${j.jobNo ? j.jobNo.replace(/^JO-/, "") : (j._id ? String(j._id).slice(-6).toUpperCase() : "JOB")}`,
          jobOrderId: j._id || j.jobOrderId,
          jobNo: j.jobNo || "JOB-PENDING",
          customerName: j.customerName || j.customerSnapshot?.name || "Walk-in Customer",
          customerMobile: j.customerPhone || j.customerSnapshot?.mobile || "",
          itemName: j.itemName || j.title || j.items?.[0]?.itemName || "Custom Artwork",
          productType: j.productType || j.items?.[0]?.productType || j.title || "Custom Artwork",
          quantity: Number(j.quantity || j.items?.[0]?.quantity || 1),
          unit: j.unit || j.items?.[0]?.unit || "PCS",
          status: j.status || (designer ? "ASSIGNED" : "UNASSIGNED"),
          priority: j.priority || "NORMAL",
          designerId: (typeof designer === "object" ? designer?._id : designer) || null,
          designerName: designerName || null,
          assignedDesignerName: designerName || null,
          assignedDesignerCode: designerName ? designerName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "GD",
          dueDate: j.dueDate,
          createdAt: j.createdAt,
          slaUrgency: j.slaUrgency || "1h 40m",
          ...j
        };
      });

      let filtered = list;
      if (statusFilter && statusFilter !== "ALL") {
        if (statusFilter === "PENDING_ASSIGNMENT") {
          filtered = filtered.filter((i) => i.status === "PENDING_ASSIGNMENT" || (!i.designerId && i.status !== "ASSIGNED"));
        } else if (statusFilter === "ASSIGNED") {
          filtered = filtered.filter((i) => i.status === "ASSIGNED" || Boolean(i.designerId));
        } else if (statusFilter === "IN_PROGRESS") {
          filtered = filtered.filter((i) => i.status === "IN_PROGRESS");
        } else if (statusFilter === "PROOF_PENDING") {
          filtered = filtered.filter((i) => i.status === "PROOF_PENDING");
        }
      }
      if (priorityFilter && priorityFilter !== "ALL") {
        filtered = filtered.filter((i) => (i.priority || "NORMAL").toUpperCase() === priorityFilter.toUpperCase());
      }
      if (designerFilter && designerFilter !== "ALL") {
        if (designerFilter === "UNASSIGNED") {
          filtered = filtered.filter((i) => !i.designerId);
        } else {
          filtered = filtered.filter((i) => String(i.designerId) === String(designerFilter));
        }
      }
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter((i) =>
          (i.jobNo && i.jobNo.toLowerCase().includes(q)) ||
          (i.customerName && i.customerName.toLowerCase().includes(q)) ||
          (i.customerMobile && i.customerMobile.toLowerCase().includes(q)) ||
          (i.itemName && i.itemName.toLowerCase().includes(q)) ||
          (i.assignmentNo && i.assignmentNo.toLowerCase().includes(q))
        );
      }

      setAssignments(filtered);
      setDesigners(poolRes?.designers || []);
    } catch (err) {
      console.error("Failed to load design data:", err);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, designerFilter]);


  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === assignments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(assignments.map((a) => a.id || a.assignmentNo));
    }
  };

  const handleOpenAssign = (item) => {
    setActiveAssignment(item);
    setAssignModalOpen(true);
    setTimeout(() => {
      assignPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleConfirmAssign = async (payload) => {
    setIsProcessing(true);
    try {
      const id = activeAssignment.id || activeAssignment.assignmentNo;
      await assignDesigner(id, payload);
      setAssignModalOpen(false);
      setFeedbackMsg(`Designer assigned successfully to ${activeAssignment.assignmentNo}`);
      setTimeout(() => setFeedbackMsg(null), 4000);
      loadData();
    } catch (err) {
      console.error("Assign error:", err);
      alert(err.message || "Failed to assign designer.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoAllocate = async () => {
    setIsProcessing(true);
    try {
      const res = await autoAllocateDesigners(selectedIds);
      setFeedbackMsg(res.message || "Auto allocation complete!");
      setSelectedIds([]);
      setTimeout(() => setFeedbackMsg(null), 4000);
      loadData();
    } catch (err) {
      console.error("Auto allocate error:", err);
      alert(err.message || "Failed to auto-allocate designers.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoAllocateSingle = async (item) => {
    setIsProcessing(true);
    try {
      const res = await autoAllocateDesigners([item.id || item.assignmentNo]);
      setFeedbackMsg(`Allocated ${item.assignmentNo} via Round Robin.`);
      setTimeout(() => setFeedbackMsg(null), 4000);
      loadData();
    } catch (err) {
      console.error("Single auto allocate error:", err);
      alert(err.message || "Failed to allocate.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="v3-design-container">
      {/* Top Header */}
      <div className="v3-design-header">
        <div>
          <div className="v3-breadcrumb">
            <span className="v3-breadcrumb-root">Design</span>
            <span>/</span>
            <span>Designer Allocation</span>
          </div>

          <h1 className="v3-design-title">
            <Palette size={24} color="#059669" />
            Designer Allocation
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => navigate("/v3/design/my-queue")}
            className="v3-btn-secondary"
            style={{ fontSize: "12px", height: "34px", borderColor: "#059669", color: "#047857" }}
          >
            <Users size={14} /> My Design Queue (Designer View)
          </button>

          <button
            type="button"
            onClick={loadData}
            className="v3-btn-secondary"
            style={{ fontSize: "12px", height: "34px" }}
            title="Refresh list"
          >
            <RefreshCw size={14} /> Refresh
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

      {/* Allocation Sequence Flow (Top Bar) */}
      <DesignerAllocationSequence
        designers={designers}
        selectedCount={selectedIds.length}
        onAutoAllocate={handleAutoAllocate}
        isAllocating={isProcessing}
      />

      {/* Designer Pool Status Bar (Above Directory Table) */}
      <DesignerPoolPanel designers={designers} />

      {/* Filters Bar */}
      <div className="v3-card" style={{ padding: "14px 18px", marginBottom: "20px" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", margin: 0 }}>
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
            <input
              type="text"
              placeholder="Search by job no, customer, mobile, item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="v3-input"
              style={{ paddingLeft: "36px", height: "38px" }}
            />
            <Search size={16} color="#059669" style={{ position: "absolute", left: "12px", top: "11px", pointerEvents: "none" }} />
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: "170px" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="v3-select"
              style={{ height: "38px", margin: 0 }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_ASSIGNMENT">Awaiting Allocation</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PROOF_PENDING">Proof Submitted</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div style={{ minWidth: "140px" }}>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="v3-select"
              style={{ height: "38px", margin: 0 }}
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="NORMAL">Normal Priority</option>
              <option value="URGENT">Urgent Express</option>
            </select>
          </div>

          {/* Designer Filter */}
          <div style={{ minWidth: "160px" }}>
            <select
              value={designerFilter}
              onChange={(e) => setDesignerFilter(e.target.value)}
              className="v3-select"
              style={{ height: "38px", margin: 0 }}
            >
              <option value="ALL">All Designers</option>
              <option value="UNASSIGNED">Unassigned</option>
              {designers.map((d, idx) => (
                <option key={d.id || d._id || `designer-opt-${idx}`} value={d.id || d._id}>
                  {d.name} ({d.openJobs || 0} active)
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Full Page Static Design Queue Directory Table */}
      <DesignQueueTable
        assignments={assignments}
        onOpenAssignModal={handleOpenAssign}
        onAutoAllocateSingle={handleAutoAllocateSingle}
        onOpenWorkspace={(item) => navigate(`/v3/design/workspace/${item.id || item.assignmentNo}`)}
      />

      {/* Inline Assignment Section (Below Directory Table) */}
      <div ref={assignPanelRef}>
        <AssignDesignerModal
          assignment={activeAssignment}
          designers={designers}
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          onConfirmAssign={handleConfirmAssign}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
}
