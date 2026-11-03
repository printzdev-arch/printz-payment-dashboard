import React, { useState, useEffect } from "react";
import {
  Printer,
  CheckCircle,
  Eye,
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import JobTypeBadge from "../../shared/components/JobTypeBadge";
import EstimateReviewModal from "../components/EstimateReviewModal";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import estimationApi from "../api/estimationApi";
import { printQuotation } from "../utils/printQuotation";
import "../styles/estimation.css";
import { toast } from "react-toastify";

export const EstimationPage = () => {
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "pending", "approved"
  const [loading, setLoading] = useState(false);
  const [estimates, setEstimates] = useState([]);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    fetchEstimates();
  }, []);

  const fetchEstimates = async () => {
    setLoading(true);
    try {
      const res = await estimationApi.getJobOrders({ limit: 500 });
      let list = [];
      if (res?.data?.items && Array.isArray(res.data.items)) {
        list = res.data.items;
      } else if (res?.data && Array.isArray(res.data)) {
        list = res.data;
      } else if (Array.isArray(res)) {
        list = res;
      }

      // Sort newest jobs first
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      const mappedList = list.map((job) => {
        const qty = Number(job.specs?.quantity || job.quantity || 500);

        // Extract finishing services from all possible locations
        const finishingServices = (Array.isArray(job.finishingServices) && job.finishingServices.length > 0)
          ? job.finishingServices
          : (Array.isArray(job.items?.[0]?.finishing) && job.items[0].finishing.length > 0)
          ? job.items[0].finishing.map((f, i) => ({
              id: f.id || i + 1,
              name: f.name || f.option || f.code || "Finishing",
              config: f.notes || f.config || f.option || "Standard",
              unitPrice: Number(f.unitPrice || 0),
              quantity: Number(f.quantity || qty),
              total: Number(f.total || (Number(f.quantity || qty) * Number(f.unitPrice || 0))),
              unit: f.unit || "sheets",
            }))
          : [];

        const finishingTotal = finishingServices.reduce(
          (sum, f) => sum + Number(f.total || (Number(f.unitPrice || 0) * Number(f.quantity || qty))),
          0
        );

        // Base product unit price & cost
        const productUnitRate = Number(
          job.specs?.unitPrice ||
          job.items?.[0]?.unitRate ||
          job.items?.[0]?.unitPrice ||
          (job.specs?.productCost && qty > 0 ? Number(job.specs.productCost) / qty : 0) ||
          (Number(job.subtotal || 0) > finishingTotal && qty > 0 ? (Number(job.subtotal) - finishingTotal) / qty : 0) ||
          (Number(job.grandTotal || 0) > finishingTotal && qty > 0 ? (Number(job.grandTotal) - finishingTotal) / qty : 0) ||
          (qty > 0 && job.subtotal ? Number(job.subtotal) / qty : 1)
        );

        const productBaseCost = Number(
          job.specs?.productCost ||
          (productUnitRate > 0 ? Math.round(qty * productUnitRate * 100) / 100 : 0) ||
          (Number(job.subtotal || 0) > finishingTotal ? Number(job.subtotal) - finishingTotal : Number(job.subtotal || 0))
        );

        const subtotalAmt = productBaseCost;

        // Full final cost must include base product cost plus all finishing services
        const fullFinalCost = Math.max(
          Number(job.grandTotal || 0),
          Number(job.totalAmount || 0),
          Number(job.estimatedPrice || 0),
          productBaseCost + finishingTotal
        );

        const grandAmt = fullFinalCost > 0 ? fullFinalCost : (productBaseCost + finishingTotal);
        const unitRate = productUnitRate;

        const isApproved = job.estimationStatus === "APPROVED" || [
          "DESIGN_QUEUE",
          "DESIGN_ASSIGNED",
          "DESIGN_IN_PROGRESS",
          "SAMPLE_APPROVAL",
          "PRODUCTION_PLANNING",
          "PRINTING",
          "FINISHING",
          "PACKING",
          "QC",
          "REWORK",
          "REPRINT",
          "READY",
          "DELIVERY",
          "COMPLETED",
          "DELIVERED",
        ].includes(String(job.currentStage || "").toUpperCase());

        const displayStatus = isApproved ? "Approved" : "Pending";

        return {
          _id: job._id || job.id,
          estimateNo: `EST-${job.jobNo || job.orderNumber || (job._id || "").slice(-6)}`,
          jobNo: job.jobNo || job.orderNumber || "JO-NEW",
          jobType: job.jobType || job.specs?.jobType || "Print & Design",
          customerName: job.customerName || job.customerSnapshot?.name || job.customerId?.name || "Client",
          phone: job.customerPhone || job.customerSnapshot?.mobile || job.customerId?.mobile || "-",
          branchName: job.branchName || job.branchId?.name || "Main Branch",
          submittedBy: job.createdBy?.name || "Front Desk",
          submittedOn: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Today",
          amount: grandAmt,
          isApproved,
          status: displayStatus,
          currentStage: job.currentStage,
          finishingServices,
          specs: job.specs || {},
          items: (job.items && job.items.length > 0)
            ? job.items.map((it) => {
                const isFinishingLine = it.itemName?.toLowerCase().includes("finishing") || it.itemType === "FINISHING";
                const lineRate = isFinishingLine
                  ? Number(it.unitRate || it.unitPrice || 0)
                  : Number(job.specs?.unitPrice || it.unitRate || it.unitPrice || productUnitRate);
                const lineQty = Number(it.quantity || it.qty || qty);
                const lineAmount = isFinishingLine
                  ? Number(it.amount || it.totalPrice || (lineQty * lineRate))
                  : Number(job.specs?.productCost || (lineQty * lineRate) || productBaseCost);
                return {
                  name: it.itemName || it.name || job.title || "Print Job Order",
                  itemName: it.itemName || it.name || job.title || "Print Job Order",
                  spec: it.description || it.spec || job.specs?.paperType || "Standard Print Specifications",
                  qty: lineQty,
                  unit: it.unit || "PCS",
                  rate: lineRate,
                  amount: lineAmount,
                };
              })
            : [
                {
                  name: job.title || "Print Job Order",
                  itemName: job.title || "Print Job Order",
                  spec: job.specs?.paperType || "Standard Print Specifications",
                  qty: qty,
                  unit: "PCS",
                  rate: productUnitRate,
                  amount: productBaseCost,
                },
              ],
          subtotal: subtotalAmt,
          finishingTotal,
          tax: 0,
          total: grandAmt,
          raw: job,
        };
      });

      setEstimates(mappedList);
    } catch (err) {
      console.error("Failed to fetch estimates:", err);
      setEstimates([]);
    } finally {
      setLoading(false);
    }
  };

  // Clear any active job storage on mount so page remains normal without auto-popups
  useEffect(() => {
    localStorage.removeItem("printz_active_job_id");
  }, []);

  const handleApproveEstimate = async (id, approvalData = {}) => {
    try {
      localStorage.removeItem("printz_active_job_id");
      const idStr = String(id);
      const remarks = typeof approvalData === "string" ? approvalData : (approvalData.remarks || "");
      const payload = typeof approvalData === "object" ? { ...approvalData } : { remarks };
      await estimationApi.approveEstimate(id, payload);

      setEstimates((prev) =>
        prev.map((est) => {
          if (String(est._id) === idStr || String(est.id) === idStr) {
            return {
              ...est,
              status: "Approved",
              isApproved: true,
              amount: payload.grandTotal !== undefined ? payload.grandTotal : est.amount,
              total: payload.grandTotal !== undefined ? payload.grandTotal : est.total,
              subtotal: payload.subtotal !== undefined ? payload.subtotal : est.subtotal,
              tax: payload.taxAmount !== undefined ? payload.taxAmount : est.tax,
            };
          }
          return est;
        })
      );
      await fetchEstimates();
    } catch (err) {
      localStorage.removeItem("printz_active_job_id");
      throw err;
    }
  };

  const filteredEstimates = estimates.filter((est) => {
    if (statusFilter === "pending") return est.status === "Pending";
    if (statusFilter === "approved") return est.status === "Approved";
    return true;
  });

  const pendingCount = estimates.filter((e) => e.status === "Pending").length;
  const approvedCount = estimates.filter((e) => e.status === "Approved").length;

  return (
    <JobFlowLayout title="Estimation & Pricing">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h3 className="jf-card-title" style={{ fontSize: "1.125rem", margin: 0 }}>
              {statusFilter === "pending"
                ? "Pending Estimates (Manager Approval Only)"
                : statusFilter === "approved"
                ? "Approved Estimates"
                : "All Quotations & Cost Estimates"}
            </h3>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className={`jf-btn ${statusFilter === "all" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
              onClick={() => setStatusFilter("all")}
            >
              All ({estimates.length})
            </button>
            <button
              type="button"
              className={`jf-btn ${statusFilter === "pending" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
              onClick={() => setStatusFilter("pending")}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              className={`jf-btn ${statusFilter === "approved" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
              onClick={() => setStatusFilter("approved")}
            >
              Approved ({approvedCount})
            </button>
          </div>
        </div>

        <JobFlowDataTable
          columns={[
            {
              key: "estimateNo",
              label: "Estimate No",
              sortable: true,
              width: "150px",
              render: (val, row) => (
                <span
                  style={{
                    fontWeight: 700,
                    color: "var(--jf-primary, #15803d)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                  }}
                  onClick={() => {
                    setSelectedEstimate(row);
                    setIsReviewModalOpen(true);
                  }}
                  title="Click to view estimate details"
                >
                  {val || "-"}
                </span>
              ),
            },
            {
              key: "jobNo",
              label: "Job No",
              sortable: true,
              width: "150px",
              render: (val, row) => (
                <div>
                  <span style={{ fontWeight: 600, color: "#1e293b", display: "block" }}>{val || "-"}</span>
                  <div style={{ marginTop: "4px" }}>
                    <JobTypeBadge jobType={row.jobType || "Print & Design"} size="sm" />
                  </div>
                </div>
              ),
            },
            {
              key: "customerName",
              label: "Customer",
              sortable: true,
              render: (val, row) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{val || row.customerSnapshot?.name || "Client"}</div>
                  {row.phone && row.phone !== "-" && (
                    <span style={{ fontSize: "0.75rem", color: "#475569" }}>{row.phone}</span>
                  )}
                </div>
              ),
            },
            {
              key: "branchName",
              label: "Branch",
              sortable: true,
              render: (val) => val || "Main Branch",
            },
            {
              key: "submittedBy",
              label: "Submitted By",
              sortable: true,
              render: (val) => val || "Staff",
            },
            {
              key: "submittedOn",
              label: "Submitted On",
              sortable: true,
              render: (val) => val || "-",
            },
            {
              key: "amount",
              label: "Amount (RM)",
              sortable: true,
              render: (val) => <strong>RM {(Number(val) || 0).toFixed(2)}</strong>,
            },
            {
              key: "status",
              label: "Status",
              sortable: true,
              render: (val, row) => <StatusBadge status={row.isApproved ? "Approved" : (val || "Pending")} />,
            },
            {
              key: "action",
              label: "Action",
              sortable: false,
              align: "right",
              render: (_, est) => (
                <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end", alignItems: "center" }}>
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    onClick={() => printQuotation(est)}
                    title="Print Quotation"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0.35rem 0.55rem" }}
                  >
                    <Printer size={15} />
                  </button>
                  {est.isApproved ? (
                    <button
                      type="button"
                      className="jf-btn jf-btn-secondary jf-btn-sm"
                      onClick={() => {
                        setSelectedEstimate(est);
                        setIsReviewModalOpen(true);
                      }}
                      title="View Estimate"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0.35rem 0.55rem" }}
                    >
                      <Eye size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="jf-btn jf-btn-primary jf-btn-sm"
                      onClick={() => {
                        setSelectedEstimate(est);
                        setIsReviewModalOpen(true);
                      }}
                    >
                      <CheckCircle size={14} /> Review
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          data={filteredEstimates}
          loading={loading}
          searchable={true}
          searchPlaceholder="Search estimates by job, customer or estimate #..."
          initialPageSize={10}
          pageSizeOptions={[5, 10, 25, 50]}
          emptyMessage={
            statusFilter === "pending"
              ? "No pending estimates requiring approval."
              : statusFilter === "approved"
              ? "No approved estimates found."
              : "No estimates found in this queue."
          }
        />
      </div>

      {/* Review Modal (Manager Approval) */}
      {isReviewModalOpen && selectedEstimate && (
        <EstimateReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          estimate={selectedEstimate}
          onApprove={handleApproveEstimate}
        />
      )}
    </JobFlowLayout>
  );
};

export default EstimationPage;
