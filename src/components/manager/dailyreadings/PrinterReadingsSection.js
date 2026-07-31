import { useState, useEffect, useCallback } from "react"
import { db } from "../../../services/authservice"
import { collection, getDocs, addDoc, doc, query, where, updateDoc } from "firebase/firestore"
import { FaSave, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaEdit, FaLock } from "react-icons/fa"
import { usePopup } from "../../../hooks/usePopup"
import Popup from "../../common/Popup"

const PrinterReadingsSection = ({
  date,
  branchName,
  userId,
  approvedDates,
  onFinalSubmitChange,
  isFinalSubmitted,
  onLoadingChange,
}) => {
  const { popup, showSuccess, showError, showWarning } = usePopup()
  const [printers, setPrinters] = useState([])
  const [printerReadings, setPrinterReadings] = useState({})
  const [previousDateMap, setPreviousDateMap] = useState({})
  const [hasExistingPrinterData, setHasExistingPrinterData] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [printerValidationErrors, setPrinterValidationErrors] = useState({})
  const [isEditingPrinter, setIsEditingPrinter] = useState(false)
  const [printerDocId, setPrinterDocId] = useState(null)
  const [isFinalStateChecking, setIsFinalStateChecking] = useState(false)

  // Notify parent component when loading state changes
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(dataLoaded)
    }
  }, [dataLoaded, onLoadingChange])

  const formatDateToYYYYMMDD = useCallback((date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }, [])

  const canEditCurrentDate = useCallback(() => {
    const today = new Date()
    const todayFormatted = formatDateToYYYYMMDD(today)
    return date === todayFormatted
  }, [date, formatDateToYYYYMMDD])

  const canEditPastDate = useCallback(() => {
    if (canEditCurrentDate()) return false

    const selectedDate = new Date(date)
    return approvedDates.some((approvedDate) => {
      const approvedLocal = new Date(approvedDate.getFullYear(), approvedDate.getMonth(), approvedDate.getDate())
      const selectedLocal = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      return approvedLocal.getTime() === selectedLocal.getTime()
    })
  }, [date, approvedDates, canEditCurrentDate])

  const findMostRecentReadings = useCallback(
    async (currentDate, branchName, userId) => {
      const maxDaysBack = 30
      const recentReadings = {}
      const dateMap = {}

      console.log("🔍 DEBUG: Finding recent readings for date:", currentDate)
      console.log("🔍 DEBUG: Current date type:", typeof currentDate)

      const activePrintersQuery = query(
        collection(db, "printers"),
        where("branchName", "==", branchName),
        where("printerType", "in", ["SFP", "MFP"]),
        where("isActive", "==", true),
      )

      const activePrintersSnapshot = await getDocs(activePrintersQuery)

      // First, check if printers have lastFinalReadings (moved from another branch)
      activePrintersSnapshot.docs.forEach((doc) => {
        const printerData = doc.data()
        const printerId = printerData.printerId
        if (printerData.lastFinalReadings) {
          const lastReadings = {}
          Object.entries(printerData.lastFinalReadings).forEach(([size, sizeData]) => {
            lastReadings[size] = {
              "FINAL READING": sizeData["FINAL READING"],
              price: sizeData.price,
            }
          })
          recentReadings[printerId] = lastReadings
          dateMap[printerId] = "Moved from another branch"
          console.log(`🔍 DEBUG: Found lastFinalReadings for printer ${printerId}:`, lastReadings)
        }
      })

      // Then, look for recent readings in printerReadings collection
      for (let daysBack = 1; daysBack <= maxDaysBack; daysBack++) {
        const checkDate = new Date(currentDate)
        checkDate.setDate(checkDate.getDate() - daysBack)
        const checkDateString = formatDateToYYYYMMDD(checkDate)

        console.log(`🔍 DEBUG: Checking ${daysBack} days back: ${checkDateString}`)

        try {
          // Try without userId first to find any data for that date and branch
          const printerQuery = await getDocs(
            query(
              collection(db, "printerReadings"),
              where("branchName", "==", branchName),
              where("date", "==", checkDateString),
            ),
          )

          console.log(`🔍 DEBUG: Found ${printerQuery.size} documents for date ${checkDateString}`)

          if (!printerQuery.empty) {
            // Process all documents for this date to find the most complete data
            printerQuery.docs.forEach((doc) => {
              const docData = doc.data()
              console.log(`🔍 DEBUG: Processing document for ${checkDateString}:`, {
                id: doc.id,
                userId: docData.userId,
                hasReadings: !!docData.readings,
                isFinalSubmitted: docData.isFinalSubmitted,
              })

              if (docData.readings && typeof docData.readings === "object") {
                Object.entries(docData.readings).forEach(([printerId, reading]) => {
                  if (!recentReadings[printerId] && reading && typeof reading === "object") {
                    // Convert the reading structure to use FINAL READING as starting values
                    const convertedReading = {}
                    Object.entries(reading).forEach(([size, sizeData]) => {
                      if (sizeData && typeof sizeData === "object" && sizeData["FINAL READING"] !== undefined) {
                        convertedReading[size] = {
                          "FINAL READING": sizeData["FINAL READING"],
                          price: sizeData.price || 0,
                        }
                      }
                    })

                    if (Object.keys(convertedReading).length > 0) {
                      recentReadings[printerId] = convertedReading
                      dateMap[printerId] = checkDateString
                      console.log(
                        `🔍 DEBUG: Added readings for printer ${printerId} from ${checkDateString}:`,
                        convertedReading,
                      )
                    }
                  }
                })
              }
            })
          }
        } catch (error) {
          console.error(`Error checking date ${checkDateString}:`, error)
        }

        // Check if we have readings for all active printers
        const totalActivePrinters = activePrintersSnapshot.size
        const foundReadingsCount = Object.keys(recentReadings).length

        console.log(
          `🔍 DEBUG: Found readings for ${foundReadingsCount}/${totalActivePrinters} printers after checking ${daysBack} days back`,
        )

        if (foundReadingsCount >= totalActivePrinters && totalActivePrinters > 0) {
          console.log(`🔍 DEBUG: Found sufficient readings, stopping search at ${daysBack} days back`)
          break
        }
      }

      console.log("🔍 DEBUG: Final recent readings:", recentReadings)
      console.log("🔍 DEBUG: Date map:", dateMap)

      return { recentReadings, dateMap }
    },
    [formatDateToYYYYMMDD],
  )

  const validatePrinterReadings = useCallback(() => {
    const errors = {}
    let hasErrors = false

    Object.entries(printerReadings).forEach(([printerId, sizes]) => {
      Object.entries(sizes).forEach(([size, data]) => {
        const key = `${printerId}-${size}`

        if (data.STARTING === "" || data["FINAL READING"] === "") {
          errors[key] = "Both starting and final readings are required"
          hasErrors = true
        } else if (Number(data["FINAL READING"]) < Number(data.STARTING)) {
          errors[key] = "Final reading must be greater than or equal to starting reading"
          hasErrors = true
        }
      })
    })

    setPrinterValidationErrors(errors)
    return !hasErrors
  }, [printerReadings])

  useEffect(() => {
    if (!date || !branchName || !userId) return

    const loadDataForDate = async () => {
      try {
        setDataLoaded(false)
        setIsLoading(true)
        setPrinterReadings({})
        setHasExistingPrinterData(false)
        setPreviousDateMap({})
        setIsEditingPrinter(false)
        setPrinterDocId(null)
        // Remove onFinalSubmitChange(false) - parent should control finalization status

        const dateString = typeof date === "string" ? date : formatDateToYYYYMMDD(date)

        console.log("🔍 DEBUG: Loading data for date:", dateString)
        console.log("🔍 DEBUG: Branch name:", branchName)
        console.log("🔍 DEBUG: User ID:", userId)

        const activePrintersQuery = query(
          collection(db, "printers"),
          where("branchName", "==", branchName),
          where("printerType", "in", ["SFP", "MFP"]),
          where("isActive", "==", true),
        )
        const activePrintersSnapshot = await getDocs(activePrintersQuery)
        const activePrinters = activePrintersSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((printer) => {
            // Filter out printers without valid printer IDs
            const hasValidId = printer.printerId && printer.printerId.trim() !== ""
            if (!hasValidId) {
              console.log(`🔍 DEBUG: Filtered out printer without ID:`, printer.printerName, printer.id)
            }
            return hasValidId
          })

        console.log("🔍 DEBUG: Small printers found (with valid IDs):", activePrinters)

        const inactivePrintersWithData = []
        const readingsQuery = query(
          collection(db, "printerReadings"),
          where("branchName", "==", branchName),
          where("date", "==", dateString),
        )
        const readingsSnapshot = await getDocs(readingsQuery)

        console.log("🔍 DEBUG: Readings query for date:", dateString)
        console.log("🔍 DEBUG: Readings snapshot empty?", readingsSnapshot.empty)
        console.log("🔍 DEBUG: Number of documents found:", readingsSnapshot.size)

        if (!readingsSnapshot.empty) {
          const printerIdsWithReadings = new Set()
          readingsSnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.readings && typeof data.readings === "object") {
              Object.keys(data.readings).forEach((printerId) => {
                printerIdsWithReadings.add(printerId)
              })
            }
          })

          for (const printerId of printerIdsWithReadings) {
            const isAlreadyActive = activePrinters.some((p) => p.printerId === printerId)
            if (!isAlreadyActive) {
              try {
                const inactivePrinterQuery = query(
                  collection(db, "printers"),
                  where("printerId", "==", printerId),
                  where("branchName", "==", branchName),
                  where("printerType", "in", ["SFP", "MFP"]),
                  where("isActive", "==", false),
                )
                const inactivePrinterSnapshot = await getDocs(inactivePrinterQuery)
                if (!inactivePrinterSnapshot.empty) {
                  const inactivePrinter = {
                    id: inactivePrinterSnapshot.docs[0].id,
                    ...inactivePrinterSnapshot.docs[0].data(),
                    isInactiveWithData: true,
                  }

                  // Only add if it has a valid printer ID
                  if (inactivePrinter.printerId && inactivePrinter.printerId.trim() !== "") {
                    inactivePrintersWithData.push(inactivePrinter)
                  } else {
                    console.log(
                      `🔍 DEBUG: Filtered out inactive printer without ID:`,
                      inactivePrinter.printerName,
                      inactivePrinter.id,
                    )
                  }
                }
              } catch (error) {
                console.error("Error loading inactive printer:", error)
              }
            }
          }
        }

        const allRelevantPrinters = [...activePrinters, ...inactivePrintersWithData]
        setPrinters(allRelevantPrinters)

        if (allRelevantPrinters.length === 0) {
          console.log("No small printers available")
          setDataLoaded(true)
          setIsLoading(false)
          return
        }

        const initialReadings = {}
        allRelevantPrinters.forEach((printer) => {
          initialReadings[printer.printerId] = {}
          printer.prices?.forEach((priceObj) => {
            initialReadings[printer.printerId][priceObj.size] = {
              STARTING: "",
              "FINAL READING": "",
              noOfCopies: 0,
              price: Number(priceObj.price) || 0,
              total: 0,
              isPreLoaded: false, // Track if starting value was pre-loaded
            }
          })
        })

        if (allRelevantPrinters.length > 0) {
          try {
            const currentDate = typeof date === "string" ? new Date(date) : date
            const { recentReadings, dateMap } = await findMostRecentReadings(currentDate, branchName, userId)

            setPreviousDateMap(dateMap)

            // Apply recent readings as starting values
            Object.entries(recentReadings).forEach(([printerId, reading]) => {
              if (initialReadings[printerId]) {
                Object.entries(reading).forEach(([size, sizeData]) => {
                  if (initialReadings[printerId][size] && sizeData?.["FINAL READING"] !== undefined) {
                    // Set the FINAL READING from previous date as STARTING for current date
                    // Even if the value is 0, it should be set and marked as preloaded
                    initialReadings[printerId][size].STARTING = sizeData["FINAL READING"] || 0
                    initialReadings[printerId][size].isPreLoaded = true // Mark as pre-loaded even if value is 0

                    console.log(
                      `🔍 DEBUG: Set starting value for ${printerId}-${size}: ${sizeData["FINAL READING"] || 0} from ${dateMap[printerId]} (preloaded)`,
                    )
                  }
                })
              }
            })

            console.log("🔍 DEBUG: Initial readings after applying recent data:", initialReadings)

            console.log("🔍 DEBUG: Initial readings after applying recent data:", initialReadings)
          } catch (error) {
            console.error("Error loading recent readings:", error)
          }
        }

        try {
          const printerSnapshot = await getDocs(
            query(
              collection(db, "printerReadings"),
              where("userId", "==", userId),
              where("branchName", "==", branchName),
              where("date", "==", dateString),
            ),
          )

          console.log("🔍 DEBUG: Final query for existing data - date:", dateString)
          console.log("🔍 DEBUG: Final query - userId:", userId)
          console.log("🔍 DEBUG: Final query - branchName:", branchName)
          console.log("🔍 DEBUG: Final query snapshot empty?", printerSnapshot.empty)
          console.log("🔍 DEBUG: Final query number of documents:", printerSnapshot.size)

          // Let's also check what documents exist for this branch to debug
          const debugQuery = query(collection(db, "printerReadings"), where("branchName", "==", branchName))
          const debugSnapshot = await getDocs(debugQuery)
          console.log("🔍 DEBUG: All documents for branch:", debugSnapshot.size)
          debugSnapshot.docs.forEach((doc, index) => {
            const data = doc.data()
            console.log(`🔍 DEBUG: Document ${index + 1}:`, {
              id: doc.id,
              date: data.date,
              userId: data.userId,
              branchName: data.branchName,
              hasReadings: !!data.readings,
            })
          })

          if (!printerSnapshot.empty) {
            setHasExistingPrinterData(true)
            setIsEditingPrinter(false) // Set to viewing mode for existing data
            setPrinterDocId(printerSnapshot.docs[0].id)
            const docData = printerSnapshot.docs[0].data()
            console.log("🔍 DEBUG: Found existing data:", docData)
            if (docData.readings) {
              setPrinterReadings(docData.readings)
            } else {
              setPrinterReadings(initialReadings)
            }

            // Don't control parent's finalization status
            // const printerSubmitted = docData.isFinalSubmitted === true;
            // onFinalSubmitChange(printerSubmitted);
          } else {
            console.log("🔍 DEBUG: No data found with userId, trying without userId...")

            // Try querying without userId as fallback
            const fallbackQuery = query(
              collection(db, "printerReadings"),
              where("branchName", "==", branchName),
              where("date", "==", dateString),
            )
            const fallbackSnapshot = await getDocs(fallbackQuery)

            console.log("🔍 DEBUG: Fallback query results:", fallbackSnapshot.size)

            if (!fallbackSnapshot.empty) {
              console.log("🔍 DEBUG: Found data without userId filter!")
              setHasExistingPrinterData(true)
              setPrinterDocId(fallbackSnapshot.docs[0].id)
              const docData = fallbackSnapshot.docs[0].data()
              console.log("🔍 DEBUG: Fallback data:", docData)
              if (docData.readings) {
                setPrinterReadings(docData.readings)
              } else {
                setPrinterReadings(initialReadings)
              }

              // Don't control parent's finalization status
              // const printerSubmitted = docData.isFinalSubmitted === true;
              // onFinalSubmitChange(printerSubmitted);
            } else {
              console.log("🔍 DEBUG: No data found even without userId filter")
              setHasExistingPrinterData(false)
              setIsEditingPrinter(true) // Enable editing mode for new data
              setPrinterReadings(initialReadings)
              // Don't control parent's finalization status
              // onFinalSubmitChange(false);
            }
          }
        } catch (error) {
          console.error("Error loading snapshots:", error)
          setPrinterReadings(initialReadings)
        }
      } catch (error) {
        console.error("Error loading data for date:", error)
        showError("Failed to load data for selected date")
      } finally {
        setDataLoaded(true)
        setIsLoading(false)
      }
    }

    loadDataForDate()
  }, [date, branchName, userId, findMostRecentReadings, formatDateToYYYYMMDD, onFinalSubmitChange, showError])

  useEffect(() => {
    // Begin checking when date/branch changes
    if (!date || !branchName) {
      setIsFinalStateChecking(false)
      return
    }
    setIsFinalStateChecking(true)

    const check = async () => {
      try {
        const dateString = typeof date === "string" ? date : formatDateToYYYYMMDD(date)
        // Look for an existing printerReadings doc and reflect final status upward
        const qRef = query(
          collection(db, "printerReadings"),
          where("branchName", "==", branchName),
          where("date", "==", dateString),
        )
        const snap = await getDocs(qRef)
        if (!snap.empty) {
          const anyFinal = snap.docs.some((d) => Boolean(d.data()?.isFinalSubmitted) || Boolean(d.data()?.isLocked))
          onFinalSubmitChange?.(anyFinal)
        } else {
          onFinalSubmitChange?.(false)
        }
      } catch (e) {
        console.error("[v0] PrinterReadingsSection final check failed:", e)
      } finally {
        setIsFinalStateChecking(false)
      }
    }
    check()
  }, [date, branchName, formatDateToYYYYMMDD, onFinalSubmitChange])

  const handlePrinterInputChange = useCallback(
    (printerId, size, field, value) => {
      if (!date) {
        showWarning("Please select a date first")
        return
      }

      if (isFinalSubmitted) {
        showWarning("Data is locked after final submission")
        return
      }

      if (hasExistingPrinterData && !isEditingPrinter && !canEditCurrentDate() && !canEditPastDate()) {
        showWarning("Cannot edit this data. Enable edit mode first.")
        return
      }

      const cleanedValue =
        value === "" ? "" : value === "0" ? 0 : Number.parseFloat(value.replace(/[^0-9.]/g, "")) || ""

      // If user is manually changing a STARTING value that was preloaded, prevent the change
      if (field === "STARTING") {
        const currentData = printerReadings[printerId]?.[size]
        if (currentData?.isPreLoaded) {
          // Don't allow editing of preloaded starting values
          console.log(`🚫 Prevented editing of preloaded starting value for ${printerId}-${size}`)
          return
        }

        setPrinterReadings((prev) => {
          const updated = { ...prev }
          if (!updated[printerId]) updated[printerId] = {}
          if (!updated[printerId][size]) {
            updated[printerId][size] = {
              STARTING: "",
              "FINAL READING": "",
              noOfCopies: 0,
              price: 0,
              total: 0,
              isPreLoaded: false,
            }
          }

          // Since this is a manual edit and not preloaded, mark as not preloaded
          updated[printerId][size].isPreLoaded = false
          updated[printerId][size][field] = cleanedValue

          // Calculate copies and total
          const starting = updated[printerId][size].STARTING
          const finalReading = updated[printerId][size]["FINAL READING"]

          if (starting !== "" && finalReading !== "" && !isNaN(starting) && !isNaN(finalReading)) {
            const startingNum = Number(starting) || 0
            const finalReadingNum = Number(finalReading) || 0
            const copies = Math.max(0, finalReadingNum - startingNum)
            const price = Number(updated[printerId][size].price) || 0
            updated[printerId][size].noOfCopies = copies
            updated[printerId][size].total = copies * price
          } else {
            updated[printerId][size].noOfCopies = 0
            updated[printerId][size].total = 0
          }

          console.log("🔍 DEBUG: User manually changed STARTING, removed pre-loaded flag", {
            printerId,
            size,
            value: cleanedValue,
            isPreLoaded: updated[printerId][size].isPreLoaded,
          })

          return updated
        })
      } else {
        // For other fields, use the normal update logic
        setPrinterReadings((prev) => {
          const updated = { ...prev }
          if (!updated[printerId]) updated[printerId] = {}
          if (!updated[printerId][size]) {
            updated[printerId][size] = {
              STARTING: "",
              "FINAL READING": "",
              noOfCopies: 0,
              price: 0,
              total: 0,
              isPreLoaded: false,
            }
          }

          updated[printerId][size][field] = cleanedValue

          // Calculate copies and total
          const starting = updated[printerId][size].STARTING
          const finalReading = updated[printerId][size]["FINAL READING"]

          if (starting !== "" && finalReading !== "" && !isNaN(starting) && !isNaN(finalReading)) {
            const startingNum = Number(starting) || 0
            const finalReadingNum = Number(finalReading) || 0
            const copies = Math.max(0, finalReadingNum - startingNum)
            const price = Number(updated[printerId][size].price) || 0
            updated[printerId][size].noOfCopies = copies
            updated[printerId][size].total = copies * price
          } else {
            updated[printerId][size].noOfCopies = 0
            updated[printerId][size].total = 0
          }

          return updated
        })
      }

      // Clear validation errors for this field
      const key = `${printerId}-${size}`
      if (printerValidationErrors[key]) {
        setPrinterValidationErrors((prev) => {
          const updated = { ...prev }
          delete updated[key]
          return updated
        })
      }
    },
    [
      date,
      isFinalSubmitted,
      hasExistingPrinterData,
      isEditingPrinter,
      canEditCurrentDate,
      canEditPastDate,
      printerValidationErrors,
      showWarning,
    ],
  )

  const handleSubmitPrinterReadings = useCallback(async () => {
    if (!date) {
      showError("Please select a date first")
      return
    }

    if (!validatePrinterReadings()) {
      showError("Please fix the highlighted errors before submitting")
      return
    }

    try {
      setIsLoading(true)
      const dateString = typeof date === "string" ? date : formatDateToYYYYMMDD(date)

      if (hasExistingPrinterData && printerDocId) {
        const docRef = doc(db, "printerReadings", printerDocId)
        await updateDoc(docRef, {
          readings: printerReadings,
          lastUpdated: new Date(),
        })
        showSuccess("Printer readings updated successfully")
      } else {
        await addDoc(collection(db, "printerReadings"), {
          userId,
          branchName,
          date: dateString,
          readings: printerReadings,
          timestamp: new Date(),
        })
        setHasExistingPrinterData(true)
        showSuccess("Printer readings saved successfully")
      }

      setIsEditingPrinter(false)
    } catch (error) {
      console.error("Error saving printer readings:", error)
      showError(`Failed to save printer readings: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [
    branchName,
    date,
    hasExistingPrinterData,
    printerReadings,
    userId,
    validatePrinterReadings,
    formatDateToYYYYMMDD,
    printerDocId,
    showError,
    showSuccess,
  ])

  const handleFinalSubmit = useCallback(async () => {
    if (!date) {
      showError("Please select a date first")
      return
    }

    if (!validatePrinterReadings()) {
      showError("Please fix all errors before final submission")
      return
    }

    const confirmSubmit = window.confirm(
      "Are you sure you want to finalize this data? After final submission, you will not be able to edit this data for this date.",
    )

    if (!confirmSubmit) return

    try {
      setIsLoading(true)
      const dateString = typeof date === "string" ? date : formatDateToYYYYMMDD(date)

      if (hasExistingPrinterData && printerDocId) {
        const docRef = doc(db, "printerReadings", printerDocId)
        await updateDoc(docRef, {
          readings: printerReadings,
          isFinalSubmitted: true,
          finalSubmittedAt: new Date(),
          lastUpdated: new Date(),
        })
      } else {
        await addDoc(collection(db, "printerReadings"), {
          userId,
          branchName,
          date: dateString,
          readings: printerReadings,
          isFinalSubmitted: true,
          finalSubmittedAt: new Date(),
          timestamp: new Date(),
        })
        setHasExistingPrinterData(true)
      }

      onFinalSubmitChange(true)
      setIsEditingPrinter(false)
      showSuccess("Printer readings finalized successfully! Data is now locked for this date.")
    } catch (error) {
      console.error("Error finalizing printer readings:", error)
      showError(`Failed to finalize printer readings: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [
    branchName,
    date,
    hasExistingPrinterData,
    printerReadings,
    userId,
    validatePrinterReadings,
    formatDateToYYYYMMDD,
    printerDocId,
    onFinalSubmitChange,
    showError,
    showSuccess,
  ])

  const handleEditPrinter = useCallback(() => {
    if (!canEditCurrentDate() && !canEditPastDate()) {
      showError("Cannot edit this date. Only current date or approved past dates can be edited.")
      return
    }
    if (isFinalSubmitted) {
      showError("Cannot edit data after final submission.")
      return
    }
    setIsEditingPrinter(true)
  }, [canEditCurrentDate, canEditPastDate, isFinalSubmitted, showError])

  const handleCancelEdit = useCallback(() => {
    setIsEditingPrinter(false)
    window.location.reload()
  }, [])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  if (!dataLoaded) {
    return (
      <div className="stock-select-date-message">
        <div className="printer-loading-spinner"></div>
        <p>Loading printer readings data...</p>
      </div>
    )
  }

  if (printers.length === 0) {
    return (
      <div className="printer-readings-card">
        <div className="printer-readings-header">
          <h3>Printer Readings</h3>
        </div>
        <div className="printer-no-printers-message">
          <FaExclamationTriangle className="printer-warning-icon" />
          <h4>No Small Printers Available</h4>
          <p>
            Please contact your admin to add small printers or use the Move Printer feature to transfer printers to this
            branch.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="printer-readings-card">
      <div className="printer-readings-header">
        <div className="total-amount-title">
          <h3>Printer Readings</h3>
          {isFinalSubmitted && (
            <div className="printer-existing-data-warning">
              <FaLock /> Data Locked
            </div>
          )}
          {isEditingPrinter && (
            <div className="total-editing-indicator">
              <FaEdit /> Editing Mode
            </div>
          )}
        </div>
        <div className="printer-action-buttons">
          {(hasExistingPrinterData || !hasExistingPrinterData) &&
            !isEditingPrinter &&
            (canEditCurrentDate() || canEditPastDate()) &&
            !isFinalSubmitted && (
              <button onClick={handleEditPrinter} className="printer-edit-button" disabled={isLoading}>
                <FaEdit /> Edit
              </button>
            )}
          {isEditingPrinter && (
            <>
              <button onClick={handleCancelEdit} className="printer-cancel-button" disabled={isLoading}>
                Cancel
              </button>
              <button onClick={handleSubmitPrinterReadings} className="printer-save-button" disabled={isLoading}>
                <FaSave /> {hasExistingPrinterData ? "Update" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="printer-readings-content">
        {printers.map((printer) => {
          const printerTotal = Object.values(printerReadings[printer.printerId] || {}).reduce((sum, sizeData) => {
            const starting = sizeData.STARTING
            const finalReading = sizeData["FINAL READING"]
            if (starting !== "" && finalReading !== "" && !isNaN(starting) && !isNaN(finalReading)) {
              const copies = Math.max(0, Number(finalReading) - Number(starting))
              const total = copies * (Number(sizeData.price) || 0)
              return sum + total
            }
            return sum
          }, 0)

          return (
            <div
              key={printer.id}
              className={`printer-main-card ${
                hasExistingPrinterData && !isEditingPrinter ? "completed" : ""
              } ${printer.isInactiveWithData ? "inactive-printer" : ""} ${isFinalSubmitted ? "final-submitted" : ""}`}
            >
              <div className="printer-card-header">
                <div className="printer-card-title">
                  <h3>
                    {printer.printerName} ({printer.printerId})
                    {hasExistingPrinterData && !isEditingPrinter && (
                      <span className="printer-completed-badge">
                        <FaCheckCircle /> Completed
                      </span>
                    )}
                    {printer.isInactiveWithData && (
                      <span className="inactive-printer-badge">
                        <FaExclamationTriangle /> Inactive (Has Data)
                      </span>
                    )}
                  </h3>
                  {previousDateMap[printer.printerId] && (
                    <div className="printer-previous-data-info">
                      <FaInfoCircle />
                      Previous readings from: {previousDateMap[printer.printerId]}
                    </div>
                  )}
                </div>
              </div>

              <div className="printer-card-content">
                <table className="printer-readings-table">
                  <thead>
                    <tr>
                      <th className="printer-reading-type-col">Reading Type</th>
                      <th className="printer-size-col">Start Reading</th>
                      <th className="printer-size-col">Final Reading</th>
                      <th className="printer-size-col">No of Copies</th>
                      <th className="printer-size-col">Unit Price (₹)</th>
                      <th className="printer-total-col">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printer.prices?.map((priceObj, index) => {
                      const sizeData = printerReadings[printer.printerId]?.[priceObj.size] || {
                        STARTING: "",
                        "FINAL READING": "",
                        noOfCopies: 0,
                        price: Number(priceObj.price) || 0,
                        total: 0,
                      }

                      const starting = sizeData.STARTING
                      const finalReading = sizeData["FINAL READING"]
                      const copies =
                        starting !== "" && finalReading !== "" && !isNaN(starting) && !isNaN(finalReading)
                          ? Math.max(0, Number(finalReading) - Number(starting))
                          : 0

                      const calculatedTotal = copies * (Number(sizeData.price) || 0)
                      const validationKey = `${printer.printerId}-${priceObj.size}`
                      const hasError = printerValidationErrors[validationKey]
                      const isPreLoaded = sizeData.isPreLoaded === true
                      // Make starting value uneditable if it's generated from previous days, even if it's 0
                      const shouldBeReadOnly = isPreLoaded

                      // Debug logging
                      if (
                        printer.printerId === Object.keys(printerReadings)[0] &&
                        priceObj.size === printer.prices?.[0]?.size
                      ) {
                        console.log("🔍 DEBUG Field State:", {
                          printerId: printer.printerId,
                          size: priceObj.size,
                          startingValue: sizeData.STARTING,
                          isPreLoaded,
                          shouldBeReadOnly,
                          note: isPreLoaded
                            ? "Starting value auto-populated from previous date - uneditable"
                            : "Starting value editable",
                          sizeData: sizeData,
                        })
                      }

                      return (
                        <tr key={index}>
                          <td className="printer-reading-type">{priceObj.size}</td>
                          <td className="printer-size-col">
                            <input
                              type="number"
                              value={sizeData.STARTING}
                              onChange={(e) =>
                                handlePrinterInputChange(printer.printerId, priceObj.size, "STARTING", e.target.value)
                              }
                              className={`printer-reading-input ${hasError ? "validation-error" : ""} ${
                                shouldBeReadOnly ? "readonly-starting-value" : ""
                              }`}
                              style={{ width: "150px" }} // Increased width for better visibility
                              disabled={
                                isLoading ||
                                isFinalSubmitted ||
                                (hasExistingPrinterData && !isEditingPrinter) ||
                                shouldBeReadOnly
                              }
                              readOnly={shouldBeReadOnly}
                              min="0"
                              placeholder="0"
                              title={
                                shouldBeReadOnly
                                  ? `Starting value loaded from previous date: ${previousDateMap[printer.printerId] || "previous data"}`
                                  : "Enter starting reading"
                              }
                            />
                          </td>
                          <td className="printer-size-col">
                            <input
                              type="number"
                              value={sizeData["FINAL READING"]}
                              onChange={(e) =>
                                handlePrinterInputChange(
                                  printer.printerId,
                                  priceObj.size,
                                  "FINAL READING",
                                  e.target.value,
                                )
                              }
                              className={`printer-reading-input ${hasError ? "validation-error" : ""}`}
                              style={{ width: "150px" }} // Increased width for better visibility
                              disabled={isLoading || (hasExistingPrinterData && !isEditingPrinter) || isFinalSubmitted}
                              min="0"
                              placeholder="0"
                            />
                          </td>
                          <td className="printer-copies-cell">{copies > 0 ? copies.toLocaleString() : "0"}</td>
                          <td className="printer-copies-cell">₹{Number(sizeData.price).toFixed(2)}</td>
                          <td className="printer-amount-cell">{formatCurrency(calculatedTotal)}</td>
                        </tr>
                      )
                    })}
                    <tr className="printer-total-row">
                      <td colSpan="5" className="printer-grand-total">
                        Total for {printer.printerName}
                      </td>
                      <td className="printer-grand-total">{formatCurrency(printerTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>

      {/* Popup Component */}
      <Popup show={popup.show} message={popup.message} type={popup.type} onClose={() => {}} />
    </div>
  )
}

export default PrinterReadingsSection
