const mongoose = require("mongoose");
const Department = require("../models/common/Department");
const Designation = require("../models/common/Designation");
const Employee = require("../models/Employee");
const EmployeeBranchAssignment = require("../models/EmployeeBranchAssignment");
const User = require("../models/User");
const SequenceHelper = require("../utils/helpers/common/SequenceHelper");
const EncryptionService = require("../utils/integrations/EncryptionService");
const AuditHelper = require("../utils/helpers/common/AuditHelper");
const ScopeHelper = require("../utils/helpers/scopeHelper");
const ApiError = require("../utils/ApiError");

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

  // ─── Business Methods ────────────────────────────────────────────────────

  async createEmployee(dto, createdByUserId, authContext = {}) {
    if (!dto.name || !dto.mobile || !dto.email || !dto.branchId) {
      throw ApiError.badRequest("Name, mobile, email, and branchId are required.");
    }

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

    // 2. Validate Department
    if (dto.departmentId) {
      if (!mongoose.Types.ObjectId.isValid(dto.departmentId)) {
        throw ApiError.badRequest("Invalid departmentId format.");
      }
      const departmentDoc = await Department.findById(dto.departmentId);
      if (!departmentDoc || !departmentDoc.isActive) {
        throw ApiError.badRequest("Department does not exist or is inactive.");
      }
    }

    // 3. Validate Designation
    if (dto.designationId) {
      if (!mongoose.Types.ObjectId.isValid(dto.designationId)) {
        throw ApiError.badRequest("Invalid designationId format.");
      }
      const designationDoc = await Designation.findById(dto.designationId);
      if (!designationDoc || !designationDoc.isActive) {
        throw ApiError.badRequest("Designation does not exist or is inactive.");
      }

      if (dto.departmentId && designationDoc.departmentId) {
        if (designationDoc.departmentId.toString() !== dto.departmentId.toString()) {
          throw ApiError.badRequest("Selected designation does not belong to the specified department.");
        }
      }
    }

    // 4. Validate Reporting Manager
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
        departmentId: employee.departmentId,
      },
    });

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

    return employee;
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

    if (dto.departmentId) {
      if (!mongoose.Types.ObjectId.isValid(dto.departmentId)) {
        throw ApiError.badRequest("Invalid departmentId format.");
      }
      const dept = await Department.findById(dto.departmentId);
      if (!dept || !dept.isActive) {
        throw ApiError.badRequest("Department does not exist or is inactive.");
      }
    }

    if (dto.designationId) {
      if (!mongoose.Types.ObjectId.isValid(dto.designationId)) {
        throw ApiError.badRequest("Invalid designationId format.");
      }
      const desig = await Designation.findById(dto.designationId);
      if (!desig || !desig.isActive) {
        throw ApiError.badRequest("Designation does not exist or is inactive.");
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
          { employeeId: id, toDate: null },
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
