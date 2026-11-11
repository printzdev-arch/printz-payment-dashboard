const Notification = require("../../notifications/models/Notification");
const { SaleOrder } = require("../models");
const { STATUS, MFG_QUEUE, MFG_ACTIVE, NOTIFICATION } = require("../models/saleOrder.constants");
const {
  err,
  invalidStatus,
  idStr,
  isValidId,
  toObjectId,
  runInTransaction,
  addEvent,
  notify,
  canWorkUnit,
} = require("./saleOrder.helpers");

/**
 * Manufacturing unit portal. Everyone who works at the unit shares the same orders and can do every step;
 * there are no unit managers or designers. Admins see every unit.
 */

const assertUnitStaff = (actor) => {
  if (!actor.isAdmin && !actor.isMfg) throw err(403, "FORBIDDEN", "This is for the manufacturing unit.");
};

/** Orders of the caller's unit (all units for an admin, or one with ?unitId=). */
const unitFilter = (actor, query = {}) => {
  if (actor.isAdmin) return isValidId(query.unitId) ? { manufacturingUnitId: toObjectId(query.unitId) } : {};
  return { manufacturingUnitId: toObjectId(actor.mfgUnitId) };
};

const LIST_FIELDS = "orderNo status priority orderDate expectedDeliveryDate customerSnapshot.name customerSnapshot.mobile orderBranchId manufacturingUnitId currentAssignment currentDesignVersion printing.completedAt";

/** Counts per stage, the caller's own open work and their unread notifications. */
async function getDashboard(actor, query = {}) {
  assertUnitStaff(actor);
  const filter = unitFilter(actor, query);

  const [byStatus, readyToDispatch, myOrders, notifications] = await Promise.all([
    SaleOrder.aggregate([{ $match: { ...filter, status: { $in: MFG_ACTIVE } } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    SaleOrder.countDocuments({ ...filter, status: STATUS.PRINTING, "printing.completedAt": { $ne: null } }),
    SaleOrder.find({ ...filter, status: { $in: MFG_ACTIVE }, "currentAssignment.designerUserId": toObjectId(actor.userId) })
      .sort({ priority: -1, expectedDeliveryDate: 1 })
      .select(LIST_FIELDS)
      .limit(50)
      .lean(),
    Notification.find({ userId: toObjectId(actor.userId), entityType: "SALE_ORDER", isRead: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const counts = Object.fromEntries(byStatus.map((r) => [r._id, r.count]));
  counts.READY_TO_DISPATCH = readyToDispatch;
  return { counts, myOrders, notifications };
}

/**
 * The unit's board: every open order, urgent first then oldest. Orders nobody has taken yet are in the queue
 * (they can be taken); the rest show who took them. Everyone at the unit sees the same list.
 * minutesWaiting is how long a queued order has waited.
 */
async function getQueue(actor, query = {}) {
  assertUnitStaff(actor);
  const orders = await SaleOrder.find({ ...unitFilter(actor, query), status: { $in: MFG_ACTIVE } })
    .sort({ priority: -1, orderDate: 1 }) // "URGENT" sorts after "NORMAL", so -1 puts it first
    .select(LIST_FIELDS)
    .lean();
  const now = Date.now();
  return orders.map((o) => ({
    ...o,
    isQueued: MFG_QUEUE.includes(o.status),
    minutesWaiting: Math.max(0, Math.round((now - new Date(o.orderDate).getTime()) / 60000)),
  }));
}

/** Take an order from the queue and start designing it: PLACED -> IN_DESIGN. First one to take it wins. */
async function takeOrder(id, actor) {
  if (!isValidId(id)) throw err(404, "NOT_FOUND", "Sale order not found.");
  const order = await SaleOrder.findById(id).lean();
  if (!order) throw err(404, "NOT_FOUND", "Sale order not found.");
  if (!canWorkUnit(actor, order)) throw err(403, "FORBIDDEN", "This order belongs to another manufacturing unit.");
  if (!MFG_QUEUE.includes(order.status)) throw invalidStatus(order, MFG_QUEUE);

  const now = new Date();
  const taken = await runInTransaction(async (session) => {
    // Conditional on the status, so two people can never take the same order
    const updated = await SaleOrder.findOneAndUpdate(
      { _id: order._id, status: { $in: MFG_QUEUE } },
      {
        $set: {
          status: STATUS.IN_DESIGN,
          currentAssignment: { designerUserId: toObjectId(actor.userId), designerName: actor.name, assignedAt: now, method: "TAKEN" },
        },
      },
      { new: true, session }
    );
    if (!updated) throw err(409, "ALREADY_TAKEN", `Order ${order.orderNo} was just taken by someone else.`);
    await addEvent(session, { order, action: "TAKEN", fromStatus: order.status, toStatus: STATUS.IN_DESIGN, actor });
    return updated.toObject();
  });

  await notify({
    userIds: [idStr(order.createdBy)],
    branchId: order.orderBranchId,
    type: NOTIFICATION.TAKEN,
    title: "Design started",
    message: `Order ${order.orderNo} is being designed by ${actor.name}.`,
    orderId: order._id,
  });
  return taken;
}

module.exports = { getDashboard, getQueue, takeOrder };
