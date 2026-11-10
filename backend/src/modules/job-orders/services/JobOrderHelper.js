const JobOrderHelper = {
  isTerminalStage: (stage) => {
    return ["CLOSED", "CANCELLED", "COMPLETED", "DELIVERED"].includes(stage);
  },
};

module.exports = JobOrderHelper;
