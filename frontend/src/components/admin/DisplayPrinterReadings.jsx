import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Printer,
  Building2,
  Calendar,
  ChevronDown,
  FileDown,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import "../../styles/printzTheme.css";
import "../../styles/displayreadings.css";
import Pagination from "../common/Pagination.jsx";
import BranchSelect from "../common/BranchSelect.jsx";
import CalendarSelect from "../common/CalendarSelect.jsx";

const DisplayPrinterReadings = () => {
  const [branches, setBranches] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [date, setDate] = useState("");
  const [printers, setPrinters] = useState([]);
  const [readings, setReadings] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [existingData, setExistingData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

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
        const res = await api.get("/branches");
        const branchNames = [
          ...new Set((res.data?.data || []).map((doc) => doc.name || doc.branchName)),
        ].filter(Boolean);
        setBranches(branchNames);
      } catch (error) {
        errorToast("Failed to fetch branch names: " + (error?.response?.data?.message || error.message));
      }
    };

    fetchBranches();
  }, []);

  // Fetch printers for selected branch
  useEffect(() => {
    if (!branchName) {
      setPrinters([]);
      return;
    }

    const fetchPrinters = async () => {
      try {
        const res = await api.get(`/printers?branchName=${encodeURIComponent(branchName)}`);
        const printerList = res.data?.data || [];
        if (printerList.length === 0) {
          infoToast("No printers found for this branch");
        }
        setPrinters(printerList);
      } catch (error) {
        console.error("Error fetching printers:", error);
        setError(`Failed to fetch printers: ${error?.response?.data?.message || error.message}`);
        errorToast(`Failed to fetch printers: ${error?.response?.data?.message || error.message}`);
      }
    };

    fetchPrinters();
  }, [branchName]);

  const loadDataForDate = useCallback(async () => {
    if (!date || !branchName) return;

    try {
      setIsLoading(true);
      const res = await api.get(
        `/printer-readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(date)}`
      );
      const queryList = res.data?.data || [];

      if (queryList.length === 0) {
        setExistingData(null);
        setReadings({});
        infoToast("No data found for the selected date");
        return;
      }

      const loadedData = {};
      queryList.forEach((item) => {
        if (item.readings) {
          Object.assign(loadedData, item.readings);
        }
      });

      setExistingData(loadedData);
      setReadings(JSON.parse(JSON.stringify(loadedData)));
      successToast("Data loaded for the selected date");
    } catch (error) {
      console.error("Error loading readings:", error);
      setError(`Failed to load data: ${error?.response?.data?.message || error.message}`);
      errorToast(`Failed to load data: ${error?.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [date, branchName]);

  useEffect(() => {
    loadDataForDate();
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
      <div className="display-readings-page-container">
        <div className="display-readings-empty-card">
          <div className="stock-loading-spinner" style={{ margin: "0 auto 12px" }}></div>
          <p style={{ color: "#64748b", margin: 0, fontSize: "14px", fontWeight: "500" }}>Loading printer data...</p>
        </div>
      </div>
    );
  }

  if (error && !printers.length) {
    return (
      <div className="display-readings-page-container">
        <div className="display-readings-empty-card">
          <div className="display-readings-empty-icon warning">
            <AlertTriangle size={28} />
          </div>
          <h3 className="display-readings-empty-title">Error Loading Data</h3>
          <p className="display-readings-empty-desc">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="display-readings-btn primary"
            style={{ marginTop: "16px" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="display-readings-page-container">
      <ToastContainer />

      {/* Full Header Banner - Green gradient banner without illustration */}
      <div
        className="printz-header-banner-full"
        style={{
          width: "100%",
          background: "linear-gradient(90deg, #E8FAF2 0%, #F0FFF9 50%, #E8FAF2 100%)",
          border: "1px solid #dcfce7",
          borderRadius: "16px",
          padding: "12px 24px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
        }}
      >
        <div className="printz-header-title-area">
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
            Printer <span className="highlight" style={{ color: "#059669" }}>Readings</span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            View and verify daily hardware meter readings, print volumes, and branch revenues (Read Only).
          </p>
        </div>
      </div>

      {/* Filter and Control Toolbar Card */}
      <div className="printer-section-card display-readings-filter-card">
        <div className="display-readings-filter-toolbar">
          <div className="display-readings-filter-fields">
            {/* Branch Selector */}
            <div className="display-readings-field-group">
              <label htmlFor="branch-select" className="display-readings-field-label">
                <Building2 size={15} color="#059669" />
                <span>Select Store / Branch</span>
              </label>
              <BranchSelect
                id="branch-select"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                branches={branches}
                placeholder="Select Branch"
                allowAll={true}
                allOptionLabel="Select Branch"
              />
            </div>

            {/* Date Selector */}
            <div className="display-readings-field-group">
              <label htmlFor="reading-date" className="display-readings-field-label">
                <Calendar size={15} color="#059669" />
                <span>Reading Date</span>
              </label>
              <CalendarSelect
                id="reading-date"
                selected={date ? new Date(date) : null}
                onChange={(d) => {
                  if (d) {
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    setDate(`${yyyy}-${mm}-${dd}`);
                  } else {
                    setDate("");
                  }
                }}
                dateFormat="dd-MM-yyyy"
                placeholder="Select reading date"
              />
            </div>

            {/* Quick Status Pill */}
            {date && branchName && (
              <div className={`display-readings-badge-pill ${!existingData ? "warning" : ""}`}>
                <span className={`display-readings-status-dot ${!existingData ? "warning" : ""}`}></span>
                <span>
                  {existingData
                    ? `Data Loaded (${printers.length} Printers)`
                    : "No Data Recorded"}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="display-readings-actions">
            {date && branchName && existingData && (
              <button
                type="button"
                onClick={generatePDF}
                className="display-readings-btn primary"
              >
                <FileDown size={16} />
                <span>Download PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {date && branchName ? (
        existingData ? (
          <div className="printer-printers-list" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {printers
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((printer) => {
              const grandTotal = printer.prices.reduce((sum, price) => {
                const final =
                  readings[printer.printerId]?.[price.size]?.FINAL_READING ??
                  readings[printer.printerId]?.[price.size]?.["FINAL READING"] ??
                  0;
                const starting =
                  readings[printer.printerId]?.[price.size]?.STARTING ?? 0;
                return sum + calculateTotal(final, starting, price.price);
              }, 0);

              const typeLower = (printer.type || printer.printerType || "").toLowerCase();
              const typeBadgeClass = typeLower.includes("large")
                ? "lfp"
                : typeLower.includes("small")
                ? "sfp"
                : "mfp";

              return (
                <div key={printer.printerId} className="printer-section-card display-readings-printer-card">
                  <div className="display-readings-card-header">
                    <div className="display-readings-header-left">
                      <div className="display-readings-tag-icon">
                        <Printer size={20} />
                      </div>
                      <div className="display-readings-title-wrap">
                        <h3 className="display-readings-title">{printer.printerName}</h3>
                        <div className="display-readings-badges-row">
                          {printer.printerId && (
                            <span className="printer-id-badge">ID: {printer.printerId}</span>
                          )}
                          {(printer.type || printer.printerType) && (
                            <span className={`printer-type-pill ${typeBadgeClass}`}>
                              {printer.type || printer.printerType}
                            </span>
                          )}
                          <span className="display-readings-view-badge">View Only</span>
                        </div>
                      </div>
                    </div>

                    <div className="display-readings-grand-pill">
                      <span className="display-readings-grand-label">Grand Total</span>
                      <span className="display-readings-grand-val">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>

                  <div className="display-readings-table-wrap">
                    <table className="display-readings-table">
                      <thead>
                        <tr>
                          <th className="col-row-title">Metric</th>
                          {printer.prices.map((price) => (
                            <th key={price.size} className="printer-size-col">
                              {price.size}
                            </th>
                          ))}
                          <th className="col-total">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="display-readings-row-header">STARTING</td>
                          {printer.prices.map((price) => (
                            <td
                              key={`${printer.printerId}-${price.size}-STARTING`}
                              className="display-readings-val-cell"
                            >
                              {readings[printer.printerId]?.[price.size]?.STARTING ?? "N/A"}
                            </td>
                          ))}
                          <td className="display-readings-empty-total-cell">
                            <span className="display-readings-dash">—</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="display-readings-row-header">FINAL READING</td>
                          {printer.prices.map((price) => (
                            <td
                              key={`${printer.printerId}-${price.size}-FINAL-READING`}
                              className="display-readings-val-cell"
                            >
                              {readings[printer.printerId]?.[price.size]?.FINAL_READING ??
                                readings[printer.printerId]?.[price.size]?.["FINAL READING"] ??
                                "N/A"}
                            </td>
                          ))}
                          <td className="display-readings-empty-total-cell">
                            <span className="display-readings-dash">—</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="display-readings-row-header">NO OF COPIES</td>
                          {printer.prices.map((price) => {
                            const final =
                              readings[printer.printerId]?.[price.size]?.FINAL_READING ??
                              readings[printer.printerId]?.[price.size]?.["FINAL READING"] ??
                              0;
                            const starting =
                              readings[printer.printerId]?.[price.size]?.STARTING ?? 0;
                            const copies = calculateNoOfCopies(final, starting);
                            return (
                              <td
                                key={`${printer.printerId}-${price.size}-COPIES`}
                                className="printer-copies-cell"
                              >
                                <span className="display-readings-copies-pill">
                                  {copies} × ₹{price.price}
                                </span>
                              </td>
                            );
                          })}
                          <td className="display-readings-empty-total-cell">
                            <span className="display-readings-dash">—</span>
                          </td>
                        </tr>
                        <tr className="row-total-highlight">
                          <td className="display-readings-total-title">TOTAL</td>
                          {printer.prices.map((price) => {
                            const final =
                              readings[printer.printerId]?.[price.size]?.FINAL_READING ??
                              readings[printer.printerId]?.[price.size]?.["FINAL READING"] ??
                              0;
                            const starting =
                              readings[printer.printerId]?.[price.size]?.STARTING ?? 0;
                            const total = calculateTotal(
                              final,
                              starting,
                              price.price
                            );
                            return (
                              <td
                                key={`${printer.printerId}-${price.size}-TOTAL`}
                                className="display-readings-size-total"
                              >
                                {formatCurrency(total)}
                              </td>
                            );
                          })}
                          <td className="display-readings-grand-cell">
                            <span className="display-readings-grand-amount">
                              {formatCurrency(grandTotal)}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Standard Pagination */}
            {printers.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={printers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                pageSizeOptions={[3, 5, 10, 20]}
                itemLabel="printers"
              />
            )}
          </div>
        ) : (
          <div className="display-readings-empty-card">
            <div className="display-readings-empty-icon warning">
              <AlertTriangle size={28} />
            </div>
            <h4 className="display-readings-empty-title">No Readings Recorded</h4>
            <p className="display-readings-empty-desc">
              No meter readings have been submitted for <strong>{branchName}</strong> on <strong>{date}</strong>.
            </p>
          </div>
        )
      ) : (
        <div className="display-readings-empty-card">
          <div className="display-readings-empty-icon">
            <Calendar size={28} />
          </div>
          <h4 className="display-readings-empty-title">Select Branch & Date</h4>
          <p className="display-readings-empty-desc">
            Please choose a branch location and target date above to inspect printer meter readings and calculations.
          </p>
        </div>
      )}
    </div>
  );
};

export default DisplayPrinterReadings;
