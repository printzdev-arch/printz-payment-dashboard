import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, ChevronDown } from "lucide-react";
import useFloatingMenu from "../../utils/useFloatingMenu";
import "../../styles/calendarSelect.css";

const pad = (n) => String(n).padStart(2, "0");

// "HH:mm" (24h) -> { h12, minute, pm }
const parse = (value) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(value || "");
  if (!m) return null;
  const h = Number(m[1]);
  return { h12: h % 12 === 0 ? 12 : h % 12, minute: Number(m[2]), pm: h >= 12 };
};

const build = (h12, minute, pm) => `${pad((h12 % 12) + (pm ? 12 : 0))}:${pad(minute)}`;

/**
 * Time picker that replaces <input type="time">.
 * value is "HH:mm" (24 hour); onChange gets { target: { name, value } }; the field shows 12 hour time with AM / PM.
 * step is the gap between minutes in the list (5 by default); a minute that is already set is always kept.
 */
export default function TimeField({ value, onChange, disabled = false, required = false, name, placeholder = "Select time", step = 5, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const parsed = parse(value);
  const menuStyle = useFloatingMenu(containerRef, menuRef, isOpen, { minWidth: 220 });

  const minutes = useMemo(() => {
    const list = [];
    for (let m = 0; m < 60; m += step) list.push(m);
    if (parsed && !list.includes(parsed.minute)) list.push(parsed.minute);
    return list.sort((a, b) => a - b);
  }, [step, parsed]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target) && !(menuRef.current && menuRef.current.contains(e.target))) setIsOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  // Bring the chosen hour and minute into view when the list opens
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;
    menuRef.current.querySelectorAll(".time-opt.selected").forEach((el) => el.scrollIntoView({ block: "center" }));
  }, [isOpen, menuStyle.visibility]);

  const emit = (h12, minute, pm) => onChange && onChange({ target: { name: name || "", value: build(h12, minute, pm) } });
  const cur = parsed || { h12: 9, minute: 0, pm: false };
  const label = parsed ? `${pad(parsed.h12)}:${pad(parsed.minute)} ${parsed.pm ? "PM" : "AM"}` : "";

  return (
    <div ref={containerRef} className={`calendar-select-container ${className}`}>
      {required && <input type="text" value={value || ""} required onChange={() => {}} tabIndex={-1} style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: "100%", height: "100%", bottom: 0, left: 0 }} />}
      <div
        className={`calendar-select-trigger ${isOpen ? "open" : ""} ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) setIsOpen((o) => !o);
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="calendar-select-trigger-content">
          <span className="calendar-select-trigger-icon"><Clock size={16} /></span>
          <span className={`calendar-select-trigger-text ${label ? "" : "placeholder"}`}>{label || placeholder}</span>
        </div>
        <div className="calendar-select-actions">
          <span className="calendar-select-chevron"><ChevronDown size={16} /></span>
        </div>
      </div>

      {isOpen &&
        createPortal(
          <div ref={menuRef} style={menuStyle} className="time-popup" role="dialog">
            <div className="time-cols">
              <div className="time-col" aria-label="Hour">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <button type="button" key={h} className={`time-opt ${parsed && cur.h12 === h ? "selected" : ""}`} onClick={() => emit(h, cur.minute, cur.pm)}>
                    {pad(h)}
                  </button>
                ))}
              </div>
              <div className="time-col" aria-label="Minute">
                {minutes.map((m) => (
                  <button type="button" key={m} className={`time-opt ${parsed && cur.minute === m ? "selected" : ""}`} onClick={() => emit(cur.h12, m, cur.pm)}>
                    {pad(m)}
                  </button>
                ))}
              </div>
              <div className="time-col time-col-ampm" aria-label="AM or PM">
                {["AM", "PM"].map((p) => (
                  <button type="button" key={p} className={`time-opt ${parsed && cur.pm === (p === "PM") ? "selected" : ""}`} onClick={() => emit(cur.h12, cur.minute, p === "PM")}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="time-foot">
              <button type="button" className="calendar-footer-btn today-btn" onClick={() => setIsOpen(false)}>Done</button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
