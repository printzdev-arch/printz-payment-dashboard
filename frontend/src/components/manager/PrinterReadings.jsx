import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import { toast } from "react-toastify";
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
  Check,
  FileSpreadsheet,
  Lock,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Coins,
  DollarSign,
  Eye,
  ArrowRight,
  ShieldCheck,
  Package,
  X,
  Send,
  Clock,
} from "lucide-react";
import "../../styles/dailyStockRevenue.css";
import "../../styles/printerreadings.css";
import CalendarSelect from "../common/CalendarSelect.jsx";
import PrinterReadingsSection from "./dailyreadings/PrinterReadingsSection.jsx";
import JumboXeroxSection from "./dailyreadings/JumboXeroxSection.jsx";
import TotalAmountSection from "./dailyreadings/TotalAmountSection.jsx";
import StockSection from "./dailyreadings/StockSection.jsx";
import DailyReadingsSkeleton from "./dailyreadings/DailyReadingsSkeleton.jsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { resolveBranchId } from "../../services/branchStore";

const convertToIST = (date) => {
  const offsetIST = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + offsetIST);
  const formattedISTDate = `${istDate.getFullYear()}-${String(
    istDate.getMonth() + 1
  ).padStart(2, "0")}-${String(istDate.getDate()).padStart(2, "0")} ${String(
    istDate.getHours()
  ).padStart(2, "0")}:${String(istDate.getMinutes()).padStart(2, "0")}:${String(
    istDate.getSeconds()
  ).padStart(2, "0")}`;
  return formattedISTDate;
};

const STEPS = [
  { id: 1, label: "Printer Readings", shortLabel: "Printers", icon: Printer },
  { id: 2, label: "Large Format", shortLabel: "Large Format", icon: Layers },
  { id: 3, label: "Business & Payments", shortLabel: "Business", icon: Calculator },
  { id: 4, label: "Stock", shortLabel: "Stock", icon: Boxes },
  { id: 5, label: "Review & Submit", shortLabel: "Review", icon: CheckCircle2 },
];

const PrinterReadings = () => {
  const [date, setDate] = useState("");
  const [approvedDates, setApprovedDates] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [printerReadingsLoaded, setPrinterReadingsLoaded] = useState(false);
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);
  const [isStockReadingsSubmitted, setIsStockReadingsSubmitted] =
    useState(false);
  const [csvVerificationData, setCsvVerificationData] = useState({
    showCsvResults: false,
    verificationResults: [],
    getStatusBadge: null,
    getStatusCounts: null,
  });
  const [isFinalStateChecking, setIsFinalStateChecking] = useState(false);
  const [pastDateModal, setPastDateModal] = useState({
    isOpen: false,
    selectedDate: null,
    isSubmitting: false,
  });

  // Stepper & Live Summary States
  const [activeStep, setActiveStep] = useState(1);
  const [savedSteps, setSavedSteps] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  });
  const [liveSummary, setLiveSummary] = useState({
    cashAsPerAccounts: 0,
    totalBusiness: 0,
    totalAmount: 0,
    discount: 0,
    upiCardPayments: 0,
    bankTransfers: 0,
    cashInHand: 0,
    paymentToBeCollected: 0,
    printerTotals: {},
    jumboTotal: 0,
    stockTotal: 0,
    jumboCounter: {},
    previousBalances: [],
  });

  const formatDateToYYYYMMDD = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const handleConfirmPastDateRequest = async () => {
    if (!pastDateModal.selectedDate) return;
    setPastDateModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const istDate = convertToIST(pastDateModal.selectedDate);
      const resolvedBranchId = await resolveBranchId(branchName);
      if (!resolvedBranchId) {
        toast.error("Could not determine valid branch ID. Please refresh and try again.");
        setPastDateModal((prev) => ({ ...prev, isSubmitting: false }));
        return;
      }
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      await api.post("/past-date-requests", {
        requestedBy: currentUser.name && currentUser.email ? `${currentUser.name} (${currentUser.email})` : (currentUser.email || userId),
        requestedByName: currentUser.name || "Manager",
        requestedByEmail: currentUser.email || "",
        requestedByUserId: userId,
        requestedDate: istDate,
        branchId: resolvedBranchId,
        requestedBranch: branchName,
        status: "Pending",
        type: "dailyReadings",
      });
      toast.success(
        "Your request for yesterday has been raised and is awaiting admin approval."
      );
      setPastDateModal({ isOpen: false, selectedDate: null, isSubmitting: false });
    } catch (error) {
      console.error("Error adding request:", error);
      toast.error("Failed to record your request. Please try again.");
      setPastDateModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleCancelPastDateRequest = () => {
    setDate("");
    setPastDateModal({ isOpen: false, selectedDate: null, isSubmitting: false });
  };

  const handlePrinterReadingsLoadingChange = useCallback((isLoaded) => {
    setPrinterReadingsLoaded(isLoaded);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
          setUserId(storedUser.id || storedUser._id);
          const bName = storedUser.branch || storedUser.branchName || localStorage.getItem("userBranchName") || "";
          setBranchName(bName);
          localStorage.setItem("userBranchName", bName);
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
    const fetchApprovedDates = async () => {
      try {
        const res = await api.get("/past-date-requests");
        const allRequests = res.data?.data || [];
        const approvedDocs = allRequests.filter(
          (req) =>
            req.status === "Approved" &&
            (req.appliesToAllBranches ||
              req.requestedBranch?.toLowerCase() === branchName?.toLowerCase() ||
              req.requestedBranch?.toLowerCase() === "all branches")
        );

        const seen = new Set();
        const dates = approvedDocs
          .map((doc) => {
            const requestedDate = doc.requestedDate || "";
            const dateStr = requestedDate.split(" ")[0];
            return new Date(dateStr + "T00:00:00");
          })
          .filter((d) => {
            const key = d.toISOString().slice(0, 10);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
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

    if (branchName) {
      fetchApprovedDates();
    }
  }, [branchName]);

  useEffect(() => {
    const syncLockFromStockReadings = async () => {
      try {
        if (!date || !branchName) {
          setIsFinalStateChecking(false);
          return;
        }
        setIsFinalStateChecking(true);

        const dateString =
          typeof date === "string" ? date : formatDateToYYYYMMDD(date);
        const res = await api.get(
          `/stocks/readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(dateString)}`
        );
        const list = res.data?.data || [];
        if (list.length > 0) {
          const locked = list.some((d) => Boolean(d.isLocked));
          if (locked) setIsFinalSubmitted(true);
        }
      } catch (err) {
        console.error("[v0] Failed to sync lock from stockReadings:", err);
      } finally {
        setIsFinalStateChecking(false);
      }
    };
    syncLockFromStockReadings();
  }, [date, branchName, formatDateToYYYYMMDD]);

  useEffect(() => {
    const checkStockReadingsStatus = async () => {
      if (!date || !branchName) {
        setIsStockReadingsSubmitted(false);
        return;
      }

      try {
        const dateString =
          typeof date === "string" ? date : formatDateToYYYYMMDD(date);
        const isSubmitted = await checkCollectionDataExists(
          "stockReadings",
          branchName,
          dateString
        );
        setIsStockReadingsSubmitted(isSubmitted);
      } catch (error) {
        console.error("Error checking stock readings status:", error);
        setIsStockReadingsSubmitted(false);
      }
    };

    checkStockReadingsStatus();
  }, [date, branchName, formatDateToYYYYMMDD]);

  // Polling for Stepper Badges and Review Summary
  useEffect(() => {
    if (!date || !branchName) return;

    const dateString =
      typeof date === "string" ? date : formatDateToYYYYMMDD(date);

    const fetchLiveSummary = async () => {
      try {
        const [pRes, jRes, tRes, sRes, fRes] = await Promise.all([
          api.get(`/printer-readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(dateString)}`).catch(() => ({ data: { data: [] } })),
          api.get(`/jumbo-xerox/readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(dateString)}`).catch(() => ({ data: { data: [] } })),
          api.get(`/total-amounts?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(dateString)}`).catch(() => ({ data: { data: [] } })),
          api.get(`/stocks/readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(dateString)}`).catch(() => ({ data: { data: [] } })),
          api.get(`/general/finalized-dates?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(dateString)}`).catch(() => ({ data: { data: [] } })),
        ]);

        const pList = pRes.data?.data || [];
        const jList = jRes.data?.data || [];
        const tList = tRes.data?.data || [];
        const sList = sRes.data?.data || [];
        const fList = fRes.data?.data || [];

        setSavedSteps({
          1: pList.length > 0,
          2: jList.length > 0,
          3: tList.length > 0,
          4: sList.length > 0,
          5: fList.length > 0,
        });

        if (fList.length > 0) {
          setIsFinalSubmitted(true);
        }

        const pTotals = {};
        if (pList.length > 0) {
          pList.forEach((d) => {
            const rData = d.readings || {};
            Object.keys(rData).forEach((pid) => {
              const sum = Object.values(rData[pid] || {}).reduce(
                (acc, sz) => acc + (Number(sz.total) || 0),
                0
              );
              pTotals[pid] = sum;
            });
          });
        }

        let jumboTotal = 0;
        let jumboCounter = {};
        if (jList.length > 0) {
          const jData = jList[0];
          jumboTotal = Number(jData.totalAmount) || 0;
          jumboCounter = jData.jumboCounter || {};
        }

        let cashAcc = 0;
        let totBiz = 0;
        let disc = 0;
        let upi = 0;
        let bank = 0;
        let cashHand = 0;
        let toCollect = 0;
        let totalAmountVal = 0;
        let prevBal = [];
        if (tList.length > 0) {
          const tData = tList[0];
          totalAmountVal = Number(tData.totalAmount) || 0;
          prevBal = tData.previousBalanceRows || [];
          (tData.rows || []).forEach((r) => {
            if (r.key === "cashAsPerAccounts") cashAcc = Number(r.amount) || 0;
            if (r.key === "totalBusiness") totBiz = Number(r.amount) || 0;
            if (r.key === "discount") disc = Number(r.amount) || 0;
            if (r.key === "upiCardPayments") upi = Number(r.amount) || 0;
            if (r.key === "bankTransfers") bank = Number(r.amount) || 0;
            if (r.key === "cashInHand") cashHand = Number(r.amount) || 0;
            if (r.key === "paymentToBeCollected") toCollect = Number(r.amount) || 0;
          });
        }

        let sTotal = 0;
        if (sList.length > 0) {
          const sData = sList[0];
          const stocks = sData.stocks || [];
          sTotal = stocks.reduce((acc, st) => {
            if (st.pageRanges && st.pageRanges.length > 0) {
              return (
                acc +
                st.pageRanges.reduce(
                  (sum, rg) => sum + (Number(rg.sold) || 0) * (Number(rg.price) || 0),
                  0
                )
              );
            }
            return acc + (Number(st.sold) || 0) * (Number(st.amount) || 0);
          }, 0);
        }

        setLiveSummary({
          cashAsPerAccounts: cashAcc,
          totalBusiness: totBiz,
          totalAmount: totalAmountVal,
          discount: disc,
          upiCardPayments: upi,
          bankTransfers: bank,
          cashInHand: cashHand,
          paymentToBeCollected: toCollect,
          printerTotals: pTotals,
          jumboTotal,
          stockTotal: sTotal,
          jumboCounter,
          previousBalances: prevBal,
        });
      } catch (err) {
        console.error("Error fetching live summary:", err);
      }
    };

    fetchLiveSummary();
    const interval = setInterval(fetchLiveSummary, 10000);
    return () => clearInterval(interval);
  }, [date, branchName, formatDateToYYYYMMDD]);

  const handleDateChange = useCallback(
    async (selectedDate) => {
      // Reset all relevant states when date changes
      setIsFinalSubmitted(false);
      setDataLoaded(false);
      setIsStockReadingsSubmitted(false);
      setIsFinalSubmitting(false);
      setError(null);
      setIsFinalStateChecking(true); // begin guard during finalizedDates check
      setCsvVerificationData({
        showCsvResults: false,
        verificationResults: [],
        getStatusBadge: null,
      });

      try {
        if (!selectedDate || isNaN(selectedDate.getTime())) {
          console.error("Invalid date object:", selectedDate);
          toast.warning("Please select a valid date.");
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
          toast.warning("Future dates are not allowed.");
          return;
        }

        if (selectedLocal < todayLocal && !isApprovedDate) {
          setDate("");

          const yesterday = new Date(todayLocal);
          yesterday.setDate(yesterday.getDate() - 1);
          const isYesterday = selectedLocal.getTime() === yesterday.getTime();

          if (!isYesterday) {
            toast.warning(
              "Only yesterday's date can be requested for past date entry."
            );
            return;
          }

          const todayFormatted = formatDateToYYYYMMDD(today);
          const currentReadingsDocId = `${branchName}_${todayFormatted.replace(
            /-/g,
            ""
          )}`;

          let hasCurrentData = false;
          const [pCheck, jCheck, tCheck, sCheck] = await Promise.all([
            api.get(`/printer-readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(todayFormatted)}`).catch(() => ({ data: { data: [] } })),
            api.get(`/jumbo-xerox/readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(todayFormatted)}`).catch(() => ({ data: { data: [] } })),
            api.get(`/total-amounts?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(todayFormatted)}`).catch(() => ({ data: { data: [] } })),
            api.get(`/stocks/readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(todayFormatted)}`).catch(() => ({ data: { data: [] } })),
          ]);

          if (
            (pCheck.data?.data || []).length > 0 ||
            (jCheck.data?.data || []).length > 0 ||
            (tCheck.data?.data || []).length > 0 ||
            (sCheck.data?.data || []).length > 0
          ) {
            hasCurrentData = true;
          }

          if (hasCurrentData) {
            toast.error(
              "Cannot request yesterday's date because current date already has data. Please clear today's data first if you want to enter yesterday's data."
            );
            return;
          }

          const existingReqsRes = await api.get("/past-date-requests").catch(() => ({ data: { data: [] } }));
          const existingList = (existingReqsRes.data?.data || []).filter(
            (req) =>
              req.requestedBranch?.toLowerCase() === branchName?.toLowerCase() &&
              (req.type === "dailyReadings" || req.type === "Manual Admin Grant") &&
              (req.status === "Pending" || !req.status)
          );
          if (existingList.length > 0) {
            toast.info("Request already raised and waiting for approval.");
            return;
          }

          // Open modern confirmation modal
          setPastDateModal({
            isOpen: true,
            selectedDate: selectedDate,
            isSubmitting: false,
          });
          return;
        }

        const formattedDate = formatDateToYYYYMMDD(selectedDate);
        setDataLoaded(false);

        // Check finalization status immediately before rendering child components
        try {
          const finalRes = await api.get(
            `/general/finalized-dates?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(formattedDate)}`
          );
          const isFinalized = (finalRes.data?.data || []).length > 0;

          setIsFinalSubmitted(isFinalized);

          if (isFinalized) {
            toast.info(
              "This date has been finalized. Data is locked for editing."
            );
          }
        } catch (error) {
          console.error(
            "Error checking finalization in handleDateChange:",
            error
          );
        }

        setDate(formattedDate);
        setDataLoaded(true);
      } catch (error) {
        console.error("Error in handleDateChange:", error);
      } finally {
        setIsFinalStateChecking(false); // end guard after check completes
      }
    },
    [approvedDates, formatDateToYYYYMMDD, branchName, userId]
  );

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

  const fetchAllDataForPdf = async () => {
    const dateString =
      typeof date === "string" ? date : formatDateToYYYYMMDD(date);

    try {
      const [
        printersData,
        printerReadingsData,
        jumboXeroxData,
        stockData,
        totalAmountData,
      ] = await Promise.all([
        fetchPrinters(branchName),
        fetchPrinterReadings(branchName, dateString),
        fetchJumboXeroxData(branchName, dateString),
        fetchStockData(branchName, dateString),
        fetchTotalAmountData(branchName, dateString),
      ]);

      return {
        printers: printersData,
        printerReadings: printerReadingsData,
        jumboXerox: jumboXeroxData,
        stock: stockData,
        totalAmount: totalAmountData,
        date: new Date(dateString + "T00:00:00"),
        branch: branchName,
      };
    } catch (error) {
      console.error("Error fetching data for PDF:", error);
      throw error;
    }
  };

  const fetchPrinters = async (branchName) => {
    const res = await api.get(`/printers?branchName=${encodeURIComponent(branchName)}`);
    return (res.data?.data || []).map((doc) => ({ id: doc.id || doc._id, ...doc }));
  };

  const fetchPrinterReadings = async (branchName, date) => {
    const res = await api.get(
      `/printer-readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(date)}`
    );
    const readings = {};
    (res.data?.data || []).forEach((doc) => {
      if (doc.readings) {
        Object.keys(doc.readings).forEach((printerId) => {
          readings[printerId] = doc.readings[printerId];
        });
      }
    });
    return readings;
  };

  const fetchJumboXeroxData = async (branchName, date) => {
    const res = await api.get(
      `/jumbo-xerox/readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(date)}`
    );
    const list = res.data?.data || [];
    if (list.length === 0) {
      return { rows: [], jumboCounter: {} };
    }

    const data = list[0];
    return {
      rows: data.rows || [],
      jumboCounter: data.jumboCounter || {},
      totalAmount: data.totalAmount || 0,
    };
  };

  const fetchStockData = async (branchName, date) => {
    const res = await api.get(
      `/stocks/readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(date)}`
    );
    const list = res.data?.data || [];
    return list.length === 0 ? [] : list[0].stocks || [];
  };

  const fetchTotalAmountData = async (branchName, date) => {
    const res = await api.get(
      `/total-amounts?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(date)}`
    );
    const list = res.data?.data || [];
    if (list.length === 0)
      return {
        rows: [],
        printerData: {},
        stockTotal: 0,
        jumboXeroxTotal: 0,
        previousBalanceRows: [],
        paymentToBeCollectedRows: [],
      };

    const data = list[0];
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

  const generatePDF = async () => {
    if (!date) {
      toast.warning("Please select a date first");
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
    pdf.setTextColor(0, 0, 0);
    pdf.text(data.branch.toUpperCase() + " BRANCH", pageWidth / 2, yPos + 8, {
      align: "center",
    });

    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
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
                "";
              break;
            case 1:
              value = sizes[size]?.STARTING || "";
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

    if (yPos > pageHeight - 100) {
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
      .filter((r) => r.paymentMethod === "cash")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const previousBalanceUPI = (data.totalAmount.previousBalanceRows || [])
      .filter((r) => r.paymentMethod === "upi")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const totalAmountTableData = data.totalAmount.rows.map((row) => {
      let displayAmount = row.amount || 0;
      let itemName = row.itemName;

      // Calculate net amounts for cash and UPI (same logic as in UI)
      if (row.key === "cashInHand" && previousBalanceCash > 0) {
        displayAmount = (Number(row.amount) || 0) + previousBalanceCash;
        itemName = `${row.itemName} (Base: ${row.amount || 0
          } + Previous: ${previousBalanceCash})`;
      } else if (row.key === "upiCardPayments" && previousBalanceUPI > 0) {
        displayAmount = (Number(row.amount) || 0) - previousBalanceUPI;
        itemName = `${row.itemName} (Base: ${row.amount || 0
          } - Previous: ${previousBalanceUPI})`;
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

    totalAmountTableData.push([
      "TOTAL",
      `Rs.${data.totalAmount.totalAmount?.toFixed(2) || "0.00"}`,
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

    const jumboRows = data.jumboXerox.rows || [];
    const jumboCounter = data.jumboXerox.jumboCounter || {};

    if (jumboRows.length > 0) {
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

      const groupedData = {};
      jumboRows.forEach((row) => {
        if (!groupedData[row.type]) {
          groupedData[row.type] = [];
        }
        groupedData[row.type].push(row);
      });

      Object.entries(groupedData).forEach(([type, items]) => {
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

          pdf.text(item.size || "", rightColX + 1, rightYPos + 3);
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
    }

    if (Object.keys(jumboCounter).length > 0) {
      pdf.setFillColor(220, 220, 220);
      pdf.rect(rightColX, rightYPos, rightColWidth, 4, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6);
      pdf.text("JUMBO COUNTER", rightColX + 1, rightYPos + 3);
      rightYPos += 4;

      const counterData = [
        ["START", jumboCounter.start || ""],
        ["END", jumboCounter.end || ""],
        ["SFT PRINTED", jumboCounter.sftPrinted || ""],
      ];

      counterData.forEach(([label, value]) => {
        pdf.rect(rightColX, rightYPos, rightColWidth / 2, 4);
        pdf.rect(
          rightColX + rightColWidth / 2,
          rightYPos,
          rightColWidth / 2,
          4
        );

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(5);
        pdf.text(label, rightColX + 1, rightYPos + 3);
        pdf.text(
          String(value),
          rightColX + rightColWidth / 2 + 1,
          rightYPos + 3
        );

        rightYPos += 4;
      });
    }

    if (jumboRows.length === 0 && Object.keys(jumboCounter).length === 0) {
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "normal");
      pdf.text("No jumbo xerox data available", rightColX + 2, rightYPos + 10);
    }

    pdf.addPage();
    yPos = 15;

    pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("STOCK READINGS", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    if (!data.stock || data.stock.length === 0) {
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        "No stock data available for this date",
        pageWidth / 2,
        yPos + 20,
        { align: "center" }
      );
    } else {
      const stockTableData = [];
      let serialNo = 1;

      data.stock.forEach((stock) => {
        if (stock.pageRanges && stock.pageRanges.length > 0) {
          stock.pageRanges.forEach((range, rangeIndex) => {
            stockTableData.push([
              rangeIndex === 0 ? serialNo : "",
              rangeIndex === 0 ? stock.itemName : "",
              rangeIndex === 0 ? stock.category || "" : "",
              rangeIndex === 0 ? stock.openingStock || "" : "",
              rangeIndex === 0 ? stock.addedStock || "" : "",
              rangeIndex === 0 ? stock.closingStock || "" : "",
              range.range,
              range.sold || "",
              `Rs.${range.price}`,
              `Rs.${(Number(range.sold) || 0) * range.price}`,
            ]);
          });
          serialNo++;
        } else {
          stockTableData.push([
            serialNo,
            stock.itemName || "",
            stock.category || "",
            stock.openingStock || "",
            stock.addedStock || "",
            stock.closingStock || "",
            "",
            stock.sold || "",
            `Rs.${stock.amount || 0}`,
            `Rs.${(Number(stock.sold) || 0) * (stock.amount || 0)}`,
          ]);
          serialNo++;
        }
      });

      const totalAmount = data.stock.reduce((total, stock) => {
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

      // Add TOTAL row to stockTableData
      stockTableData.push([
        "",
        "TOTAL STOCK AMOUNT",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `Rs.${totalAmount.toFixed(2)}`,
      ]);

      // Sanitize the table data to replace empty/missing values with "0"
      const sanitizedStockTableData = stockTableData.map((row) =>
        row.map((cell, index) => {
          // Preserve TOTAL row styling
          if (row[1] === "TOTAL STOCK AMOUNT") return cell;

          // Replace empty, null, or undefined values with "0" (except for S.No)
          if (cell === "" || cell == null) {
            return index === 0 ? "" : "0";
          }

          return cell;
        })
      );

      // Center the table horizontally
      const totalTableWidth = 177;
      const pageMargin = (pageWidth - totalTableWidth) / 2;

      // Generate the table using jsPDF-AutoTable
      pdf.autoTable({
        head: [
          [
            "S.No",
            "Item Name",
            "Category",
            "Opening",
            "Added",
            "Closing",
            "Pages",
            "Sold",
            "Unit Price",
            "Amount",
          ],
        ],
        body: sanitizedStockTableData,
        startY: yPos,
        theme: "grid",
        headStyles: {
          fillColor: [0, 0, 0],
          textColor: 255,
          fontSize: 7,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 6,
          cellPadding: 1.5,
          textColor: [0, 0, 0],
          overflow: "linebreak",
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" }, // S.No
          1: { cellWidth: 35 }, // Item Name
          2: { cellWidth: 18 }, // Opening
          3: { cellWidth: 12, halign: "center" }, // Added
          4: { cellWidth: 12, halign: "center" }, // Closing
          5: { cellWidth: 12, halign: "center" }, // Pages
          6: { cellWidth: 20 }, // Sold
          7: { cellWidth: 12, halign: "center" }, // Unit Price
          8: { cellWidth: 18 }, // Amount
          9: { cellWidth: 18, halign: "right" }, // Total Row (last column)
        },
        didParseCell: (data) => {
          // Apply custom styling to the TOTAL row
          if (data.row.index === sanitizedStockTableData.length - 1) {
            data.cell.styles.fillColor = [0, 0, 0];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: (data) => {
          // Draw border around the page
          data.doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
        },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: pageMargin, right: pageMargin, top: 10, bottom: 10 },
        tableWidth: "auto",
        showHead: "everyPage",
      });
    }

    const formattedDate = date.split("-").reverse().join("-");
    pdf.save(`DailyReadings_${data.branch}_${formattedDate}.pdf`);
    toast.success("PDF downloaded successfully!!");
  };

  const handleFinalSubmit = async () => {
    if (!date || !branchName || !userId) {
      toast.error("Missing required data for final submission");
      return;
    }

    try {
      setIsFinalSubmitting(true);
      const dateString =
        typeof date === "string" ? date : formatDateToYYYYMMDD(date);

      const [
        printerReadingsExist,
        jumboXeroxExist,
        totalAmountExist,
        stockExist,
      ] = await Promise.all([
        checkCollectionDataExists("printerReadings", branchName, dateString),
        checkCollectionDataExists("jumboXeroxReadings", branchName, dateString),
        checkCollectionDataExists(
          "totalAmountReadings",
          branchName,
          dateString
        ),
        checkCollectionDataExists("stockReadings", branchName, dateString),
      ]);

      const missingSections = [];
      if (!printerReadingsExist) missingSections.push("Printer Readings");
      if (!jumboXeroxExist) missingSections.push("Jumbo Xerox");
      if (!totalAmountExist) missingSections.push("Total Amount");
      if (!stockExist) missingSections.push("Stock");

      if (missingSections.length > 0) {
        toast.error(
          `Cannot finalize: Missing data for ${missingSections.join(
            ", "
          )}. Please complete all sections.`
        );
        setIsFinalSubmitting(false);
        return;
      }

      setIsFinalSubmitted(true);

      await api.post("/general/finalized-dates", {
        branchName,
        date: dateString,
        finalizedAt: new Date(),
        finalizedBy: userId,
        sections: {
          printerReadings: true,
          jumboXerox: true,
          totalAmount: true,
          stock: true,
        },
      });

      toast.success("All data has been finalized and locked successfully!");

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error in final submission:", error);
      toast.error("Failed to finalize data. Please try again.");
      setIsFinalSubmitted(false);
    } finally {
      setIsFinalSubmitting(false);
    }
  };

  const checkCollectionDataExists = async (
    collectionName,
    branchName,
    dateString
  ) => {
    try {
      let endpoint = "";
      if (collectionName === "printerReadings") {
        endpoint = `/printer-readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(dateString)}`;
      } else if (collectionName === "jumboXeroxReadings") {
        endpoint = `/jumbo-xerox/readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(dateString)}`;
      } else if (collectionName === "totalAmountReadings") {
        endpoint = `/total-amounts?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(dateString)}`;
      } else if (collectionName === "stockReadings") {
        endpoint = `/stocks/readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(dateString)}`;
      }

      if (!endpoint) return false;
      const res = await api.get(endpoint);
      return (res.data?.data || []).length > 0;
    } catch (err) {
      console.error(`Error checking ${collectionName} exists:`, err);
      return false;
    }
  };

  const handleCsvVerificationChange = useCallback((data) => {
    setCsvVerificationData(data);
  }, []);

  if (isLoading && !branchName) {
    return (
      <div className="revenue-page-container">
        <DailyReadingsSkeleton
          message="Loading branch profile..."
          subtitle="Initializing manager permissions and configurations..."
        />
      </div>
    );
  }

  if (error && !branchName) {
    return (
      <div className="revenue-page-container">
        <div className="printer-error-container">
          <AlertTriangle size={36} color="#ef4444" />
          <h3 style={{ marginTop: "12px" }}>Error Loading Data</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="printz-btn-primary"
            style={{ marginTop: "12px", background: "#ef4444" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="revenue-page-container">
      {/* Modern Header Banner */}
      <div className="printz-header-banner-full">
        <div className="printz-header-title-area">
          <h1>
            <Building2 size={20} color="#059669" /> Daily Account Sheet
            {branchName ? ` — ${branchName}` : ""}
          </h1>
        </div>

        {date && branchName && (
          <button
            type="button"
            onClick={generatePDF}
            className="printz-btn-primary"
            disabled={!date || !dataLoaded || isLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              fontSize: "13.5px",
            }}
          >
            <FileDown size={17} /> {isLoading ? "Generating..." : "Download PDF"}
          </button>
        )}
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
              Select Reading Date
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
                id="readings-date"
                selected={date ? new Date(date) : null}
                onChange={handleDateChange}
                highlightDates={approvedDates}
                dateFormat="yyyy-MM-dd"
                placeholder="Choose date..."
                required
                triggerStyle={{ height: "42px" }}
              />
            </div>

            {isFinalSubmitted && (
              <span
                className="revenue-badge-available"
                style={{ background: "#ecfdf5", color: "#047857" }}
              >
                <Lock size={13} /> Finalized & Locked
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
      {date && branchName && userId && dataLoaded && (
        <div className="account-sheet-top-stepper">
          <div className="account-stepper-track">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isSaved = savedSteps[step.id];
              const isActive = activeStep === step.id;
              return (
                <div
                  key={step.id}
                  className={`account-stepper-item ${isActive ? "active" : ""} ${isSaved ? "completed" : ""
                    }`}
                  onClick={() => setActiveStep(step.id)}
                >
                  <div className="account-stepper-item-left">
                    <span
                      className={`account-stepper-badge ${isActive ? "active" : ""
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

      {/* Main Content Sections - 1 Section displayed at a time */}
      {date && branchName && userId && dataLoaded ? (
        <div
          className="printer-sections-container"
          key={`${date}-${branchName}`}
        >
          {/* STEP 1: Printer Readings */}
          <div style={{ display: activeStep === 1 ? "block" : "none" }}>
            <PrinterReadingsSection
              key={`printer-${date}-${branchName}`}
              date={date}
              branchName={branchName}
              userId={userId}
              approvedDates={approvedDates}
              onFinalSubmitChange={setIsFinalSubmitted}
              isFinalSubmitted={isFinalSubmitted}
              onLoadingChange={handlePrinterReadingsLoadingChange}
              onNextStep={() => setActiveStep(2)}
            />
          </div>

          {/* STEP 2: Large Format (Jumbo Xerox & Counter) */}
          <div style={{ display: activeStep === 2 ? "block" : "none" }}>
            <JumboXeroxSection
              key={`jumbo-${date}-${branchName}`}
              date={date}
              branchName={branchName}
              userId={userId}
              approvedDates={approvedDates}
              onFinalSubmitChange={setIsFinalSubmitted}
              isFinalSubmitted={isFinalSubmitted}
              isStockReadingsSubmitted={isStockReadingsSubmitted}
              onCsvVerificationChange={handleCsvVerificationChange}
              onNextStep={() => setActiveStep(3)}
              onPrevStep={() => setActiveStep(1)}
            />

            {/* CSV Verification Results - shown only when CSV is uploaded */}
            {csvVerificationData.showCsvResults && (
              <div className="revenue-card" style={{ marginTop: "1rem" }}>
                <div className="revenue-card-header">
                  <div className="revenue-card-header-left">
                    <FileSpreadsheet size={18} color="#059669" />
                    <h3 className="revenue-card-title">
                      CSV Verification Summary
                    </h3>
                  </div>
                </div>
                <div style={{ padding: "16px 20px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: "14px",
                      marginBottom: "1.25rem",
                    }}
                  >
                    {csvVerificationData.getStatusCounts &&
                      Object.entries(
                        csvVerificationData.getStatusCounts()
                      ).map(([status, count]) => (
                        <div
                          key={status}
                          style={{
                            padding: "16px",
                            backgroundColor: "#ffffff",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            textAlign: "center",
                            boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "24px",
                              fontWeight: "800",
                              color: "#0f172a",
                              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                              marginBottom: "4px",
                            }}
                          >
                            {count}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {status}
                          </div>
                        </div>
                      ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      Verification Results (
                      {csvVerificationData.verificationResults.length} rows)
                    </h4>
                  </div>

                  {csvVerificationData.verificationResults.length === 0 ? (
                    <div className="revenue-empty-state">
                      <p>No verification results to display.</p>
                    </div>
                  ) : (
                    <div className="revenue-table-wrapper">
                      <table className="revenue-modern-table">
                        <thead>
                          <tr>
                            <th>Extracted Date</th>
                            <th>Media Type</th>
                            <th>Paper Size</th>
                            <th>Pages</th>
                            <th>Status</th>
                            <th>Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvVerificationData.verificationResults.map(
                            (result, index) => (
                              <tr key={index}>
                                <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                  {result.extractedDate || "N/A"}
                                </td>
                                <td>{result["Media Type"]}</td>
                                <td>{result["Printer Paper Size"]}</td>
                                <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                                  {result["Pages"]}
                                </td>
                                <td>
                                  {csvVerificationData.getStatusBadge &&
                                    csvVerificationData.getStatusBadge(
                                      result.status
                                    )}
                                </td>
                                <td style={{ color: "#475569" }}>{result.message}</td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: Business & Payments */}
          <div style={{ display: activeStep === 3 ? "block" : "none" }}>
            <TotalAmountSection
              key={`total-${date}-${branchName}`}
              date={date}
              branchName={branchName}
              userId={userId}
              approvedDates={approvedDates}
              onFinalSubmitChange={setIsFinalSubmitted}
              isFinalSubmitted={isFinalSubmitted}
              onNextStep={() => setActiveStep(4)}
              onPrevStep={() => setActiveStep(2)}
              isActive={activeStep === 3}
            />
          </div>

          {/* STEP 4: Stock */}
          <div style={{ display: activeStep === 4 ? "block" : "none" }}>
            <StockSection
              key={`stock-${date}-${branchName}`}
              date={
                typeof date === "string"
                  ? date
                  : date
                    ? formatDateToYYYYMMDD(date)
                    : ""
              }
              branchName={branchName}
              userId={userId}
              approvedDates={approvedDates}
              isFinalSubmitted={isFinalSubmitted}
              onFinalSubmitChange={(locked) =>
                setIsFinalSubmitted(Boolean(locked))
              }
              onStockSubmissionChange={setIsStockReadingsSubmitted}
              onNextStep={() => setActiveStep(5)}
              onPrevStep={() => setActiveStep(3)}
            />
          </div>

          {/* STEP 5: Review & Submit */}
          <div style={{ display: activeStep === 5 ? "block" : "none" }}>
            <div className="revenue-card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "20px" }}>
                {/* 4 Sections Completion Status Tracker */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      border: `1.5px solid ${savedSteps[1] ? "#a7f3d0" : "#fed7aa"}`,
                      background: savedSteps[1] ? "#f0fdf4" : "#fffaf0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Step 1: Printers
                      </div>
                      <div style={{ fontSize: "13.5px", fontWeight: 700, color: savedSteps[1] ? "#065f46" : "#9a3412", marginTop: "2px" }}>
                        {savedSteps[1] ? "Readings Recorded" : "Pending Entry"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveStep(1)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        background: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  </div>

                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      border: `1.5px solid ${savedSteps[2] ? "#a7f3d0" : "#fed7aa"}`,
                      background: savedSteps[2] ? "#f0fdf4" : "#fffaf0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Step 2: Large Format
                      </div>
                      <div style={{ fontSize: "13.5px", fontWeight: 700, color: savedSteps[2] ? "#065f46" : "#9a3412", marginTop: "2px" }}>
                        {savedSteps[2] ? "Jumbo Saved" : "Pending Entry"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        background: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  </div>

                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      border: `1.5px solid ${savedSteps[3] ? "#a7f3d0" : "#fed7aa"}`,
                      background: savedSteps[3] ? "#f0fdf4" : "#fffaf0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Step 3: Accounts
                      </div>
                      <div style={{ fontSize: "13.5px", fontWeight: 700, color: savedSteps[3] ? "#065f46" : "#9a3412", marginTop: "2px" }}>
                        {savedSteps[3] ? "Totals Recorded" : "Pending Entry"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveStep(3)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        background: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  </div>

                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      border: `1.5px solid ${savedSteps[4] ? "#a7f3d0" : "#fed7aa"}`,
                      background: savedSteps[4] ? "#f0fdf4" : "#fffaf0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Step 4: Stock
                      </div>
                      <div style={{ fontSize: "13.5px", fontWeight: 700, color: savedSteps[4] ? "#065f46" : "#9a3412", marginTop: "2px" }}>
                        {savedSteps[4] ? "Stocks Reconciled" : "Pending Entry"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveStep(4)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        background: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Comprehensive Live Summary Table */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
                  <table className="revenue-modern-table" style={{ width: "100%", margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Account Item / Metric</th>
                        <th style={{ textAlign: "right", width: "160px" }}>Amount / Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Printer Totals */}
                      {Object.entries(liveSummary.printerTotals || {}).map(([pid, amt]) => (
                        <tr key={pid}>
                          <td style={{ fontWeight: 600, color: "#1e293b" }}>
                            Printer {pid} Total
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                            Rs. {Number(amt || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td>Large Format / Jumbo Xerox Total</td>
                        <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                          Rs. {Number(liveSummary.jumboTotal || 0).toFixed(2)}
                        </td>
                      </tr>
                      {liveSummary.jumboCounter?.sftPrinted && (
                        <tr style={{ background: "#f8fafc" }}>
                          <td style={{ fontSize: "12px", color: "#64748b", paddingLeft: "24px" }}>
                            Jumbo Counter (SFT Printed)
                          </td>
                          <td style={{ textAlign: "right", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>
                            {liveSummary.jumboCounter.sftPrinted} SFT
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td>Stock Items Revenue Total</td>
                        <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                          Rs. {Number(liveSummary.stockTotal || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr style={{ background: "#f1f5f9", fontWeight: 700 }}>
                        <td style={{ color: "#0f172a" }}>TOTAL BUSINESS</td>
                        <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", color: "#0f172a" }}>
                          Rs. {Number(liveSummary.totalBusiness || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: "#dc2626" }}>Discount</td>
                        <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", color: "#dc2626" }}>
                          Rs. {Number(liveSummary.discount || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td>UPI & Card Payments</td>
                        <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                          Rs. {Number(liveSummary.upiCardPayments || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td>Bank Transfers</td>
                        <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                          Rs. {Number(liveSummary.bankTransfers || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr style={{ background: "#ecfdf5" }}>
                        <td style={{ fontWeight: 700, color: "#065f46" }}>CASH AS PER ACCOUNTS</td>
                        <td style={{ textAlign: "right", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", color: "#047857" }}>
                          Rs. {Number(liveSummary.cashAsPerAccounts || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td>Cash in Hand</td>
                        <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                          Rs. {Number(liveSummary.cashInHand || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td>Payment to be Collected</td>
                        <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                          Rs. {Number(liveSummary.paymentToBeCollected || 0).toFixed(2)}
                        </td>
                      </tr>
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
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          Rs. {Number(liveSummary.totalAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Step 5 Navigation & Final Submit Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className="account-step-back-btn"
                  >
                    <ChevronLeft size={16} /> Back to Stock
                  </button>
                </div>

                {!isFinalSubmitted && !isFinalStateChecking ? (
                  <div className="final-submit-section" style={{ marginTop: 0 }}>
                    <button
                      type="button"
                      onClick={handleFinalSubmit}
                      className="final-submit-button"
                      disabled={isFinalSubmitting}
                    >
                      <Check size={18} />{" "}
                      {isFinalSubmitting
                        ? "Finalizing Daily Accounts..."
                        : "Finalize & Submit Daily Accounts"}
                    </button>
                    <p className="final-submit-warning">
                      ⚠️ Once finalized, all printer readings, jumbo xerox, stocks, and
                      account totals for this date will be locked for editing.
                    </p>
                  </div>
                ) : (
                  <div className="final-submitted-status">
                    <Lock size={16} /> All daily readings and accounts for this date are finalized and locked.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : date && branchName && !dataLoaded ? (
        <DailyReadingsSkeleton
          message={`Loading reading data for ${branchName}...`}
          subtitle="Fetching printer counters, jumbo xerox, stocks, and daily accounts..."
        />
      ) : (
        <div className="revenue-prompt-state">
          <Calendar size={36} color="#94a3b8" />
          <h3>Select Reading Date</h3>
          <p>
            Choose a valid calendar date above to record or review printer readings,
            large format printing, stocks, and daily account closures for {branchName || "your branch"}.
          </p>
        </div>
      )}

      {/* Modern Past Date Approval Confirmation Modal */}
      {pastDateModal.isOpen && (
        <div className="past-date-modal-overlay">
          <div className="past-date-modal-card">
            <div className="past-date-modal-header">
              <div className="past-date-modal-icon-badge">
                <Calendar size={24} />
              </div>
              <button
                type="button"
                className="past-date-modal-close-btn"
                onClick={handleCancelPastDateRequest}
                disabled={pastDateModal.isSubmitting}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="past-date-modal-body">
              <h3 className="past-date-modal-title">Request Yesterday's Entry</h3>
              <p className="past-date-modal-desc">
                Do you want to enter data for <strong>yesterday ({pastDateModal.selectedDate ? formatDateToYYYYMMDD(pastDateModal.selectedDate) : ""})</strong>?
                This action requires <strong>admin approval</strong> before readings can be entered.
              </p>

              <div className="past-date-modal-info-box">
                <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                <div className="past-date-modal-info-text">
                  <span>Branch: <strong>{branchName}</strong></span>
                  <p>Once approved by the administrator, you will be able to select this date and finalize yesterday's account sheet.</p>
                </div>
              </div>
            </div>

            <div className="past-date-modal-actions">
              <button
                type="button"
                className="past-date-modal-btn-cancel"
                onClick={handleCancelPastDateRequest}
                disabled={pastDateModal.isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="past-date-modal-btn-confirm"
                onClick={handleConfirmPastDateRequest}
                disabled={pastDateModal.isSubmitting}
              >
                {pastDateModal.isSubmitting ? (
                  <>
                    <div className="past-date-spinner"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrinterReadings;
