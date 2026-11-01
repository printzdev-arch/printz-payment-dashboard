/**
 * Module: printers
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get jumboXerox() {
      return require("./controllers/jumboXerox.controller");
    },
    get printer() {
      return require("./controllers/printer.controller");
    },
    get printerReading() {
      return require("./controllers/printerReading.controller");
    },
    get totalAmount() {
      return require("./controllers/totalAmount.controller");
    },
  },
  dto: {
    get JumboXeroxDto() {
      return require("./dto/JumboXeroxDto");
    },
    get PrinterDto() {
      return require("./dto/PrinterDto");
    },
    get PrinterReadingDto() {
      return require("./dto/PrinterReadingDto");
    },
    get TotalAmountDto() {
      return require("./dto/TotalAmountDto");
    },
  },
  models: {
    get JumboXerox() {
      return require("./models/JumboXerox");
    },
    get JumboXeroxReading() {
      return require("./models/JumboXeroxReading");
    },
    get Printer() {
      return require("./models/Printer");
    },
    get PrinterReading() {
      return require("./models/PrinterReading");
    },
    get TotalAmountReading() {
      return require("./models/TotalAmountReading");
    },
  },
  routes: {
    get jumboXerox() {
      return require("./routes/jumboXerox.routes");
    },
    get printer() {
      return require("./routes/printer.routes");
    },
    get printerReading() {
      return require("./routes/printerReading.routes");
    },
    get totalAmount() {
      return require("./routes/totalAmount.routes");
    },
  },
  services: {
    get jumboXerox() {
      return require("./services/jumboXerox.service");
    },
    get printer() {
      return require("./services/printer.service");
    },
    get printerReading() {
      return require("./services/printerReading.service");
    },
    get totalAmount() {
      return require("./services/totalAmount.service");
    },
  },
};
