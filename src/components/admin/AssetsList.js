import { useState, useEffect, useCallback } from "react"
import { db } from "../../services/authservice"
import { collection, getDocs, query, where, updateDoc, doc, deleteDoc } from "firebase/firestore"
import { FaTrash } from "react-icons/fa"
import "../../styles/stocklist.css"
import { usePopup } from "../../hooks/usePopup"
import Popup from "../common/Popup"

const AssetsList = () => {
  const { popup, showSuccess, showError } = usePopup();
  const [selectedBranch, setSelectedBranch] = useState("")
  const [branches, setBranches] = useState([])
  const [assets, setAssets] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [selectedItems, setSelectedItems] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchBranches()
  }, []); 

  // Clear selected items when branch changes
  useEffect(() => {
    setSelectedItems([]);
    setSelectAll(false);
    setCurrentPage(1);
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "branches"))
      const branchesData = []
      querySnapshot.forEach((doc) => {
        const userData = doc.data()
        branchesData.push({ name: userData.name, id: doc.id })
      })
      
      const sortedBranches = branchesData.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
      setBranches(sortedBranches)
    } catch (error) {
      showError("Failed to load branches. Please try again.");
    }
  }

  const fetchAssets = useCallback(async () => {
    if (!selectedBranch) return

    setIsLoading(true)
    try {
      const assetsRef = collection(db, "assets")
      const q = query(assetsRef, where("branchName", "==", selectedBranch))
      const querySnapshot = await getDocs(q)
      const assetsData = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.assetQty > 0) {
          
          assetsData.push({ id: doc.id, ...data })
        }
      })
      setAssets(assetsData.sort((a, b) => a.assetName.localeCompare(b.assetName)))
    } catch (error) {
      showError("Failed to load assets. Please try again.");
    } finally {
      setIsLoading(false)
    }
  }, [selectedBranch, showError])

  useEffect(() => {
    if (selectedBranch) {
      fetchAssets()
    } else {
      setAssets([])
    }
  }, [selectedBranch, fetchAssets])

  const handleEdit = (asset) => {
    setEditingAsset(asset.id)
    setEditFormData({
      assetName: asset.assetName,
      assetQty: asset.assetQty,
      description: asset.description || "",
    })
  }

  const handleCancelEdit = () => {
    setEditingAsset(null)
    setEditFormData({})
  }

  const handleSaveEdit = async (assetId) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("user"))

      if (editFormData.assetQty <= 0) {
        showError("Asset quantity must be greater than 0");
        return
      }

      await updateDoc(doc(db, "assets", assetId), {
        assetName: editFormData.assetName.trim(),
        assetQty: Number.parseInt(editFormData.assetQty),
        description: editFormData.description.trim(),
        updatedBy: currentUser?.email || "Unknown",
        updatedDate: new Date(),
      })

      showSuccess("Asset updated successfully");

      setEditingAsset(null)
      setEditFormData({})
      fetchAssets()
    } catch (error) {
      showError("Failed to update asset. Please try again.");
    }
  }

  const handleDelete = async (assetId, assetName) => {
    if (window.confirm(`Are you sure you want to delete the asset "${assetName}"?`)) {
      try {
        await deleteDoc(doc(db, "assets", assetId))
        showSuccess("Asset deleted successfully");
        fetchAssets()
      } catch (error) {
        showError("Failed to delete asset. Please try again.");
      }
    }
  }

  
  const handleSelectItem = (assetId) => {
    setSelectedItems(prev => {
      if (prev.includes(assetId)) {
        return prev.filter(id => id !== assetId);
      } else {
        return [...prev, assetId];
      }
    });
  };

  const handleSelectAll = (filteredAssets) => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredAssets.map(asset => asset.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      showError("Please select items to delete");
      return;
    }
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const promises = selectedItems.map(assetId => 
        deleteDoc(doc(db, "assets", assetId))
      );
      
      await Promise.all(promises);
      
      showSuccess(`Successfully deleted ${selectedItems.length} asset(s)`);
      setSelectedItems([]);
      setSelectAll(false);
      setShowBulkDeleteConfirm(false);
      fetchAssets();
    } catch (error) {
      showError("Failed to delete selected assets: " + error.message);
    }
  };

  const cancelBulkDelete = () => {
    setShowBulkDeleteConfirm(false);
  };

  const formatDate = (date) => {
    if (!date) return "N/A"
    const dateObj = date.toDate ? date.toDate() : new Date(date)
    return (
      dateObj.toLocaleDateString("en-IN") +
      " " +
      dateObj.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    )
  }

  return (
    <div className="stock-readings-container">
      <div className="stock-page-header">
        <h2>Assets List</h2>
        <p>View and manage assets by branch</p>
      </div>

      <div className="stock-list">
        <div className="stock-card">
          <div className="stock-card-header">
            <div className="stock-card-title">
              <h3>Branch Assets</h3>
            </div>
          </div>

          <div className="stock-card-content">
            <div className="stock-date-picker-wrapper" style={{ marginBottom: "20px" }}>
              <label>Select Branch *</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="stock-select-input"
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {isLoading ? (
              <div className="stock-loading-container">
                <div className="stock-loading-spinner"></div>
                <p>Loading assets...</p>
              </div>
            ) : assets.length > 0 ? (
              <>
                {(() => {
                  const totalPages = Math.ceil(assets.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const currentAssets = assets.slice(startIndex, endIndex);
                  
                  const handlePageChange = (page) => {
                    setCurrentPage(page);
                  };

                  return (
                    <div>
                      {}
                      {assets.length > 0 && (
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 15px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "6px",
                          marginBottom: "15px",
                          border: "1px solid #e9ecef"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "500" }}>
                              <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={() => handleSelectAll(assets)}
                                style={{ transform: "scale(1.2)" }}
                              />
                              Select All ({assets.length})
                            </label>
                            {selectedItems.length > 0 && (
                              <span style={{ fontSize: "14px", color: "#6c757d" }}>
                                {selectedItems.length} selected
                              </span>
                            )}
                          </div>
                          {selectedItems.length > 0 && (
                            <button
                              onClick={handleBulkDelete}
                              style={{
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                padding: "8px 16px",
                                borderRadius: "4px",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                              }}
                            >
                              <FaTrash size={12} />
                              Delete Selected ({selectedItems.length})
                            </button>
                          )}
                        </div>
                      )}

                      <div className="stock-table-wrapper">
                        <table className="stock-readings-table">
                          <thead>
                            <tr>
                              <th style={{ width: "50px" }}>
                                <input
                                  type="checkbox"
                                  checked={selectAll}
                                  onChange={() => handleSelectAll(assets)}
                                  style={{ transform: "scale(1.2)" }}
                                />
                              </th>
                              <th>S.No</th>
                              <th>Asset ID</th>
                              <th>Asset Name</th>
                              <th>Quantity</th>
                              <th>Description</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentAssets.map((asset, index) => (
                              <tr key={asset.id}>
                                <td style={{ textAlign: "center", width: "50px" }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedItems.includes(asset.id)}
                                    onChange={() => handleSelectItem(asset.id)}
                                    style={{ transform: "scale(1.2)" }}
                                  />
                                </td>
                                <td style={{textAlign: "center"}}>{startIndex + index + 1}</td>
                                <td>{asset.assetId}</td>
                        <td>
                          {editingAsset === asset.id ? (
                            <input
                              type="text"
                              value={editFormData.assetName}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  assetName: e.target.value,
                                })
                              }
                              className="stock-table-input"
                            />
                          ) : (
                            asset.assetName
                          )}
                        </td>
                        <td>
                          {editingAsset === asset.id ? (
                            <input
                              type="number"
                              value={editFormData.assetQty}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  assetQty: e.target.value,
                                })
                              }
                              className="stock-table-input"
                              min="1"
                            />
                          ) : (
                            asset.assetQty
                          )}
                        </td>
                        <td>
                          {editingAsset === asset.id ? (
                            <textarea
                              value={editFormData.description}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  description: e.target.value,
                                })
                              }
                              className="stock-table-input"
                              rows="2"
                            />
                          ) : (
                            asset.description || "N/A"
                          )}
                        </td>
                        <td>
                          <div className="stock-action-buttons">
                            {editingAsset === asset.id ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(asset.id)}
                                  className="stock-save-button"
                                  style={{
                                    padding: "5px 10px",
                                    fontSize: "12px",
                                    backgroundColor: "#28a745",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="stock-cancel-button"
                                  style={{
                                    padding: "5px 10px",
                                    fontSize: "12px",
                                    backgroundColor: "#6c757d",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                  }}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEdit(asset)}
                                  className="stock-save-button"
                                  style={{
                                    padding: "5px 10px",
                                    fontSize: "12px",
                                    backgroundColor: "#007bff",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(asset.id, asset.assetName)}
                                  className="stock-cancel-button"
                                  style={{
                                    padding: "5px 10px",
                                    fontSize: "12px",
                                    backgroundColor: "#dc3545",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                  }}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {}
              {totalPages > 1 && (
                <div className="stock-pagination" style={{ 
                  display: "flex", 
                  justifyContent: "center", 
                  alignItems: "center", 
                  gap: "10px", 
                  marginTop: "20px",
                  padding: "15px",
                  borderTop: "1px solid #e5e7eb",
                  backgroundColor: "#f8fafc"
                }}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      backgroundColor: currentPage === 1 ? "#d1d5db" : "#3b82f6",
                      color: "white",
                      padding: "8px 12px",
                      fontSize: "12px",
                      minWidth: "auto",
                      border: "none",
                      borderRadius: "3px",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer"
                    }}
                  >
                    Previous
                  </button>

                  <div style={{ display: "flex", gap: "5px" }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        style={{
                          backgroundColor: currentPage === page ? "#4f46e5" : "#f3f4f6",
                          color: currentPage === page ? "white" : "#374151",
                          padding: "8px 12px",
                          fontSize: "12px",
                          minWidth: "40px",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer"
                        }}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      backgroundColor: currentPage === totalPages ? "#d1d5db" : "#3b82f6",
                      color: "white",
                      padding: "8px 12px",
                      fontSize: "12px",
                      minWidth: "auto",
                      border: "none",
                      borderRadius: "3px",
                      cursor: currentPage === totalPages ? "not-allowed" : "pointer"
                    }}
                  >
                    Next
                  </button>

                  <span style={{ marginLeft: "15px", fontSize: "12px", color: "#666", fontWeight: "500" }}>
                    Showing {startIndex + 1}-{Math.min(endIndex, assets.length)} of {assets.length} assets
                  </span>
                </div>
              )}
            </div>
          );
        })()}
              </>
            ) : selectedBranch ? (
              <div className="stock-no-data">
                <p>No assets found for {selectedBranch}</p>
              </div>
            ) : (
              <div className="stock-no-data">
                <p>Please select a branch to view assets</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {}
      <Popup 
        show={popup.show} 
        message={popup.message} 
        type={popup.type} 
        onClose={() => {}} 
      />
        {}
        {showBulkDeleteConfirm && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              minWidth: "400px",
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)"
            }}>
              <div style={{ marginBottom: "20px" }}>
                <FaTrash size={48} color="#dc3545" style={{ marginBottom: "15px" }} />
                <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>Confirm Bulk Delete</h3>
                <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                  Are you sure you want to delete {selectedItems.length} selected asset(s)?
                  <br />
                  <strong>This action cannot be undone.</strong>
                </p>
              </div>
              <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
                <button
                  onClick={cancelBulkDelete}
                  style={{
                    padding: "10px 20px",
                    border: "1px solid #ccc",
                    backgroundColor: "#f8f9fa",
                    color: "#333",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDelete}
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    backgroundColor: "#dc3545",
                    color: "white",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  Delete {selectedItems.length} Items
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

export default AssetsList
