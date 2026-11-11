import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, Hourglass, LayoutDashboard, LogOut } from "lucide-react";
import logo from "../../shared/assets/logo.png";
import { useAuth } from "../../app/providers/AuthContext.jsx";
import saleOrderApi from "../../modules/sale-order/api/saleOrderApi";
import { initialsOf } from "../../modules/sale-order/utils/format";
import "../../modules/mfg-unit/styles/mfg-unit.css";

// Page frame for the manufacturing unit portal. Everyone at the unit gets the same three pages.
export default function MfgLayout({ children }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const scope = saleOrderApi.getUserScope();
  const name = currentUser?.name || scope.name || "User";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
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
              <ClipboardList size={18} /> Orders
            </NavLink>
            <NavLink to="/mfg/queue">
              <Hourglass size={18} /> Queue
            </NavLink>
          </nav>

          <div className="mfg-side-foot">
            {scope.isAdmin && (
              <button type="button" className="mfg-logout" onClick={() => navigate("/admin-dashboard")}>
                <ArrowLeft size={17} /> Back to admin
              </button>
            )}
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
              <div className="mfg-user-role">{scope.isAdmin ? "Administrator" : currentUser?.branch || "Manufacturing Unit"}</div>
            </div>
            <span className="mfg-user-avatar">{initialsOf(name)}</span>
          </div>
        </header>
        <main className="mfg-content">{children}</main>
      </div>
    </div>
  );
}
