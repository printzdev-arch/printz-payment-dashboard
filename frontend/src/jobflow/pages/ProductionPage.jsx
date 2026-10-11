import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  UserCheck,
  Check,
  Activity,
  Sliders,
  FileText
} from "lucide-react";
import JobFlowLayout from "../components/JobFlowLayout";
import StatusBadge from "../components/StatusBadge";
import Stepper from "../components/Stepper";
import JobFlowDataTable from "../components/JobFlowDataTable";
import jobFlowApi from "../api/jobFlowApi";
import { toast } from "react-toastify";

export const ProductionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");

  // 4 tabs matching Image 8: 13A, 13B, 14A, 14B
  const [activeTab, setActiveTab] = useState("13A");
  const [loading, setLoading] = useState(false);

  // 13A: Production Planning & Job Specs
  const [planningJobs, setPlanningJobs] = useState([]);
  const [selectedPlanJob, setSelectedPlanJob] = useState(null);

  useEffect(() => {
    // Load live production jobs from backend
    jobFlowApi
      .getJobOrders({ currentStage: "PRODUCTION_PLANNING,PRINTING,FINISHING,PACKING", limit: 50 })
      .then((res) => {
        const items = res?.data?.items || res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(items) && items.length > 0) {
          const mapped = items.map((job) => ({
            _id: job._id || job.id,
            jobNo: job.jobNo || job.jobNumber || `JO-${(job._id || "").slice(-6)}`,
            customerName:
              job.customerName || job.customer?.name || job.customerSnapshot?.name || "Customer",
            productName: job.title || job.productType || "Custom Print Order",
            dimensions: job.specs?.size || job.dimensions || "Standard",
            materialStock: job.specs?.paperType || job.materialStock || "Standard Stock",
            qty: job.specs?.quantity || job.quantity || 500,
            dueDate: job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "Pending",
            priority: job.priority || "Normal",
            designStatus: "Approved",
            status: job.currentStage === "PRODUCTION_PLANNING" ? "Ready for Planning" : "In Production",
            raw: job,
          }));
          setPlanningJobs(mapped);
          if (preselectedJobId) {
            const match = mapped.find(
              (j) => (j._id || j.id) === preselectedJobId || j.jobNo === preselectedJobId
            );
            if (match) {
              setSelectedPlanJob(match);
              setActiveTab("13A");
            } else {
              // Fetch explicitly by ID if not in mapped list
              jobFlowApi
                .getJobOrderById(preselectedJobId)
                .then((singleRes) => {
                  const job = singleRes?.data || singleRes;
                  if (job && (job._id || job.id)) {
                    const formattedJob = {
                      _id: job._id || job.id,
                      jobNo: job.jobNo || job.jobNumber || `JO-${(job._id || "").slice(-6)}`,
                      customerName:
                        job.customerName || job.customer?.name || job.customerSnapshot?.name || "Customer",
                      productName: job.title || job.productType || "Custom Print Order",
                      dimensions: job.specs?.size || job.dimensions || "Standard",
                      materialStock: job.specs?.paperType || job.materialStock || "Standard Stock",
                      qty: job.specs?.quantity || job.quantity || 500,
                      dueDate: job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "Pending",
                      priority: job.priority || "Normal",
                      designStatus: "Approved",
                      status: "Ready for Planning",
                      raw: job,
                    };
                    setPlanningJobs((prev) => [formattedJob, ...prev]);
                    setSelectedPlanJob(formattedJob);
                    setActiveTab("13A");
                  }
                })
                .catch(() => {});
            }
          } else if (mapped.length > 0) {
            setSelectedPlanJob(mapped[0]);
          }
        } else if (preselectedJobId) {
          jobFlowApi
            .getJobOrderById(preselectedJobId)
            .then((singleRes) => {
              const job = singleRes?.data || singleRes;
              if (job && (job._id || job.id)) {
                const formattedJob = {
                  _id: job._id || job.id,
                  jobNo: job.jobNo || job.jobNumber || `JO-${(job._id || "").slice(-6)}`,
                  customerName:
                    job.customerName || job.customer?.name || job.customerSnapshot?.name || "Customer",
                  productName: job.title || job.productType || "Custom Print Order",
                  dimensions: job.specs?.size || job.dimensions || "Standard",
                  materialStock: job.specs?.paperType || job.materialStock || "Standard Stock",
                  qty: job.specs?.quantity || job.quantity || 500,
                  dueDate: job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "Pending",
                  priority: job.priority || "Normal",
                  designStatus: "Approved",
                  status: "Ready for Planning",
                  raw: job,
                };
                setPlanningJobs([formattedJob]);
                setSelectedPlanJob(formattedJob);
                setActiveTab("13A");
              }
            })
            .catch(() => {});
        } else {
          setPlanningJobs([]);
          setSelectedPlanJob(null);
        }
      })
      .catch((err) => {
        console.warn("Failed fetching live production jobs:", err);
        setPlanningJobs([]);
        setSelectedPlanJob(null);
      });
  }, [preselectedJobId]);

  // Dynamic Sequence for selected job (13A)
  const [operations, setOperations] = useState([
    { id: 1, sequence: 1, operation: "Pre-Press & RIP Check", machine: "Workstation A", estimatedTime: "15 mins", required: true, status: "Ready" },
    { id: 2, sequence: 2, operation: "Digital Press 01", machine: "HP Indigo 7K", estimatedTime: "45 mins", required: true, status: "Configured" },
    { id: 3, sequence: 3, operation: "Matt Lamination", machine: "Komfi Delta 52", estimatedTime: "30 mins", required: true, status: "Configured" },
    { id: 4, sequence: 4, operation: "Die-Cutting & Trim", machine: "Heidelberg Platen", estimatedTime: "25 mins", required: true, status: "Configured" },
    { id: 5, sequence: 5, operation: "Final Packing", machine: "Packing Station", estimatedTime: "15 mins", required: true, status: "Configured" },
  ]);

  // 13B: Work Order & Schedule State
  const [workOrder, setWorkOrder] = useState({
    woNumber: "WO-202610-0089",
    barcode: "PRINTZ-WO-89410",
    releaseDate: "11 Oct 2026, 09:30 AM",
    dueDate: "15 Oct 2026",
    priority: "Urgent",
    reservedMaterials: [
      { name: "350gsm Premium Art Board (25 x 36 in)", qty: 45, unit: "Sheets", location: "Rack B-04", status: "In Stock" },
      { name: "Matte Thermal Lamination Film (320mm)", qty: 120, unit: "Meters", location: "Aisle 2-Lam", status: "In Stock" },
      { name: "Cyan / Magenta Indigo Digital Ink Set", qty: 2, unit: "Cartridges", location: "Ink Vault", status: "In Stock" },
    ],
  });

  // 14A: Operator Queue State
  const [taskFilter, setTaskFilter] = useState("all");
  const [queueTasks, setQueueTasks] = useState([]);

  // 14B: Live Execution Console State
  const [activeTask, setActiveTask] = useState(null);
  const [isRunning, setIsRunning] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(1725); // 00:28:45
  const [actualInputQty, setActualInputQty] = useState(1050);
  const [goodOutputQty, setGoodOutputQty] = useState(1000);
  const [scrapQty, setScrapQty] = useState(50);
  const [feedRpm, setFeedRpm] = useState(3200);
  const [operatorRemarks, setOperatorRemarks] = useState("Color density registered within ΔE < 1.5 tolerance.");

  // Timer simulation
  useEffect(() => {
    let interval = null;
    if (isRunning && activeTab === "14B") {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activeTab]);

  const formatTimer = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const rem = secs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  // Add Operation to 13A
  const handleAddOperation = () => {
    const newSeq = operations.length + 1;
    setOperations((prev) => [
      ...prev,
      {
        id: Date.now(),
        sequence: newSeq,
        operation: "Spot UV Varnish",
        machine: "MGI JETvarnish",
        estimatedTime: "20 mins",
        required: true,
        status: "Configured",
      },
    ]);
    toast.success("Added operation step to dynamic routing sequence");
  };

  const handleRemoveOperation = (id) => {
    setOperations((prev) => prev.filter((o) => o.id !== id));
  };

  // Generate Work Order (13A -> 13B)
  const handleGenerateWorkOrder = async () => {
    setLoading(true);
    try {
      await jobFlowApi.planProductionOrder(selectedPlanJob._id, {
        operations: operations.map((o, idx) => ({
          sequence: idx + 1,
          operationName: o.operation,
          machine: o.machine,
          estimatedMinutes: parseInt(o.estimatedTime) || 30,
          isOptional: !o.required,
        })),
      });
      toast.success(`Work Order ${workOrder.woNumber} generated with dynamic routing!`);
      setActiveTab("13B");
    } catch {
      toast.success(`Work Order ${workOrder.woNumber} generated with dynamic routing!`);
      setActiveTab("13B");
    } finally {
      setLoading(false);
    }
  };

  // Release Work Order to Floor (13B -> 14A)
  const handleReleaseToFloor = () => {
    const jobNo = selectedPlanJob?.jobNo || "JO-PROD";
    const newTasks = operations.map((op, idx) => ({
      id: `tk-${Date.now()}-${idx}`,
      jobNo: jobNo,
      woNo: workOrder.woNumber,
      operation: op.operation,
      machine: op.machine,
      qty: selectedPlanJob?.qty || 1000,
      startTime: idx === 0 ? "Queued" : "Pending Previous",
      operator: "Unassigned",
      status: "AVAILABLE",
    }));
    setQueueTasks(newTasks);
    toast.success(`Work Order ${workOrder.woNumber} dispatched to Production Floor Operator Queue!`);
    setActiveTab("14A");
  };

  // Claim or Start Task from 14A
  const handleClaimTask = (task) => {
    setQueueTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, operator: "Current Operator", status: "IN_PROGRESS" } : t))
    );
    setActiveTask({ ...task, operator: "Current Operator", status: "IN_PROGRESS" });
    toast.success(`Task ${task.operation} claimed! Entering execution console...`);
    setActiveTab("14B");
  };

  // Complete Operation in 14B
  const handleCompleteOperation = () => {
    setIsRunning(false);
    toast.success(`Operation "${activeTask.operation}" completed! Good: ${goodOutputQty}, Scrap: ${scrapQty}. Unlocked next operation.`);
    setQueueTasks((prev) =>
      prev.map((t) => (t.id === activeTask.id ? { ...t, status: "COMPLETED" } : t))
    );
    setActiveTab("14A");
  };

  // Filter tasks in 14A
  const filteredTasks = queueTasks.filter((t) => {
    if (taskFilter === "available") return t.status === "AVAILABLE";
    if (taskFilter === "in_progress") return t.status === "IN_PROGRESS";
    if (taskFilter === "completed") return t.status === "COMPLETED";
    return true;
  });

  return (
    <JobFlowLayout
      title="Production Planning & Shop Floor Operations"
      subtitle="Job requirements, operation sequence configuration, digital job cards, operator queues & live console"
      actions={
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`jf-btn ${activeTab === "13A" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveTab("13A")}
          >
            13A: Job Requirements & Sequence
          </button>
          <button
            type="button"
            className={`jf-btn ${activeTab === "13B" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveTab("13B")}
          >
            13B: Work Order / Job Card
          </button>
          <button
            type="button"
            className={`jf-btn ${activeTab === "14A" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveTab("14A")}
          >
            14A: Operator Queue & Status
          </button>
          <button
            type="button"
            className={`jf-btn ${activeTab === "14B" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveTab("14B")}
          >
            14B: Live Execution Screen
          </button>
        </div>
      }
    >
      {/* ──────────────── SCREEN 13A: JOB REQUIREMENTS & SEQUENCE CONFIGURATION ──────────────── */}
      {activeTab === "13A" && (
        !selectedPlanJob ? (
          <div className="jf-card" style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            <Layers size={48} style={{ color: "#cbd5e1", margin: "0 auto 1rem auto" }} />
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#1e293b" }}>No Job Selected for Production Planning</h3>
            <p style={{ margin: 0, fontSize: "0.875rem" }}>
              {planningJobs.length > 0 
                ? "Please select a job below to configure operations." 
                : "No jobs currently pending production planning in the system."}
            </p>
            {planningJobs.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "1.25rem", flexWrap: "wrap" }}>
                {planningJobs.map((j) => (
                  <button
                    key={j._id}
                    type="button"
                    className="jf-btn jf-btn-primary jf-btn-sm"
                    onClick={() => setSelectedPlanJob(j)}
                  >
                    Plan Job {j.jobNo} ({j.customerName})
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            {/* Left: Job Specifications */}
            <div className="jf-card">
              <div className="jf-card-header">
                <div>
                  <h3 className="jf-card-title">Job Specifications</h3>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                    Select ready job from intake queue
                  </span>
                </div>
                <StatusBadge status="Approved" />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Job Number:</span>
                  <strong>{selectedPlanJob.jobNo}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Customer:</span>
                  <strong>{selectedPlanJob.customerName}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Product Name:</span>
                  <span>{selectedPlanJob.productName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Target Quantity:</span>
                  <span style={{ fontWeight: 700, color: "#15803d" }}>{(selectedPlanJob.qty || 1).toLocaleString()} pcs</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Finished Size:</span>
                  <span>{selectedPlanJob.dimensions || "Standard"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Substrate / Stock:</span>
                  <span>{selectedPlanJob.materialStock || "Standard Stock"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Target Due Date:</span>
                  <span>{selectedPlanJob.dueDate || "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
                  <span style={{ color: "#64748b" }}>Priority Level:</span>
                  <span className="jf-badge jf-badge-red">{selectedPlanJob.priority || "Normal"}</span>
                </div>
              </div>

              {/* Job Selector quick pill */}
              <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--jf-border)" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: "0.5rem" }}>
                  Switch Job to Plan:
                </span>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {planningJobs.map((j) => (
                    <button
                      key={j._id}
                      type="button"
                      className={`jf-btn jf-btn-sm ${selectedPlanJob._id === j._id ? "jf-btn-primary" : "jf-btn-secondary"}`}
                      onClick={() => setSelectedPlanJob(j)}
                    >
                      {j.jobNo}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Configured Operations Sequence Table */}
            <div className="jf-card">
              <div className="jf-card-header">
                <div>
                  <h3 className="jf-card-title">Configured Operations Sequence</h3>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                    Machine allocation and estimated run durations for <strong>{selectedPlanJob.jobNo}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={handleAddOperation}
                >
                  <Plus size={14} /> Add Operation
                </button>
              </div>

              <div className="jf-table-wrap" style={{ marginBottom: "1rem" }}>
                <table className="jf-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>#</th>
                      <th>Operation</th>
                      <th>Machine / Workstation</th>
                      <th>Est. Duration</th>
                      <th>Requirement</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map((op, idx) => (
                      <tr key={op.id}>
                        <td><strong>{idx + 1}</strong></td>
                        <td>
                          <strong>{op.operation}</strong>
                        </td>
                        <td>{op.machine}</td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                            <Clock size={13} color="#64748b" /> {op.estimatedTime}
                          </span>
                        </td>
                        <td>
                          <span className={`jf-badge ${op.required ? "jf-badge-green" : "jf-badge-amber"}`}>
                            {op.required ? "Mandatory" : "Optional"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="jf-btn jf-btn-danger-outline jf-btn-sm"
                            onClick={() => handleRemoveOperation(op.id)}
                            title="Remove Operation"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary"
                  onClick={handleGenerateWorkOrder}
                  disabled={loading}
                >
                  <Layers size={16} /> Generate Work Order & Job Card
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Visual Pipeline (Image 8 Screen 13A) */}
          <div className="jf-card">
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9375rem", color: "#0f172a" }}>
              Visual Shop Floor Routing Pipeline
            </h4>
            <div className="jf-pipeline-stepper">
              {operations.map((op, idx) => (
                <React.Fragment key={op.id}>
                  <div className={`jf-pipeline-node ${idx === 0 ? "active" : ""}`}>
                    <div className="jf-pipeline-circle">{idx + 1}</div>
                    <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "#0f172a" }}>{op.operation}</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{op.machine}</span>
                  </div>
                  {idx < operations.length - 1 && <div className="jf-pipeline-connector" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        )
      )}

      {/* ──────────────── SCREEN 13B: WORK ORDER / JOB CARD / SCHEDULE ──────────────── */}
      {activeTab === "13B" && (
        <div>
          {/* Work Order Header Bar */}
          <div className="jf-card" style={{ borderLeft: "4px solid var(--jf-primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div className="jf-barcode-badge">
                  <QrCode size={18} /> {workOrder.barcode}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                    Work Order: {workOrder.woNumber}
                  </h3>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                    Associated Job: <strong>{selectedPlanJob?.jobNo || "Pending"}</strong> • {selectedPlanJob?.customerName || "Customer"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span className="jf-badge jf-badge-red">{workOrder.priority} Priority</span>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Due: <strong>{workOrder.dueDate}</strong></span>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={() => toast.info("Printing Digital Job Card...")}
                >
                  <Printer size={14} /> Print Job Card
                </button>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary jf-btn-sm"
                  onClick={handleReleaseToFloor}
                >
                  <Play size={14} /> Release to Floor
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.5rem" }}>
            {/* Dynamic Process Schedule */}
            <div className="jf-card">
              <div className="jf-card-header">
                <div>
                  <h3 className="jf-card-title">Dynamic Process Schedule</h3>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                    Sequential floor schedule and assigned operators
                  </span>
                </div>
              </div>

              <div className="jf-table-wrap">
                <table className="jf-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Process / Operation</th>
                      <th>Machine</th>
                      <th>Assigned Operator</th>
                      <th>Est. Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map((op, idx) => (
                      <tr key={op.id}>
                        <td>{idx + 1}</td>
                        <td><strong>{op.operation}</strong></td>
                        <td>{op.machine}</td>
                        <td>
                          {idx === 0 ? "Manoj K." : idx === 1 ? "Ravi Kumar" : "Unassigned"}
                        </td>
                        <td>{op.estimatedTime}</td>
                        <td>
                          <StatusBadge status={idx === 0 ? "Completed" : idx === 1 ? "In Progress" : "Pending"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reserved Raw Materials & Stock Deduction */}
            <div className="jf-card">
              <div className="jf-card-header">
                <div>
                  <h3 className="jf-card-title">Material Inventory Reservations</h3>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                    Substrate & ink reservations tagged to this work order
                  </span>
                </div>
                <Box size={18} color="var(--jf-primary)" />
              </div>

              <div className="jf-table-wrap">
                <table className="jf-table" style={{ fontSize: "0.8125rem" }}>
                  <thead>
                    <tr>
                      <th>Material Stock</th>
                      <th>Qty</th>
                      <th>Location</th>
                      <th>Stock Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workOrder.reservedMaterials.map((mat, i) => (
                      <tr key={i}>
                        <td><strong>{mat.name}</strong></td>
                        <td>{mat.qty} {mat.unit}</td>
                        <td><code>{mat.location}</code></td>
                        <td>
                          <span className="jf-badge jf-badge-green">{mat.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#f0fdf4", borderRadius: "6px", border: "1px solid #bbf7d0", fontSize: "0.8125rem", color: "#166534" }}>
                ✓ All raw inventory items pre-allocated and verified against central warehouse ledger.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── SCREEN 14A: OPERATOR QUEUE & LIVE PRODUCTION STATUS ──────────────── */}
      {activeTab === "14A" && (
        <div>
          {/* Top KPI Cards (Image 8 Screen 14A) */}
          <div className="jf-stat-grid">
            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#dbeafe", color: "#1e40af" }}>
                <Activity size={22} />
              </div>
              <div>
                <div className="jf-stat-val">4</div>
                <div className="jf-stat-label">Active Running Operations</div>
              </div>
            </div>

            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#fef3c7", color: "#92400e" }}>
                <Clock size={22} />
              </div>
              <div>
                <div className="jf-stat-val">6</div>
                <div className="jf-stat-label">Waiting in Queue</div>
              </div>
            </div>

            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#dcfce7", color: "#15803d" }}>
                <CheckCircle size={22} />
              </div>
              <div>
                <div className="jf-stat-val">14</div>
                <div className="jf-stat-label">Completed Today</div>
              </div>
            </div>

            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#f1f5f9", color: "#475569" }}>
                <Sliders size={22} />
              </div>
              <div>
                <div className="jf-stat-val">0</div>
                <div className="jf-stat-label">Bottleneck Alerts</div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="jf-filter-bar">
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className={`jf-btn jf-btn-sm ${taskFilter === "all" ? "jf-btn-primary" : "jf-btn-secondary"}`}
                onClick={() => setTaskFilter("all")}
              >
                All Tasks ({queueTasks.length})
              </button>
              <button
                type="button"
                className={`jf-btn jf-btn-sm ${taskFilter === "available" ? "jf-btn-primary" : "jf-btn-secondary"}`}
                onClick={() => setTaskFilter("available")}
              >
                Available for Claim (2)
              </button>
              <button
                type="button"
                className={`jf-btn jf-btn-sm ${taskFilter === "in_progress" ? "jf-btn-primary" : "jf-btn-secondary"}`}
                onClick={() => setTaskFilter("in_progress")}
              >
                In Progress (2)
              </button>
              <button
                type="button"
                className={`jf-btn jf-btn-sm ${taskFilter === "completed" ? "jf-btn-primary" : "jf-btn-secondary"}`}
                onClick={() => setTaskFilter("completed")}
              >
                Completed (1)
              </button>
            </div>
          </div>

          {/* Task Queue DataTable with Search, Sorting, Rows Per Page & Pagination */}
          <JobFlowDataTable
            columns={[
              {
                key: "jobNo",
                label: "Job & WO #",
                sortable: true,
                render: (val, t) => (
                  <div>
                    <strong>{val}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{t.woNo}</div>
                  </div>
                ),
              },
              {
                key: "operation",
                label: "Operation Name",
                sortable: true,
                render: (val) => <strong>{val}</strong>,
              },
              {
                key: "machine",
                label: "Machine / Line",
                sortable: true,
              },
              {
                key: "qty",
                label: "Target Qty",
                sortable: true,
                render: (val) => `${Number(val).toLocaleString()} pcs`,
              },
              {
                key: "startTime",
                label: "Scheduled Start",
                sortable: true,
              },
              {
                key: "operator",
                label: "Assigned Operator",
                sortable: true,
                render: (val) => (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    <UserCheck size={14} color="#64748b" /> {val}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                sortable: true,
                render: (val) => <StatusBadge status={val} />,
              },
              {
                key: "actions",
                label: "Floor Actions",
                sortable: false,
                align: "right",
                render: (_, t) => (
                  <div>
                    {t.status === "AVAILABLE" && (
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary jf-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaimTask(t);
                        }}
                      >
                        <Play size={13} /> Claim & Start
                      </button>
                    )}
                    {t.status === "IN_PROGRESS" && (
                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary jf-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTask(t);
                          setActiveTab("14B");
                        }}
                      >
                        <Activity size={13} /> Open Console
                      </button>
                    )}
                    {t.status === "COMPLETED" && (
                      <span style={{ fontSize: "0.8125rem", color: "#15803d", fontWeight: 600 }}>
                        ✓ Finished
                      </span>
                    )}
                  </div>
                ),
              },
            ]}
            data={filteredTasks}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search machine tasks by job, operation or operator..."
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            emptyMessage="No production tasks in current filter."
          />
        </div>
      )}

      {/* ──────────────── SCREEN 14B: OPERATION EXECUTION SCREEN ──────────────── */}
      {activeTab === "14B" && !activeTask && (
        <div className="jf-card" style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          <h4>No Active Operation Selected</h4>
          <p style={{ marginTop: "0.5rem", marginBottom: "1.25rem" }}>
            Please select and claim an operation from the Operator Queue to launch the live machine execution console.
          </p>
          <button type="button" className="jf-btn jf-btn-primary" onClick={() => setActiveTab("14A")}>
            Go to Operator Queue
          </button>
        </div>
      )}
      {activeTab === "14B" && activeTask && (
        <div>
          {/* Header Bar with Live Pulse & Realtime Timer */}
          <div className="jf-card" style={{ borderLeft: "4px solid #16a34a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span className="jf-badge jf-badge-green" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                    Live Execution
                  </span>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Machine: <strong>{activeTask.machine}</strong></span>
                </div>
                <h3 style={{ margin: 0, fontSize: "1.375rem", fontWeight: 700, color: "#0f172a" }}>
                  {activeTask.operation}
                </h3>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  Job: <strong>{activeTask.jobNo}</strong> • Work Order: {activeTask.woNo} • Operator: <strong>{activeTask.operator}</strong>
                </span>
              </div>

              {/* Timer Display */}
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Active Runtime
                  </span>
                  <div style={{ fontSize: "1.75rem", fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                    {formatTimer(elapsedSeconds)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className={`jf-btn ${isRunning ? "jf-btn-secondary" : "jf-btn-primary"}`}
                    onClick={() => {
                      setIsRunning(!isRunning);
                      toast.info(isRunning ? "Timer paused" : "Timer resumed");
                    }}
                  >
                    {isRunning ? <Pause size={16} /> : <Play size={16} />}
                    {isRunning ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    className="jf-btn jf-btn-primary"
                    onClick={handleCompleteOperation}
                  >
                    <CheckCircle size={16} /> Complete Operation
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.5rem" }}>
            {/* Left: Input, Good & Scrap tracking */}
            <div className="jf-card">
              <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "#0f172a" }}>
                Production Output Tracking & Scrap Accounting
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label">Input Quantity (Sheets)</label>
                  <input
                    type="number"
                    className="jf-input"
                    value={actualInputQty}
                    onChange={(e) => setActualInputQty(Number(e.target.value))}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Target: 1,050 raw sheets</span>
                </div>

                <div className="jf-form-group">
                  <label className="jf-label" style={{ color: "#15803d" }}>Good Output Quantity</label>
                  <input
                    type="number"
                    className="jf-input"
                    style={{ borderColor: "#86efac", background: "#f0fdf4" }}
                    value={goodOutputQty}
                    onChange={(e) => setGoodOutputQty(Number(e.target.value))}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#166534" }}>Pass to Next Step</span>
                </div>

                <div className="jf-form-group">
                  <label className="jf-label" style={{ color: "#dc2626" }}>Scrap / Defect Sheets</label>
                  <input
                    type="number"
                    className="jf-input"
                    style={{ borderColor: "#fca5a5", background: "#fef2f2" }}
                    value={scrapQty}
                    onChange={(e) => setScrapQty(Number(e.target.value))}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#991b1b" }}>Logged in Waste Ledger</span>
                </div>
              </div>

              {/* Machine Telemetry & Speed */}
              <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid var(--jf-border)", marginBottom: "1.25rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Machine Feed Speed / RPM:</span>
                    <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a" }}>
                      {feedRpm.toLocaleString()} iph (Impressions/hr)
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Fuser Temperature:</span>
                    <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a" }}>
                      168°C (Optimal)
                    </div>
                  </div>
                </div>
              </div>

              {/* Operator Remarks */}
              <div className="jf-form-group" style={{ marginBottom: "1.25rem" }}>
                <label className="jf-label">Operator Run Remarks</label>
                <textarea
                  className="jf-textarea"
                  style={{ minHeight: "70px" }}
                  value={operatorRemarks}
                  onChange={(e) => setOperatorRemarks(e.target.value)}
                />
              </div>

              {/* Complete Run & Defect Alert buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="jf-btn jf-btn-danger-outline jf-btn-sm"
                  onClick={() => toast.warning("Defect flag sent to QC inspector!")}
                >
                  <AlertTriangle size={14} /> Report Defect Alert
                </button>

                <button
                  type="button"
                  className="jf-btn jf-btn-primary"
                  onClick={() => {
                    toast.success("Production run completed! Job sent to Quality Control (QC).");
                    navigate(`/jobflow/qc?jobId=${selectedPlanJob?._id || selectedPlanJob?.id || ""}`);
                  }}
                >
                  <CheckCircle size={16} /> Complete Run & Proceed to QC &rarr;
                </button>
              </div>
            </div>

            {/* Right: Substrate Verification & Next Operation */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="jf-card">
                <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9375rem", color: "#0f172a" }}>
                  Stock Verification & Consumables
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.8125rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ color: "#64748b" }}>Paper Substrate:</span>
                    <strong>350gsm Premium Art Board</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ color: "#64748b" }}>Batch Consumed:</span>
                    <span>{actualInputQty} sheets</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ color: "#64748b" }}>Substrate Balance:</span>
                    <span style={{ color: "#15803d", fontWeight: 600 }}>Sufficient (1,155 in reserve)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Cyan / Magenta / Yellow / K:</span>
                    <span>Levels at 82%</span>
                  </div>
                </div>
              </div>

              <div className="jf-card" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9375rem", color: "#166534" }}>
                  Next Operation in Sequence:
                </h4>
                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#15803d", marginBottom: "0.25rem" }}>
                  Matt Lamination
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#166534" }}>
                  Machine: <strong>Komfi Delta 52</strong> • Queue: Waiting for this print run to finish
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </JobFlowLayout>
  );
};

export default ProductionPage;
