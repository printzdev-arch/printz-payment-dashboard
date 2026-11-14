import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronDown, History, ShieldCheck, UserCog, Users } from "lucide-react";

/**
 * One menu for the four access-control screens: Employees, Roles, Role setup and Audit trail.
 * Shown at the top of each of them so people can move between them.
 */
const ITEMS = [
  { to: "/employees", label: "Employees", icon: Users, match: (p) => p === "/employees" },
  { to: "/employees/roles", label: "Roles", icon: ShieldCheck, admin: true, match: (p) => p.startsWith("/employees/roles") },
  { to: "/employees/role-setup", label: "Role setup", icon: UserCog, admin: true, match: (p) => p.startsWith("/employees/role-setup") },
  { to: "/employees/audit", label: "Audit trail", icon: History, admin: true, match: (p) => p.startsWith("/employees/audit") },
];

export default function AccessControlNav({ canManage = true }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const items = ITEMS.filter((i) => !i.admin || canManage);
  const current = items.find((i) => i.match(pathname)) || items[0];
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="emp-acnav" ref={ref}>
      <button type="button" className="emp-btn emp-acnav-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <CurrentIcon size={15} /> {current.label} <ChevronDown size={14} className={open ? "emp-acnav-flip" : ""} />
      </button>
      {open && (
        <div className="emp-acnav-menu" role="menu">
          {items.map((i) => {
            const Icon = i.icon;
            const active = i === current;
            return (
              <button
                type="button"
                key={i.to}
                role="menuitem"
                className={`emp-acnav-item ${active ? "active" : ""}`}
                onClick={() => {
                  setOpen(false);
                  if (!active) navigate(i.to);
                }}
              >
                <Icon size={15} /> <span>{i.label}</span> {active && <Check size={14} className="emp-acnav-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
