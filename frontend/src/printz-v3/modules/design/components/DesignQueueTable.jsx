import React, { useState } from "react";
import {
  Clock,
  UserPlus,
  Sparkles,
  ExternalLink,
  Layers
} from "lucide-react";
import Pagination from "../../../shared/components/Pagination";
import "../../customer/styles/customerV3.css";
import "../styles/designV3.css";

export default function DesignQueueTable({
  assignments = [],
  onOpenAssignModal,
  onAutoAllocateSingle,
  onOpenWorkspace
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalRecords = assignments.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Safe Page indexing
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const currentSlice = assignments.slice(startIndex, endIndex);

  // Missing placeholder row count to maintain static table height
  const emptyRowsCount =
    currentSlice.length > 0 && currentSlice.length < pageSize
      ? pageSize - currentSlice.length
      : 0;

  return (
    <div
      className="v3-datatable-card"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      {/* Table Title Bar */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#ffffff"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock size={16} color="#059669" />
          <h3
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 800,
              color: "#0f172a"
            }}
          >
            Design Queue Directory ({totalRecords})
          </h3>
        </div>
      </div>

      {/* Table Element */}
      <div className="v3-table-wrapper" style={{ width: "100%", overflowX: "auto" }}>
        <table
          className="v3-table"
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  color: "#334155",
                  fontWeight: 800,
                  borderBottom: "1px solid #e2e8f0",
                  textTransform: "uppercase",
                  fontSize: "11.5px",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  width: "160px"
                }}
              >
                Job No
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  color: "#334155",
                  fontWeight: 800,
                  borderBottom: "1px solid #e2e8f0",
                  textTransform: "uppercase",
                  fontSize: "11.5px",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  width: "200px"
                }}
              >
                Customer
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  color: "#334155",
                  fontWeight: 800,
                  borderBottom: "1px solid #e2e8f0",
                  textTransform: "uppercase",
                  fontSize: "11.5px",
                  letterSpacing: "0.04em"
                }}
              >
                Job Type / Item
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  color: "#334155",
                  fontWeight: 800,
                  borderBottom: "1px solid #e2e8f0",
                  textTransform: "uppercase",
                  fontSize: "11.5px",
                  letterSpacing: "0.04em",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  width: "110px"
                }}
              >
                Qty
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  color: "#334155",
                  fontWeight: 800,
                  borderBottom: "1px solid #e2e8f0",
                  textTransform: "uppercase",
                  fontSize: "11.5px",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  width: "110px"
                }}
              >
                Due
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  color: "#334155",
                  fontWeight: 800,
                  borderBottom: "1px solid #e2e8f0",
                  textTransform: "uppercase",
                  fontSize: "11.5px",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  width: "140px"
                }}
              >
                SLA
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  color: "#334155",
                  fontWeight: 800,
                  borderBottom: "1px solid #e2e8f0",
                  textTransform: "uppercase",
                  fontSize: "11.5px",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  width: "180px"
                }}
              >
                Designer
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  color: "#334155",
                  fontWeight: 800,
                  borderBottom: "1px solid #e2e8f0",
                  textTransform: "uppercase",
                  fontSize: "11.5px",
                  letterSpacing: "0.04em",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  width: "160px"
                }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {totalRecords === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    padding: "48px 20px",
                    color: "#64748b"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    <Layers size={28} color="#94a3b8" />
                    <strong style={{ fontSize: "14px", color: "#334155" }}>
                      No jobs currently in the design queue
                    </strong>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                      Jobs with design requirements will appear here automatically.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* Real Data Rows */}
                {currentSlice.map((item) => {
                  const isAssigned =
                    item.status === "ASSIGNED" ||
                    item.status === "IN_PROGRESS" ||
                    item.status === "PROOF_PENDING";

                  return (
                    <tr
                      key={item.id || item.assignmentNo}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        height: "56px",
                        transition: "background-color 0.15s ease"
                      }}
                    >
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              color: "#047857",
                              fontSize: "13px"
                            }}
                          >
                            {item.jobNo}
                          </span>
                          <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                            {item.assignmentNo}
                          </span>
                          {item.rejectionReason && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#dc2626",
                                fontWeight: 700,
                                marginTop: "2px"
                              }}
                            >
                              Rejected: "{item.rejectionReason}"
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                          {item.customerName}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            fontFamily: "monospace"
                          }}
                        >
                          {item.customerMobile}
                        </div>
                      </td>

                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#334155", fontSize: "13px" }}>
                          {item.itemName}
                        </div>
                        {item.productType &&
                          item.productType !== item.itemName && (
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              {item.productType}
                            </div>
                          )}
                      </td>

                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          color: "#0f172a"
                        }}
                      >
                        {Number(
                          item.requirementSnapshot?.quantity ||
                            item.quantity ||
                            1
                        ).toLocaleString()}{" "}
                        <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>
                          {item.requirementSnapshot?.unit || item.unit || "PCS"}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: "12px",
                          color: "#475569",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {item.dueDate
                          ? new Date(item.dueDate).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short"
                            })
                          : "—"}
                      </td>

                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        <span
                          className={`v3-sla-pill ${
                            item.slaUrgency?.includes("Overdue")
                            ? "red"
                            : item.slaUrgency?.includes("35m") || item.slaUrgency?.includes("1h")
                            ? "orange"
                            : "green"
                          }`}
                        >
                          ● {item.slaUrgency || "1h 40m"}
                        </span>
                      </td>

                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        {item.assignedDesignerName ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#0f172a"
                            }}
                          >
                            <span
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                background: "#059669",
                                color: "#fff",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                fontWeight: 800
                              }}
                            >
                              {item.assignedDesignerCode || "GD"}
                            </span>
                            {item.assignedDesignerName}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "11.5px",
                              color: "#94a3b8",
                              fontStyle: "italic",
                              backgroundColor: "#f8fafc",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              border: "1px dashed #cbd5e1"
                            }}
                          >
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          whiteSpace: "nowrap"
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            gap: "6px",
                            alignItems: "center",
                            justifyContent: "flex-end"
                          }}
                        >
                          {!isAssigned ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onAutoAllocateSingle(item)}
                                className="v3-btn-secondary"
                                style={{
                                  fontSize: "11.5px",
                                  padding: "4px 8px",
                                  height: "28px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                                title="Auto allocate using round robin"
                              >
                                <Sparkles size={12} color="#059669" /> Auto
                              </button>

                              <button
                                type="button"
                                onClick={() => onOpenAssignModal(item)}
                                className="v3-btn-primary"
                                style={{
                                  fontSize: "11.5px",
                                  padding: "4px 10px",
                                  height: "28px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                              >
                                <UserPlus size={12} /> Assign
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenWorkspace(item)}
                              className="v3-btn-secondary"
                              style={{
                                fontSize: "11.5px",
                                padding: "4px 10px",
                                height: "28px",
                                borderColor: "#059669",
                                color: "#047857",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <ExternalLink size={12} /> Workspace
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Static Placeholder Empty Rows for Remaining Spaces */}
                {emptyRowsCount > 0 &&
                  Array.from({ length: emptyRowsCount }).map((_, emptyIdx) => (
                    <tr
                      key={`placeholder-row-${emptyIdx}`}
                      style={{
                        height: "56px",
                        borderBottom: "1px solid #f8fafc",
                        backgroundColor: "#ffffff",
                        pointerEvents: "none"
                      }}
                    >
                      <td style={{ padding: "10px 14px", color: "transparent", userSelect: "none" }}>&nbsp;</td>
                      <td style={{ padding: "10px 14px", color: "transparent", userSelect: "none" }}>&nbsp;</td>
                      <td style={{ padding: "10px 14px", color: "transparent", userSelect: "none" }}>&nbsp;</td>
                      <td style={{ padding: "10px 14px", color: "transparent", userSelect: "none" }}>&nbsp;</td>
                      <td style={{ padding: "10px 14px", color: "transparent", userSelect: "none" }}>&nbsp;</td>
                      <td style={{ padding: "10px 14px", color: "transparent", userSelect: "none" }}>&nbsp;</td>
                      <td style={{ padding: "10px 14px", color: "transparent", userSelect: "none" }}>&nbsp;</td>
                      <td style={{ padding: "10px 14px", color: "transparent", userSelect: "none" }}>&nbsp;</td>
                    </tr>
                  ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Reusable Enterprise Pagination */}
      <Pagination
        currentPage={safeCurrentPage}
        totalItems={totalRecords}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        pageSizeOptions={[5, 10, 20, 50]}
        showPageSizeSelector={true}
        showTotalCount={true}
      />

      {/* Auto-allocate Preview Footer Note */}
      <div
        style={{
          backgroundColor: "#ecfdf5",
          borderTop: "1px solid #bbf7d0",
          padding: "8px 18px",
          fontSize: "11.5px",
          color: "#065f46"
        }}
      >
        <strong>Round-robin allocation:</strong> Assigns eligible designers automatically based on active workload capacity.
      </div>
    </div>
  );
}
