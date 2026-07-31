import { useState, useEffect } from "react"
import { db } from "../../services/authservice"
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from "firebase/firestore"
import { FaTimes, FaPlus, FaSave, FaTrash, FaMoneyBillWave } from "react-icons/fa"
import { MdAttachMoney, MdDateRange, MdBusiness } from "react-icons/md"
import "react-toastify/dist/ReactToastify.css"
import "../../styles/inventoryTracking.css"
import Popup from "../common/Popup"
import { usePopup } from "../../hooks/usePopup"

const AddExpense = () => {
  const { popup, showSuccess, showError, showInfo } = usePopup()
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [expenses, setExpenses] = useState([{ id: Date.now(), name: "", amount: "", date: "" }])
  const [loading, setLoading] = useState(false)
  const [isEditingExisting, setIsEditingExisting] = useState(false)
  const [existingExpenseDocId, setExistingExpenseDocId] = useState(null)

  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i))

  useEffect(() => {
    fetchBranches()
  }, [])

  useEffect(() => {
    if (selectedBranch && selectedMonth && selectedYear) {
      fetchExistingExpenses()
    } else {
      setExpenses([{ id: Date.now(), name: "", amount: "", date: "" }])
      setIsEditingExisting(false)
      setExistingExpenseDocId(null)
    }
  }, [selectedBranch, selectedMonth, selectedYear])

  const fetchBranches = async () => {
    try {
      const branchesCollection = collection(db, "branches")
      const branchSnapshot = await getDocs(branchesCollection)
      const branchList = branchSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }))
      setBranches(branchList.sort((a, b) => a.name.localeCompare(b.name)))
    } catch (error) {
      console.error("Error fetching branches:", error)
      showError("Error Loading Branches", `Failed to fetch branches: ${error.message}. Please refresh and try again.`)
    }
  }

  const fetchExistingExpenses = async () => {
    setLoading(true)
    try {
      const q = query(
        collection(db, "monthlyExpenses"),
        where("branchName", "==", selectedBranch),
        where("month", "==", selectedMonth),
        where("year", "==", selectedYear),
      )
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data()
        setExpenses(docData.expenses || [])
        setExistingExpenseDocId(querySnapshot.docs[0].id)
        setIsEditingExisting(true)
        showInfo("Existing Expenses Loaded", "Existing expenses loaded for editing. You can modify and save them.")
      } else {
        setExpenses([{ id: Date.now(), name: "", amount: "", date: "" }])
        setIsEditingExisting(false)
        setExistingExpenseDocId(null)
      }
    } catch (error) {
      console.error("Error fetching existing expenses:", error)
      showError("Error Loading Expenses", `Failed to fetch existing expenses: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const addExpenseRow = () => {
    setExpenses([...expenses, { id: Date.now(), name: "", amount: "", date: "" }])
  }

  const removeExpenseRow = (id) => {
    setExpenses(expenses.filter((expense) => expense.id !== id))
  }

  const handleExpenseChange = (id, field, value) => {
    setExpenses(expenses.map((expense) => (expense.id === id ? { ...expense, [field]: value } : expense)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (!selectedBranch || !selectedMonth || !selectedYear) {
      showError("Missing Information", "Please select branch, month, and year before saving expenses.")
      setLoading(false)
      return
    }

    const cleanedExpenses = expenses
      .filter((exp) => exp.name && exp.amount)
      .map((exp) => ({
        name: exp.name.trim(),
        amount: Number.parseFloat(exp.amount),
        date: exp.date || new Date().toISOString().split("T")[0],
      }))

    if (cleanedExpenses.length === 0) {
      showError("No Valid Expenses", "Please add at least one valid expense with name and amount.")
      setLoading(false)
      return
    }

    const totalAmount = cleanedExpenses.reduce((sum, exp) => sum + exp.amount, 0)

    const expenseData = {
      branchName: selectedBranch,
      month: selectedMonth,
      year: selectedYear,
      expenses: cleanedExpenses,
      totalAmount: totalAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    try {
      if (isEditingExisting && existingExpenseDocId) {
        const expenseDocRef = doc(db, "monthlyExpenses", existingExpenseDocId)
        await updateDoc(expenseDocRef, expenseData)
        showSuccess("Expenses Updated Successfully", `${cleanedExpenses.length} expenses updated for ${selectedBranch} - Total: ₹${totalAmount.toFixed(2)}`)
      } else {
        await addDoc(collection(db, "monthlyExpenses"), expenseData)
        showSuccess("Expenses Added Successfully", `${cleanedExpenses.length} expenses added for ${selectedBranch} - Total: ₹${totalAmount.toFixed(2)}`)
      }
      
      setExpenses([{ id: Date.now(), name: "", amount: "", date: "" }])
      setSelectedBranch("")
      setSelectedMonth("")
      setSelectedYear("")
      setIsEditingExisting(false)
      setExistingExpenseDocId(null)
    } catch (error) {
      console.error("Error saving expenses:", error)
      showError("Save Failed", `Failed to save expenses: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const getTotalAmount = () => {
    return expenses.filter((exp) => exp.amount).reduce((sum, exp) => sum + Number.parseFloat(exp.amount || 0), 0)
  }

  if (loading && !selectedBranch) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Loading branches...</p>
      </div>
    )
  }

  return (
    <div className="stock-readings-container">
      <Popup {...popup} />

      {}
      <div className="stock-page-header">
        <h2>{isEditingExisting ? "Edit Monthly Expenses" : "Add Monthly Expenses"}</h2>
        <p>
          {isEditingExisting
            ? "Modify existing expenses for the selected month"
            : "Add new monthly expenses for a branch"}
        </p>
      </div>

      {}
      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Select Branch and Period</h3>
          </div>
        </div>
        <div className="stock-card-content">
          <div className="stock-date-picker-container">
            <div className="stock-date-picker-wrapper">
              <label>Branch *</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="stock-select-input"
                required
              >
                <option value="">-- Select Branch --</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="stock-date-picker-wrapper">
              <label>Month *</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="stock-select-input"
                required
              >
                <option value="">-- Select Month --</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="stock-date-picker-wrapper">
              <label>Year *</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="stock-select-input"
                required
              >
                <option value="">-- Select Year --</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {}
      {selectedBranch && selectedMonth && selectedYear && (
        <div className="inventory-summary">
          <div className="summary-card">
            <div className="summary-icon stock">
              <MdBusiness />
            </div>
            <div className="summary-content">
              <h4>Branch</h4>
              <span className="summary-count">{selectedBranch}</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon small-printer">
              <MdDateRange />
            </div>
            <div className="summary-content">
              <h4>Period</h4>
              <span className="summary-count">
                {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
              </span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon asset">
              <FaMoneyBillWave />
            </div>
            <div className="summary-content">
              <h4>Total Expenses</h4>
              <span className="summary-count">₹{getTotalAmount().toFixed(2)}</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon large-printer">
              <MdAttachMoney />
            </div>
            <div className="summary-content">
              <h4>Expense Items</h4>
              <span className="summary-count">{expenses.filter((exp) => exp.name && exp.amount).length}</span>
            </div>
          </div>
        </div>
      )}

      {}
      {selectedBranch && selectedMonth && selectedYear && (
        <form onSubmit={handleSubmit}>
          <div className="stock-card">
            <div className="stock-card-header">
              <div className="stock-card-title">
                <h3>Expense Details</h3>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={addExpenseRow}
                  className="export-btn csv-btn"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor: "#28a745",
                    color: "white",
                  }}
                >
                  <FaPlus /> Add Expense
                </button>
                {expenses.some((exp) => exp.name && exp.amount) && (
                  <button
                    type="submit"
                    className="export-btn xlsx-btn"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 16px",
                      fontSize: "14px",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: "#007bff",
                      color: "white",
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div
                          className="stock-loading-spinner"
                          style={{ width: "16px", height: "16px", display: "inline-block" }}
                        ></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave /> {isEditingExisting ? "Update" : "Save"}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            <div className="stock-card-content">
              {expenses.length === 0 ? (
                <div className="no-data-message">
                  <FaMoneyBillWave size={48} />
                  <h3>No expenses added</h3>
                  <p>Click "Add Expense" to start adding expenses for this month</p>
                </div>
              ) : (
                <div className="stock-table-wrapper">
                  <table className="stock-readings-table">
                    <thead>
                      <tr>
                        <th>Expense Name</th>
                        <th>Amount (₹)</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense, index) => (
                        <tr key={expense.id}>
                          <td>
                            <input
                              type="text"
                              value={expense.name}
                              onChange={(e) => handleExpenseChange(expense.id, "name", e.target.value)}
                              className="stock-select-input"
                              placeholder="e.g., Rent, Electricity Bill"
                              required
                              style={{ width: "100%", margin: 0 }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={expense.amount}
                              onChange={(e) => handleExpenseChange(expense.id, "amount", e.target.value)}
                              className="stock-select-input"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              required
                              style={{ width: "100%", margin: 0 }}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={expense.date}
                              onChange={(e) => handleExpenseChange(expense.id, "date", e.target.value)}
                              className="stock-select-input"
                              style={{ width: "100%", margin: 0 }}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => removeExpenseRow(expense.id)}
                              className="export-btn pdf-btn"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "6px 12px",
                                fontSize: "12px",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                backgroundColor: "#dc3545",
                                color: "white",
                              }}
                              title="Remove Expense"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {}
      {loading && selectedBranch && (
        <div className="stock-card">
          <div className="stock-card-content">
            <div className="stock-loading-container">
              <div className="stock-loading-spinner"></div>
              <p>Loading existing expenses...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddExpense
