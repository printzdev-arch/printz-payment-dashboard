// import React, { useState, useEffect } from 'react';
// import { app, auth, db } from '../../services/authservice';
// import { setDoc, doc, getDocs, collection } from 'firebase/firestore';
// import { ToastContainer, toast } from 'react-toastify';
// import { FaEye, FaEyeSlash, FaTimes, FaEdit, FaTrash, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
// import { MdOutlineFileDownloadDone } from 'react-icons/md';
// import { FaUndo } from 'react-icons/fa';
// import 'react-toastify/dist/ReactToastify.css';
// import '../../styles/addmanager.css';
// import Popup from "../common/Popup";
// import { getFunctions, httpsCallable } from 'firebase/functions';
// import { usePopup } from "../../hooks/usePopup";
// import { onAuthStateChanged } from "firebase/auth";

// const AddManager = () => {
//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [phone, setPhone] = useState('');
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [managers, setManagers] = useState([]);
//   const [editMode, setEditMode] = useState(false);
//   const [currentManager, setCurrentManager] = useState(null);
//   const [currentUser, setCurrentUser] = useState(null);

//   const { popup, showSuccess } = usePopup();

//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [managerToDelete, setManagerToDelete] = useState(null);

//   const [location, setLocation] = useState('');
//   const [branches, setBranches] = useState([]);
//   const [selectedBranch, setSelectedBranch] = useState('');

//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 4;
//   const totalPages = Math.ceil(managers.length / itemsPerPage);

//   useEffect(() => {
//     if (currentUser) {
//       fetchManagers();
//     }
//     fetchBranches();
//   }, [currentUser]);

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (user) => {
//       setCurrentUser(user);
//     });
//     return () => unsubscribe();
//   }, []);

//   const fetchBranches = async () => {
//     try {
//       const querySnapshot = await getDocs(collection(db, 'branches'));
//       const branchData = querySnapshot.docs.map(doc => ({
//         id: doc.id,
//         name: doc.data().name,
//         address: doc.data().address || '',
//       }));
//       const sortedBranches = branchData.sort((a, b) => a.name.localeCompare(b.name));
//       setBranches(sortedBranches);
//       if (sortedBranches.length > 0 && !selectedBranch) {
//         setSelectedBranch(sortedBranches[0].name);
//         setLocation(sortedBranches[0].address);
//       }
//     } catch (error) {
//       console.error("Failed to fetch branch names: ", error);
//     }
//   };

//   const handleBranchChange = (event) => {
//     const selectedBranchName = event.target.value;
//     setSelectedBranch(selectedBranchName);
//     const selectedBranchData = branches.find(branch => branch.name === selectedBranchName);
//     setLocation(selectedBranchData ? selectedBranchData.address || '' : '');
//   };

//   const fetchManagers = async () => {
//     const querySnapshot = await getDocs(collection(db, 'users'));
//     const managerList = querySnapshot.docs
//       .map(doc => ({ id: doc.id, ...doc.data() }))
//       .filter(user => user.role === 'manager'); // Reverted to only show managers
//     setManagers(managerList);
//   };

//   const togglePasswordVisibility = () => setShowPassword(!showPassword);
//   const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     console.log("Current user:", auth.currentUser);
//     if (auth.currentUser) {
//       const token = await auth.currentUser.getIdToken();
//       console.log("ID Token:", token);
//     }

//     if (!editMode && password !== confirmPassword) {
//       return setError('Passwords do not match');
//     }

//     setLoading(true);
//     try {
//       if (editMode) {
//         const docRef = doc(db, `users/${currentManager.id}`);
//         // When editing, we still specify the role to ensure it doesn't get changed
//         await setDoc(docRef, { name, email, phone, branch: selectedBranch, location, role: 'manager' }, { merge: true });
//       } else {
//         // <<< CHANGED: use httpsCallable (callable function) instead of fetch to onRequest URL >>>
//         const functions = getFunctions(app);
//         const createUserCallable = httpsCallable(functions, 'createUser');

//         await createUserCallable({
//           email,
//           password,
//           name,
//           phone,
//           branch: selectedBranch,
//           location,
//           role: 'manager' // Hardcoded to 'manager' for this page
//         });
//       }

//       setLoading(false);
//       handleReset();
//       fetchManagers();
//       toast.success(`Manager ${editMode ? 'updated' : 'created'} successfully`);

//     } catch (error) {
//       setError(error.message || 'Failed to save manager');
//       setLoading(false);
//     }
//   };

//   const handleReset = () => {
//     setName('');
//     setEmail('');
//     setPhone('');
//     setSelectedBranch(branches.length > 0 ? branches[0].name : '');
//     setLocation(branches.length > 0 ? branches[0].address : '');
//     setPassword('');
//     setConfirmPassword('');
//     setError('');
//     setEditMode(false);
//     setCurrentManager(null);
//   };

//   const handleEdit = (manager) => {
//     setCurrentManager(manager);
//     setEditMode(true);
//     setName(manager.name);
//     setEmail(manager.email);
//     setPhone(manager.phone);
//     setSelectedBranch(manager.branch);
//     setLocation(manager.location);
//   };

//   const handleDelete = (manager) => {
//     setManagerToDelete(manager);
//     setShowDeleteModal(true);
//   };

//   const confirmDelete = async () => {

//     console.log("Current user at time of delete:", auth.currentUser);
//     if (!currentUser) {
//       toast.error("Authentication error. Please log in again.");
//       return;
//     }
//     if (!managerToDelete) return;

//     try {
//       // <<< CHANGED: use httpsCallable (callable function) instead of fetch to onRequest URL >>>
//       const functions = getFunctions(app);
//       const deleteUserCallable = httpsCallable(functions, 'deleteUser');

//       // fallback to uid if available
//       const uidToDelete = managerToDelete.id || managerToDelete.uid;

//       await deleteUserCallable({ uid: uidToDelete });

//       fetchManagers();
//       setShowDeleteModal(false);
//       setManagerToDelete(null);
//       toast.success('Manager deleted successfully');
//     } catch (error) {
//       console.error("Error calling deleteUser function:", error);
//       toast.error(error.message || 'Failed to delete user');
//     }
//   };

//   const closeDeleteModal = () => {
//     setShowDeleteModal(false);
//     setManagerToDelete(null);
//   };

//   const indexOfLastItem = currentPage * itemsPerPage;
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
//   const currentManagers = managers.slice(indexOfFirstItem, indexOfLastItem);

//   const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

//   return (
//     <div className="add-manager-page">
//       <Popup {...popup} />

//       <div className="form-container">
//         <h2>{editMode ? 'Edit Manager' : 'Add Manager'}</h2>
//         {error && <p className="error">{error}</p>}
//         <form onSubmit={handleSubmit}>
//           <div>
//             <label>Name</label>
//             <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} required />
//           </div>
//           <div>
//             <label>Email</label>
//             <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={editMode} />
//           </div>
//           <div>
//             <label>Phone Number</label>
//             <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%" }} required />
//           </div>
//           <div>
//             <label>BranchName:</label>
//             <select value={selectedBranch} onChange={handleBranchChange} className="input-style">
//               <option value="" disabled>Select...</option>
//               {branches.map((branch) => (
//                 <option key={branch.id} value={branch.name}>
//                   {branch.name}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label>Location:</label>
//             <input type="text" value={location} className="input-field" style={{ width: "100%" }} disabled />
//           </div>
//           {!editMode && (
//             <>
//               <div className="password-container">
//                 <label>Password</label>
//                 <input
//                   type={showPassword ? "text" : "password"}
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   required
//                 />
//                 <span onClick={togglePasswordVisibility}>{showPassword ? <FaEyeSlash /> : <FaEye />}</span>
//               </div>
//               <div className="password-container">
//                 <label>Confirm Password</label>
//                 <input
//                   type={showConfirmPassword ? "text" : "password"}
//                   value={confirmPassword}
//                   onChange={(e) => setConfirmPassword(e.target.value)}
//                   required
//                 />
//                 <span onClick={toggleConfirmPasswordVisibility}>{showConfirmPassword ? <FaEyeSlash /> : <FaEye />}</span>
//               </div>
//             </>
//           )}
//           <div className="button-group">
//             <button disabled={loading || !currentUser} type="submit">
//               <MdOutlineFileDownloadDone /> {editMode ? 'Save Manager' : 'Add Manager'}
//             </button>
//             <button type="button" onClick={handleReset}>
//               {editMode ? <FaTimes /> : <FaUndo />} {editMode ? 'Cancel' : 'Reset'}
//             </button>
//           </div>
//         </form>
//       </div>

//       <div className="card-container">
//         <h2>Stores</h2>
//         {currentManagers.map(manager => (
//           <div className="manager-card" key={manager.id}>
//             <h3>{manager.name}</h3>
//             <p>{manager.email}</p>
//             <p>{manager.branch}</p>
//             <div className="card-actions">
//               <FaEdit
//                 onClick={() => currentUser ? handleEdit(manager) : null}
//                 className={`edit-icon ${!currentUser ? 'disabled' : ''}`}
//               />
//               <FaTrash
//                 onClick={() => currentUser ? handleDelete(manager) : null}
//                 className={`delete-icon ${!currentUser ? 'disabled' : ''}`}
//               />
//             </div>
//           </div>
//         ))}

//         {totalPages > 1 && (
//           <div className="pagination-controls">
//             <button
//               className={`pagination-button ${currentPage === 1 ? 'disabled' : ''}`}
//               onClick={() => handlePageChange(currentPage - 1)}
//               disabled={currentPage === 1}
//             >
//               <FaArrowLeft />
//             </button>
//             <span className="page-number">{currentPage}</span>
//             <button
//               className={`pagination-button ${currentPage === totalPages ? 'disabled' : ''}`}
//               onClick={() => handlePageChange(currentPage + 1)}
//               disabled={currentPage === totalPages}
//             >
//               <FaArrowRight />
//             </button>
//           </div>
//         )}
//       </div>

//       {showDeleteModal && (
//         <div className="modal">
//           <div className="modal-content">
//             <h3>Are you sure you want to delete this manager?</h3>
//             <div className="modal-actions">
//               <button onClick={confirmDelete}>Yes</button>
//               <button onClick={closeDeleteModal}>No</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AddManager;

import React, { useState, useEffect, useCallback } from "react";
import { app, auth, db } from "../../services/authservice";
import { setDoc, doc, getDocs, collection } from "firebase/firestore";
import { toast } from "react-toastify";
import {
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaArrowRight,
  FaKey,
} from "react-icons/fa"; // <<< CHANGED: Added FaKey
import { MdOutlineFileDownloadDone } from "react-icons/md";
import { FaUndo } from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/addmanager.css";
import Popup from "../common/Popup";
import { getFunctions, httpsCallable } from "firebase/functions";
import { usePopup } from "../../hooks/usePopup";
import { onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth"; // <<< CHANGED: Added sendPasswordResetEmail

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
  const [currentUser, setCurrentUser] = useState(null);
  const [isSendingReset, setIsSendingReset] = useState(false); // <<< ADDED: State for reset button

  const { popup } = usePopup();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [managerToDelete, setManagerToDelete] = useState(null);

  const [location, setLocation] = useState("");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const totalPages = Math.ceil(managers.length / itemsPerPage);

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

  useEffect(() => {
    if (currentUser) {
      fetchManagers();
    }
    fetchBranches();
  }, [currentUser, fetchBranches]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleBranchChange = (event) => {
    const selectedBranchName = event.target.value;
    setSelectedBranch(selectedBranchName);
    const selectedBranchData = branches.find(
      (branch) => branch.name === selectedBranchName
    );
    setLocation(selectedBranchData ? selectedBranchData.address || "" : "");
  };

  const fetchManagers = async () => {
    setManagersLoaded(false);
    const querySnapshot = await getDocs(collection(db, "users"));
    const managerList = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((user) => user.role === "manager");
    setManagers(managerList);
    setManagersLoaded(true);
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () =>
    setShowConfirmPassword(!showConfirmPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    console.log("Current user:", auth.currentUser);
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      console.log("ID Token:", token);
    }

    if (!editMode && password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    // Do not allow assigning to inventory branches
    if ((selectedBranch || "").toLowerCase().includes("inventory")) {
      setError("Cannot assign a manager to an inventory (warehouse) branch.");
      return;
    }

    // Enforce one manager per branch
    const existingManagerForBranch = managers.find(
      (m) => m.branch === selectedBranch
    );
    const conflict =
      existingManagerForBranch &&
      (!editMode || existingManagerForBranch.id !== currentManager?.id);
    if (conflict) {
      setError(
        `This branch already has a manager (${existingManagerForBranch.email})  Please select a different branch.`
      );
      return;
    }

    setLoading(true);
    try {
      if (editMode) {
        const docRef = doc(db, `users/${currentManager.id}`);
        await setDoc(
          docRef,
          {
            name,
            email,
            phone,
            branch: selectedBranch,
            location,
            role: "manager",
          },
          { merge: true }
        );
      } else {
        const functions = getFunctions(app);
        const createUserCallable = httpsCallable(functions, "createUser");
        await createUserCallable({
          email,
          password,
          name,
          phone,
          branch: selectedBranch,
          location,
          role: "manager",
        });
      }

      setLoading(false);
      handleReset();
      fetchManagers();
      toast.success(`Manager ${editMode ? "updated" : "created"} successfully`);
    } catch (error) {
      setError(error.message || "Failed to save manager");
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
    setName(manager.name);
    setEmail(manager.email);
    setPhone(manager.phone);
    setSelectedBranch(manager.branch);
    setLocation(manager.location);
  };

  // <<< ADDED: Function to handle sending password reset email >>>
  const handlePasswordReset = async () => {
    if (!currentManager || !currentManager.email) {
      toast.error("Manager details not found. Cannot send reset email.");
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, currentManager.email);
      toast.success(
        `Password reset email sent to ${currentManager.email}. Please check the spam folder if you can't find the email.`
      );
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to send password reset email.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleDelete = (manager) => {
    setManagerToDelete(manager);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    console.log("Current user at time of delete:", auth.currentUser);
    if (!currentUser) {
      toast.error("Authentication error. Please log in again.");
      return;
    }
    if (!managerToDelete) return;

    try {
      const functions = getFunctions(app);
      const deleteUserCallable = httpsCallable(functions, "deleteUser");
      const uidToDelete = managerToDelete.id || managerToDelete.uid;
      await deleteUserCallable({ uid: uidToDelete });

      fetchManagers();
      setShowDeleteModal(false);
      setManagerToDelete(null);
      toast.success("Manager deleted successfully");
    } catch (error) {
      console.error("Error calling deleteUser function:", error);
      toast.error(error.message || "Failed to delete user");
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setManagerToDelete(null);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentManagers = managers.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  // Derived: inventory branch flag for UI disable/warnings
  const isInventoryBranch = (selectedBranch || "")
    .toLowerCase()
    .includes("inventory");

  return (
    <div className="add-manager-page">
      <Popup {...popup} />

      <div className="form-container">
        <h2>{editMode ? "Edit Manager" : "Add Manager"}</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div>
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%" }}
              required
            />
          </div>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={editMode}
            />
          </div>

          {/* <<< ADDED: Conditional button for password reset in edit mode >>> */}
          {editMode && (
            <div className="reset-password-action">
              <button
                type="button"
                className="reset-password-button"
                onClick={handlePasswordReset}
                disabled={isSendingReset || !currentUser}
              >
                <FaKey />{" "}
                {isSendingReset
                  ? "Sending Email..."
                  : "Send Password Reset Email"}
              </button>
            </div>
          )}

          <div>
            <label>Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: "100%" }}
              required
            />
          </div>
          <div>
            <label>BranchName:</label>
            <select
              value={selectedBranch}
              onChange={handleBranchChange}
              className="input-style"
            >
              <option value="" disabled>
                Select...
              </option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
            {(() => {
              const existingManagerForBranch = managers.find(
                (m) => m.branch === selectedBranch
              );
              const conflict =
                existingManagerForBranch &&
                (!editMode ||
                  existingManagerForBranch.id !== currentManager?.id);
              return conflict ? (
                <div
                  style={{
                    marginTop: "8px",
                    background: "#fff3cd",
                    color: "#856404",
                    border: "1px solid #ffeeba",
                    borderRadius: "4px",
                    padding: "8px 10px",
                    fontSize: "13px",
                  }}
                >
                  This branch already has a manager:{" "}
                  <strong>{existingManagerForBranch.email}</strong>. Please
                  select a different branch.
                </div>
              ) : null;
            })()}
            {isInventoryBranch && (
              <div
                style={{
                  marginTop: "8px",
                  background: "#fdecea",
                  color: "#611a15",
                  border: "1px solid #f5c6cb",
                  borderRadius: "4px",
                  padding: "8px 10px",
                  fontSize: "13px",
                  whiteSpace: "normal",
                }}
              >
                This is an 𝗜𝗡𝗩𝗘𝗡𝗧𝗢𝗥𝗬 (warehouse) branch. Managers cannot be
                assigned to inventory branches.
              </div>
            )}
          </div>
          <div>
            <label>Location:</label>
            <input
              type="text"
              value={location}
              className="input-field"
              style={{ width: "100%" }}
              disabled
            />
          </div>
          {!editMode && (
            <>
              <div className="password-container">
                <label>Password</label>
                <div
                  className="password-input-wrapper"
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "300px",
                  }}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ width: "85%", paddingRight: "40px" }}
                  />
                  <span
                    onClick={togglePasswordVisibility}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      color: "#666",
                    }}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>
              <div className="password-container">
                <label>Confirm Password</label>
                <div
                  className="password-input-wrapper"
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "300px",
                  }}
                >
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ width: "85%", paddingRight: "40px" }}
                  />
                  <span
                    onClick={toggleConfirmPasswordVisibility}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      color: "#666",
                    }}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>
            </>
          )}
          <div className="button-group">
            {(() => {
              const existingManagerForBranch = managers.find(
                (m) => m.branch === selectedBranch
              );
              const conflict =
                existingManagerForBranch &&
                (!editMode ||
                  existingManagerForBranch.id !== currentManager?.id);
              const disableSubmit =
                loading ||
                !currentUser ||
                conflict ||
                !managersLoaded ||
                isInventoryBranch;
              return (
                <button disabled={disableSubmit} type="submit">
                  <MdOutlineFileDownloadDone />{" "}
                  {editMode ? "Save Manager" : "Add Manager"}
                </button>
              );
            })()}
            <button type="button" onClick={handleReset}>
              {editMode ? <FaTimes /> : <FaUndo />}{" "}
              {editMode ? "Cancel" : "Reset"}
            </button>
          </div>
        </form>
      </div>

      <div className="card-container">
        <h2>Stores</h2>
        {currentManagers.map((manager) => (
          <div className="manager-card" key={manager.id}>
            <h3>{manager.name}</h3>
            <p>{manager.email}</p>
            <p>{manager.branch}</p>
            <div className="card-actions">
              <FaEdit
                onClick={() => (currentUser ? handleEdit(manager) : null)}
                className={`edit-icon ${!currentUser ? "disabled" : ""}`}
              />
              <FaTrash
                onClick={() => (currentUser ? handleDelete(manager) : null)}
                className={`delete-icon ${!currentUser ? "disabled" : ""}`}
              />
            </div>
          </div>
        ))}

        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              className={`pagination-button ${
                currentPage === 1 ? "disabled" : ""
              }`}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <FaArrowLeft />
            </button>
            <span className="page-number">{currentPage}</span>
            <button
              className={`pagination-button ${
                currentPage === totalPages ? "disabled" : ""
              }`}
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
            <h3>Are you sure you want to delete this manager?</h3>
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

export default AddManager;
