# PrintZ Enterprise Frontend Client

Modern, responsive Single Page Application (SPA) for the **PrintZ Multi-Branch Printing, Job Tracking, Point of Sale, and HR Platform**. Built with **React 18**, **Vite 5**, and **Tailwind CSS**.

---

## 🎨 Tech Stack & Libraries

- **Framework & Build Tool**: React 18 & Vite 5
- **Routing**: React Router DOM v6 with dynamic role-based access control and page access guards
- **Styling & UI**: Tailwind CSS, Material UI (MUI v7) & Emotion, Framer Motion animations
- **Icons**: Lucide React & React Icons
- **HTTP Client**: Axios with global JWT token injection, automatic refresh handling, and error interceptors
- **Visualisations & Reports**: Chart.js, React ChartJS 2, jsPDF, jsPDF-AutoTable, and PapaParse
- **Date Management**: React Datepicker with Asia/Kolkata timezone support

---

## 🖥️ Feature Portals & Modules

1. **Authentication (`src/modules/auth`)**:
   - Interactive animated entrance scene in Shadow DOM with mascot animation and shop entrance.
   - Profile management, password reset, and session storage.
2. **Dashboard (`src/modules/dashboard`)**:
   - Role-specific KPI metrics and analytics for Admin, Branch Manager, and Designer.
3. **POS & Billing (`src/modules/pos`)**:
   - Quick sale receipts, price overrides, multi-mode settlements, and cash register audits.
4. **Job Flow (`src/modules/jobflow`)**:
   - **Customer Master**: Customer directory, contact cards, and branch QR request intake.
   - **Estimations**: Multi-item pricing calculation, pro-rata tax, and discount authorization.
   - **Job Orders**: Multi-stage lifecycle tracking from Enquiry to Delivery.
   - **Design Workflow**: Designer allocation, proofs review, and client approval links.
   - **Production Planning**: Operation queues, rework management, and machine operator assignments.
   - **Quality Control**: QC checklists, approval passes, and reprint request triggers.
   - **Delivery**: Dispatch manifests, self-pickup handovers, and electronic proof of delivery.
   - **Invoices & Settlements**: GST invoices, partial payment tracking, and ledger settlements.
   - **Master Settings**: System categories, unit rates, and defaults.
5. **Manufacturing Unit (`src/modules/mfg-unit` / `src/modules/jobflow`)**:
   - Dedicated portal for Central Manufacturing Unit managers and production designers.
6. **Branch & Inventory (`src/modules/inventory` & `src/modules/admin`)**:
   - Branch setup, printer meter readings, Jumbo Xerox logs, and stock movement tracking.
7. **HR & Payroll (`src/modules/hr`)**:
   - **Employees**: Master directory, designation, and branch assignment.
   - **Daily Attendance**: Branch-scoped check-in/out, live KPI badges, and status marking.
   - **Attendance Setup**: Configurable attendance policies and annual holiday calendars.
   - **Branch Shifts**: Inter-branch temporary shift management.
   - **Attendance Permissions**: Permission balance tracking and hourly deduction logs.
   - **Attendance Reports**: Monthly CSV exports and attendance summaries.
   - **Salary & Payroll**: Salary structure assignment, deductions, loans, and payroll processing.

---

## 📂 Folder Structure

```text
frontend/
├── public/                    # Static assets, favicon, manifest.json, index.html
├── src/
│   ├── app/                   # App.jsx (routes), PrivateRoute.jsx, providers (AuthContext)
│   ├── layouts/               # AdminLayout, ManagerLayout, JobFlowLayout, MfgLayout
│   ├── modules/               # Domain-specific UI feature modules
│   │   ├── auth/              # Login page, profile, forgot password & animated scene
│   │   ├── admin/             # Branches, users, roles, past-date requests, export data
│   │   ├── dashboard/         # Role-specific executive dashboards
│   │   ├── hr/                # Attendance, employees, branch shifts, and salary management
│   │   ├── inventory/         # Printers, stock management, Jumbo Xerox, and readings
│   │   ├── jobflow/           # Customers, job orders, estimates, design, production, delivery
│   │   ├── pos/               # POS billing interface
│   │   └── sale-order/        # Sale orders creation, tracking, and detail views
│   ├── shared/                # Shared utilities, Axios API client, UI components, hooks, styles
│   └── main.jsx / index.js    # React DOM root entry point
├── uploads/                   # Local uploads directory (.gitkeep preserved)
├── build/                     # Vite production build output (ignored in git)
├── .env.example               # Frontend environment template
├── .gitignore                 # Frontend-specific ignore rules
├── vite.config.js             # Vite build & development proxy configuration
└── package.json               # Frontend dependencies and npm scripts
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Backend Service**: Ensure the backend is running on `http://localhost:5000` (see `../backend/README.md`)

### 2. Installation
```bash
cd frontend
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` in the `frontend/` directory (optional if using defaults):
```bash
cp .env.example .env
```

Default variables:
```env
VITE_API_URL=http://localhost:5000/api
VITE_USE_MOCK=false
PORT=3000
GENERATE_SOURCEMAP=true
BROWSER=none
```

### 4. Running the Development Server
```bash
npm run dev
# Or
npm start
```
The application opens at `http://localhost:3000`. The Vite development server proxies `/api` calls directly to `http://localhost:5000`.

### 5. Production Build
```bash
npm run build       # Bundles production-optimized assets into the build/ directory
npm run preview     # Serves the production build locally for verification
```

---

## 📁 Git Tracking & Directories

- Empty source directories and local upload locations (`uploads/`, `src/modules/hr/employees/constants/`, `src/modules/jobflow/master-settings/constants/`) are preserved in Git using `.gitkeep` files.
- Production build outputs (`build/`, `dist/`), dependency caches (`node_modules/`, `.vite/`), local uploads (`uploads/*`), logs, and local environment files (`.env`, `.env.local`) are excluded via [`frontend/.gitignore`](file:///d:/printz_logavasu/frontend/.gitignore).
