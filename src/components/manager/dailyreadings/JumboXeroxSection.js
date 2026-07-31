"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { db } from "../../../services/authservice"
import {
  collection,
  getDocs,
  addDoc,
  doc,
  query,
  where,
  onSnapshot,
  updateDoc,
  orderBy,
  limit,
} from "firebase/firestore"
import { FaSave, FaEdit, FaExclamationTriangle } from "react-icons/fa"
import React from "react"
import Papa from "papaparse"
import Popup from "../../common/Popup"
import { usePopup } from "../../../hooks/usePopup"

const JumboXeroxSection = ({
  date,
  branchName,
  userId,
  approvedDates,
  onFinalSubmitChange,
  isFinalSubmitted,
  isStockReadingsSubmitted = false,
  onCsvVerificationChange, // Add this new prop
}) => {
  const [printers, setPrinters] = useState([])
  const [jumboXeroxConfig, setJumboXeroxConfig] = useState([])
  const [filteredJumboConfig, setFilteredJumboConfig] = useState([])
  const [jumboRows, setJumboRows] = useState([])
  const [customJumboRows, setCustomJumboRows] = useState([])
  const [jumboCounter, setJumboCounter] = useState({
    start: "",
    end: "",
    sftPrinted: "",
  })
  const [hasExistingJumboData, setHasExistingJumboData] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [printersLoaded, setPrintersLoaded] = useState(false)
  const [jumboValidationErrors, setJumboValidationErrors] = useState({})
  const [isEditingJumbo, setIsEditingJumbo] = useState(false)
  const [jumboDocId, setJumboDocId] = useState(null)
  const [isSizeValid, setIsSizeValid] = useState(true)
  const [sftCalculationResults, setSftCalculationResults] = useState({
    sqftTotals: {},
    totalSqft: 0,
  })
  const [isSftCalculated, setIsSftCalculated] = useState(false)
  const [previousReading, setPreviousReading] = useState(null)
  const [printerLastFinalReading, setPrinterLastFinalReading] = useState(null)
  const [csvFile, setCsvFile] = useState(null)
  const [isProcessingCsv, setIsProcessingCsv] = useState(false)
  const [verificationResults, setVerificationResults] = useState([])
  const [showCsvResults, setShowCsvResults] = useState(false)
  const { popup, showSuccess, showError, showInfo, hidePopup } = usePopup()

  const paperDimensions = {
    A0: { width: 33.1, height: 46.8 },
    A1: { width: 23.4, height: 33.1 },
    A2: { width: 16.5, height: 23.4 },
    A3: { width: 11.7, height: 16.5 },
    A4: { width: 8.3, height: 11.7 },
    A5: { width: 5.8, height: 8.3 },
    A6: { width: 4.1, height: 5.8 },
    A7: { width: 2.9, height: 4.1 },
    A8: { width: 2.0, height: 2.9 },
    A9: { width: 1.5, height: 2.0 },
    A10: { width: 1.0, height: 1.5 },
  }

  const formatDateToYYYYMMDD = useCallback((date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }, [])

  const getPreviousDate = useCallback(
    (currentDate) => {
      const date = new Date(currentDate)
      date.setDate(date.getDate() - 1)
      return formatDateToYYYYMMDD(date)
    },
    [formatDateToYYYYMMDD],
  )

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

  const safeParseNumber = (v) => {
    // Accept empty string to allow clearing the field during typing
    if (v === "" || v === null || v === undefined) return ""
    const n = Number(v)
    return Number.isNaN(n) ? "" : n
  }

  function allowZeroNumber(val) {
    if (val === "" || val === null || val === undefined) return ""
    const num = Number(val)
    return Number.isNaN(num) ? "" : num // this preserves 0 instead of dropping it
  }

  useEffect(() => {
    if (!branchName) return

    const printersQuery = query(
      collection(db, "printers"),
      where("branchName", "==", branchName),
      where("printerType", "==", "LFP"),
      where("isActive", "==", true),
    )

    const unsubscribePrinters = onSnapshot(
      printersQuery,
      (querySnapshot) => {
        try {
          const printersData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          setPrinters(printersData)
          setPrintersLoaded(true)
        } catch (error) {
          console.error("Error loading printers:", error)
          showError("Failed to load printers")
          setPrintersLoaded(true)
        }
      },
      (error) => {
        console.error("Error in printers snapshot:", error)
        showError("Failed to load printers")
        setPrintersLoaded(true)
      },
    )

    return () => unsubscribePrinters()
  }, [branchName])

  useEffect(() => {
    if (!branchName) {
      setJumboXeroxConfig([])
      setConfigLoaded(true)
      return
    }

    setConfigLoaded(false)
    const jumboXeroxQuery = query(collection(db, "JumboXerox"), where("branch", "==", branchName))

    const unsubscribeConfig = onSnapshot(
      jumboXeroxQuery,
      (querySnapshot) => {
        try {
          const configData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          setJumboXeroxConfig(configData)
          setConfigLoaded(true)
        } catch (error) {
          console.error("Error loading JumboXerox config:", error)
          showError("Failed to load JumboXerox configuration")
          setConfigLoaded(true)
        }
      },
      (error) => {
        console.error("Error in JumboXerox config snapshot:", error)
        showError("Failed to load JumboXerox configuration")
        setConfigLoaded(true)
      },
    )

    return () => unsubscribeConfig()
  }, [branchName])

  useEffect(() => {
    if (!printersLoaded || !configLoaded) return

    const printerIds = printers.map((printer) => printer.printerId)
    const filtered = jumboXeroxConfig.filter((config) => printerIds.includes(config.printerId))

    setFilteredJumboConfig(filtered)
  }, [printers, jumboXeroxConfig, printersLoaded, configLoaded])

  useEffect(() => {
    if (!date || !branchName || !userId || !printers.length) return

    const loadPreviousReadingAndPrinterData = async () => {
      try {
        // Search for the last available reading within the past 30 days
        let foundReading = null
        const baseDate = new Date(date)

        // Search through the last 30 days
        for (let i = 1; i <= 30; i++) {
          // Create a new date for each iteration to avoid mutation issues
          const searchDate = new Date(baseDate)
          searchDate.setDate(baseDate.getDate() - i)
          const searchDateString = formatDateToYYYYMMDD(searchDate)

          // First check jumboXeroxReadings
          const jumboQuery = query(
            collection(db, "jumboXeroxReadings"),
            where("userId", "==", userId),
            where("branchName", "==", branchName),
            where("date", "==", searchDateString),
            orderBy("timestamp", "desc"),
            limit(1),
          )

          const jumboSnapshot = await getDocs(jumboQuery)
          if (!jumboSnapshot.empty) {
            const data = jumboSnapshot.docs[0].data()
            if (data.jumboCounter?.end !== undefined && data.jumboCounter.end !== null) {
              foundReading = data
              break
            }
          }

          // If not found in jumboXeroxReadings, check printerReadings
          if (!foundReading) {
            const printerQuery = query(
              collection(db, "printerReadings"),
              where("userId", "==", userId),
              where("branchName", "==", branchName),
              where("date", "==", searchDateString),
              orderBy("timestamp", "desc"),
              limit(1),
            )

            const printerSnapshot = await getDocs(printerQuery)
            if (!printerSnapshot.empty) {
              const data = printerSnapshot.docs[0].data()
              if (data.jumboCounter?.end !== undefined && data.jumboCounter.end !== null) {
                foundReading = data
                break
              }
            }
          }
        }

        if (foundReading) {
          setPreviousReading(foundReading)
          setPrinterLastFinalReading(null)
        } else {
          setPreviousReading(null)

          // Fallback to printer's lastFinalReadings if available
          if (printers.length > 0) {
            const printerDoc = printers[0]
            if (
              printerDoc.lastFinalReadings?.jumboCounter?.end !== undefined &&
              printerDoc.lastFinalReadings.jumboCounter.end !== null
            ) {
              setPrinterLastFinalReading(printerDoc.lastFinalReadings)
            } else {
              setPrinterLastFinalReading(null)
            }
          }
        }
      } catch (error) {
        console.error("Error loading previous reading:", error)
        setPreviousReading(null)
        setPrinterLastFinalReading(null)
      }
    }

    loadPreviousReadingAndPrinterData()
  }, [date, branchName, userId, formatDateToYYYYMMDD, printers])

  useEffect(() => {
    if (onCsvVerificationChange) {
      onCsvVerificationChange({
        showCsvResults,
        verificationResults,
        getStatusBadge,
        getStatusCounts,
      })
    }
  }, [showCsvResults, verificationResults, onCsvVerificationChange])

  const initialJumboRows = useMemo(() => {
    if (filteredJumboConfig.length === 0) return []

    const groupedData = filteredJumboConfig.reduce((acc, config) => {
      if (!acc[config.type]) {
        acc[config.type] = []
      }
      acc[config.type].push({
        type: config.type,
        size: config.size,
        unitPrice: config.unitPrice,
        qty: "",
        amount: "",
        printerId: config.printerId,
        printerName: config.printerName,
      })
      return acc
    }, {})

    const typeOrder = ["COLOUR", "B/W", "SCAN", "Color", "B&W"]
    const sortedRows = []
    typeOrder.forEach((type) => {
      if (groupedData[type]) {
        groupedData[type].sort((a, b) => a.size.localeCompare(b.size))
        sortedRows.push(...groupedData[type])
      }
    })

    Object.keys(groupedData).forEach((type) => {
      if (!typeOrder.includes(type)) {
        groupedData[type].sort((a, b) => a.size.localeCompare(b.size))
        sortedRows.push(...groupedData[type])
      }
    })

    return sortedRows
  }, [filteredJumboConfig])

  const groupJumboDataByType = useCallback((jumboData) => {
    const grouped = {}
    jumboData.forEach((row) => {
      if (!grouped[row.type]) {
        grouped[row.type] = []
      }
      grouped[row.type].push(row)
    })
    return grouped
  }, [])

  const calculateJumboTotals = useCallback((currentJumboRows, currentCustomRows = []) => {
    const standardTotals = currentJumboRows.reduce(
      (acc, row) => {
        acc.qty += Number(row.qty) || 0
        acc.amount += Number(row.amount) || 0
        return acc
      },
      { qty: 0, amount: 0 },
    )

    const customTotals = currentCustomRows.reduce(
      (acc, row) => {
        acc.qty += Number(row.qty) || 0
        acc.amount += Number(row.amount) || 0
        return acc
      },
      { qty: 0, amount: 0 },
    )

    return {
      qty: standardTotals.qty + customTotals.qty,
      amount: standardTotals.amount + customTotals.amount,
    }
  }, [])

  const handleSftCalculation = (jumboRows, customJumboRows) => {
    const sqftTotals = {}
    let totalSqft = 0

    const allRows = [...jumboRows, ...customJumboRows]
    allRows.forEach((row) => {
      const size = row.size.toUpperCase()
      const type = size || "Custom"
      const qty = Number(row.qty) || 0

      if (paperDimensions[type]) {
        const { width, height } = paperDimensions[type]
        const sqft = (width * height) / 144
        const totalForType = sqft * qty

        if (!sqftTotals[type]) {
          sqftTotals[type] = {
            size: `${width}x${height}`,
            paperDimensions: `${width} inches x ${height} inches`,
            sqft,
            qty: 0,
            totalsqft: 0,
          }
        }
        sqftTotals[type].qty += qty
        sqftTotals[type].totalsqft += totalForType

        totalSqft += totalForType
      } else if (row.size && row.isCustom) {
        const [width, height] = size.split("x").map(Number)
        const sqft = (width * height) / 144
        const totalForType = sqft * qty

        if (!sqftTotals["Custom"]) {
          sqftTotals["Custom"] = {
            size: size,
            paperDimensions: `${width} inches x ${height} inches`,
            sqft,
            qty: 0,
            totalsqft: 0,
          }
        }
        sqftTotals["Custom"].qty += qty
        sqftTotals["Custom"].totalsqft += totalForType

        totalSqft += totalForType
      }
    })

    setSftCalculationResults({ sqftTotals, totalSqft })
    setIsSftCalculated(true)

    return { sqftTotals, totalSqft }
  }

  const handleCustomSizeValidation = (value, rowIndex) => {
    const updatedRows = [...customJumboRows]
    const size = value.trim().toUpperCase()

    const predefinedSizes = Object.keys(paperDimensions)
    const customSizeRegex = /^\d{2}x\d{2}$/

    if (predefinedSizes.includes(size) || customSizeRegex.test(size.toLowerCase().trim())) {
      updatedRows[rowIndex].size = size
      setCustomJumboRows(updatedRows)
      setIsSizeValid(true)
    } else {
      showError(
        "Invalid size format. Please enter a predefined size (e.g., A0, A1) or dimensions in 'width x height' format (e.g., 12x13).",
      )
      setIsSizeValid(false)
      return
    }

    updatedRows[rowIndex].size = size
    setCustomJumboRows(updatedRows)
  }

  const validateJumboXeroxReadings = useCallback(() => {
    const errors = {}
    let hasErrors = false

    jumboRows.forEach((row, index) => {
      if (row.qty !== "" && row.qty !== 0) {
        if (row.amount === "" || row.amount === 0) {
          errors[`jumbo-${index}`] = "Amount is required when quantity is entered"
          hasErrors = true
        }
      }
    })

    customJumboRows.forEach((row, index) => {
      const key = `custom-${index}`
      if (row.size === "") {
        errors[key] = "Size is required for custom rows"
        hasErrors = true
      }
      if (row.unitPrice === "" || row.unitPrice === 0) {
        errors[key] = "Unit price is required for custom rows"
        hasErrors = true
      }
      if (row.qty !== "" && row.qty !== 0) {
        if (row.amount === "" || row.amount === 0) {
          errors[key] = "Amount is required when quantity is entered"
          hasErrors = true
        }
      }
    })

    if (jumboCounter.start !== "" && jumboCounter.end !== "") {
      if (Number(jumboCounter.end) < Number(jumboCounter.start)) {
        errors["counter"] = "End counter must be greater than or equal to start counter"
        hasErrors = true
      }
    }

    setJumboValidationErrors(errors)
    return !hasErrors
  }, [jumboRows, customJumboRows, jumboCounter])

  useEffect(() => {
    if (!date || !branchName || !userId || !configLoaded || !printersLoaded) return

    const loadDataForDate = async () => {
      try {
        setDataLoaded(false)
        setIsLoading(true)
        
        // Reset state first
        setCustomJumboRows([])
        setHasExistingJumboData(false)
        setIsEditingJumbo(false)
        setJumboDocId(null)

        let initialStartCounter = ""
        if (previousReading?.jumboCounter?.end !== undefined && previousReading.jumboCounter.end !== null) {
          const endValue = Number(previousReading.jumboCounter.end)
          initialStartCounter = endValue.toString()
        } else if (
          printerLastFinalReading?.jumboCounter?.end !== undefined &&
          printerLastFinalReading.jumboCounter.end !== null
        ) {
          const endValue = Number(printerLastFinalReading.jumboCounter.end)
          initialStartCounter = endValue.toString()
        }

        const initialCounter = {
          start: initialStartCounter,
          end: "",
          sftPrinted: "",
        }
        setJumboCounter(initialCounter)

        const dateString = typeof date === "string" ? date : formatDateToYYYYMMDD(date)

        try {
          const jumboSnapshot = await getDocs(
            query(
              collection(db, "jumboXeroxReadings"),
              where("branchName", "==", branchName),
              where("date", "==", dateString),
            ),
          )

          if (!jumboSnapshot.empty) {
            setHasExistingJumboData(true)
            setIsEditingJumbo(false) // Set to viewing mode for existing data
            setJumboDocId(jumboSnapshot.docs[0].id)
            const docData = jumboSnapshot.docs[0].data()

            if (docData.rows) {
              // If we have initialJumboRows, merge with saved data
              if (initialJumboRows.length > 0) {
                const updatedJumboRows = initialJumboRows.map((initialRow) => {
                  const savedRow = docData.rows.find(
                    (row) => !row.isCustom && 
                    row.type === initialRow.type && 
                    row.size === initialRow.size &&
                    row.printerId === initialRow.printerId
                  )
                  
                  if (savedRow) {
                    return {
                      ...initialRow,
                      qty: savedRow.qty !== undefined ? savedRow.qty : 0,
                      amount: savedRow.amount !== undefined ? savedRow.amount : 0,
                      unitPrice: savedRow.unitPrice !== undefined ? savedRow.unitPrice : initialRow.unitPrice,
                    }
                  }
                  return initialRow
                })
                setJumboRows(updatedJumboRows)
              } else {
                // If no initialJumboRows yet, use saved data directly for non-custom rows
                const savedStandardRows = docData.rows
                  .filter((row) => !row.isCustom)
                  .map((row) => ({
                    ...row,
                    qty: row.qty !== undefined ? row.qty : 0,
                    amount: row.amount !== undefined ? row.amount : 0,
                    unitPrice: row.unitPrice !== undefined ? row.unitPrice : 0,
                  }))
                setJumboRows(savedStandardRows)
              }

              const savedCustomRows = docData.rows
                .filter((row) => row.isCustom)
                .map((row) => ({
                  ...row,
                  qty: row.qty !== undefined ? row.qty : 0,
                  amount: row.amount !== undefined ? row.amount : 0,
                  unitPrice: row.unitPrice !== undefined ? row.unitPrice : 0,
                  size: row.size || "",
                }))

              setCustomJumboRows(savedCustomRows)
            }

            if (docData.jumboCounter) {
              setJumboCounter({
                start: docData.jumboCounter.start !== undefined ? String(docData.jumboCounter.start) : "",
                end: docData.jumboCounter.end !== undefined ? String(docData.jumboCounter.end) : "",
                sftPrinted: docData.jumboCounter.sftPrinted !== undefined ? String(docData.jumboCounter.sftPrinted) : "",
              })
            }

            // Don't control parent's finalization status
            // const jumboSubmitted = docData.isFinalSubmitted === true
            // onFinalSubmitChange(jumboSubmitted)
          } else {
            setJumboRows(initialJumboRows)
            setHasExistingJumboData(false)
            setIsEditingJumbo(true) // Enable editing mode for new data
          }
        } catch (error) {
          console.error("Error loading snapshots:", error)
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
  }, [
    date,
    branchName,
    userId,
    configLoaded,
    printersLoaded,
    initialJumboRows,
    formatDateToYYYYMMDD,
    previousReading,
    printerLastFinalReading,
  ])

  // Separate effect to re-merge data when initialJumboRows becomes available
  useEffect(() => {
    if (!hasExistingJumboData || !jumboDocId || !initialJumboRows.length || jumboRows.length === 0) return

    // Check if current jumboRows don't have the proper structure (missing initialRow properties)
    const needsRemerging = jumboRows.some(row => !row.printerId || !row.printerName)
    
    if (needsRemerging) {
      const remergedRows = initialJumboRows.map((initialRow) => {
        const existingRow = jumboRows.find(
          (row) => row.type === initialRow.type && row.size === initialRow.size
        )
        
        if (existingRow) {
          return {
            ...initialRow,
            qty: existingRow.qty !== undefined ? existingRow.qty : 0,
            amount: existingRow.amount !== undefined ? existingRow.amount : 0,
            unitPrice: existingRow.unitPrice !== undefined ? existingRow.unitPrice : initialRow.unitPrice,
          }
        }
        return initialRow
      })
      
      setJumboRows(remergedRows)
    }
  }, [hasExistingJumboData, jumboDocId, initialJumboRows, jumboRows])

  const handleJumboInputChange = useCallback(
    (index, field, value) => {
      if (!date) {
        showInfo("Please select a date first")
        return
      }

      if (isFinalSubmitted) {
        showInfo("Data is locked after final submission")
        return
      }

      if (hasExistingJumboData && !isEditingJumbo && !canEditCurrentDate() && !canEditPastDate()) {
        showInfo("Cannot edit this data. Enable edit mode first.")
        return
      }

      const sanitized = value.replace(/[^0-9.]/g, "")
      const cleanedValue = value === "" ? "" : allowZeroNumber(sanitized)

      const updatedJumboRows = [...jumboRows]
      updatedJumboRows[index][field] = cleanedValue

      if ((field === "qty" || field === "unitPrice") && cleanedValue !== "") {
        const qty = field === "qty" ? cleanedValue : updatedJumboRows[index].qty
        const unitPrice = field === "unitPrice" ? cleanedValue : updatedJumboRows[index].unitPrice

        if (qty !== "" && unitPrice !== "") {
          updatedJumboRows[index].amount = Number(qty) * Number(unitPrice)
        }
      }

      setJumboRows(updatedJumboRows)

      const key = `jumbo-${index}`
      if (jumboValidationErrors[key]) {
        setJumboValidationErrors((prev) => {
          const updated = { ...prev }
          delete updated[key]
          return updated
        })
      }
    },
    [
      date,
      jumboRows,
      hasExistingJumboData,
      isEditingJumbo,
      canEditCurrentDate,
      canEditPastDate,
      isFinalSubmitted,
      jumboValidationErrors,
    ],
  )

  const handleAddCustomRow = useCallback(() => {
    if (!date) {
      showInfo("Please select a date first")
      return
    }

    if (isFinalSubmitted) {
      showInfo("Data is locked after final submission")
      return
    }

    if (hasExistingJumboData && !isEditingJumbo && !canEditCurrentDate() && !canEditPastDate()) {
      showInfo("Cannot edit this data. Enable edit mode first.")
      return
    }

    setCustomJumboRows((prev) => [
      ...prev,
      {
        type: "CUSTOM",
        size: "",
        unitPrice: "",
        qty: "",
        amount: "",
        isCustom: true,
      },
    ])
  }, [date, hasExistingJumboData, isEditingJumbo, canEditCurrentDate, canEditPastDate, isFinalSubmitted])

  const handleRemoveCustomRow = useCallback(() => {
    if (!date) {
      showInfo("Please select a date first")
      return
    }

    if (isFinalSubmitted) {
      showInfo("Data is locked after final submission")
      return
    }

    if (hasExistingJumboData && !isEditingJumbo && !canEditCurrentDate() && !canEditPastDate()) {
      showInfo("Cannot edit this data. Enable edit mode first.")
      return
    }

    if (customJumboRows.length > 0) {
      setCustomJumboRows((prev) => prev.slice(0, -1))
    }
  }, [
    date,
    customJumboRows.length,
    hasExistingJumboData,
    isEditingJumbo,
    canEditCurrentDate,
    canEditPastDate,
    isFinalSubmitted,
  ])

  const handleCustomJumboInputChange = useCallback(
    (index, field, value) => {
      if (!date) {
        showInfo("Please select a date first")
        return
      }

      if (isFinalSubmitted) {
        showInfo("Data is locked after final submission")
        return
      }

      if (hasExistingJumboData && !isEditingJumbo && !canEditCurrentDate() && !canEditPastDate()) {
        showInfo("Cannot edit this data. Enable edit mode first.")
        return
      }

      const cleanedValue = value === "" ? "" : field === "size" ? value : allowZeroNumber(value.replace(/[^0-9.]/g, ""))

      const updatedCustomRows = [...customJumboRows]
      updatedCustomRows[index][field] = cleanedValue

      if ((field === "qty" || field === "unitPrice") && cleanedValue !== "") {
        const qty = field === "qty" ? cleanedValue : updatedCustomRows[index].qty
        const unitPrice = field === "unitPrice" ? cleanedValue : updatedCustomRows[index].unitPrice

        if (qty !== "" && unitPrice !== "") {
          updatedCustomRows[index].amount = Number(qty) * Number(unitPrice)
        }
      }

      setCustomJumboRows(updatedCustomRows)

      const key = `custom-${index}`
      if (jumboValidationErrors[key]) {
        setJumboValidationErrors((prev) => {
          const updated = { ...prev }
          delete updated[key]
          return updated
        })
      }
    },
    [
      date,
      customJumboRows,
      hasExistingJumboData,
      isEditingJumbo,
      canEditCurrentDate,
      canEditPastDate,
      isFinalSubmitted,
      jumboValidationErrors,
    ],
  )

  const handleCounterChange = useCallback(
    (field, value) => {
      if (!date) {
        showInfo("Please select a date first")
        return
      }

      if (isFinalSubmitted) {
        showInfo("Data is locked after final submission")
        return
      }

      if (hasExistingJumboData && !isEditingJumbo && !canEditCurrentDate() && !canEditPastDate()) {
        showInfo("Cannot edit this data. Enable edit mode first.")
        return
      }

      if (field === "start") {
        if (hasExistingJumboData) {
          showInfo("Start counter cannot be modified for existing data")
          return
        }

        if (previousReading?.jumboCounter?.end && Number(previousReading.jumboCounter.end) > 0) {
          showInfo(`Start counter is automatically set from previous reading (${previousReading.jumboCounter.end})`)
          return
        }

        if (printerLastFinalReading?.jumboCounter?.end && Number(printerLastFinalReading.jumboCounter.end) > 0) {
          showInfo(
            `Start counter is automatically set from printer's last final reading (${printerLastFinalReading.jumboCounter.end})`,
          )
          return
        }
      }

      const cleanedValue =
        field === "sftPrinted" ? value : value === "" ? "" : allowZeroNumber(value.replace(/[^0-9.]/g, ""))

      const updatedCounter = { ...jumboCounter, [field]: cleanedValue }

      if ((field === "start" || field === "end") && updatedCounter.start !== "" && updatedCounter.end !== "") {
        updatedCounter.sftPrinted = Math.abs(Number(updatedCounter.end) - Number(updatedCounter.start)).toFixed(2)
      }

      setJumboCounter(updatedCounter)

      if (jumboValidationErrors["counter"]) {
        setJumboValidationErrors((prev) => {
          const updated = { ...prev }
          delete updated["counter"]
          return updated
        })
      }
    },
    [
      date,
      jumboCounter,
      hasExistingJumboData,
      isEditingJumbo,
      canEditCurrentDate,
      canEditPastDate,
      isFinalSubmitted,
      jumboValidationErrors,
      previousReading,
      printerLastFinalReading,
    ],
  )

  // Helper function to determine if start counter should be disabled
  const isStartCounterDisabled = useCallback(() => {
    // Always disabled during loading or if final submitted
    if (isLoading || isFinalSubmitted) {
      return true
    }

    // If there's existing data and we're not in edit mode
    if (hasExistingJumboData && !isEditingJumbo) {
      return true
    }

    // If there's existing data at all (to prevent modification of start counter)
    if (hasExistingJumboData) {
      return true
    }

    // If there's a previous reading end value, start counter should be auto-set and disabled
    if (previousReading?.jumboCounter?.end !== undefined && previousReading.jumboCounter.end !== null) {
      return true
    }

    // If there's a printer's last final reading, start counter should be auto-set and disabled
    if (printerLastFinalReading?.jumboCounter?.end !== undefined && printerLastFinalReading.jumboCounter.end !== null) {
      return true
    }

    // Otherwise, it should be editable (no previous data found)
    return false
  }, [isLoading, isFinalSubmitted, hasExistingJumboData, isEditingJumbo, previousReading, printerLastFinalReading])

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === "text/csv") {
      setCsvFile(file)
      setShowCsvResults(false)
      setVerificationResults([])
    } else {
      showError("Please select a valid CSV file")
      setCsvFile(null)
    }
  }

  const validateCsvHeaders = (headers) => {
    const requiredHeaders = ["Print Job Start Time", "Media Type", "Printer Paper Size", "Pages"]
    const normalizedHeaders = headers.map((h) => h.trim())

    const missingHeaders = requiredHeaders.filter(
      (required) => !normalizedHeaders.some((header) => header === required),
    )

    if (missingHeaders.length > 0) {
      return false
    }

    return true
  }

  const parseCsvFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error("CSV parsing error: " + results.errors[0].message))
            return
          }

          const headers = Object.keys(results.data[0] || {})
          if (!validateCsvHeaders(headers)) {
            reject(
              new Error("CSV file must contain columns: Print Job Start Time, Media Type, Printer Paper Size, Pages"),
            )
            return
          }

          resolve(results.data)
        },
        error: (error) => {
          reject(error)
        },
      })
    })
  }

  const fetchJumboXeroxDataForCsv = async (branchName, date) => {
    try {
      const q = query(
        collection(db, "jumboXeroxReadings"),
        where("branchName", "==", branchName),
        where("date", "==", date),
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => doc.data())
    } catch (error) {
      console.error("Error fetching jumbo xerox data:", error)
      return []
    }
  }

  const extractDateFromTimestamp = (timestamp) => {
    try {
      if (timestamp.includes("T")) {
        return timestamp.split("T")[0]
      } else if (timestamp.includes(" ")) {
        return timestamp.split(" ")[0]
      } else {
        return timestamp
      }
    } catch (error) {
      console.error("Error extracting date:", error)
      return null
    }
  }

  const verifyRow = async (csvRow) => {
    const printJobStartTime = csvRow["Print Job Start Time"]
    const mediaType = csvRow["Media Type"]
    const paperSize = csvRow["Printer Paper Size"]
    const pages = csvRow["Pages"]

    const extractedDate = extractDateFromTimestamp(printJobStartTime)

    if (!extractedDate) {
      return {
        ...csvRow,
        extractedDate: extractedDate,
        status: "Invalid",
        message: "Invalid timestamp format in Print Job Start Time",
      }
    }

    const documents = await fetchJumboXeroxDataForCsv(branchName, extractedDate)

    if (documents.length === 0) {
      return {
        ...csvRow,
        extractedDate: extractedDate,
        status: "Not Found",
        message: "No document found for this branch and date",
      }
    }

    for (const doc of documents) {
      if (doc.rows && Array.isArray(doc.rows)) {
        const matchingRow = doc.rows.find(
          (row) =>
            row.type === mediaType && row.size === paperSize && Number.parseInt(row.qty) === Number.parseInt(pages),
        )

        if (matchingRow) {
          return {
            ...csvRow,
            extractedDate: extractedDate,
            status: "Match",
            message: "Exact match found",
          }
        }
      }
    }

    return {
      ...csvRow,
      extractedDate: extractedDate,
      status: "No Match",
      message: "No matching row found",
    }
  }

  const handleVerifyCSV = async () => {
    if (!csvFile) {
      showError("Please select a CSV file")
      return
    }

    setIsProcessingCsv(true)
    setShowCsvResults(false)

    try {
      const csvData = await parseCsvFile(csvFile)

      if (csvData.length === 0) {
        showError("CSV file is empty")
        setIsProcessingCsv(false)
        return
      }

      const results = []
      for (const row of csvData) {
        const result = await verifyRow(row)
        results.push(result)
      }

      setVerificationResults(results)
      setShowCsvResults(true)
      showSuccess(`Verification completed for ${results.length} rows`)
    } catch (error) {
      console.error("Error verifying CSV:", error)
      showError(error.message || "Failed to verify CSV file")
    } finally {
      setIsProcessingCsv(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusStyles = {
      Match: { backgroundColor: "#d4edda", color: "#155724" },
      "No Match": { backgroundColor: "#f8d7da", color: "#721c24" },
      "Not Found": { backgroundColor: "#fff3cd", color: "#856404" },
      Invalid: { backgroundColor: "#e2e3e5", color: "#383d41" },
    }

    const style = statusStyles[status] || { backgroundColor: "#e9ecef", color: "#495057" }

    return (
      <span
        style={{
          ...style,
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "600",
          textTransform: "uppercase",
        }}
      >
        {status}
      </span>
    )
  }

  const getStatusCounts = () => {
    const counts = {
      Match: 0,
      "No Match": 0,
      "Not Found": 0,
      Invalid: 0,
    }

    verificationResults.forEach((result) => {
      counts[result.status] = (counts[result.status] || 0) + 1
    })

    return counts
  }

  const handleSubmitJumboXerox = useCallback(async () => {
    if (!date) {
      showError("Please select a date first")
      return
    }

    if (!validateJumboXeroxReadings()) {
      showError("Please fix the highlighted errors before submitting")
      return
    }

    try {
      setIsLoading(true)
      const dateString = typeof date === "string" ? date : formatDateToYYYYMMDD(date)

      const rowsForStorage = jumboRows.map((row) => ({
        ...row,
        qty: row.qty === "" ? 0 : Number(row.qty),
        amount: row.amount === "" ? 0 : Number(row.amount),
        unitPrice: row.unitPrice === "" ? 0 : Number(row.unitPrice),
      }))

      const customRowsForStorage = customJumboRows.map((row) => ({
        ...row,
        qty: row.qty === "" ? 0 : Number(row.qty),
        amount: row.amount === "" ? 0 : Number(row.amount),
        unitPrice: row.unitPrice === "" ? 0 : Number(row.unitPrice),
        size: row.size || "Custom",
        isCustom: true,
      }))

      const allRowsForStorage = [...rowsForStorage, ...customRowsForStorage]

      const counterForStorage = {
        start: jumboCounter.start === "" ? 0 : Number(jumboCounter.start),
        end: jumboCounter.end === "" ? 0 : Number(jumboCounter.end),
        sftPrinted: jumboCounter.sftPrinted || "0.00",
      }

      const dataToSave = {
        rows: allRowsForStorage,
        jumboCounter: counterForStorage,
        totalQty: calculateJumboTotals(rowsForStorage, customRowsForStorage).qty,
        totalAmount: calculateJumboTotals(rowsForStorage, customRowsForStorage).amount,
        lastUpdated: new Date(),
      }

      if (hasExistingJumboData && jumboDocId) {
        const docRef = doc(db, "jumboXeroxReadings", jumboDocId)
        await updateDoc(docRef, dataToSave)
        showSuccess("Large format printing readings updated successfully")
      } else {
        const newDoc = await addDoc(collection(db, "jumboXeroxReadings"), {
          userId,
          branchName,
          printerId: printers[0]?.printerId,
          printerName: printers[0]?.printerName,
          date: dateString,
          timestamp: new Date(),
          ...dataToSave,
        })
        setHasExistingJumboData(true)
        setJumboDocId(newDoc.id)
        showSuccess("Large format printing readings saved successfully")
      }

      setIsEditingJumbo(false)
    } catch (error) {
      console.error("Error saving large format printing readings:", error)
      showError(`Failed to save large format printing readings: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [
    branchName,
    calculateJumboTotals,
    date,
    hasExistingJumboData,
    jumboCounter,
    jumboRows,
    customJumboRows,
    userId,
    validateJumboXeroxReadings,
    formatDateToYYYYMMDD,
    jumboDocId,
    isStockReadingsSubmitted, // Add to dependencies
  ])

  const handleEditJumbo = useCallback(() => {
    if (!canEditCurrentDate() && !canEditPastDate()) {
      showError("Cannot edit this date. Only current date or approved past dates can be edited.")
      return
    }
    if (isFinalSubmitted) {
      showError("Cannot edit data after final submission.")
      return
    }
    setIsEditingJumbo(true)
  }, [canEditCurrentDate, canEditPastDate, isFinalSubmitted])

  const handleCancelEdit = useCallback(() => {
    setIsEditingJumbo(false)
    window.location.reload()
  }, [])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  if (!printersLoaded || !configLoaded) {
    return (
      <div className="stock-select-date-message">
        <div className="printer-loading-spinner"></div>
        <p>Loading printers and configuration...</p>
      </div>
    )
  }

  if (printersLoaded && printers.length === 0) {
    return (
      <div className="printer-error-container">
        <FaExclamationTriangle className="printer-error-icon" />
        <h3>No Large Printers Found</h3>
        <p>
          Please contact admin to add large printers for {branchName} or use the Move Printer feature to transfer
          printers from other branches.
        </p>
      </div>
    )
  }

  if (configLoaded && printersLoaded && filteredJumboConfig.length === 0) {
    return (
      <div className="printer-error-container">
        <FaExclamationTriangle className="printer-error-icon" />
        <h3>No JumboXerox Configuration Found</h3>
        <p>Please contact admin to add JumboXerox configuration for large printers in {branchName}</p>
        {jumboXeroxConfig.length > 0 && (
          <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
            <p>Available configurations don't match any active large printers.</p>
            <p>Please verify printer IDs in JumboXerox configuration.</p>
          </div>
        )}
      </div>
    )
  }

  if (!dataLoaded) {
    return (
      <div className="stock-select-date-message">
        <div className="printer-loading-spinner"></div>
        <p>Loading large format printing data...</p>
      </div>
    )
  }

  const jumboTotals = calculateJumboTotals(jumboRows, customJumboRows)
  const groupedJumboData = groupJumboDataByType(jumboRows)

  return (
    <div className="jumbo-xerox-card">
      <Popup {...popup} />
      <div className="jumbo-xerox-header">
        <div className="total-amount-title">
          <h3>Large Format Printing</h3>

          {isFinalSubmitted && <div className="printer-existing-data-warning">Data Locked</div>}
        </div>
        <div className="jumbo-action-buttons">
          {hasExistingJumboData &&
            !isEditingJumbo &&
            (canEditCurrentDate() || canEditPastDate()) &&
            !isFinalSubmitted && (
              <button onClick={handleEditJumbo} className="jumbo-edit-button" disabled={isLoading}>
                <FaEdit /> Edit
              </button>
            )}
          {(isEditingJumbo || !hasExistingJumboData) && !isFinalSubmitted && (
            <div className="button-group">
              {isEditingJumbo && hasExistingJumboData && (
                <button onClick={handleCancelEdit} className="jumbo-cancel-button" disabled={isLoading}>
                  Cancel
                </button>
              )}
              <button onClick={handleSubmitJumboXerox} className="jumbo-save-button" disabled={isLoading}>
                <FaSave /> {isEditingJumbo && hasExistingJumboData ? "Update" : "Save Readings"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="jumbo-xerox-content">
        <table className="jumbo-xerox-table">
          <thead>
            <tr>
              <th>Type/Size</th>
              <th>Unit Price (₹)</th>
              <th>QTY</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedJumboData).map(([type, items]) => (
              <React.Fragment key={type}>
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      backgroundColor: "#8b4513",
                      color: "white",
                      textAlign: "center",
                      fontWeight: "600",
                      padding: "0.5rem",
                    }}
                  >
                    {type}
                  </td>
                </tr>
                {items.map((row, index) => {
                  const originalIndex = jumboRows.findIndex((r) => r.type === row.type && r.size === row.size)
                  const hasError = jumboValidationErrors[`jumbo-${originalIndex}`]
                  return (
                    <tr key={`${type}-${index}`}>
                      <td>{row.size}</td>
                      <td>₹{row.unitPrice}</td>
                      <td>
                        <input
                          type="number"
                          value={row.qty}
                          onChange={(e) => handleJumboInputChange(originalIndex, "qty", e.target.value)}
                          className={`jumbo-input ${hasError ? "validation-error" : ""}`}
                          disabled={isLoading || (hasExistingJumboData && !isEditingJumbo) || isFinalSubmitted}
                          min="0"
                          placeholder="0"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) => handleJumboInputChange(originalIndex, "amount", e.target.value)}
                          className={`jumbo-input ${hasError ? "validation-error" : ""}`}
                          disabled={isLoading || (hasExistingJumboData && !isEditingJumbo) || isFinalSubmitted}
                          min="0"
                          placeholder="0"
                        />
                        {hasError && (
                          <div className="validation-error-text">{jumboValidationErrors[`jumbo-${originalIndex}`]}</div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}

            {customJumboRows.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      backgroundColor: "#8b4513",
                      color: "white",
                      textAlign: "center",
                      fontWeight: "600",
                      padding: "0.5rem",
                    }}
                  >
                    CUSTOM
                  </td>
                </tr>
                {customJumboRows.map((row, index) => {
                  const hasError = jumboValidationErrors[`custom-${index}`]
                  return (
                    <tr key={`custom-${index}`}>
                      <td>
                        <input
                          type="text"
                          value={row.size}
                          onChange={(e) => handleCustomJumboInputChange(index, "size", e.target.value)}
                          onBlur={(e) => handleCustomSizeValidation(e.target.value, index)}
                          className={`jumbo-input ${hasError ? "validation-error" : ""}`}
                          disabled={isLoading || (hasExistingJumboData && !isEditingJumbo) || isFinalSubmitted}
                          placeholder="Size (e.g., 12x18)"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.unitPrice}
                          onChange={(e) => handleCustomJumboInputChange(index, "unitPrice", e.target.value)}
                          className={`jumbo-input ${hasError ? "validation-error" : ""}`}
                          disabled={
                            isLoading || (hasExistingJumboData && !isEditingJumbo) || isFinalSubmitted || !isSizeValid
                          }
                          min="0"
                          placeholder="Price"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.qty}
                          onChange={(e) => handleCustomJumboInputChange(index, "qty", e.target.value)}
                          className={`jumbo-input ${hasError ? "validation-error" : ""}`}
                          disabled={isLoading || (hasExistingJumboData && !isEditingJumbo) || isFinalSubmitted}
                          min="0"
                          placeholder="0"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) => handleCustomJumboInputChange(index, "amount", e.target.value)}
                          className={`jumbo-input ${hasError ? "validation-error" : ""}`}
                          disabled={isLoading || (hasExistingJumboData && !isEditingJumbo) || isFinalSubmitted}
                          min="0"
                          placeholder="0"
                        />
                        {hasError && (
                          <div className="validation-error-text">{jumboValidationErrors[`custom-${index}`]}</div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </>
            )}

            {(!hasExistingJumboData || isEditingJumbo) && (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", padding: "0.75rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "1rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleAddCustomRow}
                      style={{
                        backgroundColor: "#1e3a8a",
                        color: "white",
                        border: "none",
                        borderRadius: "0.25rem",
                        padding: "0.5rem 1rem",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                      disabled={isLoading}
                    >
                      Add Custom Row
                    </button>
                    {customJumboRows.length > 0 && (
                      <button
                        type="button"
                        onClick={handleRemoveCustomRow}
                        style={{
                          backgroundColor: "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: "0.25rem",
                          padding: "0.5rem 1rem",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                        disabled={isLoading}
                      >
                        Remove Last
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="jumbo-total-row">
              <td colSpan="2" className="jumbo-total-label">
                Total
              </td>
              <td className="jumbo-total-qty">{jumboTotals.qty}</td>
              <td className="jumbo-total-amount">{formatCurrency(jumboTotals.amount)}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: "1rem" }}>
          <h4
            style={{
              margin: "0 0 0.5rem 0",
              color: "#1e3a8a",
              fontSize: "0.9rem",
            }}
          >
            Large Format Printing Counter Details
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "0.8rem",
                  color: "#1e3a8a",
                  fontWeight: "600",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                Start Counter
              </label>
              <input
                type="number"
                value={jumboCounter.start}
                onChange={(e) => handleCounterChange("start", e.target.value)}
                className="jumbo-input"
                disabled={isStartCounterDisabled()}
                min="0"
                placeholder="0"
              />
              {isStartCounterDisabled() && (
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#6b7280",
                    marginTop: "0.25rem",
                    fontStyle: "italic",
                  }}
                >
                  {hasExistingJumboData
                    ? "Cannot modify existing data"
                    : previousReading?.jumboCounter?.end && Number(previousReading.jumboCounter.end) > 0
                      ? `Auto-set from previous reading (${previousReading.jumboCounter.end})`
                      : printerLastFinalReading?.jumboCounter?.end &&
                          Number(printerLastFinalReading.jumboCounter.end) > 0
                        ? `Auto-set from last reading (${printerLastFinalReading.jumboCounter.end})`
                        : "Read-only"}
                </div>
              )}
            </div>
            <div>
              <label
                style={{
                  fontSize: "0.8rem",
                  color: "#1e3a8a",
                  fontWeight: "600",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                End Counter
              </label>
              <input
                type="number"
                value={jumboCounter.end}
                onChange={(e) => handleCounterChange("end", e.target.value)}
                className="jumbo-input"
                disabled={isLoading || (hasExistingJumboData && !isEditingJumbo) || isFinalSubmitted}
                min="0"
                placeholder="0"
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "0.8rem",
                  color: "#1e3a8a",
                  fontWeight: "600",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                SFT Printed
              </label>
              <input
                type="number"
                value={jumboCounter.sftPrinted}
                className="jumbo-input"
                disabled={true}
                placeholder="0"
              />
            </div>
          </div>

          <div style={{ marginTop: "1rem", borderTop: "1px solid #e9ecef", paddingTop: "1rem" }}>
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#1e3a8a", fontSize: "0.9rem" }}>CSV Verification</h4>
            <div style={{ display: "flex", gap: "1rem", alignItems: "end", marginBottom: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    fontSize: "0.8rem",
                    color: "#1e3a8a",
                    fontWeight: "600",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="jumbo-input"
                  style={{ minWidth: "250px" }}
                />
              </div>
              <button
                type="button"
                onClick={handleVerifyCSV}
                disabled={isProcessingCsv || !csvFile}
                style={{
                  backgroundColor: "#1e3a8a",
                  color: "white",
                  border: "none",
                  borderRadius: "0.25rem",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                {isProcessingCsv ? (
                  <>
                    <div
                      className="stock-loading-spinner"
                      style={{ width: "16px", height: "16px", marginRight: "0.5rem" }}
                    ></div>
                    Processing...
                  </>
                ) : (
                  "Verify CSV"
                )}
              </button>
            </div>
          </div>

          {jumboValidationErrors["counter"] && (
            <div className="validation-error-text">{jumboValidationErrors["counter"]}</div>
          )}
          {}
          {isSftCalculated && (
            <div style={{ marginTop: "1rem" }}>
              <table className="jumbo-xerox-table">
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #ddd", padding: "0.5rem" }}>Size</th>
                    <th style={{ border: "1px solid #ddd", padding: "0.5rem" }}>Inches</th>
                    <th style={{ border: "1px solid #ddd", padding: "0.5rem" }}>Sqft</th>
                    <th style={{ border: "1px solid #ddd", padding: "0.5rem" }}>Qty</th>
                    <th style={{ border: "1px solid #ddd", padding: "0.5rem" }}>Total Sqft</th>
                  </tr>
                </thead>
                <tbody>
                  {sftCalculationResults.sqftTotals &&
                    Object.entries(sftCalculationResults.sqftTotals)
                      .sort(([, a], [, b]) => {
                        const sizeA = a.size.split("x").map(Number)
                        const sizeB = b.size.split("x").map(Number)
                        const areaA = sizeA[0] * sizeA[1]
                        const areaB = sizeB[0] * sizeB[1]
                        return areaB - areaA
                      })
                      .map(([type, data]) => (
                        <tr key={type}>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "0.5rem",
                            }}
                          >
                            {type}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "0.5rem",
                            }}
                          >
                            {data.size || "N/A"}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "0.5rem",
                            }}
                          >
                            {data.sqft ? data.sqft.toFixed(2) : "0.00"}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "0.5rem",
                            }}
                          >
                            {data.qty || 0}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "0.5rem",
                            }}
                          >
                            {data.totalsqft ? data.totalsqft.toFixed(2) : "0.00"}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>

              <div
                style={{
                  fontSize: "0.875rem",
                  color: "#155724",
                  backgroundColor: "#d4edda",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "0.25rem",
                  border: "1px solid #c3e6cb",
                  fontWeight: "bold",
                  marginTop: "0.5rem",
                }}
              >
                Total Sqft: {sftCalculationResults.totalSqft ? sftCalculationResults.totalSqft.toFixed(2) : "0.00"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Add this component before the main JumboXeroxSection component
export const CsvVerificationResults = ({ verificationResults, showCsvResults, getStatusBadge, getStatusCounts }) => {
  if (!showCsvResults) return null

  return (
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
          {Object.entries(getStatusCounts()).map(([status, count]) => (
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
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#333", marginBottom: "4px" }}>{count}</div>
              <div style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>{status}</div>
            </div>
          ))}
        </div>

        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Verification Results ({verificationResults.length} rows)</h3>
          </div>
        </div>

        {verificationResults.length === 0 ? (
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
                {verificationResults.map((result, index) => (
                  <tr key={index}>
                    <td>{result.extractedDate || "N/A"}</td>
                    <td>{result["Media Type"]}</td>
                    <td>{result["Printer Paper Size"]}</td>
                    <td>{result["Pages"]}</td>
                    <td>{getStatusBadge(result.status)}</td>
                    <td>{result.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default JumboXeroxSection
