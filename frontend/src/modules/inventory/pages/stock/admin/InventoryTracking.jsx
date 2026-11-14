import React, { useState, useEffect } from "react";
import { getInventoryMovements } from "../../../api";
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
import "../../../../../shared/styles/printzTheme.css";
import "../../../../../shared/styles/addAssets.css";
import Popup from "../../../../../shared/ui/Popup/Popup.jsx";
import { usePopup } from "../../../../../shared/hooks/usePopup";
import DataTable from "../../../../../shared/ui/DataTable/DataTable";
import CalendarSelect from "../../../../../shared/ui/selects/CalendarSelect";

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
      const res = await getInventoryMovements({
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

  // Shared column pieces for the movement tables
  const timestampColumn = {
    key: "movementDate",
    label: "Timestamp",
    align: "center",
    width: "150px",
    render: (m) => (
      <span className="add-assets-id-badge" style={{ fontSize: "11.5px" }}>
        {formatDateTime(m.movementDate)}
      </span>
    ),
  };
  const actionColumn = {
    key: "action",
    label: "Action",
    align: "center",
    width: "100px",
    render: (m) => getActionBadge(m.action),
  };
  const idColumn = (key, label) => ({
    key,
    label,
    align: "center",
    width: "130px",
    render: (m) => (
      <span className="add-assets-id-badge" style={{ fontWeight: 700, color: "#0f172a" }}>
        {m[key]}
      </span>
    ),
  });
  const nameColumn = (key, label) => ({
    key,
    label,
    render: (m) => <span style={{ fontWeight: 600, color: "#0f172a" }}>{m[key]}</span>,
  });
  const quantityColumn = {
    key: "quantity",
    label: "Quantity",
    align: "right",
    width: "100px",
    render: (m) => <span className="add-assets-qty-pill">{m.quantity}</span>,
  };
  const fromBranchColumn = {
    key: "fromBranch",
    label: "From Branch",
    width: "160px",
    render: (m) => (
      <span
        style={{
          padding: "3px 9px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600,
          background: m.fromBranch ? "#f1f5f9" : "#ecfdf5",
          color: m.fromBranch ? "#334155" : "#059669",
          border: "1px solid #e2e8f0",
          display: "inline-block",
        }}
      >
        {m.fromBranch || "NEW"}
      </span>
    ),
  };
  const toBranchColumn = {
    key: "toBranch",
    label: "To Branch",
    width: "160px",
    render: (m) => (
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
        {m.toBranch}
      </span>
    ),
  };
  const amountColumn = {
    key: "amount",
    label: "Amount",
    align: "right",
    width: "130px",
    render: (m) => (
      <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: "#0f172a" }}>
        {m.details?.pageRanges && m.details.pageRanges.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-end" }}>
            {m.details.pageRanges.map((range, idx) => (
              <span key={idx} style={{ fontSize: "11.5px", color: "#475569" }}>
                {range.range}: ₹{range.price}
              </span>
            ))}
          </div>
        ) : (
          `₹${(m.amount || 0).toLocaleString("en-IN")}`
        )}
      </span>
    ),
  };

  const movementTitle = (label, count) => (
    <>
      {label} <span style={{ color: "#059669", fontSize: "14px", fontWeight: 600 }}>({count})</span>
    </>
  );

  // One shared table for printer, stock and asset movements
  const renderMovementTable = ({ list: rawList, title, icon, columns, itemLabel }) => {
    const list = filterBySearch(rawList);
    if (list.length === 0) return null;
    return (
      <div style={{ marginTop: "14px" }}>
        <DataTable
          title={movementTitle(title, list.length)}
          icon={icon}
          columns={columns}
          data={list}
          searchable={false}
          pageSize={10}
          emptyMessage={`No ${itemLabel} found`}
        />
      </div>
    );
  };

  const renderPrinterTable = (printers, title, icon) =>
    renderMovementTable({
      list: printers,
      title,
      icon,
      itemLabel: "printer movements",
      columns: [
        timestampColumn,
        actionColumn,
        idColumn("printerId", "Printer ID"),
        nameColumn("printerName", "Printer Name"),
        fromBranchColumn,
        toBranchColumn,
      ],
    });

  const renderStockTable = (stocks) =>
    renderMovementTable({
      list: stocks,
      title: "Stock Movements",
      icon: <Boxes size={16} color="#059669" />,
      itemLabel: "stock movements",
      columns: [
        timestampColumn,
        actionColumn,
        nameColumn("itemName", "Item Name"),
        quantityColumn,
        amountColumn,
        fromBranchColumn,
        toBranchColumn,
      ],
    });

  const renderAssetTable = (assets) =>
    renderMovementTable({
      list: assets,
      title: "Asset Movements",
      icon: <Box size={16} color="#059669" />,
      itemLabel: "asset movements",
      columns: [
        timestampColumn,
        actionColumn,
        idColumn("assetId", "Asset ID"),
        nameColumn("assetName", "Asset Name"),
        quantityColumn,
        fromBranchColumn,
        toBranchColumn,
      ],
    });

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
              color: "#475569",
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
                color: "#475569",
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
