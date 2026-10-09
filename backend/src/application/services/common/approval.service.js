const approvalRepository = require("../../../infrastructure/database/mongoose/repositories/common/ApprovalRepository");
const numberSequenceService = require("./numberSequence.service");
const auditLogService = require("./auditLog.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class ApprovalService {
  constructor(repository = approvalRepository, seqService = numberSequenceService) {
    this.repository = repository;
    this.seqService = seqService;
  }

  /**
   * Reusable method to submit any business entity for approval.
   */
  async createApproval({ referenceType, referenceId, requestedBy, branchId = null, comments = null }) {
    if (!referenceType || !referenceId || !requestedBy) {
      throw ErrorHelper.badRequest("referenceType, referenceId, and requestedBy are required");
    }

    const approvalNo = await this.seqService.generateBusinessNumber("APPROVAL");
    const approval = await this.repository.create({
      approvalNo,
      referenceType,
      referenceId,
      requestedBy,
      branchId,
      comments,
      status: "PENDING",
      requestedAt: new Date(),
    });

    await auditLogService.log({
      actorId: requestedBy,
      action: "CREATE",
      entityType: "APPROVAL",
      entityId: approval._id,
      after: approval.toObject ? approval.toObject() : approval,
      branchId,
    });

    return approval;
  }

  _applyScopeConstraint(baseQuery = {}, authContext = {}) {
    const query = { ...baseQuery };
    if (authContext.isSuperAdmin) {
      return query;
    }

    const scopes = authContext.scopes || [];
    if (scopes.includes("ALL")) {
      return query;
    }

    const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
      .map((b) => (b._id ? b._id.toString() : b.toString()))
      .filter(Boolean);

    if (scopes.includes("BRANCH")) {
      if (authorizedBranches.length > 0) {
        query.branchId = { $in: authorizedBranches };
      } else {
        query.branchId = "__NO_BRANCH_ACCESS__";
      }
      return query;
    }

    // SELF / ASSIGNED scope: only requested by this user or assigned approver
    const userId = authContext.user?._id || authContext.user?.id;
    if (userId) {
      query.$or = [{ requestedBy: userId }, { approverId: userId }];
    } else {
      query.requestedBy = "__NO_ACCESS__";
    }

    return query;
  }

  _assertCanDecide(approval, authContext = {}) {
    if (authContext.isSuperAdmin) return;
    const scopes = authContext.scopes || [];
    if (scopes.includes("ALL")) return;

    if (scopes.includes("BRANCH")) {
      const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
        .map((b) => (b._id ? b._id.toString() : b.toString()))
        .filter(Boolean);

      const approvalBranch = approval.branchId?._id
        ? approval.branchId._id.toString()
        : approval.branchId?.toString();

      if (!approvalBranch || !authorizedBranches.includes(approvalBranch)) {
        throw ErrorHelper.forbidden("Access denied: You cannot decide approvals outside your assigned branch");
      }
      return;
    }

    throw ErrorHelper.forbidden("Permission denied: You do not have authority to decide approvals");
  }

  async getApprovals(filters = {}, pagination = {}, authContext = {}) {
    const query = this._applyScopeConstraint(filters, authContext);
    return this.repository.findAll(query, pagination);
  }

  async getApprovalById(id, authContext = {}) {
    const approval = await this.repository.findById(id);
    if (!approval) {
      throw ErrorHelper.notFound("Approval request not found");
    }

    // Scope check
    if (!authContext.isSuperAdmin && !(authContext.scopes || []).includes("ALL")) {
      const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
        .map((b) => (b._id ? b._id.toString() : b.toString()))
        .filter(Boolean);

      if ((authContext.scopes || []).includes("BRANCH")) {
        const approvalBranch = approval.branchId?._id
          ? approval.branchId._id.toString()
          : approval.branchId?.toString();
        if (!approvalBranch || !authorizedBranches.includes(approvalBranch)) {
          throw ErrorHelper.forbidden("Access denied to this approval request");
        }
      } else {
        const userId = (authContext.user?._id || authContext.user?.id)?.toString();
        const reqBy = approval.requestedBy?._id ? approval.requestedBy._id.toString() : approval.requestedBy?.toString();
        const appBy = approval.approverId?._id ? approval.approverId._id.toString() : approval.approverId?.toString();

        if (reqBy !== userId && appBy !== userId) {
          throw ErrorHelper.forbidden("Access denied to this approval request");
        }
      }
    }

    return approval;
  }

  async approve(id, { approverId, comments = null }, authContext = {}) {
    const approval = await this.repository.findById(id);
    if (!approval) {
      throw ErrorHelper.notFound("Approval request not found");
    }
    if (approval.status !== "PENDING") {
      throw ErrorHelper.badRequest(`Cannot approve: request is already in '${approval.status}' state`);
    }

    this._assertCanDecide(approval, authContext);

    const beforeState = { ...approval };
    const updated = await this.repository.updateStatus(id, {
      status: "APPROVED",
      approverId: approverId || authContext.user?._id,
      decidedAt: new Date(),
      comments: comments || approval.comments,
    });

    await auditLogService.log({
      actorId: approverId || authContext.user?._id,
      actorName: authContext.user?.name,
      action: "APPROVE",
      entityType: "APPROVAL",
      entityId: id,
      before: beforeState,
      after: updated,
      branchId: approval.branchId?._id || approval.branchId,
    });

    return updated;
  }

  async reject(id, { approverId, comments = null }, authContext = {}) {
    const approval = await this.repository.findById(id);
    if (!approval) {
      throw ErrorHelper.notFound("Approval request not found");
    }
    if (approval.status !== "PENDING") {
      throw ErrorHelper.badRequest(`Cannot reject: request is already in '${approval.status}' state`);
    }

    this._assertCanDecide(approval, authContext);

    const beforeState = { ...approval };
    const updated = await this.repository.updateStatus(id, {
      status: "REJECTED",
      approverId: approverId || authContext.user?._id,
      decidedAt: new Date(),
      comments: comments || approval.comments,
    });

    await auditLogService.log({
      actorId: approverId || authContext.user?._id,
      actorName: authContext.user?.name,
      action: "REJECT",
      entityType: "APPROVAL",
      entityId: id,
      before: beforeState,
      after: updated,
      branchId: approval.branchId?._id || approval.branchId,
    });

    return updated;
  }

  async cancel(id, { userId, comments = null }, authContext = {}) {
    const approval = await this.repository.findById(id);
    if (!approval) {
      throw ErrorHelper.notFound("Approval request not found");
    }
    if (approval.status !== "PENDING") {
      throw ErrorHelper.badRequest(`Cannot cancel: request is already in '${approval.status}' state`);
    }

    // Requester or admin can cancel
    const reqBy = approval.requestedBy?._id ? approval.requestedBy._id.toString() : approval.requestedBy?.toString();
    const callerId = (userId || authContext.user?._id || authContext.user?.id)?.toString();

    if (reqBy !== callerId && !authContext.isSuperAdmin && !(authContext.scopes || []).includes("ALL")) {
      throw ErrorHelper.forbidden("Only the original requester or an administrator can cancel this approval request");
    }

    const beforeState = { ...approval };
    const updated = await this.repository.updateStatus(id, {
      status: "CANCELLED",
      approverId: callerId,
      decidedAt: new Date(),
      comments: comments || "Cancelled by requester",
    });

    await auditLogService.log({
      actorId: callerId,
      actorName: authContext.user?.name,
      action: "CANCEL",
      entityType: "APPROVAL",
      entityId: id,
      before: beforeState,
      after: updated,
      branchId: approval.branchId?._id || approval.branchId,
    });

    return updated;
  }

  async getApprovalCounts(filters = {}, authContext = {}) {
    const query = this._applyScopeConstraint(filters, authContext);
    return this.repository.getCounts(query);
  }
}

module.exports = new ApprovalService();
