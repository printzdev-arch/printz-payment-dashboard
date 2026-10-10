# 🖨️ PrintZ Frontend — HR & Backend Integration Guide

This guide contains everything needed for HR / Technical Reviewers to run the frontend application and connect it with the backend REST API.

---

## ⚡ Quick Start (3 Steps)

### 1. Prerequisites
- **Node.js**: v18.x or v20.x recommended ([Download Node.js](https://nodejs.org/))
- **npm**: v9.x or v10.x (bundled with Node.js)
- **Backend API**: Running (by default at `http://localhost:5000/api`)

### 2. Install Dependencies
Open a terminal in the `frontend/` directory and run:
```bash
npm install
```

### 3. Start the Application
```bash
npm run dev
```
or
```bash
npm start
```
The application will start on **`http://localhost:3000`**.

---

## ⚙️ Backend Connection Configuration (`.env`)

The frontend has a `.env` file pre-configured for direct backend communication:

```env
# 1. Real Backend Mode:
# 'false' => Routes all HTTP calls directly to your backend API
# 'true'  => Standalone mode using built-in mock server (if backend is offline)
VITE_USE_MOCK=false

# 2. Backend API Endpoint:
# Change this if your backend is hosted on a different port or remote server
VITE_API_URL=http://localhost:5000/api

# 3. Port:
PORT=3000
```

> **Important**: When `VITE_USE_MOCK=false`, the frontend sends all API requests via Axios directly to `VITE_API_URL`.

---

## 🔌 Backend Requirements Checklist

Before testing, please verify the following on your backend server:

1. **CORS Origin Whitelist**:
   - Ensure the backend allows `http://localhost:3000`.
   - In the backend `.env`:
     ```env
     CLIENT_URL=http://localhost:3000,http://localhost:5173
     ```
2. **API Route Prefix**:
   - All frontend endpoints expect the `/api` prefix (e.g., `http://localhost:5000/api/auth/login`, `http://localhost:5000/api/branches`).
3. **Authentication**:
   - The frontend automatically stores the returned JWT Bearer token in `localStorage` (`token`) and attaches `Authorization: Bearer <token>` to every subsequent request.
4. **Standard Response Structure**:
   - The frontend expects standard responses matching:
     ```json
     {
       "success": true,
       "data": { ... }
     }
     ```

---

## 🧪 Testing Options

### Option A: Testing with Real Backend (Default)
1. Start your backend server (e.g., on port 5000).
2. Ensure `VITE_USE_MOCK=false` in `frontend/.env`.
3. Run `npm run dev` in `frontend/`.
4. Open `http://localhost:3000` and test logging in and interacting with the backend.

### Option B: Standalone Preview (No Backend Required)
If you want to test the frontend UI independently before or without the backend running:
1. In `frontend/.env`, set:
   ```env
   VITE_USE_MOCK=true
   ```
2. Restart the dev server (`npm run dev`).
3. The frontend will run with the in-browser mock database and complete dataset.

---

## 🏗️ Production Build Verification

To verify that the frontend compiles cleanly for production:
```bash
npm run build
```
This produces an optimized production bundle in the `build/` folder.

---

## 📞 Support
If you encounter any connection issues or need endpoint specifications, please contact the development team.
