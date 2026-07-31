"use client"

import { useState, useEffect, useCallback } from "react"
import { db } from "../../services/authservice"
import { collection, getDocs, query, where, onSnapshot } from "firebase/firestore"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { FaCalendarAlt, FaExclamationTriangle, FaDownload } from "react-icons/fa"
import "../../styles/jumboXerox.css"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { jsPDF } from "jspdf"
import "jspdf-autotable"

const JumboXeroxList = () => {
  const [rows, setRows] = useState([])
  const [jumboRows, setJumboRows] = useState([])
  const [jumboCounter, setJumboCounter] = useState({
    start: "",
    end: "",
    sftPrinted: "",
  })
  const [date, setDate] = useState("")
  const [branches, setBranches] = useState([])
  const [branchName, setBranchName] = useState("")
  const [totalAmount, setTotalAmount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error] = useState(null)
  const [hasExistingTotalAmountData, setHasExistingTotalAmountData] = useState(false)
  const [hasExistingJumboData, setHasExistingJumboData] = useState(false)
  const [printers, setPrinters] = useState([])
  const [paytmBalanceRows, setPaytmBalanceRows] = useState([])

  const calculateJumboTotals = useCallback((currentJumboRows) => {
    return currentJumboRows.reduce(
      (acc, row) => {
        acc.qty += Number(row.qty) || 0
        acc.amount += Number(row.amount) || 0
        return acc
      },
      { qty: 0, amount: 0 },
    )
  }, [])

  const formatDateToYYYYMMDD = (date) => {
    if (!date) return ""
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

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

  useEffect(() => {
    if (!branchName) {
      setPrinters([])
      return
    }

    const fetchPrinters = async () => {
      try {
        const printersCollection = collection(db, "printers")
        const q = query(printersCollection, where("branchName", "==", branchName))
        const snapshot = await getDocs(q)
        const printerList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setPrinters(printerList)
        console.log("Fetched printers:", printerList)
      } catch (error) {
        console.error("Error fetching printers:", error)
        toast.error("Failed to fetch printers: " + error.message)
      }
    }

    fetchPrinters()
  }, [branchName])

  const generateDynamicRows = useCallback((printerList) => {
    const dynamicRows = []

    printerList.forEach((printer) => {
      const printerName = printer.printerName || `PRINTER ${printer.printerId}`
      dynamicRows.push({
        itemName: `TOTAL ${printerName.toUpperCase()} (${printer.printerId})`,
        amount: "",
        key: `printer_${printer.printerId}`,
        autoLoad: true,
        printerId: printer.printerId,
      })
    })

    dynamicRows.push({
      itemName: "JUMBO XEROX",
      amount: "",
      key: "jumboXerox",
      autoLoad: true,
    })

    dynamicRows.push({
      itemName: "ITEMS",
      amount: "",
      key: "items",
      autoLoad: true,
    })

    const staticRows = [
      { itemName: "DNP PHOTO PRINTING", amount: "", key: "dnpPhotoPrinting" },
      { itemName: "DIGITAL BUSINESS", amount: "", key: "digitalBusiness" },
      { itemName: "GIFT BUSINESS", amount: "", key: "giftBusiness" },
    ]

    dynamicRows.push(...staticRows)
    dynamicRows.push({
      itemName: "TOTAL BUSINESS",
      amount: 0,
      key: "totalBusiness",
      isCalculated: true,
    })

    const deductionRows = [
      { itemName: "DISCOUNT", amount: "", key: "discount" },
      { itemName: "PAYTM & QR MACHINE", amount: "", key: "paytmQr" },
      { itemName: "EXPENSE", amount: "", key: "expense" },
    ]

    dynamicRows.push(...deductionRows)

    dynamicRows.push({
      itemName: "CASH AS PER ACCOUNTS",
      amount: 0,
      key: "cashAsPerAccounts",
      isCalculated: true,
    })

    dynamicRows.push({
      itemName: "CASH IN HAND",
      amount: "",
      key: "cashInHand",
    })

    return dynamicRows
  }, [])

  const calculateBusinessTotals = useCallback((currentRows, currentPaytmRows = []) => {
    const businessComponents = currentRows
      .filter(
        (row) =>
          row.key.startsWith("printer_") ||
          row.key === "jumboXerox" ||
          row.key === "items" ||
          row.key === "dnpPhotoPrinting" ||
          row.key === "digitalBusiness" ||
          row.key === "giftBusiness",
      )
      .map((row) => row.key)

    const totalBusiness = businessComponents.reduce((sum, key) => {
      const componentRow = currentRows.find((r) => r.key === key)
      const amount = componentRow?.amount
      return sum + (amount === "" ? 0 : Number(amount) || 0)
    }, 0)

    const deductions = ["discount", "paytmQr", "expense"].reduce((sum, key) => {
      const deductionRow = currentRows.find((r) => r.key === key)
      const amount = deductionRow?.amount
      return sum + (amount === "" ? 0 : Number(amount) || 0)
    }, 0)

    const paytmBalanceTotal = currentPaytmRows.reduce((sum, row) => {
      return sum + (Number(row.amount) || 0)
    }, 0)

    const cashAsPerAccounts = totalBusiness - deductions - paytmBalanceTotal

    return currentRows.map((row) => {
      if (row.key === "totalBusiness") {
        return { ...row, amount: totalBusiness }
      } else if (row.key === "cashAsPerAccounts") {
        return { ...row, amount: Math.max(0, cashAsPerAccounts) }
      }
      return row
    })
  }, [])

  useEffect(() => {
    if (!date || !branchName || printers.length === 0) return

    const dateString = date instanceof Date ? formatDateToYYYYMMDD(date) : date

    console.log("Fetching data for date:", dateString, "branch:", branchName)

    const initialRows = generateDynamicRows(printers)
    setRows(initialRows)

    const totalAmountQuery = query(
      collection(db, "totalAmountReadings"),
      where("branchName", "==", branchName),
      where("date", "==", dateString),
    )

    const jumboXeroxQuery = query(
      collection(db, "jumboXeroxReadings"),
      where("branchName", "==", branchName),
      where("date", "==", dateString),
    )

    const loadAutoValues = async () => {
      try {
        const printerReadingsQuery = query(
          collection(db, "printerReadings"),
          where("branchName", "==", branchName),
          where("date", "==", dateString),
        )

        const jumboXeroxReadingsQuery = query(
          collection(db, "jumboXeroxReadings"),
          where("branchName", "==", branchName),
          where("date", "==", dateString),
        )

        const stockReadingsQuery = query(
          collection(db, "stockReadings"),
          where("branchName", "==", branchName),
          where("date", "==", dateString),
        )

        const [printerSnapshot, jumboSnapshot, stockSnapshot] = await Promise.all([
          getDocs(printerReadingsQuery),
          getDocs(jumboXeroxReadingsQuery),
          getDocs(stockReadingsQuery),
        ])

        const autoLoadedValues = {}

        if (!printerSnapshot.empty) {
          const printerDoc = printerSnapshot.docs[0]
          const printerData = printerDoc.data()

          if (printerData.readings && typeof printerData.readings === "object") {
            Object.entries(printerData.readings).forEach(([printerId, printerReading]) => {
              if (typeof printerReading !== "object" || printerReading === null) return

              let printerTotal = 0
              Object.values(printerReading).forEach((sizeData) => {
                if (typeof sizeData === "object" && sizeData?.total) {
                  printerTotal += Number(sizeData.total) || 0
                }
              })

              autoLoadedValues[`printer_${printerId}`] = printerTotal
            })
          }
        }

        if (!jumboSnapshot.empty) {
          const jumboData = jumboSnapshot.docs[0].data()
          if (jumboData.totalAmount) {
            autoLoadedValues.jumboXerox = jumboData.totalAmount
          }
        }

        if (!stockSnapshot.empty) {
          const stockData = stockSnapshot.docs[0].data()
          if (stockData.totalAmount) {
            autoLoadedValues.items = stockData.totalAmount
          }
        }

        setRows((prevRows) => {
          const updatedRows = prevRows.map((row) => {
            if (row.autoLoad && autoLoadedValues[row.key] !== undefined) {
              const value = autoLoadedValues[row.key]
              return { ...row, amount: value === 0 ? "" : value }
            }
            return row
          })
          return calculateBusinessTotals(updatedRows)
        })

        if (Object.keys(autoLoadedValues).length > 0) {
          console.log("Auto-loaded values:", autoLoadedValues)
        }
      } catch (error) {
        console.error("Error auto-loading values:", error)
      }
    }

    loadAutoValues()

    const unsubscribeTotalAmount = onSnapshot(
      totalAmountQuery,
      (querySnapshot) => {
        console.log("Total amount query result:", querySnapshot.size, "documents")
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data()
          console.log("Total amount data:", docData)
          setHasExistingTotalAmountData(true)

          setRows((prevRows) => {
            const updatedRows = prevRows.map((row) => {
              const savedRow = docData.rows?.find((r) => r.key === row.key)
              if (row.isCalculated) return row
              if (savedRow) {
                const amount = savedRow.amount === 0 ? "" : savedRow.amount
                return { ...row, amount }
              }
              return row
            })
            return calculateBusinessTotals(updatedRows, docData.paytmBalanceRows)
          })

          if (docData.paytmBalanceRows) {
            setPaytmBalanceRows(docData.paytmBalanceRows)
          } else {
            setPaytmBalanceRows([])
          }
          setTotalAmount(docData.totalAmount || 0)
        } else {
          console.log("No total amount data found")
          setHasExistingTotalAmountData(false)
        }
      },
      (error) => {
        console.error("Error fetching total amount data:", error)
        setHasExistingTotalAmountData(false)
      },
    )

    const unsubscribeJumboXerox = onSnapshot(
      jumboXeroxQuery,
      (querySnapshot) => {
        console.log("Jumbo xerox query result:", querySnapshot.size, "documents")
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data()
          console.log("Jumbo xerox data:", docData)
          setHasExistingJumboData(true)

          setJumboRows(docData.rows || [])
          setJumboCounter(docData.jumboCounter || { start: "", end: "", sftPrinted: "" })
        } else {
          console.log("No jumbo xerox data found")
          setHasExistingJumboData(false)
          setJumboRows([])
          setJumboCounter({ start: "", end: "", sftPrinted: "" })
        }
      },
      (error) => {
        console.error("Error fetching jumbo xerox data:", error)
        setHasExistingJumboData(false)
        setJumboRows([])
        setJumboCounter({ start: "", end: "", sftPrinted: "" })
      },
    )

    return () => {
      unsubscribeTotalAmount()
      unsubscribeJumboXerox()
    }
  }, [date, branchName, printers, generateDynamicRows, calculateBusinessTotals])

  const handleDateChange = (selectedDate) => {
    console.log("Date selected:", selectedDate)
    setDate(selectedDate)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const generatePDF = () => {
    if (!date || !branchName) {
      toast.warning("Please select a branch and date first")
      return
    }

    try {
      setIsLoading(true)
      toast.info("Generating PDF, please wait...")

      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.width
      let yPosition = 15

      pdf.setFontSize(18)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(30, 58, 138)
      pdf.text(branchName, pageWidth / 2, yPosition, { align: "center" })
      yPosition += 8

      pdf.setFontSize(12)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(100, 116, 139)
      const displayDate = date instanceof Date ? date.toLocaleDateString() : new Date(date).toLocaleDateString()
      pdf.text(`Date: ${displayDate}`, pageWidth / 2, yPosition, {
        align: "center",
      })
      yPosition += 20

      pdf.setFontSize(14)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(30, 58, 138)
      pdf.text("JUMBO XEROX READINGS", pageWidth / 2, yPosition, {
        align: "center",
      })
      yPosition += 15

      const totalAmountTableData = rows.map((row) => {
        const amount = row.amount || 0
        return [row.itemName, amount ? `Rs.${amount.toFixed(2)}` : ""]
      })

      if (paytmBalanceRows.length > 0) {
        totalAmountTableData.push(["PAYTM BALANCE", ""])
        paytmBalanceRows.forEach((row) => {
          const amount = row.amount || 0
          totalAmountTableData.push([
            `Paytm Balance - ${new Date(row.date).toLocaleDateString()}`,
            amount ? `Rs.${amount.toFixed(2)}` : "",
          ])
        })
      }

      totalAmountTableData.push(["GRAND TOTAL", totalAmount ? `Rs.${totalAmount.toFixed(2)}` : ""])

      const jumboTableData = []

      const groupedJumboData = jumboRows.reduce((acc, row) => {
        if (!acc[row.type]) acc[row.type] = []
        acc[row.type].push(row)
        return acc
      }, {})

      const typeOrder = ["COLOUR", "B/W", "SCAN"]
      typeOrder.forEach((type) => {
        if (groupedJumboData[type]) {
          jumboTableData.push([type, "", "", ""])
          groupedJumboData[type].forEach((row) => {
            const qty = row.qty === "" ? "" : row.qty
            const unitPrice = row.unitPrice === "" ? "" : `Rs.${Number(row.unitPrice).toFixed(2)}`
            const amount = row.amount === "" ? "" : `Rs.${Number(row.amount).toFixed(2)}`
            jumboTableData.push([row.size, unitPrice, qty, amount])
          })
        }
      })

      Object.keys(groupedJumboData).forEach((type) => {
        if (!typeOrder.includes(type)) {
          jumboTableData.push([type, "", "", ""])
          groupedJumboData[type].forEach((row) => {
            const qty = row.qty === "" ? "" : row.qty
            const unitPrice = row.unitPrice === "" ? "" : `Rs.${Number(row.unitPrice).toFixed(2)}`
            const amount = row.amount === "" ? "" : `Rs.${Number(row.amount).toFixed(2)}`
            jumboTableData.push([row.size, unitPrice, qty, amount])
          })
        }
      })

      const jumboTotals = calculateJumboTotals(jumboRows)
      jumboTableData.push([
        "TOTAL",
        "",
        jumboTotals.qty || "",
        jumboTotals.amount ? `Rs.${jumboTotals.amount.toFixed(2)}` : "",
      ])

      const leftMargin = 15
      const rightMargin = 15
      const tableWidth = (pageWidth - leftMargin - rightMargin - 15) / 2

      pdf.autoTable({
        head: [["Item Name", "Amount"]],
        body: totalAmountTableData,
        startY: yPosition,
        margin: {
          left: leftMargin,
          right: pageWidth - leftMargin - tableWidth,
        },
        tableWidth: tableWidth,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: [51, 51, 51],
          halign: "left",
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: tableWidth * 0.65 },
          1: { halign: "right", cellWidth: tableWidth * 0.35 },
        },
        didParseCell: (data) => {
          if (data.row.index === totalAmountTableData.length - 1) {
            data.cell.styles.fillColor = [30, 58, 138]
            data.cell.styles.textColor = [255, 255, 255]
            data.cell.styles.fontStyle = "bold"
          }
        },
      })

      const leftTableEndY = pdf.lastAutoTable.finalY

      pdf.autoTable({
        head: [["Type/Size", "Unit Price", "QTY", "Amount"]],
        body: jumboTableData,
        startY: yPosition,
        margin: { left: leftMargin + tableWidth + 15, right: rightMargin },
        tableWidth: tableWidth,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: [51, 51, 51],
          halign: "center",
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: tableWidth * 0.4 },
          1: { cellWidth: tableWidth * 0.2, halign: "right" },
          2: { cellWidth: tableWidth * 0.2 },
          3: { cellWidth: tableWidth * 0.2, halign: "right" },
        },
        didParseCell: (data) => {
          if (
            typeOrder.includes(data.cell.raw) ||
            (data.cell.raw &&
              data.cell.raw !== "TOTAL" &&
              data.row.index < jumboTableData.length - 1 &&
              jumboTableData[data.row.index][1] === "")
          ) {
            data.cell.styles.fillColor = [139, 69, 19]
            data.cell.styles.textColor = [255, 255, 255]
            data.cell.styles.fontStyle = "bold"
          }

          if (data.row.index === jumboTableData.length - 1) {
            data.cell.styles.fillColor = [30, 58, 138]
            data.cell.styles.textColor = [255, 255, 255]
            data.cell.styles.fontStyle = "bold"
          }
        },
      })

      const rightTableEndY = pdf.lastAutoTable.finalY

      const jumboXeroxTableEndY = Math.max(leftTableEndY, rightTableEndY) + 10

      const counterData = [
        ["START COUNTER", jumboCounter.start || ""],
        ["END COUNTER", jumboCounter.end || ""],
        ["SFT PRINTED", jumboCounter.sftPrinted || ""],
      ]

      pdf.autoTable({
        head: [["Jumbo Counter", "Value"]],
        body: counterData,
        startY: jumboXeroxTableEndY,
        margin: { left: leftMargin + tableWidth + 15, right: rightMargin },
        tableWidth: tableWidth,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: [51, 51, 51],
        },
        columnStyles: {
          0: {
            fontStyle: "bold",
            fillColor: [248, 250, 252],
            cellWidth: tableWidth * 0.6,
          },
          1: { halign: "center", cellWidth: tableWidth * 0.4 },
        },
      })

      const dateString = date instanceof Date ? formatDateToYYYYMMDD(date) : date
      const formattedDate = dateString.split("-").reverse().join("-")
      pdf.save(`JumboXerox_${branchName}_${formattedDate}.pdf`)

      toast.success("PDF generated successfully")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF: " + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const jumboTotals = calculateJumboTotals(jumboRows)

  if (isLoading && !branchName) {
    return (
      <div className="jumbo-loading-container">
        <div className="jumbo-loading-spinner"></div>
        <p>Loading branch data...</p>
      </div>
    )
  }

  if (error && !branchName) {
    return (
      <div className="jumbo-error-container">
        <FaExclamationTriangle className="jumbo-error-icon" />
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="jumbo-retry-button">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="jumbo-main-container">
      <ToastContainer />
      <div className="jumbo-page-header">
        <h2>Jumbo Xerox Revenue Data</h2>
        <p>View Jumbo Xerox readings for all branches (Read Only).</p>
      </div>

      <div className="printer-date-picker-container">
        <div className="printer-date-picker-wrapper">
          <label htmlFor="branch-select">Branch Name</label>
          <select
            id="branch-select"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="printer-date-input"
          >
            <option value="">Select Branch</option>
            {branches.map((branch, index) => (
              <option key={index} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>
        <div className="printer-date-picker-wrapper">
          <label htmlFor="amount-date">Select Date</label>
          <div className="printer-date-input-wrapper">
            <FaCalendarAlt className="printer-date-icon" />
            <DatePicker
              id="amount-date"
              selected={date ? (typeof date === "string" ? new Date(date) : date) : null}
              onChange={handleDateChange}
              dateFormat="yyyy-MM-dd"
              required
              className="printer-date-input"
            />
          </div>
        </div>
        {date && branchName && (
          <button onClick={generatePDF} className="printer-download-button" disabled={isLoading}>
            <FaDownload /> Download PDF
          </button>
        )}
      </div>

      {date && branchName ? (
        hasExistingTotalAmountData || hasExistingJumboData ? (
          <>
            <div className="jumbo-main-form">
              <div className="jumbo-tables-container">
                <div className="jumbo-table-column">
                  <div className="jumbo-table-card">
                    <div className="jumbo-table-header">
                      <h3>Total Amount Readings (View Only)</h3>
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
                                <div className="jumbo-calculated-value">{formatCurrency(row.amount)}</div>
                              </td>
                            </tr>
                          ))}
                          {paytmBalanceRows.length > 0 && (
                            <>
                              <tr className="jumbo-type-header">
                                <td colSpan="2" className="jumbo-type-title">
                                  PAYTM BALANCE
                                </td>
                              </tr>
                              {paytmBalanceRows.map((row, index) => (
                                <tr key={`paytm-${index}`}>
                                  <td className="jumbo-reading-type">
                                    Paytm Balance - {new Date(row.date).toLocaleDateString()}
                                  </td>
                                  <td>
                                    <div className="jumbo-calculated-value">{formatCurrency(row.amount)}</div>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="jumbo-total-row">
                            <td>Grand Total</td>
                            <td className="jumbo-calculated-value">{formatCurrency(totalAmount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="jumbo-table-column">
                  <div className="jumbo-table-card">
                    <div className="jumbo-table-header">
                      <h3>Jumbo Xerox Details (View Only)</h3>
                    </div>
                    <div className="jumbo-table-content">
                      <table className="jumbo-readings-table">
                        <thead>
                          <tr>
                            <th>Size</th>
                            <th>Unit Price (₹)</th>
                            <th>Quantity</th>
                            <th>Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const groupedData = jumboRows.reduce((acc, row) => {
                              if (!acc[row.type]) acc[row.type] = []
                              acc[row.type].push(row)
                              return acc
                            }, {})

                            const typeOrder = ["COLOUR", "B/W", "SCAN"]
                            const allRows = []

                            typeOrder.forEach((type) => {
                              if (groupedData[type]) {
                                allRows.push(
                                  <tr key={`header-${type}`} className="jumbo-type-header">
                                    <td colSpan="4" className="jumbo-type-title">
                                      {type}
                                    </td>
                                  </tr>,
                                )
                                groupedData[type].forEach((row, index) => {
                                  allRows.push(
                                    <tr key={`${type}-${index}`}>
                                      <td className="jumbo-reading-type">{row.size}</td>
                                      <td className="jumbo-reading-type">₹{row.unitPrice}</td>
                                      <td className="jumbo-calculated-value">{row.qty || ""}</td>
                                      <td className="jumbo-calculated-value">
                                        {row.amount ? formatCurrency(row.amount) : ""}
                                      </td>
                                    </tr>,
                                  )
                                })
                              }
                            })

                            Object.keys(groupedData).forEach((type) => {
                              if (!typeOrder.includes(type)) {
                                allRows.push(
                                  <tr key={`header-${type}`} className="jumbo-type-header">
                                    <td colSpan="4" className="jumbo-type-title">
                                      {type}
                                    </td>
                                  </tr>,
                                )
                                groupedData[type].forEach((row, index) => {
                                  allRows.push(
                                    <tr key={`${type}-${index}`}>
                                      <td className="jumbo-reading-type">{row.size}</td>
                                      <td className="jumbo-reading-type">₹{row.unitPrice}</td>
                                      <td className="jumbo-calculated-value">{row.qty || ""}</td>
                                      <td className="jumbo-calculated-value">
                                        {row.amount ? formatCurrency(row.amount) : ""}
                                      </td>
                                    </tr>,
                                  )
                                })
                              }
                            })

                            return allRows
                          })()}
                        </tbody>
                        <tfoot>
                          <tr className="jumbo-total-row">
                            <td colSpan="2">Total</td>
                            <td className="jumbo-calculated-value">{jumboTotals.qty || ""}</td>
                            <td className="jumbo-calculated-value">
                              {jumboTotals.amount ? formatCurrency(jumboTotals.amount) : ""}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div className="jumbo-table-card jumbo-counter-section">
                    <div className="jumbo-table-header">
                      <h3>Jumbo Counter Details (View Only)</h3>
                    </div>
                    <div className="jumbo-table-content">
                      <div className="jumbo-counter-fields">
                        <div className="jumbo-counter-field">
                          <label>Start Counter</label>
                          <div className="jumbo-calculated-value">{jumboCounter.start || "N/A"}</div>
                        </div>
                        <div className="jumbo-counter-field">
                          <label>End Counter</label>
                          <div className="jumbo-calculated-value">{jumboCounter.end || "N/A"}</div>
                        </div>
                        <div className="jumbo-counter-field">
                          <label>SFT Printed</label>
                          <div className="jumbo-calculated-value">{jumboCounter.sftPrinted || "N/A"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="jumbo-select-date-message">
            <FaExclamationTriangle
              style={{
                fontSize: "2rem",
                color: "#64748b",
                marginBottom: "1rem",
              }}
            />
            <p>No data available for the selected branch and date.</p>
          </div>
        )
      ) : (
        <div className="jumbo-select-date-message">
          <p>Please select a branch and date to view Jumbo Xerox data.</p>
        </div>
      )}
    </div>
  )
}

export default JumboXeroxList
