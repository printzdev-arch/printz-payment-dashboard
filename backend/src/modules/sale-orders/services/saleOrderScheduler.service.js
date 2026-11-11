const { SaleOrder } = require("../models");
const { STATUS, MFG_QUEUE, MFG_ACTIVE, NOTIFICATION, SALE_ORDER_SETTINGS } = require("../models/saleOrder.constants");
const { idStr, todayIST, dayToDate, notify, findUnitUsers } = require("./saleOrder.helpers");

/**
 * Background alerts (every 15 minutes by default):
 *  1. Order still in the unit's queue 30 min after it was placed -> remind everyone at the unit
 *  2. No customer reply 24 h after SENT_FOR_APPROVAL -> remind the branch to call the customer
 *  3. Deliver-by date is tomorrow (or past) and not DISPATCHED -> flag overdue to the branch and the unit
 */
class SaleOrderSchedulerService {
  constructor() {
    this.intervalHandle = null;
    this.running = false;
  }

  startScheduler() {
    if (this.intervalHandle) return;
    const intervalMs = SALE_ORDER_SETTINGS.schedulerIntervalMinutes * 60 * 1000;
    this.intervalHandle = setInterval(() => this.runOnce().catch((e) => console.error("[SaleOrderScheduler]", e.message)), intervalMs);
    setTimeout(() => this.runOnce().catch(() => {}), 10000);
  }

  stopScheduler() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    this.intervalHandle = null;
  }

  async runOnce() {
    if (this.running) return null; // never overlap two runs
    this.running = true;
    try {
      return {
        waitingInQueue: await this.remindWaitingInQueue(),
        noReply: await this.remindNoReply(),
        overdue: await this.flagOverdue(),
      };
    } finally {
      this.running = false;
    }
  }

  async remindWaitingInQueue() {
    const cutoff = new Date(Date.now() - SALE_ORDER_SETTINGS.notOpenedReminderMinutes * 60000);
    const orders = await SaleOrder.find({
      status: { $in: MFG_QUEUE },
      orderDate: { $lte: cutoff },
      "reminders.notOpenedReminderAt": null,
    }).lean();

    let sent = 0;
    for (const o of orders) {
      const claimed = await SaleOrder.updateOne(
        { _id: o._id, "reminders.notOpenedReminderAt": null, status: { $in: MFG_QUEUE } },
        { $set: { "reminders.notOpenedReminderAt": new Date() } }
      );
      if (!claimed.modifiedCount) continue;
      await notify({
        userIds: await findUnitUsers(o.manufacturingUnitId),
        type: NOTIFICATION.REMINDER,
        title: "Order waiting in the queue",
        message: `Order ${o.orderNo} has been waiting for ${SALE_ORDER_SETTINGS.notOpenedReminderMinutes} minutes. Please take it.`,
        orderId: o._id,
      });
      sent++;
    }
    return sent;
  }

  async remindNoReply() {
    const cutoff = new Date(Date.now() - SALE_ORDER_SETTINGS.noReplyReminderHours * 3600000);
    const orders = await SaleOrder.find({ status: STATUS.SENT_FOR_APPROVAL, updatedAt: { $lte: cutoff }, "reminders.noReplyReminderAt": null }).lean();
    let sent = 0;
    for (const o of orders) {
      const claimed = await SaleOrder.updateOne(
        { _id: o._id, "reminders.noReplyReminderAt": null, status: STATUS.SENT_FOR_APPROVAL },
        { $set: { "reminders.noReplyReminderAt": new Date() } }
      );
      if (!claimed.modifiedCount) continue;
      await notify({
        userIds: [idStr(o.createdBy)],
        branchId: o.orderBranchId,
        type: NOTIFICATION.REMINDER,
        title: "Customer has not replied",
        message: `Order ${o.orderNo}: no reply to the design for ${SALE_ORDER_SETTINGS.noReplyReminderHours} hours. Please call the customer.`,
        orderId: o._id,
      });
      sent++;
    }
    return sent;
  }

  async flagOverdue() {
    const today = todayIST();
    const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
    const orders = await SaleOrder.find({
      status: { $in: MFG_ACTIVE },
      expectedDeliveryDate: { $lte: dayToDate(tomorrow) },
      "reminders.overdueFlaggedAt": null,
    }).lean();

    let flagged = 0;
    for (const o of orders) {
      const claimed = await SaleOrder.updateOne(
        { _id: o._id, "reminders.overdueFlaggedAt": null, status: { $in: MFG_ACTIVE } },
        { $set: { "reminders.overdueFlaggedAt": new Date() } }
      );
      if (!claimed.modifiedCount) continue;
      await notify({
        userIds: [idStr(o.createdBy), ...(await findUnitUsers(o.manufacturingUnitId))],
        branchId: o.orderBranchId,
        type: NOTIFICATION.OVERDUE,
        title: "Delivery date at risk",
        message: `Order ${o.orderNo} is due ${o.expectedDeliveryDate.toISOString().slice(0, 10)} and has not been dispatched.`,
        orderId: o._id,
      });
      flagged++;
    }
    return flagged;
  }
}

module.exports = new SaleOrderSchedulerService();
