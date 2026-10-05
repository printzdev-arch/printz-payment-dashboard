import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { FaTimes, FaPlus, FaEdit, FaTrash, FaSave } from "react-icons/fa";
import {
  Printer,
  Building2,
  Check,
  Trash2,
  Pencil,
  Plus,
  X,
  Save,
  AlertTriangle,
  ChevronDown,
  Square,
  CheckSquare,
  Eye,
  Tag,
  IndianRupee,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/printzTheme.css";
import Popup from "../common/Popup.jsx";
import { usePopup } from "../../hooks/usePopup";
import Pagination from "../common/Pagination.jsx";
import BranchSelect from "../common/BranchSelect.jsx";

const PrinterList = () => {
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState([]);
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editingJumboService, setEditingJumboService] = useState(null);
  const [editJumboFormData, setEditJumboFormData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showInactivePrinters, setShowInactivePrinters] = useState(false);
  const [printerToDelete, setPrinterToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Printer View & Edit Popup Modal States
  const [selectedPrinterModal, setSelectedPrinterModal] = useState(null);
  const [isModalEditMode, setIsModalEditMode] = useState(false);
  const [modalFormData, setModalFormData] = useState({
    printerName: "",
    printerId: "",
    printerType: "MFP",
    branchName: "",
    location: "",
    description: "",
    prices: [],
    jumboServices: [],
  });
  const [isSavingModal, setIsSavingModal] = useState(false);

  const { popup, showSuccess, showError } = usePopup();

  const fetchBranches = useCallback(async () => {
    try {
      const res = await api.get("/branches");
      const branchesData = (res.data?.data || []).map((doc) => ({
        name: doc.name || doc.branchName,
        id: doc.id || doc._id,
      }));

      const sortedBranches = branchesData.sort((a, b) => {
        const nameA = (a.name || "").trim().toLowerCase();
        const nameB = (b.name || "").trim().toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      setBranches(sortedBranches);
    } catch (error) {
      showError("Error fetching branches: " + (error?.response?.data?.message || error.message));
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
      const res = await api.get(`/printers?branchName=${encodeURIComponent(selectedBranch)}`);
      const allPrinters = res.data?.data || [];
      const filteredPrinters = allPrinters.filter((p) =>
        showInactivePrinters ? p.isActive === false : (p.isActive === true || p.isActive === undefined)
      );

      const assetsData = [];

      for (const p of filteredPrinters) {
        const printerData = { id: p.id || p._id, ...p };

        if (printerData.printerType === "LFP") {
          try {
            const jRes = await api.get(
              `/jumbo-xerox/machines?printerId=${encodeURIComponent(printerData.printerId)}&branch=${encodeURIComponent(selectedBranch)}&isActive=true`
            );
            printerData.jumboServices = (jRes.data?.data || []).map((jDoc) => ({
              id: jDoc.id || jDoc._id,
              ...jDoc,
            }));
          } catch (err) {
            console.error("Error loading jumbo services for printer:", err);
            printerData.jumboServices = [];
          }
        }

        assetsData.push(printerData);
      }

      setAssets(
        assetsData.sort((a, b) => (a.printerName || "").localeCompare(b.printerName || ""))
      );
    } catch (error) {
      showError("Error fetching printers: " + (error?.response?.data?.message || error.message));
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

  const handleOpenViewModal = (printer) => {
    setSelectedPrinterModal(printer);
    setIsModalEditMode(false);
    setModalFormData({
      printerName: printer.printerName || "",
      printerId: printer.printerId || "",
      printerType: printer.printerType || "MFP",
      branchName: printer.branchName || selectedBranch || "",
      location: printer.location || "",
      description: printer.description || "",
      prices: Array.isArray(printer.prices)
        ? printer.prices.map((p) => ({
            size: p.size || "",
            price: p.price ?? 0,
          }))
        : [],
      jumboServices: Array.isArray(printer.jumboServices)
        ? printer.jumboServices.map((j) => ({
            id: j.id,
            size: j.size || "",
            type: j.type || "",
            unitPrice: j.unitPrice ?? 0,
          }))
        : [],
    });
  };

  const handleOpenEditModal = (printer) => {
    setSelectedPrinterModal(printer);
    setIsModalEditMode(true);
    setModalFormData({
      printerName: printer.printerName || "",
      printerId: printer.printerId || "",
      printerType: printer.printerType || "MFP",
      branchName: printer.branchName || selectedBranch || "",
      location: printer.location || "",
      description: printer.description || "",
      prices: Array.isArray(printer.prices)
        ? printer.prices.map((p) => ({
            size: p.size || "",
            price: p.price ?? 0,
          }))
        : [],
      jumboServices: Array.isArray(printer.jumboServices)
        ? printer.jumboServices.map((j) => ({
            id: j.id,
            size: j.size || "",
            type: j.type || "",
            unitPrice: j.unitPrice ?? 0,
          }))
        : [],
    });
  };

  const handleCloseModal = () => {
    setSelectedPrinterModal(null);
    setIsModalEditMode(false);
  };

  const handleSaveModal = async () => {
    if (!modalFormData.printerName.trim()) {
      showError("Validation Error", "Printer name cannot be empty");
      return;
    }

    if (!modalFormData.printerId.trim()) {
      showError("Validation Error", "Printer ID cannot be empty");
      return;
    }

    setIsSavingModal(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      const printerIdDoc = selectedPrinterModal.id;
      const oldPrinterId = selectedPrinterModal.printerId;
      const newPrinterId = modalFormData.printerId.trim().toUpperCase();
      const newPrinterName = modalFormData.printerName.trim().toUpperCase();

      const updateData = {
        printerName: newPrinterName,
        printerId: newPrinterId,
        printerType: modalFormData.printerType || "MFP",
        prices: modalFormData.prices.map((p) => ({
          size: (p.size || "").trim().toUpperCase(),
          price: Number(p.price) || 0,
        })),
        description: (modalFormData.description || "").trim(),
        needsPrinterIdUpdate: false,
        updatedBy: currentUser?.email || "Unknown",
        updatedDate: new Date(),
      };

      if (modalFormData.location) {
        updateData.location = modalFormData.location.trim();
      }

      await api.put(`/printers/${printerIdDoc}`, updateData);

      // If printer ID or name changed, update all related JumboXerox documents
      if (
        oldPrinterId &&
        (oldPrinterId !== newPrinterId ||
          selectedPrinterModal.printerName !== newPrinterName)
      ) {
        try {
          const jRes = await api.get(
            `/jumbo-xerox/machines?printerId=${encodeURIComponent(oldPrinterId)}&branch=${encodeURIComponent(selectedBranch)}&isActive=true`
          );
          const jList = jRes.data?.data || [];
          for (const jumboDoc of jList) {
            await api.post("/jumbo-xerox/machines", {
              id: jumboDoc.id || jumboDoc._id,
              printerId: newPrinterId,
              printerName: newPrinterName,
              updatedBy: currentUser?.email || "Unknown",
              updatedDate: new Date(),
            });
          }
        } catch (err) {
          console.error("Error updating jumbo xerox for printer:", err);
        }
      }

      // Also if LFP jumboServices were edited
      if (
        modalFormData.printerType === "LFP" &&
        modalFormData.jumboServices?.length > 0
      ) {
        for (const jService of modalFormData.jumboServices) {
          if (jService.id) {
            await api.post("/jumbo-xerox/machines", {
              id: jService.id,
              size: (jService.size || "").toUpperCase(),
              type: (jService.type || "").toUpperCase(),
              unitPrice: Number(jService.unitPrice) || 0,
              updatedAt: new Date(),
            });
          }
        }
      }

      showSuccess(
        "Printer Updated Successfully",
        `Printer "${newPrinterName}" has been updated successfully.`
      );

      setSelectedPrinterModal((prev) => ({
        ...prev,
        ...updateData,
        jumboServices: modalFormData.jumboServices,
      }));
      setIsModalEditMode(false);
      fetchAssets();
    } catch (error) {
      console.error("Error updating printer:", error);
      showError("Update Failed", "Failed to update printer: " + (error?.response?.data?.message || error.message));
    } finally {
      setIsSavingModal(false);
    }
  };

  const handleView = (asset) => {
    handleOpenViewModal(asset);
  };

  const handleEdit = (asset) => {
    handleOpenEditModal(asset);
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

      // Update the printer document
      await api.put(`/printers/${assetId}`, {
        printerName: newPrinterName,
        printerId: newPrinterId,
        prices: editFormData.prices,
        description: (editFormData.description || "").trim(),
        needsPrinterIdUpdate: false,
        updatedBy: currentUser?.email || "Unknown",
        updatedDate: new Date(),
      });

      // If printer ID or name changed, update all related JumboXerox documents
      if (
        oldPrinterId &&
        (oldPrinterId !== newPrinterId ||
          currentAsset.printerName !== newPrinterName)
      ) {
        try {
          const jRes = await api.get(
            `/jumbo-xerox/machines?printerId=${encodeURIComponent(oldPrinterId)}&branch=${encodeURIComponent(selectedBranch)}&isActive=true`
          );
          const jList = jRes.data?.data || [];
          for (const jumboDoc of jList) {
            await api.post("/jumbo-xerox/machines", {
              id: jumboDoc.id || jumboDoc._id,
              printerId: newPrinterId,
              printerName: newPrinterName,
              updatedBy: currentUser?.email || "Unknown",
              updatedDate: new Date(),
            });
          }
        } catch (err) {
          console.error("Error updating jumbo machines on printer change:", err);
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
        `Failed to update printer "${editFormData.printerName}". Error: ${error?.response?.data?.message || error.message}. Please check your input and try again.`,
        "Printer Update Failed"
      );
    }
  };

  const handleRequestDelete = (asset) => {
    setPrinterToDelete(asset);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePrinter = async () => {
    if (!printerToDelete) return;
    const { id, printerName } = printerToDelete;
    setShowDeleteConfirm(false);
    setPrinterToDelete(null);

    if (showInactivePrinters) {
      await handleDeleteInactive(id, printerName);
    } else {
      await handleDelete(id, printerName);
    }
  };

  const cancelDeletePrinter = () => {
    setShowDeleteConfirm(false);
    setPrinterToDelete(null);
  };

  const handleDelete = async (assetId, printerName) => {
    try {
      await api.put(`/printers/${assetId}`, {
        isActive: false,
      });
      showSuccess(`Printer "${printerName || ""}" deactivated successfully`);
      fetchAssets();
    } catch (error) {
      showError("Failed to deactivate printer: " + (error?.response?.data?.message || error.message));
    }
  };

  const handleDeleteInactive = async (assetId, printerName) => {
    try {
      await api.delete(`/printers/${assetId}`);
      showSuccess(`Printer "${printerName || ""}" permanently deleted successfully`);
      fetchAssets();
    } catch (error) {
      showError("Failed to permanently delete printer: " + (error?.response?.data?.message || error.message));
    }
  };

  const handleDeleteMFPService = async (printerId, serviceSize) => {
    try {
      const printer = assets.find((asset) => asset.id === printerId);
      const updatedPrices = (printer.prices || []).filter(
        (price) => price.size !== serviceSize
      );

      await api.put(`/printers/${printerId}`, {
        prices: updatedPrices,
        updatedDate: new Date(),
      });

      showSuccess("Service deleted successfully");
      fetchAssets();
    } catch (error) {
      showError("Failed to delete service: " + (error?.response?.data?.message || error.message));
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
        id: serviceId,
        size: editJumboFormData.size,
        type: editJumboFormData.type,
        unitPrice: Number.parseFloat(editJumboFormData.unitPrice),
        updatedAt: new Date(),
      };

      await api.post("/jumbo-xerox/machines", jumboXeroxData);

      showSuccess(
        `LFP service "${editJumboFormData.type} - ${editJumboFormData.size}" has been updated successfully. Unit price: ₹${editJumboFormData.unitPrice}`,
        "LFP Service Updated"
      );

      setEditingJumboService(null);
      setEditJumboFormData({});
      fetchAssets();
    } catch (error) {
      showError(
        `Failed to update LFP service. Error: ${error?.response?.data?.message || error.message}. Please check your input and try again.`,
        "LFP Service Update Failed"
      );
    }
  };

  const handleDeleteJumboService = async (
    serviceId,
    serviceType,
    serviceSize
  ) => {
    try {
      await api.delete(`/jumbo-xerox/machines/${serviceId}`);

      showSuccess(
        `LFP service "${serviceType} - ${serviceSize}" has been deleted successfully.`,
        "LFP Service Deleted"
      );

      fetchAssets();
    } catch (error) {
      showError(
        `Failed to delete LFP service "${serviceType} - ${serviceSize}". Error: ${error?.response?.data?.message || error.message}`,
        "LFP Service Delete Failed"
      );
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

      await api.put(`/printers/${printerId}`, {
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

      await api.post("/jumbo-xerox/machines", {
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
          api.delete(`/printers/${assetId}`)
        );
        await Promise.all(promises);
        showSuccess(
          `Successfully permanently deleted ${selectedItems.length} printer(s)`
        );
      } else {
        // Soft delete for active printers
        const promises = selectedItems.map((assetId) =>
          api.put(`/printers/${assetId}`, { isActive: false })
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
      showError("Failed to delete selected printers: " + (error?.response?.data?.message || error.message));
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
    <div className="printer-list-page-container">
      <Popup {...popup} />

      {/* Full Header Banner - Signature Green gradient banner without illustration */}
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
            Printer <span className="highlight" style={{ color: "#059669" }}>List</span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            View, configure hardware details, and manage service rate sheets.
          </p>
        </div>
      </div>

      {/* Section 1: Store & Filter Toolbar Card */}
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
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setCurrentPage(1);
                }}
                branches={branches}
                placeholder="Select Branch"
                allowAll={true}
                allOptionLabel="Select Branch"
              />
            </div>

            {selectedBranch && (
              <div className="printer-branch-status-badge">
                <span className="printer-status-dot"></span>
                <span>
                  <strong>{assets.length}</strong> printer{assets.length !== 1 ? "s" : ""} in {selectedBranch}
                </span>
              </div>
            )}
          </div>

          <div className="printer-filter-right">
            <button
              type="button"
              className={`printer-inactive-toggle-pill ${showInactivePrinters ? "active" : ""}`}
              onClick={() => {
                setShowInactivePrinters(!showInactivePrinters);
                setCurrentPage(1);
              }}
            >
              <span className="printer-inactive-indicator">
                {showInactivePrinters && <Check size={13} strokeWidth={3} />}
              </span>
              <span>Show Inactive Printers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Main Hardware Inventory Table Card */}
      <div className="printer-section-card printer-table-card">
        <div className="printer-services-header-row">
          <div className="printer-services-header-left">
            <div className="printer-services-tag-icon">
              <Printer size={20} color="#059669" />
            </div>
            <div>
              <h4 className="printer-services-title">
                {selectedBranch ? `Printers in ${selectedBranch}` : "Store Hardware Inventory"}
              </h4>
            </div>
          </div>
          

          {assets.length > 0 && (
            <div className="printer-table-header-tools">
              <button
                type="button"
                className={`printer-select-all-pill ${selectAll ? "active" : ""}`}
                onClick={() => handleSelectAll(assets)}
              >
                {selectAll ? (
                  <CheckSquare size={16} color="#047857" />
                ) : (
                  <Square size={16} color="#64748b" />
                )}
                <span>
                  {selectAll ? "Deselect All" : `Select All (${assets.length})`}
                </span>
              </button>

              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="printer-bulk-delete-btn"
                >
                  <Trash2 size={14} />
                  <span>Delete Selected ({selectedItems.length})</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {isLoading ? (
            <div className="printer-empty-state">
              <div className="stock-loading-spinner" style={{ margin: "0 auto 12px" }}></div>
              <p style={{ color: "#64748b", margin: 0, fontSize: "14px", fontWeight: "500" }}>Loading printers...</p>
            </div>
          ) : !selectedBranch ? (
            <div className="printer-empty-state">
              <div className="printer-empty-icon-wrap">
                <Printer size={32} />
              </div>
              <h4 className="printer-empty-title">Please Select a Branch</h4>
              <p className="printer-empty-desc">
                Choose a store location from the dropdown above to load hardware inventory and rates.
              </p>
            </div>
          ) : assets.length > 0 ? (
            <>
              {(() => {
                const totalPages = Math.ceil(assets.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const currentAssets = assets.slice(startIndex, endIndex);

                const handlePageChange = (page) => {
                  setCurrentPage(page);
                };

                return (
                  <div>
                    <div className="printer-table-scroll">
                      <table className="printer-modern-table">
                        <thead>
                          <tr>
                            <th style={{ width: "48px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={() => handleSelectAll(assets)}
                                style={{
                                  width: "16px",
                                  height: "16px",
                                  accentColor: "#059669",
                                  cursor: "pointer",
                                }}
                              />
                            </th>
                            <th style={{ width: "60px", textAlign: "center" }}>
                              S.No
                            </th>
                            <th style={{ width: "140px" }}>Printer ID</th>
                            <th style={{ minWidth: "220px" }}>Printer Name</th>
                            <th style={{ textAlign: "center", width: "120px" }}>
                              Type
                            </th>
                            <th
                              style={{
                                width: "140px",
                                textAlign: "center",
                              }}
                            >
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentAssets.map((asset, index) => (
                            <tr
                              key={asset.id}
                              className={
                                !asset.printerId || asset.printerId === ""
                                  ? "row-needs-id"
                                  : ""
                              }
                            >
                              <td
                                style={{ textAlign: "center", width: "48px" }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedItems.includes(asset.id)}
                                  onChange={() => handleSelectItem(asset.id)}
                                  style={{
                                    width: "16px",
                                    height: "16px",
                                    accentColor: "#059669",
                                    cursor: "pointer",
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  color: "#64748b",
                                  fontWeight: "600",
                                }}
                              >
                                {startIndex + index + 1}
                              </td>
                              <td
                                style={{
                                  verticalAlign: "top",
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
                                    className="printer-table-edit-input"
                                    placeholder="Enter ID"
                                    style={{
                                      maxWidth: "130px",
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
                                      <span className="printer-id-badge">
                                        {asset.printerId}
                                      </span>
                                    ) : (
                                      <span className="printer-id-missing-badge">
                                        <AlertTriangle size={12} /> ID Required
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td
                                style={{
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
                                    className="printer-table-edit-input"
                                    placeholder="Printer Name"
                                    style={{
                                      maxWidth: "200px",
                                      textTransform: "uppercase",
                                    }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      fontSize: "13.5px",
                                      fontWeight: "600",
                                      color: "#0f172a",
                                    }}
                                  >
                                    {asset.printerName}
                                  </span>
                                )}
                              </td>
                              <td
                                style={{
                                  verticalAlign: "top",
                                  textAlign: "center",
                                }}
                              >
                                <span
                                  className={`printer-type-pill ${(
                                    asset.printerType || "mfp"
                                  ).toLowerCase()}`}
                                >
                                  {asset.printerType || "Standard"}
                                </span>
                              </td>
                              <td
                                style={{
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
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "6px",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSaveEdit(asset.id)
                                        }
                                        className="printer-btn-edit"
                                        title="Save Changes"
                                      >
                                        <Save size={15} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="printer-btn-delete"
                                        title="Cancel"
                                      >
                                        <X size={15} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      className="printer-actions-cell"
                                      style={{ justifyContent: "center" }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleView(asset)}
                                        className="printer-btn-view"
                                        title="View Details"
                                      >
                                        <Eye size={15} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleEdit(asset)}
                                        className="printer-btn-edit"
                                        title="Edit Details"
                                      >
                                        <Pencil size={15} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRequestDelete(asset)}
                                        className="printer-btn-delete"
                                        disabled={editingJumboService !== null}
                                        title={
                                          showInactivePrinters
                                            ? "Permanently Delete"
                                            : "Deactivate"
                                        }
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {assets.length > 0 && (
                      <Pagination
                        currentPage={currentPage}
                        totalItems={assets.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                        pageSizeOptions={[10, 20, 50, 100]}
                        itemLabel="printers"
                      />
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="printer-empty-state">
              <div className="printer-empty-icon-wrap">
                <Printer size={32} />
              </div>
              <h4 className="printer-empty-title">
                No {showInactivePrinters ? "inactive" : "active"} printers found
              </h4>
              <p className="printer-empty-desc">
                There are no {showInactivePrinters ? "inactive" : "active"} printers matching current criteria in {selectedBranch}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteConfirm && (
        <div className="printer-modal-overlay">
          <div className="printer-modal-box">
            <div className="printer-modal-alert-icon">
              <Trash2 size={28} />
            </div>
            <h3 className="printer-modal-title">Confirm Bulk Action</h3>
            <p className="printer-modal-text">
              Are you sure you want to{" "}
              <strong>
                {showInactivePrinters ? "permanently delete" : "deactivate"}
              </strong>{" "}
              {selectedItems.length} selected printer{selectedItems.length !== 1 ? "s" : ""}?
              <br />
              <span
                style={{
                  fontSize: "12.5px",
                  color: "#64748b",
                  display: "inline-block",
                  marginTop: "6px",
                }}
              >
                {showInactivePrinters
                  ? "This action is permanent and cannot be undone."
                  : "Printers can be reactivated by showing inactive printers."}
              </span>
            </p>
            <div className="printer-modal-actions">
              <button
                type="button"
                onClick={cancelBulkDelete}
                className="printer-modal-btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBulkDelete}
                className="printer-modal-btn-confirm"
              >
                Delete {selectedItems.length} Item{selectedItems.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Printer Delete Confirmation Dialog */}
      {showDeleteConfirm && printerToDelete && (
        <div className="printer-modal-overlay">
          <div className="printer-modal-box">
            <div className="printer-modal-alert-icon">
              <Trash2 size={28} />
            </div>
            <h3 className="printer-modal-title">
              {showInactivePrinters ? "Permanently Delete Printer?" : "Deactivate Printer?"}
            </h3>
            <p className="printer-modal-text">
              Are you sure you want to{" "}
              <strong>
                {showInactivePrinters ? "permanently delete" : "deactivate"}
              </strong>{" "}
              <strong>"{printerToDelete.printerName}"</strong>
              {printerToDelete.printerId ? ` (${printerToDelete.printerId})` : ""}?
              <br />
              <span
                style={{
                  fontSize: "12.5px",
                  color: "#64748b",
                  display: "inline-block",
                  marginTop: "6px",
                }}
              >
                {showInactivePrinters
                  ? "This action is permanent and cannot be undone."
                  : "This printer will be marked inactive. You can restore or permanently delete it from the inactive printers view."}
              </span>
            </p>
            <div className="printer-modal-actions">
              <button
                type="button"
                onClick={cancelDeletePrinter}
                className="printer-modal-btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePrinter}
                className="printer-modal-btn-confirm"
              >
                {showInactivePrinters ? "Permanently Delete" : "Deactivate Printer"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Printer View & Edit Popup Modal (Small, Comfortable & Premium) */}
      {selectedPrinterModal && (
        <div
          className="printer-details-modal-overlay"
          onClick={handleCloseModal}
        >
          <div
            className="printer-details-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="printer-details-modal-header">
              <div className="printer-details-modal-header-left">
                <div className="printer-details-modal-header-icon">
                  {isModalEditMode ? (
                    <Pencil size={18} />
                  ) : (
                    <Printer size={18} />
                  )}
                </div>
                <div>
                  <h3 className="printer-details-modal-title">
                    {isModalEditMode ? "Edit Printer" : "Printer Details"}
                  </h3>
                  <p className="printer-details-modal-subtitle">
                    {isModalEditMode
                      ? `Editing ${
                          modalFormData.printerId ||
                          modalFormData.printerName ||
                          "Printer"
                        }`
                      : `${selectedPrinterModal.printerId || "NO ID"} • ${
                          selectedPrinterModal.branchName || selectedBranch
                        }`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="printer-details-modal-close-btn"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="printer-details-modal-body">
              {!isModalEditMode ? (
                /* ================= VIEW MODE ================= */
                <>
                  {/* Overview Banner */}
                  <div className="printer-modal-banner">
                    <div className="printer-modal-banner-top">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span className="printer-modal-id-tag">
                          {(
                            selectedPrinterModal.printerId || "NO ID"
                          ).toUpperCase()}
                        </span>
                        <span className="printer-modal-type-chip">
                          {(
                            selectedPrinterModal.printerType || "MFP"
                          ).toUpperCase()}
                        </span>
                      </div>
                      <span
                        className={`printer-modal-status-badge ${
                          selectedPrinterModal.isActive !== false
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {selectedPrinterModal.isActive !== false
                          ? "Active Hardware"
                          : "Inactive / Disabled"}
                      </span>
                    </div>
                    <div className="printer-modal-name-text">
                      {selectedPrinterModal.printerName}
                    </div>
                  </div>

                  {/* 2-col info cards */}
                  <div className="printer-modal-grid">
                    <div className="printer-modal-card">
                      <span className="printer-modal-card-label">
                        <Tag size={12} color="#059669" />
                        Hardware ID
                      </span>
                      <span className="printer-modal-card-value">
                        {selectedPrinterModal.printerId || "Not Assigned"}
                      </span>
                    </div>

                    <div className="printer-modal-card">
                      <span className="printer-modal-card-label">
                        <Building2 size={12} color="#059669" />
                        Branch / Store
                      </span>
                      <span className="printer-modal-card-value">
                        {selectedPrinterModal.branchName || selectedBranch}
                      </span>
                    </div>

                    <div className="printer-modal-card">
                      <span className="printer-modal-card-label">
                        <Printer size={12} color="#059669" />
                        Category Type
                      </span>
                      <span className="printer-modal-card-value">
                        {selectedPrinterModal.printerType === "LFP"
                          ? "Large Format (LFP)"
                          : "Multi-Function (MFP)"}
                      </span>
                    </div>

                    <div className="printer-modal-card">
                      <span className="printer-modal-card-label">
                        <Layers size={12} color="#059669" />
                        Configured Rates
                      </span>
                      <span className="printer-modal-card-value">
                        {selectedPrinterModal.printerType === "LFP"
                          ? `${
                              selectedPrinterModal.jumboServices?.length || 0
                            } Jumbo Services`
                          : `${
                              selectedPrinterModal.prices?.length || 0
                            } Page Sizes`}
                      </span>
                    </div>
                  </div>

                  {/* Description / Notes if present */}
                  {selectedPrinterModal.description && (
                    <div className="printer-modal-card">
                      <span className="printer-modal-card-label">
                        Description / Notes
                      </span>
                      <span
                        className="printer-modal-card-value"
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 500,
                          color: "#475569",
                        }}
                      >
                        {selectedPrinterModal.description}
                      </span>
                    </div>
                  )}

                  {/* Services & Pricing Rates Section */}
                  <div className="printer-modal-pricing-section">
                    <h4 className="printer-modal-section-title">
                      <IndianRupee size={14} color="#059669" />
                      <span>
                        {selectedPrinterModal.printerType === "LFP"
                          ? "Jumbo Xerox Rate Sheet"
                          : "Printing Service Rates"}
                      </span>
                    </h4>

                    {selectedPrinterModal.printerType === "LFP" ? (
                      selectedPrinterModal.jumboServices &&
                      selectedPrinterModal.jumboServices.length > 0 ? (
                        <table className="printer-modal-pricing-table">
                          <thead>
                            <tr>
                              <th style={{ width: "36px" }}>#</th>
                              <th>Size</th>
                              <th>Type</th>
                              <th style={{ textAlign: "right" }}>Rate (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPrinterModal.jumboServices.map(
                              (j, idx) => (
                                <tr key={j.id || idx}>
                                  <td
                                    style={{
                                      color: "#64748b",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {idx + 1}
                                  </td>
                                  <td style={{ fontWeight: 600 }}>{j.size}</td>
                                  <td>{j.type}</td>
                                  <td
                                    style={{
                                      textAlign: "right",
                                      fontWeight: 700,
                                      color: "#059669",
                                    }}
                                  >
                                    {formatCurrency(j.unitPrice)}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      ) : (
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "#64748b",
                            fontStyle: "italic",
                          }}
                        >
                          No Jumbo Xerox services configured yet.
                        </p>
                      )
                    ) : selectedPrinterModal.prices &&
                      selectedPrinterModal.prices.length > 0 ? (
                      <table className="printer-modal-pricing-table">
                        <thead>
                          <tr>
                            <th style={{ width: "36px" }}>#</th>
                            <th>Page Size</th>
                            <th style={{ textAlign: "right" }}>Rate (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPrinterModal.prices.map((p, idx) => (
                            <tr key={idx}>
                              <td
                                style={{
                                  color: "#64748b",
                                  fontWeight: 600,
                                }}
                              >
                                {idx + 1}
                              </td>
                              <td style={{ fontWeight: 600 }}>{p.size}</td>
                              <td
                                style={{
                                  textAlign: "right",
                                  fontWeight: 700,
                                  color: "#059669",
                                }}
                              >
                                {formatCurrency(p.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          color: "#64748b",
                          fontStyle: "italic",
                        }}
                      >
                        No page sizes configured yet.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                /* ================= EDIT MODE ================= */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveModal();
                  }}
                  id="printer-details-form"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div className="printer-modal-form-grid">
                    <div className="printer-modal-field">
                      <label className="printer-modal-label">
                        <Tag size={12} color="#059669" />
                        <span>Printer ID</span>
                        <span style={{ color: "#e11d48" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={modalFormData.printerId}
                        onChange={(e) =>
                          setModalFormData((prev) => ({
                            ...prev,
                            printerId: e.target.value.toUpperCase(),
                          }))
                        }
                        className="printer-modal-input"
                        placeholder="e.g. PRN-01"
                        required
                      />
                    </div>

                    <div className="printer-modal-field">
                      <label className="printer-modal-label">
                        <Printer size={12} color="#059669" />
                        <span>Printer Type</span>
                      </label>
                      <select
                        value={modalFormData.printerType}
                        onChange={(e) =>
                          setModalFormData((prev) => ({
                            ...prev,
                            printerType: e.target.value,
                          }))
                        }
                        className="printer-modal-select"
                      >
                        <option value="MFP">MFP (Multi-Function)</option>
                        <option value="LFP">LFP (Large Format / Jumbo)</option>
                      </select>
                    </div>

                    <div className="printer-modal-field full-width">
                      <label className="printer-modal-label">
                        <span>Printer Name</span>
                        <span style={{ color: "#e11d48" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={modalFormData.printerName}
                        onChange={(e) =>
                          setModalFormData((prev) => ({
                            ...prev,
                            printerName: e.target.value.toUpperCase(),
                          }))
                        }
                        className="printer-modal-input"
                        placeholder="e.g. CANON IR ADVANCE 4525"
                        required
                      />
                    </div>

                    <div className="printer-modal-field full-width">
                      <label className="printer-modal-label">
                        <span>Description / Location Notes</span>
                      </label>
                      <input
                        type="text"
                        value={modalFormData.description}
                        onChange={(e) =>
                          setModalFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="printer-modal-input"
                        placeholder="e.g. Ground Floor, Right Wing"
                      />
                    </div>
                  </div>

                  {/* Rates Editor */}
                  <div className="printer-modal-pricing-section">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <h4 className="printer-modal-section-title">
                        <IndianRupee size={14} color="#059669" />
                        <span>
                          {modalFormData.printerType === "LFP"
                            ? "Edit Jumbo Xerox Rates"
                            : "Edit Page Size Rates"}
                        </span>
                      </h4>
                      {modalFormData.printerType !== "LFP" && (
                        <button
                          type="button"
                          onClick={() =>
                            setModalFormData((prev) => ({
                              ...prev,
                              prices: [
                                ...prev.prices,
                                { size: "", price: 0 },
                              ],
                            }))
                          }
                          className="printer-modal-add-btn"
                        >
                          <Plus size={13} />
                          <span>Add Size</span>
                        </button>
                      )}
                    </div>

                    {modalFormData.printerType === "LFP" ? (
                      modalFormData.jumboServices?.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {modalFormData.jumboServices.map((j, jIdx) => (
                            <div
                              key={j.id || jIdx}
                              className="printer-modal-tier-row"
                            >
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  width: "70px",
                                  color: "#334155",
                                }}
                              >
                                {j.size}
                              </span>
                              <span
                                style={{
                                  fontSize: "12px",
                                  width: "90px",
                                  color: "#64748b",
                                }}
                              >
                                {j.type}
                              </span>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  flex: 1,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "12px",
                                    color: "#64748b",
                                    fontWeight: 600,
                                  }}
                                >
                                  ₹
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={j.unitPrice}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setModalFormData((prev) => {
                                      const updated = [...prev.jumboServices];
                                      updated[jIdx] = {
                                        ...updated[jIdx],
                                        unitPrice: Number(val) || 0,
                                      };
                                      return {
                                        ...prev,
                                        jumboServices: updated,
                                      };
                                    });
                                  }}
                                  className="printer-modal-tier-input"
                                  style={{ width: "100%" }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "#64748b",
                          }}
                        >
                          No Jumbo Xerox services to edit.
                        </p>
                      )
                    ) : modalFormData.prices?.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        {modalFormData.prices.map((p, pIdx) => (
                          <div key={pIdx} className="printer-modal-tier-row">
                            <input
                              type="text"
                              value={p.size}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setModalFormData((prev) => {
                                  const updated = [...prev.prices];
                                  updated[pIdx] = {
                                    ...updated[pIdx],
                                    size: val,
                                  };
                                  return { ...prev, prices: updated };
                                });
                              }}
                              className="printer-modal-tier-input"
                              placeholder="Size (e.g. A4)"
                              style={{
                                width: "110px",
                                textTransform: "uppercase",
                              }}
                              required
                            />
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                flex: 1,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "#64748b",
                                  fontWeight: 600,
                                }}
                              >
                                ₹
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={p.price}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setModalFormData((prev) => {
                                    const updated = [...prev.prices];
                                    updated[pIdx] = {
                                      ...updated[pIdx],
                                      price: Number(val) || 0,
                                    };
                                    return { ...prev, prices: updated };
                                  });
                                }}
                                className="printer-modal-tier-input"
                                placeholder="Price"
                                style={{ width: "100%" }}
                                required
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setModalFormData((prev) => ({
                                  ...prev,
                                  prices: prev.prices.filter(
                                    (_, i) => i !== pIdx
                                  ),
                                }));
                              }}
                              className="printer-modal-tier-del"
                              title="Remove size"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          color: "#64748b",
                        }}
                      >
                        No rates defined. Click "+ Add Size" above to add one.
                      </p>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="printer-details-modal-footer">
              {!isModalEditMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsModalEditMode(true)}
                    className="printer-modal-btn-primary"
                  >
                    <Pencil size={14} />
                    <span>Edit Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="printer-modal-btn-cancel"
                  >
                    <span>Close</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveModal}
                    disabled={isSavingModal}
                    className="printer-modal-btn-primary"
                  >
                    <Save size={14} />
                    <span>{isSavingModal ? "Saving..." : "Save Changes"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalEditMode(false)}
                    className="printer-modal-btn-cancel"
                  >
                    <span>Cancel</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrinterList;
