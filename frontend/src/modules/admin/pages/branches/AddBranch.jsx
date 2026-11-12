import React, { useState, useEffect } from "react";
import { getBranches, createBranch, updateBranch, deleteBranch } from "../../api";
import Popup from "../../../../shared/ui/Popup/Popup.jsx";
import { usePopup } from "../../../../shared/hooks/usePopup";
import DataTable from "../../../../shared/ui/DataTable/DataTable";
import BranchIllustration from "../../../../shared/assets/illustrations/BranchIllustration";
import "react-toastify/dist/ReactToastify.css";

import "../../../../shared/styles/printzTheme.css";
import "../../styles/addmanager.css";

import {
  Building2,
  MapPin,
  Store,
  Plus,
  Check,
  Calendar,
  TrendingUp,
  X,
  AlertCircle,
  Pencil,
  Tag,
  Phone,
  Layers,
  Factory,
} from "lucide-react";

const BRANCH_TYPES = [
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "warehouse", label: "Warehouse" },
  { value: "corporate", label: "Corporate" },
];

/* ---------------------------------------------------------------------- */
/*  SHARED MODAL STYLE TOKENS                                             */
/*  Matches AddAdmin sizing, spacing, shadows, and headers for 100%       */
/*  design consistency across the dashboard.                             */
/* ---------------------------------------------------------------------- */
const MODAL_OVERLAY_STYLE = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(15, 23, 42, 0.55)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  padding: "20px",
  boxSizing: "border-box",
};

const MODAL_CONTAINER_STYLE = {
  background: "#ffffff",
  borderRadius: "22px",
  width: "100%",
  maxWidth: "680px",
  maxHeight: "92vh",
  overflowY: "auto",
  overflowX: "hidden",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  border: "1px solid #f1f5f9",
  padding: "22px 26px",
  boxSizing: "border-box",
};

const MODAL_HEADER_ROW_STYLE = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
  borderBottom: "1px solid #f1f5f9",
  paddingBottom: "14px",
  gap: "12px",
};

const MODAL_HEADER_ICON_STYLE = {
  width: "40px",
  height: "40px",
  minWidth: "40px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #07d49b 0%, #03ae79 100%)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxShadow: "0 4px 12px rgba(3, 174, 121, 0.3)",
};

const MODAL_HEADER_TITLE_STYLE = {
  margin: 0,
  fontSize: "19px",
  fontWeight: 700,
  color: "#0f172a",
  letterSpacing: "-0.01em",
  lineHeight: 1.2,
};

const MODAL_HEADER_SUBTITLE_STYLE = {
  margin: "2px 0 0 0",
  fontSize: "12.5px",
  color: "#475569",
};

const MODAL_CLOSE_BTN_STYLE = {
  width: "32px",
  height: "32px",
  minWidth: "32px",
  maxWidth: "32px",
  borderRadius: "50%",
  background: "#f1f5f9",
  border: "none",
  cursor: "pointer",
  color: "#475569",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  boxSizing: "border-box",
  flexShrink: 0,
  transition: "all 0.15s ease",
};

const MODAL_FOOTER_STYLE = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: "10px",
  marginTop: "16px",
  paddingTop: "14px",
  borderTop: "1px solid #f1f5f9",
};

const MODAL_SECONDARY_BTN_STYLE = {
  background: "#ffffff",
  border: "1.5px solid #dce4ec",
  color: "#0f172a",
  fontWeight: 700,
  fontSize: "13px",
  borderRadius: "10px",
  padding: "8px 24px",
  cursor: "pointer",
  transition: "all 0.15s ease",
  boxSizing: "border-box",
};

const MODAL_PRIMARY_BTN_STYLE = {
  background: "linear-gradient(135deg, #07d49b 0%, #03ae79 100%)",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: "13px",
  borderRadius: "10px",
  padding: "8px 24px",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  boxShadow: "0 4px 12px rgba(3, 174, 121, 0.35)",
  transition: "all 0.15s ease",
  boxSizing: "border-box",
};

const AddBranch = () => {
  const { popup, showSuccess, showError } = usePopup();
  const [branches, setBranches] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchType, setBranchType] = useState("retail");
  const [manufacturingUnitId, setManufacturingUnitId] = useState("");
  const [editingBranch, setEditingBranch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // View and Delete modals matching AddAdmin
  const [viewingBranch, setViewingBranch] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await getBranches();
      const branchesData = (res.data?.data || []).map((b) => ({
        id: b.id || b._id,
        docId: b.id || b._id,
        name: b.name || b.branchName,
        code: b.code || "",
        address: b.address || b.location || "",
        location: b.location || b.address || "",
        date: b.date || (b.createdAt ? b.createdAt.split("T")[0] : ""),
        createdAt: b.createdAt || new Date().toISOString(),
        ...b,
      }));

      const sortedBranches = branchesData.sort((a, b) =>
        (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())
      );

      setBranches(sortedBranches);
    } catch (error) {
      console.error("Error fetching branches: ", error);
      showError(
        "Error Loading Branches",
        "Failed to fetch branches. Please refresh the page and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingBranch(null);
    setBranchName("");
    setBranchCode("");
    setBranchAddress("");
    setBranchPhone("");
    setBranchType("retail");
    setManufacturingUnitId("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBranch(null);
    setBranchName("");
    setBranchCode("");
    setBranchAddress("");
    setBranchPhone("");
    setBranchType("retail");
    setManufacturingUnitId("");
  };

  const manufacturingUnits = branches.filter(
    (b) =>
      String(b.branchType || "").toLowerCase() === "manufacturing" &&
      String(b.id || b._id) !== String(editingBranch?.id || editingBranch?._id || "")
  );

  const handleAddBranch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!branchName.trim() || !branchCode.trim() || !branchAddress.trim()) {
      showError(
        "Missing Information",
        "Please fill out all fields (Branch Name, Branch Code, and Address) before submitting"
      );
      return;
    }

    try {
      setLoading(true);
      const currentDate = new Date().toISOString().split("T")[0];

      const payload = {
        name: branchName.trim(),
        branchName: branchName.trim(),
        code: branchCode.trim().toUpperCase(),
        address: branchAddress.trim(),
        location: branchAddress.trim(),
        phone: branchPhone.trim(),
        branchType: branchType || "retail",
        manufacturingUnitId:
          branchType === "manufacturing" ? null : manufacturingUnitId || null,
        date: currentDate,
        isActive: true,
      };

      const res = await createBranch(payload);
      const createdBranch = res.data?.data || { id: Date.now(), ...payload };
      const newBranch = {
        id: createdBranch.id || createdBranch._id,
        docId: createdBranch.id || createdBranch._id,
        name: branchName.trim(),
        code: branchCode.trim().toUpperCase(),
        address: branchAddress.trim(),
        location: branchAddress.trim(),
        date: currentDate,
        createdAt: createdBranch.createdAt || new Date().toISOString(),
        ...createdBranch,
      };

      setBranches((prev) => [...prev, newBranch]);
      closeModal();
      showSuccess(
        "Branch Added Successfully",
        `Branch "${branchName}" (${branchCode.trim().toUpperCase()}) has been added with address: ${branchAddress}`
      );
    } catch (error) {
      console.error("Error adding branch: ", error);
      const errMsg =
        error?.response?.data?.message || error.message || "Unknown error";
      showError("Add Branch Failed", `Failed to add branch: ${errMsg}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBranch = (branch) => {
    setEditingBranch(branch);
    setBranchName(branch.name || "");
    setBranchCode(branch.code || "");
    setBranchAddress(branch.address || "");
    setBranchPhone(branch.phone || "");
    setBranchType(branch.branchType || "retail");
    setManufacturingUnitId(branch.manufacturingUnitId ? String(branch.manufacturingUnitId) : "");
    setShowModal(true);
  };

  const handleUpdateBranch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!branchName.trim() || !branchCode.trim() || !branchAddress.trim()) {
      showError(
        "Missing Information",
        "Please fill out all fields before updating"
      );
      return;
    }

    if (!editingBranch || (!editingBranch.id && !editingBranch._id)) {
      showError(
        "No Branch Selected",
        "No branch selected for editing. Please select a branch first."
      );
      return;
    }

    try {
      setLoading(true);
      const branchId = editingBranch.id || editingBranch._id || editingBranch.docId;

      const updatePayload = {
        name: branchName.trim(),
        branchName: branchName.trim(),
        code: branchCode.trim().toUpperCase(),
        address: branchAddress.trim(),
        location: branchAddress.trim(),
        phone: branchPhone.trim(),
        branchType: branchType || "retail",
        manufacturingUnitId:
          branchType === "manufacturing" ? null : manufacturingUnitId || null,
        date: editingBranch.date,
      };

      const res = await updateBranch(branchId, updatePayload);
      const updated = res.data?.data || { ...editingBranch, ...updatePayload };

      setBranches((prev) =>
        prev.map((branch) =>
          branch.id === branchId || branch._id === branchId
            ? { ...branch, ...updated, id: branchId, docId: branchId }
            : branch
        )
      );

      closeModal();
      showSuccess(
        "Branch Updated Successfully",
        `Branch has been updated with new details successfully`
      );
    } catch (error) {
      console.error("Error updating branch: ", error);
      const errMsg =
        error?.response?.data?.message || error.message || "Unknown error";
      showError("Update Failed", `Failed to update branch: ${errMsg}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteBranch = async () => {
    if (!branchToDelete) return;
    try {
      setLoading(true);
      const branchId = branchToDelete.id || branchToDelete._id || branchToDelete.docId;
      await deleteBranch(branchId);
      setBranches((prev) =>
        prev.filter(
          (branch) => branch.id !== branchId && branch._id !== branchId && branch.docId !== branchId
        )
      );
      setShowDeleteModal(false);
      const deletedName = branchToDelete.name;
      setBranchToDelete(null);
      showSuccess(
        "Branch Deleted Successfully",
        `Branch "${deletedName}" has been deleted successfully`
      );
    } catch (error) {
      console.error("Error deleting branch: ", error);
      const errMsg =
        error?.response?.data?.message || error.message || "Unknown error";
      showError("Delete Failed", `Failed to delete branch: ${errMsg}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // KPI Calculations
  const totalBranchesCount = branches.length;

  // Table Columns
  const columns = [
    {
      key: "sno",
      label: "S.NO",
      width: "80px",
      align: "center",
      sortable: false,
      render: (_, index) => (
        <span className="printz-sno-pill">{index + 1}</span>
      ),
    },
    {
      key: "name",
      label: "BRANCH NAME",
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600, color: "#111827" }}>
          {row.name || "-"}
        </span>
      ),
    },
    {
      key: "code",
      label: "BRANCH CODE",
      sortable: true,
      render: (row) => (
        <span
          style={{
            fontWeight: 700,
            fontSize: "12px",
            color: "#047857",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            padding: "2px 8px",
            borderRadius: "6px",
            display: "inline-block",
          }}
        >
          {row.code || "-"}
        </span>
      ),
    },
    {
      key: "branchType",
      label: "TYPE",
      sortable: true,
      render: (row) => {
        const type = (row.branchType || "retail").toLowerCase();
        const isMfg = type === "manufacturing";
        return (
          <span
            style={{
              fontWeight: 600,
              fontSize: "12px",
              textTransform: "capitalize",
              color: isMfg ? "#1d4ed8" : "#475569",
              background: isMfg ? "#eff6ff" : "#f1f5f9",
              border: `1px solid ${isMfg ? "#bfdbfe" : "#e2e8f0"}`,
              padding: "2px 8px",
              borderRadius: "6px",
              display: "inline-block",
            }}
          >
            {type}
          </span>
        );
      },
    },
    {
      key: "phone",
      label: "PHONE",
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: "13px", color: "#334155" }}>
          {row.phone || "-"}
        </span>
      ),
    },
    {
      key: "date",
      label: "DATE ADDED",
      sortable: true,
      render: (row) => (
        <span className="printz-date-pill">
          <Calendar size={13} />
          {row.date || row.createdAt?.split("T")[0] || "No date"}
        </span>
      ),
    },
  ];

  return (
    <div className="printz-page-container">
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
            Branch <span className="highlight" style={{ color: "#059669" }}>Management</span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Manage, view and update all your branches from here.
          </p>
        </div>

        {/* Center / Right: Illustration Artwork (comfortable right alignment, immediately left of button) */}
        <div
          className="branch-header-illustration-wrap"
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
          <BranchIllustration height={88} width={360} />
        </div>

        {/* Far Right: Add Branch Button */}
        <div style={{ flexShrink: 0 }}>
          <button
            type="button"
            className="printz-btn-primary"
            onClick={openAddModal}
            style={{
              padding: "10px 22px",
              fontSize: "14px",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(3, 174, 121, 0.35)",
            }}
          >
            <Plus size={15} />
            <span>Add Branch</span>
          </button>
        </div>
      </div>

      {/* 3 Summary KPI Cards Grid matching AddAdmin */}
      <div className="printz-summary-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {/* Total Branches */}
        <div className="printz-summary-card">
          <div className="printz-summary-card-main">
            <div className="printz-summary-icon green">
              <Building2 size={22} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-summary-content">
              <div className="printz-summary-label">Total Branches</div>
              <div className="printz-summary-value-row">
                <span className="printz-summary-value">{totalBranchesCount}</span>
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: "700",
                    color: "#059669",
                    background: "#ecfdf5",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  <TrendingUp size={11} />
                  +20%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Branches */}
        <div className="printz-summary-card">
          <div className="printz-summary-card-main">
            <div className="printz-summary-icon orange">
              <Store size={22} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-summary-content">
              <div className="printz-summary-label">Active Branches</div>
              <div className="printz-summary-value-row">
                <span className="printz-summary-value">{totalBranchesCount}</span>
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: "700",
                    color: "#059669",
                    background: "#ecfdf5",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                  }}
                >
                  100%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Inactive Branches */}
        <div className="printz-summary-card">
          <div className="printz-summary-card-main">
            <div className="printz-summary-icon pink">
              <Building2 size={22} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-summary-content">
              <div className="printz-summary-label">Inactive Branches</div>
              <div className="printz-summary-value-row">
                <span className="printz-summary-value">0</span>
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: "700",
                    color: "#4b5563",
                    background: "#f1f5f9",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                  }}
                >
                  0%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Branch List Table Card */}
      <DataTable
        title="Branch List"
        icon={<Building2 size={20} />}
        columns={columns}
        data={branches}
        loading={loading}
        emptyMessage="No branches available"
        searchPlaceholder="Search branches by name, code, phone or type..."
        searchKeys={["name", "code", "address", "phone", "branchType", "date"]}
        onView={(row) => setViewingBranch(row)}
        onEdit={handleEditBranch}
        onDelete={(branch) => {
          setBranchToDelete(branch);
          setShowDeleteModal(true);
        }}
      />

      {/* Add / Edit Branch Popup Modal */}
      {showModal && (
        <div style={MODAL_OVERLAY_STYLE} onClick={closeModal}>
          <div style={MODAL_CONTAINER_STYLE} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={MODAL_HEADER_ROW_STYLE}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <div style={MODAL_HEADER_ICON_STYLE}>
                  <Building2 size={22} strokeWidth={2.4} color="#ffffff" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={MODAL_HEADER_TITLE_STYLE}>
                    {editingBranch ? "Edit Branch" : "Add Branch"}
                  </h3>
                  
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                style={MODAL_CLOSE_BTN_STYLE}
                onMouseOver={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                title="Close"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            <form onSubmit={editingBranch ? handleUpdateBranch : handleAddBranch}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
                {/* Branch Name */}
                <div className="printz-form-field">
                  <label className="printz-form-label">
                    Branch Name <span className="required" style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div className="printz-input-wrapper-modern">
                    <span className="printz-input-badge-icon badge-green">
                      <Building2 size={16} />
                    </span>
                    <input
                      type="text"
                      className="printz-input-clean"
                      placeholder="e.g. Main Branch, Marathahalli"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      disabled={loading}
                      required
                      style={{
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        width: "100%",
                        fontSize: "13.5px",
                        color: "#0f172a",
                      }}
                    />
                  </div>
                </div>

                {/* Branch Code */}
                <div className="printz-form-field">
                  <label className="printz-form-label">
                    Branch Code <span className="required" style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div className="printz-input-wrapper-modern">
                    <span className="printz-input-badge-icon badge-green">
                      <Tag size={16} />
                    </span>
                    <input
                      type="text"
                      className="printz-input-clean"
                      placeholder="e.g. BR001, MAIN, MARATH"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                      disabled={loading}
                      required
                      style={{
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        width: "100%",
                        fontSize: "13.5px",
                        color: "#0f172a",
                        textTransform: "uppercase",
                      }}
                    />
                  </div>
                </div>

                {/* Branch Address */}
                <div className="printz-form-field">
                  <label className="printz-form-label">
                    Branch Address <span className="required" style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div className="printz-input-wrapper-modern">
                    <span className="printz-input-badge-icon badge-blue">
                      <MapPin size={16} />
                    </span>
                    <input
                      type="text"
                      className="printz-input-clean"
                      placeholder="e.g. 123 Main Street, Bangalore"
                      value={branchAddress}
                      onChange={(e) => setBranchAddress(e.target.value)}
                      disabled={loading}
                      required
                      style={{
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        width: "100%",
                        fontSize: "13.5px",
                        color: "#0f172a",
                      }}
                    />
                  </div>
                </div>

                {/* Phone Number & Branch Type (2-column row) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="printz-form-field">
                    <label className="printz-form-label">Phone Number</label>
                    <div className="printz-input-wrapper-modern">
                      <span className="printz-input-badge-icon badge-green">
                        <Phone size={16} />
                      </span>
                      <input
                        type="tel"
                        className="printz-input-clean"
                        placeholder="e.g. 9876543210"
                        value={branchPhone}
                        onChange={(e) => setBranchPhone(e.target.value)}
                        disabled={loading}
                        style={{
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          width: "100%",
                          fontSize: "13.5px",
                          color: "#0f172a",
                        }}
                      />
                    </div>
                  </div>

                  <div className="printz-form-field">
                    <label className="printz-form-label">Branch Type</label>
                    <div className="printz-input-wrapper-modern">
                      <span className="printz-input-badge-icon badge-blue">
                        <Layers size={16} />
                      </span>
                      <select
                        className="printz-input-clean"
                        value={branchType}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          setBranchType(nextType);
                          if (nextType === "manufacturing") setManufacturingUnitId("");
                        }}
                        disabled={loading}
                        style={{
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          width: "100%",
                          fontSize: "13.5px",
                          color: "#0f172a",
                          cursor: "pointer",
                        }}
                      >
                        {BRANCH_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Manufacturing Unit (for non-manufacturing branches) */}
                {branchType !== "manufacturing" && (
                  <div className="printz-form-field">
                    <label className="printz-form-label">Manufacturing Unit</label>
                    <div className="printz-input-wrapper-modern">
                      <span className="printz-input-badge-icon badge-blue">
                        <Factory size={16} />
                      </span>
                      <select
                        className="printz-input-clean"
                        value={manufacturingUnitId}
                        onChange={(e) => setManufacturingUnitId(e.target.value)}
                        disabled={loading}
                        style={{
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          width: "100%",
                          fontSize: "13.5px",
                          color: "#0f172a",
                          cursor: "pointer",
                        }}
                      >
                        <option value="">None (Default / Auto-resolve)</option>
                        {manufacturingUnits.map((unit) => (
                          <option key={unit.id || unit._id} value={unit.id || unit._id}>
                            {unit.name} ({unit.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={MODAL_FOOTER_STYLE}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  style={MODAL_SECONDARY_BTN_STYLE}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "#ffffff")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...MODAL_PRIMARY_BTN_STYLE,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                  onMouseOver={(e) => {
                    if (!loading) e.currentTarget.style.background = "#029b6b";
                  }}
                  onMouseOut={(e) => {
                    if (!loading)
                      e.currentTarget.style.background =
                        "linear-gradient(135deg, #07d49b 0%, #03ae79 100%)";
                  }}
                >
                  {editingBranch ? <Check size={16} /> : <Plus size={16} />}
                  <span>
                    {loading
                      ? editingBranch
                        ? "Updating..."
                        : "Adding..."
                      : editingBranch
                      ? "Update Branch"
                      : "Add Branch"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={MODAL_OVERLAY_STYLE}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              width: "90%",
              maxWidth: "440px",
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #f1f5f9",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
              }}
            >
              <AlertCircle size={24} />
            </div>
            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: "18px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Delete Branch
            </h3>
            <p
              style={{
                margin: "0 0 24px 0",
                fontSize: "14px",
                color: "#4b5563",
                lineHeight: "1.5",
              }}
            >
              Are you sure you want to delete{" "}
              <strong>{branchToDelete?.name}</strong>? This action cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                className="printz-btn-reset"
                onClick={() => {
                  setShowDeleteModal(false);
                  setBranchToDelete(null);
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 20px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onClick={confirmDeleteBranch}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Branch Details Modal matching AddAdmin */}
      {viewingBranch && (
        <div style={MODAL_OVERLAY_STYLE} onClick={() => setViewingBranch(null)}>
          <div style={MODAL_CONTAINER_STYLE} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={MODAL_HEADER_ROW_STYLE}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <div style={MODAL_HEADER_ICON_STYLE}>
                  <Building2 size={22} strokeWidth={2.4} color="#ffffff" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={MODAL_HEADER_TITLE_STYLE}>
                    Branch Details
                  </h3>
                  <p style={MODAL_HEADER_SUBTITLE_STYLE}>
                    Branch location and operational information
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingBranch(null)}
                style={MODAL_CLOSE_BTN_STYLE}
                onMouseOver={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                title="Close"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            {/* Profile Banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(120deg, #f0fdf4 0%, #e6fcf5 45%, #d1fae5 75%, #ccfbf1 100%)",
                border: "1px solid #bbf7d0",
                borderRadius: "16px",
                padding: "14px 18px",
                marginBottom: "16px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", zIndex: 1, minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: "46px",
                    height: "46px",
                    minWidth: "46px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #07d49b 0%, #03ae79 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 3px 10px rgba(5, 150, 105, 0.25)",
                    flexShrink: 0,
                  }}
                >
                  <Building2 size={24} color="#ffffff" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <h4 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                      {viewingBranch.name || "Branch"}
                    </h4>
                    <span
                      style={{
                        background: "#059669",
                        color: "#ffffff",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "9999px",
                      }}
                    >
                      Active
                    </span>
                  </div>
                  <p style={{ margin: "3px 0 0 0", fontSize: "12.5px", color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
                    <MapPin size={13} color="#059669" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {viewingBranch.address || "No address specified"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Information Grid Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                  Branch Name
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                  {viewingBranch.name || "-"}
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                  Branch Code
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#047857" }}>
                  {viewingBranch.code || "-"}
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                  Phone Number
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                  {viewingBranch.phone || "-"}
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                  Branch Type
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>
                  {viewingBranch.branchType || "retail"}
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                  Date Added
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Calendar size={14} color="#059669" />
                  <span>{viewingBranch.date || viewingBranch.createdAt?.split("T")[0] || "N/A"}</span>
                </div>
              </div>

              {String(viewingBranch.branchType || "").toLowerCase() !== "manufacturing" && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                    Manufacturing Unit
                  </div>
                  <div style={{ fontSize: "13.5px", color: "#334155" }}>
                    {(() => {
                      if (!viewingBranch.manufacturingUnitId) return "Default / Auto-resolve";
                      const unit = branches.find(
                        (b) => String(b.id || b._id) === String(viewingBranch.manufacturingUnitId)
                      );
                      // The saved unit may have been deleted; never show its raw id
                      return unit ? `${unit.name} (${unit.code})` : "Unit not found (deleted). Edit this branch to choose another.";
                    })()}
                  </div>
                </div>
              )}

              <div
                style={{
                  gridColumn: "1 / -1",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                  Full Location / Address
                </div>
                <div style={{ fontSize: "13.5px", color: "#334155", lineHeight: "1.5" }}>
                  {viewingBranch.address || "-"}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={MODAL_FOOTER_STYLE}>
              <button
                type="button"
                onClick={() => setViewingBranch(null)}
                style={MODAL_SECONDARY_BTN_STYLE}
                onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#ffffff")}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const b = viewingBranch;
                  setViewingBranch(null);
                  handleEditBranch(b);
                }}
                style={MODAL_PRIMARY_BTN_STYLE}
                onMouseOver={(e) => (e.currentTarget.style.background = "#029b6b")}
                onMouseOut={(e) =>
                  (e.currentTarget.style.background =
                    "linear-gradient(135deg, #07d49b 0%, #03ae79 100%)")
                }
              >
                <Pencil size={15} />
                <span>Edit Branch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddBranch;
