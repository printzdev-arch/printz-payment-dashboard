import React from "react";
import "../styles/mfg-unit.css";

// The green header banner the other pages use: title with a highlighted word, a short line under it, actions on the right.
export default function PageBanner({ title, highlight, subtitle, actions }) {
  return (
    <div className="mfg-banner">
      <div>
        <h1>
          {title} {highlight && <span className="highlight">{highlight}</span>}
        </h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="mfg-banner-actions">{actions}</div>}
    </div>
  );
}
