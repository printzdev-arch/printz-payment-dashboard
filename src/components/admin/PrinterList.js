import { useState, useEffect, useCallback } from "react";
import { db } from "../../services/authservice";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { FaTimes, FaPlus, FaEdit, FaTrash, FaSave } from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/stocklist.css";
import Popup from "../common/Popup";
import { usePopup } from "../../hooks/usePopup";

const PrinterList = () => {
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState([]);
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editingJumboService, setEditingJumboService] = useState(null);
  const [editJumboFormData, setEditJumboFormData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showInactivePrinters, setShowInactivePrinters] = useState(false);

  const [addingNewService, setAddingNewService] = useState(null);
  const [newServiceData, setNewServiceData] = useState({
    size: "",
    price: "",
  });
  const [addingJumboService, setAddingJumboService] = useState(null);
  const [newJumboData, setNewJumboData] = useState({
    size: "",
    type: "",
    unitPrice: "",
  });

  const { popup, showSuccess, showError } = usePopup();

  const fetchBranches = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "branches"));
      const branchesData = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        branchesData.push({ name: userData.name, id: doc.id });
      });

      const sortedBranches = branchesData.sort((a, b) => {
        const nameA = a.name.trim().toLowerCase();
        const nameB = b.name.trim().toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      setBranches(sortedBranches);
    } catch (error) {
      showError("Error fetching branches: " + error.message);
    }
  }, [showError]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Clear selected items when branch changes
  useEffect(() => {
    setSelectedItems([]);
    setSelectAll(false);
    setCurrentPage(1);
  }, [selectedBranch]);

  // Clear selected items when inactive printer toggle changes
  useEffect(() => {
    setSelectedItems([]);
    setSelectAll(false);
    setCurrentPage(1);
  }, [showInactivePrinters]);

  const fetchAssets = useCallback(async () => {
    if (!selectedBranch) return;

    setIsLoading(true);
    try {
      const assetsRef = collection(db, "printers");
      const q = query(
        assetsRef,
        where("branchName", "==", selectedBranch),
        where("isActive", "==", !showInactivePrinters)
      );
      const querySnapshot = await getDocs(q);
      const assetsData = [];

      for (const doc of querySnapshot.docs) {
        const printerData = { id: doc.id, ...doc.data() };

        if (printerData.printerType === "LFP") {
          const jumboQuery = query(
            collection(db, "JumboXerox"),
            where("printerId", "==", printerData.printerId),
            where("branch", "==", selectedBranch),
            where("isActive", "==", true)
          );
          const jumboSnapshot = await getDocs(jumboQuery);
          printerData.jumboServices = jumboSnapshot.docs.map((jumboDoc) => ({
            id: jumboDoc.id,
            ...jumboDoc.data(),
          }));
        }

        assetsData.push(printerData);
      }

      setAssets(
        assetsData.sort((a, b) => a.printerName.localeCompare(b.printerName))
      );
    } catch (error) {
      showError("Error fetching printers: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranch, showError, showInactivePrinters]);

  useEffect(() => {
    if (selectedBranch) {
      fetchAssets();
    } else {
      setAssets([]);
    }
  }, [selectedBranch, fetchAssets]);

  const handleEdit = (asset) => {
    setEditingAsset(asset.id);
    setEditFormData({
      printerName: asset.printerName.toUpperCase(),
      printerId: asset.printerId,
      prices: [...(asset.prices || [])],
      description: asset.description || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingAsset(null);
    setEditFormData({});
  };

  const handleSaveEdit = async (assetId) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("user"));

      if (!editFormData.printerName.trim()) {
        showError("Printer name cannot be empty");
        return;
      }

      if (!editFormData.printerId.trim()) {
        showError("Printer ID cannot be empty");
        return;
      }

      // Get the current printer data to check if printer ID is changing
      const currentAsset = assets.find((asset) => asset.id === assetId);
      const oldPrinterId = currentAsset?.printerId;
      const newPrinterId = editFormData.printerId.trim();
      const newPrinterName = editFormData.printerName.trim();

      console.log(`Updating printer: ${oldPrinterId} -> ${newPrinterId}`);

      // Update the printer document
      await updateDoc(doc(db, "printers", assetId), {
        printerName: newPrinterName,
        printerId: newPrinterId,
        prices: editFormData.prices,
        description: editFormData.description.trim(),
        needsPrinterIdUpdate: false, // Remove the flag once ID is set
        updatedBy: currentUser?.email || "Unknown",
        updatedDate: new Date(),
      });

      // If printer ID or name changed, update all related JumboXerox documents
      if (
        oldPrinterId &&
        (oldPrinterId !== newPrinterId ||
          currentAsset.printerName !== newPrinterName)
      ) {
        console.log(
          `Updating JumboXerox documents for printer ID change: ${oldPrinterId} -> ${newPrinterId}`
        );

        // Find all JumboXerox documents with the old printer ID
        const jumboQuery = query(
          collection(db, "JumboXerox"),
          where("printerId", "==", oldPrinterId),
          where("branch", "==", selectedBranch),
          where("isActive", "==", true)
        );

        const jumboSnapshot = await getDocs(jumboQuery);

        if (!jumboSnapshot.empty) {
          // Update each JumboXerox document with new printer ID and name
          const updatePromises = jumboSnapshot.docs.map((jumboDoc) =>
            updateDoc(doc(db, "JumboXerox", jumboDoc.id), {
              printerId: newPrinterId,
              printerName: newPrinterName,
              updatedBy: currentUser?.email || "Unknown",
              updatedDate: new Date(),
            })
          );

          await Promise.all(updatePromises);
          console.log(
            `✅ Updated ${jumboSnapshot.docs.length} JumboXerox documents with new printer details`
          );
        }
      }

      showSuccess(
        `Printer "${newPrinterName}" has been updated successfully. All changes have been saved.`,
        "Printer Updated Successfully"
      );

      setEditingAsset(null);
      setEditFormData({});
      fetchAssets();
    } catch (error) {
      console.error("Error updating printer:", error);
      showError(
        `Failed to update printer "${editFormData.printerName}". Error: ${error.message}. Please check your input and try again.`,
        "Printer Update Failed"
      );
    }
  };

  const handleDelete = async (assetId, printerName) => {
    try {
      await updateDoc(doc(db, "printers", assetId), {
        isActive: false,
      });
      showSuccess("Printer deleted successfully");
      fetchAssets();
    } catch (error) {
      showError("Failed to delete printer: " + error.message);
    }
  };

  const handleDeleteInactive = async (assetId, printerName) => {
    try {
      await deleteDoc(doc(db, "printers", assetId));
      showSuccess(`Printer "${printerName}" permanently deleted successfully`);
      fetchAssets();
    } catch (error) {
      showError("Failed to permanently delete printer: " + error.message);
    }
  };

  const handleDeleteMFPService = async (printerId, serviceSize) => {
    try {
      const printer = assets.find((asset) => asset.id === printerId);
      const updatedPrices = printer.prices.filter(
        (price) => price.size !== serviceSize
      );

      await updateDoc(doc(db, "printers", printerId), {
        prices: updatedPrices,
        updatedDate: new Date(),
      });

      showSuccess("Service deleted successfully");

      fetchAssets();
    } catch (error) {
      showError("Failed to delete service: " + error.message);
    }
  };

  const handleEditJumboService = (service) => {
    setEditingJumboService(service.id);
    setEditJumboFormData({
      size: service.size,
      type: service.type,
      unitPrice: service.unitPrice.toString(),
    });
  };

  const handleCancelJumboEdit = () => {
    setEditingJumboService(null);
    setEditJumboFormData({});
  };

  const handleJumboInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "unitPrice") {
      if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) {
        setEditJumboFormData({
          ...editJumboFormData,
          [name]: value,
        });
      }
    } else if (name === "size") {
      setEditJumboFormData({
        ...editJumboFormData,
        [name]: value.toUpperCase(),
      });
    } else if (name === "type") {
      setEditJumboFormData({
        ...editJumboFormData,
        [name]: value.toUpperCase().trim(),
      });
    } else {
      setEditJumboFormData({
        ...editJumboFormData,
        [name]: value,
      });
    }
  };

  const handleSaveJumboEdit = async (serviceId) => {
    try {
      if (
        !editJumboFormData.size ||
        !editJumboFormData.type ||
        !editJumboFormData.unitPrice
      ) {
        showError("All fields are required");
        return;
      }

      if (isNaN(Number.parseFloat(editJumboFormData.unitPrice))) {
        showError("Unit price must be a valid number");
        return;
      }

      const jumboXeroxData = {
        size: editJumboFormData.size,
        type: editJumboFormData.type,
        unitPrice: Number.parseFloat(editJumboFormData.unitPrice),
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, "JumboXerox", serviceId), jumboXeroxData);

      showSuccess(
        `LFP service "${editJumboFormData.type} - ${editJumboFormData.size}" has been updated successfully. Unit price: ₹${editJumboFormData.unitPrice}`,
        "LFP Service Updated"
      );

      setEditingJumboService(null);
      setEditJumboFormData({});
      fetchAssets();
    } catch (error) {
      showError(
        `Failed to update LFP service. Error: ${error.message}. Please check your input and try again.`,
        "LFP Service Update Failed"
      );
    }
  };

  const handleDeleteJumboService = async (
    serviceId,
    serviceType,
    serviceSize
  ) => {
    const demo = true;
    if (demo === true) {
      try {
        await deleteDoc(doc(db, "JumboXerox", serviceId));

        showSuccess(
          `LFP service "${serviceType} - ${serviceSize}" has been deleted successfully.`,
          "LFP Service Deleted"
        );

        fetchAssets();
      } catch (error) {
        showError(
          `Failed to delete LFP service "${serviceType} - ${serviceSize}". Error: ${error.message}`,
          "LFP Service Delete Failed"
        );
      }
    }
  };

  const handleAddNewService = (printerId) => {
    setAddingNewService(printerId);
    setNewServiceData({
      size: "",
      price: "",
    });
  };

  const handleSaveNewService = async (printerId) => {
    try {
      if (!newServiceData.size || !newServiceData.price) {
        showError("Please fill in Size and Price fields");
        return;
      }

      const currentPrinter = assets.find((asset) => asset.id === printerId);
      if (!currentPrinter) {
        showError("Printer not found");
        return;
      }

      const serviceExists = currentPrinter.prices?.some(
        (price) =>
          price.size.toUpperCase() === newServiceData.size.toUpperCase()
      );
      if (serviceExists) {
        showError("Service with this size already exists");
        return;
      }

      const newService = {
        size: newServiceData.size.toUpperCase(),
        price: Number.parseFloat(newServiceData.price),
      };

      const updatedPrices = [...(currentPrinter.prices || []), newService];

      await updateDoc(doc(db, "printers", printerId), {
        prices: updatedPrices,
        updatedAt: new Date(),
      });

      setAddingNewService(null);
      setNewServiceData({
        size: "",
        price: "",
      });

      showSuccess("New service added successfully!");
      fetchAssets();
    } catch (error) {
      console.error("Error adding new service:", error);
      showError("Failed to add new service. Please try again.");
    }
  };

  const handleCancelNewService = () => {
    setAddingNewService(null);
    setNewServiceData({
      size: "",
      price: "",
    });
  };

  const handleAddJumboService = (printerId) => {
    setAddingJumboService(printerId);
    setNewJumboData({
      size: "",
      type: "",
      unitPrice: "",
    });
  };

  const handleSaveJumboService = async (printerId) => {
    try {
      if (!newJumboData.size || !newJumboData.type || !newJumboData.unitPrice) {
        showError("Please fill in all required fields");
        return;
      }

      const currentPrinter = assets.find((asset) => asset.id === printerId);
      if (!currentPrinter) {
        showError("Printer not found");
        return;
      }

      await addDoc(collection(db, "JumboXerox"), {
        printerId: currentPrinter.printerId,
        printerName: currentPrinter.printerName,
        branch: selectedBranch,
        size: newJumboData.size.toUpperCase(),
        type: newJumboData.type.toUpperCase(),
        unitPrice: Number.parseFloat(newJumboData.unitPrice),
        isActive: true,
        createdAt: new Date(),
      });

      setAddingJumboService(null);
      setNewJumboData({
        size: "",
        type: "",
        unitPrice: "",
      });

      showSuccess("New Jumbo Xerox configuration added successfully!");
      fetchAssets();
    } catch (error) {
      console.error("Error adding new Jumbo service:", error);
      showError("Failed to add new Jumbo service. Please try again.");
    }
  };

  const handleCancelJumboService = () => {
    setAddingJumboService(null);
    setNewJumboData({
      size: "",
      type: "",
      unitPrice: "",
    });
  };

  // Bulk delete functions
  const handleSelectItem = (assetId) => {
    setSelectedItems((prev) => {
      if (prev.includes(assetId)) {
        return prev.filter((id) => id !== assetId);
      } else {
        return [...prev, assetId];
      }
    });
  };

  const handleSelectAll = (filteredAssets) => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredAssets.map((asset) => asset.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      showError("Please select items to delete");
      return;
    }
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      if (showInactivePrinters) {
        // Hard delete for inactive printers
        const promises = selectedItems.map((assetId) =>
          deleteDoc(doc(db, "printers", assetId))
        );
        await Promise.all(promises);
        showSuccess(
          `Successfully permanently deleted ${selectedItems.length} printer(s)`
        );
      } else {
        // Soft delete for active printers
        const promises = selectedItems.map((assetId) =>
          updateDoc(doc(db, "printers", assetId), { isActive: false })
        );
        await Promise.all(promises);
        showSuccess(
          `Successfully deactivated ${selectedItems.length} printer(s)`
        );
      }
      setSelectedItems([]);
      setSelectAll(false);
      setShowBulkDeleteConfirm(false);
      fetchAssets();
    } catch (error) {
      showError("Failed to delete selected printers: " + error.message);
    }
  };

  const cancelBulkDelete = () => {
    setShowBulkDeleteConfirm(false);
  };

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

  return (
    <div className="stock-readings-container">
      <Popup {...popup} />

      <div className="stock-page-header">
        <h2>Printer List</h2>
        <p>View and manage printers by branch</p>
      </div>

      <div className="stock-list">
        <div className="stock-card">
          <div className="stock-card-header">
            <div className="stock-card-title">
              <h3>Branch Printers</h3>
            </div>
          </div>

          <div className="stock-card-content">
            <div
              className="stock-date-picker-wrapper"
              style={{
                marginBottom: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <label style={{ marginBottom: "8px", fontWeight: "500" }}>
                Select Branch *
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="stock-select-input"
                style={{ width: "300px", maxWidth: "100%" }}
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "15px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={showInactivePrinters}
                  onChange={(e) => setShowInactivePrinters(e.target.checked)}
                  style={{ transform: "scale(1.2)" }}
                />
                Show Only Inactive Printers
              </label>
            </div>

            {isLoading ? (
              <div className="stock-loading-container">
                <div className="stock-loading-spinner"></div>
                <p>Loading printers...</p>
              </div>
            ) : assets.length > 0 ? (
              <>
                {/* Summary bar */}
                <div
                  style={{
                    marginBottom: "15px",
                    padding: "10px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                >
                  <strong>Summary:</strong> {assets.length} total{" "}
                  {showInactivePrinters ? "inactive" : "active"} printers |
                  <span
                    style={{
                      color: "#ef4444",
                      fontWeight: "600",
                      marginLeft: "8px",
                    }}
                  >
                    {
                      assets.filter(
                        (asset) =>
                          !asset.printerId || asset.printerId.trim() === ""
                      ).length
                    }{" "}
                    need Printer ID
                  </span>
                  {assets.filter((asset) => asset.needsPrinterIdUpdate).length >
                    0 && (
                    <span
                      style={{
                        color: "#f59e0b",
                        fontWeight: "600",
                        marginLeft: "8px",
                      }}
                    >
                      |{" "}
                      {
                        assets.filter((asset) => asset.needsPrinterIdUpdate)
                          .length
                      }{" "}
                      cloned printers
                    </span>
                  )}
                </div>

                {/* Filter and display assets */}
                {(() => {
                  const totalPages = Math.ceil(assets.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const currentAssets = assets.slice(startIndex, endIndex);

                  const handlePageChange = (page) => {
                    setCurrentPage(page);
                  };

                  if (assets.length === 0) {
                    return (
                      <div className="stock-no-data">
                        <p>No printers found for {selectedBranch}</p>
                      </div>
                    );
                  }

                  return (
                    <div>
                      {/* Bulk Actions Bar */}
                      {assets.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 15px",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "6px",
                            marginBottom: "15px",
                            border: "1px solid #e9ecef",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "15px",
                            }}
                          >
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "14px",
                                fontWeight: "500",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={() => handleSelectAll(assets)}
                                style={{ transform: "scale(1.2)" }}
                              />
                              Select All ({assets.length})
                            </label>
                            {selectedItems.length > 0 && (
                              <span
                                style={{ fontSize: "14px", color: "#6c757d" }}
                              >
                                {selectedItems.length} selected
                              </span>
                            )}
                          </div>
                          {selectedItems.length > 0 && (
                            <button
                              onClick={handleBulkDelete}
                              style={{
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                padding: "8px 16px",
                                borderRadius: "4px",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <FaTrash size={12} />
                              Delete Selected ({selectedItems.length})
                            </button>
                          )}
                        </div>
                      )}

                      <div className="stock-table-wrapper">
                        <table className="stock-readings-table">
                          <thead>
                            <tr>
                              <th style={{ width: "50px" }}>
                                <input
                                  type="checkbox"
                                  checked={selectAll}
                                  onChange={() => handleSelectAll(assets)}
                                  style={{ transform: "scale(1.2)" }}
                                />
                              </th>
                              <th>S.No</th>
                              <th>Printer ID</th>
                              <th>Printer Name</th>
                              <th>Type</th>
                              <th style={{ width: "300px", minWidth: "300px" }}>
                                Pricing
                              </th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentAssets.map((asset, index) => (
                              <tr
                                key={asset.id}
                                style={{
                                  borderBottom: "1px solid #e9ecef",
                                  backgroundColor:
                                    !asset.printerId || asset.printerId === ""
                                      ? "#fff5f5"
                                      : "transparent",
                                  borderLeft:
                                    !asset.printerId || asset.printerId === ""
                                      ? "4px solid #ef4444"
                                      : "none",
                                }}
                              >
                                <td
                                  style={{ textAlign: "center", width: "50px" }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedItems.includes(asset.id)}
                                    onChange={() => handleSelectItem(asset.id)}
                                    style={{ transform: "scale(1.2)" }}
                                  />
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  {startIndex + index + 1}
                                </td>
                                <td
                                  style={{
                                    padding: "12px 8px",
                                    verticalAlign: "top",
                                    fontSize: "13px",
                                  }}
                                >
                                  {editingAsset === asset.id ? (
                                    <input
                                      type="text"
                                      value={editFormData.printerId}
                                      onChange={(e) =>
                                        setEditFormData({
                                          ...editFormData,
                                          printerId: e.target.value,
                                        })
                                      }
                                      className="stock-table-input"
                                      placeholder="Enter Printer ID"
                                      style={{
                                        width: "100%",
                                        maxWidth: "120px",
                                        height: "32px",
                                        padding: "4px 8px",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        fontSize: "13px",
                                        textTransform: "uppercase",
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      {asset.printerId ? (
                                        <span
                                          style={{
                                            fontSize: "13px",
                                            fontWeight: "500",
                                          }}
                                        >
                                          {asset.printerId}
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            color: "#ef4444",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                          }}
                                        >
                                          ID Required
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td
                                  style={{
                                    padding: "12px 8px",
                                    verticalAlign: "top",
                                  }}
                                >
                                  {editingAsset === asset.id ? (
                                    <input
                                      type="text"
                                      value={editFormData.printerName}
                                      onChange={(e) =>
                                        setEditFormData({
                                          ...editFormData,
                                          printerName:
                                            e.target.value.toUpperCase(),
                                        })
                                      }
                                      className="stock-table-input"
                                      style={{
                                        width: "100%",
                                        maxWidth: "180px",
                                        height: "32px",
                                        padding: "4px 8px",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        fontSize: "13px",
                                        textTransform: "uppercase",
                                      }}
                                    />
                                  ) : (
                                    <span
                                      style={{
                                        fontSize: "13px",
                                        fontWeight: "500",
                                      }}
                                    >
                                      {asset.printerName}
                                    </span>
                                  )}
                                </td>
                                <td
                                  style={{
                                    padding: "12px 8px",
                                    verticalAlign: "top",
                                    textAlign: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      backgroundColor:
                                        asset.printerType === "LFP"
                                          ? "#e3f2fd"
                                          : asset.printerType === "SFP"
                                          ? "#fff3e0"
                                          : "#f3e5f5",
                                      color:
                                        asset.printerType === "LFP"
                                          ? "#1976d2"
                                          : asset.printerType === "SFP"
                                          ? "#f57c00"
                                          : "#7b1fa2",
                                      padding: "4px 8px",
                                      borderRadius: "12px",
                                      fontSize: "11px",
                                      fontWeight: "500",
                                      display: "inline-block",
                                      textAlign: "center",
                                      minWidth: "35px",
                                    }}
                                  >
                                    {asset.printerType || "Unknown"}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    padding: "12px 8px",
                                    verticalAlign: "top",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "2px",
                                    }}
                                  >
                                    {}
                                    {(asset.printerType === "MFP" ||
                                      asset.printerType === "SFP") && (
                                      <div style={{ marginBottom: "8px" }}>
                                        {asset.prices &&
                                        asset.prices.length > 0 ? (
                                          <div>
                                            <div
                                              style={{
                                                fontSize: "11px",
                                                fontWeight: "600",
                                                color: "#495057",
                                                marginBottom: "4px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                              }}
                                            >
                                              {asset.printerType} Services:
                                            </div>
                                            {asset.prices.map(
                                              (priceObj, priceIndex) => (
                                                <div
                                                  key={priceIndex}
                                                  style={{
                                                    display: "flex",
                                                    justifyContent:
                                                      "space-between",
                                                    alignItems: "center",
                                                    fontSize: "12px",
                                                    minHeight: "24px",
                                                    paddingBottom: "2px",
                                                    backgroundColor: "#f8f9fa",
                                                    padding: "4px 6px",
                                                    marginBottom: "2px",
                                                    borderRadius: "3px",
                                                    border: "1px solid #e9ecef",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      fontWeight: "500",
                                                      color: "#495057",
                                                    }}
                                                  >
                                                    {priceObj.size}
                                                  </span>
                                                  <div
                                                    style={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: "6px",
                                                    }}
                                                  >
                                                    <span
                                                      style={{
                                                        fontWeight: "600",
                                                        color: "#28a745",
                                                      }}
                                                    >
                                                      {formatCurrency(
                                                        priceObj.price
                                                      )}
                                                    </span>
                                                    <div
                                                      style={{
                                                        display: "flex",
                                                        gap: "2px",
                                                      }}
                                                    >
                                                      <button
                                                        onClick={() =>
                                                          handleDeleteMFPService(
                                                            asset.id,
                                                            priceObj.size
                                                          )
                                                        }
                                                        style={{
                                                          padding: "2px 4px",
                                                          fontSize: "9px",
                                                          backgroundColor:
                                                            "#dc3545",
                                                          color: "white",
                                                          border: "none",
                                                          borderRadius: "2px",
                                                          cursor: "pointer",
                                                          height: "18px",
                                                          minWidth: "18px",
                                                          display: "flex",
                                                          alignItems: "center",
                                                          justifyContent:
                                                            "center",
                                                        }}
                                                        title="Delete Service"
                                                      >
                                                        <FaTrash size={8} />
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        ) : (
                                          <div
                                            style={{
                                              fontSize: "11px",
                                              fontWeight: "600",
                                              color: "#6c757d",
                                              marginBottom: "4px",
                                              fontStyle: "italic",
                                            }}
                                          >
                                            No {asset.printerType} services
                                            configured
                                          </div>
                                        )}

                                        {}
                                        {addingNewService === asset.id ? (
                                          <div
                                            style={{
                                              backgroundColor: "#f8f9fa",
                                              padding: "8px",
                                              borderRadius: "4px",
                                              border: "1px solid #dee2e6",
                                              marginTop: "4px",
                                            }}
                                          >
                                            <div
                                              style={{
                                                fontSize: "10px",
                                                fontWeight: "600",
                                                marginBottom: "6px",
                                                color: "#495057",
                                              }}
                                            >
                                              Add New {asset.printerType}{" "}
                                              Service
                                            </div>
                                            <div
                                              style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "4px",
                                              }}
                                            >
                                              <input
                                                type="text"
                                                placeholder="Size (e.g., A4, A3, TOTAL LARGE)"
                                                value={newServiceData.size}
                                                onChange={(e) =>
                                                  setNewServiceData({
                                                    ...newServiceData,
                                                    size: e.target.value.toUpperCase(),
                                                  })
                                                }
                                                style={{
                                                  padding: "4px",
                                                  fontSize: "10px",
                                                  border: "1px solid #ced4da",
                                                  borderRadius: "3px",
                                                  textTransform: "uppercase",
                                                }}
                                              />
                                              <input
                                                type="number"
                                                placeholder="Price"
                                                value={newServiceData.price}
                                                onChange={(e) =>
                                                  setNewServiceData({
                                                    ...newServiceData,
                                                    price: e.target.value,
                                                  })
                                                }
                                                style={{
                                                  padding: "4px",
                                                  fontSize: "10px",
                                                  border: "1px solid #ced4da",
                                                  borderRadius: "3px",
                                                }}
                                              />
                                              <div
                                                style={{
                                                  display: "flex",
                                                  gap: "4px",
                                                  marginTop: "4px",
                                                }}
                                              >
                                                <button
                                                  onClick={() =>
                                                    handleSaveNewService(
                                                      asset.id
                                                    )
                                                  }
                                                  style={{
                                                    padding: "4px 8px",
                                                    fontSize: "10px",
                                                    backgroundColor: "#28a745",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "3px",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "2px",
                                                  }}
                                                >
                                                  <FaSave size={8} />
                                                  Save
                                                </button>
                                                <button
                                                  onClick={
                                                    handleCancelNewService
                                                  }
                                                  style={{
                                                    padding: "4px 8px",
                                                    fontSize: "10px",
                                                    backgroundColor: "#6c757d",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "3px",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "2px",
                                                  }}
                                                >
                                                  <FaTimes size={8} />
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() =>
                                              handleAddNewService(asset.id)
                                            }
                                            style={{
                                              padding: "4px 8px",
                                              fontSize: "10px",
                                              backgroundColor: "#007bff",
                                              color: "white",
                                              border: "none",
                                              borderRadius: "3px",
                                              cursor: "pointer",
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "4px",
                                              marginTop: "4px",
                                            }}
                                          >
                                            <FaPlus size={8} />
                                            Add {asset.printerType} Service
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {}
                                    {asset.printerType === "LFP" && (
                                      <div>
                                        {asset.jumboServices &&
                                        asset.jumboServices.length > 0 ? (
                                          <div>
                                            <div
                                              style={{
                                                fontSize: "11px",
                                                fontWeight: "600",
                                                color: "#495057",
                                                marginBottom: "4px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                              }}
                                            >
                                              LFP Services:
                                            </div>
                                            {asset.jumboServices.map(
                                              (jumboService, jumboIndex) => (
                                                <div
                                                  key={jumboIndex}
                                                  style={{
                                                    display: "flex",
                                                    justifyContent:
                                                      "space-between",
                                                    alignItems: "center",
                                                    fontSize: "12px",
                                                    minHeight: "24px",
                                                    paddingBottom: "2px",
                                                    backgroundColor:
                                                      editingJumboService ===
                                                      jumboService.id
                                                        ? "#fff3cd"
                                                        : "#f8f9fa",
                                                    padding: "4px 6px",
                                                    marginBottom: "2px",
                                                    borderRadius: "3px",
                                                    border:
                                                      editingJumboService ===
                                                      jumboService.id
                                                        ? "1px solid #ffeaa7"
                                                        : "1px solid #e9ecef",
                                                  }}
                                                >
                                                  {editingJumboService ===
                                                  jumboService.id ? (
                                                    <div
                                                      style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: "4px",
                                                        width: "100%",
                                                      }}
                                                    >
                                                      <div
                                                        style={{
                                                          display: "flex",
                                                          gap: "4px",
                                                          alignItems: "center",
                                                        }}
                                                      >
                                                        <input
                                                          type="text"
                                                          name="type"
                                                          value={
                                                            editJumboFormData.type ||
                                                            ""
                                                          }
                                                          onChange={
                                                            handleJumboInputChange
                                                          }
                                                          placeholder="Type"
                                                          style={{
                                                            width: "60px",
                                                            height: "20px",
                                                            padding: "2px 4px",
                                                            border:
                                                              "1px solid #ddd",
                                                            borderRadius: "3px",
                                                            fontSize: "10px",
                                                            textTransform:
                                                              "uppercase",
                                                          }}
                                                        />
                                                        <input
                                                          type="text"
                                                          name="size"
                                                          value={
                                                            editJumboFormData.size ||
                                                            ""
                                                          }
                                                          onChange={
                                                            handleJumboInputChange
                                                          }
                                                          placeholder="Size"
                                                          style={{
                                                            width: "40px",
                                                            height: "20px",
                                                            padding: "2px 4px",
                                                            border:
                                                              "1px solid #ddd",
                                                            borderRadius: "3px",
                                                            fontSize: "10px",
                                                            textTransform:
                                                              "uppercase",
                                                          }}
                                                        />
                                                        <input
                                                          type="text"
                                                          name="unitPrice"
                                                          value={
                                                            editJumboFormData.unitPrice ||
                                                            ""
                                                          }
                                                          onChange={
                                                            handleJumboInputChange
                                                          }
                                                          placeholder="Price"
                                                          style={{
                                                            width: "50px",
                                                            height: "20px",
                                                            padding: "2px 4px",
                                                            border:
                                                              "1px solid #ddd",
                                                            borderRadius: "3px",
                                                            fontSize: "10px",
                                                            textAlign: "right",
                                                          }}
                                                        />
                                                      </div>
                                                      <div
                                                        style={{
                                                          display: "flex",
                                                          gap: "4px",
                                                          justifyContent:
                                                            "center",
                                                        }}
                                                      >
                                                        <button
                                                          onClick={() =>
                                                            handleSaveJumboEdit(
                                                              jumboService.id
                                                            )
                                                          }
                                                          style={{
                                                            padding: "2px 6px",
                                                            fontSize: "9px",
                                                            backgroundColor:
                                                              "#28a745",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "3px",
                                                            cursor: "pointer",
                                                            height: "18px",
                                                            display: "flex",
                                                            alignItems:
                                                              "center",
                                                            gap: "2px",
                                                          }}
                                                        >
                                                          <FaSave size={7} />
                                                          Save
                                                        </button>
                                                        <button
                                                          onClick={
                                                            handleCancelJumboEdit
                                                          }
                                                          style={{
                                                            padding: "2px 6px",
                                                            fontSize: "9px",
                                                            backgroundColor:
                                                              "#6c757d",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "3px",
                                                            cursor: "pointer",
                                                            height: "18px",
                                                            display: "flex",
                                                            alignItems:
                                                              "center",
                                                            gap: "2px",
                                                          }}
                                                        >
                                                          <FaTimes size={7} />
                                                          Cancel
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <>
                                                      <span
                                                        style={{
                                                          fontWeight: "500",
                                                          color: "#495057",
                                                        }}
                                                      >
                                                        {jumboService.type} -{" "}
                                                        {jumboService.size}
                                                      </span>
                                                      <div
                                                        style={{
                                                          display: "flex",
                                                          alignItems: "center",
                                                          gap: "6px",
                                                        }}
                                                      >
                                                        <span
                                                          style={{
                                                            fontWeight: "600",
                                                            color: "#28a745",
                                                          }}
                                                        >
                                                          {formatCurrency(
                                                            jumboService.unitPrice
                                                          )}
                                                        </span>
                                                        <div
                                                          style={{
                                                            display: "flex",
                                                            gap: "2px",
                                                          }}
                                                        >
                                                          <button
                                                            onClick={() =>
                                                              handleEditJumboService(
                                                                jumboService
                                                              )
                                                            }
                                                            disabled={
                                                              editingJumboService !==
                                                              null
                                                            }
                                                            style={{
                                                              padding:
                                                                "2px 4px",
                                                              fontSize: "9px",
                                                              backgroundColor:
                                                                "#007bff",
                                                              color: "white",
                                                              border: "none",
                                                              borderRadius:
                                                                "2px",
                                                              cursor:
                                                                editingJumboService !==
                                                                null
                                                                  ? "not-allowed"
                                                                  : "pointer",
                                                              opacity:
                                                                editingJumboService !==
                                                                null
                                                                  ? 0.6
                                                                  : 1,
                                                              height: "18px",
                                                              minWidth: "18px",
                                                              display: "flex",
                                                              alignItems:
                                                                "center",
                                                              justifyContent:
                                                                "center",
                                                            }}
                                                            title="Edit Service"
                                                          >
                                                            <FaEdit size={8} />
                                                          </button>
                                                          <button
                                                            onClick={() =>
                                                              handleDeleteJumboService(
                                                                jumboService.id,
                                                                jumboService.type,
                                                                jumboService.size
                                                              )
                                                            }
                                                            disabled={
                                                              editingJumboService !==
                                                              null
                                                            }
                                                            style={{
                                                              padding:
                                                                "2px 4px",
                                                              fontSize: "9px",
                                                              backgroundColor:
                                                                "#dc3545",
                                                              color: "white",
                                                              border: "none",
                                                              borderRadius:
                                                                "2px",
                                                              cursor:
                                                                editingJumboService !==
                                                                null
                                                                  ? "not-allowed"
                                                                  : "pointer",
                                                              opacity:
                                                                editingJumboService !==
                                                                null
                                                                  ? 0.6
                                                                  : 1,
                                                              height: "18px",
                                                              minWidth: "18px",
                                                              display: "flex",
                                                              alignItems:
                                                                "center",
                                                              justifyContent:
                                                                "center",
                                                            }}
                                                            title="Delete Service"
                                                          >
                                                            <FaTrash size={8} />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    </>
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        ) : (
                                          <div
                                            style={{
                                              fontSize: "11px",
                                              fontWeight: "600",
                                              color: "#6c757d",
                                              marginBottom: "4px",
                                              fontStyle: "italic",
                                            }}
                                          >
                                            No LFP services configured
                                          </div>
                                        )}

                                        {}
                                        {addingJumboService === asset.id ? (
                                          <div
                                            style={{
                                              backgroundColor: "#f8f9fa",
                                              padding: "8px",
                                              borderRadius: "4px",
                                              border: "1px solid #dee2e6",
                                              marginTop: "4px",
                                            }}
                                          >
                                            <div
                                              style={{
                                                fontSize: "10px",
                                                fontWeight: "600",
                                                marginBottom: "6px",
                                                color: "#495057",
                                              }}
                                            >
                                              Add New LFP Configuration
                                            </div>
                                            <div
                                              style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "4px",
                                              }}
                                            >
                                              <input
                                                type="text"
                                                placeholder="Size (e.g., A4, A3, A2)"
                                                value={newJumboData.size}
                                                onChange={(e) =>
                                                  setNewJumboData({
                                                    ...newJumboData,
                                                    size: e.target.value.toUpperCase(),
                                                  })
                                                }
                                                style={{
                                                  padding: "4px",
                                                  fontSize: "10px",
                                                  border: "1px solid #ced4da",
                                                  borderRadius: "3px",
                                                  textTransform: "uppercase",
                                                }}
                                              />
                                              <input
                                                type="text"
                                                placeholder="Type (e.g., COLOUR, B&W, PHOTO PRINT)"
                                                value={newJumboData.type}
                                                onChange={(e) =>
                                                  setNewJumboData({
                                                    ...newJumboData,
                                                    type: e.target.value.toUpperCase(),
                                                  })
                                                }
                                                style={{
                                                  padding: "4px",
                                                  fontSize: "10px",
                                                  border: "1px solid #ced4da",
                                                  borderRadius: "3px",
                                                  textTransform: "uppercase",
                                                }}
                                              />
                                              <input
                                                type="number"
                                                placeholder="Unit Price"
                                                value={newJumboData.unitPrice}
                                                onChange={(e) =>
                                                  setNewJumboData({
                                                    ...newJumboData,
                                                    unitPrice: e.target.value,
                                                  })
                                                }
                                                style={{
                                                  padding: "4px",
                                                  fontSize: "10px",
                                                  border: "1px solid #ced4da",
                                                  borderRadius: "3px",
                                                }}
                                              />
                                              <div
                                                style={{
                                                  display: "flex",
                                                  gap: "4px",
                                                  marginTop: "4px",
                                                }}
                                              >
                                                <button
                                                  onClick={() =>
                                                    handleSaveJumboService(
                                                      asset.id
                                                    )
                                                  }
                                                  style={{
                                                    padding: "4px 8px",
                                                    fontSize: "10px",
                                                    backgroundColor: "#28a745",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "3px",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "2px",
                                                  }}
                                                >
                                                  <FaSave size={8} />
                                                  Save
                                                </button>
                                                <button
                                                  onClick={
                                                    handleCancelJumboService
                                                  }
                                                  style={{
                                                    padding: "4px 8px",
                                                    fontSize: "10px",
                                                    backgroundColor: "#6c757d",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "3px",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "2px",
                                                  }}
                                                >
                                                  <FaTimes size={8} />
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() =>
                                              handleAddJumboService(asset.id)
                                            }
                                            style={{
                                              padding: "4px 8px",
                                              fontSize: "10px",
                                              backgroundColor: "#17a2b8",
                                              color: "white",
                                              border: "none",
                                              borderRadius: "3px",
                                              cursor: "pointer",
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "4px",
                                              marginTop: "4px",
                                            }}
                                          >
                                            <FaPlus size={8} />
                                            Add LFP Service
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td
                                  style={{
                                    padding: "12px 8px",
                                    verticalAlign: "top",
                                    textAlign: "center",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "4px",
                                      alignItems: "center",
                                      justifyContent: "flex-start",
                                    }}
                                  >
                                    {editingAsset === asset.id ? (
                                      <>
                                        <button
                                          onClick={() =>
                                            handleSaveEdit(asset.id)
                                          }
                                          className="stock-save-button"
                                          style={{
                                            padding: "6px 8px",
                                            fontSize: "11px",
                                            width: "80px",
                                            height: "28px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "4px",
                                            borderRadius: "4px",
                                            backgroundColor: "#28a745",
                                            color: "white",
                                            border: "none",
                                            cursor: "pointer",
                                          }}
                                        >
                                          <span>Save</span>
                                        </button>
                                        <button
                                          onClick={handleCancelEdit}
                                          className="stock-cancel-button"
                                          style={{
                                            padding: "6px 8px",
                                            fontSize: "11px",
                                            width: "80px",
                                            height: "28px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "4px",
                                            borderRadius: "4px",
                                            backgroundColor: "#6c757d",
                                            color: "white",
                                            border: "none",
                                            cursor: "pointer",
                                          }}
                                        >
                                          <span>Cancel</span>
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleEdit(asset)}
                                          className="stock-save-button"
                                          disabled={
                                            editingJumboService !== null
                                          }
                                          style={{
                                            padding: "6px 8px",
                                            fontSize: "11px",
                                            width: "80px",
                                            height: "28px",
                                            opacity:
                                              editingJumboService !== null
                                                ? 0.6
                                                : 1,
                                            cursor:
                                              editingJumboService !== null
                                                ? "not-allowed"
                                                : "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "4px",
                                            borderRadius: "4px",
                                            backgroundColor: "#007bff",
                                            color: "white",
                                            border: "none",
                                          }}
                                        >
                                          <span>Edit</span>
                                        </button>
                                        <button
                                          onClick={() =>
                                            showInactivePrinters
                                              ? handleDeleteInactive(
                                                  asset.id,
                                                  asset.printerName
                                                )
                                              : handleDelete(
                                                  asset.id,
                                                  asset.printerName
                                                )
                                          }
                                          className="stock-cancel-button"
                                          disabled={
                                            editingJumboService !== null
                                          }
                                          style={{
                                            padding: "6px 8px",
                                            fontSize: "11px",
                                            width: "80px",
                                            height: "28px",
                                            opacity:
                                              editingJumboService !== null
                                                ? 0.6
                                                : 1,
                                            cursor:
                                              editingJumboService !== null
                                                ? "not-allowed"
                                                : "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "4px",
                                            borderRadius: "4px",
                                            backgroundColor: "#dc3545",
                                            color: "white",
                                            border: "none",
                                          }}
                                        >
                                          <span>Delete</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div
                          className="stock-pagination"
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "10px",
                            marginTop: "20px",
                            padding: "15px",
                            borderTop: "1px solid #e5e7eb",
                            backgroundColor: "#f8fafc",
                          }}
                        >
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="edit"
                            style={{
                              backgroundColor:
                                currentPage === 1 ? "#d1d5db" : "#3b82f6",
                              color: "white",
                              padding: "8px 12px",
                              fontSize: "12px",
                              minWidth: "auto",
                              border: "none",
                              borderRadius: "3px",
                              cursor:
                                currentPage === 1 ? "not-allowed" : "pointer",
                            }}
                          >
                            Previous
                          </button>

                          <div style={{ display: "flex", gap: "5px" }}>
                            {Array.from(
                              { length: totalPages },
                              (_, i) => i + 1
                            ).map((page) => (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className="edit"
                                style={{
                                  backgroundColor:
                                    currentPage === page
                                      ? "#4f46e5"
                                      : "#f3f4f6",
                                  color:
                                    currentPage === page ? "white" : "#374151",
                                  padding: "8px 12px",
                                  fontSize: "12px",
                                  minWidth: "40px",
                                  border: "none",
                                  borderRadius: "3px",
                                  cursor: "pointer",
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
                              backgroundColor:
                                currentPage === totalPages
                                  ? "#d1d5db"
                                  : "#3b82f6",
                              color: "white",
                              padding: "8px 12px",
                              fontSize: "12px",
                              minWidth: "auto",
                              border: "none",
                              borderRadius: "3px",
                              cursor:
                                currentPage === totalPages
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            Next
                          </button>

                          <span
                            style={{
                              marginLeft: "15px",
                              fontSize: "12px",
                              color: "#666",
                              fontWeight: "500",
                            }}
                          >
                            Showing {startIndex + 1}-
                            {Math.min(endIndex, assets.length)} of{" "}
                            {assets.length} printers
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="stock-no-data">
                <p>
                  No {showInactivePrinters ? "inactive" : "active"} printers
                  found for {selectedBranch}
                </p>
              </div>
            )}

            {!selectedBranch && (
              <div className="stock-no-data">
                <p>Please select a branch to view printers</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              minWidth: "400px",
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <FaTrash
                size={48}
                color="#dc3545"
                style={{ marginBottom: "15px" }}
              />
              <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>
                Confirm Bulk Delete
              </h3>
              <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                Are you sure you want to{" "}
                {showInactivePrinters ? "permanently delete" : "deactivate"}{" "}
                {selectedItems.length} selected printer(s)?
                <br />
                <strong>
                  This action{" "}
                  {showInactivePrinters
                    ? "cannot be undone"
                    : "can be reversed by showing inactive printers"}
                  .
                </strong>
              </p>
            </div>
            <div
              style={{ display: "flex", gap: "15px", justifyContent: "center" }}
            >
              <button
                onClick={cancelBulkDelete}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #ccc",
                  backgroundColor: "#f8f9fa",
                  color: "#333",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  backgroundColor: "#dc3545",
                  color: "white",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Delete {selectedItems.length} Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrinterList;
