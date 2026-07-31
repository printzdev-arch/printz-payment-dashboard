import React, { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const StockSection = ({ branch, date }) => {
  const [stockData, setStockData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setIsLoading(true);
        const db = getFirestore();
        const formattedDate = date.toISOString().split('T')[0];
        
        const q = query(
          collection(db, 'stockReadings'),
          where('branchName', '==', branch),
          where('date', '==', formattedDate)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          setStockData(data.stocks || []);
        } else {
          setStockData([]);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching stock data:', error);
        setIsLoading(false);
      }
    };

    fetchStockData();
  }, [branch, date]);

  useEffect(() => {
    // Calculate total amount
    const total = stockData.reduce((sum, stock) => {
      if (stock.itemName && (stock.itemName.includes("A3 SPIRAL BINDING") || 
                           stock.itemName.includes("A4 SPIRAL BINDING"))) {
        if (stock.pageRanges && Array.isArray(stock.pageRanges)) {
          return sum + stock.pageRanges.reduce((rangeSum, range) => {
            return rangeSum + ((range.price || 0) * (range.sold || 0));
          }, 0);
        }
        return sum;
      }
      return sum + ((stock.amount || 0) * (stock.sold || 0));
    }, 0);
    
    setTotalAmount(total);
  }, [stockData]);

  const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return "₹0";
    return `₹${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  const isSpiralBinding = (itemName) => {
    return itemName && (itemName.includes("A3 SPIRAL BINDING") || 
                       itemName.includes("A4 SPIRAL BINDING"));
  };

  const renderSpiralBindingDetails = (stock) => {
    if (!stock.pageRanges || !Array.isArray(stock.pageRanges)) {
      return (
        <>
          <td>-</td>
          <td>-</td>
          <td>-</td>
        </>
      );
    }

    return (
      <>
        <td>
          {stock.pageRanges.map((range, i) => (
            <div key={i}>{range.range || '-'}</div>
          ))}
        </td>
        <td>
          {stock.pageRanges.map((range, i) => (
            <div key={i}>{range.sold || 0}</div>
          ))}
        </td>
        <td>
          {stock.pageRanges.map((range, i) => (
            <div key={i}>{formatCurrency(range.price || 0)}</div>
          ))}
        </td>
      </>
    );
  };

  if (isLoading) {
    return null; // Or a loading indicator if preferred
  }

  return (
    <div className="stock-section">
      <table className="stock-table">
        <tbody>
          {stockData.map((stock, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{stock.itemName || '-'}</td>
              <td>{stock.openingStock || 0}</td>
              <td>{stock.addedStock || 0}</td>
              <td>{stock.closingStock || 0}</td>
              
              {isSpiralBinding(stock.itemName) ? (
                renderSpiralBindingDetails(stock)
              ) : (
                <>
                  <td>-</td>
                  <td>{stock.sold || 0}</td>
                  <td>{formatCurrency(stock.amount || 0)}</td>
                </>
              )}
              
              <td>
                {isSpiralBinding(stock.itemName) ? 
                  formatCurrency(stock.pageRanges?.reduce((sum, range) => sum + (range.price * range.sold), 0) || 0) :
                  formatCurrency((stock.amount || 0) * (stock.sold || 0))
                }
              </td>
            </tr>
          ))}
          
          {stockData.length > 0 && (
            <tr className="total-row">
              <td colSpan="7" style={{ textAlign: 'right' }}>TOTAL:</td>
              <td>{formatCurrency(totalAmount)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <style jsx>{`
        .stock-section {
          margin-top: 10px;
        }
        
        .stock-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        
        .stock-table td {
          padding: 4px;
          vertical-align: top;
        }
        
        .stock-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .total-row td {
          font-weight: bold;
          border-top: 1px solid #000;
        }
      `}</style>
    </div>
  );
};

export default StockSection;