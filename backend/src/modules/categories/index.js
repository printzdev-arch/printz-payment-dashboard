/**
 * Module: categories
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  dto: {
    get CategoryDto() {
      return require("./models/CategoryDto");
    },
  },
  models: {
    get Category() {
      return require("./models/Category");
    },
  },
};
