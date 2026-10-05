import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext.jsx";
import "../../styles/sales.css";
import jsPDF from "jspdf";
import "jspdf-autotable";

const SalesOrder = () => {
  const [items, setItems] = useState({ stocks: [], printers: [] });
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState("intro");
  const [generating, setGenerating] = useState(false);

  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchItems = async () => {
      if (!currentUser) {
        console.error("No authenticated user found.");
        setError("User not authenticated.");
        setLoading(false);
        return;
      }
      try {
        let branchID = currentUser.branch;
        if (!branchID) {
          const userRes = await api.get("/users/profile");
          const userData = userRes.data?.data || userRes.data;
          branchID = userData.branch;
        }

        const fetchedStocks = [];
        const fetchedPrinters = [];

        const [stocksRes, printersRes, jumboConfigsRes] = await Promise.all([
          api.get("/stocks/items", { params: { branchName: branchID } }).catch(() => ({ data: [] })),
          api.get("/printers", { params: { branchName: branchID } }).catch(() => ({ data: [] })),
          api.get("/jumbo-xerox/configurations", { params: { branchName: branchID } }).catch(() => ({ data: [] })),
        ]);

        const stocksList = stocksRes.data?.data || stocksRes.data || [];
        stocksList.forEach((data) => {
          const stockId = data.id || data._id || data.stockId;
          if (data.pageRanges && data.pageRanges.length > 0) {
            data.pageRanges.forEach((range) => {
              fetchedStocks.push({
                id: `${stockId}-${range.range}`,
                stockId: data.stockId || stockId,
                name: `${data.itemName} (${range.range})`,
                price: Number.parseFloat(range.price) || 0,
                qty: data.qty || 0,
                type: "Service",
                category: data.category,
                description: data.description,
              });
            });
          } else {
            fetchedStocks.push({
              id: stockId,
              stockId: data.stockId || stockId,
              name: data.itemName,
              price: Number.parseFloat(data.amount) || 0,
              qty: data.qty || 0,
              type: "Stock",
              category: data.category,
              description: data.description,
            });
          }
        });

        const printersList = printersRes.data?.data || printersRes.data || [];
        const jumboConfigsList = jumboConfigsRes.data?.data || jumboConfigsRes.data || [];

        for (const printerData of printersList) {
          const printerId = printerData.id || printerData._id || printerData.printerId;
          const services = [];

          if (printerData.printerType === "LFP") {
            const matchingJumbo = jumboConfigsList.filter(
              (jumboData) =>
                jumboData.printerId === printerData.printerId ||
                jumboData.branch === branchID ||
                jumboData.branchName === branchID
            );
            matchingJumbo.forEach((jumboData) => {
              services.push({
                id: jumboData.id || jumboData._id,
                name: `${jumboData.type} - ${jumboData.size}`,
                price: Number.parseFloat(jumboData.unitPrice) || 0,
                type: "LFP Service",
              });
            });
          } else if (printerData.prices && printerData.prices.length > 0) {
            printerData.prices.forEach((priceItem, index) => {
              services.push({
                id: `${printerId}-price-${index}`,
                name: priceItem.size,
                price: Number.parseFloat(priceItem.price) || 0,
                type: "Printer Service",
              });
            });
          }
          fetchedPrinters.push({
            id: printerId,
            printerId: printerData.printerId,
            printerName: printerData.printerName,
            type: printerData.printerType,
            status: printerData.isActive ? "ACTIVE" : "INACTIVE",
            services: services,
          });
        }

        setItems({ stocks: fetchedStocks, printers: fetchedPrinters });
      } catch (err) {
        console.error("Error fetching data:", err.message, err.stack);
        setError("Failed to fetch items. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [currentUser]);

  const handleAddItem = (itemToAdd) => {
    if (!itemToAdd.id || isNaN(itemToAdd.price)) {
      console.error("Invalid item to add:", itemToAdd);
      return;
    }
    setSelectedItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === itemToAdd.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === itemToAdd.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...itemToAdd, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id, newQuantity) => {
    const quantity = parseInt(newQuantity) || 0;
    if (quantity < 0) return;
    setSelectedItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (id) => {
    setSelectedItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = selectedItems.reduce((sum, item) => sum + (Number.parseFloat(item.price) * item.quantity), 0);
    const gstRate = 0.18;
    const gst = subtotal * gstRate;
    return { subtotal, gst, grandTotal: subtotal + gst };
  };

  const handleGenerateBill = async () => {
    if (selectedItems.length === 0) {
      alert("Please add at least one item to generate a bill.");
      return;
    }
    if (selectedItems.some((item) => !item.name || isNaN(item.price) || isNaN(item.quantity))) {
      console.error("Invalid item data:", JSON.stringify(selectedItems, null, 2));
      alert("Invalid item data detected. Please check selected items.");
      return;
    }

    setGenerating(true);
    try {
      console.log("Starting bill generation with items:", JSON.stringify(selectedItems, null, 2));
      const userRes = await api.get("/users/profile");
      const managerData = userRes.data?.data || userRes.data || currentUser;
      if (!managerData.branch || !managerData.name) {
        console.error("Missing manager data:", managerData);
        throw new Error("Incomplete user data.");
      }
      const branchID = managerData.branch;
      const managerName = managerData.name;
      const managerContact = managerData.phone || "N/A";
      const gstNo = "GST123456789";
      const invoiceNo = Math.random().toString(36).substr(2, 9).toUpperCase();

      const salesData = {
        branchID,
        branchName: branchID,
        managerID: currentUser.id || currentUser.uid,
        invoiceNo,
        itemsSold: selectedItems.map((item) => ({
          itemID: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalAmount: Number.parseFloat(item.price) * item.quantity,
        })),
        ...calculateTotals(),
        totalAmount: calculateTotals().grandTotal,
        date: new Date().toISOString().split("T")[0],
      };

      console.log("Saving sales data:", JSON.stringify(salesData, null, 2));
      await api.post("/general/sales", salesData);
      console.log("Sales data saved successfully");

      console.log("Initializing jsPDF...");
      const doc = new jsPDF();
      if (!doc) {
        throw new Error("Failed to initialize jsPDF.");
      }
      let yPos = 10;
      const margin = 10;
      const pageWidth = doc.internal.pageSize.getWidth();

      const drawSeparator = () => {
        doc.setFont("courier", "normal");
        doc.text("-".repeat(50), margin, yPos);
        yPos += 5;
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("COMPANY NAME / LOGO", pageWidth / 2, yPos, { align: "center" });
      yPos += 5;
      doc.setFontSize(10);
      doc.text("[Placeholder for Company Logo]", pageWidth / 2, yPos, { align: "center" });
      yPos += 5;
      drawSeparator();

      doc.setFont("helvetica", "normal");
      doc.text(`Branch: ${branchID}`, margin, yPos);
      yPos += 5;
      doc.text(`Manager: ${managerName}`, margin, yPos);
      yPos += 5;
      doc.text(`Contact: ${managerContact}`, margin, yPos);
      yPos += 5;
      doc.text(`GSTIN: ${gstNo}`, margin, yPos);
      yPos += 5;
      drawSeparator();

      const now = new Date();
      now.setHours(16, 57, 0, 0); // Set to 04:57 PM IST (UTC+5:30)
      doc.text(`Date: ${now.toLocaleDateString("en-GB")}`, margin, yPos);
      doc.text(`Time: ${now.toLocaleTimeString("en-US", { hour12: true })}`, pageWidth / 2, yPos, { align: "center" });
      doc.text(`Invoice No: ${invoiceNo}`, pageWidth - margin, yPos, { align: "right" });
      yPos += 5;
      drawSeparator();

      const tableColumn = ["Item/Service", "Qty", "Price", "Amount"];
      const tableRows = selectedItems.map((item) => [
        item.name.substring(0, 20),
        item.quantity.toString(),
        Number.parseFloat(item.price).toFixed(2),
        (Number.parseFloat(item.price) * item.quantity).toFixed(2),
      ]);

      console.log("Generating table with rows:", tableRows);
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: yPos,
        theme: "grid",
        styles: { font: "courier", fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 20, halign: "center" },
          2: { cellWidth: 30, halign: "right" },
          3: { cellWidth: 30, halign: "right" },
        },
        headStyles: { fillColor: false, textColor: [0, 0, 0], fontStyle: "bold" },
        bodyStyles: { textColor: [0, 0, 0] },
      });

      yPos = doc.lastAutoTable.finalY + 5;
      drawSeparator();

      const totals = calculateTotals();
      doc.setFont("helvetica", "normal");
      doc.text(`Subtotal: ₹${totals.subtotal.toFixed(2)}`, pageWidth - margin, yPos, { align: "right" });
      yPos += 5;
      doc.text(`GST (18%): ₹${totals.gst.toFixed(2)}`, pageWidth - margin, yPos, { align: "right" });
      yPos += 5;
      drawSeparator();
      doc.setFont("helvetica", "bold");
      doc.text(`Total: ₹${totals.grandTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: "right" });
      yPos += 5;
      drawSeparator();

      doc.setFont("helvetica", "normal");
      doc.text("Thank you for your business! Visit Again", pageWidth / 2, yPos, { align: "center" });

      console.log("Saving PDF...");
      doc.save(`invoice_${invoiceNo}.pdf`);
      console.log("PDF saved successfully");

      setSelectedItems([]);
      setCurrentPage("intro");
    } catch (err) {
      console.error("Error generating bill:", err.message, err.stack);
      alert(`Failed to generate bill: ${err.message}. Please try again.`);
    } finally {
      setGenerating(false);
    }
  };

  const renderStockTable = () => (
    <div className="pos-item-selection">
      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Stock Items</h3>
          </div>
          <button onClick={() => setCurrentPage("selection")} className="back-btn">
            Back to Selection
          </button>
        </div>
        <div className="stock-card-content">
          <div className="stock-table-wrapper">
            <table className="stock-readings-table">
              <thead>
                <tr>
                  <th>Stock ID</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Pricing</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.stocks.length > 0 ? (
                  items.stocks.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>{item.stockId}</td>
                      <td>{item.name}</td>
                      <td>{item.category || "N/A"}</td>
                      <td>{item.qty}</td>
                      <td>₹{(Number.parseFloat(item.price) || 0).toFixed(2)}</td>
                      <td>{item.description || "N/A"}</td>
                      <td>
                        <button onClick={() => handleAddItem(item)} className="add-item-btn">
                          Add
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">No stock items found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrinterServiceTable = () => (
    <div className="pos-item-selection">
      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Printer Services</h3>
          </div>
          <button onClick={() => setCurrentPage("selection")} className="back-btn">
            Back to Selection
          </button>
        </div>
        <div className="stock-card-content">
          <div className="stock-table-wrapper">
            <table className="stock-readings-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Printer ID</th>
                  <th>Printer Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Services & Pricing</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.printers.length > 0 ? (
                  items.printers.map((printer, index) => (
                    <tr key={printer.id || index}>
                      <td>{index + 1}</td>
                      <td>{printer.printerId}</td>
                      <td>{printer.printerName}</td>
                      <td>{printer.type}</td>
                      <td>{printer.status}</td>
                      <td>
                        {printer.services.length > 0 ? (
                          <ul className="service-list">
                            {printer.services.map((service, sIndex) => (
                              <li key={sIndex} className="service-item">
                                <span>{service.name}:</span>
                                <span>₹{(Number.parseFloat(service.price) || 0).toFixed(2)}</span>
                                <button onClick={() => handleAddItem(service)} className="add-service-btn">
                                  Add
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "No services configured"
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => printer.services[0] && handleAddItem(printer.services[0])}
                          className="add-printer-btn"
                          disabled={!printer.services[0]}
                        >
                          Add First Service
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">No printers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentPage) {
      case "intro":
        return (
          <div className="pos-intro-container">
            <div className="intro-card">
              <h2>Welcome to the POS System</h2>
              <p>Generate bills for your branch's stocks and printing works with ease.</p>
              <button onClick={() => setCurrentPage("selection")} className="start-button">
                Start New Order
              </button>
            </div>
          </div>
        );
      case "selection":
        return (
          <div className="pos-selection-container">
            <div className="selection-card">
              <h2>What would you like to add?</h2>
              <div className="selection-buttons">
                <button onClick={() => setCurrentPage("stockItems")} className="selection-btn">
                  Add Stock Items
                </button>
                <button onClick={() => setCurrentPage("printerServices")} className="selection-btn">
                  Add Printer Services
                </button>
              </div>
            </div>
          </div>
        );
      case "stockItems":
        return renderStockTable();
      case "printerServices":
        return renderPrinterServiceTable();
      default:
        return null;
    }
  };

  if (loading) return <div className="loading-state">Loading items...</div>;
  if (error) return <div className="error-state">{error}</div>;

  const totals = calculateTotals();

  return (
    <div className="pos-container">
      <div className="pos-main-content">
        {renderContent()}
        <div className="pos-bill-summary">
          <h3>Bill Summary</h3>
          <div className="bill-items-list">
            {selectedItems.length === 0 ? (
              <p>Start by adding items to the bill.</p>
            ) : (
              selectedItems.map((item) => (
                <div key={item.id} className="bill-item-row">
                  <span>{item.name}</span>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                    min="1"
                  />
                  <span>₹{(Number.parseFloat(item.price) || 0).toFixed(2)}</span>
                  <span>₹{((Number.parseFloat(item.price) || 0) * item.quantity).toFixed(2)}</span>
                  <button onClick={() => handleRemoveItem(item.id)}>X</button>
                </div>
              ))
            )}
          </div>
          <div className="bill-totals">
            <p>Subtotal: ₹{totals.subtotal.toFixed(2)}</p>
            <p>GST (18%): ₹{totals.gst.toFixed(2)}</p>
            <h3>Total: ₹{totals.grandTotal.toFixed(2)}</h3>
          </div>
          <div className="bill-actions">
            <button onClick={() => setSelectedItems([])} className="clear-bill-btn">
              Clear Bill
            </button>
            <button onClick={handleGenerateBill} disabled={generating} className="generate-bill-btn">
              {generating ? "Generating..." : "Generate Bill"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesOrder;
