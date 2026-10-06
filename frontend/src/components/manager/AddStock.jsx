import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Package,
  Layers,
  Building2,
  Hash,
  Tag,
  Barcode,
  FileText,
  IndianRupee,
  RotateCcw,
  Plus,
  Minus,
  Download,
  Upload,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Check,
  TableProperties,
} from "lucide-react";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/printzTheme.css";
import "../../styles/addstock.css";
import Popup from "../common/Popup";
import BranchSelect from "../common/BranchSelect.jsx";
import { usePopup } from "../../hooks/usePopup";
import { ToastContainer } from "react-toastify";
import { AddStockIllustration } from "../illustrations";
import Pagination from "../common/Pagination";

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

const AddStock = () => {
  // Removed unused branchName local state (selectedBranch already holds it)
  const [itemName, setItemName] = useState("");
  const [stockId, setStockId] = useState("");
  const [amount, setAmount] = useState("");
  const [qty, setQty] = useState("");
  const [userId, setUserId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [hasPageRanges, setHasPageRanges] = useState(false);
  const [pageRanges, setPageRanges] = useState([{ range: "", price: "" }]);
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [stockItems, setStockItems] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [suggestedStockId, setSuggestedStockId] = useState("STK001");
  const [stockIdStatus, setStockIdStatus] = useState("");
  const [idMessage, setIdMessage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);

  const { popup, showSuccess, showError, showInfo } = usePopup();

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

      if (sortedBranches.length > 0 && !selectedBranch) {
        setSelectedBranch(sortedBranches[0].name);
        // Ensure userId is also initialized for the default branch selection
        setUserId(sortedBranches[0].id);
      }
    } catch (error) {
      showError("Failed to fetch branch names: " + (error.response?.data?.message || error.message));
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/general/categories");
      const categoryData = (res.data?.data || []).map((doc) => ({
        id: doc.categoryId || doc.id || doc._id,
        name: doc.categoryName || doc.name,
      }));

      // Separate "OTHERS" from the rest of the categories
      const othersCategory = categoryData.find(
        (cat) => cat.name.toUpperCase() === "OTHERS"
      );
      const otherCategories = categoryData.filter(
        (cat) => cat.name.toUpperCase() !== "OTHERS"
      );

      // Sort the rest of the categories alphabetically
      otherCategories.sort((a, b) => a.name.localeCompare(b.name));

      // Append "OTHERS" to the end of the sorted list if it exists
      if (othersCategory) {
        otherCategories.push(othersCategory);
      }

      setCategories(otherCategories);
    } catch (error) {
      showError("Failed to fetch categories: " + (error.response?.data?.message || error.message));
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedBranch) {
      fetchStockItems();
    } else {
      setStockItems([]);
    }
  }, [selectedBranch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep userId synchronized with selectedBranch even when it's auto-selected
  useEffect(() => {
    if (!selectedBranch || branches.length === 0) return;
    const selected = branches.find((b) => b.name === selectedBranch);
    if (selected && selected.id !== userId) {
      setUserId(selected.id);
    }
  }, [selectedBranch, branches, userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkStockIdAvailability();
    }, 500);

    return () => clearTimeout(timer);
  }, [stockId, selectedBranch]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkStockIdAvailability = async () => {
    if (!stockId || !selectedBranch) {
      setIdMessage("");
      setStockIdStatus("");
      return;
    }

    try {
      const trimmedStockId = stockId.trim().toUpperCase();
      const res = await api.get("/stocks/items", {
        params: { stockId: trimmedStockId },
      });
      const rawExisting = res.data?.data || [];
      const existing = rawExisting.filter(
        (stock) => (stock.stockId || "").trim().toUpperCase() === trimmedStockId
      );

      if (existing.length === 0) {
        setIdMessage("New Stock ID");
        setStockIdStatus("new");
      } else {
        const branchLower = selectedBranch.trim().toLowerCase();
        const inThisBranch = existing.find(
          (stock) =>
            (stock.branchName && stock.branchName.trim().toLowerCase() === branchLower) ||
            (stock.branch && stock.branch.trim().toLowerCase() === branchLower)
        );
        if (inThisBranch) {
          setIdMessage("Stock ID already exists in this branch");
          setStockIdStatus("duplicate");
        } else {
          const otherBranch = existing[0].branchName || existing[0].branch || "another branch";
          setIdMessage(
            `Stock ID exists in other branch: "${otherBranch}"`
          );
          setStockIdStatus("exists_other");
        }
      }
    } catch (error) {
      showError("Error checking stock ID availability: " + (error.response?.data?.message || error.message));
    }
  };

  const fetchStockItems = async () => {
    if (!selectedBranch) return;

    setLoadingStocks(true);
    try {
      const res = await api.get("/stocks/items", {
        params: { branchName: selectedBranch },
      });
      const stocksData = (res.data?.data || []).map((doc) => ({
        id: doc.id || doc._id,
        ...doc,
      }));
      const sortedStocks = stocksData.sort((a, b) =>
        (a.stockId || "").localeCompare(b.stockId || "")
      );
      setStockItems(sortedStocks);

      let prefix = "STK";
      let padLength = 3;
      let maxNum = 0;
      if (sortedStocks.length > 0) {
        sortedStocks.forEach((item) => {
          const match = (item.stockId || "").match(/^([A-Z-]+)(\d+)$/);
          if (match) {
            const p = match[1];
            const num = parseInt(match[2]);
            if (num > maxNum) {
              maxNum = num;
              prefix = p;
              padLength = match[2].length;
            }
          }
        });
      }
      const nextNum = maxNum + 1;
      const nextId = `${prefix}${nextNum.toString().padStart(padLength, "0")}`;
      setSuggestedStockId(nextId);
    } catch (error) {
      showError("Error fetching stock items: " + (error.response?.data?.message || error.message));
    } finally {
      setLoadingStocks(false);
    }
  };

  const handleBranchChange = (event) => {
    const selectedBranchName = event.target.value.trim();
    setSelectedBranch(selectedBranchName);

    const selectedBranch = branches.find(
      (branch) => branch.name === selectedBranchName
    );
    setUserId(selectedBranch ? selectedBranch.id : "");
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value.trim());
  };

  const handleItemNameChange = (e) => {
    setItemName(e.target.value.trim().toUpperCase());
  };

  const handleStockIdChange = (e) => {
    setStockId(e.target.value.trim().toUpperCase());
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value.trim().toUpperCase());
  };

  const handlePageRangeToggle = (e) => {
    setHasPageRanges(e.target.checked);
    if (!e.target.checked) {
      setPageRanges([{ range: "", price: "" }]);
    }
  };

  const handlePageRangeChange = (index, field, value) => {
    const updatedRanges = [...pageRanges];
    if (field === "range") {
      updatedRanges[index][field] = value.trim().toUpperCase();
    } else {
      updatedRanges[index][field] = value;
    }
    setPageRanges(updatedRanges);
  };

  const addPageRange = () => {
    setPageRanges([...pageRanges, { range: "", price: "" }]);
  };

  const removePageRange = (index) => {
    if (pageRanges.length > 1) {
      const updatedRanges = pageRanges.filter((_, i) => i !== index);
      setPageRanges(updatedRanges);
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent =
      "stockId,stockName,category,qty,price,description\nSTK001,SAMPLE STOCK ITEM,STATIONERY,10,100.50,SAMPLE DESCRIPTION\nSTK002,ANOTHER ITEM,GIFTS,25,75.00,ANOTHER SAMPLE";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "stock_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("CSV template downloaded successfully!");
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        showError("Please select a valid CSV file");
        return;
      }
      setCsvFile(file);
      parseCsvFile(file);
    }
  };

  const parsePageRangesValue = (val) => {
    if (!val) return null;
    if (Array.isArray(val)) return val;
    if (typeof val === "object") return [val];
    const trimmed = String(val).trim();
    if (!trimmed) return null;

    // Try JSON format e.g. [{"range":"1-10","price":5}]
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === "object" && parsed !== null) return [parsed];
      } catch {
        return { invalid: true, raw: val };
      }
    }

    // Try delimiter-separated formats e.g. "1-10:5|11-50:4" or "1-10:5;11-50:4"
    const delimiter = trimmed.includes("|")
      ? "|"
      : trimmed.includes(";")
      ? ";"
      : null;
    const tokens = delimiter ? trimmed.split(delimiter) : [trimmed];
    const ranges = [];

    for (const token of tokens) {
      const cleanToken = token.trim();
      if (!cleanToken) continue;

      const separatorMatch = cleanToken.match(/[:=]/);
      if (!separatorMatch) {
        return { invalid: true, raw: val };
      }
      const sepIndex = separatorMatch.index;
      const r = cleanToken.substring(0, sepIndex).trim();
      const p = cleanToken.substring(sepIndex + 1).trim();

      if (!r || p === "") {
        return { invalid: true, raw: val };
      }
      ranges.push({ range: r, price: p });
    }

    return ranges.length > 0 ? ranges : null;
  };

  const parseCsvFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split("\n");
        if (lines.length === 0 || !lines[0].trim()) {
          showError("CSV file is empty");
          setCsvFile(null);
          return;
        }

        const parseCsvLine = (lineText) => {
          const result = [];
          let cur = "";
          let inQuotes = false;
          for (let i = 0; i < lineText.length; i++) {
            const c = lineText[i];
            if (c === '"') {
              if (inQuotes && lineText[i + 1] === '"') {
                cur += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (c === "," && !inQuotes) {
              result.push(cur.trim());
              cur = "";
            } else {
              cur += c;
            }
          }
          result.push(cur.trim());
          return result;
        };

        const headers = parseCsvLine(lines[0]);

        const requiredHeaders = [
          "stockId",
          "stockName",
          "category",
          "qty",
          "price",
          "description",
        ];
        const hasAllHeaders = requiredHeaders.every((header) =>
          headers.some((h) => h.toLowerCase() === header.toLowerCase())
        );

        if (!hasAllHeaders) {
          showError(
            "CSV file must contain headers: stockId, stockName, category, qty, price, description"
          );
          setCsvFile(null);
          return;
        }

        const idIndex = headers.findIndex((h) => h.toLowerCase() === "stockid");
        const nameIndex = headers.findIndex(
          (h) => h.toLowerCase() === "stockname"
        );
        const catIndex = headers.findIndex(
          (h) => h.toLowerCase() === "category"
        );
        const qtyIndex = headers.findIndex((h) => h.toLowerCase() === "qty");
        const priceIndex = headers.findIndex((h) => h.toLowerCase() === "price");
        const descIndex = headers.findIndex(
          (h) => h.toLowerCase() === "description"
        );
        const pageRangesIndex = headers.findIndex((h) =>
          [
            "pageranges",
            "page_ranges",
            "page ranges",
            "pagerange",
            "page_range",
          ].includes(h.toLowerCase().trim())
        );

        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const values = parseCsvLine(line);
            if (values.length >= 6) {
              const parsedQty = Number.parseInt(
                values[qtyIndex !== -1 ? qtyIndex : 3]
              );
              const parsedPrice = Number.parseFloat(
                values[priceIndex !== -1 ? priceIndex : 4]
              );
              const rawPageRanges =
                pageRangesIndex !== -1 ? values[pageRangesIndex] : null;
              const parsedPageRanges = rawPageRanges
                ? parsePageRangesValue(rawPageRanges)
                : null;

              const itemObj = {
                stockId: (
                  values[idIndex !== -1 ? idIndex : 0] || ""
                ).toUpperCase(),
                stockName: (
                  values[nameIndex !== -1 ? nameIndex : 1] || ""
                ).toUpperCase(),
                category: (
                  values[catIndex !== -1 ? catIndex : 2] || ""
                ).toUpperCase(),
                qty: isNaN(parsedQty) ? 0 : parsedQty,
                price: isNaN(parsedPrice) ? 0 : parsedPrice,
                description: (
                  values[descIndex !== -1 ? descIndex : 5] || ""
                ).toUpperCase(),
              };

              if (parsedPageRanges) {
                itemObj.pageRanges = parsedPageRanges;
              }

              data.push(itemObj);
            }
          }
        }

        if (data.length === 0) {
          showError("No valid data found in CSV file");
          setCsvFile(null);
          return;
        }

        setCsvData(data);
        setShowCsvPreview(true);
        showSuccess(`CSV file parsed successfully! Found ${data.length} items`);
      } catch (error) {
        showError("Error parsing CSV file: " + error.message);
        setCsvFile(null);
      }
    };
    reader.readAsText(file);
  };

  const checkStockIdExists = async (stockId, itemName) => {
    try {
      const trimmedStockId = String(stockId || "").trim().toUpperCase();
      const trimmedItemName = String(itemName || "").trim().toLowerCase();
      const branchLower = (selectedBranch || "").trim().toLowerCase();

      const res = await api.get("/stocks/items", {
        params: { stockId: trimmedStockId },
      });
      const existingStocks = (res.data?.data || [])
        .map((doc) => ({
          id: doc.id || doc._id,
          ...doc,
        }))
        .filter((stock) => (stock.stockId || "").trim().toUpperCase() === trimmedStockId);

      if (existingStocks.length > 0) {
        // Check if a stock with the same ID already exists in THIS branch
        const existsInThisBranch = existingStocks.some(
          (stock) =>
            (stock.branchName && stock.branchName.trim().toLowerCase() === branchLower) ||
            (stock.branch && stock.branch.trim().toLowerCase() === branchLower)
        );

        const stockWithDiffName = existingStocks.find(
          (stock) => (stock.itemName || "").trim().toLowerCase() !== trimmedItemName
        );

        if (stockWithDiffName) {
          const otherBranchName = stockWithDiffName.branchName || stockWithDiffName.branch || "another branch";
          return {
            exists: true,
            match: false,
            docId: null,
            message: `Stock ID already exists with different item name: "${stockWithDiffName.itemName}" in branch "${otherBranchName}"`,
            existsInThisBranch,
          };
        }

        const exactMatch = existingStocks.find(
          (stock) =>
            (stock.itemName || "").trim().toLowerCase() === trimmedItemName &&
            ((stock.branchName && stock.branchName.trim().toLowerCase() === branchLower) ||
             (stock.branch && stock.branch.trim().toLowerCase() === branchLower))
        );

        if (exactMatch) {
          return {
            exists: true,
            match: true,
            docId: exactMatch.id,
            data: exactMatch,
            existsInThisBranch,
          };
        }

        const otherBranch = existingStocks[0].branchName || existingStocks[0].branch || "another branch";
        return {
          exists: true,
          match: false,
          docId: null,
          message: `Stock ID already exists in other branch: "${otherBranch}"`,
          existsInThisBranch,
        };
      }

      return { exists: false, match: false, docId: null, existsInThisBranch: false };
    } catch (error) {
      showError("Error checking stock ID: " + (error.response?.data?.message || error.message));
      return { exists: false, error: error.message, existsInThisBranch: false };
    }
  };

  const handleCsvUpload = async () => {
    if (!selectedBranch) {
      showError("Please select a branch first");
      return;
    }

    if (csvData.length === 0) {
      showError("No CSV data to upload");
      return;
    }

    // Derive a safe userId in case state hasn't synced yet
    const effectiveUserId =
      userId || branches.find((b) => b.name === selectedBranch)?.id || "";
    if (!effectiveUserId) {
      showError("User ID is required. Please select a branch.");
      return;
    }

    setLoading(true);

    try {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      const results = {
        created: 0,
        updated: 0,
        failed: 0,
        reasons: [],
      };

      for (const item of csvData) {
        if (!item.stockId || item.stockId.trim() === "") {
          results.failed++;
          results.reasons.push(
            `Row with stock name "${item.stockName}": Missing Stock ID`
          );
          continue;
        }

        if (!item.stockName || item.stockName.trim() === "") {
          results.failed++;
          results.reasons.push(
            `Stock ID "${item.stockId}": Missing Stock Name`
          );
          continue;
        }

        if (!item.category || item.category.trim() === "") {
          results.failed++;
          results.reasons.push(
            `Stock ID "${item.stockId}" (${item.stockName}): Missing Category`
          );
          continue;
        }

        if (
          item.qty === undefined ||
          item.qty === null ||
          isNaN(item.qty) ||
          item.qty < 0
        ) {
          results.failed++;
          results.reasons.push(
            `Stock ID "${item.stockId}" (${item.stockName}): Invalid quantity (must be 0 or greater)`
          );
          continue;
        }

        // Validate pageRanges if present on this CSV item
        let itemPageRanges = null;
        if (item.pageRanges) {
          if (item.pageRanges.invalid) {
            results.failed++;
            results.reasons.push(
              `Stock ID "${item.stockId}" (${item.stockName}): Invalid page-range format`
            );
            continue;
          }

          if (Array.isArray(item.pageRanges) && item.pageRanges.length > 0) {
            let hasRangeError = false;
            const formattedRanges = [];

            for (const r of item.pageRanges) {
              const rangeStr =
                r && r.range !== undefined && r.range !== null
                  ? String(r.range).trim()
                  : "";
              const priceNum =
                r &&
                r.price !== undefined &&
                r.price !== null &&
                String(r.price).trim() !== ""
                  ? Number(r.price)
                  : NaN;

              if (!rangeStr) {
                hasRangeError = true;
                results.failed++;
                results.reasons.push(
                  `Stock ID "${item.stockId}" (${item.stockName}): Page range cannot have empty range`
                );
                break;
              }

              if (isNaN(priceNum) || priceNum < 0) {
                hasRangeError = true;
                results.failed++;
                results.reasons.push(
                  `Stock ID "${item.stockId}" (${item.stockName}): Page range "${rangeStr}" has invalid price (must be a number >= 0)`
                );
                break;
              }

              formattedRanges.push({
                range: rangeStr,
                price: priceNum,
              });
            }

            if (hasRangeError) {
              continue;
            }

            itemPageRanges = formattedRanges;
          }
        }

        const stockCheck = await checkStockIdExists(
          item.stockId,
          item.stockName
        );

        if (stockCheck.error) {
          results.failed++;
          results.reasons.push(
            `Stock ID "${item.stockId}" (${item.stockName}): Database error - ${stockCheck.error}`
          );
          continue;
        }

        // Enforce: no duplicate stockId allowed within the SAME branch
        if (stockCheck.existsInThisBranch) {
          results.failed++;
          results.reasons.push(
            `Stock ID "${item.stockId}" (${item.stockName}): Already exists in branch "${selectedBranch}"`
          );
          continue;
        }

        // If stockId exists only in other branches, allow creation in this branch
        try {
          const hasItemRanges = Boolean(
            itemPageRanges && itemPageRanges.length > 0
          );
          const stockData = {
            userId: effectiveUserId,
            branchId: effectiveUserId,
            branchName: selectedBranch,
            itemName: item.stockName,
            category: item.category,
            amount: hasItemRanges ? 0 : Number(item.price),
            qty: Number(item.qty),
            description: item.description || "",
            stockId: item.stockId,
          };

          if (hasItemRanges) {
            stockData.pageRanges = itemPageRanges.map((range) => ({
              range: range.range,
              price: Number(range.price),
            }));
          }

          await api.post("/stocks/items", stockData);

          await api.post("/general/inventory-movements", {
            type: "stock",
            action: "add",
            stockId: item.stockId,
            itemName: item.stockName,
            category: item.category,
            quantity: Number(item.qty),
            amount: hasItemRanges ? 0 : Number(item.price),
            fromBranch: null,
            toBranch: selectedBranch,
            movementDate: new Date(),
            performedBy: currentUser?.email || "Unknown",
            details: {
              description: item.description || "",
              source: "CSV Upload",
              ...(hasItemRanges && {
                pageRanges: itemPageRanges.map((range) => ({
                  range: range.range,
                  price: Number(range.price),
                })),
              }),
            },
          }).catch(() => {});

          results.created++;
        } catch (error) {
          results.failed++;
          results.reasons.push(
            `Stock ID "${item.stockId}" (${item.stockName}): Failed to create new stock - ${error.response?.data?.message || error.message}`
          );
        }
      }

      let successMessage = "";
      if (results.created > 0) {
        successMessage += `✅ Created ${results.created} new stock items`;
      }
      if (results.updated > 0) {
        successMessage += `${successMessage ? ", " : "✅ "}Updated ${
          results.updated
        } existing items`;
      }

      if (successMessage) {
        showSuccess(successMessage);
      }

      if (results.failed > 0) {
        const failureDetails = results.reasons.join("\n• ");
        showError(
          `❌ ${results.failed} items failed to process:\n\n• ${failureDetails}`,
          "CSV Import Issues"
        );
      }

      if (results.created > 0 || results.updated > 0 || results.failed > 0) {
        const summary = `📊 CSV Import Summary:\n✅ Created: ${results.created}\n🔄 Updated: ${results.updated}\n❌ Failed: ${results.failed}\nTotal processed: ${csvData.length}`;
        showInfo(summary, "Import Complete");
      }

      handleReset();
      fetchStockItems();
    } catch (error) {
      showError("Failed to upload CSV data: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stockId) {
      showError("Stock ID is required");
      return;
    }

    setLoading(true);

    try {
      const stockCheck = await checkStockIdExists(stockId, itemName);

      // Enforce: no duplicate stockId allowed within the SAME branch
      if (stockCheck.existsInThisBranch) {
        showError(
          `Stock ID "${stockId}" already exists in branch "${selectedBranch}"`
        );
        setLoading(false);
        return;
      }

      // If it exists only in other branches, allow creation in this branch
      {
        const effectiveUserId =
          userId || branches.find((b) => b.name === selectedBranch)?.id || "";
        if (!effectiveUserId) {
          showError("User ID is required. Please select a branch.");
          setLoading(false);
          return;
        }
        const stockData = {
          userId: effectiveUserId,
          branchId: effectiveUserId,
          branchName: selectedBranch,
          itemName,
          category,
          amount: hasPageRanges ? 0 : Number(amount),
          qty: Number(qty),
          description: description || "",
          stockId: stockId,
        };

        if (hasPageRanges) {
          stockData.pageRanges = pageRanges.map((range) => ({
            range: range.range,
            price: Number(range.price),
          }));
        }

        await api.post("/stocks/items", stockData);

        const currentUser = JSON.parse(localStorage.getItem("user"));
        await api.post("/general/inventory-movements", {
          type: "stock",
          action: "add",
          stockId: stockId,
          itemName: itemName,
          category: category,
          quantity: Number(qty),
          amount: hasPageRanges ? 0 : Number(amount),
          fromBranch: null,
          toBranch: selectedBranch,
          movementDate: new Date(),
          performedBy: currentUser?.email || "Unknown",
          details: {
            description: description || "",
            ...(hasPageRanges && {
              pageRanges: pageRanges.map((range) => ({
                range: range.range,
                price: Number(range.price),
              })),
            }),
          },
        }).catch(() => {});

        showSuccess(
          `Stock item "${itemName}" has been successfully added to ${selectedBranch}. ${
            hasPageRanges ? "Page ranges have been configured." : ""
          }`,
          "Stock Added Successfully"
        );
      }

      handleReset();
      fetchStockItems();
    } catch (error) {
      showError(
        `Failed to add stock item "${itemName}". Error: ${error.response?.data?.message || error.message}. Please check your input and try again.`,
        "Stock Addition Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategorySubmit = async (e) => {
    e.preventDefault();

    const trimmedCategoryId = categoryId.trim();
    const trimmedCategoryName = categoryName.trim();

    if (!trimmedCategoryId || !trimmedCategoryName) {
      showError("Both fields are required");
      return;
    }

    setCategoryLoading(true);

    try {
      await api.post("/general/categories", {
        categoryId: trimmedCategoryId,
        categoryName: trimmedCategoryName.toUpperCase(),
      });

      // Optimistically update the categories state
      setCategories((prevCategories) => {
        const updatedCategories = [
          ...prevCategories,
          { id: trimmedCategoryId, name: trimmedCategoryName.toUpperCase() },
        ];
        // Sort and append "OTHERS" as per the original logic
        const othersCategory = updatedCategories.find(
          (cat) => cat.name.toUpperCase() === "OTHERS"
        );
        const otherCategories = updatedCategories.filter(
          (cat) => cat.name.toUpperCase() !== "OTHERS"
        );
        otherCategories.sort((a, b) => a.name.localeCompare(b.name));
        return othersCategory
          ? [...otherCategories, othersCategory]
          : otherCategories;
      });

      setCategoryLoading(false);
      handleCategoryReset();
      showSuccess("Category added successfully");
    } catch (error) {
      showError(error.response?.data?.message || error.message || "Failed to add category");
      setCategoryLoading(false);
    }
  };

  const handleCategoryReset = () => {
    setCategoryId("");
    setCategoryName("");
  };

  const handleReset = () => {
    setItemName("");
    setStockId("");
    setAmount("");
    setQty("");
    setCategory("");
    setDescription("");
    setHasPageRanges(false);
    setPageRanges([{ range: "", price: "" }]);
    setCsvFile(null);
    setCsvData([]);
    setShowCsvPreview(false);
    setSearchTerm("");
    setCurrentPage(1);
    handleCategoryReset();
  };

  const filteredStockItems = stockItems.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.stockId?.toLowerCase().includes(searchLower) ||
      item.itemName?.toLowerCase().includes(searchLower) ||
      item.category?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStockItems.length / itemsPerPage)
  );
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredStockItems.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "...",
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      "...",
      totalPages,
    ];
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const previousPage = () => {
    if (safeCurrentPage > 1) {
      setCurrentPage(safeCurrentPage - 1);
    }
  };

  const nextPage = () => {
    if (safeCurrentPage < totalPages) {
      setCurrentPage(safeCurrentPage + 1);
    }
  };

  return (
    <div className="add-stock-container">
      <ToastContainer />
      <Popup {...popup} />

      {/* Full Header Banner with light green background from left to right */}
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
          gap: "20px",
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
        }}
      >
        {/* Left Side: Title */}
        <div className="printz-header-title-area" style={{ flexShrink: 0 }}>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
            Add <span className="highlight" style={{ color: "#059669" }}>Stock</span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Add new printer stock items to your inventory easily.
          </p>
        </div>

        {/* Center / Right: Illustration Artwork (comfortable right alignment, immediately left of button) */}
        <div
          className="branch-header-illustration-wrap stock-header-illustration-wrap"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            width: "360px",
            height: "88px",
            flexShrink: 0,
            marginLeft: "auto",
            marginRight: "20px",
          }}
        >
          <AddStockIllustration height={88} width={360} />
        </div>

        {/* Far Right: Add Stock Button */}
        <div style={{ flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("item-details-card");
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="printz-btn-primary"
            style={{
              padding: "10px 22px",
              fontSize: "14px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(3, 174, 121, 0.35)",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={16} />
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      {/* Top Row: Two Cards Side-by-Side */}
      <div className="add-stock-top-grid">
        {/* Card 1: Stock Information / Bulk Upload via CSV */}
        <div className="add-stock-card">
          <div className="add-stock-card-header">
            <h3 className="add-stock-card-title">
              <Package size={17} color="#059669" />
              <span>Stock Information</span>
            </h3>
          </div>

          <div className="add-stock-bulk-box">
            <div className="add-stock-bulk-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <h4 className="add-stock-bulk-title" style={{ margin: 0 }}>
                <FileSpreadsheet size={16} color="#059669" />
                <span>Bulk Upload via CSV</span>
              </h4>
              <button
                type="button"
                onClick={downloadCsvTemplate}
                className="printz-btn-secondary"
                style={{
                  padding: "6px 14px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "8px",
                  border: "1px solid #d1fae5",
                  background: "#ecfdf5",
                  color: "#047857",
                  cursor: "pointer",
                }}
              >
                <Download size={14} />
                <span>Download CSV Template</span>
              </button>
            </div>

            <div className="add-stock-upload-row">
              <label htmlFor="csvFile" className="add-stock-upload-label">
                <Upload size={15} color="#059669" />
                <span>Upload CSV File</span>
              </label>
              <div className="add-stock-file-input-wrap">
                <input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="add-stock-file-input"
                  disabled={loading}
                />
              </div>
            </div>

            {csvFile && (
              <p style={{ fontSize: "12px", color: "#059669", fontWeight: 600, margin: 0 }}>
                Selected: {csvFile.name}
              </p>
            )}

            {showCsvPreview && csvData.length > 0 && (
              <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                  CSV Preview ({csvData.length} items)
                </div>
                <div className="add-stock-table-wrap">
                  <table className="add-stock-table">
                    <thead>
                      <tr>
                        <th className="th-center" style={{ width: "40px" }}>#</th>
                        <th>Stock ID</th>
                        <th>Stock Name</th>
                        <th>Category</th>
                        <th className="th-center">Qty</th>
                        <th>Price</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 5).map((item, index) => (
                        <tr key={index}>
                          <td className="td-center">{index + 1}</td>
                          <td className="td-mono">{item.stockId}</td>
                          <td>{item.stockName}</td>
                          <td className="td-category">{item.category}</td>
                          <td className="td-center">
                            <span className="add-stock-qty-pill">{item.qty}</span>
                          </td>
                          <td className="td-pricing">
                            {item.pageRanges &&
                            Array.isArray(item.pageRanges) &&
                            item.pageRanges.length > 0
                              ? `${item.pageRanges.length} Range${
                                  item.pageRanges.length > 1 ? "s" : ""
                                }`
                              : `₹${item.price}`}
                          </td>
                          <td>{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvData.length > 5 && (
                    <p style={{ textAlign: "center", color: "#64748b", margin: "8px 0", fontSize: "12px" }}>
                      ... and {csvData.length - 5} more items
                    </p>
                  )}
                </div>

                <div className="add-stock-btn-row">
                  <button
                    type="button"
                    onClick={handleCsvUpload}
                    className="add-stock-btn-primary"
                    disabled={loading || !selectedBranch}
                  >
                    {loading ? (
                      <>
                        <div className="stock-loading-spinner" style={{ width: "16px", height: "16px" }}></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span>Upload {csvData.length} Items</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Add New Category */}
        <div className="add-stock-card">
          <div className="add-stock-card-header">
            <h3 className="add-stock-card-title">
              <Layers size={17} color="#059669" />
              <span>Add New Category</span>
            </h3>
          </div>

          <form onSubmit={handleAddCategorySubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="add-stock-category-grid">
              <div className="add-stock-field-group">
                <label htmlFor="categoryId" className="add-stock-field-label">
                  Category ID
                </label>
                <div className="add-stock-input-wrapper">
                  <span className="add-stock-input-icon">
                    <Hash size={16} />
                  </span>
                  <input
                    id="categoryId"
                    type="text"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value.trim())}
                    className="add-stock-input-field"
                    placeholder="Enter category ID"
                    required
                    disabled={categoryLoading}
                  />
                </div>
              </div>

              <div className="add-stock-field-group">
                <label htmlFor="categoryName" className="add-stock-field-label">
                  Category Name
                </label>
                <div className="add-stock-input-wrapper">
                  <span className="add-stock-input-icon">
                    <Tag size={16} />
                  </span>
                  <input
                    id="categoryName"
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value.trim().toUpperCase())}
                    className="add-stock-input-field"
                    placeholder="Enter category name"
                    required
                    disabled={categoryLoading}
                  />
                </div>
              </div>
            </div>

            <div className="add-stock-btn-row">
              <button
                type="submit"
                className="add-stock-btn-primary"
                disabled={categoryLoading}
              >
                {categoryLoading ? (
                  <>
                    <div className="stock-loading-spinner" style={{ width: "16px", height: "16px" }}></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Add Category</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCategoryReset}
                className="add-stock-btn-secondary"
                disabled={categoryLoading}
              >
                <RotateCcw size={15} />
                <span>Reset</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Middle Card: Item Details */}
      <div className="add-stock-card" id="item-details-card">
        <div className="add-stock-card-header">
          <h3 className="add-stock-card-title">
            <Package size={17} color="#059669" />
            <span>Item Details</span>
          </h3>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="add-stock-item-grid">
            {/* Left Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Branch Name */}
              <div className="add-stock-field-group">
                <label htmlFor="branchName" className="add-stock-field-label">
                  Branch Name <span className="req">*</span>
                </label>
                <BranchSelect
                  id="branchName"
                  value={selectedBranch}
                  onChange={handleBranchChange}
                  branches={branches}
                  placeholder="Select Branch..."
                  required
                />
              </div>

              {/* Category */}
              <div className="add-stock-field-group">
                <label htmlFor="category" className="add-stock-field-label">
                  Category <span className="req">*</span>
                </label>
                <div className="add-stock-input-wrapper">
                  <span className="add-stock-input-icon">
                    <Layers size={16} />
                  </span>
                  <select
                    id="category"
                    value={category}
                    onChange={handleCategoryChange}
                    className="add-stock-select-field"
                    required
                    disabled={loading}
                  >
                    <option value="">SELECT CATEGORY</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <span className="add-stock-select-chevron">
                    <ChevronDown size={16} />
                  </span>
                </div>
              </div>

              {/* Quantity */}
              <div className="add-stock-field-group">
                <label htmlFor="quantity" className="add-stock-field-label">
                  Quantity <span className="req">*</span>
                </label>
                <div className="add-stock-input-wrapper">
                  <span className="add-stock-input-icon">
                    <Hash size={16} />
                  </span>
                  <input
                    id="quantity"
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="add-stock-input-field"
                    placeholder="ENTER QUANTITY"
                    min="0"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Page Ranges Checkbox */}
              <div className="add-stock-checkbox-row">
                <input
                  type="checkbox"
                  id="pageRanges"
                  checked={hasPageRanges}
                  onChange={handlePageRangeToggle}
                  disabled={loading}
                  className="add-stock-checkbox"
                />
                <label htmlFor="pageRanges" className="add-stock-checkbox-label">
                  THIS ITEM HAS DIFFERENT PRICING FOR PAGE RANGES
                </label>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Stock ID */}
              <div className="add-stock-field-group">
                <label htmlFor="stockId" className="add-stock-field-label">
                  Stock ID <span className="req">*</span>
                </label>
                <div className="add-stock-input-wrapper">
                  <span className="add-stock-input-icon">
                    <Barcode size={16} />
                  </span>
                  <input
                    id="stockId"
                    type="text"
                    value={stockId}
                    onChange={handleStockIdChange}
                    className="add-stock-input-field"
                    placeholder={`ENTER STOCK ID (E.G. ${suggestedStockId})`}
                    required
                    disabled={loading}
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
                {idMessage && (
                  <div className={`add-stock-id-status ${stockIdStatus}`}>
                    {idMessage}
                  </div>
                )}
              </div>

              {/* Item Name */}
              <div className="add-stock-field-group">
                <label htmlFor="itemName" className="add-stock-field-label">
                  Item Name <span className="req">*</span>
                </label>
                <div className="add-stock-input-wrapper">
                  <span className="add-stock-input-icon">
                    <Package size={16} />
                  </span>
                  <input
                    id="itemName"
                    type="text"
                    value={itemName}
                    onChange={handleItemNameChange}
                    className="add-stock-input-field"
                    placeholder="ENTER ITEM NAME"
                    required
                    disabled={loading}
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="add-stock-field-group">
                <label htmlFor="description" className="add-stock-field-label">
                  Description
                </label>
                <div className="add-stock-input-wrapper">
                  <span className="add-stock-input-icon">
                    <FileText size={16} />
                  </span>
                  <input
                    id="description"
                    type="text"
                    value={description}
                    onChange={handleDescriptionChange}
                    className="add-stock-input-field"
                    placeholder="ENTER DESCRIPTION (OPTIONAL)"
                    disabled={loading}
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
              </div>

              {/* Amount (when not page ranges) */}
              {!hasPageRanges && (
                <div className="add-stock-field-group">
                  <label htmlFor="amount" className="add-stock-field-label">
                    Amount (₹) <span className="req">*</span>
                  </label>
                  <div className="add-stock-input-wrapper">
                    <span className="add-stock-input-icon">
                      <IndianRupee size={16} />
                    </span>
                    <input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="add-stock-input-field"
                      placeholder="ENTER AMOUNT"
                      min="0"
                      step="0.01"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Page Ranges Subcard (if checked) */}
            {hasPageRanges && (
              <div className="add-stock-ranges-box">
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#047857", textTransform: "uppercase" }}>
                  Page Ranges & Pricing
                </div>
                {pageRanges.map((range, index) => (
                  <div key={index} className="add-stock-range-item-row">
                    <div className="add-stock-field-group">
                      <label className="add-stock-field-label">Page Range</label>
                      <div className="add-stock-input-wrapper">
                        <input
                          type="text"
                          value={range.range}
                          onChange={(e) => handlePageRangeChange(index, "range", e.target.value)}
                          className="add-stock-input-field"
                          placeholder="e.g., 1-10 PAGES"
                          required
                          disabled={loading}
                          style={{ textTransform: "uppercase" }}
                        />
                      </div>
                    </div>
                    <div className="add-stock-field-group">
                      <label className="add-stock-field-label">Price per Unit (₹)</label>
                      <div className="add-stock-input-wrapper">
                        <span className="add-stock-input-icon">
                          <IndianRupee size={15} />
                        </span>
                        <input
                          type="number"
                          value={range.price}
                          onChange={(e) => handlePageRangeChange(index, "price", e.target.value)}
                          className="add-stock-input-field"
                          placeholder="Price"
                          min="0"
                          step="0.01"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    {pageRanges.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePageRange(index)}
                        className="add-stock-range-remove-btn"
                        disabled={loading}
                        title="Remove range"
                      >
                        <Minus size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPageRange}
                  className="add-stock-range-add-btn"
                  disabled={loading}
                >
                  <Plus size={15} />
                  <span>ADD ANOTHER RANGE</span>
                </button>
              </div>
            )}
          </div>

          {/* Form Action Buttons */}
          <div className="add-stock-btn-row">
            <button
              type="submit"
              className="add-stock-btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="stock-loading-spinner" style={{ width: "16px", height: "16px" }}></div>
                  <span>ADDING...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Add Stock</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="add-stock-btn-secondary"
              disabled={loading}
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
          </div>
        </form>
      </div>

      {/* Bottom Card: Stock Items in selectedBranch */}
      {selectedBranch && (
        <div className="add-stock-card">
          <div className="add-stock-card-header">
            <div className="add-stock-card-title-wrap">
              <h3 className="add-stock-card-title">
                <TableProperties size={18} color="#059669" />
                <span>Stock Items in {selectedBranch}</span>
              </h3>
              <span className="add-stock-count-badge">
                {filteredStockItems.length} Items
              </span>
            </div>

            <div className="add-stock-search-wrap">
              <Search size={15} className="add-stock-search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by Stock ID, name, Category, or Description..."
                className="add-stock-search-input"
              />
            </div>
          </div>

          {loadingStocks ? (
            <div style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
              <div className="stock-loading-spinner" style={{ margin: "0 auto 12px" }}></div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>Loading stock items...</p>
            </div>
          ) : filteredStockItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
              <p style={{ margin: 0, fontSize: "14px" }}>
                {stockItems.length === 0
                  ? "No stock items found for this branch."
                  : "No items match your search criteria."}
              </p>
            </div>
          ) : (
            <>
              <div className="add-stock-table-wrap">
                <table className="add-stock-table">
                  <thead>
                    <tr>
                      <th className="th-center" style={{ width: "50px" }}>S.NO</th>
                      <th>STOCK ID</th>
                      <th>ITEM NAME</th>
                      <th className="th-center">CATEGORY</th>
                      <th className="th-center">QUANTITY</th>
                      <th>PRICING</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item, index) => {
                      const totalRows = item.pageRanges ? item.pageRanges.length : 1;
                      const qtyVal = item.qty || 0;
                      const qtyClass = qtyVal === 0 ? "out" : qtyVal < 5 ? "low" : "";

                      return (
                        <React.Fragment key={item.id}>
                          <tr>
                            <td rowSpan={totalRows} className="td-center">
                              {startIndex + index + 1}
                            </td>
                            <td rowSpan={totalRows} className="td-mono">
                              {(item.stockId || "N/A").toUpperCase()}
                            </td>
                            <td rowSpan={totalRows} style={{ fontWeight: 600 }}>
                              {item.itemName}
                            </td>
                            <td rowSpan={totalRows} className="td-center td-category">
                              {item.category || "N/A"}
                            </td>
                            <td rowSpan={totalRows} className="td-center">
                              <span className={`add-stock-qty-pill ${qtyClass}`}>
                                {qtyVal}
                              </span>
                            </td>
                            {item.pageRanges && item.pageRanges.length > 0 ? (
                              <td className="td-pricing">
                                {item.pageRanges[0].range}: {formatCurrency(item.pageRanges[0].price)}
                              </td>
                            ) : (
                              <td className="td-pricing">
                                {formatCurrency(item.amount)}
                              </td>
                            )}
                          </tr>
                          {item.pageRanges &&
                            item.pageRanges.slice(1).map((range, rangeIndex) => (
                              <tr key={`${item.id}-range-${rangeIndex + 1}`}>
                                <td className="td-pricing">
                                  {range.range}: {formatCurrency(range.price)}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Standard Pagination Footer */}
              <Pagination
                currentPage={safeCurrentPage}
                totalItems={filteredStockItems.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(limit) => {
                  setItemsPerPage(limit);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
                itemLabel="items"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AddStock;
