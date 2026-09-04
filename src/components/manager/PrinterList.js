import { useState, useEffect } from "react";
import { db } from "../../services/authservice";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import {
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaFilePdf,
  FaEdit,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/stocklist.css";
import jsPDF from "jspdf";
import "jspdf-autotable";
import noDataImage from "../../assets/nodata.png";
import logo from "../../assets/logo.png";

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
  const [printers, setPrinters] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [allBranches, setAllBranches] = useState([]);
  const [editingPrinterId, setEditingPrinterId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const printersPerPage = 10;

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const branchCollection = collection(db, "branches");
        const branchSnapshot = await getDocs(branchCollection);
        const branchList = branchSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
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
        const printerCollection = collection(db, "printers");
        let printerQuery;

        if (selectedBranch) {
          printerQuery = query(
            printerCollection,
            where("branchName", "==", selectedBranch),
            orderBy("printerId")
          );
        } else {
          printerQuery = query(
            printerCollection,
            orderBy("branchName"),
            orderBy("printerId")
          );
        }

        const printerSnapshot = await getDocs(printerQuery);
        const printerList = printerSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPrinters(printerList);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching printers:", error);
        toast.error("Failed to fetch printers: " + error.message, {
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
      const printerRef = doc(db, "printers", printer.id);
      await updateDoc(printerRef, {
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
        `Printer_List_${
          selectedBranch || "All_Branches"
        }_${new Date().toLocaleDateString()}.pdf`
      );

      toast.success("PDF generated successfully", {
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
    <div className="stock-list-container">
      <ToastContainer />
      <div className="stock-list-card">
        <div className="card-header">
          <h2>Printer Price List</h2>
          <button className="pdf-button" onClick={generatePDF}>
            <FaFilePdf /> Generate PDF
          </button>
        </div>
        <div className="card-content">
          <div className="filters">
            <div className="form-group">
              <label>Select Branch</label>
              <select
                value={selectedBranch}
                onChange={handleBranchChange}
                className="form-control"
              >
                <option value="">All Branches</option>
                {allBranches.map((branch) => (
                  <option key={branch.id} value={branch.branchName}>
                    {branch.branchName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading printer data...</p>
            </div>
          ) : filteredPrinters.length > 0 ? (
            <>
              <div className="table-responsive">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>Printer ID</th>
                      <th>Printer Name</th>
                      <th>Branch</th>
                      <th>Price</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPrinters.map((printer) => (
                      <tr
                        key={printer.id}
                        className={
                          !printer.printerId || printer.printerId === ""
                            ? "printer-needs-id"
                            : ""
                        }
                      >
                        <td>
                          {editingPrinterId === printer.id ? (
                            <div className="edit-printer-id">
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) =>
                                  setEditingValue(e.target.value)
                                }
                                placeholder="Enter Printer ID"
                                className="printer-id-input"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="printer-id-display">
                              {printer.printerId || (
                                <span className="missing-id-warning">
                                  ⚠️ ID Required
                                </span>
                              )}
                              {printer.needsPrinterIdUpdate && (
                                <span className="clone-warning">
                                  {" "}
                                  (Cloned - Needs ID)
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td>{printer.printerName}</td>
                        <td>{printer.branchName}</td>
                        <td>
                          {printer.prices?.map((priceObj, priceIndex) => (
                            <div key={priceIndex} className="price-item">
                              <span className="price-size">
                                {priceObj.size}:
                              </span>
                              <span className="price-value">
                                {formatCurrency(priceObj.price)}
                              </span>
                            </div>
                          ))}
                        </td>
                        <td>
                          {editingPrinterId === printer.id ? (
                            <div className="edit-actions">
                              <button
                                onClick={() => handleSavePrinterId(printer)}
                                className="save-btn"
                                title="Save Printer ID"
                              >
                                <FaSave />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="cancel-btn"
                                title="Cancel Edit"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditPrinterId(printer)}
                              className="edit-btn"
                              title="Edit Printer ID"
                            >
                              <FaEdit />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <button
                  onClick={previousPage}
                  disabled={currentPage === 1}
                  className={currentPage === 1 ? "disabled" : ""}
                >
                  <FaRegArrowAltCircleLeft /> Previous
                </button>
                <span className="page-info">
                  Page {currentPage} of{" "}
                  {Math.ceil(filteredPrinters.length / printersPerPage)}
                </span>
                <button
                  onClick={nextPage}
                  disabled={
                    currentPage ===
                    Math.ceil(filteredPrinters.length / printersPerPage)
                  }
                  className={
                    currentPage ===
                    Math.ceil(filteredPrinters.length / printersPerPage)
                      ? "disabled"
                      : ""
                  }
                >
                  Next <FaRegArrowAltCircleRight />
                </button>
              </div>
            </>
          ) : (
            <div className="no-data-container">
              <img
                src={noDataImage || "/placeholder.svg"}
                alt="No data available"
                className="no-data-image"
              />
              <p className="no-data-text">
                No printer data available
                {selectedBranch ? ` for ${selectedBranch}` : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrinterList;
