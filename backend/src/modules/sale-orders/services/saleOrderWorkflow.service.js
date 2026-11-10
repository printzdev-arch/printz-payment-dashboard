const attachmentService = require("../../attachments/services/attachment.service");
const {
  SaleOrder,
  SaleOrderItem,
  SaleOrderDesign,
  MfgDesignAssignment,
} = require("../models");
const { STATUS, NOTIFICATION, SALE_ORDER_SETTINGS } = require("../models/saleOrder.constants");
const {
  err,
  invalidStatus,
  idStr,
  isValidId,
  toObjectId,
  nextNumber,
  runInTransaction,
  addEvent,
  notify,
  audit,
} = require("./saleOrder.helpers");
const assignment = require("./saleOrderAssignment.service");
const whatsapp = require("./saleOrderWhatsapp.service");

const PREVIEW_EXTENSIONS = ["jpg", "jpeg", "png"];
const PRINT_EXTENSIONS = ["pdf", "ai", "cdr", "psd", "tif", "tiff"];
const APPROVAL_CHANNELS = ["CALL_TO_BRANCH", "CALL_TO_DESIGNER", "WHATSAPP_REPLY", "IN_PERSON"];
const DISPATCH_MODES = ["OWN_VEHICLE", "COURIER", "STAFF_HAND_DELIVERY"];

const extOf = (name) => String(name || "").split(".").pop().toLowerCase();
const mb = (n) => n * 1024 * 1024;

async function getOrder(id) {
  if (!isValidId(id)) throw err(404, "NOT_FOUND", "Sale order not found.");
  const order = await SaleOrder.findById(id).lean();
  if (!order) throw err(404, "NOT_FOUND", "Sale order not found.");
  return order;
}

const isAssignee = (order, actor) => idStr(order.currentAssignment?.designerUserId) === actor.userId;

/** Only the assigned designer. Admin may also act where the access matrix gives admin full rights. */
function assertAssignee(order, actor, { allowAdmin = false } = {}) {
  if (isAssignee(order, actor) || (allowAdmin && actor.isAdmin)) return;
  throw err(403, "NOT_ASSIGNEE", "This order is assigned to another designer.");
}

/** Notify the people on the branch side (the order creator and the branch). */
const notifyBranch = (order, payload) =>
  notify({ userIds: [idStr(order.createdBy)], branchId: order.orderBranchId, orderId: order._id, ...payload });

/* ------------------------------------------------------------------- design */

/** Designer opens the order for the first time: ASSIGNED -> IN_DESIGN. */
async function startDesign(id, actor) {
  const order = await getOrder(id);
  assertAssignee(order, actor);
  if (order.status !== STATUS.ASSIGNED) throw invalidStatus(order, [STATUS.ASSIGNED]);

  await runInTransaction(async (session) => {
    const updated = await SaleOrder.findOneAndUpdate(
      { _id: order._id, status: STATUS.ASSIGNED },
      { $set: { status: STATUS.IN_DESIGN } },
      { new: true, session }
    );
    if (!updated) throw invalidStatus(order, [STATUS.ASSIGNED]);
    await MfgDesignAssignment.updateOne(
      { _id: order.currentAssignment.assignmentId, seenAt: null },
      { $set: { seenAt: new Date() } },
      { session }
    );
    await addEvent(session, { order, action: "DESIGN_STARTED", fromStatus: STATUS.ASSIGNED, toStatus: STATUS.IN_DESIGN, actor });
  });
  return SaleOrder.findById(order._id).lean();
}

/** Upload a design version: preview image (sent to the customer) and optional print file (internal). */
async function uploadDesign(id, files, body, actor) {
  const order = await getOrder(id);
  assertAssignee(order, actor);
  const allowed = [STATUS.ASSIGNED, STATUS.IN_DESIGN, STATUS.CHANGES_REQUESTED];
  if (!allowed.includes(order.status)) throw invalidStatus(order, allowed);

  const preview = files?.preview?.[0];
  const printFile = files?.printFile?.[0];
  if (!preview) throw err(422, "INVALID_PREVIEW", "A preview image (JPG or PNG) is required.");
  if (!PREVIEW_EXTENSIONS.includes(extOf(preview.originalname)) || preview.size > mb(SALE_ORDER_SETTINGS.previewMaxMb)) {
    throw err(422, "INVALID_PREVIEW", `Preview must be a JPG or PNG up to ${SALE_ORDER_SETTINGS.previewMaxMb} MB.`);
  }
  if (printFile && (!PRINT_EXTENSIONS.includes(extOf(printFile.originalname)) || printFile.size > mb(SALE_ORDER_SETTINGS.printFileMaxMb))) {
    throw err(422, "INVALID_PRINT_FILE", `Print file must be PDF, AI, CDR, PSD or TIFF up to ${SALE_ORDER_SETTINGS.printFileMaxMb} MB.`);
  }

  if (await SaleOrderDesign.exists({ orderId: order._id, status: "DRAFT" })) {
    throw err(409, "VERSION_OPEN", "Send or finish the current draft version before uploading a new one.");
  }

  const save = (f) =>
    attachmentService.uploadAttachment({
      fileBuffer: f.buffer,
      fileName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      entityType: "SALE_ORDER",
      entityId: idStr(order._id),
      uploadedBy: actor.userId,
    });
  const previewAttachment = await save(preview);
  const printAttachment = printFile ? await save(printFile) : null;

  const design = await runInTransaction(async (session) => {
    const last = await SaleOrderDesign.findOne({ orderId: order._id }).sort({ versionNo: -1 }).select("versionNo").session(session).lean();
    const versionNo = (last?.versionNo || 0) + 1;

    const [created] = await SaleOrderDesign.create(
      [
        {
          orderId: order._id,
          versionNo,
          previewAttachmentId: previewAttachment._id,
          printFileAttachmentId: printAttachment?._id || null,
          designerNotes: String(body?.designerNotes || "").trim(),
          designedBy: toObjectId(actor.userId),
          status: "DRAFT",
        },
      ],
      { session }
    );
    await SaleOrderDesign.updateMany(
      { orderId: order._id, status: "CHANGES_REQUESTED" },
      { $set: { status: "SUPERSEDED" } },
      { session }
    );

    // A new version always puts the order (back) into design
    const nextStatus = STATUS.IN_DESIGN;
    const updated = await SaleOrder.findOneAndUpdate(
      { _id: order._id, status: { $in: allowed } },
      { $set: { status: nextStatus, currentDesignVersion: versionNo } },
      { new: true, session }
    );
    if (!updated) throw invalidStatus(order, allowed);

    if (order.status === STATUS.ASSIGNED) {
      await MfgDesignAssignment.updateOne(
        { _id: order.currentAssignment.assignmentId, seenAt: null },
        { $set: { seenAt: new Date() } },
        { session }
      );
    }
    await addEvent(session, {
      order,
      action: "DESIGN_VERSION_CREATED",
      fromStatus: order.status,
      toStatus: nextStatus,
      actor,
      meta: { versionNo },
    });
    return created;
  });
  return design;
}

/** Send a design version to the customer's WhatsApp: IN_DESIGN -> SENT_FOR_APPROVAL. */
async function sendDesign(id, versionNo, actor) {
  const order = await getOrder(id);
  assertAssignee(order, actor, { allowAdmin: true });
  if (order.status !== STATUS.IN_DESIGN) throw invalidStatus(order, [STATUS.IN_DESIGN]);

  const design = await SaleOrderDesign.findOne({ orderId: order._id, versionNo: Number(versionNo) }).lean();
  if (!design) throw err(404, "NOT_FOUND", `Design version ${versionNo} not found.`);
  if (design.status !== "DRAFT") throw err(409, "INVALID_STATUS", `Version ${design.versionNo} is ${design.status}; only a DRAFT version can be sent.`);
  if (!design.previewAttachmentId) throw err(422, "PREVIEW_REQUIRED", "This version has no preview image.");
  if (!order.customerSnapshot?.whatsappNumber) throw err(422, "WHATSAPP_REQUIRED", "The customer has no WhatsApp number.");
  if (!order.customerSnapshot.whatsappOptIn) {
    throw err(422, "WHATSAPP_NOT_OPTED_IN", "The customer has not agreed to receive WhatsApp messages. Ask the branch to confirm consent.");
  }
  if (await whatsapp.wasSentRecently(design._id)) {
    throw err(409, "DUPLICATE_SEND", `This version was sent in the last ${SALE_ORDER_SETTINGS.duplicateSendSeconds} seconds.`);
  }

  const message = await whatsapp.sendDesignApproval(order, design, actor);
  if (message.status === "FAILED") {
    // Order stays IN_DESIGN so the designer can retry
    throw err(502, "WHATSAPP_FAILED", `WhatsApp could not send the design: ${message.error}`);
  }

  await runInTransaction(async (session) => {
    const updated = await SaleOrder.findOneAndUpdate(
      { _id: order._id, status: STATUS.IN_DESIGN },
      { $set: { status: STATUS.SENT_FOR_APPROVAL } },
      { new: true, session }
    );
    if (!updated) throw invalidStatus(order, [STATUS.IN_DESIGN]);
    await SaleOrderDesign.updateOne(
      { _id: design._id },
      { $set: { status: "SENT", sentAt: new Date(), whatsappMessageId: message._id } },
      { session }
    );
    await addEvent(session, {
      order,
      action: "DESIGN_SENT",
      fromStatus: STATUS.IN_DESIGN,
      toStatus: STATUS.SENT_FOR_APPROVAL,
      actor,
      meta: { versionNo: design.versionNo, whatsappMessageId: message._id },
    });
  });

  await notifyBranch(order, {
    type: NOTIFICATION.DESIGN_SENT,
    title: "Design sent to customer",
    message: `Order ${order.orderNo}: design v${design.versionNo} was sent on WhatsApp. Expect the customer's call.`,
  });
  return { order: await SaleOrder.findById(order._id).lean(), whatsappMessage: message };
}

/* ----------------------------------------------------------------- approval */

/** Record the customer's decision. Branch staff (own branch), the assigned designer, or an admin. */
async function recordApproval(id, body, actor) {
  const order = await getOrder(id);
  const byDesigner = isAssignee(order, actor);
  const byBranch = actor.isBranchStaff && actor.branchIds.includes(idStr(order.orderBranchId));
  if (!byDesigner && !byBranch && !actor.isAdmin) {
    throw err(403, "FORBIDDEN", "Only the order's branch, the assigned designer or an admin can record the customer's decision.");
  }
  if (order.status !== STATUS.SENT_FOR_APPROVAL) throw invalidStatus(order, [STATUS.SENT_FOR_APPROVAL]);

  const decision = String(body.decision || "").toUpperCase();
  if (!["APPROVED", "CHANGES_REQUESTED"].includes(decision)) {
    throw err(422, "INVALID_DECISION", "Decision must be APPROVED or CHANGES_REQUESTED.");
  }
  const channel = String(body.channel || (byDesigner ? "CALL_TO_DESIGNER" : "CALL_TO_BRANCH")).toUpperCase();
  if (!APPROVAL_CHANNELS.includes(channel)) {
    throw err(422, "INVALID_CHANNEL", `Channel must be one of ${APPROVAL_CHANNELS.join(", ")}.`);
  }
  const remarks = String(body.remarks || "").trim();
  if (decision === "CHANGES_REQUESTED" && remarks.length < 5) {
    throw err(422, "REMARKS_REQUIRED", "Describe the changes the customer wants (at least 5 characters).");
  }

  const latest = await SaleOrderDesign.findOne({ orderId: order._id, status: "SENT" }).sort({ versionNo: -1 }).lean();
  if (!latest) throw err(409, "INVALID_STATUS", "There is no design version waiting for the customer's decision.");
  if (body.versionNo !== undefined && Number(body.versionNo) !== latest.versionNo) {
    throw err(409, "STALE_VERSION", `The decision must be for the latest sent version (v${latest.versionNo}).`);
  }

  const now = new Date();
  const approved = decision === "APPROVED";
  await runInTransaction(async (session) => {
    const set = approved
      ? {
          status: STATUS.APPROVED,
          approvedDesignId: latest._id,
          approval: {
            approvedAt: now,
            channel,
            recordedBy: toObjectId(actor.userId),
            recordedByRole: actor.roleLabel,
            remarks,
          },
        }
      : { status: STATUS.CHANGES_REQUESTED };

    const updated = await SaleOrder.findOneAndUpdate(
      { _id: order._id, status: STATUS.SENT_FOR_APPROVAL },
      { $set: set },
      { new: true, session }
    );
    if (!updated) throw invalidStatus(order, [STATUS.SENT_FOR_APPROVAL]);

    await SaleOrderDesign.updateOne(
      { _id: latest._id },
      {
        $set: {
          status: decision,
          customerDecision: { decision, channel, changeNotes: remarks, recordedBy: toObjectId(actor.userId), recordedAt: now },
        },
      },
      { session }
    );
    await addEvent(session, {
      order,
      action: approved ? "CUSTOMER_APPROVED" : "CHANGES_REQUESTED",
      fromStatus: STATUS.SENT_FOR_APPROVAL,
      toStatus: set.status,
      actor,
      notes: remarks,
      meta: { versionNo: latest.versionNo, channel },
    });
  });

  await audit({
    actor,
    action: approved ? "SALE_ORDER_DESIGN_APPROVED" : "SALE_ORDER_CHANGES_REQUESTED",
    order,
    after: { versionNo: latest.versionNo, channel, remarks },
  });

  // Tell the other side
  const payload = approved
    ? { type: NOTIFICATION.APPROVED, title: "Design approved", message: `Order ${order.orderNo}: customer approved design v${latest.versionNo}.` }
    : { type: NOTIFICATION.CHANGES, title: "Changes requested", message: `Order ${order.orderNo}: customer wants changes. ${remarks}` };
  if (byDesigner) await notifyBranch(order, payload);
  else await notify({ userIds: [idStr(order.currentAssignment?.designerUserId)], orderId: order._id, ...payload });

  return SaleOrder.findById(order._id).lean();
}

/* ------------------------------------------------------------------- print */

async function startPrint(id, actor) {
  const order = await getOrder(id);
  assertAssignee(order, actor, { allowAdmin: true });
  if (order.status !== STATUS.APPROVED) throw invalidStatus(order, [STATUS.APPROVED]);

  await runInTransaction(async (session) => {
    const updated = await SaleOrder.findOneAndUpdate(
      { _id: order._id, status: STATUS.APPROVED },
      { $set: { status: STATUS.PRINTING, printing: { startedAt: new Date(), printedBy: toObjectId(actor.userId) } } },
      { new: true, session }
    );
    if (!updated) throw invalidStatus(order, [STATUS.APPROVED]);
    await addEvent(session, { order, action: "PRINT_STARTED", fromStatus: STATUS.APPROVED, toStatus: STATUS.PRINTING, actor });
  });
  return SaleOrder.findById(order._id).lean();
}

/** Finish printing: printed quantity must cover the ordered quantity for every item. */
async function finishPrint(id, body, actor) {
  const order = await getOrder(id);
  assertAssignee(order, actor, { allowAdmin: true });
  if (order.status !== STATUS.PRINTING) throw invalidStatus(order, [STATUS.PRINTING]);
  if (order.printing?.completedAt) throw err(409, "INVALID_STATUS", "Printing is already finished for this order.");

  const items = await SaleOrderItem.find({ orderId: order._id }).sort({ lineNo: 1 }).lean();
  let printedTotal;
  if (Array.isArray(body.items) && body.items.length) {
    const byLine = new Map(body.items.map((i) => [Number(i.lineNo), Number(i.printedQty)]));
    for (const it of items) {
      const printed = byLine.get(it.lineNo);
      if (!(printed >= it.quantity)) {
        throw err(422, "QTY_SHORT", `Item ${it.lineNo}: printed quantity ${printed ?? 0} is less than the ordered quantity ${it.quantity}.`);
      }
    }
    printedTotal = Array.from(byLine.values()).reduce((a, b) => a + b, 0);
  } else {
    printedTotal = Number(body.printedQty);
    const orderedTotal = items.reduce((a, i) => a + i.quantity, 0);
    if (!(printedTotal >= orderedTotal)) {
      throw err(422, "QTY_SHORT", `Printed quantity ${Number.isFinite(printedTotal) ? printedTotal : 0} is less than the ordered quantity ${orderedTotal}.`);
    }
  }
  const spoilageQty = Number(body.spoilageQty || 0);
  if (!(spoilageQty >= 0)) throw err(422, "INVALID_AMOUNT", "Spoilage cannot be negative.");

  await runInTransaction(async (session) => {
    const updated = await SaleOrder.findOneAndUpdate(
      { _id: order._id, status: STATUS.PRINTING, "printing.completedAt": null },
      {
        $set: {
          "printing.completedAt": new Date(),
          "printing.printedQty": printedTotal,
          "printing.spoilageQty": spoilageQty,
          "printing.remarks": String(body.remarks || "").trim(),
        },
      },
      { new: true, session }
    );
    if (!updated) throw err(409, "INVALID_STATUS", "Printing was already finished.");
    await addEvent(session, {
      order,
      action: "PRINT_FINISHED",
      fromStatus: STATUS.PRINTING,
      toStatus: STATUS.PRINTING,
      actor,
      meta: { printedQty: printedTotal, spoilageQty },
    });
  });
  return SaleOrder.findById(order._id).lean();
}

/** Only the approved version's print file can be downloaded, and only by the designer, unit manager or admin. */
async function getPrintFile(id, versionNo, actor) {
  const order = await getOrder(id);
  const isUnitManager = actor.isMfgManager && actor.branchIds.includes(idStr(order.manufacturingUnitId));
  if (!actor.isAdmin && !isUnitManager && !isAssignee(order, actor)) {
    throw err(403, "FORBIDDEN", "You cannot download the print file of this order.");
  }
  const design = await SaleOrderDesign.findOne({ orderId: order._id, versionNo: Number(versionNo) }).lean();
  if (!design) throw err(404, "NOT_FOUND", `Design version ${versionNo} not found.`);
  if (idStr(order.approvedDesignId) !== idStr(design._id)) {
    throw err(409, "PRINT_FILE_NOT_APPROVED", "Only the print file of the approved version can be downloaded.");
  }
  if (!design.printFileAttachmentId) throw err(404, "NOT_FOUND", "This version has no print file.");
  return attachmentService.getAttachmentFilePath(design.printFileAttachmentId);
}

/* ----------------------------------------------------------------- dispatch */

/** "Designed and sent to the location": PRINTING (finished) -> DISPATCHED to the ordering branch. */
async function dispatchOrder(id, body, actor) {
  const order = await getOrder(id);
  assertAssignee(order, actor, { allowAdmin: true });
  if (order.status !== STATUS.PRINTING) throw invalidStatus(order, [STATUS.PRINTING]);
  if (!order.printing?.completedAt) throw err(422, "PRINT_NOT_FINISHED", "Finish printing before dispatching.");

  const packages = Number(body.packages);
  if (!Number.isInteger(packages) || packages < 1) throw err(422, "PACKAGES_REQUIRED", "At least 1 package is required.");
  const mode = String(body.mode || "").toUpperCase();
  if (!DISPATCH_MODES.includes(mode)) throw err(422, "INVALID_MODE", `Mode must be one of ${DISPATCH_MODES.join(", ")}.`);
  const trackingRef = String(body.trackingRef || "").trim();
  if (mode === "COURIER" && !trackingRef) throw err(422, "TRACKING_REQUIRED", "A tracking number is required for courier dispatch.");

  const dispatchNo = await nextNumber("SALE_ORDER_DISPATCH", "DSP");
  await runInTransaction(async (session) => {
    const updated = await SaleOrder.findOneAndUpdate(
      { _id: order._id, status: STATUS.PRINTING },
      {
        $set: {
          status: STATUS.DISPATCHED,
          dispatch: {
            dispatchNo,
            dispatchedAt: new Date(),
            dispatchedBy: toObjectId(actor.userId),
            mode,
            carrierDetails: String(body.carrierDetails || "").trim(),
            trackingRef,
            packages,
          },
        },
      },
      { new: true, session }
    );
    if (!updated) throw invalidStatus(order, [STATUS.PRINTING]);
    await assignment.releaseDesigner(session, order, { assignmentStatus: "COMPLETED", reason: "Dispatched" });
    await addEvent(session, {
      order,
      action: "DISPATCHED",
      fromStatus: STATUS.PRINTING,
      toStatus: STATUS.DISPATCHED,
      actor,
      meta: { dispatchNo, mode, packages },
    });
  });

  await audit({
    actor,
    action: "SALE_ORDER_DISPATCHED",
    order,
    after: { dispatchNo, mode, packages, trackingRef },
  });
  await notifyBranch(order, {
    type: NOTIFICATION.DISPATCHED,
    title: "Order is on the way",
    message: `Order ${order.orderNo} was sent to your branch (${dispatchNo}, ${packages} package${packages > 1 ? "s" : ""}).`,
  });

  // The freed designer slot may serve the next waiting order
  try {
    await assignment.processQueue(order.manufacturingUnitId);
  } catch (e) {
    console.warn("[SaleOrder] queue processing failed:", e.message);
  }
  return SaleOrder.findById(order._id).lean();
}

module.exports = {
  startDesign,
  uploadDesign,
  sendDesign,
  recordApproval,
  startPrint,
  finishPrint,
  getPrintFile,
  dispatchOrder,
};
