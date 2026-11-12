import React from "react";
import { ArrowRight, AlertTriangle, Info, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import "../styles/dashboard.css";

// Rupee currency formatter
const formatINR = (val) => {
  if (val === undefined || val === null) return "₹ 0";
  return (
    "₹ " +
    Number(val).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })
  );
};

// Status badge styling matching reference UI
const getStatusBadge = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("production")) return { text: "In Production", cls: "printz-badge badge-production" };
  if (s.includes("design")) return { text: "Design", cls: "printz-badge badge-revision" };
  if (s.includes("qc") || s.includes("check")) return { text: "QC", cls: "printz-badge badge-qc" };
  if (s.includes("approval") || s.includes("pending")) return { text: "Pending Approval", cls: "printz-badge badge-pending" };
  if (s.includes("complete") || s.includes("done")) return { text: "Completed", cls: "printz-badge badge-approved" };
  if (s.includes("active")) return { text: "Active", cls: "printz-badge badge-approved" };
  return { text: status, cls: "printz-badge badge-low" };
};

const AdminTablesGrid = ({
  branchPerformance = [],
  topBranches = [],
  recentJobOrders = [],
  lowStockItems = [],
  alerts = [],
  onViewJobOrder,
  selectedBranch = "ALL",
  selectedBranchName = "All Branches",
}) => {
  const isAll = !selectedBranch || String(selectedBranch).toUpperCase() === "ALL";

  // 1. Table 1: Branch Performance Summary (Matching Reference Mockup)
  const defaultBranchPerformance = []; // no sample rows: only real data is shown

  // 2. Table 2: Top Branches by Revenue
  const defaultTopBranches = []; // no sample rows: only real data is shown

  // 3. Table 3: Recent Job Orders
  const defaultRecentJobs = []; // no sample rows: only real data is shown

  // 4. Table 4: Low Stock Items
  const defaultLowStock = []; // no sample rows: only real data is shown

  // 5. Important Alerts & Notifications
  const defaultAlerts = []; // no sample rows: only real data is shown

  const branchList = React.useMemo(() => {
    if (isAll) return branchPerformance.length > 0 ? branchPerformance : defaultBranchPerformance;
    return branchPerformance.filter((b) => String(b.id) === String(selectedBranch));
  }, [branchPerformance, isAll, selectedBranch, selectedBranchName]);

  const topList = topBranches.length > 0 ? topBranches : defaultTopBranches;

  const jobsList = React.useMemo(() => {
    const raw = recentJobOrders.length > 0 ? recentJobOrders : defaultRecentJobs;
    if (isAll) return raw;
    return raw.map((j) => ({ ...j, branch: selectedBranchName || "Selected Branch" }));
  }, [recentJobOrders, isAll, selectedBranchName]);

  const stockList = React.useMemo(() => {
    const raw = lowStockItems.length > 0 ? lowStockItems : defaultLowStock;
    if (isAll) return raw;
    return raw.map((s) => ({ ...s, branch: selectedBranchName || "Selected Branch" }));
  }, [lowStockItems, isAll, selectedBranchName]);

  const alertsList = alerts.length > 0 ? alerts : defaultAlerts;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ========================================================
          ROW 1: Branch Performance (Table 1) + Top Branches by Revenue (Table 2)
         ======================================================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: "20px",
        }}
        className="printz-admin-tables-row-1"
      >
        {/* Table 1: Branch Performance Summary */}
        <div className="printz-table-card">
          <div className="printz-card-header">
            <div>
              <h3 className="printz-card-title">Branch Performance</h3>
              
            </div>
            <Link to="/branches" className="printz-view-all-link">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          <div className="printz-table-wrap">
            <table className="printz-data-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Manager</th>
                  <th style={{ textAlign: "center" }}>Total Jobs</th>
                  <th style={{ textAlign: "center" }}>Completed</th>
                  <th>Revenue</th>
                  <th>Pending Amount</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {branchList.map((row) => (
                  <tr key={row.id || row.branch}>
                    <td style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                      {row.branch}
                    </td>
                    <td style={{ color: "#475569", whiteSpace: "nowrap" }}>{row.manager}</td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{row.totalJobs}</td>
                    <td style={{ textAlign: "center", fontWeight: 600, color: "#0d6245" }}>
                      {row.completed}
                    </td>
                    <td style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                      {formatINR(row.revenue)}
                    </td>
                    <td style={{ fontWeight: 600, color: "#e11d48", whiteSpace: "nowrap" }}>
                      {formatINR(row.pendingAmount)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="printz-badge badge-approved">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Top Branches by Revenue */}
        <div className="printz-table-card">
          <div className="printz-card-header">
            <div>
              <h3 className="printz-card-title">Top Branches by Revenue</h3>
             
            </div>
            <Link to="/branches" className="printz-view-all-link">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          <div className="printz-table-wrap">
            <table className="printz-data-table">
              <thead>
                <tr>
                  <th style={{ width: "36px", textAlign: "center" }}>#</th>
                  <th>Branch</th>
                  <th>Revenue</th>
                  <th style={{ textAlign: "center" }}>Growth</th>
                  <th style={{ textAlign: "center" }}>Jobs</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {topList.map((row) => (
                  <tr key={row.rank || row.branch}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#475569" }}>
                      {row.rank}
                    </td>
                    <td style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                      {row.branch}
                    </td>
                    <td style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                      {formatINR(row.revenue)}
                    </td>
                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <span className="printz-kpi-trend-up" style={{ fontSize: "11px" }}>
                        <TrendingUp size={11} strokeWidth={2.8} />
                        {row.growth ?? "-"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{row.jobs}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className="printz-badge badge-approved">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================
          ROW 2: Recent Job Orders (Table 3) + Low Stock Items (Table 4) + Alerts
         ======================================================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1.1fr 1fr",
          gap: "20px",
        }}
        className="printz-admin-tables-row-2"
      >
        {/* Table 3: Recent Job Orders (All Branches) */}
        <div className="printz-table-card">
          <div className="printz-card-header">
            <div>
              <h3 className="printz-card-title">Recent Job Orders</h3>
              <span className="printz-card-subtitle">(All Branches)</span>
            </div>
            <Link to="/job-orders" className="printz-view-all-link">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          <div className="printz-table-wrap">
            <table className="printz-data-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Customer Name</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Delivery Date</th>
                  <th>Amount</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobsList.slice(0, 5).map((job) => {
                  const badge = getStatusBadge(job.status || job.designStatus);
                  return (
                    <tr key={job.id || job.jobId}>
                      <td style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                        {job.jobId}
                      </td>
                      <td style={{ fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
                        {job.customerName}
                      </td>
                      <td style={{ color: "#475569", whiteSpace: "nowrap" }}>{job.branch || "-"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className={badge.cls}>{badge.text}</span>
                      </td>
                      <td style={{ color: "#475569", whiteSpace: "nowrap", fontSize: "11.5px" }}>
                        {job.deliveryDate}
                      </td>
                      <td style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                        {formatINR(job.amount || 0)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => onViewJobOrder && onViewJobOrder(job)}
                          className="printz-btn-action-view"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 4: Low Stock Items (All Branches) */}
        <div className="printz-table-card">
          <div className="printz-card-header">
            <div>
              <h3 className="printz-card-title">Low Stock Items</h3>
              <span className="printz-card-subtitle">(All Branches)</span>
            </div>
            <Link to="/inventory" className="printz-view-all-link">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          <div className="printz-table-wrap">
            <table className="printz-data-table">
              <thead>
                <tr>
                  <th>Material Name</th>
                  <th>Branch</th>
                  <th style={{ textAlign: "center" }}>Available</th>
                  <th style={{ textAlign: "center" }}>Min Stock</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stockList.slice(0, 5).map((item) => (
                  <tr key={item.id || item.materialName}>
                    <td style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                      {item.materialName}
                    </td>
                    <td style={{ color: "#475569", whiteSpace: "nowrap" }}>{item.branch || "-"}</td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#e11d48" }}>
                      {item.available ?? item.availableQty ?? 0}
                    </td>
                    <td style={{ textAlign: "center", color: "#475569" }}>
                      {item.minStock ?? 0}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="printz-badge badge-low">Low Stock</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 5: Important Alerts & Notifications */}
        <div className="printz-table-card">
          <div className="printz-card-header">
            <div>
              <h3 className="printz-card-title">Alerts & Notifications</h3>
              <span className="printz-card-subtitle" style={{ color: "#e11d48" }}>
                (Important Alerts - Requires attention)
              </span>
            </div>
          </div>

          <div className="printz-alerts-list">
            {alertsList.map((alert) => (
              <div
                key={alert.id}
                className={`printz-alert-item ${
                  alert.type === "danger"
                    ? "danger"
                    : alert.type === "warning"
                    ? "warning"
                    : "info"
                }`}
              >
                <div className="printz-alert-icon">
                  {alert.type === "danger" ? (
                    <AlertTriangle size={15} color="#e11d48" />
                  ) : alert.type === "warning" ? (
                    <Clock size={15} color="#d97706" />
                  ) : (
                    <Info size={15} color="#0284c7" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="printz-alert-text">{alert.message}</div>
                  {alert.time && (
                    <div style={{ fontSize: "10.5px", color: "#475569", marginTop: "2px" }}>
                      {alert.time}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTablesGrid;
