import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import Shimmer from "./components/common/shimmer.jsx";

// Import bulk delete utility for global access
import "./utils/deleteRecordsByBranch";

// All your component imports are preserved

import AddJumboXeroxPage from "./components/admin/AddJumboXerox.jsx";
import LoginPage from "./components/common/login.jsx";
import ForgotPasswordPage from "./components/common/forgotpassword.jsx";
import {
  AdminDashboard as AdminDashboardPage,
  BranchManagerDashboard as ManagerDashboardPage,
  DesignerDashboard as DesignerDashboardPage,
} from "./features/dashboard";
import AddManagerPage from "./components/admin/AddManager.jsx";
import AddAdminPage from "./components/admin/AddAdmin.jsx";
import PastDateRequests from "./components/admin/PastDateRequests.jsx";
import AddPrinterManagerPage from "./components/manager/AddPrinterManager.jsx";
import MovePrinterManagerPage from "./components/manager/MovePrinterManager.jsx";
import PrinterListPage from "./components/admin/PrinterList.jsx";
import PrinterListManagerPage from "./components/manager/PrinterList.jsx";
import StockListPage from "./components/admin/StockList.jsx";
import AddStockManagerPage from "./components/manager/AddStock.jsx";
import AddCategoryPage from "./components/manager/AddCategory.jsx";
import AddBranchPage from "./components/admin/AddBranch.jsx";
import MoveStockManagerPage from "./components/manager/MoveStock.jsx";
import PrinterReadingsManagerPage from "./components/manager/PrinterReadings.jsx";
import DisplayPrinterReadingsAdminPage from "./components/admin/DisplayPrinterReadings.jsx";
import DisplayPrinterReadingsManagerPage from "./components/manager/DisplayPrinterReadings.jsx";
import JumboXeroxPage from "./components/manager/JumboXerox.jsx";
import TotalAmountDisplayPage from "./components/manager/TotalAmountDisplay.jsx";
import JumboXeroxListAdminPage from "./components/admin/JumboXeroxList.jsx";
import JumboXeroxListManagerPage from "./components/manager/JumboXeroxList.jsx";
import TotalAmountListAdminPage from "./components/admin/TotalAmountList.jsx";
import TotalAmountListManagerPage from "./components/manager/TotalAmountList.jsx";
import ProfilePage from "./components/common/Profile.jsx";
import PrivateRoute from "./components/common/PrivateRoute.jsx";
import AdminLayout from "./components/admin/AdminLayout.jsx";
import ManagerLayout from "./components/manager/ManagerLayout.jsx";
import SearchStockListAdmin from "./components/admin/SearchStockList.jsx";
import SearchStockListManager from "./components/manager/SearchStockList.jsx";
import StockItemListPage from "./components/manager/StockItemList.jsx";
import StockListManagerPage from "./components/manager/StockList.jsx";
import PdfGenerator from "./components/manager/PdfGenerator.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { MotionToastContainer } from "./shared/motion/MotionToast";
import "./features/jobflow/shared/styles/job-flow.css";
import AdminDailyReadingsRevenue from "./components/admin/AdminDailyReadingsRevenue.jsx";
import AdminStockReadingsRevenue from "./components/admin/AdminStockReadingsRevenue.jsx";
import PreviousBalanceList from "./components/admin/PreviousBalanceList.jsx";
import PopupDemo from "./components/common/PopupDemo.jsx";
import InventoryTracking from "./components/admin/InventoryTracking.jsx";
import ExportData from "./components/admin/ExportData.jsx";
import JumboXeroxCsvVerifier from "./components/admin/JumboXeroxCsvVerifier.jsx";
import SalesInvoice from "./components/manager/SalesInvoice.jsx";

// PrintZ Feature Modules: JobFlow and POS
import {
  JobFlowDashboard,
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
} from "./features/jobflow";
import {
  ProductionOrdersPage,
  ProductionPlanningPage,
  OperationQueuePage,
  ReprintBatchesPage,
  ProductionReportsPage,
  OperatorsPage,
} from "./features/jobflow/production";
import { PosBillingPage } from "./features/pos";
import {
  AttendanceSetupPage,
  DailyAttendancePage,
  AttendancePermissionsPage,
  AttendanceReportsPage,
  BranchShiftsPage,
} from "./features/attendance";

import {
  SalarySetupPage,
  LoansAdjustmentsPage,
  PayrollProcessingPage,
  SalaryRecordsPage,
} from "./features/salary";

import {
  SaleOrdersListPage,
  CreateSaleOrderPage,
  SaleOrderDetailPage,
} from "./features/sale-order";

import {
  MfgLayout,
  MfgDashboardPage,
  MfgOrdersPage,
  MfgOrderPage,
  MfgQueuePage,
  MfgPrintDispatchPage,
} from "./features/mfg-unit";

import { AuthProvider, useAuth, AuthContext } from "./context/AuthContext.jsx";
export { AuthProvider, useAuth, AuthContext };

const pageTitleMapping = {
  "/login": "Login",
  "/designer/login": "Login",
  "/designer-login": "Login",

  "/forgot-password": "Forgot Password",
  "/admin-dashboard": "Admin Dashboard",
  "/manager-dashboard": "Manager Dashboard",
  "/pastDateRequests": "Past Date Requests",
  "/add-manager": "Add Manager", 
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
  "/jobflow": "JobFlow Overview",
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
        <Route
          path="/add-manager"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <AdminLayout>
                  <AddManagerPage />
                </AdminLayout>
              )}
            />
          }
        />
        <Route
          path="/export-data"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <AdminLayout>
                  <ExportData />
                </AdminLayout>
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
                <AdminLayout>
                  <InventoryTracking />
                </AdminLayout>
              )}
            />
          }
        />
        <Route
          path="/add-admin"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <AdminLayout>
                  <AddAdminPage />
                </AdminLayout>
              )}
            />
          }
        />
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
                <AdminLayout>
                  <PastDateRequests />
                </AdminLayout>
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
                <AdminLayout>
                  <PreviousBalanceList />
                </AdminLayout>
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
                <AdminLayout>
                  <AdminDailyReadingsRevenue />
                </AdminLayout>
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
                <AdminLayout>
                  <AdminStockReadingsRevenue />
                </AdminLayout>
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
                <AdminLayout>
                  <AddPrinterManagerPage />
                </AdminLayout>
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
                <AdminLayout>
                  <MovePrinterManagerPage />
                </AdminLayout>
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
                <AdminLayout>
                  <AddStockManagerPage />
                </AdminLayout>
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
                <AdminLayout>
                  <MoveStockManagerPage />
                </AdminLayout>
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
                <AdminLayout>
                  <AddBranchPage />
                </AdminLayout>
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
                <AdminLayout>
                  <PrinterListPage />
                </AdminLayout>
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
                <AdminLayout>
                  <StockListPage />
                </AdminLayout>
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
                <ManagerLayout>
                  <DesignerDashboardPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <PrinterListManagerPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <JumboXeroxPage />
                </ManagerLayout>
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
                <AdminLayout>
                  <DisplayPrinterReadingsAdminPage />
                </AdminLayout>
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
                <ManagerLayout>
                  <DisplayPrinterReadingsManagerPage />
                </ManagerLayout>
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
                <AdminLayout>
                  <JumboXeroxListAdminPage />
                </AdminLayout>
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
                <AdminLayout>
                  <TotalAmountListAdminPage />
                </AdminLayout>
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
                <ManagerLayout>
                  <TotalAmountListManagerPage />
                </ManagerLayout>
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
                <AdminLayout>
                  <SearchStockListAdmin />
                </AdminLayout>
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
                <ManagerLayout>
                  <SearchStockListManager />
                </ManagerLayout>
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
                <ManagerLayout>
                  <StockListManagerPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <PdfGenerator />
                </ManagerLayout>
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
        {/* 1. JobFlow Overview Dashboard */}
        <Route
          path="/jobflow"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <ManagerLayout>
                  <JobFlowDashboard />
                </ManagerLayout>
              )}
            />
          }
        />

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
                <ManagerLayout>
                  <CustomersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <CustomersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <CustomersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <CustomerViewPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <JobOrdersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <JobOrdersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <JobOrdersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <JobOrdersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <DesignerJobOrdersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <DesignerJobOrdersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <DesignerJobOrdersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <DesignerJobOrdersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <CreateJobOrderPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <CreateJobOrderPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <CreateJobOrderPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <CreateJobOrderPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <EstimationPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <EstimationPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <EstimationPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <EstimationPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <EstimationPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <DesignWorkflowPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <DesignWorkflowPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <DesignWorkflowPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <DesignWorkflowPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <DesignWorkflowPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <DesignWorkflowPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <ProductionOrdersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <ProductionOrdersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <ProductionPlanningPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <ProductionOrdersPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <OperationQueuePage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <ReprintBatchesPage initialTab="REWORK" />
                </ManagerLayout>
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
                <ManagerLayout>
                  <ReprintBatchesPage initialTab="REPRINT" />
                </ManagerLayout>
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
                <ManagerLayout>
                  <OperatorsPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <ProductionReportsPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <QualityControlPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <QualityControlPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <QualityControlPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <QualityControlPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <DeliveryPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <DeliveryPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <InvoicePage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <InvoicePage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <InvoicePage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <SettlementPage />
                </ManagerLayout>
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
                <ManagerLayout>
                  <SettlementPage />
                </ManagerLayout>
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
              roles={["manager", "admin", "super_admin"]}
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
              roles={["manager", "admin", "super_admin"]}
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
                <AdminLayout>
                  <AttendanceSetupPage />
                </AdminLayout>
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
                <AdminLayout>
                  <BranchShiftsPage />
                </AdminLayout>
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

        {/* ========================================================= */}
        {/* PrintZ Salary & Payroll Module Routes                     */}
        {/* ========================================================= */}
        <Route path="/salary" element={<Navigate to="/salary/processing" replace />} />
        <Route
          path="/salary/setup"
          element={
            <PrivateRoute
              roles={["admin", "super_admin", "manager", "branch_manager"]}
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
