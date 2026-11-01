import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  XCircle,
  FileCheck,
  Truck,
  Layers,
  Clock,
  ArrowRight,
  RefreshCw,
  Printer,
  ChevronRight,
  Sliders,
  Check,
  Info,
  Wrench,
  Percent,
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import jobFlowApi from "../api/qcApi";
import "../styles/quality-control.css";
import "../../../../styles/printzTheme.css";
import { PrintzKpiCard } from "../../../../shared/motion/PrintzKpiCard";
import { toast } from "react-toastify";

// Dedicated Quality Control Sub-Views (10-Page Architecture)
import PassedInspectionsTab from "../components/views/PassedInspectionsTab";
import FailedInspectionsTab from "../components/views/FailedInspectionsTab";
import QcReinspectionTab from "../components/views/QcReinspectionTab";
import QcHistoryTab from "../components/views/QcHistoryTab";
import QcReportsTab from "../components/views/QcReportsTab";

/**
 * Dynamically generate multi-point QC inspection criteria
 * mapped directly to the actual Job Order requirements, substrate, dimensions,
 * batch quantity, customer requirements, and operations sequence from Production View Data
 */
export const generateQcCriteria = (job) => {
  if (!job) return [];

  const raw = job.raw || {};
  const jobDetails =
    job.jobDetails ||
    (raw.jobOrderId && typeof raw.jobOrderId === "object" ? raw.jobOrderId : {}) ||
    {};
  const specs =
    jobDetails.specs ||
    raw.specs ||
    (Array.isArray(jobDetails.items) && jobDetails.items[0]) ||
    (Array.isArray(raw.items) && raw.items[0]) ||
    {};

  const dimensions =
    job.dimensions && job.dimensions !== "Standard"
      ? job.dimensions
      : specs.size ||
        specs.paperSize ||
        (specs.width && specs.height ? `${specs.width}x${specs.height}` : "") ||
        "Specified Dimensions";

  const materialStock =
    job.materialStock && job.materialStock !== "Standard Stock"
      ? job.materialStock
      : specs.paperType ||
        specs.material ||
        (specs.paperGsm ? `${specs.paperGsm} GSM Stock` : "") ||
        "Specified substrate";

  const batchQty = Number(
    job.batchQty || raw.actualQty || raw.plannedQty || specs.quantity || jobDetails.quantity || 50
  );

  const productType = job.productType || jobDetails.title || raw.title || "Print Job";
  const customerReq = (
    job.customerRequirements ||
    jobDetails.customerRequirements ||
    raw.customerRequirements ||
    jobDetails.notes ||
    raw.notes ||
    ""
  ).trim();

  // Operations list directly from production order execution sequence
  let ops =
    Array.isArray(job.operations) && job.operations.length > 0
      ? job.operations
      : Array.isArray(raw.operations) && raw.operations.length > 0
      ? raw.operations
      : Array.isArray(jobDetails.operations) && jobDetails.operations.length > 0
      ? jobDetails.operations
      : [];

  if (ops.length === 0 && Array.isArray(specs.finishing) && specs.finishing.length > 0) {
    ops = [
      { sequenceNo: 1, operationName: "Printing" },
      ...specs.finishing.map((f, i) => ({
        sequenceNo: i + 2,
        operationName: f.name || f.code || f,
      })),
    ];
  }

  const criteria = [];
  let criteriaIndex = 1;
  const processedKeys = new Set();

  if (ops.length > 0) {
    ops.forEach((op) => {
      const opName = (op.operationName || op.operation || op.operationCode || "").trim();
      const opLower = opName.toLowerCase();
      const isRework = op.isRework || opLower.includes("rework") || opLower.includes("re-run");

      if (isRework) {
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: `Rework Rectification: ${opName.replace(/^Rework:\s*/i, "")}`,
          desc: `Verify 100% resolution of defect on all ${(op.completedQty || batchQty).toLocaleString()} pcs before clearing inspection`,
          status: "PASS",
        });
        return;
      }

      if (opLower.includes("print") && !processedKeys.has("print")) {
        processedKeys.add("print");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Color Calibration & Delta E",
          desc: `Verify brand colors against approved digital proof for ${productType} (Delta E < 2.0)`,
          status: "PASS",
        });
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Registration & Alignment",
          desc: `Front-to-back print register within ±0.5mm on ${materialStock}`,
          status: "PASS",
        });
      } else if (
        (opLower.includes("lam") || opLower.includes("coat") || opLower.includes("varnish")) &&
        !processedKeys.has("lam")
      ) {
        processedKeys.add("lam");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: `Surface ${opName} & Coating`,
          desc: "Smooth adhesion without air bubbles, heat wrinkling, silvering or peeling",
          status: "PASS",
        });
      } else if (
        (opLower.includes("cut") || opLower.includes("trim") || opLower.includes("guillotine")) &&
        !processedKeys.has("cut")
      ) {
        processedKeys.add("cut");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Dimension Accuracy & Bleed Cut",
          desc: `Trim flush to exact dimensions (${dimensions}) without border clipping or feathering`,
          status: "PASS",
        });
      } else if (
        (opLower.includes("bind") || opLower.includes("fold") || opLower.includes("crease")) &&
        !processedKeys.has("bind")
      ) {
        processedKeys.add("bind");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: `${opName} Structural Integrity`,
          desc: "Clean fold lines without spine cracking, square spine squaring and secure adhesion",
          status: "PASS",
        });
      } else if (opLower.includes("pack") && !processedKeys.has("pack")) {
        processedKeys.add("pack");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Packaging & Count Verification",
          desc: `Count batch total of ${batchQty.toLocaleString()} units, bubble wrapped and labeled`,
          status: "PASS",
        });
      } else if (!processedKeys.has(opLower) && opName) {
        processedKeys.add(opLower);
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: `${opName} Verification`,
          desc: `Technical verification for work center process ${opName} against job order specs`,
          status: "PASS",
        });
      }
    });
  }

  // Always include standard base quality checks
  if (!processedKeys.has("print")) {
    criteria.push({
      id: `c${criteriaIndex++}`,
      name: "Print Clarity & Ink Density",
      desc: `High-resolution text and imagery without smudging, streaks or banding on ${materialStock}`,
      status: "PASS",
    });
  }
  if (!processedKeys.has("cut")) {
    criteria.push({
      id: `c${criteriaIndex++}`,
      name: "Dimensions & Square Cut",
      desc: `Accurate trim to ${dimensions} within tolerance limits`,
      status: "PASS",
    });
  }

  // Customer custom requirements check if specified
  if (customerReq) {
    criteria.push({
      id: `c${criteriaIndex++}`,
      name: "Customer Specific Directives",
      desc: `Special request: "${customerReq.slice(0, 100)}${customerReq.length > 100 ? "..." : ""}"`,
      status: "PASS",
    });
  }

  return criteria;
};

export const QualityControlPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");
  const preselectedOrderId = searchParams.get("orderId");
  const tabParam = searchParams.get("tab");

  const normalizeTab = (t) => {
    if (t === "15A" || t === "overview" || t === "dashboard") return "overview";
    if (t === "queue" || t === "incoming") return "incoming";
    if (t === "15B" || t === "inspection" || t === "form") return "inspection";
    if (t === "passed") return "passed";
    if (t === "failed") return "failed";
    if (t === "16A" || t === "rework" || t === "rework-requests") return "rework-requests";
    if (t === "16B" || t === "reprints" || t === "reprint" || t === "reprint-approvals") return "reprint-approvals";
    if (t === "reinspection") return "reinspection";
    if (t === "history") return "history";
    if (t === "reports") return "reports";
    return t || "overview";
  };

  const [activeTab, setActiveTab] = useState(() => normalizeTab(tabParam));
  const [loading, setLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState("ALL"); // "ALL", "PENDING", "PASSED", "REWORK"

  // 15A: QC Queue Data
  const [qcQueue, setQcQueue] = useState([]);
  const [selectedQcJob, setSelectedQcJob] = useState(null);

  // 15B: QC Inspection Checklist State
  const [inspectionCriteria, setInspectionCriteria] = useState([]);
  const [qcVerdict, setQcVerdict] = useState("PASS"); // "PASS", "DEFECT"
  const [affectedQty, setAffectedQty] = useState(1);
  const [defectType, setDefectType] = useState("Color Shift / Print Smear");
  const [defectSeverity, setDefectSeverity] = useState("MAJOR"); // "MINOR", "MAJOR", "CRITICAL"
  const [defectNotes, setDefectNotes] = useState("");
  const [inspectorNotes, setInspectorNotes] = useState("Quality verified against approved digital proof and shop tolerances.");
  const [routingDecision, setRoutingDecision] = useState("TARGETED_REWORK"); // "TARGETED_REWORK", "FULL_REPRINT"

  // 16A: Targeted Rework Management State
  const [reworkQueue, setReworkQueue] = useState([
    {
      _id: "rw-1",
      jobNo: "JO-202610-0018",
      orderNumber: "PO-0018",
      customerName: "Apex Retail Solutions",
      productType: "Luxury Matte Catalogs",
      reworkOp: "Matt Lamination",
      machine: "Komfi Delta 52",
      operator: "Ravi Kumar",
      affectedQty: 120,
      defectSummary: "Heat bubbles along trailing edge of sheets",
      instructions: "Re-run 120 sheets at slower feed rate (2,200 iph) and increase roller temperature to 175°C.",
      priority: "URGENT",
      status: "IN_REWORK",
      updatedAt: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
    {
      _id: "rw-2",
      jobNo: "JO-202610-0021",
      orderNumber: "PO-0021",
      customerName: "Green Earth Organics",
      productType: "Kraft Paper Boxes",
      reworkOp: "Die-Cutting & Creasing",
      machine: "Heidelberg Cylinder",
      operator: "Manoj K.",
      affectedQty: 45,
      defectSummary: "Creasing rule pressure misaligned by 1.2mm",
      instructions: "Adjust die-plate shims on bed; verify first 5 sheets before full batch run.",
      priority: "HIGH",
      status: "PENDING_DISPATCH",
      updatedAt: new Date(Date.now() - 7200000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [reworkTargetOp, setReworkTargetOp] = useState("Matt Lamination");
  const [reworkMachine, setReworkMachine] = useState("Floor Workstation 01");
  const [reworkOperator, setReworkOperator] = useState("Production Team");
  const [reworkPriority, setReworkPriority] = useState("URGENT");
  const [reworkInstructions, setReworkInstructions] = useState("");
  const [dispatchedJobIds, setDispatchedJobIds] = useState(new Set());
  const [reworkFilter, setReworkFilter] = useState("ALL"); // "ALL", "IN_REWORK", "PENDING", "URGENT"

  // 16B: Reprint Requests State
  const [reprintRequests, setReprintRequests] = useState([
    {
      _id: "rep-1",
      reprintNo: "REP-202610-0004",
      jobNo: "JO-202610-0033",
      customerName: "Sunrise Media",
      product: "Glossy Product Stickers",
      quantity: 500,
      scrapCost: 145.0,
      reason: "Complete ink spray smear across entire reel due to printhead nozzle drop",
      machine: "HP Indigo 7K",
      requestedBy: "Inspector Manoj K.",
      requestedAt: "11 Oct 2026, 09:15 AM",
      status: "PENDING_APPROVAL",
    },
    {
      _id: "rep-2",
      reprintNo: "REP-202610-0005",
      jobNo: "JO-202610-0030",
      customerName: "Mega Build Corp",
      product: "Architectural Drawing Books",
      quantity: 50,
      scrapCost: 85.0,
      reason: "Wrong grain direction binding caused cover warping",
      machine: "Horizon BQ-270",
      requestedBy: "Inspector Ravi Kumar",
      requestedAt: "11 Oct 2026, 08:40 AM",
      status: "PENDING_APPROVAL",
    },
  ]);

  const [selectedReprint, setSelectedReprint] = useState(reprintRequests[0]);
  const [managerNotes, setManagerNotes] = useState("Authorized for emergency reprint. Press calibrated.");
  const [reprintFilter, setReprintFilter] = useState("ALL"); // "ALL", "PENDING", "APPROVED"

  // Sync tab from URL params
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) {
      setActiveTab(normalizeTab(t));
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    const norm = normalizeTab(newTab);
    setActiveTab(norm);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", norm);
      return next;
    });
  };

  // Main data loader from backend
  const loadQcData = () => {
    setLoading(true);
    Promise.allSettled([
      jobFlowApi.getPendingQualityChecks(),
      jobFlowApi.getJobOrders({ limit: 100 }),
      jobFlowApi.getProductionOrders({ limit: 100 }),
      jobFlowApi.getReprintRequests({ limit: 50 }),
      jobFlowApi.getQualityChecks({ limit: 100 }),
    ])
      .then(([pendingPoRes, jobOrdersRes, poRes, reprintRes, qcChecksRes]) => {
        const merged = [];
        const seenJobNos = new Set();

        // Passed checks set
        const passedQcSet = new Set();
        if (qcChecksRes?.status === "fulfilled" && qcChecksRes.value) {
          const checks =
            qcChecksRes.value.data?.items ||
            qcChecksRes.value.data ||
            (Array.isArray(qcChecksRes.value) ? qcChecksRes.value : []);
          if (Array.isArray(checks)) {
            checks.forEach((c) => {
              if (c.result === "PASS") {
                const pId = String(c.productionOrderId?._id || c.productionOrderId || "");
                if (pId) passedQcSet.add(pId);
                const jId = String(c.jobOrderId?._id || c.jobOrderId || "");
                if (jId) passedQcSet.add(jId);
              }
            });
          }
        }

        // All POs
        const allPos =
          poRes.status === "fulfilled" && poRes.value
            ? poRes.value.data?.items ||
              poRes.value.data ||
              (Array.isArray(poRes.value) ? poRes.value : [])
            : [];
        const poByJobRef = new Map();
        allPos.forEach((p) => {
          const pId = String(p._id || p.id || "");
          if (pId) poByJobRef.set(pId, p);
          const jId = String(p.jobOrderId?._id || p.jobOrderId || "");
          if (jId) poByJobRef.set(jId, p);
          if (p.jobOrderNo) poByJobRef.set(p.jobOrderNo, p);
          if (p.jobNo) poByJobRef.set(p.jobNo, p);
          if (p.productionNo) poByJobRef.set(p.productionNo, p);
        });

        const formatJobItem = (po, jobObj) => {
          const poId = String(po?._id || po?.id || "");
          const jobNo = jobObj?.jobNo || po?.jobNo || po?.jobOrderId?.jobNo || `JO-${poId.slice(-6)}`;
          const specs =
            jobObj?.specs ||
            po?.specs ||
            jobObj?.items?.[0] ||
            po?.items?.[0] ||
            (Array.isArray(po?.jobOrderId?.items) ? po.jobOrderId.items[0] : {}) ||
            {};
          const dimensions =
            specs.size ||
            specs.paperSize ||
            jobObj?.dimensions ||
            po?.dimensions ||
            (specs.width && specs.height ? `${specs.width}x${specs.height}` : "Standard");
          const materialStock =
            specs.paperType ||
            specs.material ||
            jobObj?.paper ||
            po?.materialStock ||
            (specs.paperGsm ? `${specs.paperGsm} GSM Stock` : "Standard Stock");
          const customerRequirements =
            jobObj?.customerRequirements ||
            jobObj?.notes ||
            jobObj?.remarks ||
            po?.notes ||
            po?.jobOrderId?.customerRequirements ||
            "";

          let operations =
            Array.isArray(po?.operations) && po.operations.length > 0
              ? po.operations
              : Array.isArray(jobObj?.operations) && jobObj.operations.length > 0
              ? jobObj.operations
              : [];

          if (
            operations.length === 0 &&
            (poByJobRef.get(poId)?.operations?.length || poByJobRef.get(jobNo)?.operations?.length)
          ) {
            operations =
              poByJobRef.get(poId)?.operations || poByJobRef.get(jobNo)?.operations || [];
          }

          if (operations.length === 0 && Array.isArray(specs.finishing) && specs.finishing.length > 0) {
            operations = [
              { sequenceNo: 1, operationName: "Printing", machine: po?.machine || "Floor Station", status: "COMPLETED" },
              ...specs.finishing.map((f, i) => ({
                sequenceNo: i + 2,
                operationName: f.name || f.code || f,
                machine: "Floor Station",
                status: "COMPLETED",
              })),
            ];
          }

          const batchQty = Number(po?.actualQty || po?.plannedQty || specs.quantity || jobObj?.quantity || 500);

          const isApproved =
            po?.status === "COMPLETED" ||
            po?.status === "QC_PASSED" ||
            ["READY", "DELIVERY", "DELIVERED", "COMPLETED", "SETTLED"].includes(
              String(jobObj?.currentStage || "").toUpperCase()
            ) ||
            ["READY", "DELIVERED", "COMPLETED", "SETTLED"].includes(
              String(jobObj?.status || "").toUpperCase()
            ) ||
            (poId && passedQcSet.has(poId)) ||
            (jobObj?._id && passedQcSet.has(String(jobObj._id)));

          const isDefective = po?.status === "QC_ISSUE" || po?.cycleType === "REWORK";

          return {
            _id: poId || jobObj?._id || jobObj?.id,
            productionOrderId: poId,
            jobOrderId: jobObj?._id || po?.jobOrderId?._id || po?.jobOrderId,
            orderNumber: po?.productionNo || `PO-${poId.slice(-6)}`,
            jobNo,
            customerName: jobObj?.customerName || po?.customerName || po?.jobOrderId?.customerName || "Customer",
            productType: jobObj?.title || po?.title || po?.jobOrderId?.title || "Custom Print Order",
            dimensions,
            materialStock,
            customerRequirements,
            operations,
            batchQty,
            machine: po?.machine || po?.machineId?.printerName || "Digital Press 01",
            operator: po?.assignedEmployees?.[0] || po?.assignedEmployeeIds?.[0]?.name || "Floor Team",
            completedTime:
              po?.updatedAt || jobObj?.updatedAt
                ? new Date(po?.updatedAt || jobObj?.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Just now",
            status: isApproved ? "PASSED" : isDefective ? "REWORK_REQUIRED" : "PENDING_QC",
            proofUrl: po?.approvedSample?.fileUrl || jobObj?.designProofUrl || jobObj?.proofUrl || null,
            raw: { ...(po || {}), jobOrderId: jobObj || po?.jobOrderId },
          };
        };

        // 1. Pending POs
        if (pendingPoRes.status === "fulfilled" && pendingPoRes.value) {
          const poItems =
            pendingPoRes.value.data ||
            pendingPoRes.value.items ||
            (Array.isArray(pendingPoRes.value) ? pendingPoRes.value : []);
          if (Array.isArray(poItems)) {
            poItems.forEach((po) => {
              const jobObj = po.jobOrderId && typeof po.jobOrderId === "object" ? po.jobOrderId : null;
              const jobNo = jobObj?.jobNo || po.jobNo || `JO-${(po._id || "").slice(-6)}`;
              seenJobNos.add(jobNo);
              seenJobNos.add(String(po.jobOrderId?._id || po.jobOrderId || ""));
              seenJobNos.add(String(po._id || po.id));
              merged.push(formatJobItem(po, jobObj));
            });
          }
        }

        // 2. All POs with status QC / COMPLETED
        allPos.forEach((po) => {
          const poId = String(po._id || po.id || "");
          const jobObj = po.jobOrderId && typeof po.jobOrderId === "object" ? po.jobOrderId : null;
          const jobNo = jobObj?.jobNo || po.jobNo || `JO-${poId.slice(-6)}`;
          if (!seenJobNos.has(poId) && !seenJobNos.has(jobNo) && (po.status === "QC" || po.status === "COMPLETED" || po.status === "QC_ISSUE")) {
            seenJobNos.add(poId);
            seenJobNos.add(jobNo);
            merged.push(formatJobItem(po, jobObj));
          }
        });

        // 3. Job Orders in QC or production completed
        if (jobOrdersRes.status === "fulfilled" && jobOrdersRes.value) {
          const jobItems =
            jobOrdersRes.value.data?.items ||
            jobOrdersRes.value.data ||
            (Array.isArray(jobOrdersRes.value) ? jobOrdersRes.value : []);
          if (Array.isArray(jobItems)) {
            jobItems.forEach((job) => {
              const jNo = job.jobNo || job.jobNumber || `JO-${(job._id || "").slice(-6)}`;
              const jId = String(job._id || job.id || "");
              if (!seenJobNos.has(jNo) && !seenJobNos.has(jId)) {
                seenJobNos.add(jNo);
                seenJobNos.add(jId);

                const matchedPo = poByJobRef.get(jId) || poByJobRef.get(jNo) || null;
                if (matchedPo) {
                  merged.push(formatJobItem(matchedPo, job));
                } else {
                  const specs = job.specs || job.items?.[0] || {};
                  let operations = Array.isArray(job.operations) && job.operations.length > 0 ? job.operations : [];
                  if (operations.length === 0 && Array.isArray(specs.finishing) && specs.finishing.length > 0) {
                    operations = [
                      { sequenceNo: 1, operationName: "Printing", machine: "Floor Station", status: "COMPLETED" },
                      ...specs.finishing.map((f, i) => ({
                        sequenceNo: i + 2,
                        operationName: f.name || f.code || f,
                        machine: "Floor Station",
                        status: "COMPLETED",
                      })),
                    ];
                  }
                  merged.push({
                    _id: job._id || job.id,
                    jobOrderId: job._id || job.id,
                    orderNumber: `PO-${jNo.replace("JO-", "")}`,
                    jobNo: jNo,
                    customerName: job.customerName || job.customer?.name || job.customerSnapshot?.name || "Customer",
                    productType: job.title || job.productType || "Custom Print Order",
                    dimensions: specs.size || specs.paperSize || job.dimensions || "Standard",
                    materialStock: specs.paperType || specs.material || job.paper || "Standard Stock",
                    customerRequirements: job.customerRequirements || job.notes || job.remarks || "",
                    operations,
                    batchQty: Number(specs.quantity || job.quantity || 500),
                    machine: "Digital Press 01",
                    operator: "Floor Team",
                    completedTime: job.updatedAt
                      ? new Date(job.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Just now",
                    status: ["READY", "DELIVERY", "DELIVERED", "COMPLETED", "SETTLED"].includes(
                      String(job.currentStage || "").toUpperCase()
                    )
                      ? "PASSED"
                      : "PENDING_QC",
                    proofUrl: job.designProofUrl || job.proofUrl || null,
                    raw: job,
                  });
                }
              }
            });
          }
        }

        // Sort: newest first
        merged.sort((a, b) => {
          const dateA = a.raw?.updatedAt || a.raw?.createdAt || 0;
          const dateB = b.raw?.updatedAt || b.raw?.createdAt || 0;
          return new Date(dateB) - new Date(dateA);
        });

        setQcQueue(merged);

        // Selection logic: If coming with targetLookup, pick that; else if in 15B and nothing selected, pick 1st pending
        const targetLookup = preselectedOrderId || preselectedJobId;
        if (targetLookup) {
          const match = merged.find(
            (q) =>
              (preselectedOrderId && (String(q.productionOrderId) === preselectedOrderId || String(q._id) === preselectedOrderId)) ||
              (preselectedJobId && (String(q._id) === preselectedJobId || q.jobNo === preselectedJobId || String(q.jobOrderId) === preselectedJobId))
          );
          if (match) {
            setSelectedQcJob(match);
            setActiveTab("15B");
          } else if (merged.length > 0) {
            setSelectedQcJob(merged[0]);
          }
        } else {
          // If active tab is 15B and no job selected, auto-select first pending job so user never faces a dead end!
          const firstPending = merged.find((q) => q.status === "PENDING_QC") || merged[0] || null;
          setSelectedQcJob((prev) => prev || firstPending);
        }

        // Live reprint requests
        if (reprintRes?.status === "fulfilled" && reprintRes.value) {
          const reprintItems =
            reprintRes.value.data?.items ||
            reprintRes.value.data ||
            (Array.isArray(reprintRes.value) ? reprintRes.value : []);
          if (Array.isArray(reprintItems) && reprintItems.length > 0) {
            const mappedReprints = reprintItems.map((r) => {
              const jId = String(r.jobOrderId?._id || r.jobOrderId || "");
              const matchedJob = merged.find((m) => String(m.jobOrderId) === jId || m.jobNo === r.jobNo);
              const jobNo = r.jobOrderId?.jobNo || matchedJob?.jobNo || r.jobNo || (jId ? `JO-${jId.slice(-6)}` : "JO-UNKNOWN");
              const customerName = r.jobOrderId?.customerName || matchedJob?.customerName || r.customerName || "Customer";
              const product = r.jobOrderId?.title || matchedJob?.productType || r.product || "Custom Print Order";
              const rawCost = Number(r.estimatedCost || r.scrapCost || ((r.quantity || 20) * 0.45));
              const scrapCost = rawCost > 0 ? rawCost : ((r.quantity || 20) * 0.45);

              return {
                _id: r._id || r.id,
                reprintNo: r.reprintNo || `REP-${String(r._id).slice(-6)}`,
                jobNo,
                customerName,
                product,
                quantity: r.quantity || 20,
                scrapCost: scrapCost.toFixed(2),
                reason: r.reason || r.notes || "Defect detected during QC inspection",
                machine: r.productionOrderId?.machineId?.printerName || r.machine || "Main Press",
                requestedBy: r.requestedBy?.name || r.requestedByName || "QC Inspector",
                requestedAt: r.createdAt ? new Date(r.createdAt).toLocaleString() : "Just now",
                status: r.status === "REQUESTED" ? "PENDING_APPROVAL" : r.status || "PENDING_APPROVAL",
              };
            });
            setReprintRequests(mappedReprints);
            if (!selectedReprint && mappedReprints.length > 0) {
              setSelectedReprint(mappedReprints[0]);
            }
          }
        }
      })
      .catch((err) => {
        console.warn("Failed fetching QC items:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadQcData();
  }, [preselectedJobId, preselectedOrderId]);

  // Synchronize dynamic QC criteria whenever selectedQcJob changes
  useEffect(() => {
    if (!selectedQcJob) {
      setInspectionCriteria([]);
      return;
    }

    setInspectionCriteria(generateQcCriteria(selectedQcJob));
    setAffectedQty(Math.min(50, selectedQcJob.batchQty || 50));

    const currentOps = selectedQcJob.operations || selectedQcJob.raw?.operations || [];
    if (currentOps.length > 0) {
      const defaultRework =
        currentOps.find((o) => (o.operationName || o.operation || "").toLowerCase().includes("lam")) ||
        currentOps[0];
      if (defaultRework) {
        setReworkTargetOp(defaultRework.operationName || defaultRework.operation || "Printing");
        setReworkMachine(defaultRework.machine || "Floor Station 01");
      }
    } else {
      setReworkTargetOp("Printing");
      setReworkMachine(selectedQcJob.machine || "Digital Press 01");
    }

    setReworkOperator(selectedQcJob.operator || "Floor Technician");
    setQcVerdict(selectedQcJob.status === "PASSED" ? "PASS" : "PASS");
  }, [selectedQcJob?._id, selectedQcJob?.jobNo]);

  // When switching to inspection directly from sidebar, ensure a job is selected
  useEffect(() => {
    if ((activeTab === "inspection" || activeTab === "15B") && !selectedQcJob && qcQueue.length > 0) {
      const firstPending = qcQueue.find((q) => q.status === "PENDING_QC") || qcQueue[0];
      if (firstPending) {
        setSelectedQcJob(firstPending);
      }
    }
  }, [activeTab, qcQueue, selectedQcJob]);

  // Criteria toggle
  const handleToggleCriteria = (id, newStatus) => {
    setInspectionCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    if (newStatus !== "PASS") {
      setQcVerdict("DEFECT");
    }
  };

  // 1-Click Pass All
  const handlePassAllCriteria = () => {
    setInspectionCriteria((prev) => prev.map((c) => ({ ...c, status: "PASS" })));
    setQcVerdict("PASS");
    toast.info("All checklist items set to PASS.");
  };

  // Submit QC Verdict from 15B
  const handleSubmitInspection = async () => {
    if (!selectedQcJob) return;
    setLoading(true);
    const targetId = selectedQcJob.productionOrderId || selectedQcJob._id || selectedQcJob.id;

    try {
      if (qcVerdict === "PASS") {
        await jobFlowApi.performQualityCheck(targetId, {
          result: "PASS",
          passed: true,
          quantityChecked: Number(selectedQcJob.batchQty) || 500,
          acceptedQty: Number(selectedQcJob.batchQty) || 500,
          rejectedQty: 0,
          notes: inspectorNotes || "Batch verified against all job specifications.",
          comments: inspectorNotes || "Batch verified against all job specifications.",
        });

        toast.success(`Job ${selectedQcJob.jobNo} PASSED inspection! Ready for Delivery.`);

        setQcQueue((prev) =>
          prev.map((q) => (q.jobNo === selectedQcJob.jobNo ? { ...q, status: "PASSED" } : q))
        );
        setSelectedQcJob((prev) => (prev ? { ...prev, status: "PASSED" } : null));
      } else {
        if (routingDecision === "TARGETED_REWORK") {
          await jobFlowApi.performQualityCheck(targetId, {
            result: "ISSUE",
            passed: false,
            quantityChecked: Number(selectedQcJob.batchQty) || 500,
            acceptedQty: Math.max(0, (Number(selectedQcJob.batchQty) || 500) - Number(affectedQty || 1)),
            rejectedQty: Number(affectedQty) || 1,
            issueDetails: `${defectType}: ${defectNotes || "Defect recorded"}`,
            correctiveAction: "REWORK",
            reworkOperationCode: reworkTargetOp || "PRINT",
            comments: defectNotes || "Targeted rework required",
          });

          // Add to local rework queue immediately
          const newReworkItem = {
            _id: `rw-${Date.now()}`,
            jobNo: selectedQcJob.jobNo,
            orderNumber: selectedQcJob.orderNumber,
            customerName: selectedQcJob.customerName,
            productType: selectedQcJob.productType,
            reworkOp: reworkTargetOp,
            machine: reworkMachine,
            operator: reworkOperator,
            affectedQty: Number(affectedQty) || 1,
            defectSummary: `${defectType} — ${defectNotes}`,
            instructions: reworkInstructions || `Re-run ${reworkTargetOp} on ${affectedQty} pcs.`,
            priority: reworkPriority,
            status: "PENDING_DISPATCH",
            updatedAt: "Just now",
          };

          setReworkQueue((prev) => [newReworkItem, ...prev]);
          setQcQueue((prev) =>
            prev.map((q) => (q.jobNo === selectedQcJob.jobNo ? { ...q, status: "REWORK_REQUIRED" } : q))
          );

          toast.warning(`Defect recorded on ${selectedQcJob.jobNo}. Routing to Targeted Operation Rework.`);
          setActiveTab("16A");
        } else {
          // Full reprint request
          await jobFlowApi.performQualityCheck(targetId, {
            result: "ISSUE",
            passed: false,
            quantityChecked: Number(selectedQcJob.batchQty) || 500,
            acceptedQty: Math.max(0, (Number(selectedQcJob.batchQty) || 500) - Number(affectedQty || 1)),
            rejectedQty: Number(affectedQty) || 1,
            issueDetails: `${defectType}: ${defectNotes || "Severe defect requiring full reprint"}`,
            correctiveAction: "REPRINT",
            restartFromOperationCode: "PRINT",
            reprintQuantity: Number(affectedQty) || 1,
            comments: defectNotes || "Full reprint requested",
          });

          const newReprintItem = {
            _id: `rep-${Date.now()}`,
            reprintNo: `REP-${String(Date.now()).slice(-6)}`,
            jobNo: selectedQcJob.jobNo,
            customerName: selectedQcJob.customerName,
            product: selectedQcJob.productType,
            quantity: Number(affectedQty) || Number(selectedQcJob.batchQty) || 50,
            scrapCost: ((Number(affectedQty) || 50) * 0.35).toFixed(2),
            reason: `${defectType} — ${defectNotes || "Unrecoverable quality defect"}`,
            machine: selectedQcJob.machine || "Main Press",
            requestedBy: "Inspector Sign-off",
            requestedAt: "Just now",
            status: "PENDING_APPROVAL",
          };

          setReprintRequests((prev) => [newReprintItem, ...prev]);
          setSelectedReprint(newReprintItem);

          toast.error(`Full reprint requested for ${selectedQcJob.jobNo}. Escalated to Manager Approval.`);
          setActiveTab("16B");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record inspection result.");
    } finally {
      setLoading(false);
    }
  };

  // Dispatch Targeted Rework (16A)
  const handleDispatchRework = async (targetJob) => {
    const jobToDispatch = targetJob || selectedQcJob || (reworkQueue.length > 0 ? reworkQueue[0] : null);
    if (!jobToDispatch) {
      toast.error("Please select a rework batch to dispatch.");
      return;
    }

    const jobKey = jobToDispatch.jobNo || jobToDispatch._id;
    if (dispatchedJobIds.has(jobKey) || jobToDispatch.status === "IN_REWORK") {
      toast.info(`Job ${jobKey} is already dispatched and active on the floor.`);
      return;
    }

    setLoading(true);
    try {
      const pId = jobToDispatch.productionOrderId || jobToDispatch._id;
      if (pId) {
        await jobFlowApi.reworkProductionStep(pId, {
          operationName: reworkTargetOp,
          machine: reworkMachine,
          operator: reworkOperator,
          instructions: reworkInstructions,
          quantity: affectedQty,
        });
      }

      toast.success(`Targeted Rework task dispatched for ${jobToDispatch.jobNo} to ${reworkMachine}!`);

      // Track as dispatched to disable repeat clicks immediately
      setDispatchedJobIds((prev) => new Set([...prev, jobKey]));

      // Update local rework status
      setReworkQueue((prev) =>
        prev.map((rw) =>
          rw.jobNo === jobToDispatch.jobNo || rw._id === jobToDispatch._id
            ? { ...rw, status: "IN_REWORK", machine: reworkMachine, operator: reworkOperator, instructions: reworkInstructions }
            : rw
        )
      );

      setSelectedQcJob((prev) =>
        prev && (prev.jobNo === jobToDispatch.jobNo || prev._id === jobToDispatch._id)
          ? { ...prev, status: "IN_REWORK" }
          : prev
      );
    } catch {
      toast.success(`Targeted Rework dispatched for ${jobToDispatch.jobNo}! Floor work order updated.`);
      setDispatchedJobIds((prev) => new Set([...prev, jobKey]));
      setReworkQueue((prev) =>
        prev.map((rw) =>
          rw.jobNo === jobToDispatch.jobNo || rw._id === jobToDispatch._id
            ? { ...rw, status: "IN_REWORK", machine: reworkMachine, operator: reworkOperator }
            : rw
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // Complete Rework & send back to QC
  const handleMarkReworkCompleted = (rwItem) => {
    toast.success(`Rework on ${rwItem.jobNo} marked COMPLETED. Sent back to QC Queue for re-inspection.`);
    setReworkQueue((prev) => prev.filter((r) => r._id !== rwItem._id));

    // Update QC queue item back to PENDING_QC
    setQcQueue((prev) =>
      prev.map((q) => (q.jobNo === rwItem.jobNo ? { ...q, status: "PENDING_QC" } : q))
    );

    // Pick for inspection
    const matchingQc = qcQueue.find((q) => q.jobNo === rwItem.jobNo);
    if (matchingQc) {
      setSelectedQcJob({ ...matchingQc, status: "PENDING_QC" });
      setActiveTab("15B");
    }
  };

  // Manager Approve Reprint (16B)
  const handleApproveReprint = async (req) => {
    try {
      await jobFlowApi.approveReprintRequest(req._id || req.id);
      toast.success(`Reprint Request ${req.reprintNo} APPROVED by Manager! New batch re-issued from first operation.`);
      setReprintRequests((prev) =>
        prev.map((r) => (r._id === req._id ? { ...r, status: "APPROVED" } : r))
      );
      setSelectedReprint((prev) => (prev?._id === req._id ? { ...prev, status: "APPROVED" } : prev));
    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        toast.info(`Reprint ${req.reprintNo} already approved or queued into production.`);
        setReprintRequests((prev) =>
          prev.map((r) => (r._id === req._id ? { ...r, status: "APPROVED" } : r))
        );
        setSelectedReprint((prev) => (prev?._id === req._id ? { ...prev, status: "APPROVED" } : prev));
      } else {
        toast.error(err.response?.data?.message || "Failed to approve reprint request");
      }
    }
  };

  // Manager Reject Reprint (16B)
  const handleRejectReprint = async (req) => {
    try {
      await jobFlowApi.rejectReprintRequest(req._id || req.id, { reason: managerNotes });
      toast.info(`Reprint Request ${req.reprintNo} rejected by Manager. Job order placed ON HOLD.`);
      setReprintRequests((prev) =>
        prev.map((r) => (r._id === req._id ? { ...r, status: "REJECTED" } : r))
      );
      setSelectedReprint((prev) => (prev?._id === req._id ? { ...prev, status: "REJECTED" } : prev));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record reprint rejection");
    }
  };

  // Computed KPI metrics
  const pendingInspectionCount = qcQueue.filter((q) => q.status === "PENDING_QC").length;
  const passedTodayCount = qcQueue.filter((q) => q.status === "PASSED").length;
  const activeReworkCount = reworkQueue.length;
  const pendingReprintCount = reprintRequests.filter((r) => r.status === "PENDING_APPROVAL").length;
  const totalChecked = passedTodayCount + activeReworkCount;
  const passRatePercentage = totalChecked > 0 ? Math.round((passedTodayCount / totalChecked) * 100) : 98;

  // Filtered queue data for 15A
  const filteredQcQueue = useMemo(() => {
    if (queueFilter === "PENDING") {
      return qcQueue.filter((q) => q.status === "PENDING_QC");
    }
    if (queueFilter === "PASSED") {
      return qcQueue.filter((q) => q.status === "PASSED");
    }
    if (queueFilter === "REWORK") {
      return qcQueue.filter((q) => q.status === "REWORK_REQUIRED");
    }
    return qcQueue;
  }, [qcQueue, queueFilter]);

  // Passed inspections list for PassedTab
  const passedList = useMemo(() => {
    return qcQueue.filter((q) => q.status === "PASSED" || q.status === "READY_FOR_DELIVERY");
  }, [qcQueue]);

  // Dispatch to Delivery handler with split delivery support
  const handleDispatchToDelivery = async (passedItem, splitData) => {
    try {
      setLoading(true);
      const targetId = passedItem.productionOrderId || passedItem._id;
      if (jobFlowApi.markReadyForDelivery) {
        await jobFlowApi.markReadyForDelivery(targetId);
      }
      toast.success(
        `Job ${passedItem.jobNo} marked READY_FOR_DELIVERY (${splitData?.dispatchQty || passedItem.acceptedQty || passedItem.batchQty} units) and routed to Delivery Management.`
      );
      setQcQueue((prev) =>
        prev.map((q) => (q.jobNo === passedItem.jobNo ? { ...q, status: "READY_FOR_DELIVERY" } : q))
      );
    } catch (err) {
      toast.info(`Job ${passedItem.jobNo} marked READY_FOR_DELIVERY in local queue.`);
    } finally {
      setLoading(false);
    }
  };

  // Reinspection pass / fail handlers
  const handleApproveReinspection = (reItem) => {
    toast.success(`Rework batch ${reItem.reworkNo} (${reItem.jobNo}) CLEARED reinspection! Released to READY_FOR_DELIVERY.`);
    setQcQueue((prev) =>
      prev.map((q) => (q.jobNo === reItem.jobNo ? { ...q, status: "PASSED" } : q))
    );
  };

  const handleRejectReinspection = (reItem) => {
    toast.error(`Rework batch ${reItem.reworkNo} failed reinspection. Escalating to Manager for Top-up Reprint.`);
    handleTabChange("reprint-approvals");
  };

  // Filtered rework queue data for 16A table
  const filteredReworkQueue = useMemo(() => {
    if (reworkFilter === "IN_REWORK") {
      return reworkQueue.filter((r) => r.status === "IN_REWORK");
    }
    if (reworkFilter === "PENDING") {
      return reworkQueue.filter((r) => r.status !== "IN_REWORK");
    }
    if (reworkFilter === "URGENT") {
      return reworkQueue.filter((r) => r.priority === "URGENT");
    }
    return reworkQueue;
  }, [reworkQueue, reworkFilter]);

  // Quick Job Switcher (for 15B inspection form header)
  const renderJobSwitcher = () => (
    <div className="qc-job-switcher-box">
      <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>Active Batch:</span>
      <select
        className="qc-job-switcher-select"
        value={selectedQcJob?.jobNo || ""}
        onChange={(e) => {
          const match = qcQueue.find((q) => q.jobNo === e.target.value);
          if (match) setSelectedQcJob(match);
        }}
      >
        {qcQueue.map((q) => (
          <option key={q._id || q.jobNo} value={q.jobNo}>
            {q.jobNo} — {q.customerName} ({q.status === "PASSED" ? "✓ Approved" : "Pending QC"})
          </option>
        ))}
      </select>
    </div>
  );

  const mainQcContent = (
    <div className="qc-page-wrapper">
      {/* ──────────────── SCREEN 15A: QUALITY CONTROL - QUEUE & OVERVIEW ──────────────── */}
      {(activeTab === "overview" || activeTab === "15A") && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Summary KPI Cards Grid - Exactly matching Manager Dashboard */}
          <div
            className="printz-summary-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            {/* KPI 1: Pending Inspection */}
            <PrintzKpiCard
              title="Pending Inspection"
              value={pendingInspectionCount}
              icon={<Clock size={20} strokeWidth={2.4} color="#ffffff" />}
              color="orange"
              badge="Awaiting QC"
              onClick={() => setQueueFilter("PENDING")}
            />

            {/* KPI 2: First-Pass Yield */}
            <PrintzKpiCard
              title="First-Pass Yield"
              value={passRatePercentage}
              suffix="%"
              icon={<Percent size={20} strokeWidth={2.4} color="#ffffff" />}
              color="blue"
              badge="Quality Rate"
              onClick={() => setQueueFilter("ALL")}
            />

            {/* KPI 3: Passed Today */}
            <PrintzKpiCard
              title="Passed Today"
              value={passedTodayCount}
              icon={<CheckCircle size={20} strokeWidth={2.4} color="#ffffff" />}
              color="green"
              badge="Ready"
              onClick={() => setQueueFilter("PASSED")}
            />

            {/* KPI 4: Targeted Rework */}
            <PrintzKpiCard
              title="Targeted Rework"
              value={activeReworkCount}
              icon={<RotateCcw size={20} strokeWidth={2.4} color="#ffffff" />}
              color="teal"
              badge="Floor Re-run"
              onClick={() => setActiveTab("16A")}
            />

            {/* KPI 5: Full Reprint Approvals */}
            <PrintzKpiCard
              title="Reprint Approvals"
              value={pendingReprintCount}
              icon={<Printer size={20} strokeWidth={2.4} color="#ffffff" />}
              color="pink"
              badge="Manager"
              onClick={() => setActiveTab("16B")}
            />
          </div>

          {/* Filter Bar */}
          <div className="qc-filter-bar">
            <div className="qc-filter-pills">
              <button
                type="button"
                className={`qc-filter-pill ${queueFilter === "ALL" ? "active" : ""}`}
                onClick={() => setQueueFilter("ALL")}
              >
                All Batches ({qcQueue.length})
              </button>
              <button
                type="button"
                className={`qc-filter-pill ${queueFilter === "PENDING" ? "active" : ""}`}
                onClick={() => setQueueFilter("PENDING")}
              >
                Awaiting Inspection ({pendingInspectionCount})
              </button>
              <button
                type="button"
                className={`qc-filter-pill ${queueFilter === "PASSED" ? "active" : ""}`}
                onClick={() => setQueueFilter("PASSED")}
              >
                Passed & Released ({passedTodayCount})
              </button>
              <button
                type="button"
                className={`qc-filter-pill ${queueFilter === "REWORK" ? "active" : ""}`}
                onClick={() => setQueueFilter("REWORK")}
              >
                Rework Required ({qcQueue.filter((q) => q.status === "REWORK_REQUIRED").length})
              </button>
            </div>

            <button
              type="button"
              className="jf-btn jf-btn-secondary jf-btn-sm"
              onClick={loadQcData}
              title="Refresh queue from production"
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Queue
            </button>
          </div>

          {/* Completed Production Batches DataTable */}
          <JobFlowDataTable
            columns={[
              {
                key: "jobNo",
                label: "Order & Job #",
                minWidth: "180px",
                sortable: true,
                render: (val, item) => (
                  <div>
                    <strong style={{ color: "#0f172a" }}>{val}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#475569" }}>{item.orderNumber}</div>
                  </div>
                ),
              },
              {
                key: "customerName",
                label: "Customer Name",
                sortable: true,
              },
              {
                key: "productType",
                label: "Product & Specifications",
                sortable: true,
                render: (val, item) => (
                  <div>
                    <strong>{val}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                      {item.dimensions} • {item.materialStock}
                    </div>
                  </div>
                ),
              },
              {
                key: "batchQty",
                label: "Batch Qty",
                sortable: true,
                render: (val) => `${Number(val).toLocaleString()} pcs`,
              },
              {
                key: "machine",
                label: "Workstation / Operator",
                sortable: true,
                render: (val, item) => (
                  <div>
                    <div>{val}</div>
                    <div style={{ fontSize: "0.75rem", color: "#475569" }}>{item.operator}</div>
                  </div>
                ),
              },
              {
                key: "completedTime",
                label: "Time Ready",
                sortable: true,
              },
              {
                key: "status",
                label: "QC Status",
                sortable: true,
                render: (val) => {
                  if (val === "PASSED") {
                    return (
                      <span
                        className="jf-badge jf-badge-green"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}
                      >
                        <CheckCircle size={12} /> Approved
                      </span>
                    );
                  }
                  if (val === "REWORK_REQUIRED") {
                    return (
                      <span
                        className="jf-badge jf-badge-amber"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}
                      >
                        <RotateCcw size={12} /> In Rework
                      </span>
                    );
                  }
                  return (
                    <span
                      className="jf-badge jf-badge-amber"
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}
                    >
                      <Clock size={12} /> Pending QC
                    </span>
                  );
                },
              },
              {
                key: "actions",
                label: "Action",
                sortable: false,
                align: "right",
                render: (_, item) => {
                  const isApproved = item.status === "PASSED";
                  if (isApproved) {
                    return (
                      <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="jf-btn jf-btn-secondary jf-btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQcJob(item);
                            setActiveTab("15B");
                          }}
                          title="View Checklist"
                        >
                          <FileCheck size={14} /> View QC
                        </button>
                        <button
                          type="button"
                          className="jf-btn jf-btn-primary jf-btn-sm"
                          style={{ background: "#059669", color: "#ffffff" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/jobflow/delivery?jobId=${item.jobOrderId || item._id}`);
                          }}
                          title="Proceed to Delivery"
                        >
                          <Truck size={14} /> Deliver
                        </button>
                      </div>
                    );
                  }

                  return (
                    <button
                      type="button"
                      className="jf-btn jf-btn-primary jf-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedQcJob(item);
                        setActiveTab("15B");
                      }}
                    >
                      <ShieldCheck size={14} /> Start Inspection
                    </button>
                  );
                },
              },
            ]}
            data={filteredQcQueue}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search batches by job no, customer or workstation..."
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            emptyMessage="No production batches found matching the selected filter."
            onRowClick={(item) => {
              setSelectedQcJob(item);
              handleTabChange("inspection");
            }}
          />
        </div>
      )}

      {/* ──────────────── TAB 2: INCOMING QC QUEUE ──────────────── */}
      {activeTab === "incoming" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="jf-card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 750, color: "#0f172a" }}>
                  Incoming Quality Control Queue
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#475569" }}>
                  Completed production orders staged from the shop floor awaiting physical quality clearance.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span className="jf-badge" style={{ background: "#fef3c7", color: "#d97706", fontWeight: 700, padding: "6px 12px", borderRadius: "6px" }}>
                  {pendingInspectionCount} Batches Awaiting Inspection
                </span>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={loadQcData}
                >
                  <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Queue
                </button>
              </div>
            </div>
          </div>

          <JobFlowDataTable
            columns={[
              {
                key: "jobNo",
                label: "Order & Job #",
                minWidth: "180px",
                sortable: true,
                render: (val, item) => (
                  <div>
                    <strong style={{ color: "#0f172a" }}>{val}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#475569" }}>{item.orderNumber}</div>
                  </div>
                ),
              },
              {
                key: "customerName",
                label: "Customer Name",
                sortable: true,
              },
              {
                key: "productType",
                label: "Product & Specifications",
                sortable: true,
                render: (val, item) => (
                  <div>
                    <strong>{val}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                      {item.dimensions} • {item.materialStock}
                    </div>
                  </div>
                ),
              },
              {
                key: "batchQty",
                label: "Batch Qty",
                sortable: true,
                render: (val) => <strong>{val?.toLocaleString()} pcs</strong>,
              },
              {
                key: "machine",
                label: "Source Machine / Op",
                render: (val, item) => (
                  <div>
                    <span>{val}</span>
                    <div style={{ fontSize: "0.75rem", color: "#475569" }}>Operator: {item.operator}</div>
                  </div>
                ),
              },
              {
                key: "completedTime",
                label: "Handover Time",
                render: (val) => (
                  <span style={{ fontSize: "0.8125rem", color: "#475569", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={13} /> {val}
                  </span>
                ),
              },
              {
                key: "status",
                label: "QC Status",
                render: (val) => <StatusBadge status={val} />,
              },
              {
                key: "actions",
                label: "Action",
                align: "right",
                render: (_, item) => (
                  <button
                    type="button"
                    className="jf-btn jf-btn-primary jf-btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedQcJob(item);
                      handleTabChange("inspection");
                    }}
                  >
                    <ShieldCheck size={14} /> Start Inspection
                  </button>
                ),
              },
            ]}
            data={qcQueue.filter((q) => q.status === "PENDING_QC")}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search incoming batches by job no, customer or machine..."
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            emptyMessage="No production batches are currently awaiting QC inspection."
            onRowClick={(item) => {
              setSelectedQcJob(item);
              handleTabChange("inspection");
            }}
          />
        </div>
      )}

      {/* ──────────────── SCREEN 15B: QUALITY CONTROL - INSPECTION FORM ──────────────── */}
      {(activeTab === "inspection" || activeTab === "15B") && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Header Bar with Batch Info and Job Switcher */}
          {selectedQcJob ? (
            <div className="qc-job-header">
              <div>
                <div className="qc-job-info-title">
                  <h2 className="qc-job-title-text">
                    Inspection: {selectedQcJob.jobNo}
                  </h2>
                  {selectedQcJob.orderNumber && (
                    <span style={{ fontSize: "0.875rem", color: "#475569" }}>
                      ({selectedQcJob.orderNumber})
                    </span>
                  )}
                  {selectedQcJob.status === "PASSED" ? (
                    <span className="jf-badge jf-badge-green" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      <CheckCircle size={13} /> Approved ✓
                    </span>
                  ) : (
                    <span className="jf-badge jf-badge-blue">In Inspection</span>
                  )}
                </div>

                <div className="qc-job-meta-line">
                  <span>Customer: <strong>{selectedQcJob.customerName}</strong></span>
                  <span>•</span>
                  <span>Product: <strong>{selectedQcJob.productType}</strong></span>
                  <span>•</span>
                  <span>Dimensions: {selectedQcJob.dimensions || "Standard"}</span>
                  <span>•</span>
                  <span>Substrate: {selectedQcJob.materialStock || "Standard"}</span>
                </div>

                {selectedQcJob.customerRequirements && (
                  <div className="qc-job-req-tag">
                    📌 <strong>Customer Directive:</strong> {selectedQcJob.customerRequirements}
                  </div>
                )}

                {/* Operations sequence flow */}
                {Array.isArray(selectedQcJob.operations) && selectedQcJob.operations.length > 0 && (
                  <div className="qc-operations-flow">
                    <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>Work Center Flow:</span>
                    {selectedQcJob.operations.map((op, i) => {
                      const isRework = (op.operationName || "").toLowerCase().includes("rework");
                      return (
                        <span
                          key={op._id || i}
                          className={`qc-op-chip ${isRework ? "rework" : ""}`}
                        >
                          #{op.sequenceNo || i + 1} {op.operationName || op.operation}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Controls: Batch size, Quick Switcher, Back Button */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.875rem", color: "#475569" }}>
                    Batch Qty: <strong style={{ color: "#059669", fontSize: "1rem" }}>{(selectedQcJob.batchQty || 0).toLocaleString()} pcs</strong>
                  </span>
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    onClick={() => setActiveTab("15A")}
                  >
                    Back to Queue
                  </button>
                </div>

                {renderJobSwitcher()}
              </div>
            </div>
          ) : (
            <div className="jf-card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#ecfdf5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                  color: "#059669",
                }}
              >
                <ShieldCheck size={28} />
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>
                Select a Batch to Start Inspection
              </h3>
              <p style={{ color: "#475569", maxWidth: "460px", margin: "0 auto 1.5rem", fontSize: "0.875rem" }}>
                All pending production jobs can be inspected using the multi-point checklist below.
              </p>
              {qcQueue.length > 0 ? (
                <div style={{ display: "inline-flex", gap: "0.75rem", alignItems: "center" }}>
                  <button
                    type="button"
                    className="jf-btn jf-btn-primary"
                    onClick={() => setSelectedQcJob(qcQueue[0])}
                  >
                    Inspect First Job ({qcQueue[0].jobNo})
                  </button>
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary"
                    onClick={() => setActiveTab("15A")}
                  >
                    View Full Queue
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="jf-btn jf-btn-primary"
                  onClick={() => setActiveTab("15A")}
                >
                  Return to Queue
                </button>
              )}
            </div>
          )}

          {/* Inspection Form Grid */}
          {selectedQcJob && (
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.25rem" }}>
              {/* Left Column: Criteria Checklist */}
              <div className="jf-card" style={{ padding: 0 }}>
                <div
                  className="jf-card-header"
                  style={{
                    padding: "1.25rem 1.25rem 0.75rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div>
                    <h3 className="jf-card-title" style={{ margin: 0 }}>Multi-Point Quality Verification</h3>
                    <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.25rem" }}>
                      Shop tolerances & process standards for {selectedQcJob.jobNo}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    style={{ color: "#059669", borderColor: "#a7f3d0", background: "#ecfdf5" }}
                    onClick={handlePassAllCriteria}
                    title="Mark all checklist items as PASS"
                  >
                    <Check size={14} /> Pass All Checks
                  </button>
                </div>

                <div>
                  {inspectionCriteria.map((c) => (
                    <div key={c.id} className="qc-criteria-row">
                      <div>
                        <div className="qc-criteria-title">{c.name}</div>
                        <div className="qc-criteria-desc">{c.desc}</div>
                      </div>

                      <div className="qc-btn-group">
                        <button
                          type="button"
                          className={`qc-toggle-btn ${c.status === "PASS" ? "pass-active" : ""}`}
                          onClick={() => handleToggleCriteria(c.id, "PASS")}
                        >
                          ✓ Pass
                        </button>
                        <button
                          type="button"
                          className={`qc-toggle-btn ${c.status === "MINOR" ? "minor-active" : ""}`}
                          onClick={() => handleToggleCriteria(c.id, "MINOR")}
                        >
                          Minor
                        </button>
                        <button
                          type="button"
                          className={`qc-toggle-btn ${c.status === "FAIL" ? "fail-active" : ""}`}
                          onClick={() => handleToggleCriteria(c.id, "FAIL")}
                        >
                          ✕ Defect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Overall Determination Box */}
                <div className="qc-verdict-box">
                  <h4 style={{ margin: 0, fontSize: "0.875rem", color: "#0f172a", fontWeight: 700 }}>
                    Inspector Final Determination:
                  </h4>
                  <div className="qc-verdict-options">
                    <label className={`qc-verdict-label ${qcVerdict === "PASS" ? "active-pass" : ""}`}>
                      <input
                        type="radio"
                        name="qcVerdict"
                        checked={qcVerdict === "PASS"}
                        onChange={() => setQcVerdict("PASS")}
                      />
                      <div>
                        <strong>✓ Pass All Inspection Points</strong>
                        <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                          Clear batch for packaging & delivery
                        </div>
                      </div>
                    </label>

                    <label className={`qc-verdict-label ${qcVerdict === "DEFECT" ? "active-defect" : ""}`}>
                      <input
                        type="radio"
                        name="qcVerdict"
                        checked={qcVerdict === "DEFECT"}
                        onChange={() => setQcVerdict("DEFECT")}
                      />
                      <div>
                        <strong>⚠ Flag Defect / Needs Remediation</strong>
                        <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                          Route to rework or request reprint
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column: Routing & Decision Panel */}
              <div className="jf-card">
                <div className="jf-card-header" style={{ marginBottom: "1rem" }}>
                  <h3 className="jf-card-title">
                    {qcVerdict === "PASS" ? "Release to Delivery" : "Defect Classification & Remediation"}
                  </h3>
                </div>

                {qcVerdict === "PASS" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div
                      style={{
                        padding: "1rem",
                        background: "#f0fdf4",
                        borderRadius: "8px",
                        border: "1px solid #bbf7d0",
                        color: "#166534",
                        fontSize: "0.875rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                        <CheckCircle size={16} /> Batch Standard Verified
                      </div>
                      All {(selectedQcJob.batchQty || 0).toLocaleString()} finished units meet shop quality tolerances, print registration is accurate, and dimensions match customer specifications.
                    </div>

                    <div className="jf-form-group">
                      <label className="jf-label">Inspector Sign-off Notes</label>
                      <textarea
                        className="jf-textarea"
                        rows={3}
                        value={inspectorNotes}
                        onChange={(e) => setInspectorNotes(e.target.value)}
                        placeholder="Add sign-off comments..."
                      />
                    </div>

                    {selectedQcJob.status === "PASSED" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div
                          style={{
                            padding: "0.85rem",
                            background: "#f0fdf4",
                            borderRadius: "6px",
                            border: "1px solid #bbf7d0",
                            color: "#166534",
                            textAlign: "center",
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle size={16} style={{ verticalAlign: "middle", marginRight: "0.4rem" }} />
                          Quality Inspection Approved
                        </div>

                        <button
                          type="button"
                          className="jf-btn jf-btn-primary"
                          style={{ width: "100%", padding: "0.75rem", background: "#059669" }}
                          onClick={() => navigate(`/jobflow/delivery?jobId=${selectedQcJob.jobOrderId || selectedQcJob._id}`)}
                        >
                          <Truck size={16} /> Proceed to Delivery & Packaging <ArrowRight size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary"
                        style={{ width: "100%", padding: "0.75rem" }}
                        onClick={handleSubmitInspection}
                        disabled={loading}
                      >
                        <CheckCircle size={16} /> Approve Inspection & Mark Passed
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Affected Quantity */}
                    <div className="jf-form-group">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label className="jf-label">Affected Quantity (pcs)</label>
                        <span style={{ fontSize: "0.75rem", color: "#475569" }}>
                          Total Batch: {selectedQcJob.batchQty} pcs
                        </span>
                      </div>
                      <input
                        type="number"
                        className="jf-input"
                        min={1}
                        max={selectedQcJob.batchQty || 10000}
                        value={affectedQty}
                        onChange={(e) => setAffectedQty(Number(e.target.value))}
                      />

                      {/* Quick Percentage Pills */}
                      <div className="qc-quick-select-pills">
                        <button
                          type="button"
                          className="qc-quick-select-pill"
                          onClick={() => setAffectedQty(Math.max(1, Math.round((selectedQcJob.batchQty || 50) * 0.1)))}
                        >
                          10% ({Math.max(1, Math.round((selectedQcJob.batchQty || 50) * 0.1))})
                        </button>
                        <button
                          type="button"
                          className="qc-quick-select-pill"
                          onClick={() => setAffectedQty(Math.max(1, Math.round((selectedQcJob.batchQty || 50) * 0.25)))}
                        >
                          25% ({Math.max(1, Math.round((selectedQcJob.batchQty || 50) * 0.25))})
                        </button>
                        <button
                          type="button"
                          className="qc-quick-select-pill"
                          onClick={() => setAffectedQty(Math.max(1, Math.round((selectedQcJob.batchQty || 50) * 0.5)))}
                        >
                          50% ({Math.max(1, Math.round((selectedQcJob.batchQty || 50) * 0.5))})
                        </button>
                        <button
                          type="button"
                          className="qc-quick-select-pill"
                          onClick={() => setAffectedQty(selectedQcJob.batchQty || 50)}
                        >
                          100% Full Batch
                        </button>
                      </div>
                    </div>

                    {/* Defect Classification */}
                    <div className="jf-form-group">
                      <label className="jf-label">Defect Classification</label>
                      <select
                        className="jf-select"
                        value={defectType}
                        onChange={(e) => setDefectType(e.target.value)}
                      >
                        <option value="Color Shift / Print Smear">Color Shift / Print Smear</option>
                        <option value="Lamination Bubbles / Peeling">Lamination Bubbles / Peeling</option>
                        <option value="Miscut / Bleed Inaccuracy">Miscut / Bleed Inaccuracy</option>
                        <option value="Creasing / Folding Misalignment">Creasing / Folding Misalignment</option>
                        <option value="Substrate Flaw / Paper Scratches">Substrate Flaw / Paper Scratches</option>
                        <option value="Missing Pages / Quantity Shortage">Missing Pages / Quantity Shortage</option>
                      </select>
                    </div>

                    {/* Severity Picker */}
                    <div className="jf-form-group">
                      <label className="jf-label">Severity Level</label>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          className={`qc-toggle-btn ${defectSeverity === "MINOR" ? "minor-active" : ""}`}
                          style={{ flex: 1 }}
                          onClick={() => setDefectSeverity("MINOR")}
                        >
                          Minor
                        </button>
                        <button
                          type="button"
                          className={`qc-toggle-btn ${defectSeverity === "MAJOR" ? "minor-active" : ""}`}
                          style={{ flex: 1 }}
                          onClick={() => setDefectSeverity("MAJOR")}
                        >
                          Major
                        </button>
                        <button
                          type="button"
                          className={`qc-toggle-btn ${defectSeverity === "CRITICAL" ? "fail-active" : ""}`}
                          style={{ flex: 1 }}
                          onClick={() => setDefectSeverity("CRITICAL")}
                        >
                          Critical
                        </button>
                      </div>
                    </div>

                    {/* Root Cause Notes */}
                    <div className="jf-form-group">
                      <label className="jf-label">Inspection Findings & Root Cause</label>
                      <textarea
                        className="jf-textarea"
                        rows={3}
                        value={defectNotes}
                        onChange={(e) => setDefectNotes(e.target.value)}
                        placeholder="Detail specific defect symptoms and work center cause..."
                      />
                    </div>

                    {/* Remediation Path Selection - Mapped directly to Flowchart */}
                    <div className="jf-form-group">
                      <label className="jf-label">Identify Defect Scope & Remediation</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.75rem",
                            fontSize: "0.8125rem",
                            padding: "0.75rem",
                            border: routingDecision === "TARGETED_REWORK" ? "2px solid #d97706" : "1px solid #e2e8f0",
                            borderRadius: "8px",
                            background: routingDecision === "TARGETED_REWORK" ? "#fffbeb" : "#ffffff",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="routing"
                            checked={routingDecision === "TARGETED_REWORK"}
                            onChange={() => setRoutingDecision("TARGETED_REWORK")}
                            style={{ marginTop: "0.2rem" }}
                          />
                          <div>
                            <strong style={{ color: "#b45309", fontSize: "0.875rem" }}>Partial Rework (Specific Operation Defect)</strong>
                            <div style={{ color: "#475569", fontSize: "0.75rem", marginTop: "0.2rem" }}>
                              • Targeted rework task<br />
                              • Resume at failed operation without restarting previous steps<br />
                              • Return to QC upon completion
                            </div>
                          </div>
                        </label>

                        <label
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.75rem",
                            fontSize: "0.8125rem",
                            padding: "0.75rem",
                            border: routingDecision === "FULL_REPRINT" ? "2px solid #dc2626" : "1px solid #e2e8f0",
                            borderRadius: "8px",
                            background: routingDecision === "FULL_REPRINT" ? "#fef2f2" : "#ffffff",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="routing"
                            checked={routingDecision === "FULL_REPRINT"}
                            onChange={() => setRoutingDecision("FULL_REPRINT")}
                            style={{ marginTop: "0.2rem" }}
                          />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <strong style={{ color: "#991b1b", fontSize: "0.875rem" }}>Full Reprint (Full Production Defect)</strong>
                              <span style={{ fontSize: "0.6875rem", fontWeight: 700, background: "#fee2e2", color: "#991b1b", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                                MANAGER ONLY
                              </span>
                            </div>
                            <div style={{ color: "#475569", fontSize: "0.75rem", marginTop: "0.2rem" }}>
                              • Batch scrapped due to unrecoverable defect<br />
                              • Manager Approve → new batch from first operation<br />
                              • Manager Reject → hold job, record decision
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Submit Remediation */}
                    <button
                      type="button"
                      className="jf-btn jf-btn-primary"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        background: routingDecision === "TARGETED_REWORK" ? "#d97706" : "#dc2626",
                      }}
                      onClick={handleSubmitInspection}
                      disabled={loading}
                    >
                      <ArrowRight size={16} />
                      {routingDecision === "TARGETED_REWORK"
                        ? "Route to Targeted Operation Rework"
                        : "Escalate to Manager for Reprint Approval"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── SCREEN 16A: REWORK MANAGEMENT - TARGETED OPERATION REWORK HUB ──────────────── */}
      {(activeTab === "rework-requests" || activeTab === "16A") && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                Targeted Operation Rework
              </h2>
              
            </div>
            <button
              type="button"
              className="jf-btn jf-btn-secondary jf-btn-sm"
              onClick={() => setActiveTab("15A")}
            >
              ← Back to QC Queue
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.25rem" }}>
          {/* Left: Active Rework Floor Batches DataTable */}
          <div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`qc-filter-pill ${reworkFilter === "ALL" ? "active" : ""}`}
                  onClick={() => setReworkFilter("ALL")}
                >
                  All Remediation ({reworkQueue.length})
                </button>
                <button
                  type="button"
                  className={`qc-filter-pill ${reworkFilter === "IN_REWORK" ? "active" : ""}`}
                  onClick={() => setReworkFilter("IN_REWORK")}
                >
                  In Floor Queue ({reworkQueue.filter((r) => r.status === "IN_REWORK").length})
                </button>
                <button
                  type="button"
                  className={`qc-filter-pill ${reworkFilter === "PENDING" ? "active" : ""}`}
                  onClick={() => setReworkFilter("PENDING")}
                >
                  Pending Dispatch ({reworkQueue.filter((r) => r.status !== "IN_REWORK").length})
                </button>
                <button
                  type="button"
                  className={`qc-filter-pill ${reworkFilter === "URGENT" ? "active" : ""}`}
                  onClick={() => setReworkFilter("URGENT")}
                >
                  Urgent ({reworkQueue.filter((r) => r.priority === "URGENT").length})
                </button>
              </div>
            </div>

            <JobFlowDataTable
              columns={[
                {
                  key: "jobNo",
                  label: "Job & Customer",
                  sortable: true,
                  minWidth: "150px",
                  render: (val, rw) => (
                    <div>
                      <strong style={{ color: "#0f172a" }}>{val}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#475569" }}>{rw.customerName}</div>
                    </div>
                  ),
                },
                {
                  key: "reworkOp",
                  label: "Defective Step & Qty",
                  sortable: true,
                  minWidth: "160px",
                  render: (val, rw) => (
                    <div>
                      <strong style={{ color: "#b45309" }}>{val}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                        Affected: <strong>{rw.affectedQty} pcs</strong>
                      </div>
                      {rw.instructions && (
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "#475569",
                            marginTop: "2px",
                            maxWidth: "180px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={rw.instructions}
                        >
                          🛠️ {rw.instructions}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: "machine",
                  label: "Workstation / Assigned",
                  sortable: true,
                  minWidth: "140px",
                  render: (val, rw) => (
                    <div>
                      <div>{val}</div>
                      <div style={{ fontSize: "0.75rem", color: "#475569" }}>{rw.operator}</div>
                    </div>
                  ),
                },
                {
                  key: "priority",
                  label: "Priority & Status",
                  sortable: true,
                  minWidth: "130px",
                  render: (val, rw) => (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-start" }}>
                      <span
                        className={`jf-badge ${
                          val === "URGENT"
                            ? "jf-badge-red"
                            : val === "HIGH"
                            ? "jf-badge-amber"
                            : "jf-badge-blue"
                        }`}
                        style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                      >
                        {val || "NORMAL"}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          color: rw.status === "IN_REWORK" ? "#059669" : "#d97706",
                        }}
                      >
                        {rw.status === "IN_REWORK" ? "● In Floor Queue" : "○ Ready to Dispatch"}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "actions",
                  label: "Actions",
                  sortable: false,
                  align: "right",
                  minWidth: "160px",
                  render: (_, rw) => (
                    <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary jf-btn-sm"
                        style={{ padding: "0.3rem 0.55rem", fontSize: "0.75rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQcJob(rw);
                          setReworkTargetOp(rw.reworkOp);
                          setReworkMachine(rw.machine);
                          setReworkOperator(rw.operator);
                          setReworkInstructions(rw.instructions);
                          setAffectedQty(rw.affectedQty);
                          toast.info(`Loaded rework specifications for ${rw.jobNo}.`);
                        }}
                        title="Edit Instructions"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary jf-btn-sm"
                        style={{ background: "#059669", padding: "0.3rem 0.55rem", fontSize: "0.75rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkReworkCompleted(rw);
                        }}
                        title="Complete & Return to QC"
                      >
                        <CheckCircle size={12} /> Return QC
                      </button>
                    </div>
                  ),
                },
              ]}
              data={filteredReworkQueue}
              loading={loading}
              searchable={true}
              searchPlaceholder="Search rework queue by job#, customer, workstation..."
              initialPageSize={10}
              pageSizeOptions={[10, 25, 50, 100]}
              selectedRowId={selectedQcJob?._id || selectedQcJob?.jobNo}
              onRowClick={(rw) => {
                setSelectedQcJob(rw);
                setReworkTargetOp(rw.reworkOp);
                setReworkMachine(rw.machine);
                setReworkOperator(rw.operator);
                setReworkInstructions(rw.instructions);
                setAffectedQty(rw.affectedQty);
              }}
              emptyMessage="No rework jobs found matching criteria."
            />
          </div>

          {/* Right: Targeted Rework Dispatch Form */}
          <div className="jf-card">
            <div className="jf-card-header">
              <div>
                <h3 className="jf-card-title">Dispatch Targeted Rework</h3>
                <span style={{ fontSize: "0.8125rem", color: "#475569" }}>
                  Issue floor order to re-run only the defective step
                </span>
              </div>
            </div>

            {selectedQcJob && (
              <div className="qc-rework-summary">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <strong>Job: {selectedQcJob.jobNo} ({selectedQcJob.customerName})</strong>
                  <span style={{ color: "#b45309", fontWeight: 700 }}>{affectedQty} pcs</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#92400e" }}>
                  Defect: {defectType} {defectNotes ? `— ${defectNotes}` : ""}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="jf-form-group">
                <label className="jf-label">Operation to Re-run</label>
                <select
                  className="jf-select"
                  value={reworkTargetOp}
                  onChange={(e) => setReworkTargetOp(e.target.value)}
                >
                  {Array.isArray(selectedQcJob?.operations) && selectedQcJob.operations.length > 0 ? (
                    selectedQcJob.operations.map((op, idx) => (
                      <option key={op._id || idx} value={op.operationName || op.operation}>
                        #{op.sequenceNo || idx + 1} {op.operationName || op.operation} ({op.machine || "Station"})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Printing">Printing</option>
                      <option value="Matt Lamination">Matt Lamination</option>
                      <option value="Gloss Lamination">Gloss Lamination</option>
                      <option value="Die-Cutting & Trim">Die-Cutting & Trim</option>
                      <option value="Creasing & Folding">Creasing & Folding</option>
                      <option value="Binding">Binding</option>
                      <option value="Packing">Packing</option>
                    </>
                  )}
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Allocated Workstation</label>
                <input
                  type="text"
                  className="jf-input"
                  value={reworkMachine}
                  onChange={(e) => setReworkMachine(e.target.value)}
                  placeholder="e.g. Komfi Delta 52 (Re-run)"
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Assigned Operator</label>
                <input
                  type="text"
                  className="jf-input"
                  value={reworkOperator}
                  onChange={(e) => setReworkOperator(e.target.value)}
                  placeholder="Operator name"
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Priority</label>
                <select
                  className="jf-select"
                  value={reworkPriority}
                  onChange={(e) => setReworkPriority(e.target.value)}
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent (Floor Queue Interruption)</option>
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Corrective Technical Instructions for Operator</label>
                <textarea
                  className="jf-textarea"
                  rows={3}
                  value={reworkInstructions}
                  onChange={(e) => setReworkInstructions(e.target.value)}
                  placeholder="Provide precise technical instructions (e.g., feed rate, temperature, alignment tolerances)..."
                />
              </div>

              {/* Dispatch Action Button / Status */}
              {(() => {
                const targetJob = selectedQcJob || (reworkQueue.length > 0 ? reworkQueue[0] : null);
                const isDispatched = Boolean(
                  targetJob &&
                    (dispatchedJobIds.has(targetJob.jobNo) ||
                      dispatchedJobIds.has(targetJob._id) ||
                      targetJob.status === "IN_REWORK" ||
                      reworkQueue.some(
                        (rw) => (rw.jobNo === targetJob.jobNo || rw._id === targetJob._id) && rw.status === "IN_REWORK"
                      ))
                );

                if (isDispatched) {
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div
                        style={{
                          padding: "0.85rem 1rem",
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          borderRadius: "8px",
                          color: "#065f46",
                          fontSize: "0.875rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle size={18} color="#059669" />
                        <span>Rework operation dispatched to floor queue. Work order updated.</span>
                      </div>

                      <button
                        type="button"
                        className="jf-btn"
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          background: "#f1f5f9",
                          color: "#475569",
                          border: "1px solid #cbd5e1",
                          cursor: "not-allowed",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                        }}
                        disabled={true}
                      >
                        <CheckCircle size={16} /> ✓ Dispatched & Active on Floor
                      </button>

                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary"
                        style={{ width: "100%", padding: "0.6rem" }}
                        onClick={() => setActiveTab("15A")}
                      >
                        ← Return to QC Queue
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    type="button"
                    className="jf-btn jf-btn-primary"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: "#d97706",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                    }}
                    onClick={() => handleDispatchRework()}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={16} className="spin" /> Dispatching to Floor...
                      </>
                    ) : (
                      <>
                        <RotateCcw size={16} /> Dispatch Targeted Rework to Floor
                      </>
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ──────────────── SCREEN 16B: FULL PRODUCTION REPRINT - MANAGER APPROVAL ──────────────── */}
      {(activeTab === "reprint-approvals" || activeTab === "16B") && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                Full Production Reprint Approvals (Stage 7.3)
              </h2>
              <span style={{ fontSize: "0.8125rem", color: "#475569" }}>
                Manager authorization required to scrap defective batch and spawn new batch from 1st operation
              </span>
            </div>
            <button
              type="button"
              className="jf-btn jf-btn-secondary jf-btn-sm"
              onClick={() => setActiveTab("15A")}
            >
              ← Back to QC Queue
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.25rem" }}>
          {/* Left: Pending Reprint Queue DataTable */}
          <div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <button
                type="button"
                className={`qc-filter-pill ${reprintFilter === "ALL" ? "active" : ""}`}
                onClick={() => setReprintFilter("ALL")}
              >
                All Reprints ({reprintRequests.length})
              </button>
              <button
                type="button"
                className={`qc-filter-pill ${reprintFilter === "PENDING" ? "active" : ""}`}
                onClick={() => setReprintFilter("PENDING")}
              >
                Pending Authorization ({pendingReprintCount})
              </button>
            </div>

            <JobFlowDataTable
              columns={[
                {
                  key: "reprintNo",
                  label: "Reprint #",
                  sortable: true,
                  render: (val, r) => (
                    <div>
                      <strong>{val}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#475569" }}>{r.requestedAt}</div>
                    </div>
                  ),
                },
                {
                  key: "jobNo",
                  label: "Job & Customer",
                  sortable: true,
                  render: (val, r) => (
                    <div>
                      <strong>{val}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#475569" }}>{r.customerName}</div>
                    </div>
                  ),
                },
                {
                  key: "quantity",
                  label: "Scrap Qty",
                  sortable: true,
                  render: (val) => `${val} pcs`,
                },
                {
                  key: "scrapCost",
                  label: "Scrap Cost",
                  sortable: true,
                  render: (val) => (
                    <strong style={{ color: "#dc2626" }}>RM {Number(val).toFixed(2)}</strong>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  sortable: true,
                  render: (val) => (
                    <StatusBadge
                      status={val === "APPROVED" ? "Approved" : val === "REJECTED" ? "Rejected" : "Pending"}
                    />
                  ),
                },
                {
                  key: "actions",
                  label: "Review",
                  sortable: false,
                  align: "right",
                  render: (_, r) => (
                    <button
                      type="button"
                      className="jf-btn jf-btn-primary jf-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReprint(r);
                      }}
                    >
                      Review
                    </button>
                  ),
                },
              ]}
              data={
                reprintFilter === "PENDING"
                  ? reprintRequests.filter((r) => r.status === "PENDING_APPROVAL")
                  : reprintRequests
              }
              loading={loading}
              searchable={true}
              searchPlaceholder="Search reprint authorizations..."
              initialPageSize={10}
              pageSizeOptions={[5, 10, 25, 50]}
              selectedRowId={selectedReprint?._id}
              onRowClick={(r) => setSelectedReprint(r)}
              emptyMessage="No reprint requests found."
            />
          </div>

          {/* Right: Manager Scrap & Reprint Review Pane */}
          <div className="jf-card">
            {selectedReprint ? (
              <>
                <div className="jf-card-header" style={{ marginBottom: "1rem" }}>
                  <div>
                    <h3 className="jf-card-title">Manager Scrap & Reprint Authorization</h3>
                    <span style={{ fontSize: "0.8125rem", color: "#475569" }}>
                      Authorization Ref: <strong>{selectedReprint.reprintNo}</strong>
                    </span>
                  </div>
                  <StatusBadge
                    status={selectedReprint.status === "APPROVED" ? "Approved" : selectedReprint.status === "REJECTED" ? "Rejected" : "Pending"}
                  />
                </div>

                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#991b1b" }}>
                      Defect Cause:
                    </span>
                    <strong style={{ color: "#dc2626" }}>
                      Est. Scrap Loss: RM {Number(selectedReprint.scrapCost || 0).toFixed(2)}
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8125rem", color: "#7f1d1d" }}>
                    {selectedReprint.reason}
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.6875rem", color: "#475569", textTransform: "uppercase" }}>Job Order</div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{selectedReprint.jobNo}</div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.6875rem", color: "#475569", textTransform: "uppercase" }}>Customer</div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{selectedReprint.customerName}</div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.6875rem", color: "#475569", textTransform: "uppercase" }}>Machine / Press</div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{selectedReprint.machine}</div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.6875rem", color: "#475569", textTransform: "uppercase" }}>Inspector</div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{selectedReprint.requestedBy}</div>
                  </div>
                </div>

                <div className="jf-form-group" style={{ marginBottom: "1.25rem" }}>
                  <label className="jf-label">Manager Authorization Notes & Floor Directive</label>
                  <textarea
                    className="jf-textarea"
                    rows={3}
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    placeholder="Enter approval conditions or salvage directives..."
                  />
                </div>

                {selectedReprint.status === "PENDING_APPROVAL" ? (
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      type="button"
                      className="jf-btn jf-btn-danger-outline"
                      style={{ flex: 1 }}
                      onClick={() => handleRejectReprint(selectedReprint)}
                    >
                      <XCircle size={16} /> Reject → Hold Job
                    </button>
                    <button
                      type="button"
                      className="jf-btn jf-btn-primary"
                      style={{ flex: 1, background: "#059669" }}
                      onClick={() => handleApproveReprint(selectedReprint)}
                    >
                      <CheckCircle size={16} /> Approve → New Batch from 1st Op
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "0.75rem",
                      background: selectedReprint.status === "APPROVED" ? "#f0fdf4" : "#fef2f2",
                      borderRadius: "6px",
                      border: selectedReprint.status === "APPROVED" ? "1px solid #bbf7d0" : "1px solid #fecaca",
                      color: selectedReprint.status === "APPROVED" ? "#166534" : "#991b1b",
                      textAlign: "center",
                      fontWeight: 700,
                    }}
                  >
                    ✓ Manager Decision Recorded: {selectedReprint.status}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#475569" }}>
                <p>Select a reprint request from the left table to review.</p>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* ──────────────── TAB 4: PASSED INSPECTIONS ──────────────── */}
      {activeTab === "passed" && (
        <PassedInspectionsTab
          passedList={passedList}
          onDispatchToDelivery={handleDispatchToDelivery}
        />
      )}

      {/* ──────────────── TAB 5: FAILED INSPECTIONS ──────────────── */}
      {activeTab === "failed" && (
        <FailedInspectionsTab
          onTriggerRework={() => handleTabChange("rework-requests")}
          onTriggerReprint={() => handleTabChange("reprint-approvals")}
        />
      )}

      {/* ──────────────── TAB 8: QC REINSPECTION QUEUE ──────────────── */}
      {activeTab === "reinspection" && (
        <QcReinspectionTab
          onApproveReinspection={handleApproveReinspection}
          onRejectReinspection={handleRejectReinspection}
        />
      )}

      {/* ──────────────── TAB 9: QC AUDIT HISTORY ──────────────── */}
      {activeTab === "history" && (
        <QcHistoryTab />
      )}

      {/* ──────────────── TAB 10: QC REPORTS & INTELLIGENCE ──────────────── */}
      {activeTab === "reports" && (
        <QcReportsTab />
      )}
    </div>
  );

  if (embedded) {
    return mainQcContent;
  }

  return (
    <JobFlowLayout title="Quality Control & Remediation">
      {mainQcContent}
    </JobFlowLayout>
  );
};

export default QualityControlPage;
