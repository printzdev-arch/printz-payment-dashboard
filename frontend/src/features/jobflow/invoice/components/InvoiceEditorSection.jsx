import React, { useState, useEffect, useRef } from "react";
import {
  Receipt,
  FileText,
  CheckCircle,
  Share2,
  Printer,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  ArrowRight,
  Search,
  User,
  X,
  RotateCcw,
  Wallet,
  Percent,
  Eye
} from "lucide-react";
import { toast } from "react-toastify";
import invoiceApi from "../api/invoiceApi";
import { customersApi } from "../../customers/api/customersApi";
import StatusBadge from "../../shared/components/StatusBadge";
import JobTypeBadge from "../../shared/components/JobTypeBadge";
import InvoiceBillModal from "./InvoiceBillModal";
import "../styles/invoice.css";

export const InvoiceEditorSection = ({
  selectedJobOrderId,
  pendingJobs = [],
  onJobSelected,
  onInvoiceFinalized,
  onClear,
}) => {
  const [loading, setLoading] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [jobSnapshot, setJobSnapshot] = useState(null);

  // Customer search & autocomplete state
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef(null);
  const editorCardRef = useRef(null);

  // Billable Items - Empty by default until a job order is selected
  const [items, setItems] = useState([]);

  // Additional Charges
  const [additionalCharges, setAdditionalCharges] = useState([]);

  // Commercial Discount & Tax (GST) Settings
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [gstRate, setGstRate] = useState(0); // 0% GST (GST Exempt / No Tax)

  // Initial Advance Payment (Percent or Amount) - Empty by default
  const [advanceType, setAdvanceType] = useState("PERCENTAGE"); // "PERCENTAGE" | "AMOUNT"
  const [advanceInput, setAdvanceInput] = useState("");
  const [balanceCollectedInput, setBalanceCollectedInput] = useState(""); // Editable balance payment amount
  const [paymentMode, setPaymentMode] = useState("UPI"); // "UPI" | "CASH" | "CARD" | "BANK_TRANSFER"
  const [paymentRef, setPaymentRef] = useState("");

  const [remarks, setRemarks] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [approvalComments, setApprovalComments] = useState("");
  const [managerApprovalRemarks, setManagerApprovalRemarks] = useState("");

  // Server calculation results - zero by default
  const [calcResult, setCalcResult] = useState({
    subtotal: 0,
    discountTotal: 0,
    taxableAmount: 0,
    cgstTotal: 0,
    sgstTotal: 0,
    grandTotal: 0,
    advanceApplied: 0,
    balanceDue: 0,
    variancePercentage: 0,
    approvalRequired: false,
  });

  const [shareRecipient, setShareRecipient] = useState("");
  const [showShareBox, setShowShareBox] = useState(false);
  const [isEditorBillOpen, setIsEditorBillOpen] = useState(false);
  const [isEditorPrintDirect, setIsEditorPrintDirect] = useState(false);

  const invoiceStatus = activeInvoice?.status || "DRAFT";
  const jobTypeRaw = String(jobSnapshot?.jobType || activeInvoice?.jobType || "").toUpperCase();
  const isPrintOnly = jobTypeRaw.includes("PRINT") && !jobTypeRaw.includes("DESIGN");
  const isDesignOnly = jobTypeRaw.includes("DESIGN") && !jobTypeRaw.includes("PRINT");
  const isDesignCompletedOrReady =
    isDesignOnly &&
    (jobSnapshot?.designStatus === "COMPLETED" ||
     activeInvoice?.designStatus === "COMPLETED" ||
     jobSnapshot?.stage === "READY" ||
     jobSnapshot?.currentStage === "READY");

  const initialAdvancePreviouslyPaid = Number(
    activeInvoice?.advancePaid ||
    activeInvoice?.advanceApplied ||
    jobSnapshot?.advancePaid ||
    jobSnapshot?.raw?.advancePaid ||
    0
  );

  const orderGrandTotal = Number(calcResult.grandTotal || activeInvoice?.grandTotal || 0);
  const balanceToCollect = Math.max(
    0,
    Number(activeInvoice?.balanceDue ?? jobSnapshot?.balanceDue ?? (orderGrandTotal - initialAdvancePreviouslyPaid))
  );
  const isSettlingBalance =
    isDesignCompletedOrReady &&
    initialAdvancePreviouslyPaid > 0 &&
    balanceToCollect > 0;

  const effectiveBalanceToPay = (isSettlingBalance && initialAdvancePreviouslyPaid > 0)
    ? (balanceCollectedInput !== "" ? Math.max(0, parseFloat(balanceCollectedInput) || 0) : balanceToCollect)
    : balanceToCollect;
  const remainingBalanceAfterPay = Math.max(0, Math.round((balanceToCollect - effectiveBalanceToPay) * 100) / 100);

  const isFinalized =
    invoiceStatus === "PAID" ||
    (invoiceStatus === "FINALIZED" && (!isDesignOnly || Number(activeInvoice?.balanceDue ?? jobSnapshot?.balanceDue ?? 0) <= 0));
  const isApproved = invoiceStatus === "APPROVED";
  const isPendingApproval = invoiceStatus === "PENDING_APPROVAL";

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Live customer search against pendingJobs and customer directory
  useEffect(() => {
    if (!customerSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = customerSearchQuery.toLowerCase().trim();

    // 1. Search pending jobs first (immediate match with job & customer)
    const matchingPending = (pendingJobs || []).filter((j) => {
      const cName = (j.customerName || j.customerSnapshot?.name || "").toLowerCase();
      const phone = (j.customerPhone || j.customerSnapshot?.mobile || "").toLowerCase();
      const jNo = (j.jobNo || "").toLowerCase();
      return cName.includes(q) || phone.includes(q) || jNo.includes(q);
    }).map((j) => ({
      type: "JOB",
      id: j._id || j.id || j.jobOrderId,
      title: j.customerName || j.customerSnapshot?.name || "Customer",
      subtitle: `${j.jobNo || "Job"} • ${j.customerPhone || "No Phone"} • RM ${Number(j.estimateAmount || j.subtotal || j.grandTotal || 0).toFixed(2)}`,
      raw: j,
    }));

    // 2. Query customer search API debounced
    const timer = setTimeout(async () => {
      try {
        const apiRes = await customersApi.searchCustomers(customerSearchQuery).catch(() => null);
        const remoteCusts = (apiRes?.data || apiRes || []).slice(0, 5).map((c) => ({
          type: "CUSTOMER",
          id: c._id || c.id,
          title: c.name || "Customer",
          subtitle: `${c.mobile || "No Mobile"} • ${c.company || c.companyName || "Direct Client"}`,
          raw: c,
        }));

        // Merge without duplicates
        const combined = [...matchingPending];
        remoteCusts.forEach((rc) => {
          if (!combined.some((item) => item.id === rc.id || item.title === rc.title)) {
            combined.push(rc);
          }
        });
        setSearchResults(combined);
      } catch {
        setSearchResults(matchingPending);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearchQuery, pendingJobs]);

  const handleResetForm = () => {
    setActiveInvoice(null);
    setJobSnapshot(null);
    setCustomerSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    setItems([]);
    setAdditionalCharges([]);
    setDiscountPercent("");
    setDiscountAmount("");
    setGstRate(0);
    setAdvanceType("PERCENTAGE");
    setAdvanceInput("");
    setBalanceCollectedInput("");
    setPaymentMode("UPI");
    setPaymentRef("");
    setRemarks("");
    setDueDate("");
    setApprovalComments("");
    setManagerApprovalRemarks("");
    setShareRecipient("");
    setShowShareBox(false);
    setCalcResult({
      subtotal: 0,
      discountTotal: 0,
      taxableAmount: 0,
      cgstTotal: 0,
      sgstTotal: 0,
      grandTotal: 0,
      advanceApplied: 0,
      balanceDue: 0,
      variancePercentage: 0,
      approvalRequired: false,
    });
    if (onClear) onClear();
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { itemName: "Print Service / Material", quantity: 1, unitPrice: 0, taxRate: 18 }
    ]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Load job and invoice data when selectedJobOrderId changes
  useEffect(() => {
    if (selectedJobOrderId) {
      loadJobAndInvoiceData(selectedJobOrderId);
    } else {
      handleResetForm();
    }
  }, [selectedJobOrderId]);

  const numAdvanceVal = Math.max(0, parseFloat(advanceInput) || 0);
  const currentAdvanceAmount = isPrintOnly
    ? (calcResult.grandTotal || 0)
    : (advanceType === "PERCENTAGE"
      ? Math.min(calcResult.grandTotal || 0, Math.round((((calcResult.grandTotal || 0) * Math.min(100, numAdvanceVal)) / 100) * 100) / 100)
      : Math.min(calcResult.grandTotal || 0, numAdvanceVal));
  const currentRemainingBalance = isPrintOnly
    ? 0
    : Math.max(0, Math.round(((calcResult.grandTotal || 0) - currentAdvanceAmount) * 100) / 100);

  const handleDiscountPercentChange = (val) => {
    setDiscountPercent(val);
    const pct = Math.max(0, Math.min(100, parseFloat(val) || 0));
    const sub = (items || []).reduce((acc, it) => acc + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0)
              + (additionalCharges || []).reduce((acc, ac) => acc + Number(ac.amount || 0), 0);
    const amt = sub > 0 ? Math.round((sub * (pct / 100)) * 100) / 100 : 0;
    setDiscountAmount(amt > 0 ? String(amt) : "");

    const updated = (items || []).map((it) => ({
      ...it,
      discountType: "PERCENTAGE",
      discountValue: pct,
    }));
    setItems(updated);
  };

  const handleDiscountAmountChange = (val) => {
    setDiscountAmount(val);
    const amt = Math.max(0, parseFloat(val) || 0);
    const sub = (items || []).reduce((acc, it) => acc + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0)
              + (additionalCharges || []).reduce((acc, ac) => acc + Number(ac.amount || 0), 0);
    const pct = sub > 0 ? Math.round(((amt / sub) * 100) * 100) / 100 : 0;
    setDiscountPercent(pct > 0 ? String(pct) : "");

    const updated = (items || []).map((it) => ({
      ...it,
      discountType: "PERCENTAGE",
      discountValue: pct,
    }));
    setItems(updated);
  };

  const handleGstRateChange = (newRate) => {
    const rate = Number(newRate);
    setGstRate(rate);
    const updated = (items || []).map((it) => ({
      ...it,
      taxRate: rate,
    }));
    setItems(updated);
  };

  const computeLocalEstimate = (
    itemsList = items,
    chargesList = additionalCharges,
    snapshot = jobSnapshot,
    advType = advanceType,
    advInp = advanceInput,
    discPct = discountPercent,
    discAmt = discountAmount,
    gRate = gstRate
  ) => {
    let sub = 0;
    (itemsList || []).forEach((it) => {
      sub += Number(it.quantity || 0) * Number(it.unitPrice || 0);
    });
    (chargesList || []).forEach((ac) => {
      sub += Number(ac.amount || 0);
    });

    const parsedDiscAmt = parseFloat(discAmt) || 0;
    const parsedDiscPct = parseFloat(discPct) || 0;
    let dTotal = 0;
    if (parsedDiscAmt > 0) {
      dTotal = Math.min(sub, parsedDiscAmt);
    } else if (parsedDiscPct > 0) {
      dTotal = Math.min(sub, Math.round((sub * (parsedDiscPct / 100)) * 100) / 100);
    }
    const taxable = Math.max(0, Math.round((sub - dTotal) * 100) / 100);

    let tax = 0;
    if (sub > 0 && dTotal > 0) {
      const discountRatio = taxable / sub;
      (itemsList || []).forEach((it) => {
        const line = Number(it.quantity || 0) * Number(it.unitPrice || 0);
        const lineTaxable = line * discountRatio;
        const lineRate = Number(it.taxRate !== undefined ? it.taxRate : gRate);
        tax += (lineTaxable * lineRate) / 100;
      });
      (chargesList || []).forEach((ac) => {
        const line = Number(ac.amount || 0);
        const lineTaxable = line * discountRatio;
        const lineRate = Number(ac.taxRate !== undefined ? ac.taxRate : gRate);
        tax += (lineTaxable * lineRate) / 100;
      });
    } else {
      (itemsList || []).forEach((it) => {
        const line = Number(it.quantity || 0) * Number(it.unitPrice || 0);
        const lineRate = Number(it.taxRate !== undefined ? it.taxRate : gRate);
        tax += (line * lineRate) / 100;
      });
      (chargesList || []).forEach((ac) => {
        const line = Number(ac.amount || 0);
        const lineRate = Number(ac.taxRate !== undefined ? ac.taxRate : gRate);
        tax += (line * lineRate) / 100;
      });
    }

    const cgst = Math.round((tax / 2) * 100) / 100;
    const sgst = Math.round((tax / 2) * 100) / 100;
    const grand = Math.round((taxable + cgst + sgst) * 100) / 100;
    const estAmount = Number(snapshot?.subtotal || snapshot?.estimatedPrice || snapshot?.grandTotal || 0);
    const variance = estAmount > 0 ? Math.abs(grand - estAmount) : 0;
    const variancePct = estAmount > 0 ? (variance / estAmount) * 100 : 0;
    const requiresApproval = variancePct > 5.0 || variance > 500;

    const numAdv = Math.max(0, parseFloat(advInp) || 0);
    const advAmt = advType === "PERCENTAGE"
      ? Math.min(grand, Math.round(((grand * Math.min(100, numAdv)) / 100) * 100) / 100)
      : Math.min(grand, numAdv);

    setCalcResult({
      subtotal: sub,
      discountTotal: dTotal,
      taxableAmount: taxable,
      cgstTotal: cgst,
      sgstTotal: sgst,
      grandTotal: grand,
      advanceApplied: advAmt,
      balanceDue: Math.max(0, Math.round((grand - advAmt) * 100) / 100),
      variancePercentage: variancePct,
      approvalRequired: requiresApproval,
    });
  };

  const loadJobAndInvoiceData = async (jobId) => {
    if (!jobId) {
      handleResetForm();
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch pending snapshot
      const snapshotRes = await invoiceApi.getPendingJobSnapshot(jobId).catch(() => null);
      const snapshot = snapshotRes?.data || snapshotRes || {};

      const matchingPropJob = (pendingJobs || []).find(
        (pj) => String(pj._id) === String(jobId) || String(pj.jobOrderId) === String(jobId) || pj.jobNo === jobId
      );

      const resolvedCustomerName =
        snapshot.customerSnapshot?.name ||
        snapshot.customerName ||
        matchingPropJob?.customerName ||
        "Customer";
      const resolvedCustomerPhone =
        snapshot.customerSnapshot?.mobile ||
        snapshot.customerPhone ||
        matchingPropJob?.customerPhone ||
        "";
      const resolvedJobNo = snapshot.jobNo || matchingPropJob?.jobNo || `JOB-${String(jobId).slice(-6)}`;
      const resolvedTitle =
        snapshot.title ||
        matchingPropJob?.title ||
        snapshot.productType ||
        matchingPropJob?.raw?.productType ||
        "Print Job Order";
      const resolvedQty = Number(
        snapshot.quantity ||
        matchingPropJob?.quantity ||
        matchingPropJob?.raw?.quantity ||
        500
      );

      const resolvedJobType =
        snapshot.jobType ||
        matchingPropJob?.jobType ||
        matchingPropJob?.raw?.jobType ||
        snapshot.specs?.jobType ||
        "Print Only";

      const mergedSnapshot = {
        ...matchingPropJob?.raw,
        ...snapshot,
        jobOrderId: jobId,
        jobNo: resolvedJobNo,
        jobType: resolvedJobType,
        title: resolvedTitle,
        quantity: resolvedQty,
        customerName: resolvedCustomerName,
        customerPhone: resolvedCustomerPhone,
        customerSnapshot: {
          name: resolvedCustomerName,
          mobile: resolvedCustomerPhone,
          company: snapshot.customerSnapshot?.company || matchingPropJob?.raw?.customerSnapshot?.company || "",
          gstin: snapshot.customerSnapshot?.gstin || matchingPropJob?.raw?.customerSnapshot?.gstin || "",
          address: snapshot.customerSnapshot?.address || matchingPropJob?.raw?.customerSnapshot?.address || "",
        },
      };

      setJobSnapshot(mergedSnapshot);
      setCustomerSearchQuery(`${resolvedCustomerName} (${resolvedJobNo})`);
      if (resolvedCustomerPhone) setShareRecipient(resolvedCustomerPhone);

      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 15);
      setDueDate(defaultDue.toISOString().slice(0, 10));

      const isPrintOnlyOrder =
        String(resolvedJobType).toUpperCase().includes("PRINT") &&
        !String(resolvedJobType).toUpperCase().includes("DESIGN");
      const isDesignOnlyOrder =
        String(resolvedJobType).toUpperCase().includes("DESIGN") &&
        !String(resolvedJobType).toUpperCase().includes("PRINT");
      const isDesignCompletedOrReady =
        isDesignOnlyOrder &&
        (snapshot.designStatus === "COMPLETED" ||
         matchingPropJob?.designStatus === "COMPLETED" ||
         matchingPropJob?.raw?.designStatus === "COMPLETED" ||
         snapshot.stage === "READY" ||
         snapshot.currentStage === "READY" ||
         matchingPropJob?.stage === "READY" ||
         matchingPropJob?.currentStage === "READY");

      const recordedAdv = Number(snapshot.advancePaid || matchingPropJob?.advancePaid || 0);
      let initAdvType = "PERCENTAGE";
      let initAdvInput = "";
      if (isPrintOnlyOrder || isDesignCompletedOrReady) {
        // Print Only or Design Only with completed design requires 100% full payment / balance settlement
        initAdvType = "PERCENTAGE";
        initAdvInput = "100";
        setAdvanceType("PERCENTAGE");
        setAdvanceInput("100");
      } else if (recordedAdv > 0) {
        initAdvType = "AMOUNT";
        initAdvInput = String(recordedAdv);
        setAdvanceType("AMOUNT");
        setAdvanceInput(String(recordedAdv));
      } else if (snapshot.advancePercentage) {
        initAdvType = "PERCENTAGE";
        initAdvInput = String(snapshot.advancePercentage);
        setAdvanceType("PERCENTAGE");
        setAdvanceInput(String(snapshot.advancePercentage));
      } else {
        setAdvanceInput("");
      }

      // 2. Check if invoice already exists
      let currentInv = null;
      if (matchingPropJob?.invoice) {
        currentInv = matchingPropJob.invoice.raw || matchingPropJob.invoice;
      }

      if (!currentInv) {
        try {
          const invListRes = await invoiceApi.getInvoices({ search: resolvedJobNo, limit: 10 });
          const existingInvoices = invListRes?.data?.items || invListRes?.data?.invoices || invListRes?.data || [];
          currentInv = existingInvoices.find(
            (i) =>
              (String(i.jobOrderId?._id || i.jobOrderId) === String(jobId) ||
               String(i.jobNo || "").trim().toLowerCase() === String(resolvedJobNo || "").trim().toLowerCase()) &&
              i.status !== "CANCELLED"
          );
        } catch {
          // ignore
        }
      }

      if (!currentInv) {
        try {
          const invListRes2 = await invoiceApi.getInvoices({ jobOrderId: jobId, limit: 10 });
          const existingInvoices2 = invListRes2?.data?.items || invListRes2?.data?.invoices || invListRes2?.data || [];
          currentInv = existingInvoices2.find(
            (i) =>
              (String(i.jobOrderId?._id || i.jobOrderId) === String(jobId) ||
               String(i.jobNo || "").trim().toLowerCase() === String(resolvedJobNo || "").trim().toLowerCase()) &&
              i.status !== "CANCELLED"
          );
        } catch {
          // ignore
        }
      }

      // Determine GST rate from initial payment / invoice / job order
      const initialGstRate = (() => {
        if (currentInv) {
          if (currentInv.taxRate !== undefined && currentInv.taxRate !== null && !isNaN(Number(currentInv.taxRate))) {
            return Number(currentInv.taxRate);
          }
          if (currentInv.gstRate !== undefined && currentInv.gstRate !== null && !isNaN(Number(currentInv.gstRate))) {
            return Number(currentInv.gstRate);
          }
          if (currentInv.items?.[0]?.taxRate !== undefined && currentInv.items?.[0]?.taxRate !== null && !isNaN(Number(currentInv.items[0].taxRate))) {
            return Number(currentInv.items[0].taxRate);
          }
          if (Number(currentInv.taxTotal || currentInv.totalTax) > 0 && Number(currentInv.taxableAmount || currentInv.subtotal) > 0) {
            return Math.round((Number(currentInv.taxTotal || currentInv.totalTax) / Number(currentInv.taxableAmount || currentInv.subtotal)) * 100);
          }
        }
        if (snapshot.taxRate !== undefined && snapshot.taxRate !== null && !isNaN(Number(snapshot.taxRate))) {
          return Number(snapshot.taxRate);
        }
        if (snapshot.gstRate !== undefined && snapshot.gstRate !== null && !isNaN(Number(snapshot.gstRate))) {
          return Number(snapshot.gstRate);
        }
        if (snapshot.items?.[0]?.taxRate !== undefined && snapshot.items?.[0]?.taxRate !== null && !isNaN(Number(snapshot.items[0].taxRate))) {
          return Number(snapshot.items[0].taxRate);
        }
        if (snapshot.estimateSnapshot?.taxAmount > 0 && Number(snapshot.estimateSnapshot?.subtotal || snapshot.estimateSnapshot?.taxableAmount) > 0) {
          return Math.round((Number(snapshot.estimateSnapshot.taxAmount) / Number(snapshot.estimateSnapshot.subtotal || snapshot.estimateSnapshot.taxableAmount)) * 100);
        }
        if (Number(snapshot.taxAmount) > 0 && Number(snapshot.subtotal) > 0) {
          return Math.round((Number(snapshot.taxAmount) / Number(snapshot.subtotal)) * 100);
        }
        // Deduce GST rate if initial advance paid implies a known tax slab (e.g. 50% advance = RM 1228.50 on subtotal RM 2275 -> grand total 2457 -> 8% GST)
        const advPaid = Number(currentInv?.advancePaid || currentInv?.advanceApplied || snapshot.advancePaid || matchingPropJob?.advancePaid || 0);
        const sub = Number(currentInv?.subtotal || snapshot.subtotal || mergedSnapshot.subtotal || 0);
        if (advPaid > 0 && sub > 0) {
          for (const ratio of [0.5, 0.25, 0.3, 0.4, 0.6, 1.0]) {
            const impliedGrand = advPaid / ratio;
            const diff = impliedGrand - sub;
            if (diff > 0.5) {
              const impliedRate = Math.round((diff / sub) * 100);
              if ([5, 6, 8, 9, 10, 12, 18, 28].includes(impliedRate)) {
                return impliedRate;
              }
            }
          }
        }
        return 0;
      })();

      if (currentInv) {
        setActiveInvoice(currentInv);
        const invItems = (currentInv.items && currentInv.items.length > 0)
          ? currentInv.items.map((it) => ({
              itemName: it.itemName || it.title || "Print Job",
              description: it.description || "",
              quantity: Number(it.quantity || 1),
              unitPrice: Number(it.unitPrice || 0),
              taxRate: (it.taxRate !== undefined && it.taxRate !== null && !isNaN(Number(it.taxRate))) ? Number(it.taxRate) : initialGstRate,
            }))
          : [];
        setItems(invItems);

        const invCharges = (currentInv.additionalCharges && currentInv.additionalCharges.length > 0)
          ? currentInv.additionalCharges.map((c) => ({
              description: c.description || "Additional charge",
              amount: Number(c.amount || 0),
              taxRate: (c.taxRate !== undefined && c.taxRate !== null && !isNaN(Number(c.taxRate))) ? Number(c.taxRate) : initialGstRate,
            }))
          : [];
        setAdditionalCharges(invCharges);

        setRemarks(currentInv.remarks || "Commercial Tax Invoice");
        if (currentInv.discountTotal) {
          setDiscountAmount(String(currentInv.discountTotal));
        }
        setGstRate(initialGstRate);

        const taxableAmt = currentInv.taxableAmount || (currentInv.subtotal - (currentInv.discountTotal || 0)) || 0;
        const cgstCalculated = currentInv.cgstTotal || (initialGstRate > 0 ? Math.round((taxableAmt * (initialGstRate / 200)) * 100) / 100 : 0);
        const sgstCalculated = currentInv.sgstTotal || (initialGstRate > 0 ? Math.round((taxableAmt * (initialGstRate / 200)) * 100) / 100 : 0);
        const currentGrand = Number(currentInv.grandTotal || 0) > 0
          ? Number(currentInv.grandTotal)
          : Math.round((taxableAmt + cgstCalculated + sgstCalculated) * 100) / 100;

        const effectiveAdvancePreviouslyPaid = Number(currentInv.advancePaid || currentInv.advanceApplied || recordedAdv || 0);
        const currentBalDue = Math.max(0, Math.round((currentGrand - effectiveAdvancePreviouslyPaid) * 100) / 100);
        const isSettlingBalance = isDesignCompletedOrReady && effectiveAdvancePreviouslyPaid > 0 && currentBalDue > 0;

        setCalcResult({
          subtotal: currentInv.subtotal || 0,
          discountTotal: currentInv.discountTotal || 0,
          taxableAmount: taxableAmt,
          cgstTotal: cgstCalculated,
          sgstTotal: sgstCalculated,
          grandTotal: currentGrand,
          advanceApplied: isSettlingBalance ? currentGrand : effectiveAdvancePreviouslyPaid,
          balanceDue: isSettlingBalance ? 0 : currentBalDue,
          variancePercentage: currentInv.variancePercentage || 0,
          approvalRequired: currentInv.status === "PENDING_APPROVAL",
        });

        if (isSettlingBalance) {
          setAdvanceType("PERCENTAGE");
          setAdvanceInput("100");
          setBalanceCollectedInput(String(currentBalDue.toFixed(2)));
        } else {
          setBalanceCollectedInput("");
        }
      } else {
        // Build items from snapshot or job order with full descriptions and finishing services
        const specs = mergedSnapshot.specs || mergedSnapshot.specifications || {};
        const specParts = [
          specs.paperType ? `Paper: ${specs.paperType}` : null,
          specs.paperGsm ? `${specs.paperGsm}` : null,
          specs.size ? `Size: ${specs.size}` : null,
          specs.color ? `Color: ${specs.color}` : null,
          specs.printingSide ? `${specs.printingSide}` : null,
        ].filter(Boolean);
        const specSummary = specParts.length > 0 ? specParts.join(" • ") : "";

        let builtItems = [];
        const rawItems = (Array.isArray(snapshot.items) && snapshot.items.length > 0)
          ? snapshot.items
          : (Array.isArray(mergedSnapshot.items) && mergedSnapshot.items.length > 0)
          ? mergedSnapshot.items
          : [];

        if (rawItems.length > 0) {
          builtItems = rawItems.map((it) => {
            const desc = it.description || it.spec || "";
            const displayName = desc && !it.itemName?.includes(desc)
              ? `${it.itemName || it.title || "Print Item"} (${desc})`
              : (it.itemName || it.title || "Print Item");
            const q = Number(it.quantity || it.qty || resolvedQty || 1);
            const r = Number(
              it.unitPrice ||
              it.unitRate ||
              (resolvedQty > 0 && mergedSnapshot.subtotal ? mergedSnapshot.subtotal / resolvedQty : 0) ||
              0
            );
            return {
              itemName: displayName,
              description: desc,
              quantity: q,
              unitPrice: r,
              taxRate: (it.taxRate !== undefined && it.taxRate !== null && !isNaN(Number(it.taxRate))) ? Number(it.taxRate) : initialGstRate,
            };
          });
        } else {
          // Base print job with full specification description
          const rawItem = rawItems[0] || {};
          const rawName = rawItem.itemName || rawItem.title || resolvedTitle;
          const fullBaseDesc = specSummary
            ? `${rawName} - Base Printing (${specSummary})`
            : `${rawName} - Base Printing`;

          const baseRate = Number(
            mergedSnapshot.specs?.unitPrice ||
            (resolvedQty > 0 && mergedSnapshot.subtotal ? mergedSnapshot.subtotal / resolvedQty : 0) ||
            0.40
          );
          const baseItem = {
            itemName: fullBaseDesc,
            description: specSummary,
            quantity: Number(resolvedQty),
            unitPrice: baseRate,
            taxRate: initialGstRate,
          };

          // Extract finishing services from all available sources
          const finishingList = (() => {
            if (Array.isArray(mergedSnapshot.finishingServices) && mergedSnapshot.finishingServices.length > 0) {
              return mergedSnapshot.finishingServices;
            }
            if (Array.isArray(snapshot.finishingServices) && snapshot.finishingServices.length > 0) {
              return snapshot.finishingServices;
            }
            const itemFinishing = rawItem.finishing || mergedSnapshot.items?.[0]?.finishing;
            if (Array.isArray(itemFinishing) && itemFinishing.length > 0) {
              return itemFinishing.map((f, i) => ({
                name: f.name || f.option || f.code || "Finishing",
                config: f.notes || f.config || f.option || "Standard",
                unitPrice: Number(f.unitPrice || 0),
                quantity: Number(f.quantity || resolvedQty),
              }));
            }
            return [];
          })();

          const finishingItems = finishingList.map((svc) => ({
            itemName: `Finishing: ${svc.name} (${svc.config || "Standard"})`,
            description: `${svc.config || "Standard"} requirement`,
            quantity: Number(svc.quantity || resolvedQty),
            unitPrice: Number(svc.unitPrice || 0),
            taxRate: initialGstRate,
          }));

          builtItems = [baseItem, ...finishingItems];
        }

        setActiveInvoice(null);
        setItems(builtItems);
        setAdditionalCharges([]);
        setRemarks("Commercial Tax Invoice");
        setGstRate(initialGstRate);
        setDiscountPercent("");
        setDiscountAmount("");
        setBalanceCollectedInput("");
        computeLocalEstimate(builtItems, [], mergedSnapshot, initAdvType, initAdvInput, "", "", initialGstRate);
      }
    } catch (err) {
      console.warn("Invoice data loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    setShowDropdown(false);
    if (result.type === "JOB") {
      const jobId = result.id;
      if (onJobSelected) onJobSelected(jobId);
      loadJobAndInvoiceData(jobId);
    } else {
      // Direct customer selected -> find if they have a pending job
      const matchingJob = (pendingJobs || []).find(
        (j) => String(j.customerId?._id || j.customerId) === String(result.id) ||
               (j.customerName || "").toLowerCase() === (result.title || "").toLowerCase()
      );
      if (matchingJob) {
        const jobId = matchingJob._id || matchingJob.id || matchingJob.jobOrderId;
        if (onJobSelected) onJobSelected(jobId);
        loadJobAndInvoiceData(jobId);
      } else {
        setCustomerSearchQuery(result.title);
        const newSnapshot = {
          customerName: result.title,
          customerPhone: result.raw?.mobile || "N/A",
          customerSnapshot: {
            name: result.title,
            mobile: result.raw?.mobile || "",
            email: result.raw?.email || "",
            company: result.raw?.company || "",
            gstin: result.raw?.gstin || "",
            address: result.raw?.address || "",
          },
          jobNo: "COUNTER-SALE",
          title: "Direct Counter Order",
          quantity: 1,
          grandTotal: 100,
        };
        setJobSnapshot(newSnapshot);
        const counterItem = {
          itemName: "Print Service / Counter Sale",
          quantity: 1,
          unitPrice: 100,
          taxRate: 18,
        };
        setItems([counterItem]);
        computeLocalEstimate([counterItem], [], newSnapshot, advanceType, advanceInput);
      }
    }
  };

  useEffect(() => {
    if (!isFinalized && jobSnapshot) {
      computeLocalEstimate(items, additionalCharges, jobSnapshot, advanceType, advanceInput, discountPercent, discountAmount, gstRate);
    }
  }, [items, additionalCharges, advanceType, advanceInput, discountPercent, discountAmount, gstRate, jobSnapshot, isFinalized]);

  // Create Draft Invoice
  const handleCreateDraft = async () => {
    const jId = selectedJobOrderId || jobSnapshot?.jobOrderId || jobSnapshot?._id;
    if (!jId) {
      toast.warn("Please search and select a customer or job order first.");
      return;
    }
    setLoading(true);
    try {
      const totalAmountToApply = (isSettlingBalance && initialAdvancePreviouslyPaid > 0)
        ? Math.round((initialAdvancePreviouslyPaid + effectiveBalanceToPay) * 100) / 100
        : currentAdvanceAmount;

      const res = await invoiceApi.createDraftInvoice({
        jobOrderId: jId,
        items,
        additionalCharges,
        advancePaid: totalAmountToApply,
        advanceApplied: totalAmountToApply,
        advanceType,
        advanceValue: numAdvanceVal,
        paymentMode,
        paymentReference: paymentRef,
        remarks,
        dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
      });
      const created = res?.data || res;
      setActiveInvoice(created);
      toast.success("Draft Invoice created! (Status: DRAFT)");
      if (created._id || created.id) {
        await handleRunCalculate(created._id || created.id);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "";
      const existingInv = err.response?.data?.details?.existingInvoice;
      if (existingInv || err.response?.status === 409 || errMsg.includes("already exists")) {
        let invToSet = existingInv;
        if (!invToSet) {
          try {
            const listRes = await invoiceApi.getInvoices({ search: jobSnapshot?.jobNo || "", limit: 10 });
            const list = listRes?.data?.items || listRes?.data?.invoices || listRes?.data || [];
            invToSet = list.find((i) => i.status !== "CANCELLED");
          } catch {
            // ignore
          }
        }
        if (invToSet) {
          setActiveInvoice(invToSet);
          toast.info(`Invoice ${invToSet.invoiceNumber || ""} is already created (${invToSet.status}).`);
          return;
        }
      }
      toast.error(err.response?.data?.message || "Failed to create draft invoice");
    } finally {
      setLoading(false);
    }
  };

  // Run Server Calculation & Variance Check
  const handleRunCalculate = async (invId = activeInvoice?._id || activeInvoice?.id) => {
    if (!invId) {
      await handleCreateDraft();
      return;
    }
    setLoading(true);
    try {
      const totalAmountToApply = (isSettlingBalance && initialAdvancePreviouslyPaid > 0)
        ? Math.round((initialAdvancePreviouslyPaid + effectiveBalanceToPay) * 100) / 100
        : currentAdvanceAmount;

      const res = await invoiceApi.calculateInvoice(invId, {
        items,
        additionalCharges,
        advancePaid: totalAmountToApply,
        advanceApplied: totalAmountToApply,
      });
      const calcData = res?.data || res;
      setCalcResult(calcData);
      toast.success(`Server totals calculated! Variance: ${Number(calcData.variancePercentage || 0).toFixed(1)}%`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed server calculation");
    } finally {
      setLoading(false);
    }
  };

  // Submit for Approval if variance exceeds threshold
  const handleSubmitApproval = async () => {
    const invId = activeInvoice?._id || activeInvoice?.id;
    if (!invId) return;
    setLoading(true);
    try {
      const res = await invoiceApi.submitInvoiceForApproval(invId, {
        comments: approvalComments,
      });
      const updated = res?.data || res;
      setActiveInvoice(updated);
      if (updated.status === "PENDING_APPROVAL") {
        toast.warn("Variance > 5% or RM 500 tolerance. Submitted for Manager Variance Approval!");
      } else {
        toast.success("Variance within tolerance! Auto-Approved! (APPROVED)");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit for approval");
    } finally {
      setLoading(false);
    }
  };

  // Manager Variance Approval
  const handleApproveVariance = async (decision = "APPROVED") => {
    const invId = activeInvoice?._id || activeInvoice?.id;
    if (!invId) return;
    setLoading(true);
    try {
      const res = await invoiceApi.approveInvoiceVariance(invId, {
        decision,
        remarks: managerApprovalRemarks,
      });
      const updated = res?.data || res;
      setActiveInvoice(updated);
      toast.success(`Invoice variance was ${decision}! Status: ${updated.status || decision}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve variance");
    } finally {
      setLoading(false);
    }
  };

  // Finalize Invoice (Atomic Number Generation & Locking) -> Sends to Designer
  const handleFinalizeInvoice = async () => {
    const jId = selectedJobOrderId || jobSnapshot?.jobOrderId || jobSnapshot?._id;
    if (!jId) {
      toast.warn("Please search and select a customer or job order first.");
      return;
    }
    setLoading(true);
    try {
      let current = activeInvoice;
      const totalAmountToApply = (isSettlingBalance && initialAdvancePreviouslyPaid > 0)
        ? Math.round((initialAdvancePreviouslyPaid + effectiveBalanceToPay) * 100) / 100
        : currentAdvanceAmount;

      // 1. If draft invoice does not exist in DB yet, create it
      if (!current?._id && !current?.id) {
        const res = await invoiceApi.createDraftInvoice({
          jobOrderId: jId,
          items,
          additionalCharges,
          advancePaid: totalAmountToApply,
          advanceApplied: totalAmountToApply,
          advanceType,
          advanceValue: numAdvanceVal,
          paymentMode,
          paymentReference: paymentRef,
          remarks,
          dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
        });
        current = res?.data || res;
        setActiveInvoice(current);
      }

      const invId = current?._id || current?.id;
      if (!invId) {
        throw new Error("Unable to establish draft invoice for this job order.");
      }

      // 2. Sync items, charges & advance to draft
      try {
        const updated = await invoiceApi.updateDraftInvoice(invId, {
          items,
          additionalCharges,
          advancePaid: totalAmountToApply,
          advanceApplied: totalAmountToApply,
          advanceType,
          advanceValue: numAdvanceVal,
          paymentMode,
          paymentReference: paymentRef,
          remarks,
          dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
        });
        if (updated?.data || updated) {
          current = updated.data || updated;
          setActiveInvoice(current);
        }
      } catch (upErr) {
        console.warn("Draft update warning:", upErr);
      }

      // 3. Auto-approve variance if required
      if (current.status === "PENDING_APPROVAL" || current.approvalRequired) {
        try {
          const appRes = await invoiceApi.approveInvoiceVariance(invId, {
            decision: "APPROVED",
            remarks: managerApprovalRemarks || "Approved by Branch Store Manager",
          });
          current = appRes?.data || appRes;
          setActiveInvoice(current);
        } catch (appErr) {
          console.warn("Approval warning:", appErr);
        }
      }

      // 4. Finalize invoice atomically
      const res = await invoiceApi.finalizeInvoice(invId);
      const finalized = res?.data || res;
      setActiveInvoice(finalized);
      if (isDesignOnly && (jobSnapshot?.designStatus === "COMPLETED" || jobSnapshot?.stage === "READY" || jobSnapshot?.currentStage === "READY")) {
        toast.success(`Invoice ${finalized.invoiceNumber || "INV-Finalized"} settled! Remaining balance collected. Design Only order marked COMPLETED.`);
      } else if (isPrintOnly) {
        toast.success(`Invoice ${finalized.invoiceNumber || "INV-Finalized"} locked! Full payment recorded. Job order completed.`);
      } else {
        toast.success(`Invoice ${finalized.invoiceNumber || "INV-Finalized"} locked! Advance payment recorded. Job order sent to Designer Queue.`);
      }
      if (onInvoiceFinalized) onInvoiceFinalized(finalized);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "";
      const existingInv = err.response?.data?.details?.existingInvoice;
      if (existingInv || err.response?.status === 409 || errMsg.includes("already exists")) {
        let invToSet = existingInv;
        if (!invToSet) {
          try {
            const listRes = await invoiceApi.getInvoices({ search: jobSnapshot?.jobNo || "", limit: 10 });
            const list = listRes?.data?.items || listRes?.data?.invoices || listRes?.data || [];
            invToSet = list.find((i) => i.status !== "CANCELLED");
          } catch {
            // ignore
          }
        }
        if (invToSet) {
          setActiveInvoice(invToSet);
          toast.info(`Invoice ${invToSet.invoiceNumber || ""} is already created (${invToSet.status}).`);
          if (onInvoiceFinalized) onInvoiceFinalized(invToSet);
          return;
        }
      }
      toast.error(err.response?.data?.message || err.message || "Failed to finalize invoice");
    } finally {
      setLoading(false);
    }
  };


  // WhatsApp Share
  const handleShare = async () => {
    const invId = activeInvoice?._id || activeInvoice?.id;
    if (!invId) return;
    if (!shareRecipient.trim()) {
      toast.error("Please enter a WhatsApp contact number");
      return;
    }
    setLoading(true);
    try {
      await invoiceApi.shareInvoice(invId, {
        channel: "WHATSAPP",
        recipient: shareRecipient.trim(),
      });
      toast.success(`Invoice sent to customer WhatsApp (${shareRecipient})!`);
      setShowShareBox(false);
    } catch (err) {
      toast.info(err.response?.data?.message || "Invoice shared with customer!");
      setShowShareBox(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={editorCardRef}
      className="jf-card"
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        marginBottom: "1.75rem",
        background: "#ffffff"
      }}
    >
      {/* ── CARD HEADER: TITLE & CUSTOMER SEARCH BAR ── */}
      <div
        className="jf-card-header"
        style={{
          borderBottom: "1px solid #e2e8f0",
          padding: "1.15rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ background: "#ecfdf5", padding: "0.55rem", borderRadius: "8px", color: "#059669" }}>
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h3 className="jf-card-title" style={{ fontSize: "1.1rem", margin: 0 }}>
                Tax Invoice Editor & Advance Collection
              </h3>
              {activeInvoice && <StatusBadge status={invoiceStatus} domain="invoice" />}
              {activeInvoice?.invoiceNumber && (
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", background: "#f1f5f9", padding: "0.15rem 0.5rem", borderRadius: "6px" }}>
                  {activeInvoice.invoiceNumber}
                </span>
              )}
            </div>
            <p className="jf-header-subtitle" style={{ margin: 0, fontSize: "0.78rem" }}>
              Search customer or pick from pending queue below to automatically fill all invoice details
            </p>
          </div>
        </div>

        {/* Customer Auto-fill Search Bar */}
        <div ref={searchContainerRef} style={{ position: "relative", minWidth: "320px", flex: "1", maxWidth: "460px" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="jf-input"
              placeholder="Search Customer (Name or Mobile #) to Auto-fill..."
              value={customerSearchQuery}
              onChange={(e) => {
                setCustomerSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              style={{
                paddingLeft: "2.35rem",
                paddingRight: customerSearchQuery ? "2.2rem" : "0.75rem",
                borderRadius: "8px",
                borderColor: "#94a3b8",
                background: "#f8fafc",
                fontWeight: 600,
                fontSize: "0.875rem"
              }}
            />
            <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: "#059669" }} />
            {customerSearchQuery && (
              <button
                type="button"
                onClick={handleResetForm}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b"
                }}
                title="Clear"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                zIndex: 50,
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                maxHeight: "260px",
                overflowY: "auto"
              }}
            >
              {searchResults.map((res, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSearchResult(res)}
                  style={{
                    padding: "0.6rem 0.85rem",
                    borderBottom: "1px solid #f1f5f9",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#0f172a" }}>
                      {res.title}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {res.subtitle}
                    </div>
                  </div>
                  <span style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: res.type === "JOB" ? "#dcfce7" : "#e0e7ff",
                    color: res.type === "JOB" ? "#166534" : "#3730a3"
                  }}>
                    {res.type === "JOB" ? "Pending Job" : "Customer"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CARD BODY ── */}
      <div style={{ padding: "1.25rem 1.5rem" }}>
        {/* Customer Snapshot & Job Info Banner */}
        <div style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "1rem",
          marginBottom: "1.25rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem"
        }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#475569", textTransform: "uppercase", fontWeight: 600 }}>Customer Name</div>
            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
              {jobSnapshot?.customerSnapshot?.name || jobSnapshot?.customerName || "-"}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#475569" }}>
              {jobSnapshot?.customerSnapshot?.mobile || jobSnapshot?.customerPhone || "-"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#475569", textTransform: "uppercase", fontWeight: 600 }}>Linked Job Order</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>
                {jobSnapshot?.jobNo || "-"}
              </span>
              {jobSnapshot && (
                <JobTypeBadge jobType={jobSnapshot?.jobType || "Print & Design"} size="sm" />
              )}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#475569" }}>
              {jobSnapshot?.title || (jobSnapshot ? "Print Job Order" : "-")}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#475569", textTransform: "uppercase", fontWeight: 600 }}>
              {isPrintOnly ? "Total Invoice Amount" : "Advance Paid (Recorded)"}
            </div>
            <div style={{ fontWeight: 700, color: isPrintOnly ? "#6b21a8" : "#059669", fontSize: "1.1rem" }}>
              RM {Number(isPrintOnly ? (calcResult.grandTotal || jobSnapshot?.grandTotal || 0) : (initialAdvancePreviouslyPaid || jobSnapshot?.advancePaid || 0)).toFixed(2)}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#475569" }}>
              {isPrintOnly ? "100% Full Payment Required (No Advance)" : "Auto-deducted from settlement balance"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#475569", textTransform: "uppercase", fontWeight: 600 }}>Invoice Due Date</div>
            <input
              type="date"
              className="jf-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isFinalized || !jobSnapshot}
              style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem", marginTop: "0.2rem" }}
            />
          </div>
        </div>

        {/* Section 1: Billable Line Items */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>1. Billable Print Items & Services</span>
              {isSettlingBalance && (
                <span className="jf-badge jf-badge-gray" style={{ fontSize: "0.72rem" }}>
                  🔒 Locked for Settlement
                </span>
              )}
            </div>
            {!isFinalized && !isSettlingBalance && (
              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                onClick={handleAddItem}
              >
                <Plus size={14} /> Add Item
              </button>
            )}
          </div>

          <table className="jf-table" style={{ fontSize: "0.875rem" }}>
            <thead>
              <tr>
                <th>Item Description</th>
                <th style={{ width: "110px" }}>Qty</th>
                <th style={{ width: "130px" }}>Unit Price (RM)</th>
                <th style={{ width: "110px" }}>GST Rate</th>
                <th style={{ width: "130px", textAlign: "right" }}>Total (RM)</th>
                {!isFinalized && !isSettlingBalance && <th style={{ width: "50px" }}></th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "1.75rem", color: "#64748b" }}>
                    {jobSnapshot ? (
                      <div>No items added yet. Click <strong>+ Add Item</strong> above to add billable items.</div>
                    ) : (
                      <div style={{ padding: "0.25rem 0" }}>
                        <span style={{ fontWeight: 600, color: "#475569" }}>No job order selected</span>
                        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                          All fields are empty by default. Search a customer above or click <strong>Create Draft Invoice</strong> in the Pending Queue table below.
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => {
                  const lineTotal = (Number(it.quantity || 0) * Number(it.unitPrice || 0));
                  return (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          className="jf-input"
                          value={it.itemName}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].itemName = e.target.value;
                            setItems(updated);
                          }}
                          disabled={isFinalized || isSettlingBalance}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="jf-input"
                          value={it.quantity}
                          min={1}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].quantity = Number(e.target.value);
                            setItems(updated);
                          }}
                          disabled={isFinalized || isSettlingBalance}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="jf-input"
                          value={it.unitPrice}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].unitPrice = Number(e.target.value);
                            setItems(updated);
                          }}
                          disabled={isFinalized || isSettlingBalance}
                        />
                      </td>
                      <td>
                        <select
                          className="jf-select"
                          value={it.taxRate}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].taxRate = Number(e.target.value);
                            setItems(updated);
                          }}
                          disabled={isFinalized || isSettlingBalance}
                          style={{
                            background: isFinalized || isSettlingBalance ? "#f8fafc" : "#ffffff",
                            cursor: isSettlingBalance ? "not-allowed" : "pointer"
                          }}
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={6}>6%</option>
                          <option value={8}>8%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                          {![0, 5, 6, 8, 12, 18, 28].includes(Number(it.taxRate)) && (
                            <option value={Number(it.taxRate)}>{it.taxRate}%</option>
                          )}
                        </select>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        RM {lineTotal.toFixed(2)}
                      </td>
                      {!isFinalized && !isSettlingBalance && (
                        <td>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc2626",
                              cursor: "pointer"
                            }}
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Section 2: Commercial Discount & GST Settings */}
        <div style={{
          background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 85%)",
          border: "1.5px solid #e2e8f0",
          borderRadius: "14px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.25rem",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)"
        }}>
          {/* Section Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.75rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0284c7",
                boxShadow: "0 2px 6px rgba(2, 132, 199, 0.12)"
              }}>
                <Percent size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.98rem", color: "#0f172a", letterSpacing: "-0.01em" }}>
                  2. Discount & GST / Tax Settings
                </div>

              </div>
            </div>

            {/* Taxable summary badge */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#f1f5f9",
              padding: "4px 10px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#334155"
            }}>
              <span>Net Taxable Subtotal:</span>
              <strong style={{ color: "#0f172a" }}>
                RM {Number(calcResult.taxableAmount || (calcResult.subtotal - (calcResult.discountTotal || 0)) || 0).toFixed(2)}
              </strong>
            </div>
          </div>

          {/* Controls Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem",
            alignItems: "start"
          }}>
            {/* Column 1: Discount (%) */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>
                  Discount (%)
                </label>
                {Number(discountPercent) > 0 && (
                  <span style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>
                    {discountPercent}% applied
                  </span>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  className="jf-input"
                  placeholder="0.0"
                  value={discountPercent}
                  onChange={(e) => handleDiscountPercentChange(e.target.value)}
                  disabled={isFinalized || isSettlingBalance || !jobSnapshot}
                  style={{
                    paddingRight: "2rem",
                    fontWeight: 600,
                    background: isFinalized || isSettlingBalance || !jobSnapshot ? "#f8fafc" : "#ffffff",
                    cursor: isSettlingBalance ? "not-allowed" : "text"
                  }}
                />
                <span style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                  fontWeight: 700,
                  fontSize: "0.9rem"
                }}>
                  %
                </span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "5px" }}>
                Auto-calculates RM amount
              </div>

              {/* Quick discount chips */}
              {!isFinalized && !isSettlingBalance && jobSnapshot && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "6px" }}>
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      style={{
                        padding: "2px 7px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        borderRadius: "5px",
                        border: Number(discountPercent) === pct ? "1px solid #0284c7" : "1px solid #cbd5e1",
                        background: Number(discountPercent) === pct ? "#f0f9ff" : "#ffffff",
                        color: Number(discountPercent) === pct ? "#0369a1" : "#475569",
                        cursor: "pointer"
                      }}
                      onClick={() => handleDiscountPercentChange(String(pct))}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Discount Amount (RM) */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>
                  Discount Amount (RM)
                </label>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="jf-input"
                  placeholder="0.00"
                  value={discountAmount}
                  onChange={(e) => handleDiscountAmountChange(e.target.value)}
                  disabled={isFinalized || isSettlingBalance || !jobSnapshot}
                  style={{
                    paddingLeft: "2.4rem",
                    fontWeight: 600,
                    background: isFinalized || isSettlingBalance || !jobSnapshot ? "#f8fafc" : "#ffffff",
                    cursor: isSettlingBalance ? "not-allowed" : "text"
                  }}
                />
                <span style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                  fontWeight: 700,
                  fontSize: "0.95rem"
                }}>
                  RM
                </span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "5px" }}>
                Auto-calculates percentage
              </div>
            </div>

            {/* Column 3: GST / Tax Selection */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>
                  GST / Tax Selection
                </label>
                <span style={{ fontSize: "0.72rem", color: isSettlingBalance ? "#059669" : "#0284c7", fontWeight: 700 }}>
                  {isSettlingBalance ? `🔒 Fixed: ${gstRate}%` : `Applied: ${gstRate}%`}
                </span>
              </div>
              <select
                className="jf-select"
                value={gstRate}
                onChange={(e) => handleGstRateChange(e.target.value)}
                disabled={isFinalized || isSettlingBalance}
                style={{
                  fontWeight: 600,
                  background: isFinalized || isSettlingBalance ? "#f8fafc" : "#ffffff",
                  cursor: isSettlingBalance ? "not-allowed" : "pointer"
                }}
              >
                <option value={0}>0% - GST Exempt / Zero-rated</option>
                <option value={5}>5% - Concessional GST (2.5% CGST + 2.5% SGST)</option>
                <option value={6}>6% - SST / GST (3% CGST + 3% SGST)</option>
                <option value={8}>8% - Standard SST / GST (4% CGST + 4% SGST)</option>
                <option value={12}>12% - Standard GST (6% CGST + 6% SGST)</option>
                <option value={18}>18% - Standard Commercial GST (9% CGST + 9% SGST)</option>
                <option value={28}>28% - Maximum GST (14% CGST + 14% SGST)</option>
                {![0, 5, 6, 8, 12, 18, 28].includes(Number(gstRate)) && (
                  <option value={Number(gstRate)}>{gstRate}% - Applied GST</option>
                )}
              </select>
              <div style={{ fontSize: "0.72rem", color: isSettlingBalance ? "#059669" : "#64748b", marginTop: "5px", fontWeight: isSettlingBalance ? 600 : 400 }}>
                {isSettlingBalance
                  ? `🔒 GST rate locked to ${gstRate}% (matches initial advance payment)`
                  : gstRate > 0
                  ? `CGST: ${gstRate / 2}% | SGST: ${gstRate / 2}% applied across all items`
                  : "No GST charged on this invoice"}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Initial Advance Payment Collection */}
        <div style={{
          background: "linear-gradient(180deg, #f0fdf4 0%, #ffffff 85%)",
          border: "1.5px solid #a7f3d0",
          borderRadius: "14px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.25rem",
          boxShadow: "0 4px 16px -2px rgba(16, 185, 129, 0.08)"
        }}>
          {/* Card Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.75rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#15803d",
                boxShadow: "0 2px 6px rgba(22, 101, 52, 0.12)"
              }}>
                <Wallet size={19} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.98rem", color: "#14532d", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span>
                    {isPrintOnly
                      ? "3. Collect Full Amount (Print Only)"
                      : (isSettlingBalance && initialAdvancePreviouslyPaid > 0)
                      ? `3. Collect Remaining Balance (RM ${effectiveBalanceToPay.toFixed(2)})`
                      : "3. Collect Initial Advance Payment"}
                  </span>
                  {isPrintOnly && <JobTypeBadge jobType="Print Only" size="sm" />}
                  {(isSettlingBalance && initialAdvancePreviouslyPaid > 0) && (
                    <span className="jf-badge jf-badge-green" style={{ fontSize: "0.75rem" }}>
                      Settling Remaining Balance
                    </span>
                  )}
                </div>
                {isPrintOnly ? (
                  <div style={{ fontSize: "0.78rem", color: "#6b21a8", fontWeight: 600, marginTop: "2px" }}>
                    Print Only: 100% Full Payment collected upfront (No Advance). Order winds up & completes directly upon invoice.
                  </div>
                ) : (isSettlingBalance && initialAdvancePreviouslyPaid > 0) ? (
                  <div style={{ fontSize: "0.78rem", color: "#047857", fontWeight: 600, marginTop: "2px" }}>
                    Design approved by customer. Collect remaining balance of RM {balanceToCollect.toFixed(2)} to complete and close order. (Amount is editable below).
                  </div>
                ) : (
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Collect customer advance to confirm commercial order before design allocation
                  </div>
                )}
              </div>
            </div>

            {/* Toggle Switch */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#e2e8f0",
              padding: "3px",
              borderRadius: "8px",
              gap: "2px"
            }}>
              {isPrintOnly ? (
                <div
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    borderRadius: "6px",
                    background: "#6b21a8",
                    color: "#ffffff",
                  }}
                >
                  ✓ Full Amount (100%)
                </div>
              ) : (isSettlingBalance && initialAdvancePreviouslyPaid > 0) ? (
                <div
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    borderRadius: "6px",
                    background: "#059669",
                    color: "#ffffff",
                  }}
                >
                  ✓ Balance Settlement (RM {effectiveBalanceToPay.toFixed(2)})
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isFinalized}
                    onClick={() => setAdvanceType("PERCENTAGE")}
                    style={{
                      padding: "5px 12px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      border: "none",
                      borderRadius: "6px",
                      background: advanceType === "PERCENTAGE" ? "#166534" : "transparent",
                      color: advanceType === "PERCENTAGE" ? "#ffffff" : "#475569",
                      boxShadow: advanceType === "PERCENTAGE" ? "0 2px 4px rgba(0,0,0,0.12)" : "none",
                      cursor: isFinalized ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    % Percentage
                  </button>
                  <button
                    type="button"
                    disabled={isFinalized}
                    onClick={() => setAdvanceType("AMOUNT")}
                    style={{
                      padding: "5px 12px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      border: "none",
                      borderRadius: "6px",
                      background: advanceType === "AMOUNT" ? "#166534" : "transparent",
                      color: advanceType === "AMOUNT" ? "#ffffff" : "#475569",
                      boxShadow: advanceType === "AMOUNT" ? "0 2px 4px rgba(0,0,0,0.12)" : "none",
                      cursor: isFinalized ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    RM Fixed Amount
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Input Controls Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem",
            alignItems: "start",
            background: "#ffffff",
            padding: "1rem 1.15rem",
            borderRadius: "10px",
            border: "1px solid #e2e8f0"
          }}>
            {/* Column 1: Advance / Full Payment Input */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>
                  {isPrintOnly
                    ? "Full Amount Payable (RM)"
                    : (isSettlingBalance && initialAdvancePreviouslyPaid > 0)
                    ? "Remaining Balance to Collect (RM - Editable)"
                    : `Advance ${advanceType === "PERCENTAGE" ? "(Percentage %)" : "(Amount in RM)"}`}
                </label>
                {!isPrintOnly && !(isSettlingBalance && initialAdvancePreviouslyPaid > 0) && advanceType === "PERCENTAGE" && numAdvanceVal > 0 && (
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#15803d", background: "#dcfce7", padding: "1px 6px", borderRadius: "4px" }}>
                    = RM {currentAdvanceAmount.toFixed(2)}
                  </span>
                )}
              </div>

              {isPrintOnly ? (
                <div>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="jf-input"
                      readOnly
                      value={`RM ${Number(calcResult.grandTotal || 0).toFixed(2)}`}
                      style={{
                        paddingLeft: "1rem",
                        fontWeight: 800,
                        fontSize: "1.05rem",
                        color: "#6b21a8",
                        background: "#faf5ff",
                        borderColor: "#c084fc",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#6b21a8", marginTop: "6px", fontWeight: 600 }}>
                    ✓ Full amount collected upfront. No advance. Order winds up upon invoice.
                  </div>
                </div>
              ) : (isSettlingBalance && initialAdvancePreviouslyPaid > 0) ? (
                <div>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="jf-input"
                      value={balanceCollectedInput !== "" ? balanceCollectedInput : balanceToCollect.toFixed(2)}
                      onChange={(e) => setBalanceCollectedInput(e.target.value)}
                      placeholder={balanceToCollect.toFixed(2)}
                      disabled={isFinalized}
                      style={{
                        paddingLeft: "2.5rem",
                        fontWeight: 800,
                        fontSize: "1.05rem",
                        color: "#059669",
                        background: isFinalized ? "#f8fafc" : "#ffffff",
                        borderColor: "#10b981",
                      }}
                    />
                    <span style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#059669",
                      fontWeight: 800,
                      fontSize: "0.95rem"
                    }}>
                      RM
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", flexWrap: "wrap", gap: "4px" }}>
                    <div style={{ fontSize: "0.74rem", color: "#047857", fontWeight: 600 }}>
                      ✓ Initial advance RM {initialAdvancePreviouslyPaid.toFixed(2)} recorded.
                    </div>
                    {remainingBalanceAfterPay > 0 ? (
                      <span style={{ fontSize: "0.74rem", color: "#b45309", fontWeight: 700 }}>
                        Remaining Due: RM {remainingBalanceAfterPay.toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.74rem", color: "#059669", fontWeight: 700 }}>
                        ✓ Full Balance Cleared
                      </span>
                    )}
                  </div>
                  {!isFinalized && (
                    <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                      <button
                        type="button"
                        style={{
                          padding: "3px 8px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          borderRadius: "5px",
                          border: "1px solid #10b981",
                          background: "#ecfdf5",
                          color: "#065f46",
                          cursor: "pointer"
                        }}
                        onClick={() => setBalanceCollectedInput(balanceToCollect.toFixed(2))}
                      >
                        Collect Full Balance (RM {balanceToCollect.toFixed(2)})
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      min="0"
                      max={advanceType === "PERCENTAGE" ? 100 : (calcResult.grandTotal || 999999)}
                      step={advanceType === "PERCENTAGE" ? "1" : "10"}
                      className="jf-input"
                      placeholder={advanceType === "PERCENTAGE" ? "e.g. 50" : "0.00"}
                      value={advanceInput}
                      onChange={(e) => setAdvanceInput(e.target.value)}
                      disabled={isFinalized || !jobSnapshot}
                      style={{
                        paddingLeft: "2.4rem",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        borderColor: advanceInput ? "#10b981" : "#cbd5e1",
                        background: isFinalized || !jobSnapshot ? "#f8fafc" : "#ffffff"
                      }}
                    />
                    <span style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: advanceInput ? "#059669" : "#64748b",
                      fontWeight: 700,
                      fontSize: "0.95rem"
                    }}>
                      {advanceType === "PERCENTAGE" ? "%" : "RM"}
                    </span>
                  </div>

                  {/* Quick selection chips */}
                  {!isFinalized && jobSnapshot && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                      {advanceType === "PERCENTAGE" ? (
                        <>
                          {[
                            { label: "0%", val: 0 },
                            { label: "25%", val: 25 },
                            { label: "50%", val: 50 },
                            { label: "100% Full", val: 100 }
                          ].map((chip) => (
                            <button
                              key={chip.val}
                              type="button"
                              style={{
                                padding: "3px 8px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                borderRadius: "6px",
                                border: Number(advanceInput) === chip.val ? "1px solid #10b981" : "1px solid #e2e8f0",
                                background: Number(advanceInput) === chip.val ? "#ecfdf5" : "#f8fafc",
                                color: Number(advanceInput) === chip.val ? "#047857" : "#475569",
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                              onClick={() => setAdvanceInput(String(chip.val))}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </>
                      ) : (
                        <>
                          {[
                            { label: "Clear (RM 0)", val: 0 },
                            { label: "50%", val: Math.round(((calcResult.grandTotal || 0) * 0.5) * 100) / 100 },
                            { label: "100% Full", val: Math.round((calcResult.grandTotal || 0) * 100) / 100 }
                          ].map((chip) => (
                            <button
                              key={chip.label}
                              type="button"
                              style={{
                                padding: "3px 8px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                borderRadius: "6px",
                                border: Number(advanceInput) === chip.val && chip.val > 0 ? "1px solid #10b981" : "1px solid #e2e8f0",
                                background: Number(advanceInput) === chip.val && chip.val > 0 ? "#ecfdf5" : "#f8fafc",
                                color: Number(advanceInput) === chip.val && chip.val > 0 ? "#047857" : "#475569",
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                              onClick={() => setAdvanceInput(chip.val > 0 ? String(chip.val) : "")}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Column 2: Payment Method */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "6px" }}>
                Payment Method
              </label>
              <select
                className="jf-select"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                disabled={isFinalized}
                style={{
                  fontWeight: 500,
                  background: isFinalized ? "#f8fafc" : "#ffffff",
                  borderColor: "#cbd5e1"
                }}
              >
                <option value="UPI">UPI / QR Code (GPay, PhonePe, Paytm)</option>
                <option value="CASH">Cash Counter</option>
                <option value="CARD">Credit / Debit Card (POS Machine)</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
              </select>
              <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "6px" }}>
                Instant receipt recorded upon finalization
              </div>
            </div>

            {/* Column 3: Payment Ref / Note */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "6px" }}>
                Payment Ref / Receipt # <span style={{ fontWeight: 400, color: "#94a3b8" }}>(Optional)</span>
              </label>
              <input
                type="text"
                className="jf-input"
                placeholder="e.g. UTR / UPI Ref / Manual Receipt #"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                disabled={isFinalized}
                style={{
                  background: isFinalized ? "#f8fafc" : "#ffffff",
                  borderColor: "#cbd5e1"
                }}
              />
              <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "6px" }}>
                Audited on finalized commercial tax invoice
              </div>
            </div>
          </div>

          {/* Payment Summary KPI Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "0.85rem",
            marginTop: "1rem"
          }}>
            {(isSettlingBalance && initialAdvancePreviouslyPaid > 0) ? (
              <>
                {/* Card 1: Initial Advance Paid */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1.1rem",
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#475569"
                    }}>
                      <CheckCircle size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Initial Advance Paid
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                        Collected earlier
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#475569" }}>
                    RM {initialAdvancePreviouslyPaid.toFixed(2)}
                  </div>
                </div>

                {/* Card 2: Balance Collecting Today */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1.1rem",
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: "10px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#dcfce7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#166534"
                    }}>
                      <Wallet size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Balance Collecting Now
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#15803d" }}>
                        Settles order to 100% full payment
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#166534" }}>
                    RM {balanceToCollect.toFixed(2)}
                  </div>
                </div>

                {/* Card 3: Remaining Balance */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1.1rem",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "10px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#d1fae5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#059669"
                    }}>
                      <CheckCircle size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#065f46", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Remaining Balance
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#047857" }}>
                        Fully settled upon lock
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#059669" }}>
                    RM 0.00
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Card 1: Paid Amount */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1.1rem",
                  background: isPrintOnly ? "#faf5ff" : "#f0fdf4",
                  border: isPrintOnly ? "1px solid #ddd6fe" : "1px solid #bbf7d0",
                  borderRadius: "10px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: isPrintOnly ? "#f3e8ff" : "#dcfce7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isPrintOnly ? "#7e22ce" : "#166534"
                    }}>
                      <CheckCircle size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: isPrintOnly ? "#6b21a8" : "#166534", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        {isPrintOnly ? "Full Amount Paid" : "Advance Paid Now"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: isPrintOnly ? "#7e22ce" : "#15803d" }}>
                        {isPrintOnly ? "100% collected upon invoicing" : "Collected & recorded today"}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: isPrintOnly ? "#6b21a8" : "#166534" }}>
                    RM {currentAdvanceAmount.toFixed(2)}
                  </div>
                </div>

                {/* Card 2: Remaining Settlement Balance */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1.1rem",
                  background: isPrintOnly ? "#f0fdf4" : "#fffbeb",
                  border: isPrintOnly ? "1px solid #bbf7d0" : "1px solid #fde68a",
                  borderRadius: "10px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: isPrintOnly ? "#dcfce7" : "#fef3c7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isPrintOnly ? "#15803d" : "#b45309"
                    }}>
                      {isPrintOnly ? <CheckCircle size={16} /> : <Clock size={16} />}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: isPrintOnly ? "#166534" : "#92400e", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        {isPrintOnly ? "Balance Due" : "Remaining Balance"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: isPrintOnly ? "#15803d" : "#b45309" }}>
                        {isPrintOnly ? "Order winds up & completes" : "Due at settlement & delivery"}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: isPrintOnly ? "#166534" : "#b45309" }}>
                    RM {currentRemainingBalance.toFixed(2)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 3: Live Calculation & Totals Summary */}
        {/* Cost Summary */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "1.25rem"
        }}>
          {/* Totals Summary */}
          <div className="invoice-calc-summary" style={{ width: "380px" }}>
            <div className="invoice-calc-row">
              <span>Subtotal:</span>
              <strong>RM {Number(calcResult.subtotal || 0).toFixed(2)}</strong>
            </div>
            {Number(calcResult.discountTotal || 0) > 0 && (
              <>
                <div className="invoice-calc-row" style={{ color: "#15803d" }}>
                  <span>Discount ({Number(discountPercent || 0)}%):</span>
                  <strong>- RM {Number(calcResult.discountTotal || 0).toFixed(2)}</strong>
                </div>
                <div className="invoice-calc-row" style={{ color: "#334155", fontWeight: 600 }}>
                  <span>Net Taxable Subtotal:</span>
                  <strong>RM {Number(calcResult.taxableAmount || (calcResult.subtotal - calcResult.discountTotal) || 0).toFixed(2)}</strong>
                </div>
              </>
            )}
            {Number(gstRate || 0) > 0 && (
              <>
                <div className="invoice-calc-row">
                  <span>CGST ({Number(gstRate) / 2}%):</span>
                  <span>RM {Number(calcResult.cgstTotal || 0).toFixed(2)}</span>
                </div>
                <div className="invoice-calc-row">
                  <span>SGST ({Number(gstRate) / 2}%):</span>
                  <span>RM {Number(calcResult.sgstTotal || 0).toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="invoice-calc-row total">
              <span>Grand Total:</span>
              <span>RM {Number(calcResult.grandTotal || 0).toFixed(2)}</span>
            </div>
            {isPrintOnly ? (
              <>
                <div className="invoice-calc-row" style={{ color: "#6b21a8", fontWeight: 700 }}>
                  <span>Full Payment Collected:</span>
                  <span>- RM {Number(calcResult.grandTotal || 0).toFixed(2)}</span>
                </div>
                <div className="invoice-calc-row balance" style={{ color: "#059669", fontWeight: 800 }}>
                  <span>Balance Due:</span>
                  <span>RM 0.00 (Fully Settled • Winds Up)</span>
                </div>
              </>
            ) : (isSettlingBalance && initialAdvancePreviouslyPaid > 0) ? (
              <>
                <div className="invoice-calc-row" style={{ color: "#475569", fontWeight: 600 }}>
                  <span>Less: Initial Advance Paid:</span>
                  <span>- RM {initialAdvancePreviouslyPaid.toFixed(2)}</span>
                </div>
                <div className="invoice-calc-row" style={{ color: "#059669", fontWeight: 700 }}>
                  <span>Less: Balance Collected Now:</span>
                  <span>- RM {balanceToCollect.toFixed(2)}</span>
                </div>
                <div className="invoice-calc-row balance" style={{ color: "#059669", fontWeight: 800 }}>
                  <span>Remaining Balance Due:</span>
                  <span>RM 0.00 (Paid in Full • Order Completed)</span>
                </div>
              </>
            ) : (
              <>
                <div className="invoice-calc-row" style={{ color: "#059669", fontWeight: 600 }}>
                  <span>Less: Initial Advance Paid:</span>
                  <span>- RM {currentAdvanceAmount.toFixed(2)}</span>
                </div>
                <div className="invoice-calc-row balance" style={{ color: "#b45309" }}>
                  <span>Balance Due for Settlement:</span>
                  <span>RM {currentRemainingBalance.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* WhatsApp Share Form */}
        {showShareBox && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "0.875rem", marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#166534", marginBottom: "0.4rem" }}>
              Share Tax Invoice via WhatsApp:
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                className="jf-input"
                placeholder="Customer Phone (e.g. 9876543210)"
                value={shareRecipient}
                onChange={(e) => setShareRecipient(e.target.value)}
                style={{ maxWidth: "280px" }}
              />
              <button
                type="button"
                className="jf-btn jf-btn-primary jf-btn-sm"
                onClick={handleShare}
                disabled={loading}
              >
                Send WhatsApp Message
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="jf-btn jf-btn-secondary jf-btn-sm"
              onClick={handleResetForm}
              disabled={loading}
            >
              <RotateCcw size={14} /> Clear / New
            </button>
            {!isFinalized && (
              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                onClick={handleCreateDraft}
                disabled={loading || (!jobSnapshot && items.length === 0)}
              >
                Save Draft
              </button>
            )}
            {isFinalized && (
              <>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={() => {
                    setIsEditorPrintDirect(false);
                    setIsEditorBillOpen(true);
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Eye size={14} /> View Bill
                </button>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary jf-btn-sm"
                  onClick={() => {
                    setIsEditorPrintDirect(true);
                    setIsEditorBillOpen(true);
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#0284c7", borderColor: "#0284c7" }}
                >
                  <Printer size={14} /> Print Invoice
                </button>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={() => setShowShareBox(!showShareBox)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Share2 size={14} /> WhatsApp
                </button>
              </>
            )}
          </div>

          <div>
            {!isFinalized ? (
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={handleFinalizeInvoice}
                disabled={loading || (!jobSnapshot && items.length === 0)}
                title={(!jobSnapshot && items.length === 0) ? "Select a job order first" : "Finalize & Lock Commercial Tax Invoice and send Job Order to Designer"}
                style={{
                  background: (!jobSnapshot && items.length === 0) ? "#94a3b8" : "#059669",
                  borderColor: (!jobSnapshot && items.length === 0) ? "#94a3b8" : "#059669",
                  cursor: (!jobSnapshot && items.length === 0) ? "not-allowed" : loading ? "wait" : "pointer",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 1.4rem",
                  fontSize: "0.95rem"
                }}
              >
                <CheckCircle size={18} />
                {loading
                  ? (isPrintOnly ? "Finalizing Full Payment..." : "Finalizing & Locking...")
                  : !jobSnapshot
                  ? "Finalize & Lock Invoice →"
                  : isPrintOnly
                  ? "Finalize, Collect Full Amount & Complete Job →"
                  : (isSettlingBalance && initialAdvancePreviouslyPaid > 0)
                  ? `Finalize, Collect Balance (RM ${effectiveBalanceToPay.toFixed(2)}) & Complete Order →`
                  : isDesignOnly
                  ? (jobSnapshot?.designStatus === "COMPLETED" || jobSnapshot?.stage === "READY" || jobSnapshot?.currentStage === "READY" ? "Finalize, Collect Remaining Balance & Complete Order →" : "Finalize & Lock (Design Only) →")
                  : "Finalize & Lock (Send to Designer) →"}
              </button>
            ) : (
              <span className="jf-badge jf-badge-green" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
                <CheckCircle size={14} /> {isPrintOnly ? "Invoice Finalized with Full Payment • Job Completed & Wound Up" : isDesignOnly ? (jobSnapshot?.designStatus === "COMPLETED" ? "Invoice Finalized & Remaining Balance Collected • Order Completed" : "Invoice Finalized (Design Only)") : "Invoice Finalized & Sent to Designer"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Bill / Receipt Modal */}
      <InvoiceBillModal
        isOpen={isEditorBillOpen}
        autoPrint={isEditorPrintDirect}
        invoice={activeInvoice || {
          ...jobSnapshot,
          items,
          subtotal: calcResult.subtotal,
          discountTotal: calcResult.discountTotal,
          taxableAmount: calcResult.taxableAmount,
          cgstTotal: calcResult.cgstTotal,
          sgstTotal: calcResult.sgstTotal,
          grandTotal: calcResult.grandTotal,
          advancePaid: currentAdvanceAmount,
          balanceDue: currentRemainingBalance,
          paymentMode,
          paymentReference: paymentRef,
        }}
        onClose={() => {
          setIsEditorBillOpen(false);
          setIsEditorPrintDirect(false);
        }}
      />
    </div>
  );
};

export default InvoiceEditorSection;


