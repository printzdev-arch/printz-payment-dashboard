# PrintZ Backend Service (PrintZ V3 Architecture)

Production-ready backend for PrintZ Enterprise Multi-Branch Payment, Job Tracking, and Manufacturing Dashboard.

---

## 🛠️ Architecture & Tech Stack

- **Runtime & Framework**: Node.js & Express.js
- **Database & ODM**: MongoDB (6.0+) & Mongoose (8.5+)
- **Security & Middleware**: JWT Authentication, RBAC (Role-Based Access Control), Helmet, CORS, Express Rate Limit
- **API Documentation**: OpenAPI / Swagger UI at `http://localhost:5000/api/docs`
- **File Uploads**: Multer file upload pipelines with sanitized storage
- **Logging & Monitoring**: Morgan HTTP logger and centralized audit logs

---

## 📂 Architecture Structure

```
backend/
├── src/
│   ├── app.js                          # Express application configuration
│   ├── server.js                       # Server entry point (Port 5000)
│   ├── application/
│   │   ├── dto/                        # Data Transfer Objects
│   │   └── services/                   # Business logic services
│   │       ├── customer/               # Customer master & QR self-service
│   │       ├── design/                 # Design queue & proof review
│   │       ├── job-order/              # Job orders & stage lifecycle
│   │       ├── pos/                    # Point of sale & revenue reconciliation
│   │       ├── production/             # Production orders, operations & queue
│   │       └── sla/                    # Service Level Agreement tracking
│   ├── domain/
│   │   ├── entities/                   # Core business domain models
│   │   └── repositories/               # Repository interfaces
│   ├── infrastructure/
│   │   ├── config/                     # Swagger, database, and auth configuration
│   │   ├── database/mongoose/          # Mongoose schemas and models
│   │   │   ├── models/                 # Customer, JobOrder, ProductionOrder, QualityCheck, etc.
│   │   │   └── repositories/           # Concrete MongoDB repositories
│   │   └── whatsapp/                   # WhatsApp proof approval integration
│   ├── presentation/
│   │   ├── controllers/                # HTTP request handlers
│   │   ├── middleware/                 # Auth, RBAC, error handling, rate limiting
│   │   ├── routes/                     # Express REST route endpoints
│   │   └── validators/                 # Express-validator schemas
│   └── shared/                         # Common helpers, constants, and utilities
└── package.json
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create `.env` in the `backend/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/vasu_db
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

### 3. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:5000`.
- **Health Check**: `GET http://localhost:5000/api/health`
- **Swagger Documentation**: `GET http://localhost:5000/api/docs`

---

## 🔗 Integrated Workflow Modules (Frontend ↔ Backend)

| Module | Endpoints | Frontend Client |
| :--- | :--- | :--- |
| **Customer Master** | `/api/v1/customers`, `/api/v1/public/customers` | `frontend/src/printz-v3/modules/customer` |
| **Job Orders** | `/api/v1/job-orders` | `frontend/src/printz-v3/modules/job` |
| **Estimates** | `/api/v1/job-orders/:id/estimate` | `frontend/src/printz-v3/modules/estimate` |
| **Design Allocation** | `/api/v1/job-assignments`, `/api/v1/designers` | `frontend/src/printz-v3/modules/design` |
| **Production Orders** | `/api/v1/production-orders`, `/api/v1/production-operations` | `frontend/src/printz-v3/modules/production` |
| **Quality Control** | `/api/v1/quality-checks`, `/api/v1/reprint-requests` | `frontend/src/printz-v3/modules/quality` |
| **Printers & Machines** | `/api/v1/printers` | `frontend/src/printz-v3/modules/production` |
