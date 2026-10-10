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
  if (p.startsWith("/general/inventory-movements")) return "Categories";
  if (p.startsWith("/stock-transfers")) return "Stock Transfers";
  if (p.startsWith("/stocks")) return "Stocks";
  if (p.startsWith("/users")) return "Users & RBAC";
  if (p.startsWith("/job-orders") || p.startsWith("/jobs")) return "Job Orders";
  if (p.startsWith("/design") || p.startsWith("/proof")) return "Design & Proofing";
  if (p.startsWith("/delivery-orders") || p.startsWith("/delivery") || p.startsWith("/logistics")) return "Delivery & Logistics";
  if (p.startsWith("/quality-checks") || p.startsWith("/reprint-requests") || p.startsWith("/qc") || p.startsWith("/reprint")) return "Quality Control & Reprint";
  if (p.startsWith("/production-orders") || p.startsWith("/production-operations") || p.startsWith("/production-queue") || p.startsWith("/production")) return "Production & Operations";
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

// Collect all paths with clean tags, full DTO request & response schemas, parameters, and unique operationIds
const allPaths = {};
const tagMetadataMap = new Map();

// Initialize tag metadata descriptions
const tagDescriptions = {
  "Approvals": "Multi-tier approval workflows for orders, reprints, discounts, and date alterations",
  "Attachments": "Digital file uploads and asset management",
  "Audit Logs": "Security, access, and change auditing history",
  "Authentication": "Staff authentication, JWT tokens, session lifecycle, and password resets",
  "Branches": "Store branch locations and facility configurations",
  "Categories": "Job item and product categories master",
  "Customers": "Centralized customer master and multi-branch search lookup",
  "Delivery & Logistics": "Packaging, dispatch, tracking, and final delivery order fulfillment",
  "Departments": "Organizational departments master",
  "Design & Proofing": "Design queue allocation, artwork proofing, and sample approval lifecycle",
  "Designations": "Staff designations and organizational roles master",
  "Employees": "Employee profiles, branch assignments, and status controls",
  "Inventory Balances": "Real-time stock balances across warehouses and branches",
  "Inventory Items": "Raw materials, paper substrates, and supplies master",
  "Inventory Transactions": "Detailed stock ledger transactions, adjustments, and movements",
  "Job Orders": "Job estimation, work orders, workflow stages, and invoices",
  "Jumbo Xerox": "Wide-format machines, meter readings, and configurations",
  "Number Sequences": "Sequential document numbering rules and counters",
  "POS Sale Receipts": "Retail POS checkout, pricing calculations, receipts, and returns",
  "Past Date Requests": "Retroactive date entry approval requests",
  "Payments to Collect": "Customer account balance collections and manual receipts",
  "Printer Readings": "Daily printer counter readings and meter audits",
  "Printers": "Digital production printing machinery master",
  "Product Orders": "Warehouse product orders, approval workflow, and fulfillment",
  "Production & Operations": "Shop-floor production orders, dynamic sequential operations, and tracking",
  "Public & Customer Self-Service": "Public QR customer intake and WhatsApp design proof approvals",
  "Purchase Receipts": "Vendor purchase order receipts and stock intake",
  "Quality Control & Reprint": "Quality assurance inspections, defect logging, and reprint requests",
  "Reports & KPIs": "Executive KPI dashboards and monthly revenue reporting",
  "Revenue & Total Amounts": "Daily cash register settlements and total reconciliations",
  "Roles & Permissions": "Role-based access control, permissions matrix, and capabilities",
  "SLA & Performance": "SLA turnaround configuration, live monitoring, and designer ratings",
  "Sales": "Direct retail sales recordings",
  "Stock Transfers": "Inter-branch and inter-warehouse inventory transfers",
  "Stocks": "Paper stock items and physical audit counts",
  "Users & RBAC": "User account management and role assignments",
};

modules.forEach((m) => {
  if (m.tags && Array.isArray(m.tags)) {
    m.tags.forEach((t) => {
      if (t && t.name) {
        const clean = t.name.replace(/^API\s*\d+\s*[-—–]\s*/i, "").trim();
        if (clean && !tagDescriptions[clean] && t.description) {
          tagDescriptions[clean] = t.description;
        }
      }
    });
  }

  if (m.paths) {
    Object.entries(m.paths).forEach(([path, methods]) => {
      allPaths[path] = allPaths[path] || {};
      Object.entries(methods).forEach(([method, def]) => {
        if (typeof def === "object" && def !== null) {
          const cleanTag = getCleanTag(path, def.tags);
          tagMetadataMap.set(cleanTag, tagDescriptions[cleanTag] || `${cleanTag} operations`);

          // Ensure summary exists for clean alphabetical sorting
          let summary = def.summary;
          if (!summary && def.operationId) {
            summary = def.operationId
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase())
              .trim();
          }

          // Format clean responses preserving complete schemas
          let responses = def.responses;
          if (!responses || typeof responses !== "object" || Object.keys(responses).length === 0) {
            responses = {
              200: {
                description: "Success",
                content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
              },
            };
          } else {
            // Ensure each response code has a non-empty description
            const formattedResponses = {};
            for (const [code, resObj] of Object.entries(responses)) {
              formattedResponses[code] = {
                description: (resObj && resObj.description) || (code === "201" ? "Created successfully" : code === "200" ? "Success" : "Response"),
                ...(resObj && resObj.content ? { content: resObj.content } : {}),
                ...(resObj && resObj.headers ? { headers: resObj.headers } : {}),
              };
            }
            responses = formattedResponses;
          }

          allPaths[path][method] = {
            ...def,
            tags: [cleanTag],
            summary: summary || `${method.toUpperCase()} ${path}`,
            description: def.description || summary || `${method.toUpperCase()} ${path}`,
            responses,
          };
        } else {
          allPaths[path][method] = def;
        }
      });
    });
  }
});

// Sort all tags strictly alphabetically
const allTags = Array.from(tagMetadataMap.keys())
  .sort((a, b) => a.localeCompare(b))
  .map((name) => ({
    name,
    description: tagMetadataMap.get(name) || `${name} operations`,
  }));

const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "PrintZ Enterprise Payment & Print Management API",
    version: "2.0.0",
    description: "Complete RESTful API specifications for PrintZ modules 01 through 09, centralized customer master, QR self-service, WhatsApp proof approvals, and supporting operations.",
  },
  servers: [
    {
      url: `http://localhost:${env.PORT || 5000}/api/v1`,
      description: "Local Development Server",
    },
    {
      url: "/api/v1",
      description: "Relative API Gateway Path",
    },
  ],
  tags: allTags,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Standard JWT Bearer authorization header. Format: Bearer <token>",
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
