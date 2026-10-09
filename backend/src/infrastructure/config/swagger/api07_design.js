/**
 * API 07 - Design Queue, Designer Allocation & Sample Proofing Swagger
 */

module.exports = {
  tags: [
    { name: "API 07 — Design Workflow & Proofing" },
  ],
  schemas: {
    JobAssignmentResponse: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        jobOrderId: { $ref: "#/components/schemas/ObjectId" },
        designerId: { $ref: "#/components/schemas/ObjectId" },
        status: { $ref: "#/components/schemas/AssignmentStatusEnum" },
        assignmentMethod: { type: "string", enum: ["ROUND_ROBIN", "MANUAL", "REASSIGN"], example: "ROUND_ROBIN" },
        currentAssignment: { type: "boolean", example: true },
        assignedAt: { $ref: "#/components/schemas/DateTimeString" },
        acceptedAt: { $ref: "#/components/schemas/DateTimeString", nullable: true },
        startedAt: { $ref: "#/components/schemas/DateTimeString", nullable: true },
      },
    },
    JobSampleResponse: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        jobOrderId: { $ref: "#/components/schemas/ObjectId" },
        versionNo: { type: "integer", example: 1 },
        revisionNo: { type: "integer", example: 0 },
        fileUrl: { type: "string", example: "/uploads/samples/sample_v1_preview.pdf" },
        thumbnailUrl: { type: "string", example: "/uploads/samples/sample_v1_thumb.jpg" },
        status: { $ref: "#/components/schemas/SampleStatusEnum" },
        submittedAt: { $ref: "#/components/schemas/DateTimeString", nullable: true },
        decisionAt: { $ref: "#/components/schemas/DateTimeString", nullable: true },
        customerFeedback: { type: "string", example: "Please increase font size on back side" },
      },
    },
  },
  paths: {
    "/design/queue": {
      get: {
        tags: ["API 07 — Design Workflow & Proofing"],
        description: "Returns unassigned and pending jobs in the design queue for the current branch.",
        operationId: "getDesignQueue",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "branchId", in: "query", schema: { type: "string" } }],
        responses: {
          200: { description: "Jobs awaiting designer allocation", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/workload": {
      get: {
        tags: ["API 07 — Design Workflow & Proofing"],
        description: "Returns active job load per designer to assist supervisors with manual assignments.",
        operationId: "getDesignerWorkload",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Designer workload metrics", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/job-orders/{id}/assignments/current/accept": {
      post: {
        tags: ["API 07 — Design Workflow & Proofing"],
        description: "Allocated designer acknowledges and accepts the assigned job order, locking the assignment (Scope: ASSIGNED).",
        operationId: "acceptDesignerAssignment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Assignment accepted", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
          403: { description: "Forbidden - Not assigned to this designer", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } } },
        },
      },
    },
    "/job-orders/{id}/assignments/current/reject": {
      post: {
        tags: ["API 07 — Design Workflow & Proofing"],
        description: "Releases job back into DESIGN_QUEUE for round-robin reallocation to next available designer.",
        operationId: "rejectDesignerAssignment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string", example: "Over capacity today" } } } } },
        },
        responses: {
          200: { description: "Assignment rejected and returned to queue", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/job-orders/{id}/design/start": {
      post: {
        tags: ["API 07 — Design Workflow & Proofing"],
        description: "Transitions job stage to DESIGN_IN_PROGRESS and starts the design turnaround SLA timer.",
        operationId: "startDesign",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Stage updated to DESIGN_IN_PROGRESS", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/job-orders/{id}/samples": {
      get: {
        tags: ["API 07 — Design Workflow & Proofing"],
        operationId: "getJobSamples",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "List of versioned samples",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "array", items: { $ref: "#/components/schemas/JobSampleResponse" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/job-orders/{id}/samples/{sampleId}/submit": {
      post: {
        tags: ["API 07 — Design Workflow & Proofing"],
        description: "Uploads/submits proof sample version and advances job to SAMPLE_APPROVAL.",
        operationId: "submitSample",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "sampleId", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: { description: "Sample submitted for client approval", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/job-orders/{id}/samples/{sampleId}/decision": {
      post: {
        tags: ["API 07 — Design Workflow & Proofing"],
        description: "Records customer approval (moves to PRODUCTION_PLANNING) or revision request (moves to REVISION).",
        operationId: "decideSample",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "sampleId", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["decision"],
                properties: {
                  decision: { type: "string", enum: ["APPROVED", "REVISION_REQUIRED"], example: "APPROVED" },
                  feedback: { type: "string", example: "Proof looks great, proceed to print." },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Decision recorded and job stage transitioned", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
  },
};
