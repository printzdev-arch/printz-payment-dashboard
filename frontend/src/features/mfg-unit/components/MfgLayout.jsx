import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ClipboardList, Hourglass, LayoutDashboard, LogOut, Printer } from "lucide-react";
import logo from "../../../assets/logo.png";
import { useAuth } from "../../../context/AuthContext.jsx";
import { getMfgRole } from "../utils/mfgRole";
import { initialsOf } from "../../sale-order/utils/format";
import "../styles/mfg-unit.css";

// Page frame for the manufacturing unit portal (separate from the branch/admin layouts).
export default function MfgLayout({ children }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const me = getMfgRole();
  const name = currentUser?.name || me.name || "User";

  const handleLogout = async () => {
    await logout();
    navigate("/login?tab=mfg", { replace: true });
  };

  return (
    <div className="mfg-shell">
      <aside className="mfg-sidebar">
        <div className="mfg-sidebar-inner">
        <div className="mfg-brand">
          <img src={logo} alt="PrintZ" />
          <div className="mfg-brand-text">
            <strong>Manufacturing</strong>
            <span>Unit portal</span>
          </div>
        </div>

        <nav className="mfg-nav">
          <div className="mfg-nav-label">Work</div>
          <NavLink to="/mfg/dashboard">
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/mfg/orders">
            <ClipboardList size={18} /> {me.isManager ? "All Orders" : "My Orders"}
          </NavLink>
          <NavLink to="/mfg/print-dispatch">
            <Printer size={18} /> Print & Dispatch
          </NavLink>
          {me.isManager && (
            <NavLink to="/mfg/queue">
              <Hourglass size={18} /> Waiting Queue
            </NavLink>
          )}
        </nav>

        <div className="mfg-side-foot">
          <button type="button" className="mfg-logout" onClick={handleLogout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
        </div>
      </aside>

      <div className="mfg-main">
        <header className="mfg-topbar">
          <div className="mfg-crumb">
            PrintZ · <strong>Manufacturing Unit</strong>
          </div>
          <div className="mfg-user">
            <div style={{ textAlign: "right" }}>
              <div className="mfg-user-name">{name}</div>
              <div className="mfg-user-role">{me.label}</div>
            </div>
            <span className="mfg-user-avatar">{initialsOf(name)}</span>
          </div>
        </header>
        <main className="mfg-content">{children}</main>
      </div>
    </div>
  );
}
