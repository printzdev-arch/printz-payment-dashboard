import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import {
  Calculator,
  CheckCircle2,
  Lock,
  Edit3,
  Save,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Trash2,
  History,
  Banknote,
  QrCode,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import CalendarSelect from "../../common/CalendarSelect";
import { toast } from "react-toastify";
import { usePopup } from "../../../hooks/usePopup";
import Popup from "../../common/Popup";
import DailyReadingsSkeleton from "./DailyReadingsSkeleton";

const TotalAmountSection = ({
  date,
  branchName,
  userId,
  approvedDates,
  onFinalSubmitChange,
  isFinalSubmitted,
  onNextStep,
  onPrevStep,
  isActive = true,
}) => {
  const { popup, showSuccess, showError, showWarning } = usePopup();
  const [totalAmountRows, setTotalAmountRows] = useState([]);
  const [previousBalanceRows, setPreviousBalanceRows] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [hasExistingTotalData, setHasExistingTotalData] = useState(false);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [totalValidationErrors, setTotalValidationErrors] = useState({});
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [totalDocId, setTotalDocId] = useState(null);
  const [originalPreviousBalanceRows, setOriginalPreviousBalanceRows] =
    useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previousBalances, setPreviousBalances] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);

  const formatDateToYYYYMMDD = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const canEditCurrentDate = useCallback(() => {
    const today = new Date();
    const todayFormatted = formatDateToYYYYMMDD(today);
    return date === todayFormatted;
  }, [date, formatDateToYYYYMMDD]);

  const canEditPastDate = useCallback(() => {
    if (canEditCurrentDate()) return false;
    const selectedDate = new Date(date);
    return approvedDates.some((approvedDate) => {
      const approvedLocal = new Date(
        approvedDate.getFullYear(),
        approvedDate.getMonth(),
        approvedDate.getDate()
      );
      const selectedLocal = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      return approvedLocal.getTime() === selectedLocal.getTime();
    });
  }, [date, approvedDates, canEditCurrentDate]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const generateDynamicRows = useCallback(async () => {
    const dynamicRows = [];
    try {
      const res = await api.get("/printers", {
        params: { branchName, isActive: true },
      });
      const activePrinters = res.data?.data || res.data || [];
      const seenPrinterIds = new Set();
      activePrinters.forEach((printer) => {
        if (!printer.printerId || seenPrinterIds.has(printer.printerId)) return;
        const pType = (printer.printerType || "").toUpperCase();
        if (pType !== "SFP" && pType !== "MFP") return;

        seenPrinterIds.add(printer.printerId);
        const printerName =
          printer.printerName || `PRINTER ${printer.printerId}`;
        dynamicRows.push({
          itemName: `TOTAL ${printerName.toUpperCase()}`,
          amount: "",
          key: `printer_${printer.printerId}`,
          type: "printer",
          printerId: printer.printerId,
        });
      });
    } catch (error) {
      console.error("Error fetching printers:", error);
    }

    const staticRows = [
      {
        itemName: "JUMBO XEROX",
        amount: "",
        key: "jumboXerox",
        type: "static",
      },
      { itemName: "ITEMS", amount: "", key: "items", type: "stock" },
      {
        itemName: "DIGITAL BUSINESS",
        amount: "",
        key: "digitalBusiness",
        type: "manual",
      },
      {
        itemName: "GIFT BUSINESS",
        amount: "",
        key: "giftBusiness",
        type: "manual",
      },
      { itemName: "GST IN CASH", amount: "", key: "gstInCash", type: "manual" },
      { itemName: "GST IN BANK", amount: "", key: "gstInBank", type: "manual" },
      { itemName: "TOTAL BUSINESS", amount: "", key: "totalBusiness", type: "calculated" },
      { itemName: "DISCOUNT", amount: "", key: "discount", type: "manual" },
      {
        itemName: "UPI & CARD PAYMENTS",
        amount: "",
        key: "upiCardPayments",
        type: "manual",
      },
      {
        itemName: "BANK TRANSFERS",
        amount: "",
        key: "bankTransfers",
        type: "manual",
      },
      {
        itemName: "CASH AS PER ACCOUNTS",
        amount: "",
        key: "cashAsPerAccounts",
        type: "calculated",
      },
      {
        itemName: "CASH IN HAND",
        amount: "",
        key: "cashInHand",
        type: "manual",
      },
      {
        itemName: "PAYMENT TO BE COLLECTED",
        amount: "",
        key: "paymentToBeCollected",
        type: "manual",
      },
    ];

    return [...dynamicRows, ...staticRows];
  }, [branchName]);

  const validateTotalAmountReadings = useCallback(() => {
    const errors = {};
    let hasErrors = false;
    totalAmountRows.forEach((row) => {
      if (row.type === "manual" && row.amount < 0) {
        errors[row.key] = "Amount cannot be negative";
        hasErrors = true;
      }
    });
    previousBalanceRows.forEach((row, index) => {
      if (row.date === "") {
        errors[`previous-${index}-date`] =
          "Date is required for previous balance";
        hasErrors = true;
      }
      if (row.amount === "" || row.amount < 0) {
        errors[`previous-${index}-amount`] =
          "Valid amount is required for previous balance";
        hasErrors = true;
      }
      if (row.amount > row.availableBalance) {
        errors[`previous-${index}-amount`] =
          "Amount cannot exceed available balance";
        hasErrors = true;
      }
    });
    setTotalValidationErrors(errors);
    return !hasErrors;
  }, [totalAmountRows, previousBalanceRows]);

  const storePaymentToBeCollected = useCallback(
    async (amount, dateString) => {
      try {
        const normalizedAmount = Number(amount) || 0;
        const res = await api.get("/payments", {
          params: { branchName, date: dateString },
        });
        const list = res.data?.data || res.data || [];
        const existing = Array.isArray(list) ? list[0] : list;
        const existingCollected = existing?.paymentCollectedTillNow || 0;
        const existingItems = existing?.items || [];
        const nextBalance = Math.max(0, normalizedAmount - existingCollected);

        const payload = {
          date: dateString,
          branchName,
          paymentToBeCollected: normalizedAmount,
          paymentCollectedTillNow: existingCollected,
          balance: nextBalance,
          items: existingItems,
        };

        if (existing && (existing.id || existing._id)) {
          await api.put(`/payments/${existing.id || existing._id}`, payload);
        } else {
          await api.post("/payments", payload);
        }
      } catch (error) {
        console.error("Error storing payment to be collected:", error);
        showError("Failed to store payment to be collected data");
      }
    },
    [branchName, showError]
  );

  const updatePaymentCollection = useCallback(
    async (previousBalanceData, originalData = []) => {
      if (!previousBalanceData || previousBalanceData.length === 0) return;
      try {
        if (originalData && originalData.length > 0) {
          for (const originalItem of originalData) {
            const { date: balanceDate, amount } = originalItem;
            const res = await api.get("/payments", {
              params: { branchName, date: balanceDate },
            });
            const list = res.data?.data || res.data || [];
            const docData = Array.isArray(list) ? list[0] : list;
            if (docData && (docData.id || docData._id)) {
              const currentCollected = docData.paymentCollectedTillNow || 0;
              const newCollected = Math.max(0, currentCollected - amount);
              const newBalance = (docData.paymentToBeCollected || 0) - newCollected;
              const currentItems = docData.items || [];
              const currentDateString =
                typeof date === "string" ? date : formatDateToYYYYMMDD(date);
              const updatedItems = currentItems.filter(
                (item) =>
                  !(item.date === currentDateString && item.amount === amount)
              );
              await api.put(`/payments/${docData.id || docData._id}`, {
                paymentCollectedTillNow: newCollected,
                balance: newBalance,
                items: updatedItems,
              });
            }
          }
        }
        for (const balanceItem of previousBalanceData) {
          const { date: balanceDate, amount, paymentMethod } = balanceItem;
          const res = await api.get("/payments", {
            params: { branchName, date: balanceDate },
          });
          const list = res.data?.data || res.data || [];
          const docData = Array.isArray(list) ? list[0] : list;
          if (docData && (docData.id || docData._id)) {
            const currentCollected = docData.paymentCollectedTillNow || 0;
            const newCollected = currentCollected + amount;
            const newBalance = Math.max(
              0,
              (docData.paymentToBeCollected || 0) - newCollected
            );
            const currentItems = docData.items || [];
            const currentDateString =
              typeof date === "string" ? date : formatDateToYYYYMMDD(date);
            const existingItemIndex = currentItems.findIndex(
              (item) =>
                item.date === currentDateString &&
                item.paymentMethod === paymentMethod
            );
            let updatedItems;
            if (existingItemIndex >= 0) {
              updatedItems = [...currentItems];
              updatedItems[existingItemIndex] = {
                date: currentDateString,
                amount: amount,
                paymentMethod: paymentMethod,
                collectedAt: new Date(),
              };
            } else {
              const newItem = {
                date: currentDateString,
                amount: amount,
                paymentMethod: paymentMethod,
                collectedAt: new Date(),
              };
              updatedItems = [...currentItems, newItem];
            }
            await api.put(`/payments/${docData.id || docData._id}`, {
              paymentCollectedTillNow: newCollected,
              balance: newBalance,
              items: updatedItems,
            });
          }
        }
      } catch (error) {
        console.error("Error updating payment collection:", error);
        showError("Failed to update payment collection data");
      }
    },
    [branchName, date, formatDateToYYYYMMDD, showError]
  );

  const fetchAvailableBalance = useCallback(
    async (selectedDate) => {
      if (!selectedDate || !branchName) {
        return 0;
      }
      try {
        const res = await api.get("/payments", {
          params: { branchName, date: selectedDate },
        });
        const list = res.data?.data || res.data || [];
        const docData = Array.isArray(list) ? list[0] : list;
        return docData?.balance || 0;
      } catch (error) {
        console.error("Error fetching available balance:", error);
        return 0;
      }
    },
    [branchName]
  );

  const fetchStockData = useCallback(
    async (dateString) => {
      if (!branchName || !dateString) {
        return 0;
      }
      setIsLoadingStock(true);
      try {
        const res = await api.get("/stocks/readings", {
          params: { branchName, date: dateString },
        });
        const list = res.data?.data || res.data || [];
        const stockData = Array.isArray(list) ? list[0] : list;
        return stockData?.totalAmount || 0;
      } catch (error) {
        console.error("fetchStockData: Error", error);
        return 0;
      } finally {
        setIsLoadingStock(false);
      }
    },
    [branchName]
  );

  const fetchPrinterReadingsData = useCallback(
    async (dateString) => {
      if (!branchName || !dateString) return null;
      try {
        const res = await api.get("/printer-readings", {
          params: { branchName, date: dateString },
        });
        const list = res.data?.data || res.data || [];
        const printerData = Array.isArray(list) ? list[0] : list;
        if (printerData && printerData.readings) {
          const printerTotals = {};
          Object.entries(printerData.readings).forEach(
            ([printerId, sizes]) => {
              let printerTotal = 0;
              if (sizes && typeof sizes === "object") {
                Object.values(sizes).forEach((sizeData) => {
                  printerTotal += Number(sizeData?.total || 0);
                });
              }
              printerTotals[printerId] = printerTotal;
            }
          );
          return printerTotals;
        }
        return null;
      } catch (error) {
        console.error("Error fetching printer readings:", error);
        return null;
      }
    },
    [branchName]
  );

  const fetchJumboXeroxData = useCallback(
    async (dateString) => {
      if (!branchName || !dateString) return 0;
      try {
        const res = await api.get("/jumbo-xerox/readings", {
          params: { branchName, date: dateString },
        });
        const list = res.data?.data || res.data || [];
        const jumboData = Array.isArray(list) ? list[0] : list;
        return jumboData?.totalAmount || 0;
      } catch (error) {
        console.error("Error fetching jumbo xerox data:", error);
        return 0;
      }
    },
    [branchName]
  );

  const loadDataForDate = useCallback(async () => {
    if (!date || !branchName || !userId) return;
    try {
      setDataLoaded(false);
      setIsLoading(true);
      setTotalAmountRows([]);
      setPreviousBalanceRows([]);
      setHasExistingTotalData(false);
      setIsEditingTotal(false);
      setTotalDocId(null);
      const dateString =
        typeof date === "string" ? date : formatDateToYYYYMMDD(date);
      const [stockTotal, printerReadingsData, jumboXeroxTotal, dynamicRows] =
        await Promise.all([
          fetchStockData(dateString),
          fetchPrinterReadingsData(dateString),
          fetchJumboXeroxData(dateString),
          generateDynamicRows(),
        ]);
      const updatedDynamicRows = dynamicRows.map((row) => {
        if (row.key === "items") {
          return { ...row, amount: stockTotal };
        } else if (row.key === "jumboXerox") {
          return { ...row, amount: jumboXeroxTotal };
        } else if (
          row.type === "printer" &&
          printerReadingsData &&
          printerReadingsData[row.printerId]
        ) {
          return { ...row, amount: printerReadingsData[row.printerId] };
        }
        return row;
      });
      try {
        const res = await api.get("/total-amounts", {
          params: { branchName, date: dateString },
        });
        const list = res.data?.data || res.data || [];
        const existing = Array.isArray(list) ? list[0] : list;

        if (existing && (existing.id || existing._id)) {
          setHasExistingTotalData(true);
          setIsEditingTotal(false);
          setTotalDocId(existing.id || existing._id);
          const docData = existing;
          if (docData.rows) {
            const updatedRows = updatedDynamicRows.map((row) => {
              const savedRow = docData.rows.find((r) => r.key === row.key);
              if (
                row.type === "printer" ||
                row.key === "jumboXerox" ||
                row.key === "items"
              ) {
                return row;
              }
              return savedRow ? { ...row, amount: savedRow.amount } : row;
            });
            setTotalAmountRows(updatedRows);
            setTotalAmount(docData.totalAmount || 0);
          } else {
            setTotalAmountRows(updatedDynamicRows);
          }
          if (docData.previousBalanceRows) {
            const savedPreviousRows = docData.previousBalanceRows.map(
              (row, index) => ({
                ...row,
                id: Date.now() + index,
                availableBalance: 0,
              })
            );
            setPreviousBalanceRows(savedPreviousRows);
            savedPreviousRows.forEach(async (row) => {
              if (row.date) {
                try {
                  const balance = await fetchAvailableBalance(row.date);
                  setPreviousBalanceRows((prev) =>
                    prev.map((r) =>
                      r.id === row.id
                        ? { ...r, availableBalance: balance }
                        : r
                    )
                  );
                } catch (error) {
                  console.error("Error fetching balance for row:", error);
                }
              }
            });
          } else {
            setPreviousBalanceRows([]);
          }
          const totalSubmitted = docData.isFinalSubmitted === true;
          if (totalSubmitted) {
            onFinalSubmitChange?.(true);
          }
        } else {
          setHasExistingTotalData(false);
          setIsEditingTotal(true);
          setTotalAmountRows((prevRows) => {
            if (prevRows && prevRows.length > 0) {
              return updatedDynamicRows.map((row) => {
                if (row.type === "manual") {
                  const existingManual = prevRows.find((p) => p.key === row.key);
                  if (
                    existingManual &&
                    existingManual.amount !== "" &&
                    existingManual.amount !== undefined
                  ) {
                    return { ...row, amount: existingManual.amount };
                  }
                }
                return row;
              });
            }
            return updatedDynamicRows;
          });
          setPreviousBalanceRows([]);
        }
      } catch (error) {
        console.error("Error loading total amounts:", error);
        setTotalAmountRows(updatedDynamicRows);
        setPreviousBalanceRows([]);
      }
    } catch (error) {
      console.error("Error loading data for date:", error);
      showError("Failed to load data for selected date");
    } finally {
      setDataLoaded(true);
      setIsLoading(false);
    }
  }, [
    date,
    branchName,
    userId,
    generateDynamicRows,
    formatDateToYYYYMMDD,
    fetchStockData,
    fetchPrinterReadingsData,
    fetchJumboXeroxData,
    fetchAvailableBalance,
    onFinalSubmitChange,
    showError,
  ]);

  useEffect(() => {
    if (isActive) {
      loadDataForDate();
    }
  }, [isActive, loadDataForDate]);

  const handleTotalAmountInputChange = useCallback(
    (key, value) => {
      if (!date) {
        showWarning("Please select a date first");
        return;
      }
      if (isFinalSubmitted) {
        showWarning("Data is locked after final submission");
        return;
      }
      if (
        hasExistingTotalData &&
        !isEditingTotal &&
        !canEditCurrentDate() &&
        !canEditPastDate()
      ) {
        showWarning("Cannot edit this data. Enable edit mode first.");
        return;
      }
      const cleanedValue =
        value === ""
          ? ""
          : Number.parseFloat(value.replace(/[^0-9.]/g, "")) || "";
      const updatedRows = totalAmountRows.map((row) =>
        row.key === key ? { ...row, amount: cleanedValue } : row
      );
      setTotalAmountRows(updatedRows);
      if (totalValidationErrors[key]) {
        setTotalValidationErrors((prev) => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      }
    },
    [
      date,
      totalAmountRows,
      hasExistingTotalData,
      isEditingTotal,
      canEditCurrentDate,
      canEditPastDate,
      isFinalSubmitted,
      totalValidationErrors,
      showWarning,
    ]
  );

  const handleAddPreviousBalanceRow = useCallback(async () => {
    if (!date) {
      showWarning("Please select a date first");
      return;
    }
    if (isFinalSubmitted) {
      showWarning("Data is locked after final submission");
      return;
    }
    if (
      hasExistingTotalData &&
      !isEditingTotal &&
      !canEditCurrentDate() &&
      !canEditPastDate()
    ) {
      showWarning("Cannot edit this data. Enable edit mode first.");
      return;
    }
    try {
      const res = await api.get("/payments", {
        params: { branchName, hasBalance: true },
      });
      const list = res.data?.data || res.data || [];
      const unpaidBalances = list.filter((p) => (p.balance || 0) > 0);
      setPreviousBalances(unpaidBalances);
      setPreviousBalanceRows((prev) => [
        ...prev,
        {
          date: "",
          amount: "",
          paymentMethod: "cash",
          availableBalance: 0,
          id: Date.now() + Math.random(),
        },
      ]);
    } catch (error) {
      console.error("Error fetching unpaid balances:", error);
      showError("Failed to load previous balance data");
    }
  }, [
    date,
    isFinalSubmitted,
    hasExistingTotalData,
    isEditingTotal,
    canEditCurrentDate,
    canEditPastDate,
    branchName,
    showError,
    showWarning,
  ]);

  const handleRemovePreviousBalanceRow = useCallback(() => {
    if (!date) {
      showWarning("Please select a date first");
      return;
    }
    if (previousBalanceRows.length > 0) {
      setPreviousBalanceRows((prev) => prev.slice(0, -1));
    }
  }, [date, previousBalanceRows.length, showWarning]);

  const handlePreviousBalanceInputChange = useCallback(
    async (index, field, value) => {
      if (!date) {
        showWarning("Please select a date first");
        return;
      }
      if (isFinalSubmitted) {
        showWarning("Data is locked after final submission");
        return;
      }
      if (
        hasExistingTotalData &&
        !isEditingTotal &&
        !canEditCurrentDate() &&
        !canEditPastDate()
      ) {
        showWarning("Cannot edit this data. Enable edit mode first.");
        return;
      }
      const updatedRows = [...previousBalanceRows];
      if (field === "amount") {
        const cleanedValue =
          value === ""
            ? ""
            : Number.parseFloat(value.replace(/[^0-9.]/g, "")) || "";
        updatedRows[index][field] = cleanedValue;
      } else if (field === "date") {
        updatedRows[index][field] = value;
        updatedRows[index].amount = "";
        if (value) {
          const balance = await fetchAvailableBalance(value);
          updatedRows[index].availableBalance = balance;
        } else {
          updatedRows[index].availableBalance = 0;
        }
      } else {
        updatedRows[index][field] = value;
      }
      setPreviousBalanceRows(updatedRows);
      const key = `previous-${index}-${field}`;
      if (totalValidationErrors[key]) {
        setTotalValidationErrors((prev) => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      }
    },
    [
      date,
      previousBalanceRows,
      hasExistingTotalData,
      isEditingTotal,
      canEditCurrentDate,
      canEditPastDate,
      isFinalSubmitted,
      totalValidationErrors,
      fetchAvailableBalance,
      showWarning,
    ]
  );

  const handleSubmitTotalAmount = useCallback(async () => {
    if (!date) {
      toast.warning("Please select a date first");
      showError("Please select a date first");
      return;
    }
    if (!validateTotalAmountReadings()) {
      toast.error("Please fix the highlighted errors before submitting");
      showError("Please fix the highlighted errors before submitting");
      return;
    }
    const dateString =
      typeof date === "string" ? date : formatDateToYYYYMMDD(date);
    try {
      setIsLoading(true);

      // Other sections are fully validated during Step 5 (Final Submit).
      // Saving Business & Payments should not block the manager while filling the workflow.

      const rowsForStorage = totalAmountRows.map((row) => ({
        itemName: row.itemName,
        amount: row.amount === "" ? 0 : Number(row.amount) || 0,
        key: row.key,
        type: row.type || "manual",
        printerId: row.printerId || null,
      }));
      const previousBalanceForStorage = previousBalanceRows.map((row) => ({
        date: row.date,
        amount: row.amount === "" ? 0 : Number(row.amount) || 0,
        paymentMethod: row.paymentMethod,
        availableBalance: row.availableBalance,
      }));
      const dataToSave = {
        userId,
        branchName,
        date: dateString,
        rows: rowsForStorage,
        previousBalanceRows: previousBalanceForStorage,
        totalAmount,
      };

      if (hasExistingTotalData && totalDocId) {
        await api.put(`/total-amounts/${totalDocId}`, dataToSave);
        toast.success("Total amount readings updated successfully");
        showSuccess("Total amount readings updated successfully");
      } else {
        const res = await api.post("/total-amounts", dataToSave);
        const created = res.data?.data || res.data;
        if (created?.id || created?._id) {
          setTotalDocId(created.id || created?._id);
        }
        setHasExistingTotalData(true);
        toast.success("Total amount readings saved successfully");
        showSuccess("Total amount readings saved successfully");
      }

      const paymentToBeCollectedRow = totalAmountRows.find(
        (row) => row.key === "paymentToBeCollected"
      );
      const paymentToBeCollected = Number(paymentToBeCollectedRow?.amount) || 0;
      try {
        await storePaymentToBeCollected(paymentToBeCollected, dateString);
      } catch (error) {
        console.error("Error storing payment to be collected:", error);
      }
      if (previousBalanceRows.length > 0) {
        await updatePaymentCollection(
          previousBalanceRows,
          originalPreviousBalanceRows
        );
      }
      setIsEditingTotal(false);
    } catch (error) {
      console.error("Error saving total amount readings:", error);
      toast.error(`Failed to save total amount readings: ${error.response?.data?.message || error.message}`);
      showError(`Failed to save total amount readings: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [
    branchName,
    date,
    formatDateToYYYYMMDD,
    showError,
    showWarning,
    showSuccess,
    userId,
    validateTotalAmountReadings,
    hasExistingTotalData,
    totalAmount,
    totalAmountRows,
    previousBalanceRows,
    totalDocId,
    storePaymentToBeCollected,
    updatePaymentCollection,
    originalPreviousBalanceRows,
  ]);

  const handleEditTotal = useCallback(() => {
    if (!canEditCurrentDate() && !canEditPastDate()) {
      showError(
        "Cannot edit this date. Only current date or approved past dates can be edited."
      );
      return;
    }
    if (isFinalSubmitted) {
      showError("Cannot edit data after final submission.");
      return;
    }
    setOriginalPreviousBalanceRows([...previousBalanceRows]);
    setIsEditingTotal(true);
  }, [
    canEditCurrentDate,
    canEditPastDate,
    isFinalSubmitted,
    previousBalanceRows,
    showError,
  ]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingTotal(false);
    setOriginalPreviousBalanceRows([]);
    window.location.reload();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  useEffect(() => {
    if (!dataLoaded) return;
    const businessTotal = totalAmountRows
      .filter(
        (row) =>
          row.type === "printer" ||
          row.type === "static" ||
          row.type === "stock" ||
          row.key === "digitalBusiness" ||
          row.key === "giftBusiness" ||
          row.key === "gstInCash" ||
          row.key === "gstInBank"
      )
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const discount = totalAmountRows
      .filter((row) => row.key === "discount")
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const upiCardPayments = totalAmountRows
      .filter((row) => row.key === "upiCardPayments")
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const bankTransfers = totalAmountRows
      .filter((row) => row.key === "bankTransfers")
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const paymentToBeCollected = totalAmountRows
      .filter((row) => row.key === "paymentToBeCollected")
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const previousBalanceCash = previousBalanceRows
      .filter((row) => row.paymentMethod === "cash")
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const previousBalanceUPI = previousBalanceRows
      .filter((row) => row.paymentMethod === "upi")
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const totalPreviousBalance = previousBalanceCash + previousBalanceUPI;
    const updatedRows = totalAmountRows.map((row) => {
      if (row.key === "totalBusiness") {
        return {
          ...row,
          amount: Math.max(0, businessTotal + totalPreviousBalance),
        };
      } else if (row.key === "cashAsPerAccounts") {
        const totalBusinessAmount = Math.max(
          0,
          businessTotal + totalPreviousBalance
        );
        const netUpiPayments = upiCardPayments - previousBalanceUPI;
        return {
          ...row,
          amount: Math.max(
            0,
            totalBusinessAmount - discount - netUpiPayments - bankTransfers
          ),
        };
      }
      return row;
    });
    if (JSON.stringify(updatedRows) !== JSON.stringify(totalAmountRows)) {
      setTotalAmountRows(updatedRows);
    }
    const finalTotalBusiness = Math.max(
      0,
      businessTotal + totalPreviousBalance
    );
    setTotalAmount(
      Math.max(0, finalTotalBusiness - discount - paymentToBeCollected)
    );
  }, [totalAmountRows, previousBalanceRows, dataLoaded]);

  // Debounced auto-save workflow for existing Total Amount record
  useEffect(() => {
    if (
      !dataLoaded ||
      isLoading ||
      !hasExistingTotalData ||
      !totalDocId ||
      isEditingTotal ||
      isFinalSubmitted ||
      !date ||
      !branchName ||
      totalAmountRows.length === 0
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const rowsForStorage = totalAmountRows.map((row) => ({
          itemName: row.itemName,
          amount: row.amount === "" ? 0 : Number(row.amount) || 0,
          key: row.key,
          type: row.type || "manual",
          printerId: row.printerId || null,
        }));
        const previousBalanceForStorage = previousBalanceRows.map((row) => ({
          date: row.date,
          amount: row.amount === "" ? 0 : Number(row.amount) || 0,
          paymentMethod: row.paymentMethod,
          availableBalance: row.availableBalance,
        }));
        const dataToSave = {
          userId,
          branchName,
          date: typeof date === "string" ? date : formatDateToYYYYMMDD(date),
          rows: rowsForStorage,
          previousBalanceRows: previousBalanceForStorage,
          totalAmount,
        };

        await api.put(`/total-amounts/${totalDocId}`, dataToSave);

        const paymentToBeCollectedRow = totalAmountRows.find(
          (row) => row.key === "paymentToBeCollected"
        );
        const paymentToBeCollected =
          Number(paymentToBeCollectedRow?.amount) || 0;
        const dateString =
          typeof date === "string" ? date : formatDateToYYYYMMDD(date);
        await storePaymentToBeCollected(paymentToBeCollected, dateString);

        if (previousBalanceRows.length > 0) {
          await updatePaymentCollection(
            previousBalanceRows,
            originalPreviousBalanceRows
          );
        }
      } catch (error) {
        console.error("Auto-save Total Amount failed:", error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    totalAmountRows,
    previousBalanceRows,
    totalAmount,
    hasExistingTotalData,
    totalDocId,
    isEditingTotal,
    isFinalSubmitted,
    dataLoaded,
    isLoading,
    date,
    branchName,
    formatDateToYYYYMMDD,
    storePaymentToBeCollected,
    updatePaymentCollection,
    originalPreviousBalanceRows,
  ]);

  if (!dataLoaded) {
    return (
      <DailyReadingsSkeleton
        message="Loading business & payment totals..."
        subtitle={`Calculating daily collections, cash, and balances for ${branchName || "branch"}...`}
      />
    );
  }

  const isReadonlyView = hasExistingTotalData && !isEditingTotal;

  return (
    <div className="revenue-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "0" }}>
        <div className="revenue-table-wrapper">
          <table className="revenue-modern-table">
            <thead>
              <tr>
                <th style={{ width: "65%" }}>ITEMS</th>
                <th className="right" style={{ width: "35%" }}>
                  TOTAL AMOUNT (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {totalAmountRows.map((row, index) => {
                const isAutoCalculated =
                  row.type === "calculated" ||
                  row.type === "printer" ||
                  row.type === "static" ||
                  row.type === "stock";

                return (
                  <tr key={`${row.key || "row"}_${index}`}>
                    <td style={{ fontWeight: 600, color: "#0f172a" }}>
                      {row.itemName}
                    </td>
                    <td className="right">
                      {isReadonlyView || isAutoCalculated ? (
                        <span
                          style={{
                            fontFamily:
                              "'JetBrains Mono', 'Fira Code', monospace",
                            fontWeight: isAutoCalculated ? 700 : 600,
                            color: isAutoCalculated ? "#0f172a" : "#0f172a",
                          }}
                        >
                          {row.amount !== "" && row.amount !== undefined
                            ? formatCurrency(row.amount)
                            : "₹0.00"}
                        </span>
                      ) : (
                        <input
                          type="number"
                          inputMode="numeric"
                          value={row.amount}
                          onChange={(e) =>
                            handleTotalAmountInputChange(row.key, e.target.value)
                          }
                          className={`total-amount-input ${totalValidationErrors[row.key]
                              ? "validation-error"
                              : ""
                            }`}
                          disabled={isLoading || isFinalSubmitted}
                          min="0"
                          placeholder="0"
                        />
                      )}
                      {totalValidationErrors[row.key] && (
                        <div className="validation-error-text">
                          {totalValidationErrors[row.key]}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Previous Balance Rows */}
              {previousBalanceRows.map((row, index) => {
                const dateError =
                  totalValidationErrors[`previous-${index}-date`];
                const amountError =
                  totalValidationErrors[`previous-${index}-amount`];
                return (
                  <tr key={row.id} className="previous-balance-row">
                    <td colSpan="2">
                      <div className="prev-bal-card">
                        {/* Card Header: Title on Left, Trash Button on Right */}
                        <div className="prev-bal-header">
                          <span className="prev-bal-title">
                            Previous Balance #{index + 1}
                          </span>

                          {!isReadonlyView && !isFinalSubmitted && (
                            <button
                              type="button"
                              className="prev-bal-delete-btn"
                              onClick={() => {
                                setPreviousBalanceRows((prev) =>
                                  prev.filter((_, i) => i !== index)
                                );
                              }}
                              title="Remove this entry"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        {/* Card Body: Left Fields + Right Amount */}
                        <div className="prev-bal-body">
                          {/* Left Column: Reference Date & Payment Mode, then Available Balance */}
                          <div className="prev-bal-col-left">
                            <div className="prev-bal-fields-row">
                              {/* Reference Date */}
                              <div className="prev-bal-field">
                                <label className="prev-bal-label">
                                  Reference Date
                                </label>
                                {!isReadonlyView ? (
                                  <div className="prev-bal-date-wrapper">
                                    <CalendarSelect
                                      selected={row.date}
                                      onChange={(selectedDate, formattedStr) =>
                                        handlePreviousBalanceInputChange(
                                          index,
                                          "date",
                                          formattedStr || ""
                                        )
                                      }
                                      dateFormat="yyyy-MM-dd"
                                      maxDate={new Date()}
                                      disabled={
                                        isReadonlyView || isFinalSubmitted
                                      }
                                      inputClassName={dateError ? "validation-error" : ""}
                                      placeholder="YYYY-MM-DD"
                                    />
                                  </div>
                                ) : (
                                  <div className="prev-bal-readonly-box">
                                    {row.date || "N/A"}
                                  </div>
                                )}
                                {dateError && (
                                  <span className="validation-error-text">
                                    {dateError}
                                  </span>
                                )}
                              </div>

                              {/* Payment Mode Toggle */}
                              <div className="prev-bal-field">
                                <label className="prev-bal-label">
                                  Payment Mode
                                </label>
                                <div className="prev-bal-mode-toggle">
                                  <button
                                    type="button"
                                    className={`prev-bal-mode-btn ${row.paymentMethod === "cash"
                                        ? "active"
                                        : ""
                                      }`}
                                    onClick={() =>
                                      !isReadonlyView &&
                                      !isFinalSubmitted &&
                                      handlePreviousBalanceInputChange(
                                        index,
                                        "paymentMethod",
                                        "cash"
                                      )
                                    }
                                    disabled={
                                      isReadonlyView || isFinalSubmitted
                                    }
                                  >
                                    Cash
                                  </button>
                                  <button
                                    type="button"
                                    className={`prev-bal-mode-btn ${row.paymentMethod === "upi"
                                        ? "active"
                                        : ""
                                      }`}
                                    onClick={() =>
                                      !isReadonlyView &&
                                      !isFinalSubmitted &&
                                      handlePreviousBalanceInputChange(
                                        index,
                                        "paymentMethod",
                                        "upi"
                                      )
                                    }
                                    disabled={
                                      isReadonlyView || isFinalSubmitted
                                    }
                                  >
                                    UPI
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Available Balance Pill & No Balance Message */}
                            {!row.date ? (
                              <div className="prev-bal-avail-banner empty">
                                <span className="prev-bal-avail-title">
                                  Select reference date to check available balance
                                </span>
                              </div>
                            ) : Number(row.availableBalance || 0) <= 0 ? (
                              <div className="prev-bal-avail-banner zero">
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span className="prev-bal-avail-title">
                                    Available Balance:
                                  </span>
                                  <span className="prev-bal-avail-val zero">
                                    ₹0.00
                                  </span>
                                </div>
                                <div className="prev-bal-no-bal-msg">
                                  <AlertCircle size={13} />
                                  <span>No pending balance found for this date</span>
                                </div>
                              </div>
                            ) : (
                              <div className="prev-bal-avail-banner positive">
                                <span className="prev-bal-avail-title">
                                  Available Balance:
                                </span>
                                <span className="prev-bal-avail-val">
                                  {formatCurrency(row.availableBalance || 0)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Right Column: Amount Input */}
                          <div className="prev-bal-col-right">
                            <div className="prev-bal-field">
                              <label className="prev-bal-label">
                                Amount (₹)
                              </label>
                              {isReadonlyView ? (
                                <div className="prev-bal-amount-box">
                                  <div className="prev-bal-curr-prefix">₹</div>
                                  <span className="prev-bal-amount-val">
                                    {Number(row.amount || 0).toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                <div className="prev-bal-amount-box">
                                  <div className="prev-bal-curr-prefix">₹</div>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={row.amount}
                                    onChange={(e) =>
                                      handlePreviousBalanceInputChange(
                                        index,
                                        "amount",
                                        e.target.value
                                      )
                                    }
                                    className={`prev-bal-amount-field ${amountError ? "validation-error" : ""
                                      }`}
                                    disabled={
                                      isLoading ||
                                      !row.date ||
                                      Number(row.availableBalance || 0) <= 0 ||
                                      isFinalSubmitted
                                    }
                                    min="0"
                                    max={row.availableBalance}
                                    placeholder={
                                      !row.date
                                        ? "Select date first"
                                        : Number(row.availableBalance || 0) <= 0
                                          ? "No balance available"
                                          : `Max ${row.availableBalance}`
                                    }
                                  />
                                </div>
                              )}
                              {amountError && (
                                <span className="validation-error-text">
                                  {amountError}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Add Previous Balance Button Row */}
              {(!hasExistingTotalData || isEditingTotal) &&
                !isFinalSubmitted && (
                  <tr>
                    <td
                      colSpan="2"
                      style={{ textAlign: "center", padding: "16px 12px" }}
                    >
                      <button
                        type="button"
                        onClick={handleAddPreviousBalanceRow}
                        className="prev-bal-add-btn"
                        disabled={isLoading}
                      >
                        <Plus size={16} /> Add Previous Balance
                      </button>
                    </td>
                  </tr>
                )}
            </tbody>
            <tfoot>
              <tr className="revenue-table-total-row">
                <td style={{ fontWeight: 700, color: "#166534" }}>
                  Grand Total (After Deductions)
                </td>
                <td
                  className="right"
                  style={{
                    fontWeight: 800,
                    color: "#047857",
                    fontSize: "14px",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {formatCurrency(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Action Buttons at Bottom */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", padding: "14px 20px", flexWrap: "wrap" }}>
          <div>
            {onPrevStep && (
              <button
                type="button"
                onClick={onPrevStep}
                className="account-step-back-btn"
                disabled={isLoading}
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {hasExistingTotalData &&
              !isEditingTotal &&
              (canEditCurrentDate() || canEditPastDate()) &&
              !isFinalSubmitted && (
                <button
                  onClick={handleEditTotal}
                  className="total-edit-button"
                  disabled={isLoading}
                >
                  <Edit3 size={15} /> Edit Readings
                </button>
              )}
            {(isEditingTotal || !hasExistingTotalData) && !isFinalSubmitted && (
              <div style={{ display: "flex", gap: "8px" }}>
                {isEditingTotal && hasExistingTotalData && (
                  <button
                    onClick={handleCancelEdit}
                    className="total-cancel-button"
                    disabled={isLoading}
                  >
                    <X size={15} /> Cancel
                  </button>
                )}
                <button
                  onClick={handleSubmitTotalAmount}
                  className="total-save-button"
                  disabled={isLoading}
                >
                  <Save size={15} />{" "}
                  {isEditingTotal && hasExistingTotalData
                    ? "Update Readings"
                    : "Save Readings"}
                </button>
              </div>
            )}

            {onNextStep && (
              <button
                type="button"
                onClick={onNextStep}
                className="account-step-next-btn"
              >
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Popup Component */}
      <Popup
        show={popup.show}
        message={popup.message}
        type={popup.type}
        onClose={() => { }}
      />
    </div>
  );
};

export default TotalAmountSection;
