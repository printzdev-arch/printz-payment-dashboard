/**
 * Swagger / OpenAPI Specification for Public Customer Endpoints:
 * - Customer QR Self-Service Job Requests
 * - WhatsApp Sample Design Approvals
 */

module.exports = {
  paths: {
    "/public/job-requests": {
      post: {
        tags: ["Public & Customer Self-Service"],
        summary: "Customer QR Self-Service Job Request",
        description:
          "Public mobile form endpoint that accepts customer job requests initiated via QR code. Validates authorized branch via branchCode, matches or creates customer, and initializes JobOrder in ENQUIRY/DRAFT stage.",
        operationId: "submitPublicJobRequest",
        parameters: [
          {
            name: "branchCode",
            in: "query",
            description: "Branch code if provided via QR query parameter (e.g. MAIN, BR01)",
            schema: { type: "string", example: "MAIN" },
          },
          {
            name: "Idempotency-Key",
            in: "header",
            description: "Optional client request UUID to prevent duplicate job creation",
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["customerName", "customerPhone", "title"],
                properties: {
                  branchCode: { type: "string", example: "MAIN", description: "Authorized branch code" },
                  customerName: { type: "string", example: "Rajesh Kumar" },
                  customerPhone: { type: "string", example: "9876543210" },
                  customerEmail: { type: "string", example: "rajesh@example.com" },
                  customerCompany: { type: "string", example: "Kumar Enterprises" },
                  customerAddress: { type: "string", example: "123 Market Road, Chennai" },
                  customerGstin: { type: "string", example: "33AAAAA0000A1Z5" },
                  title: { type: "string", example: "Visiting Cards 350 GSM Matte" },
                  jobType: { type: "string", example: "PRINT_JOB" },
                  quantity: { type: "integer", default: 1, example: 500 },
                  paperSize: { type: "string", example: "3.5 x 2 inches" },
                  paperType: { type: "string", example: "350 GSM Art Card" },
                  printingType: { type: "string", example: "Digital Offset" },
                  colorMode: { type: "string", example: "CMYK" },
                  sides: { type: "string", enum: ["SINGLE", "DOUBLE"], example: "DOUBLE" },
                  finishing: {
                    type: "array",
                    items: { type: "string" },
                    example: ["MATTE_LAMINATION", "ROUND_CORNER"],
                  },
                  dueDate: { type: "string", format: "date-time", example: "2026-10-15T18:00:00Z" },
                  customerRequirements: { type: "string", example: "Need vibrant colors and premium velvet finish" },
                  remarks: { type: "string", example: "Please send sample proof via WhatsApp" },
                  idempotencyKey: { type: "string", example: "client-req-uuid-12345" },
                },
              },
            },
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["customerName", "customerPhone", "title"],
                properties: {
                  branchCode: { type: "string", example: "MAIN" },
                  customerName: { type: "string", example: "Rajesh Kumar" },
                  customerPhone: { type: "string", example: "9876543210" },
                  title: { type: "string", example: "Flyer Printing A4" },
                  quantity: { type: "integer", example: 1000 },
                  files: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                    description: "Up to 5 reference artwork files (PDF, PNG, JPG, AI, CDR)",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Job Order request submitted and created in DRAFT/ENQUIRY stage",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        jobNo: { type: "string", example: "JO-20261010-0001" },
                        title: { type: "string", example: "Visiting Cards" },
                        stage: { type: "string", example: "ENQUIRY" },
                        status: { type: "string", example: "DRAFT" },
                        quantity: { type: "number", example: 500 },
                        branch: {
                          type: "object",
                          properties: {
                            code: { type: "string", example: "MAIN" },
                            name: { type: "string", example: "Main Branch" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Validation failure or invalid branch identifier" },
          404: { description: "Branch code not found" },
          429: { description: "Too many requests from this IP" },
        },
      },
    },

    "/public/design-approvals/{token}": {
      get: {
        tags: ["Public & Customer Self-Service"],
        summary: "Retrieve Design Sample Preview for Customer",
        description:
          "Public endpoint accessed by customer via WhatsApp link. Validates cryptographic token and returns safe artwork preview without exposing internal financials.",
        operationId: "getPublicDesignPreview",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            description: "Cryptographic approval token sent via WhatsApp",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Design sample details and safe preview URL",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        jobNo: { type: "string", example: "JO-20261010-0001" },
                        jobTitle: { type: "string", example: "Visiting Cards" },
                        versionNo: { type: "number", example: 1 },
                        revisionNo: { type: "number", example: 0 },
                        designerComments: { type: "string", example: "Proof attached for your review" },
                        artworkUrl: { type: "string", example: "/api/v1/public/design-approvals/token123/artwork" },
                        status: { type: "string", example: "ACTIVE" },
                        isPendingDecision: { type: "boolean", example: true },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: "Token not found or invalid" },
          409: { description: "Sample superseded by a newer version" },
          410: { description: "Approval link expired" },
        },
      },
    },

    "/public/design-approvals/{token}/artwork": {
      get: {
        tags: ["Public & Customer Self-Service"],
        summary: "Stream Sample Artwork Preview Image",
        description: "Streams the artwork file safely for the customer viewing the sample on mobile WhatsApp.",
        operationId: "getPublicDesignArtwork",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Binary image file stream",
            content: {
              "image/png": { schema: { type: "string", format: "binary" } },
              "image/jpeg": { schema: { type: "string", format: "binary" } },
            },
          },
          404: { description: "Artwork file not found" },
        },
      },
    },

    "/public/design-approvals/{token}/decision": {
      post: {
        tags: ["Public & Customer Self-Service"],
        summary: "Submit Customer Approval or Revision Decision",
        description:
          "Records customer decision (APPROVED -> moves to PRODUCTION_PLANNING, or REVISION_REQUIRED -> moves to REVISION). Enforces atomic single-use token consumption and notifies assigned staff.",
        operationId: "submitPublicDesignDecision",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["decision"],
                properties: {
                  decision: {
                    type: "string",
                    enum: ["APPROVED", "REVISION_REQUIRED"],
                    example: "APPROVED",
                  },
                  feedback: {
                    type: "string",
                    example: "Colors look great! Please proceed with printing.",
                    description: "Customer comments (required if decision is REVISION_REQUIRED)",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Decision recorded and workflow transitioned",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        jobNo: { type: "string", example: "JO-20261010-0001" },
                        versionNo: { type: "number", example: 1 },
                        decision: { type: "string", example: "APPROVED" },
                        nextStage: { type: "string", example: "PRODUCTION_PLANNING" },
                        message: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Validation failure (e.g. missing feedback on revision)" },
          409: { description: "Token already decided or superseded" },
          410: { description: "Token expired" },
        },
      },
    },

    "/branches/{branchId}/job-request-qr": {
      get: {
        tags: ["Branches"],
        summary: "Get Branch Public QR Job-Request Configuration",
        description:
          "Authorized staff endpoint to retrieve public URL and QR code configuration for a branch. Enforces branch RBAC.",
        operationId: "getBranchJobRequestQr",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "branchId",
            in: "path",
            required: true,
            description: "Branch ObjectId",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Branch QR configuration with validated public job-request URL",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        branchId: { type: "string" },
                        branchCode: { type: "string", example: "MAIN" },
                        branchName: { type: "string", example: "Main Branch" },
                        publicJobRequestUrl: {
                          type: "string",
                          example: "http://localhost:5173/public/job-requests?branchCode=MAIN",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          403: { description: "Forbidden: Not authorized for this branch" },
          404: { description: "Branch not found" },
        },
      },
    },
  },
};
