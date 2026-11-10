/**
 * Module: public
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get publicDesignApproval() {
      return require("./controllers/publicDesignApproval.controller");
    },
    get publicJobRequest() {
      return require("./controllers/publicJobRequest.controller");
    },
  },
  dto: {
    get PublicDesignApprovalDto() {
      return require("./models/PublicDesignApprovalDto");
    },
    get PublicJobRequestDto() {
      return require("./models/PublicJobRequestDto");
    },
  },
  routes: {
    get public() {
      return require("./routes/public.routes");
    },
  },
  services: {
    get publicDesignApproval() {
      return require("./services/publicDesignApproval.service");
    },
    get publicJobRequest() {
      return require("./services/publicJobRequest.service");
    },
  },
  validators: {
    get publicDesignApproval() {
      return require("./routes/publicDesignApproval.validator");
    },
    get publicJobRequest() {
      return require("./routes/publicJobRequest.validator");
    },
  },
};
