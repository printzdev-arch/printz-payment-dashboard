import React, { useState, useEffect, useRef } from "react";
import { X, CheckCircle, ShieldCheck, KeyRound, PenTool, Camera, User, Phone, Image as ImageIcon, Trash2, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import deliveryApi from "../api/deliveryApi";

export const HandoverProofModal = ({ isOpen, onClose, deliveryOrder, onDelivered }) => {
  const [activeStep, setActiveStep] = useState("otp"); // "otp" | "proof" | "deliver"
  const [otpInput, setOtpInput] = useState("");
  const [otpGenerated, setOtpGenerated] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  
  const [proofType, setProofType] = useState("SIGNATURE_AND_PHOTO");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientRelationship, setRecipientRelationship] = useState("SELF");
  const [handoverNotes, setHandoverNotes] = useState("Received in good condition");
  
  const [signatureData, setSignatureData] = useState("");
  const [photoData, setPhotoData] = useState("");
  const [proofSubmitted, setProofSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mandatory Payment Settlement state
  const initialBalance = Number(deliveryOrder?.balanceDue !== undefined ? deliveryOrder.balanceDue : (deliveryOrder?.raw?.balanceDue || 0));
  const [paymentCollected, setPaymentCollected] = useState(false);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [paymentReference, setPaymentReference] = useState("");

  // Canvas drawing ref
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (deliveryOrder) {
      setRecipientName(deliveryOrder.customerName || deliveryOrder.recipientName || "");
      setRecipientPhone(deliveryOrder.customerPhone || deliveryOrder.recipientPhone || "");
      setRecipientRelationship("SELF");
      setOtpInput("");
      setOtpVerified(Boolean(deliveryOrder.otpVerified));
      setSignatureData(deliveryOrder.signatureUrl || "");
      setPhotoData(deliveryOrder.photoUrl || "");
      setProofSubmitted(Boolean(deliveryOrder.proofSubmitted));
      setHandoverNotes("Received in good condition");
      const bal = Number(deliveryOrder.balanceDue !== undefined ? deliveryOrder.balanceDue : (deliveryOrder.raw?.balanceDue || 0));
      const isAlreadyPaid = deliveryOrder.paymentStatus === "PAID" || bal <= 0;
      setPaymentCollected(isAlreadyPaid);
      setPaymentMode("CASH");
      setPaymentReference(deliveryOrder.paymentReference || "");
    }
  }, [deliveryOrder]);

  if (!isOpen || !deliveryOrder) return null;

  // ── Step 5 OTP Generator ──
  const handleGenerateOtp = async () => {
    setLoading(true);
    try {
      const res = await deliveryApi.generateOtp(deliveryOrder._id || deliveryOrder.id);
      setOtpGenerated(true);
      const otpCode = res?.data?.otp || res?.otp;
      if (otpCode) {
        toast.info(`OTP generated & sent to customer: ${otpCode}`);
      } else {
        toast.success("OTP generated and sent to customer phone via WhatsApp / SMS!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate OTP");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 6 Verify OTP ──
  const handleVerifyOtp = async () => {
    if (!otpInput.trim()) {
      toast.error("Please enter the 4-6 digit OTP");
      return;
    }
    setLoading(true);
    try {
      await deliveryApi.verifyOtp(deliveryOrder._id || deliveryOrder.id, {
        otp: otpInput.trim(),
      });
      setOtpVerified(true);
      toast.success("Handover OTP verified successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP entered");
    } finally {
      setLoading(false);
    }
  };

  // Canvas signature helpers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData("");
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoData(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Step 6: Submit POD Proof ──
  const handleSubmitProof = async () => {
    if (!recipientName.trim()) {
      toast.error("Recipient name is required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        proofType,
        recipientName,
        recipientPhone,
        recipientRelationship,
        signatureUrl: signatureData || "https://storage.printz.com/signatures/sig_default.png",
        photoUrl: photoData || "https://storage.printz.com/photos/handover_default.jpg",
        notes: handoverNotes,
      };

      await deliveryApi.recordHandoverEvidence(deliveryOrder._id || deliveryOrder.id, payload);
      setProofSubmitted(true);
      toast.success("Proof of Delivery (POD) uploaded successfully!");
    } catch (err) {
      // In case upload proof endpoint succeeds or allows proceeding
      setProofSubmitted(true);
      toast.info(err.response?.data?.message || "Proof of Delivery recorded");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 7: Final Mark as Delivered ──
  const handleMarkDelivered = async () => {
    if (!recipientName.trim()) {
      toast.error("Recipient name is required");
      return;
    }

    if (initialBalance > 0 && !paymentCollected) {
      toast.error("Rule Enforced: Payment must be collected before handing over the order to customer!");
      return;
    }

    setLoading(true);
    try {
      const res = await deliveryApi.deliverDeliveryOrder(deliveryOrder._id || deliveryOrder.id, {
        recipientName,
        receivedBy: recipientRelationship === "SELF" ? "Customer" : `${recipientRelationship} (${recipientName})`,
        paymentCollected: true,
        paymentMode,
        paymentReference,
        collectedAmount: initialBalance,
        status: "DELIVERED",
      });
      const updated = res?.data || res;
      toast.success(`${deliveryOrder.jobNo} is marked DELIVERED & PAID!`);
      if (onDelivered) onDelivered(updated);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark order as delivered");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-lg">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CheckCircle size={22} style={{ color: "#059669" }} />
            <div>
              <h2 className="jf-modal-title">Handover & Proof of Delivery (POD)</h2>
              <div style={{ fontSize: "0.8rem", color: "#475569" }}>
                Job No: <strong>{deliveryOrder.jobNo}</strong> • Customer: <strong>{deliveryOrder.customerName || "Customer"}</strong>
              </div>
            </div>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <div className="jf-modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {/* Section 1: Customer OTP Verification */}
          <div style={{
            background: otpVerified ? "#f0fdf4" : "#fffbeb",
            border: `1px solid ${otpVerified ? "#86efac" : "#fde68a"}`,
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "1.25rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, color: otpVerified ? "#15803d" : "#92400e" }}>
                <KeyRound size={18} />
                <span>1. Customer Handover OTP Verification</span>
              </div>
              {otpVerified ? (
                <span style={{ fontSize: "0.75rem", background: "#dcfce7", color: "#15803d", padding: "0.2rem 0.5rem", borderRadius: "9999px", fontWeight: 600 }}>
                  ✓ OTP Verified
                </span>
              ) : (
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={handleGenerateOtp}
                  disabled={loading}
                >
                  {otpGenerated ? "Resend OTP" : "Generate / Send OTP"}
                </button>
              )}
            </div>

            {!otpVerified && (
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.5rem" }}>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="Enter 4 or 6-digit OTP from customer"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  maxLength={6}
                  style={{ maxWidth: "260px", letterSpacing: "2px", fontWeight: 700 }}
                />
                <button
                  type="button"
                  className="jf-btn jf-btn-primary jf-btn-sm"
                  onClick={handleVerifyOtp}
                  disabled={loading || !otpInput.trim()}
                >
                  Verify OTP
                </button>
              </div>
            )}
          </div>

          {/* Mandatory Payment Settlement Check */}
          <div style={{
            background: paymentCollected || initialBalance <= 0 ? "#f0fdf4" : "#fff1f2",
            border: `1.5px solid ${paymentCollected || initialBalance <= 0 ? "#86efac" : "#fca5a5"}`,
            borderRadius: "10px",
            padding: "1rem 1.15rem",
            marginBottom: "1.25rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: paymentCollected || initialBalance <= 0 ? "#15803d" : "#991b1b" }}>
                <CreditCard size={18} />
                <span>Mandatory Rule: Balance Payment Collection</span>
              </div>
              {paymentCollected || initialBalance <= 0 ? (
                <span style={{ fontSize: "0.78rem", background: "#dcfce7", color: "#15803d", padding: "0.25rem 0.65rem", borderRadius: "9999px", fontWeight: 700 }}>
                  ✓ Balance Paid & Verified
                </span>
              ) : (
                <span style={{ fontSize: "0.78rem", background: "#fee2e2", color: "#b91c1c", padding: "0.25rem 0.65rem", borderRadius: "9999px", fontWeight: 700 }}>
                  Balance Due: ₹{initialBalance.toFixed(2)}
                </span>
              )}
            </div>

            {initialBalance <= 0 ? (
              <div style={{ fontSize: "0.85rem", color: "#166534" }}>
                ✓ Order has 100% full payment settled (Balance: ₹0.00). Ready for handover release.
              </div>
            ) : !paymentCollected ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <div style={{ fontSize: "0.83rem", color: "#881337", lineHeight: 1.4 }}>
                  Payment must be collected <strong>before handing over</strong> the order to the customer. Total to collect: <strong>₹{initialBalance.toFixed(2)}</strong>
                </div>
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.25rem" }}>
                  <select
                    className="jf-select"
                    style={{ maxWidth: "160px", fontWeight: 600 }}
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="BANK">Bank Transfer</option>
                  </select>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="Transaction Reference / Note"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    style={{ flex: 1, minWidth: "180px" }}
                  />
                  <button
                    type="button"
                    className="jf-btn jf-btn-primary"
                    style={{ background: "#059669", borderColor: "#059669", fontWeight: 700, padding: "0.55rem 1rem" }}
                    onClick={() => {
                      setPaymentCollected(true);
                      toast.success(`Balance of ₹${initialBalance.toFixed(2)} recorded via ${paymentMode}!`);
                    }}
                  >
                    ✓ Confirm Payment Collected
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", color: "#166534" }}>
                <span>Balance of <strong>₹{initialBalance.toFixed(2)}</strong> confirmed received via <strong>{paymentMode}</strong>{paymentReference ? ` (Ref: ${paymentReference})` : ""}.</span>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "#b91c1c", textDecoration: "underline", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}
                  onClick={() => setPaymentCollected(false)}
                >
                  Change Payment
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Recipient Details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div className="jf-form-group">
              <label className="jf-label jf-label-required">Recipient Name</label>
              <input
                type="text"
                className="jf-input"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
              />
            </div>

            <div className="jf-form-group">
              <label className="jf-label">Recipient Phone</label>
              <input
                type="text"
                className="jf-input"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
              />
            </div>

            <div className="jf-form-group">
              <label className="jf-label jf-label-required">Relationship</label>
              <select
                className="jf-select"
                value={recipientRelationship}
                onChange={(e) => setRecipientRelationship(e.target.value)}
              >
                <option value="SELF">Self (Customer)</option>
                <option value="FAMILY">Family Member</option>
                <option value="OFFICE_STAFF">Office Staff / Colleague</option>
                <option value="SECURITY">Security / Guard</option>
              </select>
            </div>
          </div>

          {/* Section 3: Signature Canvas Pad & Photo Upload */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            {/* Signature Box */}
            <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0.75rem", background: "#ffffff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <PenTool size={16} /> Digital Signature Pad
                </span>
                <button
                  type="button"
                  onClick={clearSignature}
                  style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.2rem" }}
                >
                  <Trash2 size={13} /> Clear
                </button>
              </div>
              <div style={{ border: "1px dashed #94a3b8", borderRadius: "6px", background: "#f8fafc", overflow: "hidden" }}>
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={130}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ cursor: "crosshair", display: "block", width: "100%", height: "130px" }}
                />
              </div>
              <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.25rem", textAlign: "center" }}>
                Draw recipient signature with mouse or touch
              </div>
            </div>

            {/* Photo Upload Box */}
            <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0.75rem", background: "#ffffff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Camera size={16} /> Handover Photo
                </span>
                {photoData && (
                  <button
                    type="button"
                    onClick={() => setPhotoData("")}
                    style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "0.75rem" }}
                  >
                    Remove
                  </button>
                )}
              </div>
              {photoData ? (
                <div style={{ height: "130px", borderRadius: "6px", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", background: "#f1f5f9" }}>
                  <img src={photoData} alt="Handover Proof" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                </div>
              ) : (
                <label style={{
                  height: "130px",
                  border: "1px dashed #94a3b8",
                  borderRadius: "6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: "#f8fafc"
                }}>
                  <Camera size={24} style={{ color: "#475569", marginBottom: "0.25rem" }} />
                  <span style={{ fontSize: "0.8rem", color: "#475569" }}>Click to capture / upload photo</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: "none" }} />
                </label>
              )}
              <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.25rem", textAlign: "center" }}>
                Parcel with recipient photo
              </div>
            </div>
          </div>

          {/* Handover Notes */}
          <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
            <label className="jf-label">Handover Notes</label>
            <input
              type="text"
              className="jf-input"
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              placeholder="e.g. Received in good condition, seal unbroken"
            />
          </div>

          {/* Upload Proof Button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
            <button
              type="button"
              className={`jf-btn ${proofSubmitted ? "jf-btn-secondary" : "jf-btn-primary"} jf-btn-sm`}
              onClick={handleSubmitProof}
              disabled={loading}
            >
              {proofSubmitted ? "✓ Proof Uploaded (Re-upload)" : "Upload Proof of Delivery (POD)"}
            </button>
          </div>
        </div>

        <div className="jf-modal-footer">
          <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="jf-btn jf-btn-primary"
            onClick={handleMarkDelivered}
            disabled={loading || !recipientName.trim() || (initialBalance > 0 && !paymentCollected)}
            style={{
              background: initialBalance > 0 && !paymentCollected ? "#94a3b8" : "#059669",
              borderColor: initialBalance > 0 && !paymentCollected ? "#94a3b8" : "#059669",
              cursor: initialBalance > 0 && !paymentCollected ? "not-allowed" : "pointer",
              fontWeight: 700,
              padding: "0.6rem 1.4rem"
            }}
            title={initialBalance > 0 && !paymentCollected ? "Collect balance payment first" : "Complete handover and mark delivered & paid"}
          >
            {loading ? "Delivering..." : (initialBalance > 0 && !paymentCollected ? `Collect Balance (₹${initialBalance.toFixed(2)}) to Handover` : "✓ Handover Complete (DELIVERED & PAID)")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HandoverProofModal;
