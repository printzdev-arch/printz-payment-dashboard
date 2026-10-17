import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  Layers,
  Play,
  CheckCircle,
  Pause,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Wrench,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Box,
  QrCode,
  Printer,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  UserCheck,
  Check,
  Activity,
  Sliders,
  FileText,
  Search,
  ShieldCheck,
  RotateCcw,
  XCircle,
  ArrowUp,
  ArrowDown,
  Eye,
  Filter,
  Ban,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Truck,
  ExternalLink,
  X,
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import jobFlowApi from "../api/productionApi";
import "../styles/production.css";
import { toast } from "react-toastify";

// Production Action Modals
import OperationStartModal from "../components/OperationStartModal";
import OperationCompleteModal from "../components/OperationCompleteModal";
import OperationFailModal from "../components/OperationFailModal";
import OperationSkipModal from "../components/OperationSkipModal";
import ProductionOrderActionsModal from "../components/ProductionOrderActionsModal";
import ReprintDecisionModal from "../components/ReprintDecisionModal";
import EnhancedQCModal from "../components/EnhancedQCModal";

const formatUser = (u, fallback = "-") => {
  if (!u) return fallback;
  if (typeof u === "string") return u;
  return u.name || u.email || u.username || fallback;
};

// ──────────────── OPERATION QUEUE DROPDOWN PRESETS ────────────────
const QUEUE_OPERATION_OPTIONS = [
  { value: "ALL", label: "All Operations" },
  { value: "PRINT", label: "Printing" },
  { value: "CUTTING", label: "Cutting" },
  { value: "LAMINATION", label: "Lamination" },
  { value: "BINDING", label: "Binding" },
  { value: "FOLDING", label: "Folding" },
  { value: "CREASING", label: "Creasing" },
  { value: "SPIRAL", label: "Spiral Binding" },
  { value: "UV", label: "UV Coating" },
  { value: "MOUNTING", label: "Mounting" },
  { value: "HEAT_PRESS", label: "Heat Press" },
  { value: "PACKING", label: "Packing" },
];

const QUEUE_STATUS_OPTIONS = [
  { value: "ALL_ELIGIBLE", label: "All Eligible" },
  { value: "PENDING", label: "Pending" },
  { value: "RUNNING", label: "Running" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "SKIPPED", label: "Skipped" },
];

// ──────────────── REUSABLE SEARCHABLE SELECT DROPDOWN ────────────────
const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search options...",
  label = null,
  style = {},
  width = "200px",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  const filteredOptions = options.filter((opt) =>
    (opt.label || "").toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width,
        minWidth: "160px",
        display: "inline-block",
        ...style,
      }}
    >
      {label && (
        <span
          style={{
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#64748b",
            marginBottom: "4px",
          }}
        >
          {label}
        </span>
      )}
      <button
        type="button"
        className="jf-input jf-input-sm"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.5rem",
          cursor: "pointer",
          background: "#ffffff",
          textAlign: "left",
          width: "100%",
          height: "36px",
          padding: "0 10px",
          fontWeight: 600,
          color: selectedOption?.value !== "ALL" && selectedOption?.value !== "ALL_ELIGIBLE" ? "#15803d" : "#0f172a",
          border: selectedOption?.value !== "ALL" && selectedOption?.value !== "ALL_ELIGIBLE" ? "1.5px solid #86efac" : "1px solid #cbd5e1",
          borderRadius: "6px",
        }}
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm("");
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: "#64748b",
            flexShrink: 0,
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 250,
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            padding: "8px",
            maxHeight: "280px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {/* Search box inside the select dropdown */}
          <div style={{ position: "relative" }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              autoFocus
              className="jf-input jf-input-sm"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: "26px",
                paddingRight: searchTerm ? "24px" : "8px",
                width: "100%",
                height: "30px",
                fontSize: "0.8125rem",
                borderRadius: "4px",
              }}
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <button
                type="button"
                style={{
                  position: "absolute",
                  right: "6px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: "2px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm("");
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filtered Options list */}
          <div
            style={{
              overflowY: "auto",
              maxHeight: "190px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "4px",
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: isSelected ? "#f0fdf4" : "transparent",
                      color: isSelected ? "#15803d" : "#1e293b",
                      fontWeight: isSelected ? 700 : 500,
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "#f1f5f9";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={14} style={{ color: "#15803d" }} />}
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: "10px 8px",
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  textAlign: "center",
                }}
              >
                No options matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ──────────────── UNIFIED TABLE PAGINATION FOOTER ────────────────
const TablePaginationFooter = ({
  currentPage = 1,
  totalItems = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  pageSizeOptions = [5, 10, 20, 50],
  itemName = "items",
}) => {
  const rows = Math.max(1, Number(rowsPerPage) || 10);
  const totalPages = Math.max(1, Math.ceil(totalItems / rows));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startRecord = totalItems === 0 ? 0 : (validPage - 1) * rows + 1;
  const endRecord = Math.min(validPage * rows, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, validPage - 1);
      let end = Math.min(totalPages - 1, validPage + 1);
      if (validPage <= 2) {
        end = 4;
      } else if (validPage >= totalPages - 1) {
        start = totalPages - 3;
      }
      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.75rem",
        padding: "0.875rem 1.25rem",
        borderTop: "1px solid #e2e8f0",
        fontSize: "0.8125rem",
        color: "#64748b",
        background: "#fafbfc",
        borderBottomLeftRadius: "8px",
        borderBottomRightRadius: "8px",
      }}
    >
      {/* Left: Rows per page input field + quick presets + count */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontWeight: 600, color: "#475569" }}>Rows per page:</span>
          <input
            type="number"
            min={1}
            max={Math.max(100, totalItems || 100)}
            aria-label="Rows per page input field"
            className="jf-input jf-input-sm"
            style={{
              width: "60px",
              height: "30px",
              padding: "2px 6px",
              textAlign: "center",
              fontWeight: 700,
              color: "#0f172a",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
            }}
            value={rowsPerPage}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                onRowsPerPageChange("");
              } else {
                const num = parseInt(val, 10);
                if (!isNaN(num) && num > 0) {
                  onRowsPerPageChange(num);
                }
              }
              onPageChange(1);
            }}
            onBlur={() => {
              if (!rowsPerPage || Number(rowsPerPage) < 1) {
                onRowsPerPageChange(pageSizeOptions[0] || 10);
              }
            }}
          />
          <select
            className="jf-input jf-input-sm"
            style={{
              height: "30px",
              padding: "2px 6px",
              fontSize: "0.75rem",
              color: "#475569",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            value={pageSizeOptions.includes(Number(rowsPerPage)) ? Number(rowsPerPage) : "custom"}
            onChange={(e) => {
              if (e.target.value !== "custom") {
                onRowsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }
            }}
            title="Quick preset"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / page
              </option>
            ))}
            {!pageSizeOptions.includes(Number(rowsPerPage)) && (
              <option value="custom">Custom ({rowsPerPage})</option>
            )}
          </select>
        </div>

        <span style={{ color: "#64748b" }}>
          Showing <strong style={{ color: "#0f172a" }}>{startRecord}</strong> -{" "}
          <strong style={{ color: "#0f172a" }}>{endRecord}</strong> of{" "}
          <strong style={{ color: "#0f172a" }}>{totalItems}</strong> {itemName}
        </span>
      </div>

      {/* Right: Full Pagination Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <button
          type="button"
          className="jf-btn jf-btn-secondary jf-btn-sm"
          style={{
            padding: "4px 8px",
            height: "30px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          disabled={validPage <= 1}
          onClick={() => onPageChange(1)}
          title="First Page"
        >
          <ChevronsLeft size={14} />
        </button>

        <button
          type="button"
          className="jf-btn jf-btn-secondary jf-btn-sm"
          style={{
            padding: "4px 8px",
            height: "30px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
          disabled={validPage <= 1}
          onClick={() => onPageChange(Math.max(1, validPage - 1))}
          title="Previous Page"
        >
          <ChevronLeft size={14} /> Prev
        </button>

        <div style={{ display: "flex", gap: "0.25rem", margin: "0 0.25rem" }}>
          {getPageNumbers().map((num, idx) => {
            if (num === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    minWidth: "28px",
                    height: "30px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    fontSize: "0.8125rem",
                  }}
                >
                  ...
                </span>
              );
            }
            const isActive = num === validPage;
            return (
              <button
                key={`page-${num}`}
                type="button"
                style={{
                  minWidth: "30px",
                  height: "30px",
                  padding: "0 6px",
                  borderRadius: "4px",
                  border: isActive ? "1px solid #15803d" : "1px solid #cbd5e1",
                  background: isActive ? "#15803d" : "#ffffff",
                  color: isActive ? "#ffffff" : "#334155",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                  transition: "all 0.15s ease",
                }}
                onClick={() => onPageChange(num)}
              >
                {num}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="jf-btn jf-btn-secondary jf-btn-sm"
          style={{
            padding: "4px 8px",
            height: "30px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
          disabled={validPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, validPage + 1))}
          title="Next Page"
        >
          Next <ChevronRight size={14} />
        </button>

        <button
          type="button"
          className="jf-btn jf-btn-secondary jf-btn-sm"
          style={{
            padding: "4px 8px",
            height: "30px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          disabled={validPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last Page"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};

export const ProductionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: overview | orders | queue | reprints | details
  const initialTab = () => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "qc") {
      navigate("/jobflow/qc");
      return "orders";
    }
    if (tabParam === "delivery") {
      navigate("/jobflow/delivery");
      return "orders";
    }
    if (tabParam === "planning") return "orders";
    if (tabParam) return tabParam;
    if (location.pathname.includes("/production/orders")) return "orders";
    if (location.pathname.includes("/production/queue")) return "queue";
    if (
      location.pathname.includes("/production/planning") ||
      location.pathname.includes("production-planning")
    )
      return "orders";
    return "overview";
  };

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Keep activeTab in sync with route navigation
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "planning") {
      setActiveTab("orders");
    } else if (tabParam) {
      setActiveTab(tabParam);
    } else if (
      location.pathname.includes("/production/planning") ||
      location.pathname.includes("production-planning")
    ) {
      setActiveTab("orders");
    } else if (location.pathname.includes("/production/orders")) {
      setActiveTab("orders");
    } else if (location.pathname.includes("/production/queue")) {
      setActiveTab("queue");
    } else {
      setActiveTab("overview");
    }
  }, [location.pathname, searchParams]);

  // Synchronize Tab with URL
  const handleTabChange = (tab, extraParams = {}) => {
    if (tab === "qc") {
      navigate("/jobflow/qc");
      return;
    }
    if (tab === "delivery") {
      navigate("/jobflow/delivery");
      return;
    }
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      if (tab !== "details") {
        next.delete("orderId");
      }
      if (tab !== "orders") {
        next.delete("jobId");
      }
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v === null || v === undefined) {
          next.delete(k);
        } else {
          next.set(k, v);
        }
      });
      return next;
    });
  };

  // ──────────────── DATA STATES ────────────────
  const [productionOrders, setProductionOrders] = useState([]);
  const [operationQueue, setOperationQueue] = useState([]);
  const [qualityChecks, setQualityChecks] = useState([]);
  const [pendingQCList, setPendingQCList] = useState([]);
  const [reprintRequests, setReprintRequests] = useState([]);
  const [workflowAuditEvents, setWorkflowAuditEvents] = useState([]);
  const [planningJobs, setPlanningJobs] = useState([]);

  // Selected records for details / planning
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPlanJob, setSelectedPlanJob] = useState(null);

  // Modals state
  const [modalOpStart, setModalOpStart] = useState({ open: false, op: null, order: null });
  const [modalOpComplete, setModalOpComplete] = useState({ open: false, op: null, order: null });
  const [modalOpFail, setModalOpFail] = useState({ open: false, op: null, order: null });
  const [modalOpSkip, setModalOpSkip] = useState({ open: false, op: null, order: null });
  const [modalOrderAction, setModalOrderAction] = useState({ open: false, type: "HOLD", order: null });
  const [modalReprintDecision, setModalReprintDecision] = useState({ open: false, type: "APPROVE", req: null });
  const [modalQCInspect, setModalQCInspect] = useState({ open: false, order: null });

  // Plan Production modal state (Screenshot 2)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planModalJob, setPlanModalJob] = useState(null);
  const [planModalStart, setPlanModalStart] = useState(new Date().toISOString().slice(0, 16));
  const [planModalMachine, setPlanModalMachine] = useState("Konica Minolta AccurioPress");
  const [planModalEmployees, setPlanModalEmployees] = useState(["Priya Raman"]);
  const [planModalPriority, setPlanModalPriority] = useState("Normal");

  // Overview Dashboard Filters (Section 3)
  const [overviewDateFrom, setOverviewDateFrom] = useState("");
  const [overviewDateTo, setOverviewDateTo] = useState("");
  const [overviewBranch, setOverviewBranch] = useState("ALL");
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryRowsPerPage, setSummaryRowsPerPage] = useState(6);

  // Production Orders Pagination & Extra Filters (Screenshot 1)
  const [orderBranchFilter, setOrderBranchFilter] = useState("ALL");
  const [orderMachineFilter, setOrderMachineFilter] = useState("ALL");
  const [orderFromDate, setOrderFromDate] = useState("");
  const [orderToDate, setOrderToDate] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const [orderRowsPerPage, setOrderRowsPerPage] = useState(10);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [editOrderData, setEditOrderData] = useState(null);

  // Operation Queue Filters, Workbench & Pagination (Screenshot 3)
  const [queueBranchFilter, setQueueBranchFilter] = useState("ALL");
  const [queueAssignedToMe, setQueueAssignedToMe] = useState(false);
  const [queuePage, setQueuePage] = useState(1);
  const [queueRowsPerPage, setQueueRowsPerPage] = useState(10);
  const [selectedQueueOp, setSelectedQueueOp] = useState(null);
  const [wbInputQty, setWbInputQty] = useState(1000);
  const [wbOutputQty, setWbOutputQty] = useState(1000);
  const [wbCompletedQty, setWbCompletedQty] = useState(1000);
  const [wbMachine, setWbMachine] = useState("Konica Minolta AccurioPress");
  const [wbRemarks, setWbRemarks] = useState("");
  const [wbPackingQty, setWbPackingQty] = useState(1000);
  const [wbPackingRemarks, setWbPackingRemarks] = useState("");
  const [wbMaterials, setWbMaterials] = useState([
    { item: "350gsm Art Card Sheets", quantity: 500, type: "PAPER" },
    { item: "Black Digital Ink", quantity: 1, type: "INK_TONER" },
  ]);

  // Reprint Management Modal, Filters & Pagination (Screenshot 5)
  const [isNewReprintModalOpen, setIsNewReprintModalOpen] = useState(false);
  const [newReprintJobId, setNewReprintJobId] = useState("");
  const [newReprintJobItem, setNewReprintJobItem] = useState("");
  const [newReprintReason, setNewReprintReason] = useState("");
  const [newReprintQuantity, setNewReprintQuantity] = useState(100);
  const [newReprintSourceStage, setNewReprintSourceStage] = useState("QC");
  const [reprintSearch, setReprintSearch] = useState("");
  const [reprintStatusFilter, setReprintStatusFilter] = useState("ALL");
  const [reprintFromDate, setReprintFromDate] = useState("");
  const [reprintToDate, setReprintToDate] = useState("");
  const [reprintPage, setReprintPage] = useState(1);
  const [reprintRowsPerPage, setReprintRowsPerPage] = useState(10);
  const [selectedReprint, setSelectedReprint] = useState(null);
  const [reprintReviewComment, setReprintReviewComment] = useState("");

  // Order Details Operations Timeline Pagination (Tab 5)
  const [detailsOpPage, setDetailsOpPage] = useState(1);
  const [detailsOpRowsPerPage, setDetailsOpRowsPerPage] = useState(10);

  // ──────────────── FETCH LIVE BACKEND DATA ────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        ordersRes,
        queueRes,
        pendingQcRes,
        qcRes,
        reprintsRes,
        planningJobsRes,
      ] = await Promise.allSettled([
        jobFlowApi.getProductionOrders({ limit: 100 }),
        jobFlowApi.getOperationQueue({ limit: 100 }),
        jobFlowApi.getPendingQualityChecks({ limit: 50 }),
        jobFlowApi.getQualityChecks({ limit: 100 }),
        jobFlowApi.getReprintRequests({ limit: 50 }),
        jobFlowApi.getJobOrders({ currentStage: "PRODUCTION_PLANNING,PRINTING,FINISHING,PACKING", limit: 50 }),
      ]);

      // Orders
      if (ordersRes.status === "fulfilled" && ordersRes.value) {
        const data = ordersRes.value.data?.items || ordersRes.value.data || (Array.isArray(ordersRes.value) ? ordersRes.value : []);
        const orderList = Array.isArray(data) ? data : [];
        setProductionOrders(orderList);

        const orderIdParam = searchParams.get("orderId") || searchParams.get("id");
        const jobIdParam = searchParams.get("jobId");
        if (selectedOrder) {
          const match = orderList.find(
            (o) => String(o._id || o.id) === String(selectedOrder._id || selectedOrder.id)
          );
          if (match) setSelectedOrder(match);
        } else if (orderIdParam) {
          const match = orderList.find(
            (o) =>
              String(o._id || o.id) === String(orderIdParam) ||
              o.orderNumber === orderIdParam ||
              o.productionNo === orderIdParam
          );
          if (match) setSelectedOrder(match);
        } else if (jobIdParam) {
          const match = orderList.find(
            (o) =>
              String(o.jobOrderId?._id || o.jobOrderId || "") === String(jobIdParam) ||
              o.jobOrderNo === jobIdParam ||
              o.jobOrderId?.jobNo === jobIdParam
          );
          if (match) setSelectedOrder(match);
        } else if (orderList.length > 0 && searchParams.get("tab") === "details") {
          setSelectedOrder(orderList[0]);
        }
      }

      // Queue
      if (queueRes.status === "fulfilled" && queueRes.value) {
        const data = queueRes.value.data?.items || queueRes.value.data || (Array.isArray(queueRes.value) ? queueRes.value : []);
        setOperationQueue(Array.isArray(data) ? data : []);
      }

      // Pending QC
      if (pendingQcRes.status === "fulfilled" && pendingQcRes.value) {
        const data = pendingQcRes.value.data?.items || pendingQcRes.value.data || (Array.isArray(pendingQcRes.value) ? pendingQcRes.value : []);
        setPendingQCList(Array.isArray(data) ? data : []);
      }

      // All QC
      if (qcRes.status === "fulfilled" && qcRes.value) {
        const data = qcRes.value.data?.items || qcRes.value.data || (Array.isArray(qcRes.value) ? qcRes.value : []);
        setQualityChecks(Array.isArray(data) ? data : []);
      }

      // Reprints
      if (reprintsRes.status === "fulfilled" && reprintsRes.value) {
        const data = reprintsRes.value.data?.items || reprintsRes.value.data || (Array.isArray(reprintsRes.value) ? reprintsRes.value : []);
        setReprintRequests(Array.isArray(data) ? data : []);
      }

      // Planning jobs
      if (planningJobsRes.status === "fulfilled" && planningJobsRes.value) {
        const items = planningJobsRes.value.data?.items || planningJobsRes.value.data || (Array.isArray(planningJobsRes.value) ? planningJobsRes.value : []);
        if (Array.isArray(items)) {
          const formatted = items.map((job) => ({
            _id: job._id || job.id,
            jobNo: job.jobNo || job.jobNumber || `JO-${(job._id || "").slice(-6)}`,
            customerName: job.customerName || job.customer?.name || job.customerSnapshot?.name || "Customer",
            productName: job.title || job.jobTitle || job.productType || "Print Job",
            dimensions: job.specs?.size || job.dimensions || "Standard",
            materialStock: job.specs?.paperType || job.paper || "Standard Stock",
            finishingMethod: job.specs?.finishing || job.finishingRequired || "Standard Trimming",
            qty: job.specs?.quantity || job.quantity || 1000,
            dueDate: job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "Scheduled",
            priority: job.priority || "Normal",
            status: job.currentStage === "PRODUCTION_PLANNING" ? "Ready for Planning" : "In Production",
            raw: job,
          }));
          setPlanningJobs(formatted);

          // Deep link job selection
          const requestedJobId = searchParams.get("jobId");
          if (requestedJobId) {
            const match = formatted.find(
              (j) => String(j._id) === String(requestedJobId) || j.jobNo === requestedJobId
            );
            if (match) {
              setSelectedPlanJob(match);
              setPlanModalJob(match);
              const currentTab = searchParams.get("tab");
              if (!currentTab || currentTab === "planning" || currentTab === "orders") {
                setActiveTab("orders");
              }
            }
          } else if (!selectedPlanJob && formatted.length > 0) {
            setSelectedPlanJob(formatted[0]);
          }
        }
      }
    } catch (err) {
      console.warn("Error fetching production datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  // ──────────────── DYNAMIC OPERATIONS SEQUENCE GENERATOR ────────────────
  const generateDynamicSequence = (job) => {
    if (!job) return [];
    if (Array.isArray(job.operations) && job.operations.length > 0) return job.operations;
    if (Array.isArray(job.raw?.operations) && job.raw.operations.length > 0) return job.raw.operations;

    const title = (job.productName || job.title || "").toLowerCase();
    const finishing = (job.finishingMethod || job.raw?.specs?.finishing || "").toLowerCase();
    const qty = Number(job.qty || job.quantity || 1000);

    const ops = [];
    let seq = 1;

    // 1. Prepress / Prep
    ops.push({
      id: `op-seq-${seq}`,
      sequenceNo: seq++,
      operationCode: "PREPRESS",
      operationName: "Raw Material Prep & Plate Cut",
      machine: "Guillotine Cutter 01",
      estimatedMinutes: 20,
      plannedQty: qty,
      isRequired: true,
      dependencySequence: null,
    });

    // 2. Printing
    let printMachine = "Konica Minolta AccurioPress";
    let printCode = "PRINT";
    let printName = "Digital 4-Color Press";
    let estMin = 40;

    if (title.includes("banner") || title.includes("flex") || title.includes("vinyl")) {
      printMachine = "Roland Large-Format UV";
      printName = "Large Format UV Press";
      estMin = 50;
    } else if (qty >= 10000) {
      printMachine = "Heidelberg Speedmaster Offset";
      printName = "Offset 4-Color Press";
      estMin = 90;
    }

    ops.push({
      id: `op-seq-${seq}`,
      sequenceNo: seq++,
      operationCode: printCode,
      operationName: printName,
      machine: printMachine,
      estimatedMinutes: estMin,
      plannedQty: qty,
      isRequired: true,
      dependencySequence: seq - 2,
    });

    // 3. Finishing Steps dynamically configured
    if (finishing.includes("lamination") || finishing.includes("gloss") || finishing.includes("matt")) {
      ops.push({
        id: `op-seq-${seq}`,
        sequenceNo: seq++,
        operationCode: "LAMINATION",
        operationName: finishing.includes("gloss") ? "Gloss Thermal Lamination" : "Matte Thermal Lamination",
        machine: "Thermal Laminator 01",
        estimatedMinutes: 30,
        plannedQty: qty,
        isRequired: true,
        dependencySequence: seq - 2,
      });
    }

    if (finishing.includes("uv") || finishing.includes("varnish")) {
      ops.push({
        id: `op-seq-${seq}`,
        sequenceNo: seq++,
        operationCode: "SPOT_UV",
        operationName: "Spot UV Coating & Curing",
        machine: "MGI JETvarnish Station",
        estimatedMinutes: 25,
        plannedQty: qty,
        isRequired: true,
        dependencySequence: seq - 2,
      });
    }

    if (finishing.includes("foil") || finishing.includes("stamp")) {
      ops.push({
        id: `op-seq-${seq}`,
        sequenceNo: seq++,
        operationCode: "FOIL_STAMP",
        operationName: "Metallic Foil Stamping",
        machine: "Heidelberg Foil Platen",
        estimatedMinutes: 35,
        plannedQty: qty,
        isRequired: true,
        dependencySequence: seq - 2,
      });
    }

    if (finishing.includes("die cut") || finishing.includes("die-cut") || title.includes("box")) {
      ops.push({
        id: `op-seq-${seq}`,
        sequenceNo: seq++,
        operationCode: "DIE_CUTTING",
        operationName: "Die Cutting & Creasing",
        machine: "Platen Die Cutter 02",
        estimatedMinutes: 40,
        plannedQty: qty,
        isRequired: true,
        dependencySequence: seq - 2,
      });
    }

    if (finishing.includes("fold") || title.includes("brochure") || title.includes("flyer")) {
      ops.push({
        id: `op-seq-${seq}`,
        sequenceNo: seq++,
        operationCode: "FOLDING",
        operationName: "Automated Buckle Folding",
        machine: "Stahlfolder Buckle",
        estimatedMinutes: 20,
        plannedQty: qty,
        isRequired: true,
        dependencySequence: seq - 2,
      });
    }

    if (finishing.includes("bind") || title.includes("book") || title.includes("catalog")) {
      ops.push({
        id: `op-seq-${seq}`,
        sequenceNo: seq++,
        operationCode: "BINDING",
        operationName: finishing.includes("perfect") ? "Perfect Book Binding" : "Saddle Stitching & Spine Trim",
        machine: "Duplo Stitching System",
        estimatedMinutes: 45,
        plannedQty: qty,
        isRequired: true,
        dependencySequence: seq - 2,
      });
    }

    // Trimming
    ops.push({
      id: `op-seq-${seq}`,
      sequenceNo: seq++,
      operationCode: "CUTTING",
      operationName: "Final Precision Trimming",
      machine: "Polar High-Speed Guillotine 115",
      estimatedMinutes: 20,
      plannedQty: qty,
      isRequired: true,
      dependencySequence: seq - 2,
    });

    // 4. Final Packing
    ops.push({
      id: `op-seq-${seq}`,
      sequenceNo: seq++,
      operationCode: "PACKING",
      operationName: "Final Packaging & Bundling",
      machine: "Packing Station 01",
      estimatedMinutes: 15,
      plannedQty: qty,
      isRequired: true,
      dependencySequence: seq - 2,
    });

    return ops;
  };

  // Dynamic Planning Operations State
  const [plannedOperations, setPlannedOperations] = useState([]);

  useEffect(() => {
    if (selectedPlanJob) {
      setPlannedOperations(generateDynamicSequence(selectedPlanJob));
    }
  }, [selectedPlanJob]);

  // ──────────────── COMPUTED SUMMARY COUNTS (PAGE 1) ────────────────
  const counts = useMemo(() => {
    const totalOrders = productionOrders.length;
    const unassigned = productionOrders.filter((o) => o.status === "UNASSIGNED").length;
    const planned = productionOrders.filter((o) => o.status === "PLANNED").length;
    const inProgress = productionOrders.filter((o) => o.status === "IN_PROGRESS").length;
    const onHold = productionOrders.filter((o) => o.status === "ON_HOLD").length;
    const inQC = productionOrders.filter((o) => o.status === "QC").length;
    const completed = productionOrders.filter((o) => o.status === "COMPLETED").length;
    const cancelled = productionOrders.filter((o) => o.status === "CANCELLED").length;

    const failedOps = operationQueue.filter((op) => op.status === "FAILED").length;
    const runningOps = operationQueue.filter((op) => op.status === "RUNNING").length;
    const pendingOps = operationQueue.filter((op) => op.status === "PENDING").length;

    const pendingQC = pendingQCList.length || inQC;
    const qcPassed = qualityChecks.filter((q) => q.result === "PASS").length;
    const qcIssues = qualityChecks.filter((q) => q.result === "ISSUE").length;

    const reworkReq = qualityChecks.filter((q) => q.result === "ISSUE" && q.correctiveAction === "REWORK").length;
    const reprintReq = reprintRequests.length;
    const readyForDelivery = completed;

    return {
      totalOrders,
      unassigned,
      planned,
      inProgress,
      onHold,
      inQC,
      completed,
      cancelled,
      failedOps,
      runningOps,
      pendingOps,
      pendingQC,
      qcPassed,
      qcIssues,
      reworkReq,
      reprintReq,
      readyForDelivery,
    };
  }, [productionOrders, operationQueue, pendingQCList, qualityChecks, reprintRequests]);

  // ──────────────── FILTERS FOR PRODUCTION ORDERS (PAGE 2) ────────────────
  const [orderSearch, setOrderSearch] = useState(() => searchParams.get("orderSearch") || searchParams.get("search") || "");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderPriorityFilter, setOrderPriorityFilter] = useState("ALL");

  const filteredOrders = useMemo(() => {
    return productionOrders.filter((order) => {
      const matchSearch =
        !orderSearch ||
        (order.orderNumber || "").toLowerCase().includes(orderSearch.toLowerCase()) ||
        (order.productionNo || "").toLowerCase().includes(orderSearch.toLowerCase()) ||
        (order.jobOrderNo || order.jobNo || order.jobOrderId?.jobNo || "").toLowerCase().includes(orderSearch.toLowerCase()) ||
        (order.customerName || order.customer?.name || order.customerSnapshot?.name || "").toLowerCase().includes(orderSearch.toLowerCase()) ||
        (order.productName || order.title || order.jobTitle || "").toLowerCase().includes(orderSearch.toLowerCase());

      const matchStatus = orderStatusFilter === "ALL" || order.status === orderStatusFilter;
      const matchPriority = orderPriorityFilter === "ALL" || (order.priority || "Normal").toLowerCase() === orderPriorityFilter.toLowerCase();
      const matchBranch = orderBranchFilter === "ALL" || (order.branch || order.branchName || "Main HQ").toLowerCase().includes(orderBranchFilter.toLowerCase());
      const matchMachine = orderMachineFilter === "ALL" || (order.machine || order.operations?.[0]?.machine || "").toLowerCase().includes(orderMachineFilter.toLowerCase());

      let matchDate = true;
      if (orderFromDate) {
        const orderDate = new Date(order.plannedStartDate || order.createdAt || order.plannedStart);
        matchDate = matchDate && orderDate >= new Date(orderFromDate);
      }
      if (orderToDate) {
        const orderDate = new Date(order.plannedStartDate || order.createdAt || order.plannedStart);
        matchDate = matchDate && orderDate <= new Date(orderToDate + "T23:59:59");
      }

      return matchSearch && matchStatus && matchPriority && matchBranch && matchMachine && matchDate;
    });
  }, [productionOrders, orderSearch, orderStatusFilter, orderPriorityFilter, orderBranchFilter, orderMachineFilter, orderFromDate, orderToDate]);

  const orderRows = Math.max(1, Number(orderRowsPerPage) || 10);
  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / orderRows));
  const validOrderPage = Math.min(Math.max(1, orderPage), totalOrderPages);

  const paginatedOrders = useMemo(() => {
    const start = (validOrderPage - 1) * orderRows;
    return filteredOrders.slice(start, start + orderRows);
  }, [filteredOrders, validOrderPage, orderRows]);

  // ──────────────── PAGINATION & FILTERING FOR PRODUCTION STATUS SUMMARY (OVERVIEW) ────────────────
  const filteredSummaryOrders = useMemo(() => {
    return productionOrders.filter((order) => {
      if (overviewBranch !== "ALL") {
        const bName = (order.branchId?.name || order.branchName || "").toLowerCase();
        if (!bName.includes(overviewBranch.toLowerCase())) return false;
      }
      if (overviewDateFrom) {
        const orderDate = new Date(order.plannedStartDate || order.createdAt || order.plannedStart);
        if (orderDate < new Date(overviewDateFrom)) return false;
      }
      if (overviewDateTo) {
        const orderDate = new Date(order.plannedStartDate || order.createdAt || order.plannedStart);
        if (orderDate > new Date(overviewDateTo + "T23:59:59")) return false;
      }
      return true;
    });
  }, [productionOrders, overviewBranch, overviewDateFrom, overviewDateTo]);

  const summaryRows = Math.max(1, Number(summaryRowsPerPage) || 6);
  const totalSummaryPages = Math.max(1, Math.ceil(filteredSummaryOrders.length / summaryRows));
  const validSummaryPage = Math.min(Math.max(1, summaryPage), totalSummaryPages);

  const paginatedSummaryOrders = useMemo(() => {
    const start = (validSummaryPage - 1) * summaryRows;
    return filteredSummaryOrders.slice(start, start + summaryRows);
  }, [filteredSummaryOrders, validSummaryPage, summaryRows]);

  const getSummaryPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalSummaryPages <= maxVisible) {
      for (let i = 1; i <= totalSummaryPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, validSummaryPage - 1);
      let end = Math.min(totalSummaryPages - 1, validSummaryPage + 1);
      if (validSummaryPage <= 2) {
        end = 4;
      } else if (validSummaryPage >= totalSummaryPages - 1) {
        start = totalSummaryPages - 3;
      }
      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalSummaryPages - 1) pages.push("...");
      pages.push(totalSummaryPages);
    }
    return pages;
  };

  // ──────────────── FILTERS FOR OPERATION QUEUE (PAGE 4) ────────────────
  const [queueSearch, setQueueSearch] = useState("");
  const [queueTabFilter, setQueueTabFilter] = useState("ALL_ELIGIBLE");
  const [queueOpCodeFilter, setQueueOpCodeFilter] = useState("ALL");
  const [queueMachineFilter, setQueueMachineFilter] = useState("ALL");
  const [queueOrderFilter, setQueueOrderFilter] = useState("ALL");

  // Determine eligibility: an operation is eligible to start only if all prior sequence operations are COMPLETED or SKIPPED
  const checkOperationEligibility = (op, allOpsInOrder) => {
    if (!allOpsInOrder || allOpsInOrder.length <= 1) return { eligible: true };
    const mySeq = Number(op.sequenceNo || op.sequence || 1);
    const priorOps = allOpsInOrder.filter((o) => Number(o.sequenceNo || o.sequence || 1) < mySeq);

    for (const prior of priorOps) {
      if (prior.status !== "COMPLETED" && prior.status !== "SKIPPED") {
        return {
          eligible: false,
          reason: `Waiting on Step #${prior.sequenceNo || prior.sequence} (${prior.operationName || prior.operation}) which is currently ${prior.status}.`,
        };
      }
    }
    return { eligible: true };
  };

  const filteredQueue = useMemo(() => {
    return operationQueue.filter((op) => {
      // Find parent order from current production orders
      const parentOrder = productionOrders.find(
        (o) => String(o._id || o.id) === String(op.productionOrderId?._id || op.productionOrderId || "")
      );
      // If productionOrders list is loaded, filter out orphaned old mock operations
      if (productionOrders.length > 0 && !parentOrder) return false;

      // Filter by queueSearch
      if (queueSearch) {
        const q = queueSearch.toLowerCase().trim();
        const opName = (op.operationName || op.operation || "").toLowerCase();
        const opCode = (op.operationCode || "").toLowerCase();
        const machine = (op.machine || "").toLowerCase();
        const emp = (op.assignedEmployee || op.operatorId?.name || "").toLowerCase();
        const jobNo = (parentOrder?.jobOrderNo || parentOrder?.jobOrderId?.jobNo || "").toLowerCase();
        const poNo = (parentOrder?.orderNumber || parentOrder?.productionNo || "").toLowerCase();
        const cust = (parentOrder?.customerName || "").toLowerCase();
        const match =
          opName.includes(q) ||
          opCode.includes(q) ||
          machine.includes(q) ||
          emp.includes(q) ||
          jobNo.includes(q) ||
          poNo.includes(q) ||
          cust.includes(q);
        if (!match) return false;
      }

      // Filter by specific Production Order if selected
      if (queueOrderFilter !== "ALL") {
        const pId = String(op.productionOrderId?._id || op.productionOrderId || "");
        if (pId !== queueOrderFilter) return false;
      }

      if (queueTabFilter === "PENDING" && op.status !== "PENDING") return false;
      if (queueTabFilter === "RUNNING" && op.status !== "RUNNING") return false;
      if (queueTabFilter === "COMPLETED" && op.status !== "COMPLETED") return false;
      if (queueTabFilter === "FAILED" && op.status !== "FAILED") return false;
      if (queueTabFilter === "SKIPPED" && op.status !== "SKIPPED") return false;

      if (queueOpCodeFilter !== "ALL") {
        const opName = (op.operationName || op.operation || "").toLowerCase();
        const opCode = (op.operationCode || "").toLowerCase();
        const target = queueOpCodeFilter.toLowerCase();
        if (!opName.includes(target) && !opCode.includes(target)) return false;
      }

      if (queueMachineFilter !== "ALL" && op.machine !== queueMachineFilter) return false;

      if (queueBranchFilter !== "ALL") {
        const branch = (parentOrder?.branch || parentOrder?.branchName || "Main HQ").toLowerCase();
        if (!branch.includes(queueBranchFilter.toLowerCase())) return false;
      }

      if (queueAssignedToMe) {
        const emp = (op.assignedEmployee || op.operatorId?.name || "").toLowerCase();
        if (!emp.includes("priya") && !emp.includes("vasu") && !emp.includes("admin")) return false;
      }

      return true;
    });
  }, [operationQueue, queueSearch, queueTabFilter, queueOpCodeFilter, queueMachineFilter, queueOrderFilter, queueBranchFilter, queueAssignedToMe, productionOrders]);

  const queueRows = Math.max(1, Number(queueRowsPerPage) || 10);
  const totalQueuePages = Math.max(1, Math.ceil(filteredQueue.length / queueRows));
  const validQueuePage = Math.min(Math.max(1, queuePage), totalQueuePages);

  const paginatedQueue = useMemo(() => {
    const start = (validQueuePage - 1) * queueRows;
    return filteredQueue.slice(start, start + queueRows);
  }, [filteredQueue, validQueuePage, queueRows]);

  // ──────────────── FILTERS & PAGINATION FOR REPRINT REQUESTS (PAGE 5) ────────────────
  const filteredReprints = useMemo(() => {
    return reprintRequests.filter((r) => {
      if (reprintStatusFilter !== "ALL" && r.status !== reprintStatusFilter) return false;
      if (reprintSearch) {
        const q = reprintSearch.toLowerCase();
        const jobNo = (r.jobOrderId?.jobNo || r.jobOrderNo || "").toLowerCase();
        const reqNo = (r.reprintRequestNo || r._id || "").toLowerCase();
        const reason = (r.reason || "").toLowerCase();
        if (!jobNo.includes(q) && !reqNo.includes(q) && !reason.includes(q)) return false;
      }
      if (reprintFromDate) {
        const rDate = new Date(r.createdAt || r.requestedAt);
        if (rDate < new Date(reprintFromDate)) return false;
      }
      if (reprintToDate) {
        const rDate = new Date(r.createdAt || r.requestedAt);
        if (rDate > new Date(reprintToDate + "T23:59:59")) return false;
      }
      return true;
    });
  }, [reprintRequests, reprintStatusFilter, reprintSearch, reprintFromDate, reprintToDate]);

  const reprintRows = Math.max(1, Number(reprintRowsPerPage) || 10);
  const totalReprintPages = Math.max(1, Math.ceil(filteredReprints.length / reprintRows));
  const validReprintPage = Math.min(Math.max(1, reprintPage), totalReprintPages);

  const paginatedReprints = useMemo(() => {
    const start = (validReprintPage - 1) * reprintRows;
    return filteredReprints.slice(start, start + reprintRows);
  }, [filteredReprints, validReprintPage, reprintRows]);

  // ──────────────── PAGINATION FOR ORDER DETAILS OPERATIONS TIMELINE (TAB 5) ────────────────
  const detailsOps = useMemo(() => {
    return selectedOrder?.operations || [];
  }, [selectedOrder]);

  const detailsOpRows = Math.max(1, Number(detailsOpRowsPerPage) || 10);
  const totalDetailsOpPages = Math.max(1, Math.ceil(detailsOps.length / detailsOpRows));
  const validDetailsOpPage = Math.min(Math.max(1, detailsOpPage), totalDetailsOpPages);

  const paginatedDetailsOperations = useMemo(() => {
    const start = (validDetailsOpPage - 1) * detailsOpRows;
    return detailsOps.slice(start, start + detailsOpRows);
  }, [detailsOps, validDetailsOpPage, detailsOpRows]);

  // Reset pagination pages when filters or selected records change
  useEffect(() => {
    setSummaryPage(1);
  }, [overviewBranch, overviewDateFrom, overviewDateTo]);

  useEffect(() => {
    setOrderPage(1);
  }, [orderSearch, orderStatusFilter, orderPriorityFilter, orderBranchFilter, orderMachineFilter, orderFromDate, orderToDate]);

  useEffect(() => {
    setQueuePage(1);
  }, [queueSearch, queueTabFilter, queueOpCodeFilter, queueMachineFilter, queueOrderFilter, queueBranchFilter, queueAssignedToMe]);

  useEffect(() => {
    setReprintPage(1);
  }, [reprintSearch, reprintStatusFilter, reprintFromDate, reprintToDate]);

  useEffect(() => {
    setDetailsOpPage(1);
  }, [selectedOrder?._id, selectedOrder?.id]);

  // ──────────────── SAVE PLANNING CONFIGURATION (PAGE 3) ────────────────
  const handleSavePlanning = async () => {
    if (!selectedPlanJob) return;
    setLoading(true);
    try {
      const jobId = selectedPlanJob._id || selectedPlanJob.id;
      const planPayload = {
        operations: plannedOperations.map((o, idx) => ({
          sequenceNo: idx + 1,
          operationCode: o.operationCode || "OP",
          operationName: o.operationName || o.operation,
          machine: o.machine || "Standard Equipment",
          estimatedMinutes: Number(o.estimatedMinutes) || 30,
          plannedQty: Number(o.plannedQty) || Number(selectedPlanJob.qty) || 1000,
          isRequired: o.isRequired !== false,
        })),
        plannedStartDate: new Date(),
      };

      await jobFlowApi.planProductionOrder(jobId, planPayload);
      toast.success(`Production sequence successfully saved for Job ${selectedPlanJob.jobNo}!`);
      triggerRefresh();
      handleTabChange("orders");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save production planning.");
    } finally {
      setLoading(false);
    }
  };

  // Reorder operation steps
  const moveOperation = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= plannedOperations.length) return;
    const updated = [...plannedOperations];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    // recalculate sequence
    const resequenced = updated.map((op, idx) => ({ ...op, sequenceNo: idx + 1 }));
    setPlannedOperations(resequenced);
  };

  const handleAddCustomOperation = () => {
    const newSeq = plannedOperations.length + 1;
    setPlannedOperations((prev) => [
      ...prev,
      {
        id: `custom-op-${Date.now()}`,
        sequenceNo: newSeq,
        operationCode: "FINISHING",
        operationName: "Custom Finishing Operation",
        machine: "Floor Workstation",
        estimatedMinutes: 20,
        plannedQty: selectedPlanJob?.qty || 1000,
        isRequired: true,
      },
    ]);
    toast.info("Added customizable operation step.");
  };

  const handleRemoveOperation = (idx) => {
    if (plannedOperations.length <= 1) {
      toast.warning("A production order requires at least one operation step.");
      return;
    }
    const filtered = plannedOperations.filter((_, i) => i !== idx);
    const resequenced = filtered.map((op, i) => ({ ...op, sequenceNo: i + 1 }));
    setPlannedOperations(resequenced);
  };

  // Check if all operations for the currently selected order are completed
  const allOperationsCompleted = useMemo(() => {
    if (!selectedOrder || !Array.isArray(selectedOrder.operations) || selectedOrder.operations.length === 0) {
      return false;
    }
    return selectedOrder.operations.every(
      (op) => op.status === "COMPLETED" || op.status === "SKIPPED"
    );
  }, [selectedOrder]);

  // Start single operation from timeline
  const handleStartOperation = async (op) => {
    setLoading(true);
    try {
      const qty = Number(op.inputQty) || Number(selectedOrder?.plannedQty) || 1000;
      await jobFlowApi.startOperation(op._id || op.id, {
        inputQty: qty,
      });
      toast.success(`Operation "${op.operationName || op.operation}" started!`);
      triggerRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start operation.");
    } finally {
      setLoading(false);
    }
  };

  // Complete single operation from timeline
  const handleCompleteOperation = async (op) => {
    setLoading(true);
    try {
      const qty = Number(op.inputQty) || Number(selectedOrder?.plannedQty) || 1000;
      await jobFlowApi.completeOperation(op._id || op.id, {
        inputQty: qty,
        outputQty: qty,
        completedQty: qty,
        remarks: "Completed via sequence tracker",
      });
      toast.success(`Operation "${op.operationName || op.operation}" completed!`);
      triggerRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete operation.");
    } finally {
      setLoading(false);
    }
  };

  // Quick complete all operations in sequence
  const handleQuickCompleteAll = async () => {
    if (!selectedOrder?.operations || selectedOrder.operations.length === 0) return;
    setLoading(true);
    try {
      const ops = [...selectedOrder.operations].sort(
        (a, b) => Number(a.sequenceNo || 1) - Number(b.sequenceNo || 1)
      );
      for (const op of ops) {
        if (op.status === "COMPLETED" || op.status === "SKIPPED") continue;
        const qty = Number(op.inputQty) || Number(selectedOrder?.plannedQty) || 1000;
        if (op.status === "PENDING") {
          try {
            await jobFlowApi.startOperation(op._id || op.id, { inputQty: qty });
          } catch (e) {
            // continue
          }
        }
        await jobFlowApi.completeOperation(op._id || op.id, {
          inputQty: qty,
          outputQty: qty,
          completedQty: qty,
          remarks: "Completed via Quick Complete All",
        });
      }
      toast.success("All operations successfully completed!");
      triggerRefresh();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to complete all operations.");
    } finally {
      setLoading(false);
    }
  };

  // Send Order to Quality Control (QC)
  const handleSendOrderToQC = async (targetOrder = null) => {
    const orderToMove = targetOrder && targetOrder._id ? targetOrder : selectedOrder;
    if (!orderToMove) return;
    setLoading(true);
    try {
      const orderId = orderToMove._id || orderToMove.id;
      const plannedQty = Number(orderToMove.plannedQty) || 1000;
      await jobFlowApi.updateProductionOrder(orderId, {
        status: "QC",
        actualQty: orderToMove.actualQty || plannedQty,
      });
      toast.success("Production Order successfully moved to Quality Control (QC)!");
      triggerRefresh();
      navigate(`/jobflow/qc?orderId=${orderId}&jobId=${orderToMove.jobOrderId?._id || orderToMove.jobOrderId || ""}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to send order to QC.");
    } finally {
      setLoading(false);
    }
  };

  // ──────────────── PLAN PRODUCTION MODAL SUBMIT (SCREENSHOT 2) ────────────────
  const handlePlanModalSubmit = async () => {
    if (!planModalJob) {
      toast.error("Please select a job order to plan production.");
      return;
    }
    setLoading(true);
    try {
      // NOTE: Do NOT send hardcoded operations array!
      // The backend will generate operations strictly based on the job order requirements.
      const payload = {
        plannedStartDate: planModalStart,
        machine: planModalMachine,
        assignedEmployees: planModalEmployees,
        priority: (planModalPriority || "NORMAL").toUpperCase(),
      };
      await jobFlowApi.planProductionOrder(planModalJob._id || planModalJob.id, payload);
      toast.success("Production planned successfully!");
      setIsPlanModalOpen(false);
      triggerRefresh();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to plan production.");
    } finally {
      setLoading(false);
    }
  };

  // ──────────────── EDIT ORDER MODAL SUBMIT ────────────────
  const handleEditOrderSubmit = async () => {
    if (!editOrderData) return;
    setLoading(true);
    try {
      const payload = {
        plannedStartDate: editOrderData.plannedStartDate,
        machine: editOrderData.machine,
        assignedEmployees: editOrderData.assignedEmployees,
        priority: editOrderData.priority,
        notes: editOrderData.notes,
      };
      await jobFlowApi.updateProductionOrder(editOrderData._id || editOrderData.id, payload);
      toast.success("Production order updated successfully!");
      setIsEditOrderModalOpen(false);
      triggerRefresh();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update production order.");
    } finally {
      setLoading(false);
    }
  };

  // ──────────────── NEW REPRINT REQUEST SUBMIT (SCREENSHOT 5) ────────────────
  const handleCreateReprintSubmit = async () => {
    if (!newReprintJobId) {
      toast.error("Please select a Job Order.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        jobItem: newReprintJobItem || "Primary Item",
        reason: newReprintReason || "Defect flagged in QC/Packing",
        quantity: Number(newReprintQuantity) || 100,
        sourceStage: newReprintSourceStage || "QC",
        requestedBy: "Production Supervisor",
      };
      await jobFlowApi.createReprintRequest(newReprintJobId, payload);
      toast.success("Reprint request submitted successfully!");
      setIsNewReprintModalOpen(false);
      setNewReprintReason("");
      triggerRefresh();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit reprint request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <JobFlowLayout
      title="Production Operations & Floor Control"
      actions={
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            onClick={triggerRefresh}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            Refresh Data
          </button>
        </div>
      }
    >
    
      {/* ──────────────── TAB 1: PRODUCTION OVERVIEW (PAGE 1) ──────────────── */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Top Section: Dashboard Title & Filters */}
          <div className="jf-card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 750, color: "#0f172a" }}>
                  Production Dashboard
                </h2>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>Branch:</span>
                  <select
                    className="jf-input jf-input-sm"
                    value={overviewBranch}
                    onChange={(e) => setOverviewBranch(e.target.value)}
                  >
                    <option value="ALL">All Authorized Branches</option>
                    <option value="Main HQ">Main HQ Branch</option>
                    <option value="West Coast">West Coast Branch</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>From:</span>
                  <input
                    type="date"
                    className="jf-input jf-input-sm"
                    value={overviewDateFrom}
                    onChange={(e) => setOverviewDateFrom(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>To:</span>
                  <input
                    type="date"
                    className="jf-input jf-input-sm"
                    value={overviewDateTo}
                    onChange={(e) => setOverviewDateTo(e.target.value)}
                  />
                </div>

                {(overviewDateFrom || overviewDateTo || overviewBranch !== "ALL") && (
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    onClick={() => {
                      setOverviewDateFrom("");
                      setOverviewDateTo("");
                      setOverviewBranch("ALL");
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 5 Summary Cards */}
          {/* <div className="jf-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div
              className="jf-stat-box"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setOrderStatusFilter("PLANNED");
                handleTabChange("orders");
              }}
            >
              <div className="jf-stat-icon" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                <Clock size={22} />
              </div>
              <div>
                <div className="jf-stat-val">{counts.planned}</div>
                <div className="jf-stat-label">Planned</div>
              </div>
            </div>

            <div
              className="jf-stat-box"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setOrderStatusFilter("IN_PROGRESS");
                handleTabChange("orders");
              }}
            >
              <div className="jf-stat-icon" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                <Play size={22} />
              </div>
              <div>
                <div className="jf-stat-val">{counts.inProgress}</div>
                <div className="jf-stat-label">In Progress</div>
              </div>
            </div>

            <div
              className="jf-stat-box"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setOrderStatusFilter("ON_HOLD");
                handleTabChange("orders");
              }}
            >
              <div className="jf-stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
                <Pause size={22} />
              </div>
              <div>
                <div className="jf-stat-val">{counts.onHold}</div>
                <div className="jf-stat-label">On Hold</div>
              </div>
            </div>

            <div
              className="jf-stat-box"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/jobflow/qc")}
            >
              <div className="jf-stat-icon" style={{ background: "#fef9c3", color: "#a16207" }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="jf-stat-val">{counts.pendingQC}</div>
                <div className="jf-stat-label">QC Pending</div>
              </div>
            </div>

            <div
              className="jf-stat-box"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setOrderStatusFilter("COMPLETED");
                handleTabChange("orders");
              }}
            >
              <div className="jf-stat-icon" style={{ background: "#dcfce7", color: "#15803d" }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div className="jf-stat-val">{counts.completed}</div>
                <div className="jf-stat-label">Completed</div>
              </div>
            </div>
          </div> */}

          {/* Section A: Production Status Summary */}
          <div className="jf-card">
            <div className="jf-card-header">
              <div>
                <h3 className="jf-card-title">Production Status Summary</h3>
              </div>
              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                onClick={() => handleTabChange("orders")}
              >
                View All Orders <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="jf-table">
                <thead>
                  <tr>
                    <th>Production No</th>
                    <th>Job Order No</th>
                    <th>Customer</th>
                    <th>Planned Qty</th>
                    <th>Current Stage</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSummaryOrders.map((order) => (
                    <tr key={order._id || order.id}>
                      <td style={{ fontWeight: 600 }}>
                        <span
                          style={{ color: "#15803d", cursor: "pointer" }}
                          onClick={() => {
                            setSelectedOrder(order);
                            handleTabChange("details", {
                              orderId: order._id || order.id,
                            });
                          }}
                        >
                          {order.orderNumber || `PO-${order._id?.slice(-6)}`}
                        </span>
                      </td>
                      <td>{order.jobOrderNo || order.jobOrderId?.jobNo || "JO-PENDING"}</td>
                      <td>{order.customerName || "Customer"}</td>
                      <td>{order.plannedQty || 1000}</td>
                      <td>
                        <span className="jf-badge jf-badge-info">
                          {order.currentOperation || "Printing"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`jf-badge ${
                            order.priority === "Urgent" ? "jf-badge-danger" : "jf-badge-default"
                          }`}
                        >
                          {order.priority || "Normal"}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="jf-btn jf-btn-secondary jf-btn-sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            handleTabChange("details", {
                              orderId: order._id || order.id,
                            });
                          }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSummaryOrders.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                        No production orders found in the database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer with rows per page input field */}
            <TablePaginationFooter
              currentPage={validSummaryPage}
              totalItems={filteredSummaryOrders.length}
              rowsPerPage={summaryRowsPerPage}
              onPageChange={setSummaryPage}
              onRowsPerPageChange={setSummaryRowsPerPage}
              pageSizeOptions={[5, 6, 10, 20, 50]}
              itemName="orders"
            />
          </div>
        </div>
      )}

      {/* ──────────────── TAB 2: PRODUCTION ORDERS (PAGE 2) ──────────────── */}
      {activeTab === "orders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Breadcrumb & Header Bar */}
          <div className="jf-card" style={{ padding: "1.25rem" }}>
            <div style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: "0.5rem" }}>
              <span>Production</span> &gt; <strong style={{ color: "#0f172a" }}>Production Orders</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>
                  Production Orders
                </h2>
                <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                  Manage production jobs and assignments
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary"
                  onClick={() => {
                    if (planningJobs.length > 0) {
                      setPlanModalJob(planningJobs[0]);
                    }
                    setIsPlanModalOpen(true);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "#0f172a", color: "#ffffff", padding: "0.5rem 1rem", borderRadius: "6px", fontWeight: 600 }}
                >
                  <Plus size={16} /> Plan Production
                </button>
              </div>
            </div>
          </div>

          {/* 5 Summary Cards (Screenshot 1) */}
          {/* <div className="jf-stat-grid" style={{ gridTemplateColumns: counts.unassigned > 0 ? "repeat(5, 1fr)" : "repeat(4, 1fr)" }}>
            {counts.unassigned > 0 && (
              <div
                className="jf-stat-box"
                style={{ cursor: "pointer", border: orderStatusFilter === "UNASSIGNED" ? "2px solid #f59e0b" : undefined }}
                onClick={() => setOrderStatusFilter(orderStatusFilter === "UNASSIGNED" ? "ALL" : "UNASSIGNED")}
              >
                <div className="jf-stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
                  <AlertCircle size={20} />
                </div>
                <div>
                  <div className="jf-stat-val">{counts.unassigned}</div>
                  <div className="jf-stat-label">Unassigned</div>
                </div>
              </div>
            )} */}

            {/* <div
              className="jf-stat-box"
              style={{ cursor: "pointer", border: orderStatusFilter === "PLANNED" ? "2px solid #0284c7" : undefined }}
              onClick={() => setOrderStatusFilter(orderStatusFilter === "PLANNED" ? "ALL" : "PLANNED")}
            >
              <div className="jf-stat-icon" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                <Clock size={20} />
              </div>
              <div>
                <div className="jf-stat-val">{counts.planned}</div>
                <div className="jf-stat-label">Planned</div>
              </div>
            </div> */}

            {/* <div
              className="jf-stat-box"
              style={{ cursor: "pointer", border: orderStatusFilter === "IN_PROGRESS" ? "2px solid #2563eb" : undefined }}
              onClick={() => setOrderStatusFilter(orderStatusFilter === "IN_PROGRESS" ? "ALL" : "IN_PROGRESS")}
            >
              <div className="jf-stat-icon" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                <Play size={20} />
              </div>
              <div>
                <div className="jf-stat-val">{counts.inProgress}</div>
                <div className="jf-stat-label">In Progress</div>
              </div>
            </div> */}

            {/* <div
              className="jf-stat-box"
              style={{ cursor: "pointer", border: orderStatusFilter === "QC" ? "2px solid #ca8a04" : undefined }}
              onClick={() => setOrderStatusFilter(orderStatusFilter === "QC" ? "ALL" : "QC")}
            >
              <div className="jf-stat-icon" style={{ background: "#fef9c3", color: "#a16207" }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="jf-stat-val">{counts.pendingQC}</div>
                <div className="jf-stat-label">QC Pending</div>
              </div>
            </div> */}

            {/* <div
              className="jf-stat-box"
              style={{ cursor: "pointer", border: orderStatusFilter === "COMPLETED" ? "2px solid #16a34a" : undefined }}
              onClick={() => setOrderStatusFilter(orderStatusFilter === "COMPLETED" ? "ALL" : "COMPLETED")}
            >
              <div className="jf-stat-icon" style={{ background: "#dcfce7", color: "#15803d" }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="jf-stat-val">{counts.completed}</div>
                <div className="jf-stat-label">Completed</div>
              </div>
            </div> */}
          {/* </div> */}

          {/* Filters — Above the table (Screenshot 1) */}
          <div className="jf-card" style={{ padding: "1.25rem" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 750, color: "#0f172a", marginBottom: "0.75rem" }}>
              Filters
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: "10px", top: "11px", color: "#94a3b8" }} />
                <input
                  type="text"
                  className="jf-input"
                  style={{ paddingLeft: "32px", width: "100%" }}
                  placeholder="Search Production No. / Job Order"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                />
              </div>

              <select
                className="jf-input"
                value={orderBranchFilter}
                onChange={(e) => setOrderBranchFilter(e.target.value)}
              >
                <option value="ALL">Branch ▾ (All Branches)</option>
                <option value="Main HQ">Main HQ Branch</option>
                <option value="West Coast">West Coast Branch</option>
              </select>

              <select
                className="jf-input"
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
              >
                <option value="ALL">Status ▾ (All Statuses)</option>
                <option value="UNASSIGNED">UNASSIGNED</option>
                <option value="PLANNED">PLANNED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="ON_HOLD">ON_HOLD</option>
                <option value="QC">QC</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              <select
                className="jf-input"
                value={orderMachineFilter}
                onChange={(e) => setOrderMachineFilter(e.target.value)}
              >
                <option value="ALL">Machine ▾ (All Equipment)</option>
                <option value="Konica Minolta AccurioPress">Konica Minolta AccurioPress</option>
                <option value="Roland Large-Format UV">Roland Large-Format UV</option>
                <option value="Heidelberg Speedmaster Offset">Heidelberg Speedmaster</option>
                <option value="Guillotine Cutter 01">Guillotine Cutter 01</option>
              </select>

              



              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setOrderSearch("");
                    setOrderStatusFilter("ALL");
                    setOrderPriorityFilter("ALL");
                    setOrderBranchFilter("ALL");
                    setOrderMachineFilter("ALL");
                    setOrderFromDate("");
                    setOrderToDate("");
                    setOrderPage(1);
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Table Container (Screenshot 1) */}
          <div className="jf-card" style={{ padding: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>
                Production List <span style={{ fontWeight: 400, color: "#64748b" }}>({filteredOrders.length} orders)</span>
              </div>
              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                onClick={() => toast.info("Exporting production order CSV...")}
              >
                Export
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="jf-table">
                <thead>
                  <tr>
                    <th>Production No. | Job No.</th>
                    <th>Branch | Priority</th>
                    <th>Planned Qty | Actual Qty</th>
                    <th>Planned Start | Machine</th>
                    <th>Assigned Employees</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => {
                    const isHold = order.status === "ON_HOLD";
                    const isCancelled = order.status === "CANCELLED";
                    const isCompleted = order.status === "COMPLETED";

                    return (
                      <tr key={order._id || order.id}>
                        <td>
                          <div>
                            <span
                              style={{ fontWeight: 700, color: "#15803d", cursor: "pointer" }}
                              onClick={() => {
                                setSelectedOrder(order);
                                handleTabChange("details", {
                                  orderId: order._id || order.id,
                                });
                              }}
                            >
                              {order.productionNo || order.orderNumber || `PO-${order._id?.slice(-6)}`}
                            </span>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {order.jobOrderNo || order.jobOrderId?.jobNo || order.jobNo || "JO-CURRENT"}
                              {(order.customerName || order.jobOrderId?.customerSnapshot?.name || order.jobOrderId?.customerName) && (
                                <span> • {order.customerName || order.jobOrderId?.customerSnapshot?.name || order.jobOrderId?.customerName}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div>{order.branch || order.branchName || "Main HQ Branch"}</div>
                            <span
                              className={`jf-badge ${
                                order.priority === "Urgent" ? "jf-badge-danger" : "jf-badge-default"
                              }`}
                              style={{ fontSize: "0.7rem", marginTop: "2px" }}
                            >
                              {order.priority || "Normal"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{order.plannedQty || 1000} pcs</strong>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              Actual: {order.actualQty || "-"}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div>{order.plannedStartDate ? new Date(order.plannedStartDate).toLocaleDateString() : (order.status === "UNASSIGNED" ? "Unassigned" : "Scheduled")}</div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {order.status === "UNASSIGNED" && !order.machine ? "Unassigned" : (order.machine || order.operations?.[0]?.machine || (order.status === "UNASSIGNED" ? "Unassigned" : "AccurioPress"))}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.8125rem", color: "#334155" }}>
                            {order.status === "UNASSIGNED" && (!order.assignedEmployees || order.assignedEmployees.length === 0) ? (
                              <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Unassigned</span>
                            ) : (
                              Array.isArray(order.assignedEmployees) && order.assignedEmployees.length > 0
                                ? order.assignedEmployees.join(", ")
                                : (order.assignedEmployee || (order.status === "UNASSIGNED" ? "Unassigned" : "Priya Raman"))
                            )}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={order.status} />
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                            {order.status === "UNASSIGNED" && (
                              <button
                                type="button"
                                className="jf-btn jf-btn-primary jf-btn-sm"
                                style={{ background: "#0f172a", color: "#ffffff", fontWeight: 600 }}
                                onClick={() => {
                                  const job = planningJobs.find((j) => String(j._id || j.id) === String(order.jobOrderId?._id || order.jobOrderId)) || {
                                    _id: order.jobOrderId?._id || order.jobOrderId,
                                    jobNo: order.jobOrderNo || order.jobOrderId?.jobNo,
                                    customerName: order.customerName,
                                    branchId: order.branchId,
                                  };
                                  setPlanModalJob(job);
                                  setIsPlanModalOpen(true);
                                }}
                                title="Plan this production order"
                              >
                                Plan
                              </button>
                            )}
                            <button
                              type="button"
                              className="jf-btn jf-btn-secondary jf-btn-sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                handleTabChange("details", {
                                  orderId: order._id || order.id,
                                });
                              }}
                              title="View Details"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              className="jf-btn jf-btn-secondary jf-btn-sm"
                              onClick={() => {
                                setEditOrderData(order);
                                setIsEditOrderModalOpen(true);
                              }}
                              title="Edit Order"
                            >
                              Edit
                            </button>
                            {order.status === "QC" ? (
                              <button
                                type="button"
                                className="jf-btn jf-btn-primary jf-btn-sm"
                                style={{ background: "#7c3aed", color: "#ffffff" }}
                                onClick={() => navigate(`/jobflow/qc?orderId=${order._id || order.id}&jobId=${order.jobOrderId?._id || order.jobOrderId || ""}`)}
                                title="View in Quality Control"
                              >
                                QC
                              </button>
                            ) : !isCompleted && !isCancelled && (
                              <button
                                type="button"
                                className="jf-btn jf-btn-success jf-btn-sm"
                                style={{ background: "#16a34a", color: "#ffffff", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                                onClick={() => handleSendOrderToQC(order)}
                                title="Move Order to Quality Control (QC)"
                              >
                                <ShieldCheck size={13} /> Move to QC
                              </button>
                            )}

                            {!isCompleted && !isCancelled && !isHold && (
                              <button
                                type="button"
                                className="jf-btn jf-btn-warning jf-btn-sm"
                                onClick={() =>
                                  setModalOrderAction({ open: true, type: "HOLD", order })
                                }
                                title="Hold Order"
                              >
                                Hold
                              </button>
                            )}

                            {isHold && (
                              <button
                                type="button"
                                className="jf-btn jf-btn-primary jf-btn-sm"
                                onClick={() =>
                                  setModalOrderAction({ open: true, type: "RESUME", order })
                                }
                                title="Resume Order"
                              >
                                Resume
                              </button>
                            )}

                            {!isCompleted && !isCancelled && (
                              <button
                                type="button"
                                className="jf-btn jf-btn-danger jf-btn-sm"
                                onClick={() =>
                                  setModalOrderAction({ open: true, type: "CANCEL", order })
                                }
                                title="Cancel Order"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                        No production orders match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <TablePaginationFooter
              currentPage={validOrderPage}
              totalItems={filteredOrders.length}
              rowsPerPage={orderRowsPerPage}
              onPageChange={setOrderPage}
              onRowsPerPageChange={setOrderRowsPerPage}
              pageSizeOptions={[5, 10, 25, 50]}
              itemName="orders"
            />
          </div>
        </div>
      )}

      {/* ──────────────── TAB 3: OPERATION QUEUE & WORKBENCH (SCREEN 3) ──────────────── */}
      {activeTab === "queue" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Header & Operation Filter Toolbar */}
          <div className="jf-card" style={{ padding: "1.25rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 750, color: "#0f172a" }}>
                  Operation Queue (Printing / Finishing / Packing)
                </h2>
              </div>

             
            </div>

            {/* Filter Bar with Search Feature and Select Options */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
                alignItems: "center",
                borderTop: "1px solid #f1f5f9",
                paddingTop: "0.875rem",
              }}
            >
              {/* Search Feature: Direct text search across operations, job#, customer */}
              <div style={{ position: "relative", minWidth: "220px", flex: "1 1 220px" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  className="jf-input jf-input-sm"
                  style={{ paddingLeft: "32px", paddingRight: queueSearch ? "28px" : "10px", height: "36px", width: "100%", borderRadius: "6px" }}
                  placeholder="Search queue by operation, job no, customer..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                />
                {queueSearch && (
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#94a3b8",
                      padding: "2px",
                    }}
                    onClick={() => setQueueSearch("")}
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Select Option with Search Feature: Operation */}
              <SearchableSelect
                options={QUEUE_OPERATION_OPTIONS}
                value={queueOpCodeFilter}
                onChange={setQueueOpCodeFilter}
                placeholder="All Operations"
                searchPlaceholder="Search operations..."
                width="210px"
              />

              {/* Select Option: Status */}
              <SearchableSelect
                options={QUEUE_STATUS_OPTIONS}
                value={queueTabFilter}
                onChange={setQueueTabFilter}
                placeholder="All Statuses"
                searchPlaceholder="Search status..."
                width="160px"
              />

              {/* Order Select */}
              <div style={{ minWidth: "180px", maxWidth: "230px", flex: "0 1 auto" }}>
                <select
                  className="jf-input jf-input-sm"
                  value={queueOrderFilter}
                  onChange={(e) => setQueueOrderFilter(e.target.value)}
                  style={{ height: "36px", width: "100%", borderRadius: "6px", fontWeight: queueOrderFilter !== "ALL" ? 700 : 500 }}
                >
                  <option value="ALL">All Orders ({productionOrders.filter(o => o.status !== "CANCELLED" && o.status !== "UNASSIGNED").length})</option>
                  {productionOrders
                    .filter((o) => o.status !== "CANCELLED" && o.status !== "UNASSIGNED")
                    .map((o) => (
                      <option key={o._id || o.id} value={o._id || o.id}>
                        {o.productionNo} ({o.jobOrderNo || o.jobOrderId?.jobNo || "Job"})
                      </option>
                    ))}
                </select>
              </div>

              {/* Branch Select */}
              <div style={{ minWidth: "130px", flex: "0 1 auto" }}>
                <select
                  className="jf-input jf-input-sm"
                  value={queueBranchFilter}
                  onChange={(e) => setQueueBranchFilter(e.target.value)}
                  style={{ height: "36px", width: "100%", borderRadius: "6px", fontWeight: queueBranchFilter !== "ALL" ? 700 : 500 }}
                >
                  <option value="ALL">All Branches</option>
                  <option value="Main HQ">Main HQ</option>
                  <option value="West Coast">West Coast</option>
                </select>
              </div>

              {/* Reset Filters Button */}
              {(queueSearch ||
                queueOpCodeFilter !== "ALL" ||
                queueTabFilter !== "ALL_ELIGIBLE" ||
                queueOrderFilter !== "ALL" ||
                queueBranchFilter !== "ALL" ||
                queueAssignedToMe) && (
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  style={{ height: "36px", padding: "0 12px", color: "#dc2626", borderRadius: "6px", display: "flex", alignItems: "center", gap: "0.25rem" }}
                  onClick={() => {
                    setQueueSearch("");
                    setQueueOpCodeFilter("ALL");
                    setQueueTabFilter("ALL_ELIGIBLE");
                    setQueueOrderFilter("ALL");
                    setQueueBranchFilter("ALL");
                    setQueueAssignedToMe(false);
                    setQueuePage(1);
                  }}
                  title="Reset all queue filters"
                >
                  <X size={14} /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Queue Table (Screenshot 3) */}
          <div className="jf-card" style={{ padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <table className="jf-table">
                <thead>
                  <tr>
                    <th>Job Order No.</th>
                    <th>Production No.</th>
                    <th>Operation</th>
                    <th>Seq #</th>
                    <th>Customer</th>
                    <th>Due Date</th>
                    <th>Planned Qty</th>
                    <th>Input Qty</th>
                    <th>Output Qty</th>
                    <th>Assigned Employee</th>
                    <th>Machine</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedQueue.map((op) => {
                    const parentOrder = productionOrders.find(
                      (o) => (o._id || o.id) === (op.productionOrderId?._id || op.productionOrderId)
                    );
                    const opsInOrder = parentOrder?.operations || [];
                    const eligibility = checkOperationEligibility(op, opsInOrder);
                    const isPending = op.status === "PENDING" || op.status === "AVAILABLE";
                    const isRunning = op.status === "RUNNING" || op.status === "IN_PROGRESS";
                    const isFailed = op.status === "FAILED";
                    const isCompleted = op.status === "COMPLETED";
                    const isSelected = selectedQueueOp?._id === op._id;

                    return (
                      <tr
                        key={op._id || op.id}
                        style={{
                          background: isSelected ? "#f0fdf4" : undefined,
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          setSelectedQueueOp(op);
                          setWbMachine(op.machine || "Konica Minolta AccurioPress");
                          setWbInputQty(op.inputQty || parentOrder?.plannedQty || 1000);
                          setWbOutputQty(op.outputQty || op.inputQty || 1000);
                          setWbCompletedQty(op.completedQty || op.outputQty || 1000);
                        }}
                      >
                        <td>
                          <strong>{parentOrder?.jobOrderNo || parentOrder?.jobOrderId?.jobNo || "JO-CURRENT"}</strong>
                        </td>
                        <td>
                          <span style={{ color: "#15803d", fontWeight: 600 }}>
                            {parentOrder?.orderNumber || "PO-CURRENT"}
                          </span>
                        </td>
                        <td>
                          <strong>{op.operationName || op.operation}</strong>
                          <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block" }}>
                            {op.operationCode}
                          </span>
                        </td>
                        <td>
                          <span className="jf-badge jf-badge-default">#{op.sequenceNo || op.sequence || 1}</span>
                        </td>
                        <td>{parentOrder?.customerName || "Customer"}</td>
                        <td>{parentOrder?.dueDate ? new Date(parentOrder.dueDate).toLocaleDateString() : "Today"}</td>
                        <td>{op.plannedQty || parentOrder?.plannedQty || 1000}</td>
                        <td>{op.inputQty || "-"}</td>
                        <td>{op.outputQty || "-"}</td>
                        <td>{op.assignedEmployee || op.operatorId?.name || "Unassigned"}</td>
                        <td>{op.machine || "Floor Workstation"}</td>
                        <td>
                          <StatusBadge status={op.status} />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="jf-btn jf-btn-secondary jf-btn-sm"
                              onClick={() => {
                                setSelectedQueueOp(op);
                                setWbMachine(op.machine || "Konica Minolta AccurioPress");
                                setWbInputQty(op.inputQty || parentOrder?.plannedQty || 1000);
                                setWbOutputQty(op.outputQty || op.inputQty || 1000);
                                setWbCompletedQty(op.completedQty || op.outputQty || 1000);
                              }}
                              title="Open in Workbench"
                            >
                              Workbench
                            </button>

                            {isPending && !op.assignedEmployee && (
                              <button
                                type="button"
                                className="jf-btn jf-btn-secondary jf-btn-sm"
                                onClick={async () => {
                                  try {
                                    await jobFlowApi.claimOperation(op._id || op.id);
                                    toast.success("Operation claimed!");
                                    triggerRefresh();
                                  } catch (err) {
                                    toast.error("Could not claim operation.");
                                  }
                                }}
                              >
                                Claim
                              </button>
                            )}

                            {isPending && (
                              <button
                                type="button"
                                className="jf-btn jf-btn-primary jf-btn-sm"
                                disabled={!eligibility.eligible}
                                onClick={() => setModalOpStart({ open: true, op, order: parentOrder })}
                                title={eligibility.eligible ? "Start" : eligibility.reason}
                              >
                                <Play size={12} /> Start
                              </button>
                            )}

                            {isRunning && (
                              <button
                                type="button"
                                className="jf-btn jf-btn-success jf-btn-sm"
                                onClick={() => setModalOpComplete({ open: true, op, order: parentOrder })}
                              >
                                <Check size={12} /> Complete
                              </button>
                            )}

                            {isRunning && (
                              <button
                                type="button"
                                className="jf-btn jf-btn-danger jf-btn-sm"
                                onClick={() => setModalOpFail({ open: true, op, order: parentOrder })}
                              >
                                <AlertTriangle size={12} /> Fail
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredQueue.length === 0 && (
                    <tr>
                      <td colSpan={13} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                        No operations match the selected status or filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <TablePaginationFooter
              currentPage={validQueuePage}
              totalItems={filteredQueue.length}
              rowsPerPage={queueRowsPerPage}
              onPageChange={setQueuePage}
              onRowsPerPageChange={setQueueRowsPerPage}
              pageSizeOptions={[5, 10, 20, 50]}
              itemName="operations"
            />
          </div>

          {/* ──────────────── SELECTED JOB WORKBENCH (SCREEN 3) ──────────────── */}
          {selectedQueueOp && (
            <div className="jf-card" style={{ border: "2px solid #0f172a", padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                    Selected Job — Workbench
                  </h3>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                    Step #{selectedQueueOp.sequenceNo || 1}: {selectedQueueOp.operationName || selectedQueueOp.operation}
                  </span>
                </div>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={() => setSelectedQueueOp(null)}
                >
                  <X size={14} /> Close Workbench
                </button>
              </div>

              {/* Two Column Layout (Screenshot 3) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                {/* Left Panel — Job Details */}
                <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                    Left panel — Job details
                  </h4>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
                    <li>
                      <span style={{ color: "#64748b" }}>Job No. / Production No.: </span>
                      <strong>JO-20261012 / PO-88942</strong>
                    </li>
                    <li>
                      <span style={{ color: "#64748b" }}>Customer and due date: </span>
                      <strong>Apex Retail Holdings • Due: Today (5:00 PM)</strong>
                    </li>
                    <li>
                      <span style={{ color: "#64748b" }}>Job specifications: </span>
                      <span>350gsm Silk Art Card, 4C+4C, Gloss Thermal Lam, Custom Trim</span>
                    </li>
                    <li>
                      <span style={{ color: "#64748b" }}>Approved sample preview: </span>
                      <span className="jf-badge jf-badge-success" style={{ marginLeft: "4px" }}>
                        ✓ Sample Approved by Client
                      </span>
                    </li>
                    <li>
                      <span style={{ color: "#64748b" }}>Customer comments: </span>
                      <em style={{ color: "#475569" }}>"Ensure precise cut edges along fold crease."</em>
                    </li>
                  </ul>
                </div>

                {/* Right Panel — Operation Details */}
                <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                    Right panel — Operation details
                  </h4>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
                    <li>
                      <span style={{ color: "#64748b" }}>Operation code and sequence: </span>
                      <strong>{selectedQueueOp.operationCode || "PRINT"} (Step #{selectedQueueOp.sequenceNo || 1})</strong>
                    </li>
                    <li>
                      <span style={{ color: "#64748b" }}>Status and assigned employee: </span>
                      <span>
                        <StatusBadge status={selectedQueueOp.status} /> • {selectedQueueOp.assignedEmployee || "Priya Raman"}
                      </span>
                    </li>
                    <li>
                      <span style={{ color: "#64748b" }}>Machine: </span>
                      <strong>{selectedQueueOp.machine || "Konica Minolta AccurioPress"}</strong>
                    </li>
                    <li>
                      <span style={{ color: "#64748b" }}>Planned quantity: </span>
                      <strong>{selectedQueueOp.plannedQty || 1000} units</strong>
                    </li>
                    <li>
                      <span style={{ color: "#64748b" }}>Previous operation status: </span>
                      <span style={{ color: "#166534", fontWeight: 600 }}>✓ Prior steps verified & cleared</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Bottom — Action Form (Screenshot 3) */}
              <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                  Bottom — Action form
                </h4>

                {/* For Start Form */}
                {selectedQueueOp.status === "PENDING" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>For Start:</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div className="jf-form-group">
                        <label className="jf-label">Machine selector</label>
                        <select
                          className="jf-input"
                          value={wbMachine}
                          onChange={(e) => setWbMachine(e.target.value)}
                        >
                          <option value="Konica Minolta AccurioPress">Konica Minolta AccurioPress</option>
                          <option value="Roland Large-Format UV">Roland Large-Format UV</option>
                          <option value="Heidelberg Speedmaster Offset">Heidelberg Speedmaster Offset</option>
                          <option value="Guillotine Cutter 01">Guillotine Cutter 01</option>
                          <option value="Thermal Laminator 01">Thermal Laminator 01</option>
                        </select>
                      </div>
                      <div className="jf-form-group">
                        <label className="jf-label">Input quantity</label>
                        <input
                          type="number"
                          className="jf-input"
                          value={wbInputQty}
                          onChange={(e) => setWbInputQty(e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary"
                        onClick={async () => {
                          setLoading(true);
                          try {
                            await jobFlowApi.startOperation(selectedQueueOp._id || selectedQueueOp.id, {
                              machine: wbMachine,
                              inputQty: Number(wbInputQty) || 1000,
                            });
                            toast.success("Operation started successfully!");
                            triggerRefresh();
                          } catch (err) {
                            toast.error("Failed to start operation.");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        style={{ background: "#0f172a", color: "#ffffff", padding: "0.5rem 1.25rem", borderRadius: "6px" }}
                      >
                        Start Operation
                      </button>
                    </div>
                  </div>
                )}

                {/* For Complete — Printing / Finishing */}
                {selectedQueueOp.status === "RUNNING" &&
                  (selectedQueueOp.operationCode || "").toUpperCase() !== "PACKING" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>For Complete — Printing / Finishing:</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                        <div className="jf-form-group">
                          <label className="jf-label">Input quantity</label>
                          <input
                            type="number"
                            className="jf-input"
                            value={wbInputQty}
                            onChange={(e) => setWbInputQty(e.target.value)}
                          />
                        </div>
                        <div className="jf-form-group">
                          <label className="jf-label">Output quantity</label>
                          <input
                            type="number"
                            className="jf-input"
                            value={wbOutputQty}
                            onChange={(e) => setWbOutputQty(e.target.value)}
                          />
                        </div>
                        <div className="jf-form-group">
                          <label className="jf-label">Completed quantity</label>
                          <input
                            type="number"
                            className="jf-input"
                            value={wbCompletedQty}
                            onChange={(e) => setWbCompletedQty(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Material Consumption section (repeatable table) */}
                      <div style={{ marginTop: "0.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#0f172a" }}>
                            Material Consumption table:
                          </span>
                          <button
                            type="button"
                            className="jf-btn jf-btn-secondary jf-btn-sm"
                            onClick={() =>
                              setWbMaterials((prev) => [
                                ...prev,
                                { item: "Raw Stock Item", quantity: 100, type: "PAPER" },
                              ])
                            }
                          >
                            <Plus size={13} /> Add Material
                          </button>
                        </div>

                        <table className="jf-table" style={{ background: "#f8fafc" }}>
                          <thead>
                            <tr>
                              <th>Material / Inventory Item</th>
                              <th>Quantity</th>
                              <th>Consumption Type</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {wbMaterials.map((mat, idx) => (
                              <tr key={idx}>
                                <td>
                                  <input
                                    type="text"
                                    className="jf-input jf-input-sm"
                                    value={mat.item}
                                    onChange={(e) => {
                                      const updated = [...wbMaterials];
                                      updated[idx].item = e.target.value;
                                      setWbMaterials(updated);
                                    }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="jf-input jf-input-sm"
                                    value={mat.quantity}
                                    onChange={(e) => {
                                      const updated = [...wbMaterials];
                                      updated[idx].quantity = e.target.value;
                                      setWbMaterials(updated);
                                    }}
                                  />
                                </td>
                                <td>
                                  <select
                                    className="jf-input jf-input-sm"
                                    value={mat.type}
                                    onChange={(e) => {
                                      const updated = [...wbMaterials];
                                      updated[idx].type = e.target.value;
                                      setWbMaterials(updated);
                                    }}
                                  >
                                    <option value="PAPER">PAPER</option>
                                    <option value="INK_TONER">INK_TONER</option>
                                    <option value="OTHER_CONSUMABLE">OTHER_CONSUMABLE</option>
                                  </select>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="jf-btn jf-btn-danger jf-btn-sm"
                                    onClick={() =>
                                      setWbMaterials((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                  >
                                    <Trash2 size={13} /> Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="jf-form-group">
                        <label className="jf-label">Remarks</label>
                        <input
                          type="text"
                          className="jf-input"
                          placeholder="Enter operator production notes..."
                          value={wbRemarks}
                          onChange={(e) => setWbRemarks(e.target.value)}
                        />
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                        <button
                          type="button"
                          className="jf-btn jf-btn-primary"
                          onClick={async () => {
                            setLoading(true);
                            try {
                              await jobFlowApi.completeOperation(selectedQueueOp._id || selectedQueueOp.id, {
                                inputQty: Number(wbInputQty) || 1000,
                                outputQty: Number(wbOutputQty) || 1000,
                                completedQty: Number(wbCompletedQty) || 1000,
                                remarks: wbRemarks || "Operation completed.",
                                materialConsumption: wbMaterials.map((m) => ({
                                  materialName: m.item,
                                  quantity: Number(m.quantity) || 1,
                                  consumptionType: m.type,
                                })),
                              });
                              toast.success("Operation completed successfully!");
                              setSelectedQueueOp(null);
                              triggerRefresh();
                            } catch (err) {
                              toast.error("Failed to complete operation.");
                            } finally {
                              setLoading(false);
                            }
                          }}
                          style={{ background: "#0f172a", color: "#ffffff", padding: "0.5rem 1.25rem", borderRadius: "6px" }}
                        >
                          Complete Operation
                        </button>
                      </div>
                    </div>
                  )}

                {/* For Complete — Packing */}
                {selectedQueueOp.status === "RUNNING" &&
                  (selectedQueueOp.operationCode || "").toUpperCase() === "PACKING" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>For Complete — Packing:</div>
                      <div className="jf-form-group">
                        <label className="jf-label">Packed quantity</label>
                        <input
                          type="number"
                          className="jf-input"
                          value={wbPackingQty}
                          onChange={(e) => setWbPackingQty(e.target.value)}
                        />
                      </div>
                      <div className="jf-form-group">
                        <label className="jf-label">Closing comments</label>
                        <textarea
                          className="jf-input"
                          rows={3}
                          placeholder="Packed into cartons with protective edge corners..."
                          value={wbPackingRemarks}
                          onChange={(e) => setWbPackingRemarks(e.target.value)}
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                        <button
                          type="button"
                          className="jf-btn jf-btn-primary"
                          onClick={async () => {
                            setLoading(true);
                            try {
                              await jobFlowApi.completeOperation(selectedQueueOp._id || selectedQueueOp.id, {
                                completedQty: Number(wbPackingQty) || 1000,
                                remarks: wbPackingRemarks || "Packing completed.",
                              });
                              toast.success("Packing completed! Job moved to QC inspection.");
                              setSelectedQueueOp(null);
                              triggerRefresh();
                            } catch (err) {
                              toast.error("Failed to complete packing.");
                            } finally {
                              setLoading(false);
                            }
                          }}
                          style={{ background: "#0f172a", color: "#ffffff", padding: "0.5rem 1.25rem", borderRadius: "6px" }}
                        >
                          Complete Packing
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 5: REPRINT MANAGEMENT (SCREEN 5) ──────────────── */}
      {activeTab === "reprints" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Header Bar */}
          <div className="jf-card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 750, color: "#0f172a" }}>
                  Reprint Management
                </h2>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary"
                  onClick={() => {
                    if (planningJobs.length > 0) {
                      setNewReprintJobId(planningJobs[0]._id);
                      setNewReprintJobItem(planningJobs[0].productName);
                    }
                    setIsNewReprintModalOpen(true);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "#0f172a", color: "#fff" }}
                >
                  <Plus size={16} /> New Reprint Request
                </button>
              </div>
            </div>
          </div>

          {/* Filters — above the table (Screenshot 5) */}
          <div className="jf-card" style={{ padding: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  className="jf-input"
                  style={{ paddingLeft: "32px" }}
                  placeholder="Search by Job Order No. or Request ID..."
                  value={reprintSearch}
                  onChange={(e) => setReprintSearch(e.target.value)}
                />
              </div>

              <select
                className="jf-input"
                value={reprintStatusFilter}
                onChange={(e) => setReprintStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="REQUESTED">Requested (Pending)</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="IN_PRODUCTION">In Production</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <input
                type="date"
                className="jf-input"
                value={reprintFromDate}
                onChange={(e) => setReprintFromDate(e.target.value)}
                placeholder="From Date"
              />

              <input
                type="date"
                className="jf-input"
                value={reprintToDate}
                onChange={(e) => setReprintToDate(e.target.value)}
                placeholder="To Date"
              />

              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                onClick={() => {
                  setReprintSearch("");
                  setReprintStatusFilter("ALL");
                  setReprintFromDate("");
                  setReprintToDate("");
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Reprint Table */}
          <div className="jf-card" style={{ padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <table className="jf-table">
                <thead>
                  <tr>
                    <th>Job Order No.</th>
                    <th>Job Item</th>
                    <th>Requested By</th>
                    <th>Reason</th>
                    <th>Quantity</th>
                    <th>Source Stage</th>
                    <th>Status</th>
                    <th>Approved By</th>
                    <th>Requested Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReprints.map((req) => (
                    <tr key={req._id || req.id}>
                      <td>
                        <strong>{req.jobOrderId?.jobNo || req.jobOrderNo || "JO"}</strong>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {req.reprintRequestNo || `RR-${(req._id || "").slice(-5)}`}
                        </div>
                      </td>
                      <td>{req.jobItem || req.productName || "Standard Run"}</td>
                      <td>{formatUser(req.requestedBy, "Floor Operator")}</td>
                      <td style={{ maxWidth: "220px", wordBreak: "break-word" }}>
                        {req.reason || "Defect flagged during finishing"}
                      </td>
                      <td><strong>{req.quantity} pcs</strong></td>
                      <td>
                        <span className={`jf-badge ${req.sourceStage === "QC" ? "jf-badge-warning" : "jf-badge-info"}`}>
                          {req.sourceStage || "QC"}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={req.status} />
                      </td>
                      <td>{formatUser(req.approvedBy, "-")}</td>
                      <td>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "Today"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.375rem" }}>
                          {req.status === "REQUESTED" ? (
                            <button
                              type="button"
                              className="jf-btn jf-btn-primary jf-btn-sm"
                              onClick={() => {
                                setSelectedReprint(req);
                                setReprintReviewComment("");
                              }}
                              style={{ background: "#0f172a", color: "#fff" }}
                            >
                              Review
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="jf-btn jf-btn-secondary jf-btn-sm"
                              onClick={() => {
                                setSelectedReprint(req);
                                setReprintReviewComment("");
                              }}
                            >
                              Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredReprints.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                        No reprint requests found in the system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <TablePaginationFooter
              currentPage={validReprintPage}
              totalItems={filteredReprints.length}
              rowsPerPage={reprintRowsPerPage}
              onPageChange={setReprintPage}
              onRowsPerPageChange={setReprintRowsPerPage}
              pageSizeOptions={[5, 10, 20, 50]}
              itemName="requests"
            />
          </div>

          {/* ──────────────── POPUP MODAL: REPRINT REVIEW & DETAILS ──────────────── */}
          {selectedReprint && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(15, 23, 42, 0.65)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1050,
                padding: "1rem",
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedReprint(null);
                }
              }}
            >
              <div
                className="jf-card"
                style={{
                  width: "100%",
                  maxWidth: "650px",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
                  border: "1px solid #cbd5e1",
                  borderRadius: "12px",
                  padding: "1.75rem",
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                {/* Modal Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "8px",
                        background: selectedReprint.status === "REQUESTED" ? "#fef3c7" : "#e2e8f0",
                        color: selectedReprint.status === "REQUESTED" ? "#d97706" : "#475569",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <RotateCcw size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                        {selectedReprint.status === "REQUESTED" ? "Review Reprint Request" : "Reprint Request Details"}
                      </h3>
                      <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                        {selectedReprint.reprintRequestNo || `RR-${(selectedReprint._id || "").slice(-5)}`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    onClick={() => setSelectedReprint(null)}
                    style={{ padding: "4px" }}
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Details Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    fontSize: "0.875rem",
                    padding: "1rem",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <div style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Job Order No</div>
                    <strong style={{ color: "#0f172a" }}>
                      {selectedReprint.jobOrderId?.jobNo || selectedReprint.jobOrderNo || "JO"}
                    </strong>
                  </div>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Job Item</div>
                    <strong style={{ color: "#0f172a" }}>
                      {selectedReprint.jobItem || selectedReprint.productName || "Primary Item"}
                    </strong>
                  </div>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Requested By</div>
                    <div style={{ color: "#1e293b", fontWeight: 500 }}>
                      {formatUser(selectedReprint.requestedBy, "Floor Operator")}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Request Date</div>
                    <div style={{ color: "#1e293b" }}>
                      {selectedReprint.createdAt ? new Date(selectedReprint.createdAt).toLocaleString() : "Today"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Quantity Needed</div>
                    <strong style={{ fontSize: "1.125rem", color: "#dc2626" }}>
                      {selectedReprint.quantity} units
                    </strong>
                  </div>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Source Stage</div>
                    <span className={`jf-badge ${selectedReprint.sourceStage === "QC" ? "jf-badge-warning" : "jf-badge-info"}`}>
                      {selectedReprint.sourceStage || "QC"}
                    </span>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <div style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>
                      Reason for Reprint
                    </div>
                    <div
                      style={{
                        padding: "0.75rem",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        color: "#0f172a",
                        fontSize: "0.875rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {selectedReprint.reason || "Defect flagged"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Current Status</div>
                    <StatusBadge status={selectedReprint.status} />
                  </div>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Approval Info</div>
                    <div style={{ color: "#1e293b", fontSize: "0.8125rem" }}>
                      {selectedReprint.approvedBy ? `Approved by ${formatUser(selectedReprint.approvedBy)}` : "Pending manager review"}
                    </div>
                  </div>
                </div>

                {/* Manager Decision Section (if REQUESTED) */}
                {selectedReprint.status === "REQUESTED" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                    <div className="jf-form-group">
                      <label className="jf-label" style={{ fontWeight: 600 }}>
                        Manager Remarks / Comments <span style={{ color: "#64748b", fontWeight: 400 }}>(required if rejecting)</span>
                      </label>
                      <textarea
                        rows={3}
                        className="jf-input"
                        placeholder="Enter approval notes or specific rejection reasons..."
                        value={reprintReviewComment}
                        onChange={(e) => setReprintReviewComment(e.target.value)}
                        style={{ resize: "vertical" }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: "0.75rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid #e2e8f0",
                      }}
                    >
                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary"
                        onClick={() => setSelectedReprint(null)}
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="jf-btn jf-btn-danger"
                        disabled={loading}
                        onClick={async () => {
                          if (!reprintReviewComment.trim()) {
                            toast.warning("Please enter a comment or reason before rejecting.");
                            return;
                          }
                          setLoading(true);
                          try {
                            await jobFlowApi.rejectReprintRequest(selectedReprint._id || selectedReprint.id, {
                              reason: reprintReviewComment.trim(),
                              rejectionReason: reprintReviewComment.trim(),
                            });
                            toast.info("Reprint request rejected.");
                            setSelectedReprint(null);
                            triggerRefresh();
                          } catch (e) {
                            toast.error(e.response?.data?.message || "Failed to reject request.");
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        Reject Request
                      </button>
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary"
                        style={{ background: "#0f172a", color: "#ffffff", fontWeight: 600 }}
                        disabled={loading}
                        onClick={async () => {
                          setLoading(true);
                          try {
                            await jobFlowApi.approveReprintRequest(selectedReprint._id || selectedReprint.id, {
                              comments: reprintReviewComment.trim(),
                            });
                            toast.success("Reprint request approved! Routing to production queue.");
                            setSelectedReprint(null);
                            triggerRefresh();
                          } catch (e) {
                            toast.error(e.response?.data?.message || "Failed to approve request.");
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        Approve Request
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <button
                      type="button"
                      className="jf-btn jf-btn-secondary"
                      onClick={() => setSelectedReprint(null)}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB: PRODUCTION ORDER DETAILS (SECTION 4.F) ──────────────── */}
      {activeTab === "details" && (
        selectedOrder ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Top section: Production No., Job Order No., Branch, Status, Priority */}
            <div className="jf-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h2 style={{ margin: 0, fontSize: "1.375rem", color: "#0f172a" }}>
                      Production Order {selectedOrder.orderNumber || selectedOrder.productionNo || `PO-${selectedOrder._id?.slice(-6)}`}
                    </h2>
                    <StatusBadge status={selectedOrder.status} />
                    <span
                      className={`jf-badge ${
                        selectedOrder.priority === "Urgent" ? "jf-badge-danger" : "jf-badge-default"
                      }`}
                    >
                      {selectedOrder.priority || "Normal"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem", fontSize: "0.8125rem", color: "#64748b", flexWrap: "wrap" }}>
                    <span>Job Order: <strong>{selectedOrder.jobOrderNo || selectedOrder.jobOrderId?.jobNo || selectedOrder.jobNo || "JO"}</strong></span>
                    <span>Branch: <strong>{selectedOrder.branch || selectedOrder.branchName || selectedOrder.branchId?.name || "Main HQ Branch"}</strong></span>
                    <span>Customer: <strong>{selectedOrder.customerName || selectedOrder.jobOrderId?.customerName || selectedOrder.jobOrderId?.customerSnapshot?.name || "Customer"}</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  {allOperationsCompleted && selectedOrder.status !== "QC" && selectedOrder.status !== "COMPLETED" && (
                    <button
                      type="button"
                      className="jf-btn jf-btn-success jf-btn-sm"
                      style={{ background: "#16a34a", color: "#ffffff", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.375rem" }}
                      onClick={handleSendOrderToQC}
                      disabled={loading}
                      title="Send this order to Quality Control"
                    >
                      <ShieldCheck size={16} /> Send to QC
                    </button>
                  )}
                  {selectedOrder.status === "QC" && (
                    <button
                      type="button"
                      className="jf-btn jf-btn-primary jf-btn-sm"
                      style={{ background: "#7c3aed", color: "#ffffff", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.375rem" }}
                      onClick={() => navigate(`/jobflow/qc?orderId=${selectedOrder._id || selectedOrder.id}&jobId=${selectedOrder.jobOrderId?._id || selectedOrder.jobOrderId || ""}`)}
                    >
                      <ShieldCheck size={16} /> Go to QC
                    </button>
                  )}
                  {selectedOrder.status === "UNASSIGNED" && (
                    <button
                      type="button"
                      className="jf-btn jf-btn-primary jf-btn-sm"
                      style={{ background: "#0f172a", color: "#ffffff", fontWeight: 600 }}
                      onClick={() => {
                        const job = planningJobs.find((j) => String(j._id || j.id) === String(selectedOrder.jobOrderId?._id || selectedOrder.jobOrderId)) || {
                          _id: selectedOrder.jobOrderId?._id || selectedOrder.jobOrderId,
                          jobNo: selectedOrder.jobOrderNo || selectedOrder.jobOrderId?.jobNo,
                          customerName: selectedOrder.customerName,
                          branchId: selectedOrder.branchId,
                        };
                        setPlanModalJob(job);
                        setIsPlanModalOpen(true);
                      }}
                    >
                      Plan Production
                    </button>
                  )}
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    onClick={() => {
                      setEditOrderData(selectedOrder);
                      setIsEditOrderModalOpen(true);
                    }}
                  >
                    Edit Order
                  </button>
                  {selectedOrder.status === "IN_PROGRESS" && (
                    <button
                      type="button"
                      className="jf-btn jf-btn-warning jf-btn-sm"
                      onClick={() =>
                        setModalOrderAction({ open: true, type: "HOLD", order: selectedOrder })
                      }
                    >
                      <Pause size={14} /> Hold
                    </button>
                  )}
                  {selectedOrder.status === "ON_HOLD" && (
                    <button
                      type="button"
                      className="jf-btn jf-btn-primary jf-btn-sm"
                      onClick={() =>
                        setModalOrderAction({ open: true, type: "RESUME", order: selectedOrder })
                      }
                    >
                      <Play size={14} /> Resume
                    </button>
                  )}
                  {selectedOrder.status !== "CANCELLED" && selectedOrder.status !== "COMPLETED" && (
                    <button
                      type="button"
                      className="jf-btn jf-btn-danger jf-btn-sm"
                      onClick={() =>
                        setModalOrderAction({ open: true, type: "CANCEL", order: selectedOrder })
                      }
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Details Section: Planned Qty, Actual Qty, Planned Start, Actual Start, Actual End, Machine, Assigned Employees */}
            <div className="jf-card">
              <h3 className="jf-card-title" style={{ marginBottom: "1rem" }}>
                Production Order Specification & Schedule
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", fontSize: "0.875rem" }}>
                <div>
                  <span style={{ color: "#64748b" }}>Planned Quantity:</span>
                  <div style={{ fontWeight: 700, fontSize: "1.125rem", color: "#0f172a" }}>
                    {selectedOrder.plannedQty || 1000} pcs
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Actual Output Quantity:</span>
                  <div style={{ fontWeight: 700, fontSize: "1.125rem", color: "#166534" }}>
                    {selectedOrder.actualQty ? `${selectedOrder.actualQty} pcs` : (allOperationsCompleted ? `${selectedOrder.plannedQty || 0} pcs` : "-")}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Planned Start:</span>
                  <div style={{ fontWeight: 600 }}>
                    {selectedOrder.plannedStartDate ? new Date(selectedOrder.plannedStartDate).toLocaleString() : (selectedOrder.status === "UNASSIGNED" ? "Unassigned" : "Immediate")}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Actual Start Time:</span>
                  <div>
                    {selectedOrder.actualStart ? new Date(selectedOrder.actualStart).toLocaleString() : "-"}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Actual End Time:</span>
                  <div>
                    {selectedOrder.actualEnd ? new Date(selectedOrder.actualEnd).toLocaleString() : "-"}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Allocated Machine:</span>
                  <div style={{ fontWeight: 600 }}>
                    {selectedOrder.status === "UNASSIGNED" && !selectedOrder.machine
                      ? "Unassigned"
                      : (selectedOrder.machine || selectedOrder.operations?.[0]?.machine || (selectedOrder.status === "UNASSIGNED" ? "Unassigned" : "AccurioPress 01"))}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Assigned Employees:</span>
                  <div>
                    {selectedOrder.status === "UNASSIGNED" && (!selectedOrder.assignedEmployees || selectedOrder.assignedEmployees.length === 0) ? (
                      <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Unassigned</span>
                    ) : (
                      Array.isArray(selectedOrder.assignedEmployees) && selectedOrder.assignedEmployees.length > 0
                        ? selectedOrder.assignedEmployees.join(", ")
                        : (selectedOrder.assignedEmployee || (selectedOrder.status === "UNASSIGNED" ? "Unassigned" : "Priya Raman"))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Related Sections: Operations timeline / table */}
            <div className="jf-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 className="jf-card-title" style={{ margin: 0 }}>
                  Operations Timeline & Work Center Sequence
                </h3>
                {selectedOrder.operations && selectedOrder.operations.length > 0 && !allOperationsCompleted && (
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    onClick={handleQuickCompleteAll}
                    disabled={loading}
                    title="Quick complete all operations"
                  >
                    <CheckCircle2 size={14} style={{ color: "#16a34a" }} /> Quick Complete All
                  </button>
                )}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="jf-table">
                  <thead>
                    <tr>
                      <th>Seq #</th>
                      <th>Operation Name</th>
                      <th>Machine</th>
                      <th>Operator</th>
                      <th>Status</th>
                      <th>Input Qty</th>
                      <th>Output Qty</th>
                      <th>Completed Qty</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDetailsOperations.map((op, idx) => (
                      <tr key={op._id || idx}>
                        <td>#{op.sequenceNo || idx + 1}</td>
                        <td>
                          <strong>{op.operationName || op.operation}</strong>
                        </td>
                        <td>{op.machine || "Floor Station"}</td>
                        <td>{op.assignedEmployee || op.operatorId?.name || "Assigned"}</td>
                        <td>
                          <StatusBadge status={op.status} />
                        </td>
                        <td>{op.inputQty || selectedOrder.plannedQty || 1000} pcs</td>
                        <td>
                          {op.outputQty
                            ? `${op.outputQty} pcs`
                            : (op.status === "COMPLETED" ? `${op.completedQty || op.inputQty || selectedOrder.plannedQty || 0} pcs` : "-")}
                        </td>
                        <td>
                          {op.status === "COMPLETED" ? (
                            <strong style={{ color: "#166534" }}>
                              {op.completedQty || op.outputQty || op.inputQty || selectedOrder.plannedQty || 0} pcs
                            </strong>
                          ) : (
                            op.completedQty ? `${op.completedQty} pcs` : "-"
                          )}
                        </td>
                        <td>{op.actualStart ? new Date(op.actualStart).toLocaleTimeString() : "-"}</td>
                        <td>{op.actualEnd ? new Date(op.actualEnd).toLocaleTimeString() : "-"}</td>
                        <td>
                          <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
                            {op.status === "PENDING" && (
                              <button
                                type="button"
                                className="jf-btn jf-btn-primary jf-btn-sm"
                                onClick={() => handleStartOperation(op)}
                                disabled={loading}
                              >
                                <Play size={12} /> Start
                              </button>
                            )}
                            {(op.status === "RUNNING" || op.status === "IN_PROGRESS") && (
                              <button
                                type="button"
                                className="jf-btn jf-btn-success jf-btn-sm"
                                style={{ background: "#16a34a", color: "#ffffff" }}
                                onClick={() => handleCompleteOperation(op)}
                                disabled={loading}
                              >
                                <Check size={12} /> Complete
                              </button>
                            )}
                            {op.status === "COMPLETED" && (
                              <span style={{ color: "#16a34a", fontSize: "0.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <CheckCircle2 size={14} /> Done
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {detailsOps.length === 0 && (
                      <tr>
                        <td colSpan={11} style={{ textAlign: "center", padding: "1.5rem", color: "#64748b" }}>
                          Operations will appear once planned for this production order.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              {detailsOps.length > 0 && (
                <TablePaginationFooter
                  currentPage={validDetailsOpPage}
                  totalItems={detailsOps.length}
                  rowsPerPage={detailsOpRowsPerPage}
                  onPageChange={setDetailsOpPage}
                  onRowsPerPageChange={setDetailsOpRowsPerPage}
                  pageSizeOptions={[5, 10, 20]}
                  itemName="operations"
                />
              )}

              {/* Once all operations completed, show prominent Send to QC banner */}
              {allOperationsCompleted && selectedOrder.status !== "QC" && selectedOrder.status !== "COMPLETED" && (
                <div style={{ marginTop: "1.25rem", padding: "1.25rem", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#166534", fontSize: "1.0625rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <CheckCircle2 size={20} color="#16a34a" /> All Production Operations Completed!
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#15803d", marginTop: "0.25rem" }}>
                      Quantity completed: <strong>{selectedOrder.actualQty || selectedOrder.plannedQty || 0} pcs</strong>. Ready for Quality Control (QC) inspection.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="jf-btn jf-btn-success"
                    style={{ background: "#16a34a", color: "#ffffff", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, padding: "0.625rem 1.5rem", fontSize: "0.9375rem", borderRadius: "6px" }}
                    onClick={handleSendOrderToQC}
                    disabled={loading}
                  >
                    <ShieldCheck size={18} /> Send to QC
                  </button>
                </div>
              )}
              {selectedOrder.status === "QC" && (
                <div style={{ marginTop: "1.25rem", padding: "1rem 1.25rem", background: "#faf5ff", border: "1px solid #d8b4fe", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#6b21a8", fontSize: "0.875rem" }}>
                    <strong>Order is currently in Quality Control (QC).</strong> Operations finished and submitted for inspection.
                  </div>
                  <button
                    type="button"
                    className="jf-btn jf-btn-primary jf-btn-sm"
                    style={{ background: "#7c3aed", color: "#ffffff" }}
                    onClick={() => navigate(`/jobflow/qc?orderId=${selectedOrder._id || selectedOrder.id}&jobId=${selectedOrder.jobOrderId?._id || selectedOrder.jobOrderId || ""}`)}
                  >
                    <ShieldCheck size={14} /> Open in QC Page
                  </button>
                </div>
              )}
            </div>

            {/* QC History & Approved Sample Preview */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="jf-card">
                <h3 className="jf-card-title" style={{ marginBottom: "0.75rem" }}>
                  QC History for this Order
                </h3>
                {qualityChecks.filter((q) => (q.productionOrderId?._id || q.productionOrderId) === (selectedOrder._id || selectedOrder.id)).length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {qualityChecks
                      .filter((q) => (q.productionOrderId?._id || q.productionOrderId) === (selectedOrder._id || selectedOrder.id))
                      .map((q) => (
                        <div key={q._id} style={{ padding: "0.75rem", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <strong>{q.checkType || "FINAL"} Check</strong>
                            <StatusBadge status={q.result} />
                          </div>
                          <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                            Inspector: {q.inspector?.name || "QC Lead"} • Checked: {q.quantityChecked || selectedOrder.plannedQty} pcs
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div style={{ color: "#64748b", fontSize: "0.875rem", padding: "1rem", textAlign: "center" }}>
                    No quality inspection recorded yet.
                  </div>
                )}
              </div>

              <div className="jf-card">
                <h3 className="jf-card-title" style={{ marginBottom: "0.75rem" }}>
                  Approved Sample & Customer Notes
                </h3>
                <div style={{ fontSize: "0.875rem", color: "#475569", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div>
                    <strong>Customer Comments:</strong>
                    <div style={{ padding: "0.5rem", background: "#f8fafc", borderRadius: "4px", border: "1px solid #e2e8f0", marginTop: "0.25rem" }}>
                      {selectedOrder.notes || selectedOrder.customerComments || "Standard offset/digital run approved as per digital soft-proof."}
                    </div>
                  </div>
                  <div>
                    <strong>Approved Proof / Sample:</strong>
                    <div style={{ marginTop: "0.25rem" }}>
                      <span className="jf-badge jf-badge-success" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                        <CheckCircle2 size={13} /> Proof Signoff On File
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="jf-card" style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            <Layers size={48} style={{ color: "#cbd5e1", margin: "0 auto 1rem auto" }} />
            <h3 style={{ color: "#0f172a" }}>No Production Order Selected</h3>
            <p>Please select an order from the Production Orders list or Overview to view its complete lifecycle details.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "1rem" }}>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={() => handleTabChange("orders")}
              >
                View Production Orders
              </button>
            </div>
          </div>
        )
      )}

      {/* ──────────────── MODALS ──────────────── */}
      <OperationStartModal
        isOpen={modalOpStart.open}
        onClose={() => setModalOpStart({ open: false, op: null, order: null })}
        operation={modalOpStart.op}
        productionOrder={modalOpStart.order}
        onSuccess={triggerRefresh}
      />

      <OperationCompleteModal
        isOpen={modalOpComplete.open}
        onClose={() => setModalOpComplete({ open: false, op: null, order: null })}
        operation={modalOpComplete.op}
        productionOrder={modalOpComplete.order}
        onSuccess={triggerRefresh}
      />

      <OperationFailModal
        isOpen={modalOpFail.open}
        onClose={() => setModalOpFail({ open: false, op: null, order: null })}
        operation={modalOpFail.op}
        productionOrder={modalOpFail.order}
        onSuccess={triggerRefresh}
      />

      <OperationSkipModal
        isOpen={modalOpSkip.open}
        onClose={() => setModalOpSkip({ open: false, op: null, order: null })}
        operation={modalOpSkip.op}
        productionOrder={modalOpSkip.order}
        onSuccess={triggerRefresh}
      />

      <ProductionOrderActionsModal
        isOpen={modalOrderAction.open}
        onClose={() => setModalOrderAction({ open: false, type: "HOLD", order: null })}
        actionType={modalOrderAction.type}
        productionOrder={modalOrderAction.order}
        onSuccess={triggerRefresh}
      />

      <ReprintDecisionModal
        isOpen={modalReprintDecision.open}
        onClose={() => setModalReprintDecision({ open: false, type: "APPROVE", req: null })}
        actionType={modalReprintDecision.type}
        reprintRequest={modalReprintDecision.req}
        onSuccess={triggerRefresh}
      />

      <EnhancedQCModal
        isOpen={modalQCInspect.open}
        onClose={() => setModalQCInspect({ open: false, order: null })}
        productionOrder={modalQCInspect.order}
        onSuccess={triggerRefresh}
      />

      {/* ──────────────── MODAL: PLAN PRODUCTION (SCREENSHOT 2) ──────────────── */}
      {isPlanModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: "1rem",
          }}
        >
          <div
            className="jf-card"
            style={{
              width: "100%",
              maxWidth: "760px",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "1.75rem",
              background: "#ffffff",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                  Plan Production
                </h3>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  Suggested form layout: two columns on desktop, one column on mobile.
                </span>
              </div>
              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                onClick={() => setIsPlanModalOpen(false)}
                style={{ padding: "4px 8px" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Section A — Job Information (top) */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0f172a", marginBottom: "0.75rem" }}>
                Section A — Job Information (top)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label">Job Order No.</label>
                  <select
                    className="jf-input"
                    value={planModalJob?._id || ""}
                    onChange={(e) => {
                      const match = planningJobs.find((j) => j._id === e.target.value);
                      if (match) setPlanModalJob(match);
                    }}
                  >
                    {planningJobs.map((j) => (
                      <option key={j._id} value={j._id}>
                        {j.jobNo} — {j.productName} ({j.qty} pcs)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Customer</label>
                  <input
                    type="text"
                    className="jf-input"
                    readOnly
                    value={planModalJob?.customerName || "Customer (Read-only)"}
                    style={{ background: "#f8fafc", color: "#475569" }}
                  />
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Branch</label>
                  <input
                    type="text"
                    className="jf-input"
                    readOnly
                    value={planModalJob?.raw?.branchId?.name || "Main HQ Branch (Read-only / selected)"}
                    style={{ background: "#f8fafc", color: "#475569" }}
                  />
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Approved Sample</label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", height: "42px" }}>
                    <span className="jf-badge jf-badge-success" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                      <CheckCircle2 size={13} /> Sample Approved
                    </span>
                    <button
                      type="button"
                      className="jf-btn jf-btn-secondary jf-btn-sm"
                      onClick={() => toast.info("Opening approved proof sample asset...")}
                      style={{ fontSize: "0.75rem" }}
                    >
                      <ExternalLink size={12} /> Preview / Open
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section B — Production Assignment */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0f172a", marginBottom: "0.75rem" }}>
                Section B — Production Assignment
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label">Planned Start (Date / Time)</label>
                  <input
                    type="datetime-local"
                    className="jf-input"
                    value={planModalStart}
                    onChange={(e) => setPlanModalStart(e.target.value)}
                  />
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Main Machine (Select printer)</label>
                  <select
                    className="jf-input"
                    value={planModalMachine}
                    onChange={(e) => setPlanModalMachine(e.target.value)}
                  >
                    <option value="Konica Minolta AccurioPress">Konica Minolta AccurioPress C4080</option>
                    <option value="Heidelberg Speedmaster XL 75">Heidelberg Speedmaster XL 75 (Offset)</option>
                    <option value="HP Indigo 7K Digital Press">HP Indigo 7K Digital Press</option>
                    <option value="Roland VersaUV LEF2-300">Roland VersaUV LEF2-300</option>
                  </select>
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Assigned Employees (Select employees)</label>
                  <select
                    className="jf-input"
                    value={planModalEmployees[0] || "Priya Raman"}
                    onChange={(e) => setPlanModalEmployees([e.target.value])}
                  >
                    <option value="Priya Raman">Priya Raman (Lead Production Operator)</option>
                    <option value="Operator Logavasu">Operator Logavasu</option>
                    <option value="Operator Guna">Operator Guna</option>
                  </select>
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Priority</label>
                  <select
                    className="jf-input"
                    value={planModalPriority}
                    onChange={(e) => setPlanModalPriority(e.target.value)}
                  >
                    <option value="Normal">Normal Turnaround</option>
                    <option value="Urgent">Urgent Priority</option>
                    <option value="Rush">Rush Express</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Auto-created operations preview */}
            <div style={{ marginBottom: "1.75rem", padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#0f172a", marginBottom: "0.5rem" }}>
                Auto-created operations preview
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 700, color: "#0f172a", fontSize: "0.9375rem" }}>
                <span>1. PRINT</span>
                <span style={{ color: "#94a3b8" }}>➔</span>
                <span>2. FINISHING</span>
                <span style={{ color: "#94a3b8" }}>➔</span>
                <span>3. PACKING</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.5rem" }}>
                Actual finishing operations depend on the job item configuration.
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setIsPlanModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={handlePlanModalSubmit}
                disabled={loading}
                style={{ background: "#0f172a", color: "#ffffff", padding: "0.5rem 1.25rem", borderRadius: "6px" }}
              >
                Plan Production
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: EDIT PRODUCTION ORDER ──────────────── */}
      {isEditOrderModalOpen && editOrderData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: "1rem",
          }}
        >
          <div
            className="jf-card"
            style={{
              width: "100%",
              maxWidth: "600px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "1.75rem",
              background: "#ffffff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                Edit Production Order — {editOrderData.orderNumber || editOrderData.productionNo || `PO-${editOrderData._id?.slice(-6)}`}
              </h3>
              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                onClick={() => setIsEditOrderModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="jf-form-group">
                <label className="jf-label">Planned Start</label>
                <input
                  type="datetime-local"
                  className="jf-input"
                  value={editOrderData.plannedStartDate ? new Date(editOrderData.plannedStartDate).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEditOrderData({ ...editOrderData, plannedStartDate: e.target.value })}
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Machine</label>
                <input
                  type="text"
                  className="jf-input"
                  value={editOrderData.machine || "Konica Minolta AccurioPress"}
                  onChange={(e) => setEditOrderData({ ...editOrderData, machine: e.target.value })}
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Assigned Employees</label>
                <input
                  type="text"
                  className="jf-input"
                  value={Array.isArray(editOrderData.assignedEmployees) ? editOrderData.assignedEmployees.join(", ") : (editOrderData.assignedEmployee || "Priya Raman")}
                  onChange={(e) => setEditOrderData({ ...editOrderData, assignedEmployees: e.target.value.split(",").map((s) => s.trim()) })}
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Priority</label>
                <select
                  className="jf-input"
                  value={editOrderData.priority || "Normal"}
                  onChange={(e) => setEditOrderData({ ...editOrderData, priority: e.target.value })}
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Rush">Rush</option>
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Production Notes</label>
                <textarea
                  className="jf-input"
                  rows={3}
                  value={editOrderData.notes || ""}
                  onChange={(e) => setEditOrderData({ ...editOrderData, notes: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setIsEditOrderModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={handleEditOrderSubmit}
                disabled={loading}
                style={{ background: "#0f172a", color: "#ffffff" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: NEW REPRINT REQUEST (SCREENSHOT 5) ──────────────── */}
      {isNewReprintModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: "1rem",
          }}
        >
          <div
            className="jf-card"
            style={{
              width: "100%",
              maxWidth: "600px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "1.75rem",
              background: "#ffffff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                New Reprint Request
              </h3>
              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                onClick={() => setIsNewReprintModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="jf-form-group">
                <label className="jf-label">Job Order</label>
                <select
                  className="jf-input"
                  value={newReprintJobId}
                  onChange={(e) => {
                    setNewReprintJobId(e.target.value);
                    const match = planningJobs.find((j) => j._id === e.target.value);
                    if (match) setNewReprintJobItem(match.productName);
                  }}
                >
                  <option value="">Select Job Order...</option>
                  {planningJobs.map((j) => (
                    <option key={j._id} value={j._id}>
                      {j.jobNo} — {j.customerName} ({j.productName})
                    </option>
                  ))}
                  {productionOrders.map((o) => (
                    <option key={o._id} value={o.jobOrderId?._id || o.jobOrderId || o._id}>
                      {o.jobOrderNo || o.orderNumber} — {o.customerName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Job Item</label>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="e.g. 500 Business Cards (Matte Lamination)"
                  value={newReprintJobItem}
                  onChange={(e) => setNewReprintJobItem(e.target.value)}
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Reason (multi-line text)</label>
                <textarea
                  className="jf-input"
                  rows={3}
                  placeholder="Detail the failure reasons, e.g. severe color shift or creasing misalignment..."
                  value={newReprintReason}
                  onChange={(e) => setNewReprintReason(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label">Quantity</label>
                  <input
                    type="number"
                    className="jf-input"
                    value={newReprintQuantity}
                    onChange={(e) => setNewReprintQuantity(e.target.value)}
                  />
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Source Stage</label>
                  <select
                    className="jf-input"
                    value={newReprintSourceStage}
                    onChange={(e) => setNewReprintSourceStage(e.target.value)}
                  >
                    <option value="QC">Quality Control (QC)</option>
                    <option value="PACKING">Packing</option>
                  </select>
                </div>
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Requested By</label>
                <input
                  type="text"
                  className="jf-input"
                  readOnly
                  value="Production Supervisor (Current logged-in employee)"
                  style={{ background: "#f8fafc", color: "#64748b" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setIsNewReprintModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={handleCreateReprintSubmit}
                disabled={loading}
                style={{ background: "#0f172a", color: "#ffffff" }}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </JobFlowLayout>
  );
};

export default ProductionPage;
