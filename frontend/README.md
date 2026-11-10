# PrintZ Frontend

Web application for the **PrintZ multi-branch printing platform**, built with **React 18** and **Vite**.

---

## 🎨 Main Areas

- **Login**: an animated shop entrance with the staff character walking up and opening the door, followed by the sign-in card. See "Login Page" below.
- **Admin portal**: dashboards, branches, managers, users and roles, master settings, past-date approvals, exports.
- **Sale orders**: create, approve and track sale orders for the branch.
- **Job flow**: customers, estimation, job orders, design, production, quality control, delivery, invoices and settlement.
- **Manufacturing unit (mfg)**: manager and designer portals with their own dashboard.
- **POS and inventory**: point of sale, stock, printers.
- **HR**: employees, attendance and salary.

Each user lands on the page for their role after signing in (admin, manager, branch staff, operator, designer, QC inspector, cashier, manufacturing manager or designer).

---

## 🏗️ Folder Structure

```text
frontend/
├── public/                    # static assets and HTML template
├── src/
│   ├── app/                   # App.jsx (routes), PrivateRoute.jsx, providers (AuthContext)
│   ├── layouts/               # AdminLayout, ManagerLayout, JobFlowLayout, MfgLayout
│   ├── modules/               # one folder per feature area
│   │   ├── auth/              # login page, profile, forgot password
│   │   │   ├── pages/login.jsx
│   │   │   └── scene/         # animated login scene (canvas, styles, markup)
│   │   ├── admin/  dashboard/  sale-order/  jobflow/  mfg-unit/
│   │   ├── pos/  inventory/
│   │   └── hr/                # attendance, employees, salary
│   ├── shared/                # api.js (Axios), stores, hooks, ui components, styles, assets
│   └── index.js               # entry point
├── index.html
├── vite.config.js
└── package.json
```

---

## 🔐 Login Page

`src/modules/auth/pages/login.jsx` shows the animated scene and signs the user in through the normal `AuthContext.login()`.

- The scene lives in `src/modules/auth/scene/`:
  - `cartoonScene.js`: the canvas animation (walk, door, camera) and the form behaviour
  - `cartoonScene.css`: all styles
  - `cartoonMarkup.js`: the page markup
- It runs inside a **shadow root**, so its styles cannot clash with the rest of the app.
- The Baloo 2 font is loaded in `index.html`.
- Wrong credentials show a message and the mascot looks sad. A correct login shows "Signed In" and then redirects by role.
- The logo is `src/shared/assets/logo.png`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- The backend running on `http://localhost:5000` (see `../backend/README.md`)

### Install and run
```bash
cd frontend
npm install
npm run dev        # development server on http://localhost:3000
npm run build      # production build
npm run preview    # preview the production build
```

### Environment (optional)
Create `frontend/.env` only if your API is not at the default address:

```env
VITE_API_URL=http://localhost:5000/api
```

`VITE_API_BASE_URL` is also accepted. The API client is in `src/shared/services/api.js`.

---

## 🔑 Key Files

- `src/app/providers/AuthContext.jsx`: signed-in user, role, permissions, token handling. Tokens are attached to API calls by the Axios interceptor.
- `src/app/App.jsx`: all routes and role guards.
- `src/shared/services/api.js`: Axios instance with the base URL and token interceptor.
- `src/shared/services/branchStore.js` and `dashboardStore.js`: cached branch list and dashboard data so pages do not repeat the same requests.
