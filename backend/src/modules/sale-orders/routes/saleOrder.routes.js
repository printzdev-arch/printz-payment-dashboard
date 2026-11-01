const express = require("express");
const router = express.Router();
const controller = require("../controllers/saleOrder.controller");
const { authenticate } = require("../../../middleware/auth.middleware");
const { requirePermission } = require("../../../middleware/permission.middleware");
const { upload } = require("../../../middleware/upload.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");

const { SALE_ORDER, MFG } = PERMISSIONS;

router.use(authenticate);

// Static paths first so they are not captured by "/:id"
router.get("/customer-lookup", requirePermission(SALE_ORDER.CREATE), controller.lookupCustomer);

// Branch side
router.post("/", requirePermission(SALE_ORDER.CREATE), controller.create);
router.get("/", requirePermission(SALE_ORDER.VIEW), controller.list);
router.get("/:id", requirePermission(SALE_ORDER.VIEW), controller.detail);
router.get("/:id/timeline", requirePermission(SALE_ORDER.VIEW), controller.timeline);
router.patch("/:id", requirePermission(SALE_ORDER.CREATE), controller.update);
router.post(
  "/:id/reference-files",
  requirePermission(SALE_ORDER.CREATE),
  upload.array("files", 5),
  controller.addReferenceFiles
);
router.post("/:id/place", requirePermission(SALE_ORDER.PAYMENT_COLLECT), controller.place);
router.post("/:id/receive", requirePermission(SALE_ORDER.RECEIVE), controller.receive);
router.post("/:id/deliver", requirePermission(SALE_ORDER.DELIVER), controller.deliver);
router.post("/:id/cancel", requirePermission(SALE_ORDER.CANCEL), controller.cancel);

// Shared: branch (own) or assigned designer records the customer's decision
router.post("/:id/approval", requirePermission(SALE_ORDER.APPROVAL_RECORD), controller.approval);

// Manufacturing unit: designer
router.post("/:id/design/start", requirePermission(MFG.DESIGN_WORK), controller.startDesign);
router.post(
  "/:id/designs",
  requirePermission(MFG.DESIGN_WORK),
  upload.fields([
    { name: "preview", maxCount: 1 },
    { name: "printFile", maxCount: 1 },
  ]),
  controller.uploadDesign
);
router.post("/:id/designs/:v/send", requirePermission(MFG.DESIGN_SEND_WHATSAPP), controller.sendDesign);
router.get("/:id/designs/:v/print-file", requirePermission(MFG.PRINT_DISPATCH), controller.printFile);
router.post("/:id/print/start", requirePermission(MFG.PRINT_DISPATCH), controller.printStart);
router.post("/:id/print/finish", requirePermission(MFG.PRINT_DISPATCH), controller.printFinish);
router.post("/:id/dispatch", requirePermission(MFG.PRINT_DISPATCH), controller.dispatch);

// Manufacturing unit: manager
router.post("/:id/assign", requirePermission(MFG.ASSIGNMENT_MANAGE), controller.assign);
router.post("/:id/reassign", requirePermission(MFG.ASSIGNMENT_MANAGE), controller.reassign);

module.exports = router;
