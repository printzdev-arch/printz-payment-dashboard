# 🖨️ PrintZ Enterprise Platform — Fullstack Management System

Enterprise multi-branch management, POS, job tracking, manufacturing, attendance, payroll, and daily payment reconciliation platform for **PrintZ**. Built with a high-performance **React 18 + Vite** frontend and an API-driven **Node.js + Express + MongoDB Atlas (Mongoose)** backend.

---

## 🏗️ Project Architecture & Repository Structure

```text
Tilldesigncomplete/
├── backend/                       # REST API Backend Service (Node.js & Express MVC)
│   ├── src/
│   │   ├── config/                # Database, CORS, Swagger, and validated environment configs
│   │   ├── controllers/           # API request controllers (55+ controllers)
│   │   ├── middleware/            # JWT auth, RBAC permissions, file upload, error handling
│   │   ├── models/                # 76+ Mongoose models mapping to MongoDB Atlas collections
│   │   ├── routes/                # Dual-prefix REST routes (/api and /api/v1)
│   │   ├── services/              # Domain business logic & transactional services
│   │   ├── utils/                 # Integrations (JWT, Bcrypt, WhatsApp, Email, Audit)
│   │   ├── app.js                 # Express app initialization & route mounting
│   │   └── server.js              # Server entrypoint & DB lifecycle manager
│   ├── logs/                      # Backend application runtime logs (.gitkeep preserved)
│   ├── uploads/                   # Local file storage for design proofs & attachments (.gitkeep)
│   ├── .env                       # Backend local environment configuration (gitignored)
│   ├── .env.example               # Backend environment variable template
│   ├── .gitignore                 # Backend-specific gitignore rules
│   ├── package.json               # Backend dependencies and run scripts
│   └── README.md                  # Comprehensive backend documentation
│
├── frontend/                      # Web Application Frontend (React 18 + Vite)
│   ├── public/                    # Static web assets and icons (.gitkeep preserved)
│   ├── src/
│   │   ├── assets/                # App branding, logos, and illustration assets (.gitkeep)
│   │   ├── components/            # Reusable UI components (Admin, Manager, Common, Tables)
│   │   ├── context/               # Global state contexts (AuthContext, ThemeContext)
│   │   ├── features/              # Feature modules (Attendance, Dashboard, JobFlow, POS, Salary, SaleOrder)
│   │   ├── hooks/                 # Custom React hooks (usePopup, useDebounce, etc.)
│   │   ├── services/              # Axios HTTP client, branchStore, dashboardStore
│   │   ├── styles/                # Global and component CSS themes
│   │   ├── App.jsx                # Route hierarchy and authenticated route guards
│   │   ├── index.css              # Tailwind and typography styles
│   │   └── index.jsx              # React DOM entrypoint
│   ├── .env                       # Frontend local environment configuration (gitignored)
│   ├── .env.example               # Frontend environment variable template
│   ├── .gitignore                 # Frontend-specific gitignore rules
│   ├── package.json               # Frontend dependencies and run scripts
│   ├── vite.config.js             # Vite bundler configuration
│   └── README.md                  # Comprehensive frontend documentation
│
├── uploads/                       # Shared root upload folder (.gitkeep preserved)
├── .gitignore                     # Monorepo root gitignore rules
└── README.md                      # Master system overview and getting started guide
```

---

## 🗄️ MongoDB Atlas Database Connection

The platform is backed by a live MongoDB Atlas cluster:
- **Connection URI**:
  ```text
  mongodb+srv://printz_admin:Printz1234Payment@cluster0.kl4shhi.mongodb.net/printz_accounts?retryWrites=true&w=majority&appName=Cluster0
  ```
- **Active Database Name**: `printz_accounts`
- **Collections Included**: `users`, `roles`, `permissions`, `branches`, `employees`, `approvals`, `products`, `saleOrders`, `saleOrderItems`, `jobOrders`, `productionOrders`, `invoices`, `payments`, `stocks`, `stockReadings`, `printerReadings`, `totalAmountReadings`, `dailyattendances`, `masterDefaults`, and more.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

---

### 2. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install backend dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Verify or create `backend/.env` with the following configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # MongoDB Atlas Connection (Database: printz_accounts)
   MONGODB_URI=mongodb+srv://printz_admin:Printz1234Payment@cluster0.kl4shhi.mongodb.net/printz_accounts?retryWrites=true&w=majority&appName=Cluster0
   MONGO_URI=mongodb+srv://printz_admin:Printz1234Payment@cluster0.kl4shhi.mongodb.net/printz_accounts?retryWrites=true&w=majority&appName=Cluster0

   # JWT Secrets (min. 32 characters)
   JWT_SECRET=your_jwt_access_secret_min_32_characters_here
   JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_characters_here
   JWT_EXPIRES_IN=7d
   JWT_ACCESS_EXPIRES_IN=7d
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_characters_here
   JWT_REFRESH_EXPIRES_IN=30d

   # CORS Allowed Origins
   CLIENT_URL=http://localhost:3000,http://localhost:5173
   CORS_ORIGIN=*

   # Local Upload Directory
   UPLOAD_DIR=uploads
   ```

4. **Start the Backend Server**:
   ```bash
   # Development mode with live nodemon reload
   npm run dev

   # Production mode
   npm start
   ```
   The backend API will run on `http://localhost:5000`.

---

### 3. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Verify or create `frontend/.env`:
   ```env
   # Backend API Endpoint
   VITE_API_URL=http://localhost:5000/api
   VITE_USE_MOCK=false

   # Dev Server Options
   PORT=3000
   BROWSER=none
   ```

4. **Start the Frontend Development Server**:
   ```bash
   npm run dev
   ```
   The frontend app will launch at `http://localhost:3000` (or `http://localhost:5173`).

5. **Build for Production**:
   ```bash
   npm run build
   npm run preview
   ```

---

## 📖 Interactive API Documentation

Interactive Swagger documentation is served directly by the backend:
- **Swagger UI**: `http://localhost:5000/api-docs`
- **OpenAPI 3.0 JSON**: `http://localhost:5000/api-docs.json`
- **Health Check**: `http://localhost:5000/api/health`

---

## 🛡️ Git Tracking & `.gitignore` Architecture

The repository enforces strict separation between source code, environment secrets, build outputs, and dynamic runtime assets across three levels:

| Level | File Path | Protected Items |
| :--- | :--- | :--- |
| **Monorepo Root** | [`.gitignore`](file:///.gitignore) | `node_modules/`, `.env*`, `build/`, `dist/`, logs, OS/editor files, archives, and database dumps. Whitelists `!.gitkeep` and `!.env.example`. |
| **Backend** | [`backend/.gitignore`](file:///backend/.gitignore) | Backend `node_modules/`, `uploads/*`, `logs/`, `.env*`, dumps, and PID files while preserving `!uploads/.gitkeep`. |
| **Frontend** | [`frontend/.gitignore`](file:///frontend/.gitignore) | Frontend `node_modules/`, `dist/`, `build/`, `.vite/`, test coverage, and cache artifacts while preserving `!.gitkeep`. |

### Preserved Empty Directories (`.gitkeep`)
To prevent broken paths upon fresh git checkout, `.gitkeep` files track:
- `uploads/.gitkeep` — Root uploads directory
- `backend/uploads/.gitkeep` — Backend upload storage for proofs and design attachments
- `backend/logs/.gitkeep` — Backend runtime logs directory
- `frontend/public/.gitkeep` — Frontend static assets directory
- `frontend/src/assets/.gitkeep` — Frontend application images and vector assets

---

## 🔑 Default Roles & Accounts

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@printz.shop` | `Admin@123` | Global (All Branches & Systems) |
| **Admin / Dev** | `printzdev@gmail.com` | `Admin@123` | Global (All Branches) |
| **Branch Manager** | `bn@printz.shop` | `Manager@123` | Banaswadi |
| **Branch Manager** | `lr@printz.shop` | `Manager@123` | Lingrajpuram |
| **Branch Manager** | `tan@printz.shop` | `Manager@123` | Thanisandra |
| **Branch Manager** | `hbr@printz.shop` | `Manager@123` | HBR Layout |
| **Branch Manager** | `ba@printz.shop` | `Manager@123` | Babusapalya |
| **Branch Manager** | `ho@printz.shop` | `Manager@123` | Horamavu |

---

## 📦 Core Functional Modules

- **Authentication & RBAC**: Stateless JWT (Access + Refresh tokens), role guards (`admin`, `manager`, `staff`), granular permissions.
- **Daily Counter Reconciliations**: Meter counters, Large Format (Jumbo Xerox) SFT, and stock readings.
- **Financial Reconciliation**: Cash in hand, digital/UPI transactions, discounts, and customer pending ledger.
- **Job Flow & Orders**: End-to-end order life cycle from Quote/Design to Manufacturing, QC, Invoicing, and Delivery.
- **HR & Payroll**: Attendance policies, biometric daily check-in sync, leave management, and monthly salary computations.
- **Inventory & Stocks**: Paper, toner, raw material stock balances, consumption audit trails, and inter-branch transfers.
