import React, { useState } from "react";
import {
  AlertTriangle,
  RotateCcw,
  Printer,
  Search,
  Clock,
  ChevronRight,
  Filter,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { toast } from "react-toastify";

const INITIAL_FAILED_RECORDS = [
  {
    id: "fail-1025",
    jobNo: "JOB-1025",
    orderNumber: "PO-1025",
    customerName: "City Marketing Agency",
    productType: "Premium Tri-fold Brochure",
    defectType: "Cutting & Bleed Alignment",
    severity: "MAJOR",
    attribution: "INTERNAL_FAULT",
    affectedQty: 100,
    totalQty: 500,
    responsibleOp: "Cutting",
    inspector: "Inspector Manoj K.",
    defectDetails: "Cutter blade offset by 1.5mm along bottom margin, trimming into sub-headline copy.",
    status: "REWORK_DISPATCHED",
    reworkRef: "RW-001",
    date: "Today, 10:45 AM",
  },
  {
    id: "fail-1028",
    jobNo: "JOB-1028",
    orderNumber: "PO-1028",
    customerName: "Apex Retail Solutions",
    productType: "Matte Finish Product Catalog",
    defectType: "Lamination Heat Bubbles",
    severity: "MAJOR",
    attribution: "INTERNAL_FAULT",
    affectedQty: 60,
    totalQty: 300,
    responsibleOp: "Lamination",
    inspector: "Senior Inspector Ravi",
    defectDetails: "Heat bubbles across trailing edge of front covers due to rapid feed rate.",
    status: "REWORK_DISPATCHED",
    reworkRef: "RW-002",
    date: "Today, 09:15 AM",
  },
  {
    id: "fail-1033",
    jobNo: "JOB-1033",
    orderNumber: "PO-1033",
    customerName: "Sunrise Media Group",
    productType: "Gloss Product Roll Labels",
    defectType: "Print Head Ink Spray Smear",
    severity: "CRITICAL",
    attribution: "INTERNAL_FAULT",
    affectedQty: 500,
    totalQty: 500,
    responsibleOp: "Printing",
    inspector: "Inspector Manoj K.",
    defectDetails: "Complete nozzle drop streak across entire 500m web roll. Unrecoverable through targeted rework.",
    status: "REPRINT_PENDING_APPROVAL",
    reworkRef: "REP-0004",
    date: "Yesterday, 04:30 PM",
  },
];

export const FailedInspectionsTab = ({
  onTriggerRework,
  onTriggerReprint,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [selectedFailure, setSelectedFailure] = useState(null);

  const filtered = INITIAL_FAILED_RECORDS.filter((f) => {
    if (severityFilter !== "ALL" && f.severity !== severityFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        f.jobNo.toLowerCase().includes(q) ||
        f.customerName.toLowerCase().includes(q) ||
        f.defectType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div className="jf-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 750, color: "#0f172a" }}>
              Failed QC Inspections & Root Cause Log
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#475569" }}>
              Catalog of defective batches, defect classification, shop vs customer fault attribution, and smart correction routing.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                border: "1px solid #fecaca",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "0.85rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <AlertTriangle size={15} />
              {filtered.length} Flagged Defects
            </span>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: "1.25rem",
            paddingTop: "1rem",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "400px" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#475569",
              }}
            />
            <input
              type="text"
              className="jf-input jf-input-sm"
              placeholder="Search by job#, defect type, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "32px", width: "100%", height: "36px", borderRadius: "6px" }}
            />
          </div>

          <select
            className="jf-input jf-input-sm"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ width: "160px", height: "36px", borderRadius: "6px", fontWeight: 600 }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical (Reprint)</option>
            <option value="MAJOR">Major (Rework)</option>
            <option value="MINOR">Minor</option>
          </select>
        </div>
      </div>

      {/* List */}
      {/* Failed Inspections Data Table */}
      <div className="jf-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="jf-table" style={{ margin: 0, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ width: "150px", padding: "12px 14px" }}>Job & PO #</th>
                <th style={{ minWidth: "180px", padding: "12px 14px" }}>Customer & Product</th>
                <th style={{ minWidth: "240px", padding: "12px 14px" }}>Defect Summary</th>
                <th style={{ width: "120px", padding: "12px 14px", textAlign: "center" }}>Defective Qty</th>
                <th style={{ width: "100px", padding: "12px 14px", textAlign: "center" }}>Severity</th>
                <th style={{ minWidth: "150px", padding: "12px 14px" }}>Fault Attribution</th>
                <th style={{ minWidth: "150px", padding: "12px 14px" }}>Responsible Operation</th>
                <th style={{ width: "120px", padding: "12px 14px", textAlign: "center" }}>Routed Ref</th>
                <th style={{ width: "160px", padding: "12px 14px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "3rem", color: "#475569" }}>
                    <ShieldAlert size={36} style={{ strokeWidth: 1.2, marginBottom: "0.5rem" }} />
                    <div style={{ fontWeight: 600, color: "#475569" }}>No Defect Records Found</div>
                    <div style={{ fontSize: "0.8rem", color: "#475569" }}>
                      Clear of failed inspections matching the specified criteria.
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isCritical = item.severity === "CRITICAL";

                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {/* 1. Job & PO # */}
                      <td style={{ verticalAlign: "middle", padding: "12px 14px" }}>
                        <strong style={{ color: "#0f172a", fontSize: "0.875rem", display: "block" }}>
                          {item.jobNo}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "#475569" }}>
                          {item.orderNumber}
                        </span>
                      </td>

                      {/* 2. Customer & Product */}
                      <td style={{ verticalAlign: "middle", padding: "12px 14px" }}>
                        <strong style={{ color: "#1e293b", fontSize: "0.85rem", display: "block" }}>
                          {item.customerName}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "#475569" }}>
                          {item.productType}
                        </span>
                      </td>

                      {/* 3. Defect Summary */}
                      <td style={{ verticalAlign: "middle", padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                          <AlertTriangle size={14} color={isCritical ? "#dc2626" : "#d97706"} style={{ flexShrink: 0, marginTop: "2px" }} />
                          <div>
                            <span style={{ fontWeight: 600, color: isCritical ? "#b91c1c" : "#92400e", fontSize: "0.8125rem" }}>
                              {item.defectType}
                            </span>
                            <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "2px" }}>
                              {item.defectDetails}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 4. Defective Qty */}
                      <td style={{ verticalAlign: "middle", textAlign: "center", padding: "12px 14px" }}>
                        <span
                          className="jf-badge"
                          style={{
                            background: "#fee2e2",
                            color: "#b91c1c",
                            fontWeight: 750,
                            padding: "3px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          {item.affectedQty} / {item.totalQty}
                        </span>
                      </td>

                      {/* 5. Severity */}
                      <td style={{ verticalAlign: "middle", textAlign: "center", padding: "12px 14px" }}>
                        <span
                          style={{
                            background: isCritical ? "#fee2e2" : "#fef3c7",
                            color: isCritical ? "#b91c1c" : "#92400e",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 750,
                          }}
                        >
                          {item.severity}
                        </span>
                      </td>

                      {/* 6. Fault Attribution */}
                      <td style={{ verticalAlign: "middle", padding: "12px 14px" }}>
                        <span
                          style={{
                            background: item.attribution === "INTERNAL_FAULT" ? "#f1f5f9" : "#e0f2fe",
                            color: item.attribution === "INTERNAL_FAULT" ? "#475569" : "#0369a1",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {item.attribution === "INTERNAL_FAULT" ? "Internal Shop Defect" : "Client File Error"}
                        </span>
                      </td>

                      {/* 7. Responsible Operation */}
                      <td style={{ verticalAlign: "middle", padding: "12px 14px" }}>
                        <strong style={{ color: "#334155", fontSize: "0.8125rem" }}>
                          {item.responsibleOp}
                        </strong>
                        <div style={{ fontSize: "0.72rem", color: "#475569" }}>
                          By {item.inspector}
                        </div>
                      </td>

                      {/* 8. Routed Ref */}
                      <td style={{ verticalAlign: "middle", textAlign: "center", padding: "12px 14px" }}>
                        <span
                          style={{
                            background: "#f8fafc",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: "1px solid #e2e8f0",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#0f172a",
                          }}
                        >
                          {item.reworkRef}
                        </span>
                      </td>

                      {/* 9. Action */}
                      <td style={{ verticalAlign: "middle", textAlign: "right", padding: "12px 14px" }}>
                        {isCritical ? (
                          <button
                            type="button"
                            className="jf-btn jf-btn-danger jf-btn-sm"
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            onClick={() => toast.info(`Viewing Manager Approval for Reprint ${item.reworkRef}.`)}
                          >
                            <Printer size={13} /> Reprint Approval
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="jf-btn jf-btn-secondary jf-btn-sm"
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            onClick={() => toast.info(`Viewing Floor Rework Task ${item.reworkRef}.`)}
                          >
                            <RotateCcw size={13} /> Rework Queue
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FailedInspectionsTab;
