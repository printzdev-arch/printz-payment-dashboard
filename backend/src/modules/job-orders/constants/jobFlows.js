/**
 * Job type flows (Module 06)
 *
 * Print Only       : Customer -> Job Order -> Estimation -> Invoice -> Production -> QC (optional) -> Settle Balance
 *                    -> Delivery -> Close (no design)
 * Design Only      : Customer -> Job Order -> Estimation -> Invoice -> Design -> Settle Balance
 * Print & Design   : Customer -> Job Order -> Estimation -> Invoice -> Design -> Production -> QC -> Settle Balance
 *                    -> Delivery -> Close
 *
 * The balance is always settled before the goods are delivered.
 */

const { JOB_STAGES } = require("./jobStages");

const FLOW_TYPES = {
  PRINT_ONLY: "PRINT_ONLY",
  DESIGN_ONLY: "DESIGN_ONLY",
  PRINT_AND_DESIGN: "PRINT_AND_DESIGN",
};

const getFlowType = (job) => {
  const jobTypeStr = String(job?.jobType || job?.specs?.jobType || "").toUpperCase();
  const hasPrint = jobTypeStr.includes("PRINT");
  const hasDesign = jobTypeStr.includes("DESIGN");
  if (hasPrint && !hasDesign) return FLOW_TYPES.PRINT_ONLY;
  if (hasDesign && !hasPrint) return FLOW_TYPES.DESIGN_ONLY;
  return FLOW_TYPES.PRINT_AND_DESIGN;
};

const EARLY_STAGES = [
  JOB_STAGES.ENQUIRY,
  JOB_STAGES.ESTIMATION,
  JOB_STAGES.ESTIMATE_APPROVAL,
  JOB_STAGES.DESIGN_QUEUE,
  JOB_STAGES.DESIGN_ASSIGNED,
  JOB_STAGES.DESIGN_IN_PROGRESS,
  JOB_STAGES.SAMPLE_APPROVAL,
  JOB_STAGES.REVISION,
];

// Stages a job of this type may be in at all. Print & Design uses every stage.
const FLOW_STAGES = {
  // Print Only skips design only
  [FLOW_TYPES.PRINT_ONLY]: [
    JOB_STAGES.ENQUIRY,
    JOB_STAGES.ESTIMATION,
    JOB_STAGES.ESTIMATE_APPROVAL,
    JOB_STAGES.PRODUCTION_PLANNING,
    JOB_STAGES.PRINTING,
    JOB_STAGES.FINISHING,
    JOB_STAGES.PACKING,
    JOB_STAGES.QC,
    JOB_STAGES.REWORK,
    JOB_STAGES.REPRINT,
    JOB_STAGES.READY,
    JOB_STAGES.DELIVERY,
    JOB_STAGES.COMPLETED,
  ],
  [FLOW_TYPES.DESIGN_ONLY]: [
    JOB_STAGES.ENQUIRY,
    JOB_STAGES.ESTIMATION,
    JOB_STAGES.ESTIMATE_APPROVAL,
    JOB_STAGES.DESIGN_QUEUE,
    JOB_STAGES.DESIGN_ASSIGNED,
    JOB_STAGES.DESIGN_IN_PROGRESS,
    JOB_STAGES.SAMPLE_APPROVAL,
    JOB_STAGES.REVISION,
    JOB_STAGES.READY,
    JOB_STAGES.COMPLETED,
  ],
  [FLOW_TYPES.PRINT_AND_DESIGN]: null,
};

/**
 * Returns an error message when moving `job` from `fromStage` to `toStage` breaks the job type's flow,
 * or null when the move is fine.
 */
const getFlowViolation = (job, fromStage, toStage) => {
  const flowType = getFlowType(job);
  const allowed = FLOW_STAGES[flowType];

  if (allowed) {
    // Jobs already sitting in a stage outside their flow (created before these rules) are left alone
    if (!allowed.includes(fromStage)) return null;
    if (!allowed.includes(toStage)) {
      return flowType === FLOW_TYPES.PRINT_ONLY
        ? `Print Only jobs have no design stage ('${toStage}' is not permitted).`
        : `Design Only jobs never enter production, QC or delivery ('${toStage}' is not permitted).`;
    }
    if (flowType === FLOW_TYPES.DESIGN_ONLY && toStage === JOB_STAGES.COMPLETED && fromStage !== JOB_STAGES.READY) {
      return "Design Only jobs complete only after the design is approved and the balance is settled.";
    }
    if (flowType === FLOW_TYPES.PRINT_ONLY) {
      // Same rules as Print & Design from here on: production first, and complete only after delivery
      if (toStage === JOB_STAGES.COMPLETED && fromStage !== JOB_STAGES.DELIVERY) {
        return "Print Only jobs complete only after delivery.";
      }
      if (toStage === JOB_STAGES.READY && EARLY_STAGES.includes(fromStage)) {
        return "Print Only jobs cannot be marked Ready before production.";
      }
    }
    return null;
  }

  // Print & Design: design, production, QC and delivery cannot be skipped
  if (toStage === JOB_STAGES.COMPLETED && fromStage !== JOB_STAGES.DELIVERY) {
    return "Print & Design jobs complete only after delivery.";
  }
  if (toStage === JOB_STAGES.READY && EARLY_STAGES.includes(fromStage)) {
    return "Print & Design jobs cannot be marked Ready before production and QC.";
  }
  if (
    toStage === JOB_STAGES.PRODUCTION_PLANNING &&
    [
      JOB_STAGES.ENQUIRY,
      JOB_STAGES.ESTIMATION,
      JOB_STAGES.ESTIMATE_APPROVAL,
      JOB_STAGES.DESIGN_QUEUE,
      JOB_STAGES.DESIGN_ASSIGNED,
    ].includes(fromStage)
  ) {
    return "Print & Design jobs cannot skip the design stage.";
  }
  return null;
};

module.exports = {
  FLOW_TYPES,
  FLOW_STAGES,
  getFlowType,
  getFlowViolation,
};
