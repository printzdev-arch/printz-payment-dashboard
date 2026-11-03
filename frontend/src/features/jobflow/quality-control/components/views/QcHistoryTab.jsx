import React, { useState } from "react";
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Search,
  CheckCircle,
  FileCheck,
  Printer,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  BarChart2,
} from "lucide-react";
import { QcReportsTab } from "./QcReportsTab";

const INITIAL_QC_HISTORY = [
  {
    id: "hist-1025",
    jobNo: "JOB-1025",
    customerName: "City Marketing Agency",
    product: "Premium Tri-fold Brochure (500 pcs)",
    status: "READY_FOR_DELIVERY",
    finalAcceptedQty: 500,
    timeline: [
      {
        step: 1,
        title: "Initial Physical QC Inspection",
        inspector: "Inspector Manoj K.",
        time: "Today, 10:30 AM",
        result: "PARTIAL_FAIL",
        details: "400 pcs passed 100% tolerance. 100 pcs flagged for bottom bleed margin shift (1.5mm offset).",
        action: "Dispatched to Rework Queue as RW-001 (Cutting).",
      },
      {
        step: 2,
        title: "Floor Targeted Rework Executed",
        operator: "Manoj K. (Finishing Lead)",
        time: "Today, 11:15 AM",
        result: "REWORK_COMPLETED",
        details: "100 pcs recut with calibrated side guide shims. 0 pcs scrapped.",
        action: "Returned to QC Reinspection Queue.",
      },
      {
        step: 3,
        title: "QC Final Reinspection Cleared",
        inspector: "Senior Inspector Ravi",
        time: "Today, 11:35 AM",
        result: "PASSED",
        details: "All 100 recut units verified to digital trim box. Total 500/500 units cleared.",
        action: "Status updated to READY_FOR_DELIVERY.",
      },
    ],
  },
  {
    id: "hist-1021",
    jobNo: "JOB-1021",
    customerName: "Green Earth Organics",
    product: "Kraft Paper Display Boxes",
    status: "READY_FOR_DELIVERY",
    finalAcceptedQty: 250,
    timeline: [
      {
        step: 1,
        title: "Initial Physical QC Inspection",
        inspector: "Inspector Ravi Kumar",
        time: "Yesterday, 03:15 PM",
        result: "PASSED",
        details: "All 250 units verified for score line depth, folding elasticity, and print registration.",
        action: "Direct clearance to Delivery Management.",
      },
    ],
  },
];

export const QcHistoryTab = () => {
  const [subTab, setSubTab] = useState("audit");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedJobId, setExpandedJobId] = useState("hist-1025");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const filtered = INITIAL_QC_HISTORY.filter((item) => {
    const q = searchTerm.toLowerCase();
    return item.jobNo.toLowerCase().includes(q) || item.customerName.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pagedItems = filtered.slice(startIdx, startIdx + pageSize);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header & Sub-tab navigation */}
      <div className="jf-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 750, color: "#0f172a" }}>
              QC History & Reports
            </h2>
            
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
              <button
                type="button"
                style={{
                  padding: "6px 14px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: subTab === "audit" ? "#ffffff" : "transparent",
                  color: subTab === "audit" ? "#059669" : "#64748b",
                  boxShadow: subTab === "audit" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
                onClick={() => setSubTab("audit")}
              >
                Inspection Audit Trail
              </button>
              <button
                type="button"
                style={{
                  padding: "6px 14px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: subTab === "reports" ? "#ffffff" : "transparent",
                  color: subTab === "reports" ? "#059669" : "#64748b",
                  boxShadow: subTab === "reports" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
                onClick={() => setSubTab("reports")}
              >
                Defect Analytics & Reports
              </button>
            </div>

            {subTab === "audit" && (
              <div style={{ position: "relative", minWidth: "260px" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#475569",
                  }}
                />
                <input
                  type="text"
                  className="jf-input jf-input-sm"
                  placeholder="Search history by job# or customer..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  style={{ paddingLeft: "32px", width: "100%", height: "36px", borderRadius: "6px" }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {subTab === "reports" ? (
        <QcReportsTab />
      ) : (
        <>
          {/* Audit Log Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {pagedItems.map((item) => {
          const isExpanded = expandedJobId === item.id;

          return (
            <div
              key={item.id}
              className="jf-card"
              style={{
                padding: "1.25rem",
                border: isExpanded ? "1.5px solid #10b981" : "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => setExpandedJobId(isExpanded ? null : item.id)}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <strong style={{ fontSize: "1.125rem", color: "#0f172a" }}>
                      {item.jobNo}
                    </strong>
                    <span style={{ fontSize: "0.85rem", color: "#475569" }}>
                      — {item.customerName}
                    </span>
                    <span className="jf-badge jf-badge-success">
                      ✓ {item.status} ({item.finalAcceptedQty} pcs)
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#475569", marginTop: "2px" }}>
                    {item.product} • {item.timeline.length} Inspection Events
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#475569" }}
                  >
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                </div>
              </div>

              {/* Timeline Drawer */}
              {isExpanded && (
                <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ position: "relative", paddingLeft: "2rem" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: "9px",
                        top: "12px",
                        bottom: "12px",
                        width: "2px",
                        background: "#cbd5e1",
                      }}
                    />

                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                      {item.timeline.map((event, idx) => (
                        <div key={idx} style={{ position: "relative" }}>
                          <div
                            style={{
                              position: "absolute",
                              left: "-2.05rem",
                              top: "2px",
                              width: "16px",
                              height: "16px",
                              borderRadius: "50%",
                              background:
                                event.result === "PASSED"
                                  ? "#10b981"
                                  : event.result === "PARTIAL_FAIL"
                                  ? "#f59e0b"
                                  : "#3b82f6",
                              border: "3px solid #ffffff",
                              boxShadow: "0 0 0 1px #cbd5e1",
                            }}
                          />

                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                              <strong style={{ color: "#0f172a", fontSize: "0.9375rem" }}>
                                {event.title}
                              </strong>
                              <span style={{ fontSize: "0.75rem", color: "#475569" }}>
                                • {event.time}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: event.result === "PASSED" ? "#ecfdf5" : "#fffbeb",
                                  color: event.result === "PASSED" ? "#059669" : "#b45309",
                                }}
                              >
                                {event.result}
                              </span>
                            </div>

                            <div style={{ fontSize: "0.8125rem", color: "#334155", marginTop: "4px" }}>
                              {event.details}
                            </div>

                            <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "2px" }}>
                              Action: <strong>{event.action}</strong> • Sign-off: <strong>{event.inspector || event.operator}</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Audit Log Pagination */}
      <div
        className="jf-card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.85rem 1.25rem",
          fontSize: "0.85rem",
          color: "#64748b",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <span>
          {filtered.length === 0
            ? "Showing 0 audit records"
            : `Showing ${startIdx + 1} to ${Math.min(startIdx + pageSize, filtered.length)} of ${filtered.length} audit records`}
        </span>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span style={{ fontWeight: 600, color: "#1e293b", margin: "0 0.25rem" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </>
  )}
</div>
);
};

export default QcHistoryTab;
