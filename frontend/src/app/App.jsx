import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import Shimmer from "../shared/ui/shimmer.jsx";

// Import bulk delete utility for global access
import "../shared/utils/deleteRecordsByBranch";

// All your component imports are preserved

import AddJumboXeroxPage from "../modules/inventory/pages/jumbo-xerox/admin/AddJumboXerox.jsx";
import LoginPage from "../modules/auth/pages/login.jsx";
import ForgotPasswordPage from "../modules/auth/pages/forgotpassword.jsx";
import {
  AdminDashboard as AdminDashboardPage,
  BranchManagerDashboard as ManagerDashboardPage,
  DesignerDashboard as DesignerDashboardPage,
} from "../modules/dashboard";
import PastDateRequests from "../modules/admin/pages/requests/PastDateRequests.jsx";
import DeleteRequests from "../modules/admin/pages/requests/DeleteRequests.jsx";
import AddPrinterManagerPage from "../modules/inventory/pages/printers/manager/AddPrinterManager.jsx";
import MovePrinterManagerPage from "../modules/inventory/pages/printers/manager/MovePrinterManager.jsx";
import PrinterListPage from "../modules/inventory/pages/printers/admin/PrinterList.jsx";
import PrinterListManagerPage from "../modules/inventory/pages/printers/manager/PrinterList.jsx";
import StockListPage from "../modules/inventory/pages/stock/admin/StockList.jsx";
import AddStockManagerPage from "../modules/inventory/pages/stock/manager/AddStock.jsx";
import AddCategoryPage from "../modules/inventory/pages/stock/manager/AddCategory.jsx";
import AddBranchPage from "../modules/admin/pages/branches/AddBranch.jsx";
import MoveStockManagerPage from "../modules/inventory/pages/stock/manager/MoveStock.jsx";
import PrinterReadingsManagerPage from "../modules/inventory/pages/printers/manager/PrinterReadings.jsx";
import DisplayPrinterReadingsAdminPage from "../modules/inventory/pages/printers/admin/DisplayPrinterReadings.jsx";
import DisplayPrinterReadingsManagerPage from "../modules/inventory/pages/printers/manager/DisplayPrinterReadings.jsx";
import JumboXeroxPage from "../modules/inventory/pages/jumbo-xerox/manager/JumboXerox.jsx";
import TotalAmountDisplayPage from "../modules/inventory/pages/revenue/manager/TotalAmountDisplay.jsx";
import JumboXeroxListAdminPage from "../modules/inventory/pages/jumbo-xerox/admin/JumboXeroxList.jsx";
import JumboXeroxListManagerPage from "../modules/inventory/pages/jumbo-xerox/manager/JumboXeroxList.jsx";
import TotalAmountListAdminPage from "../modules/inventory/pages/revenue/admin/TotalAmountList.jsx";
import TotalAmountListManagerPage from "../modules/inventory/pages/revenue/manager/TotalAmountList.jsx";
import ProfilePage from "../modules/auth/pages/Profile.jsx";
import PrivateRoute from "./PrivateRoute.jsx";
import AdminLayout from "../layouts/AdminLayout/AdminLayout.jsx";
import ManagerLayout from "../layouts/ManagerLayout/ManagerLayout.jsx";
import SearchStockListAdmin from "../modules/inventory/pages/stock/admin/SearchStockList.jsx";
import SearchStockListManager from "../modules/inventory/pages/stock/manager/SearchStockList.jsx";
import StockItemListPage from "../modules/inventory/pages/stock/manager/StockItemList.jsx";
import StockListManagerPage from "../modules/inventory/pages/stock/manager/StockList.jsx";
import PdfGenerator from "../modules/inventory/pages/revenue/manager/PdfGenerator.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { MotionToastContainer } from "../shared/ui/motion/MotionToast";
import "../modules/jobflow/shared/styles/job-flow.css";
import AdminDailyReadingsRevenue from "../modules/inventory/pages/revenue/admin/AdminDailyReadingsRevenue.jsx";
import AdminStockReadingsRevenue from "../modules/inventory/pages/revenue/admin/AdminStockReadingsRevenue.jsx";
import PreviousBalanceList from "../modules/admin/pages/balances/PreviousBalanceList.jsx";
import PopupDemo from "../shared/ui/Popup/PopupDemo.jsx";
import InventoryTracking from "../modules/inventory/pages/stock/admin/InventoryTracking.jsx";
import ExportData from "../modules/admin/pages/exports/ExportData.jsx";
import JumboXeroxCsvVerifier from "../modules/inventory/pages/jumbo-xerox/admin/JumboXeroxCsvVerifier.jsx";
import SalesInvoice from "../modules/inventory/pages/revenue/manager/SalesInvoice.jsx";

// PrintZ Feature Modules: JobFlow and POS
import {
  CustomersPage,
  CustomerViewPage,
  JobOrdersPage,
  DesignerJobOrdersPage,
  CreateJobOrderPage,
  EstimationPage,
  DesignWorkflowPage,
  DesignerLoginPage,
  QualityControlPage,
  DeliveryPage,
  InvoicePage,
  SettlementPage,
  BranchQrCustomerForm,
  MasterSettingsPage,
} from "../modules/jobflow";
import {
  ProductionOrdersPage,
  ProductionPlanningPage,
  OperationQueuePage,
  ReprintBatchesPage,
  ProductionReportsPage,
  OperatorsPage,
} from "../modules/jobflow/production";
import { PosBillingPage } from "../modules/pos";
import {
  AttendanceSetupPage,
  DailyAttendancePage,
  AttendancePermissionsPage,
  AttendanceReportsPage,
  BranchShiftsPage,
} from "../modules/hr/attendance";

import {
  SalarySetupPage,
  LoansAdjustmentsPage,
  PayrollProcessingPage,
  SalaryRecordsPage,
} from "../modules/hr/salary";

import { EmployeesPage, RoleManagementPage, RoleSetupPage } from "../modules/hr/employees";

import {
  SaleOrdersListPage,
  CreateSaleOrderPage,
  SaleOrderDetailPage,
} from "../modules/sale-order";

import {
  MfgLayout,
  MfgDashboardPage,
  MfgOrdersPage,
  MfgOrderPage,
  MfgQueuePage,
  MfgPrintDispatchPage,
} from "../modules/mfg-unit";

import { AuthProvider, useAuth, AuthContext } from "./providers/AuthContext.jsx";
export { AuthProvider, useAuth, AuthContext };

const pageTitleMapping = {
  "/login": "Login",
  "/designer/login": "Login",
  "/designer-login": "Login",

  "/forgot-password": "Forgot Password",
  "/admin-dashboard": "Admin Dashboard",
  "/manager-dashboard": "Manager Dashboard",
  "/pastDateRequests": "Past Date Requests",
  "/delete-requests": "Delete Requests",
  "/add-printer-manager": "Add Printer Manager",
  "/move-printer-manager": "Move Printer Manager",
  "/printer-list": "Printer List",
  "/stock-list": "Stock List",
  "/profile": "Profile",
  "/printer-readings-manager": "Printer Readings",
  "/jumbo-xerox": "Jumbo Xerox",
  "/total-amount-display": "Total Amount Display",
  "/search-stock-list-admin": "Search Stock List (Admin)",
  "/search-stock-list-manager": "Search Stock List (Manager)",
  "/pdf-generator": "PDF Generator",
  "/add-jumbo-xerox": "Add Jumbo Xerox",
  "/admin-daily-readings-revenue": "Daily Readings Revenue",
  "/admin-stock-readings-revenue": "Stock Readings Revenue",
  "/previous-balance-list": " Previous Balance List",
  "/inventory-tracking": "Inventory Tracking",
  "/export-data": "Export Data",
  "/jumbo-xerox-csv-verifier": "Jumbo Xerox CSV Verifier",
  "/sales-invoice": "Sales Invoice",
  "/jobflow/customers": "Customer Master",
  "/customers": "Customer Master",
  "/v3/customers": "Customer Master",
  "/jobflow/qr-request": "Branch QR Self-Service Registration",
  "/customer-register": "Branch QR Self-Service Registration",
  "/v3/customer-register": "Branch QR Self-Service Registration",
  "/jobflow/jobs": "Job Orders",
  "/jobs": "Job Orders",
  "/v3/jobs": "Job Orders",
  "/jobflow/jobs/new": "Create Job Order",
  "/jobflow/jobs/edit": "Edit Job Order",
  "/jobs/new": "Create Job Order",
  "/v3/jobs/new": "Create Job Order",
  "/jobflow/estimates": "Quotations & Estimates",
  "/estimates": "Quotations & Estimates",
  "/v3/estimates": "Quotations & Estimates",
  "/estimates/new": "Create Quotation",
  "/v3/estimates/new": "Create Quotation",
  "/jobflow/design": "Design Workflow",
  "/design": "Design Workflow",
  "/v3/design": "Design Workflow",
  "/jobflow/production": "Production Operations",
  "/production": "Production Operations",
  "/v3/production": "Production Operations",
  "/jobflow/qc": "Quality Control & Rework",
  "/quality-control": "Quality Control & Rework",
  "/v3/quality-control": "Quality Control & Rework",
  "/jobflow/delivery": "Delivery Management",
  "/delivery": "Delivery Management",
  "/jobflow/invoice": "Commercial Tax Invoicing",
  "/invoice": "Commercial Tax Invoicing",
  "/invoices": "Commercial Tax Invoicing",
  "/jobflow/settlement": "Payment Settlement & Job Closure",
  "/settlement": "Payment Settlement & Job Closure",
  "/jobflow/pos": "POS Counter Billing & Sales Receipts",
  "/pos": "POS Counter Billing & Sales Receipts",
  "/pos-receipts": "POS Counter Billing & Sales Receipts",
  "/sales-receipts": "POS Counter Billing & Sales Receipts",
  "/jobflow/master-settings": "Master Defaults & Specifications",
  "/master-settings": "Master Defaults & Specifications",
  "/employees": "Employees",
  "/employees/roles": "Role Management",
  "/employees/role-setup": "Role Setup",
  "/attendance": "Daily Attendance",
  "/attendance/setup": "Attendance Setup",
  "/attendance/daily": "Daily Attendance",
  "/attendance/permissions": "Attendance Permissions",
  "/attendance/reports": "Attendance Reports",
  "/salary": "Salary & Payroll",
  "/salary/setup": "Salary Setup",
  "/salary/loans-adjustments": "Loans & Adjustments",
  "/salary/processing": "Payroll Processing",
  "/salary/records": "Salary Records",
  "/sale-orders": "Sale Orders",
  "/sale-orders/new": "New Sale Order",
  "/mfg/dashboard": "Manufacturing Dashboard",
  "/mfg/orders": "Manufacturing Orders",
  "/mfg/queue": "Waiting Queue",
  "/mfg/print-dispatch": "Print & Dispatch",
};

// Branch users (and admins) who work with sale orders
const SALE_ORDER_ROLES = ["admin", "super_admin", "manager", "branch_manager", "branch_manager1", "operator", "branch_staff"];
// Manufacturing unit staff (admins may look in too)
const MFG_PORTAL_ROLES = ["mfg_designer", "mfg_manager", "admin", "super_admin"];



const ProfileRouteWrapper = () => {
  const { role } = useAuth();
  if (role === "manager") {
    return (
      <ManagerLayout>
        <ProfilePage />
      </ManagerLayout>
    );
  }
  return (
    <AdminLayout>
      <ProfilePage />
    </AdminLayout>
  );
};

const LayoutWrapper = ({ children }) => {
  const { role, currentUser } = useAuth();
  const storedRole = (() => {
    try {
      return localStorage.getItem("userRole") || "";
    } catch (_) {
      return "";
    }
  })();
  const isAdmin =
    role === "admin" ||
    role === "SUPER_ADMIN" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.roleCode === "ADMIN" ||
    currentUser?.roleCode === "SUPER_ADMIN" ||
    storedRole === "admin" ||
    storedRole === "SUPER_ADMIN";

  if (isAdmin) {
    return <AdminLayout>{children}</AdminLayout>;
  }
  return <ManagerLayout>{children}</ManagerLayout>;
};

// This component contains your actual app content and routing logic
const AppContent = () => {
  const location = useLocation();

  useEffect(() => {
    const currentPage = pageTitleMapping[location.pathname] || "Dashboard";
    document.title = `Printz | ${currentPage}`;
  }, [location.pathname]);

  return (
    <>
      {/* Hidden React-Toastify container so internal store emits onChange events */}
      <div style={{ display: "none" }} aria-hidden="true">
        <ToastContainer />
      </div>
      {/* Top-Center Framer Motion Glass-Pill Notifications */}
      <MotionToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/designer/login" element={<Navigate to="/login" replace />} />
        <Route path="/designer-login" element={<Navigate to="/login" replace />} />
        <Route path="/mfg/login" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/popup-demo" element={<PopupDemo />} />
        <Route
          path="/admin-dashboard"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <AdminLayout>
                  <AdminDashboardPage />
                </AdminLayout>
              )}
            />
          }
        />
        <Route path="/add-manager" element={<Navigate to="/employees" replace />} />
        <Route
          path="/export-data"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <LayoutWrapper>
                  <ExportData />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/jumbo-xerox-csv-verifier"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <AdminLayout>
                  <JumboXeroxCsvVerifier />
                </AdminLayout>
              )}
            />
          }
        />
        <Route
          path="/inventory-tracking"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <LayoutWrapper>
                  <InventoryTracking />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route path="/add-admin" element={<Navigate to="/employees" replace />} />
        <Route
          path="/sales-invoice"
          element={
            <PrivateRoute
              roles={["manager"]}
              component={() => (
                <ManagerLayout>
                  <SalesInvoice />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/pastDateRequests"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <LayoutWrapper>
                  <PastDateRequests />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/add-jumbo-xerox"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <AdminLayout>
                  <AddJumboXeroxPage />
                </AdminLayout>
              )}
            />
          }
        />
        <Route
          path="/previous-balance-list"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <LayoutWrapper>
                  <PreviousBalanceList />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/admin-daily-readings-revenue"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <LayoutWrapper>
                  <AdminDailyReadingsRevenue />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/admin-stock-readings-revenue"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <LayoutWrapper>
                  <AdminStockReadingsRevenue />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/add-printer-manager"
          element={
            <PrivateRoute
              roles={["admin", "manager"]}
              component={() => (
                <LayoutWrapper>
                  <AddPrinterManagerPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/move-printer-manager"
          element={
            <PrivateRoute
              roles={["admin", "manager"]}
              component={() => (
                <LayoutWrapper>
                  <MovePrinterManagerPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/add-stock-manager"
          element={
            <PrivateRoute
              roles={["admin", "manager"]}
              component={() => (
                <LayoutWrapper>
                  <AddStockManagerPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/move-stock-manager"
          element={
            <PrivateRoute
              roles={["admin", "manager"]}
              component={() => (
                <LayoutWrapper>
                  <MoveStockManagerPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/add-category"
          element={
            <PrivateRoute
              roles={["admin", "manager"]}
              component={() => (
                <AdminLayout>
                  <AddCategoryPage />
                </AdminLayout>
              )}
            />
          }
        />
        <Route
          path="/add-branch"
          element={
            <PrivateRoute
              roles={["admin", "manager"]}
              component={() => (
                <LayoutWrapper>
                  <AddBranchPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/printer-list"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <LayoutWrapper>
                  <PrinterListPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/stock-list"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <LayoutWrapper>
                  <StockListPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/manager-dashboard"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <ManagerLayout>
                  <ManagerDashboardPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/designer-dashboard"
          element={
            <PrivateRoute
              roles={["designer", "admin", "manager"]}
              component={() => (
                <LayoutWrapper>
                  <DesignerDashboardPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/designer/dashboard"
          element={<Navigate to="/designer-dashboard" replace />}
        />
        <Route
          path="/printer-readings-manager"
          element={
            <PrivateRoute
              roles={["manager"]}
              component={() => (
                <ManagerLayout>
                  <PrinterReadingsManagerPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/printer-list-manager"
          element={
            <PrivateRoute
              roles={["manager"]}
              component={() => (
                <LayoutWrapper>
                  <PrinterListManagerPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/jumbo-xerox"
          element={
            <PrivateRoute
              roles={["manager"]}
              component={() => (
                <LayoutWrapper>
                  <JumboXeroxPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/display-printer-readings-admin"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <LayoutWrapper>
                  <DisplayPrinterReadingsAdminPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/display-printer-readings"
          element={<Navigate to="/display-printer-readings-admin" replace />}
        />
        <Route
          path="/display-printer-readings-manager"
          element={
            <PrivateRoute
              roles={["manager"]}
              component={() => (
                <LayoutWrapper>
                  <DisplayPrinterReadingsManagerPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/total-amount-display"
          element={
            <PrivateRoute
              roles={["manager"]}
              component={() => (
                <ManagerLayout>
                  <TotalAmountDisplayPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/jumbo-xerox-list-admin"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <LayoutWrapper>
                  <JumboXeroxListAdminPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/jumbo-xerox-list-manager"
          element={
            <PrivateRoute
              roles={["manager"]}
              component={() => (
                <ManagerLayout>
                  <JumboXeroxListManagerPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/total-amount-list-admin"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <LayoutWrapper>
                  <TotalAmountListAdminPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/total-amount-list-manager"
          element={
            <PrivateRoute
              roles={["manager"]}
              component={() => (
                <LayoutWrapper>
                  <TotalAmountListManagerPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute
              roles={["admin", "manager"]}
              component={ProfileRouteWrapper}
            />
          }
        />
        <Route
          path="/search-stock-list-admin"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <LayoutWrapper>
                  <SearchStockListAdmin />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/search-stock-list-manager"
          element={
            <PrivateRoute
              roles={["manager"]}
              component={() => (
                <LayoutWrapper>
                  <SearchStockListManager />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/stock-list-manager"
          element={
            <PrivateRoute
              roles={["manager"]}
              component={() => (
                <LayoutWrapper>
                  <StockListManagerPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/pdf-generator"
          element={
            <PrivateRoute
              roles={["manager"]}
              component={() => (
                <LayoutWrapper>
                  <PdfGenerator />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/stock-item-list-manager"
          element={
            <PrivateRoute
              roles={["manager"]}
              component={() => (
                <ManagerLayout>
                  <StockItemListPage />
                </ManagerLayout>
              )}
            />
          }
        />

        {/* ========================================================= */}
        {/* PrintZ JobFlow Enterprise Workflow Routes                */}
        {/* ========================================================= */}
        {/* The old JobFlow Overview page is gone: send old links to Job Orders */}
        <Route path="/jobflow" element={<Navigate to="/jobs" replace />} />

        {/* POS Counter Billing & Sales Receipts */}
        <Route path="/v3/sales-pos" element={<Navigate to="/pos" replace />} />
        <Route path="/sales-pos" element={<Navigate to="/pos" replace />} />
        <Route
          path="/jobflow/pos"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <PosBillingPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/pos"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <PosBillingPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/pos-receipts"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <PosBillingPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/sales-receipts"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <PosBillingPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* 2. Customer Master & Registration */}
        <Route
          path="/jobflow/customers"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <CustomersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/customers"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <CustomersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/v3/customers"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <CustomersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/jobflow/customers/:id"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <CustomerViewPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* 3. Job Orders & Specifications */}
        <Route
          path="/jobflow/jobs"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <JobOrdersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/jobflow/jobs/:id"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <JobOrdersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/jobs"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <JobOrdersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/v3/jobs"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <JobOrdersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
                {/* Designer Job Orders - Dedicated Listing for Designer-Created Orders */}
        <Route
          path="/jobflow/designer-jobs"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <LayoutWrapper>
                  <DesignerJobOrdersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/designer-jobs"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <LayoutWrapper>
                  <DesignerJobOrdersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/jobflow/designer-jobs/new"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <LayoutWrapper>
                  <DesignerJobOrdersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/designer-jobs/new"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <LayoutWrapper>
                  <DesignerJobOrdersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
<Route
          path="/jobflow/jobs/:id/edit"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <LayoutWrapper>
                  <CreateJobOrderPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/jobflow/jobs/new"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <LayoutWrapper>
                  <CreateJobOrderPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/jobs/new"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <LayoutWrapper>
                  <CreateJobOrderPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/v3/jobs/new"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <CreateJobOrderPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* 4. Estimation & Commercial Quotations */}
        <Route
          path="/jobflow/estimates"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <EstimationPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/estimates"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <EstimationPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/v3/estimates"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <EstimationPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/estimates/new"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <EstimationPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/v3/estimates/new"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <EstimationPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* 5. Design Workflow & Designer Allocation */}
        <Route
          path="/jobflow/design"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <LayoutWrapper>
                  <DesignWorkflowPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/design"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <LayoutWrapper>
                  <DesignWorkflowPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/v3/design"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <LayoutWrapper>
                  <DesignWorkflowPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/design/my-queue"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <LayoutWrapper>
                  <DesignWorkflowPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/design/workspace"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <LayoutWrapper>
                  <DesignWorkflowPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/design/workbench"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <LayoutWrapper>
                  <DesignWorkflowPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* 6. Production Operations & Stations */}
        <Route
          path="/jobflow/production"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <ProductionOrdersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/production"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <ProductionOrdersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/production/dashboard"
          element={<Navigate to="/production/orders" replace />}
        />
        <Route
          path="/v3/production"
          element={<Navigate to="/production/orders" replace />}
        />
        <Route
          path="/production/planning"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <ProductionPlanningPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/jobflow/production-planning"
          element={<Navigate to="/production/orders" replace />}
        />
        <Route
          path="/jobflow/production/planning"
          element={<Navigate to="/production/orders" replace />}
        />
        <Route
          path="/production-planning"
          element={<Navigate to="/production/orders" replace />}
        />
        <Route
          path="/v3/production/planning"
          element={<Navigate to="/production/orders" replace />}
        />
        <Route
          path="/production/orders"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <ProductionOrdersPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/production/queue"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <OperationQueuePage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/production/operation-queue"
          element={<Navigate to="/production/queue" replace />}
        />
        <Route
          path="/production/completed"
          element={<Navigate to="/production/orders" replace />}
        />
        <Route
          path="/production/rework"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <ReprintBatchesPage initialTab="REWORK" />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/production/reprints"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <ReprintBatchesPage initialTab="REPRINT" />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/production/machines"
          element={<Navigate to="/production/orders" replace />}
        />
        <Route
          path="/production/operators"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <OperatorsPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/production/reports"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <ProductionReportsPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* 7. Quality Control & Smart Rework */}
        <Route
          path="/production/qc"
          element={
            <PrivateRoute
              roles={["manager", "admin", "qc_inspector", "quality_inspector", "production_manager", "operator", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <QualityControlPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/jobflow/qc"
          element={
            <PrivateRoute
              roles={["manager", "admin", "qc_inspector", "quality_inspector", "production_manager", "operator", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <QualityControlPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/quality-control"
          element={
            <PrivateRoute
              roles={["manager", "admin", "qc_inspector", "quality_inspector", "production_manager", "operator", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <QualityControlPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/v3/quality-control"
          element={
            <PrivateRoute
              roles={["manager", "admin", "qc_inspector", "quality_inspector", "production_manager", "operator", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <QualityControlPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* 8. Delivery Management */}
        <Route
          path="/jobflow/delivery"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <DeliveryPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/delivery"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <DeliveryPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* 9. Commercial Tax Invoicing */}
        <Route
          path="/jobflow/invoice"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <InvoicePage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/invoice"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <InvoicePage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/invoices"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <InvoicePage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* 10. Payment Settlement & Job Closure */}
        <Route
          path="/jobflow/settlement"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <SettlementPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/settlement"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <LayoutWrapper>
                  <SettlementPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* 10. Public QR Self-Service Registration */}
        <Route path="/jobflow/qr-request" element={<BranchQrCustomerForm />} />
        <Route path="/customer-register" element={<BranchQrCustomerForm />} />
        <Route path="/v3/customer-register" element={<BranchQrCustomerForm />} />

        {/* 13. Master Defaults & Specifications */}
        <Route
          path="/jobflow/master-settings"
          element={
            <PrivateRoute
              roles={["admin", "super_admin"]}
              component={() => (
                <LayoutWrapper>
                  <MasterSettingsPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/master-settings"
          element={
            <PrivateRoute
              roles={["admin", "super_admin"]}
              component={() => (
                <LayoutWrapper>
                  <MasterSettingsPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* ========================================================= */}
        {/* PrintZ Attendance Management Routes                      */}
        {/* ========================================================= */}
        <Route path="/attendance" element={<Navigate to="/attendance/daily" replace />} />
        <Route
          path="/attendance/setup"
          element={
            <PrivateRoute
              roles={["admin", "super_admin"]}
              component={() => (
                <LayoutWrapper>
                  <AttendanceSetupPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/attendance/daily"
          element={
            <PrivateRoute
              roles={["admin", "super_admin", "manager", "branch_manager"]}
              component={() => (
                <LayoutWrapper>
                  <DailyAttendancePage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/attendance/branch-shifts"
          element={
            <PrivateRoute
              roles={["admin", "super_admin"]}
              component={() => (
                <LayoutWrapper>
                  <BranchShiftsPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/attendance/permissions"
          element={
            <PrivateRoute
              roles={["admin", "super_admin", "manager", "branch_manager"]}
              component={() => (
                <LayoutWrapper>
                  <AttendancePermissionsPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/attendance/reports"
          element={
            <PrivateRoute
              roles={["admin", "super_admin", "manager", "branch_manager"]}
              component={() => (
                <LayoutWrapper>
                  <AttendanceReportsPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* Employees: one place to add and manage every employee */}
        <Route
          path="/employees"
          element={
            <PrivateRoute
              roles={["admin", "super_admin", "manager", "branch_manager"]}
              component={() => (
                <LayoutWrapper>
                  <EmployeesPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        <Route
          path="/delete-requests"
          element={
            <PrivateRoute
              roles={["admin", "super_admin", "manager", "branch_manager"]}
              component={() => (
                <LayoutWrapper>
                  <DeleteRequests />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/employees/role-setup"
          element={
            <PrivateRoute
              roles={["admin", "super_admin"]}
              component={() => (
                <LayoutWrapper>
                  <RoleSetupPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/employees/roles"
          element={
            <PrivateRoute
              roles={["admin", "super_admin"]}
              component={() => (
                <LayoutWrapper>
                  <RoleManagementPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* ========================================================= */}
        {/* PrintZ Salary & Payroll Module Routes                     */}
        {/* ========================================================= */}
        <Route path="/salary" element={<Navigate to="/salary/processing" replace />} />
        <Route
          path="/salary/setup"
          element={
            <PrivateRoute
              roles={["admin", "super_admin"]}
              component={() => (
                <LayoutWrapper>
                  <SalarySetupPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/salary/loans-adjustments"
          element={
            <PrivateRoute
              roles={["admin", "super_admin", "manager", "branch_manager"]}
              component={() => (
                <LayoutWrapper>
                  <LoansAdjustmentsPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/salary/processing"
          element={
            <PrivateRoute
              roles={["admin", "super_admin", "manager", "branch_manager"]}
              component={() => (
                <LayoutWrapper>
                  <PayrollProcessingPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/salary/records"
          element={
            <PrivateRoute
              roles={["admin", "super_admin", "manager", "branch_manager"]}
              component={() => (
                <LayoutWrapper>
                  <SalaryRecordsPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* Sale Orders (branch side). "/new" must come before "/:id". */}
        <Route
          path="/sale-orders"
          element={
            <PrivateRoute
              roles={SALE_ORDER_ROLES}
              component={() => (
                <LayoutWrapper>
                  <SaleOrdersListPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/sale-orders/new"
          element={
            <PrivateRoute
              roles={SALE_ORDER_ROLES}
              component={() => (
                <LayoutWrapper>
                  <CreateSaleOrderPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/sale-orders/:id/edit"
          element={
            <PrivateRoute
              roles={SALE_ORDER_ROLES}
              component={() => (
                <LayoutWrapper>
                  <CreateSaleOrderPage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/sale-orders/:id"
          element={
            <PrivateRoute
              roles={SALE_ORDER_ROLES}
              component={() => (
                <LayoutWrapper>
                  <SaleOrderDetailPage />
                </LayoutWrapper>
              )}
            />
          }
        />

        {/* Manufacturing Unit portal */}
        <Route path="/mfg" element={<Navigate to="/mfg/dashboard" replace />} />
        <Route
          path="/mfg/dashboard"
          element={
            <PrivateRoute
              loginPath="/login"
              roles={MFG_PORTAL_ROLES}
              component={() => (
                <MfgLayout>
                  <MfgDashboardPage />
                </MfgLayout>
              )}
            />
          }
        />
        <Route
          path="/mfg/orders"
          element={
            <PrivateRoute
              loginPath="/login"
              roles={MFG_PORTAL_ROLES}
              component={() => (
                <MfgLayout>
                  <MfgOrdersPage />
                </MfgLayout>
              )}
            />
          }
        />
        <Route
          path="/mfg/orders/:id"
          element={
            <PrivateRoute
              loginPath="/login"
              roles={MFG_PORTAL_ROLES}
              component={() => (
                <MfgLayout>
                  <MfgOrderPage />
                </MfgLayout>
              )}
            />
          }
        />
        <Route
          path="/mfg/print-dispatch"
          element={
            <PrivateRoute
              loginPath="/login"
              roles={MFG_PORTAL_ROLES}
              component={() => (
                <MfgLayout>
                  <MfgPrintDispatchPage />
                </MfgLayout>
              )}
            />
          }
        />
        <Route
          path="/mfg/queue"
          element={
            <PrivateRoute
              loginPath="/login"
              roles={["mfg_manager", "admin", "super_admin"]}
              component={() => (
                <MfgLayout>
                  <MfgQueuePage />
                </MfgLayout>
              )}
            />
          }
        />
      </Routes>


    </>
  );
};

// --- 3. THE MAIN EXPORTED COMPONENT WRAPS EVERYTHING ---
const App = () => {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;
