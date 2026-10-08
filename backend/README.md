# Printz V3 — Backend API

Backend service for the **Printz Multi-Branch Payment, Job Management & Operations Dashboard**, built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)** following **Clean Architecture (Domain-Driven Design principles)**.

---

## 🏗️ Architecture & Folder Structure

```
backend/
├── src/
│   ├── application/                           # Application Business Logic
│   │   ├── dto/                               # Data Transfer Objects (DTOs) & input serializers
│   │   ├── services/                          # Domain application orchestrators & workflow engines
│   │   │   ├── design/                        # Designer allocation, sample approvals & workload
│   │   │   ├── job-order/                     # Job state transitions, history, timeline
│   │   │   ├── production/                    # Routing, operations scheduling, queue execution
│   │   │   └── sla/                           # SLA tracking, dynamic timer jobs, designer scoring
│   │   └── use-cases/                         # Single-responsibility use cases
│   │       ├── auth/                          # Authentication & token management
│   │       ├── branches/                      # Branch management
│   │       ├── general/                       # Categories, inventory movement, sales, date locks
│   │       ├── jumbo-xerox/                   # Large format rates & daily entries
│   │       ├── past-date-requests/            # Past-date unlock requests & approvals
│   │       ├── payments/                      # Customer payments & receivables
│   │       ├── printer-readings/              # Daily counter meter readings
│   │       ├── printers/                      # Master printer inventory
│   │       ├── reports/                       # Dashboard summaries & revenue metrics
│   │       ├── stocks/                        # Stock inventory & daily consumption
│   │       ├── total-amounts/                 # Daily business reconciliation
│   │       └── users/                         # User & role administration
│   ├── domain/                                # Core Domain Layer (Pure Enterprise Rules)
│   │   ├── entities/                          # Domain Entities & Business Models
│   │   └── repositories/                      # Abstract Repository Interfaces (Contracts)
│   ├── infrastructure/                        # Infrastructure & External Adapters
│   │   ├── config/                            # Environment config, Swagger / OpenAPI specs
│   │   ├── database/mongoose/                 # Mongoose ODM schemas & concrete repositories
│   │   │   ├── models/                        # Mongoose Schemas (User, Branch, JobOrder, SLA, etc.)
│   │   │   └── repositories/                  # Concrete MongoDB Repository implementations
│   │   └── email/                             # Email service (SMTP / Password Reset notifications)
│   ├── presentation/                          # Presentation Layer (HTTP / Express)
│   │   ├── controllers/                       # Express route controllers & response handling
│   │   ├── middleware/                        # JWT authentication, RBAC authorization, error handlers
│   │   ├── routes/                            # Modular Express route declarations
│   │   └── validators/                        # Express-validator schema rules & sanitization
│   ├── shared/                                # Cross-Cutting Shared Modules
│   │   ├── constants/                         # System roles, job stages, status enums
│   │   ├── errors/                            # Standardized AppError & ErrorHelper
│   │   ├── events/                            # Decoupled EventEmitters & Event Listeners
│   │   ├── response/                          # Standardized JSON ResponseHelper
│   │   └── asyncHandler.js                    # Async route controller wrapper
│   ├── app.js                                 # Express application setup, security, CORS & Swagger
│   └── server.js                              # Application entrypoint & MongoDB bootstrapper
├── .env                                       # Local environment variables (git-ignored)
├── .env.example                               # Environment template with placeholder values
├── .gitignore                                 # Git ignore definitions
├── package.json                               # Dependencies and npm scripts
└── README.md                                  # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **MongoDB**: MongoDB Atlas cluster or local MongoDB instance (`v6.0+`)
- **npm** or **yarn** / **pnpm**

### 2. Installation
```bash
# Navigate to the backend directory
cd backend

# Install project dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `backend/` directory by copying from `.env.example`:

```bash
cp .env.example .env
```

Configure your variables accordingly:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/printzpayment
JWT_ACCESS_SECRET=your_jwt_access_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000,http://localhost:5173
APP_URL=http://localhost:5173

# Optional SMTP Configuration for Password Reset Emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_app_password
SMTP_FROM="Printz Portal" <no-reply@printz.shop>
```

### 4. Running the Server

```bash
# Development mode (with live reload via nodemon)
npm run dev

# Production mode
npm start
```

Once running:
- **API Base URL**: `http://localhost:5000/api` (or `http://localhost:5000/api/v1`)
- **Interactive Swagger Documentation**: `http://localhost:5000/api-docs`
- **OpenAPI JSON Specification**: `http://localhost:5000/api-docs.json`

---

## 📡 Core API Modules & Endpoints

### 🔐 01. Authentication & Users (`/api/auth`, `/api/users`)
- `POST /api/auth/login` — User authentication & JWT issuance.
- `POST /api/auth/register` — Register a new staff / admin user.
- `GET /api/auth/me` — Retrieve current authenticated user profile.
- `POST /api/auth/refresh-token` — Rotate and refresh expired access token.
- `GET /api/users` — Search and paginate system users.
- `PUT /api/users/:id` — Update user permissions, roles, and branch assignments.

### 🏢 02. Branch Management (`/api/branches`)
- `GET /api/branches` — List all active branches.
- `POST /api/branches` — Create a new branch (Admin).
- `GET /api/branches/:id` — Get detailed branch info.
- `PUT /api/branches/:id` — Update branch settings.
- `DELETE /api/branches/:id` — Deactivate or remove a branch.

### 🖨️ 03. Printers & Meter Readings (`/api/printers`, `/api/printer-readings`)
- `GET /api/printers` — List configured printers with branch filtering.
- `POST /api/printers` — Register new printer asset.
- `GET /api/printer-readings` — Daily counter meter readings (opening, closing, copies, total amount).
- `POST /api/printer-readings` — Submit daily meter entries.

### 📑 04. Jumbo Xerox & Large Format (`/api/jumbo-xerox`)
- `GET /api/jumbo-xerox` — Master large-format rate cards and paper types.
- `GET /api/jumbo-xerox/readings` — Daily large format reading logs.
- `POST /api/jumbo-xerox/readings` — Submit daily large format readings.

### 📦 05. Stocks & Inventory (`/api/stocks`, `/api/general`)
- `GET /api/stocks` — Master inventory catalog items.
- `POST /api/stocks` — Add new stock item.
- `GET /api/stocks/readings` — Daily stock opening, incoming, sold, and closing quantities.
- `POST /api/stocks/readings` — Record daily stock count.
- `GET /api/general/categories` — Product and stock category lists.
- `POST /api/general/inventory-movements` — Stock transfers and stock adjustment logs.

### 📋 06. Job Orders Lifecycle (`/api/job-orders`)
- `GET /api/job-orders` — Filter, paginate, and search customer job orders.
- `POST /api/job-orders` — Create a new customer job order.
- `GET /api/job-orders/:id` — Detailed job order specification, items, and design history.
- `PATCH /api/job-orders/:id/status` — Transition job order status (`PENDING`, `DESIGN_QUEUE`, `IN_DESIGN`, `SAMPLE_APPROVAL`, `PRODUCTION_QUEUE`, `IN_PRODUCTION`, `READY_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`).
- `GET /api/job-orders/:id/timeline` — Complete audit trail and lifecycle event log.

### 🎨 07. Design Workflow & Designer Allocation (`/api/design`)
- `GET /api/design/designer/workload` — Active designer queue, current jobs, and load distribution.
- `POST /api/design/assignments/allocate` — Intelligent/manual job assignment to designer.
- `POST /api/design/assignments/:id/start` — Start designing active job.
- `POST /api/design/assignments/:id/samples` — Upload & submit design proof sample for review.
- `POST /api/design/samples/:id/review` — Customer / Manager sample approval or revision request.

### ⚙️ 08. Production Workflow, QC & Delivery (`/api/production`, `/api/production-*`, `/api/delivery-orders`)
- `POST /api/production-orders` / `POST /api/job-orders/:id/production/plan` — Create production order & operation routing.
- `GET /api/production-queue` — Live machine-wise production queue and pending operations.
- `POST /api/production-operations/:id/start` — Start production process on machine.
- `POST /api/production-operations/:id/complete` — Complete production process.
- `POST /api/quality-checks` — Record QC inspection (Pass / Fail / Partial).
- `POST /api/reprint-requests` — Request reprint on damaged / defected items.
- `POST /api/delivery-orders` — Generate dispatch / delivery challan and handover items.

### ⏱️ 09. SLA & Designer Performance Tracking (`/api/sla`, `/api/sla-configurations`, `/api/designer-ratings`, `/api/designers`)
- `GET /api/sla-configurations` — Master SLA duration rules by item type and priority.
- `GET /api/sla/job-order/:jobOrderId` — Live SLA countdown, remaining time, and breach status.
- `GET /api/sla/breaches` — List of active SLA breaches and escalation alerts.
- `POST /api/designer-ratings` — Score designer turnaround speed, design quality, and customer satisfaction.
- `GET /api/designers/performance` — Comprehensive designer KPIs (Turnaround Time, First-Time Pass Rate, SLA Compliance %, Rating Avg).

### 💰 10. Financials, POS Sales & Reports (`/api/total-amounts`, `/api/payments`, `/api/general/sales`, `/api/reports`, `/api/past-date-requests`)
- `GET /api/total-amounts` — Daily branch business reconciliation (Cash, Online, Expenses, Opening/Closing balance).
- `POST /api/total-amounts` — Record daily business closure.
- `GET /api/payments` — Payment transactions and credit receivables.
- `POST /api/general/sales` — POS counter sales & instant billing.
- `GET /api/reports/dashboard-summary` — Multi-branch revenue and operational dashboard metrics.
- `GET /api/reports/monthly-revenue` — Monthly revenue breakdown.
- `POST /api/general/finalized-dates` — Lock and seal finalized daily business dates.
- `POST /api/past-date-requests` — Request unlock permissions to edit historical records.

---

## 🛡️ Security, RBAC & Architecture Highlights

- **Clean Architecture & DDD**: Strict separation of concerns across `domain`, `application`, `infrastructure`, and `presentation` layers.
- **Database-Driven Design**: 100% connected to MongoDB via Mongoose repositories with zero hardcoded mock/seed dependencies.
- **Role-Based Access Control (RBAC)**: Fine-grained middleware authorization for roles (`admin`, `manager`, `designer`, `operator`, `accountant`).
- **Decoupled Event Architecture**: Node.js `EventEmitter` handles asynchronous side-effects (SLA timer starts, automated designer allocation, breach notifications).
- **Automated Background Scheduler**: Built-in SLA timer evaluation and breach monitor running smoothly without blocking HTTP request threads.
- **Security & Validation**: Protected with `Helmet`, sanitized input with `express-validator`, rate limiting, and configurable CORS whitelists.
