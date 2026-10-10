import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Briefcase,
  Phone,
  Building,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Check,
  Printer
} from "lucide-react";
import Badge from "../../../shared/components/Badge";
import CustomerAcceptModal from "./CustomerAcceptModal";
import CustomerRejectModal from "./CustomerRejectModal";
import { formatCurrency } from "../../estimate/utils/estimateCalculations";
import { customerAcceptEstimate, customerRejectEstimate } from "../../estimate/api/estimateApi";
import "../styles/customerV3.css";
import "../../job/styles/jobV3.css";
import "../../estimate/styles/estimateV3.css";

export default function CustomerEstimateReviewView({
  estimate,
  onEstimateUpdated
}) {
  const navigate = useNavigate();

  const [currentEstimate, setCurrentEstimate] = useState(estimate);
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);

  const status = currentEstimate?.status || "SENT";
  const isAccepted = status === "ACCEPTED" || status === "APPROVED";
  const isRejected = status === "REJECTED";
  const isExpired = Boolean(currentEstimate?.isExpired || status === "EXPIRED");
  const isPendingDecision = !isAccepted && !isRejected && !isExpired;

  // Handle Accept
  const handleAcceptConfirm = async () => {
    setIsProcessing(true);
    try {
      const estId = currentEstimate.estimateId || currentEstimate.id || currentEstimate.estimateNo;
      const res = await customerAcceptEstimate(estId, {
        actor: "Customer (Online Portal)",
        approvalMethod: "CUSTOMER_PORTAL"
      });

      const updated = res?.estimate || res;
      setCurrentEstimate(updated);
      setAcceptModalOpen(false);

      // Trigger celebration confetti if available on window
      if (typeof window !== "undefined" && typeof window.confetti === "function") {
        try {
          window.confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {
          // ignore
        }
      }

      setActionSuccessMessage("Quotation accepted successfully! Our branch team has been notified.");
      if (onEstimateUpdated) onEstimateUpdated(updated);
    } catch (err) {
      console.error("Failed to accept estimate:", err);
      alert(err.response?.data?.message || err.message || "Failed to confirm estimate.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Reject / Request Changes
  const handleRejectConfirm = async ({ reasonCode, reason, comments }) => {
    setIsProcessing(true);
    try {
      const estId = currentEstimate.estimateId || currentEstimate.id || currentEstimate.estimateNo;
      const res = await customerRejectEstimate(estId, {
        reasonCode,
        reason,
        comments
      });

      const updated = res?.estimate || res;
      setCurrentEstimate(updated);
      setRejectModalOpen(false);
      setActionSuccessMessage("Revision request submitted. Our branch team will review your comments and issue an updated quote.");
      if (onEstimateUpdated) onEstimateUpdated(updated);
    } catch (err) {
      console.error("Failed to reject estimate:", err);
      alert(err.response?.data?.message || err.message || "Failed to submit revision request.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 16px", boxSizing: "border-box" }}>
      {/* Brand Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#047857", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "18px" }}>
            P
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#047857", letterSpacing: "-0.02em" }}>
              PrintZ
            </h2>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
              Official Commercial Quotation • {currentEstimate.branchName || "Banaswadi Branch"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => window.print()}
            className="v3-btn-secondary"
            style={{ fontSize: "12px", padding: "6px 12px" }}
          >
            <Printer size={14} /> Print Quote
          </button>
        </div>
      </div>

      {/* Decision Status Banners */}
      {isAccepted && (
        <div
          style={{
            background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
            border: "1px solid #a7f3d0",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}
        >
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#047857", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <strong style={{ fontSize: "15px", color: "#065f46", display: "block" }}>
              ✓ Estimate Approved & Confirmed
            </strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#047857" }}>
              Thank you! You approved this estimate on {currentEstimate.approvedAt ? new Date(currentEstimate.approvedAt).toLocaleString() : "today"} for {formatCurrency(currentEstimate.grandTotal || 0)}. PrintZ team is preparing your job order.
            </p>
          </div>
        </div>
      )}

      {isRejected && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px"
          }}
        >
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#d97706", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
            <RotateCcw size={18} />
          </div>
          <div>
            <strong style={{ fontSize: "15px", color: "#92400e", display: "block" }}>
              Revision Requested
            </strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#b45309" }}>
              Reason: <strong>{currentEstimate.rejectionReason || "Price / Specification Change"}</strong>
              {currentEstimate.customerComments && ` — "${currentEstimate.customerComments}"`}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#92400e" }}>
              Our branch manager is preparing an updated quotation version.
            </p>
          </div>
        </div>
      )}

      {isExpired && !isAccepted && !isRejected && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}
        >
          <AlertTriangle size={24} color="#dc2626" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: "14px", color: "#991b1b", display: "block" }}>
              Estimate Validity Period Expired
            </strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#b91c1c" }}>
              This quotation lapsed on {currentEstimate.validUntil}. Please contact our branch team to request an updated quotation.
            </p>
          </div>
        </div>
      )}

      {/* Main Quotation Sheet Card */}
      <div className="v3-card" style={{ padding: "24px", marginBottom: "20px" }}>
        {/* Quotation Header Details */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: "18px", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Commercial Quotation
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>
                {currentEstimate.estimateNo}
              </h1>
              <span className="v3-version-tag">{currentEstimate.version || "V1"}</span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Status:</span>
              {isAccepted ? (
                <Badge variant="active">✓ Accepted</Badge>
              ) : isRejected ? (
                <Badge variant="danger">Revision Requested</Badge>
              ) : isExpired ? (
                <Badge variant="neutral">Expired</Badge>
              ) : (
                <Badge variant="warning">Awaiting Your Approval</Badge>
              )}
            </div>
            <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: 700, marginTop: "4px" }}>
              Valid Until: {currentEstimate.validUntil || "7 Days"}
            </div>
          </div>
        </div>

        {/* Customer & Job Info Two Columns */}
        <div className="v3-info-grid-2" style={{ marginBottom: "20px" }}>
          <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>
              Customer Details
            </div>
            <strong style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>
              {currentEstimate.customer?.name || currentEstimate.customerName || "Customer"}
            </strong>
            {currentEstimate.customer?.company && (
              <div style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>
                {currentEstimate.customer.company}
              </div>
            )}
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Mobile: {currentEstimate.customer?.mobile || currentEstimate.customerMobile || "—"}
            </div>
          </div>

          <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>
              Job Order Reference
            </div>
            <strong style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>
              {currentEstimate.job?.jobTitle || currentEstimate.jobTitle || "Print Order"}
            </strong>
            <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#047857", fontWeight: 700, marginTop: "2px" }}>
              {currentEstimate.job?.jobNo || currentEstimate.jobNo}
            </div>
            {currentEstimate.job?.expectedDeliveryDate && (
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                Target Delivery: {currentEstimate.job.expectedDeliveryDate}
              </div>
            )}
          </div>
        </div>

        {/* Itemized Pricing Table */}
        <div className="v3-lines-table-wrapper" style={{ marginBottom: "20px" }}>
          <table className="v3-lines-table">
            <thead>
              <tr>
                <th style={{ width: "35px" }}>#</th>
                <th>Item / Description</th>
                <th style={{ width: "90px", textAlign: "right" }}>Quantity</th>
                <th style={{ width: "70px" }}>Unit</th>
                <th style={{ width: "100px", textAlign: "right" }}>Rate</th>
                <th style={{ width: "115px", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(currentEstimate.items || []).flatMap((it) => it.lines || []).map((line, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: "center", color: "#94a3b8" }}>{idx + 1}</td>
                  <td>
                    <strong style={{ color: "#0f172a" }}>{line.description}</strong>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{Number(line.quantity || 0).toLocaleString()}</td>
                  <td style={{ fontSize: "12px", color: "#64748b" }}>{line.unit || "PCS"}</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(line.rate || 0)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                    {formatCurrency(line.amount || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Terms Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px", marginBottom: "20px" }}>
          {/* Terms & Conditions */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>
              Standard Terms & Conditions:
            </div>
            <div style={{ fontSize: "11px", color: "#475569", whiteSpace: "pre-line", lineHeight: "1.6", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              {currentEstimate.termsAndConditions}
            </div>

            {currentEstimate.customerNotes && (
              <div style={{ marginTop: "10px", fontSize: "12px", color: "#065f46", background: "#ecfdf5", padding: "8px 12px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                <strong>Note:</strong> {currentEstimate.customerNotes}
              </div>
            )}
          </div>

          {/* Financial Breakdown Card */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div className="v3-calc-row">
              <span>Subtotal:</span>
              <strong>{formatCurrency(currentEstimate.subtotal || 0)}</strong>
            </div>

            {Number(currentEstimate.discount?.amount || 0) > 0 && (
              <div className="v3-calc-row" style={{ color: "#dc2626" }}>
                <span>Discount ({currentEstimate.discount?.type === "PERCENTAGE" ? `${currentEstimate.discount?.value}%` : "Fixed"}):</span>
                <strong>-{formatCurrency(currentEstimate.discount?.amount || 0)}</strong>
              </div>
            )}

            {Number(currentEstimate.deliveryCharge || 0) > 0 && (
              <div className="v3-calc-row">
                <span>Delivery Charge:</span>
                <strong>{formatCurrency(currentEstimate.deliveryCharge || 0)}</strong>
              </div>
            )}

            <div className="v3-calc-row">
              <span>Taxable Amount:</span>
              <strong>{formatCurrency(currentEstimate.taxableAmount || 0)}</strong>
            </div>

            {currentEstimate.tax?.type === "GST" ? (
              <>
                <div className="v3-calc-row">
                  <span>CGST ({currentEstimate.tax?.cgstRate || 9}%):</span>
                  <span>{formatCurrency(currentEstimate.tax?.cgstAmount || 0)}</span>
                </div>
                <div className="v3-calc-row">
                  <span>SGST ({currentEstimate.tax?.sgstRate || 9}%):</span>
                  <span>{formatCurrency(currentEstimate.tax?.sgstAmount || 0)}</span>
                </div>
              </>
            ) : (
              <div className="v3-calc-row">
                <span>IGST ({currentEstimate.tax?.rate || 18}%):</span>
                <span>{formatCurrency(currentEstimate.tax?.taxAmount || 0)}</span>
              </div>
            )}

            <div className="v3-calc-divider" />

            <div className="v3-grand-total-box" style={{ margin: "10px 0 0 0" }}>
              <div>
                <span className="v3-grand-total-label">Grand Total</span>
                <div style={{ fontSize: "11px", color: "#065f46" }}>All inclusive quotation</div>
              </div>
              <span className="v3-grand-total-value">
                {formatCurrency(currentEstimate.grandTotal || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Decision Actions (Visible only when Pending Approval) */}
        {isPendingDecision && !isExpired && (
          <div
            style={{
              paddingTop: "20px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              flexWrap: "wrap"
            }}
          >
            <button
              type="button"
              onClick={() => setRejectModalOpen(true)}
              disabled={isProcessing}
              className="v3-btn-secondary"
              style={{
                fontSize: "13px",
                padding: "10px 20px",
                borderColor: "#fca5a5",
                color: "#dc2626"
              }}
            >
              <RotateCcw size={15} /> Reject / Request Changes
            </button>

            <button
              type="button"
              onClick={() => setAcceptModalOpen(true)}
              disabled={isProcessing}
              className="v3-btn-primary"
              style={{
                fontSize: "13px",
                padding: "10px 28px",
                backgroundColor: "#047857",
                borderColor: "#047857"
              }}
            >
              <Check size={16} /> Accept Estimate
            </button>
          </div>
        )}
      </div>

      {/* Decision Modals */}
      <CustomerAcceptModal
        estimate={currentEstimate}
        isOpen={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        onConfirmAccept={handleAcceptConfirm}
        isProcessing={isProcessing}
      />

      <CustomerRejectModal
        estimate={currentEstimate}
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirmReject={handleRejectConfirm}
        isProcessing={isProcessing}
      />
    </div>
  );
}
