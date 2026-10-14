/**
 * Swagger / OpenAPI 3.0 definition for Completion & Settlement Module (API 10)
 */

module.exports = {
  paths: {
  "/invoices/outstanding": {
    get: {
      tags: ["Settlement & Reports"],
      summary: "List outstanding invoices with remaining balance",
      description: "Retrieves finalized and partially paid invoices having positive balance due, with aging and overdue calculations.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "branchId", in: "query", schema: { type: "string" }, description: "Filter by branch ID" },
        { name: "customerId", in: "query", schema: { type: "string" }, description: "Filter by customer ID" },
        { name: "paymentStatus", in: "query", schema: { type: "string", enum: ["UNPAID", "PARTIAL"] } },
        { name: "overdue", in: "query", schema: { type: "boolean" }, description: "Filter only overdue invoices" },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
      ],
      responses: {
        200: { description: "Paginated list of outstanding invoices" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/invoices/{id}/settlement": {
    get: {
      tags: ["Settlement & Payments"],
      summary: "Get settlement details for an invoice",
      description: "Retrieves authoritative grand total, amount collected, balance due, payment status (UNPAID/PARTIAL/PAID), and payment ledger.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Invoice ID" },
      ],
      responses: {
        200: { description: "Settlement details retrieved successfully" },
        404: { description: "Invoice not found" },
      },
    },
  },

  "/invoices/{id}/payments": {
    post: {
      tags: ["Settlement & Payments"],
      summary: "Collect full or split payment against an invoice",
      description: "Records a payment, prevents overpayment, updates invoice and job order payment status (PARTIAL/PAID), and logs audit trail.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Invoice ID" },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["amount", "paymentMode"],
              properties: {
                amount: { type: "number", example: 500, description: "Monetary amount to collect" },
                paymentMode: { type: "string", enum: ["CASH", "CARD", "UPI", "BANK"], example: "CASH" },
                paymentReference: { type: "string", example: "UPI-TXN-98234", description: "External transaction / reference number" },
                paymentDate: { type: "string", format: "date-time" },
                remarks: { type: "string", example: "First split payment installment" },
                idempotencyKey: { type: "string", example: "PAY-IDEMP-001" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Payment collected and recorded successfully" },
        400: { description: "Bad request (Overpayment, invalid mode, or ineligible invoice)" },
        404: { description: "Invoice not found" },
      },
    },
    get: {
      tags: ["Settlement & Payments"],
      summary: "Get payment history for an invoice",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
      ],
      responses: {
        200: { description: "Paginated list of payments for invoice" },
      },
    },
  },

  "/payments/{id}": {
    get: {
      tags: ["Settlement & Payments"],
      summary: "Get payment details by ID",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Payment record retrieved successfully" },
        404: { description: "Payment not found" },
      },
    },
  },

  "/payments/{id}/receipt": {
    get: {
      tags: ["Settlement & Payments"],
      summary: "Generate printable receipt for a payment",
      description: "Generates tamper-evident payment receipt HTML / JSON with company header, payment amount, and cashier information.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Payment receipt representation" },
      },
    },
  },

  "/payments/{id}/void": {
    post: {
      tags: ["Settlement & Payments"],
      summary: "Void a payment and recalculate settlement",
      description: "Marks a payment VOID, reverses its contribution to invoice settlement, and recalculates outstanding balance.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["reason"],
              properties: {
                reason: { type: "string", example: "Entry recorded under wrong mode" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Payment voided and settlement adjusted successfully" },
        409: { description: "Payment is already void" },
      },
    },
  },

  "/invoices/{id}/reminders": {
    post: {
      tags: ["Settlement & Reminders"],
      summary: "Schedule payment reminder for outstanding invoice",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                reminderType: { type: "string", enum: ["DUE", "OVERDUE", "PAYMENT_FOLLOW_UP"], default: "PAYMENT_FOLLOW_UP" },
                channel: { type: "string", enum: ["EMAIL", "SMS", "WHATSAPP", "MANUAL"], default: "MANUAL" },
                scheduledAt: { type: "string", format: "date-time" },
                remarks: { type: "string", example: "Follow-up for pending balance" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Reminder scheduled successfully" },
      },
    },
    get: {
      tags: ["Settlement & Reminders"],
      summary: "Get reminder history for an invoice",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "List of reminders for invoice" },
      },
    },
  },

  "/job-orders/{id}/close": {
    post: {
      tags: ["Job Closure & Settlement"],
      summary: "Final administrative job closure",
      description: "Validates all prerequisites: physical delivery complete, all invoices fully settled (PAID, balanceDue <= 0), no blocking reprints. Locks job and writes workflow event.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                remarks: { type: "string", example: "Job delivered, payment settled in full, administratively closed." },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Job order administratively closed and locked successfully" },
        400: { description: "Bad request: Prerequisites not met (delivery pending or balance unpaid)" },
        409: { description: "Conflict: Job is already closed" },
      },
    },
  },

  "/job-orders/{id}/closure": {
    get: {
      tags: ["Job Closure & Settlement"],
      summary: "Get job closure status and prerequisite summary",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Job closure details and validation summary" },
      },
    },
  },

  "/job-orders/{id}/reopen": {
    post: {
      tags: ["Job Closure & Settlement"],
      summary: "Reopen a closed job order (Authorized admin review)",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["reason"],
              properties: {
                reason: { type: "string", example: "Customer requested additional copies under warranty" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Job reopened successfully" },
      },
    },
  },

  "/job-orders/{id}/feedback": {
    post: {
      tags: ["Customer Feedback & Ratings"],
      summary: "Submit customer feedback and rating for a job order",
      description: "Submits 1-5 star rating and optional comments. Validates job completion, resolves designer attribution from assignment history, and prevents duplicate ratings.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["rating"],
              properties: {
                rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
                comments: { type: "string", example: "Excellent print quality and fast delivery!" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Customer feedback submitted successfully" },
        400: { description: "Invalid rating or job not in completed state" },
        409: { description: "Feedback already submitted for this job" },
      },
    },
    get: {
      tags: ["Customer Feedback & Ratings"],
      summary: "Get customer feedback for a job order",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Feedback records for job order" },
      },
    },
  },

  "/reports/collections": {
    get: {
      tags: ["Settlement & Reports"],
      summary: "Collection summary report",
      description: "Aggregates collected payments by mode (CASH, CARD, UPI, BANK), total amounts, and transaction counts within date range.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "branchId", in: "query", schema: { type: "string" } },
        { name: "paymentMode", in: "query", schema: { type: "string", enum: ["CASH", "CARD", "UPI", "BANK"] } },
        { name: "from", in: "query", schema: { type: "string", format: "date" } },
        { name: "to", in: "query", schema: { type: "string", format: "date" } },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
      ],
      responses: {
        200: { description: "Collection report summary and breakdown" },
      },
    },
  },

  "/reports/sla": {
    get: {
      tags: ["Settlement & Reports"],
      summary: "SLA turnaround report across jobs",
      description: "Calculates stage-by-stage durations (design, production, delivery) and MET/BREACHED SLA status from workflow timestamps.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "branchId", in: "query", schema: { type: "string" } },
        { name: "from", in: "query", schema: { type: "string", format: "date" } },
        { name: "to", in: "query", schema: { type: "string", format: "date" } },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
      ],
      responses: {
        200: { description: "SLA turnaround report" },
      },
    },
  },

  "/reports/designer-ratings": {
    get: {
      tags: ["Settlement & Reports"],
      summary: "Designer ratings summary and star distribution report",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "designerId", in: "query", schema: { type: "string" } },
        { name: "from", in: "query", schema: { type: "string", format: "date" } },
        { name: "to", in: "query", schema: { type: "string", format: "date" } },
      ],
      responses: {
        200: { description: "Designer rating distribution and averages" },
      },
    },
  },
  },
};
