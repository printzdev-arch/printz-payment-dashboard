import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, ChevronDown, ChevronRight, ClipboardList, Clock, Hourglass, LayoutDashboard, LogOut, Menu, User } from "lucide-react";
import logo from "../../shared/assets/logo.png";
import { useAuth } from "../../app/providers/AuthContext.jsx";
import saleOrderApi from "../../modules/sale-order/api/saleOrderApi";
import { initialsOf } from "../../modules/sale-order/utils/format";
import { MotionDropdown } from "../../shared/ui/motion";
import "../styles/sidebar.css";
import "../../modules/mfg-unit/styles/mfg-unit.css";

const NAV = [
  { to: "/mfg/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mfg/orders", label: "Orders", icon: ClipboardList },
  { to: "/mfg/queue", label: "Queue", icon: Hourglass },
];

// Page frame for the manufacturing unit portal: the same sidebar and top bar as the manager portal.
// Everyone at the unit gets the same three pages.
export default function MfgLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const scope = saleOrderApi.getUserScope();
  const name = currentUser?.name || scope.name || "User";

  // On phones and tablets the sidebar is a drawer, so it starts closed there
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && window.innerWidth <= 1024);
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const menuRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Close the drawer after choosing a page on a small screen
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 1024) setCollapsed(true);
  }, [location.pathname]);

  const day = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateText = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeText = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const path = location.pathname;
  const pageTitle = path.includes("/profile") ? "Profile" : path.startsWith("/mfg/orders") ? "Orders" : path.startsWith("/mfg/queue") ? "Queue" : "Dashboard";
  const roleText = scope.isAdmin ? "Administrator" : currentUser?.branch || "Manufacturing Unit";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-logo-header-row">
          <div className="sidebar-logo-header" onClick={() => navigate("/mfg/dashboard")} style={{ cursor: "pointer" }}>
            <img src={logo} alt="PrintZ Shop" className="sidebar-brand-logo-img" />
          </div>
        </div>

        <ul className="sidebar-nav-list">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = path === to || path.startsWith(`${to}/`);
            return (
              <li className="sidebar-nav-item" key={to}>
                <NavLink to={to} className={`sidebar-link ${active ? "active-link" : ""}`}>
                  <div className="sidebar-link-content">
                    <Icon size={18} className="sidebar-link-icon" />
                    <span>{label}</span>
                  </div>
                  {active && <ChevronRight size={15} className="sidebar-active-arrow" />}
                </NavLink>
              </li>
            );
          })}
          {scope.isAdmin && (
            <li className="sidebar-nav-item">
              <button type="button" className="sidebar-link" onClick={() => navigate("/admin-dashboard")} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", font: "inherit" }}>
                <div className="sidebar-link-content">
                  <ArrowLeft size={18} className="sidebar-link-icon" />
                  <span>Back to admin</span>
                </div>
              </button>
            </li>
          )}
        </ul>

        <div className="sidebar-bottom-section">
          <div className="sidebar-divider" />
          <button type="button" className="sidebar-logout-item" onClick={handleLogout}>
            <LogOut size={18} className="sidebar-logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Tap-outside backdrop; hidden by CSS above 1024px */}
      {!collapsed && <div className="sidebar-backdrop" onClick={() => setCollapsed(true)} aria-hidden="true" />}

      <div className="main-content-wrap">
        <header className="printz-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-toggle-btn"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="topbar-breadcrumb">
              <span className="breadcrumb-root">Manufacturing</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{pageTitle}</span>
            </div>
          </div>

          <div className="topbar-right">
            <span className="topbar-datetime-day-badge">{day.toUpperCase()}</span>
            <div className="topbar-datetime-badge" title={`${day}, ${dateText} ${timeText}`}>
              <div className="topbar-datetime-section">
                <Calendar size={15} className="topbar-date-icon" />
                <span className="topbar-datetime-date">{dateText}</span>
              </div>
              <div className="topbar-datetime-divider" />
              <div className="topbar-datetime-section">
                <Clock size={16} className="topbar-time-icon" />
                <span className="topbar-datetime-time">{timeText}</span>
              </div>
            </div>

            <div className="topbar-user-menu-wrapper" ref={menuRef}>
              <div className="topbar-user-profile" onClick={() => setMenuOpen((v) => !v)} title="Account Settings">
                <div className="user-avatar-badge">{initialsOf(name)}</div>
                <div className="user-info-text">
                  <span className="user-info-name">{name}</span>
                  <span className="user-info-role">{roleText}</span>
                </div>
                <ChevronDown size={16} strokeWidth={2} className={`user-chevron ${menuOpen ? "rotated" : ""}`} />
              </div>

              <MotionDropdown isOpen={menuOpen} className="topbar-dropdown-menu">
                <div className="dropdown-user-header">
                  <p className="dropdown-user-name">{name}</p>
                  <p className="dropdown-user-email">{currentUser?.email || "Manufacturing Unit Account"}</p>
                </div>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/profile");
                  }}
                >
                  <User size={15} color="#059669" />
                  <span>My Profile</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item dropdown-logout"
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </MotionDropdown>
            </div>
          </div>
        </header>

        <main className="content-body">
          <div className="mfg-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
