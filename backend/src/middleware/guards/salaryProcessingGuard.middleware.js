const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Kill switch: SALARY_PROCESSING_ENABLED=false suspends every salary write
// operation while read endpoints keep working.
const isSalaryProcessingEnabled = () =>
  String(process.env.SALARY_PROCESSING_ENABLED ?? "true").trim().toLowerCase() !== "false";

const salaryProcessingGuard = (req, res, next) => {
  if (READ_METHODS.has(req.method) || isSalaryProcessingEnabled()) return next();
  return res.status(503).json({
    success: false,
    message: "Salary and payroll processing is temporarily suspended for maintenance.",
    code: "SALARY_PROCESSING_DISABLED",
  });
};

module.exports = { salaryProcessingGuard, isSalaryProcessingEnabled };
