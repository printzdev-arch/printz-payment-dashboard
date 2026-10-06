import React, { useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion } from "framer-motion";
import {
  FaEnvelope,
  FaArrowLeft,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaCopy,
} from "react-icons/fa";
import api from "../../services/api";
import logo from "../../assets/logo.png";

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const emailFromQuery = searchParams.get("email") || "";

  const emailRef = useRef();
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [generatedResetUrl, setGeneratedResetUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  // New password state (when token is in URL)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // 1. Submit email request
  const handleSendEmail = async (e) => {
    e.preventDefault();
    const emailVal = emailRef.current?.value?.trim();
    if (!emailVal) return;

    try {
      setLoading(true);
      setGeneratedResetUrl(null);

      const res = await resetPassword(emailVal);
      const data = res?.data || res;

      if (data?.resetUrl) {
        setGeneratedResetUrl(data.resetUrl);
        toast.info("Password reset link generated! (SMTP not configured in .env)");
      } else {
        toast.success(
          data?.message || "Password reset email sent! Please check your inbox."
        );
      }
    } catch (error) {
      const msg = error?.response?.data?.message || error.message;
      toast.error("Failed to send reset link: " + msg);
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit new password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      toast.warning("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.warning("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/reset-password", {
        token,
        email: emailFromQuery,
        newPassword,
      });

      setIsSuccess(true);
      toast.success(res.data?.message || "Password has been successfully updated!");
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (error) {
      const msg = error?.response?.data?.message || error.message;
      toast.error("Failed to reset password: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedResetUrl) {
      navigator.clipboard.writeText(generatedResetUrl);
      setCopied(true);
      toast.success("Reset link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        padding: "24px 16px",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <ToastContainer position="top-right" autoClose={4000} />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow:
            "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        {/* Header Section */}
        <div style={{ padding: "32px 32px 20px 32px", textAlign: "center" }}>
          <div style={{ marginBottom: "16px", display: "inline-block" }}>
            <img
              src={logo || "/placeholder.svg"}
              alt="Printz Logo"
              style={{ maxHeight: "48px", objectFit: "contain" }}
            />
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              color: "#1e293b",
              margin: 0,
            }}
          >
            {token ? (
              <>
                Set New <span style={{ color: "#059669" }}>Password</span>
              </>
            ) : (
              <>
                Reset <span style={{ color: "#059669" }}>Password</span>
              </>
            )}
          </h1>
          <p
            style={{
              margin: "6px 0 0 0",
              color: "#64748b",
              fontSize: "0.9rem",
            }}
          >
            {token
              ? `Create a secure new password for ${emailFromQuery || "your account"}`
              : "Enter your registered email to receive reset instructions"}
          </p>
        </div>

        {/* Form Section */}
        {token ? (
          /* RESET PASSWORD FORM (TOKEN IN URL) */
          <form
            style={{ padding: "0 32px 28px 32px" }}
            onSubmit={handleResetPassword}
          >
            {isSuccess ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                  color: "#059669",
                }}
              >
                <FaCheckCircle size={48} style={{ marginBottom: "12px" }} />
                <h3 style={{ margin: "0 0 8px 0", color: "#1e293b" }}>
                  Password Reset Successful!
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
                  Redirecting you to the sign in page...
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "18px" }}>
                  <label
                    htmlFor="new-password"
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    New Password
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
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={loading}
                      placeholder="Enter new password (min. 6 characters)"
                      style={{
                        width: "100%",
                        height: "46px",
                        padding: "0 42px 0 42px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "0.92rem",
                        color: "#1e293b",
                        outline: "none",
                        backgroundColor: "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                      }}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label
                    htmlFor="confirm-password"
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Confirm New Password
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
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={loading}
                      placeholder="Confirm your new password"
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
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    height: "46px",
                    background:
                      "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    color: "#ffffff",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "8px",
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
                    opacity: loading ? 0.75 : 1,
                  }}
                >
                  {loading ? "Updating password..." : "Update Password"}
                </button>
              </>
            )}

            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#059669",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaArrowLeft size={12} /> Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          /* SEND RESET LINK FORM */
          <form style={{ padding: "0 32px 28px 32px" }} onSubmit={handleSendEmail}>
            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="reset-email"
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Email Address
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
                  id="reset-email"
                  type="email"
                  ref={emailRef}
                  required
                  disabled={loading}
                  placeholder="Enter your registered email"
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
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: "46px",
                background:
                  "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "#ffffff",
                fontSize: "0.95rem",
                fontWeight: 600,
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>

            {/* Dev Mode Reset Link Banner when SMTP is not configured */}
            {generatedResetUrl && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: "20px",
                  padding: "16px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#166534",
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaCheckCircle color="#16a34a" /> Reset Link Generated
                </div>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "#4b5563",
                    margin: "0 0 12px 0",
                    lineHeight: 1.4,
                  }}
                >
                  Real email delivery requires SMTP credentials in{" "}
                  <code>backend/.env</code>. You can open the link directly below
                  to set your new password:
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <a
                    href={generatedResetUrl}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      background: "#059669",
                      color: "#fff",
                      textDecoration: "none",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                    }}
                  >
                    Open Reset Page <FaExternalLinkAlt size={11} />
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#e2e8f0",
                      color: "#334155",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <FaCopy size={11} /> {copied ? "Copied" : "Copy Link"}
                  </button>
                </div>
              </motion.div>
            )}

            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#059669",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaArrowLeft size={12} /> Back to Sign In
              </button>
            </div>
          </form>
        )}

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
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
