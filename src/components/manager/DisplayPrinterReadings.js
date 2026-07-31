import { useState, useEffect, useCallback } from "react";
import { db, auth } from "../../services/authservice";
import {
  collection,
  getDocs,
  doc,
  onSnapshot,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaCalendarAlt,
  FaExclamationTriangle,
  FaSave,
  FaEdit,
  FaTimes,
} from "react-icons/fa";
import "../../styles/printerreadings.css";

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
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          setIsLoading(true);
          const userDoc = doc(db, "users", user.uid);
          const unsubscribeUser = onSnapshot(userDoc, (docSnapshot) => {
            if (docSnapshot.exists()) {
              const userData = docSnapshot.data();
              setBranchName(userData.branch);
            } else {
              setError("User data not found");
              errorToast("User data not found");
            }
          });
          return () => unsubscribeUser();
        } catch (error) {
          console.error("Error fetching user data:", error);
          setError(`Failed to fetch user data: ${error.message}`);
          errorToast(`Failed to fetch user data: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      } else {
        setError("User not authenticated");
        errorToast("User not authenticated");
      }
    });
    return () => unsubscribe();
  }, []);

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
      const q = query(
        collection(db, "printerReadings"),
        where("date", "==", date),
        where("branchName", "==", branchName)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        errorToast("No existing data found to update");
        return;
      }

      const docRef = querySnapshot.docs[0].ref;

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

      await updateDoc(docRef, {
        readings: updatedReadings,
        totalCopies,
        totalAmount,
      });

      setExistingData(readings);
      setIsEditing(false);
      successToast("Readings updated successfully");
    } catch (error) {
      console.error("Error saving readings:", error);
      setError(`Failed to save readings: ${error.message}`);
      errorToast(`Failed to save readings: ${error.message}`);
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
        <h2>Printer Readings for {branchName}</h2>
        <p>View and edit printer readings for selected date.</p>
      </div>

      <div className="printer-date-picker-container">
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
            />
          </div>
        </div>
      </div>

      {date ? (
        existingData ? (
          <div className="printer-printers-list">
            <div className="printer-actions">
              {!isEditing ? (
                <button
                  onClick={handleEditClick}
                  className="printer-edit-button"
                >
                  <FaEdit /> Edit Data
                </button>
              ) : (
                <div className="printer-edit-actions">
                  <button
                    onClick={handleSave}
                    className="printer-save-button"
                    disabled={isLoading}
                  >
                    <FaSave /> Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="printer-cancel-button"
                  >
                    <FaTimes /> Cancel
                  </button>
                </div>
              )}
            </div>

            {printers.map((printer) => (
              <div key={printer.printerId} className="printer-main-card">
                <div className="printer-card-header">
                  <div className="printer-card-title">
                    <h3>{printer.printerName}</h3>
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
                          >
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
                              disabled={!isEditing}
                              className="printer-reading-input"
                            />
                          </td>
                        ))}
                        <td></td>
                      </tr>
                      <tr>
                        <td className="printer-reading-type">FINAL READING</td>
                        {printer.prices.map((price) => (
                          <td
                            key={`${printer.printerId}-${price.size}-FINAL-READING`}
                          >
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
                              disabled={!isEditing}
                              className="printer-reading-input"
                            />
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
            <p>No data available for the selected date.</p>
          </div>
        )
      ) : (
        <div className="printer-select-date-message">
          <p>Please select a date to view printer readings</p>
        </div>
      )}
    </div>
  );
};

export default DisplayPrinterReadings;
