/**
 * Validators Module: attendance
 */
const attendancePolicyValidator = require("./attendancePolicy.validator");
const holidayCalendarValidator = require("./holidayCalendar.validator");
const dailyAttendanceValidator = require("./dailyAttendance.validator");

module.exports = {
  ...attendancePolicyValidator,
  ...holidayCalendarValidator,
  ...dailyAttendanceValidator,
};
