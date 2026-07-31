import { useState, useEffect } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "../../services/authservice"
import Papa from "papaparse"
import "../../styles/stocklist.css"
import { usePopup } from "../../hooks/usePopup"
import Popup from "../common/Popup"

const JumboXeroxCsvVerifier = () => {
  const { popup, showSuccess, showError } = usePopup();
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState("")
  const [csvFile, setCsvFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [verificationResults, setVerificationResults] = useState([])
  const [showResults, setShowResults] = useState(false)

  
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "branches"))
        const branchData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          address: doc.data().address || "",
        }))

        
        const sortedBranches = branchData.sort((a, b) => {
          const nameA = a.name.trim().toLowerCase()
          const nameB = b.name.trim().toLowerCase()

          if (nameA < nameB) return -1
          if (nameA > nameB) return 1
          return 0
        })

        setBranches(sortedBranches)
      } catch (error) {
        console.error("Failed to fetch branch names: ", error)
        showError("Failed to fetch branches");
      }
    }

    fetchBranches()
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === "text/csv") {
      setCsvFile(file)
      setShowResults(false)
      setVerificationResults([])
    } else {
      showError("Please select a valid CSV file");
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
      console.log("Missing headers:", missingHeaders)
      console.log("Available headers:", normalizedHeaders)
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

  const fetchJumboXeroxData = async (branchName, date) => {
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

    
    const date = extractDateFromTimestamp(printJobStartTime)

    if (!date) {
      return {
        ...csvRow,
        extractedDate: date,
        status: "Invalid",
        message: "Invalid timestamp format in Print Job Start Time",
      }
    }

    
    const documents = await fetchJumboXeroxData(selectedBranch, date)

    if (documents.length === 0) {
      return {
        ...csvRow,
        extractedDate: date,
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
            extractedDate: date,
            status: "Match",
            message: "Exact match found",
          }
        }
      }
    }

    return {
      ...csvRow,
      extractedDate: date,
      status: "No Match",
      message: "No matching row found",
    }
  }

  const handleVerifyCSV = async () => {
    if (!selectedBranch) {
      showError("Please select a branch");
      return
    }

    if (!csvFile) {
      showError("Please select a CSV file");
      return
    }

    setIsProcessing(true)
    setShowResults(false)

    try {
      
      const csvData = await parseCsvFile(csvFile)

      if (csvData.length === 0) {
        showError("CSV file is empty");
        setIsProcessing(false)
        return
      }

      
      const results = []
      for (const row of csvData) {
        const result = await verifyRow(row)
        results.push(result)
      }

      setVerificationResults(results)
      setShowResults(true)
      showSuccess(`Verification completed for ${results.length} rows`);
    } catch (error) {
      console.error("Error verifying CSV:", error)
      showError(error.message || "Failed to verify CSV file");
    } finally {
      setIsProcessing(false)
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

  return (
    <div className="stock-readings-container">
      {}
      <div className="stock-page-header">
        <h2>Large format Printing CSV Verifier</h2>
        <p>Upload CSV file to verify against Firestore jumboXeroxReadings collection</p>
      </div>

      {}
      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Verification Instructions</h3>
          </div>
        </div>
        <div className="stock-card-content">
          {/* <div style={{ marginBottom: "16px" }}>
            <strong>Required CSV Headers:</strong>
            <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
              <li>Print Job Start Time (for date extraction)</li>
              <li>Media Type (B/W, Color, etc.)</li>
              <li>Printer Paper Size (A3, A4, etc.)</li>
              <li>Pages (quantity)</li>
            </ul>
          </div> */}
          <div
            style={{
              padding: "12px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              borderLeft: "4px solid #667eea",
            }}
          >
            <strong>Matching Logic:</strong>
            <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: "14px" }}>
              System extracts date from "Print Job Start Time", finds Firestore documents by branch and date, then
              matches rows by Media Type, Paper Size, and Pages quantity.
            </p>
          </div>
        </div>
      </div>

      {}
      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Upload & Verify CSV</h3>
          </div>
        </div>
        <div className="stock-card-content">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleVerifyCSV()
            }}
          >
            <div className="stock-date-picker-container">
              <div className="stock-date-picker-wrapper">
                <label htmlFor="branch">Branch Name *</label>
                <select
                  id="branch"
                  name="branch"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="stock-select-input"
                  disabled={isProcessing}
                  style={{ minWidth: "250px" }}
                >
                  <option value="">-- Select Branch Name --</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="stock-date-picker-wrapper">
                <label htmlFor="csvFile">CSV File *</label>
                <input
                  type="file"
                  id="csvFile"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="stock-select-input"
                  disabled={isProcessing}
                  style={{ minWidth: "250px" }}
                />
              </div>
            </div>

            <div className="stock-action-buttons">
              <button
                type="submit"
                className="stock-save-button"
                disabled={isProcessing || !selectedBranch || !csvFile}
              >
                {isProcessing ? (
                  <>
                    <div className="stock-loading-spinner"></div>
                    Processing...
                  </>
                ) : (
                  <>Verify CSV</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {}
      {showResults && (
        <div className="stock-card">
          <div className="stock-card-header">
            <div className="stock-card-title">
              <h3>Verification Summary</h3>
            </div>
          </div>
          <div className="stock-card-content">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
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
          </div>
        </div>
      )}

      {}
      {showResults && (
        <div className="stock-card">
          <div className="stock-card-header">
            <div className="stock-card-title">
              <h3>Verification Results ({verificationResults.length} rows)</h3>
            </div>
          </div>
          <div className="stock-card-content">
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
      )}

      {}
      {!showResults && !isProcessing && (
        <div className="stock-no-data-message">
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
          <p>Select branch and upload CSV file to start verification</p>
        </div>
      )}

      {}
      {isProcessing && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px" }}>
          <div className="stock-loading-spinner"></div>
          <p style={{ marginTop: "16px", color: "#666" }}>Processing CSV file...</p>
        </div>
      )}
      
      {/* Popup Component */}
      <Popup 
        show={popup.show} 
        message={popup.message} 
        type={popup.type} 
        onClose={() => {}} 
      />
    </div>
  )
}

export default JumboXeroxCsvVerifier
