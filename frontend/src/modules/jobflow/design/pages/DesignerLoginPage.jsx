import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../../app/providers/AuthContext";
import {
  Palette,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  ArrowRight,
  UserCheck,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../../../shared/services/api";
import "../styles/designer-login.css";

export const DesignerLoginPage = () => {
  const navigate = useNavigate();
  const { login, currentUser, role } = useAuth();

  const [designersList, setDesignersList] = useState([]);
  const [designersLoaded, setDesignersLoaded] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState(null);
  const [emailOrCode, setEmailOrCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState("cards"); // 'cards' | 'manual'

  // If already logged in as a designer, redirect to their home
  useEffect(() => {
    if (currentUser && (role === "designer" || currentUser.role === "designer")) {
      navigate("/jobflow/design?view=my-jobs");
    }
  }, [currentUser, role, navigate]);

  // Load the designers from the database
  useEffect(() => {
    const loadDesigners = async () => {
      try {
        let rawList = [];
        try {
          const res = await api.get("/auth/designers");
          rawList = res.data?.data || res.data || [];
        } catch {
          try {
            const res2 = await api.get("/design/pool");
            rawList = res2.data?.data?.designers || res2.data?.designers || [];
          } catch { }
        }

        if (Array.isArray(rawList) && rawList.length > 0) {
          const palette = ["#dc2626", "#0891b2", "#059669", "#2563eb", "#7c3aed", "#d97706"];
          const seenEmails = new Set();
          const combined = [];

          // Only add branch designers from DB (excluding mfg or other roles)
          for (let i = 0; i < rawList.length; i++) {
            const d = rawList[i];
            const em = (d.email || "").toLowerCase().trim();
            if (!em || seenEmails.has(em)) continue;
            seenEmails.add(em);

            combined.push({
              id: d._id || d.id || `des-${i + 1}`,
              name: d.name || "Designer",
              email: d.email,
              username: d.username || d.name?.toLowerCase().replace(/\s+/g, "_"),
              code: d.employeeCode || `EMP-00${i + 1}`,
              specialization: d.specialization || "Designer",
              color: d.avatarColor || palette[i % palette.length],
              initials: d.name
                ? d.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
                : "DE",
              experience: d.experience || "Print & Production",
            });
          }

          setDesignersList(combined);
          setSelectedDesigner(combined[0]);
          setEmailOrCode(combined[0].email);
        }
      } catch (err) {
        console.warn("Could not load designers:", err);
      } finally {
        setDesignersLoaded(true);
      }
    };
    loadDesigners();
  }, []);

  const handleSelectDesigner = (des) => {
    setSelectedDesigner(des);
    setEmailOrCode(des.email);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const identifier = emailOrCode.trim();
    if (!identifier) {
      toast.error("Please enter your designer email or employee code");
      return;
    }
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);
    try {
      const user = await login(identifier, password);
      localStorage.setItem("userRole", "designer");
      localStorage.setItem("userName", user?.name || selectedDesigner?.name || "");
      localStorage.setItem("userEmail", user?.email || selectedDesigner?.email || identifier);
      toast.success(`Welcome to PrintZ Studio, ${user?.name || selectedDesigner?.name || "Designer"}!`);
      navigate("/jobflow/design?view=my-jobs");
    } catch (err) {
      // A wrong password or an unknown designer is refused; there is no offline sign-in
      toast.error(err.response?.data?.message || err.message || "Failed to sign in. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dl-page-container">
      <div className="dl-content-wrapper">
        {/* Top Header / Branding */}
        <div className="dl-header">
          <div className="dl-brand-pill">
            <Palette size={18} color="#059669" className="dl-brand-icon" />
            <span>PrintZ Creative Studio</span>
          </div>

          <h1 className="dl-title">
            Designer Portal <span className="dl-title-highlight">Login</span>
          </h1>
        </div>

        {/* Mode Toggle: Quick Profile Select vs Manual Credentials */}
        <div className="dl-tabs-nav">
          <button
            type="button"
            className={`dl-tab-btn ${loginMode === "cards" ? "active" : ""}`}
            onClick={() => setLoginMode("cards")}
          >
            <UserCheck size={18} />
            <span>Select Designer Profile</span>
          </button>
          <button
            type="button"
            className={`dl-tab-btn ${loginMode === "manual" ? "active" : ""}`}
            onClick={() => setLoginMode("manual")}
          >
            <Mail size={18} />
            <span>Email / Code Input</span>
          </button>
        </div>

        {/* Card Mode: choose from the designers in the database */}
        {loginMode === "cards" && designersLoaded && designersList.length === 0 && (
          <p style={{ textAlign: "center", color: "#64748b" }}>
            No designers found. Use Email / Code Input to sign in.
          </p>
        )}
        {loginMode === "cards" && (
          <div className="dl-designers-grid">
            {designersList.map((des) => {
              const isSelected = selectedDesigner?.email === des.email;
              return (
                <div
                  key={des.email}
                  className={`dl-designer-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectDesigner(des)}
                >
                  {isSelected && (
                    <div className="dl-selected-badge">
                      <Check size={12} strokeWidth={3} color="#ffffff" />
                    </div>
                  )}

                  <div
                    className="dl-designer-avatar"
                    style={{ backgroundColor: des.color }}
                  >
                    {des.initials}
                  </div>

                  <div className="dl-designer-info">
                    <h4 className="dl-designer-name">{des.name}</h4>
                    <span className="dl-designer-spec">{des.specialization}</span>
                    <span className="dl-code-badge">{des.code}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Designer Login Form Box */}
        <div className="dl-form-card">
          <div className="dl-form-header">
            <div className="dl-active-designer-indicator">
              <span
                className="dl-mini-avatar"
                style={{ backgroundColor: selectedDesigner?.color || "#059669" }}
              >
                {selectedDesigner?.initials || "DE"}
              </span>
              <div className="dl-active-designer-texts">
                <span className="dl-active-name">
                  Signing in as: {selectedDesigner?.name || "Designer"}
                </span>
                <span className="dl-active-email">{emailOrCode}</span>
              </div>
            </div>
            <span className="dl-portal-role-tag">PRINTZ DESIGNER</span>
          </div>

          <form onSubmit={handleLoginSubmit} className="dl-form">
            {loginMode === "manual" && (
              <div className="dl-input-group">
                <label htmlFor="dl-email-input">Designer Email or Employee Code</label>
                <div className="dl-input-wrapper">
                  <Mail size={18} className="dl-field-icon" />
                  <input
                    id="dl-email-input"
                    type="text"
                    value={emailOrCode}
                    onChange={(e) => setEmailOrCode(e.target.value)}
                    placeholder="Designer email or employee code"
                    required
                  />
                </div>
              </div>
            )}

            <div className="dl-input-group">
              <label htmlFor="dl-password-input">Password</label>
              <div className="dl-input-wrapper">
                <Lock size={18} className="dl-field-icon" />
                <input
                  id="dl-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  className="dl-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="dl-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="dl-spinner" />
                  <span>Signing In to Studio...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Launch Designer Workspace as {selectedDesigner?.name?.split(" ")[0] || "Designer"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back Link to Regular Login */}
        <div className="dl-bottom-links">
          <Link to="/login" className="dl-back-link">
            <ArrowLeft size={14} />
            <span>Back to Staff & Manager Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DesignerLoginPage;
