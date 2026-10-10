# PrintZ Enterprise — Multi-Branch Print, Operations & Payment Platform

A comprehensive enterprise management system for multi-branch digital print centers, large-format production, commercial job estimates, and retail POS. Built with **Node.js**, **Express.js**, **MongoDB (Mongoose)** following **Clean Architecture (Domain-Driven Design)** on the backend, and **React 18**, **Vite**, and **TailwindCSS** on the frontend.

---

## 🌟 Key System Capabilities

- **🏛️ 100% Database-Driven & Zero-Mock Policy**: Operates exclusively against live MongoDB data. No mock arrays or seed dependencies in operational paths. Real double-entry inventory ledger with atomic stock balance synchronization.
- **👥 Centralized Customer Master Across All Branches**: Single global customer identity reused across all retail branches and warehouses. Cross-branch phone and name search integrated with POS and Job Cart workflows without duplicating profiles.
- **📱 Customer QR Self-Service Job Requests**: Public, rate-limited mobile intake forms via physical store QR codes. Automatically initializes jobs in `ENQUIRY`/`DRAFT` stage, matches or registers centralized customers, and accepts reference artwork attachments.
- **💬 WhatsApp Digital Proofing & Approval Lifecycle**: Automated dispatch of high-resolution digital proofs with cryptographically signed, single-use, expiring WhatsApp approval links. Customers approve or request revisions directly from mobile.
- **⚡ Sequential Machine Operations & Shop-Floor Tracking**: Sequential workflow transitions (`PRINT` ➔ finishing operations ➔ `PACKING`) with machine queue claiming, operator assignments, defect logging, reprint authorizations, and delivery logistics.
- **⏱️ Live Turnaround SLA & Designer Performance**: Turnaround targets configured per stage and job type. Real-time at-risk monitors, stage breach warnings, and customer satisfaction ratings.
- **📖 Complete Swagger / OpenAPI 3.0.3 Specification**: All 288 canonical APIs documented with real request/response DTO schemas, parameter validations, and organized in strict alphabetical order across 36 tags.

---

## 📦 The 9 Core Business Modules

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PRINTZ WORKFLOW ENGINE                                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
      │
      ├── 01. 🔐 Auth & RBAC          (JWT, Session Lifecycle, Roles, Employees, Depts)
      ├── 02. ⚙️ Approvals & Common   (Multi-tier Approval Chains, Audit Logs, Counters)
      ├── 03. 📊 Inventory & Ledger    (Raw Materials, Double-Entry Transactions, GRN)
      ├── 04. 🛒 Point of Sale (POS)  (Retail Cashier Checkout, Pricing Calculator)
      ├── 05. 📦 Product Orders        (Warehouse Fulfillment, Inter-Branch Stock Transfers)
      ├── 06. 📑 Job Orders & Estim.   (Custom Estimations, Stage State Machine, Invoices)
      ├── 07. 🎨 Design & Proofing     (Round-Robin Auto-Allocation, WhatsApp Approvals)
      ├── 08. 🏭 Production & Delivery (Sequential Machine Operations, QC, Reprints, Logistics)
      └── 09. ⏱️ SLA & Performance     (Stage Deadlines, Breach Alarms, Designer Ratings)
```

### Module Breakdown

| Module | Description | Key Endpoints |
| :--- | :--- | :--- |
| **01. Authentication & RBAC** | JWT authentication, refresh token rotation, password recovery, fine-grained permissions, employee directory, departments, and designations. | `/api/v1/auth/*`, `/api/v1/employees/*`, `/api/v1/roles/*`, `/api/v1/departments/*`, `/api/v1/designations/*` |
| **02. Approvals, Audit & Sequences** | Configurable approval workflows, sequential document numbering (`JO-YYYYMMDD-XXXX`), immutable audit trails, and file attachment handling. | `/api/v1/approvals/*`, `/api/v1/audit-logs/*`, `/api/v1/number-sequences/*`, `/api/v1/attachments/*` |
| **03. Inventory & Stock Ledger** | Substrate and raw materials catalog, multi-warehouse stock balances, immutable double-entry ledger transactions, and vendor purchase receipts (GRN). | `/api/v1/inventory-items/*`, `/api/v1/inventory-balances/*`, `/api/v1/inventory-transactions/*`, `/api/v1/purchase-receipts/*` |
| **04. Retail Point of Sale (POS)** | Instant counter checkout, multi-item pricing calculator, tax computation, discount handling, receipt printing, and return processing. | `/api/v1/sale-receipts/*` |
| **05. Product Orders & Transfers** | Finished goods product orders, managerial approval gates, and multi-step inter-branch/warehouse stock transfers (`DISPATCHED` ➔ `RECEIVED`). | `/api/v1/product-orders/*`, `/api/v1/stock-transfers/*` |
| **06. Job Orders & Estimation** | Custom print job estimations, sheet optimization, multi-stage state machine (`ENQUIRY` ➔ `ESTIMATE` ➔ `DESIGN` ➔ `PRODUCTION` ➔ `COMPLETED`), and automated invoicing. | `/api/v1/job-orders/*` |
| **07. Design Workflow & Proofing** | Unassigned job queue, round-robin designer auto-allocation, workload rebalancing, sample upload, and revision feedback tracking. | `/api/v1/design/*` |
| **08. Production, QC & Logistics** | Sequential shop-floor machine operations (`PRINT` ➔ `LAM` ➔ `CUT` ➔ `PACK`), QC defect logging, reprint requests, and delivery order dispatch. | `/api/v1/production-orders/*`, `/api/v1/production-operations/*`, `/api/v1/quality-checks/*`, `/api/v1/reprint-requests/*`, `/api/v1/delivery-orders/*` |
| **09. SLA & Performance Ratings** | Turnaround configuration per job type and priority, live stage breach alerts, customer ratings (1–5 scale), and designer performance analytics. | `/api/v1/sla-configurations/*`, `/api/v1/sla/*`, `/api/v1/designer-ratings/*`, `/api/v1/designers/*` |
| **Centralized Customers** | Global customer profiles shared across all branch locations with multi-branch search, mobile normalization, and credit limit tracking. | `/api/v1/customers/*` |
| **Public Customer Self-Service** | QR code job submission and WhatsApp digital sample proof review/decision (public endpoints with atomic single-use tokens). | `/api/v1/public/*` |
| **Machinery & Daily Counters** | Digital production press registry, daily meter readings, wide-format Jumbo Xerox machines, customer ledger, and daily cashier register closure. | `/api/v1/printers/*`, `/api/v1/printer-readings/*`, `/api/v1/jumbo-xerox/*`, `/api/v1/payments/*`, `/api/v1/total-amounts/*` |

---

## 🏗️ Layered Architecture & Directory Structure

The backend strictly adheres to Clean Architecture with 4 decoupled layers:

```
printz-payment-dashboard-phase1_migration/
├── backend/
│   ├── src/
│   │   ├── presentation/                 # LAYER 1: Presentation Layer
│   │   │   ├── routes/                   # Express Routers (/api/v1/*)
│   │   │   ├── controllers/              # HTTP Request Handlers
│   │   │   ├── validators/               # Express-Validator Schemas
│   │   │   └── middleware/               # Auth, RBAC, Scoping, Errors
│   │   ├── application/                  # LAYER 2: Application Layer
│   │   │   ├── services/                 # Domain Services & Orchestrators
│   │   │   ├── use-cases/                # Command & Query Handlers
│   │   │   └── dto/                      # Data Transfer Objects & Serializers
│   │   ├── domain/                       # LAYER 3: Domain Layer
│   │   │   ├── entities/                 # Enterprise Entity Classes
│   │   │   └── repositories/             # Abstract Repository Interfaces
│   │   ├── infrastructure/               # LAYER 4: Infrastructure Layer
│   │   │   ├── database/mongoose/        # Mongoose Models & Compound Indexes
│   │   │   ├── config/swagger/           # OpenAPI / Swagger Specifications
│   │   │   └── notifications/            # WhatsApp & Email Dispatchers
│   │   ├── shared/                       # Enums, AppErrors, Envelopes
│   │   ├── app.js                        # Express App & Middleware Configuration
│   │   └── server.js                     # Server Entry Point & Mongo Connection
│   ├── tests/                            # Automated Node.js Test Suites
│   ├── uploads/                          # Local Storage for Proofs & Artwork
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/                   # Admin, Manager, Cashier, Common UI
│   │   ├── context/                      # AuthContext, NotificationContext
│   │   ├── services/                     # Axios API Client & Services
│   │   ├── App.jsx                       # Routing & Role-Based Layouts
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md                             # Single Authoritative Documentation
```

---

## 📖 API Documentation & Swagger Explorer

An interactive Swagger UI is available directly from the running backend:

- **Swagger UI**: [`http://localhost:5000/api-docs`](http://localhost:5000/api-docs)
- **OpenAPI 3.0.3 Spec (JSON)**: [`http://localhost:5000/api-docs.json`](http://localhost:5000/api-docs.json)

### Alphabetical Tag & Operation Ordering

All 36 tags display in strict alphabetical order:

1. **Approvals**
2. **Attachments**
3. **Audit Logs**
4. **Authentication**
5. **Branches**
6. **Categories**
7. **Customers**
8. **Delivery & Logistics**
9. **Departments**
10. **Design & Proofing**
11. **Designations**
12. **Employees**
13. **Inventory Balances**
14. **Inventory Items**
15. **Inventory Transactions**
16. **Job Orders**
17. **Jumbo Xerox**
18. **Number Sequences**
19. **POS Sale Receipts**
20. **Past Date Requests**
21. **Payments to Collect**
22. **Printer Readings**
23. **Printers**
24. **Product Orders**
25. **Production & Operations**
26. **Public & Customer Self-Service**
27. **Purchase Receipts**
28. **Quality Control & Reprint**
29. **Reports & KPIs**
30. **Revenue & Total Amounts**
31. **Roles & Permissions**
32. **SLA & Performance**
33. **Sales**
34. **Stock Transfers**
35. **Stocks**
36. **Users & RBAC**

Inside each tag, operations are sorted alphabetically by their action name (e.g., `Activate Customer`, `Create Customer`, `Deactivate Customer`, `Get Customer by ID`, `List Customers`, `Search Customers`, `Update Customer`).

---

## 🚀 Setup & Installation

### Prerequisites

- **Node.js**: Version 18.x, 20.x, or 24.x LTS
- **MongoDB**: Version 6.0+ (Local instance on `mongodb://localhost:27017` or MongoDB Atlas)
- **npm**: Version 9.x or later

### 1. Backend Setup

```bash
cd backend

# Copy environment variables template
cp .env.example .env

# Install backend dependencies
npm install

# Start development server with hot-reload
npm run dev

# Or start in production mode
npm start
```

Default backend server runs on `http://localhost:5000` (API base: `http://localhost:5000/api/v1`).

### 2. Frontend Setup

```bash
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```

Default frontend web application runs on `http://localhost:5173`.

### 3. Environment Variables (`backend/.env`)

```ini
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/printzpayment

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=8h
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here
JWT_REFRESH_EXPIRE=7d

# Public Links & Client Configuration
CLIENT_URL=http://localhost:5173
PUBLIC_API_URL=http://localhost:5000/api/v1

# WhatsApp Cloud API (Optional - Automatically falls back to resilient mock dispatch if not provided)
WHATSAPP_API_TOKEN=your_whatsapp_bearer_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
```

---

## 🏛️ Pure Database-Driven Operations (Zero Seed / Zero Mock Policy)

The PrintZ backend operates **100% on live MongoDB database transactions**:
- **No Mock or Seed Data**: No mock fixtures, in-memory dummy objects, or seed scripts are bundled or loaded.
- **Strict Database Persistence**: All operational data (Users, Roles, Branches, Inventory Items, Job Orders, Operations, and SLAs) is queried, updated, and persisted directly in the live database.
- **Double-Entry Stock Ledger**: All inventory adjustments and sales execute atomic database transactions ensuring stock balance consistency.

---

## 🔑 Authentic System Accounts & Roles

| Role | Email | Password | Branch Scope | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@printz.shop` | `Admin@123` | Global (All Branches) | Full System Access |
| **Admin / Dev** | `printzdev@gmail.com` | `Admin@123` | Global (All Branches) | Full System Access |
| **Branch Manager** | `lr@printz.shop` | `Manager@123` | Lingrajpuram | Store Manager |
| **Branch Manager** | `tan@printz.shop` | `Manager@123` | Thanisandra | Store Manager |
| **Branch Manager** | `hbr@printz.shop` | `Manager@123` | HBR Layout | Store Manager |
| **Branch Manager** | `rm@printz.shop` | `Manager@123` | Ramamurthynagar | Store Manager |
| **Branch Manager** | `printzzzko@gmail.com` | `Manager@123` | Kothanur | Store Manager |
| **Branch Manager** | `ag@printz.shop` | `Manager@123` | Horamavu Agara | Store Manager |
| **Branch Manager** | `ba@printz.shop` | `Manager@123` | Babusapalya | Store Manager |
| **Branch Manager** | `ho@printz.shop` | `Manager@123` | Horamavu | Store Manager |

---

## 🔒 Standardized API Response Envelopes

All HTTP API endpoints adhere to a uniform JSON response structure:

### Success Response Envelope:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142
  }
}
```

### Error Response Envelope:
```json
{
  "success": false,
  "message": "Validation error or business conflict",
  "errors": [
    {
      "field": "mobile",
      "message": "A valid 10-digit mobile number is required"
    }
  ]
}
```

---

## 📄 License & Maintainer

- **Organization**: PrintZ Enterprise Multi-Branch Systems
- **Platform Version**: 3.0.0
- **License**: Proprietary — Internal Enterprise Distribution Only
