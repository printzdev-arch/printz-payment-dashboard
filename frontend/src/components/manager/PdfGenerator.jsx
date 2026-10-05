import React, { useEffect, useState, useMemo, useCallback } from "react";
import api from "../../services/api";
import CalendarSelect from "../common/CalendarSelect.jsx";
import {
  FileDown,
  Building2,
  Calendar,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  Sparkles,
  Layers,
} from "lucide-react";
import PdfGeneratorTable from "./PdfGeneratorTable.jsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/dailyStockRevenue.css";
import "../../styles/printerreadings.css";
import "../../styles/PdfGenerator.css";

const PdfGenerator = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [dateSelected, setDateSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [approvedDates, setApprovedDates] = useState([]);
  const [userId, setUserId] = useState(null);
  const [, setTotalAmount1] = useState(0);
  const [branchName, setBranchName] = useState("");
  const [rows, setRows] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [, setJumboRows] = useState([]);
  const [, setPreviousBalanceRows] = useState([]);
  const [, setPaymentToBeCollectedRows] = useState([]);
  const [, setJumboCounter] = useState({
    start: "",
    end: "",
    sftPrinted: "",
  });

  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [jumboXeroxConfig, setJumboXeroxConfig] = useState([]);

  const generateDynamicRows = useCallback((printersData) => {
    const dynamicRows = [];

    printersData.forEach((printer) => {
      dynamicRows.push({
        itemName: `TOTAL ${
          printer.printerName || `PRINTER ${printer.printerId}`
        }`,
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

  const calculateJumboTotals = useCallback((currentJumboRows) => {
    return currentJumboRows.reduce(
      (acc, row) => {
        acc.qty += Number(row.qty) || 0;
        acc.amount += Number(row.amount) || 0;
        return acc;
      },
      { qty: 0, amount: 0 }
    );
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        let uData = storedUser ? JSON.parse(storedUser) : null;

        try {
          const profileRes = await api.get("/users/profile");
          if (profileRes.data?.data || profileRes.data) {
            uData = profileRes.data.data || profileRes.data;
          }
        } catch (e) {
          // fallback
        }

        if (uData) {
          setUserId(uData.id || uData._id || uData.uid);
          setUserData(uData);
          setBranchName(
            uData.branch ||
              uData.branchName ||
              localStorage.getItem("userBranchName") ||
              ""
          );
        } else {
          toast.error("User data not found");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (!branchName) return;

    const fetchPrintersList = async () => {
      try {
        const res = await api.get("/printers", {
          params: { branchName },
        });
        const printersData =
          res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setPrinters(printersData);
        const dynamicRows = generateDynamicRows(printersData);
        setRows(dynamicRows);
      } catch (error) {
        console.error("Error loading printers:", error);
        toast.error("Failed to load printers");
      }
    };

    fetchPrintersList();
  }, [branchName, generateDynamicRows]);

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
      } catch (error) {
        console.error("Error loading JumboXerox config:", error);
        toast.error("Failed to load JumboXerox configuration");
      }
    };

    fetchJumboConfig();
  }, [branchName]);

  useEffect(() => {
    if (!selectedDate || !branchName) return;

    const fetchDateData = async () => {
      const dateString = selectedDate;

      try {
        // 1. Total amount reading
        const totalRes = await api.get("/total-amounts", {
          params: { branchName, date: dateString },
        });
        const totalRecords =
          totalRes.data?.data ||
          (Array.isArray(totalRes.data) ? totalRes.data : []);

        const baseRows = generateDynamicRows(printers);

        if (totalRecords.length > 0) {
          const docData = totalRecords[0];
          setTotalAmount1(docData.totalAmount || 0);

          const updatedRows = [...baseRows];

          if (docData.printerData) {
            Object.entries(docData.printerData).forEach(
              ([printerId, amount]) => {
                const rowIndex = updatedRows.findIndex(
                  (r) => r.key === `printer_${printerId}`
                );
                if (rowIndex !== -1) {
                  updatedRows[rowIndex].amount = amount;
                }
              }
            );
          }

          if (docData.rows) {
            docData.rows.forEach((savedRow) => {
              const rowIndex = updatedRows.findIndex(
                (r) => r.key === savedRow.key
              );
              if (rowIndex !== -1) {
                updatedRows[rowIndex].amount = savedRow.amount;
              }
            });
          }

          if (docData.stockTotal !== undefined) {
            const itemsRowIndex = updatedRows.findIndex(
              (r) => r.key === "items"
            );
            if (itemsRowIndex !== -1) {
              updatedRows[itemsRowIndex].amount = docData.stockTotal;
            }
          }

          if (docData.jumboXeroxTotal !== undefined) {
            const jumboRowIndex = updatedRows.findIndex(
              (r) => r.key === "jumboXerox"
            );
            if (jumboRowIndex !== -1) {
              updatedRows[jumboRowIndex].amount = docData.jumboXeroxTotal;
            }
          }

          if (docData.previousBalanceRows) {
            setPreviousBalanceRows(docData.previousBalanceRows);
          } else {
            setPreviousBalanceRows([]);
          }

          if (docData.paymentToBeCollectedRows) {
            setPaymentToBeCollectedRows(docData.paymentToBeCollectedRows);
          } else {
            setPaymentToBeCollectedRows([]);
          }

          setRows(updatedRows);
        } else {
          setRows(baseRows);
          setPreviousBalanceRows([]);
          setPaymentToBeCollectedRows([]);
        }

        // 2. Jumbo xerox reading
        const jumboRes = await api.get("/jumbo-xerox/readings", {
          params: { branchName, date: dateString },
        });
        const jumboRecords =
          jumboRes.data?.data ||
          (Array.isArray(jumboRes.data) ? jumboRes.data : []);

        if (jumboRecords.length > 0) {
          const docData = jumboRecords[0];

          const savedRows =
            docData.rows?.map((row) => ({
              ...row,
              qty: row.qty === 0 ? "" : row.qty,
              amount: row.amount === 0 ? "" : row.amount,
              unitPrice:
                row.unitPrice || row.unitPrice === 0
                  ? row.unitPrice
                  : row.unitPrice,
            })) || [];

          setJumboRows(savedRows.length > 0 ? savedRows : initialJumboRows);

          const savedCounter = {
            start:
              docData.jumboCounter?.start === 0
                ? ""
                : docData.jumboCounter?.start || "",
            end:
              docData.jumboCounter?.end === 0
                ? ""
                : docData.jumboCounter?.end || "",
            sftPrinted: docData.jumboCounter?.sftPrinted || "",
          };
          setJumboCounter(savedCounter);
        } else {
          setJumboRows(initialJumboRows);
          setJumboCounter({
            start: "",
            end: "",
            sftPrinted: "",
          });
        }
      } catch (error) {
        console.error("Error fetching date data:", error);
      }
    };

    fetchDateData();
  }, [
    selectedDate,
    branchName,
    initialJumboRows,
    generateDynamicRows,
    printers,
  ]);

  useEffect(() => {
    const fetchApprovedDates = async () => {
      try {
        const res = await api.get("/past-date-requests", {
          params: {
            requestedBranch: branchName || undefined,
            status: "Approved",
            type: "pdfGenerator",
          },
        });
        const requests =
          res.data?.data || (Array.isArray(res.data) ? res.data : []);

        const dates = requests.map((doc) => {
          const requestedDate = doc.requestedDate;
          const dateStr = requestedDate.split(" ")[0];
          return new Date(dateStr + "T00:00:00");
        });

        const today = new Date();
        const todayLocal = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        dates.push(todayLocal);

        setApprovedDates(dates);
      } catch (error) {
        console.error("Error fetching approved past dates:", error);
      }
    };

    fetchApprovedDates();
  }, [branchName]);

  const handleDateChange = async (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) {
      console.error("Invalid date object:", dateObj);
      toast.error("Please select a valid date.");
      return;
    }

    const today = new Date();
    const todayLocal = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const selectedLocal = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate()
    );

    if (selectedLocal > todayLocal) {
      toast.error("Future dates are not allowed.");
      return;
    }

    const formattedDate = formatDateToYYYYMMDD(dateObj);

    try {
      const dataExists = await checkDataExists(formattedDate);

      if (dataExists) {
        setSelectedDate(formattedDate);
        setDateSelected(true);
        setShowTable(false);
      } else {
        setSelectedDate("");
        setDateSelected(false);
        setShowTable(false);
        toast.warning(`No recorded reading data found for ${formattedDate}`);
      }
    } catch (error) {
      console.error("Error checking data:", error);
      toast.error("Failed to check data availability. Please try again.");
      setSelectedDate("");
      setDateSelected(false);
      setShowTable(false);
    }
  };

  const checkDataExists = async (dateString) => {
    const currentBranch = userData?.branch || branchName;

    const checks = [
      api.get("/printer-readings", {
        params: { branchName: currentBranch, date: dateString },
      }),
      api.get("/jumbo-xerox/readings", {
        params: { branchName: currentBranch, date: dateString },
      }),
      api.get("/stocks/readings", {
        params: { branchName: currentBranch, date: dateString },
      }),
      api.get("/total-amounts", {
        params: { branchName: currentBranch, date: dateString },
      }),
    ];

    const results = await Promise.allSettled(checks);
    for (const res of results) {
      if (res.status === "fulfilled") {
        const records =
          res.value.data?.data ||
          (Array.isArray(res.value.data) ? res.value.data : []);
        if (records.length > 0) return true;
      }
    }

    return false;
  };

  const handleToggleContent = () => {
    if (!dateSelected) {
      toast.error("Please select a date first!");
      return;
    }
    setShowTable((prev) => !prev);
  };

  const generatePdfTable = async () => {
    if (!dateSelected) {
      toast.error("Please select a date first!");
      return;
    }

    try {
      setIsLoading(true);

      const data = await fetchAllDataForPdf();
      await generateStructuredPdf(data);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("There was an error generating the PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllDataForPdf = async () => {
    const formattedDate = selectedDate;
    const branch = userData.branch;

    try {
      const [
        printersData,
        printerReadingsData,
        jumboXeroxData,
        stockData,
        totalAmountData,
      ] = await Promise.all([
        fetchPrinters(branch),
        fetchPrinterReadings(branch, formattedDate),
        fetchJumboXeroxData(branch, formattedDate),
        fetchStockData(branch, formattedDate),
        fetchTotalAmountData(branch, formattedDate),
      ]);

      return {
        printers: printersData,
        printerReadings: printerReadingsData,
        jumboXerox: jumboXeroxData,
        stock: stockData,
        totalAmount: totalAmountData,
        date: new Date(selectedDate + "T00:00:00"),
        branch: branch,
      };
    } catch (error) {
      console.error("Error fetching data for PDF:", error);
      throw error;
    }
  };

  const fetchPrinters = async (branch) => {
    const res = await api.get("/printers", {
      params: { branchName: branch },
    });
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  };

  const fetchPrinterReadings = async (branch, date) => {
    const res = await api.get("/printer-readings", {
      params: { branchName: branch, date },
    });
    const records = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    const readings = {};
    records.forEach((data) => {
      if (data.readings) {
        Object.keys(data.readings).forEach((printerId) => {
          readings[printerId] = data.readings[printerId];
        });
      }
    });
    return readings;
  };

  const fetchJumboXeroxData = async (branch, date) => {
    const res = await api.get("/jumbo-xerox/readings", {
      params: { branchName: branch, date },
    });
    const records = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    return records.length === 0 ? {} : records[0];
  };

  const fetchStockData = async (branch, date) => {
    const res = await api.get("/stocks/readings", {
      params: { branchName: branch, date },
    });
    const records = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    return records.length === 0 ? [] : records[0].stocks || [];
  };

  const fetchTotalAmountData = async (branch, date) => {
    const res = await api.get("/total-amounts", {
      params: { branchName: branch, date },
    });
    const records = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    if (records.length === 0)
      return {
        rows: [],
        printerData: {},
        stockTotal: 0,
        jumboXeroxTotal: 0,
        previousBalanceRows: [],
        paymentToBeCollectedRows: [],
      };

    const data = records[0];
    return {
      rows: data.rows || [],
      printerData: data.printerData || {},
      stockTotal: data.stockTotal || 0,
      jumboXeroxTotal: data.jumboXeroxTotal || 0,
      totalAmount: data.totalAmount || 0,
      previousBalanceRows: data.previousBalanceRows || [],
      paymentToBeCollectedRows: data.paymentToBeCollectedRows || [],
    };
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

  const generateStructuredPdf = async (data) => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    let yPos = 10;

    pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");

    try {
      const logoBase64 = await loadImageAsBase64("/logo192.png");
      pdf.addImage(logoBase64, "PNG", 10, yPos, 20, 15);
    } catch (error) {
      pdf.rect(10, yPos, 25, 20);
      pdf.setFontSize(8);
      pdf.text("PRINTZ", 22.5, yPos + 12, { align: "center" });
    }

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(data.branch.toUpperCase() + " BRANCH", pageWidth / 2, yPos + 8, {
      align: "center",
    });

    pdf.setFontSize(14);
    pdf.text("Printz Shop", pageWidth - 35, yPos + 6, { align: "center" });
    pdf.setFontSize(8);
    pdf.text(
      "One Stop Shop For All Your Printing Needs",
      pageWidth - 35,
      yPos + 12,
      { align: "center" }
    );

    pdf.setFontSize(10);
    pdf.text("DATE", pageWidth - 48, yPos + 19);

    const displayDate = data.date.toLocaleDateString("en-GB");
    pdf.text(displayDate, pageWidth - 35, yPos + 19);

    yPos += 25;

    const printersToShow = data.printers.filter((printer) => {
      const hasReadings =
        data.printerReadings[printer.printerId] &&
        Object.keys(data.printerReadings[printer.printerId]).length > 0;
      return hasReadings || printer.isActive;
    });

    Object.entries(data.printerReadings).forEach(([printerId, sizes]) => {
      const printer = printersToShow.find((p) => p.printerId === printerId);
      if (!printer) return;

      const printerName = printer.printerName || `PRINTER ${printerId}`;
      const sizeKeys = Object.keys(sizes);
      const numSizeColumns = Math.min(sizeKeys.length, 4);

      if (yPos > pageHeight - 35) {
        pdf.addPage();
        pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
        yPos = 12;
      }

      pdf.setFillColor(220, 220, 220);
      pdf.rect(10, yPos, pageWidth - 20, 5, "F");
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text(printerName.toUpperCase(), 12, yPos + 3.5);

      yPos += 5;

      pdf.setFillColor(240, 240, 240);
      pdf.rect(10, yPos, 35, 5, "F");
      pdf.rect(45, yPos, pageWidth - 55, 5, "F");

      pdf.setFontSize(6);
      pdf.text("", 12, yPos + 3.5);

      const sizeColumnWidth = (pageWidth - 55) / numSizeColumns;

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

      const rowLabels = [
        "FINAL READING",
        "STARTING",
        "NO OF COPIES",
        `TOTAL ${printerId}`,
      ];

      rowLabels.forEach((label, rowIndex) => {
        pdf.rect(10, yPos, 35, 5);
        pdf.rect(45, yPos, pageWidth - 55, 5);
        pdf.setFont("helvetica", label.includes("TOTAL") ? "bold" : "normal");
        pdf.setFontSize(6);
        pdf.text(label, 12, yPos + 3.5);

        for (let i = 0; i < numSizeColumns; i++) {
          const size = sizeKeys[i];
          const xPos = 45 + i * sizeColumnWidth;
          let value = "";

          switch (rowIndex) {
            case 0:
              value =
                sizes[size]?.["FINAL READING"] ||
                sizes[size]?.FINAL_READING ||
                0;
              break;
            case 1:
              value = sizes[size]?.STARTING || 0;
              break;
            case 2:
              const copies = sizes[size]?.noOfCopies || 0;
              const price = sizes[size]?.price || 0;
              value = `${copies} × Rs.${price}`;
              break;
            case 3:
              value = `Rs.${sizes[size]?.total || 0}`;
              break;
            default:
              value = "";
              break;
          }

          pdf.text(String(value), xPos + 2, yPos + 3.5);
        }

        if (label.includes("TOTAL")) {
          const printerTotal = Object.values(sizes).reduce((sum, sizeData) => {
            return sum + (Number(sizeData.total) || 0);
          }, 0);
          pdf.text(`Rs.${printerTotal}`, pageWidth - 25, yPos + 3.5);
        }

        yPos += 5;
      });

      yPos += 6;
    });

    yPos += 3;

    const leftColWidth = (pageWidth - 25) / 2;
    const rightColWidth = (pageWidth - 25) / 2;
    const leftColX = 10;
    const rightColX = leftColX + leftColWidth + 5;

    if (yPos > pageHeight - 70) {
      pdf.addPage();
      pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
      yPos = 12;
    }

    let leftYPos = yPos;

    pdf.setFillColor(220, 220, 220);
    pdf.rect(leftColX, leftYPos, leftColWidth, 5, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("AMOUNT", leftColX + 2, leftYPos + 3.5);
    leftYPos += 5;

    const previousBalanceCash = (data.totalAmount.previousBalanceRows || [])
      .filter((r) => r.paymentMethod === "cash")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const previousBalanceUPI = (data.totalAmount.previousBalanceRows || [])
      .filter((r) => r.paymentMethod === "upi")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const totalAmountTableData = (data.totalAmount.rows || []).map((row) => {
      let displayAmount = row.amount || 0;
      let itemName = row.itemName;

      if (row.key === "cashInHand" && previousBalanceCash > 0) {
        displayAmount = (Number(row.amount) || 0) + previousBalanceCash;
        itemName = `${row.itemName} (Base: ${row.amount || 0} + Previous: ${previousBalanceCash})`;
      } else if (row.key === "upiCardPayments" && previousBalanceUPI > 0) {
        displayAmount = (Number(row.amount) || 0) - previousBalanceUPI;
        itemName = `${row.itemName} (Base: ${row.amount || 0} - Previous: ${previousBalanceUPI})`;
      }

      return [
        itemName,
        displayAmount ? `Rs.${displayAmount.toFixed(2)}` : "Rs.0.00",
      ];
    });

    if (
      data.totalAmount.previousBalanceRows &&
      data.totalAmount.previousBalanceRows.length > 0
    ) {
      totalAmountTableData.push(["", ""]);
      totalAmountTableData.push(["--- PREVIOUS BALANCE BREAKDOWN ---", ""]);

      data.totalAmount.previousBalanceRows.forEach((balanceRow) => {
        const formattedDate = balanceRow.date
          ? new Date(balanceRow.date).toLocaleDateString("en-GB")
          : "No Date";
        const paymentMethod = balanceRow.paymentMethod || "Unknown";
        const balanceLabel = `Previous ${paymentMethod.toUpperCase()} (${formattedDate}) [included above]`;
        totalAmountTableData.push([
          balanceLabel,
          `Rs.${(balanceRow.amount || 0).toFixed(2)}`,
        ]);
      });
    }

    if (
      data.totalAmount.paymentToBeCollectedRows &&
      data.totalAmount.paymentToBeCollectedRows.length > 0
    ) {
      data.totalAmount.paymentToBeCollectedRows.forEach((paymentRow) => {
        const formattedDate = paymentRow.date
          ? new Date(paymentRow.date).toLocaleDateString("en-GB")
          : "No Date";
        const paymentMethod = paymentRow.paymentMethod || "Unknown";
        const paymentLabel = `PAYMENT TO BE COLLECTED (${formattedDate} - ${paymentMethod})`;
        totalAmountTableData.push([
          paymentLabel,
          `Rs.${(paymentRow.amount || 0).toFixed(2)}`,
        ]);
      });
    }

    totalAmountTableData.push([
      "TOTAL",
      `Rs.${(data.totalAmount.totalAmount || 0).toFixed(2)}`,
    ]);

    totalAmountTableData.forEach((item, index) => {
      if (index % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(leftColX, leftYPos, leftColWidth, 4, "F");
      }

      pdf.rect(leftColX, leftYPos, leftColWidth, 4);
      pdf.setFont(
        "helvetica",
        item[0] === "TOTAL" || item[0].includes("TOTAL BUSINESS")
          ? "bold"
          : "normal"
      );
      pdf.setFontSize(6);
      pdf.text(item[0].toUpperCase(), leftColX + 2, leftYPos + 3);

      const amountText = item[1];
      const textWidth =
        (pdf.getStringUnitWidth(amountText) * 6) / pdf.internal.scaleFactor;
      pdf.text(
        amountText,
        leftColX + leftColWidth - textWidth - 2,
        leftYPos + 3
      );

      if (item[0] === "TOTAL") {
        pdf.setFillColor(220, 220, 220);
        pdf.rect(leftColX, leftYPos, leftColWidth, 4, "F");
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "bold");
        pdf.text(item[0].toUpperCase(), leftColX + 2, leftYPos + 3);
        pdf.text(
          amountText,
          leftColX + leftColWidth - textWidth - 2,
          leftYPos + 3
        );
        pdf.setTextColor(0, 0, 0);
      }

      leftYPos += 4;
    });

    let rightYPos = yPos;

    pdf.setFillColor(220, 220, 220);
    pdf.rect(rightColX, rightYPos, rightColWidth, 5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("JUMBO XEROX", rightColX + 2, rightYPos + 3.5);
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

    const groupedJumboData = (data.jumboXerox.rows || []).reduce((acc, row) => {
      if (!acc[row.type]) acc[row.type] = [];
      acc[row.type].push(row);
      return acc;
    }, {});

    const typeOrder = ["COLOUR", "B/W", "SCAN", "PHOTO PRINT"];
    typeOrder.forEach((type) => {
      if (groupedJumboData[type]) {
        pdf.setFillColor(200, 200, 200);
        pdf.rect(rightColX, rightYPos, rightColWidth, 4, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6);
        pdf.text(type, rightColX + 1, rightYPos + 3);
        rightYPos += 4;

        groupedJumboData[type].forEach((item) => {
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
            String(item.qty || 0),
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
    });

    Object.keys(groupedJumboData).forEach((type) => {
      if (!typeOrder.includes(type)) {
        pdf.setFillColor(200, 200, 200);
        pdf.rect(rightColX, rightYPos, rightColWidth, 4, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6);
        pdf.text(type, rightColX + 1, rightYPos + 3);
        rightYPos += 4;

        groupedJumboData[type].forEach((item) => {
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
            String(item.qty || 0),
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
    });

    const jumboTotals = calculateJumboTotals(data.jumboXerox.rows || []);
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
    rightYPos += 6;

    pdf.setFillColor(220, 220, 220);
    pdf.rect(rightColX, rightYPos, rightColWidth, 4, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6);
    pdf.text("JUMBO COUNTER", rightColX + 1, rightYPos + 3);
    rightYPos += 4;

    const counterData = [
      ["START", data.jumboXerox.jumboCounter?.start || 0],
      ["END", data.jumboXerox.jumboCounter?.end || 0],
      ["SFT PRINTED", data.jumboXerox.jumboCounter?.sftPrinted || 0],
    ];

    counterData.forEach(([label, value]) => {
      pdf.rect(rightColX, rightYPos, rightColWidth / 2, 4);
      pdf.rect(rightColX + rightColWidth / 2, rightYPos, rightColWidth / 2, 4);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5);
      pdf.text(label, rightColX + 1, rightYPos + 3);
      pdf.text(String(value), rightColX + rightColWidth / 2 + 1, rightYPos + 3);

      rightYPos += 4;
    });

    pdf.addPage();
    yPos = 15;

    pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 58, 138);
    pdf.text("STOCK READINGS", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    const addStockReadingsToPage = (
      pdfInstance,
      stockDataInput,
      currentY,
      width,
      height
    ) => {
      if (!stockDataInput || stockDataInput.length === 0) {
        pdfInstance.setFontSize(12);
        pdfInstance.setFont("helvetica", "normal");
        pdfInstance.text(
          "No stock data available for this date",
          width / 2,
          currentY + 20,
          { align: "center" }
        );
        return currentY + 40;
      }

      const stockTableData = [];
      let serialNo = 1;

      stockDataInput.forEach((stock) => {
        if (stock.pageRanges && stock.pageRanges.length > 0) {
          stock.pageRanges.forEach((range, rangeIndex) => {
            stockTableData.push([
              rangeIndex === 0 ? serialNo : "",
              rangeIndex === 0 ? stock.itemName : "",
              rangeIndex === 0
                ? stock.openingStock !== undefined &&
                  stock.openingStock !== null &&
                  stock.openingStock !== ""
                  ? stock.openingStock
                  : 0
                : "",
              rangeIndex === 0
                ? stock.addedStock !== undefined &&
                  stock.addedStock !== null &&
                  stock.addedStock !== ""
                  ? stock.addedStock
                  : 0
                : "",
              rangeIndex === 0
                ? stock.closingStock !== undefined &&
                  stock.closingStock !== null &&
                  stock.closingStock !== ""
                  ? stock.closingStock
                  : 0
                : "",
              range.sold !== undefined &&
              range.sold !== null &&
              range.sold !== ""
                ? range.sold
                : 0,
              `${range.range} - Rs.${range.price}`,
              `Rs.${(Number(range.sold) || 0) * range.price}`,
            ]);
          });
          serialNo++;
        } else {
          stockTableData.push([
            serialNo,
            stock.itemName || "",
            stock.openingStock !== undefined &&
            stock.openingStock !== null &&
            stock.openingStock !== ""
              ? stock.openingStock
              : 0,
            stock.addedStock !== undefined &&
            stock.addedStock !== null &&
            stock.addedStock !== ""
              ? stock.addedStock
              : 0,
            stock.closingStock !== undefined &&
            stock.closingStock !== null &&
            stock.closingStock !== ""
              ? stock.closingStock
              : 0,
            stock.sold !== undefined &&
            stock.sold !== null &&
            stock.sold !== ""
              ? stock.sold
              : 0,
            `Rs.${stock.amount || 0}`,
            `Rs.${(Number(stock.sold) || 0) * (stock.amount || 0)}`,
          ]);
          serialNo++;
        }
      });

      const totalAmount = stockDataInput.reduce((total, stock) => {
        if (stock.pageRanges && stock.pageRanges.length > 0) {
          return (
            total +
            stock.pageRanges.reduce((subTotal, range) => {
              const sold = Number(range.sold) || 0;
              return subTotal + sold * range.price;
            }, 0)
          );
        } else if (stock.amount) {
          const sold = Number(stock.sold) || 0;
          return total + sold * stock.amount;
        }
        return total;
      }, 0);

      stockTableData.push([
        "",
        "TOTAL STOCK AMOUNT",
        "",
        "",
        "",
        "",
        "",
        `Rs.${totalAmount.toFixed(2)}`,
      ]);

      pdfInstance.autoTable({
        head: [
          [
            "S.No",
            "Item Name",
            "Open",
            "Added",
            "Closing",
            "Sold",
            "Unit Price",
            "Amount",
          ],
        ],
        body: stockTableData,
        startY: currentY,
        theme: "grid",
        headStyles: {
          fillColor: [220, 220, 220],
          textColor: 0,
          fontSize: 8,
          fontStyle: "bold",
          halign: "center",
        },
        styles: {
          fontSize: 6,
          cellPadding: 2,
          textColor: [51, 51, 51],
        },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 55 },
          2: { cellWidth: 15, halign: "center" },
          3: { cellWidth: 15, halign: "center" },
          4: { cellWidth: 15, halign: "center" },
          5: { cellWidth: 15, halign: "center" },
          6: { cellWidth: 35 },
          7: { cellWidth: 20, halign: "right" },
        },
        didParseCell: (dataCell) => {
          if (dataCell.row.index === stockTableData.length - 1) {
            dataCell.cell.styles.fillColor = [220, 220, 220];
            dataCell.cell.styles.textColor = 0;
            dataCell.cell.styles.fontStyle = "bold";
          }
        },
        margin: { left: 10, right: 10 },
      });

      return pdfInstance.lastAutoTable.finalY + 10;
    };

    addStockReadingsToPage(pdf, data.stock, yPos, pageWidth, pageHeight);

    const formattedDate = selectedDate.split("-").reverse().join("-");
    pdf.save(`Printz_Shop_Report_${data.branch}_${formattedDate}.pdf`);
    toast.success("PDF generated successfully!");
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Loading timeout reached, forcing loading to false");
        setLoading(false);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading) {
    return (
      <div className="revenue-page-container" style={{ alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid #d1fae5",
            borderTop: "3px solid #059669",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "16px",
          }}
        />
        <p style={{ color: "#475569", fontWeight: 500 }}>Loading PDF Generator...</p>
      </div>
    );
  }

  return (
    <div className="revenue-page-container">
      <ToastContainer />

      {/* Header Banner - Full Width Green Gradient */}
      <div className="printz-header-banner-full">
        <div className="printz-header-title-area">
          <h1>
            <FileDown size={20} color="#059669" />
            Generate Daily PDF Report — {branchName}
          </h1>
        </div>
      </div>

      {/* Modern Filter Card */}
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
          {/* Left: Bigger Heading with Icon */}
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
                fontSize: "20px",
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.01em",
              }}
            >
              Select Report Date
            </h2>
          </div>

          {/* Right: Calendar Input Field + Status Badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ width: "220px", minWidth: "200px" }}>
              <CalendarSelect
                id="report-date-picker"
                selected={
                  selectedDate ? new Date(selectedDate + "T00:00:00") : null
                }
                onChange={handleDateChange}
                highlightDates={approvedDates}
                maxDate={new Date()}
                dateFormat="yyyy-MM-dd"
                placeholder="Choose date..."
                required
                triggerStyle={{ height: "42px" }}
              />
            </div>

            {dateSelected && (
              <span
                className="revenue-badge-available"
                style={{
                  background: "#ecfdf5",
                  color: "#047857",
                  borderColor: "#a7f3d0",
                }}
              >
                <CheckCircle2 size={13} /> Data Available for {selectedDate}
              </span>
            )}
            {branchName && (
              <span className="revenue-badge-available">
                <CheckCircle2 size={13} /> {branchName} Branch
              </span>
            )}
            {dateSelected && (
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleToggleContent}
                  className="manager-refresh-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    background: showTable ? "#f1f5f9" : "#ffffff",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  {showTable ? <EyeOff size={15} /> : <Eye size={15} />}
                  {showTable ? "Hide Content Preview" : "Show Content Preview"}
                </button>

                <button
                  onClick={generatePdfTable}
                  disabled={isLoading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 18px",
                    fontSize: "13px",
                    background: "#059669",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: isLoading ? "not-allowed" : "pointer",
                  }}
                >
                  <FileDown size={15} />
                  {isLoading ? "Generating..." : "Download PDF"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Select Date Placeholder */}
      {!dateSelected && (
        <div
          className="revenue-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "#ecfdf5",
              border: "1.5px solid #a7f3d0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#059669",
            }}
          >
            <Calendar size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#1e293b" }}>
            No Report Date Selected
          </h3>
          <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b", maxWidth: "460px" }}>
            Please select an authorized date above to preview reading summaries and generate the formatted PDF report for {branchName || "your branch"}.
          </p>
        </div>
      )}

      {/* Report Tables Preview */}
      {showTable && dateSelected && (
        <div style={{ width: "100%", marginTop: "4px" }}>
          <PdfGeneratorTable
            userData={userData}
            pdfDate={selectedDate}
          />
        </div>
      )}
    </div>
  );
};

export default PdfGenerator;
