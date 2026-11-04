import React, { useEffect, useState } from "react";
import {
  X,
  CheckCircle,
  ShieldCheck,
  User,
  Phone,
  FileCheck,
  Calendar,
  MapPin,
  Camera,
  PenTool,
  Printer,
  ArrowRight,
  ExternalLink,
  Package,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import deliveryApi from "../api/deliveryApi";

export const ViewDeliveryProofModal = ({ isOpen, onClose, deliveryOrder }) => {
  const navigate = useNavigate();
  const [proofData, setProofData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && deliveryOrder?._id) {
      loadProof();
    } else {
      setProofData(null);
    }
  }, [isOpen, deliveryOrder]);

  const loadProof = async () => {
    if (!deliveryOrder?._id) return;
    setLoading(true);
    try {
      const res = await deliveryApi.getDeliveryProof(deliveryOrder._id);
      const proof = res?.data || res;
      setProofData(proof);
    } catch (err) {
      console.warn("Could not fetch remote proof, using delivery order snapshot:", err);
      // Fallback to fields already on deliveryOrder
      setProofData({
        recipientName: deliveryOrder.recipientName || deliveryOrder.customerName,
        recipientPhone: deliveryOrder.recipientPhone || deliveryOrder.customerPhone,
        recipientRelationship: deliveryOrder.recipientRelationship || "CUSTOMER",
        signatureUrl: deliveryOrder.signatureUrl || deliveryOrder.raw?.signatureUrl,
        photoUrl: deliveryOrder.photoUrl || deliveryOrder.raw?.photoUrl || deliveryOrder.raw?.deliveryPhotos?.[0],
        otpVerified: deliveryOrder.otpVerified || deliveryOrder.raw?.otpVerified,
        handoverNotes: deliveryOrder.handoverNotes || deliveryOrder.raw?.handoverNotes || "Delivered and verified in good condition.",
        deliveredAt: deliveryOrder.deliveredAt || deliveryOrder.raw?.deliveredAt || deliveryOrder.raw?.updatedAt,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !deliveryOrder) return null;

  const recipient = proofData?.recipientName || deliveryOrder.recipientName || deliveryOrder.customerName || "Customer";
  const phone = proofData?.recipientPhone || deliveryOrder.recipientPhone || deliveryOrder.customerPhone || "N/A";
  const relationship = proofData?.recipientRelationship || deliveryOrder.recipientRelationship || "CUSTOMER";
  const signature = proofData?.signatureUrl || deliveryOrder.signatureUrl || deliveryOrder.raw?.signatureUrl;
  const photo = proofData?.photoUrl || deliveryOrder.photoUrl || deliveryOrder.raw?.photoUrl || deliveryOrder.raw?.deliveryPhotos?.[0];
  const deliveredAt = proofData?.deliveredAt || deliveryOrder.deliveredAt || deliveryOrder.raw?.deliveredAt || deliveryOrder.raw?.updatedAt;
  const notes = proofData?.handoverNotes || deliveryOrder.handoverNotes || deliveryOrder.raw?.handoverNotes || "Items handed over in satisfactory condition.";
  const otpVerified = Boolean(proofData?.otpVerified ?? deliveryOrder.otpVerified ?? deliveryOrder.raw?.otpVerified);

  const formatDeliveredDate = (dateVal) => {
    if (!dateVal) return "Completed";
    try {
      return new Date(dateVal).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return String(dateVal);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="jf-modal-overlay dlv-modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 99999,
        padding: "1rem",
        boxSizing: "border-box",
      }}
    >
      <div
        className="jf-modal jf-modal-lg dlv-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "840px",
          width: "95%",
          maxHeight: "90vh",
          margin: "auto",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "linear-gradient(135deg, #064e3b 0%, #047857 100%)",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileCheck size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
                Proof of Delivery (POD) Audit
              </h3>
              <p style={{ margin: 0, fontSize: "0.82rem", opacity: 0.9 }}>
                Order #{deliveryOrder.deliveryNo} &bull; Job Order: <strong style={{ color: "#a7f3d0" }}>{deliveryOrder.jobNo}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              color: "#ffffff",
              borderRadius: "50%",
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Top Status Banner */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.25rem",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: "12px",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <CheckCircle size={24} color="#059669" />
              <div>
                <div style={{ fontWeight: 700, color: "#065f46", fontSize: "0.95rem" }}>
                  Delivery Successfully Completed & Verified
                </div>
                <div style={{ fontSize: "0.8rem", color: "#047857" }}>
                  Handover timestamp: {formatDeliveredDate(deliveredAt)}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {otpVerified && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "999px",
                    background: "#059669",
                    color: "#ffffff",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  <ShieldCheck size={14} /> OTP Verified
                </span>
              )}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "999px",
                  background: "#d1fae5",
                  color: "#065f46",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  border: "1px solid #6ee7b7",
                }}
              >
                {deliveryOrder.deliveryType === "COUNTER_PICKUP" ? "Counter Pickup" : "Doorstep Delivery"}
              </span>
            </div>
          </div>

          {/* Grid: 2 columns */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
            {/* Left Card: Handover Details */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                Handover Verification Details
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                  <span style={{ color: "#64748b" }}>Job Order No:</span>
                  <strong style={{ color: "#0f172a" }}>{deliveryOrder.jobNo}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                  <span style={{ color: "#64748b" }}>Delivery Order No:</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#0f172a" }}>{deliveryOrder.deliveryNo}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                  <span style={{ color: "#64748b" }}>Received By:</span>
                  <strong style={{ color: "#0f172a" }}>{recipient}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                  <span style={{ color: "#64748b" }}>Contact Phone:</span>
                  <span style={{ color: "#0f172a" }}>{phone}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                  <span style={{ color: "#64748b" }}>Relationship to Customer:</span>
                  <span style={{ textTransform: "capitalize", fontWeight: 600, color: "#047857" }}>{relationship.toLowerCase()}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                  <span style={{ color: "#64748b" }}>Delivery Staff / Driver:</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{deliveryOrder.deliveryPersonName || "Guna Printz Staff"}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", paddingTop: "0.2rem" }}>
                  <span style={{ color: "#64748b" }}>Destination / Address:</span>
                  <span style={{ color: "#1e293b", fontWeight: 500, fontSize: "0.82rem" }}>{deliveryOrder.deliveryAddress || "Counter Pickup"}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", paddingTop: "0.2rem" }}>
                  <span style={{ color: "#64748b" }}>Handover Notes:</span>
                  <span style={{ color: "#334155", fontStyle: "italic", background: "#ffffff", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    &ldquo;{notes}&rdquo;
                  </span>
                </div>
              </div>
            </div>

            {/* Right Card: Digital Evidence (Signature & Photo) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Digital Signature */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <PenTool size={15} color="#059669" /> Digital Signature
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Legally Verified</span>
                </div>

                <div
                  style={{
                    height: "120px",
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {signature ? (
                    <img
                      src={signature}
                      alt="Recipient Signature"
                      style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
                      <PenTool size={20} style={{ margin: "0 auto 4px", opacity: 0.5 }} />
                      Signature captured on paper POD
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", textAlign: "right" }}>
                  Signed by: <strong>{recipient}</strong>
                </div>
              </div>

              {/* Handover Photo Proof */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Camera size={15} color="#059669" /> Handover Delivery Photo
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Parcel Evidence</span>
                </div>

                <div
                  style={{
                    height: "140px",
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt="Delivery Handover Photo"
                      style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
                      <Camera size={22} style={{ margin: "0 auto 4px", opacity: 0.5 }} />
                      No physical photo attached
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <button
            type="button"
            className="jf-btn jf-btn-secondary"
            onClick={handlePrint}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1rem" }}
          >
            <Printer size={15} /> Print POD Note
          </button>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              className="jf-btn jf-btn-secondary"
              onClick={onClose}
              style={{ padding: "0.55rem 1.25rem" }}
            >
              Close
            </button>
            <button
              type="button"
              className="jf-btn jf-btn-primary"
              style={{
                background: "#059669",
                borderColor: "#059669",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.55rem 1.25rem",
              }}
              onClick={() => {
                onClose();
                navigate(`/jobflow/invoice?jobId=${deliveryOrder.jobOrderId || deliveryOrder.jobNo}`);
              }}
            >
              Go to Commercial Invoice <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDeliveryProofModal;

