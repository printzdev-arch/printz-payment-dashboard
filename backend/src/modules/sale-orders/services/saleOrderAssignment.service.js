const mongoose = require("mongoose");
const DailyAttendance = require("../../attendance/models/DailyAttendance");
const Notification = require("../../notifications/models/Notification");
const {
  SaleOrder,
  SaleOrderItem,
  MfgDesignerProfile,
  MfgDesignAssignment,
} = require("../models");
const {
  STATUS,
  DESIGNER_HOLDING,
  REASSIGNABLE,
  NOTIFICATION,
} = require("../constants/saleOrder");
const {
  err,
  invalidStatus,
  idStr,
  idVariants,
  isValidId,
  toObjectId,
  todayIST,
  runInTransaction,
  addEvent,
  notify,
  audit,
  findUsersByRole,
} = require("./saleOrder.helpers");

const AVAILABILITY = ["AVAILABLE", "BUSY", "ON_BREAK", "OFF_DUTY"];

/** Thrown inside a transaction when the chosen designer's slot was taken meanwhile. */
class SlotTakenError extends Error {}

const canManageUnit = (actor, unitId) =>
  actor.isAdmin || (actor.isMfgManager && (actor.branchIds.length === 0 || actor.branchIds.includes(idStr(unitId))));

/** Designer absent or on leave today (from the attendance module). */
async function isAbsentToday(profile) {
  if (!profile.employeeId) return false;
  const rec = await DailyAttendance.findOne({
    employeeId: { $in: idVariants(profile.employeeId) },
    attendanceDate: todayIST(),
    status: { $in: ["ABSENT", "ON_LEAVE"] },
  })
    .select("_id")
    .lean();
  return Boolean(rec);
}

/** Build the designer pool for a unit and the reasons others were skipped. */
async function buildPool(unitId, productTypes = []) {
  const profiles = await MfgDesignerProfile.find({ manufacturingUnitId: unitId, isActive: true }).lean();
  const candidates = [];
  const eligible = [];

  for (const p of profiles) {
    let reason = "";
    if (p.availability !== "AVAILABLE") reason = `availability is ${p.availability}`;
    else if (p.activeOrders >= p.maxActiveOrders) reason = "at capacity";
    else if (await isAbsentToday(p)) reason = "absent or on leave today";
    else if (p.skills?.length && productTypes.length && !productTypes.some((t) => p.skills.includes(t)))
      reason = "skills do not match";

    candidates.push({
      userId: p.userId,
      availability: p.availability,
      activeOrders: p.activeOrders,
      skipped: Boolean(reason),
      reason,
    });
    if (!reason) eligible.push(p);
  }

  // Fewest active orders first; tie -> oldest lastAssignedAt (never assigned counts as oldest)
  eligible.sort(
    (a, b) =>
      a.activeOrders - b.activeOrders ||
      (a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0) -
        (b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0)
  );
  return { eligible, candidates };
}

/**
 * Claim the order and the designer's slot together. The order claim is conditional on its status,
 * so two workers can never assign the same order twice.
 */
async function claimAndAssign(order, profile, { method, assignedBy = null, reason = "", candidates = [], enforceCapacity }) {
  return runInTransaction(async (session) => {
    const assignmentId = new mongoose.Types.ObjectId();
    const now = new Date();

    const claimed = await SaleOrder.findOneAndUpdate(
      { _id: order._id, status: { $in: [STATUS.DRAFT, STATUS.PLACED, STATUS.WAITING_FOR_DESIGNER] } },
      {
        $set: {
          status: STATUS.ASSIGNED,
          currentAssignment: {
            assignmentId,
            designerUserId: profile.userId,
            designerName: profile.displayName,
            assignedAt: now,
            method,
          },
        },
      },
      { new: true, session }
    );
    if (!claimed) throw invalidStatus(order, [STATUS.DRAFT, STATUS.PLACED, STATUS.WAITING_FOR_DESIGNER]);

    const slotFilter = { _id: profile._id, isActive: true };
    if (enforceCapacity) {
      slotFilter.availability = "AVAILABLE";
      slotFilter.$expr = { $lt: ["$activeOrders", "$maxActiveOrders"] };
    }
    const slot = await MfgDesignerProfile.findOneAndUpdate(
      slotFilter,
      { $inc: { activeOrders: 1 }, $set: { lastAssignedAt: now } },
      { new: true, session }
    );
    if (!slot) throw new SlotTakenError();

    await MfgDesignAssignment.create(
      [
        {
          _id: assignmentId,
          orderId: order._id,
          designerUserId: profile.userId,
          method,
          assignedBy: assignedBy ? toObjectId(assignedBy.userId) : null,
          assignedAt: now,
          status: "ACTIVE",
          reason,
          selectionSnapshot: { candidates },
        },
      ],
      { session }
    );

    await addEvent(session, {
      order,
      action: method === "AUTO" ? "AUTO_ASSIGNED" : "MANUAL_ASSIGNED",
      fromStatus: order.status,
      toStatus: STATUS.ASSIGNED,
      actor: assignedBy ? { userId: assignedBy.userId, roleLabel: assignedBy.roleLabel } : null,
      notes: reason,
      meta: { designerUserId: idStr(profile.userId), method },
    });
    return claimed;
  });
}

async function notifyAssigned(order, profile) {
  await notify({
    userIds: [idStr(profile.userId)],
    type: NOTIFICATION.ASSIGNED,
    title: "New order assigned",
    message: `Order ${order.orderNo} is assigned to you.`,
    orderId: order._id,
  });
  await notify({
    userIds: [idStr(order.createdBy)],
    branchId: order.orderBranchId,
    type: NOTIFICATION.ASSIGNED,
    title: "Order assigned",
    message: `Order ${order.orderNo} is assigned to ${profile.displayName}.`,
    orderId: order._id,
  });
}

/**
 * Auto-assign one order. Runs when an order becomes PLACED and when the waiting queue is processed.
 * Returns { assigned, order }.
 */
async function assignDesigner(orderId) {
  const order = await SaleOrder.findById(orderId).lean();
  if (!order) throw err(404, "NOT_FOUND", "Sale order not found.");
  if (![STATUS.DRAFT, STATUS.PLACED, STATUS.WAITING_FOR_DESIGNER].includes(order.status)) {
    return { assigned: false, order };
  }

  const items = await SaleOrderItem.find({ orderId: order._id }).select("productType").lean();
  const { eligible, candidates } = await buildPool(order.manufacturingUnitId, items.map((i) => i.productType));

  for (const profile of eligible) {
    try {
      const claimed = await claimAndAssign(order, profile, {
        method: "AUTO",
        candidates,
        enforceCapacity: true,
      });
      await notifyAssigned(claimed, profile);
      return { assigned: true, order: claimed };
    } catch (e) {
      if (e instanceof SlotTakenError) continue; // someone else took this designer; try the next one
      if (e.code === "INVALID_STATUS") return { assigned: false, order }; // order claimed by another worker
      throw e;
    }
  }

  // Nobody is free: queue the order and tell the unit managers (once, on the move to WAITING)
  if ([STATUS.DRAFT, STATUS.PLACED].includes(order.status)) {
    const waiting = await runInTransaction(async (session) => {
      const moved = await SaleOrder.findOneAndUpdate(
        { _id: order._id, status: { $in: [STATUS.DRAFT, STATUS.PLACED] } },
        { $set: { status: STATUS.WAITING_FOR_DESIGNER } },
        { new: true, session }
      );
      if (moved) {
        await addEvent(session, {
          order,
          action: "WAITING_FOR_DESIGNER",
          fromStatus: order.status,
          toStatus: STATUS.WAITING_FOR_DESIGNER,
          actor: null,
          notes: "No designer available",
          meta: { candidates },
        });
      }
      return moved;
    });
    if (waiting) {
      const managers = await findUsersByRole(["MFG_MANAGER"], order.manufacturingUnitId);
      await notify({
        userIds: managers,
        type: NOTIFICATION.WAITING,
        title: "Order waiting for a designer",
        message: `Order ${order.orderNo} is waiting. No designer is available.`,
        orderId: order._id,
      });
      return { assigned: false, order: waiting };
    }
  }
  return { assigned: false, order };
}

/** Assign waiting orders (URGENT first, then oldest) until the pool is empty. */
async function processQueue(unitId) {
  let assigned = 0;
  for (let i = 0; i < 200; i++) {
    const next = await SaleOrder.findOne({ manufacturingUnitId: unitId, status: STATUS.WAITING_FOR_DESIGNER })
      .sort({ priority: -1, orderDate: 1, _id: 1 }) // "URGENT" sorts after "NORMAL", so -1 puts it first
      .select("_id")
      .lean();
    if (!next) break;
    const result = await assignDesigner(next._id);
    if (!result.assigned) break;
    assigned++;
  }
  return assigned;
}

/**
 * Free the designer slot held by an order (dispatch / cancel). Call inside the transaction
 * that moves the order out of the designer's hands.
 */
async function releaseDesigner(session, order, { assignmentStatus = "COMPLETED", reason = "" } = {}) {
  const current = order.currentAssignment;
  if (!current?.assignmentId) return false;

  const assignment = await MfgDesignAssignment.findOneAndUpdate(
    { _id: current.assignmentId, status: "ACTIVE" },
    { $set: { status: assignmentStatus, releasedAt: new Date(), reason } },
    { new: true, session }
  );
  if (!assignment) return false; // already released

  await MfgDesignerProfile.updateOne(
    { userId: current.designerUserId, activeOrders: { $gt: 0 } },
    { $inc: { activeOrders: -1 } },
    { session }
  );
  return true;
}

/** MFG manager (own unit) or admin assigns a waiting order by hand. */
async function manualAssign(orderId, body, actor) {
  const order = await SaleOrder.findById(orderId).lean();
  if (!order) throw err(404, "NOT_FOUND", "Sale order not found.");
  if (!canManageUnit(actor, order.manufacturingUnitId)) {
    throw err(403, "FORBIDDEN", "Only the manufacturing unit manager or an admin can assign orders.");
  }
  if (![STATUS.DRAFT, STATUS.PLACED, STATUS.WAITING_FOR_DESIGNER].includes(order.status)) {
    throw invalidStatus(order, [STATUS.DRAFT, STATUS.PLACED, STATUS.WAITING_FOR_DESIGNER]);
  }

  const profile = isValidId(body.designerUserId)
    ? await MfgDesignerProfile.findOne({
        userId: toObjectId(body.designerUserId),
        manufacturingUnitId: order.manufacturingUnitId,
        isActive: true,
      }).lean()
    : null;
  if (!profile) {
    throw err(422, "INVALID_DESIGNER", "The selected user is not an active designer of this manufacturing unit.");
  }

  const overCapacity = profile.activeOrders >= profile.maxActiveOrders;
  const reason = String(body.reason || "").trim();
  if (overCapacity && !reason) {
    throw err(422, "REASON_REQUIRED", "A reason is required to assign beyond the designer's capacity.");
  }

  const claimed = await claimAndAssign(order, profile, {
    method: "MANUAL",
    assignedBy: actor,
    reason,
    enforceCapacity: false,
  });
  await notifyAssigned(claimed, profile);
  await audit({
    actor,
    action: "SALE_ORDER_MANUAL_ASSIGNED",
    order: claimed,
    after: { designer: profile.displayName, designerUserId: idStr(profile.userId), reason },
  });
  return claimed;
}

/** Move an order that is already with a designer to another designer. Status does not change. */
async function reassign(orderId, body, actor) {
  const order = await SaleOrder.findById(orderId).lean();
  if (!order) throw err(404, "NOT_FOUND", "Sale order not found.");
  if (!canManageUnit(actor, order.manufacturingUnitId)) {
    throw err(403, "FORBIDDEN", "Only the manufacturing unit manager or an admin can reassign orders.");
  }
  if (!REASSIGNABLE.includes(order.status)) throw invalidStatus(order, REASSIGNABLE);

  const reason = String(body.reason || "").trim();
  if (!reason) throw err(422, "REASON_REQUIRED", "A reason is required to reassign an order.");

  const oldUserId = idStr(order.currentAssignment?.designerUserId);
  if (isValidId(body.designerUserId) && idStr(body.designerUserId) === oldUserId) {
    throw err(422, "SAME_DESIGNER", "The order is already assigned to this designer.");
  }

  const profile = isValidId(body.designerUserId)
    ? await MfgDesignerProfile.findOne({
        userId: toObjectId(body.designerUserId),
        manufacturingUnitId: order.manufacturingUnitId,
        isActive: true,
      }).lean()
    : null;
  if (!profile) {
    throw err(422, "INVALID_DESIGNER", "The selected user is not an active designer of this manufacturing unit.");
  }

  const result = await runInTransaction(async (session) => {
    const assignmentId = new mongoose.Types.ObjectId();
    const now = new Date();

    const updated = await SaleOrder.findOneAndUpdate(
      { _id: order._id, status: order.status, "currentAssignment.designerUserId": order.currentAssignment.designerUserId },
      {
        $set: {
          currentAssignment: {
            assignmentId,
            designerUserId: profile.userId,
            designerName: profile.displayName,
            assignedAt: now,
            method: "REASSIGN",
          },
        },
      },
      { new: true, session }
    );
    if (!updated) throw err(409, "INVALID_STATUS", "The order changed while reassigning. Please retry.");

    await MfgDesignAssignment.updateOne(
      { _id: order.currentAssignment.assignmentId, status: "ACTIVE" },
      { $set: { status: "REASSIGNED", releasedAt: now, reason } },
      { session }
    );
    await MfgDesignerProfile.updateOne(
      { userId: order.currentAssignment.designerUserId, activeOrders: { $gt: 0 } },
      { $inc: { activeOrders: -1 } },
      { session }
    );
    await MfgDesignerProfile.updateOne(
      { _id: profile._id },
      { $inc: { activeOrders: 1 }, $set: { lastAssignedAt: now } },
      { session }
    );
    await MfgDesignAssignment.create(
      [
        {
          _id: assignmentId,
          orderId: order._id,
          designerUserId: profile.userId,
          method: "REASSIGN",
          assignedBy: toObjectId(actor.userId),
          assignedAt: now,
          status: "ACTIVE",
          reason,
        },
      ],
      { session }
    );
    await addEvent(session, {
      order,
      action: "REASSIGNED",
      fromStatus: order.status,
      toStatus: order.status,
      actor,
      notes: reason,
      meta: { from: oldUserId, to: idStr(profile.userId) },
    });
    return updated;
  });

  await notify({
    userIds: [oldUserId],
    type: NOTIFICATION.REASSIGNED,
    title: "Order reassigned",
    message: `Order ${order.orderNo} was moved to another designer.`,
    orderId: order._id,
  });
  await notifyAssigned(result, profile);
  await audit({
    actor,
    action: "SALE_ORDER_REASSIGNED",
    order: result,
    before: { designerUserId: oldUserId },
    after: { designer: profile.displayName, designerUserId: idStr(profile.userId), reason },
  });
  return result;
}

/** Designer sets own availability; managers/admins may set another designer's. */
async function setAvailability(actor, body) {
  const availability = String(body.availability || "").toUpperCase();
  if (!AVAILABILITY.includes(availability)) {
    throw err(422, "INVALID_AVAILABILITY", `Availability must be one of ${AVAILABILITY.join(", ")}.`);
  }

  const targetUserId = body.userId && idStr(body.userId) !== actor.userId ? idStr(body.userId) : actor.userId;
  const profile = isValidId(targetUserId)
    ? await MfgDesignerProfile.findOne({ userId: toObjectId(targetUserId) })
    : null;
  if (!profile) throw err(404, "PROFILE_NOT_FOUND", "No designer profile found for this user.");

  if (targetUserId !== actor.userId && !canManageUnit(actor, profile.manufacturingUnitId)) {
    throw err(403, "FORBIDDEN", "You can only change your own availability.");
  }

  profile.availability = availability;
  await profile.save();

  let assigned = 0;
  if (availability === "AVAILABLE") assigned = await processQueue(profile.manufacturingUnitId);
  return { profile: profile.toObject(), queueAssigned: assigned };
}

/** Dashboard: designer sees own queue; unit manager / admin sees the unit. */
async function getDashboard(actor, query = {}) {
  const unitFilter = (() => {
    if (actor.isAdmin) return query.unitId && isValidId(query.unitId) ? { manufacturingUnitId: toObjectId(query.unitId) } : {};
    const validBranchIds = actor.branchIds.filter(isValidId).map(toObjectId);
    if (validBranchIds.length > 0) return { manufacturingUnitId: { $in: validBranchIds } };
    return {};
  })();

  const notifications = await Notification.find({
    userId: toObjectId(actor.userId),
    entityType: "SALE_ORDER",
    isRead: false,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  if (actor.isMfgDesigner && !actor.isAdmin) {
    const profile = await MfgDesignerProfile.findOne({ userId: toObjectId(actor.userId) }).lean();
    const mine = { "currentAssignment.designerUserId": toObjectId(actor.userId), status: { $in: DESIGNER_HOLDING } };
    const orders = await SaleOrder.find(mine)
      .sort({ priority: -1, expectedDeliveryDate: 1 })
      .select("orderNo status priority expectedDeliveryDate customerSnapshot.name orderBranchId currentDesignVersion")
      .limit(100)
      .lean();
    const counts = {};
    orders.forEach((o) => (counts[o.status] = (counts[o.status] || 0) + 1));
    return { role: "mfg_designer", profile, counts, orders, notifications };
  }

  if (!actor.isMfgManager && !actor.isAdmin) {
    throw err(403, "FORBIDDEN", "The manufacturing dashboard is for designers and unit managers.");
  }

  const byStatus = await SaleOrder.aggregate([
    { $match: { ...unitFilter, status: { $nin: [STATUS.DELIVERED, STATUS.CANCELLED] } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(byStatus.map((r) => [r._id, r.count]));
  const designers = await MfgDesignerProfile.find({ ...unitFilter, isActive: true }).lean();
  return { role: actor.isAdmin ? "admin" : "mfg_manager", counts, designers, notifications };
}

/** Waiting queue for the unit manager: URGENT first, then oldest, with minutes waiting. */
async function getQueue(actor, query = {}) {
  if (!actor.isMfgManager && !actor.isAdmin) throw err(403, "FORBIDDEN", "Only unit managers or admins can view the queue.");
  const filter = { status: { $in: [STATUS.DRAFT, STATUS.WAITING_FOR_DESIGNER, STATUS.PLACED] } };
  if (!actor.isAdmin) {
    const validBranchIds = actor.branchIds.filter(isValidId).map(toObjectId);
    if (validBranchIds.length > 0) filter.manufacturingUnitId = { $in: validBranchIds };
  } else if (query.unitId && isValidId(query.unitId)) {
    filter.manufacturingUnitId = toObjectId(query.unitId);
  }

  const orders = await SaleOrder.find(filter)
    .sort({ priority: -1, orderDate: 1 })
    .select("orderNo status priority orderDate expectedDeliveryDate customerSnapshot.name orderBranchId manufacturingUnitId")
    .lean();
  const now = Date.now();
  return orders.map((o) => ({ ...o, minutesWaiting: Math.max(0, Math.round((now - new Date(o.orderDate).getTime()) / 60000)) }));
}

/** Designers of a unit, so the manager can choose one for manual assign / reassign. */
async function listDesigners(actor, query = {}) {
  if (!actor.isMfgManager && !actor.isAdmin) throw err(403, "FORBIDDEN", "Only unit managers or admins can list designers.");
  const filter = { isActive: true };
  if (!actor.isAdmin) {
    const validBranchIds = actor.branchIds.filter(isValidId).map(toObjectId);
    if (validBranchIds.length > 0) filter.manufacturingUnitId = { $in: validBranchIds };
  } else if (query.unitId && isValidId(query.unitId)) {
    filter.manufacturingUnitId = toObjectId(query.unitId);
  }
  return MfgDesignerProfile.find(filter).sort({ displayName: 1 }).lean();
}

module.exports = {
  assignDesigner,
  processQueue,
  releaseDesigner,
  manualAssign,
  reassign,
  setAvailability,
  getDashboard,
  getQueue,
  listDesigners,
  canManageUnit,
};
