/**
 * Comprehensive, Valid, Real-world Payload Examples for PrintZ OpenAPI/Swagger Documentation
 * Covers all 119 endpoints with requestBody across all modules.
 */

const REAL_IDS = {
  branchId: "489571a9af51836599708543", // Banaswadii (BN)
  branchIdKA: "80d517f834298d14c216bd95", // Kammanahallii (KA)
  customerId: "6ac908bc857903d973a34c12", // CUS-00001
  employeeId: "6ac74652f1faee851df1867e", // Priya Raman (EMP-00002)
  departmentId: "6acf7f6ce2f03f0a66e882f7", // Design & Creative (DES)
  designationId: "6acf7f6de2f03f0a66e882fa", // Senior Graphic Designer (SR_DES)
  roleId: "6ac744bdda30708a779235ca", // DESIGNER
  designerId: "6acf7c32312242e3bde22bf3", // Ali Hassan (Designer)
  designerIdBeta: "6acf7c32312242e3bde22bf4", // Siti Rahman (Designer)
  itemId: "6ac744bdda30708a779235c7", // Sample Item ObjectId
  printerId: "6ac744bdda30708a779235c7", // Sample Printer ObjectId
  machineId: "6ac744bdda30708a779235c7", // Sample Machine ObjectId
};

const schemas = {
  // Auth & User
  LoginRequest: {
    email: "admin@printz.shop",
    password: "AdminPassword123!",
  },
  RefreshTokenRequest: {
    refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWNmN2YzMjMxMjI0MmUzYmRlMjJiZjMiLCJpYXQiOjE3MjkxNTAwMDAsImV4cCI6MTczMTc0MjAwMH0.sampleValidSignature",
  },
  LogoutRequest: {
    refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWNmN2YzMjMxMjI0MmUzYmRlMjJiZjMiLCJpYXQiOjE3MjkxNTAwMDAsImV4cCI6MTczMTc0MjAwMH0.sampleValidSignature",
  },
  ForgotPasswordRequest: {
    email: "admin@printz.shop",
  },
  ResetPasswordRequest: {
    email: "admin@printz.shop",
    token: "4f9b8c7d6e5a4b3c2d1e0f9a8b7c6d5e",
    newPassword: "SecureNewPassword123!",
  },
  CreateUserRequest: {
    username: "karthik.design",
    email: "karthik@printz.shop",
    employeeId: REAL_IDS.employeeId,
    password: "SecurePassword123!",
    sendInvite: true,
  },
  UpdateUserRequest: {
    name: "Karthik Raja",
    email: "karthik@printz.shop",
    password: "NewSecretPassword123!",
    role: "designer",
    phone: "9876543210",
    branch: "Banaswadii",
    location: "Bengaluru",
    branchId: REAL_IDS.branchId,
    isActive: true,
  },

  // Employee, Department, Designation, Role
  EmployeeRequest: {
    name: "Anita Sharma",
    mobile: "9876543210",
    email: "anita@printz.shop",
    address: "123 Main Street, Banaswadi, Bengaluru 560043",
    joiningDate: "2026-10-01",
    branchId: REAL_IDS.branchId,
    departmentId: REAL_IDS.departmentId,
    designationId: REAL_IDS.designationId,
    roleId: REAL_IDS.roleId,
    reportingManagerId: REAL_IDS.employeeId,
    employmentStatus: "ACTIVE",
    isActive: true,
  },
  EmployeePatchRequest: {
    name: "Anita Sharma",
    mobile: "9876543210",
    email: "anita@printz.shop",
    address: "456 Residency Road, Bengaluru 560025",
    joiningDate: "2026-10-01",
    branchId: REAL_IDS.branchId,
    employmentStatus: "ACTIVE",
    isActive: true,
  },
  DepartmentRequest: {
    name: "Large Format & Signage",
    code: "SIGNAGE",
    description: "Wide format eco-solvent and vinyl printing department",
    isActive: true,
  },
  DesignationRequest: {
    name: "Lead Pre-Press Operator",
    code: "LEAD_PREPRESS",
    departmentId: REAL_IDS.departmentId,
    level: 3,
    description: "Manages CTP plates, imposition, and color profiles",
    isActive: true,
  },
  RoleRequest: {
    roleCode: "SENIOR_DESIGNER",
    roleName: "Senior Graphic Designer",
    description: "Full access to artwork queue, proof approvals, and customer communications",
    permissions: [
      { permissionCode: "job.order.view", scope: "BRANCH" },
      { permissionCode: "design.queue.manage", scope: "ALL" },
    ],
  },

  // Common: Approvals & Attachments
  ApprovalDecisionRequest: {
    reason: "Approved: Volume discount sanctioned as per customer contract",
    comments: "Proceed with production at agreed rate",
  },
  AttachmentUploadRequest: {
    entityType: "JobOrder",
    entityId: REAL_IDS.customerId,
    fileName: "approved_artwork_vector.pdf",
    notes: "Client vector PDF with 3mm bleed ready for press",
  },

  // Inventory
  InventoryItemRequest: {
    itemCode: "PAPER-350GSM-MATTE",
    name: "350 GSM Premium Matte Art Card",
    category: "PAPER",
    hsnCode: "4802",
    unit: "SHEET",
    purchaseRate: 3.2,
    saleRate: 6.5,
    taxRate: 18,
    reorderLevel: 100,
    isActive: true,
    isStockTracked: true,
  },
  InventoryItemUpdateRequest: {
    name: "350 GSM Premium Matte Art Card (Double Sided)",
    category: "PAPER",
    hsnCode: "4802",
    unit: "SHEET",
    purchaseRate: 3.4,
    saleRate: 7.0,
    taxRate: 18,
    reorderLevel: 150,
    isActive: true,
    isStockTracked: true,
  },
  InventoryOpeningStockRequest: {
    branchId: REAL_IDS.branchId,
    lines: [
      {
        itemId: REAL_IDS.itemId,
        quantity: 500,
        notes: "Initial inventory setup for branch opening",
      },
    ],
  },
  InventoryAdjustmentRequest: {
    branchId: REAL_IDS.branchId,
    itemId: REAL_IDS.itemId,
    quantity: -10,
    notes: "Damaged water-stained sheets discarded during physical audit",
  },
  InventoryIssueRequest: {
    branchId: REAL_IDS.branchId,
    itemId: REAL_IDS.itemId,
    quantity: 250,
    consumptionType: "PAPER",
    notes: "Issued to Digital Press #1 for job order production",
  },
  PurchaseReceiptRequest: {
    branchId: REAL_IDS.branchId,
    supplierName: "ITC Paperboards Ltd",
    supplierInvoiceNo: "ITC-BLR-88341",
    receivedDate: "2026-10-16",
    items: [
      {
        itemId: REAL_IDS.itemId,
        quantity: 1000,
        purchaseRate: 3.2,
        amount: 3200,
      },
    ],
    remarks: "Received in good condition, pallet inspected and verified",
  },
  PurchaseReceiptUpdateRequest: {
    supplierName: "ITC Paperboards Ltd",
    supplierInvoiceNo: "ITC-BLR-88341-REV",
    receivedDate: "2026-10-16",
    items: [
      {
        itemId: REAL_IDS.itemId,
        quantity: 1000,
        purchaseRate: 3.2,
        amount: 3200,
      },
    ],
    remarks: "Updated delivery line items with freight adjustment",
  },

  // POS
  CreateSaleReceiptRequest: {
    branchId: REAL_IDS.branchId,
    customer: {
      name: "Rajesh Kumar",
      mobile: "9876543210",
      email: "rajesh@example.com",
      address: "Banaswadi, Bengaluru",
      gstin: "29AAAAA0000A1Z5",
    },
    items: [
      {
        itemCode: "VISITING-CARD-STD",
        itemName: "Visiting Cards 350 GSM Matte (100 pcs)",
        quantity: 2,
        unitPrice: 250.0,
        discountAmount: 0,
        taxRate: 18,
        unit: "BOX",
        isStockTracked: false,
        notes: "Express counter pickup",
      },
    ],
    payments: [
      {
        mode: "UPI",
        amount: 590.0,
        reference: "UPI-TXN-20261016-01",
        collectedAt: "2026-10-16T10:30:00.000Z",
      },
    ],
    discountAmount: 0,
    notes: "Front desk counter POS retail sale",
    idempotencyKey: "pos-uuid-20261016-001",
  },
  CalculateSaleReceiptRequest: {
    items: [
      {
        itemName: "A4 Color Prints (Single Side)",
        quantity: 50,
        unitPrice: 10.0,
        discountAmount: 0,
        taxRate: 18,
        unit: "SHEET",
      },
    ],
    discountAmount: 0,
  },
  UpdateSaleReceiptRequest: {
    customer: {
      name: "Rajesh Kumar",
      mobile: "9876543210",
      email: "rajesh@example.com",
    },
    notes: "Updated delivery contact details",
    discountAmount: 20,
  },
  RecordPaymentRequest: {
    amount: 590.0,
    paymentMode: "CASH",
    paymentReference: "CASH-REG-01",
  },
  ShareReceiptRequest: {
    channel: "WHATSAPP",
    recipient: "+919876543210",
  },

  // Product Orders & Stock Transfers
  ProductOrderRequest: {
    requestingBranchId: REAL_IDS.branchId,
    items: [
      {
        itemId: REAL_IDS.itemId,
        requestedQty: 500,
        unit: "SHEET",
      },
    ],
    remarks: "Urgent paper substrate refill for upcoming catalog run",
  },
  ProductOrderDecisionRequest: {
    remarks: "Stock allocated from Central Warehouse stock balance",
    reason: "Approved by Warehouse Lead",
  },
  DispatchTransferRequest: {
    dispatchNotes: "Dispatched via logistics delivery van KA-03-HA-1234",
    carrierName: "PrintZ Inter-branch Logistics",
    trackingNumber: "PRINTZ-TRK-20261016-01",
  },
  ReceiveTransferRequest: {
    receivedNotes: "All 500 sheets received in perfect condition",
    receivedQty: 500,
  },

  // Job Orders
  JobOrderCreateRequest: {
    branchId: REAL_IDS.branchId,
    customerId: REAL_IDS.customerId,
    customerSnapshot: {
      name: "Acme Technologies Pvt Ltd",
      mobile: "9876543210",
      email: "contact@acmetech.com",
      company: "Acme Technologies",
      gstin: "29AAAAA0000A1Z5",
    },
    priority: "HIGH",
    jobType: "BROCHURE",
    title: "Corporate Tri-fold Brochures (1,000 pcs)",
    dueDate: "2026-10-20T18:00:00.000Z",
    items: [
      {
        description: "Tri-Fold Brochure A4, 250 GSM Gloss with Thermal Lamination",
        quantity: 1000,
        unit: "PCS",
        unitRate: 12.5,
        taxRate: 18,
      },
    ],
    submitForEstimateApproval: true,
    isPrintReady: false,
  },
  JobOrderUpdateRequest: {
    title: "Corporate Tri-fold Brochures (1,000 pcs) - Velvet Finish",
    priority: "URGENT",
    dueDate: "2026-10-19T14:00:00.000Z",
    notes: "Client requested expedited delivery for upcoming product launch expo",
  },
  JobOrderEstimateRequest: {
    items: [
      {
        description: "Tri-Fold Brochure A4, 250 GSM Gloss",
        quantity: 1000,
        unitRate: 11.5,
      },
    ],
    discountAmount: 500,
  },
  DesignerRatingRequest: {
    rating: 5,
    feedback: "Exceptional speed, immaculate layout, and great attention to branding guidelines!",
  },

  // Design
  AssignDesignerRequest: {
    designerId: REAL_IDS.designerId,
    instructions: "Please follow brand identity manual; ensure corporate logo vector is sharp",
  },
  ReassignDesignerRequest: {
    target: "ROUND_ROBIN",
    reason: "Original designer assigned to emergency high-volume client banner order",
  },
  SampleDecisionRequest: {
    decision: "APPROVED",
    feedback: "Customer verified and approved design proof v1 via WhatsApp",
  },

  // Production & QC
  QualityCheckRequest: {
    jobOrderId: REAL_IDS.customerId,
    checkType: "FINAL",
    result: "PASS",
    quantityChecked: 1000,
    acceptedQty: 1000,
    rejectedQty: 0,
    comments: "Color density matches approved proof within Delta-E 1.5 tolerance; trim is razor sharp",
    defects: [],
    correctiveAction: "NONE",
  },

  // SLA
  SlaConfigurationRequest: {
    stage: "DESIGN_QUEUE",
    jobType: "BROCHURE",
    priority: "HIGH",
    targetMinutes: 90,
    warningMinutes: 60,
    isActive: true,
  },

  // Customers
  CustomerCreateRequest: {
    customerCode: "CUST-00042",
    name: "Kaveri Enterprises",
    mobile: "9845012345",
    email: "contact@kaverienterprises.in",
    gstin: "29AABCK1234F1Z8",
    address: "77 1st Cross, Indiranagar, Bengaluru 560038",
    customerType: "B2B",
    creditLimit: 50000,
    branchId: REAL_IDS.branchId,
    isActive: true,
  },
  CustomerUpdateRequest: {
    name: "Kaveri Enterprises Pvt Ltd",
    mobile: "9845012345",
    email: "accounts@kaverienterprises.in",
    gstin: "29AABCK1234F1Z8",
    address: "77 1st Cross, Indiranagar, Bengaluru 560038",
    customerType: "B2B",
    creditLimit: 75000,
    branchId: REAL_IDS.branchId,
    isActive: true,
  },

  // Legacy / Master Schemas
  BranchRequest: {
    name: "Indiranagar Branch",
    code: "IN",
    address: "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru 560038",
    branchType: "retail",
    isActive: true,
  },
  CategoryRequest: {
    categoryId: "CAT-005",
    categoryName: "Marketing Collaterals & Signages",
  },
  SaleRequest: {
    customerName: "Priya Enterprises",
    amount: 1850.0,
    description: "Brochure and banner printing for local seminar",
  },
  PrinterRequest: {
    name: "Konica Minolta AccurioPress C4080",
    model: "AccurioPress C4080 Production Press",
    branchId: REAL_IDS.branchId,
    serialNumber: "KM-C4080-2026-0042",
  },
  PrinterReadingRequest: {
    branchId: REAL_IDS.branchId,
    printerId: REAL_IDS.printerId,
    readingDate: "2026-10-16",
    totalCount: 24500,
    colorCount: 16800,
    bwCount: 7700,
  },
  JumboXeroxMachineRequest: {
    machineName: "HP PageWide XL 5200",
    model: "PW-XL-5200",
    branchId: REAL_IDS.branchId,
    status: "active",
  },
  JumboXeroxReadingRequest: {
    machineId: REAL_IDS.machineId,
    readingDate: "2026-10-16",
    startReading: 4500,
    endReading: 4720,
    remarks: "Architectural blueprints and engineering CAD schematics",
  },
  PastDateRequest: {
    branchId: REAL_IDS.branchId,
    requestDate: "2026-10-15",
    reason: "Late counter entry delayed due to ISP optical fiber cut",
  },
  PaymentRequest: {
    customerId: REAL_IDS.customerId,
    amount: 3500.0,
    paymentMode: "UPI",
    transactionReference: "UPI-REC-20261016-09",
    notes: "Advance customer deposit credited against account ledger",
  },
  TotalAmountRequest: {
    branchId: REAL_IDS.branchId,
    date: "2026-10-16",
    cashAmount: 18200.0,
    onlineAmount: 34800.0,
    totalAmount: 53000.0,
  },
  StockItemRequest: {
    itemName: "Gloss Lamination Film Roll 25 Micron (12 Inch)",
    category: "Lamination Consumables",
    unit: "ROLL",
    minStockLevel: 5,
    currentStock: 22,
  },
  StockReadingRequest: {
    itemId: REAL_IDS.itemId,
    branchId: REAL_IDS.branchId,
    recordedCount: 20,
    recordedDate: "2026-10-16",
  },
};

/**
 * Exact endpoint-by-endpoint payload mappings for all 119 endpoints.
 * Keyed by `${METHOD} ${path}`
 */
const endpoints = {
  // ── 00 Users & RBAC ──
  "POST /users": schemas.CreateUserRequest,
  "PUT /users/{id}": schemas.UpdateUserRequest,
  "POST /users/{id}/lock": {
    reason: "Excessive failed password attempts from unfamiliar IP",
    lockoutMinutes: 30,
  },

  // ── 01 Auth ──
  "POST /auth/login": schemas.LoginRequest,
  "POST /auth/logout": schemas.LogoutRequest,
  "POST /auth/refresh": schemas.RefreshTokenRequest,
  "POST /auth/forgot-password": schemas.ForgotPasswordRequest,
  "POST /auth/reset-password": schemas.ResetPasswordRequest,
  "POST /auth/send-reset-email": schemas.ForgotPasswordRequest,

  // ── 01 Employee & Masters ──
  "POST /employees": schemas.EmployeeRequest,
  "PATCH /employees/{id}": schemas.EmployeePatchRequest,
  "POST /departments": schemas.DepartmentRequest,
  "PUT /departments/{id}": schemas.DepartmentRequest,
  "PATCH /departments/{id}": schemas.DepartmentRequest,
  "POST /designations": schemas.DesignationRequest,
  "PUT /designations/{id}": schemas.DesignationRequest,
  "PATCH /designations/{id}": schemas.DesignationRequest,

  // ── 01 Roles & Permissions ──
  "POST /roles": schemas.RoleRequest,
  "PUT /roles/{id}": schemas.RoleRequest,
  "PATCH /roles/{id}": schemas.RoleRequest,

  // ── 02 Common & Approvals ──
  "POST /approvals/{id}/approve": schemas.ApprovalDecisionRequest,
  "POST /approvals/{id}/cancel": {
    reason: "Customer changed order specifications; approval request cancelled by manager",
    comments: "Cancelled",
  },
  "POST /approvals/{id}/reject": {
    reason: "Requested discount exceeds 10% manager approval limit",
    comments: "Please re-quote at standard commercial rate",
  },
  "POST /attachments": schemas.AttachmentUploadRequest,

  // ── 03 Inventory ──
  "POST /inventory-items": schemas.InventoryItemRequest,
  "PATCH /inventory-items/{id}": schemas.InventoryItemUpdateRequest,
  "POST /inventory-transactions/opening": schemas.InventoryOpeningStockRequest,
  "POST /inventory-transactions/adjustments": schemas.InventoryAdjustmentRequest,
  "POST /inventory-transactions/issues": schemas.InventoryIssueRequest,
  "POST /purchase-receipts": schemas.PurchaseReceiptRequest,
  "PATCH /purchase-receipts/{id}": schemas.PurchaseReceiptUpdateRequest,

  // ── 04 POS ──
  "POST /sale-receipts": schemas.CreateSaleReceiptRequest,
  "POST /sale-receipts/calculate": schemas.CalculateSaleReceiptRequest,
  "POST /sale-receipts/checkout": schemas.CreateSaleReceiptRequest,
  "PATCH /sale-receipts/{id}": schemas.UpdateSaleReceiptRequest,
  "PUT /sale-receipts/{id}/items": {
    items: schemas.CreateSaleReceiptRequest.items,
  },
  "POST /sale-receipts/{id}/payments": schemas.RecordPaymentRequest,
  "POST /sale-receipts/{id}/share": schemas.ShareReceiptRequest,
  "POST /sale-receipts/{id}/void": {
    reason: "Customer changed order requirements before print job started",
  },

  // ── 05 Product Orders & Stock Transfers ──
  "POST /product-orders": schemas.ProductOrderRequest,
  "PATCH /product-orders/{id}": schemas.ProductOrderRequest,
  "PUT /product-orders/{id}/items": schemas.ProductOrderRequest,
  "POST /product-orders/{id}/approve": schemas.ProductOrderDecisionRequest,
  "POST /product-orders/{id}/reject": {
    remarks: "Central warehouse currently out of stock; pending factory delivery",
    reason: "Rejected",
  },
  "POST /stock-transfers/{id}/dispatch": schemas.DispatchTransferRequest,
  "POST /stock-transfers/{id}/receive": schemas.ReceiveTransferRequest,

  // ── 06 Job Orders ──
  "POST /job-orders": schemas.JobOrderCreateRequest,
  "PATCH /job-orders/{id}": schemas.JobOrderUpdateRequest,
  "POST /job-orders/{id}/assignments": {
    designerId: REAL_IDS.designerId,
    notes: "Follow strict CMYK color profile and match corporate brand book",
  },
  "POST /job-orders/{id}/assignments/current/reject": {
    reason: "Designer daily workload capacity exceeded; please allocate to next designer",
  },
  "POST /job-orders/{id}/assignments/reassign": {
    newDesignerId: REAL_IDS.designerIdBeta,
    reason: "Reassigned to specialist brochure designer for urgent turnaround",
  },
  "POST /job-orders/{id}/cancel": {
    reason: "Client cancelled event; requested full cancellation before production",
  },
  "POST /job-orders/{id}/designer-ratings": schemas.DesignerRatingRequest,
  "POST /job-orders/{id}/estimate": schemas.JobOrderEstimateRequest,
  "POST /job-orders/{id}/estimate/approve": {
    comments: "Client formally confirmed estimate via email and paid advance deposit",
  },
  "POST /job-orders/{id}/estimate/reject": {
    reason: "Client requested quotation with alternative 200 GSM paper substrate",
  },
  "POST /job-orders/{id}/files": {
    fileUrl: "/uploads/job/client_vector_artwork_v1.pdf",
    fileName: "client_vector_artwork_v1.pdf",
  },
  "POST /job-orders/{id}/hold": {
    reason: "Awaiting client clarification regarding barcode content and QR destination URL",
  },
  "PUT /job-orders/{id}/items": schemas.JobOrderCreateRequest,
  "POST /job-orders/{id}/reprint-requests": {
    reason: "Substrate banding defect observed during post-press binding",
    quantity: 150,
  },
  "POST /job-orders/{id}/samples": {
    fileUrl: "/uploads/proofs/brochure_proof_v1.pdf",
    thumbnailUrl: "/uploads/proofs/brochure_proof_v1_thumb.jpg",
    notes: "Initial proof version ready for client review",
  },
  "PATCH /job-orders/{id}/samples/{sampleId}": {
    notes: "Updated back cover disclaimer text and adjusted spine thickness by 1mm",
  },
  "POST /job-orders/{id}/samples/{sampleId}/decision": {
    decision: "APPROVED",
    customerFeedback: "Proof verified and approved by marketing lead. Proceed with printing.",
  },
  "POST /job-orders/{id}/skip-design": {
    notes: "Certified print-ready PDF provided directly by customer design agency",
  },

  // ── 07 Design & Proofing ──
  "POST /design/jobs/{id}/assign": schemas.AssignDesignerRequest,
  "POST /design/jobs/{id}/reassign": schemas.ReassignDesignerRequest,
  "POST /design/jobs/{id}/reject": {
    reason: "Designer on approved medical leave; returning to unallocated queue",
  },
  "POST /design/jobs/{id}/samples": {
    fileUrl: "/uploads/proofs/catalog_proof_v1.pdf",
    thumbnailUrl: "/uploads/proofs/catalog_proof_v1_thumb.jpg",
    notes: "Full catalog digital sample proof generated with high-res assets",
  },
  "PATCH /design/jobs/{id}/samples/{sampleId}": {
    notes: "Corrected phone number in footer and realigned margin grid",
  },
  "POST /design/jobs/{id}/samples/{sampleId}/decide": schemas.SampleDecisionRequest,

  // ── 08 Production & Operations ──
  "PATCH /production-orders/{id}": {
    notes: "Handle with white cotton gloves to preserve velvet matte lamination",
    priority: "HIGH",
  },
  "PUT /production-orders/{id}/operations": {
    operations: [
      {
        sequence: 1,
        name: "Digital Offset Printing",
        description: "Konica Minolta AccurioPress C4080 full color press run",
        estimatedMinutes: 45,
      },
      {
        sequence: 2,
        name: "Thermal Matte Lamination",
        description: "Double-sided 25 micron BOPP matte lamination",
        estimatedMinutes: 30,
      },
      {
        sequence: 3,
        name: "Die Creasing & Folding",
        description: "Precision tri-fold scoring and folding",
        estimatedMinutes: 20,
      },
    ],
  },
  "POST /production-orders/{id}/hold": {
    reason: "Scheduled routine color densitometer calibration on press",
  },
  "POST /production-orders/{id}/cancel": {
    reason: "Customer order cancelled prior to sheet feed",
  },
  "POST /production-orders/{id}/quality-checks": schemas.QualityCheckRequest,
  "POST /production-operations/{id}/assign": {
    operatorId: REAL_IDS.designerId,
  },
  "POST /production-operations/{id}/complete": {
    outputQty: 1000,
  },
  "POST /production-operations/{id}/fail": {
    reason: "Misfeed caused 15 sheets to fold askew; replaced creasing rule",
  },
  "POST /production-operations/{id}/skip": {
    reason: "Substrates delivered pre-laminated from authorized paper vendor",
  },
  "POST /reprint-requests/{id}/approve": {
    approvalNotes: "Approved for 150 copies reprint on Press #2 with priority queue status",
  },
  "POST /reprint-requests/{id}/reject": {
    rejectionReason: "Inspection confirmed color variation falls strictly within ISO 12647-2 tolerance",
  },
  "POST /delivery-orders/{id}/deliver": {
    receivedBy: "Karthik Raja (Store Manager)",
    remarks: "Delivered 2 sealed cartons in good condition",
  },

  // ── 09 SLA ──
  "POST /sla-configurations": schemas.SlaConfigurationRequest,
  "PATCH /sla-configurations/{id}": {
    targetMinutes: 120,
    warningMinutes: 90,
  },

  // ── 10 Settlement & Invoicing ──
  "POST /invoices/{id}/payments": {
    amount: 7375.0,
    paymentMode: "UPI",
    paymentReference: "UPI-SETTLE-20261016-01",
    paymentDate: "2026-10-16T11:00:00.000Z",
    remarks: "Full invoice balance settlement via Google Pay UPI",
    idempotencyKey: "PAY-SETTLE-20261016-001",
  },
  "POST /payments/{id}/void": {
    reason: "Incorrect payment mode selected during receipt entry; reversing duplicate record",
  },
  "POST /invoices/{id}/reminders": {
    reminderType: "DUE",
    channel: "WHATSAPP",
    scheduledAt: "2026-10-17T10:00:00.000Z",
    remarks: "Polite payment due reminder sent to customer contact WhatsApp",
  },
  "POST /job-orders/{id}/close": {
    remarks: "Job completed, full payment collected, customer receipt issued; administratively closed.",
  },
  "POST /job-orders/{id}/reopen": {
    reason: "Customer placed warranty reprint repeat order for identical creative files",
  },
  "POST /job-orders/{id}/feedback": {
    rating: 5,
    comments: "Exceptional print quality, accurate color reproduction, and prompt delivery!",
  },

  // ── Customer Master ──
  "POST /customers": schemas.CustomerCreateRequest,
  "PATCH /customers/{id}": schemas.CustomerUpdateRequest,

  // ── Public Self-Service ──
  "POST /public/job-requests": {
    branchCode: "BN",
    customerName: "Suresh Babu",
    customerPhone: "9876543210",
    customerEmail: "suresh.babu@example.com",
    customerCompany: "Suresh Traders",
    customerAddress: "Banaswadi, Bengaluru",
    customerGstin: "29AAAAA0000A1Z5",
    title: "Visiting Cards 350 GSM Matte (500 pcs)",
    jobType: "VISITING_CARD",
    quantity: 500,
    paperSize: "3.5 x 2 inches",
    paperType: "350 GSM Matte Art Card",
    printingType: "Digital Offset",
    colorMode: "CMYK",
    sides: "DOUBLE",
    finishing: ["MATTE_LAMINATION", "ROUND_CORNER"],
    dueDate: "2026-10-18T18:00:00.000Z",
    customerRequirements: "Dark green corporate brand palette with crisp vector typography",
    remarks: "Please send WhatsApp proof sample for approval before printing",
    idempotencyKey: "qr-req-client-20261016-01",
  },
  "POST /public/design-approvals/{token}/decision": {
    decision: "APPROVED",
    feedback: "Colors and layout are approved. Proceed with full batch printing.",
  },

  // ── Legacy & Support Master Modules ──
  "POST /branches": schemas.BranchRequest,
  "PUT /branches/{id}": schemas.BranchRequest,
  "POST /general/categories": schemas.CategoryRequest,
  "POST /general/finalized-dates": {
    branchId: REAL_IDS.branchId,
    finalizedDate: "2026-10-15",
  },
  "POST /general/inventory-movements": {
    itemId: REAL_IDS.itemId,
    quantity: 50,
    type: "CONSUMPTION",
  },
  "POST /general/sales": schemas.SaleRequest,
  "POST /printers": schemas.PrinterRequest,
  "PUT /printers/{id}": schemas.PrinterRequest,
  "POST /printer-readings": schemas.PrinterReadingRequest,
  "PUT /printer-readings/{id}": schemas.PrinterReadingRequest,
  "POST /jumbo-xerox/machines": schemas.JumboXeroxMachineRequest,
  "PUT /jumbo-xerox/machines/{id}": schemas.JumboXeroxMachineRequest,
  "POST /jumbo-xerox/configurations": schemas.JumboXeroxMachineRequest,
  "PUT /jumbo-xerox/configurations/{id}": schemas.JumboXeroxMachineRequest,
  "POST /jumbo-xerox/readings": schemas.JumboXeroxReadingRequest,
  "POST /past-date-requests": schemas.PastDateRequest,
  "PUT /past-date-requests/{id}": schemas.PastDateRequest,
  "POST /payments": schemas.PaymentRequest,
  "PUT /payments/{id}": schemas.PaymentRequest,
  "POST /total-amounts": schemas.TotalAmountRequest,
  "PUT /total-amounts/{id}": schemas.TotalAmountRequest,
  "POST /stocks/items": schemas.StockItemRequest,
  "PUT /stocks/items/{id}": schemas.StockItemRequest,
  "POST /stocks/readings": schemas.StockReadingRequest,
  "PUT /stocks/readings/{id}": schemas.StockReadingRequest,
};

module.exports = {
  REAL_IDS,
  schemas,
  endpoints,
};
