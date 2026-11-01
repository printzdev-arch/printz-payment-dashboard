const CustomerHelper = {
  formatCustomerName: (firstName, lastName) => {
    return [firstName, lastName].filter(Boolean).join(" ").trim();
  },
  sanitizePhone: (phone) => {
    if (!phone) return "";
    return phone.replace(/[^0-9+]/g, "");
  },
};

module.exports = CustomerHelper;
