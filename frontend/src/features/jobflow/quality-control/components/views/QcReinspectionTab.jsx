import React, { useState } from "react";
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

const INITIAL_REINSPECTION_ITEMS = [
  {
    id: "re-1025",
    reworkNo: "RW-001",
    jobNo: "JOB-1025",
    orderNumber: "PO-1025",
    customerName: "City Marketing Agency",
    productType: "Premium Tri-fold Brochure (500 pcs)",
    reworkedOp: "Precision Cutting & Trimming",
    reworkOperator: "Manoj K. (Finishing Lead)",
    reworkedQty: 100,
    initialAcceptedQty: 400,
    totalTargetQty: 500,
    defectAddressed: "Cutting bleed offset by 1.5mm along bottom edge",
    returnedAt: "Today, 11:20 AM",
    status: "AWAITING_QC_REINSPECTION",
    criteria: [
      { id: "rc-1", name: "Recut Trim Tolerance", desc: "Verify 100% of 100 pcs trim to exact 210x297mm without bleeding into copy", passed: true },
      { id: "rc-2", name: "Tri-fold Crease Alignment", desc: "Check fold line accuracy at 99mm and 198mm intervals", passed: true },
      { id: "rc-3", name: "Surface Scuff Inspection", desc: "Ensure no handling smudges or roller marks during recutting", passed: true },
    ],
  },
  {
    id: "re-1028",
    reworkNo: "RW-002",
    jobNo: "JOB-1028",
    orderNumber: "PO-1028",
    customerName: "Apex Retail Solutions",
    productType: "Matte Finish Product Catalog",
    reworkedOp: "Thermal Lamination",
    reworkOperator: "Manoj K.",
    reworkedQty: 60,
    initialAcceptedQty: 240,
    totalTargetQty: 300,
    defectAddressed: "Heat bubbles along trailing edge of cover sheets",
    returnedAt: "Today, 10:10 AM",
    status: "AWAITING_QC_REINSPECTION",
    criteria: [
      { id: "rc-4", name: "Thermal Lamination Bond", desc: "Verify zero air bubbles or delamination along cover edges", passed: true },
      { id: "rc-5", name: "Surface Smoothness", desc: "Uniform matte tactile finish without heat streaks", passed: true },
    ],
  },
];

export const QcReinspectionTab = ({
  onApproveReinspection,
  onRejectReinspection,
}) => {
  const [items, setItems] = useState(INITIAL_REINSPECTION_ITEMS);
  const [activeItem, setActiveItem] = useState(INITIAL_REINSPECTION_ITEMS[0] || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [checkedCount, setCheckedCount] = useState(100);
  const [criteriaChecklist, setCriteriaChecklist] = useState(
    INITIAL_REINSPECTION_ITEMS[0]?.criteria || []
  );
  const [inspectorNotes, setInspectorNotes] = useState(
    "Defect fully resolved. Tolerance and finishing verified against digital master."
  );

  const filtered = items.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.jobNo.toLowerCase().includes(q) ||
      item.customerName.toLowerCase().includes(q) ||
      item.reworkNo.toLowerCase().includes(q)
    );
  });

  const handleSelectItem = (item) => {
    setActiveItem(item);
    setCheckedCount(item.reworkedQty);
    setCriteriaChecklist(item.criteria.map((c) => ({ ...c, passed: true })));
  };

  const toggleCriteria = (id) => {
    setCriteriaChecklist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, passed: !c.passed } : c))
    );
  };

  const handleApprove = () => {
    if (!activeItem) return;
    const allPassed = criteriaChecklist.every((c) => c.passed);
    if (!allPassed) {
      toast.error("All reinspection criteria must be cleared to approve for delivery.");
      return;
    }

    const totalCleared = activeItem.initialAcceptedQty + activeItem.reworkedQty;
    toast.success(
      `Reinspection Approved! ${activeItem.reworkedQty} units cleared. Total ${totalCleared}/${activeItem.totalTargetQty} units marked READY_FOR_DELIVERY!`
    );

    if (onApproveReinspection) {
      onApproveReinspection(activeItem, {
        reinspectedQty: activeItem.reworkedQty,
        totalClearedQty: totalCleared,
        notes: inspectorNotes,
      });
    }

    setItems((prev) => prev.filter((i) => i.id !== activeItem.id));
    const remaining = items.filter((i) => i.id !== activeItem.id);
    setActiveItem(remaining[0] || null);
  };

  const handleFailAgain = () => {
    if (!activeItem) return;
    toast.error(`Reinspection failed for ${activeItem.reworkNo}. Escalated for secondary rework or scrap authorization.`);
    if (onRejectReinspection) {
      onRejectReinspection(activeItem, { notes: inspectorNotes });
    }
    setItems((prev) => prev.filter((i) => i.id !== activeItem.id));
    const remaining = items.filter((i) => i.id !== activeItem.id);
    setActiveItem(remaining[0] || null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Banner */}
      <div
        className="jf-card"
        style={{
          padding: "1.25rem 1.5rem",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          borderRadius: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                background: "rgba(59, 130, 246, 0.2)",
                color: "#93c5fd",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Final Stage Verification
            </span>
            <span style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.8125rem" }}>
              • Recovered Output Clearance
            </span>
          </div>
          <h2 style={{ margin: "0.35rem 0 0 0", fontSize: "1.5rem", fontWeight: 750, color: "#ffffff" }}>
            QC Reinspection Queue
          </h2>
          <p style={{ margin: "0.25rem 0 0 0", color: "rgba(255, 255, 255, 0.8)", fontSize: "0.85rem" }}>
            Re-examine corrected batches from the Production Rework Queue. Passing clears the remaining quantity and completes the order for Delivery Management.
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.75rem", color: "#93c5fd", fontWeight: 700, textTransform: "uppercase" }}>
            Batches to Reinspect
          </div>
          <strong style={{ fontSize: "1.5rem", color: "#ffffff" }}>
            {items.length}
          </strong>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "1.25rem" }}>
        {/* Left: Pending Reinspection Batches */}
        <div className="jf-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
              Returned Rework Batches
            </h3>
            <span style={{ fontSize: "0.78rem", color: "#475569" }}>
              Operators completed floor correction.
            </span>
          </div>

          <div style={{ position: "relative" }}>
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
              placeholder="Search by job# or RW#..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "30px", width: "100%", height: "34px", borderRadius: "6px" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#475569", fontSize: "0.85rem" }}>
                No batches awaiting reinspection.
              </div>
            ) : (
              filtered.map((item) => {
                const isSelected = activeItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectItem(item)}
                    style={{
                      padding: "0.75rem 0.875rem",
                      borderRadius: "8px",
                      border: isSelected ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                      background: isSelected ? "#eff6ff" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          background: "#dbeafe",
                          color: "#1e40af",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        {item.reworkNo}
                      </span>
                      <strong style={{ color: "#0f172a", fontSize: "0.875rem" }}>
                        {item.jobNo}
                      </strong>
                    </div>

                    <div style={{ fontSize: "0.8125rem", color: "#334155", fontWeight: 600 }}>
                      {item.productType}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#475569" }}>
                      <span>Re-worked: <strong style={{ color: "#2563eb" }}>{item.reworkedQty} pcs</strong></span>
                      <span>{item.returnedAt}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Reinspection Form & Final Reconciliation */}
        {activeItem ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Batch Reconciliation Card */}
            <div className="jf-card" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                      Reinspecting {activeItem.jobNo} ({activeItem.reworkNo})
                    </h3>
                    <span className="jf-badge jf-badge-info">AWAITING_REINSPECTION</span>
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#475569", marginTop: "4px" }}>
                    Customer: <strong>{activeItem.customerName}</strong> • Reworked Op: <strong>{activeItem.reworkedOp}</strong> by {activeItem.reworkOperator}
                  </div>
                </div>

                {/* 3-Part Quantity Tally */}
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ background: "#f0fdf4", padding: "6px 12px", borderRadius: "6px", border: "1px solid #bbf7d0", fontSize: "0.78rem" }}>
                    <div style={{ color: "#166534", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>Already Accepted</div>
                    <strong style={{ color: "#15803d", fontSize: "1rem" }}>{activeItem.initialAcceptedQty} pcs</strong>
                  </div>
                  <div style={{ background: "#eff6ff", padding: "6px 12px", borderRadius: "6px", border: "1px solid #bfdbfe", fontSize: "0.78rem" }}>
                    <div style={{ color: "#1e40af", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>In Reinspection</div>
                    <strong style={{ color: "#2563eb", fontSize: "1rem" }}>{activeItem.reworkedQty} pcs</strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "6px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.78rem" }}>
                    <div style={{ color: "#475569", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>Order Target</div>
                    <strong style={{ color: "#0f172a", fontSize: "1rem" }}>{activeItem.totalTargetQty} pcs</strong>
                  </div>
                </div>
              </div>

              {/* Defect Context Box */}
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1rem",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "8px",
                  fontSize: "0.8125rem",
                  color: "#92400e",
                }}
              >
                <strong>Initial Defect Checked:</strong> {activeItem.defectAddressed}
              </div>
            </div>

            {/* Checklist */}
            <div className="jf-card" style={{ padding: "1.25rem" }}>
              <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                Verification Points for Reworked Output
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {criteriaChecklist.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      border: c.passed ? "1.5px solid #86efac" : "1.5px solid #fca5a5",
                      background: c.passed ? "#f0fdf4" : "#fef2f2",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => toggleCriteria(c.id)}
                  >
                    <div>
                      <strong style={{ color: c.passed ? "#14532d" : "#7f1d1d", fontSize: "0.875rem" }}>
                        {c.name}
                      </strong>
                      <div style={{ fontSize: "0.78rem", color: c.passed ? "#166534" : "#991b1b" }}>
                        {c.desc}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`jf-btn jf-btn-sm ${c.passed ? "jf-btn-success" : "jf-btn-danger"}`}
                      style={{ padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700 }}
                    >
                      {c.passed ? "PASS ✓" : "FAIL ✕"}
                    </button>
                  </div>
                ))}
              </div>

              {/* Inspector Remarks */}
              <div style={{ marginTop: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px", textTransform: "uppercase" }}>
                  QC Inspector Final Reinspection Remarks
                </label>
                <textarea
                  rows={2}
                  className="jf-input"
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  style={{ width: "100%", fontSize: "0.8125rem" }}
                />
              </div>

              {/* Final Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "1.25rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  className="jf-btn jf-btn-danger"
                  style={{ background: "#dc2626", color: "#ffffff", fontWeight: 600 }}
                  onClick={handleFailAgain}
                >
                  Reject & Re-Escalate
                </button>

                <button
                  type="button"
                  className="jf-btn jf-btn-success"
                  style={{ background: "#10b981", color: "#ffffff", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}
                  onClick={handleApprove}
                >
                  <ShieldCheck size={16} /> Approve & Mark READY_FOR_DELIVERY (100% Target Met)
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="jf-card" style={{ padding: "3rem", textAlign: "center", color: "#475569" }}>
            <RefreshCw size={44} style={{ strokeWidth: 1.2, marginBottom: "0.75rem" }} />
            <h3 style={{ margin: 0, color: "#475569" }}>No Batch Selected</h3>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem" }}>
              Select a returned rework batch from the left to execute the reinspection checklist.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QcReinspectionTab;
