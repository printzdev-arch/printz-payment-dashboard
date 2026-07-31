import { useState, useEffect, useCallback } from "react"
import { db } from "../../services/authservice"
import { collection, getDocs, query, where, updateDoc, doc, addDoc } from "firebase/firestore"
import { FaUndo, FaExchangeAlt, FaCopy } from "react-icons/fa"
import "../../styles/stocklist.css"
import { usePopup } from "../../hooks/usePopup"
import Popup from "../common/Popup"

const MoveAssets = () => {
  const { popup, showSuccess, showError } = usePopup();
  const [fromBranch, setFromBranch] = useState("")
  const [toBranch, setToBranch] = useState("")
  const [selectedAsset, setSelectedAsset] = useState("")
  const [moveQuantity, setMoveQuantity] = useState("")
  const [branches, setBranches] = useState([])
  const [assets, setAssets] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  const fetchBranches = useCallback(async () => {
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
      showError("Error fetching branches: " + error.message);
    }
  }, [showError])

  const fetchAssets = useCallback(async () => {
    if (!fromBranch) return

    setLoadingAssets(true)
    try {
      const assetsRef = collection(db, "assets")
      const q = query(assetsRef, where("branchName", "==", fromBranch))
      const querySnapshot = await getDocs(q)
      const assetsData = []
      querySnapshot.forEach((doc) => {
        assetsData.push({ id: doc.id, ...doc.data() })
      })
      setAssets(assetsData)
    } catch (error) {
      showError("Error fetching assets: " + error.message);
    } finally {
      setLoadingAssets(false)
    }
  }, [fromBranch, showError])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  useEffect(() => {
    if (fromBranch) {
      fetchAssets()
    } else {
      setAssets([])
      setSelectedAsset("")
    }
  }, [fromBranch, fetchAssets])

  const handleMove = async (e) => {
    e.preventDefault()

    if (fromBranch === toBranch) {
      showError("Source and destination branches cannot be the same");
      return
    }

    const asset = assets.find((a) => a.id === selectedAsset)
    if (!asset) {
      showError("Please select a valid asset");
      return
    }

    const moveQty = Number.parseInt(moveQuantity)
    if (moveQty <= 0 || moveQty > asset.assetQty) {
      showError(`Move quantity must be between 1 and ${asset.assetQty}`);
      return
    }

    setIsLoading(true)

    try {
      const currentUser = JSON.parse(localStorage.getItem("user"))
      const toBranchData = branches.find((b) => b.name === toBranch)

      const existingAssetQuery = query(
        collection(db, "assets"),
        where("branchName", "==", toBranch),
        where("assetId", "==", asset.assetId),
      )
      const existingAssetSnapshot = await getDocs(existingAssetQuery)

      if (!existingAssetSnapshot.empty) {
        const existingAssetDoc = existingAssetSnapshot.docs[0]
        const existingAssetData = existingAssetDoc.data()
        await updateDoc(doc(db, "assets", existingAssetDoc.id), {
          assetQty: existingAssetData.assetQty + moveQty,
          updatedBy: currentUser?.email || "Unknown",
          updatedDate: new Date(),
        })
      } else {
        await addDoc(collection(db, "assets"), {
          userId: toBranchData?.id || "",
          branchName: toBranch,
          assetId: asset.assetId,
          assetName: asset.assetName,
          assetQty: moveQty,
          description: asset.description,
          createdBy: currentUser?.email || "Unknown",
          createdDate: new Date(),
          updatedBy: currentUser?.email || "Unknown",
          updatedDate: new Date(),
          customAssetNames: asset.customAssetNames || [],
        })
      }

      if (moveQty === asset.assetQty) {
        await updateDoc(doc(db, "assets", asset.id), {
          assetQty: 0,
          updatedBy: currentUser?.email || "Unknown",
          updatedDate: new Date(),
        })
      } else {
        await updateDoc(doc(db, "assets", asset.id), {
          assetQty: asset.assetQty - moveQty,
          updatedBy: currentUser?.email || "Unknown",
          updatedDate: new Date(),
        })
      }

      showSuccess(`Successfully moved ${moveQty} ${asset.assetName}(s) from ${fromBranch} to ${toBranch}`)

      const currentUserLog = JSON.parse(localStorage.getItem("user"))
      await addDoc(collection(db, "inventoryMovements"), {
        type: "asset",
        action: "move",
        assetId: asset.assetId,
        assetName: asset.assetName,
        quantity: moveQty,
        fromBranch: fromBranch,
        toBranch: toBranch,
        movementDate: new Date(),
        performedBy: currentUserLog?.email || "Unknown",
        details: {
          description: asset.description || "",
          customAssetNames: asset.customAssetNames || [],
        },
      })

      handleReset()
      fetchAssets()
    } catch (error) {
      showError("Failed to move asset: " + error.message)
      console.error("Error moving asset: ", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClone = async (e) => {
    e.preventDefault()

    if (fromBranch === toBranch) {
      showError("Source and destination branches cannot be the same")
      return
    }

    const asset = assets.find((a) => a.id === selectedAsset)
    if (!asset) {
      showError("Please select a valid asset")
      return
    }

    const cloneQty = Number.parseInt(moveQuantity)
    
    // For clone: allow cloning any positive quantity, even from 0-quantity assets
    // Only limit if source asset has quantity > 0
    if (cloneQty <= 0) {
      showError("Clone quantity must be greater than 0")
      return
    }
    
    if (asset.assetQty > 0 && cloneQty > asset.assetQty) {
      showError(`Clone quantity cannot exceed available quantity of ${asset.assetQty}`)
      return
    }

    setIsLoading(true)

    try {
      const currentUser = JSON.parse(localStorage.getItem("user"))
      const toBranchData = branches.find((b) => b.name === toBranch)

      const existingAssetQuery = query(
        collection(db, "assets"),
        where("branchName", "==", toBranch),
        where("assetId", "==", asset.assetId),
      )
      const existingAssetSnapshot = await getDocs(existingAssetQuery)

      if (!existingAssetSnapshot.empty) {
        const existingAssetDoc = existingAssetSnapshot.docs[0]
        const existingAssetData = existingAssetDoc.data()
        await updateDoc(doc(db, "assets", existingAssetDoc.id), {
          assetQty: existingAssetData.assetQty + cloneQty,
          updatedBy: currentUser?.email || "Unknown",
          updatedDate: new Date(),
        })
      } else {
        await addDoc(collection(db, "assets"), {
          userId: toBranchData?.id || "",
          branchName: toBranch,
          assetId: asset.assetId,
          assetName: asset.assetName,
          assetQty: cloneQty,
          description: asset.description,
          createdBy: currentUser?.email || "Unknown",
          createdDate: new Date(),
          updatedBy: currentUser?.email || "Unknown",
          updatedDate: new Date(),
          customAssetNames: asset.customAssetNames || [],
        })
      }

      showSuccess(`Successfully cloned ${cloneQty} ${asset.assetName}(s) from ${fromBranch} to ${toBranch}`)

      const currentUserLog = JSON.parse(localStorage.getItem("user"))
      await addDoc(collection(db, "inventoryMovements"), {
        type: "asset",
        action: "clone",
        assetId: asset.assetId,
        assetName: asset.assetName,
        quantity: cloneQty,
        fromBranch: fromBranch,
        toBranch: toBranch,
        movementDate: new Date(),
        performedBy: currentUserLog?.email || "Unknown",
        details: {
          description: asset.description || "",
          customAssetNames: asset.customAssetNames || [],
        },
      })

      handleReset()
      fetchAssets()
    } catch (error) {
      showError("Failed to clone asset: " + error.message)
      console.error("Error cloning asset: ", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setFromBranch("")
    setToBranch("")
    setSelectedAsset("")
    setMoveQuantity("")
    setAssets([])
  }

  const selectedAssetData = assets.find((a) => a.id === selectedAsset)

  if (isLoading) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Processing asset movement...</p>
      </div>
    )
  }

  return (
    <div className="stock-readings-container">
      <Popup {...popup} />
      <div className="stock-page-header">
        <h2>Move Assets</h2>
        <p>Transfer assets between branches or clone assets to multiple locations</p>
      </div>

      <div className="stock-list">
        <div className="stock-card">
          <div className="stock-card-header">
            <div className="stock-card-title">
              <h3>Asset Movement Configuration</h3>
            </div>
          </div>

          <div className="stock-card-content">
            <form>
              {/* Branch Selection */}
              <div className="stock-date-picker-container">
                <div className="stock-date-picker-wrapper">
                  <label>From Branch *</label>
                  <select
                    value={fromBranch}
                    onChange={(e) => setFromBranch(e.target.value)}
                    className="stock-select-input"
                    required
                  >
                    <option value="">Select Source Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="stock-date-picker-wrapper">
                  <label>To Branch *</label>
                  <select
                    value={toBranch}
                    onChange={(e) => setToBranch(e.target.value)}
                    className="stock-select-input"
                    required
                  >
                    <option value="">Select Destination Branch</option>
                    {branches
                      .filter((branch) => branch.name !== fromBranch)
                      .map((branch) => (
                        <option key={branch.id} value={branch.name}>
                          {branch.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Asset Selection */}
              {fromBranch && (
                <div className="stock-date-picker-container">
                  <div className="stock-date-picker-wrapper">
                    <label>Select Asset *</label>
                    {loadingAssets ? (
                      <div
                        className="stock-select-input"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40px" }}
                      >
                        <div className="stock-loading-spinner" style={{ width: "20px", height: "20px" }}></div>
                        <span style={{ marginLeft: "10px" }}>Loading assets...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedAsset}
                        onChange={(e) => setSelectedAsset(e.target.value)}
                        className="stock-select-input"
                        required
                      >
                        <option value="">Select Asset</option>
                        {assets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.assetName} ({asset.assetId}) - Qty: {asset.assetQty}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="stock-date-picker-wrapper">
                    <label>Quantity to Move/Clone *</label>
                    <input
                      type="number"
                      value={moveQuantity}
                      onChange={(e) => setMoveQuantity(e.target.value)}
                      className="stock-select-input"
                      placeholder="Enter quantity"
                      min="1"
                      required
                    />
                    {selectedAssetData && (
                      <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                        Available: {selectedAssetData.assetQty} units
                        {selectedAssetData.assetQty === 0 && (
                          <span style={{ color: "#dc3545", display: "block" }}>
                            Move: Not allowed | Clone: Any positive quantity
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Asset Details */}
              {selectedAssetData && (
                <div className="stock-card" style={{ marginTop: "20px", backgroundColor: "#f8f9fa" }}>
                  <div className="stock-card-header">
                    <div className="stock-card-title">
                      <h4>Selected Asset Details</h4>
                    </div>
                  </div>
                  <div className="stock-card-content">
                    <div className="stock-date-picker-container">
                      <div className="stock-date-picker-wrapper">
                        <label>Asset ID</label>
                        <input
                          type="text"
                          value={selectedAssetData.assetId}
                          className="stock-select-input"
                          readOnly
                          style={{ backgroundColor: "#e9ecef" }}
                        />
                      </div>
                      <div className="stock-date-picker-wrapper">
                        <label>Asset Name</label>
                        <input
                          type="text"
                          value={selectedAssetData.assetName}
                          className="stock-select-input"
                          readOnly
                          style={{ backgroundColor: "#e9ecef" }}
                        />
                      </div>
                    </div>
                    <div className="stock-date-picker-wrapper">
                      <label>Description</label>
                      <textarea
                        value={selectedAssetData.description || "No description available"}
                        className="stock-select-input"
                        readOnly
                        style={{ backgroundColor: "#e9ecef", minHeight: "60px", resize: "none" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="stock-action-buttons">
                <button
                  type="button"
                  onClick={handleMove}
                  className="stock-save-button"
                  disabled={
                    !fromBranch || 
                    !toBranch || 
                    !selectedAsset || 
                    !moveQuantity || 
                    isLoading ||
                    (selectedAssetData && selectedAssetData.assetQty === 0)
                  }
                  style={{ 
                    backgroundColor: (selectedAssetData && selectedAssetData.assetQty === 0) ? "#6c757d" : "#dc3545" 
                  }}
                  title={
                    selectedAssetData && selectedAssetData.assetQty === 0 
                      ? "Cannot move assets with 0 quantity" 
                      : "Move Asset"
                  }
                >
                  <FaExchangeAlt /> Move Asset
                </button>
                <button
                  type="button"
                  onClick={handleClone}
                  className="stock-save-button"
                  disabled={!fromBranch || !toBranch || !selectedAsset || !moveQuantity || isLoading}
                  style={{ backgroundColor: "#17a2b8" }}
                >
                  <FaCopy /> Clone Asset
                </button>
                <button type="button" onClick={handleReset} className="stock-cancel-button">
                  <FaUndo /> Reset Form
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Available Assets List */}
        {fromBranch && assets.length > 0 && (
          <div className="stock-card" style={{ marginTop: "25px" }}>
            <div className="stock-card-header">
              <div className="stock-card-title">
                <h3>Available Assets in {fromBranch}</h3>
                <p style={{ fontSize: "14px", color: "#666", margin: "5px 0 0 0" }}>
                  {assets.length} asset{assets.length !== 1 ? "s" : ""} available 
                  ({assets.filter((asset) => asset.assetQty > 0).length} for moving, {assets.length} for cloning)
                </p>
              </div>
            </div>

            <div className="stock-card-content">
              {loadingAssets ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div className="stock-loading-spinner" style={{ margin: "0 auto 10px" }}></div>
                  <p>Loading assets...</p>
                </div>
              ) : assets.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
                  <p>No assets found in this branch.</p>
                </div>
              ) : (
                <div>
                  <div className="stock-table-wrapper">
                    <table className="stock-readings-table">
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>Asset ID</th>
                          <th>Asset Name</th>
                          <th>Available Quantity</th>
                          <th>Description</th>
                          <th>Actions Available</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const totalPages = Math.ceil(assets.length / itemsPerPage);
                          const startIndex = (currentPage - 1) * itemsPerPage;
                          const endIndex = startIndex + itemsPerPage;
                          const currentAssets = assets.slice(startIndex, endIndex);
                          
                          return currentAssets.map((asset, index) => (
                            <tr
                              key={asset.id}
                              style={{
                                backgroundColor: selectedAsset === asset.id ? "#e3f2fd" : "inherit",
                                cursor: "pointer",
                              }}
                              onClick={() => setSelectedAsset(asset.id)}
                            >
                              <td style={{textAlign: "center"}}>{startIndex + index + 1}</td>
                              <td>{asset.assetId}</td>
                              <td>{asset.assetName}</td>
                              <td>
                                <span className="qty-badge">
                                  {asset.assetQty}
                                </span>
                              </td>
                              <td>{asset.description || "N/A"}</td>
                              <td style={{ fontSize: "12px" }}>
                                {asset.assetQty > 0 ? (
                                  <span style={{ color: "#28a745" }}>Move & Clone</span>
                                ) : (
                                  <span style={{ color: "#17a2b8" }}>Clone Only</span>
                                )}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {(() => {
                  const totalPages = Math.ceil(assets.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                    
                    const handlePageChange = (page) => {
                      setCurrentPage(page);
                    };

                    return totalPages > 1 && (
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
                          className="edit"
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
                              className="edit"
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
                          className="edit"
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
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MoveAssets
