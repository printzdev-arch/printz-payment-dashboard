import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Receipt,
  CheckCircle,
  Clock,
  Star,
  FileText,
  CreditCard,
  Lock,
  ShieldCheck,
  AlertCircle,
  Eye,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Wallet,
  Calendar,
  User,
  ArrowRight
} from "lucide-react";
import { toast } from "react-toastify";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import settlementApi from "../api/settlementApi";
import "../styles/settlement.css";

// Phase 2 & 3 Modals
import InvoiceGeneratorModal from "../components/InvoiceGeneratorModal";
import CashierSettlementModal from "../components/CashierSettlementModal";
import JobClosureModal from "../components/JobClosureModal";
import CustomerFeedbackModal from "../components/CustomerFeedbackModal";

export const SettlementPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");
  const tabParam = searchParams.get("tab");

  // Tab State: "PENDING_INVOICE" | "OUTSTANDING_BOARD" | "CLOSURE_QUEUE"
  const [activeTab, setActiveTab] = useState(() => {
    if (tabParam) {
      const upper = tabParam.toUpperCase();
      if (upper === "CLOSURE_QUEUE" || upper === "CLOSURE" || upper === "FEEDBACK") return "CLOSURE_QUEUE";
      if (upper === "OUTSTANDING_BOARD" || upper === "OUTSTANDING" || upper === "CASHIER") return "OUTSTANDING_BOARD";
      if (upper === "PENDING_INVOICE") return "PENDING_INVOICE";
    }
    return "OUTSTANDING_BOARD";
  });

  useEffect(() => {
    if (tabParam) {
      const upper = tabParam.toUpperCase();
      if (upper === "CLOSURE_QUEUE" || upper === "CLOSURE" || upper === "FEEDBACK") {
        setActiveTab("CLOSURE_QUEUE");
      } else if (upper === "OUTSTANDING_BOARD" || upper === "OUTSTANDING" || upper === "CASHIER") {
        setActiveTab("OUTSTANDING_BOARD");
      } else if (upper === "PENDING_INVOICE") {
        setActiveTab("PENDING_INVOICE");
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
  const [paymentFilter, setPaymentFilter] = useState("ALL"); // ALL | UNPAID | PARTIAL | PAID

  // Data
  const [pendingEligibleJobs, setPendingEligibleJobs] = useState([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState([]);
  const [allJobOrders, setAllJobOrders] = useState([]);

  // Modal Controls
  const [selectedJobForInvoice, setSelectedJobForInvoice] = useState(null);
  const [selectedInvoiceForCashier, setSelectedInvoiceForCashier] = useState(null);
  const [selectedJobForClosure, setSelectedJobForClosure] = useState(null);
  const [selectedJobForFeedback, setSelectedJobForFeedback] = useState(null);

  useEffect(() => {
    loadAllSettlementData();
  }, [preselectedJobId]);

  const loadAllSettlementData = async () => {
    setLoading(true);
    try {
      const [resPending, resOutstanding, resJobs] = await Promise.all([
        settlementApi.getPendingEligibleInvoices().catch(() => null),
        settlementApi.getOutstandingInvoices({ limit: 100 }).catch(() => null),
        settlementApi.getJobOrders({ limit: 100 }).catch(() => null),
      ]);

      // 1. Pending Eligible Jobs for Phase 2
      let pendingList = resPending?.data?.items || resPending?.data || (Array.isArray(resPending) ? resPending : []);
      if (!Array.isArray(pendingList) || pendingList.length === 0) {
        // Fallback: check job orders that are delivered or completed
        const rawJobs = resJobs?.data?.items || resJobs?.data || [];
        pendingList = rawJobs.filter((j) => j.currentStage === "DELIVERED" || j.status === "DELIVERED" || j.stage === "DELIVERED");
      }

      const formattedPending = (Array.isArray(pendingList) ? pendingList : []).map((j) => {
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

      // 2. Outstanding Invoices for Phase 3
      let outList = resOutstanding?.data?.items || resOutstanding?.data || (Array.isArray(resOutstanding) ? resOutstanding : []);
      if (!Array.isArray(outList) || outList.length === 0) {
        // Fetch standard invoices
        try {
          const invRes = await settlementApi.getInvoices({ limit: 100 });
          outList = invRes?.data?.items || invRes?.data || [];
        } catch {}
      }

      const formattedOutstanding = (Array.isArray(outList) ? outList : []).map((inv) => {
        const jObj = inv.jobOrderId && typeof inv.jobOrderId === "object" ? inv.jobOrderId : null;
        const total = Number(inv.grandTotal || inv.invoiceTotal || 0);
        const paid = Number(inv.paidAmount || inv.amountPaid || 0);
        const balance = typeof inv.balanceDue !== "undefined" ? Number(inv.balanceDue) : Math.max(0, total - paid);
        const daysOld = inv.createdAt ? Math.floor((Date.now() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

        return {
          _id: inv._id || inv.id,
          invoiceNumber: inv.invoiceNumber || `INV-${String(inv._id || "").slice(-6)}`,
          jobOrderId: jObj?._id || inv.jobOrderId,
          jobNo: jObj?.jobNo || inv.jobNo || "JO-CURRENT",
          customerName: inv.customerName || inv.customerSnapshot?.name || jObj?.customerName || "Customer",
          customerPhone: inv.customerPhone || inv.customerSnapshot?.mobile || "N/A",
          invoiceTotal: total,
          amountPaid: paid,
          balanceDue: balance,
          status: inv.status || "FINALIZED",
          paymentStatus: inv.paymentStatus || (balance === 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID"),
          dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "Net 15",
          daysOld,
          isOverdue: inv.dueDate ? new Date(inv.dueDate).getTime() < Date.now() && balance > 0 : false,
          raw: inv,
        };
      });
      setOutstandingInvoices(formattedOutstanding);

      // 3. All Jobs for Closure view
      const rawJobs = resJobs?.data?.items || resJobs?.data || (Array.isArray(resJobs) ? resJobs : []);
      const formattedJobs = (Array.isArray(rawJobs) ? rawJobs : []).map((j) => ({
        _id: j._id || j.id,
        jobNo: j.jobNo || j.orderNumber || `JO-${String(j._id || "").slice(-6)}`,
        customerName: j.customerName || j.customerSnapshot?.name || "Customer",
        title: j.title || "Print Material",
        totalAmount: Number(j.grandTotal || j.totalAmount || 0),
        closureStatus: j.closureStatus || (j.status === "COMPLETED" ? "CLOSED" : "OPEN"),
        status: j.status || "DELIVERED",
        raw: j,
      }));
      setAllJobOrders(formattedJobs);

      // Preselected job handler
      if (preselectedJobId) {
        const matchPending = formattedPending.find((p) => p._id === preselectedJobId || p.jobNo === preselectedJobId);
        if (matchPending) {
          setActiveTab("PENDING_INVOICE");
          setSelectedJobForInvoice(matchPending._id);
        } else {
          const matchInv = formattedOutstanding.find((inv) => inv.jobOrderId === preselectedJobId || inv.jobNo === preselectedJobId);
          if (matchInv) {
            setActiveTab("OUTSTANDING_BOARD");
            setSelectedInvoiceForCashier(matchInv._id);
          }
        }
      }
    } catch (err) {
      console.warn("Error loading settlement data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists
  const filterPendingList = () => {
    if (!searchQuery.trim()) return pendingEligibleJobs;
    const q = searchQuery.toLowerCase();
    return pendingEligibleJobs.filter(
      (j) =>
        (j.jobNo && j.jobNo.toLowerCase().includes(q)) ||
        (j.customerName && j.customerName.toLowerCase().includes(q))
    );
  };

  const filterOutstandingList = () => {
    let list = outstandingInvoices;
    if (paymentFilter !== "ALL") {
      list = list.filter((i) => i.paymentStatus === paymentFilter);
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

  const filterClosureList = () => {
    if (!searchQuery.trim()) return allJobOrders;
    const q = searchQuery.toLowerCase();
    return allJobOrders.filter(
      (j) =>
        (j.jobNo && j.jobNo.toLowerCase().includes(q)) ||
        (j.customerName && j.customerName.toLowerCase().includes(q))
    );
  };

  // KPI Calculations
  const totalOutstandingDue = outstandingInvoices.reduce((acc, curr) => acc + (curr.balanceDue || 0), 0);
  const totalCollectedToday = outstandingInvoices.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
  const overdueInvoicesCount = outstandingInvoices.filter((i) => i.isOverdue || i.daysOld > 30).length;

  return (
    <JobFlowLayout
      title="Settlement & Payment Collection"
      activeStep={7}
    >
      <div className="settlement-feature-container">
        {/* KPI Summary Cards */}
        <div className="settlement-summary-cards">
          <div className="settlement-card">
            <div style={{ background: "#fef2f2", padding: "0.75rem", borderRadius: "10px", color: "#dc2626" }}>
              <Wallet size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>
                ₹{totalOutstandingDue.toFixed(2)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                Total Outstanding Balance Due
              </div>
            </div>
          </div>

          <div className="settlement-card">
            <div style={{ background: "#dcfce7", padding: "0.75rem", borderRadius: "10px", color: "#15803d" }}>
              <CreditCard size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>
                ₹{totalCollectedToday.toFixed(2)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                Total Collected Payments
              </div>
            </div>
          </div>

          <div className="settlement-card">
            <div style={{ background: "#fff7ed", padding: "0.75rem", borderRadius: "10px", color: "#ea580c" }}>
              <AlertCircle size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>
                {overdueInvoicesCount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                Overdue / 30+ Days Aging
              </div>
            </div>
          </div>

          <div className="settlement-card">
            <div style={{ background: "#eff6ff", padding: "0.75rem", borderRadius: "10px", color: "#2563eb" }}>
              <Lock size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>
                {allJobOrders.filter((j) => j.closureStatus === "CLOSED").length} / {allJobOrders.length}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                Jobs Closed & Locked
              </div>
            </div>
          </div>
        </div>

        {/* Search & Status Filters */}
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

          {activeTab === "OUTSTANDING_BOARD" && (
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {["ALL", "UNPAID", "PARTIAL", "PAID"].map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`jf-btn ${paymentFilter === f ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
                  onClick={() => setPaymentFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            onClick={loadAllSettlementData}
            disabled={loading}
            title="Refresh Settlement Board"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* ── TAB 1: PENDING INVOICING QUEUE (PHASE 2) ── */}
        {activeTab === "PENDING_INVOICE" && (
          <div className="jf-card">
            <div className="jf-card-header">
              <h3 className="jf-card-title">
                <Receipt size={18} style={{ color: "var(--jf-primary)" }} />
                Pending Invoicing Queue
              </h3>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Total: <strong>{filterPendingList().length}</strong> eligible jobs
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="jf-table">
                <thead>
                  <tr>
                    <th>Job Order No</th>
                    <th>Customer Name</th>
                    <th>Print Material</th>
                    <th>Estimated Amount</th>
                    <th>Advance Paid</th>
                    <th>Fulfillment Stage</th>
                    <th style={{ textAlign: "right" }}>Billing Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filterPendingList().length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
                        No pending jobs currently waiting for tax invoicing.
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
                            <Receipt size={14} /> Generate Tax Invoice
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

        {/* ── TAB 2: OUTSTANDING INVOICES BOARD (PHASE 3) ── */}
        {activeTab === "OUTSTANDING_BOARD" && (
          <div className="jf-card">
            <div className="jf-card-header">
              <h3 className="jf-card-title">
                <CreditCard size={18} style={{ color: "#2563eb" }} />
                Outstanding Invoices
              </h3>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Total: <strong>{filterOutstandingList().length}</strong> invoices
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="jf-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Linked Job</th>
                    <th>Customer Name</th>
                    <th>Aging Analysis</th>
                    <th>Total Invoiced</th>
                    <th>Balance Due</th>
                    <th>Payment Status</th>
                    <th style={{ textAlign: "right" }}>Cashier Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filterOutstandingList().length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
                        No invoices match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filterOutstandingList().map((inv) => (
                      <tr key={inv._id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{inv.invoiceNumber}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{inv.jobNo}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{inv.customerName}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{inv.customerPhone}</div>
                        </td>
                        <td>
                          <span className={`settlement-aging-badge ${inv.daysOld > 30 || inv.isOverdue ? "overdue" : "current"}`}>
                            {inv.daysOld > 30 ? `30+ Days (${inv.daysOld}d)` : `0-30 Days (${inv.daysOld}d)`}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          ₹{inv.invoiceTotal.toFixed(2)}
                        </td>
                        <td style={{ fontWeight: 700, color: inv.balanceDue > 0 ? "#dc2626" : "#059669" }}>
                          ₹{inv.balanceDue.toFixed(2)}
                        </td>
                        <td>
                          <StatusBadge status={inv.paymentStatus} domain="settlement" />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                            <button
                              type="button"
                              className="jf-btn jf-btn-secondary jf-btn-sm"
                              onClick={() => setSelectedJobForInvoice(inv.jobOrderId || inv._id)}
                              title="View / Print Tax Invoice"
                            >
                              <FileText size={13} />
                            </button>
                            <button
                              type="button"
                              className="jf-btn jf-btn-primary jf-btn-sm"
                              onClick={() => setSelectedInvoiceForCashier(inv._id)}
                              style={{ background: inv.balanceDue > 0 ? "#059669" : "#475569", borderColor: inv.balanceDue > 0 ? "#059669" : "#475569" }}
                            >
                              <Wallet size={13} /> {inv.balanceDue > 0 ? "Collect Payment" : "View Ledger"}
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

        {/* ── TAB 3: SETTLED & JOB CLOSURE (PHASE 3) ── */}
        {activeTab === "CLOSURE_QUEUE" && (
          <div className="jf-card">
            <div className="jf-card-header">
              <h3 className="jf-card-title">
                <Lock size={18} style={{ color: "#1e293b" }} />
                Job Closure
              </h3>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Total: <strong>{filterClosureList().length}</strong> job orders
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="jf-table">
                <thead>
                  <tr>
                    <th>Job Order No</th>
                    <th>Customer Name</th>
                    <th>Order Value</th>
                    <th>Fulfillment Stage</th>
                    <th>Closure Status</th>
                    <th style={{ textAlign: "right" }}>Admin Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filterClosureList().length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
                        No job orders found.
                      </td>
                    </tr>
                  ) : (
                    filterClosureList().map((job) => (
                      <tr key={job._id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{job.jobNo}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{job.title}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{job.customerName}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          ₹{job.totalAmount.toFixed(2)}
                        </td>
                        <td>
                          <StatusBadge status={job.status} domain="delivery" />
                        </td>
                        <td>
                          <StatusBadge status={job.closureStatus} domain="closure" />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                            <button
                              type="button"
                              className="jf-btn jf-btn-secondary jf-btn-sm"
                              onClick={() => setSelectedJobForFeedback({ id: job._id, jobNo: job.jobNo })}
                              title="Collect 5-Star Feedback & Designer Rating"
                            >
                              <Star size={13} style={{ color: "#eab308" }} /> Rating
                            </button>
                            <button
                              type="button"
                              className="jf-btn jf-btn-primary jf-btn-sm"
                              onClick={() => setSelectedJobForClosure(job._id)}
                              style={{ background: job.closureStatus === "CLOSED" ? "#334155" : "#0f172a", borderColor: "#0f172a" }}
                            >
                              <Lock size={13} /> {job.closureStatus === "CLOSED" ? "View Closure 🔒" : "Verify & Close"}
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

      {/* ── MODALS ── */}
      <InvoiceGeneratorModal
        isOpen={Boolean(selectedJobForInvoice)}
        onClose={() => setSelectedJobForInvoice(null)}
        jobOrderId={selectedJobForInvoice}
        onFinalized={() => {
          loadAllSettlementData();
          setActiveTab("OUTSTANDING_BOARD");
        }}
      />

      <CashierSettlementModal
        isOpen={Boolean(selectedInvoiceForCashier)}
        onClose={() => setSelectedInvoiceForCashier(null)}
        invoiceId={selectedInvoiceForCashier}
        onPaymentComplete={() => {
          loadAllSettlementData();
        }}
      />

      <JobClosureModal
        isOpen={Boolean(selectedJobForClosure)}
        onClose={() => setSelectedJobForClosure(null)}
        jobId={selectedJobForClosure}
        onClosed={() => {
          loadAllSettlementData();
        }}
      />

      <CustomerFeedbackModal
        isOpen={Boolean(selectedJobForFeedback)}
        onClose={() => setSelectedJobForFeedback(null)}
        jobId={selectedJobForFeedback?.id}
        jobNo={selectedJobForFeedback?.jobNo}
        onFeedbackSaved={() => {
          loadAllSettlementData();
        }}
      />
    </JobFlowLayout>
  );
};

export default SettlementPage;
