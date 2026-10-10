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
import AdminDashboardPage from "./components/admin/admindashboard.jsx";
import ManagerDashboardPage from "./components/manager/managerdashboard.jsx";
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
import "./printz-v3/shared/styles/featuresV3.css";
import AdminDailyReadingsRevenue from "./components/admin/AdminDailyReadingsRevenue.jsx";
import AdminStockReadingsRevenue from "./components/admin/AdminStockReadingsRevenue.jsx";
import PreviousBalanceList from "./components/admin/PreviousBalanceList.jsx";
import PopupDemo from "./components/common/PopupDemo.jsx";
import InventoryTracking from "./components/admin/InventoryTracking.jsx";
import ExportData from "./components/admin/ExportData.jsx";
import JumboXeroxCsvVerifier from "./components/admin/JumboXeroxCsvVerifier.jsx";
import SalesOrder from "./components/manager/SalesOrder.jsx";
import SalesInvoice from "./components/manager/SalesInvoice.jsx";

// PrintZ V3 - Customer Foundation, Job Workflow & Commercial Quotation
import {
  CustomerEntryPage,
  MobileCustomerRegisterPage,
  CreateJobPage,
  JobListPage,
  JobDetailsPage,
  EstimateListPage,
  CreateEstimatePage,
  EditEstimatePage,
  EstimateDetailsPage,
  CustomerEstimateReviewPage,
  DesignQueuePage,
  DesignerQueuePage,
  DesignWorkspacePage,
  CustomerProofReviewPage,
  ManagerSampleApprovalPage,
  ProductionMasterPage,
  QualityControlMasterPage,
  OperatorConsolePage
} from "./printz-v3";

import { AuthProvider, useAuth, AuthContext } from "./context/AuthContext.jsx";
export { AuthProvider, useAuth, AuthContext };

const pageTitleMapping = {
  "/login": "Login",
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
  "/sales-order": "Sales Order",
  "/sales-invoice": "Sales Invoice",
  "/v3/customers": "Customer Entry & Registration",
  "/customers": "Customer Entry & Registration",
  "/customer-register": "PrintZ Mobile Customer Registration",
  "/v3/customer-register": "PrintZ Mobile Customer Registration",
  "/v3/jobs": "Job Orders & Manufacturing Specs",
  "/jobs": "Job Orders & Manufacturing Specs",
  "/v3/jobs/new": "Create Print Job Order",
  "/jobs/new": "Create Print Job Order",
  "/v3/estimates": "Quotations & Cost Estimates",
  "/estimates": "Quotations & Cost Estimates",
  "/v3/estimates/new": "Create Commercial Quotation",
  "/estimates/new": "Create Commercial Quotation",
  "/v3/design": "Designer Allocation & Queue",
  "/design": "Designer Allocation & Queue",
  "/v3/design/my-queue": "My Design Queue",
  "/design/my-queue": "My Design Queue",
  "/v3/design/workspace": "Design Workspace",
  "/design/workspace": "Design Workspace",
  "/v3/design/sample-approval": "Sample Approval",
  "/design/sample-approval": "Sample Approval",
  "/v3/customer/proof": "Customer Design Approval",
  "/customer/proof": "Customer Design Approval",
  "/v3/proof-approval": "Customer Design Approval",
  "/proof-approval": "Customer Design Approval",
  "/v3/production": "Production Planning & Workflow",
  "/production": "Production Planning & Workflow",
  "/v3/production/planning": "Production Planning & Release",
  "/production/planning": "Production Planning & Release",
  "/v3/production/orders": "Production Orders",
  "/production/orders": "Production Orders",
  "/v3/production/queue": "Live Production Queue & Station Routing",
  "/production/queue": "Live Production Queue & Station Routing",
  "/v3/production/operations": "Production Operation Execution",
  "/production/operations": "Production Operation Execution",
  "/v3/quality-control": "Quality Control & Rework / Reprint",
  "/quality-control": "Quality Control & Rework / Reprint",
  "/v3/quality-control/queue": "Quality Control Queue",
  "/quality-control/queue": "Quality Control Queue",
  "/v3/quality-control/reprints": "Reprint & Rework Authorizations",
  "/quality-control/reprints": "Reprint & Rework Authorizations",
  "/v3/operator-console": "Machine Operator Live Console",
  "/operator-console": "Machine Operator Live Console",
};



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
  const { role } = useAuth();
  if (role === "admin") {
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
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ zIndex: 9999 }}
      />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
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
          path="/sales-order"
          element={
            <PrivateRoute
              roles={["manager"]}
              component={() => (
                <ManagerLayout>
                  <SalesOrder />
                </ManagerLayout>
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
              roles={["manager"]}
              component={() => (
                <ManagerLayout>
                  <ManagerDashboardPage />
                </ManagerLayout>
              )}
            />
          }
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

        {/* PrintZ V3 - Customer Foundation Routes */}
        <Route
          path="/v3/customers"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <ManagerLayout>
                  <CustomerEntryPage />
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
                  <CustomerEntryPage />
                </ManagerLayout>
              )}
            />
          }
        />

        {/* PrintZ V3 - Job Orders & Requirement Capture Routes */}
        <Route
          path="/v3/jobs"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <ManagerLayout>
                  <JobListPage />
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
                  <JobListPage />
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
                  <CreateJobPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/jobs/new"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <ManagerLayout>
                  <CreateJobPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/jobs/:id"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <ManagerLayout>
                  <JobDetailsPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/jobs/:id"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <ManagerLayout>
                  <JobDetailsPage />
                </ManagerLayout>
              )}
            />
          }
        />

        {/* PrintZ V3 - Estimate & Quotation Routes (Step 3) */}
        <Route
          path="/v3/estimates"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <ManagerLayout>
                  <EstimateListPage />
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
                  <EstimateListPage />
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
                  <CreateEstimatePage />
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
                  <CreateEstimatePage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/estimates/:id/edit"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <ManagerLayout>
                  <EditEstimatePage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/estimates/:id/edit"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <ManagerLayout>
                  <EditEstimatePage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/estimates/:id"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <ManagerLayout>
                  <EstimateDetailsPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/estimates/:id"
          element={
            <PrivateRoute
              roles={["manager", "admin"]}
              component={() => (
                <ManagerLayout>
                  <EstimateDetailsPage />
                </ManagerLayout>
              )}
            />
          }
        />

        {/* PrintZ V3 - Design Workflow & Workspace Routes (Step 5) */}
        <Route
          path="/v3/design"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <ManagerLayout>
                  <DesignQueuePage />
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
                  <DesignQueuePage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/design/my-queue"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <ManagerLayout>
                  <DesignerQueuePage />
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
                  <DesignerQueuePage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/design/workspace/:id"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <ManagerLayout>
                  <DesignWorkspacePage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/design/workspace/:id"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <ManagerLayout>
                  <DesignWorkspacePage />
                </ManagerLayout>
              )}
            />
          }
        />

        {/* PrintZ V3 - Step 6: Sample Proof Approval & Decision Recording */}
        <Route
          path="/v3/design/sample-approval/:id"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <ManagerLayout>
                  <ManagerSampleApprovalPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/design/sample-approval/:id"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <ManagerLayout>
                  <ManagerSampleApprovalPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/jobs/:jobId/sample-approval/:id"
          element={
            <PrivateRoute
              roles={["manager", "admin", "designer"]}
              component={() => (
                <ManagerLayout>
                  <ManagerSampleApprovalPage />
                </ManagerLayout>
              )}
            />
          }
        />

        {/* Public Mobile QR Customer Registration Routes */}
        <Route path="/customer-register" element={<MobileCustomerRegisterPage />} />
        <Route path="/v3/customer-register" element={<MobileCustomerRegisterPage />} />

        {/* Public / Customer Portal Estimate Review Routes (Step 4) */}
        <Route path="/v3/customer/estimate/:id" element={<CustomerEstimateReviewPage />} />
        <Route path="/customer/estimate/:id" element={<CustomerEstimateReviewPage />} />
        <Route path="/v3/customer/estimates/:id" element={<CustomerEstimateReviewPage />} />
        <Route path="/customer/estimates/:id" element={<CustomerEstimateReviewPage />} />

        {/* Public / Customer Portal Design Proof Approval Routes (Step 6) */}
        <Route path="/design-approvals/:token" element={<CustomerProofReviewPage />} />
        <Route path="/public/design-approvals/:token" element={<CustomerProofReviewPage />} />
        <Route path="/v3/customer/proof/:id" element={<CustomerProofReviewPage />} />
        <Route path="/customer/proof/:id" element={<CustomerProofReviewPage />} />
        <Route path="/v3/proof-approval/:id" element={<CustomerProofReviewPage />} />
        <Route path="/proof-approval/:id" element={<CustomerProofReviewPage />} />

        {/* PrintZ V3 - Step 8: Production Planning & Production Orders */}
        <Route
          path="/v3/production"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <ProductionMasterPage />
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
                  <ProductionMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/production/planning"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <ProductionMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/production/planning"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <ProductionMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/production/planning/:jobItemId"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <ProductionMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/production/planning/:jobItemId"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <ProductionMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/production/orders"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <ProductionMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/production/orders"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <ProductionMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/production/orders/:orderId"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <ProductionMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/production/orders/:orderId"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <ProductionMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />

        {/* Step 9: Production Queue & Operation Execution */}
        <Route
          path="/v3/production/queue"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <ProductionMasterPage />
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
                  <ProductionMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/production/operations/:operationId"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <ProductionMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/production/operations/:operationId"
          element={
            <PrivateRoute
              roles={["manager", "admin", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <ProductionMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />

        {/* Step 10: Quality Control & Rework / Reprint */}
        <Route
          path="/v3/quality-control"
          element={
            <PrivateRoute
              roles={["manager", "admin", "qc_inspector", "quality_inspector", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <QualityControlMasterPage />
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
                  <QualityControlMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/quality-control/queue"
          element={
            <PrivateRoute
              roles={["manager", "admin", "qc_inspector", "quality_inspector", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <QualityControlMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/quality-control/queue"
          element={
            <PrivateRoute
              roles={["manager", "admin", "qc_inspector", "quality_inspector", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <QualityControlMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/quality-control/reprints"
          element={
            <PrivateRoute
              roles={["manager", "admin", "qc_inspector", "quality_inspector", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <QualityControlMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/quality-control/reprints"
          element={
            <PrivateRoute
              roles={["manager", "admin", "qc_inspector", "quality_inspector", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <QualityControlMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/v3/quality-control/:productionOrderId"
          element={
            <PrivateRoute
              roles={["manager", "admin", "qc_inspector", "quality_inspector", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <QualityControlMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />
        <Route
          path="/quality-control/:productionOrderId"
          element={
            <PrivateRoute
              roles={["manager", "admin", "qc_inspector", "quality_inspector", "production_manager", "operator", "staff"]}
              component={() => (
                <ManagerLayout>
                  <QualityControlMasterPage />
                </ManagerLayout>
              )}
            />
          }
        />

        {/* Feature 4: Sequential Operation Machine Timers (Module 08) */}
        <Route
          path="/v3/operator-console"
          element={
            <PrivateRoute
              roles={["manager", "admin", "operator", "press_operator", "production_manager", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <OperatorConsolePage />
                </LayoutWrapper>
              )}
            />
          }
        />
        <Route
          path="/operator-console"
          element={
            <PrivateRoute
              roles={["manager", "admin", "operator", "press_operator", "production_manager", "staff"]}
              component={() => (
                <LayoutWrapper>
                  <OperatorConsolePage />
                </LayoutWrapper>
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
