import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../services/authservice";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import {
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaRegEdit,
  FaCheck,
  FaTimes,
  FaFileDownload,
  FaPlus,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaSearch,
  FaTrash,
} from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import "../../styles/stocklist.css";
import "react-toastify/dist/ReactToastify.css";
import jsPDF from "jspdf";
import "jspdf-autotable";
import Popup from "../common/Popup";
import { usePopup } from "../../hooks/usePopup";

const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) {
    return "₹0";
  }
  let [integer, decimal] = Number.parseFloat(amount).toFixed(0).split(".");
  integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (integer.length > 4 && integer.includes(",,")) {
    integer = integer.replace(",,", ",");
  }

  return `₹${integer}${decimal ? "." + decimal : ""}`;
};

const StockList = () => {
  const { popup, showSuccess, showError, showInfo } = usePopup();
  const [stocks, setStocks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [category, setCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState(null);
  const stocksPerPage = 20;
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchQuery, setSearchQuery] = useState(""); // New state for search query
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const Categories = [
    { id: 1, name: "Calendars & Diaries" },
    { id: 2, name: "Stationery" },
    { id: 3, name: "Gifts" },
    { id: 4, name: "Services" },
    { id: 5, name: "Orders" },
    { id: 6, name: "Labels & Package" },
    { id: 7, name: "Others" },
  ];

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const usersCollection = collection(db, "branches");
        const snapshot = await getDocs(usersCollection);
        const branchNames = [
          ...new Set(snapshot.docs.map((doc) => doc.data().name)),
        ].filter(Boolean);

        const sortedBranches = branchNames.sort((a, b) =>
          a.toLowerCase().localeCompare(b.toLowerCase())
        );
        setBranches(sortedBranches);
      } catch (error) {
        showError(
          "Error Loading Branches",
          `Failed to fetch branch names: ${error.message}. Please refresh and try again.`
        );
      }
    };

    fetchBranches();
  }, []);

  // Clear selected items when branch changes
  useEffect(() => {
    setSelectedItems([]);
    setSelectAll(false);
    setCurrentPage(1);
  }, [branchName]);

  useEffect(() => {
    if (unsubscribe) {
      unsubscribe();
    }

    if (!branchName) {
      setStocks([]);
      return;
    }

    setIsLoading(true);

    const stockCollection = collection(db, "stocks");
    const branchQuery = where("branchName", "==", branchName);
    const categoryQuery = where("category", "==", category);
    let dbQuery;

    if (branchName && category) {
      dbQuery = query(stockCollection, branchQuery, categoryQuery);
    } else if (branchName) {
      dbQuery = query(stockCollection, branchQuery);
    } else {
      dbQuery = query(stockCollection);
    }

    const unsubscribeListener = onSnapshot(
      dbQuery,
      (snapshot) => {
        const stockList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          pageRanges: doc.data().pageRanges || null,
        }));
        setStocks(stockList);
        setIsLoading(false);
      },
      (error) => {
        showError(
          "Error Loading Stocks",
          `Failed to fetch stocks: ${error.message}. Please check your connection and try again.`
        );
        setIsLoading(false);
      }
    );

    setUnsubscribe(() => unsubscribeListener);

    return () => {
      if (unsubscribeListener) {
        unsubscribeListener();
      }
    };
  }, [branchName, category]);

  // Reset current page when filters or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [branchName, category, searchQuery]);

  // Add sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New sort field
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Apply search filter and then sorting
  const filteredAndSortedStocks = useMemo(() => {
    let currentFilteredStocks = stocks;

    if (searchQuery) {
      currentFilteredStocks = currentFilteredStocks.filter(
        (stock) =>
          stock.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (stock.stockId &&
            stock.stockId.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (!sortField) return currentFilteredStocks;

    return [...currentFilteredStocks].sort((a, b) => {
      let valueA = a[sortField] || "";
      let valueB = b[sortField] || "";

      // Handle numeric values
      if (sortField === "qty" || sortField === "amount") {
        valueA = Number(valueA) || 0;
        valueB = Number(valueB) || 0;
        if (valueA < valueB) {
          return sortOrder === "asc" ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortOrder === "asc" ? 1 : -1;
        }
        return 0;
      } else if (sortField === "stockId") {
        // Natural sort for stock IDs containing numbers
        const naturalSort = (str1, str2) => {
          return str1.localeCompare(str2, undefined, { 
            numeric: true, 
            sensitivity: 'base' 
          });
        };
        
        const comparison = naturalSort(String(valueA), String(valueB));
        return sortOrder === "asc" ? comparison : -comparison;
      } else {
        // Convert strings to uppercase for text comparison
        valueA = String(valueA).toUpperCase();
        valueB = String(valueB).toUpperCase();
        
        if (valueA < valueB) {
          return sortOrder === "asc" ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortOrder === "asc" ? 1 : -1;
        }
        return 0;
      }
    });
  }, [stocks, sortField, sortOrder, searchQuery]);

  const indexOfLastStock = currentPage * stocksPerPage;
  const indexOfFirstStock = indexOfLastStock - stocksPerPage;
  const currentStocks = filteredAndSortedStocks.slice(
    indexOfFirstStock,
    indexOfLastStock
  );

  const nextPage = () => {
    if (
      currentPage < Math.ceil(filteredAndSortedStocks.length / stocksPerPage)
    ) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleInputChange = (id, field, value) => {
    const updatedStocks = stocks.map((stock) =>
      stock.id === id ? { ...stock, [field]: value } : stock
    );
    setStocks(updatedStocks);
  };

  const handlePageRangeChange = (id, rangeIndex, field, value) => {
    const updatedStocks = stocks.map((stock) => {
      if (stock.id === id && stock.pageRanges) {
        const updatedPageRanges = [...stock.pageRanges];
        updatedPageRanges[rangeIndex] = {
          ...updatedPageRanges[rangeIndex],
          [field]: value,
        };
        return { ...stock, pageRanges: updatedPageRanges };
      }
      return stock;
    });
    setStocks(updatedStocks);
  };

  const addPageRange = (id) => {
    const updatedStocks = stocks.map((stock) => {
      if (stock.id === id) {
        const newPageRanges = stock.pageRanges ? [...stock.pageRanges] : [];
        newPageRanges.push({ range: "", price: "" });
        return { ...stock, pageRanges: newPageRanges };
      }
      return stock;
    });
    setStocks(updatedStocks);
  };

  const removePageRange = (id, rangeIndex) => {
    const updatedStocks = stocks.map((stock) => {
      if (stock.id === id && stock.pageRanges) {
        const updatedPageRanges = stock.pageRanges.filter(
          (_, index) => index !== rangeIndex
        );
        return {
          ...stock,
          pageRanges: updatedPageRanges.length > 0 ? updatedPageRanges : null,
        };
      }
      return stock;
    });
    setStocks(updatedStocks);
  };

  const handleSave = async (id) => {
    const stockToUpdate = stocks.find((stock) => stock.id === id);
    try {
      await updateDoc(doc(db, "stocks", id), stockToUpdate);
      setEditing(null);
      showSuccess("Stock Updated", "Stock details updated successfully");
    } catch (error) {
      showError(
        "Update Failed",
        `Failed to update stock details: ${error.message}. Please try again.`
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "stocks", id));
      showSuccess("Stock Deleted", "Stock item deleted successfully");
    } catch (error) {
      showError(
        "Delete Failed",
        `Failed to delete stock: ${error.message}. Please try again.`
      );
    }
  };

  // Bulk delete functions
  const handleSelectItem = (stockId) => {
    setSelectedItems(prev => {
      if (prev.includes(stockId)) {
        return prev.filter(id => id !== stockId);
      } else {
        return [...prev, stockId];
      }
    });
  };

  const handleSelectAll = (filteredStocks) => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredStocks.map(stock => stock.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      showError("Selection Required", "Please select items to delete");
      return;
    }
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const promises = selectedItems.map(stockId => 
        deleteDoc(doc(db, "stocks", stockId))
      );
      
      await Promise.all(promises);
      
      showSuccess("Bulk Delete Success", `Successfully deleted ${selectedItems.length} stock item(s)`);
      setSelectedItems([]);
      setSelectAll(false);
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      showError("Bulk Delete Failed", "Failed to delete selected stocks: " + error.message);
    }
  };

  const cancelBulkDelete = () => {
    setShowBulkDeleteConfirm(false);
  };

  const handleCancel = () => {
    setEditing(null);
  };

  const generatePDF = async () => {
    if (!branchName) {
      showError(
        "Branch Required",
        "Please select a branch first before generating PDF"
      );
      return;
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.width;
      let yPosition = 15;

      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 58, 138);
      pdf.text(branchName, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 8;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `Stock Price List${category ? ` - ${category}` : ""}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 8;

      pdf.text(
        `Generated on: ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 20;

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 58, 138);
      pdf.text("STOCK PRICE LIST", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 12;

      const stockTableData = [];
      let serialNo = 1;

      // Use filtered and sorted stocks for PDF generation
      filteredAndSortedStocks.forEach((stock) => {
        if (stock.pageRanges && stock.pageRanges.length > 0) {
          stock.pageRanges.forEach((range, rangeIndex) => {
            stockTableData.push([
              rangeIndex === 0 ? serialNo : "",
              rangeIndex === 0 ? stock.itemName : "",
              rangeIndex === 0 ? stock.category : "",
              range.range,
              `Rs.${range.price}`,
            ]);
          });
          serialNo++;
        } else {
          stockTableData.push([
            serialNo,
            stock.itemName,
            stock.category,
            "Standard",
            `Rs.${stock.amount}`,
          ]);
          serialNo++;
        }
      });

      pdf.autoTable({
        head: [["S.No", "Item Name", "Category", "Page Range", "Unit Price"]],
        body: stockTableData,
        startY: yPosition,
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
          0: { cellWidth: 15, halign: "center" },
          1: { cellWidth: 60 },
          2: { cellWidth: 40 },
          3: { cellWidth: 35 },
          4: { cellWidth: 30, halign: "right" },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 },
      });

      const currentDate = new Date()
        .toISOString()
        .split("T")[0]
        .split("-")
        .reverse()
        .join("-");
      pdf.save(`Stock_Price_List_${branchName}_${currentDate}.pdf`);
      showSuccess(
        "PDF Generated",
        "Stock price list PDF generated successfully!"
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      showError(
        "PDF Generation Failed",
        `Failed to generate PDF: ${error.message}. Please try again.`
      );
    }
  };

  if (isLoading) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Loading stock items...</p>
      </div>
    );
  }

  return (
    <div className="stock-readings-container">
      <Popup {...popup} />
      <div className="stock-page-header">
        <h2>Stock Price Management</h2>
        <p>Manage stock items and pricing across all branches</p>
      </div>

      <div className="stock-date-picker-container">
        <div className="stock-date-picker-wrapper">
          <label>Branch Name</label>
          <select
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="stock-select-input"
          >
            <option value="">Select Branch</option>
            {branches.map((branch, index) => (
              <option key={index} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>
        <div className="stock-date-picker-wrapper">
          <label htmlFor="search-stock">Search Item</label>
          <div className="search-input-container">
            <input
              id="search-stock"
              type="text"
              placeholder="Search by item name or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="stock-select-input search-input"
            />
          </div>
        </div>
      </div>

      {branchName ? (
        <div className="stock-list">
          <div className="stock-card">
            <div className="stock-card-header">
              <div className="stock-card-title">
                <h3>Stock Items ({filteredAndSortedStocks.length} items)</h3>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {filteredAndSortedStocks.length > 0 && (
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 15px",
                backgroundColor: "#f8f9fa",
                borderRadius: "6px",
                margin: "15px",
                border: "1px solid #e9ecef"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "500" }}>
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={() => handleSelectAll(filteredAndSortedStocks)}
                      style={{ transform: "scale(1.2)" }}
                    />
                    Select All ({filteredAndSortedStocks.length})
                  </label>
                  {selectedItems.length > 0 && (
                    <span style={{ fontSize: "14px", color: "#6c757d" }}>
                      {selectedItems.length} selected
                    </span>
                  )}
                </div>
                {selectedItems.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    style={{
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <FaTrash size={12} />
                    Delete Selected ({selectedItems.length})
                  </button>
                )}
              </div>
            )}

            <div className="stock-card-content">
              <div className="stock-table-wrapper">
                <table className="stock-readings-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={() => handleSelectAll(filteredAndSortedStocks)}
                          style={{ transform: "scale(1.2)" }}
                        />
                      </th>
                      <th style={{ textAlign: "center" }}>S.No</th>
                      <th>
                        <div
                          className="sort-header"
                          onClick={() => handleSort("stockId")}
                        >
                          ITEM ID
                          {sortField === "stockId" ? (
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
                        <div
                          className="sort-header"
                          onClick={() => handleSort("qty")}
                          style={{ textAlign: "center" }}
                        >
                          QTY
                        </div>
                      </th>
                      <th colSpan="2" style={{ textAlign: "center" }}>PRICING</th>
                      <th style={{ textAlign: "center" }}>ACTIONS</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th></th>
                      <th></th>
                      <th></th>
                      <th></th>
                      <th></th>
                      <th style={{ textAlign: "center" }}>Pages</th>
                      <th style={{ textAlign: "center" }}>Unit Price(₹)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStocks.length > 0 ? (
                      currentStocks.map((stock, index) => {
                        const totalRows = stock.pageRanges
                          ? stock.pageRanges.length
                          : 1;
                        return (
                          <React.Fragment key={stock.id}>
                            <tr>
                              <td rowSpan={totalRows} style={{ textAlign: "center", width: "50px" }}>
                                <input
                                  type="checkbox"
                                  checked={selectedItems.includes(stock.id)}
                                  onChange={() => handleSelectItem(stock.id)}
                                  style={{ transform: "scale(1.2)" }}
                                />
                              </td>
                              <td rowSpan={totalRows}>
                                {indexOfFirstStock + index + 1}
                              </td>
                              <td rowSpan={totalRows}>
                                {(stock.stockId || "N/A").toUpperCase()}
                              </td>
                              <td
                                rowSpan={totalRows}
                                style={{ alignItems: "center" }}
                              >
                                {editing === stock.id ? (
                                  <input
                                    type="text"
                                    value={stock.itemName}
                                    onChange={(e) =>
                                      handleInputChange(
                                        stock.id,
                                        "itemName",
                                        e.target.value.toUpperCase()
                                      )
                                    }
                                    style={{
                                      textTransform: "uppercase",
                                      width: "90%",
                                    }}
                                  />
                                ) : (
                                  stock.itemName?.toUpperCase()
                                )}
                              </td>
                              <td rowSpan={totalRows}>
                                {editing === stock.id ? (
                                  <select
                                    value={stock.category}
                                    onChange={(e) =>
                                      handleInputChange(
                                        stock.id,
                                        "category",
                                        e.target.value
                                      )
                                    }
                                    className="stock-reading-input"
                                    style={{ textTransform: "uppercase" }}
                                  >
                                    {Categories.map((cat) => (
                                      <option key={cat.id} value={cat.name}>
                                        {cat.name.toUpperCase()}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  stock.category?.toUpperCase()
                                )}
                              </td>
                              <td rowSpan={totalRows}>
                                {editing === stock.id ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={stock.qty || 0}
                                    onChange={(e) =>
                                      handleInputChange(
                                        stock.id,
                                        "qty",
                                        e.target.value
                                      )
                                    }
                                    className="stock-reading-input"
                                  />
                                ) : (
                                  stock.qty || 0
                                )}
                              </td>
                              {stock.pageRanges &&
                              stock.pageRanges.length > 0 ? (
                                <>
                                  <td>
                                    {editing === stock.id ? (
                                      <input
                                        type="text"
                                        value={stock.pageRanges[0].range}
                                        onChange={(e) =>
                                          handlePageRangeChange(
                                            stock.id,
                                            0,
                                            "range",
                                            e.target.value.toUpperCase()
                                          )
                                        }
                                        className="stock-reading-input"
                                        placeholder="e.g., 1-10 pages"
                                        style={{ textTransform: "uppercase" }}
                                      />
                                    ) : (
                                      stock.pageRanges[0].range
                                    )}
                                  </td>
                                  <td>
                                    {editing === stock.id ? (
                                      <div className="stock-range-price-container">
                                        <input
                                          type="number"
                                          min="0"
                                          value={stock.pageRanges[0].price}
                                          onChange={(e) =>
                                            handlePageRangeChange(
                                              stock.id,
                                              0,
                                              "price",
                                              e.target.value
                                            )
                                          }
                                          className="stock-reading-input"
                                          placeholder="Price"
                                        />
                                        {stock.pageRanges.length > 1 && (
                                          <button
                                            onClick={() =>
                                              removePageRange(stock.id, 0)
                                            }
                                            className="remove-service-btn"
                                          >
                                            <FaTimes />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      formatCurrency(stock.pageRanges[0].price)
                                    )}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>Standard</td>
                                  <td>
                                    {editing === stock.id ? (
                                      <input
                                        type="number"
                                        min="0"
                                        value={stock.amount}
                                        onChange={(e) =>
                                          handleInputChange(
                                            stock.id,
                                            "amount",
                                            e.target.value
                                          )
                                        }
                                        className="stock-reading-input"
                                      />
                                    ) : (
                                      formatCurrency(stock.amount)
                                    )}
                                  </td>
                                </>
                              )}
                              <td rowSpan={totalRows}>
                                {editing === stock.id ? (
                                  <div
                                    className="table-actions"
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "4px",
                                      alignItems: "center",
                                      justifyContent: "flex-start",
                                    }}
                                  >
                                    <button
                                      onClick={() => handleSave(stock.id)}
                                      style={{
                                        padding: "6px 8px",
                                        fontSize: "11px",
                                        width: "80px",
                                        height: "28px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "4px",
                                        borderRadius: "4px",
                                        backgroundColor: "#3b82f6",
                                        color: "white",
                                      }}
                                    >
                                      Save
                                    </button>
                                    <button
                                      style={{
                                        padding: "6px 8px",
                                        fontSize: "11px",
                                        width: "80px",
                                        height: "28px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "4px",
                                        borderRadius: "4px",
                                        backgroundColor: "#3b82f6",
                                        color: "white",
                                      }}
                                      onClick={handleCancel}
                                    >
                                      Cancel
                                    </button>
                                    {stock.pageRanges && (
                                      <button
                                        onClick={() => addPageRange(stock.id)}
                                        style={{
                                          padding: "6px 8px",
                                          fontSize: "11px",
                                          width: "80px",
                                          height: "28px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          gap: "4px",
                                          borderRadius: "4px",
                                          backgroundColor: "#3b82f6",
                                          color: "white",
                                        }}
                                      >
                                        Add
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    className="table-actions"
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "4px",
                                      alignItems: "center",
                                      justifyContent: "flex-start",
                                    }}
                                  >
                                    <button
                                      onClick={() => setEditing(stock.id)}
                                      style={{
                                        padding: "6px 8px",
                                        fontSize: "11px",
                                        width: "80px",
                                        height: "28px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "4px",
                                        borderRadius: "4px",
                                        backgroundColor: "#3b82f6",
                                        color: "white",
                                      }}
                                    >
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleDelete(stock.id)}
                                      style={{
                                        padding: "6px 8px",
                                        fontSize: "11px",
                                        width: "80px",
                                        height: "28px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "4px",
                                        borderRadius: "4px",
                                        backgroundColor: "#3b82f6",
                                        color: "white",
                                      }}
                                    >
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                            {stock.pageRanges &&
                              stock.pageRanges
                                .slice(1)
                                .map((range, rangeIndex) => (
                                  <tr key={`${stock.id}-${rangeIndex + 1}`}>
                                    <td>
                                      {editing === stock.id ? (
                                        <input
                                          type="text"
                                          value={range.range}
                                          onChange={(e) =>
                                            handlePageRangeChange(
                                              stock.id,
                                              rangeIndex + 1,
                                              "range",
                                              e.target.value.toUpperCase()
                                            )
                                          }
                                          className="stock-reading-input"
                                          placeholder="e.g., 11-50 pages"
                                          style={{ textTransform: "uppercase" }}
                                        />
                                      ) : (
                                        range.range
                                      )}
                                    </td>
                                    <td>
                                      {editing === stock.id ? (
                                        <div className="stock-range-price-container">
                                          <input
                                            type="number"
                                            min="0"
                                            value={range.price}
                                            onChange={(e) =>
                                              handlePageRangeChange(
                                                stock.id,
                                                rangeIndex + 1,
                                                "price",
                                                e.target.value
                                              )
                                            }
                                            className="stock-reading-input"
                                            placeholder="Price"
                                          />
                                          <button
                                            onClick={() =>
                                              removePageRange(
                                                stock.id,
                                                rangeIndex + 1
                                              )
                                            }
                                            className="remove-service-btn"
                                          >
                                            <FaTimes />
                                          </button>
                                        </div>
                                      ) : (
                                        formatCurrency(range.price)
                                      )}
                                    </td>
                                  </tr>
                                ))}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="no-data-message">
                          No items found for the selected branch, category, or
                          search query.
                        </td>
                      </tr>
                    )}
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
                  {Math.ceil(filteredAndSortedStocks.length / stocksPerPage)}
                </span>
                <button
                  onClick={nextPage}
                  disabled={
                    currentPage ===
                    Math.ceil(filteredAndSortedStocks.length / stocksPerPage)
                  }
                  className="stock-pagination-button"
                >
                  <FaRegArrowAltCircleRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="stock-select-date-message">
          <p>Please select a branch to view and manage stock items</p>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "8px",
            minWidth: "400px",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)"
          }}>
            <div style={{ marginBottom: "20px" }}>
              <FaTrash size={48} color="#dc3545" style={{ marginBottom: "15px" }} />
              <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>Confirm Bulk Delete</h3>
              <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                Are you sure you want to delete {selectedItems.length} selected stock item(s)?
                <br />
                <strong>This action cannot be undone.</strong>
              </p>
            </div>
            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
              <button
                onClick={cancelBulkDelete}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #ccc",
                  backgroundColor: "#f8f9fa",
                  color: "#333",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  backgroundColor: "#dc3545",
                  color: "white",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                Delete {selectedItems.length} Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockList;
