# PrintZ Enterprise Backend Service

Production-ready REST API backend for the **PrintZ Enterprise Multi-Branch Printing, Job Tracking, Manufacturing, Point of Sale, and HR Platform**. Built with **Node.js**, **Express.js**, **MongoDB**, and **Mongoose**.

---

## 🛠️ Architecture & Tech Stack

- **Runtime & Framework**: Node.js (v18+) & Express.js 4
- **Database & ODM**: MongoDB (6.0+ / Atlas) with Mongoose 8.5
- **Authentication & Security**:
  - JWT token lifecycle (short-lived access tokens + refresh tokens)
  - Granular Role-Based Access Control (RBAC) with 64 standard permission codes
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
│   │   ├── auth/              # User credentials, JWT tokens, RBAC roles & permissions, page catalog
│   │   ├── branches/          # Retail branches, manufacturing units, soft deletion & branch assignments
│   │   ├── customers/         # Customer master records and branch QR requests
│   │   ├── job-orders/        # Job order lifecycle (quotation, design, production, delivery, billing)
│   │   ├── estimates/         # Customer estimates, multi-tier approvals, and discounts
│   │   ├── sale-orders/       # Multi-item sale orders, deposits, and WhatsApp notifications
│   │   ├── design/            # Designer allocation, workload balancing, proofs, and approvals
│   │   ├── production/        # Production routing, operation queues, rework, and machine operators
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
├── scripts/                   # Database initialisation, test runners, and seeding utilities
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
JWT_SECRET=your_jwt_access_secret_min_32_characters_here
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_characters_here
JWT_EXPIRES_IN=7d
JWT_ACCESS_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_characters_here
JWT_REFRESH_EXPIRES_IN=30d
CLIENT_URL=http://localhost:3000,http://localhost:5173
UPLOAD_DIR=uploads
```

### 4. Database Setup & Seeding (Optional)
```bash
npm run init-db         # Initialise base database indexes and collections
npm run seed:rbac       # Seed default roles and granular permissions
npm run seed:designers  # Seed default branch designers
npm run seed:all        # Seed reference sample data across all collections
```

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

### 6. Automated Testing & Verification
```bash
npm test                # Run RBAC connection and HTTP integration regression suite
npm run docs:verify     # Verify OpenAPI contract and documented endpoint examples
```

---

## 🔐 Default Development Credentials

| Role | Email / Identifier | Default Password | Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@gmail.com` | `123456` | All branches |
| **Branch Manager** | `bn@printz.shop` | `Manager@123` | Banaswadi branch |
| **Branch Designer** | `ali.hassan@printz.com` | `designer123` | Assigned branch |
| **Branch Designer** | `siti.rahman@printz.com` | `designer123` | Assigned branch |
| **MFG Manager** | `mfgmanager@gmail.com` | `123456` | Central MFG Unit |
| **MFG Designer** | `mfgdesigner@gmail.com` | `123456` | Central MFG Unit |

---

## 📁 Git Tracking & Uploads

- The `uploads/` directory is preserved in source control via [`backend/uploads/.gitkeep`](file:///d:/printz_logavasu/backend/uploads/.gitkeep).
- Uploaded runtime assets (`uploads/*`), local backups (`backups/`), database dumps (`dump/`), logs (`logs/*.log`), and temporary files are ignored in [`backend/.gitignore`](file:///d:/printz_logavasu/backend/.gitignore) to keep the repository clean.
