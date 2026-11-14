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
import { calculateInvoiceTotals, discountToPayload, round2 } from "../utils/invoiceMath";
import { customersApi } from "../../customers/api/customersApi";
import StatusBadge from "../../shared/components/StatusBadge";
import JobTypeBadge from "../../shared/components/JobTypeBadge";
import InvoiceBillModal from "./InvoiceBillModal";
import { DateField } from "../../../../shared/ui/selects/CalendarSelect";
import "../styles/invoice.css";

export const InvoiceEditorSection = ({
  selectedJobOrderId,
  onLiveCalculationChange,
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
  // Which discount box the user used last: a percentage or a fixed rupee amount (any size)
  const [discountMode, setDiscountMode] = useState("FIXED");
  // How this invoice is paid: the whole amount now ("FULL") or an advance now and the balance before delivery ("ADVANCE")
  const [paymentPlan, setPaymentPlan] = useState("ADVANCE");
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
  const isFullPayment = paymentPlan === "FULL";

  const stageUpper = String(
    jobSnapshot?.currentStage ||
    jobSnapshot?.stage ||
    jobSnapshot?.raw?.currentStage ||
    jobSnapshot?.raw?.stage ||
    activeInvoice?.stage ||
    activeInvoice?.currentStage ||
    ""
  ).toUpperCase();
  const isDesignCompletedOrReady =
    stageUpper === "READY" ||
    stageUpper === "COMPLETED" ||
    stageUpper === "DELIVERED" ||
    String(jobSnapshot?.designStatus || "").toUpperCase() === "COMPLETED" ||
    String(activeInvoice?.designStatus || "").toUpperCase() === "COMPLETED";

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
    Math.round((orderGrandTotal - initialAdvancePreviouslyPaid) * 100) / 100
  );

  const isSettlingBalance =
    initialAdvancePreviouslyPaid > 0 &&
    balanceToCollect > 0;

  const effectiveBalanceToPay = isSettlingBalance
    ? (balanceCollectedInput !== "" && !isNaN(parseFloat(balanceCollectedInput))
        ? Math.min(balanceToCollect, Math.max(0, parseFloat(balanceCollectedInput) || 0))
        : balanceToCollect)
    : balanceToCollect;
  const remainingBalanceAfterPay = Math.max(0, Math.round((balanceToCollect - effectiveBalanceToPay) * 100) / 100);

  const isFinalized =
    invoiceStatus === "PAID" ||
    (invoiceStatus === "FINALIZED" && !isSettlingBalance && balanceToCollect <= 0);
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
      subtitle: `${j.jobNo || "Job"} • ${j.customerPhone || "No Phone"} • ₹ ${Number(j.estimateAmount || j.subtotal || j.grandTotal || 0).toFixed(2)}`,
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

  const handleResetForm = (skipOnClear = false) => {
    setActiveInvoice(null);
    setJobSnapshot(null);
    setCustomerSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    setItems([]);
    setAdditionalCharges([]);
    setDiscountPercent("");
    setDiscountAmount("");
    setPaymentPlan("ADVANCE");
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
    if (skipOnClear !== true && onClear) onClear();
  };

  // Load job and invoice data when selectedJobOrderId changes
  useEffect(() => {
    if (selectedJobOrderId) {
      loadJobAndInvoiceData(selectedJobOrderId);
    } else {
      // empty form (Create Invoice tab): reset only, don't navigate back to the list
      handleResetForm(true);
    }
  }, [selectedJobOrderId]);

  const numAdvanceVal = Math.max(0, parseFloat(advanceInput) || 0);
  const currentAdvanceAmount = isFullPayment
    ? (calcResult.grandTotal || 0)
    : (advanceType === "PERCENTAGE"
      ? Math.min(calcResult.grandTotal || 0, Math.round((((calcResult.grandTotal || 0) * Math.min(100, numAdvanceVal)) / 100) * 100) / 100)
      : Math.min(calcResult.grandTotal || 0, numAdvanceVal));
  const currentRemainingBalance = isFullPayment
    ? 0
    : Math.max(0, Math.round(((calcResult.grandTotal || 0) - currentAdvanceAmount) * 100) / 100);

  // Notify parent of live calculation changes so table below stays synchronized in real time
  useEffect(() => {
    if (onLiveCalculationChange && jobSnapshot) {
      const jId = jobSnapshot._id || jobSnapshot.id || jobSnapshot.jobOrderId || selectedJobOrderId;
      const orderGT = Number(calcResult.grandTotal || 0);
      if (jId && orderGT > 0) {
        onLiveCalculationChange({
          jobId: jId,
          grandTotal: orderGT,
          advancePaid: initialAdvancePreviouslyPaid || currentAdvanceAmount,
          balanceDue: balanceToCollect,
        });
      }
    }
  }, [calcResult.grandTotal, balanceToCollect, initialAdvancePreviouslyPaid, currentAdvanceAmount, jobSnapshot, selectedJobOrderId]);

  // Items without any line-level discount: the invoice discount is applied once, on the whole invoice
  const stripLineDiscounts = (list) =>
    (list || []).map(({ discountType, discountValue, discountAmount: _d, ...rest }) => rest);

  const handleDiscountPercentChange = (val) => {
    setBalanceCollectedInput("");
    setDiscountMode("PERCENTAGE");
    const pct = Math.max(0, Math.min(100, parseFloat(val) || 0));
    setDiscountPercent(val === "" ? "" : String(pct));
    const t = calculateInvoiceTotals({
      items: withTaxRates(items),
      additionalCharges: withTaxRates(additionalCharges),
      discountType: "PERCENTAGE",
      discountValue: pct,
    });
    setDiscountAmount(t.discountTotal > 0 ? String(t.discountTotal) : "");
    setItems(stripLineDiscounts(items));
  };

  const handleDiscountAmountChange = (val) => {
    setBalanceCollectedInput("");
    setDiscountMode("FIXED");
    setDiscountAmount(val);
    const amt = Math.max(0, parseFloat(val) || 0);
    const t = calculateInvoiceTotals({
      items: withTaxRates(items),
      additionalCharges: withTaxRates(additionalCharges),
      discountType: "FIXED",
      discountValue: amt,
    });
    const base = t.subtotal + t.additionalChargesTotal;
    setDiscountPercent(t.discountTotal > 0 && base > 0 ? String(round2((t.discountTotal / base) * 100)) : "");
    setItems(stripLineDiscounts(items));
  };

  const handleGstRateChange = (newRate) => {
    const rate = Number(newRate);
    setGstRate(rate);
    const updated = (items || []).map((it) => ({
      ...it,
      taxRate: rate,
    }));
    setItems(updated);
    setAdditionalCharges((prev) => (prev || []).map((c) => ({ ...c, taxRate: rate })));
  };

  // Every line carries a GST rate; a line without one uses the invoice's selected GST rate
  const withTaxRates = (list, rate = gstRate) =>
    (list || []).map((it) => ({
      ...it,
      taxRate: Number(rate) || 0,
    }));

  // The part of every save / calculate request that the totals depend on
  const invoicePayloadBase = () => ({
    items: withTaxRates(items),
    additionalCharges: withTaxRates(additionalCharges),
    ...discountToPayload(discountMode, discountPercent, discountAmount),
    gstRate: Number(gstRate) || 0,
    paymentPlan,
  });

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
    const discount = discountToPayload(discountMode, discPct, discAmt);
    const estAmount = Number(snapshot?.subtotal || snapshot?.estimatedPrice || snapshot?.grandTotal || 0);
    const totals = calculateInvoiceTotals({
      items: withTaxRates(itemsList, gRate),
      additionalCharges: withTaxRates(chargesList, gRate),
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      estimateAmount: estAmount,
    });

    const numAdv = Math.max(0, parseFloat(advInp) || 0);
    const advAmt = isFullPayment
      ? totals.grandTotal
      : advType === "PERCENTAGE"
      ? Math.min(totals.grandTotal, round2((totals.grandTotal * Math.min(100, numAdv)) / 100))
      : Math.min(totals.grandTotal, numAdv);

    setCalcResult({
      ...totals,
      advanceApplied: advAmt,
      balanceDue: Math.max(0, round2(totals.grandTotal - advAmt)),
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
      setPaymentPlan(isPrintOnlyOrder ? "FULL" : "ADVANCE");
      if (isDesignCompletedOrReady) {
        // Design Only with completed design: the whole remaining balance is settled
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

      // Determine GST / Tax rate from job order or invoice
      // GST is chosen once, on the invoice. A saved invoice keeps its rate; a new one starts at 0%.
      const initialGstRate = (() => {
        if (currentInv) {
          if (currentInv.gstRate !== undefined && currentInv.gstRate !== null && !isNaN(Number(currentInv.gstRate))) {
            return Number(currentInv.gstRate);
          }
          // Invoices saved before the common rate existed: the rate of their first line
          const legacy = currentInv.items?.[0]?.taxRate;
          if (legacy !== undefined && legacy !== null && !isNaN(Number(legacy))) return Number(legacy);
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
        if (currentInv.paymentPlan) setPaymentPlan(currentInv.paymentPlan);
        if (currentInv.discountTotal) {
          setDiscountAmount(String(currentInv.discountTotal));
          const base = Number(currentInv.subtotal || 0) + Number(currentInv.additionalChargesTotal || 0);
          if (currentInv.invoiceDiscountType === "PERCENTAGE" && Number(currentInv.invoiceDiscountValue) > 0) {
            setDiscountMode("PERCENTAGE");
            setDiscountPercent(String(currentInv.invoiceDiscountValue));
          } else {
            setDiscountMode("FIXED");
            if (base > 0) setDiscountPercent(String(round2((Number(currentInv.discountTotal) / base) * 100)));
          }
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
        const isSettlingBalance = effectiveAdvancePreviouslyPaid > 0 && currentBalDue > 0;

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
          setBalanceCollectedInput("");
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
        // Only a job order with an approved estimate can be invoiced: there is no counter sale here
        setCustomerSearchQuery(result.title);
        toast.info("This customer has no job order ready for invoicing. Approve the estimate of a job order first.");
      }
    }
  };

  useEffect(() => {
    if (!isFinalized && jobSnapshot) {
      computeLocalEstimate(items, additionalCharges, jobSnapshot, advanceType, advanceInput, discountPercent, discountAmount, gstRate);
    }
  }, [items, additionalCharges, advanceType, advanceInput, discountPercent, discountAmount, discountMode, paymentPlan, gstRate, jobSnapshot, isFinalized]);

  // Create or Update Draft Invoice
  const handleCreateDraft = async () => {
    const jId = selectedJobOrderId || jobSnapshot?.jobOrderId || jobSnapshot?._id;
    if (!jId) {
      toast.warn("Please search and select a customer or job order first.");
      return;
    }
    const invId = activeInvoice?._id || activeInvoice?.id;
    setLoading(true);
    try {
      const totalAmountToApply = (isSettlingBalance && initialAdvancePreviouslyPaid > 0)
        ? Math.round((initialAdvancePreviouslyPaid + effectiveBalanceToPay) * 100) / 100
        : currentAdvanceAmount;

      if (invId) {
        const res = await invoiceApi.updateDraftInvoice(invId, {
          ...invoicePayloadBase(),
          advancePaid: totalAmountToApply,
          advanceApplied: totalAmountToApply,
          advanceType,
          advanceValue: numAdvanceVal,
          paymentMode,
          paymentReference: paymentRef,
          remarks,
          dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
        });
        const updated = res?.data || res;
        setActiveInvoice(updated);
        toast.success("Draft Invoice updated successfully!");
        if (onInvoiceFinalized) onInvoiceFinalized(updated);
        return;
      }

      const res = await invoiceApi.createDraftInvoice({
        jobOrderId: jId,
        ...invoicePayloadBase(),
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
        ...invoicePayloadBase(),
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
        toast.warn("Variance > 5% or ₹500 tolerance. Submitted for Manager Variance Approval!");
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
          ...invoicePayloadBase(),
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

      // 1.5 If collecting remaining balance on an already finalized invoice
      if (isSettlingBalance && current?.status && current.status !== "DRAFT") {
        try {
          await invoiceApi.collectPayment(invId, {
            amount: effectiveBalanceToPay,
            paymentMode,
            paymentReference: paymentRef,
            remarks: "Remaining balance payment collected upon order completion.",
          });
        } catch (payErr) {
          // The payment was not recorded: say so and stop, never show the invoice as settled
          toast.error(payErr.response?.data?.message || "The balance payment could not be recorded.");
          return;
        }
        const refreshed = await invoiceApi.getInvoiceById(invId).catch(() => null);
        const settledInvoice = refreshed?.data || refreshed || current;
        setActiveInvoice(settledInvoice);
        const balanceLeft = Number(settledInvoice?.balanceDue || 0);
        setCalcResult((prev) => ({
          ...prev,
          advanceApplied: Number(settledInvoice?.advanceApplied || prev.advanceApplied || 0),
          balanceDue: balanceLeft,
        }));
        toast.success(
          balanceLeft <= 0
            ? `Balance of ₹ ${effectiveBalanceToPay.toFixed(2)} collected. Invoice fully settled.`
            : `₹ ${effectiveBalanceToPay.toFixed(2)} collected. ₹ ${balanceLeft.toFixed(2)} still due.`
        );
        if (onInvoiceFinalized) onInvoiceFinalized(settledInvoice);
        return;
      }

      // 2. Sync items, charges & advance to draft
      try {
        const updated = await invoiceApi.updateDraftInvoice(invId, {
          ...invoicePayloadBase(),
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
      // Step 3a: If still in DRAFT with approvalRequired, submit for approval first
      if (current.approvalRequired && (!current.status || current.status === "DRAFT")) {
        try {
          const subRes = await invoiceApi.submitInvoiceForApproval(invId, {
            comments: managerApprovalRemarks || "Auto-submitted for variance approval",
          });
          current = subRes?.data || subRes;
          setActiveInvoice(current);
        } catch (subErr) {
          console.warn("Submit for approval warning:", subErr);
        }
      }
      // Step 3b: Only call approveVariance if invoice is now PENDING_APPROVAL
      if (current.status === "PENDING_APPROVAL") {
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
      } else if (isFullPayment) {
        toast.success(`Invoice ${finalized.invoiceNumber || "INV-Finalized"} locked! Full payment recorded. ${isPrintOnly ? "Job order sent to Production." : "Job order sent to Designer Queue."}`);
      } else {
        toast.success(`Invoice ${finalized.invoiceNumber || "INV-Finalized"} locked! Advance payment recorded. ${isPrintOnly ? "Job order sent to Production." : "Job order sent to Designer Queue."}`);
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

  // Notify parent of live calculation changes so table below stays synchronized in real time
  useEffect(() => {
    if (onLiveCalculationChange && jobSnapshot) {
      const jId = jobSnapshot._id || jobSnapshot.id || jobSnapshot.jobOrderId || selectedJobOrderId;
      const orderGT = Number(calcResult.grandTotal || 0);
      if (jId && orderGT > 0) {
        onLiveCalculationChange({
          jobId: jId,
          grandTotal: orderGT,
          advancePaid: initialAdvancePreviouslyPaid || currentAdvanceAmount,
          balanceDue: balanceToCollect,
        });
      }
    }
  }, [calcResult.grandTotal, balanceToCollect, initialAdvancePreviouslyPaid, currentAdvanceAmount, jobSnapshot, selectedJobOrderId]);

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
              {isFullPayment ? "Total Invoice Amount" : "Advance Paid (Recorded)"}
            </div>
            <div style={{ fontWeight: 700, color: isFullPayment ? "#6b21a8" : "#059669", fontSize: "1.1rem" }}>
              ₹ {Number(isFullPayment ? (calcResult.grandTotal || jobSnapshot?.grandTotal || 0) : (initialAdvancePreviouslyPaid || jobSnapshot?.advancePaid || 0)).toFixed(2)}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#475569" }}>
              {isFullPayment ? "100% Full Payment Required (No Advance)" : "Auto-deducted from settlement balance"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#475569", textTransform: "uppercase", fontWeight: 600 }}>Invoice Due Date</div>
            <DateField
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isFinalized || !jobSnapshot}
              style={{ marginTop: "0.2rem" }}
            />
          </div>
        </div>

        {/* Section 1: Billable Line Items */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
           
              {isSettlingBalance && (
                <span className="jf-badge jf-badge-gray" style={{ fontSize: "0.72rem" }}>
                  🔒 Locked for Settlement
                </span>
              )}
            </div>
            
          </div>

          <table className="jf-table" style={{ fontSize: "0.875rem" }}>
            <thead>
              <tr>
                <th>Item Description</th>
                <th style={{ width: "110px" }}>Qty</th>
                <th style={{ width: "130px" }}>Unit Price (₹)</th>
                <th style={{ width: "130px", textAlign: "right" }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "1.75rem", color: "#64748b" }}>
                    {jobSnapshot ? (
                      <div>This job order has no billable items.</div>
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
                  const lineTotal = Math.round(Number(it.quantity || 0) * Number(it.unitPrice || 0) * 100) / 100;
                return (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          className="jf-input"
                          value={it.itemName}
                          readOnly
                          disabled
                          title="The item follows the approved estimate and cannot be edited"
                        />
                      </td>
                      <td style={{ fontWeight: 600 }}>{Number(it.quantity || 0)}</td>
                      <td style={{ fontWeight: 600 }}>₹ {Number(it.unitPrice || 0).toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        ₹ {lineTotal.toFixed(2)}
                      </td>
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
                ₹ {Number(calcResult.taxableAmount || (calcResult.subtotal - (calcResult.discountTotal || 0)) || 0).toFixed(2)}
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

            {/* Column 2: Discount Amount (₹) */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>
                  Discount Amount (₹)
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
                }}>₹</span>
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
                <option value={0}>0% - No GST / Exempt</option>
                <option value={5}>5% - GST (5%)</option>
                <option value={12}>12% - GST (12%)</option>
                <option value={18}>18% - GST (18%)</option>
                <option value={28}>28% - GST (28%)</option>
                {![0, 5, 12, 18, 28].includes(Number(gstRate)) && (
                  <option value={Number(gstRate)}>{gstRate}% - Applied Tax</option>
                )}
              </select>
              {/* <div style={{ fontSize: "0.72rem", color: isSettlingBalance ? "#059669" : "#64748b", marginTop: "5px", fontWeight: isSettlingBalance ? 600 : 400 }}>
                {isSettlingBalance
                  ? `🔒 Tax rate locked to ${gstRate}% (matches initial advance payment)`
                  : gstRate > 0
                  ? `GST: ${gstRate}% applied across all items`
                  : "No tax charged on this invoice"}
              </div> */}
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
                    {isFullPayment
                      ? "3. Collect Full Payment"
                      : (isSettlingBalance && initialAdvancePreviouslyPaid > 0)
                      ? `3. Collect Remaining Balance (₹ ${effectiveBalanceToPay.toFixed(2)})`
                      : "3. Collect Advance Payment"}
                  </span>
                  {isPrintOnly && <JobTypeBadge jobType="Print Only" size="sm" />}
                  {(isSettlingBalance && initialAdvancePreviouslyPaid > 0) && (
                    <span className="jf-badge jf-badge-green" style={{ fontSize: "0.75rem" }}>
                      Settling Remaining Balance
                    </span>
                  )}
                </div>
                {/* {isFullPayment ? (
                  <div style={{ fontSize: "0.78rem", color: "#6b21a8", fontWeight: 600, marginTop: "2px" }}>
                    Print Only: 100% Full Payment collected upfront. Order completes directly upon invoice settlement.
                  </div>
                ) : (isSettlingBalance && initialAdvancePreviouslyPaid > 0) ? (
                  <div style={{ fontSize: "0.78rem", color: "#047857", fontWeight: 600, marginTop: "2px" }}>
                    Design approved by customer. Collect remaining balance of ₹ {balanceToCollect.toFixed(2)} to complete and close order. (Amount is editable below).
                  </div>
                ) : (
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Collect customer advance to confirm commercial order before design allocation
                  </div>
                )} */}
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
              {(isSettlingBalance && initialAdvancePreviouslyPaid > 0) ? (
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
                  ✓ Balance Settlement (₹ {effectiveBalanceToPay.toFixed(2)})
                </div>
              ) : (
                <>
                  {["FULL", "ADVANCE"].map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      disabled={isFinalized}
                      onClick={() => {
                        setPaymentPlan(plan);
                        setBalanceCollectedInput("");
                      }}
                      style={{
                        padding: "5px 12px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        border: "none",
                        borderRadius: "6px",
                        background: paymentPlan === plan ? "#0f766e" : "transparent",
                        color: paymentPlan === plan ? "#ffffff" : "#475569",
                        boxShadow: paymentPlan === plan ? "0 2px 4px rgba(0,0,0,0.12)" : "none",
                        cursor: isFinalized ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {plan === "FULL" ? "Full Payment" : "Advance"}
                    </button>
                  ))}
                  {!isFullPayment && (<>
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
                    ₹ Fixed Amount
                  </button>
                  </>)}
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
                  {isFullPayment
                    ? "Full Amount Payable (₹)"
                    : (isSettlingBalance && initialAdvancePreviouslyPaid > 0)
                    ? "Remaining Balance to Collect (₹ - Editable)"
                    : `Advance ${advanceType === "PERCENTAGE" ? "(Percentage %)" : "(Amount in ₹)"}`}
                </label>
                {!isFullPayment && !(isSettlingBalance && initialAdvancePreviouslyPaid > 0) && advanceType === "PERCENTAGE" && numAdvanceVal > 0 && (
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#15803d", background: "#dcfce7", padding: "1px 6px", borderRadius: "4px" }}>
                    = ₹ {currentAdvanceAmount.toFixed(2)}
                  </span>
                )}
              </div>

              {isFullPayment ? (
                <div>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="jf-input"
                      readOnly
                      value={`₹ ${Number(calcResult.grandTotal || 0).toFixed(2)}`}
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
                    ✓ 100% full payment collected upfront upon invoicing.
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
                      ₹
                    </span>
                  </div>
                  {/* <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", flexWrap: "wrap", gap: "4px" }}>
                    <div style={{ fontSize: "0.74rem", color: "#047857", fontWeight: 600 }}>
                      ✓ Initial advance ₹ {initialAdvancePreviouslyPaid.toFixed(2)} recorded.
                    </div>
                    {remainingBalanceAfterPay > 0 ? (
                      <span style={{ fontSize: "0.74rem", color: "#b45309", fontWeight: 700 }}>
                        Remaining Due: ₹ {remainingBalanceAfterPay.toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.74rem", color: "#059669", fontWeight: 700 }}>
                        ✓ Full Balance Cleared
                      </span>
                    )}
                  </div> */}
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
                        Collect Full Balance (₹ {balanceToCollect.toFixed(2)})
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
                      {advanceType === "PERCENTAGE" ? "%" : "₹"}
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
                            { label: "Clear (₹ 0)", val: 0 },
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
                <option value="UPI">UPI / QR Code</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="BANK_TRANSFER">Net Banking / Bank Transfer</option>
              </select>
             
            </div>

            {/* Column 3: Payment Ref / Note */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "6px" }}>
                Payment Ref / Receipt 
              </label>
              <input
                type="text"
                className="jf-input"
                placeholder="e.g. UPI Ref / Card Slip # / Receipt #"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                disabled={isFinalized}
                style={{
                  background: isFinalized ? "#f8fafc" : "#ffffff",
                  borderColor: "#cbd5e1"
                }}
              />
              
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
                      
                    </div>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#475569" }}>
                    ₹ {initialAdvancePreviouslyPaid.toFixed(2)}
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
                      
                    </div>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#166534" }}>
                    ₹ {effectiveBalanceToPay.toFixed(2)}
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
                     
                    </div>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#059669" }}>
                    ₹ 0.00
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
                  background: isFullPayment ? "#faf5ff" : "#f0fdf4",
                  border: isFullPayment ? "1px solid #ddd6fe" : "1px solid #bbf7d0",
                  borderRadius: "10px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: isFullPayment ? "#f3e8ff" : "#dcfce7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isFullPayment ? "#7e22ce" : "#166534"
                    }}>
                      <CheckCircle size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: isFullPayment ? "#6b21a8" : "#166534", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        {isFullPayment ? "Full Amount Paid" : "Advance Paid Now"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: isFullPayment ? "#7e22ce" : "#15803d" }}>
                        {isFullPayment ? "100% collected upon invoicing" : "Collected & recorded today"}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: isFullPayment ? "#6b21a8" : "#166534" }}>
                    ₹ {currentAdvanceAmount.toFixed(2)}
                  </div>
                </div>

                {/* Card 2: Remaining Settlement Balance */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1.1rem",
                  background: isFullPayment ? "#f0fdf4" : "#fffbeb",
                  border: isFullPayment ? "1px solid #bbf7d0" : "1px solid #fde68a",
                  borderRadius: "10px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: isFullPayment ? "#dcfce7" : "#fef3c7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isFullPayment ? "#15803d" : "#b45309"
                    }}>
                      {isFullPayment ? <CheckCircle size={16} /> : <Clock size={16} />}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: isFullPayment ? "#166534" : "#92400e", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        {isFullPayment ? "Balance Due" : "Remaining Balance"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: isFullPayment ? "#15803d" : "#b45309" }}>
                        {isFullPayment ? "Nothing left to collect" : "Settle before delivery"}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: isFullPayment ? "#166534" : "#b45309" }}>
                    ₹ {currentRemainingBalance.toFixed(2)}
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
          <div className="invoice-calc-summary" style={{ width: "500px" }}>
            <div className="invoice-calc-row">
              <span>Subtotal:</span>
              <strong>₹ {Number(calcResult.subtotal || 0).toFixed(2)}</strong>
            </div>
            {Number(calcResult.discountTotal || 0) > 0 && (() => {
              const effectivePct = Number(discountPercent) > 0
                ? Number(discountPercent)
                : (Number(calcResult.subtotal || 0) > 0
                    ? Math.round(((Number(calcResult.discountTotal) / Number(calcResult.subtotal)) * 100) * 10) / 10
                    : 0);
            return (
                <>
                  <div className="invoice-calc-row" style={{ color: "#15803d" }}>
                    <span>Discount ({effectivePct}%):</span>
                    <strong>- ₹ {Number(calcResult.discountTotal || 0).toFixed(2)}</strong>
                  </div>
                  <div className="invoice-calc-row" style={{ color: "#334155", fontWeight: 600 }}>
                    <span>Net Taxable Subtotal:</span>
                    <strong>₹ {Number(calcResult.taxableAmount || (calcResult.subtotal - calcResult.discountTotal) || 0).toFixed(2)}</strong>
                  </div>
                </>
              );
            })()}
            {Number(gstRate || 0) > 0 && (
              <div className="invoice-calc-row">
                <span>GST ({Number(gstRate)}%):</span>
                <span>₹ {Number((calcResult.cgstTotal || 0) + (calcResult.sgstTotal || 0)).toFixed(2)}</span>
              </div>
            )}
            <div className="invoice-calc-row total">
              <span>Grand Total:</span>
              <span>₹ {Number(calcResult.grandTotal || 0).toFixed(2)}</span>
            </div>
            {isFullPayment ? (
              <>
                <div className="invoice-calc-row" style={{ color: "#6b21a8", fontWeight: 700 }}>
                  <span>Full Payment Collected:</span>
                  <span>- ₹ {Number(calcResult.grandTotal || 0).toFixed(2)}</span>
                </div>
                <div className="invoice-calc-row balance" style={{ color: "#059669", fontWeight: 800 }}>
                  <span>Balance Due:</span>
                  <span>₹ 0.00 (Fully Paid)</span>
                </div>
              </>
            ) : isSettlingBalance ? (
              <>
                <div className="invoice-calc-row" style={{ color: "#475569", fontWeight: 600 }}>
                  <span>Less: Initial Advance Paid:</span>
                  <span>- ₹ {initialAdvancePreviouslyPaid.toFixed(2)}</span>
                </div>
                <div className="invoice-calc-row" style={{ color: "#059669", fontWeight: 700 }}>
                  <span>Less: Balance Collecting Now:</span>
                  <span>- ₹ {effectiveBalanceToPay.toFixed(2)}</span>
                </div>
                <div className="invoice-calc-row balance" style={{ color: remainingBalanceAfterPay <= 0 ? "#059669" : "#b45309", fontWeight: 800 }}>
                  <span>Remaining Balance Due:</span>
                  <span>₹ {remainingBalanceAfterPay.toFixed(2)} {remainingBalanceAfterPay <= 0 ? "(Paid in Full)" : ""}</span>
                </div>
              </>
            ) : (invoiceStatus === "PAID" || (initialAdvancePreviouslyPaid > 0 && balanceToCollect <= 0)) ? (
              <>
                <div className="invoice-calc-row" style={{ color: "#475569", fontWeight: 600 }}>
                  <span>Initial Advance Paid:</span>
                  <span>- ₹ {initialAdvancePreviouslyPaid.toFixed(2)}</span>
                </div>
                {orderGrandTotal > initialAdvancePreviouslyPaid && (
                  <div className="invoice-calc-row" style={{ color: "#059669", fontWeight: 700 }}>
                    <span>Balance Collected:</span>
                    <span>- ₹ {(orderGrandTotal - initialAdvancePreviouslyPaid).toFixed(2)}</span>
                  </div>
                )}
                <div className="invoice-calc-row balance" style={{ color: "#059669", fontWeight: 800 }}>
                  <span>Balance Due:</span>
                  <span>₹ 0.00 (Paid in Full)</span>
                </div>
              </>
            ) : (
              <>
                <div className="invoice-calc-row" style={{ color: "#059669", fontWeight: 600 }}>
                  <span>Less: Initial Advance Paid:</span>
                  <span>- ₹ {currentAdvanceAmount.toFixed(2)}</span>
                </div>
                <div className="invoice-calc-row balance" style={{ color: "#b45309" }}>
                  <span>Balance Due for Settlement:</span>
                  <span>₹ {currentRemainingBalance.toFixed(2)}</span>
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
                  ? (isFullPayment ? "Finalizing Full Payment..." : "Finalizing & Locking...")
                  : !jobSnapshot
                  ? "Finalize & Lock Invoice →"
                  : isFullPayment
                  ? "Finalize & Lock (Full Payment) →"
                  : isSettlingBalance
                  ? `Collect Balance (₹ ${effectiveBalanceToPay.toFixed(2)}) & Complete Order →`
                  : isDesignOnly
                  ? (jobSnapshot?.designStatus === "COMPLETED" || jobSnapshot?.stage === "READY" || jobSnapshot?.currentStage === "READY" ? "Finalize, Collect Remaining Balance & Complete Order →" : "Finalize & Lock (Design Only) →")
                  : (isPrintOnly ? "Finalize & Lock (Send to Production) →" : "Finalize & Lock (Send to Designer) →")}
              </button>
            ) : (
              <span className="jf-badge jf-badge-green" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
                <CheckCircle size={14} /> {isFullPayment ? "Invoice Finalized with Full Payment" : isSettlingBalance || (initialAdvancePreviouslyPaid > 0 && balanceToCollect <= 0) ? "Invoice Settled • Full Balance Collected (Balance: ₹ 0.00)" : isDesignOnly ? "Invoice Finalized (Design Only)" : (isPrintOnly ? "Invoice Finalized & Sent to Production" : "Invoice Finalized & Sent to Designer")}
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
          paymentPlan,
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


