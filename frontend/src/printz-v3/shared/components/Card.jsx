import React from "react";
import "../../modules/customer/styles/customerV3.css";

export default function Card({
  children,
  title,
  subtitle,
  icon: Icon,
  action,
  className = "",
  bodyClassName = "",
  headerClassName = "",
  onClick
}) {
  return (
    <div
      onClick={onClick}
      className={`v3-card ${onClick ? "clickable" : ""} ${className}`}
    >
      {(title || Icon || action) && (
        <div className={`v3-card-header ${headerClassName}`}>
          <div className="v3-card-header-left">
            {Icon && (
              <div className="v3-card-icon">
                <Icon size={18} />
              </div>
            )}
            <div>
              {title && <h3 className="v3-card-title">{title}</h3>}
              {subtitle && <p className="v3-card-subtitle">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={`v3-card-body ${bodyClassName}`}>{children}</div>
    </div>
  );
}
