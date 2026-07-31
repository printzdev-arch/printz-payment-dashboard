import { useState, useEffect, useCallback } from "react";
import { db } from "../../services/authservice";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaCalendarAlt,
  FaExclamationTriangle,
  FaFileDownload,
} from "react-icons/fa";
import "../../styles/printerreadings.css";
import jsPDF from "jspdf";
import "jspdf-autotable";

const DisplayPrinterReadings = () => {
  const [branches, setBranches] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [date, setDate] = useState("");
  const [printers, setPrinters] = useState([]);
  const [readings, setReadings] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [existingData, setExistingData] = useState(null);

  const toastConfig = {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    style: {
      borderRadius: "4px",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
  };

  const successToast = (message) =>
    toast.success(message, {
      ...toastConfig,
      style: {
        ...toastConfig.style,
        background: "#ffffff",
        color: "#333333",
        borderLeft: "4px solid green",
      },
    });

  const errorToast = (message) =>
    toast.error(message, {
      ...toastConfig,
      style: {
        ...toastConfig.style,
        background: "#ffffff",
        color: "#333333",
        borderLeft: "4px solid #ef4444",
      },
    });

  const infoToast = (message) =>
    toast.info(message, {
      ...toastConfig,
      style: {
        ...toastConfig.style,
        background: "#ffffff",
        color: "#333333",
        borderLeft: "4px solid #1e88e5",
      },
    });

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const usersCollection = collection(db, "branches");
        const snapshot = await getDocs(usersCollection);
        const branchNames = [
          ...new Set(snapshot.docs.map((doc) => doc.data().name)),
        ].filter(Boolean);
        setBranches(branchNames);
      } catch (error) {
        errorToast("Failed to fetch branch names: " + error.message);
      }
    };

    fetchBranches();
  }, []);

  // Fetch printers for selected branch
  useEffect(() => {
    if (!branchName) return;

    const printerCollection = collection(db, "printers");
    const q = query(printerCollection, where("branchName", "==", branchName));
    const unsubscribePrinters = onSnapshot(
      q,
      (printerSnapshot) => {
        if (printerSnapshot.empty) {
          infoToast("No printers found for this branch");
        }

        const printerList = printerSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPrinters(printerList);
      },
      (error) => {
        console.error("Error fetching printers:", error);
        setError(`Failed to fetch printers: ${error.message}`);
        errorToast(`Failed to fetch printers: ${error.message}`);
      }
    );

    return () => unsubscribePrinters();
  }, [branchName]);

  const loadDataForDate = useCallback(() => {
    if (!date || !branchName) return;

    try {
      setIsLoading(true);
      const q = query(
        collection(db, "printerReadings"),
        where("date", "==", date),
        where("branchName", "==", branchName)
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          if (querySnapshot.empty) {
            setExistingData(null);
            setReadings({});
            infoToast("No data found for the selected date");
            return;
          }

          const loadedData = {};
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            Object.assign(loadedData, data.readings);
          });

          setExistingData(loadedData);
          setReadings(JSON.parse(JSON.stringify(loadedData)));
          successToast("Data loaded for the selected date");
        },
        (error) => {
          console.error("Error in readings snapshot:", error);
          setError(`Failed to load data: ${error.message}`);
          errorToast(`Failed to load data: ${error.message}`);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up snapshot listener:", error);
      setError(`Failed to set up listener: ${error.message}`);
      errorToast(`Failed to set up listener: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [date, branchName]);

  useEffect(() => {
    const unsubscribe = loadDataForDate();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [loadDataForDate]);

  const getPrice = useCallback(
    (printerId, size) => {
      const printer = printers.find((p) => p.printerId === printerId);
      const priceObj = printer?.prices.find((price) => price.size === size);
      return priceObj ? Number(priceObj.price) : 0;
    },
    [printers]
  );

  const calculateNoOfCopies = (final, starting) => {
    final = Number(final) || 0;
    starting = Number(starting) || 0;
    return Math.max(0, final - starting);
  };

  const calculateTotal = (final, starting, price) => {
    return calculateNoOfCopies(final, starting) * (Number(price) || 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const generatePDF = async () => {
    if (!date) {
      console.log("Please select a date first");
      return;
    }

    try {
      setIsLoading(true);
      infoToast("Generating PDF, please wait...");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      let yPosition = 15;

      // PAGE HEADER
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 58, 138);
      pdf.text(branchName, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 8;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `Date: ${new Date(date + "T00:00:00").toLocaleDateString("en-IN")}`,
        pageWidth / 2,
        yPosition,
        {
          align: "center",
        }
      );
      yPosition += 20;

      // PRINTER READINGS SECTION
      yPosition = addPrinterReadingsSection(
        pdf,
        printers,
        readings,
        yPosition,
        pageWidth,
        pageHeight
      );

      // Save PDF
      const formattedDate = date.split("-").reverse().join("-");
      pdf.save(`Printer_Readings_${branchName}_${formattedDate}.pdf`);
      successToast("PDF generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      errorToast("Failed to generate PDF");
    } finally {
      setIsLoading(false);
    }
  };

  const addPrinterReadingsSection = (
    pdf,
    printers,
    readings,
    yPos,
    pageWidth,
    pageHeight
  ) => {
    // Section Title
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 58, 138);
    pdf.text("PRINTER READINGS", pageWidth / 2, yPos, { align: "center" });
    yPos += 12;

    if (printers.length === 0) {
      // Show empty table when no printers
      pdf.autoTable({
        head: [["Printer Name", "A4", "A3", "Legal", "Letter", "Total"]],
        body: [["No Printers Available", "", "", "", "", ""]],
        startY: yPos,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 10,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          textColor: [51, 51, 51],
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 },
      });
      return pdf.lastAutoTable.finalY + 20;
    }

    printers.forEach((printer, index) => {
      if (yPos > pageHeight - 70) {
        pdf.addPage();
        yPos = 20;
      }

      const printerReadings = readings[printer.printerId] || {};
      const sizeTypes = printer.prices
        ? printer.prices.map((p) => p.size)
        : ["A4", "A3", "Legal", "Letter"];

      // Ensure we have at least 4 columns
      while (sizeTypes.length < 4) {
        sizeTypes.push("");
      }

      const tableData = [
        [
          "STARTING",
          ...sizeTypes.map((size) => printerReadings[size]?.STARTING || ""),
        ],
        [
          "FINAL READING",
          ...sizeTypes.map(
            (size) =>
              printerReadings[size]?.FINAL_READING ||
              printerReadings[size]?.["FINAL READING"] ||
              ""
          ),
        ],
        [
          "NO OF COPIES",
          ...sizeTypes.map((size) => {
            const final =
              printerReadings[size]?.FINAL_READING ||
              printerReadings[size]?.["FINAL READING"] ||
              0;
            const starting = printerReadings[size]?.STARTING || 0;
            const copies = calculateNoOfCopies(final, starting);
            const price =
              printer.prices?.find((p) => p.size === size)?.price || 0;
            return copies > 0 ? `${copies} × Rs.${price}` : "";
          }),
        ],
        [
          "TOTAL",
          ...sizeTypes.map((size) => {
            const total = printerReadings[size]?.total || 0;
            return total > 0 ? `Rs.${total}` : "";
          }),
        ],
      ];

      // Calculate printer total
      const printerTotal = sizeTypes.reduce((sum, size) => {
        return sum + (printerReadings[size]?.total || 0);
      }, 0);

      pdf.autoTable({
        head: [[printer.printerName, ...sizeTypes, "Total"]],
        body: tableData.map((row, index) => {
          if (index === 3) {
            // Total row
            return [...row, printerTotal ? `Rs.${printerTotal}` : ""];
          }
          return [...row, index === 1 ? "TOTAL" : ""];
        }),
        startY: yPos,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 10,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: [51, 51, 51],
        },
        columnStyles: {
          0: { fontStyle: "bold", fillColor: [248, 250, 252] },
          [sizeTypes.length + 1]: {
            fontStyle: "bold",
            fillColor: [248, 250, 252],
          },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 },
        didParseCell: (data) => {
          // Style total row
          if (data.row.index === 3) {
            data.cell.styles.fillColor = [30, 58, 138];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      yPos = pdf.lastAutoTable.finalY + (index < printers.length - 1 ? 10 : 15);
    });

    return yPos;
  };

  if (isLoading && !printers.length) {
    return (
      <div className="printer-loading-container">
        <div className="printer-loading-spinner"></div>
        <p>Loading printer data...</p>
      </div>
    );
  }

  if (error && !printers.length) {
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

  return (
    <div className="printer-main-container">
      <ToastContainer />
      <div className="printer-page-header">
        <h2>Printer Revenue Data</h2>
        <p>View printer readings for all branches (Read Only).</p>
      </div>

      <div className="printer-date-picker-container">
        <div className="printer-date-picker-wrapper">
          <label htmlFor="branch-select">Branch Name</label>
          <select
            id="branch-select"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="printer-date-input"
          >
            <option value="">Select Branch</option>
            {branches.map((branch, index) => (
              <option key={index} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>
        <div className="printer-date-picker-wrapper">
          <label htmlFor="reading-date">Select Date</label>
          <div className="printer-date-input-wrapper">
            <FaCalendarAlt className="printer-date-icon" />
            <input
              id="reading-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="printer-date-input"
            />
          </div>
        </div>
        {date && branchName && existingData && (
          <button onClick={generatePDF} className="printer-download-button">
            <FaFileDownload /> Download PDF
          </button>
        )}
      </div>

      {date && branchName ? (
        existingData ? (
          <div className="printer-printers-list">
            {printers.map((printer) => (
              <div key={printer.printerId} className="printer-main-card">
                <div className="printer-card-header">
                  <div className="printer-card-title">
                    <h3>{printer.printerName} (View Only)</h3>
                  </div>
                </div>

                <div className="printer-card-content">
                  <table className="printer-readings-table">
                    <thead>
                      <tr>
                        <th className="printer-reading-type-col"></th>
                        {printer.prices.map((price) => (
                          <th key={price.size} className="printer-size-col">
                            {price.size}
                          </th>
                        ))}
                        <th className="printer-total-col">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="printer-reading-type">STARTING</td>
                        {printer.prices.map((price) => (
                          <td
                            key={`${printer.printerId}-${price.size}-STARTING`}
                            className="printer-amount-cell"
                          >
                            {readings[printer.printerId]?.[price.size]
                              ?.STARTING ?? "N/A"}
                          </td>
                        ))}
                        <td></td>
                      </tr>
                      <tr>
                        <td className="printer-reading-type">FINAL READING</td>
                        {printer.prices.map((price) => (
                          <td
                            key={`${printer.printerId}-${price.size}-FINAL-READING`}
                            className="printer-amount-cell"
                          >
                            {readings[printer.printerId]?.[price.size]
                              ?.FINAL_READING ??
                              readings[printer.printerId]?.[price.size]?.[
                                "FINAL READING"
                              ] ??
                              "N/A"}
                          </td>
                        ))}
                        <td></td>
                      </tr>
                      <tr>
                        <td className="printer-reading-type">NO OF COPIES</td>
                        {printer.prices.map((price) => {
                          const final =
                            readings[printer.printerId]?.[price.size]
                              ?.FINAL_READING ??
                            readings[printer.printerId]?.[price.size]?.[
                              "FINAL READING"
                            ] ??
                            0;
                          const starting =
                            readings[printer.printerId]?.[price.size]
                              ?.STARTING ?? 0;
                          const copies = calculateNoOfCopies(final, starting);
                          return (
                            <td
                              key={`${printer.printerId}-${price.size}-COPIES`}
                              className="printer-copies-cell"
                            >
                              {copies} × ₹{price.price}
                            </td>
                          );
                        })}
                        <td></td>
                      </tr>
                      <tr className="printer-total-row">
                        <td className="printer-reading-type">TOTAL</td>
                        {printer.prices.map((price) => {
                          const final =
                            readings[printer.printerId]?.[price.size]
                              ?.FINAL_READING ??
                            readings[printer.printerId]?.[price.size]?.[
                              "FINAL READING"
                            ] ??
                            0;
                          const starting =
                            readings[printer.printerId]?.[price.size]
                              ?.STARTING ?? 0;
                          const total = calculateTotal(
                            final,
                            starting,
                            price.price
                          );
                          return (
                            <td
                              key={`${printer.printerId}-${price.size}-TOTAL`}
                              className="printer-amount-cell"
                            >
                              {formatCurrency(total)}
                            </td>
                          );
                        })}
                        <td className="printer-grand-total">
                          {formatCurrency(
                            printer.prices.reduce((sum, price) => {
                              const final =
                                readings[printer.printerId]?.[price.size]
                                  ?.FINAL_READING ??
                                readings[printer.printerId]?.[price.size]?.[
                                  "FINAL READING"
                                ] ??
                                0;
                              const starting =
                                readings[printer.printerId]?.[price.size]
                                  ?.STARTING ?? 0;
                              return (
                                sum +
                                calculateTotal(final, starting, price.price)
                              );
                            }, 0)
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="printer-no-data-message">
            <FaExclamationTriangle
              style={{
                fontSize: "2rem",
                color: "#64748b",
                marginBottom: "1rem",
              }}
            />
            <p>No data available for the selected branch and date.</p>
          </div>
        )
      ) : (
        <div className="printer-select-date-message">
          <p>Please select a branch and date to view printer readings</p>
        </div>
      )}
    </div>
  );
};

export default DisplayPrinterReadings;
