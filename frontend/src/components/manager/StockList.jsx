import React, { useState, useEffect, useCallback, useMemo } from "react"
import api from "../../services/api"
import {
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaCalendarAlt,
  FaSave,
  FaEdit,
  FaDownload,
  FaLock,
  FaTimes,
} from "react-icons/fa"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { ChevronLeft, ChevronRight } from "lucide-react"
import "../../styles/stocklist.css"
import jsPDF from "jspdf"
import "jspdf-autotable"
import Pagination from "../common/Pagination.jsx"
import CalendarSelect from "../common/CalendarSelect.jsx"
import { resolveBranchId } from "../../services/branchStore"

const StockList = () => {
  const [stocks, setStocks] = useState([])
  const [filteredStocks, setFilteredStocks] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [date, setDate] = useState("")
  const [branchName, setBranchName] = useState("")
  const [userId, setUserId] = useState(null)
  const [docId, setDocId] = useState("")
  const [isExistingDoc, setIsExistingDoc] = useState(false)
  const [isFormSaved, setIsFormSaved] = useState(false)
  const [editingValues, setEditingValues] = useState({})
  const [hasChanges, setHasChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStocks, setIsLoadingStocks] = useState(true)
  const [approvedDates, setApprovedDates] = useState([])
  const [stocksPerPage, setStocksPerPage] = useState(10)
  const [isEditing, setIsEditing] = useState(false)
  const [sortField, setSortField] = useState(null) 
  const [sortOrder, setSortOrder] = useState("asc") 
  const [stockReadingsCount, setStockReadingsCount] = useState(0)
  const [isStocksUpdated, setIsStocksUpdated] = useState(false)

  const isCurrentDate = () => {
    const today = new Date()
    const formattedToday = formatDateToYYYYMMDD(today) 
    return date === formattedToday 
  }

  useEffect(() => {
    const fetchStockReadingsCount = async () => {
      try {
        const response = await api.get("/stocks/readings")
        setStockReadingsCount(response.data?.data?.length || 0)
      } catch (error) {
        console.error("Error fetching stockReadings count:", error)
      }
    }

    fetchStockReadingsCount()
  }, [])

  const handleSort = (field) => {
    if (sortField === field) {
      
      setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"))
    } else {
      
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const sortedStocks = useMemo(() => {
    if (!sortField) {
      return filteredStocks 
    }

    return [...filteredStocks].sort((a, b) => {
      const valueA = (a[sortField] || "").toLowerCase().trim()
      const valueB = (b[sortField] || "").toLowerCase().trim()

      if (valueA < valueB) {
        return sortOrder === "asc" ? -1 : 1
      }
      if (valueA > valueB) {
        return sortOrder === "asc" ? 1 : -1
      }
      return 0
    })
  }, [filteredStocks, sortField, sortOrder])

  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const canEditCurrentDate = useCallback(() => {
    const today = new Date()
    const todayFormatted = formatDateToYYYYMMDD(today)
    return date === todayFormatted
  }, [date])

  const canEditPastDate = useCallback(() => {
    if (canEditCurrentDate()) return false

    const selectedDate = new Date(date)
    return approvedDates.some((approvedDate) => {
      const approvedLocal = new Date(approvedDate.getFullYear(), approvedDate.getMonth(), approvedDate.getDate())
      const selectedLocal = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      return approvedLocal.getTime() === selectedLocal.getTime()
    })
  }, [date, approvedDates])

  useEffect(() => {
    const fetchUserData = async () => {
      const storedUser = localStorage.getItem("user")
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser)
          setUserId(userObj._id || userObj.id || userObj.uid)
          const branch = userObj.branch || userObj.branchName || localStorage.getItem("userBranchName") || ""
          setBranchName(branch)
          if (branch) {
            localStorage.setItem("userBranchName", branch)
          }
        } catch (e) {
          console.error("Error parsing user from localStorage:", e)
        }
      }
    }
    fetchUserData()
  }, [])

  useEffect(() => {
    const fetchApprovedDates = async () => {
      if (!branchName) return

      try {
        const res = await api.get("/past-date-requests", {
          params: {
            status: "Approved",
            type: "stockList",
            requestedBranch: branchName,
          },
        })
        const dates = (res.data?.data || []).map((doc) => {
          const requestedDate = doc.requestedDate || ""
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

    fetchApprovedDates()
  }, [branchName])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStocks(stocks)
    } else {
      const filtered = stocks.filter((stock) => {
        const itemName = stock.itemName || ""
        const category = stock.category || ""
        const searchLower = searchTerm.toLowerCase()

        return itemName.toLowerCase().includes(searchLower) || category.toLowerCase().includes(searchLower)
      })
      setFilteredStocks(filtered)
    }
    
    if (searchTerm !== "") {
      setCurrentPage(1)
    }
  }, [searchTerm, stocks])

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const clearSearch = () => {
    setSearchTerm("")
  }

  const handleDateChange = async (selectedDate) => {
    let dateObj = selectedDate
    if (typeof selectedDate === "string") {
      dateObj = new Date(selectedDate + "T00:00:00")
    }
    if (!dateObj || isNaN(dateObj.getTime())) {
      console.error("Invalid date object:", selectedDate)
      alert("Please select a valid date.")
      return
    }

    const today = new Date()
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const selectedLocal = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate())

    const isApprovedDate = approvedDates.some((approvedDate) => {
      const approvedLocal = new Date(approvedDate.getFullYear(), approvedDate.getMonth(), approvedDate.getDate())
      return approvedLocal.getTime() === selectedLocal.getTime()
    })

    if (selectedLocal > todayLocal) {
      alert("Future dates are not allowed.")
      return
    }

    const formattedDate = formatDateToYYYYMMDD(dateObj)

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
      let todayHasData = false
      try {
        const currentRes = await api.get("/stocks/readings", {
          params: { branchName, date: todayFormatted },
        })
        if (currentRes.data?.data && currentRes.data.data.length > 0) {
          todayHasData = true
        }
      } catch (e) {
        console.warn("Could not check today's stock data:", e)
      }

      if (todayHasData) {
        alert(
          "Cannot request yesterday's date because current date already has data. Please clear today's data first if you want to enter yesterday's data.",
        )
        return
      }

      const istDate = convertToIST(dateObj)
      try {
        const pendingRes = await api.get("/past-date-requests", {
          params: {
            requestedBranch: branchName,
            type: "stockList",
          },
        })
        const alreadyRequested = (pendingRes.data?.data || []).some(
          (r) => r.requestedDate === istDate && (!r.status || r.status === "Pending")
        )
        if (alreadyRequested) {
          alert("Request already raised and waiting for approval.")
          return
        }
      } catch (e) {
        console.warn("Could not check pending requests:", e)
      }

      const confirmPastDate = window.confirm(
        "Do you want to enter the data for yesterday? This will allow you to enter yesterday's stock readings.",
      )

      if (confirmPastDate) {
        try {
          const resolvedBranchId = await resolveBranchId(branchName);
          if (!resolvedBranchId) {
            alert("Could not determine valid branch ID. Please refresh and try again.");
            return;
          }
          await api.post("/past-date-requests", {
            requestedBy: userId,
            requestedDate: istDate,
            branchId: resolvedBranchId,
            requestedBranch: branchName,
            status: "Pending",
            type: "stockList",
          })
          alert("Your request for yesterday has been raised.")
        } catch (error) {
          console.error("Error adding request:", error)
          alert("Failed to record your request. Please try again.")
        }
      } else {
        setDate(null)
      }
    } else {
      setDate(formattedDate)

      setIsFormSaved(false)
      setIsExistingDoc(false)
      setEditingValues({})
      setHasChanges(false)
    }
  }

  const convertToIST = (date) => {
    const offsetIST = 5.5 * 60 * 60 * 1000
    const istDate = new Date(date.getTime() + offsetIST)
    const formattedISTDate = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(istDate.getDate()).padStart(2, "0")} ${String(istDate.getHours()).padStart(2, "0")}:${String(
      istDate.getMinutes(),
    ).padStart(2, "0")}:${String(istDate.getSeconds()).padStart(2, "0")}`
    return formattedISTDate
  }

  useEffect(() => {
    const fetchStocks = async () => {
      if (!branchName) return

      setIsLoadingStocks(true)
      try {
        const res = await api.get("/stocks/items", { params: { branchName } })
        const fetchedStocks = (res.data?.data || []).map((stockData) => ({
          id: stockData._id || stockData.id,
          itemName: stockData.itemName || "",
          amount: stockData.amount || 0,
          category: stockData.category || "",
          openingStock: "",
          addedStock: "",
          closingStock: "",
          sold: "",
          pageRanges: stockData.pageRanges || null,
        }))

        setStocks(fetchedStocks)
        setFilteredStocks(fetchedStocks)
      } catch (error) {
        toast.error("Error fetching stocks: " + error.message)
        console.error("Error fetching stocks:", error)
      } finally {
        setIsLoadingStocks(false)
      }
    }

    fetchStocks()
  }, [branchName])

  useEffect(() => {
    if (!date || !branchName || stocks.length === 0) return

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const prevDate = new Date(date)
        prevDate.setDate(prevDate.getDate() - 1)
        const formattedPrevDate = formatDateToYYYYMMDD(prevDate)

        const prevDayClosingStocks = {}
        try {
          const prevRes = await api.get("/stocks/readings", {
            params: { branchName, date: formattedPrevDate },
          })
          const prevData = prevRes.data?.data?.[0]
          if (prevData?.stocks) {
            prevData.stocks.forEach((stock) => {
              prevDayClosingStocks[stock.itemName] = stock.closingStock
            })
          }
        } catch (e) {
          console.warn("Could not fetch prev day readings:", e)
        }

        const currentRes = await api.get("/stocks/readings", {
          params: { branchName, date },
        })
        const existingData = currentRes.data?.data?.[0]

        if (existingData) {
          setDocId(existingData._id || existingData.id)
          setIsExistingDoc(true)
          setIsFormSaved(true)

          setStocks((prevStocks) =>
            prevStocks.map((stock) => {
              const existingStock = existingData.stocks?.find((s) => s.itemName === stock.itemName)

              const openingStock =
                existingStock?.openingStock !== undefined
                  ? existingStock.openingStock
                  : (prevDayClosingStocks[stock.itemName] ?? "")

              const savedPageRanges = existingStock?.pageRanges || []

              return {
                ...stock,
                openingStock: openingStock,
                addedStock: existingStock?.addedStock ?? "",
                sold: existingStock?.sold ?? "",
                closingStock: existingStock?.closingStock ?? "",
                pageRanges: stock.pageRanges?.map((range, index) => ({
                  ...range,
                  sold: savedPageRanges[index]?.sold ?? "",
                })),
              }
            }),
          )
        } else {
          setDocId("")
          setIsExistingDoc(false)
          setIsFormSaved(false)
          setStocks((prevStocks) =>
            prevStocks.map((stock) => ({
              ...stock,
              openingStock: prevDayClosingStocks[stock.itemName] ?? "",
              addedStock: "",
              sold: "",
              closingStock: "",
              pageRanges: stock.pageRanges?.map((range) => ({
                ...range,
                sold: "",
              })),
            })),
          )
        }
        setEditingValues({})
        setHasChanges(false)
      } catch (error) {
        toast.error("Error fetching data: " + error.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [date, branchName, stocks.length])

  const indexOfLastStock = currentPage * stocksPerPage
  const indexOfFirstStock = indexOfLastStock - stocksPerPage
  const currentStocks = useMemo(() => {
    const startIndex = (currentPage - 1) * stocksPerPage
    const endIndex = startIndex + stocksPerPage
    return sortedStocks.slice(startIndex, endIndex)
  }, [sortedStocks, currentPage, stocksPerPage])

  const nextPage = () => {
    if (currentPage < Math.ceil(filteredStocks.length / stocksPerPage)) {
      setCurrentPage(currentPage + 1)
    }
  }

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleInputChange = (id, field, value) => {
    if (!date) {
      toast.warning("Please select a date first")
      return
    }

    if (isFormSaved && !isEditing && !canEditCurrentDate() && !canEditPastDate()) {
      toast.warning("Cannot edit this data. Enable edit mode first.")
      return
    }

    if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
      setEditingValues((prev) => ({
        ...prev,
        [`${id}_${field}`]: value,
      }))
      setHasChanges(true)

      setStocks((prevStocks) =>
        prevStocks.map((stock) => {
          if (stock.id !== id) return stock

          const newValue = value === "" ? "" : Number(value)
          const opening =
            field === "openingStock"
              ? newValue
              : editingValues[`${id}_openingStock`] !== undefined
                ? editingValues[`${id}_openingStock`]
                : stock.openingStock
          const added =
            field === "addedStock"
              ? newValue
              : editingValues[`${id}_addedStock`] !== undefined
                ? editingValues[`${id}_addedStock`]
                : stock.addedStock !== undefined
                  ? stock.addedStock
                  : 0
          const sold =
            field === "sold"
              ? newValue
              : editingValues[`${id}_sold`] !== undefined
                ? editingValues[`${id}_sold`]
                : stock.sold

          const openingNum = opening === "" ? 0 : Number(opening)
          const addedNum = added === "" ? 0 : Number(added)
          const soldNum = sold === "" ? 0 : Number(sold)

          let closingStock = ""
          
          if (opening !== "") {
            if (stock.pageRanges && stock.pageRanges.length > 0) {
              
              closingStock = openingNum + addedNum - soldNum * 2
            } else {
              
              closingStock = openingNum + addedNum - soldNum
            }
          }

          return {
            ...stock,
            [field]: newValue,
            closingStock: closingStock !== "" ? closingStock : "",
          }
        }),
      )
    }
  }

  const handlePageRangeChange = (id, rangeIndex, value) => {
    if (!date) {
      toast.warning("Please select a date first")
      return
    }

    if (isFormSaved && !isEditing && !canEditCurrentDate() && !canEditPastDate()) {
      toast.warning("Cannot edit this data. Enable edit mode first.")
      return
    }

    if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
      setEditingValues((prev) => ({
        ...prev,
        [`${id}_range_${rangeIndex}_sold`]: value,
      }))
      setHasChanges(true)

      setStocks((prevStocks) =>
        prevStocks.map((stock) => {
          if (stock.id === id && stock.pageRanges) {
            const updatedPageRanges = [...stock.pageRanges]
            updatedPageRanges[rangeIndex] = {
              ...updatedPageRanges[rangeIndex],
              sold: value === "" ? "" : Number(value),
            }

            const totalSold = updatedPageRanges.reduce((sum, range) => sum + (Number(range.sold) || 0), 0)

            const closingStock = (Number(stock.openingStock) || 0) + (Number(stock.addedStock) || 0) - totalSold

            return {
              ...stock,
              pageRanges: updatedPageRanges,
              sold: totalSold,
              closingStock: closingStock,
            }
          }
          return stock
        }),
      )
    }
  }

  const calculateTotalAmount = () => {
    return filteredStocks.reduce((total, stock) => {
      if (stock.pageRanges) {
        const rangesTotal = stock.pageRanges.reduce((sum, range) => {
          const rangeSold = Number(range.sold) || 0
          const rangePrice = range.price || 0
          
          return sum + rangeSold * rangePrice
        }, 0)
        
        return total + rangesTotal
      } else {
        const sold = editingValues[`${stock.id}_sold`] !== undefined ? editingValues[`${stock.id}_sold`] : stock.sold
        const stockAmount = Number(stock.amount) || 0
        
        return total + (sold === "" ? 0 : Number(sold)) * stockAmount
      }
    }, 0)
  }

  const handleSaveReading = async () => {
    if (!date) {
      toast.error("Please select a date first")
      return
    }

    if (isFormSaved) {
      toast.warning("Data has already been saved and cannot be modified")
      return
    }

    const hasNegativeClosing = stocks.some((stock) => {
      const closing = Number(stock.closingStock)
      return !isNaN(closing) && closing < 0
    })

    if (hasNegativeClosing) {
      toast.error("Cannot save: Some items have negative closing stock.")
      return
    }

    
    setSearchTerm("")

    const recalculatedFilteredStocks = stocks 

    const totalAmount = recalculatedFilteredStocks.reduce((total, stock) => {
      if (stock.pageRanges) {
        const rangesTotal = stock.pageRanges.reduce((sum, range) => {
          const rangeSold = Number(range.sold) || 0
          const rangePrice = range.price || 0
          return sum + rangeSold * rangePrice
        }, 0)
        return total + rangesTotal
      } else {
        const sold = editingValues[`${stock.id}_sold`] !== undefined ? editingValues[`${stock.id}_sold`] : stock.sold
        const stockAmount = Number(stock.amount) || 0
        return total + (sold === "" ? 0 : Number(sold)) * stockAmount
      }
    }, 0)

    console.log("Total Amount:", totalAmount)

    const confirmSave = window.confirm(
      "Warning: Once saved, this data cannot be modified. Are you sure you want to save all stock readings?",
    )

    if (!confirmSave) {
      return
    }

    setIsLoading(true)
    try {
      const updatedStocks = stocks.map((stock) => {
        const closingStock =
          stock.pageRanges && stock.pageRanges.length > 0
            ? stock.openingStock !== "" && stock.addedStock !== "" && stock.sold !== ""
              ? Number(stock.openingStock) + Number(stock.addedStock) - Number(stock.sold * 2)
              : ""
            : stock.openingStock !== "" && stock.addedStock !== "" && stock.sold !== ""
              ? Number(stock.openingStock) + Number(stock.addedStock) - Number(stock.sold)
              : ""

        const stockData = {
          itemName: stock.itemName,
          amount: Number(stock.amount),
          ...(stock.openingStock !== "" && {
            openingStock: Number(stock.openingStock),
          }),
          ...(stock.addedStock !== "" && {
            addedStock: Number(stock.addedStock),
          }),
          ...(stock.sold !== "" && { sold: Number(stock.sold) }),
          ...(closingStock !== "" && { closingStock: Number(closingStock) }),
        }

        if (stock.pageRanges) {
          stockData.pageRanges = stock.pageRanges.map((range) => ({
            range: range.range,
            ...(range.sold !== "" && { sold: Number(range.sold) }),
            price: range.price,
          }))
        }

        return stockData
      })
      console.log("updatedStocks", updatedStocks)
      const stockReadingData = {
        ...(docId && { id: docId }),
        date,
        branchName,
        userId,
        stocks: updatedStocks,
        totalAmount: totalAmount,
        lastUpdated: new Date().toISOString(),
        isLocked: true,
      }

      const saveRes = await api.post("/stocks/readings", stockReadingData)
      if (saveRes.data?.data?._id || saveRes.data?.data?.id) {
        setDocId(saveRes.data.data._id || saveRes.data.data.id)
      }
      setIsExistingDoc(true)
      setIsFormSaved(true)
      setHasChanges(false)
      toast.success("Stock readings saved successfully - Form is now locked")
    } catch (error) {
      toast.error("Failed to save stock reading: " + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditClick = useCallback(() => {
    if (!canEditCurrentDate() && !canEditPastDate()) {
      toast.error("Cannot edit this date. Only current date or approved past dates can be edited.")
      return
    }
    setIsEditing(true)
    setIsFormSaved(false)
  }, [canEditCurrentDate, canEditPastDate])

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

  const generatePDF = async () => {
    if (!date) {
      toast.error("Please select a date first")
      return
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.width
      let yPosition = 8

      pdf.setFontSize(12)
      pdf.setFont("helvetica", "bold")

      try {
        const logoBase64 = await loadImageAsBase64("/logo192.png")
        pdf.addImage(logoBase64, "PNG", 10, yPosition, 20, 15)
      } catch (error) {
        pdf.rect(10, yPosition, 20, 15)
        pdf.setFontSize(6)
        pdf.text("PRINTZ", 20, yPosition + 9, { align: "center" })
      }

      pdf.setFontSize(14)
      pdf.setFont("helvetica", "bold")
      pdf.text(branchName.toUpperCase() + " BRANCH", pageWidth / 2, yPosition + 6, {
        align: "center",
      })

      pdf.setFontSize(10)
      pdf.text("Printz Shop", pageWidth - 30, yPosition + 4, {
        align: "center",
      })
      pdf.setFontSize(6)
      pdf.text("One Stop Shop For All Your Printing Needs", pageWidth - 30, yPosition + 8, { align: "center" })

      pdf.setFontSize(8)
      pdf.text("DATE", pageWidth - 40, yPosition + 13)
      const displayDate =
        typeof date === "string" ? new Date(date).toLocaleDateString("en-GB") : date.toLocaleDateString("en-GB")
      pdf.text(displayDate, pageWidth - 25, yPosition + 13)

      yPosition += 18

      const stockTableData = []
      let serialNo = 1

      const stocksToUse = searchTerm ? filteredStocks : stocks

      stocksToUse.forEach((stock) => {
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

      const totalAmount = calculateTotalAmount()
      stockTableData.push(["", "TOTAL STOCK AMOUNT", "", "", "", "", "", "", "", `Rs.${totalAmount}`])

      pdf.autoTable({
        head: [
          ["S.No", "Item Name", "Category", "Opening", "Added", "Closing", "Pages", "Sold", "Unit Price", "Amount"],
        ],
        body: stockTableData,
        startY: yPosition,
        theme: "grid",
        headStyles: {
          fillColor: [0, 0, 0],
          textColor: 255,
          fontSize: 8,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          textColor: [0, 0, 0],
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
          if (data.row.index === stockTableData.length - 1) {
            data.cell.styles.fillColor = [0, 0, 0]
            data.cell.styles.textColor = [255, 255, 255]
            data.cell.styles.fontStyle = "bold"
          }
        },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: 10, right: 10 },
      })

      const formattedDate = date.split("-").reverse().join("-")
      const searchSuffix = searchTerm ? `_Search_${searchTerm.replace(/\s+/g, "_")}` : ""
      pdf.save(`Stock_Readings_${branchName}_${formattedDate}${searchSuffix}.pdf`)
      toast.success("PDF generated successfully!")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF: " + error.message)
    }
  }

  const getDisplayValue = (stock, field) => {
    const editKey = `${stock.id}_${field}`
    return editingValues[editKey] !== undefined ? editingValues[editKey] : stock[field]
  }

  const totalAmount = calculateTotalAmount()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  if (isLoadingStocks) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Loading stock items for {branchName}...</p>
      </div>
    )
  }

  if (stocks.length === 0) {
    return (
      <div className="stock-loading-container">
        <div className="stock-no-data">
          <h3>No Stock Items Found</h3>
          <p>No stock items have been added for branch: {branchName}</p>
          <p>Please add stock items first using the Add Stock feature.</p>
        </div>
      </div>
    )
  }

  if (isLoading && !stocks.length) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Loading stock data...</p>
      </div>
    )
  }

  return (
    <div className="stock-readings-container">
      <ToastContainer />
      <div className="stock-page-header">
        <h2>Add Stock Readings for {branchName}</h2>
        <p>Submit usage details for this branch. ({stocks.length} items available)</p>
      </div>

      <div className="printer-date-picker-container">
        <div className="printer-date-picker-wrapper">
          <label htmlFor="reading-date">Select Date</label>
          <CalendarSelect
            id="reading-date"
            value={date || ""}
            onChange={(d, formatted, e) => {
              const val = e?.target?.value || formatted || "";
              if (val) {
                handleDateChange(val);
              } else {
                setDate("");
              }
            }}
            dateFormat="yyyy-MM-dd"
            maxDate={new Date()}
            placeholder="Select date"
            required
            triggerStyle={{ height: "42px" }}
          />
        </div>
        {date && (
          <button onClick={generatePDF} className="printer-download-button" disabled={isLoading}>
            <FaDownload /> Download PDF
          </button>
        )}
      </div>

      {date ? (
        <div className="stock-list">
          <div className="stock-card">
            <div className="stock-card-header">
              <div className="stock-card-title">
                <h3>Stock Items</h3>
                {isFormSaved && (
                  <div className="stock-saved-indicator">
                    <FaLock className="stock-lock-icon" />
                    <span>Data Locked - Cannot be modified</span>
                  </div>
                )}
              </div>

              <div className="stock-header-actions">
                {isFormSaved && !isEditing && (canEditCurrentDate() || canEditPastDate()) && (
                  <button onClick={handleEditClick} className="stock-edit-button">
                    <FaEdit /> Edit
                  </button>
                )}
              </div>

              {!isFormSaved && (
                <button
                  type="button"
                  onClick={handleSaveReading}
                  className="stock-save-button"
                  disabled={isLoading || !hasChanges}
                >
                  <FaSave /> Save Readings
                </button>
              )}
            </div>

            <div className="stock-search-container" style={{ paddingLeft: "10px" }}>
              <div className="stock-search-wrapper">
                <div
                  className="stock-search-input-wrapper"
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Search by item name or category..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="stock-search-input"
                    style={{ paddingRight: "30px" }}
                  />
                  {searchTerm && (
                    <button onClick={clearSearch} className="stock-clear-search-button">
                      <FaTimes />
                    </button>
                  )}
                </div>
              </div>

              {searchTerm && (
                <div className="stock-search-results-info">
                  <p>
                    Showing {filteredStocks.length} of {stocks.length} items
                    {searchTerm && ` for "${searchTerm}"`}
                  </p>
                </div>
              )}
            </div>

            <div className="stock-card-content">
              <div className="stock-table-wrapper">
                <table className="stock-readings-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>
                        <button onClick={() => handleSort("itemName")}>
                          ITEMS {sortField === "itemName" && (sortOrder === "asc" ? "▲" : "▼")}
                        </button>
                      </th>
                      <th>
                        <button onClick={() => handleSort("category")}>
                          CATEGORY {sortField === "category" && (sortOrder === "asc" ? "▲" : "▼")}
                        </button>
                      </th>
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
                      <React.Fragment key={stock.id}>
                        <tr>
                          <td rowSpan={stock.pageRanges ? stock.pageRanges.length + 1 : 1}>
                            {indexOfFirstStock + index + 1}
                          </td>
                          <td rowSpan={stock.pageRanges ? stock.pageRanges.length + 1 : 1}>{stock.itemName}</td>
                          <td rowSpan={stock.pageRanges ? stock.pageRanges.length + 1 : 1}>{stock.category}</td>
                          <td rowSpan={stock.pageRanges ? stock.pageRanges.length + 1 : 1}>
                            <input
                              type="number"
                              min="0"
                              value={getDisplayValue(stock, "openingStock")}
                              onChange={(e) => handleInputChange(stock.id, "openingStock", e.target.value)}
                              readOnly={isCurrentDate()} 
                              className={`stock-reading-input ${isCurrentDate() ? "stock-readonly" : ""}`}
                            />
                          </td>
                          <td rowSpan={stock.pageRanges ? stock.pageRanges.length + 1 : 1}>
                            <input
                              type="number"
                              min="0"
                              value={getDisplayValue(stock, "addedStock")}
                              onChange={(e) => handleInputChange(stock.id, "addedStock", e.target.value)}
                              readOnly={isFormSaved && !isEditing && !canEditCurrentDate() && !canEditPastDate()}
                              className={`stock-reading-input ${
                                isFormSaved && !isEditing && !canEditCurrentDate() && !canEditPastDate()
                                  ? "stock-readonly"
                                  : ""
                              }`}
                            />
                          </td>
                          <td rowSpan={stock.pageRanges ? stock.pageRanges.length + 1 : 1}>
                            <input
                              type="number"
                              value={getDisplayValue(stock, "closingStock")}
                              readOnly
                              className={`stock-reading-input ${
                                Number(getDisplayValue(stock, "closingStock")) < 0 ? "stock-negative-reading" : ""
                              }`}
                            />
                          </td>
                          {!stock.pageRanges && (
                            <>
                              <td></td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  value={getDisplayValue(stock, "sold")}
                                  onChange={(e) => handleInputChange(stock.id, "sold", e.target.value)}
                                  readOnly={isFormSaved && !isEditing && !canEditCurrentDate() && !canEditPastDate()}
                                  className={`stock-reading-input ${
                                    isFormSaved && !isEditing && !canEditCurrentDate() && !canEditPastDate()
                                      ? "stock-readonly"
                                      : ""
                                  }`}
                                />
                              </td>
                              <td>₹{stock.amount}</td>
                              <td>₹{(Number(getDisplayValue(stock, "sold")) || 0) * (Number(stock.amount) || 0)}</td>
                            </>
                          )}
                        </tr>
                        {stock.pageRanges &&
                          stock.pageRanges.map((range, rangeIndex) => (
                            <tr key={`${stock.id}-${rangeIndex}`}>
                              <td>{range.range}</td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  value={range.sold}
                                  onChange={(e) => handlePageRangeChange(stock.id, rangeIndex, e.target.value)}
                                  readOnly={isFormSaved && !isEditing && !canEditCurrentDate() && !canEditPastDate()}
                                  className={`stock-reading-input ${
                                    isFormSaved && !isEditing && !canEditCurrentDate() && !canEditPastDate()
                                      ? "stock-readonly"
                                      : ""
                                  }`}
                                />
                              </td>
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

              {filteredStocks.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredStocks.length}
                  itemsPerPage={stocksPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setStocksPerPage}
                  pageSizeOptions={[10, 20, 50, 100]}
                  itemLabel="items"
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="stock-select-date-message">
          <p>Please select a date to view and record stock readings</p>
        </div>
      )}
    </div>
  )
}

export default StockList
