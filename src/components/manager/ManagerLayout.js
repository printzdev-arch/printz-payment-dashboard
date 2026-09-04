import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { IoExitOutline } from "react-icons/io5";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/authservice";
import Logo from "../../assets/logo.png";
import "../../styles/sidebar.css";
import { useAuth } from "../../App";

const ManagerLayout = ({ children }) => {
  // Initialize synchronously from localStorage to avoid a render flash
  const [profilePicUrl, setProfilePicUrl] = useState(() => {
    try {
      return localStorage.getItem("profilePicUrl") || "";
    } catch (e) {
      return "";
    }
  });
  const [branchName, setBranchName] = useState(() => {
    try {
      return localStorage.getItem("userBranchName") || "";
    } catch (e) {
      return "";
    }
  });
  const [gradientEnabled, setGradientEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebarGradientEnabled");
      return saved !== null ? JSON.parse(saved) : false;
    } catch (e) {
      return false;
    }
  });

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

  // Persist profilePicUrl and branchName to localStorage when they change
  useEffect(() => {
    try {
      if (profilePicUrl) localStorage.setItem("profilePicUrl", profilePicUrl);
      else localStorage.removeItem("profilePicUrl");
    } catch (e) {
      /* ignore */
    }
  }, [profilePicUrl]);

  useEffect(() => {
    try {
      if (branchName) localStorage.setItem("userBranchName", branchName);
      else localStorage.removeItem("userBranchName");
    } catch (e) {
      /* ignore */
    }
  }, [branchName]);

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

  const toggleGradient = () => {
    const newValue = !gradientEnabled;
    setGradientEnabled(newValue);
    localStorage.setItem("sidebarGradientEnabled", JSON.stringify(newValue));
  };

  return (
    <div className="layout">
      <div className={`sidebar ${gradientEnabled ? "gradient-enabled" : ""}`}>
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
              className={
                isActiveRoute("/manager-dashboard") ? "active-link" : ""
              }
            >
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/printer-readings-manager"
              className={
                isActiveRoute("/printer-readings-manager") ? "active-link" : ""
              }
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
        </ul>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {/* Gradient Toggle */}
          <div className="gradient-toggle-section">
            <button onClick={toggleGradient} className="gradient-toggle-button">
              <span>{gradientEnabled ? "Disable" : "Enable"} Gradient</span>
            </button>
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

export default ManagerLayout;
