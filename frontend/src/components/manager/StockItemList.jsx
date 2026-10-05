import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../styles/stockitemlist.css';
import Pagination from '../common/Pagination';

const StockItemList = () => {
  const [stocks, setStocks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [branchName, setBranchName] = useState('');
  const [userId, setUserId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    const fetchUserData = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          setUserId(userObj._id || userObj.id || userObj.uid);
          const branch = userObj.branch || userObj.branchName || localStorage.getItem('userBranchName') || '';
          setBranchName(branch);
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
        }
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchStocks = async () => {
      if (branchName) {
        try {
          const res = await api.get('/stocks/items', {
            params: { branchName },
          });
          const stockList = (res.data?.data || []).map((doc) => ({
            id: doc._id || doc.id,
            ...doc,
          }));
          setStocks(stockList);
        } catch (error) {
          console.error('Error fetching stock items:', error);
        }
      }
    };

    fetchStocks();
  }, [branchName, userId]);

  const handleEditClick = (stockId, currentValues) => {
    setEditingId(stockId);
    setEditValues(currentValues);
  };

  const handleInputChange = (field, value) => {
    setEditValues({
      ...editValues,
      [field]: value,
    });
  };

  const handleSave = async () => {
    try {
      await api.post('/stocks/items', {
        id: editingId,
        itemName: editValues.itemName,
        amount: Number(editValues.amount),
      });
      setStocks(stocks.map(stock => (stock.id === editingId ? { ...stock, ...editValues } : stock)));
      setEditingId(null);
      toast.success('Stock details updated successfully');
    } catch (error) {
      toast.error('Failed to update stock details: ' + error.message);
    }
  };

  return (
    <div className="stock-item-list-container">
      <ToastContainer />
      <h2>Stock Price List</h2>
      <table className="stock-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Item Name</th>
            <th>Unit Price(₹)</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {stocks
            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
            .map((stock, index) => (
            <tr key={stock.id}>
              <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
              <td>
                {editingId === stock.id ? (
                  <input
                    type="text"
                    value={editValues.itemName}
                    onChange={(e) => handleInputChange('itemName', e.target.value)}
                  />
                ) : (
                  stock.itemName
                )}
              </td>
              <td>
                {editingId === stock.id ? (
                  <input
                    type="number"
                    value={editValues.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                  />
                ) : (
                  `₹${stock.amount}`
                )}
              </td>
              <td>
                {editingId === stock.id ? (
                  <button onClick={handleSave}>Save</button>
                ) : (
                  <button onClick={() => handleEditClick(stock.id, { itemName: stock.itemName, amount: stock.amount })}>
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {stocks.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={stocks.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          pageSizeOptions={[10, 20, 50, 100]}
          itemLabel="items"
        />
      )}
    </div>
  );
};

export default StockItemList;
