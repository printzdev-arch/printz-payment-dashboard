import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import useFloatingMenu from "../../utils/useFloatingMenu";
import "../../styles/branchSelect.css";

/**
 * A neat dropdown to use in place of a native <select>. Looks the same as BranchSelect.
 *   <SelectField value={v} onChange={(e) => set(e.target.value)} options={[{ value: "", label: "All" }, ...]} />
 * `options` can also be plain strings. onChange receives { target: { name, value } }.
 */
export default function SelectField({
  alignRight = false,
  value = "",
  onChange,
  options = [],
  placeholder = "Select",
  icon = null,
  searchable,
  disabled = false,
  name,
  className = "",
  style = {},
  compact = false, // small trigger and menu (for example the "Rows" picker in pagination)
  dropUp = false, // open above the field (near the bottom of a card)
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [term, setTerm] = useState("");
  const ref = useRef(null);
  const menuRef = useRef(null);

  const items = useMemo(
    () => options.filter((o) => o !== null && o !== undefined).map((o) => (typeof o === "object" ? { value: o.value, label: o.label ?? String(o.value) } : { value: o, label: String(o) })),
    [options]
  );
  const selected = items.find((o) => String(o.value) === String(value));
  const isSearchable = searchable !== undefined ? searchable : items.length > 8;
  const shown = useMemo(() => (term.trim() ? items.filter((o) => o.label.toLowerCase().includes(term.trim().toLowerCase())) : items), [items, term]);

  useEffect(() => {
    if (!isOpen) return;
    const i = shown.findIndex((o) => String(o.value) === String(value));
    setActiveIndex(i >= 0 ? i : shown.length ? 0 : -1);
  }, [isOpen, shown, value]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !(menuRef.current && menuRef.current.contains(e.target))) {
        setIsOpen(false);
        setTerm("");
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [isOpen]);

  const menuStyle = useFloatingMenu(ref, menuRef, isOpen, { preferUp: dropUp, alignRight, minWidth: compact ? 0 : 160, deps: [shown.length] });

  const pick = (o) => {
    if (onChange) onChange({ target: { name: name || "", value: o.value }, currentTarget: { name: name || "", value: o.value } }, o);
    setIsOpen(false);
    setTerm("");
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Escape") {
      setIsOpen(false);
      setTerm("");
      return;
    }
    if (!isOpen) {
      if (["Enter", " ", "ArrowDown"].includes(e.key) && e.target === e.currentTarget.querySelector(".branch-select-trigger")) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[activeIndex]) pick(shown[activeIndex]);
    }
  };

  return (
    <div ref={ref} className={`branch-select-container ${compact ? "select-compact" : ""} ${dropUp ? "drop-up" : ""} ${className}`} style={style} onKeyDown={onKeyDown}>
      <div
        className={`branch-select-trigger ${isOpen ? "open" : ""} ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="branch-select-trigger-content">
          {icon && <span className="branch-select-trigger-icon">{icon}</span>}
          <span className={`branch-select-trigger-text ${selected ? "" : "placeholder"}`}>{selected ? selected.label : placeholder}</span>
        </div>
        <span className="branch-select-chevron">
          <ChevronDown size={16} />
        </span>
      </div>

      {isOpen && createPortal(
        <div ref={menuRef} style={menuStyle} className={`branch-select-dropdown ${compact ? "select-compact-menu" : ""}`} role="listbox">
          {isSearchable && (
            <div className="branch-select-search-box">
              <Search size={14} color="#64748b" />
              <input className="branch-select-search-input" placeholder="Search..." value={term} onChange={(e) => setTerm(e.target.value)} autoFocus />
            </div>
          )}
          <div className="branch-select-options-list">
            {shown.map((o, i) => {
              const isSel = String(o.value) === String(value);
              return (
                <div
                  key={`${o.value}-${i}`}
                  className={`branch-select-option-item ${isSel ? "selected" : ""} ${i === activeIndex ? "active" : ""}`}
                  ref={(el) => {
                    if (el && i === activeIndex) el.scrollIntoView({ block: "nearest" });
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => pick(o)}
                  role="option"
                  aria-selected={isSel}
                >
                  <div className="branch-select-option-left">
                    <span>{o.label}</span>
                  </div>
                  {isSel && <Check size={16} className="branch-select-check-icon" />}
                </div>
              );
            })}
            {shown.length === 0 && <div className="branch-select-empty">No matches</div>}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
