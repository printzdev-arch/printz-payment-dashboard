import React from "react";
import "../styles/job-flow.css";

export const JobFlowLayout = ({ children, title, subtitle, actions }) => {
  return (
    <div className="jf-container">
      {/* Top Header */}
      {(title || actions) && (
        <div className="jf-header">
          <div>
            {title && <h1 className="jf-header-title">{title}</h1>}
            {subtitle && <p className="jf-header-subtitle" style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>{subtitle}</p>}
          </div>
          {actions && <div className="jf-header-actions">{actions}</div>}
        </div>
      )}

      {/* Page Content */}
      <div className="jf-content-area">{children}</div>
    </div>
  );
};

export default JobFlowLayout;
