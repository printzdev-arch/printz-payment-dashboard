import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  Building,
  Calendar,
  CreditCard,
  Briefcase,
  Star,
  Edit,
  Plus,
  ArrowRight,
  CheckCircle2,
  FileText,
  Clock,
  Eye,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Badge from "../../../shared/components/Badge";
import Card from "../../../shared/components/Card";
import { getJobs } from "../../job/api/jobApi";
import "../styles/customerV3.css";

export default function CustomerDetailsView({
  customer,
  onEdit,
  onProceedToJob,
  onClose,
  className = ""
}) {
  const navigate = useNavigate();
  const [jobOrders, setJobOrders] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const customerId = customer?.id || customer?._id || customer?.customerId;

  useEffect(() => {
    if (customerId) {
      loadJobs();
    }
  }, [customerId]);

  const loadJobs = async () => {
    setLoadingJobs(true);
    try {
      const data = await getJobs({ customerId });
      const filtered = Array.isArray(data)
        ? data.filter(
            (j) =>
              j.customerId === customerId ||
              (customer.customerCode && j.customerCode === customer.customerCode) ||
              (customer.mobile && j.customerMobile === customer.mobile)
          )
        : [];
      setJobOrders(filtered);
    } catch (err) {
      console.error("Failed to load customer job orders:", err);
      setJobOrders([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleStartSale = () => {
    if (onProceedToSale) {
      onProceedToSale(customer);
    } else {
      navigate("/v3/sales-pos/new", { state: { customer } });
    }
  };

  const handleStartJobOrder = () => {
    if (onProceedToJob) {
      onProceedToJob(customer);
    } else {
      const cusId = customer._id || customer.id || customer.customerId;
      const url = cusId && /^[0-9a-fA-F]{24}$/.test(String(cusId))
        ? `/v3/jobs/new?customerId=${cusId}`
        : `/v3/jobs/new`;
      navigate(url, { state: { customer } });
    }
  };

  if (!customer) return null;

  const realJobsCount = jobOrders.length;

  return (
    <div className={`v3-customer-container ${className}`}>
      {/* Top Profile Summary Card */}
      <div className="v3-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
              <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                {customer.name}
              </h2>
              <Badge variant={customer.customerType === "BUSINESS" ? "b2b" : "individual"}>
                {customer.customerType || "INDIVIDUAL"}
              </Badge>
              <Badge variant={customer.isActive !== false ? "active" : "neutral"}>
                {customer.status || "Active"}
              </Badge>
              <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 700, padding: "2px 8px", backgroundColor: "#f1f5f9", borderRadius: "6px" }}>
                {customer.customerCode || customer.customerId || customer.id}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", fontSize: "12px", color: "#64748b" }}>
              {customer.contactPerson && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <User size={14} color="#94a3b8" />
                  <strong style={{ color: "#334155" }}>{customer.contactPerson}</strong>
                </span>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Phone size={14} color="#047857" />
                <strong style={{ color: "#0f172a", fontFamily: "monospace" }}>{customer.mobile}</strong>
              </span>
              {customer.email && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Mail size={14} color="#94a3b8" />
                  {customer.email}
                </span>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Calendar size={14} color="#94a3b8" />
                Created at {customer.branchName || "Banaswadi"}
              </span>
            </div>
          </div>

          {/* Quick CTA Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(customer)}
                className="v3-btn-secondary"
                style={{ fontSize: "12px", padding: "8px 14px" }}
              >
                <Edit size={13} />
                <span>Edit</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStartJobOrder}
              className="v3-btn-primary"
              style={{ fontSize: "12px", padding: "8px 18px", backgroundColor: "#047857", borderColor: "#047857", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
            >
              <Plus size={14} />
              <span>New Job Order</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="v3-stats-grid">
          <div className="v3-stat-card">
            <div className="v3-stat-icon" style={{ backgroundColor: "#ecfdf5", color: "#047857" }}>
              <Briefcase size={18} />
            </div>
            <div>
              <p className="v3-stat-value">{realJobsCount}</p>
              <p className="v3-stat-label">Job orders (2026)</p>
            </div>
          </div>

          <div className="v3-stat-card">
            <div className="v3-stat-icon" style={{ backgroundColor: "#faf5ff", color: "#7e22ce" }}>
              <Star size={18} fill="#7e22ce" />
            </div>
            <div>
              <p className="v3-stat-value">{customer.avgRating || 5}</p>
              <p className="v3-stat-label">Avg. job rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* Left Column: Details */}
        <Card title="Customer Details" icon={User}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Customer Code:</span>
              <strong style={{ fontFamily: "monospace", color: "#0f172a" }}>{customer.customerCode || customer.customerId || customer.id}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Name:</span>
              <strong style={{ color: "#0f172a" }}>{customer.name}</strong>
            </div>

            {customer.contactPerson && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Contact Person:</span>
                <strong style={{ color: "#0f172a" }}>{customer.contactPerson}</strong>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Mobile:</span>
              <strong style={{ color: "#047857", fontFamily: "monospace" }}>+91 {customer.mobile}</strong>
            </div>

            {customer.email && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Email:</span>
                <span style={{ color: "#0f172a" }}>{customer.email}</span>
              </div>
            )}

            {customer.gstNumber && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>GSTIN:</span>
                <strong style={{ fontFamily: "monospace", color: "#0f172a" }}>{customer.gstNumber}</strong>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Address:</span>
              <span style={{ color: "#334155", textAlign: "right" }}>{customer.address || "—"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Customer Type:</span>
              <span style={{ color: "#0f172a", fontWeight: 700 }}>{customer.customerType || "INDIVIDUAL"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>WhatsApp opt-in:</span>
              <span style={{ color: "#047857", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                <CheckCircle2 size={13} /> {customer.whatsAppOptIn !== false ? "Yes" : "No"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Status:</span>
              <span style={{ color: customer.isActive !== false ? "#15803d" : "#64748b", fontWeight: 700 }}>
                {customer.status || (customer.isActive !== false ? "Active" : "Inactive")}
              </span>
            </div>
          </div>
        </Card>

        {/* Right Column: Job Orders History */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="v3-card">
            <div className="v3-card-header">
              <strong style={{ fontSize: "13px", color: "#0f172a" }}>Associated Job Orders ({realJobsCount})</strong>
              <button
                type="button"
                onClick={handleStartJobOrder}
                style={{ fontSize: "11px", fontWeight: 700, color: "#047857", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                + New Job Order <ArrowRight size={12} />
              </button>
            </div>

            {loadingJobs ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                <Loader2 size={24} className="v3-spin" style={{ margin: "0 auto 8px auto" }} />
                <p style={{ margin: 0, fontSize: "13px" }}>Loading job orders...</p>
              </div>
            ) : jobOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "36px 16px" }}>
                <Briefcase size={36} color="#94a3b8" style={{ marginBottom: "8px" }} />
                <p style={{ margin: "0 0 4px 0", fontWeight: 700, color: "#1e293b", fontSize: "14px" }}>
                  No Job Orders Yet
                </p>
                <p style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: "12px" }}>
                  This customer has not placed any job orders yet. Click below to create their first job order.
                </p>
                <button
                  type="button"
                  onClick={handleStartJobOrder}
                  className="v3-btn-primary"
                  style={{ fontSize: "12px", padding: "8px 18px", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                >
                  <Plus size={14} />
                  <span>Create First Job Order</span>
                </button>
              </div>
            ) : (
              <div className="v3-table-wrapper">
                <table className="v3-table">
                  <thead>
                    <tr>
                      <th>Job No</th>
                      <th>Order Date</th>
                      <th>Job Title</th>
                      <th>Qty</th>
                      <th>Stage</th>
                      <th>Priority</th>
                      <th style={{ textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobOrders.map((job) => (
                      <tr key={job.id || job._id || job.jobId || job.jobNo}>
                        <td>
                          <strong style={{ fontFamily: "monospace", color: "#047857" }}>
                            {job.jobNo || job.jobId || job.id}
                          </strong>
                        </td>
                        <td>{job.orderDate || (job.createdAt ? new Date(job.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—")}</td>
                        <td>{job.jobTitle || job.items?.[0]?.itemName || "Print Job"}</td>
                        <td>{job.totalQuantity || job.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || "—"}</td>
                        <td>
                          <Badge variant={job.status === "DELIVERED" ? "active" : "business"}>
                            {job.status || "REQUIREMENT_CAPTURED"}
                          </Badge>
                        </td>
                        <td>
                          <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", backgroundColor: job.priority === "URGENT" ? "#fee2e2" : "#f1f5f9", color: job.priority === "URGENT" ? "#b91c1c" : "#475569" }}>
                            {job.priority || "NORMAL"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/v3/jobs/${job.id || job._id || job.jobId || job.jobNo}`)}
                            className="v3-btn-secondary"
                            style={{ padding: "3px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ padding: "14px 18px", backgroundColor: "#f8fafc", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#64748b" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <FileText size={14} color="#047857" />
                Customer record is synchronized with <strong>Job Order Workflow</strong>.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="v3-btn-secondary"
                style={{ fontSize: "11px", padding: "4px 12px", cursor: "pointer" }}
              >
                Back to Entry
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

