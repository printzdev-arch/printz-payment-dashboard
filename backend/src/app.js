const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const { buildSwaggerDocument } = require("./docs/swagger");
const { enrichFromRoutes } = require("./docs/swagger/lib/enrich");
const { addAutoDocs } = require("./docs/swagger/lib/autoDocs");
const env = require("./config/env");
require("./modules/models");
const routes = require("./routes");
const notFound = require("./middleware/notFound.middleware");
const errorHandler = require("./middleware/error.middleware");
const { setupDesignEventListeners } = require("./modules/design/events/designEvents.listener");
const { setupSlaEventListeners } = require("./modules/sla/events/slaEvents.listener");
const { designAllocationService, slaSchedulerService } = require("./modules/services");

// Initialize design event listeners (auto-allocate on DESIGN_QUEUE, auto-release on cancel)
setupDesignEventListeners(designAllocationService);

// Initialize SLA event listeners
setupSlaEventListeners();

const app = express();

// Security Headers (Configured to permit Swagger UI inline scripts)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // The frontend runs on another origin and shows uploaded images (design previews, reference files)
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
const allowedOrigins = env.CLIENT_URL
  ? env.CLIENT_URL.split(",")
  : ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // Allow any localhost origin or configured client URLs
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        env.NODE_ENV === "development" ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy violation: Origin not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    // Idempotency-Key lets the sale order screens retry a payment safely without taking it twice
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Idempotency-Key"],
  })
);

// Gzip responses (large JSON lists shrink ~5-10x)
app.use(compression());

// Body Parsing
// rawBody is kept so the WhatsApp webhook signature can be verified
app.use(
  express.json({
    limit: "15mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Request Logging in dev
if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Health check endpoint for staging / production monitoring & load balancers
app.get(["/health", "/api/health", "/api/v1/health"], (req, res) => {
  const conn = require("mongoose").connection;
  const dbState = conn.readyState;
  const dbStatusMap = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    db: dbStatusMap[dbState] || "unknown",
    database: isHealthy ? conn.name : undefined,
    dbDetails: {
      status: dbStatusMap[dbState] || "unknown",
      readyState: dbState,
      name: isHealthy ? conn.name : undefined,
    },
    version: "1.0.0",
  });
});

// Root welcome route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Printz Payment Dashboard API",
    documentation: "/api-docs",
  });
});

// Static file serving for uploads (design proofs, attachments, samples)
const path = require("path");
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// Provider webhooks (no login; verified by signature)
const { whatsappWebhookRoutes } = require("./modules/sale-orders/routes");
app.use("/webhooks", whatsappWebhookRoutes);

// API Routes (Dual prefix support for /api/v1 and /api - more specific route mounted first)
app.use("/api/v1", routes);
app.use("/api", routes);

// Swagger / OpenAPI reference. Built after the routes are mounted so that any endpoint without a
// hand-written description is still listed (see docs/swagger/lib/enrich.js).
const swaggerDocument = enrichFromRoutes(buildSwaggerDocument(), app, routes.MOUNTS).doc;
// Request fields and example responses for every operation (see docs/swagger/lib/autoDocs.js)
addAutoDocs(swaggerDocument);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: ".swagger-ui .topbar { display: none; }",
    customSiteTitle: "PrintZ API Reference",
    swaggerOptions: {
      tagsSorter: "alpha",
      operationsSorter: "alpha",
      docExpansion: "none",
      filter: true,
      persistAuthorization: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  })
);
app.get("/api-docs.json", (req, res) => res.json(swaggerDocument));

// 404 & Global Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
