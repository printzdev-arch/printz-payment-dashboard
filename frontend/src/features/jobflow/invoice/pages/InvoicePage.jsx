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
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import invoiceApi from "../api/invoiceApi";
import InvoiceEditorSection from "../components/InvoiceEditorSection";
import InvoiceBillModal from "../components/InvoiceBillModal";
import "../styles/invoice.css";

export const InvoicePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "invoices"

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
        const adv = Number(inv.advancePaid || inv.advanceApplied || jObj?.advancePaid || 0);
        const paid = Number(inv.paidAmount || inv.amountPaid || 0) || adv;
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
          advancePaid: adv,
          advanceApplied: Number(inv.advanceApplied || adv),
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

        const matchedGrandTotal = Number(matchedInv?.grandTotal || 0);
        const jGrandTotal = Number(j.grandTotal || j.totalAmount || 0);
        const jSubtotal = Number(j.subtotal || j.estimatedCost || j.estimatedPrice || 0);

        let estAmt = matchedGrandTotal > 0
          ? matchedGrandTotal
          : (jGrandTotal > 0 ? jGrandTotal : jSubtotal);

        const jAdv = Number(j.advancePaid || j.raw?.advancePaid || 0);
        const invAdv = Number(
          matchedInv?.advancePaid ||
          matchedInv?.advanceApplied ||
          matchedInv?.paidAmount ||
          matchedInv?.raw?.advancePaid ||
          matchedInv?.raw?.advanceApplied ||
          matchedInv?.raw?.amountPaid ||
          matchedInv?.raw?.paidAmount ||
          0
        );
        let resolvedAdvance = Math.max(jAdv, invAdv);

        // If advance was paid on grand total including GST (e.g. 50% of RM 2457 = RM 1228.50 on subtotal RM 2275), align estAmt with grand total
        if (resolvedAdvance > 0 && estAmt > 0 && resolvedAdvance > (estAmt * 0.5)) {
          if (matchedGrandTotal > 0) {
            estAmt = matchedGrandTotal;
          } else if (jGrandTotal > 0 && jGrandTotal > estAmt) {
            estAmt = jGrandTotal;
          } else if (Math.abs(resolvedAdvance * 2 - (estAmt * 1.08)) < 1) {
            estAmt = Math.round(estAmt * 1.08 * 100) / 100;
          } else if (Math.abs(resolvedAdvance * 2 - (estAmt * 1.18)) < 1) {
            estAmt = Math.round(estAmt * 1.18 * 100) / 100;
          }
        }

        const remainingBal = (matchedInv && matchedInv.balanceDue !== undefined && matchedInv.balanceDue !== null && Number(matchedInv.balanceDue) > 0)
          ? Number(matchedInv.balanceDue)
          : (j.balanceDue != null && Number(j.balanceDue) > 0 ? Number(j.balanceDue) : Math.max(0, Math.round((estAmt - resolvedAdvance) * 100) / 100));

        if (resolvedAdvance === 0 && estAmt > 0 && remainingBal < estAmt) {
          resolvedAdvance = Math.max(0, Math.round((estAmt - remainingBal) * 100) / 100);
        }

        return {
          _id: id,
          jobOrderId: id,
          jobNo: j.jobNo || j.orderNumber || (matchedInv ? matchedInv.jobNo : `JO-${String(id || "").slice(-6)}`),
          jobType: j.jobType || j.specs?.jobType || j.raw?.jobType || matchedInv?.jobType || "Print Only",
          customerName: j.customerName || j.customerSnapshot?.name || j.customer?.name || (matchedInv ? matchedInv.customerName : "Customer"),
          customerPhone: j.customerPhone || j.customerSnapshot?.mobile || (matchedInv ? matchedInv.customerPhone : "N/A"),
          title: j.title || j.productType || "Print Job Order",
          quantity: j.quantity || 500,
          estimateAmount: estAmt,
          advancePaid: resolvedAdvance,
          balanceDue: remainingBal,
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

  // KPIs
  const totalInvoicedVal = invoicesList.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
  const countDraft = invoicesList.filter((i) => i.status === "DRAFT").length;
  const countPendingApproval = invoicesList.filter((i) => i.status === "PENDING_APPROVAL").length;
  const countFinalized = invoicesList.filter((i) => i.status === "FINALIZED" || i.status === "PAID").length;

  // Table Columns Definitions
  const pendingColumns = [
    {
      key: "jobNo",
      label: "Job Order No",
      sortable: true,
      width: "160px",
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{val}</div>
          <div style={{ marginTop: "4px" }}>
            <JobTypeBadge jobType={row.jobType} size="sm" />
          </div>
          {row.hasInvoice && (
            <div style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 700, marginTop: "2px" }}>
              {row.invoice?.invoiceNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "customerName",
      label: "Customer Details",
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0f172a" }}>{val}</div>
          <div style={{ fontSize: "0.75rem", color: "#475569" }}>{row.customerPhone}</div>
        </div>
      ),
    },
    {
      key: "title",
      label: "Material & Quantity",
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{val}</div>
          <div style={{ fontSize: "0.75rem", color: "#475569" }}>Qty: {row.quantity} pcs</div>
        </div>
      ),
    },
    {
      key: "estimateAmount",
      label: "Estimate Amount",
      sortable: true,
      render: (val) => (
        <span style={{ fontWeight: 700, color: "#0f172a" }}>
          RM {Number(val || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "advancePaid",
      label: "Advance Paid",
      sortable: true,
      render: (val, row) => {
        const isPrintOnly = String(row.jobType || "").toUpperCase().includes("PRINT") && !String(row.jobType || "").toUpperCase().includes("DESIGN");
        if (isPrintOnly) {
          return (
            <div>
              <span style={{ color: "#6b21a8", fontWeight: 700, fontSize: "0.85rem" }}>
                Full: RM {Number(row.estimateAmount || 0).toFixed(2)}
              </span>
              <div style={{ fontSize: "0.68rem", color: "#6b21a8", fontWeight: 600 }}>100% Payment (No Advance)</div>
            </div>
          );
        }
        const estAmt = Number(row.estimateAmount || 0);
        const balDue = Number(row.balanceDue != null ? row.balanceDue : 0);
        const advVal = Number(val || row.advancePaid || 0) || (estAmt > 0 && balDue < estAmt ? Math.max(0, estAmt - balDue) : 0);

        return (
          <span style={{ color: "#059669", fontWeight: 600 }}>
            RM {advVal.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: "currentStage",
      label: "Fulfillment Stage",
      sortable: true,
      render: (val) => <StatusBadge status={val} domain="delivery" />,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      align: "right",
      render: (_, row) => {
        const isDesignOnly = String(row.jobType || "").toUpperCase().includes("DESIGN") && !String(row.jobType || "").toUpperCase().includes("PRINT");
        const remainingBal = Number(row.balanceDue != null ? row.balanceDue : (row.estimateAmount - (row.advancePaid || 0)));
        const stageUpper = String(row.currentStage || row.raw?.stage || "").toUpperCase();
        const isDesignReady = stageUpper === "READY" || stageUpper === "COMPLETED" || row.raw?.designStatus === "COMPLETED";
        const hasPaidAdvance = Number(row.advancePaid || 0) > 0;
        const needsBalanceCollection = isDesignOnly && isDesignReady && hasPaidAdvance && remainingBal > 0;

        return (
          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
            {needsBalanceCollection ? (
              <button
                type="button"
                className="jf-btn jf-btn-primary jf-btn-sm"
                onClick={() => handlePickJob(row._id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "#059669",
                  borderColor: "#059669",
                  fontWeight: 600,
                  boxShadow: "0 1px 2px rgba(5,150,105,0.2)",
                }}
                title={`Collect remaining balance of RM ${remainingBal.toFixed(2)} and complete order`}
              >
                <Receipt size={14} /> Collect Balance (RM {remainingBal.toFixed(2)})
              </button>
            ) : (!hasPaidAdvance || !row.hasInvoice) ? (
              <button
                type="button"
                className="jf-btn jf-btn-primary jf-btn-sm"
                onClick={() => handlePickJob(row._id)}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <Receipt size={14} /> Create Invoice
              </button>
            ) : null}

            {row.hasInvoice && (
              <>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={() => handleViewInvoice(row.invoice)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                  title="View Tax Invoice Bill"
                >
                  <Eye size={14} /> View
                </button>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary jf-btn-sm"
                  onClick={() => handlePrintInvoice(row.invoice)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#0284c7",
                    borderColor: "#0284c7",
                  }}
                  title="Print Invoice / Bill"
                >
                  <Printer size={14} /> Print Invoice
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const invoiceColumns = [
    {
      key: "invoiceNumber",
      label: "Invoice No",
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
          onClick={() => handleViewInvoice(row.raw || row)}
          title="Click to view invoice details"
        >
          {val || "-"}
        </span>
      ),
    },
    {
      key: "jobNo",
      label: "Job Order No",
      sortable: true,
      width: "140px",
      render: (val) => (
        <span style={{ fontWeight: 600, color: "#1e293b" }}>{val || "-"}</span>
      ),
    },
    {
      key: "customerName",
      label: "Customer",
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0f172a" }}>{val || "Customer"}</div>
          {row.customerPhone && row.customerPhone !== "N/A" && (
            <span style={{ fontSize: "0.75rem", color: "#475569" }}>{row.customerPhone}</span>
          )}
        </div>
      ),
    },
    {
      key: "grandTotal",
      label: "Invoice Total",
      sortable: true,
      render: (val) => (
        <strong style={{ color: "#0f172a" }}>RM {Number(val || 0).toFixed(2)}</strong>
      ),
    },
    {
      key: "paidAmount",
      label: "Paid / Advance",
      sortable: true,
      render: (val) => (
        <span style={{ color: "#059669", fontWeight: 600 }}>
          RM {Number(val || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "balanceDue",
      label: "Balance Due",
      sortable: true,
      render: (val) => {
        const b = Number(val || 0);
        return (
          <span style={{ color: b > 0 ? "#dc2626" : "#16a34a", fontWeight: 700 }}>
            RM {b.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: "paymentStatus",
      label: "Payment Status",
      sortable: true,
      render: (val) => {
        const isPaid = val === "PAID";
        const isPartial = val === "PARTIAL";
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.2rem 0.55rem",
              borderRadius: "9999px",
              fontSize: "0.725rem",
              fontWeight: 700,
              background: isPaid ? "#dcfce7" : isPartial ? "#fef3c7" : "#fee2e2",
              color: isPaid ? "#15803d" : isPartial ? "#b45309" : "#b91c1c",
            }}
          >
            {val || "UNPAID"}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "Date",
      sortable: true,
      render: (val) => val || "Today",
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      align: "right",
      render: (_, row) => (
        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            onClick={() => handleViewInvoice(row.raw || row)}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            title="View Invoice"
          >
            <Eye size={14} /> View
          </button>
          <button
            type="button"
            className="jf-btn jf-btn-primary jf-btn-sm"
            onClick={() => handlePrintInvoice(row.raw || row)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "#0284c7",
              borderColor: "#0284c7",
            }}
            title="Print Invoice"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      ),
    },
  ];

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
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>RM {totalInvoicedVal.toFixed(2)}</div>
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

        {/* ── INTERACTIVE TABS & PAGINATED DATATABLE ── */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="jf-btn"
            onClick={() => setActiveTab("pending")}
            style={{
              background: activeTab === "pending" ? "var(--jf-primary, #15803d)" : "#ffffff",
              color: activeTab === "pending" ? "#ffffff" : "#475569",
              borderColor: activeTab === "pending" ? "var(--jf-primary, #15803d)" : "#cbd5e1",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1.1rem",
              borderRadius: "8px",
              boxShadow: activeTab === "pending" ? "0 2px 4px rgba(21,128,61,0.2)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <Clock size={16} />
            <span>Pending Invoicing Queue</span>
            <span
              style={{
                background: activeTab === "pending" ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                color: activeTab === "pending" ? "#ffffff" : "#0f172a",
                padding: "0.15rem 0.5rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {pendingEligibleJobs.length}
            </span>
          </button>

          <button
            type="button"
            className="jf-btn"
            onClick={() => setActiveTab("invoices")}
            style={{
              background: activeTab === "invoices" ? "var(--jf-primary, #15803d)" : "#ffffff",
              color: activeTab === "invoices" ? "#ffffff" : "#475569",
              borderColor: activeTab === "invoices" ? "var(--jf-primary, #15803d)" : "#cbd5e1",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1.1rem",
              borderRadius: "8px",
              boxShadow: activeTab === "invoices" ? "0 2px 4px rgba(21,128,61,0.2)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <Receipt size={16} />
            <span>Billed Invoices & Tax Bills</span>
            <span
              style={{
                background: activeTab === "invoices" ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                color: activeTab === "invoices" ? "#ffffff" : "#0f172a",
                padding: "0.15rem 0.5rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {invoicesList.length}
            </span>
          </button>
        </div>

        {/* ── TAB CONTENT WITH PAGINATION & ALL FEATURES ── */}
        {activeTab === "pending" && (
          <JobFlowDataTable
            key="pending-table"
            columns={pendingColumns}
            data={pendingEligibleJobs}
            loading={loading}
            sortable={true}
            defaultSortKey="jobNo"
            defaultSortDir="desc"
            searchable={true}
            searchPlaceholder="Search pending jobs by job no, customer, material..."
            searchKeys={["jobNo", "customerName", "customerPhone", "title", "jobType"]}
            initialPageSize={10}
            pageSizeOptions={[5, 10, 20, 25, 50, 100]}
            pagination={true}
            emptyMessage="No jobs with approved estimates currently pending invoicing."
            customActions={
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
            }
          />
        )}

        {activeTab === "invoices" && (
          <JobFlowDataTable
            key="invoices-table"
            columns={invoiceColumns}
            data={invoicesList}
            loading={loading}
            sortable={true}
            defaultSortKey="invoiceNumber"
            defaultSortDir="desc"
            searchable={true}
            searchPlaceholder="Search invoices by invoice no, job no, customer..."
            searchKeys={["invoiceNumber", "jobNo", "customerName", "customerPhone", "paymentStatus", "status"]}
            initialPageSize={10}
            pageSizeOptions={[5, 10, 20, 25, 50, 100]}
            pagination={true}
            emptyMessage="No billed invoices found."
            customActions={
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
            }
          />
        )}

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
