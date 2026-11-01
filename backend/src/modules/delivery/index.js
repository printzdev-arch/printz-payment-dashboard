/**
 * Module: delivery
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get deliveryConstants() {
      return require("./constants/deliveryConstants");
    },
  },
  controllers: {
    get deliveryOrder() {
      return require("./controllers/deliveryOrder.controller");
    },
    get deliveryProof() {
      return require("./controllers/deliveryProof.controller");
    },
  },
  dto: {
    get DeliveryOrderDto() {
      return require("./dto/DeliveryOrderDto");
    },
  },
  models: {
    get DeliveryOrder() {
      return require("./models/DeliveryOrder");
    },
    get DeliveryProof() {
      return require("./models/DeliveryProof");
    },
  },
  routes: {
    get deliveryOrders() {
      return require("./routes/deliveryOrders.routes");
    },
    get deliveryProofs() {
      return require("./routes/deliveryProofs.routes");
    },
  },
  services: {
    get deliveryOrder() {
      return require("./services/deliveryOrder.service");
    },
    get deliveryProof() {
      return require("./services/deliveryProof.service");
    },
  },
  validators: {
    get delivery() {
      return require("./validators/delivery.validator");
    },
  },
};
