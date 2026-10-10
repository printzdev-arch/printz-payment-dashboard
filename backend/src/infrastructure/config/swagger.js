const env = require("./env");

const commonSchemas = require("./swagger/common.schemas");
const api00 = require("./swagger/api00_user");
const api01 = require("./swagger/api01_auth");
const api01Employee = require("./swagger/api01_employee");
const api01Role = require("./swagger/api01_role");
const api02 = require("./swagger/api02_common");
const api03 = require("./swagger/api03_inventory");
const api04 = require("./swagger/api04_pos");
const api05 = require("./swagger/api05_product_order");
const api06 = require("./swagger/api06_job_order");
const api07 = require("./swagger/api07_design");
const api08 = require("./swagger/api08_production");
const api09 = require("./swagger/api09_sla");
const apiCustomer = require("./swagger/api_customer");
const apiPublic = require("./swagger/api_public");
const legacy = require("./swagger/legacy");

const modules = [
  api00,
  api01,
  api01Employee,
  api01Role,
  api02,
  api03,
  api04,
  api05,
  api06,
  api07,
  api08,
  api09,
  apiCustomer,
  apiPublic,
  legacy,
];

// Determine clean, human-readable tag without module numbers
function getCleanTag(path, rawTags = []) {
  const p = path.toLowerCase();

  if (p.startsWith("/public")) return "Public & Customer Self-Service";
  if (p.startsWith("/approvals")) return "Approvals";
  if (p.startsWith("/attachments")) return "Attachments";
  if (p.startsWith("/audit-logs")) return "Audit Logs";
  if (p.startsWith("/auth")) return "Authentication";
  if (p.startsWith("/branches")) return "Branches";
  if (p.startsWith("/customers")) return "Customers";

  if (p.startsWith("/departments")) return "Departments";
  if (p.startsWith("/designations")) return "Designations";
  if (p.startsWith("/employees")) return "Employees";
  if (p.startsWith("/inventory-balances")) return "Inventory Balances";
  if (p.startsWith("/inventory-items")) return "Inventory Items";
  if (p.startsWith("/inventory-transactions")) return "Inventory Transactions";
  if (p.startsWith("/jumbo-xerox")) return "Jumbo Xerox";
  if (p.startsWith("/number-sequences")) return "Number Sequences";
  if (p.startsWith("/past-date-requests") || p.startsWith("/past-date")) return "Past Date Requests";
  if (p.startsWith("/payments")) return "Payments to Collect";
  if (p.startsWith("/sale-receipts") || p.startsWith("/pos")) return "POS Sale Receipts";
  if (p.startsWith("/printer-readings")) return "Printer Readings";
  if (p.startsWith("/printers")) return "Printers";
  if (p.startsWith("/purchase-receipts")) return "Purchase Receipts";
  if (p.startsWith("/product-orders")) return "Product Orders";
  if (p.startsWith("/reports")) return "Reports & KPIs";
  if (p.startsWith("/total-amounts") || p.startsWith("/revenue")) return "Revenue & Total Amounts";
  if (p.startsWith("/roles") || p.startsWith("/permissions")) return "Roles & Permissions";
  if (p.startsWith("/general/categories") || p.startsWith("/general/finalized-dates") || p.startsWith("/categories")) return "Categories";
  if (p.startsWith("/general/sales") || p.startsWith("/sales")) return "Sales";
  if (p.startsWith("/stock-transfers")) return "Stock Transfers";
  if (p.startsWith("/stocks")) return "Stocks";
  if (p.startsWith("/users")) return "Users & RBAC";
  if (p.startsWith("/job-orders") || p.startsWith("/jobs")) return "Job Orders";
  if (p.startsWith("/design") || p.startsWith("/proof")) return "Design & Proofing";
  if (p.startsWith("/production-orders") || p.startsWith("/production-operations") || p.startsWith("/production-queue") || p.startsWith("/delivery-orders")) return "Production & Operations";
  if (p.startsWith("/quality-checks") || p.startsWith("/reprint-requests") || p.startsWith("/qc") || p.startsWith("/reprint")) return "Quality Control & Reprint";
  if (p.startsWith("/delivery") || p.startsWith("/logistics")) return "Delivery & Logistics";
  if (p.startsWith("/production")) return "Production & Operations";
  if (p.startsWith("/sla") || p.startsWith("/sla-configurations") || p.startsWith("/designer-ratings") || p.startsWith("/designers")) return "SLA & Performance";

  if (Array.isArray(rawTags) && rawTags.length > 0) {
    let clean = String(rawTags[0])
      .replace(/^API\s*\d+\s*[-—–]\s*/i, "")
      .replace(/^Support\s*[-—–]\s*/i, "")
      .replace(/^API\s*[-—–]\s*/i, "")
      .replace(/Employee Master/i, "Employees")
      .replace(/Authentication/i, "Authentication")
      .trim();
    if (clean) return clean;
  }
  return "General";
}

// Collect all schemas
const allSchemas = { ...commonSchemas };
modules.forEach((m) => {
  if (m.schemas) Object.assign(allSchemas, m.schemas);
});

// Collect all paths with clean tags, single-response-per-code, and no mock example blocks
const allPaths = {};
const tagNamesSet = new Set();

modules.forEach((m) => {
  if (m.paths) {
    Object.entries(m.paths).forEach(([path, methods]) => {
      allPaths[path] = allPaths[path] || {};
      Object.entries(methods).forEach(([method, def]) => {
        if (typeof def === "object" && def !== null) {
          const { summary, description, responses: rawResponses, tags: rawTags, ...restDef } = def;

          const cleanTag = getCleanTag(path, rawTags);
          tagNamesSet.add(cleanTag);

          const cleanResponses = {};
          if (rawResponses && typeof rawResponses === "object") {
            const seenCodes = new Set();
            Object.entries(rawResponses).forEach(([rawCode]) => {
              const code = String(rawCode).trim();
              if (seenCodes.has(code)) return;
              seenCodes.add(code);

              cleanResponses[code] = {
                description: "",
              };
            });
          }

          // Fallback if no response defined
          if (Object.keys(cleanResponses).length === 0) {
            cleanResponses["200"] = {
              description: "",
            };
          }

          // ONLY for GET methods: remove query filters for instant clean execution
          let cleanParameters = restDef.parameters;
          if (method.toLowerCase() === "get" && Array.isArray(cleanParameters)) {
            cleanParameters = cleanParameters.filter((p) => p.in === "path");
            if (cleanParameters.length === 0) {
              cleanParameters = undefined;
            }
          }

          allPaths[path][method] = {
            ...restDef,
            tags: [cleanTag],
            ...(cleanParameters !== undefined ? { parameters: cleanParameters } : {}),
            responses: cleanResponses,
          };

          if (method.toLowerCase() === "get" && cleanParameters === undefined) {
            delete allPaths[path][method].parameters;
          }
        } else {
          allPaths[path][method] = def;
        }
      });
    });
  }
});

// Sort all tags alphabetically
const allTags = Array.from(tagNamesSet)
  .sort((a, b) => a.localeCompare(b))
  .map((name) => ({ name }));

const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Printz API Explorer",
    version: "1.0.0",
  },
  servers: [
    {
      url: `http://localhost:${env.PORT || 5000}/api/v1`,
      description: "Local API v1 Development Server",
    },
    {
      url: "/api/v1",
      description: "Relative Path / Production Gateway",
    },
  ],
  tags: allTags,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your signed JWT access token in the format: Bearer <accessToken>",
      },
    },
    schemas: allSchemas,
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: allPaths,
};

module.exports = swaggerDocument;
