import React from "react";
import "../../styles/sale-order.css";

// A titled card used for each block of a form or detail page.
export default function Section({ icon: Icon, title, subtitle, actions, children, flush = false }) {
  return (
    <section className="so-section">
      <div className="so-section-head">
        {Icon ? (
          <span className="so-section-icon">
            <Icon size={18} />
          </span>
        ) : null}
        <div className="grow">
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className={flush ? "" : "so-section-body"}>{children}</div>
    </section>
  );
}
