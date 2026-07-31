import { useState, useEffect } from "react"
import { db } from "../../services/authservice"
import { addDoc, collection, getDocs, where, getDoc, doc, query, updateDoc, orderBy, limit } from "firebase/firestore"
import "../../styles/stocklist.css"
import { usePopup } from "../../hooks/usePopup"
import Popup from "../common/Popup"

const MovePrinterManager = () => {
  const { popup, showSuccess, showError, showWarning } = usePopup()
  const [branchName, setBranchName] = useState("")
  const [selectedPrinters, setSelectedPrinters] = useState([])
  const [userId, setUserId] = useState("")
  const [branches, setBranches] = useState([])
  const [printers, setPrinters] = useState([])
  const [toLocation, setToLocation] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectAll, setSelectAll] = useState(false)
  const [destinationHasLFP, setDestinationHasLFP] = useState(false)
  const [showPrinterIdPopup, setShowPrinterIdPopup] = useState(false)
  const [newPrinterId, setNewPrinterId] = useState("")
  const [currentCloningPrinter, setCurrentCloningPrinter] = useState(null)
  const [currentPrinterIndex, setCurrentPrinterIndex] = useState(0)
  const [totalPrintersToClone, setTotalPrintersToClone] = useState(0)
  const [printerIdError, setPrinterIdError] = useState("")

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "branches"))
        const branchesData = []
        querySnapshot.forEach((doc) => {
          const userData = doc.data()
          branchesData.push({ name: userData.name, id: doc.id })
        })

        const sortedBranches = branchesData.sort((a, b) => {
          const nameA = a.name.trim().toLowerCase()
          const nameB = b.name.trim().toLowerCase()
          if (nameA < nameB) return -1
          if (nameA > nameB) return 1
          return 0
        })

        setBranches(sortedBranches)
      } catch (error) {
        showError("Error fetching branches: " + error.message)
      }
    }

    fetchBranches()
  }, [])

  useEffect(() => {
    const fetchPrinters = async () => {
      if (!branchName) {
        setPrinters([])
        setSelectedPrinters([])
        return
      }

      try {
        const querySnapshot = await getDocs(
          query(collection(db, "printers"), where("branchName", "==", branchName), where("isActive", "==", true)),
        )
        const printersData = []

        for (const doc of querySnapshot.docs) {
          const printerData = { ...doc.data(), id: doc.id }

          if (printerData.printerType === "LFP") {
            const jumboQuery = query(
              collection(db, "JumboXerox"),
              where("printerId", "==", printerData.printerId),
              where("branch", "==", branchName),
              where("isActive", "==", true),
            )
            const jumboSnapshot = await getDocs(jumboQuery)
            printerData.jumboServices = jumboSnapshot.docs.map((jumboDoc) => ({
              id: jumboDoc.id,
              ...jumboDoc.data(),
            }))
          }

          printersData.push(printerData)
        }

        setPrinters(printersData)
        setSelectedPrinters([])
        setSelectAll(false)
      } catch (error) {
        showError("Error fetching printers: " + error.message)
      }
    }

    fetchPrinters()
  }, [branchName])

  
  useEffect(() => {
    const checkDestinationLFP = async () => {
      if (!toLocation) {
        setDestinationHasLFP(false)
        return
      }

      try {
        const querySnapshot = await getDocs(
          query(
            collection(db, "printers"),
            where("branchName", "==", toLocation),
            where("printerType", "==", "LFP"),
            where("isActive", "==", true),
          ),
        )
        setDestinationHasLFP(!querySnapshot.empty)
      } catch (error) {
        console.error("Error checking destination LFP:", error)
        setDestinationHasLFP(false)
      }
    }

    checkDestinationLFP()
  }, [toLocation])

  const handleBranchChange = (e) => {
    const selectedBranch = branches.find((branch) => branch.name === e.target.value)
    setBranchName(e.target.value)
    setUserId(selectedBranch ? selectedBranch.id : "")
    setSelectedPrinters([])
    setSelectAll(false)
  }

  const handleDestinationBranchChange = (e) => {
    setToLocation(e.target.value)
  }

  const handlePrinterSelection = (printer) => {
    setSelectedPrinters((prev) => {
      const isSelected = prev.some((selected) => selected.printerId === printer.printerId)
      if (isSelected) {
        return prev.filter((selected) => selected.printerId !== printer.printerId)
      } else {
        return [...prev, printer]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedPrinters([])
    } else {
      setSelectedPrinters([...printers])
    }
    setSelectAll(!selectAll)
  }

  const markPrintersAsInactive = async (printersToMove) => {
    const updatePromises = printersToMove.map(async (printer) => {
      const querySnapshot = await getDocs(
        query(
          collection(db, "printers"),
          where("branchName", "==", branchName),
          where("printerId", "==", printer.printerId),
          where("isActive", "==", true),
        ),
      )
      const updatePrinterPromises = querySnapshot.docs.map((document) =>
        updateDoc(doc(db, "printers", document.id), { isActive: false }),
      )
      return Promise.all(updatePrinterPromises)
    })

    await Promise.all(updatePromises)
    console.log(`Marked ${printersToMove.length} printers as inactive in ${branchName}`)
  }

  const getLatestReadingsForPrinter = async (printerId, currentBranch) => {
    try {
      console.log(`Fetching latest readings for printer ${printerId} in branch ${currentBranch}`)

      const readingsQuery = query(
        collection(db, "printerReadings"),
        where("branchName", "==", currentBranch),
        orderBy("date", "desc"),
      )

      const readingsSnapshot = await getDocs(readingsQuery)
      console.log(`Found ${readingsSnapshot.docs.length} reading documents for branch ${currentBranch}`)

      for (const docSnapshot of readingsSnapshot.docs) {
        const data = docSnapshot.data()
        console.log(`Checking document with date: ${data.date}`)

        if (data.readings && data.readings[printerId]) {
          console.log(`Found readings for printer ${printerId}:`, data.readings[printerId])

          const printerReadings = data.readings[printerId]
          const lastFinalReadings = {}

          Object.entries(printerReadings).forEach(([size, sizeData]) => {
            if (sizeData["FINAL READING"] !== undefined && sizeData.price !== undefined) {
              lastFinalReadings[size] = {
                "FINAL READING": sizeData["FINAL READING"],
                price: sizeData.price,
              }
            }
          })

          console.log(`Extracted lastFinalReadings for printer ${printerId}:`, lastFinalReadings)
          return Object.keys(lastFinalReadings).length > 0 ? lastFinalReadings : null
        }
      }

      console.log(`No readings found for printer ${printerId} in branch ${currentBranch}`)
      return null
    } catch (error) {
      console.error("Error fetching latest readings:", error)
      return null
    }
  }

  const getLatestJumboCounter = async (printerId) => {
    try {
      console.log(`Fetching latest jumbo counter for printer ${printerId}`)

      const jumboQuery = query(
        collection(db, "jumboXeroxReadings"),
        where("printerId", "==", printerId),
        orderBy("date", "desc"),
        limit(1),
      )

      const jumboSnapshot = await getDocs(jumboQuery)

      if (!jumboSnapshot.empty) {
        const latestReading = jumboSnapshot.docs[0].data()
        console.log(`Found jumbo reading for printer ${printerId}:`, latestReading)

        if (latestReading.jumboCounter) {
          return {
            start: latestReading.jumboCounter.start || 0,
            end: latestReading.jumboCounter.end || 0,
            sftPrinted: latestReading.jumboCounter.sftPrinted || 0,
          }
        }
      }

      console.log(`No jumbo counter found for printer ${printerId}`)
      return null
    } catch (error) {
      console.error("Error fetching jumbo counter:", error)
      return null
    }
  }

  const getJumboXeroxDocsByPrinterId = async (branchName, printerId) => {
    try {
      console.log(`Fetching jumboXerox documents for printerId: ${printerId} in branch: ${branchName}`)
      if (!printerId || typeof printerId !== "string") {
        console.error("Invalid printerId provided:", printerId)
        return []
      }
      
      // Query for documents matching both branch AND printerId
      const xeroxQuery = query(
        collection(db, "JumboXerox"), 
        where("branch", "==", branchName.trim()),
        where("printerId", "==", printerId.trim())
      )
      
      const snapshot = await getDocs(xeroxQuery)

      if (snapshot.empty) {
        console.log(`No documents found for printerId: ${printerId} in branch: ${branchName}`)
        return []
      }

      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      console.log(`✅ Found ${docs.length} document(s) for printerId: ${printerId} in branch: ${branchName}`)
      console.log(`Documents found:`, docs.map(doc => ({ id: doc.id, printerId: doc.printerId, printerName: doc.printerName })))
      
      return docs
    } catch (error) {
      console.error("❌ Error fetching documents by printerId:", error)
      return []
    }
  }

  const validatePrinterIdUniqueness = async (printerId) => {
    try {
      // Check if printer ID exists in any branch
      const printerQuery = query(
        collection(db, "printers"),
        where("printerId", "==", printerId),
        where("isActive", "==", true)
      )
      
      const printerSnapshot = await getDocs(printerQuery)
      
      if (!printerSnapshot.empty) {
        const existingPrinter = printerSnapshot.docs[0].data()
        return {
          isValid: false,
          message: `Printer ID "${printerId}" already exists in branch: ${existingPrinter.branchName}`
        }
      }
      
      return { isValid: true, message: "" }
    } catch (error) {
      console.error("Error validating printer ID:", error)
      return { isValid: false, message: "Error validating printer ID" }
    }
  }

  const markJumboXeroxAsInactive = async (printerId, branchName) => {
    try {
      const jumboQuery = query(
        collection(db, "JumboXerox"),
        where("printerId", "==", printerId),
        where("branch", "==", branchName),
        where("isActive", "==", true)
      )
      
      const jumboSnapshot = await getDocs(jumboQuery)
      
      if (!jumboSnapshot.empty) {
        const updatePromises = jumboSnapshot.docs.map(doc => 
          updateDoc(doc.ref, { 
            isActive: false,
            deactivatedAt: new Date(),
            reason: "Printer moved to another branch"
          })
        )
        
        await Promise.all(updatePromises)
        console.log(`Marked ${jumboSnapshot.docs.length} JumboXerox configurations as inactive for printer ${printerId}`)
      }
    } catch (error) {
      console.error("Error marking JumboXerox configurations as inactive:", error)
    }
  }

  const transferJumboXeroxEntry = async (docId, newBranchName, action, printerName, newPrinterId = null) => {
    try {
      const existingDocRef = doc(db, "JumboXerox", docId)
      const existingDocSnap = await getDoc(existingDocRef)

      if (!existingDocSnap.exists()) {
        console.error(`No document found with ID: ${docId}`)
        return
      }

      const existingData = existingDocSnap.data()

      if (action === "move") {
        // For move operation, create a new document in destination and keep original
        // The original will be handled when the printer is marked as inactive
        const newDocData = {
          ...existingData,
          branch: newBranchName,
          printerId: newPrinterId || existingData.printerId,
          printerName: printerName || existingData.printerName,
          createdAt: new Date(),
          movedFrom: existingData.branch, // Track where it came from
        }

        const newDoc = await addDoc(collection(db, "JumboXerox"), newDocData)
        console.log(`✅ Created new JumboXerox entry ${newDoc.id} for moved printer in branch: ${newBranchName}`)
        return newDoc.id
      } else if (action === "clone") {
        // For clone operation, create a new document (original stays intact)
        const newDocData = {
          ...existingData,
          branch: newBranchName,
          printerId: newPrinterId || existingData.printerId,
          printerName: printerName || existingData.printerName,
          createdAt: new Date(),
          clonedFrom: existingData.branch, // Track where it was cloned from
        }

        const newDoc = await addDoc(collection(db, "JumboXerox"), newDocData)
        console.log(`✅ Created new jumboXerox entry ${newDoc.id} for cloned printer in branch: ${newBranchName}`)
        return newDoc.id
      }
    } catch (error) {
      console.error("❌ Error during JumboXerox transfer:", error)
      throw error
    }
  }

  const handleMove = async () => {
    if (selectedPrinters.length === 0) {
      showError("Please select at least one printer to move")
      return
    }

    
    const hasLFPInSelection = selectedPrinters.some((printer) => printer.printerType === "LFP")
    if (hasLFPInSelection && destinationHasLFP) {
      showError("Cannot move LFP printer. The destination branch already has an active LFP printer.")
      return
    }

    setIsLoading(true)

    try {
      const destinationBranch = branches.find((branch) => branch.name === toLocation)
      console.log(`Moving ${selectedPrinters.length} printers from ${branchName} to ${toLocation}`)

      const movePromises = selectedPrinters.map(async (printer) => {
        console.log(`Processing printer: ${printer.printerId} (${printer.printerName})`)

        const lastFinalReadings = await getLatestReadingsForPrinter(printer.printerId, branchName)
        console.log(`Latest readings for ${printer.printerId}:`, lastFinalReadings)

        const newPrinterData = {
          userId: destinationBranch ? destinationBranch.id : userId,
          branchName: toLocation,
          printerId: printer.printerId,
          printerName: printer.printerName,
          printerType: printer.printerType || "Unknown",
          prices: printer.prices,
          customServices: printer.customServices || [],
          isActive: true,
        }

        if (lastFinalReadings && Object.keys(lastFinalReadings).length > 0) {
          newPrinterData.lastFinalReadings = lastFinalReadings
          console.log(`Added lastFinalReadings to new printer document for ${printer.printerId}`)
        }

        if (printer.printerType === "LFP") {
          console.log(`Processing LFP printer ${printer.printerId} - fetching jumbo counter`)

          const jumboCounter = await getLatestJumboCounter(printer.printerId)
          const existingJumboXeroxDocs = await getJumboXeroxDocsByPrinterId(branchName, printer.printerId)
          
          if (existingJumboXeroxDocs.length > 0) {
            console.log(
              `Found existing jumboXerox documents for printer ${printer.printerId}:`,
              existingJumboXeroxDocs,
            )
            
            // Create new JumboXerox configuration documents in destination branch
            for (const doc of existingJumboXeroxDocs) {
              await transferJumboXeroxEntry(doc.id, toLocation, "move", printer.printerName, printer.printerId)
            }
            console.log(`Created ${existingJumboXeroxDocs.length} new jumboXerox entries for printer ${printer.printerId} in ${toLocation}`)
            
            // Mark original configurations as inactive (but keep them for historical purposes)
            await markJumboXeroxAsInactive(printer.printerId, branchName)
            console.log(`Marked original jumboXerox configurations as inactive for printer ${printer.printerId} in ${branchName}`)
          } else {
            console.log(`No existing jumboXerox documents found for printer ${printer.printerId}`)
            
            // Create default JumboXerox configuration for the moved printer
            const defaultJumboConfig = {
              branch: toLocation,
              printerId: printer.printerId,
              printerName: printer.printerName,
              type: "COLOUR",
              size: "A0",
              unitPrice: 0,
              isActive: true,
              createdAt: new Date(),
            }
            
            await addDoc(collection(db, "JumboXerox"), defaultJumboConfig)
            console.log(`Created default jumboXerox configuration for printer ${printer.printerId} in ${toLocation}`)
          }
          
          console.log(`Latest jumbo counter for ${printer.printerId}:`, jumboCounter)

          if (jumboCounter) {
            newPrinterData.lastFinalReadings = {
              ...newPrinterData.lastFinalReadings,
              jumboCounter: jumboCounter,
            }
            console.log(`Added jumbo counter to lastFinalReadings for ${printer.printerId}:`, jumboCounter)
          } else {
            console.log(`No jumbo counter data found for LFP printer ${printer.printerId}`)
          }
        }

        console.log(`Creating new printer document:`, newPrinterData)
        return addDoc(collection(db, "printers"), newPrinterData)
      })

      await Promise.all(movePromises)
      console.log("All new printer documents created successfully")

      await markPrintersAsInactive(selectedPrinters)
      console.log("Original printers marked as inactive")

      showSuccess(`Successfully moved ${selectedPrinters.length} printers to ${toLocation}`)

      const movementPromises = selectedPrinters.map(async (printer) => {
        const currentUser = JSON.parse(localStorage.getItem("user"))
        return addDoc(collection(db, "inventoryMovements"), {
          type: "printer",
          action: "move",
          printerId: printer.printerId,
          printerName: printer.printerName,
          printerType: printer.printerType,
          fromBranch: branchName,
          toBranch: toLocation,
          movementDate: new Date(),
          performedBy: currentUser?.email || "Unknown",
          details: {
            prices: printer.prices,
            customServices: printer.customServices || [],
          },
        })
      })

      await Promise.all(movementPromises)

      handleReset()
    } catch (error) {
      console.error("Error in handleMove:", error)
      showError("Failed to move printers: " + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClone = async () => {
    if (selectedPrinters.length === 0) {
      showError("Please select at least one printer to clone")
      return
    }

    // Check LFP restriction
    const hasLFPInSelection = selectedPrinters.some((printer) => printer.printerType === "LFP")
    if (hasLFPInSelection && destinationHasLFP) {
      showError("Cannot clone LFP printer. The destination branch already has an active LFP printer.")
      return
    }

    // Initialize progress tracking
    setTotalPrintersToClone(selectedPrinters.length)
    setCurrentPrinterIndex(0)

    // For each selected printer, prompt for new printer ID
    const printerIdMappings = []
    
    try {
      for (let i = 0; i < selectedPrinters.length; i++) {
        const printer = selectedPrinters[i]
        setCurrentPrinterIndex(i + 1)
        console.log(`Prompting for printer ID ${i + 1}/${selectedPrinters.length}: ${printer.printerId}`)
        
        const newId = await promptForPrinterId(printer)
        if (!newId) {
          showError("Clone operation cancelled. All printers must have valid printer IDs.")
          return
        }
        printerIdMappings.push({ originalPrinter: printer, newPrinterId: newId })
        console.log(`Received printer ID for ${printer.printerId}: ${newId}`)
      }

      // Proceed with cloning using the provided printer IDs
      await performCloneOperation(printerIdMappings)
    } catch (error) {
      console.error("Error during clone operation:", error)
      showError("Clone operation failed: " + error.message)
    } finally {
      // Reset progress tracking
      setCurrentPrinterIndex(0)
      setTotalPrintersToClone(0)
    }
  }

  const promptForPrinterId = (printer) => {
    return new Promise((resolve, reject) => {
      setCurrentCloningPrinter(printer)
      setNewPrinterId("")
      setPrinterIdError("")
      setShowPrinterIdPopup(true)
      
      // Store resolve function to call later with proper cleanup
      window.printerIdResolve = resolve
      window.printerIdReject = reject
    })
  }

  const handlePrinterIdSubmit = async () => {
    if (!newPrinterId.trim()) {
      setPrinterIdError("Printer ID is required")
      return
    }

    // Validate printer ID format (alphanumeric and some special characters)
    const printerIdRegex = /^[A-Za-z0-9_-]+$/
    if (!printerIdRegex.test(newPrinterId)) {
      setPrinterIdError("Printer ID can only contain letters, numbers, hyphens, and underscores")
      return
    }

    // Check uniqueness
    const validation = await validatePrinterIdUniqueness(newPrinterId)
    if (!validation.isValid) {
      setPrinterIdError(validation.message)
      return
    }

    // Valid printer ID, close popup and resolve
    setShowPrinterIdPopup(false)
    if (window.printerIdResolve) {
      window.printerIdResolve(newPrinterId)
      delete window.printerIdResolve
      delete window.printerIdReject
    }
  }

  const handlePrinterIdCancel = () => {
    setShowPrinterIdPopup(false)
    if (window.printerIdResolve) {
      window.printerIdResolve(null) // Resolve with null to indicate cancellation
      delete window.printerIdResolve
      delete window.printerIdReject
    }
  }

  const performCloneOperation = async (printerIdMappings) => {
    setIsLoading(true)

    try {
      const destinationBranch = branches.find((branch) => branch.name === toLocation)

      const addPromises = printerIdMappings.map(async ({ originalPrinter, newPrinterId }) => {
        console.log(`Cloning printer: ${originalPrinter.printerId} as ${newPrinterId} (${originalPrinter.printerName})`)

        const newPrinterData = {
          userId: destinationBranch ? destinationBranch.id : userId,
          branchName: toLocation,
          printerId: newPrinterId,
          printerName: originalPrinter.printerName,
          printerType: originalPrinter.printerType,
          prices: originalPrinter.prices,
          customServices: originalPrinter.customServices || [],
          isActive: true,
        }

        if (originalPrinter.printerType === "LFP") {
          console.log(`Processing LFP printer clone - creating configuration for ${newPrinterId}`)

          const existingJumboXeroxDocs = await getJumboXeroxDocsByPrinterId(branchName, originalPrinter.printerId)
          
          if (existingJumboXeroxDocs.length > 0) {
            console.log(
              `Found ${existingJumboXeroxDocs.length} existing jumboXerox documents for printer ${originalPrinter.printerId}`,
            )
            
            // Clone ONLY the existing JumboXerox configuration documents
            for (const doc of existingJumboXeroxDocs) {
              await transferJumboXeroxEntry(doc.id, toLocation, "clone", originalPrinter.printerName, newPrinterId)
            }
            console.log(`Cloned ${existingJumboXeroxDocs.length} jumboXerox entries for new printer ${newPrinterId} in ${toLocation}`)
          } else {
            console.log(`No existing jumboXerox documents found for printer ${originalPrinter.printerId}`)
            showError(`No LFP configurations found for printer ${originalPrinter.printerId}. Cannot clone without existing configurations.`)
            return null
          }
          
          console.log(`Cloned LFP printer ${originalPrinter.printerId} as ${newPrinterId} without previous readings`)
        }

        return addDoc(collection(db, "printers"), newPrinterData)
      })

      const results = await Promise.all(addPromises)
      const successfulClones = results.filter(result => result !== null)

      if (successfulClones.length > 0) {
        showSuccess(`Successfully cloned ${successfulClones.length} printers to ${toLocation}`)

        const clonePromises = printerIdMappings.map(async ({ originalPrinter, newPrinterId }) => {
          const currentUser = JSON.parse(localStorage.getItem("user"))
          return addDoc(collection(db, "inventoryMovements"), {
            type: "printer",
            action: "clone",
            originalPrinterId: originalPrinter.printerId,
            newPrinterId: newPrinterId,
            printerName: originalPrinter.printerName,
            printerType: originalPrinter.printerType,
            fromBranch: branchName,
            toBranch: toLocation,
            movementDate: new Date(),
            performedBy: currentUser?.email || "Unknown",
            details: {
              prices: originalPrinter.prices,
              customServices: originalPrinter.customServices || [],
            },
          })
        })

        await Promise.all(clonePromises)
      }

      handleReset()
    } catch (error) {
      showError("Failed to clone printers: " + error.message)
      console.error("Error cloning printers: ", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedPrinters([])
    setToLocation("")
    setBranchName("")
    setSelectAll(false)
    setUserId("")
    setDestinationHasLFP(false)
  }

  if (isLoading) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Processing printers...</p>
      </div>
    )
  }

  return (
    <div className="stock-readings-container">
      <Popup {...popup} />

      {/* Printer ID Input Popup */}
      {showPrinterIdPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <h3 style={{ 
              marginBottom: '20px', 
              color: '#2c3e50',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Enter Printer ID for Clone
              {totalPrintersToClone > 1 && (
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '400', 
                  color: '#6c757d',
                  marginLeft: '10px'
                }}>
                  ({currentPrinterIndex} of {totalPrintersToClone})
                </span>
              )}
            </h3>
            
            {currentCloningPrinter && (
              <div style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6c757d' }}>
                  <strong>Original Printer:</strong> {currentCloningPrinter.printerId}
                </p>
                <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                  <strong>Printer Name:</strong> {currentCloningPrinter.printerName}
                </p>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2c3e50'
              }}>
                New Printer ID:
              </label>
              <input
                type="text"
                value={newPrinterId}
                onChange={(e) => {
                  setNewPrinterId(e.target.value)
                  setPrinterIdError("")
                }}
                placeholder="Enter unique printer ID"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${printerIdError ? '#dc3545' : '#ced4da'}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => {
                  if (!printerIdError) {
                    e.target.style.borderColor = '#1e3a8a'
                  }
                }}
                onBlur={(e) => {
                  if (!printerIdError) {
                    e.target.style.borderColor = '#ced4da'
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handlePrinterIdSubmit()
                  }
                }}
              />
              {printerIdError && (
                <p style={{
                  color: '#dc3545',
                  fontSize: '12px',
                  margin: '5px 0 0 0'
                }}>
                  {printerIdError}
                </p>
              )}
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={handlePrinterIdCancel}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                Cancel
              </button>
              <button
                onClick={handlePrinterIdSubmit}
                disabled={!newPrinterId.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: newPrinterId.trim() ? '#1e3a8a' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: newPrinterId.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.3s'
                }}
                onMouseOver={(e) => {
                  if (newPrinterId.trim()) {
                    e.target.style.backgroundColor = '#1e40af'
                  }
                }}
                onMouseOut={(e) => {
                  if (newPrinterId.trim()) {
                    e.target.style.backgroundColor = '#1e3a8a'
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="stock-page-header">
        <h2>Move & Clone Printer</h2>
        <p>Transfer or clone printers between branches</p>
      </div>

      {}
      {destinationHasLFP && selectedPrinters.some((printer) => printer.printerType === "LFP") && (
        <div
          style={{
            backgroundColor: "#ffebee",
            border: "1px solid #f44336",
            borderRadius: "8px",
            padding: "15px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              backgroundColor: "#f44336",
              color: "white",
              borderRadius: "50%",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            !
          </div>
          <div>
            <strong style={{ color: "#c62828" }}>LFP Printer Restriction:</strong>
            <p style={{ margin: "5px 0 0 0", color: "#c62828", fontSize: "14px" }}>
              Cannot move/clone LFP printer. The destination branch "{toLocation}" already has an active LFP printer.
              Only one LFP printer is allowed per branch.
            </p>
          </div>
        </div>
      )}

      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Printer Transfer & Clone</h3>
          </div>
        </div>
        <div className="stock-card-content">
          <div className="stock-date-picker-container">
            <div className="stock-date-picker-wrapper">
              <label>Source Branch</label>
              <select value={branchName} onChange={handleBranchChange} className="stock-select-input" required>
                <option value="">Select Source Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="stock-date-picker-wrapper">
              <label>Destination Branch</label>
              <select
                value={toLocation}
                onChange={handleDestinationBranchChange}
                className="stock-select-input"
                required
              >
                <option value="">Select Destination Branch</option>
                {branches
                  .filter((branch) => branch.name !== branchName)
                  .map((branch) => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleMove}
              className="add"
              disabled={
                isLoading ||
                selectedPrinters.length === 0 ||
                !toLocation ||
                (destinationHasLFP && selectedPrinters.some((printer) => printer.printerType === "LFP"))
              }
            >
              MOVE PRINTERS
            </button>

            <button
              type="button"
              onClick={handleClone}
              className="update"
              disabled={
                isLoading ||
                selectedPrinters.length === 0 ||
                !toLocation ||
                (destinationHasLFP && selectedPrinters.some((printer) => printer.printerType === "LFP"))
              }
            >
              CLONE PRINTERS
            </button>

            <button type="button" onClick={handleReset} className="reset-button">
              RESET
            </button>
          </div>
        </div>
      </div>

      {branchName && printers.length > 0 && (
        <div className="stock-card">
          <div className="stock-card-header">
            <div className="stock-card-title">
              <h3>Select Printers -[{selectedPrinters.length} selected]</h3>
            </div>
          </div>
          <div className="stock-card-content">
            <div className="stock-checkbox-container">
              <div className="stock-checkbox-item">
                <label className="stock-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="stock-checkbox-input"
                  />
                  <span className="stock-checkbox-custom" style={{ marginRight: "10px" }}></span>
                  Select All {printers.length} Printers
                </label>
              </div>
            </div>

            <div className="stock-table-wrapper">
              <table className="stock-readings-table" style={{ tableLayout: "fixed", width: "100%" }}>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Printer ID</th>
                    <th>Printer Name</th>
                    <th>Type</th>
                    <th>Services & Pricing</th>
                  </tr>
                </thead>
                <tbody>
                  {printers.map((printer, index) => (
                    <tr key={index} style={{ borderBottom: "1px solid #e9ecef" }}>
                      <td style={{ textAlign: "center", verticalAlign: "top", padding: "12px 8px" }}>
                        <label className="stock-checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedPrinters.some((selected) => selected.printerId === printer.printerId)}
                            onChange={() => handlePrinterSelection(printer)}
                            className="stock-checkbox-input"
                          />
                          <span className="stock-checkbox-custom"></span>
                        </label>
                      </td>
                      <td style={{ verticalAlign: "top", padding: "12px 8px", fontSize: "13px" }}>
                        {printer.printerId}
                      </td>
                      <td style={{ verticalAlign: "top", padding: "12px 8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "500" }}>{printer.printerName}</span>
                      </td>
                      <td style={{ textAlign: "center", verticalAlign: "top", padding: "12px 8px" }}>
                        <span
                          style={{
                            backgroundColor:
                              printer.printerType === "LFP"
                                ? "#e3f2fd"
                                : printer.printerType === "SFP"
                                  ? "#ffcdd2"
                                  : "#f3e5f5",
                            color:
                              printer.printerType === "LFP"
                                ? "#1976d2"
                                : printer.printerType === "SFP"
                                  ? "#d32f2f"
                                  : "#7b1fa2",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "500",
                            display: "inline-block",
                            textAlign: "center",
                            minWidth: "35px",
                          }}
                        >
                          {printer.printerType === "LFP" ? "LFP" : printer.printerType === "SFP" ? "SFP" : "MFP"}
                        </span>
                      </td>
                      <td style={{ verticalAlign: "top", padding: "12px 8px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {printer.prices && printer.prices.length > 0 && (
                            <div style={{ marginBottom: printer.printerType === "LFP" ? "8px" : "0" }}>
                              {printer.prices.map((priceObj, priceIndex) => (
                                <div
                                  key={priceIndex}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    fontSize: "12px",
                                    minHeight: "20px",
                                    paddingBottom: "2px",
                                  }}
                                >
                                  <span style={{ fontWeight: "500", color: "#495057" }}>{priceObj.size}:</span>
                                  <span style={{ fontWeight: "600", color: "#28a745" }}>₹{priceObj.price}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {printer.printerType === "LFP" &&
                            printer.jumboServices &&
                            printer.jumboServices.length > 0 && (
                              <div>
                                {printer.jumboServices.map((jumboService, jumboIndex) => (
                                  <div
                                    key={jumboIndex}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      fontSize: "12px",
                                      minHeight: "20px",
                                      paddingBottom: "2px",
                                    }}
                                  >
                                    <span style={{ fontWeight: "500", color: "#1976d2" }}>
                                      {jumboService.type} - {jumboService.size}:
                                    </span>
                                    <span style={{ fontWeight: "600", color: "#1565c0" }}>
                                      ₹{jumboService.unitPrice}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                          {(!printer.prices || printer.prices.length === 0) &&
                            (printer.printerType !== "LFP" ||
                              !printer.jumboServices ||
                              printer.jumboServices.length === 0) && (
                              <span
                                style={{
                                  color: "#6c757d",
                                  fontStyle: "italic",
                                  fontSize: "12px",
                                  padding: "4px 0",
                                }}
                              >
                                No services configured
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MovePrinterManager
