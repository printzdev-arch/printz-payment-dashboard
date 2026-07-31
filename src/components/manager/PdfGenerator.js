import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import "react-datepicker/dist/react-datepicker.css";
import "../../styles/PdfGenerator.css";
import { FaCalendarAlt, FaDownload } from "react-icons/fa";
import PdfGeneratorTable from "./PdfGeneratorTable";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PdfGenerator = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [dateSelected, setDateSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setApprovedDates] = useState([]);
  const [userId, setUserId] = useState(null);
  const [totalAmount1, setTotalAmount1] = useState(0);
  const [branchName, setBranchName] = useState("");
  const [rows, setRows] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [jumboRows, setJumboRows] = useState([]);
  const [previousBalanceRows, setPreviousBalanceRows] = useState([]);
  const [paymentToBeCollectedRows, setPaymentToBeCollectedRows] = useState([]);
  const [jumboCounter, setJumboCounter] = useState({
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
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          setUserId(user.uid);
          const firestore = getFirestore();
          const docRef = doc(firestore, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUserData(userData);
            setBranchName(userData.branch);
          } else {
            console.error("No such document!");
            toast.error("User data not found");
          }
        } else {
          toast.error("User not authenticated");
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

    const printersQuery = query(
      collection(getFirestore(), "printers"),
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

    const jumboXeroxQuery = query(
      collection(getFirestore(), "JumboXerox"),
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
        } catch (error) {
          console.error("Error loading JumboXerox config:", error);
          toast.error("Failed to load JumboXerox configuration");
        }
      },
      (error) => {
        console.error("Error in JumboXerox config snapshot:", error);
        toast.error("Failed to load JumboXerox configuration");
      }
    );

    return () => unsubscribeConfig();
  }, [branchName]);

  useEffect(() => {
    if (!selectedDate || !userId || !branchName) return;

    const db = getFirestore();
    const dateString = selectedDate;

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
      (querySnapshot) => {
        try {
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
            if (printers.length > 0) {
              setRows(generateDynamicRows(printers));
            }
            setPreviousBalanceRows([]);
            setPaymentToBeCollectedRows([]);
          }
        } catch (error) {
          console.error("Error processing total amount data:", error);
        }
      },
      (error) => {
        console.error("Error in total amount snapshot:", error);
      }
    );

    const unsubscribeJumboXerox = onSnapshot(
      jumboXeroxQuery,
      (querySnapshot) => {
        try {
          if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0].data();

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
          console.error("Error processing jumbo xerox data:", error);
        }
      },
      (error) => {
        console.error("Error in jumbo xerox snapshot:", error);
      }
    );

    return () => {
      unsubscribeTotalAmount();
      unsubscribeJumboXerox();
    };
  }, [
    selectedDate,
    userId,
    branchName,
    initialJumboRows,
    generateDynamicRows,
    printers,
  ]);

  useEffect(() => {
    const fetchApprovedDates = async () => {
      try {
        const firestore = getFirestore();
        const pastDateRequestsCollection = collection(
          firestore,
          "pastDateRequests"
        );
        const approvedQuery = query(
          pastDateRequestsCollection,
          where("status", "==", "Approved"),
          where("type", "==", "pdfGenerator")
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

  const handleDateChange = async (selectedDate) => {
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      console.error("Invalid date object:", selectedDate);
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
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );

    if (selectedLocal > todayLocal) {
      toast.error("Future dates are not allowed.");
      return;
    }

    const formattedDate = formatDateToYYYYMMDD(selectedDate);

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
    const db = getFirestore();
    const branchName = userData?.branch;

    const collectionsToCheck = [
      "printerReadings",
      "jumboXeroxReadings",
      "stockReadings",
      "totalAmountReadings",
    ];

    for (const collectionName of collectionsToCheck) {
      const collectionRef = collection(db, collectionName);
      const q = query(
        collectionRef,
        where("branchName", "==", branchName),
        where("date", "==", dateString)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return true;
      }
    }

    return false;
  };

  const handleShowContent = () => {
    if (!dateSelected) {
      toast.error("Please select a date first!");
      return;
    }
    setShowTable(true);
  };

  const generatePdfTable = async () => {
    if (!dateSelected) {
      toast.error("Please select a date first!");
      return;
    }

    try {
      setIsLoading(true);
      toast.info("Generating PDF, please wait...");

      const data = await fetchAllDataForPdf();
      generateStructuredPdf(data);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("There was an error generating the PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllDataForPdf = async () => {
    const firestore = getFirestore();
    const formattedDate = selectedDate;
    const branchName = userData.branch;

    try {
      const [
        printersData,
        printerReadingsData,
        jumboXeroxData,
        stockData,
        totalAmountData,
      ] = await Promise.all([
        fetchPrinters(firestore, branchName),
        fetchPrinterReadings(firestore, branchName, formattedDate),
        fetchJumboXeroxData(firestore, branchName, formattedDate),
        fetchStockData(firestore, branchName, formattedDate),
        fetchTotalAmountData(firestore, branchName, formattedDate),
      ]);

      return {
        printers: printersData,
        printerReadings: printerReadingsData,
        jumboXerox: jumboXeroxData,
        stock: stockData,
        totalAmount: totalAmountData,
        date: new Date(selectedDate + "T00:00:00"),
        branch: branchName,
      };
    } catch (error) {
      console.error("Error fetching data for PDF:", error);
      throw error;
    }
  };

  const fetchPrinters = async (firestore, branchName) => {
    const printersQuery = query(
      collection(firestore, "printers"),
      where("branchName", "==", branchName)
    );
    const snapshot = await getDocs(printersQuery);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  };

  const fetchPrinterReadings = async (firestore, branchName, date) => {
    const readingsQuery = query(
      collection(firestore, "printerReadings"),
      where("branchName", "==", branchName),
      where("date", "==", date)
    );
    const snapshot = await getDocs(readingsQuery);
    const readings = {};
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.readings) {
        Object.keys(data.readings).forEach((printerId) => {
          readings[printerId] = data.readings[printerId];
        });
      }
    });
    return readings;
  };

  const fetchJumboXeroxData = async (firestore, branchName, date) => {
    const jumboQuery = query(
      collection(firestore, "jumboXeroxReadings"),
      where("branchName", "==", branchName),
      where("date", "==", date)
    );
    const snapshot = await getDocs(jumboQuery);
    return snapshot.empty ? {} : snapshot.docs[0].data();
  };

  const fetchStockData = async (firestore, branchName, date) => {
    const stockQuery = query(
      collection(firestore, "stockReadings"),
      where("branchName", "==", branchName),
      where("date", "==", date)
    );
    const snapshot = await getDocs(stockQuery);
    return snapshot.empty ? [] : snapshot.docs[0].data().stocks || [];
  };

  const fetchTotalAmountData = async (firestore, branchName, date) => {
    const totalQuery = query(
      collection(firestore, "totalAmountReadings"),
      where("branchName", "==", branchName),
      where("date", "==", date)
    );
    const snapshot = await getDocs(totalQuery);
    if (snapshot.empty)
      return {
        rows: [],
        printerData: {},
        stockTotal: 0,
        jumboXeroxTotal: 0,
        previousBalanceRows: [],
        paymentToBeCollectedRows: [],
      };

    const data = snapshot.docs[0].data();
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

    // Calculate previous balance totals for net amount calculations
    const previousBalanceCash = (data.totalAmount.previousBalanceRows || [])
      .filter(r => r.paymentMethod === "cash")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    
    const previousBalanceUPI = (data.totalAmount.previousBalanceRows || [])
      .filter(r => r.paymentMethod === "upi")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const totalAmountTableData = (data.totalAmount.rows || []).map((row) => {
      let displayAmount = row.amount || 0;
      let itemName = row.itemName;

      // Calculate net amounts for cash and UPI (same logic as in UI)
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

    // Add previous balance entries as informational (amounts already included above)
    if (
      data.totalAmount.previousBalanceRows &&
      data.totalAmount.previousBalanceRows.length > 0
    ) {
      totalAmountTableData.push(["", ""]); // Add spacing
      totalAmountTableData.push(["--- PREVIOUS BALANCE BREAKDOWN ---", ""]); // Header
      
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

    totalAmountTableData.push(["TOTAL", `Rs.${(data.totalAmount.totalAmount || 0).toFixed(2)}`]);

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
      pdf,
      stockData,
      yPos,
      pageWidth,
      pageHeight
    ) => {
      if (!stockData || stockData.length === 0) {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        pdf.text(
          "No stock data available for this date",
          pageWidth / 2,
          yPos + 20,
          { align: "center" }
        );
        return yPos + 40;
      }

      const stockTableData = [];
      let serialNo = 1;

      stockData.forEach((stock) => {
        if (stock.pageRanges && stock.pageRanges.length > 0) {
          stock.pageRanges.forEach((range, rangeIndex) => {
            stockTableData.push([
              rangeIndex === 0 ? serialNo : "",
              rangeIndex === 0 ? stock.itemName : "",
              rangeIndex === 0 ? (stock.openingStock !== undefined && stock.openingStock !== null && stock.openingStock !== "") ? stock.openingStock : 0 : "",
              rangeIndex === 0 ? (stock.addedStock !== undefined && stock.addedStock !== null && stock.addedStock !== "") ? stock.addedStock : 0 : "",
              rangeIndex === 0 ? (stock.closingStock !== undefined && stock.closingStock !== null && stock.closingStock !== "") ? stock.closingStock : 0 : "",
              (range.sold !== undefined && range.sold !== null && range.sold !== "") ? range.sold : 0,
              `${range.range} - Rs.${range.price}`,
              `Rs.${(Number(range.sold) || 0) * range.price}`,
            ]);
          });
          serialNo++;
        } else {
          stockTableData.push([
            serialNo,
            stock.itemName || "",
            (stock.openingStock !== undefined && stock.openingStock !== null && stock.openingStock !== "") ? stock.openingStock : 0,
            (stock.addedStock !== undefined && stock.addedStock !== null && stock.addedStock !== "") ? stock.addedStock : 0,
            (stock.closingStock !== undefined && stock.closingStock !== null && stock.closingStock !== "") ? stock.closingStock : 0,
            (stock.sold !== undefined && stock.sold !== null && stock.sold !== "") ? stock.sold : 0,
            `Rs.${stock.amount || 0}`,
            `Rs.${(Number(stock.sold) || 0) * (stock.amount || 0)}`,
          ]);
          serialNo++;
        }
      });

      const totalAmount = stockData.reduce((total, stock) => {
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

      pdf.autoTable({
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
        startY: yPos,
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
        didParseCell: (data) => {
          if (data.row.index === stockTableData.length - 1) {
            data.cell.styles.fillColor = [220, 220, 220];
            data.cell.styles.textColor = 0;
            data.cell.styles.fontStyle = "bold";
          }
        },
        margin: { left: 10, right: 10 },
      });

      return pdf.lastAutoTable.finalY + 10;
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
      <div className="pdf-loading-container">
        <div className="pdf-loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="pdf-generator-container">
      <ToastContainer />
      <div className="pdf-page-header">
        <h2>Generate Daily Report</h2>
        <p>Create comprehensive daily reports for {userData?.branch}</p>
      </div>

      <div className="printer-date-picker-container">
        <div className="printer-date-picker-wrapper">
          <label htmlFor="date-picker">Select Date for Report</label>
          <div className="printer-date-input-wrapper">
            <FaCalendarAlt className="printer-date-icon" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(new Date(e.target.value))}
              className="printer-date-input"
            />
          </div>
        </div>
        {dateSelected && (
          <div className="pdf-action-buttons">
            <button
              onClick={generatePdfTable}
              className="printer-download-button"
              disabled={isLoading}
            >
              <FaDownload /> Download PDF
            </button>
            <button
              onClick={handleShowContent}
              className="printer-download-button"
            >
              <FaDownload /> Show Content
            </button>
          </div>
        )}
      </div>

      {!dateSelected && (
        <div className="printer-select-date-message">
          <p>Please select a date to view and generate the report</p>
        </div>
      )}

      {showTable && dateSelected && (
        <div className="pdf-content-wrapper">
          <PdfGeneratorTable
            userData={userData}
            pdfDate={new Date(selectedDate + "T00:00:00")}
          />
        </div>
      )}
    </div>
  );
};

export default PdfGenerator;
