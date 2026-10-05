import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Printer,
  Building2,
  Calendar,
  Edit3,
  Save,
  X,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import "../../styles/printzTheme.css";
import "../../styles/displayreadings.css";
import Pagination from "../common/Pagination.jsx";
import CalendarSelect from "../common/CalendarSelect.jsx";

const DisplayPrinterReadings = () => {
  const [branchName, setBranchName] = useState("");
  const [date, setDate] = useState("");
  const [printers, setPrinters] = useState([]);
  const [readings, setReadings] = useState({});
  const [, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
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

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser) {
        setUserId(storedUser.id || storedUser._id);
        setBranchName(storedUser.branch || storedUser.branchName || "");
      } else {
        setError("User not authenticated");
        errorToast("User not authenticated");
      }
    } catch (err) {
      console.error("Error retrieving user from storage:", err);
    }
  }, []);

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

  const handleInputChange = (e, printerId, size, field) => {
    const { value } = e.target;
    setReadings((prev) => {
      const updated = { ...prev };
      if (!updated[printerId]) updated[printerId] = {};
      if (!updated[printerId][size]) {
        updated[printerId][size] = { price: getPrice(printerId, size) };
      }

      const fieldName = field === "FINAL READING" ? "FINAL_READING" : field;

      updated[printerId][size][fieldName] = value === "" ? "" : Number(value);

      if (fieldName === "FINAL_READING" || fieldName === "STARTING") {
        const final = updated[printerId][size].FINAL_READING || 0;
        const start = updated[printerId][size].STARTING || 0;
        updated[printerId][size].noOfCopies = calculateNoOfCopies(final, start);
        updated[printerId][size].total = calculateTotal(
          final,
          start,
          updated[printerId][size].price
        );
      }

      return updated;
    });
  };

  const validatePrinterReadings = (printerId) => {
    const printer = printers.find((p) => p.printerId === printerId);
    if (!printer) {
      errorToast("Printer not found");
      return false;
    }

    for (const price of printer.prices) {
      const reading = readings[printerId]?.[price.size];
      if (
        !reading ||
        reading.STARTING === "" ||
        reading.STARTING === undefined ||
        (reading.FINAL_READING === "" && reading["FINAL READING"] === "") ||
        (reading.FINAL_READING === undefined &&
          reading["FINAL READING"] === undefined)
      ) {
        errorToast(
          `Please fill in all readings for ${printer.printerName} (${price.size})`
        );
        return false;
      }

      const finalReading =
        reading.FINAL_READING !== undefined && reading.FINAL_READING !== ""
          ? reading.FINAL_READING
          : reading["FINAL READING"];

      if (finalReading < reading.STARTING) {
        errorToast(
          `Final reading must be ≥ Starting for ${printer.printerName} (${price.size})`
        );
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!date) {
      errorToast("Please select a date first");
      return;
    }

    for (const printer of printers) {
      if (!validatePrinterReadings(printer.printerId)) {
        return;
      }
    }

    try {
      setIsLoading(true);
      let totalCopies = 0;
      let totalAmount = 0;
      const updatedReadings = {};

      printers.forEach((printer) => {
        updatedReadings[printer.printerId] = {};
        printer.prices.forEach((price) => {
          const reading = readings[printer.printerId][price.size];
          updatedReadings[printer.printerId][price.size] = {
            "FINAL READING": reading.FINAL_READING || reading["FINAL READING"],
            STARTING: reading.STARTING,
            price: reading.price,
            noOfCopies: reading.noOfCopies,
            total: reading.total,
          };
          totalCopies += reading.noOfCopies;
          totalAmount += reading.total;
        });
      });

      await api.post("/printer-readings", {
        branchName,
        date,
        readings: updatedReadings,
        totalCopies,
        totalAmount,
      });

      setExistingData(readings);
      setIsEditing(false);
      successToast("Readings updated successfully");
    } catch (error) {
      console.error("Error saving readings:", error);
      setError(`Failed to save readings: ${error?.response?.data?.message || error.message}`);
      errorToast(`Failed to save readings: ${error?.response?.data?.message || error.message}`);
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

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setReadings(JSON.parse(JSON.stringify(existingData)));
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
            View and manage daily starting and final hardware meter readings for {branchName || "your branch"}.
          </p>
        </div>
      </div>

      {/* Filter and Control Toolbar Card */}
      <div className="printer-section-card display-readings-filter-card">
        <div className="display-readings-filter-toolbar">
          <div className="display-readings-filter-fields">
            {/* Branch (Assigned to Manager) */}
            <div className="display-readings-field-group">
              <label className="display-readings-field-label">
                <Building2 size={15} color="#059669" />
                <span>Assigned Store</span>
              </label>
              <div className="display-readings-input-wrapper" style={{ background: "#f8fafc", minWidth: "220px" }}>
                <span className="display-readings-input-icon">
                  <Building2 size={16} />
                </span>
                <div className="display-readings-static-branch">
                  {branchName || "Loading branch..."}
                </div>
              </div>
            </div>

            {/* Date Selector */}
            <div className="display-readings-field-group">
              <label htmlFor="reading-date" className="display-readings-field-label">
                <Calendar size={15} color="#059669" />
                <span>Select Date</span>
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
            {date && (
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

          {/* Edit / Save / Cancel Action Buttons */}
          {date && existingData && (
            <div className="display-readings-actions">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="display-readings-btn primary"
                >
                  <Edit3 size={16} />
                  <span>Edit Data</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="display-readings-btn primary"
                    disabled={isLoading}
                  >
                    <Save size={16} />
                    <span>Save Changes</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="display-readings-btn secondary"
                    disabled={isLoading}
                  >
                    <X size={16} />
                    <span>Cancel</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {date ? (
        existingData ? (
          <>
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
                          <span className={`display-readings-view-badge ${isEditing ? "editing" : ""}`}>
                            {isEditing ? "Editing Mode" : "Read-Only"}
                          </span>
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
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={
                                    readings[printer.printerId]?.[price.size]
                                      ?.STARTING ?? ""
                                  }
                                  onChange={(e) =>
                                    handleInputChange(
                                      e,
                                      printer.printerId,
                                      price.size,
                                      "STARTING"
                                    )
                                  }
                                  className="display-readings-table-input"
                                />
                              ) : (
                                readings[printer.printerId]?.[price.size]?.STARTING ?? "N/A"
                              )}
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
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={
                                    readings[printer.printerId]?.[price.size]
                                      ?.FINAL_READING ??
                                    readings[printer.printerId]?.[price.size]?.[
                                      "FINAL READING"
                                    ] ??
                                    ""
                                  }
                                  onChange={(e) =>
                                    handleInputChange(
                                      e,
                                      printer.printerId,
                                      price.size,
                                      "FINAL READING"
                                    )
                                  }
                                  className="display-readings-table-input"
                                />
                              ) : (
                                readings[printer.printerId]?.[price.size]?.FINAL_READING ??
                                readings[printer.printerId]?.[price.size]?.["FINAL READING"] ??
                                "N/A"
                              )}
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
            </div>

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
          </>
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
          <h4 className="display-readings-empty-title">Select Date</h4>
          <p className="display-readings-empty-desc">
            Please choose a date above to inspect and edit printer meter readings for your branch.
          </p>
        </div>
      )}
    </div>
  );
};

export default DisplayPrinterReadings;
