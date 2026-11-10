const mongoose = require("mongoose");
const Branch = require("../../branches/models/Branch");
const Customer = require("../../customers/models/Customer");
const attachmentService = require("../../attachments/services/attachment.service");
const Attachment = require("../../attachments/models/Attachment");
const {
  SaleOrder,
  SaleOrderItem,
  SaleOrderPayment,
  SaleOrderEvent,
  SaleOrderDesign,
  WhatsappMessage,
} = require("../models");
const {
  STATUS,
  CANCELLABLE,
  DESIGN_NOT_STARTED,
  NOTIFICATION,
  SALE_ORDER_SETTINGS,
} = require("../models/saleOrder.constants");
const {
  err,
  invalidStatus,
  round2,
  idStr,
  idVariants,
  isValidId,
  toObjectId,
  todayIST,
  dayToDate,
  isDateString,
  normalizeMobile,
  nextNumber,
  runInTransaction,
  addEvent,
  notify,
  audit,
  findUsersByRole,
} = require("./saleOrder.helpers");
const assignment = require("./saleOrderAssignment.service");
const whatsapp = require("./saleOrderWhatsapp.service");

const PAYMENT_MODES = ["CASH", "UPI", "CARD", "BANK_TRANSFER"];
const NON_CASH = ["UPI", "CARD", "BANK_TRANSFER"];
const REFERENCE_EXTENSIONS = ["jpg", "jpeg", "png", "pdf"];

/* ------------------------------------------------------------------ access */

const canActAtBranch = (actor, branchId) =>
  actor.isAdmin || (actor.isBranchStaff && actor.branchIds.includes(idStr(branchId)));

function assertBranchStaff(actor) {
  if (!actor.isAdmin && !actor.isBranchStaff) {
    throw err(403, "FORBIDDEN", "Only branch managers, branch operators or admins can do this.");
  }
}

function assertOrderBranch(actor, order) {
  assertBranchStaff(actor);
  if (!canActAtBranch(actor, order.orderBranchId)) {
    throw err(403, "FORBIDDEN", "This order belongs to another branch.");
  }
}

/** Mongo filter for the orders this user is allowed to see. */
function visibilityFilter(actor) {
  if (actor.isAdmin) return {};
  const or = [];
  const branchObjectIds = actor.branchIds.filter(isValidId).map(toObjectId);
  if (actor.isBranchStaff) or.push({ orderBranchId: { $in: branchObjectIds } });
  if (actor.isMfgManager) {
    if (branchObjectIds.length > 0) {
      or.push({ manufacturingUnitId: { $in: branchObjectIds } });
    } else {
      or.push({ manufacturingUnitId: { $exists: true } });
    }
  }
  if (actor.isMfgDesigner) or.push({ "currentAssignment.designerUserId": toObjectId(actor.userId) });
  if (!or.length) throw err(403, "FORBIDDEN", "You do not have access to sale orders.");
  return { $or: or };
}

function canSeeOrder(actor, order) {
  if (actor.isAdmin) return true;
  if (actor.isBranchStaff && actor.branchIds.includes(idStr(order.orderBranchId))) return true;
  if (actor.isMfgManager) {
    if (actor.branchIds.length === 0 || actor.branchIds.includes(idStr(order.manufacturingUnitId))) return true;
  }
  if (actor.isMfgDesigner && idStr(order.currentAssignment?.designerUserId) === actor.userId) return true;
  return false;
}

async function loadOrder(id, actor) {
  if (!isValidId(id)) throw err(404, "NOT_FOUND", "Sale order not found.");
  const order = await SaleOrder.findById(id).lean();
  if (!order) throw err(404, "NOT_FOUND", "Sale order not found.");
  if (!canSeeOrder(actor, order)) throw err(403, "FORBIDDEN", "You do not have access to this order.");
  return order;
}

/* --------------------------------------------------------------- validation */

function buildCustomerSnapshot(body, customer) {
  const name = String(body.customerName || customer?.name || "").trim();
  const mobile = normalizeMobile(body.mobile || customer?.mobile || customer?.phone);
  if (!name) throw err(422, "CUSTOMER_NAME_REQUIRED", "Customer name is required.");
  if (!mobile) throw err(422, "INVALID_MOBILE", "Mobile must be 10 digits and start with 6, 7, 8 or 9.");

  const whatsappRaw = body.whatsappNumber || mobile;
  const whatsappNumber = normalizeMobile(whatsappRaw);
  if (!whatsappNumber) throw err(422, "WHATSAPP_REQUIRED", "A valid WhatsApp number is required.");

  return {
    name,
    mobile,
    whatsappNumber,
    whatsappOptIn: body.whatsappOptIn === true,
    email: body.email || customer?.email || null,
    address: body.address || customer?.address || null,
  };
}

function validateDeliveryDate(dateStr, priority) {
  if (!isDateString(dateStr)) throw err(422, "INVALID_DELIVERY_DATE", "Deliver-by date must be YYYY-MM-DD.");
  const today = todayIST();
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const earliest = priority === "URGENT" ? today : tomorrow;
  if (dateStr < earliest) {
    throw err(422, "INVALID_DELIVERY_DATE", `Deliver-by date must be ${earliest} or later.`);
  }
  return dayToDate(dateStr);
}

/** Server-side totals. Anything the client sends for totals is ignored. */
function computeTotals(
  rawItems,
  orderDiscount = 0,
  priority = "NORMAL",
  urgentChargeType = "AMOUNT",
  urgentChargeValue = 0
) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw err(422, "ITEMS_REQUIRED", "At least one item is required.");
  }

  let subtotal = 0;
  let rawTax = 0;
  const items = rawItems.map((it, idx) => {
    const quantity = Number(it.quantity);
    const unitPrice = Number(it.unitPrice ?? it.rate);
    const discount = Number(it.discount || 0);
    const taxRate = Number(it.taxRate || 0);
    const line = idx + 1;

    if (!String(it.productType || "").trim() || !String(it.description || "").trim() || !String(it.unit || "").trim()) {
      throw err(422, "ITEMS_REQUIRED", `Item ${line}: productType, description and unit are required.`);
    }
    if (!(quantity > 0)) throw err(422, "ITEMS_REQUIRED", `Item ${line}: quantity must be greater than 0.`);
    if (!(unitPrice > 0)) throw err(422, "ITEMS_REQUIRED", `Item ${line}: rate must be greater than 0.`);
    if (!(taxRate >= 0)) throw err(422, "ITEMS_REQUIRED", `Item ${line}: tax rate cannot be negative.`);

    const gross = round2(quantity * unitPrice);
    if (!(discount >= 0) || discount > gross) {
      throw err(422, "DISCOUNT_TOO_HIGH", `Item ${line}: discount cannot be more than the item amount.`);
    }
    const lineAmount = round2(gross - discount);
    const taxAmount = round2((lineAmount * taxRate) / 100);
    subtotal += lineAmount;
    rawTax += taxAmount;

    return {
      lineNo: line,
      productType: String(it.productType).trim().toUpperCase(),
      itemId: isValidId(it.itemId) ? toObjectId(it.itemId) : null,
      description: String(it.description).trim(),
      quantity,
      unit: String(it.unit).trim().toUpperCase(),
      specification: it.specification || {},
      unitPrice,
      discount,
      taxRate,
      taxAmount,
      lineTotal: round2(lineAmount + taxAmount),
    };
  });

  subtotal = round2(subtotal);
  const discountAmount = round2(Number(orderDiscount || 0));
  if (!(discountAmount >= 0) || discountAmount > subtotal) {
    throw err(422, "DISCOUNT_TOO_HIGH", "Discount cannot be more than the sub total.");
  }

  let urgentChargeAmount = 0;
  const chargeVal = round2(Number(urgentChargeValue || 0));
  const chargeType = urgentChargeType === "PERCENTAGE" ? "PERCENTAGE" : "AMOUNT";
  if (priority === "URGENT" && chargeVal > 0) {
    if (chargeType === "PERCENTAGE") {
      urgentChargeAmount = round2((subtotal * chargeVal) / 100);
    } else {
      urgentChargeAmount = chargeVal;
    }
  }

  // Tax follows the discounted amount
  const taxAmount = subtotal > 0 ? round2(rawTax * ((subtotal - discountAmount) / subtotal)) : 0;
  const grandTotal = round2(subtotal - discountAmount + taxAmount + urgentChargeAmount);
  return {
    items,
    subtotal,
    discountAmount,
    urgentChargeType: chargeType,
    urgentChargeValue: priority === "URGENT" ? chargeVal : 0,
    urgentChargeAmount,
    taxAmount,
    grandTotal,
  };
}

async function ensureManufacturingUnit() {
  let mfgUnit = await Branch.findOne({ branchType: /^manufacturing$/i });
  if (!mfgUnit) {
    mfgUnit = await Branch.findOne({
      $or: [
        { name: /manufacturing|production|factory|central unit/i },
        { code: /MFG|PRD|FAC/i },
      ],
    });
  }

  if (!mfgUnit) {
    try {
      mfgUnit = await Branch.create({
        name: "Central Manufacturing Unit",
        code: "MFG-01",
        address: "Central Manufacturing Facility",
        branchType: "manufacturing",
        weeklyOffDays: ["Sunday"],
      });
      console.log("[SaleOrder] Auto-created Central Manufacturing Unit (MFG-01)");
    } catch (e) {
      mfgUnit = (await Branch.findOne({ branchType: /^manufacturing$/i })) || (await Branch.findOne({}));
    }
  }

  if (mfgUnit) {
    await Branch.updateMany(
      {
        _id: { $ne: mfgUnit._id },
        $or: [
          { manufacturingUnitId: null },
          { manufacturingUnitId: { $exists: false } },
        ],
      },
      { $set: { manufacturingUnitId: mfgUnit._id } }
    ).catch(() => {});

    await SaleOrder.updateMany(
      {
        $or: [
          { manufacturingUnitId: null },
          { manufacturingUnitId: { $exists: false } },
        ],
      },
      { $set: { manufacturingUnitId: mfgUnit._id } }
    ).catch(() => {});
  }

  return mfgUnit;
}

async function resolveBranchAndUnit(actor, branchIdInput) {
  const branchId = branchIdInput || (actor.branchIds.length === 1 ? actor.branchIds[0] : null);
  if (!branchId || !isValidId(branchId)) throw err(422, "BRANCH_REQUIRED", "branchId is required.");
  if (!canActAtBranch(actor, branchId)) throw err(403, "FORBIDDEN", "You can only create orders for your own branch.");

  const branch = await Branch.findById(branchId).lean();
  if (!branch) throw err(404, "NOT_FOUND", "Branch not found.");

  let unit = null;
  if (branch.manufacturingUnitId) {
    unit = await Branch.findById(branch.manufacturingUnitId).lean();
  }
  if (!unit || String(unit.branchType || "").toLowerCase() !== "manufacturing") {
    const mfgUnit = await ensureManufacturingUnit();
    if (mfgUnit) {
      unit = mfgUnit.toObject ? mfgUnit.toObject() : mfgUnit;
      await Branch.findByIdAndUpdate(branchId, { $set: { manufacturingUnitId: unit._id } }).catch(() => {});
    }
  }
  if (!unit) {
    unit = branch;
  }
  return { branch, unit };
}

/* ------------------------------------------------------------------- create */

async function createOrder(body, actor) {
  assertBranchStaff(actor);
  const { branch, unit } = await resolveBranchAndUnit(actor, body.branchId);

  let customer = null;
  if (isValidId(body.customerId)) customer = await Customer.findById(body.customerId).lean();
  if (!customer) {
    const mobile = normalizeMobile(body.mobile);
    if (mobile) customer = await Customer.findOne({ mobile }).lean();
  }

  const priority = body.priority === "URGENT" ? "URGENT" : "NORMAL";
  const customerSnapshot = buildCustomerSnapshot(body, customer);
  const expectedDeliveryDate = validateDeliveryDate(body.expectedDeliveryDate, priority);
  const totals = computeTotals(
    body.items,
    body.discountAmount,
    priority,
    body.urgentChargeType,
    body.urgentChargeValue
  );

  const orderId = new mongoose.Types.ObjectId();
  const orderNo = await nextNumber("SALE_ORDER", "SO");
  const order = await runInTransaction(async (session) => {
    const [created] = await SaleOrder.create(
      [
        {
          _id: orderId,
          orderNo,
          orderBranchId: branch._id,
          manufacturingUnitId: unit._id,
          customerId: customer?._id || null,
          customerSnapshot,
          orderDate: new Date(),
          expectedDeliveryDate,
          priority,
          status: STATUS.DRAFT,
          customerRequirements: String(body.customerRequirements || "").trim(),
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          urgentChargeType: totals.urgentChargeType,
          urgentChargeValue: totals.urgentChargeValue,
          urgentChargeAmount: totals.urgentChargeAmount,
          taxAmount: totals.taxAmount,
          grandTotal: totals.grandTotal,
          balanceDue: totals.grandTotal,
          paymentStatus: "UNPAID",
          remarks: String(body.remarks || "").trim(),
          createdBy: toObjectId(actor.userId),
        },
      ],
      { session }
    );
    await SaleOrderItem.create(totals.items.map((i) => ({ ...i, orderId })), { session, ordered: true });
    await addEvent(session, {
      order: created,
      action: "ORDER_CREATED",
      fromStatus: null,
      toStatus: STATUS.DRAFT,
      actor,
      meta: { orderNo },
    });
    return created;
  });

  return getOrderDetail(order._id, actor);
}

/** Edit a DRAFT: header fields and/or replace all items. */
async function updateDraft(id, body, actor) {
  const order = await loadOrder(id, actor);
  assertOrderBranch(actor, order);
  if (order.status !== STATUS.DRAFT) throw invalidStatus(order, [STATUS.DRAFT]);

  const set = {};
  if (body.priority !== undefined) set.priority = body.priority === "URGENT" ? "URGENT" : "NORMAL";
  const priority = set.priority || order.priority;
  if (body.expectedDeliveryDate !== undefined || body.priority !== undefined) {
    set.expectedDeliveryDate = validateDeliveryDate(
      body.expectedDeliveryDate ?? order.expectedDeliveryDate.toISOString().slice(0, 10),
      priority
    );
  }
  if (body.customerRequirements !== undefined) set.customerRequirements = String(body.customerRequirements).trim();
  if (body.remarks !== undefined) set.remarks = String(body.remarks).trim();

  const customerFields = ["customerName", "mobile", "whatsappNumber", "whatsappOptIn", "email", "address"];
  if (customerFields.some((f) => body[f] !== undefined)) {
    const merged = {
      customerName: order.customerSnapshot.name,
      mobile: order.customerSnapshot.mobile,
      whatsappNumber: order.customerSnapshot.whatsappNumber,
      whatsappOptIn: order.customerSnapshot.whatsappOptIn,
      email: order.customerSnapshot.email,
      address: order.customerSnapshot.address,
      ...Object.fromEntries(customerFields.filter((f) => body[f] !== undefined).map((f) => [f, body[f]])),
    };
    set.customerSnapshot = buildCustomerSnapshot(merged, null);
  }

  let newItems = null;
  if (
    body.items !== undefined ||
    body.discountAmount !== undefined ||
    body.priority !== undefined ||
    body.urgentChargeType !== undefined ||
    body.urgentChargeValue !== undefined
  ) {
    const itemsInput = body.items !== undefined ? body.items : await SaleOrderItem.find({ orderId: order._id }).sort({ lineNo: 1 }).lean();
    const effectivePriority = body.priority !== undefined ? (body.priority === "URGENT" ? "URGENT" : "NORMAL") : order.priority;
    const effectiveDiscount = body.discountAmount !== undefined ? body.discountAmount : order.discountAmount;
    const effectiveChargeType = body.urgentChargeType !== undefined ? body.urgentChargeType : (order.urgentChargeType || "AMOUNT");
    const effectiveChargeValue = body.urgentChargeValue !== undefined ? body.urgentChargeValue : (order.urgentChargeValue || 0);

    const totals = computeTotals(itemsInput, effectiveDiscount, effectivePriority, effectiveChargeType, effectiveChargeValue);
    Object.assign(set, {
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      urgentChargeType: totals.urgentChargeType,
      urgentChargeValue: totals.urgentChargeValue,
      urgentChargeAmount: totals.urgentChargeAmount,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      balanceDue: totals.grandTotal,
    });
    if (body.items !== undefined) newItems = totals.items;
  }

  await runInTransaction(async (session) => {
    const updated = await SaleOrder.findOneAndUpdate(
      { _id: order._id, status: STATUS.DRAFT },
      { $set: set },
      { new: true, session }
    );
    if (!updated) throw invalidStatus(order, [STATUS.DRAFT]);
    if (newItems) {
      await SaleOrderItem.deleteMany({ orderId: order._id }, { session });
      await SaleOrderItem.create(newItems.map((i) => ({ ...i, orderId: order._id })), { session, ordered: true });
    }
    await addEvent(session, { order, action: "ORDER_EDITED", fromStatus: STATUS.DRAFT, toStatus: STATUS.DRAFT, actor });
  });

  return getOrderDetail(order._id, actor);
}

/** Attach customer reference files (logos, photos) to a DRAFT. JPG/PNG/PDF, 10 MB each, max 5. */
async function addReferenceFiles(id, files, actor) {
  const order = await loadOrder(id, actor);
  assertOrderBranch(actor, order);
  if (order.status !== STATUS.DRAFT) throw invalidStatus(order, [STATUS.DRAFT]);
  if (!files?.length) throw err(422, "INVALID_FILE", "Select at least one file.");

  const max = SALE_ORDER_SETTINGS.maxReferenceFiles;
  if ((order.referenceFileIds?.length || 0) + files.length > max) {
    throw err(422, "INVALID_FILE", `An order can have at most ${max} reference files.`);
  }

  const maxBytes = SALE_ORDER_SETTINGS.referenceFileMaxMb * 1024 * 1024;
  files.forEach((f) => {
    const ext = String(f.originalname || "").split(".").pop().toLowerCase();
    if (!REFERENCE_EXTENSIONS.includes(ext)) {
      throw err(422, "INVALID_FILE", `${f.originalname}: only JPG, PNG or PDF files are allowed.`);
    }
    if (f.size > maxBytes) {
      throw err(422, "INVALID_FILE", `${f.originalname}: file is larger than ${SALE_ORDER_SETTINGS.referenceFileMaxMb} MB.`);
    }
  });

  const saved = [];
  for (const f of files) {
    saved.push(
      await attachmentService.uploadAttachment({
        fileBuffer: f.buffer,
        fileName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        entityType: "SALE_ORDER",
        entityId: idStr(order._id),
        uploadedBy: actor.userId,
      })
    );
  }
  await SaleOrder.updateOne(
    { _id: order._id, status: STATUS.DRAFT },
    { $addToSet: { referenceFileIds: { $each: saved.map((a) => a._id) } } }
  );
  return getOrderDetail(order._id, actor);
}

/* -------------------------------------------------------------------- place */

async function placeOrder(id, body, actor, { idempotencyKey = null } = {}) {
  const order = await loadOrder(id, actor);
  assertOrderBranch(actor, order);

  if (idempotencyKey) {
    const existing = await SaleOrderPayment.findOne({ idempotencyKey }).lean();
    if (existing) {
      if (idStr(existing.orderId) === idStr(order._id)) {
        const detail = await getOrderDetail(order._id, actor);
        return { ...detail, idempotentReplay: true };
      }
      throw err(409, "DUPLICATE_REQUEST", "This Idempotency-Key was already used for another order.");
    }
  }

  const placeableStatuses = [STATUS.DRAFT, STATUS.PLACED, STATUS.WAITING_FOR_DESIGNER, STATUS.ASSIGNED];
  if (!placeableStatuses.includes(order.status)) throw invalidStatus(order, placeableStatuses);

  const advance = round2(Number(body.advanceAmount));
  if (!(advance > 0) || advance > order.grandTotal) {
    throw err(422, "INVALID_AMOUNT", `Advance must be more than 0 and not more than ${order.grandTotal}.`);
  }
  const mode = String(body.mode || "").toUpperCase();
  if (!PAYMENT_MODES.includes(mode)) throw err(422, "INVALID_PAYMENT_MODE", `Mode must be one of ${PAYMENT_MODES.join(", ")}.`);
  if (NON_CASH.includes(mode) && !String(body.reference || "").trim()) {
    throw err(422, "PAYMENT_REF_REQUIRED", "A reference number is required for UPI, card or bank payments.");
  }

  const branch = await Branch.findById(order.orderBranchId).lean();
  if (!branch?.manufacturingUnitId) {
    await Branch.findByIdAndUpdate(order.orderBranchId, { $set: { manufacturingUnitId: order.manufacturingUnitId } }).catch(() => {});
  }

  const required = round2((SALE_ORDER_SETTINGS.minAdvancePercent / 100) * order.grandTotal);
  let advanceOverride = null;
  if (advance + 0.004 < required) {
    const reason = String(body.overrideReason || "").trim();
    if (!reason) {
      throw err(422, "ADVANCE_TOO_LOW", `Advance must be at least ${required} (${SALE_ORDER_SETTINGS.minAdvancePercent}% of ${order.grandTotal}).`, { required });
    }
    if (!actor.isAdmin && !actor.isBranchManager) {
      throw err(403, "FORBIDDEN", "Only a branch manager can override the minimum advance.");
    }
    advanceOverride = { overriddenBy: toObjectId(actor.userId), reason, overriddenAt: new Date() };
  }

  const orderNo = await nextNumber("SALE_ORDER", "SO");
  const invoiceNo = await nextNumber("SALE_ORDER_INVOICE", "INV");
  const receiptNo = await nextNumber("SALE_ORDER_RECEIPT", "SOR");
  const now = new Date();
  const paymentStatus = advance >= order.grandTotal ? "PAID" : "ADVANCE_PAID";

  try {
    await runInTransaction(async (session) => {
      const placed = await SaleOrder.findOneAndUpdate(
        { _id: order._id, status: { $in: placeableStatuses } },
        {
          $set: {
            status: STATUS.PLACED,
            orderNo: order.orderNo && !order.orderNo.startsWith("DRAFT-") ? order.orderNo : orderNo,
            invoiceNo,
            invoiceDate: now,
            orderDate: order.orderDate || now,
            advanceAmount: advance,
            amountPaid: advance,
            balanceDue: round2(order.grandTotal - advance),
            paymentStatus,
            advanceOverride,
          },
        },
        { new: true, session }
      );
      if (!placed) throw invalidStatus(order, placeableStatuses);

      const [payment] = await SaleOrderPayment.create(
        [
          {
            receiptNo,
            orderId: order._id,
            branchId: order.orderBranchId,
            paymentType: "ADVANCE",
            amount: advance,
            mode,
            reference: String(body.reference || "").trim(),
            status: "SUCCESS",
            idempotencyKey: idempotencyKey || null,
            collectedBy: toObjectId(actor.userId),
            collectedAt: now,
          },
        ],
        { session }
      );

      await addEvent(session, { order, action: "PLACED", fromStatus: STATUS.DRAFT, toStatus: STATUS.PLACED, actor, meta: { orderNo } });
      await addEvent(session, {
        order: placed,
        action: "ADVANCE_COLLECTED",
        fromStatus: STATUS.PLACED,
        toStatus: STATUS.PLACED,
        actor,
        meta: { paymentId: payment._id, amount: advance, override: Boolean(advanceOverride) },
      });
    });
  } catch (e) {
    if (e.code === 11000 && idempotencyKey) {
      throw err(409, "DUPLICATE_REQUEST", "This request was already processed.");
    }
    throw e;
  }

  await audit({
    actor,
    action: "SALE_ORDER_PLACED",
    order: { ...order, orderNo },
    after: { advance, mode, grandTotal: order.grandTotal, override: Boolean(advanceOverride) },
  });

  // Route to a designer. If this fails the order stays PLACED and the queue picks it up later.
  try {
    await assignment.assignDesigner(order._id);
  } catch (e) {
    console.error("[SaleOrder] auto-assign failed:", e.message);
  }
  return getOrderDetail(order._id, actor);
}

/* ------------------------------------------------------------------ receive */

async function receiveOrder(id, body, actor) {
  const order = await loadOrder(id, actor);
  assertOrderBranch(actor, order);
  if (order.status !== STATUS.DISPATCHED) throw invalidStatus(order, [STATUS.DISPATCHED]);

  const sent = order.dispatch?.packages || 1;
  const received = body.packagesReceived === undefined ? sent : Number(body.packagesReceived);
  if (!Number.isInteger(received) || received < 0) {
    throw err(422, "INVALID_AMOUNT", "Packages received must be a whole number.");
  }
  const remarks = String(body.remarks || "").trim();
  if (received !== sent && !remarks) {
    throw err(422, "MISMATCH_REMARKS", `Packages received (${received}) differ from packages sent (${sent}). Remarks are required.`);
  }

  await runInTransaction(async (session) => {
    const updated = await SaleOrder.findOneAndUpdate(
      { _id: order._id, status: STATUS.DISPATCHED },
      {
        $set: {
          status: STATUS.RECEIVED_AT_BRANCH,
          "dispatch.receivedAtBranchAt": new Date(),
          "dispatch.receivedAtBranchBy": toObjectId(actor.userId),
          "dispatch.packagesReceived": received,
          "dispatch.receiveRemarks": remarks,
        },
      },
      { new: true, session }
    );
    if (!updated) throw invalidStatus(order, [STATUS.DISPATCHED]);
    await addEvent(session, {
      order,
      action: "RECEIVED_AT_BRANCH",
      fromStatus: STATUS.DISPATCHED,
      toStatus: STATUS.RECEIVED_AT_BRANCH,
      actor,
      notes: remarks,
      meta: { packagesSent: sent, packagesReceived: received },
    });
  });

  if (body.notifyCustomer === true) {
    try {
      const fresh = await SaleOrder.findById(order._id).lean();
      await whatsapp.sendReadyForPickup(fresh, actor);
    } catch (e) {
      console.warn("[SaleOrder] ready-for-pickup message failed:", e.message);
    }
  }
  return getOrderDetail(order._id, actor);
}

/* ------------------------------------------------------------------ deliver */

async function deliverOrder(id, body, actor, { idempotencyKey = null } = {}) {
  const order = await loadOrder(id, actor);
  assertOrderBranch(actor, order);

  if (idempotencyKey) {
    const existing = await SaleOrderPayment.findOne({ idempotencyKey }).lean();
    if (existing) {
      if (idStr(existing.orderId) === idStr(order._id)) {
        return { ...(await getOrderDetail(order._id, actor)), idempotentReplay: true };
      }
      throw err(409, "DUPLICATE_REQUEST", "This Idempotency-Key was already used for another order.");
    }
  }
  if (order.status !== STATUS.RECEIVED_AT_BRANCH) throw invalidStatus(order, [STATUS.RECEIVED_AT_BRANCH]);

  const receivedByName = String(body.receivedByName || "").trim();
  if (!receivedByName) throw err(422, "RECEIVER_REQUIRED", "The name of the person receiving the order is required.");

  const balance = round2(order.balanceDue);
  let paymentRow = null;
  if (balance > 0) {
    const amount = round2(Number(body.amount));
    if (amount !== balance) {
      throw err(422, "AMOUNT_MISMATCH", `The full balance of ${balance} must be paid at delivery.`, { balanceDue: balance });
    }
    const mode = String(body.mode || "").toUpperCase();
    if (!PAYMENT_MODES.includes(mode)) throw err(422, "INVALID_PAYMENT_MODE", `Mode must be one of ${PAYMENT_MODES.join(", ")}.`);
    if (NON_CASH.includes(mode) && !String(body.reference || "").trim()) {
      throw err(422, "PAYMENT_REF_REQUIRED", "A reference number is required for UPI, card or bank payments.");
    }
    paymentRow = {
      receiptNo: await nextNumber("SALE_ORDER_RECEIPT", "SOR"),
      orderId: order._id,
      branchId: order.orderBranchId,
      paymentType: "FINAL",
      amount,
      mode,
      reference: String(body.reference || "").trim(),
      status: "SUCCESS",
      idempotencyKey: idempotencyKey || null,
      collectedBy: toObjectId(actor.userId),
      collectedAt: new Date(),
    };
  }

  const now = new Date();
  let savedPayment = null;
  try {
    await runInTransaction(async (session) => {
      if (paymentRow) [savedPayment] = await SaleOrderPayment.create([paymentRow], { session });

      const newPaid = round2(order.amountPaid + (paymentRow?.amount || 0));
      const newBalance = round2(order.grandTotal - newPaid);
      if (newBalance !== 0) throw err(422, "BALANCE_PENDING", "The order can be delivered only when the balance is 0.");

      const delivered = await SaleOrder.findOneAndUpdate(
        { _id: order._id, status: STATUS.RECEIVED_AT_BRANCH },
        {
          $set: {
            status: STATUS.DELIVERED,
            amountPaid: newPaid,
            balanceDue: 0,
            paymentStatus: "PAID",
            delivery: {
              deliveredAt: now,
              deliveredBy: toObjectId(actor.userId),
              receivedByName,
              proofAttachmentId: isValidId(body.proofAttachmentId) ? toObjectId(body.proofAttachmentId) : null,
              remarks: String(body.remarks || "").trim(),
            },
          },
        },
        { new: true, session }
      );
      if (!delivered) throw invalidStatus(order, [STATUS.RECEIVED_AT_BRANCH]);

      if (savedPayment) {
        await addEvent(session, {
          order,
          action: "FINAL_PAYMENT_COLLECTED",
          fromStatus: STATUS.RECEIVED_AT_BRANCH,
          toStatus: STATUS.RECEIVED_AT_BRANCH,
          actor,
          meta: { paymentId: savedPayment._id, amount: savedPayment.amount },
        });
      }
      await addEvent(session, {
        order,
        action: "DELIVERED",
        fromStatus: STATUS.RECEIVED_AT_BRANCH,
        toStatus: STATUS.DELIVERED,
        actor,
        meta: { receivedByName },
      });
    });
  } catch (e) {
    if (e.code === 11000 && idempotencyKey) throw err(409, "DUPLICATE_REQUEST", "This request was already processed.");
    throw e;
  }

  await audit({
    actor,
    action: "SALE_ORDER_DELIVERED",
    order,
    after: { receivedByName, finalPayment: paymentRow?.amount || 0, receiptNo: paymentRow?.receiptNo || null },
  });

  const recipients = [];
  if (order.currentAssignment?.designerUserId) recipients.push(idStr(order.currentAssignment.designerUserId));
  recipients.push(...(await findUsersByRole(["MFG_MANAGER"], order.manufacturingUnitId)));
  await notify({
    userIds: recipients,
    type: NOTIFICATION.DELIVERED,
    title: "Order delivered",
    message: `Order ${order.orderNo} was delivered to the customer.`,
    orderId: order._id,
  });

  if (body.sendReceipt === true && savedPayment) {
    try {
      await whatsapp.sendPaymentReceipt(await SaleOrder.findById(order._id).lean(), savedPayment, actor);
    } catch (e) {
      console.warn("[SaleOrder] receipt message failed:", e.message);
    }
  }
  return getOrderDetail(order._id, actor);
}

/* ------------------------------------------------------------------- cancel */

async function cancelOrder(id, body, actor) {
  const order = await loadOrder(id, actor);
  const designStarted = !DESIGN_NOT_STARTED.includes(order.status);

  if (!actor.isAdmin && (!actor.isBranchManager || !canActAtBranch(actor, order.orderBranchId))) {
    throw err(403, "FORBIDDEN", "Only a branch manager of this branch or an admin can cancel an order.");
  }
  // Say plainly that the order is past the point of cancelling before talking about who may cancel it
  if (!CANCELLABLE.includes(order.status)) {
    throw err(409, "CANNOT_CANCEL", `Order ${order.orderNo} is ${order.status} and can no longer be cancelled.`);
  }
  if (!actor.isAdmin && designStarted) {
    throw err(403, "FORBIDDEN", "Design work has started. Only an admin can cancel this order.");
  }

  const reason = String(body.reason || "").trim();
  if (reason.length < 5) throw err(422, "REASON_REQUIRED", "A cancellation reason of at least 5 characters is required.");

  // Full refund before design starts; once design has started the admin decides the amount (can be partial)
  const paid = round2(order.amountPaid);
  let refund = 0;
  if (paid > 0) {
    if (designStarted) {
      if (body.refundAmount === undefined) {
        throw err(422, "INVALID_AMOUNT", "Design has started. Enter the refund amount (it can be partial).");
      }
      refund = round2(Number(body.refundAmount));
    } else {
      refund = paid;
    }
    if (!(refund >= 0) || refund > paid) {
      throw err(422, "INVALID_AMOUNT", `Refund must be between 0 and ${paid}.`);
    }
  }
  const refundMode = String(body.refundMode || "CASH").toUpperCase();
  if (refund > 0) {
    if (!PAYMENT_MODES.includes(refundMode)) throw err(422, "INVALID_PAYMENT_MODE", `Mode must be one of ${PAYMENT_MODES.join(", ")}.`);
    if (NON_CASH.includes(refundMode) && !String(body.reference || "").trim()) {
      throw err(422, "PAYMENT_REF_REQUIRED", "A reference number is required for non-cash refunds.");
    }
  }

  const receiptNo = refund > 0 ? await nextNumber("SALE_ORDER_RECEIPT", "SOR") : null;
  const now = new Date();

  await runInTransaction(async (session) => {
    const cancelled = await SaleOrder.findOneAndUpdate(
      { _id: order._id, status: { $in: CANCELLABLE } },
      {
        $set: {
          status: STATUS.CANCELLED,
          amountPaid: round2(paid - refund),
          balanceDue: 0,
          paymentStatus: refund > 0 ? "REFUNDED" : order.paymentStatus,
          cancellation: {
            cancelledAt: now,
            cancelledBy: toObjectId(actor.userId),
            reason,
            refundApprovedBy: refund > 0 && actor.isAdmin ? toObjectId(actor.userId) : null,
          },
        },
      },
      { new: true, session }
    );
    if (!cancelled) throw err(409, "CANNOT_CANCEL", "The order changed while cancelling. Please retry.");

    if (refund > 0) {
      await SaleOrderPayment.create(
        [
          {
            receiptNo,
            orderId: order._id,
            branchId: order.orderBranchId,
            paymentType: "REFUND",
            amount: refund,
            mode: refundMode,
            reference: String(body.reference || "").trim(),
            status: "SUCCESS",
            collectedBy: toObjectId(actor.userId),
            collectedAt: now,
            approvedBy: actor.isAdmin ? toObjectId(actor.userId) : null,
            remarks: reason,
          },
        ],
        { session }
      );
    }
    await assignment.releaseDesigner(session, order, { assignmentStatus: "COMPLETED", reason: "Order cancelled" });
    await addEvent(session, {
      order,
      action: "CANCELLED",
      fromStatus: order.status,
      toStatus: STATUS.CANCELLED,
      actor,
      notes: reason,
      meta: { refund, receiptNo },
    });
  });

  await audit({
    actor,
    action: "SALE_ORDER_CANCELLED",
    order,
    before: { status: order.status, amountPaid: paid },
    after: { status: STATUS.CANCELLED, reason, refund, receiptNo },
  });

  const recipients = [];
  if (order.currentAssignment?.designerUserId) recipients.push(idStr(order.currentAssignment.designerUserId));
  await notify({
    userIds: recipients,
    branchId: order.orderBranchId,
    type: NOTIFICATION.CANCELLED,
    title: "Order cancelled",
    message: `Order ${order.orderNo} was cancelled.`,
    orderId: order._id,
  });

  // The released designer slot may now serve a waiting order
  try {
    await assignment.processQueue(order.manufacturingUnitId);
  } catch (e) {
    console.warn("[SaleOrder] queue processing failed:", e.message);
  }
  return getOrderDetail(order._id, actor);
}

/* --------------------------------------------------------------------- read */

const withUrls = (design, canSeePrintFile) => ({
  ...design,
  printFileAttachmentId: canSeePrintFile ? design.printFileAttachmentId : undefined,
  hasPrintFile: Boolean(design.printFileAttachmentId),
});

async function getOrderDetail(id, actor) {
  const order = await loadOrder(id, actor);
  const isDesigner = actor.isMfgDesigner && !actor.isAdmin && !actor.isMfgManager && !actor.isBranchStaff;
  const canSeePrintFile = actor.isAdmin || actor.isMfgManager || idStr(order.currentAssignment?.designerUserId) === actor.userId;

  const [items, payments, designs, messages, branch, unit] = await Promise.all([
    SaleOrderItem.find({ orderId: order._id }).sort({ lineNo: 1 }).lean(),
    isDesigner ? [] : SaleOrderPayment.find({ orderId: order._id }).sort({ collectedAt: 1 }).lean(),
    SaleOrderDesign.find({ orderId: order._id }).sort({ versionNo: 1 }).lean(),
    WhatsappMessage.find({ orderId: order._id }).sort({ sentAt: -1 }).limit(20).lean(),
    Branch.findById(order.orderBranchId).select("name code").lean(),
    Branch.findById(order.manufacturingUnitId).select("name code").lean(),
  ]);

  // Links for images the UI shows: the customer's reference files and each design's preview image.
  // The print file is never linked here; it is only available through the authenticated download endpoint.
  const attachmentIds = [...(order.referenceFileIds || []), ...designs.map((d) => d.previewAttachmentId)].filter(Boolean);
  const attachments = attachmentIds.length
    ? await Attachment.find({ _id: { $in: attachmentIds } }).select("fileName mimeType size storageKey").lean()
    : [];
  const attachmentById = new Map(attachments.map((a) => [idStr(a._id), a]));
  const linkOf = (a) => (a ? `/uploads/${a.storageKey}` : null);

  const designsOut = designs.map((d) => {
    const preview = attachmentById.get(idStr(d.previewAttachmentId));
    return { ...withUrls(d, canSeePrintFile), previewUrl: linkOf(preview), previewFileName: preview?.fileName || null };
  });
  const referenceFiles = (order.referenceFileIds || [])
    .map((fid) => attachmentById.get(idStr(fid)))
    .filter(Boolean)
    .map((a) => ({ _id: a._id, fileName: a.fileName, mimeType: a.mimeType, size: a.size, url: linkOf(a) }));

  const out = { ...order, items, designs: designsOut, referenceFiles, whatsappMessages: messages, orderBranch: branch, manufacturingUnit: unit };
  if (out.status !== "DRAFT" && !out.invoiceNo && out.orderNo) {
    out.invoiceNo = `INV-${out.orderNo.replace(/^SO-?/, "")}`;
    out.invoiceDate = out.orderDate || new Date();
  }
  if (!isDesigner) out.payments = payments;
  else {
    // Designers do not need the money details
    ["subtotal", "discountAmount", "taxAmount", "urgentChargeAmount", "urgentChargeType", "urgentChargeValue", "grandTotal", "advanceAmount", "amountPaid", "balanceDue"].forEach((f) => delete out[f]);
    out.items = items.map(({ unitPrice, discount, taxRate, taxAmount, lineTotal, ...rest }) => rest);
  }
  return out;
}

async function listOrders(query, actor) {
  const filter = { ...visibilityFilter(actor) };
  const and = [];

  if (query.status) {
    const statuses = String(query.status).split(",").map((s) => s.trim().toUpperCase());
    and.push({ status: { $in: statuses } });
  }
  if (query.priority) and.push({ priority: String(query.priority).toUpperCase() });
  if (query.branchId && isValidId(query.branchId)) and.push({ orderBranchId: toObjectId(query.branchId) });
  if (query.unitId && isValidId(query.unitId)) and.push({ manufacturingUnitId: toObjectId(query.unitId) });
  if (query.designerUserId && isValidId(query.designerUserId)) {
    and.push({ "currentAssignment.designerUserId": toObjectId(query.designerUserId) });
  }
  if (query.fromDate || query.toDate) {
    const range = {};
    if (isDateString(query.fromDate)) range.$gte = dayToDate(query.fromDate);
    if (isDateString(query.toDate)) range.$lt = new Date(dayToDate(query.toDate).getTime() + 86400000);
    if (Object.keys(range).length) and.push({ orderDate: range });
  }
  const search = String(query.search || query.q || "").trim();
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    and.push({ $or: [{ orderNo: rx }, { "customerSnapshot.name": rx }, { "customerSnapshot.mobile": rx }] });
  }
  if (and.length) filter.$and = and;

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const isDesigner = actor.isMfgDesigner && !actor.isAdmin && !actor.isMfgManager && !actor.isBranchStaff;
  const projection = isDesigner
    ? "-subtotal -discountAmount -taxAmount -grandTotal -advanceAmount -amountPaid -balanceDue -paymentStatus"
    : "";

  const [items, total] = await Promise.all([
    SaleOrder.find(filter).select(projection).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SaleOrder.countDocuments(filter),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

async function getTimeline(id, actor) {
  const order = await loadOrder(id, actor);
  return SaleOrderEvent.find({ orderId: order._id }).sort({ createdAt: 1 }).lean();
}

/** Find a customer by mobile so the branch can reuse the profile. */
async function lookupCustomer(query, actor) {
  assertBranchStaff(actor);
  const mobile = normalizeMobile(query.mobile);
  if (!mobile) throw err(422, "INVALID_MOBILE", "Mobile must be 10 digits and start with 6, 7, 8 or 9.");
  const customer = await Customer.findOne({ mobile }).select("name mobile email address customerCode").lean();
  return { found: Boolean(customer), mobile, customer: customer || null };
}

module.exports = {
  createOrder,
  updateDraft,
  addReferenceFiles,
  placeOrder,
  receiveOrder,
  deliverOrder,
  cancelOrder,
  getOrderDetail,
  listOrders,
  getTimeline,
  lookupCustomer,
  loadOrder,
  canSeeOrder,
  ensureManufacturingUnit,
};
