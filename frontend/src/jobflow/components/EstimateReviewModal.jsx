import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, CheckCircle, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";

export const EstimateReviewModal = ({ isOpen, onClose, estimate, onApprove, onReject }) => {
  const navigate = useNavigate();
  const [managerRemarks, setManagerRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !estimate) return null;

  const jobNo = estimate.jobNo || estimate.orderNumber || "N/A";
  const estimateNo = estimate.estimateNo || "EST-PENDING";
  const customerName = estimate.customerName || estimate.customerId?.name || estimate.customerSnapshot?.name || "Customer";
  const phone = estimate.phone || estimate.customerPhone || estimate.customerSnapshot?.mobile || "-";
  const branch = estimate.branchName || estimate.branchId?.name || "Main Branch";
  const jobType = estimate.jobType || "Print";
  const rawJob = estimate.raw || estimate;
  const isApproved = Boolean(
    estimate.isApproved ||
    estimate.status === "Approved" ||
    rawJob.estimationStatus === "APPROVED" ||
    ["DESIGN_QUEUE", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "REVISION", "PRODUCTION_PLANNING", "PRODUCTION", "QC", "DELIVERY", "COMPLETED"].includes(String(rawJob.currentStage || "").toUpperCase())
  );
  const rawItems = (Array.isArray(estimate.items) && estimate.items.length > 0)
    ? estimate.items
    : (Array.isArray(rawJob.items) && rawJob.items.length > 0)
    ? rawJob.items
    : [];

  const defaultQty = Number(estimate.quantity || rawJob.quantity || rawJob.specs?.quantity || 500);
  const defaultAmount = Number(estimate.subtotal || rawJob.subtotal || estimate.totalAmount || rawJob.totalAmount || rawJob.estimatedCost || 250);
  const defaultRate = Math.round((defaultAmount / defaultQty) * 100) / 100;

  const items = rawItems.length > 0
    ? rawItems.map((it) => {
        const q = Number(it.qty || it.quantity || defaultQty);
        const a = Number(it.amount || it.totalPrice || (q * Number(it.rate || it.unitRate || it.unitPrice || defaultRate)));
        const r = Number(it.rate || it.unitRate || it.unitPrice || (q > 0 ? a / q : defaultRate));
        return {
          name: it.itemName || it.name || it.item || rawJob.title || rawJob.jobTitle || "Print Job Order",
          spec: it.description || it.spec || it.specification || rawJob.specs?.paperType || "Standard Print Specifications",
          qty: q,
          unit: it.unit || "PCS",
          rate: r,
          amount: a,
        };
      })
    : [
        {
          name: rawJob.title || rawJob.jobTitle || estimate.title || "Print Job Order",
          spec: rawJob.specs?.paperType || "Standard Print Specifications",
          qty: defaultQty,
          unit: "PCS",
          rate: defaultRate,
          amount: defaultAmount,
        },
      ];

  const subtotal = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const handleApprove = async () => {
    setLoading(true);
    try {
      localStorage.removeItem("printz_active_job_id");
      await onApprove(estimate._id || estimate.id, managerRemarks);
      toast.success("Estimate approved! Job sent to Manager Design Queue for assignment.");
      onClose();
      navigate(`/jobflow/design?view=queue&jobId=${estimate._id || estimate.id || ""}`);
    } catch (err) {
      if (
        err.response?.status === 409 ||
        err.response?.data?.message?.includes("No pending estimate approval") ||
        err.message?.includes("No pending estimate approval")
      ) {
        localStorage.removeItem("printz_active_job_id");
        toast.info("Estimate already approved. Opening Manager Design Queue...");
        onClose();
        navigate(`/jobflow/design?view=queue&jobId=${estimate._id || estimate.id || ""}`);
      } else {
        toast.error(err.response?.data?.message || "Failed to approve estimate");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReturnRevision = async () => {
    if (!managerRemarks.trim()) {
      toast.error("Manager remarks are required when returning an estimate for revision.");
      return;
    }
    setLoading(true);
    try {
      await onReject(estimate._id || estimate.id, managerRemarks.trim());
      toast.info("Estimate returned for revision with remarks.");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to return estimate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-lg">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 className="jf-modal-title" style={{ margin: 0 }}>Review Estimate: {estimateNo}</h2>
                {isApproved ? (
                  <span className="jf-badge jf-badge-green">
                    <CheckCircle size={12} /> Approved
                  </span>
                ) : (
                  <span className="jf-badge jf-badge-amber">Pending Approval</span>
                )}
              </div>
              <p className="jf-header-subtitle" style={{ margin: "0.2rem 0 0 0" }}>
                Job Ref: {jobNo} • Customer: {customerName}
              </p>
            </div>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="jf-modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {/* Top Info Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
            <div className="jf-card" style={{ marginBottom: 0, padding: "1rem" }}>
              <h3 className="jf-card-title" style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                Job & Customer Information
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8125rem" }}>
                <div><span style={{ color: "#64748b" }}>Job No:</span> <strong>{jobNo}</strong></div>
                <div><span style={{ color: "#64748b" }}>Estimate No:</span> <strong>{estimateNo}</strong></div>
                <div><span style={{ color: "#64748b" }}>Customer:</span> <strong>{customerName}</strong></div>
                <div><span style={{ color: "#64748b" }}>Phone:</span> {phone}</div>
                <div><span style={{ color: "#64748b" }}>Job Type:</span> {jobType}</div>
                <div><span style={{ color: "#64748b" }}>Branch:</span> {branch}</div>
              </div>
            </div>

            <div className="jf-card" style={{ marginBottom: 0, padding: "1rem" }}>
              <h3 className="jf-card-title" style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                Remarks & Commercial Notes
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: "0 0 0.5rem 0" }}>
                <strong>Staff Remarks:</strong> {estimate.staffRemarks || "Please review and approve the negotiated pricing."}
              </p>
              <div className="jf-form-group">
                <label className="jf-label">Manager Remarks (Required for Revision)</label>
                <textarea
                  className="jf-textarea"
                  style={{ minHeight: "60px" }}
                  placeholder="Enter revision instructions or approval notes..."
                  value={managerRemarks}
                  onChange={(e) => setManagerRemarks(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="jf-card" style={{ marginBottom: "1.25rem", padding: "1rem" }}>
            <h3 className="jf-card-title" style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>
              Estimate Items
            </h3>
            <table className="jf-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item / Service</th>
                  <th>Specification</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Rate (RM)</th>
                  <th>Amount (RM)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td><strong>{it.name}</strong></td>
                    <td style={{ fontSize: "0.8125rem", color: "#64748b" }}>{it.spec}</td>
                    <td>{it.qty}</td>
                    <td>{it.unit}</td>
                    <td>RM {Number(it.rate || 0).toFixed(2)}</td>
                    <td><strong>RM {Number(it.amount || 0).toFixed(2)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cost Summary Box */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: "320px", background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid var(--jf-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.875rem" }}>
                <span style={{ color: "#64748b" }}>Subtotal:</span>
                <strong>RM {subtotal.toFixed(2)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.875rem" }}>
                <span style={{ color: "#64748b" }}>Tax (8% SST):</span>
                <span>RM {tax.toFixed(2)}</span>
              </div>
              <div style={{ height: "1px", background: "#e2e8f0", margin: "0.5rem 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.125rem", color: "var(--jf-primary)", fontWeight: 700 }}>
                <span>Total Estimate:</span>
                <span>RM {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="jf-modal-footer">
          <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
            {isApproved ? "Close" : "Back"}
          </button>
          {!isApproved ? (
            <>
              <button
                type="button"
                className="jf-btn jf-btn-danger-outline"
                onClick={handleReturnRevision}
                disabled={loading}
              >
                <RotateCcw size={16} /> Return for Revision
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={handleApprove}
                disabled={loading}
              >
                <CheckCircle size={16} /> Approve Estimate
              </button>
            </>
          ) : (
            <button
              type="button"
              className="jf-btn jf-btn-primary"
              onClick={() => {
                onClose();
                navigate(`/jobflow/design?view=queue&jobId=${estimate._id || estimate.id || ""}`);
              }}
            >
              Go to Design Queue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstimateReviewModal;
