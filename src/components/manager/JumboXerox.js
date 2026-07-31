import React from "react";

import { useState, useEffect, useCallback, useMemo } from "react";
import { db, auth } from "../../services/authservice";
import {
  addDoc,
  getDocs,
  collection,
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
  FaSave,
  FaExclamationTriangle,
  FaDownload,
} from "react-icons/fa";
import "../../styles/totalAmountDisplay.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

const JumboXerox = () => {
  const [rows, setRows] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [jumboXeroxConfig, setJumboXeroxConfig] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);

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

  const initialJumboCounter = useMemo(
    () => ({
      start: "",
      end: "",
      sftPrinted: "",
    }),
    []
  );

  const [jumboRows, setJumboRows] = useState(initialJumboRows);
  const [jumboCounter, setJumboCounter] = useState(initialJumboCounter);
  const [date, setDate] = useState("");
  const [approvedDates, setApprovedDates] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [userId, setUserId] = useState(null);
  const [totalAmount1, setTotalAmount1] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasExistingJumboData, setHasExistingJumboData] = useState(false);

  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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
        itemName: "DNP PHOTO PRINTING",
        amount: 0,
        key: "dnpPhotoPrinting",
        type: "manual",
      },
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
        itemName: "PAYTM & QR MACHINE",
        amount: 0,
        key: "paytmQr",
        type: "manual",
      },
      { itemName: "EXPENSE", amount: 0, key: "expense", type: "manual" },
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
        setIsLoading(true);
        const user = auth.currentUser;
        if (user) {
          setUserId(user.uid);
          const userDoc = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userDoc);
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            setBranchName(userData.branch);
          } else {
            setError("User data not found");
            toast.error("User data not found");
          }
        } else {
          setError("User not authenticated");
          toast.error("User not authenticated");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError(`Failed to fetch user data`);
        toast.error(`Failed to fetch user data`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    if (!branchName) return;

    const printersQuery = query(
      collection(db, "printers"),
      where("branchName", "==", branchName)
    );

    const unsubscribePrinters = onSnapshot(
      printersQuery,
      (querySnapshot) => {
        try {
          const printersData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          console.log("Printers loaded:", printersData);
          setPrinters(printersData);

          const dynamicRows = generateDynamicRows(printersData);
          setRows(dynamicRows);
        } catch (error) {
          console.error("Error loading printers:", error);
          toast.error("Failed to load printers");
        }
      },
      (error) => {
        console.error("Error in printers snapshot:", error);
        toast.error("Failed to load printers");
      }
    );

    return () => unsubscribePrinters();
  }, [branchName, generateDynamicRows]);

  useEffect(() => {
    if (!branchName) return;

    setConfigLoading(true);
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

          console.log("JumboXerox config loaded:", configData);
          setJumboXeroxConfig(configData);
          setConfigLoading(false);
        } catch (error) {
          console.error("Error loading JumboXerox config:", error);
          toast.error("Failed to load JumboXerox configuration");
          setConfigLoading(false);
        }
      },
      (error) => {
        console.error("Error in JumboXerox config snapshot:", error);
        toast.error("Failed to load JumboXerox configuration");
        setConfigLoading(false);
      }
    );

    return () => unsubscribeConfig();
  }, [branchName]);

  useEffect(() => {
    if (!date || !userId || !branchName || rows.length === 0) return;

    const dateString =
      typeof date === "string" ? date : formatDateToYYYYMMDD(date);

    const totalAmountQuery = query(
      collection(db, "totalAmountReadings"),
      where("userId", "==", userId),
      where("branchName", "==", branchName),
      where("date", "==", dateString)
    );

    const jumboXeroxQuery = query(
      collection(db, "jumboXeroxReadings"),
      where("userId", "==", userId),
      where("branchName", "==", branchName),
      where("date", "==", dateString)
    );

    const unsubscribeTotalAmount = onSnapshot(
      totalAmountQuery,
      async (querySnapshot) => {
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          setTotalAmount1(docData.totalAmount || 0);

          const updatedRows = [...rows];

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

          setRows(updatedRows);
        } else {
          const resetRows = generateDynamicRows(printers);
          setRows(resetRows);
        }
      }
    );

    const unsubscribeJumboXerox = onSnapshot(
      jumboXeroxQuery,
      (querySnapshot) => {
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          setHasExistingJumboData(true);

          const savedRows = docData.rows.map((row) => ({
            ...row,
            qty: row.qty === 0 ? "" : row.qty,
            amount: row.amount === 0 ? "" : row.amount,
            unitPrice:
              row.unitPrice || row.unitPrice === 0
                ? row.unitPrice
                : row.unitPrice,
          }));

          setJumboRows(savedRows || initialJumboRows);

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
          setHasExistingJumboData(false);
          setJumboRows(initialJumboRows);
          setJumboCounter(initialJumboCounter);
        }
      }
    );

    return () => {
      unsubscribeTotalAmount();
      unsubscribeJumboXerox();
    };
  }, [
    date,
    userId,
    branchName,
    initialJumboRows,
    generateDynamicRows,
    printers,
  ]);

  const handleInputChange = (key, value) => {
    toast.warning(
      "Total Amount readings are managed from another page and cannot be edited here"
    );
    return;
  };

  const handleJumboInputChange = (index, field, value) => {
    if (!date) {
      toast.warning("Please select a date first");
      return;
    }

    const cleanedValue =
      value === ""
        ? ""
        : Number.parseFloat(value.replace(/[^0-9.]/g, "")) || "";
    const updatedJumboRows = [...jumboRows];
    updatedJumboRows[index][field] = cleanedValue;

    if ((field === "qty" || field === "unitPrice") && cleanedValue !== "") {
      const qty = field === "qty" ? cleanedValue : updatedJumboRows[index].qty;
      const unitPrice =
        field === "unitPrice"
          ? cleanedValue
          : updatedJumboRows[index].unitPrice;

      if (qty !== "" && unitPrice !== "") {
        updatedJumboRows[index].amount = Number(qty) * Number(unitPrice);
      }
    }

    setJumboRows(updatedJumboRows);
  };

  const handleCounterChange = (field, value) => {
    if (!date) {
      toast.warning("Please select a date first");
      return;
    }

    const cleanedValue =
      field === "sftPrinted"
        ? value
        : value === ""
        ? ""
        : Number.parseFloat(value.replace(/[^0-9.]/g, "")) || "";
    const updatedCounter = { ...jumboCounter, [field]: cleanedValue };

    if (
      (field === "start" || field === "end") &&
      updatedCounter.start !== "" &&
      updatedCounter.end !== ""
    ) {
      updatedCounter.sftPrinted = Math.abs(
        Number(updatedCounter.end) - Number(updatedCounter.start)
      ).toFixed(2);
    }

    setJumboCounter(updatedCounter);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!date) {
      toast.error("Please select a date first");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error("User is not authenticated");
      return;
    }

    try {
      setIsLoading(true);

      if (hasExistingJumboData) {
        const dateString =
          typeof date === "string" ? date : formatDateToYYYYMMDD(date);
        toast.error(
          `Jumbo Xerox data for ${dateString} has already been entered`
        );
        return;
      }

      const dateString =
        typeof date === "string" ? date : formatDateToYYYYMMDD(date);

      const rowsForStorage = jumboRows.map((row) => ({
        ...row,
        qty: row.qty === "" ? 0 : Number(row.qty),
        amount: row.amount === "" ? 0 : Number(row.amount),
        unitPrice: row.unitPrice === "" ? 0 : Number(row.unitPrice),
      }));

      const counterForStorage = {
        start: jumboCounter.start === "" ? 0 : Number(jumboCounter.start),
        end: jumboCounter.end === "" ? 0 : Number(jumboCounter.end),
        sftPrinted: jumboCounter.sftPrinted || "0.00",
      };

      await addDoc(collection(db, "jumboXeroxReadings"), {
        userId,
        branchName,
        date: dateString,
        rows: rowsForStorage,
        jumboCounter: counterForStorage,
        totalQty: calculateJumboTotals(rowsForStorage).qty,
        totalAmount: calculateJumboTotals(rowsForStorage).amount,
        timestamp: new Date(),
      });

      toast.success("Jumbo Xerox data saved successfully");
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error(`Failed to save data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = async (selectedDate) => {
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      console.error("Invalid date object:", selectedDate);
      alert("Please select a valid date.");
      return;
    }

    const today = new Date();
    const todayLocal = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const selectedLocal = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );

    const isApprovedDate = approvedDates.some((approvedDate) => {
      const approvedLocal = new Date(
        approvedDate.getFullYear(),
        approvedDate.getMonth(),
        approvedDate.getDate()
      );
      return approvedLocal.getTime() === selectedLocal.getTime();
    });

    if (selectedLocal > todayLocal) {
      alert("Future dates are not allowed.");
      return;
    }

    if (selectedLocal < todayLocal && !isApprovedDate) {
      setDate("");
      const requestCollection = collection(db, "pastDateRequests");
      const q = query(
        requestCollection,
        where("requestedDate", "==", convertToIST(selectedDate)),
        where("status", "==", null),
        where("type", "==", "jumboXerox")
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        alert("Request already raised and waiting for approval.");
        return;
      }
      const confirmPastDate = window.confirm(
        "Do you want to enter the data for the past date?"
      );

      if (confirmPastDate) {
        try {
          const istDate = convertToIST(selectedDate);
          const requestCollection = collection(db, "pastDateRequests");
          await addDoc(requestCollection, {
            requestedBy: userId,
            requestedDate: istDate,
            requestedBranch: branchName,
            status: null,
            type: "jumboXerox",
          });
          alert("Your request for the past date has been raised.");
        } catch (error) {
          console.error("Error adding request:", error);
          alert("Failed to record your request. Please try again.");
        }
      } else {
        setDate(null);
      }
    } else {
      const formattedDate = formatDateToYYYYMMDD(selectedDate);
      setDate(formattedDate);
    }
  };

  useEffect(() => {
    const fetchApprovedDates = async () => {
      try {
        const pastDateRequestsCollection = collection(db, "pastDateRequests");
        const approvedQuery = query(
          pastDateRequestsCollection,
          where("status", "==", "Approved"),
          where("type", "==", "jumboXerox")
        );
        const querySnapshot = await getDocs(approvedQuery);
        const dates = querySnapshot.docs.map((doc) => {
          const requestedDate = doc.data().requestedDate;
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
  }, []);

  const convertToIST = (date) => {
    const offsetIST = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + offsetIST);
    const formattedISTDate = `${istDate.getFullYear()}-${String(
      istDate.getMonth() + 1
    ).padStart(2, "0")}-${String(istDate.getDate()).padStart(2, "0")} ${String(
      istDate.getHours()
    ).padStart(2, "0")}:${String(istDate.getMinutes()).padStart(
      2,
      "0"
    )}:${String(istDate.getSeconds()).padStart(2, "0")}`;
    return formattedISTDate;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const generatePDF = () => {
    if (!date) {
      toast.warning("Please select a date first");
      return;
    }

    try {
      setIsLoading(true);
      toast.info("Generating PDF, please wait...");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.width;
      let yPosition = 15;

      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 58, 138);
      pdf.text(branchName, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 8;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      const displayDate =
        typeof date === "string"
          ? new Date(date).toLocaleDateString()
          : date.toLocaleDateString();
      pdf.text(`Date: ${displayDate}`, pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 20;

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 58, 138);
      pdf.text("JUMBO XEROX READINGS", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 15;

      const totalAmountTableData = rows.map((row) => [
        row.itemName,
        row.amount ? `Rs.${row.amount.toFixed(2)}` : "",
      ]);

      totalAmountTableData.push(["TOTAL", `Rs.${totalAmount1.toFixed(2)}`]);

      const jumboTableData = [];
      const groupedJumboData = groupJumboDataByType(jumboRows);

      const typeOrder = ["COLOUR", "B/W", "SCAN"];
      typeOrder.forEach((type) => {
        if (groupedJumboData[type]) {
          jumboTableData.push([type, "", "", ""]);
          groupedJumboData[type].forEach((row) => {
            const qty = row.qty === "" ? "" : row.qty;
            const unitPrice =
              row.unitPrice === ""
                ? ""
                : `Rs.${Number(row.unitPrice).toFixed(2)}`;
            const amount =
              row.amount === "" ? "" : `Rs.${Number(row.amount).toFixed(2)}`;
            jumboTableData.push([row.size, unitPrice, qty, amount]);
          });
        }
      });

      Object.keys(groupedJumboData).forEach((type) => {
        if (!typeOrder.includes(type)) {
          jumboTableData.push([type, "", "", ""]);
          groupedJumboData[type].forEach((row) => {
            const qty = row.qty === "" ? "" : row.qty;
            const unitPrice =
              row.unitPrice === ""
                ? ""
                : `Rs.${Number(row.unitPrice).toFixed(2)}`;
            const amount =
              row.amount === "" ? "" : `Rs.${Number(row.amount).toFixed(2)}`;
            jumboTableData.push([row.size, unitPrice, qty, amount]);
          });
        }
      });

      const jumboTotals = calculateJumboTotals(jumboRows);
      jumboTableData.push([
        "TOTAL",
        "",
        jumboTotals.qty || "",
        jumboTotals.amount ? `Rs.${jumboTotals.amount.toFixed(2)}` : "",
      ]);

      const leftMargin = 15;
      const rightMargin = 15;
      const tableWidth = (pageWidth - leftMargin - rightMargin - 15) / 2;

      pdf.autoTable({
        head: [["Item Name", "Amount"]],
        body: totalAmountTableData,
        startY: yPosition,
        margin: {
          left: leftMargin,
          right: pageWidth - leftMargin - tableWidth,
        },
        tableWidth: tableWidth,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: [51, 51, 51],
          halign: "left",
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: tableWidth * 0.65 },
          1: { halign: "right", cellWidth: tableWidth * 0.35 },
        },
        didParseCell: (data) => {
          if (data.row.index === totalAmountTableData.length - 1) {
            data.cell.styles.fillColor = [30, 58, 138];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      const leftTableEndY = pdf.lastAutoTable.finalY;

      pdf.autoTable({
        head: [["Type/Size", "Unit Price", "QTY", "Amount"]],
        body: jumboTableData,
        startY: yPosition,
        margin: { left: leftMargin + tableWidth + 15, right: rightMargin },
        tableWidth: tableWidth,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: [51, 51, 51],
          halign: "center",
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: tableWidth * 0.35 },
          1: { cellWidth: tableWidth * 0.25, halign: "right" },
          2: { cellWidth: tableWidth * 0.15 },
          3: { cellWidth: tableWidth * 0.25, halign: "right" },
        },
        didParseCell: (data) => {
          if (
            typeOrder.includes(data.cell.raw) ||
            (data.cell.raw &&
              data.cell.raw !== "TOTAL" &&
              data.row.index < jumboTableData.length - 1 &&
              jumboTableData[data.row.index][2] === "")
          ) {
            data.cell.styles.fillColor = [139, 69, 19];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = "bold";
          }
          if (data.row.index === jumboTableData.length - 1) {
            data.cell.styles.fillColor = [30, 58, 138];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      const rightTableEndY = pdf.lastAutoTable.finalY;
      const jumboXeroxTableEndY = Math.max(leftTableEndY, rightTableEndY) + 10;

      const counterData = [
        ["START COUNTER", jumboCounter.start || ""],
        ["END COUNTER", jumboCounter.end || ""],
        ["SFT PRINTED", jumboCounter.sftPrinted || ""],
      ];

      pdf.autoTable({
        head: [["Jumbo Counter", "Value"]],
        body: counterData,
        startY: jumboXeroxTableEndY,
        margin: { left: leftMargin + tableWidth + 15, right: rightMargin },
        tableWidth: tableWidth,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: [51, 51, 51],
        },
        columnStyles: {
          0: {
            fontStyle: "bold",
            fillColor: [248, 250, 252],
            cellWidth: tableWidth * 0.6,
          },
          1: { halign: "center", cellWidth: tableWidth * 0.4 },
        },
      });

      const dateString =
        typeof date === "string" ? date : formatDateToYYYYMMDD(date);
      const formattedDate = dateString.split("-").reverse().join("-");
      pdf.save(`JumboXerox_${branchName}_${formattedDate}.pdf`);

      toast.success("PDF generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const jumboTotals = calculateJumboTotals(jumboRows);
  const groupedJumboData = groupJumboDataByType(jumboRows);

  if (isLoading && (!branchName || configLoading)) {
    return (
      <div className="total-loading-container">
        <div className="total-loading-spinner"></div>
        <p>Loading branch data and JumboXerox configuration...</p>
      </div>
    );
  }

  if (error && !branchName) {
    return (
      <div className="total-error-container">
        <FaExclamationTriangle className="total-error-icon" />
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="total-retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!configLoading && jumboXeroxConfig.length === 0) {
    return (
      <div className="total-error-container">
        <FaExclamationTriangle className="total-error-icon" />
        <h3>No JumboXerox Configuration Found</h3>
        <p>
          Please contact admin to add JumboXerox configuration for {branchName}
        </p>
      </div>
    );
  }

  return (
    <div className="jumbo-main-container">
      <ToastContainer />
      <div className="jumbo-page-header">
        <h2>Add Jumbo Xerox Readings for {branchName}</h2>
        <p>Submit usage details for this branch.</p>
      </div>

      <div className="printer-date-picker-container">
        <div className="printer-date-picker-wrapper">
          <label htmlFor="amount-date">Select Date</label>
          <div className="printer-date-input-wrapper">
            <FaCalendarAlt className="printer-date-icon" />
            <DatePicker
              id="amount-date"
              selected={date ? new Date(date) : null}
              onChange={handleDateChange}
              highlightDates={approvedDates}
              dateFormat="yyyy-MM-dd"
              required
              className="printer-date-input"
            />
          </div>
        </div>
        {date && (
          <button
            onClick={generatePDF}
            className="printer-download-button"
            disabled={isLoading}
          >
            <FaDownload /> Download PDF
          </button>
        )}
      </div>

      {date && approvedDates ? (
        <>
          <form onSubmit={handleSubmit} className="jumbo-main-form">
            <div className="jumbo-tables-container">
              {}
              <div className="jumbo-table-column">
                <div className="jumbo-table-card">
                  <div className="jumbo-table-header">
                    <h3>Total Amount Readings (View Only)</h3>
                  </div>
                  <div className="jumbo-table-content">
                    <table className="jumbo-readings-table">
                      <thead>
                        <tr>
                          <th>Items</th>
                          <th>Total Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => (
                          <tr
                            key={index}
                            className={
                              row.key === "totalBusiness" ||
                              row.key === "cashAsPerAccounts"
                                ? "jumbo-highlight-row"
                                : ""
                            }
                          >
                            <td className="jumbo-reading-type">
                              {row.itemName}
                            </td>
                            <td>
                              <input
                                type="number"
                                value={row.amount}
                                onChange={(e) =>
                                  handleInputChange(row.key, e.target.value)
                                }
                                className="jumbo-reading-input"
                                disabled={true}
                                min="0"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="jumbo-total-row">
                          <td>Grand Total (After Deductions)</td>
                          <td className="jumbo-calculated-value">
                            {formatCurrency(totalAmount1)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {}
              <div className="jumbo-table-column">
                <div className="jumbo-table-card">
                  <div className="jumbo-table-header">
                    <h3>Large Format Printing</h3>
                    <div className="jumbo-table-actions">
                      {hasExistingJumboData && (
                        <div className="jumbo-completed-badge">
                          <FaExclamationTriangle /> Data exists for this date
                        </div>
                      )}
                      {!hasExistingJumboData && (
                        <button
                          type="button"
                          onClick={handleSubmit}
                          className="printer-save-button"
                          disabled={isLoading}
                        >
                          <FaSave /> Save Jumbo Data
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="jumbo-table-content">
                    <table className="jumbo-readings-table">
                      <thead>
                        <tr>
                          <th>Type/Size</th>
                          <th>Unit Price (₹)</th>
                          <th>QTY</th>
                          <th>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(groupedJumboData).map(
                          ([type, items]) => (
                            <React.Fragment key={type}>
                              {}
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

                              {}
                              {items.map((item, idx) => {
                                const globalIndex = jumboRows.findIndex(
                                  (row) =>
                                    row.type === item.type &&
                                    row.size === item.size
                                );
                                return (
                                  <tr key={`${type}-${item.size}-${idx}`}>
                                    <td className="jumbo-reading-type">
                                      {item.size}
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={(e) =>
                                          handleJumboInputChange(
                                            globalIndex,
                                            "unitPrice",
                                            e.target.value
                                          )
                                        }
                                        className="jumbo-reading-input"
                                        disabled={
                                          isLoading || hasExistingJumboData
                                        }
                                        min="0"
                                        placeholder=""
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        value={item.qty}
                                        onChange={(e) =>
                                          handleJumboInputChange(
                                            globalIndex,
                                            "qty",
                                            e.target.value
                                          )
                                        }
                                        className="jumbo-reading-input"
                                        disabled={
                                          isLoading || hasExistingJumboData
                                        }
                                        min="0"
                                        placeholder=""
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        value={item.amount}
                                        onChange={(e) =>
                                          handleJumboInputChange(
                                            globalIndex,
                                            "amount",
                                            e.target.value
                                          )
                                        }
                                        className="jumbo-reading-input"
                                        disabled={
                                          isLoading || hasExistingJumboData
                                        }
                                        min="0"
                                        placeholder=""
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          )
                        )}

                        {}
                        <tr className="jumbo-total-row">
                          <td className="jumbo-reading-type" colSpan="2">
                            TOTAL
                          </td>
                          <td className="jumbo-calculated-value">
                            {jumboTotals.qty || ""}
                          </td>
                          <td className="jumbo-calculated-value">
                            {jumboTotals.amount
                              ? formatCurrency(jumboTotals.amount)
                              : ""}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {}

                <div className="jumbo-table-card jumbo-counter-section">
                  <div className="jumbo-table-header">
                    <h3>Large Format Printing Counter Details</h3>
                  </div>
                  <div className="jumbo-table-content">
                    <div className="jumbo-counter-fields">
                      <div className="jumbo-counter-field">
                        <label>Start Counter</label>
                        <input
                          type="number"
                          value={jumboCounter.start}
                          onChange={(e) =>
                            handleCounterChange("start", e.target.value)
                          }
                          className="jumbo-reading-input"
                          disabled={isLoading || hasExistingJumboData}
                          min="0"
                          placeholder=""
                        />
                      </div>
                      <div className="jumbo-counter-field">
                        <label>End Counter</label>
                        <input
                          type="number"
                          value={jumboCounter.end}
                          onChange={(e) =>
                            handleCounterChange("end", e.target.value)
                          }
                          className="jumbo-reading-input"
                          disabled={isLoading || hasExistingJumboData}
                          min="0"
                          placeholder=""
                        />
                      </div>
                      <div className="jumbo-counter-field">
                        <label>SFT Printed</label>
                        <input
                          type="number"
                          value={jumboCounter.sftPrinted}
                          className="jumbo-reading-input"
                          disabled={true}
                          placeholder=""
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </>
      ) : (
        <div className="jumbo-select-date-message">
          <p>Please select a date to view and record data</p>
        </div>
      )}
    </div>
  );
};

export default JumboXerox;
