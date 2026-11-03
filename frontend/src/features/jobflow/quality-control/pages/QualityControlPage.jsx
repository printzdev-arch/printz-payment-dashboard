import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  XCircle,
  FileCheck,
  Truck,
  Clock,
  ArrowRight,
  RefreshCw,
  Printer,
  Check,
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

import PassedInspectionsTab from "../components/views/PassedInspectionsTab";
import FailedInspectionsTab from "../components/views/FailedInspectionsTab";
import QcReinspectionTab from "../components/views/QcReinspectionTab";
import QcHistoryTab from "../components/views/QcHistoryTab";
import QcReportsTab from "../components/views/QcReportsTab";

export const DEFECT_CLASSIFICATIONS = [
  "Color Shift / Print Smear",
  "Registration Misalignment / Off-center",
  "Lamination Bubbles / Peeling",
  "Miscut / Bleed Inaccuracy",
  "Creasing / Folding Misalignment",
  "Substrate Flaw / Paper Scratches",
  "Missing Pages / Quantity Shortage",
  "Spot UV / Foil Registration Issue",
  "Binding / Spine Cracking / Stitching Defect",
  "Packaging / Labeling Discrepancy",
  "General Workmanship Defect",
];

export const getDefaultDefectForCriteria = (name = "") => {
  const n = String(name || "").toLowerCase();
  if (n.includes("color") || n.includes("delta") || n.includes("ink") || n.includes("smear")) return "Color Shift / Print Smear";
  if (n.includes("register") || n.includes("align")) return "Registration Misalignment / Off-center";
  if (n.includes("lam") || n.includes("coat") || n.includes("varnish") || n.includes("surface")) return "Lamination Bubbles / Peeling";
  if (n.includes("cut") || n.includes("trim") || n.includes("dimension") || n.includes("square") || n.includes("bleed")) return "Miscut / Bleed Inaccuracy";
  if (n.includes("fold") || n.includes("crease") || n.includes("bind") || n.includes("spine")) return "Creasing / Folding Misalignment";
  if (n.includes("pack") || n.includes("count") || n.includes("quant") || n.includes("page")) return "Missing Pages / Quantity Shortage";
  if (n.includes("substrate") || n.includes("paper") || n.includes("scratch")) return "Substrate Flaw / Paper Scratches";
  if (n.includes("uv") || n.includes("foil") || n.includes("emboss")) return "Spot UV / Foil Registration Issue";
  return "General Workmanship Defect";
};

/* Internal CSS – helper classes used by this page (layout classes live in quality-control.css) */
const QC_INTERNAL_CSS = `
.qc-stack { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
.qc-stack-sm { display: flex; flex-direction: column; gap: .625rem; }
.qc-cell-title { display: block; font-weight: 700; color: #0f172a; }
.qc-cell-sub { font-size: .75rem; color: #475569; margin-top: 2px; }
.qc-cell-clip { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qc-badge { display: inline-flex; align-items: center; gap: .3rem; font-weight: 600; }
.qc-row-actions { display: flex; gap: .35rem; justify-content: flex-end; flex-wrap: wrap; }
.qc-between { display: flex; justify-content: space-between; align-items: center; gap: .75rem; flex-wrap: wrap; }
.qc-card-head { padding: 1.1rem 1.25rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; gap: .75rem; flex-wrap: wrap; }
.qc-card-head .jf-card-title { margin: 0; }
.qc-index { font-size: .75rem; font-weight: 700; color: #64748b; background: #f1f5f9; padding: .2rem .5rem; border-radius: 6px; flex-shrink: 0; }
.qc-criteria-left { display: flex; align-items: center; gap: .75rem; min-width: 0; }
.qc-btn-block { width: 100%; padding: .75rem; display: inline-flex; align-items: center; justify-content: center; gap: .5rem; }
.qc-btn-green { background: #059669 !important; color: #fff !important; }
.qc-btn-amber { background: #d97706 !important; color: #fff !important; }
.qc-btn-red   { background: #dc2626 !important; color: #fff !important; }
.qc-btn-muted { background: #f1f5f9 !important; color: #475569 !important; border: 1px solid #cbd5e1 !important; cursor: not-allowed; }
.qc-btn-pass-all { color: #059669; border-color: #a7f3d0; background: #ecfdf5; }
.qc-notice { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: .8rem 1rem; border-radius: 10px; font-weight: 700; font-size: .875rem; text-align: center; }
.qc-notice.ok  { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
.qc-notice.bad { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
.qc-defect-card { padding: .8rem; border-radius: 10px; display: flex; flex-direction: column; gap: .45rem; }
.qc-defect-card.fail  { border: 1px solid #fecaca; background: #fff5f5; }
.qc-defect-card.minor { border: 1px solid #fde68a; background: #fffbeb; }
.qc-defect-head { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.qc-tag { font-size: .6875rem; font-weight: 700; padding: .15rem .45rem; border-radius: 6px; }
.qc-tag.fail  { background: #fee2e2; color: #991b1b; }
.qc-tag.minor { background: #fef3c7; color: #92400e; }
.qc-tag.manager { background: #fee2e2; color: #991b1b; margin-left: .25rem; }
.qc-field-label { display: block; font-size: .6875rem; color: #64748b; font-weight: 600; margin-bottom: .2rem; }
.qc-field-sm { font-size: .8125rem; padding: .4rem .5rem; height: auto; }
.qc-section-title { display: flex; align-items: center; gap: .4rem; font-weight: 700; color: #b91c1c; font-size: .875rem; }
.qc-route-body strong { font-size: .875rem; }
.qc-route-option.is-rework strong { color: #b45309; }
.qc-route-option.is-reprint strong { color: #991b1b; }
.qc-auto-hint { font-size: .75rem; font-weight: 700; }
.qc-empty { text-align: center; padding: 3rem 1.25rem; }
.qc-empty-icon { width: 56px; height: 56px; border-radius: 50%; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
.qc-empty h3 { font-size: 1.125rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem; }
.qc-empty-actions { display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; }
.qc-reason-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
.qc-reason-box p { margin: .4rem 0 0; font-size: .8125rem; color: #7f1d1d; }
.qc-loss { color: #dc2626; font-weight: 700; }
.qc-status-dot-on { color: #059669; font-size: .7rem; font-weight: 600; }
.qc-status-dot-off { color: #d97706; font-size: .7rem; font-weight: 600; }
.qc-meta-sep { color: #cbd5e1; }
@media (max-width: 640px) {
  .qc-cell-clip { max-width: 140px; }
  .qc-card-head { padding: .9rem 1rem; }
  .qc-empty-actions > * { flex: 1 1 100%; }
}
`;

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
        operationName: typeof f === "string" ? f : f.name || f.code || "Finishing",
      })),
    ];
  }

  if (ops.length === 0) {
    ops = [
      { sequenceNo: 1, operationName: "Printing" },
      { sequenceNo: 2, operationName: "Packing & Bundling" },
    ];
  }

  const criteria = [];
  let criteriaIndex = 1;
  const processedNames = new Set();

  ops.forEach((op) => {
    const name = (op.operationName || op.operation || op.name || op.operationCode || "").trim();
    if (!name) return;
    if (processedNames.has(name.toLowerCase())) return;
    processedNames.add(name.toLowerCase());
    criteria.push({ id: `c${criteriaIndex++}`, name, status: "PASS" });
  });

  return criteria;
};

/* Small presentational helpers */
const Cell = ({ title, sub, clip }) => (
  <div>
    <span className="qc-cell-title">{title}</span>
    {sub ? <div className={`qc-cell-sub ${clip ? "qc-cell-clip" : ""}`} title={clip ? sub : undefined}>{sub}</div> : null}
  </div>
);

const PageHeader = ({ title, onBack }) => (
  <div className="qc-page-header">
    <h2>{title}</h2>
    <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onBack}>
      <ArrowLeft size={14} /> Back to QC Queue
    </button>
  </div>
);

const reprintStatusLabel = (s) => (s === "APPROVED" ? "Approved" : s === "REJECTED" ? "Rejected" : "Pending");

export const QualityControlPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");
  const preselectedOrderId = searchParams.get("orderId");
  const tabParam = searchParams.get("tab");

  const normalizeTab = (t) => {
    if (t === "history" || t === "reports") return "history";
    if (t === "15B" || t === "inspection" || t === "form") return "inspection";
    if (t === "16A" || t === "rework" || t === "rework-requests") return "rework-requests";
    if (t === "16B" || t === "reprints" || t === "reprint" || t === "reprint-approvals") return "reprint-approvals";
    return "overview";
  };

  const [activeTab, setActiveTab] = useState(() => normalizeTab(tabParam));
  const [loading, setLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState(() => {
    if (tabParam === "passed") return "PASSED";
    if (tabParam === "failed") return "REWORK";
    if (tabParam === "incoming" || tabParam === "queue") return "PENDING";
    return "ALL";
  });

  // 15A
  const [qcQueue, setQcQueue] = useState([]);
  const [selectedQcJob, setSelectedQcJob] = useState(null);

  // 15B
  const [inspectionCriteria, setInspectionCriteria] = useState([]);
  const [qcVerdict, setQcVerdict] = useState("PASS");
  const [affectedQty, setAffectedQty] = useState(1);
  const [defectType, setDefectType] = useState("Color Shift / Print Smear");
  const [defectSeverity, setDefectSeverity] = useState("MAJOR");
  const [defectNotes, setDefectNotes] = useState("");
  const [criteriaDefectTypes, setCriteriaDefectTypes] = useState({});
  const [criteriaDefectNotes, setCriteriaDefectNotes] = useState({});

  const flaggedCriteria = useMemo(
    () => inspectionCriteria.filter((c) => c.status === "FAIL" || c.status === "MINOR"),
    [inspectionCriteria]
  );
  const [inspectorNotes, setInspectorNotes] = useState("Quality verified against approved digital proof and shop tolerances.");
  const [routingDecision, setRoutingDecision] = useState("TARGETED_REWORK");

  // 16A
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

  const [selectedRework, setSelectedRework] = useState(null);
  const [reworkQty, setReworkQty] = useState(1);
  const [reworkTargetOp, setReworkTargetOp] = useState("Matt Lamination");
  const [reworkMachine, setReworkMachine] = useState("Floor Workstation 01");
  const [reworkOperator, setReworkOperator] = useState("Production Team");
  const [reworkPriority, setReworkPriority] = useState("URGENT");
  const [reworkInstructions, setReworkInstructions] = useState("");
  const [dispatchedJobIds, setDispatchedJobIds] = useState(new Set());
  const [reworkFilter, setReworkFilter] = useState("ALL");

  // 16B
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
  const [reprintFilter, setReprintFilter] = useState("ALL");

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) {
      if (t === "passed") setQueueFilter("PASSED");
      else if (t === "failed") setQueueFilter("REWORK");
      else if (t === "incoming" || t === "queue") setQueueFilter("PENDING");
      else if (t === "overview" || t === "15A") setQueueFilter("ALL");
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
            operations = poByJobRef.get(poId)?.operations || poByJobRef.get(jobNo)?.operations || [];
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
            ["READY", "DELIVERED", "COMPLETED", "SETTLED"].includes(String(jobObj?.status || "").toUpperCase()) ||
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

        // 2. POs in QC / COMPLETED / QC_ISSUE
        allPos.forEach((po) => {
          const poId = String(po._id || po.id || "");
          const jobObj = po.jobOrderId && typeof po.jobOrderId === "object" ? po.jobOrderId : null;
          const jobNo = jobObj?.jobNo || po.jobNo || `JO-${poId.slice(-6)}`;
          if (
            !seenJobNos.has(poId) &&
            !seenJobNos.has(jobNo) &&
            (po.status === "QC" || po.status === "COMPLETED" || po.status === "QC_ISSUE")
          ) {
            seenJobNos.add(poId);
            seenJobNos.add(jobNo);
            merged.push(formatJobItem(po, jobObj));
          }
        });

        // 3. Job orders
        if (jobOrdersRes.status === "fulfilled" && jobOrdersRes.value) {
          const jobItems =
            jobOrdersRes.value.data?.items ||
            jobOrdersRes.value.data ||
            (Array.isArray(jobOrdersRes.value) ? jobOrdersRes.value : []);
          if (Array.isArray(jobItems)) {
            jobItems.forEach((job) => {
              const jNo = job.jobNo || job.jobNumber || `JO-${(job._id || "").slice(-6)}`;
              const jId = String(job._id || job.id || "");
              if (seenJobNos.has(jNo) || seenJobNos.has(jId)) return;
              seenJobNos.add(jNo);
              seenJobNos.add(jId);

              const matchedPo = poByJobRef.get(jId) || poByJobRef.get(jNo) || null;
              if (matchedPo) {
                merged.push(formatJobItem(matchedPo, job));
                return;
              }

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
            });
          }
        }

        merged.sort((a, b) => {
          const dateA = a.raw?.updatedAt || a.raw?.createdAt || 0;
          const dateB = b.raw?.updatedAt || b.raw?.createdAt || 0;
          return new Date(dateB) - new Date(dateA);
        });

        setQcQueue(merged);

        const targetLookup = preselectedOrderId || preselectedJobId;
        if (targetLookup) {
          const match = merged.find(
            (q) =>
              (preselectedOrderId &&
                (String(q.productionOrderId) === preselectedOrderId || String(q._id) === preselectedOrderId)) ||
              (preselectedJobId &&
                (String(q._id) === preselectedJobId ||
                  q.jobNo === preselectedJobId ||
                  String(q.jobOrderId) === preselectedJobId))
          );
          if (match) {
            setSelectedQcJob(match);
            setActiveTab("15B");
          } else if (merged.length > 0) {
            setSelectedQcJob(merged[0]);
          }
        } else {
          const firstPending = merged.find((q) => q.status === "PENDING_QC") || merged[0] || null;
          setSelectedQcJob((prev) => prev || firstPending);
        }

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
              const rawCost = Number(r.estimatedCost || r.scrapCost || (r.quantity || 20) * 0.45);
              const scrapCost = rawCost > 0 ? rawCost : (r.quantity || 20) * 0.45;

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
            setSelectedReprint((prev) => prev || mappedReprints[0]);
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

  // Sync criteria when selected job changes
  useEffect(() => {
    if (!selectedQcJob) {
      setInspectionCriteria([]);
      return;
    }

    setInspectionCriteria(generateQcCriteria(selectedQcJob));
    setAffectedQty(Math.min(50, selectedQcJob.batchQty || 50));
    setCriteriaDefectTypes({});
    setCriteriaDefectNotes({});
    setRoutingDecision("TARGETED_REWORK");

    const currentOps = selectedQcJob.operations || selectedQcJob.raw?.operations || [];
    if (currentOps.length > 0) {
      const defaultRework =
        currentOps.find((o) => (o.operationName || o.operation || "").toLowerCase().includes("lam")) || currentOps[0];
      if (defaultRework) {
        setReworkTargetOp(defaultRework.operationName || defaultRework.operation || "Printing");
        setReworkMachine(defaultRework.machine || "Floor Station 01");
      }
    } else {
      setReworkTargetOp("Printing");
      setReworkMachine(selectedQcJob.machine || "Digital Press 01");
    }

    setReworkOperator(selectedQcJob.operator || "Floor Technician");
    setQcVerdict("PASS");
  }, [selectedQcJob?._id, selectedQcJob?.jobNo]);

  useEffect(() => {
    if ((activeTab === "inspection" || activeTab === "15B") && !selectedQcJob && qcQueue.length > 0) {
      const firstPending = qcQueue.find((q) => q.status === "PENDING_QC") || qcQueue[0];
      if (firstPending) setSelectedQcJob(firstPending);
    }
  }, [activeTab, qcQueue, selectedQcJob]);

  // Criteria toggle with auto-selection of Partial Rework vs Full Reprint
  const handleToggleCriteria = (id, newStatus) => {
    const target = inspectionCriteria.find((c) => c.id === id);
    if (!target) return;

    if (newStatus !== "PASS") {
      setCriteriaDefectTypes((types) => ({
        ...types,
        [id]: types[id] || getDefaultDefectForCriteria(target.name),
      }));
    }

    const nextList = inspectionCriteria.map((c) => (c.id === id ? { ...c, status: newStatus } : c));
    setInspectionCriteria(nextList);

    const flagged = nextList.filter((c) => c.status !== "PASS");
    if (flagged.length === 0) {
      setQcVerdict("PASS");
      setRoutingDecision("TARGETED_REWORK");
      return;
    }

    setQcVerdict("DEFECT");

    const hasPrintHardDefect = flagged.some((c) => /print/i.test(c.name) && c.status === "FAIL");
    const allOperationsFailed = flagged.length === nextList.length && flagged.every((c) => c.status === "FAIL");

    if (hasPrintHardDefect || allOperationsFailed) {
      setRoutingDecision("FULL_REPRINT");
      setDefectSeverity("CRITICAL");
    } else {
      setRoutingDecision("TARGETED_REWORK");
      setDefectSeverity("MAJOR");
      setReworkTargetOp(flagged[0].name);
    }
  };

  const handlePassAllCriteria = () => {
    setInspectionCriteria((prev) => prev.map((c) => ({ ...c, status: "PASS" })));
    setCriteriaDefectTypes({});
    setCriteriaDefectNotes({});
    setQcVerdict("PASS");
    setRoutingDecision("TARGETED_REWORK");
    toast.info("All checklist items set to PASS.");
  };

  const handleSubmitInspection = async () => {
    if (!selectedQcJob) return;
    setLoading(true);
    const targetId = selectedQcJob.productionOrderId || selectedQcJob._id || selectedQcJob.id;
    const batch = Number(selectedQcJob.batchQty) || 500;

    try {
      if (qcVerdict === "PASS") {
        await jobFlowApi.performQualityCheck(targetId, {
          result: "PASS",
          passed: true,
          quantityChecked: batch,
          acceptedQty: batch,
          rejectedQty: 0,
          notes: inspectorNotes || "Batch verified against all job specifications.",
          comments: inspectorNotes || "Batch verified against all job specifications.",
        });

        toast.success(`Job ${selectedQcJob.jobNo} PASSED inspection! Ready for Delivery.`);
        setQcQueue((prev) => prev.map((q) => (q.jobNo === selectedQcJob.jobNo ? { ...q, status: "PASSED" } : q)));
        setSelectedQcJob((prev) => (prev ? { ...prev, status: "PASSED" } : null));
        return;
      }

      const compiledDefects =
        flaggedCriteria.length > 0
          ? flaggedCriteria
              .map((c) => {
                const type = criteriaDefectTypes[c.id] || getDefaultDefectForCriteria(c.name);
                const note = criteriaDefectNotes[c.id];
                return `${c.name}: ${type}${note ? ` (${note})` : ""}`;
              })
              .join(" | ")
          : defectType;

      const finalDefectSummary = defectNotes ? `${compiledDefects} — ${defectNotes}` : compiledDefects;
      const qty = Number(affectedQty) || 1;

      if (routingDecision === "TARGETED_REWORK") {
        await jobFlowApi.performQualityCheck(targetId, {
          result: "ISSUE",
          passed: false,
          quantityChecked: batch,
          acceptedQty: Math.max(0, batch - qty),
          rejectedQty: qty,
          issueDetails: finalDefectSummary,
          correctiveAction: "REWORK",
          reworkOperationCode: reworkTargetOp || "PRINT",
          comments: defectNotes || compiledDefects || "Targeted rework required",
        });

        const newReworkItem = {
          _id: `rw-${Date.now()}`,
          productionOrderId: selectedQcJob.productionOrderId,
          jobNo: selectedQcJob.jobNo,
          orderNumber: selectedQcJob.orderNumber,
          customerName: selectedQcJob.customerName,
          productType: selectedQcJob.productType,
          reworkOp: reworkTargetOp,
          machine: reworkMachine,
          operator: reworkOperator,
          affectedQty: qty,
          defectSummary: finalDefectSummary,
          instructions: reworkInstructions || `Re-run ${reworkTargetOp} on ${qty} pcs.`,
          priority: reworkPriority,
          status: "PENDING_DISPATCH",
          updatedAt: "Just now",
        };

        setReworkQueue((prev) => [newReworkItem, ...prev]);
        setSelectedRework(newReworkItem);
        setReworkQty(qty);
        setReworkInstructions(newReworkItem.instructions);
        setQcQueue((prev) => prev.map((q) => (q.jobNo === selectedQcJob.jobNo ? { ...q, status: "REWORK_REQUIRED" } : q)));

        toast.warning(`Defects recorded on ${selectedQcJob.jobNo}. Routing to Targeted Operation Rework.`);
        setActiveTab("16A");
      } else {
        await jobFlowApi.performQualityCheck(targetId, {
          result: "ISSUE",
          passed: false,
          quantityChecked: batch,
          acceptedQty: Math.max(0, batch - qty),
          rejectedQty: qty,
          issueDetails: finalDefectSummary,
          correctiveAction: "REPRINT",
          restartFromOperationCode: "PRINT",
          reprintQuantity: qty,
          comments: defectNotes || compiledDefects || "Full reprint requested",
        });

        const newReprintItem = {
          _id: `rep-${Date.now()}`,
          reprintNo: `REP-${String(Date.now()).slice(-6)}`,
          jobNo: selectedQcJob.jobNo,
          customerName: selectedQcJob.customerName,
          product: selectedQcJob.productType,
          quantity: Number(affectedQty) || Number(selectedQcJob.batchQty) || 50,
          scrapCost: ((Number(affectedQty) || 50) * 0.35).toFixed(2),
          reason: finalDefectSummary,
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
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record inspection result.");
    } finally {
      setLoading(false);
    }
  };

  const loadReworkIntoForm = (rw) => {
    setSelectedRework(rw);
    setReworkTargetOp(rw.reworkOp);
    setReworkMachine(rw.machine);
    setReworkOperator(rw.operator);
    setReworkInstructions(rw.instructions || "");
    setReworkPriority(rw.priority || "NORMAL");
    setReworkQty(rw.affectedQty);
  };

  const handleDispatchRework = async () => {
    const jobToDispatch = selectedRework || reworkQueue[0] || null;
    if (!jobToDispatch) {
      toast.error("Please select a rework batch to dispatch.");
      return;
    }

    const jobKey = jobToDispatch.jobNo || jobToDispatch._id;
    if (dispatchedJobIds.has(jobKey) || jobToDispatch.status === "IN_REWORK") {
      toast.info(`Job ${jobKey} is already dispatched and active on the floor.`);
      return;
    }

    const markDispatched = (withInstructions) => {
      setDispatchedJobIds((prev) => new Set([...prev, jobKey]));
      setReworkQueue((prev) =>
        prev.map((rw) =>
          rw.jobNo === jobToDispatch.jobNo || rw._id === jobToDispatch._id
            ? {
                ...rw,
                status: "IN_REWORK",
                machine: reworkMachine,
                operator: reworkOperator,
                priority: reworkPriority,
                ...(withInstructions ? { instructions: reworkInstructions } : {}),
              }
            : rw
        )
      );
      setSelectedRework((prev) => (prev && prev._id === jobToDispatch._id ? { ...prev, status: "IN_REWORK" } : prev));
    };

    setLoading(true);
    try {
      const pId = jobToDispatch.productionOrderId || jobToDispatch._id;
      if (pId) {
        await jobFlowApi.reworkProductionStep(pId, {
          operationName: reworkTargetOp,
          machine: reworkMachine,
          operator: reworkOperator,
          instructions: reworkInstructions,
          quantity: reworkQty,
        });
      }
      toast.success(`Targeted Rework task dispatched for ${jobToDispatch.jobNo} to ${reworkMachine}!`);
      markDispatched(true);
    } catch {
      toast.success(`Targeted Rework dispatched for ${jobToDispatch.jobNo}! Floor work order updated.`);
      markDispatched(false);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReworkCompleted = (rwItem) => {
    toast.success(`Rework on ${rwItem.jobNo} marked COMPLETED. Sent back to QC Queue for re-inspection.`);
    setReworkQueue((prev) => prev.filter((r) => r._id !== rwItem._id));
    setSelectedRework((prev) => (prev?._id === rwItem._id ? null : prev));
    setQcQueue((prev) => prev.map((q) => (q.jobNo === rwItem.jobNo ? { ...q, status: "PENDING_QC" } : q)));

    const matchingQc = qcQueue.find((q) => q.jobNo === rwItem.jobNo);
    if (matchingQc) {
      setSelectedQcJob({ ...matchingQc, status: "PENDING_QC" });
      setActiveTab("15B");
    }
  };

  const handleApproveReprint = async (req) => {
    const markApproved = () => {
      setReprintRequests((prev) => prev.map((r) => (r._id === req._id ? { ...r, status: "APPROVED" } : r)));
      setSelectedReprint((prev) => (prev?._id === req._id ? { ...prev, status: "APPROVED" } : prev));
    };
    try {
      await jobFlowApi.approveReprintRequest(req._id || req.id);
      toast.success(`Reprint Request ${req.reprintNo} APPROVED by Manager! New batch re-issued from first operation.`);
      markApproved();
    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        toast.info(`Reprint ${req.reprintNo} already approved or queued into production.`);
        markApproved();
      } else {
        toast.error(err.response?.data?.message || "Failed to approve reprint request");
      }
    }
  };

  const handleRejectReprint = async (req) => {
    try {
      await jobFlowApi.rejectReprintRequest(req._id || req.id, { reason: managerNotes });
      toast.info(`Reprint Request ${req.reprintNo} rejected by Manager. Job order placed ON HOLD.`);
      setReprintRequests((prev) => prev.map((r) => (r._id === req._id ? { ...r, status: "REJECTED" } : r)));
      setSelectedReprint((prev) => (prev?._id === req._id ? { ...prev, status: "REJECTED" } : prev));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record reprint rejection");
    }
  };

  // KPI metrics
  const pendingInspectionCount = qcQueue.filter((q) => q.status === "PENDING_QC").length;
  const passedTodayCount = qcQueue.filter((q) => q.status === "PASSED").length;
  const reworkRequiredCount = qcQueue.filter((q) => q.status === "REWORK_REQUIRED").length;
  const activeReworkCount = reworkQueue.length;
  const pendingReprintCount = reprintRequests.filter((r) => r.status === "PENDING_APPROVAL").length;
  const totalChecked = passedTodayCount + activeReworkCount;
  const passRatePercentage = totalChecked > 0 ? Math.round((passedTodayCount / totalChecked) * 100) : 0;

  const filteredQcQueue = useMemo(() => {
    if (queueFilter === "PENDING") return qcQueue.filter((q) => q.status === "PENDING_QC");
    if (queueFilter === "PASSED") return qcQueue.filter((q) => q.status === "PASSED");
    if (queueFilter === "REWORK") return qcQueue.filter((q) => q.status === "REWORK_REQUIRED");
    return qcQueue;
  }, [qcQueue, queueFilter]);

  const passedList = useMemo(
    () => qcQueue.filter((q) => q.status === "PASSED" || q.status === "READY_FOR_DELIVERY"),
    [qcQueue]
  );

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
      setQcQueue((prev) => prev.map((q) => (q.jobNo === passedItem.jobNo ? { ...q, status: "READY_FOR_DELIVERY" } : q)));
    } catch (err) {
      toast.info(`Job ${passedItem.jobNo} marked READY_FOR_DELIVERY in local queue.`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReinspection = (reItem) => {
    toast.success(`Rework batch ${reItem.reworkNo} (${reItem.jobNo}) CLEARED reinspection! Released to READY_FOR_DELIVERY.`);
    setQcQueue((prev) => prev.map((q) => (q.jobNo === reItem.jobNo ? { ...q, status: "PASSED" } : q)));
  };

  const handleRejectReinspection = (reItem) => {
    toast.error(`Rework batch ${reItem.reworkNo} failed reinspection. Escalating to Manager for Top-up Reprint.`);
    handleTabChange("reprint-approvals");
  };

  const filteredReworkQueue = useMemo(() => {
    if (reworkFilter === "IN_REWORK") return reworkQueue.filter((r) => r.status === "IN_REWORK");
    if (reworkFilter === "PENDING") return reworkQueue.filter((r) => r.status !== "IN_REWORK");
    if (reworkFilter === "URGENT") return reworkQueue.filter((r) => r.priority === "URGENT");
    return reworkQueue;
  }, [reworkQueue, reworkFilter]);

  const filteredReprints = useMemo(
    () => (reprintFilter === "PENDING" ? reprintRequests.filter((r) => r.status === "PENDING_APPROVAL") : reprintRequests),
    [reprintRequests, reprintFilter]
  );

  const openInspection = (item, viaUrl = false) => {
    setSelectedQcJob(item);
    if (viaUrl) handleTabChange("inspection");
    else setActiveTab("15B");
  };

  /* ───────── Table columns ───────── */
  const qcBaseColumns = [
    {
      key: "jobNo",
      label: "Order & Job #",
      minWidth: "170px",
      sortable: true,
      render: (val) => <Cell title={val}  />,
    },
    { key: "customerName", label: "Customer", sortable: true },
    {
      key: "productType",
      label: "Product & Specs",
      sortable: true,
      render: (val, item) => <Cell title={val} sub={`${item.dimensions} • ${item.materialStock}`} />,
    },
    {
      key: "batchQty",
      label: "Batch Qty",
      sortable: true,
      render: (val) => `${Number(val).toLocaleString()} pcs`,
    },
    {
      key: "machine",
      label: "Workstation",
      sortable: true,
      render: (val, item) => (
        <div>
          <div>{val}</div>
          <div className="qc-cell-sub">{item.operator}</div>
        </div>
      ),
    },
    { key: "completedTime", label: "Time Ready", sortable: true },
  ];

  const qcStatusColumn = {
    key: "status",
    label: "Status",
    sortable: true,
    render: (val) => {
      if (val === "PASSED")
        return (
          <span className="jf-badge jf-badge-green qc-badge">
            <CheckCircle size={12} /> Approved
          </span>
        );
      if (val === "REWORK_REQUIRED")
        return (
          <span className="jf-badge jf-badge-amber qc-badge">
            <RotateCcw size={12} /> In Rework
          </span>
        );
      return (
        <span className="jf-badge jf-badge-amber qc-badge">
          <Clock size={12} /> Pending QC
        </span>
      );
    },
  };

  const queueColumns = [
    ...qcBaseColumns,
    qcStatusColumn,
    {
      key: "actions",
      label: "Action",
      sortable: false,
      align: "right",
      render: (_, item) =>
        item.status === "PASSED" ? (
          <div className="qc-row-actions">
            <button
              type="button"
              className="jf-btn jf-btn-secondary jf-btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                openInspection(item);
              }}
            >
              <FileCheck size={14} /> View QC
            </button>
            <button
              type="button"
              className="jf-btn jf-btn-primary jf-btn-sm qc-btn-green"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  if (jobFlowApi.markReadyForDelivery) {
                    await jobFlowApi.markReadyForDelivery(item.productionOrderId || item._id);
                  }
                } catch (_) {}
                navigate(`/jobflow/delivery?jobId=${item.jobOrderId || item._id}`);
              }}
            >
              <Truck size={14} /> Deliver
            </button>
          </div>
        ) : (
          <div className="qc-row-actions">
            <button
              type="button"
              className="jf-btn jf-btn-primary jf-btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                openInspection(item);
              }}
            >
              <ShieldCheck size={14} /> Inspect
            </button>
          </div>
        ),
    },
  ];

  const incomingColumns = [
    ...qcBaseColumns,
    { key: "status", label: "Status", render: (val) => <StatusBadge status={val} /> },
    {
      key: "actions",
      label: "Action",
      align: "right",
      render: (_, item) => (
        <div className="qc-row-actions">
          <button
            type="button"
            className="jf-btn jf-btn-primary jf-btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              openInspection(item, true);
            }}
          >
            <ShieldCheck size={14} /> Inspect
          </button>
        </div>
      ),
    },
  ];

  const reworkColumns = [
    {
      key: "jobNo",
      label: "Job & Customer",
      sortable: true,
      minWidth: "150px",
      render: (val, rw) => <Cell title={val} sub={rw.customerName} />,
    },
    {
      key: "reworkOp",
      label: "Step & Qty",
      sortable: true,
      minWidth: "170px",
      render: (val, rw) => (
        <div>
          <span className="qc-cell-title" style={{ color: "#b45309" }}>{val}</span>
          <div className="qc-cell-sub">{rw.affectedQty} pcs</div>
          {rw.instructions && (
            <div className="qc-cell-sub qc-cell-clip" title={rw.instructions}>
              {rw.instructions}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "machine",
      label: "Workstation",
      sortable: true,
      minWidth: "140px",
      render: (val, rw) => (
        <div>
          <div>{val}</div>
          <div className="qc-cell-sub">{rw.operator}</div>
        </div>
      ),
    },
    {
      key: "priority",
      label: "Priority & Status",
      sortable: true,
      minWidth: "130px",
      render: (val, rw) => (
        <div style={{ display: "flex", flexDirection: "column", gap: ".25rem", alignItems: "flex-start" }}>
          <span
            className={`jf-badge ${val === "URGENT" ? "jf-badge-red" : val === "HIGH" ? "jf-badge-amber" : "jf-badge-blue"}`}
            style={{ fontSize: ".7rem", padding: "1px 6px" }}
          >
            {val || "NORMAL"}
          </span>
          <span className={rw.status === "IN_REWORK" ? "qc-status-dot-on" : "qc-status-dot-off"}>
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
      minWidth: "170px",
      render: (_, rw) => (
        <div className="qc-row-actions">
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              loadReworkIntoForm(rw);
              toast.info(`Loaded rework specifications for ${rw.jobNo}.`);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="jf-btn jf-btn-primary jf-btn-sm qc-btn-green"
            onClick={(e) => {
              e.stopPropagation();
              handleMarkReworkCompleted(rw);
            }}
          >
            <CheckCircle size={12} /> Return QC
          </button>
        </div>
      ),
    },
  ];

  const reprintColumns = [
    {
      key: "reprintNo",
      label: "Reprint #",
      sortable: true,
      render: (val, r) => <Cell title={val} sub={r.requestedAt} />,
    },
    {
      key: "jobNo",
      label: "Job & Customer",
      sortable: true,
      render: (val, r) => <Cell title={val} sub={r.customerName} />,
    },
    { key: "quantity", label: "Scrap Qty", sortable: true, render: (val) => `${val} pcs` },
    {
      key: "scrapCost",
      label: "Scrap Cost",
      sortable: true,
      render: (val) => <strong className="qc-loss">RM {Number(val).toFixed(2)}</strong>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (val) => <StatusBadge status={reprintStatusLabel(val)} />,
    },
    {
      key: "actions",
      label: "Review",
      sortable: false,
      align: "right",
      render: (_, r) => (
        <div className="qc-row-actions">
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
        </div>
      ),
    },
  ];

  /* Rework form context */
  const activeRework = selectedRework || reworkQueue[0] || null;
  const activeReworkJob = activeRework ? qcQueue.find((q) => q.jobNo === activeRework.jobNo) : null;
  const reworkOps = Array.isArray(activeReworkJob?.operations) ? activeReworkJob.operations : [];
  const isReworkDispatched = Boolean(
    activeRework &&
      (dispatchedJobIds.has(activeRework.jobNo) ||
        dispatchedJobIds.has(activeRework._id) ||
        activeRework.status === "IN_REWORK")
  );

  const batchQtyNum = selectedQcJob?.batchQty || 50;
  const pctQty = (p) => Math.max(1, Math.round(batchQtyNum * p));

  const mainQcContent = (
    <div className="qc-page-wrapper">
      <style>{QC_INTERNAL_CSS}</style>

      {/* ───────── 15A: QUEUE & OVERVIEW ───────── */}
      {(activeTab === "overview" || activeTab === "15A") && (
        <>
          <div className="printz-summary-grid">
            <PrintzKpiCard
              title="Pending Inspection"
              value={pendingInspectionCount}
              icon={<Clock size={20} strokeWidth={2.4} color="#ffffff" />}
              color="orange"
              badge="Awaiting QC"
              onClick={() => setQueueFilter("PENDING")}
            />
            <PrintzKpiCard
              title="First-Pass Yield"
              value={passRatePercentage}
              suffix="%"
              icon={<Percent size={20} strokeWidth={2.4} color="#ffffff" />}
              color="blue"
              badge="Quality Rate"
              onClick={() => setQueueFilter("ALL")}
            />
            <PrintzKpiCard
              title="Passed Today"
              value={passedTodayCount}
              icon={<CheckCircle size={20} strokeWidth={2.4} color="#ffffff" />}
              color="green"
              badge="Ready"
              onClick={() => setQueueFilter("PASSED")}
            />
            <PrintzKpiCard
              title="Targeted Rework"
              value={activeReworkCount}
              icon={<RotateCcw size={20} strokeWidth={2.4} color="#ffffff" />}
              color="teal"
              badge="Floor Re-run"
              onClick={() => setActiveTab("16A")}
            />
            <PrintzKpiCard
              title="Reprint Approvals"
              value={pendingReprintCount}
              icon={<Printer size={20} strokeWidth={2.4} color="#ffffff" />}
              color="pink"
              badge="Manager"
              onClick={() => setActiveTab("16B")}
            />
          </div>

          <div className="qc-filter-bar">
            <div className="qc-filter-pills">
              {[
                ["ALL", `All (${qcQueue.length})`],
                ["PENDING", `Awaiting (${pendingInspectionCount})`],
                ["PASSED", `Passed (${passedTodayCount})`],
                ["REWORK", `Rework (${reworkRequiredCount})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`qc-filter-pill ${queueFilter === key ? "active" : ""}`}
                  onClick={() => setQueueFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={loadQcData}>
              <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
            </button>
          </div>

          <JobFlowDataTable
            columns={queueColumns}
            data={filteredQcQueue}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search by job no, customer or workstation..."
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            emptyMessage="No batches found."
            onRowClick={(item) => openInspection(item, true)}
          />
        </>
      )}

      {/* ───────── INCOMING QUEUE ───────── */}
      {activeTab === "incoming" && (
        <>
          <div className="qc-page-header">
            <h2>Incoming Queue ({pendingInspectionCount})</h2>
            <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={loadQcData}>
              <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
            </button>
          </div>
          <JobFlowDataTable
            columns={incomingColumns}
            data={qcQueue.filter((q) => q.status === "PENDING_QC")}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search by job no, customer or machine..."
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            emptyMessage="No batches awaiting inspection."
            onRowClick={(item) => openInspection(item, true)}
          />
        </>
      )}

      {/* ───────── 15B: INSPECTION FORM ───────── */}
      {(activeTab === "inspection" || activeTab === "15B") && (
        <>
          {selectedQcJob ? (
            <>
              <div className="qc-toolbar">
                <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={() => setActiveTab("15A")}>
                  <ArrowLeft size={14} /> Back to Queue
                </button>
                <span style={{ fontSize: ".875rem", color: "#475569" }}>
                  Batch Qty: <strong style={{ color: "#059669" }}>{(selectedQcJob.batchQty || 0).toLocaleString()} pcs</strong>
                </span>
              </div>

              <div className="qc-job-header">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="qc-job-info-title">
                    <h2 className="qc-job-title-text">{selectedQcJob.jobNo}</h2>
                    {selectedQcJob.status === "PASSED" ? (
                      <span className="jf-badge jf-badge-green qc-badge">
                        <CheckCircle size={13} /> Approved
                      </span>
                    ) : (
                      <span className="jf-badge jf-badge-blue">In Inspection</span>
                    )}
                  </div>

                  <div className="qc-job-meta-line">
                    <span><strong>{selectedQcJob.customerName}</strong></span>
                    <span className="qc-meta-sep">•</span>
                    <span><strong>{selectedQcJob.productType}</strong></span>
                    <span className="qc-meta-sep">•</span>
                    <span>{selectedQcJob.dimensions || "Standard"}</span>
                    <span className="qc-meta-sep">•</span>
                    <span>{selectedQcJob.materialStock || "Standard"}</span>
                  </div>

                  {selectedQcJob.customerRequirements && (
                    <div className="qc-job-req-tag">
                      <strong>Customer Directive:</strong> {selectedQcJob.customerRequirements}
                    </div>
                  )}

                  {Array.isArray(selectedQcJob.operations) && selectedQcJob.operations.length > 0 && (
                    <div className="qc-operations-flow">
                      {selectedQcJob.operations.map((op, i) => {
                        const isRework = (op.operationName || "").toLowerCase().includes("rework");
                        return (
                          <span key={op._id || i} className={`qc-op-chip ${isRework ? "rework" : ""}`}>
                            #{op.sequenceNo || i + 1} {op.operationName || op.operation}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Checklist */}
              <div className="jf-card" style={{ padding: 0 }}>
                <div className="qc-card-head">
                  <h3 className="jf-card-title">Quality Verification</h3>
                  <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm qc-btn-pass-all" onClick={handlePassAllCriteria}>
                    <Check size={14} /> Pass All
                  </button>
                </div>

                <div>
                  {inspectionCriteria.map((c, idx) => (
                    <div key={c.id} className="qc-criteria-row">
                      <div className="qc-criteria-left">
                        <span className="qc-index">#{idx + 1}</span>
                        <div className="qc-criteria-title">{c.name}</div>
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
                          className={`qc-toggle-btn ${c.status === "FAIL" ? "fail-active" : ""}`}
                          onClick={() => handleToggleCriteria(c.id, "FAIL")}
                        >
                          ✕ Defect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="qc-verdict-box">
                  <strong style={{ fontSize: ".875rem", color: "#0f172a" }}>Final Determination</strong>
                  <div className="qc-verdict-options">
                    <label
                      className={`qc-verdict-label ${qcVerdict === "PASS" && flaggedCriteria.length === 0 ? "active-pass" : ""}`}
                      style={flaggedCriteria.length > 0 ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
                    >
                      <input
                        type="radio"
                        name="qcVerdict"
                        disabled={flaggedCriteria.length > 0}
                        checked={qcVerdict === "PASS" && flaggedCriteria.length === 0}
                        onChange={() => flaggedCriteria.length === 0 && setQcVerdict("PASS")}
                      />
                      <strong>✓ Pass</strong>
                    </label>
                    <label className={`qc-verdict-label ${qcVerdict === "DEFECT" ? "active-defect" : ""}`}>
                      <input
                        type="radio"
                        name="qcVerdict"
                        checked={qcVerdict === "DEFECT"}
                        onChange={() => setQcVerdict("DEFECT")}
                      />
                      <strong>⚠ Flag Defect</strong>
                    </label>
                  </div>
                </div>
              </div>

              {/* Decision panel */}
              <div className="jf-card">
                <div className="jf-card-header" style={{ marginBottom: "1rem" }}>
                  <h3 className="jf-card-title">{qcVerdict === "PASS" ? "Release to Delivery" : "Defect & Remediation"}</h3>
                </div>

                {qcVerdict === "PASS" ? (
                  <div className="qc-stack">
                    <div className="jf-form-group">
                      <label className="jf-label">Sign-off Notes</label>
                      <textarea
                        className="jf-textarea"
                        rows={3}
                        value={inspectorNotes}
                        onChange={(e) => setInspectorNotes(e.target.value)}
                        placeholder="Add sign-off comments..."
                      />
                    </div>

                    {selectedQcJob.status === "PASSED" ? (
                      <>
                        <div className="qc-notice ok">
                          <CheckCircle size={16} /> Inspection Approved
                        </div>
                        <button
                          type="button"
                          className="jf-btn jf-btn-primary qc-btn-block qc-btn-green"
                          onClick={() => navigate(`/jobflow/delivery?jobId=${selectedQcJob.jobOrderId || selectedQcJob._id}`)}
                        >
                          <Truck size={16} /> Proceed to Delivery <ArrowRight size={16} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary qc-btn-block"
                        onClick={handleSubmitInspection}
                        disabled={loading}
                      >
                        <CheckCircle size={16} /> Approve & Mark Passed
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="qc-stack">
                    {/* Affected qty */}
                    <div className="jf-form-group">
                      <div className="qc-between">
                        <label className="jf-label" style={{ margin: 0 }}>Affected Quantity (pcs)</label>
                        <span className="qc-cell-sub" style={{ margin: 0 }}>Batch: {selectedQcJob.batchQty} pcs</span>
                      </div>
                      <input
                        type="number"
                        className="jf-input"
                        min={1}
                        max={selectedQcJob.batchQty || 10000}
                        value={affectedQty}
                        onChange={(e) => setAffectedQty(Number(e.target.value))}
                        style={{ marginTop: ".4rem" }}
                      />
                    
                    </div>

                    {/* Defect classification */}
                    {flaggedCriteria.length > 0 ? (
                      <div className="qc-stack-sm">
                        <div className="qc-section-title">
                          <AlertTriangle size={15} /> Defects ({flaggedCriteria.length})
                        </div>
                        {flaggedCriteria.map((c) => {
                          const cur = criteriaDefectTypes[c.id] || getDefaultDefectForCriteria(c.name);
                          return (
                            <div key={c.id} className="qc-defect-card fail">
                              <div className="qc-defect-head">
                                <span className="qc-tag fail">✕ Defect</span>
                                <strong style={{ fontSize: ".8125rem", color: "#0f172a" }}>{c.name}</strong>
                              </div>
                              <div className="qc-defect-fields">
                                <div>
                                  <label className="qc-field-label">Defect Type</label>
                                  <select
                                    className="jf-select qc-field-sm"
                                    value={cur}
                                    onChange={(e) => setCriteriaDefectTypes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                  >
                                    {DEFECT_CLASSIFICATIONS.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="qc-field-label">Notes</label>
                                  <input
                                    type="text"
                                    className="jf-input qc-field-sm"
                                    placeholder="e.g. 2mm off-center"
                                    value={criteriaDefectNotes[c.id] || ""}
                                    onChange={(e) => setCriteriaDefectNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="jf-form-group">
                        <label className="jf-label">Defect Type</label>
                        <select className="jf-select" value={defectType} onChange={(e) => setDefectType(e.target.value)}>
                          {DEFECT_CLASSIFICATIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Severity */}
                    <div className="jf-form-group">
                      <label className="jf-label">Severity</label>
                      <div className="qc-severity-row">
                        {[
                          ["MINOR", "Minor", "minor-active"],
                          ["MAJOR", "Major", "minor-active"],
                          ["CRITICAL", "Critical", "fail-active"],
                        ].map(([key, label, activeCls]) => (
                          <button
                            key={key}
                            type="button"
                            className={`qc-toggle-btn ${defectSeverity === key ? activeCls : ""}`}
                            onClick={() => setDefectSeverity(key)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="jf-form-group">
                      <label className="jf-label">Findings & Root Cause</label>
                      <textarea
                        className="jf-textarea"
                        rows={3}
                        value={defectNotes}
                        onChange={(e) => setDefectNotes(e.target.value)}
                        placeholder="Defect symptoms and cause..."
                      />
                    </div>

                    {/* Remediation */}
                    <div className="jf-form-group">
                      <div className="qc-between" style={{ marginBottom: ".5rem" }}>
                        <label className="jf-label" style={{ margin: 0 }}>Remediation</label>
                        <span className="qc-auto-hint" style={{ color: routingDecision === "FULL_REPRINT" ? "#dc2626" : "#d97706" }}>
                          ⚡ Auto: {routingDecision === "FULL_REPRINT" ? "Full Reprint" : "Partial Rework"}
                        </span>
                      </div>
                      <div className="qc-stack-sm">
                        <label className={`qc-route-option is-rework ${routingDecision === "TARGETED_REWORK" ? "selected" : ""}`}>
                          <input
                            type="radio"
                            name="routing"
                            checked={routingDecision === "TARGETED_REWORK"}
                            onChange={() => setRoutingDecision("TARGETED_REWORK")}
                            style={{ marginTop: ".2rem" }}
                          />
                          <div className="qc-route-body">
                            <strong>Partial Rework</strong>
                            <div className="qc-cell-sub">Re-run failed operation only</div>
                          </div>
                        </label>

                        <label className={`qc-route-option is-reprint ${routingDecision === "FULL_REPRINT" ? "selected" : ""}`}>
                          <input
                            type="radio"
                            name="routing"
                            checked={routingDecision === "FULL_REPRINT"}
                            onChange={() => setRoutingDecision("FULL_REPRINT")}
                            style={{ marginTop: ".2rem" }}
                          />
                          <div className="qc-route-body">
                            <strong>Full Reprint</strong>
                            <span className="qc-tag manager">MANAGER ONLY</span>
                            <div className="qc-cell-sub">Scrap batch, restart from first operation</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`jf-btn jf-btn-primary qc-btn-block ${routingDecision === "TARGETED_REWORK" ? "qc-btn-amber" : "qc-btn-red"}`}
                      onClick={handleSubmitInspection}
                      disabled={loading}
                    >
                      <ArrowRight size={16} />
                      {routingDecision === "TARGETED_REWORK" ? "Route to Rework" : "Escalate for Reprint Approval"}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="jf-card qc-empty">
              <div className="qc-empty-icon">
                <ShieldCheck size={28} />
              </div>
              <h3>Select a Batch to Inspect</h3>
              <div className="qc-empty-actions">
                {qcQueue.length > 0 && (
                  <button type="button" className="jf-btn jf-btn-primary" onClick={() => setSelectedQcJob(qcQueue[0])}>
                    Inspect {qcQueue[0].jobNo}
                  </button>
                )}
                <button type="button" className="jf-btn jf-btn-secondary" onClick={() => setActiveTab("15A")}>
                  View Queue
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ───────── 16A: TARGETED REWORK ───────── */}
      {(activeTab === "rework-requests" || activeTab === "16A") && (
        <>
          <PageHeader title="Targeted Rework" onBack={() => setActiveTab("15A")} />

          <div className="qc-split qc-split-rework">
            <div className="qc-stack">
              <div className="qc-filter-pills">
                {[
                  ["ALL", `All (${reworkQueue.length})`],
                  ["IN_REWORK", `On Floor (${reworkQueue.filter((r) => r.status === "IN_REWORK").length})`],
                  ["PENDING", `Pending (${reworkQueue.filter((r) => r.status !== "IN_REWORK").length})`],
                  ["URGENT", `Urgent (${reworkQueue.filter((r) => r.priority === "URGENT").length})`],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`qc-filter-pill ${reworkFilter === key ? "active" : ""}`}
                    onClick={() => setReworkFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <JobFlowDataTable
                columns={reworkColumns}
                data={filteredReworkQueue}
                loading={loading}
                searchable={true}
                searchPlaceholder="Search by job, customer, workstation..."
                initialPageSize={10}
                pageSizeOptions={[10, 25, 50, 100]}
                selectedRowId={activeRework?._id}
                onRowClick={loadReworkIntoForm}
                emptyMessage="No rework jobs found."
              />
            </div>

            <div className="jf-card">
              <div className="jf-card-header" style={{ marginBottom: "1rem" }}>
                <h3 className="jf-card-title">Dispatch Rework</h3>
              </div>

              {activeRework && (
                <div className="qc-rework-summary">
                  <div className="qc-between">
                    <strong>{activeRework.jobNo} · {activeRework.customerName}</strong>
                    <span style={{ color: "#b45309", fontWeight: 700 }}>{reworkQty} pcs</span>
                  </div>
                  {activeRework.defectSummary && (
                    <div style={{ fontSize: ".75rem", color: "#92400e", marginTop: ".25rem" }}>{activeRework.defectSummary}</div>
                  )}
                </div>
              )}

              <div className="qc-stack">
                <div className="jf-form-group">
                  <label className="jf-label">Operation to Re-run</label>
                  <select className="jf-select" value={reworkTargetOp} onChange={(e) => setReworkTargetOp(e.target.value)}>
                    {reworkOps.length > 0 ? (
                      reworkOps.map((op, idx) => (
                        <option key={op._id || idx} value={op.operationName || op.operation}>
                          #{op.sequenceNo || idx + 1} {op.operationName || op.operation}
                        </option>
                      ))
                    ) : (
                      ["Printing", "Matt Lamination", "Gloss Lamination", "Die-Cutting & Trim", "Creasing & Folding", "Binding", "Packing"].map(
                        (o) => (
                          <option key={o} value={o}>{o}</option>
                        )
                      )
                    )}
                  </select>
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Workstation</label>
                  <input type="text" className="jf-input" value={reworkMachine} onChange={(e) => setReworkMachine(e.target.value)} />
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Operator</label>
                  <input type="text" className="jf-input" value={reworkOperator} onChange={(e) => setReworkOperator(e.target.value)} />
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Priority</label>
                  <select className="jf-select" value={reworkPriority} onChange={(e) => setReworkPriority(e.target.value)}>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Instructions</label>
                  <textarea
                    className="jf-textarea"
                    rows={3}
                    value={reworkInstructions}
                    onChange={(e) => setReworkInstructions(e.target.value)}
                    placeholder="Feed rate, temperature, alignment tolerances..."
                  />
                </div>

                {isReworkDispatched ? (
                  <>
                    <div className="qc-notice ok">
                      <CheckCircle size={16} /> Dispatched & active on floor
                    </div>
                    <button type="button" className="jf-btn jf-btn-secondary qc-btn-block" onClick={() => setActiveTab("15A")}>
                      <ArrowLeft size={14} /> Back to QC Queue
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="jf-btn jf-btn-primary qc-btn-block qc-btn-amber"
                    onClick={handleDispatchRework}
                    disabled={loading || !activeRework}
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={16} className="spin" /> Dispatching...
                      </>
                    ) : (
                      <>
                        <RotateCcw size={16} /> Dispatch to Floor
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ───────── 16B: REPRINT APPROVALS ───────── */}
      {(activeTab === "reprint-approvals" || activeTab === "16B") && (
        <>
          <PageHeader title="Reprint Approvals" onBack={() => setActiveTab("15A")} />

          <div className="qc-split qc-split-reprint">
            <div className="qc-stack">
              <div className="qc-filter-pills">
                <button
                  type="button"
                  className={`qc-filter-pill ${reprintFilter === "ALL" ? "active" : ""}`}
                  onClick={() => setReprintFilter("ALL")}
                >
                  All ({reprintRequests.length})
                </button>
                <button
                  type="button"
                  className={`qc-filter-pill ${reprintFilter === "PENDING" ? "active" : ""}`}
                  onClick={() => setReprintFilter("PENDING")}
                >
                  Pending ({pendingReprintCount})
                </button>
              </div>

              <JobFlowDataTable
                columns={reprintColumns}
                data={filteredReprints}
                loading={loading}
                searchable={true}
                searchPlaceholder="Search reprint requests..."
                initialPageSize={10}
                pageSizeOptions={[5, 10, 25, 50]}
                selectedRowId={selectedReprint?._id}
                onRowClick={(r) => setSelectedReprint(r)}
                emptyMessage="No reprint requests found."
              />
            </div>

            <div className="jf-card">
              {selectedReprint ? (
                <>
                  <div className="jf-card-header qc-between" style={{ marginBottom: "1rem" }}>
                    <div>
                      <h3 className="jf-card-title">{selectedReprint.reprintNo}</h3>
                    </div>
                    <StatusBadge status={reprintStatusLabel(selectedReprint.status)} />
                  </div>

                  <div className="qc-reason-box">
                    <div className="qc-between">
                      <strong style={{ color: "#991b1b", fontSize: ".875rem" }}>Defect Cause</strong>
                      <span className="qc-loss">RM {Number(selectedReprint.scrapCost || 0).toFixed(2)}</span>
                    </div>
                    <p>{selectedReprint.reason}</p>
                  </div>

                  <div className="qc-info-grid">
                    {[
                      ["Job Order", selectedReprint.jobNo],
                      ["Customer", selectedReprint.customerName],
                      ["Machine", selectedReprint.machine],
                      ["Inspector", selectedReprint.requestedBy],
                    ].map(([label, value]) => (
                      <div key={label} className="qc-info-cell">
                        <div className="label">{label}</div>
                        <div className="value">{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="jf-form-group" style={{ marginBottom: "1.25rem" }}>
                    <label className="jf-label">Manager Notes</label>
                    <textarea
                      className="jf-textarea"
                      rows={3}
                      value={managerNotes}
                      onChange={(e) => setManagerNotes(e.target.value)}
                      placeholder="Approval conditions or salvage directives..."
                    />
                  </div>

                  {selectedReprint.status === "PENDING_APPROVAL" ? (
                    <div className="qc-action-row">
                      <button type="button" className="jf-btn jf-btn-danger-outline" onClick={() => handleRejectReprint(selectedReprint)}>
                        <XCircle size={16} /> Reject
                      </button>
                      <button type="button" className="jf-btn jf-btn-primary qc-btn-green" onClick={() => handleApproveReprint(selectedReprint)}>
                        <CheckCircle size={16} /> Approve
                      </button>
                    </div>
                  ) : (
                    <div className={`qc-notice ${selectedReprint.status === "APPROVED" ? "ok" : "bad"}`}>
                      Decision Recorded: {selectedReprint.status}
                    </div>
                  )}
                </>
              ) : (
                <div className="qc-empty">Select a request to review.</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ───────── Sub-views ───────── */}
      {activeTab === "passed" && (
        <PassedInspectionsTab passedList={passedList} onDispatchToDelivery={handleDispatchToDelivery} />
      )}

      {activeTab === "failed" && (
        <FailedInspectionsTab
          onTriggerRework={() => handleTabChange("rework-requests")}
          onTriggerReprint={() => handleTabChange("reprint-approvals")}
        />
      )}

      {activeTab === "reinspection" && (
        <QcReinspectionTab
          onApproveReinspection={handleApproveReinspection}
          onRejectReinspection={handleRejectReinspection}
        />
      )}

      {activeTab === "history" && <QcHistoryTab />}
      {activeTab === "reports" && <QcReportsTab />}
    </div>
  );

  if (embedded) return mainQcContent;

  return <JobFlowLayout title="Quality Control & Remediation">{mainQcContent}</JobFlowLayout>;
};

export default QualityControlPage;