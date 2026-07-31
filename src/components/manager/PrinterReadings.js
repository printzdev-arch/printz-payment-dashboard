import { useState, useEffect, useCallback } from "react"
import { db, auth } from "../../services/authservice"
import { collection, getDocs, doc, getDoc, query, where, updateDoc, addDoc } from "firebase/firestore"
import { toast } from "react-toastify"
import { FaCalendarAlt, FaDownload, FaCheck } from "react-icons/fa"
import "../../styles/printerreadings.css"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import PrinterReadingsSection from "./dailyreadings/PrinterReadingsSection"
import JumboXeroxSection from "./dailyreadings/JumboXeroxSection"
import TotalAmountSection from "./dailyreadings/TotalAmountSection"
import StockSection from "./dailyreadings/StockSection"
import jsPDF from "jspdf"
import "jspdf-autotable"

const PrinterReadings = () => {
  const [date, setDate] = useState("")
  const [approvedDates, setApprovedDates] = useState([])
  const [branchName, setBranchName] = useState("")
  const [userId, setUserId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [printerReadingsLoaded, setPrinterReadingsLoaded] = useState(false)
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false)
  const [isStockReadingsSubmitted, setIsStockReadingsSubmitted] = useState(false)
  const [csvVerificationData, setCsvVerificationData] = useState({
    showCsvResults: false,
    verificationResults: [],
    getStatusBadge: null,
    getStatusCounts: null,
  })
  const [isFinalStateChecking, setIsFinalStateChecking] = useState(false)

  const formatDateToYYYYMMDD = useCallback((date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }, [])

  const handlePrinterReadingsLoadingChange = useCallback((isLoaded) => {
    setPrinterReadingsLoaded(isLoaded)
  }, [])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        const user = auth.currentUser
        if (user) {
          setUserId(user.uid)

          const storedBranchName = localStorage.getItem("userBranchName")
          if (storedBranchName) {
            setBranchName(storedBranchName)
          } else {
            const userDoc = doc(db, "users", user.uid)
            const userSnapshot = await getDoc(userDoc)
            if (userSnapshot.exists()) {
              const userData = userSnapshot.data()
              const userBranchName = userData.branch
              setBranchName(userBranchName)
              localStorage.setItem("userBranchName", userBranchName)
            } else {
              setError("User data not found")
              toast.error("User data not found")
            }
          }
        } else {
          setError("User not authenticated")
          toast.error("User not authenticated")
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
  }, [])

  useEffect(() => {
    const fetchApprovedDates = async () => {
      try {
        const pastDateRequestsCollection = collection(db, "pastDateRequests")
        const approvedQuery = query(
          pastDateRequestsCollection,
          where("status", "==", "Approved"),
          where("requestedBranch", "==", branchName || ""),
        )
        const querySnapshot = await getDocs(approvedQuery)
        const dates = querySnapshot.docs.map((doc) => {
          const requestedDate = doc.data().requestedDate
          const dateStr = requestedDate.split(" ")[0]
          return new Date(dateStr + "T00:00:00")
        })

        const today = new Date()
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        dates.push(todayLocal)

        setApprovedDates(dates)
      } catch (error) {
        console.error("Error fetching approved past dates:", error)
      }
    }

    if (branchName) {
      fetchApprovedDates()
    }
  }, [branchName])

  useEffect(() => {
    const syncLockFromStockReadings = async () => {
      try {
        if (!date || !branchName) {
          setIsFinalStateChecking(false) // ensure guard turns off when no selection
          return
        }
        setIsFinalStateChecking(true) // start guard while checking

        const dateString = typeof date === "string" ? date : formatDateToYYYYMMDD(date)
        const q = query(
          collection(db, "stockReadings"),
          where("branchName", "==", branchName),
          where("date", "==", dateString),
        )
        const snap = await getDocs(q)
        if (!snap.empty) {
          const locked = snap.docs.some((d) => Boolean(d.data()?.isLocked))
          if (locked) setIsFinalSubmitted(true)
        }
      } catch (err) {
        console.error("[v0] Failed to sync lock from stockReadings:", err)
      } finally {
        setIsFinalStateChecking(false) // end guard
      }
    }
    syncLockFromStockReadings()
  }, [date, branchName, formatDateToYYYYMMDD])

  useEffect(() => {
    const checkStockReadingsStatus = async () => {
      if (!date || !branchName) {
        setIsStockReadingsSubmitted(false)
        return
      }

      try {
        const dateString = typeof date === "string" ? date : formatDateToYYYYMMDD(date)
        const isSubmitted = await checkCollectionDataExists("stockReadings", branchName, dateString)
        setIsStockReadingsSubmitted(isSubmitted)
      } catch (error) {
        console.error("Error checking stock readings status:", error)
        setIsStockReadingsSubmitted(false)
      }
    }

    checkStockReadingsStatus()
  }, [date, branchName, formatDateToYYYYMMDD])

  const handleDateChange = useCallback(
    async (selectedDate) => {
      // Reset all relevant states when date changes
      setIsFinalSubmitted(false)
      setDataLoaded(false)
      setIsStockReadingsSubmitted(false)
      setIsFinalSubmitting(false)
      setError(null)
      setIsFinalStateChecking(true) // begin guard during finalizedDates check
      setCsvVerificationData({
        showCsvResults: false,
        verificationResults: [],
        getStatusBadge: null,
      })

      try {
        if (!selectedDate || isNaN(selectedDate.getTime())) {
          console.error("Invalid date object:", selectedDate)
          alert("Please select a valid date.")
          return
        }

        const today = new Date()
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const selectedLocal = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())

        const isApprovedDate = approvedDates.some((approvedDate) => {
          const approvedLocal = new Date(approvedDate.getFullYear(), approvedDate.getMonth(), approvedDate.getDate())
          return approvedLocal.getTime() === selectedLocal.getTime()
        })

        if (selectedLocal > todayLocal) {
          alert("Future dates are not allowed.")
          return
        }

        if (selectedLocal < todayLocal && !isApprovedDate) {
          setDate("")

          const yesterday = new Date(todayLocal)
          yesterday.setDate(yesterday.getDate() - 1)
          const isYesterday = selectedLocal.getTime() === yesterday.getTime()

          if (!isYesterday) {
            alert("Only yesterday's date can be requested for past date entry.")
            return
          }

          const todayFormatted = formatDateToYYYYMMDD(today)
          const currentReadingsDocId = `${branchName}_${todayFormatted.replace(/-/g, "")}`

          const collections = ["printerReadings", "jumboXeroxReadings", "totalAmountReadings", "stockReadings"]
          let hasCurrentData = false

          for (const collectionName of collections) {
            const currentDocRef = doc(db, collectionName, currentReadingsDocId)
            const currentDocSnapshot = await getDoc(currentDocRef)
            if (currentDocSnapshot.exists()) {
              hasCurrentData = true
              break
            }
          }

          if (hasCurrentData) {
            alert(
              "Cannot request yesterday's date because current date already has data. Please clear today's data first if you want to enter yesterday's data.",
            )
            return
          }

          const requestCollection = collection(db, "pastDateRequests")
          const q = query(
            requestCollection,
            where("requestedDate", "==", convertToIST(selectedDate)),
            where("status", "==", null),
            where("type", "==", "dailyReadings"),
            where("requestedBranch", "==", branchName),
          )
          const querySnapshot = await getDocs(q)
          if (!querySnapshot.empty) {
            alert("Request already raised and waiting for approval.")
            return
          }

          const confirmPastDate = window.confirm(
            "Do you want to enter the data for yesterday? This will require admin approval.",
          )

          if (confirmPastDate) {
            try {
              const istDate = convertToIST(selectedDate)
              const requestCollection = collection(db, "pastDateRequests")
              await addDoc(requestCollection, {
                requestedBy: userId,
                requestedDate: istDate,
                requestedBranch: branchName,
                status: null,
                type: "dailyReadings",
              })
              alert("Your request for yesterday has been raised and is awaiting admin approval.")
            } catch (error) {
              console.error("Error adding request:", error)
              alert("Failed to record your request. Please try again.")
            }
          } else {
            setDate("")
          }
          return
        }

        const formattedDate = formatDateToYYYYMMDD(selectedDate)
        setDate(formattedDate)

        // Check finalization status before setting dataLoaded
        try {
          const finalizedQuery = query(
            collection(db, "finalizedDates"),
            where("branchName", "==", branchName),
            where("date", "==", formattedDate),
          )
          const finalizedSnapshot = await getDocs(finalizedQuery)
          const isFinalized = !finalizedSnapshot.empty

          console.log("🔍 DEBUG: Finalization check in handleDateChange:", {
            branchName,
            formattedDate,
            isFinalized,
            docCount: finalizedSnapshot.size,
          })

          setIsFinalSubmitted(isFinalized)

          if (isFinalized) {
            toast.info("This date has been finalized. Data is locked for editing.")
          }
        } catch (error) {
          console.error("Error checking finalization in handleDateChange:", error)
        }

        setDataLoaded(true)
      } catch (error) {
        console.error("Error in handleDateChange:", error)
      } finally {
        setIsFinalStateChecking(false) // end guard after check completes
      }
    },
    [approvedDates, formatDateToYYYYMMDD, branchName, userId],
  )

  const loadImageAsBase64 = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "Anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL("image/png"))
      }
      img.onerror = reject
      img.src = url
    })

  const fetchAllDataForPdf = async () => {
    const dateString = typeof date === "string" ? date : formatDateToYYYYMMDD(date)

    try {
      const [printersData, printerReadingsData, jumboXeroxData, stockData, totalAmountData] = await Promise.all([
        fetchPrinters(branchName),
        fetchPrinterReadings(branchName, dateString),
        fetchJumboXeroxData(branchName, dateString),
        fetchStockData(branchName, dateString),
        fetchTotalAmountData(branchName, dateString),
      ])

      return {
        printers: printersData,
        printerReadings: printerReadingsData,
        jumboXerox: jumboXeroxData,
        stock: stockData,
        totalAmount: totalAmountData,
        date: new Date(dateString + "T00:00:00"),
        branch: branchName,
      }
    } catch (error) {
      console.error("Error fetching data for PDF:", error)
      throw error
    }
  }

  const fetchPrinters = async (branchName) => {
    const printersQuery = query(collection(db, "printers"), where("branchName", "==", branchName))
    const snapshot = await getDocs(printersQuery)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  }

  const fetchPrinterReadings = async (branchName, date) => {
    const readingsQuery = query(
      collection(db, "printerReadings"),
      where("branchName", "==", branchName),
      where("date", "==", date),
    )
    const snapshot = await getDocs(readingsQuery)
    const readings = {}
    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (data.readings) {
        Object.keys(data.readings).forEach((printerId) => {
          readings[printerId] = data.readings[printerId]
        })
      }
    })
    return readings
  }

  const fetchJumboXeroxData = async (branchName, date) => {
    const jumboQuery = query(
      collection(db, "jumboXeroxReadings"),
      where("branchName", "==", branchName),
      where("date", "==", date),
    )
    const snapshot = await getDocs(jumboQuery)

    if (snapshot.empty) {
      return { rows: [], jumboCounter: {} }
    }

    const data = snapshot.docs[0].data()
    return {
      rows: data.rows || [],
      jumboCounter: data.jumboCounter || {},
      totalAmount: data.totalAmount || 0,
    }
  }

  const fetchStockData = async (branchName, date) => {
    const stockQuery = query(
      collection(db, "stockReadings"),
      where("branchName", "==", branchName),
      where("date", "==", date),
    )
    const snapshot = await getDocs(stockQuery)
    return snapshot.empty ? [] : snapshot.docs[0].data().stocks || []
  }

  const fetchTotalAmountData = async (branchName, date) => {
    const totalQuery = query(
      collection(db, "totalAmountReadings"),
      where("branchName", "==", branchName),
      where("date", "==", date),
    )
    const snapshot = await getDocs(totalQuery)
    if (snapshot.empty)
      return {
        rows: [],
        printerData: {},
        stockTotal: 0,
        jumboXeroxTotal: 0,
        previousBalanceRows: [],
        paymentToBeCollectedRows: [],
      }

    const data = snapshot.docs[0].data()
    return {
      rows: data.rows || [],
      printerData: data.printerData || {},
      stockTotal: data.stockTotal || 0,
      jumboXeroxTotal: data.jumboXeroxTotal || 0,
      totalAmount: data.totalAmount || 0,
      previousBalanceRows: data.previousBalanceRows || [],
      paymentToBeCollectedRows: data.paymentToBeCollectedRows || [],
    }
  }

  const generatePDF = async () => {
    if (!date) {
      toast.warning("Please select a date first")
      return
    }

    try {
      setIsLoading(true)
      toast.info("Generating PDF, please wait...")

      const data = await fetchAllDataForPdf()
      await generateStructuredPdf(data)
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("There was an error generating the PDF. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const generateStructuredPdf = async (data) => {
    const pdf = new jsPDF("p", "mm", "a4")
    const pageWidth = pdf.internal.pageSize.width
    const pageHeight = pdf.internal.pageSize.height
    let yPos = 10

    pdf.rect(5, 5, pageWidth - 10, pageHeight - 10)

    pdf.setFontSize(16)
    pdf.setFont("helvetica", "bold")

    try {
      const logoBase64 = await loadImageAsBase64("/logo192.png")
      pdf.addImage(logoBase64, "PNG", 10, yPos, 20, 15)
    } catch (error) {
      pdf.rect(10, yPos, 25, 20)
      pdf.setFontSize(8)
      pdf.text("PRINTZ", 22.5, yPos + 12, { align: "center" })
    }

    pdf.setFontSize(18)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(0, 0, 0)
    pdf.text(data.branch.toUpperCase() + " BRANCH", pageWidth / 2, yPos + 8, {
      align: "center",
    })

    pdf.setFontSize(14)
    pdf.setTextColor(0, 0, 0)
    pdf.text("Printz Shop", pageWidth - 35, yPos + 6, { align: "center" })
    pdf.setFontSize(8)
    pdf.text("One Stop Shop For All Your Printing Needs", pageWidth - 35, yPos + 12, { align: "center" })

    pdf.setFontSize(10)
    pdf.text("DATE", pageWidth - 48, yPos + 19)

    const displayDate = data.date.toLocaleDateString("en-GB")
    pdf.text(displayDate, pageWidth - 35, yPos + 19)

    yPos += 25

    const printersToShow = data.printers.filter((printer) => {
      const hasReadings =
        data.printerReadings[printer.printerId] && Object.keys(data.printerReadings[printer.printerId]).length > 0
      return hasReadings || printer.isActive
    })

    Object.entries(data.printerReadings).forEach(([printerId, sizes]) => {
      const printer = printersToShow.find((p) => p.printerId === printerId)
      if (!printer) return

      const printerName = printer.printerName || `PRINTER ${printerId}`
      const sizeKeys = Object.keys(sizes)
      const numSizeColumns = Math.min(sizeKeys.length, 4)

      if (yPos > pageHeight - 35) {
        pdf.addPage()
        pdf.rect(5, 5, pageWidth - 10, pageHeight - 10)
        yPos = 12
      }

      pdf.setFillColor(220, 220, 220)
      pdf.rect(10, yPos, pageWidth - 20, 5, "F")
      pdf.setFontSize(8)
      pdf.setFont("helvetica", "bold")
      pdf.text(printerName.toUpperCase(), 12, yPos + 3.5)

      yPos += 5

      pdf.setFillColor(240, 240, 240)
      pdf.rect(10, yPos, 35, 5, "F")
      pdf.rect(45, yPos, pageWidth - 55, 5, "F")

      pdf.setFontSize(6)
      pdf.text("", 12, yPos + 3.5)

      const sizeColumnWidth = (pageWidth - 55) / numSizeColumns

      for (let i = 0; i < numSizeColumns; i++) {
        const size = sizeKeys[i]
        const xPos = 45 + i * sizeColumnWidth
        pdf.text(size, xPos + 2, yPos + 3.5)

        if (i < numSizeColumns - 1) {
          pdf.line(xPos + sizeColumnWidth, yPos, xPos + sizeColumnWidth, yPos + 20)
        }
      }

      yPos += 5

      const rowLabels = ["FINAL READING", "STARTING", "NO OF COPIES", `TOTAL ${printerId}`]

      rowLabels.forEach((label, rowIndex) => {
        pdf.rect(10, yPos, 35, 5)
        pdf.rect(45, yPos, pageWidth - 55, 5)
        pdf.setFont("helvetica", label.includes("TOTAL") ? "bold" : "normal")
        pdf.setFontSize(6)
        pdf.text(label, 12, yPos + 3.5)

        for (let i = 0; i < numSizeColumns; i++) {
          const size = sizeKeys[i]
          const xPos = 45 + i * sizeColumnWidth
          let value = ""

          switch (rowIndex) {
            case 0:
              value = sizes[size]?.["FINAL READING"] || sizes[size]?.FINAL_READING || ""
              break
            case 1:
              value = sizes[size]?.STARTING || ""
              break
            case 2:
              const copies = sizes[size]?.noOfCopies || 0
              const price = sizes[size]?.price || 0
              value = `${copies} × Rs.${price}`
              break
            case 3:
              value = `Rs.${sizes[size]?.total || 0}`
              break
            default:
              value = ""
              break
          }

          pdf.text(String(value), xPos + 2, yPos + 3.5)
        }

        if (label.includes("TOTAL")) {
          const printerTotal = Object.values(sizes).reduce((sum, sizeData) => {
            return sum + (Number(sizeData.total) || 0)
          }, 0)
          pdf.text(`Rs.${printerTotal}`, pageWidth - 25, yPos + 3.5)
        }

        yPos += 5
      })

      yPos += 6
    })

    yPos += 3

    const leftColWidth = (pageWidth - 25) / 2
    const rightColWidth = (pageWidth - 25) / 2
    const leftColX = 10
    const rightColX = leftColX + leftColWidth + 5

    if (yPos > pageHeight - 100) {
      pdf.addPage()
      pdf.rect(5, 5, pageWidth - 10, pageHeight - 10)
      yPos = 12
    }

    let leftYPos = yPos

    pdf.setFillColor(220, 220, 220)
    pdf.rect(leftColX, leftYPos, leftColWidth, 5, "F")
    pdf.setFontSize(8)
    pdf.setFont("helvetica", "bold")
    pdf.text("AMOUNT", leftColX + 2, leftYPos + 3.5)
    leftYPos += 5

    // Calculate previous balance totals for net amount calculations
    const previousBalanceCash = (data.totalAmount.previousBalanceRows || [])
      .filter(r => r.paymentMethod === "cash")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    
    const previousBalanceUPI = (data.totalAmount.previousBalanceRows || [])
      .filter(r => r.paymentMethod === "upi")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

    const totalAmountTableData = data.totalAmount.rows.map((row) => {
      let displayAmount = row.amount || 0
      let itemName = row.itemName

      // Calculate net amounts for cash and UPI (same logic as in UI)
      if (row.key === "cashInHand" && previousBalanceCash > 0) {
        displayAmount = (Number(row.amount) || 0) + previousBalanceCash
        itemName = `${row.itemName} (Base: ${row.amount || 0} + Previous: ${previousBalanceCash})`
      } else if (row.key === "upiCardPayments" && previousBalanceUPI > 0) {
        displayAmount = (Number(row.amount) || 0) - previousBalanceUPI
        itemName = `${row.itemName} (Base: ${row.amount || 0} - Previous: ${previousBalanceUPI})`
      }

      return [
        itemName,
        displayAmount ? `Rs.${displayAmount.toFixed(2)}` : "Rs.0.00",
      ]
    })

    // Add previous balance entries as informational (amounts already included above)
    if (data.totalAmount.previousBalanceRows && data.totalAmount.previousBalanceRows.length > 0) {
      totalAmountTableData.push(["", ""]) // Add spacing
      totalAmountTableData.push(["--- PREVIOUS BALANCE BREAKDOWN ---", ""]) // Header
      
      data.totalAmount.previousBalanceRows.forEach((balanceRow) => {
        const formattedDate = balanceRow.date ? new Date(balanceRow.date).toLocaleDateString("en-GB") : "No Date"
        const paymentMethod = balanceRow.paymentMethod || "Unknown"
        const balanceLabel = `Previous ${paymentMethod.toUpperCase()} (${formattedDate}) [included above]`
        totalAmountTableData.push([balanceLabel, `Rs.${(balanceRow.amount || 0).toFixed(2)}`])
      })
    }

    if (data.totalAmount.paymentToBeCollectedRows && data.totalAmount.paymentToBeCollectedRows.length > 0) {
      data.totalAmount.paymentToBeCollectedRows.forEach((paymentRow) => {
        const formattedDate = paymentRow.date ? new Date(paymentRow.date).toLocaleDateString("en-GB") : "No Date"
        const paymentMethod = paymentRow.paymentMethod || "Unknown"
        const paymentLabel = `PAYMENT TO BE COLLECTED (${formattedDate} - ${paymentMethod})`
        totalAmountTableData.push([paymentLabel, `Rs.${(paymentRow.amount || 0).toFixed(2)}`])
      })
    }

    totalAmountTableData.push(["TOTAL", `Rs.${data.totalAmount.totalAmount?.toFixed(2) || "0.00"}`])

    totalAmountTableData.forEach((item, index) => {
      if (index % 2 === 0) {
        pdf.setFillColor(245, 245, 245)
        pdf.rect(leftColX, leftYPos, leftColWidth, 4, "F")
      }

      pdf.rect(leftColX, leftYPos, leftColWidth, 4)
      pdf.setFont("helvetica", item[0] === "TOTAL" || item[0].includes("TOTAL BUSINESS") ? "bold" : "normal")
      pdf.setFontSize(6)
      pdf.text(item[0].toUpperCase(), leftColX + 2, leftYPos + 3)

      const amountText = item[1]
      const textWidth = (pdf.getStringUnitWidth(amountText) * 6) / pdf.internal.scaleFactor
      pdf.text(amountText, leftColX + leftColWidth - textWidth - 2, leftYPos + 3)

      if (item[0] === "TOTAL") {
        pdf.setFillColor(220, 220, 220)
        pdf.rect(leftColX, leftYPos, leftColWidth, 4, "F")
        pdf.setTextColor(0, 0, 0)
        pdf.setFont("helvetica", "bold")
        pdf.text(item[0].toUpperCase(), leftColX + 2, leftYPos + 3)
        pdf.text(amountText, leftColX + leftColWidth - textWidth - 2, leftYPos + 3)
        pdf.setTextColor(0, 0, 0)
      }

      leftYPos += 4
    })

    let rightYPos = yPos

    pdf.setFillColor(220, 220, 220)
    pdf.rect(rightColX, rightYPos, rightColWidth, 5, "F")
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(8)
    pdf.text("JUMBO XEROX", rightColX + 2, rightYPos + 3.5)
    rightYPos += 5

    const jumboRows = data.jumboXerox.rows || []
    const jumboCounter = data.jumboXerox.jumboCounter || {}

    if (jumboRows.length > 0) {
      pdf.setFillColor(240, 240, 240)
      pdf.rect(rightColX, rightYPos, rightColWidth, 4, "F")
      pdf.setFontSize(6)

      const jumboColWidth = rightColWidth / 4
      pdf.text("TYPE", rightColX + 1, rightYPos + 3)
      pdf.text("QTY", rightColX + jumboColWidth + 1, rightYPos + 3)
      pdf.text("PRICE", rightColX + jumboColWidth * 2 + 1, rightYPos + 3)
      pdf.text("AMOUNT", rightColX + jumboColWidth * 3 + 1, rightYPos + 3)

      for (let i = 1; i < 4; i++) {
        pdf.line(rightColX + jumboColWidth * i, rightYPos, rightColX + jumboColWidth * i, rightYPos + 4)
      }

      rightYPos += 4

      const groupedData = {}
      jumboRows.forEach((row) => {
        if (!groupedData[row.type]) {
          groupedData[row.type] = []
        }
        groupedData[row.type].push(row)
      })

      Object.entries(groupedData).forEach(([type, items]) => {
        pdf.setFillColor(200, 200, 200)
        pdf.rect(rightColX, rightYPos, rightColWidth, 4, "F")
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(6)
        pdf.text(type, rightColX + 1, rightYPos + 3)
        rightYPos += 4

        items.forEach((item) => {
          pdf.rect(rightColX, rightYPos, rightColWidth, 4)
          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(5)

          for (let i = 1; i < 4; i++) {
            pdf.line(rightColX + jumboColWidth * i, rightYPos, rightColX + jumboColWidth * i, rightYPos + 4)
          }

          pdf.text(item.size || "", rightColX + 1, rightYPos + 3)
          pdf.text(String(item.qty || ""), rightColX + jumboColWidth + 1, rightYPos + 3)
          pdf.text(`Rs.${item.unitPrice || 0}`, rightColX + jumboColWidth * 2 + 1, rightYPos + 3)
          pdf.text(`Rs.${item.amount || 0}`, rightColX + jumboColWidth * 3 + 1, rightYPos + 3)

          rightYPos += 4
        })
      })
    }

    if (Object.keys(jumboCounter).length > 0) {
      pdf.setFillColor(220, 220, 220)
      pdf.rect(rightColX, rightYPos, rightColWidth, 4, "F")
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(6)
      pdf.text("JUMBO COUNTER", rightColX + 1, rightYPos + 3)
      rightYPos += 4

      const counterData = [
        ["START", jumboCounter.start || ""],
        ["END", jumboCounter.end || ""],
        ["SFT PRINTED", jumboCounter.sftPrinted || ""],
      ]

      counterData.forEach(([label, value]) => {
        pdf.rect(rightColX, rightYPos, rightColWidth / 2, 4)
        pdf.rect(rightColX + rightColWidth / 2, rightYPos, rightColWidth / 2, 4)

        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(5)
        pdf.text(label, rightColX + 1, rightYPos + 3)
        pdf.text(String(value), rightColX + rightColWidth / 2 + 1, rightYPos + 3)

        rightYPos += 4
      })
    }

    if (jumboRows.length === 0 && Object.keys(jumboCounter).length === 0) {
      pdf.setFontSize(6)
      pdf.setFont("helvetica", "normal")
      pdf.text("No jumbo xerox data available", rightColX + 2, rightYPos + 10)
    }

    pdf.addPage()
    yPos = 15

    pdf.rect(5, 5, pageWidth - 10, pageHeight - 10)

    pdf.setFontSize(18)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(0, 0, 0)
    pdf.text("STOCK READINGS", pageWidth / 2, yPos, { align: "center" })
    yPos += 15

    if (!data.stock || data.stock.length === 0) {
      pdf.setFontSize(12)
      pdf.setFont("helvetica", "normal")
      pdf.text("No stock data available for this date", pageWidth / 2, yPos + 20, { align: "center" })
    } else {
      const stockTableData = []
      let serialNo = 1

      data.stock.forEach((stock) => {
        if (stock.pageRanges && stock.pageRanges.length > 0) {
          stock.pageRanges.forEach((range, rangeIndex) => {
            stockTableData.push([
              rangeIndex === 0 ? serialNo : "",
              rangeIndex === 0 ? stock.itemName : "",
              rangeIndex === 0 ? stock.category || "" : "",
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
            stock.itemName || "",
            stock.category || "",
            stock.openingStock || "",
            stock.addedStock || "",
            stock.closingStock || "",
            "",
            stock.sold || "",
            `Rs.${stock.amount || 0}`,
            `Rs.${(Number(stock.sold) || 0) * (stock.amount || 0)}`,
          ])
          serialNo++
        }
      })

      const totalAmount = data.stock.reduce((total, stock) => {
        if (stock.pageRanges && stock.pageRanges.length > 0) {
          return (
            total +
            stock.pageRanges.reduce((subTotal, range) => {
              const sold = Number(range.sold) || 0
              return subTotal + sold * range.price
            }, 0)
          )
        } else if (stock.amount) {
          const sold = Number(stock.sold) || 0
          return total + sold * stock.amount
        }
        return total
      }, 0)

      // Add TOTAL row to stockTableData
      stockTableData.push(["", "TOTAL STOCK AMOUNT", "", "", "", "", "", "", "", `Rs.${totalAmount.toFixed(2)}`])

      // Sanitize the table data to replace empty/missing values with "0"
      const sanitizedStockTableData = stockTableData.map((row) =>
        row.map((cell, index) => {
          // Preserve TOTAL row styling
          if (row[1] === "TOTAL STOCK AMOUNT") return cell

          // Replace empty, null, or undefined values with "0" (except for S.No)
          if (cell === "" || cell == null) {
            return index === 0 ? "" : "0"
          }

          return cell
        }),
      )

      // Center the table horizontally
      const totalTableWidth = 177
      const pageMargin = (pageWidth - totalTableWidth) / 2

      // Generate the table using jsPDF-AutoTable
      pdf.autoTable({
        head: [
          ["S.No", "Item Name", "Category", "Opening", "Added", "Closing", "Pages", "Sold", "Unit Price", "Amount"],
        ],
        body: sanitizedStockTableData,
        startY: yPos,
        theme: "grid",
        headStyles: {
          fillColor: [0, 0, 0],
          textColor: 255,
          fontSize: 7,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 6,
          cellPadding: 1.5,
          textColor: [0, 0, 0],
          overflow: "linebreak",
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" }, // S.No
          1: { cellWidth: 35 }, // Item Name
          2: { cellWidth: 18 }, // Opening
          3: { cellWidth: 12, halign: "center" }, // Added
          4: { cellWidth: 12, halign: "center" }, // Closing
          5: { cellWidth: 12, halign: "center" }, // Pages
          6: { cellWidth: 20 }, // Sold
          7: { cellWidth: 12, halign: "center" }, // Unit Price
          8: { cellWidth: 18 }, // Amount
          9: { cellWidth: 18, halign: "right" }, // Total Row (last column)
        },
        didParseCell: (data) => {
          // Apply custom styling to the TOTAL row
          if (data.row.index === sanitizedStockTableData.length - 1) {
            data.cell.styles.fillColor = [0, 0, 0]
            data.cell.styles.textColor = [255, 255, 255]
            data.cell.styles.fontStyle = "bold"
          }
        },
        didDrawPage: (data) => {
          // Draw border around the page
          data.doc.rect(5, 5, pageWidth - 10, pageHeight - 10)
        },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: pageMargin, right: pageMargin, top: 10, bottom: 10 },
        tableWidth: "auto",
        showHead: "everyPage",
      })
    }

    const formattedDate = date.split("-").reverse().join("-")
    pdf.save(`DailyReadings_${data.branch}_${formattedDate}.pdf`)
    toast.success("PDF generated successfully!")
  }

  const handleFinalSubmit = async () => {
    if (!date || !branchName || !userId) {
      toast.error("Missing required data for final submission")
      return
    }

    try {
      setIsFinalSubmitting(true)
      const dateString = typeof date === "string" ? date : formatDateToYYYYMMDD(date)

      const [printerReadingsExist, jumboXeroxExist, totalAmountExist, stockExist] = await Promise.all([
        checkCollectionDataExists("printerReadings", branchName, dateString),
        checkCollectionDataExists("jumboXeroxReadings", branchName, dateString),
        checkCollectionDataExists("totalAmountReadings", branchName, dateString),
        checkCollectionDataExists("stockReadings", branchName, dateString),
      ])

      const missingSections = []
      if (!printerReadingsExist) missingSections.push("Printer Readings")
      if (!jumboXeroxExist) missingSections.push("Jumbo Xerox")
      if (!totalAmountExist) missingSections.push("Total Amount")
      if (!stockExist) missingSections.push("Stock")

      if (missingSections.length > 0) {
        toast.error(`Cannot finalize: Missing data for ${missingSections.join(", ")}. Please complete all sections.`)
        setIsFinalSubmitting(false)
        return
      }

      setIsFinalSubmitted(true)

      const collections = ["printerReadings", "jumboXeroxReadings", "totalAmountReadings", "stockReadings"]

      const updatePromises = collections.map(async (collectionName) => {
        const q = query(
          collection(db, collectionName),
          where("branchName", "==", branchName),
          where("date", "==", dateString),
        )

        const snapshot = await getDocs(q)
        const updatePromises = snapshot.docs.map((docSnapshot) =>
          updateDoc(doc(db, collectionName, docSnapshot.id), {
            isFinalSubmitted: true,
            finalSubmittedAt: new Date(),
            finalSubmittedBy: userId,
            isLocked: true,
          }),
        )

        return Promise.all(updatePromises)
      })

      await Promise.all(updatePromises)

      await addDoc(collection(db, "finalizedDates"), {
        branchName,
        date: dateString,
        finalizedAt: new Date(),
        finalizedBy: userId,
        sections: {
          printerReadings: true,
          jumboXerox: true,
          totalAmount: true,
          stock: true,
        },
      })

      toast.success("All data has been finalized and locked successfully!")

      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("Error in final submission:", error)
      toast.error("Failed to finalize data. Please try again.")
      setIsFinalSubmitted(false)
    } finally {
      setIsFinalSubmitting(false)
    }
  }

  const checkCollectionDataExists = async (collectionName, branchName, dateString) => {
    const q = query(
      collection(db, collectionName),
      where("branchName", "==", branchName),
      where("date", "==", dateString),
    )

    const snapshot = await getDocs(q)
    return !snapshot.empty
  }

  const handleCsvVerificationChange = useCallback((data) => {
    setCsvVerificationData(data)
  }, [])

  if (isLoading && !branchName) {
    return (
      <div className="printer-loading-container">
        <div className="printer-loading-spinner"></div>
        <p>Loading branch data...</p>
      </div>
    )
  }

  if (error && !branchName) {
    return (
      <div className="printer-error-container">
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="printer-retry-button">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="printer-main-container">
      <div className="printer-page-header">
        <h2>Daily Readings for {branchName}</h2>
        <p>Enter printer readings, jumbo xerox, and total amount data for this branch.</p>
      </div>

      <div className="printer-date-picker-container">
        <div className="printer-date-picker-wrapper">
          <label htmlFor="readings-date">Select Date</label>
          <div className="printer-date-input-wrapper">
            <FaCalendarAlt className="printer-date-icon" />
            <DatePicker
              id="readings-date"
              selected={date ? new Date(date) : null}
              onChange={handleDateChange}
              highlightDates={approvedDates}
              dateFormat="yyyy-MM-dd"
              required
              disabled={false}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={generatePDF}
          className="printer-download-button"
          disabled={!date || !dataLoaded || isLoading}
        >
          <FaDownload /> {isLoading ? "Generating..." : "Download PDF"}
        </button>
      </div>

      {date && branchName && userId && dataLoaded ? (
        <div className="printer-sections-container" key={`${date}-${branchName}`}>
          <PrinterReadingsSection
            key={`printer-${date}-${branchName}`}
            date={date}
            branchName={branchName}
            userId={userId}
            approvedDates={approvedDates}
            onFinalSubmitChange={setIsFinalSubmitted}
            isFinalSubmitted={isFinalSubmitted}
            onLoadingChange={handlePrinterReadingsLoadingChange}
          />

          {!printerReadingsLoaded ? (
            <></>
          ) : (
            <>
              <div className="two-column-container">
                <TotalAmountSection
                  key={`total-${date}-${branchName}`}
                  date={date}
                  branchName={branchName}
                  userId={userId}
                  approvedDates={approvedDates}
                  onFinalSubmitChange={setIsFinalSubmitted}
                  isFinalSubmitted={isFinalSubmitted}
                />

                <JumboXeroxSection
                  key={`jumbo-${date}-${branchName}`}
                  date={date}
                  branchName={branchName}
                  userId={userId}
                  approvedDates={approvedDates}
                  onFinalSubmitChange={setIsFinalSubmitted}
                  isFinalSubmitted={isFinalSubmitted}
                  isStockReadingsSubmitted={isStockReadingsSubmitted}
                  onCsvVerificationChange={handleCsvVerificationChange}
                />
              </div>

              {/* CSV Verification Results - shown only when CSV is uploaded */}
              {csvVerificationData.showCsvResults && (
                <div className="stock-card" style={{ marginTop: "1rem" }}>
                  <div className="stock-card-header">
                    <div className="stock-card-title">
                      <h3>CSV Verification Summary</h3>
                    </div>
                  </div>
                  <div className="stock-card-content">
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: "16px",
                        marginBottom: "1rem",
                      }}
                    >
                      {csvVerificationData.getStatusCounts &&
                        Object.entries(csvVerificationData.getStatusCounts()).map(([status, count]) => (
                          <div
                            key={status}
                            style={{
                              padding: "16px",
                              backgroundColor: "white",
                              borderRadius: "8px",
                              border: "1px solid #e9ecef",
                              textAlign: "center",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "24px",
                                fontWeight: "700",
                                color: "#333",
                                marginBottom: "4px",
                              }}
                            >
                              {count}
                            </div>
                            <div
                              style={{
                                fontSize: "14px",
                                color: "#666",
                                fontWeight: "500",
                              }}
                            >
                              {status}
                            </div>
                          </div>
                        ))}
                    </div>

                    <div className="stock-card-header">
                      <div className="stock-card-title">
                        <h3>Verification Results ({csvVerificationData.verificationResults.length} rows)</h3>
                      </div>
                    </div>

                    {csvVerificationData.verificationResults.length === 0 ? (
                      <div className="stock-no-data-message">
                        <p>No verification results to display.</p>
                      </div>
                    ) : (
                      <div className="stock-table-wrapper">
                        <table className="stock-readings-table">
                          <thead>
                            <tr>
                              <th>Extracted Date</th>
                              <th>Media Type</th>
                              <th>Paper Size</th>
                              <th>Pages</th>
                              <th>Status</th>
                              <th>Message</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvVerificationData.verificationResults.map((result, index) => (
                              <tr key={index}>
                                <td>{result.extractedDate || "N/A"}</td>
                                <td>{result["Media Type"]}</td>
                                <td>{result["Printer Paper Size"]}</td>
                                <td>{result["Pages"]}</td>
                                <td>
                                  {csvVerificationData.getStatusBadge &&
                                    csvVerificationData.getStatusBadge(result.status)}
                                </td>
                                <td>{result.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <StockSection
                key={`stock-${date}-${branchName}`}
                date={typeof date === "string" ? date : date ? formatDateToYYYYMMDD(date) : ""}
                branchName={branchName}
                userId={userId}
                approvedDates={approvedDates}
                isFinalSubmitted={isFinalSubmitted}
                onFinalSubmitChange={(locked) => setIsFinalSubmitted(Boolean(locked))}
                onStockSubmissionChange={setIsStockReadingsSubmitted}
              />

              {!isFinalSubmitted && !isFinalStateChecking && (
                <div className="final-submit-container">
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    className="final-submit-button"
                    disabled={isFinalSubmitting}
                  >
                    <FaCheck /> {isFinalSubmitting ? "Finalizing..." : "Final Submit"}
                  </button>
                  <p className="final-submit-note">
                    Once finalized, all data for this date will be locked and cannot be modified.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="stock-select-date-message">
          <p>Please select a date to view and record daily readings</p>
        </div>
      )}
    </div>
  )
}

export default PrinterReadings

const convertToIST = (date) => {
  const offsetIST = 5.5 * 60 * 60 * 1000
  const istDate = new Date(date.getTime() + offsetIST)
  const formattedISTDate = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(istDate.getDate()).padStart(2, "0")} ${String(istDate.getHours()).padStart(
    2,
    "0",
  )}:${String(istDate.getMinutes()).padStart(2, "0")}:${String(istDate.getSeconds()).padStart(2, "0")}`
  return formattedISTDate
}
