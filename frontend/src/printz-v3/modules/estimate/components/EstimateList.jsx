import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  Edit,
  Send,
  Printer,
  FileText,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  GitBranch
} from "lucide-react";
import Badge from "../../../shared/components/Badge";
import { ESTIMATE_STATUS, ESTIMATE_STATUS_META } from "../constants/estimateConstants";
import { formatCurrency } from "../utils/estimateCalculations";
import { getEstimates, markEstimateReady, sendEstimateToCustomer, createEstimateRevision } from "../api/estimateApi";
import SendEstimateModal from "./SendEstimateModal";
import EstimatePreviewModal from "./EstimatePreviewModal";
import "../../customer/styles/customerV3.css";
import "../../job/styles/jobV3.css";
import "../styles/estimateV3.css";

export default function EstimateList({
  branchName = "Banaswadi",
  onSelectEstimate,
  onAddNewEstimate
}) {
  const navigate = useNavigate();

  const [estimates, setEstimates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [previewEstimate, setPreviewEstimate] = useState(null);
  const [sendTargetEstimate, setSendTargetEstimate] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    fetchEstimates();
  }, [statusFilter]);

  const fetchEstimates = async () => {
    setIsLoading(true);
    try {
      const data = await getEstimates({
        status: statusFilter === "ALL" ? undefined : statusFilter
      });
      setEstimates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch estimates list:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEstimates = estimates.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    const estNo = (e.estimateNo || "").toLowerCase();
    const jobNo = (e.jobNo || "").toLowerCase();
    const cus = (e.customerName || "").toLowerCase();
    const phone = (e.customerMobile || "").toLowerCase();
    const title = (e.jobTitle || "").toLowerCase();
    return estNo.includes(q) || jobNo.includes(q) || cus.includes(q) || phone.includes(q) || title.includes(q);
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="neutral">Draft</Badge>;
      case "READY":
        return <Badge variant="business">Ready to Send</Badge>;
      case "SENT":
        return <Badge variant="warning">Sent • Waiting Approval</Badge>;
      default:
        return <Badge variant="neutral">{status || "DRAFT"}</Badge>;
    }
  };

  const handleSendConfirm = async (sendPayload) => {
    if (!sendTargetEstimate) return;
    setIsActionLoading(true);
    try {
      const estId = sendTargetEstimate.id || sendTargetEstimate._id;
      await sendEstimateToCustomer(estId, sendPayload);
      setSendTargetEstimate(null);
      fetchEstimates();
    } catch (err) {
      console.error("Send error:", err);
      alert("Failed to send estimate. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCreateRevision = async (estimate) => {
    if (!window.confirm(`Create revision version for ${estimate.estimateNo}? The existing version will be preserved.`)) return;
    try {
      const estId = estimate.id || estimate._id;
      const revised = await createEstimateRevision(estId);
      const newEst = revised?.estimate || revised;
      navigate(`/v3/estimates/${newEst.id || newEst._id || newEst.estimateId}/edit`);
    } catch (err) {
      console.error("Revision error:", err);
      alert("Failed to create estimate revision.");
    }
  };

  return (
    <div className="v3-card">
      {/* Header */}
      <div className="v3-card-header">
        <div className="v3-card-header-left">
          <div className="v3-card-icon">
            <FileText size={18} />
          </div>
          <div>
            <h3 className="v3-card-title">Commercial Estimates & Quotations Directory</h3>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={fetchEstimates}
            title="Refresh List"
            style={{
              padding: "6px 10px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#64748b"
            }}
          >
            <RefreshCw size={14} />
          </button>

          <button
            type="button"
            onClick={onAddNewEstimate || (() => navigate("/v3/jobs"))}
            className="v3-btn-primary"
            style={{ fontSize: "12px", padding: "8px 16px" }}
          >
            <Plus size={14} /> Create Estimate from Job
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="v3-filter-row" style={{ display: "flex", gap: "12px", padding: "16px 20px", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: "260px" }} className="v3-input-wrapper">
          <input
            type="text"
            className="v3-input has-icon"
            placeholder="Search by Estimate No, Job No, Customer, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={15} className="v3-input-icon" />
        </div>

        {/* Status Filters Pill Tabs */}
        <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "4px", borderRadius: "8px", gap: "4px" }}>
          {["ALL", "DRAFT", "READY", "SENT"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                backgroundColor: statusFilter === st ? "#047857" : "transparent",
                color: statusFilter === st ? "#ffffff" : "#475569",
                transition: "all 0.15s ease"
              }}
            >
              {st === "ALL" ? "All Status" : st === "READY" ? "Ready" : st === "SENT" ? "Sent / Awaiting" : "Draft"}
            </button>
          ))}
        </div>
      </div>

      {/* Estimates Table */}
      <div className="v3-table-wrapper" style={{ margin: 0, border: "none" }}>
        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontSize: "13px" }}>Loading commercial estimates...</p>
          </div>
        ) : filteredEstimates.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
            <FileText size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <h4 style={{ margin: 0, color: "#334155", fontSize: "15px" }}>No Quotations Found</h4>
            <p style={{ margin: "4px 0 16px 0", fontSize: "13px" }}>
              {searchQuery ? "No estimates matched your search query." : "Select an active Job Order to generate a quotation."}
            </p>
            <button
              type="button"
              onClick={() => navigate("/v3/jobs")}
              className="v3-btn-secondary"
              style={{ fontSize: "12px", margin: "0 auto" }}
            >
              Go to Job Orders
            </button>
          </div>
        ) : (
          <table className="v3-table">
            <thead>
              <tr>
                <th style={{ width: "160px" }}>Estimate No</th>
                <th style={{ minWidth: "180px" }}>Job Reference</th>
                <th style={{ minWidth: "180px" }}>Customer</th>
                <th style={{ width: "130px", textAlign: "right" }}>Grand Total</th>
                <th style={{ width: "160px" }}>Status</th>
                <th style={{ width: "110px" }}>Valid Until</th>
                <th style={{ width: "160px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEstimates.map((est) => (
                <tr key={est.id || est._id}>
                  {/* Estimate No */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#047857", fontSize: "13px" }}>
                        {est.estimateNo}
                      </span>
                      <span className="v3-version-tag">{est.version || "V1"}</span>
                    </div>
                  </td>

                  {/* Job Reference */}
                  <td>
                    <div>
                      <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>
                        {est.jobTitle || "Print Job"}
                      </strong>
                      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>
                        {est.jobNo}
                      </span>
                    </div>
                  </td>

                  {/* Customer */}
                  <td>
                    <div>
                      <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>
                        {est.customerName}
                      </strong>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        {est.customerMobile || est.customerCode || "—"}
                      </span>
                    </div>
                  </td>

                  {/* Grand Total */}
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "14px", fontWeight: 900, color: "#047857" }}>
                      {formatCurrency(est.grandTotal || 0)}
                    </strong>
                  </td>

                  {/* Status */}
                  <td>
                    {getStatusBadge(est.status)}
                  </td>

                  {/* Valid Until */}
                  <td>
                    <span style={{ fontSize: "12px", color: "#475569" }}>
                      {est.validUntil || "7 Days"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectEstimate) onSelectEstimate(est);
                          else navigate(`/v3/estimates/${est.id || est._id || est.estimateId || est.estimateNo}`);
                        }}
                        title="View Details"
                        className="v3-btn-secondary"
                        style={{ padding: "4px 8px", height: "30px", fontSize: "11px" }}
                      >
                        <Eye size={12} /> View
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewEstimate(est)}
                        title="Preview & Print"
                        className="v3-btn-secondary"
                        style={{ padding: "4px 8px", height: "30px", fontSize: "11px", borderColor: "#047857", color: "#047857" }}
                      >
                        <Printer size={12} />
                      </button>

                      {est.status === "DRAFT" && (
                        <button
                          type="button"
                          onClick={() => navigate(`/v3/estimates/${est.id || est._id || est.estimateId}/edit`)}
                          title="Edit Draft"
                          className="v3-btn-secondary"
                          style={{ padding: "4px 8px", height: "30px", fontSize: "11px" }}
                        >
                          <Edit size={12} />
                        </button>
                      )}

                      {est.status === "READY" && (
                        <button
                          type="button"
                          onClick={() => setSendTargetEstimate(est)}
                          title="Send to Customer"
                          className="v3-btn-primary"
                          style={{ padding: "4px 10px", height: "30px", fontSize: "11px", backgroundColor: "#0284c7", borderColor: "#0284c7" }}
                        >
                          <Send size={12} /> Send
                        </button>
                      )}

                      {est.status === "SENT" && (
                        <button
                          type="button"
                          onClick={() => handleCreateRevision(est)}
                          title="Create Revised Version"
                          className="v3-btn-secondary"
                          style={{ padding: "4px 8px", height: "30px", fontSize: "11px" }}
                        >
                          <GitBranch size={12} /> Revise
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Preview Modal */}
      {previewEstimate && (
        <EstimatePreviewModal
          estimate={previewEstimate}
          isOpen={!!previewEstimate}
          onClose={() => setPreviewEstimate(null)}
          onSend={(est) => setSendTargetEstimate(est)}
        />
      )}

      {/* Send Modal */}
      {sendTargetEstimate && (
        <SendEstimateModal
          estimate={sendTargetEstimate}
          isOpen={!!sendTargetEstimate}
          onClose={() => setSendTargetEstimate(null)}
          onConfirmSend={handleSendConfirm}
          isSending={isActionLoading}
        />
      )}
    </div>
  );
}
