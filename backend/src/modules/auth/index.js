/**
 * Module: auth
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get index() {
      return require("./models/constants");
    },
  },
  controllers: {
    get auth() {
      return require("./controllers/auth.controller");
    },
    get role() {
      return require("./controllers/role.controller");
    },
    get user() {
      return require("./controllers/user.controller");
    },
  },
  dto: {
    get AuthDto() {
      return require("./models/AuthDto");
    },
    get RoleDto() {
      return require("./models/RoleDto");
    },
    get UserDto() {
      return require("./models/UserDto");
    },
  },
  events: {
    get "authEvents.emitter"() {
      return require("./services/authEvents.emitter");
    },
  },
  helpers: {
    get AuthHelper() {
      return require("./services/AuthHelper");
    },
  },
  models: {
    get Permission() {
      return require("./models/Permission");
    },
    get Role() {
      return require("./models/Role");
    },
    get User() {
      return require("./models/User");
    },
  },
  routes: {
    get auth() {
      return require("./routes/auth.routes");
    },
    get permission() {
      return require("./routes/permission.routes");
    },
    get role() {
      return require("./routes/role.routes");
    },
    get user() {
      return require("./routes/user.routes");
    },
  },
  services: {
    get auth() {
      return require("./services/auth.service");
    },
    get role() {
      return require("./services/role.service");
    },
    get user() {
      return require("./services/user.service");
    },
  },
  validators: {
    get auth() {
      return require("./routes/auth.validator");
    },
    get user() {
      return require("./routes/user.validator");
    },
  },
};
