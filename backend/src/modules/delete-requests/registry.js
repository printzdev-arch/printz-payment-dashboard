/**
 * Records that a manager cannot delete directly: the request goes to an admin first.
 *
 * To put another delete behind approval:
 *   1. add an entry here (how to load it, what to call it, how to delete it), and
 *   2. add `requireDeleteApproval("<key>")` to that DELETE route, just before its controller.
 *
 * load(id)      returns the record (lean) or null
 * label(doc)    short text the admin reads in the list
 * branchOf(doc) { id, name } of the branch the record belongs to, when it has one
 * perform(id, ctx)  deletes it through the same service the direct delete uses, so its own checks still run
 *                   ctx = { user, authz } of the admin who approved
 */
const lazy = (path) => () => require(path);

// Some older models define their own findById (it returns the record, not a query), so await it and flatten
const loadDoc = async (Model, id) => {
  const doc = await Model.findById(id);
  return doc && typeof doc.toObject === "function" ? doc.toObject() : doc || null;
};

const dateText = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");

const REGISTRY = {
  stockItem: {
    label: "Stock item",
    load: (id) => loadDoc(lazy("../stocks/models/StockItem")(), id),
    describe: (d) => d.itemName || d.stockId || "Stock item",
    branchOf: (d) => ({ id: d.branchId, name: "" }),
    perform: (id) => lazy("../stocks/services/stock.service")().deleteStockItem(id),
  },
  stockReading: {
    label: "Stock reading",
    load: (id) => loadDoc(lazy("../stocks/models/StockReading")(), id),
    describe: (d) => `Stock reading ${dateText(d.date || d.dateAt)}`.trim(),
    branchOf: (d) => ({ id: d.branchId, name: d.branchName || d.branch || "" }),
    perform: (id) => lazy("../stocks/services/stock.service")().deleteStockReading(id),
  },
  totalAmount: {
    label: "Revenue record",
    load: (id) => loadDoc(lazy("../printers/models/TotalAmountReading")(), id),
    describe: (d) => `Revenue record ${dateText(d.date || d.dateAt)}${d.totalAmount != null ? ` (total ${d.totalAmount})` : ""}`.trim(),
    branchOf: (d) => ({ id: d.branchId, name: d.branchName || d.branch || "" }),
    perform: (id) => lazy("../printers/services/totalAmount.service")().deleteTotalAmount(id),
  },
  payment: {
    label: "Payment to collect",
    load: (id) => loadDoc(lazy("../invoices/models/PaymentToBeCollected")(), id),
    describe: (d) => `Payment to collect ${dateText(d.date || d.dateAt)}${d.paymentToBeCollected != null ? ` (${d.paymentToBeCollected})` : ""}`.trim(),
    branchOf: (d) => ({ id: d.branchId, name: "" }),
    perform: (id) => lazy("../invoices/services/payment.service")().deletePayment(id),
  },
  customer: {
    label: "Customer",
    load: (id) => loadDoc(lazy("../customers/models/Customer")(), id),
    describe: (d) => [d.name, d.mobile].filter(Boolean).join(" - ") || d.customerCode || "Customer",
    branchOf: (d) => ({ id: d.branchId || d.primaryBranchId, name: "" }),
    // An admin approves, so the delete runs with full scope
    perform: (id, ctx) =>
      lazy("../customers/services/customer.service")().deleteCustomer(id, {
        user: ctx.user,
        isSuperAdmin: true,
        scopes: ["ALL"],
        authorizedBranchIds: [],
      }),
  },
  printer: {
    label: "Printer",
    load: (id) => loadDoc(lazy("../printers/models/Printer")(), id),
    describe: (d) => d.printerName || d.model || "Printer",
    branchOf: (d) => ({ id: d.branchId, name: d.branchName || "" }),
    perform: (id) => lazy("../printers/services/printer.service")().deletePrinter(id),
  },
  printerReading: {
    label: "Printer reading",
    load: (id) => loadDoc(lazy("../printers/models/PrinterReading")(), id),
    describe: (d) => `Printer reading ${dateText(d.date || d.dateAt)}`.trim(),
    branchOf: (d) => ({ id: d.branchId, name: d.branchName || d.branch || "" }),
    perform: (id) => lazy("../printers/services/printerReading.service")().deleteReading(id),
  },
};

module.exports = REGISTRY;
