import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaCalendarAlt,
  FaSave,
  FaExclamationTriangle,
  FaFilePdf,
} from "react-icons/fa";
import "../../styles/totalAmountDisplay.css";
import jsPDF from "jspdf";
import "jspdf-autotable";
import CalendarSelect from "../common/CalendarSelect.jsx";
import { resolveBranchId } from "../../services/branchStore";

const TotalAmountDisplay = () => {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState("");
  const [approvedDates, setApprovedDates] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [userId, setUserId] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [printers, setPrinters] = useState([]);

  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const generateDynamicRows = useCallback((printerList) => {
    const dynamicRows = [];

    printerList.forEach((printer) => {
      const printerName = printer.printerName || `PRINTER ${printer.printerId}`;
      dynamicRows.push({
        itemName: `TOTAL ${printerName.toUpperCase()} (${printer.printerId})`,
        amount: "",
        key: `printer_${printer.printerId}`,
        autoLoad: true,
        printerId: printer.printerId,
      });
    });

    dynamicRows.push({
      itemName: "JUMBO XEROX",
      amount: "",
      key: "jumboXerox",
      autoLoad: true,
    });

    dynamicRows.push({
      itemName: "ITEMS",
      amount: "",
      key: "items",
      autoLoad: true,
    });

    const staticRows = [
      { itemName: "DNP PHOTO PRINTING", amount: "", key: "dnpPhotoPrinting" },
      { itemName: "DIGITAL BUSINESS", amount: "", key: "digitalBusiness" },
      { itemName: "GIFT BUSINESS", amount: "", key: "giftBusiness" },
    ];

    dynamicRows.push(...staticRows);
    dynamicRows.push({
      itemName: "TOTAL BUSINESS",
      amount: 0,
      key: "totalBusiness",
      isCalculated: true,
    });

    const deductionRows = [
      { itemName: "DISCOUNT", amount: "", key: "discount" },
      { itemName: "PAYTM & QR MACHINE", amount: "", key: "paytmQr" },
      { itemName: "EXPENSE", amount: "", key: "expense" },
    ];

    dynamicRows.push(...deductionRows);

    dynamicRows.push({
      itemName: "CASH AS PER ACCOUNTS",
      amount: 0,
      key: "cashAsPerAccounts",
      isCalculated: true,
    });

    dynamicRows.push({
      itemName: "CASH IN HAND",
      amount: "",
      key: "cashInHand",
    });

    return dynamicRows;
  }, []);

  const calculateBusinessTotals = useCallback((currentRows) => {
    const businessComponents = currentRows
      .filter(
        (row) =>
          row.key.startsWith("printer_") ||
          row.key === "jumboXerox" ||
          row.key === "items" ||
          row.key === "dnpPhotoPrinting" ||
          row.key === "digitalBusiness" ||
          row.key === "giftBusiness"
      )
      .map((row) => row.key);

    const totalBusiness = businessComponents.reduce((sum, key) => {
      const componentRow = currentRows.find((r) => r.key === key);
      const amount = componentRow?.amount;
      return sum + (amount === "" ? 0 : Number(amount) || 0);
    }, 0);

    const deductions = ["discount", "paytmQr", "expense"].reduce((sum, key) => {
      const deductionRow = currentRows.find((r) => r.key === key);
      const amount = deductionRow?.amount;
      return sum + (amount === "" ? 0 : Number(amount) || 0);
    }, 0);

    const cashAsPerAccounts = totalBusiness - deductions;

    return currentRows.map((row) => {
      if (row.key === "totalBusiness") {
        return { ...row, amount: totalBusiness };
      } else if (row.key === "cashAsPerAccounts") {
        return { ...row, amount: Math.max(0, cashAsPerAccounts) };
      }
      return row;
    });
  }, []);

  const calculateGrandTotal = useCallback((currentRows) => {
    const totalBusinessRow = currentRows.find((r) => r.key === "totalBusiness");
    const paytmQrRow = currentRows.find((r) => r.key === "paytmQr");

    const totalBusiness = totalBusinessRow?.amount || 0;
    const paytmQr =
      paytmQrRow?.amount === "" ? 0 : Number(paytmQrRow?.amount) || 0;

    const deductions = ["discount", "expense"].reduce((sum, key) => {
      const deductionRow = currentRows.find((r) => r.key === key);
      const amount = deductionRow?.amount;
      return sum + (amount === "" ? 0 : Number(amount) || 0);
    }, 0);

    return Math.max(0, totalBusiness + paytmQr - deductions);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        if (currentUser) {
          setUserId(currentUser.id || currentUser.uid);
          if (currentUser.branch) {
            setBranchName(currentUser.branch);
          } else {
            const res = await api.get("/users/profile");
            const userData = res.data?.data || res.data;
            setBranchName(userData.branch);
          }
        } else {
          const res = await api.get("/users/profile");
          const userData = res.data?.data || res.data;
          setUserId(userData.id || userData._id);
          setBranchName(userData.branch);
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
  }, [currentUser]);

  useEffect(() => {
    if (!branchName) return;

    const fetchPrinters = async () => {
      try {
        const res = await api.get("/printers", {
          params: { branchName },
        });
        const printerList = res.data?.data || res.data || [];
        setPrinters(printerList);

        const dynamicRows = generateDynamicRows(printerList);
        setRows(dynamicRows);
      } catch (error) {
        console.error("Error fetching printers:", error);
      }
    };

    fetchPrinters();
  }, [branchName, generateDynamicRows]);

  useEffect(() => {
    const fetchApprovedDates = async () => {
      try {
        const res = await api.get("/past-date-requests", {
          params: {
            requestedBranch: branchName,
            status: "Approved",
            type: "totalAmount",
          },
        });
        const requests = res.data?.data || res.data || [];
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

    if (branchName) {
      fetchApprovedDates();
    }
  }, [branchName]);

  useEffect(() => {
    if (!date || !userId || !branchName || rows.length === 0) return;

    const loadAutoValues = async () => {
      try {
        const dateString =
          typeof date === "string" ? date : formatDateToYYYYMMDD(date);

        const [printerRes, jumboRes, stockRes] = await Promise.all([
          api.get("/printer-readings", {
            params: { branchName, date: dateString },
          }).catch(() => ({ data: [] })),
          api.get("/jumbo-xerox/readings", {
            params: { branchName, date: dateString },
          }).catch(() => ({ data: [] })),
          api.get("/stocks/readings", {
            params: { branchName, date: dateString },
          }).catch(() => ({ data: [] })),
        ]);

        const printerDataList = printerRes.data?.data || printerRes.data || [];
        const jumboDataList = jumboRes.data?.data || jumboRes.data || [];
        const stockDataList = stockRes.data?.data || stockRes.data || [];

        const autoLoadedValues = {};

        if (Array.isArray(printerDataList) && printerDataList.length > 0) {
          const printerData = printerDataList[0];
          if (printerData.readings && typeof printerData.readings === "object") {
            Object.entries(printerData.readings).forEach(
              ([printerId, printerReading]) => {
                if (typeof printerReading !== "object" || printerReading === null) return;
                let printerTotal = 0;
                Object.values(printerReading).forEach((sizeData) => {
                  if (typeof sizeData === "object" && sizeData?.total) {
                    printerTotal += Number(sizeData.total) || 0;
                  }
                });
                autoLoadedValues[`printer_${printerId}`] = printerTotal;
              }
            );
          }
        }

        if (Array.isArray(jumboDataList) && jumboDataList.length > 0) {
          const jumboData = jumboDataList[0];
          if (jumboData.totalAmount) {
            autoLoadedValues.jumboXerox = jumboData.totalAmount;
          }
        }

        if (Array.isArray(stockDataList) && stockDataList.length > 0) {
          const stockData = stockDataList[0];
          if (stockData.totalAmount) {
            autoLoadedValues.items = stockData.totalAmount;
          }
        }

        setRows((prevRows) => {
          return prevRows.map((row) => {
            if (row.autoLoad && autoLoadedValues[row.key] !== undefined) {
              const value = autoLoadedValues[row.key];
              return { ...row, amount: value === 0 ? "" : value };
            }
            return row;
          });
        });

        if (Object.keys(autoLoadedValues).length > 0) {
          toast.success(
            "Auto-loaded values from printer, jumbo xerox, and stock readings"
          );
        }
      } catch (error) {
        console.error("Error auto-loading values:", error);
        toast.warning("Could not auto-load some values");
      }
    };

    loadAutoValues();
  }, [date, userId, branchName, rows.length]);

  useEffect(() => {
    if (!date || !userId || !branchName || rows.length === 0) return;

    const loadExistingTotalAmount = async () => {
      try {
        const dateString =
          typeof date === "string" ? date : formatDateToYYYYMMDD(date);

        const res = await api.get("/total-amounts", {
          params: { branchName, date: dateString },
        });
        const dataList = res.data?.data || res.data || [];
        const existing = Array.isArray(dataList) ? dataList[0] : dataList;

        if (existing && (existing.id || existing._id)) {
          setHasExistingData(true);
          const updatedRows = rows.map((row) => {
            const savedRow = (existing.rows || []).find((r) => r.key === row.key);
            if (row.isCalculated) return row;
            if (savedRow) {
              const amount = savedRow.amount === 0 ? "" : savedRow.amount;
              return { ...row, amount };
            }
            return row;
          });
          const calculatedRows = calculateBusinessTotals(updatedRows);
          setRows(calculatedRows);
        } else {
          setHasExistingData(false);
        }
      } catch (err) {
        console.error("Error checking existing total amount:", err);
        setHasExistingData(false);
      }
    };

    loadExistingTotalAmount();
  }, [date, userId, branchName, rows.length, calculateBusinessTotals]);

  useEffect(() => {
    if (rows.length === 0) return;

    const calculatedRows = calculateBusinessTotals(rows);
    if (JSON.stringify(calculatedRows) !== JSON.stringify(rows)) {
      setRows(calculatedRows);
    }
    setTotalAmount(calculateGrandTotal(calculatedRows));
  }, [rows, calculateBusinessTotals, calculateGrandTotal]);

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

    const formattedDate = formatDateToYYYYMMDD(selectedDate);

    if (selectedLocal < todayLocal && !isApprovedDate) {
      setDate("");
      try {
        const istDate = convertToIST(selectedDate);
        const res = await api.get("/past-date-requests", {
          params: {
            requestedBranch: branchName,
            type: "totalAmount",
            status: "Pending",
          },
        });
        const existingPending = (res.data?.data || res.data || []).filter(
          (req) => req.requestedDate === istDate
        );

        if (existingPending.length > 0) {
          alert("Request already raised and waiting for approval.");
          return;
        }

        const confirmPastDate = window.confirm(
          "Do you want to enter the data for the past date?"
        );

        if (confirmPastDate) {
          const resolvedBranchId = await resolveBranchId(branchName);
          if (!resolvedBranchId) {
            alert("Could not determine valid branch ID. Please refresh and try again.");
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
            type: "totalAmount",
          });
          alert("Your request for the past date has been raised.");
        } else {
          setDate(null);
        }
      } catch (error) {
        console.error("Error adding request:", error);
        alert("Failed to record your request. Please try again.");
      }
    } else {
      setDate(formattedDate);
    }
  };

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

  const handleInputChange = (key, value) => {
    if (!date) {
      toast.warning("Please select a date first");
      return;
    }

    const rowToUpdate = rows.find((row) => row.key === key);
    if (rowToUpdate?.isCalculated || rowToUpdate?.autoLoad) return;

    const cleanedValue =
      value === ""
        ? ""
        : Number.parseFloat(value.replace(/[^0-9.]/g, "")) || "";

    const updatedRows = rows.map((row) =>
      row.key === key ? { ...row, amount: cleanedValue } : row
    );

    setRows(updatedRows);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!date) {
      toast.error("Please select a date first");
      return;
    }

    try {
      setIsLoading(true);

      if (hasExistingData) {
        const dateString =
          typeof date === "string" ? date : formatDateToYYYYMMDD(date);
        toast.error(`Data for ${dateString} has already been entered`);
        return;
      }

      const dateString =
        typeof date === "string" ? date : formatDateToYYYYMMDD(date);

      const rowsForStorage = rows.map((row) => ({
        itemName: row.itemName,
        amount: row.amount === "" ? 0 : Number(row.amount) || 0,
        key: row.key,
        isCalculated: row.isCalculated || false,
        autoLoad: row.autoLoad || false,
        printerId: row.printerId || null,
      }));

      await api.post("/total-amounts", {
        userId,
        branchName,
        date: dateString,
        rows: rowsForStorage,
        totalAmount,
      });

      setHasExistingData(true);
      toast.success("Amounts saved successfully");
    } catch (error) {
      console.error("Error saving amounts:", error);
      toast.error(`Failed to save amounts: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
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
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.width;
      let yPos = 15;

      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 58, 138);
      pdf.text(branchName, pageWidth / 2, yPos, { align: "center" });
      yPos += 8;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      const displayDate =
        typeof date === "string"
          ? new Date(date).toLocaleDateString()
          : date.toLocaleDateString();
      pdf.text(`Date: ${displayDate}`, pageWidth / 2, yPos, {
        align: "center",
      });
      yPos += 15;

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 58, 138);
      pdf.text("TOTAL AMOUNT READINGS", pageWidth / 2, yPos, {
        align: "center",
      });
      yPos += 15;

      const totalAmountData = rows.map((row) => {
        const amount = row.amount === "" ? 0 : Number(row.amount) || 0;
        return [
          row.itemName,
          row.isCalculated || amount ? `Rs.${amount.toFixed(2)}` : "",
        ];
      });

      totalAmountData.push([
        "GRAND TOTAL (AFTER DEDUCTIONS)",
        `Rs.${totalAmount.toFixed(2)}`,
      ]);

      pdf.autoTable({
        head: [["Item Name", "Amount"]],
        body: totalAmountData,
        startY: yPos,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 10,
          fontStyle: "bold",
          halign: "center",
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          textColor: [51, 51, 51],
        },
        columnStyles: {
          0: { fontStyle: "bold" },
          1: { halign: "right" },
        },
        didParseCell: (data) => {

          const totalBusinessIndex = rows.findIndex(
            (row) => row.key === "totalBusiness"
          );
          if (data.row.index === totalBusinessIndex) {
            data.cell.styles.fillColor = [248, 250, 252];
            data.cell.styles.fontStyle = "bold";
          }


          const cashAccountsIndex = rows.findIndex(
            (row) => row.key === "cashAsPerAccounts"
          );
          if (data.row.index === cashAccountsIndex) {
            data.cell.styles.fillColor = [248, 250, 252];
            data.cell.styles.fontStyle = "bold";
          }


          if (data.row.index === totalAmountData.length - 1) {
            data.cell.styles.fillColor = [30, 58, 138];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      const dateString =
        typeof date === "string" ? date : formatDateToYYYYMMDD(date);
      const formattedDate = dateString.split("-").reverse().join("-");
      pdf.save(`TotalAmount_${branchName}_${formattedDate}.pdf`);

      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF: " + error.message);
    }
  };

  if (isLoading && !branchName) {
    return (
      <div className="total-loading-container">
        <div className="total-loading-spinner"></div>
        <p>Loading branch data...</p>
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

  return (
    <div className="total-amount-container">
      <ToastContainer />
      <div className="total-page-header">
        <h2>Add Total Amount Readings for {branchName}</h2>
        <p>Submit usage details for this branch.</p>
      </div>

      <div className="total-date-picker-container">
        <div className="total-date-picker-wrapper" style={{ minWidth: "220px" }}>
          <label htmlFor="amount-date">Select Date</label>
          <CalendarSelect
            id="amount-date"
            selected={date ? new Date(date) : null}
            onChange={handleDateChange}
            highlightDates={approvedDates}
            dateFormat="yyyy-MM-dd"
            required
            placeholder="Select Date"
            triggerStyle={{ height: "42px" }}
          />
        </div>
        <button
          type="button"
          onClick={generatePDF}
          className="printer-download-button"
          disabled={!date}
        >
          <FaFilePdf /> Generate PDF
        </button>
      </div>

      {date && approvedDates ? (
        <div className="total-amount-card">
          <div className="total-amount-header">
            <div className="total-amount-title">
              <h3>Total Amount Readings</h3>
              {hasExistingData && (
                <div className="total-existing-data-warning">
                  <FaExclamationTriangle /> Data exists for this date (view
                  only)
                </div>
              )}
            </div>
            <div className="total-action-buttons">
              <button
                type="button"
                onClick={handleSubmit}
                className="total-save-button"
                disabled={isLoading || hasExistingData}
              >
                <FaSave /> {hasExistingData ? "Data Exists" : "Save Amounts"}
              </button>
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
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td className="total-item-name">{row.itemName}</td>
                    <td className="total-parent-conatiner">
                      {row.isCalculated ? (
                        <div className="total-calculated-amount">
                          {formatCurrency(row.amount)}
                        </div>
                      ) : row.autoLoad ? (
                        <div className="total-auto-loaded-amount">
                          {row.amount === ""
                            ? "No data"
                            : formatCurrency(row.amount)}
                        </div>
                      ) : (
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) =>
                            handleInputChange(row.key, e.target.value)
                          }
                          className="total-amount-input"
                          disabled={isLoading || hasExistingData}
                          min="0"
                          placeholder="Enter amount"
                        />
                      )}
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
      ) : (
        <div className="total-select-date-message">
          <p>Please select a date to view and record total amount readings</p>
        </div>
      )}
    </div>
  );
};

export default TotalAmountDisplay;
