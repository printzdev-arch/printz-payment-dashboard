/**
 * Controllers Module: attendance
 */
const attendancePolicyController = require("./attendancePolicy.controller");
const holidayCalendarController = require("./holidayCalendar.controller");
const dailyAttendanceController = require("./dailyAttendance.controller");

module.exports = {
  attendancePolicyController,
  holidayCalendarController,
  dailyAttendanceController,
};
