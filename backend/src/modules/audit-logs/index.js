/**
 * Module: audit-logs
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get auditLog() {
      return require("./controllers/auditLog.controller");
    },
  },
  helpers: {
    get AuditHelper() {
      return require("./helpers/AuditHelper");
    },
  },
  models: {
    get AuditLog() {
      return require("./models/AuditLog");
    },
  },
  routes: {
    get auditLog() {
      return require("./routes/auditLog.routes");
    },
  },
  services: {
    get auditLog() {
      return require("./services/auditLog.service");
    },
  },
};
