const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const EmployeeBranchAssignment = require("../models/EmployeeBranchAssignment");
const User = require("../../auth/models/User");
const SequenceHelper = require("../../number-sequences/services/SequenceHelper");
const EncryptionService = require("../../../utils/integrations/EncryptionService");
const AuditHelper = require("../../audit-logs/services/AuditHelper");
const ScopeHelper = require("../../../utils/helpers/scopeHelper");
const ApiError = require("../../../utils/errors/ApiError");
const { calculateAge } = require("../../../utils/helpers/age.util");
const attendanceEmployeeSyncHelper = require("../../attendance/services/attendanceEmployeeSync.helper");
const Role = require("../../auth/models/Role");
const MasterDefault = require("../../settings/models/MasterDefault");
const MasterSettingService = require("../../settings/services/masterSetting.service");
const { roleDisallowsLogin } = require("./roleLogin.helper");

// Roles that grant full access. Only an admin may hand these out.
const ADMIN_TIER_ROLE_CODES = ["SUPER_ADMIN", "ADMIN"];
// Config value on an employeeRoles master default that means "this role does not sign in"
const NO_LOGIN_FLAG = "NO_LOGIN";

class EmployeeService {
  // ─── Helpers ─────────────────────────────────────────────────────────────

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
    const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);

    if (authorizedBranchIds.length === 0) {
      throw ApiError.forbidden("Access denied: You have no authorized branch assignments.");
    }

    if (targetBranchId) {
      const tStr = targetBranchId._id
        ? targetBranchId._id.toString()
        : targetBranchId.toString();
      if (!authorizedBranchIds.includes(tStr)) {
        throw ApiError.forbidden(
          "Access denied: You are not authorized for the specified branch."
        );
      }
    }
  }

  // Returns a Date, or null to clear. Rejects unparseable, future and pre-1900 dates.
  _normalizeDateOfBirth(value) {
    if (value === undefined || value === null || value === "") return null;
    const dob = new Date(value);
    if (Number.isNaN(dob.getTime())) {
      throw ApiError.badRequest("Date of birth is not a valid date.");
    }
    if (dob > new Date()) {
      throw ApiError.badRequest("Date of birth cannot be in the future.");
    }
    if (dob.getUTCFullYear() < 1900) {
      throw ApiError.badRequest("Date of birth is not realistic.");
    }
    return dob;
  }

  // Age is derived from dateOfBirth and never stored.
  _withAge(employee) {
    if (!employee) return employee;
    return { ...employee, age: calculateAge(employee.dateOfBirth) };
  }

  // A production operator linked to this employee copies its name, phone and branch.
  // Keep that copy in step; it must never block the employee change itself.
  async _syncLinkedOperator(employee) {
    try {
      const ProductionOperator = mongoose.models.ProductionOperator;
      if (!ProductionOperator || !employee) return;
      const set = {
        name: employee.name,
        phone: employee.mobile || "",
        isActive: employee.isActive !== false && employee.employmentStatus === "ACTIVE",
      };
      const branch = employee.branchId && (employee.branchId._id || employee.branchId);
      if (branch && mongoose.Types.ObjectId.isValid(String(branch))) set.branchId = String(branch);
      await ProductionOperator.updateMany({ employeeId: employee._id }, { $set: set });
    } catch (err) {
      console.error("[EmployeeService] operator sync failed:", err.message);
    }
  }

  // An employee with the Operator role gets a production-operator entry (what the production
  // screens assign work to), created here so operators are only ever added in Employees.
  // An existing entry is kept in step; it is switched off if the role is changed to another one.
  // It must never block the employee change itself.
  async _syncOperatorProfile(employee) {
    try {
      const ProductionOperator = mongoose.models.ProductionOperator;
      if (!ProductionOperator || !employee) return;

      let roleCode = "";
      const roleRef = employee.roleId && (employee.roleId._id || employee.roleId);
      if (roleRef && mongoose.Types.ObjectId.isValid(String(roleRef))) {
        const role = await Role.findById(String(roleRef)).select("code").lean();
        roleCode = role ? String(role.code).toUpperCase() : "";
      }
      const isOperatorRole = roleCode === "OPERATOR";
      const employeeActive = employee.isActive !== false && employee.employmentStatus === "ACTIVE";

      const existing = await ProductionOperator.findOne({ employeeId: employee._id });
      if (!existing && !isOperatorRole) return;

      const branch = employee.branchId && (employee.branchId._id || employee.branchId);
      const fields = {
        name: employee.name,
        phone: employee.mobile || "",
        // A role that is set and is not Operator means they no longer do operator work
        isActive: employeeActive && (isOperatorRole || !roleCode),
      };
      if (branch && mongoose.Types.ObjectId.isValid(String(branch))) fields.branchId = String(branch);

      if (existing) await ProductionOperator.updateOne({ _id: existing._id }, { $set: fields });
      else await ProductionOperator.create({ ...fields, employeeId: employee._id });
    } catch (err) {
      console.error("[EmployeeService] operator profile sync failed:", err.message);
    }
  }

  async _runInTransaction(workFn) {
    const isReplicaSet = Boolean(
      mongoose.connection.client?.topology?.description?.type === "ReplicaSetWithPrimary" ||
      (mongoose.connection.client?.topology?.description?.servers && mongoose.connection.client.topology.description.servers.size > 1)
    );

    if (isReplicaSet) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const result = await workFn(session);
        await session.commitTransaction();
        return result;
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    } else {
      return workFn(null);
    }
  }

  // ─── Queries & Lookups ───────────────────────────────────────────────────

  async findByCode(code) {
    if (!code) return null;
    return Employee.findOne({ employeeCode: code.toUpperCase().trim() }).lean();
  }

  async findByEmail(email) {
    if (!email) return null;
    return Employee.findOne({ email: email.toLowerCase().trim() }).lean();
  }

  async getBranchAssignments(employeeId) {
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) return [];
    return EmployeeBranchAssignment.find({ employeeId })
      .populate("branchId", "name code")
      .populate("roleId", "name code")
      .populate("createdBy", "name email")
      .sort({ fromDate: -1 })
      .lean();
  }

  /**
   * Roles an employee can be given, from the "Employee Roles" master default.
   * Each entry is { roleId, code, name, requiresLogin }. A code that has no role record yet is
   * created here (with no permissions) so a role added in master defaults works straight away;
   * its permissions are then set in Roles & Permissions. Admin-level roles are only offered to admins.
   */
  async getRoleOptions(authContext = {}) {
    await MasterSettingService.ensureDefaultsSeeded();
    const items = await MasterDefault.find({ category: "employeeRoles", isActive: true })
      .sort({ order: 1, name: 1 })
      .lean();

    const options = [];
    for (const item of items) {
      const code = String(item.code || "").trim().toUpperCase();
      if (!code) continue;
      if (ADMIN_TIER_ROLE_CODES.includes(code) && !this._isSuperAdmin(authContext)) continue;

      let role = await Role.findOne({ code }).lean();
      if (!role) {
        const created = await Role.findOneAndUpdate(
          { code },
          {
            $setOnInsert: {
              code,
              name: item.name,
              description: `${item.name} (created from Employee Roles)`,
              grants: [],
              isSystem: false,
              isActive: true,
            },
          },
          { upsert: true, new: true }
        );
        role = created.toObject();
      }
      if (role.isActive === false) continue;

      options.push({
        roleId: String(role._id),
        code,
        name: item.name,
        requiresLogin: String(item.config || "").trim().toUpperCase() !== NO_LOGIN_FLAG,
      });
    }
    return options;
  }

  // The chosen role must be one the caller is allowed to hand out (the master default list)
  async _assertRoleAllowed(roleId, authContext = {}) {
    if (!roleId || !mongoose.Types.ObjectId.isValid(String(roleId))) {
      throw ApiError.badRequest("Select a valid role.");
    }
    const options = await this.getRoleOptions(authContext);
    if (!options.some((o) => o.roleId === String(roleId))) {
      throw ApiError.badRequest("That role is not available. Pick one from the list.");
    }
  }

  // ─── Business Methods ────────────────────────────────────────────────────

  // options.skipOperatorProfile: for a migration that links an operator entry that already exists
  async createEmployee(dto, createdByUserId, authContext = {}, options = {}) {
    if (!dto.name || !dto.mobile || !dto.email || !dto.branchId) {
      throw ApiError.badRequest("Name, mobile, email, and branchId are required.");
    }

    // Role decides access and whether a login is needed, so every new employee has one
    await this._assertRoleAllowed(dto.roleId, authContext);

    const joiningDate = dto.joiningDate ? new Date(dto.joiningDate) : new Date();
    dto.joiningDate = joiningDate;

    if (!/^\d{10}$/.test(String(dto.mobile).trim())) {
      throw ApiError.badRequest("Mobile number must be exactly 10 digits.");
    }

    const existingEmail = await this.findByEmail(dto.email);
    if (existingEmail) {
      throw ApiError.conflict(`Employee with email '${dto.email}' already exists.`);
    }

    // 1. Validate Leaving Date
    if (dto.leavingDate) {
      const leavingDate = new Date(dto.leavingDate);
      if (leavingDate < joiningDate) {
        throw ApiError.badRequest("Leaving date cannot be earlier than joining date.");
      }
    }

    dto.dateOfBirth = this._normalizeDateOfBirth(dto.dateOfBirth);
    if (dto.dateOfBirth && dto.dateOfBirth > joiningDate) {
      throw ApiError.badRequest("Date of birth cannot be after the joining date.");
    }

    // 2. Validate Reporting Manager
    if (dto.reportingManagerId) {
      if (!mongoose.Types.ObjectId.isValid(dto.reportingManagerId)) {
        throw ApiError.badRequest("Invalid reportingManagerId format.");
      }
      const manager = await Employee.findById(dto.reportingManagerId);
      if (!manager) {
        throw ApiError.badRequest("Reporting manager does not exist.");
      }
      if (manager.employmentStatus !== "ACTIVE" || !manager.isActive) {
        throw ApiError.badRequest("Reporting manager must be an ACTIVE employee.");
      }
    }

    // 5. Enforce: target branchId must be in manager's authorized branches
    this._assertBranchAuthorized(dto.branchId, authContext);

    // 6. Create employee and initial branch assignment in transaction
    const employee = await this._runInTransaction(async (session) => {
      const employeeCode = await SequenceHelper.next("EMPLOYEE");

      const employeePayload = {
        ...dto,
        employeeCode,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : new Date(),
        employmentStatus: dto.employmentStatus || "ACTIVE",
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        bankDetails: dto.bankDetails
          ? {
              accountHolderName: dto.bankDetails.accountHolderName || "",
              accountNumberEncrypted: dto.bankDetails.accountNumber
                ? EncryptionService.encrypt(dto.bankDetails.accountNumber)
                : "",
              bankName: dto.bankDetails.bankName || "",
              ifscCode: dto.bankDetails.ifscCode || "",
              bankBranch: dto.bankDetails.bankBranch || "",
            }
          : null,
      };

      const [newEmp] = session
        ? await Employee.create([employeePayload], { session })
        : [await Employee.create(employeePayload)];

      const assignmentPayload = {
        employeeId: newEmp._id,
        branchId: newEmp.branchId,
        roleId: newEmp.roleId,
        fromDate: newEmp.joiningDate,
        toDate: null,
        isPrimary: true,
        createdBy: createdByUserId || new mongoose.Types.ObjectId(),
      };

      if (session) {
        await EmployeeBranchAssignment.create([assignmentPayload], { session });
      } else {
        await EmployeeBranchAssignment.create(assignmentPayload);
      }

      return newEmp;
    });

    // 7. Audit Log
    await AuditHelper.log({
      action: "EMPLOYEE_CREATE",
      actorId: createdByUserId,
      entityType: "EMPLOYEE",
      entityId: employee._id,
      branchId: employee.branchId,
      after: {
        _id: employee._id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        email: employee.email,
        mobile: employee.mobile,
        branchId: employee.branchId,
      },
    });

    if (!options.skipOperatorProfile) await this._syncOperatorProfile(employee);

    return employee;
  }

  async getEmployees({ scopeFilter = {}, clientFilters = {} } = {}, pagination = {}, authContext = {}) {
    const isSuperAdmin = this._isSuperAdmin(authContext);
    const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);

    let branchConstraint = {};
    if (!isSuperAdmin) {
      if (authorizedBranchIds.length === 0) {
        return { employees: [], total: 0, page: 1, pages: 1 };
      }

      const validObjectIds = authorizedBranchIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      branchConstraint = {
        branchId: { $in: [...authorizedBranchIds, ...validObjectIds] },
      };
    }

    const clientQuery = {};
    // Several conditions can each need an $or (branch, search), so they are combined with $and
    const andClauses = [];
    if (clientFilters.branchId) {
      await attendanceEmployeeSyncHelper.ensureBranchMembersAsEmployees(clientFilters.branchId);
      if (mongoose.Types.ObjectId.isValid(clientFilters.branchId)) {
        andClauses.push({
          $or: [
            { branchId: clientFilters.branchId },
            { branchId: new mongoose.Types.ObjectId(clientFilters.branchId) },
          ],
        });
      } else {
        clientQuery.branchId = clientFilters.branchId;
      }
    }
    // Same two-type match for the other id fields (they are stored as strings or ObjectIds)
    const matchIdField = (field, value) => {
      if (!value) return;
      if (mongoose.Types.ObjectId.isValid(value)) {
        andClauses.push({ $or: [{ [field]: String(value) }, { [field]: new mongoose.Types.ObjectId(value) }] });
      } else {
        clientQuery[field] = value;
      }
    };
    matchIdField("roleId", clientFilters.roleId);
    if (clientFilters.employmentStatus) {
      clientQuery.employmentStatus = clientFilters.employmentStatus;
    }
    if (clientFilters.isActive !== undefined) {
      clientQuery.isActive = clientFilters.isActive;
    }
    if (clientFilters.search && typeof clientFilters.search === "string") {
      const escaped = clientFilters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      andClauses.push({
        $or: [
          { name: new RegExp(escaped, "i") },
          { employeeCode: new RegExp(escaped, "i") },
          { email: new RegExp(escaped, "i") },
          { mobile: new RegExp(escaped, "i") },
        ],
      });
    }
    if (andClauses.length) clientQuery.$and = andClauses;

    const finalQuery = ScopeHelper.combineFilters(branchConstraint, clientQuery);

    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.max(1, parseInt(pagination.limit, 10) || 50);
    const skip = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      Employee.find(finalQuery)
        .populate("branchId", "name code location")
        .populate("roleId", "code name")
        .populate("reportingManagerId", "name employeeCode email")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Employee.countDocuments(finalQuery),
    ]);

    // Flag which employees already have a login, so the screen can offer "create login" only when needed
    const ids = employees.map((e) => e._id);
    const linkedUsers = ids.length
      ? await User.find({
          employeeId: { $in: [...ids, ...ids.map(String)] },
          status: { $ne: "DISABLED" },
        })
          .select("employeeId")
          .lean()
      : [];
    const withLogin = new Set(linkedUsers.map((u) => String(u.employeeId)));

    return {
      employees: employees.map((e) => ({ ...this._withAge(e), hasLogin: withLogin.has(String(e._id)) })),
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  async getEmployeeById(id, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Employee not found or access denied.");
    }

    const employee = await Employee.findById(id)
      .populate("branchId", "name code location")
      .populate("roleId", "code name grants")
      .populate("reportingManagerId", "name employeeCode email")
      .lean();

    if (!employee) {
      throw ApiError.notFound("Employee not found or access denied.");
    }

    if (!this._isSuperAdmin(authContext)) {
      const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
      if (authorizedBranchIds.length === 0 || !employee.branchId) {
        throw ApiError.notFound("Employee not found or access denied.");
      }

      const empBranchStr = employee.branchId._id
        ? employee.branchId._id.toString()
        : employee.branchId.toString();

      if (!authorizedBranchIds.includes(empBranchStr)) {
        throw ApiError.notFound("Employee not found or access denied.");
      }
    }

    return this._withAge(employee);
  }

  async updateEmployee(id, dto, modifiedByUserId, authContext = {}) {
    const existing = await this.getEmployeeById(id, authContext);
    if (!existing) {
      throw ApiError.notFound("Employee not found or access denied.");
    }

    if (dto.email && dto.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailTaken = await this.findByEmail(dto.email);
      if (emailTaken && emailTaken._id.toString() !== id) {
        throw ApiError.conflict(`Employee with email '${dto.email}' already exists.`);
      }
    }

    // Only a changed role is checked, so employees on an older role can still be edited
    let switchedToNoLoginRole = false;
    if (dto.roleId !== undefined) {
      const current = existing.roleId && (existing.roleId._id || existing.roleId);
      if (String(dto.roleId || "") !== String(current || "")) {
        await this._assertRoleAllowed(dto.roleId, authContext);
        switchedToNoLoginRole = (await roleDisallowsLogin(dto.roleId)).noLogin;
      }
    }

    if (dto.dateOfBirth !== undefined) {
      dto.dateOfBirth = this._normalizeDateOfBirth(dto.dateOfBirth);
      if (dto.dateOfBirth && existing.joiningDate && dto.dateOfBirth > new Date(existing.joiningDate)) {
        throw ApiError.badRequest("Date of birth cannot be after the joining date.");
      }
    }

    const updated = await this._runInTransaction(async (session) => {
      const employee = session
        ? await Employee.findById(id).session(session)
        : await Employee.findById(id);

      if (!employee) return null;

      const { branchId, roleId, ...otherFields } = dto;
      const isBranchTransfer =
        branchId && branchId.toString() !== (employee.branchId || "").toString();
      const now = new Date();

      if (isBranchTransfer) {
        this._assertBranchAuthorized(branchId, authContext);

        const updateOpt = session ? { session } : {};
        await EmployeeBranchAssignment.updateMany(
          { employeeId: id, toDate: null, assignmentType: { $ne: "TEMPORARY" } },
          { $set: { toDate: now, isPrimary: false } },
          updateOpt
        );

        const assignmentPayload = {
          employeeId: id,
          branchId,
          roleId: roleId || employee.roleId,
          fromDate: now,
          toDate: null,
          isPrimary: true,
          createdBy: modifiedByUserId || new mongoose.Types.ObjectId(),
        };

        if (session) {
          await EmployeeBranchAssignment.create([assignmentPayload], { session });
        } else {
          await EmployeeBranchAssignment.create(assignmentPayload);
        }

        employee.branchId = branchId;
      }

      if (roleId !== undefined) employee.roleId = roleId;
      Object.assign(employee, otherFields);

      if (session) {
        await employee.save({ session });
      } else {
        await employee.save();
      }

      return employee;
    });

    // A role that never signs in (operator) takes the person's login away
    if (switchedToNoLoginRole) {
      await User.updateMany(
        { employeeId: { $in: [updated._id, String(updated._id)] } },
        { $set: { status: "DISABLED", isActive: false } }
      );
    }

    await this._syncOperatorProfile(updated);

    await AuditHelper.log({
      action: "EMPLOYEE_UPDATE",
      actorId: modifiedByUserId,
      entityType: "EMPLOYEE",
      entityId: id,
      branchId: updated.branchId,
      before: existing,
      after: updated,
    });

    return updated;
  }

  /**
   * Sets a new password on the employee's login. The employee must be in a branch the caller
   * may manage, and only an admin may change the password of an admin-level login.
   */
  async resetLoginPassword(id, password, authContext = {}) {
    const employee = await this.getEmployeeById(id, authContext);

    const newPassword = String(password || "");
    if (newPassword.length < 6) throw ApiError.badRequest("Password must be at least 6 characters.");

    const user = await User.findOne({
      employeeId: { $in: [employee._id, String(employee._id)] },
      status: { $ne: "DISABLED" },
    });
    if (!user) throw ApiError.notFound("This employee has no active login.");

    const roleCode = String((employee.roleId && employee.roleId.code) || user.role || "").toUpperCase();
    if ((ADMIN_TIER_ROLE_CODES.includes(roleCode) || roleCode === "SUPER_ADMIN") && !this._isSuperAdmin(authContext)) {
      throw ApiError.forbidden("Only an admin can change the password of an admin account.");
    }

    user.password = newPassword; // hashed by the user model on save
    await user.save();
    require("../../../utils/helpers/authCache").invalidateUser(String(user._id));

    await AuditHelper.log({
      action: "EMPLOYEE_LOGIN_PASSWORD_RESET",
      actorId: authContext.userId,
      entityType: "EMPLOYEE",
      entityId: employee._id,
      branchId: employee.branchId && (employee.branchId._id || employee.branchId),
      after: { employeeCode: employee.employeeCode, userId: user._id },
    });

    return { employeeId: String(employee._id), userId: String(user._id) };
  }

  async deactivateEmployee(id, dto, authContext = {}) {
    const existing = await this.getEmployeeById(id, authContext);
    if (!existing) {
      throw ApiError.notFound("Employee not found or access denied.");
    }

    const result = await this._runInTransaction(async (session) => {
      const status = dto.leftCompany ? "LEFT" : "INACTIVE";
      const now = new Date();
      const opt = session ? { session } : {};

      const employee = await Employee.findByIdAndUpdate(
        id,
        {
          $set: {
            employmentStatus: status,
            isActive: false,
            leavingDate: dto.leftCompany ? now : null,
          },
        },
        { new: true, ...opt }
      );

      if (!employee) return null;

      await User.updateMany(
        { employeeId: id },
        { $set: { status: "DISABLED", isActive: false } },
        opt
      );

      await EmployeeBranchAssignment.updateMany(
        { employeeId: id, toDate: null },
        { $set: { toDate: now, isPrimary: false } },
        opt
      );

      return {
        employeeId: id,
        employeeCode: employee.employeeCode,
        status,
        deactivatedAt: now,
        reason: dto.reason,
      };
    });

    // A deactivated employee can no longer be given operator work
    if (result) {
      await this._syncLinkedOperator({
        _id: id,
        name: existing.name,
        mobile: existing.mobile,
        branchId: existing.branchId,
        isActive: false,
        employmentStatus: result.status,
      });
    }

    await AuditHelper.log({
      action: "EMPLOYEE_DEACTIVATE",
      actorId: authContext.userId,
      entityType: "EMPLOYEE",
      entityId: id,
      branchId: existing.branchId,
      after: result,
    });

    return result;
  }
}

module.exports = new EmployeeService();
