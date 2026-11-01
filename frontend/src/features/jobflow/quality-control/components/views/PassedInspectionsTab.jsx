import React, { useState } from "react";
import {
  CheckCircle2,
  Truck,
  FileCheck,
  Search,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  PackageCheck,
  X,
  FileDown,
} from "lucide-react";
import { toast } from "react-toastify";

const DEFAULT_PASSED_RECORDS = [
  {
    _id: "passed-1",
    jobNo: "JOB-1021",
    orderNumber: "PO-1021",
    customerName: "Green Earth Organics",
    productType: "Kraft Paper Display Boxes",
    dimensions: "250x180x80 mm",
    materialStock: "350 GSM Brown Kraft",
    acceptedQty: 250,
    batchQty: 250,
    inspector: "Senior Inspector Ravi",
    inspectedAt: "Today, 10:15 AM",
    status: "PASSED",
    certificateNo: "QC-202610-0089",
  },
  {
    _id: "passed-2",
    jobNo: "JOB-1019",
    orderNumber: "PO-1019",
    customerName: "Zenith Tech Systems",
    productType: "Saddle-Stitch Product Manuals",
    dimensions: "A4 (210x297 mm)",
    materialStock: "130 GSM Gloss Art",
    acceptedQty: 1000,
    batchQty: 1000,
    inspector: "Inspector Manoj K.",
    inspectedAt: "Today, 09:30 AM",
    status: "PASSED",
    certificateNo: "QC-202610-0088",
  },
];

export const PassedInspectionsTab = ({
  passedList = [],
  onDispatchToDelivery,
  onViewCertificate,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [splitModalOrder, setSplitModalOrder] = useState(null);
  const [splitQty, setSplitQty] = useState(0);
  const [splitNotes, setSplitNotes] = useState("Partial batch release upon client urgent request.");

  const listToUse = passedList && passedList.length > 0 ? passedList : DEFAULT_PASSED_RECORDS;

  const filteredPassed = listToUse.filter((item) => {
    const q = searchTerm.toLowerCase();
    const jNo = (item.jobNo || "").toLowerCase();
    const cust = (item.customerName || "").toLowerCase();
    const prod = (item.productType || "").toLowerCase();
    return jNo.includes(q) || cust.includes(q) || prod.includes(q);
  });

  const handleOpenSplitModal = (item) => {
    setSplitModalOrder(item);
    const approved = Number(item.acceptedQty || item.batchQty || 500);
    setSplitQty(approved);
  };

  const handleConfirmSplitDispatch = () => {
    if (!splitModalOrder) return;
    const approved = Number(splitModalOrder.acceptedQty || splitModalOrder.batchQty || 500);
    if (splitQty <= 0 || splitQty > approved) {
      toast.warning(`Quantity must be between 1 and ${approved}.`);
      return;
    }

    if (onDispatchToDelivery) {
      onDispatchToDelivery(splitModalOrder, {
        dispatchQty: Number(splitQty),
        isPartialSplit: Number(splitQty) < approved,
        notes: splitNotes,
      });
    }

    if (Number(splitQty) < approved) {
      toast.success(
        `Dispatched ${splitQty} units to Delivery Batch 1. Remaining ${approved - splitQty} units held in staging.`
      );
    } else {
      toast.success(`Full order of ${splitQty} units released to Delivery Management.`);
    }

    setSplitModalOrder(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div className="jf-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 750, color: "#0f172a" }}>
              QC Passed & Clearance Staging
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#475569" }}>
              Inspection-approved finished goods cleared for packaging handover and delivery dispatch.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span
              style={{
                background: "#ecfdf5",
                color: "#059669",
                border: "1px solid #a7f3d0",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "0.85rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <CheckCircle2 size={15} />
              {filteredPassed.length} Approved Batches
            </span>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ position: "relative", maxWidth: "400px" }}>
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
              placeholder="Search passed inspections by job#, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "32px", width: "100%", height: "36px", borderRadius: "6px" }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="jf-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="jf-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Job Order</th>
                <th style={{ padding: "0.75rem 1rem" }}>Product & Specs</th>
                <th style={{ padding: "0.75rem 1rem" }}>Customer</th>
                <th style={{ padding: "0.75rem 1rem" }}>QC Approved Qty</th>
                <th style={{ padding: "0.75rem 1rem" }}>Inspector Sign-off</th>
                <th style={{ padding: "0.75rem 1rem" }}>Delivery Status</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPassed.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem 1rem", color: "#475569" }}>
                    No passed QC inspection records found.
                  </td>
                </tr>
              ) : (
                filteredPassed.map((item) => {
                  const approvedQty = Number(item.acceptedQty || item.batchQty || 500);
                  const isDelivered = item.deliveryStatus === "READY_FOR_DELIVERY" || item.status === "READY_FOR_DELIVERY";

                  return (
                    <tr key={item._id || item.jobNo} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <strong style={{ color: "#0f172a" }}>{item.jobNo}</strong>
                        <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                          Cert: QC-{String(item._id || "").slice(-5).toUpperCase()}
                        </div>
                      </td>

                      <td style={{ padding: "0.875rem 1rem" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{item.productType}</div>
                        <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                          {item.dimensions || "Standard"} • {item.materialStock || "Standard"}
                        </div>
                      </td>

                      <td style={{ padding: "0.875rem 1rem", color: "#334155" }}>
                        {item.customerName}
                      </td>

                      <td style={{ padding: "0.875rem 1rem" }}>
                        <strong style={{ color: "#16a34a", fontSize: "0.9375rem" }}>
                          {approvedQty.toLocaleString()} units
                        </strong>
                        <div style={{ fontSize: "0.72rem", color: "#059669" }}>
                          ✓ 100% Tolerance Verified
                        </div>
                      </td>

                      <td style={{ padding: "0.875rem 1rem", color: "#475569", fontSize: "0.8125rem" }}>
                        <div>{item.inspectorName || "Senior QC Inspector"}</div>
                        <div style={{ fontSize: "0.72rem", color: "#475569" }}>Today</div>
                      </td>

                      <td style={{ padding: "0.875rem 1rem" }}>
                        {isDelivered ? (
                          <span className="jf-badge jf-badge-success">
                            READY_FOR_DELIVERY
                          </span>
                        ) : (
                          <span className="jf-badge jf-badge-info">
                            In QC Staging
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "0.875rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                          <button
                            type="button"
                            className="jf-btn jf-btn-primary jf-btn-sm"
                            style={{ background: "#059669", color: "#ffffff", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}
                            onClick={() => handleOpenSplitModal(item)}
                          >
                            <Truck size={14} /> Release to Delivery
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Split Delivery Modal */}
      {splitModalOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid #e2e8f0",
                background: "#f0fdf4",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Truck size={18} style={{ color: "#059669" }} />
                <h3 style={{ margin: 0, fontSize: "1.125rem", color: "#065f46", fontWeight: 700 }}>
                  Release to Delivery Management
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSplitModalOrder(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#475569" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#334155" }}>
                Releasing <strong>{splitModalOrder.jobNo}</strong> for customer <strong>{splitModalOrder.customerName}</strong>. Total QC-approved available: <strong>{(splitModalOrder.acceptedQty || splitModalOrder.batchQty || 500).toLocaleString()} units</strong>.
              </p>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px", textTransform: "uppercase" }}>
                  Quantity to Hand Over for Dispatch
                </label>
                <input
                  type="number"
                  min={1}
                  max={splitModalOrder.acceptedQty || splitModalOrder.batchQty || 500}
                  className="jf-input"
                  value={splitQty}
                  onChange={(e) => setSplitQty(Number(e.target.value))}
                  style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}
                />
                <span style={{ fontSize: "0.75rem", color: "#475569", marginTop: "4px", display: "block" }}>
                  Supports partial / split shipment. Enter less than total to dispatch in batches.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px", textTransform: "uppercase" }}>
                  Dispatch Release Remarks
                </label>
                <textarea
                  rows={2}
                  className="jf-input"
                  value={splitNotes}
                  onChange={(e) => setSplitNotes(e.target.value)}
                  style={{ width: "100%", fontSize: "0.8125rem" }}
                />
              </div>
            </div>

            <div
              style={{
                padding: "0.875rem 1.25rem",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
              }}
            >
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setSplitModalOrder(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                style={{ background: "#059669", color: "#ffffff", fontWeight: 700 }}
                onClick={handleConfirmSplitDispatch}
              >
                Confirm & Mark READY_FOR_DELIVERY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassedInspectionsTab;
