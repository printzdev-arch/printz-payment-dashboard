/**
 * API 07 - Design Queue, Designer Allocation & Sample Proofing Swagger
 */

module.exports = {
  tags: [
    { name: "Design & Proofing", description: "Design allocation, proofing samples, and approval workflow" },
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
    AssignDesignerRequest: {
      type: "object",
      required: ["designerId"],
      properties: {
        designerId: { $ref: "#/components/schemas/ObjectId", description: "Designer user ID" },
        instructions: { type: "string", example: "Follow client branding guidelines" },
      },
    },
    ReassignDesignerRequest: {
      type: "object",
      required: ["target"],
      properties: {
        target: { type: "string", example: "ROUND_ROBIN", description: "Designer user ID or 'ROUND_ROBIN'" },
        reason: { type: "string", example: "Original designer on emergency leave" },
      },
    },
    SampleDecisionRequest: {
      type: "object",
      required: ["decision"],
      properties: {
        decision: { type: "string", enum: ["APPROVED", "REVISION_REQUIRED"], example: "APPROVED" },
        feedback: { type: "string", example: "Approved with no changes needed" },
      },
    },
  },
  paths: {
    "/design/queue": {
      get: {
        tags: ["Design & Proofing"],
        summary: "List Unassigned Jobs in Design Queue",
        description: "Returns unassigned and pending jobs in the design queue for the current branch.",
        operationId: "getDesignQueue",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "branchId", in: "query", schema: { type: "string" } }],
        responses: {
          200: { description: "Jobs awaiting designer allocation", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/queue/auto-assign": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Auto-Assign All Eligible Queue Jobs",
        description: "Automatically allocates pending queue jobs to available designers using round-robin.",
        operationId: "autoAssignDesignQueue",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Auto-assignment completed successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/pool": {
      get: {
        tags: ["Design & Proofing"],
        summary: "List Active Designers in Pool",
        description: "Returns active designers available for assignment in the branch.",
        operationId: "getDesignerPool",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "List of designers in pool", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/workload": {
      get: {
        tags: ["Design & Proofing"],
        summary: "Get Designer Workload Metrics",
        description: "Returns active job load per designer to assist supervisors with manual assignments.",
        operationId: "getDesignerWorkload",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Designer workload metrics", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/my-jobs": {
      get: {
        tags: ["Design & Proofing"],
        summary: "List Current Designer Assigned Jobs",
        description: "Returns jobs currently assigned to the authenticated designer.",
        operationId: "getMyDesignJobs",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Jobs assigned to designer", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/jobs/{id}/auto-allocate": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Auto-Allocate Designer for Job",
        description: "Runs round-robin algorithm to allocate the next available designer for the given job.",
        operationId: "autoAllocateJobDesigner",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Job assigned to designer", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/jobs/{id}/assign": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Assign Designer Manually to Job",
        description: "Manually assigns a specific designer to the job order.",
        operationId: "assignDesignerToJob",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AssignDesignerRequest" } } },
        },
        responses: {
          200: { description: "Designer manually assigned", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/jobs/{id}/reassign": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Reassign Designer for Job",
        description: "Reassigns job order to a different designer or back to queue round-robin.",
        operationId: "reassignDesignerToJob",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ReassignDesignerRequest" } } },
        },
        responses: {
          200: { description: "Designer reassigned", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/jobs/{id}/assignments": {
      get: {
        tags: ["Design & Proofing"],
        summary: "Get Job Assignment History",
        description: "Retrieves complete chronological history of designer assignments for this job.",
        operationId: "getJobAssignmentHistory",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "List of assignment history records", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/jobs/{id}/accept": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Accept Assigned Design Job",
        description: "Allocated designer acknowledges and accepts the assigned job order.",
        operationId: "acceptJobAssignment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Assignment accepted", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/jobs/{id}/reject": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Reject Assigned Design Job",
        description: "Releases job back into queue for reallocation to next available designer.",
        operationId: "rejectJobAssignment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string", example: "Over capacity" } } } } },
        },
        responses: {
          200: { description: "Assignment rejected and returned to queue", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/jobs/{id}/start": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Start Design Work on Job",
        description: "Transitions job stage to DESIGN_IN_PROGRESS and starts SLA tracking timer.",
        operationId: "startJobDesign",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "Stage updated to DESIGN_IN_PROGRESS", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/jobs/{id}/samples": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Upload Proof Sample for Job",
        description: "Uploads design proof file or sample for customer review.",
        operationId: "uploadJobSample",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fileUrl"],
                properties: {
                  fileUrl: { type: "string", example: "/uploads/proofs/card_v1.pdf" },
                  thumbnailUrl: { type: "string", example: "/uploads/proofs/card_v1_thumb.jpg" },
                  notes: { type: "string", example: "Proof v1 uploaded" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Proof sample uploaded successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
      get: {
        tags: ["Design & Proofing"],
        summary: "List Proof Samples for Job",
        description: "Retrieves all proof sample versions and decisions for the job.",
        operationId: "listJobSamples",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: { description: "List of proof samples", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/jobs/{id}/samples/{sampleId}": {
      patch: {
        tags: ["Design & Proofing"],
        summary: "Update Proof Sample Notes",
        description: "Updates notes or preview metadata on an existing sample record.",
        operationId: "patchJobSample",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "sampleId", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { notes: { type: "string" } } } } },
        },
        responses: {
          200: { description: "Sample updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/jobs/{id}/samples/{sampleId}/submit": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Submit Sample for Customer Approval",
        description: "Generates approval token and triggers notification to customer (via WhatsApp / SMS / Email).",
        operationId: "submitJobSample",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "sampleId", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: { description: "Sample submitted for approval", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
    "/design/jobs/{id}/samples/{sampleId}/decide": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Record Proof Sample Approval Decision",
        description: "Staff records in-person or direct customer decision on the sample (APPROVED or REVISION_REQUIRED).",
        operationId: "decideJobSample",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "sampleId", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SampleDecisionRequest" } } },
        },
        responses: {
          200: { description: "Sample decision recorded", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        },
      },
    },
  },
};
