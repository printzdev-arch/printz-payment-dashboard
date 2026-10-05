import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Printer,
  Building2,
  Filter,
  Check,
  X,
  Edit3,
  Trash2,
  Save,
  Layers,
  IndianRupee,
} from "lucide-react";
import "../../styles/printzTheme.css";
import "../../styles/addAssets.css";
import Popup from "../common/Popup.jsx";
import { usePopup } from "../../hooks/usePopup";
import BranchSelect from "../common/BranchSelect.jsx";

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
        const res = await api.get("/branches");
        const branchData = (res.data?.data || []).map((doc) => ({
          id: doc.id || doc._id,
          name: doc.name,
          address: doc.address || "",
        }));

        const sortedBranches = branchData.sort((a, b) => {
          const nameA = a.name.trim().toLowerCase();
          const nameB = b.name.trim().toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });

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
        if (!selectedBranch) return;
        const res = await api.get("/printers", {
          params: { printerType: "large", branchName: selectedBranch },
        });
        const largePrinters = res.data?.data || [];
        if (largePrinters.length > 0) {
          setPrinterId(largePrinters[0].printerId || "");
          setPrinterName(largePrinters[0].printerName || "");
        } else {
          setPrinterId("");
          setPrinterName("");
        }
      } catch (error) {
        console.error("Failed to fetch large printers: ", error);
      }
    };

    fetchBranches();
    fetchLargePrinters();
  }, [selectedBranch]);

  useEffect(() => {
    const fetchJumboXeroxData = async () => {
      try {
        const params = selectedBranch ? { branch: selectedBranch } : {};
        const res = await api.get("/jumbo-xerox/machines", { params });
        const data = (res.data?.data || []).map((doc) => ({
          ...doc,
          id: doc.id || doc._id,
        }));

        const groupedData = data.reduce((acc, item) => {
          const key = `${item.branch}-${item.size}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(item);
          return acc;
        }, {});

        const sortedData = Object.values(groupedData).flat();
        setJumboXeroxList(sortedData);
      } catch (error) {
        console.error("Error fetching Large Format Printing data:", error);
      }
    };

    fetchJumboXeroxData();
  }, [selectedBranch]);

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditFormData({
      branch: item.branch,
      size: item.size,
      type: item.type,
      unitPrice: item.unitPrice,
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
        setEditFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
      }
    } else if (name === "size" || name === "type") {
      setEditFormData((prev) => ({
        ...prev,
        [name]: value.toUpperCase().trim(),
      }));
    } else {
      setEditFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this Large Format Printing item?"
      )
    ) {
      try {
        setLoading(true);
        await api.delete(`/jumbo-xerox/machines/${id}`);
        setJumboXeroxList((prev) => prev.filter((item) => item.id !== id));
        toast.success("Large Format Printing deleted successfully");
        showSuccess("Large Format Printing item deleted successfully.");
      } catch (error) {
        console.error("Error deleting Large Format Printing:", error);
        toast.error("Failed to delete Large Format Printing: " + (error.response?.data?.message || error.message));
        showError("Failed to delete item: " + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
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
      };

      const res = await api.put(`/jumbo-xerox/machines/${id}`, jumboXeroxData);
      const updatedMachine = res.data?.data || jumboXeroxData;

      setJumboXeroxList((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updatedMachine, id: id } : item
        )
      );

      toast.success("Large Format Printing updated successfully");
      setEditingId(null);
      setEditFormData({});
    } catch (error) {
      console.error("Error updating Large Format Printing:", error);
      toast.error("Failed to update Large Format Printing: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = (event) => {
    setSelectedBranch(event.target.value);
  };

  return (
    <div className="add-assets-page-container">
      <ToastContainer />
      <Popup {...popup} />

      {/* Header Banner - Clean emerald design, no illustration */}
      <div
        className="printz-header-banner-full"
        style={{
          width: "100%",
          background:
            "linear-gradient(90deg, #E8FAF2 0%, #F0FFF9 50%, #E8FAF2 100%)",
          border: "1px solid #dcfce7",
          borderRadius: "16px",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
          flexWrap: "wrap",
        }}
      >
        <div className="printz-header-title-area" style={{ flexShrink: 0 }}>
          <h1
            style={{
              margin: "0 0 4px 0",
              fontSize: "26px",
              fontWeight: 700,
              color: "#111827",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Jumbo Xerox{" "}
            <span className="highlight" style={{ color: "#059669" }}>
              Pricing
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Manage Large Format Printing rates and configurations across branches.
          </p>
        </div>

        {printerId && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #a7f3d0",
                padding: "8px 16px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#065f46",
                boxShadow: "0 1px 3px rgba(5, 150, 105, 0.08)",
              }}
            >
              <Printer size={16} color="#059669" />
              <span>Printer: {printerName || printerId} ({printerId})</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Card */}
      <div className="add-assets-card">
        <div className="add-assets-card-header">
          <div className="add-assets-card-header-left">
            <div className="add-assets-card-icon">
              <Building2 size={18} color="#059669" />
            </div>
            <div>
              <h3 className="add-assets-card-title" style={{ fontSize: "18px", fontWeight: 700 }}>
                Filter by Branch
              </h3>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 22px" }}>
          <div className="add-assets-field" style={{ maxWidth: "340px" }}>
            <label className="add-assets-label">Branch Location</label>
            <BranchSelect
              value={selectedBranch}
              onChange={handleBranchChange}
              branches={branches}
              allowAll={true}
              allOptionLabel="All Branches"
              placeholder="All Branches"
            />
          </div>
        </div>
      </div>

      {/* Pricing Table Card */}
      <div className="add-assets-card">
        <div className="add-assets-card-header">
          <div className="add-assets-card-header-left">
            <div className="add-assets-card-icon">
              <Layers size={18} color="#059669" />
            </div>
            <div>
              <h3 className="add-assets-card-title" style={{ fontSize: "18px", fontWeight: 700 }}>
                Large Format Printing List ({jumboXeroxList.length})
              </h3>
            </div>
          </div>
        </div>

        <div>
          {jumboXeroxList.length === 0 ? (
            <div className="add-assets-empty-state">
              <Printer size={38} color="#cbd5e1" />
              <h4>No items found</h4>
              <p>
                No Large Format Printing items found
                {selectedBranch ? ` for ${selectedBranch}` : ""}.
              </p>
            </div>
          ) : (
            <div className="add-assets-table-wrap">
              <table className="add-assets-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Size</th>
                    <th>Type</th>
                    <th>Unit Price (₹)</th>
                    <th style={{ textAlign: "center", width: "160px" }}>Actions</th>
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
                      {items.map((item, index) => {
                        const isEditing = editingId === item.id;
                        return (
                          <tr key={item.id}>
                            {index === 0 && (
                              <>
                                <td rowSpan={items.length} style={{ verticalAlign: "top", fontWeight: 600 }}>
                                  {isEditing ? (
                                    <select
                                      name="branch"
                                      value={editFormData.branch || ""}
                                      onChange={handleEditInputChange}
                                      className="add-assets-table-input"
                                    >
                                      <option value="">Select Branch</option>
                                      {branches.map((b) => (
                                        <option key={b.id} value={b.name}>
                                          {b.name}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                      <Building2 size={13} color="#059669" />
                                      {item.branch}
                                    </span>
                                  )}
                                </td>
                                <td rowSpan={items.length} style={{ verticalAlign: "top" }}>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      name="size"
                                      value={editFormData.size || ""}
                                      onChange={handleEditInputChange}
                                      className="add-assets-table-input"
                                      placeholder="Size"
                                    />
                                  ) : (
                                    <span className="add-assets-id-badge">
                                      {item.size}
                                    </span>
                                  )}
                                </td>
                              </>
                            )}
                            <td>
                              {isEditing ? (
                                <input
                                  type="text"
                                  name="type"
                                  value={editFormData.type || ""}
                                  onChange={handleEditInputChange}
                                  className="add-assets-table-input"
                                  placeholder="Type"
                                />
                              ) : (
                                <span style={{ fontWeight: 500, color: "#334155" }}>
                                  {item.type}
                                </span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="text"
                                  name="unitPrice"
                                  value={editFormData.unitPrice || ""}
                                  onChange={handleEditInputChange}
                                  className="add-assets-table-input"
                                  placeholder="Price"
                                />
                              ) : (
                                <span style={{ fontWeight: 700, color: "#059669" }}>
                                  ₹{item.unitPrice}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px",
                                }}
                              >
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEdit(item.id)}
                                      disabled={loading}
                                      className="add-assets-action-btn-sm add-assets-action-btn-save"
                                    >
                                      <Check size={12} /> Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEdit}
                                      disabled={loading}
                                      className="add-assets-action-btn-sm add-assets-action-btn-cancel"
                                    >
                                      <X size={12} /> Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(item)}
                                      disabled={loading || editingId !== null}
                                      className="add-assets-action-btn-sm add-assets-action-btn-edit"
                                    >
                                      <Edit3 size={12} /> Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(item.id)}
                                      disabled={loading || editingId !== null}
                                      className="add-assets-action-btn-sm add-assets-action-btn-delete"
                                    >
                                      <Trash2 size={12} /> Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
