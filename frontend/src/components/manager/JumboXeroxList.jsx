import { useState, useEffect, useCallback, useMemo } from "react"
import api from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { FaCalendarAlt, FaSave, FaRedo, FaExclamationTriangle, FaEdit } from "react-icons/fa"
import "../../styles/totalAmountDisplay.css"
import CalendarSelect from "../common/CalendarSelect.jsx"

const JumboXeroxList = () => {
  const { currentUser } = useAuth()

  // Total Amount Initial Data
  const initialRows = useMemo(() => [
    { itemName: "TOTAL CANON 8986", amount: 0, key: "canon8986_1" },
    { itemName: "TOTAL CANON 8986", amount: 0, key: "canon8986_2" },
    { itemName: "TOTAL CANON V700", amount: 0, key: "canonV700" },
    { itemName: "JUMBO XEROX", amount: 0, key: "jumboXerox" },
    { itemName: "ITEMS", amount: 0, key: "items" },
    { itemName: "DNP PHOTO PRINTING", amount: 0, key: "dnpPhotoPrinting" },
    { itemName: "DIGITAL BUSINESS", amount: 0, key: "digitalBusiness" },
    { itemName: "GIFT BUSINESS", amount: 0, key: "giftBusiness" },
    {
      itemName: "TOTAL BUSINESS",
      amount: 0,
      key: "totalBusiness",
      isCalculated: true,
    },
    { itemName: "DISCOUNT", amount: 0, key: "discount" },
    { itemName: "PAYTM & QR MACHINE", amount: 0, key: "paytmQr" },
    { itemName: "EXPENSE", amount: 0, key: "expense" },
    {
      itemName: "CASH AS PER ACCOUNTS",
      amount: 0,
      key: "cashAsPerAccounts",
      isCalculated: true,
    },
    { itemName: "CASH IN HAND", amount: 0, key: "cashInHand" },
  ], [])

  // Jumbo Xerox Initial Data
  const initialJumboRows = useMemo(() => [
    { type: "COLOUR", size: "A0", qty: 0, amount: 0 },
    { type: "COLOUR", size: "A1", qty: 0, amount: 0 },
    { type: "COLOUR", size: "A2", qty: 0, amount: 0 },
    { type: "B/W", size: "A0", qty: 0, amount: 0 },
    { type: "B/W", size: "A1", qty: 0, amount: 0 },
    { type: "B/W", size: "A2", qty: 0, amount: 0 },
    { type: "SCAN", size: "A0", qty: 0, amount: 0 },
    { type: "SCAN", size: "A1", qty: 0, amount: 0 },
    { type: "SCAN", size: "A2", qty: 0, amount: 0 },
  ], [])

  // Jumbo Counter Initial Data
  const initialJumboCounter = useMemo(() => ({
    start: 0,
    end: 0,
    sftPrinted: "0.00",
  }), [])

  const [rows, setRows] = useState(initialRows)
  const [jumboRows, setJumboRows] = useState(initialJumboRows)
  const [jumboCounter, setJumboCounter] = useState(initialJumboCounter)
  const [date, setDate] = useState("")
  const [branchName, setBranchName] = useState("")
  const [userId, setUserId] = useState(null)
  const [totalAmount, setTotalAmount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasExistingTotalAmountData, setHasExistingTotalAmountData] = useState(false)
  const [hasExistingJumboData, setHasExistingJumboData] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [docId, setDocId] = useState(null)

  // Calculate business totals
  const calculateBusinessTotals = useCallback((currentRows) => {
    const businessComponents = [
      "canon8986_1",
      "canon8986_2",
      "canonV700",
      "jumboXerox",
      "items",
      "dnpPhotoPrinting",
      "digitalBusiness",
      "giftBusiness",
    ]

    const totalBusiness = businessComponents.reduce((sum, key) => {
      const componentRow = currentRows.find((r) => r.key === key)
      return sum + (componentRow?.amount || 0)
    }, 0)

    const deductions = ["discount", "paytmQr", "expense"].reduce((sum, key) => {
      const deductionRow = currentRows.find((r) => r.key === key)
      return sum + (deductionRow?.amount || 0)
    }, 0)

    const cashAsPerAccounts = totalBusiness - deductions

    return currentRows.map((row) => {
      if (row.key === "totalBusiness") {
        return { ...row, amount: totalBusiness }
      } else if (row.key === "cashAsPerAccounts") {
        return { ...row, amount: Math.max(0, cashAsPerAccounts) }
      }
      return row
    })
  }, [])

  // Calculate Jumbo Xerox totals
  const calculateJumboTotals = useCallback((currentJumboRows) => {
    return currentJumboRows.reduce(
      (acc, row) => {
        acc.qty += row.qty || 0
        acc.amount += row.amount || 0
        return acc
      },
      { qty: 0, amount: 0 }
    )
  }, [])

  // Calculate grand total
  const calculateGrandTotal = useCallback((currentRows) => {
    const totalBusinessRow = currentRows.find((r) => r.key === "totalBusiness")
    const discountRow = currentRows.find((r) => r.key === "discount")
    const expenseRow = currentRows.find((r) => r.key === "expense")

    const totalBusiness = totalBusinessRow?.amount || 0
    const discount = discountRow?.amount || 0
    const expense = expenseRow?.amount || 0

    return Math.max(0, totalBusiness - discount - expense)
  }, [])

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        if (currentUser) {
          setUserId(currentUser.id || currentUser._id || currentUser.uid)
          setBranchName(currentUser.branch || "")
        } else {
          const res = await api.get("/auth/me")
          const userData = res.data?.data?.user
          if (userData) {
            setUserId(userData.id || userData._id)
            setBranchName(userData.branch || "")
          } else {
            setError("User not authenticated")
            toast.error("User not authenticated")
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError("Failed to fetch user data")
        toast.error("Failed to fetch user data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchUserData()
  }, [currentUser])

  // Load data when date changes
  useEffect(() => {
    if (!date || !branchName) return

    const loadData = async () => {
      try {
        const [totalAmountRes, jumboRes] = await Promise.all([
          api.get("/total-amounts", { params: { branchName, date } }).catch(() => ({ data: { data: [] } })),
          api.get("/jumbo-xerox/readings", { params: { branchName, date } }).catch(() => ({ data: { data: [] } })),
        ])

        const totalDocs = totalAmountRes.data?.data || []
        if (totalDocs.length > 0) {
          const docData = totalDocs[0]
          setHasExistingTotalAmountData(true)

          const updatedRows = initialRows.map((row) => {
            const savedRow = docData.rows?.find((r) => r.key === row.key)
            if (row.isCalculated) return row
            return savedRow ? { ...row, amount: savedRow.amount } : row
          })

          setRows(calculateBusinessTotals(updatedRows))
        } else {
          setHasExistingTotalAmountData(false)
          setRows(calculateBusinessTotals(initialRows))
        }

        const jumboDocs = jumboRes.data?.data || []
        if (jumboDocs.length > 0) {
          const docData = jumboDocs[0]
          setDocId(docData.id || docData._id)
          setHasExistingJumboData(true)
          setIsEditing(false)
          setJumboRows(docData.rows || initialJumboRows)
          setJumboCounter(docData.jumboCounter || initialJumboCounter)
        } else {
          setHasExistingJumboData(false)
          setIsEditing(true)
          setJumboRows(initialJumboRows)
          setJumboCounter(initialJumboCounter)
        }
      } catch (error) {
        console.error("Error loading Jumbo Xerox List data:", error)
      }
    }

    loadData()
  }, [date, branchName, calculateBusinessTotals, initialRows, initialJumboRows, initialJumboCounter])

  // Recalculate totals when data changes
  useEffect(() => {
    const calculatedRows = calculateBusinessTotals(rows)
    if (JSON.stringify(calculatedRows) !== JSON.stringify(rows)) {
      setRows(calculatedRows)
    }
    setTotalAmount(calculateGrandTotal(calculatedRows))
  }, [rows, calculateBusinessTotals, calculateGrandTotal])

  // Handle Total Amount input changes
  const handleInputChange = (key, value) => {
    // Total Amount readings are always read-only
    toast.warning("Total Amount readings are managed from another page and cannot be edited here")
    return
  }

  // Handle Jumbo Xerox input changes
  const handleJumboInputChange = (index, field, value) => {
    if (!date) {
      toast.warning("Please select a date first")
      return
    }

    if (!isEditing) {
      toast.warning("Please click Edit to modify data")
      return
    }

    const cleanedValue = Number.parseFloat(value.replace(/[^0-9.]/g, "")) || 0
    const updatedJumboRows = [...jumboRows]
    updatedJumboRows[index][field] = cleanedValue
    setJumboRows(updatedJumboRows)

    // Update Jumbo Xerox total in main rows
    const jumboTotal = calculateJumboTotals(updatedJumboRows).amount
    const updatedRows = rows.map((row) => (row.key === "jumboXerox" ? { ...row, amount: jumboTotal } : row))
    setRows(updatedRows)
  }

  // Handle Jumbo Counter changes
  const handleCounterChange = (field, value) => {
    if (!date) {
      toast.warning("Please select a date first")
      return
    }

    if (!isEditing) {
      toast.warning("Please click Edit to modify data")
      return
    }

    const cleanedValue = field === "sftPrinted" 
      ? value 
      : Number.parseFloat(value.replace(/[^0-9.]/g, "")) || 0

    const updatedCounter = { ...jumboCounter, [field]: cleanedValue }
    
    // Calculate sftPrinted if both start and end are provided
    if ((field === "start" || field === "end") && updatedCounter.start && updatedCounter.end) {
      updatedCounter.sftPrinted = Math.abs(updatedCounter.end - updatedCounter.start).toFixed(2)
    }

    setJumboCounter(updatedCounter)
  }

  // Toggle edit mode
  const handleEditToggle = () => {
    setIsEditing(!isEditing)
  }

  // Submit all data
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!date) {
      toast.error("Please select a date first")
      return
    }

    try {
      setIsLoading(true)

      const jumboData = {
        userId,
        branchName,
        date,
        rows: jumboRows,
        jumboCounter,
        totalQty: calculateJumboTotals(jumboRows).qty,
        totalAmount: calculateJumboTotals(jumboRows).amount,
      }

      if (hasExistingJumboData && docId) {
        await api.put(`/jumbo-xerox/readings/${docId}`, jumboData)
        toast.success("Jumbo Xerox data updated successfully")
      } else {
        const res = await api.post("/jumbo-xerox/readings", jumboData)
        const created = res.data?.data
        if (created) {
          setDocId(created.id || created._id)
        }
        toast.success("Jumbo Xerox data saved successfully")
        setHasExistingJumboData(true)
      }

      setIsEditing(false)
    } catch (error) {
      console.error("Error saving data:", error)
      toast.error(`Failed to save data: ${error.response?.data?.message || error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset all forms
  const handleReset = () => {
    if (hasExistingJumboData) {
      // Reset to the original loaded data
      setIsEditing(false)
    } else {
      // Reset to initial state
      setJumboRows(initialJumboRows)
      setJumboCounter(initialJumboCounter)
    }
    toast.success("Jumbo Xerox data has been reset")
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Calculate totals
  const jumboTotals = calculateJumboTotals(jumboRows)

  if (isLoading && !branchName) {
    return (
      <div className="total-loading-container">
        <div className="total-loading-spinner"></div>
        <p>Loading branch data...</p>
      </div>
    )
  }

  if (error && !branchName) {
    return (
      <div className="total-error-container">
        <FaExclamationTriangle className="total-error-icon" />
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="total-retry-button">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="jumbo-main-container">
      <ToastContainer />
      <div className="jumbo-page-header">
        <h2>Jumbo Xerox Management for {branchName}</h2>
        <p>{hasExistingJumboData ? "View and edit" : "Add new"} Jumbo Xerox data</p>
      </div>

      <div className="jumbo-date-picker-container">
        <div className="jumbo-date-picker-wrapper">
          <label htmlFor="amount-date">Select Date</label>
          <CalendarSelect
            id="amount-date"
            value={date}
            onChange={(d, formatted, e) => setDate(e?.target?.value || formatted || "")}
            dateFormat="yyyy-MM-dd"
            maxDate={new Date()}
            placeholder="Select date"
            required
            triggerStyle={{ height: "42px" }}
          />
        </div>
      </div>

      {date ? (
        <>
          <form onSubmit={handleSubmit} className="jumbo-main-form">
            <div className="jumbo-tables-container">
              {/* Left Column - Total Amount Readings (Read-only) */}
              <div className="jumbo-table-column">
                <div className="jumbo-table-card">
                  <div className="jumbo-table-header">
                    <h3>Total Amount Readings</h3>
                    <div className="jumbo-readonly-badge">Read Only</div>
                  </div>
                  <div className="jumbo-table-content">
                    <table className="jumbo-readings-table">
                      <thead>
                        <tr>
                          <th>Items</th>
                          <th>Total Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => (
                          <tr key={index}>
                            <td className="jumbo-reading-type">{row.itemName}</td>
                            <td>
                              {row.isCalculated ? (
                                <div className="jumbo-calculated-value">{formatCurrency(row.amount)}</div>
                              ) : (
                                <input
                                  type="number"
                                  value={row.amount}
                                  onChange={(e) => handleInputChange(row.key, e.target.value)}
                                  className="jumbo-reading-input"
                                  disabled={true}
                                  min="0"
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="jumbo-total-row">
                          <td>Grand Total (After Deductions)</td>
                          <td className="jumbo-calculated-value">{formatCurrency(totalAmount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column - Jumbo Xerox Details and Counter */}
              <div className="jumbo-table-column">
                {/* Jumbo Xerox Details */}
                <div className="jumbo-table-card">
                  <div className="jumbo-table-header">
                    <h3>Jumbo Xerox Details</h3>
                    {hasExistingJumboData && (
                      <div className="jumbo-edit-toggle">
                        {!isEditing ? (
                          <button 
                            type="button" 
                            onClick={handleEditToggle} 
                            className="jumbo-edit-button"
                            disabled={isLoading}
                          >
                            <FaEdit /> Edit
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            onClick={handleEditToggle} 
                            className="jumbo-cancel-button"
                            disabled={isLoading}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="jumbo-table-content">
                    <table className="jumbo-readings-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Size</th>
                          <th>Quantity</th>
                          <th>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jumboRows.map((row, index) => (
                          <tr key={index}>
                            <td className="jumbo-reading-type">{row.type}</td>
                            <td className="jumbo-reading-type">{row.size}</td>
                            <td>
                              <input
                                type="number"
                                value={row.qty}
                                onChange={(e) => handleJumboInputChange(index, "qty", e.target.value)}
                                className="jumbo-reading-input"
                                disabled={isLoading || (hasExistingJumboData && !isEditing)}
                                min="0"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={row.amount}
                                onChange={(e) => handleJumboInputChange(index, "amount", e.target.value)}
                                className="jumbo-reading-input"
                                disabled={isLoading || (hasExistingJumboData && !isEditing)}
                                min="0"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="jumbo-total-row">
                          <td colSpan="2">Total</td>
                          <td className="jumbo-calculated-value">{jumboTotals.qty}</td>
                          <td className="jumbo-calculated-value">{formatCurrency(jumboTotals.amount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Jumbo Counter Section */}
                <div className="jumbo-table-card jumbo-counter-section">
                  <div className="jumbo-table-header">
                    <h3>Jumbo Counter Details</h3>
                  </div>
                  <div className="jumbo-table-content">
                    <div className="jumbo-counter-fields">
                      <div className="jumbo-counter-field">
                        <label>Start Counter</label>
                        <input
                          type="number"
                          value={jumboCounter.start}
                          onChange={(e) => handleCounterChange("start", e.target.value)}
                          className="jumbo-reading-input"
                          disabled={isLoading || (hasExistingJumboData && !isEditing)}
                          min="0"
                        />
                      </div>
                      <div className="jumbo-counter-field">
                        <label>End Counter</label>
                        <input
                          type="number"
                          value={jumboCounter.end}
                          onChange={(e) => handleCounterChange("end", e.target.value)}
                          className="jumbo-reading-input"
                          disabled={isLoading || (hasExistingJumboData && !isEditing)}
                          min="0"
                        />
                      </div>
                      <div className="jumbo-counter-field">
                        <label>SFT Printed</label>
                        <input
                          type="text"
                          value={jumboCounter.sftPrinted}
                          className="jumbo-reading-input"
                          disabled={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Button Group */}
            <div className="jumbo-button-group">
              {(isEditing || !hasExistingJumboData) && (
                <button 
                  type="submit" 
                  className="jumbo-save-button" 
                  disabled={isLoading}
                >
                  <FaSave /> {hasExistingJumboData ? "Update Data" : "Save Data"}
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="jumbo-reset-button"
                disabled={isLoading}
              >
                <FaRedo /> Reset
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="jumbo-select-date-message">
          <p>Please select a date to view and record data</p>
        </div>
      )}
    </div>
  )
}

export default JumboXeroxList