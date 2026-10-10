import React from "react";
import { Users, Star } from "lucide-react";

export default function DesignerPoolPanel({ designers = [] }) {
  const displayDesigners = (designers && designers.length > 0) ? designers : [
    { id: "d1", name: "Priya R", code: "PR", designation: "Sr. Designer", status: "eligible", openJobs: 3, maxJobs: 5, slaMonthRate: 96, rating: 4.8, avatarColor: "#15803d" },
    { id: "d2", name: "Rahul M", code: "RM", designation: "Designer", status: "eligible", openJobs: 2, maxJobs: 5, slaMonthRate: 88, rating: 4.4, avatarColor: "#0284c7" },
    { id: "d3", name: "Sneha K", code: "SK", designation: "Designer", status: "on_leave", openJobs: 1, maxJobs: 5, slaMonthRate: 91, rating: 4.6, avatarColor: "#9333ea" },
    { id: "d4", name: "Imran S", code: "IS", designation: "Designer", status: "at_capacity", openJobs: 5, maxJobs: 5, slaMonthRate: 79, rating: 4.1, avatarColor: "#d97706" }
  ];

  return (
    <div className="v3-pool-card" style={{ marginBottom: "20px", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Users size={16} color="#059669" />
          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
            Designer Pool • Today ({displayDesigners.length})
          </h4>
        </div>
        <span style={{ fontSize: "11.5px", color: "#64748b" }}>
          Live workload & round-robin allocation readiness
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "12px",
          width: "100%"
        }}
      >
        {displayDesigners.map((designer, idx) => {
          const openJobs = designer.openJobs !== undefined ? designer.openJobs : 0;
          const maxJobs = designer.maxJobs || 5;
          const pct = Math.min(100, (openJobs / maxJobs) * 100);

          return (
            <div key={designer.id || designer._id || designer.code || `pool-d-${idx}`} className="v3-pool-card-item">
              {/* Top Row: Avatar + Name/Role + Status Badge */}
              <div className="v3-pool-item-top">
                <div className="v3-pool-user-info">
                  <div
                    className="v3-avatar-circle"
                    style={{
                      width: "32px",
                      height: "32px",
                      fontSize: "12px",
                      backgroundColor: designer.avatarColor || "#059669",
                      flexShrink: 0
                    }}
                  >
                    {designer.code}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#0f172a",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {designer.name}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        marginTop: "2px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {designer.designation || "Designer"}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {designer.status === "on_leave" ? (
                    <span className="v3-status-pill v3-status-purple">
                      On leave
                    </span>
                  ) : designer.status === "at_capacity" ? (
                    <span className="v3-status-pill v3-status-amber">
                      At capacity
                    </span>
                  ) : designer.code === "RM" ? (
                    <span className="v3-status-pill v3-status-emerald">
                      Eligible • Next
                    </span>
                  ) : (
                    <span className="v3-status-pill v3-status-emerald">
                      Eligible
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Row: Workload + SLA % + Rating */}
              <div className="v3-pool-item-bottom">
                <div className="v3-pool-workload">
                  <div className="v3-pool-workload-label">
                    <span>Open jobs:</span>
                    <strong style={{ color: "#0f172a" }}>{openJobs}/{maxJobs}</strong>
                  </div>
                  <div className="v3-progress-track">
                    <div
                      className={`v3-progress-fill ${openJobs >= 5 ? "danger" : openJobs >= 3 ? "warning" : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="v3-pool-stat-group">
                  <div className="v3-pool-sla-stat">
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#047857" }}>
                      {designer.slaMonthRate || 92}%
                    </span>
                    <span style={{ fontSize: "9px", color: "#64748b", fontWeight: 600 }}>
                      SLA
                    </span>
                  </div>

                  <div className="v3-pool-rating-stat">
                    <Star size={10} fill="#d97706" color="#d97706" />
                    <span>{designer.rating || 4.5}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


