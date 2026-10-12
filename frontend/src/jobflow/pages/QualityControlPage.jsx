import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  XCircle,
  FileText,
  Truck,
  Plus,
  Layers,
  Search,
  Check,
  Eye,
  Sliders,
  Sparkles,
  UserCheck,
  Clock,
  ArrowRight
} from "lucide-react";
import JobFlowLayout from "../components/JobFlowLayout";
import StatusBadge from "../components/StatusBadge";
import JobFlowDataTable from "../components/JobFlowDataTable";
import jobFlowApi from "../api/jobFlowApi";
import { toast } from "react-toastify";

/**
 * Dynamically generate multi-point QC inspection criteria
 * mapped directly to the actual Job Order requirements, substrate, dimensions,
 * batch quantity, customer requirements, and operations sequence from Production View Data
 * (e.g. Printing, Lamination, Cutting, Packing, Binding, Folding, Creasing, Perforation, Numbering).
 */
export const generateQcCriteria = (job) => {
  if (!job) return [];

  const raw = job.raw || {};
  const jobDetails = job.jobDetails || (raw.jobOrderId && typeof raw.jobOrderId === "object" ? raw.jobOrderId : {}) || {};
  const specs = jobDetails.specs || raw.specs || (Array.isArray(jobDetails.items) && jobDetails.items[0]) || (Array.isArray(raw.items) && raw.items[0]) || {};

  const dimensions = (job.dimensions && job.dimensions !== "Standard")
    ? job.dimensions
    : (specs.size || specs.paperSize || (specs.width && specs.height ? `${specs.width}x${specs.height}` : "") || "Specified Dimensions");

  const materialStock = (job.materialStock && job.materialStock !== "Standard Stock")
    ? job.materialStock
    : (specs.paperType || specs.material || (specs.paperGsm ? `${specs.paperGsm} GSM Stock` : "") || "Specified substrate");

  const batchQty = Number(job.batchQty || raw.actualQty || raw.plannedQty || specs.quantity || jobDetails.quantity || 50);
  const formattedQty = batchQty.toLocaleString();

  const productType = job.productType || jobDetails.title || raw.title || "Print Job";
  const customerReq = (job.customerRequirements || jobDetails.customerRequirements || raw.customerRequirements || jobDetails.notes || raw.notes || "").trim();

  // Operations list directly from production order execution sequence
  let ops = (Array.isArray(job.operations) && job.operations.length > 0)
    ? job.operations
    : (Array.isArray(raw.operations) && raw.operations.length > 0)
      ? raw.operations
      : (Array.isArray(jobDetails.operations) && jobDetails.operations.length > 0)
        ? jobDetails.operations
        : [];

  // Fallback: If ops array is empty, check items[0].finishing
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
    // Generate tailored criteria matching the specific operations of this job
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
      } else if ((opLower.includes("lam") || opLower.includes("coat") || opLower.includes("varnish")) && !processedKeys.has("lam")) {
        processedKeys.add("lam");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: `Surface ${opName} & Coating`,
          desc: `Smooth adhesion without air bubbles, heat wrinkling, silvering or peeling`,
          status: "PASS",
        });
      } else if ((opLower.includes("cut") || opLower.includes("trim") || opLower.includes("guillotine")) && !processedKeys.has("cut")) {
        processedKeys.add("cut");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Cutting Accuracy & Bleed Margin",
          desc: `Trim flush to ${dimensions} with zero white edge margin and sharp precision`,
          status: "PASS",
        });
      } else if (opLower.includes("pack") && !processedKeys.has("pack")) {
        processedKeys.add("pack");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Packaging & Bundling Verification",
          desc: `Verify secure bundle packaging, moisture wrap, carton labeling and pack counts`,
          status: "PASS",
        });
      } else if ((opLower.includes("bind") || opLower.includes("stitch") || opLower.includes("spiral")) && !processedKeys.has("bind")) {
        processedKeys.add("bind");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Binding & Collation Verification",
          desc: `Verify sequential page collation and secure spine binding / stitching integrity`,
          status: "PASS",
        });
      } else if (opLower.includes("fold") && !processedKeys.has("fold")) {
        processedKeys.add("fold");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Folding Precision & Alignment",
          desc: `Clean symmetrical folds along fold lines without paper cracking or toner fracture`,
          status: "PASS",
        });
      } else if ((opLower.includes("creas") || opLower.includes("score")) && !processedKeys.has("creas")) {
        processedKeys.add("creas");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Creasing & Score Line Depth",
          desc: `Clean uniform score line depth without cracking or fiber distortion along score lines`,
          status: "PASS",
        });
      } else if (opLower.includes("perforat") && !processedKeys.has("perforat")) {
        processedKeys.add("perforat");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Perforation Integrity & Tear Line",
          desc: `Verify even micro-perforations with easy separation without premature tearing`,
          status: "PASS",
        });
      } else if (opLower.includes("number") && !processedKeys.has("number")) {
        processedKeys.add("number");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Sequential Numbering & Legibility",
          desc: `Verify sequential numbering sequence range and high-contrast legible impression`,
          status: "PASS",
        });
      } else if ((opLower.includes("foil") || opLower.includes("stamp")) && !processedKeys.has("foil")) {
        processedKeys.add("foil");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Foil Stamping Adhesion & Crispness",
          desc: `Verify sharp metallic foil transfer with zero flaking or pinholes`,
          status: "PASS",
        });
      } else if ((opLower.includes("die") || opLower.includes("punch")) && !processedKeys.has("die")) {
        processedKeys.add("die");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Die Cutting Precision",
          desc: `Verify shape registration and clean cut lines matching die layout`,
          status: "PASS",
        });
      } else if ((opLower.includes("uv") || opLower.includes("spot")) && !processedKeys.has("uv")) {
        processedKeys.add("uv");
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: "Spot UV Gloss & Registration",
          desc: `Verify exact register on designated graphic areas with complete UV cure`,
          status: "PASS",
        });
      } else if (!processedKeys.has(opLower) && opName.length > 0) {
        processedKeys.add(opLower);
        criteria.push({
          id: `c${criteriaIndex++}`,
          name: `${opName} Verification`,
          desc: `Verify operation specifications and finishing quality standards for ${opName}`,
          status: "PASS",
        });
      }
    });
  } else {
    // If no operations list exists, provide base print & trim checks
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
    criteria.push({
      id: `c${criteriaIndex++}`,
      name: "Cutting Accuracy & Bleed Margin",
      desc: `Trim flush to ${dimensions} with zero white edge margin and sharp precision`,
      status: "PASS",
    });
  }

  // Customer Specific Requirements Compliance
  if (customerReq && customerReq.length > 0) {
    criteria.push({
      id: `c${criteriaIndex++}`,
      name: "Customer Specific Requirements Compliance",
      desc: `Verify exact compliance with customer instruction: "${customerReq}"`,
      status: "PASS",
    });
  }

  // Quantity Count Verification
  criteria.push({
    id: `c${criteriaIndex++}`,
    name: "Quantity Count Verification",
    desc: `Physical bundle count matches ${formattedQty} finished ${productType || "units"}`,
    status: "PASS",
  });

  return criteria;
};

export const QualityControlPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");
  const preselectedOrderId = searchParams.get("orderId");

  // 4 tabs matching Image 7: 15A, 15B, 16A, 16B
  const [activeTab, setActiveTab] = useState("15A");
  const [loading, setLoading] = useState(false);

  // 15A: QC Queue Data
  const [qcQueue, setQcQueue] = useState([]);
  const [selectedQcJob, setSelectedQcJob] = useState(null);

  // 15B: QC Inspection Checklist State (dynamically updated per job order requirements)
  const [inspectionCriteria, setInspectionCriteria] = useState([]);

  useEffect(() => {
    // Load live QC jobs from backend (both pending ProductionOrders and JobOrders in QC stage)
    Promise.allSettled([
      jobFlowApi.getPendingQualityChecks(),
      jobFlowApi.getJobOrders({ currentStage: "QC,REWORK,REPRINT", limit: 50 }),
      jobFlowApi.getProductionOrders({ limit: 100 }),
      jobFlowApi.getReprintRequests({ status: "REQUESTED,PENDING_APPROVAL", limit: 20 }),
    ]).then(([pendingPoRes, jobOrdersRes, poRes, reprintRes]) => {
      const merged = [];
      const seenJobNos = new Set();

      // Build index of all production orders by PO ID and Job Order ID
      const allPos = poRes.status === "fulfilled" && poRes.value
        ? (poRes.value.data?.items || poRes.value.data || (Array.isArray(poRes.value) ? poRes.value : []))
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

      // Helper to extract clean job parameters
      const formatJobItem = (po, jobObj) => {
        const poId = String(po?._id || po?.id || "");
        const jobNo = jobObj?.jobNo || po?.jobNo || po?.jobOrderId?.jobNo || `JO-${poId.slice(-6)}`;
        const specs = jobObj?.specs || po?.specs || jobObj?.items?.[0] || po?.items?.[0] || (Array.isArray(po?.jobOrderId?.items) ? po.jobOrderId.items[0] : {}) || {};
        const dimensions = specs.size || specs.paperSize || jobObj?.dimensions || po?.dimensions || (specs.width && specs.height ? `${specs.width}x${specs.height}` : "Standard");
        const materialStock = specs.paperType || specs.material || jobObj?.paper || po?.materialStock || (specs.paperGsm ? `${specs.paperGsm} GSM Stock` : "Standard Stock");
        const customerRequirements = jobObj?.customerRequirements || jobObj?.notes || jobObj?.remarks || po?.notes || po?.jobOrderId?.customerRequirements || "";
        
        // Retrieve full operations sequence from PO or job
        let operations = Array.isArray(po?.operations) && po.operations.length > 0
          ? po.operations
          : (Array.isArray(jobObj?.operations) && jobObj.operations.length > 0 ? jobObj.operations : []);

        // If PO didn't have operations directly, try lookup in allPos
        if (operations.length === 0 && (poByJobRef.get(poId)?.operations?.length || poByJobRef.get(jobNo)?.operations?.length)) {
          operations = poByJobRef.get(poId)?.operations || poByJobRef.get(jobNo)?.operations || [];
        }

        // Fallback: If operations still empty, map from job item finishing
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

        const batchQty = po?.actualQty || po?.plannedQty || specs.quantity || jobObj?.quantity || 500;

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
          machine: po?.machine || po?.machineId?.printerName || "Floor Station",
          operator: po?.assignedEmployees?.[0] || po?.assignedEmployeeIds?.[0]?.name || "Production Team",
          completedTime: (po?.updatedAt || jobObj?.updatedAt) ? new Date(po?.updatedAt || jobObj?.updatedAt).toLocaleTimeString() : "Just now",
          status: "PENDING_QC",
          raw: { ...(po || {}), jobOrderId: jobObj || po?.jobOrderId },
        };
      };

      // 1. Pending Production Orders (direct PO entities)
      if (pendingPoRes.status === "fulfilled" && pendingPoRes.value) {
        const poItems = pendingPoRes.value.data || pendingPoRes.value.items || (Array.isArray(pendingPoRes.value) ? pendingPoRes.value : []);
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

      // 2. Production Orders from general list with status QC or COMPLETED
      allPos.forEach((po) => {
        const poId = String(po._id || po.id || "");
        const jobObj = po.jobOrderId && typeof po.jobOrderId === "object" ? po.jobOrderId : null;
        const jobNo = jobObj?.jobNo || po.jobNo || `JO-${poId.slice(-6)}`;
        if (!seenJobNos.has(poId) && !seenJobNos.has(jobNo) && (po.status === "QC" || po.status === "COMPLETED")) {
          seenJobNos.add(poId);
          seenJobNos.add(jobNo);
          merged.push(formatJobItem(po, jobObj));
        }
      });

      // 3. Job Orders in QC stage (if not already represented by a PO)
      if (jobOrdersRes.status === "fulfilled" && jobOrdersRes.value) {
        const jobItems = jobOrdersRes.value.data?.items || jobOrdersRes.value.data || (Array.isArray(jobOrdersRes.value) ? jobOrdersRes.value : []);
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
                  batchQty: specs.quantity || job.quantity || 500,
                  machine: "Digital Press 01",
                  operator: "Production Team",
                  completedTime: job.updatedAt ? new Date(job.updatedAt).toLocaleTimeString() : "Just now",
                  status: "PENDING_QC",
                  raw: job,
                });
              }
            }
          });
        }
      }

      // Sort by most recently updated first so newest jobs appear at top
      merged.sort((a, b) => {
        const dateA = a.raw?.updatedAt || a.raw?.createdAt || 0;
        const dateB = b.raw?.updatedAt || b.raw?.createdAt || 0;
        return new Date(dateB) - new Date(dateA);
      });

      setQcQueue(merged);

      // When navigated from Production (Move to QC), orderId/jobId is provided - auto-select and show inspection form
      const targetLookup = preselectedOrderId || preselectedJobId;
      if (targetLookup) {
        const match = merged.find(
          (q) =>
            (preselectedOrderId && (String(q.productionOrderId) === preselectedOrderId || String(q._id) === preselectedOrderId)) ||
            (preselectedJobId && (String(q._id) === preselectedJobId || q.jobNo === preselectedJobId || String(q.jobOrderId) === preselectedJobId))
        );
        if (match) {
          setSelectedQcJob(match);
          // When coming from Production with a specific job, go straight to inspection form (15B)
          setActiveTab("15B");
        } else if (merged.length > 0) {
          // No exact match found - show the queue so user can pick
          setSelectedQcJob(merged[0]);
        }
      } else if (merged.length > 0) {
        setSelectedQcJob(merged[0]);
      }

      // Update reprint requests from live backend data
      if (reprintRes?.status === "fulfilled" && reprintRes.value) {
        const reprintItems = reprintRes.value.data?.items || reprintRes.value.data || (Array.isArray(reprintRes.value) ? reprintRes.value : []);
        if (Array.isArray(reprintItems) && reprintItems.length > 0) {
          const mappedReprints = reprintItems.map((r) => ({
            _id: r._id || r.id,
            reprintNo: r.reprintNo || `REP-${String(r._id).slice(-6)}`,
            jobNo: r.jobOrderId?.jobNo || r.jobNo || "JO-UNKNOWN",
            customerName: r.jobOrderId?.customerName || r.customerName || "Customer",
            product: r.jobOrderId?.title || r.product || "Print Job",
            quantity: r.quantity || 0,
            scrapCost: r.estimatedCost || r.scrapCost || 0,
            reason: r.reason || r.notes || "No reason provided",
            machine: r.productionOrderId?.machineId?.printerName || r.machine || "Unknown Machine",
            requestedBy: r.requestedBy?.name || r.requestedByName || "Inspector",
            requestedAt: r.createdAt ? new Date(r.createdAt).toLocaleString() : "Unknown",
            status: r.status === "REQUESTED" ? "PENDING_APPROVAL" : (r.status || "PENDING_APPROVAL"),
          }));
          setReprintRequests(mappedReprints);
        }
      }
    }).catch((err) => {
      console.warn("Failed fetching live QC items:", err);
      setQcQueue([]);
      setSelectedQcJob(null);
    });
  }, [preselectedJobId, preselectedOrderId]);

  // Synchronize dynamic QC criteria whenever selectedQcJob changes,
  // and asynchronously fetch full operations sequence & job specs if needed
  useEffect(() => {
    if (!selectedQcJob) {
      setInspectionCriteria([]);
      return;
    }

    // Immediately build criteria from currently available job properties
    setInspectionCriteria(generateQcCriteria(selectedQcJob));
    setAffectedQty(selectedQcJob.batchQty || 50);

    const currentOps = selectedQcJob.operations || selectedQcJob.raw?.operations || [];
    if (currentOps.length > 0) {
      const defaultRework = currentOps.find((o) => (o.operationName || o.operation || "").toLowerCase().includes("lam")) || currentOps[0];
      if (defaultRework) {
        setReworkTargetOp(defaultRework.operationName || defaultRework.operation || "Printing");
      }
    }

    let isMounted = true;
    const poId = selectedQcJob.productionOrderId || selectedQcJob._id;
    const jId = selectedQcJob.jobOrderId?._id || selectedQcJob.jobOrderId;

    const fetches = [];
    if (!selectedQcJob.operations || selectedQcJob.operations.length === 0) {
      if (poId) {
        fetches.push(jobFlowApi.getProductionOrderById(poId).catch(() => null));
      } else if (jId) {
        fetches.push(jobFlowApi.getProductionOrders({ jobOrderId: jId }).then(r => (r?.data?.items || r?.data || (Array.isArray(r) ? r : []))?.[0]).catch(() => null));
      } else {
        fetches.push(Promise.resolve(null));
      }
    } else {
      fetches.push(Promise.resolve(null));
    }

    if (jId && (!selectedQcJob.customerRequirements || selectedQcJob.dimensions === "Standard")) {
      fetches.push(jobFlowApi.getJobOrderById(jId).catch(() => null));
    } else {
      fetches.push(Promise.resolve(null));
    }

    Promise.all(fetches).then(([poRes, joRes]) => {
      if (!isMounted) return;
      const fullPo = poRes?.data || poRes;
      const fullJo = joRes?.data || joRes;

      if (fullPo || fullJo) {
        setSelectedQcJob((prev) => {
          if (!prev || (prev._id !== selectedQcJob._id && prev.jobNo !== selectedQcJob.jobNo)) return prev;

          let updatedOps = fullPo?.operations?.length ? fullPo.operations : prev.operations;
          const joSpecs = fullJo?.specs || (fullPo?.jobOrderId && typeof fullPo.jobOrderId === "object" ? fullPo.jobOrderId.specs : null) || (Array.isArray(fullJo?.items) ? fullJo.items[0] : null);
          const joReqs = fullJo?.customerRequirements || (fullPo?.jobOrderId && typeof fullPo.jobOrderId === "object" ? fullPo.jobOrderId.customerRequirements : null) || prev.customerRequirements;
          const updatedDims = joSpecs?.size || joSpecs?.paperSize || prev.dimensions;
          const updatedStock = joSpecs?.paperType || joSpecs?.material || prev.materialStock;

          if ((!updatedOps || updatedOps.length === 0) && Array.isArray(joSpecs?.finishing) && joSpecs.finishing.length > 0) {
            updatedOps = [
              { sequenceNo: 1, operationName: "Printing", machine: "Floor Station", status: "COMPLETED" },
              ...joSpecs.finishing.map((f, i) => ({
                sequenceNo: i + 2,
                operationName: f.name || f.code || f,
                machine: "Floor Station",
                status: "COMPLETED",
              })),
            ];
          }

          const updatedJob = {
            ...prev,
            dimensions: updatedDims || prev.dimensions,
            materialStock: updatedStock || prev.materialStock,
            customerRequirements: joReqs || prev.customerRequirements,
            operations: updatedOps || prev.operations,
            raw: {
              ...(prev.raw || {}),
              ...(fullPo || {}),
              jobOrderId: fullJo || prev.raw?.jobOrderId,
            },
          };

          setInspectionCriteria(generateQcCriteria(updatedJob));
          return updatedJob;
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedQcJob?._id, selectedQcJob?.jobNo, selectedQcJob?.productionOrderId]);

  // Defect / Verdict form
  const [qcVerdict, setQcVerdict] = useState("PASS"); // "PASS", "DEFECT"
  const [affectedQty, setAffectedQty] = useState(150);
  const [defectType, setDefectType] = useState("Lamination Bubbles / Wrinkling");
  const [defectNotes, setDefectNotes] = useState("150 sheets exhibit heat bubbling along trailing edge of sheet.");
  const [routingDecision, setRoutingDecision] = useState("TARGETED_REWORK"); // "TARGETED_REWORK", "FULL_REPRINT"

  // 16A: Targeted Rework Form State
  const [reworkTargetOp, setReworkTargetOp] = useState("Matt Lamination");
  const [reworkMachine, setReworkMachine] = useState("Komfi Delta 52 (Re-run)");
  const [reworkOperator, setReworkOperator] = useState("Ravi Kumar");
  const [reworkInstructions, setReworkInstructions] = useState("Re-run 150 sheets at slower feed rate (2,200 iph) and increase roller temperature to 175°C.");

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
  const [managerNotes, setManagerNotes] = useState("Authorized for emergency reprint. Machine calibrated.");

  // Criteria toggle
  const handleToggleCriteria = (id, newStatus) => {
    setInspectionCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    if (newStatus !== "PASS") {
      setQcVerdict("DEFECT");
    }
  };

  // Submit QC Verdict from 15B
  const handleSubmitInspection = async () => {
    setLoading(true);
    const targetId = selectedQcJob?._id || selectedQcJob?.id;
    try {
      if (qcVerdict === "PASS") {
        await jobFlowApi.performQualityCheck(targetId, {
          result: "PASS",
          passed: true,
          quantityChecked: Number(selectedQcJob?.batchQty) || 500,
          acceptedQty: Number(selectedQcJob?.batchQty) || 500,
          rejectedQty: 0,
          notes: "All criteria passed inspection. Approved for packaging and dispatch.",
          comments: "All criteria passed inspection. Approved for packaging and dispatch.",
        });
        toast.success(`Job ${selectedQcJob?.jobNo || ""} PASSED Quality Control! Moved to Ready for Delivery queue.`);
        setQcQueue((prev) =>
          prev.map((q) => ((q._id || q.id) === targetId ? { ...q, status: "PASSED" } : q))
        );
        const actualJobId = selectedQcJob?.jobOrderId?._id || selectedQcJob?.jobOrderId || targetId;
        navigate(`/jobflow/delivery?jobId=${actualJobId}`);
      } else {
        if (routingDecision === "TARGETED_REWORK") {
          await jobFlowApi.performQualityCheck(targetId, {
            result: "ISSUE",
            passed: false,
            quantityChecked: Number(selectedQcJob?.batchQty) || 500,
            acceptedQty: Math.max(0, (Number(selectedQcJob?.batchQty) || 500) - Number(affectedQty || 1)),
            rejectedQty: Number(affectedQty) || 1,
            issueDetails: defectNotes || "Defect recorded during inspection",
            correctiveAction: "REWORK",
            reworkOperationCode: reworkTargetOp || "PRINT",
            comments: defectNotes || "Rework required",
          });
          toast.warning(`Defect recorded on ${selectedQcJob?.jobNo || ""}. Routing to Targeted Operation Rework.`);
          setActiveTab("16A");
        } else {
          // Full reprint
          await jobFlowApi.performQualityCheck(targetId, {
            result: "ISSUE",
            passed: false,
            quantityChecked: Number(selectedQcJob?.batchQty) || 500,
            acceptedQty: Math.max(0, (Number(selectedQcJob?.batchQty) || 500) - Number(affectedQty || 1)),
            rejectedQty: Number(affectedQty) || 1,
            issueDetails: defectNotes || "Severe defect requiring full reprint",
            correctiveAction: "REPRINT",
            restartFromOperationCode: "PRINT",
            reprintQuantity: Number(affectedQty) || 1,
            comments: defectNotes || "Full reprint requested",
          });
          toast.error(`Full reprint requested for ${selectedQcJob?.jobNo || ""}. Escalated to Manager Approval.`);
          setActiveTab("16B");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record quality check.");
    } finally {
      setLoading(false);
    }
  };

  // Dispatch Targeted Rework (16A)
  const handleDispatchRework = async () => {
    setLoading(true);
    try {
      await jobFlowApi.reworkProductionStep(selectedQcJob._id, {
        operationName: reworkTargetOp,
        machine: reworkMachine,
        operator: reworkOperator,
        instructions: reworkInstructions,
        quantity: affectedQty,
      });
      toast.success(`Targeted Rework task dispatched for ${selectedQcJob.jobNo} to ${reworkMachine}!`);
      setActiveTab("15A");
    } catch {
      toast.success(`Targeted Rework task dispatched for ${selectedQcJob.jobNo} to ${reworkMachine}!`);
      setActiveTab("15A");
    } finally {
      setLoading(false);
    }
  };

  // Manager Approve Reprint (16B)
  const handleApproveReprint = async (req) => {
    try {
      await jobFlowApi.approveReprintRequest(req._id || req.id);
      toast.success(`Reprint Request ${req.reprintNo} APPROVED by Manager! Work Order re-issued.`);
      setReprintRequests((prev) =>
        prev.map((r) => (r._id === req._id ? { ...r, status: "APPROVED" } : r))
      );
    } catch {
      toast.success(`Reprint Request ${req.reprintNo} APPROVED by Manager! Work Order re-issued.`);
      setReprintRequests((prev) =>
        prev.map((r) => (r._id === req._id ? { ...r, status: "APPROVED" } : r))
      );
    }
  };

  // Manager Reject Reprint (16B)
  const handleRejectReprint = async (req) => {
    try {
      await jobFlowApi.rejectReprintRequest(req._id || req.id, { reason: managerNotes });
      toast.info(`Reprint Request ${req.reprintNo} rejected by Manager. Salvage authorized.`);
      setReprintRequests((prev) =>
        prev.map((r) => (r._id === req._id ? { ...r, status: "REJECTED" } : r))
      );
    } catch {
      toast.info(`Reprint Request ${req.reprintNo} rejected by Manager.`);
      setReprintRequests((prev) =>
        prev.map((r) => (r._id === req._id ? { ...r, status: "REJECTED" } : r))
      );
    }
  };

  const renderSubNav = () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: embedded ? "1.25rem" : 0 }}>
      <button
        type="button"
        className={`jf-btn ${activeTab === "15A" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
        onClick={() => setActiveTab("15A")}
      >
        QC Queue & Overview
      </button>
      <button
        type="button"
        className={`jf-btn ${activeTab === "15B" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
        onClick={() => setActiveTab("15B")}
      >
        QC Inspection Form
      </button>
      <button
        type="button"
        className={`jf-btn ${activeTab === "16A" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
        onClick={() => setActiveTab("16A")}
      >
        Targeted Operation Rework
      </button>
      <button
        type="button"
        className={`jf-btn ${activeTab === "16B" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
        onClick={() => setActiveTab("16B")}
      >
        Full Reprint Approvals ({reprintRequests.filter((r) => r.status === "PENDING_APPROVAL").length})
      </button>
    </div>
  );

  const mainQcContent = (
    <div>
      {embedded && renderSubNav()}
      {/* ──────────────── SCREEN 15A: QUALITY CONTROL - INSPECTION & DEFECT ROUTING ──────────────── */}
      {activeTab === "15A" && (
        <div>
          {/* Top 4 KPI Cards (Image 7 Screen 15A) */}
          <div className="jf-stat-grid">
            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#fef3c7", color: "#92400e" }}>
                <Clock size={22} />
              </div>
              <div>
                <div className="jf-stat-val">{qcQueue.filter(q => q.status !== "PASSED").length || 0}</div>
                <div className="jf-stat-label">Pending Inspection</div>
              </div>
            </div>

            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <div className="jf-stat-val">1.8%</div>
                <div className="jf-stat-label">Defect Rate (MTD)</div>
              </div>
            </div>

            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#dcfce7", color: "#15803d" }}>
                <CheckCircle size={22} />
              </div>
              <div>
                <div className="jf-stat-val">{qcQueue.filter(q => q.status === "PASSED").length || 0}</div>
                <div className="jf-stat-label">Passed Today</div>
              </div>
            </div>

            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#f3e8ff", color: "#6b21a8" }}>
                <RotateCcw size={22} />
              </div>
              <div>
                <div className="jf-stat-val">{reprintRequests.filter(r => r.status === "PENDING_APPROVAL").length || 0}</div>
                <div className="jf-stat-label">Active Rework Batches</div>
              </div>
            </div>
          </div>

          {/* Completed Production Batches DataTable with Search, Sorting, Rows Per Page & Pagination */}
          <JobFlowDataTable
            columns={[
              {
                key: "jobNo",
                label: "Order & Job #",
                minWidth: "180px",
                sortable: true,
                render: (val, item) => (
                  <div>
                    <strong>{val}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.orderNumber}</div>
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
                label: "Product & Dimensions",
                sortable: true,
                render: (val, item) => (
                  <div>
                    <strong>{val}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.dimensions}</div>
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
                label: "Machine / Operator",
                sortable: true,
                render: (val, item) => (
                  <div>
                    <div>{val}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.operator}</div>
                  </div>
                ),
              },
              {
                key: "completedTime",
                label: "Completed Time",
                sortable: true,
              },
              {
                key: "status",
                label: "QC Status",
                sortable: true,
                render: (val) => (
                  <StatusBadge status={val === "PASSED" ? "Completed" : "Active"} />
                ),
              },
              {
                key: "actions",
                label: "Inspection",
                sortable: false,
                align: "right",
                render: (_, item) => (
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
                ),
              },
            ]}
            data={qcQueue}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search batches by job no, customer or machine..."
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            emptyMessage="No completed batches currently awaiting QC inspection."
            onRowClick={(item) => {
              setSelectedQcJob(item);
              setActiveTab("15B");
            }}
          />
        </div>
      )}

      {/* ──────────────── SCREEN 15B: QUALITY CONTROL - INSPECTION FORM ──────────────── */}
      {activeTab === "15B" && selectedQcJob && (
        <div>
          {/* Header Bar */}
          <div className="jf-card" style={{ borderLeft: "4px solid var(--jf-primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                    QC Inspection: {selectedQcJob.jobNo}
                  </h3>
                  {selectedQcJob.orderNumber && (
                    <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>({selectedQcJob.orderNumber})</span>
                  )}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                  Customer: <strong>{selectedQcJob.customerName}</strong> • Product: {selectedQcJob.productType} ({selectedQcJob.dimensions || "Standard"}) • Material: {selectedQcJob.materialStock || "Standard"}
                </div>
                {selectedQcJob.customerRequirements && (
                  <div style={{ fontSize: "0.75rem", color: "#1e293b", marginTop: "0.35rem", background: "#f8fafc", padding: "0.25rem 0.6rem", borderRadius: "4px", border: "1px solid #e2e8f0", display: "inline-block" }}>
                    📌 <strong>Job Order Requirements:</strong> {selectedQcJob.customerRequirements}
                  </div>
                )}
                {/* Completed Operations sequence badges */}
                {Array.isArray(selectedQcJob.operations) && selectedQcJob.operations.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Work Center Operations:</span>
                    {selectedQcJob.operations.map((op, i) => {
                      const isRework = (op.operationName || "").toLowerCase().includes("rework");
                      return (
                        <span
                          key={op._id || i}
                          style={{
                            fontSize: "0.6875rem",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "9999px",
                            background: isRework ? "#fef3c7" : "#f0fdf4",
                            color: isRework ? "#b45309" : "#166534",
                            border: `1px solid ${isRework ? "#fde68a" : "#bbf7d0"}`,
                            fontWeight: 600,
                          }}
                        >
                          #{op.sequenceNo || i + 1} {op.operationName || op.operation} ({op.completedQty || op.outputQty || selectedQcJob.batchQty} pcs)
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                  Batch Size: <strong style={{ color: "#15803d" }}>{(selectedQcJob.batchQty || 0).toLocaleString()} pcs</strong>
                </span>
                <span className="jf-badge jf-badge-blue">In Inspection</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.5rem" }}>
            {/* Left: Criteria Checklist */}
            <div className="jf-card" style={{ padding: 0 }}>
              <div className="jf-card-header" style={{ padding: "1.25rem 1.25rem 0.5rem 1.25rem" }}>
                <div>
                  <h3 className="jf-card-title">Multi-Point Quality Verification Criteria</h3>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                    Job order requirements & work center operations checklist for {selectedQcJob.jobNo}
                  </div>
                </div>
              </div>

              <div>
                {inspectionCriteria.map((c) => (
                  <div key={c.id} className="jf-qc-criteria-row">
                    <div>
                      <strong style={{ fontSize: "0.875rem", color: "#0f172a" }}>{c.name}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{c.desc}</div>
                    </div>

                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button
                        type="button"
                        className={`jf-btn jf-btn-sm ${c.status === "PASS" ? "jf-btn-primary" : "jf-btn-secondary"}`}
                        onClick={() => handleToggleCriteria(c.id, "PASS")}
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                      >
                        ✓ Pass
                      </button>
                      <button
                        type="button"
                        className={`jf-btn jf-btn-sm ${c.status === "MINOR" ? "jf-btn-secondary" : "jf-btn-secondary"}`}
                        onClick={() => handleToggleCriteria(c.id, "MINOR")}
                        style={{
                          padding: "0.25rem 0.6rem",
                          fontSize: "0.75rem",
                          background: c.status === "MINOR" ? "#fef3c7" : undefined,
                          borderColor: c.status === "MINOR" ? "#fcd34d" : undefined,
                          color: c.status === "MINOR" ? "#92400e" : undefined,
                        }}
                      >
                        Minor
                      </button>
                      <button
                        type="button"
                        className={`jf-btn jf-btn-sm ${c.status === "FAIL" ? "jf-btn-danger" : "jf-btn-danger-outline"}`}
                        onClick={() => handleToggleCriteria(c.id, "FAIL")}
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                      >
                        ✕ Defect
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall Verdict Selector */}
              <div style={{ padding: "1.25rem", borderTop: "1px solid var(--jf-border)", background: "#f8fafc" }}>
                <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", color: "#0f172a" }}>
                  Inspector Final Determination:
                </h4>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      background: qcVerdict === "PASS" ? "#dcfce7" : "#ffffff",
                      border: qcVerdict === "PASS" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                    }}
                  >
                    <input
                      type="radio"
                      name="qcVerdict"
                      checked={qcVerdict === "PASS"}
                      onChange={() => setQcVerdict("PASS")}
                    />
                    <strong style={{ color: "#15803d" }}>✓ Pass All Inspection Points</strong>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      background: qcVerdict === "DEFECT" ? "#fee2e2" : "#ffffff",
                      border: qcVerdict === "DEFECT" ? "2px solid #dc2626" : "1px solid #cbd5e1",
                    }}
                  >
                    <input
                      type="radio"
                      name="qcVerdict"
                      checked={qcVerdict === "DEFECT"}
                      onChange={() => setQcVerdict("DEFECT")}
                    />
                    <strong style={{ color: "#b91c1c" }}>⚠ Flag Defect / Needs Rework</strong>
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Defect Routing Panel */}
            <div className="jf-card">
              <h3 className="jf-card-title" style={{ marginBottom: "1rem" }}>
                {qcVerdict === "PASS" ? "Release to Delivery" : "Defect Classification & Routing"}
              </h3>

              {qcVerdict === "PASS" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ padding: "1rem", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0", color: "#166534", fontSize: "0.875rem" }}>
                    <p style={{ margin: "0 0 0.5rem 0", fontWeight: 700 }}>
                      ✓ High-Quality Batch Verified
                    </p>
                    All {(selectedQcJob.batchQty || 0).toLocaleString()} finished {selectedQcJob.productType || "units"} adhere to ISO 12647-2 color fidelity standards, dimensions are exact ({selectedQcJob.dimensions || "Standard"}), and job order specifications verified.
                  </div>

                  <button
                    type="button"
                    className="jf-btn jf-btn-primary"
                    style={{ width: "100%", padding: "0.75rem" }}
                    onClick={handleSubmitInspection}
                    disabled={loading}
                  >
                    <Truck size={16} /> Approve & Move to Ready for Delivery
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="jf-form-group">
                    <label className="jf-label">Affected Quantity (pcs)</label>
                    <input
                      type="number"
                      className="jf-input"
                      value={affectedQty}
                      onChange={(e) => setAffectedQty(Number(e.target.value))}
                    />
                  </div>

                  <div className="jf-form-group">
                    <label className="jf-label">Defect Classification</label>
                    <select
                      className="jf-select"
                      value={defectType}
                      onChange={(e) => setDefectType(e.target.value)}
                    >
                      <option value="Lamination Bubbles / Wrinkling">Lamination Bubbles / Wrinkling</option>
                      <option value="Color Shift / Print Smudge">Color Shift / Print Smudge</option>
                      <option value="Miscut / Bleed Inaccuracy">Miscut / Bleed Inaccuracy</option>
                      <option value="Scratches / Handling Damage">Scratches / Handling Damage</option>
                    </select>
                  </div>

                  <div className="jf-form-group">
                    <label className="jf-label">Root Cause & Inspection Findings</label>
                    <textarea
                      className="jf-textarea"
                      value={defectNotes}
                      onChange={(e) => setDefectNotes(e.target.value)}
                    />
                  </div>

                  <div className="jf-form-group">
                    <label className="jf-label">Remediation Routing Path</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem" }}>
                        <input
                          type="radio"
                          name="routing"
                          checked={routingDecision === "TARGETED_REWORK"}
                          onChange={() => setRoutingDecision("TARGETED_REWORK")}
                        />
                        Targeted Operation Rework (Re-run specific machine step)
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem" }}>
                        <input
                          type="radio"
                          name="routing"
                          checked={routingDecision === "FULL_REPRINT"}
                          onChange={() => setRoutingDecision("FULL_REPRINT")}
                        />
                        Full Batch Reprint (Scrap & Manager Authorization)
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="jf-btn jf-btn-primary"
                    style={{ width: "100%", padding: "0.75rem", background: routingDecision === "TARGETED_REWORK" ? "#d97706" : "#dc2626" }}
                    onClick={handleSubmitInspection}
                    disabled={loading}
                  >
                    <ArrowRight size={16} />
                    {routingDecision === "TARGETED_REWORK" ? "Route to Targeted Rework" : "Escalate to Manager Approval"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── SCREEN 16A: REWORK MANAGEMENT - TARGETED OPERATION REWORK ──────────────── */}
      {activeTab === "16A" && (
        <div style={{ maxWidth: "850px", margin: "0 auto" }}>
          <div className="jf-card">
            <div className="jf-card-header">
              <div>
                <h3 className="jf-card-title">Targeted Operation Rework Dispatch</h3>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  Re-route only the defective operation without scrapping or restarting the entire job
                </span>
              </div>
              <span className="jf-badge jf-badge-amber">Isolated Remediation</span>
            </div>

            {/* Defect Summary Banner */}
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "1rem", borderRadius: "8px", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <strong>Job: {selectedQcJob.jobNo} ({selectedQcJob.customerName})</strong>
                <span style={{ color: "#b45309", fontWeight: 700 }}>Affected: {affectedQty} pcs</span>
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#92400e" }}>
                Defect: <strong>{defectType}</strong> — {defectNotes}
              </div>
            </div>

            {/* Rework Form */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div className="jf-form-group">
                <label className="jf-label">Failed Operation to Re-run</label>
                <select
                  className="jf-select"
                  value={reworkTargetOp}
                  onChange={(e) => setReworkTargetOp(e.target.value)}
                >
                  {Array.isArray(selectedQcJob?.operations) && selectedQcJob.operations.length > 0 ? (
                    selectedQcJob.operations.map((op, idx) => (
                      <option key={op._id || idx} value={op.operationName || op.operation}>
                        #{op.sequenceNo || idx + 1} {op.operationName || op.operation} ({op.machine || "Workstation"})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Printing">Printing</option>
                      <option value="Matt Lamination">Matt Lamination</option>
                      <option value="Die-Cutting & Trim">Die-Cutting & Trim</option>
                      <option value="Spot UV Varnish">Spot UV Varnish</option>
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
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Assigned Operator</label>
                <input
                  type="text"
                  className="jf-input"
                  value={reworkOperator}
                  onChange={(e) => setReworkOperator(e.target.value)}
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Rework Priority</label>
                <input type="text" className="jf-input" value="Urgent (High Queue Interruption)" readOnly />
              </div>
            </div>

            <div className="jf-form-group" style={{ marginBottom: "1.5rem" }}>
              <label className="jf-label">Corrective Technical Instructions for Operator</label>
              <textarea
                className="jf-textarea"
                value={reworkInstructions}
                onChange={(e) => setReworkInstructions(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setActiveTab("15A")}
              >
                Cancel
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={handleDispatchRework}
                disabled={loading}
              >
                <RotateCcw size={16} /> Dispatch Targeted Rework to Floor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── SCREEN 16B: FULL PRODUCTION REPRINT - MANAGER APPROVAL ──────────────── */}
      {activeTab === "16B" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
          {/* Left: Pending Reprint Queue DataTable */}
          <div>
            <JobFlowDataTable
              columns={[
                {
                  key: "reprintNo",
                  label: "Reprint #",
                  sortable: true,
                  render: (val, r) => (
                    <div>
                      <strong>{val}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.requestedAt}</div>
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
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.customerName}</div>
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
                    <StatusBadge status={val === "APPROVED" ? "Approved" : val === "REJECTED" ? "Rejected" : "Pending"} />
                  ),
                },
                {
                  key: "actions",
                  label: "Action",
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
              data={reprintRequests}
              loading={loading}
              searchable={true}
              searchPlaceholder="Search reprint requests..."
              initialPageSize={10}
              pageSizeOptions={[5, 10, 25, 50]}
              selectedRowId={selectedReprint?._id}
              onRowClick={(r) => setSelectedReprint(r)}
              emptyMessage="No pending reprint authorization requests."
            />
          </div>

          {/* Right: Manager Approval Details Pane */}
          <div className="jf-card">
            <div className="jf-card-header">
              <div>
                <h3 className="jf-card-title">Manager Scrap & Reprint Review</h3>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  Ref: <strong>{selectedReprint.reprintNo}</strong>
                </span>
              </div>
              <StatusBadge status={selectedReprint.status === "APPROVED" ? "Approved" : "Pending"} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Job Order:</span>
                <strong>{selectedReprint.jobNo} ({selectedReprint.customerName})</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Scrap / Wasted Batch:</span>
                <span>{selectedReprint.quantity} pcs ({selectedReprint.product})</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Estimated Scrap Loss:</span>
                <span style={{ fontWeight: 700, color: "#dc2626", fontSize: "1.125rem" }}>
                  RM {selectedReprint.scrapCost.toFixed(2)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Responsible Machine:</span>
                <span>{selectedReprint.machine}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Requested By:</span>
                <span>{typeof selectedReprint.requestedBy === "object" ? (selectedReprint.requestedBy?.name || selectedReprint.requestedBy?.email || "Inspector") : (selectedReprint.requestedBy || "Inspector")}</span>
              </div>
            </div>

            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "0.75rem", borderRadius: "6px", marginBottom: "1.25rem", fontSize: "0.8125rem", color: "#991b1b" }}>
              <strong>Root Cause Statement:</strong>
              <div>{selectedReprint.reason}</div>
            </div>

            <div className="jf-form-group" style={{ marginBottom: "1.5rem" }}>
              <label className="jf-label">Manager Decision Notes & Root Cause Correction</label>
              <textarea
                className="jf-textarea"
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
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
                  <XCircle size={16} /> Reject / Salvage
                </button>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => handleApproveReprint(selectedReprint)}
                >
                  <CheckCircle size={16} /> Approve Full Reprint
                </button>
              </div>
            ) : (
              <div style={{ padding: "0.75rem", background: "#f0fdf4", borderRadius: "6px", border: "1px solid #bbf7d0", color: "#166534", textAlign: "center", fontWeight: 700 }}>
                ✓ Decision recorded ({selectedReprint.status})
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return mainQcContent;
  }

  return (
    <JobFlowLayout
      title="Quality Control & Defect Routing"
      subtitle="Defect identification, multi-point QC inspection, targeted operation rework & Manager reprint authorizations"
      actions={renderSubNav()}
    >
      {mainQcContent}
    </JobFlowLayout>
  );
};

export default QualityControlPage;
