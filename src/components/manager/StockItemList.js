import React, { useState, useEffect } from 'react';
import { db, auth } from '../../services/authservice';
import { collection, getDocs, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../styles/stockitemlist.css';

const StockItemList = () => {
  const [stocks, setStocks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [branchName, setBranchName] = useState('');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        setUserId(user.uid);
        const userDoc = doc(db, 'users', user.uid);
        const userSnapshot = await getDoc(userDoc);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          setBranchName(userData.branch);
        } else {
          toast.error('User document does not exist.');
        }
      } else {
        toast.error('No user is currently logged in.');
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchStocks = async () => {
      if (branchName && userId) {
        const stockCollection = collection(db, 'stocks');
        const q = query(stockCollection, where('branchName', '==', branchName), where('userId', '==', userId));
        const stockSnapshot = await getDocs(q);
        const stockList = stockSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStocks(stockList);
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
      const stockDocRef = doc(db, 'stocks', editingId);
      await updateDoc(stockDocRef, {
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
          {stocks.map((stock, index) => (
            <tr key={stock.id}>
              <td>{index + 1}</td>
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
    </div>
  );
};

export default StockItemList;
