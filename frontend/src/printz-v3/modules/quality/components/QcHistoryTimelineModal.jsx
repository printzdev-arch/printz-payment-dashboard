import React, { useState, useEffect } from "react";
import { History, X, CheckCircle2, AlertTriangle, Printer, RefreshCw, Clock, User } from "lucide-react";
import { getQcHistory } from "../api/qualityApi";

export default function QcHistoryTimelineModal({
  isOpen,
  onClose,
  productionOrderId,
  productionNo
}) {
  if (!isOpen) return null;

  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productionOrderId) {
      setLoading(true);
      getQcHistory(productionOrderId)
        .then((res) => setHistoryData(res))
        .catch((err) => console.error("Error loading QC history:", err))
        .finally(() => setLoading(false));
    }
  }, [productionOrderId]);

  const checks = historyData?.qualityChecks || [];
  const reprints = historyData?.reprintRequests || [];
  const auditLogs = historyData?.auditLog || [];

  return (
    <div className="qc-modal-overlay">
      <div className="qc-modal-content" style={{ maxWidth: "600px", maxHeight: "85vh", overflowY: "auto" }}>
        <div className="qc-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <History size={18} color="#047857" />
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                Quality & Production Timeline • {productionNo || historyData?.productionNo}
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>
                Immutable lifecycle audit & corrective cycle history
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="qc-modal-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
              Loading lifecycle timeline...
            </div>
          ) : (
            <div className="qc-timeline">
              {/* Quality Checks */}
              {checks.map((qc, idx) => (
                <div key={qc.id || idx} className="qc-timeline-item">
                  <div className={`qc-timeline-dot ${qc.result === "PASS" ? "" : "issue"}`} />
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "12px", color: "#0f172a" }}>
                        {qc.result === "PASS" ? "✓ Quality Check Passed" : "⚠ Quality Issue Detected"} (Cycle {qc.cycleNo || 0})
                      </span>
                      <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                        {new Date(qc.checkedAt || qc.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ fontSize: "11.5px", color: "#334155", marginTop: "4px" }}>
                      Inspected: <strong>{qc.quantityChecked} pcs</strong> • Accepted: <strong style={{ color: "#047857" }}>{qc.acceptedQty} pcs</strong> • Rejected: <strong style={{ color: "#dc2626" }}>{qc.rejectedQty} pcs</strong>
                    </div>

                    {qc.correctiveAction && qc.correctiveAction !== "NONE" && (
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#b45309" }}>
                        Action: <strong>{qc.correctiveAction}</strong> • {qc.issueDetails || qc.comments}
                      </div>
                    )}

                    <div style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: "4px" }}>
                      Inspector: <strong>{qc.checkedBy}</strong> • Ref: {qc.qcNo}
                    </div>
                  </div>
                </div>
              ))}

              {/* Reprints */}
              {reprints.map((rp, idx) => (
                <div key={rp.id || idx} className="qc-timeline-item">
                  <div className="qc-timeline-dot rework" />
                  <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "12px", color: "#b45309" }}>
                        <Printer size={12} style={{ display: "inline", marginRight: "4px" }} />
                        Reprint Request {rp.reprintNo} ({rp.status})
                      </span>
                      <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                        {new Date(rp.createdAt || rp.requestedAt).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#334155", marginTop: "4px" }}>
                      Qty: <strong>{rp.quantity} pcs</strong> • Stage: {rp.sourceStage} → Restart: {rp.restartFromOperationCode}
                    </div>
                    {rp.approvedBy && (
                      <div style={{ fontSize: "11px", color: "#166534", marginTop: "4px" }}>
                        Approved by <strong>{rp.approvedBy}</strong> on {new Date(rp.approvedAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Audit Logs */}
              {auditLogs.map((log, idx) => (
                <div key={idx} className="qc-timeline-item">
                  <div className="qc-timeline-dot" style={{ borderColor: "#64748b" }} />
                  <div style={{ fontSize: "11.5px", color: "#475569" }}>
                    <strong>{log.event}</strong> • {log.notes || log.description}
                    <span style={{ display: "block", fontSize: "10.5px", color: "#94a3b8" }}>
                      {log.actor} • {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="qc-modal-footer">
          <button type="button" onClick={onClose} className="qc-btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
