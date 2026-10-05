import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import logo from '../../assets/logo.png';

const ForgotPassword = () => {
  const emailRef = useRef();
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await resetPassword(emailRef.current.value);
      toast.success('Password reset email sent');
    } catch (error) {
      toast.error('Failed to reset password: ' + error.message);
    } finally {
      setLoading(false);
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
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <ToastContainer />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
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
            Reset <span style={{ color: "#059669" }}>Password</span>
          </h1>
          <p style={{ margin: "6px 0 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            Enter your registered email to receive reset instructions
          </p>
        </div>

        {/* Form Section */}
        <form style={{ padding: "0 32px 28px 32px" }} onSubmit={handleSubmit}>
          <div style={{ marginBottom: "24px" }}>
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
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
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

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button
              type="button"
              onClick={() => navigate('/login')}
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
