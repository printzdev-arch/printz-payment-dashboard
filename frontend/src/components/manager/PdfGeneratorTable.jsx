import React, { useEffect, useState, forwardRef, useCallback } from "react";
import api from "../../services/api";
import {
  Printer,
  Calculator,
  Boxes,
  Layers,
  CheckCircle2,
  DollarSign,
  FileSpreadsheet,
  Package,
} from "lucide-react";
import "../../styles/dailyStockRevenue.css";
import "../../styles/printerreadings.css";
import "../../styles/PdfGenerator.css";

const PdfGeneratorTable = forwardRef((props, ref) => {
  const [printers, setPrinters] = useState([]);
  const [printerReadings, setPrinterReadings] = useState({});
  const [totalAmountData, setTotalAmountData] = useState({
    rows: [],
    totalAmount: 0,
    rowsMap: {},
    previousBalanceRows: [],
  });
  const [jumboXeroxData, setJumboXeroxData] = useState({});
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  const formatDateToYYYYMMDD = useCallback((date) => {
    if (!date) return "";
    if (typeof date === "string") return date;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const dateStr = typeof props.pdfDate === "string" 
    ? props.pdfDate 
    : (props.pdfDate instanceof Date ? formatDateToYYYYMMDD(props.pdfDate) : "");
  const branchName = props.userData?.branch || props.userData?.branchName || "";

  const resetData = useCallback(() => {
    setPrinters([]);
    setPrinterReadings({});
    setTotalAmountData({
      rows: [],
      totalAmount: 0,
      rowsMap: {},
      previousBalanceRows: [],
    });
    setJumboXeroxData({});
    setStockData([]);
    setDataLoaded(false);
  }, []);

  const loadAllData = useCallback(async () => {
    if (!branchName || !dateStr) return;

    setLoading(true);
    resetData();

    try {
      console.log("Loading preview data for date:", dateStr, "branch:", branchName);

      const [
        printersData,
        readingsData,
        totalAmountResult,
        jumboXeroxResult,
        stockResult,
      ] = await Promise.all([
        fetchPrintersData(branchName),
        fetchPrinterReadingsData(branchName, dateStr),
        fetchTotalAmountData(branchName, dateStr),
        fetchJumboXeroxData(branchName, dateStr),
        fetchStockData(branchName, dateStr),
      ]);

      setPrinters(printersData);
      setPrinterReadings(readingsData);
      setTotalAmountData(totalAmountResult);
      setJumboXeroxData(jumboXeroxResult);
      setStockData(stockResult);
      setDataLoaded(true);

      console.log("Preview data loaded successfully");
    } catch (error) {
      console.error("Error loading preview data:", error);
    } finally {
      setLoading(false);
    }
  }, [branchName, dateStr, resetData]);

  const fetchPrintersData = async (branch) => {
    try {
      const res = await api.get("/printers", {
        params: { branchName: branch },
      });
      return res.data?.data || (Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching printer data:", error);
      return [];
    }
  };

  const fetchPrinterReadingsData = async (branch, dateString) => {
    try {
      const res = await api.get("/printer-readings", {
        params: { branchName: branch, date: dateString },
      });
      const records =
        res.data?.data || (Array.isArray(res.data) ? res.data : []);

      const readings = {};
      records.forEach((data) => {
        if (Array.isArray(data.readings)) {
          data.readings.forEach((r) => {
            if (r && r.printerId) {
              if (!readings[r.printerId]) readings[r.printerId] = {};
              const jobKey = r.jobType || r.size || "default";
              readings[r.printerId][jobKey] = {
                STARTING: r.startingReading,
                "FINAL READING": r.finalReading,
                noOfCopies: r.noOfCopies,
                price: r.price,
                total: r.total,
                isPreLoaded: r.isPreLoaded,
              };
            }
          });
        } else if (data.readings && typeof data.readings === "object") {
          Object.keys(data.readings).forEach((printerId) => {
            readings[printerId] = data.readings[printerId];
          });
        }
      });
      return readings;
    } catch (error) {
      console.error("Error fetching printer readings:", error);
      return {};
    }
  };

  const fetchTotalAmountData = async (branchName, dateString) => {
    try {
      const res = await api.get("/total-amounts", {
        params: { branchName, date: dateString },
      });
      const records =
        res.data?.data || (Array.isArray(res.data) ? res.data : []);

      if (records.length > 0) {
        const data = records[0];

        const processedData = {
          rows: data.rows || [],
          totalAmount: data.totalAmount || 0,
          previousBalanceRows: data.previousBalanceRows || [],
        };

        const rowsMap = {};
        if (data.rows) {
          data.rows.forEach((row) => {
            rowsMap[row.key] = row.amount !== undefined ? row.amount : 0;
          });
        }

        if (data.printerData) {
          Object.entries(data.printerData).forEach(([printerId, amount]) => {
            rowsMap[`printer_${printerId}`] =
              amount !== undefined ? amount : 0;
          });
        }

        return {
          ...processedData,
          rowsMap: rowsMap,
        };
      } else {
        return {
          rows: [],
          totalAmount: 0,
          rowsMap: {},
          previousBalanceRows: [],
        };
      }
    } catch (error) {
      console.error("Error fetching total amount data:", error);
      return {
        rows: [],
        totalAmount: 0,
        rowsMap: {},
        previousBalanceRows: [],
      };
    }
  };

  const fetchJumboXeroxData = async (branchName, dateString) => {
    try {
      const res = await api.get("/jumbo-xerox/readings", {
        params: { branchName, date: dateString },
      });
      const records =
        res.data?.data || (Array.isArray(res.data) ? res.data : []);
      if (records.length > 0) {
        return records[0];
      } else {
        return {};
      }
    } catch (error) {
      console.error("Error fetching jumbo xerox data:", error);
      return {};
    }
  };

  const fetchStockData = async (branchName, dateString) => {
    try {
      const res = await api.get("/stocks/readings", {
        params: { branchName, date: dateString },
      });
      const records =
        res.data?.data || (Array.isArray(res.data) ? res.data : []);
      if (records.length > 0) {
        return records[0].stocks || [];
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error fetching stock data:", error);
      return [];
    }
  };

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Loading timeout reached in PdfGeneratorTable");
        setLoading(false);
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [loading]);

  const getTotalAmountValue = useCallback(
    (key) => {
      if (
        totalAmountData.rowsMap &&
        totalAmountData.rowsMap.hasOwnProperty(key)
      ) {
        return totalAmountData.rowsMap[key];
      }

      const item = totalAmountData.rows?.find((row) => row.key === key);
      let baseAmount = item ? (item.amount !== undefined ? item.amount : 0) : 0;

      // Calculate net amounts for cash and UPI (same logic as in UI and PDF)
      if (key === "cashInHand" || key === "upiCardPayments") {
        const previousBalanceCash = (totalAmountData.previousBalanceRows || [])
          .filter((r) => r.paymentMethod === "cash")
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

        const previousBalanceUPI = (totalAmountData.previousBalanceRows || [])
          .filter((r) => r.paymentMethod === "upi")
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

        if (key === "cashInHand" && previousBalanceCash > 0) {
          return baseAmount + previousBalanceCash;
        } else if (key === "upiCardPayments" && previousBalanceUPI > 0) {
          return baseAmount - previousBalanceUPI;
        }
      }

      return baseAmount;
    },
    [totalAmountData]
  );

  const getAmountBreakdown = useCallback(
    (key) => {
      const item = totalAmountData.rows?.find((row) => row.key === key);
      const baseAmount = item ? (item.amount !== undefined ? item.amount : 0) : 0;

      if (key === "cashInHand" || key === "upiCardPayments") {
        const previousBalanceCash = (totalAmountData.previousBalanceRows || [])
          .filter((r) => r.paymentMethod === "cash")
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

        const previousBalanceUPI = (totalAmountData.previousBalanceRows || [])
          .filter((r) => r.paymentMethod === "upi")
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

        if (key === "cashInHand" && previousBalanceCash > 0) {
          return `(Base: ${baseAmount} + Previous: ${previousBalanceCash})`;
        } else if (key === "upiCardPayments" && previousBalanceUPI > 0) {
          return `(Base: ${baseAmount} - Previous: ${previousBalanceUPI})`;
        }
      }

      return null;
    },
    [totalAmountData]
  );

  const formatCurrency = useCallback((amount) => {
    if (amount === undefined || amount === null) return "Rs.0.00";
    return `Rs.${Number(amount).toFixed(2)}`;
  }, []);

  const groupJumboDataByType = useCallback((jumboData) => {
    const grouped = {};
    const rows = jumboData.rows || [];

    rows.forEach((row) => {
      if (!grouped[row.type]) {
        grouped[row.type] = [];
      }
      grouped[row.type].push(row);
    });

    return grouped;
  }, []);

  const printersToShow = printers.filter((printer) => {
    const hasReadings =
      printerReadings[printer.printerId] &&
      Object.keys(printerReadings[printer.printerId]).length > 0;
    return hasReadings || printer.isActive;
  });

  if (loading || !dataLoaded) {
    return (
      <div className="revenue-card" style={{ padding: "40px", textAlign: "center" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid #d1fae5",
            borderTop: "3px solid #059669",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px auto",
          }}
        />
        <p style={{ color: "#475569", fontWeight: 500, margin: 0, fontSize: "14px" }}>
          Loading daily report preview data...
        </p>
      </div>
    );
  }

  return (
    <div ref={ref} className="pdf-preview-container" style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      {/* 1. Printer Readings Section */}
      <div className="revenue-card">
        <div className="revenue-card-header">
          <div className="revenue-card-header-left">
            <Printer size={18} color="#059669" />
            <h3 className="revenue-card-title">Printer Readings Preview</h3>
          </div>
          <div className="revenue-card-header-right">
            <span className="revenue-badge-available">
              <CheckCircle2 size={13} /> {printersToShow.length} Active Printer{printersToShow.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="revenue-card-body" style={{ padding: "16px" }}>
          {printersToShow.length > 0 ? (
            printersToShow.map((printer, index) => {
              const readings = printerReadings[printer.printerId] || {};
              const sizeTypes = printer.prices
                ? printer.prices.map((p) => p.size)
                : [];

              while (sizeTypes.length < 4) {
                sizeTypes.push("-");
              }

              const printerGrandTotal = sizeTypes.reduce((sum, size) => {
                if (size === "-") return sum;
                const sizeData = readings[size];
                if (!sizeData) return sum;
                const copies = Number(sizeData.noOfCopies) || 0;
                const configuredPrice = Number(printer.prices?.find((p) => p.size === size)?.price) || 0;
                const unitPrice =
                  sizeData.price !== undefined && sizeData.price !== null && Number(sizeData.price) > 0
                    ? Number(sizeData.price)
                    : configuredPrice;
                const total =
                  sizeData.total !== undefined && sizeData.total !== null && Number(sizeData.total) > 0
                    ? Number(sizeData.total)
                    : copies * unitPrice;
                return sum + total;
              }, 0);

              return (
                <div
                  key={`printer-${index}`}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    marginBottom: index === printersToShow.length - 1 ? 0 : "16px",
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      background: "linear-gradient(90deg, #f0fdf4 0%, #ffffff 100%)",
                      padding: "10px 16px",
                      borderBottom: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#065f46" }}>
                      {printer.printerName || `Printer ${printer.printerId}`}
                    </h4>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#047857" }}>
                      Total: {formatCurrency(printerGrandTotal)}
                    </span>
                  </div>

                  <div style={{ width: "100%", overflowX: "auto" }}>
                    <table className="revenue-modern-table" style={{ width: "100%", margin: 0, tableLayout: "auto" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", width: "180px" }}>Reading Type</th>
                          {sizeTypes.map((size, idx) => (
                            <th key={`size-${idx}`} style={{ textAlign: "center" }}>
                              {size}
                            </th>
                          ))}
                          <th style={{ textAlign: "right", width: "120px" }}>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 600, color: "#1e293b", background: "#f8fafc" }}>
                            STARTING
                          </td>
                          {sizeTypes.map((size, idx) => (
                            <td key={`start-${idx}`} style={{ textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
                              {readings[size]?.STARTING || "0"}
                            </td>
                          ))}
                          <td style={{ textAlign: "right", color: "#94a3b8" }}>—</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 600, color: "#1e293b", background: "#f8fafc" }}>
                            FINAL READING
                          </td>
                          {sizeTypes.map((size, idx) => (
                            <td key={`final-${idx}`} style={{ textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
                              {readings[size]?.FINAL_READING ||
                                readings[size]?.["FINAL READING"] ||
                                "0"}
                            </td>
                          ))}
                          <td style={{ textAlign: "right", color: "#94a3b8" }}>—</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 600, color: "#1e293b", background: "#f8fafc" }}>
                            NO OF COPIES
                          </td>
                          {sizeTypes.map((size, idx) => (
                            <td key={`copies-${idx}`} style={{ textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
                              {readings[size]?.noOfCopies || "0"}
                            </td>
                          ))}
                          <td style={{ textAlign: "right", color: "#64748b", fontWeight: 600 }}>Total</td>
                        </tr>
                        <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>
                          <td style={{ fontWeight: 700, color: "#065f46" }}>TOTAL AMOUNT</td>
                          {sizeTypes.map((size, idx) => (
                            <td
                              key={`total-${idx}`}
                              style={{
                                textAlign: "center",
                                fontWeight: 600,
                                color: "#047857",
                                fontFamily: "JetBrains Mono, monospace",
                              }}
                            >
                              {(() => {
                                if (size === "-") return "—";
                                const sizeData = readings[size];
                                const copies = Number(sizeData?.noOfCopies) || 0;
                                const configuredPrice = Number(printer.prices?.find((p) => p.size === size)?.price) || 0;
                                const unitPrice =
                                  sizeData?.price !== undefined && sizeData?.price !== null && Number(sizeData?.price) > 0
                                    ? Number(sizeData.price)
                                    : configuredPrice;
                                const total =
                                  sizeData?.total !== undefined && sizeData?.total !== null && Number(sizeData?.total) > 0
                                    ? Number(sizeData.total)
                                    : copies * unitPrice;
                                return total > 0 ? `Rs.${total.toFixed(2)}` : "Rs.0.00";
                              })()}
                            </td>
                          ))}
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: 700,
                              color: "#047857",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {formatCurrency(printerGrandTotal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
              <p style={{ margin: 0 }}>No printer data available for this date</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Two Column Container: Total Amount + Jumbo Xerox */}
      <div className="two-column-container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Left Column: Total Amount Readings */}
        <div className="revenue-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div className="revenue-card-header">
            <div className="revenue-card-header-left">
              <Calculator size={18} color="#059669" />
              <h3 className="revenue-card-title">Total Amount Summary</h3>
            </div>
            <div className="revenue-card-header-right">
              <span className="revenue-badge-available">
                <DollarSign size={13} /> Accounts
              </span>
            </div>
          </div>

          <div className="revenue-card-body" style={{ padding: "0", flex: 1, overflowX: "auto" }}>
            <table className="revenue-modern-table" style={{ width: "100%", margin: 0, tableLayout: "auto" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Item Name</th>
                  <th style={{ textAlign: "right", width: "140px" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {/* Printer Totals */}
                {printersToShow.map((printer, index) => (
                  <tr key={`printer-summary-${printer.id || printer.printerId}-${index}`}>
                    <td style={{ fontWeight: 600, color: "#1e293b" }}>
                      TOTAL {printer.printerName || `PRINTER ${printer.printerId}`}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", fontWeight: 600, color: "#065f46" }}>
                      {formatCurrency(
                        getTotalAmountValue(`printer_${printer.printerId}`)
                      )}
                    </td>
                  </tr>
                ))}

                {/* Static Account Rows */}
                <tr>
                  <td>JUMBO XEROX</td>
                  <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                    {formatCurrency(getTotalAmountValue("jumboXerox"))}
                  </td>
                </tr>
                <tr>
                  <td>ITEMS (STOCK)</td>
                  <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                    {formatCurrency(getTotalAmountValue("items"))}
                  </td>
                </tr>
                <tr>
                  <td>DIGITAL BUSINESS</td>
                  <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                    {formatCurrency(getTotalAmountValue("digitalBusiness"))}
                  </td>
                </tr>
                <tr>
                  <td>GIFT BUSINESS</td>
                  <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                    {formatCurrency(getTotalAmountValue("giftBusiness"))}
                  </td>
                </tr>
                <tr style={{ background: "#f1f5f9", fontWeight: 700 }}>
                  <td style={{ color: "#0f172a" }}>TOTAL BUSINESS</td>
                  <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", color: "#0f172a" }}>
                    {formatCurrency(getTotalAmountValue("totalBusiness"))}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "#dc2626" }}>DISCOUNT</td>
                  <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", color: "#dc2626" }}>
                    {formatCurrency(getTotalAmountValue("discount"))}
                  </td>
                </tr>
                <tr>
                  <td>
                    UPI & CARD PAYMENTS
                    {getAmountBreakdown("upiCardPayments") && (
                      <div style={{ fontSize: "10.5px", color: "#059669", fontWeight: "normal", marginTop: "2px" }}>
                        {getAmountBreakdown("upiCardPayments")}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                    {formatCurrency(getTotalAmountValue("upiCardPayments"))}
                  </td>
                </tr>
                <tr>
                  <td>BANK TRANSFERS</td>
                  <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                    {formatCurrency(getTotalAmountValue("bankTransfers"))}
                  </td>
                </tr>
                <tr style={{ background: "#f8fafc", fontWeight: 600 }}>
                  <td>CASH AS PER ACCOUNTS</td>
                  <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", color: "#047857" }}>
                    {formatCurrency(getTotalAmountValue("cashAsPerAccounts"))}
                  </td>
                </tr>
                <tr>
                  <td>
                    CASH IN HAND
                    {getAmountBreakdown("cashInHand") && (
                      <div style={{ fontSize: "10.5px", color: "#059669", fontWeight: "normal", marginTop: "2px" }}>
                        {getAmountBreakdown("cashInHand")}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                    {formatCurrency(getTotalAmountValue("cashInHand"))}
                  </td>
                </tr>
                <tr>
                  <td>PAYMENT TO BE COLLECTED</td>
                  <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                    {formatCurrency(
                      getTotalAmountValue("paymentToBeCollected")
                    )}
                  </td>
                </tr>

                {/* Previous Balance breakdown */}
                {totalAmountData.previousBalanceRows &&
                  totalAmountData.previousBalanceRows.length > 0 && (
                    <>
                      <tr style={{ background: "#eff6ff" }}>
                        <td
                          colSpan="2"
                          style={{
                            textAlign: "center",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#1d4ed8",
                            padding: "6px 12px",
                          }}
                        >
                          Previous Balance Breakdown (Already included above)
                        </td>
                      </tr>
                      {totalAmountData.previousBalanceRows.map(
                        (balanceRow, index) => {
                          const formattedDate = balanceRow.date
                            ? new Date(balanceRow.date).toLocaleDateString(
                                "en-GB"
                              )
                            : "No Date";
                          const paymentMethod =
                            balanceRow.paymentMethod || "Unknown";
                          return (
                            <tr key={`prev-bal-${index}`} style={{ background: "#f8fafc" }}>
                              <td style={{ fontSize: "11.5px", paddingLeft: "18px", color: "#475569" }}>
                                Previous {paymentMethod.toUpperCase()} ({formattedDate})
                              </td>
                              <td style={{ textAlign: "right", fontSize: "11.5px", fontFamily: "JetBrains Mono, monospace" }}>
                                {formatCurrency(balanceRow.amount || 0)}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </>
                  )}
              </tbody>
              <tfoot>
                <tr style={{ background: "#ecfdf5", borderTop: "2px solid #a7f3d0" }}>
                  <td style={{ fontWeight: 800, color: "#065f46", fontSize: "14px" }}>
                    TOTAL AMOUNT
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
                    {formatCurrency(totalAmountData.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right Column: Jumbo Xerox Details & Jumbo Counter */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Jumbo Xerox Details */}
          <div className="revenue-card">
            <div className="revenue-card-header">
              <div className="revenue-card-header-left">
                <Calculator size={18} color="#059669" />
                <h3 className="revenue-card-title">Jumbo Xerox Details</h3>
              </div>
              <div className="revenue-card-header-right">
                <span className="revenue-badge-available">
                  <CheckCircle2 size={13} /> {jumboXeroxData.totalQty || 0} Total Qty
                </span>
              </div>
            </div>

            <div className="revenue-card-body" style={{ padding: "0", overflowX: "auto" }}>
              <table className="revenue-modern-table" style={{ width: "100%", margin: 0, tableLayout: "auto" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Type / Size</th>
                    <th style={{ textAlign: "center", width: "80px" }}>QTY</th>
                    <th style={{ textAlign: "right", width: "110px" }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupJumboDataByType(jumboXeroxData)).map(
                    ([type, items]) => (
                      <React.Fragment key={type}>
                        <tr style={{ background: "#065f46" }}>
                          <td
                            colSpan="3"
                            style={{
                              color: "#ffffff",
                              fontWeight: 700,
                              fontSize: "12px",
                              letterSpacing: "0.04em",
                              padding: "6px 12px",
                            }}
                          >
                            {type}
                          </td>
                        </tr>
                        {items.map((item, idx) => (
                          <tr key={`${type}-${item.size}-${idx}`}>
                            <td style={{ paddingLeft: "18px", color: "#334155" }}>{item.size}</td>
                            <td style={{ textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
                              {item.qty || "0"}
                            </td>
                            <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                              {formatCurrency(item.amount || 0)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  )}
                  <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>
                    <td style={{ fontWeight: 700, color: "#065f46" }}>TOTAL</td>
                    <td style={{ textAlign: "center", fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: "#065f46" }}>
                      {jumboXeroxData.totalQty || "0"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: "#047857" }}>
                      {formatCurrency(jumboXeroxData.totalAmount || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Jumbo Counter */}
          <div className="revenue-card">
            <div className="revenue-card-header">
              <div className="revenue-card-header-left">
                <Layers size={18} color="#059669" />
                <h3 className="revenue-card-title">Jumbo Counter Readings</h3>
              </div>
            </div>

            <div className="revenue-card-body" style={{ padding: "0", overflowX: "auto" }}>
              <table className="revenue-modern-table" style={{ width: "100%", margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Counter Metric</th>
                    <th style={{ textAlign: "right", width: "140px" }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600, color: "#1e293b" }}>START</td>
                    <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                      {jumboXeroxData.jumboCounter?.start || "0"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, color: "#1e293b" }}>END</td>
                    <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                      {jumboXeroxData.jumboCounter?.end || "0"}
                    </td>
                  </tr>
                  <tr style={{ background: "#f0fdf4" }}>
                    <td style={{ fontWeight: 700, color: "#065f46" }}>SFT PRINTED</td>
                    <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#047857" }}>
                      {jumboXeroxData.jumboCounter?.sftPrinted || "0"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Stock Readings Section */}
      <div className="revenue-card">
        <div className="revenue-card-header">
          <div className="revenue-card-header-left">
            <Boxes size={18} color="#059669" />
            <h3 className="revenue-card-title">Stock Readings Preview</h3>
          </div>
          <div className="revenue-card-header-right">
            <span className="revenue-badge-available">
              <Package size={13} /> {stockData.length} Stock Item{stockData.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="revenue-card-body" style={{ padding: "0", overflowX: "auto" }}>
          <table className="revenue-modern-table" style={{ width: "100%", margin: 0, tableLayout: "auto" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "center", width: "50px" }}>S.No</th>
                <th style={{ textAlign: "left" }}>Item Name</th>
                <th style={{ textAlign: "center", width: "85px" }}>Opening</th>
                <th style={{ textAlign: "center", width: "85px" }}>Added</th>
                <th style={{ textAlign: "center", width: "85px" }}>Closing</th>
                <th style={{ textAlign: "center", width: "85px" }}>Sold</th>
                <th style={{ textAlign: "center", width: "130px" }}>Rate / Range</th>
                <th style={{ textAlign: "right", width: "120px" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {stockData.length > 0 ? (
                stockData.map((stock, index) => {
                  if (stock.pageRanges && stock.pageRanges.length > 0) {
                    return stock.pageRanges.map((range, rangeIndex) => (
                      <tr key={`stock-range-${stock.id || stock.itemName || index}-${rangeIndex}-${index}`}>
                        <td style={{ textAlign: "center", color: "#64748b" }}>
                          {rangeIndex === 0 ? index + 1 : ""}
                        </td>
                        <td style={{ fontWeight: rangeIndex === 0 ? 600 : 400, color: "#1e293b" }}>
                          {rangeIndex === 0 ? stock.itemName : ""}
                        </td>
                        <td style={{ textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
                          {rangeIndex === 0 ? (stock.openingStock !== undefined && stock.openingStock !== null && stock.openingStock !== "" ? stock.openingStock : 0) : ""}
                        </td>
                        <td style={{ textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
                          {rangeIndex === 0 ? (stock.addedStock !== undefined && stock.addedStock !== null && stock.addedStock !== "" ? stock.addedStock : 0) : ""}
                        </td>
                        <td style={{ textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
                          {rangeIndex === 0 ? (stock.closingStock !== undefined && stock.closingStock !== null && stock.closingStock !== "" ? stock.closingStock : 0) : ""}
                        </td>
                        <td style={{ textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
                          {(range.sold !== undefined && range.sold !== null && range.sold !== "" ? range.sold : 0)}
                        </td>
                        <td style={{ textAlign: "center", fontSize: "12px", color: "#475569" }}>
                          {range.range} — Rs.{range.price}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                          {formatCurrency(
                            (Number(range.sold) || 0) * range.price
                          )}
                        </td>
                      </tr>
                    ));
                  } else {
                    return (
                      <tr key={`stock-item-${stock.id || stock.itemName || index}-${index}`}>
                        <td style={{ textAlign: "center", color: "#64748b" }}>{index + 1}</td>
                        <td style={{ fontWeight: 600, color: "#1e293b" }}>{stock.itemName}</td>
                        <td style={{ textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
                          {(stock.openingStock !== undefined && stock.openingStock !== null && stock.openingStock !== "" ? stock.openingStock : 0)}
                        </td>
                        <td style={{ textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
                          {(stock.addedStock !== undefined && stock.addedStock !== null && stock.addedStock !== "" ? stock.addedStock : 0)}
                        </td>
                        <td style={{ textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
                          {(stock.closingStock !== undefined && stock.closingStock !== null && stock.closingStock !== "" ? stock.closingStock : 0)}
                        </td>
                        <td style={{ textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
                          {(stock.sold !== undefined && stock.sold !== null && stock.sold !== "" ? stock.sold : 0)}
                        </td>
                        <td style={{ textAlign: "center", fontSize: "12px", color: "#475569" }}>
                          Rs.{stock.amount || 0}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                          {formatCurrency(
                            (Number(stock.sold) || 0) * (stock.amount || 0)
                          )}
                        </td>
                      </tr>
                    );
                  }
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                    No stock data available for this date
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: "#ecfdf5", borderTop: "2px solid #a7f3d0" }}>
                <td colSpan="7" style={{ fontWeight: 800, color: "#065f46", fontSize: "13.5px" }}>
                  TOTAL STOCK AMOUNT:
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontWeight: 800,
                    color: "#047857",
                    fontSize: "14.5px",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {formatCurrency(
                    stockData.reduce((total, stock) => {
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
                    }, 0)
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
});

PdfGeneratorTable.displayName = "PdfGeneratorTable";

export default PdfGeneratorTable;
