/**
 * Module: notifications
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  models: {
    get Notification() {
      return require("./models/Notification");
    },
  },
};
