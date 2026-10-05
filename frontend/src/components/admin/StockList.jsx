import React, { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import {
  Building2,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Trash2,
  Edit,
  Pencil,
  Check,
  X,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  PackageSearch,
  Package,
  Eye,
  IndianRupee,
  Layers,
  Save,
  Tag,
  AlertTriangle,
} from "lucide-react";
import "../../styles/printzTheme.css";
import "../../styles/stocklist.css";
import "react-toastify/dist/ReactToastify.css";
import jsPDF from "jspdf";
import autoTable, { applyPlugin } from "jspdf-autotable";

try {
  applyPlugin(jsPDF);
} catch (e) {}

import Popup from "../common/Popup.jsx";
import { usePopup } from "../../hooks/usePopup";
import Pagination from "../common/Pagination";
import BranchSelect from "../common/BranchSelect.jsx";

const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) {
    return "₹0.00";
  }
  const numAmount = Number.parseFloat(amount);
  return `₹${numAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const StockList = () => {
  const { popup, showSuccess, showError, showInfo } = usePopup();
  const [stocks, setStocks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [branches, setBranches] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");
  const [Categories, setCategories] = useState([]);
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stocksPerPage, setStocksPerPage] = useState(10);

  // View & Edit Modal States
  const [selectedStockModal, setSelectedStockModal] = useState(null);
  const [isModalEditMode, setIsModalEditMode] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [modalFormData, setModalFormData] = useState({
    itemName: "",
    stockId: "",
    category: "",
    qty: 0,
    amount: 0,
    branchName: "",
    hasPageRanges: false,
    pageRanges: [{ range: "", price: 0 }],
  });
  const [isSavingModal, setIsSavingModal] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/general/categories");
        const catMap = new Map();
        (response.data?.data || []).forEach((cat) => {
          const name = (cat.categoryName || cat.name || cat.categoryId || "").trim();
          if (name) {
            catMap.set(name.toUpperCase(), { name: name.toUpperCase(), id: cat._id || cat.id || cat.categoryId });
          }
        });

        const catList = Array.from(catMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setCategories(catList);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await api.get("/branches");
        const branchNames = [
          ...new Set((response.data?.data || []).map((b) => b.name)),
        ].filter(Boolean);
        branchNames.sort((a, b) => a.localeCompare(b));
        setBranches(branchNames);
      } catch (error) {
        showError("Error fetching branches: " + error.message);
      }
    };
    fetchBranches();
  }, [showError]);

  useEffect(() => {
    if (!branchName) {
      setStocks([]);
      setSelectedItems([]);
      setSelectAll(false);
      return;
    }

    setIsLoading(true);
    const fetchStocksData = async () => {
      try {
        const res = await api.get("/stocks/items", {
          params: {
            branchName,
            ...(category && { category }),
          },
        });
        const stockData = (res.data?.data || []).map((doc) => ({
          id: doc._id || doc.id,
          ...doc,
        }));
        setStocks(stockData);
        setSelectedItems([]);
        setSelectAll(false);
        setIsLoading(false);

        // Dynamically merge all categories present in the loaded stocks
        setCategories((prev) => {
          const map = new Map();
          prev.forEach((c) => map.set((c.name || "").toUpperCase(), c));
          stockData.forEach((s) => {
            const catName = (s.category || "").trim();
            if (catName && !map.has(catName.toUpperCase())) {
              map.set(catName.toUpperCase(), { id: catName, name: catName });
            }
          });
          return Array.from(map.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
          );
        });
      } catch (error) {
        showError("Error fetching stocks: " + error.message);
        setIsLoading(false);
      }
    };

    fetchStocksData();
  }, [branchName, category, showError]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedItems([]);
    setSelectAll(false);
  }, [searchQuery, branchName, category]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleSelectAll = (items) => {
    if (selectAll) {
      setSelectedItems([]);
      setSelectAll(false);
    } else {
      const allIds = items.map((item) => item.id);
      setSelectedItems(allIds);
      setSelectAll(true);
    }
  };

  const handleSelectItem = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((item) => item !== id));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedItems, id];
      setSelectedItems(newSelected);
      if (newSelected.length === filteredAndSortedStocks.length) {
        setSelectAll(true);
      }
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) {
      showInfo("No Selection", "Please select items to delete.");
      return;
    }
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const deletePromises = selectedItems.map((id) =>
        api.delete(`/stocks/items/${id}`)
      );
      await Promise.all(deletePromises);
      showSuccess(
        "Deleted Successfully",
        `${selectedItems.length} items deleted successfully!`
      );
      setStocks((prev) => prev.filter((s) => !selectedItems.includes(s.id)));
      setSelectedItems([]);
      setSelectAll(false);
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting items: ", error);
      showError("Delete Failed", "Failed to delete selected items. Please try again.");
      setShowBulkDeleteConfirm(false);
    }
  };

  const cancelBulkDelete = () => {
    setShowBulkDeleteConfirm(false);
  };

  const handleDelete = (id) => {
    const item = stocks.find((stock) => stock.id === id);
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/stocks/items/${itemToDelete.id}`);
      showSuccess("Deleted Successfully", "Item deleted successfully!");
      setStocks((prev) => prev.filter((s) => s.id !== itemToDelete.id));
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting document: ", error);
      showError("Delete Failed", "Failed to delete item. Please try again.");
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const handleView = (stock) => {
    const hasRanges =
      Array.isArray(stock.pageRanges) && stock.pageRanges.length > 0;
    setSelectedStockModal(stock);
    setIsModalEditMode(false);
    setIsCustomCategory(false);
    const itemCategory = (stock.category || "").trim().toUpperCase();
    setModalFormData({
      itemName: stock.itemName || "",
      stockId: stock.stockId || "",
      category: itemCategory || "GENERAL",
      qty: stock.qty ?? 0,
      amount: stock.amount ?? 0,
      branchName: stock.branchName || branchName,
      hasPageRanges: hasRanges,
      pageRanges: hasRanges
        ? stock.pageRanges.map((r) => ({
            range: r.range || "",
            price: r.price ?? 0,
          }))
        : [{ range: "", price: 0 }],
    });
  };

  const handleOpenEditModal = (stock) => {
    const hasRanges =
      Array.isArray(stock.pageRanges) && stock.pageRanges.length > 0;
    setSelectedStockModal(stock);
    setIsModalEditMode(true);
    setIsCustomCategory(false);
    const itemCategory = (stock.category || "").trim().toUpperCase();
    setModalFormData({
      itemName: stock.itemName || "",
      stockId: stock.stockId || "",
      category: itemCategory || "GENERAL",
      qty: stock.qty ?? 0,
      amount: stock.amount ?? 0,
      branchName: stock.branchName || branchName,
      hasPageRanges: hasRanges,
      pageRanges: hasRanges
        ? stock.pageRanges.map((r) => ({
            range: r.range || "",
            price: r.price ?? 0,
          }))
        : [{ range: "", price: 0 }],
    });
  };

  const handleCloseModal = () => {
    setSelectedStockModal(null);
    setIsModalEditMode(false);
    setIsCustomCategory(false);
  };

  const handleModalInputChange = (field, value) => {
    setModalFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleModalPageRangeChange = (index, field, value) => {
    setModalFormData((prev) => {
      const updated = [...prev.pageRanges];
      updated[index] = {
        ...updated[index],
        [field]: field === "price" ? Number.parseFloat(value) || 0 : value,
      };
      return { ...prev, pageRanges: updated };
    });
  };

  const handleAddModalPageRange = () => {
    setModalFormData((prev) => ({
      ...prev,
      pageRanges: [...prev.pageRanges, { range: "", price: 0 }],
    }));
  };

  const handleRemoveModalPageRange = (index) => {
    setModalFormData((prev) => {
      const updated = prev.pageRanges.filter((_, i) => i !== index);
      return {
        ...prev,
        pageRanges: updated.length > 0 ? updated : [{ range: "", price: 0 }],
      };
    });
  };

  const handleSaveModalEdit = async () => {
    if (!modalFormData.itemName || !modalFormData.itemName.trim()) {
      showError("Validation Error", "Item name cannot be empty.");
      return;
    }

    setIsSavingModal(true);
    try {
      const updateData = {
        id: selectedStockModal.id,
        itemName: modalFormData.itemName.trim().toUpperCase(),
        category: (modalFormData.category || "GENERAL").toUpperCase(),
        qty: Number(modalFormData.qty) || 0,
        branchName: modalFormData.branchName || branchName,
        amount: modalFormData.hasPageRanges
          ? 0
          : Number(modalFormData.amount) || 0,
      };

      if (modalFormData.stockId && modalFormData.stockId.trim()) {
        updateData.stockId = modalFormData.stockId.trim().toUpperCase();
      }

      if (modalFormData.hasPageRanges) {
        updateData.pageRanges = modalFormData.pageRanges.map((r) => ({
          range: (r.range || "").trim().toUpperCase(),
          price: Number(r.price) || 0,
        }));
      } else {
        updateData.pageRanges = [];
      }

      await api.post("/stocks/items", updateData);

      setStocks((prev) =>
        prev.map((item) =>
          item.id === selectedStockModal.id
            ? { ...item, ...updateData }
            : item
        )
      );

      setSelectedStockModal((prev) => ({
        ...prev,
        ...updateData,
      }));

      setIsModalEditMode(false);
      showSuccess(
        "Updated Successfully",
        `"${updateData.itemName}" details have been updated successfully!`
      );
    } catch (error) {
      console.error("Error updating stock item:", error);
      showError("Update Failed", "Failed to update stock item: " + error.message);
    } finally {
      setIsSavingModal(false);
    }
  };

  const filteredAndSortedStocks = useMemo(() => {
    return stocks
      .filter((stock) => {
        const matchesSearch =
          stock.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stock.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (stock.stockId &&
            stock.stockId.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
      })
      .sort((a, b) => {
        if (!sortField) return 0;

        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === "qty" || sortField === "amount") {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        } else {
          aValue = (aValue || "").toString().toLowerCase();
          bValue = (bValue || "").toString().toLowerCase();
        }

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [stocks, searchQuery, sortField, sortOrder]);

  const indexOfLastStock = currentPage * stocksPerPage;
  const indexOfFirstStock = indexOfLastStock - stocksPerPage;
  const currentStocks = filteredAndSortedStocks.slice(
    indexOfFirstStock,
    indexOfLastStock
  );
  const totalPages = Math.ceil(filteredAndSortedStocks.length / stocksPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages
        );
      }
    }
    return pages;
  };

  const generatePDF = async () => {
    if (!branchName) {
      showError("Selection Required", "Please select a branch first.");
      return;
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.width;
      let yPosition = 15;

      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(5, 150, 105);
      pdf.text(branchName.toUpperCase(), pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 8;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 15;

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text("STOCK PRICE INVENTORY LIST", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

      const tableData = [];
      let serialNo = 1;

      filteredAndSortedStocks.forEach((stock) => {
        if (stock.pageRanges && stock.pageRanges.length > 0) {
          stock.pageRanges.forEach((range, rangeIndex) => {
            tableData.push([
              rangeIndex === 0 ? serialNo : "",
              rangeIndex === 0 ? (stock.stockId || "N/A").toUpperCase() : "",
              rangeIndex === 0 ? stock.itemName : "",
              rangeIndex === 0 ? stock.category : "",
              rangeIndex === 0 ? stock.qty || 0 : "",
              range.range || "Standard",
              formatCurrency(range.price),
            ]);
          });
          serialNo++;
        } else {
          tableData.push([
            serialNo,
            (stock.stockId || "N/A").toUpperCase(),
            stock.itemName,
            stock.category || "General",
            stock.qty || 0,
            "Standard",
            formatCurrency(stock.amount),
          ]);
          serialNo++;
        }
      });

      const tableConfig = {
        head: [
          [
            "S.No",
            "Item ID",
            "Item Name",
            "Category",
            "Qty",
            "Pages",
            "Unit Price",
          ],
        ],
        body: tableData,
        startY: yPosition,
        theme: "grid",
        headStyles: {
          fillColor: [5, 150, 105],
          textColor: 255,
          fontSize: 8,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          textColor: [30, 41, 59],
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 },
      };

      if (typeof pdf.autoTable === "function") {
        pdf.autoTable(tableConfig);
      } else {
        autoTable(pdf, tableConfig);
      }

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
        <p>Loading stock inventory...</p>
      </div>
    );
  }

  return (
    <div className="stock-page-container">
      <Popup {...popup} />

      {/* Full Header Banner - Green gradient banner without illustration */}
      <div
        className="printz-header-banner-full"
        style={{
          width: "100%",
          background:
            "linear-gradient(90deg, #E8FAF2 0%, #F0FFF9 50%, #E8FAF2 100%)",
          border: "1px solid #dcfce7",
          borderRadius: "16px",
          padding: "12px 24px",
          marginBottom: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
        }}
      >
        <div className="printz-header-title-area">
          <h1
            style={{
              margin: "0 0 4px 0",
              fontSize: "26px",
              fontWeight: 700,
              color: "#111827",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Stock Price{" "}
            <span className="highlight" style={{ color: "#059669" }}>
              Management
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            View, search, edit pricing, and manage inventory items across all
            branches.
          </p>
        </div>

        {branchName && filteredAndSortedStocks.length > 0 && (
          <div style={{ flexShrink: 0 }}>
            <button
              type="button"
              className="printz-btn-primary"
              onClick={generatePDF}
              style={{
                padding: "9px 20px",
                fontSize: "13.5px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(3, 174, 121, 0.35)",
                whiteSpace: "nowrap",
              }}
            >
              <FileDown size={15} />
              <span>Download PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Card: Branch, Category & Search */}
      <div className="stock-filter-card">
        {/* Branch Selector */}
        <div className="stock-filter-group">
          <label className="stock-filter-label">
            <Building2 size={15} color="#059669" />
            <span>
              Branch Location <span className="req">*</span>
            </span>
          </label>
          <BranchSelect
            value={branchName}
            onChange={(e) => {
              setBranchName(e.target.value);
              setCategory("");
            }}
            branches={branches}
            placeholder="Select Branch"
            allowAll={true}
            allOptionLabel="Select Branch"
          />
        </div>

        {/* Category Selector */}
        <div className="stock-filter-group">
          <label className="stock-filter-label">
            <Tag size={15} color="#059669" />
            <span>Category Filter</span>
          </label>
          <div className="stock-input-wrapper">
            <span className="stock-input-icon">
              <Tag size={16} />
            </span>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setCurrentPage(1);
                setSelectedItems([]);
                setSelectAll(false);
              }}
              className="stock-select-field"
            >
              <option value="">All Categories</option>
              {Categories.map((cat) => (
                <option key={cat.id || cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <span className="stock-select-chevron">
              <ChevronDown size={16} />
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="stock-filter-group">
          <label className="stock-filter-label">
            <Search size={15} color="#059669" />
            <span>Search Stock</span>
          </label>
          <div className="stock-input-wrapper">
            <span className="stock-input-icon">
              <Search size={16} />
            </span>
            <input
              type="text"
              className="stock-input-field"
              placeholder="Search by item name, category, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {branchName ? (
        <div className="stock-card">
          {/* Card Header & Bulk Actions */}
          <div className="stock-card-header">
            <h3 className="stock-card-title">
              <Package size={20} color="#059669" />
              <span>
                Stock Items ({filteredAndSortedStocks.length} items)
              </span>
            </h3>
          </div>

          {/* Bulk Selection Bar */}
          {filteredAndSortedStocks.length > 0 && (
            <div className="stock-bulk-bar">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label className="stock-select-all-label">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={() => handleSelectAll(filteredAndSortedStocks)}
                  />
                  <span>Select All ({filteredAndSortedStocks.length})</span>
                </label>
                {selectedItems.length > 0 && (
                  <span className="stock-selected-counter">
                    {selectedItems.length} selected
                  </span>
                )}
              </div>

              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="stock-btn-delete-bulk"
                >
                  <Trash2 size={14} />
                  <span>Delete Selected ({selectedItems.length})</span>
                </button>
              )}
            </div>
          )}

          {/* Stock Table */}
          {/* Stock Table */}
          <div className="stock-table-wrapper">
            <table className="stock-readings-table">
              <thead>
                <tr>
                  <th style={{ width: "48px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={() => handleSelectAll(filteredAndSortedStocks)}
                      style={{
                        width: "16px",
                        height: "16px",
                        accentColor: "#059669",
                        cursor: "pointer",
                      }}
                    />
                  </th>
                  <th style={{ width: "60px", textAlign: "center" }}>
                    S.No
                  </th>
                  <th
                    style={{ width: "140px" }}
                    className="stock-sort-th"
                    onClick={() => handleSort("stockId")}
                  >
                    <span className="stock-sort-header-inner">
                      <span>Item ID</span>
                      {sortField === "stockId" ? (
                        sortOrder === "asc" ? (
                          <ArrowUp size={13} color="#047857" />
                        ) : (
                          <ArrowDown size={13} color="#047857" />
                        )
                      ) : (
                        <ArrowUpDown size={13} color="#6ee7b7" />
                      )}
                    </span>
                  </th>
                  <th
                    style={{ minWidth: "220px" }}
                    className="stock-sort-th"
                    onClick={() => handleSort("itemName")}
                  >
                    <span className="stock-sort-header-inner">
                      <span>Items</span>
                      {sortField === "itemName" ? (
                        sortOrder === "asc" ? (
                          <ArrowUp size={13} color="#047857" />
                        ) : (
                          <ArrowDown size={13} color="#047857" />
                        )
                      ) : (
                        <ArrowUpDown size={13} color="#6ee7b7" />
                      )}
                    </span>
                  </th>
                  <th style={{ width: "160px", textAlign: "center" }}>
                    Pages
                  </th>
                  <th
                    style={{
                      width: "140px",
                      textAlign: "center",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentStocks.length > 0 ? (
                  currentStocks.map((stock, index) => {
                    return (
                      <tr key={stock.id}>
                        <td style={{ textAlign: "center", width: "48px" }}>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(stock.id)}
                            onChange={() => handleSelectItem(stock.id)}
                            style={{
                              width: "16px",
                              height: "16px",
                              accentColor: "#059669",
                              cursor: "pointer",
                            }}
                          />
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            color: "#64748b",
                            fontWeight: "600",
                            width: "60px",
                          }}
                        >
                          {indexOfFirstStock + index + 1}
                        </td>
                        <td style={{ width: "140px" }}>
                          <span className="stock-id-tag">
                            {(stock.stockId || "N/A").toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "13.5px",
                              fontWeight: "600",
                              color: "#0f172a",
                              wordBreak: "break-word",
                            }}
                          >
                            {stock.itemName?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", width: "160px" }}>
                          {stock.pageRanges && stock.pageRanges.length > 0 ? (
                            <span
                              className="stock-pages-pill tiered"
                              title={stock.pageRanges
                                .map(
                                  (r) =>
                                    `${r.range}: ${formatCurrency(r.price)}`
                                )
                                .join(", ")}
                            >
                              <Layers size={13} />
                              <span>
                                {stock.pageRanges.length}{" "}
                                {stock.pageRanges.length === 1
                                  ? "Tier"
                                  : "Tiers"}
                              </span>
                            </span>
                          ) : (
                            <span className="stock-pages-pill standard">
                              Standard
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "center", width: "140px" }}>
                          <div
                            className="stock-actions-cell"
                            style={{ justifyContent: "center" }}
                          >
                            <button
                              type="button"
                              onClick={() => handleView(stock)}
                              className="stock-btn-view"
                              title="View Details"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(stock)}
                              className="stock-btn-edit"
                              title="Edit Stock Item"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(stock.id)}
                              className="stock-btn-delete"
                              title="Delete Stock Item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      style={{ textAlign: "center", padding: "36px 16px" }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color: "#64748b",
                          fontSize: "14px",
                        }}
                      >
                        No items found matching the selected branch or search
                        query.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredAndSortedStocks.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredAndSortedStocks.length}
              itemsPerPage={stocksPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(limit) => {
                setStocksPerPage(limit);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 20, 50, 100]}
              itemLabel="items"
            />
          )}
        </div>
      ) : (
        <div className="stock-empty-card">
          <PackageSearch size={48} color="#94a3b8" />
          <h4 className="stock-empty-title">Select a Branch</h4>
          <p className="stock-empty-desc">
            Please choose a branch location from the selector above to view,
            manage, and update stock items and pricing.
          </p>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteConfirm && (
        <div className="stock-confirm-modal-overlay">
          <div className="stock-confirm-modal-box">
            <div className="stock-confirm-alert-icon">
              <Trash2 size={28} />
            </div>
            <h3 className="stock-confirm-modal-title">Confirm Bulk Delete</h3>
            <p className="stock-confirm-modal-text">
              Are you sure you want to permanently delete{" "}
              <strong>{selectedItems.length}</strong> selected stock item{selectedItems.length !== 1 ? "s" : ""}?
              <br />
              <span
                style={{
                  fontSize: "12.5px",
                  color: "#64748b",
                  display: "inline-block",
                  marginTop: "6px",
                }}
              >
                This action is permanent and cannot be undone.
              </span>
            </p>
            <div className="stock-confirm-modal-actions">
              <button
                type="button"
                onClick={cancelBulkDelete}
                className="stock-confirm-btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBulkDelete}
                className="stock-confirm-btn-delete"
              >
                Delete {selectedItems.length} Item{selectedItems.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Stock Delete Confirmation Dialog */}
      {showDeleteConfirm && itemToDelete && (
        <div className="stock-confirm-modal-overlay">
          <div className="stock-confirm-modal-box">
            <div className="stock-confirm-alert-icon">
              <Trash2 size={28} />
            </div>
            <h3 className="stock-confirm-modal-title">Delete Stock Item?</h3>
            <p className="stock-confirm-modal-text">
              Are you sure you want to permanently delete{" "}
              <strong>"{itemToDelete.itemName}"</strong>
              {itemToDelete.stockId ? ` (${itemToDelete.stockId})` : ""}?
              <br />
              <span
                style={{
                  fontSize: "12.5px",
                  color: "#64748b",
                  display: "inline-block",
                  marginTop: "6px",
                }}
              >
                This action is permanent and cannot be undone. All pricing and inventory details for this item will be removed.
              </span>
            </p>
            <div className="stock-confirm-modal-actions">
              <button
                type="button"
                onClick={cancelDelete}
                className="stock-confirm-btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="stock-confirm-btn-delete"
              >
                Delete Stock Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock View & Edit Details Popup Modal */}
      {selectedStockModal && (
        <div className="stock-modal-overlay" onClick={handleCloseModal}>
          <div
            className="stock-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="stock-modal-header">
              <div className="stock-modal-header-left">
                <div className="stock-modal-header-icon">
                  {isModalEditMode ? (
                    <Pencil size={20} />
                  ) : (
                    <Package size={20} />
                  )}
                </div>
                <div>
                  <h3 className="stock-modal-title">
                    {isModalEditMode
                      ? "Edit Stock Item"
                      : "Stock Item Details"}
                  </h3>
                  <p className="stock-modal-subtitle">
                    {isModalEditMode
                      ? `Editing ${
                          modalFormData.stockId ||
                          selectedStockModal.stockId ||
                          selectedStockModal.itemName
                        }`
                      : `${selectedStockModal.stockId || "N/A"} • ${
                          selectedStockModal.branchName || branchName
                        }`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="stock-modal-close-btn"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="stock-modal-body">
              {!isModalEditMode ? (
                /* ================= VIEW MODE ================= */
                <>
                  {/* Item Overview Banner */}
                  <div className="stock-modal-name-banner">
                    <div className="stock-modal-name-top">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span className="stock-id-tag">
                          {(
                            selectedStockModal.stockId || "N/A"
                          ).toUpperCase()}
                        </span>
                        <span className="stock-category-chip">
                          {selectedStockModal.category?.toUpperCase() ||
                            "GENERAL"}
                        </span>
                      </div>
                      {(() => {
                        const qty = selectedStockModal.qty || 0;
                        return (
                          <span
                            className={`stock-qty-badge ${
                              qty === 0
                                ? "zero-stock"
                                : qty < 5
                                ? "low-stock"
                                : "in-stock"
                            }`}
                          >
                            {qty === 0
                              ? "0 Units (Out of Stock)"
                              : qty < 5
                              ? `${qty} Units (Low Stock)`
                              : `${qty} Units in Stock`}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="stock-modal-item-name-text">
                      {selectedStockModal.itemName?.toUpperCase()}
                    </div>
                  </div>

                  {/* 2x2 Details Grid */}
                  <div className="stock-modal-grid">
                    <div className="stock-modal-card">
                      <span className="stock-modal-card-label">
                        <Tag size={13} color="#059669" />
                        Item ID
                      </span>
                      <span className="stock-modal-card-value">
                        {selectedStockModal.stockId || "N/A"}
                      </span>
                    </div>

                    <div className="stock-modal-card">
                      <span className="stock-modal-card-label">
                        <Package size={13} color="#059669" />
                        Category
                      </span>
                      <span className="stock-modal-card-value">
                        {selectedStockModal.category?.toUpperCase() ||
                          "GENERAL"}
                      </span>
                    </div>

                    <div className="stock-modal-card">
                      <span className="stock-modal-card-label">
                        <Layers size={13} color="#059669" />
                        Current Quantity
                      </span>
                      <span className="stock-modal-card-value">
                        {selectedStockModal.qty || 0} Units
                      </span>
                    </div>

                    <div className="stock-modal-card">
                      <span className="stock-modal-card-label">
                        <Building2 size={13} color="#059669" />
                        Branch Store
                      </span>
                      <span className="stock-modal-card-value">
                        {selectedStockModal.branchName || branchName}
                      </span>
                    </div>
                  </div>

                  {/* Pricing & Rates Section */}
                  <div className="stock-modal-pricing-section">
                    <h4 className="stock-modal-section-title">
                      <IndianRupee size={15} />
                      <span>Pricing & Page Rates</span>
                    </h4>

                    {selectedStockModal.pageRanges &&
                    selectedStockModal.pageRanges.length > 0 ? (
                      <div>
                        <table className="stock-modal-pricing-table">
                          <thead>
                            <tr>
                              <th style={{ width: "45px" }}>#</th>
                              <th>Page Range</th>
                              <th style={{ textAlign: "right" }}>
                                Unit Price (₹)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedStockModal.pageRanges.map(
                              (range, rIdx) => (
                                <tr key={rIdx}>
                                  <td
                                    style={{
                                      color: "#64748b",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {rIdx + 1}
                                  </td>
                                  <td style={{ fontWeight: "600" }}>
                                    {range.range || "Standard"}
                                  </td>
                                  <td
                                    style={{
                                      textAlign: "right",
                                      fontWeight: "700",
                                      color: "#059669",
                                      fontSize: "14px",
                                    }}
                                  >
                                    {formatCurrency(range.price)}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          background: "#f0fdf4",
                          borderRadius: "8px",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13.5px",
                            fontWeight: 600,
                            color: "#166534",
                          }}
                        >
                          Standard Page Rate
                        </span>
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: 800,
                            color: "#059669",
                          }}
                        >
                          {formatCurrency(selectedStockModal.amount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description note if available */}
                  {selectedStockModal.description && (
                    <div className="stock-modal-card">
                      <span className="stock-modal-card-label">
                        Description / Notes
                      </span>
                      <span
                        className="stock-modal-card-value"
                        style={{
                          fontSize: "13px",
                          color: "#475569",
                          fontWeight: 500,
                        }}
                      >
                        {selectedStockModal.description}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                /* ================= EDIT MODE ================= */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveModalEdit();
                  }}
                  id="stock-modal-form"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div className="stock-modal-form-grid">
                    <div className="stock-modal-field">
                      <label className="stock-modal-label">
                        <Tag size={13} color="#059669" />
                        <span>Item ID</span>
                      </label>
                      <input
                        type="text"
                        value={modalFormData.stockId}
                        onChange={(e) =>
                          handleModalInputChange(
                            "stockId",
                            e.target.value.toUpperCase()
                          )
                        }
                        className="stock-modal-input"
                        placeholder="e.g. PS85"
                      />
                    </div>

                    <div className="stock-modal-field">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "2px",
                        }}
                      >
                        <label className="stock-modal-label">
                          <Package size={13} color="#059669" />
                          <span>Category</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsCustomCategory((prev) => !prev)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#059669",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: 0,
                            textDecoration: "underline",
                          }}
                        >
                          {isCustomCategory
                            ? "Select from list"
                            : "+ New Category"}
                        </button>
                      </div>
                      {isCustomCategory ? (
                        <input
                          type="text"
                          value={modalFormData.category}
                          onChange={(e) =>
                            handleModalInputChange(
                              "category",
                              e.target.value.toUpperCase()
                            )
                          }
                          className="stock-modal-input"
                          placeholder="ENTER CATEGORY NAME"
                          autoFocus
                        />
                      ) : (
                        <select
                          value={(modalFormData.category || "").toUpperCase()}
                          onChange={(e) => {
                            if (e.target.value === "__NEW__") {
                              setIsCustomCategory(true);
                            } else {
                              handleModalInputChange("category", e.target.value);
                            }
                          }}
                          className="stock-modal-select"
                        >
                          <option value="">-- SELECT CATEGORY --</option>
                          {modalFormData.category &&
                            !Categories.some(
                              (cat) =>
                                cat.name.toUpperCase() ===
                                modalFormData.category.trim().toUpperCase()
                            ) && (
                              <option
                                value={modalFormData.category.trim().toUpperCase()}
                              >
                                {modalFormData.category.trim().toUpperCase()}
                              </option>
                            )}
                          {Categories.map((cat) => (
                            <option
                              key={cat.id || cat.name}
                              value={cat.name.toUpperCase()}
                            >
                              {cat.name.toUpperCase()}
                            </option>
                          ))}
                          <option value="__NEW__">+ Add Custom Category...</option>
                        </select>
                      )}
                    </div>

                    <div className="stock-modal-field full-width">
                      <label className="stock-modal-label">
                        <span>Item Name</span>
                        <span style={{ color: "#e11d48" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={modalFormData.itemName}
                        onChange={(e) =>
                          handleModalInputChange(
                            "itemName",
                            e.target.value.toUpperCase()
                          )
                        }
                        className="stock-modal-input"
                        placeholder="Enter item name..."
                        required
                      />
                    </div>

                    <div className="stock-modal-field">
                      <label className="stock-modal-label">
                        <Layers size={13} color="#059669" />
                        <span>Quantity in Stock</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={modalFormData.qty}
                        onChange={(e) =>
                          handleModalInputChange("qty", e.target.value)
                        }
                        className="stock-modal-input"
                      />
                    </div>

                    <div className="stock-modal-field">
                      <label className="stock-modal-label">
                        <Building2 size={13} color="#059669" />
                        <span>Store Branch</span>
                      </label>
                      <input
                        type="text"
                        value={modalFormData.branchName}
                        disabled
                        className="stock-modal-input"
                        style={{ background: "#f8fafc", color: "#64748b" }}
                      />
                    </div>
                  </div>

                  {/* Pricing Configuration Form */}
                  <div className="stock-modal-pricing-section">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <h4 className="stock-modal-section-title">
                        <IndianRupee size={15} />
                        <span>Pricing & Rate Configuration</span>
                      </h4>

                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          color: "#334155",
                          userSelect: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={modalFormData.hasPageRanges}
                          onChange={(e) =>
                            handleModalInputChange(
                              "hasPageRanges",
                              e.target.checked
                            )
                          }
                          style={{
                            accentColor: "#059669",
                            width: "15px",
                            height: "15px",
                            cursor: "pointer",
                          }}
                        />
                        <span>Enable Tiered Page Ranges</span>
                      </label>
                    </div>

                    {!modalFormData.hasPageRanges ? (
                      <div className="stock-modal-field">
                        <label className="stock-modal-label">
                          <span>Standard Unit Price (₹)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={modalFormData.amount}
                          onChange={(e) =>
                            handleModalInputChange("amount", e.target.value)
                          }
                          className="stock-modal-input"
                          placeholder="0.00"
                        />
                      </div>
                    ) : (
                      <div className="stock-modal-ranges-box">
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#64748b",
                          }}
                        >
                          Configure tiers and per-unit prices for page brackets:
                        </span>
                        {modalFormData.pageRanges.map((range, rIndex) => (
                          <div key={rIndex} className="stock-modal-range-row">
                            <input
                              type="text"
                              value={range.range}
                              onChange={(e) =>
                                handleModalPageRangeChange(
                                  rIndex,
                                  "range",
                                  e.target.value.toUpperCase()
                                )
                              }
                              className="stock-range-input"
                              placeholder="e.g. 1-10 Pages"
                              style={{ flex: 1.5 }}
                            />
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                flex: 1,
                              }}
                            >
                              <span
                                style={{
                                  color: "#64748b",
                                  fontWeight: 600,
                                  fontSize: "13px",
                                }}
                              >
                                ₹
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={range.price}
                                onChange={(e) =>
                                  handleModalPageRangeChange(
                                    rIndex,
                                    "price",
                                    e.target.value
                                  )
                                }
                                className="stock-range-input"
                                placeholder="Price"
                                style={{ width: "100%" }}
                              />
                            </div>
                            {modalFormData.pageRanges.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveModalPageRange(rIndex)
                                }
                                className="stock-range-del-btn"
                                title="Remove Tier"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={handleAddModalPageRange}
                          className="stock-add-range-btn"
                        >
                          <Plus size={14} />
                          <span>Add Page Range Tier</span>
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="stock-modal-footer">
              <div className="stock-modal-footer-right">
                {!isModalEditMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsModalEditMode(true)}
                      className="stock-modal-btn-primary"
                    >
                      <Pencil size={15} />
                      <span>Edit Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="stock-modal-btn-cancel"
                    >
                      <span>Close</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveModalEdit}
                      disabled={isSavingModal}
                      className="stock-modal-btn-primary"
                    >
                      <Save size={15} />
                      <span>{isSavingModal ? "Saving..." : "Save Changes"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalEditMode(false)}
                      className="stock-modal-btn-cancel"
                    >
                      <span>Cancel</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockList;
