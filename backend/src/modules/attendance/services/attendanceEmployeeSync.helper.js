const mongoose = require("mongoose");
const User = require("../../auth/models/User");
const Employee = require("../../employees/models/Employee");
const Department = require("../../departments/models/Department");
const Designation = require("../../designations/models/Designation");
const SequenceHelper = require("../../number-sequences/helpers/SequenceHelper");

const ATTENDANCE_DEPT_CODES = ["DES", "PROD", "LOG"];

class AttendanceEmployeeSyncHelper {
  constructor() {
    this._initialized = false;
    this._deptMap = {};
    this._desigMap = {};
  }

  /**
   * Ensure standard departments and designations exist for all shop roles
   * (Designers, Operators, Delivery members, Cashiers, Managers)
   */
  async ensureStandardDepartmentsAndDesignations() {
    try {
      const deptDefs = [
        { name: "Design & Creative", code: "DES", description: "Designers, Artworks, Prepress & Creative" },
        { name: "Digital Printing & Production", code: "PROD", description: "Machine Operators, Print Technicians, Binding & Production" },
        { name: "Logistics & Delivery", code: "LOG", description: "Delivery Riders, Dispatchers, Fleet & Logistics" },
        { name: "Sales & Front Desk", code: "SALES", description: "Cashiers, Counter Sales & Customer Executives" },
        { name: "Branch Operations", code: "OPS", description: "Store & Branch Management Operations" },
      ];

      for (const def of deptDefs) {
        let dept = await Department.findOne({ code: def.code });
        if (!dept) {
          dept = await Department.findOne({ name: new RegExp(`^${def.name}$`, "i") });
        }
        if (!dept) {
          dept = await Department.create({ ...def, isActive: true });
        } else if (!dept.isActive) {
          dept.isActive = true;
          await dept.save();
        }
        this._deptMap[def.code] = dept._id;
      }

      const desigDefs = [
        { name: "Senior Graphic Designer", code: "SR_DES", deptCode: "DES" },
        { name: "Graphic Designer", code: "DES_EXEC", deptCode: "DES" },
        { name: "Print Machine Operator", code: "MACH_OP", deptCode: "PROD" },
        { name: "Production Specialist", code: "PROD_SPEC", deptCode: "PROD" },
        { name: "Delivery Executive", code: "DEL_EXEC", deptCode: "LOG" },
        { name: "Delivery Rider", code: "DEL_RIDER", deptCode: "LOG" },
        { name: "Counter Cashier", code: "CASH_EXEC", deptCode: "SALES" },
        { name: "Front Desk Executive", code: "FD_EXEC", deptCode: "SALES" },
        { name: "Branch Store Manager", code: "BR_MGR", deptCode: "OPS" },
      ];

      for (const def of desigDefs) {
        let desig = await Designation.findOne({ code: def.code });
        if (!desig) {
          desig = await Designation.findOne({ name: new RegExp(`^${def.name}$`, "i") });
        }
        if (!desig) {
          desig = await Designation.create({
            name: def.name,
            code: def.code,
            departmentId: this._deptMap[def.deptCode],
            isActive: true,
          });
        } else if (!desig.departmentId && this._deptMap[def.deptCode]) {
          desig.departmentId = this._deptMap[def.deptCode];
          await desig.save();
        }
        this._desigMap[def.code] = desig._id;
      }

      this._initialized = true;
    } catch (err) {
      console.error("[AttendanceEmployeeSync] ensureStandardDepartmentsAndDesignations error:", err.message);
    }
  }

  /**
   * Determine Department and Designation codes based on operational role.
   * Only designers, operators and delivery members are attendance employees;
   * every other role (managers, admins, cashiers, staff) returns null.
   */
  _mapRoleToDeptAndDesig(role = "") {
    const r = String(role).toLowerCase().trim();

    if (r.includes("design")) {
      return { deptCode: "DES", desigCode: "SR_DES" };
    }
    if (r.includes("operator") || r.includes("production") || r.includes("machine") || r.includes("print")) {
      return { deptCode: "PROD", desigCode: "MACH_OP" };
    }
    if (r.includes("deliver") || r.includes("logistics") || r.includes("driver") || r.includes("rider")) {
      return { deptCode: "LOG", desigCode: "DEL_EXEC" };
    }

    return null;
  }

  /**
   * Department ids of the attendance employee groups (designers, operators, delivery)
   */
  async getEligibleDepartmentIds() {
    if (!this._initialized || Object.keys(this._deptMap).length === 0) {
      await this.ensureStandardDepartmentsAndDesignations();
    }
    return ATTENDANCE_DEPT_CODES.map((c) => this._deptMap[c]).filter(Boolean);
  }

  /**
   * Ensure all operational branch users (designers, operators, delivery members, cashiers, managers)
   * are registered and active in the Employee roster for attendance
   */
  async ensureBranchMembersAsEmployees(branchId) {
    try {
      if (!this._initialized || Object.keys(this._deptMap).length === 0) {
        await this.ensureStandardDepartmentsAndDesignations();
      }

      if (!branchId) return;

      const branchQueryOr = [{ branchId: branchId }];
      if (mongoose.Types.ObjectId.isValid(branchId)) {
        branchQueryOr.push({ branchId: new mongoose.Types.ObjectId(branchId) });
        branchQueryOr.push({ branchId: String(branchId) });
        branchQueryOr.push({ branchIds: new mongoose.Types.ObjectId(branchId) });
        branchQueryOr.push({ branchIds: String(branchId) });
      }

      const branchUsers = await User.find({
        $or: branchQueryOr,
        status: { $ne: "DISABLED" },
      });

      if (!branchUsers || branchUsers.length === 0) return;

      for (const u of branchUsers) {
        let emp = null;
        if (u.employeeId) {
          emp = await Employee.findById(u.employeeId);
        }
        if (!emp && u.email) {
          emp = await Employee.findOne({ email: u.email.toLowerCase().trim() });
        }

        const mapped = this._mapRoleToDeptAndDesig(u.role);
        if (!mapped) continue;
        const { deptCode, desigCode } = mapped;
        const targetDeptId = this._deptMap[deptCode];
        const targetDesigId = this._desigMap[desigCode];

        if (!emp) {
          let nextCode;
          try {
            nextCode = await SequenceHelper.next("EMPLOYEE");
          } catch (_) {
            nextCode = "EMP-" + String(Date.now()).slice(-5);
          }

          let mobile = u.phone ? String(u.phone).replace(/\D/g, "") : "";
          if (!/^\d{10}$/.test(mobile)) {
            mobile = "98" + String(Date.now()).slice(-8);
          }

          const joiningDate = u.createdAt ? new Date(u.createdAt) : new Date();
          joiningDate.setHours(0, 0, 0, 0);

          emp = await Employee.create({
            employeeCode: nextCode,
            name: u.name,
            email: u.email.toLowerCase().trim(),
            mobile,
            branchId: u.branchId || branchId,
            departmentId: targetDeptId,
            designationId: targetDesigId,
            employmentStatus: "ACTIVE",
            isActive: true,
            joiningDate,
          });
        } else {
          let needsUpdate = false;
          if (!emp.branchId) {
            emp.branchId = u.branchId || branchId;
            needsUpdate = true;
          }
          if (!emp.departmentId && targetDeptId) {
            emp.departmentId = targetDeptId;
            needsUpdate = true;
          }
          if (!emp.designationId && targetDesigId) {
            emp.designationId = targetDesigId;
            needsUpdate = true;
          }
          if (emp.employmentStatus !== "ACTIVE" || !emp.isActive) {
            emp.employmentStatus = "ACTIVE";
            emp.isActive = true;
            needsUpdate = true;
          }
          // Ensure joiningDate is normalized to beginning of day
          if (emp.joiningDate) {
            const jd = new Date(emp.joiningDate);
            if (jd.getHours() !== 0 || jd.getMinutes() !== 0) {
              jd.setHours(0, 0, 0, 0);
              emp.joiningDate = jd;
              needsUpdate = true;
            }
          }
          if (needsUpdate) {
            await emp.save();
          }
        }

        if (!u.employeeId || String(u.employeeId) !== String(emp._id)) {
          u.employeeId = emp._id;
          await u.save();
        }
      }
    } catch (err) {
      console.error("[AttendanceEmployeeSync] ensureBranchMembersAsEmployees failed:", err.message);
    }
  }
}

module.exports = new AttendanceEmployeeSyncHelper();
