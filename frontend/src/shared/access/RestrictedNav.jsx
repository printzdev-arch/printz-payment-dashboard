import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronRight, FileText, Layers } from "lucide-react";

/**
 * The sidebar for someone who has a list of pages (from their role, or saved for them): one link per page they
 * have, with sub-pages grouped under their menu. The list comes from the server with the signed-in profile, so
 * what Role Setup shows is exactly what they see here.
 */
export default function RestrictedNav({ links }) {
  const location = useLocation();

  const isActive = (to) => {
    const [path, query] = String(to).split("?");
    const onPath = location.pathname === path || location.pathname.startsWith(`${path}/`);
    return onPath && (!query || location.search.includes(query));
  };

  // Group neighbouring sub-pages of the same menu
  const blocks = [];
  links.forEach((l) => {
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
      {blocks.map((block) =>
        block.menu ? (
          <li className="sidebar-nav-item" key={`menu-${block.menu}-${block.items[0].key}`}>
            <div className="sidebar-link" style={{ cursor: "default" }}>
              <div className="sidebar-link-content">
                <Layers size={18} className="sidebar-link-icon" />
                <span>{block.menu}</span>
              </div>
            </div>
            <ul className="sidebar-dropdown-list">
              {block.items.map((l) => (
                <li className="sidebar-dropdown-item" key={l.key}>
                  <NavLink to={l.to} className={`sidebar-dropdown-link ${isActive(l.to) ? "active" : ""}`}>
                    <span className="sidebar-dropdown-link-left">
                      <FileText size={14} className="sidebar-dropdown-icon" />
                      <span className="sidebar-dropdown-text">{l.label}</span>
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
        ) : (
          <li className="sidebar-nav-item" key={block.items[0].key}>
            <NavLink to={block.items[0].to} className={`sidebar-link ${isActive(block.items[0].to) ? "active-link" : ""}`}>
              <div className="sidebar-link-content">
                <FileText size={18} className="sidebar-link-icon" />
                <span>{block.items[0].label}</span>
              </div>
              {isActive(block.items[0].to) && <ChevronRight size={16} className="sidebar-active-arrow" />}
            </NavLink>
          </li>
        )
      )}
    </ul>
  );
}
