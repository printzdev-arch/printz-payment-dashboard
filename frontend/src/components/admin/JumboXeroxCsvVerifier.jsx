import React, { useState, useEffect } from "react";
import api from "../../services/api";
import Papa from "papaparse";
import {
  FileCheck,
  Building2,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Info,
  Check,
} from "lucide-react";
import "../../styles/printzTheme.css";
import "../../styles/addAssets.css";
import { usePopup } from "../../hooks/usePopup";
import Popup from "../common/Popup.jsx";
import BranchSelect from "../common/BranchSelect.jsx";

const JumboXeroxCsvVerifier = () => {
  const { popup, showSuccess, showError } = usePopup();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResults, setVerificationResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get("/branches");
        const branchData = (res.data?.data || []).map((doc) => ({
          id: doc.id || doc._id,
          name: doc.name,
          address: doc.address || "",
        }));

        const sortedBranches = branchData.sort((a, b) => {
          const nameA = a.name.trim().toLowerCase();
          const nameB = b.name.trim().toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });

        setBranches(sortedBranches);
      } catch (error) {
        console.error("Failed to fetch branch names: ", error);
        showError("Failed to fetch branches: " + (error.response?.data?.message || error.message));
      }
    };

    fetchBranches();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      setCsvFile(file);
      setShowResults(false);
      setVerificationResults([]);
    } else {
      showError("Please select a valid CSV file");
      setCsvFile(null);
    }
  };

  const validateCsvHeaders = (headers) => {
    const requiredHeaders = [
      "Print Job Start Time",
      "Media Type",
      "Printer Paper Size",
      "Pages",
    ];
    const normalizedHeaders = headers.map((h) => h.trim());

    const missingHeaders = requiredHeaders.filter(
      (required) => !normalizedHeaders.some((header) => header === required)
    );

    if (missingHeaders.length > 0) {
      console.log("Missing headers:", missingHeaders);
      return false;
    }

    return true;
  };

  const parseCsvFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error("CSV parsing error: " + results.errors[0].message));
            return;
          }

          const headers = Object.keys(results.data[0] || {});
          if (!validateCsvHeaders(headers)) {
            reject(
              new Error(
                "CSV file must contain columns: Print Job Start Time, Media Type, Printer Paper Size, Pages"
              )
            );
            return;
          }

          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  };

  const fetchJumboXeroxData = async (branchName, date) => {
    try {
      const res = await api.get("/jumbo-xerox/readings", {
        params: { branchName, date },
      });
      return res.data?.data || [];
    } catch (error) {
      console.error("Error fetching jumbo xerox data:", error);
      return [];
    }
  };

  const extractDateFromTimestamp = (timestamp) => {
    try {
      if (timestamp.includes("T")) {
        return timestamp.split("T")[0];
      } else if (timestamp.includes(" ")) {
        return timestamp.split(" ")[0];
      } else {
        return timestamp;
      }
    } catch (error) {
      console.error("Error extracting date:", error);
      return null;
    }
  };

  const verifyRow = async (csvRow) => {
    const printJobStartTime = csvRow["Print Job Start Time"];
    const mediaType = csvRow["Media Type"];
    const paperSize = csvRow["Printer Paper Size"];
    const pages = csvRow["Pages"];

    const date = extractDateFromTimestamp(printJobStartTime);

    if (!date) {
      return {
        ...csvRow,
        extractedDate: date,
        status: "Invalid",
        message: "Invalid timestamp format in Print Job Start Time",
      };
    }

    const documents = await fetchJumboXeroxData(selectedBranch, date);

    if (documents.length === 0) {
      return {
        ...csvRow,
        extractedDate: date,
        status: "Not Found",
        message: "No document found for this branch and date",
      };
    }

    for (const doc of documents) {
      if (doc.rows && Array.isArray(doc.rows)) {
        const matchingRow = doc.rows.find(
          (row) =>
            row.type === mediaType &&
            row.size === paperSize &&
            Number.parseInt(row.qty) === Number.parseInt(pages)
        );

        if (matchingRow) {
          return {
            ...csvRow,
            extractedDate: date,
            status: "Match",
            message: "Exact match found",
          };
        }
      }
    }

    return {
      ...csvRow,
      extractedDate: date,
      status: "No Match",
      message: "No matching row found",
    };
  };

  const handleVerifyCSV = async () => {
    if (!selectedBranch) {
      showError("Please select a branch");
      return;
    }

    if (!csvFile) {
      showError("Please select a CSV file");
      return;
    }

    setIsProcessing(true);
    setShowResults(false);

    try {
      const csvData = await parseCsvFile(csvFile);
      const results = [];

      for (let i = 0; i < csvData.length; i++) {
        const verifiedRow = await verifyRow(csvData[i]);
        results.push(verifiedRow);
      }

      setVerificationResults(results);
      setShowResults(true);
      showSuccess(`Verification completed for ${results.length} rows`);
    } catch (error) {
      console.error("Verification failed:", error);
      showError(error.message || "Failed to process CSV file");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Match":
        return (
          <span className="add-assets-pill-success">
            <CheckCircle size={11} /> Match
          </span>
        );
      case "No Match":
        return (
          <span
            style={{
              background: "#fffbeb",
              color: "#b45309",
              border: "1px solid #fde68a",
              fontSize: "11.5px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "9999px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <AlertCircle size={11} /> No Match
          </span>
        );
      case "Not Found":
        return (
          <span
            style={{
              background: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca",
              fontSize: "11.5px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "9999px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <XCircle size={11} /> Not Found
          </span>
        );
      case "Invalid":
        return (
          <span
            style={{
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              fontSize: "11.5px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "9999px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <AlertCircle size={11} /> Invalid
          </span>
        );
      default:
        return (
          <span className="add-assets-id-badge">
            {status}
          </span>
        );
    }
  };

  const getStatusCounts = () => {
    const counts = {
      Match: 0,
      "No Match": 0,
      "Not Found": 0,
      Invalid: 0,
    };

    verificationResults.forEach((result) => {
      counts[result.status] = (counts[result.status] || 0) + 1;
    });

    return counts;
  };

  return (
    <div className="add-assets-page-container">
      <Popup {...popup} />

      {/* Header Banner - Clean emerald design, no illustration */}
      <div
        className="printz-header-banner-full"
        style={{
          width: "100%",
          background:
            "linear-gradient(90deg, #E8FAF2 0%, #F0FFF9 50%, #E8FAF2 100%)",
          border: "1px solid #dcfce7",
          borderRadius: "16px",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
          flexWrap: "wrap",
        }}
      >
        <div className="printz-header-title-area" style={{ flexShrink: 0 }}>
          <h1
            style={{
              margin: "0 0 4px 0",
              fontSize: "26px",
              fontWeight: 700,
              color: "#111827",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Jumbo Xerox{" "}
            <span className="highlight" style={{ color: "#059669" }}>
              CSV Verifier
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Audit and verify jumbo xerox machine print logs against recorded database readings.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #a7f3d0",
              padding: "8px 16px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#065f46",
              boxShadow: "0 1px 3px rgba(5, 150, 105, 0.08)",
            }}
          >
            <Building2 size={16} color="#059669" />
            <span>{branches.length} Branches Available</span>
          </div>
        </div>
      </div>

      {/* Upload and Verification Form Card */}
      <div className="add-assets-card">
        <div className="add-assets-card-header">
          <div className="add-assets-card-header-left">
            <div className="add-assets-card-icon">
              <FileCheck size={18} color="#059669" />
            </div>
            <div>
              <h3 className="add-assets-card-title" style={{ fontSize: "18px", fontWeight: 700 }}>
                Upload & Verify CSV Log
              </h3>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Info Banner */}
          <div
            style={{
              padding: "12px 16px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "10px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <Info size={16} color="#059669" style={{ marginTop: "2px", flexShrink: 0 }} />
            <div style={{ fontSize: "12.5px", color: "#166534", lineHeight: 1.5 }}>
              <strong>Required CSV Columns:</strong> "Print Job Start Time", "Media Type", "Printer Paper Size", "Pages".
              The system automatically matches jobs by date, paper size, media type, and quantity.
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyCSV();
            }}
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            <div className="add-assets-grid-2">
              <div className="add-assets-field">
                <label className="add-assets-label">Branch Location *</label>
                <BranchSelect
                  id="branch"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  branches={branches}
                  disabled={isProcessing}
                  placeholder="Select Branch"
                  required
                />
              </div>

              <div className="add-assets-field">
                <label className="add-assets-label">Select CSV Log File *</label>
                <div className="add-assets-input-wrap">
                  <Upload size={16} className="add-assets-input-icon" />
                  <input
                    type="file"
                    id="csvFile"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="add-assets-input"
                    disabled={isProcessing}
                    required
                    style={{ cursor: "pointer" }}
                  />
                </div>
              </div>
            </div>

            <div className="add-assets-btn-row">
              <button
                type="submit"
                className="printz-btn-primary"
                disabled={isProcessing || !selectedBranch || !csvFile}
                style={{
                  padding: "10px 22px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "10px",
                  background:
                    isProcessing || !selectedBranch || !csvFile
                      ? "#94a3b8"
                      : "#059669",
                  color: "#ffffff",
                  border: "none",
                  cursor:
                    isProcessing || !selectedBranch || !csvFile
                      ? "not-allowed"
                      : "pointer",
                  boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                }}
              >
                <Check size={16} />
                <span>{isProcessing ? "Verifying Records..." : "Verify CSV"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Verification KPI Summary */}
      {showResults && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "14px",
          }}
        >
          {Object.entries(getStatusCounts()).map(([status, count]) => {
            const isVerified = status === "Verified";
            const isMissing = status === "Missing in DB";
            const isMismatch = status === "Quantity Mismatch";

            return (
              <div
                key={status}
                className="add-assets-card"
                style={{
                  padding: "16px",
                  textAlign: "center",
                  background: isVerified
                    ? "#f0fdf4"
                    : isMissing
                    ? "#fef2f2"
                    : isMismatch
                    ? "#fffbeb"
                    : "#ffffff",
                  borderColor: isVerified
                    ? "#bbf7d0"
                    : isMissing
                    ? "#fecaca"
                    : isMismatch
                    ? "#fde68a"
                    : "#e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: "26px",
                    fontWeight: 800,
                    color: isVerified
                      ? "#15803d"
                      : isMissing
                      ? "#dc2626"
                      : isMismatch
                      ? "#b45309"
                      : "#0f172a",
                    marginBottom: "4px",
                  }}
                >
                  {count}
                </div>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: isVerified
                      ? "#166534"
                      : isMissing
                      ? "#991b1b"
                      : isMismatch
                      ? "#92400e"
                      : "#64748b",
                    fontWeight: 600,
                  }}
                >
                  {status}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Verification Results Table */}
      {showResults && (
        <div className="add-assets-card">
          <div className="add-assets-card-header">
            <div className="add-assets-card-header-left">
              <div className="add-assets-card-icon">
                <FileSpreadsheet size={18} color="#059669" />
              </div>
              <div>
                <h3 className="add-assets-card-title" style={{ fontSize: "18px", fontWeight: 700 }}>
                  Verification Results ({verificationResults.length} rows)
                </h3>
              </div>
            </div>
          </div>

          <div>
            {verificationResults.length === 0 ? (
              <div className="add-assets-empty-state">
                <FileCheck size={38} color="#cbd5e1" />
                <h4>No verification results</h4>
                <p>The uploaded CSV contained no parseable print records.</p>
              </div>
            ) : (
              <div className="add-assets-table-wrap">
                <table className="add-assets-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px", textAlign: "center" }}>S.No</th>
                      <th>Extracted Date</th>
                      <th>Media Type</th>
                      <th>Paper Size</th>
                      <th>Pages</th>
                      <th>Status</th>
                      <th>Audit Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verificationResults.map((result, index) => (
                      <tr key={index}>
                        <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                          {index + 1}
                        </td>
                        <td>
                          <span className="add-assets-id-badge">
                            {result.extractedDate || "N/A"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>
                          {result["Media Type"]}
                        </td>
                        <td>
                          <span className="add-assets-id-badge">
                            {result["Printer Paper Size"]}
                          </span>
                        </td>
                        <td>
                          <span className="add-assets-qty-pill">
                            {result["Pages"]}
                          </span>
                        </td>
                        <td>{getStatusBadge(result.status)}</td>
                        <td style={{ color: "#475569", fontSize: "12.5px" }}>
                          {result.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing Loader */}
      {isProcessing && (
        <div
          className="add-assets-card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 20px",
            gap: "10px",
            color: "#64748b",
          }}
        >
          <div className="add-assets-spinner"></div>
          <p style={{ margin: 0, fontSize: "13px" }}>Processing and matching CSV records...</p>
        </div>
      )}
    </div>
  );
};

export default JumboXeroxCsvVerifier;
