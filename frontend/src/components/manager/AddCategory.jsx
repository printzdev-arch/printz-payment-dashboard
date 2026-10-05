import React, { useState } from "react";
import api from "../../services/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { X, FolderPlus, Tag, Hash, Loader2 } from "lucide-react";
import "../../styles/addcategory.css";

const AddCategoryPopup = ({ onClose }) => {
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!categoryId || !categoryName) {
      setError("Both category ID and category name are required");
      return;
    }

    setLoading(true);

    try {
      await api.post("/general/categories", {
        categoryId,
        categoryName,
        name: categoryName,
      });

      setLoading(false);
      handleReset();
      toast.success("Category added successfully");
    } catch (error) {
      console.error("API Write Error:", error);
      setError(error.response?.data?.message || error.message || "Failed to add category");
      setLoading(false);
    }
  };

  // Reset Form
  const handleReset = () => {
    setCategoryId("");
    setCategoryName("");
    setError("");
    if (onClose) onClose();
  };

  return (
    <div className="add-category-popup">
      <ToastContainer />
      <div className="popup">
        <div className="popup-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "16.5px", fontWeight: 700, color: "#0f172a" }}>
              <FolderPlus size={18} color="#059669" /> Add Category
            </h2>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {error && (
            <p className="error" style={{ color: "#dc2626", fontSize: "12.5px", margin: "0 0 12px 0", fontWeight: 600 }}>
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                <Hash size={14} color="#059669" /> Category ID
              </label>
              <input
                type="text"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                placeholder="e.g. CAT-001"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #e2e8f0",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                <Tag size={14} color="#059669" /> Category Name
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
                placeholder="e.g. Paper & Media"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #e2e8f0",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div className="popup-buttons" style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                disabled={loading}
                type="submit"
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#059669",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {loading ? <Loader2 size={15} className="daily-skeleton-icon-spin" /> : <FolderPlus size={15} />}
                {loading ? "Adding..." : "Add Category"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddCategoryPopup;
