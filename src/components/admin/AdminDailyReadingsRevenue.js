import { useState, useEffect, useCallback, useMemo } from "react";
import { db, auth } from "../../services/authservice";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaCalendarAlt,
  FaExclamationTriangle,
  FaDownload,
  FaCheckCircle,
} from "react-icons/fa";
import "../../styles/printerreadings.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import jsPDF from "jspdf";
import "jspdf-autotable";
import React from "react";

const AdminDailyReadingsRevenue = () => {
  const [date, setDate] = useState("");
  const [approvedDates, setApprovedDates] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [branches, setBranches] = useState([]);
  const [branchConfigurations, setBranchConfigurations] = useState({});
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [printers, setPrinters] = useState([]);
  const [printerReadings, setPrinterReadings] = useState({});
  const [previousDateMap, setPreviousDateMap] = useState({});
  const [hasExistingPrinterData, setHasExistingPrinterData] = useState(false);

  const [jumboXeroxConfig, setJumboXeroxConfig] = useState([]);
  const [jumboRows, setJumboRows] = useState([]);
  const [customJumboRows, setCustomJumboRows] = useState([]);
  const [jumboCounter, setJumboCounter] = useState({
    start: "",
    end: "",
    sftPrinted: "",
  });
  const [hasExistingJumboData, setHasExistingJumboData] = useState(false);

  const [totalAmountRows, setTotalAmountRows] = useState([]);
  const [previousBalanceRows, setPreviousBalanceRows] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [hasExistingTotalData, setHasExistingTotalData] = useState(false);

  const [stockAmount, setStockAmount] = useState(0);
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  const [dataLoaded, setDataLoaded] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  const formatDateToYYYYMMDD = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const initialJumboRows = useMemo(() => {
    if (jumboXeroxConfig.length === 0) return [];

    const groupedData = jumboXeroxConfig.reduce((acc, config) => {
      if (!acc[config.type]) {
        acc[config.type] = [];
      }
      acc[config.type].push({
        type: config.type,
        size: config.size,
        unitPrice: config.unitPrice,
        qty: "",
        amount: "",
      });
      return acc;
    }, {});

    const typeOrder = ["COLOUR", "B/W", "SCAN"];
    const sortedRows = [];

    typeOrder.forEach((type) => {
      if (groupedData[type]) {
        groupedData[type].sort((a, b) => a.size.localeCompare(b.size));
        sortedRows.push(...groupedData[type]);
      }
    });

    Object.keys(groupedData).forEach((type) => {
      if (!typeOrder.includes(type)) {
        groupedData[type].sort((a, b) => a.size.localeCompare(b.size));
        sortedRows.push(...groupedData[type]);
      }
    });

    return sortedRows;
  }, [jumboXeroxConfig]);

  const handleBranchChange = (e) => {
    const selectedBranch = e.target.value;
    setBranchName(selectedBranch);
    
    if (selectedBranch) {
      const config = branchConfigurations[selectedBranch] || {};
      const issues = [];
      
      if (!config.hasManager) {
        issues.push("No manager assigned");
      }
      if (!config.hasPrinters) {
        issues.push("No printers configured");
      }
      
      if (issues.length > 0) {
        toast.warning(
          `Warning: ${selectedBranch} has configuration issues: ${issues.join(", ")}. ` +
          "Daily readings may not be available.",
          {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
      }
    }
  };

  const generateDynamicRows = useCallback((printerList) => {
    const dynamicRows = [];

    printerList.forEach((printer) => {
      const printerName = printer.printerName || `PRINTER ${printer.printerId}`;
      dynamicRows.push({
        itemName: `TOTAL ${printerName.toUpperCase()}`,
        amount: 0,
        key: `printer_${printer.printerId}`,
        type: "printer",
        printerId: printer.printerId,
      });
    });

    const staticRows = [
      { itemName: "JUMBO XEROX", amount: 0, key: "jumboXerox", type: "static" },
      { itemName: "ITEMS", amount: 0, key: "items", type: "stock" },
      {
        itemName: "DIGITAL BUSINESS",
        amount: 0,
        key: "digitalBusiness",
        type: "manual",
      },
      {
        itemName: "GIFT BUSINESS",
        amount: 0,
        key: "giftBusiness",
        type: "manual",
      },
      {
        itemName: "TOTAL BUSINESS",
        amount: 0,
        key: "totalBusiness",
        type: "calculated",
      },
      { itemName: "DISCOUNT", amount: 0, key: "discount", type: "manual" },
      {
        itemName: "UPI & CARD PAYMENTS",
        amount: 0,
        key: "upiCardPayments",
        type: "manual",
      },
      {
        itemName: "BANK TRANSFERS",
        amount: 0,
        key: "bankTransfers",
        type: "manual",
      },
      {
        itemName: "CASH AS PER ACCOUNTS",
        amount: 0,
        key: "cashAsPerAccounts",
        type: "calculated",
      },
      {
        itemName: "CASH IN HAND",
        amount: 0,
        key: "cashInHand",
        type: "manual",
      },
      {
        itemName: "PAYMENT TO BE COLLECTED",
        amount: 0,
        key: "paymentToBeCollected",
        type: "manual",
      },
    ];

    return [...dynamicRows, ...staticRows];
  }, []);

  const groupJumboDataByType = useCallback((jumboData) => {
    const grouped = {};
    jumboData.forEach((row) => {
      if (!grouped[row.type]) {
        grouped[row.type] = [];
      }
      grouped[row.type].push(row);
    });
    return grouped;
  }, []);

  const calculateJumboTotals = useCallback(
    (currentJumboRows, currentCustomRows = []) => {
      const standardTotals = currentJumboRows.reduce(
        (acc, row) => {
          acc.qty += Number(row.qty) || 0;
          acc.amount += Number(row.amount) || 0;
          return acc;
        },
        { qty: 0, amount: 0 }
      );

      const customTotals = currentCustomRows.reduce(
        (acc, row) => {
          acc.qty += Number(row.qty) || 0;
          acc.amount += Number(row.amount) || 0;
          return acc;
        },
        { qty: 0, amount: 0 }
      );

      return {
        qty: standardTotals.qty + customTotals.qty,
        amount: standardTotals.amount + customTotals.amount,
      };
    },
    []
  );

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const user = auth.currentUser;
        if (user) {
          setUserId(user.uid);

          // Fetch all branches from the branches collection
          const branchesSnapshot = await getDocs(collection(db, "branches"));
          const allBranches = branchesSnapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
            ...doc.data()
          }));

          // Check configuration for each branch
          const branchConfigData = {};
          
          for (const branch of allBranches) {
            const branchConfig = {
              hasManager: false,
              hasPrinters: false,
              managerEmail: null,
              printerCount: 0
            };

            // Check if branch has a manager
            const managersQuery = query(
              collection(db, "users"),
              where("role", "==", "manager"),
              where("branch", "==", branch.name)
            );
            const managersSnapshot = await getDocs(managersQuery);
            if (!managersSnapshot.empty) {
              branchConfig.hasManager = true;
              branchConfig.managerEmail = managersSnapshot.docs[0].data().email;
            }

            // Check if branch has printers
            const printersQuery = query(
              collection(db, "printers"),
              where("branchName", "==", branch.name)
            );
            const printersSnapshot = await getDocs(printersQuery);
            branchConfig.hasPrinters = !printersSnapshot.empty;
            branchConfig.printerCount = printersSnapshot.size;

            branchConfigData[branch.name] = branchConfig;
          }

          setBranchConfigurations(branchConfigData);

          const sortedBranches = allBranches
            .map(branch => branch.name)
            .sort((a, b) => {
              const nameA = a.trim().toLowerCase();
              const nameB = b.trim().toLowerCase();
              if (nameA < nameB) return -1;
              if (nameA > nameB) return 1;
              return 0;
            });

          setBranches(sortedBranches);
        } else {
          setError("User not authenticated");
          toast.error("User not authenticated");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to fetch user data");
        toast.error("Failed to fetch user data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    if (!branchName) return;

    const jumboXeroxQuery = query(
      collection(db, "JumboXerox"),
      where("branch", "==", branchName)
    );

    const unsubscribeConfig = onSnapshot(
      jumboXeroxQuery,
      (querySnapshot) => {
        try {
          const configData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setJumboXeroxConfig(configData);
          setConfigLoaded(true);
        } catch (error) {
          console.error("Error loading JumboXerox config:", error);
          toast.error("Failed to load JumboXerox configuration");
          setConfigLoaded(true);
        }
      },
      (error) => {
        console.error("Error in JumboXerox config snapshot:", error);
        toast.error("Failed to load JumboXerox configuration");
        setConfigLoaded(true);
      }
    );

    return () => unsubscribeConfig();
  }, [branchName]);

  const fetchStockData = useCallback(
    async (dateString) => {
      if (!branchName || !dateString) return 0;

      setIsLoadingStock(true);
      try {
        const formattedDate = dateString.replace(/-/g, "");
        const stockDocId = `${branchName}_${formattedDate}`;
        const stockDocRef = doc(db, "stockReadings", stockDocId);
        const stockDocSnapshot = await getDoc(stockDocRef);

        if (stockDocSnapshot.exists()) {
          const stockData = stockDocSnapshot.data();
          const totalStockAmount = stockData.totalAmount || 0;
          setStockAmount(totalStockAmount);
          return totalStockAmount;
        } else {
          setStockAmount(0);
          return 0;
        }
      } catch (error) {
        console.error("Error fetching stock data:", error);
        setStockAmount(0);
        return 0;
      } finally {
        setIsLoadingStock(false);
      }
    },
    [branchName]
  );

  useEffect(() => {
    if (!date || !branchName || !configLoaded) return;

    const loadDataForDate = async () => {
      try {
        setDataLoaded(false);
        setIsLoading(true);

        setPrinterReadings({});
        setJumboRows(initialJumboRows);
        setCustomJumboRows([]);
        setJumboCounter({ start: "", end: "", sftPrinted: "" });
        setTotalAmountRows([]);
        setPreviousBalanceRows([]);
        setHasExistingPrinterData(false);
        setHasExistingJumboData(false);
        setHasExistingTotalData(false);
        setPreviousDateMap({});

        const dateString =
          typeof date === "string" ? date : formatDateToYYYYMMDD(date);

        const stockTotal = await fetchStockData(dateString);

        const activePrintersQuery = query(
          collection(db, "printers"),
          where("branchName", "==", branchName),
          where("isActive", "==", true)
        );
        const activePrintersSnapshot = await getDocs(activePrintersQuery);
        const activePrinters = activePrintersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const readingsQuery = query(
          collection(db, "printerReadings"),
          where("branchName", "==", branchName),
          where("date", "==", dateString)
        );
        const readingsSnapshot = await getDocs(readingsQuery);
        const inactivePrintersWithData = [];

        if (!readingsSnapshot.empty) {
          const printerIdsWithReadings = new Set();
          readingsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.readings && typeof data.readings === "object") {
              Object.keys(data.readings).forEach((printerId) => {
                printerIdsWithReadings.add(printerId);
              });
            }
          });

          for (const printerId of printerIdsWithReadings) {
            const isAlreadyActive = activePrinters.some(
              (p) => p.printerId === printerId
            );
            if (!isAlreadyActive) {
              const inactivePrinterQuery = query(
                collection(db, "printers"),
                where("printerId", "==", printerId),
                where("branchName", "==", branchName),
                where("isActive", "==", false)
              );
              const inactivePrinterSnapshot = await getDocs(
                inactivePrinterQuery
              );
              if (!inactivePrinterSnapshot.empty) {
                const inactivePrinter = {
                  id: inactivePrinterSnapshot.docs[0].id,
                  ...inactivePrinterSnapshot.docs[0].data(),
                  isInactiveWithData: true,
                };
                inactivePrintersWithData.push(inactivePrinter);
              }
            }
          }
        }

        const allRelevantPrinters = [
          ...activePrinters,
          ...inactivePrintersWithData,
        ];
        setPrinters(allRelevantPrinters);

        const [printerSnapshot, jumboSnapshot, totalSnapshot] =
          await Promise.all([
            getDocs(
              query(
                collection(db, "printerReadings"),
                where("branchName", "==", branchName),
                where("date", "==", dateString)
              )
            ),
            getDocs(
              query(
                collection(db, "jumboXeroxReadings"),
                where("branchName", "==", branchName),
                where("date", "==", dateString)
              )
            ),
            getDocs(
              query(
                collection(db, "totalAmountReadings"),
                where("branchName", "==", branchName),
                where("date", "==", dateString)
              )
            ),
          ]);

        if (!printerSnapshot.empty) {
          setHasExistingPrinterData(true);
          const docData = printerSnapshot.docs[0].data();
          if (docData.readings) {
            setPrinterReadings(docData.readings);
          }
        }

        if (!jumboSnapshot.empty) {
          setHasExistingJumboData(true);
          const docData = jumboSnapshot.docs[0].data();
          if (docData.rows) {
            const savedRows = docData.rows
              .filter((row) => !row.isCustom)
              .map((row) => ({
                ...row,
                qty: row.qty === 0 ? "" : row.qty,
                amount: row.amount === 0 ? "" : row.amount,
                unitPrice:
                  row.unitPrice || row.unitPrice === 0
                    ? row.unitPrice
                    : row.unitPrice,
              }));
            setJumboRows(savedRows);

            const savedCustomRows = docData.rows
              .filter((row) => row.isCustom)
              .map((row) => ({
                ...row,
                qty: row.qty === 0 ? "" : row.qty,
                amount: row.amount === 0 ? "" : row.amount,
                unitPrice: row.unitPrice === 0 ? "" : row.unitPrice,
                size: row.size || "",
              }));
            setCustomJumboRows(savedCustomRows);
          }
          if (docData.jumboCounter) {
            setJumboCounter({
              start:
                docData.jumboCounter.start === 0
                  ? ""
                  : docData.jumboCounter.start || "",
              end:
                docData.jumboCounter.end === 0
                  ? ""
                  : docData.jumboCounter.end || "",
              sftPrinted: docData.jumboCounter.sftPrinted || "",
            });
          }
        }

        const dynamicRows = generateDynamicRows(allRelevantPrinters);

        const updatedDynamicRows = dynamicRows.map((row) => {
          if (row.key === "items") {
            return { ...row, amount: stockTotal };
          }
          return row;
        });

        if (!totalSnapshot.empty) {
          setHasExistingTotalData(true);
          const docData = totalSnapshot.docs[0].data();
          if (docData.rows) {
            const updatedRows = updatedDynamicRows.map((row) => {
              const savedRow = docData.rows.find((r) => r.key === row.key);
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
              })
            );
            setPreviousBalanceRows(savedPreviousRows);
          } else {
            setPreviousBalanceRows([]);
          }
        } else {
          setTotalAmountRows(updatedDynamicRows);
          setPreviousBalanceRows([]);
        }

        setDataLoaded(true);
      } catch (error) {
        console.error("Error loading data for date:", error);
        toast.error("Failed to load data for selected date");
      } finally {
        setIsLoading(false);
      }
    };

    loadDataForDate();
  }, [
    date,
    branchName,
    configLoaded,
    initialJumboRows,
    generateDynamicRows,
    formatDateToYYYYMMDD,
    fetchStockData,
  ]);

  const handleDateChange = useCallback(
    (selectedDate) => {
      if (!selectedDate || isNaN(selectedDate.getTime())) {
        console.error("Invalid date object:", selectedDate);
        alert("Please select a valid date.");
        return;
      }

      const formattedDate = formatDateToYYYYMMDD(selectedDate);
      setDate(formattedDate);
    },
    [formatDateToYYYYMMDD]
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const loadImageAsBase64 = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = url;
    });

  const generatePDF = async () => {
    if (!date || !branchName) {
      toast.warning("Please select a branch and date first");
      return;
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      let yPos = 8;

      pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");

      try {
        const logoBase64 = await loadImageAsBase64("/logo192.png");
        pdf.addImage(logoBase64, "PNG", 10, yPos, 20, 15);
      } catch (error) {
        pdf.rect(10, yPos, 20, 15);
        pdf.setFontSize(6);
        pdf.text("PRINTZ", 20, yPos + 9, { align: "center" });
      }

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(branchName.toUpperCase() + " BRANCH", pageWidth / 2, yPos + 6, {
        align: "center",
      });

      pdf.setFontSize(10);
      pdf.text("Printz Shop", pageWidth - 30, yPos + 4, { align: "center" });
      pdf.setFontSize(6);
      pdf.text(
        "One Stop Shop For All Your Printing Needs",
        pageWidth - 30,
        yPos + 8,
        { align: "center" }
      );

      pdf.setFontSize(8);
      pdf.text("DATE", pageWidth - 40, yPos + 13);
      const displayDate =
        typeof date === "string"
          ? new Date(date).toLocaleDateString("en-GB")
          : date.toLocaleDateString("en-GB");
      pdf.text(displayDate, pageWidth - 25, yPos + 13);

      yPos += 18;

      Object.entries(printerReadings).forEach(
        ([printerId, sizes], printerIndex) => {
          const printer = printers.find((p) => p.printerId === printerId);
          const printerName = printer?.printerName || `PRINTER ${printerId}`;
          const sizeKeys = Object.keys(sizes);
          const numSizeColumns = Math.min(sizeKeys.length, 4);

          const printerTotal = Object.values(sizes).reduce((sum, sizeData) => {
            return sum + (Number(sizeData.total) || 0);
          }, 0);

          if (yPos > pageHeight - 40) {
            pdf.addPage();
            pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
            yPos = 15;
          }

          pdf.setFillColor(220, 220, 220);
          pdf.rect(10, yPos, pageWidth - 20, 5, "F");
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "bold");
          pdf.text(printerName.toUpperCase(), 12, yPos + 3.5);
          pdf.text(`TOTAL: Rs.${printerTotal}`, pageWidth - 35, yPos + 3.5);

          yPos += 5;

          pdf.setFillColor(240, 240, 240);
          pdf.rect(10, yPos, 35, 5, "F");
          pdf.rect(45, yPos, pageWidth - 85, 5, "F");
          pdf.rect(pageWidth - 40, yPos, 30, 5, "F");

          pdf.setFontSize(6);
          pdf.text("DETAILS", 12, yPos + 3.5);
          pdf.text("TOTAL", pageWidth - 25, yPos + 3.5, { align: "center" });

          const sizeColumnWidth = (pageWidth - 85) / numSizeColumns;
          for (let i = 0; i < numSizeColumns; i++) {
            const size = sizeKeys[i];
            const xPos = 45 + i * sizeColumnWidth;
            pdf.text(size, xPos + 2, yPos + 3.5);
            if (i < numSizeColumns - 1) {
              pdf.line(
                xPos + sizeColumnWidth,
                yPos,
                xPos + sizeColumnWidth,
                yPos + 20
              );
            }
          }

          yPos += 5;

          const rowData = [
            { label: "FINAL READING", key: "FINAL READING", showTotal: false },
            { label: "STARTING", key: "STARTING", showTotal: false },
            {
              label: "NO OF COPIES",
              key: "noOfCopies",
              format: (value, sizeData) =>
                `${value} × Rs.${sizeData.price || 0}`,
              showTotal: false,
            },
            {
              label: `TOTAL ${printerId}`,
              key: "total",
              format: (value) => `Rs.${value}`,
              showTotal: true,
            },
          ];

          rowData.forEach((row) => {
            pdf.rect(10, yPos, 35, 5);
            pdf.rect(45, yPos, pageWidth - 85, 5);
            pdf.rect(pageWidth - 40, yPos, 30, 5);

            pdf.setFont(
              "helvetica",
              row.label.includes("TOTAL") ? "bold" : "normal"
            );
            pdf.setFontSize(6);
            pdf.text(row.label, 12, yPos + 3.5);

            for (let i = 0; i < numSizeColumns; i++) {
              const size = sizeKeys[i];
              const xPos = 45 + i * sizeColumnWidth;
              const value = sizes[size][row.key] || "";
              const displayValue = row.format
                ? row.format(value, sizes[size])
                : String(value);
              pdf.text(displayValue, xPos + 2, yPos + 3.5);
            }

            if (row.showTotal) {
              pdf.text(`Rs.${printerTotal}`, pageWidth - 25, yPos + 3.5, {
                align: "center",
              });
            }

            yPos += 5;
          });

          yPos += 6;
        }
      );

      yPos += 3;

      const leftColWidth = (pageWidth - 25) / 2;
      const rightColWidth = (pageWidth - 25) / 2;
      const leftColX = 10;
      const rightColX = leftColX + leftColWidth + 5;

      if (yPos > pageHeight - 80) {
        pdf.addPage();
        pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
        yPos = 15;
      }

      let leftYPos = yPos;
      pdf.setFillColor(220, 220, 220);
      pdf.rect(leftColX, leftYPos, leftColWidth, 5, "F");
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("AMOUNT SUMMARY", leftColX + 2, leftYPos + 3.5);
      leftYPos += 5;

      const summaryItems = totalAmountRows.filter((row) =>
        [
          "printer_",
          "jumboXerox",
          "items",
          "digitalBusiness",
          "giftBusiness",
          "totalBusiness",
          "discount",
          "upiCardPayments",
          "bankTransfers",
          "cashAsPerAccounts",
          "cashInHand",
          "paymentToBeCollected",
        ].some(
          (key) => row.key.includes(key.replace("_", "")) || row.key === key
        )
      );

      summaryItems.forEach((item, index) => {
        if (index % 2 === 0) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(leftColX, leftYPos, leftColWidth, 4, "F");
        }

        pdf.rect(leftColX, leftYPos, leftColWidth, 4);
        pdf.setFont(
          "helvetica",
          item.key === "totalBusiness" ? "bold" : "normal"
        );
        pdf.setFontSize(6);
        pdf.text(item.itemName.toUpperCase(), leftColX + 2, leftYPos + 3);

        const amountText = `Rs.${item.amount || 0}`;
        const textWidth =
          (pdf.getStringUnitWidth(amountText) * 6) / pdf.internal.scaleFactor;
        pdf.text(
          amountText,
          leftColX + leftColWidth - textWidth - 2,
          leftYPos + 3
        );

        leftYPos += 4;
      });

      previousBalanceRows.forEach((previousRow, index) => {
        if ((summaryItems.length + index) % 2 === 0) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(leftColX, leftYPos, leftColWidth, 4, "F");
        }

        pdf.rect(leftColX, leftYPos, leftColWidth, 4);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);

        const formattedDate = previousRow.date
          ? new Date(previousRow.date).toLocaleDateString("en-GB")
          : "No Date";
        const previousLabel = `PREVIOUS BALANCE (${formattedDate}) - ${previousRow.paymentMethod.toUpperCase()}`;
        pdf.text(previousLabel, leftColX + 2, leftYPos + 3);

        const amountText = `Rs.${previousRow.amount || 0}`;
        const textWidth =
          (pdf.getStringUnitWidth(amountText) * 6) / pdf.internal.scaleFactor;
        pdf.text(
          amountText,
          leftColX + leftColWidth - textWidth - 2,
          leftYPos + 3
        );

        leftYPos += 4;
      });

      pdf.setFillColor(220, 220, 220);
      pdf.rect(leftColX, leftYPos + 2, leftColWidth, 5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text("JUMBO COUNTER", leftColX + 2, leftYPos + 5.5);
      leftYPos += 7;

      const counterData = [
        ["START", jumboCounter.start || ""],
        ["END", jumboCounter.end || ""],
        ["SFT PRINTED", jumboCounter.sftPrinted || ""],
      ];

      counterData.forEach(([label, value]) => {
        pdf.rect(leftColX, leftYPos, leftColWidth / 2, 4);
        pdf.rect(leftColX + leftColWidth / 2, leftYPos, leftColWidth / 2, 4);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);
        pdf.text(label, leftColX + 2, leftYPos + 3);
        pdf.text(String(value), leftColX + leftColWidth / 2 + 2, leftYPos + 3);

        leftYPos += 4;
      });

      let rightYPos = yPos;
      pdf.setFillColor(220, 220, 220);
      pdf.rect(rightColX, rightYPos, rightColWidth, 5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("LARGE FORMAT PRINTING DETAILS", rightColX + 2, rightYPos + 3.5);
      rightYPos += 5;

      pdf.setFillColor(240, 240, 240);
      pdf.rect(rightColX, rightYPos, rightColWidth, 4, "F");
      pdf.setFontSize(6);

      const jumboColWidth = rightColWidth / 4;
      pdf.text("TYPE", rightColX + 1, rightYPos + 3);
      pdf.text("QTY", rightColX + jumboColWidth + 1, rightYPos + 3);
      pdf.text("PRICE", rightColX + jumboColWidth * 2 + 1, rightYPos + 3);
      pdf.text("AMOUNT", rightColX + jumboColWidth * 3 + 1, rightYPos + 3);

      for (let i = 1; i < 4; i++) {
        pdf.line(
          rightColX + jumboColWidth * i,
          rightYPos,
          rightColX + jumboColWidth * i,
          rightYPos + 4
        );
      }

      rightYPos += 4;

      const groupedJumboData = groupJumboDataByType(jumboRows);
      Object.entries(groupedJumboData).forEach(([type, items]) => {
        pdf.setFillColor(200, 200, 200);
        pdf.rect(rightColX, rightYPos, rightColWidth, 4, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6);
        pdf.text(type, rightColX + 1, rightYPos + 3);
        rightYPos += 4;

        items.forEach((item) => {
          pdf.rect(rightColX, rightYPos, rightColWidth, 4);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(5);

          for (let i = 1; i < 4; i++) {
            pdf.line(
              rightColX + jumboColWidth * i,
              rightYPos,
              rightColX + jumboColWidth * i,
              rightYPos + 4
            );
          }

          pdf.text(item.size, rightColX + 1, rightYPos + 3);
          pdf.text(
            String(item.qty || ""),
            rightColX + jumboColWidth + 1,
            rightYPos + 3
          );
          pdf.text(
            `Rs.${item.unitPrice || 0}`,
            rightColX + jumboColWidth * 2 + 1,
            rightYPos + 3
          );
          pdf.text(
            `Rs.${item.amount || 0}`,
            rightColX + jumboColWidth * 3 + 1,
            rightYPos + 3
          );

          rightYPos += 4;
        });
      });

      if (customJumboRows.length > 0) {
        pdf.setFillColor(200, 200, 200);
        pdf.rect(rightColX, rightYPos, rightColWidth, 4, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6);
        pdf.text("CUSTOM", rightColX + 1, rightYPos + 3);
        rightYPos += 4;

        customJumboRows.forEach((item) => {
          pdf.rect(rightColX, rightYPos, rightColWidth, 4);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(5);

          for (let i = 1; i < 4; i++) {
            pdf.line(
              rightColX + jumboColWidth * i,
              rightYPos,
              rightColX + jumboColWidth * i,
              rightYPos + 4
            );
          }

          pdf.text(item.size || "Custom", rightColX + 1, rightYPos + 3);
          pdf.text(
            String(item.qty || ""),
            rightColX + jumboColWidth + 1,
            rightYPos + 3
          );
          pdf.text(
            `Rs.${item.unitPrice || 0}`,
            rightColX + jumboColWidth * 2 + 1,
            rightYPos + 3
          );
          pdf.text(
            `Rs.${item.amount || 0}`,
            rightColX + jumboColWidth * 3 + 1,
            rightYPos + 3
          );

          rightYPos += 4;
        });
      }

      const jumboTotals = calculateJumboTotals(jumboRows, customJumboRows);
      pdf.setFillColor(220, 220, 220);
      pdf.rect(rightColX, rightYPos, rightColWidth, 4, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6);
      pdf.text("TOTAL", rightColX + 1, rightYPos + 3);
      pdf.text(
        `Rs.${jumboTotals.amount || 0}`,
        rightColX + jumboColWidth * 3 + 1,
        rightYPos + 3
      );

      const dateString =
        typeof date === "string" ? date : formatDateToYYYYMMDD(date);
      const formattedDate = dateString.split("-").reverse().join("-");
      pdf.save(`DailyReadings_${branchName}_${formattedDate}.pdf`);

      toast.success("PDF generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF: " + error.message);
    }
  };

  if (isLoading && branches.length === 0) {
    return (
      <div className="printer-loading-container">
        <div className="printer-loading-spinner"></div>
        <p>Loading branches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="printer-error-container">
        <FaExclamationTriangle className="printer-error-icon" />
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="printer-retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  const jumboTotals = calculateJumboTotals(jumboRows, customJumboRows);
  const groupedJumboData = groupJumboDataByType(jumboRows);

  return (
    <div className="printer-main-container">
      <ToastContainer />
      <div className="printer-page-header">
        <h2>Daily Readings Revenue</h2>
        <p>View daily readings revenue data for selected branch and date.</p>
      </div>

      <div className="printer-date-picker-container">
        <div className="printer-date-picker-wrapper">
          <label htmlFor="branch-select">Select Branch</label>
          <select
            id="branch-select"
            value={branchName}
            onChange={handleBranchChange}
            className="printer-branch-select"
          >
            <option value="">Select a branch</option>
            {branches.map((branch) => {
              const config = branchConfigurations[branch] || {};
              const hasIssues = !config.hasManager || !config.hasPrinters;
              let statusText = "";
              
              if (!config.hasManager && !config.hasPrinters) {
                statusText = " (No Manager, No Printers)";
              } else if (!config.hasManager) {
                statusText = " (No Manager)";
              } else if (!config.hasPrinters) {
                statusText = " (No Printers)";
              } else {
                statusText = ` (✓ ${config.printerCount} printer${config.printerCount !== 1 ? 's' : ''})`;
              }

              return (
                <option 
                  key={branch} 
                  value={branch}
                  style={{
                    color: hasIssues ? '#dc2626' : '#059669',
                    fontWeight: hasIssues ? 'bold' : 'normal'
                  }}
                >
                  {branch}{statusText}
                </option>
              );
            })}
          </select>
        </div>

        <div className="printer-date-picker-wrapper">
          <label htmlFor="readings-date">Select Date</label>
          <div className="printer-date-input-wrapper">
            <FaCalendarAlt className="printer-date-icon" />
            <DatePicker
              id="readings-date"
              selected={date ? new Date(date) : null}
              onChange={handleDateChange}
              dateFormat="yyyy-MM-dd"
              required
            />
          </div>
        </div>

        <button
          type="button"
          onClick={generatePDF}
          className="printer-download-button"
          disabled={!date || !dataLoaded || !branchName}
        >
          <FaDownload /> Download PDF
        </button>
      </div>

      {/* Branch Configuration Status */}
      {branchName && (
        <div className="printer-config-status">
          {(() => {
            const config = branchConfigurations[branchName] || {};
            const hasIssues = !config.hasManager || !config.hasPrinters;
            
            if (hasIssues) {
              return (
                <div className="printer-config-warning">
                  <FaExclamationTriangle style={{ color: '#dc2626', marginRight: '8px' }} />
                  <strong>Configuration Issues for {branchName}:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    {!config.hasManager && (
                      <li style={{ color: '#dc2626' }}>No manager assigned to this branch</li>
                    )}
                    {!config.hasPrinters && (
                      <li style={{ color: '#dc2626' }}>No printers configured for this branch</li>
                    )}
                  </ul>
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                    Daily readings may not be available. Please contact IT to configure this branch properly.
                  </p>
                </div>
              );
            } else {
              return (
                <div className="printer-config-success">
                  <FaCheckCircle style={{ color: '#059669', marginRight: '8px' }} />
                  <strong>{branchName} is properly configured:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li style={{ color: '#059669' }}>
                      Manager: {config.managerEmail}
                    </li>
                    <li style={{ color: '#059669' }}>
                      {config.printerCount} printer{config.printerCount !== 1 ? 's' : ''} configured
                    </li>
                  </ul>
                </div>
              );
            }
          })()}
        </div>
      )}

      {date && branchName && dataLoaded ? (
        <div className="printer-sections-container">
          <div className="printer-readings-card">
            <div className="printer-readings-header">
              <div className="printer-readings-title">
                <h3>Printer Readings - {branchName}</h3>
                {hasExistingPrinterData && (
                  <div className="printer-existing-data-warning">
                    <FaCheckCircle /> Data available for this date
                  </div>
                )}
              </div>
            </div>

            <div className="printer-readings-content">
              {printers.map((printer) => {
                const printerTotal = Object.values(
                  printerReadings[printer.printerId] || {}
                ).reduce((sum, sizeData) => {
                  const starting = sizeData.STARTING;
                  const finalReading = sizeData["FINAL READING"];
                  if (
                    starting !== "" &&
                    finalReading !== "" &&
                    !isNaN(starting) &&
                    !isNaN(finalReading)
                  ) {
                    const copies = Math.max(
                      0,
                      Number(finalReading) - Number(starting)
                    );
                    const total = copies * (Number(sizeData.price) || 0);
                    return sum + total;
                  }
                  return sum;
                }, 0);

                return (
                  <div
                    key={printer.id}
                    className={`printer-main-card completed ${
                      printer.isInactiveWithData ? "inactive-printer" : ""
                    }`}
                  >
                    <div className="printer-card-header">
                      <div className="printer-card-title">
                        <h3>
                          {printer.printerName} ({printer.printerId})
                          <span className="printer-completed-badge">
                            <FaCheckCircle /> Revenue Data
                          </span>
                          {printer.isInactiveWithData && (
                            <span className="inactive-printer-badge">
                              <FaExclamationTriangle /> Inactive (Has Data)
                            </span>
                          )}
                        </h3>
                      </div>
                    </div>

                    <div className="printer-card-content">
                      <table className="printer-readings-table">
                        <thead>
                          <tr>
                            <th className="printer-reading-type-col">
                              Reading Type
                            </th>
                            <th className="printer-size-col">Start Reading</th>
                            <th className="printer-size-col">Final Reading</th>
                            <th className="printer-size-col">No of Copies</th>
                            <th className="printer-size-col">Unit Price (₹)</th>
                            <th className="printer-total-col">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printer.prices?.map((priceObj, index) => {
                            const sizeData = printerReadings[
                              printer.printerId
                            ]?.[priceObj.size] || {
                              STARTING: "",
                              "FINAL READING": "",
                              noOfCopies: 0,
                              price: Number(priceObj.price) || 0,
                              total: 0,
                            };

                            const starting = sizeData.STARTING;
                            const finalReading = sizeData["FINAL READING"];
                            const copies =
                              starting !== "" &&
                              finalReading !== "" &&
                              !isNaN(starting) &&
                              !isNaN(finalReading)
                                ? Math.max(
                                    0,
                                    Number(finalReading) - Number(starting)
                                  )
                                : 0;
                            const calculatedTotal =
                              copies * (Number(sizeData.price) || 0);

                            return (
                              <tr key={index}>
                                <td className="printer-reading-type">
                                  {priceObj.size}
                                </td>
                                <td className="printer-size-col">
                                  {sizeData.STARTING || "0"}
                                </td>
                                <td className="printer-size-col">
                                  {sizeData["FINAL READING"] || "0"}
                                </td>
                                <td className="printer-copies-cell">
                                  {copies > 0 ? copies.toLocaleString() : "0"}
                                </td>
                                <td className="printer-copies-cell">
                                  ₹{Number(sizeData.price).toFixed(2)}
                                </td>
                                <td className="printer-amount-cell">
                                  {formatCurrency(calculatedTotal)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="printer-total-row">
                            <td colSpan="5" className="printer-grand-total">
                              Total for {printer.printerName}
                            </td>
                            <td className="printer-grand-total">
                              {formatCurrency(printerTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="two-column-container">
            <div className="total-amount-card">
              <div className="total-amount-header">
                <div className="total-amount-title">
                  <h3>Total Amount Readings - {branchName}</h3>
                  {hasExistingTotalData && (
                    <div className="total-existing-data-warning">
                      <FaCheckCircle /> Data available for this date
                    </div>
                  )}
                </div>
              </div>

              <div className="total-amount-content">
                <table className="total-amounts-table">
                  <thead>
                    <tr>
                      <th className="total-item-col">Items</th>
                      <th className="total-amount-col">Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totalAmountRows.map((row, index) => (
                      <tr key={index}>
                        <td className="total-item-name">{row.itemName}</td>
                        <td className="total-parent-container">
                          <div className="total-calculated-amount">
                            {formatCurrency(row.amount)}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {previousBalanceRows.map((row, index) => (
                      <tr key={row.id}>
                        <td className="total-item-name">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <span>Previous Balance</span>
                            <span
                              style={{ fontSize: "0.75rem", color: "#666" }}
                            >
                              (
                              {row.date
                                ? new Date(row.date).toLocaleDateString("en-GB")
                                : "No Date"}
                              ) - {row.paymentMethod?.toUpperCase() || "CASH"}
                            </span>
                          </div>
                        </td>
                        <td className="total-parent-container">
                          <div className="total-calculated-amount">
                            {formatCurrency(row.amount)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="total-row">
                      <td className="total-grand-total-label">
                        Grand Total (After Deductions)
                      </td>
                      <td className="total-grand-total">
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="jumbo-xerox-card">
              <div className="jumbo-xerox-header">
                <div className="jumbo-xerox-title">
                  <h3>large format printing Details - {branchName}</h3>
                  {hasExistingJumboData && (
                    <div className="jumbo-existing-data-warning">
                      <FaCheckCircle /> Data available for this date
                    </div>
                  )}
                </div>
              </div>

              <div className="jumbo-xerox-content">
                <table className="jumbo-xerox-table">
                  <thead>
                    <tr>
                      <th>Type/Size</th>
                      <th>Unit Price (₹)</th>
                      <th>QTY</th>
                      <th>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedJumboData).map(([type, items]) => (
                      <React.Fragment key={type}>
                        <tr>
                          <td
                            colSpan="4"
                            style={{
                              backgroundColor: "#8b4513",
                              color: "white",
                              textAlign: "center",
                              fontWeight: "600",
                              padding: "0.5rem",
                            }}
                          >
                            {type}
                          </td>
                        </tr>

                        {items.map((item, idx) => (
                          <tr key={`${type}-${item.size}-${idx}`}>
                            <td className="jumbo-size">{item.size}</td>
                            <td className="printer-copies-cell">
                              ₹{Number(item.unitPrice).toFixed(2)}
                            </td>
                            <td className="printer-copies-cell">
                              {item.qty || "0"}
                            </td>
                            <td className="printer-copies-cell">
                              {formatCurrency(item.amount || 0)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}

                    {customJumboRows.length > 0 && (
                      <>
                        <tr>
                          <td
                            colSpan="4"
                            style={{
                              backgroundColor: "#8b4513",
                              color: "white",
                              textAlign: "center",
                              fontWeight: "600",
                              padding: "0.5rem",
                            }}
                          >
                            CUSTOM
                          </td>
                        </tr>
                        {customJumboRows.map((item, idx) => (
                          <tr key={`custom-${idx}`}>
                            <td className="jumbo-size">
                              {item.size || "Custom"}
                            </td>
                            <td className="printer-copies-cell">
                              ₹{Number(item.unitPrice).toFixed(2)}
                            </td>
                            <td className="printer-copies-cell">
                              {item.qty || "0"}
                            </td>
                            <td className="printer-copies-cell">
                              {formatCurrency(item.amount || 0)}
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="jumbo-total-row">
                      <td colSpan="3" className="jumbo-grand-total-label">
                        Total large format printing
                      </td>
                      <td className="jumbo-grand-total">
                        {formatCurrency(jumboTotals.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div style={{ marginTop: "1rem" }}>
                  <h4
                    style={{
                      margin: "0 0 0.5rem 0",
                      color: "#1e3a8a",
                      fontSize: "0.9rem",
                    }}
                  >
                    Jumbo Counter Details
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(120px, 1fr))",
                      gap: "0.75rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "0.8rem",
                          color: "#1e3a8a",
                          fontWeight: "600",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Start Counter
                      </label>
                      <div
                        className="jumbo-input"
                        style={{
                          padding: "0.5rem",
                          backgroundColor: "#f5f5f5",
                        }}
                      >
                        {jumboCounter.start || "0"}
                      </div>
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.8rem",
                          color: "#1e3a8a",
                          fontWeight: "600",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        End Counter
                      </label>
                      <div
                        className="jumbo-input"
                        style={{
                          padding: "0.5rem",
                          backgroundColor: "#f5f5f5",
                        }}
                      >
                        {jumboCounter.end || "0"}
                      </div>
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.8rem",
                          color: "#1e3a8a",
                          fontWeight: "600",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        SFT Printed
                      </label>
                      <div
                        className="jumbo-input"
                        style={{
                          padding: "0.5rem",
                          backgroundColor: "#f5f5f5",
                        }}
                      >
                        {jumboCounter.sftPrinted || "0"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : date && branchName && !dataLoaded ? (
        <div className="printer-loading-container">
          <div className="printer-loading-spinner"></div>
          <p>Loading data for selected date...</p>
        </div>
      ) : (
        <div className="printer-select-date-message">
          <p>Please select a branch and date to view revenue data</p>
        </div>
      )}
    </div>
  );
};

export default AdminDailyReadingsRevenue;