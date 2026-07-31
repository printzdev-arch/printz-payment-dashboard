import React, { useEffect, useState, forwardRef, useCallback } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  FaPrint,
  FaCalculator,
  FaBoxes,
  FaMoneyBillWave,
} from "react-icons/fa";

const PdfGeneratorTable = forwardRef((props, ref) => {
  const selectedDate = props.pdfDate;
  const userData = props.userData;
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

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
    if (!userData || !selectedDate) return;

    setLoading(true);
    resetData();

    try {
      const dateString = formatDateToYYYYMMDD(selectedDate);
      const branchName = userData.branch;

      console.log("Loading data for date:", dateString, "branch:", branchName);

      const [
        printersData,
        readingsData,
        totalAmountResult,
        jumboXeroxResult,
        stockResult,
      ] = await Promise.all([
        fetchPrintersData(branchName),
        fetchPrinterReadingsData(branchName, dateString),
        fetchTotalAmountData(branchName, dateString),
        fetchJumboXeroxData(branchName, dateString),
        fetchStockData(branchName, dateString),
      ]);

      setPrinters(printersData);
      setPrinterReadings(readingsData);
      setTotalAmountData(totalAmountResult);
      setJumboXeroxData(jumboXeroxResult);
      setStockData(stockResult);
      setDataLoaded(true);

      console.log("All data loaded successfully");
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [userData, selectedDate, formatDateToYYYYMMDD, resetData]);

  const fetchPrintersData = async (branchName) => {
    try {
      const firestore = getFirestore();
      const printersQuery = query(
        collection(firestore, "printers"),
        where("branchName", "==", branchName)
      );
      const printersSnapshot = await getDocs(printersQuery);
      const printersList = printersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("Printers loaded:", printersList.length);
      return printersList;
    } catch (error) {
      console.error("Error fetching printer data:", error);
      return [];
    }
  };

  const fetchPrinterReadingsData = async (branchName, dateString) => {
    try {
      const firestore = getFirestore();
      const readingsQuery = query(
        collection(firestore, "printerReadings"),
        where("branchName", "==", branchName),
        where("date", "==", dateString)
      );
      const readingsSnapshot = await getDocs(readingsQuery);

      const readings = {};
      readingsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.readings) {
          Object.keys(data.readings).forEach((printerId) => {
            readings[printerId] = data.readings[printerId];
          });
        }
      });
      console.log("Printer readings loaded:", Object.keys(readings).length);
      return readings;
    } catch (error) {
      console.error("Error fetching printer readings:", error);
      return {};
    }
  };

  const fetchTotalAmountData = async (branchName, dateString) => {
    try {
      const firestore = getFirestore();
      const totalAmountQuery = query(
        collection(firestore, "totalAmountReadings"),
        where("branchName", "==", branchName),
        where("date", "==", dateString)
      );

      const querySnapshot = await getDocs(totalAmountQuery);
      if (querySnapshot.docs.length > 0) {
        const data = querySnapshot.docs[0].data();

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
            rowsMap[`printer_${printerId}`] = amount !== undefined ? amount : 0;
          });
        }

        console.log(
          "Total amount data loaded with rows:",
          data.rows?.length || 0
        );
        console.log(
          "Previous balance rows loaded:",
          data.previousBalanceRows?.length || 0
        );
        return {
          ...processedData,
          rowsMap: rowsMap,
        };
      } else {
        console.log("No total amount data found");
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
      const firestore = getFirestore();
      const jumboXeroxQuery = query(
        collection(firestore, "jumboXeroxReadings"),
        where("branchName", "==", branchName),
        where("date", "==", dateString)
      );

      const querySnapshot = await getDocs(jumboXeroxQuery);
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        console.log("Jumbo xerox data loaded");
        return docData;
      } else {
        console.log("No jumbo xerox data found");
        return {};
      }
    } catch (error) {
      console.error("Error fetching jumbo xerox data:", error);
      return {};
    }
  };

  const fetchStockData = async (branchName, dateString) => {
    try {
      const firestore = getFirestore();
      const stockQuery = query(
        collection(firestore, "stockReadings"),
        where("branchName", "==", branchName),
        where("date", "==", dateString)
      );

      const querySnapshot = await getDocs(stockQuery);
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        console.log("Stock data loaded");
        return docData.stocks || [];
      } else {
        console.log("No stock data found");
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
          .filter(r => r.paymentMethod === "cash")
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        
        const previousBalanceUPI = (totalAmountData.previousBalanceRows || [])
          .filter(r => r.paymentMethod === "upi")
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
          .filter(r => r.paymentMethod === "cash")
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        
        const previousBalanceUPI = (totalAmountData.previousBalanceRows || [])
          .filter(r => r.paymentMethod === "upi")
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
      <div className="jumbo-loading-container">
        <div className="jumbo-loading-spinner"></div>
        <p>Loading report data...</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="jumbo-main-container">
      {/* Printer Readings Section */}
      <div className="jumbo-tables-container">
        <div className="jumbo-table-column">
          <div className="jumbo-table-card">
            <div className="jumbo-table-header">
              <h3>
                <FaPrint /> Printer Readings
              </h3>
            </div>
            <div className="jumbo-table-content">
              {printersToShow.length > 0 ? (
                printersToShow.map((printer, index) => {
                  const readings = printerReadings[printer.printerId] || {};
                  const sizeTypes = printer.prices
                    ? printer.prices.map((p) => p.size)
                    : [];

                  while (sizeTypes.length < 4) {
                    sizeTypes.push("-");
                  }

                  return (
                    <div
                      key={`printer-${index}`}
                      className="printer-main-card"
                      style={{ marginBottom: "1rem" }}
                    >
                      <div className="printer-card-header">
                        <div className="printer-card-title">
                          <h3>{printer.printerName}</h3>
                        </div>
                      </div>
                      <div className="printer-card-content">
                        <table className="printer-readings-table">
                          <thead>
                            <tr>
                              <th className="printer-reading-type-col">
                                Reading Type
                              </th>
                              {sizeTypes.map((size, idx) => (
                                <th
                                  key={`size-${idx}`}
                                  className="printer-size-col"
                                >
                                  {size}
                                </th>
                              ))}
                              <th className="printer-total-col">TOTAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="printer-reading-type">STARTING</td>
                              {sizeTypes.map((size, idx) => (
                                <td
                                  key={`start-${idx}`}
                                  className="printer-copies-cell"
                                >
                                  {readings[size]?.STARTING || ""}
                                </td>
                              ))}
                              <td></td>
                            </tr>
                            <tr>
                              <td className="printer-reading-type">
                                FINAL READING
                              </td>
                              {sizeTypes.map((size, idx) => (
                                <td
                                  key={`final-${idx}`}
                                  className="printer-copies-cell"
                                >
                                  {readings[size]?.FINAL_READING ||
                                    readings[size]?.["FINAL READING"] ||
                                    ""}
                                </td>
                              ))}
                              <td></td>
                            </tr>
                            <tr>
                              <td className="printer-reading-type">
                                NO OF COPIES
                              </td>
                              {sizeTypes.map((size, idx) => (
                                <td
                                  key={`copies-${idx}`}
                                  className="printer-copies-cell"
                                >
                                  {readings[size]?.noOfCopies || ""}
                                </td>
                              ))}
                              <td className="printer-amount-cell">TOTAL</td>
                            </tr>
                            <tr className="printer-total-row">
                              <td className="printer-reading-type">TOTAL</td>
                              {sizeTypes.map((size, idx) => (
                                <td
                                  key={`total-${idx}`}
                                  className="printer-amount-cell"
                                >
                                  {readings[size]?.total
                                    ? `Rs.${readings[size].total}`
                                    : "Rs.0.00"}
                                </td>
                              ))}
                              <td className="printer-grand-total">
                                {formatCurrency(
                                  sizeTypes.reduce(
                                    (sum, size) =>
                                      sum + (readings[size]?.total || 0),
                                    0
                                  )
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="printer-no-data-message">
                  <p>No printer data available for this date</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Total Amount Readings Section */}
      <div className="jumbo-tables-container">
        <div className="jumbo-table-column">
          <div className="jumbo-table-card">
            <div className="jumbo-table-header">
              <h3>
                <FaMoneyBillWave /> Total Amount Readings
              </h3>
            </div>
            <div className="jumbo-table-content">
              <table className="total-amounts-table">
                <thead>
                  <tr>
                    <th className="total-item-col">Item Name</th>
                    <th className="total-amount-col">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Printer totals */}
                  {printersToShow.map((printer) => (
                    <tr key={`printer-${printer.printerId}`}>
                      <td className="total-item-name">
                        TOTAL{" "}
                        {printer.printerName || `PRINTER ${printer.printerId}`}
                      </td>
                      <td className="total-parent-conatiner">
                        {formatCurrency(
                          getTotalAmountValue(`printer_${printer.printerId}`)
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Static rows */}
                  <tr>
                    <td className="total-item-name">JUMBO XEROX</td>
                    <td className="total-parent-conatiner">
                      {formatCurrency(getTotalAmountValue("jumboXerox"))}
                    </td>
                  </tr>
                  <tr>
                    <td className="total-item-name">ITEMS</td>
                    <td className="total-parent-conatiner">
                      {formatCurrency(getTotalAmountValue("items"))}
                    </td>
                  </tr>
                  <tr>
                    <td className="total-item-name">DIGITAL BUSINESS</td>
                    <td className="total-parent-conatiner">
                      {formatCurrency(getTotalAmountValue("digitalBusiness"))}
                    </td>
                  </tr>
                  <tr>
                    <td className="total-item-name">GIFT BUSINESS</td>
                    <td className="total-parent-conatiner">
                      {formatCurrency(getTotalAmountValue("giftBusiness"))}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    <td className="total-item-name">TOTAL BUSINESS</td>
                    <td className="total-parent-conatiner">
                      {formatCurrency(getTotalAmountValue("totalBusiness"))}
                    </td>
                  </tr>
                  <tr>
                    <td className="total-item-name">DISCOUNT</td>
                    <td className="total-parent-conatiner">
                      {formatCurrency(getTotalAmountValue("discount"))}
                    </td>
                  </tr>
                  <tr>
                    <td className="total-item-name">
                      UPI & CARD PAYMENTS
                      {getAmountBreakdown("upiCardPayments") && (
                        <div style={{ fontSize: "10px", color: "#666", fontWeight: "normal" }}>
                          {getAmountBreakdown("upiCardPayments")}
                        </div>
                      )}
                    </td>
                    <td className="total-parent-conatiner">
                      {formatCurrency(getTotalAmountValue("upiCardPayments"))}
                    </td>
                  </tr>
                  <tr>
                    <td className="total-item-name">BANK TRANSFERS</td>
                    <td className="total-parent-conatiner">
                      {formatCurrency(getTotalAmountValue("bankTransfers"))}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    <td className="total-item-name">CASH AS PER ACCOUNTS</td>
                    <td className="total-parent-conatiner">
                      {formatCurrency(getTotalAmountValue("cashAsPerAccounts"))}
                    </td>
                  </tr>
                  <tr>
                    <td className="total-item-name">
                      CASH IN HAND
                      {getAmountBreakdown("cashInHand") && (
                        <div style={{ fontSize: "10px", color: "#666", fontWeight: "normal" }}>
                          {getAmountBreakdown("cashInHand")}
                        </div>
                      )}
                    </td>
                    <td className="total-parent-conatiner">
                      {formatCurrency(getTotalAmountValue("cashInHand"))}
                    </td>
                  </tr>
                  <tr>
                    <td className="total-item-name">PAYMENT TO BE COLLECTED</td>
                    <td className="total-parent-conatiner">
                      {formatCurrency(
                        getTotalAmountValue("paymentToBeCollected")
                      )}
                    </td>
                  </tr>
                  {/* Previous Balance breakdown - informational only */}
                  {totalAmountData.previousBalanceRows &&
                    totalAmountData.previousBalanceRows.length > 0 && (
                      <>
                        <tr style={{ backgroundColor: "#f0f9ff" }}>
                          <td colSpan="2" className="total-item-name" style={{ textAlign: "center", fontStyle: "italic", fontSize: "12px" }}>
                            --- PREVIOUS BALANCE BREAKDOWN (Already included above) ---
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
                              <tr key={`previous-balance-${index}`} style={{ backgroundColor: "#f9fafb" }}>
                                <td className="total-item-name" style={{ fontSize: "11px", paddingLeft: "20px" }}>
                                  Previous {paymentMethod.toUpperCase()} ({formattedDate})
                                </td>
                                <td className="total-parent-conatiner" style={{ fontSize: "11px" }}>
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
                  <tr>
                    <td className="total-grand-total-label">TOTAL</td>
                    <td className="total-grand-total">
                      {formatCurrency(totalAmountData.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        <div className="jumbo-table-column">
          <div className="jumbo-table-card">
            <div className="jumbo-table-header">
              <h3>
                <FaCalculator /> Jumbo Xerox Details
              </h3>
            </div>
            <div className="jumbo-table-content">
              <table className="jumbo-readings-table">
                <thead>
                  <tr>
                    <th>Type/Size</th>
                    <th>QTY</th>
                    <th>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupJumboDataByType(jumboXeroxData)).map(
                    ([type, items]) => (
                      <React.Fragment key={type}>
                        {/* Type header */}
                        <tr>
                          <td
                            colSpan="3"
                            style={{
                              backgroundColor: "#8b4513",
                              color: "white",
                              textAlign: "center",
                              fontWeight: "600",
                              padding: "0.5rem",
                            }}
                          >
                            {type}
                          </td>
                        </tr>

                        {/* Type items */}
                        {items.map((item, idx) => (
                          <tr key={`${type}-${item.size}-${idx}`}>
                            <td className="jumbo-reading-type">{item.size}</td>
                            <td className="jumbo-calculated-value">
                              {item.qty || ""}
                            </td>
                            <td className="jumbo-calculated-value">
                              {formatCurrency(item.amount || 0)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  )}

                  {/* Total row */}
                  <tr className="jumbo-total-row">
                    <td className="jumbo-reading-type">TOTAL</td>
                    <td className="jumbo-calculated-value">
                      {jumboXeroxData.totalQty || ""}
                    </td>
                    <td className="jumbo-calculated-value">
                      {formatCurrency(jumboXeroxData.totalAmount || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="jumbo-table-card">
            <div className="jumbo-table-header">
              <h3>
                <FaCalculator /> Jumbo Counter
              </h3>
            </div>
            <div className="jumbo-table-content">
              <table className="jumbo-readings-table">
                <thead>
                  <tr>
                    <th>Counter Type</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="jumbo-reading-type">START</td>
                    <td className="jumbo-calculated-value">
                      {jumboXeroxData.jumboCounter?.start || ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="jumbo-reading-type">END</td>
                    <td className="jumbo-calculated-value">
                      {jumboXeroxData.jumboCounter?.end || ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="jumbo-reading-type">SFT PRINTED</td>
                    <td className="jumbo-calculated-value">
                      {jumboXeroxData.jumboCounter?.sftPrinted || ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Readings Section */}
      <div className="jumbo-tables-container">
        <div className="jumbo-table-column" style={{ width: "100%" }}>
          <div className="jumbo-table-card">
            <div className="jumbo-table-header">
              <h3>
                <FaBoxes /> Stock Readings
              </h3>
            </div>
            <div className="jumbo-table-content">
              <div style={{ overflowX: "auto" }}>
                <table
                  className="printer-readings-table"
                  style={{ minWidth: "800px" }}
                >
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Item Name</th>
                      <th>Opening Stock</th>
                      <th>Added Stock</th>
                      <th>Closing Stock</th>
                      <th>Sold</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockData.length > 0 ? (
                      stockData.map((stock, index) => {
                        if (stock.pageRanges) {
                          return stock.pageRanges.map((range, rangeIndex) => (
                            <tr key={`${stock.itemName}-${rangeIndex}`}>
                              <td className="printer-copies-cell">
                                {rangeIndex === 0 ? index + 1 : ""}
                              </td>
                              <td className="printer-reading-type">
                                {rangeIndex === 0 ? stock.itemName : ""}
                              </td>
                              <td className="printer-copies-cell">
                                {rangeIndex === 0
                                  ? stock.openingStock || ""
                                  : ""}
                              </td>
                              <td className="printer-copies-cell">
                                {rangeIndex === 0 ? stock.addedStock || "" : ""}
                              </td>
                              <td className="printer-copies-cell">
                                {rangeIndex === 0
                                  ? stock.closingStock || ""
                                  : ""}
                              </td>
                              <td className="printer-copies-cell">
                                {range.sold || ""}
                              </td>
                              <td className="printer-copies-cell">
                                {range.range} - Rs.{range.price}
                              </td>
                              <td className="printer-amount-cell">
                                {formatCurrency(
                                  (range.sold || 0) * range.price
                                )}
                              </td>
                            </tr>
                          ));
                        } else {
                          return (
                            <tr key={stock.itemName}>
                              <td className="printer-copies-cell">
                                {index + 1}
                              </td>
                              <td className="printer-reading-type">
                                {stock.itemName}
                              </td>
                              <td className="printer-copies-cell">
                                {stock.openingStock || ""}
                              </td>
                              <td className="printer-copies-cell">
                                {stock.addedStock || ""}
                              </td>
                              <td className="printer-copies-cell">
                                {stock.closingStock || ""}
                              </td>
                              <td className="printer-copies-cell">
                                {stock.sold || ""}
                              </td>
                              <td className="printer-copies-cell">
                                Rs.{stock.amount || 0}
                              </td>
                              <td className="printer-amount-cell">
                                {formatCurrency(
                                  (stock.sold || 0) * (stock.amount || 0)
                                )}
                              </td>
                            </tr>
                          );
                        }
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="printer-no-data-message">
                          <p>No stock data available for this date</p>
                        </td>
                      </tr>
                    )}
                    <tr className="printer-total-row">
                      <td colSpan="7" className="printer-reading-type">
                        <strong>Total Stock Amount:</strong>
                      </td>
                      <td className="printer-grand-total">
                        <strong>
                          {formatCurrency(
                            stockData.reduce((total, stock) => {
                              if (stock.pageRanges) {
                                return (
                                  total +
                                  stock.pageRanges.reduce((subTotal, range) => {
                                    const sold = range.sold || 0;
                                    return subTotal + sold * range.price;
                                  }, 0)
                                );
                              } else if (stock.amount) {
                                const sold = stock.sold || 0;
                                return total + sold * stock.amount;
                              }
                              return total;
                            }, 0)
                          )}
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

PdfGeneratorTable.displayName = "PdfGeneratorTable";

export default PdfGeneratorTable;
