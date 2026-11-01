/**
 * OpenAPI 3 document for the PrintZ API.
 *
 *   docs/swagger/
 *     index.js              builds the document (this file)
 *     modules/*.docs.js     one file per business area: { tags, schemas, paths }
 *     components/           shared schemas, error responses and parameters
 *     examples/             example request bodies, attached to the matching endpoints
 *     lib/                  builder helpers, tag table and the route-based completeness check
 *
 * To document a new endpoint, add it to the module file for its area (or create a new *.docs.js and list
 * it in MODULES below). Anything left undocumented is generated from the route by lib/enrich.js.
 */
const env = require("../../config/env");
const { TAG_DESCRIPTIONS, tagForPath } = require("./lib/tags");
const payloadExamples = require("./examples/payload.examples");
const endpointExamples = require("./examples/endpoint.examples");

const commonSchemas = require("./components/common.schemas");
const responses = require("./components/responses");
const parameters = require("./components/parameters");

const MODULES = [
  require("./modules/auth.docs"),
  require("./modules/users.docs"),
  require("./modules/employees.docs"),
  require("./modules/roles-permissions.docs"),
  require("./modules/common-masters.docs"),
  require("./modules/support-masters.docs"),
  require("./modules/inventory.docs"),
  require("./modules/customers.docs"),
  require("./modules/pos.docs"),
  require("./modules/job-orders.docs"),
  require("./modules/design.docs"),
  require("./modules/production-delivery.docs"),
  require("./modules/sla.docs"),
  require("./modules/settlements.docs"),
  require("./modules/attendance.docs"),
  require("./modules/salary.docs"),
  require("./modules/public.docs"),
  require("./modules/sale-orders.docs"),
  require("./modules/webhooks.docs"),
];

const METHODS = ["get", "post", "put", "patch", "delete"];
const cleanTagName = (name = "") =>
  String(name).replace(/^API\s*\d+\s*[-—–]\s*/i, "").replace(/^Support\s*[-—–]\s*/i, "").replace(/^API\s*[-—–]\s*/i, "").replace(/Employee Master/i, "Employees").trim();

const fallbackSummary = (operationId, method, path) =>
  operationId ? operationId.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim() : `${method.toUpperCase()} ${path}`;

/** Attach a ready-to-send example body to each request body, from examples/ when one is registered. */
const withExamples = (requestBody, method, path) => {
  if (!requestBody?.content) return requestBody;
  const key = `${method.toUpperCase()} ${path}`;
  const endpointExample = endpointExamples[key] || payloadExamples.endpoints[key];
  const content = {};
  Object.entries(requestBody.content).forEach(([type, def]) => {
    let example = def.example || endpointExample;
    if (!example && def.schema?.$ref) example = payloadExamples.schemas[def.schema.$ref.split("/").pop()];
    content[type] = { ...def, ...(example ? { example } : {}) };
  });
  return { ...requestBody, content };
};

/**
 * Ensure every response has a description (OpenAPI requires one), and add the standard error responses
 * every call can return: 401/403 for secured calls, 404 when the path has an id or a body, 400 when it
 * takes a body or query, 409 for writes. Responses written by hand are never replaced.
 */
const normalizeResponses = (responsesIn, { secured, hasPathParam, hasInput, isWrite }) => {
  const base = responsesIn && Object.keys(responsesIn).length
    ? responsesIn
    : { 200: { description: "Success", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } } };
  const fallback = { 200: "Success", 201: "Created" };
  const out = Object.fromEntries(
    Object.entries(base).map(([code, r]) => [code, r?.$ref ? r : { ...r, description: r?.description || fallback[code] || "Response" }])
  );
  const add = (code, name) => {
    if (!out[code]) out[code] = { $ref: `#/components/responses/${name}` };
  };
  if (secured) {
    add(401, "Unauthorized");
    add(403, "Forbidden");
  }
  if (hasInput) add(400, "BadRequest");
  // A body can point at records that no longer exist, and any write can meet a duplicate or a status rule
  if (hasPathParam || hasInput) add(404, "NotFound");
  if (isWrite) add(409, "Conflict");
  add(500, "ServerError");
  return out;
};

const buildSwaggerDocument = () => {
  const schemas = { ...commonSchemas };
  const tagDescriptions = { ...TAG_DESCRIPTIONS };
  const paths = {};
  const usedTags = new Set();

  MODULES.forEach((mod) => {
    Object.assign(schemas, mod.schemas || {});
    (mod.tags || []).forEach((t) => {
      const name = cleanTagName(t.name);
      if (name && t.description && !tagDescriptions[name]) tagDescriptions[name] = t.description;
    });

    Object.entries(mod.paths || {}).forEach(([path, item]) => {
      paths[path] = paths[path] || {};
      Object.entries(item).forEach(([method, def]) => {
        if (!METHODS.includes(method) || typeof def !== "object" || def === null) {
          paths[path][method] = def; // path-level keys such as `servers` or `parameters`
          return;
        }
        // Hand-written tags win for modules that opt in, otherwise the URL prefix decides the group.
        const tag = (mod.explicitTags && def.tags?.[0]) || tagForPath(path) || cleanTagName(def.tags?.[0]) || "General";
        usedTags.add(tag);
        const summary = def.summary || fallbackSummary(def.operationId, method, path);
        paths[path][method] = {
          ...def,
          tags: [tag],
          summary,
          description: def.description || summary,
          ...(def.requestBody ? { requestBody: withExamples(def.requestBody, method, path) } : {}),
          responses: normalizeResponses(def.responses, {
            secured: !(Array.isArray(def.security) && def.security.length === 0),
            hasPathParam: path.includes("{"),
            hasInput: Boolean(def.requestBody) || (def.parameters || []).some((p) => p.in === "query" && p.required),
            isWrite: method !== "get",
          }),
        };
      });
    });
  });

  // Attach the registered example to its schema
  Object.entries(payloadExamples.schemas).forEach(([name, example]) => {
    if (schemas[name]) schemas[name].example = example;
  });

  return {
    openapi: "3.0.3",
    info: {
      title: "PrintZ API",
      version: "2.0.0",
      description: [
        "REST API for PrintZ: billing and POS, job orders, design, production, delivery, HR and the branch-to-manufacturing-unit sale orders.",
        "",
        "**Signing in**",
        "1. Call `POST /auth/login` with your email and password.",
        "2. Copy `accessToken` from the response, press **Authorize** and paste it. Do not type `Bearer`.",
        "3. When the access token expires, send `refreshToken` to `POST /auth/refresh`.",
        "",
        "**Conventions**",
        "- Success: `{ success: true, message, data }`. Lists also return `meta` with `page`, `limit`, `total` and `totalPages`.",
        "- Errors: `{ success: false, code, message, details? }`. `code` is a stable value you can branch on.",
        "- Ids are 24-character MongoDB ObjectIds. Dates are ISO 8601.",
      ].join("\n"),
    },
    servers: [
      { url: "/api", description: "This server" },
      { url: `http://localhost:${env.PORT || 5000}/api`, description: "Local development" },
    ],
    tags: Object.keys(tagDescriptions)
      .filter((name) => usedTags.has(name))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name, description: tagDescriptions[name] })),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "The `accessToken` returned by `POST /auth/login`.",
        },
      },
      schemas,
      responses,
      parameters,
    },
    security: [{ bearerAuth: [] }],
    paths,
  };
};

module.exports = { buildSwaggerDocument };
