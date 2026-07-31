import React, { useState, useEffect, createContext, useContext } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "./services/authservice";
import { doc, getDoc } from "firebase/firestore";
import Shimmer from "./components/common/shimmer";


// All your component imports are preserved

import AddJumboXeroxPage from "./components/admin/AddJumboXerox";
import LoginPage from "./components/common/login";
import ForgotPasswordPage from "./components/common/forgotpassword";
import AdminDashboardPage from "./components/admin/admindashboard";
import ManagerDashboardPage from "./components/manager/managerdashboard";
import AddManagerPage from "./components/admin/AddManager";
import AddAdminPage from "./components/admin/AddAdmin";
import PastDateRequests from "./components/admin/PastDateRequests";
import AddPrinterManagerPage from "./components/manager/AddPrinterManager";
import MovePrinterManagerPage from "./components/manager/MovePrinterManager";
import PrinterListPage from "./components/admin/PrinterList";
import PrinterListManagerPage from "./components/manager/PrinterList";
import StockListPage from "./components/admin/StockList";
import AddStockManagerPage from "./components/manager/AddStock";
import AddCategoryPage from "./components/manager/AddCategory";
import AddBranchPage from "./components/admin/AddBranch";
import MoveStockManagerPage from "./components/manager/MoveStock";
import PrinterReadingsManagerPage from "./components/manager/PrinterReadings";
import DisplayPrinterReadingsAdminPage from "./components/admin/DisplayPrinterReadings";
import DisplayPrinterReadingsManagerPage from "./components/manager/DisplayPrinterReadings";
import JumboXeroxPage from "./components/manager/JumboXerox";
import TotalAmountDisplayPage from "./components/manager/TotalAmountDisplay";
import JumboXeroxListAdminPage from "./components/admin/JumboXeroxList";
import JumboXeroxListManagerPage from "./components/manager/JumboXeroxList";
import TotalAmountListAdminPage from "./components/admin/TotalAmountList";
import TotalAmountListManagerPage from "./components/manager/TotalAmountList";
import ProfilePage from "./components/common/Profile";
import PrivateRoute from "./components/common/PrivateRoute";
import AdminLayout from "./components/admin/AdminLayout";
import ManagerLayout from "./components/manager/ManagerLayout";
import SearchStockListAdmin from "./components/admin/SearchStockList";
import SearchStockListManager from "./components/manager/SearchStockList";
import StockItemListPage from "./components/manager/StockItemList";
import StockListManagerPage from "./components/manager/StockList";
import PdfGenerator from "./components/manager/PdfGenerator";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminDailyReadingsRevenue from "./components/admin/AdminDailyReadingsRevenue";
import AdminStockReadingsRevenue from "./components/admin/AdminStockReadingsRevenue";
import PreviousBalanceList from "./components/admin/PreviousBalanceList";
import PopupDemo from "./components/common/PopupDemo";
import AddAssets from "./components/admin/AddAssets";
import MoveAssets from "./components/admin/MoveAssets";
import AssetsList from "./components/admin/AssetsList";
import InventoryTracking from "./components/admin/InventoryTracking";
import ExportData from "./components/admin/ExportData";
import JumboXeroxCsvVerifier from "./components/admin/JumboXeroxCsvVerifier";
import AddExpense from "./components/admin/AddExpense";
import SalesOrder from "./components/manager/SalesOrder";
import SalesInvoice from "./components/manager/SalesInvoice";


// --- 1. CONTEXT AND HOOK ARE CREATED HERE ---
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// --- 2. AUTH PROVIDER LOGIC LIVES HERE ---
const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, `users/${user.uid}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRole(docSnap.data().role);
          setPermissions(docSnap.data().permissions);
          setCurrentUser(user);
        } else {
          await auth.signOut();
        }
      } else {
        setCurrentUser(null);
        setRole(null);
        setPermissions(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);



   // --- ADDED BACK: The login, logout, and resetPassword functions ---
  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    return signOut(auth);
  };

  const resetPassword = async (email) => {
    return sendPasswordResetEmail(auth, email);
  };
 // --- UPDATED: Add the functions to the value provided by the context ---
  const value = {
    currentUser,
    role,
    permissions,
    login,
    logout,
    resetPassword,
  };

  if (loading) {
    return <div><Shimmer /> </div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

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
  "/add-assets": "Add Assets",
  "/move-assets": "Move Assets",
  "/assets-list": "Assets List",
  "/inventory-tracking": "Inventory Tracking",
  "/export-data": "Export Data",
  "/jumbo-xerox-csv-verifier": "Jumbo Xerox CSV Verifier",
    "/sales-order": "Sales Order",
  "/sales-invoice": "Sales Invoice",
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
          path="/add-expense"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <AdminLayout>
                  <AddExpense />
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
                  <SalesOrder/>
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
                  <SalesInvoice/>
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
          path="/add-assets"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <AdminLayout>
                  <AddAssets />
                </AdminLayout>
              )}
            />
          }
        />
        <Route
          path="/move-assets"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <AdminLayout>
                  <MoveAssets />
                </AdminLayout>
              )}
            />
          }
        />
        <Route
          path="/assets-list"
          element={
            <PrivateRoute
              roles={["admin"]}
              component={() => (
                <AdminLayout>
                  <AssetsList />
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
                </ ManagerLayout>
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
            <AdminLayout>
              <PrivateRoute component={ProfilePage} />
            </AdminLayout>
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
      </Routes>
    </>
  );
};


// --- 3. THE MAIN EXPORTED COMPONENT WRAPS EVERYTHING ---
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;