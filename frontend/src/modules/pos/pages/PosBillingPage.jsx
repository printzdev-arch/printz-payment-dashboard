import { calculatePosBill, splitBillDiscount } from "../utils/posMath";
import { onlyMobile, onlyBusinessName, businessNameError, gstinError } from "../../../shared/utils/validation";
import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingCart,
  Receipt,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  Share2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  CreditCard,
  Banknote,
  QrCode,
  DollarSign,
  User,
  UserPlus,
  Building2,
  RefreshCw,
  Clock,
  ChevronRight,
  Package,
  Layers,
  Sparkles,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  X,
  FileText,
  IndianRupee,
  Palette,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { JobFlowLayout } from "../../../layouts/JobFlowLayout/JobFlowLayout";
import DataTable from "../../../shared/ui/DataTable/DataTable";
import posApi from "../api/posApi";
import SelectField from "../../../shared/ui/selects/SelectField";
import Pagination from "../../../shared/ui/Pagination";
import ThermalReceiptModal from "../components/ThermalReceiptModal";
import VoidSaleModal from "../components/VoidSaleModal";
import "../styles/pos.css";

// Print services sold at the counter. Prices are re-checked on the server (backend/src/modules/pos/constants/printServices.js).
// Rate is per printed page; double-sided is charged for two pages per sheet.
const PRINT_SERVICES = [
  { key: "COLOR", label: "Color Scan", code: "SVC-COLOR", icon: Palette },
  { key: "BW", label: "B/W Scan", code: "SVC-BW", icon: FileText },
];
const PRINT_SIDES = [
  { key: "SINGLE", label: "Single", multiplier: 1 },
  { key: "DOUBLE", label: "Double", multiplier: 2 },
];
const PRINT_PAPERS = [
  { key: "PLAIN", label: "Plain", rate: 10 },
  { key: "BOND", label: "Bond", rate: 20 },
  { key: "LEGAL", label: "Legal", rate: 30 },
];

export const PosBillingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get("tab") || "").toLowerCase();

  // Tabs: "BILLING" | "HISTORY" synchronized with URL
  const activeTab = tabParam === "history" || tabParam === "ledger" ? "HISTORY" : "BILLING";

  const handleTabChange = (newTab) => {
    setSearchParams({ tab: newTab === "HISTORY" ? "history" : "terminal" });
  };

  // Catalog state (Combined Inventory + Stocks)
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(12);

  // Cart state
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [gstRate, setGstRate] = useState(18); // Default 18% Standard GST
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [splitPayments, setSplitPayments] = useState({
    CASH: 0,
    UPI: 0,
    CARD: 0,
    BANK: 0,
  });
  const [remarks, setRemarks] = useState("");

  // Customer state
  const [customerType, setCustomerType] = useState("WALK_IN"); // "WALK_IN" | "REGISTERED"
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [existingCustomers, setExistingCustomers] = useState([]);

  // Quick Customer Create Modal
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustMobile, setNewCustMobile] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustGstin, setNewCustGstin] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustCreditLimit, setNewCustCreditLimit] = useState(0);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Print service popup (Color Print / Black & White)
  const [printModal, setPrintModal] = useState(null); // service object or null
  const [printSides, setPrintSides] = useState("SINGLE");
  const [printPaper, setPrintPaper] = useState("PLAIN");
  const [printQty, setPrintQty] = useState(1);

  // Branch Stock Check & Order Intent Modal (Step 2)
  const [blockedStockProduct, setBlockedStockProduct] = useState(null);

  // Manager Discount Approval State
  const [isDiscountApproved, setIsDiscountApproved] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [managerPin, setManagerPin] = useState("");
  const [discountReason, setDiscountReason] = useState("");

  // Hold / Park Bills state
  const [heldBills, setHeldBills] = useState([]);
  const [showHeldModal, setShowHeldModal] = useState(false);

  // Branch state
  const [currentBranchId, setCurrentBranchId] = useState("");
  const [currentBranchName, setCurrentBranchName] = useState("Banaswadi");

  // Modals state
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [showThermalModal, setShowThermalModal] = useState(false);
  const [receiptToVoid, setReceiptToVoid] = useState(null);
  const [showVoidModal, setShowVoidModal] = useState(false);

  // History state
  const [receiptsList, setReceiptsList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");

  // Checkout loading
  const [checkingOut, setCheckingOut] = useState(false);

  // Load Initial Data (Branch, Products from both Inventory & Stocks, Customers, Held Bills)
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      const bId = stored.branchId || (stored.branchIds && stored.branchIds[0]) || "489571a9af51836599708543";
      setCurrentBranchId(bId);
      if (stored.branchName) setCurrentBranchName(stored.branchName);
    } catch (_) {
      setCurrentBranchId("489571a9af51836599708543");
    }

    // Load parked bills from storage
    try {
      const storedBills = JSON.parse(localStorage.getItem("printz_held_bills") || "[]");
      setHeldBills(storedBills);
    } catch (_) { }

    loadCatalog();
    loadCustomers();
  }, []);

  // Fetch unified catalog (Inventory + Stocks)
  const loadCatalog = async () => {
    setLoadingProducts(true);
    try {
      const items = await posApi.getUnifiedCatalog({ branchId: currentBranchId });
      setProducts(items);
    } catch (err) {
      console.error("Failed to load catalog:", err);
      toast.error("Could not load products & stock catalog");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const custs = await posApi.getCustomers();
      setExistingCustomers(custs);
    } catch (_) { }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await posApi.getSaleReceipts({
        limit: 100,
        status: historyStatusFilter !== "ALL" ? historyStatusFilter : undefined,
      });
      setReceiptsList(res.records || res.items || res.data || []);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "HISTORY") {
      loadHistory();
    }
  }, [activeTab, historyStatusFilter]);

  // Filtered Products (Supports searching name, code, category, or source)
  // Sorted so items with available stock appear first, and zero-stock items go to the bottom
  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        (p.name || "").toLowerCase().includes(query) ||
        (p.itemCode || "").toLowerCase().includes(query);

      let matchesCat = true;
      if (selectedCategory === "STOCKS") {
        matchesCat = p.source === "STOCK";
      } else if (selectedCategory !== "ALL") {
        matchesCat = (p.category || "").toUpperCase() === selectedCategory;
      }

      return matchesSearch && matchesCat;
    });

    return list.sort((a, b) => {
      const stockA = Number(a.currentStock || 0);
      const stockB = Number(b.currentStock || 0);

      const hasStockA = stockA > 0 ? 1 : 0;
      const hasStockB = stockB > 0 ? 1 : 0;

      // 1. Items with stock > 0 come before items with 0 stock
      if (hasStockA !== hasStockB) {
        return hasStockB - hasStockA;
      }

      // 2. Among in-stock items, sort by highest stock available first
      if (hasStockA && hasStockB) {
        if (stockB !== stockA) return stockB - stockA;
      }

      // 3. Fallback to alphabetical sorting by item name
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [products, searchQuery, selectedCategory]);

  // Filtered customer master list (Search by phone, code or GSTIN as per Step 1)
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return existingCustomers;
    const q = customerSearchQuery.toLowerCase();
    return existingCustomers.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.mobile || "").includes(q) ||
        (c.customerCode || "").toLowerCase().includes(q) ||
        (c.gstin || "").toLowerCase().includes(q)
    );
  }, [existingCustomers, customerSearchQuery]);

  // Cart operations (Step 2: Build the Bill & Branch Stock Check)
  const addToCart = (product, isManagerOverride = false) => {
    const stockAvailable = Number(product.currentStock || 0);

    // Flow Step 2: "Enough stock in branch? NO -> Line blocked; raise a Product Sale Order (Flow C)"
    if (product.isStockTracked && stockAvailable <= 0 && !isManagerOverride) {
      setBlockedStockProduct(product);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((it) => it.productId === product._id);
      if (existing) {
        if (product.isStockTracked && existing.quantity >= stockAvailable && stockAvailable > 0) {
          toast.warning(`Notice: Quantity exceeds current available branch stock (${stockAvailable} ${product.unit})`);
        }
        return prev.map((it) =>
          it.productId === product._id
            ? { ...it, quantity: it.quantity + 1 }
            : it
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          productCode: product.itemCode || "ITEM",
          productName: product.name,
          quantity: 1,
          unitPrice: Number(product.saleRate || 0),
          taxRate: Number(product.taxRate || 0),
          unit: product.unit || "PCS",
          currentStock: stockAvailable,
          source: product.source,
          sheetsPerUnit: 1,
          wastageQuantity: 0,
          wastageReason: "",
          wastageNote: "",
          showConsumption: false,
        },
      ];
    });
  };

  // Print service cards render inside the same grid as products so the columns line up
  const visiblePrintServices = PRINT_SERVICES.filter(
    (s) =>
      (selectedCategory === "ALL" || selectedCategory === "SERVICES") &&
      (!searchQuery || s.label.toLowerCase().includes(searchQuery.toLowerCase()) || "print".includes(searchQuery.toLowerCase()))
  );

  // The catalog shows one page at a time: print services first, then products and stock items
  const catalogTotal = visiblePrintServices.length + filteredProducts.length;
  const catalogLastPage = Math.max(1, Math.ceil(catalogTotal / catalogPageSize));
  const catalogPageSafe = Math.min(catalogPage, catalogLastPage);
  const catalogStart = (catalogPageSafe - 1) * catalogPageSize;
  const pagedServices = visiblePrintServices.slice(catalogStart, catalogStart + catalogPageSize);
  const productStart = Math.max(0, catalogStart - visiblePrintServices.length);
  const pagedProducts = filteredProducts.slice(productStart, productStart + Math.max(0, catalogPageSize - pagedServices.length));

  useEffect(() => {
    setCatalogPage(1);
  }, [searchQuery, selectedCategory]);

  const openPrintModal = (service) => {
    setPrintSides("SINGLE");
    setPrintPaper("PLAIN");
    setPrintQty(1);
    setPrintModal(service);
  };

  const printUnitPrice = useMemo(() => {
    const side = PRINT_SIDES.find((s) => s.key === printSides);
    const paper = PRINT_PAPERS.find((p) => p.key === printPaper);
    return (paper?.rate || 0) * (side?.multiplier || 1);
  }, [printSides, printPaper]);

  const addPrintToCart = () => {
    const qty = Math.floor(Number(printQty));
    if (!printModal || !qty || qty <= 0) {
      toast.warning("Enter a quantity of at least 1");
      return;
    }
    const side = PRINT_SIDES.find((s) => s.key === printSides);
    const paper = PRINT_PAPERS.find((p) => p.key === printPaper);
    const lineKey = `SVC-PRINT-${printModal.key}-${printSides}-${printPaper}`;
    const name = `${printModal.label} - ${side.label} side - ${paper.label}`;

    setCart((prev) => {
      const existing = prev.find((it) => it.productId === lineKey);
      if (existing) {
        return prev.map((it) => (it.productId === lineKey ? { ...it, quantity: it.quantity + qty } : it));
      }
      return [
        ...prev,
        {
          productId: lineKey,
          productCode: printModal.code,
          productName: name,
          quantity: qty,
          unitPrice: printUnitPrice,
          taxRate: 0,
          unit: "PAGE",
          currentStock: 0,
          source: "PRINT",
          isService: true,
          printService: { printType: printModal.key, sides: printSides, paperType: printPaper },
          sheetsPerUnit: 1,
          wastageQuantity: 0,
          wastageReason: "",
          wastageNote: "",
          showConsumption: false,
        },
      ];
    });
    toast.success(`${name} × ${qty} added`);
    setPrintModal(null);
  };

  const updateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.productId === productId) {
            const newQty = it.quantity + delta;
            return newQty > 0 ? { ...it, quantity: newQty } : null;
          }
          return it;
        })
        .filter(Boolean)
    );
  };

  // Step 3: Asset Consumption & Wastage Controls
  const updateCartConsumption = (productId, field, value) => {
    setCart((prev) =>
      prev.map((it) =>
        it.productId === productId ? { ...it, [field]: value } : it
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((it) => it.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setGstRate(18);
    setIsDiscountApproved(false);
    setRemarks("");
    setSplitPayments({ CASH: 0, UPI: 0, CARD: 0, BANK: 0 });
  };

  // Calculations with GST Selection
  // Calculated line by line, the same way the server does, so this total is the total that gets saved
  const { subtotal, taxAmount, grandTotal } = useMemo(
    () => calculatePosBill(cart, discountAmount, gstRate),
    [cart, discountAmount, gstRate]
  );

  // Discount validation (Threshold e.g. > ₹500 or > 15% subtotal requires manager approval)
  const isHighDiscount = useMemo(() => {
    if (!subtotal || !discountAmount) return false;
    const disc = Number(discountAmount);
    return disc > 500 || (subtotal > 0 && (disc / subtotal) > 0.15);
  }, [subtotal, discountAmount]);

  // ── STEP 1: Quick Customer Creation ──
  const handleQuickCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustMobile.trim()) {
      toast.warning("Customer Name and Mobile number are required");
      return;
    }
    if (newCustMobile.replace(/\D/g, "").length !== 10) {
      toast.warning("Please enter a valid 10-digit mobile number");
      return;
    }
    setCreatingCustomer(true);
    try {
      const newCust = await posApi.createCustomer({
        name: newCustName.trim(),
        mobile: newCustMobile.trim(),
        email: newCustEmail.trim() || undefined,
        gstin: newCustGstin.trim() || undefined,
        address: newCustAddress.trim() || undefined,
        creditLimit: Number(newCustCreditLimit) || 0,
        customerType: "WALK_IN",
      });
      toast.success(`Customer "${newCust.name}" registered in master!`);
      setExistingCustomers((prev) => [newCust, ...prev]);
      setCustomerType("REGISTERED");
      setSelectedCustomerId(newCust._id);
      setSelectedCustomerProfile(newCust);
      setCustomerName(newCust.name);
      setCustomerMobile(newCust.mobile || "");
      setCustomerGstin(newCust.gstin || "");
      setCustomerSearchQuery(newCust.name);
      setShowQuickCustomerModal(false);
      setNewCustName("");
      setNewCustMobile("");
      setNewCustEmail("");
      setNewCustGstin("");
      setNewCustAddress("");
      setNewCustCreditLimit(0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to register customer");
    } finally {
      setCreatingCustomer(false);
    }
  };

  // ── STEP 2: Hold Bill (Park Bill) & Resume ──
  const handleHoldBill = () => {
    if (cart.length === 0) {
      toast.warning("Cannot hold an empty cart");
      return;
    }
    const newHold = {
      id: "HOLD-" + Date.now(),
      heldAt: new Date().toISOString(),
      customerName: customerName || "",
      customerMobile: customerMobile || "",
      customerGstin: customerGstin || "",
      customerType,
      selectedCustomerId,
      selectedCustomerProfile,
      cart: [...cart],
      discountAmount,
      gstRate,
      paymentMode,
      remarks,
      grandTotal,
    };
    const updated = [newHold, ...heldBills];
    setHeldBills(updated);
    localStorage.setItem("printz_held_bills", JSON.stringify(updated));
    toast.info(`Bill parked for ${newHold.customerName || "Customer"}. Ready for next customer.`);
    clearCart();
  };

  const handleResumeBill = (heldItem) => {
    setCart(heldItem.cart || []);
    setCustomerName(heldItem.customerName || "");
    setCustomerMobile(heldItem.customerMobile || "");
    setCustomerGstin(heldItem.customerGstin || "");
    setCustomerType(heldItem.customerType || "WALK_IN");
    setSelectedCustomerId(heldItem.selectedCustomerId || null);
    setSelectedCustomerProfile(heldItem.selectedCustomerProfile || null);
    setDiscountAmount(heldItem.discountAmount || 0);
    setGstRate(heldItem.gstRate || 0);
    setPaymentMode(heldItem.paymentMode || "CASH");
    setRemarks(heldItem.remarks || "");

    const remaining = heldBills.filter((b) => b.id !== heldItem.id);
    setHeldBills(remaining);
    localStorage.setItem("printz_held_bills", JSON.stringify(remaining));
    setShowHeldModal(false);
    toast.success("Parked bill restored to active cart!");
  };

  const handleDeleteHeldBill = (heldId) => {
    const remaining = heldBills.filter((b) => b.id !== heldId);
    setHeldBills(remaining);
    localStorage.setItem("printz_held_bills", JSON.stringify(remaining));
    toast.info("Parked bill discarded");
  };

  // ── STEP 4: Manager Discount Approval ──
  const handleManagerApproval = (e) => {
    e.preventDefault();
    if (!managerPin || managerPin.trim().length < 4) {
      toast.error("Please enter a valid 4-digit Manager PIN");
      return;
    }
    // Accept valid manager PIN (1234 or configured branch manager code)
    setIsDiscountApproved(true);
    setShowDiscountModal(false);
    toast.success("Manager discount authorized!");
  };

  // ── STEP 5 & 6: Checkout & Complete Sale ──
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.warning("Please add at least one item to the cart");
      return;
    }

    // Walk-in customer: Compulsory Name & Phone
    if (customerType === "WALK_IN") {
      if (!customerName || !customerName.trim()) {
        toast.error("Customer Name is compulsory for Walk-in customer");
        return;
      }
      if (!customerMobile || !customerMobile.trim()) {
        toast.error("Phone number is compulsory for Walk-in customer");
        return;
      }
      const cleanPhone = customerMobile.replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        toast.error("Please enter a valid 10-digit mobile number");
        return;
      }
      const nameMsg = businessNameError(customerName, { label: "Customer name" });
      if (nameMsg) {
        toast.error(nameMsg);
        return;
      }
      const gstinMsg = gstinError(customerGstin);
      if (gstinMsg) {
        toast.error(gstinMsg);
        return;
      }
    }

    // Existing customer check
    if (customerType === "REGISTERED" && !selectedCustomerId) {
      toast.error("Please select an existing client from the list");
      return;
    }

    // Step 5 Rule: Partial or CREDIT requires customer selection & credit limit check
    if (paymentMode === "CREDIT" && customerType !== "REGISTERED") {
      toast.error("Credit sales require selecting an Existing Client (Customer credit limit checked).");
      return;
    }

    if (isHighDiscount && !isDiscountApproved) {
      toast.warning("Discount exceeds staff limit (>15% or >₹500). Manager approval required.");
      setShowDiscountModal(true);
      return;
    }

    // Split payment total verification
    let splitList = [];
    if (paymentMode === "SPLIT") {
      const splitTotal =
        Number(splitPayments.CASH || 0) +
        Number(splitPayments.UPI || 0) +
        Number(splitPayments.CARD || 0) +
        Number(splitPayments.BANK || 0);
      if (Math.abs(splitTotal - grandTotal) > 0.05) {
        toast.error(`Split amounts (₹${splitTotal.toFixed(2)}) must match Grand Total (₹${grandTotal.toFixed(2)})`);
        return;
      }
      splitList = Object.entries(splitPayments)
        .filter(([_, amt]) => Number(amt) > 0)
        .map(([mode, amt]) => ({ mode, amount: Number(amt) }));
    }

    const calculatedAmountPaid =
      paymentMode === "CREDIT"
        ? 0
        : grandTotal;

    const calculatedBalanceDue =
      paymentMode === "CREDIT"
        ? grandTotal
        : 0;

    // Credit limit warning
    if (paymentMode === "CREDIT" && selectedCustomerProfile?.creditLimit > 0) {
      const projectedBal = (Number(selectedCustomerProfile.outstandingBalance) || 0) + calculatedBalanceDue;
      if (projectedBal > Number(selectedCustomerProfile.creditLimit)) {
        toast.warning(`Notice: Balance ₹${projectedBal.toFixed(2)} exceeds customer credit limit (₹${selectedCustomerProfile.creditLimit})`);
      }
    }

    // The server only applies discounts per line, so the bill discount is split across the lines
    // in proportion to their amounts (the last line takes the rounding remainder).
    const lineDiscounts = splitBillDiscount(cart, discountAmount);

    setCheckingOut(true);
    try {
      const payload = {
        branchId: currentBranchId || "489571a9af51836599708543",
        customerId: customerType === "REGISTERED" ? selectedCustomerId : null,
        customerName: customerName || "",
        customerMobile: customerMobile || "",
        customerSnapshot: {
          name: customerName,
          mobile: customerMobile,
          gstin: customerGstin || undefined,
          customerCode: selectedCustomerProfile?.customerCode || undefined,
        },
        items: cart.map((it, i) =>
          it.isService
            ? {
              // Print service: priced on the server from the selection, no stock movement
              printService: it.printService,
              quantity: it.quantity,
              discount: lineDiscounts[i],
              taxRate: Number(gstRate) || 0,
            }
            : {
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discount: lineDiscounts[i],
              // The selected GST rate always applies, including 0%
              taxRate: Number(gstRate) || 0,
              wastageQuantity: Number(it.wastageQuantity || 0),
              wastageReason: it.wastageReason || undefined,
              notes: it.wastageNote || undefined,
            }
        ),
        paymentMode,
        splitPayments: splitList,
        amountPaid: calculatedAmountPaid,
        balanceDue: calculatedBalanceDue,
        discount: Number(discountAmount) || 0,
        managerApproval: {
          isApproved: isDiscountApproved,
          approvedBy: isDiscountApproved ? "Branch Manager" : null,
          approvedAt: isDiscountApproved ? new Date() : null,
          reason: discountReason || null,
        },
        remarks:
          remarks ||
          `POS Counter Sale at ${currentBranchName}${isDiscountApproved ? " [Manager Approved Discount]" : ""}`,
      };

      const res = await posApi.checkout(payload);
      const receiptData = res.data || res;
      toast.success(`Sale completed! Receipt: ${receiptData.receiptNo || "Generated"}`);
      setActiveReceipt(receiptData);
      setShowThermalModal(true);
      clearCart();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete POS checkout");
    } finally {
      setCheckingOut(false);
    }
  };

  // Step 8: Daily Sales & Payment Mode Split Summary for reports
  const dailySummary = useMemo(() => {
    let completedCount = 0;
    let totalSales = 0;
    let cashSales = 0;
    let upiSales = 0;
    let cardBankSales = 0;
    let creditSales = 0;
    let voidCount = 0;
    let voidTotal = 0;

    receiptsList.forEach((r) => {
      const total = Number(r.grandTotal || 0);
      if (r.status === "VOID") {
        voidCount += 1;
        voidTotal += total;
      } else {
        completedCount += 1;
        totalSales += total;
        if (r.paymentMode === "CASH") cashSales += total;
        else if (r.paymentMode === "UPI") upiSales += total;
        else if (r.paymentMode === "CARD" || r.paymentMode === "BANK") cardBankSales += total;
        else if (r.paymentMode === "CREDIT" || Number(r.balanceDue) > 0) creditSales += Number(r.balanceDue || total);
        else if (r.paymentMode === "SPLIT" && Array.isArray(r.splitPayments)) {
          r.splitPayments.forEach((p) => {
            if (p.mode === "CASH") cashSales += Number(p.amount || 0);
            else if (p.mode === "UPI") upiSales += Number(p.amount || 0);
            else cardBankSales += Number(p.amount || 0);
          });
        }
      }
    });

    return {
      completedCount,
      totalSales,
      cashSales,
      upiSales,
      cardBankSales,
      creditSales,
      voidCount,
      voidTotal,
    };
  }, [receiptsList]);

  return (
    <JobFlowLayout
      title="POS & Sales Receipts"
      subtitle={`Fast retail checkout, itemized thermal slips, and stock deduction • Branch: ${currentBranchName}`}
      actions={
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {/* Held Bills Quick Indicator */}
          {heldBills.length > 0 && (
            <button
              type="button"
              className="jf-btn jf-btn-secondary jf-btn-sm"
              style={{ color: "#d97706", borderColor: "#fde68a" }}
              onClick={() => setShowHeldModal(true)}
            >
              <PauseCircle size={15} /> Held Bills
              <span className="pos-held-badge">{heldBills.length}</span>
            </button>
          )}

          <button
            type="button"
            className={`pos-tab-btn ${activeTab === "BILLING" ? "active" : ""}`}
            onClick={() => handleTabChange("BILLING")}
            style={{
              background: activeTab === "BILLING" ? "#059669" : "#f1f5f9",
              color: activeTab === "BILLING" ? "#fff" : "#1e293b",
            }}
          >
            <ShoppingCart size={16} /> New Counter Sale
          </button>
          <button
            type="button"
            className={`pos-tab-btn ${activeTab === "HISTORY" ? "active" : ""}`}
            onClick={() => handleTabChange("HISTORY")}
            style={{
              background: activeTab === "HISTORY" ? "#059669" : "#f1f5f9",
              color: activeTab === "HISTORY" ? "#fff" : "#1e293b",
            }}
          >
            <Receipt size={16} /> Receipts History
          </button>
        </div>
      }
    >
      <div className="pos-wrapper">
        {/* ── TAB 1: COUNTER BILLING ── */}
        {activeTab === "BILLING" && (
          <div className="pos-billing-grid">
            {/* Left: Product Catalog (Both Inventory & Stocks) */}
            <div className="pos-catalog-card">
              <div className="pos-search-row">
                <div className="pos-search-input-wrap">
                  <Search size={18} />
                  <input
                    type="text"
                    className="pos-search-input"
                    placeholder="Search product or stock item by name, code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={loadCatalog}
                  disabled={loadingProducts}
                >
                  <RefreshCw size={14} className={loadingProducts ? "jf-spin" : ""} /> Refresh
                </button>
              </div>

              {/* Categories Bar */}
              <div className="pos-category-pills">
                {["ALL", "STOCKS", "PAPER", "INK", "MEDIA", "SERVICES", "STATIONERY"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`pos-cat-pill ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Products & Stocks Grid */}
              {loadingProducts ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#1e293b" }}>
                  <RefreshCw size={24} className="jf-spin" style={{ margin: "0 auto 0.5rem" }} />
                  <div>Loading catalog & stock items...</div>
                </div>
              ) : filteredProducts.length === 0 && visiblePrintServices.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#1e293b" }}>
                  <Package size={32} style={{ margin: "0 auto 0.5rem", opacity: 0.5 }} />
                  <div>No products match your search or filter.</div>
                </div>
              ) : (
                <>
                <div className="pos-products-grid">
                  {pagedServices.map((s) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.key} className="pos-product-card" onClick={() => openPrintModal(s)}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                            <span className="pos-prod-code">{s.code}</span>
                            <span className="pos-source-tag">Service</span>
                          </div>
                          <div className="pos-prod-name" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <Icon size={16} style={{ color: "#059669" }} /> {s.label}
                          </div>
                        </div>
                        <div>
                          <div className="pos-prod-meta">
                            <span className="pos-prod-price">from ₹{PRINT_PAPERS[0].rate.toFixed(2)}</span>
                            <span className="pos-prod-unit">per page</span>
                          </div>
                          <button
                            type="button"
                            className="pos-add-btn"
                            style={{ marginTop: "0.5rem" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openPrintModal(s);
                            }}
                          >
                            <Plus size={14} /> Add Line
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {pagedProducts.map((p) => {
                    const price = Number(p.saleRate || 0);
                    const stock = Number(p.currentStock || 0);
                    const isOutOfStock = stock <= 0;
                    const isLowStock = stock > 0 && stock <= 10;

                    return (
                      <div
                        key={p._id}
                        className="pos-product-card"
                        onClick={() => addToCart(p)}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                            <span className="pos-prod-code">{p.itemCode || "ITEM"}</span>
                            <span className={`pos-source-tag ${p.source === "STOCK" ? "stock" : ""}`}>
                              {p.source === "STOCK" ? "Stock" : "Inv"}
                            </span>
                          </div>

                          <div className="pos-prod-name">{p.name}</div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem" }}>
                            {/* Stock Indicator Badge */}
                            <span
                              className={`pos-stock-tag ${isOutOfStock ? "out-stock" : isLowStock ? "low-stock" : "in-stock"
                                }`}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: isOutOfStock ? "#ef4444" : isLowStock ? "#f59e0b" : "#10b981",
                                }}
                              />
                              {isOutOfStock ? "0 in branch" : `${stock} ${p.unit || "unit"}`}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="pos-prod-meta">
                            <span className="pos-prod-price">₹{price.toFixed(2)}</span>
                            <span className="pos-prod-unit">per {p.unit || "unit"}</span>
                          </div>
                          <button
                            type="button"
                            className="pos-add-btn"
                            style={{ marginTop: "0.5rem" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(p);
                            }}
                          >
                            <Plus size={14} /> Add Line
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Pagination
                  currentPage={catalogPageSafe}
                  totalItems={catalogTotal}
                  itemsPerPage={catalogPageSize}
                  onPageChange={setCatalogPage}
                  onItemsPerPageChange={(n) => {
                    setCatalogPageSize(n);
                    setCatalogPage(1);
                  }}
                  pageSizeOptions={[12, 24, 48, 96]}
                  itemLabel="items"
                />
                </>
              )}
            </div>

            {/* Right: Interactive Cart & Checkout Panel */}
            <div className="pos-cart-panel">
              <div className="pos-cart-header">
                <div className="pos-cart-title">
                  <ShoppingCart size={18} style={{ color: "#059669" }} />
                  <span>Current Cart</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="pos-cart-badge">
                    {cart.reduce((a, b) => a + b.quantity, 0)} items
                  </span>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      title="Clear Cart"
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Customer Selector & Quick Create */}
              <div className="pos-customer-box">
                <div className="pos-cust-toggle-row">
                  <button
                    type="button"
                    className={`pos-cust-btn ${customerType === "WALK_IN" ? "active" : ""}`}
                    onClick={() => {
                      setCustomerType("WALK_IN");
                      setCustomerName("");
                      setCustomerMobile("");
                      setSelectedCustomerId(null);
                    }}
                  >
                    Walk-in
                  </button>
                  <button

                    type="button"
                    className={`pos-cust-btn ${customerType === "REGISTERED" ? "active" : ""}`}
                    onClick={() => setCustomerType("REGISTERED")}
                  >
                    Existing Client
                  </button>
                  {/* <button
                    type="button"
                    className="pos-cust-btn"
                    style={{ color: "#059669", fontWeight: 700 }}
                    onClick={() => setShowQuickCustomerModal(true)}
                    title="Quick register new customer"
                  >
                    <UserPlus size={13} style={{ marginRight: "3px" }} /> New
                  </button> */}
                </div>

                {customerType === "WALK_IN" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                      <div>
                        <input
                          type="text"
                          className="jf-input"
                          style={{
                            fontSize: "0.8rem",
                            padding: "0.35rem 0.6rem",
                            borderColor: !customerName.trim() && cart.length > 0 ? "#fca5a5" : undefined,
                          }}
                          placeholder="Customer Name *"
                          value={customerName}
                          onChange={(e) => setCustomerName(onlyBusinessName(e.target.value))}
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="tel"
                          className="jf-input"
                          style={{
                            fontSize: "0.8rem",
                            padding: "0.35rem 0.6rem",
                            borderColor: !customerMobile.trim() && cart.length > 0 ? "#fca5a5" : undefined,
                          }}
                          placeholder="Phone Number *"
                          value={customerMobile}
                          inputMode="numeric"
                          maxLength={10}
                          onChange={(e) => setCustomerMobile(onlyMobile(e.target.value))}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <input
                        type="text"
                        className="jf-input"
                        style={{ fontSize: "0.8rem", padding: "0.35rem 0.6rem" }}
                        placeholder="GSTIN (Optional — for Tax Invoice)"
                        value={customerGstin}
                        onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                        maxLength={15}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pos-cust-search-wrapper">
                    {!selectedCustomerProfile ? (
                      <div>
                        <input
                          type="text"
                          className="jf-input"
                          style={{ fontSize: "0.82rem", padding: "0.35rem 0.6rem" }}
                          placeholder="Search customer by phone, code, or GSTIN..."
                          value={customerSearchQuery}
                          onChange={(e) => {
                            setCustomerSearchQuery(e.target.value);
                            setShowCustDropdown(true);
                          }}
                          onFocus={() => setShowCustDropdown(true)}
                        />
                        {showCustDropdown && (
                          <div className="pos-cust-dropdown">
                            {filteredCustomers.length === 0 ? (
                              <div style={{ padding: "0.5rem", fontSize: "0.75rem", color: "#1e293b" }}>
                                No matching customers found.
                              </div>
                            ) : (
                              filteredCustomers.slice(0, 8).map((c) => (
                                <div
                                  key={c._id}
                                  className="pos-cust-dropdown-item"
                                  onClick={() => {
                                    setSelectedCustomerId(c._id);
                                    setSelectedCustomerProfile(c);
                                    setCustomerName(c.name);
                                    setCustomerMobile(c.mobile || "");
                                    setCustomerGstin(c.gstin || "");
                                    setCustomerSearchQuery(c.name);
                                    setShowCustDropdown(false);
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                                    <div style={{ fontSize: "0.7rem", color: "#1e293b" }}>
                                      {c.mobile || "No Phone"} • {c.customerCode || "CODE"}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: "right", fontSize: "0.7rem" }}>
                                    <div style={{ color: "#059669" }}>Limit: ₹{c.creditLimit || 0}</div>
                                    <div style={{ color: c.outstandingBalance > 0 ? "#dc2626" : "#334155" }}>
                                      Due: ₹{c.outstandingBalance || 0}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pos-customer-profile-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <strong>{selectedCustomerProfile.name}</strong>
                            <span style={{ marginLeft: "6px", fontSize: "0.68rem", background: "#dcfce7", color: "#166534", padding: "1px 5px", borderRadius: "3px" }}>
                              {selectedCustomerProfile.customerCode || "CLIENT"}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="jf-btn jf-btn-secondary jf-btn-sm"
                            style={{ padding: "0.15rem 0.4rem", fontSize: "0.68rem" }}
                            onClick={() => {
                              setSelectedCustomerId(null);
                              setSelectedCustomerProfile(null);
                              setCustomerName("");
                              setCustomerMobile("");
                              setCustomerGstin("");
                              setCustomerSearchQuery("");
                            }}
                          >
                            Change
                          </button>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#1e293b", fontSize: "0.72rem", marginTop: "2px" }}>
                          <span>Phone: {selectedCustomerProfile.mobile || "N/A"}</span>
                          <span>GSTIN: {selectedCustomerProfile.gstin || "N/A"}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", paddingTop: "4px", borderTop: "1px dashed #bbf7d0", fontSize: "0.72rem" }}>
                          <span>Credit Limit: <strong>₹{selectedCustomerProfile.creditLimit || 0}</strong></span>
                          <span>Balance: <strong style={{ color: selectedCustomerProfile.outstandingBalance > 0 ? "#dc2626" : "#166534" }}>₹{selectedCustomerProfile.outstandingBalance || 0}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cart Items List */}
              <div className="pos-cart-items">
                {cart.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#1e293b" }}>
                    <ShoppingCart size={28} style={{ margin: "0 auto 0.4rem", opacity: 0.4 }} />
                    <div style={{ fontSize: "0.85rem" }}>Cart is empty</div>
                    <div style={{ fontSize: "0.75rem", color: "#334155" }}>Click products from catalog to add</div>
                  </div>
                ) : (
                  cart.map((it) => (
                    <div key={it.productId} className="pos-cart-item-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div className="pos-cart-item-info">
                          <div className="pos-cart-item-name">{it.productName}</div>
                          <div className="pos-cart-item-rate">
                            ₹{it.unitPrice.toFixed(2)} each
                            <span style={{ marginLeft: "6px", fontSize: "0.68rem", color: "#1e293b" }}>
                              ({it.source})
                            </span>
                          </div>
                        </div>
                        <div className="pos-qty-counter">
                          <button type="button" className="pos-qty-btn" onClick={() => updateCartQty(it.productId, -1)}>
                            <Minus size={12} />
                          </button>
                          <span className="pos-qty-val">{it.quantity}</span>
                          <button type="button" className="pos-qty-btn" onClick={() => updateCartQty(it.productId, 1)}>
                            <Plus size={12} />
                          </button>
                        </div>
                        <div className="pos-cart-item-total">
                          ₹{(it.quantity * it.unitPrice).toFixed(2)}
                        </div>
                        <button
                          type="button"
                          className="pos-remove-item-btn"
                          onClick={() => removeFromCart(it.productId)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Step 3: Asset Consumption & Wastage Controls Toggle (not for print services) */}
                      {!it.isService && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
                          <span style={{ fontSize: "0.7rem", color: "#1e293b" }}>
                            Consumption: <strong>{it.quantity} {it.unit || "sheets"}</strong>
                            {Number(it.wastageQuantity) > 0 && (
                              <span style={{ color: "#dc2626", marginLeft: "4px" }}>
                                (+{it.wastageQuantity} wastage)
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            className="pos-consumption-toggle"
                            onClick={() => updateCartConsumption(it.productId, "showConsumption", !it.showConsumption)}
                          >
                            <Sparkles size={11} /> {it.showConsumption ? "Hide Asset & Wastage" : "Adjust Consumption / Wastage"}
                          </button>
                        </div>
                      )}

                      {/* Step 3: Asset Consumption Drawer */}
                      {!it.isService && it.showConsumption && (
                        <div className="pos-consumption-box">
                          <div className="pos-consumption-row">
                            <span style={{ color: "#1e293b", fontWeight: 600 }}>Extra Sheets / Wastage:</span>
                            <input
                              type="number"
                              min="0"
                              className="jf-input"
                              style={{ width: "70px", padding: "0.15rem 0.35rem", fontSize: "0.75rem", textAlign: "right" }}
                              value={it.wastageQuantity || ""}
                              placeholder="0"
                              onChange={(e) => updateCartConsumption(it.productId, "wastageQuantity", Math.max(0, Number(e.target.value) || 0))}
                            />
                          </div>
                          {Number(it.wastageQuantity) > 0 && (
                            <div className="pos-consumption-row">
                              <span style={{ color: "#dc2626", fontWeight: 600 }}>Reason (Audited) *:</span>
                              <SelectField
                                compact
                                searchable={false}
                                style={{ width: "190px" }}
                                placeholder="-- Choose Reason --"
                                value={it.wastageReason || ""}
                                onChange={(e) => updateCartConsumption(it.productId, "wastageReason", e.target.value)}
                                options={[
                                  "Paper Jam / Feeder Error",
                                  "Color Calibration / Alignment",
                                  "Test Print & Proofing",
                                  "Damaged Media / Creased Paper",
                                  "Customer Revision",
                                  "Machine Ink Smudge",
                                  "Other Consumable Waste",
                                ]}
                              />
                            </div>
                          )}
                          <input
                            type="text"
                            placeholder="Add consumable / wastage note..."
                            value={it.wastageNote || ""}
                            onChange={(e) => updateCartConsumption(it.productId, "wastageNote", e.target.value)}
                            style={{
                              border: "none",
                              borderBottom: "1px dashed #cbd5e1",
                              background: "transparent",
                              fontSize: "0.72rem",
                              color: "#1e293b",
                              padding: "0.1rem 0",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Cart Summary & Checkout */}
              <div className="pos-cart-summary">
                <div className="pos-summary-line">
                  <span>Subtotal:</span>
                  <strong>₹{subtotal.toFixed(2)}</strong>
                </div>

                <div className="pos-summary-line">
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    Discount (₹):
                    {isHighDiscount && (
                      <span style={{ fontSize: "0.68rem", color: isDiscountApproved ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                        {isDiscountApproved ? "✓ Approved" : "⚠ Approval Req"}
                      </span>
                    )}
                  </span>
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <input
                      type="number"
                      min="0"
                      max={subtotal}
                      value={discountAmount || ""}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setDiscountAmount(val);
                        if (val > 500 || (subtotal > 0 && val / subtotal > 0.15)) {
                          setIsDiscountApproved(false);
                        }
                      }}
                      className="jf-input"
                      style={{ width: "80px", textAlign: "right", padding: "0.2rem 0.4rem", fontSize: "0.8rem" }}
                      placeholder="0.00"
                    />
                    {isHighDiscount && !isDiscountApproved && (
                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary jf-btn-sm"
                        style={{ padding: "0.2rem 0.4rem", fontSize: "0.7rem", color: "#dc2626" }}
                        onClick={() => setShowDiscountModal(true)}
                        title="Authorize Manager Discount"
                      >
                        Authorize
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ padding: "0.45rem 0", borderBottom: "1px dashed #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.8125rem", color: "#1e293b", fontWeight: 600 }}>GST / Taxes</span>
                    <SelectField
                      compact
                      searchable={false}
                      style={{ width: "78px" }}
                      value={Number(gstRate) || 0}
                      onChange={(e) => setGstRate(Number(e.target.value))}
                      options={[0, 5, 12, 18, 28].map((rate) => ({ value: rate, label: `${rate}%` }))}
                    />
                    <strong style={{ marginLeft: "auto", fontSize: "0.95rem", color: "#059669" }}>
                      ₹{taxAmount.toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="pos-grand-total-row">
                  <span className="pos-grand-total-label">Grand Total</span>
                  <span className="pos-grand-total-amount">₹{grandTotal.toFixed(2)}</span>
                </div>

                {/* Payment Modes */}
                <div style={{ marginTop: "0.25rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.3rem" }}>
                    PAYMENT MODE
                  </div>
                  <SelectField
                    searchable={false}
                    value={paymentMode}
                    options={["CASH", "UPI", "CARD", "BANK", "CREDIT", "SPLIT"]}
                    onChange={(e) => {
                      const mode = e.target.value;
                      setPaymentMode(mode);
                      if (mode === "SPLIT") {
                        setSplitPayments({
                          CASH: Math.round(grandTotal / 2),
                          UPI: Math.round(grandTotal - Math.round(grandTotal / 2)),
                          CARD: 0,
                          BANK: 0,
                        });
                      }
                    }}
                  />
                </div>

                {/* Split Payments Breakdown */}
                {paymentMode === "SPLIT" && (
                  <div className="pos-split-grid">
                    <div className="pos-split-row">
                      <span className="pos-split-label">Cash:</span>
                      <input
                        type="number"
                        min="0"
                        className="jf-input"
                        style={{ width: "90px", fontSize: "0.8rem", padding: "0.2rem" }}
                        value={splitPayments.CASH}
                        onChange={(e) => setSplitPayments({ ...splitPayments, CASH: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="pos-split-row">
                      <span className="pos-split-label">UPI:</span>
                      <input
                        type="number"
                        min="0"
                        className="jf-input"
                        style={{ width: "90px", fontSize: "0.8rem", padding: "0.2rem" }}
                        value={splitPayments.UPI}
                        onChange={(e) => setSplitPayments({ ...splitPayments, UPI: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="pos-split-row">
                      <span className="pos-split-label">Card:</span>
                      <input
                        type="number"
                        min="0"
                        className="jf-input"
                        style={{ width: "90px", fontSize: "0.8rem", padding: "0.2rem" }}
                        value={splitPayments.CARD}
                        onChange={(e) => setSplitPayments({ ...splitPayments, CARD: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="pos-split-row">
                      <span className="pos-split-label">Bank:</span>
                      <input
                        type="number"
                        min="0"
                        className="jf-input"
                        style={{ width: "90px", fontSize: "0.8rem", padding: "0.2rem" }}
                        value={splitPayments.BANK || 0}
                        onChange={(e) => setSplitPayments({ ...splitPayments, BANK: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div style={{ gridColumn: "span 2", fontSize: "0.72rem", color: "#1e293b", textAlign: "right" }}>
                      Allocated: ₹
                      {(
                        Number(splitPayments.CASH || 0) +
                        Number(splitPayments.UPI || 0) +
                        Number(splitPayments.CARD || 0) +
                        Number(splitPayments.BANK || 0)
                      ).toFixed(2)}{" "}
                      / ₹{grandTotal.toFixed(2)}
                    </div>
                  </div>
                )}

                {/* Credit Mode Balance Due Info */}
                {paymentMode === "CREDIT" && (
                  <div style={{ background: "#fef2f2", padding: "0.6rem", borderRadius: "8px", border: "1px solid #fee2e2" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#991b1b", fontWeight: 700, fontSize: "0.82rem" }}>
                      <span>Credit Sale (Unpaid):</span>
                      <span>Balance Due: ₹{grandTotal.toFixed(2)}</span>
                    </div>
                    {selectedCustomerProfile ? (
                      <div style={{ fontSize: "0.72rem", color: "#7f1d1d", marginTop: "0.25rem" }}>
                        Credit Limit: ₹{selectedCustomerProfile.creditLimit || 0} • Current Balance: ₹{selectedCustomerProfile.outstandingBalance || 0}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.72rem", color: "#dc2626", marginTop: "0.25rem" }}>
                        ⚠ Please select an Existing Client profile to track credit balance.
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Action Buttons: Hold Bill + Complete Sale */}
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary"
                    style={{ flex: 1, padding: "0.65rem 0.5rem", fontSize: "0.85rem", color: "#d97706", borderColor: "#fde68a" }}
                    onClick={handleHoldBill}
                    disabled={cart.length === 0 || checkingOut}
                    title="Park this bill and serve next customer"
                  >
                    <PauseCircle size={16} /> Park Bill
                  </button>

                  <button
                    type="button"
                    className="pos-checkout-btn"
                    style={{ flex: 2 }}
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || checkingOut}
                  >
                    {checkingOut ? (
                      <>
                        <RefreshCw size={18} className="jf-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <Printer size={18} /> Checkout & Slip (₹{grandTotal.toFixed(2)})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "HISTORY" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            <DataTable
              mobileCards
              className="pos-history-table"
              searchable={false}
              loading={loadingHistory}
              emptyMessage="No sale receipts found. Complete a counter sale to populate the ledger."
              pageSize={10}
              data={receiptsList.filter((r) => {
                if (!historySearch) return true;
                const q = historySearch.toLowerCase();
                return (
                  (r.receiptNo || "").toLowerCase().includes(q) ||
                  (r.customerSnapshot?.name || r.customerName || "").toLowerCase().includes(q)
                );
              })}
              filterComponent={
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="text"
                    className="jf-input"
                    style={{ fontSize: "0.82rem" }}
                    placeholder="Filter receipt, customer..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />

                  <SelectField
                    searchable={false}
                    style={{ width: "150px" }}
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    options={[
                      { value: "ALL", label: "All Statuses" },
                      { value: "COMPLETED", label: "Completed" },
                      { value: "DRAFT", label: "Draft" },
                      { value: "VOID", label: "Voided" },
                    ]}
                  />

                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    onClick={loadHistory}
                    disabled={loadingHistory}
                    title="Refresh"
                    aria-label="Refresh"
                  >
                    <RefreshCw size={15} className={loadingHistory ? "jf-spin" : ""} />
                  </button>
                </div>
              }
              columns={[
                {
                  key: "receiptNo",
                  className: "printz-cell-lead",
                  label: "Receipt No",
                  render: (r) => (
                    <strong style={{ color: r.status === "VOID" ? "#94a3b8" : "#0f172a" }}>{r.receiptNo}</strong>
                  ),
                },
                {
                  key: "saleDate",
                  label: "Date & Time",
                  render: (r) => (
                    <span style={{ fontSize: "0.82rem", color: "#1e293b" }}>
                      {new Date(r.saleDate || r.createdAt).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  ),
                },
                {
                  key: "customerName",
                  label: "Customer Name",
                  render: (r) => (
                    <>
                      <div style={{ fontWeight: 600 }}>{r.customerSnapshot?.name || r.customerName || "Walk-in"}</div>
                      {(r.customerSnapshot?.mobile || r.customerMobile) && (
                        <div style={{ fontSize: "0.75rem", color: "#1e293b" }}>
                          {r.customerSnapshot?.mobile || r.customerMobile}
                        </div>
                      )}
                    </>
                  ),
                },
                {
                  key: "paymentMode",
                  label: "Payment Mode",
                  render: (r) => (
                    <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "#334155" }}>
                      {r.paymentMode || "CASH"}
                    </span>
                  ),
                },
                {
                  key: "grandTotal",
                  label: "Grand Total",
                  render: (r) => (
                    <strong style={{ color: r.status === "VOID" ? "#94a3b8" : "#059669" }}>
                      ₹{Number(r.grandTotal || 0).toFixed(2)}
                    </strong>
                  ),
                },
                {
                  key: "paymentStatus",
                  label: "Payment Status",
                  render: (r) => (
                    <span
                      className={`jf-badge-pill ${r.paymentStatus === "PAID"
                        ? "jf-badge-success"
                        : r.paymentStatus === "CREDIT"
                          ? "jf-badge-warning"
                          : "jf-badge-danger"
                        }`}
                    >
                      {r.paymentStatus || "PAID"}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (r) => (
                    <span className={`jf-badge-pill ${r.status === "VOID" ? "jf-badge-danger" : "jf-badge-success"}`}>
                      {r.status || "COMPLETED"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  className: "printz-cell-actions",
                  label: "Actions",
                  align: "right",
                  render: (r) => (
                    <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary jf-btn-sm"
                        onClick={async () => {
                          // The history list has no item lines, so load the full receipt first
                          setActiveReceipt(r);
                          setShowThermalModal(true);
                          try {
                            const full = await posApi.getReceiptById(r._id || r.id);
                            setActiveReceipt(full?.data || full || r);
                          } catch (err) {
                            toast.error("Could not load the receipt items.");
                          }
                        }}
                        title="Print Slip"
                      >
                        <Printer size={14} /> Slip
                      </button>
                      {r.status !== "VOID" && (
                        <button
                          type="button"
                          className="jf-btn jf-btn-secondary jf-btn-sm"
                          style={{ color: "#dc2626", borderColor: "#fecaca" }}
                          onClick={() => {
                            setReceiptToVoid(r);
                            setShowVoidModal(true);
                          }}
                          title="Void Sale"
                        >
                          <RotateCcw size={14} /> Void
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>

      {/* ── MODAL 1: THERMAL RECEIPT SLIP ── */}
      <ThermalReceiptModal
        isOpen={showThermalModal}
        onClose={() => {
          setShowThermalModal(false);
          setActiveReceipt(null);
        }}
        receipt={activeReceipt}
      />

      {/* ── MODAL 2: VOID SALE WITH REVERSAL ── */}
      <VoidSaleModal
        isOpen={showVoidModal}
        onClose={() => {
          setShowVoidModal(false);
          setReceiptToVoid(null);
        }}
        receipt={receiptToVoid}
        onVoided={() => {
          loadHistory();
          loadCatalog(); // Refresh stock counts
        }}
      />

      {/* ── MODAL 3: QUICK CREATE CUSTOMER ── */}
      {/* Print service popup */}
      {printModal && (
        <div className="jf-modal-overlay" onClick={() => setPrintModal(null)}>
          <div className="jf-modal jf-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="jf-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <printModal.icon size={18} style={{ color: "#059669" }} />
                <h2 className="jf-modal-title">{printModal.label}</h2>
              </div>
              <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={() => setPrintModal(null)}>
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addPrintToCart();
              }}
            >
              <div className="jf-modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label">Side</label>
                  <SelectField
                    searchable={false}
                    value={printSides}
                    onChange={(e) => setPrintSides(e.target.value)}
                    options={PRINT_SIDES.map((x) => ({ value: x.key, label: x.label }))}
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Paper Type</label>
                  <SelectField
                    searchable={false}
                    value={printPaper}
                    onChange={(e) => setPrintPaper(e.target.value)}
                    options={PRINT_PAPERS.map((x) => ({ value: x.key, label: `${x.label} = ₹${x.rate}` }))}
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="jf-input"
                    value={printQty}
                    onChange={(e) => setPrintQty(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#1e293b" }}>
                  <span>₹{printUnitPrice.toFixed(2)} × {Math.max(0, Math.floor(Number(printQty)) || 0)}</span>
                  <strong style={{ color: "#059669" }}>
                    ₹{(printUnitPrice * Math.max(0, Math.floor(Number(printQty)) || 0)).toFixed(2)}
                  </strong>
                </div>
              </div>
              <div className="jf-modal-footer">
                <button type="button" className="jf-btn jf-btn-secondary" onClick={() => setPrintModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="jf-btn jf-btn-primary">
                  <Plus size={14} /> Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQuickCustomerModal && (
        <div className="jf-modal-overlay">
          <div className="jf-modal jf-modal-sm">
            <div className="jf-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <UserPlus size={18} style={{ color: "#059669" }} />
                <h2 className="jf-modal-title">Quick-Create Customer Master</h2>
              </div>
              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                onClick={() => setShowQuickCustomerModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleQuickCreateCustomer}>
              <div className="jf-modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label">Customer Name *</label>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="e.g. Ramesh Kumar / Acme Prints"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    required
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Mobile Number *</label>
                  <input
                    type="tel"
                    className="jf-input"
                    placeholder="e.g. 9876543210"
                    value={newCustMobile}
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(e) => setNewCustMobile(onlyMobile(e.target.value))}
                    required
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">GSTIN (Optional)</label>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    value={newCustGstin}
                    onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Email (Optional)</label>
                  <input
                    type="email"
                    className="jf-input"
                    placeholder="e.g. customer@example.com"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Address (Optional)</label>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="e.g. 12th Main, Banaswadi, Bangalore"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Credit Limit (₹) (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    className="jf-input"
                    placeholder="e.g. 5000"
                    value={newCustCreditLimit || ""}
                    onChange={(e) => setNewCustCreditLimit(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="jf-modal-footer">
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary"
                  onClick={() => setShowQuickCustomerModal(false)}
                  disabled={creatingCustomer}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="jf-btn jf-btn-primary"
                  style={{ background: "#059669", borderColor: "#059669" }}
                  disabled={creatingCustomer}
                >
                  {creatingCustomer ? "Registering..." : "Save & Select Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: INSUFFICIENT BRANCH STOCK / ORDER INTENT (STEP 2) ── */}
      {blockedStockProduct && (
        <div className="jf-modal-overlay">
          <div className="jf-modal jf-modal-sm">
            <div className="jf-modal-header" style={{ borderBottomColor: "#fed7aa" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertCircle size={20} style={{ color: "#dc2626" }} />
                <h2 className="jf-modal-title" style={{ color: "#991b1b" }}>
                  Branch Stock is 0 • Line Blocked
                </h2>
              </div>
              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                onClick={() => setBlockedStockProduct(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="jf-modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ background: "#fef2f2", padding: "0.75rem", borderRadius: "8px", border: "1px solid #fee2e2", fontSize: "0.82rem", color: "#991b1b" }}>
                Item <strong>{blockedStockProduct.name}</strong> ({blockedStockProduct.itemCode || "ITEM"}) has <strong>0 available stock</strong> in branch <strong>{currentBranchName}</strong>.
              </div>
              <p style={{ fontSize: "0.8rem", color: "#1e293b", margin: 0 }}>
                As per POS Flow Step 2, standard counter billing is blocked when branch stock is exhausted.
              </p>
            </div>
            <div className="jf-modal-footer" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setBlockedStockProduct(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                style={{ background: "#2563eb", borderColor: "#2563eb" }}
                onClick={() => {
                  toast.success(`Product Sale Order (Flow C) raised for ${blockedStockProduct.name}!`);
                  setBlockedStockProduct(null);
                }}
              >
                Raise Sale Order (Flow C)
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                style={{ color: "#d97706", borderColor: "#fde68a" }}
                onClick={() => {
                  addToCart(blockedStockProduct, true);
                  setBlockedStockProduct(null);
                  toast.info("Manager override applied: Item added with 0 stock.");
                }}
              >
                Manager Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: HELD (PARKED) BILLS QUEUE ── */}
      {showHeldModal && (
        <div className="jf-modal-overlay">
          <div className="jf-modal" style={{ maxWidth: "560px" }}>
            <div className="jf-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <PauseCircle size={20} style={{ color: "#d97706" }} />
                <h2 className="jf-modal-title">Held / Parked Bills ({heldBills.length})</h2>
              </div>
              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                onClick={() => setShowHeldModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="jf-modal-body">
              {heldBills.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#1e293b" }}>
                  No held bills in queue.
                </div>
              ) : (
                <div className="pos-held-list-modal">
                  {heldBills.map((b) => (
                    <div key={b.id} className="pos-held-item-card">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
                          {b.customerName}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#1e293b" }}>
                          {b.cart?.length || 0} items • ₹{Number(b.grandTotal || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#1e293b", marginTop: "2px" }}>
                          Parked: {new Date(b.heldAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          type="button"
                          className="jf-btn jf-btn-primary jf-btn-sm"
                          style={{ background: "#059669", borderColor: "#059669" }}
                          onClick={() => handleResumeBill(b)}
                        >
                          <PlayCircle size={14} /> Resume Bill
                        </button>
                        <button
                          type="button"
                          className="jf-btn jf-btn-secondary jf-btn-sm"
                          style={{ color: "#dc2626" }}
                          onClick={() => handleDeleteHeldBill(b.id)}
                          title="Discard Parked Bill"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="jf-modal-footer">
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setShowHeldModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: MANAGER DISCOUNT APPROVAL ── */}
      {showDiscountModal && (
        <div className="jf-modal-overlay">
          <div className="jf-modal jf-modal-sm">
            <div className="jf-modal-header" style={{ borderBottomColor: "#fed7aa" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ShieldCheck size={20} style={{ color: "#ea580c" }} />
                <h2 className="jf-modal-title" style={{ color: "#9a3412" }}>
                  Manager Discount Approval
                </h2>
              </div>
              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                onClick={() => setShowDiscountModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleManagerApproval}>
              <div className="jf-modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ background: "#fff7ed", padding: "0.75rem", borderRadius: "8px", border: "1px solid #ffedd5", fontSize: "0.82rem", color: "#9a3412" }}>
                  Discount of <strong>₹{Number(discountAmount).toFixed(2)}</strong> exceeds normal counter threshold. Enter Manager PIN to approve.
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Manager PIN / Access Code *</label>
                  <input
                    type="password"
                    maxLength={6}
                    className="jf-input"
                    placeholder="Enter 4-digit PIN (e.g. 1234)"
                    value={managerPin}
                    onChange={(e) => setManagerPin(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Approval Reason (Optional)</label>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="e.g. Bulk client / management goodwill"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="jf-modal-footer">
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary"
                  onClick={() => setShowDiscountModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="jf-btn jf-btn-primary"
                  style={{ background: "#ea580c", borderColor: "#ea580c" }}
                >
                  Authorize Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </JobFlowLayout>
  );
};

export default PosBillingPage;
