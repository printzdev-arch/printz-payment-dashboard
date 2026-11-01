/**
 * Module: branches
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get branch() {
      return require("./controllers/branch.controller");
    },
  },
  dto: {
    get BranchDto() {
      return require("./dto/BranchDto");
    },
  },
  models: {
    get Branch() {
      return require("./models/Branch");
    },
  },
  routes: {
    get branch() {
      return require("./routes/branch.routes");
    },
  },
  services: {
    get branch() {
      return require("./services/branch.service");
    },
  },
};
