import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate, Link } from "react-router-dom";
import {
  FaEye,
  FaEyeSlash,
  FaEnvelope,
  FaLock,
  FaPaintBrush,
  FaUserShield,
  FaBuilding,
  FaBolt,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaIndustry,
} from "react-icons/fa";

import logo from "../../assets/logo.png";
import adminLoginIllustration from "../illustrations/admin_login_printing_illustration.svg";
import "../../styles/login.css";

// Default Manufacturing Unit accounts (filled in automatically by the Mfg tab)
const MFG_ACCOUNTS = {
  manager: { email: "mfgmanager@gmail.com", password: "123456", label: "Mfg Manager" },
  designer: { email: "mfgdesigner@gmail.com", password: "123456", label: "Mfg Designer" },
};

const DESIGNERS_LIST = [
  { name: "Mfg Designer", email: "mfg.designer@printz.com" },
  { name: "Ali Hassan", email: "ali.hassan@printz.com" },
  { name: "Siti Rahman", email: "siti.rahman@printz.com" },
  { name: "Kumar Anil", email: "kumar.anil@printz.com" },
  { name: "John Lee", email: "john.lee@printz.com" },
  { name: "Nur Aisyah", email: "nur.aisyah@printz.com" },
  { name: "Guna", email: "guna@gmail.com" },
];

export default function Login() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const { login, role, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // "admin" | "manager" | "designer" | "mfg"  (/login?tab=mfg opens the Mfg tab)
  const [activeRoleTab, setActiveRoleTab] = useState(() =>
    new URLSearchParams(window.location.search).get("tab") === "mfg" ? "mfg" : "admin"
  );
  const [mfgRole, setMfgRole] = useState("manager"); // "manager" | "designer" (inside the Mfg tab)
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
      ["ali hassan", "siti rahman", "kumar anil", "john lee", "nur aisyah"].some((n) =>
        (user?.name || "").toLowerCase().includes(n)
      );

    if (isDes) {
      localStorage.setItem("userRole", "designer");
      navigate("/jobflow/design?view=my-jobs");
    } else if (user?.role === "admin" || user?.role === "super_admin") {
      navigate("/admin-dashboard");
    } else if (user?.role === "manager") {
      navigate("/manager-dashboard");
    } else if (user?.role === "branch_staff") {
      // Branch counter staff work with sale orders; the manager dashboard is not open to them
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

  // Switch Role tab and automatically prefill appropriate credentials
  const handleSwitchRoleTab = (tab) => {
    setActiveRoleTab(tab);
    setErrorMessage("");

    if (tab === "admin") {
      if (emailRef.current) emailRef.current.value = "admin@gmail.com";
      if (passwordRef.current) passwordRef.current.value = "123456";
    } else if (tab === "manager") {
      if (emailRef.current) emailRef.current.value = "bn@printz.shop";
      if (passwordRef.current) passwordRef.current.value = "Manager@123";
    } else if (tab === "designer") {
      if (emailRef.current) emailRef.current.value = "ali.hassan@printz.com";
      if (passwordRef.current) passwordRef.current.value = "designer123";
    } else if (tab === "mfg") {
      handleSwitchMfgRole("manager");
    }
  };

  // Mfg tab: choose Manager or Designer and fill in that account
  function handleSwitchMfgRole(which) {
    setMfgRole(which);
    setErrorMessage("");
    if (emailRef.current) emailRef.current.value = MFG_ACCOUNTS[which].email;
    if (passwordRef.current) passwordRef.current.value = MFG_ACCOUNTS[which].password;
  }

  // Perform 1-Click Quick Login
  const performQuickLogin = async (email, password) => {
    if (emailRef.current) emailRef.current.value = email;
    if (passwordRef.current) passwordRef.current.value = password;
    setLoading(true);
    setErrorMessage("");

    try {
      const user = await login(email, password);
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

  // Preload initial admin credentials
  useEffect(() => {
    if (activeRoleTab === "mfg") {
      handleSwitchMfgRole("manager");
      return;
    }
    if (emailRef.current && !emailRef.current.value) {
      emailRef.current.value = "admin@gmail.com";
    }
    if (passwordRef.current && !passwordRef.current.value) {
      passwordRef.current.value = "123456";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto redirect if already logged in
  useEffect(() => {
    if (role && currentUser) {
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
            <span className="illustration-pill">
              <FaCheckCircle style={{ color: "#10b981" }} /> 1-Click Access
            </span>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Full-Screen Form & Role-Switching ───────────── */}
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
            <p>Select your role and sign in to continue</p>
          </div>

          {/* Role Switcher Tabs (Admin | Manager | Designer) */}
          <div className="role-tabs-container">
            <button
              type="button"
              className={`role-tab-btn ${
                activeRoleTab === "admin" ? "active admin-active" : ""
              }`}
              onClick={() => handleSwitchRoleTab("admin")}
            >
              <FaUserShield size={14} />
              <span>Admin</span>
            </button>

            <button
              type="button"
              className={`role-tab-btn ${
                activeRoleTab === "manager" ? "active manager-active" : ""
              }`}
              onClick={() => handleSwitchRoleTab("manager")}
            >
              <FaBuilding size={13} />
              <span>Manager</span>
            </button>

            <button
              type="button"
              className={`role-tab-btn ${
                activeRoleTab === "designer" ? "active designer-active" : ""
              }`}
              onClick={() => handleSwitchRoleTab("designer")}
            >
              <FaPaintBrush size={13} />
              <span>Designer</span>
            </button>

            <button
              type="button"
              className={`role-tab-btn ${
                activeRoleTab === "mfg" ? "active mfg-active" : ""
              }`}
              onClick={() => handleSwitchRoleTab("mfg")}
            >
              <FaIndustry size={13} />
              <span>Mfg</span>
            </button>
          </div>

          {/* Mfg tab: Manager | Designer */}
          {activeRoleTab === "mfg" && (
            <div className="mfg-subtabs" role="tablist" aria-label="Manufacturing unit role">
              {["manager", "designer"].map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={mfgRole === r}
                  className={`mfg-subtab-btn ${mfgRole === r ? "active" : ""}`}
                  onClick={() => handleSwitchMfgRole(r)}
                >
                  {r === "manager" ? <FaBuilding size={12} /> : <FaPaintBrush size={12} />}
                  <span>{r === "manager" ? "Manager" : "Designer"}</span>
                </button>
              ))}
            </div>
          )}

          {/* Inline Error Alert (No Popup) */}
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
                  placeholder={
                    activeRoleTab === "admin"
                      ? "admin@gmail.com"
                      : activeRoleTab === "manager"
                      ? "bn@printz.shop"
                      : "ali.hassan@printz.com"
                  }
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
                <>
                  <span>
                    Sign In as{" "}
                    {activeRoleTab === "mfg"
                      ? MFG_ACCOUNTS[mfgRole].label
                      : activeRoleTab.charAt(0).toUpperCase() + activeRoleTab.slice(1)}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* ─── DYNAMIC ROLE QUICK LOGIN FEATURE ─────────────────────── */}
          <div className="role-quick-login-card">
            {activeRoleTab === "mfg" && (
              <>
                <div className="quick-login-card-header">
                  <span className="quick-login-title">
                    <FaIndustry style={{ color: "#0f766e" }} /> Manufacturing Unit Access
                  </span>
                  <span className="quick-login-badge mfg-badge">
                    {mfgRole === "manager" ? "Unit Manager" : "Unit Designer"}
                  </span>
                </div>
                <p className="quick-hint-text" style={{ margin: 0 }}>
                  {mfgRole === "manager"
                    ? "Waiting queue, assign designers and see every order of the unit."
                    : "Your assigned orders: prepare designs and send them for customer approval."}
                </p>
              </>
            )}

            {activeRoleTab === "admin" && (
              <>
                <div className="quick-login-card-header">
                  <span className="quick-login-title">
                    <FaBolt style={{ color: "#3b82f6" }} /> Quick Admin Access
                  </span>
                  <span className="quick-login-badge admin-badge">
                    Super Admin
                  </span>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  className="btn-quick-action admin-btn"
                  onClick={() => performQuickLogin("admin@gmail.com", "123456")}
                >
                  <FaUserShield size={14} />
                  <span>1-Click Admin Login (admin@gmail.com)</span>
                </button>
                <p className="quick-hint-text">
                  Full control: system analytics, multi-branch, and configuration.
                </p>
              </>
            )}

            {activeRoleTab === "manager" && (
              <>
                <div className="quick-login-card-header">
                  <span className="quick-login-title">
                    <FaBolt style={{ color: "#10b981" }} /> Quick Manager Access
                  </span>
                  <span className="quick-login-badge manager-badge">
                    Banaswadi Branch
                  </span>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  className="btn-quick-action manager-btn"
                  onClick={() => performQuickLogin("bn@printz.shop", "Manager@123")}
                >
                  <FaBuilding size={14} />
                  <span>1-Click Manager Login (bn@printz.shop)</span>
                </button>
                <p className="quick-hint-text">
                  Branch operations: daily attendance, printer counter readings & POS.
                </p>
              </>
            )}

            {activeRoleTab === "designer" && (
              <>
                <div className="quick-login-card-header">
                  <span className="quick-login-title">
                    <FaBolt style={{ color: "#8b5cf6" }} /> 1-Click Studio Designer Login
                  </span>
                  <span className="quick-login-badge designer-badge">
                    6 Designers
                  </span>
                </div>

                <div className="designers-chips-grid">
                  {DESIGNERS_LIST.map((des) => (
                    <button
                      key={des.email}
                      type="button"
                      disabled={loading}
                      title={`Login as ${des.name} (${des.email})`}
                      className="designer-chip-btn"
                      onClick={() => performQuickLogin(des.email, "designer123")}
                    >
                      <FaPaintBrush size={10} style={{ color: "#16a34a" }} />
                      <span>{des.name}</span>
                    </button>
                  ))}
                </div>

                <Link to="/designer/login" className="designer-portal-link">
                  <span>Open Dedicated Designer Studio Portal</span>
                  <span>→</span>
                </Link>
              </>
            )}
          </div>

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
