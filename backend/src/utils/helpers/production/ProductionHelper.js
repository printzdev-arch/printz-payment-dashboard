const ProductionHelper = {
  isOperationFinished: (status) => {
    return ["COMPLETED", "SKIPPED"].includes(status);
  },
};

module.exports = ProductionHelper;
