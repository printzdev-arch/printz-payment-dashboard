const mongoose = require("mongoose");
const AppError = require("../../../utils/errors/AppError");
const NumberSequence = require("../../number-sequences/models/NumberSequence");
const Notification = require("../../notifications/models/Notification");
const User = require("../../auth/models/User");
const Employee = require("../../employees/models/Employee");
const { SaleOrderEvent } = require("../models");
const { ROLE } = require("../models/saleOrder.constants");

const err = (status, code, message, details = null) => new AppError(message, status, code, details);

const invalidStatus = (order, allowed) =>
  err(
    409,
    "INVALID_STATUS",
    `Order ${order.orderNo} is ${order.status}. This action needs status ${allowed.join(" / ")}.`
  );

const round2 = (n) => require("../../../utils/validation/roundMoney").roundMoney(n || 0);

const idStr = (v) => String(v?._id || v || "");

const isValidId = (v) => mongoose.Types.ObjectId.isValid(idStr(v));

const toObjectId = (v) => new mongoose.Types.ObjectId(idStr(v));

/** Ids are sometimes stored as strings and sometimes as ObjectIds. Match both. */
const idVariants = (v) => {
  const s = idStr(v);
  return mongoose.Types.ObjectId.isValid(s) ? [s, new mongoose.Types.ObjectId(s)] : [s];
};

const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const periodIST = () => todayIST().slice(2, 4) + todayIST().slice(5, 7); // YYMM

const dayToDate = (yyyyMmDd) => new Date(`${yyyyMmDd}T00:00:00.000Z`);

const isDateString = (s) =>
  typeof s === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(s)) &&
  new Date(`${s}T00:00:00.000Z`).toISOString().slice(0, 10) === s; // the day must really exist

/** Normalise an Indian mobile number to 10 digits, or return "" when it is not valid. */
const normalizeMobile = (value) => {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
};

/** Generate SO-2610-0001 style numbers from numberSequences. */
async function nextNumber(sequenceKey, prefix) {
  const period = periodIST();
  const seq = await NumberSequence.incrementAndGet(sequenceKey, null, period);
  return `${prefix}-${period}-${String(seq.lastValue).padStart(4, "0")}`;
}

const lower = (v) => String(v || "").toLowerCase();

/**
 * Who is calling. Role names come from users.role / the linked employee role code, never from the request body.
 */
function getActor(req) {
  const user = req.user || {};
  const roles = new Set([lower(user.role), lower(user.roleCode)].filter(Boolean));
  const has = (list) => list.some((r) => roles.has(r));

  const branchIds = new Set();
  (user.branchIds || []).forEach((b) => b && branchIds.add(idStr(b)));
  if (user.branchId) branchIds.add(idStr(user.branchId));

  const isAdmin = Boolean(req.authz?.isSuperAdmin) || has(ROLE.ADMIN);
  const isBranchManager = has(ROLE.BRANCH_MANAGER);
  const isBranchOperator = has(ROLE.BRANCH_OPERATOR);
  // Someone who works at the manufacturing unit (set when the profile is built from their branch).
  // Everyone there works every order of the unit: take it, design it, print it, dispatch it.
  const isMfg = Boolean(user.isMfgUnit) && !isAdmin;
  const mfgUnitId = isMfg ? idStr(user.mfgUnitId || user.branchId) : null;

  let roleLabel = "user";
  if (isAdmin) roleLabel = "admin";
  else if (isMfg) roleLabel = "mfg";
  else if (isBranchManager) roleLabel = "manager";
  else if (isBranchOperator) roleLabel = "operator";

  return {
    userId: idStr(user._id || user.id),
    name: user.name || user.fullName || user.email || "User",
    employeeId: user.employeeId ? idStr(user.employeeId) : null,
    branchIds: Array.from(branchIds),
    isAdmin,
    isBranchManager,
    isBranchOperator,
    isBranchStaff: (isBranchManager || isBranchOperator) && !isMfg,
    isMfg,
    mfgUnitId,
    roleLabel,
  };
}

/** May this caller do the unit's work on this order? Anyone at its unit, or an admin. */
const canWorkUnit = (actor, order) =>
  actor.isAdmin || Boolean(actor.isMfg && actor.mfgUnitId && actor.mfgUnitId === idStr(order.manufacturingUnitId));

/** Run work in a MongoDB transaction when the server is a replica set (Atlas is). */
async function runInTransaction(work) {
  const client = mongoose.connection.client;
  const isReplicaSet = Boolean(client?.topology?.description?.servers?.size > 1);
  if (!isReplicaSet) return work(null);

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

/** Append one saleOrderEvents row (call inside the same transaction as the order update). */
const addEvent = (session, { order, action, fromStatus, toStatus, actor, notes = "", meta = {}, branchId }) =>
  SaleOrderEvent.create(
    [
      {
        orderId: order._id,
        action,
        fromStatus: fromStatus === undefined ? order.status : fromStatus,
        toStatus,
        actorId: actor?.userId ? toObjectId(actor.userId) : null,
        actorRole: actor?.roleLabel || "system",
        branchId: branchId || order.orderBranchId,
        notes,
        meta,
      },
    ],
    { session }
  );

/** Best-effort notifications. A failed notification never fails the business action. */
async function notify({ userIds = [], branchId = null, type, title, message, orderId }) {
  try {
    const docs = [];
    const base = { type, title, message, entityType: "SALE_ORDER", entityId: orderId || null };
    userIds.filter(isValidId).forEach((id) => docs.push({ ...base, userId: toObjectId(id) }));
    if (branchId && isValidId(branchId)) docs.push({ ...base, branchId: toObjectId(branchId) });
    if (docs.length) await Notification.insertMany(docs);
  } catch (e) {
    console.warn("[SaleOrder] notification failed:", e.message);
  }
}

/** Active logins of everyone who works at a manufacturing unit (their employee record sits at that branch). */
async function findUnitUsers(unitId) {
  if (!isValidId(unitId)) return [];
  const employees = await Employee.find({ branchId: { $in: idVariants(unitId) } }).select("_id").lean();
  const or = [{ branchId: { $in: idVariants(unitId) } }];
  if (employees.length) or.push({ employeeId: { $in: employees.flatMap((e) => idVariants(e._id)) } });
  const users = await User.find({ isActive: { $ne: false }, $or: or }).select("_id").lean();
  return users.map((u) => idStr(u._id));
}

module.exports = {
  err,
  invalidStatus,
  round2,
  idStr,
  isValidId,
  toObjectId,
  idVariants,
  todayIST,
  periodIST,
  dayToDate,
  isDateString,
  normalizeMobile,
  nextNumber,
  getActor,
  runInTransaction,
  addEvent,
  notify,
  findUnitUsers,
  canWorkUnit,
};
