/**
 * Module: settings
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get masterSetting() {
      return require("./controllers/masterSetting.controller");
    },
  },
  models: {
    get MasterCategory() {
      return require("./models/MasterCategory");
    },
    get MasterDefault() {
      return require("./models/MasterDefault");
    },
    get MasterSetting() {
      return require("./models/MasterSetting");
    },
  },
  routes: {
    get masterSetting() {
      return require("./routes/masterSetting.routes");
    },
  },
  services: {
    get masterSeeds() {
      return require("./services/masterSeeds");
    },
    get masterSetting() {
      return require("./services/masterSetting.service");
    },
  },
};
