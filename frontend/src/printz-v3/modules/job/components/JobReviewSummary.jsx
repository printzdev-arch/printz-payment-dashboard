import React from "react";
import { CheckCircle2, User, Briefcase, Layers, Calendar, Clock, Sparkles } from "lucide-react";
import Badge from "../../../shared/components/Badge";
import { FINISHING_OPTIONS } from "../constants/jobConstants";
import "../../customer/styles/customerV3.css";
import "../styles/jobV3.css";

export default function JobReviewSummary({
  formData,
  customer
}) {
  const getFinishingLabels = (finishingIds = []) => {
    if (!finishingIds || finishingIds.length === 0) return "None (Standard Trim)";
    return finishingIds
      .map((item) => {
        if (!item) return "";
        if (typeof item === "object") {
          return item.name || item.label || item.code || item.notes || "Finishing Option";
        }
        return FINISHING_OPTIONS.find((f) => f.id === item)?.label || String(item);
      })
      .filter(Boolean)
      .join(", ");
  };

  const totalQuantity = (formData.items || []).reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0
  );

  return (
    <div className="v3-card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div className="v3-card-icon" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
          <CheckCircle2 size={18} />
        </div>
        <div>
          <h3 className="v3-card-title">4. Review & Confirm Requirements</h3>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="v3-grid-12" style={{ marginBottom: "18px" }}>
        {/* Customer Snapshot */}
        <div className="v3-col-6">
          <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
              Customer Details
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
              {customer ? customer.name : formData.customerName || "No customer selected"}
            </div>
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
              Code: <strong style={{ fontFamily: "monospace" }}>{customer?.customerCode || formData.customerCode || "—"}</strong> • Phone: {customer?.mobile || formData.customerMobile || "—"}
            </div>
          </div>
        </div>

        {/* Job Parameters */}
        <div className="v3-col-6">
          <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
              Job Information
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              {formData.jobTitle || "Untitled Job Order"}
              <Badge variant={formData.priority === "URGENT" ? "danger" : formData.priority === "HIGH" ? "warning" : "business"}>
                {formData.priority || "NORMAL"}
              </Badge>
            </div>
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
              Delivery: <strong>{formData.expectedDeliveryDate || "Not Specified (Standard SLA)"}</strong> • Source: {formData.source || "WALK_IN"}
            </div>
          </div>
        </div>
      </div>

      {/* Items Breakdown Table */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
        <table className="v3-review-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>#</th>
              <th>Product / Item</th>
              <th>Quantity</th>
              <th>Dimensions</th>
              <th>Printing & Substrate</th>
              <th>Finishing</th>
              <th>Design</th>
            </tr>
          </thead>
          <tbody>
            {(formData.items || []).map((item, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 700, color: "#64748b" }}>{idx + 1}</td>
                <td>
                  <strong style={{ color: "#0f172a", display: "block" }}>
                    {item.itemName || `Item #${idx + 1}`}
                  </strong>
                  {item.notes && (
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Note: {item.notes}</span>
                  )}
                </td>
                <td>
                  <strong style={{ fontSize: "13px", color: "#047857" }}>
                    {item.quantity ? Number(item.quantity).toLocaleString() : "—"} {item.unit || "PCS"}
                  </strong>
                </td>
                <td>
                  {item.size?.type === "CUSTOM" ? (
                    <span>{item.size.width} × {item.size.height} {item.size.unit}</span>
                  ) : (
                    <span>{item.size?.presetName || "Standard"}</span>
                  )}
                </td>
                <td>
                  <div>
                    <span style={{ fontWeight: 600 }}>{item.printing?.side === "DOUBLE_SIDE" ? "Double Side" : "Single Side"}</span> • {item.printing?.colourMode || "Colour"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    {item.material?.paperType || "Art Card"} ({item.material?.gsm || 300} GSM)
                  </div>
                </td>
                <td style={{ maxWidth: "180px", fontSize: "11px" }}>
                  {getFinishingLabels(item.finishing)}
                </td>
                <td>
                  {item.designRequired ? (
                    <span style={{ color: "#047857", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                      <Sparkles size={11} /> Yes
                    </span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>No (Ready)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", padding: "10px 14px", backgroundColor: "#f8fafc", borderRadius: "8px", fontSize: "12px" }}>
        <span style={{ color: "#64748b" }}>
          Total Items: <strong>{formData.items?.length || 0}</strong>
        </span>
        <span style={{ color: "#047857", fontWeight: 700, fontSize: "13px" }}>
          Total Production Units: {totalQuantity.toLocaleString()} Units
        </span>
      </div>
    </div>
  );
}
