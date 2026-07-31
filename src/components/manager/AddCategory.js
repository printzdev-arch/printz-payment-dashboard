import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore'; // Import Firestore methods
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../styles/addcategory.css';

const AddCategoryPopup = ({ db, onClose }) => {
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Test Firestore Connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const testRef = doc(db, 'test', 'connection');
        const docSnap = await getDoc(testRef);

        if (docSnap.exists()) {
          console.log('Popup Firestore connection successful:', docSnap.data());
        } else {
          console.log('Popup Firestore connected but no data found.');
        }
      } catch (err) {
        console.error('Popup Firestore connection failed:', err);
      }
    };
    testConnection();
  }, [db]);

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    console.log('Saving Data:', { categoryId, categoryName });

    if (!categoryId || !categoryName) {
      console.log('Validation failed');
      return setError('Both fields are required');
    }

    setLoading(true);

    try {
      console.log('Attempting Firestore write...');
      // Add category to Firestore with custom ID
      await setDoc(doc(db, 'categories', categoryId), {
        categoryId,
        categoryName,
      });

      console.log('Firestore write successful!');
      setLoading(false);
      handleReset();
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Firestore Write Error:', error);
      setError(error.message || 'Failed to add category');
      setLoading(false);
    }
  };

  // Reset Form
  const handleReset = () => {
    setCategoryId('');
    setCategoryName('');
    setError('');
    onClose(); // Close popup on reset
  };

  return (
    <div className="add-category-popup">
      <ToastContainer />
      <div className="popup">
        <div className="popup-content">
          <h2>Add Category</h2>
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div>
              <label>Category ID</label>
              <input
                type="text"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Category Name</label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
            </div>
            <div className="popup-buttons">
              <button disabled={loading} type="submit">Add</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddCategoryPopup;
