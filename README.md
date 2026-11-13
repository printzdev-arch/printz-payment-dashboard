# PrintZ Enterprise Printing & Payment Management Platform

An integrated, multi-branch enterprise management system for commercial printing, point of sale, job tracking, manufacturing, inventory, and HR payroll workflows.

---

## 🏗️ Repository Architecture

This repository is structured as a full-stack monorepo:

```text
printz_logavasu/
├── backend/            # Express.js & MongoDB REST API Service
│   ├── src/            # MVC Domain modules, routes, services, models
│   ├── scripts/        # Database seeders and verification scripts
│   ├── uploads/        # Local uploads storage (.gitkeep preserved)
│   ├── .env.example    # Backend environment template
│   ├── .gitignore      # Backend-specific ignore rules
│   ├── package.json    # Backend dependencies & npm scripts
│   └── README.md       # Backend documentation & API specification
│
├── frontend/           # React 18 & Vite 5 Single Page Application
│   ├── public/         # Static assets and HTML template
│   ├── src/            # Feature modules (HR, JobFlow, Inventory, POS, Auth)
│   ├── uploads/        # Frontend upload placeholder (.gitkeep preserved)
│   ├── .env.example    # Frontend environment template
│   ├── .gitignore      # Frontend-specific ignore rules
│   ├── package.json    # Frontend dependencies & npm scripts
│   └── README.md       # Frontend UI architecture & documentation
│
├── .gitignore          # Repository-level ignore rules
└── README.md           # Root workspace guide
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/printz_db`) or MongoDB Atlas URI

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Start development server on http://localhost:5000
npm run dev
```
*API documentation is available at `http://localhost:5000/api-docs`.*

### 3. Frontend Setup
In a separate terminal:
```bash
cd frontend
npm install
cp .env.example .env
# Start development server on http://localhost:3000
npm run dev
```

---

## 🔐 Default Logins (Development)

| Role | Username / Email | Password | Branch Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@gmail.com` | `123456` | All branches |
| **Branch Manager** | `bn@printz.shop` | `Manager@123` | Banaswadi branch |
| **Branch Designer** | `ali.hassan@printz.com` | `designer123` | Assigned branch |
| **MFG Manager** | `mfgmanager@gmail.com` | `123456` | Central Manufacturing Unit |
| **MFG Designer** | `mfgdesigner@gmail.com` | `123456` | Central Manufacturing Unit |

---

## 📁 Source Control & Git Rules

- **Ignored**: All build artifacts (`build/`, `dist/`), dependency directories (`node_modules/`, `.vite/`), secret files (`.env`, `*.key`, `*.pem`), user-uploaded content (`uploads/*`), backups (`backups/`), and log files (`logs/`, `*.log`).
- **Preserved**: Structure directories and placeholders are preserved via `.gitkeep` files (`backend/uploads/.gitkeep`, `frontend/uploads/.gitkeep`, and empty constants directories).

