import React, { useState, useEffect } from "react";
import { db, auth } from "../../services/authservice";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaCalendarAlt,
  FaDownload,
  FaCheckCircle,
} from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/stocklist.css";
import jsPDF from "jspdf";
import "jspdf-autotable";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Popup from "../common/Popup";
import { usePopup } from "../../hooks/usePopup";

const AdminStockReadingsRevenue = () => {
  const { popup, showSuccess, showError, showInfo } = usePopup();
  const [stocks, setStocks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [date, setDate] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branches, setBranches] = useState([]);
  const [userId, setUserId] = useState(null);
  const [docId, setDocId] = useState("");
  const [isExistingDoc, setIsExistingDoc] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);
  const stocksPerPage = 10;

  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoadingStocks(true);
      const user = auth.currentUser;
      if (user) {
        setUserId(user.uid);

        try {
          const branchesQuery = query(
            collection(db, "users"),
            where("role", "==", "manager")
          );

          const branchesSnapshot = await getDocs(branchesQuery);

          const uniqueBranches = [
            ...new Set(branchesSnapshot.docs.map((doc) => doc.data().branch)),
          ];

          const sortedBranches = uniqueBranches.sort((a, b) => {
            const nameA = a.trim().toLowerCase();
            const nameB = b.trim().toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
          });

          setBranches(sortedBranches);
          console.log("Fetched branches:", uniqueBranches);
        } catch (error) {
          console.error("Error fetching branches:", error);
          showError("Error Loading Branches", "Failed to fetch branches. Please refresh the page and try again.");
        } finally {
          setIsLoadingStocks(false);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleDateChange = (selectedDate) => {
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      console.error("Invalid date object:", selectedDate);
      alert("Please select a valid date.");
      return;
    }

    const formattedDate = formatDateToYYYYMMDD(selectedDate);
    setDate(formattedDate);
  };

  useEffect(() => {
    const fetchStocks = async () => {
      if (!branchName) {
        setStocks([]);
        return;
      }

      setIsLoadingStocks(true);
      try {
        const stocksQuery = query(
          collection(db, "stocks"),
          where("branchName", "==", branchName)
        );
        const querySnapshot = await getDocs(stocksQuery);

        const fetchedStocks = [];
        querySnapshot.forEach((doc) => {
          const stockData = doc.data();
          fetchedStocks.push({
            id: doc.id,
            itemName: stockData.itemName,
            amount: stockData.amount,
            category: stockData.category,
            openingStock: "",
            addedStock: "",
            closingStock: "",
            sold: "",
            pageRanges: stockData.pageRanges || null,
          });
        });

        setStocks(fetchedStocks);
      } catch (error) {
        showError("Error Loading Stocks", `Error fetching stocks: ${error.message}. Please try again.`);
        console.error("Error fetching stocks:", error);
      } finally {
        setIsLoadingStocks(false);
      }
    };

    fetchStocks();
  }, [branchName]);

  useEffect(() => {
    if (!date || !branchName || stocks.length === 0) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const formattedDate = date.replace(/-/g, "");
        const newDocId = `${branchName}_${formattedDate}`;
        setDocId(newDocId);

        const docRef = doc(db, "stockReadings", newDocId);
        const docSnapshot = await getDoc(docRef);

        if (docSnapshot.exists()) {
          setIsExistingDoc(true);
          const existingData = docSnapshot.data();

          setStocks((prevStocks) =>
            prevStocks.map((stock) => {
              const existingStock = existingData.stocks.find(
                (s) => s.itemName === stock.itemName
              );

              const savedPageRanges = existingStock?.pageRanges || [];

              return {
                ...stock,
                openingStock: existingStock?.openingStock ?? "",
                addedStock: existingStock?.addedStock ?? "",
                sold: existingStock?.sold ?? "",
                closingStock: existingStock?.closingStock ?? "",
                pageRanges: stock.pageRanges?.map((range, index) => ({
                  ...range,
                  sold: savedPageRanges[index]?.sold ?? "",
                })),
              };
            })
          );
        } else {
          setIsExistingDoc(false);
          setStocks((prevStocks) =>
            prevStocks.map((stock) => ({
              ...stock,
              openingStock: "",
              addedStock: "",
              sold: "",
              closingStock: "",
              pageRanges: stock.pageRanges?.map((range) => ({
                ...range,
                sold: "",
              })),
            }))
          );
        }
      } catch (error) {
        showError("Error Loading Data", `Error fetching data: ${error.message}. Please check your connection and try again.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [date, branchName, stocks.length]);

  const indexOfLastStock = currentPage * stocksPerPage;
  const indexOfFirstStock = indexOfLastStock - stocksPerPage;
  const currentStocks = stocks.slice(indexOfFirstStock, indexOfLastStock);

  const nextPage = () => {
    if (currentPage < Math.ceil(stocks.length / stocksPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const calculateTotalAmount = () => {
    return stocks.reduce((total, stock) => {
      if (stock.pageRanges) {
        const rangesTotal = stock.pageRanges.reduce(
          (sum, range) => sum + (Number(range.sold) || 0) * range.price,
          0
        );
        return total + rangesTotal;
      } else {
        return total + (Number(stock.sold) || 0) * (Number(stock.amount) || 0);
      }
    }, 0);
  };

  const loadImageAsBase64 = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = url;
    });

  const generatePDF = async () => {
    if (!date || !branchName) {
      showError("Missing Information", "Please select a branch and date first before generating PDF");
      return;
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.width;
      let yPosition = 8;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");

      try {
        const logoBase64 = await loadImageAsBase64("/logo192.png");
        pdf.addImage(logoBase64, "PNG", 10, yPosition, 20, 15);
      } catch (error) {
        pdf.rect(10, yPosition, 20, 15);
        pdf.setFontSize(6);
        pdf.text("PRINTZ", 20, yPosition + 9, { align: "center" });
      }

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        branchName.toUpperCase() + " BRANCH",
        pageWidth / 2,
        yPosition + 6,
        {
          align: "center",
        }
      );

      pdf.setFontSize(10);
      pdf.text("Printz Shop", pageWidth - 30, yPosition + 4, {
        align: "center",
      });
      pdf.setFontSize(6);
      pdf.text(
        "One Stop Shop For All Your Printing Needs",
        pageWidth - 30,
        yPosition + 8,
        { align: "center" }
      );

      pdf.setFontSize(8);
      pdf.text("DATE", pageWidth - 40, yPosition + 13);
      const displayDate =
        typeof date === "string"
          ? new Date(date).toLocaleDateString("en-GB")
          : date.toLocaleDateString("en-GB");
      pdf.text(displayDate, pageWidth - 25, yPosition + 13);

      yPosition += 18;

      const stockTableData = [];
      let serialNo = 1;

      stocks.forEach((stock) => {
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
            ]);
          });
          serialNo++;
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
          ]);
          serialNo++;
        }
      });

      const totalAmount = calculateTotalAmount();
      stockTableData.push([
        "",
        "TOTAL STOCK AMOUNT",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `Rs.${totalAmount}`,
      ]);

      pdf.autoTable({
        head: [
          [
            "S.No",
            "Item Name",
            "Category",
            "Opening",
            "Added",
            "Closing",
            "Pages",
            "Sold",
            "Unit Price",
            "Amount",
          ],
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
            data.cell.styles.fillColor = [0, 0, 0];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = "bold";
          }
        },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: 10, right: 10 },
      });

      const formattedDate = date.split("-").reverse().join("-");
      pdf.save(`Stock_Readings_${branchName}_${formattedDate}.pdf`);
      showSuccess("PDF Generated", "Stock readings PDF generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      showError("PDF Generation Failed", `Failed to generate PDF: ${error.message}. Please try again.`);
    }
  };

  const totalAmount = calculateTotalAmount();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoadingStocks && branches.length === 0) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Loading branches...</p>
      </div>
    );
  }

  if (isLoadingStocks && branchName) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Loading stock items for {branchName}...</p>
      </div>
    );
  }

  if (stocks.length === 0 && branchName) {
    return (
      <div className="stock-loading-container">
        <div className="stock-no-data">
          <h3>No Stock Items Found</h3>
          <p>No stock items have been added for branch: {branchName}</p>
          <p>Please add stock items first using the Add Stock feature.</p>
        </div>
      </div>
    );
  }

  if (isLoading && !stocks.length) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Loading stock data...</p>
      </div>
    );
  }

  return (
    <div className="stock-readings-container">
      <Popup {...popup} />
      <div className="stock-page-header">
        <h2>Stock Readings Revenue</h2>
        <p>View stock readings revenue data for selected branch and date.</p>
      </div>

      <div className="printer-date-picker-container">
        <div className="printer-date-picker-wrapper">
          <label htmlFor="branch-select">Select Branch</label>
          <select
            id="branch-select"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="printer-branch-select"
          >
            <option value="">Select a branch</option>
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>

        <div className="printer-date-picker-wrapper">
          <label htmlFor="reading-date">Select Date</label>
          <div className="printer-date-input-wrapper">
            <FaCalendarAlt className="printer-date-icon" />
            <DatePicker
              id="reading-date"
              selected={date ? new Date(date) : null}
              onChange={handleDateChange}
              dateFormat="yyyy-MM-dd"
              required
              className="printer-date-input"
            />
          </div>
        </div>

        {date && branchName && (
          <button
            onClick={generatePDF}
            className="printer-download-button"
            disabled={isLoading}
          >
            <FaDownload /> Download PDF
          </button>
        )}
      </div>

      {date && branchName ? (
        <div className="stock-list">
          <div className="stock-card">
            <div className="stock-card-header">
              <div className="stock-card-title">
                <h3>Stock Items - {branchName}</h3>
                {isExistingDoc && (
                  <div className="stock-saved-indicator">
                    <FaCheckCircle className="stock-lock-icon" />
                    <span>Revenue Data Available</span>
                  </div>
                )}
              </div>
            </div>

            <div className="stock-card-content">
              <div className="stock-table-wrapper">
                <table className="stock-readings-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>ITEMS</th>
                      <th>CATEGORY</th>
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
                          <td
                            rowSpan={
                              stock.pageRanges ? stock.pageRanges.length + 1 : 1
                            }
                          >
                            {indexOfFirstStock + index + 1}
                          </td>
                          <td
                            rowSpan={
                              stock.pageRanges ? stock.pageRanges.length + 1 : 1
                            }
                          >
                            {stock.itemName}
                          </td>
                          <td
                            rowSpan={
                              stock.pageRanges ? stock.pageRanges.length + 1 : 1
                            }
                          >
                            {stock.category}
                          </td>
                          <td
                            rowSpan={
                              stock.pageRanges ? stock.pageRanges.length + 1 : 1
                            }
                          >
                            {stock.openingStock || "0"}
                          </td>
                          <td
                            rowSpan={
                              stock.pageRanges ? stock.pageRanges.length + 1 : 1
                            }
                          >
                            {stock.addedStock || "0"}
                          </td>
                          <td
                            rowSpan={
                              stock.pageRanges ? stock.pageRanges.length + 1 : 1
                            }
                          >
                            {stock.closingStock || "0"}
                          </td>
                          {!stock.pageRanges && (
                            <>
                              <td></td>
                              <td>{stock.sold || "0"}</td>
                              <td>₹{stock.amount}</td>
                              <td>
                                ₹
                                {(Number(stock.sold) || 0) *
                                  (Number(stock.amount) || 0)}
                              </td>
                            </>
                          )}
                        </tr>
                        {stock.pageRanges &&
                          stock.pageRanges.map((range, rangeIndex) => (
                            <tr key={`${stock.id}-${rangeIndex}`}>
                              <td>{range.range}</td>
                              <td>{range.sold || "0"}</td>
                              <td>₹{range.price}</td>
                              <td>
                                ₹{(Number(range.sold) || 0) * range.price}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    ))}
                    <tr className="stock-total-row">
                      <td colSpan="9">Grand Total:</td>
                      <td className="stock-grand-total">
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="stock-pagination">
                <button
                  onClick={previousPage}
                  disabled={currentPage === 1}
                  className="stock-pagination-button"
                >
                  <FaRegArrowAltCircleLeft />
                </button>
                <span className="stock-page-info">
                  {currentPage} of {Math.ceil(stocks.length / stocksPerPage)}
                </span>
                <button
                  onClick={nextPage}
                  disabled={
                    currentPage === Math.ceil(stocks.length / stocksPerPage)
                  }
                  className="stock-pagination-button"
                >
                  <FaRegArrowAltCircleRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="stock-select-date-message">
          <p>Please select a branch and date to view stock revenue data</p>
        </div>
      )}
    </div>
  );
};

export default AdminStockReadingsRevenue;
