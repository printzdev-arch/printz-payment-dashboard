import React, { useState, useEffect } from "react"
import { db } from "../../services/authservice"
import { collection, getDocs, query, where, onSnapshot } from "firebase/firestore"
import {
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaCalendarAlt,
  FaFileDownload,
  FaExclamationTriangle,
} from "react-icons/fa"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import "../../styles/stocklist.css"
import jsPDF from "jspdf"
import "jspdf-autotable"

const SearchStockList = () => {
  const [stocks, setStocks] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [date, setDate] = useState("")
  const [branches, setBranches] = useState([])
  const [branchName, setBranchName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasData, setHasData] = useState(false)
  const stocksPerPage = 10

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const usersCollection = collection(db, "branches")
        const snapshot = await getDocs(usersCollection)
        const branchNames = [...new Set(snapshot.docs.map((doc) => doc.data().name))].filter(Boolean)
        setBranches(branchNames)
      } catch (error) {
        toast.error("Failed to fetch branch names: " + error.message)
      }
    }

    fetchBranches()
  }, [])

  // Load stock readings data
  useEffect(() => {
    if (!date || !branchName) {
      setStocks([])
      setHasData(false)
      return
    }

    setIsLoading(true)
    const formattedDate = date.replace(/-/g, "")
    const docId = `${branchName}_${formattedDate}`

    const unsubscribe = onSnapshot(
      query(collection(db, "stockReadings"), where("__name__", "==", docId)),
      (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data()
          setStocks(docData.stocks || [])
          setHasData(true)
          toast.success("Stock readings loaded successfully")
        } else {
          setStocks([])
          setHasData(false)
          toast.info("No stock readings found for the selected date")
        }
        setIsLoading(false)
      },
      (error) => {
        toast.error("Error loading stock readings: " + error.message)
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [date, branchName])

  const indexOfLastStock = currentPage * stocksPerPage
  const indexOfFirstStock = indexOfLastStock - stocksPerPage
  const currentStocks = stocks.slice(indexOfFirstStock, indexOfLastStock)

  const nextPage = () => {
    if (currentPage < Math.ceil(stocks.length / stocksPerPage)) {
      setCurrentPage(currentPage + 1)
    }
  }

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const calculateTotalAmount = () => {
    return stocks.reduce((total, stock) => {
      if (stock.pageRanges) {
        const rangesTotal = stock.pageRanges.reduce((sum, range) => sum + (Number(range.sold) || 0) * range.price, 0)
        return total + rangesTotal
      } else {
        return total + (Number(stock.sold) || 0) * (Number(stock.amount) || 0)
      }
    }, 0)
  }

  const generatePDF = async () => {
    if (!date || !branchName) {
      toast.error("Please select a branch and date first")
      return
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.width
      let yPosition = 15

      // Header
      pdf.setFontSize(18)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(30, 58, 138)
      pdf.text(branchName, pageWidth / 2, yPosition, { align: "center" })
      yPosition += 8

      pdf.setFontSize(12)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(100, 116, 139)
      pdf.text(`Date: ${new Date(date).toLocaleDateString()}`, pageWidth / 2, yPosition, { align: "center" })
      yPosition += 20

      // Stock Readings Title
      pdf.setFontSize(14)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(30, 58, 138)
      pdf.text("STOCK READINGS", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 12

      // Prepare table data
      const stockTableData = []
      let serialNo = 1

      stocks.forEach((stock) => {
        if (stock.pageRanges) {
          stock.pageRanges.forEach((range, rangeIndex) => {
            stockTableData.push([
              rangeIndex === 0 ? serialNo : "",
              rangeIndex === 0 ? stock.itemName : "",
              rangeIndex === 0 ? stock.category : "",
              rangeIndex === 0 ? stock.openingStock || "" : "",
              rangeIndex === 0 ? stock.addedStock || "" : "",
              rangeIndex === 0 ? stock.closingStock || "" : "",
              range.range,
              range.sold || "",
              `Rs.${range.price}`,
              `Rs.${(Number(range.sold) || 0) * range.price}`,
            ])
          })
          serialNo++
        } else {
          stockTableData.push([
            serialNo,
            stock.itemName,
            stock.category,
            stock.openingStock || "",
            stock.addedStock || "",
            stock.closingStock || "",
            "",
            stock.sold || "",
            `Rs.${stock.amount}`,
            `Rs.${(Number(stock.sold) || 0) * stock.amount}`,
          ])
          serialNo++
        }
      })

      // Calculate total amount
      const totalAmount = calculateTotalAmount()

      // Add total row
      stockTableData.push(["", "TOTAL STOCK AMOUNT", "", "", "", "", "", "", "", `Rs.${totalAmount}`])

      // Generate table
      pdf.autoTable({
        head: [
          ["S.No", "Item Name", "Category", "Opening", "Added", "Closing", "Pages", "Sold", "Unit Price", "Amount"],
        ],
        body: stockTableData,
        startY: yPosition,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 8,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          textColor: [51, 51, 51],
        },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 40 },
          2: { cellWidth: 20 },
          3: { cellWidth: 15, halign: "center" },
          4: { cellWidth: 15, halign: "center" },
          5: { cellWidth: 15, halign: "center" },
          6: { cellWidth: 25 },
          7: { cellWidth: 15, halign: "center" },
          8: { cellWidth: 20 },
          9: { cellWidth: 20, halign: "right" },
        },
        didParseCell: (data) => {
          // Style total row
          if (data.row.index === stockTableData.length - 1) {
            data.cell.styles.fillColor = [30, 58, 138]
            data.cell.styles.textColor = [255, 255, 255]
            data.cell.styles.fontStyle = "bold"
          }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 },
      })

      // Save PDF
      const formattedDate = date.split("-").reverse().join("-")
      pdf.save(`Stock_Readings_${branchName}_${formattedDate}.pdf`)
      toast.success("PDF generated successfully!")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF: " + error.message)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const totalAmount = calculateTotalAmount()

  if (isLoading) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Loading stock readings...</p>
      </div>
    )
  }

  return (
    <div className="stock-readings-container">
      <ToastContainer />
      <div className="stock-page-header">
        <h2>Stock Revenue Data</h2>
        <p>View stock readings for all branches (Read Only).</p>
      </div>

      <div className="stock-date-picker-container">
        <div className="stock-date-picker-wrapper">
          <label htmlFor="branch-select">Branch Name</label>
          <select
            id="branch-select"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="stock-select-input"
          >
            <option value="">Select Branch</option>
            {branches.map((branch, index) => (
              <option key={index} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>
        <div className="stock-date-picker-wrapper">
          <label htmlFor="stock-reading-date">Select Date</label>
          <div className="stock-date-input-wrapper">
            <FaCalendarAlt className="stock-date-icon" />
            <input
              id="stock-reading-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>
        {date && branchName && hasData && (
          <button onClick={generatePDF} className="stock-download-pdf-btn">
            <FaFileDownload /> Download PDF
          </button>
        )}
      </div>

      {date && branchName ? (
        hasData ? (
          <div className="stock-list">
            <div className="stock-card">
              <div className="stock-card-header">
                <div className="stock-card-title">
                  <h3>Stock Readings ({stocks.length} items) - View Only</h3>
                </div>
              </div>

              <div className="stock-card-content">
                <div className="stock-table-wrapper">
                  <table className="stock-readings-table">
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>ITEMS</th>
                        <th>CATEGORY</th>
                        <th>OPENING STOCK</th>
                        <th>ADDED STOCK</th>
                        <th>CLOSING STOCK</th>
                        <th colSpan="2">SOLD</th>
                        <th>UNIT PRICE(₹)</th>
                        <th>AMOUNT(₹)</th>
                      </tr>
                      <tr>
                        <th colSpan="6"></th>
                        <th>Pages</th>
                        <th>Qty</th>
                        <th></th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentStocks.map((stock, index) => (
                        <React.Fragment key={index}>
                          <tr>
                            <td rowSpan={stock.pageRanges ? stock.pageRanges.length : 1}>
                              {indexOfFirstStock + index + 1}
                            </td>
                            <td rowSpan={stock.pageRanges ? stock.pageRanges.length : 1}>{stock.itemName}</td>
                            <td rowSpan={stock.pageRanges ? stock.pageRanges.length : 1}>{stock.category}</td>
                            <td rowSpan={stock.pageRanges ? stock.pageRanges.length : 1}>
                              {stock.openingStock || "N/A"}
                            </td>
                            <td rowSpan={stock.pageRanges ? stock.pageRanges.length : 1}>
                              {stock.addedStock || "N/A"}
                            </td>
                            <td rowSpan={stock.pageRanges ? stock.pageRanges.length : 1}>
                              {stock.closingStock || "N/A"}
                            </td>
                            {!stock.pageRanges ? (
                              <>
                                <td></td>
                                <td>{stock.sold || "N/A"}</td>
                                <td>₹{stock.amount}</td>
                                <td>₹{(Number(stock.sold) || 0) * (Number(stock.amount) || 0)}</td>
                              </>
                            ) : (
                              <>
                                <td>{stock.pageRanges[0].range}</td>
                                <td>{stock.pageRanges[0].sold || "N/A"}</td>
                                <td>₹{stock.pageRanges[0].price}</td>
                                <td>₹{(Number(stock.pageRanges[0].sold) || 0) * stock.pageRanges[0].price}</td>
                              </>
                            )}
                          </tr>
                          {stock.pageRanges &&
                            stock.pageRanges.slice(1).map((range, rangeIndex) => (
                              <tr key={`${index}-${rangeIndex + 1}`}>
                                <td>{range.range}</td>
                                <td>{range.sold || "N/A"}</td>
                                <td>₹{range.price}</td>
                                <td>₹{(Number(range.sold) || 0) * range.price}</td>
                              </tr>
                            ))}
                        </React.Fragment>
                      ))}
                      <tr className="stock-total-row">
                        <td colSpan="9">Grand Total:</td>
                        <td className="stock-grand-total">{formatCurrency(totalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="stock-pagination">
                  <button onClick={previousPage} disabled={currentPage === 1} className="stock-pagination-button">
                    <FaRegArrowAltCircleLeft />
                  </button>
                  <span className="stock-page-info">
                    {currentPage} of {Math.ceil(stocks.length / stocksPerPage)}
                  </span>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === Math.ceil(stocks.length / stocksPerPage)}
                    className="stock-pagination-button"
                  >
                    <FaRegArrowAltCircleRight />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="stock-select-date-message">
            <FaExclamationTriangle style={{ fontSize: "2rem", color: "#64748b", marginBottom: "1rem" }} />
            <p>No data available for the selected branch and date.</p>
          </div>
        )
      ) : (
        <div className="stock-select-date-message">
          <p>Please select a branch and date to view stock readings</p>
        </div>
      )}
    </div>
  )
}

export default SearchStockList
