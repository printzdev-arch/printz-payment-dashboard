/**
 * Module: number-sequences
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  controllers: {
    get numberSequence() {
      return require("./controllers/numberSequence.controller");
    },
  },
  helpers: {
    get SequenceHelper() {
      return require("./services/SequenceHelper");
    },
  },
  models: {
    get NumberSequence() {
      return require("./models/NumberSequence");
    },
    get Sequence() {
      return require("./models/Sequence");
    },
  },
  routes: {
    get numberSequence() {
      return require("./routes/numberSequence.routes");
    },
  },
  services: {
    get numberSequence() {
      return require("./services/numberSequence.service");
    },
  },
};
