import React from "react";
import { Printer, X, Download, QrCode } from "lucide-react";

export default function JobCardPrintModal({
  isOpen,
  onClose,
  productionOrder
}) {
  if (!isOpen || !productionOrder) return null;

  const {
    productionNo,
    jobNo,
    customerName,
    customerMobile,
    customerCode,
    productName,
    requiredQty = 1000,
    plannedQty = 1000,
    priority = "NORMAL",
    status = "PLANNED",
    plannedStart,
    expectedCompletion,
    requirementSnapshot = {},
    operations = [],
    notes
  } = productionOrder;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="prod-modal-overlay">
      <div className="prod-modal-content" style={{ maxWidth: "800px", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="prod-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Printer size={18} color="#047857" />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
              Print Production Job Traveler • {productionNo}
            </h3>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handlePrint}
              className="prod-btn-primary"
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              <Printer size={14} /> Print Job Card
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Job Traveler Sheet */}
        <div className="prod-modal-body" style={{ background: "#ffffff", padding: "24px" }}>
          <div className="prod-printable-traveler" style={{ border: "2px solid #0f172a", padding: "20px", borderRadius: "6px", fontFamily: "sans-serif" }}>
            {/* Header / Brand */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#0f172a", letterSpacing: "1px" }}>
                  PRINTZ ERP • JOB TRAVELER CARD
                </h1>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#475569" }}>
                  Official Production Route Sheet & Work Ticket
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#047857" }}>{productionNo}</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Job: <strong>{jobNo}</strong></div>
                <div style={{ fontSize: "10px", color: "#94a3b8" }}>Priority: <strong style={{ color: priority === "URGENT" ? "#dc2626" : "#0f172a" }}>{priority}</strong></div>
              </div>
            </div>

            {/* Customer & Job Info Box */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", background: "#f8fafc", border: "1px solid #cbd5e1", padding: "12px", borderRadius: "4px", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", display: "block" }}>Customer</span>
                <strong style={{ fontSize: "13px", color: "#0f172a" }}>{customerName}</strong>
                <div style={{ fontSize: "11px", color: "#475569" }}>{customerCode} • {customerMobile}</div>
              </div>
              <div>
                <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", display: "block" }}>Item / Product</span>
                <strong style={{ fontSize: "13px", color: "#0f172a" }}>{productName}</strong>
                <div style={{ fontSize: "11px", color: "#475569" }}>Required: <strong>{requiredQty} pcs</strong> | Planned: <strong>{plannedQty} pcs</strong></div>
              </div>
              <div>
                <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", display: "block" }}>Schedule</span>
                <div style={{ fontSize: "11px", color: "#334155" }}>Start: <strong>{plannedStart ? new Date(plannedStart).toLocaleDateString() : "Immediate"}</strong></div>
                <div style={{ fontSize: "11px", color: "#334155" }}>Due: <strong>{expectedCompletion ? new Date(expectedCompletion).toLocaleDateString() : "Next Day"}</strong></div>
              </div>
            </div>

            {/* Specifications Details */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#334155" }}>
                Job Technical Specifications
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", fontSize: "11px", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "4px" }}>
                <div><strong>Paper:</strong> {requirementSnapshot.paper || "Art Card 350 GSM"}</div>
                <div><strong>Size:</strong> {requirementSnapshot.size || "3.5 x 2.0 inches"}</div>
                <div><strong>Printing:</strong> {requirementSnapshot.colors || "4/4 Full Color (CMYK)"}</div>
                <div><strong>Lamination:</strong> {requirementSnapshot.lamination || "Velvet Matte Both"}</div>
                <div><strong>Finishing:</strong> {requirementSnapshot.finishing || "Spot UV + Gold Foil"}</div>
                <div><strong>Cutting:</strong> {requirementSnapshot.cutting || "Die Cut + Rounded Corners"}</div>
                <div><strong>Binding:</strong> {requirementSnapshot.binding || "N/A"}</div>
                <div><strong>Packaging:</strong> Standard Craft Box</div>
              </div>
            </div>

            {/* Operations Route Sequence & Sign-off Table */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#334155" }}>
                Routing Operations Sequence & Sign-Offs
              </h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ background: "#0f172a", color: "#ffffff" }}>
                    <th style={{ padding: "6px", textAlign: "center", border: "1px solid #0f172a" }}>Seq</th>
                    <th style={{ padding: "6px", textAlign: "left", border: "1px solid #0f172a" }}>Operation</th>
                    <th style={{ padding: "6px", textAlign: "left", border: "1px solid #0f172a" }}>Machine / Station</th>
                    <th style={{ padding: "6px", textAlign: "center", border: "1px solid #0f172a" }}>Target</th>
                    <th style={{ padding: "6px", textAlign: "center", border: "1px solid #0f172a" }}>Actual Good</th>
                    <th style={{ padding: "6px", textAlign: "center", border: "1px solid #0f172a" }}>Waste</th>
                    <th style={{ padding: "6px", textAlign: "left", border: "1px solid #0f172a" }}>Operator Sign</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op) => (
                    <tr key={op.id || op.sequenceNo} style={{ borderBottom: "1px solid #cbd5e1" }}>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #cbd5e1", fontWeight: 700 }}>
                        {op.sequenceNo}
                      </td>
                      <td style={{ padding: "8px", border: "1px solid #cbd5e1", fontWeight: 600 }}>
                        {op.name || op.operationName}
                      </td>
                      <td style={{ padding: "8px", border: "1px solid #cbd5e1", color: "#475569" }}>
                        {op.assignedMachine || op.machine || "Assigned Station"}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #cbd5e1" }}>
                        {(op.plannedQty || plannedQty).toLocaleString()}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #cbd5e1", minWidth: "60px" }}>
                        {op.completedQty ? `${op.completedQty}` : "__________"}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #cbd5e1", minWidth: "50px" }}>
                        {op.wastageQty !== undefined && op.wastageQty !== null && op.status === "COMPLETED" ? `${op.wastageQty}` : "_____"}
                      </td>
                      <td style={{ padding: "8px", border: "1px solid #cbd5e1", minWidth: "120px" }}>
                        {op.operator ? `${op.operator} (${op.status})` : "____________________"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Special Instructions & Signatures */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", borderTop: "1px solid #0f172a", paddingTop: "12px" }}>
              <div style={{ fontSize: "11px", color: "#334155" }}>
                <strong>Special Production Instructions:</strong>
                <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>
                  {notes || "Maintain registration within ±0.2mm. Verify color saturation against approved sample proof before full run."}
                </p>
              </div>
              <div style={{ textAlign: "right", fontSize: "11px" }}>
                <div style={{ marginBottom: "24px" }}>Production Supervisor: __________________</div>
                <div>Date & Dispatch: __________________</div>
              </div>
            </div>
          </div>
        </div>

        <div className="prod-modal-footer">
          <button type="button" onClick={onClose} className="prod-btn-secondary">
            Close
          </button>
          <button type="button" onClick={handlePrint} className="prod-btn-primary">
            <Printer size={14} /> Print Traveler
          </button>
        </div>
      </div>
    </div>
  );
}
