import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../services/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../../context/AuthContext.jsx";

import Popup from "../common/Popup.jsx";
import { usePopup } from "../../hooks/usePopup";
import DataTable from "../common/table/DataTable";
import ManagerIllustration from "../illustrations/ManagerIllustration";
import BranchSelect from "../common/BranchSelect.jsx";

import "../../styles/printzTheme.css";
import "../../styles/addmanager.css";

import {
  UserPlus,
  User,
  Users,
  Mail,
  Phone,
  Building2,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  X,
  Key,
  Store,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Plus,
  Copy,
  ShieldCheck,
  Shield,
  Pencil,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  SHARED MODAL STYLE TOKENS                                             */
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
  color: "#64748b",
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
  color: "#64748b",
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

const copyBtnStyle = {
  width: "30px",
  height: "30px",
  minWidth: "30px",
  maxWidth: "30px",
  borderRadius: "50%",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  cursor: "pointer",
  color: "#64748b",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  padding: 0,
  boxSizing: "border-box",
  transition: "all 0.15s ease",
};

const AddManager = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [managers, setManagers] = useState([]);
  const [managersLoaded, setManagersLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentManager, setCurrentManager] = useState(null);
  const { currentUser } = useAuth();
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const { popup } = usePopup();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [managerToDelete, setManagerToDelete] = useState(null);
  const [viewingManager, setViewingManager] = useState(null);

  const handleCopy = (text, label) => {
    if (!text || text === "-") return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    }
  };

  const [location, setLocation] = useState("");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  const fetchBranches = useCallback(async () => {
    try {
      const res = await api.get("/branches");
      const branchData = (res.data?.data || []).map((b) => ({
        id: b.id || b._id,
        name: b.name || b.branchName,
        address: b.address || b.location || "",
      }));
      const sortedBranches = branchData.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
      setBranches(sortedBranches);
      if (sortedBranches.length > 0 && !selectedBranch) {
        setSelectedBranch(sortedBranches[0].name);
        setLocation(sortedBranches[0].address);
      }
    } catch (err) {
      console.error("Failed to fetch branch names: ", err);
    }
  }, [selectedBranch]);

  const fetchManagers = async () => {
    setManagersLoaded(false);
    try {
      const res = await api.get("/users?role=manager");
      const managerList = (res.data?.data || []).map((user) => ({
        id: user.id || user._id,
        ...user,
      }));
      setManagers(managerList);
    } catch (err) {
      console.error("Failed to fetch managers: ", err);
    } finally {
      setManagersLoaded(true);
    }
  };

  useEffect(() => {
    fetchManagers();
    fetchBranches();
  }, [fetchBranches]);

  const handleBranchChange = (event) => {
    const selectedBranchName = event.target.value;
    setSelectedBranch(selectedBranchName);
    const selectedBranchData = branches.find(
      (b) => b.name === selectedBranchName
    );
    setLocation(selectedBranchData ? selectedBranchData.address || "" : "");
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () =>
    setShowConfirmPassword(!showConfirmPassword);

  const isInventoryBranch = (selectedBranch || "")
    .toLowerCase()
    .includes("inventory");

  const existingManagerForBranch = useMemo(() => {
    return managers.find((m) => m.branch === selectedBranch);
  }, [managers, selectedBranch]);

  const branchConflict =
    existingManagerForBranch &&
    (!editMode || existingManagerForBranch.id !== currentManager?.id);

  const openAddModal = () => {
    handleReset();
    setShowModal(true);
  };

  const closeModal = () => {
    handleReset();
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");

    if (!editMode && !password) {
      return setError("Please enter password");
    }

    if (!editMode && password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    if (password) {
      if (password !== confirmPassword) {
        return setError("Passwords do not match");
      }
      if (password.length < 6) {
        return setError("Password must be at least 6 characters long");
      }
    }

    if (isInventoryBranch) {
      setError("Cannot assign a manager to an inventory (warehouse) branch.");
      return;
    }

    if (branchConflict) {
      setError(
        `This branch already has a manager (${existingManagerForBranch.email}). Please select a different branch.`
      );
      return;
    }

    setLoading(true);
    try {
      if (editMode) {
        const managerId = currentManager?.id || currentManager?._id || currentManager?.uid;
        if (!managerId) {
          throw new Error("Manager ID not found for update");
        }
        const updatePayload = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          branch: selectedBranch,
          location: location || "",
          role: "manager",
        };
        if (password && password.trim()) {
          updatePayload.password = password.trim();
        }
        await api.put(`/users/${managerId}`, updatePayload);
      } else {
        await api.post("/users", {
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone.trim(),
          branch: selectedBranch,
          location: location || "",
          role: "manager",
        });
      }

      setLoading(false);
      closeModal();
      await fetchManagers();
      toast.success(`Manager ${editMode ? "updated" : "created"} successfully`);
    } catch (err) {
      console.error("Error saving manager:", err);
      const errMsg =
        err?.response?.data?.message || err.message || "Failed to save manager";
      setError(errMsg);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setSelectedBranch(branches.length > 0 ? branches[0].name : "");
    setLocation(branches.length > 0 ? branches[0].address : "");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setEditMode(false);
    setCurrentManager(null);
  };

  const handleEdit = (manager) => {
    setCurrentManager(manager);
    setEditMode(true);
    setName(manager.name || "");
    setEmail(manager.email || "");
    setPhone(manager.phone || "");
    setSelectedBranch(manager.branch || "");
    const branchAddress =
      manager.location ||
      branches.find(
        (b) =>
          (b.name || "").trim().toLowerCase() ===
          (manager.branch || "").trim().toLowerCase()
      )?.address ||
      "";
    setLocation(branchAddress);
    setShowModal(true);
  };

  const handlePasswordReset = async () => {
    if (!currentManager || !currentManager.email) {
      toast.error("Manager details not found. Cannot send reset email.");
      return;
    }
    try {
      setLoading(true);
      await api.post("/auth/send-reset-email", {
        email: currentManager.email,
        userId: currentManager.id || currentManager._id || currentManager.uid,
      });
      toast.success(`Password reset email sent to ${currentManager.email}`);
    } catch (err) {
      console.error("Error sending reset email:", err);
      const errMsg = err?.response?.data?.message || err.message || "Failed to send reset email";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (manager) => {
    setManagerToDelete(manager);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!currentUser) {
      toast.error("Authentication error. Please log in again.");
      return;
    }
    if (!managerToDelete) return;

    try {
      const uidToDelete = managerToDelete.id || managerToDelete._id || managerToDelete.uid;
      await api.delete(`/users/${uidToDelete}`);

      fetchManagers();
      setShowDeleteModal(false);
      setManagerToDelete(null);
      toast.success("Manager deleted successfully");
    } catch (err) {
      console.error("Error deleting user:", err);
      const errMsg =
        err?.response?.data?.message || err.message || "Failed to delete user";
      toast.error(errMsg);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setManagerToDelete(null);
  };

  const disableSubmit = loading || branchConflict || isInventoryBranch;

  // KPI Metrics matching Admin Management
  const totalManagersCount = managers.length;
  const uniqueBranchesCount = useMemo(() => {
    const set = new Set();
    managers.forEach((m) => {
      if (m.branch) set.add(m.branch);
    });
    return set.size;
  }, [managers]);

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
      label: "NAME",
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600, color: "#111827" }}>
          {row.name || row.branch || "-"}
        </span>
      ),
    },
    {
      key: "email",
      label: "EMAIL",
      sortable: true,
      render: (row) => (
        <span style={{ color: "#4b5563", fontSize: "13px" }}>
          {row.email || "-"}
        </span>
      ),
    },
    {
      key: "branch",
      label: "BRANCH",
      sortable: true,
      render: (row) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#065f46",
            fontWeight: 500,
            fontSize: "13px",
            background: "#ecfdf5",
            padding: "4px 10px",
            borderRadius: "8px",
            border: "1px solid #d1fae5",
          }}
        >
          <Building2 size={14} color="#059669" />
          {row.branch || "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="printz-page-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <Popup {...popup} />

      {/* Full Header Banner with green fading from left to right */}
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
            Managers <span className="highlight" style={{ color: "#059669" }}>Management</span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Manage manager accounts, branch assignments, and capabilities in one place.
          </p>
        </div>

        {/* Center / Right: Illustration Artwork (comfortable right alignment, immediately left of button) */}
        <div
          className="branch-header-illustration-wrap manager-header-illustration-wrap"
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
          <ManagerIllustration height={88} width={360} />
        </div>

        {/* Far Right: Add Manager Button */}
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
            <Plus size={16} />
            <span>Add Manager</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid matching Admin Management */}
      <div
        className="printz-summary-grid"
        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
      >
        {/* Total Managers */}
        <div className="printz-summary-card">
          <div className="printz-summary-card-main">
            <div className="printz-summary-icon green">
              <Users size={22} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-summary-content">
              <div className="printz-summary-label">Total Managers</div>
              <div className="printz-summary-value-row">
                <span className="printz-summary-value">
                  {totalManagersCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Branches */}
        <div className="printz-summary-card">
          <div className="printz-summary-card-main">
            <div className="printz-summary-icon blue">
              <Building2 size={22} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-summary-content">
              <div className="printz-summary-label">Branches Assigned</div>
              <div className="printz-summary-value-row">
                <span className="printz-summary-value">
                  {uniqueBranchesCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Status */}
        <div className="printz-summary-card">
          <div className="printz-summary-card-main">
            <div className="printz-summary-icon orange">
              <Shield size={22} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-summary-content">
              <div className="printz-summary-label">Active Status</div>
              <div className="printz-summary-value-row">
                <span className="printz-summary-value">
                  {totalManagersCount}
                </span>
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
      </div>

      {/* Stores Table Card (using reusable DataTable) */}
      <DataTable
        title="Stores"
        icon={<Store size={20} />}
        columns={columns}
        data={managers}
        loading={!managersLoaded}
        emptyMessage="No managers available"
        searchPlaceholder="Search stores..."
        searchKeys={["branch", "name", "email"]}
        onView={(row) => setViewingManager(row)}
        onEdit={(row) => handleEdit(row)}
        onDelete={(row) => handleDelete(row)}
        filterComponent={
          <button
            type="button"
            className="printz-table-icon-btn"
            title="Refresh"
            onClick={fetchManagers}
          >
            <RefreshCw size={15} />
          </button>
        }
      />

      {/* Add / Edit Manager Popup Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e5e7eb",
              padding: "28px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: "#ecfdf5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                    {editMode ? "Edit Manager" : "Add Manager"}
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#6b7280" }}>
                    {editMode
                      ? "Update manager information and branch assignment"
                      : "Enter manager details and assign to a branch"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  display: "flex",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 14px",
                  marginBottom: "18px",
                  borderRadius: "10px",
                  background: "#fee2e2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  fontSize: "13px",
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "18px",
                  marginBottom: "20px",
                }}
                className="printz-form-grid-2"
              >
                {/* Name */}
                <div className="printz-form-field">
                  <label className="printz-form-label">
                    Name <span className="required">*</span>
                  </label>
                  <div className="printz-input-wrapper">
                    <span className="printz-input-prefix-icon">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      className="printz-input"
                      placeholder="Enter manager name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="printz-form-field">
                  <label className="printz-form-label">
                    Email <span className="required">*</span>
                  </label>
                  <div className="printz-input-wrapper">
                    <span className="printz-input-prefix-icon">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      className="printz-input"
                      placeholder="Enter email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={editMode}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="printz-form-field">
                  <label className="printz-form-label">
                    Phone Number <span className="required">*</span>
                  </label>
                  <div className="printz-input-wrapper">
                    <span className="printz-input-prefix-icon">
                      <Phone size={16} />
                    </span>
                    <input
                      type="text"
                      className="printz-input"
                      placeholder="Enter phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Branch Name Dropdown */}
                <div className="printz-form-field">
                  <label className="printz-form-label">
                    Branch Name <span className="required">*</span>
                  </label>
                  <BranchSelect
                    value={selectedBranch}
                    onChange={handleBranchChange}
                    branches={branches}
                    placeholder="Select branch..."
                    required
                  />
                </div>

                {/* Location (auto-filled from branch, fully visible) */}
                <div className="printz-form-field" style={{ gridColumn: "span 2" }}>
                  <label className="printz-form-label">Location</label>
                  <div
                    className="printz-input-wrapper-modern multiline"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      minHeight: "44px",
                      boxSizing: "border-box",
                    }}
                  >
                    <span
                      style={{
                        color: "#059669",
                        marginTop: "2px",
                        flexShrink: 0,
                        display: "flex",
                      }}
                    >
                      <MapPin size={16} />
                    </span>
                    <div
                      style={{
                        flex: 1,
                        fontSize: "13.5px",
                        fontWeight: 500,
                        color: location ? "#0f172a" : "#94a3b8",
                        lineHeight: 1.45,
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                        userSelect: "text",
                      }}
                    >
                      {location || "Auto-filled from branch"}
                    </div>
                  </div>
                </div>

                {/* Warnings / Alerts */}
                {branchConflict && (
                  <div
                    style={{
                      gridColumn: "span 2",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "#fef3c7",
                      border: "1px solid #fde68a",
                      color: "#92400e",
                      fontSize: "13px",
                    }}
                  >
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>
                      This branch already has a manager (
                      <strong>{existingManagerForBranch.email}</strong>). Please select a different branch.
                    </span>
                  </div>
                )}

                {isInventoryBranch && (
                  <div
                    style={{
                      gridColumn: "span 2",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "#fef2f2",
                      border: "1px solid #fee2e2",
                      color: "#dc2626",
                      fontSize: "13px",
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>
                      This is an INVENTORY (Warehouse) branch. Managers cannot be
                      assigned to Inventory branches.
                    </span>
                  </div>
                )}

                {/* Password fields or Reset in Edit Mode */}
                {editMode ? (
                  <div className="printz-form-field" style={{ gridColumn: "span 2" }}>
                    <label className="printz-form-label">Password Management</label>
                    <button
                      type="button"
                      className="printz-btn-reset"
                      onClick={handlePasswordReset}
                      disabled={isSendingReset || !currentUser}
                      style={{ height: "44px", justifyContent: "center", width: "100%" }}
                    >
                      <Key size={15} color="#059669" />
                      <span>
                        {isSendingReset
                          ? "Sending Email..."
                          : "Send Password Reset Email"}
                      </span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="printz-form-field">
                      <label className="printz-form-label">
                        Password <span className="required">*</span>
                      </label>
                      <div className="printz-input-wrapper">
                        <span className="printz-input-prefix-icon">
                          <Lock size={16} />
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          className="printz-input"
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <span
                          onClick={togglePasswordVisibility}
                          style={{ cursor: "pointer", color: "#9ca3af", display: "flex" }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </span>
                      </div>
                    </div>

                    <div className="printz-form-field">
                      <label className="printz-form-label">
                        Confirm Password <span className="required">*</span>
                      </label>
                      <div className="printz-input-wrapper">
                        <span className="printz-input-prefix-icon">
                          <Lock size={16} />
                        </span>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          className="printz-input"
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                        <span
                          onClick={toggleConfirmPasswordVisibility}
                          style={{ cursor: "pointer", color: "#9ca3af", display: "flex" }}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: "16px",
                }}
              >
                <button
                  type="button"
                  className="printz-btn-reset"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="printz-btn-primary"
                  disabled={disableSubmit}
                >
                  {editMode ? <Check size={16} /> : <Plus size={16} />}
                  <span>
                    {loading
                      ? "Saving..."
                      : editMode
                        ? "Save Manager"
                        : "Add Manager"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              padding: "28px",
              borderRadius: "16px",
              width: "90%",
              maxWidth: "440px",
              textAlign: "center",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#fef2f2",
                color: "#ef4444",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={26} />
            </div>
            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: "17px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Delete Manager
            </h3>
            <p
              style={{
                margin: "0 0 24px 0",
                fontSize: "14px",
                color: "#6b7280",
                lineHeight: "1.5",
              }}
            >
              Are you sure you want to delete manager{" "}
              <strong>{managerToDelete?.email || managerToDelete?.name}</strong>
              ? This action cannot be undone.
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
                onClick={closeDeleteModal}
                style={{ minWidth: "100px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="printz-btn-primary"
                onClick={confirmDelete}
                style={{
                  background: "#ef4444",
                  minWidth: "100px",
                  boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Manager Details Modal */}
      {viewingManager && (() => {
        const managerLocation =
          viewingManager.location ||
          branches.find(
            (b) =>
              (b.name || "").trim().toLowerCase() ===
              (viewingManager.branch || "").trim().toLowerCase()
          )?.address ||
          "-";

        const managerInitial = (
          viewingManager.name ||
          viewingManager.branch ||
          "M"
        )
          .charAt(0)
          .toUpperCase();

        return (
          <div style={MODAL_OVERLAY_STYLE} onClick={() => setViewingManager(null)}>
            <div style={MODAL_CONTAINER_STYLE} onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div style={MODAL_HEADER_ROW_STYLE}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <div style={MODAL_HEADER_ICON_STYLE}>
                    <Store size={22} strokeWidth={2.4} color="#ffffff" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={MODAL_HEADER_TITLE_STYLE}>
                      Manager Details
                    </h3>
                    <p style={MODAL_HEADER_SUBTITLE_STYLE}>
                      Store manager profile and branch assignment information
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingManager(null)}
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
                {/* Subtle organic backdrop curve */}
                <svg
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    height: "100%",
                    width: "55%",
                    pointerEvents: "none",
                    zIndex: 0,
                  }}
                  viewBox="0 0 400 130"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 130 C 140 130, 200 20, 400 10 L 400 130 Z"
                    fill="rgba(255, 255, 255, 0.45)"
                  />
                </svg>

                <div style={{ display: "flex", alignItems: "center", gap: "14px", zIndex: 1, minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      minWidth: "48px",
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #07d49b 0%, #03ae79 100%)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      fontWeight: 700,
                      boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                      flexShrink: 0,
                    }}
                  >
                    {managerInitial}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <h4 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                        {viewingManager.name || viewingManager.branch || "Store Manager"}
                      </h4>
                      <span
                        style={{
                          background: "#ecfdf5",
                          color: "#047857",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2.5px 9px",
                          borderRadius: "9999px",
                          border: "1px solid #a7f3d0",
                        }}
                      >
                        Store Manager
                      </span>
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
                    <p style={{ margin: "3px 0 0 0", fontSize: "12.5px", color: "#475569", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>
                      {viewingManager.email || "No email assigned"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Information Cards Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                {/* Full Name */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #edf2f7",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
                    gap: "10px",
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        minWidth: "36px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      <User size={16} strokeWidth={2.3} color="#ffffff" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: "3px" }}>
                        Manager Name
                      </div>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 700,
                          color: "#0f172a",
                          wordBreak: "break-word",
                          whiteSpace: "normal",
                          lineHeight: "1.4",
                        }}
                      >
                        {viewingManager.name || viewingManager.branch || "-"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(viewingManager.name || viewingManager.branch, "Manager Name")}
                    style={{ ...copyBtnStyle, marginTop: "2px" }}
                    title="Copy Name"
                  >
                    <Copy size={13} strokeWidth={1.8} />
                  </button>
                </div>

                {/* Email Address */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #edf2f7",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
                    gap: "10px",
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        minWidth: "36px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      <Mail size={16} strokeWidth={2.3} color="#ffffff" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: "3px" }}>
                        Email Address
                      </div>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 700,
                          color: "#0f172a",
                          wordBreak: "break-word",
                          whiteSpace: "normal",
                          lineHeight: "1.4",
                        }}
                        title={viewingManager.email || "-"}
                      >
                        {viewingManager.email || "-"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(viewingManager.email, "Email")}
                    style={{ ...copyBtnStyle, marginTop: "2px" }}
                    title="Copy Email"
                  >
                    <Copy size={13} strokeWidth={1.8} />
                  </button>
                </div>

                {/* Phone Number */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #edf2f7",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
                    gap: "10px",
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        minWidth: "36px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      <Phone size={16} strokeWidth={2.3} color="#ffffff" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: "3px" }}>
                        Phone Number
                      </div>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 700,
                          color: "#0f172a",
                          wordBreak: "break-word",
                          whiteSpace: "normal",
                          lineHeight: "1.4",
                        }}
                      >
                        {viewingManager.phone || "Not provided"}
                      </div>
                    </div>
                  </div>
                  {viewingManager.phone && (
                    <button
                      type="button"
                      onClick={() => handleCopy(viewingManager.phone, "Phone")}
                      style={{ ...copyBtnStyle, marginTop: "2px" }}
                      title="Copy Phone"
                    >
                      <Copy size={13} strokeWidth={1.8} />
                    </button>
                  )}
                </div>

                {/* Assigned Branch */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #edf2f7",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
                    gap: "10px",
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        minWidth: "36px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      <Building2 size={16} strokeWidth={2.3} color="#ffffff" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: "3px" }}>
                        Assigned Branch
                      </div>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 700,
                          color: "#0f172a",
                          wordBreak: "break-word",
                          whiteSpace: "normal",
                          lineHeight: "1.4",
                        }}
                      >
                        {viewingManager.branch || "-"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(viewingManager.branch, "Branch")}
                    style={{ ...copyBtnStyle, marginTop: "2px" }}
                    title="Copy Branch"
                  >
                    <Copy size={13} strokeWidth={1.8} />
                  </button>
                </div>

                {/* Full Location / Address (Full Width) */}
                <div
                  style={{
                    gridColumn: "1 / -1",
                    background: "#ffffff",
                    border: "1px solid #edf2f7",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
                    gap: "10px",
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        minWidth: "36px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      <MapPin size={16} strokeWidth={2.3} color="#ffffff" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: "3px" }}>
                        Branch Location / Address
                      </div>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 500,
                          color: "#1e293b",
                          lineHeight: "1.45",
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {managerLocation}
                      </div>
                    </div>
                  </div>
                  {managerLocation !== "-" && (
                    <button
                      type="button"
                      onClick={() => handleCopy(managerLocation, "Location")}
                      style={{ ...copyBtnStyle, marginTop: "2px" }}
                      title="Copy Location"
                    >
                      <Copy size={13} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={MODAL_FOOTER_STYLE}>
                <button
                  type="button"
                  className="printz-btn-reset"
                  onClick={() => setViewingManager(null)}
                  style={{ minWidth: "90px" }}
                >
                  Close
                </button>
                {currentUser && (
                  <button
                    type="button"
                    className="printz-btn-primary"
                    onClick={() => {
                      const mgr = viewingManager;
                      setViewingManager(null);
                      handleEdit(mgr);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 18px",
                      fontSize: "13.5px",
                    }}
                  >
                    <Pencil size={14} />
                    <span>Edit Details</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AddManager;
