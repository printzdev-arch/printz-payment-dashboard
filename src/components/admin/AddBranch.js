import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import "../../styles/addBranch.css";
import { db } from "../../services/authservice";
import Popup from "../common/Popup";
import { usePopup } from "../../hooks/usePopup";

const AddBranch = () => {
  const { popup, showSuccess, showError, showInfo } = usePopup();
  const [branches, setBranches] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [editingBranch, setEditingBranch] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "branches"));
      const branchesData = [];
      querySnapshot.forEach((doc) => {
        branchesData.push({ id: doc.id, docId: doc.id, ...doc.data() });
      });

      const sortedBranches = branchesData.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
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

  const toggleSort = () => {
    const sortedBranches = [...branches].sort((a, b) => {
      if (sortOrder === "asc") {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    setBranches(sortedBranches);
  };

  const handleAddBranch = async () => {
    if (!branchName.trim() || !branchAddress.trim()) {
      showError(
        "Missing Information",
        "Please fill out all fields before submitting"
      );
      return;
    }

    try {
      setLoading(true);
      const currentDate = new Date().toISOString().split("T")[0];

      const docRef = await addDoc(collection(db, "branches"), {
        name: branchName.trim(),
        address: branchAddress.trim(),
        date: currentDate,
        createdAt: new Date().toISOString(),
      });

      const newBranch = {
        id: docRef.id,
        name: branchName.trim(),
        address: branchAddress.trim(),
        date: currentDate,
        createdAt: new Date().toISOString(),
      };

      setBranches([...branches, newBranch]);
      setBranchName("");
      setBranchAddress("");
      showSuccess(
        "Branch Added Successfully",
        `Branch "${branchName}" has been added with address: ${branchAddress}`
      );
    } catch (error) {
      console.error("Error adding branch: ", error);
      showError(
        "Add Branch Failed",
        `Failed to add branch: ${
          error.message || "Unknown error"
        }. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditBranch = (branch) => {
    console.log("Editing branch:", branch);
    setEditingBranch(branch);
    setBranchName(branch.name);
    setBranchAddress(branch.address);
  };

  const handleUpdateBranch = async () => {
    if (!branchName.trim() || !branchAddress.trim()) {
      showError(
        "Missing Information",
        "Please fill out all fields before updating"
      );
      return;
    }

    if (!editingBranch || !editingBranch.id) {
      showError(
        "No Branch Selected",
        "No branch selected for editing. Please select a branch first."
      );
      return;
    }

    try {
      setLoading(true);
      const branchRef = doc(
        db,
        "branches",
        editingBranch.docId || editingBranch.id
      );
      console.log("Updating branch:", editingBranch.id);

      const updatedData = {
        name: branchName.trim(),
        address: branchAddress.trim(),
        date: editingBranch.date,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(branchRef, updatedData);

      setBranches(
        branches.map((branch) =>
          branch.id === editingBranch.id
            ? { ...branch, ...updatedData }
            : branch
        )
      );

      setEditingBranch(null);
      setBranchName("");
      setBranchAddress("");
      showSuccess(
        "Branch Updated Successfully",
        `Branch has been updated with new details successfully`
      );
    } catch (error) {
      console.error("Error updating branch: ", error);
      showError(
        "Update Failed",
        `Failed to update branch: ${
          error.message || "Unknown error"
        }. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (id, branchName) => {
    if (!window.confirm(`Are you sure you want to delete "${branchName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteDoc(doc(db, "branches", id));
      setBranches(branches.filter((branch) => branch.id !== id));
      showSuccess(
        "Branch Deleted Successfully",
        `Branch "${branchName}" has been deleted successfully`
      );
    } catch (error) {
      console.error("Error deleting branch: ", error);
      showError(
        "Delete Failed",
        `Failed to delete branch: ${
          error.message || "Unknown error"
        }. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBranchName("");
    setBranchAddress("");
    setEditingBranch(null);
  };

  return (
    <div className="stock-readings-container">
      <Popup {...popup} />

      <div className="stock-page-header">
        <h2>Branch Management</h2>
        <p>Modify the branch details</p>
      </div>

      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Branch details</h3>
          </div>
        </div>
        <div className="stock-card-content">
          <div className="stock-date-picker-container">
            <div className="stock-date-picker-wrapper">
              <label>Branch Name</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="eg. Main Branch"
                disabled={loading}
              />
            </div>
            <div className="stock-date-picker-wrapper">
              <label>Branch Address</label>
              <input
                type="text"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                placeholder="eg. 123 Main St, City, Country"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            {editingBranch ? (
              <button
                className="update"
                onClick={handleUpdateBranch}
                disabled={loading}
              >
                {loading ? "UPDATING..." : "UPDATE BRANCH"}
              </button>
            ) : (
              <button
                className="add"
                onClick={handleAddBranch}
                disabled={loading}
              >
                {loading ? "ADDING..." : "ADD BRANCH"}
              </button>
            )}
            <button
              className="reset-button"
              onClick={handleReset}
              disabled={loading}
            >
              RESET
            </button>
          </div>
        </div>
      </div>

      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Branch List</h3>
          </div>
        </div>
        <div className="stock-card-content">
          <div className="stock-table-wrapper">
            <table className="stock-readings-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Branch Name</th>
                  <th>Address</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center" }}>
                      Loading...
                    </td>
                  </tr>
                ) : branches.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center" }}>
                      No branches available
                    </td>
                  </tr>
                ) : (
                  branches.map((movement, index) => (
                    <tr key={index}>
                      <td style={{ textAlign: "center" }}>{index + 1}</td>
                      <td>{movement.name}</td>
                      <td>{movement.address}</td>
                      <td>
                        <span className="qty-badge">
                          {movement.date || "No date"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="edit"
                          onClick={() => handleEditBranch(movement)}
                          disabled={loading}
                          style={{ padding: "5px" }}
                        >
                          Edit
                        </button>
                        <button
                          className="delete"
                          onClick={() =>
                            handleDeleteBranch(movement.id, movement.name)
                          }
                          disabled={loading}
                          style={{ padding: "5px" }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBranch;
