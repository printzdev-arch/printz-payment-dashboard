import React from "react";
import { ArrowRight, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";

export default function DesignerAllocationSequence({
  designers = [],
  selectedCount = 0,
  onAutoAllocate,
  isAllocating = false
}) {
  const displayDesigners = (designers && designers.length > 0) ? designers : [
    { id: "d1", name: "Priya R", code: "PR", designation: "Sr. Designer", status: "eligible", avatarColor: "#15803d" },
    { id: "d2", name: "Rahul M", code: "RM", designation: "Designer", status: "eligible", avatarColor: "#0284c7" },
    { id: "d3", name: "Sneha K", code: "SK", designation: "Designer", status: "on_leave", avatarColor: "#9333ea" },
    { id: "d4", name: "Imran S", code: "IS", designation: "Designer", status: "at_capacity", avatarColor: "#d97706" }
  ];

  return (
    <div className="v3-alloc-seq-card">
      <div className="v3-alloc-seq-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <RefreshCw size={15} color="#10b981" />
          <span>Allocation Sequence</span>
          <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "#ecfdf5", color: "#047857", padding: "2px 8px", borderRadius: "999px" }}>
            Round Robin
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Last allocation: 15 Sep 2026, 05:10 PM
          </span>

          <button
            type="button"
            onClick={onAutoAllocate}
            disabled={isAllocating}
            className="v3-btn-primary"
            style={{ fontSize: "12px", padding: "6px 14px", height: "32px" }}
          >
            <Sparkles size={14} />
            {isAllocating ? "Allocating..." : `Auto-allocate Selected (${selectedCount})`}
          </button>
        </div>
      </div>

      {/* Nodes Carousel */}
      <div className="v3-seq-flow">
        {displayDesigners.map((designer, idx) => {
          const isNext = designer.code === "RM" || idx === 1; // Visual highlight for next in rotation
          const isSkipped = designer.status === "on_leave" || designer.status === "at_capacity";

          return (
            <React.Fragment key={designer.id || idx}>
              <div className={`v3-seq-node ${isNext ? "active-next" : ""}`} style={{ opacity: isSkipped ? 0.6 : 1 }}>
                <div
                  className="v3-avatar-circle"
                  style={{ backgroundColor: designer.avatarColor || "#059669" }}
                >
                  {designer.code}
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                    {designer.name}
                  </div>
                  <div style={{ fontSize: "11px", color: isNext ? "#047857" : "#64748b", fontWeight: isNext ? 700 : 400 }}>
                    {isNext
                      ? "NEXT IN ROTATION"
                      : designer.status === "on_leave"
                      ? "Skipped • On leave"
                      : designer.status === "at_capacity"
                      ? "Skipped • At capacity (5/5)"
                      : "Assigned last • JO-0049"}
                  </div>
                </div>
              </div>

              {idx < displayDesigners.length - 1 && (
                <ArrowRight size={16} className="v3-seq-arrow" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "10px" }}>
        Pool = active designers ordered by employee code. Skips: on approved leave, absent today, open jobs ≥ max (5), or already rejected this job.
      </div>
    </div>
  );
}
