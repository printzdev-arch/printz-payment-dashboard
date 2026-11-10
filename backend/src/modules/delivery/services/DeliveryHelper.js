const { DELIVERY_TYPE } = require("../models/deliveryConstants");

/**
 * How an order reaches the customer is decided when the job order is created (the customer's delivery
 * method). The delivery module follows that choice; it is never picked again at delivery time.
 *
 *   "Branch Counter Self-Pickup"   -> COUNTER_PICKUP: packed, then handed over at the branch counter
 *   "Local Dispatch / Delivery"    -> DELIVERY: delivery person assigned, packed, dispatched, delivered
 */
const DeliveryHelper = {
  /** The delivery type implied by a job order's delivery method. */
  typeForJob(job) {
    const method = String(job?.deliveryMethod || "").toLowerCase();
    if (method.includes("pickup") || method.includes("pick-up") || method.includes("pick up") || method.includes("collect")) {
      return DELIVERY_TYPE.COUNTER_PICKUP;
    }
    return DELIVERY_TYPE.DELIVERY;
  },

  isPickup(orderOrType) {
    const type = typeof orderOrType === "string" ? orderOrType : orderOrType?.deliveryType;
    return type === DELIVERY_TYPE.COUNTER_PICKUP;
  },

  /** True when a delivery person (by name or by employee) is attached to the order. */
  hasStaff(order) {
    const name = String(order?.deliveryPersonName || "").trim();
    const named = Boolean(name && name !== "Unassigned" && name !== "-" && name !== "undefined");
    return named || Boolean(order?.assignedEmployeeId);
  },
};

module.exports = DeliveryHelper;
