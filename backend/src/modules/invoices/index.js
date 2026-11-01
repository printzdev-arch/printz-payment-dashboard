/**
 * Module: invoices
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  constants: {
    get invoice() {
      return require("./constants/invoice");
    },
  },
  controllers: {
    get invoice() {
      return require("./controllers/invoice.controller");
    },
    get payment() {
      return require("./controllers/payment.controller");
    },
  },
  dto: {
    get InvoiceDto() {
      return require("./dto/InvoiceDto");
    },
    get PaymentDto() {
      return require("./dto/PaymentDto");
    },
  },
  models: {
    get Invoice() {
      return require("./models/Invoice");
    },
    get InvoiceReminder() {
      return require("./models/InvoiceReminder");
    },
    get Payment() {
      return require("./models/Payment");
    },
    get PaymentToBeCollected() {
      return require("./models/PaymentToBeCollected");
    },
  },
  routes: {
    get invoice() {
      return require("./routes/invoice.routes");
    },
    get payment() {
      return require("./routes/payment.routes");
    },
  },
  services: {
    get invoice() {
      return require("./services/invoice.service");
    },
    get invoiceCalculation() {
      return require("./services/invoiceCalculation.service");
    },
    get invoicePdf() {
      return require("./services/invoicePdf.service");
    },
    get payment() {
      return require("./services/payment.service");
    },
  },
  validators: {
    get invoice() {
      return require("./validators/invoice.validator");
    },
  },
};
