import React, { useState, useEffect } from "react";
import { app, auth, db } from "../../services/authservice";
import { setDoc, doc, getDocs, collection } from "firebase/firestore";
import { FaEye, FaEyeSlash, FaTimes, FaEdit, FaTrash, FaArrowLeft, FaArrowRight, FaKey } from "react-icons/fa";
import { MdOutlineFileDownloadDone } from "react-icons/md";
import { FaUndo } from "react-icons/fa";
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
  const itemsPerPage = 4;
  const totalPages = Math.ceil(admins.length / itemsPerPage);

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchAdmins();
    }
    fetchBranches();
  }, [currentUser]);

  const fetchBranches = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "branches"));
      const branchData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        address: doc.data().address || "",
      }));
      const sortedBranches = branchData.sort((a, b) => a.name.localeCompare(b.name));
      setBranches(sortedBranches);
      if (sortedBranches.length > 0 && !selectedBranch) {
        setSelectedBranch(sortedBranches[0].name);
        setLocation(sortedBranches[0].address);
      }
    } catch (error) {
      console.error("Failed to fetch branch names: ", error);
    }
  };

  const handleBranchChange = (event) => {
    const selectedBranchName = event.target.value;
    setSelectedBranch(selectedBranchName);
    const selectedBranchData = branches.find((branch) => branch.name === selectedBranchName);
    setLocation(selectedBranchData ? selectedBranchData.address || "" : "");
  };

  const fetchAdmins = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const adminList = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((user) => user.role === "admin" && user.id !== auth.currentUser?.uid);
    setAdmins(adminList);
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

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
        await setDoc(docRef, {
          name,
          email,
          phone,
          branch: selectedBranch,
          location,
          role: "admin",
          permissions: userPermissions,
        }, { merge: true });
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
          permissions: userPermissions
        });
      }
      setLoading(false);
      handleReset();
      fetchAdmins();
      showSuccess("Admin Saved Successfully", `Admin ${name} has been ${editMode ? 'updated' : 'created'} successfully.`);
    } catch (error) {
      setError(error.message || "Failed to save admin");
      showError("Save Failed", `Failed to save admin: ${error.message || 'Unknown error'}.`);
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
  };

  const handlePasswordReset = async () => {
    if (!currentAdmin || !currentAdmin.email) {
      toast.error("Admin details not found. Cannot send reset email.");
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, currentAdmin.email);
      toast.success(`Password reset email sent to ${currentAdmin.email}. Please check the spam folder if you can't find the email.`);
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
        uid: uidToDelete
      });

      fetchAdmins();
      setShowDeleteModal(false);
      setAdminToDelete(null);
      showSuccess("Admin Deleted", `Admin ${adminToDelete.name} has been deleted successfully.`);
    } catch (error) {
      showError("Delete Failed", `Failed to delete admin: ${error.message || 'Unknown error'}.`);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setAdminToDelete(null);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAdmins = admins.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const handlePermissionChange = (e) => {
    const { value, checked } = e.target;
    setPermissions((prev) => {
      if (checked) {
        return [...prev, value];
      } else {
        return prev.filter((p) => p !== value);
      }
    });
  };

  return (
    <div className="add-manager-page">
      <Popup {...popup} />
      <div className="form-container">
        <h2>{editMode ? "Edit Admin" : "Add Admin"}</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div>
            <label>Name</label>
            <input
              type="text"
              value={name}
              style={{ width: "100%" }}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={editMode} />
          </div>

          {editMode && (
            <div className="reset-password-action">
              <button
                type="button"
                className="reset-password-button"
                onClick={handlePasswordReset}
                disabled={isSendingReset || !currentUser}
              >
                <FaKey /> {isSendingReset ? 'Sending Email...' : 'Send Password Reset Email'}
              </button>
            </div>
          )}

          <div>
            <label>Phone Number</label>
            <input
              type="text"
              value={phone}
              style={{ width: "100%" }}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Branch Name:</label>
            <select
              value={selectedBranch}
              onChange={handleBranchChange}
              className="input-style"
              style={{ width: "100%" }}
            >
              <option value="" disabled>Select...</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Location:</label>
            <input type="text" value={location} className="input-style" style={{ width: "100%" }} disabled />
          </div>
          <div className="form-group">
            <label>Capabilities</label>
            <div className="size-checkboxes">
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="isDashboardCapability"
                  value="isDashboardCapability"
                  onChange={handlePermissionChange}
                  checked={permissions.includes("isDashboardCapability")}
                />
                <label htmlFor="isDashboardCapability">Dashboard Capability</label>
              </div>
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="isPrinterCapability"
                  value="isPrinterCapability"
                  onChange={handlePermissionChange}
                  checked={permissions.includes("isPrinterCapability")}
                />
                <label htmlFor="isPrinterCapability">Printer Capability</label>
              </div>
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="isStockCapability"
                  value="isStockCapability"
                  onChange={handlePermissionChange}
                  checked={permissions.includes("isStockCapability")}
                />
                <label htmlFor="isStockCapability">Stock Capability</label>
              </div>
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="isRevenueCapability"
                  value="isRevenueCapability"
                  onChange={handlePermissionChange}
                  checked={permissions.includes("isRevenueCapability")}
                />
                <label htmlFor="isRevenueCapability">Revenue Capability</label>
              </div>
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="isAddAdmin"
                  value="isAddAdmin"
                  onChange={handlePermissionChange}
                  checked={permissions.includes("isAddAdmin")}
                />
                <label htmlFor="isAddAdmin">Add Admin</label>
              </div>
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="isAddManager"
                  value="isAddManager"
                  onChange={handlePermissionChange}
                  checked={permissions.includes("isAddManager")}
                />
                <label htmlFor="isAddManager">Add Manager</label>
              </div>
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="isExtraCapability"
                  value="isExtraCapability"
                  onChange={handlePermissionChange}
                  checked={permissions.includes("isExtraCapability")}
                />
                <label htmlFor="isExtraCapability">Extra features</label>
              </div>
            </div>
          </div>
          {!editMode && (
            <>
              <div className="password-container">
                <label>Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span onClick={togglePasswordVisibility}>{showPassword ? <FaEyeSlash /> : <FaEye />}</span>
              </div>
              <div className="password-container">
                <label>Confirm Password</label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <span onClick={toggleConfirmPasswordVisibility}>
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </>
          )}
          <div className="button-group">
            <button disabled={loading || !currentUser} type="submit">
              <MdOutlineFileDownloadDone /> {editMode ? "Save" : "Add Admin"}
            </button>
            <button type="button" onClick={handleReset}>
              {editMode ? <FaTimes /> : <FaUndo />} {editMode ? "Cancel" : "Reset"}
            </button>
          </div>
        </form>
      </div>

      <div className="card-container">
        <h2>Admins</h2>
        {currentAdmins.map((admin) => (
          <div className="manager-card" key={admin.id}>
            <h3>{admin.name}</h3>
            <p>{admin.email}</p>
            <p>{admin.branch}</p>
            <div className="card-actions">
              <FaEdit
                onClick={() => currentUser ? handleEdit(admin) : null}
                className={`edit-icon ${!currentUser ? 'disabled' : ''}`}
              />
              <FaTrash
                onClick={() => currentUser ? handleDelete(admin) : null}
                className={`delete-icon ${!currentUser ? 'disabled' : ''}`}
              />
            </div>
          </div>
        ))}

        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              className={`pagination-button ${currentPage === 1 ? "disabled" : ""}`}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <FaArrowLeft />
            </button>
            <span className="page-number">{currentPage}</span>
            <button
              className={`pagination-button ${currentPage === totalPages ? "disabled" : ""}`}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
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
