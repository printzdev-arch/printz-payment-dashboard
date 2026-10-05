"use client"

import React, { useState, useEffect, useCallback } from "react"
import api from "../../services/api"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { FaCalendarAlt, FaExclamationTriangle, FaDownload } from "react-icons/fa"
import "../../styles/jumboXerox.css"
import "../../styles/addAssets.css"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import BranchSelect from "../common/BranchSelect.jsx"
import CalendarSelect from "../common/CalendarSelect.jsx"

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
        const res = await api.get("/branches")
        const branchNames = [...new Set((res.data?.data || []).map((doc) => doc.name))].filter(Boolean)
        setBranches(branchNames)
      } catch (error) {
        toast.error("Failed to fetch branch names: " + (error.response?.data?.message || error.message))
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
        const res = await api.get("/printers", { params: { branchName } })
        const printerList = res.data?.data || []
        setPrinters(printerList)
      } catch (error) {
        console.error("Error fetching printers:", error)
        toast.error("Failed to fetch printers: " + (error.response?.data?.message || error.message))
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

    const initialRows = generateDynamicRows(printers)
    setRows(initialRows)

    const loadAllData = async () => {
      try {
        const [printerRes, jumboRes, stockRes, totalAmountRes] = await Promise.all([
          api.get("/printer-readings", { params: { branchName, date: dateString } }).catch(() => ({ data: { data: [] } })),
          api.get("/jumbo-xerox/readings", { params: { branchName, date: dateString } }).catch(() => ({ data: { data: [] } })),
          api.get("/stocks/readings", { params: { branchName, date: dateString } }).catch(() => ({ data: { data: [] } })),
          api.get("/total-amounts", { params: { branchName, date: dateString } }).catch(() => ({ data: { data: [] } })),
        ])

        const autoLoadedValues = {}

        const printerDocs = printerRes.data?.data || []
        if (printerDocs.length > 0) {
          const printerData = printerDocs[0]
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

        const jumboDocs = jumboRes.data?.data || []
        if (jumboDocs.length > 0) {
          const jumboData = jumboDocs[0]
          setHasExistingJumboData(true)
          setJumboRows(jumboData.rows || [])
          setJumboCounter(jumboData.jumboCounter || { start: "", end: "", sftPrinted: "" })
          if (jumboData.totalAmount) {
            autoLoadedValues.jumboXerox = jumboData.totalAmount
          }
        } else {
          setHasExistingJumboData(false)
          setJumboRows([])
          setJumboCounter({ start: "", end: "", sftPrinted: "" })
        }

        const stockDocs = stockRes.data?.data || []
        if (stockDocs.length > 0) {
          const stockData = stockDocs[0]
          if (stockData.totalAmount) {
            autoLoadedValues.items = stockData.totalAmount
          }
        }

        const totalAmountDocs = totalAmountRes.data?.data || []
        if (totalAmountDocs.length > 0) {
          const docData = totalAmountDocs[0]
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
          setHasExistingTotalAmountData(false)
          setPaytmBalanceRows([])
          setTotalAmount(0)
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
        }
      } catch (error) {
        console.error("Error loading Jumbo Xerox & Total readings data:", error)
      }
    }

    loadAllData()
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

      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const leftMargin = 15
      const rightMargin = 15
      const contentWidth = pageWidth - leftMargin - rightMargin
      const tableWidth = (contentWidth - 10) / 2

      // Header
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(16)
      pdf.setTextColor(30, 58, 138)
      pdf.text("JUMBO XEROX REVENUE REPORT", pageWidth / 2, 15, { align: "center" })

      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(10)
      pdf.setTextColor(100, 116, 139)
      pdf.text(`Branch: ${branchName} | Date: ${date instanceof Date ? formatDateToYYYYMMDD(date) : date}`, pageWidth / 2, 22, {
        align: "center",
      })

      // Left Table (Total Amount Readings)
      const leftTableData = rows.map((row) => [row.itemName, formatCurrency(row.amount)])
      if (paytmBalanceRows.length > 0) {
        leftTableData.push(["PAYTM BALANCE", ""])
        paytmBalanceRows.forEach((row) => {
          leftTableData.push([`Paytm Balance - ${new Date(row.date).toLocaleDateString()}`, formatCurrency(row.amount)])
        })
      }
      leftTableData.push(["Grand Total", formatCurrency(totalAmount)])

      pdf.autoTable({
        head: [["Item", "Amount"]],
        body: leftTableData,
        startY: 30,
        margin: { left: leftMargin, right: pageWidth - leftMargin - tableWidth },
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
          cellPadding: 2.5,
          textColor: [51, 51, 51],
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.65 },
          1: { cellWidth: tableWidth * 0.35, halign: "right" },
        },
        didParseCell: (data) => {
          if (data.row.index === leftTableData.length - 1) {
            data.cell.styles.fillColor = [30, 58, 138]
            data.cell.styles.textColor = [255, 255, 255]
            data.cell.styles.fontStyle = "bold"
          }
        },
      })

      const leftTableEndY = pdf.lastAutoTable.finalY

      // Right Table (Jumbo Xerox Details)
      const jumboTotals = calculateJumboTotals(jumboRows)
      const groupedData = jumboRows.reduce((acc, row) => {
        if (!acc[row.type]) acc[row.type] = []
        acc[row.type].push(row)
        return acc
      }, {})

      const typeOrder = ["COLOUR", "B/W", "SCAN"]
      const jumboTableData = []

      typeOrder.forEach((type) => {
        if (groupedData[type]) {
          jumboTableData.push([type, "", "", ""])
          groupedData[type].forEach((row) => {
            jumboTableData.push([row.size, `₹${row.unitPrice}`, row.qty || "", row.amount ? formatCurrency(row.amount) : ""])
          })
        }
      })

      Object.keys(groupedData).forEach((type) => {
        if (!typeOrder.includes(type)) {
          jumboTableData.push([type, "", "", ""])
          groupedData[type].forEach((row) => {
            jumboTableData.push([row.size, `₹${row.unitPrice}`, row.qty || "", row.amount ? formatCurrency(row.amount) : ""])
          })
        }
      })

      jumboTableData.push(["TOTAL", "", jumboTotals.qty || "", jumboTotals.amount ? formatCurrency(jumboTotals.amount) : ""])

      pdf.autoTable({
        head: [["Size", "Price", "Qty", "Amount"]],
        body: jumboTableData,
        startY: 30,
        margin: { left: leftMargin + tableWidth + 10, right: rightMargin },
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
          cellPadding: 2.5,
          textColor: [51, 51, 51],
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.4 },
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
        margin: { left: leftMargin + tableWidth + 10, right: rightMargin },
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
      <div className="add-assets-page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <div style={{ textAlign: "center" }}>
          <div className="jumbo-loading-spinner" style={{ margin: "0 auto 16px" }}></div>
          <p style={{ color: "#64748b", fontWeight: 500 }}>Loading branch data...</p>
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

      {/* Page Header Banner (No illustration) */}
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
            Jumbo Xerox <span style={{ color: "#059669" }}>Revenue Data</span>
          </h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.95rem" }}>
            View Jumbo Xerox readings and totals across all branches (Read Only)
          </p>
        </div>
      </div>

      {/* Modern Filter Card */}
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
        <div style={{ flex: "1 1 220px", minWidth: "200px" }}>
          <label
            htmlFor="branch-select"
            style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
          >
            Branch Name
          </label>
          <BranchSelect
            id="branch-select"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            branches={branches}
            placeholder="Select Branch"
            allowAll={true}
            allOptionLabel="Select Branch"
          />
        </div>

        <div style={{ flex: "1 1 220px", minWidth: "200px" }}>
          <label
            htmlFor="amount-date"
            style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
          >
            Select Date
          </label>
          <CalendarSelect
            id="amount-date"
            selected={date ? (typeof date === "string" ? new Date(date) : date) : null}
            onChange={handleDateChange}
            dateFormat="yyyy-MM-dd"
            placeholder="Select date"
            triggerStyle={{ height: "42px" }}
          />
        </div>

        {date && branchName && (
          <div style={{ marginLeft: "auto" }}>
            <button
              onClick={generatePDF}
              disabled={isLoading}
              className="add-assets-btn"
              style={{
                height: "42px",
                padding: "0 20px",
                backgroundColor: "#059669",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.9rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(5, 150, 105, 0.2)",
              }}
            >
              <FaDownload /> Download PDF
            </button>
          </div>
        )}
      </div>

      {date && branchName ? (
        hasExistingTotalAmountData || hasExistingJumboData ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
              gap: "20px",
              alignItems: "start",
            }}
          >
            {/* Left Column: Total Amount Readings */}
            <div className="add-assets-card" style={{ padding: "0", overflow: "hidden" }}>
              <div
                style={{
                  padding: "14px 20px",
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
                  Total Amount Readings <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#64748b" }}>(View Only)</span>
                </h3>
              </div>
              <div style={{ padding: "12px 16px", overflowX: "auto" }}>
                <table className="jumbo-readings-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "10px 12px", background: "#f1f5f9", color: "#334155", fontSize: "0.85rem" }}>
                        Items
                      </th>
                      <th style={{ textAlign: "right", padding: "10px 12px", background: "#f1f5f9", color: "#334155", fontSize: "0.85rem" }}>
                        Total Amount (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 12px", fontSize: "0.88rem", fontWeight: row.isCalculated ? 600 : 400, color: row.isCalculated ? "#0f172a" : "#334155" }}>
                          {row.itemName}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#059669" }}>
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                    {paytmBalanceRows.length > 0 && (
                      <>
                        <tr style={{ background: "#f8fafc" }}>
                          <td colSpan="2" style={{ padding: "8px 12px", fontWeight: 700, fontSize: "0.8rem", color: "#475569", textTransform: "uppercase" }}>
                            PAYTM BALANCE
                          </td>
                        </tr>
                        {paytmBalanceRows.map((row, index) => (
                          <tr key={`paytm-${index}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 12px", fontSize: "0.88rem", color: "#334155" }}>
                              Paytm Balance - {new Date(row.date).toLocaleDateString()}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#059669" }}>
                              {formatCurrency(row.amount)}
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f0fdf4", borderTop: "2px solid #86efac" }}>
                      <td style={{ padding: "12px", fontWeight: 700, fontSize: "0.95rem", color: "#166534" }}>
                        Grand Total
                      </td>
                      <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, fontSize: "1.05rem", color: "#166534" }}>
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Right Column: Jumbo Xerox Details & Counter Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="add-assets-card" style={{ padding: "0", overflow: "hidden" }}>
                <div
                  style={{
                    padding: "14px 20px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
                    Jumbo Xerox Details <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#64748b" }}>(View Only)</span>
                  </h3>
                </div>
                <div style={{ padding: "12px 16px", overflowX: "auto" }}>
                  <table className="jumbo-readings-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "10px 12px", background: "#f1f5f9", color: "#334155", fontSize: "0.85rem" }}>Size</th>
                        <th style={{ textAlign: "right", padding: "10px 12px", background: "#f1f5f9", color: "#334155", fontSize: "0.85rem" }}>Unit Price</th>
                        <th style={{ textAlign: "right", padding: "10px 12px", background: "#f1f5f9", color: "#334155", fontSize: "0.85rem" }}>Quantity</th>
                        <th style={{ textAlign: "right", padding: "10px 12px", background: "#f1f5f9", color: "#334155", fontSize: "0.85rem" }}>Amount (₹)</th>
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
                              <tr key={`header-${type}`} style={{ background: "#f8fafc" }}>
                                <td colSpan="4" style={{ padding: "8px 12px", fontWeight: 700, fontSize: "0.8rem", color: "#475569", textTransform: "uppercase" }}>
                                  {type}
                                </td>
                              </tr>,
                            )
                            groupedData[type].forEach((row, index) => {
                              allRows.push(
                                <tr key={`${type}-${index}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td style={{ padding: "9px 12px", fontSize: "0.88rem", color: "#334155" }}>{row.size}</td>
                                  <td style={{ padding: "9px 12px", textAlign: "right", fontSize: "0.88rem", color: "#64748b" }}>₹{row.unitPrice}</td>
                                  <td style={{ padding: "9px 12px", textAlign: "right", fontSize: "0.88rem", fontWeight: 600, color: "#1e293b" }}>{row.qty || "-"}</td>
                                  <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: "#059669" }}>
                                    {row.amount ? formatCurrency(row.amount) : "-"}
                                  </td>
                                </tr>,
                              )
                            })
                          }
                        })

                        Object.keys(groupedData).forEach((type) => {
                          if (!typeOrder.includes(type)) {
                            allRows.push(
                              <tr key={`header-${type}`} style={{ background: "#f8fafc" }}>
                                <td colSpan="4" style={{ padding: "8px 12px", fontWeight: 700, fontSize: "0.8rem", color: "#475569", textTransform: "uppercase" }}>
                                  {type}
                                </td>
                              </tr>,
                            )
                            groupedData[type].forEach((row, index) => {
                              allRows.push(
                                <tr key={`${type}-${index}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td style={{ padding: "9px 12px", fontSize: "0.88rem", color: "#334155" }}>{row.size}</td>
                                  <td style={{ padding: "9px 12px", textAlign: "right", fontSize: "0.88rem", color: "#64748b" }}>₹{row.unitPrice}</td>
                                  <td style={{ padding: "9px 12px", textAlign: "right", fontSize: "0.88rem", fontWeight: 600, color: "#1e293b" }}>{row.qty || "-"}</td>
                                  <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: "#059669" }}>
                                    {row.amount ? formatCurrency(row.amount) : "-"}
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
                      <tr style={{ background: "#f0fdf4", borderTop: "2px solid #86efac" }}>
                        <td colSpan="2" style={{ padding: "12px", fontWeight: 700, fontSize: "0.95rem", color: "#166534" }}>Total</td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "#166534" }}>{jumboTotals.qty || "-"}</td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, fontSize: "1.05rem", color: "#166534" }}>
                          {jumboTotals.amount ? formatCurrency(jumboTotals.amount) : "₹0"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Jumbo Counter Card */}
              <div className="add-assets-card" style={{ padding: "0", overflow: "hidden" }}>
                <div
                  style={{
                    padding: "14px 20px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
                    Jumbo Counter Details <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#64748b" }}>(View Only)</span>
                  </h3>
                </div>
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px" }}>
                    <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                        Start Counter
                      </span>
                      <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
                        {jumboCounter.start || "N/A"}
                      </span>
                    </div>
                    <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                        End Counter
                      </span>
                      <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
                        {jumboCounter.end || "N/A"}
                      </span>
                    </div>
                    <div style={{ background: "#f0fdf4", padding: "12px 16px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                      <span style={{ fontSize: "0.8rem", color: "#166534", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                        SFT Printed
                      </span>
                      <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#15803d" }}>
                        {jumboCounter.sftPrinted || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="add-assets-card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <FaExclamationTriangle style={{ fontSize: "2rem", color: "#94a3b8", marginBottom: "12px" }} />
            <p style={{ color: "#64748b", fontSize: "0.95rem", margin: 0 }}>
              No data available for the selected branch and date.
            </p>
          </div>
        )
      ) : (
        <div className="add-assets-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <FaCalendarAlt style={{ fontSize: "2rem", color: "#94a3b8", marginBottom: "12px" }} />
          <p style={{ color: "#64748b", fontSize: "0.95rem", margin: 0 }}>
            Please select a branch and date to view Jumbo Xerox data.
          </p>
        </div>
      )}
    </div>
  )
}

export default JumboXeroxList
