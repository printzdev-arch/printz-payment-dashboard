/**
 * Module: stocks
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get stock() {
      return require("./controllers/stock.controller");
    },
  },
  dto: {
    get StockDto() {
      return require("./models/StockDto");
    },
  },
  models: {
    get StockItem() {
      return require("./models/StockItem");
    },
    get StockReading() {
      return require("./models/StockReading");
    },
  },
  routes: {
    get stock() {
      return require("./routes/stock.routes");
    },
  },
  services: {
    get stock() {
      return require("./services/stock.service");
    },
  },
};
