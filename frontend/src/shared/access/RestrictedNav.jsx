import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Calculator,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Factory,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  HandCoins,
  Hourglass,
  Layers,
  LayoutDashboard,
  ListOrdered,
  PackageCheck,
  PlusCircle,
  QrCode,
  Receipt,
  RotateCcw,
  Settings,
  ShoppingCart,
  Truck,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { MotionAccordion } from "../ui/motion";

// One icon per page (keys come from the page list on the server); anything new falls back to a document icon
const PAGE_ICONS = {
  dashboard: LayoutDashboard,
  "sale-orders": PackageCheck,
  "sale-orders-all": ClipboardList,
  "sale-orders-new": PlusCircle,
  pos: ShoppingCart,
  invoices: Receipt,
  settlement: HandCoins,
  "customer-directory": Users,
  "branch-qr-form": QrCode,
  "job-orders": Briefcase,
  estimates: FileSpreadsheet,
  "design-queue": ClipboardList,
  "design-my-jobs": UserCheck,
  "designer-jobs": FolderOpen,
  "designer-dashboard": LayoutDashboard,
  "production-orders": Factory,
  "production-queue": ListOrdered,
  "production-rework": RotateCcw,
  "production-reports": BarChart3,
  "qc-queue": ClipboardCheck,
  "qc-history": FileText,
  "delivery": Truck,
  "master-settings": Settings,
  employees: Users,
  "attendance-setup": Settings,
  "attendance-daily": CalendarCheck,
  "attendance-shifts": Clock,
  "attendance-permissions": CalendarClock,
  "attendance-reports": CalendarDays,
  "salary-setup": Settings,
  "salary-loans": HandCoins,
  "salary-processing": Calculator,
  "salary-records": Wallet,
  "mfg-dashboard": LayoutDashboard,
  "mfg-orders": ClipboardList,
  "mfg-queue": Hourglass,
};
const iconFor = (key) => PAGE_ICONS[key] || FileText;

/**
 * The sidebar for someone who has a list of pages (from their role, or saved for them): one link per page they
 * have, with sub-pages grouped under their menu. The list comes from the server with the signed-in profile, so
 * what Role Setup shows is exactly what they see here.
 *
 * "Designer My Jobs" opens the same screen as "Design Queue" and is only meant for designers (anyone else is
 * sent to the queue), so it is left out unless `isDesigner` is true.
 */
export default function RestrictedNav({ links, isDesigner = false }) {
  const location = useLocation();
  // Menus the person has opened or closed by hand; a menu not listed here is open only while one of its pages is
  const [toggled, setToggled] = useState({});

  const isActive = (to) => {
    const [path, query] = String(to).split("?");
    const onPath = location.pathname === path || location.pathname.startsWith(`${path}/`);
    return onPath && (!query || location.search.includes(query));
  };

  const visibleLinks = links.filter((l) => isDesigner || l.key !== "design-my-jobs");

  // Group neighbouring sub-pages of the same menu
  const blocks = [];
  visibleLinks.forEach((l) => {
    const last = blocks[blocks.length - 1];
    if (l.menu && last && last.menu === l.menu) last.items.push(l);
    else blocks.push({ menu: l.menu, items: [l] });
  });

  if (blocks.length === 0) {
    return (
      <ul className="sidebar-nav-list">
        <li className="sidebar-nav-item">
          <div className="sidebar-link" style={{ cursor: "default" }}>
            <div className="sidebar-link-content">
              <span>No pages assigned</span>
            </div>
          </div>
        </li>
      </ul>
    );
  }

  return (
    <ul className="sidebar-nav-list">
      {blocks.map((block) => {
        if (!block.menu) {
          const item = block.items[0];
          const Icon = iconFor(item.key);
          const active = isActive(item.to);
          return (
            <li className="sidebar-nav-item" key={item.key}>
              <NavLink to={item.to} className={() => `sidebar-link ${active ? "active-link" : ""}`}>
                <div className="sidebar-link-content">
                  <Icon size={18} className="sidebar-link-icon" />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight size={16} className="sidebar-active-arrow" />}
              </NavLink>
            </li>
          );
        }

        const groupActive = block.items.some((l) => isActive(l.to));
        const groupKey = `menu-${block.menu}`;
        const open = groupKey in toggled ? toggled[groupKey] : groupActive;
        return (
          <li className="sidebar-nav-item" key={`${groupKey}-${block.items[0].key}`}>
            <button
              type="button"
              className={`sidebar-dropdown-toggle ${groupActive ? "active-link" : ""}`}
              aria-expanded={open}
              onClick={() => setToggled((prev) => ({ ...prev, [groupKey]: !open }))}
            >
              <div className="sidebar-link-content">
                <Layers size={18} className="sidebar-link-icon" />
                <span>{block.menu}</span>
              </div>
              {open ? <ChevronDown size={16} className="sidebar-link-icon" /> : <ChevronRight size={16} className="sidebar-link-icon" />}
            </button>
            <MotionAccordion isOpen={open}>
              <ul className="sidebar-dropdown-list">
                {block.items.map((l) => {
                  const Icon = iconFor(l.key);
                  // className is a function so NavLink does not mark every link that shares a path as active
                  return (
                    <li className="sidebar-dropdown-item" key={l.key}>
                      <NavLink to={l.to} className={() => `sidebar-dropdown-link ${isActive(l.to) ? "active" : ""}`}>
                        <span className="sidebar-dropdown-link-left">
                          <Icon size={14} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">{l.label}</span>
                        </span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </MotionAccordion>
          </li>
        );
      })}
    </ul>
  );
}
