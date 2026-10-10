/**
 * PrintZ In-Browser Standalone Mock Server
 * 
 * Provides complete API simulation using localStorage persistence.
 * Can be toggled on/off in `.env` using VITE_USE_MOCK=true/false.
 */
import { initialData } from "./initialData.js";

const STORAGE_KEY = "PRINTZ_MOCK_STORAGE_V3";

// Initialize or load mock database from localStorage
function getDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all seed collections exist and are merged
      let needsSave = false;
      for (const [key, initialList] of Object.entries(initialData)) {
        if (!parsed[key] || (Array.isArray(initialList) && parsed[key].length === 0)) {
          parsed[key] = initialList;
          needsSave = true;
        } else if (Array.isArray(initialList) && parsed[key].length < initialList.length) {
          parsed[key] = initialList;
          needsSave = true;
        }
      }

      // Explicit check for designers in users
      const currentDesignersCount = (parsed.users || []).filter((u) => u.role === "designer").length;
      if (currentDesignersCount < 12) {
        const sampleDesigners = (initialData.users || []).filter((u) => u.role === "designer");
        const existingNonDesigners = (parsed.users || []).filter((u) => u.role !== "designer");
        parsed.users = [...existingNonDesigners, ...sampleDesigners];
        needsSave = true;
      }

      // Explicit check for designAssignments
      if (!parsed.designAssignments || parsed.designAssignments.length === 0) {
        parsed.designAssignments = initialData.designAssignments;
        needsSave = true;
      }

      // Explicit check for POS datasets (Step 7)
      if (!parsed.posProducts || parsed.posProducts.length === 0) {
        parsed.posProducts = initialData.posProducts;
        needsSave = true;
      }
      if (!parsed.posCategories || parsed.posCategories.length === 0) {
        parsed.posCategories = initialData.posCategories;
        needsSave = true;
      }
      if (!parsed.sales || parsed.sales.length === 0) {
        parsed.sales = initialData.sales;
        needsSave = true;
      }
      if (!parsed.invoices || parsed.invoices.length === 0) {
        parsed.invoices = initialData.invoices;
        needsSave = true;
      }
      if (!parsed.saleReceipts || parsed.saleReceipts.length === 0) {
        parsed.saleReceipts = initialData.saleReceipts;
        needsSave = true;
      }
      if (!parsed.heldBills) {
        parsed.heldBills = initialData.heldBills || [];
        needsSave = true;
      }
      if (!parsed.returns) {
        parsed.returns = initialData.returns || [];
        needsSave = true;
      }

      // Explicit check for Production Planning datasets (Step 8)
      if (!parsed.productionMachines || parsed.productionMachines.length === 0) {
        parsed.productionMachines = initialData.productionMachines;
        needsSave = true;
      }
      if (!parsed.eligibleJobsForPlanning || parsed.eligibleJobsForPlanning.length === 0) {
        parsed.eligibleJobsForPlanning = initialData.eligibleJobsForPlanning;
        needsSave = true;
      }
      if (!parsed.productionOrders || parsed.productionOrders.length === 0) {
        parsed.productionOrders = initialData.productionOrders;
        needsSave = true;
      }
      if (!parsed.qualityChecks || parsed.qualityChecks.length === 0) {
        parsed.qualityChecks = initialData.qualityChecks || [];
        needsSave = true;
      }
      if (!parsed.reprintRequests || parsed.reprintRequests.length === 0) {
        parsed.reprintRequests = initialData.reprintRequests || [];
        needsSave = true;
      }
      if (!parsed.qcChecklistTemplate) {
        parsed.qcChecklistTemplate = initialData.qcChecklistTemplate;
        needsSave = true;
      }
      if (!parsed.defectCatalogue) {
        parsed.defectCatalogue = initialData.defectCatalogue;
        needsSave = true;
      }

      if (needsSave) {
        saveDb(parsed);
      }

      return parsed;
    }
  } catch (e) {
    console.error("Failed to parse mock DB from localStorage, resetting:", e);
  }
  // Initialize with initial data
  const freshDb = JSON.parse(JSON.stringify(initialData));
  saveDb(freshDb);
  return freshDb;
}

let syncDebounceTimer = null;
function syncToSampleFiles(db) {
  try {
    if (typeof window === "undefined" || !window.fetch) return;
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      fetch("/__dev-sync-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allCollections: db })
      }).catch(() => {});
    }, 400);
  } catch (e) {}
}

function saveDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    syncToSampleFiles(db);
  } catch (e) {
    console.error("Failed to save mock DB to localStorage:", e);
  }
}

// Reset database to initial state
export function resetMockDb() {
  const fresh = JSON.parse(JSON.stringify(initialData));
  saveDb(fresh);
  return fresh;
}

// Helper to generate IDs
function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// Helper to get authenticated user from storage or header
function getAuthUser(config) {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
}


// Helper to sanitize customer design approval for secure public/portal view
function sanitizeCustomerDesignApproval(assignment) {
  if (!assignment) return null;
  const proofs = assignment.proofs || [];
  const currentProof = proofs.length > 0 ? proofs[proofs.length - 1] : null;
  return {
    assignmentId: assignment.id || assignment.assignmentId || assignment._id || assignment.assignmentNo,
    id: assignment.id || assignment.assignmentId || assignment._id || assignment.assignmentNo,
    assignmentNo: assignment.assignmentNo,
    jobId: assignment.jobId,
    jobNo: assignment.jobNo,
    jobItemId: assignment.jobItemId,
    itemName: assignment.itemName,
    productType: assignment.productType,
    customerName: assignment.customerName,
    customerContactPerson: assignment.customerContactPerson || assignment.customerName,
    customerEmail: assignment.customerEmail,
    customerMobile: assignment.customerMobile,
    customerCompany: assignment.customerCompany,
    branchName: assignment.branchName || "Kothanur",
    dueDate: assignment.dueDate || "22 Sep 2026",
    slaUrgency: assignment.slaUrgency || "Customer review 1d left",
    status: assignment.status,
    priority: assignment.priority,
    requirementSnapshot: assignment.requirementSnapshot || {},
    assignedDesignerName: assignment.assignedDesignerName || "Priya R",
    assignedDesignerCode: assignment.assignedDesignerCode || "PR",
    assignedDesignerRole: assignment.assignedDesignerRole || "Sr. Designer",
    currentProof,
    proofs,
    reviews: assignment.reviews || [],
    timeline: (assignment.timeline || []).filter(
      (t) => !t.notes?.toLowerCase().includes("cost") && !t.notes?.toLowerCase().includes("margin")
    ),
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt
  };
}

function sanitizeCustomerEstimate(estimate) {
  if (!estimate) return null;
  return {
    ...estimate,
    costSummary: undefined,
    internalNotes: undefined
  };
}

// Helper to simulate network latency
const sleep = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Handle incoming Axios request in mock mode
 */
export async function handleMockRequest(config) {
  await sleep(100);

  const method = (config.method || "get").toLowerCase();
  let url = config.url || "";
  
  // Normalize URL - strip baseURL if present
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      url = parsed.pathname;
    } catch (e) {
      // keep url
    }
  }
  
  // Strip leading /api/v1, /api, or /v1 if present
  url = url.replace(/^\/api\/v1/, "").replace(/^\/api/, "").replace(/^\/v1/, "");
  if (!url.startsWith("/")) {
    url = "/" + url;
  }

  // Parse query parameters
  const urlObj = new URL(url, "http://localhost");
  const path = urlObj.pathname;
  const cleanPath = path;
  const params = {
    ...Object.fromEntries(urlObj.searchParams.entries()),
    ...(config.params || {})
  };

  let body = {};
  if (config.data) {
    try {
      body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
    } catch (e) {
      body = config.data;
    }
  }
  const data = body;

  const db = getDb();

  // Route Dispatcher
  try {
    // ----------------------------------------------------
    // Health Check
    // ----------------------------------------------------
    if (path === "/health" || path === "/") {
      return createResponse(200, {
        status: "ok",
        mock: true,
        message: "PrintZ Frontend Mock Server is running smoothly!",
        timestamp: new Date().toISOString()
      }, config);
    }

    // ----------------------------------------------------
    // Auth Routes
    // ----------------------------------------------------
    // Auth Routes
    // ----------------------------------------------------
    if (path === "/auth/login" && method === "post") {
      const { email, password } = body || {};
      const searchKey = (email || "").toLowerCase().trim();

      // Find user by email, name, branch or fallback
      let user = db.users.find(
        (u) =>
          u.email?.toLowerCase() === searchKey ||
          u.name?.toLowerCase() === searchKey ||
          (searchKey.includes("admin") && u.role === "admin") ||
          (searchKey.includes("manager") && u.role === "manager") ||
          (searchKey.includes("ba") && u.email?.includes("ba@"))
      );

      // Default to Banaswadi manager or admin if not found but testing
      if (!user && db.users.length > 0) {
        user = searchKey.includes("admin") ? db.users[0] : (db.users.find(u => u.role === "manager") || db.users[0]);
      }

      if (!user) {
        return createErrorResponse(401, "Invalid email or credentials", config);
      }

      const token = `mock_jwt_token_${user._id || user.id}_${Date.now()}`;
      const { password: _, ...userWithoutPassword } = user;

      // Make sure response structure matches both response.data.data and response.data.user
      return createResponse(200, {
        success: true,
        message: "Login successful",
        data: {
          token,
          user: userWithoutPassword
        },
        token,
        user: userWithoutPassword
      }, config);
    }

    if (path === "/auth/me" && method === "get") {
      const storedUser = localStorage.getItem("user");
      let currentUser = null;
      if (storedUser) {
        try {
          currentUser = JSON.parse(storedUser);
        } catch (e) {}
      }
      if (!currentUser && db.users.length > 0) {
        currentUser = db.users[0];
      }
      return createResponse(200, {
        success: true,
        data: currentUser,
        user: currentUser
      }, config);
    }

    if (path === "/auth/send-reset-email" && method === "post") {
      return createResponse(200, {
        success: true,
        message: `Password reset instructions sent to ${body?.email || "email"}`,
        mockNotice: "Mock reset link: Check console or proceed to reset password directly."
      }, config);
    }

    if (path === "/auth/reset-password" && method === "post") {
      return createResponse(200, {
        success: true,
        message: "Password has been updated successfully."
      }, config);
    }

    // ----------------------------------------------------
    // Users Profile & Users CRUD
    // ----------------------------------------------------
    if (path === "/users/profile" && method === "get") {
      const storedUser = localStorage.getItem("user");
      let user = storedUser ? JSON.parse(storedUser) : db.users[0];
      return createResponse(200, {
        success: true,
        data: user,
        user,
        profile: user
      }, config);
    }

    if (path.startsWith("/users")) {
      const idMatch = path.match(/^\/users\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        if (method === "get") {
          const user = db.users.find((u) => u.id === id || u._id === id);
          if (!user) return createErrorResponse(404, "User not found", config);
          return createResponse(200, user, config);
        }
        if (method === "put" || method === "patch") {
          const idx = db.users.findIndex((u) => u.id === id || u._id === id);
          if (idx === -1) return createErrorResponse(404, "User not found", config);
          db.users[idx] = { ...db.users[idx], ...body, updatedAt: new Date().toISOString() };
          saveDb(db);
          return createResponse(200, db.users[idx], config);
        }
        if (method === "delete") {
          db.users = db.users.filter((u) => u.id !== id && u._id !== id);
          saveDb(db);
          return createResponse(200, { message: "User deleted successfully" }, config);
        }
      }

      if (method === "get") {
        let list = [...db.users];
        if (params.role) {
          list = list.filter((u) => u.role === params.role);
        }
        if (params.branch || params.branchName) {
          const b = params.branch || params.branchName;
          list = list.filter((u) => u.branch === b || u.branchName === b || u.branch === "All Branches");
        }
        return createResponse(200, list, config);
      }

      if (method === "post") {
        const newUser = {
          _id: generateId("usr"),
          id: generateId("usr"),
          isActive: true,
          createdAt: new Date().toISOString(),
          ...body
        };
        db.users.push(newUser);
        saveDb(db);
        return createResponse(201, newUser, config);
      }
    }

    // ----------------------------------------------------
    // Branches
    // ----------------------------------------------------
    if (path.startsWith("/branches")) {
      const idMatch = path.match(/^\/branches\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        if (method === "get") {
          const branch = db.branches.find((b) => b.id === id || b._id === id || b.name === id || b.branchName === id);
          if (!branch) return createErrorResponse(404, "Branch not found", config);
          return createResponse(200, branch, config);
        }
        if (method === "put" || method === "patch") {
          const idx = db.branches.findIndex((b) => b.id === id || b._id === id);
          if (idx === -1) return createErrorResponse(404, "Branch not found", config);
          db.branches[idx] = { ...db.branches[idx], ...body, updatedAt: new Date().toISOString() };
          saveDb(db);
          return createResponse(200, db.branches[idx], config);
        }
        if (method === "delete") {
          db.branches = db.branches.filter((b) => b.id !== id && b._id !== id);
          saveDb(db);
          return createResponse(200, { message: "Branch deleted successfully" }, config);
        }
      }

      if (method === "get") {
        let list = [...db.branches];
        if (params.isActive !== undefined) {
          const isActive = params.isActive === "true" || params.isActive === true;
          list = list.filter((b) => b.isActive === isActive || (isActive && b.status === "active"));
        }
        return createResponse(200, list, config);
      }

      if (method === "post") {
        const newBranch = {
          _id: generateId("br"),
          id: generateId("br"),
          isActive: true,
          status: "active",
          createdAt: new Date().toISOString(),
          ...body
        };
        db.branches.push(newBranch);
        saveDb(db);
        return createResponse(201, newBranch, config);
      }
    }

    // ----------------------------------------------------
    // Printers
    // ----------------------------------------------------
    if (path.startsWith("/printers")) {
      const idMatch = path.match(/^\/printers\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        if (method === "get") {
          const printer = db.printers.find((p) => p.id === id || p._id === id);
          if (!printer) return createErrorResponse(404, "Printer not found", config);
          return createResponse(200, printer, config);
        }
        if (method === "put" || method === "patch") {
          const idx = db.printers.findIndex((p) => p.id === id || p._id === id);
          if (idx === -1) return createErrorResponse(404, "Printer not found", config);
          db.printers[idx] = { ...db.printers[idx], ...body, updatedAt: new Date().toISOString() };
          saveDb(db);
          return createResponse(200, db.printers[idx], config);
        }
        if (method === "delete") {
          db.printers = db.printers.filter((p) => p.id !== id && p._id !== id);
          saveDb(db);
          return createResponse(200, { message: "Printer deleted successfully" }, config);
        }
      }

      if (method === "get") {
        let list = [...db.printers];
        if (params.branch || params.branchName) {
          const b = params.branch || params.branchName;
          list = list.filter((p) => p.branchName === b || p.branch === b);
        }
        if (params.isActive !== undefined) {
          const active = params.isActive === "true" || params.isActive === true;
          list = list.filter((p) => p.isActive === active || (active && p.status === "active"));
        }
        return createResponse(200, list, config);
      }

      if (method === "post") {
        const newPrinter = {
          _id: generateId("prn"),
          id: generateId("prn"),
          status: "active",
          isActive: true,
          createdAt: new Date().toISOString(),
          ...body
        };
        db.printers.push(newPrinter);
        saveDb(db);
        return createResponse(201, newPrinter, config);
      }
    }

    // ----------------------------------------------------
    // Printer Readings
    // ----------------------------------------------------
    if (path.startsWith("/printer-readings")) {
      const idMatch = path.match(/^\/printer-readings\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        if (method === "get") {
          const reading = db.printerReadings.find((r) => r.id === id || r._id === id);
          if (!reading) return createErrorResponse(404, "Reading not found", config);
          return createResponse(200, reading, config);
        }
        if (method === "put" || method === "patch") {
          const idx = db.printerReadings.findIndex((r) => r.id === id || r._id === id);
          if (idx === -1) return createErrorResponse(404, "Reading not found", config);
          db.printerReadings[idx] = { ...db.printerReadings[idx], ...body, updatedAt: new Date().toISOString() };
          saveDb(db);
          return createResponse(200, db.printerReadings[idx], config);
        }
        if (method === "delete") {
          db.printerReadings = db.printerReadings.filter((r) => r.id !== id && r._id !== id);
          saveDb(db);
          return createResponse(200, { message: "Reading deleted successfully" }, config);
        }
      }

      if (method === "get") {
        let list = [...db.printerReadings];
        if (params.branch || params.branchName) {
          const b = params.branch || params.branchName;
          list = list.filter((r) => r.branchName === b || r.branch === b);
        }
        if (params.date) {
          list = list.filter((r) => r.date === params.date || r.date?.startsWith(params.date));
        }
        if (params.printerId) {
          list = list.filter((r) => r.printerId === params.printerId);
        }
        return createResponse(200, list, config);
      }

      if (method === "post") {
        const newReading = {
          _id: generateId("pread"),
          id: generateId("pread"),
          createdAt: new Date().toISOString(),
          ...body
        };
        db.printerReadings.push(newReading);
        saveDb(db);
        return createResponse(201, newReading, config);
      }
    }

    // ----------------------------------------------------
    // Jumbo Xerox (Machines, Readings, Configurations)
    // ----------------------------------------------------
    if (path.startsWith("/jumbo-xerox")) {
      // Readings
      if (path.includes("/readings")) {
        const idMatch = path.match(/\/readings\/([^\/]+)$/);
        if (idMatch) {
          const id = idMatch[1];
          if (method === "get") {
            const r = db.jumboReadings.find((j) => j.id === id || j._id === id);
            return r ? createResponse(200, r, config) : createErrorResponse(404, "Jumbo reading not found", config);
          }
          if (method === "put" || method === "patch") {
            const idx = db.jumboReadings.findIndex((j) => j.id === id || j._id === id);
            if (idx === -1) return createErrorResponse(404, "Jumbo reading not found", config);
            db.jumboReadings[idx] = { ...db.jumboReadings[idx], ...body, updatedAt: new Date().toISOString() };
            saveDb(db);
            return createResponse(200, db.jumboReadings[idx], config);
          }
          if (method === "delete") {
            db.jumboReadings = db.jumboReadings.filter((j) => j.id !== id && j._id !== id);
            saveDb(db);
            return createResponse(200, { message: "Jumbo reading deleted" }, config);
          }
        }

        if (method === "get") {
          let list = [...db.jumboReadings];
          if (params.branch || params.branchName) {
            const b = params.branch || params.branchName;
            list = list.filter((j) => j.branchName === b || j.branch === b);
          }
          if (params.date) {
            list = list.filter((j) => j.date === params.date || j.date?.startsWith(params.date));
          }
          return createResponse(200, list, config);
        }

        if (method === "post") {
          const newJumboReading = {
            _id: generateId("jread"),
            id: generateId("jread"),
            createdAt: new Date().toISOString(),
            ...body
          };
          db.jumboReadings.push(newJumboReading);
          saveDb(db);
          return createResponse(201, newJumboReading, config);
        }
      }

      // Configurations / Machines
      if (path.includes("/machines") || path.includes("/configurations")) {
        const idMatch = path.match(/\/(?:machines|configurations)\/([^\/]+)$/);
        if (idMatch) {
          const id = idMatch[1];
          if (method === "get") {
            const m = db.jumboMachines.find((j) => j.id === id || j._id === id);
            return m ? createResponse(200, m, config) : createErrorResponse(404, "Jumbo machine not found", config);
          }
          if (method === "put" || method === "patch") {
            const idx = db.jumboMachines.findIndex((j) => j.id === id || j._id === id);
            if (idx === -1) return createErrorResponse(404, "Jumbo machine not found", config);
            db.jumboMachines[idx] = { ...db.jumboMachines[idx], ...body, updatedAt: new Date().toISOString() };
            saveDb(db);
            return createResponse(200, db.jumboMachines[idx], config);
          }
          if (method === "delete") {
            db.jumboMachines = db.jumboMachines.filter((j) => j.id !== id && j._id !== id);
            saveDb(db);
            return createResponse(200, { message: "Jumbo machine deleted" }, config);
          }
        }

        if (method === "get") {
          let list = [...db.jumboMachines];
          if (params.branch || params.branchName) {
            const b = params.branch || params.branchName;
            list = list.filter((j) => j.branchName === b || j.branch === b);
          }
          return createResponse(200, list, config);
        }

        if (method === "post") {
          const newJumboMachine = {
            _id: generateId("jumbo_m"),
            id: generateId("jumbo_m"),
            status: "active",
            createdAt: new Date().toISOString(),
            ...body
          };
          db.jumboMachines.push(newJumboMachine);
          saveDb(db);
          return createResponse(201, newJumboMachine, config);
        }
      }
    }

    // ----------------------------------------------------
    // Stock / Inventory Items & Readings
    // ----------------------------------------------------
    if (path.startsWith("/stocks") || path === "/inventory") {
      // Stock Readings
      if (path.includes("/readings")) {
        const idMatch = path.match(/\/readings\/([^\/]+)$/);
        if (idMatch) {
          const id = idMatch[1];
          if (method === "get") {
            const r = db.stockReadings.find((s) => s.id === id || s._id === id);
            return r ? createResponse(200, r, config) : createErrorResponse(404, "Stock reading not found", config);
          }
          if (method === "put" || method === "patch") {
            const idx = db.stockReadings.findIndex((s) => s.id === id || s._id === id);
            if (idx === -1) return createErrorResponse(404, "Stock reading not found", config);
            db.stockReadings[idx] = { ...db.stockReadings[idx], ...body, updatedAt: new Date().toISOString() };
            saveDb(db);
            return createResponse(200, db.stockReadings[idx], config);
          }
          if (method === "delete") {
            db.stockReadings = db.stockReadings.filter((s) => s.id !== id && s._id !== id);
            saveDb(db);
            return createResponse(200, { message: "Stock reading deleted" }, config);
          }
        }

        if (method === "get") {
          let list = [...db.stockReadings];
          if (params.branch || params.branchName) {
            const b = params.branch || params.branchName;
            list = list.filter((s) => s.branchName === b || s.branch === b);
          }
          if (params.date) {
            list = list.filter((s) => s.date === params.date || s.date?.startsWith(params.date));
          }
          return createResponse(200, list, config);
        }

        if (method === "post") {
          const newStockReading = {
            _id: generateId("stk_read"),
            id: generateId("stk_read"),
            createdAt: new Date().toISOString(),
            ...body
          };
          db.stockReadings.push(newStockReading);
          saveDb(db);
          return createResponse(201, newStockReading, config);
        }
      }

      // Stock Items
      if (path.includes("/items") || path === "/stocks") {
        const idMatch = path.match(/\/items\/([^\/]+)$/);
        if (idMatch) {
          const id = idMatch[1];
          if (method === "get") {
            const itm = db.stockItems.find((s) => s.id === id || s._id === id);
            return itm ? createResponse(200, itm, config) : createErrorResponse(404, "Stock item not found", config);
          }
          if (method === "put" || method === "patch") {
            const idx = db.stockItems.findIndex((s) => s.id === id || s._id === id);
            if (idx === -1) return createErrorResponse(404, "Stock item not found", config);
            db.stockItems[idx] = { ...db.stockItems[idx], ...body, updatedAt: new Date().toISOString() };
            saveDb(db);
            return createResponse(200, db.stockItems[idx], config);
          }
          if (method === "delete") {
            db.stockItems = db.stockItems.filter((s) => s.id !== id && s._id !== id);
            saveDb(db);
            return createResponse(200, { message: "Stock item deleted" }, config);
          }
        }

        if (method === "get") {
          let list = [...db.stockItems];
          if (params.branch || params.branchName) {
            const b = params.branch || params.branchName;
            list = list.filter((s) => s.branchName === b || s.branch === b);
          }
          if (params.category) {
            list = list.filter((s) => s.category === params.category);
          }
          return createResponse(200, list, config);
        }

        if (method === "post") {
          const newStockItem = {
            _id: generateId("stk"),
            id: generateId("stk"),
            status: "In Stock",
            createdAt: new Date().toISOString(),
            ...body
          };
          db.stockItems.push(newStockItem);
          saveDb(db);
          return createResponse(201, newStockItem, config);
        }
      }

      // Stock Categories
      if (path.includes("/categories")) {
        if (method === "get") {
          return createResponse(200, db.categories || [], config);
        }
        if (method === "post") {
          const newCat = {
            _id: generateId("cat"),
            id: generateId("cat"),
            ...body
          };
          db.categories = db.categories || [];
          db.categories.push(newCat);
          saveDb(db);
          return createResponse(201, newCat, config);
        }
      }
    }

    // ----------------------------------------------------
    // Categories (General & Stock)
    // ----------------------------------------------------
    if (path.startsWith("/general/categories") || path.startsWith("/categories")) {
      const idMatch = path.match(/\/(?:general\/categories|categories)\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        if (method === "get") {
          const cat = (db.categories || []).find((c) => c.id === id || c._id === id);
          return cat ? createResponse(200, cat, config) : createErrorResponse(404, "Category not found", config);
        }
        if (method === "put" || method === "patch") {
          const idx = (db.categories || []).findIndex((c) => c.id === id || c._id === id);
          if (idx === -1) return createErrorResponse(404, "Category not found", config);
          db.categories[idx] = { ...db.categories[idx], ...body };
          saveDb(db);
          return createResponse(200, db.categories[idx], config);
        }
        if (method === "delete") {
          db.categories = (db.categories || []).filter((c) => c.id !== id && c._id !== id);
          saveDb(db);
          return createResponse(200, { message: "Category deleted" }, config);
        }
      }

      if (method === "get") {
        return createResponse(200, db.categories || [], config);
      }
      if (method === "post") {
        const newCat = {
          _id: generateId("cat"),
          id: generateId("cat"),
          ...body
        };
        db.categories = db.categories || [];
        db.categories.push(newCat);
        saveDb(db);
        return createResponse(201, newCat, config);
      }
    }

    // ----------------------------------------------------
    // Inventory Movements
    // ----------------------------------------------------
    if (path.startsWith("/general/inventory-movements") || path.startsWith("/inventory-movements")) {
      if (method === "get") {
        let list = [...(db.inventoryMovements || [])];
        if (params.branch || params.branchName) {
          const b = params.branch || params.branchName;
          list = list.filter((m) => m.fromBranch === b || m.toBranch === b || m.branchName === b);
        }
        return createResponse(200, list, config);
      }
      if (method === "post") {
        const newMovement = {
          _id: generateId("inv_mov"),
          id: generateId("inv_mov"),
          date: new Date().toISOString().split("T")[0],
          createdAt: new Date().toISOString(),
          ...body
        };
        db.inventoryMovements = db.inventoryMovements || [];
        db.inventoryMovements.push(newMovement);
        saveDb(db);
        return createResponse(201, newMovement, config);
      }
    }

    // ----------------------------------------------------
    // Total Amounts (Daily Closing & Financials)
    // ----------------------------------------------------
    if (path.startsWith("/total-amounts")) {
      const idMatch = path.match(/^\/total-amounts\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        if (method === "get") {
          const tot = db.totalAmounts.find((t) => t.id === id || t._id === id);
          return tot ? createResponse(200, tot, config) : createErrorResponse(404, "Record not found", config);
        }
        if (method === "put" || method === "patch") {
          const idx = db.totalAmounts.findIndex((t) => t.id === id || t._id === id);
          if (idx === -1) return createErrorResponse(404, "Record not found", config);
          db.totalAmounts[idx] = { ...db.totalAmounts[idx], ...body, updatedAt: new Date().toISOString() };
          saveDb(db);
          return createResponse(200, db.totalAmounts[idx], config);
        }
        if (method === "delete") {
          db.totalAmounts = db.totalAmounts.filter((t) => t.id !== id && t._id !== id);
          saveDb(db);
          return createResponse(200, { message: "Total amount deleted" }, config);
        }
      }

      if (method === "get") {
        let list = [...db.totalAmounts];
        if (params.branch || params.branchName) {
          const b = params.branch || params.branchName;
          list = list.filter((t) => t.branchName === b || t.branch === b);
        }
        if (params.date) {
          list = list.filter((t) => t.date === params.date || t.date?.startsWith(params.date));
        }
        return createResponse(200, list, config);
      }

      if (method === "post") {
        const newTotal = {
          _id: generateId("tot"),
          id: generateId("tot"),
          status: "submitted",
          createdAt: new Date().toISOString(),
          ...body
        };
        db.totalAmounts.push(newTotal);
        saveDb(db);
        return createResponse(201, newTotal, config);
      }
    }

    // ----------------------------------------------------
    // Payments & Customers
    // ----------------------------------------------------
    if (path.startsWith("/payments")) {
      const idMatch = path.match(/^\/payments\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        if (method === "get") {
          const pay = db.payments.find((p) => p.id === id || p._id === id);
          return pay ? createResponse(200, pay, config) : createErrorResponse(404, "Payment not found", config);
        }
        if (method === "put" || method === "patch") {
          const idx = db.payments.findIndex((p) => p.id === id || p._id === id);
          if (idx === -1) return createErrorResponse(404, "Payment not found", config);
          db.payments[idx] = { ...db.payments[idx], ...body, updatedAt: new Date().toISOString() };
          saveDb(db);
          return createResponse(200, db.payments[idx], config);
        }
        if (method === "delete") {
          db.payments = db.payments.filter((p) => p.id !== id && p._id !== id);
          saveDb(db);
          return createResponse(200, { message: "Payment deleted" }, config);
        }
      }

      if (method === "get") {
        let list = [...db.payments];
        if (params.branch || params.branchName) {
          const b = params.branch || params.branchName;
          list = list.filter((p) => p.branchName === b || p.branch === b);
        }
        if (params.date) {
          list = list.filter((p) => p.date === params.date || p.date?.startsWith(params.date));
        }
        if (params.status) {
          list = list.filter((p) => p.status === params.status);
        }
        return createResponse(200, list, config);
      }

      if (method === "post") {
        const newPay = {
          _id: generateId("pay"),
          id: generateId("pay"),
          date: new Date().toISOString().split("T")[0],
          createdAt: new Date().toISOString(),
          ...body
        };
        db.payments.push(newPay);
        saveDb(db);
        return createResponse(201, newPay, config);
      }
    }

    // ----------------------------------------------------
    // Past Date Requests
    // ----------------------------------------------------
    if (path.startsWith("/past-date-requests")) {
      const idMatch = path.match(/^\/past-date-requests\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        if (method === "get") {
          const req = db.pastDateRequests.find((p) => p.id === id || p._id === id);
          return req ? createResponse(200, req, config) : createErrorResponse(404, "Request not found", config);
        }
        if (method === "put" || method === "patch") {
          const idx = db.pastDateRequests.findIndex((p) => p.id === id || p._id === id);
          if (idx === -1) return createErrorResponse(404, "Request not found", config);
          db.pastDateRequests[idx] = { ...db.pastDateRequests[idx], ...body, updatedAt: new Date().toISOString() };
          saveDb(db);
          return createResponse(200, db.pastDateRequests[idx], config);
        }
        if (method === "delete") {
          db.pastDateRequests = db.pastDateRequests.filter((p) => p.id !== id && p._id !== id);
          saveDb(db);
          return createResponse(200, { message: "Past date request deleted" }, config);
        }
      }

      if (method === "get") {
        let list = [...db.pastDateRequests];
        if (params.requestedBranch || params.branchName || params.branch) {
          const b = params.requestedBranch || params.branchName || params.branch;
          list = list.filter((p) => p.requestedBranch === b || p.branchName === b);
        }
        if (params.status) {
          list = list.filter((p) => p.status === params.status);
        }
        return createResponse(200, list, config);
      }

      if (method === "post") {
        const newPdr = {
          _id: generateId("pdr"),
          id: generateId("pdr"),
          status: "pending",
          createdAt: new Date().toISOString(),
          ...body
        };
        db.pastDateRequests.push(newPdr);
        saveDb(db);
        return createResponse(201, newPdr, config);
      }
    }

    // ----------------------------------------------------
    // Finalized Dates
    // ----------------------------------------------------
    if (path.startsWith("/general/finalized-dates") || path.startsWith("/finalized-dates")) {
      if (method === "get") {
        let list = [...(db.finalizedDates || [])];
        if (params.branch || params.branchName) {
          const b = params.branch || params.branchName;
          list = list.filter((f) => f.branchName === b || f.branch === b);
        }
        return createResponse(200, list, config);
      }
      if (method === "post") {
        const newFin = {
          _id: generateId("fin"),
          id: generateId("fin"),
          finalized: true,
          finalizedAt: new Date().toISOString(),
          ...body
        };
        db.finalizedDates = db.finalizedDates || [];
        db.finalizedDates.push(newFin);
        saveDb(db);
        return createResponse(201, newFin, config);
      }
    }

    // ----------------------------------------------------
    // Sales / General Transactions
    // ----------------------------------------------------
    if (path.startsWith("/general/sales") || path.startsWith("/sales")) {
      if (method === "get") {
        return createResponse(200, db.sales || [], config);
      }
      if (method === "post") {
        const newSale = {
          _id: generateId("sale"),
          id: generateId("sale"),
          date: new Date().toISOString().split("T")[0],
          createdAt: new Date().toISOString(),
          ...body
        };
        db.sales = db.sales || [];
        db.sales.push(newSale);
        saveDb(db);
        return createResponse(201, newSale, config);
      }
    }

    // ----------------------------------------------------
    // Branch QR Session / Validation
    // ----------------------------------------------------
    if (path.startsWith("/branches/qr-session") || path.startsWith("/branches/verify-qr")) {
      const match = path.match(/\/(?:qr-session|verify-qr)\/([^\/]+)$/);
      const branchIdentifier = match ? match[1] : (params.branch || params.branchCode || params.branchId);
      const branch = (db.branches || []).find(
        (b) => b.code?.toLowerCase() === branchIdentifier?.toLowerCase() ||
               b.id === branchIdentifier ||
               b._id === branchIdentifier ||
               b.name?.toLowerCase() === branchIdentifier?.toLowerCase() ||
               b.branchName?.toLowerCase() === branchIdentifier?.toLowerCase()
      );
      if (!branch) {
        return createErrorResponse(404, "Invalid or expired branch QR link", config);
      }
      return createResponse(200, {
        valid: true,
        branch: {
          id: branch._id || branch.id,
          code: branch.code,
          name: branch.name || branch.branchName,
          address: branch.address,
          phone: branch.phone
        }
      }, config);
    }

    // ----------------------------------------------------
    // Customers (PrintZ V3 Customer Management Foundation)
    // ----------------------------------------------------
    if (path.startsWith("/customers") || path.startsWith("/api/customers")) {
      // Search endpoint: GET /api/customers/search?q=...
      if (path.includes("/search")) {
        const query = (params.q || params.search || params.query || "").trim().toLowerCase();
        const branchFilter = params.branch || params.branchName || params.branchId;
        
        let list = [...(db.customers || [])];

        if (query) {
          list = list.filter((c) => {
            const name = (c.name || "").toLowerCase();
            const contactPerson = (c.contactPerson || "").toLowerCase();
            const mobile = (c.mobile || "").replace(/\D/g, "");
            const code = (c.customerCode || c.id || c.customerId || "").toLowerCase();
            const company = (c.companyName || "").toLowerCase();
            const email = (c.email || "").toLowerCase();
            const gst = (c.gstNumber || "").toLowerCase();
            const cleanQuery = query.replace(/\D/g, "");

            return (
              name.includes(query) ||
              contactPerson.includes(query) ||
              (cleanQuery.length > 0 && mobile.includes(cleanQuery)) ||
              mobile.includes(query) ||
              code.includes(query) ||
              company.includes(query) ||
              email.includes(query) ||
              gst.includes(query)
            );
          });
        }

        // If branch filter is supplied, optionally sort matching branch results first
        if (branchFilter && branchFilter !== "All Branches") {
          list.sort((a, b) => {
            const aMatch = a.branchName === branchFilter || a.branch === branchFilter ? -1 : 1;
            const bMatch = b.branchName === branchFilter || b.branch === branchFilter ? -1 : 1;
            return aMatch - bMatch;
          });
        }

        return createResponse(200, {
          success: true,
          count: list.length,
          customers: list
        }, config);
      }

      // Customer by ID: GET / PATCH / PUT / DELETE /customers/:id
      const idMatch = path.match(/\/(?:api\/)?customers\/([^\/]+)$/);
      if (idMatch && idMatch[1] !== "search" && idMatch[1] !== "new") {
        const id = idMatch[1];
        if (method === "get") {
          const cus = (db.customers || []).find(
            (c) => c.id === id || c._id === id || c.customerId === id || c.customerCode === id
          );
          if (!cus) return createErrorResponse(404, "Customer not found", config);
          return createResponse(200, { success: true, customer: cus }, config);
        }
        if (method === "patch" || method === "put") {
          const idx = (db.customers || []).findIndex(
            (c) => c.id === id || c._id === id || c.customerId === id || c.customerCode === id
          );
          if (idx === -1) return createErrorResponse(404, "Customer not found", config);
          db.customers[idx] = {
            ...db.customers[idx],
            ...body,
            updatedAt: new Date().toISOString()
          };
          saveDb(db);
          return createResponse(200, { success: true, customer: db.customers[idx] }, config);
        }
        if (method === "delete") {
          db.customers = (db.customers || []).filter(
            (c) => c.id !== id && c._id !== id && c.customerId !== id && c.customerCode !== id
          );
          saveDb(db);
          return createResponse(200, { success: true, message: "Customer deleted successfully" }, config);
        }
      }

      // Customer List: GET /api/customers
      if (method === "get") {
        let list = [...(db.customers || [])];
        const branchFilter = params.branch || params.branchName || params.branchId;
        if (branchFilter && branchFilter !== "All Branches") {
          list = list.filter((c) =>
            c.branchName === branchFilter ||
            c.branchId === branchFilter ||
            c.branch === branchFilter
          );
        }
        if (params.customerType) {
          list = list.filter((c) => c.customerType?.toUpperCase() === params.customerType.toUpperCase());
        }
        if (params.source) {
          list = list.filter((c) => c.source?.toUpperCase() === params.source.toUpperCase());
        }
        if (params.mobile) {
          list = list.filter((c) => c.mobile === params.mobile);
        }
        if (params.isActive !== undefined) {
          const active = params.isActive === "true" || params.isActive === true;
          list = list.filter((c) => c.isActive === active);
        }
        return createResponse(200, {
          success: true,
          count: list.length,
          customers: list
        }, config);
      }

      // Customer Create: POST /api/customers
      if (method === "post") {
        const { name, mobile, email, companyName, gstNumber, address, city, state, pincode, customerType, source, branchId, branchName, allowDuplicate } = body || {};

        if (!name || !name.trim()) {
          return createErrorResponse(400, "Customer name is required", config);
        }
        if (!mobile || !mobile.trim() || !/^\d{10}$/.test(mobile.trim().replace(/\D/g, ""))) {
          return createErrorResponse(400, "Valid 10-digit mobile number is required", config);
        }

        const normalizedMobile = mobile.trim().replace(/\D/g, "");

        // Duplicate check if not explicitly confirmed
        const existing = (db.customers || []).find((c) => c.mobile === normalizedMobile);
        if (existing && !allowDuplicate) {
          return createErrorResponse(409, "Customer already exists with this mobile number", config);
        }

        // Generate unique customer code CUS-000XXX
        db.customers = db.customers || [];
        const nextNum = db.customers.length + 184;
        const codePadding = String(nextNum).padStart(6, "0");
        const customerCode = (body && body.customerCode) ? body.customerCode : `CUS-${codePadding}`;
        const newId = generateId("cus");

        const newCustomer = {
          _id: newId,
          id: newId,
          customerId: newId,
          customerCode,
          name: name.trim(),
          contactPerson: name.trim(),
          mobile: normalizedMobile,
          email: (email || "").trim(),
          companyName: (companyName || "").trim(),
          gstNumber: (gstNumber || "").trim().toUpperCase(),
          address: (address || "").trim(),
          city: (city || "Bengaluru").trim(),
          state: (state || "Karnataka").trim(),
          pincode: (pincode || "").trim(),
          customerType: customerType || "INDIVIDUAL",
          source: source || "WALK_IN",
          branchId: branchId || "64f1a2b3c4d5e6f7a8b90001",
          branchName: branchName || "Banaswadi",
          whatsAppOptIn: true,
          status: "Active",
          isActive: true,
          jobOrdersCount: 0,
          saleReceiptsCount: 0,
          totalBilled: 0,
          balanceDue: 0,
          avgRating: 5.0,
          createdBy: body.createdBy || "Branch Manager",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        db.customers.unshift(newCustomer);
        saveDb(db);

        return createResponse(201, {
          success: true,
          customer: newCustomer,
          message: "Customer created successfully"
        }, config);
      }
    }

    // ----------------------------------------------------
    // 9. V3 PRINT JOBS & REQUIREMENTS ENDPOINTS (Step 2)
    // ----------------------------------------------------
    if (path.startsWith("/jobs") || path.startsWith("/job-orders") || path.startsWith("/api/jobs") || path.startsWith("/api/job-orders")) {
      db.jobs = db.jobs || [];

      // Estimate Confirm / Approve: POST /job-orders/:id/estimate/confirm or /approve
      const estConfirmMatch = path.match(/\/(?:api\/)?(?:job-orders|jobs)\/([^\/]+)\/estimate\/(?:confirm|approve)$/);
      if (estConfirmMatch && method === "post") {
        const jobId = estConfirmMatch[1];
        const jobIdx = db.jobs.findIndex(
          (j) => j.id === jobId || j._id === jobId || j.jobId === jobId || j.jobNo === jobId
        );
        if (jobIdx === -1) return createErrorResponse(404, `Job order ${jobId} not found`, config);
        const targetJob = db.jobs[jobIdx];
        targetJob.estimationStatus = "APPROVED";
        targetJob.currentStage = "DESIGN_QUEUE";
        targetJob.status = "CONFIRMED";
        targetJob.advancePaid = true;
        targetJob.updatedAt = new Date().toISOString();
        db.jobs[jobIdx] = targetJob;
        saveDb(db);
        return createResponse(200, { success: true, message: "Estimate confirmed successfully", data: targetJob, job: targetJob }, config);
      }

      // Estimate Reject: POST /job-orders/:id/estimate/reject
      const estRejectMatch = path.match(/\/(?:api\/)?(?:job-orders|jobs)\/([^\/]+)\/estimate\/reject$/);
      if (estRejectMatch && method === "post") {
        const jobId = estRejectMatch[1];
        const jobIdx = db.jobs.findIndex(
          (j) => j.id === jobId || j._id === jobId || j.jobId === jobId || j.jobNo === jobId
        );
        if (jobIdx === -1) return createErrorResponse(404, `Job order ${jobId} not found`, config);
        const targetJob = db.jobs[jobIdx];
        targetJob.estimationStatus = "REJECTED";
        targetJob.status = "ESTIMATE_REJECTED";
        targetJob.rejectionReason = body?.reason || "Customer requested revision";
        targetJob.updatedAt = new Date().toISOString();
        db.jobs[jobIdx] = targetJob;
        saveDb(db);
        return createResponse(200, { success: true, message: "Estimate rejected", data: targetJob, job: targetJob }, config);
      }

      // Calculate Estimate: POST /job-orders/:id/estimate
      const estCreateMatch = path.match(/\/(?:api\/)?(?:job-orders|jobs)\/([^\/]+)\/estimate$/);
      if (estCreateMatch && method === "post") {
        const jobId = estCreateMatch[1];
        const jobIdx = db.jobs.findIndex(
          (j) => j.id === jobId || j._id === jobId || j.jobId === jobId || j.jobNo === jobId
        );
        if (jobIdx === -1) return createErrorResponse(404, `Job order ${jobId} not found`, config);
        const targetJob = db.jobs[jobIdx];
        const items = body?.items || targetJob.items || [];
        const discountAmount = Number(body?.discountAmount || 0);
        let subtotal = 0;
        let taxAmount = 0;
        const mappedItems = (targetJob.items || []).map((it, idx) => {
          const matchedPricing = (items || []).find((p) => p.lineNo === (it.lineNo || idx + 1)) || items[idx] || {};
          const unitRate = Number(matchedPricing.unitRate || matchedPricing.unitPrice || it.unitPrice || 10);
          const taxRate = Number(matchedPricing.taxRate || 18);
          const qty = Number(it.quantity || 1);
          const lineSubtotal = qty * unitRate;
          const lineTax = (lineSubtotal * taxRate) / 100;
          subtotal += lineSubtotal;
          taxAmount += lineTax;
          return {
            ...it,
            unitRate,
            unitPrice: unitRate,
            taxRate,
            amount: lineSubtotal + lineTax
          };
        });
        const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);
        targetJob.items = mappedItems;
        targetJob.subtotal = subtotal;
        targetJob.discountAmount = discountAmount;
        targetJob.taxAmount = taxAmount;
        targetJob.grandTotal = grandTotal;
        targetJob.estimatedPrice = grandTotal;
        targetJob.estimationStatus = "CALCULATED";
        targetJob.currentStage = "ESTIMATE_APPROVAL";
        targetJob.updatedAt = new Date().toISOString();
        db.jobs[jobIdx] = targetJob;
        saveDb(db);
        return createResponse(200, { success: true, message: "Estimate calculated", data: targetJob, job: targetJob }, config);
      }

      // Workflow events: GET /job-orders/:id/workflow-events
      const eventsMatch = path.match(/\/(?:api\/)?(?:job-orders|jobs)\/([^\/]+)\/workflow-events$/);
      if (eventsMatch && method === "get") {
        const jobId = eventsMatch[1];
        const targetJob = db.jobs.find(
          (j) => j.id === jobId || j._id === jobId || j.jobId === jobId || j.jobNo === jobId
        );
        const events = [
          { event: "ORDER_CREATED", stage: "ENQUIRY", timestamp: targetJob?.createdAt || new Date().toISOString(), user: "Front Desk" },
          { event: "ESTIMATE_GENERATED", stage: "ESTIMATION", timestamp: targetJob?.updatedAt || new Date().toISOString(), user: "Commercial Desk" }
        ];
        return createResponse(200, { success: true, data: events }, config);
      }

      // Job Attachments: POST /job-orders/:id/attachments
      const attMatch = path.match(/\/(?:api\/)?(?:job-orders|jobs)\/([^\/]+)\/attachments$/);
      if (attMatch && method === "post") {
        const jobId = attMatch[1];
        const jobIdx = db.jobs.findIndex(
          (j) => j.id === jobId || j._id === jobId || j.jobId === jobId || j.jobNo === jobId
        );
        if (jobIdx === -1) return createErrorResponse(404, `Job order ${jobId} not found`, config);
        const targetJob = db.jobs[jobIdx];
        targetJob.attachments = targetJob.attachments || [];
        const newAtt = {
          id: generateId("att"),
          name: body?.name || "Customer Artwork",
          url: body?.url || "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80",
          uploadedAt: new Date().toISOString()
        };
        targetJob.attachments.push(newAtt);
        db.jobs[jobIdx] = targetJob;
        saveDb(db);
        return createResponse(200, { success: true, data: targetJob.attachments, job: targetJob }, config);
      }

      // Proof Samples: POST /job-orders/:id/samples
      const sampleMatch = path.match(/\/(?:api\/)?(?:job-orders|jobs)\/([^\/]+)\/samples$/);
      if (sampleMatch && method === "post") {
        const jobId = sampleMatch[1];
        const jobIdx = db.jobs.findIndex(
          (j) => j.id === jobId || j._id === jobId || j.jobId === jobId || j.jobNo === jobId
        );
        if (jobIdx === -1) return createErrorResponse(404, `Job order ${jobId} not found`, config);
        const targetJob = db.jobs[jobIdx];
        targetJob.samples = targetJob.samples || [];
        const newSample = {
          sampleId: generateId("smp"),
          version: `V${targetJob.samples.length + 1}`,
          fileUrl: body?.fileUrl || "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80",
          notes: body?.notes || "",
          status: "PENDING_APPROVAL",
          createdAt: new Date().toISOString()
        };
        targetJob.samples.push(newSample);
        targetJob.currentStage = "SAMPLE_APPROVAL";
        db.jobs[jobIdx] = targetJob;
        saveDb(db);
        return createResponse(201, { success: true, data: newSample, job: targetJob }, config);
      }

      // Assign Designer: POST /job-orders/:id/assign-designer
      const assignMatch = path.match(/\/(?:api\/)?(?:job-orders|jobs)\/([^\/]+)\/assign-designer$/);
      if (assignMatch && method === "post") {
        const jobId = assignMatch[1];
        const jobIdx = db.jobs.findIndex(
          (j) => j.id === jobId || j._id === jobId || j.jobId === jobId || j.jobNo === jobId
        );
        if (jobIdx === -1) return createErrorResponse(404, `Job order ${jobId} not found`, config);
        const targetJob = db.jobs[jobIdx];
        targetJob.assignedDesignerId = body?.designerId || "usr_002";
        targetJob.assignedDesignerName = body?.designerName || "Kavya Ramesh";
        targetJob.currentStage = "DESIGN_ASSIGNED";
        db.jobs[jobIdx] = targetJob;
        saveDb(db);
        return createResponse(200, { success: true, data: targetJob, job: targetJob }, config);
      }

      // Single Job: GET / PATCH / DELETE /job-orders/:id or /jobs/:id
      const jobIdMatch = path.match(/\/(?:api\/)?(?:job-orders|jobs)\/([^\/]+)(?:\/items(?:\/([^\/]+))?)?$/);

      if (jobIdMatch && jobIdMatch[1] && jobIdMatch[1] !== "search" && jobIdMatch[1] !== "new") {
        const jobId = jobIdMatch[1];
        const itemId = jobIdMatch[2];

        // Job Item specific sub-endpoints: /job-orders/:id/items or /job-orders/:id/items/:itemId
        if (path.includes("/items")) {
          const jobIdx = db.jobs.findIndex(
            (j) => j.id === jobId || j._id === jobId || j.jobId === jobId || j.jobNo === jobId
          );
          if (jobIdx === -1) return createErrorResponse(404, "Job order not found", config);

          const targetJob = db.jobs[jobIdx];
          targetJob.items = targetJob.items || [];

          if (method === "post") {
            const newItem = {
              jobItemId: generateId("item"),
              jobId: targetJob.jobId || targetJob.id,
              status: "REQUIREMENT_CAPTURED",
              createdAt: new Date().toISOString(),
              ...body
            };
            targetJob.items.push(newItem);
            targetJob.itemCount = targetJob.items.length;
            targetJob.totalQuantity = targetJob.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
            targetJob.updatedAt = new Date().toISOString();
            db.jobs[jobIdx] = targetJob;
            saveDb(db);
            return createResponse(201, { success: true, item: newItem, job: targetJob, data: newItem }, config);
          }

          if (itemId) {
            const itemIdx = targetJob.items.findIndex((it) => it.jobItemId === itemId || it.id === itemId);
            if (itemIdx === -1) return createErrorResponse(404, "Job item not found", config);

            if (method === "patch" || method === "put") {
              targetJob.items[itemIdx] = { ...targetJob.items[itemIdx], ...body, updatedAt: new Date().toISOString() };
              targetJob.totalQuantity = targetJob.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
              targetJob.updatedAt = new Date().toISOString();
              db.jobs[jobIdx] = targetJob;
              saveDb(db);
              return createResponse(200, { success: true, item: targetJob.items[itemIdx], job: targetJob, data: targetJob.items[itemIdx] }, config);
            }

            if (method === "delete") {
              targetJob.items = targetJob.items.filter((it) => it.jobItemId !== itemId && it.id !== itemId);
              targetJob.itemCount = targetJob.items.length;
              targetJob.totalQuantity = targetJob.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
              targetJob.updatedAt = new Date().toISOString();
              db.jobs[jobIdx] = targetJob;
              saveDb(db);
              return createResponse(200, { success: true, message: "Job item removed", job: targetJob }, config);
            }
          }
        }

        // Job Operations
        const job = db.jobs.find(
          (j) => j.id === jobId || j._id === jobId || j.jobId === jobId || j.jobNo === jobId
        );

        if (method === "get") {
          if (!job) return createErrorResponse(404, `Job order ${jobId} not found`, config);
          return createResponse(200, { success: true, data: job, job }, config);
        }

        if (method === "patch" || method === "put") {
          const idx = db.jobs.findIndex(
            (j) => j.id === jobId || j._id === jobId || j.jobId === jobId || j.jobNo === jobId
          );
          if (idx === -1) return createErrorResponse(404, `Job order ${jobId} not found`, config);

          db.jobs[idx] = {
            ...db.jobs[idx],
            ...body,
            updatedAt: new Date().toISOString()
          };
          saveDb(db);
          return createResponse(200, { success: true, data: db.jobs[idx], job: db.jobs[idx] }, config);
        }

        if (method === "delete") {
          db.jobs = db.jobs.filter(
            (j) => j.id !== jobId && j._id !== jobId && j.jobId !== jobId && j.jobNo !== jobId
          );
          saveDb(db);
          return createResponse(200, { success: true, message: "Job deleted successfully" }, config);
        }
      }

      // Jobs List: GET /api/jobs
      if (method === "get") {
        let list = [...(db.jobs || [])];
        const branchFilter = params.branch || params.branchName || params.branchId;

        if (branchFilter && branchFilter !== "All Branches") {
          list = list.filter((j) =>
            j.branchName === branchFilter ||
            j.branchId === branchFilter ||
            j.branch === branchFilter
          );
        }

        if (params.status && params.status !== "ALL") {
          list = list.filter((j) => j.status?.toUpperCase() === params.status.toUpperCase());
        }

        if (params.priority && params.priority !== "ALL") {
          list = list.filter((j) => j.priority?.toUpperCase() === params.priority.toUpperCase());
        }

        if (params.customerId) {
          list = list.filter((j) => j.customerId === params.customerId || j.customerCode === params.customerId);
        }

        if (params.customerCode) {
          list = list.filter((j) => j.customerCode === params.customerCode);
        }

        if (params.customerMobile) {
          list = list.filter((j) => j.customerMobile === params.customerMobile);
        }

        const q = (params.q || params.search || params.query || "").trim().toLowerCase();
        if (q) {
          list = list.filter((j) => {
            const no = (j.jobNo || "").toLowerCase();
            const title = (j.jobTitle || "").toLowerCase();
            const cus = (j.customerName || "").toLowerCase();
            const phone = (j.customerMobile || "").toLowerCase();
            return no.includes(q) || title.includes(q) || cus.includes(q) || phone.includes(q);
          });
        }

        return createResponse(200, {
          success: true,
          count: list.length,
          jobs: list
        }, config);
      }

      // Job Create: POST /api/jobs
      if (method === "post") {
        const {
          customerId,
          customerName,
          customerMobile,
          customerCode,
          customerCompany,
          jobTitle,
          priority,
          source,
          expectedDeliveryDate,
          notes,
          items,
          status,
          branchId,
          branchName
        } = body || {};

        if (!customerId) {
          return createErrorResponse(400, "Customer ID is required to create a Job", config);
        }

        // Verify customer exists in database
        const existingCustomer = (db.customers || []).find(
          (c) => c.id === customerId || c._id === customerId || c.customerId === customerId || c.customerCode === customerId
        );

        if (!existingCustomer && !customerName) {
          return createErrorResponse(404, "Selected customer was not found in the customer database", config);
        }

        const isDraft = status === "DRAFT";

        if (!isDraft && (!jobTitle || !jobTitle.trim())) {
          return createErrorResponse(400, "Job Title is required", config);
        }

        if (!isDraft && (!items || !Array.isArray(items) || items.length === 0)) {
          return createErrorResponse(400, "At least one Job Item with technical specifications is required", config);
        }

        // Generate authoritative human-readable Job Number: JOB-2026-00048
        const nextJobNum = (db.jobs || []).length + 48;
        const jobNoPadding = String(nextJobNum).padStart(5, "0");
        const jobNo = `JOB-2026-${jobNoPadding}`;
        const newJobId = generateId("job");

        const normalizedItems = (items || []).map((it, idx) => ({
          jobItemId: it.jobItemId || generateId("item"),
          jobId: newJobId,
          itemName: (it.itemName || "Custom Item").trim(),
          productType: it.productType || it.itemName || "Custom Print",
          quantity: Number(it.quantity) || 1,
          unit: it.unit || "PCS",
          size: it.size || { type: "PRESET", presetName: "A4", width: 210, height: 297, unit: "MM" },
          printing: it.printing || { side: "SINGLE_SIDE", colourMode: "COLOUR" },
          material: it.material || { paperType: "Art Card", gsm: 300 },
          finishing: Array.isArray(it.finishing) ? it.finishing : [],
          designRequired: Boolean(it.designRequired),
          designNotes: (it.designNotes || "").trim(),
          notes: (it.notes || "").trim(),
          status: isDraft ? "DRAFT" : "REQUIREMENT_CAPTURED"
        }));

        const totalQuantity = normalizedItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

        const newJob = {
          _id: newJobId,
          id: newJobId,
          jobId: newJobId,
          jobNo,
          customerId: existingCustomer?.id || customerId,
          customerCode: existingCustomer?.customerCode || customerCode || "",
          customerName: existingCustomer?.name || customerName || "",
          customerMobile: existingCustomer?.mobile || customerMobile || "",
          customerCompany: existingCustomer?.companyName || customerCompany || "",
          branchId: branchId || existingCustomer?.branchId || "64f1a2b3c4d5e6f7a8b90001",
          branchName: branchName || existingCustomer?.branchName || "Banaswadi",
          jobTitle: (jobTitle || "Untitled Job Order").trim(),
          priority: priority || "NORMAL",
          source: source || "WALK_IN",
          status: isDraft ? "DRAFT" : "REQUIREMENT_CAPTURED",
          expectedDeliveryDate: expectedDeliveryDate || null,
          notes: (notes || "").trim(),
          itemCount: normalizedItems.length,
          totalQuantity,
          items: normalizedItems,
          createdBy: body.createdBy || "Branch Manager",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Increment customer jobOrdersCount
        if (existingCustomer) {
          existingCustomer.jobOrdersCount = (existingCustomer.jobOrdersCount || 0) + 1;
        }

        db.jobs.unshift(newJob);
        saveDb(db);

        return createResponse(201, {
          success: true,
          job: newJob,
          message: isDraft ? "Draft job saved successfully" : "Job order created & requirements captured successfully"
        }, config);
      }
    }

    // ----------------------------------------------------
    // PrintZ V3 - Estimate / Quotation Routes (Step 3)
    // ----------------------------------------------------
    if (path.startsWith("/jobs/") && path.endsWith("/estimates")) {
      const parts = path.split("/");
      const jobId = parts[2];
      const list = (db.estimates || []).filter(
        (e) => e.jobId === jobId || e.jobNo === jobId
      );
      return createResponse(200, {
        success: true,
        count: list.length,
        estimates: list
      }, config);
    }

    if (path === "/estimates" || path.startsWith("/estimates/")) {
      const parts = path.split("/");
      const estimateId = parts[2];
      const action = parts[3]; // "ready" | "send" | "revise"

      // 1. Get Single Estimate: GET /api/estimates/:id
      if (estimateId && method === "get") {
        const found = (db.estimates || []).find(
          (e) =>
            e.id === estimateId ||
            e._id === estimateId ||
            e.estimateId === estimateId ||
            e.estimateNo?.toLowerCase() === estimateId.toLowerCase()
        );
        if (!found) {
          return createErrorResponse(404, `Estimate ${estimateId} not found`, config);
        }
        return createResponse(200, { success: true, estimate: found }, config);
      }

      // 2. List Estimates: GET /api/estimates
      if (!estimateId && method === "get") {
        let list = [...(db.estimates || [])];

        if (params.jobId) {
          list = list.filter((e) => e.jobId === params.jobId || e.jobNo === params.jobId);
        }
        if (params.customerId) {
          list = list.filter((e) => e.customerId === params.customerId || e.customerCode === params.customerId);
        }
        if (params.status && params.status !== "ALL") {
          list = list.filter((e) => e.status === params.status);
        }
        if (params.branchId) {
          list = list.filter((e) => e.branchId === params.branchId);
        }
        if (params.search) {
          const q = params.search.toLowerCase().trim();
          list = list.filter((e) => {
            const num = (e.estimateNo || "").toLowerCase();
            const jNum = (e.jobNo || "").toLowerCase();
            const cName = (e.customerName || "").toLowerCase();
            const phone = (e.customerMobile || "").toLowerCase();
            const title = (e.jobTitle || "").toLowerCase();
            return num.includes(q) || jNum.includes(q) || cName.includes(q) || phone.includes(q) || title.includes(q);
          });
        }

        return createResponse(200, {
          success: true,
          count: list.length,
          estimates: list
        }, config);
      }

      // Calculation helper for backend
      const calculateAuthoritativeTotals = (items = [], discount = {}, tax = {}, deliveryCharge = 0) => {
        let subtotal = 0;
        const normalizedItems = (items || []).map((it) => {
          let itemSubtotal = 0;
          const lines = (it.lines || []).map((line, lIdx) => {
            const q = Math.max(0, Number(line.quantity) || 0);
            const r = Math.max(0, Number(line.rate) || 0);
            const amount = Math.round(((q * r) + Number.EPSILON) * 100) / 100;
            itemSubtotal += amount;
            return {
              lineId: line.lineId || `line_${Date.now()}_${lIdx}`,
              description: (line.description || "").trim() || "Charge Item",
              category: line.category || "OTHER",
              quantity: q,
              unit: line.unit || "PCS",
              rate: r,
              amount,
              notes: (line.notes || "").trim()
            };
          });
          subtotal += itemSubtotal;
          return {
            jobItemId: it.jobItemId || `item_${Date.now()}`,
            itemName: it.itemName || "Item",
            productType: it.productType || it.itemName || "Custom Print",
            quantity: Number(it.quantity) || 1,
            unit: it.unit || "PCS",
            lines
          };
        });

        subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

        // Discount
        let discountAmount = 0;
        const discountType = discount?.type || "PERCENTAGE";
        const discountVal = Math.max(0, Number(discount?.value || discount?.amount || 0));
        if (discountType === "PERCENTAGE") {
          const pct = Math.min(100, discountVal);
          discountAmount = Math.round((((subtotal * pct) / 100) + Number.EPSILON) * 100) / 100;
        } else {
          discountAmount = Math.round((Math.min(subtotal, discountVal) + Number.EPSILON) * 100) / 100;
        }

        const delivery = Math.round(((Math.max(0, Number(deliveryCharge) || 0)) + Number.EPSILON) * 100) / 100;
        const taxableAmount = Math.round(((Math.max(0, subtotal - discountAmount + delivery)) + Number.EPSILON) * 100) / 100;

        const taxRate = Math.max(0, Number(tax?.rate ?? 18));
        const taxType = tax?.type || "GST";
        const totalTaxAmount = Math.round((((taxableAmount * taxRate) / 100) + Number.EPSILON) * 100) / 100;

        const cgstRate = taxType === "GST" ? taxRate / 2 : 0;
        const sgstRate = taxType === "GST" ? taxRate / 2 : 0;
        const cgstAmount = taxType === "GST" ? Math.round(((totalTaxAmount / 2) + Number.EPSILON) * 100) / 100 : 0;
        const sgstAmount = taxType === "GST" ? Math.round(((totalTaxAmount - cgstAmount) + Number.EPSILON) * 100) / 100 : 0;

        const grandTotal = Math.round(((taxableAmount + totalTaxAmount) + Number.EPSILON) * 100) / 100;

        return {
          normalizedItems,
          subtotal,
          discount: { type: discountType, value: discountVal, amount: discountAmount },
          deliveryCharge: delivery,
          taxableAmount,
          tax: {
            type: taxType,
            rate: taxRate,
            cgstRate,
            sgstRate,
            cgstAmount,
            sgstAmount,
            igstRate: taxType === "IGST" ? taxRate : 0,
            igstAmount: taxType === "IGST" ? totalTaxAmount : 0,
            taxAmount: totalTaxAmount
          },
          grandTotal
        };
      };

      // 3. Create Estimate: POST /api/estimates
      if (!estimateId && method === "post") {
        const {
          jobId,
          customerId,
          items,
          discount,
          tax,
          deliveryCharge,
          validUntil,
          termsAndConditions,
          customerNotes,
          internalNotes,
          branchId,
          branchName,
          status = "DRAFT"
        } = body || {};

        if (!jobId) {
          return createErrorResponse(400, "Job ID is required to create an Estimate", config);
        }

        // Find linked Job
        const linkedJob = (db.jobs || []).find(
          (j) => j.id === jobId || j._id === jobId || j.jobId === jobId || j.jobNo === jobId
        );

        if (!linkedJob) {
          return createErrorResponse(404, `Job with ID ${jobId} not found`, config);
        }

        const calc = calculateAuthoritativeTotals(items, discount, tax, deliveryCharge);

        if (status !== "DRAFT" && calc.subtotal <= 0) {
          return createErrorResponse(400, "Estimate must have at least one valid pricing line with a positive amount", config);
        }

        // Generate authoritative estimate number: EST-2026-00004
        const nextEstNum = (db.estimates || []).length + 4;
        const estNoPadding = String(nextEstNum).padStart(5, "0");
        const estimateNo = `EST-2026-${estNoPadding}`;
        const newEstId = generateId("est");

        const newEstimate = {
          _id: newEstId,
          id: newEstId,
          estimateId: newEstId,
          estimateNo,
          version: "V1",
          versionNumber: 1,
          jobId: linkedJob.id || linkedJob.jobId,
          jobNo: linkedJob.jobNo,
          jobTitle: linkedJob.jobTitle,
          customerId: linkedJob.customerId,
          customerCode: linkedJob.customerCode,
          customerName: linkedJob.customerName,
          customerMobile: linkedJob.customerMobile,
          customerCompany: linkedJob.customerCompany,
          branchId: branchId || linkedJob.branchId || "64f1a2b3c4d5e6f7a8b90001",
          branchName: branchName || linkedJob.branchName || "Banaswadi",
          status: status || "DRAFT",
          currency: "INR",
          items: calc.normalizedItems,
          subtotal: calc.subtotal,
          discount: calc.discount,
          deliveryCharge: calc.deliveryCharge,
          taxableAmount: calc.taxableAmount,
          tax: calc.tax,
          grandTotal: calc.grandTotal,
          validUntil: validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          termsAndConditions: termsAndConditions || "1. 50% advance upon confirmation.\n2. Estimate valid for 7 days.\n3. Turnaround starts post-artwork approval.",
          customerNotes: (customerNotes || "").trim(),
          internalNotes: (internalNotes || "").trim(),
          sentAt: null,
          sentBy: null,
          timeline: [
            {
              event: "CREATED",
              status: status || "DRAFT",
              actor: body.createdBy || "Branch Manager",
              timestamp: new Date().toISOString(),
              notes: `Estimate created from Job ${linkedJob.jobNo}`
            }
          ],
          createdBy: body.createdBy || "Branch Manager",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Update Job status to ESTIMATE_PENDING if currently REQUIREMENT_CAPTURED
        if (linkedJob.status === "REQUIREMENT_CAPTURED") {
          linkedJob.status = "ESTIMATE_PENDING";
          linkedJob.estimateId = newEstId;
          linkedJob.estimateNo = estimateNo;
          linkedJob.estimatedAmount = calc.grandTotal;
        }

        if (!db.estimates) db.estimates = [];
        db.estimates.unshift(newEstimate);
        saveDb(db);

        return createResponse(201, {
          success: true,
          estimate: newEstimate,
          message: "Estimate created successfully"
        }, config);
      }

      // 4. Update Estimate: PATCH /api/estimates/:id
      if (estimateId && !action && method === "patch") {
        const estIdx = (db.estimates || []).findIndex(
          (e) => e.id === estimateId || e._id === estimateId || e.estimateId === estimateId
        );
        if (estIdx === -1) {
          return createErrorResponse(404, `Estimate ${estimateId} not found`, config);
        }

        const currentEst = db.estimates[estIdx];
        if (currentEst.status === "SENT") {
          return createErrorResponse(400, "Cannot directly edit an estimate that has already been SENT. Please create a revised version instead.", config);
        }

        const calc = calculateAuthoritativeTotals(
          body.items !== undefined ? body.items : currentEst.items,
          body.discount !== undefined ? body.discount : currentEst.discount,
          body.tax !== undefined ? body.tax : currentEst.tax,
          body.deliveryCharge !== undefined ? body.deliveryCharge : currentEst.deliveryCharge
        );

        const updatedEst = {
          ...currentEst,
          ...body,
          items: calc.normalizedItems,
          subtotal: calc.subtotal,
          discount: calc.discount,
          deliveryCharge: calc.deliveryCharge,
          taxableAmount: calc.taxableAmount,
          tax: calc.tax,
          grandTotal: calc.grandTotal,
          updatedAt: new Date().toISOString()
        };

        db.estimates[estIdx] = updatedEst;
        saveDb(db);

        return createResponse(200, {
          success: true,
          estimate: updatedEst,
          message: "Estimate updated successfully"
        }, config);
      }

      // 5. Mark as Ready: POST /api/estimates/:id/ready
      if (estimateId && action === "ready" && method === "post") {
        const estIdx = (db.estimates || []).findIndex(
          (e) => e.id === estimateId || e._id === estimateId || e.estimateId === estimateId
        );
        if (estIdx === -1) {
          return createErrorResponse(404, `Estimate ${estimateId} not found`, config);
        }

        const currentEst = db.estimates[estIdx];
        if (currentEst.grandTotal <= 0) {
          return createErrorResponse(400, "Cannot mark estimate ready with ₹0.00 total. Please add valid pricing lines.", config);
        }

        currentEst.status = "READY";
        currentEst.updatedAt = new Date().toISOString();
        if (!currentEst.timeline) currentEst.timeline = [];
        currentEst.timeline.push({
          event: "MARKED_READY",
          status: "READY",
          actor: body?.actor || "Branch Manager",
          timestamp: new Date().toISOString(),
          notes: "Pricing verified and marked ready for customer dispatch"
        });

        db.estimates[estIdx] = currentEst;
        saveDb(db);

        return createResponse(200, {
          success: true,
          estimate: currentEst,
          message: "Estimate marked as READY for customer dispatch"
        }, config);
      }

      // 6. Send to Customer: POST /api/estimates/:id/send
      if (estimateId && action === "send" && method === "post") {
        const estIdx = (db.estimates || []).findIndex(
          (e) => e.id === estimateId || e._id === estimateId || e.estimateId === estimateId
        );
        if (estIdx === -1) {
          return createErrorResponse(404, `Estimate ${estimateId} not found`, config);
        }

        const currentEst = db.estimates[estIdx];
        const channel = body?.channel || "WHATSAPP";
        const actor = body?.sentBy || "Branch Manager";

        currentEst.status = "SENT";
        currentEst.sentAt = new Date().toISOString();
        currentEst.sentBy = actor;
        currentEst.updatedAt = new Date().toISOString();

        if (!currentEst.timeline) currentEst.timeline = [];
        currentEst.timeline.push({
          event: "SENT",
          status: "SENT",
          actor,
          timestamp: new Date().toISOString(),
          notes: `Quotation dispatched to customer via ${channel} (${currentEst.customerMobile || "Direct"})`
        });

        db.estimates[estIdx] = currentEst;
        saveDb(db);

        return createResponse(200, {
          success: true,
          estimate: currentEst,
          message: `Estimate dispatched to customer via ${channel}`
        }, config);
      }

      // 7. Revise Estimate: POST /api/estimates/:id/revise
      if (estimateId && action === "revise" && method === "post") {
        const originalEst = (db.estimates || []).find(
          (e) => e.id === estimateId || e._id === estimateId || e.estimateId === estimateId
        );
        if (!originalEst) {
          return createErrorResponse(404, `Original estimate ${estimateId} not found`, config);
        }

        const nextVersionNum = (originalEst.versionNumber || 1) + 1;
        const newVersion = `V${nextVersionNum}`;
        const newEstId = generateId("est");
        const baseEstimateNo = originalEst.estimateNo.split("-V")[0];
        const newEstimateNo = `${baseEstimateNo}-${newVersion}`;

        const revisedEstimate = {
          ...JSON.parse(JSON.stringify(originalEst)),
          _id: newEstId,
          id: newEstId,
          estimateId: newEstId,
          estimateNo: newEstimateNo,
          version: newVersion,
          versionNumber: nextVersionNum,
          status: "DRAFT",
          previousVersionId: originalEst.id || originalEst._id,
          sentAt: null,
          sentBy: null,
          timeline: [
            {
              event: "REVISION_CREATED",
              status: "DRAFT",
              actor: body?.actor || "Branch Manager",
              timestamp: new Date().toISOString(),
              notes: `Revision ${newVersion} created from ${originalEst.version || "V1"}`
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        db.estimates.unshift(revisedEstimate);
        saveDb(db);

        return createResponse(201, {
          success: true,
          estimate: revisedEstimate,
          message: `Revised estimate ${newEstimateNo} created as Draft`
        }, config);
      }

      // 8. Delete Estimate: DELETE /api/estimates/:id
      if (estimateId && method === "delete") {
        const estIdx = (db.estimates || []).findIndex(
          (e) => e.id === estimateId || e._id === estimateId || e.estimateId === estimateId
        );
        if (estIdx === -1) {
          return createErrorResponse(404, `Estimate ${estimateId} not found`, config);
        }

        const est = db.estimates[estIdx];
        if (est.status === "SENT") {
          return createErrorResponse(400, "Cannot delete an estimate that has already been dispatched to customer.", config);
        }

        db.estimates.splice(estIdx, 1);
        saveDb(db);

        return createResponse(200, {
          success: true,
          message: `Estimate ${est.estimateNo} deleted successfully`
        }, config);
      }

      // 9. Estimate History: GET /api/estimates/:id/history
      if (estimateId && action === "history" && method === "get") {
        const found = (db.estimates || []).find(
          (e) => e.id === estimateId || e._id === estimateId || e.estimateId === estimateId || e.estimateNo === estimateId
        );
        if (!found) {
          return createErrorResponse(404, `Estimate ${estimateId} not found`, config);
        }

        const basePrefix = (found.estimateNo || "").split("-V")[0];
        const allVersions = (db.estimates || []).filter(
          (e) => (e.estimateNo && e.estimateNo.startsWith(basePrefix)) || e.jobId === found.jobId
        );

        return createResponse(200, {
          success: true,
          count: allVersions.length,
          history: allVersions
        }, config);
      }
    }

    // ----------------------------------------------------
    // PrintZ V3 - Customer Estimate Review & Decision (Step 4)
    // ----------------------------------------------------
    if (path.startsWith("/customer/estimates/") || path === "/customer/estimates") {
      const parts = path.split("/");
      const estimateId = parts[3];
      const action = parts[4]; // "accept" | "reject"

      // Helper to sanitize customer estimate (strips internal notes, costs, audit IDs)
      const sanitizeCustomerEstimate = (est) => {
        if (!est) return null;
        const today = new Date().toISOString().split("T")[0];
        const isExpired = est.validUntil ? est.validUntil < today : false;

        return {
          estimateId: est.id || est._id || est.estimateId,
          estimateNo: est.estimateNo,
          version: est.version || "V1",
          versionNumber: est.versionNumber || 1,
          status: isExpired && est.status === "SENT" ? "EXPIRED" : est.status,
          validUntil: est.validUntil,
          isExpired,
          currency: est.currency || "INR",
          customer: {
            name: est.customerName,
            mobile: est.customerMobile,
            code: est.customerCode,
            company: est.customerCompany || null
          },
          job: {
            jobId: est.jobId,
            jobNo: est.jobNo,
            jobTitle: est.jobTitle,
            expectedDeliveryDate: est.expectedDeliveryDate || null
          },
          branchName: est.branchName || "Banaswadi",
          items: (est.items || []).map((it) => ({
            itemName: it.itemName,
            productType: it.productType,
            quantity: it.quantity,
            unit: it.unit,
            lines: (it.lines || []).map((line) => ({
              description: line.description,
              category: line.category,
              quantity: line.quantity,
              unit: line.unit,
              rate: line.rate,
              amount: line.amount
            }))
          })),
          subtotal: est.subtotal,
          discount: est.discount,
          deliveryCharge: est.deliveryCharge || 0,
          taxableAmount: est.taxableAmount,
          tax: est.tax,
          grandTotal: est.grandTotal,
          termsAndConditions: est.termsAndConditions,
          customerNotes: est.customerNotes || null,
          createdAt: est.createdAt,
          sentAt: est.sentAt,
          approvedAt: est.approvedAt || null,
          approvedBy: est.approvedBy || null,
          approvalMethod: est.approvalMethod || null,
          rejectedAt: est.rejectedAt || null,
          rejectionReasonCode: est.rejectionReasonCode || null,
          rejectionReason: est.rejectionReason || null,
          customerComments: est.customerComments || null
        };
      };

      // 1. Fetch Customer Estimate: GET /api/customer/estimates/:id
      if (estimateId && !action && method === "get") {
        const found = (db.estimates || []).find(
          (e) =>
            e.id === estimateId ||
            e._id === estimateId ||
            e.estimateId === estimateId ||
            e.estimateNo?.toLowerCase() === estimateId.toLowerCase()
        );

        if (!found) {
          return createErrorResponse(404, "The requested quotation was not found. Please verify the quotation link or contact PrintZ support.", config);
        }

        return createResponse(200, {
          success: true,
          estimate: sanitizeCustomerEstimate(found)
        }, config);
      }

      // 2. Customer Accept Estimate: POST /api/customer/estimates/:id/accept
      if (estimateId && action === "accept" && method === "post") {
        const estIdx = (db.estimates || []).findIndex(
          (e) =>
            e.id === estimateId ||
            e._id === estimateId ||
            e.estimateId === estimateId ||
            e.estimateNo?.toLowerCase() === estimateId.toLowerCase()
        );

        if (estIdx === -1) {
          return createErrorResponse(404, "Estimate not found.", config);
        }

        const currentEst = db.estimates[estIdx];

        // State Transition Validation
        if (currentEst.status === "ACCEPTED") {
          return createErrorResponse(400, "This estimate has already been accepted.", config);
        }

        if (currentEst.status === "REJECTED") {
          return createErrorResponse(400, "This estimate was previously rejected. Please request a new revision from PrintZ.", config);
        }

        const today = new Date().toISOString().split("T")[0];
        if (currentEst.validUntil && currentEst.validUntil < today) {
          return createErrorResponse(400, "This quotation has expired. Please contact PrintZ to request a revised estimate.", config);
        }

        // Accept the estimate
        const approvedAt = new Date().toISOString();
        currentEst.status = "ACCEPTED";
        currentEst.approvedAt = approvedAt;
        currentEst.approvedBy = body?.actor || "Customer";
        currentEst.approvalMethod = body?.approvalMethod || "CUSTOMER_PORTAL";
        currentEst.updatedAt = approvedAt;

        if (!currentEst.timeline) currentEst.timeline = [];
        currentEst.timeline.push({
          event: "ESTIMATE_ACCEPTED",
          status: "ACCEPTED",
          actor: "Customer (Online Approval)",
          timestamp: approvedAt,
          notes: "Customer confirmed and accepted commercial quotation."
        });

        // Update linked Job Order status to ESTIMATE_ACCEPTED and evaluate design requirements
        const linkedJob = (db.jobs || []).find(
          (j) => j.id === currentEst.jobId || j._id === currentEst.jobId || j.jobId === currentEst.jobId || j.jobNo === currentEst.jobNo
        );

        if (linkedJob) {
          linkedJob.status = "ESTIMATE_ACCEPTED";
          linkedJob.estimatedAmount = currentEst.grandTotal;
          linkedJob.updatedAt = approvedAt;

          if (!linkedJob.timeline) linkedJob.timeline = [];
          linkedJob.timeline.push({
            event: "ESTIMATE_ACCEPTED",
            status: "ESTIMATE_ACCEPTED",
            actor: "Customer (Online Approval)",
            timestamp: approvedAt,
            notes: `Commercial quotation ${currentEst.estimateNo} confirmed for ₹${currentEst.grandTotal}`
          });

          // Check Job Items for designRequired = true (Step 5 Design Assignment Logic)
          if (!db.designAssignments) db.designAssignments = [];
          let hasDesignItems = false;

          (linkedJob.items || []).forEach((item, itmIdx) => {
            if (item.designRequired) {
              hasDesignItems = true;
              item.status = "DESIGN_PENDING";

              // Idempotent check: Ensure assignment doesn't already exist for this (jobId, jobItemId)
              const existingDes = db.designAssignments.find(
                (d) => d.jobId === (linkedJob.id || linkedJob.jobId) && d.jobItemId === (item.jobItemId || `item_${itmIdx}`)
              );

              if (!existingDes) {
                const nextDesNum = (db.designAssignments || []).length + 1;
                const desNoPadding = String(nextDesNum).padStart(5, "0");
                const assignmentNo = `DES-2026-${desNoPadding}`;
                const newDesId = generateId("des");

                const newAssignment = {
                  _id: newDesId,
                  id: newDesId,
                  assignmentId: newDesId,
                  assignmentNo,
                  jobId: linkedJob.id || linkedJob.jobId,
                  jobNo: linkedJob.jobNo,
                  jobItemId: item.jobItemId || `item_${itmIdx}`,
                  itemName: item.itemName,
                  productType: item.productType,
                  customerCode: linkedJob.customerCode,
                  customerName: linkedJob.customerName,
                  customerMobile: linkedJob.customerMobile,
                  customerCompany: linkedJob.customerCompany,
                  branchId: linkedJob.branchId || "64f1a2b3c4d5e6f7a8b90001",
                  branchName: linkedJob.branchName || "Banaswadi",
                  priority: linkedJob.priority || "NORMAL",
                  status: "PENDING_ASSIGNMENT",
                  dueDate: linkedJob.expectedDeliveryDate,
                  slaUrgency: "Due in 4h",
                  assignedDesignerId: null,
                  assignedDesignerName: null,
                  assignedDesignerCode: null,
                  assignedAt: null,
                  assignedBy: null,
                  startedAt: null,
                  startedBy: null,
                  completedAt: null,
                  requirementSnapshot: {
                    quantity: item.quantity,
                    unit: item.unit || "PCS",
                    size: item.size?.presetName || `${item.size?.width || ""} × ${item.size?.height || ""} ${item.size?.unit || ""}`,
                    width: item.size?.width,
                    height: item.size?.height,
                    sizeUnit: item.size?.unit,
                    paperType: item.material?.paperType,
                    gsm: item.material?.gsm,
                    paperSize: item.material?.paperSize,
                    side: item.printing?.side,
                    colourMode: item.printing?.colourMode,
                    finishing: item.finishing || [],
                    customerNotes: item.notes || linkedJob.notes || "",
                    designNotes: item.designNotes || "Standard design layout"
                  },
                  customerFiles: [],
                  designFiles: [],
                  proofs: [],
                  designerNotes: "",
                  internalNotes: "",
                  timeline: [
                    {
                      event: "ASSIGNMENT_CREATED",
                      status: "PENDING_ASSIGNMENT",
                      actor: "System Workflow (Estimate Accepted)",
                      timestamp: approvedAt,
                      notes: `Design assignment initiated for ${item.itemName} (${linkedJob.jobNo})`
                    }
                  ],
                  createdAt: approvedAt,
                  updatedAt: approvedAt
                };

                db.designAssignments.unshift(newAssignment);

                linkedJob.timeline.push({
                  event: "DESIGN_ASSIGNMENT_CREATED",
                  status: "DESIGN_PENDING",
                  actor: "System Workflow",
                  timestamp: approvedAt,
                  notes: `Design Assignment ${assignmentNo} created for ${item.itemName}`
                });
              }
            }
          });

          if (hasDesignItems) {
            linkedJob.status = "DESIGN_PENDING";
          }
        }

        db.estimates[estIdx] = currentEst;
        saveDb(db);

        return createResponse(200, {
          success: true,
          estimate: sanitizeCustomerEstimate(currentEst),
          message: "Estimate confirmed and accepted successfully! PrintZ team has been notified."
        }, config);
      }

      // 3. Customer Reject Estimate: POST /api/customer/estimates/:id/reject
      if (estimateId && action === "reject" && method === "post") {
        const estIdx = (db.estimates || []).findIndex(
          (e) =>
            e.id === estimateId ||
            e._id === estimateId ||
            e.estimateId === estimateId ||
            e.estimateNo?.toLowerCase() === estimateId.toLowerCase()
        );

        if (estIdx === -1) {
          return createErrorResponse(404, "Estimate not found.", config);
        }

        const currentEst = db.estimates[estIdx];

        if (currentEst.status === "ACCEPTED") {
          return createErrorResponse(400, "Cannot request changes on an already accepted estimate.", config);
        }

        if (currentEst.status === "REJECTED") {
          return createErrorResponse(400, "Revision has already been requested for this estimate.", config);
        }

        const { reasonCode = "OTHER", reason = "Price / Specification Change", comments = "" } = body || {};

        if (!comments && !reason) {
          return createErrorResponse(400, "Please provide the reason and comments for requesting changes.", config);
        }

        const rejectedAt = new Date().toISOString();
        currentEst.status = "REJECTED";
        currentEst.rejectedAt = rejectedAt;
        currentEst.rejectedBy = "Customer";
        currentEst.rejectionReasonCode = reasonCode;
        currentEst.rejectionReason = reason;
        currentEst.customerComments = comments;
        currentEst.updatedAt = rejectedAt;

        if (!currentEst.timeline) currentEst.timeline = [];
        currentEst.timeline.push({
          event: "ESTIMATE_REJECTED",
          status: "REJECTED",
          actor: "Customer (Revision Requested)",
          timestamp: rejectedAt,
          notes: `Customer requested revision: ${reason} (${comments})`
        });

        // Update linked Job Order status to ESTIMATE_REVISION_REQUESTED
        const linkedJob = (db.jobs || []).find(
          (j) => j.id === currentEst.jobId || j._id === currentEst.jobId || j.jobId === currentEst.jobId || j.jobNo === currentEst.jobNo
        );

        if (linkedJob) {
          linkedJob.status = "ESTIMATE_REVISION_REQUESTED";
          linkedJob.updatedAt = rejectedAt;
        }

        db.estimates[estIdx] = currentEst;
        saveDb(db);

        return createResponse(200, {
          success: true,
          estimate: sanitizeCustomerEstimate(currentEst),
          message: "Revision request submitted successfully. Our team will prepare an updated estimate."
        }, config);
      }
    }

    // ----------------------------------------------------
    // PrintZ V3 - Step 6: Customer Design Proof Approvals
    // ----------------------------------------------------
    if (path.startsWith("/customer/design-approvals")) {
      if (!db.designAssignments || db.designAssignments.length === 0) {
        db.designAssignments = initialData.designAssignments || [];
        saveDb(db);
      }

      const parts = path.split("/");
      const assignmentId = parts[3];
      const action = parts[4]; // "current-proof" | "approve" | "request-changes"

      // 1. List Customer Design Approvals: GET /api/customer/design-approvals
      if (!assignmentId && method === "get") {
        const list = (db.designAssignments || []).map(sanitizeCustomerDesignApproval);
        return createResponse(200, {
          success: true,
          count: list.length,
          approvals: list
        }, config);
      }

      // 2. Single Customer Design Approval View: GET /api/customer/design-approvals/:id
      if (assignmentId && !action && method === "get") {
        const found = (db.designAssignments || []).find(
          (a) => a.id === assignmentId || a._id === assignmentId || a.assignmentId === assignmentId || a.assignmentNo === assignmentId || a.jobNo === assignmentId
        );

        if (!found) {
          return createErrorResponse(404, `Design proof for assignment ${assignmentId} was not found or has expired.`, config);
        }

        return createResponse(200, {
          success: true,
          approval: sanitizeCustomerDesignApproval(found),
          assignment: sanitizeCustomerDesignApproval(found)
        }, config);
      }

      // 3. Current Active Proof: GET /api/customer/design-approvals/:id/current-proof
      if (assignmentId && action === "current-proof" && method === "get") {
        const found = (db.designAssignments || []).find(
          (a) => a.id === assignmentId || a._id === assignmentId || a.assignmentId === assignmentId || a.assignmentNo === assignmentId
        );

        if (!found) {
          return createErrorResponse(404, "Design assignment not found.", config);
        }

        const proofs = found.proofs || [];
        const currentProof = proofs.length > 0 ? proofs[proofs.length - 1] : null;

        return createResponse(200, {
          success: true,
          currentProof,
          proofVersion: currentProof ? currentProof.version : 1,
          status: found.status
        }, config);
      }

      // 4. Customer Approve Design Proof: POST /api/customer/design-approvals/:id/approve
      if (assignmentId && action === "approve" && method === "post") {
        const idx = (db.designAssignments || []).findIndex(
          (a) => a.id === assignmentId || a._id === assignmentId || a.assignmentId === assignmentId || a.assignmentNo === assignmentId
        );

        if (idx === -1) {
          return createErrorResponse(404, "Design assignment not found.", config);
        }

        const currentDes = db.designAssignments[idx];

        // Concurrency / Idempotency protection
        if (currentDes.status === "APPROVED") {
          return createResponse(200, {
            success: true,
            assignment: sanitizeCustomerDesignApproval(currentDes),
            message: "Design proof is already approved."
          }, config);
        }

        const { proofVersion, comments = "Approved" } = body || {};
        const proofs = currentDes.proofs || [];
        const activeProof = proofs.length > 0 ? proofs[proofs.length - 1] : null;

        // Security check: Only CURRENT proof version can be approved
        if (proofVersion && activeProof && activeProof.version !== Number(proofVersion)) {
          return createErrorResponse(400, `You can only approve the current proof version (V${activeProof.version}).`, config);
        }

        const approvedAt = new Date().toISOString();
        const activeVer = activeProof ? activeProof.version : 1;

        if (activeProof) {
          activeProof.status = "APPROVED";
          activeProof.approvedAt = approvedAt;
        }

        currentDes.status = "APPROVED";
        currentDes.approvedAt = approvedAt;
        currentDes.updatedAt = approvedAt;

        if (!currentDes.reviews) currentDes.reviews = [];
        const reviewRecord = {
          reviewId: generateId("rev"),
          assignmentId: currentDes.id || currentDes.assignmentId,
          jobId: currentDes.jobId,
          jobItemId: currentDes.jobItemId,
          version: activeVer,
          decision: "APPROVED",
          comments: comments || "Looks good. Approved for production.",
          reviewedBy: "Customer (Online Portal)",
          reviewedAt: approvedAt,
          createdAt: approvedAt
        };
        currentDes.reviews.push(reviewRecord);

        if (!currentDes.timeline) currentDes.timeline = [];
        currentDes.timeline.push({
          event: "PROOF_APPROVED",
          status: "APPROVED",
          actor: "Customer (Mr. Arjun)",
          timestamp: approvedAt,
          notes: `Customer approved Proof Version V${activeVer}. Comments: ${comments || "Approved"}`
        });

        // Update linked Job Item & Job
        const linkedJob = (db.jobs || []).find((j) => j.id === currentDes.jobId || j.jobNo === currentDes.jobNo);
        if (linkedJob) {
          const targetItem = (linkedJob.items || []).find((it) => it.jobItemId === currentDes.jobItemId);
          if (targetItem) {
            targetItem.status = "DESIGN_APPROVED";
          }

          if (!linkedJob.timeline) linkedJob.timeline = [];
          linkedJob.timeline.push({
            event: "PROOF_APPROVED",
            status: "DESIGN_APPROVED",
            actor: "Customer",
            timestamp: approvedAt,
            notes: `Design approved for ${currentDes.itemName} (Proof V${activeVer})`
          });

          // Multi-item Check: Check if all items requiring design in this job are approved
          const itemsRequiringDesign = (linkedJob.items || []).filter((it) => it.designRequired !== false);
          const allDesignApproved = itemsRequiringDesign.every((it) => {
            if (it.jobItemId === currentDes.jobItemId) return true;
            return it.status === "DESIGN_APPROVED" || it.status === "READY_FOR_PRODUCTION";
          });

          if (allDesignApproved) {
            linkedJob.status = "READY_FOR_PRODUCTION";
            linkedJob.updatedAt = approvedAt;
            linkedJob.timeline.push({
              event: "READY_FOR_PRODUCTION",
              status: "READY_FOR_PRODUCTION",
              actor: "System Workflow",
              timestamp: approvedAt,
              notes: "All job item design proofs approved. Ready for Production stage."
            });
          }
        }

        if (!db.eligibleJobsForPlanning) db.eligibleJobsForPlanning = [];
        const existingPlanning = db.eligibleJobsForPlanning.find((e) => e.jobItemId === currentDes.jobItemId);
        if (!existingPlanning) {
          db.eligibleJobsForPlanning.unshift({
            jobId: currentDes.jobId,
            jobNo: currentDes.jobNo,
            jobItemId: currentDes.jobItemId,
            customerName: currentDes.customerName,
            customerMobile: currentDes.customerMobile,
            productName: currentDes.itemName || "Print Item",
            productType: currentDes.productType || "Custom Print",
            requiredQuantity: currentDes.requirementSnapshot?.quantity || 500,
            unit: currentDes.requirementSnapshot?.unit || "PCS",
            branchId: currentDes.branchId || "64f1a2b3c4d5e6f7a8b90001",
            branchName: currentDes.branchName || "Banaswadi",
            priority: currentDes.priority || "NORMAL",
            designRequired: true,
            designStatus: "APPROVED",
            planningStatus: "READY_FOR_PLANNING",
            hasActiveOrder: false,
            dueDate: currentDes.dueDate || "2026-10-25",
            approvedSample: activeProof ? {
              version: activeVer,
              approvedAt: approvedAt,
              proofUrl: activeProof.previewUrl || "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800",
              sampleNotes: comments || "Approved sample proof"
            } : null,
            requirementSnapshot: currentDes.requirementSnapshot || {}
          });
        } else {
          existingPlanning.designStatus = "APPROVED";
          existingPlanning.planningStatus = "READY_FOR_PLANNING";
        }

        db.designAssignments[idx] = currentDes;
        saveDb(db);

        return createResponse(200, {
          success: true,
          review: reviewRecord,
          assignment: sanitizeCustomerDesignApproval(currentDes),
          message: `Sample Proof V${activeVer} approved successfully. Design marked ready for production!`
        }, config);
      }

      // 5. Customer Request Changes: POST /api/customer/design-approvals/:id/request-changes
      if (assignmentId && action === "request-changes" && method === "post") {
        const idx = (db.designAssignments || []).findIndex(
          (a) => a.id === assignmentId || a._id === assignmentId || a.assignmentId === assignmentId || a.assignmentNo === assignmentId
        );

        if (idx === -1) {
          return createErrorResponse(404, "Design assignment not found.", config);
        }

        const currentDes = db.designAssignments[idx];

        if (currentDes.status === "APPROVED") {
          return createErrorResponse(400, "Cannot request changes on an already approved design proof.", config);
        }

        const { comments, proofVersion } = body || {};

        if (!comments || !comments.trim() || comments.trim().length < 3) {
          return createErrorResponse(400, "Please describe the changes required for the designer (minimum 3 characters).", config);
        }

        const proofs = currentDes.proofs || [];
        const activeProof = proofs.length > 0 ? proofs[proofs.length - 1] : null;
        const activeVer = activeProof ? activeProof.version : 1;

        if (proofVersion && activeProof && activeProof.version !== Number(proofVersion)) {
          return createErrorResponse(400, `You can only request revisions on the current proof version (V${activeProof.version}).`, config);
        }

        const rejectedAt = new Date().toISOString();

        if (activeProof) {
          activeProof.status = "REVISED";
          activeProof.customerFeedback = comments.trim();
          activeProof.feedbackDate = new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        }

        currentDes.status = "REVISION_REQUESTED";
        currentDes.rejectionReason = "CUSTOMER_REVISION";
        currentDes.customerFeedback = comments.trim();
        currentDes.updatedAt = rejectedAt;

        if (!currentDes.reviews) currentDes.reviews = [];
        const reviewRecord = {
          reviewId: generateId("rev"),
          assignmentId: currentDes.id || currentDes.assignmentId,
          jobId: currentDes.jobId,
          jobItemId: currentDes.jobItemId,
          version: activeVer,
          decision: "REVISION_REQUESTED",
          comments: comments.trim(),
          reviewedBy: "Customer (Online Portal)",
          reviewedAt: rejectedAt,
          createdAt: rejectedAt
        };
        currentDes.reviews.push(reviewRecord);

        if (!currentDes.timeline) currentDes.timeline = [];
        currentDes.timeline.push({
          event: "PROOF_REVISION_REQUESTED",
          status: "REVISION_REQUESTED",
          actor: "Customer",
          timestamp: rejectedAt,
          notes: `Customer requested revision for Proof V${activeVer}: "${comments.trim()}"`
        });

        // Update Job Order status
        const linkedJob = (db.jobs || []).find((j) => j.id === currentDes.jobId || j.jobNo === currentDes.jobNo);
        if (linkedJob) {
          linkedJob.status = "DESIGN_REVISION_REQUESTED";
          linkedJob.updatedAt = rejectedAt;
          const targetItem = (linkedJob.items || []).find((it) => it.jobItemId === currentDes.jobItemId);
          if (targetItem) targetItem.status = "DESIGN_REVISION_REQUESTED";

          if (!linkedJob.timeline) linkedJob.timeline = [];
          linkedJob.timeline.push({
            event: "PROOF_REVISION_REQUESTED",
            status: "DESIGN_REVISION_REQUESTED",
            actor: "Customer",
            timestamp: rejectedAt,
            notes: `Customer requested design revision on ${currentDes.itemName}: "${comments.trim()}"`
          });
        }

        db.designAssignments[idx] = currentDes;
        saveDb(db);

        return createResponse(200, {
          success: true,
          review: reviewRecord,
          assignment: sanitizeCustomerDesignApproval(currentDes),
          message: "Revision requested successfully. The designer has been notified to prepare Proof V" + (activeVer + 1) + "."
        }, config);
      }
    }

    // ----------------------------------------------------
    // PrintZ V3 - Step 5 & 6: Design Assignment & Workspace
    // ----------------------------------------------------
    if (path.startsWith("/design")) {
      const parts = path.split("/");
      const sub1 = parts[2]; // "queue" | "pool" | "auto-allocate" | "assignments"
      const assignmentId = parts[3];
      const action = parts[4]; // "assign" | "start" | "files" | "proofs" | "reassign-request" | "proof-history" | "manager-record-decision"

      if (!db.designAssignments || db.designAssignments.length === 0) {
        db.designAssignments = initialData.designAssignments || [];
        saveDb(db);
      }

      // 1. Designer Pool: GET /api/design/pool
      if (sub1 === "pool" && method === "get") {
        const branchId = params.branchId;
        let designers = (db.users || []).filter((u) => u.role === "designer");
        if (designers.length === 0) {
          designers = (initialData.users || []).filter((u) => u.role === "designer");
        }

        const poolList = designers
          .filter((u) => !branchId || u.branchId === branchId || u.branch === "All Branches")
          .map((d) => {
            const activeJobs = (db.designAssignments || []).filter(
              (a) => a.assignedDesignerId === (d.id || d._id) && (a.status === "ASSIGNED" || a.status === "IN_PROGRESS")
            ).length;

            return {
              id: d.id || d._id,
              _id: d.id || d._id,
              name: d.name,
              code: d.code || d.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
              designation: d.designation || "Graphic Designer",
              branchId: d.branchId,
              branchName: d.branchName || d.branch,
              rating: d.rating || 4.5,
              reviewCount: d.reviewCount || 15,
              slaMonthRate: d.slaMonthRate || 92,
              openJobs: d.openJobs !== undefined ? d.openJobs : activeJobs,
              maxJobs: d.maxJobs || 5,
              status: d.status || (activeJobs >= 5 ? "at_capacity" : "eligible"),
              avatarColor: d.avatarColor || "#059669"
            };
          });

        return createResponse(200, {
          success: true,
          count: poolList.length,
          designers: poolList
        }, config);
      }

      // 2. Design Queue: GET /api/design/queue
      if (sub1 === "queue" && method === "get") {
        let results = [...(db.designAssignments && db.designAssignments.length > 0 ? db.designAssignments : (initialData.designAssignments || []))];

        const { status, priority, designerId, search, branchId } = params;

        if (status && status !== "ALL") {
          results = results.filter((a) => a.status === status);
        }

        if (priority && priority !== "ALL") {
          results = results.filter((a) => a.priority === priority);
        }

        if (designerId && designerId !== "ALL") {
          if (designerId === "UNASSIGNED") {
            results = results.filter((a) => !a.assignedDesignerId);
          } else {
            results = results.filter((a) => a.assignedDesignerId === designerId);
          }
        }

        if (branchId) {
          results = results.filter((a) => a.branchId === branchId || a.branchName === branchId);
        }

        if (search) {
          const q = search.toLowerCase().trim();
          results = results.filter(
            (a) =>
              (a.assignmentNo && a.assignmentNo.toLowerCase().includes(q)) ||
              (a.jobNo && a.jobNo.toLowerCase().includes(q)) ||
              (a.customerName && a.customerName.toLowerCase().includes(q)) ||
              (a.customerMobile && a.customerMobile.includes(q)) ||
              (a.itemName && a.itemName.toLowerCase().includes(q)) ||
              (a.assignedDesignerName && a.assignedDesignerName.toLowerCase().includes(q))
          );
        }

        return createResponse(200, {
          success: true,
          count: results.length,
          assignments: results
        }, config);
      }

      // 3. Auto Allocate Designers: POST /api/design/auto-allocate
      if (sub1 === "auto-allocate" && method === "post") {
        const { assignmentIds = [] } = body || {};
        const eligibleDesigners = (db.users || []).filter((u) => u.role === "designer" && u.status !== "on_leave");

        if (eligibleDesigners.length === 0) {
          return createErrorResponse(400, "No eligible graphic designers available for allocation.", config);
        }

        let allocatedCount = 0;
        let rotIndex = 0;

        (db.designAssignments || []).forEach((a) => {
          if (assignmentIds.length === 0 || assignmentIds.includes(a.id) || assignmentIds.includes(a.assignmentNo)) {
            if (a.status === "PENDING_ASSIGNMENT" || !a.assignedDesignerId) {
              const designer = eligibleDesigners[rotIndex % eligibleDesigners.length];
              rotIndex++;

              a.assignedDesignerId = designer.id || designer._id;
              a.assignedDesignerName = designer.name;
              a.assignedDesignerCode = designer.code || "GD";
              a.assignedDesignerRole = designer.designation || "Designer";
              a.assignedAt = new Date().toISOString();
              a.assignedBy = "System (Round Robin Allocation)";
              a.status = "ASSIGNED";

              if (!a.timeline) a.timeline = [];
              a.timeline.push({
                event: "DESIGNER_ASSIGNED",
                status: "ASSIGNED",
                actor: "Auto Allocation (Round Robin)",
                timestamp: new Date().toISOString(),
                notes: `Automatically assigned to ${designer.name}`
              });

              allocatedCount++;
            }
          }
        });

        saveDb(db);

        return createResponse(200, {
          success: true,
          allocatedCount,
          message: `Successfully allocated ${allocatedCount} design jobs.`
        }, config);
      }

      // 4. Single Design Assignment: GET /api/design/assignments/:id
      if (sub1 === "assignments" && assignmentId && !action && method === "get") {
        const found = (db.designAssignments || []).find(
          (a) => a.id === assignmentId || a._id === assignmentId || a.assignmentId === assignmentId || a.assignmentNo === assignmentId
        );

        if (!found) {
          return createErrorResponse(404, `Design assignment ${assignmentId} not found`, config);
        }

        return createResponse(200, {
          success: true,
          assignment: found
        }, config);
      }

      // 5. Assign Designer: POST /api/design/assignments/:id/assign
      if (sub1 === "assignments" && assignmentId && action === "assign" && method === "post") {
        const idx = (db.designAssignments || []).findIndex(
          (a) => a.id === assignmentId || a._id === assignmentId || a.assignmentId === assignmentId || a.assignmentNo === assignmentId
        );

        if (idx === -1) {
          return createErrorResponse(404, `Design assignment ${assignmentId} not found`, config);
        }

        const { designerId, dueDate, notes, priority } = body || {};

        if (!designerId) {
          return createErrorResponse(400, "Please select a designer from the pool.", config);
        }

        const designer = (db.users || []).find((u) => 
          u.id === designerId || 
          u._id === designerId || 
          (u.code && u.code.toLowerCase() === String(designerId).toLowerCase()) ||
          (u.name && u.name.toLowerCase() === String(designerId).toLowerCase()) ||
          (u.name && body?.designerName && u.name.toLowerCase() === String(body.designerName).toLowerCase()) ||
          (designerId === "d1" && (u.code === "PR" || u.name?.includes("Priya"))) ||
          (designerId === "d2" && (u.code === "RM" || u.name?.includes("Rahul"))) ||
          (designerId === "d3" && (u.code === "SK" || u.name?.includes("Sneha"))) ||
          (designerId === "d4" && (u.code === "IS" || u.name?.includes("Imran"))) ||
          (designerId === "d5" && (u.code === "AK" || u.name?.includes("Anjali"))) ||
          (designerId === "d6" && (u.code === "DV" || u.name?.includes("Divya"))) ||
          (designerId === "d7" && (u.code === "KN" || u.name?.includes("Karthik"))) ||
          (designerId === "d8" && (u.code === "MS" || u.name?.includes("Meera"))) ||
          (designerId === "d9" && (u.code === "VP" || u.name?.includes("Vikram"))) ||
          (designerId === "d10" && (u.code === "RG" || u.name?.includes("Rohit"))) ||
          (designerId === "d11" && (u.code === "PB" || u.name?.includes("Pooja"))) ||
          (designerId === "d12" && (u.code === "ST" || u.name?.includes("Siddharth")))
        ) || (db.users || []).find((u) => u.role === "designer");

        if (!designer) {
          return createErrorResponse(404, "Selected designer was not found in the employee directory.", config);
        }

        const currentDes = db.designAssignments[idx];
        const assignedAt = new Date().toISOString();

        currentDes.assignedDesignerId = designer.id || designer._id;
        currentDes.assignedDesignerName = designer.name;
        currentDes.assignedDesignerCode = designer.code || designer.name.substring(0, 2).toUpperCase();
        currentDes.assignedDesignerRole = designer.designation || "Designer";
        currentDes.assignedAt = assignedAt;
        currentDes.assignedBy = body?.assignedBy || "Branch Manager";
        currentDes.status = "ASSIGNED";
        if (dueDate) currentDes.dueDate = dueDate;
        if (priority) currentDes.priority = priority;
        if (notes) currentDes.internalNotes = notes;
        currentDes.updatedAt = assignedAt;

        if (!currentDes.timeline) currentDes.timeline = [];
        currentDes.timeline.push({
          event: "DESIGNER_ASSIGNED",
          status: "ASSIGNED",
          actor: body?.assignedBy || "Branch Manager",
          timestamp: assignedAt,
          notes: `Assigned to ${designer.name}. ${notes ? `Instructions: ${notes}` : ""}`
        });

        // Update Job Order timeline
        const linkedJob = (db.jobs || []).find((j) => j.id === currentDes.jobId || j.jobNo === currentDes.jobNo);
        if (linkedJob && linkedJob.timeline) {
          linkedJob.timeline.push({
            event: "DESIGNER_ASSIGNED",
            status: linkedJob.status,
            actor: body?.assignedBy || "Branch Manager",
            timestamp: assignedAt,
            notes: `Designer ${designer.name} assigned to item: ${currentDes.itemName}`
          });
        }

        db.designAssignments[idx] = currentDes;
        saveDb(db);

        return createResponse(200, {
          success: true,
          assignment: currentDes,
          message: `Design assignment allocated to ${designer.name} successfully.`
        }, config);
      }

      // 6. Start Design: POST /api/design/assignments/:id/start
      if (sub1 === "assignments" && assignmentId && action === "start" && method === "post") {
        const idx = (db.designAssignments || []).findIndex(
          (a) => a.id === assignmentId || a._id === assignmentId || a.assignmentId === assignmentId || a.assignmentNo === assignmentId
        );

        if (idx === -1) {
          return createErrorResponse(404, `Design assignment ${assignmentId} not found`, config);
        }

        const currentDes = db.designAssignments[idx];
        const isRevision = currentDes.status === "REVISION_REQUESTED";
        const startedAt = new Date().toISOString();

        currentDes.status = "IN_PROGRESS";
        currentDes.startedAt = startedAt;
        currentDes.startedBy = currentDes.assignedDesignerName || "Designer";
        currentDes.updatedAt = startedAt;

        if (!currentDes.timeline) currentDes.timeline = [];
        currentDes.timeline.push({
          event: isRevision ? "DESIGN_REVISION_STARTED" : "DESIGN_STARTED",
          status: "IN_PROGRESS",
          actor: currentDes.assignedDesignerName || "Designer",
          timestamp: startedAt,
          notes: isRevision
            ? "Designer initiated revision work based on customer feedback."
            : "Designer accepted assignment and started design workspace."
        });

        // Update linked Job status to DESIGN_IN_PROGRESS
        const linkedJob = (db.jobs || []).find((j) => j.id === currentDes.jobId || j.jobNo === currentDes.jobNo);
        if (linkedJob) {
          linkedJob.status = "DESIGN_IN_PROGRESS";
          linkedJob.updatedAt = startedAt;
          const targetItem = (linkedJob.items || []).find((it) => it.jobItemId === currentDes.jobItemId);
          if (targetItem) targetItem.status = "DESIGN_IN_PROGRESS";

          if (!linkedJob.timeline) linkedJob.timeline = [];
          linkedJob.timeline.push({
            event: isRevision ? "DESIGN_REVISION_STARTED" : "DESIGN_STARTED",
            status: "DESIGN_IN_PROGRESS",
            actor: currentDes.assignedDesignerName || "Designer",
            timestamp: startedAt,
            notes: isRevision
              ? `Revision in progress for ${currentDes.itemName}`
              : `Design work in progress for ${currentDes.itemName}`
          });
        }

        db.designAssignments[idx] = currentDes;
        saveDb(db);

        return createResponse(200, {
          success: true,
          assignment: currentDes,
          message: isRevision ? "Design revision initiated." : "Design workspace initiated and status updated to In Progress."
        }, config);
      }

      // 7. Upload Design File: POST /api/design/assignments/:id/files
      if (sub1 === "assignments" && assignmentId && action === "files" && method === "post") {
        const idx = (db.designAssignments || []).findIndex(
          (a) => a.id === assignmentId || a._id === assignmentId || a.assignmentId === assignmentId || a.assignmentNo === assignmentId
        );

        if (idx === -1) {
          return createErrorResponse(404, `Design assignment ${assignmentId} not found`, config);
        }

        const currentDes = db.designAssignments[idx];
        const { fileName, fileUrl, fileType, fileSize } = body || {};

        if (!fileName) {
          return createErrorResponse(400, "File name is required.", config);
        }

        if (!currentDes.designFiles) currentDes.designFiles = [];

        // Mark previous files isCurrent = false
        currentDes.designFiles.forEach((f) => { f.isCurrent = false; });

        const nextVer = currentDes.designFiles.length + 1;
        const newFile = {
          fileId: generateId("dfile"),
          fileName: fileName || `artwork-v${nextVer}.pdf`,
          fileUrl: fileUrl || "https://placehold.co/600x400/047857/ffffff?text=Artwork+File",
          fileType: fileType || "application/pdf",
          fileSize: fileSize || "2.5 MB",
          version: nextVer,
          uploadedBy: currentDes.assignedDesignerName || "Designer",
          uploadedAt: new Date().toISOString(),
          isCurrent: true
        };

        currentDes.designFiles.push(newFile);
        currentDes.updatedAt = new Date().toISOString();

        if (!currentDes.timeline) currentDes.timeline = [];
        currentDes.timeline.push({
          event: "DESIGN_FILE_UPLOADED",
          status: currentDes.status,
          actor: currentDes.assignedDesignerName || "Designer",
          timestamp: new Date().toISOString(),
          notes: `Uploaded design file ${newFile.fileName} (Version ${nextVer})`
        });

        db.designAssignments[idx] = currentDes;
        saveDb(db);

        return createResponse(201, {
          success: true,
          file: newFile,
          assignment: currentDes,
          message: `Design file version V${nextVer} uploaded successfully.`
        }, config);
      }

      // 8. Submit Sample Proof: POST /api/design/assignments/:id/proofs
      if (sub1 === "assignments" && assignmentId && action === "proofs" && method === "post") {
        const idx = (db.designAssignments || []).findIndex(
          (a) => a.id === assignmentId || a._id === assignmentId || a.assignmentId === assignmentId || a.assignmentNo === assignmentId
        );

        if (idx === -1) {
          return createErrorResponse(404, `Design assignment ${assignmentId} not found`, config);
        }

        const currentDes = db.designAssignments[idx];
        const { frontUrl, backUrl, comments, sendToMobile, shareOnWhatsApp } = body || {};

        if (!currentDes.proofs) currentDes.proofs = [];

        const nextVer = currentDes.proofs.length + 1;
        const submittedAt = new Date().toISOString();

        const newProof = {
          proofId: generateId("proof"),
          version: nextVer,
          title: `Sample Version ${nextVer}`,
          frontUrl: frontUrl || "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80",
          backUrl: backUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
          comments: comments || `Sample version ${nextVer} prepared for customer verification.`,
          sendToMobile: sendToMobile || currentDes.customerMobile,
          shareOnWhatsApp: shareOnWhatsApp !== undefined ? shareOnWhatsApp : true,
          submittedBy: currentDes.assignedDesignerName || "Designer",
          submittedAt,
          status: "SUBMITTED"
        };

        currentDes.proofs.push(newProof);
        currentDes.status = "PROOF_PENDING";
        currentDes.updatedAt = submittedAt;

        if (!currentDes.timeline) currentDes.timeline = [];
        currentDes.timeline.push({
          event: "DESIGN_PROOF_SUBMITTED",
          status: "PROOF_PENDING",
          actor: currentDes.assignedDesignerName || "Designer",
          timestamp: submittedAt,
          notes: `Proof Sample V${nextVer} submitted to customer for approval.`
        });

        // Update Job & Job Item status to PROOF_PENDING
        const linkedJob = (db.jobs || []).find((j) => j.id === currentDes.jobId || j.jobNo === currentDes.jobNo);
        if (linkedJob) {
          linkedJob.status = "PROOF_PENDING";
          linkedJob.updatedAt = submittedAt;
          const targetItem = (linkedJob.items || []).find((it) => it.jobItemId === currentDes.jobItemId);
          if (targetItem) targetItem.status = "PROOF_PENDING";

          if (!linkedJob.timeline) linkedJob.timeline = [];
          linkedJob.timeline.push({
            event: "DESIGN_PROOF_SUBMITTED",
            status: "PROOF_PENDING",
            actor: currentDes.assignedDesignerName || "Designer",
            timestamp: submittedAt,
            notes: `Design Proof Sample V${nextVer} submitted for ${currentDes.itemName}`
          });
        }

        db.designAssignments[idx] = currentDes;
        saveDb(db);

        return createResponse(201, {
          success: true,
          proof: newProof,
          assignment: currentDes,
          message: `Sample Proof V${nextVer} submitted successfully. Customer notified for approval review.`
        }, config);
      }

      // 9. Reassign Request / Rejection: POST /api/design/assignments/:id/reassign-request
      if (sub1 === "assignments" && assignmentId && action === "reassign-request" && method === "post") {
        const idx = (db.designAssignments || []).findIndex(
          (a) => a.id === assignmentId || a._id === assignmentId || a.assignmentId === assignmentId || a.assignmentNo === assignmentId
        );

        if (idx === -1) {
          return createErrorResponse(404, `Design assignment ${assignmentId} not found`, config);
        }

        const currentDes = db.designAssignments[idx];
        const { reason = "INSUFFICIENT_INPUT", details = "" } = body || {};

        const previousDesigner = currentDes.assignedDesignerName || "Designer";
        currentDes.status = "PENDING_ASSIGNMENT";
        currentDes.assignedDesignerId = null;
        currentDes.assignedDesignerName = null;
        currentDes.assignedDesignerCode = null;
        currentDes.rejectionReason = reason;
        currentDes.rejectionDetails = details;
        currentDes.updatedAt = new Date().toISOString();

        if (!currentDes.timeline) currentDes.timeline = [];
        currentDes.timeline.push({
          event: "ASSIGNMENT_REASSIGNED",
          status: "PENDING_ASSIGNMENT",
          actor: previousDesigner,
          timestamp: new Date().toISOString(),
          notes: `Reassigned back to queue by ${previousDesigner}. Reason: ${reason} - ${details}`
        });

        db.designAssignments[idx] = currentDes;
        saveDb(db);

        return createResponse(200, {
          success: true,
          assignment: currentDes,
          message: "Assignment returned to design queue for re-allocation."
        }, config);
      }

      // 10. Proof Version History: GET /api/design/assignments/:id/proof-history
      if (sub1 === "assignments" && assignmentId && action === "proof-history" && method === "get") {
        const found = (db.designAssignments || []).find(
          (a) => a.id === assignmentId || a._id === assignmentId || a.assignmentId === assignmentId || a.assignmentNo === assignmentId || a.jobNo === assignmentId
        );

        if (!found) {
          return createErrorResponse(404, `Design assignment ${assignmentId} not found`, config);
        }

        const proofs = found.proofs || [];
        const reviews = found.reviews || [];

        return createResponse(200, {
          success: true,
          assignmentNo: found.assignmentNo,
          jobNo: found.jobNo,
          currentVersion: proofs.length,
          proofs,
          reviews,
          status: found.status
        }, config);
      }

      // 11. Manager Record Customer Decision: POST /api/design/assignments/:id/manager-record-decision
      if (sub1 === "assignments" && assignmentId && action === "manager-record-decision" && method === "post") {
        const idx = (db.designAssignments || []).findIndex(
          (a) => a.id === assignmentId || a._id === assignmentId || a.assignmentId === assignmentId || a.assignmentNo === assignmentId || a.jobNo === assignmentId
        );

        if (idx === -1) {
          return createErrorResponse(404, `Design assignment ${assignmentId} not found`, config);
        }

        const currentDes = db.designAssignments[idx];
        const { decision, comments = "", proofOfApprovalFile } = body || {};

        if (!decision || (decision !== "APPROVED" && decision !== "REVISION_REQUESTED")) {
          return createErrorResponse(400, "Valid decision ('APPROVED' or 'REVISION_REQUESTED') is required.", config);
        }

        const proofs = currentDes.proofs || [];
        const activeProof = proofs.length > 0 ? proofs[proofs.length - 1] : null;
        const activeVer = activeProof ? activeProof.version : 1;
        const recordedAt = new Date().toISOString();

        if (decision === "APPROVED") {
          currentDes.status = "APPROVED";
          currentDes.approvedAt = recordedAt;
          currentDes.approvedBy = "Manager (Recorded Customer Approval)";
          if (activeProof) {
            activeProof.status = "APPROVED";
            activeProof.approvedAt = recordedAt;
          }

          if (!currentDes.reviews) currentDes.reviews = [];
          currentDes.reviews.push({
            reviewId: generateId("rev"),
            assignmentId: currentDes.id || currentDes.assignmentId,
            jobId: currentDes.jobId,
            jobItemId: currentDes.jobItemId,
            version: activeVer,
            decision: "APPROVED",
            comments: comments || "Looks good. Please go ahead with printing.",
            proofOfApprovalFile: proofOfApprovalFile || "whatsapp-reply.png",
            reviewedBy: "Customer (Recorded via Manager)",
            reviewedAt: recordedAt,
            createdAt: recordedAt
          });

          if (!currentDes.timeline) currentDes.timeline = [];
          currentDes.timeline.push({
            event: "PROOF_APPROVED",
            status: "APPROVED",
            actor: "Arun Kumar (Branch Manager)",
            timestamp: recordedAt,
            notes: `Recorded customer approval for Proof V${activeVer}. ${comments ? `Feedback: "${comments}"` : ""}`
          });

          // Update linked Job Item & Job
          const linkedJob = (db.jobs || []).find((j) => j.id === currentDes.jobId || j.jobNo === currentDes.jobNo);
          if (linkedJob) {
            const targetItem = (linkedJob.items || []).find((it) => it.jobItemId === currentDes.jobItemId);
            if (targetItem) targetItem.status = "DESIGN_APPROVED";

            if (!linkedJob.timeline) linkedJob.timeline = [];
            linkedJob.timeline.push({
              event: "PROOF_APPROVED",
              status: "DESIGN_APPROVED",
              actor: "Branch Manager",
              timestamp: recordedAt,
              notes: `Design approved for ${currentDes.itemName}`
            });

            // Multi-item check
            const itemsRequiringDesign = (linkedJob.items || []).filter((it) => it.designRequired !== false);
            const allDesignApproved = itemsRequiringDesign.every((it) => {
              if (it.jobItemId === currentDes.jobItemId) return true;
              return it.status === "DESIGN_APPROVED" || it.status === "READY_FOR_PRODUCTION";
            });

            if (allDesignApproved) {
              linkedJob.status = "READY_FOR_PRODUCTION";
              linkedJob.updatedAt = recordedAt;
              linkedJob.timeline.push({
                event: "READY_FOR_PRODUCTION",
                status: "READY_FOR_PRODUCTION",
                actor: "System Workflow",
                timestamp: recordedAt,
                notes: "All design items approved. Job is ready for production."
              });
            }
          }
        } else {
          // REVISION_REQUESTED
          currentDes.status = "REVISION_REQUESTED";
          currentDes.rejectionReason = "CUSTOMER_REVISION";
          currentDes.customerFeedback = comments || "Customer requested revision";
          if (activeProof) {
            activeProof.status = "REVISED";
            activeProof.customerFeedback = comments;
            activeProof.feedbackDate = new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
          }

          if (!currentDes.reviews) currentDes.reviews = [];
          currentDes.reviews.push({
            reviewId: generateId("rev"),
            assignmentId: currentDes.id || currentDes.assignmentId,
            jobId: currentDes.jobId,
            jobItemId: currentDes.jobItemId,
            version: activeVer,
            decision: "REVISION_REQUESTED",
            comments: comments || "Revision required",
            proofOfApprovalFile: proofOfApprovalFile || null,
            reviewedBy: "Customer (Recorded via Manager)",
            reviewedAt: recordedAt,
            createdAt: recordedAt
          });

          if (!currentDes.timeline) currentDes.timeline = [];
          currentDes.timeline.push({
            event: "PROOF_REVISION_REQUESTED",
            status: "REVISION_REQUESTED",
            actor: "Arun Kumar (Branch Manager)",
            timestamp: recordedAt,
            notes: `Recorded customer revision request for Proof V${activeVer}: "${comments}"`
          });

          const linkedJob = (db.jobs || []).find((j) => j.id === currentDes.jobId || j.jobNo === currentDes.jobNo);
          if (linkedJob) {
            linkedJob.status = "DESIGN_REVISION_REQUESTED";
            linkedJob.updatedAt = recordedAt;
            const targetItem = (linkedJob.items || []).find((it) => it.jobItemId === currentDes.jobItemId);
            if (targetItem) targetItem.status = "DESIGN_REVISION_REQUESTED";
          }
        }

        currentDes.updatedAt = recordedAt;
        db.designAssignments[idx] = currentDes;
        saveDb(db);

        return createResponse(200, {
          success: true,
          assignment: currentDes,
          message: decision === "APPROVED"
            ? `Customer approval recorded successfully for ${currentDes.assignmentNo}. Status updated to DESIGN APPROVED.`
            : `Revision request recorded for ${currentDes.assignmentNo}. Designer has been notified for Proof V${activeVer + 1}.`
        }, config);
      }
    }

    // ----------------------------------------------------
    // PrintZ V3 - Step 7: Sales & POS Endpoints
    // ----------------------------------------------------
    if (path.startsWith("/pos") || path.startsWith("/api/pos") || path.startsWith("/sales-pos")) {
      db.posProducts = db.posProducts || initialData.posProducts || [];
      db.posCategories = db.posCategories || initialData.posCategories || [];
      db.sales = db.sales || initialData.sales || [];
      db.invoices = db.invoices || initialData.invoices || [];
      db.saleReceipts = db.saleReceipts || initialData.saleReceipts || [];
      db.heldBills = db.heldBills || initialData.heldBills || [];
      db.returns = db.returns || initialData.returns || [];

      // Normalize path prefix
      const cleanPath = path.replace(/^\/api/, "").replace(/^\/sales-pos/, "/pos");

      // 1. POS Products & Categories
      if (cleanPath === "/pos/categories" && method === "get") {
        return createResponse(200, {
          success: true,
          categories: db.posCategories
        }, config);
      }

      if (cleanPath === "/pos/products" && method === "get") {
        let products = [...db.posProducts];
        if (params.category && params.category !== "All") {
          products = products.filter((p) => p.category?.toLowerCase() === params.category.toLowerCase());
        }
        if (params.search) {
          const q = params.search.toLowerCase().trim();
          products = products.filter(
            (p) =>
              (p.productName && p.productName.toLowerCase().includes(q)) ||
              (p.productCode && p.productCode.toLowerCase().includes(q)) ||
              (p.category && p.category.toLowerCase().includes(q))
          );
        }
        if (params.type) {
          products = products.filter((p) => p.type === params.type);
        }
        return createResponse(200, {
          success: true,
          count: products.length,
          products
        }, config);
      }

      // 2. Held Bills Endpoints: /pos/held-bills
      if (cleanPath === "/pos/held-bills") {
        if (method === "get") {
          return createResponse(200, {
            success: true,
            count: (db.heldBills || []).length,
            heldBills: db.heldBills || []
          }, config);
        }

        if (method === "post") {
          const newHeld = {
            heldId: generateId("hld"),
            heldNo: `HELD-${String((db.heldBills || []).length + 1).padStart(3, "0")}`,
            customer: body?.customer || { name: "Walk-in Customer", mobile: "" },
            items: body?.items || [],
            subtotal: body?.subtotal || 0,
            grandTotal: body?.grandTotal || 0,
            savedAt: new Date().toISOString(),
            savedBy: body?.savedBy || "Counter Staff",
            notes: body?.notes || ""
          };
          db.heldBills.unshift(newHeld);
          saveDb(db);
          return createResponse(201, {
            success: true,
            heldBill: newHeld,
            message: `Bill held successfully as ${newHeld.heldNo}`
          }, config);
        }
      }

      const heldBillMatch = cleanPath.match(/^\/pos\/held-bills\/([^\/]+)$/);
      if (heldBillMatch && method === "delete") {
        const hId = heldBillMatch[1];
        db.heldBills = (db.heldBills || []).filter((h) => h.heldId !== hId && h.heldNo !== hId);
        saveDb(db);
        return createResponse(200, { success: true, message: "Held bill cleared" }, config);
      }

      // 3. Sales Listing: GET /pos/sales
      if (cleanPath === "/pos/sales" && method === "get") {
        let salesList = [...(db.sales || [])];

        if (params.branchId && params.branchId !== "All") {
          salesList = salesList.filter((s) => s.branchId === params.branchId || s.branchName === params.branchId);
        }
        if (params.customerId) {
          salesList = salesList.filter((s) => s.customerId === params.customerId);
        }
        if (params.paymentStatus && params.paymentStatus !== "ALL") {
          salesList = salesList.filter((s) => s.paymentStatus?.toUpperCase() === params.paymentStatus.toUpperCase());
        }
        if (params.saleStatus && params.saleStatus !== "ALL") {
          salesList = salesList.filter((s) => s.saleStatus?.toUpperCase() === params.saleStatus.toUpperCase());
        }
        if (params.paymentMethod && params.paymentMethod !== "ALL") {
          salesList = salesList.filter((s) => s.paymentMethod?.toLowerCase() === params.paymentMethod.toLowerCase());
        }
        if (params.search) {
          const q = params.search.toLowerCase().trim();
          salesList = salesList.filter(
            (s) =>
              (s.saleNo && s.saleNo.toLowerCase().includes(q)) ||
              (s.invoiceNo && s.invoiceNo.toLowerCase().includes(q)) ||
              (s.receiptNo && s.receiptNo.toLowerCase().includes(q)) ||
              (s.customerSnapshot?.name && s.customerSnapshot.name.toLowerCase().includes(q)) ||
              (s.customerSnapshot?.mobile && s.customerSnapshot.mobile.includes(q))
          );
        }

        return createResponse(200, {
          success: true,
          count: salesList.length,
          sales: salesList
        }, config);
      }

      // 4. Single Sale Details: GET /pos/sales/:id
      const saleDetailMatch = cleanPath.match(/^\/pos\/sales\/([^\/]+)$/);
      if (saleDetailMatch && method === "get") {
        const sId = saleDetailMatch[1];
        const sale = (db.sales || []).find(
          (s) => s.saleId === sId || s.id === sId || s._id === sId || s.saleNo?.toLowerCase() === sId.toLowerCase()
        );
        if (!sale) {
          return createErrorResponse(404, `Sale transaction ${sId} not found`, config);
        }

        const linkedInvoice = (db.invoices || []).find((inv) => inv.saleId === sale.saleId || inv.saleNo === sale.saleNo);
        const linkedReceipt = (db.saleReceipts || []).find((rcp) => rcp.saleId === sale.saleId || rcp.saleNo === sale.saleNo);

        return createResponse(200, {
          success: true,
          sale,
          invoice: linkedInvoice || null,
          receipt: linkedReceipt || null
        }, config);
      }

      // 5. Cancel Sale: POST /pos/sales/:id/cancel
      const saleCancelMatch = cleanPath.match(/^\/pos\/sales\/([^\/]+)\/cancel$/);
      if (saleCancelMatch && method === "post") {
        const sId = saleCancelMatch[1];
        const sIdx = (db.sales || []).findIndex(
          (s) => s.saleId === sId || s.id === sId || s._id === sId || s.saleNo?.toLowerCase() === sId.toLowerCase()
        );
        if (sIdx === -1) {
          return createErrorResponse(404, `Sale ${sId} not found`, config);
        }

        db.sales[sIdx].saleStatus = "CANCELLED";
        db.sales[sIdx].updatedAt = new Date().toISOString();
        saveDb(db);

        return createResponse(200, {
          success: true,
          sale: db.sales[sIdx],
          message: `Sale ${db.sales[sIdx].saleNo} has been cancelled.`
        }, config);
      }

      // 6. Complete Sale (Atomic POS Checkout): POST /pos/sales
      if (cleanPath === "/pos/sales" && method === "post") {
        const {
          customerId,
          customerSnapshot,
          isWalkIn,
          items = [],
          discount = { type: "AMOUNT", value: 0 },
          paymentMethod = "Cash",
          paymentReference = "",
          amountReceived,
          printFormat = "A4",
          whatsAppShared = false,
          jobId = null,
          jobNo = null,
          notes = "",
          branchId = "64f1a2b3c4d5e6f7a8b90001",
          branchName = "Banaswadi",
          createdBy = "Counter Staff"
        } = body || {};

        if (!items || items.length === 0) {
          return createErrorResponse(400, "Please add at least one product or service to the cart.", config);
        }

        // Authoritative Server-side Price & Tax Recalculation
        let subtotal = 0;
        let totalTaxAmount = 0;
        let totalQuantity = 0;

        const normalizedItems = items.map((itm, idx) => {
          const refProduct = (db.posProducts || []).find((p) => p.productId === itm.productId || p.productCode === itm.productCode);
          const unitPrice = refProduct ? refProduct.sellingPrice : (Number(itm.unitPrice) || 0);
          const taxRate = refProduct ? refProduct.taxRate : (Number(itm.taxRate) || 18);
          const qty = Math.max(1, Number(itm.quantity) || 1);
          totalQuantity += qty;

          const itemDisc = Math.max(0, Number(itm.discount) || 0);
          const rawItemTotal = qty * unitPrice;
          const discountedItemBase = Math.max(0, rawItemTotal - itemDisc);
          const itemTax = Math.round(((discountedItemBase * taxRate / 100) + Number.EPSILON) * 100) / 100;
          const lineTotal = Math.round(((discountedItemBase + itemTax) + Number.EPSILON) * 100) / 100;

          subtotal += discountedItemBase;
          totalTaxAmount += itemTax;

          return {
            itemId: generateId("sitem"),
            productId: itm.productId || refProduct?.productId || `prd_custom_${idx}`,
            productCode: itm.productCode || refProduct?.productCode || `PRD-${idx + 1}`,
            productName: itm.productName || refProduct?.productName || "Custom Item",
            category: itm.category || refProduct?.category || "Other",
            type: itm.type || refProduct?.type || "SERVICE",
            quantity: qty,
            unit: itm.unit || refProduct?.unit || "pcs",
            unitPrice: unitPrice,
            discount: itemDisc,
            discountAmount: itemDisc,
            taxRate: taxRate,
            taxAmount: itemTax,
            lineTotal: lineTotal,
            consumptionSnapshot: itm.consumptionSnapshot || refProduct?.consumptionTemplate?.map(c => ({
              consumable: c.consumable,
              type: c.type,
              quantity: c.ratio * qty,
              unit: c.unit,
              branchStock: c.defaultStock
            })) || []
          };
        });

        subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

        // Sale-level discount calculation
        let saleDiscountAmount = 0;
        const discVal = Math.max(0, Number(discount?.value || discount?.amount || 0));
        if (discount?.type === "PERCENTAGE") {
          const pct = Math.min(100, discVal);
          saleDiscountAmount = Math.round((((subtotal * pct) / 100) + Number.EPSILON) * 100) / 100;
        } else {
          saleDiscountAmount = Math.round((Math.min(subtotal, discVal) + Number.EPSILON) * 100) / 100;
        }

        const taxableAmount = Math.round((Math.max(0, subtotal - saleDiscountAmount) + Number.EPSILON) * 100) / 100;
        const finalTaxAmount = Math.round((((taxableAmount * 0.18) + Number.EPSILON) * 100) / 100);
        const unroundedGrandTotal = taxableAmount + finalTaxAmount;
        const grandTotal = Math.round(unroundedGrandTotal);
        const roundOff = Math.round(((grandTotal - unroundedGrandTotal) + Number.EPSILON) * 100) / 100;

        // Payment validation & calculations
        const tendered = Math.max(0, Number(amountReceived !== undefined ? amountReceived : grandTotal));
        let amountPaid = 0;
        let balanceDue = 0;
        let changeDue = 0;

        if (paymentMethod.toLowerCase() === "cash") {
          if (tendered >= grandTotal) {
            amountPaid = grandTotal;
            changeDue = Math.round(((tendered - grandTotal) + Number.EPSILON) * 100) / 100;
            balanceDue = 0;
          } else {
            amountPaid = tendered;
            balanceDue = Math.round(((grandTotal - tendered) + Number.EPSILON) * 100) / 100;
            changeDue = 0;
          }
        } else if (paymentMethod.toLowerCase() === "credit") {
          amountPaid = Math.min(grandTotal, tendered);
          balanceDue = Math.round(((grandTotal - amountPaid) + Number.EPSILON) * 100) / 100;
          changeDue = 0;
        } else {
          amountPaid = Math.min(grandTotal, tendered > 0 ? tendered : grandTotal);
          balanceDue = Math.round(((grandTotal - amountPaid) + Number.EPSILON) * 100) / 100;
          changeDue = 0;
        }

        const paymentStatus = balanceDue === 0 ? "PAID" : (amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID");

        // Customer resolution
        let resolvedCustomer = customerSnapshot || null;
        let targetCustomerRecord = null;
        if (customerId && customerId !== "walkin_retail") {
          targetCustomerRecord = (db.customers || []).find(
            (c) => c.id === customerId || c._id === customerId || c.customerId === customerId || c.customerCode === customerId
          );
          if (targetCustomerRecord) {
            resolvedCustomer = {
              customerId: targetCustomerRecord.id || targetCustomerRecord.customerId,
              customerCode: targetCustomerRecord.customerCode,
              name: targetCustomerRecord.name,
              contactPerson: targetCustomerRecord.contactPerson || targetCustomerRecord.name,
              mobile: targetCustomerRecord.mobile,
              email: targetCustomerRecord.email || "",
              companyName: targetCustomerRecord.companyName || "",
              gstNumber: targetCustomerRecord.gstNumber || "",
              address: targetCustomerRecord.address || "",
              customerType: targetCustomerRecord.customerType || "BUSINESS"
            };
          }
        }

        if (!resolvedCustomer) {
          resolvedCustomer = {
            customerId: "walkin_retail",
            customerCode: "WALK-IN",
            name: "Walk-in Customer",
            contactPerson: "Walk-in Customer",
            mobile: "9999999999",
            email: "",
            customerType: "INDIVIDUAL"
          };
        }

        // Generate authoritative server-side numbers
        const currentSalesCount = (db.sales || []).length + 4;
        const padding = String(currentSalesCount).padStart(6, "0");
        const saleNo = `POS-2026-${padding}`;
        const invoiceNo = `INV-2026-${padding}`;
        const paymentNo = `PAY-2026-${padding}`;
        const receiptNo = `SR-2026-${padding}`;

        const saleId = generateId("sale");
        const invoiceId = generateId("inv");
        const paymentId = generateId("pay");
        const receiptId = generateId("rcp");
        const timestamp = new Date().toISOString();

        // 1. Sale Entity
        const newSale = {
          _id: saleId,
          id: saleId,
          saleId,
          saleNo,
          branchId,
          branchName,
          customerId: resolvedCustomer.customerId !== "walkin_retail" ? resolvedCustomer.customerId : null,
          customerSnapshot: resolvedCustomer,
          isWalkIn: isWalkIn || resolvedCustomer.customerId === "walkin_retail",
          items: normalizedItems,
          itemCount: normalizedItems.length,
          totalQuantity,
          subtotal,
          discount: { type: discount?.type || "AMOUNT", value: discVal, amount: saleDiscountAmount },
          taxableAmount,
          taxAmount: finalTaxAmount,
          taxBreakdown: {
            cgstRate: 9,
            sgstRate: 9,
            cgstAmount: Math.round(((finalTaxAmount / 2) + Number.EPSILON) * 100) / 100,
            sgstAmount: Math.round(((finalTaxAmount / 2) + Number.EPSILON) * 100) / 100,
            igstRate: 0,
            igstAmount: 0
          },
          roundOff,
          grandTotal,
          amountPaid,
          balanceDue,
          changeDue,
          paymentMethod,
          paymentReference: paymentReference.trim(),
          paymentStatus,
          saleStatus: "COMPLETED",
          source: "POS",
          jobId: jobId || null,
          jobNo: jobNo || null,
          invoiceId,
          invoiceNo,
          receiptId,
          receiptNo,
          printFormat,
          whatsAppShared,
          notes,
          createdBy,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        // 2. Invoice Entity
        const newInvoice = {
          _id: invoiceId,
          id: invoiceId,
          invoiceId,
          invoiceNo,
          source: "POS",
          saleId,
          saleNo,
          jobId: jobId || null,
          jobNo: jobNo || null,
          customerId: resolvedCustomer.customerId !== "walkin_retail" ? resolvedCustomer.customerId : null,
          customerSnapshot: resolvedCustomer,
          branchId,
          branchName,
          items: normalizedItems.map(i => ({
            name: i.productName,
            code: i.productCode,
            quantity: i.quantity,
            unit: i.unit,
            unitPrice: i.unitPrice,
            discount: i.discount,
            taxRate: i.taxRate,
            taxAmount: i.taxAmount,
            lineTotal: i.lineTotal
          })),
          subtotal,
          discountAmount: saleDiscountAmount,
          taxableAmount,
          taxAmount: finalTaxAmount,
          roundOff,
          grandTotal,
          amountPaid,
          balanceDue,
          paymentStatus,
          paymentMethod,
          invoiceDate: timestamp.split("T")[0],
          dueDate: timestamp.split("T")[0],
          createdAt: timestamp
        };

        // 3. Payment Entity
        const newPayment = {
          _id: paymentId,
          id: paymentId,
          paymentId,
          paymentNo,
          source: "POS",
          saleId,
          saleNo,
          invoiceId,
          invoiceNo,
          receiptId,
          receiptNo,
          customerId: resolvedCustomer.customerId !== "walkin_retail" ? resolvedCustomer.customerId : null,
          customerSnapshot: resolvedCustomer,
          branchId,
          branchName,
          paymentMethod,
          paymentReference: paymentReference.trim(),
          amount: amountPaid,
          changeDue,
          status: paymentStatus === "PAID" ? "SUCCESS" : "PARTIAL",
          paymentDate: timestamp.split("T")[0],
          receivedBy: createdBy,
          createdAt: timestamp
        };

        // 4. Receipt Entity
        const newReceipt = {
          _id: receiptId,
          id: receiptId,
          receiptId,
          receiptNo,
          source: "POS",
          saleId,
          saleNo,
          invoiceId,
          invoiceNo,
          customerId: resolvedCustomer.customerId !== "walkin_retail" ? resolvedCustomer.customerId : null,
          customerSnapshot: resolvedCustomer,
          branchId,
          branchName,
          itemsSummary: normalizedItems.map(i => `${i.productName} (${i.quantity})`).join(", "),
          subtotal,
          taxAmount: finalTaxAmount,
          grandTotal,
          amountPaid,
          balanceDue,
          changeDue,
          paymentMethod,
          paymentReference: paymentReference.trim(),
          status: paymentStatus,
          receiptDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          receiptDateTime: timestamp,
          authorizedUser: createdBy,
          printFormat,
          createdAt: timestamp
        };

        // Atomically save all records
        db.sales.unshift(newSale);
        db.invoices.unshift(newInvoice);
        db.payments.unshift(newPayment);
        db.saleReceipts.unshift(newReceipt);

        // Update Customer Record Aggregations
        if (targetCustomerRecord) {
          targetCustomerRecord.saleReceiptsCount = (targetCustomerRecord.saleReceiptsCount || 0) + 1;
          targetCustomerRecord.totalBilled = Math.round(((targetCustomerRecord.totalBilled || 0) + grandTotal + Number.EPSILON) * 100) / 100;
          targetCustomerRecord.balanceDue = Math.round(((targetCustomerRecord.balanceDue || 0) + balanceDue + Number.EPSILON) * 100) / 100;
          targetCustomerRecord.updatedAt = timestamp;
        }

        saveDb(db);

        return createResponse(201, {
          success: true,
          sale: newSale,
          invoice: newInvoice,
          receipt: newReceipt,
          payment: newPayment,
          message: `Sale ${saleNo} completed successfully. Invoice ${invoiceNo} and Receipt ${receiptNo} generated.`
        }, config);
      }

      // 7. Invoices List: GET /pos/invoices
      if (cleanPath === "/pos/invoices" && method === "get") {
        let invList = [...(db.invoices || [])];
        if (params.source && params.source !== "ALL") {
          invList = invList.filter((inv) => inv.source === params.source);
        }
        if (params.paymentStatus && params.paymentStatus !== "ALL") {
          invList = invList.filter((inv) => inv.paymentStatus?.toUpperCase() === params.paymentStatus.toUpperCase());
        }
        if (params.customerId) {
          invList = invList.filter((inv) => inv.customerId === params.customerId);
        }
        if (params.search) {
          const q = params.search.toLowerCase().trim();
          invList = invList.filter(
            (inv) =>
              (inv.invoiceNo && inv.invoiceNo.toLowerCase().includes(q)) ||
              (inv.customerSnapshot?.name && inv.customerSnapshot.name.toLowerCase().includes(q)) ||
              (inv.saleNo && inv.saleNo.toLowerCase().includes(q)) ||
              (inv.jobNo && inv.jobNo.toLowerCase().includes(q))
          );
        }
        return createResponse(200, {
          success: true,
          count: invList.length,
          invoices: invList
        }, config);
      }

      // Single Invoice: GET /pos/invoices/:id
      const invDetailMatch = cleanPath.match(/^\/pos\/invoices\/([^\/]+)$/);
      if (invDetailMatch && method === "get") {
        const invId = invDetailMatch[1];
        const invoice = (db.invoices || []).find(
          (inv) => inv.invoiceId === invId || inv.id === invId || inv.invoiceNo?.toLowerCase() === invId.toLowerCase()
        );
        if (!invoice) {
          return createErrorResponse(404, `Invoice ${invId} not found`, config);
        }
        return createResponse(200, { success: true, invoice }, config);
      }

      // 8. Payments List: GET /pos/payments
      if (cleanPath === "/pos/payments" && method === "get") {
        let payList = [...(db.payments || [])];
        if (params.source && params.source !== "ALL") {
          payList = payList.filter((p) => p.source === params.source);
        }
        if (params.method && params.method !== "ALL") {
          payList = payList.filter((p) => p.paymentMethod?.toLowerCase() === params.method.toLowerCase());
        }
        if (params.search) {
          const q = params.search.toLowerCase().trim();
          payList = payList.filter(
            (p) =>
              (p.paymentNo && p.paymentNo.toLowerCase().includes(q)) ||
              (p.invoiceNo && p.invoiceNo.toLowerCase().includes(q)) ||
              (p.saleNo && p.saleNo.toLowerCase().includes(q)) ||
              (p.customerSnapshot?.name && p.customerSnapshot.name.toLowerCase().includes(q)) ||
              (p.paymentReference && p.paymentReference.toLowerCase().includes(q))
          );
        }
        return createResponse(200, {
          success: true,
          count: payList.length,
          payments: payList
        }, config);
      }

      // 9. Receipts List: GET /pos/receipts
      if (cleanPath === "/pos/receipts" && method === "get") {
        let rcpList = [...(db.saleReceipts || [])];
        if (params.source && params.source !== "ALL") {
          rcpList = rcpList.filter((r) => r.source === params.source);
        }
        if (params.customerId) {
          rcpList = rcpList.filter((r) => r.customerId === params.customerId);
        }
        if (params.search) {
          const q = params.search.toLowerCase().trim();
          rcpList = rcpList.filter(
            (r) =>
              (r.receiptNo && r.receiptNo.toLowerCase().includes(q)) ||
              (r.invoiceNo && r.invoiceNo.toLowerCase().includes(q)) ||
              (r.saleNo && r.saleNo.toLowerCase().includes(q)) ||
              (r.customerSnapshot?.name && r.customerSnapshot.name.toLowerCase().includes(q))
          );
        }
        return createResponse(200, {
          success: true,
          count: rcpList.length,
          receipts: rcpList
        }, config);
      }

      // Single Receipt: GET /pos/receipts/:id
      const rcpDetailMatch = cleanPath.match(/^\/pos\/receipts\/([^\/]+)$/);
      if (rcpDetailMatch && method === "get") {
        const rcpId = rcpDetailMatch[1];
        const receipt = (db.saleReceipts || []).find(
          (r) => r.receiptId === rcpId || r.id === rcpId || r.receiptNo?.toLowerCase() === rcpId.toLowerCase()
        );
        if (!receipt) {
          return createErrorResponse(404, `Receipt ${rcpId} not found`, config);
        }
        return createResponse(200, { success: true, receipt }, config);
      }

      // 10. Returns / Refunds: POST /pos/returns
      if (cleanPath === "/pos/returns" && method === "post") {
        const {
          saleId,
          saleNo,
          itemsReturned = [],
          totalRefundAmount,
          refundMethod = "Cash",
          reason = "",
          processedBy = "Branch Manager"
        } = body || {};

        if (!saleId && !saleNo) {
          return createErrorResponse(400, "Sale ID or Sale No is required for returns.", config);
        }
        if (!itemsReturned || itemsReturned.length === 0) {
          return createErrorResponse(400, "Please select at least one item to return.", config);
        }

        const saleIdx = (db.sales || []).findIndex(
          (s) => s.saleId === saleId || s.saleNo === saleNo || s.id === saleId
        );
        if (saleIdx === -1) {
          return createErrorResponse(404, "Original sale record not found.", config);
        }

        const originalSale = db.sales[saleIdx];
        const returnId = generateId("ret");
        const returnNo = `RET-2026-${String((db.returns || []).length + 2).padStart(6, "0")}`;
        const refundAmt = Math.max(0, Number(totalRefundAmount) || 0);

        const newReturn = {
          _id: returnId,
          id: returnId,
          returnId,
          returnNo,
          saleId: originalSale.saleId,
          saleNo: originalSale.saleNo,
          invoiceNo: originalSale.invoiceNo,
          receiptNo: originalSale.receiptNo,
          customerId: originalSale.customerId,
          customerName: originalSale.customerSnapshot?.name || "Walk-in Customer",
          branchId: originalSale.branchId,
          branchName: originalSale.branchName,
          itemsReturned,
          totalRefundAmount: refundAmt,
          refundMethod,
          reason: (reason || "").trim(),
          status: "COMPLETED",
          processedBy,
          createdAt: new Date().toISOString()
        };

        db.returns.unshift(newReturn);
        originalSale.saleStatus = "RETURNED";
        originalSale.paymentStatus = "REFUNDED";
        originalSale.updatedAt = new Date().toISOString();

        saveDb(db);

        return createResponse(201, {
          success: true,
          returnRecord: newReturn,
          message: `Return ${returnNo} processed successfully. Refund amount of ₹${refundAmt} issued via ${refundMethod}.`
        }, config);
      }

      if (cleanPath === "/pos/returns" && method === "get") {
        return createResponse(200, {
          success: true,
          count: (db.returns || []).length,
          returns: db.returns || []
        }, config);
      }
    }

    // 11. Customer Specific Receipts: GET /customers/:id/receipts
    if (path.includes("/customers/") && path.endsWith("/receipts")) {
      const parts = path.split("/");
      const cId = parts[2];
      const receipts = (db.saleReceipts || []).filter(
        (r) => r.customerId === cId || r.customerSnapshot?.customerId === cId || r.customerSnapshot?.customerCode === cId
      );
      return createResponse(200, {
        success: true,
        count: receipts.length,
        receipts
      }, config);
    }

    // ====================================================
    // STEP 8 & 9: PRODUCTION PLANNING, ORDERS & OPERATIONS APIS
    // ====================================================
    if (
      cleanPath.startsWith("/production") ||
      cleanPath.startsWith("/production-planning") ||
      cleanPath.startsWith("/production-orders") ||
      cleanPath.startsWith("/production-machines") ||
      cleanPath.startsWith("/production-queue") ||
      cleanPath.startsWith("/production-operations")
    ) {
      const user = getAuthUser(config);
      const userBranchId = user?.branchId;
      const isSuperAdmin = user?.role === "admin" || user?.permissions?.all;
      const canAccessBranch = (targetBranchId) => {
        if (isSuperAdmin) return true;
        if (!userBranchId) return true;
        return userBranchId === targetBranchId;
      };

      // 1. Available Production Machines: GET /production/machines
      if ((cleanPath === "/production/machines" || cleanPath === "/production-machines") && method === "get") {
        return createResponse(200, {
          success: true,
          count: (db.productionMachines || []).length,
          machines: db.productionMachines || []
        }, config);
      }

      // 2. Eligible Jobs for Planning List: GET /production/planning
      if ((cleanPath === "/production/planning" || cleanPath === "/production-planning") && method === "get") {
        let items = (db.eligibleJobsForPlanning || []).filter((j) => canAccessBranch(j.branchId));

        if (params.search) {
          const q = params.search.toLowerCase();
          items = items.filter(
            (j) =>
              (j.jobNo && j.jobNo.toLowerCase().includes(q)) ||
              (j.customerName && j.customerName.toLowerCase().includes(q)) ||
              (j.productName && j.productName.toLowerCase().includes(q))
          );
        }

        if (params.priority && params.priority !== "ALL") {
          items = items.filter((j) => j.priority === params.priority);
        }

        if (params.planningStatus && params.planningStatus !== "ALL") {
          items = items.filter((j) => j.planningStatus === params.planningStatus);
        }

        if (params.branch && params.branch !== "ALL") {
          items = items.filter((j) => j.branchName === params.branch || j.branchId === params.branch);
        }

        return createResponse(200, {
          success: true,
          count: items.length,
          eligibleJobs: items
        }, config);
      }

      // 3. Single Eligible Job Details for Planning: GET /production/planning/:jobItemId
      if (
        (cleanPath.startsWith("/production/planning/") || cleanPath.startsWith("/production-planning/")) &&
        method === "get"
      ) {
        const itemId = cleanPath.split("/").pop();
        const jobItem = (db.eligibleJobsForPlanning || []).find(
          (j) => j.jobItemId === itemId || j.jobId === itemId || j.jobNo === itemId
        );

        if (!jobItem) {
          return createErrorResponse(404, "Eligible job item not found for production planning", config);
        }

        if (!canAccessBranch(jobItem.branchId)) {
          return createErrorResponse(404, "Job Item not found in authorized branch scope.", config);
        }

        // Validate design requirement check
        if (jobItem.designRequired && jobItem.designStatus !== "APPROVED") {
          return createErrorResponse(400, "Design approval is required before production planning.", config);
        }

        return createResponse(200, {
          success: true,
          jobItem,
          machines: db.productionMachines || []
        }, config);
      }

      // 4. List Production Orders: GET /production/orders
      if ((cleanPath === "/production/orders" || cleanPath === "/production-orders") && method === "get") {
        let orders = (db.productionOrders || []).filter((o) => canAccessBranch(o.branchId));

        if (params.search) {
          const q = params.search.toLowerCase();
          orders = orders.filter(
            (o) =>
              (o.productionNo && o.productionNo.toLowerCase().includes(q)) ||
              (o.jobNo && o.jobNo.toLowerCase().includes(q)) ||
              (o.customerName && o.customerName.toLowerCase().includes(q)) ||
              (o.productName && o.productName.toLowerCase().includes(q))
          );
        }

        if (params.status && params.status !== "ALL") {
          orders = orders.filter((o) => o.status === params.status);
        }

        if (params.priority && params.priority !== "ALL") {
          orders = orders.filter((o) => o.priority === params.priority);
        }

        if (params.branch && params.branch !== "ALL") {
          orders = orders.filter((o) => o.branchName === params.branch || o.branchId === params.branch);
        }

        return createResponse(200, {
          success: true,
          count: orders.length,
          orders,
          productionOrders: orders
        }, config);
      }

      // 5. Single Production Order Details: GET /production/orders/:id
      if (
        (cleanPath.startsWith("/production/orders/") || cleanPath.startsWith("/production-orders/")) &&
        !cleanPath.endsWith("/qc-history") &&
        !cleanPath.endsWith("/quality-checks") &&
        method === "get"
      ) {
        const orderId = cleanPath.split("/").pop();
        const order = (db.productionOrders || []).find(
          (o) => o.productionOrderId === orderId || o.id === orderId || o.productionNo === orderId
        );

        if (!order) {
          return createErrorResponse(404, "Production Order not found", config);
        }

        if (!canAccessBranch(order.branchId)) {
          return createErrorResponse(404, "Production Order not found in authorized branch scope.", config);
        }

        return createResponse(200, {
          success: true,
          productionOrder: order
        }, config);
      }

      // 6. Create Production Order: POST /production/orders
      if ((cleanPath === "/production/orders" || cleanPath === "/production-orders") && method === "post") {
        const payload = data || {};
        const { jobItemId, jobOrderId, plannedQty, priority, plannedStart, expectedCompletion, operations, notes, allowanceReason } = payload;

        if (!jobItemId) {
          return createErrorResponse(400, "jobItemId is required to plan production.", config);
        }

        // Find eligible item
        const eligibleItem = (db.eligibleJobsForPlanning || []).find(
          (j) => j.jobItemId === jobItemId || j.jobId === jobOrderId
        );

        if (!eligibleItem) {
          return createErrorResponse(400, "Job item is not in eligible state for production planning.", config);
        }

        // Design approval validation
        if (eligibleItem.designRequired && eligibleItem.designStatus !== "APPROVED") {
          return createErrorResponse(400, "Design approval is required before production planning.", config);
        }

        // Duplicate protection: Check if active production order already exists at cycle 0
        const existingOrder = (db.productionOrders || []).find(
          (o) => o.jobItemId === eligibleItem.jobItemId && o.currentCycleNo === 0 && o.status !== "CANCELLED"
        );

        if (existingOrder) {
          return createErrorResponse(400, `Production order ${existingOrder.productionNo} already exists for this job item.`, config);
        }

        const effectivePlannedQty = Number(plannedQty) || eligibleItem.requiredQuantity;
        if (effectivePlannedQty <= 0) {
          return createErrorResponse(400, "Planned quantity must be greater than zero.", config);
        }

        // Server-side Sequential Order Number Generation
        const nextOrderIndex = (db.productionOrders || []).length + 19;
        const currentYear = new Date().getFullYear();
        const productionNo = `PR-KO-2610-${String(nextOrderIndex).padStart(4, "0")}`;
        const productionOrderId = generateId("po_2026");

        // Build deterministic sequence of operations in PENDING status
        const rawOps = Array.isArray(operations) && operations.length > 0 ? operations : eligibleItem.suggestedOperations || [];
        const builtOperations = rawOps.map((op, idx) => {
          const matchedMach = (db.productionMachines || []).find(
            (m) => m.machineId === op.machineId || m.machineName === op.machineName || m.machineId === op.defaultMachineId
          );
          return {
            operationId: generateId("op_2026"),
            productionOrderId,
            sequenceNo: idx + 1,
            operationCode: op.operationCode || "PRINTING",
            operationName: op.operationName || "Printing",
            machineId: matchedMach ? matchedMach.machineId : (op.machineId || null),
            machineName: matchedMach ? matchedMach.machineName : (op.machineName || "To be assigned"),
            assignedEmployeeId: op.assignedEmployeeId || null,
            assignedEmployeeName: op.assignedEmployeeName || null,
            plannedQty: effectivePlannedQty,
            estimatedMinutes: op.estimatedMinutes || 30,
            status: "PENDING", // Initial operation status: PENDING
            cycleNo: 0,
            remarks: op.remarks || ""
          };
        });

        const newProductionOrder = {
          productionOrderId,
          id: productionOrderId,
          productionNo,
          jobOrderId: eligibleItem.jobId,
          jobNo: eligibleItem.jobNo,
          jobItemId: eligibleItem.jobItemId,
          branchId: eligibleItem.branchId || "64f1a2b3c4d5e6f7a8b90001",
          branchName: eligibleItem.branchName || "Kothanur",
          customerCode: eligibleItem.customerCode,
          customerName: eligibleItem.customerName,
          customerMobile: eligibleItem.customerMobile,
          customerEmail: eligibleItem.customerEmail,
          productName: eligibleItem.productName,
          productType: eligibleItem.productType,
          status: "PLANNED", // Starts as PLANNED at Step 8
          priority: priority || eligibleItem.priority || "NORMAL",
          requiredQty: eligibleItem.requiredQuantity,
          plannedQty: effectivePlannedQty,
          actualQty: 0,
          allowancePercent: effectivePlannedQty > eligibleItem.requiredQuantity ? Math.round(((effectivePlannedQty - eligibleItem.requiredQuantity) / eligibleItem.requiredQuantity) * 100) : 0,
          allowanceReason: allowanceReason || (effectivePlannedQty !== eligibleItem.requiredQuantity ? "Machine setup & trim allowance" : ""),
          plannedStart: plannedStart || new Date().toISOString(),
          plannedStartTime: "09:00 AM",
          expectedCompletion: expectedCompletion || eligibleItem.dueDate || new Date(Date.now() + 86400000).toISOString(),
          expectedCompletionTime: "05:00 PM",
          dueDate: eligibleItem.dueDate || "2026-10-25",
          approvedSample: eligibleItem.approvedSample || null,
          requirementSnapshot: eligibleItem.requirementSnapshot || {},
          operations: builtOperations,
          currentCycleNo: 0,
          notes: notes || `Planned on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
          createdBy: "Arun Kumar (Branch Manager)",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          auditLog: [
            {
              event: "PRODUCTION_PLANNING_STARTED",
              actor: "Arun Kumar (Branch Manager)",
              timestamp: new Date().toISOString(),
              notes: "Production process planned and operation parameters established"
            },
            {
              event: "PRODUCTION_ORDER_CREATED",
              actor: "Arun Kumar (Branch Manager)",
              timestamp: new Date().toISOString(),
              notes: `Production Order ${productionNo} generated in PLANNED status with ${builtOperations.length} operations`
            }
          ]
        };

        // Update db collections atomically
        if (!db.productionOrders) db.productionOrders = [];
        db.productionOrders.unshift(newProductionOrder);

        // Update eligibleJobsForPlanning entry to reflect PLANNED status
        eligibleItem.planningStatus = "PLANNED";
        eligibleItem.hasActiveOrder = true;
        eligibleItem.existingProductionNo = productionNo;

        saveDb(db);

        return createResponse(201, {
          success: true,
          productionOrder: newProductionOrder,
          message: `Production Order ${productionNo} created successfully with status PLANNED.`
        }, config);
      }

      // ====================================================
      // STEP 9: PRODUCTION QUEUE & OPERATION EXECUTION APIS
      // ====================================================

      // 7. Production Queue: GET /production/queue
      if ((cleanPath === "/production/queue" || cleanPath === "/production-queue") && method === "get") {
        const allOrders = db.productionOrders || [];
        const activeOrders = allOrders.filter((o) => o.status !== "CANCELLED" && canAccessBranch(o.branchId));

        // Flatten operations with computed availability state and parent context
        let queueItems = [];
        activeOrders.forEach((order) => {
          const ops = order.operations || [];
          ops.forEach((op, idx) => {
            // Sequential eligibility calculation
            // Operation K is READY only when all operations with sequence < K are COMPLETED or SKIPPED
            const prevOps = ops.filter((p) => p.sequenceNo < op.sequenceNo);
            const allPrevCompleted = prevOps.every((p) => p.status === "COMPLETED" || p.status === "SKIPPED");
            
            let availabilityStatus = op.status; // "RUNNING", "COMPLETED", "FAILED"
            if (order.status === "ON_HOLD") {
              availabilityStatus = "ON_HOLD";
            } else if (op.status === "RUNNING") {
              availabilityStatus = "RUNNING";
            } else if (op.status === "COMPLETED") {
              availabilityStatus = "COMPLETED";
            } else if (op.status === "FAILED") {
              availabilityStatus = "FAILED";
            } else if (op.status === "PENDING") {
              availabilityStatus = allPrevCompleted ? "READY" : "BLOCKED";
            }

            queueItems.push({
              operationId: op.operationId || `op_${order.productionNo}_${op.sequenceNo}`,
              productionOrderId: order.productionOrderId,
              productionNo: order.productionNo,
              jobOrderId: order.jobOrderId,
              jobNo: order.jobNo,
              jobItemId: order.jobItemId,
              branchId: order.branchId,
              branchName: order.branchName,
              customerCode: order.customerCode,
              customerName: order.customerName,
              customerMobile: order.customerMobile,
              productName: order.productName,
              productType: order.productType,
              sequenceNo: op.sequenceNo,
              totalSteps: ops.length,
              operationCode: op.operationCode,
              operationName: op.operationName,
              machineId: op.machineId,
              machineName: op.machineName,
              assignedEmployeeId: op.assignedEmployeeId,
              assignedEmployeeName: op.assignedEmployeeName,
              plannedQty: op.plannedQty || order.plannedQty,
              requiredQty: order.requiredQty,
              inputQty: op.inputQty,
              outputQty: op.outputQty,
              completedQty: op.completedQty,
              wastageQty: op.wastageQty,
              estimatedMinutes: op.estimatedMinutes || 20,
              dbStatus: op.status,
              availabilityStatus, // "READY", "RUNNING", "BLOCKED", "COMPLETED", "ON_HOLD"
              priority: order.priority || "NORMAL",
              dueDate: order.dueDate,
              orderStatus: order.status,
              startAt: op.startAt,
              endAt: op.endAt,
              remarks: op.remarks,
              cycleNo: op.cycleNo || 0,
              approvedSample: order.approvedSample,
              requirementSnapshot: order.requirementSnapshot
            });
          });
        });

        // Filter by branch scope
        if (params.branch && params.branch !== "ALL") {
          queueItems = queueItems.filter((item) => item.branchName === params.branch || item.branchId === params.branch);
        }

        // Filter by search query
        if (params.search) {
          const q = params.search.toLowerCase();
          queueItems = queueItems.filter(
            (item) =>
              (item.productionNo && item.productionNo.toLowerCase().includes(q)) ||
              (item.jobNo && item.jobNo.toLowerCase().includes(q)) ||
              (item.customerName && item.customerName.toLowerCase().includes(q)) ||
              (item.productName && item.productName.toLowerCase().includes(q)) ||
              (item.operationName && item.operationName.toLowerCase().includes(q)) ||
              (item.machineName && item.machineName.toLowerCase().includes(q)) ||
              (item.assignedEmployeeName && item.assignedEmployeeName.toLowerCase().includes(q))
          );
        }

        // Filter by availability status
        if (params.status && params.status !== "ALL") {
          queueItems = queueItems.filter((item) => item.availabilityStatus === params.status);
        }

        // Filter by operation code
        if (params.operation && params.operation !== "ALL") {
          queueItems = queueItems.filter((item) => item.operationCode === params.operation);
        }

        // Filter by priority
        if (params.priority && params.priority !== "ALL") {
          queueItems = queueItems.filter((item) => item.priority === params.priority);
        }

        // Filter by machine
        if (params.machine && params.machine !== "ALL") {
          queueItems = queueItems.filter((item) => item.machineId === params.machine || item.machineName === params.machine);
        }

        // Filter by assigned operator
        if (params.operator && params.operator !== "ALL") {
          queueItems = queueItems.filter((item) => item.assignedEmployeeName === params.operator || item.assignedEmployeeId === params.operator);
        }

        // Queue Metrics
        const totalPlanned = activeOrders.filter((o) => o.status === "PLANNED").length;
        const readyCount = queueItems.filter((i) => i.availabilityStatus === "READY").length;
        const runningCount = queueItems.filter((i) => i.availabilityStatus === "RUNNING").length;
        const onHoldCount = activeOrders.filter((o) => o.status === "ON_HOLD").length;
        const completedTodayCount = queueItems.filter((i) => i.availabilityStatus === "COMPLETED").length;

        return createResponse(200, {
          success: true,
          count: queueItems.length,
          metrics: {
            totalPlanned,
            readyCount,
            runningCount,
            onHoldCount,
            completedTodayCount
          },
          queue: queueItems
        }, config);
      }

      // 8. Single Operation Detail: GET /production/operations/:id
      if (
        (cleanPath.startsWith("/production/operations/") || cleanPath.startsWith("/production-operations/")) &&
        method === "get" &&
        !cleanPath.endsWith("/start") &&
        !cleanPath.endsWith("/complete")
      ) {
        const opId = cleanPath.split("/").pop();
        let targetOrder = null;
        let targetOp = null;

        const allOrders = db.productionOrders || [];
        for (const order of allOrders) {
          const matchedOp = (order.operations || []).find(
            (o) => o.operationId === opId || `${order.productionNo}_${o.sequenceNo}` === opId
          );
          if (matchedOp) {
            targetOrder = order;
            targetOp = matchedOp;
            break;
          }
        }

        if (!targetOrder || !targetOp) {
          return createErrorResponse(404, "Production operation not found or unavailable.", config);
        }

        // Compute eligibility
        const prevOps = (targetOrder.operations || []).filter((p) => p.sequenceNo < targetOp.sequenceNo);
        const allPrevCompleted = prevOps.every((p) => p.status === "COMPLETED" || p.status === "SKIPPED");
        let availabilityStatus = targetOp.status;
        if (targetOrder.status === "ON_HOLD") {
          availabilityStatus = "ON_HOLD";
        } else if (targetOp.status === "PENDING") {
          availabilityStatus = allPrevCompleted ? "READY" : "BLOCKED";
        }

        return createResponse(200, {
          success: true,
          operation: {
            ...targetOp,
            availabilityStatus,
            allPrevCompleted
          },
          productionOrder: targetOrder,
          availableMachines: db.productionMachines || []
        }, config);
      }

      // Claim Operation: POST /production-operations/:id/claim
      if (
        (cleanPath.includes("/production/operations/") || cleanPath.includes("/production-operations/")) &&
        cleanPath.endsWith("/claim") &&
        method === "post"
      ) {
        const parts = cleanPath.split("/");
        const opId = parts[parts.length - 2];
        return createResponse(200, {
          success: true,
          message: `Operation ${opId} claimed successfully`,
          data: { operationId: opId, status: "CLAIMED", claimedAt: new Date().toISOString() }
        }, config);
      }

      // 9. Start Operation: POST /production/operations/:id/start
      if (
        (cleanPath.includes("/production/operations/") || cleanPath.includes("/production-operations/")) &&
        cleanPath.endsWith("/start") &&
        method === "post"
      ) {
        const parts = cleanPath.split("/");
        const opId = parts[parts.length - 2];

        let targetOrder = null;
        let targetOp = null;

        const allOrders = db.productionOrders || [];
        for (const order of allOrders) {
          const matchedOp = (order.operations || []).find(
            (o) => o.operationId === opId || `${order.productionNo}_${o.sequenceNo}` === opId
          );
          if (matchedOp) {
            targetOrder = order;
            targetOp = matchedOp;
            break;
          }
        }

        if (!targetOrder || !targetOp) {
          return createErrorResponse(404, "Production operation not found.", config);
        }

        // Check if order is on hold
        if (targetOrder.status === "ON_HOLD") {
          return createErrorResponse(409, `Cannot start operation while Production Order ${targetOrder.productionNo} is ON HOLD. Please resume the order first.`, config);
        }

        // Check if operation is already running or completed
        if (targetOp.status === "RUNNING") {
          return createErrorResponse(409, "Operation is already RUNNING.", config);
        }
        if (targetOp.status === "COMPLETED") {
          return createErrorResponse(409, "Operation is already COMPLETED.", config);
        }

        // Validate sequence: all previous operations must be completed or skipped
        const prevOps = (targetOrder.operations || []).filter((p) => p.sequenceNo < targetOp.sequenceNo);
        const allPrevCompleted = prevOps.every((p) => p.status === "COMPLETED" || p.status === "SKIPPED");
        if (!allPrevCompleted) {
          return createErrorResponse(409, "Previous sequential operation must be completed before starting this step.", config);
        }

        // Transition operation PENDING -> RUNNING
        const now = new Date().toISOString();
        targetOp.status = "RUNNING";
        targetOp.startAt = now;

        const payload = data || {};
        if (payload.machineId) {
          const mach = (db.productionMachines || []).find((m) => m.machineId === payload.machineId);
          targetOp.machineId = payload.machineId;
          if (mach) targetOp.machineName = mach.machineName;
        }
        if (payload.assignedEmployeeName) {
          targetOp.assignedEmployeeName = payload.assignedEmployeeName;
        }

        // If Production Order was PLANNED, transition to IN_PROGRESS
        if (targetOrder.status === "PLANNED") {
          targetOrder.status = "IN_PROGRESS";
          if (!targetOrder.actualStart) {
            targetOrder.actualStart = now;
          }
        }

        // Audit log event
        if (!targetOrder.auditLog) targetOrder.auditLog = [];
        targetOrder.auditLog.unshift({
          event: "OPERATION_STARTED",
          actor: targetOp.assignedEmployeeName || "Operator",
          timestamp: now,
          notes: `Operation ${targetOp.sequenceNo} (${targetOp.operationName}) started on ${targetOp.machineName || "designated machine"}`
        });

        targetOrder.updatedAt = now;
        saveDb(db);

        return createResponse(200, {
          success: true,
          message: `Operation ${targetOp.operationName} started successfully.`,
          operation: targetOp,
          productionOrder: targetOrder
        }, config);
      }

      // 10. Complete Operation: POST /production/operations/:id/complete
      if (
        (cleanPath.includes("/production/operations/") || cleanPath.includes("/production-operations/")) &&
        cleanPath.endsWith("/complete") &&
        method === "post"
      ) {
        const parts = cleanPath.split("/");
        const opId = parts[parts.length - 2];

        let targetOrder = null;
        let targetOp = null;

        const allOrders = db.productionOrders || [];
        for (const order of allOrders) {
          const matchedOp = (order.operations || []).find(
            (o) => o.operationId === opId || `${order.productionNo}_${o.sequenceNo}` === opId
          );
          if (matchedOp) {
            targetOrder = order;
            targetOp = matchedOp;
            break;
          }
        }

        if (!targetOrder || !targetOp) {
          return createErrorResponse(404, "Production operation not found.", config);
        }

        if (targetOp.status !== "RUNNING") {
          return createErrorResponse(409, `Operation must be in RUNNING state to complete (Current state: ${targetOp.status}).`, config);
        }

        const payload = data || {};
        const outputQty = Number(payload.outputQty) || targetOp.plannedQty || targetOrder.plannedQty;
        const wastageQty = Number(payload.wastageQty) || 0;
        const inputQty = Number(payload.inputQty) || targetOp.plannedQty;
        const remarks = payload.remarks || targetOp.remarks || "";

        if (outputQty < 0 || wastageQty < 0 || inputQty < 0) {
          return createErrorResponse(400, "Quantities cannot be negative numbers.", config);
        }

        const now = new Date().toISOString();
        targetOp.status = "COMPLETED";
        targetOp.endAt = now;
        targetOp.inputQty = inputQty;
        targetOp.outputQty = outputQty;
        targetOp.completedQty = outputQty;
        targetOp.wastageQty = wastageQty;
        targetOp.remarks = remarks;

        // Process material consumption record if supplied
        if (Array.isArray(payload.consumption) && payload.consumption.length > 0) {
          targetOp.consumptionRecords = payload.consumption;
        }

        // Audit log
        if (!targetOrder.auditLog) targetOrder.auditLog = [];
        targetOrder.auditLog.unshift({
          event: "OPERATION_COMPLETED",
          actor: targetOp.assignedEmployeeName || "Operator",
          timestamp: now,
          notes: `Operation ${targetOp.sequenceNo} (${targetOp.operationName}) completed. Output: ${outputQty} pcs, Wastage: ${wastageQty} pcs.`
        });

        // CRITICAL BOUNDARY: Do NOT mark ProductionOrder as COMPLETED on last operation.
        // It remains in IN_PROGRESS and becomes ready for the future QC stage.
        targetOrder.updatedAt = now;
        saveDb(db);

        return createResponse(200, {
          success: true,
          message: `Operation ${targetOp.operationName} completed successfully. Output: ${outputQty} pcs recorded.`,
          operation: targetOp,
          productionOrder: targetOrder
        }, config);
      }

      // 11. Hold Production Order: POST /production/orders/:id/hold
      if (
        (cleanPath.includes("/production/orders/") || cleanPath.includes("/production-orders/")) &&
        cleanPath.endsWith("/hold") &&
        method === "post"
      ) {
        const parts = cleanPath.split("/");
        const orderId = parts[parts.length - 2];

        const targetOrder = (db.productionOrders || []).find(
          (o) => o.productionOrderId === orderId || o.id === orderId || o.productionNo === orderId
        );

        if (!targetOrder) {
          return createErrorResponse(404, "Production order not found.", config);
        }

        if (targetOrder.status === "ON_HOLD") {
          return createErrorResponse(409, "Production order is already ON HOLD.", config);
        }

        const payload = data || {};
        const holdReason = payload.reason || "Machine maintenance / Material hold";
        const now = new Date().toISOString();

        targetOrder.status = "ON_HOLD";
        targetOrder.holdReason = holdReason;
        targetOrder.heldBy = payload.heldBy || "Operator / Production Lead";
        targetOrder.heldAt = now;

        if (!targetOrder.auditLog) targetOrder.auditLog = [];
        targetOrder.auditLog.unshift({
          event: "PRODUCTION_HOLD",
          actor: targetOrder.heldBy,
          timestamp: now,
          notes: `Order placed on hold: "${holdReason}"`
        });

        targetOrder.updatedAt = now;
        saveDb(db);

        return createResponse(200, {
          success: true,
          message: `Production Order ${targetOrder.productionNo} is now ON HOLD.`,
          productionOrder: targetOrder
        }, config);
      }

      // 12. Resume Production Order: POST /production/orders/:id/resume
      if (
        (cleanPath.includes("/production/orders/") || cleanPath.includes("/production-orders/")) &&
        cleanPath.endsWith("/resume") &&
        method === "post"
      ) {
        const parts = cleanPath.split("/");
        const orderId = parts[parts.length - 2];

        const targetOrder = (db.productionOrders || []).find(
          (o) => o.productionOrderId === orderId || o.id === orderId || o.productionNo === orderId
        );

        if (!targetOrder) {
          return createErrorResponse(404, "Production order not found.", config);
        }

        if (targetOrder.status !== "ON_HOLD") {
          return createErrorResponse(409, "Production order is not ON HOLD.", config);
        }

        const payload = data || {};
        const now = new Date().toISOString();

        targetOrder.status = "IN_PROGRESS";
        targetOrder.resumedBy = payload.resumedBy || "Operator / Production Lead";
        targetOrder.resumedAt = now;

        if (!targetOrder.auditLog) targetOrder.auditLog = [];
        targetOrder.auditLog.unshift({
          event: "PRODUCTION_RESUMED",
          actor: targetOrder.resumedBy,
          timestamp: now,
          notes: "Production resumed from hold state"
        });

        targetOrder.updatedAt = now;
        saveDb(db);

        return createResponse(200, {
          success: true,
          message: `Production Order ${targetOrder.productionNo} resumed to IN PROGRESS.`,
          productionOrder: targetOrder
        }, config);
      }
    }

    // ====================================================
    // STEP 10: QUALITY CONTROL & REWORK / REPRINT APIS
    // ====================================================
    if (
      cleanPath.startsWith("/quality-control") ||
      cleanPath.startsWith("/quality-checks") ||
      cleanPath.startsWith("/reprint-requests") ||
      (cleanPath.includes("/production-orders/") && cleanPath.includes("/quality-checks")) ||
      (cleanPath.includes("/production-orders/") && cleanPath.includes("/qc-history"))
    ) {
      const user = getAuthUser(config);
      const userBranchId = user?.branchId;
      const isSuperAdmin = user?.role === "admin" || user?.permissions?.all;

      // Helper for branch isolation
      const canAccessBranch = (targetBranchId) => {
        if (isSuperAdmin) return true;
        if (!userBranchId) return true;
        return userBranchId === targetBranchId;
      };

      // 1. Get QC Checklist Template: GET /quality-control/checklists
      if (cleanPath === "/quality-control/checklists" && method === "get") {
        return createResponse(200, {
          success: true,
          checklist: db.qcChecklistTemplate || []
        }, config);
      }

      // 2. Get Defect Catalogue: GET /quality-control/defects
      if (cleanPath === "/quality-control/defects" && method === "get") {
        return createResponse(200, {
          success: true,
          defects: db.defectCatalogue || []
        }, config);
      }

      // 3. QC Queue / Dashboard: GET /quality-control/queue or GET /quality-checks/queue or GET /quality-checks/pending
      if (
        (cleanPath === "/quality-control/queue" || cleanPath === "/quality-checks/queue" || cleanPath === "/quality-checks/pending" || cleanPath === "/quality-control") &&
        method === "get"
      ) {
        // Collect production orders ready for QC
        let eligibleOrders = (db.productionOrders || []).filter((order) => {
          // Branch isolation check
          if (!canAccessBranch(order.branchId)) return false;

          // Check if order has completed production operations or is in QC status
          const ops = order.operations || [];
          const allOpsCompleted = ops.length > 0 && ops.every((op) => op.status === "COMPLETED" || op.status === "SKIPPED");
          return order.status === "QC" || allOpsCompleted || order.status === "QC_PASSED" || order.status === "QC_ISSUE";
        });

        // Filter by search, priority, status
        const q = (params.search || "").toLowerCase();
        const pFilter = params.priority;
        const sFilter = params.status;

        if (q) {
          eligibleOrders = eligibleOrders.filter(
            (o) =>
              (o.productionNo && o.productionNo.toLowerCase().includes(q)) ||
              (o.jobNo && o.jobNo.toLowerCase().includes(q)) ||
              (o.customerName && o.customerName.toLowerCase().includes(q)) ||
              (o.productName && o.productName.toLowerCase().includes(q))
          );
        }

        if (pFilter && pFilter !== "ALL") {
          eligibleOrders = eligibleOrders.filter((o) => o.priority === pFilter);
        }

        // Attach computed QC status to each order
        const queueItems = eligibleOrders.map((order) => {
          const matchingChecks = (db.qualityChecks || []).filter(
            (qc) => qc.productionOrderId === (order.id || order.productionOrderId || order.productionNo)
          );
          const latestCheck = matchingChecks[matchingChecks.length - 1];

          let qcStatus = "PENDING";
          if (latestCheck) {
            qcStatus = latestCheck.result === "PASS" ? "PASSED" : (latestCheck.correctiveAction === "REWORK" ? "REWORK_REQUESTED" : "REPRINT_REQUESTED");
          } else if (order.status === "QC_PASSED") {
            qcStatus = "PASSED";
          } else if (order.status === "QC_ISSUE") {
            qcStatus = "ISSUE_DETECTED";
          }

          const producedQty = order.producedQty || order.goodQty || (order.operations && order.operations.length > 0 ? order.operations[order.operations.length - 1].completedQty : order.plannedQty) || order.plannedQty;

          return {
            ...order,
            producedQty,
            qcStatus,
            latestCheck: latestCheck || null,
            totalChecksCount: matchingChecks.length
          };
        });

        if (sFilter && sFilter !== "ALL") {
          eligibleOrders = queueItems.filter((item) => item.qcStatus === sFilter);
        }

        const metrics = {
          total: queueItems.length,
          pendingQc: queueItems.filter((i) => i.qcStatus === "PENDING" || i.qcStatus === "IN_INSPECTION").length,
          passed: queueItems.filter((i) => i.qcStatus === "PASSED").length,
          reworkIssues: queueItems.filter((i) => i.qcStatus === "REWORK_REQUESTED" || i.qcStatus === "ISSUE_DETECTED").length,
          reprintIssues: queueItems.filter((i) => i.qcStatus === "REPRINT_REQUESTED").length
        };

        const resultList = sFilter && sFilter !== "ALL" ? eligibleOrders : queueItems;
        return createResponse(200, {
          success: true,
          count: queueItems.length,
          metrics,
          data: resultList,
          items: resultList
        }, config);
      }

      // 4. Get QC Production Order Details: GET /quality-control/production-orders/:id or GET /quality-checks/production-orders/:id
      if (
        (cleanPath.startsWith("/quality-control/production-orders/") || cleanPath.startsWith("/quality-checks/production-orders/")) &&
        method === "get"
      ) {
        const orderId = cleanPath.split("/").pop();
        const order = (db.productionOrders || []).find(
          (o) => o.id === orderId || o.productionOrderId === orderId || o.productionNo === orderId
        );

        if (!order) {
          return createErrorResponse(404, "Production Order not found for Quality Inspection.", config);
        }

        if (!canAccessBranch(order.branchId)) {
          return createErrorResponse(404, "Production Order not found in authorized branch scope.", config);
        }

        // Validate that order has reached QC eligibility
        const ops = order.operations || [];
        const allOpsCompleted = ops.length > 0 && ops.every((op) => op.status === "COMPLETED" || op.status === "SKIPPED");
        const isEligible = order.status === "QC" || allOpsCompleted || order.status === "QC_PASSED" || order.status === "QC_ISSUE";

        if (!isEligible && order.status === "PLANNED") {
          return createErrorResponse(400, "Cannot inspect order in PLANNED state. Production execution must complete first.", config);
        }

        if (!isEligible && (order.status === "IN_PROGRESS" || ops.some((op) => op.status === "RUNNING"))) {
          return createErrorResponse(400, "Cannot inspect order while operations are still RUNNING or incomplete.", config);
        }

        // Fetch QC history for this order
        const orderChecks = (db.qualityChecks || []).filter(
          (qc) => qc.productionOrderId === order.id || qc.productionOrderId === order.productionOrderId || qc.productionNo === order.productionNo
        );

        // Fetch active reprint requests
        const orderReprints = (db.reprintRequests || []).filter(
          (rp) => rp.productionOrderId === order.id || rp.productionOrderId === order.productionOrderId || rp.productionNo === order.productionNo
        );

        const producedQty = order.producedQty || order.goodQty || (ops.length > 0 ? ops[ops.length - 1].completedQty : order.plannedQty) || order.plannedQty;

        return createResponse(200, {
          success: true,
          productionOrder: {
            ...order,
            producedQty
          },
          qcHistory: orderChecks,
          reprintRequests: orderReprints,
          checklistTemplate: db.qcChecklistTemplate || [],
          defectCatalogue: db.defectCatalogue || []
        }, config);
      }

      // 5. Submit Quality Check: POST /quality-checks or POST /production-orders/:id/quality-checks
      if (
        ((cleanPath === "/quality-checks" || cleanPath === "/quality-control/submit") ||
         (cleanPath.includes("/production-orders/") && cleanPath.endsWith("/quality-checks"))) &&
        method === "post"
      ) {
        const payload = data || {};
        const targetOrderId = payload.productionOrderId || cleanPath.split("/")[2];

        const targetOrder = (db.productionOrders || []).find(
          (o) => o.id === targetOrderId || o.productionOrderId === targetOrderId || o.productionNo === targetOrderId
        );

        if (!targetOrder) {
          return createErrorResponse(404, "Production Order not found.", config);
        }

        if (!canAccessBranch(targetOrder.branchId)) {
          return createErrorResponse(404, "Production Order not found in authorized branch.", config);
        }

        // Validate Entry State
        const ops = targetOrder.operations || [];
        const anyRunning = ops.some((op) => op.status === "RUNNING");
        if (anyRunning) {
          return createErrorResponse(400, "Cannot perform QC while production operations are still RUNNING.", config);
        }

        // Quantity Reconciliation Validation
        const quantityChecked = Number(payload.quantityChecked || payload.inspectedQty || 0);
        const acceptedQty = Number(payload.acceptedQty || 0);
        const rejectedQty = Number(payload.rejectedQty || 0);

        if (quantityChecked <= 0) {
          return createErrorResponse(422, "Quantity checked must be greater than zero.", config);
        }
        if (acceptedQty < 0 || rejectedQty < 0) {
          return createErrorResponse(422, "Accepted or rejected quantities cannot be negative.", config);
        }
        if (acceptedQty + rejectedQty !== quantityChecked) {
          return createErrorResponse(
            422,
            `Reconciliation Mismatch: Accepted Qty (${acceptedQty}) + Rejected Qty (${rejectedQty}) must equal Quantity Checked (${quantityChecked}).`,
            config
          );
        }

        const result = payload.result; // "PASS" | "ISSUE"
        if (!result || (result !== "PASS" && result !== "ISSUE")) {
          return createErrorResponse(422, "Quality Check result must be either 'PASS' or 'ISSUE'.", config);
        }

        const now = new Date().toISOString();
        const currentCycleNo = targetOrder.currentCycleNo || 0;
        const checkId = generateId("qc");
        const qcNo = `QC-KO-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

        let correctiveAction = "NONE";

        if (result === "PASS") {
          correctiveAction = "NONE";
          if (rejectedQty > 0) {
            return createErrorResponse(422, "A 'PASS' result cannot have rejected quantities. If defects exist, select 'ISSUE'.", config);
          }
          // Update Order State to QC_PASSED / Ready for next stage
          targetOrder.status = "QC_PASSED";
          targetOrder.qcStatus = "PASSED";
          targetOrder.acceptedQty = acceptedQty;
          targetOrder.rejectedQty = 0;
        } else {
          // ISSUE Flow
          correctiveAction = payload.correctiveAction; // "REWORK" | "REPRINT"
          if (!correctiveAction || (correctiveAction !== "REWORK" && correctiveAction !== "REPRINT")) {
            return createErrorResponse(422, "Quality Issue requires a corrective action: either 'REWORK' or 'REPRINT'.", config);
          }
          if (rejectedQty <= 0) {
            return createErrorResponse(422, "Quality Issue must specify rejected quantity > 0.", config);
          }
          if (!payload.defects || payload.defects.length === 0) {
            return createErrorResponse(422, "Quality Issue requires at least one defect category to be logged.", config);
          }

          // Handle Rework vs Reprint
          if (correctiveAction === "REWORK") {
            const restartOpCode = payload.restartFromOperationCode || "PRINTING";
            const newCycleNo = `R${(targetOrder.reworkCount || 0) + 1}`;
            targetOrder.reworkCount = (targetOrder.reworkCount || 0) + 1;
            targetOrder.currentCycleNo = newCycleNo;
            targetOrder.status = "IN_PROGRESS"; // Return to IN_PROGRESS for rework execution

            // Find restart sequence point
            const restartIdx = targetOrder.operations.findIndex((op) => op.operationCode === restartOpCode || op.operationName.toLowerCase().includes(restartOpCode.toLowerCase()));
            const targetSeq = restartIdx >= 0 ? targetOrder.operations[restartIdx].sequenceNo : 1;

            // Reset operations from restart point to PENDING for the rework cycle
            targetOrder.operations = targetOrder.operations.map((op) => {
              if (op.sequenceNo >= targetSeq) {
                return {
                  ...op,
                  status: "PENDING",
                  cycleNo: newCycleNo,
                  isRework: true,
                  plannedQty: rejectedQty,
                  completedQty: 0,
                  wastageQty: 0,
                  startAt: null,
                  completedAt: null
                };
              }
              return op;
            });
          } else if (correctiveAction === "REPRINT") {
            targetOrder.status = "QC_ISSUE";
            const reprintId = generateId("rep");
            const reprintNo = `RP-KO-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

            const newReprint = {
              id: reprintId,
              reprintNo,
              productionOrderId: targetOrder.id || targetOrder.productionOrderId,
              productionNo: targetOrder.productionNo,
              jobOrderId: targetOrder.jobOrderId,
              jobNo: targetOrder.jobNo,
              jobItemId: targetOrder.jobItemId,
              customerName: targetOrder.customerName,
              productName: targetOrder.productName,
              branchId: targetOrder.branchId,
              branchName: targetOrder.branchName,
              quantity: rejectedQty,
              originalCycleNo: currentCycleNo,
              reworkCycleNo: `RP${(targetOrder.reprintCount || 0) + 1}`,
              sourceStage: payload.sourceStage || "PACKING",
              restartFromOperationCode: payload.restartFromOperationCode || "PRINTING",
              reason: payload.issueDetails || payload.comments || "Defects detected during QC inspection",
              defects: payload.defects || [],
              status: "REQUESTED",
              type: "REPRINT",
              requestedBy: payload.checkedBy || user?.name || "Lakshmi P (QC Inspector)",
              requestedById: user?._id || user?.id,
              requestedAt: now,
              createdAt: now
            };

            if (!db.reprintRequests) db.reprintRequests = [];
            db.reprintRequests.unshift(newReprint);
          }
        }

        // Create QualityCheck Record
        const newQualityCheck = {
          id: checkId,
          qcNo,
          productionOrderId: targetOrder.id || targetOrder.productionOrderId,
          productionNo: targetOrder.productionNo,
          jobOrderId: targetOrder.jobOrderId,
          jobNo: targetOrder.jobNo,
          jobItemId: targetOrder.jobItemId,
          customerName: targetOrder.customerName,
          customerCode: targetOrder.customerCode,
          productName: targetOrder.productName,
          branchId: targetOrder.branchId,
          branchName: targetOrder.branchName,
          checkType: payload.checkType || "FINAL",
          cycleNo: currentCycleNo,
          quantityChecked,
          acceptedQty,
          rejectedQty,
          result,
          correctiveAction,
          checklist: payload.checklist || [],
          defects: payload.defects || [],
          issueDetails: payload.issueDetails || "",
          comments: payload.comments || "",
          checkedBy: payload.checkedBy || user?.name || "Lakshmi P",
          checkedById: user?._id || user?.id,
          checkedAt: now,
          createdAt: now
        };

        if (!db.qualityChecks) db.qualityChecks = [];
        db.qualityChecks.unshift(newQualityCheck);

        // Audit Logging
        if (!targetOrder.auditLog) targetOrder.auditLog = [];
        targetOrder.auditLog.unshift({
          event: result === "PASS" ? "QC_PASSED" : "QC_ISSUE",
          actor: newQualityCheck.checkedBy,
          timestamp: now,
          notes: result === "PASS"
            ? `QC Passed: ${acceptedQty} pcs accepted.`
            : `QC Issue: ${rejectedQty} pcs rejected (${correctiveAction}) • Reasons: ${(payload.defects || []).map((d) => d.code).join(", ")}`
        });

        targetOrder.updatedAt = now;
        saveDb(db);

        return createResponse(201, {
          success: true,
          message: result === "PASS" ? "Quality check passed successfully." : `Quality issue logged with corrective action (${correctiveAction}).`,
          qualityCheck: newQualityCheck,
          productionOrder: targetOrder
        }, config);
      }

      // 6. Get Reprint & Rework Requests: GET /reprint-requests
      if (cleanPath === "/reprint-requests" && method === "get") {
        let requests = (db.reprintRequests || []).filter((rp) => canAccessBranch(rp.branchId));
        if (params.status && params.status !== "ALL") {
          requests = requests.filter((rp) => rp.status === params.status);
        }
        return createResponse(200, {
          success: true,
          count: requests.length,
          reprintRequests: requests
        }, config);
      }

      // 7. Get Single Reprint Request: GET /reprint-requests/:id
      if (cleanPath.startsWith("/reprint-requests/") && !cleanPath.endsWith("/approve") && !cleanPath.endsWith("/reject") && method === "get") {
        const reqId = cleanPath.split("/").pop();
        const found = (db.reprintRequests || []).find((rp) => rp.id === reqId || rp.reprintNo === reqId);
        if (!found) {
          return createErrorResponse(404, "Reprint Request not found.", config);
        }
        if (!canAccessBranch(found.branchId)) {
          return createErrorResponse(404, "Reprint Request not found in authorized branch.", config);
        }
        return createResponse(200, {
          success: true,
          reprintRequest: found
        }, config);
      }

      // 8. Approve Reprint Request: POST /reprint-requests/:id/approve
      if (cleanPath.startsWith("/reprint-requests/") && cleanPath.endsWith("/approve") && method === "post") {
        const parts = cleanPath.split("/");
        const reqId = parts[parts.length - 2];
        const found = (db.reprintRequests || []).find((rp) => rp.id === reqId || rp.reprintNo === reqId);

        if (!found) {
          return createErrorResponse(404, "Reprint request not found.", config);
        }

        if (found.status !== "REQUESTED") {
          return createErrorResponse(409, `Cannot approve reprint request in '${found.status}' status.`, config);
        }

        const now = new Date().toISOString();
        const approverName = user?.name || "Arun Kumar (Branch Manager)";

        found.status = "APPROVED";
        found.approvedBy = approverName;
        found.approvedById = user?._id || user?.id;
        found.approvedAt = now;
        found.reprintCycleNo = `RP${Math.floor(Math.random() * 9 + 1)}`;

        // Spawning / Resetting operations on production order
        const targetOrder = (db.productionOrders || []).find(
          (o) => o.id === found.productionOrderId || o.productionOrderId === found.productionOrderId || o.productionNo === found.productionNo
        );

        if (targetOrder) {
          targetOrder.status = "IN_PROGRESS";
          targetOrder.reprintCount = (targetOrder.reprintCount || 0) + 1;
          targetOrder.currentCycleNo = found.reprintCycleNo;

          // Reset production operations from restart point
          const restartIdx = targetOrder.operations.findIndex((op) => op.operationCode === found.restartFromOperationCode);
          const targetSeq = restartIdx >= 0 ? targetOrder.operations[restartIdx].sequenceNo : 1;

          targetOrder.operations = targetOrder.operations.map((op) => {
            if (op.sequenceNo >= targetSeq) {
              return {
                ...op,
                status: "PENDING",
                cycleNo: found.reprintCycleNo,
                isReprint: true,
                plannedQty: found.quantity,
                completedQty: 0,
                wastageQty: 0,
                startAt: null,
                completedAt: null
              };
            }
            return op;
          });

          if (!targetOrder.auditLog) targetOrder.auditLog = [];
          targetOrder.auditLog.unshift({
            event: "REPRINT_APPROVED",
            actor: approverName,
            timestamp: now,
            notes: `Reprint request ${found.reprintNo} approved for ${found.quantity} pcs. Cycle: ${found.reprintCycleNo}`
          });
        }

        saveDb(db);

        return createResponse(200, {
          success: true,
          message: `Reprint request ${found.reprintNo} approved successfully. Corrective production cycle started.`,
          reprintRequest: found,
          productionOrder: targetOrder
        }, config);
      }

      // 9. Reject Reprint Request: POST /reprint-requests/:id/reject
      if (cleanPath.startsWith("/reprint-requests/") && cleanPath.endsWith("/reject") && method === "post") {
        const parts = cleanPath.split("/");
        const reqId = parts[parts.length - 2];
        const found = (db.reprintRequests || []).find((rp) => rp.id === reqId || rp.reprintNo === reqId);

        if (!found) {
          return createErrorResponse(404, "Reprint request not found.", config);
        }

        if (found.status !== "REQUESTED") {
          return createErrorResponse(409, `Cannot reject reprint request in '${found.status}' status.`, config);
        }

        const payload = data || {};
        const rejectionReason = payload.rejectionReason || "Rejected by production manager";
        const now = new Date().toISOString();
        const rejectorName = user?.name || "Arun Kumar (Branch Manager)";

        found.status = "REJECTED";
        found.rejectionReason = rejectionReason;
        found.rejectedBy = rejectorName;
        found.rejectedById = user?._id || user?.id;
        found.rejectedAt = now;

        saveDb(db);

        return createResponse(200, {
          success: true,
          message: `Reprint request ${found.reprintNo} was rejected.`,
          reprintRequest: found
        }, config);
      }

      // 10. QC History Timeline: GET /production-orders/:id/qc-history
      if (cleanPath.includes("/production-orders/") && cleanPath.endsWith("/qc-history") && method === "get") {
        const parts = cleanPath.split("/");
        const orderId = parts[parts.length - 2];

        const targetOrder = (db.productionOrders || []).find(
          (o) => o.id === orderId || o.productionOrderId === orderId || o.productionNo === orderId
        );

        if (!targetOrder) {
          return createErrorResponse(404, "Production order not found.", config);
        }

        const checks = (db.qualityChecks || []).filter(
          (qc) => qc.productionOrderId === targetOrder.id || qc.productionOrderId === targetOrder.productionOrderId || qc.productionNo === targetOrder.productionNo
        );

        const reprints = (db.reprintRequests || []).filter(
          (rp) => rp.productionOrderId === targetOrder.id || rp.productionOrderId === targetOrder.productionOrderId || rp.productionNo === targetOrder.productionNo
        );

        return createResponse(200, {
          success: true,
          productionNo: targetOrder.productionNo,
          qualityChecks: checks,
          reprintRequests: reprints,
          auditLog: targetOrder.auditLog || []
        }, config);
      }
    }

    // ----------------------------------------------------
    // Delivery Orders Endpoints (Step 6 & 7)
    // ----------------------------------------------------
    if (path.startsWith("/delivery-orders")) {
      db.deliveryOrders = db.deliveryOrders || [];
      if (db.deliveryOrders.length === 0) {
        db.deliveryOrders = [
          {
            id: "DO-2026-0001",
            _id: "DO-2026-0001",
            deliveryNo: "DO-2026-0001",
            jobOrderId: "JOB-2026-00048",
            jobNo: "JOB-2026-00048",
            jobTitle: "Aura Luxury Matte Cosmetic Boxes (2,000 units)",
            customerName: "Priya Menon",
            customerCompany: "Aura Cosmetics Pvt Ltd",
            customerPhone: "9845009988",
            deliveryAddress: "Indiranagar 100ft Road, Bengaluru",
            deliveryType: "COURIER",
            status: "READY_FOR_PACKING",
            itemCount: 2000,
            packageCount: 4,
            createdAt: new Date().toISOString()
          }
        ];
        saveDb(db);
      }

      // Pack action: POST /delivery-orders/:id/pack
      const packMatch = path.match(/^\/delivery-orders\/([^\/]+)\/pack$/);
      if (packMatch && method === "post") {
        const orderId = packMatch[1];
        const idx = db.deliveryOrders.findIndex((o) => o.id === orderId || o._id === orderId || o.deliveryNo === orderId);
        if (idx !== -1) {
          db.deliveryOrders[idx] = {
            ...db.deliveryOrders[idx],
            status: "PACKED",
            packageCount: body?.packageCount || db.deliveryOrders[idx].packageCount || 1,
            packedAt: new Date().toISOString()
          };
          saveDb(db);
          return createResponse(200, { success: true, data: db.deliveryOrders[idx] }, config);
        }
        return createResponse(200, { success: true, data: { id: orderId, status: "PACKED" } }, config);
      }

      // Dispatch action: POST /delivery-orders/:id/dispatch
      const dispatchMatch = path.match(/^\/delivery-orders\/([^\/]+)\/dispatch$/);
      if (dispatchMatch && method === "post") {
        const orderId = dispatchMatch[1];
        const idx = db.deliveryOrders.findIndex((o) => o.id === orderId || o._id === orderId || o.deliveryNo === orderId);
        if (idx !== -1) {
          db.deliveryOrders[idx] = {
            ...db.deliveryOrders[idx],
            status: "OUT_FOR_DELIVERY",
            trackingNumber: body?.trackingNumber || `TRK-${Date.now()}`,
            courierName: body?.courierName || "PrintZ Express Logistics",
            dispatchedAt: new Date().toISOString()
          };
          saveDb(db);
          return createResponse(200, { success: true, data: db.deliveryOrders[idx] }, config);
        }
        return createResponse(200, { success: true, data: { id: orderId, status: "OUT_FOR_DELIVERY" } }, config);
      }

      // Deliver action: POST /delivery-orders/:id/deliver
      const deliverMatch = path.match(/^\/delivery-orders\/([^\/]+)\/deliver$/);
      if (deliverMatch && method === "post") {
        const orderId = deliverMatch[1];
        const idx = db.deliveryOrders.findIndex((o) => o.id === orderId || o._id === orderId || o.deliveryNo === orderId);
        if (idx !== -1) {
          db.deliveryOrders[idx] = {
            ...db.deliveryOrders[idx],
            status: "DELIVERED",
            deliveredAt: new Date().toISOString(),
            recipientName: body?.recipientName || "Authorized Receiver",
            signatureUrl: body?.signatureUrl || "SIGNED"
          };
          saveDb(db);
          return createResponse(200, { success: true, data: db.deliveryOrders[idx] }, config);
        }
        return createResponse(200, { success: true, data: { id: orderId, status: "DELIVERED" } }, config);
      }

      // Single delivery order: GET or PATCH /delivery-orders/:id
      const singleDoMatch = path.match(/^\/delivery-orders\/([^\/]+)$/);
      if (singleDoMatch) {
        const orderId = singleDoMatch[1];
        const idx = db.deliveryOrders.findIndex((o) => o.id === orderId || o._id === orderId || o.deliveryNo === orderId);
        if (method === "get") {
          if (idx === -1) return createErrorResponse(404, "Delivery order not found", config);
          return createResponse(200, { success: true, data: db.deliveryOrders[idx] }, config);
        }
        if (method === "patch" || method === "put") {
          if (idx === -1) return createErrorResponse(404, "Delivery order not found", config);
          db.deliveryOrders[idx] = { ...db.deliveryOrders[idx], ...body, updatedAt: new Date().toISOString() };
          saveDb(db);
          return createResponse(200, { success: true, data: db.deliveryOrders[idx] }, config);
        }
      }

      // List delivery orders: GET /delivery-orders
      if (method === "get") {
        let list = [...db.deliveryOrders];
        if (params.status && params.status !== "ALL") {
          list = list.filter((o) => o.status === params.status);
        }
        return createResponse(200, { success: true, data: list }, config);
      }
    }

    // ----------------------------------------------------
    if (method === "delete" && params.branch) {

      const branchName = params.branch;
      if (path.includes("printer-readings")) {
        db.printerReadings = db.printerReadings.filter((r) => r.branchName !== branchName && r.branch !== branchName);
      } else if (path.includes("jumbo-xerox")) {
        db.jumboReadings = db.jumboReadings.filter((r) => r.branchName !== branchName && r.branch !== branchName);
      } else if (path.includes("stocks")) {
        db.stockReadings = db.stockReadings.filter((r) => r.branchName !== branchName && r.branch !== branchName);
        db.stockItems = db.stockItems.filter((r) => r.branchName !== branchName && r.branch !== branchName);
      } else if (path.includes("total-amounts")) {
        db.totalAmounts = db.totalAmounts.filter((r) => r.branchName !== branchName && r.branch !== branchName);
      } else if (path.includes("payments")) {
        db.payments = db.payments.filter((r) => r.branchName !== branchName && r.branch !== branchName);
      }
      saveDb(db);
      return createResponse(200, { message: `Cleaned up records for branch ${branchName}` }, config);
    }

    // Fallback: If endpoint not explicitly matched, return empty array or success
    console.warn(`[MockServer] Unhandled route: ${method.toUpperCase()} ${path}`);
    return createResponse(200, [], config);

  } catch (err) {
    console.error("[MockServer Error]:", err);
    return createErrorResponse(500, err.message || "Internal Mock Server Error", config);
  }
}

function createResponse(status, data, config) {
  let responseData = data;
  if (Array.isArray(data)) {
    // If it's an array, attach .data and .success property so both res.data.map() and res.data.data.map() work seamlessly
    try {
      Object.defineProperty(responseData, "data", {
        value: data,
        enumerable: false,
        writable: true,
        configurable: true
      });
      Object.defineProperty(responseData, "success", {
        value: true,
        enumerable: false,
        writable: true,
        configurable: true
      });
    } catch (e) {
      responseData.data = data;
      responseData.success = true;
    }
  }
  return {
    data: responseData,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    headers: { "content-type": "application/json" },
    config
  };
}

function createErrorResponse(status, message, config) {
  const error = new Error(message);
  error.response = {
    data: { message, error: message },
    status,
    statusText: status === 401 ? "Unauthorized" : status === 404 ? "Not Found" : "Bad Request",
    headers: { "content-type": "application/json" },
    config
  };
  error.config = config;
  return Promise.reject(error);
}
