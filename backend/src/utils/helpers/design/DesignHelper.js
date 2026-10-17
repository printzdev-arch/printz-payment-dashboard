const DesignHelper = {
  isDesignFinished: (status) => {
    return ["ACCEPTED", "COMPLETED", "APPROVED"].includes(status);
  },
};

module.exports = DesignHelper;
