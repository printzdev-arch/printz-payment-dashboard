/**
 * Swagger / OpenAPI Specification for HR Configuration & Daily Attendance Module (Module 11)
 */

module.exports = {
  tags: [
    { name: "Attendance Policies", description: "Configurable shift timings, thresholds, break durations, and weekly off rules" },
    { name: "Holiday Calendars", description: "Annual public, festival, and branch-specific holiday calendar configuration" },
    { name: "Daily Attendance", description: "Daily attendance tracking, automated calculations, summaries, and missing reconciliation" },
    { name: "Attendance Permissions", description: "Branch-wise employee permission requests, balance calculation, approvals, and attendance credit" },
  ],
  schemas: {
    AttendancePolicyRequest: {
      type: "object",
      required: ["name", "code"],
      properties: {
        name: { type: "string", example: "General Head Office Shift", description: "Policy name" },
        code: { type: "string", example: "G_HO_0918", description: "Unique uppercase policy code" },
        description: { type: "string", example: "Standard 9:00 AM to 6:00 PM shift with 1 hour break", description: "Policy description" },
        branchId: { $ref: "#/components/schemas/ObjectId", nullable: true, example: "489571a9af51836599708543", description: "Target branch ID or null for organization-wide default" },
        workingHoursPerDay: { type: "number", example: 8, default: 8, description: "Standard required working hours per day" },
        shiftStartTime: { type: "string", example: "09:00", description: "Shift start time in HH:mm format" },
        shiftEndTime: { type: "string", example: "18:00", description: "Shift end time in HH:mm format" },
        lateGraceMinutes: { type: "number", example: 15, default: 0, description: "Grace period before marking late arrival in minutes" },
        earlyCheckoutGraceMinutes: { type: "number", example: 0, default: 0, description: "Grace period before marking early checkout in minutes" },
        breakDurationMinutes: { type: "number", example: 0, default: 0, description: "Break duration in minutes deducted only if configured and elapsed > breakDuration" },
        halfDayHours: { type: "number", example: 4, default: 4, description: "Minimum working hours to qualify for half-day" },
        fullDayHours: { type: "number", example: 8, default: 8, description: "Minimum working hours to qualify for full-day" },
        weeklyOffDays: {
          type: "array",
          items: { type: "integer", minimum: 0, maximum: 6 },
          example: [],
          description: "Days of week considered weekly off (empty by default for 7-day working week)",
        },
        workingDays: {
          type: "array",
          items: { type: "string" },
          example: [
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
            "SUNDAY"
          ],
          description: "List of working days in a week",
        },
        monthlyLeaveAllowance: { type: "number", example: 4, default: 4, description: "Monthly leave allowance in days (default: 4)" },
        overtimeEnabled: { type: "boolean", example: true, default: true, description: "Whether overtime tracking is enabled" },
        permissionEnabled: { type: "boolean", example: true, default: true, description: "Whether short permission is allowed" },
        maxPermissionHoursPerDay: { type: "number", example: 2, default: 2, description: "Maximum permission hours per day" },
        maxPermissionHoursPerMonth: { type: "number", example: 4, default: 4, description: "Maximum permission hours per month" },
        isActive: { type: "boolean", example: true, default: true, description: "Whether the policy is currently active" },
      },
    },
    AttendancePolicyResponse: {
      type: "object",
      properties: {
        _id: { $ref: "#/components/schemas/ObjectId" },
        name: { type: "string", example: "General Head Office Shift" },
        code: { type: "string", example: "G_HO_0918" },
        description: { type: "string", example: "Standard 9:00 AM to 6:00 PM shift with 1 hour break" },
        branchId: { $ref: "#/components/schemas/ObjectId", nullable: true, example: "489571a9af51836599708543" },
        workingHoursPerDay: { type: "number", example: 8 },
        shiftStartTime: { type: "string", example: "09:00" },
        shiftEndTime: { type: "string", example: "18:00" },
        lateGraceMinutes: { type: "number", example: 15 },
        earlyCheckoutGraceMinutes: { type: "number", example: 0 },
        breakDurationMinutes: { type: "number", example: 0 },
        halfDayHours: { type: "number", example: 4 },
        fullDayHours: { type: "number", example: 8 },
        weeklyOffDays: { type: "array", items: { type: "integer" }, example: [] },
        workingDays: {
          type: "array",
          items: { type: "string" },
          example: [
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
            "SUNDAY"
          ],
        },
        monthlyLeaveAllowance: { type: "number", example: 4 },
        overtimeEnabled: { type: "boolean", example: true },
        permissionEnabled: { type: "boolean", example: true },
        maxPermissionHoursPerDay: { type: "number", example: 2 },
        maxPermissionHoursPerMonth: { type: "number", example: 4 },
        isActive: { type: "boolean", example: true },
        createdBy: { $ref: "#/components/schemas/ObjectId", nullable: true, description: "Audit: Added automatically by server" },
        updatedBy: { $ref: "#/components/schemas/ObjectId", nullable: true, description: "Audit: Added automatically by server" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    HolidayCalendarRequest: {
      type: "object",
      required: ["name", "year"],
      properties: {
        name: { type: "string", example: "Bangalore Main Branch Calendar 2026" },
        year: { type: "integer", example: 2026 },
        branchId: { $ref: "#/components/schemas/ObjectId", nullable: true },
        holidays: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "date"],
            properties: {
              name: { type: "string", example: "Christmas Day" },
              date: {
                type: "string",
                format: "date",
                example: "2026-12-25",
                description:
                  "Strictly YYYY-MM-DD format. Must be a valid real calendar date matching the selected calendar year, adhering to leap-year rules, and must be a current or future date (on or after today in the configured timezone, e.g. >= 2026-10-21). Past dates and duplicate dates within the calendar are strictly rejected with HTTP 400.",
              },
              type: { type: "string", enum: ["PUBLIC", "FESTIVAL", "OPTIONAL", "COMPANY"], default: "PUBLIC" },
              description: { type: "string", example: "National Holiday" },
            },
          },
        },
        isActive: { type: "boolean", default: true },
      },
    },
    DailyAttendanceRequest: {
      type: "object",
      required: ["employeeId", "branchId", "attendanceDate"],
      properties: {
        employeeId: { $ref: "#/components/schemas/ObjectId" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        attendanceDate: { type: "string", format: "date", example: "2026-10-17" },
        checkIn: { type: "string", nullable: true, example: "09:10" },
        checkOut: { type: "string", nullable: true, example: "18:05" },
        status: { type: "string", enum: ["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY", "WEEKLY_OFF", "PENDING"], example: "PRESENT" },
        permission: {
          type: "object",
          nullable: true,
          properties: {
            durationHours: { type: "number", example: 1 },
            startTime: { type: "string", example: "14:00" },
            endTime: { type: "string", example: "15:00" },
            reason: { type: "string", example: "Medical appointment" },
          },
        },
        overtimeHours: { type: "number", minimum: 0, default: 0, example: 1.0, description: "Calculated automatically on backend" },
        remarks: { type: "string", example: "Attendance recorded by Branch Manager" },
        isLocked: { type: "boolean", default: false, description: "Whether record is locked from further manager edits" },
      },
    },
    DailyAttendanceResponse: {
      type: "object",
      properties: {
        _id: { $ref: "#/components/schemas/ObjectId", example: "64b7f8a91234567890abcdef" },
        employeeId: {
          type: "object",
          properties: {
            _id: { $ref: "#/components/schemas/ObjectId", example: "64b7f8a91234567890abc001" },
            employeeCode: { type: "string", example: "EMP-001" },
            name: { type: "string", example: "John Doe" },
          },
        },
        branchId: {
          type: "object",
          properties: {
            _id: { $ref: "#/components/schemas/ObjectId", example: "64b7f8a91234567890abc002" },
            code: { type: "string", example: "BR01" },
            name: { type: "string", example: "Main Branch" },
          },
        },
        attendanceDate: { type: "string", format: "date", example: "2026-10-21" },
        attendancePolicyId: {
          type: "object",
          nullable: true,
          properties: {
            _id: { $ref: "#/components/schemas/ObjectId", example: "64b7f8a91234567890abc003" },
            workingHoursPerDay: { type: "number", example: 8 },
            shiftStartTime: { type: "string", example: "09:00" },
            shiftEndTime: { type: "string", example: "18:00" },
          },
        },
        holidayCalendarId: {
          type: "object",
          nullable: true,
          properties: {
            _id: { $ref: "#/components/schemas/ObjectId", example: "64b7f8a91234567890abc004" },
            year: { type: "integer", example: 2026 },
          },
        },
        checkIn: { type: "string", nullable: true, example: "09:00" },
        checkOut: { type: "string", nullable: true, example: "18:00" },
        workingHoursPerDay: { type: "number", example: 8.0 },
        status: {
          type: "string",
          enum: ["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY", "WEEKLY_OFF", "PENDING"],
          example: "PRESENT",
        },
        source: {
          type: "string",
          enum: ["WEB_MOBILE", "MANAGER_APP", "MANUAL", "SYSTEM"],
          example: "WEB_MOBILE",
        },
        lateArrival: { type: "boolean", example: false },
        earlyCheckout: { type: "boolean", example: false },
        permission: {
          type: "object",
          nullable: true,
          properties: {
            durationHours: { type: "number", example: 1.0 },
            startTime: { type: "string", example: "14:00" },
            endTime: { type: "string", example: "15:00" },
            reason: { type: "string", example: "Personal appointment" },
          },
        },
        leaveTypeId: { $ref: "#/components/schemas/ObjectId", nullable: true, description: "Preserved legacy field if present" },
        overtimeHours: { type: "number", example: 0.0 },
        overtimeStatus: {
          type: "string",
          enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
          example: "NONE",
        },
        remarks: { type: "string", example: "Attendance recorded successfully" },
        calculationStatus: {
          type: "string",
          enum: ["CALCULATED", "MANUAL_OVERRIDE", "PENDING", "FAILED"],
          example: "CALCULATED",
        },
        isLocked: { type: "boolean", example: false },
        createdBy: { $ref: "#/components/schemas/ObjectId", nullable: true },
        updatedBy: { $ref: "#/components/schemas/ObjectId", nullable: true },
        createdAt: { type: "string", format: "date-time", example: "2026-10-21T09:00:00.000Z" },
        updatedAt: { type: "string", format: "date-time", example: "2026-10-21T18:00:00.000Z" },
      },
    },
    BranchCheckInRequest: {
      type: "object",
      required: ["employeeId", "branchId"],
      properties: {
        employeeId: { $ref: "#/components/schemas/ObjectId" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        attendanceDate: { type: "string", format: "date", example: "2026-10-21" },
        checkIn: { type: "string", example: "09:00", description: "HH:mm format, defaults to current IST time" },
        remarks: { type: "string", example: "Mobile app punch-in" },
      },
    },
    BranchCheckOutRequest: {
      type: "object",
      required: ["employeeId", "branchId"],
      properties: {
        employeeId: { $ref: "#/components/schemas/ObjectId" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        attendanceDate: { type: "string", format: "date", example: "2026-10-21" },
        checkOut: { type: "string", example: "18:00", description: "HH:mm format, defaults to current IST time" },
        remarks: { type: "string", example: "Mobile app punch-out" },
      },
    },
    BatchPunchRequest: {
      type: "object",
      required: ["branchId", "punches"],
      properties: {
        branchId: { $ref: "#/components/schemas/ObjectId" },
        attendanceDate: { type: "string", format: "date", example: "2026-10-21" },
        punches: {
          type: "array",
          items: {
            type: "object",
            required: ["employeeId", "action"],
            properties: {
              employeeId: { $ref: "#/components/schemas/ObjectId" },
              action: { type: "string", enum: ["CHECK_IN", "CHECK_OUT"] },
              time: { type: "string", example: "09:00" },
              remarks: { type: "string" },
            },
          },
        },
      },
    },
    AttendanceReconcileRequest: {
      type: "object",
      required: ["branchId", "attendanceDate"],
      properties: {
        branchId: { $ref: "#/components/schemas/ObjectId" },
        attendanceDate: { type: "string", format: "date", example: "2026-10-17" },
        records: {
          type: "array",
          items: { $ref: "#/components/schemas/DailyAttendanceRequest" },
        },
        autoFillAbsent: { type: "boolean", default: false, description: "Auto-fill remaining missing employees as ABSENT (only allowed after workday ends)" },
        remarks: { type: "string", example: "Reconciled by manager" },
      },
    },
    MonthlyAttendanceSummaryResponse: {
      type: "object",
      properties: {
        employeeId: { $ref: "#/components/schemas/ObjectId", nullable: true },
        branchId: { $ref: "#/components/schemas/ObjectId", nullable: true },
        month: { type: "integer", example: 8 },
        year: { type: "integer", example: 2026 },
        calendarDays: { type: "integer", example: 31, description: "Total calendar days in the month" },
        expectedWorkingDays: { type: "integer", example: 27, description: "calendarDays - 4 baseline" },
        daysWorked: { type: "integer", example: 28, description: "Distinct completed worked days (never capped)" },
        halfDaysWorked: { type: "integer", example: 0 },
        unpaidLeaveDaysTaken: { type: "integer", example: 1, description: "Distinct ON_LEAVE days recorded" },
        absentDays: { type: "integer", example: 2, description: "Distinct reconciled absent days" },
        totalWorkingHours: { type: "number", example: 252.0, description: "Total net hours without break deduction" },
        totalOvertimeHours: { type: "number", example: 28.0, description: "Automatic overtime hours (max(0, hours - 8))" },
        pendingAttendanceDays: { type: "integer", example: 0, description: "Distinct incomplete/pending days" },
      },
    },
    AttendancePermissionRequest: {
      type: "object",
      required: ["employeeId", "startTime", "endTime", "reason"],
      properties: {
        employeeId: { $ref: "#/components/schemas/ObjectId", example: "64b7f8a91234567890abcdef", description: "Employee ID requesting permission" },
        branchId: { $ref: "#/components/schemas/ObjectId", nullable: true, description: "Optional branch ID (must match employee branch)" },
        permissionDate: { type: "string", format: "date", example: "2026-10-22", description: "Permission date (YYYY-MM-DD)" },
        date: { type: "string", format: "date", example: "2026-10-22", description: "Alternative date key (YYYY-MM-DD)" },
        startTime: { type: "string", example: "09:00", description: "Permission start time in HH:mm format" },
        endTime: { type: "string", example: "11:00", description: "Permission end time in HH:mm format (must be after startTime)" },
        reason: { type: "string", example: "Doctor appointment", description: "Reason for permission" },
      },
    },
    AttendancePermissionResponse: {
      type: "object",
      properties: {
        _id: { $ref: "#/components/schemas/ObjectId" },
        employeeId: { $ref: "#/components/schemas/ObjectId" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        attendancePolicyId: { $ref: "#/components/schemas/ObjectId" },
        permissionDate: { type: "string", example: "2026-10-22" },
        year: { type: "integer", example: 2026 },
        month: { type: "integer", example: 10 },
        startTime: { type: "string", example: "09:00" },
        endTime: { type: "string", example: "11:00" },
        durationHours: { type: "number", example: 2.0 },
        requestedHours: { type: "number", example: 2.0 },
        reason: { type: "string", example: "Doctor appointment" },
        status: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"], example: "PENDING" },
        monthlyAllowanceHours: { type: "number", example: 4.0 },
        usedHours: { type: "number", example: 0.0 },
        reservedHours: { type: "number", example: 2.0 },
        pendingHours: { type: "number", example: 2.0 },
        remainingHours: { type: "number", example: 2.0 },
        approvedBy: { $ref: "#/components/schemas/ObjectId", nullable: true },
        approvedAt: { type: "string", format: "date-time", nullable: true },
        rejectedBy: { $ref: "#/components/schemas/ObjectId", nullable: true },
        rejectedAt: { type: "string", format: "date-time", nullable: true },
        rejectionReason: { type: "string", nullable: true },
        cancelledBy: { $ref: "#/components/schemas/ObjectId", nullable: true },
        cancelledAt: { type: "string", format: "date-time", nullable: true },
        cancellationReason: { type: "string", nullable: true },
      },
    },
    RejectPermissionRequest: {
      type: "object",
      required: ["reason"],
      properties: {
        reason: { type: "string", example: "Insufficient branch coverage during morning peak hours", description: "Reason for rejecting request" },
      },
    },
    CancelPermissionRequest: {
      type: "object",
      properties: {
        reason: { type: "string", example: "Employee attended work normally", description: "Optional cancellation reason" },
      },
    },
    PermissionBalanceResponse: {
      type: "object",
      properties: {
        employeeId: { $ref: "#/components/schemas/ObjectId" },
        branchId: { $ref: "#/components/schemas/ObjectId" },
        year: { type: "integer", example: 2026 },
        month: { type: "integer", example: 10 },
        permissionEnabled: { type: "boolean", example: true },
        maxPermissionHoursPerDay: { type: "number", example: 2.0 },
        monthlyAllowanceHours: { type: "number", example: 4.0 },
        usedHours: { type: "number", example: 1.0 },
        reservedHours: { type: "number", example: 1.5 },
        pendingHours: { type: "number", example: 1.5 },
        remainingHours: { type: "number", example: 1.5 },
      },
    },
  },
  paths: {
    // ── Attendance Policies Endpoints ─────────────────────────────────────────
    "/attendance-policies": {
      get: {
        tags: ["Attendance Policies"],
        description: "Retrieves attendance policies with filtering by branch, status, search keyword, and pagination.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Filter by Branch ID or null for org-wide" },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: { description: "Policies retrieved successfully" },
        },
      },
      post: {
        tags: ["Attendance Policies"],
        description: "Creates a new attendance policy with shift timings, grace minutes, break durations, and thresholds.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AttendancePolicyRequest" } } },
        },
        responses: {
          201: {
            description: "Attendance policy created successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AttendancePolicyResponse" } } },
          },
        },
      },
    },
    "/attendance-policies/{id}": {
      get: {
        tags: ["Attendance Policies"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Policy details retrieved",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AttendancePolicyResponse" } } },
          },
        },
      },
      put: {
        tags: ["Attendance Policies"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AttendancePolicyRequest" } } },
        },
        responses: {
          200: {
            description: "Policy updated successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AttendancePolicyResponse" } } },
          },
        },
      },
      delete: {
        tags: ["Attendance Policies"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Attendance policy deleted successfully" },
        },
      },
    },
    "/attendance-policies/{id}/status": {
      put: {
        tags: ["Attendance Policies"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { isActive: { type: "boolean" } } } } },
        },
        responses: {
          200: { description: "Policy status updated" },
        },
      },
    },

    // ── Holiday Calendars Endpoints ───────────────────────────────────────────
    "/holiday-calendars": {
      get: {
        tags: ["Holiday Calendars"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "year", in: "query", schema: { type: "integer" } },
          { name: "branchId", in: "query", schema: { type: "string" } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
        ],
        responses: {
          200: { description: "Holiday calendars retrieved successfully" },
        },
      },
      post: {
        tags: ["Holiday Calendars"],
        description:
          "Create a new holiday calendar. Validates strict YYYY-MM-DD format, real calendar date limits, leap years, calendar year match, duplicate dates, and ensures all holiday dates are current or future dates based on today's date in the configured timezone (Asia/Kolkata). Past dates are rejected with HTTP 400 before any database write.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/HolidayCalendarRequest" } } },
        },
        responses: {
          201: { description: "Holiday calendar created successfully" },
          400: { description: "Invalid request payload, invalid date format, leap-year limit violation, duplicate dates, or past holiday dates rejected." },
        },
      },
    },
    "/holiday-calendars/{id}": {
      get: {
        tags: ["Holiday Calendars"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Calendar details retrieved" } },
      },
      put: {
        tags: ["Holiday Calendars"],
        description:
          "Update a holiday calendar. Enforces strict YYYY-MM-DD validation, real calendar date limits, leap-year calculations, matching calendar year, no duplicate dates, and rejects past holiday dates (only current and future dates allowed) before any database write.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/HolidayCalendarRequest" } } },
        },
        responses: {
          200: { description: "Calendar updated successfully" },
          400: { description: "Invalid request payload, invalid date format, leap-year limit violation, duplicate dates, or past holiday dates rejected." },
        },
      },
      delete: {
        tags: ["Holiday Calendars"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Holiday calendar deleted successfully" } },
      },
    },
    "/holiday-calendars/{id}/status": {
      put: {
        tags: ["Holiday Calendars"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { isActive: { type: "boolean" } } } } },
        },
        responses: { 200: { description: "Calendar status updated" } },
      },
    },

    // ── Daily Attendance Endpoints ────────────────────────────────────────────
    "/attendance": {
      get: {
        tags: ["Daily Attendance"],
        description: "Retrieves attendance records with filtering by branch, employee, date range, status, and pagination.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Filter by Branch ID" },
          { name: "employeeId", in: "query", schema: { type: "string" }, description: "Filter by Employee ID" },
          { name: "attendanceDate", in: "query", schema: { type: "string", format: "date" }, description: "Specific attendance date (YYYY-MM-DD)" },
          { name: "startDate", in: "query", schema: { type: "string", format: "date" }, description: "Start of date range" },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" }, description: "End of date range" },
          { name: "status", in: "query", schema: { type: "string", enum: ["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY", "WEEKLY_OFF", "PENDING"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: {
            description: "Attendance records retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Attendance records retrieved successfully." },
                    data: {
                      type: "object",
                      properties: {
                        records: {
                          type: "array",
                          items: { $ref: "#/components/schemas/DailyAttendanceResponse" },
                        },
                        total: { type: "integer", example: 1 },
                        page: { type: "integer", example: 1 },
                        pages: { type: "integer", example: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Daily Attendance"],
        description: "Creates / records daily attendance for an employee on a date. Automatically calculates working hours, late arrival, early checkout, and overtime according to branch attendance policy.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/DailyAttendanceRequest" } } },
        },
        responses: {
          201: {
            description: "Attendance recorded successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Attendance recorded successfully." },
                    data: { $ref: "#/components/schemas/DailyAttendanceResponse" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid payload or attendance blocked for a branch holiday." },
          409: { description: "Attendance already exists for employee on this date." },
        },
      },
    },
    "/attendance/summary": {
      get: {
        tags: ["Daily Attendance"],
        description: "Produces monthly attendance summary for reporting and payroll integration: calendarDays, expectedWorkingDays (calendarDays - 4), daysWorked, halfDaysWorked, unpaidLeaveDaysTaken, absentDays, totalWorkingHours, totalOvertimeHours.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" } },
          { name: "employeeId", in: "query", schema: { type: "string" } },
          { name: "month", in: "query", schema: { type: "integer", minimum: 1, maximum: 12 }, description: "Calendar month (1-12)" },
          { name: "year", in: "query", schema: { type: "integer" }, description: "Calendar year" },
          { name: "date", in: "query", schema: { type: "string", format: "date" } },
          { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: {
          200: {
            description: "Summary calculated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MonthlyAttendanceSummaryResponse" },
              },
            },
          },
        },
      },
    },
    "/attendance/{id}": {
      get: {
        tags: ["Daily Attendance"],
        description: "Retrieves a single attendance record by ID.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Attendance record retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Attendance record retrieved successfully." },
                    data: { $ref: "#/components/schemas/DailyAttendanceResponse" },
                  },
                },
              },
            },
          },
          404: { description: "Attendance record not found" },
        },
      },
      put: {
        tags: ["Daily Attendance"],
        description: "Updates an attendance record by ID (manager corrections, check-out time, remarks). Automatically recalculates working hours, status, and overtime.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/DailyAttendanceRequest" } } },
        },
        responses: {
          200: {
            description: "Attendance record updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Attendance record updated successfully." },
                    data: { $ref: "#/components/schemas/DailyAttendanceResponse" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid payload or attendance date is a branch holiday." },
          404: { description: "Attendance record not found" },
        },
      },
      delete: {
        tags: ["Daily Attendance"],
        description: "Deletes an attendance record by ID.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Attendance record deleted successfully" },
          404: { description: "Attendance record not found" },
        },
      },
    },

    // ── Attendance Permissions Endpoints ──────────────────────────────────────
    "/attendance/permissions": {
      post: {
        tags: ["Attendance Permissions"],
        description: "Records an employee permission. Automatically granted based on branch attendance policy limits, deducting duration from employee's monthly allowance and syncing directly with daily attendance.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AttendancePermissionRequest" } } },
        },
        responses: {
          201: {
            description: "Permission recorded and granted successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AttendancePermissionResponse" } } },
          },
          400: { description: "Policy missing/disabled, daily limit exceeded, or monthly allowance exhausted" },
        },
      },
      get: {
        tags: ["Attendance Permissions"],
        description: "Retrieves permission records filtered by authorized branch, employee, date, and status.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Filter by branch ID" },
          { name: "employeeId", in: "query", schema: { type: "string" }, description: "Filter by employee ID" },
          { name: "status", in: "query", schema: { type: "string", enum: ["APPROVED", "CANCELLED"] } },
          { name: "permissionDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: { description: "Permission records retrieved successfully" },
        },
      },
    },
    "/attendance/permissions/balance": {
      get: {
        tags: ["Attendance Permissions"],
        description: "Calculates current monthly permission allowance, used hours, and remaining balance for an employee.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "employeeId", in: "query", required: true, schema: { type: "string" } },
          { name: "year", in: "query", schema: { type: "integer", example: 2026 } },
          { name: "month", in: "query", schema: { type: "integer", example: 10 } },
        ],
        responses: {
          200: {
            description: "Employee permission balance retrieved successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/PermissionBalanceResponse" } } },
          },
        },
      },
    },
    "/attendance/permissions/{id}": {
      get: {
        tags: ["Attendance Permissions"],
        description: "Retrieves a specific permission record with live monthly balance and audit details.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Permission record retrieved successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AttendancePermissionResponse" } } },
          },
          404: { description: "Permission record not found" },
        },
      },
      put: {
        tags: ["Attendance Permissions"],
        description: "Updates an employee permission record, re-verifies branch daily and monthly limits, adjusts monthly allowance, and updates daily attendance.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AttendancePermissionRequest" } } },
        },
        responses: {
          200: {
            description: "Permission record updated successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AttendancePermissionResponse" } } },
          },
          400: { description: "Invalid request payload, daily limit exceeded, or monthly allowance exhausted" },
        },
      },
      delete: {
        tags: ["Attendance Permissions"],
        description: "Deletes / cancels an employee permission record, restores monthly allowance, and resets daily attendance permission credit.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Permission record deleted and allowance restored successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AttendancePermissionResponse" } } },
          },
          404: { description: "Permission record not found" },
        },
      },
    },
  },
};
