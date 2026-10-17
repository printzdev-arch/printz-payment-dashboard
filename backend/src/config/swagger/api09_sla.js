/**
 * API 09 - SLA Tracking & Designer Performance Ratings Swagger
 */

module.exports = {
  tags: [
    { name: "SLA & Performance", description: "Turnaround SLA configurations, live stage monitoring, and designer ratings" },
  ],
  schemas: {
    SlaConfigurationRequest: {
      type: "object",
      required: ["stage", "targetMinutes"],
      properties: {
        stage: { $ref: "#/components/schemas/JobStageEnum" },
        jobType: { type: "string", example: "VISITING_CARD" },
        priority: { $ref: "#/components/schemas/JobPriorityEnum" },
        targetMinutes: { type: "number", example: 60, description: "Target turnaround time in minutes" },
        warningMinutes: { type: "number", example: 45, description: "Threshold for APPROACHING status" },
        isActive: { type: "boolean", example: true },
      },
    },
    SlaConfigurationResponse: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        stage: { $ref: "#/components/schemas/JobStageEnum" },
        jobType: { type: "string", example: "VISITING_CARD" },
        priority: { $ref: "#/components/schemas/JobPriorityEnum" },
        targetMinutes: { type: "number", example: 60 },
        warningMinutes: { type: "number", example: 45 },
        isActive: { type: "boolean", example: true },
        createdAt: { $ref: "#/components/schemas/DateTimeString" },
      },
    },
    SlaEvaluationResponse: {
      type: "object",
      properties: {
        jobOrderId: { $ref: "#/components/schemas/ObjectId" },
        overallStatus: { type: "string", enum: ["WITHIN_SLA", "APPROACHING", "BREACHED"], example: "WITHIN_SLA" },
        stages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              stage: { type: "string", example: "DESIGN_IN_PROGRESS" },
              targetMinutes: { type: "number", example: 60 },
              actualMinutes: { type: "number", example: 38 },
              status: { type: "string", example: "WITHIN_SLA" },
            },
          },
        },
      },
    },
    DesignerRatingRequest: {
      type: "object",
      required: ["rating"],
      properties: {
        rating: { type: "number", minimum: 1, maximum: 5, example: 5, description: "Customer satisfaction rating on 1-5 scale" },
        feedback: { type: "string", example: "Super fast turnaround and accurate colors." },
      },
    },
  },
  paths: {
    "/sla-configurations": {
      get: {
        tags: ["SLA & Performance"],
        summary: "List SLA Configurations",
        description: "Returns configured turnaround targets and warning thresholds across stages.",
        operationId: "getSlaConfigurations",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Configured turnaround targets across stages", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
      post: {
        tags: ["SLA & Performance"],
        summary: "Create SLA Configuration",
        description: "Creates target turnaround SLA rule for a specific stage, priority, or job type.",
        operationId: "createSlaConfiguration",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SlaConfigurationRequest" } } },
        },
        responses: {
          201: { description: "SLA rule created", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/sla-configurations/{id}": {
      get: {
        tags: ["SLA & Performance"],
        summary: "Get SLA Configuration by ID",
        description: "Retrieves details of an individual SLA configuration.",
        operationId: "getSlaConfigurationById",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "SLA rule details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
      patch: {
        tags: ["SLA & Performance"],
        summary: "Update SLA Configuration",
        description: "Updates threshold minutes or active status on an existing SLA rule.",
        operationId: "patchSlaConfiguration",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { targetMinutes: { type: "number" }, warningMinutes: { type: "number" } } } } },
        },
        responses: {
          200: { description: "SLA rule updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/sla-configurations/{id}/deactivate": {
      post: {
        tags: ["SLA & Performance"],
        summary: "Deactivate SLA Configuration",
        description: "Deactivates an active SLA configuration.",
        operationId: "deactivateSlaConfiguration",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "SLA rule deactivated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/sla/summary": {
      get: {
        tags: ["SLA & Performance"],
        summary: "Get Overall SLA Performance Summary",
        description: "Aggregates branch-wide SLA adherence metrics, total breaches, and on-time delivery rate.",
        operationId: "getSlaSummary",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "SLA performance summary", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/sla/at-risk": {
      get: {
        tags: ["SLA & Performance"],
        summary: "List Jobs Approaching or Breached SLA",
        description: "Returns urgent active jobs that are currently breaching or approaching SLA deadlines.",
        operationId: "getAtRiskSlaJobs",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Jobs at risk of SLA breach", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/designer-ratings": {
      get: {
        tags: ["SLA & Performance"],
        summary: "List Customer Designer Feedback Ratings",
        description: "Returns customer ratings and qualitative feedback submitted for designers.",
        operationId: "getDesignerRatings",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "List of designer ratings", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/designers/performance": {
      get: {
        tags: ["SLA & Performance"],
        summary: "Get Designer Performance Metrics & Ranking",
        description: "Computes turnaround time, rework percentage, rating averages, and productivity metrics per designer.",
        operationId: "getDesignersPerformance",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Designer performance leaderboard and metrics", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/designers/{employeeId}/performance/trend": {
      get: {
        tags: ["SLA & Performance"],
        summary: "Get Designer Historical Performance Trend",
        description: "Returns historical performance trends and turnaround time history for an individual designer.",
        operationId: "getDesignerPerformanceTrend",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "employeeId", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Historical performance trend", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
  },
};
