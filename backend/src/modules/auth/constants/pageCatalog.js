/**
 * Menu items a role or an employee can be given access to ("Capabilities").
 *
 * Every item has a key (saved on the role or employee). An item is either:
 *   - a page:   { key, label, paths, perms }
 *   - a parent: { key, label, children: [pages] }  (a menu with sub-pages, like Attendance)
 * Only pages are saved. A parent key from older data still works and means "all of its children".
 *
 * paths   front-end routes the page opens. A path also covers everything below it (/jobs covers /jobs/new);
 *         write { path, exact: true } to cover only that route.
 * perms   permission-code prefixes the API needs for that page. Someone who has the page gets branch-level
 *         access to these in the permission middleware, so the page can load its data.
 *
 * To add a menu item, add it here; Role Management and Role Setup read this list from the API.
 */
const page = (key, label, paths, perms = [], extra = {}) => ({ key, label, paths, perms, ...extra });
const parent = (key, label, children) => ({ key, label, children });

const PAGE_GROUPS = [
  {
    group: "Dashboard",
    // Account Sheet and Generate PDF Report sit right under Dashboard, each as its own sidebar item
    items: [
      page("dashboard", "Dashboard", ["/admin-dashboard", "/manager-dashboard"], ["dashboard"]),
      page("account-sheet", "Account Sheet", ["/printer-readings-manager"], ["inventory", "printer", "printers", "printerReadings"]),
      page("pdf-report", "Generate PDF Report", ["/pdf-generator"], ["inventory", "report"]),
    ],
  },
  {
    group: "Sale Orders",
    items: [
      page("sale-orders", "Sale Orders", ["/sale-orders"], ["saleOrder", "customer"]),
    ],
  },
  {
    group: "POS & Billing",
    items: [
      page("pos", "POS Billing", ["/pos", "/v3/sales-pos", "/sales-pos", "/jobflow/pos", "/pos-receipts", "/sales-receipts"], ["pos", "customer", "payment"]),
      page("invoices", "Invoices", ["/jobflow/invoice", "/invoice", "/invoices", "/sales-invoice"], ["invoice", "payment", "customer"]),
      page("settlement", "Settlement", ["/jobflow/settlement", "/settlement"], ["settlement", "payment"]),
    ],
  },
  {
    group: "Job Flow",
    items: [
      parent("customers", "Customers", [
        page("customer-directory", "Customer Directory", ["/jobflow/customers", "/customers", "/v3/customers"], ["customer"]),
        page("branch-qr-form", "Branch QR Form", ["/jobflow/qr-request"], ["customer"]),
      ]),
      page("job-orders", "Job Orders", ["/jobflow/jobs", "/jobs", "/v3/jobs", "/jobflow/designer-jobs", "/designer-jobs"], ["job", "customer", "attachment"]),
      page("estimates", "Estimates & Quotes", ["/jobflow/estimates", "/estimates", "/v3/estimates"], ["estimate", "job", "customer", "attachment"]),
      parent("design", "Design", [
        page("design-queue", "Design Queue", ["/jobflow/design", "/design", "/v3/design"], ["design", "job", "customer", "attachment"]),
        page("design-my-jobs", "Designer My Jobs", ["/jobflow/design", "/design", "/v3/design"], ["design", "job", "customer", "attachment"]),
        page("designer-jobs", "Designer Job Orders", ["/jobflow/designer-jobs", "/designer-jobs"], ["design", "job", "customer", "attachment"]),
        page("designer-dashboard", "Designer Dashboard", ["/designer-dashboard", "/designer/dashboard"], ["dashboard", "design"]),
      ]),
      parent("production", "Production", [
        page(
          "production-orders",
          "Production Orders",
          ["/production/orders", "/production/planning", "/production/dashboard", { path: "/production", exact: true }, "/jobflow/production", "/v3/production", "/jobflow/production-planning", "/production-planning"],
          ["production", "job"]
        ),
        page("production-queue", "Operation Queue", ["/production/queue", "/production/operation-queue"], ["production", "job"]),
        page("production-rework", "Rework & Reprint", ["/production/rework", "/production/reprints", "/production/completed"], ["production", "reprint", "job"]),
        page("production-operators", "Operators", ["/production/operators", "/production/machines"], ["production"]),
        page("production-reports", "Production Reports", ["/production/reports"], ["production", "report"]),
      ]),
      parent("quality-control", "Quality Control", [
        page("qc-queue", "QC Inspection Queue", ["/jobflow/qc", "/quality-control", "/v3/quality-control", "/production/qc"], ["qc", "production", "job"]),
        page("qc-history", "QC History & Reports", ["/jobflow/qc", "/quality-control", "/v3/quality-control", "/production/qc"], ["qc", "production", "job"]),
      ]),
      parent("delivery", "Delivery", [
        page("delivery-dispatch", "Dispatch Delivery", ["/jobflow/delivery", "/delivery"], ["delivery", "job"]),
        page("delivery-pickup", "Self Pickup", ["/jobflow/delivery", "/delivery"], ["delivery", "job"]),
      ]),
      page("master-settings", "Master Defaults", ["/jobflow/master-settings", "/master-settings"], ["admin.master"]),
    ],
  },
  {
    group: "HR",
    items: [
      page("employees", "Employees", ["/employees"], ["admin.employee", "hr.employee", "hr.self"]),
      parent("attendance", "Attendance", [
        page("attendance-setup", "Setup", ["/attendance/setup"], ["hr.attendance", "hr.policy", "hr.holiday", "hr.self"]),
        page("attendance-daily", "Daily Attendance", ["/attendance/daily", { path: "/attendance", exact: true }], ["hr.attendance", "hr.policy.view", "hr.regularization", "hr.leave", "hr.self"]),
        page("attendance-shifts", "Branch Shifts", ["/attendance/branch-shifts"], ["hr.attendance", "admin.employee"]),
        page("attendance-permissions", "Permissions", ["/attendance/permissions"], ["hr.attendance", "hr.leave", "hr.self"]),
        page("attendance-reports", "Reports", ["/attendance/reports"], ["hr.attendance", "hr.self"]),
      ]),
      parent("salary", "Salary & Payroll", [
        page("salary-setup", "Salary Setup", ["/salary/setup"], ["hr.salary", "hr.self"]),
        page("salary-loans", "Loans & Adjustments", ["/salary/loans-adjustments"], ["hr.salary", "hr.self"]),
        page("salary-processing", "Payroll Processing", ["/salary/processing", { path: "/salary", exact: true }], ["hr.salary", "hr.self"]),
        page("salary-records", "Salary Records", ["/salary/records"], ["hr.salary", "hr.self"]),
      ]),
    ],
  },
  {
    group: "Branch & Inventory",
    items: [
      page("branches", "Branch Management", ["/add-branch"], ["branch"]),
      parent("printers", "Printer", [
        page("add-printer", "Add Printer", ["/add-printer-manager"], ["inventory", "printer", "printers"]),
        page("move-printer", "Move Printer", ["/move-printer-manager"], ["inventory", "printer", "printers"]),
        page("printer-list", "Printer List", ["/printer-list", "/printer-list-manager"], ["inventory", "printer", "printers"]),
        page("printer-readings", "Display Readings", ["/printer-readings-manager", "/display-printer-readings", "/display-printer-readings-admin", "/display-printer-readings-manager"], ["inventory", "printer", "printers", "printerReadings"]),
      ]),
      parent("stock", "Stock", [
        page("add-stock", "Add Stock", ["/add-stock-manager", "/add-category"], ["inventory", "stock"]),
        page("move-stock", "Move Stock", ["/move-stock-manager"], ["inventory", "stock"]),
        page("stock-list", "Stock List", ["/stock-list", "/stock-list-manager", "/stock-item-list-manager"], ["inventory", "stock"]),
        page("search-stock", "Search Stock", ["/search-stock-list-admin", "/search-stock-list-manager"], ["inventory", "stock"]),
        page("inventory-tracking", "Inventory Tracking", ["/inventory-tracking"], ["inventory", "stock"]),
      ]),
      page("jumbo-xerox", "Jumbo Xerox", ["/jumbo-xerox", "/add-jumbo-xerox", "/jumbo-xerox-list-admin", "/jumbo-xerox-list-manager", "/jumbo-xerox-csv-verifier"], ["inventory", "printer"]),
    ],
  },
  {
    group: "Accounts & Reports",
    items: [
      parent("revenue", "Revenue Data", [
        page("revenue-daily", "Daily Readings Revenue", ["/admin-daily-readings-revenue"], ["inventory", "dashboard", "report"]),
        page("revenue-stock", "Stock Readings Revenue", ["/admin-stock-readings-revenue"], ["inventory", "dashboard", "report"]),
        page("revenue-totals", "Total Amount", ["/total-amount-display", "/total-amount-list-admin", "/total-amount-list-manager"], ["inventory", "dashboard", "report"]),
        page("previous-balance", "Previous Balance List", ["/previous-balance-list"], ["inventory", "dashboard", "report"]),
      ]),
      page("export-data", "Export Data", ["/export-data"], ["report"]),
      page("delete-requests", "Delete Requests", ["/delete-requests"], []),
      page("past-date-requests", "Past Date Requests", ["/pastDateRequests"], ["approval"]),
    ],
  },
  {
    group: "Manufacturing Unit",
    items: [
      parent("mfg", "Manufacturing Unit", [
        page("mfg-dashboard", "Dashboard", ["/mfg/dashboard", { path: "/mfg", exact: true }], ["mfg", "saleOrder"]),
        page("mfg-orders", "Orders", ["/mfg/orders"], ["mfg", "saleOrder"]),
        page("mfg-queue", "Queue", ["/mfg/queue"], ["mfg", "saleOrder"]),
      ]),
    ],
  },
];

// Every page, flat, with its group. Parents are kept separately.
const PAGE_ITEMS = [];
const PARENTS = {}; // parent key -> [child keys]
PAGE_GROUPS.forEach((g) =>
  g.items.forEach((i) => {
    if (i.children) {
      PARENTS[i.key] = i.children.map((c) => c.key);
      i.children.forEach((c) => PAGE_ITEMS.push({ ...c, group: g.group, parentKey: i.key, parentLabel: i.label }));
    } else {
      PAGE_ITEMS.push({ ...i, group: g.group });
    }
  })
);
// The link a page opens from the sidebar. { to, adminTo }: admins get adminTo when it is given (some pages have a
// manager version and an admin version).
const LINKS = {
  dashboard: { to: "/manager-dashboard", adminTo: "/admin-dashboard" },
  "sale-orders": { to: "/sale-orders" },
  pos: { to: "/pos" },
  invoices: { to: "/jobflow/invoice" },
  settlement: { to: "/jobflow/settlement" },
  "customer-directory": { to: "/customers" },
  "branch-qr-form": { to: "/jobflow/qr-request" },
  "job-orders": { to: "/jobs" },
  estimates: { to: "/estimates" },
  "design-queue": { to: "/jobflow/design?view=queue" },
  "design-my-jobs": { to: "/jobflow/design?view=my-jobs" },
  "designer-jobs": { to: "/jobflow/designer-jobs" },
  "designer-dashboard": { to: "/designer-dashboard" },
  "production-orders": { to: "/production/orders" },
  "production-queue": { to: "/production/queue" },
  "production-rework": { to: "/production/rework" },
  "production-operators": { to: "/production/operators" },
  "production-reports": { to: "/production/reports" },
  "qc-queue": { to: "/jobflow/qc?tab=overview" },
  "qc-history": { to: "/jobflow/qc?tab=history" },
  "delivery-dispatch": { to: "/jobflow/delivery?tab=DISPATCH" },
  "delivery-pickup": { to: "/jobflow/delivery?tab=PICKUP" },
  "master-settings": { to: "/jobflow/master-settings" },
  employees: { to: "/employees" },
  "attendance-setup": { to: "/attendance/setup" },
  "attendance-daily": { to: "/attendance/daily" },
  "attendance-shifts": { to: "/attendance/branch-shifts" },
  "attendance-permissions": { to: "/attendance/permissions" },
  "attendance-reports": { to: "/attendance/reports" },
  "salary-setup": { to: "/salary/setup" },
  "salary-loans": { to: "/salary/loans-adjustments" },
  "salary-processing": { to: "/salary/processing" },
  "salary-records": { to: "/salary/records" },
  branches: { to: "/add-branch" },
  "add-printer": { to: "/add-printer-manager" },
  "move-printer": { to: "/move-printer-manager" },
  "printer-list": { to: "/printer-list-manager", adminTo: "/printer-list" },
  "printer-readings": { to: "/display-printer-readings-manager", adminTo: "/display-printer-readings-admin" },
  "add-stock": { to: "/add-stock-manager" },
  "move-stock": { to: "/move-stock-manager" },
  "stock-list": { to: "/stock-list-manager", adminTo: "/stock-list" },
  "search-stock": { to: "/search-stock-list-manager", adminTo: "/search-stock-list-admin" },
  "inventory-tracking": { to: "/inventory-tracking" },
  "jumbo-xerox": { to: "/jumbo-xerox", adminTo: "/jumbo-xerox-list-admin" },
  "revenue-daily": { to: "/admin-daily-readings-revenue" },
  "revenue-stock": { to: "/admin-stock-readings-revenue" },
  "revenue-totals": { to: "/total-amount-list-manager", adminTo: "/total-amount-list-admin" },
  "previous-balance": { to: "/previous-balance-list" },
  "account-sheet": { to: "/printer-readings-manager" },
  "pdf-report": { to: "/pdf-generator" },
  "export-data": { to: "/export-data" },
  "delete-requests": { to: "/delete-requests" },
  "past-date-requests": { to: "/pastDateRequests" },
  "mfg-dashboard": { to: "/mfg/dashboard" },
  "mfg-orders": { to: "/mfg/orders" },
  "mfg-queue": { to: "/mfg/queue" },
};

// Setup pages are done by an admin: someone who is not an admin does not get them, even if they are ticked.
const ADMIN_ONLY = new Set(["master-settings", "salary-setup", "attendance-setup", "attendance-shifts", "branches", "past-date-requests"]);
PAGE_ITEMS.forEach((i) => {
  i.to = (LINKS[i.key] || {}).to || null;
  i.adminTo = (LINKS[i.key] || {}).adminTo || null;
  i.adminOnly = ADMIN_ONLY.has(i.key);
});

// Map retired sub-page keys so existing roles/users in MongoDB keep access seamlessly
const LEGACY_KEY_MAP = {
  "sale-orders-all": "sale-orders",
  "sale-orders-new": "sale-orders",
};

const PAGE_KEYS = new Set(PAGE_ITEMS.map((i) => i.key));
const VALID_KEYS = new Set([...PAGE_KEYS, ...Object.keys(PARENTS), ...Object.keys(LEGACY_KEY_MAP)]);

/** Turn parent keys into their children, so a list holds pages only. */
const expandKeys = (keys) => {
  const out = [];
  (Array.isArray(keys) ? keys : []).forEach((k) => {
    const rawKey = String(k).trim();
    const key = LEGACY_KEY_MAP[rawKey] || rawKey;
    if (PARENTS[key]) out.push(...PARENTS[key]);
    else if (PAGE_KEYS.has(key)) out.push(key);
  });
  return [...new Set(out)];
};

/**
 * The manufacturing unit's pages. Everyone who works at the unit gets exactly these
 * (dashboard, orders, queue), whatever their role, and nothing else.
 */
const MFG_PAGE_KEYS = expandKeys(["mfg"]);

/** Keep only known keys, as pages, once each. Anything else is dropped so a typo can never grant access. */
const sanitizePageAccess = (keys) => expandKeys((Array.isArray(keys) ? keys : []).filter((k) => VALID_KEYS.has(String(k).trim())));

const itemsFor = (keys, { admin = false } = {}) => {
  const wanted = new Set(expandKeys(keys));
  return PAGE_ITEMS.filter((i) => wanted.has(i.key) && (admin || !i.adminOnly));
};

/** Front-end routes a set of page keys opens. */
const pathsFor = (keys, opts) =>
  itemsFor(keys, opts).flatMap((i) =>
    i.paths.map((p) => (typeof p === "string" ? { path: p, exact: Boolean(i.exact) } : { path: p.path, exact: Boolean(p.exact) }))
  );

/** Permission-code prefixes the API should allow for a set of page keys. */
const permissionPrefixesFor = (keys, opts) => [...new Set(itemsFor(keys, opts).flatMap((i) => i.perms))];

/**
 * The sidebar links for a set of page keys, in menu order: [{ key, label, menu, group, to }].
 * "menu" is the parent's name for a sub-page (for example "Attendance"), or null for a page on its own.
 */
const linksFor = (keys, opts = {}) =>
  itemsFor(keys, opts)
    .filter((i) => i.to)
    .map((i) => ({ key: i.key, label: i.label, menu: i.parentLabel || null, group: i.group, to: (opts.admin && i.adminTo) || i.to }));

/** The list for screens: groups of items; an item with children is a menu. */
const publicCatalog = () =>
  PAGE_GROUPS.map((g) => ({
    group: g.group,
    items: g.items.map((i) =>
      i.children
        ? { key: i.key, label: i.label, children: i.children.map(({ key, label }) => ({ key, label: ADMIN_ONLY.has(key) ? `${label} (admin only)` : label })) }
        : { key: i.key, label: ADMIN_ONLY.has(i.key) ? `${i.label} (admin only)` : i.label }
    ),
  }));

module.exports = {
  PAGE_GROUPS,
  PAGE_ITEMS,
  PARENTS,
  MFG_PAGE_KEYS,
  expandKeys,
  sanitizePageAccess,
  pathsFor,
  permissionPrefixesFor,
  linksFor,
  publicCatalog,
};
