const express = require("express");
const { requireAdmin } = require("../../../middleware/security/admin.middleware");
const router = express.Router();
const controller = require("../controllers/salary.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { requirePermission } = require("../../../middleware/security/permission.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");
const { salaryProcessingGuard } = require("../../../middleware/guards/salaryProcessingGuard.middleware");
const {
  runIdParamValidator,
  createRunValidator,
  listRunsQueryValidator,
  listEntriesQueryValidator,
  listRecordsQueryValidator,
  componentValidator,
  componentIdParamValidator,
  structureValidator,
  adjustmentValidator,
  adjustmentIdParamValidator,
  structureIdParamValidator,
  listStructuresQueryValidator,
  listAdjustmentsQueryValidator,
  listLoansQueryValidator,
  listRepaymentsQueryValidator,
  loanValidator,
  loanSkipValidator,
  repaymentValidator,
} = require("./validators");

router.use(authenticate);
router.use(salaryProcessingGuard);

// Salary runs and processing
router.get("/processing-status", controller.getProcessingStatus);
router.get("/runs",requirePermission(PERMISSIONS.HR.SALARY_VIEW, { branchField: "branchId" }), listRunsQueryValidator, controller.listRuns);
router.post("/runs", requirePermission(PERMISSIONS.HR.SALARY_PROCESS, { branchField: "branchId" }), createRunValidator, controller.createRun);
router.get("/runs/:id", requirePermission(PERMISSIONS.HR.SALARY_VIEW, { branchField: "branchId" }), runIdParamValidator, controller.getRun);
router.post("/runs/:id/calculate", requirePermission(PERMISSIONS.HR.SALARY_PROCESS, { branchField: "branchId" }), runIdParamValidator, controller.calculateRun);
router.post("/runs/:id/approve", requirePermission(PERMISSIONS.HR.SALARY_APPROVE, { branchField: "branchId" }), runIdParamValidator, controller.approveRun);
router.post("/runs/:id/pay", requirePermission(PERMISSIONS.HR.SALARY_PROCESS, { branchField: "branchId" }), runIdParamValidator, controller.payRun);
router.post("/runs/:id/reopen", requirePermission(PERMISSIONS.HR.SALARY_APPROVE, { branchField: "branchId" }), runIdParamValidator, controller.reopenRun);
router.post("/runs/:id/lock", requirePermission(PERMISSIONS.HR.SALARY_PROCESS, { branchField: "branchId" }), runIdParamValidator, controller.lockRun);
router.get("/records", requirePermission(PERMISSIONS.HR.SALARY_VIEW, { branchField: "branchId" }), listRecordsQueryValidator, controller.listRecords);
router.get("/entries", requirePermission(PERMISSIONS.HR.SALARY_VIEW, { branchField: "branchId" }), listEntriesQueryValidator, controller.listEntries);

// Salary components and employee salary structures
router.get("/components", requirePermission(PERMISSIONS.HR.SALARY_VIEW, { branchField: "branchId" }), controller.listComponents);
router.post("/components", requirePermission(PERMISSIONS.HR.SALARY_CONFIGURE, { branchField: "branchId" }), requireAdmin, componentValidator, controller.createComponent);
router.put("/components/:id", requirePermission(PERMISSIONS.HR.SALARY_CONFIGURE, { branchField: "branchId" }), requireAdmin, componentIdParamValidator, componentValidator, controller.updateComponent);
router.delete("/components/:id", requirePermission(PERMISSIONS.HR.SALARY_CONFIGURE, { branchField: "branchId" }), requireAdmin, componentIdParamValidator, controller.deleteComponent);
router.get("/structures", requirePermission(PERMISSIONS.HR.SALARY_VIEW, { branchField: "branchId" }), listStructuresQueryValidator, controller.listStructures);
router.post("/structures", requirePermission(PERMISSIONS.HR.SALARY_CONFIGURE, { branchField: "branchId" }), requireAdmin, structureValidator, controller.createStructure);
router.delete("/structures/:id", requirePermission(PERMISSIONS.HR.SALARY_CONFIGURE, { branchField: "branchId" }), requireAdmin, structureIdParamValidator, controller.deleteStructure);

// Salary adjustments
router.get("/adjustments", requirePermission(PERMISSIONS.HR.SALARY_VIEW, { branchField: "branchId" }), listAdjustmentsQueryValidator, controller.listAdjustments);
router.post("/adjustments", requirePermission(PERMISSIONS.HR.SALARY_CONFIGURE, { branchField: "branchId" }), adjustmentValidator, controller.createAdjustment);
router.post("/adjustments/:id/cancel", requirePermission(PERMISSIONS.HR.SALARY_CONFIGURE, { branchField: "branchId" }), adjustmentIdParamValidator, controller.cancelAdjustment);

// Loans and repayments
router.get("/loans", requirePermission(PERMISSIONS.HR.SALARY_VIEW, { branchField: "branchId" }), listLoansQueryValidator, controller.listLoans);
router.post("/loans/:id/skip-month", requirePermission(PERMISSIONS.HR.SALARY_CONFIGURE, { branchField: "branchId" }), loanSkipValidator, controller.skipLoanMonth);
router.post("/loans/:id/unskip-month", requirePermission(PERMISSIONS.HR.SALARY_CONFIGURE, { branchField: "branchId" }), loanSkipValidator, controller.unskipLoanMonth);
router.post("/loans",requirePermission(PERMISSIONS.HR.SALARY_CONFIGURE, { branchField: "branchId" }), loanValidator, controller.createLoan);
router.get("/loan-repayments", requirePermission(PERMISSIONS.HR.SALARY_VIEW, { branchField: "branchId" }), listRepaymentsQueryValidator, controller.listRepayments);
router.post("/loan-repayments", requirePermission(PERMISSIONS.HR.SALARY_PROCESS, { branchField: "branchId" }), repaymentValidator, controller.createRepayment);

module.exports = router;
