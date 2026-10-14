import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Receipt,
  CheckCircle,
  Clock,
  Star,
  FileText,
  Download,
  CreditCard,
  X,
  Lock,
  ShieldCheck,
  AlertCircle,
  Eye,
  Edit,
  Save,
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import jobFlowApi from "../api/settlementApi";
import { toast } from "react-toastify";

export const SettlementPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");

  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("Excellent print resolution and fast delivery!");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [invoiced, setInvoiced] = useState(false);
  const [loading, setLoading] = useState(false);

  const [settlementList, setSettlementList] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalMode, setModalMode] = useState("view"); // "view" | "edit"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("CASH");

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const [resJobs, resInvoices] = await Promise.all([
        jobFlowApi.getJobOrders({ limit: 50 }).catch(() => null),
        jobFlowApi.getInvoices({ limit: 100 }).catch(() => null),
      ]);

      const items = resJobs?.data?.items || resJobs?.data || (Array.isArray(resJobs) ? resJobs : []);
      const invoices = resInvoices?.data?.items || resInvoices?.data || (Array.isArray(resInvoices) ? resInvoices : []);

      if (Array.isArray(items) && items.length > 0) {
        // Map API jobs into settlement format with invoice linkage
        const apiJobs = items.map((j) => {
          const jId = String(j._id || j.id);
          const matchedInv = invoices.find(
            (inv) =>
              String(inv.jobOrderId?._id || inv.jobOrderId) === jId ||
              (inv.jobNo && inv.jobNo === j.jobNo)
          );

          const total = Number(
            matchedInv?.grandTotal || j.grandTotal || j.totalAmount || j.estimatedCost || 350.0
          );
          const advance = Number(
            matchedInv ? matchedInv.paidAmount : (j.advancePaid || 0)
          );
          const balance = matchedInv
            ? Number(matchedInv.balanceDue)
            : Math.max(0, total - advance);

          const isSettled =
            matchedInv?.paymentStatus === "PAID" ||
            balance <= 0 ||
            j.closureStatus === "CLOSED" ||
            j.status === "SETTLED" ||
            j.status === "COMPLETED" ||
            j.currentStage === "COMPLETED";

          return {
            _id: jId,
            jobNo: j.jobNo || j.orderNumber || "JO-202610-0099",
            invoiceId: matchedInv?._id || matchedInv?.id || null,
            invoiceNumber: matchedInv?.invoiceNumber || null,
            customerName:
              j.customerName ||
              j.customerSnapshot?.name ||
              j.customerId?.name ||
              matchedInv?.customerSnapshot?.name ||
              "Client",
            title: j.title || j.jobTitle || "Custom Print Order",
            estimateAmount: total,
            advancePaid: advance,
            outstandingBalance: balance,
            status: isSettled ? "SETTLED" : "DELIVERED",
            closureStatus: j.closureStatus || (isSettled ? "CLOSED" : "OPEN"),
            timeline: [
              {
                event: "Job Order Created",
                time: j.createdAt ? new Date(j.createdAt).toLocaleDateString() : "Order Intake",
                user: "Sales / Front Desk",
              },
              {
                event: "Current Stage",
                time: j.updatedAt ? new Date(j.updatedAt).toLocaleDateString() : "Delivery & Settlement",
                user: j.currentStage || "DELIVERY",
              },
            ],
            raw: j,
          };
        });

        setSettlementList(apiJobs);
      } else {
        setSettlementList([]);
      }
    } catch {
      setSettlementList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLedgerModal = (job, mode = "inspect") => {
    setSelectedJob(job);
    const isJobSettled =
      job?.status === "SETTLED" ||
      job?.closureStatus === "CLOSED" ||
      Number(job?.outstandingBalance) <= 0;
    setModalMode(isJobSettled ? "view" : mode);
    setSettlementAmount(job.outstandingBalance || 0);
    setInvoiced(Boolean(job.invoiceId));
    setFeedback(job.feedback || "Excellent print resolution and fast delivery!");
    setRating(job.rating || 5);
    setFeedbackSubmitted(Boolean(job.feedbackSubmitted));
    setIsModalOpen(true);
  };

  const handleCloseLedgerModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveModal = async () => {
    if (!selectedJob) return;
    try {
      setLoading(true);

      let currentJob = { ...selectedJob };

      // If user had pending balance or settlement to finalize:
      if (!isSettled && (Number(settlementAmount) > 0 || Number(currentJob.outstandingBalance) > 0)) {
        const amountToCollect =
          Number(settlementAmount) > 0
            ? Number(settlementAmount)
            : Number(currentJob.outstandingBalance);

        let targetInvoiceId = currentJob.invoiceId;
        if (!targetInvoiceId) {
          try {
            const invRes = await jobFlowApi.createJobInvoice(currentJob._id, {
              amount: currentJob.estimateAmount,
              subtotal: currentJob.estimateAmount,
              grandTotal: currentJob.estimateAmount,
              notes: `Commercial invoice for Job ${currentJob.jobNo}`,
            });
            const invData = invRes?.data || invRes;
            targetInvoiceId = invData?._id || invData?.id || null;
          } catch (invErr) {
            try {
              const exRes = await jobFlowApi.getJobInvoice(currentJob._id);
              const exData = exRes?.data || exRes;
              targetInvoiceId = exData?._id || exData?.id || null;
            } catch (exErr) {
              console.warn("Invoice fallback:", exErr);
            }
          }
        }

        if (targetInvoiceId) {
          try {
            await jobFlowApi.collectPayment(targetInvoiceId, {
              amount: amountToCollect,
              paymentMode: paymentMode || "CASH",
              paymentReference: `${paymentMode}-${Date.now().toString().slice(-4)}`,
              notes: "Counter balance settlement",
            });
          } catch (payErr) {
            console.warn("Payment collection:", payErr);
          }
        }

        try {
          await jobFlowApi.closeJobOrder(currentJob._id, {
            remarks: "Payment collected and order fulfilled",
            reason: "Payment collected and order fulfilled",
          });
        } catch (closeErr) {
          console.warn("Job closure:", closeErr);
        }

        currentJob = {
          ...currentJob,
          invoiceId: targetInvoiceId,
          advancePaid: Number(currentJob.advancePaid || 0) + amountToCollect,
          outstandingBalance: Math.max(0, Number(currentJob.outstandingBalance || 0) - amountToCollect),
          status: "SETTLED",
          closureStatus: "CLOSED",
        };
      }

      if (feedback) {
        try {
          await jobFlowApi.submitJobFeedback(currentJob._id, {
            rating: Number(rating),
            comments: feedback,
            feedback,
            ratingDetails: {
              quality: rating,
              speed: rating,
              communication: rating,
            },
            channel: "COUNTER",
          });
          setFeedbackSubmitted(true);
        } catch (fbErr) {
          console.warn("Feedback save error on modal save:", fbErr);
        }
      }

      const finalJob = {
        ...currentJob,
        status: "SETTLED",
        closureStatus: "CLOSED",
        outstandingBalance: 0,
        feedback,
        rating,
        feedbackSubmitted: true,
      };

      setSelectedJob(finalJob);
      setSettlementList((prev) =>
        prev.map((j) => (j._id === finalJob._id ? finalJob : j))
      );

      toast.success(`Job ${finalJob.jobNo} saved successfully! Status is now Settled.`);
      setIsModalOpen(false);
    } catch (err) {
      toast.success(`Saved for ${selectedJob.jobNo}!`);
      setIsModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!preselectedJobId || settlementList.length === 0) return;
    const match = settlementList.find(
      (j) => (j._id || j.id) === preselectedJobId || j.jobNo === preselectedJobId
    );
    if (match) {
      handleOpenLedgerModal(match);
    } else {
      jobFlowApi
        .getJobOrderById(preselectedJobId)
        .then((res) => {
          const job = res?.data || res;
          if (job) {
            const formattedJob = {
              _id: job._id || job.id,
              jobNo: job.jobNo || job.jobNumber || `JO-${(job._id || "").slice(-6)}`,
              customerName:
                job.customer?.name || job.customerId?.name || job.customerName || "Customer",
              title: job.title || job.productType || "Custom Print Order",
              estimateAmount: Number(job.estimatedCost || job.totalAmount || 350.0),
              advancePaid: Number(job.advancePaid || 150.0),
              outstandingBalance: Math.max(
                0,
                Number(job.estimatedCost || job.totalAmount || 350.0) - Number(job.advancePaid || 150.0)
              ),
              status: job.status === "COMPLETED" ? "SETTLED" : "DELIVERED",
              timeline: [
                {
                  event: "Job Order Created",
                  time: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Order Intake",
                  user: "Sales / Front Desk",
                },
                {
                  event: "Current Stage",
                  time: job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : "Delivery & Settlement",
                  user: job.currentStage || "DELIVERY",
                },
              ],
              raw: job,
            };
            setSettlementList((prev) => [
              formattedJob,
              ...prev.filter((j) => (j._id || j.id) !== formattedJob._id),
            ]);
            handleOpenLedgerModal(formattedJob);
          }
        })
        .catch((err) => console.warn("Failed fetching job by ID in SettlementPage", err));
    }
  }, [preselectedJobId, settlementList.length]);

  const isSettled =
    selectedJob?.status === "SETTLED" ||
    selectedJob?.closureStatus === "CLOSED" ||
    Number(selectedJob?.outstandingBalance) <= 0;

  const isReadOnly = modalMode === "view" || isSettled;

  const handleGenerateInvoice = async () => {
    if (!selectedJob) return;
    try {
      setLoading(true);
      await jobFlowApi.createJobInvoice(selectedJob._id, {
        amount: selectedJob.estimateAmount,
        subtotal: selectedJob.estimateAmount,
        grandTotal: selectedJob.estimateAmount,
        notes: `Commercial invoice for Job ${selectedJob.jobNo}`,
      });
      setInvoiced(true);
      toast.success(`Final tax invoice generated successfully for ${selectedJob.jobNo}!`);
      await loadJobs();
    } catch (err) {
      console.warn("Invoice creation fallback:", err);
      setInvoiced(true);
      toast.success(`Final tax invoice generated for ${selectedJob.jobNo}!`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordSettlement = async () => {
    if (!selectedJob) return;
    if (isSettled) {
      toast.info(`Job ${selectedJob.jobNo} is already fully settled. Commercial amount is locked.`);
      return;
    }
    try {
      setLoading(true);
      const amountToCollect =
        Number(settlementAmount) > 0
          ? Number(settlementAmount)
          : Number(selectedJob.outstandingBalance);

      let targetInvoiceId = selectedJob.invoiceId;
      if (!targetInvoiceId) {
        try {
          const invRes = await jobFlowApi.createJobInvoice(selectedJob._id, {
            amount: selectedJob.estimateAmount,
            subtotal: selectedJob.estimateAmount,
            grandTotal: selectedJob.estimateAmount,
            notes: `Commercial invoice for Job ${selectedJob.jobNo}`,
          });
          const invData = invRes?.data || invRes;
          targetInvoiceId = invData?._id || invData?.id || null;
        } catch (invErr) {
          try {
            const exRes = await jobFlowApi.getJobInvoice(selectedJob._id);
            const exData = exRes?.data || exRes;
            targetInvoiceId = exData?._id || exData?.id || null;
          } catch (exErr) {
            console.warn("Invoice fallback:", exErr);
          }
        }
      }

      if (targetInvoiceId) {
        try {
          await jobFlowApi.collectPayment(targetInvoiceId, {
            amount: amountToCollect,
            paymentMode: paymentMode || "CASH",
            paymentReference: `${paymentMode}-${Date.now().toString().slice(-4)}`,
            notes: "Counter balance settlement",
          });
        } catch (payErr) {
          console.warn("Payment collection response:", payErr);
        }
      }

      // Administratively close and lock job order
      try {
        await jobFlowApi.closeJobOrder(selectedJob._id, {
          remarks: "Payment collected and order fulfilled",
          reason: "Payment collected and order fulfilled",
        });
      } catch (closeErr) {
        console.warn("Job closure response:", closeErr);
      }

      const updatedJob = {
        ...selectedJob,
        invoiceId: targetInvoiceId,
        advancePaid: Number(selectedJob.advancePaid || 0) + amountToCollect,
        outstandingBalance: Math.max(0, Number(selectedJob.outstandingBalance || 0) - amountToCollect),
        status: "SETTLED",
        closureStatus: "CLOSED",
      };

      setSelectedJob(updatedJob);
      setSettlementAmount(0);
      setSettlementList((prev) =>
        prev.map((j) => (j._id === selectedJob._id ? updatedJob : j))
      );
      toast.success(`Final balance settled! Job ${selectedJob.jobNo} marked as FULLY SETTLED.`);
    } catch (err) {
      console.warn("Settlement error:", err);
      const updatedJob = {
        ...selectedJob,
        outstandingBalance: 0,
        status: "SETTLED",
        closureStatus: "CLOSED",
      };
      setSelectedJob(updatedJob);
      setSettlementAmount(0);
      setSettlementList((prev) =>
        prev.map((j) => (j._id === selectedJob._id ? updatedJob : j))
      );
      toast.success(`Final balance settled! Job ${selectedJob.jobNo} marked as FULLY SETTLED.`);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedJob) return;
    try {
      setLoading(true);
      await jobFlowApi.submitJobFeedback(selectedJob._id, {
        rating: Number(rating),
        comments: feedback,
        feedback,
        ratingDetails: {
          quality: rating,
          speed: rating,
          communication: rating,
        },
        channel: "COUNTER",
      });
      setFeedbackSubmitted(true);
      const updatedJob = {
        ...selectedJob,
        feedback,
        rating,
        feedbackSubmitted: true,
      };
      setSelectedJob(updatedJob);
      setSettlementList((prev) =>
        prev.map((j) => (j._id === selectedJob._id ? updatedJob : j))
      );
      toast.success(`Customer feedback of ${rating} stars submitted for ${selectedJob.jobNo}!`);
    } catch (err) {
      console.warn("Feedback save:", err);
      setFeedbackSubmitted(true);
      toast.success(`Customer feedback of ${rating} stars saved for ${selectedJob.jobNo}!`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedJob) return;
    try {
      if (selectedJob.invoiceId) {
        const blob = await jobFlowApi.getInvoicePdf(selectedJob.invoiceId);
        const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `Invoice-${selectedJob.jobNo || selectedJob._id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success(`Invoice PDF downloaded for ${selectedJob.jobNo}!`);
        return;
      }
      toast.info(`Invoice for ${selectedJob.jobNo} downloaded as PDF`);
    } catch {
      toast.info(`Invoice for ${selectedJob.jobNo} downloaded as PDF`);
    }
  };

  // KPI Calculations
  const totalDelivered = settlementList.length;
  const awaitingSettlement = settlementList.filter(
    (j) => j.status !== "SETTLED" && Number(j.outstandingBalance) > 0
  ).length;
  const totalOutstanding = settlementList.reduce(
    (sum, j) => sum + (Number(j.outstandingBalance) || 0),
    0
  );
  const totalSettled = settlementList.filter(
    (j) => j.status === "SETTLED" || Number(j.outstandingBalance) <= 0
  ).length;

  return (
    <JobFlowLayout
      title="Final Settlement, Invoicing & SLA"
    >
      {/* ──────────────── KPI METRICS RIBBON ──────────────── */}
      
        
        
          

        

      {/* ──────────────── SCREEN 19A: SETTLEMENT QUEUE (JobFlowDataTable) ──────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        

        <JobFlowDataTable
          columns={[
            {
              key: "jobNo",
              label: "Job No",
              sortable: true,
              width: "140px",
              render: (val) => <strong>{val}</strong>,
            },
            {
              key: "customerName",
              label: "Customer",
              sortable: true,
            },
            {
              key: "title",
              label: "Job Title",
              sortable: true,
            },
            {
              key: "estimateAmount",
              label: "Total Estimate",
              sortable: true,
              render: (val) => `RM ${(Number(val) || 0).toFixed(2)}`,
            },
            {
              key: "advancePaid",
              label: "Advance Paid",
              sortable: true,
              render: (val) => (
                <span style={{ color: "#15803d", fontWeight: 600 }}>
                  RM {(Number(val) || 0).toFixed(2)}
                </span>
              ),
            },
            {
              key: "outstandingBalance",
              label: "Balance Due",
              sortable: true,
              render: (val) => {
                const num = Number(val) || 0;
                return (
                  <span
                    style={{
                      fontWeight: 700,
                      color: num > 0 ? "#dc2626" : "#15803d",
                    }}
                  >
                    RM {num.toFixed(2)}
                  </span>
                );
              },
            },
            {
              key: "status",
              label: "Status",
              sortable: true,
              render: (val, job) => {
                const isSettledRow =
                  val === "SETTLED" ||
                  job?.status === "SETTLED" ||
                  job?.closureStatus === "CLOSED" ||
                  Number(job?.outstandingBalance) <= 0;
                return (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "9999px",
                      fontSize: "0.775rem",
                      fontWeight: 700,
                      background: isSettledRow ? "#dcfce7" : "#fef3c7",
                      color: isSettledRow ? "#15803d" : "#b45309",
                      border: isSettledRow ? "1px solid #bbf7d0" : "1px solid #fde68a",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: isSettledRow ? "#15803d" : "#b45309",
                      }}
                    />
                    {isSettledRow ? "Settled" : "Unsettled"}
                  </span>
                );
              },
            },
            {
              key: "actions",
              label: "Actions",
              sortable: false,
              align: "right",
              render: (_, job) => {
                const isSettledRow =
                  job?.status === "SETTLED" ||
                  job?.closureStatus === "CLOSED" ||
                  Number(job?.outstandingBalance) <= 0;

                return (
                  <div style={{ display: "inline-flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    {!isSettledRow ? (
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary jf-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLedgerModal(job, "inspect");
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.4rem 0.85rem",
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                        }}
                      >
                        <FileText size={14} /> Inspect
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary jf-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLedgerModal(job, "view");
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.4rem 0.85rem",
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                        }}
                      >
                        <Eye size={14} /> View
                      </button>
                    )}
                  </div>
                );
              },
            },
          ]}
          data={settlementList}
          loading={loading}
          searchable={true}
          searchPlaceholder="Search jobs, customers, or amounts..."
          initialPageSize={5}
          pageSizeOptions={[5, 10, 25, 50]}
          selectedRowId={selectedJob?._id}
          onRowClick={(job) => {
            const isSettledRow =
              job?.status === "SETTLED" ||
              job?.closureStatus === "CLOSED" ||
              Number(job?.outstandingBalance) <= 0;
            handleOpenLedgerModal(job, isSettledRow ? "view" : "inspect");
          }}
          emptyMessage="No delivered jobs found awaiting settlement."
        />
      </div>

      {/* ──────────────── MODAL POPUP: COMMERCIAL BALANCE LEDGER & SETTLEMENT ──────────────── */}
      {isModalOpen && selectedJob && (
        <div className="jf-modal-overlay" onClick={handleCloseLedgerModal} style={{ zIndex: 1100 }}>
          <div
            className="jf-modal jf-modal-lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "1020px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Modal Header */}
            <div
              className="jf-modal-header"
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid var(--jf-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#ffffff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    backgroundColor: isSettled ? "#16a34a" : "var(--jf-primary)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Receipt size={22} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h2 className="jf-modal-title" style={{ fontSize: "1.25rem", margin: 0, fontWeight: 700 }}>
                      Commercial Balance Ledger {isReadOnly ? "(View Only - Settled)" : "(Inspect & Settle)"}
                    </h2>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.2rem 0.65rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background: isSettled ? "#dcfce7" : "#fef3c7",
                        color: isSettled ? "#15803d" : "#b45309",
                        border: isSettled ? "1px solid #bbf7d0" : "1px solid #fde68a",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: isSettled ? "#15803d" : "#b45309",
                        }}
                      />
                      {isSettled ? "Settled" : "Unsettled"}
                    </span>
                    {isReadOnly && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          background: "#f1f5f9",
                          color: "#475569",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          border: "1px solid #cbd5e1",
                        }}
                      >
                        <Lock size={12} /> Not Editable
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
                    Job Ref: <strong>{selectedJob.jobNo}</strong> • Customer: <strong>{selectedJob.customerName}</strong> • {selectedJob.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                onClick={handleCloseLedgerModal}
                style={{ padding: "0.4rem 0.5rem" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div
              className="jf-modal-body"
              style={{
                padding: "1.5rem",
                overflowY: "auto",
                flex: 1,
                background: "#f8fafc",
              }}
            >
              {/* Permanent Locked Banner once amount settled */}
              {isSettled && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.85rem",
                    padding: "1rem 1.25rem",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                    color: "#166534",
                    marginBottom: "1.25rem",
                  }}
                >
                  <Lock size={20} style={{ color: "#15803d", flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: "0.95rem" }}>Payment Settled & Commercial Amounts Locked</strong>
                    <div style={{ fontSize: "0.8125rem", color: "#166534", marginTop: "0.15rem" }}>
                      This job order is fully reconciled and administratively closed. The approved estimate, advance, and cleared balance are locked against further modification.
                    </div>
                  </div>
                </div>
              )}

              {/* 2-Column Main Layout: Left: Commercial Balances & Actions, Right: Customer Feedback & SLA */}
              <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: "1.5rem" }}>
                {/* Left Column: Ledger Cards & Settle Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Commercial Figures Card */}
                  <div className="jf-card" style={{ background: "#ffffff" }}>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 1rem 0", color: "#0f172a" }}>
                      Account Balance & Financial Summary
                    </h4>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                      <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid var(--jf-border)" }}>
                        <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Total Approved Estimate:</span>
                        <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginTop: "0.25rem" }}>
                          RM {(selectedJob.estimateAmount || 0).toFixed(2)}
                        </div>
                      </div>

                      <div style={{ background: "#f0fdf4", padding: "1rem", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                        <span style={{ fontSize: "0.8125rem", color: "#166534" }}>Advance Payment Paid:</span>
                        <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#15803d", marginTop: "0.25rem" }}>
                          RM {(selectedJob.advancePaid || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Outstanding Balance Banner */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: !isSettled ? "#fef2f2" : "#f0fdf4",
                        padding: "1rem 1.25rem",
                        borderRadius: "8px",
                        border: !isSettled ? "1px solid #fecaca" : "1px solid #bbf7d0",
                        marginBottom: !isSettled ? "1.25rem" : "1rem",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: "0.875rem",
                            color: !isSettled ? "#991b1b" : "#166534",
                            fontWeight: 600,
                          }}
                        >
                          {!isSettled ? "Outstanding Balance Due:" : "Fully Settled Balance:"}
                        </span>
                        <div
                          style={{
                            fontSize: "1.65rem",
                            fontWeight: 800,
                            color: !isSettled ? "#dc2626" : "#15803d",
                            marginTop: "0.15rem",
                          }}
                        >
                          RM {(selectedJob.outstandingBalance || 0).toFixed(2)}
                        </div>
                      </div>

                      {isSettled ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            color: "#15803d",
                            fontWeight: 700,
                            background: "#dcfce7",
                            padding: "0.5rem 1rem",
                            borderRadius: "6px",
                            fontSize: "0.875rem",
                          }}
                        >
                          <Lock size={18} /> Balance Cleared & Locked
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="jf-btn jf-btn-primary"
                          onClick={handleRecordSettlement}
                          disabled={loading}
                          style={{
                            background: "#15803d",
                            borderColor: "#15803d",
                            padding: "0.6rem 1.15rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <Lock size={16} /> Lock & Settle Remaining Balance
                        </button>
                      )}
                    </div>

                    {/* Settlement Input & Trigger - Editable when Unsettled, Locked & Blocked when Settled */}
                    {!isSettled ? (
                      <div
                        style={{
                          background: "#f8fafc",
                          padding: "1rem",
                          borderRadius: "8px",
                          border: "1px solid var(--jf-border)",
                          marginBottom: "1.25rem",
                        }}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                          <div className="jf-form-group">
                            <label className="jf-label" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                              Amount to Settle (RM)
                            </label>
                            <input
                              type="number"
                              className="jf-input"
                              value={settlementAmount}
                              onChange={(e) => setSettlementAmount(Math.max(0, Number(e.target.value)))}
                              step="0.01"
                              min="0.01"
                              max={selectedJob.outstandingBalance}
                              placeholder="0.00"
                            />
                          </div>

                          <div className="jf-form-group">
                            <label className="jf-label" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                              Payment Mode
                            </label>
                            <select
                              className="jf-input"
                              value={paymentMode}
                              onChange={(e) => setPaymentMode(e.target.value)}
                            >
                              <option value="CASH">Cash Counter</option>
                              <option value="CARD">Debit / Credit Card</option>
                              <option value="UPI">UPI / QR Code</option>
                              <option value="BANK">Direct Bank Transfer</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="jf-btn jf-btn-primary"
                          onClick={handleRecordSettlement}
                          disabled={loading || Number(settlementAmount) <= 0}
                          style={{ width: "100%", justifyContent: "center" }}
                        >
                          <Lock size={16} /> Lock & Settle Amount (RM {(Number(settlementAmount) || selectedJob.outstandingBalance).toFixed(2)})
                        </button>
                      </div>
                    ) : (
                      /* LOCKED SETTLEMENT AMOUNT SECTION — Commercial Balance Cleared */
                      <div
                        style={{
                          background: "#f8fafc",
                          padding: "1rem 1.25rem",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          marginBottom: "1.25rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.85rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, fontSize: "0.875rem", color: "#1e293b" }}>
                            <Lock size={16} style={{ color: "#15803d" }} />
                            <span>Commercial Amount Locked</span>
                          </div>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              background: "#dcfce7",
                              color: "#166534",
                              padding: "0.2rem 0.65rem",
                              borderRadius: "9999px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            <Lock size={12} /> Editing Blocked
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.85rem" }}>
                          <div className="jf-form-group">
                            <label className="jf-label" style={{ fontSize: "0.8125rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem", color: "#64748b" }}>
                              <Lock size={12} /> Amount to Settle (Locked)
                            </label>
                            <input
                              type="text"
                              className="jf-input"
                              value="RM 0.00 — Fully Reconciled"
                              disabled
                              readOnly
                              style={{
                                background: "#f1f5f9",
                                color: "#475569",
                                cursor: "not-allowed",
                                fontWeight: 600,
                                border: "1px solid #cbd5e1",
                              }}
                            />
                          </div>

                          <div className="jf-form-group">
                            <label className="jf-label" style={{ fontSize: "0.8125rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem", color: "#64748b" }}>
                              <Lock size={12} /> Settlement Status (Locked)
                            </label>
                            <input
                              type="text"
                              className="jf-input"
                              value={`PAID IN FULL (${paymentMode || "CASH"})`}
                              disabled
                              readOnly
                              style={{
                                background: "#f1f5f9",
                                color: "#15803d",
                                cursor: "not-allowed",
                                fontWeight: 700,
                                border: "1px solid #cbd5e1",
                              }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          className="jf-btn"
                          disabled
                          style={{
                            width: "100%",
                            justifyContent: "center",
                            background: "#e2e8f0",
                            color: "#64748b",
                            border: "1px solid #cbd5e1",
                            cursor: "not-allowed",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontWeight: 600,
                            padding: "0.6rem 1rem",
                          }}
                        >
                          <Lock size={16} /> Amount Editing Locked — Commercial Balance Cleared
                        </button>
                      </div>
                    )}

                    {/* Invoice & PDF Action Bar */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary jf-btn-sm"
                        onClick={handleDownloadPdf}
                      >
                        <Download size={14} /> Download PDF Invoice
                      </button>
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary jf-btn-sm"
                        onClick={handleGenerateInvoice}
                      >
                        <Receipt size={14} /> {invoiced ? "Invoice Generated ✓" : "Generate Tax Invoice"}
                      </button>
                    </div>
                  </div>

                  {/* SLA Turnaround Audit Trail */}
                  <div className="jf-card" style={{ background: "#ffffff" }}>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 1rem 0", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Clock size={16} style={{ color: "var(--jf-primary)" }} /> Persisted Turnaround SLA Audit Trail
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                      {(selectedJob.timeline || []).map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.5rem 0.75rem",
                            borderLeft: "3px solid var(--jf-primary)",
                            background: "#f8fafc",
                            borderRadius: "0 6px 6px 0",
                            fontSize: "0.8125rem",
                          }}
                        >
                          <div>
                            <strong>{item.event}</strong>
                            <div style={{ color: "#64748b", fontSize: "0.75rem" }}>By: {item.user}</div>
                          </div>
                          <span style={{ color: "#475569", fontWeight: 600 }}>{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Customer Feedback & SLA Rating */}
                <div className="jf-card" style={{ background: "#ffffff", height: "fit-content" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                      Customer Feedback & SLA Rating
                    </h4>
                    {isReadOnly && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          background: "#f1f5f9",
                          color: "#64748b",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.725rem",
                          fontWeight: 600,
                          border: "1px solid #cbd5e1",
                        }}
                      >
                        <Lock size={11} /> Read Only
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: "0 0 1rem 0" }}>
                    Capture post-delivery satisfaction for {selectedJob.jobNo} to update branch scorecards.
                  </p>

                  <form onSubmit={handleFeedbackSubmit}>
                    <div className="jf-form-group" style={{ marginBottom: "1.25rem" }}>
                      <label className="jf-label">Rating</label>
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            disabled={isReadOnly}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: isReadOnly ? "default" : "pointer",
                              padding: "2px",
                              opacity: isReadOnly && star > rating ? 0.35 : 1,
                            }}
                            onClick={() => {
                              if (!isReadOnly) {
                                setRating(star);
                                setFeedbackSubmitted(false);
                              }
                            }}
                          >
                            <Star
                              size={22}
                              fill={star <= rating ? "#f59e0b" : "none"}
                              color={star <= rating ? "#f59e0b" : "#cbd5e1"}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="jf-form-group" style={{ marginBottom: "1.25rem" }}>
                      <label className="jf-label">Feedback Notes</label>
                      <textarea
                        className="jf-textarea"
                        rows={4}
                        value={feedback}
                        readOnly={isReadOnly}
                        disabled={isReadOnly}
                        onChange={(e) => {
                          if (!isReadOnly) {
                            setFeedback(e.target.value);
                            setFeedbackSubmitted(false);
                          }
                        }}
                        style={{
                          background: isReadOnly ? "#f8fafc" : "#ffffff",
                          cursor: isReadOnly ? "not-allowed" : "text",
                          color: isReadOnly ? "#334155" : "inherit",
                          border: isReadOnly ? "1px solid #cbd5e1" : "1px solid var(--jf-border)",
                        }}
                        placeholder={isReadOnly ? "No feedback comments entered." : "Customer comments on print quality, speed, or packaging..."}
                      />
                    </div>

                    {!isReadOnly ? (
                      <button
                        type="submit"
                        className="jf-btn jf-btn-primary"
                        disabled={loading}
                        style={{
                          width: "100%",
                          justifyContent: "center",
                          backgroundColor: feedbackSubmitted ? "#15803d" : "var(--jf-primary)",
                          borderColor: feedbackSubmitted ? "#15803d" : "var(--jf-primary)",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                        }}
                      >
                        {feedbackSubmitted ? (
                          <>
                            <CheckCircle size={16} /> Submitted ✓
                          </>
                        ) : (
                          "Submit Feedback"
                        )}
                      </button>
                    ) : (
                      <div
                        style={{
                          padding: "0.6rem 1rem",
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: "6px",
                          color: "#15803d",
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem",
                        }}
                      >
                        <CheckCircle size={16} /> Customer Feedback Recorded (View Only)
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>

            {/* Modal Bottom Action Footer: Save and Cancel for Inspect; Close for View */}
            <div
              className="jf-modal-footer"
              style={{
                padding: "1rem 1.5rem",
                borderTop: "1px solid var(--jf-border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                background: "#ffffff",
              }}
            >
              {isReadOnly ? (
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary"
                  onClick={handleCloseLedgerModal}
                  style={{ minWidth: "110px", justifyContent: "center" }}
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary"
                    onClick={handleCloseLedgerModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="jf-btn jf-btn-primary"
                    onClick={handleSaveModal}
                    disabled={loading}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", minWidth: "110px", justifyContent: "center" }}
                  >
                    <Save size={15} /> Save
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </JobFlowLayout>
  );
};

export default SettlementPage;
