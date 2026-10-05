import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../../assets/logo.png'; 
import { FaUserCircle, FaHome } from 'react-icons/fa';
import { IoExitOutline } from 'react-icons/io5';
import '../../styles/header.css';

const Header = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [branchName, setBranchName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');

  useEffect(() => {
    if (currentUser) {
      setUserRole(currentUser.role || '');
      setProfilePicUrl(currentUser.profilePicUrl || '');

      if (currentUser.role === 'manager') {
        setBranchName(currentUser.branch || 'No Branch');
      }
    }
  }, [currentUser]);

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
    navigate('/profile');
  };

  const handleNavigateBack = () => {
    navigate(-1); 
  };

  return (
    <header className="header">
      <div className="logo" style={{ display: "flex", alignItems: "center" }}>
        <img src={Logo} alt="logo" style={{ maxHeight: "38px", objectFit: "contain" }} />
      </div>
      <div className="header-right" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {userRole === 'manager' && branchName && (
          <div
            className="branch-name"
            style={{
              padding: "4px 12px",
              background: "#ecfdf5",
              color: "#047857",
              border: "1px solid #a7f3d0",
              borderRadius: "9999px",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            {branchName} Branch
          </div>
        )}

        {location.pathname === '/profile' ? (
          <FaHome
            size={26}
            className="home-icon"
            onClick={handleNavigateBack}
            style={{ cursor: "pointer", color: "#059669", transition: "transform 0.2s" }}
            title="Go Back"
          />
        ) : profilePicUrl ? (
          <img
            src={profilePicUrl}
            alt="Profile"
            className="profile-avatar"
            onClick={handleProfile}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              objectFit: "cover",
              cursor: "pointer",
              border: "2px solid #059669",
            }}
            title="Profile"
          />
        ) : (
          <FaUserCircle
            size={28}
            className="profile-icon"
            onClick={handleProfile}
            style={{ cursor: "pointer", color: "#64748b" }}
            title="Profile"
          />
        )}

        <IoExitOutline
          size={28}
          className="logout-icon"
          onClick={handleLogout}
          style={{ cursor: "pointer", color: "#ef4444", transition: "transform 0.2s" }}
          title="Logout"
        />
      </div>
    </header>
  );
};

export default Header;
