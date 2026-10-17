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
  ShieldCheck
} from "lucide-react";
import { toast } from "react-toastify";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import invoiceApi from "../api/invoiceApi";
import InvoiceEditorModal from "../components/InvoiceEditorModal";
import "../styles/invoice.css";

export const InvoicePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");
  const tabParam = searchParams.get("tab");

  // Tab: "PENDING_QUEUE" | "INVOICES_LEDGER"
  const [activeTab, setActiveTab] = useState(() => {
    if (tabParam) {
      const upper = tabParam.toUpperCase();
      if (upper === "INVOICES_LEDGER" || upper === "LEDGER") return "INVOICES_LEDGER";
      if (upper === "PENDING_QUEUE" || upper === "PENDING") return "PENDING_QUEUE";
    }
    return "PENDING_QUEUE";
  });

  useEffect(() => {
    if (tabParam) {
      const upper = tabParam.toUpperCase();
      if (upper === "INVOICES_LEDGER" || upper === "LEDGER") {
        setActiveTab("INVOICES_LEDGER");
      } else if (upper === "PENDING_QUEUE" || upper === "PENDING") {
        setActiveTab("PENDING_QUEUE");
      }
    }
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", newTab);
        return next;
      },
      { replace: true }
    );
  };
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [pendingEligibleJobs, setPendingEligibleJobs] = useState([]);
  const [invoicesList, setInvoicesList] = useState([]);
  const [selectedJobForInvoice, setSelectedJobForInvoice] = useState(null);

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

      // 1. Pending Eligible Jobs (Phase 2 Step 1)
      let pendingItems = resPending?.data?.items || resPending?.data || (Array.isArray(resPending) ? resPending : []);
      if (!Array.isArray(pendingItems) || pendingItems.length === 0) {
        const rawJobs = resJobs?.data?.items || resJobs?.data || [];
        pendingItems = rawJobs.filter((j) => j.currentStage === "DELIVERED" || j.status === "DELIVERED" || j.stage === "DELIVERED");
      }

      const formattedPending = (Array.isArray(pendingItems) ? pendingItems : []).map((j) => {
        const id = j._id || j.id || j.jobOrderId;
        return {
          _id: id,
          jobOrderId: id,
          jobNo: j.jobNo || j.orderNumber || `JO-${String(id || "").slice(-6)}`,
          customerName: j.customerName || j.customerSnapshot?.name || j.customer?.name || "Customer",
          customerPhone: j.customerPhone || j.customerSnapshot?.mobile || "N/A",
          title: j.title || j.productType || "Print Job Order",
          quantity: j.quantity || 500,
          estimateAmount: Number(j.grandTotal || j.totalAmount || j.estimatedCost || j.estimatedPrice || 0),
          advancePaid: Number(j.advancePaid || 0),
          balanceDue: Math.max(0, Number(j.grandTotal || j.totalAmount || 0) - Number(j.advancePaid || 0)),
          currentStage: j.currentStage || "DELIVERED",
          raw: j,
        };
      });
      setPendingEligibleJobs(formattedPending);

      // 2. Invoices List
      const invItems = resInvoices?.data?.items || resInvoices?.data || (Array.isArray(resInvoices) ? resInvoices : []);
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

  const filterInvoicesList = () => {
    let list = invoicesList;
    if (statusFilter !== "ALL") {
      list = list.filter((i) => i.status === statusFilter);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (i) =>
        (i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(q)) ||
        (i.jobNo && i.jobNo.toLowerCase().includes(q)) ||
        (i.customerName && i.customerName.toLowerCase().includes(q))
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
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Ready for Invoicing</div>
            </div>
          </div>

          <div className="invoice-stat-card">
            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "10px", color: "#475569" }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>{countDraft}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Draft Invoices</div>
            </div>
          </div>

          <div className="invoice-stat-card">
            <div style={{ background: "#fff7ed", padding: "0.75rem", borderRadius: "10px", color: "#ea580c" }}>
              <Clock size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>{countPendingApproval}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Variance Pending Approval</div>
            </div>
          </div>

          <div className="invoice-stat-card">
            <div style={{ background: "#f3e8ff", padding: "0.75rem", borderRadius: "10px", color: "#7c3aed" }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>{countFinalized}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Finalized & Locked</div>
            </div>
          </div>

          <div className="invoice-stat-card">
            <div style={{ background: "#dcfce7", padding: "0.75rem", borderRadius: "10px", color: "#15803d" }}>
              <DollarSign size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>₹{totalInvoicedVal.toFixed(2)}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Total Billed Value</div>
            </div>
          </div>
        </div>

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
            <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
          </div>

          {activeTab === "INVOICES_LEDGER" && (
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {["ALL", "DRAFT", "PENDING_APPROVAL", "APPROVED", "FINALIZED", "PAID"].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`jf-btn ${statusFilter === st ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          )}

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

        {/* ── TAB 1: PENDING INVOICING QUEUE ── */}
        {activeTab === "PENDING_QUEUE" && (
          <div className="jf-card">
            <div className="jf-card-header">
              <h3 className="jf-card-title">
                <Clock size={18} style={{ color: "var(--jf-primary)" }} />
                Pending Invoicing Queue
              </h3>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
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
                      <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
                        No delivered jobs currently pending invoicing.
                      </td>
                    </tr>
                  ) : (
                    filterPendingList().map((job) => (
                      <tr key={job._id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{job.jobNo}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{job.customerName}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{job.customerPhone}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{job.title}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Qty: {job.quantity} pcs</div>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          ₹{job.estimateAmount.toFixed(2)}
                        </td>
                        <td style={{ color: "#059669", fontWeight: 600 }}>
                          ₹{job.advancePaid.toFixed(2)}
                        </td>
                        <td>
                          <StatusBadge status={job.currentStage} domain="delivery" />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="jf-btn jf-btn-primary jf-btn-sm"
                            onClick={() => setSelectedJobForInvoice(job._id)}
                          >
                            <Receipt size={14} /> Create Draft Invoice
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: INVOICES LEDGER ── */}
        {activeTab === "INVOICES_LEDGER" && (
          <div className="jf-card">
            <div className="jf-card-header">
              <h3 className="jf-card-title">
                <Receipt size={18} style={{ color: "#7c3aed" }} />
                Invoices Ledger
              </h3>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Total: <strong>{filterInvoicesList().length}</strong> invoices
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="jf-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Linked Job</th>
                    <th>Customer Name</th>
                    <th>Date</th>
                    <th>Grand Total</th>
                    <th>Balance Due</th>
                    <th>Invoice Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filterInvoicesList().length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
                        No invoices found for selected filter.
                      </td>
                    </tr>
                  ) : (
                    filterInvoicesList().map((inv) => (
                      <tr key={inv._id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{inv.invoiceNumber}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{inv.jobNo}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{inv.customerName}</div>
                        </td>
                        <td>{inv.createdAt}</td>
                        <td style={{ fontWeight: 700 }}>₹{inv.grandTotal.toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: inv.balanceDue > 0 ? "#dc2626" : "#059669" }}>
                          ₹{inv.balanceDue.toFixed(2)}
                        </td>
                        <td>
                          <StatusBadge status={inv.status} domain="invoice" />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                            <button
                              type="button"
                              className="jf-btn jf-btn-secondary jf-btn-sm"
                              onClick={() => setSelectedJobForInvoice(inv.jobOrderId || inv._id)}
                              title="Edit / View Tax Invoice"
                            >
                              <FileText size={13} /> Edit
                            </button>
                            <button
                              type="button"
                              className="jf-btn jf-btn-primary jf-btn-sm"
                              onClick={() => navigate(`/jobflow/settlement?jobId=${inv.jobOrderId || inv.jobNo}`)}
                              style={{ background: "#059669", borderColor: "#059669" }}
                            >
                              Settle & Collect →
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Editor Modal */}
      <InvoiceEditorModal
        isOpen={Boolean(selectedJobForInvoice)}
        onClose={() => setSelectedJobForInvoice(null)}
        jobOrderId={selectedJobForInvoice}
        onFinalized={() => {
          loadInvoiceData();
          setActiveTab("INVOICES_LEDGER");
        }}
      />
    </JobFlowLayout>
  );
};

export default InvoicePage;
