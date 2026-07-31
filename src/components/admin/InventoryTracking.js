import { useState, useEffect } from "react";
import { db } from "../../services/authservice";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import {
  FaSearch,
  FaExchangeAlt,
  FaCopy,
  FaArrowRight,
} from "react-icons/fa";
import { MdInventory, MdPrint, MdStorage, MdDevices , } from "react-icons/md";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/inventoryTracking.css";
import Popup from "../common/Popup";
import { usePopup } from "../../hooks/usePopup";

import {
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
} from "react-icons/fa"

const InventoryTracking = () => {
  const { popup, showSuccess, showError, showInfo } = usePopup();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [movements, setMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filteredMovements, setFilteredMovements] = useState({
    smallPrinters: [],
    largePrinters: [],
    stocks: [],
    assets: [],
  });
  const [currentStockPage, setCurrentStockPage] = useState(1);
  const stocksPerPage = 10;

  useEffect(() => {
    if (selectedDate) {
      fetchMovements();
    }
  }, [selectedDate]);

  const fetchMovements = async () => {
    if (!selectedDate) return;

    setIsLoading(true);
    try {
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const movementsRef = collection(db, "inventoryMovements");
      const q = query(
        movementsRef,
        where("movementDate", ">=", startDate),
        where("movementDate", "<=", endDate),
        orderBy("movementDate", "desc")
      );

      const querySnapshot = await getDocs(q);
      const movementsData = [];

      querySnapshot.forEach((doc) => {
        movementsData.push({ id: doc.id, ...doc.data() });
      });

      setMovements(movementsData);
      categorizeMovements(movementsData);
      
      if (movementsData.length > 0) {
        showSuccess("Movements Loaded", `Successfully loaded ${movementsData.length} inventory movements for ${selectedDate}`);
      } else {
        showInfo("No Movements Found", `No inventory movements found for ${selectedDate}`);
      }
    } catch (error) {
      showError("Error Loading Movements", `Failed to fetch inventory movements: ${error.message}. Please try again.`);
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

  const formatDateTime = (date) => {
    if (!date) return "N/A";
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionBadge = (action) => {
    let badgeClass, icon;
    
    switch(action) {
      case "move":
        badgeClass = "action-move";
        icon = <FaExchangeAlt />;
        break;
      case "clone":
        badgeClass = "action-clone";
        icon = <FaCopy />;
        break;
      case "add":
        badgeClass = "action-add";
        icon = <FaCopy />; // You can change this to a plus icon if available
        break;
      case "update":
        badgeClass = "action-update";
        icon = <FaExchangeAlt />;
        break;
      default:
        badgeClass = "action-other";
        icon = <FaCopy />;
    }
    
    return (
      <span className={`action-badge ${badgeClass}`}>
        {icon} {action.toUpperCase()}
      </span>
    );
  };

  const renderPrinterTable = (printers, title, icon) => {
    if (printers.length === 0) return null;

    return (
      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>
              {title} ({printers.length})
            </h3>
          </div>
        </div>
        <div className="stock-card-content">
          <div className="stock-table-wrapper">
            <table className="stock-readings-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Printer ID</th>
                  <th>Printer Name</th>
                  <th>From Branch</th>
                  <th>To Branch</th>
                </tr>
              </thead>
              <tbody>
                {printers.map((movement, index) => (
                  <tr key={index}>
                    <td>{formatDateTime(movement.movementDate)}</td>
                    <td>{getActionBadge(movement.action)}</td>
                    <td>
                      <span className="printer-id-badge">
                        {movement.printerId}
                      </span>
                    </td>
                    <td>{movement.printerName}</td>
                    <td>
                      <span className={`branch-badge ${movement.fromBranch ? 'from-branch' : 'new-item'}`}>
                        {movement.fromBranch || 'NEW'}
                      </span>
                    </td>
                    <td>
                      <span className="branch-badge to-branch">
                        <FaArrowRight className="arrow-icon" />
                        {movement.toBranch}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const indexOfLastStock = currentStockPage * stocksPerPage;
  const indexOfFirstStock = indexOfLastStock - stocksPerPage;
  const currentStocks = filteredMovements.stocks.slice(
    indexOfFirstStock,
    indexOfLastStock
  );

  const totalStockPages = Math.ceil(
    filteredMovements.stocks.length / stocksPerPage
  );

  const nextStockPage = () => {
    if (currentStockPage < totalStockPages) {
      setCurrentStockPage(currentStockPage + 1);
    }
  };

  const previousStockPage = () => {
    if (currentStockPage > 1) {
      setCurrentStockPage(currentStockPage - 1);
    }
  };

  const renderStockTable = (stocks) => {
    if (stocks.length === 0) return null;

    return (
      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Stocks ({filteredMovements.stocks.length})</h3>
          </div>
        </div>
        <div className="stock-card-content">
          <div className="stock-table-wrapper">
            <table className="stock-readings-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                  <th>From Branch</th>
                  <th>To Branch</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((movement, index) => (
                  <tr key={index}>
                    <td>{formatDateTime(movement.movementDate)}</td>
                    <td>{getActionBadge(movement.action)}</td>
                    <td>{movement.itemName}</td>
                    <td>
                      <span className="qty-badge">{movement.quantity}</span>
                    </td>
                    <td>
                      {movement.details?.pageRanges && movement.details.pageRanges.length > 0 ? (
                        <div className="page-ranges-display">
                          {movement.details.pageRanges.map((range, idx) => (
                            <div key={idx} className="page-range-item">
                              <small>{range.range}: ₹{range.price}</small>
                            </div>
                          ))}
                        </div>
                      ) : (
                        `₹${movement.amount || 0}`
                      )}
                    </td>
                    <td>
                      <span className={`branch-badge ${movement.fromBranch ? 'from-branch' : 'new-item'}`}>
                        {movement.fromBranch || 'NEW'}
                      </span>
                    </td>
                    <td>
                      <span className="branch-badge to-branch">
                        <FaArrowRight className="arrow-icon" />
                        {movement.toBranch}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredMovements.stocks.length > stocksPerPage && (
            <div className="stock-pagination">
              <button
                onClick={previousStockPage}
                disabled={currentStockPage === 1}
                className="stock-pagination-button"
              >
                <FaRegArrowAltCircleLeft />
              </button>
              <span className="stock-page-info">
                Page {currentStockPage} of {totalStockPages}
              </span>
              <button
                onClick={nextStockPage}
                disabled={currentStockPage === totalStockPages}
                className="stock-pagination-button"
              >
                <FaRegArrowAltCircleRight />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAssetTable = (assets) => {
    if (assets.length === 0) return null;

    return (
      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Assets ({assets.length})</h3>
          </div>
        </div>
        <div className="stock-card-content">
          <div className="stock-table-wrapper">
            <table className="stock-readings-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Asset ID</th>
                  <th>Asset Name</th>
                  <th>Quantity</th>
                  <th>From Branch</th>
                  <th>To Branch</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((movement, index) => (
                  <tr key={index}>
                    <td>{formatDateTime(movement.movementDate)}</td>
                    <td>{getActionBadge(movement.action)}</td>
                    <td>
                      <span className="asset-id-badge">{movement.assetId}</span>
                    </td>
                    <td>{movement.assetName}</td>
                    <td>
                      <span className="qty-badge">{movement.quantity}</span>
                    </td>
                    <td>
                      <span className={`branch-badge ${movement.fromBranch ? 'from-branch' : 'new-item'}`}>
                        {movement.fromBranch || 'NEW'}
                      </span>
                    </td>
                    <td>
                      <span className="branch-badge to-branch">
                        <FaArrowRight className="arrow-icon" />
                        {movement.toBranch}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Loading inventory movements...</p>
      </div>
    );
  }

  return (
    <div className="stock-readings-container">
      <Popup {...popup} />

      {}
      <div className="stock-page-header">
        <h2>Inventory Tracking</h2>
        <p>Track all inventory movements across branches</p>
      </div>

      {}
      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Select Date</h3>
          </div>
        </div>
        <div className="stock-card-content">
          <div className="stock-date-picker-container">
            <div className="stock-date-picker-wrapper">
              <label>Movement Date *</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="stock-select-input"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {}
      {selectedDate && (
        <div className="inventory-summary">
          <div className="summary-card">
            <div className="summary-icon small-printer">
              <MdPrint />
            </div>
            <div className="summary-content">
              <h4>Printers</h4>
              <span className="summary-count">
                {filteredMovements.smallPrinters.length}
              </span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon large-printer">
              <MdPrint />
            </div>
            <div className="summary-content">
              <h4>large format printing</h4>
              <span className="summary-count">
                {filteredMovements.largePrinters.length}
              </span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon stock">
              <MdStorage />
            </div>
            <div className="summary-content">
              <h4>Stocks</h4>
              <span className="summary-count">
                {filteredMovements.stocks.length}
              </span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon asset">
              <MdDevices />
            </div>
            <div className="summary-content">
              <h4>Assets</h4>
              <span className="summary-count">
                {filteredMovements.assets.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {}
      {selectedDate && movements.length === 0 && !isLoading && (
        <div className="stock-card">
          <div className="stock-card-content">
            <div className="no-data-message">
              <MdInventory size={48} />
              <h3>No movements found</h3>
              <p>No inventory movements were recorded for {selectedDate}</p>
            </div>
          </div>
        </div>
      )}

      {}
      {renderPrinterTable(
        filteredMovements.smallPrinters,
        "Printers",
        <MdPrint />
      )}

      {}
      {renderPrinterTable(
        filteredMovements.largePrinters,
        "large format printing",
        <MdPrint />
      )}

      {}
      {renderStockTable(currentStocks)}

      {}
      {renderAssetTable(filteredMovements.assets)}
    </div>
  );
};

export default InventoryTracking;
