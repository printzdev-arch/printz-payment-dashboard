/**
 * Module: past-date-requests
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get pastDateRequest() {
      return require("./controllers/pastDateRequest.controller");
    },
  },
  dto: {
    get PastDateRequestDto() {
      return require("./models/PastDateRequestDto");
    },
  },
  models: {
    get FinalizedDate() {
      return require("./models/FinalizedDate");
    },
    get PastDateRequest() {
      return require("./models/PastDateRequest");
    },
  },
  routes: {
    get pastDateRequest() {
      return require("./routes/pastDateRequest.routes");
    },
  },
  services: {
    get pastDateRequest() {
      return require("./services/pastDateRequest.service");
    },
  },
};
