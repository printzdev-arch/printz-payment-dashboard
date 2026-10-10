const express = require("express");
const router = express.Router();
const customerController = require("../../controllers/customer/customer.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/permission.middleware");
const PERMISSIONS = require("../../../shared/constants/permissions");
const {
  createCustomerValidator,
  updateCustomerValidator,
  searchCustomerValidator,
} = require("../../validators/customer/customer.validator");

router.use(authenticate);

// Search customers (fast lookup for POS & Job Order)
router.get(
  "/search",
  requirePermission(PERMISSIONS.CUSTOMER.VIEW),
  searchCustomerValidator,
  customerController.searchCustomers
);

// List customers with pagination & filters
router.get(
  "/",
  requirePermission(PERMISSIONS.CUSTOMER.VIEW),
  customerController.getCustomers
);

// Get customer by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.CUSTOMER.VIEW),
  customerController.getCustomerById
);

// Create customer
router.post(
  "/",
  requirePermission(PERMISSIONS.CUSTOMER.CREATE),
  createCustomerValidator,
  customerController.createCustomer
);

// Update customer
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.CUSTOMER.UPDATE),
  updateCustomerValidator,
  customerController.updateCustomer
);

// Deactivate customer
router.post(
  "/:id/deactivate",
  requirePermission(PERMISSIONS.CUSTOMER.MANAGE),
  customerController.deactivateCustomer
);

// Activate customer
router.post(
  "/:id/activate",
  requirePermission(PERMISSIONS.CUSTOMER.MANAGE),
  customerController.activateCustomer
);

// Delete customer
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.CUSTOMER.MANAGE),
  customerController.deleteCustomer
);

module.exports = router;
