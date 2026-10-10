# 🖨️ Printz Payment Dashboard — Backend REST API

A robust, enterprise-grade REST API backend for the **Printz Payment Dashboard**, architected following **Clean Architecture / DDD principles** and powered by **Node.js, Express.js, MongoDB Atlas (Mongoose), JWT Authentication, and Role-Based Access Control (RBAC)**.

The backend is **100% database-driven**, utilizing MongoDB Atlas (`printzpayment`) as the live source of truth for daily sales reconciliations, meter readings, stock consumption, customer dues, expenses, and role-based permissions.

---

## 🚀 Key Architectural Features

- **Clean Architecture & Separation of Concerns**:
  - `backend/src/domain/`: Enterprise business entities and repository interfaces (`IBranchRepository`, `IPrinterRepository`, etc.).
  - `backend/src/application/`: Application business rules, Data Transfer Objects (`backend/src/application/dto/`), and use cases (`CreateBranch`, `GetBranchById`, `CreateExpense`, etc.).
  - `backend/src/infrastructure/`: Frameworks, database connection, Mongoose schemas, and concrete repository implementations.
  - `backend/src/presentation/`: Express routes, controllers, middleware, and request validators.
  - `backend/src/shared/`: Cross-cutting concerns, helpers, error handlers, and response utilities.
- **MongoDB Atlas Database**: Live connection to MongoDB Atlas (`printzpayment` database) with over 27,270 authentic operational records across 15 collections.
- **Authentication & RBAC**: Secure password hashing with bcrypt, stateless JWT tokens (Access & Refresh tokens), and role-based route guards (`admin`, `manager`).
- **Interactive Swagger / OpenAPI 3.0 Documentation**: Live API explorer with A–Z sorted tags and operations, available at `/api-docs`.
- **Production Hardened**: Integrated Helmet HTTP security headers, CORS origin whitelisting, Express rate limiting, Morgan logger, and centralized async error handling.

---

## 🏢 Supported Branches

The system manages daily operations, inventory, and revenue across core branches including:

1. **Banaswadi** (`BR001`)
2. **Kammanahalli** (`BR002`)
3. **Agara Horamavu** (`BR003`)
4. **Lingrajpuram** (`BR004`)
5. **Thanisandra** (`BR005`)
6. **Babusapalya** (`BR006`)
7. **TC Palya** (`BR007`)
8. **HBR Layout** (`BR008`)
9. **Horamavu** (`BR009`)

---

## 🛠️ Environment Configuration

Create or update the `.env` file in the `backend/` directory:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.o5gbiuj.mongodb.net/printzpayment?retryWrites=true&w=majority
JWT_ACCESS_SECRET=printz_default_access_secret_2026
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=printz_default_refresh_secret_2026
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000,http://localhost:5173
```

---

## 📦 Installation & Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Start Development Server (with Auto-Reload)
```bash
npm run dev
```

### 3. Start Production Server
```bash
npm start
```

---

## 📖 Interactive API Documentation

Interactive Swagger documentation is hosted directly by the backend with built-in alphabetical sorting and live search filters:
- **Swagger UI**: `http://localhost:5000/api-docs`
- **Swagger JSON Spec**: `http://localhost:5000/api-docs.json`
- **Health Check**: `http://localhost:5000/api/health`

---

## 🗄️ MongoDB Atlas Database Mapping

The backend connects to the `printzpayment` database on MongoDB Atlas across the following collections:

| Domain Entity | Mongoose Model | MongoDB Atlas Collection | Purpose |
| :--- | :--- | :--- | :--- |
| [Branch](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/domain/entities/Branch.js) | [Branch.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/Branch.js) | `branches` | Branch profiles, addresses, active statuses |
| `Category` | [Category.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/Category.js) | `categories` | Service and stock category classifications |
| `FinalizedDate` | [FinalizedDate.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/FinalizedDate.js) | `finalizedDates` | End-of-day branch log lock statuses |
| [InventoryMovement](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/domain/entities/InventoryMovement.js) | [InventoryMovement.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/InventoryMovement.js) | `inventoryMovements` | Stock transfers and material movement records |
| `JumboXerox` | [JumboXerox.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/JumboXerox.js) | `jumboXeroxPricing` | Large format pricing tiers and configurations |
| `JumboXeroxReading` | [JumboXeroxReading.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/JumboXeroxReading.js) | `jumboXeroxReadings` | Large format blueprint & poster daily logs |
| [PastDateRequest](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/domain/entities/PastDateRequest.js) | [PastDateRequest.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/PastDateRequest.js) | `pastDateRequests` | Manager requests to edit past locked records |
| `Payment` | [PaymentToBeCollected.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/PaymentToBeCollected.js) | `paymentToBeCollected` | Customer dues & outstanding collections ledger |
| `Printer` | [Printer.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/Printer.js) | `printers` | Physical printer machines, models & rate cards |
| `PrinterReading` | [PrinterReading.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/PrinterReading.js) | `printerReadings` | Daily meter readings and copy counter logs |
| `StockItem` | [StockItem.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/StockItem.js) | `stocks` | Inventory master list (paper reams, toner, pouches) |
| `StockReading` | [StockReading.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/StockReading.js) | `stockReadings` | Daily stock consumption (opening, received, damaged, closing) |
| `TotalAmount` | [TotalAmountReading.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/TotalAmountReading.js) | `totalAmountReadings` | Daily cashier & settlement reconciliation (Cash/UPI/Dues) |
| [User](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/domain/entities/User.js) | [User.js](file:///d:/Sathasivam/version_1/printz-payment-dashboard-main/backend/src/infrastructure/database/mongoose/models/User.js) | `users` | User accounts, credentials, roles & permissions |

---

## 📚 API Endpoints Reference (Alphabetical A–Z)

### 🔐 1. Authentication
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user & issue signed Access & Refresh tokens | Public |
| `POST` | `/api/auth/logout` | Invalidate session & logout user | Authenticated |
| `POST` | `/api/auth/refresh` | Exchange Refresh Token for fresh Access & Refresh tokens | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & permissions | Authenticated |

### 🏬 2. Branches
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/branches` | List all branches | Authenticated |
| `GET` | `/api/branches/:id` | Get branch details by ID | Authenticated |
| `POST` | `/api/branches` | Create a new branch (Enforces unique name & code) | Admin Only |
| `PUT` | `/api/branches/:id` | Update branch name, code, address, branchType, weeklyOffDays | Admin Only |
| `PATCH`| `/api/branches/:id` | Partially update branch fields | Admin Only |
| `DELETE`| `/api/branches/:id` | Delete a branch by ID | Admin Only |

### 🏷️ 3. Categories
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/general/categories` | List stock & service categories | Authenticated |
| `POST` | `/api/general/categories` | Add a new category | Admin Only |
| `GET` | `/api/general/finalized-dates` | Query locked / finalized date status | Authenticated |
| `POST` | `/api/general/finalized-dates` | Finalize / lock end-of-day branch records | Authenticated |

### 📑 4. Jumbo Xerox (Large Format Printing)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/jumbo-xerox/machines` | List large format printers & pricing rates | Authenticated |
| `GET` | `/api/jumbo-xerox/machines/:id` | Get large format machine details by ID | Authenticated |
| `POST` | `/api/jumbo-xerox/machines` | Register large format machine / pricing | Admin Only |
| `PUT` | `/api/jumbo-xerox/machines/:id` | Update large format machine / pricing | Admin Only |
| `DELETE`| `/api/jumbo-xerox/machines/:id` | Remove machine pricing | Admin Only |
| `GET` | `/api/jumbo-xerox/readings` | Query daily Jumbo Xerox readings | Authenticated |
| `POST` | `/api/jumbo-xerox/readings` | Save daily Jumbo Xerox reading | Authenticated |
| `DELETE`| `/api/jumbo-xerox/readings/:id` | Delete Jumbo Xerox reading | Admin Only |

### ⏳ 5. Past Date Requests
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/past-date-requests` | List unlock requests (filter by `status`, `requestedBranch`) | Authenticated |
| `GET` | `/api/past-date-requests/:id` | Get past date request details | Authenticated |
| `POST` | `/api/past-date-requests` | Manager submits request to unlock past date log | Authenticated |
| `PUT` | `/api/past-date-requests/:id` | Admin approves or rejects past date request | Admin Only |
| `DELETE`| `/api/past-date-requests/:id` | Delete request record | Admin Only |

### 💳 6. Payments to Collect (Customer Ledger)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/payments` | Query outstanding payments ledger by branch / date | Authenticated |
| `GET` | `/api/payments/:id` | Get payment record by ID | Authenticated |
| `POST` | `/api/payments` | Record new pending balance or payment collection | Authenticated |
| `PUT` | `/api/payments/:id` | Update collected amount or payment receipt | Authenticated |
| `DELETE`| `/api/payments/:id` | Delete payment record | Admin Only |

### 📊 7. Printer Readings
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/printer-readings` | Query meter readings by `branchName`, `date` | Authenticated |
| `GET` | `/api/printer-readings/:id` | Fetch reading record by ID | Authenticated |
| `POST` | `/api/printer-readings` | Save or upsert daily meter reading entry | Authenticated |
| `PUT` | `/api/printer-readings/:id` | Update meter reading record | Authenticated |
| `DELETE`| `/api/printer-readings/:id` | Delete reading entry | Admin Only |

### 🖨️ 8. Printers
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/printers` | Get printers (filterable by `branchName`, `status`) | Authenticated |
| `GET` | `/api/printers/:id` | Get printer configuration & rate card | Authenticated |
| `POST` | `/api/printers` | Register a new printer / machine | Admin / Manager |
| `PUT` | `/api/printers/:id` | Update rates, status, or configuration | Admin / Manager |
| `DELETE`| `/api/printers/:id` | Remove a printer | Admin Only |

### 📈 9. Reports & KPIs
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/dashboard-summary` | Live multi-branch aggregated revenue, copies, and KPIs | Authenticated |
| `GET` | `/api/reports/monthly-revenue` | Year-over-year / month-by-month revenue trend analysis | Authenticated |

### 💰 10. Revenue & Total Amounts
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/total-amounts` | Query daily revenue entries (filter by `branchName`, `date`) | Authenticated |
| `GET` | `/api/total-amounts/:id` | Get daily revenue entry by ID | Authenticated |
| `POST` | `/api/total-amounts` | Save/Upsert daily cashier & payment reconciliation | Authenticated |
| `PUT` | `/api/total-amounts/:id` | Update total amount entry | Authenticated |
| `DELETE`| `/api/total-amounts/:id` | Delete total amount entry | Admin Only |

### 📦 11. Stocks
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/stocks/items` | List stock inventory (filter by `branchName`, `category`) | Authenticated |
| `POST` | `/api/stocks/items` | Add or update inventory item | Admin / Manager |
| `DELETE`| `/api/stocks/items/:id` | Remove inventory item | Admin Only |
| `GET` | `/api/stocks/readings` | Query daily stock opening/closing consumption logs | Authenticated |
| `POST` | `/api/stocks/readings` | Save daily stock consumption log | Authenticated |
| `DELETE`| `/api/stocks/readings/:id` | Delete stock reading | Admin Only |

### 🩺 12. System
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status check | Public |

### 👥 13. Users & RBAC
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | List users (filterable by `role`, `branch`, `isActive`) | Admin Only |
| `GET` | `/api/users/:id` | Get user details by ID | Authenticated |
| `POST` | `/api/users` | Create a new Admin or Branch Manager account | Admin Only |
| `PUT` | `/api/users/:id` | Update user details, role, or granular permissions | Authenticated |
| `DELETE`| `/api/users/:id` | Delete user account from database | Admin Only |

---

## 🔑 Authentic Accounts & Credentials

| Role | Email | Password | Branch Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@printz.shop` | `Admin@123` | Global (All Branches) |
| **Admin / Dev** | `printzdev@gmail.com` | `Admin@123` | Global (All Branches) |
| **Admin** | `kmln@gmail.com` | `Admin@123` | Global (All Branches) |
| **Branch Manager** | `lr@printz.shop` | `Manager@123` | Lingrajpuram |
| **Branch Manager** | `tan@printz.shop` | `Manager@123` | Thanisandra |
| **Branch Manager** | `hbr@printz.shop` | `Manager@123` | HBR Layout |
| **Branch Manager** | `rm@printz.shop` | `Manager@123` | Ramamurthynagar |
| **Branch Manager** | `printzzzko@gmail.com` | `Manager@123` | Kothanur |
| **Branch Manager** | `ag@printz.shop` | `Manager@123` | Horamavu Agara |
| **Branch Manager** | `bn@printz.shop` | `Manager@123` | Banaswadi |
| **Branch Manager** | `ba@printz.shop` | `Manager@123` | Babusapalya |
| **Branch Manager** | `ho@printz.shop` | `Manager@123` | Horamavu |

---

## 🔒 Standardized Response Format

All API responses follow a uniform JSON structure:

### Successful Response:
```json
{
  "success": true,
  "message": "Total amount readings retrieved successfully",
  "data": [ ... ]
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Invalid email or password",
  "errors": [ ... ]
}
```
