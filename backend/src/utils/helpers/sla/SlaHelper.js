const SlaHelper = {
  isBreached: (deadline, actualTime = new Date()) => {
    if (!deadline) return false;
    return new Date(actualTime) > new Date(deadline);
  },
};

module.exports = SlaHelper;
