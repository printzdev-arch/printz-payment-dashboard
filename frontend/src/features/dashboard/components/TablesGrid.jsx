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
  const defaultRecentJobs = [
    { id: "1", jobId: "JO-00125", customerName: "ABC Traders", designStatus: "Approved", productionStatus: "In Production", deliveryDate: "15 Oct 2026", priority: "High" },
    { id: "2", jobId: "JO-00124", customerName: "Sri Ganesh Stores", designStatus: "In Progress", productionStatus: "Pending", deliveryDate: "18 Oct 2026", priority: "Medium" },
    { id: "3", jobId: "JO-00123", customerName: "United Textiles", designStatus: "Revision Required", productionStatus: "Pending", deliveryDate: "20 Oct 2026", priority: "High" },
    { id: "4", jobId: "JO-00122", customerName: "Karthik Prints", designStatus: "Approved", productionStatus: "QC Pending", deliveryDate: "22 Oct 2026", priority: "Medium" },
    { id: "5", jobId: "JO-00121", customerName: "Priya Fashions", designStatus: "Pending", productionStatus: "Pending", deliveryDate: "25 Oct 2026", priority: "Low" },
  ];

  const defaultLowStock = [
    { id: "1", materialName: "Cotton Fabric (White)", availableQty: 50, minStock: 200, requiredQty: 150, status: "Low Stock" },
    { id: "2", materialName: "DTF Film (A3)", availableQty: 20, minStock: 100, requiredQty: 80, status: "Low Stock" },
    { id: "3", materialName: "Ink (Black)", availableQty: 5, minStock: 50, requiredQty: 45, status: "Low Stock" },
    { id: "4", materialName: "Sublimation Paper", availableQty: 10, minStock: 100, requiredQty: 90, status: "Low Stock" },
    { id: "5", materialName: "Heat Transfer Vinyl", availableQty: 0, minStock: 50, requiredQty: 50, status: "Out of Stock" },
  ];

  const defaultPendingPayments = [
    { id: "1", invoiceNo: "INV-00156", customerName: "ABC Traders", amount: 120000, pending: 40000, dueDate: "10 Oct 2026", status: "Overdue" },
    { id: "2", invoiceNo: "INV-00152", customerName: "Karthik Prints", amount: 85000, pending: 25000, dueDate: "18 Oct 2026", status: "Pending" },
    { id: "3", invoiceNo: "INV-00148", customerName: "Sri Ganesh Stores", amount: 60000, pending: 20000, dueDate: "25 Oct 2026", status: "Pending" },
  ];

  const defaultUpcomingDeliveries = [
    { id: "1", jobId: "JO-00120", customerName: "Priya Fashions", deliveryDate: "12 Oct 2026", status: "On Time" },
    { id: "2", jobId: "JO-00118", customerName: "ABC Traders", deliveryDate: "15 Oct 2026", status: "On Time" },
    { id: "3", jobId: "JO-00115", customerName: "United Textiles", deliveryDate: "18 Oct 2026", status: "Delayed" },
    { id: "4", jobId: "JO-00112", customerName: "RK Enterprises", deliveryDate: "20 Oct 2026", status: "On Time" },
  ];

  const defaultAlerts = [
    { id: "1", message: "5 Job orders delayed", type: "danger" },
    { id: "2", message: "3 materials are out of stock", type: "danger" },
    { id: "3", message: "8 materials below minimum stock level", type: "warning" },
    { id: "4", message: "2 design approvals pending", type: "info" },
    { id: "5", message: "4 payments overdue", type: "info" },
  ];

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
                      <td style={{ fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
                        {job.jobId}
                      </td>
                      <td style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                        {job.customerName}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className={getDesignStatusBadgeClass(job.designStatus)}>
                          {job.designStatus || "Pending"}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className={getProdStatusBadgeClass(job.productionStatus)}>
                          {job.productionStatus || "Pending"}
                        </span>
                      </td>
                      <td style={{ color: "#475569", whiteSpace: "nowrap" }}>
                        {job.deliveryDate}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className={getPriorityBadgeClass(job.priority)}>
                          {job.priority || "Normal"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
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
                        <td style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                          {item.materialName}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: isOutOfStock ? "#e11d48" : "#0f172a",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.availableQty}
                        </td>
                        <td style={{ textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>
                          {item.minStock}
                        </td>
                        <td style={{ textAlign: "right", color: "#475569", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {item.requiredQty}
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
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
                        <td style={{ fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
                          {p.invoiceNo}
                        </td>
                        <td style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                          {p.customerName}
                        </td>
                        <td style={{ textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>
                          {formatINR(p.amount)}
                        </td>
                        <td style={{ textAlign: "right", color: "#e11d48", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {formatINR(p.pending)}
                        </td>
                        <td style={{ color: "#475569", fontSize: "11.5px", whiteSpace: "nowrap" }}>
                          {p.dueDate}
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
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
                        <td style={{ fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
                          {d.jobId}
                        </td>
                        <td style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                          {d.customerName}
                        </td>
                        <td style={{ color: "#475569", whiteSpace: "nowrap" }}>
                          {d.deliveryDate}
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
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
