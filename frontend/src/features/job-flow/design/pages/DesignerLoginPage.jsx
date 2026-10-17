import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../../context/AuthContext";
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
import api from "../../../../services/api";
import "../styles/designer-login.css";

// Exactly 6 active PrintZ Studio Designers
const DEFAULT_DESIGNERS = [
  {
    id: "des-ali",
    name: "Ali Hassan",
    email: "ali.hassan@printz.com",
    username: "ali_hassan",
    code: "EMP-001",
    specialization: "Senior Graphic Designer",
    color: "#dc2626",
    initials: "AH",
    experience: "5+ Years • Branding & Print",
  },
  {
    id: "des-siti",
    name: "Siti Rahman",
    email: "siti.rahman@printz.com",
    username: "siti_rahman",
    code: "EMP-002",
    specialization: "Lead Brand Designer",
    color: "#0891b2",
    initials: "SR",
    experience: "6+ Years • Corporate Identity",
  },
  {
    id: "des-kumar",
    name: "Kumar Anil",
    email: "kumar.anil@printz.com",
    username: "kumar_anil",
    code: "EMP-003",
    specialization: "Packaging & 3D Specialist",
    color: "#059669",
    initials: "KA",
    experience: "4+ Years • Packaging & Die-cut",
  },
  {
    id: "des-john",
    name: "John Lee",
    email: "john.lee@printz.com",
    username: "john_lee",
    code: "EMP-004",
    specialization: "Creative Visualizer",
    color: "#2563eb",
    initials: "JL",
    experience: "4+ Years • Marketing Graphics",
  },
  {
    id: "des-nur",
    name: "Nur Aisyah",
    email: "nur.aisyah@printz.com",
    username: "nur_aisyah",
    code: "EMP-005",
    specialization: "Typography & Layout Specialist",
    color: "#7c3aed",
    initials: "NA",
    experience: "3+ Years • Editorial & Formats",
  },
  {
    id: "des-guna",
    name: "Guna",
    email: "guna@gmail.com",
    username: "guna",
    code: "EMP-006",
    specialization: "Senior Prepress & Layout",
    color: "#d97706",
    initials: "GU",
    experience: "6+ Years • Color Calibration & Layout",
  },
];

export const DesignerLoginPage = () => {
  const navigate = useNavigate();
  const { login, currentUser, role } = useAuth();

  const [designersList, setDesignersList] = useState(DEFAULT_DESIGNERS);
  const [selectedDesigner, setSelectedDesigner] = useState(DEFAULT_DESIGNERS[0]);
  const [emailOrCode, setEmailOrCode] = useState(DEFAULT_DESIGNERS[0].email);
  const [password, setPassword] = useState("designer123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState("cards"); // 'cards' | 'manual'

  // If already logged in as a designer, redirect to their queue
  useEffect(() => {
    if (currentUser && (role === "designer" || currentUser.role === "designer")) {
      navigate("/jobflow/design?view=my-jobs");
    }
  }, [currentUser, role, navigate]);

  // Load dynamic designers from backend and merge with complete list
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
          } catch {}
        }

        if (Array.isArray(rawList) && rawList.length > 0) {
          const palette = ["#d97706", "#059669", "#dc2626", "#0891b2", "#2563eb", "#7c3aed", "#db2777"];
          const seenEmails = new Set();
          const combined = [];

          // First add dynamic designers from DB
          for (let i = 0; i < rawList.length; i++) {
            const d = rawList[i];
            const em = (d.email || "").toLowerCase().trim();
            if (em && seenEmails.has(em)) continue;
            if (em) seenEmails.add(em);

            combined.push({
              id: d._id || d.id || `des-${i + 1}`,
              name: d.name || "Designer",
              email: d.email || `${(d.name || "des").toLowerCase().replace(/\s+/g, ".")}@printz.com`,
              username: d.username || d.name?.toLowerCase().replace(/\s+/g, "_"),
              code: d.employeeCode || `EMP-00${i + 1}`,
              specialization: d.specialization || d.designation || "Creative Designer",
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

          // Then append any DEFAULT_DESIGNERS not yet present
          for (const def of DEFAULT_DESIGNERS) {
            const em = (def.email || "").toLowerCase().trim();
            if (!seenEmails.has(em)) {
              seenEmails.add(em);
              combined.push(def);
            }
          }

          setDesignersList(combined);
          setSelectedDesigner(combined[0]);
          setEmailOrCode(combined[0].email);
        }
      } catch (err) {
        console.warn("Could not load dynamic designers:", err);
      }
    };
    loadDesigners();
  }, []);

  const handleSelectDesigner = (des) => {
    setSelectedDesigner(des);
    setEmailOrCode(des.email);
    if (!password) {
      setPassword("designer123");
    }
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
      localStorage.setItem("userName", user?.name || selectedDesigner.name);
      localStorage.setItem("userEmail", user?.email || selectedDesigner.email);
      toast.success(`Welcome to PrintZ Studio, ${user?.name || selectedDesigner.name}!`);
      navigate("/jobflow/design?view=my-jobs");
    } catch (err) {
      console.error("Designer login error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to sign in. Please verify credentials.";
      toast.error(msg);
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

        {/* Card Mode: Choose from the 5 official designers */}
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
                    placeholder="e.g. ali.hassan@printz.com or EMP-001"
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
