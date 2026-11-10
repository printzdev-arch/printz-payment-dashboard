const service = require("../services/deleteRequest.service");

/**
 * Put in front of a DELETE route. An admin goes straight on to the delete; anyone else sends a request instead,
 * and the record stays until an admin approves. The reason comes from the request body (or ?reason=).
 *
 *   router.delete("/:id", requirePermission(...), requireDeleteApproval("stockItem"), controller.delete);
 */
const requireDeleteApproval = (resourceType) => async (req, res, next) => {
  try {
    if (!req.user) return next(require("../../../utils/errors/ApiError").unauthorized("Authentication required."));
    if (service.isAdminUser(req.user)) return next();

    const reason = (req.body && req.body.reason) || (req.query && req.query.reason) || "";
    const request = await service.createRequest({ resourceType, resourceId: req.params.id, reason }, req.user);

    // 202: accepted, nothing is deleted yet
    return res.status(202).json({
      success: true,
      message: "Delete request sent to an admin for approval. The record is kept until it is approved.",
      data: { requestId: request._id, status: request.status, pendingApproval: true },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = requireDeleteApproval;
