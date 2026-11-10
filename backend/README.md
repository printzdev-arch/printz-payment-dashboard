# PrintZ Backend Service

API backend for the PrintZ multi-branch printing platform: sale orders, job tracking, design, production, delivery, invoicing, POS, inventory, attendance and salary.

---

## 🛠️ Tech Stack

- **Runtime & framework**: Node.js, Express.js
- **Database**: MongoDB (Atlas or local) with Mongoose
- **Security**: JWT authentication (short-lived access token + refresh token), role-based access control with granular permissions, Helmet, CORS, rate limiting
- **API documentation**: OpenAPI 3.0 / Swagger UI at `http://localhost:5000/api-docs` (JSON at `/api-docs.json`)
- **File uploads**: Multer with MIME and extension checks
- **Logging**: Morgan HTTP logger. Each module records its own change history internally.
- **URL prefixes**: every route is available under both `/api` and `/api/v1`

---

## 📂 Folder Structure

The backend is organised by **domain module**. Each module under `src/modules/` has its own `controllers/`, `services/`, `models/` and `routes/`.

```text
backend/
├── src/
│   ├── config/            # env.js (validated config), database.js, cors.js
│   ├── middleware/        # security (JWT, RBAC, permissions), request validation, guards, error handling
│   ├── modules/
│   │   ├── auth/  customers/  customer-portal/  branches/  employees/  employee-shift/
│   │   ├── sale-orders/  estimates/  job-orders/  design/  approvals/
│   │   ├── production/  printers/  stocks/  inventory/  delivery/
│   │   ├── invoices/  settlements/  pos/  past-date-requests/
│   │   ├── attendance/  salary/  settings/  number-sequences/
│   │   ├── dashboard/  reports/  notifications/  attachments/  public/  general/
│   │   ├── audit-logs/  sla/      # internal use only (see "Removed APIs" below)
│   │   └── models.js  services.js  dto.js   # central barrels
│   ├── routes/index.js    # master router that mounts every module
│   ├── utils/             # constants, errors, helpers, integrations (JWT, email, WhatsApp...)
│   ├── docs/swagger/      # modular OpenAPI documentation
│   ├── app.js             # Express app, middleware, route mounting
│   └── server.js          # entry point, database connection, schedulers
├── uploads/               # uploaded files, proofs and receipts
├── .env.example           # environment variable template
└── package.json
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Environment configuration
Copy `.env.example` to `.env` and fill in your own values. One variable per setting:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/printz_db   # MONGO_URI is also accepted
JWT_ACCESS_SECRET=<long random string>
JWT_REFRESH_SECRET=<a different long random string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
UPLOAD_DIR=uploads
```

- `CORS_ORIGINS` lists the browser origins allowed to call the API. It is also used when building links.
- Never commit `.env`. Generate a secret with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

### 3. Run the server
```bash
npm run dev     # development, restarts on changes (nodemon)
npm start       # production
```

The server starts on `http://localhost:5000`:
- API root: `GET /`
- Health check: `GET /health` (also `/api/v1/health`)
- Swagger UI: `/api-docs`

### 4. Helper scripts (`backend/scripts`)
```bash
npm test             # RBAC connection and live HTTP regression checks
npm run docs:verify  # verify the Swagger document
npm run init-db      # create default users and base data
npm run seed:all     # seed all collections with test data
npm run seed:rbac    # seed roles and permissions
```

---

## 🔗 Main Endpoints and the Frontend that Uses Them

| Module | Endpoints | Frontend |
| :--- | :--- | :--- |
| **Authentication** | `/auth/login`, `/auth/refresh`, `/auth/me` | `modules/auth` |
| **Users, roles, branches** | `/users`, `/roles`, `/branches` | `modules/admin` |
| **Customers** | `/customers`, `/customer-requests`, `/public` | `modules/jobflow` |
| **Sale orders and estimates** | `/sale-orders`, `/estimates` | `modules/sale-order` |
| **Job orders** | `/job-orders` (alias `/jobs`) | `modules/jobflow/job-orders` |
| **Design** | `/design`, `/mfg/designers`, `/designer-ratings` | `modules/jobflow/design`, `modules/mfg-unit` |
| **Production and QC** | `/production-orders`, `/production-queue`, `/quality-checks`, `/reprint-requests` | `modules/jobflow` |
| **Delivery** | `/delivery-orders`, `/delivery-proofs` | `modules/jobflow/delivery` |
| **Invoices and settlement** | `/invoices`, `/settlement`, `/payments` | `modules/jobflow/invoice`, `modules/jobflow/settlement` |
| **Inventory and stock** | `/inventory/items`, `/inventory/balances`, `/stocks` | `modules/inventory` |
| **POS** | `/sale-receipts`, `/printers` | `modules/pos` |
| **HR** | `/employees`, `/attendance`, `/attendance/permissions`, `/salary` | `modules/hr` |

Some resources also answer under an alias name (for example `/invoice` for `/invoices`, `/settlements` for `/settlement`, `/dashboard` for `/dashboards`). Use the first name shown above.

---

## 🧹 Removed APIs

These HTTP endpoints were removed because the product no longer uses them: `/audit-logs`, `/sla`, `/sla-configurations` and `/designers` (SLA scorecard). The internal helpers that record change history and run SLA timers remain, because other modules depend on them.
