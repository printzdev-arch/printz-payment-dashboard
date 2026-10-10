import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  UserPlus,
  Calendar,
  FileText,
  Box,
  Layers,
  Edit3,
  Search,
  Filter,
  ArrowUpDown,
  Star,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Users
} from "lucide-react";
import "../styles/designV3.css";

// Comprehensive fallback list of 12 designers matching PrintZ design team
const DEFAULT_DESIGNERS = [
  { id: "64f2a1b2c3d4e5f6a7b80021", _id: "64f2a1b2c3d4e5f6a7b80021", name: "Priya R", code: "PR", designation: "Sr. Designer", status: "eligible", openJobs: 3, maxJobs: 5, slaMonthRate: 96, rating: 4.8, avatarColor: "#047857" },
  { id: "64f2a1b2c3d4e5f6a7b80022", _id: "64f2a1b2c3d4e5f6a7b80022", name: "Rahul M", code: "RM", designation: "Designer", status: "eligible", openJobs: 2, maxJobs: 5, slaMonthRate: 88, rating: 4.4, avatarColor: "#0284c7" },
  { id: "64f2a1b2c3d4e5f6a7b80023", _id: "64f2a1b2c3d4e5f6a7b80023", name: "Sneha K", code: "SK", designation: "Designer", status: "on_leave", openJobs: 1, maxJobs: 5, slaMonthRate: 91, rating: 4.6, avatarColor: "#9333ea" },
  { id: "64f2a1b2c3d4e5f6a7b80024", _id: "64f2a1b2c3d4e5f6a7b80024", name: "Imran S", code: "IS", designation: "Designer", status: "at_capacity", openJobs: 5, maxJobs: 5, slaMonthRate: 79, rating: 4.1, avatarColor: "#ea580c" },
  { id: "64f2a1b2c3d4e5f6a7b80025", _id: "64f2a1b2c3d4e5f6a7b80025", name: "Anjali K", code: "AK", designation: "Jr. Designer", status: "eligible", openJobs: 2, maxJobs: 5, slaMonthRate: 94, rating: 4.7, avatarColor: "#15803d" },
  { id: "64f2a1b2c3d4e5f6a7b80026", _id: "64f2a1b2c3d4e5f6a7b80026", name: "Divya V", code: "DV", designation: "Designer", status: "eligible", openJobs: 3, maxJobs: 5, slaMonthRate: 90, rating: 4.5, avatarColor: "#4f46e5" },
  { id: "64f2a1b2c3d4e5f6a7b80027", _id: "64f2a1b2c3d4e5f6a7b80027", name: "Karthik N", code: "KN", designation: "Sr. Designer", status: "eligible", openJobs: 1, maxJobs: 5, slaMonthRate: 98, rating: 4.9, avatarColor: "#0d9488" },
  { id: "64f2a1b2c3d4e5f6a7b80028", _id: "64f2a1b2c3d4e5f6a7b80028", name: "Meera S", code: "MS", designation: "Designer", status: "eligible", openJobs: 4, maxJobs: 5, slaMonthRate: 86, rating: 4.3, avatarColor: "#c026d3" },
  { id: "64f2a1b2c3d4e5f6a7b80029", _id: "64f2a1b2c3d4e5f6a7b80029", name: "Vikram P", code: "VP", designation: "Designer", status: "at_capacity", openJobs: 5, maxJobs: 5, slaMonthRate: 82, rating: 4.2, avatarColor: "#b45309" },
  { id: "64f2a1b2c3d4e5f6a7b8002a", _id: "64f2a1b2c3d4e5f6a7b8002a", name: "Rohit G", code: "RG", designation: "Jr. Designer", status: "eligible", openJobs: 2, maxJobs: 5, slaMonthRate: 89, rating: 4.4, avatarColor: "#0369a1" },
  { id: "64f2a1b2c3d4e5f6a7b8002b", _id: "64f2a1b2c3d4e5f6a7b8002b", name: "Pooja B", code: "PB", designation: "Designer", status: "on_leave", openJobs: 0, maxJobs: 5, slaMonthRate: 93, rating: 4.6, avatarColor: "#7c3aed" },
  { id: "64f2a1b2c3d4e5f6a7b8002c", _id: "64f2a1b2c3d4e5f6a7b8002c", name: "Siddharth T", code: "ST", designation: "Sr. Designer", status: "eligible", openJobs: 2, maxJobs: 5, slaMonthRate: 95, rating: 4.8, avatarColor: "#059669" }
];

export default function AssignDesignerModal({
  assignment,
  designers = [],
  isOpen,
  onClose,
  onConfirmAssign,
  isProcessing = false
}) {
  const [selectedDesignerId, setSelectedDesignerId] = useState("64f2a1b2c3d4e5f6a7b80021");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, FREE, HIGH_SLA
  const [sortBy, setSortBy] = useState("DEFAULT"); // DEFAULT, NAME, ACTIVE_JOBS, SLA, RATING
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const [dueDate, setDueDate] = useState("2026-10-14");
  const [priority, setPriority] = useState("HIGH");
  const [notes, setNotes] = useState("");

  // Pagination for Designer Table
  const [designerPage, setDesignerPage] = useState(1);
  const [designerPageSize, setDesignerPageSize] = useState(5);

  const fullDesignersList = useMemo(() => {
    return (designers && designers.length >= 10) ? designers : DEFAULT_DESIGNERS;
  }, [designers]);

  // Sync initial state when active assignment changes
  useEffect(() => {
    if (assignment) {
      setDueDate(assignment.dueDate ? assignment.dueDate.split("T")[0] : "2026-10-14");
      setPriority(assignment.priority || "HIGH");
      setNotes(assignment.designInstructions || "");
      setSearchQuery("");
      setDesignerPage(1);

      const firstEligible = fullDesignersList.find(
        (d) => d.status === "eligible" || (d.openJobs !== undefined && d.openJobs < (d.maxJobs || 5))
      );
      if (firstEligible) {
        setSelectedDesignerId(firstEligible.id || firstEligible._id || firstEligible.code);
      }
    }
  }, [assignment, fullDesignersList]);

  // Filter and Sort Designers
  const processedDesigners = useMemo(() => {
    let list = [...fullDesignersList];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.code?.toLowerCase().includes(q) ||
          d.designation?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter === "FREE") {
      list = list.filter((d) => (d.openJobs || 0) < (d.maxJobs || 5) && d.status !== "on_leave");
    } else if (statusFilter === "HIGH_SLA") {
      list = list.filter((d) => (d.slaMonthRate || 0) >= 90);
    }

    // Sort
    if (sortBy === "NAME") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "ACTIVE_JOBS") {
      list.sort((a, b) => (a.openJobs || 0) - (b.openJobs || 0));
    } else if (sortBy === "SLA") {
      list.sort((a, b) => (b.slaMonthRate || 0) - (a.slaMonthRate || 0));
    } else if (sortBy === "RATING") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return list;
  }, [fullDesignersList, searchQuery, statusFilter, sortBy]);

  // Designer Table Pagination Slices
  const totalDesigners = processedDesigners.length;
  const totalDesignerPages = Math.max(1, Math.ceil(totalDesigners / designerPageSize));
  const safeDesignerPage = Math.min(Math.max(1, designerPage), totalDesignerPages);
  const startDesignerIdx = (safeDesignerPage - 1) * designerPageSize;
  const endDesignerIdx = Math.min(startDesignerIdx + designerPageSize, totalDesigners);
  const currentDesignersSlice = processedDesigners.slice(startDesignerIdx, endDesignerIdx);

  // Missing placeholder row count to maintain static table height
  const emptyDesignerSlots =
    currentDesignersSlice.length > 0 && currentDesignersSlice.length < designerPageSize
      ? designerPageSize - currentDesignersSlice.length
      : 0;

  // Free designers count
  const freeCount = useMemo(() => {
    return fullDesignersList.filter(
      (d) => (d.openJobs || 0) < (d.maxJobs || 5) && d.status !== "on_leave"
    ).length;
  }, [fullDesignersList]);

  if (!isOpen || !assignment) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDesignerId) {
      alert("Please select a designer.");
      return;
    }
    const selDesigner = fullDesignersList.find(
      (d) => d.id === selectedDesignerId || d._id === selectedDesignerId || d.code === selectedDesignerId
    );
    onConfirmAssign({
      designerId: selDesigner?._id || selDesigner?.id || selectedDesignerId,
      designerName: selDesigner?.name,
      designerCode: selDesigner?.code,
      dueDate,
      priority,
      notes
    });
  };

  return (
    <div
      className="v3-card"
      style={{
        marginTop: "24px",
        width: "100%",
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
        boxSizing: "border-box",
        animation: "v3SlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      {/* 1. Header Row */}
      <div
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          backgroundColor: "#ffffff"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              backgroundColor: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              flexShrink: 0
            }}
          >
            <UserPlus size={22} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                Assign Graphic Designer
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  backgroundColor: "#ecfdf5",
                  color: "#047857",
                  border: "1px solid #a7f3d0",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontFamily: "monospace"
                }}
              >
                {assignment.assignmentNo || "DES-2026-00003"}
              </span>
            </div>

            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "3px" }}>
              Job Order: <strong style={{ color: "#0f172a" }}>{assignment.jobNo || "JOB-2026-00050"}</strong> • Customer: <strong style={{ color: "#0f172a" }}>{assignment.customerName || "Green Leaf Café"}</strong> ({assignment.customerMobile || "9845077889"})
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
            padding: "8px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          title="Close panel"
        >
          <X size={20} />
        </button>
      </div>

      {/* 2. Main 2-Column Content */}
      <form onSubmit={handleSubmit}>
        <div
          style={{
            padding: "24px",
            display: "grid",
            gridTemplateColumns: "1.05fr 1.35fr",
            gap: "28px"
          }}
        >
          {/* Left Column: Job Details, Specs & Scheduling */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Job Details Card */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "14px"
              }}
            >
              {/* Card Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      backgroundColor: "#ecfdf5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#059669"
                    }}
                  >
                    <FileText size={16} />
                  </div>
                  <strong style={{ fontSize: "14px", color: "#0f172a", fontWeight: 700 }}>
                    Job Details
                  </strong>
                </div>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    backgroundColor: "#fff7ed",
                    color: "#c2410c",
                    border: "1px solid #fed7aa",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 700
                  }}
                >
                  <AlertTriangle size={12} />
                  {priority === "HIGH" ? "High Priority" : priority === "URGENT" ? "Urgent Express" : `${priority} Priority`}
                </span>
              </div>

              {/* Product Title */}
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                {assignment.itemName || "Restaurant Menu Card"}
              </div>

              {/* Quantity & Material 2-Column Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Quantity & Dimensions */}
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{ color: "#64748b", marginTop: "2px" }}>
                    <Box size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>
                      Quantity & Dimensions
                    </div>
                    <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                      {assignment.requirementSnapshot?.quantity || assignment.quantity || 200}{" "}
                      {assignment.requirementSnapshot?.unit || assignment.unit || "PCS"} •{" "}
                      {assignment.requirementSnapshot?.size || "A4 Tri-Fold"}
                    </div>
                  </div>
                </div>

                {/* Material */}
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{ color: "#64748b", marginTop: "2px" }}>
                    <Layers size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>
                      Material
                    </div>
                    <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                      {assignment.requirementSnapshot?.paperType || "Gloss Art Card"}{" "}
                      {assignment.requirementSnapshot?.gsm ? `${assignment.requirementSnapshot.gsm} GSM` : "350 GSM"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Brief Notes Box */}
              <div
                style={{
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #dcfce7",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start"
                }}
              >
                <FileText size={16} color="#059669" style={{ marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#047857" }}>
                    Brief Notes
                  </div>
                  <div style={{ fontSize: "12px", color: "#334155", marginTop: "2px", lineHeight: "1.4" }}>
                    {assignment.requirementSnapshot?.designNotes ||
                      assignment.designNotes ||
                      "Tri-fold 6-page layout with beverage section on back page."}
                  </div>
                </div>
              </div>
            </div>

            {/* Target Due Date & Priority Level */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="v3-form-group" style={{ margin: 0 }}>
                <label className="v3-form-label" style={{ fontWeight: 700, fontSize: "12.5px" }}>
                  Target Due Date <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="date"
                    className="v3-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    style={{ height: "40px", fontSize: "13px", paddingLeft: "36px" }}
                  />
                  <Calendar
                    size={16}
                    color="#059669"
                    style={{ position: "absolute", left: "12px", top: "12px", pointerEvents: "none" }}
                  />
                </div>
              </div>

              <div className="v3-form-group" style={{ margin: 0 }}>
                <label className="v3-form-label" style={{ fontWeight: 700, fontSize: "12.5px" }}>
                  Priority Level
                </label>
                <select
                  className="v3-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{ height: "40px", fontSize: "13px", margin: 0 }}
                >
                  <option value="LOW">Low Priority</option>
                  <option value="NORMAL">Normal Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Express</option>
                </select>
              </div>
            </div>

            {/* Special Instructions for Designer */}
            <div className="v3-form-group" style={{ margin: 0 }}>
              <label
                className="v3-form-label"
                style={{
                  fontWeight: 700,
                  fontSize: "12.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Edit3 size={14} color="#334155" />
                Special Instructions for Designer (Optional)
              </label>

              <div style={{ position: "relative", width: "100%", boxSizing: "border-box" }}>
                <textarea
                  className="v3-textarea"
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Please use brand color palette #059669 and share 2 initial mockup concepts."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    display: "block",
                    fontSize: "12.5px",
                    padding: "10px 14px",
                    paddingBottom: "26px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    outline: "none",
                    resize: "vertical",
                    minHeight: "75px"
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: "12px",
                    bottom: "8px",
                    fontSize: "11px",
                    color: "#94a3b8",
                    pointerEvents: "none"
                  }}
                >
                  {notes.length}/500
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Select Designer Mini-Table with Filters & Pagination */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Section Title & Available Count Pill */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={18} color="#334155" />
                <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 800, color: "#0f172a" }}>
                  Select Designer <span style={{ color: "#dc2626" }}>*</span>
                </h3>
              </div>

              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: "#047857",
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981" }} />
                {freeCount} Free & Available
              </span>
            </div>

            {/* Search, Filter & Sort Toolbar */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", position: "relative" }}>
              {/* Search Box */}
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search designer by name or code..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setDesignerPage(1);
                  }}
                  className="v3-input"
                  style={{ height: "38px", paddingLeft: "34px", fontSize: "12.5px" }}
                />
                <Search
                  size={15}
                  color="#059669"
                  style={{ position: "absolute", left: "11px", top: "11px", pointerEvents: "none" }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "9px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#94a3b8"
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Filters Button */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowFilterDropdown(!showFilterDropdown);
                    setShowSortDropdown(false);
                  }}
                  className="v3-btn-secondary"
                  style={{
                    height: "38px",
                    padding: "0 12px",
                    fontSize: "12.5px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    borderColor: statusFilter !== "ALL" ? "#059669" : "#cbd5e1",
                    color: statusFilter !== "ALL" ? "#047857" : "#334155"
                  }}
                >
                  <Filter size={14} /> Filters
                </button>

                {showFilterDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "42px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      zIndex: 100,
                      width: "140px",
                      padding: "4px"
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setStatusFilter("ALL"); setShowFilterDropdown(false); }}
                      style={{ width: "100%", padding: "6px 10px", textAlign: "left", fontSize: "12px", background: statusFilter === "ALL" ? "#f1f5f9" : "none", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: statusFilter === "ALL" ? 700 : 500 }}
                    >
                      All Designers
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatusFilter("FREE"); setShowFilterDropdown(false); }}
                      style={{ width: "100%", padding: "6px 10px", textAlign: "left", fontSize: "12px", background: statusFilter === "FREE" ? "#f1f5f9" : "none", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: statusFilter === "FREE" ? 700 : 500 }}
                    >
                      Free Slots Only
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatusFilter("HIGH_SLA"); setShowFilterDropdown(false); }}
                      style={{ width: "100%", padding: "6px 10px", textAlign: "left", fontSize: "12px", background: statusFilter === "HIGH_SLA" ? "#f1f5f9" : "none", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: statusFilter === "HIGH_SLA" ? 700 : 500 }}
                    >
                      High SLA (≥ 90%)
                    </button>
                  </div>
                )}
              </div>

              {/* Sort Button */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowFilterDropdown(false);
                  }}
                  className="v3-btn-secondary"
                  style={{
                    height: "38px",
                    padding: "0 12px",
                    fontSize: "12.5px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    borderColor: sortBy !== "DEFAULT" ? "#059669" : "#cbd5e1",
                    color: sortBy !== "DEFAULT" ? "#047857" : "#334155"
                  }}
                >
                  <ArrowUpDown size={14} /> Sort
                </button>

                {showSortDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "42px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      zIndex: 100,
                      width: "160px",
                      padding: "4px"
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setSortBy("DEFAULT"); setShowSortDropdown(false); }}
                      style={{ width: "100%", padding: "6px 10px", textAlign: "left", fontSize: "12px", background: sortBy === "DEFAULT" ? "#f1f5f9" : "none", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: sortBy === "DEFAULT" ? 700 : 500 }}
                    >
                      Default Order
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSortBy("ACTIVE_JOBS"); setShowSortDropdown(false); }}
                      style={{ width: "100%", padding: "6px 10px", textAlign: "left", fontSize: "12px", background: sortBy === "ACTIVE_JOBS" ? "#f1f5f9" : "none", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: sortBy === "ACTIVE_JOBS" ? 700 : 500 }}
                    >
                      Least Active Jobs
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSortBy("SLA"); setShowSortDropdown(false); }}
                      style={{ width: "100%", padding: "6px 10px", textAlign: "left", fontSize: "12px", background: sortBy === "SLA" ? "#f1f5f9" : "none", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: sortBy === "SLA" ? 700 : 500 }}
                    >
                      Highest SLA %
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSortBy("RATING"); setShowSortDropdown(false); }}
                      style={{ width: "100%", padding: "6px 10px", textAlign: "left", fontSize: "12px", background: sortBy === "RATING" ? "#f1f5f9" : "none", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: sortBy === "RATING" ? 700 : 500 }}
                    >
                      Highest Rating
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mini Designer Table */}
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                overflow: "hidden",
                backgroundColor: "#ffffff"
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 700, fontSize: "11.5px" }}>
                    <th style={{ padding: "10px 12px", textAlign: "center", width: "36px" }}>#</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>Designer</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", width: "130px" }}>Availability</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", width: "90px" }}>Active Jobs</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", width: "60px" }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {currentDesignersSlice.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                        No designers match your filter or search query.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {currentDesignersSlice.map((designer, idx) => {
                        const rowNum = startDesignerIdx + idx + 1;
                        const id = designer.id || designer._id || designer.code;
                        const isSelected = selectedDesignerId === id;
                        const openJobs = designer.openJobs !== undefined ? designer.openJobs : 0;
                        const maxJobs = designer.maxJobs || 5;
                        const freeSlots = Math.max(0, maxJobs - openJobs);
                        const isOnLeave = designer.status === "on_leave";
                        const isAtCapacity = openJobs >= maxJobs;

                        return (
                          <tr
                            key={id}
                            onClick={() => {
                              if (!isOnLeave) {
                                setSelectedDesignerId(id);
                              }
                            }}
                            style={{
                              height: "53px",
                              backgroundColor: isSelected ? "#ecfdf5" : undefined,
                              borderBottom: "1px solid #f1f5f9",
                              borderLeft: isSelected ? "3px solid #059669" : "3px solid transparent",
                              cursor: isOnLeave ? "not-allowed" : "pointer",
                              transition: "background-color 0.15s ease",
                              opacity: isOnLeave ? 0.6 : 1
                            }}
                          >
                            {/* Row Number */}
                            <td style={{ padding: "10px 12px", textAlign: "center", color: "#64748b", fontWeight: 700 }}>
                              {rowNum}
                            </td>

                            {/* Designer Avatar + Name + Rating/SLA */}
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    backgroundColor: designer.avatarColor || "#059669",
                                    color: "#ffffff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "11px",
                                    fontWeight: 800,
                                    flexShrink: 0
                                  }}
                                >
                                  {designer.code || designer.name?.substring(0, 2).toUpperCase()}
                                </div>

                                <div>
                                  <div style={{ fontWeight: 700, color: isSelected ? "#065f46" : "#0f172a", fontSize: "13px" }}>
                                    {designer.name}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px", marginTop: "1px" }}>
                                    <Star size={11} fill="#eab308" color="#eab308" />
                                    <span style={{ fontWeight: 600 }}>{designer.rating || 4.5}</span>
                                    <span>•</span>
                                    <span>{designer.slaMonthRate || 92}% SLA</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Availability Badge */}
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              {isOnLeave ? (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#7e22ce",
                                    backgroundColor: "#f3e8ff",
                                    padding: "3px 10px",
                                    borderRadius: "999px",
                                    display: "inline-block"
                                  }}
                                >
                                  On Leave
                                </span>
                              ) : isAtCapacity ? (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#b45309",
                                    backgroundColor: "#fef3c7",
                                    padding: "3px 10px",
                                    borderRadius: "999px",
                                    display: "inline-block"
                                  }}
                                >
                                  At Capacity
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#15803d",
                                    backgroundColor: "#dcfce7",
                                    padding: "3px 10px",
                                    borderRadius: "999px",
                                    display: "inline-block"
                                  }}
                                >
                                  Free ({freeSlots} {freeSlots === 1 ? "slot" : "slots"})
                                </span>
                              )}
                            </td>

                            {/* Active Jobs Fraction */}
                            <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#334155" }}>
                              {openJobs}/{maxJobs}
                            </td>

                            {/* Custom Radio Button */}
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <div
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  borderRadius: "50%",
                                  border: isSelected ? "2px solid #059669" : "2px solid #cbd5e1",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  margin: "0 auto",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                {isSelected && (
                                  <div
                                    style={{
                                      width: "8px",
                                      height: "8px",
                                      borderRadius: "50%",
                                      backgroundColor: "#059669"
                                    }}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Static Placeholder Empty Rows to preserve table height */}
                      {emptyDesignerSlots > 0 &&
                        Array.from({ length: emptyDesignerSlots }).map((_, emptyIdx) => (
                          <tr
                            key={`designer-placeholder-${emptyIdx}`}
                            style={{
                              height: "53px",
                              borderBottom: "1px solid #f8fafc",
                              backgroundColor: "#ffffff",
                              pointerEvents: "none"
                            }}
                          >
                            <td style={{ padding: "10px 12px", color: "transparent", userSelect: "none" }}>&nbsp;</td>
                            <td style={{ padding: "10px 12px", color: "transparent", userSelect: "none" }}>&nbsp;</td>
                            <td style={{ padding: "10px 12px", color: "transparent", userSelect: "none" }}>&nbsp;</td>
                            <td style={{ padding: "10px 12px", color: "transparent", userSelect: "none" }}>&nbsp;</td>
                            <td style={{ padding: "10px 12px", color: "transparent", userSelect: "none" }}>&nbsp;</td>
                          </tr>
                        ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Designer Mini Table */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 2px",
                fontSize: "12px",
                color: "#64748b",
                flexWrap: "wrap",
                gap: "10px"
              }}
            >
              {/* Rows per page selector */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>Rows per page:</span>
                <select
                  value={designerPageSize}
                  onChange={(e) => {
                    setDesignerPageSize(Number(e.target.value));
                    setDesignerPage(1);
                  }}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    fontWeight: 700,
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    cursor: "pointer"
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>
                  {startDesignerIdx + 1}–{endDesignerIdx} of {totalDesigners} designers
                </span>
              </div>

              {/* Page buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  type="button"
                  disabled={safeDesignerPage <= 1}
                  onClick={() => setDesignerPage((p) => Math.max(1, p - 1))}
                  style={{
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    color: safeDesignerPage <= 1 ? "#cbd5e1" : "#334155",
                    cursor: safeDesignerPage <= 1 ? "not-allowed" : "pointer"
                  }}
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalDesignerPages }, (_, i) => i + 1).map((pageNum) => {
                  const isActive = pageNum === safeDesignerPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setDesignerPage(pageNum)}
                      style={{
                        minWidth: "28px",
                        height: "28px",
                        padding: "0 6px",
                        borderRadius: "6px",
                        border: isActive ? "1px solid #059669" : "1px solid #e2e8f0",
                        backgroundColor: isActive ? "#059669" : "#ffffff",
                        color: isActive ? "#ffffff" : "#334155",
                        fontWeight: isActive ? 800 : 600,
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={safeDesignerPage >= totalDesignerPages}
                  onClick={() => setDesignerPage((p) => Math.min(totalDesignerPages, p + 1))}
                  style={{
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    color: safeDesignerPage >= totalDesignerPages ? "#cbd5e1" : "#334155",
                    cursor: safeDesignerPage >= totalDesignerPages ? "not-allowed" : "pointer"
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bottom Action Footer */}
        <div
          style={{
            padding: "16px 24px",
            backgroundColor: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              height: "40px",
              padding: "0 22px",
              fontSize: "13.5px",
              fontWeight: 600,
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              color: "#334155",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isProcessing || !selectedDesignerId}
            style={{
              height: "40px",
              padding: "0 26px",
              fontSize: "13.5px",
              fontWeight: 700,
              backgroundColor: "#059669",
              border: "1px solid #059669",
              borderRadius: "8px",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: isProcessing || !selectedDesignerId ? "not-allowed" : "pointer",
              boxShadow: "0 2px 4px rgba(5, 150, 105, 0.2)"
            }}
          >
            <UserPlus size={16} />
            {isProcessing ? "Assigning Designer..." : "Confirm & Assign Designer"}
          </button>
        </div>
      </form>
    </div>
  );
}
