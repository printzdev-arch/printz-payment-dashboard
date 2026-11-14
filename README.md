# PrintZ Enterprise Printing & Payment Management Platform

A multi-branch management system for commercial printing: point of sale, job orders and design, production and delivery, invoices and settlements, inventory and daily readings, and HR (attendance and payroll).

---

## Repository layout

A full-stack monorepo with two separate apps:

```text
printz_logavasu/
├── backend/             # Express 4 + Mongoose 8 REST API (Node.js)
│   ├── src/
│   │   ├── app.js       # Express app: security, CORS, routes, Swagger
│   │   ├── server.js    # Entry point: MongoDB connection, schedulers
│   │   ├── config/      # env.js, database.js
│   │   ├── middleware/  # auth, roles/permissions, validation, errors
│   │   ├── modules/     # Feature modules (auth, branches, customers, job-orders,
│   │   │                #   design, production, delivery, invoices, settlements, pos,
│   │   │                #   sale-orders, inventory, printers, stocks, salary, attendance,
│   │   │                #   dashboard, day-end, ...)
│   │   ├── routes/      # Mounts every module
│   │   ├── utils/       # Validation rules, soft delete, helpers, integrations
│   │   ├── assets/      # logo.png used in emails, receipts and PDFs
│   │   └── docs/        # Swagger / OpenAPI documentation
│   ├── scripts/         # One-off maintenance scripts
│   ├── uploads/         # Uploaded files (not committed; .gitkeep keeps the folder)
│   ├── .env.example     # Backend settings template
│   └── README.md        # Backend details
│
├── frontend/            # React 18 + Vite 5 single-page app
│   ├── public/          # Static files and HTML template
│   ├── src/
│   │   ├── app/, layouts/, shared/   # Shell, role layouts, shared UI/utils/services
│   │   └── modules/     # admin, auth, dashboard, day-end, hr, inventory,
│   │                    #   jobflow, mfg-unit, pos, sale-order
│   ├── .env.example     # Frontend settings template
│   └── README.md        # Frontend details
│
├── .gitignore
└── README.md            # This file
```

---

## Quick start

### Prerequisites
- **Node.js** 18 or newer
- **MongoDB**: a local server (`mongodb://127.0.0.1:27017/printz_db`) or a MongoDB Atlas connection string.
  Use a **replica set** (Atlas always is) so multi-document operations such as branch delete run in a transaction. On a standalone server the app still works, without the transaction.

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env     # then edit .env (see "Configuration" below)
npm run dev              # http://localhost:5000  (nodemon)
```
Use `npm start` to run without auto-restart.

- API reference (Swagger UI): `http://localhost:5000/api-docs`
- Health check: `http://localhost:5000/health`
- Every route is available under both `/api` and `/api/v1`.

### 2. Frontend
In a second terminal:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev              # http://localhost:3000
```
In development Vite proxies `/api` to `http://localhost:5000`. Build for production with `npm run build` (output in `frontend/build`).

### 3. Create the first admin
The app ships **without any seed or sample data**: an empty database stays empty, and every screen shows only what is in the database. Insert the first admin user once, from `backend/`, then sign in with it and create branches, managers, designers and everything else from the UI:

```bash
cd backend
node -e "require('./src/config/env'); const m=require('mongoose'); require('./src/utils/softDelete/softDeletePlugin').registerSoftDelete(); (async()=>{ await require('./src/config/database')(); require('./src/modules/models'); await m.model('User').create({ name:'Admin', username:'admin', email:'admin@example.com', password:'ChangeMe@12345', role:'admin', permissions:['*'], isActive:true }); console.log('admin created'); process.exit(0); })().catch(e=>{ console.error(e.message); process.exit(1); })"
```
Use your own email and a strong password (the password is hashed when saved). Change them after the first sign-in.

---

## Configuration

Backend (`backend/.env`, see `backend/.env.example`):

| Variable | Purpose |
| :--- | :--- |
| `PORT` | API port (default 5000) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string (`MONGO_URI` also accepted) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Token secrets. **Required in production, at least 32 characters** |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (default 15m / 30d) |
| `CORS_ORIGINS` | Allowed browser origins, comma separated (`CLIENT_URL` is the older name) |
| `UPLOAD_DIR` | Upload folder (default `uploads`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional. Password-reset and day-end report e-mail; without them mail is logged, not delivered |
| `WHATSAPP_*` | Optional. WhatsApp receipts and notifications |

Frontend (`frontend/.env`, see `frontend/.env.example`):

| Variable | Purpose |
| :--- | :--- |
| `VITE_API_URL` (or `VITE_API_BASE_URL`) | API base URL, default `http://localhost:5000/api` |

Never commit `.env` files or real credentials; only the `.env.example` templates are tracked.

---

## Good to know

- **Branch delete is a soft delete.** Deleting a branch (admin only) marks the branch and all its related records `isDeleted`; they disappear from every screen and API but nothing is removed from the database.
- **Master data** (categories, items, rates) is managed in Master Settings and stored in the database.
- **No automated test suite** is included in the repository yet.

---

## Source control

- **Ignored:** build output (`build/`, `dist/`), dependencies (`node_modules/`), secrets (`.env`, `*.key`, `*.pem`), uploaded files (`uploads/*`), backups, and logs.
- **Kept:** `backend/uploads/.gitkeep` and `frontend/uploads/.gitkeep` so the folders exist after cloning.
