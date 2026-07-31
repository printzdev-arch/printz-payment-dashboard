import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../services/authservice";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/stocklist.css";
import Popup from "../common/Popup";
import { usePopup } from "../../hooks/usePopup";

const AddJumboXerox = () => {
  const [formData, setFormData] = useState({
    branch: "",
    size: "",
    type: "",
    unitPrice: "",
  });
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [jumboXeroxList, setJumboXeroxList] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [printerId, setPrinterId] = useState("");
  const [printerName, setPrinterName] = useState("");

  
  const { popup, showSuccess, showError, showInfo, hidePopup } = usePopup();

  useEffect(() => {
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

        console.log("Fetched branches: ", sortedBranches);
        setBranches(sortedBranches);

        if (sortedBranches.length > 0 && !selectedBranch) {
          setSelectedBranch(sortedBranches[0].name);
        }
      } catch (error) {
        console.error("Failed to fetch branch names: ", error);
      }
    };

    const fetchLargePrinters = async () => {
      try {
        console.log("selected Branch:", selectedBranch);
        const printersLarge = query(
          collection(db, "printers"),
          where("printerType", "==", "large"),
          where("branchName", "==", selectedBranch)
        );
        const querySnapshot = await getDocs(printersLarge);
        const largePrinters = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("Fetched large printers: ", largePrinters);
      } catch (error) {
        console.error("Failed to fetch large printers: ", error);
      }
    };
    fetchBranches();
    fetchLargePrinters();
  }, []);

  useEffect(() => {
    const fetchJumboXeroxData = async () => {
      try {
        const jumboXeroxRef = collection(db, "JumboXerox");
        let q;
        if (selectedBranch) {
          q = query(jumboXeroxRef, where("branch", "==", selectedBranch));
        } else {
          q = query(jumboXeroxRef);
        }
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setJumboXeroxList(data);
      } catch (error) {
        console.error("Error fetching Large Format Printing data:", error);
        toast.error("Failed to fetch Large Format Printing data");
      }
    };

    fetchJumboXeroxData();
  }, [selectedBranch]);

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this Large Format Printing item?"
      )
    ) {
      try {
        setLoading(true);
        await deleteDoc(doc(db, "JumboXerox", id));
        setJumboXeroxList((prev) => prev.filter((item) => item.id !== id));
        toast.success("Large Format Printing item deleted successfully");
      } catch (error) {
        console.error("Error deleting record:", error);
        toast.error("Failed to delete the record: " + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLargePrintersChange = async (e) => {
    const selectedBranchName = e.target.value;
    try {
      console.log("selected Branch:", selectedBranchName);
      const printersLarge = query(
        collection(db, "printers"),
        where("printerType", "==", "large"),
        where("branchName", "==", selectedBranchName)
      );
      const querySnapshot = await getDocs(printersLarge);
      const largePrinters = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPrinterId(largePrinters[0]?.printerId || "");
      setPrinterName(largePrinters[0]?.printerName || "");
      console.log("Fetched large printers: ", largePrinters);
    } catch (error) {
      console.error("Failed to fetch large printers: ", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditFormData({
      branch: item.branch,
      size: item.size,
      type: item.type,
      unitPrice: item.unitPrice.toString(),
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "unitPrice") {
      if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) {
        setEditFormData({
          ...editFormData,
          [name]: value,
        });
      }
    } else if (name === "size") {
      
      setEditFormData({
        ...editFormData,
        [name]: value.toUpperCase(),
      });
    } else if (name === "type") {
      
      setEditFormData({
        ...editFormData,
        [name]: value.toUpperCase().trim(),
      });
    } else {
      setEditFormData({
        ...editFormData,
        [name]: value,
      });
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      setLoading(true);

      if (
        !editFormData.branch ||
        !editFormData.size ||
        !editFormData.type ||
        !editFormData.unitPrice
      ) {
        toast.error("All fields are required");
        return;
      }

      if (isNaN(Number.parseFloat(editFormData.unitPrice))) {
        toast.error("Unit price must be a valid number");
        return;
      }

      const jumboXeroxData = {
        branch: editFormData.branch,
        size: editFormData.size,
        type: editFormData.type,
        unitPrice: Number.parseFloat(editFormData.unitPrice),
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, "JumboXerox", id), jumboXeroxData);

      setJumboXeroxList((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...jumboXeroxData, id: id } : item
        )
      );

      toast.success("Large Format Printing updated successfully");
      setEditingId(null);
      setEditFormData({});
    } catch (error) {
      console.error("Error updating Large Format Printing:", error);
      toast.error("Failed to update Large Format Printing: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "unitPrice") {
      if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) {
        setFormData({
          ...formData,
          [name]: value,
        });
      }
    } else if (name === "size") {
      
      setFormData({
        ...formData,
        [name]: value.toUpperCase(),
      });
    } else if (name === "type") {
      
      setFormData({
        ...formData,
        [name]: value.toUpperCase().trim(),
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleBranchChange = (event) => {
    const selectedBranchName = event.target.value;
    setSelectedBranch(selectedBranchName);
    console.log("Selected branch:", selectedBranchName);

    const selectedBranch = branches.find(
      (branch) => branch.name === selectedBranchName
    );
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.branch) newErrors.branch = "Branch is required";
    if (!formData.size) newErrors.size = "Size is required";
    if (!formData.type) newErrors.type = "Type is required";
    if (!formData.unitPrice) {
      newErrors.unitPrice = "Unit price is required";
    } else if (isNaN(Number.parseFloat(formData.unitPrice))) {
      newErrors.unitPrice = "Unit price must be a number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const jumboXeroxRef = collection(db, "JumboXerox");
      const q = query(
        jumboXeroxRef,
        where("branch", "==", formData.branch),
        where("size", "==", formData.size),
        where("type", "==", formData.type)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast.error(
          "A Large Format Printing with the same branch, size, and type already exists"
        );
        setLoading(false);
        return;
      }

      const jumboXeroxData = {
        branch: formData.branch,
        printerId: printerId,
        printerName: printerName,
        size: formData.size,
        type: formData.type,
        unitPrice: Number.parseFloat(formData.unitPrice),
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, "JumboXerox"), jumboXeroxData);

      setJumboXeroxList((prev) => [
        ...prev,
        { id: docRef.id, ...jumboXeroxData },
      ]);

      toast.success("Large Format Printing added successfully");

      showSuccess(
        `Large Format Printing service for ${formData.size} has been added successfully to ${formData.branch}. Unit price: ₹${formData.unitPrice}`,
        "Large Format Printing Added"
      );

      setFormData({
        branch: "",
        size: "",
        type: "",
        unitPrice: "",
      });
    } catch (error) {
      console.error("Error saving Large Format Printing  :", error);
      toast.error("Failed to save Large Format Printing : " + error.message);
      
      showError(
        `Failed to save Large Format Printing service. Error: ${error.message}. Please check your input and try again.`,
        "Save Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stock-readings-container">

      {}
      <Popup {...popup}
      />

      {}
      <div className="stock-page-header">
        <h2>Add Large Format Printing</h2>
        <p>Manage Large Format Printing pricing across branches</p>
      </div>

      <div
        className="stock-page-header"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "10px",
          backgroundColor: "#e0f0ff",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "16px" }}>
          <span style={{ color: "#1e3a8a", fontWeight: "700" }}>
            PRINTER ID -{" "}
          </span>
          <span style={{ color: "#000", fontWeight: "700" }}>{printerId}</span>
          <span
            style={{ color: "#1e3a8a", fontWeight: "700", marginLeft: "15px" }}
          >
            PRINTER NAME -{" "}
          </span>
          <span style={{ color: "#000", fontWeight: "700" }}>
            {printerName || "N/A"}
          </span>
        </h3>
      </div>

      {}
      {}

      {}
      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Filter Large Format Printing List</h3>
          </div>
        </div>
        <div className="stock-card-content">
          <div className="stock-date-picker-wrapper">
            <label htmlFor="branchFilter">Filter by Branch</label>
            <select
              id="branchFilter"
              value={selectedBranch}
              onChange={handleBranchChange}
              className="stock-select-input"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {}
      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Large Format Printing List</h3>
          </div>
        </div>
        <div className="stock-card-content">
          {jumboXeroxList.length === 0 ? (
            <div className="stock-no-data-message">
              <p>
                No Large Format Printing items found
                {selectedBranch ? ` for ${selectedBranch}` : ""}.
              </p>
            </div>
          ) : (
            <div className="stock-table-wrapper">
              <table className="stock-readings-table" style={{ tableLayout: "fixed", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "150px" }}>Branch</th>
                    <th style={{ width: "100px" }}>Size</th>
                    <th style={{ width: "120px" }}>Type</th>
                    <th style={{ width: "100px" }}>Unit Price</th>
                    <th style={{ width: "120px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(
                    jumboXeroxList.reduce((acc, item) => {
                      const key = `${item.branch}-${item.size}`;
                      acc[key] = acc[key] || [];
                      acc[key].push(item);
                      return acc;
                    }, {})
                  ).map(([key, items]) => (
                    <React.Fragment key={key}>
                      {items.map((item, index) => (
                        <tr key={item.id} style={{ borderBottom: "1px solid #e9ecef" }}>
                          {index === 0 && (
                            <>
                              <td rowSpan={items.length} style={{ verticalAlign: "top", padding: "12px 8px" }}>
                                {editingId === item.id ? (
                                  <select
                                    name="branch"
                                    value={editFormData.branch || ""}
                                    onChange={handleEditInputChange}
                                    className="stock-select-input"
                                    style={{ 
                                      width: "100%",
                                      maxWidth: "130px",
                                      height: "32px",
                                      padding: "4px 8px",
                                      border: "1px solid #ddd",
                                      borderRadius: "4px",
                                      fontSize: "13px"
                                    }}
                                  >
                                    <option value="">Select Branch</option>
                                    {branches.map((branch) => (
                                      <option
                                        key={branch.id}
                                        value={branch.name}
                                      >
                                        {branch.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span style={{ fontSize: "13px", fontWeight: "500" }}>
                                    {item.branch}
                                  </span>
                                )}
                              </td>
                              <td rowSpan={items.length} style={{ verticalAlign: "top", padding: "12px 8px" }}>
                                {editingId === item.id ? (
                                  <input
                                    type="text"
                                    name="size"
                                    value={editFormData.size || ""}
                                    onChange={handleEditInputChange}
                                    className="stock-select-input"
                                    style={{
                                      width: "100%",
                                      maxWidth: "80px",
                                      height: "32px",
                                      padding: "4px 8px",
                                      border: "1px solid #ddd",
                                      borderRadius: "4px",
                                      fontSize: "13px",
                                      textTransform: "uppercase",
                                    }}
                                    placeholder="Size"
                                  />
                                ) : (
                                  <span style={{ fontSize: "13px", fontWeight: "500" }}>
                                    {item.size}
                                  </span>
                                )}
                              </td>
                            </>
                          )}
                          <td style={{ verticalAlign: "top", padding: "12px 8px" }}>
                            {editingId === item.id ? (
                              <input
                                type="text"
                                name="type"
                                value={editFormData.type || ""}
                                onChange={handleEditInputChange}
                                className="stock-select-input"
                                style={{
                                  width: "100%",
                                  maxWidth: "100px",
                                  height: "32px",
                                  padding: "4px 8px",
                                  border: "1px solid #ddd",
                                  borderRadius: "4px",
                                  fontSize: "13px",
                                  textTransform: "uppercase",
                                }}
                                placeholder="Type"
                              />
                            ) : (
                              <span style={{ fontSize: "13px" }}>
                                {item.type}
                              </span>
                            )}
                          </td>
                          <td style={{ verticalAlign: "top", padding: "12px 8px" }}>
                            {editingId === item.id ? (
                              <input
                                type="text"
                                name="unitPrice"
                                value={editFormData.unitPrice || ""}
                                onChange={handleEditInputChange}
                                className="stock-select-input"
                                style={{ 
                                  width: "100%",
                                  maxWidth: "80px",
                                  height: "32px",
                                  padding: "4px 8px",
                                  border: "1px solid #ddd",
                                  borderRadius: "4px",
                                  fontSize: "13px",
                                  textAlign: "right"
                                }}
                                placeholder="Price"
                              />
                            ) : (
                              <span style={{ fontSize: "13px", fontWeight: "600", color: "#28a745" }}>
                                ₹{item.unitPrice}
                              </span>
                            )}
                          </td>
                          <td style={{ verticalAlign: "top", padding: "12px 8px", textAlign: "center" }}>
                            <div style={{ 
                              display: "flex", 
                              flexDirection: "column", 
                              gap: "4px", 
                              alignItems: "center" 
                            }}>
                              {editingId === item.id ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(item.id)}
                                    className="stock-save-button"
                                    disabled={loading}
                                    type="button"
                                    style={{
                                      width: "80px",
                                      height: "28px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "4px",
                                      fontSize: "11px",
                                      borderRadius: "4px",
                                      backgroundColor: "#28a745",
                                      color: "white",
                                      border: "none",
                                      cursor: "pointer"
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="stock-cancel-button"
                                    disabled={loading}
                                    type="button"
                                    style={{
                                      width: "80px",
                                      height: "28px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "4px",
                                      fontSize: "11px",
                                      borderRadius: "4px",
                                      backgroundColor: "#dc3545",
                                      color: "white",
                                      border: "none",
                                      cursor: "pointer"
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(item)}
                                    className="stock-save-button"
                                    disabled={loading || editingId !== null}
                                    type="button"
                                    style={{
                                      width: "80px",
                                      height: "28px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "4px",
                                      fontSize: "11px",
                                      borderRadius: "4px",
                                      backgroundColor: "#28a745",
                                      color: "white",
                                      border: "none",
                                      cursor: "pointer",
                                      opacity: (loading || editingId !== null) ? 0.6 : 1
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    className="stock-cancel-button"
                                    disabled={loading || editingId !== null}
                                    type="button"
                                    style={{
                                      width: "80px",
                                      height: "28px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "4px",
                                      fontSize: "11px",
                                      borderRadius: "4px",
                                      backgroundColor: "#dc3545",
                                      color: "white",
                                      border: "none",
                                      cursor: "pointer",
                                      opacity: (loading || editingId !== null) ? 0.6 : 1
                                    }}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddJumboXerox;
