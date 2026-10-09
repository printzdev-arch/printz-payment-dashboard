/**
 * API 09 - SLA Tracking & Designer Performance Ratings Swagger
 */

module.exports = {
  tags: [
    { name: "API 09 — SLA & Performance" },
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
        tags: ["API 09 — SLA & Performance"],
        operationId: "getSlaConfigurations",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Configured turnaround targets across stages", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
      post: {
        tags: ["API 09 — SLA & Performance"],
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
    "/job-orders/{id}/sla": {
      get: {
        tags: ["API 09 — SLA & Performance"],
        description: "Computes SLA metrics stage-by-stage from actual workflow timestamps, excluding ON_HOLD pauses.",
        operationId: "getJobSla",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Live SLA evaluation results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/SlaEvaluationResponse" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/job-orders/{id}/designer-ratings": {
      post: {
        tags: ["API 09 — SLA & Performance"],
        description: "Captures post-delivery customer rating (1-5 scale) and recalculates designer quality performance.",
        operationId: "submitDesignerRating",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/DesignerRatingRequest" } } },
        },
        responses: {
          201: { description: "Rating recorded successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/designers/{id}/performance": {
      get: {
        tags: ["API 09 — SLA & Performance"],
        description: "Retrieves average turnaround time, revision counts, SLA compliance rate, and customer satisfaction score.",
        operationId: "getDesignerPerformance",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Performance KPI metrics", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
  },
};
