import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";

export const EstimateReviewModal = ({ isOpen, onClose, estimate, onApprove }) => {
  const navigate = useNavigate();
  const [managerRemarks, setManagerRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const currentEstimate = estimate || {};
  const jobNo = currentEstimate.jobNo || currentEstimate.orderNumber || "N/A";
  const estimateNo = currentEstimate.estimateNo || "EST-PENDING";
  const customerName = currentEstimate.customerName || currentEstimate.customerId?.name || currentEstimate.customerSnapshot?.name || "Customer";
  const phone = currentEstimate.phone || currentEstimate.customerPhone || currentEstimate.customerSnapshot?.mobile || "-";
  const branch = currentEstimate.branchName || currentEstimate.branchId?.name || "Main Branch";
  const jobType = currentEstimate.jobType || "Print";
  const rawJob = currentEstimate.raw || currentEstimate;

  const isApproved = Boolean(
    currentEstimate.isApproved ||
    currentEstimate.status === "Approved" ||
    rawJob.estimationStatus === "APPROVED" ||
    ["DESIGN_QUEUE", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "PRODUCTION_PLANNING", "PRODUCTION", "QC", "DELIVERY", "COMPLETED"].includes(String(rawJob.currentStage || "").toUpperCase())
  );

  const specs = rawJob.specs || rawJob.specifications || currentEstimate.specs || rawJob.items?.[0]?.specifications || {};
  const defaultQty = Number(currentEstimate.quantity || rawJob.quantity || specs.quantity || 500);

  // Extract finishing services from all possible job order properties
  const finishingServicesList = (() => {
    if (Array.isArray(currentEstimate.finishingServices) && currentEstimate.finishingServices.length > 0) {
      return currentEstimate.finishingServices;
    }
    if (Array.isArray(rawJob.finishingServices) && rawJob.finishingServices.length > 0) {
      return rawJob.finishingServices;
    }
    const itemFinishing = rawJob.items?.[0]?.finishing || currentEstimate.items?.[0]?.finishing;
    if (Array.isArray(itemFinishing) && itemFinishing.length > 0) {
      return itemFinishing.map((f, i) => ({
        id: f.id || i + 1,
        name: f.name || f.option || f.code || "Finishing",
        config: f.notes || f.config || f.option || "Standard",
        unitPrice: Number(f.unitPrice || 0),
        quantity: Number(f.quantity || defaultQty),
        total: Number(f.total || (Number(f.quantity || defaultQty) * Number(f.unitPrice || 0))),
        unit: f.unit || "sheets",
      }));
    }
    return [];
  })();

  const finishingTotal = finishingServicesList.reduce(
    (sum, s) => sum + (Number(s.total) || (Number(s.quantity || 0) * Number(s.unitPrice || 0))),
    0
  );

  const rawItems = (Array.isArray(currentEstimate.items) && currentEstimate.items.length > 0)
    ? currentEstimate.items
    : (Array.isArray(rawJob.items) && rawJob.items.length > 0)
    ? rawJob.items
    : [];

  const defaultAmount = Number(currentEstimate.subtotal || rawJob.subtotal || currentEstimate.totalAmount || rawJob.totalAmount || rawJob.estimatedCost || 0);
  const defaultRate = defaultQty > 0 ? Math.round((defaultAmount / defaultQty) * 100) / 100 : 0;

  // Prepare full breakdown showing base print job + all finishing services
  const items = (() => {
    if (rawItems.length > 0) {
      return rawItems.map((it) => {
        const q = Number(it.qty || it.quantity || defaultQty || 1);
        const r = Number(it.rate || it.unitRate || it.unitPrice || (defaultAmount > 0 && q > 0 ? defaultAmount / q : defaultRate));
        const a = Number(it.amount || it.totalPrice || (q * r));
        return {
          name: it.itemName || it.name || it.item || rawJob.title || rawJob.jobTitle || "Print Job Order",
          spec: it.description || it.spec || it.specification || specs.paperType || "Standard Print Specifications",
          qty: q,
          unit: it.unit || "PCS",
          rate: r,
          amount: a,
        };
        
      });
    }

    const baseRate = Number(specs.unitPrice || defaultRate || 0);
    const baseAmount = Math.round(defaultQty * baseRate * 100) / 100;
    const baseItem = {
      name: rawJob.title || rawJob.jobTitle || currentEstimate.title || "Print Job Order",
      spec: `${specs.paperType || "Standard Paper"} ${specs.paperGsm || ""} (${specs.size || "Standard"})`.trim(),
      qty: defaultQty,
      unit: "PCS",
      rate: baseRate,
      amount: baseAmount,
    };

    const finishingItems = finishingServicesList.map((svc) => ({
      name: `Finishing: ${svc.name}`,
      spec: `${svc.config || "Standard"} (${svc.quantity || defaultQty} ${svc.unit || "sheets"})`,
      qty: Number(svc.quantity || defaultQty),
      unit: (svc.unit || "PCS").toUpperCase(),
      rate: Number(svc.unitPrice || 0),
      amount: Number(svc.total || (Number(svc.quantity || defaultQty) * Number(svc.unitPrice || 0))),
    }));

    return [baseItem, ...finishingItems];
  })();

  const subtotal = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const taxRate = 0;
  const rawTax = 0;
  const calculatedTax = 0;
  const grandTotal = subtotal;
  const finalTax = 0;

  // Sync remarks when estimate opens
  React.useEffect(() => {
    if (estimate) {
      setManagerRemarks("");
    }
  }, [estimate, isOpen]);

  const total = grandTotal;

  const handleApprove = async () => {
    setLoading(true);
    try {
      localStorage.removeItem("printz_active_job_id");
      await onApprove(estimate._id || estimate.id, {
        remarks: managerRemarks,
        items: items.map((it) => ({
          itemName: it.name,
          description: it.spec || "",
          quantity: it.qty,
          unit: it.unit,
          unitRate: it.rate,
          unitPrice: it.rate,
          amount: it.amount,
        })),
        subtotal,
        discountAmount: Number(currentEstimate.discountAmount || rawJob.discountAmount || 0),
        discountPercent: Number(currentEstimate.discountPercent || rawJob.discountPercent || 0),
        taxRate,
        taxAmount: finalTax,
        grandTotal,
      });
      toast.success("Estimate approved! Redirecting to create Invoice & record advance payment...");
      onClose();
      navigate(`/jobflow/invoice?jobId=${estimate._id || estimate.id || ""}`);
    } catch (err) {
      if (
        err.response?.status === 409 ||
        err.response?.data?.message?.includes("No pending estimate approval") ||
        err.message?.includes("No pending estimate approval")
      ) {
        localStorage.removeItem("printz_active_job_id");
        toast.info("Estimate already approved. Opening Invoicing...");
        onClose();
        navigate(`/jobflow/invoice?jobId=${estimate._id || estimate.id || ""}`);
      } else {
        toast.error(err.response?.data?.message || "Failed to approve estimate");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !estimate) return null;

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-lg">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 className="jf-modal-title" style={{ margin: 0 }}>
                  Review Estimate: {estimateNo}
                </h2>
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
                <div><span style={{ color: "#475569" }}>Job No:</span> <strong>{jobNo}</strong></div>
                <div><span style={{ color: "#475569" }}>Estimate No:</span> <strong>{estimateNo}</strong></div>
                <div><span style={{ color: "#475569" }}>Customer:</span> <strong>{customerName}</strong></div>
                <div><span style={{ color: "#475569" }}>Phone:</span> {phone}</div>
                <div><span style={{ color: "#475569" }}>Job Type:</span> {jobType}</div>
                <div><span style={{ color: "#475569" }}>Branch:</span> {branch}</div>
              </div>
            </div>

            <div className="jf-card" style={{ marginBottom: 0, padding: "1rem" }}>
              <h3 className="jf-card-title" style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                Remarks & Notes
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "#475569", margin: "0 0 0.5rem 0" }}>
                <strong>Staff Remarks:</strong> {estimate.staffRemarks || "Please review and approve the negotiated pricing."}
              </p>
              {!isApproved ? (
                <div className="jf-form-group">
                  <label className="jf-label">Manager Remarks (Optional)</label>
                  <textarea
                    className="jf-textarea"
                    style={{ minHeight: "60px" }}
                    placeholder="Enter approval notes or remarks..."
                    value={managerRemarks}
                    onChange={(e) => setManagerRemarks(e.target.value)}
                  />
                </div>
              ) : (
                (rawJob.remarks || estimate.managerRemarks) && (
                  <p style={{ fontSize: "0.8125rem", color: "#166534", margin: "0.5rem 0 0 0", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 10px", borderRadius: "4px" }}>
                    <strong>Approval Notes:</strong> {rawJob.remarks || estimate.managerRemarks}
                  </p>
                )
              )}
            </div>
          </div>

          {/* Job Order Specifications & Finishing Requirements */}
          <div className="jf-card" style={{ marginBottom: "1.25rem", padding: "1rem", border: "1px solid #cbd5e1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 className="jf-card-title" style={{ fontSize: "0.95rem", margin: 0 }}>
                Job Order Requirements & Finishing Services
              </h3>
              <span className="jf-badge jf-badge-green" style={{ fontSize: "0.75rem" }}>
                {finishingServicesList.length} Finishing Service(s) Required
              </span>
            </div>

            {/* Print Specifications Summary Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "0.5rem", background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--jf-border)", marginBottom: "0.875rem", fontSize: "0.75rem" }}>
              <div><span style={{ color: "#475569" }}>Product:</span> <strong>{specs.productType || rawJob.productType || "Business Cards"}</strong></div>
              <div><span style={{ color: "#475569" }}>Paper:</span> <strong>{specs.paperType || "Art Card"} {specs.paperGsm || "260 gsm"}</strong></div>
              <div><span style={{ color: "#475569" }}>Size:</span> <strong>{specs.size || "90 x 54 mm"}</strong></div>
              <div><span style={{ color: "#475569" }}>Color & Sides:</span> <strong>{specs.color || "Full Color"} ({specs.printingSide || "Double Sided"})</strong></div>
            </div>

            {/* Finishing Services Table */}
            <div className="jf-table-wrap" style={{ overflowX: "auto" }}>
              <table className="jf-table">
                <thead>
                  <tr>
                    <th style={{ width: "30px", padding: "0.5rem" }}>#</th>
                    <th style={{ padding: "0.5rem" }}>Finishing Service</th>
                    <th style={{ padding: "0.5rem" }}>Configuration / Requirement</th>
                    <th style={{ padding: "0.5rem" }}>Quantity</th>
                    <th style={{ padding: "0.5rem" }}>Unit Rate</th>
                    <th style={{ padding: "0.5rem", textAlign: "right" }}>Total (RM)</th>
                  </tr>
                </thead>
                <tbody>
                  {finishingServicesList.map((svc, idx) => (
                    <tr key={svc.id || idx}>
                      <td style={{ padding: "0.45rem 0.5rem" }}>{idx + 1}</td>
                      <td style={{ padding: "0.45rem 0.5rem" }}>
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>{svc.name}</span>
                      </td>
                      <td style={{ padding: "0.45rem 0.5rem" }}>
                        <span style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 500 }}>
                          {svc.config || svc.notes || "Standard"}
                        </span>
                      </td>
                      <td style={{ padding: "0.45rem 0.5rem" }}>{svc.quantity} {svc.unit || "sheets"}</td>
                      <td style={{ padding: "0.45rem 0.5rem" }}>RM {Number(svc.unitPrice || 0).toFixed(2)}</td>
                      <td style={{ padding: "0.45rem 0.5rem", textAlign: "right" }}>
                        <strong>RM {Number(svc.total || (Number(svc.quantity) * Number(svc.unitPrice || 0))).toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))}
                  {finishingServicesList.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "#475569", padding: "1rem" }}>
                        No special finishing services required for this job order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", background: "#f0fdf4", padding: "0.6rem 0.875rem", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
              <span style={{ fontSize: "0.8125rem", color: "#166534", fontWeight: 600 }}>Estimated Finishing Total Requirement:</span>
              <strong style={{ fontSize: "0.95rem", color: "#15803d" }}>RM {finishingTotal.toFixed(2)}</strong>
            </div>
          </div>

          {/* Items Table */}
          <div className="jf-card" style={{ marginBottom: "1.25rem", padding: "1rem" }}>
            <h3 className="jf-card-title" style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>
              Commercial Estimate Breakdown
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
                    <td style={{ fontSize: "0.8125rem", color: "#475569" }}>{it.spec}</td>
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
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
            <div
              style={{
                width: "360px",
                background: "#f8fafc",
                padding: "1.125rem",
                borderRadius: "8px",
                border: "1px solid var(--jf-border)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "#475569", marginBottom: "0.4rem" }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>RM {subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", color: "var(--jf-primary)", fontWeight: 700, borderTop: "1px dashed var(--jf-border)", paddingTop: "0.5rem" }}>
                <span>Grand Total:</span>
                <span>RM {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="jf-modal-footer">
          {isApproved ? (
            <button
              type="button"
              className="jf-btn jf-btn-secondary"
              onClick={onClose}
              style={{ minWidth: "100px" }}
            >
              Close
            </button>
          ) : (
            <>
              <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
                Back
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
          )}
        </div>
      </div>
    </div>
  );
};

export default EstimateReviewModal;
