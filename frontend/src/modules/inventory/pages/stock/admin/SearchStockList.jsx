import React, { useState, useEffect } from "react";
import { getBranches, getStockReadings } from "../../../api";
import {
  Building2,
  Calendar,
  FileDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Package,
} from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../../../../shared/styles/printzTheme.css";
import "../../../styles/stocklist.css";
import jsPDF from "jspdf";
import autoTable, { applyPlugin } from "jspdf-autotable";
import DataTable from "../../../../../shared/ui/DataTable/DataTable";
import BranchSelect from "../../../../../shared/ui/selects/BranchSelect.jsx";
import CalendarSelect from "../../../../../shared/ui/selects/CalendarSelect.jsx";

try {
  applyPlugin(jsPDF);
} catch (e) { }

const SearchStockList = () => {
  const [stocks, setStocks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [date, setDate] = useState("");
  const [branches, setBranches] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
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

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await getBranches();
        const branchNames = [
          ...new Set((response.data?.data || []).map((b) => b.name)),
        ].filter(Boolean);
        branchNames.sort((a, b) => a.localeCompare(b));
        setBranches(branchNames);
      } catch (error) {
        toast.error("Failed to fetch branch names: " + error.message);
      }
    };

    fetchBranches();
  }, []);

  useEffect(() => {
    if (!date || !branchName) {
      setStocks([]);
      setHasData(false);
      return;
    }

    setIsLoading(true);
    const fetchReadings = async () => {
      try {
        const res = await getStockReadings({
          params: { branchName, date },
        });
        const docData = res.data?.data?.[0];
        if (docData) {
          setStocks(docData.stocks || []);
          setHasData(true);
        } else {
          setStocks([]);
          setHasData(false);
        }
        setIsLoading(false);
      } catch (error) {
        toast.error("Error loading stock readings: " + error.message);
        setIsLoading(false);
      }
    };

    fetchReadings();
  }, [date, branchName]);

  const indexOfLastStock = currentPage * stocksPerPage;
  const indexOfFirstStock = indexOfLastStock - stocksPerPage;
  const currentStocks = stocks.slice(indexOfFirstStock, indexOfLastStock);
  const totalPages = Math.ceil(stocks.length / stocksPerPage);

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
    return stocks.reduce((total, stock) => {
      if (stock.pageRanges) {
        const rangesTotal = stock.pageRanges.reduce(
          (sum, range) => sum + (Number(range.sold) || 0) * (Number(range.price) || 0),
          0
        );
        return total + rangesTotal;
      } else {
        return (
          total +
          (Number(stock.sold) || 0) * (Number(stock.amount) || 0)
        );
      }
    }, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const generatePDF = async () => {
    if (!date || !branchName) {
      toast.error("Please select a branch and date first");
      return;
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.width;
      let yPosition = 15;

      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(5, 150, 105);
      pdf.text(branchName.toUpperCase(), pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 8;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `Date: ${new Date(date).toLocaleDateString()}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 15;

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text("DAILY STOCK READINGS & REVENUE", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

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
              `₹${range.price}`,
              `₹${(Number(range.sold) || 0) * (Number(range.price) || 0)}`,
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
            `₹${stock.amount}`,
            `₹${(Number(stock.sold) || 0) * (Number(stock.amount) || 0)}`,
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
        `₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      ]);

      const tableConfig = {
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
          fillColor: [5, 150, 105],
          textColor: 255,
          fontSize: 8,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
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
            data.cell.styles.fillColor = [5, 150, 105];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = "bold";
          }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 },
      };

      if (typeof pdf.autoTable === "function") {
        pdf.autoTable(tableConfig);
      } else {
        autoTable(pdf, tableConfig);
      }

      const formattedDate = date.split("-").reverse().join("-");
      pdf.save(`Stock_Readings_${branchName}_${formattedDate}.pdf`);
      toast.success("PDF downloaded successfully!!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF: " + error.message);
    }
  };

  const totalAmount = calculateTotalAmount();

  if (isLoading) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Loading stock readings...</p>
      </div>
    );
  }

  return (
    <div className="stock-page-container">

      {/* Full Header Banner - Green gradient banner without illustration */}
      <div
        className="printz-header-banner-full"
        style={{
          width: "100%",
          background:
            "linear-gradient(90deg, #E8FAF2 0%, #F0FFF9 50%, #E8FAF2 100%)",
          border: "1px solid #dcfce7",
          borderRadius: "16px",
          padding: "12px 24px",
          marginBottom: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
        }}
      >
        <div className="printz-header-title-area">
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
            Search{" "}
            <span className="highlight" style={{ color: "#059669" }}>
              Stock
            </span>
          </h1>
          
        </div>

        {date && branchName && hasData && (
          <div style={{ flexShrink: 0 }}>
            <button
              type="button"
              className="printz-btn-primary"
              onClick={generatePDF}
              style={{
                padding: "9px 20px",
                fontSize: "13.5px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(3, 174, 121, 0.35)",
                whiteSpace: "nowrap",
              }}
            >
              <FileDown size={15} />
              <span>Download PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Card: Branch & Date */}
      <div className="stock-filter-card">
        {/* Branch Selector */}
        <div className="stock-filter-group">
          <BranchSelect
            id="branch-select"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            branches={branches}
            placeholder="Select Branch"
            allowAll={true}
            allOptionLabel="Select Branch"
          />
        </div>

        {/* Date Selector */}
        <div className="stock-filter-group">
          <CalendarSelect
            id="stock-reading-date"
            value={date}
            onChange={(d, formatted, e) => setDate(e?.target?.value || formatted || "")}
            dateFormat="yyyy-MM-dd"
            placeholder="Select Date"
            required
          />
        </div>
      </div>

      {/* Table or Empty Prompt States */}
      {date && branchName ? (
        hasData ? (
          <div className="stock-card">
            {/* Card Header & Revenue Total */}
            <div className="stock-card-header">
              <h3 className="stock-card-title">
                <Package size={20} color="#059669" />
                <span>
                  Stock Readings ({stocks.length} items) - View Only
                </span>
              </h3>

              <div className="stock-total-badge">
                <span>Total Revenue:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Table */}
            <DataTable mobileCards
              searchable={false}
              data={stocks}
              pageSize={stocksPerPage}
              pageSizeOptions={[10, 20, 50, 100]}
              summaryRow={{
                itemName: "Grand Total Revenue:",
                amount: formatCurrency(totalAmount),
              }}
              columns={(() => {
                const tiers = (stock) => (stock.pageRanges && Array.isArray(stock.pageRanges) && stock.pageRanges.length > 0 ? stock.pageRanges : null);
                const stack = { display: "flex", flexDirection: "column", gap: "6px" };
                return [
                  { key: "sno", label: "S.No", width: "50px", align: "center", render: (stock, index) => index + 1 },
                  { key: "itemName", label: "Items", render: (stock) => <span style={{ fontWeight: 600 }}>{stock.itemName}</span> },
                  {
                    key: "category",
                    label: "Category",
                    render: (stock) => <span className="stock-category-chip">{stock.category || "General"}</span>,
                  },
                  { key: "openingStock", label: "Opening Stock", align: "center", render: (stock) => stock.openingStock || "N/A" },
                  { key: "addedStock", label: "Added Stock", align: "center", render: (stock) => stock.addedStock || "N/A" },
                  {
                    key: "closingStock",
                    label: "Closing Stock",
                    align: "center",
                    render: (stock) => (
                      <span
                        className={`stock-qty-badge ${
                          Number(stock.closingStock) === 0 ? "zero-stock" : Number(stock.closingStock) < 5 ? "low-stock" : "in-stock"
                        }`}
                      >
                        {stock.closingStock || 0}
                      </span>
                    ),
                  },
                  {
                    key: "pages",
                    label: "Sold (Pages)",
                    render: (stock) =>
                      tiers(stock) ? (
                        <div style={stack}>
                          {tiers(stock).map((r, i) => (
                            <span key={i}>{r.range || "-"}</span>
                          ))}
                        </div>
                      ) : (
                        "Standard"
                      ),
                  },
                  {
                    key: "soldQty",
                    label: "Sold (Qty)",
                    align: "center",
                    render: (stock) => (
                      <div style={stack}>
                        {(tiers(stock) ? tiers(stock).map((r) => r.sold || 0) : [stock.sold || 0]).map((q, i) => (
                          <span key={i} style={{ fontWeight: 600 }}>{q}</span>
                        ))}
                      </div>
                    ),
                  },
                  {
                    key: "unitPrice",
                    label: "Unit Price (₹)",
                    render: (stock) => (
                      <div style={stack}>
                        {(tiers(stock) ? tiers(stock).map((r) => r.price || 0) : [stock.amount]).map((pr, i) => (
                          <span key={i} className="stock-price-text">₹{pr}</span>
                        ))}
                      </div>
                    ),
                  },
                  {
                    key: "amount",
                    label: "Amount (₹)",
                    align: "right",
                    render: (stock) => (
                      <div style={stack}>
                        {(tiers(stock)
                          ? tiers(stock).map((r) => (Number(r.sold) || 0) * Number(r.price || 0))
                          : [(Number(stock.sold) || 0) * (Number(stock.amount) || 0)]
                        ).map((v, i) => (
                          <span key={i} style={{ fontWeight: 700, color: "#059669" }}>{formatCurrency(v)}</span>
                        ))}
                      </div>
                    ),
                  },
                ];
              })()}
            />
          </div>
        ) : (
          <div className="stock-empty-card">
            <AlertCircle size={48} color="#d97706" />
            <h4 className="stock-empty-title">No Stock Readings Found</h4>
            <p className="stock-empty-desc">
              No daily readings or revenue data was recorded for{" "}
              <strong>"{branchName}"</strong> on{" "}
              <strong>{new Date(date).toLocaleDateString()}</strong>.
            </p>
          </div>
        )
      ) : (
        <div className="stock-empty-card">
          <Calendar size={48} color="#94a3b8" />
          <h4 className="stock-empty-title">Select Branch and Date</h4>
          <p className="stock-empty-desc">
            Please choose a branch location and reading date from the controls
            above to view stock consumption and revenue records.
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchStockList;
