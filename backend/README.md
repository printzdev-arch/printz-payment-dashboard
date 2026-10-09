# Printz V3 Backend — Architecture, API & Database Documentation

Backend service for the **Printz Multi-Branch Payment, Job Management & Operations Dashboard**, built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)** following **Clean Architecture (Domain-Driven Design principles)**.

---

## 🏛️ Pure Database-Driven Architecture (Zero Seed / Zero Mock Policy)

> [!IMPORTANT]
> **Strict Database-Driven Policy:**
> This project operates **100% on live MongoDB data**.
> - **No Mock / Dummy Data:** No in-memory arrays or hardcoded mock objects are used in business flows.
> - **No Seed Dependencies:** All data (Users, Roles, Branches, Inventory Items, Balances, Job Orders, Production Operations, SLAs) is queried, mutated, and persisted directly in the MongoDB database.
> - **Immutable Double-Entry Ledger:** All inventory movements and sales use strict database-level atomic transactions ensuring stock balance consistency without synthetic adjustments.

---

## 🏗️ Layered Architecture & Directory Structure

All 9 business modules are consistently organized across all 4 architectural layers:

```
backend/
├── src/
│   ├── presentation/                     # LAYER 1: Presentation Layer (HTTP / REST APIs)
│   │   ├── routes/                       # Express Route Modules
│   │   │   ├── auth/                     # Module 01: Auth, Users, Roles, Permissions
│   │   │   ├── common/                   # Module 02: Audit Logs, Approvals, Sequences, Attachments
│   │   │   ├── design/                   # Module 07: Design Queue & Sample Proofs
│   │   │   ├── inventory/                # Module 03: Items, Balances, Transactions, Purchase Receipts
│   │   │   ├── job-order/                # Module 06: Custom Job Orders & Estimates
│   │   │   ├── pos/                      # Module 04: POS Sale Receipts & Checkout
│   │   │   ├── product-order/            # Module 05: Product Orders & Stock Transfers
│   │   │   ├── production/               # Module 08: Production Orders, Machine Ops, QC, Delivery
│   │   │   ├── sla/                      # Module 09: SLA Configurations, Rules & Ratings
│   │   │   └── index.js                  # Centralized Route Aggregator (/api/v1/*)
│   │   ├── controllers/                  # Route Request Controllers
│   │   │   ├── auth/                     # Auth & User Controllers
│   │   │   ├── common/                   # Common Service Controllers
│   │   │   ├── design/                   # Design Queue & Sample Controllers
│   │   │   ├── inventory/                # Inventory Controllers
│   │   │   ├── job-order/                # Job Order Controllers
│   │   │   ├── pos/                      # POS Checkout Controllers
│   │   │   ├── product-order/            # Product Order Controllers
│   │   │   ├── production/               # Production, QC & Delivery Controllers
│   │   │   └── sla/                      # SLA & Designer Rating Controllers
│   │   ├── validators/                   # Payload Validation Schemas (express-validator)
│   │   │   ├── auth/ common/ design/ inventory/ job-order/ pos/ product-order/ production/ sla/
│   │   └── middleware/                   # JWT Auth, RBAC Permission Guards, Error & 404 Handlers
│   │
│   ├── application/                      # LAYER 2: Application Layer (Business Workflows)
│   │   ├── services/                     # Domain Services & Workflow Orchestrators
│   │   │   ├── auth/ common/ design/ inventory/ job-order/ pos/ product-order/ production/ sla/
│   │   ├── use-cases/                    # Modular CQRS / Use-Case Command Handlers
│   │   └── dto/                          # Data Transfer Objects & Response Serializers
│   │       ├── auth/ common/ design/ inventory/ job-order/ pos/ product-order/ production/ sla/
│   │
│   ├── domain/                           # LAYER 3: Domain Layer (Pure Business Rules)
│   │   ├── entities/                     # Enterprise Domain Entity Classes
│   │   │   ├── auth/ common/ design/ inventory/ job-order/ pos/ product-order/ production/ sla/
│   │   └── repositories/                 # Abstract Repository Interface Contracts
│   │
│   ├── infrastructure/                   # LAYER 4: Infrastructure Layer (Data & Adapters)
│   │   ├── database/mongoose/
│   │   │   ├── models/                   # Mongoose Database Models & Compound Indexes
│   │   │   │   ├── auth/ common/ design/ inventory/ job-order/ pos/ product-order/ production/ sla/
│   │   │   │   └── index.js              # Models Barrel Export
│   │   │   └── repositories/             # Concrete MongoDB Mongoose Repository Implementations
│   │   ├── auth/                         # Bcrypt password hashing & JWT generation
│   │   ├── config/                       # Database connection pool & Environment parser
│   │   └── audit/                        # Immutable Audit Logger Dispatcher
│   │
│   ├── shared/                           # Cross-Cutting Concerns
│   │   ├── constants/                    # System Roles, Job Stages, Status Enums
│   │   ├── errors/                       # AppError & Error Types
│   │   ├── response/                     # Standard Response Envelope Helper ({ success, data, meta })
│   │   └── asyncHandler.js               # Async route error wrapper
│   │
│   ├── app.js                            # Express Server Setup, Helmet, CORS & Routing
│   └── server.js                         # Server Bootstrapper & MongoDB Connection
├── tests/                                # Test Verification Suites
├── uploads/                              # File Storage Target Directory
├── .env.example                          # Environment Variables Template
├── package.json                          # Scripts & Dependencies
└── README.md                             # Single Authoritative Documentation
```

---

## 📦 The 9 Core Modules Across All Layers

### 1. 🔐 `auth` Module (Authentication, Users & RBAC)
* **Presentation:** `routes/auth/`, `controllers/auth/`, `validators/auth/`
* **Application:** `services/auth/`, `use-cases/auth/`, `dto/auth/`
* **Domain:** `entities/auth/User.js`, `entities/auth/Role.js`, `Permission.js`
* **Infrastructure:** `models/auth/User.js`, `models/auth/Role.js`, `models/auth/Permission.js`
* **Scope:** JWT Login/Refresh tokens, bcrypt password hashing, 7 System Roles (`SUPER_ADMIN`, `ADMIN`, `BRANCH_MANAGER`, `CASHIER`, `DESIGNER`, `PRODUCTION_OPERATOR`, `QC_INSPECTOR`), fine-grained permissions, Employee Directory, Departments, Designations.

### 2. ⚙️ `common` Module (Number Sequences, Audit & Approvals)
* **Presentation:** `routes/common/` (`auditLog`, `approval`, `numberSequence`, `attachment`)
* **Application:** `services/common/` (`NumberSequenceService`, `ApprovalService`, `AuditService`)
* **Domain:** `entities/common/` (`AuditLog`, `NumberSequence`, `Approval`)
* **Infrastructure:** `models/common/` (`AuditLog.js`, `Sequence.js`, `JobApproval.js`)
* **Scope:** Concurrency-safe atomic sequence generation (`JOB-YYYYMMDD-XXXX`, `SR-XXXXX`, `PO-XXXXX`, `ST-XXXXX`), immutable security audit logs, multi-tier approvals, file attachments.

### 3. 📦 `inventory` Module (Ledger, Balances & Transactions)
* **Presentation:** `routes/inventory/` (`inventoryItem`, `inventoryBalance`, `inventoryTransaction`, `purchaseReceipt`)
* **Application:** `services/inventory/` (`InventoryBalanceService`, `InventoryTransactionService`)
* **Domain:** `entities/inventory/` (`InventoryItem`, `InventoryBalance`, `InventoryTransaction`)
* **Infrastructure:** `models/inventory/` (`InventoryItem.js`, `InventoryBalance.js`, `InventoryTransaction.js`)
* **Scope:** SKU catalog, multi-branch stock balances, double-entry immutable ledger tracking ($\sum \text{Ledger Transactions} \equiv \text{Current Balance}$), purchase receipts.

### 4. 🛒 `pos` Module (Point of Sale & Checkout)
* **Presentation:** `routes/pos/` (`saleReceipt.routes.js`)
* **Application:** `services/pos/` (`SaleReceiptService`, `PosCheckoutService`)
* **Domain:** `entities/pos/` (`SaleReceipt.js`, `ReceiptPayment.js`)
* **Infrastructure:** `models/pos/` (`SaleReceipt.js`)
* **Scope:** Over-the-counter sales, real-time GST tax calculations, atomic stock deduction, receipt issuance (`SR-XXXXX`), cash/card/UPI payment capture.

### 5. 🚚 `product-order` Module (Branch Orders & Stock Transfers)
* **Presentation:** `routes/product-order/` (`productOrderRoutes`, `stockTransferRoutes`)
* **Application:** `services/product-order/` (`ProductOrderService`, `StockTransferService`)
* **Domain:** `entities/product-order/` (`ProductOrder.js`, `StockTransfer.js`)
* **Infrastructure:** `models/product-order/` (`ProductOrder.js`, `StockTransfer.js`)
* **Scope:** Branch replenishment requisitions, supervisor approvals, two-step warehouse stock movement (`DISPATCHED` → `RECEIVED`), variance recording.

### 6. 📑 `job-order` Module (Custom Print Orders & Workflows)
* **Presentation:** `routes/job-order/` (`jobOrder.routes.js`, `estimate.routes.js`)
* **Application:** `services/job-order/` (`JobOrderService`, `JobEstimateService`, `JobWorkflowService`)
* **Domain:** `entities/job-order/` (`JobOrder.js`, `JobEstimate.js`, `JobWorkflowEvent.js`)
* **Infrastructure:** `models/job-order/` (`JobOrder.js`, `JobWorkflowEvent.js`, `JobInvoice.js`)
* **Scope:** Custom print jobs, quote estimation and client approval, bypass routing for print-ready artworks, stage history transitions, finalized GST invoices.

### 7. 🎨 `design` Module (Round-Robin Allocation & Proofs)
* **Presentation:** `routes/design/` (`design.routes.js`, `designSample.routes.js`)
* **Application:** `services/design/` (`DesignAllocationService`, `DesignQueueService`)
* **Domain:** `entities/design/` (`DesignSample.js`, `DesignAssignment.js`)
* **Infrastructure:** `models/design/` (`RoundRobinPointer.js`, `DesignSample.js`)
* **Scope:** Automated round-robin designer allocation, design queue, proof sample versioning (v1..vN), customer approval decisions (`APPROVED` / `REVISION_REQUIRED`).

### 8. 🏭 `production` Module (Machine Ops, QC & Delivery)
* **Presentation:** `routes/production/` (`productionOrders`, `productionOperations`, `qualityChecks`, `reprintRequests`, `deliveryOrders`)
* **Application:** `services/production/` (`ProductionOrderService`, `OperationService`, `QCService`, `DeliveryService`)
* **Domain:** `entities/production/` (`ProductionOrder.js`, `ProductionOperation.js`, `QualityCheck.js`)
* **Infrastructure:** `models/production/` (`ProductionOrder.js`, `ProductionOperation.js`, `QualityCheck.js`, `DeliveryOrder.js`, `ReprintRequest.js`)
* **Scope:** Production planning, sequential operation execution (`PRINT` → `FINISHING` → `PACKING`), operator machine logging, QC gate (`PASS` → `READY` / `ISSUE` → `REWORK`), reprint supervisor approvals, delivery dispatches.

### 9. ⏱️ `sla` Module (SLA Engine & Designer Ratings)
* **Presentation:** `routes/sla/` (`slaConfiguration`, `slaStatus`, `designerRating`, `performance`)
* **Application:** `services/sla/` (`SlaEngineService`, `SlaSchedulerService`, `DesignerRatingService`)
* **Domain:** `entities/sla/` (`SlaConfiguration.js`, `DesignerRating.js`)
* **Infrastructure:** `models/sla/` (`SlaConfiguration.js`, `DesignerRating.js`)
* **Scope:** SLA stage thresholds, automated breach detection background scheduler, customer feedback star ratings, designer productivity scorecards.

---

## 📡 Complete REST API Reference (`/api/v1/*`)

| Module | Method | Endpoint | Description | Auth / Permission |
| :--- | :---: | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/login` | User login & JWT issuance | Public |
| | `POST` | `/api/v1/auth/refresh-token` | Renew expired access token | Public (Valid Refresh Token) |
| | `GET` | `/api/v1/users` | List system users | `SUPER_ADMIN`, `ADMIN` |
| | `GET` | `/api/v1/roles` | List system RBAC roles & permissions | Authenticated |
| | `GET` | `/api/v1/employees` | List employee directory | `HR_EMPLOYEE_VIEW` |
| **Common** | `GET` | `/api/v1/audit-logs` | Retrieve immutable audit records | `SUPER_ADMIN`, `ADMIN` |
| | `GET` | `/api/v1/number-sequences` | List number sequences | `ADMIN` |
| **Inventory** | `GET` | `/api/v1/inventory-items` | Get inventory item catalog | Authenticated |
| | `POST` | `/api/v1/inventory-items` | Create new SKU item | `inventory.create` |
| | `GET` | `/api/v1/inventory-balances` | Branch inventory balance levels | Authenticated |
| | `POST` | `/api/v1/inventory-transactions/opening` | Post opening stock ledger entry | `inventory.manage` |
| | `POST` | `/api/v1/purchase-receipts` | Inward purchase stock receipt | `inventory.purchase` |
| **POS** | `POST` | `/api/v1/sale-receipts/checkout` | POS Cart Checkout & Stock Deduction | `pos.saleReceipt.create` |
| | `GET` | `/api/v1/sale-receipts` | List branch POS sales | Authenticated |
| **Product Order**| `POST` | `/api/v1/product-orders` | Create branch stock requisition | `productOrder.create` |
| | `POST` | `/api/v1/product-orders/:id/approve` | Approve order & generate transfer | `productOrder.approve` |
| | `POST` | `/api/v1/stock-transfers/:id/dispatch`| Warehouse stock dispatch | `inventory.transfer` |
| | `POST` | `/api/v1/stock-transfers/:id/receive` | Branch stock receipt confirmation | `inventory.transfer` |
| **Job Order** | `POST` | `/api/v1/job-orders` | Create custom job order | `jobOrder.create` |
| | `POST` | `/api/v1/job-orders/:id/estimate/approve` | Approve estimate & route to queue | `jobOrder.estimate` |
| | `POST` | `/api/v1/job-orders/:id/skip-design` | Direct bypass to production | `jobOrder.manage` |
| | `POST` | `/api/v1/job-orders/:id/invoice` | Generate final GST sales invoice | `jobOrder.invoice` |
| **Design** | `GET` | `/api/v1/design/queue` | View active design queue | `designer.view` |
| | `POST` | `/api/v1/job-orders/:id/samples` | Upload artwork sample proof | `designer.upload` |
| | `POST` | `/api/v1/job-orders/:id/samples/:id/decision` | Customer proof approval / revision | `jobOrder.edit` |
| **Production** | `POST` | `/api/v1/job-orders/:id/production/plan` | Plan production operations | `production.create` |
| | `POST` | `/api/v1/production-operations/:id/start` | Start machine operation | `production.execute` |
| | `POST` | `/api/v1/production-operations/:id/complete`| Complete machine operation | `production.execute` |
| | `POST` | `/api/v1/production-orders/:id/quality-checks` | QC Inspection (PASS / REWORK) | `production.qc` |
| | `POST` | `/api/v1/delivery-orders/:id/deliver` | Mark job delivered to customer | `delivery.manage` |
| **SLA** | `GET` | `/api/v1/sla-configurations` | Get stage SLA thresholds | Authenticated |
| | `GET` | `/api/v1/job-orders/:id/sla` | Get job SLA status & stages | Authenticated |
| | `POST` | `/api/v1/job-orders/:id/designer-ratings`| Submit customer designer rating | Authenticated |
| **System** | `GET` | `/health` | Health & MongoDB connectivity status | Public |
| | `GET` | `/api-docs` | Interactive Swagger OpenAPI Explorer | Public |

---

## 🚀 Setup & Execution Guide

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **MongoDB**: Active MongoDB instance running locally (`mongodb://localhost:27017`) or via MongoDB Atlas

### 2. Environment Configuration
Create a `.env` file in the root `backend/` directory:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/printzpayment
JWT_ACCESS_SECRET=printz_enterprise_jwt_access_secret_super_secure_key_2026_prod
JWT_ACCESS_EXPIRES_IN=100m
JWT_REFRESH_SECRET=printz_enterprise_jwt_refresh_secret_super_secure_key_2026_prod
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000,http://localhost:3001,http://localhost:5173
APP_URL=http://localhost:5173
```

### 3. Starting the Server

```powershell
# Install dependencies
npm install

# Run in development mode with nodemon hot-reload
npm run dev

# Run in production mode
npm start
```

### 4. Exploring the APIs
- **Swagger Documentation:** `http://localhost:5000/api-docs`
- **Health Check Endpoint:** `http://localhost:5000/health`
- **Base API Endpoint:** `http://localhost:5000/api/v1`

---

## 🛡️ Global Standard Response Formats

### Success Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": {
    "_id": "6ac925edd365a80fc2e908c4",
    "jobNo": "JO-20261009-0008",
    "stage": "PRODUCTION_PLANNING",
    "grandTotal": 2450.00
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### Error Response (`400`, `401`, `403`, `404`, `422`, `429`, `500`)
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Requested quantity exceeds available stock balance",
    "details": []
  }
}
```

---
**Printz Payment Dashboard — Pure Database-Driven Enterprise Backend**
