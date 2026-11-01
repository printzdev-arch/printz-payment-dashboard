import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  RotateCcw,
  Eye,
  Calculator,
  Palette,
  CheckCircle,
  Clock,
  Check,
  X,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import JobTypeBadge from "../../shared/components/JobTypeBadge";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import JobOrderProcessDetailModal from "../components/JobOrderProcessDetailModal";
import CreateJobOrderPage from "./CreateJobOrderPage";
import jobFlowApi from "../api/jobOrdersApi";
import "../styles/job-orders.css";
import { toast } from "react-toastify";

export const DesignerJobOrdersPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightedJobId = searchParams.get("id");

  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(
    () => searchParams.get("create") === "true" || window.location.pathname.includes("/new")
  );
  const [selectedJob, setSelectedJob] = useState(null);
  const [approvalJob, setApprovalJob] = useState(null);
  const [approving, setApproving] = useState(false);
  const [approvalComments, setApprovalComments] = useState("Estimate approved by designer");

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // KPI Metrics State
  const [kpiCounts, setKpiCounts] = useState({
    total: 0,
    pendingEstimation: 0,
    approvedEstimates: 0,
    inProgress: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, stageFilter, statusFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = { limit: 100, source: "DESIGNER" };
      if (searchQuery) {
        params.search = searchQuery;
        params.q = searchQuery;
      }
      if (stageFilter !== "all") {
        const stageMap = {
          ESTIMATION: "ENQUIRY,ESTIMATION,ESTIMATE_APPROVAL",
          DESIGN: "DESIGN_QUEUE,DESIGN_ASSIGNED,DESIGN_IN_PROGRESS,SAMPLE_APPROVAL,REVISION",
          PRODUCTION: "PRODUCTION_PLANNING,PRINTING,FINISHING,PACKING",
          QC: "QC,REWORK,REPRINT",
          DELIVERY: "READY,DELIVERY",
          COMPLETED: "COMPLETED",
        };
        params.currentStage = stageMap[stageFilter] || stageFilter;
      }
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await jobFlowApi.getDesignerJobOrders(params);
      let list = [];
      if (res?.data?.items && Array.isArray(res.data.items)) {
        list = res.data.items;
      } else if (res?.data && Array.isArray(res.data)) {
        list = res.data;
      } else if (Array.isArray(res)) {
        list = res;
      }

      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setJobs(list);

      // Compute KPI counts dynamically
      const total = list.length;
      const pendingEst = list.filter((j) =>
        ["ENQUIRY", "ESTIMATION", "ESTIMATE_APPROVAL"].includes((j.currentStage || j.stage || "").toUpperCase()) &&
        (j.estimationStatus || "").toUpperCase() !== "APPROVED"
      ).length;
      const approvedEst = list.filter((j) =>
        (j.estimationStatus || "").toUpperCase() === "APPROVED" ||
        ["DESIGN_QUEUE", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "PRODUCTION_PLANNING", "PRODUCTION", "QC", "DELIVERY", "COMPLETED"].includes((j.currentStage || j.stage || "").toUpperCase())
      ).length;
      const inProg = list.filter((j) =>
        ["DESIGN_QUEUE", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "REVISION"].includes((j.currentStage || j.stage || "").toUpperCase())
      ).length;

      setKpiCounts({
        total,
        pendingEstimation: pendingEst,
        approvedEstimates: approvedEst,
        inProgress: inProg,
      });

      if (highlightedJobId) {
        const found = list.find((j) => (j._id || j.id) === highlightedJobId);
        if (found) setSelectedJob(found);
      } else if (list.length > 0 && !selectedJob) {
        setSelectedJob(list[0]);
      }
    } catch (err) {
      console.error("Failed to fetch designer job orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApproveModal = (job, e) => {
    if (e) e.stopPropagation();
    setApprovalJob(job);
    setApprovalComments("Estimate approved by designer");
    setIsApproveModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!approvalJob) return;
    setApproving(true);
    try {
      const jobId = approvalJob._id || approvalJob.id;
      const totalAmt = Number(approvalJob.grandTotal || approvalJob.totalAmount || approvalJob.estimatedPrice || 0);
      const subtotalAmt = Number(approvalJob.subtotal || totalAmt);
      const discountAmt = Number(approvalJob.discountAmount || 0);

      await jobFlowApi.approveEstimate(jobId, {
        subtotal: subtotalAmt,
        discountAmount: discountAmt,
        grandTotal: totalAmt,
        comments: approvalComments,
      });

      toast.success(`Estimate for ${approvalJob.jobNo || "Job"} approved successfully!`);
      setIsApproveModalOpen(false);
      setApprovalJob(null);
      await fetchJobs();
    } catch (err) {
      console.error("Approval error:", err);
      toast.error(err.response?.data?.message || "Failed to approve estimation.");
    } finally {
      setApproving(false);
    }
  };

  const isEstimationStage = (job) => {
    const stage = (job?.currentStage || job?.stage || "").toUpperCase();
    const estStatus = (job?.estimationStatus || "").toUpperCase();
    return ["ENQUIRY", "ESTIMATION", "ESTIMATE_APPROVAL"].includes(stage) || estStatus === "PENDING";
  };

  const isDesignStage = (job) => {
    const stage = (job?.currentStage || job?.stage || "").toUpperCase();
    return ["DESIGN_QUEUE", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "REVISION"].includes(stage);
  };

  return (
    <JobFlowLayout
      title="Designer Job Orders"
      actions={
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="jf-btn jf-btn-primary jf-btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
        >
          <Plus size={16} /> Create Job
        </button>
      }
    >
      {/* 4 KPI Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div className="jf-card" style={{ padding: "1rem", borderLeft: "4px solid #3b82f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                Total Designer Jobs
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                {kpiCounts.total}
              </div>
            </div>
            <div style={{ background: "#eff6ff", padding: "10px", borderRadius: "8px", color: "#3b82f6" }}>
              <Palette size={24} />
            </div>
          </div>
        </div>

        <div className="jf-card" style={{ padding: "1rem", borderLeft: "4px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                Pending Estimation
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#b45309", marginTop: "4px" }}>
                {kpiCounts.pendingEstimation}
              </div>
            </div>
            <div style={{ background: "#fffbeb", padding: "10px", borderRadius: "8px", color: "#f59e0b" }}>
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div className="jf-card" style={{ padding: "1rem", borderLeft: "4px solid #10b981" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                Approved Estimates
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#047857", marginTop: "4px" }}>
                {kpiCounts.approvedEstimates}
              </div>
            </div>
            <div style={{ background: "#ecfdf5", padding: "10px", borderRadius: "8px", color: "#10b981" }}>
              <CheckCircle size={24} />
            </div>
          </div>
        </div>

        <div className="jf-card" style={{ padding: "1rem", borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                In Progress
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#6d28d9", marginTop: "4px" }}>
                {kpiCounts.inProgress}
              </div>
            </div>
            <div style={{ background: "#f5f3ff", padding: "10px", borderRadius: "8px", color: "#8b5cf6" }}>
              <TrendingUp size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="jf-filter-bar">
        <div className="jf-search-wrapper">
          <Search size={16} className="jf-search-icon" />
          <input
            type="text"
            className="jf-search-input"
            placeholder="Search designer jobs by number, customer, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="jf-select"
          style={{ width: "160px" }}
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="all">All Stages</option>
          <option value="ESTIMATION">Estimation</option>
          <option value="DESIGN">Design</option>
          <option value="PRODUCTION">Production</option>
          <option value="QC">Quality Control</option>
          <option value="DELIVERY">Delivery</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <select
          className="jf-select"
          style={{ width: "150px" }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ESTIMATION">Estimation</option>
          <option value="DESIGN">Design</option>
          <option value="PRODUCTION">Production</option>
          <option value="READY">Ready</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <button
          type="button"
          className="jf-btn jf-btn-secondary jf-btn-sm"
          onClick={() => {
            setSearchQuery("");
            setStageFilter("all");
            setStatusFilter("all");
          }}
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {/* Designer Jobs DataTable */}
      <JobFlowDataTable
        columns={[
          {
            key: "jobNo",
            label: "Job No",
            sortable: true,
            width: "150px",
            render: (val, row) => (
              <div>
                <strong style={{ color: "var(--jf-primary-dark)", display: "block" }}>
                  {val || row.orderNumber}
                </strong>
                <div style={{ marginTop: "4px" }}>
                  <JobTypeBadge jobType={row.jobType || "Design Only"} size="sm" />
                </div>
              </div>
            ),
          },
          {
            key: "customerName",
            label: "Customer",
            sortable: true,
            render: (val, row) => (
              <div>
                <div style={{ fontWeight: 600 }}>{val || row.customerId?.name || "Client"}</div>
                {(row.customerPhone || row.customerSnapshot?.mobile) && (
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {row.customerPhone || row.customerSnapshot?.mobile}
                  </span>
                )}
              </div>
            ),
          },
          {
            key: "title",
            label: "Title / Item",
            sortable: true,
            render: (val, row) => (
              <div>
                <div style={{ fontWeight: 600 }}>{val || row.jobTitle}</div>
                <span style={{ fontSize: "0.75rem", color: "#475569" }}>{row.jobType || "Print Job"}</span>
              </div>
            ),
          },
          {
            key: "quantity",
            label: "Qty",
            sortable: true,
            width: "80px",
            render: (val, row) => (val || row.specs?.quantity || 1).toLocaleString(),
          },
          {
            key: "totalAmount",
            label: "Estimate Total",
            sortable: true,
            render: (val, row) => {
              const amt = Number(val || row.grandTotal || row.estimatedPrice || 0);
              return (
                <div style={{ fontWeight: 700, color: "#0f172a" }}>
                  ₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              );
            },
          },
          {
            key: "stage",
            label: "Stage",
            sortable: true,
            render: (val, row) => (
              <span className="jf-badge jf-badge-blue">{row.currentStage || val || "ENQUIRY"}</span>
            ),
          },
          {
            key: "status",
            label: "Status",
            sortable: true,
            render: (val, row) => <StatusBadge status={row.currentStage || val || "PENDING"} />,
          },
          {
            key: "actions",
            label: "Actions",
            sortable: false,
            align: "right",
            render: (_, row) => (
              <div style={{ display: "flex", gap: "0.375rem", justifyContent: "flex-end" }}>
                {isEstimationStage(row) && (
                  <button
                    type="button"
                    className="jf-btn jf-btn-primary jf-btn-sm"
                    style={{ background: "#059669", borderColor: "#059669" }}
                    onClick={(e) => handleOpenApproveModal(row, e)}
                    title="Approve Estimation for this order"
                  >
                    <CheckCircle size={14} /> Approve Estimate
                  </button>
                )}
                {isDesignStage(row) && (
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/design?jobId=${row._id || row.id}`);
                    }}
                    title="Open in Design Workspace"
                  >
                    <Palette size={14} /> Workspace
                  </button>
                )}
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedJob(row);
                    setIsProcessModalOpen(true);
                  }}
                  title="View All Processes"
                >
                  <Eye size={14} /> Details
                </button>
              </div>
            ),
          },
        ]}
        data={jobs}
        loading={loading}
        searchable={false}
        initialPageSize={10}
        pageSizeOptions={[5, 10, 25, 50]}
        emptyMessage="No designer job orders found."
        selectedRowId={selectedJob?._id || selectedJob?.id}
        onRowClick={(row) => {
          setSelectedJob(row);
          setIsProcessModalOpen(true);
        }}
      />

      {/* Complete Process Modal */}
      <JobOrderProcessDetailModal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        job={selectedJob}
      />

      {/* Designer Estimation Approval Confirmation Modal */}
      {isApproveModalOpen && approvalJob && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setIsApproveModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "linear-gradient(135deg, #064e3b 0%, #047857 100%)",
                color: "#ffffff",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
                  Approve Designer Estimation
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "#a7f3d0" }}>
                  {approvalJob.jobNo} • {approvalJob.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem" }}>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "1rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.875rem" }}>
                  <div>
                    <span style={{ color: "#64748b" }}>Customer:</span>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>
                      {approvalJob.customerName || approvalJob.customerSnapshot?.name || "Client"}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Quantity:</span>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>
                      {(approvalJob.quantity || 1).toLocaleString()} pcs
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Subtotal:</span>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>
                      ₹{Number(approvalJob.subtotal || approvalJob.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Grand Total:</span>
                    <div style={{ fontWeight: 700, color: "#059669", fontSize: "1.05rem" }}>
                      ₹{Number(approvalJob.grandTotal || approvalJob.totalAmount || approvalJob.estimatedPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                <label className="jf-label">Approval Comments / Notes</label>
                <input
                  type="text"
                  className="jf-input"
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="E.g. Estimate approved by designer"
                />
              </div>

              <div
                style={{
                  padding: "0.75rem",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "6px",
                  fontSize: "0.8125rem",
                  color: "#065f46",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <CheckCircle size={16} />
                <span>
                  Approving this estimation will transition the order to <strong>Design In Progress</strong> and make it immediately available for proof generation.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1rem 1.5rem",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
              }}
            >
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setIsApproveModalOpen(false)}
                disabled={approving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                style={{ background: "#059669", borderColor: "#059669" }}
                onClick={handleConfirmApproval}
                disabled={approving}
              >
                <Check size={16} /> {approving ? "Approving..." : "Confirm & Approve Estimate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Job Order Modal - Opens directly on this page */}
      {isCreateModalOpen && (
        <div
          className="jf-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div
            className="jf-modal-container"
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "1200px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.5rem",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
                  Create Designer Job Order
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  Register specifications, material details, and services directly on this page
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
              <CreateJobOrderPage
                isModal={true}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                  setIsCreateModalOpen(false);
                  fetchJobs();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </JobFlowLayout>
  );
};

export default DesignerJobOrdersPage;

