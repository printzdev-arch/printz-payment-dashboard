const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./infrastructure/config/swagger");
const env = require("./infrastructure/config/env");
const routes = require("./presentation/routes");
const notFound = require("./presentation/middleware/notFound.middleware");
const errorHandler = require("./presentation/middleware/error.middleware");
const { setupDesignEventListeners } = require("./shared/events/design/designEvents.listener");
const { setupSlaEventListeners } = require("./shared/events/sla/slaEvents.listener");
const DesignAllocationService = require("./application/services/design/designAllocation.service");
const slaSchedulerService = require("./application/services/sla/slaScheduler.service");

// Initialize design event listeners (auto-allocate on DESIGN_QUEUE, auto-release on cancel)
setupDesignEventListeners(DesignAllocationService);

// Initialize SLA event listeners & scheduler
setupSlaEventListeners();
if (env.NODE_ENV !== "test") {
  slaSchedulerService.startScheduler();
}

const app = express();

// Security Headers (Configured to permit Swagger UI inline scripts)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const allowedOrigins = env.CLIENT_URL ? env.CLIENT_URL.split(",") : ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"];
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
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body Parsing
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Request Logging in dev
if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Swagger / OpenAPI documentation UI
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .opblock-summary-description { display: none !important; }
      .swagger-ui .opblock-tag small, .swagger-ui .opblock-tag-description { display: none !important; }
      .swagger-ui .response-col_links { display: none !important; }
      .swagger-ui .responses-table .response-col_description__inner { display: none !important; }
    `,
    customSiteTitle: "Printz Payment Dashboard - Swagger API Explorer",
    swaggerOptions: {
      tagsSorter: "alpha",
      operationsSorter: "alpha",
      docExpansion: "list",
      filter: true,
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  })
);

// JSON spec endpoint
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerDocument);
});

// Health check endpoint for staging / production monitoring & load balancers
app.get(["/health", "/api/v1/health"], (req, res) => {
  const dbState = require("mongoose").connection.readyState;
  const dbStatusMap = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    database: {
      status: dbStatusMap[dbState] || "unknown",
      readyState: dbState,
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

// API Routes
app.use("/api", routes);
app.use("/api/v1", routes);

// 404 & Global Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
