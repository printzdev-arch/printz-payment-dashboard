
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../services/authservice';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/authservice';
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
    const fetchUserData = async () => {
      if (currentUser) {
        const userDoc = doc(db, 'users', currentUser.uid);
        const userSnapshot = await getDoc(userDoc);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          setUserRole(userData.role || '');
          setProfilePicUrl(userData.profilePicUrl || '');
  
          if (userData.role === 'manager') {
            setBranchName(userData.branch || 'No Branch');
          }
        }
      }
    };
  
    fetchUserData();
  }, [currentUser]);


    const handleLogout = async () => {
    try {
      
      localStorage.removeItem("userBranchName")

      await logout();
      navigate("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const handleProfile = () => {
    navigate('/profile');
  };

  const handleNavigateBack = () => {
    navigate(-1); 
  };

  return (
    <header className="header">
      <div className="logo">
        <img src={Logo} alt="logo" />
      </div>
      <div className="header-right">
        {}
        {userRole === 'manager' && (
          <div className="branch-name">
            <b>{branchName} Branch</b>
          </div>
        )}
        {location.pathname === '/profile' ? (
  <FaHome size={30} className="home-icon" onClick={handleNavigateBack} />
) : profilePicUrl ? (
  <img
    src={profilePicUrl}
    alt="Profile"
    className="profile-avatar"
    onClick={handleProfile}
  />
) : (
  <FaUserCircle size={30} className="profile-icon" onClick={handleProfile} />
)}

        <IoExitOutline size={30} className="logout-icon" onClick={handleLogout} />
      </div>
    </header>
  );
};

export default Header;