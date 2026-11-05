# PrintZ V2 Backend Service (MVC Architecture)

Production-ready, API-based MVC backend for the PrintZ Enterprise Multi-Branch Payment, Job Tracking, Manufacturing, and Point of Sale Platform.

---

## 🛠️ Architecture & Tech Stack

- **Pattern**: API-based Model-View-Controller (MVC) with focused domain services
- **Runtime & Framework**: Node.js & Express.js
- **Database & ODM**: MongoDB (6.0+) & Mongoose (8.5+)
- **Security & Middleware**: JWT Authentication (Access + Refresh Token lifecycle), RBAC (Role-Based Access Control) with granular action permissions, Helmet, CORS, Express Rate Limiting
- **API Documentation**: OpenAPI 3.0 / Swagger UI at `http://localhost:5000/api-docs` and JSON spec at `/api-docs.json`
- **File Uploads**: Multer storage pipelines with MIME/extension sanitization
- **Logging & Monitoring**: Morgan HTTP logger and centralized audit logging
- **Dual Prefix Support**: Both `/api` and `/api/v1` routes supported with full contract parity

---

## 📂 MVC Folder Structure

```text
backend/
├── src/
│   ├── config/                     # Environment, database, CORS, and Swagger configuration
│   │   ├── database.js             # Mongoose connection & disconnect lifecycle
│   │   ├── env.js                  # Centralized, validated environment configuration
│   │   ├── cors.js                 # Cross-origin policy & allowed client origins
│   │   ├── swagger.js              # Swagger JSDoc root options
│   │   └── swagger/                # Modular OpenAPI documentation components
│   │
│   ├── models/                     # Mongoose persistence models, schemas, hooks & indexes
│   │   ├── User.js                 # User credentials & role associations
│   │   ├── Role.js                 # Role & permission definitions
│   │   ├── Customer.js             # Customer master records
│   │   ├── JobOrder.js             # Multi-stage Job Order lifecycle model
│   │   ├── ProductionOrder.js      # Production scheduling & routing
│   │   ├── Invoice.js              # GST & Commercial invoices
│   │   ├── Payment.js              # Payment settlements & advance tracking
│   │   ├── ...                     # 76 total Mongoose domain models
│   │   └── repositories/           # Data access repositories
│   │
│   ├── controllers/                # HTTP request handlers (asyncHandler + ResponseHelper)
│   │   ├── auth.controller.js
│   │   ├── customer.controller.js
│   │   ├── jobOrder.controller.js
│   │   ├── ...                     # 55 controllers across all modules
│   │   └── index.js                # Central controllers barrel
│   │
│   ├── services/                   # Business logic, state transitions & domain rules
│   │   ├── auth.service.js         # Login, token lifecycle, password recovery
│   │   ├── customer.service.js     # Customer management & ledger
│   │   ├── jobOrder.service.js     # Job Order workflows (Quote, Design, Production, Billing)
│   │   ├── production.service.js   # Work order planning, operation routing & queue
│   │   ├── ...                     # 64 domain services
│   │   └── index.js                # Central services barrel
│   │
│   ├── routes/                     # REST API route definitions with middleware & validation
│   │   ├── auth.routes.js
│   │   ├── customer.routes.js
│   │   ├── jobOrder.routes.js
│   │   ├── ...                     # Route modules with dual /api and /api/v1 mounting
│   │   └── index.js                # Master route aggregator
│   │
│   ├── middleware/                 # Request interceptors & security controls
│   │   ├── auth.middleware.js      # JWT token authentication & revocation checks
│   │   ├── role.middleware.js      # Role-based access control
│   │   ├── permission.middleware.js# Granular permission verification
│   │   ├── validation.middleware.js# Schema validation error formatting
│   │   ├── upload.middleware.js    # Multer file upload & directory creation
│   │   ├── error.middleware.js     # Centralized operational & unhandled error handler
│   │   └── notFound.middleware.js  # 404 handler returning standard ApiError responses
│   │
│   ├── validators/                 # Request validation schemas (express-validator)
│   │   ├── auth.validator.js
│   │   ├── customer.validator.js
│   │   └── ...                     # Per-module validation chains
│   │
│   ├── utils/                      # Shared utilities, constants, events & integrations
│   │   ├── ApiError.js             # Standard operational error class
│   │   ├── asyncHandler.js         # Async error wrapper for controllers
│   │   ├── ResponseHelper.js       # Standardized JSON response formatting
│   │   ├── constants/              # System enums, order statuses & stages
│   │   ├── events/                 # Domain event emitters & subscribers
│   │   ├── helpers/                # Scoping, calculation & number sequence utilities
│   │   └── integrations/           # JWT, Bcrypt, Email, WhatsApp & Encryption services
│   │
│   ├── dto/                        # Request and response data transfer objects
│   ├── app.js                      # Express application setup, middleware & route mounting
│   └── server.js                   # Process entry point, DB connection & graceful shutdown
│
├── tests/                          # Automated regression & contract verification tests
│   ├── models_verification_test.js # Verifies 76 Mongoose models, schemas & collection names
│   ├── route_inventory_test.js     # Verifies all 860 route paths and dual prefix mounting
│   └── api_http_regression_test.js # Live HTTP server tests (Auth, 404, 400, 200, security)
│
├── uploads/                        # User-uploaded files, proofs, and receipts
├── src_backup_clean_arch/          # Complete preserved backup of prior Clean Architecture
├── .env.example                    # Environment variable template with safe placeholders
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

Key environment variables:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/printz_db
JWT_SECRET=your_jwt_access_secret_min_32_characters_here
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_characters_here
REFRESH_TOKEN_SECRET=your_jwt_refresh_secret_min_32_characters_here
CLIENT_URL=http://localhost:5173,http://localhost:3000
```

### 3. Run Automated Tests
Execute the comprehensive test suite verifying Mongoose models, Express routes, and HTTP security middleware:
```bash
npm test
```

### 4. Start Development Server
```bash
npm run dev
```

The server starts on `http://localhost:5000`:
- **API Root**: `GET http://localhost:5000/`
- **Health Check**: `GET http://localhost:5000/health` (also at `/api/v1/health`)
- **Interactive Swagger Documentation**: `http://localhost:5000/api-docs`
- **OpenAPI 3.0 JSON Spec**: `GET http://localhost:5000/api-docs.json`

---

## 🔗 Integrated Workflow Modules (Frontend ↔ Backend)

All endpoints maintain 100% backward compatibility with the React frontend across both `/api` and `/api/v1` prefixes:

| Module | Endpoints | Frontend Client |
| :--- | :--- | :--- |
| **Authentication** | `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/me` | `frontend/src/auth` |
| **User & Branch Management** | `/api/v1/users`, `/api/v1/roles`, `/api/v1/branches` | `frontend/src/admin` |
| **Customer Master** | `/api/v1/customers`, `/api/v1/customer-requests`, `/api/v1/public` | `frontend/src/jobflow/pages/CustomersPage` |
| **Job Orders** | `/api/v1/job-orders`, `/api/v1/job-orders/:id/estimate` | `frontend/src/jobflow/pages/JobOrdersPage` |
| **Design Allocation & Proofs** | `/api/v1/design/assignments`, `/api/v1/design/proofs`, `/api/v1/designers` | `frontend/src/jobflow/pages/DesignWorkflowPage` |
| **Production Planning & Queue** | `/api/v1/production-orders`, `/api/v1/production-operations`, `/api/v1/production-queue` | `frontend/src/jobflow/pages/ProductionPage` |
| **Quality Control & Rework** | `/api/v1/quality-checks`, `/api/v1/reprint-requests` | `frontend/src/jobflow/pages/QualityControlPage` |
| **Delivery & Handover** | `/api/v1/delivery-orders`, `/api/v1/delivery-proofs` | `frontend/src/jobflow/pages/DeliveryPage` |
| **Invoicing & Payments** | `/api/v1/invoices`, `/api/v1/settlement`, `/api/v1/payments` | `frontend/src/jobflow/pages/InvoicesPage` |
| **Inventory & Stock** | `/api/v1/inventory-items`, `/api/v1/inventory-balances`, `/api/v1/stock-transfers` | `frontend/src/inventory` |
| **Point of Sale (POS)** | `/api/v1/sale-receipts`, `/api/v1/printers` | `frontend/src/pos` |
| **SLA & Performance** | `/api/v1/sla`, `/api/v1/sla-configurations`, `/api/v1/designer-ratings` | `frontend/src/analytics` |
