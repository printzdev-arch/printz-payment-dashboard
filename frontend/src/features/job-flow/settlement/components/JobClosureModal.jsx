import React, { useState, useEffect } from "react";
import { X, Lock, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import settlementApi from "../api/settlementApi";
import StatusBadge from "../../shared/components/StatusBadge";

export const JobClosureModal = ({ isOpen, onClose, jobId, onClosed }) => {
  const [loading, setLoading] = useState(false);
  const [closureData, setClosureData] = useState(null);
  const [remarks, setRemarks] = useState("Goods delivered, payment settled in full. Job closed.");

  useEffect(() => {
    if (jobId && isOpen) {
      loadClosureEligibility();
    }
  }, [jobId, isOpen]);

  const loadClosureEligibility = async () => {
    setLoading(true);
    try {
      const res = await settlementApi.getJobClosureDetails(jobId);
      const data = res?.data || res;
      setClosureData(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load job closure eligibility");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseJob = async () => {
    if (!closureData?.canClose) {
      toast.error("Prerequisites not satisfied! All 3 conditions must be fulfilled to close the job.");
      return;
    }

    setLoading(true);
    try {
      const res = await settlementApi.closeJobOrder(jobId, { remarks });
      const closedResult = res?.data || res;
      toast.success(`Job ${closureData?.jobNo || ""} closed and permanently locked! (CLOSED 🔒)`);
      if (onClosed) onClosed(closedResult);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to close job order");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isDeliveryComplete = Boolean(closureData?.isDeliveryComplete);
  const isInvoicesSettled = Boolean(closureData?.isInvoicesSettled || Number(closureData?.totalBalance || 0) === 0);
  const pendingReprintCount = Number(closureData?.pendingReprintCount || 0);
  const noPendingReprints = pendingReprintCount === 0;
  const canClose = Boolean(closureData?.canClose && isDeliveryComplete && isInvoicesSettled && noPendingReprints);
  const isAlreadyClosed = closureData?.closureStatus === "CLOSED";

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-md">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Lock size={20} style={{ color: "#1e293b" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 className="jf-modal-title">Administrative Job Closure & Lock</h2>
                <StatusBadge status={closureData?.closureStatus || "OPEN"} domain="closure" />
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Job No: <strong>{closureData?.jobNo || "JOB-CURRENT"}</strong>
              </div>
            </div>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <div className="jf-modal-body">
          <p style={{ fontSize: "0.875rem", color: "#475569", marginTop: 0, marginBottom: "1rem" }}>
            Permanent job closure permanently locks this order from further financial or production modifications. All 3 prerequisites below must pass.
          </p>

          {/* 3 Prerequisites Checkmarks */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {/* 1. Physical Delivery */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: isDeliveryComplete ? "#f0fdf4" : "#fff1f2",
              border: `1px solid ${isDeliveryComplete ? "#86efac" : "#fecdd3"}`
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                {isDeliveryComplete ? (
                  <CheckCircle2 size={20} style={{ color: "#15803d" }} />
                ) : (
                  <XCircle size={20} style={{ color: "#dc2626" }} />
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: isDeliveryComplete ? "#166534" : "#991b1b" }}>
                    1. Physical Delivery Delivered
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {isDeliveryComplete ? "Handover completed & POD verified" : "Delivery is still pending or out in transit"}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isDeliveryComplete ? "#15803d" : "#dc2626" }}>
                {isDeliveryComplete ? "PASS" : "PENDING"}
              </span>
            </div>

            {/* 2. Invoices Fully Paid */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: isInvoicesSettled ? "#f0fdf4" : "#fff1f2",
              border: `1px solid ${isInvoicesSettled ? "#86efac" : "#fecdd3"}`
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                {isInvoicesSettled ? (
                  <CheckCircle2 size={20} style={{ color: "#15803d" }} />
                ) : (
                  <XCircle size={20} style={{ color: "#dc2626" }} />
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: isInvoicesSettled ? "#166534" : "#991b1b" }}>
                    2. Invoices Fully Settled (Balance = ₹0.00)
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Total Invoiced: ₹{Number(closureData?.totalInvoiced || 0).toFixed(2)} • Balance: ₹{Number(closureData?.totalBalance || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isInvoicesSettled ? "#15803d" : "#dc2626" }}>
                {isInvoicesSettled ? "PASS" : "DUE"}
              </span>
            </div>

            {/* 3. No Unresolved Rework / Reprints */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: noPendingReprints ? "#f0fdf4" : "#fff1f2",
              border: `1px solid ${noPendingReprints ? "#86efac" : "#fecdd3"}`
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                {noPendingReprints ? (
                  <CheckCircle2 size={20} style={{ color: "#15803d" }} />
                ) : (
                  <XCircle size={20} style={{ color: "#dc2626" }} />
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: noPendingReprints ? "#166534" : "#991b1b" }}>
                    3. No Unresolved Rework / Reprints
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Pending reprint requests: {pendingReprintCount}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: noPendingReprints ? "#15803d" : "#dc2626" }}>
                {noPendingReprints ? "PASS" : "ACTIVE"}
              </span>
            </div>
          </div>

          {/* Remarks */}
          <div className="jf-form-group">
            <label className="jf-label">Closure Remarks</label>
            <textarea
              className="jf-textarea"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isAlreadyClosed}
            />
          </div>
        </div>

        <div className="jf-modal-footer">
          <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="jf-btn jf-btn-primary"
            onClick={handleCloseJob}
            disabled={loading || !canClose || isAlreadyClosed}
            title={!canClose ? "Disabled: All 3 prerequisites must be satisfied first" : "Close and permanently lock this job order"}
            style={{
              background: canClose && !isAlreadyClosed ? "#0f172a" : "#94a3b8",
              borderColor: canClose && !isAlreadyClosed ? "#0f172a" : "#94a3b8",
              cursor: canClose && !isAlreadyClosed ? "pointer" : "not-allowed"
            }}
          >
            {isAlreadyClosed ? "Job Already Closed 🔒" : loading ? "Locking..." : "Close & Lock Job Order 🔒"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobClosureModal;
