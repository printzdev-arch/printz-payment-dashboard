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
import JobFlowLayout from "../components/JobFlowLayout";
import StatusBadge from "../components/StatusBadge";
import EstimateReviewModal from "../components/EstimateReviewModal";
import JobFlowDataTable from "../components/JobFlowDataTable";
import jobFlowApi from "../api/jobFlowApi";
import { toast } from "react-toastify";

export const EstimationPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");

  const [activeTab, setActiveTab] = useState("queue"); // "create", "preview", "queue"
  const [loading, setLoading] = useState(false);
  const [pendingEstimates, setPendingEstimates] = useState([]);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Create Estimate Form State (Image 3 Screen 1)
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
    fetchPendingEstimates();
  }, []);

  const fetchPendingEstimates = async () => {
    setLoading(true);
    try {
      const res = await jobFlowApi.getJobOrders({ currentStage: "ESTIMATE_APPROVAL,ENQUIRY,ESTIMATION" });
      let list = [];
      if (res?.data?.items && Array.isArray(res.data.items)) {
        list = res.data.items;
      } else if (res?.data && Array.isArray(res.data)) {
        list = res.data;
      } else if (Array.isArray(res)) {
        list = res;
      }

      // Filter: only show jobs that are genuinely pending estimate approval
      list = list.filter((job) => {
        if (job.estimationStatus === "APPROVED") return false;
        if (
          job.currentStage &&
          job.currentStage !== "ESTIMATE_APPROVAL" &&
          job.currentStage !== "ESTIMATION" &&
          job.currentStage !== "ENQUIRY"
        ) {
          return false;
        }
        return true;
      });

      const mappedList = list.map((job) => {
        const qty = Number(job.specs?.quantity || job.quantity || 500);
        const totalAmt = Number(job.grandTotal || job.totalAmount || job.estimatedCost || 250);
        const subtotalAmt = Number(job.subtotal || Math.round((totalAmt / 1.08) * 100) / 100 || 250);
        const taxAmt = Number(job.taxAmount || Math.round((subtotalAmt * 0.08) * 100) / 100 || 20);
        const grandAmt = subtotalAmt + taxAmt;
        const unitRate = Math.round((subtotalAmt / qty) * 100) / 100;
        return {
          _id: job._id || job.id,
          estimateNo: `EST-${job.jobNo || job.orderNumber || (job._id || "").slice(-6)}`,
          jobNo: job.jobNo || job.orderNumber || "JO-NEW",
          customerName: job.customerName || job.customerSnapshot?.name || "Client",
          branchName: job.branchName || "Main Branch",
          submittedBy: "Front Desk",
          submittedOn: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Today",
          amount: grandAmt,
          status: job.currentStage === "ESTIMATE_APPROVAL" ? "Pending" : (job.currentStage || "Pending"),
          items: (job.items && job.items.length > 0)
            ? job.items.map((it) => ({
                name: it.itemName || it.name || job.title || "Print Job Order",
                itemName: it.itemName || it.name || job.title || "Print Job Order",
                spec: it.description || it.spec || job.specs?.paperType || "Standard Print Specifications",
                qty: it.quantity || it.qty || qty,
                unit: it.unit || "PCS",
                rate: Number(it.unitRate || it.unitPrice || unitRate),
                amount: Number(it.amount || it.totalPrice || subtotalAmt),
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

      setPendingEstimates(mappedList);
    } catch (err) {
      console.error("Failed to fetch pending estimates:", err);
      setPendingEstimates([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-shift to review modal when redirected with ?jobId=...
  useEffect(() => {
    const targetJobId = preselectedJobId || localStorage.getItem("printz_active_job_id");
    if (!targetJobId) return;

    setActiveTab("queue");

    // Check if job exists in pendingEstimates
    const found = pendingEstimates.find(
      (e) => (e._id || e.id) === targetJobId || e.jobNo === targetJobId
    );

    if (found) {
      setSelectedEstimate(found);
      setIsReviewModalOpen(true);
      return;
    }

    // Otherwise load the job from API or check if already approved
    jobFlowApi.getJobOrderById(targetJobId)
      .then((res) => {
        const job = res?.data || res;
        if (job) {
          // If job has already been approved or moved past ESTIMATE_APPROVAL, do NOT ask to approve again!
          if (
            job.estimationStatus === "APPROVED" ||
            (job.currentStage &&
              job.currentStage !== "ESTIMATE_APPROVAL" &&
              job.currentStage !== "ESTIMATION" &&
              job.currentStage !== "ENQUIRY")
          ) {
            localStorage.removeItem("printz_active_job_id");
            if (preselectedJobId) {
              toast.info(`Job ${job.jobNo || targetJobId} estimate is already approved. Moving to Design Workflow...`);
              navigate(`/jobflow/design?jobId=${job._id || targetJobId}`);
            }
            return;
          }

          const qty = Number(job.specs?.quantity || job.quantity || 500);
          const totalAmt = Number(job.grandTotal || job.totalAmount || job.estimatedCost || 250);
          const subtotalAmt = Number(job.subtotal || Math.round((totalAmt / 1.08) * 100) / 100 || 250);
          const taxAmt = Number(job.taxAmount || Math.round((subtotalAmt * 0.08) * 100) / 100 || 20);
          const grandAmt = subtotalAmt + taxAmt;
          const unitRate = Math.round((subtotalAmt / qty) * 100) / 100;
          const estData = {
            _id: job._id || job.id || preselectedJobId,
            jobNo: job.jobNo || job.orderNumber || "JO-NEW",
            estimateNo: `EST-${job.jobNo || job.orderNumber || (job._id || "").slice(-6)}`,
            customerName: job.customerName || job.customerId?.name || job.customerSnapshot?.name || "Client",
            phone: job.customerId?.phone || job.customerPhone || job.customerSnapshot?.mobile || "-",
            branchName: job.branchName || "Main Branch",
            jobType: job.jobType || "Print & Design",
            items: (job.items && job.items.length > 0)
              ? job.items.map((it) => ({
                  name: it.itemName || it.name || job.title || "Print Job Order",
                  itemName: it.itemName || it.name || job.title || "Print Job Order",
                  spec: it.description || it.spec || job.specs?.paperType || "Standard Print Specifications",
                  qty: it.quantity || it.qty || qty,
                  unit: it.unit || "PCS",
                  rate: Number(it.unitRate || it.unitPrice || unitRate),
                  amount: Number(it.amount || it.totalPrice || subtotalAmt),
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
            status: "Pending",
            staffRemarks: job.notes || "New job created. Awaiting manager approval.",
            raw: job,
          };
          setSelectedEstimate(estData);
          setIsReviewModalOpen(true);
        }
      })
      .catch(() => {});
  }, [preselectedJobId, pendingEstimates]);

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

      await jobFlowApi.submitEstimate(preselectedJobId || "dummy-job-id", payload);
      toast.success("Estimate submitted for Manager Approval!");
      setActiveTab("queue");
      fetchPendingEstimates();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit estimate");
      setActiveTab("queue");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveEstimate = async (id, remarks) => {
    try {
      localStorage.removeItem("printz_active_job_id");
      await jobFlowApi.approveEstimate(id, { remarks });
      setPendingEstimates((prev) => prev.filter((e) => (e._id || e.id) !== id));
      fetchPendingEstimates();
    } catch (err) {
      localStorage.removeItem("printz_active_job_id");
      throw err;
    }
  };

  const handleRejectEstimate = async (id, remarks) => {
    try {
      await jobFlowApi.rejectEstimate(id, { reason: remarks });
      fetchPendingEstimates();
    } catch (err) {
      throw err;
    }
  };

  return (
    <JobFlowLayout
      title="Estimation & Pricing"
      subtitle="Material costs, machine charges, finishing costs, discounts and Manager Approval Queue"
      actions={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className={`jf-btn ${activeTab === "queue" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveTab("queue")}
          >
            Manager Approval Queue ({pendingEstimates.length})
          </button>
          <button
            type="button"
            className={`jf-btn ${activeTab === "create" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveTab("create")}
          >
            <Plus size={14} /> Create Estimate
          </button>
        </div>
      }
    >
      {/* ──────────────── TAB 1: MANAGER APPROVAL QUEUE (Image 3 Screen 3) ──────────────── */}
      {activeTab === "queue" && (
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <h3 className="jf-card-title" style={{ fontSize: "1.125rem", margin: 0 }}>
              Pending Estimates (Manager Approval Only)
            </h3>
            <p className="jf-header-subtitle" style={{ margin: "0.25rem 0 0 0" }}>
              Review and approve estimates submitted by staff. Manager approval unlocks design and production.
            </p>
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
                render: (val) => val || "-",
              },
              {
                key: "customerName",
                label: "Customer",
                sortable: true,
                render: (val) => val || "-",
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
                render: (val) => val || "John Tan",
              },
              {
                key: "submittedOn",
                label: "Submitted On",
                sortable: true,
                render: (val) => val || "12 Apr 2024",
              },
              {
                key: "amount",
                label: "Amount (RM)",
                sortable: true,
                render: (val) => <strong>RM {(val || 210.60).toFixed(2)}</strong>,
              },
              {
                key: "status",
                label: "Status",
                sortable: true,
                render: (val) => <StatusBadge status={val || "Pending"} />,
              },
              {
                key: "action",
                label: "Action",
                sortable: false,
                align: "right",
                render: (_, est) => (
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
                ),
              },
            ]}
            data={pendingEstimates}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search estimates by job, customer or estimate #..."
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            emptyMessage="No pending estimates requiring approval."
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
            <button type="button" className="jf-btn jf-btn-secondary">
              Save as Draft
            </button>
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
      <EstimateReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        estimate={selectedEstimate}
        onApprove={handleApproveEstimate}
        onReject={handleRejectEstimate}
      />
    </JobFlowLayout>
  );
};

export default EstimationPage;
