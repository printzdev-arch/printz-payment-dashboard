import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import {
  FaEye,
  FaEyeSlash,
  FaEnvelope,
  FaLock,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";

import logo from "../../assets/logo.png";
import adminLoginIllustration from "../illustrations/admin_login_printing_illustration.svg";
import "../../styles/login.css";

// Survives Login remounts, so a redirect ping-pong can be detected
let lastAutoRedirectAt = 0;

export default function Login() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const { login, role, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  // Navigate according to user's assigned role
  const handleRedirectByRole = (user) => {
    // Manufacturing unit staff have their own portal
    if (user?.role === "mfg_designer" || user?.role === "mfg_manager") {
      navigate("/mfg/dashboard");
      return;
    }

    const isDes =
      user?.role === "designer" ||
      ["ali hassan", "siti rahman", "kumar anil", "john lee", "nur aisyah", "guna"].some((n) =>
        (user?.name || "").toLowerCase().includes(n)
      ) ||
      (user?.email || "").toLowerCase() === "guna@gmail.com";

    if (isDes) {
      localStorage.setItem("userRole", "designer");
      navigate("/jobflow/design?view=my-jobs");
    } else if (user?.role === "admin" || user?.role === "super_admin") {
      navigate("/admin-dashboard");
    } else if (user?.role === "manager") {
      navigate("/manager-dashboard");
    } else if (
      user?.role === "branch_staff" ||
      user?.role === "branch_manager" ||
      user?.role === "branch_manager1"
    ) {
      // branch managers are not allowed on /manager-dashboard (manager/admin only);
      // sending them there bounces back to /login and loops forever
      navigate("/sale-orders");
    } else if (user?.role === "operator") {
      navigate("/v3/production/queue");
    } else if (user?.role === "qc_inspector") {
      navigate("/v3/quality-control/queue");
    } else if (user?.role === "staff" || user?.role === "cashier") {
      navigate("/sales-pos");
    } else {
      navigate("/manager-dashboard");
    }
  };

  // Standard Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailOrPhone = emailRef.current?.value?.trim();
    const password = passwordRef.current?.value;

    if (!emailOrPhone || !password) {
      setErrorMessage("Please enter both email/phone and password.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const user = await login(emailOrPhone, password);
      handleRedirectByRole(user);
    } catch (error) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to log in. Please check credentials.";
      setErrorMessage(errorMsg);
      setLoading(false);
    }
  };

  // Auto redirect if already logged in
  // Loop guard: if the page we redirect to bounces the user straight back to /login
  // (role not allowed there), skip a second auto-redirect within a short window.
  useEffect(() => {
    if (role && currentUser) {
      const now = Date.now();
      if (now - lastAutoRedirectAt < 3000) {
        setErrorMessage(
          `Your account role (${currentUser?.role || role}) has no page assigned. Please contact an administrator.`
        );
        return;
      }
      lastAutoRedirectAt = now;
      handleRedirectByRole(currentUser);
    }
  }, [role, currentUser]);

  return (
    <div className="login-full-page">
      {/* ─── LEFT PANEL: Full-Screen Printing Illustration Hero ────────── */}
      <div className="login-left-panel">
        <div className="illustration-header-badge">
          <span className="badge-dot" />
          <span>Guna PrintZ Enterprise Portal</span>
        </div>

        <div className="illustration-img-container">
          <img
            src={adminLoginIllustration}
            alt="Admin Login Printing Illustration"
            className="login-printing-img"
          />
        </div>

        <div className="illustration-bottom-info">
          <h2>
            Intelligent <span>Printing & Operations</span>
          </h2>
          <p>
            Complete multi-branch management for real-time print queues,
            designer studio, attendance & POS billing.
          </p>

          <div className="illustration-pills-row">
            <span className="illustration-pill">
              <FaCheckCircle style={{ color: "#10b981" }} /> Multi-Branch Sync
            </span>
            <span className="illustration-pill">
              <FaCheckCircle style={{ color: "#10b981" }} /> Print Job Queue
            </span>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Full-Screen Form ────────────────────────────── */}
      <div className="login-right-panel">
        <div className="login-right-inner">
          <div className="login-form-header">
            <img
              src={logo || "/placeholder.svg"}
              alt="Printz Logo"
              className="login-brand-logo"
            />
            <h1>
              Welcome <span>Back</span>
            </h1>
            <p>Sign in to your account to continue</p>
          </div>

          {/* Inline Error Alert */}
          {errorMessage && (
            <div className="login-inline-error">
              <FaExclamationCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="login-input-group">
              <label htmlFor="loginEmailOrPhone" className="login-input-label">
                Email or Phone
              </label>
              <div className="login-input-wrapper">
                <FaEnvelope className="login-input-icon" />
                <input
                  type="text"
                  id="loginEmailOrPhone"
                  ref={emailRef}
                  placeholder="Enter your email or phone"
                  required
                  disabled={loading}
                  autoComplete="username"
                  className="login-text-input"
                  onChange={() => errorMessage && setErrorMessage("")}
                />
              </div>
            </div>

            <div className="login-input-group">
              <label htmlFor="loginPassword" className="login-input-label">
                Password
              </label>
              <div className="login-input-wrapper">
                <FaLock className="login-input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="loginPassword"
                  ref={passwordRef}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="login-text-input password-input"
                  onChange={() => errorMessage && setErrorMessage("")}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="login-password-toggle-btn"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn"
            >
              {loading ? (
                <>
                  <div className="btn-spinner" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Footer Security Note */}
          <div className="login-footer-info">
            <FaShieldAlt style={{ color: "#10b981" }} />
            <span>256-bit Encrypted Session • Guna PrintZ v3.2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
