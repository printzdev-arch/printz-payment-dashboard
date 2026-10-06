import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaFilePdf,
  FaEdit,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import {
  Printer,
  Building2,
  ChevronDown,
  Pencil,
  Save,
  X,
  AlertTriangle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/printzTheme.css";
import "../../styles/printerlist.css";
import "../../styles/stocklist.css";
import jsPDF from "jspdf";
import "jspdf-autotable";
import noDataImage from "../../assets/nodata.png";
import logo from "../../assets/logo.png";
import Pagination from "../common/Pagination";
import BranchSelect from "../common/BranchSelect.jsx";

const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) {
    return "₹0";
  }
  let [integer, decimal] = Number.parseFloat(amount).toFixed(0).split(".");
  integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (integer.length > 4 && integer.includes(",,")) {
    integer = integer.replace(",,", ",");
  }

  return `₹${integer}${decimal ? "." + decimal : ""}`;
};

const PrinterList = () => {
  const navigate = useNavigate();
  const [printers, setPrinters] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [allBranches, setAllBranches] = useState([]);
  const [editingPrinterId, setEditingPrinterId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [printersPerPage, setPrintersPerPage] = useState(10);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get("/branches");
        const branchList = (res.data?.data || []).map((doc) => ({
          id: doc.id || doc._id,
          ...doc,
        }));
        setAllBranches(branchList);
      } catch (error) {
        console.error("Error fetching branches:", error);
        toast.error("Failed to fetch branches", {
          className: "custom-toast",
          closeButton: ({ closeToast }) => (
            <FaTimes onClick={closeToast} className="custom-close-button" />
          ),
        });
      }
    };

    fetchBranches();
  }, []);

  useEffect(() => {
    const fetchPrinters = async () => {
      setLoading(true);
      try {
        const endpoint = selectedBranch
          ? `/printers?branchName=${encodeURIComponent(selectedBranch)}`
          : "/printers";
        const res = await api.get(endpoint);
        const printerList = (res.data?.data || []).map((doc) => ({
          id: doc.id || doc._id,
          ...doc,
        }));

        setPrinters(printerList);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching printers:", error);
        toast.error("Failed to fetch printers: " + (error?.response?.data?.message || error.message), {
          className: "custom-toast",
          closeButton: ({ closeToast }) => (
            <FaTimes onClick={closeToast} className="custom-close-button" />
          ),
        });
        setLoading(false);
      }
    };

    fetchPrinters();
  }, [selectedBranch]);

  const handleBranchChange = (e) => {
    setSelectedBranch(e.target.value);
    setCurrentPage(1);
  };

  const handleEditPrinterId = (printer) => {
    setEditingPrinterId(printer.id);
    setEditingValue(printer.printerId || "");
  };

  const handleSavePrinterId = async (printer) => {
    if (!editingValue.trim()) {
      toast.error("Printer ID cannot be empty", {
        className: "custom-toast",
        closeButton: ({ closeToast }) => (
          <FaTimes onClick={closeToast} className="custom-close-button" />
        ),
      });
      return;
    }

    try {
      await api.put(`/printers/${printer.id}`, {
        printerId: editingValue.trim(),
        needsPrinterIdUpdate: false,
      });

      setPrinters(
        printers.map((p) =>
          p.id === printer.id
            ? {
              ...p,
              printerId: editingValue.trim(),
              needsPrinterIdUpdate: false,
            }
            : p
        )
      );

      setEditingPrinterId(null);
      setEditingValue("");

      toast.success("Printer ID updated successfully", {
        className: "custom-toast",
        closeButton: ({ closeToast }) => (
          <FaTimes onClick={closeToast} className="custom-close-button" />
        ),
      });
    } catch (error) {
      console.error("Error updating printer ID:", error);
      toast.error("Failed to update printer ID: " + error.message, {
        className: "custom-toast",
        closeButton: ({ closeToast }) => (
          <FaTimes onClick={closeToast} className="custom-close-button" />
        ),
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingPrinterId(null);
    setEditingValue("");
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF();

      const imgWidth = 40;
      const imgHeight = 20;
      doc.addImage(logo, "PNG", 15, 10, imgWidth, imgHeight);

      doc.setFontSize(18);
      doc.setTextColor(44, 62, 80);
      doc.text("Printer Price List", doc.internal.pageSize.width / 2, 20, {
        align: "center",
      });

      doc.setFontSize(12);
      doc.text(`Branch: ${selectedBranch || "All Branches"}`, 15, 35);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 42);

      const tableColumn = ["Printer ID", "Printer Name", "Branch", "Prices"];

      const tableRows = [];

      filteredPrinters.forEach((printer) => {
        const priceText = printer.prices
          ?.map((p) => `${p.size}: ${formatCurrency(p.price)}`)
          .join(", ");
        const printerData = [
          printer.printerId,
          printer.printerName,
          printer.branchName,
          priceText,
        ];
        tableRows.push(printerData);
      });

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 50,
        styles: {
          fontSize: 10,
          cellPadding: 3,
          lineColor: [44, 62, 80],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [44, 62, 80],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        },
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          {
            align: "center",
          }
        );
      }

      doc.save(
        `Printer_List_${selectedBranch || "All_Branches"
        }_${new Date().toLocaleDateString()}.pdf`
      );

      toast.success("PDF downloaded successfully!", {
        className: "custom-toast",
        closeButton: ({ closeToast }) => (
          <FaTimes onClick={closeToast} className="custom-close-button" />
        ),
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF: " + error.message, {
        className: "custom-toast",
        closeButton: ({ closeToast }) => (
          <FaTimes onClick={closeToast} className="custom-close-button" />
        ),
      });
    }
  };

  const filteredPrinters = selectedBranch
    ? printers.filter((printer) => printer.branchName === selectedBranch)
    : printers;

  const indexOfLastPrinter = currentPage * printersPerPage;
  const indexOfFirstPrinter = indexOfLastPrinter - printersPerPage;
  const currentPrinters = filteredPrinters.slice(
    indexOfFirstPrinter,
    indexOfLastPrinter
  );

  const nextPage = () => {
    if (currentPage < Math.ceil(filteredPrinters.length / printersPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="printer-list-page-container">
      <ToastContainer />

      {/* Full Header Banner - Green gradient banner without illustration */}
      <div
        className="printz-header-banner-full"
        style={{
          width: "100%",
          background: "linear-gradient(90deg, #E8FAF2 0%, #F0FFF9 50%, #E8FAF2 100%)",
          border: "1px solid #dcfce7",
          borderRadius: "16px",
          padding: "12px 24px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
        }}
      >
        <div className="printz-header-title-area">
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
            Printer <span className="highlight" style={{ color: "#059669" }}>Price List</span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            View branch pricing rates and export PDF summaries.
          </p>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="printer-section-card printer-filter-card">
        <div className="printer-filter-toolbar">
          <div className="printer-filter-left">
            <div className="printer-filter-field">
              <label className="printer-filter-label">
                <Building2 size={15} color="#059669" />
                <span>Store / Branch</span>
              </label>
              <BranchSelect
                value={selectedBranch}
                onChange={handleBranchChange}
                branches={allBranches}
                allowAll={true}
                allOptionLabel="All Branches"
                placeholder="All Branches"
              />
            </div>

            <div className="printer-branch-status-badge">
              <span className="printer-status-dot"></span>
              <span>
                <strong>{filteredPrinters.length}</strong> printer{filteredPrinters.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="printer-filter-right">
            <button
              type="button"
              className="mp-btn"
              style={{
                background: "#059669",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
              }}
              onClick={generatePDF}
            >
              <FaFilePdf size={14} />
              <span>Generate PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="printer-section-card printer-table-card">
        <div className="printer-services-header-row">
          <div className="printer-services-header-left">
            <div className="printer-services-tag-icon">
              <Printer size={20} color="#059669" />
            </div>
            <div>
              <h4 className="printer-services-title">
                {selectedBranch ? `Printers in ${selectedBranch}` : "All Branch Hardware"}
              </h4>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {loading ? (
            <div className="printer-empty-state">
              <div className="stock-loading-spinner" style={{ margin: "0 auto 12px" }}></div>
              <p style={{ color: "#64748b", margin: 0, fontSize: "14px", fontWeight: "500" }}>Loading printer data...</p>
            </div>
          ) : filteredPrinters.length > 0 ? (
            <>
              <div className="printer-table-scroll">
                <table className="printer-modern-table">
                  <thead>
                    <tr>
                      <th style={{ width: "160px" }}>Printer ID</th>
                      <th style={{ minWidth: "180px" }}>Printer Name</th>
                      <th style={{ minWidth: "150px" }}>Branch</th>
                      <th style={{ width: "120px", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPrinters.map((printer) => (
                      <tr
                        key={printer.id}
                        className={
                          !printer.printerId || printer.printerId === ""
                            ? "row-needs-id"
                            : ""
                        }
                      >
                        <td style={{ verticalAlign: "top" }}>
                          {editingPrinterId === printer.id ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) =>
                                  setEditingValue(e.target.value)
                                }
                                placeholder="Enter ID"
                                className="printer-table-edit-input"
                                style={{ maxWidth: "130px", textTransform: "uppercase" }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {printer.printerId ? (
                                <span className="printer-id-badge">{printer.printerId}</span>
                              ) : (
                                <span className="printer-id-missing-badge">
                                  <AlertTriangle size={12} /> ID Required
                                </span>
                              )}
                              {printer.needsPrinterIdUpdate && (
                                <span style={{ fontSize: "11px", color: "#c2410c", background: "#fff7ed", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                                  Cloned
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ verticalAlign: "top", fontWeight: "600", color: "#0f172a" }}>
                          {printer.printerName}
                        </td>
                        <td style={{ verticalAlign: "top", color: "#475569" }}>
                          {printer.branchName}
                        </td>
                        <td style={{ verticalAlign: "top", textAlign: "center" }}>
                          {editingPrinterId === printer.id ? (
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleSavePrinterId(printer)}
                                className="printer-btn-edit"
                                title="Save Printer ID"
                              >
                                <Save size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="printer-btn-delete"
                                title="Cancel Edit"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate("/add-printer-manager", {
                                    state: { printer },
                                  })
                                }
                                className="printer-btn-view"
                                title="View Details in Add Printer"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditPrinterId(printer)}
                                className="printer-btn-edit"
                                title="Edit Printer ID"
                              >
                                <Pencil size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Standard Pagination */}
              <Pagination
                currentPage={currentPage}
                totalItems={filteredPrinters.length}
                itemsPerPage={printersPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setPrintersPerPage}
                pageSizeOptions={[10, 20, 50, 100]}
                itemLabel="printers"
              />
            </>
          ) : (
            <div className="printer-empty-state">
              <div className="printer-empty-icon-wrap">
                <Printer size={32} />
              </div>
              <h4 className="printer-empty-title">No Printer Data Available</h4>
              <p className="printer-empty-desc">
                No printer records found{selectedBranch ? ` for ${selectedBranch}` : ""}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrinterList;
