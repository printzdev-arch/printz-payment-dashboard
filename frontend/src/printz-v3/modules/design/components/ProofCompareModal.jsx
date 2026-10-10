import React from "react";
import { GitCompare, X, CheckCircle2, ArrowRight } from "lucide-react";

export default function ProofCompareModal({
  isOpen,
  onClose,
  proofs = []
}) {
  if (!isOpen) return null;

  const v1 = proofs.find((p) => p.version === 1) || proofs[0] || null;
  const v2 = proofs.find((p) => p.version === 2) || proofs[proofs.length - 1] || null;

  return (
    <div className="v3-modal-overlay">
      <div className="v3-modal-content" style={{ maxWidth: "960px", width: "95%" }}>
        {/* Header */}
        <div className="v3-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GitCompare size={20} color="#059669" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                Side-by-Side Proof Comparison (V1 vs V2)
              </h3>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Inspect revisions made based on customer feedback
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="v3-modal-close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* V1 Side */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "13px", fontWeight: 800, color: "#475569" }}>
                  Proof V1 (Original)
                </span>
                <span style={{ fontSize: "11px", backgroundColor: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                  Revision 1
                </span>
              </div>

              {/* V1 Preview */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", overflow: "hidden", height: "160px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img
                    src={v1?.frontUrl || "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80"}
                    alt="V1 Front"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#64748b", background: "#ffffff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <strong>Customer Feedback:</strong> "{v1?.customerFeedback || "Logo too small, add Tamil name."}"
              </div>
            </div>

            {/* V2 Side */}
            <div style={{ background: "#f0fdf4", border: "2px solid #10b981", borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "13px", fontWeight: 800, color: "#047857" }}>
                  Proof V2 (Current Revised)
                </span>
                <span style={{ fontSize: "11px", backgroundColor: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                  Active Current
                </span>
              </div>

              {/* V2 Preview */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                <div style={{ background: "#ffffff", border: "1px solid #86efac", borderRadius: "8px", overflow: "hidden", height: "160px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img
                    src={v2?.frontUrl || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80"}
                    alt="V2 Front"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#166534", background: "#ffffff", padding: "10px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                <strong>Designer Updates:</strong> "{v2?.comments || "Updated font to Montserrat, logo enlarged 20%, Tamil name added below English."}"
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="v3-modal-footer">
          <button type="button" onClick={onClose} className="v3-btn-secondary" style={{ fontSize: "13px" }}>
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
