import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Receipt,
  FileText,
  Clock,
  CheckCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Printer,
  Share2,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Eye
} from "lucide-react";
import { toast } from "react-toastify";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import JobTypeBadge from "../../shared/components/JobTypeBadge";
import invoiceApi from "../api/invoiceApi";
import InvoiceEditorSection from "../components/InvoiceEditorSection";
import InvoiceBillModal from "../components/InvoiceBillModal";
import "../styles/invoice.css";

export const InvoicePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [pendingEligibleJobs, setPendingEligibleJobs] = useState([]);
  const [invoicesList, setInvoicesList] = useState([]);
  const [selectedJobForInvoice, setSelectedJobForInvoice] = useState(null);

  // Bill / Tax Invoice Modal state
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [autoPrintBill, setAutoPrintBill] = useState(false);

  const handlePickJob = (jobId) => {
    setSelectedJobForInvoice(jobId);
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  useEffect(() => {
    loadInvoiceData();
  }, [preselectedJobId]);

  const loadInvoiceData = async () => {
    setLoading(true);
    try {
      const [resPending, resInvoices, resJobs] = await Promise.all([
        invoiceApi.getPendingEligibleInvoices().catch(() => null),
        invoiceApi.getInvoices({ limit: 100 }).catch(() => null),
        invoiceApi.getJobOrders({ limit: 100 }).catch(() => null),
      ]);

      // 1. Invoices List
      const invItems = resInvoices?.data?.items || resInvoices?.data?.invoices || resInvoices?.data || (Array.isArray(resInvoices) ? resInvoices : []);
      const formattedInvoices = (Array.isArray(invItems) ? invItems : []).map((inv) => {
        const jObj = inv.jobOrderId && typeof inv.jobOrderId === "object" ? inv.jobOrderId : null;
        const total = Number(inv.grandTotal || inv.invoiceTotal || 0);
        const paid = Number(inv.paidAmount || inv.amountPaid || 0);
        const balance = typeof inv.balanceDue !== "undefined" ? Number(inv.balanceDue) : Math.max(0, total - paid);

        return {
          _id: inv._id || inv.id,
          invoiceNumber: inv.invoiceNumber || `INV-${String(inv._id || "").slice(-6)}`,
          jobOrderId: jObj?._id || inv.jobOrderId,
          jobNo: jObj?.jobNo || inv.jobNo || "JO-CURRENT",
          customerName: inv.customerName || inv.customerSnapshot?.name || jObj?.customerName || "Customer",
          customerPhone: inv.customerPhone || inv.customerSnapshot?.mobile || "N/A",
          grandTotal: total,
          paidAmount: paid,
          balanceDue: balance,
          status: inv.status || "DRAFT",
          paymentStatus: inv.paymentStatus || (balance === 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID"),
          createdAt: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "Today",
          raw: inv,
        };
      });
      setInvoicesList(formattedInvoices);

      // Build invoice map by jobOrderId and jobNo
      const invoiceByJobId = new Map();
      formattedInvoices.forEach((inv) => {
        const jId = String(inv.jobOrderId || "").trim();
        const jNo = String(inv.jobNo || "").trim();
        if (jId && jId !== "undefined") {
          invoiceByJobId.set(jId, inv);
          invoiceByJobId.set(jId.toLowerCase(), inv);
        }
        if (jNo && jNo !== "undefined") {
          invoiceByJobId.set(jNo, inv);
          invoiceByJobId.set(jNo.toLowerCase(), inv);
        }
      });

      // 2. Pending Eligible Jobs
      let pendingItems = resPending?.data?.items || resPending?.data || (Array.isArray(resPending) ? resPending : []);
      if (!Array.isArray(pendingItems) || pendingItems.length === 0) {
        const rawJobs = resJobs?.data?.items || resJobs?.data || [];
        pendingItems = rawJobs.filter((j) =>
          j.estimationStatus === "APPROVED" ||
          j.currentStage === "DELIVERED" ||
          j.status === "DELIVERED" ||
          j.stage === "DELIVERED" ||
          [
            "DESIGN_QUEUE",
            "DESIGN_ASSIGNED",
            "DESIGN_IN_PROGRESS",
            "SAMPLE_APPROVAL",
            "PRODUCTION_PLANNING",
            "PRINTING",
            "FINISHING",
            "PACKING",
            "QC",
            "READY",
            "DELIVERY",
            "DELIVERED",
            "COMPLETED"
          ].includes(String(j.currentStage || "").toUpperCase())
        );
      }

      pendingItems = pendingItems.filter((j) => j.status !== "CANCELLED");

      const formattedPending = (Array.isArray(pendingItems) ? pendingItems : []).map((j) => {
        const id = String(j._id || j.id || j.jobOrderId || "").trim();
        const jNo = String(j.jobNo || j.orderNumber || "").trim();
        const matchedInv =
          invoiceByJobId.get(id) ||
          invoiceByJobId.get(id.toLowerCase()) ||
          invoiceByJobId.get(jNo) ||
          invoiceByJobId.get(jNo.toLowerCase()) ||
          null;

        return {
          _id: id,
          jobOrderId: id,
          jobNo: j.jobNo || j.orderNumber || (matchedInv ? matchedInv.jobNo : `JO-${String(id || "").slice(-6)}`),
          jobType: j.jobType || j.specs?.jobType || j.raw?.jobType || matchedInv?.jobType || "Print Only",
          customerName: j.customerName || j.customerSnapshot?.name || j.customer?.name || (matchedInv ? matchedInv.customerName : "Customer"),
          customerPhone: j.customerPhone || j.customerSnapshot?.mobile || (matchedInv ? matchedInv.customerPhone : "N/A"),
          title: j.title || j.productType || "Print Job Order",
          quantity: j.quantity || 500,
          estimateAmount: Number(j.grandTotal || j.totalAmount || j.estimatedCost || j.estimatedPrice || (matchedInv ? matchedInv.grandTotal : 0)),
          advancePaid: Number(matchedInv ? (matchedInv.paidAmount || matchedInv.advancePaid || 0) : (j.advancePaid || 0)),
          balanceDue: matchedInv ? Number(matchedInv.balanceDue) : Math.max(0, Number(j.grandTotal || j.totalAmount || 0) - Number(j.advancePaid || 0)),
          currentStage: j.currentStage || "DELIVERED",
          invoice: matchedInv || null,
          hasInvoice: Boolean(matchedInv),
          raw: j,
        };
      });
      setPendingEligibleJobs(formattedPending);

      if (preselectedJobId) {
        const matched = formattedPending.find(
          (j) => String(j._id) === String(preselectedJobId) || j.jobNo === preselectedJobId || String(j.jobOrderId) === String(preselectedJobId)
        ) || formattedInvoices.find(
          (inv) => String(inv.jobOrderId) === String(preselectedJobId) || inv.jobNo === preselectedJobId || String(inv._id) === String(preselectedJobId)
        );
        setSelectedJobForInvoice(matched ? (matched._id || matched.jobOrderId) : preselectedJobId);
      }
    } catch (err) {
      console.warn("Failed loading invoice data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (inv) => {
    if (!inv) return;
    setAutoPrintBill(false);
    try {
      if (!inv.items || inv.items.length === 0) {
        const fullRes = await invoiceApi.getInvoiceById(inv._id);
        setViewingInvoice(fullRes?.data || fullRes || inv);
      } else {
        setViewingInvoice(inv);
      }
    } catch {
      setViewingInvoice(inv);
    }
    setIsBillModalOpen(true);
  };

  const handlePrintInvoice = async (inv) => {
    if (!inv) return;
    setAutoPrintBill(true);
    try {
      let full = inv;
      if (!inv.items || inv.items.length === 0) {
        const fullRes = await invoiceApi.getInvoiceById(inv._id);
        full = fullRes?.data || fullRes || inv;
      }
      setViewingInvoice(full);
      setIsBillModalOpen(true);
    } catch {
      setViewingInvoice(inv);
      setIsBillModalOpen(true);
    }
  };

  // Filtering
  const filterPendingList = () => {
    if (!searchQuery.trim()) return pendingEligibleJobs;
    const q = searchQuery.toLowerCase();
    return pendingEligibleJobs.filter(
      (j) =>
        (j.jobNo && j.jobNo.toLowerCase().includes(q)) ||
        (j.customerName && j.customerName.toLowerCase().includes(q))
    );
  };

  // KPIs
  const totalInvoicedVal = invoicesList.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
  const countDraft = invoicesList.filter((i) => i.status === "DRAFT").length;
  const countPendingApproval = invoicesList.filter((i) => i.status === "PENDING_APPROVAL").length;
  const countFinalized = invoicesList.filter((i) => i.status === "FINALIZED" || i.status === "PAID").length;

  return (
    <JobFlowLayout
      title="Commercial Tax Invoicing"
      activeStep={6}
    >
      <div className="invoice-feature-container">
        {/* KPI Stats Grid */}
        <div className="invoice-stats-grid">
          <div className="invoice-stat-card">
            <div style={{ background: "#eff6ff", padding: "0.75rem", borderRadius: "10px", color: "#2563eb" }}>
              <Receipt size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>{pendingEligibleJobs.length}</div>
              <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>Ready for Invoicing</div>
            </div>
          </div>

          <div className="invoice-stat-card">
            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "10px", color: "#475569" }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>{countDraft}</div>
              <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>Draft Invoices</div>
            </div>
          </div>

          <div className="invoice-stat-card">
            <div style={{ background: "#fff7ed", padding: "0.75rem", borderRadius: "10px", color: "#ea580c" }}>
              <Clock size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>{countPendingApproval}</div>
              <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>Variance Pending Approval</div>
            </div>
          </div>

          <div className="invoice-stat-card">
            <div style={{ background: "#f3e8ff", padding: "0.75rem", borderRadius: "10px", color: "#7c3aed" }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>{countFinalized}</div>
              <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>Finalized & Locked</div>
            </div>
          </div>

          <div className="invoice-stat-card">
            <div style={{ background: "#dcfce7", padding: "0.75rem", borderRadius: "10px", color: "#15803d" }}>
              <DollarSign size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>₹{totalInvoicedVal.toFixed(2)}</div>
              <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>Total Billed Value</div>
            </div>
          </div>
        </div>

        {/* ── EMBEDDED INVOICE CREATION & ADVANCE COLLECTION FORM (ABOVE TABLE, NO POPUP) ── */}
        <InvoiceEditorSection
          selectedJobOrderId={selectedJobForInvoice}
          pendingJobs={pendingEligibleJobs}
          onJobSelected={(jobId) => setSelectedJobForInvoice(jobId)}
          onInvoiceFinalized={(finalized) => {
            loadInvoiceData();
            setSelectedJobForInvoice(null);
            if (finalized) {
              setViewingInvoice(finalized);
              setIsBillModalOpen(true);
            }
          }}
          onClear={() => {
            setSelectedJobForInvoice(null);
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("jobId");
                return next;
              },
              { replace: true }
            );
          }}
        />

        {/* Search & Filters */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
            <input
              type="text"
              className="jf-input"
              placeholder="Search by Job No, Invoice No, Customer Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: "2.25rem" }}
            />
            <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#475569" }} />
          </div>

          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            onClick={loadInvoiceData}
            disabled={loading}
            title="Refresh Invoices"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* ── PENDING INVOICING QUEUE ── */}
        <div className="jf-card">
          <div className="jf-card-header">
            <h3 className="jf-card-title">
              <Clock size={18} style={{ color: "var(--jf-primary)" }} />
              Pending Invoicing Queue
            </h3>
            <span style={{ fontSize: "0.85rem", color: "#475569" }}>
              Total: <strong>{filterPendingList().length}</strong> jobs
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="jf-table">
              <thead>
                <tr>
                  <th>Job Order No</th>
                  <th>Customer Details</th>
                  <th>Material & Quantity</th>
                  <th>Initial Estimate</th>
                  <th>Advance Paid</th>
                  <th>Fulfillment Stage</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterPendingList().length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "#475569" }}>
                      No jobs with approved estimates currently pending invoicing.
                    </td>
                  </tr>
                ) : (
                  filterPendingList().map((job) => (
                    <tr key={job._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{job.jobNo}</div>
                        <div style={{ marginTop: "4px" }}>
                          <JobTypeBadge jobType={job.jobType} size="sm" />
                        </div>
                        {job.hasInvoice && (
                          <div style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 700, marginTop: "2px" }}>
                            {job.invoice?.invoiceNumber}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{job.customerName}</div>
                        <div style={{ fontSize: "0.75rem", color: "#475569" }}>{job.customerPhone}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{job.title}</div>
                        <div style={{ fontSize: "0.75rem", color: "#475569" }}>Qty: {job.quantity} pcs</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        ₹{job.estimateAmount.toFixed(2)}
                      </td>
                      <td>
                        {String(job.jobType || "").toUpperCase().includes("PRINT") && !String(job.jobType || "").toUpperCase().includes("DESIGN") ? (
                          <div>
                            <span style={{ color: "#6b21a8", fontWeight: 700, fontSize: "0.85rem" }}>
                              Full: ₹{job.estimateAmount.toFixed(2)}
                            </span>
                            <div style={{ fontSize: "0.68rem", color: "#6b21a8", fontWeight: 600 }}>100% Payment (No Advance)</div>
                          </div>
                        ) : (
                          <span style={{ color: "#059669", fontWeight: 600 }}>
                            ₹{job.advancePaid.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={job.currentStage} domain="delivery" />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {job.hasInvoice ? (
                          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="jf-btn jf-btn-secondary jf-btn-sm"
                              onClick={() => handleViewInvoice(job.invoice)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                              title="View Tax Invoice Bill"
                            >
                              <Eye size={14} /> View
                            </button>
                            <button
                              type="button"
                              className="jf-btn jf-btn-primary jf-btn-sm"
                              onClick={() => handlePrintInvoice(job.invoice)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#0284c7",
                                borderColor: "#0284c7"
                              }}
                              title="Print Invoice / Bill"
                            >
                              <Printer size={14} /> Print Invoice
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="jf-btn jf-btn-primary jf-btn-sm"
                            onClick={() => handlePickJob(job._id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <Receipt size={14} /> Create Draft Invoice
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Bill / Receipt Modal */}
        <InvoiceBillModal
          isOpen={isBillModalOpen}
          invoice={viewingInvoice}
          autoPrint={autoPrintBill}
          onClose={() => {
            setIsBillModalOpen(false);
            setViewingInvoice(null);
            setAutoPrintBill(false);
          }}
        />
      </div>
    </JobFlowLayout>
  );
};

export default InvoicePage;
