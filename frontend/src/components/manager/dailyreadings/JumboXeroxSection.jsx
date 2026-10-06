"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../services/api";
import {
  Layers,
  CheckCircle2,
  Lock,
  Edit3,
  Save,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Papa from "papaparse";
import Popup from "../../common/Popup";
import { usePopup } from "../../../hooks/usePopup";
import DailyReadingsSkeleton from "./DailyReadingsSkeleton";

const JumboXeroxSection = ({
  date,
  branchName,
  userId,
  approvedDates,
  onFinalSubmitChange,
  isFinalSubmitted,
  isStockReadingsSubmitted = false,
  onCsvVerificationChange,
  onNextStep,
  onPrevStep,
}) => {
  const [printers, setPrinters] = useState([]);
  const [jumboXeroxConfig, setJumboXeroxConfig] = useState([]);
  const [filteredJumboConfig, setFilteredJumboConfig] = useState([]);
  const [jumboRows, setJumboRows] = useState([]);
  const [customJumboRows, setCustomJumboRows] = useState([]);
  const [jumboCounter, setJumboCounter] = useState({
    start: "",
    end: "",
    sftPrinted: "",
  });
  const [hasExistingJumboData, setHasExistingJumboData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [printersLoaded, setPrintersLoaded] = useState(false);
  const [jumboValidationErrors, setJumboValidationErrors] = useState({});
  const [isEditingJumbo, setIsEditingJumbo] = useState(false);
  const [jumboDocId, setJumboDocId] = useState(null);
  const [isSizeValid, setIsSizeValid] = useState(true);
  const [sftCalculationResults, setSftCalculationResults] = useState({
    sqftTotals: {},
    totalSqft: 0,
  });
  const [isSftCalculated, setIsSftCalculated] = useState(false);
  const [previousReading, setPreviousReading] = useState(null);
  const [printerLastFinalReading, setPrinterLastFinalReading] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [verificationResults, setVerificationResults] = useState([]);
  const [showCsvResults, setShowCsvResults] = useState(false);
  const { popup, showSuccess, showError, showInfo, hidePopup } = usePopup();

  const paperDimensions = {
    A0: { width: 33.1, height: 46.8 },
    A1: { width: 23.4, height: 33.1 },
    A2: { width: 16.5, height: 23.4 },
    A3: { width: 11.7, height: 16.5 },
    A4: { width: 8.3, height: 11.7 },
    A5: { width: 5.8, height: 8.3 },
    A6: { width: 4.1, height: 5.8 },
    A7: { width: 2.9, height: 4.1 },
    A8: { width: 2.0, height: 2.9 },
    A9: { width: 1.5, height: 2.0 },
    A10: { width: 1.0, height: 1.5 },
  };

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

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  function allowZeroNumber(val) {
    if (val === "" || val === null || val === undefined) return "";
    const num = Number(val);
    return Number.isNaN(num) ? "" : num;
  }

  useEffect(() => {
    if (!branchName) return;

    const fetchPrinters = async () => {
      try {
        const res = await api.get("/printers", {
          params: { branchName, printerType: "LFP", isActive: true },
        });
        const printersData = res.data?.data || [];
        setPrinters(printersData);
        setPrintersLoaded(true);
      } catch (error) {
        console.error("Error loading printers:", error);
        showError("Failed to load printers");
        setPrintersLoaded(true);
      }
    };

    fetchPrinters();
  }, [branchName, showError]);

  useEffect(() => {
    if (!branchName) {
      setJumboXeroxConfig([]);
      setConfigLoaded(true);
      return;
    }

    const fetchConfig = async () => {
      try {
        setConfigLoaded(false);
        const res = await api.get("/jumbo-xerox/machines", {
          params: { branch: branchName },
        });
        const configData = res.data?.data || [];
        setJumboXeroxConfig(configData);
        setConfigLoaded(true);
      } catch (error) {
        console.error("Error loading JumboXerox config:", error);
        showError("Failed to load JumboXerox configuration");
        setConfigLoaded(true);
      }
    };

    fetchConfig();
  }, [branchName, showError]);

  useEffect(() => {
    if (!printersLoaded || !configLoaded) return;

    const printerIds = printers.map((printer) => printer.printerId);
    const filtered = jumboXeroxConfig.filter((config) =>
      printerIds.includes(config.printerId)
    );

    setFilteredJumboConfig(filtered);
  }, [printers, jumboXeroxConfig, printersLoaded, configLoaded]);

  useEffect(() => {
    if (!date || !branchName || !userId || !printers.length) return;

    const loadPreviousReadingAndPrinterData = async () => {
      try {
        let foundReading = null;
        const res = await api.get("/jumbo-xerox/readings", {
          params: { branchName, userId },
        });
        const readings = res.data?.data || [];
        const baseDate = new Date(date);

        for (let i = 1; i <= 30; i++) {
          const searchDate = new Date(baseDate);
          searchDate.setDate(baseDate.getDate() - i);
          const searchDateString = formatDateToYYYYMMDD(searchDate);

          const match = readings.find((r) => r.date === searchDateString);
          if (match) {
            foundReading = match;
            break;
          }
        }

        setPreviousReading(foundReading);

        const lfpRes = await api.get("/printers", {
          params: { branchName, printerType: "LFP", isActive: true },
        });
        const lfpPrinters = lfpRes.data?.data || [];
        if (lfpPrinters.length > 0) {
          const printerData = lfpPrinters[0];
          if (printerData.lastFinalReadings) {
            setPrinterLastFinalReading(printerData.lastFinalReadings);
          }
        }
      } catch (error) {
        console.error("Error loading previous reading:", error);
      }
    };

    loadPreviousReadingAndPrinterData();
  }, [date, branchName, userId, printers, formatDateToYYYYMMDD]);

  const initialJumboRows = useMemo(() => {
    if (filteredJumboConfig.length === 0) return [];

    const groupedData = filteredJumboConfig.reduce((acc, config) => {
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

    const typeOrder = ["COLOUR", "SCAN", "B/W", "PHOTO PRINT"];
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
  }, [filteredJumboConfig]);

  const groupedJumboData = useMemo(() => {
    const grouped = {};
    jumboRows.forEach((row) => {
      if (!grouped[row.type]) {
        grouped[row.type] = [];
      }
      grouped[row.type].push(row);
    });

    const orderedGrouped = {};
    const typeOrder = ["COLOUR", "SCAN", "B/W", "PHOTO PRINT"];

    typeOrder.forEach((type) => {
      if (grouped[type]) {
        orderedGrouped[type] = grouped[type];
      }
    });

    Object.keys(grouped).forEach((type) => {
      if (!typeOrder.includes(type)) {
        orderedGrouped[type] = grouped[type];
      }
    });

    return orderedGrouped;
  }, [jumboRows]);

  const jumboTotals = useMemo(() => {
    const standardTotals = jumboRows.reduce(
      (acc, row) => {
        acc.qty += Number(row.qty) || 0;
        acc.amount += Number(row.amount) || 0;
        return acc;
      },
      { qty: 0, amount: 0 }
    );

    const customTotals = customJumboRows.reduce(
      (acc, row) => {
        acc.qty += Number(row.qty) || 0;
        acc.amount += Number(row.amount) || 0;
        return acc;
      },
      { qty: 0, amount: 0 }
    );

    return {
      qty: standardTotals.qty + customTotals.qty,
      amount: standardTotals.amount + customTotals.amount,
    };
  }, [jumboRows, customJumboRows]);

  useEffect(() => {
    if (!date || !branchName || !userId || !configLoaded) return;

    const loadDataForDate = async () => {
      try {
        setDataLoaded(false);
        setIsLoading(true);
        setJumboRows(initialJumboRows);
        setCustomJumboRows([]);
        setHasExistingJumboData(false);
        setIsEditingJumbo(false);
        setJumboDocId(null);
        setJumboCounter({ start: "", end: "", sftPrinted: "" });

        const dateString =
          typeof date === "string" ? date : formatDateToYYYYMMDD(date);

        const res = await api.get("/jumbo-xerox/readings", {
          params: { branchName, date: dateString },
        });
        const docs = res.data?.data || [];

        if (docs.length > 0) {
          const docData = docs[0];
          setHasExistingJumboData(true);
          setIsEditingJumbo(false);
          setJumboDocId(docData.id || docData._id);

          if (docData.rows) {
            const savedRows = docData.rows
              .filter((row) => !row.isCustom)
              .map((row) => ({
                ...row,
                qty: row.qty === 0 ? "" : row.qty,
                amount: row.amount === 0 ? "" : row.amount,
                unitPrice:
                  row.unitPrice || row.unitPrice === 0
                    ? row.unitPrice
                    : row.unitPrice,
              }));

            const mergedRows = initialJumboRows.map((initialRow) => {
              const savedRow = savedRows.find(
                (r) => r.type === initialRow.type && r.size === initialRow.size
              );
              return savedRow
                ? { ...initialRow, ...savedRow }
                : initialRow;
            });

            setJumboRows(mergedRows);

            const savedCustomRows = docData.rows
              .filter((row) => row.isCustom)
              .map((row) => ({
                ...row,
                qty: row.qty === 0 ? "" : row.qty,
                amount: row.amount === 0 ? "" : row.amount,
                unitPrice: row.unitPrice === 0 ? "" : row.unitPrice,
                size: row.size || "",
              }));
            setCustomJumboRows(savedCustomRows);
          }

          if (docData.jumboCounter) {
            const startVal =
              docData.jumboCounter.start !== undefined &&
              docData.jumboCounter.start !== null
                ? String(docData.jumboCounter.start)
                : "";
            const endVal =
              docData.jumboCounter.end !== undefined &&
              docData.jumboCounter.end !== null
                ? String(docData.jumboCounter.end)
                : "";
            const sftVal =
              docData.jumboCounter.sftPrinted !== undefined &&
              docData.jumboCounter.sftPrinted !== null &&
              docData.jumboCounter.sftPrinted !== ""
                ? String(docData.jumboCounter.sftPrinted)
                : startVal !== "" || endVal !== ""
                ? Math.max(
                    0,
                    (Number(endVal) || 0) - (Number(startVal) || 0)
                  ).toFixed(2)
                : "";

            setJumboCounter({
              start: startVal,
              end: endVal,
              sftPrinted: sftVal,
            });
          }
        } else {
          setHasExistingJumboData(false);
          setIsEditingJumbo(true);
          setJumboRows(initialJumboRows);

          if (previousReading?.jumboCounter?.end) {
            setJumboCounter({
              start: previousReading.jumboCounter.end,
              end: "",
              sftPrinted: "",
            });
          } else if (printerLastFinalReading?.jumboCounter?.end) {
            setJumboCounter({
              start: printerLastFinalReading.jumboCounter.end,
              end: "",
              sftPrinted: "",
            });
          }
        }
      } catch (error) {
        console.error("Error loading jumbo data:", error);
        showError("Failed to load Jumbo Xerox data: " + (error.response?.data?.message || error.message));
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
    configLoaded,
    initialJumboRows,
    formatDateToYYYYMMDD,
    previousReading,
    printerLastFinalReading,
    showError,
  ]);

  const handleJumboInputChange = useCallback(
    (index, field, value) => {
      if (!date) {
        showInfo("Please select a date first");
        return;
      }

      if (isFinalSubmitted) {
        showInfo("Data is locked after final submission");
        return;
      }

      if (
        hasExistingJumboData &&
        !isEditingJumbo &&
        !canEditCurrentDate() &&
        !canEditPastDate()
      ) {
        showInfo("Cannot edit this data. Enable edit mode first.");
        return;
      }

      const updatedRows = [...jumboRows];
      const cleanedValue =
        value === ""
          ? ""
          : Number.parseFloat(value.replace(/[^0-9.]/g, "")) || "";

      updatedRows[index][field] = cleanedValue;

      if (field === "qty") {
        const qty = Number(cleanedValue) || 0;
        const unitPrice = Number(updatedRows[index].unitPrice) || 0;
        updatedRows[index].amount = qty * unitPrice;
      }

      setJumboRows(updatedRows);

      if (jumboValidationErrors[`jumbo-${index}`]) {
        setJumboValidationErrors((prev) => {
          const updated = { ...prev };
          delete updated[`jumbo-${index}`];
          return updated;
        });
      }
    },
    [
      date,
      jumboRows,
      hasExistingJumboData,
      isEditingJumbo,
      canEditCurrentDate,
      canEditPastDate,
      isFinalSubmitted,
      jumboValidationErrors,
      showInfo,
    ]
  );

  const handleCustomJumboInputChange = useCallback(
    (index, field, value) => {
      if (!date) {
        showInfo("Please select a date first");
        return;
      }

      if (isFinalSubmitted) {
        showInfo("Data is locked after final submission");
        return;
      }

      const updatedRows = [...customJumboRows];

      if (field === "size") {
        updatedRows[index][field] = value;
      } else {
        const cleanedValue =
          value === ""
            ? ""
            : Number.parseFloat(value.replace(/[^0-9.]/g, "")) || "";
        updatedRows[index][field] = cleanedValue;

        if (field === "qty" || field === "unitPrice") {
          const qty =
            field === "qty"
              ? Number(cleanedValue) || 0
              : Number(updatedRows[index].qty) || 0;
          const unitPrice =
            field === "unitPrice"
              ? Number(cleanedValue) || 0
              : Number(updatedRows[index].unitPrice) || 0;
          updatedRows[index].amount = qty * unitPrice;
        }
      }

      setCustomJumboRows(updatedRows);
    },
    [date, customJumboRows, isFinalSubmitted, showInfo]
  );

  const handleAddCustomRow = () => {
    setCustomJumboRows((prev) => [
      ...prev,
      {
        type: "CUSTOM",
        size: "",
        unitPrice: "",
        qty: "",
        amount: "",
        isCustom: true,
      },
    ]);
  };

  const handleRemoveCustomRow = () => {
    if (customJumboRows.length > 0) {
      setCustomJumboRows((prev) => prev.slice(0, -1));
    }
  };

  const handleCounterChange = useCallback(
    (field, value) => {
      if (!date) {
        showInfo("Please select a date first");
        return;
      }

      if (isFinalSubmitted) {
        showInfo("Data is locked after final submission");
        return;
      }

      const cleanedValue =
        field === "sftPrinted"
          ? value
          : value === ""
          ? ""
          : allowZeroNumber(value.replace(/[^0-9.]/g, ""));

      const updatedCounter = { ...jumboCounter, [field]: cleanedValue };

      if (field === "start" || field === "end") {
        const startVal =
          updatedCounter.start !== "" ? Number(updatedCounter.start) : 0;
        const endVal =
          updatedCounter.end !== "" ? Number(updatedCounter.end) : 0;
        if (updatedCounter.start !== "" || updatedCounter.end !== "") {
          updatedCounter.sftPrinted = Math.max(0, endVal - startVal).toFixed(2);
        } else {
          updatedCounter.sftPrinted = "";
        }
      }

      setJumboCounter(updatedCounter);
    },
    [date, jumboCounter, isFinalSubmitted, showInfo]
  );

  const isStartCounterDisabled = useCallback(() => {
    if (isLoading || isFinalSubmitted) return true;
    if (hasExistingJumboData && !isEditingJumbo) return true;
    if (hasExistingJumboData) return true;
    if (previousReading?.jumboCounter?.end !== undefined && previousReading.jumboCounter.end !== null) return true;
    if (printerLastFinalReading?.jumboCounter?.end !== undefined && printerLastFinalReading.jumboCounter.end !== null) return true;
    return false;
  }, [isLoading, isFinalSubmitted, hasExistingJumboData, isEditingJumbo, previousReading, printerLastFinalReading]);

  const handleSubmitJumboXerox = async () => {
    if (!date) {
      showError("Please select a date first");
      return;
    }

    try {
      setIsLoading(true);
      const dateString =
        typeof date === "string" ? date : formatDateToYYYYMMDD(date);

      const allRows = [
        ...jumboRows.map((row) => ({
          ...row,
          qty: row.qty === "" ? 0 : Number(row.qty) || 0,
          amount: row.amount === "" ? 0 : Number(row.amount) || 0,
          unitPrice: Number(row.unitPrice) || 0,
          isCustom: false,
        })),
        ...customJumboRows.map((row) => ({
          ...row,
          qty: row.qty === "" ? 0 : Number(row.qty) || 0,
          amount: row.amount === "" ? 0 : Number(row.amount) || 0,
          unitPrice: Number(row.unitPrice) || 0,
          isCustom: true,
        })),
      ];

      const counterStart =
        jumboCounter.start !== "" ? Number(jumboCounter.start) : 0;
      const counterEnd =
        jumboCounter.end !== "" ? Number(jumboCounter.end) : 0;
      const counterSft =
        jumboCounter.sftPrinted !== ""
          ? Number(jumboCounter.sftPrinted)
          : Math.max(0, counterEnd - counterStart);

      const dataToSave = {
        id: hasExistingJumboData && jumboDocId ? jumboDocId : undefined,
        userId,
        branchName,
        date: dateString,
        rows: allRows,
        jumboCounter: {
          start: counterStart,
          end: counterEnd,
          sftPrinted: counterSft,
        },
        totalAmount: jumboTotals.amount,
      };

      if (hasExistingJumboData && jumboDocId) {
        try {
          await api.put(`/jumbo-xerox/readings/${jumboDocId}`, dataToSave);
        } catch (putErr) {
          if (putErr.response?.status === 404) {
            await api.post("/jumbo-xerox/readings", {
              ...dataToSave,
              id: jumboDocId,
              _id: jumboDocId,
            });
          } else {
            throw putErr;
          }
        }
        showSuccess("Large Format Printing readings updated successfully");
      } else {
        const res = await api.post("/jumbo-xerox/readings", dataToSave);
        const created = res.data?.data;
        if (created?.id || created?._id) {
          setJumboDocId(created.id || created._id);
        }
        setHasExistingJumboData(true);
        showSuccess("Large Format Printing readings saved successfully");
      }

      setIsEditingJumbo(false);
    } catch (error) {
      console.error("Error saving jumbo readings:", error);
      showError("Failed to save Large Format Printing readings: " + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditJumbo = () => {
    if (!canEditCurrentDate() && !canEditPastDate()) {
      showError("Cannot edit this date.");
      return;
    }
    if (isFinalSubmitted) {
      showError("Data is locked after final submission.");
      return;
    }
    setIsEditingJumbo(true);
  };

  const handleCancelEdit = () => {
    setIsEditingJumbo(false);
    window.location.reload();
  };

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
        message="Loading large format printing data..."
        subtitle={`Fetching jumbo xerox entries and sqft meters for ${branchName || "branch"}...`}
      />
    );
  }

  const isReadonlyView = hasExistingJumboData && !isEditingJumbo;

  return (
    <div className="revenue-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "0" }}>
          <div className="revenue-table-wrapper">
            <table className="revenue-modern-table">
              <thead>
                <tr>
                  <th style={{ width: "25%" }}>TYPE / SIZE</th>
                  <th className="center" style={{ width: "25%" }}>UNIT PRICE (₹)</th>
                  <th className="center" style={{ width: "25%" }}>QTY</th>
                  <th className="center" style={{ width: "25%" }}>AMOUNT (₹)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedJumboData).map(([type, items]) => (
                  <React.Fragment key={type}>
                    <tr>
                      <td
                        colSpan="4"
                        style={{
                          backgroundColor: "#065f46",
                          color: "#ffffff",
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: "12px",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          padding: "8px 12px",
                        }}
                      >
                        {type}
                      </td>
                    </tr>
                    {items.map((row, index) => {
                      const originalIndex = jumboRows.findIndex(
                        (r) => r.type === row.type && r.size === row.size
                      );

                      return (
                        <tr key={`${type}-${index}`}>
                          <td style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                            {row.size}
                          </td>
                          <td className="center">
                            <div className="printer-cell-pill-grey">
                              ₹{Number(row.unitPrice).toFixed(2)}
                            </div>
                          </td>
                          <td className="center">
                            {isReadonlyView ? (
                              <div className="printer-cell-pill-grey">
                                {row.qty || "0"}
                              </div>
                            ) : (
                              <input
                                type="number"
                                inputMode="numeric"
                                value={row.qty}
                                onChange={(e) =>
                                  handleJumboInputChange(
                                    originalIndex,
                                    "qty",
                                    e.target.value
                                  )
                                }
                                className="printer-reading-input"
                                disabled={isLoading || isFinalSubmitted}
                                min="0"
                                placeholder="0"
                              />
                            )}
                          </td>
                          <td className="center">
                            <div className="printer-cell-pill-green">
                              {formatCurrency(row.amount || 0)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}

                {/* Custom Rows if any */}
                {customJumboRows.length > 0 && (
                  <>
                    <tr>
                      <td
                        colSpan="4"
                        style={{
                          backgroundColor: "#065f46",
                          color: "#ffffff",
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: "12px",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          padding: "7px 12px",
                        }}
                      >
                        CUSTOM
                      </td>
                    </tr>
                    {customJumboRows.map((row, index) => (
                      <tr key={`custom-${index}`}>
                        <td>
                          {isReadonlyView ? (
                            <span style={{ fontWeight: 600 }}>{row.size || "Custom"}</span>
                          ) : (
                            <input
                              type="text"
                              value={row.size}
                              onChange={(e) =>
                                handleCustomJumboInputChange(
                                  index,
                                  "size",
                                  e.target.value
                                )
                              }
                              className="jumbo-input"
                              style={{ textAlign: "left" }}
                              placeholder="Size"
                            />
                          )}
                        </td>
                        <td className="center">
                          {isReadonlyView ? (
                            <span>₹{Number(row.unitPrice || 0).toFixed(2)}</span>
                          ) : (
                            <input
                              type="number"
                              inputMode="numeric"
                              value={row.unitPrice}
                              onChange={(e) =>
                                handleCustomJumboInputChange(
                                  index,
                                  "unitPrice",
                                  e.target.value
                                )
                              }
                              className="jumbo-input"
                              placeholder="Price"
                            />
                          )}
                        </td>
                        <td className="center">
                          {isReadonlyView ? (
                            <span>{row.qty || "0"}</span>
                          ) : (
                            <input
                              type="number"
                              inputMode="numeric"
                              value={row.qty}
                              onChange={(e) =>
                                handleCustomJumboInputChange(
                                  index,
                                  "qty",
                                  e.target.value
                                )
                              }
                              className="jumbo-input"
                              placeholder="0"
                            />
                          )}
                        </td>
                        <td className="right" style={{ color: "#059669", fontWeight: 700 }}>
                          {formatCurrency(row.amount || 0)}
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Add/Remove Custom Row buttons in edit mode */}
                {(!hasExistingJumboData || isEditingJumbo) && !isFinalSubmitted && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                        <button
                          type="button"
                          onClick={handleAddCustomRow}
                          className="printz-btn-primary"
                          style={{ fontSize: "12px", padding: "6px 14px" }}
                        >
                          + Add Custom Row
                        </button>
                        {customJumboRows.length > 0 && (
                          <button
                            type="button"
                            onClick={handleRemoveCustomRow}
                            style={{
                              backgroundColor: "#fee2e2",
                              color: "#b91c1c",
                              border: "1px solid #fecaca",
                              borderRadius: "8px",
                              padding: "6px 14px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            Remove Last
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="revenue-table-total-row">
                  <td colSpan="3" style={{ fontWeight: 700, color: "#166534" }}>
                    Total Large Format Printing
                  </td>
                  <td
                    className="right"
                    style={{
                      fontWeight: 800,
                      color: "#047857",
                      fontSize: "14px",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {formatCurrency(jumboTotals.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Counter Details Box */}
          <div style={{ padding: "14px 20px" }}>
            <div className="revenue-counter-box" style={{ margin: 0 }}>
              <h4 className="revenue-counter-title">Jumbo Counter Details</h4>
              <div className="revenue-counter-grid">
                <div className="revenue-counter-tile">
                  <span className="revenue-counter-label">Start Counter</span>
                  {isReadonlyView ? (
                    <div className="printer-cell-pill-grey" style={{ width: "100%", height: "42px", justifyContent: "flex-start", padding: "0 14px", fontSize: "16px" }}>
                      {jumboCounter.start || "0"}
                    </div>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={jumboCounter.start}
                      onChange={(e) => handleCounterChange("start", e.target.value)}
                      className="printer-reading-input"
                      style={{ width: "100%", maxWidth: "100%", textAlign: "left", padding: "0 14px", height: "42px" }}
                      disabled={isStartCounterDisabled()}
                      placeholder="0"
                    />
                  )}
                </div>
                <div className="revenue-counter-tile">
                  <span className="revenue-counter-label">End Counter</span>
                  {isReadonlyView ? (
                    <div className="printer-cell-pill-grey" style={{ width: "100%", height: "42px", justifyContent: "flex-start", padding: "0 14px", fontSize: "16px" }}>
                      {jumboCounter.end || "0"}
                    </div>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={jumboCounter.end}
                      onChange={(e) => handleCounterChange("end", e.target.value)}
                      className="printer-reading-input"
                      style={{ width: "100%", maxWidth: "100%", textAlign: "left", padding: "0 14px", height: "42px" }}
                      disabled={isLoading || isFinalSubmitted}
                      placeholder="0"
                    />
                  )}
                </div>
                <div className="revenue-counter-tile">
                  <span className="revenue-counter-label">SFT Printed</span>
                  <div
                    className="printer-cell-pill-green"
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      height: "42px",
                      fontSize: "16px",
                      fontWeight: 800,
                      justifyContent: "flex-start",
                      padding: "0 14px",
                    }}
                  >
                    {jumboCounter.sftPrinted || "0"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons at Bottom */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", padding: "12px 20px 18px 20px", flexWrap: "wrap" }}>
            <div>
              {onPrevStep && (
                <button
                  type="button"
                  onClick={onPrevStep}
                  className="account-step-back-btn"
                  disabled={isLoading}
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {hasExistingJumboData &&
                !isEditingJumbo &&
                (canEditCurrentDate() || canEditPastDate()) &&
                !isFinalSubmitted && (
                  <button
                    onClick={handleEditJumbo}
                    className="printer-edit-button"
                    disabled={isLoading}
                  >
                    <Edit3 size={15} /> Edit Readings
                  </button>
                )}
              {(isEditingJumbo || !hasExistingJumboData) && !isFinalSubmitted && (
                <div style={{ display: "flex", gap: "8px" }}>
                  {isEditingJumbo && hasExistingJumboData && (
                    <button
                      onClick={handleCancelEdit}
                      className="printer-cancel-button"
                      disabled={isLoading}
                    >
                      <X size={15} /> Cancel
                    </button>
                  )}
                  <button
                    onClick={handleSubmitJumboXerox}
                    className="printer-save-button"
                    disabled={isLoading}
                  >
                    <Save size={15} />{" "}
                    {isEditingJumbo && hasExistingJumboData
                      ? "Update Readings"
                      : "Save Readings"}
                  </button>
                </div>
              )}

              {onNextStep && (
                <button
                  type="button"
                  onClick={onNextStep}
                  className="account-step-next-btn"
                >
                  Next <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
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

export default JumboXeroxSection;
