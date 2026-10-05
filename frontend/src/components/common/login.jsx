import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock } from "react-icons/fa";
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
      await login(emailOrPhone, password);
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
      if (role === "admin") navigate("/admin-dashboard");
      else if (role === "manager") navigate("/manager-dashboard");
      else navigate("/login");
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
