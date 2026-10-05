"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import api from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import {
  FaCalendarAlt,
  FaSave,
  FaRedo,
  FaExclamationTriangle,
  FaEdit,
  FaTimes,
} from "react-icons/fa"
import "../../styles/totalAmountDisplay.css"
import "../../styles/addAssets.css"
import CalendarSelect from "../common/CalendarSelect.jsx"

const TotalAmountList = () => {
  const { currentUser } = useAuth()
  const initialRows = useMemo(
    () => [
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
    ],
    []
  )

  const [rows, setRows] = useState(initialRows)
  const [date, setDate] = useState("")
  const [branchName, setBranchName] = useState("")
  const [userId, setUserId] = useState(null)
  const [totalAmount, setTotalAmount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasExistingData, setHasExistingData] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [docId, setDocId] = useState(null)

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

  const calculateGrandTotal = useCallback((currentRows) => {
    const totalBusinessRow = currentRows.find((r) => r.key === "totalBusiness")
    const discountRow = currentRows.find((r) => r.key === "discount")
    const expenseRow = currentRows.find((r) => r.key === "expense")

    const totalBusiness = totalBusinessRow?.amount || 0
    const discount = discountRow?.amount || 0
    const expense = expenseRow?.amount || 0

    return Math.max(0, totalBusiness - discount - expense)
  }, [])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        if (currentUser) {
          setUserId(currentUser.id || currentUser.uid)
          if (currentUser.branch) {
            setBranchName(currentUser.branch)
          } else {
            const res = await api.get("/users/profile")
            const userData = res.data?.data || res.data
            setBranchName(userData.branch || "All Branches")
          }
        } else {
          const res = await api.get("/users/profile")
          const userData = res.data?.data || res.data
          setUserId(userData.id || userData._id)
          setBranchName(userData.branch || "All Branches")
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError(`Failed to fetch user data`)
        toast.error(`Failed to fetch user data`)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUserData()
  }, [currentUser])

  const fetchReadingsForDate = useCallback(async () => {
    if (!date) return

    try {
      setIsLoading(true)
      const params = { date }
      if (branchName && branchName !== "All Branches") {
        params.branchName = branchName
      }
      const res = await api.get("/total-amounts", { params })
      const dataList = res.data?.data || res.data || []
      const existingDoc = Array.isArray(dataList) ? dataList[0] : dataList

      if (existingDoc && (existingDoc.id || existingDoc._id)) {
        setDocId(existingDoc.id || existingDoc._id)
        setHasExistingData(true)
        setIsEditing(false)

        const savedRows = existingDoc.rows || []
        const updatedRows = initialRows.map((row) => {
          const savedRow = savedRows.find((r) => r.key === row.key)
          if (row.isCalculated) return row
          return savedRow ? { ...row, amount: savedRow.amount } : row
        })

        const calculatedRows = calculateBusinessTotals(updatedRows)
        setRows(calculatedRows)
      } else {
        setDocId(null)
        setHasExistingData(false)
        setIsEditing(false)
        setRows(calculateBusinessTotals(initialRows))
      }
    } catch (err) {
      console.error("Error fetching total amounts:", err)
      setHasExistingData(false)
      setIsEditing(false)
      setRows(calculateBusinessTotals(initialRows))
    } finally {
      setIsLoading(false)
    }
  }, [date, branchName, calculateBusinessTotals, initialRows])

  useEffect(() => {
    fetchReadingsForDate()
  }, [fetchReadingsForDate])

  useEffect(() => {
    const calculatedRows = calculateBusinessTotals(rows)
    if (JSON.stringify(calculatedRows) !== JSON.stringify(rows)) {
      setRows(calculatedRows)
    }
    setTotalAmount(calculateGrandTotal(calculatedRows))
  }, [rows, calculateBusinessTotals, calculateGrandTotal])

  const handleInputChange = (key, value) => {
    if (!date) {
      toast.warning("Please select a date first")
      return
    }

    const rowToUpdate = rows.find((row) => row.key === key)
    if (rowToUpdate?.isCalculated) return

    const cleanedValue = parseFloat(value) || 0

    const updatedRows = rows.map((row) =>
      row.key === key ? { ...row, amount: cleanedValue } : row
    )

    setRows(updatedRows)
  }

  const handleEditToggle = () => {
    setIsEditing(!isEditing)
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (!date) {
      toast.error("Please select a date first")
      return
    }

    try {
      setIsLoading(true)

      const payload = {
        userId,
        branchName: branchName || "Main",
        date,
        rows: rows.map((row) => ({
          itemName: row.itemName,
          amount: row.amount,
          key: row.key,
          isCalculated: row.isCalculated || false,
        })),
        totalAmount,
      }

      if (hasExistingData && docId) {
        await api.put(`/total-amounts/${docId}`, payload)
        toast.success("Amounts updated successfully")
      } else {
        const res = await api.post("/total-amounts", payload)
        const created = res.data?.data || res.data
        if (created?.id || created?._id) {
          setDocId(created.id || created?._id)
        }
        setHasExistingData(true)
        toast.success("Amounts saved successfully")
      }
      setIsEditing(false)
      await fetchReadingsForDate()
    } catch (error) {
      console.error("Error saving amounts:", error)
      toast.error(`Failed to save amounts: ${error.response?.data?.message || error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setRows(initialRows)
    toast.success("All amounts have been reset")
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  if (isLoading && !branchName) {
    return (
      <div className="add-assets-page-container">
        <div className="admin-loading-container" style={{ maxWidth: "480px", margin: "60px auto" }}>
          <div className="admin-loading-spinner"></div>
          <p>Loading branch data...</p>
        </div>
      </div>
    )
  }

  if (error && !branchName) {
    return (
      <div className="add-assets-page-container">
        <div className="add-assets-card" style={{ textAlign: "center", padding: "40px" }}>
          <FaExclamationTriangle style={{ fontSize: "2.5rem", color: "#ef4444", marginBottom: "1rem" }} />
          <h3 style={{ color: "#1e293b", margin: "0 0 8px 0" }}>Error Loading Data</h3>
          <p style={{ color: "#64748b", marginBottom: "20px" }}>{error}</p>
          <button onClick={() => window.location.reload()} className="add-assets-btn add-assets-btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="add-assets-page-container">
      <ToastContainer />

      {/* Modern Banner Header (No illustration) */}
      <div
        className="add-assets-banner"
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.03) 100%)",
          borderRadius: "16px",
          border: "1px solid rgba(16, 185, 129, 0.2)",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>
            Total Amount <span style={{ color: "#059669" }}>Readings</span> {branchName && <span style={{ fontSize: "1.2rem", fontWeight: 500, color: "#64748b" }}>({branchName})</span>}
          </h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.95rem" }}>
            View and edit daily printer and business totals for selected date
          </p>
        </div>
      </div>

      {/* Date Filter Card */}
      <div
        className="add-assets-card"
        style={{
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: "16px",
        }}
      >
        <div style={{ flex: "1 1 240px", maxWidth: "320px" }}>
          <label
            htmlFor="amount-date"
            style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
          >
            Select Date
          </label>
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
        hasExistingData ? (
          <div className="add-assets-card" style={{ padding: "0", overflow: "hidden" }}>
            <div
              style={{
                padding: "16px 24px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
                  Readings for {date}
                </h3>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "9999px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: isEditing ? "#fef3c7" : "#e0f2fe",
                    color: isEditing ? "#92400e" : "#0369a1",
                    border: `1px solid ${isEditing ? "#fde68a" : "#bae6fd"}`,
                  }}
                >
                  <FaExclamationTriangle style={{ fontSize: "0.75rem" }} />
                  {isEditing ? "Editing Mode" : "Viewing Mode"}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={handleEditToggle}
                    disabled={isLoading}
                    className="add-assets-btn"
                    style={{
                      height: "38px",
                      padding: "0 16px",
                      backgroundColor: "#059669",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <FaEdit /> Edit
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isLoading}
                      className="add-assets-btn"
                      style={{
                        height: "38px",
                        padding: "0 16px",
                        backgroundColor: "#059669",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <FaSave /> Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleEditToggle}
                      disabled={isLoading}
                      className="add-assets-btn"
                      style={{
                        height: "38px",
                        padding: "0 14px",
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <FaTimes /> Cancel
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading || !isEditing}
                  style={{
                    height: "38px",
                    padding: "0 14px",
                    backgroundColor: "#f8fafc",
                    color: isEditing ? "#ef4444" : "#94a3b8",
                    border: `1px solid ${isEditing ? "#fecaca" : "#e2e8f0"}`,
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: isEditing ? "pointer" : "not-allowed",
                  }}
                >
                  <FaRedo /> Reset
                </button>
              </div>
            </div>

            <div style={{ padding: "16px 24px", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px 14px", background: "#f8fafc", color: "#334155", fontSize: "0.85rem", fontWeight: 700, borderBottom: "2px solid #e2e8f0" }}>
                      Items
                    </th>
                    <th style={{ textAlign: "right", padding: "12px 14px", background: "#f8fafc", color: "#334155", fontSize: "0.85rem", fontWeight: 700, borderBottom: "2px solid #e2e8f0", width: "240px" }}>
                      Total Amount (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: row.isCalculated ? "#f8fafc" : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "11px 14px",
                          fontSize: "0.88rem",
                          fontWeight: row.isCalculated ? 700 : 500,
                          color: row.isCalculated ? "#0f172a" : "#334155",
                        }}
                      >
                        {row.itemName}
                      </td>
                      <td style={{ padding: "8px 14px", textAlign: "right" }}>
                        {row.isCalculated ? (
                          <span
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 700,
                              color: "#059669",
                              display: "inline-block",
                              padding: "4px 8px",
                            }}
                          >
                            {formatCurrency(row.amount)}
                          </span>
                        ) : (
                          <input
                            type="number"
                            value={row.amount}
                            onChange={(e) => handleInputChange(row.key, e.target.value)}
                            disabled={!isEditing || isLoading}
                            min="0"
                            style={{
                              width: "140px",
                              height: "36px",
                              padding: "0 10px",
                              textAlign: "right",
                              borderRadius: "6px",
                              border: isEditing ? "1px solid #059669" : "1px solid #cbd5e1",
                              backgroundColor: isEditing ? "#fff" : "#f8fafc",
                              color: "#1e293b",
                              fontWeight: 600,
                              fontSize: "0.9rem",
                              outline: "none",
                              cursor: isEditing ? "text" : "not-allowed",
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f0fdf4", borderTop: "2px solid #86efac" }}>
                    <td style={{ padding: "14px", fontWeight: 700, fontSize: "1rem", color: "#166534" }}>
                      Grand Total (After Deductions)
                    </td>
                    <td style={{ padding: "14px", textAlign: "right", fontWeight: 800, fontSize: "1.15rem", color: "#166534" }}>
                      {formatCurrency(totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="add-assets-card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <FaExclamationTriangle style={{ fontSize: "2rem", color: "#94a3b8", marginBottom: "12px" }} />
            <p style={{ color: "#64748b", fontSize: "0.95rem", margin: 0 }}>
              No data available for the selected date.
            </p>
          </div>
        )
      ) : (
        <div className="add-assets-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <FaCalendarAlt style={{ fontSize: "2rem", color: "#94a3b8", marginBottom: "12px" }} />
          <p style={{ color: "#64748b", fontSize: "0.95rem", margin: 0 }}>
            Please select a date to view or edit total amount readings.
          </p>
        </div>
      )}
    </div>
  )
}

export default TotalAmountList
