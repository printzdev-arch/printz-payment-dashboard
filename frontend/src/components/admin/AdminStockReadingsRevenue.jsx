import React, { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import {
  Building2,
  Calendar,
  FileDown,
  Package,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Search,
  X,
} from "lucide-react";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/dailyStockRevenue.css";
import "../../styles/stocklist.css";
import jsPDF from "jspdf";
import "jspdf-autotable";
import BranchSelect from "../common/BranchSelect.jsx";
import CalendarSelect from "../common/CalendarSelect.jsx";
import Popup from "../common/Popup.jsx";
import { usePopup } from "../../hooks/usePopup";
import Pagination from "../common/Pagination.jsx";

const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return "₹0";
  const val = Number(amount).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
  return `₹${val}`;
};

const AdminStockReadingsRevenue = () => {
  const { popup, showSuccess, showError } = usePopup();
  const [stocks, setStocks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [date, setDate] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branches, setBranches] = useState([]);
  const [userId, setUserId] = useState(null);
  const [docId, setDocId] = useState("");
  const [isExistingDoc, setIsExistingDoc] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);
  const [stocksPerPage, setStocksPerPage] = useState(10);
  const [pageInput, setPageInput] = useState("1");
  const [itemsPerPageInput, setItemsPerPageInput] = useState("10");

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    setItemsPerPageInput(String(stocksPerPage));
  }, [stocksPerPage]);

  const handlePageInputChange = (val) => {
    setPageInput(val);
  };

  const handlePageInputSubmit = () => {
    const pageNum = Number.parseInt(pageInput, 10);
    if (!Number.isNaN(pageNum)) {
      const clamped = Math.max(1, Math.min(pageNum, totalPages || 1));
      setCurrentPage(clamped);
      setPageInput(String(clamped));
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleItemsPerPageChange = (val) => {
    setItemsPerPageInput(val);
    const num = Number.parseInt(val, 10);
    if (!Number.isNaN(num) && num > 0) {
      setStocksPerPage(num);
      setCurrentPage(1);
    }
  };

  const handleItemsPerPageBlur = () => {
    const num = Number.parseInt(itemsPerPageInput, 10);
    if (Number.isNaN(num) || num <= 0) {
      setStocksPerPage(10);
      setItemsPerPageInput("10");
      setCurrentPage(1);
    }
  };

  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoadingStocks(true);
      try {
        const res = await api.get("/branches");
        const uniqueBranches = [
          ...new Set((res.data?.data || []).map((b) => b.name)),
        ].filter(Boolean);

        const sortedBranches = uniqueBranches.sort((a, b) => {
          const nameA = a.trim().toLowerCase();
          const nameB = b.trim().toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });

        setBranches(sortedBranches);
      } catch (error) {
        console.error("Error fetching branches:", error);
        showError(
          "Error Loading Branches",
          "Failed to fetch branches. Please refresh the page and try again."
        );
      } finally {
        setIsLoadingStocks(false);
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
        const res = await api.get("/stocks/items", {
          params: { branchName },
        });

        const fetchedStocks = (res.data?.data || []).map((stockData) => ({
          id: stockData._id || stockData.id,
          stockId: stockData.stockId || "",
          itemName: stockData.itemName,
          amount: stockData.amount,
          category: stockData.category,
          openingStock: "",
          addedStock: "",
          closingStock: "",
          sold: "",
          pageRanges: stockData.pageRanges || null,
        }));

        setStocks(fetchedStocks);
      } catch (error) {
        showError(
          "Error Loading Stocks",
          `Error fetching stocks: ${error.message}. Please try again.`
        );
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
        const res = await api.get("/stocks/readings", {
          params: { branchName, date },
        });
        const existingData = res.data?.data?.[0];

        if (existingData) {
          setDocId(existingData._id || existingData.id);
          setIsExistingDoc(true);

          setStocks((prevStocks) =>
            prevStocks.map((stock) => {
              const existingStock = existingData.stocks?.find(
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
          setDocId("");
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
        showError(
          "Error Loading Data",
          `Error fetching data: ${error.message}. Please check your connection and try again.`
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [date, branchName, stocks.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return stocks;
    const q = searchQuery.toLowerCase().trim();
    return stocks.filter((stock) => {
      const nameMatch = stock.itemName?.toLowerCase().includes(q);
      const categoryMatch = stock.category?.toLowerCase().includes(q);
      const idMatch = stock.stockId && stock.stockId.toLowerCase().includes(q);
      return Boolean(nameMatch || categoryMatch || idMatch);
    });
  }, [stocks, searchQuery]);

  const indexOfLastStock = currentPage * stocksPerPage;
  const indexOfFirstStock = indexOfLastStock - stocksPerPage;
  const currentStocks = filteredStocks.slice(indexOfFirstStock, indexOfLastStock);
  const totalPages = Math.max(1, Math.ceil(filteredStocks.length / stocksPerPage));

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const calculateTotalAmount = () => {
    const listToSum = searchQuery.trim() ? filteredStocks : stocks;
    return listToSum.reduce((total, stock) => {
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

  const calculateTotalUnitsSold = () => {
    const listToSum = searchQuery.trim() ? filteredStocks : stocks;
    return listToSum.reduce((total, stock) => {
      if (stock.pageRanges && stock.pageRanges.length > 0) {
        const rangesTotal = stock.pageRanges.reduce(
          (sum, range) => sum + (Number(range.sold) || 0),
          0
        );
        return total + rangesTotal;
      } else {
        return total + (Number(stock.sold) || 0);
      }
    }, 0);
  };

  const totalAmount = useMemo(() => calculateTotalAmount(), [filteredStocks, stocks, searchQuery]);
  const totalUnitsSold = useMemo(() => calculateTotalUnitsSold(), [filteredStocks, stocks, searchQuery]);

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
      showError(
        "Missing Information",
        "Please select a branch and date first before generating PDF"
      );
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
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 38 },
          2: { cellWidth: 18 },
          3: { cellWidth: 15, halign: "center" },
          4: { cellWidth: 15, halign: "center" },
          5: { cellWidth: 15, halign: "center" },
          6: { cellWidth: 24 },
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
      showSuccess(
        "PDF Generated",
        "Stock readings PDF generated successfully!"
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      showError(
        "PDF Generation Failed",
        `Failed to generate PDF: ${error.message}. Please try again.`
      );
    }
  };

  if (isLoadingStocks && branches.length === 0) {
    return (
      <div className="revenue-page-container">
        <div className="revenue-loading-box">
          <div className="revenue-loading-spinner"></div>
          <p>Loading branches...</p>
        </div>
      </div>
    );
  }

  if (isLoadingStocks && branchName) {
    return (
      <div className="revenue-page-container">
        <div className="revenue-loading-box">
          <div className="revenue-loading-spinner"></div>
          <p>Loading stock items for {branchName}...</p>
        </div>
      </div>
    );
  }

  if (stocks.length === 0 && branchName) {
    return (
      <div className="revenue-page-container">
        <Popup {...popup} />
        {/* Header Banner */}
        <div className="printz-header-banner-full">
          <div className="printz-header-title-area">
            <h1>
              Stock Readings{" "}
              <span className="highlight" style={{ color: "#059669" }}>
                Revenue
              </span>
            </h1>
            <p>
              Track inventory movements, consumption, sales, and total revenue
              per branch.
            </p>
          </div>
        </div>

        {/* Filter Card */}
        <div className="revenue-filter-card">
          <div className="revenue-filter-header">
            <div className="revenue-filter-header-left">
              <div className="revenue-filter-icon">
                <Boxes size={18} color="#059669" />
              </div>
              <div>
                <h3 className="revenue-filter-title">Filter Selection</h3>
              </div>
            </div>
          </div>

          <div className="revenue-filter-grid">
            <div className="revenue-filter-field">
              <label htmlFor="branch-select">Select Branch</label>
              <BranchSelect
                id="branch-select"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                branches={branches}
                placeholder="Select a branch"
                allowAll={true}
                allOptionLabel="Select a branch"
              />
            </div>

            <div className="revenue-filter-field">
              <label htmlFor="reading-date">Select Date</label>
              <CalendarSelect
                id="reading-date"
                selected={date ? new Date(date) : null}
                onChange={handleDateChange}
                dateFormat="yyyy-MM-dd"
                required
                placeholder="Select date (YYYY-MM-DD)"
                triggerStyle={{ height: "42px" }}
              />
            </div>
          </div>
        </div>

        <div className="revenue-prompt-state">
          <Package size={36} color="#94a3b8" />
          <h3>No Stock Items Found</h3>
          <p>
            No stock items have been added for branch: <strong>{branchName}</strong>.
            Please add stock items first using the Add Stock feature.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !stocks.length) {
    return (
      <div className="revenue-page-container">
        <div className="revenue-loading-box">
          <div className="revenue-loading-spinner"></div>
          <p>Loading stock data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="revenue-page-container">
      <Popup {...popup} />

      {/* Header Banner - Full Width Green Gradient Banner (No Illustration) */}
      <div className="printz-header-banner-full">
        <div className="printz-header-title-area">
          <h1>
            Stock Readings{" "}
            <span className="highlight" style={{ color: "#059669" }}>
              Revenue
            </span>
          </h1>
          <p>
            Track stock consumption, sales, and generated revenue for selected
            branch and date.
          </p>
        </div>

        {date && branchName && (
          <div>
            <button
              type="button"
              onClick={generatePDF}
              className="printz-btn-primary"
              disabled={isLoading}
              style={{
                padding: "9px 20px",
                fontSize: "13.5px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "10px",
                background: isLoading ? "#94a3b8" : "#059669",
                color: "#ffffff",
                border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
                boxShadow: isLoading
                  ? "none"
                  : "0 4px 12px rgba(5, 150, 105, 0.35)",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              <FileDown size={16} /> Download PDF
            </button>
          </div>
        )}
      </div>

      {/* Filter Card */}
      <div className="revenue-filter-card">
        <div className="revenue-filter-header">
          <div className="revenue-filter-header-left">
            <div className="revenue-filter-icon">
              <Boxes size={18} color="#059669" />
            </div>
            <div>
              <h3 className="revenue-filter-title">Filter Selection</h3>
            </div>
          </div>
        </div>

        <div className="revenue-filter-grid">
          <div className="revenue-filter-field">
            <label htmlFor="branch-select-monthly">Select Branch</label>
            <BranchSelect
              id="branch-select-monthly"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              branches={branches}
              placeholder="Select a branch"
              allowAll={true}
              allOptionLabel="Select a branch"
            />
          </div>

          <div className="revenue-filter-field">
            <label htmlFor="reading-date-monthly">Select Date</label>
            <CalendarSelect
              id="reading-date-monthly"
              selected={date ? new Date(date) : null}
              onChange={handleDateChange}
              dateFormat="yyyy-MM-dd"
              required
              placeholder="Select date (YYYY-MM-DD)"
              triggerStyle={{ height: "42px" }}
            />
          </div>
        </div>
      </div>

      {/* Data Content View */}
      {date && branchName ? (
        <div className="revenue-card">
          <div className="revenue-card-header">
            <div className="revenue-card-header-left">
              <Package size={18} color="#059669" />
              <h3 className="revenue-card-title" style={{ color: "#059669" }}>
                Stock Items — {branchName}
              </h3>
            </div>

            <div className="revenue-card-search-wrap">
              <Search size={15} className="revenue-search-icon" />
              <input
                type="text"
                placeholder="Search by item, stock ID, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="revenue-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="revenue-search-clear"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="revenue-card-header-right">
              {isExistingDoc && (
                <span className="revenue-badge-available">
                  <CheckCircle2 size={13} /> Revenue Data Available
                </span>
              )}
            </div>
          </div>

          <div className="revenue-table-wrapper">
            <table className="revenue-modern-table revenue-stock-table">
              <thead>
                <tr>
                  <th rowSpan="2" className="center th-sno">
                    S.No
                  </th>
                  <th rowSpan="2" className="th-item">
                    Items
                  </th>
                  <th rowSpan="2" className="center th-category">
                    Category
                  </th>
                  <th rowSpan="2" className="center th-stock">
                    Opening Stock
                  </th>
                  <th rowSpan="2" className="center th-stock">
                    Added Stock
                  </th>
                  <th rowSpan="2" className="center th-stock">
                    Closing Stock
                  </th>
                  <th colSpan="2" className="center th-sold-group">
                    Sold
                  </th>
                  <th rowSpan="2" className="right th-price">
                    Unit Price (₹)
                  </th>
                  <th rowSpan="2" className="right th-amount">
                    Amount (₹)
                  </th>
                </tr>
                <tr>
                  <th className="center th-sub-header">Pages</th>
                  <th className="center th-sub-header">Qty</th>
                </tr>
              </thead>
              <tbody>
                {currentStocks.length === 0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="center"
                      style={{ padding: "36px 16px", color: "#64748b" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Search size={26} color="#94a3b8" />
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "#334155",
                          }}
                        >
                          No stock items match "{searchQuery}"
                        </span>
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          style={{
                            padding: "5px 14px",
                            fontSize: "12px",
                            fontWeight: 600,
                            borderRadius: "6px",
                            border: "1px solid #d1fae5",
                            background: "#ecfdf5",
                            color: "#047857",
                            cursor: "pointer",
                            marginTop: "4px",
                          }}
                        >
                          Clear Search
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentStocks.map((stock, index) => {
                  const hasPageRanges = Boolean(
                    stock.pageRanges && stock.pageRanges.length > 0
                  );
                  const rowSpan = hasPageRanges ? stock.pageRanges.length : 1;
                  const closingStockNum = Number(stock.closingStock);
                  const hasClosingVal =
                    stock.closingStock !== "" &&
                    stock.closingStock !== null &&
                    stock.closingStock !== undefined &&
                    !isNaN(closingStockNum);
                  const closingBadgeClass = !hasClosingVal
                    ? ""
                    : closingStockNum === 0
                    ? "zero-stock"
                    : closingStockNum <= 5
                    ? "low-stock"
                    : "in-stock";

                  const firstRange = hasPageRanges
                    ? stock.pageRanges[0]
                    : null;
                  const firstSoldQty = hasPageRanges
                    ? Number(firstRange?.sold) || 0
                    : Number(stock.sold) || 0;
                  const firstUnitPrice = hasPageRanges
                    ? Number(firstRange?.price) || 0
                    : Number(stock.amount) || 0;
                  const firstAmount = firstSoldQty * firstUnitPrice;

                  return (
                    <React.Fragment key={stock.id || index}>
                      <tr>
                        <td rowSpan={rowSpan} className="center td-sno">
                          {indexOfFirstStock + index + 1}
                        </td>
                        <td rowSpan={rowSpan} className="td-item">
                          <div className="revenue-stock-item-info">
                            <span className="revenue-stock-item-name">
                              {stock.itemName}
                            </span>
                            {stock.stockId &&
                              stock.stockId !== stock.itemName && (
                                <span className="revenue-stock-id-tag">
                                  {stock.stockId}
                                </span>
                              )}
                          </div>
                        </td>
                        <td rowSpan={rowSpan} className="center td-category">
                          <span className="revenue-category-chip">
                            {stock.category || "General"}
                          </span>
                        </td>
                        <td rowSpan={rowSpan} className="center td-num">
                          <span
                            className={
                              !stock.openingStock ||
                              Number(stock.openingStock) === 0
                                ? "revenue-num-muted"
                                : "revenue-num-val"
                            }
                          >
                            {stock.openingStock !== "" &&
                            stock.openingStock !== null &&
                            stock.openingStock !== undefined
                              ? stock.openingStock
                              : "—"}
                          </span>
                        </td>
                        <td rowSpan={rowSpan} className="center td-num">
                          <span
                            className={
                              !stock.addedStock ||
                              Number(stock.addedStock) === 0
                                ? "revenue-num-muted"
                                : "revenue-num-val"
                            }
                          >
                            {stock.addedStock !== "" &&
                            stock.addedStock !== null &&
                            stock.addedStock !== undefined
                              ? stock.addedStock
                              : "—"}
                          </span>
                        </td>
                        <td
                          rowSpan={rowSpan}
                          className="center td-stock-badge"
                        >
                          {hasClosingVal ? (
                            <span
                              className={`stock-qty-badge ${closingBadgeClass}`}
                            >
                              {stock.closingStock}
                            </span>
                          ) : (
                            <span className="revenue-num-muted">—</span>
                          )}
                        </td>

                        {/* Sold Pages */}
                        <td className="center td-pages">
                          {hasPageRanges ? (
                            <span className="stock-pages-text">
                              {firstRange.range}
                            </span>
                          ) : (
                            <span className="stock-pages-dash">—</span>
                          )}
                        </td>

                        {/* Sold Qty */}
                        <td className="center td-sold-qty">
                          <span
                            className={
                              firstSoldQty > 0
                                ? "revenue-sold-positive"
                                : "revenue-sold-zero"
                            }
                          >
                            {firstSoldQty}
                          </span>
                        </td>

                        {/* Unit Price */}
                        <td className="right td-price">
                          {formatCurrency(firstUnitPrice)}
                        </td>

                        {/* Amount */}
                        <td className="right td-amount">
                          <span
                            className={
                              firstAmount > 0
                                ? "revenue-amount-positive"
                                : "revenue-amount-zero"
                            }
                          >
                            {formatCurrency(firstAmount)}
                          </span>
                        </td>
                      </tr>

                      {/* Subsequent page ranges */}
                      {hasPageRanges &&
                        stock.pageRanges
                          .slice(1)
                          .map((range, rangeIndex) => {
                            const rangeQty = Number(range.sold) || 0;
                            const rangePrice = Number(range.price) || 0;
                            const rangeAmount = rangeQty * rangePrice;

                            return (
                              <tr
                                key={`${stock.id || index}-${rangeIndex + 1}`}
                              >
                                <td className="center td-pages">
                                  <span className="stock-pages-text">
                                    {range.range}
                                  </span>
                                </td>
                                <td className="center td-sold-qty">
                                  <span
                                    className={
                                      rangeQty > 0
                                        ? "revenue-sold-positive"
                                        : "revenue-sold-zero"
                                    }
                                  >
                                    {rangeQty}
                                  </span>
                                </td>
                                <td className="right td-price">
                                  {formatCurrency(rangePrice)}
                                </td>
                                <td className="right td-amount">
                                  <span
                                    className={
                                      rangeAmount > 0
                                        ? "revenue-amount-positive"
                                        : "revenue-amount-zero"
                                    }
                                  >
                                    {formatCurrency(rangeAmount)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                    </React.Fragment>
                  );
                })
              )}

                {/* Grand Total Row */}
                <tr className="revenue-table-total-row">
                  <td colSpan="7" className="total-label-cell">
                    Grand Total Revenue:
                  </td>
                  <td className="center total-qty-cell">
                    <span className="total-sold-pill">
                      {totalUnitsSold} units
                    </span>
                  </td>
                  <td></td>
                  <td className="right total-amount-cell">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Standard Pagination Bar */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredStocks.length}
            itemsPerPage={stocksPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => {
              setStocksPerPage(val);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 20, 50, 100]}
            itemLabel="items"
          />
        </div>
      ) : (
        <div className="revenue-prompt-state">
          <Calendar size={36} color="#94a3b8" />
          <h3>Select Branch & Date</h3>
          <p>
            Please choose a branch and date above to view stock consumption,
            sales, and revenue calculations.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminStockReadingsRevenue;
