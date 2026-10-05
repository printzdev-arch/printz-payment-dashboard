# Printz V3 — Backend API

Backend service for the **Printz Multi-Branch Payment & Operations Dashboard**, built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)** following **Clean Architecture (DDD principles)**.

---

## 🏗️ Architecture & Folder Structure

```
backend/
├── src/
│   ├── application/               # Application Business Logic
│   │   ├── dto/                   # Data Transfer Objects (DTOs) with validation
│   │   └── use-cases/             # Application Use Cases
│   │       ├── auth/              # Login, Registration, Token verification
│   │       ├── branches/          # Branch CRUD operations
│   │       ├── categories/        # Inventory category management
│   │       ├── finalized-dates/   # Date locking & finalization
│   │       ├── inventory/         # Stock movement & transfers
│   │       ├── jumbo-xerox/       # Large-format pricing & readings
│   │       ├── past-dates/        # Past-date unlock requests & approval
│   │       ├── payments/          # Payment collections & receivables
│   │       ├── printer-readings/  # Daily meter readings
│   │       ├── printers/          # Master printer inventory
│   │       ├── reports/           # Financial & operational reports
│   │       ├── sales/             # POS sales & invoicing
│   │       ├── stocks/            # Stock items & daily stock counts
│   │       ├── total-amounts/     # Daily business reconciliation
│   │       └── users/             # User management
│   ├── domain/                    # Enterprise Core
│   │   ├── entities/              # Core business entities
│   │   └── repositories/          # Abstract repository interfaces
│   ├── infrastructure/            # External Interfaces & DB Implementations
│   │   ├── config/                # DB connection, Swagger OpenAPI spec
│   │   └── database/mongoose/     # Mongoose Schemas & Repository Implementations
│   │       ├── models/            # Schema models (Branch, User, Printer, etc.)
│   │       └── repositories/      # Concrete Mongo Repository implementations
│   ├── presentation/              # Presentation Layer (HTTP / API)
│   │   ├── controllers/           # Express Request Handlers
│   │   ├── middlewares/           # JWT Auth, Role-Based Access Control, Error Handler
│   │   └── routes/                # Express Routers
│   ├── shared/                    # Utilities, Error Helpers, Response Helpers
│   ├── app.js                     # Express app configuration & middleware setup
│   └── server.js                  # Entry point & server bootstrapper
├── .env                           # Environment variables (local config)
└── package.json                   # Dependencies and scripts
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: MongoDB Atlas cluster or local MongoDB instance (v6.0+)
- **npm** or **yarn**

### 2. Installation
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `backend/` directory:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/printzpayment?retryWrites=true&w=majority
JWT_ACCESS_SECRET=your_jwt_access_secret_key_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000,http://localhost:5173
```

### 4. Running the Server
```bash
# Development mode (with nodemon auto-restart)
npm run dev

# Production mode
npm start
```

Once started:
- **API Base URL**: `http://localhost:5000/api`
- **Swagger Interactive API Docs**: `http://localhost:5000/api-docs`

---

## 📡 Core API Endpoints

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/login` — Authenticate user, returns JWT and user profile.
- `POST /api/auth/register` — Register a new manager/admin.
- `GET /api/auth/me` — Get current authenticated user profile.
- `POST /api/auth/refresh-token` — Refresh expired access token.

### 🏢 Branches (`/api/branches`)
- `GET /api/branches` — List all branches.
- `POST /api/branches` — Create a new branch (Admin only).
- `GET /api/branches/:id` — Get branch by ID or branch code.
- `PUT /api/branches/:id` — Update branch details.
- `DELETE /api/branches/:id` — Remove a branch.

### 🖨️ Printers & Meter Readings (`/api/printers`, `/api/printer-readings`)
- `GET /api/printers` — Get printers filtered by `branchName`, `isActive`, etc.
- `POST /api/printers` — Register new printer asset.
- `GET /api/printer-readings` — Get daily meter readings by `date` / `branchName`.
- `POST /api/printer-readings` — Submit or update daily starting/final counter readings.

### 📊 Business Reconciliation (`/api/total-amounts`)
- `GET /api/total-amounts` — Fetch daily total business, cash, online, previous balances.
- `POST /api/total-amounts` — Save daily business totals and payment breakdown.
- `PUT /api/total-amounts/:id` — Update existing daily business record.

### 📦 Stocks & Inventory (`/api/stocks`)
- `GET /api/stocks` — Get master stock items.
- `POST /api/stocks` — Create new stock item.
- `GET /api/stocks/readings` — Daily stock opening/incoming/sold/closing numbers.
- `POST /api/stocks/readings` — Submit daily stock counts.

### 🖨️ Large Format / Jumbo Xerox (`/api/jumbo-xerox`)
- `GET /api/jumbo-xerox` — Master large format categories & pricing.
- `GET /api/jumbo-xerox/readings` — Large format daily job quantities & meter counters.
- `POST /api/jumbo-xerox/readings` — Save large format daily entries.

### 🔒 Day Lock & Past Dates (`/api/general`)
- `POST /api/general/finalized-dates` — Lock and seal a date for a branch (`isFinalSubmitted: true`).
- `GET /api/general/finalized-dates` — Check if a date is locked.
- `GET /api/general/past-date-requests` — List past date unlock requests.
- `POST /api/general/past-date-requests` — Request past-date edit access.
- `PUT /api/general/past-date-requests/:id` — Admin approve/reject request.

---

## 🛡️ Security & Middleware
- **Helmet**: Security headers.
- **CORS**: Configurable whitelist for development and production frontends.
- **Express Rate Limit**: Protects authentication and general endpoints from brute-force attacks.
- **JWT + RBAC**: Strict role enforcement (`admin` vs `manager`).
