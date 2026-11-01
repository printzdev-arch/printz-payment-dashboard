const mongoose = require("mongoose");
const AttendancePolicy = require("../models/AttendancePolicy");
const DailyAttendance = require("../models/DailyAttendance");
const Branch = require("../../branches/models/Branch");
const AuditHelper = require("../../audit-logs/helpers/AuditHelper");
const ApiError = require("../../../utils/ApiError");
const { toNames } = require("../../../utils/weeklyOff.util");

class AttendancePolicyService {
  /**
   * The effective attendance policy is the authoritative weekly-off schedule.
   * Mirror it onto Branch.weeklyOffDays so the two can never disagree.
   */
  async _syncBranchWeeklyOff(policy) {
    if (!policy || !policy.branchId || policy.isActive === false) return;
    try {
      await Branch.updateOne(
        { _id: policy.branchId },
        { $set: { weeklyOffDays: toNames(policy.weeklyOffDays) } }
      );
    } catch (err) {
      console.error("[AttendancePolicyService] Failed to sync branch weekly offs:", err.message);
    }
  }

  // ─── Authorization Helpers ───────────────────────────────────────────────

  _extractAuthorizedBranchIds(authContext = {}) {
    return (authContext.authorizedBranchIds || [])
      .map((b) => (b._id ? b._id.toString() : b.toString()))
      .filter(Boolean);
  }

  _isSuperAdmin(authContext = {}) {
    return Boolean(authContext.isSuperAdmin);
  }

  _assertBranchAuthorized(targetBranchId, authContext = {}) {
    if (this._isSuperAdmin(authContext)) return;
    if (!targetBranchId) {
      throw ApiError.forbidden("Access denied: Only Super Admin can manage organization-wide policies.");
    }

    const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
    if (authorizedBranchIds.length === 0) {
      throw ApiError.forbidden("Access denied: No authorized branch assignments found.");
    }

    const tStr = targetBranchId._id ? targetBranchId._id.toString() : targetBranchId.toString();
    if (!authorizedBranchIds.includes(tStr)) {
      throw ApiError.forbidden("Access denied: You are not authorized for the specified branch.");
    }
  }

  _assertCanManagePolicies(authContext = {}) {
    if (this._isSuperAdmin(authContext)) return;
    const role = (authContext.role || "").toUpperCase();
    if (role === "MANAGER" || role === "BRANCH_MANAGER" || role === "EMPLOYEE") {
      throw ApiError.forbidden("Access denied: Branch Managers cannot create, update, or delete attendance policies.");
    }
  }

  _validatePolicyConsistency({
    shiftStartTime = "09:00",
    shiftEndTime = "18:00",
    breakDurationMinutes = 60,
    workingHoursPerDay = 8,
    halfDayHours = 4,
    fullDayHours = 8,
  }) {
    const timeToMinutes = (timeStr) => {
      if (!timeStr || typeof timeStr !== "string") return null;
      const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr.trim());
      if (!match) return null;
      return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    };

    const startMin = timeToMinutes(shiftStartTime);
    const endMin = timeToMinutes(shiftEndTime);
    if (startMin === null || endMin === null) {
      throw ApiError.badRequest("Shift start time and end time must be in HH:mm format (00:00 - 23:59).");
    }

    if (startMin === endMin) {
      throw ApiError.badRequest("Shift start time and end time cannot be identical.");
    }

    let shiftDurationMinutes = 0;
    if (endMin > startMin) {
      shiftDurationMinutes = endMin - startMin;
    } else {
      shiftDurationMinutes = (1440 - startMin) + endMin;
    }

    const breakMins = Number(breakDurationMinutes) || 0;
    if (breakMins < 0) {
      throw ApiError.badRequest("Break duration minutes cannot be negative.");
    }
    if (breakMins >= shiftDurationMinutes) {
      throw ApiError.badRequest(
        `Break duration (${breakMins} mins) must be strictly less than total shift duration (${shiftDurationMinutes} mins).`
      );
    }

    const scheduledNetMinutes = shiftDurationMinutes - breakMins;
    const workingHours = Number(workingHoursPerDay) || 0;
    if (workingHours <= 0) {
      throw ApiError.badRequest("Working hours per day must be greater than 0.");
    }

    const configuredWorkingMinutes = Math.round(workingHours * 60);
    if (configuredWorkingMinutes > scheduledNetMinutes) {
      throw ApiError.badRequest(
        `Inconsistent policy configuration: Configured working hours per day (${workingHours} hrs) exceeds scheduled net shift duration (${Math.round((scheduledNetMinutes / 60) * 100) / 100} hrs) after deducting ${breakMins} mins break.`
      );
    }

    const halfDay = Number(halfDayHours);
    const fullDay = Number(fullDayHours);
    if (halfDay <= 0) {
      throw ApiError.badRequest("Half day threshold hours must be greater than 0.");
    }
    if (halfDay >= fullDay) {
      throw ApiError.badRequest("Half day threshold hours must be strictly less than full day threshold hours.");
    }
    if (fullDay > workingHours) {
      throw ApiError.badRequest(
        `Full day threshold hours (${fullDay} hrs) cannot exceed configured working hours per day (${workingHours} hrs).`
      );
    }
  }

  // ─── Business Methods ────────────────────────────────────────────────────

  /**
   * Create a new Attendance Policy
   */
  async createPolicy(data, actorId, authContext = {}) {
    this._assertCanManagePolicies(authContext);

    const {
      name,
      code,
      description = "",
      branchId = null,
      workingHoursPerDay = 8,
      shiftStartTime = "09:00",
      shiftEndTime = "18:00",
      lateGraceMinutes = 15,
      earlyCheckoutGraceMinutes = 0,
      breakDurationMinutes = 60,
      halfDayHours = 4,
      fullDayHours = 8,
      weeklyOffDays = [],
      workingDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      monthlyLeaveAllowance = 4,
      overtimeEnabled = true,
      permissionEnabled = true,
      maxPermissionHoursPerDay = 2,
      maxPermissionHoursPerMonth = 4,
      isActive = true,
    } = data;

    if (!name || !code) {
      throw ApiError.badRequest("Policy name and unique code are required.");
    }

    this._validatePolicyConsistency({
      shiftStartTime,
      shiftEndTime,
      breakDurationMinutes: Number(breakDurationMinutes) || 0,
      workingHoursPerDay: Number(workingHoursPerDay),
      halfDayHours: Number(halfDayHours),
      fullDayHours: Number(fullDayHours),
    });

    // Branch authorization check
    if (branchId) {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        throw ApiError.badRequest("Invalid branch ID format.");
      }
      this._assertBranchAuthorized(branchId, authContext);
      const branchExists = await Branch.findById(branchId);
      if (!branchExists || branchExists.isActive === false) {
        throw ApiError.badRequest("Specified branch does not exist or is inactive.");
      }
    } else {
      if (!this._isSuperAdmin(authContext)) {
        throw ApiError.forbidden("Only Super Admin can create organization-wide default policies.");
      }
    }

    // Check code uniqueness
    const normalizedCode = code.toUpperCase().trim();
    const existingCode = await AttendancePolicy.findOne({ code: normalizedCode });
    if (existingCode) {
      throw ApiError.conflict(`Attendance policy with code '${normalizedCode}' already exists.`);
    }

    // Prevent conflicting active policy for the same branch or global scope
    if (isActive) {
      const conflictQuery = branchId ? { branchId, isActive: true } : { branchId: null, isActive: true };
      const activeConflict = await AttendancePolicy.findOne(conflictQuery);
      if (activeConflict) {
        throw ApiError.conflict(
          branchId
            ? `An active attendance policy ('${activeConflict.name}') already exists for this branch. Please deactivate it first.`
            : `An active organization-wide default policy ('${activeConflict.name}') already exists. Please deactivate it first.`
        );
      }
    }

    const policy = await AttendancePolicy.create({
      name: name.trim(),
      code: normalizedCode,
      description: description.trim(),
      branchId: branchId || null,
      workingHoursPerDay: Number(workingHoursPerDay),
      shiftStartTime,
      shiftEndTime,
      lateGraceMinutes: Number(lateGraceMinutes) || 0,
      earlyCheckoutGraceMinutes: Number(earlyCheckoutGraceMinutes) || 0,
      breakDurationMinutes: Number(breakDurationMinutes) || 0,
      halfDayHours: Number(halfDayHours),
      fullDayHours: Number(fullDayHours),
      weeklyOffDays: Array.isArray(weeklyOffDays) ? weeklyOffDays : [],
      workingDays: Array.isArray(workingDays) && workingDays.length > 0 ? workingDays : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      monthlyLeaveAllowance: Number.isFinite(Number(monthlyLeaveAllowance)) ? Number(monthlyLeaveAllowance) : 4,
      overtimeEnabled: overtimeEnabled !== undefined ? Boolean(overtimeEnabled) : true,
      permissionEnabled: permissionEnabled !== undefined ? Boolean(permissionEnabled) : true,
      maxPermissionHoursPerDay: Number.isFinite(Number(maxPermissionHoursPerDay)) ? Number(maxPermissionHoursPerDay) : 2,
      maxPermissionHoursPerMonth: Number.isFinite(Number(maxPermissionHoursPerMonth)) ? Number(maxPermissionHoursPerMonth) : 4,
      isActive: Boolean(isActive),
      createdBy: actorId || null,
      updatedBy: actorId || null,
    });

    await this._syncBranchWeeklyOff(policy);

    // Audit Logging
    await AuditHelper.log({
      action: "ATTENDANCE_POLICY_CREATE",
      actorId,
      entityType: "ATTENDANCE_POLICY",
      entityId: policy._id,
      branchId: policy.branchId,
      after: policy.toObject(),
    });

    return policy;
  }

  /**
   * Retrieve list of policies with filtering, branch scoping, and pagination
   */
  async getPolicies({ branchId, isActive, search } = {}, pagination = {}, authContext = {}) {
    const query = {};

    if (!this._isSuperAdmin(authContext)) {
      const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
      if (authorizedBranchIds.length === 0) {
        return { policies: [], total: 0, page: 1, pages: 1 };
      }
      // Non-admins see their authorized branch policies plus the organization-wide defaults (branchId: null)
      query.$or = [
        { branchId: { $in: authorizedBranchIds } },
        { branchId: null },
      ];
    }

    if (branchId !== undefined) {
      if (branchId === "null" || branchId === null || branchId === "") {
        query.branchId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
          throw ApiError.badRequest("Invalid branch ID format.");
        }
        query.branchId = branchId;
      }
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true" || isActive === true;
    }

    if (search && typeof search === "string" && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: new RegExp(escaped, "i") },
          { code: new RegExp(escaped, "i") },
          { description: new RegExp(escaped, "i") },
        ],
      });
    }

    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.max(1, parseInt(pagination.limit, 10) || 50);
    const skip = (page - 1) * limit;

    const [policies, total] = await Promise.all([
      AttendancePolicy.find(query)
        .populate("branchId", "name code location")
        .sort({ branchId: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AttendancePolicy.countDocuments(query),
    ]);

    return {
      policies,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieve single policy by ID
   */
  async getPolicyById(id, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid attendance policy ID format.");
    }

    const policy = await AttendancePolicy.findById(id)
      .populate("branchId", "name code location")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!policy) {
      throw ApiError.notFound("Attendance policy not found.");
    }

    if (policy.branchId && !this._isSuperAdmin(authContext)) {
      const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
      const bStr = policy.branchId._id ? policy.branchId._id.toString() : policy.branchId.toString();
      if (!authorizedBranchIds.includes(bStr)) {
        throw ApiError.forbidden("Access denied: You are not authorized to view policies for this branch.");
      }
    }

    return policy;
  }

  /**
   * Update an existing policy
   */
  async updatePolicy(id, data, actorId, authContext = {}) {
    this._assertCanManagePolicies(authContext);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid attendance policy ID format.");
    }

    const existing = await AttendancePolicy.findById(id);
    if (!existing) {
      throw ApiError.notFound("Attendance policy not found.");
    }

    if (existing.branchId) {
      this._assertBranchAuthorized(existing.branchId, authContext);
    } else if (!this._isSuperAdmin(authContext)) {
      throw ApiError.forbidden("Access denied: Only Super Admin can modify organization-wide policies.");
    }

    if (data.branchId) {
      if (!mongoose.Types.ObjectId.isValid(data.branchId)) {
        throw ApiError.badRequest("Invalid branch ID format.");
      }
      this._assertBranchAuthorized(data.branchId, authContext);
      existing.branchId = data.branchId;
    }

    // Code update check
    if (data.code && data.code.toUpperCase().trim() !== existing.code) {
      const normalizedCode = data.code.toUpperCase().trim();
      const codeTaken = await AttendancePolicy.findOne({ code: normalizedCode, _id: { $ne: id } });
      if (codeTaken) {
        throw ApiError.conflict(`Attendance policy with code '${normalizedCode}' already exists.`);
      }
      existing.code = normalizedCode;
    }

    // Validate policy consistency across shift timings, break duration, working hours, and thresholds
    this._validatePolicyConsistency({
      shiftStartTime: data.shiftStartTime !== undefined ? data.shiftStartTime : existing.shiftStartTime,
      shiftEndTime: data.shiftEndTime !== undefined ? data.shiftEndTime : existing.shiftEndTime,
      breakDurationMinutes: data.breakDurationMinutes !== undefined ? Number(data.breakDurationMinutes) : existing.breakDurationMinutes,
      workingHoursPerDay: data.workingHoursPerDay !== undefined ? Number(data.workingHoursPerDay) : existing.workingHoursPerDay,
      halfDayHours: data.halfDayHours !== undefined ? Number(data.halfDayHours) : existing.halfDayHours,
      fullDayHours: data.fullDayHours !== undefined ? Number(data.fullDayHours) : existing.fullDayHours,
    });

    if (data.name !== undefined) existing.name = data.name.trim();
    if (data.description !== undefined) existing.description = data.description.trim();
    if (data.workingHoursPerDay !== undefined) existing.workingHoursPerDay = Number(data.workingHoursPerDay);
    if (data.shiftStartTime !== undefined) existing.shiftStartTime = data.shiftStartTime;
    if (data.shiftEndTime !== undefined) existing.shiftEndTime = data.shiftEndTime;
    if (data.lateGraceMinutes !== undefined) existing.lateGraceMinutes = Number(data.lateGraceMinutes);
    if (data.earlyCheckoutGraceMinutes !== undefined) existing.earlyCheckoutGraceMinutes = Number(data.earlyCheckoutGraceMinutes);
    if (data.breakDurationMinutes !== undefined) existing.breakDurationMinutes = Number(data.breakDurationMinutes);
    if (data.halfDayHours !== undefined) existing.halfDayHours = Number(data.halfDayHours);
    if (data.fullDayHours !== undefined) existing.fullDayHours = Number(data.fullDayHours);
    if (data.weeklyOffDays !== undefined) existing.weeklyOffDays = Array.isArray(data.weeklyOffDays) ? data.weeklyOffDays : [data.weeklyOffDays];
    if (data.workingDays !== undefined && Array.isArray(data.workingDays)) existing.workingDays = data.workingDays;
    if (data.monthlyLeaveAllowance !== undefined) existing.monthlyLeaveAllowance = Number(data.monthlyLeaveAllowance);
    if (data.overtimeEnabled !== undefined) existing.overtimeEnabled = Boolean(data.overtimeEnabled);
    if (data.permissionEnabled !== undefined) existing.permissionEnabled = Boolean(data.permissionEnabled);
    if (data.maxPermissionHoursPerDay !== undefined) existing.maxPermissionHoursPerDay = Number(data.maxPermissionHoursPerDay);
    if (data.maxPermissionHoursPerMonth !== undefined) existing.maxPermissionHoursPerMonth = Number(data.maxPermissionHoursPerMonth);
    if (data.isActive !== undefined) existing.isActive = Boolean(data.isActive);
    existing.updatedBy = actorId || null;

    const beforeState = existing.toObject();
    await existing.save();
    await this._syncBranchWeeklyOff(existing);

    await AuditHelper.log({
      action: "ATTENDANCE_POLICY_UPDATE",
      actorId,
      entityType: "ATTENDANCE_POLICY",
      entityId: existing._id,
      branchId: existing.branchId,
      before: beforeState,
      after: existing.toObject(),
    });

    return existing;
  }

  /**
   * Activate or deactivate a policy
   */
  async updateStatus(id, isActive, actorId, authContext = {}) {
    this._assertCanManagePolicies(authContext);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid attendance policy ID format.");
    }

    const existing = await AttendancePolicy.findById(id);
    if (!existing) {
      throw ApiError.notFound("Attendance policy not found.");
    }

    if (existing.branchId) {
      this._assertBranchAuthorized(existing.branchId, authContext);
    } else if (!this._isSuperAdmin(authContext)) {
      throw ApiError.forbidden("Access denied: Only Super Admin can modify organization-wide policies.");
    }

    const boolStatus = Boolean(isActive);

    // If activating, verify no existing active conflict
    if (boolStatus) {
      const conflictQuery = existing.branchId
        ? { branchId: existing.branchId, isActive: true, _id: { $ne: id } }
        : { branchId: null, isActive: true, _id: { $ne: id } };
      const activeConflict = await AttendancePolicy.findOne(conflictQuery);
      if (activeConflict) {
        throw ApiError.conflict(
          `Cannot activate: Another active policy ('${activeConflict.name}') is already assigned to this scope.`
        );
      }
    }

    const beforeState = existing.toObject();
    existing.isActive = boolStatus;
    existing.updatedBy = actorId || null;
    await existing.save();
    await this._syncBranchWeeklyOff(existing);

    await AuditHelper.log({
      action: boolStatus ? "ATTENDANCE_POLICY_ACTIVATE" : "ATTENDANCE_POLICY_DEACTIVATE",
      actorId,
      entityType: "ATTENDANCE_POLICY",
      entityId: existing._id,
      branchId: existing.branchId,
      before: beforeState,
      after: existing.toObject(),
    });

    return existing;
  }

  /**
   * DELETE /api/attendance-policies/:id
   */
  async deletePolicy(id, actorId, authContext) {
    this._assertCanManagePolicies(authContext);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid attendance policy ID format.");
    }

    const existing = await AttendancePolicy.findById(id);
    if (!existing) {
      throw ApiError.notFound("Attendance policy not found.");
    }

    if (existing.branchId) {
      this._assertBranchAuthorized(existing.branchId, authContext);
    } else if (!this._isSuperAdmin(authContext)) {
      throw ApiError.forbidden("Access denied: Only Super Admin can delete organization-wide policies.");
    }

    let assignedCount = 0;
    try {
      const Employee = mongoose.model("Employee");
      assignedCount = await Employee.countDocuments({ attendancePolicyId: id });
    } catch {
      // Model might not be compiled if running in standalone unit test
    }

    if (assignedCount > 0) {
      throw ApiError.conflict(
        `Cannot delete attendance policy: It is currently assigned to ${assignedCount} employee(s).`
      );
    }

    const beforeState = existing.toObject();
    await AttendancePolicy.findByIdAndDelete(id);

    await AuditHelper.log({
      action: "ATTENDANCE_POLICY_DELETE",
      actorId,
      entityType: "ATTENDANCE_POLICY",
      entityId: existing._id,
      branchId: existing.branchId,
      before: beforeState,
      after: null,
    });

    return { _id: id, message: "Attendance policy deleted successfully." };
  }

  _toIdFilter(val) {
    if (!val) return val;
    const s = val._id ? val._id.toString() : val.toString();
    if (mongoose.Types.ObjectId.isValid(s)) {
      return { $in: [s, new mongoose.Types.ObjectId(s)] };
    }
    return s;
  }

  /**
   * Resolve the effective attendance policy for an employee and branch.
   * Business Rules:
   * Only an active policy assigned to the requested branch is allowed.
   * Global policies and hard-coded defaults must never silently affect branch calculations.
   */
  async resolveEffectivePolicy(branchId, employeePolicyId = null) {
    // Strict branch isolation: attendance must never inherit another branch's or a global policy.
    if (!branchId || !mongoose.Types.ObjectId.isValid(String(branchId._id || branchId))) {
      throw ApiError.badRequest("A valid branchId is required to resolve the attendance policy.");
    }

    // An employee-specific policy applies only if it is active and belongs to the same branch.
    let branchPolicy = null;
    if (employeePolicyId) {
      const policyIdStr = String(employeePolicyId._id || employeePolicyId);
      if (mongoose.Types.ObjectId.isValid(policyIdStr)) {
        branchPolicy = await AttendancePolicy.findOne({
          _id: this._toIdFilter(policyIdStr),
          branchId: this._toIdFilter(branchId),
          isActive: true,
        });
      }
    }

    if (!branchPolicy) {
      branchPolicy = await AttendancePolicy.findOne({
        branchId: this._toIdFilter(branchId),
        isActive: true,
      });
    }

    if (!branchPolicy) {
      throw ApiError.badRequest(
        "No active attendance policy is configured for this branch. Ask Admin to create or activate a policy for this branch before recording attendance.",
        { code: "BRANCH_ATTENDANCE_POLICY_MISSING", branchId: String(branchId._id || branchId) }
      );
    }

    return typeof branchPolicy.getEffectiveConfig === "function"
      ? branchPolicy.getEffectiveConfig()
      : branchPolicy.toObject();
  }
}

module.exports = new AttendancePolicyService();
