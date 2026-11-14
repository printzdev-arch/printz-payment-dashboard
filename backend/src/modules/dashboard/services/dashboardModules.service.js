const mongoose = require("mongoose");
const ApiError = require("../../../utils/errors/ApiError");
const { getResolvedPeriod } = require("./dashboard.service");

/**
 * Admin dashboard, one module at a time.
 *
 * Every builder gets { db, period, bIdObj, branchId } and returns
 *   { kpis: [...], charts: [...], table: { title, columns, rows } }
 * The branch and the date range come from the dashboard filters.
 */

const MODULES = {
  salesorders: "Sales Orders",
  joborders: "Job Orders",
  production: "Production",
  inventory: "Inventory",
  attendance: "Attendance",
  salary: "Salary",
  employees: "Employees",
  invoices: "Invoices & Revenue",
  qc: "Quality Control",
};

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const kpi = (key, label, value, opts = {}) => ({
  key,
  label,
  value: typeof value === "number" ? r2(value) : value,
  unit: opts.unit,
  subtitle: opts.subtitle,
  tone: opts.tone,
});
const chart = (key, title, type, labels, datasets) => ({ key, title, type, labels, datasets });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "-");
const pretty = (s) => String(s || "-").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

const branchIn = (field, bIdObj, branchId) => (bIdObj ? { [field]: { $in: [bIdObj, String(branchId)] } } : {});
const dayLabel = (field) => ({ $dateToString: { format: "%d %b", date: field, timezone: "+05:30" } });
const dayKey = (field) => ({ $dateToString: { format: "%Y-%m-%d", date: field, timezone: "+05:30" } });

async function groupCount(db, collection, match, field) {
  const rows = await db.collection(collection).aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]).toArray();
  return new Map(rows.map((r) => [r._id ?? "UNKNOWN", r.count]));
}

const sumOf = (map, keys) => keys.reduce((s, k) => s + (map.get(k) || 0), 0);
const mapChart = (map, keyTitle, titleFn = pretty) => {
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  return { labels: entries.map(([k]) => titleFn(k)), data: entries.map(([, v]) => v) };
};

/* ───────────────────────────── Sales Orders ───────────────────────────── */
async function salesOrders({ db, period, bIdObj, branchId }) {
  const base = { ...branchIn("orderBranchId", bIdObj, branchId), orderDate: { $gte: period.start, $lte: period.end } };
  const live = { ...base, status: { $nin: ["DRAFT", "CANCELLED"] } };
  const now = new Date();
  const [byStatus, byPriority, money, perDay, recent, overdue] = await Promise.all([
    groupCount(db, "saleOrders", base, "status"),
    groupCount(db, "saleOrders", live, "priority"),
    db.collection("saleOrders").aggregate([{ $match: live }, { $group: { _id: null, total: { $sum: "$grandTotal" }, paid: { $sum: "$amountPaid" }, due: { $sum: "$balanceDue" } } }]).toArray(),
    db.collection("saleOrders").aggregate([
      { $match: live },
      { $group: { _id: dayKey("$orderDate"), label: { $first: dayLabel("$orderDate") }, orders: { $sum: 1 }, value: { $sum: "$grandTotal" } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection("saleOrders").find(base).sort({ orderDate: -1 }).limit(50).toArray(),
    db.collection("saleOrders").countDocuments({ ...live, status: { $nin: ["DELIVERED", "RECEIVED_AT_BRANCH"] }, expectedDeliveryDate: { $lt: now } }),
  ]);
  const total = [...byStatus.values()].reduce((s, v) => s + v, 0);
  const m = money[0] || {};
  const design = ["WAITING_FOR_DESIGNER", "ASSIGNED", "IN_DESIGN", "SENT_FOR_APPROVAL", "CHANGES_REQUESTED"];
  const status = mapChart(byStatus);
  return {
    kpis: [
      kpi("total", "Total Orders", total),
      kpi("value", "Order Value", m.total || 0, { unit: "INR", subtitle: "Excluding drafts and cancelled" }),
      kpi("due", "Balance Due", m.due || 0, { unit: "INR", tone: "orange" }),
      kpi("urgent", "Urgent Orders", byPriority.get("URGENT") || 0, { tone: "red" }),
      kpi("overdue", "Overdue", overdue, { tone: "red", subtitle: "Past the delivery date, not delivered" }),
    ],
    charts: [
      chart("status", "Orders by Status", "doughnut", status.labels, [{ label: "Orders", data: status.data }]),
      chart("trend", "Orders per Day", "line", perDay.map((d) => d.label), [
        { label: "Orders", data: perDay.map((d) => d.orders) },
        { label: "Value (₹)", data: perDay.map((d) => r2(d.value)), axis: "right" },
      ]),
    ],
    table: {
      title: "Sales Orders",
      columns: [
        { key: "orderNo", label: "Order No" },
        { key: "customer", label: "Customer" },
        { key: "orderDate", label: "Order Date" },
        { key: "deliverBy", label: "Deliver By" },
        { key: "priority", label: "Priority" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total", align: "right", unit: "INR" },
        { key: "balance", label: "Balance", align: "right", unit: "INR" },
      ],
      rows: recent.map((o) => ({
        id: String(o._id),
        orderNo: o.orderNo || "-",
        customer: o.customerSnapshot?.name || "-",
        orderDate: fmtDate(o.orderDate),
        deliverBy: fmtDate(o.expectedDeliveryDate),
        priority: pretty(o.priority),
        status: pretty(o.status),
        total: r2(o.grandTotal),
        balance: r2(o.balanceDue),
      })),
    },
  };
}

/* ───────────────────────────── Job Orders ───────────────────────────── */
async function jobOrders({ db, period, bIdObj, branchId }) {
  const base = { ...branchIn("branchId", bIdObj, branchId), createdAt: { $gte: period.start, $lte: period.end } };
  const done = ["COMPLETED", "DELIVERED", "CLOSED"];
  const [byStatus, perDay, recent, overdue] = await Promise.all([
    groupCount(db, "jobOrders", base, "status"),
    db.collection("jobOrders").aggregate([
      { $match: base },
      { $group: { _id: dayKey("$createdAt"), label: { $first: dayLabel("$createdAt") }, jobs: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection("jobOrders").find(base).sort({ createdAt: -1 }).limit(50).toArray(),
    db.collection("jobOrders").countDocuments({ ...base, status: { $nin: [...done, "CANCELLED"] }, dueDate: { $lt: new Date() } }),
  ]);
  const total = [...byStatus.values()].reduce((s, v) => s + v, 0);
  const completed = sumOf(byStatus, done);
  const status = mapChart(byStatus);
  return {
    kpis: [
      kpi("total", "Total Job Orders", total),
      kpi("completed", "Completed", completed, { tone: "green", subtitle: `${pct(completed, total)}% of jobs` }),
      kpi("progress", "In Progress", sumOf(byStatus, ["IN_PRODUCTION", "DESIGNING", "PRINTING", "QC_PENDING", "PROCESSING"]), { tone: "blue" }),
      kpi("hold", "On Hold", sumOf(byStatus, ["ON_HOLD", "HOLD", "BLOCKED"]), { tone: "red" }),
      kpi("overdue", "Overdue", overdue, { tone: "red", subtitle: "Past the due date, not finished" }),
    ],
    charts: [
      chart("status", "Jobs by Status", "doughnut", status.labels, [{ label: "Jobs", data: status.data }]),
      chart("trend", "Jobs Created per Day", "line", perDay.map((d) => d.label), [{ label: "Jobs", data: perDay.map((d) => d.jobs) }]),
    ],
    table: {
      title: "Recent Job Orders",
      columns: [
        { key: "jobNo", label: "Job No" },
        { key: "customer", label: "Customer" },
        { key: "stage", label: "Stage" },
        { key: "status", label: "Status" },
        { key: "priority", label: "Priority" },
        { key: "due", label: "Due Date" },
        { key: "created", label: "Created" },
      ],
      rows: recent.map((j) => ({
        id: String(j._id),
        jobNo: j.jobNo || j.orderNumber || "-",
        customer: j.customerName || j.customerSnapshot?.name || "-",
        stage: pretty(j.stage),
        status: pretty(j.status),
        priority: pretty(j.priority),
        due: fmtDate(j.dueDate),
        created: fmtDate(j.createdAt),
      })),
    },
  };
}

/* ───────────────────────────── Production ───────────────────────────── */
async function production({ db, period, bIdObj, branchId }) {
  const base = { ...branchIn("branchId", bIdObj, branchId), createdAt: { $gte: period.start, $lte: period.end } };
  const [byStatus, opsAgg, opsByStatus, recent] = await Promise.all([
    groupCount(db, "productionOrders", base, "status"),
    db.collection("productionOperations").aggregate([
      { $match: base },
      { $group: { _id: null, planned: { $sum: { $ifNull: ["$plannedQty", 0] } }, output: { $sum: { $ifNull: ["$outputQty", 0] } }, waste: { $sum: { $ifNull: ["$wastageQty", 0] } }, ops: { $sum: 1 } } },
    ]).toArray(),
    groupCount(db, "productionOperations", base, "status"),
    db.collection("productionOrders").find(base).sort({ createdAt: -1 }).limit(50).toArray(),
  ]);
  const total = [...byStatus.values()].reduce((s, v) => s + v, 0);
  const o = opsAgg[0] || {};
  const status = mapChart(byStatus);
  const ops = mapChart(opsByStatus);
  return {
    kpis: [
      kpi("total", "Production Orders", total),
      kpi("progress", "In Progress", byStatus.get("IN_PROGRESS") || 0, { tone: "blue" }),
      kpi("hold", "On Hold", byStatus.get("ON_HOLD") || 0, { tone: "red" }),
      kpi("output", "Good Output (pcs)", o.output || 0, { tone: "green" }),
      kpi("waste", "Wastage (pcs)", o.waste || 0, { tone: "red", subtitle: `${pct(o.waste || 0, (o.output || 0) + (o.waste || 0))}% of output` }),
    ],
    charts: [
      chart("status", "Orders by Status", "doughnut", status.labels, [{ label: "Orders", data: status.data }]),
      chart("ops", "Operations by Status", "bar", ops.labels, [{ label: "Operations", data: ops.data }]),
    ],
    table: {
      title: "Production Orders",
      columns: [
        { key: "productionNo", label: "Production No" },
        { key: "status", label: "Status" },
        { key: "planning", label: "Planning" },
        { key: "priority", label: "Priority" },
        { key: "cycle", label: "Cycle" },
        { key: "created", label: "Created" },
      ],
      rows: recent.map((p) => ({
        id: String(p._id),
        productionNo: p.productionNo || "-",
        status: pretty(p.status),
        planning: pretty(p.planningStatus),
        priority: pretty(p.priority),
        cycle: pretty(p.cycleType),
        created: fmtDate(p.createdAt),
      })),
    },
  };
}

/* ───────────────────────────── Inventory ───────────────────────────── */
async function inventory({ db, bIdObj, branchId }) {
  const match = branchIn("branchId", bIdObj, branchId);
  const rows = await db.collection("inventoryBalances").aggregate([
    { $match: match },
    { $lookup: { from: "inventoryItems", localField: "itemId", foreignField: "_id", as: "item" } },
    { $unwind: { path: "$item", preserveNullAndEmptyArrays: true } },
    { $group: { _id: "$itemId", name: { $first: "$item.name" }, reorder: { $first: { $ifNull: ["$item.reorderLevel", 0] } }, quantity: { $sum: { $ifNull: ["$quantity", 0] } } } },
  ]).toArray();
  const out = rows.filter((r) => r.quantity <= 0);
  const low = rows.filter((r) => r.quantity > 0 && r.quantity <= (r.reorder || 0));
  const healthy = rows.length - out.length - low.length;
  const attention = [...out.map((r) => ({ ...r, status: "Out of Stock" })), ...low.map((r) => ({ ...r, status: "Low Stock" }))].sort((a, b) => a.quantity - b.quantity);
  const top = [...rows].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  return {
    kpis: [
      kpi("items", "Items Tracked", rows.length),
      kpi("units", "Units in Stock", rows.reduce((s, r) => s + Math.max(0, r.quantity), 0), { tone: "green" }),
      kpi("low", "Low Stock Items", low.length, { tone: "orange" }),
      kpi("out", "Out of Stock", out.length, { tone: "red" }),
    ],
    charts: [
      chart("health", "Stock Health", "doughnut", ["In Stock", "Low Stock", "Out of Stock"], [{ label: "Items", data: [healthy, low.length, out.length] }]),
      chart("top", "Top Items by Quantity", "bar", top.map((r) => r.name || "-"), [{ label: "Units", data: top.map((r) => r.quantity) }]),
    ],
    table: {
      title: "Items Needing Attention",
      columns: [
        { key: "name", label: "Item" },
        { key: "quantity", label: "Available", align: "right" },
        { key: "reorder", label: "Reorder Level", align: "right" },
        { key: "status", label: "Status" },
      ],
      rows: attention.slice(0, 100).map((r) => ({ id: String(r._id), name: r.name || "-", quantity: r.quantity, reorder: r.reorder || 0, status: r.status })),
    },
  };
}

/* ───────────────────────────── Attendance ───────────────────────────── */
async function attendance({ db, period, bIdObj, branchId }) {
  const base = { ...branchIn("branchId", bIdObj, branchId), attendanceDate: { $gte: period.fromStr, $lte: period.toStr } };
  const [byStatus, perDay, extra] = await Promise.all([
    groupCount(db, "dailyattendances", base, "status"),
    db.collection("dailyattendances").aggregate([
      { $match: base },
      {
        $group: {
          _id: "$attendanceDate",
          present: { $sum: { $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0] } },
          half: { $sum: { $cond: [{ $eq: ["$status", "HALF_DAY"] }, 1, 0] } },
          leave: { $sum: { $cond: [{ $eq: ["$status", "ON_LEAVE"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$lateArrival", true] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection("dailyattendances").aggregate([
      { $match: base },
      { $group: { _id: null, hours: { $avg: { $ifNull: ["$workingHoursPerDay", 0] } }, late: { $sum: { $cond: [{ $eq: ["$lateArrival", true] }, 1, 0] } } } },
    ]).toArray(),
  ]);
  const total = [...byStatus.values()].reduce((s, v) => s + v, 0);
  const status = mapChart(byStatus);
  const x = extra[0] || {};
  return {
    kpis: [
      kpi("present", "Present", byStatus.get("PRESENT") || 0, { tone: "green", subtitle: `${pct(byStatus.get("PRESENT") || 0, total)}% of records` }),
      kpi("absent", "Absent", byStatus.get("ABSENT") || 0, { tone: "red" }),
      kpi("leave", "On Leave", byStatus.get("ON_LEAVE") || 0, { tone: "purple" }),
      kpi("late", "Late Arrivals", x.late || 0, { tone: "orange" }),
      kpi("hours", "Avg Hours / Day", r2(x.hours || 0), { tone: "blue" }),
    ],
    charts: [
      chart("status", "Attendance by Status", "doughnut", status.labels, [{ label: "Records", data: status.data }]),
      chart("trend", "Present vs Absent per Day", "line", perDay.map((d) => d._id.slice(5)), [
        { label: "Present", data: perDay.map((d) => d.present) },
        { label: "Absent", data: perDay.map((d) => d.absent) },
      ]),
    ],
    table: {
      title: "Day-wise Attendance",
      columns: [
        { key: "date", label: "Date" },
        { key: "present", label: "Present", align: "right" },
        { key: "absent", label: "Absent", align: "right" },
        { key: "half", label: "Half Day", align: "right" },
        { key: "leave", label: "On Leave", align: "right" },
        { key: "late", label: "Late", align: "right" },
      ],
      rows: [...perDay].reverse().map((d) => ({ id: d._id, date: d._id, present: d.present, absent: d.absent, half: d.half, leave: d.leave, late: d.late })),
    },
  };
}

/* ───────────────────────────── Salary ───────────────────────────── */
async function salary({ db, period, bIdObj, branchId }) {
  const first = new Date(period.start);
  const last = new Date(period.end);
  const fromKey = first.getFullYear() * 12 + first.getMonth();
  const toKey = last.getFullYear() * 12 + last.getMonth();
  const match = {
    ...branchIn("branchId", bIdObj, branchId),
    $expr: { $and: [{ $gte: [{ $add: [{ $multiply: ["$payrollYear", 12] }, { $subtract: ["$payrollMonth", 1] }] }, fromKey] }, { $lte: [{ $add: [{ $multiply: ["$payrollYear", 12] }, { $subtract: ["$payrollMonth", 1] }] }, toKey] }] },
  };
  const [runs, branches] = await Promise.all([
    db.collection("salaryruns").find(match).sort({ payrollYear: -1, payrollMonth: -1 }).limit(200).toArray(),
    db.collection("branches").find({}).project({ name: 1 }).toArray(),
  ]);
  const branchName = new Map(branches.map((b) => [String(b._id), b.name]));
  const byStatus = new Map();
  for (const r of runs) byStatus.set(r.status, (byStatus.get(r.status) || 0) + 1);
  const sum = (key) => runs.reduce((s, r) => s + (Number(r[key]) || 0), 0);
  const monthName = (r) => `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][r.payrollMonth - 1]} ${r.payrollYear}`;
  const perMonth = new Map();
  for (const r of [...runs].reverse()) perMonth.set(monthName(r), (perMonth.get(monthName(r)) || 0) + (Number(r.totalNetPay) || 0));
  const status = mapChart(byStatus);
  return {
    kpis: [
      kpi("runs", "Salary Runs", runs.length),
      kpi("gross", "Gross Pay", sum("totalGrossPay"), { unit: "INR" }),
      kpi("ded", "Deductions", sum("totalDeductions"), { unit: "INR", tone: "red" }),
      kpi("net", "Net Pay", sum("totalNetPay"), { unit: "INR", tone: "green" }),
      kpi("approval", "Awaiting Approval", sumOf(byStatus, ["CALCULATED"]), { tone: "orange" }),
    ],
    charts: [
      chart("status", "Runs by Status", "doughnut", status.labels, [{ label: "Runs", data: status.data }]),
      chart("net", "Net Pay by Month (₹)", "bar", [...perMonth.keys()], [{ label: "Net Pay", data: [...perMonth.values()].map(r2) }]),
    ],
    table: {
      title: "Salary Runs",
      columns: [
        { key: "month", label: "Month" },
        { key: "branch", label: "Branch" },
        { key: "staff", label: "Staff", align: "right" },
        { key: "gross", label: "Gross", align: "right", unit: "INR" },
        { key: "ded", label: "Deductions", align: "right", unit: "INR" },
        { key: "net", label: "Net Pay", align: "right", unit: "INR" },
        { key: "status", label: "Status" },
      ],
      rows: runs.map((r) => ({
        id: String(r._id),
        month: monthName(r),
        branch: branchName.get(String(r.branchId)) || "-",
        staff: r.employeeCount || 0,
        gross: r2(r.totalGrossPay),
        ded: r2(r.totalDeductions),
        net: r2(r.totalNetPay),
        status: pretty(r.status),
      })),
    },
  };
}

/* ───────────────────────────── Employees ───────────────────────────── */
async function employees({ db, bIdObj, branchId }) {
  const match = branchIn("branchId", bIdObj, branchId);
  const [list, branches, roles] = await Promise.all([
    db.collection("employees").find(match).project({ employeeCode: 1, name: 1, branchId: 1, roleId: 1, joiningDate: 1, employmentStatus: 1, isActive: 1 }).sort({ joiningDate: -1 }).toArray(),
    db.collection("branches").find({}).project({ name: 1 }).toArray(),
    db.collection("roles").find({}).project({ name: 1 }).toArray(),
  ]);
  const branchName = new Map(branches.map((b) => [String(b._id), b.name]));
  const roleName = new Map(roles.map((r) => [String(r._id), r.name]));
  const isActive = (e) => e.isActive !== false && (e.employmentStatus || "ACTIVE") === "ACTIVE";
  const active = list.filter(isActive);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const joined = list.filter((e) => e.joiningDate && new Date(e.joiningDate) >= since);
  const tally = (items, keyFn) => {
    const m = new Map();
    for (const e of items) m.set(keyFn(e), (m.get(keyFn(e)) || 0) + 1);
    return mapChart(m, "", (k) => k);
  };
  const byBranch = tally(active, (e) => branchName.get(String(e.branchId)) || "Unassigned");
  const byRole = tally(active, (e) => roleName.get(String(e.roleId)) || "No role");
  const byStatus = tally(list, (e) => pretty(e.employmentStatus || "ACTIVE"));
  return {
    kpis: [
      kpi("total", "Total Employees", list.length),
      kpi("active", "Active", active.length, { tone: "green" }),
      kpi("inactive", "Inactive / Left", list.length - active.length, { tone: "red" }),
      kpi("joined", "Joined in Last 30 Days", joined.length, { tone: "blue" }),
    ],
    charts: [
      chart("branch", "Active Staff by Branch", "bar", byBranch.labels, [{ label: "Staff", data: byBranch.data }]),
      chart("role", "Staff by Role", "doughnut", byRole.labels, [{ label: "Staff", data: byRole.data }]),
    ],
    table: {
      title: "Employees",
      columns: [
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "branch", label: "Branch" },
        { key: "role", label: "Role" },
        { key: "joined", label: "Joined" },
        { key: "status", label: "Status" },
      ],
      rows: list.slice(0, 200).map((e) => ({
        id: String(e._id),
        code: e.employeeCode || "-",
        name: e.name || "-",
        branch: branchName.get(String(e.branchId)) || "-",
        role: roleName.get(String(e.roleId)) || "-",
        joined: fmtDate(e.joiningDate),
        status: pretty(e.employmentStatus || "ACTIVE"),
      })),
    },
  };
}

/* ───────────────────────────── Invoices & Revenue ───────────────────────────── */
async function invoices({ db, period, bIdObj, branchId }) {
  const inv = { ...branchIn("branchId", bIdObj, branchId), isDeleted: { $ne: true }, status: { $nin: ["DRAFT", "CANCELLED", "VOID"] }, invoiceDate: { $gte: period.start, $lte: period.end } };
  const rec = { ...branchIn("branchId", bIdObj, branchId), status: { $nin: ["VOID", "DRAFT", "CANCELLED"] }, saleDate: { $gte: period.start, $lte: period.end } };
  const now = new Date();
  const [invAgg, byPay, perDay, recent, recAgg, overdue] = await Promise.all([
    db.collection("invoices").aggregate([{ $match: inv }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: { $ifNull: ["$grandTotal", 0] } }, paid: { $sum: { $ifNull: ["$paidAmount", { $ifNull: ["$amountPaid", 0] }] } }, due: { $sum: { $ifNull: ["$balanceDue", 0] } } } }]).toArray(),
    groupCount(db, "invoices", inv, "paymentStatus"),
    db.collection("invoices").aggregate([
      { $match: inv },
      { $group: { _id: dayKey("$invoiceDate"), label: { $first: dayLabel("$invoiceDate") }, invoiced: { $sum: { $ifNull: ["$grandTotal", 0] } }, collected: { $sum: { $ifNull: ["$paidAmount", { $ifNull: ["$amountPaid", 0] }] } } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection("invoices").find(inv).sort({ invoiceDate: -1 }).limit(50).toArray(),
    db.collection("saleReceipts").aggregate([{ $match: rec }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: { $ifNull: ["$grandTotal", 0] } } } }]).toArray(),
    db.collection("invoices").countDocuments({ ...inv, balanceDue: { $gt: 0 }, dueDate: { $lt: now } }),
  ]);
  const a = invAgg[0] || {};
  const c = recAgg[0] || {};
  const pay = mapChart(byPay);
  return {
    kpis: [
      kpi("revenue", "Total Revenue", (a.total || 0) + (c.total || 0), { unit: "INR", tone: "green", subtitle: "Invoices + counter sales" }),
      kpi("invoiced", "Invoiced", a.total || 0, { unit: "INR", subtitle: `${a.count || 0} invoices` }),
      kpi("collected", "Collected", a.paid || 0, { unit: "INR", tone: "green" }),
      kpi("outstanding", "Outstanding", a.due || 0, { unit: "INR", tone: "orange" }),
      kpi("overdue", "Overdue Invoices", overdue, { tone: "red" }),
    ],
    charts: [
      chart("trend", "Invoiced vs Collected (₹)", "line", perDay.map((d) => d.label), [
        { label: "Invoiced", data: perDay.map((d) => r2(d.invoiced)) },
        { label: "Collected", data: perDay.map((d) => r2(d.collected)) },
      ]),
      chart("pay", "Payment Status", "doughnut", pay.labels, [{ label: "Invoices", data: pay.data }]),
    ],
    table: {
      title: "Invoices",
      columns: [
        { key: "no", label: "Invoice No" },
        { key: "customer", label: "Customer" },
        { key: "date", label: "Date" },
        { key: "due", label: "Due Date" },
        { key: "total", label: "Total", align: "right", unit: "INR" },
        { key: "paid", label: "Paid", align: "right", unit: "INR" },
        { key: "balance", label: "Balance", align: "right", unit: "INR" },
        { key: "status", label: "Payment" },
      ],
      rows: recent.map((i) => ({
        id: String(i._id),
        no: i.invoiceNumber || "-",
        customer: i.customerSnapshot?.name || i.customerName || "-",
        date: fmtDate(i.invoiceDate),
        due: fmtDate(i.dueDate),
        total: r2(i.grandTotal),
        paid: r2(i.paidAmount ?? i.amountPaid),
        balance: r2(i.balanceDue),
        status: pretty(i.paymentStatus),
      })),
    },
  };
}

/* ───────────────────────────── Quality Control ───────────────────────────── */
async function qc({ db, period, bIdObj, branchId }) {
  const base = { ...branchIn("branchId", bIdObj, branchId), checkedAt: { $gte: period.start, $lte: period.end } };
  const [byResult, qty, perDay, severity, recent] = await Promise.all([
    groupCount(db, "qualityChecks", base, "result"),
    db.collection("qualityChecks").aggregate([{ $match: base }, { $group: { _id: null, checked: { $sum: { $ifNull: ["$quantityChecked", 0] } }, accepted: { $sum: { $ifNull: ["$acceptedQty", 0] } }, rejected: { $sum: { $ifNull: ["$rejectedQty", 0] } } } }]).toArray(),
    db.collection("qualityChecks").aggregate([
      { $match: base },
      { $group: { _id: dayKey("$checkedAt"), label: { $first: dayLabel("$checkedAt") }, passed: { $sum: { $cond: [{ $eq: ["$result", "PASS"] }, 1, 0] } }, issues: { $sum: { $cond: [{ $ne: ["$result", "PASS"] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection("qualityChecks").aggregate([{ $match: base }, { $unwind: "$defects" }, { $group: { _id: "$defects.severity", count: { $sum: 1 } } }]).toArray(),
    db.collection("qualityChecks").find(base).sort({ checkedAt: -1 }).limit(50).toArray(),
  ]);
  const total = [...byResult.values()].reduce((s, v) => s + v, 0);
  const q = qty[0] || {};
  const result = mapChart(byResult);
  return {
    kpis: [
      kpi("checks", "Inspections", total),
      kpi("pass", "Passed", byResult.get("PASS") || 0, { tone: "green", subtitle: `${pct(byResult.get("PASS") || 0, total)}% pass rate` }),
      kpi("issues", "Issues / Failed", total - (byResult.get("PASS") || 0), { tone: "red" }),
      kpi("rejected", "Pieces Rejected", q.rejected || 0, { tone: "red", subtitle: `${pct(q.rejected || 0, q.checked || 0)}% of checked` }),
      kpi("critical", "Critical Defects", (severity.find((s) => s._id === "CRITICAL") || {}).count || 0, { tone: "red" }),
    ],
    charts: [
      chart("result", "Inspection Results", "doughnut", result.labels, [{ label: "Inspections", data: result.data }]),
      chart("trend", "Passed vs Issues per Day", "line", perDay.map((d) => d.label), [
        { label: "Passed", data: perDay.map((d) => d.passed) },
        { label: "Issues", data: perDay.map((d) => d.issues) },
      ]),
    ],
    table: {
      title: "Recent Inspections",
      columns: [
        { key: "date", label: "Checked On" },
        { key: "type", label: "Type" },
        { key: "result", label: "Result" },
        { key: "checked", label: "Checked", align: "right" },
        { key: "accepted", label: "Accepted", align: "right" },
        { key: "rejected", label: "Rejected", align: "right" },
        { key: "action", label: "Corrective Action" },
      ],
      rows: recent.map((c) => ({
        id: String(c._id),
        date: fmtDate(c.checkedAt),
        type: pretty(c.checkType),
        result: pretty(c.result),
        checked: c.quantityChecked || 0,
        accepted: c.acceptedQty || 0,
        rejected: c.rejectedQty || 0,
        action: pretty(c.correctiveAction || "NONE"),
      })),
    },
  };
}

const BUILDERS = { salesorders: salesOrders, joborders: jobOrders, production, inventory, attendance, salary, employees, invoices, qc };

// These show how things stand now, so the dashboard date range does not apply to them
const NO_DATE_MODULES = new Set(["inventory", "employees"]);

async function getModuleDashboard({ module, branchId, dateType, startDate, endDate }) {
  const key = String(module || "").toLowerCase().replace(/[\s_-]+/g, "");
  const builder = BUILDERS[key];
  if (!builder) throw ApiError.badRequest(`Unknown module '${module}'. Allowed: ${Object.keys(MODULES).join(", ")}`);

  const db = mongoose.connection.db;
  const period = getResolvedPeriod({ dateType, startDate, endDate });

  let bIdObj = null;
  let branchName = "All Branches";
  if (branchId && String(branchId).toUpperCase() !== "ALL") {
    if (!mongoose.Types.ObjectId.isValid(branchId)) throw ApiError.badRequest("Invalid 'branchId'.");
    bIdObj = new mongoose.Types.ObjectId(branchId);
    const doc = await db.collection("branches").findOne({ _id: bIdObj });
    if (!doc) throw ApiError.notFound("Branch not found.");
    branchName = doc.name;
  }

  const built = await builder({ db, period, bIdObj, branchId });
  return {
    module: key,
    label: MODULES[key],
    selectedBranch: { id: bIdObj ? String(branchId) : "ALL", name: branchName },
    // Modules that show the current state have no date range
    period: NO_DATE_MODULES.has(key) ? null : { dateType: period.dateType, label: period.label, startDate: period.fromStr, endDate: period.toStr },
    ...built,
  };
}

module.exports = { getModuleDashboard, MODULES };
