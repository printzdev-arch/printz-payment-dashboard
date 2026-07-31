import React, { useState, useEffect } from "react";
import { db } from "../../services/authservice";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import {
  FaUndo,
  FaPlus,
  FaMinus,
  FaUpload,
  FaDownload,
  FaFileExcel,
  FaSearch,
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
} from "react-icons/fa";
import { MdOutlineFileDownloadDone } from "react-icons/md";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/stocklist.css";
import Popup from "../common/Popup";
import { usePopup } from "../../hooks/usePopup";
import { ToastContainer } from 'react-toastify';

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
  const [branchName, setBranchName] = useState("");
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
  const [itemsPerPage] = useState(10);
  const [suggestedStockId, setSuggestedStockId] = useState("STK001");
  const [stockIdStatus, setStockIdStatus] = useState("");
  const [idMessage, setIdMessage] = useState("");
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);

  const { popup, showSuccess, showError, showInfo, hidePopup } = usePopup();

  const fetchBranches = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "branches"));
      const branchData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        address: doc.data().address || "",
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
      }
    } catch (error) {
      showError("Failed to fetch branch names: " + error.message);
    }
  };

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "categories"));
      const categoryData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().categoryName,
      }));

      // Separate "OTHERS" from the rest of the categories
      const othersCategory = categoryData.find(cat => cat.name.toUpperCase() === 'OTHERS');
      const otherCategories = categoryData.filter(cat => cat.name.toUpperCase() !== 'OTHERS');

      // Sort the rest of the categories alphabetically
      otherCategories.sort((a, b) => a.name.localeCompare(b.name));

      // Append "OTHERS" to the end of the sorted list if it exists
      if (othersCategory) {
        otherCategories.push(othersCategory);
      }
      
      setCategories(otherCategories);
    } catch (error) {
      showError("Failed to fetch categories: " + error.message);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchStockItems();
    } else {
      setStockItems([]);
    }
  }, [selectedBranch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkStockIdAvailability();
    }, 500);

    return () => clearTimeout(timer);
  }, [stockId, selectedBranch]);

  const checkStockIdAvailability = async () => {
    if (!stockId || !selectedBranch) {
      setIdMessage("");
      setStockIdStatus("");
      return;
    }

    try {
      const q = query(
        collection(db, "stocks"),
        where("stockId", "==", stockId.toUpperCase())
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setIdMessage("New Stock ID");
        setStockIdStatus("new");
      } else {
        const existing = snap.docs.map((doc) => doc.data());
        const inThisBranch = existing.find(
          (stock) => stock.branchName === selectedBranch
        );
        if (inThisBranch) {
          setIdMessage("Stock ID already exists in this branch");
          setStockIdStatus("duplicate");
        } else {
          setIdMessage(
            `Stock ID exists in other branch: "${existing[0].branchName}"`
          );
          setStockIdStatus("exists_other");
        }
      }
    } catch (error) {
      showError("Error checking stock ID availability: " + error.message);
    }
  };

  const fetchStockItems = async () => {
    if (!selectedBranch) return;

    setLoadingStocks(true);
    try {
      const stocksRef = collection(db, "stocks");
      const q = query(stocksRef, where("branchName", "==", selectedBranch));
      const querySnapshot = await getDocs(q);
      const stocksData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        stocksData.push({ id: doc.id, ...data });
      });
      const sortedStocks = stocksData.sort((a, b) =>
        a.stockId.localeCompare(b.stockId)
      );
      setStockItems(sortedStocks);

      let prefix = "STK";
      let padLength = 3;
      let maxNum = 0;
      if (sortedStocks.length > 0) {
        sortedStocks.forEach((item) => {
          const match = item.stockId.match(/^([A-Z-]+)(\d+)$/);
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
      showError("Error fetching stock items: " + error.message);
    } finally {
      setLoadingStocks(false);
    }
  };

  const handleBranchChange = (event) => {
    const selectedBranchName = event.target.value.trim();
    setSelectedBranch(selectedBranchName);
    setBranchName(selectedBranchName);

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

  const parseCsvFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split("\n");
        const headers = lines[0].split(",").map((h) => h.trim());

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

        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const values = line.split(",").map((v) => v.trim());
            if (values.length >= 6) {
              const parsedQty = Number.parseInt(values[3]);
              const parsedPrice = Number.parseFloat(values[4]);

              data.push({
                stockId: values[0].toUpperCase(),
                stockName: values[1].toUpperCase(),
                category: values[2].toUpperCase(),
                qty: isNaN(parsedQty) ? 0 : parsedQty,
                price: isNaN(parsedPrice) ? 0 : parsedPrice,
                description: values[5] ? values[5].toUpperCase() : "",
              });
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
      const stocksRef = collection(db, "stocks");
      const q = query(stocksRef, where("stockId", "==", stockId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingStocks = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const stockWithDiffName = existingStocks.find(
          (stock) => stock.itemName !== itemName
        );

        if (stockWithDiffName) {
          return {
            exists: true,
            match: false,
            docId: null,
            message: `Stock ID already exists with different item name: "${stockWithDiffName.itemName}" in branch "${stockWithDiffName.branchName}"`,
          };
        }

        const exactMatch = existingStocks.find(
          (stock) =>
            stock.itemName === itemName && stock.branchName === selectedBranch
        );

        if (exactMatch) {
          return {
            exists: true,
            match: true,
            docId: exactMatch.id,
            data: exactMatch,
          };
        }

        return {
          exists: true,
          match: false,
          docId: null,
          message: `Stock ID already exists in other branch: "${existingStocks[0].branchName}"`,
        };
      }

      return { exists: false };
    } catch (error) {
      showError("Error checking stock ID: " + error.message);
      return { exists: false, error: error.message };
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

    if (!userId) {
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

        if (item.qty === undefined || item.qty === null || isNaN(item.qty) || item.qty < 0) {
          results.failed++;
          results.reasons.push(
            `Stock ID "${item.stockId}" (${item.stockName}): Invalid quantity (must be 0 or greater)`
          );
          continue;
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

        if (stockCheck.exists && stockCheck.match) {
          try {
            const stockRef = doc(db, "stocks", stockCheck.docId);
            const newQty =
              Number(stockCheck.data.qty || 0) + Number(item.qty || 0);

            await updateDoc(stockRef, {
              qty: newQty,
              timestamp: new Date(),
            });

            await addDoc(collection(db, "inventoryMovements"), {
              type: "stock",
              action: "update",
              stockId: item.stockId,
              itemName: item.stockName,
              category: item.category,
              quantity: Number(item.qty),
              amount: hasPageRanges ? 0 : Number(item.price),
              fromBranch: null,
              toBranch: selectedBranch,
              movementDate: new Date(),
              performedBy: currentUser?.email || "Unknown",
              details: {
                previousQuantity: Number(stockCheck.data.qty || 0),
                newQuantity: newQty,
                quantityAdded: Number(item.qty),
                description: item.description || "",
                source: "CSV Upload",
              },
            });

            results.updated++;
          } catch (error) {
            results.failed++;
            results.reasons.push(
              `Stock ID "${item.stockId}" (${item.stockName}): Failed to update quantity - ${error.message}`
            );
          }
        } else {
          try {
            const stockData = {
              userId,
              branchName: selectedBranch,
              itemName: item.stockName,
              category: item.category,
              amount: hasPageRanges ? 0 : Number(item.price),
              qty: Number(item.qty),
              description: item.description,
              stockId: item.stockId,
              timestamp: new Date(),
            };

            await addDoc(collection(db, "stocks"), stockData);

            await addDoc(collection(db, "inventoryMovements"), {
              type: "stock",
              action: "add",
              stockId: item.stockId,
              itemName: item.stockName,
              category: item.category,
              quantity: Number(item.qty),
              amount: hasPageRanges ? 0 : Number(item.price),
              fromBranch: null,
              toBranch: selectedBranch,
              movementDate: new Date(),
              performedBy: currentUser?.email || "Unknown",
              details: {
                description: item.description || "",
                source: "CSV Upload",
              },
            });

            results.created++;
          } catch (error) {
            results.failed++;
            results.reasons.push(
              `Stock ID "${item.stockId}" (${item.stockName}): Failed to create new stock - ${error.message}`
            );
          }
        }
      }

      let successMessage = "";
      if (results.created > 0) {
        successMessage += `✅ Created ${results.created} new stock items`;
      }
      if (results.updated > 0) {
        successMessage += `${successMessage ? ", " : "✅ "}Updated ${results.updated} existing items`;
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
      showError("Failed to upload CSV data: " + error.message);
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

      if (stockCheck.exists && !stockCheck.match) {
        showError(stockCheck.message);
        setLoading(false);
        return;
      }

      if (stockCheck.exists && stockCheck.match) {
        const stockRef = doc(db, "stocks", stockCheck.docId);
        const newQty = Number(stockCheck.data.qty || 0) + Number(qty || 0);

        await updateDoc(stockRef, {
          qty: newQty,
          timestamp: new Date(),
        });

        const currentUser = JSON.parse(localStorage.getItem("user"));
        await addDoc(collection(db, "inventoryMovements"), {
          type: "stock",
          action: "update",
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
            previousQuantity: Number(stockCheck.data.qty || 0),
            newQuantity: newQty,
            quantityAdded: Number(qty),
            description: description || "",
          },
        });

        showSuccess(
          `Updated quantity for "${itemName}" (added ${qty} units)`
        );
      } else {
        const stockData = {
          userId,
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

        await addDoc(collection(db, "stocks"), stockData);

        const currentUser = JSON.parse(localStorage.getItem("user"));
        await addDoc(collection(db, "inventoryMovements"), {
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
        });

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
        `Failed to add stock item "${itemName}". Error: ${error.message}. Please check your input and try again.`,
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
    showError('Both fields are required');
    return;
  }

  setCategoryLoading(true);

  try {
    const categoryRef = doc(db, 'categories', trimmedCategoryId);
    const docSnap = await getDoc(categoryRef);
    if (docSnap.exists()) {
      showError('Category ID already exists');
      setCategoryLoading(false);
      return;
    }

    await setDoc(categoryRef, {
      categoryId: trimmedCategoryId,
      categoryName: trimmedCategoryName.toUpperCase(),
    });

    // Optimistically update the categories state
    setCategories((prevCategories) => {
      const updatedCategories = [...prevCategories, { id: trimmedCategoryId, name: trimmedCategoryName.toUpperCase() }];
      // Sort and append "OTHERS" as per the original logic
      const othersCategory = updatedCategories.find(cat => cat.name.toUpperCase() === 'OTHERS');
      const otherCategories = updatedCategories.filter(cat => cat.name.toUpperCase() !== 'OTHERS');
      otherCategories.sort((a, b) => a.name.localeCompare(b.name));
      return othersCategory ? [...otherCategories, othersCategory] : otherCategories;
    });

    setCategoryLoading(false);
    handleCategoryReset();
    showSuccess('Category added successfully');
  } catch (error) {
    showError(error.message || 'Failed to add category');
    setCategoryLoading(false);
  }
};

  const handleCategoryReset = () => {
    setCategoryId('');
    setCategoryName('');
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

  const totalPages = Math.ceil(filteredStockItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredStockItems.slice(startIndex, endIndex);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value.trim());
    setCurrentPage(1);
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="stock-readings-container">
      <ToastContainer />
      <Popup {...popup} />

      <div className="stock-page-header">
        <h2>Add Stock</h2>
        <p>Add new stock items to your inventory</p>
      </div>

      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Stock Information</h3>
          </div>
          <div className="stock-action-buttons">
            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="stock-save-button"
              style={{ backgroundColor: "#10b981" }}
            >
              <FaDownload /> Download CSV Template
            </button>
          </div>
        </div>

        <div className="stock-card-content">
          <form onSubmit={handleSubmit} style={{ width: "100%", overflow: "hidden" }}>
            {selectedBranch && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
                <div
                  className="stock-csv-upload-section"
                  style={{
                    flex: 1,
                    marginRight: "20px",
                    padding: "20px",
                    border: "2px dashed #ddd",
                    borderRadius: "8px",
                    backgroundColor: "#f9f9f9",
                    maxWidth: "50%",
                    overflow: "hidden"
                  }}
                >
                  <h4>
                    <FaFileExcel /> Bulk Upload via CSV
                  </h4>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#666",
                      marginBottom: "15px",
                    }}
                  >
                    Format: stockId, stockName, category, qty, price, description
                  </p>

                  <div className="stock-date-picker-wrapper">
                    <label htmlFor="csvFile">Upload CSV File</label>
                    <input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      className="stock-select-input"
                      disabled={loading}
                    />
                    {csvFile && (
                      <p style={{ fontSize: "12px", color: "#666" }}>
                        Selected: {csvFile.name}
                      </p>
                    )}
                  </div>

                  {showCsvPreview && csvData.length > 0 && (
                    <div className="stock-card" style={{ marginTop: "20px" }}>
                      <div className="stock-card-header">
                        <div className="stock-card-title">
                          <h4>CSV Preview ({csvData.length} items)</h4>
                        </div>
                      </div>
                      <div className="stock-card-content">
                        <div className="stock-table-wrapper" style={{ overflowX: "auto", maxWidth: "100%" }}>
                          <table className="stock-readings-table" style={{ minWidth: "700px", width: "100%" }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'center', width: '50px', minWidth: '50px' }}>S.No</th>
                                <th style={{ minWidth: '100px' }}>Stock ID</th>
                                <th style={{ minWidth: '120px' }}>Stock Name</th>
                                <th style={{ minWidth: '100px' }}>Category</th>
                                <th style={{ minWidth: '80px' }}>Quantity</th>
                                <th style={{ minWidth: '100px' }}>Price</th>
                                <th style={{ minWidth: '150px' }}>Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {csvData.slice(0, 5).map((item, index) => (
                                <tr key={index}>
                                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                  <td style={{ wordBreak: 'break-word' }}>{item.stockId}</td>
                                  <td style={{ wordBreak: 'break-word' }}>{item.stockName}</td>
                                  <td style={{ wordBreak: 'break-word' }}>{item.category}</td>
                                  <td style={{ textAlign: 'center' }}>{item.qty}</td>
                                  <td style={{ textAlign: 'right' }}>₹{item.price}</td>
                                  <td style={{ wordBreak: 'break-word', maxWidth: '200px' }}>{item.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {csvData.length > 5 && (
                            <p
                              style={{
                                textAlign: "center",
                                color: "#666",
                                marginTop: "10px",
                              }}
                            >
                              ... and {csvData.length - 5} more items
                            </p>
                          )}
                        </div>

                        <div className="stock-action-buttons">
                          <button
                            type="button"
                            onClick={handleCsvUpload}
                            className="stock-save-button"
                            disabled={loading || !selectedBranch}
                          >
                            {loading ? (
                              <>
                                <div
                                  className="stock-loading-spinner"
                                  style={{ width: "16px", height: "16px" }}
                                ></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <FaUpload /> Upload {csvData.length} Items
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: "20px",
                    border: "2px dashed #ddd",
                    borderRadius: "8px",
                    backgroundColor: "#f9f9f9",
                    maxWidth: "50%",
                    overflow: "hidden"
                  }}
                >
                  <h4>Add New Category</h4>
                  <form onSubmit={handleAddCategorySubmit}>
                    <div className="stock-date-picker-wrapper">
                      <label htmlFor="categoryId">Category ID</label>
                      <input
                        id="categoryId"
                        type="text"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value.trim())}
                        className="stock-select-input"
                        required
                        disabled={categoryLoading}
                      />
                    </div>
                    <div className="stock-date-picker-wrapper">
                      <label htmlFor="categoryName">Category Name</label>
                      <input
                        id="categoryName"
                        type="text"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value.trim().toUpperCase())}
                        className="stock-select-input"
                        required
                        disabled={categoryLoading}
                      />
                    </div>
                    <div className="stock-action-buttons">
                      <button disabled={categoryLoading} type="submit" className="stock-save-button">
                        {categoryLoading ? (
                          <>
                            <div
                              className="stock-loading-spinner"
                              style={{ width: "16px", height: "16px" }}
                            ></div>
                            Adding...
                          </>
                        ) : (
                          <>
                            <MdOutlineFileDownloadDone /> Add Category
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCategoryReset}
                        className="stock-cancel-button"
                        disabled={categoryLoading}
                      >
                        <FaUndo /> Reset
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="stock-date-picker-container">
              <div className="stock-date-picker-wrapper">
                <label htmlFor="branchName">BRANCH NAME *</label>
                <select
                  id="branchName"
                  value={selectedBranch}
                  onChange={handleBranchChange}
                  className="stock-select-input"
                  required
                >
                  <option value="" disabled>
                    SELECT...
                  </option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="stock-date-picker-wrapper">
                <label htmlFor="stockId">STOCK ID *</label>
                <input
                  id="stockId"
                  type="text"
                  value={stockId}
                  onChange={handleStockIdChange}
                  className="stock-select-input"
                  placeholder={`ENTER STOCK ID (e.g. ${suggestedStockId})`}
                  required
                  disabled={loading}
                  style={{ textTransform: "uppercase" }}
                />
                {idMessage && (
                  <p
                    style={{
                      fontSize: "12px",
                      color:
                        stockIdStatus === "new"
                          ? "green"
                          : stockIdStatus === "duplicate"
                          ? "red"
                          : "orange",
                      marginTop: "4px",
                    }}
                  >
                    {idMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="stock-date-picker-container">
              <div className="stock-date-picker-wrapper">
                <label htmlFor="category">CATEGORY *</label>
                <select
                  id="category"
                  value={category}
                  onChange={handleCategoryChange}
                  className="stock-select-input"
                  required
                  disabled={loading}
                >
                  <option value="">SELECT CATEGORY</option>
                  {categories.map((ele) => (
                    <option key={ele.id} value={ele.name}>
                      {ele.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="stock-date-picker-wrapper">
                <label htmlFor="itemName">ITEM NAME *</label>
                <input
                  id="itemName"
                  type="text"
                  value={itemName}
                  onChange={handleItemNameChange}
                  className="stock-select-input"
                  placeholder="ENTER ITEM NAME"
                  required
                  disabled={loading}
                  style={{ textTransform: "uppercase" }}
                />
              </div>
            </div>

            <div className="stock-date-picker-container">
              <div className="stock-date-picker-wrapper">
                <label htmlFor="quantity">QUANTITY *</label>
                <input
                  id="quantity"
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="stock-select-input"
                  placeholder="ENTER QUANTITY"
                  min="0"
                  required
                  disabled={loading}
                />
              </div>

              <div className="stock-date-picker-wrapper">
                <label htmlFor="description">DESCRIPTION</label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={handleDescriptionChange}
                  className="stock-select-input"
                  placeholder="ENTER DESCRIPTION (OPTIONAL)"
                  disabled={loading}
                  style={{ textTransform: "uppercase" }}
                />
              </div>
            </div>

            <div className="stock-date-picker-wrapper">
              <div className="stock-checkbox-container">
                <div className="stock-checkbox-item">
                  <input
                    type="checkbox"
                    id="pageRanges"
                    checked={hasPageRanges}
                    onChange={handlePageRangeToggle}
                    disabled={loading}
                  />
                  <label htmlFor="pageRanges">
                    THIS ITEM HAS DIFFERENT PRICING FOR PAGE RANGES
                  </label>
                </div>
              </div>
            </div>

            {hasPageRanges && (
              <div className="stock-card">
                <div className="stock-card-header">
                  <div className="stock-card-title">
                    <h3>PAGE RANGES & PRICING</h3>
                  </div>
                </div>
                <div className="stock-card-content">
                  {pageRanges.map((range, index) => (
                    <div key={index} className="stock-date-picker-container">
                      <div className="stock-date-picker-wrapper">
                        <label htmlFor={`pageRange-${index}`}>PAGE RANGE (e.g., "1-10 PAGES")</label>
                        <input
                          id={`pageRange-${index}`}
                          type="text"
                          value={range.range}
                          onChange={(e) =>
                            handlePageRangeChange(
                              index,
                              "range",
                              e.target.value
                            )
                          }
                          className="stock-select-input"
                          placeholder="e.g., 1-10 PAGES"
                          required
                          disabled={loading}
                          style={{ textTransform: "uppercase" }}
                        />
                      </div>
                      <div className="stock-date-picker-wrapper">
                        <label htmlFor={`price-${index}`}>PRICE PER UNIT</label>
                        <div className="stock-range-price-container">
                          <input
                            id={`price-${index}`}
                            type="number"
                            value={range.price}
                            onChange={(e) =>
                              handlePageRangeChange(
                                index,
                                "price",
                                e.target.value
                              )
                            }
                            className="stock-select-input"
                            placeholder="PRICE"
                            min="0"
                            step="0.01"
                            required
                            disabled={loading}
                          />
                          {pageRanges.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePageRange(index)}
                              className="stock-remove-range-button"
                              disabled={loading}
                            >
                              <FaMinus />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPageRange}
                    className="stock-add-range-button"
                    disabled={loading}
                  >
                    <FaPlus /> ADD ANOTHER RANGE
                  </button>
                </div>
              </div>
            )}

            {!hasPageRanges && (
              <div className="stock-date-picker-container">
                <div className="stock-date-picker-wrapper">
                  <label htmlFor="amount">AMOUNT (₹) *</label>
                  <input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="stock-select-input"
                    placeholder="ENTER AMOUNT"
                    min="0"
                    step="0.01"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="stock-action-buttons">
              <button
                type="submit"
                className="stock-save-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div
                      className="stock-loading-spinner"
                      style={{ width: "16px", height: "16px" }}
                    ></div>
                    ADDING...
                  </>
                ) : (
                  <>
                    <MdOutlineFileDownloadDone /> ADD STOCK
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="stock-cancel-button"
                disabled={loading}
              >
                <FaUndo /> RESET
              </button>
            </div>
          </form>
        </div>
      </div>

      {selectedBranch && (
        <div className="stock-card" style={{ marginTop: "25px" }}>
          <div className="stock-card-header">
            <div className="stock-card-title">
              <h3>Stock Items in {selectedBranch}</h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#666",
                  margin: "5px 0 0 0",
                }}
              >
                {filteredStockItems.length} of {stockItems.length} item
                {stockItems.length !== 1 ? "s" : ""}{" "}
                {searchTerm ? "match search" : "found"}
              </p>
            </div>
          </div>

          <div className="stock-card-content">
            <div
              className="stock-search-container"
              style={{ marginBottom: "20px" }}
            >
              <div className="stock-date-picker-wrapper">
                <label htmlFor="search">Search Stock Items</label>
                <div style={{ position: "relative" }}>
                  <FaSearch
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#666",
                      fontSize: "14px",
                    }}
                  />
                  <input
                    id="search"
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="stock-select-input"
                    placeholder="Search by Stock ID, Name, Category, or Description..."
                    style={{ paddingLeft: "35px" }}
                  />
                </div>
              </div>
            </div>
            {loadingStocks ? (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <div
                  className="stock-loading-spinner"
                  style={{ margin: "0 auto 10px" }}
                ></div>
                <p>Loading stock items...</p>
              </div>
            ) : filteredStockItems.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#666",
                }}
              >
                <p>
                  {stockItems.length === 0
                    ? "No stock items found for this branch."
                    : "No items match your search criteria."}
                </p>
              </div>
            ) : (
              <>
                <div className="stock-table-wrapper" style={{ overflowX: "auto", maxWidth: "100%" }}>
                  <table className="stock-readings-table" style={{ minWidth: "800px", width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "center", width: "50px", minWidth: "50px" }}>S.No</th>
                        <th style={{ minWidth: "100px" }}>Stock ID</th>
                        <th style={{ minWidth: "140px" }}>Item Name</th>
                        <th style={{ textAlign: "center", minWidth: "100px" }}>Category</th>
                        <th style={{ textAlign: "center", minWidth: "80px" }}>Quantity</th>
                        <th style={{ minWidth: "120px" }}>Pricing</th>
                        <th style={{ minWidth: "150px" }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((item, index) => {
                        const totalRows = item.pageRanges
                          ? item.pageRanges.length
                          : 1;
                        return (
                          <React.Fragment key={item.id}>
                            <tr>
                              <td rowSpan={totalRows} style={{ textAlign: "center" }}>
                                {startIndex + index + 1}
                              </td>
                              <td rowSpan={totalRows} style={{ wordBreak: "break-word" }}>
                                {(item.stockId || "N/A").toUpperCase()}
                              </td>
                              <td rowSpan={totalRows} style={{ wordBreak: "break-word" }}>{item.itemName}</td>
                              <td rowSpan={totalRows} style={{ textAlign: "center", wordBreak: "break-word" }}>
                                {item.category || "N/A"}
                              </td>
                              <td rowSpan={totalRows} style={{ textAlign: "center" }}>
                                <span
                                  className={`qty-badge ${
                                    (item.qty || 0) === 0
                                      ? "out-of-stock"
                                      : (item.qty || 0) < 5
                                      ? "low-stock"
                                      : "in-stock"
                                  }`}
                                >
                                  {item.qty || 0}
                                </span>
                              </td>
                              {item.pageRanges && item.pageRanges.length > 0 ? (
                                <td style={{ wordBreak: "break-word" }}>
                                  {item.pageRanges[0].range}:{" "}
                                  {formatCurrency(item.pageRanges[0].price)}
                                </td>
                              ) : (
                                <td style={{ wordBreak: "break-word" }}>{formatCurrency(item.amount)}</td>
                              )}
                              <td rowSpan={totalRows} style={{ wordBreak: "break-word", maxWidth: "200px" }}>
                                {item.description || "N/A"}
                              </td>
                            </tr>
                            {item.pageRanges &&
                              item.pageRanges
                                .slice(1)
                                .map((range, rangeIndex) => (
                                  <tr
                                    key={`${item.id}-range-${rangeIndex + 1}`}
                                  >
                                    <td style={{ wordBreak: "break-word" }}>
                                      {range.range}:{" "}
                                      {formatCurrency(range.price)}
                                    </td>
                                  </tr>
                                ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="stock-pagination">
                  <button onClick={previousPage} disabled={currentPage === 1} className="stock-pagination-button">
                    <FaRegArrowAltCircleLeft />
                  </button>
                  <span className="stock-page-info">
                    {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="stock-pagination-button"
                  >
                    <FaRegArrowAltCircleRight />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddStock;
