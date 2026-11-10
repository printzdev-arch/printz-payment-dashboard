/**
 * Models Module: attendance
 */
const AttendancePolicy = require("./AttendancePolicy");
const HolidayCalendar = require("./HolidayCalendar");
const DailyAttendance = require("./DailyAttendance");
const LeaveType = require("./LeaveType");
const AttendancePermission = require("./AttendancePermission");

module.exports = {
  AttendancePolicy,
  HolidayCalendar,
  DailyAttendance,
  LeaveType,
  AttendancePermission,
};
