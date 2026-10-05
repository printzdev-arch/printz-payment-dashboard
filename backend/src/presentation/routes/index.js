const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const printerRoutes = require("./printer.routes");
const printerReadingRoutes = require("./printerReading.routes");
const jumboXeroxRoutes = require("./jumboXerox.routes");
const totalAmountRoutes = require("./totalAmount.routes");
const stockRoutes = require("./stock.routes");
const pastDateRequestRoutes = require("./pastDateRequest.routes");
const paymentRoutes = require("./payment.routes");
const branchRoutes = require("./branch.routes");
const reportRoutes = require("./report.routes");
const generalRoutes = require("./general.routes");

// Mount modular sub-routers
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/printers", printerRoutes);
router.use("/printer-readings", printerReadingRoutes);
router.use("/jumbo-xerox", jumboXeroxRoutes);
router.use("/total-amounts", totalAmountRoutes);
router.use("/stocks", stockRoutes);
router.use("/past-date-requests", pastDateRequestRoutes);
router.use("/payments", paymentRoutes);
router.use("/branches", branchRoutes);
router.use("/reports", reportRoutes);
router.use("/general", generalRoutes);

module.exports = router;
