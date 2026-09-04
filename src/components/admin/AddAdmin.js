import React, { useState, useEffect, useCallback } from "react";
import { app, auth, db } from "../../services/authservice";
import { setDoc, doc, getDocs, collection } from "firebase/firestore";
import {
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaArrowRight,
  FaKey,
} from "react-icons/fa";
import { MdOutlineFileDownloadDone } from "react-icons/md";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/addmanager.css";
import Popup from "../common/Popup";
import { usePopup } from "../../hooks/usePopup";
import { getFunctions, httpsCallable } from "firebase/functions";
import { onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { toast } from "react-toastify";

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
  const [editMode, setEditMode] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [location, setLocation] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [branches, setBranches] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [currentUser, setCurrentUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCapabilitiesDropdown, setShowCapabilitiesDropdown] =
    useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "branches"));
      const branchData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        address: doc.data().address || "",
      }));
      const sortedBranches = branchData.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setBranches(sortedBranches);
      if (sortedBranches.length > 0 && !selectedBranch) {
        setSelectedBranch(sortedBranches[0].name);
        setLocation(sortedBranches[0].address);
      }
    } catch (error) {
      console.error("Failed to fetch branch names: ", error);
    }
  }, [selectedBranch]);

  const fetchAdmins = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const adminList = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter(
        (user) => user.role === "admin" && user.id !== auth.currentUser?.uid
      );
    setAdmins(adminList);
  };

  const handleBranchChange = (event) => {
    const selectedBranchName = event.target.value;
    setSelectedBranch(selectedBranchName);
    const selectedBranchData = branches.find(
      (branch) => branch.name === selectedBranchName
    );
    setLocation(selectedBranchData ? selectedBranchData.address || "" : "");
  };

  useEffect(() => {
    if (currentUser) {
      fetchAdmins();
      fetchBranches();
    }
  }, [currentUser, fetchBranches]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showCapabilitiesDropdown &&
        !event.target.closest(".custom-dropdown")
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
    e.preventDefault();
    setError("");

    if (!editMode && password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    const userPermissions = permissions.reduce((acc, perm) => {
      acc[perm] = true;
      return acc;
    }, {});

    try {
      if (editMode) {
        const docRef = doc(db, `users/${currentAdmin.id}`);
        await setDoc(
          docRef,
          {
            name,
            email,
            phone,
            branch: selectedBranch,
            location,
            role: "admin",
            permissions: userPermissions,
          },
          { merge: true }
        );
      } else {
        if (!currentUser) {
          setError("Authentication error. Please log in again.");
          setLoading(false);
          return;
        }

        const functions = getFunctions(app);
        const createUserCallable = httpsCallable(functions, "createUser");

        await createUserCallable({
          email,
          password,
          name,
          phone,
          branch: selectedBranch,
          location,
          role: "admin",
          permissions: userPermissions,
        });
      }
      setLoading(false);
      handleReset();
      fetchAdmins();
      setShowAddDialog(false);
      showSuccess(
        "Admin Saved Successfully",
        `Admin ${name} has been ${
          editMode ? "updated" : "created"
        } successfully.`
      );
    } catch (error) {
      setError(error.message || "Failed to save admin");
      showError(
        "Save Failed",
        `Failed to save admin: ${error.message || "Unknown error"}.`
      );
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
    setPermissions([]);
    setError("");
    setEditMode(false);
    setCurrentAdmin(null);
    setShowAddDialog(false);
    setShowCapabilitiesDropdown(false);
  };

  const handleEdit = (admin) => {
    setCurrentAdmin(admin);
    setEditMode(true);
    setName(admin.name);
    setEmail(admin.email);
    setPhone(admin.phone);
    setSelectedBranch(admin.branch);
    setLocation(admin.location);
    setPermissions(Object.keys(admin.permissions || {}));
    setShowAddDialog(true);
  };

  const openAddDialog = () => {
    setEditMode(false);
    setCurrentAdmin(null);
    setName("");
    setEmail("");
    setPhone("");
    setSelectedBranch(branches.length > 0 ? branches[0].name : "");
    setLocation(branches.length > 0 ? branches[0].address : "");
    setPassword("");
    setConfirmPassword("");
    setPermissions([]);
    setError("");
    setShowAddDialog(true);
    setShowCapabilitiesDropdown(false);
  };

  const handlePasswordReset = async () => {
    if (!currentAdmin || !currentAdmin.email) {
      toast.error("Admin details not found. Cannot send reset email.");
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, currentAdmin.email);
      toast.success(
        `Password reset email sent to ${currentAdmin.email}. Please check the spam folder if you can't find the email.`
      );
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to send password reset email.");
    } finally {
      setIsSendingReset(false);
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
      const functions = getFunctions(app);
      const deleteUserCallable = httpsCallable(functions, "deleteUser");

      const uidToDelete = adminToDelete.id || adminToDelete.uid;

      await deleteUserCallable({
        uid: uidToDelete,
      });

      fetchAdmins();
      setShowDeleteModal(false);
      setAdminToDelete(null);
      showSuccess(
        "Admin Deleted",
        `Admin ${adminToDelete.name} has been deleted successfully.`
      );
    } catch (error) {
      showError(
        "Delete Failed",
        `Failed to delete admin: ${error.message || "Unknown error"}.`
      );
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setAdminToDelete(null);
  };

  // Filter admins based on search term
  const filteredAdmins = admins.filter((admin) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      admin.name?.toLowerCase().includes(searchLower) ||
      admin.email?.toLowerCase().includes(searchLower) ||
      admin.branch?.toLowerCase().includes(searchLower)
    );
  });

  const totalFilteredPages = Math.ceil(filteredAdmins.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAdmins = filteredAdmins.slice(indexOfFirstItem, indexOfLastItem);

  const formatCapability = (cap) => {
    // Remove "is" prefix
    let formatted = cap.startsWith("is") ? cap.slice(2) : cap;
    // Insert space before capital letters (except first)
    formatted = formatted.replace(/([A-Z])/g, " $1").trim();
    return formatted;
  };

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="add-manager-page">
      <Popup {...popup} />

      {/* Add/Edit Admin Dialog */}
      {showAddDialog && (
        <div className="modal-overlay" onClick={() => setShowAddDialog(false)}>
          <div
            className="modal-content admin-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{editMode ? "Edit Admin" : "Add Admin"}</h2>
              <button
                className="close-button"
                onClick={() => setShowAddDialog(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {error && <p className="error">{error}</p>}

              <div className="form-group-horizontal">
                <label>Name:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter full name"
                />
              </div>

              <div className="form-group-horizontal">
                <label>Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={editMode}
                  placeholder="Enter email address"
                />
              </div>

              {editMode && (
                <div className="reset-password-section">
                  <button
                    type="button"
                    className="reset-password-button"
                    onClick={handlePasswordReset}
                    disabled={isSendingReset || !currentUser}
                  >
                    <FaKey />
                    {isSendingReset
                      ? "Sending Email..."
                      : "Send Password Reset Email"}
                  </button>
                </div>
              )}

              <div className="form-group-horizontal">
                <label>Phone Number:</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-group-horizontal">
                <label>Branch Name:</label>
                <select value={selectedBranch} onChange={handleBranchChange}>
                  <option value="" disabled>
                    Select a branch...
                  </option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group-horizontal">
                <label>Location:</label>
                <input
                  type="text"
                  value={location}
                  disabled
                  placeholder="Auto-filled from branch selection"
                />
              </div>

              <div className="form-group-horizontal capabilities-group">
                <label>Capabilities:</label>
                <div className="custom-dropdown">
                  <div
                    className="dropdown-header"
                    onClick={() =>
                      setShowCapabilitiesDropdown(!showCapabilitiesDropdown)
                    }
                  >
                    <span>
                      {permissions.length > 0
                        ? `${permissions.length} capability${
                            permissions.length > 1 ? "ies" : "y"
                          } selected`
                        : "Select capabilities..."}
                    </span>
                    <FaTimes
                      className={`dropdown-arrow ${
                        showCapabilitiesDropdown ? "rotated" : ""
                      }`}
                      style={{
                        transform: showCapabilitiesDropdown
                          ? "rotate(45deg)"
                          : "rotate(0deg)",
                      }}
                    />
                  </div>
                  {showCapabilitiesDropdown && (
                    <div className="dropdown-content">
                      <div className="checkbox-item">
                        <input
                          type="checkbox"
                          id="isDashboardCapability"
                          value="isDashboardCapability"
                          onChange={(e) => {
                            const { value, checked } = e.target;
                            setPermissions((prev) => {
                              if (checked) {
                                return [...prev, value];
                              } else {
                                return prev.filter((p) => p !== value);
                              }
                            });
                          }}
                          checked={permissions.includes(
                            "isDashboardCapability"
                          )}
                        />
                        <label htmlFor="isDashboardCapability">
                          Dashboard Capability
                        </label>
                      </div>
                      <div className="checkbox-item">
                        <input
                          type="checkbox"
                          id="isPrinterCapability"
                          value="isPrinterCapability"
                          onChange={(e) => {
                            const { value, checked } = e.target;
                            setPermissions((prev) => {
                              if (checked) {
                                return [...prev, value];
                              } else {
                                return prev.filter((p) => p !== value);
                              }
                            });
                          }}
                          checked={permissions.includes("isPrinterCapability")}
                        />
                        <label htmlFor="isPrinterCapability">
                          Printer Capability
                        </label>
                      </div>
                      <div className="checkbox-item">
                        <input
                          type="checkbox"
                          id="isStockCapability"
                          value="isStockCapability"
                          onChange={(e) => {
                            const { value, checked } = e.target;
                            setPermissions((prev) => {
                              if (checked) {
                                return [...prev, value];
                              } else {
                                return prev.filter((p) => p !== value);
                              }
                            });
                          }}
                          checked={permissions.includes("isStockCapability")}
                        />
                        <label htmlFor="isStockCapability">
                          Stock Capability
                        </label>
                      </div>
                      <div className="checkbox-item">
                        <input
                          type="checkbox"
                          id="isRevenueCapability"
                          value="isRevenueCapability"
                          onChange={(e) => {
                            const { value, checked } = e.target;
                            setPermissions((prev) => {
                              if (checked) {
                                return [...prev, value];
                              } else {
                                return prev.filter((p) => p !== value);
                              }
                            });
                          }}
                          checked={permissions.includes("isRevenueCapability")}
                        />
                        <label htmlFor="isRevenueCapability">
                          Revenue Capability
                        </label>
                      </div>
                      <div className="checkbox-item">
                        <input
                          type="checkbox"
                          id="isAddAdmin"
                          value="isAddAdmin"
                          onChange={(e) => {
                            const { value, checked } = e.target;
                            setPermissions((prev) => {
                              if (checked) {
                                return [...prev, value];
                              } else {
                                return prev.filter((p) => p !== value);
                              }
                            });
                          }}
                          checked={permissions.includes("isAddAdmin")}
                        />
                        <label htmlFor="isAddAdmin">Add Admin</label>
                      </div>
                      <div className="checkbox-item">
                        <input
                          type="checkbox"
                          id="isAddManager"
                          value="isAddManager"
                          onChange={(e) => {
                            const { value, checked } = e.target;
                            setPermissions((prev) => {
                              if (checked) {
                                return [...prev, value];
                              } else {
                                return prev.filter((p) => p !== value);
                              }
                            });
                          }}
                          checked={permissions.includes("isAddManager")}
                        />
                        <label htmlFor="isAddManager">Add Manager</label>
                      </div>
                      <div className="checkbox-item">
                        <input
                          type="checkbox"
                          id="isExtraCapability"
                          value="isExtraCapability"
                          onChange={(e) => {
                            const { value, checked } = e.target;
                            setPermissions((prev) => {
                              if (checked) {
                                return [...prev, value];
                              } else {
                                return prev.filter((p) => p !== value);
                              }
                            });
                          }}
                          checked={permissions.includes("isExtraCapability")}
                        />
                        <label htmlFor="isExtraCapability">
                          Extra Features
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!editMode && (
                <>
                  <div className="form-group-horizontal password-container">
                    <label>Password:</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter password"
                      />
                      <span
                        className="password-toggle"
                        onClick={togglePasswordVisibility}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </span>
                    </div>
                  </div>

                  <div className="form-group-horizontal password-container">
                    <label>Confirm Password:</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm password"
                      />
                      <span
                        className="password-toggle"
                        onClick={toggleConfirmPasswordVisibility}
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDialog(false);
                    handleReset();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  disabled={loading || !currentUser}
                  type="submit"
                  className="submit-btn"
                >
                  <MdOutlineFileDownloadDone />{" "}
                  {editMode ? "Save Changes" : "Add Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <div className="table-header">
          <h2>Admins</h2>
          <div
            className="table-controls"
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
          >
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="items-per-page-select"
              style={{
                padding: "5px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={15}>15 per page</option>
              <option value={20}>20 per page</option>
            </select>
            <button className="add-admin-btn" onClick={openAddDialog}>
              Add Admin
            </button>
          </div>
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search admins by name, email, or branch..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            className="search-input"
          />
        </div>

        <div className="table-wrapper">
          <table className="admins-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Branch</th>
                <th>Capabilities</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentAdmins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>{admin.phone}</td>
                  <td>{admin.branch}</td>
                  <td>
                    <div
                      className="capabilities-list"
                      title={Object.keys(admin.permissions || {})
                        .map(formatCapability)
                        .join(", ")}
                    >
                      {Object.keys(admin.permissions || {})
                        .map(formatCapability)
                        .join(", ")}
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      <FaEdit
                        onClick={() => (currentUser ? handleEdit(admin) : null)}
                        className={`action-icon edit-icon ${
                          !currentUser ? "disabled" : ""
                        }`}
                        title="Edit Admin"
                      />
                      <FaTrash
                        onClick={() =>
                          currentUser ? handleDelete(admin) : null
                        }
                        className={`action-icon delete-icon ${
                          !currentUser ? "disabled" : ""
                        }`}
                        title="Delete Admin"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalFilteredPages > 1 && (
          <div className="pagination-controls">
            <button
              className={`pagination-button ${
                currentPage === 1 ? "disabled" : ""
              }`}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                fontSize: "12px",
                padding: "5px 10px",
                borderRadius: "4px",
              }}
            >
              <FaArrowLeft />
            </button>
            <span className="page-info">
              Page {currentPage} of {totalFilteredPages}
            </span>
            <button
              className={`pagination-button ${
                currentPage === totalFilteredPages ? "disabled" : ""
              }`}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalFilteredPages}
              style={{
                fontSize: "12px",
                padding: "5px 10px",
                borderRadius: "4px",
              }}
            >
              <FaArrowRight />
            </button>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Are you sure you want to delete this admin?</h3>
            <div className="modal-actions">
              <button onClick={confirmDelete}>Yes</button>
              <button onClick={closeDeleteModal}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddAdmin;
