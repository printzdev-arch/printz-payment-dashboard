import React, { useState, useEffect } from "react";
import {
  Layers,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Calendar,
  Building2,
  FileCheck,
  Eye,
  Check
} from "lucide-react";
import { getEligibleJobsForPlanning } from "../api/productionApi";

export default function ProductionPlanningView({
  onSelectJobForPlanning,
  onNavigateToOrders,
  branchName = "Kothanur"
}) {
  const [eligibleJobs, setEligibleJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    loadEligibleJobs();
  }, [priorityFilter, statusFilter]);

  const loadEligibleJobs = async () => {
    setLoading(true);
    try {
      const data = await getEligibleJobsForPlanning({
        search: searchQuery,
        priority: priorityFilter,
        planningStatus: statusFilter
      });
      setEligibleJobs(data || []);
    } catch (err) {
      console.error("Failed to load eligible jobs for planning:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadEligibleJobs();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setPriorityFilter("ALL");
    setStatusFilter("ALL");
  };

  // Metrics
  const readyCount = eligibleJobs.filter((j) => j.planningStatus === "READY_FOR_PLANNING").length;
  const plannedCount = eligibleJobs.filter((j) => j.planningStatus === "PLANNED").length;

  return (
    <div className="prod-container">
      {/* Header & Subtitle */}
      <div className="prod-header-bar">
        <div className="prod-title-group">
          <div className="prod-breadcrumb">
            <span>Production</span>
            <span>/</span>
            <span style={{ color: "#0f172a", fontWeight: 600 }}>Production Planning</span>
          </div>
          <h1 className="prod-title">
            <Layers size={22} color="#047857" />
            Production Planning
          </h1>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={onNavigateToOrders}
            className="prod-btn-secondary"
            style={{ padding: "8px 16px" }}
          >
            <Layers size={14} />
            Production Orders
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="prod-stats-grid">
        <div className="prod-stat-box">
          <div className="prod-stat-icon" style={{ backgroundColor: "#ecfdf5", color: "#047857" }}>
            <FileCheck size={18} />
          </div>
          <div>
            <p className="prod-stat-value">{eligibleJobs.length}</p>
            <p className="prod-stat-label">Eligible Job Items</p>
          </div>
        </div>

        <div className="prod-stat-box">
          <div className="prod-stat-icon" style={{ backgroundColor: "#eff6ff", color: "#1d4ed8" }}>
            <Clock size={18} />
          </div>
          <div>
            <p className="prod-stat-value">{readyCount}</p>
            <p className="prod-stat-label">Ready for Planning</p>
          </div>
        </div>

        <div className="prod-stat-box">
          <div className="prod-stat-icon" style={{ backgroundColor: "#f0fdf4", color: "#15803d" }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="prod-stat-value">{plannedCount}</p>
            <p className="prod-stat-label">Planned (Orders Released)</p>
          </div>
        </div>

        <div className="prod-stat-box">
          <div className="prod-stat-icon" style={{ backgroundColor: "#faf5ff", color: "#7e22ce" }}>
            <Building2 size={18} />
          </div>
          <div>
            <p className="prod-stat-value">{branchName}</p>
            <p className="prod-stat-label">Active Branch</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="prod-filters-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", flex: 1, gap: "8px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={15}
              style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }}
            />
            <input
              type="text"
              className="prod-search-input"
              style={{ paddingLeft: "32px" }}
              placeholder="Search by Job No, Customer, Product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="prod-btn-primary" style={{ height: "34px", padding: "0 14px" }}>
            Search
          </button>
        </form>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            className="prod-select-input"
            style={{ width: "130px" }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="ALL">All Priority</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          <select
            className="prod-select-input"
            style={{ width: "160px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Planning Status</option>
            <option value="READY_FOR_PLANNING">Ready for Planning</option>
            <option value="PLANNED">Already Planned</option>
          </select>

          <button
            type="button"
            onClick={handleResetFilters}
            className="prod-btn-secondary"
            style={{ height: "34px", padding: "0 10px" }}
            title="Reset Filters"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Eligible Jobs Table Card */}
      <div className="prod-card" style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
            Eligible Production Queue ({eligibleJobs.length})
          </span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            Only jobs with approved design sample or print-ready specs are shown
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="prod-ops-table">
            <thead>
              <tr>
                <th>Job No</th>
                <th>Customer</th>
                <th>Product & Specs</th>
                <th style={{ textAlign: "right" }}>Quantity</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Design Status</th>
                <th>Planning Status</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    Loading eligible production jobs...
                  </td>
                </tr>
              ) : eligibleJobs.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    No eligible jobs found for production planning.
                  </td>
                </tr>
              ) : (
                eligibleJobs.map((item) => {
                  const isPlanned = item.planningStatus === "PLANNED" || item.hasActiveOrder;
                  return (
                    <tr key={item.jobId || item._id || item.jobItemId}>
                      <td>
                        <strong style={{ fontFamily: "monospace", color: "#047857", fontSize: "12px" }}>
                          {item.jobNo}
                        </strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.customerName}</div>
                        <div style={{ fontSize: "10.5px", color: "#64748b" }}>{item.customerMobile}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.productName}</div>
                        <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                          {item.requirementSnapshot?.paperType || "Standard Cardstock"}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <strong>{item.requiredQuantity?.toLocaleString()}</strong>{" "}
                        <span style={{ fontSize: "10.5px", color: "#64748b" }}>{item.unit || "PCS"}</span>
                      </td>
                      <td>
                        <span className={`prod-badge prod-badge-${item.priority?.toLowerCase() || "normal"}`}>
                          {item.priority || "NORMAL"}
                        </span>
                      </td>
                      <td style={{ fontSize: "11.5px", color: "#334155" }}>
                        {item.expectedDelivery || item.dueDate || "—"}
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#047857" }}>
                          <CheckCircle2 size={13} color="#047857" />
                          Approved ({item.sampleVersion || "V1"})
                        </span>
                      </td>
                      <td>
                        {isPlanned ? (
                          <span className="prod-badge prod-badge-planned">
                            Planned ({item.existingProductionNo || "PO"})
                          </span>
                        ) : (
                          <span className="prod-badge prod-badge-ready">
                            Ready for Planning
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isPlanned ? (
                          <button
                            type="button"
                            onClick={() => onSelectJobForPlanning(item)}
                            className="prod-btn-secondary"
                            style={{ padding: "4px 10px", fontSize: "11px" }}
                          >
                            <Eye size={12} /> View Plan
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectJobForPlanning(item)}
                            className="prod-btn-primary"
                            style={{ padding: "4px 14px", fontSize: "11.5px" }}
                          >
                            Plan <ArrowRight size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
