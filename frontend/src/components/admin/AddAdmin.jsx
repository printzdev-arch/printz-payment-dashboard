import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../services/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../../context/AuthContext.jsx";

import Popup from "../common/Popup.jsx";
import { usePopup } from "../../hooks/usePopup";
import DataTable from "../common/table/DataTable";
import AdminIllustration from "../illustrations/AdminIllustration";
import BranchSelect from "../common/BranchSelect.jsx";

import "../../styles/printzTheme.css";
import "../../styles/addmanager.css";

import {
  ShieldCheck,
  User,
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
  AlertCircle,
  Plus,
  ChevronDown,
  Layers,
  Shield,
  Send,
  Pencil,
  Copy,
} from "lucide-react";

const AVAILABLE_CAPABILITIES = [
  { id: "isDashboardCapability", label: "Dashboard Capability" },
  { id: "isPrinterCapability", label: "Printer Capability" },
  { id: "isStockCapability", label: "Stock Capability" },
  { id: "isRevenueCapability", label: "Revenue Capability" },
  { id: "isAddAdmin", label: "Add Admin" },
  { id: "isAddManager", label: "Add Manager" },
  { id: "isExtraCapability", label: "Extra Features" },
];

/* ---------------------------------------------------------------------- */
/*  SHARED MODAL STYLE TOKENS                                             */
/*  Used by the Add/Edit Admin modal and the View Admin modal so both     */
/*  popups share one consistent look (size, spacing, shadows, header).    */
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
  maxWidth: "700px",
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

const AddAdmin = () => {
  const { popup, showSuccess, showError } = usePopup();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [adminsLoaded, setAdminsLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [location, setLocation] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [branches, setBranches] = useState([]);

  const { currentUser } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewingAdmin, setViewingAdmin] = useState(null);
  const [showCapabilitiesDropdown, setShowCapabilitiesDropdown] = useState(false);

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

  const fetchAdmins = async () => {
    setAdminsLoaded(false);
    try {
      const res = await api.get("/users?role=admin");
      const currentUserId = currentUser?.id || currentUser?._id || currentUser?.uid;
      const adminList = (res.data?.data || [])
        .map((user) => ({ id: user.id || user._id, ...user }))
        .filter(
          (user) =>
            user.role === "admin" &&
            (user.id || user._id) !== currentUserId
        );
      setAdmins(adminList);
    } catch (err) {
      console.error("Failed to fetch admins: ", err);
    } finally {
      setAdminsLoaded(true);
    }
  };

  const handleBranchChange = (event) => {
    const selectedBranchName = event.target.value;
    setSelectedBranch(selectedBranchName);
    const selectedBranchData = branches.find(
      (b) => b.name === selectedBranchName
    );
    setLocation(selectedBranchData ? selectedBranchData.address || "" : "");
  };

  useEffect(() => {
    if (currentUser) {
      fetchAdmins();
      fetchBranches();
    }
  }, [currentUser, fetchBranches]);

  // Close capabilities dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showCapabilitiesDropdown &&
        !event.target.closest(".printz-capabilities-container")
      ) {
        setShowCapabilitiesDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCapabilitiesDropdown]);

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () =>
    setShowConfirmPassword(!showConfirmPassword);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");

    if (!editMode && password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    if (!name.trim()) {
      return setError("Please enter full name");
    }

    if (!email.trim()) {
      return setError("Please enter email address");
    }

    if (!selectedBranch) {
      return setError("Please select a branch");
    }

    setLoading(true);
    // Only store selected permissions as true (match original CRA behaviour)
    const userPermissions = permissions.reduce((acc, perm) => {
      acc[perm] = true;
      return acc;
    }, {});

    try {
      if (editMode) {
        const adminId = currentAdmin?.id || currentAdmin?._id || currentAdmin?.uid;
        if (!adminId) {
          throw new Error("Admin ID not found for update");
        }

        const updatePayload = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          branch: selectedBranch,
          location: location || "",
          role: "admin",
          permissions: userPermissions,
        };

        if (password) {
          updatePayload.password = password;
        }

        await api.put(`/users/${adminId}`, updatePayload);
      } else {
        await api.post("/users", {
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone.trim(),
          branch: selectedBranch,
          location: location || "",
          role: "admin",
          permissions: userPermissions,
        });
      }

      setLoading(false);
      setShowAddDialog(false);
      handleReset();
      await fetchAdmins();
      showSuccess(
        "Admin Saved Successfully",
        `Admin ${name} has been ${
          editMode ? "updated" : "created"
        } successfully.`
      );
    } catch (err) {
      console.error("Error saving admin:", err);
      const errMsg =
        err?.response?.data?.message || err.message || "Failed to save admin";
      setError(errMsg);
      showError("Save Failed", `Failed to save admin: ${errMsg}.`);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setPhone("");
    const defaultBranch = branches.length > 0 ? branches[0].name : "";
    const defaultLocation = branches.length > 0 ? branches[0].address : "";
    setSelectedBranch(defaultBranch);
    setLocation(defaultLocation);
    setPassword("");
    setConfirmPassword("");
    setPermissions([]);
    setError("");
    setEditMode(false);
    setCurrentAdmin(null);
    setShowAddDialog(false);
    setShowCapabilitiesDropdown(false);
  };

  const handleEdit = (admin) => {
    if (!admin) return;
    setCurrentAdmin(admin);
    setEditMode(true);
    setName(admin.name || "");
    setEmail(admin.email || "");
    setPhone(admin.phone || "");
    setSelectedBranch(admin.branch || "");

    const branchAddress =
      admin.location ||
      branches.find(
        (b) =>
          (b.name || "").trim().toLowerCase() ===
          (admin.branch || "").trim().toLowerCase()
      )?.address ||
      "";
    setLocation(branchAddress);

    let permsList = [];
    const perms = admin.permissions || admin.capabilities || {};
    if (Array.isArray(perms)) {
      permsList = perms;
    } else if (typeof perms === "object" && perms !== null) {
      permsList = Object.keys(perms).filter((k) => Boolean(perms[k]));
    }
    setPermissions(permsList);

    setError("");
    setShowAddDialog(true);
    setShowCapabilitiesDropdown(false);
  };

  const openAddDialog = () => {
    handleReset();
    setShowAddDialog(true);
  };

  const handlePasswordReset = async () => {
    if (!currentAdmin || !currentAdmin.email) {
      toast.error("Admin details not found. Cannot send reset email.");
      return;
    }
    try {
      setLoading(true);
      await api.post("/auth/send-reset-email", {
        email: currentAdmin.email,
        userId: currentAdmin.id || currentAdmin._id || currentAdmin.uid,
      });
      toast.success(`Password reset email sent to ${currentAdmin.email}`);
    } catch (err) {
      console.error("Error sending reset email:", err);
      const errMsg = err?.response?.data?.message || err.message || "Failed to send reset email";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (admin) => {
    setAdminToDelete(admin);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!currentUser) {
      toast.error("Authentication error. Please log in again.");
      return;
    }
    if (!adminToDelete) return;

    try {
      const uidToDelete = adminToDelete.id || adminToDelete._id || adminToDelete.uid;
      await api.delete(`/users/${uidToDelete}`);

      fetchAdmins();
      setShowDeleteModal(false);
      setAdminToDelete(null);
      showSuccess(
        "Admin Deleted",
        `Admin ${adminToDelete.name} has been deleted successfully.`
      );
    } catch (err) {
      const errMsg =
        err?.response?.data?.message || err.message || "Unknown error";
      showError("Delete Failed", `Failed to delete admin: ${errMsg}.`);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setAdminToDelete(null);
  };

  const handleCopy = (text, label) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const formatCapability = (cap) => {
    const found = AVAILABLE_CAPABILITIES.find((c) => c.id === cap);
    if (found) return found.label;
    let formatted = cap.startsWith("is") ? cap.slice(2) : cap;
    formatted = formatted.replace(/([A-Z])/g, " $1").trim();
    return formatted;
  };

  // KPI Metrics
  const totalAdminsCount = admins.length;
  const uniqueBranchesCount = useMemo(() => {
    const set = new Set();
    admins.forEach((a) => {
      if (a.branch) set.add(a.branch);
    });
    return set.size;
  }, [admins]);

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
      label: "ADMIN NAME",
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600, color: "#111827" }}>
          {row.name || "-"}
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
      key: "phone",
      label: "PHONE",
      sortable: true,
      render: (row) => (
        <span style={{ color: "#4b5563", fontSize: "13px" }}>
          {row.phone || "-"}
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
          }}
        >
          <Building2 size={14} color="#059669" />
          {row.branch || "-"}
        </span>
      ),
    },
  ];

  const getActiveCapabilities = (admin) => {
    if (!admin) return [];
    const perms = admin.permissions || admin.capabilities || {};
    if (Array.isArray(perms)) {
      return AVAILABLE_CAPABILITIES.filter((cap) => perms.includes(cap.id));
    }
    if (typeof perms === "object") {
      return AVAILABLE_CAPABILITIES.filter((cap) => Boolean(perms[cap.id]));
    }
    return [];
  };

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
            Admins <span className="highlight" style={{ color: "#059669" }}>Management</span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Manage administrator accounts, branch assignments, and capabilities in one place.
          </p>
        </div>

        {/* Center / Right: Illustration Artwork (comfortable right alignment, immediately left of button) */}
        <div
          className="branch-header-illustration-wrap admin-header-illustration-wrap"
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
          <AdminIllustration height={88} width={360} />
        </div>

        {/* Far Right: Add Admin Button */}
        <div style={{ flexShrink: 0 }}>
          <button
            type="button"
            className="printz-btn-primary"
            onClick={openAddDialog}
            style={{
              padding: "10px 22px",
              fontSize: "14px",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(3, 174, 121, 0.35)",
            }}
          >
            <Plus size={15} />
            <span>Add Admin</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="printz-summary-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {/* Total Admins */}
        <div className="printz-summary-card">
          <div className="printz-summary-card-main">
            <div className="printz-summary-icon green">
              <ShieldCheck size={22} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-summary-content">
              <div className="printz-summary-label">Total Admins</div>
              <div className="printz-summary-value-row">
                <span className="printz-summary-value">{totalAdminsCount}</span>
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
                <span className="printz-summary-value">{uniqueBranchesCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Admins */}
        <div className="printz-summary-card">
          <div className="printz-summary-card-main">
            <div className="printz-summary-icon orange">
              <Shield size={22} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-summary-content">
              <div className="printz-summary-label">Active Status</div>
              <div className="printz-summary-value-row">
                <span className="printz-summary-value">{totalAdminsCount}</span>
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

      {/* Admins Table Card (using reusable DataTable) */}
      <DataTable
        title="Admins List"
        icon={<ShieldCheck size={20} />}
        columns={columns}
        data={admins}
        loading={!adminsLoaded}
        emptyMessage="No admins available"
        searchPlaceholder="Search admins by name, email, or branch..."
        searchKeys={["name", "email", "branch", "phone"]}
        pageSizeOptions={[5, 10, 15, 20]}
        onView={(row) => setViewingAdmin(row)}
        onEdit={(row) => handleEdit(row)}
        onDelete={(row) => handleDelete(row)}
      />

      {/* Add / Edit Admin Dialog Modal */}
      {showAddDialog && (
        <div style={MODAL_OVERLAY_STYLE} onClick={() => setShowAddDialog(false)}>
          <div style={MODAL_CONTAINER_STYLE} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={MODAL_HEADER_ROW_STYLE}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <div style={MODAL_HEADER_ICON_STYLE}>
                  <ShieldCheck size={22} strokeWidth={2.4} color="#ffffff" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={MODAL_HEADER_TITLE_STYLE}>
                    {editMode ? "Edit Admin" : "Add Admin"}
                  </h3>
                  <p style={MODAL_HEADER_SUBTITLE_STYLE}>
                    {editMode
                      ? "Update admin permissions and information"
                      : "Create a new administrator account"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                style={MODAL_CLOSE_BTN_STYLE}
                onMouseOver={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                title="Close"
              >
                <X size={16} strokeWidth={2.2} />
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
                <AlertCircle size={16} flexShrink={0} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "14px",
                  marginBottom: "16px",
                }}
                className="printz-form-grid-2"
              >
                {/* Name */}
                <div className="printz-form-field">
                  <label className="printz-form-label">
                    Full Name <span className="required" style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div className="printz-input-wrapper-modern">
                    <span className="printz-input-badge-icon badge-green">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      className="printz-input-clean"
                      placeholder="Enter full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        width: "100%",
                        flex: 1,
                        padding: 0,
                        margin: 0,
                        boxShadow: "none",
                        fontSize: "14.5px",
                        fontWeight: 500,
                        color: "#0f172a",
                      }}
                    />
                    {name && (
                      <button
                        type="button"
                        onClick={() => setName("")}
                        className="printz-input-clear-btn"
                        title="Clear"
                        style={{ marginLeft: "auto" }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="printz-form-field">
                  <label className="printz-form-label">
                    Email Address <span className="required" style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div className="printz-input-wrapper-modern">
                    <span className="printz-input-badge-icon badge-blue">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      className="printz-input-clean"
                      placeholder="Enter email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={editMode}
                      style={{
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        width: "100%",
                        flex: 1,
                        padding: 0,
                        margin: 0,
                        boxShadow: "none",
                        fontSize: "14.5px",
                        fontWeight: 500,
                        color: "#0f172a",
                        cursor: editMode ? "default" : "text",
                      }}
                    />
                    {email && !editMode && (
                      <button
                        type="button"
                        onClick={() => setEmail("")}
                        className="printz-input-clear-btn"
                        title="Clear"
                        style={{ marginLeft: "auto" }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="printz-form-field">
                  <label className="printz-form-label">
                    Phone Number <span className="required" style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div className="printz-input-wrapper-modern">
                    <span className="printz-input-badge-icon badge-green">
                      <Phone size={16} />
                    </span>
                    <input
                      type="text"
                      className="printz-input-clean"
                      placeholder="Enter phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      style={{
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        width: "100%",
                        flex: 1,
                        padding: 0,
                        margin: 0,
                        boxShadow: "none",
                        fontSize: "14.5px",
                        fontWeight: 500,
                        color: "#0f172a",
                      }}
                    />
                    {phone && (
                      <button
                        type="button"
                        onClick={() => setPhone("")}
                        className="printz-input-clear-btn"
                        title="Clear"
                        style={{ marginLeft: "auto" }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Branch */}
                <div className="printz-form-field">
                  <label className="printz-form-label">
                    Branch Name <span className="required" style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <BranchSelect
                    value={selectedBranch}
                    onChange={handleBranchChange}
                    branches={branches}
                    placeholder="Select a branch..."
                    required
                  />
                </div>

                {/* Location */}
                <div className="printz-form-field">
                  <label className="printz-form-label">Location</label>
                  <div
                    className="printz-input-wrapper-modern multiline"
                    style={{
                      background: "#ffffff",
                    }}
                    title={location || "Auto-filled from branch"}
                  >
                    <span
                      className="printz-input-badge-icon badge-blue"
                      style={{ marginTop: "2px", flexShrink: 0 }}
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

                {/* Capabilities Dropdown */}
                <div className="printz-form-field printz-capabilities-container" style={{ position: "relative" }}>
                  <label className="printz-form-label">Capabilities</label>
                  <div
                    className="printz-input-wrapper-modern"
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setShowCapabilitiesDropdown(!showCapabilitiesDropdown)
                    }
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, overflow: "hidden" }}>
                      <span className="printz-input-badge-icon badge-green">
                        <Layers size={16} />
                      </span>
                      <span style={{ fontSize: "14.5px", fontWeight: 500, color: permissions.length > 0 ? "#0f172a" : "#94a3b8" }}>
                        {permissions.length > 0
                          ? `${permissions.length} selected`
                          : "Select capabilities..."}
                      </span>
                    </div>
                    <ChevronDown size={16} color="#64748b" style={{ marginLeft: "auto", flexShrink: 0 }} />
                  </div>

                  {showCapabilitiesDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        padding: "12px",
                        marginTop: "6px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {AVAILABLE_CAPABILITIES.map((cap) => {
                        const isChecked = permissions.includes(cap.id);
                        return (
                          <label
                            key={cap.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              fontSize: "13px",
                              color: "#374151",
                              cursor: "pointer",
                              padding: "4px 6px",
                              borderRadius: "6px",
                              transition: "background 0.15s",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setPermissions((prev) =>
                                  checked
                                    ? [...prev, cap.id]
                                    : prev.filter((p) => p !== cap.id)
                                );
                              }}
                              style={{
                                width: "16px",
                                height: "16px",
                                accentColor: "#059669",
                                cursor: "pointer",
                              }}
                            />
                            <span>{cap.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Password fields or Reset in Edit Mode */}
                {editMode ? (
                  <div className="printz-form-field" style={{ gridColumn: "span 2" }}>
                    <label className="printz-form-label" style={{ fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                      Password Management
                    </label>
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #d1fae5",
                        borderRadius: "14px",
                        padding: "12px 18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "14px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            minWidth: "38px",
                            borderRadius: "10px",
                            background: "linear-gradient(180deg, #07d49b 0%, #03ae79 100%)",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: "0 3px 8px rgba(3, 174, 121, 0.25)",
                          }}
                        >
                          <Key size={17} strokeWidth={2.4} color="#ffffff" />
                        </div>
                        <div>
                          <h4 style={{ margin: "0 0 2px 0", fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                            Send Password Reset Email
                          </h4>
                          <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                            A password reset link will be sent to the admin's email address
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        disabled={isSendingReset || !currentUser}
                        style={{
                          background: "#ffffff",
                          border: "1.5px solid #a7f3d0",
                          color: "#059669",
                          borderRadius: "9px",
                          padding: "8px 16px",
                          fontWeight: 600,
                          fontSize: "13px",
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                          cursor: isSendingReset || !currentUser ? "not-allowed" : "pointer",
                          transition: "all 0.15s ease",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                          whiteSpace: "nowrap",
                        }}
                        onMouseOver={(e) => {
                          if (!isSendingReset && currentUser) {
                            e.currentTarget.style.background = "#f0fdf4";
                            e.currentTarget.style.borderColor = "#059669";
                          }
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "#ffffff";
                          e.currentTarget.style.borderColor = "#a7f3d0";
                        }}
                      >
                        <Send size={14} strokeWidth={2} />
                        <span>{isSendingReset ? "Sending..." : "Send Reset Email"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="printz-form-field">
                      <label className="printz-form-label">
                        Password <span className="required" style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <div className="printz-input-wrapper-modern">
                        <span className="printz-input-badge-icon badge-green">
                          <Lock size={16} />
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          className="printz-input-clean"
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          style={{
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            width: "100%",
                            flex: 1,
                            padding: 0,
                            margin: 0,
                            boxShadow: "none",
                            fontSize: "14.5px",
                            fontWeight: 500,
                            color: "#0f172a",
                          }}
                        />
                        <span
                          onClick={togglePasswordVisibility}
                          style={{ cursor: "pointer", color: "#9ca3af", display: "flex", padding: "4px", marginLeft: "auto" }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </span>
                      </div>
                    </div>

                    <div className="printz-form-field">
                      <label className="printz-form-label">
                        Confirm Password <span className="required" style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <div className="printz-input-wrapper-modern">
                        <span className="printz-input-badge-icon badge-green">
                          <Lock size={16} />
                        </span>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          className="printz-input-clean"
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          style={{
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            width: "100%",
                            flex: 1,
                            padding: 0,
                            margin: 0,
                            boxShadow: "none",
                            fontSize: "14.5px",
                            fontWeight: 500,
                            color: "#0f172a",
                          }}
                        />
                        <span
                          onClick={toggleConfirmPasswordVisibility}
                          style={{ cursor: "pointer", color: "#9ca3af", display: "flex", padding: "4px", marginLeft: "auto" }}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Actions */}
              <div style={MODAL_FOOTER_STYLE}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDialog(false);
                    handleReset();
                  }}
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
                    opacity: loading ? 0.75 : 1,
                  }}
                  onMouseOver={(e) => {
                    if (!loading) e.currentTarget.style.background = "#029b6b";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, #07d49b 0%, #03ae79 100%)";
                  }}
                >
                  <Check size={15} strokeWidth={2.6} />
                  <span>
                    {loading
                      ? "Saving..."
                      : editMode
                      ? "Save Changes"
                      : "Add Admin"}
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
              padding: "28px",
              borderRadius: "16px",
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
              Delete Admin
            </h3>
            <p
              style={{
                margin: "0 0 24px 0",
                fontSize: "14px",
                color: "#6b7280",
                lineHeight: "1.5",
              }}
            >
              Are you sure you want to delete admin{" "}
              <strong>{adminToDelete?.name || adminToDelete?.email}</strong>?
              This action cannot be undone.
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

      {/* View Admin Details Modal matching design mockup */}
      {viewingAdmin && (
        <div style={MODAL_OVERLAY_STYLE} onClick={() => setViewingAdmin(null)}>
          <div style={MODAL_CONTAINER_STYLE} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={MODAL_HEADER_ROW_STYLE}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <div style={MODAL_HEADER_ICON_STYLE}>
                  <ShieldCheck size={22} strokeWidth={2.4} color="#ffffff" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={MODAL_HEADER_TITLE_STYLE}>
                    Admin Details
                  </h3>
                  <p style={MODAL_HEADER_SUBTITLE_STYLE}>
                    Administrator profile and capabilities
                  </p>
                </div>
              </div>

              {/* Cross symbol */}
              <button
                type="button"
                onClick={() => setViewingAdmin(null)}
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
                padding: "12px 18px",
                marginBottom: "14px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Organic wave graphic in banner */}
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

              <div style={{ display: "flex", alignItems: "center", gap: "12px", zIndex: 1, minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: "46px",
                    height: "46px",
                    minWidth: "46px",
                    borderRadius: "50%",
                    background: "#059669",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "19px",
                    fontWeight: 700,
                    boxShadow: "0 3px 10px rgba(5, 150, 105, 0.25)",
                    flexShrink: 0,
                  }}
                >
                  {(viewingAdmin.name || "A").charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <h4 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a", lineHeight: 1.2, wordBreak: "break-word" }}>
                      {viewingAdmin.name || "Unnamed Admin"}
                    </h4>
                    <span
                      style={{
                        background: "#dcfce7",
                        color: "#059669",
                        fontSize: "10.5px",
                        fontWeight: 700,
                        padding: "2.5px 9px",
                        borderRadius: "9999px",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Admin
                    </span>
                  </div>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#475569", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal", lineHeight: 1.35 }}>
                    {viewingAdmin.email || "No email"}
                  </p>
                </div>
              </div>

              {/* Decorative Shield with Check on right side */}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "52px",
                  height: "52px",
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                <span style={{ position: "absolute", top: 1, left: 1, color: "#34d399", fontSize: "11px", opacity: 0.85 }}>✦</span>
                <span style={{ position: "absolute", bottom: 2, right: 1, color: "#34d399", fontSize: "10px", opacity: 0.85 }}>✦</span>

                {/* Outer translucent white ring shield */}
                <div
                  style={{
                    width: "44px",
                    height: "48px",
                    clipPath: "polygon(50% 0%, 100% 22%, 100% 75%, 50% 100%, 0% 75%, 0% 22%)",
                    background: "rgba(255, 255, 255, 0.8)",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.2)",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Inner green shield */}
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      clipPath: "polygon(50% 0%, 100% 22%, 100% 75%, 50% 100%, 0% 75%, 0% 22%)",
                      background: "linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 1) 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={21} strokeWidth={3.8} color="#ffffff" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2-Column Info Fields */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "12px",
                marginBottom: "14px",
              }}
            >
              {/* Email Address */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #edf2f7",
                  borderRadius: "15px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
                  gap: "10px",
                  boxSizing: "border-box",
                  minWidth: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      minWidth: "38px",
                      borderRadius: "11px",
                      background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "1px",
                      boxShadow: "0 3px 8px rgba(37, 99, 235, 0.2)",
                    }}
                  >
                    <Mail size={17} strokeWidth={2.3} color="#ffffff" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "11.5px", color: "#64748b", marginBottom: "2px", whiteSpace: "nowrap" }}>
                      Email Address
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#0f172a",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal",
                        lineHeight: 1.35,
                      }}
                      title={viewingAdmin.email || "-"}
                    >
                      {viewingAdmin.email || "-"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(viewingAdmin.email, "Email")}
                  style={{
                    width: "32px",
                    height: "32px",
                    minWidth: "32px",
                    maxWidth: "32px",
                    borderRadius: "50%",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    cursor: "pointer",
                    color: "#64748b",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    alignSelf: "flex-start",
                    padding: 0,
                    boxSizing: "border-box",
                    transition: "all 0.15s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.color = "#0f172a";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.color = "#64748b";
                  }}
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
                  borderRadius: "15px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
                  gap: "10px",
                  boxSizing: "border-box",
                  minWidth: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      minWidth: "38px",
                      borderRadius: "11px",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "1px",
                      boxShadow: "0 3px 8px rgba(5, 150, 105, 0.2)",
                    }}
                  >
                    <Phone size={17} strokeWidth={2.3} color="#ffffff" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "11.5px", color: "#64748b", marginBottom: "2px", whiteSpace: "nowrap" }}>
                      Phone Number
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#0f172a",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal",
                        lineHeight: 1.35,
                      }}
                    >
                      {viewingAdmin.phone || "-"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(viewingAdmin.phone, "Phone number")}
                  style={{
                    width: "32px",
                    height: "32px",
                    minWidth: "32px",
                    maxWidth: "32px",
                    borderRadius: "50%",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    cursor: "pointer",
                    color: "#64748b",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    alignSelf: "flex-start",
                    padding: 0,
                    boxSizing: "border-box",
                    transition: "all 0.15s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.color = "#0f172a";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.color = "#64748b";
                  }}
                  title="Copy Phone"
                >
                  <Copy size={13} strokeWidth={1.8} />
                </button>
              </div>

              {/* Branch Assigned */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #edf2f7",
                  borderRadius: "15px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
                  gap: "10px",
                  boxSizing: "border-box",
                  minWidth: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      minWidth: "38px",
                      borderRadius: "11px",
                      background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "1px",
                      boxShadow: "0 3px 8px rgba(99, 102, 241, 0.2)",
                    }}
                  >
                    <Building2 size={17} strokeWidth={2.3} color="#ffffff" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "11.5px", color: "#64748b", marginBottom: "2px", whiteSpace: "nowrap" }}>
                      Branch Assigned
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#0f172a",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal",
                        lineHeight: 1.35,
                      }}
                    >
                      {viewingAdmin.branch || "-"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(viewingAdmin.branch, "Branch")}
                  style={{
                    width: "32px",
                    height: "32px",
                    minWidth: "32px",
                    maxWidth: "32px",
                    borderRadius: "50%",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    cursor: "pointer",
                    color: "#64748b",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    alignSelf: "flex-start",
                    padding: 0,
                    boxSizing: "border-box",
                    transition: "all 0.15s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.color = "#0f172a";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.color = "#64748b";
                  }}
                  title="Copy Branch"
                >
                  <Copy size={13} strokeWidth={1.8} />
                </button>
              </div>

              {/* Location */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #edf2f7",
                  borderRadius: "15px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
                  gap: "10px",
                  boxSizing: "border-box",
                  minWidth: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      minWidth: "38px",
                      borderRadius: "11px",
                      background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "1px",
                      boxShadow: "0 3px 8px rgba(234, 88, 12, 0.2)",
                    }}
                  >
                    <MapPin size={17} strokeWidth={2.3} color="#ffffff" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "11.5px", color: "#64748b", marginBottom: "2px", whiteSpace: "nowrap" }}>
                      Location
                    </div>
                    <div
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 600,
                        color: "#0f172a",
                        lineHeight: 1.45,
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal",
                      }}
                      title={viewingAdmin.location || "-"}
                    >
                      {viewingAdmin.location || "-"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(viewingAdmin.location, "Location")}
                  style={{
                    width: "32px",
                    height: "32px",
                    minWidth: "32px",
                    maxWidth: "32px",
                    borderRadius: "50%",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    cursor: "pointer",
                    color: "#64748b",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    alignSelf: "flex-start",
                    padding: 0,
                    boxSizing: "border-box",
                    transition: "all 0.15s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.color = "#0f172a";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.color = "#64748b";
                  }}
                  title="Copy Location"
                >
                  <Copy size={13} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {/* Capabilities Section */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      minWidth: "34px",
                      borderRadius: "10px",
                      background: "linear-gradient(180deg, #07d49b 0%, #03ae79 100%)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: "0 3px 8px rgba(3, 174, 121, 0.25)",
                    }}
                  >
                    <Layers size={17} strokeWidth={2.4} color="#ffffff" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14.5px", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                      Capabilities & Permissions
                    </h4>
                    <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "#64748b" }}>
                      Modules and features accessible by this admin
                    </p>
                  </div>
                </div>

                {/* Count pill */}
                <span
                  style={{
                    background: "#ecfdf5",
                    color: "#047857",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    padding: "3px 11px",
                    borderRadius: "9999px",
                  }}
                >
                  {getActiveCapabilities(viewingAdmin).length} Capabilities
                </span>
              </div>

              {/* Badges List */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {getActiveCapabilities(viewingAdmin).length > 0 ? (
                  getActiveCapabilities(viewingAdmin).map((cap) => (
                    <div
                      key={cap.id}
                      style={{
                        background: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        borderRadius: "9999px",
                        padding: "5px 12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          width: "15px",
                          height: "15px",
                          minWidth: "15px",
                          borderRadius: "50%",
                          background: "#059669",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Check size={9} strokeWidth={3.5} color="#ffffff" />
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#065f46" }}>
                        {cap.label}
                      </span>
                    </div>
                  ))
                ) : (
                  <span style={{ color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>
                    No specific capabilities assigned
                  </span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={MODAL_FOOTER_STYLE}>
              <button
                type="button"
                onClick={() => setViewingAdmin(null)}
                style={MODAL_SECONDARY_BTN_STYLE}
                onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#ffffff")}
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const adminToEdit = viewingAdmin;
                  setViewingAdmin(null);
                  handleEdit(adminToEdit);
                }}
                style={MODAL_PRIMARY_BTN_STYLE}
                onMouseOver={(e) => (e.currentTarget.style.background = "#029b6b")}
                onMouseOut={(e) => (e.currentTarget.style.background = "linear-gradient(135deg, #07d49b 0%, #03ae79 100%)")}
              >
                <Pencil size={13} strokeWidth={2.4} color="#ffffff" />
                <span>Edit Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddAdmin;