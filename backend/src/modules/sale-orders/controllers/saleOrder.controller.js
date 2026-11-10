const {
  saleOrderService,
  saleOrderWorkflowService,
  saleOrderAssignmentService,
  getActor,
} = require("../services");
const { asyncHandler, ResponseHelper } = require("../../../utils");

const idempotencyKey = (req) => req.headers["idempotency-key"] || req.headers["x-idempotency-key"] || null;

/* ---- branch side ---- */

const lookupCustomer = asyncHandler(async (req, res) => {
  const data = await saleOrderService.lookupCustomer(req.query, getActor(req));
  return ResponseHelper.success(res, data, "Customer lookup completed");
});

const create = asyncHandler(async (req, res) => {
  const data = await saleOrderService.createOrder(req.body, getActor(req));
  return ResponseHelper.success(res, data, "Sale order draft created", 201);
});

const update = asyncHandler(async (req, res) => {
  const data = await saleOrderService.updateDraft(req.params.id, req.body, getActor(req));
  return ResponseHelper.success(res, data, "Sale order updated");
});

const addReferenceFiles = asyncHandler(async (req, res) => {
  const data = await saleOrderService.addReferenceFiles(req.params.id, req.files, getActor(req));
  return ResponseHelper.success(res, data, "Reference files added");
});

const place = asyncHandler(async (req, res) => {
  const data = await saleOrderService.placeOrder(req.params.id, req.body, getActor(req), {
    idempotencyKey: idempotencyKey(req),
  });
  return ResponseHelper.success(res, data, "Sale order placed", data.idempotentReplay ? 200 : 201);
});

const receive = asyncHandler(async (req, res) => {
  const data = await saleOrderService.receiveOrder(req.params.id, req.body, getActor(req));
  return ResponseHelper.success(res, data, "Parcel received at branch");
});

const deliver = asyncHandler(async (req, res) => {
  const data = await saleOrderService.deliverOrder(req.params.id, req.body, getActor(req), {
    idempotencyKey: idempotencyKey(req),
  });
  return ResponseHelper.success(res, data, "Sale order delivered");
});

const cancel = asyncHandler(async (req, res) => {
  const data = await saleOrderService.cancelOrder(req.params.id, req.body, getActor(req));
  return ResponseHelper.success(res, data, "Sale order cancelled");
});

/* ---- read ---- */

const list = asyncHandler(async (req, res) => {
  const result = await saleOrderService.listOrders(req.query, getActor(req));
  return ResponseHelper.paginated(res, result.items, result.total, result.page, result.limit, "Sale orders retrieved");
});

const detail = asyncHandler(async (req, res) => {
  const data = await saleOrderService.getOrderDetail(req.params.id, getActor(req));
  return ResponseHelper.success(res, data, "Sale order retrieved");
});

const timeline = asyncHandler(async (req, res) => {
  const data = await saleOrderService.getTimeline(req.params.id, getActor(req));
  return ResponseHelper.success(res, data, "Sale order timeline retrieved");
});

/* ---- manufacturing unit side ---- */

const startDesign = asyncHandler(async (req, res) => {
  const data = await saleOrderWorkflowService.startDesign(req.params.id, getActor(req));
  return ResponseHelper.success(res, data, "Design started");
});

const uploadDesign = asyncHandler(async (req, res) => {
  const data = await saleOrderWorkflowService.uploadDesign(req.params.id, req.files, req.body, getActor(req));
  return ResponseHelper.success(res, data, "Design version uploaded", 201);
});

const sendDesign = asyncHandler(async (req, res) => {
  const data = await saleOrderWorkflowService.sendDesign(req.params.id, req.params.v, getActor(req));
  return ResponseHelper.success(res, data, "Design sent to the customer on WhatsApp");
});

const approval = asyncHandler(async (req, res) => {
  const data = await saleOrderWorkflowService.recordApproval(req.params.id, req.body, getActor(req));
  return ResponseHelper.success(res, data, "Customer decision recorded");
});

const printStart = asyncHandler(async (req, res) => {
  const data = await saleOrderWorkflowService.startPrint(req.params.id, getActor(req));
  return ResponseHelper.success(res, data, "Printing started");
});

const printFinish = asyncHandler(async (req, res) => {
  const data = await saleOrderWorkflowService.finishPrint(req.params.id, req.body, getActor(req));
  return ResponseHelper.success(res, data, "Printing finished");
});

const printFile = asyncHandler(async (req, res) => {
  const { attachment, filePath } = await saleOrderWorkflowService.getPrintFile(req.params.id, req.params.v, getActor(req));
  // The browser can only read the file name from this header if it is exposed
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  return res.download(filePath, attachment.fileName);
});

const dispatch = asyncHandler(async (req, res) => {
  const data = await saleOrderWorkflowService.dispatchOrder(req.params.id, req.body, getActor(req));
  return ResponseHelper.success(res, data, "Order dispatched to the branch");
});

const assign = asyncHandler(async (req, res) => {
  const data = await saleOrderAssignmentService.manualAssign(req.params.id, req.body, getActor(req));
  return ResponseHelper.success(res, data, "Order assigned");
});

const reassign = asyncHandler(async (req, res) => {
  const data = await saleOrderAssignmentService.reassign(req.params.id, req.body, getActor(req));
  return ResponseHelper.success(res, data, "Order reassigned");
});

/* ---- /api/mfg ---- */

const mfgDashboard = asyncHandler(async (req, res) => {
  const data = await saleOrderAssignmentService.getDashboard(getActor(req), req.query);
  return ResponseHelper.success(res, data, "Dashboard retrieved");
});

const setAvailability = asyncHandler(async (req, res) => {
  const data = await saleOrderAssignmentService.setAvailability(getActor(req), req.body);
  return ResponseHelper.success(res, data, "Availability updated");
});

const mfgQueue = asyncHandler(async (req, res) => {
  const data = await saleOrderAssignmentService.getQueue(getActor(req), req.query);
  return ResponseHelper.success(res, data, "Waiting queue retrieved");
});

const mfgDesigners = asyncHandler(async (req, res) => {
  const data = await saleOrderAssignmentService.listDesigners(getActor(req), req.query);
  return ResponseHelper.success(res, data, "Designers retrieved");
});

module.exports = {
  lookupCustomer,
  create,
  update,
  addReferenceFiles,
  place,
  receive,
  deliver,
  cancel,
  list,
  detail,
  timeline,
  startDesign,
  uploadDesign,
  sendDesign,
  approval,
  printStart,
  printFinish,
  printFile,
  dispatch,
  assign,
  reassign,
  mfgDashboard,
  setAvailability,
  mfgQueue,
  mfgDesigners,
};
