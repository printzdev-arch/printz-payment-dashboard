"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../../services/api";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Edit3,
  Lock,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Package,
  CheckCircle2,
} from "lucide-react";
import { usePopup } from "../../../hooks/usePopup";
import Popup from "../../common/Popup";
import DailyReadingsSkeleton from "./DailyReadingsSkeleton";

const StockSection = ({
  date,
  branchName,
  userId,
  approvedDates,
  onFinalSubmitChange,
  isFinalSubmitted,
  onStockSubmissionChange,
  onNextStep,
  onPrevStep,
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

  useEffect(() => {
    if (!branchName || !date) return;

    const checkExistingData = async () => {
      try {
        const res = await api.get("/stocks/readings", {
          params: { branchName, date },
        });
        const data = res.data?.data?.[0];

        if (data) {
          setDocId(data._id || data.id);
          setHasExistingData(true);
          setIsFormSaved(true);
          onStockSubmissionChange?.(true);
        } else {
          setDocId("");
          setHasExistingData(false);
          setIsFormSaved(false);
          onStockSubmissionChange?.(false);
        }
      } catch (error) {
        console.error("Error checking existing stock data:", error);
      }
    };

    checkExistingData();
  }, [branchName, date, onStockSubmissionChange]);

  useEffect(() => {
    if (!branchName) return;

    setIsLoadingStocks(true);
    const fetchStocks = async () => {
      try {
        const res = await api.get("/stocks/items", {
          params: { branchName },
        });
        const stockList = (res.data?.data || []).map((d) => ({
          id: d._id || d.id,
          ...d,
          openingStock: d.stockQty || d.qty || 0,
          addedStock: 0,
          closingStock: d.stockQty || d.qty || 0,
          sold: 0,
        }));

        setStocks(stockList);
        setFilteredStocks(stockList);
        setIsLoadingStocks(false);
      } catch (error) {
        console.error("Error fetching stocks:", error);
        setIsLoadingStocks(false);
      }
    };

    fetchStocks();
  }, [branchName]);

  const handleInputChange = (id, field, value) => {
    const numValue = value === "" ? "" : Number(value);
    setEditingValues((prev) => ({
      ...prev,
      [`${id}_${field}`]: numValue,
    }));
    setHasChanges(true);

    setStocks((prevStocks) =>
      prevStocks.map((stock) => {
        if (stock.id === id) {
          const updatedStock = { ...stock, [field]: numValue };
          const opening = Number(updatedStock.openingStock) || 0;
          const added = Number(updatedStock.addedStock) || 0;
          const sold = Number(updatedStock.sold) || 0;
          updatedStock.closingStock = opening + added - sold;
          return updatedStock;
        }
        return stock;
      })
    );
  };

  const handlePageRangeChange = (stockId, rangeIndex, value) => {
    const numValue = value === "" ? "" : Number(value);
    setEditingValues((prev) => ({
      ...prev,
      [`${stockId}_range_${rangeIndex}`]: numValue,
    }));
    setHasChanges(true);

    setStocks((prevStocks) =>
      prevStocks.map((stock) => {
        if (stock.id === stockId && stock.pageRanges) {
          const updatedRanges = [...stock.pageRanges];
          updatedRanges[rangeIndex] = {
            ...updatedRanges[rangeIndex],
            sold: numValue,
          };
          const totalSold = updatedRanges.reduce(
            (sum, r) => sum + (Number(r.sold) || 0),
            0
          );
          const opening = Number(stock.openingStock) || 0;
          const added = Number(stock.addedStock) || 0;
          return {
            ...stock,
            pageRanges: updatedRanges,
            sold: totalSold,
            closingStock: opening + added - totalSold,
          };
        }
        return stock;
      })
    );
  };

  const getDisplayValue = (stock, field) => {
    const editKey = `${stock.id}_${field}`;
    if (editingValues[editKey] !== undefined) {
      return editingValues[editKey];
    }
    return stock[field] !== undefined ? stock[field] : "";
  };

  const getPageRangeDisplayValue = (stockId, rangeIndex) => {
    const editKey = `${stockId}_range_${rangeIndex}`;
    if (editingValues[editKey] !== undefined) {
      return editingValues[editKey];
    }
    return "";
  };

  const totalAmount = useMemo(() => {
    return stocks.reduce((total, stock) => {
      if (stock.pageRanges && stock.pageRanges.length > 0) {
        return (
          total +
          stock.pageRanges.reduce((rangeTotal, range) => {
            const sold = Number(range.sold) || 0;
            const price = Number(range.price) || 0;
            return rangeTotal + sold * price;
          }, 0)
        );
      }
      const sold = Number(stock.sold) || 0;
      const amount = Number(stock.amount) || 0;
      return total + sold * amount;
    }, 0);
  }, [stocks]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const payload = {
        ...(docId && { id: docId }),
        branchName,
        date,
        stocks,
        totalAmount,
        lastUpdated: new Date(),
        userId,
      };
      const res = await api.post("/stocks/readings", payload);
      if (res.data?.data?._id || res.data?.data?.id) {
        setDocId(res.data.data._id || res.data.data.id);
      }

      setIsFormSaved(true);
      setHasExistingData(true);
      setIsEditing(false);
      setHasChanges(false);
      onStockSubmissionChange?.(true);
      showSuccess("Stock readings saved successfully");
    } catch (error) {
      console.error("Error saving stock readings:", error);
      showError("Failed to save stock readings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (!canEditCurrentDate() && !canEditPastDate()) {
      showError("Cannot edit this date.");
      return;
    }
    if (isFinalSubmitted) {
      showError("Data is locked after final submission.");
      return;
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingValues({});
    setHasChanges(false);
  };

  const indexOfLastStock = currentPage * stocksPerPage;
  const indexOfFirstStock = indexOfLastStock - stocksPerPage;
  const currentStocks = sortedStocks.slice(indexOfFirstStock, indexOfLastStock);

  const nextPage = () => {
    if (currentPage < Math.ceil(filteredStocks.length / stocksPerPage)) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  if (isLoadingStocks) {
    return (
      <DailyReadingsSkeleton
        message="Loading stock inventory & readings..."
        subtitle={`Fetching items, opening balances, and sold stock for ${branchName || "branch"}...`}
      />
    );
  }

  return (
    <div className="revenue-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "14px 20px" }}>
        {/* Search Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div className="revenue-card-search-wrap">
            <Search size={16} className="revenue-search-icon" />
            <input
              type="text"
              placeholder="Search items or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="revenue-search-input"
            />
            {searchTerm && (
              <button onClick={clearSearch} className="revenue-search-clear">
                <X size={12} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {hasExistingData && !isEditing && (canEditCurrentDate() || canEditPastDate()) && !isFinalSubmitted && (
              <button onClick={handleEdit} className="stock-edit-button">
                <Edit3 size={15} /> Edit Stock
              </button>
            )}
            {isEditing && (
              <>
                {hasExistingData && (
                  <button onClick={handleCancel} className="stock-cancel-button">
                    <X size={15} /> Cancel
                  </button>
                )}
                <button onClick={handleSave} className="stock-save-button" disabled={isLoading}>
                  <Save size={15} /> {hasExistingData ? "Update Stock" : "Save Stock"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Modern Table */}
        <div className="revenue-table-wrapper">
          <table className="revenue-modern-table revenue-stock-table">
            <thead>
              <tr>
                <th className="th-sno">S.NO</th>
                <th className="th-item" onClick={() => handleSort("itemName")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    ITEM NAME
                    {sortField === "itemName" ? (
                      sortOrder === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={13} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th className="th-category" onClick={() => handleSort("category")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    CATEGORY
                    {sortField === "category" ? (
                      sortOrder === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={13} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th className="center th-stock">OPENING</th>
                <th className="center th-stock">ADDED</th>
                <th className="center th-stock">CLOSING</th>
                <th className="center" style={{ width: "90px" }}>PAGES</th>
                <th className="center" style={{ width: "90px" }}>SOLD</th>
                <th className="right th-price">UNIT PRICE (₹)</th>
                <th className="right th-amount">AMOUNT (₹)</th>
              </tr>
            </thead>
            <tbody>
              {currentStocks.map((stock, index) => (
                <React.Fragment key={stock.id}>
                  <tr>
                    <td className="td-sno">
                      {indexOfFirstStock + index + 1}
                    </td>
                    <td className="td-item">
                      <span className="revenue-stock-item-name">{stock.itemName}</span>
                    </td>
                    <td>
                      <span className="revenue-category-chip">{stock.category}</span>
                    </td>
                    <td className="center" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                      {getDisplayValue(stock, "openingStock") || "0"}
                    </td>
                    <td className="center">
                      {!isEditing ? (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                          {getDisplayValue(stock, "addedStock") || "0"}
                        </span>
                      ) : (
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={getDisplayValue(stock, "addedStock")}
                          onChange={(e) => handleInputChange(stock.id, "addedStock", e.target.value)}
                          className="stock-input"
                          style={{ maxWidth: "70px", textAlign: "center" }}
                        />
                      )}
                    </td>
                    <td className="center" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                      {getDisplayValue(stock, "closingStock") || "0"}
                    </td>

                    {!stock.pageRanges && (
                      <>
                        <td className="center">-</td>
                        <td className="center">
                          {!isEditing ? (
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                              {getDisplayValue(stock, "sold") || "0"}
                            </span>
                          ) : (
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              value={getDisplayValue(stock, "sold")}
                              onChange={(e) => handleInputChange(stock.id, "sold", e.target.value)}
                              className="stock-input"
                              style={{ maxWidth: "70px", textAlign: "center" }}
                            />
                          )}
                        </td>
                        <td className="right" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#334155" }}>
                          ₹{Number(stock.amount || 0).toFixed(2)}
                        </td>
                        <td className="right" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#059669" }}>
                          {formatCurrency((Number(getDisplayValue(stock, "sold")) || 0) * (Number(stock.amount) || 0))}
                        </td>
                      </>
                    )}
                  </tr>

                  {stock.pageRanges &&
                    stock.pageRanges.map((range, rangeIndex) => (
                      <tr key={`${stock.id}-${rangeIndex}`} style={{ backgroundColor: "#fafbfc" }}>
                        <td colSpan="6" style={{ textAlign: "right", color: "#64748b", fontSize: "12px", fontStyle: "italic" }}>
                          Range Tier:
                        </td>
                        <td className="center">
                          <span className="stock-pages-text">{range.range}</span>
                        </td>
                        <td className="center">
                          {!isEditing ? (
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                              {getPageRangeDisplayValue(stock.id, rangeIndex) !== ""
                                ? getPageRangeDisplayValue(stock.id, rangeIndex)
                                : range.sold || "0"}
                            </span>
                          ) : (
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              value={
                                getPageRangeDisplayValue(stock.id, rangeIndex) !== ""
                                  ? getPageRangeDisplayValue(stock.id, rangeIndex)
                                  : range.sold
                              }
                              onChange={(e) => handlePageRangeChange(stock.id, rangeIndex, e.target.value)}
                              className="stock-input"
                              style={{ maxWidth: "70px", textAlign: "center" }}
                            />
                          )}
                        </td>
                        <td className="right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          ₹{Number(range.price || 0).toFixed(2)}
                        </td>
                        <td className="right" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#059669" }}>
                          {formatCurrency(
                            ((getPageRangeDisplayValue(stock.id, rangeIndex) !== ""
                              ? Number(getPageRangeDisplayValue(stock.id, rangeIndex))
                              : Number(range.sold)) || 0) * Number(range.price || 0)
                          )}
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="revenue-table-total-row">
                <td colSpan="9" style={{ fontWeight: 700, color: "#166534" }}>
                  Grand Total Stock Amount
                </td>
                <td className="right" style={{ fontWeight: 800, color: "#047857", fontFamily: "'JetBrains Mono', monospace", fontSize: "14px" }}>
                  {formatCurrency(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Showing {indexOfFirstStock + 1} to {Math.min(indexOfLastStock, filteredStocks.length)} of {filteredStocks.length} items
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={previousPage}
              disabled={currentPage === 1}
              style={{
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                borderRadius: "8px",
                padding: "6px 12px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                opacity: currentPage === 1 ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#0f172a" }}>
              {currentPage} / {Math.max(1, Math.ceil(filteredStocks.length / stocksPerPage))}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage >= Math.ceil(filteredStocks.length / stocksPerPage)}
              style={{
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                borderRadius: "8px",
                padding: "6px 12px",
                cursor: currentPage >= Math.ceil(filteredStocks.length / stocksPerPage) ? "not-allowed" : "pointer",
                opacity: currentPage >= Math.ceil(filteredStocks.length / stocksPerPage) ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Navigation Action Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px solid #f1f5f9",
            flexWrap: "wrap",
          }}
        >
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

export default StockSection;
