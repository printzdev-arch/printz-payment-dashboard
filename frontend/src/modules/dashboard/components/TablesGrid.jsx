import React from "react";
import { ArrowRight, AlertTriangle, Info } from "lucide-react";
import { Link } from "react-router-dom";
import "../styles/dashboard.css";

// INR currency formatter
const formatINR = (val) => {
  if (val === undefined || val === null) return "₹ 0";
  return (
    "₹ " +
    Number(val).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })
  );
};

// Design status badge styling
const getDesignStatusBadgeClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("approved")) return "printz-badge badge-approved";
  if (s.includes("progress")) return "printz-badge badge-progress";
  if (s.includes("revision") || s.includes("reject")) return "printz-badge badge-revision";
  return "printz-badge badge-pending";
};

// Production status badge styling
const getProdStatusBadgeClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("production")) return "printz-badge badge-production";
  if (s.includes("qc") || s.includes("check")) return "printz-badge badge-qc";
  if (s.includes("complete") || s.includes("done")) return "printz-badge badge-approved";
  return "printz-badge badge-pending";
};

// Priority badge styling
const getPriorityBadgeClass = (priority) => {
  const p = String(priority || "").toLowerCase();
  if (p === "high" || p === "urgent") return "printz-badge badge-high";
  if (p === "medium" || p === "normal") return "printz-badge badge-medium";
  return "printz-badge badge-low";
};

const TablesGrid = ({
  recentJobOrders = [],
  lowStockItems = [],
  pendingPayments = [],
  upcomingDeliveries = [],
  alerts = [],
  onViewJobOrder,
}) => {
  // Default data matching reference mockup if backend is still populating
  const defaultRecentJobs = []; // no sample rows: only real data is shown

  const defaultLowStock = []; // no sample rows: only real data is shown

  const defaultPendingPayments = []; // no sample rows: only real data is shown

  const defaultUpcomingDeliveries = []; // no sample rows: only real data is shown

  const defaultAlerts = []; // no sample rows: only real data is shown

  const jobsList = recentJobOrders.length > 0 ? recentJobOrders : defaultRecentJobs;
  const stockList = lowStockItems.length > 0 ? lowStockItems : defaultLowStock;
  const paymentsList = pendingPayments.length > 0 ? pendingPayments : defaultPendingPayments;
  const deliveriesList = upcomingDeliveries.length > 0 ? upcomingDeliveries : defaultUpcomingDeliveries;
  const alertsList = alerts.length > 0 ? alerts : defaultAlerts;

  return (
    <div>
      {/* ========================================================
          ROW 1: Recent Job Orders (Table 1) + Low Stock Items (Table 2)
         ======================================================== */}
      <div className="printz-tables-row printz-tables-row-1">
        {/* Table 1: Recent Job Orders */}
        <div className="printz-table-card">
          <div>
            <div className="printz-card-header">
              <h3 className="printz-card-title">Recent Job Orders</h3>
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
                    <th>Design Status</th>
                    <th>Production Status</th>
                    <th>Delivery Date</th>
                    <th>Priority</th>
                    <th style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsList.slice(0, 5).map((job) => (
                    <tr key={job.id || job.jobId}>
                      <td data-label="Job ID" style={{ fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
                        {job.jobId}
                      </td>
                      <td data-label="Customer Name" style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                        {job.customerName}
                      </td>
                      <td data-label="Design Status" style={{ whiteSpace: "nowrap" }}>
                        <span className={getDesignStatusBadgeClass(job.designStatus)}>
                          {job.designStatus || "Pending"}
                        </span>
                      </td>
                      <td data-label="Production Status" style={{ whiteSpace: "nowrap" }}>
                        <span className={getProdStatusBadgeClass(job.productionStatus)}>
                          {job.productionStatus || "Pending"}
                        </span>
                      </td>
                      <td data-label="Delivery Date" style={{ color: "#475569", whiteSpace: "nowrap" }}>
                        {job.deliveryDate}
                      </td>
                      <td data-label="Priority" style={{ whiteSpace: "nowrap" }}>
                        <span className={getPriorityBadgeClass(job.priority)}>
                          {job.priority || "Normal"}
                        </span>
                      </td>
                      <td data-label="Action" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          onClick={() => onViewJobOrder && onViewJobOrder(job)}
                          className="printz-pill-btn"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Table 2: Low Stock Items */}
        <div className="printz-table-card">
          <div>
            <div className="printz-card-header">
              <h3 className="printz-card-title">Low Stock Items</h3>
              <Link to="/inventory" className="printz-view-all-link">
                View All <ArrowRight size={13} />
              </Link>
            </div>

            <div className="printz-table-wrap">
              <table className="printz-data-table">
                <thead>
                  <tr>
                    <th>Material Name</th>
                    <th style={{ textAlign: "right" }}>Available Qty</th>
                    <th style={{ textAlign: "right" }}>Min Stock</th>
                    <th style={{ textAlign: "right" }}>Required Qty</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stockList.slice(0, 5).map((item) => {
                    const isOutOfStock = item.availableQty === 0 || item.status === "Out of Stock";
                    return (
                      <tr key={item.id || item.materialName}>
                        <td data-label="Material Name" style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                          {item.materialName}
                        </td>
                        <td data-label="Available Qty"
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: isOutOfStock ? "#e11d48" : "#0f172a",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.availableQty}
                        </td>
                        <td data-label="Min Stock" style={{ textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>
                          {item.minStock}
                        </td>
                        <td data-label="Required Qty" style={{ textAlign: "right", color: "#475569", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {item.requiredQty}
                        </td>
                        <td data-label="Status" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <span
                            className={
                              isOutOfStock
                                ? "printz-badge badge-outstock"
                                : "printz-badge badge-lowstock"
                            }
                          >
                            {item.status || (isOutOfStock ? "Out of Stock" : "Low Stock")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          ROW 2: Pending Payments + Upcoming Deliveries + Alerts & Notifications
         ======================================================== */}
      <div className="printz-tables-row printz-tables-row-2">
        {/* Table 3: Pending Payments */}
        <div className="printz-table-card">
          <div>
            <div className="printz-card-header">
              <h3 className="printz-card-title">Pending Payments</h3>
              <Link to="/payments" className="printz-view-all-link">
                View All <ArrowRight size={13} />
              </Link>
            </div>

            <div className="printz-table-wrap">
              <table className="printz-data-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Customer Name</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th style={{ textAlign: "right" }}>Pending</th>
                    <th>Due Date</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsList.slice(0, 4).map((p) => {
                    const isOverdue = String(p.status || "").toLowerCase().includes("overdue");
                    return (
                      <tr key={p.id || p.invoiceNo}>
                        <td data-label="Invoice No" style={{ fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
                          {p.invoiceNo}
                        </td>
                        <td data-label="Customer Name" style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                          {p.customerName}
                        </td>
                        <td data-label="Amount" style={{ textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>
                          {formatINR(p.amount)}
                        </td>
                        <td data-label="Pending" style={{ textAlign: "right", color: "#e11d48", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {formatINR(p.pending)}
                        </td>
                        <td data-label="Due Date" style={{ color: "#475569", fontSize: "11.5px", whiteSpace: "nowrap" }}>
                          {p.dueDate}
                        </td>
                        <td data-label="Status" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <span
                            className={
                              isOverdue
                                ? "printz-badge badge-overdue"
                                : "printz-badge badge-pending"
                            }
                          >
                            {p.status || "Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Table 4: Upcoming Deliveries */}
        <div className="printz-table-card">
          <div>
            <div className="printz-card-header">
              <h3 className="printz-card-title">Upcoming Deliveries</h3>
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
                    <th>Delivery Date</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveriesList.slice(0, 4).map((d) => {
                    const isDelayed = String(d.status || "").toLowerCase().includes("delayed");
                    return (
                      <tr key={d.id || d.jobId}>
                        <td data-label="Job ID" style={{ fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
                          {d.jobId}
                        </td>
                        <td data-label="Customer Name" style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                          {d.customerName}
                        </td>
                        <td data-label="Delivery Date" style={{ color: "#475569", whiteSpace: "nowrap" }}>
                          {d.deliveryDate}
                        </td>
                        <td data-label="Status" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <span
                            className={
                              isDelayed
                                ? "printz-badge badge-delayed"
                                : "printz-badge badge-ontime"
                            }
                          >
                            {d.status || "On Time"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Card 5: Alerts & Notifications */}
        <div className="printz-table-card">
          <div>
            <div className="printz-card-header">
              <h3 className="printz-card-title">Alerts & Notifications</h3>
              <Link to="/reports" className="printz-view-all-link">
                View All <ArrowRight size={13} />
              </Link>
            </div>

            <div className="printz-alert-list">
              {alertsList.map((alert, idx) => {
                const isDanger = alert.type === "danger" || alert.severity === "danger" || idx < 2;
                const isWarning = alert.type === "warning" || alert.severity === "warning" || idx === 2;

                return (
                  <div key={alert.id || idx} className="printz-alert-item">
                    {isDanger ? (
                      <span className="printz-alert-icon danger">
                        <AlertTriangle size={15} />
                      </span>
                    ) : isWarning ? (
                      <span className="printz-alert-icon warning">
                        <AlertTriangle size={15} />
                      </span>
                    ) : (
                      <span className="printz-alert-icon info">
                        <Info size={15} />
                      </span>
                    )}
                    <span>{alert.message}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TablesGrid;
