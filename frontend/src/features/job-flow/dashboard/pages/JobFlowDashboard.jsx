import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Briefcase,
  Calculator,
  Palette,
  Layers,
  ShieldCheck,
  Truck,
  Receipt,
  ArrowRight,
  Clock,
  CheckCircle,
  PlusCircle,
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import jobFlowApi from "../../shared/api/jobFlowApiClient";

export const JobFlowDashboard = () => {
  const [counts, setCounts] = useState({
    customers: 248,
    draftJobs: 3,
    pendingEstimates: 5,
    inDesign: 8,
    inProduction: 12,
    readyQc: 4,
    readyDelivery: 6,
    completed: 182,
  });

  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [jobsRes, custRes] = await Promise.allSettled([
        jobFlowApi.getJobOrders({ limit: 6 }),
        jobFlowApi.getCustomers({ limit: 1 }),
      ]);

      if (jobsRes.status === "fulfilled" && jobsRes.value?.data?.items) {
        setRecentJobs(jobsRes.value.data.items);
      } else if (jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value?.data)) {
        setRecentJobs(jobsRes.value.data.slice(0, 6));
      } else {
        setRecentJobs([]);
      }
    } catch {
      setRecentJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const getFlowRouteForJob = (job) => {
    const stage = String(job.stage || "").toUpperCase();
    const status = String(job.status || "").toUpperCase();
    const id = job._id || job.id || "";

    if (stage === "ESTIMATION" || stage === "DRAFT" || status === "PENDING" || status === "PENDING_ESTIMATE") {
      return `/jobflow/estimates?jobId=${id}`;
    }
    if (stage === "DESIGN" || stage === "ARTWORK" || status === "WAITING_APPROVAL" || status === "ASSIGNED" || (status === "IN_PROGRESS" && stage === "DESIGN")) {
      return `/jobflow/design?jobId=${id}`;
    }
    if (stage === "PRODUCTION" || stage === "PRINTING" || status === "IN_PROGRESS" || status === "QUEUED") {
      return `/jobflow/production?jobId=${id}`;
    }
    if (stage === "QC" || stage === "QUALITY_CHECK" || status === "READY") {
      return `/jobflow/qc?jobId=${id}`;
    }
    if (stage === "DELIVERY" || stage === "DISPATCH" || status === "PACKED" || status === "READY_DELIVERY") {
      return `/jobflow/delivery?jobId=${id}`;
    }
    if (stage === "SETTLEMENT" || stage === "COMPLETED" || status === "DELIVERED" || status === "SETTLED") {
      return `/jobflow/settlement?jobId=${id}`;
    }

    return `/jobflow/estimates?jobId=${id}`;
  };

  return (
    <JobFlowLayout
      title="PrintZ JobFlow Management"
      actions={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link to="/jobflow/qr-request" className="jf-btn jf-btn-secondary jf-btn-sm">
            Branch QR Form
          </Link>
          <Link to="/jobflow/jobs/new" className="jf-btn jf-btn-primary jf-btn-sm">
            <PlusCircle size={16} /> Create Job Order
          </Link>
        </div>
      }
    >
      {/* Workflow Progress Banner */}
      <div className="jf-card" style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)", color: "#ffffff", padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#ffffff" }}>
          Active Manufacturing Pipeline
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#a7f3d0", margin: "0 0 1.25rem 0" }}>
          Seamless tracking from Customer Intake to Final Delivery Settlement with strict role restrictions.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem" }}>
          {[
            { label: "1. Customers", link: "/jobflow/customers", icon: Users, count: "248 Profiles" },
            { label: "2. Job Orders", link: "/jobflow/jobs", icon: Briefcase, count: "18 Active" },
            { label: "3. Estimates", link: "/jobflow/estimates", icon: Calculator, count: "5 Pending" },
            { label: "4. Design Pool", link: "/jobflow/design", icon: Palette, count: "8 Assigned" },
            { label: "5. Production", link: "/jobflow/production", icon: Layers, count: "12 In Ops" },
            { label: "6. Quality QC", link: "/jobflow/qc", icon: ShieldCheck, count: "4 Pending" },
            { label: "7. Delivery", link: "/jobflow/delivery", icon: Truck, count: "6 Ready" },
            { label: "8. Settlement", link: "/jobflow/settlement", icon: Receipt, count: "100% Synced" },
          ].map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <Link
                key={idx}
                to={stage.link}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "0.875rem 0.75rem",
                  color: "#ffffff",
                  textDecoration: "none",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <Icon size={20} style={{ marginBottom: "0.35rem", color: "#6ee7b7" }} />
                <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>{stage.label}</span>
                <span style={{ fontSize: "0.7rem", color: "#a7f3d0", marginTop: "2px" }}>{stage.count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Metric Stat Boxes */}
      <div className="jf-stat-grid">
        <div className="jf-stat-box">
          <div className="jf-stat-icon" style={{ background: "#dcfce7", color: "#15803d" }}>
            <Users size={22} />
          </div>
          <div>
            <div className="jf-stat-val">248</div>
            <div className="jf-stat-label">Registered Customers</div>
          </div>
        </div>

        <div className="jf-stat-box">
          <div className="jf-stat-icon" style={{ background: "#fef3c7", color: "#92400e" }}>
            <Calculator size={22} />
          </div>
          <div>
            <div className="jf-stat-val">5</div>
            <div className="jf-stat-label">Pending Estimates (Manager Only)</div>
          </div>
        </div>

        <div className="jf-stat-box">
          <div className="jf-stat-icon" style={{ background: "#dbeafe", color: "#1e40af" }}>
            <Palette size={22} />
          </div>
          <div>
            <div className="jf-stat-val">8</div>
            <div className="jf-stat-label">Design Workspace Jobs</div>
          </div>
        </div>

        <div className="jf-stat-box">
          <div className="jf-stat-icon" style={{ background: "#f3e8ff", color: "#6b21a8" }}>
            <Layers size={22} />
          </div>
          <div>
            <div className="jf-stat-val">12</div>
            <div className="jf-stat-label">Live Production Operations</div>
          </div>
        </div>

        <div className="jf-stat-box">
          <div className="jf-stat-icon" style={{ background: "#dcfce7", color: "#065f46" }}>
            <Truck size={22} />
          </div>
          <div>
            <div className="jf-stat-val">6</div>
            <div className="jf-stat-label">Ready for Dispatch</div>
          </div>
        </div>
      </div>

      {/* Active Production & Job Orders DataTable */}
      <div className="jf-card">
        <div className="jf-card-header">
          <h3 className="jf-card-title">
            <Clock size={18} style={{ color: "var(--jf-primary)" }} /> Active Production & Job Orders
          </h3>
          <Link to="/jobflow/jobs" className="jf-btn jf-btn-secondary jf-btn-sm">
            View All Jobs <ArrowRight size={14} />
          </Link>
        </div>

        <JobFlowDataTable
          columns={[
            {
              key: "jobNo",
              label: "Job No",
              sortable: true,
              width: "140px",
              render: (val, row) => <strong>{val || row.orderNumber}</strong>,
            },
            {
              key: "customerName",
              label: "Customer",
              sortable: true,
              render: (val, row) => val || row.customerId?.name || "Client",
            },
            {
              key: "title",
              label: "Job Title",
              sortable: true,
              render: (val, row) => val || row.jobTitle || "Printed Materials",
            },
            {
              key: "stage",
              label: "Lifecycle Stage",
              sortable: true,
              render: (val) => (
                <span className="jf-badge jf-badge-blue">{val || "PRODUCTION"}</span>
              ),
            },
            {
              key: "status",
              label: "Status",
              sortable: true,
              render: (val) => <StatusBadge status={val || "IN_PROGRESS"} />,
            },
            {
              key: "createdAt",
              label: "Created",
              sortable: true,
              render: (val) => (
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  {val ? new Date(val).toLocaleDateString() : "Today"}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              sortable: false,
              align: "right",
              render: (_, job) => (
                <Link
                  to={getFlowRouteForJob(job)}
                  className="jf-btn jf-btn-primary jf-btn-sm"
                  title={`Inspect live pipeline: ${job.stage || "ESTIMATION"}`}
                >
                  Inspect Flow
                </Link>
              ),
            },
          ]}
          data={recentJobs}
          loading={loading}
          searchable={true}
          searchPlaceholder="Search active jobs..."
          initialPageSize={5}
          pageSizeOptions={[5, 10, 25]}
          emptyMessage="No active job orders in the pipeline."
        />
      </div>
    </JobFlowLayout>
  );
};
  
export default JobFlowDashboard;
