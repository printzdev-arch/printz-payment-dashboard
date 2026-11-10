const express = require("express");
const router = express.Router();
const service = require("../services/deleteRequest.service");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { asyncHandler, ResponseHelper } = require("../../../utils");

router.use(authenticate);

// Kinds of record a delete can be requested for
router.get(
  "/types",
  asyncHandler(async (req, res) => ResponseHelper.success(res, service.getTypes(), "Delete request types retrieved."))
);

// Admins see every request; everyone else sees only their own
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await service.list(req.query, req.user);
    return ResponseHelper.success(res, result, "Delete requests retrieved.");
  })
);

// Admin only (checked in the service): approving deletes the record
router.post(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    const result = await service.decide(req.params.id, { approve: true, note: req.body && req.body.note }, req.user, req.authz);
    return ResponseHelper.success(res, result, "Delete request approved and the record was deleted.");
  })
);

router.post(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    const result = await service.decide(req.params.id, { approve: false, note: req.body && req.body.note }, req.user, req.authz);
    return ResponseHelper.success(res, result, "Delete request rejected. The record was kept.");
  })
);

// The person who asked can withdraw a request that is still waiting
router.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const result = await service.cancel(req.params.id, req.user);
    return ResponseHelper.success(res, result, "Delete request withdrawn.");
  })
);

module.exports = router;
