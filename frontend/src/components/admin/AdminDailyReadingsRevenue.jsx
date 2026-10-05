import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../services/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Building2,
  Calendar,
  FileDown,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calculator,
  RotateCcw,
  Package,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "../../styles/dailyStockRevenue.css";
import "../../styles/printerreadings.css";
import BranchSelect from "../common/BranchSelect.jsx";
import CalendarSelect from "../common/CalendarSelect.jsx";

const AdminDailyReadingsRevenue = () => {
  const [date, setDate] = useState("");
  const [approvedDates, setApprovedDates] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [branches, setBranches] = useState([]);
  const [branchConfigurations, setBranchConfigurations] = useState({});
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(5);

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
        const storedUser = localStorage.getItem("user");
        const user = storedUser ? JSON.parse(storedUser) : null;
        if (user) {
          setUserId(user.id || user._id || user.uid);

          const [branchesRes, usersRes, printersRes] = await Promise.all([
            api.get("/branches"),
            api.get("/users"),
            api.get("/printers"),
          ]);

          const allBranches =
            branchesRes.data?.data ||
            (Array.isArray(branchesRes.data) ? branchesRes.data : []);
          const allUsers =
            usersRes.data?.data ||
            (Array.isArray(usersRes.data) ? usersRes.data : []);
          const allPrinters =
            printersRes.data?.data ||
            (Array.isArray(printersRes.data) ? printersRes.data : []);

          const branchConfigData = {};

          for (const branch of allBranches) {
            const branchNameStr = branch.name || branch.branchName;
            const branchConfig = {
              hasManager: false,
              hasPrinters: false,
              managerEmail: null,
              printerCount: 0,
            };

            const branchManagers = allUsers.filter(
              (u) =>
                u.role === "manager" &&
                (u.branch === branchNameStr || u.branchName === branchNameStr)
            );
            if (branchManagers.length > 0) {
              branchConfig.hasManager = true;
              branchConfig.managerEmail = branchManagers[0].email;
            }

            const branchPrinters = allPrinters.filter(
              (p) => p.branchName === branchNameStr
            );
            branchConfig.hasPrinters = branchPrinters.length > 0;
            branchConfig.printerCount = branchPrinters.length;

            branchConfigData[branchNameStr] = branchConfig;
          }

          setBranchConfigurations(branchConfigData);

          const sortedBranches = Array.from(
            new Set(
              allBranches
                .map((b) => (b.name || b.branchName || "").trim())
                .filter(Boolean)
            )
          ).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

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

    const fetchJumboConfig = async () => {
      try {
        const res = await api.get("/jumbo-xerox/configurations", {
          params: { branchName },
        });
        const configData =
          res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setJumboXeroxConfig(configData);
        setConfigLoaded(true);
      } catch (error) {
        console.error("Error loading JumboXerox config:", error);
        toast.error("Failed to load JumboXerox configuration");
        setConfigLoaded(true);
      }
    };

    fetchJumboConfig();
  }, [branchName]);

  const fetchStockData = useCallback(
    async (dateString) => {
      if (!branchName || !dateString) return 0;

      setIsLoadingStock(true);
      try {
        const res = await api.get("/stocks/readings", {
          params: { branchName, date: dateString },
        });
        const records =
          res.data?.data || (Array.isArray(res.data) ? res.data : []);

        if (records.length > 0) {
          const totalStockAmount = records[0].totalAmount || 0;
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

        // Fetch printers
        const printersRes = await api.get("/printers", {
          params: { branchName },
        });
        const allBranchPrinters =
          printersRes.data?.data ||
          (Array.isArray(printersRes.data) ? printersRes.data : []);

        const activePrinters = allBranchPrinters.filter(
          (p) => p.isActive === true
        );

        // Fetch printer readings
        const printerReadingsRes = await api.get("/printer-readings", {
          params: { branchName, date: dateString },
        });
        const printerRecords =
          printerReadingsRes.data?.data ||
          (Array.isArray(printerReadingsRes.data)
            ? printerReadingsRes.data
            : []);

        const inactivePrintersWithData = [];

        if (printerRecords.length > 0) {
          const printerIdsWithReadings = new Set();
          printerRecords.forEach((doc) => {
            if (doc.readings && typeof doc.readings === "object") {
              Object.keys(doc.readings).forEach((printerId) => {
                printerIdsWithReadings.add(printerId);
              });
            }
          });

          for (const printerId of printerIdsWithReadings) {
            const isAlreadyActive = activePrinters.some(
              (p) => p.printerId === printerId
            );
            if (!isAlreadyActive) {
              const inactivePrinter = allBranchPrinters.find(
                (p) => p.printerId === printerId && p.isActive === false
              );
              if (inactivePrinter) {
                inactivePrintersWithData.push({
                  ...inactivePrinter,
                  isInactiveWithData: true,
                });
              }
            }
          }
        }

        const allRelevantPrinters = [
          ...activePrinters,
          ...inactivePrintersWithData,
        ];
        setPrinters(allRelevantPrinters);

        const [jumboRes, totalRes] = await Promise.all([
          api.get("/jumbo-xerox/readings", {
            params: { branchName, date: dateString },
          }),
          api.get("/total-amounts", {
            params: { branchName, date: dateString },
          }),
        ]);

        const jumboRecords =
          jumboRes.data?.data ||
          (Array.isArray(jumboRes.data) ? jumboRes.data : []);
        const totalRecords =
          totalRes.data?.data ||
          (Array.isArray(totalRes.data) ? totalRes.data : []);

        if (printerRecords.length > 0) {
          setHasExistingPrinterData(true);
          const docData = printerRecords[0];
          if (docData.readings) {
            setPrinterReadings(docData.readings);
          }
        }

        if (jumboRecords.length > 0) {
          setHasExistingJumboData(true);
          const docData = jumboRecords[0];
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

        if (totalRecords.length > 0) {
          setHasExistingTotalData(true);
          const docData = totalRecords[0];
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

  const jumboTotals = calculateJumboTotals(jumboRows, customJumboRows);
  const groupedJumboData = groupJumboDataByType(jumboRows);

  const accountMetrics = useMemo(() => {
    const printerTotals = {};
    let allPrintersTotal = 0;
    printers.forEach((printer) => {
      const pTotal = Object.values(printerReadings[printer.printerId] || {}).reduce(
        (sum, sizeData) => {
          const starting = sizeData.STARTING;
          const finalReading = sizeData["FINAL READING"];
          if (
            starting !== "" &&
            finalReading !== "" &&
            !isNaN(starting) &&
            !isNaN(finalReading)
          ) {
            const copies = Math.max(0, Number(finalReading) - Number(starting));
            const total = copies * (Number(sizeData.price) || 0);
            return sum + total;
          }
          return sum;
        },
        0
      );
      printerTotals[printer.printerId] = {
        name: printer.printerName || `Printer ${printer.printerId}`,
        amount: pTotal,
      };
      allPrintersTotal += pTotal;
    });

    const getRowAmount = (key) => {
      const r = totalAmountRows.find((row) => row.key === key);
      return Number(r?.amount) || 0;
    };

    const jumboTotal = jumboTotals.amount || getRowAmount("jumboXerox");
    const stockTotal = stockAmount || getRowAmount("items");
    const digitalBusiness = getRowAmount("digitalBusiness");
    const giftBusiness = getRowAmount("giftBusiness");
    const totalBusiness =
      getRowAmount("totalBusiness") ||
      allPrintersTotal + jumboTotal + stockTotal + digitalBusiness + giftBusiness;
    const discount = getRowAmount("discount");
    const upiCardPayments = getRowAmount("upiCardPayments");
    const bankTransfers = getRowAmount("bankTransfers");
    const cashAsPerAccounts =
      getRowAmount("cashAsPerAccounts") ||
      Math.max(0, totalBusiness - discount - upiCardPayments - bankTransfers);
    const cashInHand = getRowAmount("cashInHand");
    const paymentToBeCollected = getRowAmount("paymentToBeCollected");

    return {
      printerTotals,
      allPrintersTotal,
      jumboTotal,
      stockTotal,
      digitalBusiness,
      giftBusiness,
      totalBusiness,
      discount,
      upiCardPayments,
      bankTransfers,
      cashAsPerAccounts,
      cashInHand,
      paymentToBeCollected,
    };
  }, [printers, printerReadings, totalAmountRows, jumboTotals, stockAmount]);

  const STEPS = [
    { id: 1, label: "Printer Readings", icon: Printer, isSaved: hasExistingPrinterData },
    { id: 2, label: "Large Format", icon: Layers, isSaved: hasExistingJumboData },
    { id: 3, label: "Business & Payments", icon: Calculator, isSaved: hasExistingTotalData },
    { id: 4, label: "Stock", icon: Package, isSaved: stockAmount > 0 },
    { id: 5, label: "Review & Submit", icon: CheckCircle2, isSaved: dataLoaded },
  ];

  if (isLoading && branches.length === 0) {
    return (
      <div
        className="revenue-page-container"
        style={{
          minHeight: "80vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div className="revenue-loading-box">
          <div className="revenue-loading-spinner"></div>
          <p>Loading branches configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="revenue-page-container">
        <div className="revenue-prompt-state" style={{ borderColor: "#fecaca" }}>
          <AlertTriangle size={36} color="#dc2626" />
          <h3 style={{ color: "#991b1b" }}>Error Loading Data</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="revenue-page-btn"
            style={{
              background: "#059669",
              color: "#ffffff",
              borderColor: "#059669",
              marginTop: "8px",
            }}
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="revenue-page-container">
      <ToastContainer />

      {/* Modern Header Banner */}
      <div className="printz-header-banner-full">
        <div className="printz-header-title-area">
          <h1 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <Building2 size={20} color="#059669" /> Daily Readings
            {branchName ? ` — ${branchName}` : ""}
          </h1>
        </div>

        {date && branchName && (
          <div>
            <button
              type="button"
              onClick={generatePDF}
              className="printz-btn-primary"
              disabled={!date || !dataLoaded || !branchName}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 20px",
                fontSize: "13.5px",
                fontWeight: 600,
                borderRadius: "10px",
                background:
                  !date || !dataLoaded || !branchName ? "#94a3b8" : "#059669",
                color: "#ffffff",
                border: "none",
                cursor:
                  !date || !dataLoaded || !branchName
                    ? "not-allowed"
                    : "pointer",
                boxShadow:
                  !date || !dataLoaded || !branchName
                    ? "none"
                    : "0 4px 12px rgba(5, 150, 105, 0.35)",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              <FileDown size={16} /> Download PDF
            </button>
          </div>
        )}
      </div>

      {/* Modern Filter Card matching Account Sheet */}
      <div className="revenue-filter-card" style={{ padding: "14px 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          {/* Left: Heading with Calendar Icon */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              className="revenue-filter-icon"
              style={{ width: "42px", height: "42px", borderRadius: "10px" }}
            >
              <Calendar size={22} color="#059669" />
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.01em",
              }}
            >
              Select Reading Date
            </h2>
          </div>

          {/* Right: Branch select + Date picker + Status Badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {/* Branch Selector */}
            <div style={{ minWidth: "260px" }}>
              <BranchSelect
                id="branch-select"
                value={branchName}
                onChange={handleBranchChange}
                branches={branches}
                placeholder="Select Branch"
                allowAll={true}
                allOptionLabel="Select Branch"
                triggerStyle={{ height: "42px" }}
              />
            </div>

            {/* Calendar Date Picker */}
            <div style={{ width: "210px", minWidth: "180px" }}>
              <CalendarSelect
                id="readings-date"
                selected={date ? new Date(date) : null}
                onChange={handleDateChange}
                dateFormat="yyyy-MM-dd"
                required
                placeholder="Select date..."
                triggerStyle={{ height: "42px" }}
              />
            </div>

            {dataLoaded && (
              <span
                className="revenue-badge-available"
                style={{ background: "#ecfdf5", color: "#047857" }}
              >
                <CheckCircle2 size={13} /> Finalized & Locked
              </span>
            )}
            {branchName && (
              <span className="revenue-badge-available">
                <CheckCircle2 size={13} /> {branchName} Branch
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 5-Step Horizontal Navigation Stepper */}
      {date && branchName && dataLoaded && (
        <div className="account-sheet-top-stepper">
          <div className="account-stepper-track">
            {STEPS.map((step) => {
              const isSaved = step.isSaved;
              const isActive = activeStep === step.id;
              return (
                <div
                  key={step.id}
                  className={`account-stepper-item ${isActive ? "active" : ""} ${
                    isSaved ? "completed" : ""
                  }`}
                  onClick={() => setActiveStep(step.id)}
                >
                  <div className="account-stepper-item-left">
                    <span
                      className={`account-stepper-badge ${
                        isActive ? "active" : ""
                      } ${isSaved ? "saved" : ""}`}
                    >
                      {isSaved ? <Check size={12} strokeWidth={3} /> : step.id}
                    </span>
                    <span className="account-stepper-label">{step.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Views */}
      {date && branchName && dataLoaded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* STEP 5: Review & Submit (Comprehensive Live Accounting Table) */}
          {activeStep === 5 && (
            <div className="revenue-card" style={{ padding: "20px" }}>
              {/* Comprehensive Live Summary Table (Account Sheet Table) */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", marginBottom: "16px" }}>
                <table className="revenue-modern-table" style={{ width: "100%", margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>ACCOUNT ITEM / METRIC</th>
                      <th style={{ textAlign: "right", width: "180px" }}>AMOUNT / STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Printer Totals */}
                    {Object.entries(accountMetrics.printerTotals || {}).map(([pid, pInfo]) => (
                      <tr key={pid}>
                        <td style={{ fontWeight: 600, color: "#1e293b" }}>
                          Printer {pInfo.name || pid} Total
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                          Rs. {Number(pInfo.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}

                    <tr>
                      <td>Large Format / Jumbo Xerox Total</td>
                      <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                        Rs. {Number(accountMetrics.jumboTotal || 0).toFixed(2)}
                      </td>
                    </tr>

                    {jumboCounter?.sftPrinted && (
                      <tr style={{ background: "#f8fafc" }}>
                        <td style={{ fontSize: "12px", color: "#64748b", paddingLeft: "24px" }}>
                          Jumbo Counter (SFT Printed)
                        </td>
                        <td style={{ textAlign: "right", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>
                          {jumboCounter.sftPrinted} SFT
                        </td>
                      </tr>
                    )}

                    <tr>
                      <td>Stock Items Revenue Total</td>
                      <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                        Rs. {Number(accountMetrics.stockTotal || 0).toFixed(2)}
                      </td>
                    </tr>

                    {accountMetrics.digitalBusiness > 0 && (
                      <tr>
                        <td>Digital Business</td>
                        <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                          Rs. {Number(accountMetrics.digitalBusiness).toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {accountMetrics.giftBusiness > 0 && (
                      <tr>
                        <td>Gift Business</td>
                        <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                          Rs. {Number(accountMetrics.giftBusiness).toFixed(2)}
                        </td>
                      </tr>
                    )}

                    <tr style={{ background: "#f1f5f9", fontWeight: 700 }}>
                      <td style={{ color: "#0f172a" }}>TOTAL BUSINESS</td>
                      <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#0f172a" }}>
                        Rs. {Number(accountMetrics.totalBusiness || 0).toFixed(2)}
                      </td>
                    </tr>

                    <tr>
                      <td style={{ color: "#dc2626" }}>Discount</td>
                      <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#dc2626" }}>
                        Rs. {Number(accountMetrics.discount || 0).toFixed(2)}
                      </td>
                    </tr>

                    <tr>
                      <td>UPI & Card Payments</td>
                      <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                        Rs. {Number(accountMetrics.upiCardPayments || 0).toFixed(2)}
                      </td>
                    </tr>

                    <tr>
                      <td>Bank Transfers</td>
                      <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                        Rs. {Number(accountMetrics.bankTransfers || 0).toFixed(2)}
                      </td>
                    </tr>

                    <tr style={{ background: "#ecfdf5" }}>
                      <td style={{ fontWeight: 700, color: "#065f46" }}>CASH AS PER ACCOUNTS</td>
                      <td style={{ textAlign: "right", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#047857" }}>
                        Rs. {Number(accountMetrics.cashAsPerAccounts || 0).toFixed(2)}
                      </td>
                    </tr>

                    <tr>
                      <td>Cash in Hand</td>
                      <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                        Rs. {Number(accountMetrics.cashInHand || 0).toFixed(2)}
                      </td>
                    </tr>

                    <tr>
                      <td>Payment to be Collected</td>
                      <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                        Rs. {Number(accountMetrics.paymentToBeCollected || 0).toFixed(2)}
                      </td>
                    </tr>

                    {previousBalanceRows.map((row) => (
                      <tr key={row.id || row.date}>
                        <td style={{ color: "#64748b" }}>
                          Previous Balance ({row.date ? new Date(row.date).toLocaleDateString("en-GB") : "No Date"}) — {row.paymentMethod?.toUpperCase() || "CASH"}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                          Rs. {Number(row.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f0fdf4", borderTop: "2px solid #a7f3d0" }}>
                      <td style={{ fontWeight: 800, color: "#065f46", fontSize: "14px" }}>
                        GRAND TOTAL (AFTER DEDUCTIONS)
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 800,
                          color: "#047857",
                          fontSize: "15px",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        Rs. {Number(totalAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* STEP 1: Detailed Printer Readings */}
          {activeStep === 1 && (
            <div className="revenue-card">
              <div className="revenue-card-header">
                <div className="revenue-card-header-left">
                  <Printer size={18} color="#059669" />
                  <h3 className="revenue-card-title">
                    Printer Readings — {branchName}
                  </h3>
                </div>
                {hasExistingPrinterData && (
                  <span className="revenue-badge-available">
                    <CheckCircle2 size={13} /> Revenue Data Available
                  </span>
                )}
              </div>

              <div style={{ padding: "16px" }}>
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
                      className={`revenue-printer-subcard completed ${
                        printer.isInactiveWithData ? "inactive" : ""
                      }`}
                    >
                      <div className="revenue-printer-subcard-header">
                        <div className="revenue-printer-name-wrap">
                          <span className="revenue-printer-name">
                            {printer.printerName}
                          </span>
                          <span className="revenue-id-badge">
                            ID: {printer.printerId}
                          </span>
                          <span className="revenue-badge-available">
                            <CheckCircle2 size={12} /> Revenue Data
                          </span>
                          {printer.isInactiveWithData && (
                            <span className="revenue-badge-warning">
                              <AlertTriangle size={12} /> Inactive (Has Data)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="revenue-table-wrapper">
                        <table className="revenue-modern-table">
                          <thead>
                            <tr>
                              <th>Reading Type</th>
                              <th className="center">Start Reading</th>
                              <th className="center">Final Reading</th>
                              <th className="center">No of Copies</th>
                              <th className="center">Unit Price (₹)</th>
                              <th className="right">Amount (₹)</th>
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
                                  <td style={{ fontWeight: 600, color: "#0f172a" }}>
                                    {priceObj.size}
                                  </td>
                                  <td
                                    className="center"
                                    style={{
                                      fontFamily:
                                        "'JetBrains Mono', 'Fira Code', monospace",
                                    }}
                                  >
                                    {sizeData.STARTING || "0"}
                                  </td>
                                  <td
                                    className="center"
                                    style={{
                                      fontFamily:
                                        "'JetBrains Mono', 'Fira Code', monospace",
                                    }}
                                  >
                                    {sizeData["FINAL READING"] || "0"}
                                  </td>
                                  <td
                                    className="center"
                                    style={{
                                      fontWeight: 600,
                                      fontFamily:
                                        "'JetBrains Mono', 'Fira Code', monospace",
                                    }}
                                  >
                                    {copies > 0
                                      ? copies.toLocaleString()
                                      : "0"}
                                  </td>
                                  <td className="center">
                                    ₹{Number(sizeData.price).toFixed(2)}
                                  </td>
                                  <td
                                    className="right"
                                    style={{
                                      fontWeight: 600,
                                      color: "#059669",
                                    }}
                                  >
                                    {formatCurrency(calculatedTotal)}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="revenue-table-total-row">
                              <td colSpan="5">
                                Total for {printer.printerName}
                              </td>
                              <td className="right">
                                {formatCurrency(printerTotal)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(5)}
                    className="printz-btn-primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
                  >
                    <span>View Account Sheet</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Large Format Printing Details */}
          {activeStep === 2 && (
            <div className="revenue-card">
              <div className="revenue-card-header">
                <div className="revenue-card-header-left">
                  <Layers size={18} color="#059669" />
                  <h3 className="revenue-card-title">
                    Large Format Printing Details — {branchName}
                  </h3>
                </div>
                {hasExistingJumboData && (
                  <span className="revenue-badge-available">
                    <CheckCircle2 size={13} /> Data Available
                  </span>
                )}
              </div>

              <div style={{ padding: "16px" }}>
                <div className="revenue-table-wrapper">
                  <table className="revenue-modern-table">
                    <thead>
                      <tr>
                        <th>Type / Size</th>
                        <th className="center">Unit Price (₹)</th>
                        <th className="center">QTY</th>
                        <th className="right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedJumboData).map(([type, items]) => (
                        <React.Fragment key={type}>
                          <tr className="revenue-jumbo-type-header">
                            <td colSpan="4">{type}</td>
                          </tr>

                          {items.map((item, idx) => (
                            <tr key={`${type}-${item.size}-${idx}`}>
                              <td style={{ fontWeight: 500 }}>{item.size}</td>
                              <td className="center">
                                ₹{Number(item.unitPrice).toFixed(2)}
                              </td>
                              <td
                                className="center"
                                style={{
                                  fontFamily:
                                    "'JetBrains Mono', 'Fira Code', monospace",
                                }}
                              >
                                {item.qty || "0"}
                              </td>
                              <td
                                className="right"
                                style={{
                                  fontWeight: 600,
                                  color: "#059669",
                                }}
                              >
                                {formatCurrency(item.amount || 0)}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}

                      {customJumboRows.length > 0 && (
                        <>
                          <tr className="revenue-jumbo-type-header">
                            <td colSpan="4">CUSTOM</td>
                          </tr>
                          {customJumboRows.map((item, idx) => (
                            <tr key={`custom-${idx}`}>
                              <td style={{ fontWeight: 500 }}>
                                {item.size || "Custom"}
                              </td>
                              <td className="center">
                                ₹{Number(item.unitPrice).toFixed(2)}
                              </td>
                              <td
                                className="center"
                                style={{
                                  fontFamily:
                                    "'JetBrains Mono', 'Fira Code', monospace",
                                }}
                              >
                                {item.qty || "0"}
                              </td>
                              <td
                                className="right"
                                style={{
                                  fontWeight: 600,
                                  color: "#059669",
                                }}
                              >
                                {formatCurrency(item.amount || 0)}
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="revenue-table-total-row">
                        <td colSpan="3">Total Large Format Printing</td>
                        <td className="right">
                          {formatCurrency(jumboTotals.amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Jumbo Counter Box */}
                <div className="revenue-counter-box" style={{ marginTop: "16px" }}>
                  <h4 className="revenue-counter-title">Jumbo Counter Details</h4>
                  <div className="revenue-counter-grid">
                    <div className="revenue-counter-tile">
                      <span className="revenue-counter-label">Start Counter</span>
                      <span className="revenue-counter-value">
                        {jumboCounter.start || "0"}
                      </span>
                    </div>
                    <div className="revenue-counter-tile">
                      <span className="revenue-counter-label">End Counter</span>
                      <span className="revenue-counter-value">
                        {jumboCounter.end || "0"}
                      </span>
                    </div>
                    <div className="revenue-counter-tile">
                      <span className="revenue-counter-label">SFT Printed</span>
                      <span className="revenue-counter-value">
                        {jumboCounter.sftPrinted || "0"}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(5)}
                    className="printz-btn-primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
                  >
                    <span>View Account Sheet</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Business & Payments Readings */}
          {activeStep === 3 && (
            <div className="revenue-card">
              <div className="revenue-card-header">
                <div className="revenue-card-header-left">
                  <Calculator size={18} color="#059669" />
                  <h3 className="revenue-card-title">
                    Business & Payments Readings — {branchName}
                  </h3>
                </div>
                {hasExistingTotalData && (
                  <span className="revenue-badge-available">
                    <CheckCircle2 size={13} /> Data Available
                  </span>
                )}
              </div>

              <div style={{ padding: "16px" }}>
                <div className="revenue-table-wrapper">
                  <table className="revenue-modern-table">
                    <thead>
                      <tr>
                        <th>Items</th>
                        <th className="right">Total Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {totalAmountRows.map((row, index) => (
                        <tr key={index}>
                          <td style={{ fontWeight: 500 }}>{row.itemName}</td>
                          <td
                            className="right"
                            style={{
                              fontWeight: 600,
                              fontFamily:
                                "'JetBrains Mono', 'Fira Code', monospace",
                            }}
                          >
                            {formatCurrency(row.amount)}
                          </td>
                        </tr>
                      ))}
                      {previousBalanceRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>
                                Previous Balance
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "#64748b",
                                  background: "#f1f5f9",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                (
                                {row.date
                                  ? new Date(row.date).toLocaleDateString(
                                      "en-GB"
                                    )
                                  : "No Date"}
                                ) — {row.paymentMethod?.toUpperCase() || "CASH"}
                              </span>
                            </div>
                          </td>
                          <td
                            className="right"
                            style={{
                              fontWeight: 600,
                              fontFamily:
                                "'JetBrains Mono', 'Fira Code', monospace",
                            }}
                          >
                            {formatCurrency(row.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="revenue-table-total-row">
                        <td>Grand Total (After Deductions)</td>
                        <td className="right">
                          {formatCurrency(totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(5)}
                    className="printz-btn-primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
                  >
                    <span>View Account Sheet</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Stock Readings */}
          {activeStep === 4 && (
            <div className="revenue-card">
              <div className="revenue-card-header">
                <div className="revenue-card-header-left">
                  <Package size={18} color="#059669" />
                  <h3 className="revenue-card-title">
                    Stock Readings — {branchName}
                  </h3>
                </div>
                {stockAmount > 0 && (
                  <span className="revenue-badge-available">
                    <CheckCircle2 size={13} /> Data Available
                  </span>
                )}
              </div>

              <div style={{ padding: "20px" }}>
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                  }}
                >
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                      Total Stock Items Revenue
                    </h4>
                    <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                      Calculated stock revenue for {branchName} on {date}
                    </p>
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#059669", fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatCurrency(stockAmount)}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(5)}
                    className="printz-btn-primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
                  >
                    <span>View Account Sheet</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : date && branchName && !dataLoaded ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "45vh",
            width: "100%",
          }}
        >
          <div className="revenue-loading-box">
            <div className="revenue-loading-spinner"></div>
            <p>Loading reading data for {branchName}...</p>
          </div>
        </div>
      ) : (
        <div className="revenue-prompt-state">
          <Calendar size={36} color="#94a3b8" />
          <h3>Select Reading Date</h3>
          <p>
            Choose a branch location and valid calendar date above to inspect
            the complete daily readings report for {branchName || "your branch"}.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminDailyReadingsRevenue;
