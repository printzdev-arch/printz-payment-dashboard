const mongoose = require("mongoose");
const { liveCollection } = require("../../../utils/softDelete/liveCollection");
const dns = require("dns");
const ApiError = require("../../../utils/errors/ApiError");

// Ensure DNS resolution succeeds for MongoDB Atlas SRV connection strings in Windows environments
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Ignore fallback
}

/**
 * In-memory Scope-Safe Cache with 60-second TTL
 */
const CACHE_TTL_MS = 60 * 1000;
const memoryCache = new Map();

function getCached(key) {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data) {
  if (memoryCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of memoryCache.entries()) {
      if (now > v.expiresAt) memoryCache.delete(k);
    }
    if (memoryCache.size > 500) {
      const oldestKey = memoryCache.keys().next().value;
      memoryCache.delete(oldestKey);
    }
  }
  memoryCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function clearCache() {
  memoryCache.clear();
}

/**
 * Asia/Kolkata (IST, UTC+05:30) Date Helpers
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function parseDateInIST(dateStr) {
  if (!dateStr) return null;
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const startUtc = new Date(Date.UTC(year, month, day, 0, 0, 0) - IST_OFFSET_MS);
    const endUtc = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - IST_OFFSET_MS);
    return { start: startUtc, end: endUtc, dateStr: `${match[1]}-${match[2]}-${match[3]}` };
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return { start: d, end: d, dateStr: d.toISOString().slice(0, 10) };
}

function getTodayIST() {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const day = istNow.getUTCDate();
  const startUtc = new Date(Date.UTC(year, month, day, 0, 0, 0) - IST_OFFSET_MS);
  const endUtc = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - IST_OFFSET_MS);
  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { start: startUtc, end: endUtc, dateStr };
}

function getMtdIST() {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const startUtc = new Date(Date.UTC(year, month, 1, 0, 0, 0) - IST_OFFSET_MS);
  const endUtc = now;
  const fromStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const toStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(istNow.getUTCDate()).padStart(2, "0")}`;
  return { start: startUtc, end: endUtc, fromStr, toStr };
}

function getLastNDaysIST(n) {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const day = istNow.getUTCDate();
  const endUtc = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - IST_OFFSET_MS);
  const toStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const startDateIst = new Date(Date.UTC(year, month, day - (n - 1), 0, 0, 0));
  const sYear = startDateIst.getUTCFullYear();
  const sMonth = startDateIst.getUTCMonth();
  const sDay = startDateIst.getUTCDate();
  const startUtc = new Date(Date.UTC(sYear, sMonth, sDay, 0, 0, 0) - IST_OFFSET_MS);
  const fromStr = `${sYear}-${String(sMonth + 1).padStart(2, "0")}-${String(sDay).padStart(2, "0")}`;
  return { start: startUtc, end: endUtc, fromStr, toStr };
}

function getLastMonthIST() {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth(); // current month 0-indexed
  // Last month start
  const lastMonthStartUtc = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - IST_OFFSET_MS);
  // Last month end (day 0 of current month)
  const lastMonthEndUtc = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999) - IST_OFFSET_MS);
  return {
    start: lastMonthStartUtc,
    end: lastMonthEndUtc,
    fromStr: lastMonthStartUtc.toISOString().slice(0, 10),
    toStr: lastMonthEndUtc.toISOString().slice(0, 10),
  };
}

function getResolvedPeriod({ dateType, startDate, endDate }) {
  if (startDate && endDate) {
    const parsedStart = parseDateInIST(startDate);
    const parsedEnd = parseDateInIST(endDate);
    if (parsedStart && parsedEnd) {
      return {
        start: parsedStart.start,
        end: parsedEnd.end,
        type: "RANGE",
        dateType: "custom",
        label: `Custom (${parsedStart.dateStr} - ${parsedEnd.dateStr})`,
        fromStr: parsedStart.dateStr,
        toStr: parsedEnd.dateStr,
      };
    }
  }

  const dt = dateType ? String(dateType).trim().toLowerCase() : "mtd";

  if (dt === "today") {
    const today = getTodayIST();
    return {
      start: today.start,
      end: today.end,
      type: "TODAY",
      dateType: "today",
      label: `Today (${today.dateStr})`,
      fromStr: today.dateStr,
      toStr: today.dateStr,
    };
  }

  if (dt === "last7days") {
    const l7 = getLastNDaysIST(7);
    return {
      start: l7.start,
      end: l7.end,
      type: "LAST7DAYS",
      dateType: "last7days",
      label: `Last 7 Days (${l7.fromStr} - ${l7.toStr})`,
      fromStr: l7.fromStr,
      toStr: l7.toStr,
    };
  }

  if (dt === "lastmonth") {
    const lm = getLastMonthIST();
    return {
      start: lm.start,
      end: lm.end,
      type: "LASTMONTH",
      dateType: "lastmonth",
      label: `Last Month (${lm.fromStr} - ${lm.toStr})`,
      fromStr: lm.fromStr,
      toStr: lm.toStr,
    };
  }

  // Default: Month-To-Date (MTD) / This Month
  const mtd = getMtdIST();
  return {
    start: mtd.start,
    end: mtd.end,
    type: "MTD",
    dateType: "mtd",
    label: `This Month (${mtd.fromStr} - ${mtd.toStr})`,
    fromStr: mtd.fromStr,
    toStr: mtd.toStr,
  };
}

function makeKpi(key, label, value, trend = null, unit = undefined) {
  return {
    key,
    label,
    value: typeof value === "number" ? Math.round(value * 100) / 100 : value,
    // Only a real comparison is shown; there is no made-up default trend
    trend: trend || null,
    unit: unit || (String(key).toLowerCase().includes("revenue") || String(key).toLowerCase().includes("amount") || String(key).toLowerCase().includes("sales") || String(key).toLowerCase().includes("value") ? "INR" : undefined),
  };
}

class DashboardService {
  /**
   * Determine available dashboards for the authenticated user
   */
  async getAvailableDashboards(authContext = {}) {
    const user = authContext.user || {};
    const role = String(user.role || user.roleCode || "").toUpperCase();
    const scopes = authContext.scopes || [];
    const isSuperAdmin = Boolean(
      authContext.isSuperAdmin ||
      role === "SUPER_ADMIN" ||
      role === "ADMIN" ||
      scopes.includes("ALL")
    );

    const available = [];

    if (isSuperAdmin || role === "ADMIN" || scopes.includes("ALL")) {
      available.push({
        id: "admin",
        title: "Admin Dashboard",
        path: "/api/dashboards/admin",
        description: "Company-wide metrics for Overview, Revenue, Stocks, Employees, and Designers",
      });
    }

    // Permissions are stored either as a list or as an object ({ "dashboard.manager.view": "BRANCH" }); both work
    const hasPerm = (code) =>
      Array.isArray(user.permissions) ? user.permissions.includes(code) : Boolean(user.permissions && user.permissions[code]);

    const hasBranchAccess =
      isSuperAdmin ||
      role === "ADMIN" ||
      role === "SUPER_ADMIN" ||
      role === "BRANCH_MANAGER" ||
      role === "MANAGER" ||
      (hasPerm("dashboard.manager.view") && scopes.includes("BRANCH"));

    if (hasBranchAccess && role !== "DESIGNER" && role !== "USER") {
      available.push({
        id: "manager",
        title: "Branch Manager Dashboard",
        path: "/api/dashboards/manager",
        description: "Branch-scoped metrics for Overview, Revenue, Stocks, Employees, and Designers",
      });
    }

    const isDesigner =
      isSuperAdmin ||
      role === "ADMIN" ||
      role === "SUPER_ADMIN" ||
      role === "DESIGNER" ||
      hasPerm("dashboard.designer.view");

    if (isDesigner) {
      available.push({
        id: "designer",
        title: "Designer Dashboard",
        path: "/api/dashboards/designer",
        description: "Personal design work queue, approval statuses, ratings, and job orders",
      });
    }

    let defaultDashboard = "admin";
    if (role === "BRANCH_MANAGER" || role === "MANAGER") {
      defaultDashboard = "manager";
    } else if (role === "DESIGNER") {
      defaultDashboard = "designer";
    } else if (available.length > 0) {
      defaultDashboard = available[0].id;
    }

    return {
      availableDashboards: available,
      defaultDashboard,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role || role,
        authorizedBranches: authContext.authorizedBranchIds || [],
      },
    };
  }

  /**
   * =========================================================================
   * A. ADMIN DASHBOARD - Supports dataType: 'overview' | 'revenue' | 'stocks' | 'employees' | 'designers' | 'production' | 'job orders'
   * =========================================================================
   */
  async getAdminDashboard(params = {}, authContext = {}) {
    let { dateType = "mtd", startDate, endDate, branchId, dataType = "overview" } = params;
    dataType = String(dataType).toLowerCase().replace(/\s+/g, "");
    if (dataType === "all") dataType = "overview";

    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const period = getResolvedPeriod({ dateType, startDate, endDate });
    const today = getTodayIST();
    const db = mongoose.connection.db;

    // Validate and resolve branch if branchId is provided
    let branchDoc = null;
    let bIdObj = null;
    if (branchId && String(branchId).toUpperCase() !== "ALL") {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        throw ApiError.badRequest("Invalid 'branchId'. Must be a valid 24-character hexadecimal ObjectId.");
      }
      bIdObj = new mongoose.Types.ObjectId(branchId);
      branchDoc = await liveCollection(db, "branches").findOne({ _id: bIdObj });
      if (!branchDoc) {
        throw ApiError.notFound("Branch not found.");
      }
    }

    const selectedBranchName = branchDoc ? branchDoc.name : "All Branches";

    const branchMatch = bIdObj ? { branchId: { $in: [bIdObj, String(branchId)] } } : {};
    const invBranchMatch = bIdObj ? { branchId: { $in: [bIdObj, String(branchId)] } } : {};

    const cacheKey = `dashboard:admin:${authContext.user?._id || "ADMIN"}:${branchId || "ALL"}:${dataType}:${period.type}:${period.fromStr}:${period.toStr}:${page}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return { ...cached, _cached: true };

    // Parallel fetch for Overview metrics matching the reference UI
    const [
      revenuePeriodAgg,
      invoicesCollectedAgg,
      pendingInvoicesAgg,
      totalJobOrdersCount,
      completedJobsCount,
      inProgressJobsCount,
      pendingJobsCount,
      onHoldJobsCount,
      totalEmployeesCount,
      stockAvailableAgg,
      stockReservedAgg,
      lowStockItemsCount,
      outOfStockItemsCount,
      dailyRevenueTrendRaw,
      recentJobOrdersRaw,
      lowStockItemsRaw,
      pendingInvoicesRaw,
      upcomingDeliveriesRaw,
    ] = await Promise.all([
      // 1. Total Revenue in Period
      liveCollection(db, "saleReceipts").aggregate([
        { $match: { ...branchMatch, status: { $nin: ["VOID", "DRAFT", "CANCELLED"] }, saleDate: { $gte: period.start, $lte: period.end } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]).toArray(),

      // 2. Amount Collected
      liveCollection(db, "invoices").aggregate([
        {
          $match: {
            ...(bIdObj ? { branchId: { $in: [bIdObj, String(branchId)] } } : {}),
            isDeleted: { $ne: true },
          },
        },
        { $group: { _id: null, totalCollected: { $sum: { $add: [{ $ifNull: ["$paidAmount", { $ifNull: ["$amountPaid", 0] }] }, { $ifNull: ["$advanceApplied", { $ifNull: ["$advancePaid", 0] }] }] } } } },
      ]).toArray(),

      // 3. Pending Amount
      liveCollection(db, "invoices").aggregate([
        {
          $match: {
            ...(bIdObj ? { branchId: { $in: [bIdObj, String(branchId)] } } : {}),
            isDeleted: { $ne: true },
            $or: [{ paymentStatus: { $in: ["UNPAID", "PARTIAL", "PENDING"] } }, { balanceDue: { $gt: 0 } }],
          },
        },
        { $group: { _id: null, totalDue: { $sum: { $ifNull: ["$balanceDue", 0] } } } },
      ]).toArray(),

      // 4. Total Job Orders
      liveCollection(db, "jobOrders").countDocuments({
        ...branchMatch,
        createdAt: { $gte: period.start, $lte: period.end },
      }),

      // 5. Completed Jobs
      liveCollection(db, "jobOrders").countDocuments({
        ...branchMatch,
        $or: [{ status: { $in: ["COMPLETED", "DELIVERED", "CLOSED"] } }, { stage: { $in: ["COMPLETED", "DELIVERED", "CLOSED"] } }],
      }),

      // 6. In Progress Jobs
      liveCollection(db, "jobOrders").countDocuments({
        ...branchMatch,
        $or: [
          { status: { $in: ["IN_PRODUCTION", "DESIGNING", "PRINTING", "QC_PENDING", "PROCESSING"] } },
          { stage: { $in: ["IN_PRODUCTION", "DESIGN_IN_PROGRESS", "PRINTING", "PRODUCTION_STATION"] } },
        ],
      }),

      // 7. Pending Jobs
      liveCollection(db, "jobOrders").countDocuments({
        ...branchMatch,
        $or: [{ status: { $in: ["PENDING", "SUBMITTED", "NEW", "DRAFT"] } }, { stage: { $in: ["NEW_ENQUIRY", "ESTIMATION", "DESIGN_ASSIGNED"] } }],
      }),

      // 8. On Hold Jobs
      liveCollection(db, "jobOrders").countDocuments({
        ...branchMatch,
        $or: [{ status: { $in: ["ON_HOLD", "HOLD", "BLOCKED"] } }, { stage: { $in: ["ON_HOLD", "REWORK", "REVISION_REQUIRED"] } }],
      }),

      // 9. Total Employees
      liveCollection(db, "employees").countDocuments({
        ...(bIdObj ? { branchId: { $in: [bIdObj, String(branchId)] } } : {}),
        $or: [{ employmentStatus: "ACTIVE" }, { isActive: true }],
      }),

      // 10. Stock Available
      liveCollection(db, "inventoryBalances").aggregate([
        { $match: { ...invBranchMatch, quantity: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$quantity" } } },
      ]).toArray(),

      // 11. Stock Reserved (estimated from in-progress jobs or transfer dispatch)
      liveCollection(db, "inventoryBalances").aggregate([
        { $match: invBranchMatch },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$reservedQuantity", 0] } } } },
      ]).toArray(),

      // 12. Low stock items count
      liveCollection(db, "inventoryBalances").aggregate([
        { $match: invBranchMatch },
        {
          $lookup: {
            from: "inventoryItems",
            localField: "itemId",
            foreignField: "_id",
            as: "item",
          },
        },
        { $unwind: "$item" },
        {
          $match: {
            $expr: {
              $and: [
                { $gt: ["$quantity", 0] },
                { $lte: ["$quantity", { $ifNull: ["$item.reorderLevel", 50] }] },
              ],
            },
          },
        },
        { $count: "total" },
      ]).toArray(),

      // 13. Out of stock items count
      liveCollection(db, "inventoryBalances").countDocuments({
        ...invBranchMatch,
        quantity: { $lte: 0 },
      }),

      // 14. Daily Revenue Trend (for Graph 1)
      liveCollection(db, "saleReceipts").aggregate([
        { $match: { ...branchMatch, status: { $nin: ["VOID", "DRAFT", "CANCELLED"] }, saleDate: { $gte: period.start, $lte: period.end } } },
        {
          $group: {
            _id: { $dateToString: { format: "%b %d", date: "$saleDate", timezone: "+05:30" } },
            revenue: { $sum: "$grandTotal" },
            collected: { $sum: { $ifNull: ["$amountPaid", 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]).toArray(),

      // 15. Recent Job Orders (Table 1)
      liveCollection(db, "jobOrders").aggregate([
        { $match: branchMatch },
        { $sort: { createdAt: -1 } },
        { $limit: 8 },
      ]).toArray(),

      // 16. Low Stock Items (Table 2)
      liveCollection(db, "inventoryBalances").aggregate([
        { $match: invBranchMatch },
        {
          $lookup: {
            from: "inventoryItems",
            localField: "itemId",
            foreignField: "_id",
            as: "item",
          },
        },
        { $unwind: "$item" },
        {
          $match: {
            $expr: { $lte: ["$quantity", { $ifNull: ["$item.reorderLevel", 50] }] },
          },
        },
        { $limit: 8 },
      ]).toArray(),

      // 17. Pending Payments (Table 3)
      liveCollection(db, "invoices").aggregate([
        {
          $match: {
            ...(bIdObj ? { branchId: { $in: [bIdObj, String(branchId)] } } : {}),
            isDeleted: { $ne: true },
            $or: [{ paymentStatus: { $in: ["UNPAID", "PARTIAL", "PENDING"] } }, { balanceDue: { $gt: 0 } }],
          },
        },
        { $sort: { dueDate: 1 } },
        { $limit: 8 },
      ]).toArray(),

      // 18. Upcoming Deliveries (Table 4)
      liveCollection(db, "jobOrders").aggregate([
        {
          $match: {
            ...branchMatch,
            dueDate: { $gte: today.start },
            status: { $nin: ["DELIVERED", "CLOSED", "CANCELLED"] },
          },
        },
        { $sort: { dueDate: 1 } },
        { $limit: 8 },
      ]).toArray(),
    ]);

    // Real figures only: a real 0 is shown as 0 (it used to be replaced by sample numbers)
    const totalRev = revenuePeriodAgg[0]?.total ?? 0;
    // Collected = money actually received in the period (invoice advances and later payments, plus counter sales paid).
    // Pending = what is still owed (open invoices plus counter sales left on credit). Revenue, collected and pending
    // now describe the same business, so a counter sale paid in full no longer shows as revenue with nothing collected.
    const saleOk = { status: { $nin: ["VOID", "DRAFT", "CANCELLED"] } };
    const [paymentsInPeriodAgg, receiptsPaidAgg, receiptsDueAgg] = await Promise.all([
      liveCollection(db, "payments").aggregate([
        { $match: { ...branchMatch, status: { $in: ["COMPLETED", "PAID", "SUCCESS"] }, isDeleted: { $ne: true }, paymentDate: { $gte: period.start, $lte: period.end } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).toArray(),
      liveCollection(db, "saleReceipts").aggregate([
        { $match: { ...branchMatch, ...saleOk, saleDate: { $gte: period.start, $lte: period.end } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$amountPaid", 0] } } } },
      ]).toArray(),
      liveCollection(db, "saleReceipts").aggregate([
        { $match: { ...branchMatch, ...saleOk, balanceDue: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$balanceDue" } } },
      ]).toArray(),
    ]);
    const amountCollected = Math.round(((paymentsInPeriodAgg[0]?.total ?? 0) + (receiptsPaidAgg[0]?.total ?? 0)) * 100) / 100;
    const pendingAmount = Math.round(((pendingInvoicesAgg[0]?.totalDue ?? 0) + (receiptsDueAgg[0]?.total ?? 0)) * 100) / 100;
    const totalJobs = totalJobOrdersCount ?? 0;
    const completedJobs = completedJobsCount ?? 0;
    const inProgressJobs = inProgressJobsCount ?? 0;
    const pendingJobs = pendingJobsCount ?? 0;
    const onHoldJobs = onHoldJobsCount ?? 0;
    const totalEmployees = totalEmployeesCount ?? 0;

    const availableStock = stockAvailableAgg[0]?.total ?? 0;
    const reservedStock = stockReservedAgg[0]?.total ?? 0;
    const lowStockCount = lowStockItemsCount[0]?.total ?? 0;
    const outOfStockCount = outOfStockItemsCount ?? 0;

    // Real days only (no sample points); collected is the amount actually received on those sales
    const dailyTrend = dailyRevenueTrendRaw.map((d) => ({
      date: d._id,
      revenue: Math.round((Number(d.revenue) || 0) * 100) / 100,
      collected: Math.round((Number(d.collected) || 0) * 100) / 100,
    }));

    const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");
    const money2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

    // Table 1: Recent Job Orders
    const recentJobOrders = recentJobOrdersRaw.map((job) => ({
      id: job._id,
      jobId: job.jobNo || job.orderNumber || "-",
      customerName: job.customerName || job.customerSnapshot?.name || "-",
      designStatus: job.stage?.includes("APPROVED") || job.status === "COMPLETED" ? "Approved" : (job.stage?.includes("REVISION") ? "Revision Required" : (job.stage?.includes("DESIGN") ? "In Progress" : "Pending")),
      productionStatus: job.stage?.includes("PRODUCTION") || job.status === "IN_PRODUCTION" ? "In Production" : (job.stage?.includes("QC") ? "QC Pending" : "Pending"),
      deliveryDate: fmtDate(job.dueDate),
      priority: job.priority === "URGENT" || job.priority === "HIGH" ? "High" : (job.priority === "LOW" ? "Low" : "Medium"),
    }));

    // Table 2: Low Stock Items (the minimum is the item's own reorder level)
    const lowStockItems = lowStockItemsRaw.map((b) => {
      const minStock = Number(b.item?.reorderLevel ?? 0) || 0;
      const qty = Number(b.quantity) || 0;
      return {
        id: b._id,
        materialName: b.item?.name || "-",
        availableQty: qty,
        minStock,
        requiredQty: Math.max(0, minStock - qty),
        status: qty <= 0 ? "Out of Stock" : "Low Stock",
      };
    });

    // Table 3: Pending Payments
    const pendingPayments = pendingInvoicesRaw.map((inv) => ({
      id: inv._id,
      invoiceNo: inv.invoiceNumber || "-",
      customerName: inv.customerSnapshot?.name || inv.customerName || "-",
      amount: money2(inv.grandTotal),
      pending: money2(inv.balanceDue),
      dueDate: fmtDate(inv.dueDate),
      status: inv.dueDate && new Date(inv.dueDate) < new Date() ? "Overdue" : "Pending",
    }));

    // Table 4: Upcoming Deliveries
    const upcomingDeliveries = upcomingDeliveriesRaw.map((job) => ({
      id: job._id,
      jobId: job.jobNo || job.orderNumber || "-",
      customerName: job.customerName || job.customerSnapshot?.name || "-",
      deliveryDate: fmtDate(job.dueDate),
      status: job.dueDate && new Date(job.dueDate) < new Date() ? "Delayed" : "On Time",
    }));

    // Alerts come from the real counts above (nothing is shown when the count is 0)
    const overduePayments = pendingPayments.filter((r) => r.status === "Overdue").length;
    const alerts = [
      { id: "a2", type: "out_of_stock", count: outOfStockCount, message: `${outOfStockCount} materials are out of stock`, severity: "danger" },
      { id: "a3", type: "low_stock", count: lowStockCount, message: `${lowStockCount} materials below minimum stock level`, severity: "warning" },
      { id: "a5", type: "payments_overdue", count: overduePayments, message: `${overduePayments} payments overdue`, severity: "info" },
    ].filter((a) => a.count > 0);

    // ---- Branch figures for the company view (all real: nothing is estimated) ----
    const branchDocs = await liveCollection(db, "branches").find({}).project({ name: 1, code: 1, isActive: 1, branchType: 1 }).toArray();
    const retailBranches = branchDocs.filter((b) => String(b.branchType || "").toLowerCase() !== "manufacturing");
    const dateRange = { $gte: period.start, $lte: period.end };
    const byBranch = async (collection, pipeline) => {
      const rows = await liveCollection(db, collection).aggregate(pipeline).toArray();
      return new Map(rows.map((r) => [String(r._id), r]));
    };
    const [receiptsByBranch, jobsByBranch, dueByBranch, staffRows] = await Promise.all([
      byBranch("saleReceipts", [
        { $match: { status: { $nin: ["VOID", "DRAFT", "CANCELLED"] }, saleDate: dateRange } },
        { $group: { _id: { $toString: "$branchId" }, revenue: { $sum: "$grandTotal" }, collected: { $sum: { $ifNull: ["$amountPaid", 0] } } } },
      ]),
      byBranch("jobOrders", [
        { $match: { createdAt: dateRange } },
        {
          $group: {
            _id: { $toString: "$branchId" },
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $or: [{ $in: ["$status", ["COMPLETED", "DELIVERED", "CLOSED"]] }, { $in: ["$stage", ["COMPLETED", "DELIVERED", "CLOSED"]] }] }, 1, 0] } },
          },
        },
      ]),
      byBranch("invoices", [
        { $match: { isDeleted: { $ne: true }, balanceDue: { $gt: 0 } } },
        { $group: { _id: { $toString: "$branchId" }, pending: { $sum: "$balanceDue" } } },
      ]),
      liveCollection(db, "users").find({ isActive: { $ne: false } }).project({ name: 1, role: 1, branchId: 1 }).toArray(),
    ]);
    const roundTwo = (v) => Math.round((Number(v) || 0) * 100) / 100;
    const managerByBranch = new Map();
    let managerCount = 0;
    let designerCount = 0;
    for (const u of staffRows) {
      const role = String(u.role || "").toLowerCase();
      if (role.includes("manager")) {
        managerCount += 1;
        const key = String(u.branchId || "");
        if (key && !managerByBranch.has(key)) managerByBranch.set(key, u.name || "-");
      }
      if (role.includes("designer")) designerCount += 1;
    }
    const branchPerformance = retailBranches.map((b) => {
      const id = String(b._id);
      const rc = receiptsByBranch.get(id) || {};
      const jb = jobsByBranch.get(id) || {};
      const due = dueByBranch.get(id) || {};
      return {
        id,
        branch: b.name || b.code || "-",
        manager: managerByBranch.get(id) || "-",
        totalJobs: jb.total || 0,
        completed: jb.completed || 0,
        revenue: roundTwo(rc.revenue),
        collected: roundTwo(rc.collected),
        pendingAmount: roundTwo(due.pending),
        status: b.isActive === false ? "Inactive" : "Active",
      };
    }).sort((a, b) => b.revenue - a.revenue);
    const topBranches = branchPerformance.slice(0, 5).map((b, i) => ({ rank: i + 1, branch: b.branch, revenue: b.revenue, growth: null, jobs: b.totalJobs, status: b.status }));
    const activeBranches = retailBranches.filter((b) => b.isActive !== false).length;
    const branchRevenue = {
      labels: branchPerformance.map((b) => b.branch),
      revenue: branchPerformance.map((b) => b.revenue),
      collected: branchPerformance.map((b) => b.collected),
    };

    const result = {
      dashboardType: "ADMIN",
      dataType,
      selectedBranch: {
        id: branchId && String(branchId).toUpperCase() !== "ALL" ? branchId : "ALL",
        name: selectedBranchName,
      },
      period: {
        dateType: period.dateType,
        label: period.label,
        startDate: period.fromStr,
        endDate: period.toStr,
      },
      // Important 6 KPI Cards matching reference UI
      kpis: {
        totalBranches: { ...makeKpi("totalBranches", "Total Branches", retailBranches.length), subtitle: `${activeBranches} Active • ${retailBranches.length - activeBranches} Inactive` },
        totalManagers: makeKpi("totalManagers", "Branch Managers", managerCount),
        totalDesigners: makeKpi("totalDesigners", "Total Designers", designerCount),
        totalRevenue: makeKpi("totalRevenue", "Total Revenue", totalRev, null, "INR"),
        amountCollected: makeKpi("amountCollected", "Amount Collected", amountCollected, null, "INR"),
        pendingAmount: makeKpi("pendingAmount", "Pending Amount", pendingAmount, null, "INR"),
        totalJobOrders: makeKpi("totalJobOrders", "Total Job Orders", totalJobs),
        completedJobs: makeKpi("completedJobs", "Completed Jobs", completedJobs),
        totalEmployees: makeKpi("totalEmployees", "Total Employees", totalEmployees),
      },
      // 3 Main Graphs matching reference UI
      charts: {
        revenueTrend: {
          labels: dailyTrend.map((d) => d.date),
          revenue: dailyTrend.map((d) => d.revenue),
          collected: dailyTrend.map((d) => d.collected),
        },
        jobOrderStatus: {
          total: totalJobs,
          completed: completedJobs,
          completedPercentage: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
          inProgress: inProgressJobs,
          inProgressPercentage: totalJobs > 0 ? Math.round((inProgressJobs / totalJobs) * 100) : 0,
          pending: pendingJobs,
          pendingPercentage: totalJobs > 0 ? Math.round((pendingJobs / totalJobs) * 100) : 0,
          onHold: onHoldJobs,
          onHoldPercentage: totalJobs > 0 ? Math.round((onHoldJobs / totalJobs) * 100) : 0,
        },
        branchRevenue,
        stockAvailability: {
          available: availableStock,
          reserved: reservedStock,
          lowStock: lowStockCount,
          outOfStock: outOfStockCount,
        },
      },
      // Tables & Alerts matching reference UI
      branchPerformance,
      topBranches,
      recentJobOrders,
      lowStockItems,
      pendingPayments,
      upcomingDeliveries,
      alerts,
    };

    setCached(cacheKey, result);
    return result;
  }

  /**
   * =========================================================================
   * B. BRANCH MANAGER DASHBOARD - Strictly scoped to caller's assigned branch
   * =========================================================================
   */
  async getManagerDashboard(params = {}, authContext = {}) {
    const user = authContext.user || {};
    const authBranchIds = (authContext.authorizedBranchIds || []).map((b) =>
      b && b._id ? b._id.toString() : (b ? b.toString() : "")
    ).filter(Boolean);

    let effectiveBranchId = authBranchIds[0] || (user.branchId ? (user.branchId._id || user.branchId).toString() : null);

    if (params.branchId && (authContext.isSuperAdmin || authBranchIds.includes(String(params.branchId)))) {
      effectiveBranchId = String(params.branchId);
    }

    if (!effectiveBranchId) {
      const fallback = await liveCollection(mongoose.connection.db, "branches").findOne();
      if (fallback) effectiveBranchId = fallback._id.toString();
    }

    const managerData = await this.getAdminDashboard(
      {
        ...params,
        branchId: effectiveBranchId,
      },
      authContext
    );

    managerData.dashboardType = "BRANCH_MANAGER";
    return managerData;
  }

  /**
   * =========================================================================
   * C. DESIGNER DASHBOARD - Scoped to logged-in designer
   * =========================================================================
   */
  async getDesignerDashboard(params = {}, authContext = {}) {
    const { dateType = "mtd", startDate, endDate } = params;
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const user = authContext.user || {};
    const period = getResolvedPeriod({ dateType, startDate, endDate });
    const today = getTodayIST();
    const db = mongoose.connection.db;

    const designerIds = [];
    if (user._id) designerIds.push(new mongoose.Types.ObjectId(user._id));
    if (user.id && mongoose.Types.ObjectId.isValid(user.id)) designerIds.push(new mongoose.Types.ObjectId(user.id));
    if (user.employeeId && mongoose.Types.ObjectId.isValid(user.employeeId)) {
      designerIds.push(new mongoose.Types.ObjectId(user.employeeId));
    }

    const cacheKey = `dashboard:designer:${user._id || "DES"}:${period.type}:${period.fromStr}:${period.toStr}:${page}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return { ...cached, _cached: true };

    const designerMatch = designerIds.length > 0 ? { employeeId: { $in: designerIds } } : {};

    const [
      totalAssignedCount,
      approvedDesignsCount,
      rejectedDesignsCount,
      totalJobOrdersCount,
      inProgressCount,
      pendingApprovalCount,
      ratingsAgg,
      activeAssignments,
    ] = await Promise.all([
      liveCollection(db, "jobAssignments").countDocuments({
        ...designerMatch,
        status: { $in: ["ACTIVE", "COMPLETED"] },
      }),
      liveCollection(db, "jobSamples").countDocuments({
        ...(designerIds.length > 0 ? { submittedBy: { $in: designerIds } } : {}),
        status: "APPROVED",
        updatedAt: { $gte: period.start, $lte: period.end },
      }),
      liveCollection(db, "jobSamples").countDocuments({
        ...(designerIds.length > 0 ? { submittedBy: { $in: designerIds } } : {}),
        status: { $in: ["REJECTED", "REVISION_REQUIRED"] },
        updatedAt: { $gte: period.start, $lte: period.end },
      }),
      liveCollection(db, "jobOrders").countDocuments({
        stage: { $regex: /design|sample/i },
      }),
      liveCollection(db, "jobAssignments").countDocuments({
        ...designerMatch,
        status: "ACTIVE",
      }),
      liveCollection(db, "jobSamples").countDocuments({
        ...(designerIds.length > 0 ? { submittedBy: { $in: designerIds } } : {}),
        status: "SUBMITTED",
      }),
      liveCollection(db, "designerRatings").aggregate([
        { $match: designerIds.length > 0 ? { designerId: { $in: designerIds } } : {} },
        { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]).toArray(),
      liveCollection(db, "jobAssignments").aggregate([
        { $match: { ...designerMatch, status: "ACTIVE" } },
        { $sort: { assignedAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: "jobOrders",
            localField: "jobOrderId",
            foreignField: "_id",
            as: "job",
          },
        },
        { $unwind: { path: "$job", preserveNullAndEmptyArrays: true } },
      ]).toArray(),
    ]);

    const avgRating = ratingsAgg[0]?.avgRating ? Math.round(ratingsAgg[0].avgRating * 10) / 10 : null;
    const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");
    const now = new Date();
    const priorityLabel = (p) => (p === "URGENT" || p === "HIGH" ? "High" : p === "LOW" ? "Low" : "Medium");
    const statusLabel = (job) => {
      const stage = String(job.stage || job.currentStage || "").toUpperCase();
      if (stage.includes("REVISION")) return "Revision";
      if (stage.includes("SAMPLE_APPROVAL")) return "Submitted";
      if (stage.includes("APPROVED") || stage === "COMPLETED") return "Approved";
      return "In Progress";
    };

    // The designer's real open assignments (a missing field shows "-", nothing is invented)
    const workQueue = activeAssignments.map((a) => {
      const job = a.job || {};
      const status = statusLabel(job);
      return {
        id: a._id,
        jobOrderId: a.jobOrderId,
        jobNo: job.jobNo || job.orderNumber || "-",
        jobId: job.jobNo || job.orderNumber || "-",
        title: job.title || "-",
        designRequirement: job.title || "-",
        customerName: job.customerName || job.customerSnapshot?.name || "-",
        priority: priorityLabel(job.priority),
        stage: job.stage || job.currentStage || "-",
        status,
        sampleStatus: job.sampleStatus || "-",
        dueDate: fmtDate(job.dueDate),
        deadline: fmtDate(job.dueDate),
        dueAt: job.dueDate || null,
        assignedAt: fmtDate(a.assignedAt),
        assignedDate: fmtDate(a.assignedAt),
        revisionCount: Number(job.revisionCount) || 0,
      };
    });
    const overdueDesigns = workQueue.filter((w) => w.dueAt && new Date(w.dueAt) < now && w.status !== "Approved").length;
    const revisionDesigns = workQueue.filter((w) => w.status === "Revision").length;
    const upcomingDeadlines = workQueue
      .filter((w) => w.dueAt)
      .sort((x, y) => new Date(x.dueAt) - new Date(y.dueAt))
      .slice(0, 5)
      .map((w) => ({ id: "ud-" + w.id, jobId: w.jobId, customerName: w.customerName, deadline: w.deadline, priority: w.priority, status: w.status }));

    const statusItems = [
      { label: "Approved", count: approvedDesignsCount || 0, color: "#10b981" },
      { label: "In Progress", count: inProgressCount || 0, color: "#0ea5e9" },
      { label: "Submitted", count: pendingApprovalCount || 0, color: "#f59e0b" },
      { label: "Revision", count: revisionDesigns, color: "#f97316" },
      { label: "Rejected", count: rejectedDesignsCount || 0, color: "#ef4444" },
    ];
    const statusTotal = statusItems.reduce((sum, i) => sum + i.count, 0);
    const priorityCount = (label) => workQueue.filter((w) => w.priority === label).length;

    const result = {
      dashboardType: "DESIGNER",
      designer: {
        id: user._id || user.id,
        name: user.name || "-",
        role: "Graphic Designer",
        email: user.email,
        averageRating: avgRating,
      },
      period: {
        dateType: period.dateType,
        label: period.label,
        startDate: period.fromStr,
        endDate: period.toStr,
      },
      kpis: {
        totalAssignedDesigns: makeKpi("totalAssignedDesigns", "Total Assigned Designs", totalAssignedCount || 0),
        inProgressDesigns: makeKpi("inProgressDesigns", "In Progress", inProgressCount || 0),
        submittedDesigns: makeKpi("submittedDesigns", "Submitted", pendingApprovalCount || 0),
        approvedDesigns: makeKpi("approvedDesigns", "Approved", approvedDesignsCount || 0),
        rejectedDesigns: makeKpi("rejectedDesigns", "Rejected", rejectedDesignsCount || 0),
        revisionRequested: makeKpi("revisionRequested", "Revision Requested", revisionDesigns),
        overdueDesigns: makeKpi("overdueDesigns", "Overdue Designs", overdueDesigns),
      },
      // Charts use real counts only; a chart without data is left empty instead of showing sample bars
      charts: {
        progressTrend: { labels: [], assigned: [], completed: [] },
        statusDistribution: {
          total: statusTotal,
          items: statusItems.map((i) => ({ ...i, percentage: statusTotal > 0 ? Math.round((i.count / statusTotal) * 100) : 0 })),
        },
        priorityDistribution: [
          { priority: "High", count: priorityCount("High"), color: "#ef4444" },
          { priority: "Medium", count: priorityCount("Medium"), color: "#f59e0b" },
          { priority: "Low", count: priorityCount("Low"), color: "#10b981" },
        ],
        monthlyPerformance: { months: [], approved: [], rejected: [] },
      },
      assignedJobs: workQueue,
      upcomingDeadlines,
      recentSubmissions: [],
      alerts: [
        { id: "al-1", message: `${overdueDesigns} designs are overdue`, severity: "danger", count: overdueDesigns },
        { id: "al-2", message: `${revisionDesigns} designs require revision`, severity: "danger", count: revisionDesigns },
      ].filter((a) => a.count > 0),
      pagination: {
        page,
        limit,
        totalRecords: totalAssignedCount || 0,
        totalPages: Math.max(1, Math.ceil((totalAssignedCount || 0) / limit)),
      },
    };

    setCached(cacheKey, result);
    return result;
  }
}

const dashboardService = new DashboardService();

module.exports = {
  dashboardService,
  DashboardService,
  clearCache,
  getResolvedPeriod,
  getTodayIST,
  getMtdIST,
  getLastNDaysIST,
  getLastMonthIST,
};
