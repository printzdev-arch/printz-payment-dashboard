/**
 * Module: categories
 * Lazy exports: nothing is loaded until it is read.
 */
module.exports = {
  dto: {
    get CategoryDto() {
      return require("./dto/CategoryDto");
    },
  },
  models: {
    get Category() {
      return require("./models/Category");
    },
  },
};
