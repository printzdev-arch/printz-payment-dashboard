/**
 * Module: attendance
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get attendancePermission() {
      return require("./controllers/attendancePermission.controller");
    },
    get attendancePolicy() {
      return require("./controllers/attendancePolicy.controller");
    },
    get dailyAttendance() {
      return require("./controllers/dailyAttendance.controller");
    },
    get holidayCalendar() {
      return require("./controllers/holidayCalendar.controller");
    },
  },
  models: {
    get AttendancePermission() {
      return require("./models/AttendancePermission");
    },
    get AttendancePolicy() {
      return require("./models/AttendancePolicy");
    },
    get DailyAttendance() {
      return require("./models/DailyAttendance");
    },
    get HolidayCalendar() {
      return require("./models/HolidayCalendar");
    },
    get LeaveType() {
      return require("./models/LeaveType");
    },
  },
  routes: {
    get attendancePermission() {
      return require("./routes/attendancePermission.routes");
    },
    get attendancePolicy() {
      return require("./routes/attendancePolicy.routes");
    },
    get dailyAttendance() {
      return require("./routes/dailyAttendance.routes");
    },
    get holidayCalendar() {
      return require("./routes/holidayCalendar.routes");
    },
  },
  services: {
    get attendanceCalculation() {
      return require("./services/attendanceCalculation.service");
    },
    get "attendanceEmployeeSync.helper"() {
      return require("./services/attendanceEmployeeSync.helper");
    },
    get attendancePermission() {
      return require("./services/attendancePermission.service");
    },
    get attendancePolicy() {
      return require("./services/attendancePolicy.service");
    },
    get attendanceReconciliation() {
      return require("./services/attendanceReconciliation.service");
    },
    get dailyAttendance() {
      return require("./services/dailyAttendance.service");
    },
    get holidayCalendar() {
      return require("./services/holidayCalendar.service");
    },
  },
  validators: {
    get attendancePermission() {
      return require("./routes/attendancePermission.validator");
    },
    get attendancePolicy() {
      return require("./routes/attendancePolicy.validator");
    },
    get dailyAttendance() {
      return require("./routes/dailyAttendance.validator");
    },
    get holidayCalendar() {
      return require("./routes/holidayCalendar.validator");
    },
  },
};
