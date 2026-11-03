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
 * Ensures only a single success response (2xx) is documented for each endpoint.
 */
const normalizeResponses = (responsesIn) => {
  if (responsesIn && typeof responsesIn === "object") {
    const successEntry = Object.entries(responsesIn).find(([code]) => String(code).startsWith("2"));
    if (successEntry) {
      const [code, resp] = successEntry;
      return {
        [code]: resp?.$ref ? resp : { ...resp, description: resp?.description || (code === "201" ? "Created" : "Success") },
      };
    }
  }

  return {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
        },
      },
    },
  };
};

const normalizeSecurity = (sec) => {
  if (Array.isArray(sec) && sec.length === 0) return [];
  if (!sec) return [{ accessToken: [] }];
  return sec.map((item) => {
    if ("bearerAuth" in item) {
      return { accessToken: item.bearerAuth };
    }
    return item;
  });
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
        const op = {
          ...def,
          tags: [tag],
          security: normalizeSecurity(def.security),
          ...(def.requestBody ? { requestBody: withExamples(def.requestBody, method, path) } : {}),
          responses: normalizeResponses(def.responses),
        };
        delete op.summary;
        delete op.description;
        paths[path][method] = op;
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
    },
    servers: [
      { url: "/api" },
      { url: `http://localhost:${env.PORT || 5000}/api` },
    ],
    tags: Array.from(usedTags)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name })),
    components: {
      securitySchemes: {
        accessToken: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        refreshToken: {
          type: "apiKey",
          in: "header",
          name: "x-refresh-token",
        },
      },
      schemas,
      responses,
      parameters,
    },
    security: [{ accessToken: [] }],
    paths,
  };
};

module.exports = { buildSwaggerDocument };
