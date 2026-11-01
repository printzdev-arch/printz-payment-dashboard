/**
 * Keeps the API reference complete: every route that exists in Express but is not described by hand in
 * docs/swagger/modules gets an operation generated from the code itself (path and query parameters, and
 * the request body fields declared with express-validator). Hand-written docs always win, and generated
 * operations are marked `x-generated: true` so they are easy to find and replace with richer docs.
 */
const { tagForPath } = require("./tags");
const endpointExamples = require("../examples/endpoint.examples");

const ROUTE_PREFIX = "/api";
const SAMPLE_ID = "6abe00e607b3bc845889e140";

/* ------------------------------------------------------------ route discovery */

const unmount = (layer) => {
  if (layer.regexp.fast_slash) return "";
  let src = layer.regexp.source.replace("^\\/?(?=\\/|$)", "").replace(/^\^/, "").replace(/\\\/\?\(\?=\\\/\|\$\)$/, "").replace(/\$$/, "");
  let i = 0;
  src = src.replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, () => `:${layer.keys[i++]?.name || "param"}`);
  return src.replace(/\\\//g, "/").replace(/\\\./g, ".");
};

const validatorsOf = (handle) => {
  const chains = Array.isArray(handle) ? handle : [handle];
  return chains.filter((c) => c && c.builder).map((c) => c.builder);
};

/** Every route mounted under /api (the /api/v1 copy is skipped), with the validators declared on it. */
const discoverRoutes = (app) => {
  const found = [];
  const walk = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) {
        const builders = layer.route.stack.flatMap((s) => validatorsOf(s.handle));
        for (const method of Object.keys(layer.route.methods)) {
          found.push({ method, path: `${prefix}${layer.route.path}`.replace(/\/+/g, "/"), builders });
        }
      } else if (layer.name === "router" && layer.handle.stack) {
        walk(layer.handle.stack, prefix + unmount(layer));
      }
    }
  };
  walk(app._router.stack, "");
  return found
    .filter((r) => r.path.startsWith(`${ROUTE_PREFIX}/`) && !r.path.startsWith(`${ROUTE_PREFIX}/v1/`))
    .map((r) => ({ ...r, path: r.path.slice(ROUTE_PREFIX.length).replace(/\/$/, "") || "/" }));
};

/* ------------------------------------------------------------ alias handling */

/** Routers mounted on several prefixes (for example /jobs and /job-orders) are documented once, under the first. */
const buildCanonicalizer = (mounts = []) => {
  const aliasToCanonical = new Map();
  mounts.forEach(([paths]) => {
    const real = paths.filter((p) => p !== "/");
    real.slice(1).forEach((alias) => aliasToCanonical.set(alias, real[0]));
  });
  const aliases = [...aliasToCanonical.keys()].sort((a, b) => b.length - a.length);
  return (path) => {
    const alias = aliases.find((a) => path === a || path.startsWith(`${a}/`));
    return alias ? aliasToCanonical.get(alias) + path.slice(alias.length) : path;
  };
};

/** The production and delivery modules are also reachable under /production and /delivery with the same handlers. */
const SUB_ALIASES = [
  ["/production/production-orders", "/production-orders"],
  ["/production/orders", "/production-orders"],
  ["/production/production-operations", "/production-operations"],
  ["/production/operations", "/production-operations"],
  ["/production/production-queue", "/production-queue"],
  ["/production/quality-checks", "/quality-checks"],
  ["/production/reprint-requests", "/reprint-requests"],
  ["/production/reprints", "/reprint-requests"],
  ["/production/delivery-orders", "/delivery-orders"],
  ["/production/resources", "/production-resources"],
  ["/delivery/orders", "/delivery-orders"],
  ["/delivery/proofs", "/delivery-proofs"],
];

const toKey = (method, path) => `${method.toLowerCase()} ${path.replace(/\{[^}]+\}|:[^/]+/g, "{}").replace(/\/$/, "")}`;

/* ------------------------------------------------------------ validator -> schema */

const SAMPLE = { string: "string", number: 1, integer: 1, boolean: true };
const TODAY = new Date().toISOString().slice(0, 10);

/** A realistic example value from the field name when the validator does not say more. */
const exampleByName = (name, fallback) => {
  const n = name.toLowerCase();
  if (/id$/.test(n)) return SAMPLE_ID;
  if (/email/.test(n)) return "name@example.com";
  if (/phone|mobile/.test(n)) return "9876543210";
  if (/(^|[a-z])(time|checkin|checkout)$/.test(n) || /^(checkin|checkout|starttime|endtime)$/.test(n)) return "10:00";
  if (/date$/.test(n)) return TODAY;
  if (n === "year") return Number(TODAY.slice(0, 4));
  if (n === "month") return Number(TODAY.slice(5, 7));
  if (/reason|remark|note|comment|description/.test(n)) return "Reason entered while testing the API";
  if (/name/.test(n)) return "Sample name";
  return fallback;
};

const describeField = (builder, fieldName = "") => {
  const stack = builder.stack || [];
  const names = stack.map((s) => s.validator?.name).filter(Boolean);
  const options = (name) => stack.find((s) => s.validator?.name === name)?.options?.[0];
  let schema = { type: "string", example: exampleByName(fieldName, SAMPLE.string) };
  if (names.includes("isMongoId")) schema = { $ref: "#/components/schemas/ObjectId", example: SAMPLE_ID };
  else if (names.includes("isEmail")) schema = { type: "string", format: "email", example: "name@example.com" };
  else if (names.includes("isBoolean")) schema = { type: "boolean", example: true };
  else if (names.includes("isInt")) schema = { type: "integer", example: exampleByName(fieldName, options("isInt")?.min ?? 1) };
  else if (names.some((n) => ["isFloat", "isNumeric", "isDecimal"].includes(n))) schema = { type: "number", example: exampleByName(fieldName, Math.max(options("isFloat")?.min ?? 0, 1)) };
  else if (names.some((n) => ["isISO8601", "isDate"].includes(n))) schema = { type: "string", format: "date", example: TODAY };
  else if (names.includes("isArray")) schema = { type: "array", items: {}, example: [] };
  else if (names.includes("isObject")) schema = { type: "object", additionalProperties: true, example: {} };

  const inList = stack.find((s) => s.validator?.name === "isIn");
  if (inList && Array.isArray(inList.options?.[0]) && inList.options[0].length) {
    schema = { type: typeof inList.options[0][0] === "number" ? "number" : "string", enum: inList.options[0], example: inList.options[0][0] };
  }
  return schema;
};

const optionalOf = (builder) => Boolean(builder.optional);

/** Collect body / query fields from the validator builders. Nested and wildcard fields are skipped. */
const collectFields = (builders, location) => {
  const fields = new Map();
  builders.forEach((b) => {
    if (!(b.locations || []).includes(location)) return;
    (b.fields || []).forEach((f) => {
      if (typeof f !== "string" || !f || /[.*[\]]/.test(f)) return;
      const existing = fields.get(f);
      fields.set(f, { schema: existing?.schema || describeField(b, f), required: !optionalOf(b) && (existing?.required ?? true) });
    });
  });
  return fields;
};

/* ------------------------------------------------------------ operation builder */

const humanize = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const singular = (w) => (/ies$/.test(w) ? `${w.slice(0, -3)}y` : /(ss|us)$/.test(w) ? w : /s$/.test(w) ? w.slice(0, -1) : w);
const words = (seg) => seg.replace(/[-_]/g, " ").toLowerCase();

const ACTIONS = {
  approve: "Approve", reject: "Reject", cancel: "Cancel", hold: "Put on hold", resume: "Resume", start: "Start",
  complete: "Complete", pause: "Pause", skip: "Skip", activate: "Activate", deactivate: "Deactivate", enable: "Enable",
  disable: "Disable", submit: "Submit", finalize: "Finalize", calculate: "Calculate", assign: "Assign", reassign: "Reassign",
  deliver: "Mark delivered", dispatch: "Dispatch", pack: "Mark packed", verify: "Verify", share: "Share", reopen: "Reopen",
  restore: "Restore", release: "Release", "auto-allocate": "Auto-assign a designer to",
};

/** A readable summary from the method and the shape of the path, for operations without a hand-written entry. */
const summaryFor = (method, path) => {
  const segs = path.split("/").filter(Boolean);
  const isParam = (s) => s.startsWith("{");
  const statics = segs.filter((s) => !isParam(s));
  const lastSeg = segs[segs.length - 1];
  const endsWithParam = isParam(lastSeg);
  const subject = (seg) => singular(words(seg || "record"));

  if (endsWithParam) {
    const name = subject(statics[statics.length - 1]);
    if (method === "get") return `Get ${name}`;
    if (method === "delete") return `Delete ${name}`;
    return `Update ${name}`;
  }
  const last = lastSeg;
  const parent = segs.length > 1 ? segs[segs.length - 2] : null;
  const parentStatic = parent && !isParam(parent) ? parent : statics[statics.length - 2];
  if (statics.length === 1 && segs.length === 1) {
    if (method === "get") return `List ${words(last)}`;
    if (method === "post") return `Create ${subject(last)}`;
    if (method === "delete") return `Delete ${subject(last)}`;
    return `Update ${subject(last)}`;
  }
  if (ACTIONS[last] && method !== "get") return `${ACTIONS[last]} ${subject(parentStatic)}`;
  if (method === "get") return parentStatic ? `${isParam(parent) ? "List" : "Get"} ${words(last)} of ${subject(parentStatic)}` : `List ${words(last)}`;
  if (method === "post") return `Add ${subject(last)}${parentStatic ? ` to ${subject(parentStatic)}` : ""}`;
  if (method === "delete") return `Remove ${subject(last)}`;
  return `Update ${subject(last)}`;
};

const successSchema = (method, path) => {
  const endsWithParam = path.split("/").pop().startsWith("{");
  if (method === "get" && !endsWithParam) {
    return {
      allOf: [
        { $ref: "#/components/schemas/ApiSuccessResponse" },
        { type: "object", properties: { data: { type: "array", items: { type: "object", additionalProperties: true } }, meta: { $ref: "#/components/schemas/PaginationMeta" } } },
      ],
    };
  }
  return {
    allOf: [{ $ref: "#/components/schemas/ApiSuccessResponse" }, { type: "object", properties: { data: { type: "object", additionalProperties: true } } }],
  };
};
const PUBLIC_PREFIXES = ["/public"];

const buildOperation = ({ method, path, builders }, docPath) => {
  const tag = tagForPath(docPath) || humanize((docPath.split("/")[1] || "General"));
  const parameters = [];
  const pathParams = [...docPath.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  pathParams.forEach((name) => parameters.push({ name, in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }));
  collectFields(builders, "query").forEach(({ schema, required }, name) => parameters.push({ name, in: "query", required, schema }));

  const body = collectFields(builders, "body");
  const op = {
    tags: [tag],
    operationId: `${method}${docPath.split(/[/{}]+/).filter(Boolean).map((s) => humanize(s).replace(/ /g, "")).join("")}`,
    summary: summaryFor(method, docPath),
    description: `${summaryFor(method, docPath)}. Needs a signed-in user${PUBLIC_PREFIXES.some((p) => docPath.startsWith(p)) ? " (this one is public)" : ""}. Generated from the route definition: parameters and request fields come from the validation rules.`,
    "x-generated": true,
    security: PUBLIC_PREFIXES.some((p) => docPath.startsWith(p)) ? [] : [{ bearerAuth: [] }],
    ...(parameters.length ? { parameters } : {}),
    responses: {
      "2XX": { description: "Success", content: { "application/json": { schema: successSchema(method, docPath) } } },
      400: { $ref: "#/components/responses/BadRequest" },
      401: { $ref: "#/components/responses/Unauthorized" },
      403: { $ref: "#/components/responses/Forbidden" },
      404: { $ref: "#/components/responses/NotFound" },
    },
  };
  if (!["get", "delete"].includes(method)) {
    const properties = {};
    const required = [];
    const example = {};
    body.forEach(({ schema, required: req }, name) => {
      properties[name] = schema;
      if (req) required.push(name);
      example[name] = schema.example ?? (schema.$ref ? SAMPLE_ID : SAMPLE.string);
    });
    op.requestBody = {
      required: required.length > 0,
      content: { "application/json": { schema: { type: "object", ...(required.length ? { required } : {}), properties, additionalProperties: true }, ...(body.size ? { example } : {}) } },
    };
    // A body registered in examples/endpoint.examples.js is verified against the real API, so it wins
    const registered = endpointExamples[`${method.toUpperCase()} ${docPath}`];
    if (registered) {
      op.requestBody.required = true;
      op.requestBody.content["application/json"].example = registered;
    }
  }
  return op;
};

/* ------------------------------------------------------------ public api */

/**
 * Adds an operation for every Express route the document does not already describe.
 * Returns the document and a coverage summary.
 */
const enrichFromRoutes = (doc, app, mounts = []) => {
  const canonical = buildCanonicalizer(mounts);
  const documented = new Set();
  Object.entries(doc.paths).forEach(([path, methods]) =>
    Object.keys(methods).forEach((m) => {
      if (["get", "post", "put", "patch", "delete"].includes(m)) documented.add(toKey(m, canonical(path)));
    })
  );

  const routes = discoverRoutes(app);
  const realKeys = new Set(routes.map((r) => toKey(r.method, canonical(r.path))));
  // Use the shorter path only when that exact route exists, so the document never lists a path that is not served
  const canonicalPathOf = (route) => {
    const base = canonical(route.path);
    const hit = SUB_ALIASES.find(([from]) => base === from || base.startsWith(`${from}/`));
    if (!hit) return base;
    const shorter = hit[1] + base.slice(hit[0].length);
    return realKeys.has(toKey(route.method, shorter)) ? shorter : base;
  };

  const seen = new Set();
  let generated = 0;
  routes.forEach((route) => {
    const canonicalPath = canonicalPathOf(route);
    const key = toKey(route.method, canonicalPath);
    if (documented.has(key) || seen.has(key)) return;
    seen.add(key);
    const docPath = canonicalPath.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    doc.paths[docPath] = doc.paths[docPath] || {};
    doc.paths[docPath][route.method] = buildOperation(route, docPath);
    generated += 1;
  });
  return { doc, generated, documented: documented.size };
};

module.exports = { enrichFromRoutes, discoverRoutes, buildCanonicalizer, toKey };
