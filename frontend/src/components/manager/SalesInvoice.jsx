import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext.jsx";
import "../../styles/sales.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const SalesInvoice = () => {
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userBranch, setUserBranch] = useState("");
  const { currentUser } = useAuth();
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    const fetchSalesHistory = async () => {
      if (!currentUser) {
        setError("User not authenticated.");
        setLoading(false);
        return;
      }
      try {
        let branchID = currentUser.branch;
        if (!branchID) {
          const userRes = await api.get("/users/profile");
          const managerData = userRes.data?.data || userRes.data;
          branchID = managerData.branch;
        }
        setUserBranch(branchID);

        const res = await api.get("/general/sales", {
          params: { branchName: branchID },
        });
        const salesList = res.data?.data || res.data || [];

        const fetchedSales = salesList.map((saleDoc) => {
          let ts = new Date();
          if (saleDoc.createdAt) {
            ts = new Date(saleDoc.createdAt);
          } else if (saleDoc.timestamp) {
            ts = typeof saleDoc.timestamp === "string" ? new Date(saleDoc.timestamp) : saleDoc.timestamp?.toDate ? saleDoc.timestamp.toDate() : new Date(saleDoc.timestamp);
          } else if (saleDoc.date) {
            ts = new Date(saleDoc.date);
          }

          return {
            id: saleDoc.id || saleDoc._id,
            ...saleDoc,
            itemsSold: saleDoc.itemsSold || saleDoc.items || [],
            timestamp: isNaN(ts.getTime()) ? new Date() : ts,
          };
        });
        setSalesHistory(fetchedSales);
      } catch (err) {
        console.error("Error fetching sales history:", err);
        setError("Failed to fetch sales history. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchSalesHistory();
  }, [currentUser]);

  const handlePrintReceipt = async (receiptData) => {
    const doc = new jsPDF();
    const element = document.getElementById(`receipt-content-${receiptData.id}`);

    if (element) {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const imgProps = doc.getImageProperties(imgData);
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      doc.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      doc.save(`Receipt-${receiptData.id}.pdf`);
    } else {
      alert("Receipt content not found for printing.");
    }
  };

  const ReceiptModal = ({ receipt, onClose }) => {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={onClose}>&times;</button>
          <div className="receipt-container" id={`receipt-content-${receipt.id}`}>
            <div className="receipt-header">
              <h3>COMPANY NAME / LOGO</h3>
              <p>Branch: {userBranch}</p>
              <p>Invoice No: {receipt.id}</p>
            </div>
            <div className="receipt-details">
              <p>Date: {receipt.timestamp.toLocaleDateString()}</p>
              <p>Time: {receipt.timestamp.toLocaleTimeString()}</p>
            </div>
            <table className="receipt-items-table">
              <thead>
                <tr>
                  <th>Item/Service</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipt.itemsSold.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{(Number(item.unitPrice) || 0).toFixed(2)}</td>
                    <td>{(Number(item.totalAmount) || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="receipt-totals">
              <p>Subtotal: ₹{(Number(receipt.subtotal) || 0).toFixed(2)}</p>
              <p>GST (18%): ₹{(Number(receipt.gst) || 0).toFixed(2)}</p>
              <h4>Total: ₹{(Number(receipt.grandTotal) || 0).toFixed(2)}</h4>
            </div>
            <div className="receipt-footer">
              <p>Thank you for your business! Visit Again</p>
            </div>
          </div>
          <button onClick={() => handlePrintReceipt(receipt)} className="modal-print-btn">
            Download / Print
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading-state">Loading sales history...</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div className="sales-history-container">
      <h2>Sales Receipt History</h2>
      {salesHistory.length === 0 ? (
        <p>No sales records found for this branch.</p>
      ) : (
        <table className="sales-history-table">
          <thead>
            <tr>
              <th>Sale ID</th>
              <th>Date</th>
              <th>Time</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {salesHistory.map((sale) => (
              <tr key={sale.id}>
                <td>{sale.id}</td>
                <td>{sale.timestamp.toLocaleDateString()}</td>
                <td>{sale.timestamp.toLocaleTimeString()}</td>
                <td>₹{(Number(sale.grandTotal) || 0).toFixed(2)}</td>
                <td>
                  <button onClick={() => setSelectedReceipt(sale)}>View</button>
                  <button onClick={() => handlePrintReceipt(sale)}>Print</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selectedReceipt && (
        <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  );
};

export default SalesInvoice;
