/**
 * Services Module: attendance
 */
const attendancePolicyService = require("./attendancePolicy.service");
const holidayCalendarService = require("./holidayCalendar.service");
const dailyAttendanceService = require("./dailyAttendance.service");
const attendanceCalculationService = require("./attendanceCalculation.service");
const attendanceReconciliationService = require("./attendanceReconciliation.service");

module.exports = {
  attendancePolicyService,
  holidayCalendarService,
  dailyAttendanceService,
  attendanceCalculationService,
  attendanceReconciliationService,
};
