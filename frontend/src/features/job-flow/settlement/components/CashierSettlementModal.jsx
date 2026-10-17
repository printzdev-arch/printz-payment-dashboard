import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  DollarSign,
  Receipt,
  RotateCcw,
  Printer,
  CheckCircle,
  AlertTriangle,
  History,
  ShieldAlert,
  Wallet
} from "lucide-react";
import { toast } from "react-toastify";
import settlementApi from "../api/settlementApi";
import StatusBadge from "../../shared/components/StatusBadge";

export const CashierSettlementModal = ({ isOpen, onClose, invoiceId, onPaymentComplete }) => {
  const [loading, setLoading] = useState(false);
  const [settlementData, setSettlementData] = useState(null);

  // Payment form state
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH"); // CASH | CARD | UPI | BANK
  const [paymentReference, setPaymentReference] = useState("");
  const [remarks, setRemarks] = useState("Counter payment settlement");
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    if (invoiceId && isOpen) {
      loadSettlementStatus();
    }
  }, [invoiceId, isOpen]);

  const loadSettlementStatus = async () => {
    setLoading(true);
    try {
      const res = await settlementApi.getInvoiceSettlement(invoiceId);
      const data = res?.data || res;
      setSettlementData(data);

      // Pre-populate amount with exact balanceDue, clamp max
      const balance = Number(data.balanceDue || 0);
      setAmount(balance > 0 ? balance.toFixed(2) : "0.00");
      setPaymentReference(paymentMode === "CASH" ? `CASH-REG-${Date.now().toString().slice(-4)}` : `TXN-${Date.now().toString().slice(-6)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load settlement details");
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode) => {
    setPaymentMode(mode);
    if (mode === "CASH") {
      setPaymentReference(`CASH-REG-${Date.now().toString().slice(-4)}`);
    } else if (mode === "UPI") {
      setPaymentReference(`UPI-${Date.now().toString().slice(-6)}`);
    } else if (mode === "CARD") {
      setPaymentReference(`CARD-POS-${Date.now().toString().slice(-4)}`);
    } else {
      setPaymentReference(`UTR-${Date.now().toString().slice(-6)}`);
    }
  };

  const handleCollectPayment = async (e) => {
    e.preventDefault();
    const payAmount = Number(amount);
    const balanceDue = Number(settlementData?.balanceDue || 0);

    if (payAmount <= 0) {
      toast.error("Please enter a valid payment amount greater than ₹0");
      return;
    }

    if (payAmount > balanceDue) {
      toast.error(`Overpayment not allowed! Maximum collectible balance is ₹${balanceDue.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const idempotencyKey = `PAY-IDEMP-${invoiceId}-${Date.now()}`;
      const payload = {
        amount: payAmount,
        paymentMode,
        paymentReference,
        remarks,
        idempotencyKey,
      };

      const res = await settlementApi.collectPayment(invoiceId, payload);
      const paymentResult = res?.data || res;
      toast.success(`Payment of ₹${payAmount.toFixed(2)} recorded via ${paymentMode}!`);

      // Refresh settlement status
      await loadSettlementStatus();
      if (onPaymentComplete) onPaymentComplete(paymentResult);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to collect payment");
    } finally {
      setLoading(false);
    }
  };

  // Void payment
  const handleVoidPayment = async (paymentId) => {
    const reason = window.prompt("Reason for voiding / reversing this payment:", "Entered wrong payment mode / amount");
    if (!reason) return;

    setLoading(true);
    try {
      await settlementApi.voidPayment(paymentId, { reason });
      toast.info("Payment voided and reversed back to balance due!");
      await loadSettlementStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to void payment");
    } finally {
      setLoading(false);
    }
  };

  // Print / view payment receipt
  const handleViewReceipt = async (payment) => {
    try {
      const res = await settlementApi.getPaymentReceipt(payment._id || payment.id);
      setSelectedReceipt(res?.data || res || payment);
    } catch {
      setSelectedReceipt(payment);
    }
  };

  if (!isOpen) return null;

  const invoiceTotal = Number(settlementData?.invoiceTotal || 0);
  const amountPaid = Number(settlementData?.amountPaid || 0);
  const balanceDue = Number(settlementData?.balanceDue || 0);
  const paymentStatus = settlementData?.paymentStatus || (balanceDue === 0 ? "PAID" : amountPaid > 0 ? "PARTIAL" : "UNPAID");
  const paymentsList = settlementData?.payments || [];

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-lg">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Wallet size={22} style={{ color: "#059669" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 className="jf-modal-title">Cashier Payment Collection & Ledger</h2>
                <StatusBadge status={paymentStatus} domain="settlement" />
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Invoice No: <strong>{settlementData?.invoiceNumber || "INV-CURRENT"}</strong> • Customer: <strong>{settlementData?.customerName || "Customer"}</strong>
              </div>
            </div>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <div className="jf-modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {/* Summary Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "1rem",
            marginBottom: "1.25rem"
          }}>
            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Total Invoiced</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#0f172a" }}>₹{invoiceTotal.toFixed(2)}</div>
            </div>

            <div style={{ background: "#f0fdf4", padding: "1rem", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "0.75rem", color: "#166534", textTransform: "uppercase", fontWeight: 600 }}>Amount Collected</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#15803d" }}>₹{amountPaid.toFixed(2)}</div>
            </div>

            <div style={{ background: balanceDue > 0 ? "#fef2f2" : "#f0fdf4", padding: "1rem", borderRadius: "10px", border: `1px solid ${balanceDue > 0 ? "#fecaca" : "#bbf7d0"}` }}>
              <div style={{ fontSize: "0.75rem", color: balanceDue > 0 ? "#991b1b" : "#166534", textTransform: "uppercase", fontWeight: 600 }}>Remaining Balance Due</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: balanceDue > 0 ? "#dc2626" : "#15803d" }}>₹{balanceDue.toFixed(2)}</div>
            </div>
          </div>

          {/* Payment Collection Form (if balance due > 0) */}
          {balanceDue > 0 ? (
            <form onSubmit={handleCollectPayment} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <CreditCard size={18} style={{ color: "#2563eb" }} /> Collect Payment (Full or Split / Installment)
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label jf-label-required">
                    Payment Amount (₹) <span style={{ color: "#64748b", fontWeight: 400 }}>(Max: ₹{balanceDue.toFixed(2)})</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={balanceDue}
                    className="jf-input"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}
                  />
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
                    <button
                      type="button"
                      className="jf-btn jf-btn-secondary jf-btn-sm"
                      onClick={() => setAmount(balanceDue.toFixed(2))}
                      style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    >
                      Full Balance (₹{balanceDue.toFixed(2)})
                    </button>
                    {balanceDue > 1000 && (
                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary jf-btn-sm"
                        onClick={() => setAmount((balanceDue / 2).toFixed(2))}
                        style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                      >
                        50% Split
                      </button>
                    )}
                  </div>
                </div>

                <div className="jf-form-group">
                  <label className="jf-label jf-label-required">Payment Mode</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                    {["CASH", "UPI", "CARD", "BANK"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`jf-btn ${paymentMode === mode ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
                        onClick={() => handleModeChange(mode)}
                        style={{ justifyContent: "center" }}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label">Transaction Reference / UTR</label>
                  <input
                    type="text"
                    className="jf-input"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. UPI-TXN-984210 or CASH-REG-01"
                  />
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Remarks</label>
                  <input
                    type="text"
                    className="jf-input"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Final balance settlement at counter"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  className="jf-btn jf-btn-primary"
                  disabled={loading || Number(amount) <= 0 || Number(amount) > balanceDue}
                  style={{ background: "#059669", borderColor: "#059669" }}
                >
                  {loading ? "Recording..." : `Confirm Payment (₹${Number(amount || 0).toFixed(2)})`}
                </button>
              </div>
            </form>
          ) : (
            <div style={{
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "10px",
              padding: "1rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              color: "#166534"
            }}>
              <CheckCircle size={22} />
              <div>
                <div style={{ fontWeight: 700 }}>Invoice Fully Settled!</div>
                <div style={{ fontSize: "0.85rem" }}>Zero balance due. This invoice is eligible for administrative job closure.</div>
              </div>
            </div>
          )}

          {/* Payment History / Ledger Table */}
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <History size={18} style={{ color: "#64748b" }} /> Payment Ledger & Receipt Vouchers
            </div>

            <table className="jf-table" style={{ fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th>Payment No</th>
                  <th>Date & Time</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th>Amount (₹)</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paymentsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>
                      No payments recorded yet for this invoice.
                    </td>
                  </tr>
                ) : (
                  paymentsList.map((p, idx) => (
                    <tr key={p.id || p._id || idx}>
                      <td>
                        <strong>{p.paymentNo || `PAY-${idx + 1}`}</strong>
                      </td>
                      <td>
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Today"}
                      </td>
                      <td>
                        <span className="settlement-payment-pill">{p.paymentMode}</span>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {p.paymentReference || "N/A"}
                      </td>
                      <td style={{ fontWeight: 700, color: p.status === "VOIDED" ? "#94a3b8" : "#059669" }}>
                        ₹{Number(p.amount || 0).toFixed(2)}
                      </td>
                      <td>
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "9999px",
                          background: p.status === "VOIDED" ? "#fee2e2" : "#dcfce7",
                          color: p.status === "VOIDED" ? "#b91c1c" : "#15803d"
                        }}>
                          {p.status || "COMPLETED"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                          <button
                            type="button"
                            className="jf-btn jf-btn-secondary jf-btn-sm"
                            onClick={() => handleViewReceipt(p)}
                            title="Print Voucher Receipt"
                          >
                            <Printer size={13} />
                          </button>
                          {p.status !== "VOIDED" && (
                            <button
                              type="button"
                              className="jf-btn jf-btn-secondary jf-btn-sm"
                              onClick={() => handleVoidPayment(p._id || p.id)}
                              title="Void / Reverse Mistake"
                              style={{ color: "#dc2626" }}
                            >
                              <RotateCcw size={13} /> Void
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Receipt Modal Preview */}
          {selectedReceipt && (
            <div style={{
              marginTop: "1.25rem",
              background: "#ffffff",
              border: "2px dashed #cbd5e1",
              borderRadius: "10px",
              padding: "1.25rem",
              fontFamily: "monospace"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontWeight: 700, fontSize: "1rem" }}>PRINTZ CASHIER PAYMENT RECEIPT</span>
                <button type="button" onClick={() => setSelectedReceipt(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ fontSize: "0.85rem", lineHeight: "1.5" }}>
                <div>Receipt No: <strong>{selectedReceipt.paymentNo || selectedReceipt._id}</strong></div>
                <div>Invoice: {settlementData?.invoiceNumber}</div>
                <div>Customer: {settlementData?.customerName}</div>
                <div>Amount Paid: <strong>₹{Number(selectedReceipt.amount || 0).toFixed(2)}</strong></div>
                <div>Payment Mode: {selectedReceipt.paymentMode} ({selectedReceipt.paymentReference})</div>
                <div>Balance Due Remaining: ₹{balanceDue.toFixed(2)}</div>
              </div>
              <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="jf-btn jf-btn-primary jf-btn-sm" onClick={() => window.print()}>
                  <Printer size={14} /> Print Receipt Voucher
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="jf-modal-footer">
          <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CashierSettlementModal;
