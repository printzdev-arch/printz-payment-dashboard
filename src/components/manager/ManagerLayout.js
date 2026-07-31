import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { IoExitOutline } from "react-icons/io5";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/authservice";
import { FaChevronDown } from "react-icons/fa";
import Logo from "../../assets/logo.png";
import "../../styles/sidebar.css";
import { useAuth } from "../../App";

const ManagerLayout = ({ children }) => {
  const [isEnterDataOpen, setIsEnterDataOpen] = useState(false);
  const [isRevenueDataOpen, setIsRevenueDataOpen] = useState(false);
  const [isPosOpen, setIsPosOpen] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [branchName, setBranchName] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        const userDoc = doc(db, "users", currentUser.uid);
        const userSnapshot = await getDoc(userDoc);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          setProfilePicUrl(userData.profilePicUrl || "");
          if (userData.role === "manager") {
            setBranchName(userData.branch || "No Branch");
          }
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  useEffect(() => {
    const path = location.pathname;

    if (
      path.includes("/printer-readings-manager") ||
      path.includes("/jumbo-xerox") ||
      path.includes("/stock-list-manager") ||
      path.includes("/total-amount-display")
    ) {
      setIsEnterDataOpen(true);
    } else {
      setIsEnterDataOpen(false);
    }

    if (
      path.includes("/display-printer-readings-manager") ||
      path.includes("/search-stock-list-manager") ||
      path.includes("/jumbo-xerox-list-manager") ||
      path.includes("/total-amount-list-manager")
    ) {
      setIsRevenueDataOpen(true);
    } else {
      setIsRevenueDataOpen(false);
    }

    // Logic for POS menu to keep it open when its sub-routes are active
    if (path.includes("/sales-order") || path.includes("/sales-receipt")) {
      setIsPosOpen(true);
    } else {
      setIsPosOpen(false);
    }
  }, [location.pathname]);

  const toggleEnterData = () => {
    setIsEnterDataOpen((prevState) => !prevState);
  };

  const toggleRevenueData = () => {
    setIsRevenueDataOpen((prevState) => !prevState);
  };

  const togglePos = () => {
    setIsPosOpen((prevState) => !prevState);
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

  return (
    <div className="layout">
      <div className="sidebar">
        {/* Sidebar Logo */}
        <div className="sidebar-logo">
          <img src={Logo || "/placeholder.svg"} alt="logo" />
        </div>

        {/* Branch Display */}
        {branchName && (
          <div className="branch-display">
            <span className="branch-text">{branchName} Branch</span>
          </div>
        )}

        {/* Navigation Links */}
        <ul>
          <li>
            <NavLink
              to="/manager-dashboard"
              className={isActiveRoute("/manager-dashboard") ? "active-link" : ""}
            >
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/printer-readings-manager"
              className={isActiveRoute("/printer-readings-manager") ? "active-link" : ""}
            >
              Account Sheet Generation
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/pdf-generator"
              className={isActiveRoute("/pdf-generator") ? "active-link" : ""}
            >
              Generate PDF Report
            </NavLink>
          </li>
          
          {/* POS Section (New) */}
          {/* <li className="dropdown-menu">
            <div
              onClick={togglePos}
              className={`dropdown-header-pos ${
                isPosOpen || location.pathname.includes("/sales-order") || location.pathname.includes("/sales-receipt")
                  ? "active-link"
                  : ""
              }`}
            >
              <span>POS</span>
              <FaChevronDown className={`dropdown-icon ${isPosOpen ? "open" : ""}`} />
            </div>
            {isPosOpen && (
              <ul className="dropdown-list">
                <li>
                  <NavLink
                    to="/sales-order"
                    className={isActiveRoute("/sales-order") ? "active-link-sub" : ""}
                  >
                    Sales Order
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/sales-invoice"
                    className={isActiveRoute("/sales-receipt") ? "active-link-sub" : ""}
                  >
                    Sales Receipt
                  </NavLink>
                </li>
              </ul>
            )}
          </li> */}
        </ul>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {/* Profile Section (Commented out as in original code) */}
          {/* <div className="profile-section" onClick={handleProfile}>
            {profilePicUrl ? (
              <img src={profilePicUrl || "/placeholder.svg"} alt="Profile" className="profile-avatar-sidebar" />
            ) : (
              <FaUserCircle size={24} className="profile-icon-sidebar" />
            )}
            <span className="profile-text">Profile</span>
          </div> */}
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

export default ManagerLayout;
