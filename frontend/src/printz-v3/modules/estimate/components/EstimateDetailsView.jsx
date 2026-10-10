import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Printer,
  Edit,
  Send,
  ArrowLeft,
  Calendar,
  User,
  Briefcase,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertTriangle,
  GitBranch,
  ExternalLink
} from "lucide-react";
import Badge from "../../../shared/components/Badge";
import { formatCurrency } from "../utils/estimateCalculations";
import { markEstimateReady, sendEstimateToCustomer, createEstimateRevision } from "../api/estimateApi";
import EstimatePreviewModal from "./EstimatePreviewModal";
import SendEstimateModal from "./SendEstimateModal";
import "../../customer/styles/customerV3.css";
import "../../job/styles/jobV3.css";
import "../styles/estimateV3.css";

export default function EstimateDetailsView({
  estimate,
  onBack = null,
  onUpdate = null
}) {
  const navigate = useNavigate();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!estimate) {
    return (
      <div className="v3-estimate-container" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
        <p>No estimate details found.</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="neutral">Draft</Badge>;
      case "READY":
        return <Badge variant="business">Ready for Dispatch</Badge>;
      case "SENT":
        return <Badge variant="warning">Sent • Waiting Customer Approval</Badge>;
      case "ACCEPTED":
        return <Badge variant="success">Customer Accepted</Badge>;
      case "REJECTED":
        return <Badge variant="error">Revision Requested</Badge>;
      case "EXPIRED":
        return <Badge variant="neutral">Expired</Badge>;
      default:
        return <Badge variant="neutral">{status || "DRAFT"}</Badge>;
    }
  };

  const handleMarkReady = async () => {
    setIsProcessing(true);
    try {
      const estId = estimate.id || estimate._id || estimate.estimateId;
      const updated = await markEstimateReady(estId);
      if (onUpdate) onUpdate(updated?.estimate || updated);
      navigate("/v3/design");
    } catch (err) {
      console.error("Mark ready error:", err);
      navigate("/v3/design");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendConfirm = async (sendPayload) => {
    setIsProcessing(true);
    try {
      const estId = estimate.id || estimate._id;
      const sent = await sendEstimateToCustomer(estId, sendPayload);
      setSendModalOpen(false);
      if (onUpdate) onUpdate(sent?.estimate || sent);
    } catch (err) {
      console.error("Send error:", err);
      alert("Failed to dispatch estimate.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateRevision = async () => {
    try {
      setIsProcessing(true);
      const estId = estimate.id || estimate._id || estimate.estimateId;
      const revised = await createEstimateRevision(estId, { items: estimate.items, discount: estimate.discount });
      const newEst = revised?.estimate || revised;
      const destId = newEst?.id || newEst?._id || newEst?.estimateId || estId;
      navigate(`/v3/estimates/${destId}/edit`, { state: { estimate: newEst || estimate, isRevision: true } });
    } catch (err) {
      console.warn("Direct revision creation skipped, opening editor directly:", err);
      const estId = estimate.id || estimate._id || estimate.estimateId;
      navigate(`/v3/estimates/${estId}/edit`, { state: { estimate, isRevision: true } });
    } finally {
      setIsProcessing(false);
    }
  };

  const customerPortalUrl = `/v3/customer/estimate/${estimate.id || estimate._id || estimate.estimateId}`;

  return (
    <div className="v3-estimate-container">
      {/* Header */}
      <div className="v3-estimate-header">
        <div>
          <div className="v3-breadcrumb">
            <span className="v3-breadcrumb-root">PrintZ V3</span>
            <span>/</span>
            <span>Quotation Orders</span>
            <span>/</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{estimate.estimateNo}</span>
          </div>

          <div className="v3-estimate-title-row">
            <h1 className="v3-estimate-header-title">Quotation Details</h1>
            <span className="v3-estimate-pill">{estimate.estimateNo}</span>
            <span className="v3-version-tag">{estimate.version || "V1"}</span>
            {getStatusBadge(estimate.status)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onBack || (() => navigate("/v3/estimates"))}
            className="v3-btn-secondary"
            style={{ fontSize: "12px" }}
          >
            <ArrowLeft size={14} /> Back to List
          </button>

          <a
            href={customerPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="v3-btn-secondary"
            style={{ fontSize: "12px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <ExternalLink size={14} /> Customer Link
          </a>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="v3-btn-secondary"
            style={{ fontSize: "12px", borderColor: "#047857", color: "#047857" }}
          >
            <Printer size={14} /> Print / Export PDF
          </button>

          <button
            type="button"
            onClick={() => navigate(`/v3/estimates/${estimate.id || estimate._id || estimate.estimateId}/edit`, { state: { estimate } })}
            className="v3-btn-secondary"
            style={{ fontSize: "12px" }}
          >
            <Edit size={14} /> Edit Pricing
          </button>

          {(estimate.status === "DRAFT" || estimate.status === "SENT") && (
            <button
              type="button"
              onClick={handleMarkReady}
              disabled={isProcessing}
              className="v3-btn-primary"
              style={{ fontSize: "12px", backgroundColor: "#059669", borderColor: "#059669" }}
            >
              <CheckCircle2 size={14} /> Mark as Ready
            </button>
          )}

          {estimate.status === "READY" && (
            <button
              type="button"
              onClick={() => setSendModalOpen(true)}
              disabled={isProcessing}
              className="v3-btn-primary"
              style={{ fontSize: "12px", backgroundColor: "#0284c7", borderColor: "#0284c7" }}
            >
              <Send size={14} /> Send to Customer
            </button>
          )}

          {(estimate.status === "SENT" || estimate.status === "REJECTED") && (
            <button
              type="button"
              onClick={handleCreateRevision}
              disabled={isProcessing}
              className="v3-btn-primary"
              style={{ fontSize: "12px", backgroundColor: "#d97706", borderColor: "#d97706" }}
            >
              <GitBranch size={14} /> Create Revised Estimate
            </button>
          )}
        </div>
      </div>

      {/* Decision Status Banners */}
      {estimate.status === "ACCEPTED" && (
        <div style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "14px", color: "#15803d" }}>
                Quotation Approved by Customer
              </div>
              <div style={{ fontSize: "12px", color: "#166534" }}>
                Accepted on {estimate.approvedAt ? new Date(estimate.approvedAt).toLocaleString() : "Recently"} • Approved Amount: {formatCurrency(estimate.grandTotal)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/v3/jobs/${estimate.jobId || estimate.jobNo}`)}
            className="v3-btn-secondary"
            style={{ fontSize: "12px", borderColor: "#16a34a", color: "#15803d", backgroundColor: "#fff" }}
          >
            <Briefcase size={14} /> View Job Order
          </button>
        </div>
      )}

      {estimate.status === "REJECTED" && (
        <div style={{
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "#b91c1c" }}>
                  Customer Requested Revision
                </div>
                <div style={{ fontSize: "12px", color: "#991b1b" }}>
                  Reason: <strong>{estimate.rejectionReason || "Price / Scope revision"}</strong> {estimate.rejectedAt && `• ${new Date(estimate.rejectedAt).toLocaleString()}`}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateRevision}
              className="v3-btn-primary"
              style={{ fontSize: "12px", backgroundColor: "#dc2626", borderColor: "#dc2626" }}
            >
              <GitBranch size={14} /> Create Revised Estimate (Next Version)
            </button>
          </div>

          {estimate.rejectionComments && (
            <div style={{ backgroundColor: "#fff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #fee2e2", fontSize: "12px", color: "#7f1d1d" }}>
              <strong>Customer Comments:</strong> {estimate.rejectionComments}
            </div>
          )}
        </div>
      )}

      {/* Overview Grid: Customer & Job Order */}
      <div className="v3-info-grid-2">
        {/* Customer Card */}
        <div className="v3-card" style={{ padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <div className="v3-card-icon">
              <User size={16} />
            </div>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
              Customer Details
            </h4>
          </div>

          <div className="v3-summary-kv-row">
            <span className="v3-summary-k">Customer Name:</span>
            <span className="v3-summary-v">{estimate.customerName || "—"}</span>
          </div>
          <div className="v3-summary-kv-row">
            <span className="v3-summary-k">Customer Code:</span>
            <span className="v3-summary-v" style={{ fontFamily: "monospace", color: "#047857" }}>
              {estimate.customerCode || "—"}
            </span>
          </div>
          <div className="v3-summary-kv-row">
            <span className="v3-summary-k">Mobile Number:</span>
            <span className="v3-summary-v">{estimate.customerMobile || "—"}</span>
          </div>
          {estimate.customerCompany && (
            <div className="v3-summary-kv-row">
              <span className="v3-summary-k">Company:</span>
              <span className="v3-summary-v">{estimate.customerCompany}</span>
            </div>
          )}
        </div>

        {/* Job Order Card */}
        <div className="v3-card" style={{ padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="v3-card-icon" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                <Briefcase size={16} />
              </div>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                Job Order Reference
              </h4>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/v3/jobs/${estimate.jobId || estimate.jobNo}`)}
              className="v3-btn-secondary"
              style={{ fontSize: "11px", padding: "4px 8px", height: "28px" }}
            >
              <ExternalLink size={12} /> View Job
            </button>
          </div>

          <div className="v3-summary-kv-row">
            <span className="v3-summary-k">Job Order:</span>
            <span className="v3-summary-v" style={{ fontFamily: "monospace", color: "#047857" }}>
              {estimate.jobNo}
            </span>
          </div>
          <div className="v3-summary-kv-row">
            <span className="v3-summary-k">Project Title:</span>
            <span className="v3-summary-v">{estimate.jobTitle || "Print Order"}</span>
          </div>
          <div className="v3-summary-kv-row">
            <span className="v3-summary-k">Quotation Validity:</span>
            <span className="v3-summary-v" style={{ color: "#dc2626" }}>
              Valid Until {estimate.validUntil || "7 Days"}
            </span>
          </div>
        </div>
      </div>

      {/* 12-Column Pricing & Summary Grid */}
      <div className="v3-estimate-layout-grid">
        {/* Left 8 cols: Line Items & Terms */}
        <div>
          {/* Line Items Table Card */}
          <div className="v3-card" style={{ padding: "20px", marginBottom: "20px" }}>
            <h3 className="v3-card-title" style={{ marginBottom: "16px" }}>
              Commercial Pricing Components
            </h3>

            {(estimate.items || []).map((item, itemIdx) => {
              const displayLines = (item.lines && item.lines.length > 0)
                ? item.lines
                : [
                    {
                      lineId: item.jobItemId || item.lineNo || itemIdx + 1,
                      description: item.itemName || item.description || `Item #${itemIdx + 1}`,
                      category: item.category || "PRINT",
                      quantity: item.quantity || 1,
                      unit: item.unit || "PCS",
                      rate: item.unitRate || item.unitPrice || item.rate || 0,
                      amount: item.amount || 0,
                      notes: item.specification || ""
                    }
                  ];

              return (
                <div key={item.jobItemId || itemIdx} style={{ marginBottom: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <div className="v3-item-index-badge">{itemIdx + 1}</div>
                    <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                      {item.itemName || item.description || "Print Item"} ({Number(item.quantity || 0).toLocaleString()} {item.unit || "PCS"})
                    </strong>
                  </div>

                  <div className="v3-lines-table-wrapper">
                    <table className="v3-lines-table">
                      <thead>
                        <tr>
                          <th style={{ width: "35px" }}>#</th>
                          <th>Description</th>
                          <th style={{ width: "130px" }}>Category</th>
                          <th style={{ width: "90px", textAlign: "right" }}>Quantity</th>
                          <th style={{ width: "70px" }}>Unit</th>
                          <th style={{ width: "100px", textAlign: "right" }}>Rate</th>
                          <th style={{ width: "115px", textAlign: "right" }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayLines.map((line, lineIdx) => (
                          <tr key={line.lineId || lineIdx}>
                            <td style={{ textAlign: "center", color: "#94a3b8" }}>{lineIdx + 1}</td>
                            <td>
                              <strong style={{ color: "#0f172a" }}>{line.description}</strong>
                              {line.notes && <div style={{ fontSize: "11px", color: "#64748b" }}>{line.notes}</div>}
                            </td>
                            <td>
                              <span className="v3-cat-badge" style={{ backgroundColor: "#f1f5f9", color: "#475569" }}>
                                {line.category}
                              </span>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>{Number(line.quantity || 0).toLocaleString()}</td>
                            <td style={{ fontSize: "12px", color: "#64748b" }}>{line.unit || "PCS"}</td>
                            <td style={{ textAlign: "right" }}>{formatCurrency(line.rate || 0)}</td>
                            <td style={{ textAlign: "right", fontWeight: 700, color: "#047857" }}>
                              {formatCurrency(line.amount || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Terms & Notes Card */}
          <div className="v3-card" style={{ padding: "20px" }}>
            <h3 className="v3-card-title" style={{ marginBottom: "14px" }}>
              Terms & Customer Instructions
            </h3>

            <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", color: "#475569", whiteSpace: "pre-line", lineHeight: "1.6", marginBottom: "12px" }}>
              {estimate.termsAndConditions}
            </div>

            {estimate.customerNotes && (
              <div style={{ background: "#ecfdf5", padding: "10px 12px", borderRadius: "8px", border: "1px solid #a7f3d0", fontSize: "12px", color: "#065f46" }}>
                <strong>Customer Note:</strong> {estimate.customerNotes}
              </div>
            )}
          </div>
        </div>

        {/* Right 4 cols: Summary & Timeline */}
        <div>
          {/* Summary Card */}
          <div className="v3-sticky-summary-panel" style={{ marginBottom: "20px" }}>
            <div className="v3-summary-title">
              <span>Financial Breakdown</span>
            </div>

            <div className="v3-calc-row">
              <span>Subtotal:</span>
              <strong>{formatCurrency(estimate.subtotal || 0)}</strong>
            </div>

            {Number(estimate.discount?.amount || 0) > 0 && (
              <div className="v3-calc-row" style={{ color: "#dc2626" }}>
                <span>Discount ({estimate.discount?.type === "PERCENTAGE" ? `${estimate.discount?.value}%` : "Fixed"}):</span>
                <strong>-{formatCurrency(estimate.discount?.amount || 0)}</strong>
              </div>
            )}

            {Number(estimate.deliveryCharge || 0) > 0 && (
              <div className="v3-calc-row">
                <span>Delivery Charge:</span>
                <strong>{formatCurrency(estimate.deliveryCharge || 0)}</strong>
              </div>
            )}

            <div className="v3-calc-row">
              <span>Taxable Amount:</span>
              <strong>{formatCurrency(estimate.taxableAmount || 0)}</strong>
            </div>

            {estimate.tax?.type === "GST" ? (
              <>
                <div className="v3-calc-row">
                  <span>CGST ({estimate.tax?.cgstRate || 9}%):</span>
                  <span>{formatCurrency(estimate.tax?.cgstAmount || 0)}</span>
                </div>
                <div className="v3-calc-row">
                  <span>SGST ({estimate.tax?.sgstRate || 9}%):</span>
                  <span>{formatCurrency(estimate.tax?.sgstAmount || 0)}</span>
                </div>
              </>
            ) : (
              <div className="v3-calc-row">
                <span>IGST ({estimate.tax?.rate || 18}%):</span>
                <span>{formatCurrency(estimate.tax?.taxAmount || 0)}</span>
              </div>
            )}

            <div className="v3-calc-divider" />

            <div className="v3-grand-total-box">
              <div>
                <span className="v3-grand-total-label">Grand Total</span>
                <div style={{ fontSize: "11px", color: "#065f46" }}>All inclusive quotation</div>
              </div>
              <span className="v3-grand-total-value">
                {formatCurrency(estimate.grandTotal || 0)}
              </span>
            </div>
          </div>

          {/* Audit & Status Timeline Card */}
          <div className="v3-card" style={{ padding: "20px" }}>
            <h3 className="v3-card-title" style={{ marginBottom: "14px" }}>
              Quotation Lifecycle
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {(estimate.timeline || [
                { event: "CREATED", status: "DRAFT", actor: estimate.createdBy || "Staff", timestamp: estimate.createdAt }
              ]).map((evt, idx) => (
                <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "12px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: evt.status === "SENT" ? "#fef3c7" : evt.status === "READY" ? "#ecfdf5" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: evt.status === "SENT" ? "#d97706" : evt.status === "READY" ? "#047857" : "#475569", flexShrink: 0, marginTop: "2px" }}>
                    <CheckCircle2 size={13} />
                  </div>
                  <div>
                    <strong style={{ color: "#0f172a", display: "block" }}>
                      {evt.event.replace(/_/g, " ")}
                    </strong>
                    <span style={{ color: "#64748b", fontSize: "11px" }}>
                      {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : "Recently"} • By {evt.actor || "Staff"}
                    </span>
                    {evt.notes && (
                      <div style={{ color: "#475569", marginTop: "2px", fontSize: "11px" }}>
                        {evt.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <EstimatePreviewModal
        estimate={estimate}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onMarkReady={handleMarkReady}
        onSend={() => setSendModalOpen(true)}
      />

      {/* Send Modal */}
      <SendEstimateModal
        estimate={estimate}
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        onConfirmSend={handleSendConfirm}
        isSending={isProcessing}
      />
    </div>
  );
}
