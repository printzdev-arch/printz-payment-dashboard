import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Calculator,
  Search,
  Plus,
  Printer,
  Download,
  Send,
  CheckCircle,
  FileText,
  RotateCcw,
  Eye,
  Trash2,
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import EstimateReviewModal from "../components/EstimateReviewModal";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import estimationApi from "../api/estimationApi";
import "../styles/estimation.css";
import { toast } from "react-toastify";

export const EstimationPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");

  const [activeTab, setActiveTab] = useState("queue"); // "create", "preview", "queue"
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "pending", "approved"
  const [loading, setLoading] = useState(false);
  const [estimates, setEstimates] = useState([]);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const getStoredRevisionIds = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem("printz_revision_estimate_ids") || "[]"));
    } catch (_) {
      return new Set();
    }
  };
  const [revisionIds, setRevisionIds] = useState(getStoredRevisionIds);

  const [estimateForm, setEstimateForm] = useState({
    jobNo: "JO-202610-0042",
    customerName: "ABC Marketing Sdn Bhd",
    jobType: "Print & Design",
    targetDate: "15 Apr 2024",
    branch: "Main Branch",
    items: [
      { id: 1, name: "Business Cards", spec: "Art Card 260 gsm, 90 x 54 mm, Full Color, Double Sided", qty: 500, unit: "sheets", rate: 0.20, amount: 100.00 },
      { id: 2, name: "Lamination", spec: "Matte (Both Sides)", qty: 500, unit: "sheets", rate: 0.10, amount: 50.00 },
      { id: 3, name: "Cutting", spec: "Trim to A5 (148 x 210 mm)", qty: 500, unit: "sheets", rate: 0.05, amount: 25.00 },
      { id: 4, name: "Packing", spec: "Shrink Wrap", qty: 500, unit: "packs", rate: 0.04, amount: 20.00 },
    ],
    additionalCharges: 0.00,
    discount: 0.00,
    taxRate: 0.08, // 8% SST
    notes: "Standard trade discount applied. Pre-press checks completed.",
    staffRemarks: "Please review and approve pricing as per manager quota.",
  });

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
        const totalAmt = Number(job.grandTotal || job.totalAmount || job.estimatedPrice || job.estimatedCost || 250);
        const subtotalAmt = Number(job.subtotal || Math.round((totalAmt / 1.08) * 100) / 100 || 250);
        const taxAmt = Number(job.taxAmount || Math.round((subtotalAmt * 0.08) * 100) / 100 || 20);
        const grandAmt = totalAmt > 0 ? totalAmt : (subtotalAmt + taxAmt);
        const unitRate = Math.round((subtotalAmt / qty) * 100) / 100;

        const jId = String(job._id || job.id || "");
        const jobNoStr = String(job.jobNo || job.orderNumber || "");
        const isRevision = Boolean(
          revisionIds.has(jId) ||
          revisionIds.has(jobNoStr) ||
          job.estimationStatus === "REJECTED" ||
          job.estimationStatus === "REVISION" ||
          job.currentStage === "REVISION" ||
          job.status === "REVISION" ||
          job.status === "Revision" ||
          job.status === "REJECTED" ||
          job.status === "Rejected" ||
          (job.rejectionReason && job.estimationStatus !== "APPROVED")
        );

        const isApproved = !isRevision && (job.estimationStatus === "APPROVED" || [
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
        ].includes(String(job.currentStage || "").toUpperCase()));

        let displayStatus = "Pending";
        if (isApproved) {
          displayStatus = "Approved";
        } else if (isRevision) {
          displayStatus = "Revision";
        } else if (job.currentStage === "ESTIMATE_APPROVAL") {
          displayStatus = "Pending";
        } else if (job.currentStage === "ESTIMATION") {
          displayStatus = "Pending";
        }

        const finishingServices = (Array.isArray(job.finishingServices) && job.finishingServices.length > 0)
          ? job.finishingServices
          : (Array.isArray(job.items?.[0]?.finishing) && job.items[0].finishing.length > 0)
          ? job.items[0].finishing.map((f, i) => ({
              id: f.id || i + 1,
              name: f.name || f.option || f.code || "Finishing",
              config: f.notes || f.config || f.option || "Standard",
              unitPrice: Number(f.unitPrice || 0.50),
              quantity: Number(f.quantity || qty),
              total: Number(f.total || (Number(f.quantity || qty) * Number(f.unitPrice || 0.50))),
              unit: f.unit || "sheets",
            }))
          : [
              { id: 1, name: "Lamination", config: job.specs?.lamination || "Matte", unitPrice: 0.50, quantity: qty, total: qty * 0.50, unit: "sheets" },
              { id: 2, name: "Cutting", config: "Trim to 90 x 54 mm", unitPrice: 0.10, quantity: qty, total: qty * 0.10, unit: "sheets" },
              { id: 3, name: "Packing", config: "Shrink Wrap", unitPrice: 0.20, quantity: 5, total: 1.00, unit: "packs" },
            ];

        return {
          _id: job._id || job.id,
          estimateNo: `EST-${job.jobNo || job.orderNumber || (job._id || "").slice(-6)}`,
          jobNo: job.jobNo || job.orderNumber || "JO-NEW",
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
            ? job.items.map((it) => ({
                name: it.itemName || it.name || job.title || "Print Job Order",
                itemName: it.itemName || it.name || job.title || "Print Job Order",
                spec: it.description || it.spec || job.specs?.paperType || "Standard Print Specifications",
                qty: it.quantity || it.qty || qty,
                unit: it.unit || "PCS",
                rate: Number(it.unitRate || it.unitPrice || unitRate),
                amount: Number(it.amount || it.totalPrice || (Number(it.quantity || qty) * Number(it.unitRate || unitRate)) || subtotalAmt),
              }))
            : [
                {
                  name: job.title || "Print Job Order",
                  itemName: job.title || "Print Job Order",
                  spec: job.specs?.paperType || "Standard Print Specifications",
                  qty: qty,
                  unit: "PCS",
                  rate: unitRate,
                  amount: subtotalAmt,
                },
              ],
          subtotal: subtotalAmt,
          tax: taxAmt,
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

  // Calculations
  const subtotal = estimateForm.items.reduce((acc, it) => acc + (it.amount || (it.qty * it.rate)), 0);
  const tax = (subtotal + estimateForm.additionalCharges - estimateForm.discount) * estimateForm.taxRate;
  const totalEstimate = subtotal + estimateForm.additionalCharges - estimateForm.discount + tax;

  const handleAddItem = () => {
    const newItem = {
      id: Date.now(),
      name: "New Finishing / Service",
      spec: "Custom specification",
      qty: 100,
      unit: "sheets",
      rate: 0.15,
      amount: 15.00,
    };
    setEstimateForm((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const removeItem = (id) => {
    setEstimateForm((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  };

  const handleSubmitEstimate = async () => {
    setLoading(true);
    try {
      const payload = {
        items: estimateForm.items,
        subtotal,
        tax,
        total: totalEstimate,
        notes: estimateForm.notes,
        staffRemarks: estimateForm.staffRemarks,
      };

      await estimationApi.submitEstimate(preselectedJobId || "dummy-job-id", payload);
      toast.success("Estimate submitted for Manager Approval!");
      setActiveTab("queue");
      fetchEstimates();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit estimate");
      setActiveTab("queue");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveEstimate = async (id, approvalData = {}) => {
    try {
      localStorage.removeItem("printz_active_job_id");
      const idStr = String(id);
      setRevisionIds((prev) => {
        const next = new Set(prev);
        next.delete(idStr);
        if (selectedEstimate?.jobNo) next.delete(String(selectedEstimate.jobNo));
        try {
          localStorage.setItem("printz_revision_estimate_ids", JSON.stringify([...next]));
        } catch (_) {}
        return next;
      });

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

  const handleRejectEstimate = async (id, remarks) => {
    const idStr = String(id);
    const jobNoStr = String(selectedEstimate?.jobNo || "");
    setRevisionIds((prev) => {
      const next = new Set(prev);
      next.add(idStr);
      if (jobNoStr) next.add(jobNoStr);
      try {
        localStorage.setItem("printz_revision_estimate_ids", JSON.stringify([...next]));
      } catch (_) {}
      return next;
    });

    setEstimates((prev) =>
      prev.map((est) =>
        (String(est._id) === idStr || String(est.id) === idStr || (jobNoStr && String(est.jobNo) === jobNoStr))
          ? { ...est, status: "Revision", isApproved: false }
          : est
      )
    );

    // Switch view to revision tab so user immediately sees the returned estimate
    setStatusFilter("revision");

    try {
      await estimationApi.rejectEstimate(id, { reason: remarks });
      await fetchEstimates();
    } catch (err) {
      console.warn("Reject estimate fallback:", err);
      setEstimates((prev) =>
        prev.map((est) =>
          (String(est._id) === idStr || String(est.id) === idStr || (jobNoStr && String(est.jobNo) === jobNoStr))
            ? { ...est, status: "Revision", isApproved: false }
            : est
        )
      );
    }
  };

  const filteredEstimates = estimates.filter((est) => {
    if (statusFilter === "pending") return est.status === "Pending";
    if (statusFilter === "revision") return est.status === "Revision";
    if (statusFilter === "approved") return est.status === "Approved";
    return true;
  });

  const pendingCount = estimates.filter((e) => e.status === "Pending").length;
  const revisionCount = estimates.filter((e) => e.status === "Revision").length;
  const approvedCount = estimates.filter((e) => e.status === "Approved").length;

  return (
    <JobFlowLayout
      title="Estimation & Pricing"
    >
      {/* ──────────────── TAB 1: MANAGER APPROVAL QUEUE (Image 3 Screen 3) ──────────────── */}
      {activeTab === "queue" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h3 className="jf-card-title" style={{ fontSize: "1.125rem", margin: 0 }}>
                {statusFilter === "pending"
                  ? "Pending Estimates (Manager Approval Only)"
                  : statusFilter === "revision"
                  ? "Estimates Returned for Revision"
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
                className={`jf-btn ${statusFilter === "revision" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
                onClick={() => setStatusFilter("revision")}
              >
                Revision ({revisionCount})
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
                render: (val) => <strong>{val || "-"}</strong>,
              },
              {
                key: "jobNo",
                label: "Job No",
                sortable: true,
              },
              {
                key: "customerName",
                label: "Customer",
                sortable: true,
                render: (val, row) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>{val || row.customerSnapshot?.name || "Client"}</div>
                    {row.phone && row.phone !== "-" && (
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{row.phone}</span>
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
                  <button
                    type="button"
                    className={`jf-btn ${est.isApproved ? "jf-btn-secondary" : "jf-btn-primary"} jf-btn-sm`}
                    onClick={() => {
                      setSelectedEstimate(est);
                      setIsReviewModalOpen(true);
                    }}
                  >
                    {est.isApproved ? (
                      <>
                        <Eye size={14} /> Review
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} /> Review
                      </>
                    )}
                  </button>
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
                : statusFilter === "revision"
                ? "No estimates currently marked for revision."
                : "No estimates found."
            }
          />
        </div>
      )}

      {/* ──────────────── TAB 2: CREATE ESTIMATE (Image 3 Screen 1) ──────────────── */}
      {activeTab === "create" && (
        <div className="jf-card">
          <div className="jf-card-header">
            <div>
              <h3 className="jf-card-title">Create Estimate</h3>
              <p className="jf-header-subtitle" style={{ margin: 0 }}>
                Job No: <strong>{estimateForm.jobNo}</strong> • Customer: {estimateForm.customerName} • Branch: {estimateForm.branch}
              </p>
            </div>
            <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={handleAddItem}>
              <Plus size={14} /> Add Item
            </button>
          </div>

          {/* Items & Services Table */}
          <div className="jf-table-wrap" style={{ marginBottom: "1.5rem" }}>
            <table className="jf-table">
              <thead>
                <tr>
                  <th style={{ width: "30px" }}>#</th>
                  <th>Item / Service</th>
                  <th>Specification</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Rate (RM)</th>
                  <th>Amount (RM)</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {estimateForm.items.map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td>{idx + 1}</td>
                    <td><strong>{it.name}</strong></td>
                    <td style={{ fontSize: "0.8125rem", color: "#64748b" }}>{it.spec}</td>
                    <td>{it.qty}</td>
                    <td>{it.unit}</td>
                    <td>RM {it.rate.toFixed(2)}</td>
                    <td><strong>RM {it.amount.toFixed(2)}</strong></td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="jf-btn jf-btn-danger-outline jf-btn-sm"
                        onClick={() => removeItem(it.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Grid: Notes on Left, Summary on Right */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div className="jf-card" style={{ marginBottom: 0 }}>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>Internal Estimation Notes</h4>
              <textarea
                className="jf-textarea"
                rows={4}
                value={estimateForm.notes}
                onChange={(e) => setEstimateForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add internal notes for calculation / machine rates..."
              />
            </div>

            {/* Estimate Summary Box (Image 3 Screen 1) */}
            <div className="jf-card" style={{ marginBottom: 0, background: "#f8fafc" }}>
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem" }}>Estimate Summary</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.875rem" }}>
                <span style={{ color: "#64748b" }}>Subtotal:</span>
                <strong>RM {subtotal.toFixed(2)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.875rem" }}>
                <span style={{ color: "#64748b" }}>Additional Charges:</span>
                <span>RM {estimateForm.additionalCharges.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.875rem" }}>
                <span style={{ color: "#64748b" }}>Discount:</span>
                <span>RM {estimateForm.discount.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.875rem" }}>
                <span style={{ color: "#64748b" }}>Tax (8% SST):</span>
                <span>RM {tax.toFixed(2)}</span>
              </div>
              <div style={{ height: "1px", background: "#e2e8f0", margin: "0.5rem 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", color: "var(--jf-primary)", fontWeight: 700 }}>
                <span>Total Estimate:</span>
                <span>RM {totalEstimate.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              className="jf-btn jf-btn-primary"
              onClick={handleSubmitEstimate}
              disabled={loading}
            >
              <Send size={16} /> Submit for Approval
            </button>
          </div>
        </div>
      )}

      {/* Review Modal (Manager Approval / Revision) */}
      {isReviewModalOpen && selectedEstimate && (
        <EstimateReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          estimate={selectedEstimate}
          onApprove={handleApproveEstimate}
          onReject={handleRejectEstimate}
        />
      )}
    </JobFlowLayout>
  );
};

export default EstimationPage;
