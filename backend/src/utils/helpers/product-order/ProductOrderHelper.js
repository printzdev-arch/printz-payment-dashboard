const ProductOrderHelper = {
  calculateTotal: (items = []) => {
    return items.reduce((acc, item) => acc + (item.quantity || 0) * (item.unitPrice || 0), 0);
  },
};

module.exports = ProductOrderHelper;
