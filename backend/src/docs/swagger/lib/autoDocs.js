/**
 * Fills the gaps in the generated API reference so every operation shows what to send and what comes back.
 *
 *  1. POST request bodies: operations whose body has no fields get them from a hand-checked table
 *     (examples/payloadFields.js) or, for plain "create" endpoints, from the Mongoose model of the resource.
 *  2. Response bodies: every operation gets an example in the standard { success, message, data, meta }
 *     envelope. `data` is built from the resource's Mongoose model (or from the documented schema when one
 *     exists), so "Try it out -> Execute" shows a body shaped like the one the API returns.
 *
 * Hand-written examples always win; nothing here overwrites an `example` that already exists.
 */
const mongoose = require("mongoose");
const payloadFields = require("../examples/payloadFields");
const responseExamples = require("../examples/responseExamples");

const SAMPLE_ID = "6abe00e607b3bc845889e140";
const NOW = "2026-11-06T09:30:00.000Z";
const DAY = "2026-11-06";

/* ------------------------------------------------------------ model sampling */

const SYSTEM_FIELDS = new Set([
  "_id", "__v", "createdAt", "updatedAt", "createdBy", "updatedBy", "isDeleted", "deletedAt", "deletedBy",
  "password", "passwordHash", "refreshToken", "token", "tokens",
]);
const SECRET = /password|secret|token|hash/i;

const nameHint = (name, fallback) => {
  const n = String(name || "").toLowerCase();
  if (/email/.test(n)) return "name@example.com";
  if (/mobile|phone/.test(n)) return "9876543210";
  if (/gstin/.test(n)) return "29AAAAA0000A1Z5";
  if (/(url|link)$/.test(n)) return "https://example.com/files/sample.pdf";
  if (/date$|at$/.test(n)) return NOW;
  if (/reason|remark|note|comment|description|feedback/.test(n)) return "Sample text";
  if (/code$/.test(n)) return "CODE-001";
  if (/(no|number)$/.test(n)) return "NO-0001";
  if (/name$|title$/.test(n)) return "Sample name";
  if (/address/.test(n)) return "12, MG Road, Bengaluru";
  if (fallback === "string" && name) return `Sample ${String(name).replace(/([A-Z])/g, " $1").toLowerCase().trim()}`;
  return fallback;
};

const enumValues = (type) => {
  const e = type.options?.enum;
  if (Array.isArray(e)) return e;
  if (e && Array.isArray(e.values)) return e.values;
  return null;
};

const scalarSample = (type, name) => {
  const values = enumValues(type);
  if (values?.length) return values[0];
  const def = type.options?.default;
  const inst = type.instance;
  if (inst === "String") return typeof def === "string" && def ? def : nameHint(name, "string");
  if (inst === "Number") return typeof def === "number" && def !== 0 ? def : /year$/i.test(name) ? 2026 : /month$/i.test(name) ? 11 : /pct|percent|rate/i.test(name) ? 18 : 1;
  if (inst === "Boolean") return typeof def === "boolean" ? def : true;
  if (inst === "Date") return /date$/i.test(name) && !/at$/i.test(name) ? DAY : NOW;
  if (inst === "ObjectId" || inst === "ObjectID") return SAMPLE_ID;
  if (inst === "Decimal128") return "500.00";
  if (inst === "Buffer") return "";
  return nameHint(name, "string");
};

const sampleValue = (type, name, depth) => {
  const inst = type.instance;
  if (inst === "Array") {
    if (type.schema) return depth < 3 ? [sampleFromSchema(type.schema, { depth: depth + 1 })] : [];
    const caster = type.caster || type.$embeddedSchemaType;
    return caster ? [scalarSample(caster, name)] : [];
  }
  if (inst === "Embedded" || inst === "Subdocument" || (type.schema && inst !== "Array")) {
    return depth < 3 && type.schema ? sampleFromSchema(type.schema, { depth: depth + 1 }) : {};
  }
  // Several models store ids in Mixed fields, so the field name decides
  if (inst === "Mixed" && /ids$/i.test(name)) return [SAMPLE_ID];
  if (inst === "Mixed" && /id$/i.test(name)) return SAMPLE_ID;
  if (inst === "Mixed" || inst === "Map" || inst === "Object") return {};
  return scalarSample(type, name);
};

const setDeep = (obj, pathStr, value) => {
  const parts = pathStr.split(".");
  let cur = obj;
  parts.slice(0, -1).forEach((p) => {
    if (typeof cur[p] !== "object" || cur[p] === null) cur[p] = {};
    cur = cur[p];
  });
  cur[parts[parts.length - 1]] = value;
};

/** A document-shaped sample. mode "input" keeps only what a client would send. */
function sampleFromSchema(schema, { depth = 0, mode = "output" } = {}) {
  const out = {};
  const required = [];
  Object.entries(schema.paths || {}).forEach(([p, type]) => {
    const top = p.split(".")[0];
    if (p === "__v" || SECRET.test(p)) return;
    if (mode === "input" && (SYSTEM_FIELDS.has(top) || type.options?.immutable)) return;
    if (mode === "output" && p === "_id" && depth > 0) return;
    const isRequired = Boolean(type.isRequired || type.options?.required) && type.options?.default === undefined;
    if (mode === "input" && !isRequired && Object.keys(out).length >= 14) return;
    if (mode === "input" && isRequired && !p.includes(".")) required.push(p);
    setDeep(out, p, p === "_id" ? SAMPLE_ID : sampleValue(type, p.split(".").pop(), depth));
  });
  if (mode === "output" && schema.options?.timestamps) {
    out.createdAt = NOW;
    out.updatedAt = NOW;
  }
  if (mode === "input") Object.defineProperty(out, "__required", { value: required, enumerable: false });
  return out;
}

/* ------------------------------------------------------------ path -> model */

const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, "").replace(/s$/, "");

const SEGMENT_MODEL = {
  auth: "User", users: "User", jobs: "JobOrder", "job-orders": "JobOrder", samples: "JobSample",
  approvals: "CommonApproval", attachments: "CommonAttachment", "number-sequences": "CommonNumberSequence",
  stocks: "StockItem", "stock-items": "StockItem", "total-amounts": "TotalAmountReading",
  runs: "SalaryRun", components: "SalaryComponent", structures: "EmployeeSalaryStructure",
  adjustments: "SalaryAdjustment", loans: "EmployeeLoan", records: "SalaryRecord", repayments: "LoanRepayment",
  attendance: "DailyAttendance", "attendance-policies": "AttendancePolicy", "holiday-calendars": "HolidayCalendar",
  shifts: "EmployeeBranchAssignment", operators: "ProductionOperator", "production-queue": "ProductionOrder",
  orders: "ProductionOrder", operations: "ProductionOperation", reprints: "ReprintRequest",
  customer: "Customer", "customer-requests": "CustomerRequest", public: "CustomerRequest",
  mfg: "MfgDesignerProfile", designers: "MfgDesignerProfile", sales: "Sale", "design-approvals": "JobAssignment",
  estimates: "Estimate", "inventory-movements": "InventoryMovement", "finalized-dates": "FinalizedDate",
  "sale-receipt-items": "SaleReceiptItem", settlement: "Payment", notifications: "Notification",
};

const modelFor = (path) => {
  const segs = path.split("/").filter((s) => s && !s.startsWith("{"));
  const byNorm = {};
  Object.keys(mongoose.models).forEach((m) => {
    byNorm[norm(m)] = m;
  });
  for (const seg of segs) {
    const name = SEGMENT_MODEL[seg] || byNorm[norm(seg)];
    if (name && mongoose.models[name]) return mongoose.models[name];
  }
  return null;
};

/* ------------------------------------------------------------ schema <-> example helpers */

const typeOf = (v) => {
  if (v === null) return { nullable: true };
  if (Array.isArray(v)) return { type: "array", items: v.length ? typeOf(v[0]) : {} };
  if (typeof v === "object") {
    return { type: "object", properties: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeOf(x)])) };
  }
  if (typeof v === "number") return { type: Number.isInteger(v) ? "integer" : "number" };
  if (typeof v === "boolean") return { type: "boolean" };
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return { type: "string", format: "date-time" };
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { type: "string", format: "date" };
  if (/^[a-f0-9]{24}$/i.test(v)) return { type: "string", description: "24-character MongoDB ObjectId" };
  return { type: "string" };
};

const bodySchema = (example, { required = [], descriptions = {} } = {}) => {
  const schema = typeOf(example);
  Object.entries(descriptions).forEach(([k, d]) => {
    if (schema.properties?.[k]) schema.properties[k].description = d;
  });
  if (required.length) schema.required = required;
  return schema;
};

const resolveRef = (doc, s, depth = 0) => {
  let cur = s;
  while (cur?.$ref && depth++ < 8) cur = doc.components.schemas[cur.$ref.split("/").pop()];
  return cur;
};

/** An example from a documented schema (explicit examples win, then enums, then types). */
const exampleFromSchema = (doc, schema, depth = 0) => {
  const s = resolveRef(doc, schema);
  if (!s || depth > 5) return undefined;
  if (s.example !== undefined) return s.example;
  if (s.allOf) {
    return s.allOf.reduce((acc, part) => {
      const ex = exampleFromSchema(doc, part, depth + 1);
      return ex && typeof ex === "object" && !Array.isArray(ex) ? { ...acc, ...ex } : acc;
    }, {});
  }
  if (s.enum) return s.enum[0];
  if (s.type === "array") {
    const item = exampleFromSchema(doc, s.items, depth + 1);
    return item === undefined ? [] : [item];
  }
  if (s.type === "object" || s.properties) {
    const out = {};
    Object.entries(s.properties || {}).forEach(([k, v]) => {
      const ex = exampleFromSchema(doc, v, depth + 1);
      if (ex !== undefined) out[k] = ex;
    });
    return out;
  }
  if (s.type === "integer" || s.type === "number") return 1;
  if (s.type === "boolean") return true;
  if (s.type === "string") return s.format === "date-time" ? NOW : s.format === "date" ? DAY : "string";
  return undefined;
};

/* ------------------------------------------------------------ request bodies */

const jsonContent = (requestBody) => requestBody?.content?.["application/json"];
const hasFields = (doc, def) => {
  const s = resolveRef(doc, def?.schema);
  return Boolean(s && s.properties && Object.keys(s.properties).length);
};

const fillRequestBodies = (doc, stats) => {
  Object.entries(doc.paths).forEach(([path, item]) => {
    const op = item.post;
    if (!op) return;
    const key = `POST ${path}`;
    const manual = payloadFields[key];
    const json = jsonContent(op.requestBody);

    // A multipart upload keeps its own schema
    if (op.requestBody && !json) return;

    if (manual) {
      const required = manual.required || [];
      op.requestBody = {
        required: required.length > 0,
        content: {
          "application/json": {
            schema: bodySchema(manual.example, { required, descriptions: manual.descriptions }),
            example: manual.example,
          },
        },
      };
      stats.bodiesFromTable += 1;
      return;
    }

    if (json && hasFields(doc, json)) {
      if (json.example === undefined) {
        const ex = exampleFromSchema(doc, json.schema);
        if (ex && Object.keys(ex).length) {
          op.requestBody = JSON.parse(JSON.stringify(op.requestBody));
          jsonContent(op.requestBody).example = ex;
          stats.bodyExamples += 1;
        }
      }
      return;
    }

    // Plain create endpoint whose body has no declared fields: describe it from the model
    const lastSeg = path.split("/").filter(Boolean).pop();
    const model = modelFor(path);
    const isCreate = lastSeg && !lastSeg.startsWith("{") && model && norm(lastSeg) === norm(model.modelName);
    if (isCreate) {
      const example = sampleFromSchema(model.schema, { mode: "input" });
      const required = example.__required || [];
      op.requestBody = {
        required: true,
        content: { "application/json": { schema: bodySchema({ ...example }, { required }), example: { ...example } } },
      };
      stats.bodiesFromModel += 1;
    }
  });
};

/* ------------------------------------------------------------ responses */

const ACTION_PATCH = [
  [/deactivate|disable|archive/, { isActive: false, status: "INACTIVE" }],
  [/activate|enable/, { isActive: true, status: "ACTIVE" }],
  [/unlock/, { status: "ACTIVE" }],
  [/cancel/, { status: "CANCELLED" }],
  [/reject/, { status: "REJECTED" }],
  [/approve/, { status: "APPROVED" }],
  [/(^|\/)hold$/, { status: "ON_HOLD" }],
  [/resume/, { status: "IN_PROGRESS" }],
  [/pause/, { status: "PAUSED" }],
  [/start/, { status: "IN_PROGRESS" }],
  [/complete|finish/, { status: "COMPLETED" }],
  [/dispatch/, { status: "OUT_FOR_DELIVERY" }],
  [/pack/, { status: "PACKED" }],
  [/pay(\/|$)/, { status: "PAID" }],
  [/lock$/, { status: "LOCKED" }],
  [/finalize/, { status: "FINALIZED" }],
];

const hasPaging = (op) =>
  (op.parameters || []).some((p) => /page|limit/i.test(p.name || p.$ref || ""));

const envelope = ({ message, data, meta }) => {
  const body = { success: true, message };
  if (data !== undefined) body.data = data;
  if (meta) body.meta = meta;
  return body;
};

const buildResponseExample = (doc, path, method, op, code, resp) => {
  const description = resp.description && !/^success$/i.test(resp.description) ? resp.description : null;
  const manual = responseExamples[`${method.toUpperCase()} ${path}`];
  if (manual) return manual;

  const message = description || (method === "post" && code === "201" ? "Created successfully" : "Request completed successfully");
  const dataSchema = resp.content?.["application/json"]?.schema;

  // Prefer a concrete documented data schema when there is one
  const documented = dataSchema ? exampleFromSchema(doc, dataSchema) : undefined;
  const documentedData = documented && typeof documented === "object" && documented.data !== undefined && Object.keys(documented.data || {}).length ? documented.data : undefined;

  const segs = path.split("/").filter(Boolean);
  const last = segs[segs.length - 1] || "";
  const isCollection = !last.startsWith("{");
  const model = modelFor(path);
  const modelSample = model ? sampleFromSchema(model.schema) : undefined;

  if (method === "delete") return envelope({ message: description || "Deleted successfully", data: { _id: SAMPLE_ID, deleted: true } });

  const isList = method === "get" && isCollection && (hasPaging(op) || (model && norm(last) === norm(model.modelName)));
  if (isList) {
    const row = modelSample || (documentedData && !Array.isArray(documentedData) ? documentedData : {});
    return envelope({
      message,
      data: [row],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  }

  let data = modelSample !== undefined ? modelSample : documentedData;
  if (data && !Array.isArray(data) && typeof data === "object" && method !== "get") {
    const action = ACTION_PATCH.find(([re]) => re.test(segs.slice(-2).join("/")));
    if (action && !(method === "post" && isCollection && norm(last) === norm(model?.modelName || ""))) {
      const patch = {};
      Object.entries(action[1]).forEach(([k, v]) => {
        if (k in data) patch[k] = v;
      });
      data = { ...data, ...patch };
    }
  }
  if (data === undefined) data = {};
  return envelope({ message, data });
};

const fillResponses = (doc, stats) => {
  Object.entries(doc.paths).forEach(([path, item]) => {
    ["get", "post", "put", "patch", "delete"].forEach((method) => {
      const op = item[method];
      if (!op?.responses) return;
      Object.entries(op.responses).forEach(([code, shared]) => {
        if (!/^2/.test(code) || shared.$ref) return;
        // Response objects can be shared between operations: copy before adding an example
        const resp = JSON.parse(JSON.stringify(shared));
        op.responses[code] = resp;
        resp.content = resp.content || { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } };
        const json = resp.content["application/json"];
        if (!json || json.example !== undefined) return;
        json.example = buildResponseExample(doc, path, method, op, code, resp);
        stats.responseExamples += 1;
      });
    });
  });
};

/**
 * @param {object} doc OpenAPI document (modified in place)
 * @returns {object} counters, handy for the verification script
 */
const addAutoDocs = (doc) => {
  const stats = { bodiesFromTable: 0, bodiesFromModel: 0, bodyExamples: 0, responseExamples: 0 };
  fillRequestBodies(doc, stats);
  fillResponses(doc, stats);
  return stats;
};

module.exports = { addAutoDocs, sampleFromSchema, modelFor };
