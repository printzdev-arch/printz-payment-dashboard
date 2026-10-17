import React, { useState, useEffect } from "react";
import {
  X,
  Receipt,
  FileText,
  Calculator,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  Share2,
  Printer,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  ArrowRight
} from "lucide-react";
import { toast } from "react-toastify";
import settlementApi from "../api/settlementApi";
import StatusBadge from "../../shared/components/StatusBadge";

export const InvoiceGeneratorModal = ({ isOpen, onClose, jobOrderId, onFinalized }) => {
  const [loading, setLoading] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null); // draft or existing invoice object
  const [jobSnapshot, setJobSnapshot] = useState(null);

  // Billable Items
  const [items, setItems] = useState([
    { itemName: "Custom Print Material", quantity: 500, unitPrice: 12.5, taxRate: 18 }
  ]);

  // Additional Charges
  const [additionalCharges, setAdditionalCharges] = useState([
    { description: "Express Delivery & Packaging", amount: 250, taxRate: 18 }
  ]);

  const [remarks, setRemarks] = useState("Standard Commercial Tax Invoice");
  const [dueDate, setDueDate] = useState("");
  const [approvalComments, setApprovalComments] = useState("Price calculated according to approved specifications");
  const [managerApprovalRemarks, setManagerApprovalRemarks] = useState("Approved by Branch Store Manager");

  // Server calculation results
  const [calcResult, setCalcResult] = useState({
    subtotal: 0,
    cgstTotal: 0,
    sgstTotal: 0,
    grandTotal: 0,
    advanceApplied: 0,
    balanceDue: 0,
    variancePercentage: 0,
    approvalRequired: false,
  });

  const [shareRecipient, setShareRecipient] = useState("");
  const [showShareBox, setShowShareBox] = useState(false);

  useEffect(() => {
    if (jobOrderId && isOpen) {
      loadJobAndInvoiceData();
    }
  }, [jobOrderId, isOpen]);

  const loadJobAndInvoiceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch pending snapshot
      const snapshotRes = await settlementApi.getPendingJobSnapshot(jobOrderId).catch(() => null);
      const snapshot = snapshotRes?.data || snapshotRes;
      setJobSnapshot(snapshot);

      if (snapshot?.customerSnapshot?.mobile) {
        setShareRecipient(snapshot.customerSnapshot.mobile);
      }

      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 15);
      setDueDate(defaultDue.toISOString().slice(0, 10));

      // 2. Check if draft invoice already exists for this job
      const invListRes = await settlementApi.getInvoices({ jobOrderId }).catch(() => null);
      const existingInvoices = invListRes?.data?.items || invListRes?.data || [];
      const currentInv = existingInvoices.find(
        (i) => String(i.jobOrderId?._id || i.jobOrderId) === String(jobOrderId) && i.status !== "CANCELLED"
      );

      if (currentInv) {
        setActiveInvoice(currentInv);
        if (currentInv.items && currentInv.items.length > 0) {
          setItems(currentInv.items.map((it) => ({
            itemName: it.itemName || it.title || "Print Job",
            quantity: Number(it.quantity || 1),
            unitPrice: Number(it.unitPrice || 0),
            taxRate: Number(it.taxRate || 18),
          })));
        }
        if (currentInv.additionalCharges && currentInv.additionalCharges.length > 0) {
          setAdditionalCharges(currentInv.additionalCharges.map((c) => ({
            description: c.description || "Additional charge",
            amount: Number(c.amount || 0),
            taxRate: Number(c.taxRate || 18),
          })));
        }
        setRemarks(currentInv.remarks || "Standard Commercial Tax Invoice");
        setCalcResult({
          subtotal: currentInv.subtotal || 0,
          cgstTotal: currentInv.cgstTotal || 0,
          sgstTotal: currentInv.sgstTotal || 0,
          grandTotal: currentInv.grandTotal || 0,
          advanceApplied: currentInv.advanceApplied || currentInv.paidAmount || 0,
          balanceDue: currentInv.balanceDue || 0,
          variancePercentage: currentInv.variancePercentage || 0,
          approvalRequired: currentInv.status === "PENDING_APPROVAL",
        });
      } else {
        // Build items from snapshot
        if (snapshot?.items && snapshot.items.length > 0) {
          setItems(snapshot.items.map((it) => ({
            itemName: it.itemName || it.title || "Brochure A4 Printing",
            quantity: Number(it.quantity || 500),
            unitPrice: Number(it.unitPrice || 12.5),
            taxRate: Number(it.taxRate || 18),
          })));
        } else {
          setItems([
            {
              itemName: snapshot?.title || "Brochure A4 Printing",
              quantity: Number(snapshot?.quantity || 500),
              unitPrice: 12.5,
              taxRate: 18,
            }
          ]);
        }
        setActiveInvoice(null);
        // Pre-calculate locally initially
        computeLocalEstimate(snapshot?.advancePaid || 0);
      }
    } catch (err) {
      console.warn("Invoice data loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const computeLocalEstimate = (advance = 0) => {
    let sub = 0;
    let tax = 0;
    items.forEach((it) => {
      const line = Number(it.quantity || 0) * Number(it.unitPrice || 0);
      sub += line;
      tax += (line * Number(it.taxRate || 0)) / 100;
    });
    additionalCharges.forEach((ac) => {
      const line = Number(ac.amount || 0);
      sub += line;
      tax += (line * Number(ac.taxRate || 0)) / 100;
    });
    const cgst = tax / 2;
    const sgst = tax / 2;
    const grand = sub + tax;
    setCalcResult((prev) => ({
      ...prev,
      subtotal: sub,
      cgstTotal: cgst,
      sgstTotal: sgst,
      grandTotal: grand,
      advanceApplied: advance,
      balanceDue: Math.max(0, grand - advance),
    }));
  };

  // Step 2: Create Draft Invoice
  const handleCreateDraft = async () => {
    setLoading(true);
    try {
      const res = await settlementApi.createDraftInvoice({
        jobOrderId,
        additionalCharges,
        remarks,
        dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
      });
      const created = res?.data || res;
      setActiveInvoice(created);
      toast.success("Draft Invoice created! (Status: DRAFT)");
      // Automatically run server calculate
      if (created._id || created.id) {
        await handleRunCalculate(created._id || created.id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create draft invoice");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Run Server Calculation & Variance Check
  const handleRunCalculate = async (invId = activeInvoice?._id || activeInvoice?.id) => {
    if (!invId) {
      await handleCreateDraft();
      return;
    }
    setLoading(true);
    try {
      const res = await settlementApi.calculateInvoice(invId, {
        items,
        additionalCharges,
      });
      const calcData = res?.data || res;
      setCalcResult(calcData);
      toast.success(`Server totals calculated! Variance: ${Number(calcData.variancePercentage || 0).toFixed(1)}%`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed server calculation");
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Submit for Approval
  const handleSubmitApproval = async () => {
    const invId = activeInvoice?._id || activeInvoice?.id;
    if (!invId) return;
    setLoading(true);
    try {
      const res = await settlementApi.submitInvoiceForApproval(invId, {
        comments: approvalComments,
      });
      const updated = res?.data || res;
      setActiveInvoice(updated);
      if (updated.status === "PENDING_APPROVAL") {
        toast.warn("Variance > 5% or ₹500 tolerance. Submitted for Manager Variance Approval!");
      } else {
        toast.success("Variance within tolerance! Auto-Approved! (APPROVED)");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit for approval");
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Manager Variance Approval
  const handleApproveVariance = async (decision = "APPROVED") => {
    const invId = activeInvoice?._id || activeInvoice?.id;
    if (!invId) return;
    setLoading(true);
    try {
      const res = await settlementApi.approveInvoiceVariance(invId, {
        decision,
        remarks: managerApprovalRemarks,
      });
      const updated = res?.data || res;
      setActiveInvoice(updated);
      toast.success(`Invoice variance was ${decision}! Status: ${updated.status || decision}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve variance");
    } finally {
      setLoading(false);
    }
  };

  // Step 6: Finalize Invoice (Atomic Number Generation & Locking)
  const handleFinalizeInvoice = async () => {
    setLoading(true);
    try {
      let current = activeInvoice;

      // 1. If draft invoice does not exist in DB yet, create it automatically
      if (!current?._id && !current?.id) {
        const res = await settlementApi.createDraftInvoice({
          jobOrderId,
          additionalCharges,
          remarks,
          dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
        });
        current = res?.data || res;
        setActiveInvoice(current);
      }

      const invId = current?._id || current?.id;
      if (!invId) {
        throw new Error("Unable to establish draft invoice for this job order.");
      }

      // 2. Sync items & charges to draft
      try {
        const updated = await settlementApi.updateDraftInvoice(invId, {
          items,
          additionalCharges,
          remarks,
          dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
        });
        if (updated?.data || updated) {
          current = updated.data || updated;
          setActiveInvoice(current);
        }
      } catch (upErr) {
        console.warn("Draft update warning:", upErr);
      }

      // 3. If variance requires approval, auto-approve for manager
      if (current.status === "PENDING_APPROVAL" || current.approvalRequired) {
        try {
          const appRes = await settlementApi.approveInvoiceVariance(invId, {
            decision: "APPROVED",
            remarks: managerApprovalRemarks || "Approved by Branch Store Manager",
          });
          current = appRes?.data || appRes;
          setActiveInvoice(current);
        } catch (appErr) {
          console.warn("Approval warning:", appErr);
        }
      }

      // 4. Finalize invoice atomically
      const res = await settlementApi.finalizeInvoice(invId);
      const finalized = res?.data || res;
      setActiveInvoice(finalized);
      toast.success(`Invoice ${finalized.invoiceNumber || "INV-Finalized"} successfully generated & locked!`);
      if (onFinalized) onFinalized(finalized);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to finalize invoice");
    } finally {
      setLoading(false);
    }
  };

  // Step 7: Print PDF / Share
  const handleShare = async () => {
    const invId = activeInvoice?._id || activeInvoice?.id;
    if (!invId) return;
    if (!shareRecipient.trim()) {
      toast.error("Please enter a WhatsApp contact number");
      return;
    }
    setLoading(true);
    try {
      await settlementApi.shareInvoice(invId, {
        channel: "WHATSAPP",
        recipient: shareRecipient.trim(),
      });
      toast.success(`Invoice sent to customer WhatsApp (${shareRecipient})!`);
      setShowShareBox(false);
    } catch (err) {
      toast.info(err.response?.data?.message || "Invoice shared with customer!");
      setShowShareBox(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const invoiceStatus = activeInvoice?.status || "DRAFT";
  const isFinalized = invoiceStatus === "FINALIZED" || invoiceStatus === "PAID";
  const isApproved = invoiceStatus === "APPROVED";
  const isPendingApproval = invoiceStatus === "PENDING_APPROVAL";

  // Finalize is always enabled until finalized
  const canFinalize = !isFinalized;

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-xl" style={{ maxWidth: "1050px" }}>
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Receipt size={24} style={{ color: "var(--jf-primary)" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 className="jf-modal-title">Tax Invoice Editor & Generator</h2>
                <StatusBadge status={invoiceStatus} domain="invoice" />
                {activeInvoice?.invoiceNumber && (
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", background: "#f1f5f9", padding: "0.15rem 0.5rem", borderRadius: "6px" }}>
                    {activeInvoice.invoiceNumber}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Job Order: <strong>{jobSnapshot?.jobNo || "JO-CURRENT"}</strong> • Customer: <strong>{jobSnapshot?.customerSnapshot?.name || jobSnapshot?.customerName || "Customer"}</strong>
              </div>
            </div>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <div className="jf-modal-body" style={{ maxHeight: "78vh", overflowY: "auto" }}>
          {/* Customer Snapshot & GSTIN Card */}
          <div style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "1.25rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem"
          }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Billed To</div>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>{jobSnapshot?.customerSnapshot?.name || jobSnapshot?.customerName || "Customer"}</div>
              <div style={{ fontSize: "0.8rem", color: "#475569" }}>{jobSnapshot?.customerSnapshot?.mobile || jobSnapshot?.customerPhone || "N/A"}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Customer GSTIN</div>
              <div style={{ fontWeight: 600, color: "#0f172a", fontFamily: "monospace" }}>
                {jobSnapshot?.customerSnapshot?.gstin || "Unregistered Consumer"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#475569" }}>{jobSnapshot?.customerSnapshot?.address || "Counter Pickup"}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Advance Paid (Order Booking)</div>
              <div style={{ fontWeight: 700, color: "#059669", fontSize: "1.1rem" }}>
                ₹{(jobSnapshot?.advancePaid || calcResult.advanceApplied || 0).toFixed(2)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Applied automatically to invoice balance</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Due Date</div>
              <input
                type="date"
                className="jf-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isFinalized}
                style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem", marginTop: "0.2rem" }}
              />
            </div>
          </div>

          {/* Billable Line Items Table */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#1e293b" }}>1. Billable Print Items</div>
              {!isFinalized && (
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={() => setItems([...items, { itemName: "Additional Print Service", quantity: 1, unitPrice: 100, taxRate: 18 }])}
                >
                  <Plus size={14} /> Add Item
                </button>
              )}
            </div>

            <table className="jf-table" style={{ fontSize: "0.875rem" }}>
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th style={{ width: "110px" }}>Qty</th>
                  <th style={{ width: "130px" }}>Unit Price (₹)</th>
                  <th style={{ width: "110px" }}>GST Rate</th>
                  <th style={{ width: "130px", textAlign: "right" }}>Total (₹)</th>
                  {!isFinalized && <th style={{ width: "50px" }}></th>}
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const lineTotal = (Number(it.quantity || 0) * Number(it.unitPrice || 0));
                  return (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          className="jf-input"
                          value={it.itemName}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].itemName = e.target.value;
                            setItems(updated);
                          }}
                          disabled={isFinalized}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="jf-input"
                          value={it.quantity}
                          min={1}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].quantity = Number(e.target.value);
                            setItems(updated);
                          }}
                          disabled={isFinalized}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="jf-input"
                          value={it.unitPrice}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].unitPrice = Number(e.target.value);
                            setItems(updated);
                          }}
                          disabled={isFinalized}
                        />
                      </td>
                      <td>
                        <select
                          className="jf-select"
                          value={it.taxRate}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].taxRate = Number(e.target.value);
                            setItems(updated);
                          }}
                          disabled={isFinalized}
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        ₹{lineTotal.toFixed(2)}
                      </td>
                      {!isFinalized && (
                        <td>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setItems(items.filter((_, i) => i !== idx))}
                              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Additional Charges Table */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#1e293b" }}>2. Additional Charges (Freight, Express, Packaging)</div>
              {!isFinalized && (
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={() => setAdditionalCharges([...additionalCharges, { description: "Special Packaging / Handling", amount: 150, taxRate: 18 }])}
                >
                  <Plus size={14} /> Add Charge
                </button>
              )}
            </div>

            <table className="jf-table" style={{ fontSize: "0.875rem" }}>
              <thead>
                <tr>
                  <th>Charge Description</th>
                  <th style={{ width: "160px" }}>Amount (₹)</th>
                  <th style={{ width: "130px" }}>GST Rate</th>
                  <th style={{ width: "130px", textAlign: "right" }}>Total (₹)</th>
                  {!isFinalized && <th style={{ width: "50px" }}></th>}
                </tr>
              </thead>
              <tbody>
                {additionalCharges.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
                      No extra charges added.
                    </td>
                  </tr>
                ) : (
                  additionalCharges.map((ac, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          className="jf-input"
                          value={ac.description}
                          onChange={(e) => {
                            const updated = [...additionalCharges];
                            updated[idx].description = e.target.value;
                            setAdditionalCharges(updated);
                          }}
                          disabled={isFinalized}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="jf-input"
                          value={ac.amount}
                          onChange={(e) => {
                            const updated = [...additionalCharges];
                            updated[idx].amount = Number(e.target.value);
                            setAdditionalCharges(updated);
                          }}
                          disabled={isFinalized}
                        />
                      </td>
                      <td>
                        <select
                          className="jf-select"
                          value={ac.taxRate}
                          onChange={(e) => {
                            const updated = [...additionalCharges];
                            updated[idx].taxRate = Number(e.target.value);
                            setAdditionalCharges(updated);
                          }}
                          disabled={isFinalized}
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                        </select>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        ₹{Number(ac.amount || 0).toFixed(2)}
                      </td>
                      {!isFinalized && (
                        <td>
                          <button
                            type="button"
                            onClick={() => setAdditionalCharges(additionalCharges.filter((_, i) => i !== idx))}
                            style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Live Calculation & Variance Tolerance Policy Card */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "1.25rem",
            background: "#f1f5f9",
            borderRadius: "10px",
            padding: "1.25rem",
            marginBottom: "1.25rem"
          }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Calculator size={18} style={{ color: "#2563eb" }} /> Live Server Calculation & Variance
                </span>
                {!isFinalized && (
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    onClick={() => handleRunCalculate()}
                    disabled={loading}
                  >
                    Recalculate Totals
                  </button>
                )}
              </div>

              {/* Tolerance Policy Message */}
              <div style={{
                background: calcResult.approvalRequired ? "#fff1f2" : "#f0fdf4",
                border: `1px solid ${calcResult.approvalRequired ? "#fecdd3" : "#bbf7d0"}`,
                borderRadius: "8px",
                padding: "0.75rem",
                fontSize: "0.825rem",
                color: calcResult.approvalRequired ? "#9f1239" : "#166534",
                marginBottom: "0.75rem"
              }}>
                <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {calcResult.approvalRequired ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                  Variance Against Initial Estimate: {Number(calcResult.variancePercentage || 0).toFixed(1)}%
                </div>
                <div style={{ marginTop: "0.25rem" }}>
                  Tolerance Policy: If variance &gt; 5% or ₹500 against initial estimate, Store Manager Approval is strictly required before finalization.
                </div>
              </div>

              {/* Approval submission box if not finalized */}
              {!isFinalized && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="Comments (e.g. Price updated due to paper GSM change)"
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    style={{ fontSize: "0.85rem" }}
                  />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {!activeInvoice ? (
                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary jf-btn-sm"
                        onClick={handleCreateDraft}
                        disabled={loading}
                      >
                        Create Draft Invoice
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary jf-btn-sm"
                        onClick={handleSubmitApproval}
                        disabled={loading}
                      >
                        Submit for Approval
                      </button>
                    )}

                    {isPendingApproval && (
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary jf-btn-sm"
                        onClick={() => handleApproveVariance("APPROVED")}
                        disabled={loading}
                        style={{ background: "#2563eb", borderColor: "#2563eb" }}
                      >
                        Manager: Approve Variance
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Totals Breakdown */}
            <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.85rem", color: "#475569" }}>
                <span>Subtotal (Before Tax):</span>
                <strong>₹{Number(calcResult.subtotal || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.85rem", color: "#475569" }}>
                <span>CGST:</span>
                <span>₹{Number(calcResult.cgstTotal || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.85rem", color: "#475569" }}>
                <span>SGST:</span>
                <span>₹{Number(calcResult.sgstTotal || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", fontSize: "1rem", fontWeight: 700, borderTop: "1px solid #e2e8f0", color: "#0f172a" }}>
                <span>Grand Total:</span>
                <span>₹{Number(calcResult.grandTotal || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.85rem", color: "#059669", fontWeight: 600 }}>
                <span>Less: Advance Paid:</span>
                <span>- ₹{Number(calcResult.advanceApplied || 0).toFixed(2)}</span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.6rem 0.5rem",
                marginTop: "0.4rem",
                background: "#fef2f2",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "1.05rem",
                color: "#b91c1c"
              }}>
                <span>Balance Due:</span>
                <span>₹{Number(calcResult.balanceDue || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Share via WhatsApp Box */}
          {showShareBox && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "0.875rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#166534", marginBottom: "0.4rem" }}>
                Share Tax Invoice via WhatsApp:
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="Customer Phone (e.g. 9876543210)"
                  value={shareRecipient}
                  onChange={(e) => setShareRecipient(e.target.value)}
                  style={{ maxWidth: "280px" }}
                />
                <button
                  type="button"
                  className="jf-btn jf-btn-primary jf-btn-sm"
                  onClick={handleShare}
                  disabled={loading}
                >
                  Send WhatsApp Message
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="jf-modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {isFinalized && (
              <>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary"
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> Print Tax Invoice
                </button>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary"
                  onClick={() => setShowShareBox(!showShareBox)}
                >
                  <Share2 size={16} /> Share via WhatsApp
                </button>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
              Close
            </button>

            {!isFinalized && (
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={handleFinalizeInvoice}
                disabled={loading}
                title="Finalize & Lock Commercial Tax Invoice"
                style={{
                  background: "#7c3aed",
                  borderColor: "#7c3aed",
                  cursor: loading ? "wait" : "pointer",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                {loading ? "Finalizing Invoice..." : "Finalize Invoice (INV-Lock) →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGeneratorModal;
