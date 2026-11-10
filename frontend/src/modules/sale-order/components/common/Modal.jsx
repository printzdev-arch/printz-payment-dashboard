import React, { useEffect } from "react";
import { X } from "lucide-react";
import "../../styles/sale-order.css";

// Shared popup shell: header with title, scrolling body, footer for actions.
export default function Modal({ isOpen, title, subtitle, onClose, footer, wide = false, children }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="so-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`so-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="so-modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="so-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="so-modal-body">{children}</div>
        {footer && <div className="so-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
