import { useState, useEffect } from "react"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "../../services/authservice"
import "../../styles/exportData.css"
import * as XLSX from "xlsx"
import Papa from "papaparse"
import jsPDF from "jspdf"
import "jspdf-autotable"
import "react-toastify/dist/ReactToastify.css"
import Popup from "../common/Popup"
import { usePopup } from "../../hooks/usePopup"

const ExportData = () => {
  const { popup, showSuccess, showError, showInfo } = usePopup()
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [data, setData] = useState([])
  const [expenseData, setExpenseData] = useState([])
  const [loading, setLoading] = useState(false)
  const [totals, setTotals] = useState({})

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const years = ["2023", "2024", "2025", "2026", "2027"]

  useEffect(() => {
    fetchBranches()
  }, [])

  useEffect(() => {
    if (selectedBranch && selectedMonth && selectedYear) {
      fetchData()
      fetchExpenseData()
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
      showError("Error Loading Branches", "Failed to load branch data. Please refresh the page and try again.")
    }
  }

  const fetchExpenseData = async () => {
    try {
      const monthNumber = months.indexOf(selectedMonth) + 1
      const monthString = monthNumber.toString().padStart(2, "0")

      const q = query(
        collection(db, "monthlyExpenses"),
        where("branchName", "==", selectedBranch),
        where("month", "==", monthString),
        where("year", "==", selectedYear),
      )

      const querySnapshot = await getDocs(q)
      const fetchedExpenseData = []

      querySnapshot.forEach((doc) => {
        const docData = doc.data()
        if (docData.expenses && Array.isArray(docData.expenses)) {
          fetchedExpenseData.push(...docData.expenses)
        }
      })

      setExpenseData(fetchedExpenseData)
    } catch (error) {
      console.error("Error fetching expense data:", error)
      showError("Error Loading Expenses", "Failed to load expense data. Please check your connection and try again.")
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const monthNumber = months.indexOf(selectedMonth) + 1
      const startDate = `${selectedYear}-${monthNumber.toString().padStart(2, "0")}-01`
      const endDate = `${selectedYear}-${monthNumber.toString().padStart(2, "0")}-31`

      console.log(startDate, endDate)

      const q = query(
        collection(db, "totalAmountReadings"),
        where("branchName", "==", selectedBranch),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        orderBy("date", "asc"),
      )

      const querySnapshot = await getDocs(q)
      const fetchedData = []

      querySnapshot.forEach((doc) => {
        const docData = doc.data()
        const processedData = processDocumentData(docData)
        fetchedData.push(processedData)
      })

      console.log(fetchedData)

      setData(fetchedData)
      calculateTotals(fetchedData)
    } catch (error) {
      console.error("Error fetching data:", error)
      showError("Error Loading Data", "Failed to load financial data. Please check your filters and try again.")
    } finally {
      setLoading(false)
    }
  }

  const processDocumentData = (docData) => {
    const rows = docData.rows || []
    const previousBalanceRows = docData.previousBalanceRows || []

    const getValueByKey = (key) => {
      const row = rows.find((r) => r.key === key)
      return row ? row.amount : 0
    }

    const totalBusiness = getValueByKey("totalBusiness")
    const discount = getValueByKey("discount")
    const upiCard = getValueByKey("upiCardPayments") + getValueByKey("bankTransfers")
    const cashAsPerAccounts = getValueByKey("cashAsPerAccounts")
    const cashInHand = getValueByKey("cashInHand")
    const paymentToBeCollected = getValueByKey("paymentToBeCollected")

    const previousBalance = previousBalanceRows.length > 0 ? previousBalanceRows[0] : {}
    const clearBalance = previousBalance.availableBalance || 0
    const clearDate = previousBalance.date || ""

    return {
      date: docData.date,
      totalBusiness,
      discount,
      upiCard,
      cashAsPerAccounts,
      cashInHand,
      balance: paymentToBeCollected,
      clearBalance,
      clearDate,
    }
  }

  const calculateTotals = (dataArray) => {
    const totals = dataArray.reduce((acc, item) => {
      acc.totalBusiness = (acc.totalBusiness || 0) + item.totalBusiness
      acc.discount = (acc.discount || 0) + item.discount
      acc.upiCard = (acc.upiCard || 0) + item.upiCard
      acc.cashAsPerAccounts = (acc.cashAsPerAccounts || 0) + item.cashAsPerAccounts
      acc.cashInHand = (acc.cashInHand || 0) + item.cashInHand
      acc.balance = (acc.balance || 0) + item.balance
      acc.clearBalance = (acc.clearBalance || 0) + item.clearBalance
      return acc
    }, {})

    totals.balanceAmount = totals.balance - totals.clearBalance
    totals.totalExpenses = expenseData.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    setTotals(totals)
  }

  useEffect(() => {
    if (data.length > 0) {
      calculateTotals(data)
    }
  }, [expenseData, data])

  const exportToCSV = () => {
    try {
      const csvData = data.map((item) => ({
        Date: item.date,
        "Total Business": item.totalBusiness,
        Discount: item.discount,
        "UPI & Card": item.upiCard,
        "Cash as per Accounts": item.cashAsPerAccounts,
        "Cash in Hand": item.cashInHand,
        "Payment to be Collected": item.balance,
        Balance: item.balance,
        "Clear Balance": item.clearBalance,
        "Clear Date": item.clearDate,
      }))

      
      csvData.push({
        Date: "TOTAL",
        "Total Business": totals.totalBusiness,
        Discount: totals.discount,
        "UPI & Card": totals.upiCard,
        "Cash as per Accounts": totals.cashAsPerAccounts,
        "Cash in Hand": totals.cashInHand,
        "Payment to be Collected": totals.balance,
        Balance: totals.balance,
        "Clear Balance": totals.clearBalance,
        "Clear Date": "",
      })

      
      if (expenseData.length > 0) {
        csvData.push({})
        csvData.push({ Date: "EXPENSES" })
        expenseData.forEach((expense) => {
          csvData.push({
            Date: expense.date || "",
            "Total Business": expense.name,
            Discount: expense.amount,
            "UPI & Card": "",
            "Cash as per Accounts": "",
            "Cash in Hand": "",
            "Payment to be Collected": "",
            Balance: "",
            "Clear Balance": "",
            "Clear Date": "",
          })
        })
        csvData.push({
          Date: "TOTAL EXPENSES",
          "Total Business": "",
          Discount: totals.totalExpenses,
          "UPI & Card": "",
          "Cash as per Accounts": "",
          "Cash in Hand": "",
          "Payment to be Collected": "",
          Balance: "",
          "Clear Balance": "",
          "Clear Date": "",
        })
      }

      const csv = Papa.unparse(csvData)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `export_data_${selectedBranch}_${selectedMonth}_${selectedYear}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      showSuccess("CSV Export Successful", `Data exported successfully for ${selectedBranch} - ${selectedMonth} ${selectedYear}`)
    } catch (error) {
      console.error("Error exporting CSV:", error)
      showError("CSV Export Failed", "An error occurred while exporting the data to CSV format. Please try again.")
    }
  }

  const exportToXLSX = () => {
    try {
      const wsData = [
        [
          "Date",
          "Total Business",
          "Discount",
          "UPI & Card",
          "Cash as per Accounts",
          "Cash in Hand",
          "Payment to be Collected",
          "Balance",
          "Clear Balance",
          "Clear Date",
        ],
      ]

      data.forEach((item) => {
        wsData.push([
          item.date,
          item.totalBusiness,
          item.discount,
          item.upiCard,
          item.cashAsPerAccounts,
          item.cashInHand,
          item.balance,
          item.balance,
          item.clearBalance,
          item.clearDate,
        ])
      })

      
      wsData.push([
        "TOTAL",
        totals.totalBusiness,
        totals.discount,
        totals.upiCard,
        totals.cashAsPerAccounts,
        totals.cashInHand,
        totals.balance,
        totals.balance,
        totals.clearBalance,
        "",
      ])

      
      if (expenseData.length > 0) {
        wsData.push([])
        wsData.push(["EXPENSES", "", "", "", "", "", "", "", "", ""])
        wsData.push(["Date", "Expense Name", "Amount", "", "", "", "", "", "", ""])
        expenseData.forEach((expense) => {
          wsData.push([expense.date || "", expense.name, expense.amount, "", "", "", "", "", "", ""])
        })
        wsData.push(["TOTAL EXPENSES", "", totals.totalExpenses, "", "", "", "", "", "", ""])
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Export Data")
      XLSX.writeFile(wb, `export_data_${selectedBranch}_${selectedMonth}_${selectedYear}.xlsx`)
      
      showSuccess("Excel Export Successful", `Data exported successfully to Excel format for ${selectedBranch} - ${selectedMonth} ${selectedYear}`)
    } catch (error) {
      console.error("Error exporting XLSX:", error)
      showError("Excel Export Failed", "An error occurred while exporting the data to Excel format. Please try again.")
    }
  }

  const exportToPDF = () => {
    try {
      const doc = new jsPDF()

      doc.setFontSize(16)
      doc.text(`Export Data - ${selectedBranch} - ${selectedMonth} ${selectedYear}`, 14, 15)

      const tableData = data.map((item) => [
        item.date,
        item.totalBusiness,
        item.discount,
        item.upiCard,
        item.cashAsPerAccounts,
        item.cashInHand,
        item.balance,
        item.clearBalance,
        item.clearDate,
      ])

      
      tableData.push([
        "TOTAL",
        totals.totalBusiness,
        totals.discount,
        totals.upiCard,
        totals.cashAsPerAccounts,
        totals.cashInHand,
        totals.balance,
        totals.clearBalance,
        "",
      ])

      doc.autoTable({
        head: [
          [
            "Date",
            "Total Business",
            "Discount",
            "UPI & Card",
            "Cash as per Accounts",
            "Cash in Hand",
            "Balance",
            "Clear Balance",
            "Clear Date",
          ],
        ],
        body: tableData,
        startY: 25,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
      })

      
      if (expenseData.length > 0) {
        const finalY = doc.lastAutoTable.finalY + 10

        doc.setFontSize(14)
        doc.text("Monthly Expenses", 14, finalY)

        const expenseTableData = expenseData.map((expense) => [expense.date || "", expense.name, expense.amount])

        expenseTableData.push(["TOTAL", "", totals.totalExpenses])

        doc.autoTable({
          head: [["Date", "Expense Name", "Amount (₹)"]],
          body: expenseTableData,
          startY: finalY + 5,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [220, 53, 69] },
        })
      }

      doc.save(`export_data_${selectedBranch}_${selectedMonth}_${selectedYear}.pdf`)
      
      showSuccess("PDF Export Successful", `Data exported successfully to PDF format for ${selectedBranch} - ${selectedMonth} ${selectedYear}`)
    } catch (error) {
      console.error("Error exporting PDF:", error)
      showError("PDF Export Failed", "An error occurred while exporting the data to PDF format. Please try again.")
    }
  }

  return (
    <div className="stock-readings-container">
      <Popup {...popup} />

      {}
      <div className="stock-page-header">
        <h2>Export Data</h2>
        <p>Export financial data by branch, month, and year</p>
      </div>

      {}
      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Select Date</h3>
          </div>
        </div>
        <div className="stock-card-content">
          <div className="stock-date-picker-container">
            <div className="stock-date-picker-wrapper">
              <label>Branch Name</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="filter-select"
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="stock-date-picker-wrapper">
              <label>Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="filter-select"
              >
                <option value="">Select Month</option>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="stock-date-picker-wrapper">
              <label>Year</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="filter-select">
                <option value="">Select Year</option>
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

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading data...</p>
        </div>
      )}

      {data.length > 0 && !loading && (
        <div className="stock-card">
          <div className="stock-card-header">
            <div className="stock-card-title">
              <button onClick={exportToCSV} className="export-btn csv-btn">
                Export CSV
              </button>
              <button onClick={exportToXLSX} className="export-btn xlsx-btn">
                Export XLSX
              </button>
              <button onClick={exportToPDF} className="export-btn pdf-btn">
                Export PDF
              </button>
            </div>
          </div>

          <div className="stock-card-content">
            <div className="stock-table-wrapper">
              <table className="stock-readings-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>
                      Total
                      <br />
                      Business
                    </th>
                    <th>Discount</th>
                    <th>
                      UPI &<br />
                      Card
                    </th>
                    <th>
                      Cash as per
                      <br />
                      Accounts
                    </th>
                    <th>Cash</th>
                    <th>Balance</th>
                    <th>
                      Clear
                      <br />
                      Balance
                    </th>
                    <th>
                      Clear
                      <br />
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((item, index) => (
                    <tr key={index}>
                      <td>{item.date}</td>
                      <td>₹{item.totalBusiness.toLocaleString()}</td>
                      <td>₹{item.discount.toLocaleString()}</td>
                      <td>₹{item.upiCard.toLocaleString()}</td>
                      <td>₹{item.cashAsPerAccounts.toLocaleString()}</td>
                      <td>₹{item.cashInHand.toLocaleString()}</td>
                      <td>₹{item.balance.toLocaleString()}</td>
                      <td>₹{item.clearBalance.toLocaleString()}</td>
                      <td>{item.clearDate}</td>
                    </tr>
                  ))}
                  <tr className="totals-row">
                    <td>
                      <strong>TOTAL</strong>
                    </td>
                    <td>
                      <strong>₹{totals.totalBusiness?.toLocaleString()}</strong>
                    </td>
                    <td>
                      <strong>₹{totals.discount?.toLocaleString()}</strong>
                    </td>
                    <td>
                      <strong>₹{totals.upiCard?.toLocaleString()}</strong>
                    </td>
                    <td>
                      <strong>₹{totals.cashAsPerAccounts?.toLocaleString()}</strong>
                    </td>
                    <td>
                      <strong>₹{totals.cashInHand?.toLocaleString()}</strong>
                    </td>
                    <td>
                      <strong>₹{totals.balance?.toLocaleString()}</strong>
                    </td>
                    <td>
                      <strong>₹{totals.clearBalance?.toLocaleString()}</strong>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {}
          {expenseData.length > 0 && (
            <div className="stock-card-content">
              <h3 style={{ marginTop: "20px", marginBottom: "15px" }}>Monthly Expenses</h3>
              <div className="stock-table-wrapper">
                <table className="stock-readings-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Expense Name</th>
                      <th>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseData.map((expense, index) => (
                      <tr key={index}>
                        <td>{expense.date || "-"}</td>
                        <td>{expense.name}</td>
                        <td>₹{expense.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="totals-row">
                      <td>
                        <strong>TOTAL</strong>
                      </td>
                      <td>
                        <strong>EXPENSES</strong>
                      </td>
                      <td>
                        <strong>₹{totals.totalExpenses?.toLocaleString()}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="summary-table-container">
            <h3>Summary</h3>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Total Business</th>
                  <th>Discount</th>
                  <th>UPI & Card</th>
                  <th>Cash as per Accounts</th>
                  <th>Cash in Hand</th>
                  <th>Balance</th>
                  <th>Clear Balance</th>
                  <th>Balance Amount</th>
                  <th>Total Expenses</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>₹{totals.totalBusiness?.toLocaleString()}</td>
                  <td>₹{totals.discount?.toLocaleString()}</td>
                  <td>₹{totals.upiCard?.toLocaleString()}</td>
                  <td>₹{totals.cashAsPerAccounts?.toLocaleString()}</td>
                  <td>₹{totals.cashInHand?.toLocaleString()}</td>
                  <td>₹{totals.balance?.toLocaleString()}</td>
                  <td>₹{totals.clearBalance?.toLocaleString()}</td>
                  <td className="balance-amount">
                    <strong>₹{totals.balanceAmount?.toLocaleString()}</strong>
                  </td>
                  <td className="expense-amount">
                    <strong>₹{totals.totalExpenses?.toLocaleString()}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.length === 0 && !loading && selectedBranch && selectedMonth && selectedYear && (
        <div className="no-data-container">
          <div className="no-data-content">
            <h3>No Data Found</h3>
            <p>No records found for the selected filters.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExportData
