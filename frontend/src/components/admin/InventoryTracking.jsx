import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Calendar,
  Printer,
  Boxes,
  Box,
  Layers,
  ArrowRight,
  ArrowRightLeft,
  Copy,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileText,
  Activity,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import "../../styles/printzTheme.css";
import "../../styles/addAssets.css";
import Popup from "../common/Popup.jsx";
import { usePopup } from "../../hooks/usePopup";
import Pagination from "../common/Pagination";
import CalendarSelect from "../common/CalendarSelect";

const InventoryTracking = () => {
  const { popup, showSuccess, showError, showInfo } = usePopup();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [movements, setMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [movementSearch, setMovementSearch] = useState("");
  const [filteredMovements, setFilteredMovements] = useState({
    smallPrinters: [],
    largePrinters: [],
    stocks: [],
    assets: [],
  });
  const [currentStockPage, setCurrentStockPage] = useState(1);
  const [stocksPerPage, setStocksPerPage] = useState(10);

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "";
    try {
      const [year, month, day] = dateString.split("-");
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchMovements();
    }
  }, [selectedDate]);

  const fetchMovements = async () => {
    if (!selectedDate) return;

    setIsLoading(true);
    try {
      const res = await api.get("/general/inventory-movements", {
        params: { date: selectedDate },
      });
      const movementsData = (res.data?.data || []).map((doc) => ({
        id: doc._id || doc.id,
        ...doc,
      }));

      setMovements(movementsData);
      categorizeMovements(movementsData);

      if (movementsData.length > 0) {
        showSuccess(
          `Successfully loaded ${movementsData.length} inventory movements for ${formatDisplayDate(selectedDate)}`
        );
      } else {
        showInfo(`No inventory movements recorded on ${formatDisplayDate(selectedDate)}`);
      }
    } catch (error) {
      showError(`Failed to fetch inventory movements: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const categorizeMovements = (movementsData) => {
    const categorized = {
      smallPrinters: [],
      largePrinters: [],
      stocks: [],
      assets: [],
    };

    movementsData.forEach((movement) => {
      switch (movement.type) {
        case "printer":
          if (movement.printerType === "SFP" || movement.printerType === "MFP") {
            categorized.smallPrinters.push(movement);
          } else if (movement.printerType === "LFP") {
            categorized.largePrinters.push(movement);
          }
          break;
        case "stock":
          categorized.stocks.push(movement);
          break;
        case "asset":
          categorized.assets.push(movement);
          break;
        default:
          break;
      }
    });

    setFilteredMovements(categorized);
  };

  const filterBySearch = (list) => {
    if (!movementSearch.trim()) return list;
    const q = movementSearch.toLowerCase().trim();
    return list.filter((m) => {
      return (
        (m.printerName || "").toLowerCase().includes(q) ||
        (m.printerId || "").toLowerCase().includes(q) ||
        (m.itemName || "").toLowerCase().includes(q) ||
        (m.assetName || "").toLowerCase().includes(q) ||
        (m.assetId || "").toLowerCase().includes(q) ||
        (m.fromBranch || "").toLowerCase().includes(q) ||
        (m.toBranch || "").toLowerCase().includes(q) ||
        (m.action || "").toLowerCase().includes(q)
      );
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "N/A";
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionBadge = (action) => {
    switch (action) {
      case "move":
        return (
          <span className="add-assets-pill-success">
            <ArrowRightLeft size={11} /> Move
          </span>
        );
      case "clone":
        return (
          <span className="add-assets-pill-info">
            <Copy size={11} /> Clone
          </span>
        );
      case "add":
        return (
          <span
            style={{
              background: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0",
              fontSize: "11.5px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "9999px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Plus size={11} /> Add
          </span>
        );
      case "update":
        return (
          <span
            style={{
              background: "#faf5ff",
              color: "#7e22ce",
              border: "1px solid #e9d5ff",
              fontSize: "11.5px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "9999px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <RefreshCw size={11} /> Update
          </span>
        );
      default:
        return (
          <span className="add-assets-id-badge">
            {action || "Other"}
          </span>
        );
    }
  };

  // Printer tables renderer
  const renderPrinterTable = (printers, title, icon) => {
    const list = filterBySearch(printers);
    if (list.length === 0) return null;

    return (
      <div className="add-assets-card" style={{ marginTop: "14px" }}>
        <div className="add-assets-card-header" style={{ padding: "12px 18px" }}>
          <div className="add-assets-card-header-left">
            <div className="add-assets-card-icon" style={{ width: "32px", height: "32px" }}>
              {icon}
            </div>
            <div>
              <h3 className="add-assets-card-title" style={{ fontSize: "16px", fontWeight: 700 }}>
                {title} <span style={{ color: "#059669", fontSize: "14px", fontWeight: 600 }}>({list.length})</span>
              </h3>
            </div>
          </div>
        </div>

        <div className="add-assets-table-wrap">
          <table className="add-assets-table balance-directory-table">
            <thead>
              <tr>
                <th style={{ width: "150px", textAlign: "center" }}>Timestamp</th>
                <th style={{ width: "100px", textAlign: "center" }}>Action</th>
                <th style={{ width: "130px", textAlign: "center" }}>Printer ID</th>
                <th style={{ minWidth: "180px", textAlign: "left" }}>Printer Name</th>
                <th style={{ width: "160px", textAlign: "left" }}>From Branch</th>
                <th style={{ width: "160px", textAlign: "left" }}>To Branch</th>
              </tr>
            </thead>
            <tbody>
              {list.map((movement, index) => (
                <tr key={index}>
                  <td style={{ textAlign: "center" }}>
                    <span className="add-assets-id-badge" style={{ fontSize: "11.5px" }}>
                      {formatDateTime(movement.movementDate)}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>{getActionBadge(movement.action)}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className="add-assets-id-badge" style={{ fontWeight: 700, color: "#0f172a" }}>
                      {movement.printerId}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "#0f172a" }}>
                    {movement.printerName}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "3px 9px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: movement.fromBranch ? "#f1f5f9" : "#ecfdf5",
                        color: movement.fromBranch ? "#334155" : "#059669",
                        border: "1px solid #e2e8f0",
                        display: "inline-block",
                      }}
                    >
                      {movement.fromBranch || "NEW"}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: 600,
                        color: "#059669",
                        fontSize: "13px",
                      }}
                    >
                      <ArrowRight size={13} />
                      {movement.toBranch}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Stocks table renderer
  const renderStockTable = (stocks) => {
    const list = filterBySearch(stocks);
    if (list.length === 0) return null;

    const totalStockPages = Math.ceil(list.length / stocksPerPage);
    const indexOfLastStock = currentStockPage * stocksPerPage;
    const indexOfFirstStock = indexOfLastStock - stocksPerPage;
    const currentStocks = list.slice(indexOfFirstStock, indexOfLastStock);

    return (
      <div className="add-assets-card" style={{ marginTop: "14px" }}>
        <div className="add-assets-card-header" style={{ padding: "12px 18px" }}>
          <div className="add-assets-card-header-left">
            <div className="add-assets-card-icon" style={{ width: "32px", height: "32px" }}>
              <Boxes size={16} color="#059669" />
            </div>
            <div>
              <h3 className="add-assets-card-title" style={{ fontSize: "16px", fontWeight: 700 }}>
                Stock Movements <span style={{ color: "#059669", fontSize: "14px", fontWeight: 600 }}>({list.length})</span>
              </h3>
            </div>
          </div>
        </div>

        <div className="add-assets-table-wrap">
          <table className="add-assets-table balance-directory-table">
            <thead>
              <tr>
                <th style={{ width: "150px", textAlign: "center" }}>Timestamp</th>
                <th style={{ width: "100px", textAlign: "center" }}>Action</th>
                <th style={{ minWidth: "180px", textAlign: "left" }}>Item Name</th>
                <th style={{ width: "100px", textAlign: "right" }}>Quantity</th>
                <th style={{ width: "130px", textAlign: "right" }}>Amount</th>
                <th style={{ width: "150px", textAlign: "left" }}>From Branch</th>
                <th style={{ width: "150px", textAlign: "left" }}>To Branch</th>
              </tr>
            </thead>
            <tbody>
              {currentStocks.map((movement, index) => (
                <tr key={index}>
                  <td style={{ textAlign: "center" }}>
                    <span className="add-assets-id-badge" style={{ fontSize: "11.5px" }}>
                      {formatDateTime(movement.movementDate)}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>{getActionBadge(movement.action)}</td>
                  <td style={{ fontWeight: 600, color: "#0f172a" }}>
                    {movement.itemName}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span className="add-assets-qty-pill">
                      {movement.quantity}
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {movement.details?.pageRanges &&
                    movement.details.pageRanges.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-end" }}>
                        {movement.details.pageRanges.map((range, idx) => (
                          <span key={idx} style={{ fontSize: "11.5px", color: "#475569" }}>
                            {range.range}: ₹{range.price}
                          </span>
                        ))}
                      </div>
                    ) : (
                      `₹${(movement.amount || 0).toLocaleString("en-IN")}`
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "3px 9px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: movement.fromBranch ? "#f1f5f9" : "#ecfdf5",
                        color: movement.fromBranch ? "#334155" : "#059669",
                        border: "1px solid #e2e8f0",
                        display: "inline-block",
                      }}
                    >
                      {movement.fromBranch || "NEW"}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: 600,
                        color: "#059669",
                        fontSize: "13px",
                      }}
                    >
                      <ArrowRight size={13} />
                      {movement.toBranch}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Standard Pagination */}
        <Pagination
          currentPage={currentStockPage}
          totalItems={list.length}
          itemsPerPage={stocksPerPage}
          onPageChange={setCurrentStockPage}
          onItemsPerPageChange={setStocksPerPage}
          pageSizeOptions={[10, 20, 50, 100]}
          itemLabel="stocks"
        />
      </div>
    );
  };

  // Assets table renderer
  const renderAssetTable = (assets) => {
    const list = filterBySearch(assets);
    if (list.length === 0) return null;

    return (
      <div className="add-assets-card" style={{ marginTop: "14px" }}>
        <div className="add-assets-card-header" style={{ padding: "12px 18px" }}>
          <div className="add-assets-card-header-left">
            <div className="add-assets-card-icon" style={{ width: "32px", height: "32px" }}>
              <Box size={16} color="#059669" />
            </div>
            <div>
              <h3 className="add-assets-card-title" style={{ fontSize: "16px", fontWeight: 700 }}>
                Asset Movements <span style={{ color: "#059669", fontSize: "14px", fontWeight: 600 }}>({list.length})</span>
              </h3>
            </div>
          </div>
        </div>

        <div className="add-assets-table-wrap">
          <table className="add-assets-table balance-directory-table">
            <thead>
              <tr>
                <th style={{ width: "150px", textAlign: "center" }}>Timestamp</th>
                <th style={{ width: "100px", textAlign: "center" }}>Action</th>
                <th style={{ width: "130px", textAlign: "center" }}>Asset ID</th>
                <th style={{ minWidth: "180px", textAlign: "left" }}>Asset Name</th>
                <th style={{ width: "100px", textAlign: "right" }}>Quantity</th>
                <th style={{ width: "150px", textAlign: "left" }}>From Branch</th>
                <th style={{ width: "150px", textAlign: "left" }}>To Branch</th>
              </tr>
            </thead>
            <tbody>
              {list.map((movement, index) => (
                <tr key={index}>
                  <td style={{ textAlign: "center" }}>
                    <span className="add-assets-id-badge" style={{ fontSize: "11.5px" }}>
                      {formatDateTime(movement.movementDate)}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>{getActionBadge(movement.action)}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className="add-assets-id-badge" style={{ fontWeight: 700, color: "#0f172a" }}>
                      {movement.assetId}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "#0f172a" }}>
                    {movement.assetName}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span className="add-assets-qty-pill">
                      {movement.quantity}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "3px 9px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: movement.fromBranch ? "#f1f5f9" : "#ecfdf5",
                        color: movement.fromBranch ? "#334155" : "#059669",
                        border: "1px solid #e2e8f0",
                        display: "inline-block",
                      }}
                    >
                      {movement.fromBranch || "NEW"}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: 600,
                        color: "#059669",
                        fontSize: "13px",
                      }}
                    >
                      <ArrowRight size={13} />
                      {movement.toBranch}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="add-assets-page-container">
      <Popup {...popup} />

      {/* Header Banner - Clean emerald design */}
      <div
        className="printz-header-banner-full"
        style={{
          width: "100%",
          background:
            "linear-gradient(90deg, #E8FAF2 0%, #F0FFF9 50%, #E8FAF2 100%)",
          border: "1px solid #dcfce7",
          borderRadius: "16px",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
          flexWrap: "wrap",
        }}
      >
        <div className="printz-header-title-area" style={{ flexShrink: 0 }}>
          <h1
            style={{
              margin: "0 0 4px 0",
              fontSize: "24px",
              fontWeight: 700,
              color: "#111827",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Inventory{" "}
            <span className="highlight" style={{ color: "#059669" }}>
              Tracking
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Track and audit equipment and inventory movements across all branches.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #a7f3d0",
              padding: "7px 14px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12.5px",
              fontWeight: 600,
              color: "#065f46",
              boxShadow: "0 1px 3px rgba(5, 150, 105, 0.08)",
            }}
          >
            <Activity size={15} color="#059669" />
            <span>{movements.length} Total Movements Recorded</span>
          </div>
        </div>
      </div>

      {/* Control & Date Bar - Compact, clean & professional */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "10px 18px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={15} color="#059669" />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
              Movement Date:
            </span>
          </div>

          {/* Compact Calendar Select */}
          <div style={{ minWidth: "170px" }}>
            <CalendarSelect
              selected={selectedDate}
              onChange={(d, formattedStr) => setSelectedDate(formattedStr || "")}
              placeholder="Select date"
            />
          </div>

          {/* Quick Presets */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="add-assets-btn-secondary"
              style={{
                height: "36px",
                padding: "0 12px",
                fontSize: "12px",
                background: selectedDate === todayStr ? "#ecfdf5" : "#ffffff",
                borderColor: selectedDate === todayStr ? "#a7f3d0" : "#e2e8f0",
                color: selectedDate === todayStr ? "#047857" : "#334155",
                fontWeight: selectedDate === todayStr ? 700 : 500,
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(yesterdayStr)}
              className="add-assets-btn-secondary"
              style={{
                height: "36px",
                padding: "0 12px",
                fontSize: "12px",
                background: selectedDate === yesterdayStr ? "#ecfdf5" : "#ffffff",
                borderColor: selectedDate === yesterdayStr ? "#a7f3d0" : "#e2e8f0",
                color: selectedDate === yesterdayStr ? "#047857" : "#334155",
                fontWeight: selectedDate === yesterdayStr ? 700 : 500,
              }}
            >
              Yesterday
            </button>
          </div>

          {/* Optional Search if movements exist */}
          {movements.length > 0 && (
            <div style={{ minWidth: "180px", maxWidth: "300px" }}>
              <div className="add-assets-input-wrap" style={{ height: "36px", position: "relative" }}>
                <Search size={14} color="#059669" className="add-assets-input-icon" />
                <input
                  type="text"
                  placeholder="Filter movements..."
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  className="add-assets-input"
                  style={{ fontSize: "12.5px", paddingRight: movementSearch ? "30px" : "10px" }}
                />
                {movementSearch && (
                  <button
                    type="button"
                    onClick={() => setMovementSearch("")}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "#e2e8f0",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#475569",
                      padding: 0,
                    }}
                    title="Clear filter"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Refresh button placed at the far right ("right last") */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <button
            type="button"
            onClick={fetchMovements}
            disabled={isLoading}
            className="add-assets-btn-secondary"
            style={{ height: "36px", padding: "0 14px", fontSize: "12.5px", gap: "6px" }}
            title="Refresh movements"
          >
            <RefreshCw
              size={13}
              style={{
                animation: isLoading ? "addAssetsSpin 0.8s linear infinite" : "none",
              }}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards - Compact, neat size, professional */}
      {selectedDate && (
        <div className="inventory-metrics-grid">
          {/* Card 1: Standard Printers */}
          <div className="inventory-metric-card">
            <div
              className="inventory-metric-icon"
              style={{
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                color: "#059669",
              }}
            >
              <Printer size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="inventory-metric-label">Standard Printers</div>
              <div className="inventory-metric-value">
                {filteredMovements.smallPrinters.length}
              </div>
            </div>
          </div>

          {/* Card 2: Large Format */}
          <div className="inventory-metric-card">
            <div
              className="inventory-metric-icon"
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#2563eb",
              }}
            >
              <Printer size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="inventory-metric-label">Large Format (LFP)</div>
              <div className="inventory-metric-value">
                {filteredMovements.largePrinters.length}
              </div>
            </div>
          </div>

          {/* Card 3: Stocks */}
          <div className="inventory-metric-card">
            <div
              className="inventory-metric-icon"
              style={{
                background: "#fef3c7",
                border: "1px solid #fde68a",
                color: "#d97706",
              }}
            >
              <Boxes size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="inventory-metric-label">Stock Items</div>
              <div className="inventory-metric-value">
                {filteredMovements.stocks.length}
              </div>
            </div>
          </div>

          {/* Card 4: Assets */}
          <div className="inventory-metric-card">
            <div
              className="inventory-metric-icon"
              style={{
                background: "#faf5ff",
                border: "1px solid #e9d5ff",
                color: "#7e22ce",
              }}
            >
              <Box size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="inventory-metric-label">Branch Assets</div>
              <div className="inventory-metric-value">
                {filteredMovements.assets.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movement Details Tables */}
      <div>
        {isLoading ? (
          <div
            className="add-assets-card"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "42px 20px",
              gap: "10px",
              color: "#64748b",
            }}
          >
            <div className="add-assets-spinner"></div>
            <p style={{ margin: 0, fontSize: "13px" }}>Loading movements for {formatDisplayDate(selectedDate)}...</p>
          </div>
        ) : movements.length === 0 ? (
          <div
            className="add-assets-card"
            style={{
              padding: "36px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#f0fdf4",
                border: "1px solid #dcfce7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#059669",
                marginBottom: "4px",
              }}
            >
              <Calendar size={22} />
            </div>
            <h4
              style={{
                margin: "4px 0 2px 0",
                fontSize: "16px",
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              No movements on {formatDisplayDate(selectedDate)}
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                color: "#64748b",
                maxWidth: "420px",
              }}
            >
              There are no equipment, printer, or stock movements logged for this calendar date.
            </p>
            {selectedDate !== todayStr && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="add-assets-btn-secondary"
                style={{ marginTop: "8px", fontSize: "12.5px", height: "34px" }}
              >
                <Calendar size={13} color="#059669" />
                <span>Switch to Today</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {renderPrinterTable(
              filteredMovements.smallPrinters,
              "Standard Printers",
              <Printer size={16} color="#059669" />
            )}
            {renderPrinterTable(
              filteredMovements.largePrinters,
              "Large Format Printing (LFP)",
              <Printer size={16} color="#059669" />
            )}
            {renderStockTable(filteredMovements.stocks)}
            {renderAssetTable(filteredMovements.assets)}
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryTracking;
