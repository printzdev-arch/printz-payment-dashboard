import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FaCaretDown, FaCaretRight, FaUserCircle } from "react-icons/fa";
import { IoExitOutline } from "react-icons/io5";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/authservice";
import Logo from "../../assets/logo.png";
import "../../styles/sidebar.css";
import { useAuth } from "../../App";

const AdminLayout = ({ children }) => {
  const [isRevenueToggled, setIsRevenueToggled] = useState(false);
  const [isPrinterToggled, setIsPrinterToggled] = useState(false);
  const [isStockToggled, setIsStockToggled] = useState(false);
  const [isAssetsToggled, setIsAssetsToggled] = useState(false);
  const [isAdditionalToggled, setIsAdditionalToggled] = useState(false);
  // Initialize profile pic from localStorage (synchronous) to avoid flicker
  const initialProfilePic = (() => {
    try {
      const raw = localStorage.getItem("profilePicUrl");
      return raw ? raw : "";
    } catch (e) {
      return "";
    }
  })();

  const [profilePicUrl, setProfilePicUrl] = useState(initialProfilePic);
  // Read initial gradient preference synchronously to avoid a render flash
  const initialGradient = (() => {
    try {
      const raw = localStorage.getItem("sidebarGradientEnabled");
      return raw !== null ? JSON.parse(raw) : false;
    } catch (e) {
      return false;
    }
  })();

  const [gradientEnabled, setGradientEnabled] = useState(initialGradient);
  // Removed unused userRole state

  const location = useLocation();
  const navigate = useNavigate();
  const { permissions, logout, currentUser } = useAuth();

  const {
    isDashboardCapability = false,
    isPrinterCapability = false,
    isStockCapability = false,
    isRevenueCapability = false,
    isAddAdmin = false,
    isAddManager = false,
    isExtraCapability = false,
  } = permissions || {};

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        const userDoc = doc(db, "users", currentUser.uid);
        const userSnapshot = await getDoc(userDoc);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          const pic =
            userData.profilePicUrl ||
            (currentUser && currentUser.photoURL) ||
            "";
          setProfilePicUrl(pic);
          try {
            localStorage.setItem("profilePicUrl", pic);
          } catch (e) {
            // ignore
          }
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  // keep localStorage in sync when user toggles gradient
  useEffect(() => {
    try {
      localStorage.setItem(
        "sidebarGradientEnabled",
        JSON.stringify(gradientEnabled)
      );
    } catch (e) {
      // ignore
    }
  }, [gradientEnabled]);

  // Compute if dropdown should be open: either manually toggled or path matches
  const isRevenueDataOpen =
    isRevenueToggled ||
    location.pathname.includes("/admin-daily-readings-revenue") ||
    location.pathname.includes("/admin-stock-readings-revenue");

  const isPrinterDataOpen =
    isPrinterToggled ||
    location.pathname.includes("/add-printer-manager") ||
    location.pathname.includes("/move-printer-manager") ||
    location.pathname.includes("/printer-list");

  const isStockDataOpen =
    isStockToggled ||
    location.pathname.includes("/add-stock-manager") ||
    location.pathname.includes("/move-stock-manager") ||
    location.pathname.includes("/stock-list") ||
    location.pathname.includes("/add-category");

  const isAssetsDataOpen =
    isAssetsToggled ||
    location.pathname.includes("/add-assets") ||
    location.pathname.includes("/move-assets") ||
    location.pathname.includes("/assets-list");

  const isAdditionalOpen =
    isAdditionalToggled ||
    location.pathname.includes("/pastDateRequests") ||
    location.pathname.includes("/previous-balance-list") ||
    location.pathname.includes("/inventory-tracking") ||
    location.pathname.includes("/export-data") ||
    location.pathname.includes("/add-expense") ||
    location.pathname.includes("/jumbo-xerox-csv-verifier") ||
    isAssetsDataOpen;

  const toggleRevenueData = () => {
    setIsRevenueToggled((prev) => !prev);
  };

  const togglePrinterData = () => {
    setIsPrinterToggled((prev) => !prev);
  };

  const toggleStockData = () => {
    setIsStockToggled((prev) => !prev);
  };

  const toggleAssetsData = () => {
    setIsAssetsToggled((prev) => !prev);
  };

  const toggleAdditionaldData = () => {
    setIsAdditionalToggled((prev) => !prev);
  };

  const isActiveRoute = (route) => {
    return location.pathname === route;
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("userBranchName");
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleProfile = () => {
    navigate("/profile");
  };

  const toggleGradient = () => {
    const newValue = !gradientEnabled;
    setGradientEnabled(newValue);
    localStorage.setItem("sidebarGradientEnabled", JSON.stringify(newValue));
  };

  return (
    <div className="layout">
      <div className={`sidebar ${gradientEnabled ? "gradient-enabled" : ""}`}>
        <div className="sidebar-logo">
          <img src={Logo || "/placeholder.svg"} alt="logo" width="100%" />
        </div>
        <ul>
          {isDashboardCapability && (
            <li>
              <NavLink
                to="/admin-dashboard"
                className={
                  isActiveRoute("/admin-dashboard") ? "active-link" : ""
                }
              >
                Dashboard
              </NavLink>
            </li>
          )}

          {isAddAdmin && (
            <>
              <li>
                <NavLink
                  to="/add-admin"
                  className={isActiveRoute("/add-admin") ? "active-link" : ""}
                >
                  Admins
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/add-branch"
                  className={isActiveRoute("/add-branch") ? "active-link" : ""}
                >
                  Add Branch
                </NavLink>
              </li>
            </>
          )}

          {isAddManager && (
            <li>
              <NavLink
                to="/add-manager"
                className={isActiveRoute("/add-manager") ? "active-link" : ""}
              >
                Add Manager
              </NavLink>
            </li>
          )}

          {isPrinterCapability && (
            <li className="dropdown-container">
              <button onClick={togglePrinterData} className="dropdown-btn">
                Printer {isPrinterDataOpen ? <FaCaretDown /> : <FaCaretRight />}
              </button>
              {isPrinterDataOpen && (
                <ul className="dropdown">
                  <li>
                    <NavLink
                      to="/add-printer-manager"
                      className={
                        isActiveRoute("/add-printer-manager")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Add Printer
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/move-printer-manager"
                      className={
                        isActiveRoute("/move-printer-manager")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Move Printer
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/printer-list"
                      className={
                        isActiveRoute("/printer-list")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Printer List
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          )}

          {isStockCapability && (
            <li className="dropdown-container">
              <button onClick={toggleStockData} className="dropdown-btn">
                Stock {isStockDataOpen ? <FaCaretDown /> : <FaCaretRight />}
              </button>
              {isStockDataOpen && (
                <ul className="dropdown">
                  <li>
                    <NavLink
                      to="/add-stock-manager"
                      className={
                        isActiveRoute("/add-stock-manager")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Add Stock
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/move-stock-manager"
                      className={
                        isActiveRoute("/move-stock-manager")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Move Stock
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/stock-list"
                      className={
                        isActiveRoute("/stock-list")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Stock List
                    </NavLink>
                  </li>
                  {/* <li>
                    <NavLink
                      to="/add-category"
                      className={isActiveRoute("/add-category") ? "dropdown-item active" : "dropdown-item"}
                    >
                      Add Category
                    </NavLink>
                  </li> */}
                </ul>
              )}
            </li>
          )}

          {isRevenueCapability && (
            <li className="dropdown-container">
              <button onClick={toggleRevenueData} className="dropdown-btn">
                Revenue Data{" "}
                {isRevenueDataOpen ? <FaCaretDown /> : <FaCaretRight />}
              </button>
              {isRevenueDataOpen && (
                <ul className="dropdown">
                  <li>
                    <NavLink
                      to="/admin-daily-readings-revenue"
                      className={
                        isActiveRoute("/admin-daily-readings-revenue")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Daily Readings Revenue
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/admin-stock-readings-revenue"
                      className={
                        isActiveRoute("/admin-stock-readings-revenue")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Stock Readings Revenue
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          )}

          {isExtraCapability && (
            <li className="dropdown-container">
              <button onClick={toggleAdditionaldData} className="dropdown-btn">
                Extra features{" "}
                {isAdditionalOpen ? <FaCaretDown /> : <FaCaretRight />}
              </button>

              {isAdditionalOpen && (
                <ul className="dropdown">
                  <li className="dropdown-container">
                    <button onClick={toggleAssetsData} className="dropdown-btn">
                      Assets{" "}
                      {isAssetsDataOpen ? <FaCaretDown /> : <FaCaretRight />}
                    </button>
                    {isAssetsDataOpen && (
                      <ul className="dropdown">
                        <li>
                          <NavLink
                            to="/add-assets"
                            className={
                              isActiveRoute("/add-assets")
                                ? "dropdown-item active"
                                : "dropdown-item"
                            }
                          >
                            Add Assets
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/move-assets"
                            className={
                              isActiveRoute("/move-assets")
                                ? "dropdown-item active"
                                : "dropdown-item"
                            }
                          >
                            Move Assets
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/assets-list"
                            className={
                              isActiveRoute("/assets-list")
                                ? "dropdown-item active"
                                : "dropdown-item"
                            }
                          >
                            Assets List
                          </NavLink>
                        </li>
                      </ul>
                    )}
                  </li>

                  <li>
                    <NavLink
                      to="/pastDateRequests"
                      className={
                        isActiveRoute("/pastDateRequests")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Past Date Requests
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/previous-balance-list"
                      className={
                        isActiveRoute("/previous-balance-list")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Previous Balance List
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/inventory-tracking"
                      className={
                        isActiveRoute("/inventory-tracking")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Inventory Tracking
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/export-data"
                      className={
                        isActiveRoute("/export-data")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Export Data
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/add-expense"
                      className={
                        isActiveRoute("/add-expense")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Add Expense
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/jumbo-xerox-csv-verifier"
                      className={
                        isActiveRoute("/jumbo-xerox-csv-verifier")
                          ? "dropdown-item active"
                          : "dropdown-item"
                      }
                    >
                      Jumbo Xerox CSV Verifier
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          )}
        </ul>

        <div className="sidebar-footer">
          {/* Gradient Toggle */}
          <div className="gradient-toggle-section">
            <button onClick={toggleGradient} className="gradient-toggle-button">
              <span>{gradientEnabled ? "Disable" : "Enable"} Gradient</span>
            </button>
          </div>

          <div className="profile-section" onClick={handleProfile}>
            {profilePicUrl ? (
              <img
                src={profilePicUrl || "/placeholder.svg"}
                alt="Profile"
                className="profile-avatar-sidebar"
              />
            ) : (
              <FaUserCircle size={24} className="profile-icon-sidebar" />
            )}
            <span className="profile-text">Profile</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <IoExitOutline size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
      <div className="content">{children}</div>
    </div>
  );
};

export default AdminLayout;
