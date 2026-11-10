const express = require("express");
const { requireAdmin } = require("../../../middleware/security/admin.middleware");
const router = express.Router();
const holidayCalendarController = require("../controllers/holidayCalendar.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { requirePermission } = require("../../../middleware/security/permission.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");
const {
  calendarIdParamValidator,
  getCalendarsQueryValidator,
  createCalendarValidator,
  updateCalendarValidator,
  calendarStatusValidator,
} = require("./holidayCalendar.validator");

router.use(authenticate);

// ── GET /api/holiday-calendars ───────────────────────────────────────────────
router.get(
  "/",
  requirePermission(PERMISSIONS.HR.HOLIDAY_VIEW, { branchField: "branchId" }),
  getCalendarsQueryValidator,
  holidayCalendarController.getCalendars
);

// ── GET /api/holiday-calendars/:id ───────────────────────────────────────────
router.get(
  "/:id",
  requirePermission(PERMISSIONS.HR.HOLIDAY_VIEW, { branchField: "branchId" }),
  calendarIdParamValidator,
  holidayCalendarController.getCalendarById
);

// ── POST /api/holiday-calendars ──────────────────────────────────────────────
router.post(
  "/",
  requirePermission(PERMISSIONS.HR.HOLIDAY_MANAGE, { branchField: "branchId" }),
  requireAdmin,
  createCalendarValidator,
  holidayCalendarController.createCalendar
);

// ── PUT /api/holiday-calendars/:id ───────────────────────────────────────────
router.put(
  "/:id",
  requirePermission(PERMISSIONS.HR.HOLIDAY_MANAGE, { branchField: "branchId" }),
  requireAdmin,
  updateCalendarValidator,
  holidayCalendarController.updateCalendar
);

// ── PUT /api/holiday-calendars/:id/status ────────────────────────────────────
router.put(
  "/:id/status",
  requirePermission(PERMISSIONS.HR.HOLIDAY_MANAGE, { branchField: "branchId" }),
  requireAdmin,
  calendarStatusValidator,
  holidayCalendarController.updateStatus
);

// ── DELETE /api/holiday-calendars/:id ────────────────────────────────────────
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.HR.HOLIDAY_MANAGE, { branchField: "branchId" }),
  requireAdmin,
  calendarIdParamValidator,
  holidayCalendarController.deleteCalendar
);

module.exports = router;

