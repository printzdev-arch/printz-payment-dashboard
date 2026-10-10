import React, { useState, useEffect } from "react";
import {
  Layers,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Calendar,
  Clock,
  CheckCircle2,
  Building2,
  ArrowRight
} from "lucide-react";
import { getProductionOrders } from "../api/productionApi";

export default function ProductionOrdersView({
  onSelectOrder,
  onNavigateToPlanning,
  branchName = "Kothanur"
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  useEffect(() => {
    loadOrders();
  }, [statusFilter, priorityFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getProductionOrders({
        search: searchQuery,
        status: statusFilter,
        priority: priorityFilter
      });
      setOrders(data || []);
    } catch (err) {
      console.error("Failed to load production orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadOrders();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
  };

  return (
    <div className="prod-container">
      {/* Header Bar */}
      <div className="prod-header-bar">
        <div className="prod-title-group">
          <div className="prod-breadcrumb">
            <span>Production</span>
            <span>/</span>
            <span style={{ color: "#0f172a", fontWeight: 600 }}>Production Orders</span>
          </div>
          <h1 className="prod-title">
            <Layers size={22} color="#047857" />
            Production Orders
          </h1>
        </div>

        <button
          type="button"
          onClick={onNavigateToPlanning}
          className="prod-btn-primary"
          style={{ padding: "8px 16px" }}
        >
          <Layers size={14} />
          + Plan New Job
        </button>
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
              placeholder="Search Production No, Job No, Customer..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

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

      {/* Orders Table Card */}
      <div className="prod-card" style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
            Released Production Orders ({orders.length})
          </span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            Initial state is PLANNED with Cycle 0
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="prod-ops-table">
            <thead>
              <tr>
                <th>Production No</th>
                <th>Job Reference</th>
                <th>Customer</th>
                <th>Product Item</th>
                <th style={{ textAlign: "right" }}>Planned Qty</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Planned Schedule</th>
                <th>Operations</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    Loading production orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    No production orders found. Plan an eligible job to create an order.
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.productionOrderId || po.id}>
                    <td>
                      <strong style={{ fontFamily: "monospace", color: "#047857", fontSize: "12.5px" }}>
                        {po.productionNo}
                      </strong>
                    </td>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#334155", fontWeight: 600 }}>
                        {po.jobNo}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{po.customerName}</div>
                      <div style={{ fontSize: "10.5px", color: "#64748b" }}>{po.customerMobile}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{po.productName}</div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>{po.plannedQty?.toLocaleString()}</strong>{" "}
                      <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                        (Req: {po.requiredQty?.toLocaleString()})
                      </span>
                    </td>
                    <td>
                      <span className={`prod-badge prod-badge-${po.priority?.toLowerCase() || "normal"}`}>
                        {po.priority || "NORMAL"}
                      </span>
                    </td>
                    <td>
                      <span className="prod-badge prod-badge-planned">
                        {po.status || "PLANNED"}
                      </span>
                    </td>
                    <td style={{ fontSize: "11.5px", color: "#334155" }}>
                      {new Date(po.plannedStart || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#047857" }}>
                        {po.operations?.length || 0} Steps
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => onSelectOrder(po)}
                        className="prod-btn-secondary"
                        style={{ padding: "4px 12px", fontSize: "11.5px" }}
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
