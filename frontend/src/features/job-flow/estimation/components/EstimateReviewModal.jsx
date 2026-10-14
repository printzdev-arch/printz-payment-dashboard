import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, CheckCircle, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";

export const EstimateReviewModal = ({ isOpen, onClose, estimate, onApprove, onReject }) => {
  const navigate = useNavigate();
  const [managerRemarks, setManagerRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [gstSelection, setGstSelection] = useState("8");
  const [customGst, setCustomGst] = useState("");

  const currentEstimate = estimate || {};
  const jobNo = currentEstimate.jobNo || currentEstimate.orderNumber || "N/A";
  const estimateNo = currentEstimate.estimateNo || "EST-PENDING";
  const customerName = currentEstimate.customerName || currentEstimate.customerId?.name || currentEstimate.customerSnapshot?.name || "Customer";
  const phone = currentEstimate.phone || currentEstimate.customerPhone || currentEstimate.customerSnapshot?.mobile || "-";
  const branch = currentEstimate.branchName || currentEstimate.branchId?.name || "Main Branch";
  const jobType = currentEstimate.jobType || "Print";
  const rawJob = currentEstimate.raw || currentEstimate;
  const isRevision = Boolean(
    currentEstimate.status === "Revision" ||
    currentEstimate.status === "REVISION" ||
    currentEstimate.status === "Rejected" ||
    currentEstimate.status === "REJECTED" ||
    rawJob.estimationStatus === "REJECTED" ||
    rawJob.estimationStatus === "REVISION" ||
    rawJob.currentStage === "REVISION"
  );

  const isApproved = !isRevision && Boolean(
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
        unitPrice: Number(f.unitPrice || 0.50),
        quantity: Number(f.quantity || defaultQty),
        total: Number(f.total || (Number(f.quantity || defaultQty) * Number(f.unitPrice || 0.50))),
        unit: f.unit || "sheets",
      }));
    }
    const derived = [];
    if (specs.lamination && specs.lamination !== "None") {
      derived.push({
        id: 1,
        name: "Lamination",
        config: specs.lamination,
        unitPrice: 0.50,
        quantity: defaultQty,
        total: Math.round(defaultQty * 0.50 * 100) / 100,
        unit: "sheets",
      });
    }
    if (specs.finishing && specs.finishing !== "None") {
      derived.push({
        id: 2,
        name: specs.finishing,
        config: "Standard",
        unitPrice: 0.25,
        quantity: defaultQty,
        total: Math.round(defaultQty * 0.25 * 100) / 100,
        unit: "sheets",
      });
    }
    if (derived.length > 0) return derived;
    return [
      { id: 1, name: "Lamination", config: "Matte", unitPrice: 0.50, quantity: defaultQty, total: defaultQty * 0.50, unit: "sheets" },
      { id: 2, name: "Cutting", config: "Trim to 90 x 54 mm", unitPrice: 0.10, quantity: defaultQty, total: defaultQty * 0.10, unit: "sheets" },
      { id: 3, name: "Packing", config: "Shrink Wrap", unitPrice: 0.20, quantity: 5, total: 1.00, unit: "packs" },
    ];
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

  const defaultAmount = Number(currentEstimate.subtotal || rawJob.subtotal || currentEstimate.totalAmount || rawJob.totalAmount || rawJob.estimatedCost || 250);
  const defaultRate = Math.round((defaultAmount / defaultQty) * 100) / 100;

  // Prepare full breakdown showing base print job + all finishing services
  const items = (() => {
    if (rawItems.length > 1) {
      return rawItems.map((it) => {
        const q = Number(it.qty || it.quantity || defaultQty);
        const a = Number(it.amount || it.totalPrice || (q * Number(it.rate || it.unitRate || it.unitPrice || defaultRate)));
        const r = Number(it.rate || it.unitRate || it.unitPrice || (q > 0 ? a / q : defaultRate));
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

    const baseRate = 0.40;
    const baseAmount = Math.round(defaultQty * baseRate * 100) / 100;
    const baseItem = {
      name: rawJob.title || rawJob.jobTitle || estimate.title || "Business Cards - Base Printing",
      spec: `${specs.paperType || "Art Card"} ${specs.paperGsm || "260 gsm"} (${specs.size || "90 x 54 mm"})`,
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

  // Sync pricing values when estimate opens
  React.useEffect(() => {
    if (estimate) {
      setManagerRemarks("");
      const initialDiscountAmt = Number(rawJob.discountAmount || estimate.discountAmount || 0);
      const initialDiscountPct = Number(rawJob.discountPercent || estimate.discountPercent || 0);
      const initialTaxRate = rawJob.taxRate !== undefined ? Number(rawJob.taxRate) : (estimate.taxRate !== undefined ? Number(estimate.taxRate) : 8);

      if (initialDiscountAmt > 0 && subtotal > 0) {
        setDiscountAmount(initialDiscountAmt);
        setDiscountPercent(Math.round(((initialDiscountAmt / subtotal) * 100) * 100) / 100);
      } else if (initialDiscountPct > 0 && subtotal > 0) {
        setDiscountPercent(initialDiscountPct);
        setDiscountAmount(Math.round(((subtotal * initialDiscountPct) / 100) * 100) / 100);
      } else {
        setDiscountPercent("");
        setDiscountAmount("");
      }

      const standardGstOptions = ["0", "5", "6", "8", "12", "18"];
      if (standardGstOptions.includes(String(initialTaxRate))) {
        setGstSelection(String(initialTaxRate));
        setCustomGst("");
      } else {
        setGstSelection("custom");
        setCustomGst(String(initialTaxRate));
      }
    }
  }, [estimate, isOpen, subtotal]);

  // Synchronized discount handlers
  const handleDiscountPercentChange = (val) => {
    if (val === "") {
      setDiscountPercent("");
      setDiscountAmount("");
      return;
    }
    const p = parseFloat(val);
    if (isNaN(p) || p < 0) {
      setDiscountPercent(0);
      setDiscountAmount(0);
      return;
    }
    const clampedP = Math.min(100, p);
    setDiscountPercent(clampedP);
    const amt = Math.round(((subtotal * clampedP) / 100) * 100) / 100;
    setDiscountAmount(amt);
  };

  const handleDiscountAmountChange = (val) => {
    if (val === "") {
      setDiscountAmount("");
      setDiscountPercent("");
      return;
    }
    const a = parseFloat(val);
    if (isNaN(a) || a < 0) {
      setDiscountAmount(0);
      setDiscountPercent(0);
      return;
    }
    const clampedA = Math.min(subtotal, a);
    setDiscountAmount(clampedA);
    const pct = subtotal > 0 ? Math.round(((clampedA / subtotal) * 100) * 100) / 100 : 0;
    setDiscountPercent(pct);
  };

  const effectiveGstRate = gstSelection === "custom"
    ? Math.max(0, parseFloat(customGst) || 0)
    : Math.max(0, parseFloat(gstSelection) || 0);

  const numDiscountAmount = Math.min(subtotal, Math.max(0, parseFloat(discountAmount) || 0));
  const numDiscountPercent = Math.min(100, Math.max(0, parseFloat(discountPercent) || 0));
  const netTaxableAmount = Math.max(0, Math.round((subtotal - numDiscountAmount) * 100) / 100);
  const tax = Math.round((netTaxableAmount * (effectiveGstRate / 100)) * 100) / 100;
  const total = Math.round((netTaxableAmount + tax) * 100) / 100;

  const handleApprove = async () => {
    setLoading(true);
    try {
      localStorage.removeItem("printz_active_job_id");
      await onApprove(estimate._id || estimate.id, {
        remarks: managerRemarks,
        subtotal,
        discountAmount: numDiscountAmount,
        discountPercent: numDiscountPercent,
        taxRate: effectiveGstRate,
        taxAmount: tax,
        grandTotal: total,
      });
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

  if (!isOpen || !estimate) return null;

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
                ) : isRevision ? (
                  <span className="jf-badge jf-badge-red">
                    <RotateCcw size={12} /> Revision
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
              {isRevision && rawJob.rejectionReason && (
                <p style={{ fontSize: "0.8125rem", color: "#b91c1c", margin: "0 0 0.5rem 0", background: "#fef2f2", border: "1px solid #fecaca", padding: "4px 8px", borderRadius: "4px" }}>
                  <strong>Revision Reason:</strong> {rawJob.rejectionReason}
                </p>
              )}
              <div className="jf-form-group">
                <label className="jf-label">{isRevision ? "Manager Approval Notes" : "Manager Remarks (Required for Revision)"}</label>
                <textarea
                  className="jf-textarea"
                  style={{ minHeight: "60px" }}
                  placeholder={isRevision ? "Enter approval notes..." : "Enter revision instructions or approval notes..."}
                  value={managerRemarks}
                  onChange={(e) => setManagerRemarks(e.target.value)}
                />
              </div>
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
              <div><span style={{ color: "#64748b" }}>Product:</span> <strong>{specs.productType || rawJob.productType || "Business Cards"}</strong></div>
              <div><span style={{ color: "#64748b" }}>Paper:</span> <strong>{specs.paperType || "Art Card"} {specs.paperGsm || "260 gsm"}</strong></div>
              <div><span style={{ color: "#64748b" }}>Size:</span> <strong>{specs.size || "90 x 54 mm"}</strong></div>
              <div><span style={{ color: "#64748b" }}>Color & Sides:</span> <strong>{specs.color || "Full Color"} ({specs.printingSide || "Double Sided"})</strong></div>
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
                      <td colSpan={6} style={{ textAlign: "center", color: "#94a3b8", padding: "1rem" }}>
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

          {/* Pricing Adjustments Card: Discount (% & RM) and GST Selection */}
          <div
            className="jf-card"
            style={{
              marginBottom: "1.25rem",
              padding: "1rem 1.25rem",
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
              <h3 className="jf-card-title" style={{ fontSize: "0.95rem", margin: 0, fontWeight: 600 }}>
                Approval Pricing, Discount & GST Settings
              </h3>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Adjust commercial discount and tax before approving
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", alignItems: "start" }}>
              {/* Discount Percentage */}
              <div className="jf-form-group" style={{ marginBottom: 0 }}>
                <label className="jf-label" style={{ fontWeight: 600, fontSize: "0.8125rem", display: "flex", justifyContent: "space-between" }}>
                  <span>Discount (%)</span>
                  {numDiscountPercent > 0 && (
                    <span style={{ color: "#16a34a", fontWeight: 700 }}>{numDiscountPercent}%</span>
                  )}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="jf-input"
                    placeholder="0.0"
                    disabled={isApproved}
                    value={discountPercent}
                    onChange={(e) => handleDiscountPercentChange(e.target.value)}
                    style={{ paddingRight: "2rem" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      fontWeight: 600,
                      pointerEvents: "none",
                    }}
                  >
                    %
                  </span>
                </div>
                <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "3px", display: "block" }}>
                  Auto-calculates RM amount
                </span>
              </div>

              {/* Discount Amount */}
              <div className="jf-form-group" style={{ marginBottom: 0 }}>
                <label className="jf-label" style={{ fontWeight: 600, fontSize: "0.8125rem", display: "flex", justifyContent: "space-between" }}>
                  <span>Discount Amount (RM)</span>
                  {numDiscountAmount > 0 && (
                    <span style={{ color: "#16a34a", fontWeight: 700 }}>-RM {numDiscountAmount.toFixed(2)}</span>
                  )}
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      fontWeight: 600,
                      pointerEvents: "none",
                    }}
                  >
                    RM
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    step="0.01"
                    className="jf-input"
                    placeholder="0.00"
                    disabled={isApproved}
                    value={discountAmount}
                    onChange={(e) => handleDiscountAmountChange(e.target.value)}
                    style={{ paddingLeft: "2.2rem" }}
                  />
                </div>
                <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "3px", display: "block" }}>
                  Auto-calculates percentage
                </span>
              </div>

              {/* GST / Tax Selection */}
              <div className="jf-form-group" style={{ marginBottom: 0 }}>
                <label className="jf-label" style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                  GST / Tax Selection
                </label>
                <select
                  className="jf-input"
                  disabled={isApproved}
                  value={gstSelection}
                  onChange={(e) => {
                    setGstSelection(e.target.value);
                    if (e.target.value !== "custom") setCustomGst("");
                  }}
                  style={{ cursor: isApproved ? "not-allowed" : "pointer" }}
                >
                  <option value="0">0% - Tax Exempt / Zero Rated</option>
                  <option value="5">5% - GST</option>
                  <option value="6">6% - Standard GST</option>
                  <option value="8">8% - Standard SST / GST</option>
                  <option value="12">12% - Standard GST</option>
                  <option value="18">18% - GST</option>
                  <option value="custom">Custom Tax Rate...</option>
                </select>
                {gstSelection === "custom" && (
                  <div style={{ position: "relative", marginTop: "0.5rem" }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="jf-input"
                      placeholder="Custom GST %"
                      disabled={isApproved}
                      value={customGst}
                      onChange={(e) => setCustomGst(e.target.value)}
                      style={{ paddingRight: "2rem" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                        fontWeight: 600,
                        pointerEvents: "none",
                      }}
                    >
                      %
                    </span>
                  </div>
                )}
                <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "3px", display: "block" }}>
                  Applied rate: <strong>{effectiveGstRate}%</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Cost Summary Box */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.875rem" }}>
                <span style={{ color: "#64748b" }}>Subtotal:</span>
                <strong>RM {subtotal.toFixed(2)}</strong>
              </div>

              {numDiscountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.875rem", color: "#16a34a" }}>
                  <span>Discount ({numDiscountPercent.toFixed(1)}%):</span>
                  <strong>- RM {numDiscountAmount.toFixed(2)}</strong>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.875rem" }}>
                <span style={{ color: "#64748b" }}>Net Taxable Subtotal:</span>
                <span>RM {netTaxableAmount.toFixed(2)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.875rem" }}>
                <span style={{ color: "#64748b" }}>GST / SST ({effectiveGstRate}%):</span>
                <span>RM {tax.toFixed(2)}</span>
              </div>

              <div style={{ height: "1px", background: "#cbd5e1", margin: "0.6rem 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", color: "var(--jf-primary)", fontWeight: 700 }}>
                <span>Grand Total:</span>
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
              {!isRevision && (
                <button
                  type="button"
                  className="jf-btn jf-btn-danger-outline"
                  onClick={handleReturnRevision}
                  disabled={loading}
                >
                  <RotateCcw size={16} /> Return for Revision
                </button>
              )}
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
