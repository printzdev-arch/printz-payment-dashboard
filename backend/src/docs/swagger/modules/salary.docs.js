const paths = {
  "/salary/runs": {
    get: {
      tags: ["Salary & Payroll"],
      summary: "List salary runs",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "query", name: "branchId", schema: { type: "string" }, description: "Filter by branch ID" },
        { in: "query", name: "payrollMonth", schema: { type: "integer", minimum: 1, maximum: 12 }, description: "Filter by payroll month (1-12)" },
        { in: "query", name: "payrollYear", schema: { type: "integer", minimum: 2000, maximum: 2100 }, description: "Filter by payroll year" },
        { in: "query", name: "status", schema: { type: "string", enum: ["DRAFT", "CALCULATING", "CALCULATED", "APPROVED", "PAID", "LOCKED"] }, description: "Filter by status" }
      ],
      responses: {
        "200": {
          description: "List of salary runs",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "array", items: { $ref: "#/components/schemas/SalaryRun" } } } } } }
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" }
      }
    },
    post: {
      tags: ["Salary & Payroll"],
      summary: "Create monthly salary run",
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateSalaryRun" } } } },
      responses: {
        "201": {
          description: "Salary run created",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/SalaryRun" } } } } }
        },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "409": { description: "Duplicate salary run already exists for period" }
      }
    }
  },
  "/salary/runs/{id}": {
    get: {
      tags: ["Salary & Payroll"],
      summary: "Get salary run and entries",
      security: [{ bearerAuth: [] }],
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "Salary run ID" }],
      responses: {
        "200": {
          description: "Salary run details and calculated records",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { allOf: [{ $ref: "#/components/schemas/SalaryRun" }, { type: "object", properties: { records: { type: "array", items: { $ref: "#/components/schemas/SalaryRecord" } } } }] } } } } }
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "404": { description: "Salary run not found" }
      }
    }
  },
  "/salary/runs/{id}/calculate": {
    post: {
      tags: ["Salary & Payroll"],
      summary: "Calculate salary entries",
      security: [{ bearerAuth: [] }],
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "Salary run ID" }],
      responses: {
        "200": {
          description: "Salary run calculated",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/SalaryRun" } } } } }
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "404": { description: "Salary run not found" },
        "409": { description: "Conflict - Concurrent calculation or already finalized" }
      }
    }
  },
  "/salary/runs/{id}/approve": {
    post: {
      tags: ["Salary & Payroll"],
      summary: "Approve calculated salary run",
      security: [{ bearerAuth: [] }],
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "Salary run ID" }],
      responses: {
        "200": {
          description: "Salary run approved",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/SalaryRun" } } } } }
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Requires hr.salary.approve" },
        "404": { description: "Salary run not found" },
        "409": { description: "Conflict - Only calculated run can be approved" }
      }
    }
  },
  "/salary/runs/{id}/pay": {
    post: {
      tags: ["Salary & Payroll"],
      summary: "Mark approved salary run paid",
      security: [{ bearerAuth: [] }],
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "Salary run ID" }],
      responses: {
        "200": {
          description: "Salary run marked paid",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/SalaryRun" } } } } }
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "404": { description: "Salary run not found" },
        "409": { description: "Conflict - Only approved run can be marked paid" }
      }
    }
  },
  "/salary/runs/{id}/lock": {
    post: {
      tags: ["Salary & Payroll"],
      summary: "Lock paid salary run",
      security: [{ bearerAuth: [] }],
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "Salary run ID" }],
      responses: {
        "200": {
          description: "Salary run locked",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/SalaryRun" } } } } }
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "404": { description: "Salary run not found" },
        "409": { description: "Conflict - Only paid run can be locked" }
      }
    }
  },
  "/salary/records": {
    get: {
      tags: ["Salary & Payroll"],
      summary: "List salary records",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "query", name: "salaryRunId", schema: { type: "string" }, description: "Filter by salary run ID" },
        { in: "query", name: "salaryRecordId", schema: { type: "string" }, description: "Filter by salary record ID" },
        { in: "query", name: "employeeId", schema: { type: "string" }, description: "Filter by employee ID" },
        { in: "query", name: "branchId", schema: { type: "string" }, description: "Filter by branch ID" },
        { in: "query", name: "payrollMonth", schema: { type: "integer", minimum: 1, maximum: 12 }, description: "Filter by payroll month (1-12)" },
        { in: "query", name: "payrollYear", schema: { type: "integer", minimum: 2000, maximum: 2100 }, description: "Filter by payroll year" },
        { in: "query", name: "status", schema: { type: "string", enum: ["DRAFT", "CALCULATED", "APPROVED", "PARTIALLY_PAID", "PAID", "LOCKED"] }, description: "Filter by status" }
      ],
      responses: {
        "200": {
          description: "List of employee salary records",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "array", items: { $ref: "#/components/schemas/SalaryRecord" } } } } } }
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" }
      }
    }
  },
  "/salary/entries": {
    get: {
      tags: ["Salary & Payroll"],
      summary: "List salary records/entries (alias)",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "query", name: "salaryRunId", schema: { type: "string" }, description: "Filter by salary run ID" },
        { in: "query", name: "salaryRecordId", schema: { type: "string" }, description: "Filter by salary record ID" },
        { in: "query", name: "employeeId", schema: { type: "string" }, description: "Filter by employee ID" },
        { in: "query", name: "branchId", schema: { type: "string" }, description: "Filter by branch ID" },
        { in: "query", name: "payrollMonth", schema: { type: "integer", minimum: 1, maximum: 12 }, description: "Filter by payroll month (1-12)" },
        { in: "query", name: "payrollYear", schema: { type: "integer", minimum: 2000, maximum: 2100 }, description: "Filter by payroll year" },
        { in: "query", name: "status", schema: { type: "string", enum: ["DRAFT", "CALCULATED", "APPROVED", "PARTIALLY_PAID", "PAID", "LOCKED"] }, description: "Filter by status" }
      ],
      responses: {
        "200": {
          description: "List of employee salary records",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "array", items: { $ref: "#/components/schemas/SalaryRecord" } } } } } }
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" }
      }
    }
  },
  "/salary/components": {
    get: {
      tags: ["Salary & Payroll"],
      summary: "List salary components",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "List of salary components",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "array", items: { $ref: "#/components/schemas/SalaryComponent" } } } } } }
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" }
      }
    },
    post: {
      tags: ["Salary & Payroll"],
      summary: "Create salary component",
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SalaryComponentInput" } } } },
      responses: {
        "201": {
          description: "Component created",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/SalaryComponent" } } } } }
        },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "409": { description: "Component code already exists" }
      }
    }
  },
  "/salary/structures": {
    get: {
      tags: ["Salary & Payroll"],
      summary: "List employee salary structures",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "query", name: "employeeId", schema: { type: "string" }, description: "Filter by employee ID" },
        { in: "query", name: "branchId", schema: { type: "string" }, description: "Filter by branch ID" },
        { in: "query", name: "isActive", schema: { type: "boolean" }, description: "Filter by active status" },
        { in: "query", name: "page", schema: { type: "integer", minimum: 1 }, description: "Page number" },
        { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100 }, description: "Page size" }
      ],
      responses: {
        "200": {
          description: "List of employee salary structures",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "array", items: { $ref: "#/components/schemas/EmployeeSalaryStructure" } } } } } }
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" }
      }
    },
    post: {
      tags: ["Salary & Payroll"],
      summary: "Create employee salary structure",
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SalaryStructureInput" } } } },
      responses: {
        "201": {
          description: "Structure created",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/EmployeeSalaryStructure" } } } } }
        },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" }
      }
    }
  },
  "/salary/adjustments": {
    get: {
      tags: ["Salary & Payroll"],
      summary: "List salary adjustments",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "query", name: "employeeId", schema: { type: "string" }, description: "Filter by employee ID" },
        { in: "query", name: "branchId", schema: { type: "string" }, description: "Filter by branch ID" },
        { in: "query", name: "payrollMonth", schema: { type: "integer", minimum: 1, maximum: 12 }, description: "Filter by payroll month" },
        { in: "query", name: "payrollYear", schema: { type: "integer", minimum: 2000, maximum: 2100 }, description: "Filter by payroll year" },
        { in: "query", name: "status", schema: { type: "string", enum: ["PENDING", "APPLIED", "CANCELLED"] }, description: "Filter by status" },
        { in: "query", name: "adjustmentType", schema: { type: "string", enum: ["INCENTIVE", "ADVANCE", "SHORTAGE", "WASTAGE", "EMPLOYEE_PURCHASE", "OTHER_DEDUCTION", "OTHER_EARNING"] }, description: "Filter by adjustment type" },
        { in: "query", name: "page", schema: { type: "integer", minimum: 1 }, description: "Page number" },
        { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100 }, description: "Page size" }
      ],
      responses: {
        "200": {
          description: "List of salary adjustments",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "array", items: { $ref: "#/components/schemas/SalaryAdjustment" } } } } } }
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" }
      }
    },
    post: {
      tags: ["Salary & Payroll"],
      summary: "Create monthly salary adjustment",
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SalaryAdjustmentInput" } } } },
      responses: {
        "201": {
          description: "Adjustment created",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/SalaryAdjustment" } } } } }
        },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "409": { description: "Conflict - Payroll run for period already finalized" }
      }
    }
  },
  "/salary/adjustments/{id}/cancel": {
    post: {
      tags: ["Salary & Payroll"],
      summary: "Cancel pending salary adjustment (POST)",
      security: [{ bearerAuth: [] }],
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "Salary adjustment ID" }],
      responses: {
        "200": {
          description: "Salary adjustment cancelled",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/SalaryAdjustment" } } } } }
        },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "404": { description: "Salary adjustment not found" },
        "409": { description: "Conflict - Adjustment is already applied, cancelled, or payroll run is finalized" }
      }
    },
    patch: {
      tags: ["Salary & Payroll"],
      summary: "Cancel pending salary adjustment (PATCH)",
      security: [{ bearerAuth: [] }],
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "Salary adjustment ID" }],
      responses: {
        "200": {
          description: "Salary adjustment cancelled",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/SalaryAdjustment" } } } } }
        },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "404": { description: "Salary adjustment not found" },
        "409": { description: "Conflict - Adjustment is already applied, cancelled, or payroll run is finalized" }
      }
    }
  },
  "/salary/loans": {
    get: {
      tags: ["Salary & Payroll"],
      summary: "List employee loans",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "query", name: "employeeId", schema: { type: "string" }, description: "Filter by employee ID" },
        { in: "query", name: "branchId", schema: { type: "string" }, description: "Filter by branch ID" },
        { in: "query", name: "status", schema: { type: "string", enum: ["ACTIVE", "CLOSED", "ON_HOLD"] }, description: "Filter by loan status" },
        { in: "query", name: "loanNumber", schema: { type: "string" }, description: "Filter by loan number" },
        { in: "query", name: "page", schema: { type: "integer", minimum: 1 }, description: "Page number" },
        { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100 }, description: "Page size" }
      ],
      responses: {
        "200": {
          description: "List of employee loans",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "array", items: { $ref: "#/components/schemas/EmployeeLoan" } } } } } }
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" }
      }
    },
    post: {
      tags: ["Salary & Payroll"],
      summary: "Create employee loan",
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/EmployeeLoanInput" } } } },
      responses: {
        "201": {
          description: "Loan created",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/EmployeeLoan" } } } } }
        },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" }
      }
    }
  },
  "/salary/loan-repayments": {
    get: {
      tags: ["Salary & Payroll"],
      summary: "List loan repayments",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "query", name: "employeeId", schema: { type: "string" }, description: "Filter by employee ID" },
        { in: "query", name: "employeeLoanId", schema: { type: "string" }, description: "Filter by loan ID" },
        { in: "query", name: "salaryRecordId", schema: { type: "string" }, description: "Filter by salary record ID" },
        { in: "query", name: "branchId", schema: { type: "string" }, description: "Filter by branch ID" },
        { in: "query", name: "payrollMonth", schema: { type: "integer", minimum: 1, maximum: 12 }, description: "Filter by payroll month" },
        { in: "query", name: "payrollYear", schema: { type: "integer", minimum: 2000, maximum: 2100 }, description: "Filter by payroll year" },
        { in: "query", name: "paymentMethod", schema: { type: "string", enum: ["SALARY_DEDUCTION", "CASH", "BANK_TRANSFER", "OTHER"] }, description: "Filter by payment method" },
        { in: "query", name: "page", schema: { type: "integer", minimum: 1 }, description: "Page number" },
        { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100 }, description: "Page size" }
      ],
      responses: {
        "200": {
          description: "List of loan repayments",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "array", items: { $ref: "#/components/schemas/LoanRepayment" } } } } } }
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" }
      }
    },
    post: {
      tags: ["Salary & Payroll"],
      summary: "Record loan repayment",
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoanRepaymentInput" } } } },
      responses: {
        "201": {
          description: "Repayment recorded",
          content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/LoanRepayment" } } } } }
        },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "409": { description: "Conflict - Loan closed or repayment duplicate" }
      }
    }
  }
};

const schemas = {
  SalaryRun: {
    type: "object",
    properties: {
      _id: { type: "string" },
      branchId: { type: "string" },
      payrollMonth: { type: "integer", minimum: 1, maximum: 12 },
      payrollYear: { type: "integer" },
      periodStart: { type: "string", format: "date-time" },
      periodEnd: { type: "string", format: "date-time" },
      status: { type: "string", enum: ["DRAFT", "CALCULATING", "CALCULATED", "APPROVED", "PAID", "LOCKED"] },
      calculationAttemptId: { type: "string", nullable: true },
      employeeCount: { type: "integer" },
      totalGrossPay: { type: "number" },
      totalDeductions: { type: "number" },
      totalNetPay: { type: "number" },
      calculatedAt: { type: "string", format: "date-time", nullable: true },
      approvedBy: { type: "string", nullable: true },
      approvedAt: { type: "string", format: "date-time", nullable: true },
      paidAt: { type: "string", format: "date-time", nullable: true },
      lockedAt: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    }
  },
  CreateSalaryRun: {
    type: "object",
    required: ["branchId", "payrollMonth", "payrollYear"],
    properties: {
      branchId: { type: "string" },
      payrollMonth: { type: "integer", minimum: 1, maximum: 12 },
      payrollYear: { type: "integer", minimum: 2000, maximum: 2100 }
    }
  },
  SalaryRecord: {
    type: "object",
    properties: {
      _id: { type: "string" },
      employeeId: { type: "string" },
      branchId: { type: "string" },
      attendancePolicyId: { type: "string", nullable: true },
      salaryRunId: { type: "string", nullable: true },
      payrollMonth: { type: "integer" },
      payrollYear: { type: "integer" },
      monthlySalary: { type: "number" },
      calendarDaysInMonth: { type: "integer" },
      monthlyLeaveAllowance: { type: "integer" },
      salaryCalculationDays: { type: "number" },
      requiredWorkingHoursPerDay: { type: "number" },
      daysToBeWorked: { type: "number" },
      daysWorked: { type: "number" },
      totalRegularHours: { type: "number" },
      totalWorkingHours: { type: "number" },
      totalOtHours: { type: "number" },
      hourlySalary: { type: "number" },
      perDaySalary: { type: "number" },
      salaryOfThisMonth: { type: "number" },
      otAmount: { type: "number" },
      mobileSubmissionIncentive: { type: "number" },
      otherIncentive: { type: "number" },
      advanceTakenInPresentMonth: { type: "number" },
      shortageDeduction: { type: "number" },
      wastageDeduction: { type: "number" },
      employeePurchaseDeduction: { type: "number" },
      loanEmi: { type: "number" },
      otherDeductions: { type: "number" },
      lopDays: { type: "number", description: "Loss of Pay days exceeding monthly leave allowance" },
      lopDeduction: { type: "number", description: "Calculated deduction for Loss of Pay days" },
      totalDeductions: { type: "number" },
      grossPay: { type: "number" },
      roundPay: { type: "number" },
      paid: { type: "number" },
      balance: { type: "number" },
      status: { type: "string", enum: ["DRAFT", "CALCULATED", "APPROVED", "PARTIALLY_PAID", "PAID", "LOCKED"] },
      createdBy: { type: "string", nullable: true },
      updatedBy: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    }
  },
  SalaryComponent: {
    type: "object",
    properties: {
      _id: { type: "string" },
      code: { type: "string" },
      name: { type: "string" },
      componentType: { type: "string", enum: ["EARNING", "DEDUCTION"] },
      calculationType: { type: "string", enum: ["FIXED", "PERCENTAGE", "PER_DAY", "PER_HOUR", "MANUAL"] },
      defaultAmount: { type: "number" },
      percentageOf: { type: "string" },
      isTaxable: { type: "boolean" },
      isActive: { type: "boolean" },
      description: { type: "string" }
    }
  },
  SalaryComponentInput: {
    type: "object",
    required: ["code", "name", "componentType"],
    properties: {
      code: { type: "string" },
      name: { type: "string" },
      componentType: { type: "string", enum: ["EARNING", "DEDUCTION"] },
      calculationType: { type: "string", enum: ["FIXED", "PERCENTAGE", "PER_DAY", "PER_HOUR", "MANUAL"] },
      defaultAmount: { type: "number", minimum: 0 }
    }
  },
  EmployeeSalaryStructure: {
    type: "object",
    properties: {
      _id: { type: "string" },
      employeeId: { type: "string" },
      branchId: { type: "string" },
      effectiveFrom: { type: "string", format: "date-time" },
      effectiveTo: { type: "string", format: "date-time", nullable: true },
      monthlySalary: { type: "number" },
      components: { type: "array", items: { type: "object" } },
      isActive: { type: "boolean" },
      remarks: { type: "string" }
    }
  },
  SalaryStructureInput: {
    type: "object",
    required: ["employeeId", "branchId", "effectiveFrom", "monthlySalary"],
    properties: {
      employeeId: { type: "string" },
      branchId: { type: "string" },
      effectiveFrom: { type: "string", format: "date-time" },
      effectiveTo: { type: "string", format: "date-time", nullable: true },
      monthlySalary: { type: "number", minimum: 0 },
      components: { type: "array", items: { type: "object" } }
    }
  },
  SalaryAdjustment: {
    type: "object",
    properties: {
      _id: { type: "string" },
      employeeId: { type: "string" },
      branchId: { type: "string" },
      salaryRunId: { type: "string", nullable: true },
      salaryRecordId: { type: "string", nullable: true },
      payrollMonth: { type: "integer", minimum: 1, maximum: 12 },
      payrollYear: { type: "integer" },
      adjustmentType: { type: "string", enum: ["INCENTIVE", "ADVANCE", "SHORTAGE", "WASTAGE", "EMPLOYEE_PURCHASE", "OTHER_DEDUCTION", "OTHER_EARNING"] },
      amount: { type: "number" },
      description: { type: "string" },
      status: { type: "string", enum: ["PENDING", "APPLIED", "CANCELLED"] },
      appliedAt: { type: "string", format: "date-time", nullable: true }
    }
  },
  SalaryAdjustmentInput: {
    type: "object",
    required: ["employeeId", "branchId", "payrollMonth", "payrollYear", "adjustmentType", "amount", "description"],
    properties: {
      employeeId: { type: "string" },
      branchId: { type: "string" },
      payrollMonth: { type: "integer", minimum: 1, maximum: 12 },
      payrollYear: { type: "integer", minimum: 2000, maximum: 2100 },
      adjustmentType: { type: "string", enum: ["INCENTIVE", "ADVANCE", "SHORTAGE", "WASTAGE", "EMPLOYEE_PURCHASE", "OTHER_DEDUCTION", "OTHER_EARNING"] },
      amount: { type: "number", minimum: 0.01 },
      description: { type: "string" },
      salaryRecordId: { type: "string" }
    }
  },
  EmployeeLoan: {
    type: "object",
    properties: {
      _id: { type: "string" },
      employeeId: { type: "string" },
      branchId: { type: "string" },
      loanNumber: { type: "string" },
      loanAmount: { type: "number" },
      loanDate: { type: "string", format: "date-time" },
      emiAmount: { type: "number" },
      totalRepaid: { type: "number" },
      outstandingBalance: { type: "number" },
      status: { type: "string", enum: ["ACTIVE", "CLOSED", "ON_HOLD"] },
      remarks: { type: "string" },
      createdBy: { type: "string", nullable: true },
      updatedBy: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    }
  },
  EmployeeLoanInput: {
    type: "object",
    required: ["employeeId", "branchId", "loanAmount", "loanDate", "emiAmount"],
    properties: {
      employeeId: { type: "string" },
      branchId: { type: "string" },
      loanNumber: { type: "string" },
      loanAmount: { type: "number", minimum: 0.01 },
      loanDate: { type: "string", format: "date-time" },
      emiAmount: { type: "number", minimum: 0.01 },
      remarks: { type: "string" }
    }
  },
  LoanRepayment: {
    type: "object",
    properties: {
      _id: { type: "string" },
      employeeLoanId: { type: "string" },
      employeeId: { type: "string" },
      salaryRecordId: { type: "string", nullable: true },
      salaryRunId: { type: "string", nullable: true },
      repaymentNumber: { type: "integer" },
      repaymentDate: { type: "string", format: "date-time" },
      payrollMonth: { type: "integer", nullable: true },
      payrollYear: { type: "integer", nullable: true },
      amount: { type: "number" },
      previousBalance: { type: "number" },
      remainingBalance: { type: "number" },
      paymentMethod: { type: "string", enum: ["SALARY_DEDUCTION", "CASH", "BANK_TRANSFER", "OTHER"] },
      remarks: { type: "string" },
      createdBy: { type: "string", nullable: true },
      updatedBy: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    }
  },
  LoanRepaymentInput: {
    type: "object",
    required: ["employeeLoanId", "amount"],
    properties: {
      employeeLoanId: { type: "string" },
      branchId: { type: "string" },
      amount: { type: "number", minimum: 0.01 },
      repaymentDate: { type: "string", format: "date-time" },
      paymentMethod: { type: "string", enum: ["SALARY_DEDUCTION", "CASH", "BANK_TRANSFER", "OTHER"] },
      salaryRecordId: { type: "string" },
      repaymentNumber: { type: "integer", minimum: 1 },
      payrollMonth: { type: "integer", minimum: 1, maximum: 12 },
      payrollYear: { type: "integer", minimum: 2000, maximum: 2100 },
      remarks: { type: "string" },
      notes: { type: "string" }
    }
  }
};

module.exports = { paths, schemas };
