
import { useRef, useState, useEffect } from "react";
import { useAuth } from "../../App";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore"; // <<< MODIFIED: Added query and where
import { db } from "../../services/authservice";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { usePopup } from "../../hooks/usePopup";
import Popup from "../common/Popup";
import logo from "../../assets/logo.png";

const Login = () => {
  const { popup, showError, showInfo } = usePopup();
  const emailRef = useRef();
  const passwordRef = useRef();
  const { login, role, currentUser } = useAuth(); // <<< MODIFIED: Added currentUser
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailOrPhone = emailRef.current.value;
    const password = passwordRef.current.value;

    if (!emailOrPhone || !password) {
      showError("Please enter both email/phone and password");
      return;
    }

    setLoading(true);

    try {
      let emailToUse = emailOrPhone;

      // Using a more efficient Firestore query
      if (!emailOrPhone.includes("@")) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("phone", "==", emailOrPhone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error("Phone number not registered");
        }
        emailToUse = querySnapshot.docs[0].data().email;
      }

      showInfo("Signing in...", "Authentication", false);
      await login(emailToUse, password);
    } catch (error) {
      showError(`Failed to log in: ${error.message || "Check credentials"}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role && currentUser) { // <<< MODIFIED: Check for currentUser
        // Use the email from the auth context for accuracy
        const user = {
            email: currentUser.email,
        };
        localStorage.setItem("user", JSON.stringify(user));

        if (role === "admin") navigate("/admin-dashboard");
        else if (role === "manager") navigate("/manager-dashboard");
        else navigate("/login");
    }
}, [role, navigate, currentUser]); // <<< MODIFIED: Added currentUser dependency

  // Inline styles
  const inputStyle = {
    width: "100%",
    padding: "12px 40px 12px 12px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    height: '48px', // Ensure consistent height
  };

  const inputWrapperStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    // <<< FIX: Added a fixed height to the wrapper >>>
    // This prevents the entire div from resizing during re-renders.
    height: "48px",
  };

  // Find this style object again
const toggleBtnStyle = {
    position: "absolute",
    right: "12px", // Adjust this value for perfect placement
    height: '100%',
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",

    // --- Add these lines to override the global button styles ---
    minWidth: 'auto',
    margin: 0,
    padding: 0,
    border: 'none',
    background: 'transparent',
    // ---------------------------------------------------------

    fontSize: "16px",
    color: "#555",
  };

  return (
    <div className="login-page">
      <Popup {...popup} />
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-container">
              <img
                src={logo || "/placeholder.svg"}
                alt="Company Logo"
                className="login-logo"
              />
            </div>
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">
              Sign in to continue to your account
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="emailOrPhone">Email or Phone</label>
              <div style={inputWrapperStyle}>
                <input
                  type="text"
                  id="emailOrPhone"
                  ref={emailRef}
                  style={inputStyle}
                  placeholder="Enter email or phone number"
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div style={inputWrapperStyle}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  ref={passwordRef}
                  style={inputStyle}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  style={toggleBtnStyle}
                  onClick={togglePasswordVisibility}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <button
                type="submit"
                className="login-btn"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "#007bff",
                  color: "#fff",
                  fontSize: "16px",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  height: '48px', // Match input field height for consistency
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="login-footer">
            <p>© {new Date().getFullYear()} Company. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;