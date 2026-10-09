const mongoose = require("mongoose");
const IEmployeeRepository = require("../../../../domain/repositories/IEmployeeRepository");
const Employee = require("../models/Employee");
const EmployeeBranchAssignment = require("../models/EmployeeBranchAssignment");
const SequenceHelper = require("../../../../shared/utils/common/SequenceHelper");
const User = require("../models/User");
const EncryptionService = require("../../../security/EncryptionService");
const ErrorHelper = require("../../../../shared/errors/ErrorHelper");
const ScopeHelper = require("../../../../shared/helpers/scopeHelper");

class MongoEmployeeRepository extends IEmployeeRepository {
  // ─── Helpers ─────────────────────────────────────────────────────────────

  _extractAuthorizedBranchIds(authContext = {}) {
    return (authContext.authorizedBranchIds || [])
      .map((b) => (b._id ? b._id.toString() : b.toString()))
      .filter(Boolean);
  }

  _isSuperAdmin(authContext = {}) {
    return Boolean(authContext.isSuperAdmin);
  }

  /**
   * Validates that a target branchId is within the caller's authorized branches.
   * Throws 403 if not. No-op for super-admins.
   */
  _assertBranchAuthorized(targetBranchId, authContext = {}) {
    if (this._isSuperAdmin(authContext)) return;
    const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);

    if (authorizedBranchIds.length === 0) {
      throw ErrorHelper.forbidden("Access denied: You have no authorized branch assignments.");
    }

    if (targetBranchId) {
      const tStr = targetBranchId._id
        ? targetBranchId._id.toString()
        : targetBranchId.toString();
      if (!authorizedBranchIds.includes(tStr)) {
        throw ErrorHelper.forbidden(
          "Access denied: You are not authorized for the specified branch."
        );
      }
    }
  }

  // ─── findAll ─────────────────────────────────────────────────────────────

  async findAll(
    { scopeFilter = {}, clientFilters = {} } = {},
    pagination = { page: 1, limit: 50 },
    authContext = {}
  ) {
    const isSuperAdmin = this._isSuperAdmin(authContext);
    const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);

    // Build the scope constraint
    let branchConstraint = {};
    if (!isSuperAdmin) {
      if (authorizedBranchIds.length === 0) {
        // Fail closed: no authorized branches
        return { employees: [], total: 0, page: 1, pages: 1 };
      }

      const validObjectIds = authorizedBranchIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      branchConstraint = {
        branchId: { $in: [...authorizedBranchIds, ...validObjectIds] },
      };
    }

    // Build client-supplied non-auth filters (status, search only)
    const clientQuery = {};
    if (clientFilters.employmentStatus) {
      clientQuery.employmentStatus = clientFilters.employmentStatus;
    }
    if (clientFilters.search && typeof clientFilters.search === "string") {
      const escaped = clientFilters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      clientQuery.$or = [
        { name: new RegExp(escaped, "i") },
        { employeeCode: new RegExp(escaped, "i") },
        { email: new RegExp(escaped, "i") },
        { mobile: new RegExp(escaped, "i") },
      ];
    }

    // Merge: scope constraint AND client query
    const finalQuery = ScopeHelper.combineFilters(branchConstraint, clientQuery);

    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.max(1, parseInt(pagination.limit, 10) || 50);
    const skip = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      Employee.find(finalQuery)
        .populate("branchId", "name code location")
        .populate("roleId", "code name")
        .populate("reportingManagerId", "name employeeCode email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Employee.countDocuments(finalQuery),
    ]);

    return {
      employees,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  // ─── findById ─────────────────────────────────────────────────────────────

  async findById(id, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;

    const employee = await Employee.findById(id)
      .populate("branchId", "name code location")
      .populate("roleId", "code name grants")
      .populate("reportingManagerId", "name employeeCode email")
      .lean();

    if (!employee) return null;

    // Scope check for non-super-admins
    if (!this._isSuperAdmin(authContext)) {
      const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);

      if (authorizedBranchIds.length === 0) return null;

      if (!employee.branchId) {
        // branchId null → not accessible to branch-scoped user
        return null;
      }

      const empBranchStr = employee.branchId._id
        ? employee.branchId._id.toString()
        : employee.branchId.toString();

      if (!authorizedBranchIds.includes(empBranchStr)) {
        return null; // Return null (→ 404) to prevent branch enumeration
      }
    }

    return employee;
  }

  // ─── findByCode / findByEmail ─────────────────────────────────────────────

  async findByCode(code) {
    if (!code) return null;
    return Employee.findOne({ employeeCode: code.toUpperCase().trim() }).lean();
  }

  async findByEmail(email) {
    if (!email) return null;
    return Employee.findOne({ email: email.toLowerCase().trim() }).lean();
  }

  // ─── getBranchAssignments ─────────────────────────────────────────────────

  async getBranchAssignments(employeeId) {
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) return [];
    return EmployeeBranchAssignment.find({ employeeId })
      .populate("branchId", "name code")
      .populate("roleId", "name code")
      .populate("createdBy", "name email")
      .sort({ fromDate: -1 })
      .lean();
  }

  // ─── createWithAssignment ─────────────────────────────────────────────────

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

  // ─── createWithAssignment ─────────────────────────────────────────────────

  async createWithAssignment(employeeData, createdByUserId, authContext = {}) {
    // Enforce: target branchId must be in manager's authorized branches
    this._assertBranchAuthorized(employeeData.branchId, authContext);

    return this._runInTransaction(async (session) => {
      // 1. Generate sequential employee code atomically via Common SequenceHelper
      const employeeCode = await SequenceHelper.next("EMPLOYEE");

      // 2. Prepare and insert Employee
      const employeePayload = {
        ...employeeData,
        employeeCode,
        joiningDate: employeeData.joiningDate ? new Date(employeeData.joiningDate) : new Date(),
        employmentStatus: employeeData.employmentStatus || "ACTIVE",
        isActive: employeeData.isActive !== undefined ? employeeData.isActive : true,
        bankDetails: employeeData.bankDetails
          ? {
              accountHolderName: employeeData.bankDetails.accountHolderName || "",
              accountNumberEncrypted: employeeData.bankDetails.accountNumber
                ? EncryptionService.encrypt(employeeData.bankDetails.accountNumber)
                : "",
              bankName: employeeData.bankDetails.bankName || "",
              ifscCode: employeeData.bankDetails.ifscCode || "",
              bankBranch: employeeData.bankDetails.bankBranch || "",
            }
          : null,
      };

      const [employee] = session
        ? await Employee.create([employeePayload], { session })
        : [await Employee.create(employeePayload)];

      // 3. Create initial primary assignment
      const assignmentPayload = {
        employeeId: employee._id,
        branchId: employee.branchId,
        roleId: employee.roleId,
        fromDate: employee.joiningDate,
        toDate: null,
        isPrimary: true,
        createdBy: createdByUserId || new mongoose.Types.ObjectId(),
      };

      if (session) {
        await EmployeeBranchAssignment.create([assignmentPayload], { session });
      } else {
        await EmployeeBranchAssignment.create(assignmentPayload);
      }

      return employee;
    });
  }

  // ─── updateWithTransfer ───────────────────────────────────────────────────

  async updateWithTransfer(id, updateData, modifiedByUserId, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;

    return this._runInTransaction(async (session) => {
      const employee = session
        ? await Employee.findById(id).session(session)
        : await Employee.findById(id);

      if (!employee) return null;

      // Scope check: the existing employee must be in an authorized branch
      if (!this._isSuperAdmin(authContext)) {
        const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
        if (authorizedBranchIds.length === 0) {
          throw ErrorHelper.forbidden("Access denied: You have no authorized branch assignments.");
        }
        const existingBranchStr = employee.branchId
          ? (employee.branchId._id ? employee.branchId._id.toString() : employee.branchId.toString())
          : null;
        if (!existingBranchStr || !authorizedBranchIds.includes(existingBranchStr)) {
          throw ErrorHelper.forbidden(
            "Access denied: You are not authorized to modify this employee."
          );
        }
      }

      const { branchId, roleId, ...otherFields } = updateData;
      const isBranchTransfer =
        branchId && branchId.toString() !== (employee.branchId || "").toString();
      const now = new Date();

      if (isBranchTransfer) {
        // Validate the transfer destination branch is also authorized
        this._assertBranchAuthorized(branchId, authContext);

        // Close current active assignment
        const updateOpt = session ? { session } : {};
        await EmployeeBranchAssignment.updateMany(
          { employeeId: id, toDate: null },
          { $set: { toDate: now, isPrimary: false } },
          updateOpt
        );

        // Create new active branch assignment
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
  }

  // ─── deactivate ───────────────────────────────────────────────────────────

  async deactivate(id, { reason, leftCompany }, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;

    // Scope check before deactivation
    const existingEmployee = await Employee.findById(id).lean();
    if (!existingEmployee) return null;

    if (!this._isSuperAdmin(authContext)) {
      const authorizedBranchIds = this._extractAuthorizedBranchIds(authContext);
      if (authorizedBranchIds.length === 0) {
        throw ErrorHelper.forbidden("Access denied: You have no authorized branch assignments.");
      }
      const empBranchStr = existingEmployee.branchId
        ? existingEmployee.branchId.toString()
        : null;
      if (!empBranchStr || !authorizedBranchIds.includes(empBranchStr)) {
        throw ErrorHelper.forbidden(
          "Access denied: You are not authorized to deactivate this employee."
        );
      }
    }

    return this._runInTransaction(async (session) => {
      const status = leftCompany ? "LEFT" : "INACTIVE";
      const now = new Date();
      const opt = session ? { session } : {};

      // 1. Update Employee document
      const employee = await Employee.findByIdAndUpdate(
        id,
        {
          $set: {
            employmentStatus: status,
            isActive: false,
            leavingDate: leftCompany ? now : null,
          },
        },
        { new: true, ...opt }
      );

      if (!employee) return null;

      // 2. Cascade lock linked user accounts
      await User.updateMany(
        { employeeId: id },
        { $set: { status: "DISABLED", isActive: false } },
        opt
      );

      // 3. Close active branch assignments
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
        reason,
      };
    });
  }
}

module.exports = new MongoEmployeeRepository();
