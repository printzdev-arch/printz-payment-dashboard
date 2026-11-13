const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const EmployeeBranchAssignment = require("../models/EmployeeBranchAssignment");
const User = require("../../auth/models/User");
const SequenceHelper = require("../../number-sequences/services/SequenceHelper");
const EncryptionService = require("../../../utils/integrations/EncryptionService");
const ScopeHelper = require("../../../utils/helpers/scopeHelper");
const ApiError = require("../../../utils/errors/ApiError");
const { isStrongPassword, PASSWORD_MESSAGE } = require("../../../utils/validation/fieldRules");
const { calculateAge } = require("../../../utils/helpers/age.util");
const attendanceEmployeeSyncHelper = require("../../attendance/services/attendanceEmployeeSync.helper");
const Role = require("../../auth/models/Role");
const MasterDefault = require("../../settings/models/MasterDefault");
const MasterSettingService = require("../../settings/services/masterSetting.service");
const { roleDisallowsLogin } = require("./roleLogin.helper");
const { expandKeys } = require("../../auth/constants/pageCatalog");

// Roles that grant full access. Only an admin may hand these out.
const ADMIN_TIER_ROLE_CODES = ["SUPER_ADMIN", "ADMIN"];
// Roles that existed before Role Management; they keep working without a page list
const LEGACY_OPEN_ROLE_CODES = ["SUPER_ADMIN", "ADMIN", "BRANCH_MANAGER", "DESIGNER", "OPERATOR"];
// Config value on an employeeRoles master default that means "this role does not sign in"
const NO_LOGIN_FLAG = "NO_LOGIN";

class EmployeeService {
  // ─── Helpers ─────────────────────────────────────────────────────────────

  _extractAuthorizedBranchIds(authContext = {}) {
    return (authContext.authorizedBranchIds || [])
      .filter(Boolean).map((b) => (b._id ? b._id.toString() : b.toString()))
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
              // New roles start with no pages (so no login) until pages are ticked in Role Management.
              // The long-standing roles stay unrestricted.
              ...(LEGACY_OPEN_ROLE_CODES.includes(code) ? {} : { pageAccess: [] }),
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
        pageAccess: Array.isArray(role.pageAccess) ? role.pageAccess : null,
        loginAllowed: typeof role.loginAllowed === "boolean" ? role.loginAllowed : null,
        requiresLogin:
          typeof role.loginAllowed === "boolean"
            ? role.loginAllowed && !(Array.isArray(role.pageAccess) && role.pageAccess.length === 0)
            : Array.isArray(role.pageAccess)
              ? role.pageAccess.length > 0
              : String(item.config || "").trim().toUpperCase() !== NO_LOGIN_FLAG,
      });
    }

    // Roles made in Role Management are not in the master list; offer them too
    const listed = new Set(options.map((o) => o.roleId));
    const custom = await Role.find({ isActive: true, pageAccess: { $exists: true }, code: { $nin: ADMIN_TIER_ROLE_CODES } })
      .sort({ name: 1 })
      .lean();
    for (const role of custom) {
      if (listed.has(String(role._id))) continue;
      options.push({
        roleId: String(role._id),
        code: role.code,
        name: role.name,
        pageAccess: role.pageAccess,
        loginAllowed: typeof role.loginAllowed === "boolean" ? role.loginAllowed : null,
        requiresLogin: (typeof role.loginAllowed === "boolean" ? role.loginAllowed : true) && role.pageAccess.length > 0,
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
    if (dto.pageAccess !== undefined && !this._isSuperAdmin(authContext)) {
      throw ApiError.forbidden("Only an admin can choose an employee's pages.");
    }
    if (!dto.name || !dto.mobile || !dto.email || !dto.branchId) {
      throw ApiError.badRequest("Name, mobile, email, and branchId are required.");
    }

    // The role is optional here: it is set later in Role Setup, together with the employee's pages
    if (dto.roleId) await this._assertRoleAllowed(dto.roleId, authContext);

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
    if (dto.pageAccess !== undefined && !this._isSuperAdmin(authContext)) {
      throw ApiError.forbidden("Only an admin can choose an employee's pages.");
    }
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

    // Pages saved on the person decide whether they can sign in; a changed role only matters when they have no list of their own
    if (dto.pageAccess === null) {
      // Back on the role's pages, so the role's own rule applies
      switchedToNoLoginRole = (await roleDisallowsLogin(existing.roleId)).noLogin;
    } else if (dto.pageAccess !== undefined) {
      switchedToNoLoginRole = dto.pageAccess.length === 0;
    } else if (Array.isArray(existing.pageAccess)) {
      switchedToNoLoginRole = false;
    }

    // A person on a role that does not sign in can only get pages (and so a login) with a reason on record
    if (dto.loginException !== undefined || dto.pageAccess !== undefined || dto.roleId !== undefined) {
      const roleRef = dto.roleId !== undefined ? dto.roleId : existing.roleId;
      const roleNoLogin = roleRef ? (await roleDisallowsLogin(roleRef)).noLogin : false;
      const nextPages = dto.pageAccess !== undefined ? dto.pageAccess : existing.pageAccess;
      const hasPages = Array.isArray(nextPages) && nextPages.length > 0;
      if (roleNoLogin && hasPages) {
        const reason =
          dto.loginException === null
            ? ""
            : dto.loginException
              ? dto.loginException.reason
              : (existing.loginException && existing.loginException.reason) || "";
        if (String(reason || "").trim().length < 5) {
          throw ApiError.validation("This role does not sign in. Give a reason (at least 5 characters) to let this person sign in.");
        }
      } else {
        // No exception is needed any more, so none is kept
        dto.loginException = null;
      }

      // On a role that signs in, pages beyond the role's own need a reason on record
      let needsExtraReason = false;
      if (!roleNoLogin && hasPages && roleRef) {
        const refId = String(roleRef._id || roleRef);
        const roleDoc = mongoose.Types.ObjectId.isValid(refId) ? await Role.findById(refId).select("pageAccess").lean() : null;
        if (roleDoc) {
          const rolePagesList = expandKeys(Array.isArray(roleDoc.pageAccess) ? roleDoc.pageAccess : []);
          const extras = expandKeys(nextPages).filter((k) => !rolePagesList.includes(k));
          if (extras.length > 0) {
            needsExtraReason = true;
            const reason =
              dto.extraPages === null
                ? ""
                : dto.extraPages
                  ? dto.extraPages.reason
                  : (existing.extraPages && existing.extraPages.reason) || "";
            if (String(reason || "").trim().length < 5) {
              throw ApiError.validation("Pages beyond the role's need a reason (at least 5 characters).");
            }
          }
        }
      }
      if (!needsExtraReason) dto.extraPages = null;
    }

    if (dto.leavingDate) {
      const joined = new Date(existing.joiningDate);
      if (new Date(dto.leavingDate) < joined) {
        throw ApiError.badRequest("Leaving date cannot be earlier than joining date.");
      }
    }

    if (dto.dateOfBirth !== undefined) {
      dto.dateOfBirth = this._normalizeDateOfBirth(dto.dateOfBirth);
      if (dto.dateOfBirth && existing.joiningDate && dto.dateOfBirth > new Date(existing.joiningDate)) {
        throw ApiError.badRequest("Date of birth cannot be after the joining date.");
      }
    }

    const previousBranch = String((existing.branchId && (existing.branchId._id || existing.branchId)) || "");

    const updated = await this._runInTransaction(async (session) => {
      const employee = session
        ? await Employee.findById(id).session(session)
        : await Employee.findById(id);

      if (!employee) return null;

      const { branchId, roleId, pageAccess, loginException, extraPages, ...otherFields } = dto;
      if (pageAccess === null) employee.pageAccess = undefined;
      else if (pageAccess !== undefined) employee.pageAccess = pageAccess;
      if (extraPages === null) {
        employee.extraPages = undefined;
      } else if (extraPages && extraPages.reason) {
        let who = "";
        try {
          const u = modifiedByUserId ? await User.findById(modifiedByUserId).select("name email").lean() : null;
          who = (u && (u.name || u.email)) || "";
        } catch (_) {
          who = "";
        }
        employee.extraPages = { reason: extraPages.reason, setBy: modifiedByUserId || null, setByName: who, setAt: new Date() };
      }
      if (loginException === null) {
        employee.loginException = undefined;
      } else if (loginException && loginException.reason) {
        let setByName = "";
        try {
          const who = modifiedByUserId ? await User.findById(modifiedByUserId).select("name email").lean() : null;
          setByName = (who && (who.name || who.email)) || "";
        } catch (_) {
          setByName = "";
        }
        employee.loginException = { reason: loginException.reason, setBy: modifiedByUserId || null, setByName, setAt: new Date() };
      }
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

    // A new branch is also written to the person's login (the login keeps its own copy of the branch)
    const newBranch = String((updated.branchId && (updated.branchId._id || updated.branchId)) || "");
    if (newBranch && newBranch !== previousBranch) {
      const Branch = require("../../branches/models/Branch");
      const branchDoc = mongoose.Types.ObjectId.isValid(newBranch) ? await Branch.findById(newBranch).select("name").lean() : null;
      await User.updateMany(
        { employeeId: { $in: [updated._id, String(updated._id)] } },
        { $set: { branchId: newBranch, branchIds: [newBranch], branch: (branchDoc && branchDoc.name) || "" } }
      );
    }

    // A role that never signs in (operator) takes the person's login away
    if (switchedToNoLoginRole) {
      await User.updateMany(
        { employeeId: { $in: [updated._id, String(updated._id)] } },
        { $set: { status: "DISABLED", isActive: false } }
      );
    }

    await this._syncOperatorProfile(updated);

    return updated;
  }

  /**
   * Sets a new password on the employee's login. The employee must be in a branch the caller
   * may manage, and only an admin may change the password of an admin-level login.
   */
  async resetLoginPassword(id, password, authContext = {}) {
    const employee = await this.getEmployeeById(id, authContext);

    const newPassword = String(password || "");
    if (!isStrongPassword(newPassword)) throw ApiError.badRequest(PASSWORD_MESSAGE);

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

    return result;
  }
}

module.exports = new EmployeeService();
