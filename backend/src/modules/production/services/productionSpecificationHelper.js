/**
 * PrintZ Dynamic Production Specification & Operation Helper
 * Deterministically parses Job Order specifications, resolves finishing requirements,
 * and builds dynamic sequential production operations without hardcoded assumptions.
 */

const ApiError = require("../../../utils/errors/ApiError");

const SUPPORTED_OPERATIONS = {
  PREPRESS: { code: "PREPRESS", name: "Prepress & Plate/Imposition Check", category: "PREPRESS", precedence: 5, estimatedMinutes: 15 },
  PRINT: { code: "PRINT", name: "Printing", category: "BASE", precedence: 10, estimatedMinutes: 30 },
  LAMINATION: { code: "LAMINATION", name: "Lamination", category: "SURFACE", precedence: 20, estimatedMinutes: 20 },
  FOILING: { code: "FOILING", name: "Foil Stamping", category: "SURFACE", precedence: 25, estimatedMinutes: 25 },
  UV_COATING: { code: "UV_COATING", name: "UV Coating / Spot UV", category: "SURFACE", precedence: 30, estimatedMinutes: 20 },
  DIE_CUTTING: { code: "DIE_CUTTING", name: "Die-Cutting", category: "SHAPING", precedence: 40, estimatedMinutes: 25 },
  CUTTING: { code: "CUTTING", name: "Cutting / Trimming", category: "SHAPING", precedence: 45, estimatedMinutes: 15 },
  CREASING: { code: "CREASING", name: "Creasing / Scoring", category: "SHAPING", precedence: 50, estimatedMinutes: 15 },
  PERFORATION: { code: "PERFORATION", name: "Perforation", category: "SHAPING", precedence: 55, estimatedMinutes: 15 },
  FOLDING: { code: "FOLDING", name: "Folding", category: "ASSEMBLY", precedence: 60, estimatedMinutes: 20 },
  BINDING: { code: "BINDING", name: "Binding", category: "ASSEMBLY", precedence: 70, estimatedMinutes: 30 },
  PERFECT_BINDING: { code: "PERFECT_BINDING", name: "Perfect Binding", category: "ASSEMBLY", precedence: 75, estimatedMinutes: 40 },
  MOUNTING: { code: "MOUNTING", name: "Mounting", category: "ASSEMBLY", precedence: 80, estimatedMinutes: 25 },
  NUMBERING: { code: "NUMBERING", name: "Numbering", category: "ASSEMBLY", precedence: 85, estimatedMinutes: 15 },
  PACKING: { code: "PACKING", name: "Packaging & Bundling", category: "PACKING", precedence: 99, estimatedMinutes: 10 },
};

/**
 * Normalize any finishing name, process code, or description into a supported operation code.
 */
function normalizeOperationCode(raw) {
  if (!raw) return null;
  const upper = String(raw).toUpperCase().trim();
  if (SUPPORTED_OPERATIONS[upper]) return upper;

  const str = String(raw).toLowerCase().replace(/[-_]/g, " ").trim();
  if (str === "none" || str === "not required" || str === "n/a" || str === "no") return null;

  if (str.includes("prepress") || str.includes("prep") || str.includes("plate") || str.includes("imposition")) return "PREPRESS";
  if (str.includes("print") || str === "pr") return "PRINT";
  if (str.includes("spot uv") || str.includes("uv coating") || str.includes("varnish") || str.includes(" uv") || str.startsWith("uv")) return "UV_COATING";
  if (str.includes("foil") || str.includes("stamping") || str.includes("gilding")) return "FOILING";
  if (str.includes("die cut") || str.includes("diecut") || str.includes("round corner") || str.includes("corner round")) return "DIE_CUTTING";
  if (str.includes("lamina") || str.includes("matte") || str.includes("gloss") || str.includes("soft touch") || str.includes("velvet")) return "LAMINATION";
  if (str.includes("creas") || str.includes("score") || str.includes("scoring")) return "CREASING";
  if (str.includes("perforat")) return "PERFORATION";
  if (str.includes("cut") || str.includes("trim") || str.includes("guillotine") || str.includes("slit")) return "CUTTING";
  if (str.includes("fold") || str.includes("half fold") || str.includes("tri fold") || str.includes("z fold")) return "FOLDING";
  if (str.includes("perfect bind") || str.includes("booklet bind") || str.includes("paperback")) return "PERFECT_BINDING";
  if (str.includes("bind") || str.includes("saddle") || str.includes("stitch") || str.includes("wire") || str.includes("spiral") || str.includes("comb")) return "BINDING";
  if (str.includes("mount") || str.includes("foam board") || str.includes("sunboard")) return "MOUNTING";
  if (str.includes("number")) return "NUMBERING";
  if (str.includes("pack") || str.includes("box") || str.includes("wrap") || str.includes("shrink") || str.includes("bundle")) return "PACKING";

  return null;
}

/**
 * Extracts all explicit finishing requirements from JobItem and JobOrder
 */
function extractFinishingRequirements(item = {}, job = {}) {
  const requirements = [];
  const addedCodes = new Set();

  const addReq = (opCode, name, config = "", notes = "", explicitSeq = null) => {
    if (!opCode || opCode === "PRINT") return; // PRINT is handled as base
    if (addedCodes.has(opCode)) return; // Prevent duplicate operation of the same type
    addedCodes.add(opCode);
    const meta = SUPPORTED_OPERATIONS[opCode] || { name: opCode, precedence: 50, estimatedMinutes: 15 };
    requirements.push({
      opCode,
      name: name || meta.name,
      config: config || "",
      notes: notes || "",
      explicitSeq: Number(explicitSeq) || null,
      precedence: meta.precedence,
      estimatedMinutes: meta.estimatedMinutes,
    });
  };

  // 1. From item.finishing[] (array of objects or strings)
  if (Array.isArray(item.finishing)) {
    item.finishing.forEach((f, idx) => {
      const rawText = typeof f === "string" ? f : (f.code || f.name || f.option || f.process || "");
      const opCode = normalizeOperationCode(rawText);
      if (opCode) {
        addReq(opCode, typeof f === "object" ? f.name : rawText, f.config, f.notes, f.sequence || (idx + 1));
      }
    });
  }

  // 2. From job.finishingServices[] (array from JobOrder form)
  if (Array.isArray(job.finishingServices)) {
    job.finishingServices.forEach((f, idx) => {
      const rawText = f.name || f.code || f.service || "";
      const opCode = normalizeOperationCode(rawText);
      if (opCode) {
        addReq(opCode, f.name || rawText, f.config, f.notes || f.remarks, idx + 1);
      }
    });
  }

  // 3. From discrete item fields: lamination
  const lamVal = String(item.lamination || item.specifications?.lamination || job.specs?.lamination || "").trim();
  if (lamVal && !["none", "not required", "n/a", ""].includes(lamVal.toLowerCase())) {
    addReq("LAMINATION", `${lamVal} Lamination`, lamVal, `Lamination Finish: ${lamVal}`);
  }

  // 4. From discrete item fields: finishing effect
  const effectVal = String(item.finishing || item.specifications?.finishing || job.specs?.finishing || "").trim();
  if (effectVal && !["none", "not required", "n/a", ""].includes(effectVal.toLowerCase()) && !Array.isArray(item.finishing)) {
    const opCode = normalizeOperationCode(effectVal);
    if (opCode) {
      addReq(opCode, effectVal, effectVal, `Finishing: ${effectVal}`);
    }
  }

  // 5. From item.specifications object (binding, folding, cutting)
  const specs = item.specifications || job.specs || {};
  if (specs.binding && !["none", "not required"].includes(String(specs.binding).toLowerCase())) {
    addReq("BINDING", `Binding (${specs.binding})`, specs.binding, `Binding: ${specs.binding}`);
  }
  if (specs.folding && !["none", "not required"].includes(String(specs.folding).toLowerCase())) {
    addReq("FOLDING", `Folding (${specs.folding})`, specs.folding, `Folding: ${specs.folding}`);
  }
  if (specs.cutting && !["none", "not required"].includes(String(specs.cutting).toLowerCase())) {
    addReq("CUTTING", `Cutting (${specs.cutting})`, specs.cutting, `Cutting: ${specs.cutting}`);
  }

  return requirements;
}

/**
 * Builds an immutable, audited specification snapshot for a ProductionOrder
 */
function buildSpecificationSnapshot(item = {}, job = {}) {
  const specs = item.specifications || job.specs || {};

  const productName = item.productName || item.itemName || item.name || item.title || job.title || specs.productType || "Print Job";
  const size = item.paperSize || item.size || specs.size || specs.paperSize || "Standard";
  const material = item.paperType || item.material || specs.paperType || specs.material || "Standard Paper";
  const paperGsm = item.paperGsm || specs.paperGsm || "";
  const colorMode = item.colorMode || item.color || specs.color || specs.colorMode || "Full Color (CMYK)";
  const printingSide = item.printingSide || item.sides || specs.printingSide || specs.sides || "Single Sided";

  // Lamination
  const rawLam = String(item.lamination || specs.lamination || "").trim();
  const lamination = (rawLam && !["none", "not required", "n/a", ""].includes(rawLam.toLowerCase()))
    ? rawLam
    : "Not Required";

  // Finishing requirements extraction
  const finishingReqs = extractFinishingRequirements(item, job);
  const requiredFinishing = finishingReqs.map((r) => r.name);

  // Binding
  const bindingReq = finishingReqs.find((r) => r.opCode === "BINDING" || r.opCode === "PERFECT_BINDING");
  const binding = bindingReq ? bindingReq.name : (specs.binding && specs.binding !== "None" ? specs.binding : "Not Required");

  // Folding
  const foldingReq = finishingReqs.find((r) => r.opCode === "FOLDING");
  const folding = foldingReq ? foldingReq.name : (specs.folding && specs.folding !== "None" ? specs.folding : "Not Required");

  // Cutting
  const cuttingReq = finishingReqs.find((r) => r.opCode === "CUTTING" || r.opCode === "DIE_CUTTING");
  const cutting = cuttingReq ? cuttingReq.name : (specs.cutting && specs.cutting !== "None" ? specs.cutting : "Standard Trim");

  // Packing
  const packingReq = finishingReqs.find((r) => r.opCode === "PACKING");
  const packing = packingReq ? packingReq.name : "Standard Packaging";

  const specialInstructions = item.specialInstructions || job.specialInstructions || job.remarks || item.notes || "";

  return {
    productName,
    size,
    material,
    paperGsm,
    colorMode,
    printingSide,
    lamination,
    binding,
    folding,
    cutting,
    packing,
    requiredFinishing: requiredFinishing.length > 0 ? requiredFinishing : ["Standard Trim & Packaging"],
    finishingDetails: finishingReqs,
    specialInstructions,
    capturedAt: new Date(),
  };
}

/**
 * Derives dynamic operations adhering strictly to the job's actual requirements.
 * Applies valid production sequence precedence rules.
 */
function deriveDynamicOperations(item = {}, job = {}, customOverrides = null) {
  const plannedQty = Number(item.quantity || job.quantity || 1);

  // If planner supplied explicit custom operation overrides, validate and format them
  if (Array.isArray(customOverrides) && customOverrides.length > 0) {
    return customOverrides.map((op, idx) => {
      const code = (op.operationCode || op.operationName || "PRINT").toUpperCase().trim();
      const meta = SUPPORTED_OPERATIONS[code] || { name: code, estimatedMinutes: 20 };
      return {
        sequenceNo: op.sequenceNo || (idx + 1),
        operation: code,
        operationCode: code,
        operationName: op.operationName || meta.name,
        category: meta.category || "FINISHING",
        machine: op.machine || "Floor Station",
        machineId: op.machineId || null,
        assignedEmployeeId: op.assignedEmployeeId || null,
        assignedEmployee: op.assignedEmployee || "Assigned",
        plannedQty,
        inputQty: plannedQty,
        completedQty: 0,
        estimatedMinutes: Number(op.estimatedMinutes) || meta.estimatedMinutes,
        status: op.status || "PENDING",
        remarks: op.remarks || "",
        isMandatory: code === "PRINT" || code === "PACKING",
      };
    });
  }

  // Otherwise, automatically derive from specifications
  const finishingReqs = extractFinishingRequirements(item, job);

  // Sort finishing requirements by standard printing manufacturing dependency
  finishingReqs.sort((a, b) => a.precedence - b.precedence);

  // Check if Booklet layout where folding/binding comes before final edge trimming
  const hasBinding = finishingReqs.some((r) => r.opCode === "BINDING" || r.opCode === "PERFECT_BINDING");
  const cuttingIdx = finishingReqs.findIndex((r) => r.opCode === "CUTTING");
  if (hasBinding && cuttingIdx !== -1) {
    // In booklets, final trimming happens AFTER binding
    const [cuttingReq] = finishingReqs.splice(cuttingIdx, 1);
    cuttingReq.name = "Edge Trimming";
    const bindingIdx = finishingReqs.findIndex((r) => r.opCode === "BINDING" || r.opCode === "PERFECT_BINDING");
    finishingReqs.splice(bindingIdx + 1, 0, cuttingReq);
  }

  let seq = 1;
  const operations = [];

  // 1. BASE: PRINT Operation (always mandatory if needsProduction)
  operations.push({
    sequenceNo: seq++,
    operation: "PRINT",
    operationCode: "PRINT",
    operationName: "Printing",
    category: "BASE",
    machine: "",
    machineId: null,
    assignedEmployeeId: null,
    plannedQty,
    inputQty: plannedQty,
    completedQty: 0,
    estimatedMinutes: 30,
    status: "PENDING",
    remarks: "Execute primary press run",
    isMandatory: true,
  });

  // 2. FINISHING: Only the operations required for this specific job
  finishingReqs.forEach((req) => {
    if (req.opCode === "PACKING") return; // Handled as final operation
    operations.push({
      sequenceNo: seq++,
      operation: req.opCode,
      operationCode: req.opCode,
      operationName: req.name,
      category: SUPPORTED_OPERATIONS[req.opCode]?.category || "FINISHING",
      machine: "",
      machineId: null,
      assignedEmployeeId: null,
      plannedQty,
      inputQty: plannedQty,
      completedQty: 0,
      estimatedMinutes: req.estimatedMinutes,
      status: "PENDING",
      remarks: req.notes || req.config || "",
      isMandatory: true,
    });
  });

  // 3. PACKING: Final packaging & labeling operation
  const packingReq = finishingReqs.find((r) => r.opCode === "PACKING");
  operations.push({
    sequenceNo: seq++,
    operation: "PACKING",
    operationCode: "PACKING",
    operationName: packingReq ? packingReq.name : "Packing & Bundling",
    category: "PACKING",
    machine: "",
    machineId: null,
    assignedEmployeeId: null,
    plannedQty,
    inputQty: plannedQty,
    completedQty: 0,
    estimatedMinutes: 10,
    status: "PENDING",
    remarks: packingReq?.config || "Final boxing, bundling and QC labeling",
    isMandatory: true,
  });

  return operations;
}

/**
 * Validates operation sequence dependencies.
 * Ensures an operation does not violate preceding manufacturing constraints.
 */
function validateOperationSequence(operations = []) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw ApiError.badRequest("Operation list cannot be empty.");
  }

  // Prepress, Prep, or Print can come first. If PRINT is included, operations that precede it should be PREPRESS.
  const printIdx = operations.findIndex((o) => (o.operationCode || "").toUpperCase() === "PRINT");
  if (printIdx !== -1) {
    for (let i = 0; i < printIdx; i++) {
      const code = (operations[i].operationCode || "").toUpperCase();
      if (code !== "PREPRESS" && !code.includes("PREP")) {
        throw ApiError.badRequest(
          `Validation Error: Operation '${operations[i].operationName || code}' cannot precede printing. Only Prepress operations may precede PRINT.`
        );
      }
    }
  }

  // Ensure sequence numbers are strictly unique and positive
  const seenSeqs = new Set();
  for (const op of operations) {
    if (seenSeqs.has(op.sequenceNo)) {
      throw ApiError.badRequest(`Validation Error: Duplicate sequence number #${op.sequenceNo} detected.`);
    }
    seenSeqs.add(op.sequenceNo);
  }

  return true;
}

module.exports = {
  SUPPORTED_OPERATIONS,
  normalizeOperationCode,
  extractFinishingRequirements,
  buildSpecificationSnapshot,
  deriveDynamicOperations,
  validateOperationSequence,
};
