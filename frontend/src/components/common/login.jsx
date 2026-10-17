import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaPaintBrush } from "react-icons/fa";

import { usePopup } from "../../hooks/usePopup";
import Popup from "./Popup.jsx";
import logo from "../../assets/logo.png";
import "../../styles/login.css";

const Login = () => {
  const { popup, showError, showInfo } = usePopup();
  const emailRef = useRef();
  const passwordRef = useRef();
  const { login, role, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailOrPhone = emailRef.current.value.trim();
    const password = passwordRef.current.value;

    if (!emailOrPhone || !password) {
      showError("Please enter both email/phone and password");
      return;
    }

    setLoading(true);

    try {
      const user = await login(emailOrPhone, password);
      const isDes = user?.role === "designer" || ["ali hassan", "siti rahman", "kumar anil", "john lee", "nur aisyah"].some((n) => (user?.name || "").toLowerCase().includes(n));
      if (isDes) {
        localStorage.setItem("userRole", "designer");
        navigate("/jobflow/design?view=my-jobs");
      } else if (user?.role === "admin") {
        navigate("/admin-dashboard");
      } else if (user?.role === "manager") {
        navigate("/manager-dashboard");
      } else if (user?.role === "operator") {
        navigate("/v3/production/queue");
      } else if (user?.role === "staff" || user?.role === "cashier") {
        navigate("/sales-pos");
      } else {
        navigate("/manager-dashboard");
      }
    } catch (error) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to log in. Please check credentials.";
      showError(`Failed to log in: ${errorMsg}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role && currentUser) {
      const isDes = role === "designer" || ["ali hassan", "siti rahman", "kumar anil", "john lee", "nur aisyah"].some((n) => (currentUser?.name || "").toLowerCase().includes(n));
      if (isDes) {
        navigate("/jobflow/design?view=my-jobs");
      } else if (role === "admin") {
        navigate("/admin-dashboard");
      } else if (role === "manager") {
        navigate("/manager-dashboard");
      } else if (role === "operator") {
        navigate("/v3/production/queue");
      } else if (role === "qc_inspector") {
        navigate("/v3/quality-control/queue");
      } else if (role === "staff" || role === "cashier") {
        navigate("/sales-pos");
      } else {
        navigate("/manager-dashboard");
      }
    }
  }, [role, navigate, currentUser]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        padding: "24px 16px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <Popup {...popup} />
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        {/* Header Section (No illustration) */}
        <div style={{ padding: "32px 32px 20px 32px", textAlign: "center" }}>
          <div style={{ marginBottom: "16px", display: "inline-block" }}>
            <img
              src={logo || "/placeholder.svg"}
              alt="Printz Logo"
              style={{ maxHeight: "48px", objectFit: "contain" }}
            />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>
            Welcome <span style={{ color: "#059669" }}>Back</span>
          </h1>
          <p style={{ margin: "6px 0 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            Sign in to access your Printz dashboard
          </p>
        </div>

        {/* Form Section */}
        <form style={{ padding: "0 32px 32px 32px" }} onSubmit={handleSubmit}>
          <div style={{ marginBottom: "18px" }}>
            <label
              htmlFor="emailOrPhone"
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              Email or Phone
            </label>
            <div style={{ position: "relative" }}>
              <FaEnvelope
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: "0.95rem",
                }}
              />
              <input
                type="text"
                id="emailOrPhone"
                ref={emailRef}
                placeholder="Enter email or phone number"
                defaultValue="bn@printz.shop"
                required
                disabled={loading}
                autoComplete="username"
                style={{
                  width: "100%",
                  height: "46px",
                  padding: "0 14px 0 42px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "0.92rem",
                  color: "#1e293b",
                  outline: "none",
                  backgroundColor: "#fff",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <FaLock
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: "0.95rem",
                }}
              />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                ref={passwordRef}
                placeholder="Enter your password"
                defaultValue="Manager@123"
                required
                disabled={loading}
                autoComplete="current-password"
                style={{
                  width: "100%",
                  height: "46px",
                  padding: "0 44px 0 42px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "0.92rem",
                  color: "#1e293b",
                  outline: "none",
                  backgroundColor: "#fff",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: "46px",
              backgroundColor: "#059669",
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              fontSize: "0.95rem",
              fontWeight: 600,
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
              transition: "transform 0.1s, box-shadow 0.2s",
              opacity: loading ? 0.85 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {loading ? (
              <>
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    borderTopColor: "#ffffff",
                    borderRadius: "50%",
                    animation: "revSpin 0.7s linear infinite",
                  }}
                />
                <span>Signing in...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>

          {/* Quick Demo Login Presets */}
          <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px dashed #e2e8f0" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", margin: "0 0 8px 0", textAlign: "center" }}>
              ⚡ Quick 1-Click Login:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  if (emailRef.current) emailRef.current.value = "bn@printz.shop";
                  if (passwordRef.current) passwordRef.current.value = "Manager@123";
                  setLoading(true);
                  try {
                    const user = await login("bn@printz.shop", "Manager@123");
                    if (user?.role === "manager") navigate("/manager-dashboard");
                    else if (user?.role === "admin") navigate("/admin-dashboard");
                    else navigate("/manager-dashboard");
                  } catch (error) {
                    const errorMsg =
                      error?.response?.data?.message ||
                      error?.message ||
                      "Failed to log in. Please check credentials.";
                    showError(`Failed to log in: ${errorMsg}`);
                    setLoading(false);
                  }
                }}
                style={{
                  padding: "8px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  backgroundColor: "#ecfdf5",
                  color: "#047857",
                  border: "1px solid #a7f3d0",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                👤 Manager Login (Banaswadi)
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  if (emailRef.current) emailRef.current.value = "admin@printz.shop";
                  if (passwordRef.current) passwordRef.current.value = "Admin@123";
                  setLoading(true);
                  try {
                    const user = await login("admin@printz.shop", "Admin@123");
                    if (user?.role === "admin") navigate("/admin-dashboard");
                    else if (user?.role === "manager") navigate("/manager-dashboard");
                    else navigate("/admin-dashboard");
                  } catch (error) {
                    const errorMsg =
                      error?.response?.data?.message ||
                      error?.message ||
                      "Failed to log in. Please check credentials.";
                    showError(`Failed to log in: ${errorMsg}`);
                    setLoading(false);
                  }
                }}
                style={{
                  padding: "8px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                👑 Admin Login
              </button>
            </div>

            {/* Designer Studio Login Portal Link */}
            <div style={{ marginTop: "12px" }}>
              <Link
                to="/designer/login"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  color: "#38bdf8",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  textDecoration: "none",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.15s ease",
                  boxSizing: "border-box",
                }}
              >
                <FaPaintBrush style={{ color: "#38bdf8", fontSize: "0.85rem" }} />
                <span>Designer Studio Login Portal →</span>
              </Link>
            </div>

            {/* Quick Designer Login for All 6 Designers */}
            <div style={{ marginTop: "10px", borderTop: "1px dashed #e2e8f0", paddingTop: "8px" }}>
              <div style={{ fontSize: "0.6875rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px", textAlign: "center" }}>
                🎨 Quick Designer Login (6 Studio Designers)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", justifyContent: "center" }}>
                {[
                  { name: "Ali Hassan", email: "ali.hassan@printz.com" },
                  { name: "Siti Rahman", email: "siti.rahman@printz.com" },
                  { name: "Kumar Anil", email: "kumar.anil@printz.com" },
                  { name: "John Lee", email: "john.lee@printz.com" },
                  { name: "Nur Aisyah", email: "nur.aisyah@printz.com" },
                  { name: "Guna", email: "guna@gmail.com" },
                ].map((des) => (
                  <button
                    key={des.email}
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      if (emailRef.current) emailRef.current.value = des.email;
                      if (passwordRef.current) passwordRef.current.value = "designer123";
                      setLoading(true);
                      try {
                        const user = await login(des.email, "designer123");
                        localStorage.setItem("userRole", "designer");
                        navigate("/jobflow/design?view=my-jobs");
                      } catch (error) {
                        const errorMsg =
                          error?.response?.data?.message ||
                          error?.message ||
                          "Failed to log in. Please check credentials.";
                        showError(`Failed to log in as ${des.name}: ${errorMsg}`);
                        setLoading(false);
                      }
                    }}
                    style={{
                      padding: "4px 8px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      backgroundColor: "#f0fdf4",
                      color: "#166534",
                      border: "1px solid #bbf7d0",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    👤 {des.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>


        {/* Footer */}
        <div
          style={{
            padding: "16px",
            backgroundColor: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
            © {new Date().getFullYear()} Printz. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
