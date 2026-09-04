import { useState, useEffect, useCallback } from "react";
import { db } from "../../../services/authservice";
import {
  onSnapshot,
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  query,
  where,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import {
  FaSave,
  FaEdit,
  FaLock,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import DatePicker from "react-datepicker";
import { usePopup } from "../../../hooks/usePopup";
import Popup from "../../common/Popup";

const TotalAmountSection = ({
  date,
  branchName,
  userId,
  approvedDates,
  onFinalSubmitChange,
  isFinalSubmitted,
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
      const activePrintersQuery = query(
        collection(db, "printers"),
        where("branchName", "==", branchName),
        where("isActive", "==", true),
        where("printerType", "in", ["SFP", "MFP"])
      );
      const activePrintersSnapshot = await getDocs(activePrintersQuery);
      const activePrinters = activePrintersSnapshot.docs.map((doc) =>
        doc.data()
      );
      activePrinters.forEach((printer) => {
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
        itemName: "LARGE FORMAT PRINTING",
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
      { itemName: "DISCOUNT", amount: "", key: "discount", type: "manual" },
      {
        itemName: "TOTAL BUSINESS",
        amount: "",
        key: "totalBusiness",
        type: "calculated",
      },
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
        const docId = `${branchName}_${dateString.replace(/-/g, "")}`;
        const docRef = doc(db, "paymentToBeCollected", docId);
        const snap = await getDoc(docRef);
        const existing = snap.exists() ? snap.data() : null;
        const existingCollected = existing?.paymentCollectedTillNow || 0;
        const existingItems = existing?.items || [];
        const createdAt = existing?.createdAt || new Date();
        const normalizedAmount = Number(amount) || 0;
        const nextBalance = Math.max(0, normalizedAmount - existingCollected);
        await setDoc(
          docRef,
          {
            date: dateString,
            branchName,
            paymentToBeCollected: normalizedAmount,
            paymentCollectedTillNow: existingCollected,
            balance: nextBalance,
            items: existingItems,
            createdAt,
            updatedAt: new Date(),
          },
          { merge: true }
        );
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
            const docId = `${branchName}_${balanceDate.replace(/-/g, "")}`;
            const docRef = doc(db, "paymentToBeCollected", docId);
            const docSnapshot = await getDoc(docRef);
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              const currentCollected = data.paymentCollectedTillNow || 0;
              const newCollected = Math.max(0, currentCollected - amount);
              const newBalance = data.paymentToBeCollected - newCollected;
              const currentItems = data.items || [];
              const currentDateString =
                typeof date === "string" ? date : formatDateToYYYYMMDD(date);
              const updatedItems = currentItems.filter(
                (item) =>
                  !(item.date === currentDateString && item.amount === amount)
              );
              await updateDoc(docRef, {
                paymentCollectedTillNow: newCollected,
                balance: newBalance,
                items: updatedItems,
                updatedAt: new Date(),
              });
            }
          }
        }
        for (const balanceItem of previousBalanceData) {
          const { date: balanceDate, amount, paymentMethod } = balanceItem;
          const docId = `${branchName}_${balanceDate.replace(/-/g, "")}`;
          const docRef = doc(db, "paymentToBeCollected", docId);
          const docSnapshot = await getDoc(docRef);
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const currentCollected = data.paymentCollectedTillNow || 0;
            const newCollected = currentCollected + amount;
            const newBalance = Math.max(
              0,
              data.paymentToBeCollected - newCollected
            );
            const currentItems = data.items || [];
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
            await updateDoc(docRef, {
              paymentCollectedTillNow: newCollected,
              balance: newBalance,
              items: updatedItems,
              updatedAt: new Date(),
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
        const formattedDate = selectedDate.replace(/-/g, "");
        const docId = `${branchName}_${formattedDate}`;
        const docRef = doc(db, "paymentToBeCollected", docId);
        const docSnapshot = await getDoc(docRef);
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          return data.balance || 0;
        } else {
          return 0;
        }
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
        const formattedDate = dateString.replace(/-/g, "");
        const stockDocId = `${branchName}_${formattedDate}`;
        const stockDocRef = doc(db, "stockReadings", stockDocId);
        const stockDocSnapshot = await getDoc(stockDocRef);
        if (stockDocSnapshot.exists()) {
          const stockData = stockDocSnapshot.data();
          const totalStockAmount = stockData.totalAmount || 0;
          return totalStockAmount;
        } else {
          return 0;
        }
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
        const printerReadingsQuery = query(
          collection(db, "printerReadings"),
          where("branchName", "==", branchName),
          where("date", "==", dateString)
        );
        const snapshot = await getDocs(printerReadingsQuery);
        if (!snapshot.empty) {
          const printerData = snapshot.docs[0].data();
          const printerTotals = {};
          if (printerData.readings) {
            Object.entries(printerData.readings).forEach(
              ([printerId, sizes]) => {
                let printerTotal = 0;
                Object.values(sizes).forEach((sizeData) => {
                  printerTotal += Number(sizeData.total || 0);
                });
                printerTotals[printerId] = printerTotal;
              }
            );
          }
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
        const jumboQuery = query(
          collection(db, "jumboXeroxReadings"),
          where("branchName", "==", branchName),
          where("date", "==", dateString)
        );
        const snapshot = await getDocs(jumboQuery);
        if (!snapshot.empty) {
          const jumboData = snapshot.docs[0].data();
          return jumboData.totalAmount || 0;
        }
        return 0;
      } catch (error) {
        console.error("Error fetching jumbo xerox data:", error);
        return 0;
      }
    },
    [branchName]
  );

  useEffect(() => {
    if (!date || !branchName || !userId) return;
    const loadDataForDate = async () => {
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
          const totalSnapshot = await getDocs(
            query(
              collection(db, "totalAmountReadings"),
              where("branchName", "==", branchName),
              where("date", "==", dateString)
            )
          );
          if (!totalSnapshot.empty) {
            setHasExistingTotalData(true);
            setIsEditingTotal(false);
            setTotalDocId(totalSnapshot.docs[0].id);
            const docData = totalSnapshot.docs[0].data();
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
            onFinalSubmitChange(totalSubmitted);
          } else {
            setHasExistingTotalData(false);
            setIsEditingTotal(true);
            setTotalAmountRows(updatedDynamicRows);
            setPreviousBalanceRows([]);
            onFinalSubmitChange(false);
          }
        } catch (error) {
          console.error("Error loading snapshots:", error);
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
    };
    loadDataForDate();
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
    const upiCardRow = totalAmountRows.find(
      (row) => row.key === "upiCardPayments"
    );
    const cashInHandRow = totalAmountRows.find(
      (row) => row.key === "cashInHand"
    );
    if (!upiCardRow || !upiCardRow.amount || Number(upiCardRow.amount) <= 0) {
      showError(
        "Please enter UPI & CARD PAYMENTS amount before adding previous balance"
      );
      return;
    }
    if (
      !cashInHandRow ||
      !cashInHandRow.amount ||
      Number(cashInHandRow.amount) <= 0
    ) {
      showError(
        "Please enter CASH IN HAND amount before adding previous balance"
      );
      return;
    }
    try {
      const q = query(
        collection(db, "paymentToBeCollected"),
        where("branchName", "==", branchName),
        where("balance", ">", 0)
      );
      const snapshot = await getDocs(q);
      const unpaidBalances = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPreviousBalances(unpaidBalances);
      setPreviousBalanceRows((prev) => [
        ...prev,
        {
          date: "",
          amount: "",
          paymentMethod: "cash",
          availableBalance: 0,
          id: Date.now(),
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
    totalAmountRows,
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
      showError("Please select a date first");
      return;
    }
    if (!validateTotalAmountReadings()) {
      showError("Please fix the highlighted errors before submitting");
      return;
    }
    const dateString =
      typeof date === "string" ? date : formatDateToYYYYMMDD(date);
    try {
      const printerQueryRef = query(
        collection(db, "printerReadings"),
        where("branchName", "==", branchName),
        where("date", "==", dateString)
      );
      const jumboQueryRef = query(
        collection(db, "jumboXeroxReadings"),
        where("branchName", "==", branchName),
        where("date", "==", dateString)
      );
      const stockDocId = `${branchName}_${dateString.replace(/-/g, "")}`;
      const stockDocRef = doc(db, "stockReadings", stockDocId);
      const [printerSnapshot, jumboSnapshot, stockSnapshot] = await Promise.all(
        [getDocs(printerQueryRef), getDocs(jumboQueryRef), getDoc(stockDocRef)]
      );
      if (
        printerSnapshot.empty ||
        jumboSnapshot.empty ||
        !stockSnapshot.exists()
      ) {
        const missingData = [];
        if (printerSnapshot.empty) missingData.push("Printer Readings");
        if (jumboSnapshot.empty) missingData.push("Jumbo Xerox Readings");
        if (!stockSnapshot.exists()) missingData.push("Stock Readings");
        showWarning(
          `Please enter ${missingData.join(
            " and "
          )} before submitting Total Amount`
        );
        return;
      }
      setIsLoading(true);
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
        rows: rowsForStorage,
        previousBalanceRows: previousBalanceForStorage,
        totalAmount,
        lastUpdated: new Date(),
      };
      if (hasExistingTotalData && totalDocId) {
        const docRef = doc(db, "totalAmountReadings", totalDocId);
        await updateDoc(docRef, dataToSave);
        showSuccess("Total amount readings updated successfully");
      } else {
        await addDoc(collection(db, "totalAmountReadings"), {
          userId,
          branchName,
          date: dateString,
          timestamp: new Date(),
          ...dataToSave,
        });
        setHasExistingTotalData(true);
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
        showError("Failed to store payment to be collected data");
        setIsLoading(false);
        return;
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
      showError(`Failed to save total amount readings: ${error.message}`);
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

  useEffect(() => {
    if (!date || !branchName) return;
    const dateString =
      typeof date === "string" ? date : formatDateToYYYYMMDD(date);
    const printerQuery = query(
      collection(db, "printerReadings"),
      where("branchName", "==", branchName),
      where("date", "==", dateString)
    );
    const jumboQuery = query(
      collection(db, "jumboXeroxReadings"),
      where("branchName", "==", branchName),
      where("date", "==", dateString)
    );
    const stockQuery = query(
      collection(db, "stockReadings"),
      where("branchName", "==", branchName),
      where("date", "==", dateString)
    );
    if (isFinalSubmitted) return;
    const unsubscribePrinter = onSnapshot(printerQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const printerTotals = await fetchPrinterReadingsData(dateString);
        setTotalAmountRows((prevRows) =>
          prevRows.map((row) => {
            if (
              row.type === "printer" &&
              printerTotals &&
              printerTotals[row.printerId]
            ) {
              return { ...row, amount: printerTotals[row.printerId] };
            }
            return row;
          })
        );
      }
    });
    const unsubscribeJumbo = onSnapshot(jumboQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const jumboTotal = await fetchJumboXeroxData(dateString);
        setTotalAmountRows((prevRows) =>
          prevRows.map((row) => {
            if (row.key === "jumboXerox") {
              return { ...row, amount: jumboTotal };
            }
            return row;
          })
        );
      }
    });
    const unsubscribeStock = onSnapshot(stockQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const stockTotal = await fetchStockData(dateString);
        setTotalAmountRows((prevRows) =>
          prevRows.map((row) => {
            if (row.key === "items") {
              return { ...row, amount: stockTotal };
            }
            return row;
          })
        );
      }
    });
    return () => {
      unsubscribePrinter();
      unsubscribeJumbo();
      unsubscribeStock();
    };
  }, [
    date,
    branchName,
    fetchPrinterReadingsData,
    fetchJumboXeroxData,
    fetchStockData,
    formatDateToYYYYMMDD,
    isFinalSubmitted,
  ]);

  useEffect(() => {
    if (!date || !branchName || !userId) return;
    const dateString =
      typeof date === "string" ? date : formatDateToYYYYMMDD(date);
    const stockDocId = `${branchName}_${dateString.replace(/-/g, "")}`;
    const stockDocRef = doc(db, "stockReadings", stockDocId);
    const printerQ = query(
      collection(db, "printerReadings"),
      where("branchName", "==", branchName),
      where("date", "==", dateString)
    );
    let printerUnsub = null;
    let stockUnsub = null;
    let debounceTimer = null;
    const scheduleAutoSave = () => {
      if (
        !hasExistingTotalData ||
        !totalDocId ||
        isEditingTotal ||
        isFinalSubmitted ||
        isLoading
      )
        return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
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
            rows: rowsForStorage,
            previousBalanceRows: previousBalanceForStorage,
            totalAmount,
            lastUpdated: new Date(),
          };
          await updateDoc(
            doc(db, "totalAmountReadings", totalDocId),
            dataToSave
          );
        } catch (err) {
          console.error("[v0] Auto-save Total Amount failed:", err);
        }
      }, 800);
    };
    stockUnsub = onSnapshot(stockDocRef, (snap) => {
      if (snap.exists()) {
        scheduleAutoSave();
      }
    });
    getDocs(printerQ).then((qs) => {
      if (!qs.empty) {
        const firstDoc = qs.docs[0];
        const firstRef = doc(db, "printerReadings", firstDoc.id);
        printerUnsub = onSnapshot(firstRef, () => {
          scheduleAutoSave();
        });
      }
    });
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (stockUnsub) stockUnsub();
      if (printerUnsub) printerUnsub();
    };
  }, [
    date,
    branchName,
    userId,
    hasExistingTotalData,
    totalDocId,
    isEditingTotal,
    isFinalSubmitted,
    isLoading,
    totalAmount,
    totalAmountRows,
    previousBalanceRows,
    formatDateToYYYYMMDD,
  ]);

  if (!dataLoaded) {
    return (
      <div className="stock-select-date-message">
        <div className="printer-loading-spinner"></div>
        <p>Loading total amount data...</p>
      </div>
    );
  }

  return (
    <div className="total-amount-card">
      <Popup {...popup} />
      <div
        className="total-amount-header clickable-header"
        onClick={handleToggleExpand}
        style={{ cursor: "pointer" }}
      >
        <div className="total-amount-title">
          <h3>
            Total Amount Readings
            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
          </h3>
          {isFinalSubmitted && (
            <div className="total-existing-data-warning">
              <FaLock /> Data Locked
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="total-amount-content">
            <table className="total-amounts-table">
              <thead>
                <tr>
                  <th className="total-item-col">Items</th>
                  <th className="total-amount-col">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {totalAmountRows.map((row, index) => {
                  const hasError = totalValidationErrors[row.key];
                  let displayValue = row.amount;
                  let previousBalanceCash = 0;
                  let previousBalanceUPI = 0;
                  if (row.key === "cashInHand") {
                    previousBalanceCash = previousBalanceRows
                      .filter((r) => r.paymentMethod === "cash")
                      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                    displayValue =
                      (Number(row.amount) || 0) + previousBalanceCash;
                  } else if (row.key === "upiCardPayments") {
                    previousBalanceUPI = previousBalanceRows
                      .filter((r) => r.paymentMethod === "upi")
                      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                    displayValue =
                      (Number(row.amount) || 0) - previousBalanceUPI;
                  }
                  return (
                    <tr key={index}>
                      <td className="total-item-name">{row.itemName}</td>
                      <td className="total-parent-container">
                        {row.type === "calculated" ? (
                          <div className="total-calculated-amount">
                            {formatCurrency(row.amount)}
                          </div>
                        ) : row.type === "printer" ||
                          row.type === "static" ||
                          row.type === "stock" ? (
                          <div className="total-auto-loaded-amount">
                            {isLoadingStock && row.key === "items" ? (
                              <span>Loading...</span>
                            ) : row.amount === "" || row.amount === 0 ? (
                              "No data"
                            ) : (
                              formatCurrency(row.amount)
                            )}
                          </div>
                        ) : row.key === "cashInHand" ||
                          row.key === "upiCardPayments" ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <input
                              type="number"
                              value={row.amount}
                              onChange={(e) =>
                                handleTotalAmountInputChange(
                                  row.key,
                                  e.target.value
                                )
                              }
                              className={`total-amount-input ${
                                hasError ? "validation-error" : ""
                              }`}
                              disabled={
                                isLoading ||
                                (hasExistingTotalData && !isEditingTotal) ||
                                isFinalSubmitted
                              }
                              min="0"
                              placeholder={
                                row.key === "cashInHand"
                                  ? "Enter base cash amount"
                                  : "Enter base UPI amount"
                              }
                            />
                            {(previousBalanceCash > 0 ||
                              previousBalanceUPI > 0) && (
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: "600",
                                  padding: "6px 8px",
                                  borderRadius: "4px",
                                  backgroundColor:
                                    row.key === "cashInHand"
                                      ? "#f0fdf4"
                                      : "#eff6ff",
                                  border:
                                    row.key === "cashInHand"
                                      ? "1px solid #bbf7d0"
                                      : "1px solid #93c5fd",
                                }}
                              >
                                {row.key === "cashInHand" ? (
                                  <>
                                    <div style={{ color: "#16a34a" }}>
                                      Final Cash Total:{" "}
                                      {formatCurrency(displayValue)}
                                    </div>
                                    {previousBalanceCash > 0 && (
                                      <div
                                        style={{
                                          fontSize: "11px",
                                          color: "#15803d",
                                          marginTop: "2px",
                                        }}
                                      >
                                        Base:{" "}
                                        {formatCurrency(
                                          Number(row.amount) || 0
                                        )}{" "}
                                        + Previous Cash:{" "}
                                        {formatCurrency(previousBalanceCash)}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <div style={{ color: "#1e40af" }}>
                                      Net UPI Amount:{" "}
                                      {formatCurrency(displayValue)}
                                    </div>
                                    {previousBalanceUPI > 0 && (
                                      <div
                                        style={{
                                          fontSize: "11px",
                                          color: "#dc2626",
                                          marginTop: "2px",
                                        }}
                                      >
                                        Base:{" "}
                                        {formatCurrency(
                                          Number(row.amount) || 0
                                        )}{" "}
                                        - Previous UPI:{" "}
                                        {formatCurrency(previousBalanceUPI)}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                            {hasError && (
                              <div className="validation-error-text">
                                {totalValidationErrors[row.key]}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <input
                              type="number"
                              value={row.amount}
                              onChange={(e) =>
                                handleTotalAmountInputChange(
                                  row.key,
                                  e.target.value
                                )
                              }
                              className={`total-amount-input ${
                                hasError ? "validation-error" : ""
                              }`}
                              disabled={
                                isLoading ||
                                (hasExistingTotalData && !isEditingTotal) ||
                                isFinalSubmitted
                              }
                              min="0"
                              placeholder="Enter amount"
                            />
                            {hasError && (
                              <div className="validation-error-text">
                                {totalValidationErrors[row.key]}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {previousBalances.length > 0 && (
                  <tr>
                    <td colSpan="2" style={{ padding: 0 }}>
                      <table className="mini-balance-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previousBalances.map((bal) => {
                            const dt = new Date(bal.date);
                            const formatted = dt.toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "long",
                            });
                            return (
                              <tr key={bal.id}>
                                <td>{formatted}</td>
                                <td>{formatCurrency(bal.balance)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
                {previousBalanceRows.map((row, index) => {
                  const dateError =
                    totalValidationErrors[`previous-${index}-date`];
                  const amountError =
                    totalValidationErrors[`previous-${index}-amount`];
                  return (
                    <tr key={row.id}>
                      <td className="total-item-name">
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                          }}
                        >
                          <span style={{ fontWeight: "600" }}>
                            Previous Balance
                          </span>
                          <div
                            style={{
                              display: "flex",
                              gap: "1rem",
                              alignItems: "center",
                            }}
                          >
                            <label style={{ fontSize: "0.875rem" }}>
                              <input
                                type="radio"
                                value="cash"
                                checked={row.paymentMethod === "cash"}
                                onChange={(e) =>
                                  handlePreviousBalanceInputChange(
                                    index,
                                    "paymentMethod",
                                    e.target.value
                                  )
                                }
                                disabled={
                                  isLoading ||
                                  (hasExistingTotalData && !isEditingTotal) ||
                                  isFinalSubmitted
                                }
                                style={{ marginRight: "0.25rem" }}
                              />
                              Cash
                            </label>
                            <label style={{ fontSize: "0.875rem" }}>
                              <input
                                type="radio"
                                value="upi"
                                checked={row.paymentMethod === "upi"}
                                onChange={(e) =>
                                  handlePreviousBalanceInputChange(
                                    index,
                                    "paymentMethod",
                                    e.target.value
                                  )
                                }
                                disabled={
                                  isLoading ||
                                  (hasExistingTotalData && !isEditingTotal) ||
                                  isFinalSubmitted
                                }
                                style={{ marginRight: "0.25rem" }}
                              />
                              UPI
                            </label>
                          </div>
                          <DatePicker
                            selected={row.date ? new Date(row.date) : null}
                            onChange={(selectedDate) =>
                              handlePreviousBalanceInputChange(
                                index,
                                "date",
                                selectedDate
                                  ? formatDateToYYYYMMDD(selectedDate)
                                  : ""
                              )
                            }
                            dateFormat="yyyy-MM-dd"
                            maxDate={new Date()}
                            disabled={
                              isLoading ||
                              (hasExistingTotalData && !isEditingTotal) ||
                              isFinalSubmitted
                            }
                            className={`total-amount-input ${
                              dateError ? "validation-error" : ""
                            }`}
                            placeholderText="Select date"
                          />
                          {dateError && (
                            <div className="validation-error-text">
                              {dateError}
                            </div>
                          )}
                          {row.date && (
                            <div
                              style={{
                                fontSize: "0.875rem",
                                color:
                                  row.availableBalance > 0
                                    ? "#155724"
                                    : "#721c24",
                                backgroundColor:
                                  row.availableBalance > 0
                                    ? "#d4edda"
                                    : "#f8d7da",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "0.25rem",
                                border: `1px solid ${
                                  row.availableBalance > 0
                                    ? "#c3e6cb"
                                    : "#f5c6cb"
                                }`,
                              }}
                            >
                              Available: {formatCurrency(row.availableBalance)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="total-parent-container">
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) =>
                            handlePreviousBalanceInputChange(
                              index,
                              "amount",
                              e.target.value
                            )
                          }
                          className={`total-amount-input ${
                            amountError ? "validation-error" : ""
                          }`}
                          disabled={
                            isLoading ||
                            !row.date ||
                            row.availableBalance <= 0 ||
                            (hasExistingTotalData && !isEditingTotal) ||
                            isFinalSubmitted
                          }
                          min="0"
                          max={row.availableBalance}
                          placeholder={
                            row.availableBalance > 0
                              ? `Max: ${row.availableBalance}`
                              : "No balance available"
                          }
                        />
                        {amountError && (
                          <div className="validation-error-text">
                            {amountError}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(!hasExistingTotalData || isEditingTotal) &&
                  !isFinalSubmitted && (
                    <tr>
                      <td
                        colSpan="2"
                        style={{ textAlign: "center", padding: "0.75rem" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "1rem",
                          }}
                        >
                          <button
                            type="button"
                            onClick={handleAddPreviousBalanceRow}
                            style={{
                              backgroundColor: "#1e3a8a",
                              color: "white",
                              border: "none",
                              borderRadius: "0.25rem",
                              padding: "0.5rem 1rem",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                            disabled={isLoading}
                          >
                            Add Previous Balance
                          </button>
                          {previousBalanceRows.length > 0 && (
                            <button
                              type="button"
                              onClick={handleRemovePreviousBalanceRow}
                              style={{
                                backgroundColor: "#dc2626",
                                color: "white",
                                border: "none",
                                borderRadius: "0.25rem",
                                padding: "0.5rem 1rem",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                              disabled={isLoading}
                            >
                              Remove Last
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td className="total-grand-total-label">Grand Total</td>
                  <td className="total-grand-total">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Action Buttons at Bottom */}
          <div className="total-action-buttons-bottom">
            {hasExistingTotalData &&
              !isEditingTotal &&
              (canEditCurrentDate() || canEditPastDate()) &&
              !isFinalSubmitted && (
                <button
                  onClick={handleEditTotal}
                  className="total-edit-button"
                  disabled={isLoading}
                >
                  <FaEdit /> Edit
                </button>
              )}
            {(isEditingTotal || !hasExistingTotalData) && !isFinalSubmitted && (
              <div className="button-group">
                {isEditingTotal && hasExistingTotalData && (
                  <button
                    onClick={handleCancelEdit}
                    className="total-cancel-button"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSubmitTotalAmount}
                  className="total-save-button"
                  disabled={isLoading}
                >
                  <FaSave />{" "}
                  {isEditingTotal && hasExistingTotalData
                    ? "Update"
                    : "Save Readings"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TotalAmountSection;
