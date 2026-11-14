# PrintZ Enterprise Backend Service

Production-ready REST API backend for the **PrintZ Enterprise Multi-Branch Printing, Job Tracking, Manufacturing, Point of Sale, and HR Platform**. Built with **Node.js**, **Express.js**, **MongoDB**, and **Mongoose**.

---

## 🛠️ Architecture & Tech Stack

- **Runtime & Framework**: Node.js (v18+) & Express.js 4
- **Database & ODM**: MongoDB (6.0+ / Atlas) with Mongoose 8.5
- **Authentication & Security**:
  - JWT token lifecycle (short-lived access tokens + refresh tokens)
  - Granular Role-Based Access Control (RBAC): permission codes per API plus a per-page **View / Create / Edit / Delete** matrix (see "Roles, pages and actions" below)
  - Multi-branch data isolation and fail-closed branch scoping
  - Security headers via Helmet, configurable CORS, and Express rate limiting
- **API Documentation**: OpenAPI 3.0 / Swagger UI live at `http://localhost:5000/api-docs` (JSON at `/api-docs.json`)
- **Dual API Prefix**: Full contract parity across `/api` and `/api/v1` routes
- **File Uploads**: Multer storage pipeline with MIME/extension validation (`uploads/` directory with Git tracking preservation)
- **Logging & Monitoring**: Morgan HTTP request logger and domain audit event emitters

---

## 📂 Folder Structure

```text
backend/
├── src/
│   ├── app.js                 # Express application setup, security middleware, and route mounting
│   ├── server.js              # Server entry point, MongoDB connection lifecycle, and schedulers
│   ├── config/                # Environment (env.js), database (database.js), CORS, and Swagger configs
│   ├── middleware/            # Security (auth, roles, permissions), request validation, upload & error handlers
│   ├── modules/               # Domain-driven feature modules
│   │   ├── auth/              # User credentials, JWT tokens, roles, page catalog and actions, permission audit trail
│   │   ├── branches/          # Retail branches, manufacturing units, soft deletion & branch assignments
│   │   ├── customers/         # Customer master records and branch QR requests
│   │   ├── job-orders/        # Job order lifecycle (quotation, design, production, delivery, billing)
│   │   ├── estimates/         # Customer estimates, multi-tier approvals, and discounts
│   │   ├── sale-orders/       # Multi-item sale orders, deposits, and WhatsApp notifications
│   │   ├── design/            # Designer allocation, workload balancing, proofs, and approvals
│   │   ├── production/        # Production routing, operation queues, quality checks, and rework
│   │   ├── delivery/          # Delivery orders, proof of delivery, and dispatch/pickup tracking
│   │   ├── invoices/          # GST invoices, payment receipts, and balance settlement
│   │   ├── inventory/         # Stock items, stock movements, and transaction ledgers
│   │   ├── stocks/            # Branch physical stock readings and reconciliations
│   │   ├── printers/          # Printer inventory, meter readings, and Jumbo Xerox tracking
│   │   ├── pos/               # Point of Sale receipts and cash drawer settlements
│   │   ├── attendance/        # Daily attendance, attendance policies, holiday calendars, and permissions
│   │   ├── salary/            # Payroll runs, salary structures, adjustments, and employee loans
│   │   ├── employees/         # Employee profiles, branch assignments, and shift transitions
│   │   ├── employee-shift/    # Temporary inter-branch shift transfers
│   │   ├── settings/          # Master categories, defaults, and system configuration
│   │   ├── number-sequences/  # Atomic sequence generators for invoices, orders, and receipts
│   │   ├── notifications/     # In-app alerts and notifications
│   │   └── attachments/       # Asset management and file upload services
│   ├── routes/                # Master route aggregator mounting all domain modules
│   ├── utils/                 # Constants, API error classes, response helpers, and integrations
│   └── docs/swagger/          # Modular OpenAPI / Swagger documentation components
├── uploads/                   # Local file storage for proofs and attachments (.gitkeep preserved)
├── .env.example               # Template environment configuration
├── .gitignore                 # Backend-specific ignore rules
└── package.json               # Backend dependencies and npm scripts
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/printz_db`) or MongoDB Atlas URI

### 2. Installation
```bash
cd backend
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` in the `backend/` directory:
```bash
cp .env.example .env
```

Configure your `.env` variables:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/printz_db
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_characters_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_characters_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
UPLOAD_DIR=uploads
```

### 4. Database setup
There is no seed data. Indexes are created automatically when the server starts, and the app works from whatever is in the database. Create the first admin user as described in the root [README](../README.md#3-create-the-first-admin), then add branches, staff and master data from the UI.

### 5. Running the Application
```bash
# Start in development mode with nodemon auto-restart
npm run dev

# Start in production mode
npm start
```

The server listens on `http://localhost:5000`:
- **API Root**: `GET http://localhost:5000/`
- **Health Check**: `GET http://localhost:5000/health` (also `/api/v1/health`)
- **Interactive Swagger Docs**: `http://localhost:5000/api-docs`
- **Swagger JSON Spec**: `http://localhost:5000/api-docs.json`

### 6. Tests
The repository does not include an automated test suite yet.

### 7. Maintenance script
`src/modules/inventory/services/inventoryMigration.js` is a standalone script that copies legacy `stocks` into the inventory collections. It never runs on its own; start it by hand (`node src/modules/inventory/services/inventoryMigration.js`) only when you want that migration.

---

## 🔐 Roles, pages and actions

- **Pages:** `src/modules/auth/constants/pageCatalog.js` lists every page key (for example `sale-orders`, `customer-directory`, `stock-list`) and the API permission codes each page covers.
- **Actions:** a role or an employee can limit a page to some of `view`, `create`, `edit`, `delete` (`pageActions`). A page with no entry allows all four, and view-only pages (dashboards, reports) offer only `view`. An employee's own list replaces the role's. Super Admin is never limited.
- **Enforcement:** `src/middleware/security/permission.middleware.js` blocks a request when the user's actions for the covering page do not include what the HTTP method needs (GET = view, POST = create, PUT/PATCH = edit, DELETE = delete). The helper lives in `src/middleware/security/pageActions.js`.
- **Not yet covered:** a few routes check only that the user is signed in or check a role name, so the matrix does not limit them (stock, estimates, payments, total amounts and Jumbo Xerox readings, customer requests, general). Add `authorizePermission` to a route to bring it under the matrix.
- **Audit trail:** every change to a role's or employee's pages and actions is stored in the `permissionaudits` collection and listed at `GET /api/roles/audit` (admin only).
- **Delivery:** the delivery review routes use the `delivery` page permission.

---

## 📁 Git Tracking & Uploads

- The `uploads/` directory is preserved in source control via [`uploads/.gitkeep`](uploads/.gitkeep). Sub-folders (such as `proofs/`) are created by the server when needed.
- Uploaded runtime assets (`uploads/*`), local backups (`backups/`), database dumps (`dump/`), logs (`logs/*.log`), and temporary files are ignored in [`.gitignore`](.gitignore) to keep the repository clean. Local tool folders (`.claude/`, scratch files, `*.bak`, `*.orig`) are ignored too, and `.env` is never committed: copy `.env.example` instead.
