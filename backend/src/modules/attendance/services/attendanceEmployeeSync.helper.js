const mongoose = require("mongoose");
const User = require("../../auth/models/User");
const Employee = require("../../employees/models/Employee");
const SequenceHelper = require("../../number-sequences/services/SequenceHelper");

class AttendanceEmployeeSyncHelper {
  /**
   * Only designers, operators and delivery members are registered automatically from a login.
   * Every other role (managers, admins, cashiers, staff) is added through the Employees screen.
   */
  _isAutoRegisteredRole(role = "") {
    const r = String(role).toLowerCase().trim();
    return (
      r.includes("design") ||
      r.includes("operator") ||
      r.includes("production") ||
      r.includes("machine") ||
      r.includes("print") ||
      r.includes("deliver") ||
      r.includes("logistics") ||
      r.includes("driver") ||
      r.includes("rider")
    );
  }

  /**
   * Make sure designers, operators and delivery members who can sign in to this branch
   * have an active employee record, so they appear on attendance.
   */
  async ensureBranchMembersAsEmployees(branchId) {
    try {
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

        if (!this._isAutoRegisteredRole(u.role)) continue;

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
