import React, { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import {
  Building2,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  Search,
  Package,
  Layers,
  Edit3,
  Copy,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  PackageSearch,
} from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/printzTheme.css";
import "../../styles/movestock.css";
import { usePopup } from "../../hooks/usePopup";
import Popup from "../common/Popup";
import BranchSelect from "../common/BranchSelect.jsx";
import Pagination from "../common/Pagination";

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

const MoveStock = () => {
  const [branchName, setBranchName] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [userId, setUserId] = useState("");
  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [toLocation, setToLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [showQuantitySelection, setShowQuantitySelection] = useState(false);
  const [itemQuantities, setItemQuantities] = useState({});
  const { popup, showSuccess, showError } = usePopup();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await api.get("/branches");
        const branchesData = (response.data?.data || []).map((b) => ({
          name: b.name,
          id: b._id || b.id,
        }));

        branchesData.sort((a, b) => a.name.localeCompare(b.name));
        setBranches(branchesData);
      } catch (error) {
        showError("Error fetching branches: " + error.message);
      }
    };

    fetchBranches();
  }, [showError]);

  useEffect(() => {
    if (!branchName) {
      setItems([]);
      setSelectedItems([]);
      setCurrentPage(1);
      return;
    }

    const fetchItems = async () => {
      try {
        const res = await api.get("/stocks/items", { params: { branchName } });
        const itemsData = (res.data?.data || []).map((itemData) => ({
          ...itemData,
          id: itemData._id || itemData.id,
        }));
        setItems(itemsData);
        setSelectedItems([]);
        setSelectAll(false);
        setShowQuantitySelection(false);
        setItemQuantities({});
        setCurrentPage(1);
      } catch (error) {
        showError("Error fetching items: " + error.message);
      }
    };

    fetchItems();
  }, [branchName, showError]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleBranchChange = (e) => {
    const selectedBranch = branches.find(
      (branch) => branch.name === e.target.value
    );
    setBranchName(e.target.value);
    setUserId(selectedBranch ? selectedBranch.id : "");
    setSelectedItems([]);
    setSelectAll(false);
    setShowQuantitySelection(false);
    setItemQuantities({});
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleDestinationBranchChange = (e) => {
    setToLocation(e.target.value);
  };

  const handleItemSelection = (item) => {
    setSelectedItems((prev) => {
      const isSelected = prev.some((selected) => selected.id === item.id);
      if (isSelected) {
        const newQuantities = { ...itemQuantities };
        delete newQuantities[item.id];
        return prev.filter((selected) => selected.id !== item.id);
      } else {
        setItemQuantities((prev) => ({
          ...prev,
          [item.id]: 1,
        }));
        return [...prev, item];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
      setItemQuantities({});
    } else {
      setSelectedItems([...filteredItems]);
      const newQuantities = {};
      filteredItems.forEach((item) => {
        newQuantities[item.id] = 1;
      });
      setItemQuantities(newQuantities);
    }
    setSelectAll(!selectAll);
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity === "" || newQuantity == null) {
      setItemQuantities((prev) => ({
        ...prev,
        [itemId]: "",
      }));
      return;
    }

    const inputQty = Number.parseInt(newQuantity, 10);

    if (isNaN(inputQty) || inputQty < 1) {
      return;
    }

    setItemQuantities((prev) => ({
      ...prev,
      [itemId]: inputQty,
    }));
  };

  const proceedToQuantitySelection = () => {
    if (selectedItems.length === 0) {
      showError("Please select at least one item first");
      return;
    }
    setShowQuantitySelection(true);
  };

  const getLatestJumboCounter = async (printerId) => {
    try {
      const res = await api.get("/jumbo-xerox/readings", {
        params: { printerId },
      });
      const readings = res.data?.data || [];
      if (readings.length > 0) {
        return readings[0].jumboCounter || null;
      }
      return null;
    } catch (error) {
      console.error("Error fetching latest jumbo counter:", error);
      return null;
    }
  };

  const handleMove = async () => {
    if (selectedItems.length === 0) {
      showError("Please select at least one item to move");
      return;
    }

    if (!toLocation) {
      showError("Please select a destination branch");
      return;
    }

    const invalidItems = [];
    const zeroStockItems = [];

    selectedItems.forEach((item) => {
      const selectedQty = itemQuantities[item.id] || 0;
      const availableQty = item.qty || 0;

      if (selectedQty <= 0) {
        invalidItems.push(`${item.itemName}: Quantity must be greater than 0`);
      } else if (availableQty === 0) {
        zeroStockItems.push(item.itemName);
      } else if (selectedQty > availableQty) {
        invalidItems.push(
          `${item.itemName}: Cannot move ${selectedQty} items (only ${availableQty} available)`
        );
      }
    });

    if (zeroStockItems.length > 0) {
      showError(
        `Cannot move items with 0 stock: ${zeroStockItems.join(
          ", "
        )}. Use clone instead for items with no available quantity.`
      );
      return;
    }

    if (invalidItems.length > 0) {
      showError(`Invalid quantities:\n${invalidItems.join("\n")}`);
      return;
    }

    setLoading(true);

    try {
      const destinationBranch = branches.find(
        (branch) => branch.name === toLocation
      );

      const destRes = await api.get("/stocks/items", {
        params: { branchName: toLocation },
      });
      const destItems = destRes.data?.data || [];

      const movePromises = selectedItems.map(async (item) => {
        const moveQuantity = itemQuantities[item.id] || 0;
        const existingItem = destItems.find((d) =>
          item.stockId
            ? d.stockId === item.stockId
            : d.itemName?.toLowerCase() === item.itemName?.toLowerCase()
        );

        if (existingItem) {
          const updatedQty = (existingItem.qty || 0) + moveQuantity;

          await api.put(`/stocks/items/${existingItem._id || existingItem.id}`, {
            qty: updatedQty,
            itemName: item.itemName,
            amount: item.amount,
            category: item.category || "",
            description: item.description || "",
            ...(item.pageRanges && { pageRanges: item.pageRanges }),
          });
        } else {
          const newItemData = {
            userId: destinationBranch ? destinationBranch.id : userId,
            branchName: toLocation,
            itemName: item.itemName,
            amount: item.amount,
            qty: moveQuantity,
            category: item.category || "",
            description: item.description || "",
            stockId: item.stockId || null,
            ...(item.pageRanges && { pageRanges: item.pageRanges }),
          };

          await api.post("/stocks/items", newItemData);
        }

        // Update or delete source item
        const remainingQty = (item.qty || 0) - moveQuantity;
        const sourceItemId = item.id || item._id;

        if (remainingQty > 0) {
          await api.put(`/stocks/items/${sourceItemId}`, {
            qty: remainingQty,
            itemName: item.itemName,
            amount: item.amount,
            category: item.category || "",
          });
        } else {
          await api.delete(`/stocks/items/${sourceItemId}`);
        }

        const currentUser = JSON.parse(localStorage.getItem("user"));
        return api.post("/general/inventory-movements", {
          type: "stock",
          action: "move",
          itemName: item.itemName,
          category: item.category || "",
          quantity: moveQuantity,
          amount: item.amount,
          fromBranch: branchName,
          toBranch: toLocation,
          movementDate: new Date(),
          performedBy: currentUser?.email || "Unknown",
          stockId: item.stockId || null,
          updatedExisting: existingItem ? true : false,
        });
      });

      await Promise.all(movePromises);

      const totalQuantity = Object.values(itemQuantities).reduce(
        (sum, qty) => sum + (Number(qty) || 0),
        0
      );
      showSuccess(
        `Successfully moved ${totalQuantity} items (${selectedItems.length} types) to ${toLocation}`
      );

      handleReset();
    } catch (error) {
      showError("Failed to move items: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async () => {
    if (selectedItems.length === 0) {
      showError("Please select at least one item to clone");
      return;
    }

    if (!toLocation) {
      showError("Please select a destination branch");
      return;
    }

    const invalidItems = [];

    selectedItems.forEach((item) => {
      const selectedQty = itemQuantities[item.id] || 0;
      const availableQty = item.qty || 0;

      if (selectedQty <= 0) {
        invalidItems.push(`${item.itemName}: Quantity must be greater than 0`);
      } else if (availableQty > 0 && selectedQty > availableQty) {
        invalidItems.push(
          `${item.itemName}: Cannot clone ${selectedQty} items (only ${availableQty} available)`
        );
      }
    });

    if (invalidItems.length > 0) {
      showError(`Invalid quantities:\n${invalidItems.join("\n")}`);
      return;
    }

    setLoading(true);

    try {
      const destinationBranch = branches.find(
        (branch) => branch.name === toLocation
      );

      const destRes = await api.get("/stocks/items", {
        params: { branchName: toLocation },
      });
      const destItems = destRes.data?.data || [];

      const existingItems = selectedItems.filter((item) =>
        destItems.some((d) =>
          item.stockId
            ? d.stockId === item.stockId
            : d.itemName?.toLowerCase() === item.itemName?.toLowerCase()
        )
      );

      if (existingItems.length > 0) {
        const existingItemNames = existingItems
          .map((item) => item.itemName)
          .join(", ");
        throw new Error(
          `Cannot clone: The following items already exist at destination branch: ${existingItemNames}. Use move instead to add quantities.`
        );
      }

      const clonePromises = selectedItems.map(async (item) => {
        const cloneQuantity = itemQuantities[item.id] || 0;
        const itemData = {
          userId: destinationBranch ? destinationBranch.id : userId,
          branchName: toLocation,
          itemName: item.itemName,
          amount: item.amount,
          qty: cloneQuantity,
          category: item.category || "",
          description: item.description || "",
          stockId: item.stockId || null,
          ...(item.pageRanges && { pageRanges: item.pageRanges }),
        };

        if (item.printerType === "large" && item.printerId) {
          const latestJumboCounter = await getLatestJumboCounter(
            item.printerId
          );

          if (latestJumboCounter) {
            itemData.lastFinalReadings = {
              jumboCounter: {
                start: latestJumboCounter.start || 0,
                end: latestJumboCounter.end || 0,
                sftPrinted: latestJumboCounter.sftPrinted || 0,
              },
            };
          }
        }

        await api.post("/stocks/items", itemData);

        const currentUser = JSON.parse(localStorage.getItem("user"));
        return api.post("/general/inventory-movements", {
          type: "stock",
          action: "clone",
          itemName: item.itemName,
          category: item.category || "",
          quantity: cloneQuantity,
          amount: item.amount,
          fromBranch: branchName,
          toBranch: toLocation,
          movementDate: new Date(),
          performedBy: currentUser?.email || "Unknown",
          stockId: item.stockId || null,
        });
      });

      await Promise.all(clonePromises);

      const totalQuantity = Object.values(itemQuantities).reduce(
        (sum, qty) => sum + (Number(qty) || 0),
        0
      );
      showSuccess(
        `Successfully cloned ${totalQuantity} items (${selectedItems.length} types) to ${toLocation}`
      );

      handleReset();
    } catch (error) {
      showError("Failed to clone items: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedItems([]);
    setToLocation("");
    setBranchName("");
    setSelectAll(false);
    setShowQuantitySelection(false);
    setItemQuantities({});
    setSearchQuery("");
    setCurrentPage(1);
  };

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.stockId &&
          item.stockId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category &&
          item.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [items, searchQuery]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

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

  const totalSelectedUnits = useMemo(() => {
    return Object.values(itemQuantities).reduce(
      (sum, qty) => sum + (Number(qty) || 0),
      0
    );
  }, [itemQuantities]);

  return (
    <div className="move-stock-page-container">
      <ToastContainer />
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
            Move & Clone{" "}
            <span className="highlight" style={{ color: "#059669" }}>
              Stock
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Transfer inventory quantities or duplicate stock items across branch
            stores.
          </p>
        </div>
      </div>

      {/* Section 1: Transfer Route Configuration Card */}
      <div className="move-stock-card">
        <div className="move-stock-card-header">
          <div className="move-stock-card-header-left">
            <div className="move-stock-card-icon">
              <ArrowLeftRight size={20} color="#059669" />
            </div>
            <div className="move-stock-card-titles">
              <h3 className="move-stock-card-title">
                Transfer Route Configuration
              </h3>
            </div>
          </div>
        </div>

        <div className="move-stock-route-grid">
          {/* Source Branch Box */}
          <div className="move-stock-branch-box">
            <div className="move-stock-box-header">
              <label className="move-stock-box-label">
                <Building2 size={15} color="#059669" />
                <span>
                  Source Branch <span className="req">*</span>
                </span>
              </label>
              {branchName && items.length > 0 && (
                <span className="move-stock-box-badge">
                  {items.length} items available
                </span>
              )}
            </div>

            <BranchSelect
              value={branchName}
              onChange={handleBranchChange}
              branches={branches}
              disabled={loading}
              placeholder="Select Source Branch"
              required
            />
          </div>

          {/* Direction Arrow */}
          <div className="move-stock-arrow-col">
            <div className="move-stock-arrow-circle">
              <ArrowRight size={18} strokeWidth={2.4} />
            </div>
          </div>

          {/* Destination Branch Box */}
          <div className="move-stock-branch-box">
            <div className="move-stock-box-header">
              <label className="move-stock-box-label">
                <Building2 size={15} color="#059669" />
                <span>
                  Destination Branch <span className="req">*</span>
                </span>
              </label>
              {toLocation && (
                <span className="move-stock-box-badge">Target Branch</span>
              )}
            </div>

            <BranchSelect
              value={toLocation}
              onChange={handleDestinationBranchChange}
              branches={branches}
              exclude={branchName}
              disabled={loading}
              placeholder="Select Destination Branch"
              required
            />
          </div>
        </div>
      </div>

      {/* Empty State: When source branch selected but has no stock items */}
      {branchName && items.length === 0 && !showQuantitySelection && (
        <div className="move-stock-empty-card">
          <PackageSearch size={48} color="#94a3b8" />
          <h4 className="move-stock-empty-title">No Stock Items Found</h4>
          <p className="move-stock-empty-desc">
            The selected branch <strong>"{branchName}"</strong> does not have
            any registered stock items to move or clone. Please select another
            branch or add inventory items first.
          </p>
        </div>
      )}

      {/* Section 2: Stock Item Selection Table (Step 1) */}
      {branchName && items.length > 0 && !showQuantitySelection && (
        <div className="move-stock-card">
          <div className="move-stock-card-header">
            <div className="move-stock-card-header-left">
              <div className="move-stock-card-icon">
                <Package size={20} color="#059669" />
              </div>
              <div className="move-stock-card-titles">
                <h3 className="move-stock-card-title">
                  Select Items to Transfer
                  <span className="move-stock-count-badge">
                    {selectedItems.length} selected of {filteredItems.length} items
                  </span>
                </h3>
                <p className="move-stock-card-sub">
                  Choose the inventory items you wish to move or clone to the
                  target branch
                </p>
              </div>
            </div>

            {selectedItems.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  className="printz-btn-primary"
                  onClick={proceedToQuantitySelection}
                >
                  <Edit3 size={15} />
                  <span>Configure Quantities ({selectedItems.length})</span>
                </button>
                <button
                  type="button"
                  className="printz-btn-reset"
                  onClick={handleReset}
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              </div>
            )}
          </div>

          {/* Toolbar: Search & Select All */}
          <div className="move-stock-toolbar">
            <div className="move-stock-search-wrap">
              <Search size={16} color="#64748b" />
              <input
                type="text"
                className="move-stock-search-input"
                placeholder="Search by item name, category, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="move-stock-clear-search"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>

            <label className="move-stock-select-all-pill">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
              />
              <span>Select All Items ({filteredItems.length})</span>
            </label>
          </div>

          {/* Stock Table */}
          <div className="move-stock-table-wrapper">
            <table className="move-stock-table">
              <thead>
                <tr>
                  <th style={{ width: "48px" }} className="center">
                    <input
                      type="checkbox"
                      className="move-stock-checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Item ID</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th className="center">Available Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length > 0 ? (
                  currentItems.map((item) => {
                    const isSelected = selectedItems.some(
                      (selected) => selected.id === item.id
                    );
                    const qty = item.qty || 0;
                    return (
                      <tr
                        key={item.id}
                        className={isSelected ? "selected" : ""}
                        onClick={() => handleItemSelection(item)}
                        style={{ cursor: "pointer" }}
                      >
                        <td
                          className="center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="move-stock-checkbox"
                            checked={isSelected}
                            onChange={() => handleItemSelection(item)}
                          />
                        </td>
                        <td>
                          <span className="move-stock-id-tag">
                            {(item.stockId || "N/A").toUpperCase()}
                          </span>
                        </td>
                        <td className="move-stock-name-cell">{item.itemName}</td>
                        <td>
                          <span className="move-stock-category-pill">
                            {item.category || "General"}
                          </span>
                        </td>
                        <td className="center">
                          <span
                            className={`move-stock-qty-pill ${
                              qty === 0
                                ? "zero-stock"
                                : qty < 5
                                ? "low-stock"
                                : "in-stock"
                            }`}
                          >
                            {qty}
                          </span>
                        </td>
                        <td className="move-stock-price-cell">
                          {item.pageRanges && item.pageRanges.length > 0
                            ? formatCurrency(item.pageRanges[0].price)
                            : formatCurrency(item.amount)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "36px 16px" }}>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                        No items found matching the selected branch or search query.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            pageSizeOptions={[10, 20, 50, 100]}
            itemLabel="items"
          />
        </div>
      )}

      {/* Section 3: Quantity Configuration (Step 2) */}
      {showQuantitySelection && selectedItems.length > 0 && (
        <div className="move-stock-card">
          <div className="move-stock-card-header">
            <div className="move-stock-card-header-left">
              <div className="move-stock-card-icon">
                <Layers size={20} color="#059669" />
              </div>
              <div className="move-stock-card-titles">
                <h3 className="move-stock-card-title">
                  Configure Transfer Quantities
                </h3>
                <p className="move-stock-card-sub">
                  Specify the exact number of units to transfer for each
                  selected item
                </p>
              </div>
            </div>

            <button
              type="button"
              className="printz-btn-reset"
              onClick={() => setShowQuantitySelection(false)}
              disabled={loading}
            >
              <ArrowLeft size={15} />
              <span>Back to Item Selection</span>
            </button>
          </div>

          {/* Quantities Table */}
          <div className="move-stock-table-wrapper">
            <table className="move-stock-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th className="center">Available Units</th>
                  <th>Transfer Quantity</th>
                  <th>Unit Price</th>
                  <th>Estimated Value</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item) => {
                  const qty = item.qty || 0;
                  const moveQty = itemQuantities[item.id] || 0;
                  const unitPrice =
                    item.pageRanges && item.pageRanges.length > 0
                      ? Number(item.pageRanges[0].price) || 0
                      : Number(item.amount) || 0;
                  const estimatedTotal = unitPrice * moveQty;

                  return (
                    <tr key={item.id}>
                      <td className="move-stock-name-cell">{item.itemName}</td>
                      <td>
                        <span className="move-stock-category-pill">
                          {item.category || "General"}
                        </span>
                      </td>
                      <td className="center">
                        <span
                          className={`move-stock-qty-pill ${
                            qty === 0
                              ? "zero-stock"
                              : qty < 5
                              ? "low-stock"
                              : "in-stock"
                          }`}
                        >
                          {qty}
                        </span>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="move-stock-qty-input-box"
                          value={itemQuantities[item.id] ?? ""}
                          onChange={(e) =>
                            handleQuantityChange(item.id, e.target.value)
                          }
                          disabled={loading}
                          placeholder="Quantity"
                        />
                      </td>
                      <td className="move-stock-price-cell">
                        {formatCurrency(unitPrice)}
                      </td>
                      <td style={{ fontWeight: 600, color: "#1e293b" }}>
                        {formatCurrency(estimatedTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Warning banner if destination not selected yet */}
          {!toLocation && (
            <div className="move-stock-notice-bar">
              <AlertCircle size={18} color="#ca8a04" />
              <span>
                Please select a <strong>Destination Branch</strong> in the
                Transfer Route card above before executing a Move or Clone
                operation.
              </span>
            </div>
          )}

          {/* Transfer Execution Actions Bar */}
          <div className="move-stock-actions-card">
            <div className="move-stock-action-stats">
              <div className="move-stock-stat-pill">
                <span className="move-stock-stat-label">Selected Types</span>
                <span className="move-stock-stat-value">
                  {selectedItems.length} items
                </span>
              </div>
              <div style={{ height: "24px", width: "1px", background: "#e2e8f0" }} />
              <div className="move-stock-stat-pill">
                <span className="move-stock-stat-label">Total Units</span>
                <span className="move-stock-stat-value" style={{ color: "#059669" }}>
                  {totalSelectedUnits} units
                </span>
              </div>
              <div style={{ height: "24px", width: "1px", background: "#e2e8f0" }} />
              <div className="move-stock-stat-pill">
                <span className="move-stock-stat-label">Destination</span>
                <span className="move-stock-stat-value">
                  {toLocation || "Not Selected"}
                </span>
              </div>
            </div>

            <div className="move-stock-buttons-group">
              {/* Move Button */}
              <button
                type="button"
                className="printz-btn-primary"
                onClick={handleMove}
                disabled={loading || selectedItems.length === 0 || !toLocation}
                style={{
                  padding: "9px 20px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  boxShadow: "0 4px 12px rgba(3, 174, 121, 0.35)",
                }}
              >
                {loading ? (
                  <span>Moving Items...</span>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Move Items ({totalSelectedUnits} Units)</span>
                  </>
                )}
              </button>

              {/* Clone Button */}
              <button
                type="button"
                className="printz-btn-clone"
                onClick={handleClone}
                disabled={loading || selectedItems.length === 0 || !toLocation}
              >
                {loading ? (
                  <span>Cloning Items...</span>
                ) : (
                  <>
                    <Copy size={15} />
                    <span>Clone Items ({totalSelectedUnits} Units)</span>
                  </>
                )}
              </button>

              {/* Reset Button */}
              <button
                type="button"
                className="printz-btn-reset"
                onClick={handleReset}
                disabled={loading}
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoveStock;
