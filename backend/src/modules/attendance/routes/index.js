/**
 * Routes Module: attendance
 */
const attendancePolicyRoutes = require("./attendancePolicy.routes");
const holidayCalendarRoutes = require("./holidayCalendar.routes");
const dailyAttendanceRoutes = require("./dailyAttendance.routes");
const attendancePermissionRoutes = require("./attendancePermission.routes");

module.exports = {
  attendancePolicyRoutes,
  holidayCalendarRoutes,
  dailyAttendanceRoutes,
  attendancePermissionRoutes,
};
