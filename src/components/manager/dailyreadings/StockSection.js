"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../../../services/authservice";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import {
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaSave,
  FaEdit,
  FaLock,
  FaTimes,
  FaSortUp,
  FaSortDown,
  FaSort,
} from "react-icons/fa";
import { usePopup } from "../../../hooks/usePopup";
import Popup from "../../common/Popup";

const StockSection = ({
  date,
  branchName,
  userId,
  approvedDates,
  onFinalSubmitChange,
  isFinalSubmitted,
}) => {
  const { popup, showSuccess, showError, showWarning } = usePopup();
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [docId, setDocId] = useState("");
  const [isFormSaved, setIsFormSaved] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [editingValues, setEditingValues] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState(null);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [isUpdatingFromFirestore, setIsUpdatingFromFirestore] = useState(false);
  const stocksPerPage = 20;

  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const canEditCurrentDate = useCallback(() => {
    const today = new Date();
    const todayFormatted = formatDateToYYYYMMDD(today);
    return date === todayFormatted;
  }, [date]);

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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedStocks = useMemo(() => {
    if (!sortField) {
      return filteredStocks;
    }

    return [...filteredStocks].sort((a, b) => {
      const valueA = (a[sortField] || "").toLowerCase().trim();
      const valueB = (b[sortField] || "").toLowerCase().trim();

      if (valueA < valueB) {
        return sortOrder === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredStocks, sortField, sortOrder]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStocks(stocks);
    } else {
      const filtered = stocks.filter((stock) => {
        const itemName = stock.itemName || "";
        const category = stock.category || "";
        const searchLower = searchTerm.toLowerCase();

        return (
          itemName.toLowerCase().includes(searchLower) ||
          category.toLowerCase().includes(searchLower)
        );
      });
      setFilteredStocks(filtered);
    }

    if (searchTerm !== "") {
      setCurrentPage(1);
    }
  }, [searchTerm, stocks]);

  // Automatically enable editing mode for new data
  useEffect(() => {
    if (
      !hasExistingData &&
      (canEditCurrentDate() || canEditPastDate()) &&
      !isFinalSubmitted
    ) {
      setIsEditing(true);
    } else if (hasExistingData) {
      setIsEditing(false);
    }
  }, [hasExistingData, canEditCurrentDate, canEditPastDate, isFinalSubmitted]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  useEffect(() => {
    const fetchStocks = async () => {
      if (!branchName) return;

      setIsLoadingStocks(true);
      try {
        const stocksQuery = query(
          collection(db, "stocks"),
          where("branchName", "==", branchName)
        );
        const querySnapshot = await getDocs(stocksQuery);

        const fetchedStocks = [];
        querySnapshot.forEach((doc) => {
          const stockData = doc.data();
          fetchedStocks.push({
            id: doc.id,
            itemName: stockData.itemName || "",
            amount: stockData.amount || 0,
            category: stockData.category || "",
            openingStock: "",
            addedStock: "",
            closingStock: "",
            sold: "",
            pageRanges: stockData.pageRanges || null,
          });
        });

        setStocks(fetchedStocks);
        setFilteredStocks(fetchedStocks);
      } catch (error) {
        showError("Error fetching stocks: " + error.message);
        console.error("Error fetching stocks:", error);
      } finally {
        setIsLoadingStocks(false);
      }
    };

    fetchStocks();
  }, [branchName, showError]);

  useEffect(() => {
    if (!date || !branchName || stocks.length === 0) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const formattedDate = date.replace(/-/g, "");
        const newDocId = `${branchName}_${formattedDate}`;
        setDocId(newDocId);

        const docRef = doc(db, "stockReadings", newDocId);

        const unsubscribeListener = onSnapshot(docRef, async (docSnapshot) => {
          // Prevent updating from Firestore when user is actively editing
          if (hasChanges && !isUpdatingFromFirestore) {
            return;
          }

          setIsUpdatingFromFirestore(true);

          const stocksRef = collection(db, "stocks");
          const stocksQuery = query(
            stocksRef,
            where("branchName", "==", branchName)
          );
          const stocksSnapshot = await getDocs(stocksQuery);

          const currentStockQuantities = {};
          stocksSnapshot.forEach((doc) => {
            const stockData = doc.data();
            if (stockData.itemName) {
              currentStockQuantities[stockData.itemName] = stockData.qty || 0;
            }
          });

          // Check previous 15 days for the most recent closing stock data
          const prevDayClosingStocks = {};

          const findPreviousClosingStocks = async () => {
            console.log(
              `[v0] Looking back up to 15 days for previous closing stocks for date: ${date}`
            );
            for (let daysBack = 1; daysBack <= 15; daysBack++) {
              // 15 days
              const checkDate = new Date(date);
              checkDate.setDate(checkDate.getDate() - daysBack);
              const formattedCheckDate = checkDate
                .toISOString()
                .split("T")[0]
                .replace(/-/g, "");
              const checkDocRef = doc(
                db,
                "stockReadings",
                `${branchName}_${formattedCheckDate}`
              );
              try {
                const checkDocSnapshot = await getDoc(checkDocRef);
                if (checkDocSnapshot.exists()) {
                  const stocksData = checkDocSnapshot.data().stocks;
                  if (stocksData && stocksData.length > 0) {
                    stocksData.forEach((s) => {
                      if (
                        s.itemName &&
                        prevDayClosingStocks[s.itemName] === undefined
                      ) {
                        prevDayClosingStocks[s.itemName] = s.closingStock;
                      }
                    });
                    // If we already have all, stop early
                    const allItemsFound = stocks.every(
                      (st) => prevDayClosingStocks[st.itemName] !== undefined
                    );
                    if (allItemsFound) break;
                  }
                }
              } catch (err) {
                // continue
              }
            }
          };

          await findPreviousClosingStocks();

          if (docSnapshot.exists()) {
            const existingData = docSnapshot.data();
            setHasExistingData(true);
            setIsFormSaved(true);

            if (typeof onFinalSubmitChange === "function") {
              onFinalSubmitChange(
                Boolean(existingData.isLocked) ||
                  Boolean(existingData.isFinalSubmitted)
              );
            }

            setIsEditing(false);

            setStocks((prevStocks) =>
              prevStocks.map((stock) => {
                const existingStock = existingData.stocks.find(
                  (s) => s.itemName === stock.itemName
                );

                // Use saved values as-is; if a field is missing, default to 0 (no recalculation)
                const openingStock = existingStock?.openingStock ?? 0;
                const addedStock = existingStock?.addedStock ?? 0;
                const savedPageRanges =
                  existingStock?.pageRanges ||
                  (stock.pageRanges
                    ? stock.pageRanges.map((r) => ({ ...r, sold: 0 }))
                    : undefined);
                const soldFromRanges = Array.isArray(savedPageRanges)
                  ? savedPageRanges.reduce(
                      (sum, r) => sum + (Number(r.sold) || 0),
                      0
                    )
                  : undefined;
                const sold = existingStock?.sold ?? soldFromRanges ?? 0;
                const closingStock =
                  existingStock?.closingStock ??
                  openingStock + addedStock - (sold || 0);

                return {
                  ...stock,
                  openingStock,
                  addedStock,
                  sold,
                  closingStock,
                  pageRanges: savedPageRanges,
                };
              })
            );
          } else {
            setHasExistingData(false);
            setIsFormSaved(false);
            // Use previous closing stock if found, otherwise default to product's current quantity in stocks (base quantity)
            setStocks((prevStocks) =>
              prevStocks.map((stock) => {
                const openingStock =
                  prevDayClosingStocks[stock.itemName] !== undefined
                    ? prevDayClosingStocks[stock.itemName]
                    : currentStockQuantities[stock.itemName] || 0;

                const pageRangesWithEmpty = stock.pageRanges?.map((range) => ({
                  ...range,
                  sold: "",
                }));

                return {
                  ...stock,
                  openingStock,
                  addedStock: "",
                  sold: "",
                  closingStock: openingStock,
                  pageRanges: pageRangesWithEmpty,
                };
              })
            );
          }

          // Only clear editing values if we're not in the middle of editing
          if (!hasChanges) {
            setEditingValues({});
          }

          setTimeout(() => {
            setIsUpdatingFromFirestore(false);
          }, 100);
        });

        setUnsubscribe(() => unsubscribeListener);
      } catch (error) {
        showError("Error fetching data: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    date,
    branchName,
    stocks.length,
    showError,
    hasChanges,
    isUpdatingFromFirestore,
  ]);

  const indexOfLastStock = currentPage * stocksPerPage;
  const indexOfFirstStock = indexOfLastStock - stocksPerPage;
  const currentStocks = useMemo(() => {
    const startIndex = (currentPage - 1) * stocksPerPage;
    const endIndex = startIndex + stocksPerPage;
    return sortedStocks.slice(startIndex, endIndex);
  }, [sortedStocks, currentPage, stocksPerPage]);

  const nextPage = () => {
    if (currentPage < Math.ceil(filteredStocks.length / stocksPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleInputChange = (id, field, value) => {
    if (!date) {
      showWarning("Please select a date first");
      return;
    }

    if (isFinalSubmitted) {
      showWarning("Cannot edit: This date has been finalized and locked.");
      return;
    }

    if (
      isFormSaved &&
      !isEditing &&
      !canEditCurrentDate() &&
      !canEditPastDate()
    ) {
      showWarning("Cannot edit this data. Enable edit mode first.");
      return;
    }

    // Allow empty string or valid numbers >= 0
    if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
      // Update editing values immediately
      const editKey = `${id}_${field}`;
      setEditingValues((prev) => ({
        ...prev,
        [editKey]: value,
      }));
      setHasChanges(true);

      // Update stocks state with calculated closing stock
      setStocks((prevStocks) =>
        prevStocks.map((stock) => {
          if (stock.id !== id) return stock;

          // Get current values (either from editing state or stock state)
          const getCurrentValue = (fieldName) => {
            const editingKey = `${id}_${fieldName}`;
            if (fieldName === field) return value; // Use the new value for the field being changed
            return editingValues[editingKey] !== undefined
              ? editingValues[editingKey]
              : stock[fieldName];
          };

          const opening = stock.openingStock;
          const added = getCurrentValue("addedStock");
          const sold = getCurrentValue("sold");

          const openingNum = Number(opening) || 0;
          const addedNum = added === "" ? 0 : Number(added);
          const soldNum = sold === "" ? 0 : Number(sold);

          let closingStock = "";

          // Calculate closing stock only if we have opening stock
          if (opening !== "" && opening !== undefined) {
            if (stock.pageRanges && stock.pageRanges.length > 0) {
              // For items with page ranges, the sold field represents total sold from all ranges
              // So we should use it directly, not double it
              closingStock = openingNum + addedNum - soldNum;
            } else {
              // For regular items
              closingStock = openingNum + addedNum - soldNum;
            }
          }

          return {
            ...stock,
            [field]: value === "" ? "" : value,
            closingStock: closingStock !== "" ? closingStock : "",
          };
        })
      );
    }
  };

  const handlePageRangeChange = (id, rangeIndex, value) => {
    if (!date) {
      showWarning("Please select a date first");
      return;
    }

    if (isFinalSubmitted) {
      showWarning("Cannot edit: This date has been finalized and locked.");
      return;
    }

    if (
      isFormSaved &&
      !isEditing &&
      !canEditCurrentDate() &&
      !canEditPastDate()
    ) {
      showWarning("Cannot edit this data. Enable edit mode first.");
      return;
    }

    if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
      const editKey = `${id}_range_${rangeIndex}_sold`;
      setEditingValues((prev) => ({
        ...prev,
        [editKey]: value,
      }));
      setHasChanges(true);

      setStocks((prevStocks) =>
        prevStocks.map((stock) => {
          if (stock.id === id && stock.pageRanges) {
            const updatedPageRanges = [...stock.pageRanges];
            updatedPageRanges[rangeIndex] = {
              ...updatedPageRanges[rangeIndex],
              sold: value === "" ? "" : Number(value),
            };

            const totalSold = updatedPageRanges.reduce(
              (sum, range) => sum + (Number(range.sold) || 0),
              0
            );

            const closingStock =
              (Number(stock.openingStock) || 0) +
              (Number(stock.addedStock) || 0) -
              totalSold;

            return {
              ...stock,
              pageRanges: updatedPageRanges,
              sold: totalSold,
              closingStock: closingStock,
            };
          }
          return stock;
        })
      );
    }
  };

  const calculateTotalAmount = (list) => {
    return list.reduce((total, stock) => {
      if (stock.pageRanges && Array.isArray(stock.pageRanges)) {
        const rangesTotal = stock.pageRanges.reduce((sum, range) => {
          const rangeSold = Number(range.sold) || 0;
          const rangePrice = Number(range.price) || 0;
          return sum + rangeSold * rangePrice;
        }, 0);
        return total + rangesTotal;
      } else {
        const sold = getDisplayValue(stock, "sold");
        const stockAmount = Number(stock.amount) || 0;
        return total + (sold === "" ? 0 : Number(sold)) * stockAmount;
      }
    }, 0);
  };

  const handleSaveReading = async () => {
    if (!date) {
      showError("Please select a date first");
      return;
    }

    if (isFinalSubmitted) {
      showError("Cannot save: This date has been finalized and locked.");
      return;
    }

    const hasNegativeClosing = stocks.some((stock) => {
      const closing = Number(stock.closingStock);
      return !isNaN(closing) && closing < 0;
    });

    if (hasNegativeClosing) {
      showError("Cannot save: Some items have negative closing stock.");
      return;
    }

    setSearchTerm("");

    const confirmSave = window.confirm(
      "Are you sure you want to save all stock readings?"
    );

    if (!confirmSave) {
      return;
    }

    setIsLoading(true);
    setIsUpdatingFromFirestore(true);

    try {
      const docRef = doc(db, "stockReadings", docId);
      const updatedStocks = stocks.map((stock) => {
        const openingStock =
          stock.openingStock !== "" && stock.openingStock !== undefined
            ? Number(stock.openingStock)
            : 0;
        const addedStock =
          stock.addedStock !== "" && stock.addedStock !== undefined
            ? Number(stock.addedStock)
            : 0;
        const sold =
          stock.sold !== "" && stock.sold !== undefined
            ? Number(stock.sold)
            : 0;

        const closingStock = openingStock + addedStock - sold;

        const stockData = {
          itemName: stock.itemName,
          amount: Number(stock.amount) || 0,
          openingStock: openingStock,
          addedStock: addedStock,
          sold: sold,
          closingStock: closingStock,
        };

        if (stock.pageRanges) {
          stockData.pageRanges = stock.pageRanges.map((range) => ({
            range: range.range,
            sold:
              range.sold !== "" && range.sold !== undefined
                ? Number(range.sold)
                : 0,
            price: Number(range.price) || 0,
          }));
        }

        return stockData;
      });

      const totalAmountForDB = updatedStocks.reduce((total, s) => {
        if (Array.isArray(s.pageRanges) && s.pageRanges.length > 0) {
          const byRanges = s.pageRanges.reduce(
            (sum, r) => sum + (Number(r.sold) || 0) * (Number(r.price) || 0),
            0
          );
          return total + byRanges;
        }
        return total + (Number(s.sold) || 0) * (Number(s.amount) || 0);
      }, 0);

      const stockReadingData = {
        date,
        branchName,
        userId,
        stocks: updatedStocks,
        totalAmount: totalAmountForDB, // save corrected total amount
        lastUpdated: new Date().toISOString(),
        isLocked: false,
      };

      await setDoc(docRef, stockReadingData);

      for (const stock of updatedStocks) {
        if (stock.closingStock !== undefined) {
          const stocksRef = collection(db, "stocks");
          const q = query(
            stocksRef,
            where("branchName", "==", branchName),
            where("itemName", "==", stock.itemName)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const stockDoc = querySnapshot.docs[0];
            const stockRef = doc(db, "stocks", stockDoc.id);
            await updateDoc(stockRef, { qty: stock.closingStock });
          }
        }
      }

      setHasExistingData(true);
      setIsFormSaved(true);
      setHasChanges(false);
      setIsEditing(false);
      setEditingValues({});
      showSuccess("Stock readings saved successfully");
    } catch (error) {
      showError("Failed to save stock reading: " + error.message);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setIsUpdatingFromFirestore(false);
      }, 500);
    }
  };

  const handleEditClick = useCallback(() => {
    if (isFinalSubmitted) {
      showError("Cannot edit: This date has been finalized and locked.");
      return;
    }

    if (!canEditCurrentDate() && !canEditPastDate()) {
      showError(
        "Cannot edit this date. Only current date or approved past dates can be edited."
      );
      return;
    }
    setIsEditing(true);
    setIsFormSaved(false);
  }, [canEditCurrentDate, canEditPastDate, isFinalSubmitted, showError]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditingValues({}); // Clear any pending changes
    if (isFormSaved) {
      // If there was previously saved data, we're canceling an edit
      // The data will remain as it was
    }
  }, [isFormSaved]);

  const getDisplayValue = (stock, field) => {
    const editKey = `${stock.id}_${field}`;
    const value =
      editingValues[editKey] !== undefined
        ? editingValues[editKey]
        : stock[field];

    // Return the actual value (including empty string) for input fields
    return value === null || value === undefined ? "" : value;
  };

  const getPageRangeDisplayValue = (stockId, rangeIndex) => {
    const editKey = `${stockId}_range_${rangeIndex}_sold`;
    return editingValues[editKey] !== undefined ? editingValues[editKey] : "";
  };

  const totalAmount = calculateTotalAmount(filteredStocks);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoadingStocks) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Loading stock items for {branchName}...</p>
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="stock-loading-container">
        <div className="stock-no-data">
          <h3>No Stock Items Found</h3>
          <p>No stock items have been added for branch: {branchName}</p>
          <p>Please add stock items first using the Add Stock feature.</p>
        </div>
      </div>
    );
  }

  if (isLoading && !stocks.length) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Loading stock data...</p>
      </div>
    );
  }

  return (
    <div className="">
      <Popup {...popup} />
      <div className="stock-page-header">
        <h2>Stock Readings for {branchName}</h2>
        <p>
          Submit usage details for this branch. ({stocks.length} items
          available)
        </p>
      </div>

      <div className="stock-list">
        <div className="stock-card">
          <div className="stock-card-header">
            <div className="total-amount-title">
              <h3>Stock Items</h3>
              {isFinalSubmitted && (
                <div className="printer-existing-data-warning">
                  <FaLock /> Data Locked
                </div>
              )}
              {isEditing && hasExistingData && (
                <div className="total-editing-indicator">
                  <FaEdit /> Editing Mode
                </div>
              )}
            </div>

            <div className="stock-header-actions">
              {hasExistingData &&
                !isEditing &&
                (canEditCurrentDate() || canEditPastDate()) &&
                !isFinalSubmitted && (
                  <button
                    onClick={handleEditClick}
                    className="stock-edit-button"
                  >
                    <FaEdit /> Edit
                  </button>
                )}
              {(isEditing || !hasExistingData) && !isFinalSubmitted && (
                <div className="button-group">
                  {isEditing && hasExistingData && (
                    <button
                      onClick={handleCancelEdit}
                      className="stock-cancel-button"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveReading}
                    className="stock-save-button"
                    disabled={isLoading || !hasChanges}
                  >
                    <FaSave />{" "}
                    {isEditing && hasExistingData ? "Update" : "Save Readings"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div
            className="stock-search-container"
            style={{ paddingLeft: "10px" }}
          >
            <div className="stock-search-wrapper">
              <div
                className="stock-search-input-wrapper"
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  placeholder="Search by item name or category..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="stock-search-input"
                  style={{ paddingRight: "30px" }}
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="stock-clear-search-button"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>

            {searchTerm && (
              <div className="stock-search-results-info">
                <p>
                  Showing {filteredStocks.length} of {stocks.length} items
                  {searchTerm && ` for "${searchTerm}"`}
                </p>
              </div>
            )}
          </div>

          <div className="stock-card-content">
            <div className="stock-table-wrapper">
              <table className="stock-readings-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>
                      <div
                        className="sort-header"
                        onClick={() => handleSort("itemName")}
                      >
                        ITEMS
                        {sortField === "itemName" ? (
                          sortOrder === "asc" ? (
                            <FaSortUp className="sort-icon" />
                          ) : (
                            <FaSortDown className="sort-icon" />
                          )
                        ) : (
                          <FaSort className="sort-icon" />
                        )}
                      </div>
                    </th>
                    <th>
                      <div
                        className="sort-header"
                        onClick={() => handleSort("category")}
                      >
                        CATEGORY
                        {sortField === "category" ? (
                          sortOrder === "asc" ? (
                            <FaSortUp className="sort-icon" />
                          ) : (
                            <FaSortDown className="sort-icon" />
                          )
                        ) : (
                          <FaSort className="sort-icon" />
                        )}
                      </div>
                    </th>
                    <th>
                      OPENING
                      <br /> STOCK
                    </th>
                    <th>
                      ADDED
                      <br /> STOCK
                    </th>
                    <th>
                      CLOSING <br />
                      STOCK
                    </th>
                    <th colSpan="2">SOLD</th>
                    <th>
                      UNIT <br />
                      PRICE(₹)
                    </th>
                    <th>AMOUNT(₹)</th>
                  </tr>
                  <tr>
                    <th colSpan="6"></th>
                    <th>Pages</th>
                    <th>Qty</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {currentStocks.map((stock, index) => (
                    <React.Fragment key={stock.id}>
                      <tr>
                        <td
                          rowSpan={
                            stock.pageRanges ? stock.pageRanges.length + 1 : 1
                          }
                        >
                          {indexOfFirstStock + index + 1}
                        </td>
                        <td
                          rowSpan={
                            stock.pageRanges ? stock.pageRanges.length + 1 : 1
                          }
                        >
                          {stock.itemName}
                        </td>
                        <td
                          rowSpan={
                            stock.pageRanges ? stock.pageRanges.length + 1 : 1
                          }
                        >
                          {stock.category}
                        </td>
                        <td
                          rowSpan={
                            stock.pageRanges ? stock.pageRanges.length + 1 : 1
                          }
                        >
                          <input
                            type="number"
                            value={getDisplayValue(stock, "openingStock")}
                            readOnly
                            className="stock-reading-input stock-readonly"
                          />
                        </td>
                        <td
                          rowSpan={
                            stock.pageRanges ? stock.pageRanges.length + 1 : 1
                          }
                        >
                          <input
                            type="number"
                            min="0"
                            value={getDisplayValue(stock, "addedStock")}
                            onChange={(e) =>
                              handleInputChange(
                                stock.id,
                                "addedStock",
                                e.target.value
                              )
                            }
                            readOnly={
                              (isFormSaved && !isEditing) || isFinalSubmitted
                            }
                            className={`stock-reading-input ${
                              (isFormSaved && !isEditing) || isFinalSubmitted
                                ? "stock-readonly"
                                : ""
                            }`}
                          />
                        </td>
                        <td
                          rowSpan={
                            stock.pageRanges ? stock.pageRanges.length + 1 : 1
                          }
                        >
                          <input
                            type="number"
                            value={getDisplayValue(stock, "closingStock")}
                            readOnly
                            className={`stock-reading-input ${
                              Number(getDisplayValue(stock, "closingStock")) < 0
                                ? "stock-negative-reading"
                                : ""
                            }`}
                          />
                        </td>
                        {!stock.pageRanges && (
                          <>
                            <td></td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                value={getDisplayValue(stock, "sold")}
                                onChange={(e) =>
                                  handleInputChange(
                                    stock.id,
                                    "sold",
                                    e.target.value
                                  )
                                }
                                readOnly={
                                  (isFormSaved && !isEditing) ||
                                  isFinalSubmitted
                                }
                                className={`stock-reading-input ${
                                  (isFormSaved && !isEditing) ||
                                  isFinalSubmitted
                                    ? "stock-readonly"
                                    : ""
                                }`}
                              />
                            </td>
                            <td>₹{stock.amount}</td>
                            <td>
                              ₹
                              {(Number(getDisplayValue(stock, "sold")) || 0) *
                                (Number(stock.amount) || 0)}
                            </td>
                          </>
                        )}
                      </tr>
                      {stock.pageRanges &&
                        stock.pageRanges.map((range, rangeIndex) => (
                          <tr key={`${stock.id}-${rangeIndex}`}>
                            <td>{range.range}</td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                value={
                                  getPageRangeDisplayValue(
                                    stock.id,
                                    rangeIndex
                                  ) !== ""
                                    ? getPageRangeDisplayValue(
                                        stock.id,
                                        rangeIndex
                                      )
                                    : range.sold
                                }
                                onChange={(e) =>
                                  handlePageRangeChange(
                                    stock.id,
                                    rangeIndex,
                                    e.target.value
                                  )
                                }
                                readOnly={
                                  (isFormSaved && !isEditing) ||
                                  isFinalSubmitted
                                }
                                className={`stock-reading-input ${
                                  (isFormSaved && !isEditing) ||
                                  isFinalSubmitted
                                    ? "stock-readonly"
                                    : ""
                                }`}
                              />
                            </td>
                            <td>₹{range.price}</td>
                            <td>
                              ₹
                              {((getPageRangeDisplayValue(
                                stock.id,
                                rangeIndex
                              ) !== ""
                                ? Number(
                                    getPageRangeDisplayValue(
                                      stock.id,
                                      rangeIndex
                                    )
                                  )
                                : Number(range.sold)) || 0) * range.price}
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  ))}
                  <tr className="stock-total-row">
                    <td colSpan="9">Grand Total:</td>
                    <td className="stock-grand-total">
                      {formatCurrency(totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="stock-pagination">
              <button
                onClick={previousPage}
                disabled={currentPage === 1}
                className="stock-pagination-button"
              >
                <FaRegArrowAltCircleLeft />
              </button>
              <span className="stock-page-info">
                {currentPage} of{" "}
                {Math.ceil(filteredStocks.length / stocksPerPage)}
              </span>
              <button
                onClick={nextPage}
                disabled={
                  currentPage ===
                  Math.ceil(filteredStocks.length / stocksPerPage)
                }
                className="stock-pagination-button"
              >
                <FaRegArrowAltCircleRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockSection;
