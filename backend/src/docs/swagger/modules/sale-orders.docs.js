/**
 * Sale Orders (Branch -> Manufacturing Unit) and the Manufacturing Unit portal.
 * Payloads here follow the validation in modules/sale-orders/services, so every
 * example is accepted by the API as written.
 */
const { schemaRef, jsonBody, okResponse, pagedResponse, errors, pathId, paramRef } = require("../lib/openapi");

// Example dates are computed when the server starts, so the examples never go stale
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const TAG = "Sale Orders";
const TAG_MFG = "Manufacturing Unit";
const idParam = pathId("id", "Sale order id");
const versionParam = { name: "v", in: "path", required: true, description: "Design version number", schema: { type: "integer", minimum: 1, example: 1 } };

const STATUSES = [
  "DRAFT", "PLACED", "WAITING_FOR_DESIGNER", "ASSIGNED", "IN_DESIGN", "SENT_FOR_APPROVAL",
  "CHANGES_REQUESTED", "APPROVED", "PRINTING", "DISPATCHED", "RECEIVED_AT_BRANCH", "DELIVERED", "CANCELLED",
];
const PAY_MODES = ["CASH", "UPI", "CARD", "BANK_TRANSFER"];

const money = (example, description) => ({ type: "number", minimum: 0, example, ...(description ? { description } : {}) });

const schemas = {
  SaleOrderStatus: { type: "string", enum: STATUSES, example: "PLACED" },
  SaleOrderPaymentMode: { type: "string", enum: PAY_MODES, example: "CASH" },

  SaleOrderItemInput: {
    type: "object",
    required: ["productType", "description", "quantity", "unit", "unitPrice"],
    properties: {
      productType: { type: "string", example: "VISITING_CARD", description: "VISITING_CARD, FLEX_BANNER, BROCHURE, STICKER, MUG, T_SHIRT, PHOTO_FRAME or OTHER" },
      description: { type: "string", example: "Visiting cards, matte finish" },
      quantity: { type: "number", exclusiveMinimum: true, minimum: 0, example: 100 },
      unit: { type: "string", enum: ["PCS", "SQFT", "SET", "NOS", "BOX"], example: "PCS" },
      unitPrice: { type: "number", exclusiveMinimum: true, minimum: 0, example: 5, description: "Rate per unit. `rate` is accepted as an alias." },
      discount: { ...money(0), description: "Line discount in rupees. Cannot be more than quantity x unitPrice." },
      taxRate: { ...money(18), description: "Tax percentage applied after the line discount." },
      itemId: { $ref: "#/components/schemas/ObjectId" },
      specification: { type: "object", additionalProperties: true, example: { size: "3.5x2 in" } },
    },
  },

  CreateSaleOrderRequest: {
    type: "object",
    required: ["branchId", "customerName", "mobile", "expectedDeliveryDate", "items"],
    description: "Totals are always calculated by the server; any total sent by the client is ignored.",
    properties: {
      branchId: { $ref: "#/components/schemas/ObjectId" },
      customerId: { $ref: "#/components/schemas/ObjectId" },
      customerName: { type: "string", example: "Ravi Kumar" },
      mobile: { type: "string", pattern: "^[6-9][0-9]{9}$", example: "9876543210", description: "10 digits, starting with 6, 7, 8 or 9." },
      whatsappNumber: { type: "string", pattern: "^[6-9][0-9]{9}$", example: "9876543210", description: "Defaults to the mobile number." },
      whatsappOptIn: { type: "boolean", example: true, description: "Must be true before a design can be sent on WhatsApp." },
      email: { type: "string", format: "email", example: "ravi@example.com" },
      address: { type: "string", example: "12, MG Road, Erode" },
      priority: { type: "string", enum: ["NORMAL", "URGENT"], default: "NORMAL" },
      expectedDeliveryDate: { type: "string", format: "date", example: inDays(4), description: "Tomorrow or later (IST). URGENT orders may use today." },
      customerRequirements: { type: "string", example: "100 visiting cards with the blue logo" },
      remarks: { type: "string" },
      discountAmount: { ...money(0), description: "Order-level discount. Tax is reduced in proportion." },
      items: { type: "array", minItems: 1, maxItems: 1, description: "Exactly one item per order.", items: schemaRef("SaleOrderItemInput") },
    },
  },
  UpdateSaleOrderRequest: {
    type: "object",
    description: "Draft orders only. Send only the fields to change. When `items` is sent, the items are replaced and totals recalculated.",
    properties: {
      priority: { type: "string", enum: ["NORMAL", "URGENT"] },
      expectedDeliveryDate: { type: "string", format: "date", example: "2026-11-06" },
      customerRequirements: { type: "string" },
      remarks: { type: "string" },
      customerName: { type: "string" },
      mobile: { type: "string", example: "9876543210" },
      whatsappNumber: { type: "string", example: "9876543210" },
      whatsappOptIn: { type: "boolean" },
      email: { type: "string", format: "email" },
      address: { type: "string" },
      discountAmount: money(0),
      items: { type: "array", minItems: 1, maxItems: 1, description: "Exactly one item per order.", items: schemaRef("SaleOrderItemInput") },
    },
  },
  PlaceSaleOrderRequest: {
    type: "object",
    required: ["advanceAmount", "mode"],
    properties: {
      advanceAmount: { type: "number", exclusiveMinimum: true, minimum: 0, example: 300, description: "More than 0 and not more than the order total. At least the minimum advance (default 50%) unless a manager overrides." },
      mode: schemaRef("SaleOrderPaymentMode"),
      reference: { type: "string", example: "UPI-123456789", description: "Required for UPI, CARD and BANK_TRANSFER." },
      overrideReason: { type: "string", example: "Regular customer, balance on delivery", description: "Branch managers and admins only: allows an advance below the minimum." },
    },
  },
  SaleOrderApprovalRequest: {
    type: "object",
    required: ["decision", "channel"],
    description: "Records what the customer decided. The customer is never logged in; staff record the decision.",
    properties: {
      decision: { type: "string", enum: ["APPROVED", "CHANGES_REQUESTED"], example: "APPROVED" },
      channel: { type: "string", enum: ["CALL_TO_BRANCH", "CALL_TO_DESIGNER", "WHATSAPP_REPLY", "IN_PERSON"], example: "CALL_TO_BRANCH" },
      remarks: { type: "string", example: "Customer is happy with the design", description: "At least 5 characters when decision is CHANGES_REQUESTED." },
      versionNo: { type: "integer", example: 1, description: "The design version the customer saw. Must be the latest sent version." },
    },
  },
  FinishPrintRequest: {
    type: "object",
    description: "Send `items` for a per-line count, or `printedQty` for the order total.",
    properties: {
      items: {
        type: "array",
        items: { type: "object", required: ["lineNo", "printedQty"], properties: { lineNo: { type: "integer", example: 1 }, printedQty: { type: "number", example: 100 } } },
      },
      printedQty: { type: "number", example: 100 },
      spoilageQty: { type: "number", minimum: 0, example: 3 },
      remarks: { type: "string", example: "Two sheets spoiled and reprinted" },
    },
  },
  DispatchSaleOrderRequest: {
    type: "object",
    required: ["packages", "mode"],
    properties: {
      packages: { type: "integer", minimum: 1, example: 2 },
      mode: { type: "string", enum: ["OWN_VEHICLE", "COURIER", "STAFF_HAND_DELIVERY"], example: "COURIER" },
      trackingRef: { type: "string", example: "AWB-123456", description: "Required for COURIER." },
      carrierDetails: { type: "string", example: "DTDC" },
    },
  },
  ReceiveSaleOrderRequest: {
    type: "object",
    properties: {
      packagesReceived: { type: "integer", minimum: 0, example: 2, description: "Defaults to the number of packages sent." },
      remarks: { type: "string", example: "All packages in good condition", description: "Required when the count differs from packages sent." },
      notifyCustomer: { type: "boolean", example: false, description: "Send the 'ready for pickup' WhatsApp message." },
    },
  },
  DeliverSaleOrderRequest: {
    type: "object",
    required: ["receivedByName"],
    properties: {
      receivedByName: { type: "string", example: "Ravi Kumar" },
      amount: { type: "number", example: 290, description: "Required when a balance is due. Must equal the balance exactly." },
      mode: schemaRef("SaleOrderPaymentMode"),
      reference: { type: "string", description: "Required for non-cash payments." },
      remarks: { type: "string" },
      proofAttachmentId: { $ref: "#/components/schemas/ObjectId" },
      sendReceipt: { type: "boolean", example: false, description: "Send the payment receipt on WhatsApp." },
    },
  },
  CancelSaleOrderRequest: {
    type: "object",
    required: ["reason"],
    properties: {
      reason: { type: "string", minLength: 5, example: "Customer no longer needs the order" },
      refundAmount: { type: "number", minimum: 0, example: 150, description: "Required (admin only) once design has started. Before that, the full advance is refunded automatically." },
      refundMode: { $ref: "#/components/schemas/SaleOrderPaymentMode" },
      reference: { type: "string", description: "Required for non-cash refunds." },
    },
  },
  UploadDesignRequest: {
    type: "object",
    required: ["preview"],
    properties: {
      preview: { type: "string", format: "binary", description: "JPG or PNG, up to 5 MB. This image is sent to the customer." },
      printFile: { type: "string", format: "binary", description: "Optional PDF, AI, CDR, PSD or TIFF, up to 25 MB. Internal only." },
      designerNotes: { type: "string", example: "Logo placed top-left" },
    },
  },
  ReferenceFilesRequest: {
    type: "object",
    required: ["files"],
    properties: { files: { type: "array", maxItems: 5, items: { type: "string", format: "binary" }, description: "JPG, PNG or PDF, up to 10 MB each." } },
  },

  SaleOrder: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" },
      orderNo: { type: "string", example: "SO-2610-0015", description: "DRAFT-<id> until the order is placed." },
      status: schemaRef("SaleOrderStatus"),
      priority: { type: "string", enum: ["NORMAL", "URGENT"] },
      expectedDeliveryDate: { type: "string", format: "date-time" },
      customerSnapshot: {
        type: "object",
        properties: {
          name: { type: "string" }, mobile: { type: "string" }, whatsappNumber: { type: "string" }, whatsappOptIn: { type: "boolean" },
          email: { type: "string", nullable: true }, address: { type: "string", nullable: true },
        },
      },
      orderBranch: { type: "object", properties: { name: { type: "string" }, code: { type: "string" } } },
      manufacturingUnit: { type: "object", properties: { name: { type: "string" }, code: { type: "string" } } },
      subtotal: { type: "number", example: 500 },
      discountAmount: { type: "number", example: 0 },
      taxAmount: { type: "number", example: 90 },
      grandTotal: { type: "number", example: 590 },
      amountPaid: { type: "number", example: 300 },
      balanceDue: { type: "number", example: 290 },
      paymentStatus: { type: "string", enum: ["UNPAID", "ADVANCE_PAID", "PAID", "REFUNDED"] },
      currentAssignment: {
        type: "object",
        nullable: true,
        description: "Who at the manufacturing unit took the order from the queue. Everyone at the unit can still work it.",
        properties: { designerUserId: { $ref: "#/components/schemas/ObjectId" }, designerName: { type: "string" }, assignedAt: { $ref: "#/components/schemas/DateTimeString" } },
      },
      items: { type: "array", items: { type: "object", additionalProperties: true } },
      designs: { type: "array", items: { type: "object", additionalProperties: true } },
      payments: { type: "array", items: { type: "object", additionalProperties: true } },
      printing: { type: "object", nullable: true, additionalProperties: true },
      dispatch: { type: "object", nullable: true, additionalProperties: true },
      delivery: { type: "object", nullable: true, additionalProperties: true },
      cancellation: { type: "object", nullable: true, additionalProperties: true },
    },
  },
  SaleOrderEvent: {
    type: "object",
    properties: {
      action: { type: "string", example: "DISPATCHED" },
      fromStatus: { type: "string" }, toStatus: { type: "string" },
      notes: { type: "string" },
      createdAt: { $ref: "#/components/schemas/DateTimeString" },
    },
  },
  CustomerLookupResult: {
    type: "object",
    properties: {
      found: { type: "boolean", example: true },
      mobile: { type: "string", example: "9876543210" },
      customer: { type: "object", nullable: true, properties: { name: { type: "string" }, mobile: { type: "string" }, email: { type: "string" }, address: { type: "string" } } },
    },
  },
  MfgDashboard: {
    type: "object",
    properties: {
      counts: {
        type: "object",
        description: "Open orders of the unit per status, plus READY_TO_DISPATCH (printing finished, not yet dispatched).",
        additionalProperties: { type: "integer" },
        example: { PLACED: 2, IN_DESIGN: 3, SENT_FOR_APPROVAL: 1, APPROVED: 1, PRINTING: 2, READY_TO_DISPATCH: 1 },
      },
      myOrders: { type: "array", description: "Open orders the caller took from the queue.", items: { type: "object", additionalProperties: true } },
      notifications: { type: "array", items: { type: "object", additionalProperties: true } },
    },
  },
  MfgQueueItem: {
    type: "object",
    properties: {
      _id: { $ref: "#/components/schemas/ObjectId" }, orderNo: { type: "string" }, status: schemaRef("SaleOrderStatus"),
      priority: { type: "string" }, isQueued: { type: "boolean", description: "true while nobody has taken the order." },
      minutesWaiting: { type: "integer", example: 42 }, currentAssignment: { type: "object", nullable: true, additionalProperties: true },
    },
  },
};

const secured = (extra = {}) => ({ security: [{ bearerAuth: [] }], ...extra });
const op = (tag, operationId, summary, description, rest) => ({ tags: [tag], operationId, summary, description, ...secured(), ...rest });

/** POST /sale-orders/{id}/<action>: JSON body, returns the refreshed order. */
const action = (operationId, summary, description, requestSchema, example, statuses = [403, 404, 409, 422], extra = {}) =>
  op(TAG, operationId, summary, description, {
    parameters: [idParam, ...(extra.parameters || [])],
    ...(requestSchema ? { requestBody: jsonBody(requestSchema, { example, required: extra.bodyRequired !== false }) } : {}),
    responses: { 200: okResponse("Updated order", "SaleOrder"), ...errors(401, ...statuses) },
  });

const paths = {
  "/sale-orders/customer-lookup": {
    get: op(TAG, "lookupSaleOrderCustomer", "Find a customer by mobile", "Lets the branch reuse an existing customer. `found` is false when there is no match.", {
      parameters: [{ name: "mobile", in: "query", required: true, schema: { type: "string", example: "9876543210" } }],
      responses: { 200: okResponse("Lookup result", "CustomerLookupResult"), ...errors(401, 403, 422) },
    }),
  },
  "/sale-orders": {
    get: op(TAG, "listSaleOrders", "List sale orders", "Branch staff see their own branch, manufacturing unit staff every order of their unit, admins everything.", {
      parameters: [
        paramRef("Page"), paramRef("Limit"), paramRef("Search"),
        { name: "status", in: "query", description: "One status or a comma-separated list.", schema: { type: "string", example: "PLACED,ASSIGNED" } },
        { name: "priority", in: "query", schema: { type: "string", enum: ["NORMAL", "URGENT"] } },
        { name: "branchId", in: "query", schema: schemaRef("ObjectId") },
        { name: "unitId", in: "query", schema: schemaRef("ObjectId") },
        { name: "fromDate", in: "query", schema: { type: "string", format: "date" } },
        { name: "toDate", in: "query", schema: { type: "string", format: "date" } },
      ],
      responses: { 200: pagedResponse("Page of sale orders", "SaleOrder"), ...errors(401, 403) },
    }),
    post: op(TAG, "createSaleOrder", "Create a draft order", "Creates the order as DRAFT with a temporary number. Collect the advance with `/place` to send it to the unit.", {
      requestBody: jsonBody("CreateSaleOrderRequest", {
        example: {
          branchId: "6abe00e607b3bc845889e140", customerName: "Ravi Kumar", mobile: "9876543210", whatsappNumber: "9876543210",
          whatsappOptIn: true, priority: "NORMAL", expectedDeliveryDate: inDays(4), customerRequirements: "100 visiting cards with the blue logo",
          discountAmount: 0,
          items: [{ productType: "VISITING_CARD", description: "Visiting cards, matte finish", quantity: 100, unit: "PCS", unitPrice: 5, taxRate: 18 }],
        },
      }),
      responses: { 201: okResponse("Draft created", "SaleOrder"), ...errors(401, 403, 404, 422) },
    }),
  },
  "/sale-orders/{id}": {
    get: op(TAG, "getSaleOrder", "Get one sale order", "Full order with items, designs, payments, WhatsApp messages and branch and unit names.", {
      parameters: [idParam], responses: { 200: okResponse("Sale order", "SaleOrder"), ...errors(401, 403, 404) },
    }),
    patch: op(TAG, "updateSaleOrderDraft", "Edit a draft order", "Only while the order is DRAFT.", {
      parameters: [idParam],
      requestBody: jsonBody("UpdateSaleOrderRequest", { example: { expectedDeliveryDate: inDays(5), customerRequirements: "Add the QR code" } }),
      responses: { 200: okResponse("Updated order", "SaleOrder"), ...errors(401, 403, 404, 409, 422) },
    }),
  },
  "/sale-orders/{id}/timeline": {
    get: op(TAG, "getSaleOrderTimeline", "Order timeline", "Every status change, oldest first.", {
      parameters: [idParam],
      responses: { 200: { description: "Events", content: { "application/json": { schema: { allOf: [schemaRef("ApiSuccessResponse"), { type: "object", properties: { data: { type: "array", items: schemaRef("SaleOrderEvent") } } }] } } } }, ...errors(401, 403, 404) },
    }),
  },
  "/sale-orders/{id}/reference-files": {
    post: op(TAG, "addSaleOrderReferenceFiles", "Attach reference files", "Draft orders only. JPG, PNG or PDF, up to 10 MB each, at most 5 per order.", {
      parameters: [idParam],
      requestBody: { required: true, content: { "multipart/form-data": { schema: schemaRef("ReferenceFilesRequest") } } },
      responses: { 200: okResponse("Files attached"), ...errors(401, 403, 404, 409, 422) },
    }),
  },
  "/sale-orders/{id}/place": {
    post: op(TAG, "placeSaleOrder", "Collect the advance and place the order", "Moves DRAFT to PLACED, issues the real order number and an advance receipt. The order then waits in the manufacturing unit's queue. Safe to retry with the same `Idempotency-Key`.", {
      parameters: [idParam, paramRef("IdempotencyKey")],
      requestBody: jsonBody("PlaceSaleOrderRequest", { example: { advanceAmount: 300, mode: "CASH" } }),
      responses: { 201: okResponse("Order placed", "SaleOrder"), 200: okResponse("Same Idempotency-Key replayed: original result", "SaleOrder"), ...errors(401, 403, 404, 409, 422) },
    }),
  },
  "/sale-orders/{id}/approval": {
    post: action("recordSaleOrderApproval", "Record the customer's decision", "Order must be SENT_FOR_APPROVAL. APPROVED moves it to APPROVED; CHANGES_REQUESTED sends it back to design. The ordering branch or the manufacturing unit can record it.", "SaleOrderApprovalRequest",
      { decision: "APPROVED", channel: "CALL_TO_BRANCH", remarks: "Customer is happy with the design", versionNo: 1 }),
  },
  "/sale-orders/{id}/receive": {
    post: action("receiveSaleOrder", "Receive the parcel at the branch", "Order must be DISPATCHED. Only staff of the ordering branch.", "ReceiveSaleOrderRequest",
      { packagesReceived: 2, remarks: "All packages in good condition", notifyCustomer: false }, [403, 404, 409, 422], { bodyRequired: false }),
  },
  "/sale-orders/{id}/deliver": {
    post: action("deliverSaleOrder", "Collect the balance and deliver", "Order must be RECEIVED_AT_BRANCH. When a balance is due it must be paid in full now. Safe to retry with the same `Idempotency-Key`.", "DeliverSaleOrderRequest",
      { receivedByName: "Ravi Kumar", amount: 290, mode: "CASH", sendReceipt: false }, [403, 404, 409, 422], { parameters: [paramRef("IdempotencyKey")] }),
  },
  "/sale-orders/{id}/cancel": {
    post: action("cancelSaleOrder", "Cancel an order", "Allowed before the parcel is dispatched. A branch manager can cancel until design starts (full refund); after that only an admin can, and enters the refund amount.", "CancelSaleOrderRequest",
      { reason: "Customer no longer needs the order", refundMode: "CASH" }),
  },
  "/sale-orders/{id}/take": {
    post: op(TAG_MFG, "takeSaleOrder", "Take an order from the queue", "Anyone at the order's manufacturing unit. Moves a queued order (PLACED, or WAITING_FOR_DESIGNER / ASSIGNED on older orders) to IN_DESIGN and records who took it. If two people take it at once, the second gets 409 ALREADY_TAKEN.", {
      parameters: [idParam], responses: { 200: okResponse("Order taken", "SaleOrder"), ...errors(401, 403, 404, 409) },
    }),
  },
  "/sale-orders/{id}/designs": {
    post: op(TAG_MFG, "uploadSaleOrderDesign", "Upload a design version", "Anyone at the order's manufacturing unit, once the order is taken (IN_DESIGN or CHANGES_REQUESTED). Only one DRAFT version at a time. The preview goes to the customer; the print file stays internal.", {
      parameters: [idParam],
      requestBody: { required: true, content: { "multipart/form-data": { schema: schemaRef("UploadDesignRequest") } } },
      responses: { 201: okResponse("Version uploaded", "SaleOrder"), ...errors(401, 403, 404, 409, 422) },
    }),
  },
  "/sale-orders/{id}/designs/{v}/send": {
    post: op(TAG_MFG, "sendSaleOrderDesign", "Send a design to the customer on WhatsApp", "Order must be IN_DESIGN and the customer must have opted in to WhatsApp. Moves the order to SENT_FOR_APPROVAL.", {
      parameters: [idParam, versionParam], responses: { 200: okResponse("Design sent", "SaleOrder"), ...errors(401, 403, 404, 409, 422) },
    }),
  },
  "/sale-orders/{id}/designs/{v}/print-file": {
    get: op(TAG_MFG, "downloadSaleOrderPrintFile", "Download the print file", "Only the approved version, and only for the order's manufacturing unit or an admin. Branch users are refused.", {
      parameters: [idParam, versionParam],
      responses: {
        200: { description: "The print file", headers: { "Content-Disposition": { schema: { type: "string", example: 'attachment; filename="print.pdf"' } } }, content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } },
        ...errors(401, 403, 404, 409),
      },
    }),
  },
  "/sale-orders/{id}/print/start": {
    post: action("startSaleOrderPrint", "Start printing", "Anyone at the order's manufacturing unit, or an admin. APPROVED to PRINTING.", null),
  },
  "/sale-orders/{id}/print/finish": {
    post: action("finishSaleOrderPrint", "Finish printing", "Printed quantity must be at least the ordered quantity. The status stays PRINTING until dispatch.", "FinishPrintRequest",
      { items: [{ lineNo: 1, printedQty: 100 }], spoilageQty: 3, remarks: "Two sheets spoiled and reprinted" }),
  },
  "/sale-orders/{id}/dispatch": {
    post: action("dispatchSaleOrder", "Dispatch to the branch", "Printing must be finished. Sends the parcel to the ordering branch.", "DispatchSaleOrderRequest",
      { packages: 2, mode: "COURIER", trackingRef: "AWB-123456", carrierDetails: "DTDC" }),
  },

  "/mfg/dashboard": {
    get: op(TAG_MFG, "getMfgDashboard", "Manufacturing dashboard", "The same for everyone at the unit: open orders per stage, the orders the caller took, and their notifications. Admins see every unit.", {
      parameters: [{ name: "unitId", in: "query", description: "Admins only: limit to one unit.", schema: schemaRef("ObjectId") }],
      responses: { 200: okResponse("Dashboard", "MfgDashboard"), ...errors(401, 403) },
    }),
  },
  "/mfg/queue": {
    get: op(TAG_MFG, "getMfgQueue", "Queue", "Every open order of the unit, urgent first then oldest. Queued orders (isQueued) can be taken; the rest show who took them in currentAssignment. The same list for everyone at the unit.", {
      parameters: [{ name: "unitId", in: "query", description: "Admins only: limit to one unit.", schema: schemaRef("ObjectId") }],
      responses: { 200: { description: "Queue", content: { "application/json": { schema: { allOf: [schemaRef("ApiSuccessResponse"), { type: "object", properties: { data: { type: "array", items: schemaRef("MfgQueueItem") } } }] } } } }, ...errors(401, 403) },
    }),
  },
};

module.exports = {
  tags: [
    { name: TAG, description: "Orders placed by a branch and made by the manufacturing unit: create, advance, design approval, print, dispatch, receive and deliver." },
    { name: TAG_MFG, description: "Manufacturing unit portal. Everyone at the unit shares it: dashboard, queue (take an order), design upload and send, print and dispatch." },
  ],
  schemas,
  paths,
};
