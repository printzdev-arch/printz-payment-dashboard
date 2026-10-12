import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Building,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  PlusCircle,
  Edit2,
  DollarSign,
  Briefcase,
  CheckCircle,
  Clock,
  Layers,
  Eye,
  ShieldCheck,
  Receipt,
  Download,
} from "lucide-react";
import JobFlowLayout from "../components/JobFlowLayout";
import StatusBadge from "../components/StatusBadge";
import JobFlowDataTable from "../components/JobFlowDataTable";
import CustomerModal from "../components/CustomerModal";
import JobOrderProcessDetailModal from "../components/JobOrderProcessDetailModal";
import jobFlowApi from "../api/jobFlowApi";
import { toast } from "react-toastify";

export const CustomerViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [jobOrders, setJobOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProcessJob, setSelectedProcessJob] = useState(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  useEffect(() => {
    loadCustomerAndJobs();
  }, [id]);

  const loadCustomerAndJobs = async () => {
    setLoading(true);
    try {
      // 1. Fetch Customer
      let custData = null;
      try {
        const custRes = await jobFlowApi.getCustomerById(id);
        custData = custRes?.data || custRes;
      } catch (err) {
        console.error("Failed to load customer by ID:", err);
      }

      if (!custData || !custData.name) {
        setCustomer(null);
        setJobOrders([]);
        setLoading(false);
        return;
      }
      setCustomer(custData);

      // 2. Fetch Job Orders strictly belonging to this Customer ID
      let jobsList = [];
      const custDbId = custData._id || id;
      try {
        const jobsRes = await jobFlowApi.getJobOrders({ customerId: custDbId, limit: 100 });
        if (jobsRes?.data?.items && Array.isArray(jobsRes.data.items)) {
          jobsList = jobsRes.data.items;
        } else if (Array.isArray(jobsRes?.data)) {
          jobsList = jobsRes.data;
        } else if (Array.isArray(jobsRes)) {
          jobsList = jobsRes;
        }

        // Resilient fallback: if zero jobs found by ID, also check by customer name/mobile
        if (jobsList.length === 0 && (custData.name || custData.mobile || custData.phone)) {
          const fallbackRes = await jobFlowApi.getJobOrders({ search: custData.name, limit: 100 });
          const candidateJobs = fallbackRes?.data?.items || fallbackRes?.data || fallbackRes || [];
          if (Array.isArray(candidateJobs)) {
            jobsList = candidateJobs.filter((j) => {
              const jCustId = String(j.customerId?._id || j.customerId || "");
              const matchId = jCustId && (jCustId === String(custDbId) || jCustId === String(id));
              const matchPhone = (custData.mobile && (j.customerPhone === custData.mobile || j.customerSnapshot?.mobile === custData.mobile)) ||
                                 (custData.phone && (j.customerPhone === custData.phone || j.customerSnapshot?.mobile === custData.phone));
              const matchName = custData.name && (
                (j.customerName && j.customerName.toLowerCase() === custData.name.toLowerCase()) ||
                (j.customerSnapshot?.name && j.customerSnapshot.name.toLowerCase() === custData.name.toLowerCase())
              );
              return matchId || matchPhone || matchName;
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch customer job orders:", e);
      }

      // Strictly show actual customer job orders from database (no mock fallbacks)
      setJobOrders(jobsList);
    } catch (err) {
      toast.error("Failed to load customer profile details");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProcessModal = (job) => {
    setSelectedProcessJob(job);
    setIsProcessModalOpen(true);
  };

  if (loading && !customer) {
    return (
      <JobFlowLayout title="Loading Customer Profile...">
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          Loading customer information...
        </div>
      </JobFlowLayout>
    );
  }

  if (!customer) {
    return (
      <JobFlowLayout title="Customer Not Found">
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          <h3>Customer profile could not be found.</h3>
          <button
            type="button"
            className="jf-btn jf-btn-primary"
            style={{ marginTop: "1rem" }}
            onClick={() => navigate("/jobflow/customers")}
          >
            Back to Customers List
          </button>
        </div>
      </JobFlowLayout>
    );
  }

  const name = customer.name || customer.companyName || "Customer Profile";
  const code = customer.customerCode || customer.code || "CUST";
  const type = customer.customerType || (customer.type === "company" ? "Company" : "Individual");

  // Format customer address reliably
  let formattedAddress = "No registered address provided";
  if (typeof customer.address === "string" && customer.address.trim()) {
    formattedAddress = customer.address.trim();
  } else if (customer.address && typeof customer.address === "object") {
    const parts = [
      customer.address.line1 || customer.address.street,
      customer.address.line2,
      customer.address.city,
      customer.address.state,
      customer.address.postalCode || customer.address.postcode,
    ].filter(Boolean);
    if (parts.length > 0) formattedAddress = parts.join(", ");
  }

  // Calculate stats strictly from real job orders belonging to this customer
  const stats = {
    totalJobs: jobOrders.length,
    activeJobs: jobOrders.filter((j) => !["COMPLETED", "SETTLED", "DELIVERED"].includes(j.status || j.currentStage)).length,
    completedJobs: jobOrders.filter((j) => ["COMPLETED", "SETTLED", "DELIVERED"].includes(j.status || j.currentStage)).length,
    totalInvoiced: jobOrders.reduce((sum, j) => sum + (Number(j.totalAmount || j.grandTotal || j.estimatedCost) || 0), 0),
    advancePaid: jobOrders.reduce((sum, j) => sum + (Number(j.advancePaid) || 0), 0),
    outstanding: jobOrders.reduce((sum, j) => sum + Math.max(0, (Number(j.totalAmount || j.grandTotal || j.estimatedCost) || 0) - (Number(j.advancePaid) || 0)), 0),
  };

  return (
    <JobFlowLayout
      title={`Customer Profile: ${name}`}
      subtitle={`Complete customer directory account, contact details, commercial history & all active job orders`}
      actions={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit2 size={14} /> Edit Customer
          </button>
          <button
            type="button"
            className="jf-btn jf-btn-primary jf-btn-sm"
            onClick={() => navigate(`/jobflow/jobs/new?customerId=${customer._id || id}`)}
          >
            <PlusCircle size={15} /> + New Job Order
          </button>
        </div>
      }
    >
      {/* Back Navigation Bar */}
      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          className="jf-btn jf-btn-secondary jf-btn-sm"
          onClick={() => navigate("/jobflow/customers")}
        >
          <ArrowLeft size={15} /> Back to Customer List
        </button>
      </div>

      {/* Customer Header Banner */}
      <div
        className="jf-card"
        style={{
          background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
          color: "#ffffff",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                fontWeight: 800,
                border: "2px solid rgba(255, 255, 255, 0.4)",
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
                  {name}
                </h2>
                <span className="jf-badge" style={{ background: "rgba(255, 255, 255, 0.2)", color: "#ffffff", border: "1px solid rgba(255, 255, 255, 0.3)" }}>
                  {type}
                </span>
                <span className="jf-badge jf-badge-green">
                  {customer.status || "Active"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.4rem", fontSize: "0.8125rem", color: "#a7f3d0", flexWrap: "wrap" }}>
                <span>Code: <strong>{code}</strong></span>
                <span>Phone: <strong>{customer.phone || customer.mobile || "N/A"}</strong></span>
                <span>Email: <strong>{customer.email || "N/A"}</strong></span>
                <span>Default Branch: <strong>{customer.branchId?.name || customer.branchName || customer.defaultBranch || "Banaswadii"}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="jf-btn jf-btn-primary"
              style={{ background: "#ffffff", color: "#064e3b", fontWeight: 700 }}
              onClick={() => navigate(`/jobflow/jobs/new?customerId=${customer._id || id}`)}
            >
              <PlusCircle size={16} /> Place Job Order
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards: Account Info on Left, Financial KPI Metrics on Right */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* Contact & Registration Information */}
        <div className="jf-card" style={{ marginBottom: 0 }}>
          <h3 className="jf-card-title" style={{ fontSize: "1rem", marginBottom: "1rem" }}>
            <Building size={18} style={{ color: "var(--jf-primary)" }} /> Customer Information & Addresses
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.84rem" }}>
            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--jf-border)" }}>
              <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Customer Code</span>
              <strong style={{ color: "var(--jf-primary-dark)" }}>{code}</strong>
            </div>

            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--jf-border)" }}>
              <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Client Type</span>
              <strong>{type}</strong>
            </div>

            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--jf-border)" }}>
              <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Primary Phone</span>
              <strong>{customer.phone || customer.mobile || "N/A"}</strong>
            </div>

            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--jf-border)" }}>
              <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Email Address</span>
              <strong>{customer.email || "N/A"}</strong>
            </div>

            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--jf-border)" }}>
              <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>GSTIN / Tax Registration</span>
              <strong>{customer.gstin || customer.taxNo || "N/A"}</strong>
            </div>

            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--jf-border)" }}>
              <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Home Branch</span>
              <strong>{customer.branchId?.name || customer.branchName || customer.defaultBranch || "Banaswadii"}</strong>
            </div>
          </div>

          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#f8fafc", borderRadius: "6px", border: "1px solid var(--jf-border)", display: "flex", gap: "0.75rem", alignItems: "flex-start", fontSize: "0.84rem" }}>
            <MapPin size={18} style={{ color: "var(--jf-primary)", marginTop: "2px", flexShrink: 0 }} />
            <div>
              <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Registered Delivery Address</span>
              <span>{formattedAddress}</span>
            </div>
          </div>
        </div>

        {/* Commercial & Financial Summary Metrics */}
        <div className="jf-card" style={{ marginBottom: 0 }}>
          <h3 className="jf-card-title" style={{ fontSize: "1rem", marginBottom: "1rem" }}>
            <Receipt size={18} style={{ color: "var(--jf-primary)" }} /> Financial Summary & Orders
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ background: "#f8fafc", padding: "0.875rem", borderRadius: "8px", border: "1px solid var(--jf-border)" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Total Job Orders</span>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>
                {stats.totalJobs}
              </div>
            </div>

            <div style={{ background: "#eff6ff", padding: "0.875rem", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
              <span style={{ fontSize: "0.75rem", color: "#1e40af" }}>Active / In-Ops</span>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#2563eb" }}>
                {stats.activeJobs}
              </div>
            </div>

            <div style={{ background: "#f0fdf4", padding: "0.875rem", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
              <span style={{ fontSize: "0.75rem", color: "#166534" }}>Total Invoiced</span>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#15803d" }}>
                RM {(Number(stats.totalInvoiced) || 0).toFixed(2)}
              </div>
            </div>

            <div style={{ background: "#fef2f2", padding: "0.875rem", borderRadius: "8px", border: "1px solid #fecaca" }}>
              <span style={{ fontSize: "0.75rem", color: "#991b1b" }}>Outstanding Balance</span>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#dc2626" }}>
                RM {(Number(stats.outstanding) || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ padding: "0.75rem", background: "#f8fafc", borderRadius: "6px", border: "1px solid var(--jf-border)", fontSize: "0.8125rem", color: "#475569" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span>Advance Payments Collected:</span>
              <strong>RM {(Number(stats.advancePaid) || 0).toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Completed Orders:</span>
              <strong style={{ color: "#15803d" }}>{stats.completedJobs} / {stats.totalJobs}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── MAIN SECTION: ALL JOB ORDERS FOR THIS CUSTOMER ID ──────────────── */}
      <div className="jf-card">
        <div className="jf-card-header">
          <div>
            <h3 className="jf-card-title">
              <Briefcase size={18} style={{ color: "var(--jf-primary)" }} /> Job Orders Placed by {name} ({jobOrders.length})
            </h3>
            <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
              Showing all historical and active orders associated with customer ID: <strong>{code}</strong>
            </span>
          </div>

          <button
            type="button"
            className="jf-btn jf-btn-primary jf-btn-sm"
            onClick={() => navigate(`/jobflow/jobs/new?customerId=${customer._id || id}`)}
          >
            <PlusCircle size={14} /> + Create Job Order
          </button>
        </div>

        {/* Common Reusable JobFlowDataTable with Search, Sorting, Rows per Page & Pagination */}
        <JobFlowDataTable
          columns={[
            {
              key: "jobNo",
              label: "Job No",
              sortable: true,
              width: "140px",
              render: (val, row) => (
                <strong style={{ color: "var(--jf-primary-dark)" }}>
                  {val || row.orderNumber}
                </strong>
              ),
            },
            {
              key: "title",
              label: "Job Title / Items",
              sortable: true,
              render: (val, row) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{val || row.jobTitle}</div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {row.specs?.paperType || "Standard Print"}
                  </span>
                </div>
              ),
            },
            {
              key: "quantity",
              label: "Quantity",
              sortable: true,
              width: "90px",
              render: (val, row) => `${(val || row.specs?.quantity || 1).toLocaleString()} pcs`,
            },
            {
              key: "totalAmount",
              label: "Amount (RM)",
              sortable: true,
              render: (val, row) => `RM ${(Number(val || row.estimatedCost) || 0).toFixed(2)}`,
            },
            {
              key: "currentStage",
              label: "Lifecycle Stage",
              sortable: true,
              render: (val, row) => (
                <span className="jf-badge jf-badge-blue">{val || row.stage || "SUBMITTED"}</span>
              ),
            },
            {
              key: "status",
              label: "Status",
              sortable: true,
              render: (val, row) => <StatusBadge status={val || row.currentStage || "SUBMITTED"} />,
            },
            {
              key: "dueDate",
              label: "Due Date",
              sortable: true,
              render: (val) => (val ? new Date(val).toLocaleDateString() : "-"),
            },
            {
              key: "actions",
              label: "Actions",
              sortable: false,
              align: "right",
              render: (_, row) => (
                <button
                  type="button"
                  className="jf-btn jf-btn-primary jf-btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenProcessModal(row);
                  }}
                  title="View End-to-End Process Breakdown"
                >
                  <Eye size={14} /> Details
                </button>
              ),
            },
          ]}
          data={jobOrders}
          loading={loading}
          searchable={jobOrders.length > 0}
          searchPlaceholder="Search customer jobs by title, order no, or stage..."
          initialPageSize={5}
          pageSizeOptions={[5, 10, 25, 50]}
          emptyMessage="No job orders recorded for this customer yet. Click '+ Create Job Order' above to place an order."
          onRowClick={(row) => handleOpenProcessModal(row)}
        />
      </div>

      {/* Edit Customer Modal */}
      <CustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={customer}
        onSaved={loadCustomerAndJobs}
      />

      {/* Complete End-to-End Process Inspection Modal */}
      <JobOrderProcessDetailModal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        job={selectedProcessJob}
      />
    </JobFlowLayout>
  );
};

export default CustomerViewPage;
