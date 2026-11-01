/**
 * Module: attachments
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get attachment() {
      return require("./controllers/attachment.controller");
    },
  },
  models: {
    get Attachment() {
      return require("./models/Attachment");
    },
  },
  routes: {
    get attachment() {
      return require("./routes/attachment.routes");
    },
  },
  services: {
    get attachment() {
      return require("./services/attachment.service");
    },
  },
};
