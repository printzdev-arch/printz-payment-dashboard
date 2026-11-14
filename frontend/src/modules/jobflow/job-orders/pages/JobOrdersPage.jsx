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
import JobFlowLayout from "../../../../layouts/JobFlowLayout/JobFlowLayout";
import JobTypeBadge from "../../shared/components/JobTypeBadge";
import DataTable from "../../../../shared/ui/DataTable/DataTable";
import PriorityBadge from "../../shared/components/PriorityBadge";
import JobOrderProcessDetailModal from "../components/JobOrderProcessDetailModal";
import jobFlowApi from "../api/jobOrdersApi";
import "../styles/job-orders.css";
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
      const params = { limit: 100, source: "MANAGER" };
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

      </div>

      {/* Jobs DataTable with Search, Sorting, Rows Per Page & Pagination */}
      <DataTable renderWithValue
        columns={[
          {
            key: "jobNo",
            label: "Job No",
            sortable: true,
            minWidth: "180px",
            render: (val, row) => (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                <strong style={{ color: "#0f172a", fontWeight: 700, whiteSpace: "nowrap" }}>
                  {val || row.orderNumber}
                </strong>
                <JobTypeBadge jobType={row.jobType || "Print & Design"} size="sm" />
              </div>
            ),
          },
          {
            key: "customerName",
            label: "Customer",
            sortable: true,
            minWidth: "140px",
            render: (val, row) => (
              <span style={{ color: "#0f172a", fontWeight: 600 }}>
                {val || row.customerId?.name || "Client"}
              </span>
            ),
          },
          {
            key: "productName",
            label: "Product Name",
            sortable: true,
            minWidth: "160px",
            render: (_, row) => {
              const productName =
                row.productType ||
                row.specs?.productType ||
                row.items?.[0]?.specifications?.productType ||
                row.items?.[0]?.productType ||
                row.title ||
                row.jobTitle ||
                "-";
              return (
                <div style={{ fontWeight: 600, color: "#0f172a" }}>
                  {productName}
                </div>
              );
            },
          },
          {
            key: "quantity",
            label: "Qty",
            sortable: true,
            width: "80px",
            render: (val, row) => (
              <span style={{ color: "#0f172a", fontWeight: 600 }}>
                {(val || row.specs?.quantity || 500).toLocaleString()}
              </span>
            ),
          },
          {
            key: "dueDate",
            label: "Due Date",
            sortable: true,
            width: "110px",
            render: (val) => (
              <span style={{ color: "#0f172a", fontWeight: 600, whiteSpace: "nowrap" }}>
                {val ? new Date(val).toLocaleDateString() : "-"}
              </span>
            ),
          },
          {
            key: "priority",
            label: "Priority",
            sortable: true,
            render: (val, row) => <PriorityBadge priority={val || row.priority} />,
          },
          {
            key: "stage",
            label: "Stage",
            sortable: true,
            width: "130px",
            render: (val, row) => {
              const effectiveStage = row.currentStage || row.stage || val || "ENQUIRY";
              const isCompleted = String(effectiveStage).toUpperCase() === "COMPLETED";
              return (
                <span className={`jf-badge ${isCompleted ? "jf-badge-green" : "jf-badge-blue"}`}>
                  {effectiveStage}
                </span>
              );
            },
          },
          {
            key: "actions",
            label: "Actions",
            sortable: false,
            width: "90px",
            align: "center",
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
        pageSize={10}
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
