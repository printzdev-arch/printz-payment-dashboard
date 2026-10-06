import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  Lock,
  Info,
  X,
  ChevronRight,
} from "lucide-react";
import { usePopup } from "../../../hooks/usePopup";
import Popup from "../../common/Popup";
import DailyReadingsSkeleton from "./DailyReadingsSkeleton";

const PrinterReadingsSection = ({
  date,
  branchName,
  userId,
  approvedDates,
  onFinalSubmitChange,
  isFinalSubmitted,
  onLoadingChange,
  onNextStep,
}) => {
  const { popup, showSuccess, showError, showWarning } = usePopup();
  const [printers, setPrinters] = useState([]);
  const [printerReadings, setPrinterReadings] = useState({});
  const [previousDateMap, setPreviousDateMap] = useState({});
  const [hasExistingPrinterData, setHasExistingPrinterData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [printerValidationErrors, setPrinterValidationErrors] = useState({});
  const [isEditingPrinter, setIsEditingPrinter] = useState(false);
  const [printerDocId, setPrinterDocId] = useState(null);
  const [isFinalStateChecking, setIsFinalStateChecking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Notify parent component when loading state changes
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(dataLoaded);
    }
  }, [dataLoaded, onLoadingChange]);

  const formatDateToYYYYMMDD = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const canEditCurrentDate = useCallback(() => {
    const today = new Date();
    const todayFormatted = formatDateToYYYYMMDD(today);
    return date === todayFormatted;
  }, [date, formatDateToYYYYMMDD]);

  const canEditPastDate = useCallback(() => {
    if (canEditCurrentDate()) return false;

    const selectedDate = new Date(date);
    return approvedDates.some((approvedDate) => {
      const approvedLocal = new Date(
        approvedDate.getFullYear(),
        approvedDate.getMonth(),
        approvedDate.getDate()
      );
      const selectedLocal = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      return approvedLocal.getTime() === selectedLocal.getTime();
    });
  }, [date, approvedDates, canEditCurrentDate]);

  const findMostRecentReadings = useCallback(
    async (currentDate, branchName, userId) => {
      const maxDaysBack = 30;
      const recentReadings = {};
      const dateMap = {};

      const resPrinters = await api.get(
        `/printers?branchName=${encodeURIComponent(branchName)}`
      );
      const allBranchPrinters = resPrinters.data?.data || [];
      const activePrinters = allBranchPrinters.filter(
        (p) => ["SFP", "MFP"].includes(p.printerType) && (p.isActive === true || p.isActive === undefined)
      );

      activePrinters.forEach((printerData) => {
        const printerId = printerData.printerId;
        if (printerData.lastFinalReadings) {
          const lastReadings = {};
          Object.entries(printerData.lastFinalReadings).forEach(
            ([size, sizeData]) => {
              lastReadings[size] = {
                "FINAL READING": sizeData["FINAL READING"],
                price: sizeData.price,
              };
            }
          );
          recentReadings[printerId] = lastReadings;
          dateMap[printerId] = "Moved from another branch";
        }
      });

      for (let daysBack = 1; daysBack <= maxDaysBack; daysBack++) {
        const checkDate = new Date(currentDate);
        checkDate.setDate(checkDate.getDate() - daysBack);
        const checkDateString = formatDateToYYYYMMDD(checkDate);

        try {
          const resReadings = await api.get(
            `/printer-readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(checkDateString)}`
          );
          const readingsList = resReadings.data?.data || [];

          if (readingsList.length > 0) {
            readingsList.forEach((docData) => {
              if (docData.readings && typeof docData.readings === "object") {
                Object.entries(docData.readings).forEach(
                  ([printerId, reading]) => {
                    if (
                      !recentReadings[printerId] &&
                      reading &&
                      typeof reading === "object"
                    ) {
                      const convertedReading = {};
                      Object.entries(reading).forEach(([size, sizeData]) => {
                        if (
                          sizeData &&
                          typeof sizeData === "object" &&
                          sizeData["FINAL READING"] !== undefined
                        ) {
                          convertedReading[size] = {
                            "FINAL READING": sizeData["FINAL READING"],
                            price: sizeData.price || 0,
                          };
                        }
                      });

                      if (Object.keys(convertedReading).length > 0) {
                        recentReadings[printerId] = convertedReading;
                        dateMap[printerId] = checkDateString;
                      }
                    }
                  }
                );
              }
            });
          }
        } catch (error) {
          console.error(`Error checking date ${checkDateString}:`, error);
        }

        const totalActivePrinters = activePrinters.length;
        const foundReadingsCount = Object.keys(recentReadings).length;

        if (
          foundReadingsCount >= totalActivePrinters &&
          totalActivePrinters > 0
        ) {
          break;
        }
      }

      return { recentReadings, dateMap };
    },
    [formatDateToYYYYMMDD]
  );

  const validatePrinterReadings = useCallback(() => {
    const errors = {};
    let hasErrors = false;

    Object.entries(printerReadings).forEach(([printerId, sizes]) => {
      Object.entries(sizes).forEach(([size, data]) => {
        const key = `${printerId}-${size}`;

        if (data.STARTING === "" || data["FINAL READING"] === "") {
          errors[key] = "Both starting and final readings are required";
          hasErrors = true;
        } else if (Number(data["FINAL READING"]) < Number(data.STARTING)) {
          errors[key] =
            "Final reading must be greater than or equal to starting reading";
          hasErrors = true;
        }
      });
    });

    setPrinterValidationErrors(errors);
    return !hasErrors;
  }, [printerReadings]);

  useEffect(() => {
    if (!date || !branchName || !userId) return;

    const loadDataForDate = async () => {
      try {
        setDataLoaded(false);
        setIsLoading(true);
        setPrinterReadings({});
        setHasExistingPrinterData(false);
        setPreviousDateMap({});
        setIsEditingPrinter(false);
        setPrinterDocId(null);

        const dateString =
          typeof date === "string" ? date : formatDateToYYYYMMDD(date);

        const resAllPrinters = await api.get(
          `/printers?branchName=${encodeURIComponent(branchName)}`
        );
        const allPrintersData = resAllPrinters.data?.data || [];
        const activePrinters = allPrintersData
          .filter((p) => ["SFP", "MFP"].includes(p.printerType) && (p.isActive === true || p.isActive === undefined))
          .map((doc) => ({
            id: doc.id || doc._id,
            ...doc,
          }))
          .filter((printer) => {
            return printer.printerId && printer.printerId.trim() !== "";
          });

        const inactivePrintersWithData = [];
        const resReadings = await api.get(
          `/printer-readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(dateString)}`
        );
        const readingsList = resReadings.data?.data || [];

        if (readingsList.length > 0) {
          const printerIdsWithReadings = new Set();
          readingsList.forEach((data) => {
            if (data.readings && typeof data.readings === "object") {
              Object.keys(data.readings).forEach((printerId) => {
                printerIdsWithReadings.add(printerId);
              });
            }
          });

          for (const printerId of printerIdsWithReadings) {
            const isAlreadyActive = activePrinters.some(
              (p) => p.printerId === printerId
            );
            if (!isAlreadyActive) {
              const inactiveMatch = allPrintersData.find(
                (p) => p.printerId === printerId && p.isActive === false
              );
              if (inactiveMatch) {
                inactivePrintersWithData.push({
                  id: inactiveMatch.id || inactiveMatch._id,
                  ...inactiveMatch,
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

        if (allRelevantPrinters.length === 0) {
          setDataLoaded(true);
          setIsLoading(false);
          return;
        }

        const initialReadings = {};
        allRelevantPrinters.forEach((printer) => {
          initialReadings[printer.printerId] = {};
          printer.prices?.forEach((priceObj) => {
            initialReadings[printer.printerId][priceObj.size] = {
              STARTING: "",
              "FINAL READING": "",
              noOfCopies: 0,
              price: Number(priceObj.price) || 0,
              total: 0,
              isPreLoaded: false,
            };
          });
        });

        if (allRelevantPrinters.length > 0) {
          try {
            const currentDate =
              typeof date === "string" ? new Date(date) : date;
            const { recentReadings, dateMap } = await findMostRecentReadings(
              currentDate,
              branchName,
              userId
            );

            setPreviousDateMap(dateMap);

            Object.entries(recentReadings).forEach(([printerId, reading]) => {
              if (initialReadings[printerId]) {
                Object.entries(reading).forEach(([size, sizeData]) => {
                  if (
                    initialReadings[printerId][size] &&
                    sizeData?.["FINAL READING"] !== undefined
                  ) {
                    initialReadings[printerId][size].STARTING =
                      sizeData["FINAL READING"] || 0;
                    initialReadings[printerId][size].isPreLoaded = true;
                  }
                });
              }
            });
          } catch (error) {
            console.error("Error loading recent readings:", error);
          }
        }

        try {
          if (readingsList.length > 0) {
            const docData = readingsList[0];
            setHasExistingPrinterData(true);
            setIsEditingPrinter(false);
            setPrinterDocId(docData.id || docData._id);
            if (docData.readings) {
              const mergedReadings = { ...initialReadings };
              allRelevantPrinters.forEach((printer) => {
                const pId = printer.printerId;
                if (!mergedReadings[pId]) mergedReadings[pId] = {};
                const savedPrinter = docData.readings[pId] || {};

                printer.prices?.forEach((priceObj) => {
                  const configuredPrice = Number(priceObj.price) || 0;
                  const savedSize = savedPrinter[priceObj.size];

                  if (savedSize) {
                    const starting =
                      savedSize.STARTING !== undefined ? savedSize.STARTING : "";
                    const finalReading =
                      savedSize["FINAL READING"] !== undefined
                        ? savedSize["FINAL READING"]
                        : "";
                    const savedPrice = Number(savedSize.price);
                    const unitPrice =
                      !isNaN(savedPrice) && savedPrice > 0
                        ? savedPrice
                        : configuredPrice;

                    const copies =
                      starting !== "" &&
                      finalReading !== "" &&
                      !isNaN(starting) &&
                      !isNaN(finalReading)
                        ? Math.max(0, Number(finalReading) - Number(starting))
                        : 0;

                    mergedReadings[pId][priceObj.size] = {
                      STARTING: starting,
                      "FINAL READING": finalReading,
                      noOfCopies: copies,
                      price: unitPrice,
                      total: copies * unitPrice,
                      isPreLoaded: Boolean(savedSize.isPreLoaded),
                    };
                  }
                });
              });
              setPrinterReadings(mergedReadings);
            } else {
              setPrinterReadings(initialReadings);
            }
          } else {
            setHasExistingPrinterData(false);
            setIsEditingPrinter(true);
            setPrinterReadings(initialReadings);
          }
        } catch (error) {
          console.error("Error loading snapshots:", error);
          setPrinterReadings(initialReadings);
        }
      } catch (error) {
        console.error("Error loading data for date:", error);
        showError("Failed to load data for selected date");
      } finally {
        setDataLoaded(true);
        setIsLoading(false);
      }
    };

    loadDataForDate();
  }, [
    date,
    branchName,
    userId,
    findMostRecentReadings,
    formatDateToYYYYMMDD,
    onFinalSubmitChange,
    showError,
  ]);

  useEffect(() => {
    if (!date || !branchName) {
      setIsFinalStateChecking(false);
      return;
    }
    setIsFinalStateChecking(true);

    const check = async () => {
      try {
        const dateString =
          typeof date === "string" ? date : formatDateToYYYYMMDD(date);
        const res = await api.get(
          `/printer-readings?branchName=${encodeURIComponent(branchName)}&date=${encodeURIComponent(dateString)}`
        );
        const readingsList = res.data?.data || [];
        if (readingsList.length > 0) {
          const anyFinal = readingsList.some(
            (d) =>
              Boolean(d.isFinalSubmitted) || Boolean(d.isLocked)
          );
          if (anyFinal) {
            onFinalSubmitChange?.(true);
          }
        }
      } catch (e) {
        console.error("[v0] PrinterReadingsSection final check failed:", e);
      } finally {
        setIsFinalStateChecking(false);
      }
    };
    check();
  }, [date, branchName, formatDateToYYYYMMDD, onFinalSubmitChange]);

  const handlePrinterInputChange = useCallback(
    (printerId, size, field, value) => {
      if (!date) {
        showWarning("Please select a date first");
        return;
      }

      if (isFinalSubmitted) {
        showWarning("Data is locked after final submission");
        return;
      }

      if (
        hasExistingPrinterData &&
        !isEditingPrinter &&
        !canEditCurrentDate() &&
        !canEditPastDate()
      ) {
        showWarning("Cannot edit this data. Enable edit mode first.");
        return;
      }

      const cleanedValue =
        value === ""
          ? ""
          : value === "0"
          ? 0
          : Number.parseFloat(value.replace(/[^0-9.]/g, "")) || "";

      if (field === "STARTING") {
        const currentData = printerReadings[printerId]?.[size];
        if (currentData?.isPreLoaded) {
          return;
        }
      }

      // Find configured price from printer
      const printerObj = printers.find((p) => p.printerId === printerId);
      const priceObj = printerObj?.prices?.find((p) => p.size === size);
      const configuredPrice = Number(priceObj?.price) || 0;

      setPrinterReadings((prev) => {
        const updated = { ...prev };
        if (!updated[printerId]) updated[printerId] = {};
        if (!updated[printerId][size]) {
          updated[printerId][size] = {
            STARTING: "",
            "FINAL READING": "",
            noOfCopies: 0,
            price: configuredPrice,
            total: 0,
            isPreLoaded: false,
          };
        } else {
          updated[printerId][size] = { ...updated[printerId][size] };
        }

        if (field === "STARTING") {
          updated[printerId][size].isPreLoaded = false;
        }

        updated[printerId][size][field] = cleanedValue;

        const starting = updated[printerId][size].STARTING;
        const finalReading = updated[printerId][size]["FINAL READING"];

        const existingPrice = Number(updated[printerId][size].price);
        const effectivePrice =
          !isNaN(existingPrice) && existingPrice > 0
            ? existingPrice
            : configuredPrice;
        updated[printerId][size].price = effectivePrice;

        if (
          starting !== "" &&
          finalReading !== "" &&
          !isNaN(starting) &&
          !isNaN(finalReading)
        ) {
          const startingNum = Number(starting) || 0;
          const finalReadingNum = Number(finalReading) || 0;
          const copies = Math.max(0, finalReadingNum - startingNum);
          updated[printerId][size].noOfCopies = copies;
          updated[printerId][size].total = copies * effectivePrice;
        } else {
          updated[printerId][size].noOfCopies = 0;
          updated[printerId][size].total = 0;
        }

        return updated;
      });

      const key = `${printerId}-${size}`;
      if (printerValidationErrors[key]) {
        setPrinterValidationErrors((prev) => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      }
    },
    [
      date,
      isFinalSubmitted,
      hasExistingPrinterData,
      isEditingPrinter,
      canEditCurrentDate,
      canEditPastDate,
      printerValidationErrors,
      printerReadings,
      printers,
      showWarning,
    ]
  );

  const handleSubmitPrinterReadings = useCallback(async () => {
    if (!date) {
      showError("Please select a date first");
      return;
    }

    if (!validatePrinterReadings()) {
      showError("Please fix the highlighted errors before submitting");
      return;
    }

    try {
      setIsLoading(true);
      const dateString =
        typeof date === "string" ? date : formatDateToYYYYMMDD(date);

      const res = await api.post("/printer-readings", {
        id: (hasExistingPrinterData && printerDocId) ? printerDocId : undefined,
        userId,
        branchName,
        date: dateString,
        readings: printerReadings,
        lastUpdated: new Date(),
        timestamp: new Date(),
      });

      setHasExistingPrinterData(true);
      if (res.data?.data?.id || res.data?.data?._id) {
        setPrinterDocId(res.data.data.id || res.data.data._id);
      }
      showSuccess(hasExistingPrinterData && printerDocId ? "Printer readings updated successfully" : "Printer readings saved successfully");

      setIsEditingPrinter(false);
    } catch (error) {
      console.error("Error saving printer readings:", error);
      showError(`Failed to save printer readings: ${error?.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [
    branchName,
    date,
    hasExistingPrinterData,
    printerReadings,
    userId,
    validatePrinterReadings,
    formatDateToYYYYMMDD,
    printerDocId,
    showError,
    showSuccess,
  ]);

  const handleEditPrinter = useCallback(() => {
    if (!canEditCurrentDate() && !canEditPastDate()) {
      showError(
        "Cannot edit this date. Only current date or approved past dates can be edited."
      );
      return;
    }
    if (isFinalSubmitted) {
      showError("Cannot edit data after final submission.");
      return;
    }
    setIsEditingPrinter(true);
  }, [canEditCurrentDate, canEditPastDate, isFinalSubmitted, showError]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingPrinter(false);
    window.location.reload();
  }, []);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (!dataLoaded) {
    return (
      <DailyReadingsSkeleton
        message="Loading printer readings data..."
        subtitle={`Fetching machine readings and counters for ${branchName || "branch"}...`}
      />
    );
  }

  if (printers.length === 0) {
    return (
      <div className="revenue-card">
        <div className="revenue-card-header">
          <div className="revenue-card-header-left">
            <Printer size={18} color="#059669" />
            <h3 className="revenue-card-title">Printer Readings</h3>
          </div>
        </div>
        <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
          <AlertTriangle size={32} color="#f59e0b" style={{ margin: "0 auto 8px" }} />
          <h4 style={{ margin: "0 0 4px", color: "#0f172a" }}>No Small Printers Available</h4>
          <p style={{ margin: 0, fontSize: "13px" }}>
            Please contact your admin to add small printers or transfer printers to this branch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {printers.map((printer) => {
            const printerTotal = (printer.prices || []).reduce((sum, priceObj) => {
              const sizeData = printerReadings[printer.printerId]?.[priceObj.size];
              if (!sizeData) return sum;
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
                const configuredPrice = Number(priceObj.price) || 0;
                const effectivePrice =
                  sizeData.price !== undefined &&
                  sizeData.price !== null &&
                  Number(sizeData.price) > 0
                    ? Number(sizeData.price)
                    : configuredPrice;
                return sum + copies * effectivePrice;
              }
              return sum;
            }, 0);

            return (
              <div
                key={printer.id}
                className={`revenue-printer-subcard ${
                  hasExistingPrinterData && !isEditingPrinter ? "completed" : ""
                } ${printer.isInactiveWithData ? "inactive" : ""}`}
                style={{ margin: 0 }}
              >
                <div className="revenue-printer-subcard-header">
                  <div className="revenue-printer-name-wrap">
                    <span className="revenue-printer-name">
                      {printer.printerName}
                    </span>
                    <span className="revenue-id-badge">
                      ID: {printer.printerId}
                    </span>
                    {hasExistingPrinterData && !isEditingPrinter && (
                      <span className="revenue-badge-available">
                        <CheckCircle2 size={13} /> Revenue Data
                      </span>
                    )}
                    {printer.isInactiveWithData && (
                      <span className="revenue-badge-warning">
                        <AlertTriangle size={13} /> Inactive (Has Data)
                      </span>
                    )}
                  </div>
                  {previousDateMap[printer.printerId] && (
                    <div className="printer-previous-data-info">
                      <Info size={13} />
                      Previous readings from: {previousDateMap[printer.printerId]}
                    </div>
                  )}
                </div>

                <div className="revenue-table-wrapper">
                  <table className="revenue-modern-table">
                    <thead>
                      <tr>
                        <th style={{ width: "22%" }}>READING TYPE</th>
                        <th className="center" style={{ width: "16%" }}>START READING</th>
                        <th className="center" style={{ width: "16%" }}>FINAL READING</th>
                        <th className="center" style={{ width: "14%" }}>NO OF COPIES</th>
                        <th className="center" style={{ width: "16%" }}>UNIT PRICE (₹)</th>
                        <th className="center" style={{ width: "16%" }}>AMOUNT (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printer.prices?.map((priceObj, index) => {
                        const configuredPrice = Number(priceObj.price) || 0;
                        const existingData = printerReadings[printer.printerId]?.[
                          priceObj.size
                        ];
                        const unitPrice =
                          existingData?.price !== undefined &&
                          existingData?.price !== null &&
                          Number(existingData.price) > 0
                            ? Number(existingData.price)
                            : configuredPrice;

                        const sizeData = existingData || {
                          STARTING: "",
                          "FINAL READING": "",
                          noOfCopies: 0,
                          price: unitPrice,
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

                        const calculatedTotal = copies * unitPrice;
                        const validationKey = `${printer.printerId}-${priceObj.size}`;
                        const hasError =
                          printerValidationErrors[validationKey];
                        const isPreLoaded = sizeData.isPreLoaded === true;
                        const shouldBeReadOnly = isPreLoaded;

                        const isReadonlyView =
                          hasExistingPrinterData && !isEditingPrinter;

                        return (
                          <tr key={index}>
                            <td style={{ fontWeight: 800, color: "#0f172a", textTransform: "uppercase", fontSize: "13.5px", letterSpacing: "0.02em" }}>
                              {priceObj.size}
                            </td>
                            <td className="center">
                              {isReadonlyView ? (
                                <div className="printer-cell-pill-grey">
                                  {sizeData.STARTING !== ""
                                    ? sizeData.STARTING
                                    : "0"}
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={sizeData.STARTING}
                                  onChange={(e) =>
                                    handlePrinterInputChange(
                                      printer.printerId,
                                      priceObj.size,
                                      "STARTING",
                                      e.target.value
                                    )
                                  }
                                  className={`printer-reading-input ${
                                    hasError ? "validation-error" : ""
                                  } ${
                                    shouldBeReadOnly
                                      ? "readonly-starting-value"
                                      : ""
                                  }`}
                                  disabled={
                                    isLoading ||
                                    isFinalSubmitted ||
                                    shouldBeReadOnly
                                  }
                                  readOnly={shouldBeReadOnly}
                                  min="0"
                                  placeholder="0"
                                  title={
                                    shouldBeReadOnly
                                      ? `Starting value loaded from previous date: ${
                                          previousDateMap[printer.printerId] ||
                                          "previous data"
                                        }`
                                      : "Enter starting reading"
                                  }
                                />
                              )}
                            </td>
                            <td className="center">
                              {isReadonlyView ? (
                                <div className="printer-cell-pill-grey">
                                  {sizeData["FINAL READING"] !== ""
                                    ? sizeData["FINAL READING"]
                                    : "0"}
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={sizeData["FINAL READING"]}
                                  onChange={(e) =>
                                    handlePrinterInputChange(
                                      printer.printerId,
                                      priceObj.size,
                                      "FINAL READING",
                                      e.target.value
                                    )
                                  }
                                  className={`printer-reading-input ${
                                    hasError ? "validation-error" : ""
                                  }`}
                                  disabled={isLoading || isFinalSubmitted}
                                  min="0"
                                  placeholder="0"
                                />
                              )}
                            </td>
                            <td className="center">
                              <div className="printer-cell-pill-grey">
                                {copies > 0 ? copies.toLocaleString() : "0"}
                              </div>
                            </td>
                            <td className="center">
                              <div className="printer-cell-pill-grey">
                                ₹{unitPrice.toFixed(2)}
                              </div>
                            </td>
                            <td className="center">
                              <div className="printer-cell-pill-green">
                                {formatCurrency(calculatedTotal)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="revenue-table-total-row">
                        <td colSpan="5" style={{ fontWeight: 600, color: "#166534" }}>
                          Total for {printer.printerName}
                        </td>
                        <td
                          className="right"
                          style={{
                            fontWeight: 800,
                            color: "#047857",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {formatCurrency(printerTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Action Buttons at Bottom */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            {hasExistingPrinterData &&
              !isEditingPrinter &&
              (canEditCurrentDate() || canEditPastDate()) &&
              !isFinalSubmitted && (
                <button
                  onClick={handleEditPrinter}
                  className="printer-edit-button"
                  disabled={isLoading}
                >
                  <Edit3 size={15} /> Edit Readings
                </button>
              )}
            {isEditingPrinter && (
              <>
                {hasExistingPrinterData && (
                  <button
                    onClick={handleCancelEdit}
                    className="printer-cancel-button"
                    disabled={isLoading}
                  >
                    <X size={15} /> Cancel
                  </button>
                )}
                <button
                  onClick={handleSubmitPrinterReadings}
                  className="printer-save-button"
                  disabled={isLoading}
                >
                  <Save size={15} /> {hasExistingPrinterData ? "Update Readings" : "Save Readings"}
                </button>
              </>
            )}

            {onNextStep && (
              <button
                type="button"
                onClick={onNextStep}
                className="account-step-next-btn"
              >
                Next <ChevronRight size={15} />
              </button>
            )}
          </div>

      {/* Popup Component */}
      <Popup
        show={popup.show}
        message={popup.message}
        type={popup.type}
        onClose={() => {}}
      />
    </div>
  );
};

export default PrinterReadingsSection;
