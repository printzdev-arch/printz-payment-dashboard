import { useState, useEffect } from "react"
import { db } from "../../services/authservice"
import { collection, addDoc, getDocs, query, where } from "firebase/firestore"
import { ToastContainer, toast } from "react-toastify"
import { FaUndo, FaTimes, FaPlus, FaUpload, FaDownload, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa"
import { MdOutlineFileDownloadDone } from "react-icons/md"
import "react-toastify/dist/ReactToastify.css"
import "../../styles/stocklist.css"
import Popup from "../common/Popup"
import { usePopup } from "../../hooks/usePopup"

const AddAssets = () => {
  const [branchName, setBranchName] = useState("")
  const [assetId, setAssetId] = useState("")
  const [assetName, setAssetName] = useState("")
  const [assetQty, setAssetQty] = useState("")
  const [description, setDescription] = useState("")
  const [userId, setUserId] = useState("")
  const [branches, setBranches] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [customAssetNames, setCustomAssetNames] = useState([])
  const [newAssetName, setNewAssetName] = useState("")
  const [showAddAssetName, setShowAddAssetName] = useState(false)
  const [csvFile, setCsvFile] = useState(null)
  const [showCsvUpload, setShowCsvUpload] = useState(false)
  const [csvData, setCsvData] = useState([])
  const [isProcessingCsv, setIsProcessingCsv] = useState(false)
  const [assets, setAssets] = useState([])
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  
  const { popup, showSuccess, showError, showInfo, hidePopup } = usePopup()

  const defaultAssetNames = [
    "Table",
    "Chair",
    "Computer",
    "Printer",
    "Scanner",
    "Desk",
    "Cabinet",
    "Whiteboard",
    "Projector",
    "Phone",
  ]

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "branches"))
        const branchesData = []
        querySnapshot.forEach((doc) => {
          const userData = doc.data()
          branchesData.push({ name: userData.name, id: doc.id })
        })

        const sortedBranches = branchesData.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
        setBranches(sortedBranches)
      } catch (error) {
        toast.error("Error fetching branches: " + error.message, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
      }
    }

    fetchBranches()
  }, [])

  useEffect(() => {
    if (branchName) {
      fetchAssets()
    } else {
      setAssets([])
    }
  }, [branchName])

  const fetchAssets = async () => {
    if (!branchName) return

    setLoadingAssets(true)
    try {
      const assetsRef = collection(db, "assets")
      const q = query(assetsRef, where("branchName", "==", branchName))
      const querySnapshot = await getDocs(q)
      const assetsData = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.assetQty > 0) {
          assetsData.push({ id: doc.id, ...data })
        }
      })
      setAssets(assetsData.sort((a, b) => a.assetName.localeCompare(b.assetName)))
    } catch (error) {
      toast.error("Error fetching assets: " + error.message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    } finally {
      setLoadingAssets(false)
    }
  }

  const handleBranchChange = (e) => {
    const selectedBranch = branches.find((branch) => branch.name === e.target.value)
    setBranchName(e.target.value)
    setUserId(selectedBranch ? selectedBranch.id : "")
  }

  const handleAddCustomAssetName = () => {
    if (
      newAssetName.trim() &&
      !customAssetNames.includes(newAssetName.trim()) &&
      !defaultAssetNames.includes(newAssetName.trim())
    ) {
      setCustomAssetNames((prev) => [...prev, newAssetName.trim()])
      setNewAssetName("")
      setShowAddAssetName(false)
      toast.success(`Custom asset "${newAssetName.trim()}" added successfully`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    } else if (defaultAssetNames.includes(newAssetName.trim()) || customAssetNames.includes(newAssetName.trim())) {
      toast.error("Asset name already exists", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    } else {
      toast.error("Please enter a valid asset name", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    }
  }

  const handleRemoveCustomAssetName = (assetNameToRemove) => {
    setCustomAssetNames((prev) => prev.filter((name) => name !== assetNameToRemove))
    if (assetName === assetNameToRemove) {
      setAssetName("")
    }
    toast.info(`Custom asset "${assetNameToRemove}" removed`, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    })
  }

  const checkAssetIdExists = async (assetIdToCheck) => {
    try {
      const assetsRef = collection(db, "assets")
      const q = query(assetsRef, where("assetId", "==", assetIdToCheck.trim()))
      const querySnapshot = await getDocs(q)
      return !querySnapshot.empty
    } catch (error) {
      console.error("Error checking asset ID:", error)
      return false
    }
  }

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type !== "text/csv" && !file.name.toLowerCase().endsWith(".csv")) {
        toast.error("Please select a valid CSV file", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
        return
      }
      setCsvFile(file)
      parseCsvFile(file)
    }
  }

  const parseCsvFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const lines = text.split("\n").filter((line) => line.trim() !== "")

        if (lines.length < 2) {
          toast.error("CSV file must contain at least a header row and one data row", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          })
          return
        }

        const headerLine = lines[0]
        const headers = []
        let current = ""
        let inQuotes = false

        for (let i = 0; i < headerLine.length; i++) {
          const char = headerLine[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === "," && !inQuotes) {
            headers.push(current.trim().replace(/"/g, ""))
            current = ""
          } else {
            current += char
          }
        }
        headers.push(current.trim().replace(/"/g, ""))

        const headerLower = headers.map((h) => h.toLowerCase().trim())

        const hasAssetId = headerLower.some(
          (h) => h === "asset id" || h === "assetid" || (h.includes("asset") && h.includes("id")),
        )

        const hasAssetName = headerLower.some(
          (h) => h === "asset name" || h === "assetname" || (h.includes("asset") && h.includes("name")),
        )

        const hasQuantity = headerLower.some((h) => h === "quantity" || h === "qty" || h.includes("quantity"))

        if (!hasAssetId || !hasAssetName || !hasQuantity) {
          toast.error(`CSV file headers found: ${headers.join(", ")}. Required: Asset ID, Asset Name, Quantity`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          })
          return
        }

        const assetIdIndex = headerLower.findIndex(
          (h) => h === "asset id" || h === "assetid" || (h.includes("asset") && h.includes("id")),
        )

        const assetNameIndex = headerLower.findIndex(
          (h) => h === "asset name" || h === "assetname" || (h.includes("asset") && h.includes("name")),
        )

        const quantityIndex = headerLower.findIndex((h) => h === "quantity" || h === "qty" || h.includes("quantity"))

        const descriptionIndex = headerLower.findIndex(
          (h) => h === "description" || h === "desc" || h.includes("description"),
        )

        const data = []
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (line) {
            const values = []
            let current = ""
            let inQuotes = false

            for (let j = 0; j < line.length; j++) {
              const char = line[j]
              if (char === '"') {
                inQuotes = !inQuotes
              } else if (char === "," && !inQuotes) {
                values.push(current.trim().replace(/"/g, ""))
                current = ""
              } else {
                current += char
              }
            }
            values.push(current.trim().replace(/"/g, ""))

            if (values.length >= Math.max(assetIdIndex, assetNameIndex, quantityIndex) + 1) {
              const assetId = values[assetIdIndex] || ""
              const assetName = values[assetNameIndex] || ""
              const quantity = Number.parseInt(values[quantityIndex]) || 0
              const description =
                descriptionIndex >= 0 && descriptionIndex < values.length ? values[descriptionIndex] || "" : ""

              if (assetId && assetName && quantity > 0) {
                data.push({
                  assetId: assetId.trim(),
                  assetName: assetName.trim(),
                  quantity: quantity,
                  description: description.trim(),
                })
              }
            }
          }
        }

        if (data.length === 0) {
          toast.error("No valid data found in CSV file. Please check the format.", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          })
          return
        }

        setCsvData(data)
        toast.success(`Found ${data.length} valid assets in CSV file`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
      } catch (error) {
        console.error("Error parsing CSV:", error)
        toast.error("Error parsing CSV file. Please check the file format.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
      }
    }

    reader.onerror = () => {
      toast.error("Error reading CSV file", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    }

    reader.readAsText(file)
  }

  const handleCsvUpload = async () => {
    if (!branchName) {
      toast.error("Please select a branch first", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
      return
    }

    if (csvData.length === 0) {
      toast.error("No valid data found in CSV file", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
      return
    }

    setIsProcessingCsv(true)
    const currentUser = JSON.parse(localStorage.getItem("user"))
    let successCount = 0
    let errorCount = 0
    const errors = []

    try {
      for (let i = 0; i < csvData.length; i++) {
        const asset = csvData[i]

        try {
          if (!asset.assetId || !asset.assetName || asset.quantity <= 0) {
            errorCount++
            errors.push(`Row ${i + 2}: Missing required fields or invalid quantity`)
            continue
          }

          const assetExists = await checkAssetIdExists(asset.assetId)
          if (assetExists) {
            errorCount++
            errors.push(`Row ${i + 2}: Asset ID "${asset.assetId}" already exists`)
            continue
          }

          const assetData = {
            userId,
            branchName,
            assetId: asset.assetId,
            assetName: asset.assetName,
            assetQty: asset.quantity,
            description: asset.description,
            createdBy: currentUser?.email || "Unknown",
            createdDate: new Date(),
            updatedBy: currentUser?.email || "Unknown",
            updatedDate: new Date(),
            customAssetNames: customAssetNames,
          }

          await addDoc(collection(db, "assets"), assetData)

          
          await addDoc(collection(db, "inventoryMovements"), {
            type: "asset",
            action: "add",
            assetId: asset.assetId,
            assetName: asset.assetName,
            quantity: asset.quantity,
            amount: 0, 
            fromBranch: null, 
            toBranch: branchName,
            movementDate: new Date(),
            performedBy: currentUser?.email || "Unknown",
            details: {
              description: asset.description,
              customAssetNames: customAssetNames,
              source: "CSV Upload",
            },
          })

          successCount++
        } catch (error) {
          console.error(`Error adding asset ${asset.assetId}:`, error)
          errorCount++
          errors.push(`Row ${i + 2}: ${error.message}`)
        }
      }

      if (successCount > 0) {
        toast.success(
          `CSV Upload Complete: ${successCount} assets added successfully${
            errorCount > 0 ? `, ${errorCount} failed` : ""
          }`,
          {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        )

        showSuccess(
          `CSV upload completed successfully! ${successCount} assets were added to ${branchName}.${errorCount > 0 ? ` ${errorCount} assets failed to upload due to errors.` : ''} All inventory movements have been tracked.`,
          "CSV Upload Completed"
        )
      }

      if (errorCount > 0 && errors.length > 0) {
        console.log("CSV Upload Errors:", errors)
        toast.error(`${errorCount} assets failed to upload. Check console for details.`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
      }

      setCsvFile(null)
      setCsvData([])
      setShowCsvUpload(false)
      const fileInput = document.getElementById("csvFileInput")
      if (fileInput) {
        fileInput.value = ""
      }
      fetchAssets() 
    } catch (error) {
      console.error("CSV Upload Error:", error)
      toast.error("Failed to upload CSV: " + error.message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    } finally {
      setIsProcessingCsv(false)
    }
  }

  const downloadCsvTemplate = () => {
    const csvContent = `Asset ID,Asset Name,Quantity,Description
AST001,Table,5,Office table
AST002,Chair,10,Office chair
AST003,Computer,2,Desktop computer
AST004,Printer,1,Laser printer`

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "assets_template.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const assetExists = await checkAssetIdExists(assetId)
      if (assetExists) {
        toast.error("Asset ID already exists. Please use a different Asset ID.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
        setIsLoading(false)
        return
      }

      const currentUser = JSON.parse(localStorage.getItem("user"))
      const assetData = {
        userId,
        branchName,
        assetId: assetId.trim(),
        assetName: assetName.trim(),
        assetQty: Number.parseInt(assetQty),
        description: description.trim(),
        createdBy: currentUser?.email || "Unknown",
        createdDate: new Date(),
        updatedBy: currentUser?.email || "Unknown",
        updatedDate: new Date(),
        customAssetNames: customAssetNames,
      }

      await addDoc(collection(db, "assets"), assetData)

      
      await addDoc(collection(db, "inventoryMovements"), {
        type: "asset",
        action: "add",
        assetId: assetId.trim(),
        assetName: assetName.trim(),
        quantity: Number.parseInt(assetQty),
        amount: 0, 
        fromBranch: null, 
        toBranch: branchName,
        movementDate: new Date(),
        performedBy: currentUser?.email || "Unknown",
        details: {
          description: description.trim(),
          customAssetNames: customAssetNames,
        },
      })

      toast.success("Asset added successfully", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })

      showSuccess(
        `Asset "${assetName}" has been successfully added to ${branchName}. Asset ID: ${assetId}`,
        "Asset Added Successfully"
      )

      handleReset()
      fetchAssets() 
    } catch (error) {
      toast.error("Failed to add asset: " + error.message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })

      showError(
        `Failed to add asset "${assetName}". Error: ${error.message}. Please check your input and try again.`,
        "Asset Addition Failed"
      )
      console.error("Error adding asset: ", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setAssetId("")
    setAssetName("")
    setAssetQty("")
    setDescription("")
    setCustomAssetNames([])
    setNewAssetName("")
    setShowAddAssetName(false)
    setSearchTerm("")
    setCurrentPage(1)
  }

  
  const filteredAssets = assets.filter((asset) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      asset.assetId?.toLowerCase().includes(searchLower) ||
      asset.assetName?.toLowerCase().includes(searchLower) ||
      asset.description?.toLowerCase().includes(searchLower)
    )
  })

  
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentAssets = filteredAssets.slice(startIndex, endIndex)

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) 
  }

  const allAssetNames = [...defaultAssetNames, ...customAssetNames]

  if (isLoading || isProcessingCsv) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>{isProcessingCsv ? "Processing CSV file..." : "Adding asset..."}</p>
      </div>
    )
  }

  return (
    <div className="stock-readings-container">
      <ToastContainer />
      
      {}
      <Popup
{...popup}
      />

      <div className="stock-page-header">
        <h2>Add New Asset</h2>
        <p>Configure a new asset with details or upload multiple assets via CSV</p>
      </div>

      <div className="stock-list">
        <div className="stock-card">
          <div className="stock-card-header">
            <div className="stock-card-title">
              <h3>Asset Configuration</h3>
            </div>
            <div className="stock-action-buttons">
              <button
                onClick={() => setShowCsvUpload(!showCsvUpload)}
                className="stock-save-button"
                style={{ backgroundColor: "#17a2b8" }}
              >
                <FaUpload /> {showCsvUpload ? "Hide" : "Bulk Upload CSV"}
              </button>
              <button
                onClick={downloadCsvTemplate}
                className="stock-save-button"
                style={{ backgroundColor: "#28a745" }}
              >
                <FaDownload /> Download Template
              </button>
            </div>
          </div>

          <div className="stock-card-content">
            <form onSubmit={handleSubmit}>
              {}
              <div className="stock-date-picker-container">
                <div className="stock-date-picker-wrapper">
                  <label>Branch Name *</label>
                  <select value={branchName} onChange={handleBranchChange} className="stock-select-input" required>
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="stock-date-picker-wrapper">
                  <label>Asset ID *</label>
                  <input
                    type="text"
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    className="stock-select-input"
                    placeholder="Enter unique asset ID"
                    required
                  />
                </div>
              </div>

              {}
              {showCsvUpload && (
                <div
                  className="stock-csv-upload-section"
                  style={{
                    marginBottom: "30px",
                    padding: "20px",
                    border: "2px dashed #ddd",
                    borderRadius: "8px",
                    backgroundColor: "#f9f9f9",
                  }}
                >
                  <h4>Bulk Upload Assets via CSV</h4>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#666",
                      marginBottom: "15px",
                    }}
                  >
                    Upload a CSV file with columns: Asset ID, Asset Name, Quantity, Description (optional)
                  </p>

                  {!branchName && (
                    <div style={{ 
                      padding: "10px", 
                      backgroundColor: "#fff3cd", 
                      border: "1px solid #ffeaa7", 
                      borderRadius: "4px", 
                      marginBottom: "15px",
                      color: "#856404"
                    }}>
                      Please select a branch first before uploading CSV files.
                    </div>
                  )}

                  <div className="stock-date-picker-wrapper">
                    <label>Select CSV File</label>
                    <input
                      id="csvFileInput"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCsvFileChange}
                      className="stock-select-input"
                      disabled={!branchName}
                    />
                  </div>

                  {csvData.length > 0 && (
                    <div style={{ marginTop: "15px" }}>
                      <p style={{ fontWeight: "bold", marginBottom: "10px" }}>Preview ({csvData.length} assets found):</p>
                      <div
                        style={{
                          maxHeight: "200px",
                          overflowY: "auto",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                        }}
                      >
                        <table style={{ width: "100%", fontSize: "12px" }}>
                          <thead
                            style={{
                              backgroundColor: "#f8f9fa",
                              position: "sticky",
                              top: 0,
                            }}
                          >
                            <tr>
                              <th style={{ padding: "8px", textAlign: "left" }}>Asset ID</th>
                              <th style={{ padding: "8px", textAlign: "left" }}>Asset Name</th>
                              <th style={{ padding: "8px", textAlign: "left" }}>Quantity</th>
                              <th style={{ padding: "8px", textAlign: "left" }}>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvData.slice(0, 10).map((asset, index) => (
                              <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                                <td style={{ padding: "8px" }}>{asset.assetId}</td>
                                <td style={{ padding: "8px" }}>{asset.assetName}</td>
                                <td style={{ padding: "8px" }}>{asset.quantity}</td>
                                <td style={{ padding: "8px" }}>{asset.description}</td>
                              </tr>
                            ))}
                            {csvData.length > 10 && (
                              <tr>
                                <td
                                  colSpan="4"
                                  style={{
                                    padding: "8px",
                                    textAlign: "center",
                                    fontStyle: "italic",
                                  }}
                                >
                                  ... and {csvData.length - 10} more assets
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="stock-action-buttons" style={{ marginTop: "15px" }}>
                    <button
                      onClick={handleCsvUpload}
                      className="stock-save-button"
                      disabled={!csvFile || csvData.length === 0 || !branchName || isProcessingCsv}
                    >
                      <FaUpload /> {isProcessingCsv ? "Uploading..." : "Upload Assets"}
                    </button>
                    <button
                      onClick={() => {
                        setCsvFile(null)
                        setCsvData([])
                        const fileInput = document.getElementById("csvFileInput")
                        if (fileInput) {
                          fileInput.value = ""
                        }
                      }}
                      className="stock-cancel-button"
                    >
                      <FaTimes /> Clear CSV
                    </button>
                  </div>
                </div>
              )}

              <div className="stock-date-picker-wrapper">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <label>Asset Name *</label>
                  <button
                    type="button"
                    onClick={() => setShowAddAssetName(true)}
                    className="stock-save-button"
                    style={{
                      padding: "5px 10px",
                      fontSize: "12px",
                      minWidth: "auto",
                      backgroundColor: "#28a745",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <FaPlus /> Add Custom Asset
                  </button>
                </div>

                {showAddAssetName && (
                  <div
                    className="stock-date-picker-container"
                    style={{
                      marginBottom: "15px",
                      padding: "15px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      backgroundColor: "#f9f9f9",
                    }}
                  >
                    <div className="stock-date-picker-wrapper">
                      <label>Custom Asset Name</label>
                      <input
                        type="text"
                        value={newAssetName}
                        onChange={(e) => setNewAssetName(e.target.value)}
                        className="stock-select-input"
                        placeholder="Enter custom asset name"
                        onKeyPress={(e) => e.key === "Enter" && handleAddCustomAssetName()}
                      />
                    </div>
                    <div className="stock-action-buttons" style={{ marginTop: "10px" }}>
                      <button
                        type="button"
                        onClick={handleAddCustomAssetName}
                        className="stock-save-button"
                        style={{ padding: "5px 15px", fontSize: "12px" }}
                      >
                        Add Asset Name
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddAssetName(false)
                          setNewAssetName("")
                        }}
                        className="stock-cancel-button"
                        style={{ padding: "5px 15px", fontSize: "12px" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <select
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="stock-select-input"
                  required
                >
                  <option value="">Select Asset Name</option>
                  {allAssetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                      {customAssetNames.includes(name) && " (Custom)"}
                    </option>
                  ))}
                </select>

                {customAssetNames.length > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    <label style={{ fontSize: "12px", color: "#666" }}>Custom Asset Names:</label>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "5px",
                        marginTop: "5px",
                      }}
                    >
                      {customAssetNames.map((name) => (
                        <div
                          key={name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            backgroundColor: "#e9ecef",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                          }}
                        >
                          <span>{name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomAssetName(name)}
                            style={{
                              marginLeft: "5px",
                              background: "none",
                              border: "none",
                              color: "#dc3545",
                              cursor: "pointer",
                              fontSize: "10px",
                            }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="stock-date-picker-container">
                <div className="stock-date-picker-wrapper">
                  <label>Asset Quantity *</label>
                  <input
                    type="number"
                    value={assetQty}
                    onChange={(e) => setAssetQty(e.target.value)}
                    className="stock-select-input"
                    placeholder="Enter quantity"
                    min="1"
                    required
                  />
                </div>

                <div className="stock-date-picker-wrapper">
                  <label>Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="stock-select-input"
                    placeholder="Enter asset description (optional)"
                    rows="3"
                    style={{ resize: "vertical", minHeight: "80px" }}
                  />
                </div>
              </div>

              <div className="stock-action-buttons">
                <button type="submit" className="stock-save-button" disabled={isLoading}>
                  <MdOutlineFileDownloadDone /> Add Asset
                </button>
                <button type="button" onClick={handleReset} className="stock-cancel-button">
                  <FaUndo /> Reset Form
                </button>
              </div>
            </form>
          </div>
        </div>

        {}
        {branchName && (
          <div className="stock-card" style={{ marginTop: "25px" }}>
            <div className="stock-card-header">
              <div className="stock-card-title">
                <h3>Assets in {branchName}</h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    margin: "5px 0 0 0",
                  }}
                >
                  {filteredAssets.length} of {assets.length} asset{assets.length !== 1 ? "s" : ""} {searchTerm ? "match search" : "found"}
                </p>
              </div>
            </div>

            <div className="stock-card-content">
              {}
              <div className="stock-search-container" style={{ marginBottom: "20px" }}>
                <div className="stock-date-picker-wrapper">
                  <label>Search Assets</label>
                  <div style={{ position: "relative" }}>
                    <FaSearch 
                      style={{ 
                        position: "absolute", 
                        left: "12px", 
                        top: "50%", 
                        transform: "translateY(-50%)", 
                        color: "#666",
                        fontSize: "14px"
                      }} 
                    />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="stock-select-input"
                      placeholder="Search by Asset ID, Name, or Description..."
                      style={{ paddingLeft: "35px" }}
                    />
                  </div>
                </div>
              </div>
              {loadingAssets ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div className="stock-loading-spinner" style={{ margin: "0 auto 10px" }}></div>
                  <p>Loading assets...</p>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#666",
                  }}
                >
                  <p>{assets.length === 0 ? "No assets found for this branch." : "No assets match your search criteria."}</p>
                </div>
              ) : (
                <>
                  <div className="stock-table-wrapper">
                    <table className="stock-readings-table">
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>Asset ID</th>
                          <th>Asset Name</th>
                          <th>Quantity</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentAssets.map((asset, index) => (
                        <tr key={asset.id}>
                          <td style={{textAlign: "center"}}>{startIndex + index + 1}</td>
                          <td>{asset.assetId}</td>
                          <td>{asset.assetName}</td>
                          <td>
                            <span className="qty-badge">
                              {asset.assetQty}
                            </span>
                          </td>
                          <td>{asset.description || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {}
                {totalPages > 1 && (
                  <div className="stock-pagination" style={{ 
                    display: "flex", 
                    justifyContent: "center", 
                    alignItems: "center", 
                    gap: "10px", 
                    marginTop: "20px",
                    padding: "15px",
                    borderTop: "1px solid #e5e7eb",
                    backgroundColor: "#f8fafc"
                  }}>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="edit"
                      style={{
                        backgroundColor: currentPage === 1 ? "#d1d5db" : "#3b82f6",
                        color: "white",
                        padding: "8px 12px",
                        fontSize: "12px",
                        minWidth: "auto",
                        border: "none",
                        borderRadius: "3px",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer"
                      }}
                    >
                      <FaChevronLeft />
                    </button>

                    <div style={{ display: "flex", gap: "5px" }}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className="edit"
                          style={{
                            backgroundColor: currentPage === page ? "#4f46e5" : "#f3f4f6",
                            color: currentPage === page ? "white" : "#374151",
                            padding: "8px 12px",
                            fontSize: "12px",
                            minWidth: "40px",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer"
                          }}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="edit"
                      style={{
                        backgroundColor: currentPage === totalPages ? "#d1d5db" : "#3b82f6",
                        color: "white",
                        padding: "8px 12px",
                        fontSize: "12px",
                        minWidth: "auto",
                        border: "none",
                        borderRadius: "3px",
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer"
                      }}
                    >
                      <FaChevronRight />
                    </button>

                    <span style={{ marginLeft: "15px", fontSize: "12px", color: "#666", fontWeight: "500" }}>
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredAssets.length)} of {filteredAssets.length} assets
                    </span>
                  </div>
                )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AddAssets
