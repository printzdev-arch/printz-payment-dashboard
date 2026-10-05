# Printz V3 — Frontend Application

Modern, responsive Web Application for the **Printz Multi-Branch Payment & Operations Platform**, built with **React 18**, **Vite**, **Chart.js**, **TailwindCSS / Vanilla CSS**, and **jsPDF**.

---

## 🎨 Features & Modules

### 👑 Admin Portal
- **Executive Dashboard**:
  - Total Revenue by Branch (Horizontal Bar Chart).
  - Total Printer Meter Copies by Branch (Horizontal Bar Chart).
  - Dynamic Revenue Breakdown (Pie Chart — Stock, Printer, Other).
  - Multi-date and single-day calendar range filters.
  - Granular branch-level revenue tables.
- **Branch Management**: Create and configure branch offices, off-days, and branch codes.
- **Manager & Admin Management**: Assign managers to specific branches with secure access controls.
- **Asset & Inventory Management**: Master printers registry, stock catalog, large-format pricing.
- **Past-Date Approvals**: Approve or decline unlock requests for finalized past dates.
- **Export Center**: Export records to CSV, Excel, and PDF.

### 🏢 Manager Portal
- **5-Step Daily Account Sheet Wizard (`/printer-readings-manager`)**:
  - **Step 1: Printer Readings**: Starting & Final counter meters per machine with automatic copy difference calculation.
  - **Step 2: Large Format (Jumbo Xerox)**: SFT printed counter, category-based job quantities, and totals.
  - **Step 3: Business & Payments**: Cash in hand, UPI / Card payments, gift/digital business, discounts, previous balances, and auto-reconciliation of *Cash As Per Accounts*.
  - **Step 4: Stock Readings**: Opening stock, incoming transfers, units sold, and closing stock.
  - **Step 5: Review & Final Submit**: Live summary review, printable PDF generation, and final submission locking.
- **PDF Generation**: Automated standard receipt/account sheet generation using `jsPDF` and `jspdf-autotable`.

---

## 🏗️ Folder Structure

```
frontend/
├── public/                # Static assets, icons, HTML template
├── src/
│   ├── assets/            # Images, logos, illustrations
│   ├── components/
│   │   ├── admin/         # Admin views (admindashboard.jsx, AddBranch.jsx, StockList.jsx, etc.)
│   │   ├── manager/       # Manager views (PrinterReadings.jsx, managerdashboard.jsx, etc.)
│   │   │   └── dailyreadings/ # 5-Step stepper components (PrinterReadingsSection, TotalAmountSection, etc.)
│   │   ├── common/        # Reusable UI (BranchSelect, CalendarSelect, Charts, Tables, Popups)
│   │   └── illustrations/ # Custom vector graphics and empty state illustrations
│   ├── context/
│   │   └── AuthContext.jsx # Global auth state, user profile, token lifecycle
│   ├── hooks/
│   │   ├── usePopup.js    # Modal popups & toast notifications
│   │   └── useDebounce.js # Input throttling for auto-save operations
│   ├── services/
│   │   ├── api.js         # Axios instance with baseURL and Bearer token interceptor
│   │   ├── branchStore.js # Global branch caching & branch ID resolution
│   │   └── dashboardStore.js # High-performance in-memory cache for dashboard charts
│   ├── styles/            # CSS theme sheets (printzTheme.css, admindashboard.css, etc.)
│   ├── App.jsx            # Routing hierarchy, route guards (AdminRoute, ManagerRoute)
│   ├── index.css          # Global typography, CSS variables, resets
│   └── index.jsx          # React DOM entrypoint
├── vite.config.js         # Vite bundler configuration
└── package.json           # Frontend dependencies & scripts
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn**

### 2. Installation
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `frontend/` directory (optional for custom backend port):

```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Running the App
```bash
# Development mode (Vite HMR server)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

The application will launch at `http://localhost:3000` (or `http://localhost:5173`).

---

## 🔑 Key Components & Services

### `dashboardStore.js`
In-memory caching and aggregation layer that fetches raw daily totals and printer meter readings from the backend, maps MongoDB ObjectIds to human-readable branch names, and aggregates total revenues and copy counts for the charts without UI blocking.

### `branchStore.js`
Caches the branch list across all views so components don't issue duplicate network requests when switching tabs or dropdowns.

### `AuthContext.jsx`
Maintains user identity, role, assigned branch, and automatically attaches the JWT Bearer token to all outgoing API requests via Axios interceptors.
