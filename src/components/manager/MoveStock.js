import React, { useState, useEffect, useMemo } from "react"
import { db } from "../../services/authservice"
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  orderBy,
  limit,
  updateDoc,
} from "firebase/firestore"
import {
  FaUndo,
  FaExchangeAlt,
  FaCopy,
  FaEdit,
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
} from "react-icons/fa"
import { MdOutlineFileDownloadDone } from "react-icons/md"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import "../../styles/stocklist.css"
import { usePopup } from "../../hooks/usePopup"
import Popup from "../common/Popup"

const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) {
    return "₹0"
  }
  let [integer, decimal] = Number.parseFloat(amount).toFixed(0).split(".")
  integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")

  if (integer.length > 4 && integer.includes(",,")) {
    integer = integer.replace(",,", ",")
  }

  return `₹${integer}${decimal ? "." + decimal : ""}`
}

const MoveStock = () => {
  const [branchName, setBranchName] = useState("")
  const [selectedItems, setSelectedItems] = useState([])
  const [userId, setUserId] = useState("")
  const [branches, setBranches] = useState([])
  const [items, setItems] = useState([])
  const [toLocation, setToLocation] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectAll, setSelectAll] = useState(false)
  const [showQuantitySelection, setShowQuantitySelection] = useState(false)
  const [itemQuantities, setItemQuantities] = useState({})
  const { popup, showSuccess, showError, showInfo, hidePopup } = usePopup()

  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "branches"))
        const branchesData = []
        querySnapshot.forEach((doc) => {
          const userData = doc.data()
          branchesData.push({ name: userData.name, id: doc.id })
        })

        branchesData.sort((a, b) => a.name.localeCompare(b.name))
        setBranches(branchesData)
      } catch (error) {
        showError("Error fetching branches: " + error.message)
      }
    }

    fetchBranches()
  }, [])

  useEffect(() => {
    if (!branchName) {
      setItems([])
      setSelectedItems([])
      setCurrentPage(1)
      return
    }

    const fetchItems = async () => {
      try {
        const q = query(collection(db, "stocks"), where("branchName", "==", branchName))
        const querySnapshot = await getDocs(q)
        const itemsData = []
        querySnapshot.forEach((doc) => {
          const itemData = doc.data()
          itemsData.push({ ...itemData, id: doc.id })
        })
        setItems(itemsData)
        setSelectedItems([])
        setSelectAll(false)
        setShowQuantitySelection(false)
        setItemQuantities({})
        setCurrentPage(1)
      } catch (error) {
        showError("Error fetching items: " + error.message)
      }
    }

    fetchItems()
  }, [branchName])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const handleBranchChange = (e) => {
    const selectedBranch = branches.find((branch) => branch.name === e.target.value)
    setBranchName(e.target.value)
    setUserId(selectedBranch ? selectedBranch.id : "")
    setSelectedItems([])
    setSelectAll(false)
    setShowQuantitySelection(false)
    setItemQuantities({})
    setSearchQuery("")
    setCurrentPage(1)
  }

  const handleDestinationBranchChange = (e) => {
    setToLocation(e.target.value)
  }

  const handleItemSelection = (item) => {
    setSelectedItems((prev) => {
      const isSelected = prev.some((selected) => selected.id === item.id)
      if (isSelected) {
        const newQuantities = { ...itemQuantities }
        delete newQuantities[item.id]
        return prev.filter((selected) => selected.id !== item.id)
      } else {
        setItemQuantities((prev) => ({
          ...prev,
          [item.id]: 1, // Default to 1, user can change to any value
        }))
        return [...prev, item]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([])
      setItemQuantities({})
    } else {
      setSelectedItems([...filteredItems])
      const newQuantities = {}
      filteredItems.forEach((item) => {
        newQuantities[item.id] = 1 // Default to 1, user can change to any value
      })
      setItemQuantities(newQuantities)
    }
    setSelectAll(!selectAll)
  }

  const handleQuantityChange = (itemId, newQuantity) => {
    // Allow user to enter any quantity - validation will happen on move/clone
    if (newQuantity === "" || newQuantity == null) {
      setItemQuantities((prev) => ({
        ...prev,
        [itemId]: "",
      }))
      return
    }

    const inputQty = Number.parseInt(newQuantity)

    // Only check if it's a valid number, don't limit the value
    if (isNaN(inputQty) || inputQty < 1) {
      return // Don't allow invalid numbers or values less than 1
    }

    setItemQuantities((prev) => ({
      ...prev,
      [itemId]: inputQty,
    }))
  }

  const proceedToQuantitySelection = () => {
    if (selectedItems.length === 0) {
      showError("Please select at least one item first")
      return
    }
    setShowQuantitySelection(true)
  }

  const getLatestJumboCounter = async (printerId) => {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, "jumboXeroxReadings"),
          where("printerId", "==", printerId),
          orderBy("date", "desc"),
          limit(1),
        ),
      )

      if (!querySnapshot.empty) {
        const latestReading = querySnapshot.docs[0].data()
        return latestReading.jumboCounter || null
      }
      return null
    } catch (error) {
      console.error("Error fetching latest jumbo counter:", error)
      return null
    }
  }

  const handleMove = async () => {
    if (selectedItems.length === 0) {
      showError("Please select at least one item to move")
      return
    }

    if (!toLocation) {
      showError("Please select a destination branch")
      return
    }

    // Validate quantities for move operation
    const invalidItems = []
    const zeroStockItems = []

    selectedItems.forEach((item) => {
      const selectedQty = itemQuantities[item.id] || 0
      const availableQty = item.qty || 0

      if (selectedQty <= 0) {
        invalidItems.push(`${item.itemName}: Quantity must be greater than 0`)
      } else if (availableQty === 0) {
        zeroStockItems.push(item.itemName)
      } else if (selectedQty > availableQty) {
        invalidItems.push(`${item.itemName}: Cannot move ${selectedQty} items (only ${availableQty} available)`)
      }
    })

    if (zeroStockItems.length > 0) {
      showError(
        `Cannot move items with 0 stock: ${zeroStockItems.join(", ")}. Use clone instead for items with no available quantity.`,
      )
      return
    }

    if (invalidItems.length > 0) {
      showError(`Invalid quantities:\n${invalidItems.join("\n")}`)
      return
    }

    setLoading(true)

    try {
      const destinationBranch = branches.find((branch) => branch.name === toLocation)

      const existingItemsCheck = await Promise.all(
        selectedItems.map(async (item) => {
          const matchField = item.stockId
            ? where("stockId", "==", item.stockId)
            : where("itemName", "==", item.itemName)

          const existingItemQuery = query(collection(db, "stocks"), where("branchName", "==", toLocation), matchField)

          const existingItemSnapshot = await getDocs(existingItemQuery)
          return {
            item,
            existingItem: !existingItemSnapshot.empty ? existingItemSnapshot.docs[0] : null,
          }
        }),
      )

      const movePromises = existingItemsCheck.map(async ({ item, existingItem }) => {
        const moveQuantity = itemQuantities[item.id] || 0

        if (existingItem) {
          const existingData = existingItem.data()
          const updatedQty = (existingData.qty || 0) + moveQuantity

          await updateDoc(doc(db, "stocks", existingItem.id), {
            qty: updatedQty,

            itemName: item.itemName,
            amount: item.amount,
            category: item.category || "",
            description: item.description || "",
            ...(item.pageRanges && { pageRanges: item.pageRanges }),
          })
        } else {
          const newItemData = {
            userId: destinationBranch ? destinationBranch.id : userId,
            branchName: toLocation,
            itemName: item.itemName,
            amount: item.amount,
            qty: moveQuantity,
            category: item.category || "",
            description: item.description || "",
            stockId: item.stockId || null,
            ...(item.pageRanges && { pageRanges: item.pageRanges }),
          }

          await addDoc(collection(db, "stocks"), newItemData)
        }

        // Update or delete the source item
        const remainingQty = (item.qty || 0) - moveQuantity

        if (remainingQty > 0) {
          await updateDoc(doc(db, "stocks", item.id), { qty: remainingQty })
        } else {
          await deleteDoc(doc(db, "stocks", item.id))
        }

        const currentUser = JSON.parse(localStorage.getItem("user"))
        return addDoc(collection(db, "inventoryMovements"), {
          type: "stock",
          action: "move",
          itemName: item.itemName,
          category: item.category || "",
          quantity: moveQuantity,
          amount: item.amount,
          fromBranch: branchName,
          toBranch: toLocation,
          movementDate: new Date(),
          performedBy: currentUser?.email || "Unknown",
          stockId: item.stockId || null,
          updatedExisting: existingItem ? true : false,
        })
      })

      await Promise.all(movePromises)

      const totalQuantity = Object.values(itemQuantities).reduce((sum, qty) => sum + qty, 0)
      showSuccess(`Successfully moved ${totalQuantity} items (${selectedItems.length} types) to ${toLocation}`)

      handleReset()
    } catch (error) {
      showError("Failed to move items: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClone = async () => {
    if (selectedItems.length === 0) {
      showError("Please select at least one item to clone")
      return
    }

    if (!toLocation) {
      showError("Please select a destination branch")
      return
    }

    // Validate quantities for clone operation
    const invalidItems = []

    selectedItems.forEach((item) => {
      const selectedQty = itemQuantities[item.id] || 0
      const availableQty = item.qty || 0

      if (selectedQty <= 0) {
        invalidItems.push(`${item.itemName}: Quantity must be greater than 0`)
      } else if (availableQty > 0 && selectedQty > availableQty) {
        // Only validate against available quantity if there is stock available
        invalidItems.push(`${item.itemName}: Cannot clone ${selectedQty} items (only ${availableQty} available)`)
      }
      // If availableQty is 0, allow any quantity for cloning
    })

    if (invalidItems.length > 0) {
      showError(`Invalid quantities:\n${invalidItems.join("\n")}`)
      return
    }

    setLoading(true)

    try {
      const destinationBranch = branches.find((branch) => branch.name === toLocation)

      const existingItemsCheck = await Promise.all(
        selectedItems.map(async (item) => {
          const matchField = item.stockId
            ? where("stockId", "==", item.stockId)
            : where("itemName", "==", item.itemName)

          const existingItemQuery = query(collection(db, "stocks"), where("branchName", "==", toLocation), matchField)

          const existingItemSnapshot = await getDocs(existingItemQuery)
          return {
            item,
            existingItem: !existingItemSnapshot.empty ? existingItemSnapshot.docs[0] : null,
          }
        }),
      )

      const existingItems = existingItemsCheck.filter(({ existingItem }) => existingItem)

      if (existingItems.length > 0) {
        const existingItemNames = existingItems.map(({ item }) => item.itemName).join(", ")
        throw new Error(
          `Cannot clone: The following items already exist at destination branch: ${existingItemNames}. Use move instead to add quantities.`,
        )
      }

      const clonePromises = selectedItems.map(async (item) => {
        const cloneQuantity = itemQuantities[item.id] || 0
        const itemData = {
          userId: destinationBranch ? destinationBranch.id : userId,
          branchName: toLocation,
          itemName: item.itemName,
          amount: item.amount,
          qty: cloneQuantity,
          category: item.category || "",
          description: item.description || "",
          stockId: item.stockId || null,
          ...(item.pageRanges && { pageRanges: item.pageRanges }),
        }

        if (item.printerType === "large" && item.printerId) {
          const latestJumboCounter = await getLatestJumboCounter(item.printerId)

          if (latestJumboCounter) {
            itemData.lastFinalReadings = {
              jumboCounter: {
                start: latestJumboCounter.start || 0,
                end: latestJumboCounter.end || 0,
                sftPrinted: latestJumboCounter.sftPrinted || 0,
              },
            }
          }
        }

        await addDoc(collection(db, "stocks"), itemData)

        const currentUser = JSON.parse(localStorage.getItem("user"))
        return addDoc(collection(db, "inventoryMovements"), {
          type: "stock",
          action: "clone",
          itemName: item.itemName,
          category: item.category || "",
          quantity: cloneQuantity,
          amount: item.amount,
          fromBranch: branchName,
          toBranch: toLocation,
          movementDate: new Date(),
          performedBy: currentUser?.email || "Unknown",
          stockId: item.stockId || null,
        })
      })

      await Promise.all(clonePromises)

      const totalQuantity = Object.values(itemQuantities).reduce((sum, qty) => sum + qty, 0)
      showSuccess(`Successfully cloned ${totalQuantity} items (${selectedItems.length} types) to ${toLocation}`)

      handleReset()
    } catch (error) {
      showError("Failed to clone items: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedItems([])
    setToLocation("")
    setBranchName("")
    setSelectAll(false)
    setShowQuantitySelection(false)
    setItemQuantities({})
    setSearchQuery("")
    setCurrentPage(1)
  }

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.stockId && item.stockId.toLowerCase().includes(searchQuery.toLowerCase())),
    )
  }, [items, searchQuery])

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem)

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  return (
    <div className="stock-readings-container">
      <ToastContainer />
      <Popup {...popup} />
      {}
      {}
      <div className="stock-page-header">
        <h2>Move/Clone Stock</h2>
        <p>Transfer or clone stock items between branches</p>
      </div>
      {}
      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>
              Stock Transfer & Clone
            </h3>
          </div>
        </div>

        <div className="stock-card-content">
          {}
          <div className="stock-card">
            <div className="stock-card-header">
              <div className="stock-card-title">
                <h3>Source Location</h3>
              </div>
            </div>
            <div className="stock-card-content">
              <div className="stock-date-picker-container">
                <div className="stock-date-picker-wrapper">
                  <label>From Branch</label>
                  <select
                    value={branchName}
                    onChange={handleBranchChange}
                    className="stock-select-input"
                    required
                    disabled={loading}
                  >
                    <option value="">Select Source Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {}
          {branchName && items.length > 0 && !showQuantitySelection && (
            <div className="stock-card">
              <div className="stock-card-header">
                <div className="stock-card-title">
                  <h3>Select Items ({selectedItems.length} selected)</h3>
                </div>
              </div>
              <div className="stock-card-content">
                {}
                <div className="stock-search-bar">
                  <input
                    type="text"
                    placeholder="Search by item name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="stock-search-input"
                  />
                </div>

                <div className="stock-checkbox-container">
                  <div className="stock-checkbox-item">
                    <label className="stock-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="stock-checkbox-input"
                      />
                      <span className="stock-checkbox-custom"></span>
                      Select All Items ({filteredItems.length})
                    </label>
                  </div>
                </div>

                <div className="stock-table-wrapper">
                  <table className="stock-readings-table">
                    <thead>
                      <tr>
                        <th rowSpan="2">Select</th>
                        <th rowSpan="2">ITEM ID</th>
                        <th rowSpan="2">ITEMS</th>
                        <th rowSpan="2">CATEGORY</th>
                        <th rowSpan="2">QTY</th>
                        <th colSpan="2">PRICING</th>
                      </tr>
                      <tr>
                        <th>Pages</th>
                        <th>Price(₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.length > 0 ? (
                        currentItems.map((item) => {
                          const totalRows = item.pageRanges ? item.pageRanges.length : 1
                          return (
                            <React.Fragment key={item.id}>
                              <tr>
                                <td rowSpan={totalRows}>
                                  <label className="stock-checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={selectedItems.some((selected) => selected.id === item.id)}
                                      onChange={() => handleItemSelection(item)}
                                      className="stock-checkbox-input"
                                    />
                                    <span className="stock-checkbox-custom"></span>
                                  </label>
                                </td>
                                <td rowSpan={totalRows}>{(item.stockId || "N/A").toUpperCase()}</td>
                                <td rowSpan={totalRows}>{item.itemName}</td>
                                <td rowSpan={totalRows}>{item.category || "N/A"}</td>
                                <td rowSpan={totalRows}>
                                  <span
                                    className={`stock-qty-badge ${
                                      (item.qty || 0) === 0
                                        ? "out-of-stock"
                                        : (item.qty || 0) < 5
                                          ? "low-stock"
                                          : "in-stock"
                                    }`}
                                  >
                                    {item.qty || 0}
                                  </span>
                                </td>
                                {item.pageRanges && item.pageRanges.length > 0 ? (
                                  <>
                                    <td>{item.pageRanges[0].range}</td>
                                    <td>{formatCurrency(item.pageRanges[0].price)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td>Standard</td>
                                    <td>{formatCurrency(item.amount)}</td>
                                  </>
                                )}
                              </tr>
                              {item.pageRanges &&
                                item.pageRanges.slice(1).map((range, rangeIndex) => (
                                  <tr key={`${item.id}-range-${rangeIndex + 1}`}>
                                    <td>{range.range}</td>
                                    <td>{formatCurrency(range.price)}</td>
                                  </tr>
                                ))}
                            </React.Fragment>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="no-data-message">
                            No items found for the selected branch or search query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {}
                {filteredItems.length > itemsPerPage && (
                  <div className="stock-pagination">
                    <button onClick={previousPage} disabled={currentPage === 1} className="stock-pagination-button">
                      <FaRegArrowAltCircleLeft />
                    </button>
                    <span className="stock-page-info">
                      {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className="stock-pagination-button"
                    >
                      <FaRegArrowAltCircleRight />
                    </button>
                  </div>
                )}

                {selectedItems.length > 0 && (
                  <div className="stock-action-buttons">
                    <button
                      type="button"
                      onClick={proceedToQuantitySelection}
                      className="stock-save-button"
                      style={{ backgroundColor: "#3b82f6" }}
                    >
                      <FaEdit /> Set Quantities ({selectedItems.length} items)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {}
          {showQuantitySelection && selectedItems.length > 0 && (
            <div className="stock-card">
              <div className="stock-card-header">
                <div className="stock-card-title">
                  <h3>Set Quantities for Selected Items</h3>
                </div>
              </div>
              <div className="stock-card-content">
                <div className="stock-table-wrapper">
                  <table className="stock-readings-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Available Qty</th>
                        <th>Move/Clone Qty</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.itemName}</td>
                          <td>
                            <span
                              className={`stock-qty-badge ${
                                (item.qty || 0) === 0 ? "out-of-stock" : (item.qty || 0) < 5 ? "low-stock" : "in-stock"
                              }`}
                            >
                              {item.qty || 0}
                            </span>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={itemQuantities[item.id] || ""}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="stock-select-input"
                              style={{ width: "100px" }}
                              disabled={loading}
                              placeholder="Enter quantity"
                              title="Enter the quantity you want to move or clone"
                            />
                          </td>
                          <td>₹{item.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="stock-action-buttons">
                  <button
                    type="button"
                    onClick={() => setShowQuantitySelection(false)}
                    className="stock-cancel-button"
                    disabled={loading}
                  >
                    <FaUndo /> Back to Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {}
          {showQuantitySelection && (
            <div className="stock-card">
              <div className="stock-card-header">
                <div className="stock-card-title">
                  <h3>Destination Location</h3>
                </div>
              </div>
              <div className="stock-card-content">
                <div className="stock-date-picker-container">
                  <div className="stock-date-picker-wrapper">
                    <label>To Branch</label>
                    <select
                      value={toLocation}
                      onChange={handleDestinationBranchChange}
                      className="stock-select-input"
                      required
                      disabled={loading}
                    >
                      <option value="">Select Destination Branch</option>
                      {branches
                        .filter((branch) => branch.name !== branchName)
                        .map((branch) => (
                          <option key={branch.id} value={branch.name}>
                            {branch.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {}
          {showQuantitySelection && toLocation && (
            <div className="stock-action-buttons">
              <button
                type="button"
                onClick={handleMove}
                className="stock-save-button"
                disabled={loading || selectedItems.length === 0 || !toLocation}
              >
                {loading ? (
                  <>
                    <div className="stock-loading-spinner" style={{ width: "16px", height: "16px" }}></div>
                    Moving...
                  </>
                ) : (
                  <>
                    <MdOutlineFileDownloadDone /> Move Items (
                    {Object.values(itemQuantities).reduce((sum, qty) => sum + (qty || 0), 0)} total)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClone}
                className="stock-save-button"
                style={{ backgroundColor: "#10b981" }}
                disabled={loading || selectedItems.length === 0 || !toLocation}
              >
                {loading ? (
                  <>
                    <div className="stock-loading-spinner" style={{ width: "16px", height: "16px" }}></div>
                    Cloning...
                  </>
                ) : (
                  <>
                    <FaCopy /> Clone Items ({Object.values(itemQuantities).reduce((sum, qty) => sum + (qty || 0), 0)}{" "}
                    total)
                  </>
                )}
              </button>

              <button type="button" onClick={handleReset} className="stock-cancel-button" disabled={loading}>
                <FaUndo /> Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MoveStock
