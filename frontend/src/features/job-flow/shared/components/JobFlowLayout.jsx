import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calculator,
  Palette,
  Layers,
  ShieldCheck,
  Truck,
  Receipt,
  CreditCard,
  QrCode,
  ShoppingCart,
} from "lucide-react";
import "../styles/job-flow.css";

const tabs = [
  { path: "/jobflow", label: "Overview", icon: LayoutDashboard, exact: true },
  { path: "/jobflow/pos", label: "POS Billing", icon: ShoppingCart },
  { path: "/jobflow/customers", label: "Customers", icon: Users },
  { path: "/jobflow/jobs", label: "Job Orders", icon: Briefcase },
  { path: "/jobflow/estimates", label: "Estimation", icon: Calculator },
  { path: "/jobflow/design", label: "Design", icon: Palette },
  { path: "/jobflow/production", label: "Production", icon: Layers },
  { path: "/jobflow/qc", label: "Quality Control", icon: ShieldCheck },
  { path: "/jobflow/delivery", label: "Delivery", icon: Truck },
  { path: "/jobflow/invoice", label: "Invoice", icon: Receipt },
  { path: "/jobflow/settlement", label: "Settlement", icon: CreditCard },
  { path: "/jobflow/qr-request", label: "Branch QR Form", icon: QrCode },
];

export const JobFlowLayout = ({ children, title, subtitle, actions }) => {
  const location = useLocation();

  const isTabActive = (tab) => {
    if (tab.exact) {
      return location.pathname === tab.path;
    }
    return location.pathname.startsWith(tab.path);
  };

  return (
    <div className="jf-container">
      {/* Top Header */}
      <div className="jf-header">
        <div>
          <h1 className="jf-header-title">{title || "JobFlow Lifecycle"}</h1>
        </div>
        {actions && <div className="jf-header-actions">{actions}</div>}
      </div>

      {/* Module Navigation Tabs */}
      {/* <div className="jf-nav-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={Boolean(tab.exact)}
              className={({ isActive }) => `jf-nav-tab ${isActive ? "active" : ""}`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div> */}

      {/* Page Content */}
      <div className="jf-content-area">{children}</div>
    </div>
  );
};

export default JobFlowLayout;
