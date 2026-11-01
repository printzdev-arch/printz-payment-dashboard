const DailyAttendance = require("../../attendance/models/DailyAttendance");
const { SaleOrder, MfgDesignerProfile, MfgDesignAssignment } = require("../models");
const { STATUS, DESIGNER_HOLDING, NOTIFICATION, SALE_ORDER_SETTINGS } = require("../constants/saleOrder");
const { idStr, idVariants, todayIST, dayToDate, notify, findUsersByRole } = require("./saleOrder.helpers");

/**
 * Background alerts (every 15 minutes by default):
 *  1. Order not opened 30 min after ASSIGNED -> remind the designer, then the unit manager
 *  2. No customer reply 24 h after SENT_FOR_APPROVAL -> remind the branch to call the customer
 *  3. Deliver-by date is tomorrow (or past) and not DISPATCHED -> flag overdue
 *  4. Designer absent / on leave today -> OFF_DUTY and tell the unit manager which orders need reassigning
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
        notOpened: await this.remindNotOpened(),
        noReply: await this.remindNoReply(),
        overdue: await this.flagOverdue(),
        absentDesigners: await this.handleAbsentDesigners(),
      };
    } finally {
      this.running = false;
    }
  }

  async remindNotOpened() {
    const cutoff = new Date(Date.now() - SALE_ORDER_SETTINGS.notOpenedReminderMinutes * 60000);
    let sent = 0;

    // Stage 1: remind the designer
    const stage1 = await SaleOrder.find({
      status: STATUS.ASSIGNED,
      "currentAssignment.assignedAt": { $lte: cutoff },
      "reminders.notOpenedReminderAt": null,
    }).lean();
    for (const o of stage1) {
      const claimed = await SaleOrder.updateOne(
        { _id: o._id, "reminders.notOpenedReminderAt": null, status: STATUS.ASSIGNED },
        { $set: { "reminders.notOpenedReminderAt": new Date() } }
      );
      if (!claimed.modifiedCount) continue;
      await notify({
        userIds: [idStr(o.currentAssignment.designerUserId)],
        type: NOTIFICATION.REMINDER,
        title: "Order not opened",
        message: `Order ${o.orderNo} was assigned to you ${SALE_ORDER_SETTINGS.notOpenedReminderMinutes} minutes ago. Please open it.`,
        orderId: o._id,
      });
      sent++;
    }

    // Stage 2: still unopened a further interval later -> unit manager
    const stage2 = await SaleOrder.find({
      status: STATUS.ASSIGNED,
      "reminders.notOpenedReminderAt": { $lte: cutoff, $ne: null },
      "reminders.notOpenedEscalatedAt": null,
    }).lean();
    for (const o of stage2) {
      const claimed = await SaleOrder.updateOne(
        { _id: o._id, "reminders.notOpenedEscalatedAt": null, status: STATUS.ASSIGNED },
        { $set: { "reminders.notOpenedEscalatedAt": new Date() } }
      );
      if (!claimed.modifiedCount) continue;
      await notify({
        userIds: await findUsersByRole(["MFG_MANAGER"], o.manufacturingUnitId),
        type: NOTIFICATION.REMINDER,
        title: "Order still not opened",
        message: `Order ${o.orderNo} (${o.currentAssignment.designerName}) has not been opened. Consider reassigning.`,
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
    const beforeDispatch = [
      STATUS.PLACED,
      STATUS.WAITING_FOR_DESIGNER,
      STATUS.ASSIGNED,
      STATUS.IN_DESIGN,
      STATUS.SENT_FOR_APPROVAL,
      STATUS.CHANGES_REQUESTED,
      STATUS.APPROVED,
      STATUS.PRINTING,
    ];
    const orders = await SaleOrder.find({
      status: { $in: beforeDispatch },
      expectedDeliveryDate: { $lte: dayToDate(tomorrow) },
      "reminders.overdueFlaggedAt": null,
    }).lean();

    let flagged = 0;
    for (const o of orders) {
      const claimed = await SaleOrder.updateOne(
        { _id: o._id, "reminders.overdueFlaggedAt": null, status: { $in: beforeDispatch } },
        { $set: { "reminders.overdueFlaggedAt": new Date() } }
      );
      if (!claimed.modifiedCount) continue;
      const unitUsers = await findUsersByRole(["MFG_MANAGER"], o.manufacturingUnitId);
      const designer = o.currentAssignment?.designerUserId ? [idStr(o.currentAssignment.designerUserId)] : [];
      await notify({
        userIds: [idStr(o.createdBy), ...unitUsers, ...designer],
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

  async handleAbsentDesigners() {
    const profiles = await MfgDesignerProfile.find({ isActive: true, employeeId: { $ne: null }, availability: { $ne: "OFF_DUTY" } }).lean();
    let changed = 0;
    for (const p of profiles) {
      const absent = await DailyAttendance.exists({
        employeeId: { $in: idVariants(p.employeeId) },
        attendanceDate: todayIST(),
        status: { $in: ["ABSENT", "ON_LEAVE"] },
      });
      if (!absent) continue;

      const moved = await MfgDesignerProfile.updateOne({ _id: p._id, availability: { $ne: "OFF_DUTY" } }, { $set: { availability: "OFF_DUTY" } });
      if (!moved.modifiedCount) continue;
      changed++;

      const open = await SaleOrder.find({ "currentAssignment.designerUserId": p.userId, status: { $in: DESIGNER_HOLDING } })
        .select("orderNo")
        .lean();
      await notify({
        userIds: await findUsersByRole(["MFG_MANAGER"], p.manufacturingUnitId),
        type: NOTIFICATION.REMINDER,
        title: "Designer absent today",
        message: open.length
          ? `${p.displayName} is absent or on leave. Orders to reassign: ${open.map((o) => o.orderNo).join(", ")}.`
          : `${p.displayName} is absent or on leave and is now off duty.`,
      });
    }
    return changed;
  }
}

module.exports = new SaleOrderSchedulerService();
