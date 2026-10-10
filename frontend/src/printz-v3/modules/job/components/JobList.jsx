import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Clock,
  Layers,
  Calendar,
  Briefcase,
  AlertCircle,
  ArrowRight,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { getJobs } from "../api/jobApi";
import Badge from "../../../shared/components/Badge";
import "../../customer/styles/customerV3.css";
import "../styles/jobV3.css";

export default function JobList({
  branchName = "Banaswadi",
  onSelectJob,
  onAddNewJob,
  refreshTrigger = 0,
  className = ""
}) {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  useEffect(() => {
    fetchJobsList();
  }, [branchName, statusFilter, priorityFilter, refreshTrigger]);

  const fetchJobsList = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (branchName && branchName !== "All Branches") params.branch = branchName;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (priorityFilter !== "ALL") params.priority = priorityFilter;

      const data = await getJobs(params);
      setJobs(Array.isArray(data) ? data : data.jobs || []);
    } catch (err) {
      console.error("Failed to load jobs list:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const jobNo = (j.jobNo || j.jobId || j.id || "").toLowerCase();
    const title = (j.jobTitle || j.title || "").toLowerCase();
    const cusName = (j.customerName || j.customer?.name || "").toLowerCase();
    const cusCode = (j.customerCode || j.customer?.customerCode || "").toLowerCase();
    const cusPhone = (j.customerMobile || j.customer?.mobile || "").toLowerCase();

    return (
      jobNo.includes(q) ||
      title.includes(q) ||
      cusName.includes(q) ||
      cusCode.includes(q) ||
      cusPhone.includes(q)
    );
  });

  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case "URGENT": return "danger";
      case "HIGH": return "warning";
      case "LOW": return "neutral";
      default: return "info";
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case "REQUIREMENT_CAPTURED": return "active";
      case "DRAFT": return "neutral";
      case "ESTIMATE_PENDING": return "warning";
      case "COMPLETED": return "active";
      case "CANCELLED": return "danger";
      default: return "business";
    }
  };

  return (
    <div className={`v3-card ${className}`}>
      {/* Header */}
      <div className="v3-card-header">
        <div className="v3-card-header-left">
          <div className="v3-card-icon">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="v3-card-title">Active Job Orders Directory</h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onAddNewJob || (() => navigate("/v3/jobs/new"))}
          className="v3-btn-primary"
          style={{ fontSize: "12px", padding: "8px 16px" }}
        >
          <Plus size={14} /> + Create New Job Order
        </button>
      </div>

      <div className="v3-card-body">
        {/* Controls Row: Search & Filters */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "280px", flex: 1 }}>
            <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Job # (JOB-2026-00045), Title, or Customer..."
              className="v3-input"
              style={{ height: "38px", paddingLeft: "36px" }}
            />
          </div>

          {/* Status Tabs */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "ALL", label: "All Jobs" },
              { id: "REQUIREMENT_CAPTURED", label: "Requirements Captured" },
              { id: "DRAFT", label: "Drafts" },
              { id: "ESTIMATE_PENDING", label: "Estimates Pending" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`v3-tab-btn ${statusFilter === tab.id ? "active" : ""}`}
                style={{ padding: "6px 12px", fontSize: "11px" }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="v3-input no-icon"
              style={{ height: "36px", fontSize: "12px", padding: "0 8px" }}
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">🔴 Urgent</option>
              <option value="HIGH">🟠 High</option>
              <option value="NORMAL">🔵 Normal</option>
              <option value="LOW">⚪ Low</option>
            </select>
          </div>
        </div>

        {/* Jobs Data Table */}
        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontSize: "13px" }}>Loading job orders from server...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
            <Briefcase size={32} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#334155" }}>
              No Job Orders Found
            </p>
            <p style={{ margin: "4px 0 16px 0", fontSize: "12px", color: "#64748b" }}>
              {searchQuery ? `No results match your search "${searchQuery}"` : "Create your first job order for a customer"}
            </p>
            <button
              type="button"
              onClick={onAddNewJob || (() => navigate("/v3/jobs/new"))}
              className="v3-btn-primary"
              style={{ fontSize: "12px", padding: "8px 16px" }}
            >
              <Plus size={14} /> Create Job Order
            </button>
          </div>
        ) : (
          <div className="v3-table-wrapper">
            <table className="v3-table">
              <thead>
                <tr>
                  <th>Job Number</th>
                  <th>Customer</th>
                  <th>Job Title & Specification</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Delivery Date</th>
                  <th>Created</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => {
                  const itemCount = job.items?.length || job.itemCount || 1;
                  const totalUnits = (job.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);
                  const firstItem = job.items?.[0] || {};

                  return (
                    <tr key={job.id || job._id || job.jobId || job.jobNo}>
                      <td>
                        <strong style={{ fontFamily: "monospace", fontSize: "13px", color: "#047857" }}>
                          {job.jobNo || job.jobId || "JOB-2026-00000"}
                        </strong>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {job.source || "WALK_IN"}
                        </div>
                      </td>

                      <td>
                        <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>
                          {job.customerName || job.customer?.name || "Customer"}
                        </strong>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          <span style={{ fontFamily: "monospace" }}>
                            {job.customerCode || job.customerSnapshot?.customerCode || job.customer?.customerCode || "—"}
                          </span>
                          {" • "}
                          {job.customerMobile || job.customerPhone || job.customerSnapshot?.mobile || job.customer?.mobile || job.customer?.phone || "—"}
                        </div>
                      </td>

                      <td>
                        <strong style={{ color: "#334155" }}>{job.jobTitle || job.title || "Print Job"}</strong>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          {itemCount} {itemCount === 1 ? "Item" : "Items"}
                          {totalUnits > 0 && ` (${totalUnits.toLocaleString()} total units)`}
                          {firstItem.itemName && ` • ${firstItem.itemName}`}
                        </div>
                      </td>

                      <td>
                        <Badge variant={getPriorityBadgeVariant(job.priority)}>
                          {job.priority || "NORMAL"}
                        </Badge>
                      </td>

                      <td>
                        <Badge variant={getStatusBadgeVariant(job.status)}>
                          {job.status === "REQUIREMENT_CAPTURED" ? "Requirements Captured" : job.status || "DRAFT"}
                        </Badge>
                      </td>

                      <td>
                        {job.expectedDeliveryDate ? (
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Calendar size={12} color="#047857" />
                            {job.expectedDeliveryDate}
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>Standard SLA</span>
                        )}
                      </td>

                      <td>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Today"}
                        </div>
                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                          {job.branchName || job.branchId?.name || "Banaswadi"}
                        </div>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectJob) onSelectJob(job);
                              else navigate(`/v3/jobs/${job.id || job._id || job.jobId || job.jobNo}`);
                            }}
                            className="v3-btn-secondary"
                            style={{ padding: "5px 10px", fontSize: "11px", height: "28px" }}
                            title="View Job Details"
                          >
                            <Eye size={12} /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
