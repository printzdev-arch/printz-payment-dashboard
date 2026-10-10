/**
 * API 06 - Custom Job Orders Lifecycle & Estimation Swagger Documentation
 */

module.exports = {
  tags: [{ name: "Job Orders" }],
  schemas: {
    JobOrderCreateRequest: {
      type: "object",
      required: ["branchId", "items"],
      properties: {
        branchId: { $ref: "#/components/schemas/ObjectId" },
        customerId: { $ref: "#/components/schemas/ObjectId", nullable: true },
        customerSnapshot: {
          type: "object",
          properties: {
            name: { type: "string", example: "Acme Prints Ltd" },
            mobile: { type: "string", example: "9876543210" },
            email: { type: "string", example: "contact@acmeprints.com" },
            company: { type: "string", example: "Acme Corp" },
            gstin: { type: "string", example: "29AAAAA0000A1Z5" },
          },
        },
        priority: { $ref: "#/components/schemas/JobPriorityEnum" },
        jobType: { type: "string", example: "VISITING_CARD" },
        title: { type: "string", example: "Premium Visiting Cards 500 pcs" },
        dueDate: { $ref: "#/components/schemas/DateTimeString", nullable: true },
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["description", "quantity", "unitRate"],
            properties: {
              description: { type: "string", example: "350 GSM Velvet Touch Visiting Cards" },
              quantity: { type: "number", example: 500 },
              unit: { type: "string", example: "PCS" },
              unitRate: { type: "number", example: 2.5 },
              taxRate: { type: "number", example: 18 },
            },
          },
        },
        submitForEstimateApproval: { type: "boolean", example: true },
        isPrintReady: { type: "boolean", example: false, description: "If true, validated print-ready file bypasses design stages" },
      },
    },
    JobOrderUpdateRequest: {
      type: "object",
      properties: {
        title: { type: "string", example: "Updated Job Title" },
        priority: { $ref: "#/components/schemas/JobPriorityEnum" },
        dueDate: { $ref: "#/components/schemas/DateTimeString" },
        notes: { type: "string", example: "Urgent dispatch requested" },
      },
    },
    JobOrderEstimateRequest: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["description", "quantity", "unitRate"],
            properties: {
              description: { type: "string", example: "Flyers A5" },
              quantity: { type: "number", example: 1000 },
              unitRate: { type: "number", example: 1.2 },
            },
          },
        },
        discountAmount: { type: "number", example: 50 },
      },
    },
    JobOrderResponse: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        jobNo: { type: "string", example: "JOB-202610-0001" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        title: { type: "string", example: "Premium Visiting Cards 500 pcs" },
        currentStage: { $ref: "#/components/schemas/JobStageEnum" },
        status: { $ref: "#/components/schemas/JobStatusEnum" },
        priority: { $ref: "#/components/schemas/JobPriorityEnum" },
        jobType: { type: "string", example: "VISITING_CARD" },
        customerSnapshot: { type: "object" },
        subtotal: { $ref: "#/components/schemas/DecimalString" },
        taxAmount: { $ref: "#/components/schemas/DecimalString" },
        grandTotal: { $ref: "#/components/schemas/DecimalString" },
        estimationStatus: { type: "string", enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"], example: "APPROVED" },
        isPrintReady: { type: "boolean", example: false },
        createdAt: { $ref: "#/components/schemas/DateTimeString" },
      },
    },
    JobWorkflowEventResponse: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        jobOrderId: { $ref: "#/components/schemas/ObjectId" },
        fromStage: { $ref: "#/components/schemas/JobStageEnum" },
        toStage: { $ref: "#/components/schemas/JobStageEnum" },
        durationMinutes: { type: "number", example: 45.5 },
        actorId: { $ref: "#/components/schemas/ObjectId" },
        timestamp: { $ref: "#/components/schemas/DateTimeString" },
      },
    },
  },
  paths: {
    "/job-orders": {
      get: {
        tags: ["Job Orders"],
        summary: "List Job Orders",
        operationId: "listJobOrders",
        description: "Retrieves paginated list of job orders with filters by stage, priority, branch, search.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "stage", in: "query", schema: { $ref: "#/components/schemas/JobStageEnum" } },
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/JobStatusEnum" } },
          { name: "priority", in: "query", schema: { $ref: "#/components/schemas/JobPriorityEnum" } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Filter by jobNo, title, or customer name" },
          { name: "branchId", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "List of job orders",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["Job Orders"],
        summary: "Create Job Order",
        operationId: "createJobOrder",
        description: "Creates a new JobOrder, items, and initial workflow event inside an ACID transaction.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/JobOrderCreateRequest" } } },
        },
        responses: {
          201: {
            description: "Job order created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/counts": {
      get: {
        tags: ["Job Orders"],
        summary: "Get Job Order Counts",
        operationId: "getJobOrderCounts",
        description: "Returns stage and status metric counts for active job orders.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Job order counts",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/status-counts": {
      get: {
        tags: ["Job Orders"],
        summary: "Get Job Order Status Counts",
        operationId: "getJobOrderStatusCounts",
        description: "Alias for counts endpoint returning job status distribution.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Status counts retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}": {
      get: {
        tags: ["Job Orders"],
        summary: "Get Job Order by ID",
        operationId: "getJobOrderById",
        description: "Retrieves complete details of a specific job order including items and customer snapshot.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Job order retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
          404: {
            description: "Job order not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } },
          },
        },
      },
      patch: {
        tags: ["Job Orders"],
        summary: "Update Job Order",
        operationId: "updateJobOrder",
        description: "Partially updates job order properties such as title, priority, or due date.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/JobOrderUpdateRequest" } } },
        },
        responses: {
          200: {
            description: "Job order updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/approvals": {
      get: {
        tags: ["Job Orders"],
        summary: "Get Job Approval History",
        operationId: "getJobApprovalHistory",
        description: "Returns approval records for estimates and discounts on this job order.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Approval history retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/assignments": {
      get: {
        tags: ["Design & Proofing"],
        summary: "Get Job Assignment History",
        operationId: "getJobOrderAssignments",
        description: "Returns designer allocation history for this job order.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Assignment history retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["Design & Proofing"],
        summary: "Assign Designer to Job",
        operationId: "assignJobOrderDesigner",
        description: "Manually assigns a designer to the job order.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["designerId"],
                properties: { designerId: { $ref: "#/components/schemas/ObjectId" }, notes: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Designer assigned",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/assignments/current/accept": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Accept Current Job Assignment",
        operationId: "acceptCurrentJobAssignment",
        description: "Designer accepts assigned job.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Assignment accepted",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/assignments/current/reject": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Reject Current Job Assignment",
        operationId: "rejectCurrentJobAssignment",
        description: "Designer rejects assigned job with a reason.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["reason"],
                properties: { reason: { type: "string", example: "Workload overloaded" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Assignment rejected",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/assignments/reassign": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Reassign Designer on Job",
        operationId: "reassignDesignerOnJob",
        description: "Reassigns job order to a different designer.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["newDesignerId"],
                properties: { newDesignerId: { $ref: "#/components/schemas/ObjectId" }, reason: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Designer reassigned",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/cancel": {
      post: {
        tags: ["Job Orders"],
        summary: "Cancel Job Order",
        operationId: "cancelJobOrder",
        description: "Cancels job order and records cancellation rationale.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { reason: { type: "string", example: "Customer requested cancellation" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Job order cancelled",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/design/start": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Start Design Work on Job",
        operationId: "startDesignWorkOnJob",
        description: "Transitions job stage to DESIGN_IN_PROGRESS.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Design started",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/designer-ratings": {
      post: {
        tags: ["SLA & Performance"],
        summary: "Submit Designer Rating for Job",
        operationId: "submitDesignerRatingForJob",
        description: "Captures customer satisfaction score (1-5) and feedback for the designer.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/DesignerRatingRequest" } } },
        },
        responses: {
          201: {
            description: "Rating submitted",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/estimate": {
      post: {
        tags: ["Job Orders"],
        summary: "Calculate Job Estimate",
        operationId: "calculateJobEstimate",
        description: "Quotes unit rates, materials, and discounts to compute an official estimate.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/JobOrderEstimateRequest" } } },
        },
        responses: {
          200: {
            description: "Estimate calculated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/estimate/approve": {
      post: {
        tags: ["Job Orders"],
        summary: "Approve Job Estimate",
        operationId: "approveJobEstimate",
        description: "Approves estimate and advances job to DESIGN_QUEUE or PRODUCTION_PLANNING.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { comments: { type: "string", example: "Approved by client" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Estimate approved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/estimate/reject": {
      post: {
        tags: ["Job Orders"],
        summary: "Reject Job Estimate",
        operationId: "rejectJobEstimate",
        description: "Rejects estimate and returns job order to ESTIMATION stage for re-pricing.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { reason: { type: "string", example: "Client requested discount" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Estimate rejected",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/files": {
      get: {
        tags: ["Job Orders"],
        summary: "List Job Files",
        operationId: "listJobFiles",
        description: "Retrieves customer-uploaded and staff design files bound to the job order.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "List of job files",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["Job Orders"],
        summary: "Upload Job File",
        operationId: "uploadJobFile",
        description: "Uploads an artwork or specifications file to the job order.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fileUrl", "fileName"],
                properties: {
                  fileUrl: { type: "string", example: "/uploads/job/art.pdf" },
                  fileName: { type: "string", example: "art.pdf" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "File uploaded successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/hold": {
      post: {
        tags: ["Job Orders"],
        summary: "Hold Job Order",
        operationId: "holdJobOrder",
        description: "Pauses job progress and halts active SLA timing.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { reason: { type: "string", example: "Awaiting client clarification" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Job order put on hold",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/invoice": {
      get: {
        tags: ["Job Orders"],
        summary: "Get Job Invoice",
        operationId: "getJobInvoice",
        description: "Retrieves generated invoice details for the job order.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Job invoice details",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["Job Orders"],
        summary: "Generate Job Invoice",
        operationId: "generateJobInvoice",
        description: "Generates finalized sales invoice for completed job order.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          201: {
            description: "Invoice generated successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/items": {
      put: {
        tags: ["Job Orders"],
        summary: "Replace Job Order Items",
        operationId: "replaceJobOrderItems",
        description: "Replaces line items on a job order and updates financials.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/JobOrderCreateRequest" } } },
        },
        responses: {
          200: {
            description: "Items replaced",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/production/plan": {
      post: {
        tags: ["Production & Operations"],
        summary: "Plan Production for Job",
        operationId: "planProductionForJob",
        description: "Creates ProductionOrder and generates dynamic sequential operations.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          201: {
            description: "Production planned successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/reprint-requests": {
      post: {
        tags: ["Quality Control & Reprint"],
        summary: "Request Reprint for Job",
        operationId: "requestReprintForJob",
        description: "Submits a reprint request requiring supervisor approval.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["reason", "quantity"],
                properties: {
                  reason: { type: "string", example: "Color mismatch" },
                  quantity: { type: "number", example: 100 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Reprint requested",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/resume": {
      post: {
        tags: ["Job Orders"],
        summary: "Resume Job Order",
        operationId: "resumeJobOrder",
        description: "Resumes on-hold job order, returning it to previous active stage.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Job order resumed",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/samples": {
      get: {
        tags: ["Design & Proofing"],
        summary: "List Design Samples for Job",
        operationId: "listDesignSamplesForJob",
        description: "Lists all proof versions and revision samples uploaded for this job order.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Samples list",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
      post: {
        tags: ["Design & Proofing"],
        summary: "Upload Design Sample for Job",
        operationId: "uploadDesignSampleForJob",
        description: "Uploads a design sample preview file.",
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
                  fileUrl: { type: "string", example: "/uploads/samples/sample_v1.pdf" },
                  thumbnailUrl: { type: "string" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Sample uploaded",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/samples/{sampleId}": {
      patch: {
        tags: ["Design & Proofing"],
        summary: "Update Design Sample for Job",
        operationId: "updateDesignSampleForJob",
        description: "Updates sample metadata before submission.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "sampleId", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { notes: { type: "string" } } } } },
        },
        responses: {
          200: {
            description: "Sample updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/samples/{sampleId}/decision": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Record Decision for Design Sample",
        operationId: "recordDecisionForDesignSample",
        description: "Staff records customer decision (APPROVED or REVISION_REQUIRED).",
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
                  decision: { type: "string", enum: ["APPROVED", "REVISION_REQUIRED"] },
                  customerFeedback: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Decision recorded",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/samples/{sampleId}/submit": {
      post: {
        tags: ["Design & Proofing"],
        summary: "Submit Design Sample for Job",
        operationId: "submitDesignSampleForJob",
        description: "Submits sample for customer proofing, creating a single-use approval token and WhatsApp notification.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
          { name: "sampleId", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } },
        ],
        responses: {
          200: {
            description: "Sample submitted and approval link generated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/skip-design": {
      post: {
        tags: ["Job Orders"],
        summary: "Skip Design Workflow",
        operationId: "skipJobDesignWorkflow",
        description: "Advances job order directly to PRODUCTION_PLANNING if artwork is already print-ready.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { notes: { type: "string", example: "Customer supplied print-ready vector artwork" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Design workflow skipped",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/sla": {
      get: {
        tags: ["SLA & Performance"],
        summary: "Get Job SLA Evaluation",
        operationId: "getJobSlaEvaluation",
        description: "Computes live SLA status stage-by-stage based on transition history timestamps.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Job SLA evaluation",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
    "/job-orders/{id}/workflow-events": {
      get: {
        tags: ["Job Orders"],
        summary: "Get Job Workflow Events",
        operationId: "getJobWorkflowEvents",
        description: "Returns chronological timeline of workflow state transitions.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { $ref: "#/components/schemas/ObjectId" } }],
        responses: {
          200: {
            description: "Workflow events",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } },
          },
        },
      },
    },
  },
};
