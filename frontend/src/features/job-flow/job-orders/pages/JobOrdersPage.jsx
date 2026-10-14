import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import {
  Search,
  Plus,
  RotateCcw,
  Eye,
  Calculator,
  Palette,
  Layers,
  ShieldCheck,
  Truck,
  CheckCircle,
  Clock,
  FastForward,
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import JobOrderProcessDetailModal from "../components/JobOrderProcessDetailModal";
import jobFlowApi from "../api/jobOrdersApi";
import { toast } from "react-toastify";

export const JobOrdersPage = () => {
  const { id: routeJobId } = useParams();
  const [searchParams] = useSearchParams();
  const highlightedJobId = routeJobId || searchParams.get("id");

  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, stageFilter, statusFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
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

      const res = await jobFlowApi.getJobOrders(params);
      let list = [];
      if (res?.data?.items && Array.isArray(res.data.items)) {
        list = res.data.items;
      } else if (res?.data && Array.isArray(res.data)) {
        list = res.data;
      } else if (Array.isArray(res)) {
        list = res;
      }

      // Ensure newest jobs are at the top
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setJobs(list);
      if (highlightedJobId) {
        const found = list.find((j) => (j._id || j.id) === highlightedJobId);
        if (found) setSelectedJob(found);
      } else if (list.length > 0 && !selectedJob) {
        setSelectedJob(list[0]);
      }
    } catch (err) {
      console.error("Failed to fetch job orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipDesign = async (job) => {
    if (window.confirm(`Skip design workflow for Job ${job.jobNo}? It will proceed straight to Production Planning.`)) {
      try {
        await jobFlowApi.skipDesign(job._id || job.id, { reason: "Customer provided print-ready file" });
        toast.success("Design skipped. Job released to Production Planning.");
        fetchJobs();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to skip design");
      }
    }
  };

  return (
    <JobFlowLayout
      title="Job Orders"
      actions={
        <Link to="/jobflow/jobs/new" className="jf-btn jf-btn-primary">
          <Plus size={16} /> Create Job Order
        </Link>
      }
    >
      {/* Search & Filters Filter Bar */}
      <div className="jf-filter-bar">
        <div className="jf-search-input-wrap">
          <Search size={16} className="jf-search-icon" />
          <input
            type="text"
            className="jf-search-input"
            placeholder="Search by job number, customer, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="jf-select"
          style={{width:"150px"}}
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
          style={{width:"150px"}}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
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

      {/* Jobs DataTable with Search, Sorting, Rows Per Page & Pagination */}
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
            key: "customerName",
            label: "Customer",
            sortable: true,
            render: (val, row) => val || row.customerId?.name || "Client",
          },
          {
            key: "title",
            label: "Title / Item",
            sortable: true,
            render: (val, row) => (
              <div>
                <div style={{ fontWeight: 600 }}>{val || row.jobTitle}</div>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{row.jobType}</span>
              </div>
            ),
          },
          {
            key: "quantity",
            label: "Qty",
            sortable: true,
            width: "80px",
            render: (val, row) => (val || row.specs?.quantity || 500).toLocaleString(),
          },
          {
            key: "dueDate",
            label: "Due Date",
            sortable: true,
            render: (val) => (val ? new Date(val).toLocaleDateString() : "-"),
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
              <button
                type="button"
                className="jf-btn jf-btn-primary jf-btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedJob(row);
                  setIsProcessModalOpen(true);
                }}
                title="View All Processes Till Completed"
              >
                <Eye size={14} /> Details
              </button>
            ),
          },
        ]}
        data={jobs}
        loading={loading}
        searchable={false}
        initialPageSize={10}
        pageSizeOptions={[5, 10, 25, 50]}
        emptyMessage="No job orders found matching criteria."
        selectedRowId={selectedJob?._id || selectedJob?.id}
        onRowClick={(row) => {
          setSelectedJob(row);
          setIsProcessModalOpen(true);
        }}
      />

      {/* Complete End-to-End Lifecycle Process Modal */}
      <JobOrderProcessDetailModal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        job={selectedJob}
      />
    </JobFlowLayout>
  );
};

export default JobOrdersPage;
