import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  FileText,
  Scale,
  Maximize2,
  Palette,
  Repeat,
  Shield,
  Sparkles,
  CheckSquare,
  Scissors,
  CreditCard,
  Truck,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Search,
  Check,
  X,
  Sliders,
  AlertCircle,
  HelpCircle,
  Star,
  CheckCircle2,
  Filter,
  CheckCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import masterSettingsApi from "../api/masterSettingsApi";
import { DEFAULT_MASTER_CATEGORIES } from "../constants/defaultMasterSpecs";
import { toast } from "react-toastify";

const CATEGORY_ICONS = {
  productTypes: Layers,
  paperTypes: FileText,
  paperGsmList: Scale,
  sizes: Maximize2,
  colors: Palette,
  printingSides: Repeat,
  laminationTypes: Shield,
  finishingEffects: Sparkles,
  proofRequirements: CheckSquare,
  finishingServicesList: Scissors,
  paymentMethods: CreditCard,
  deliveryMethods: Truck,
};

const CATEGORY_GROUPS = [
  {
    key: "print_substrate",
    title: "Print & Substrates",
    color: "#2563eb",
    categories: ["productTypes", "paperTypes", "paperGsmList", "sizes"],
  },
  {
    key: "colors_sides",
    title: "Inks & Sides",
    color: "#7c3aed",
    categories: ["colors", "printingSides"],
  },
  {
    key: "finishing_effects",
    title: "Finishing & Post-Press",
    color: "#059669",
    categories: ["laminationTypes", "finishingEffects", "finishingServicesList"],
  },
  {
    key: "order_workflow",
    title: "Orders & Logistics",
    color: "#d97706",
    categories: ["proofRequirements", "deliveryMethods", "paymentMethods"],
  },
];

export const MasterSettingsPage = () => {
  const [categories, setCategories] = useState(DEFAULT_MASTER_CATEGORIES);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("productTypes");
  const [categorySearch, setCategorySearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalForm, setModalForm] = useState({
    name: "",
    code: "",
    config: "",
    defaultPrice: 0,
    unit: "pcs",
    isDefault: false,
    isActive: true,
  });

  // Load latest settings from MongoDB
  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await masterSettingsApi.getAllSettings();
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list) && list.length > 0) {
        setCategories(list);
        try {
          localStorage.setItem("printz_master_settings_cache", JSON.stringify(list));
        } catch {}
      }
    } catch (err) {
      console.warn("Could not fetch remote master settings; using local seeds:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const activeCategory = useMemo(() => {
    return categories.find((c) => c.category === selectedCategoryKey) || categories[0] || {};
  }, [categories, selectedCategoryKey]);

  // Filtered items in active category
  const filteredItems = useMemo(() => {
    let items = activeCategory.items || [];

    // Status filter
    if (statusFilter === "active") {
      items = items.filter((it) => it.isActive !== false);
    } else if (statusFilter === "inactive") {
      items = items.filter((it) => it.isActive === false);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (it) =>
          (it.name || "").toLowerCase().includes(q) ||
          (it.code || "").toLowerCase().includes(q) ||
          (it.config || "").toLowerCase().includes(q)
      );
    }

    return items;
  }, [activeCategory, searchQuery, statusFilter]);

  // Reset to page 1 on search / filter / category change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategoryKey, searchQuery, statusFilter]);

  // Pagination calculations
  const totalEntries = filteredItems.length;
  const parsedRowsPerPage = Math.max(1, parseInt(rowsPerPage, 10) || 8);
  const totalPages = Math.max(1, Math.ceil(totalEntries / parsedRowsPerPage));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalEntries === 0 ? 0 : (validPage - 1) * parsedRowsPerPage + 1;
  const endIndex = Math.min(validPage * parsedRowsPerPage, totalEntries);

  const paginatedItems = useMemo(() => {
    const start = (validPage - 1) * parsedRowsPerPage;
    return filteredItems.slice(start, start + parsedRowsPerPage);
  }, [filteredItems, validPage, parsedRowsPerPage]);

  // Compute stats for active category
  const activeStats = useMemo(() => {
    const items = activeCategory.items || [];
    const total = items.length;
    const active = items.filter((it) => it.isActive !== false).length;
    const inactive = total - active;
    const defaultItem = items.find((it) => it.isDefault);
    return { total, active, inactive, defaultItem };
  }, [activeCategory]);

  // Total count across all categories
  const grandTotalOptions = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.items?.length || 0), 0);
  }, [categories]);

  // Auto-generate code from name
  const handleNameChange = (val) => {
    setModalForm((prev) => {
      const shouldAutoCode =
        !editingItem ||
        !prev.code ||
        prev.code === prev.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
      const generatedCode = val
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 32);

      return {
        ...prev,
        name: val,
        code: shouldAutoCode ? generatedCode : prev.code,
      };
    });
  };

  // Open modal for Create
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setModalForm({
      name: "",
      code: "",
      config: "",
      defaultPrice: 0,
      unit: "pcs",
      isDefault: false,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setModalForm({
      name: item.name || "",
      code: item.code || "",
      config: item.config || "",
      defaultPrice: item.defaultPrice || 0,
      unit: item.unit || "pcs",
      isDefault: Boolean(item.isDefault),
      isActive: item.isActive !== false,
    });
    setIsModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!modalForm.name.trim()) {
      toast.warning("Option name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: modalForm.name.trim(),
        code: modalForm.code.trim(),
        description: "",
        config: modalForm.config.trim(),
        defaultPrice: Number(modalForm.defaultPrice) || 0,
        unit: modalForm.unit.trim() || "pcs",
        isDefault: modalForm.isDefault,
        isActive: modalForm.isActive,
      };

      if (editingItem) {
        const itemId = editingItem._id || editingItem.id;
        await masterSettingsApi.updateItem(selectedCategoryKey, itemId, payload);
        toast.success(`Option '${payload.name}' updated`);
      } else {
        await masterSettingsApi.addItem(selectedCategoryKey, payload);
        toast.success(`Option '${payload.name}' added`);
      }

      setIsModalOpen(false);
      await loadSettings();
    } catch (err) {
      console.error("Save master setting error:", err);
      toast.error(err.response?.data?.message || "Failed to save option");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active / Inactive
  const handleToggleActive = async (item) => {
    const itemId = item._id || item.id;
    const newActive = !item.isActive;

    // Optimistic UI update
    setCategories((prev) =>
      prev.map((c) => {
        if (c.category !== selectedCategoryKey) return c;
        return {
          ...c,
          items: (c.items || []).map((it) =>
            (it._id || it.id) === itemId ? { ...it, isActive: newActive } : it
          ),
        };
      })
    );

    try {
      await masterSettingsApi.updateItem(selectedCategoryKey, itemId, { isActive: newActive });
      toast.info(`Option '${item.name}' is now ${newActive ? "Active" : "Inactive"}`);
    } catch (err) {
      console.error("Toggle active error:", err);
      toast.error("Failed to update status");
      loadSettings();
    }
  };

  // Set as Default
  const handleSetDefault = async (item) => {
    const itemId = item._id || item.id;
    if (item.isDefault) return;

    // Optimistic UI update
    setCategories((prev) =>
      prev.map((c) => {
        if (c.category !== selectedCategoryKey) return c;
        return {
          ...c,
          items: (c.items || []).map((it) => ({
            ...it,
            isDefault: (it._id || it.id) === itemId,
          })),
        };
      })
    );

    try {
      await masterSettingsApi.updateItem(selectedCategoryKey, itemId, { isDefault: true });
      toast.success(`'${item.name}' set as default for ${activeCategory.displayName}`);
    } catch (err) {
      console.error("Set default error:", err);
      toast.error("Failed to set default");
      loadSettings();
    }
  };

  // Delete Item
  const handleDeleteItem = async (item) => {
    const itemId = item._id || item.id;
    if (!window.confirm(`Are you sure you want to delete '${item.name}' from ${activeCategory.displayName}?`)) {
      return;
    }

    try {
      await masterSettingsApi.deleteItem(selectedCategoryKey, itemId);
      toast.success(`Option '${item.name}' deleted`);
      await loadSettings();
    } catch (err) {
      console.error("Delete setting item error:", err);
      toast.error(err.response?.data?.message || "Failed to delete item");
    }
  };

  // Reset Category
  const handleResetCategory = async () => {
    if (
      !window.confirm(
        `Reset '${activeCategory.displayName}' to standard default options? Any custom additions to this category will be replaced.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await masterSettingsApi.resetCategory(selectedCategoryKey);
      toast.success(`Category '${activeCategory.displayName}' reset to defaults`);
      await loadSettings();
    } catch (err) {
      console.error("Reset category error:", err);
      toast.error("Failed to reset category");
    } finally {
      setLoading(false);
    }
  };

  // Reset All
  const handleResetAll = async () => {
    if (
      !window.confirm(
        "WARNING: This will reset ALL 12 specification categories across the entire project to default values. Are you sure?"
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await masterSettingsApi.resetAll();
      toast.success("All master specifications reset to defaults");
      await loadSettings();
    } catch (err) {
      console.error("Reset all settings error:", err);
      toast.error("Failed to reset settings");
    } finally {
      setLoading(false);
    }
  };

  const ActiveIcon = CATEGORY_ICONS[selectedCategoryKey] || Sliders;

  return (
    <JobFlowLayout
      title="Master Defaults & Specifications"
      subtitle="Manage global dropdown options, paper substrates, sizes, finishes, and order defaults"
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            onClick={loadSettings}
            disabled={loading}
            title="Reload from MongoDB"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <RefreshCw size={13} className={loading ? "spin-icon" : ""} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            className="jf-btn jf-btn-primary jf-btn-sm"
            onClick={handleOpenAddModal}
            style={{
              background: "#059669",
              color: "#ffffff",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <Plus size={14} />
            <span>Add Option</span>
          </button>
        </div>
      }
    >
      {/* 2-Column Responsive Workspace */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "310px 1fr",
          gap: "1.25rem",
          alignItems: "start",
          marginTop: "0.5rem",
        }}
      >
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Categories Navigation Panel                                  */}
        {/* ========================================================================= */}
        <div
          className="jf-card"
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            padding: "1rem",
            position: "sticky",
            top: "1rem",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Specifications Explorer
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  background: "#f1f5f9",
                  color: "#475569",
                  padding: "2px 7px",
                  borderRadius: "10px",
                  fontWeight: 600,
                }}
              >
                {grandTotalOptions} options
              </span>
            </div>
          </div>

          {/* Category Filter Input */}
          <div style={{ position: "relative", marginBottom: "0.85rem" }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: "9px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#475569",
              }}
            />
            <input
              type="text"
              placeholder="Filter categories..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              style={{
                width: "100%",
                height: "32px",
                fontSize: "0.8rem",
                paddingLeft: "28px",
                paddingRight: "24px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {categorySearch && (
              <button
                type="button"
                onClick={() => setCategorySearch("")}
                style={{
                  position: "absolute",
                  right: "6px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#475569",
                  padding: "2px",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Grouped Category Nav List */}
          <div
            style={{
              maxHeight: "calc(100vh - 280px)",
              overflowY: "auto",
              paddingRight: "2px",
            }}
          >
            {CATEGORY_GROUPS.map((grp) => {
              const groupCats = categories.filter((cat) => {
                const inGroup = grp.categories.includes(cat.category);
                if (!inGroup) return false;
                if (!categorySearch.trim()) return true;
                const q = categorySearch.toLowerCase().trim();
                return (
                  cat.displayName.toLowerCase().includes(q) ||
                  cat.category.toLowerCase().includes(q)
                );
              });

              if (groupCats.length === 0) return null;

              return (
                <div key={grp.key} style={{ marginBottom: "1rem" }}>
                  {/* Group Label */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 8px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: grp.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: grp.color }} />
                    {grp.title}
                  </div>

                  {/* Category Items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
                    {groupCats.map((cat) => {
                      const Icon = CATEGORY_ICONS[cat.category] || Sliders;
                      const isSelected = cat.category === selectedCategoryKey;
                      const count = (cat.items || []).length;

                      return (
                        <button
                          key={cat.category}
                          type="button"
                          onClick={() => {
                            setSelectedCategoryKey(cat.category);
                            setSearchQuery("");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: isSelected ? "1px solid #10b981" : "1px solid transparent",
                            background: isSelected ? "rgba(16, 185, 129, 0.08)" : "transparent",
                            color: isSelected ? "#065f46" : "#334155",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.12s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
                            <div
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "6px",
                                background: isSelected ? "#10b981" : "#f1f5f9",
                                color: isSelected ? "#ffffff" : "#64748b",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Icon size={14} />
                            </div>
                            <span
                              style={{
                                fontSize: "0.8125rem",
                                fontWeight: isSelected ? 600 : 500,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {cat.displayName}
                            </span>
                          </div>

                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: "10px",
                              background: isSelected ? "#10b981" : "#f1f5f9",
                              color: isSelected ? "#ffffff" : "#64748b",
                              flexShrink: 0,
                            }}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reset All Footer Button */}
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={handleResetAll}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                width: "100%",
                padding: "6px",
                fontSize: "0.75rem",
                color: "#475569",
                background: "transparent",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#dc2626";
                e.currentTarget.style.background = "#fee2e2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <RotateCcw size={12} />
              <span>Reset All to System Defaults</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Active Category Workspace                                   */}
        {/* ========================================================================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Header Card (Clean - No Description) */}
          <div
            className="jf-card"
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              {/* Category Info */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#059669",
                  }}
                >
                  <ActiveIcon size={22} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                      {activeCategory.displayName}
                    </h2>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        background: "#ecfdf5",
                        color: "#059669",
                        border: "1px solid #a7f3d0",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontWeight: 600,
                      }}
                    >
                      Collection: masterDefaults
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={handleResetCategory}
                  title="Reset this category to default list"
                >
                  <RotateCcw size={13} />
                  <span>Reset Category</span>
                </button>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary jf-btn-sm"
                  onClick={handleOpenAddModal}
                  style={{ background: "#059669", color: "#ffffff", fontWeight: 600 }}
                >
                  <Plus size={14} />
                  <span>Add Option</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "0.75rem",
                marginTop: "1.15rem",
                paddingTop: "1rem",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: "0.7rem", color: "#475569", fontWeight: 600 }}>TOTAL OPTIONS</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{activeStats.total}</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: "0.7rem", color: "#059669", fontWeight: 600 }}>ACTIVE / LIVE</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#059669" }}>{activeStats.active}</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: "0.7rem", color: "#475569", fontWeight: 600 }}>INACTIVE</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#475569" }}>{activeStats.inactive}</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: "0.7rem", color: "#d97706", fontWeight: 600 }}>DEFAULT OPTION</div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {activeStats.defaultItem ? `⭐ ${activeStats.defaultItem.name}` : "None"}
                </div>
              </div>
            </div>
          </div>

          {/* Options Table Card */}
          <div
            className="jf-card"
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              padding: "1.25rem",
            }}
          >
            {/* Filter Bar: Search + Status Filter */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              {/* Search in active category */}
              <div style={{ position: "relative", flex: 1, minWidth: "220px", maxWidth: "360px" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#475569",
                  }}
                />
                <input
                  type="text"
                  className="jf-input"
                  placeholder={`Search ${activeCategory.displayName}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: "32px", fontSize: "0.8125rem", height: "36px" }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#475569",
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#f8fafc", padding: "3px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.75rem",
                    fontWeight: statusFilter === "all" ? 600 : 500,
                    borderRadius: "6px",
                    border: "none",
                    background: statusFilter === "all" ? "#ffffff" : "transparent",
                    color: statusFilter === "all" ? "#0f172a" : "#64748b",
                    boxShadow: statusFilter === "all" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    cursor: "pointer",
                  }}
                >
                  All ({activeStats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.75rem",
                    fontWeight: statusFilter === "active" ? 600 : 500,
                    borderRadius: "6px",
                    border: "none",
                    background: statusFilter === "active" ? "#ffffff" : "transparent",
                    color: statusFilter === "active" ? "#059669" : "#64748b",
                    boxShadow: statusFilter === "active" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    cursor: "pointer",
                  }}
                >
                  Active ({activeStats.active})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("inactive")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.75rem",
                    fontWeight: statusFilter === "inactive" ? 600 : 500,
                    borderRadius: "6px",
                    border: "none",
                    background: statusFilter === "inactive" ? "#ffffff" : "transparent",
                    color: statusFilter === "inactive" ? "#64748b" : "#94a3b8",
                    boxShadow: statusFilter === "inactive" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    cursor: "pointer",
                  }}
                >
                  Inactive ({activeStats.inactive})
                </button>
              </div>
            </div>

            {/* Options Table (No Description Column) */}
            <div className="jf-table-container" style={{ overflowX: "auto" }}>
              <table className="jf-table" style={{ width: "100%", fontSize: "0.8125rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ width: "45px", textAlign: "center" }}>#</th>
                    <th style={{ textAlign: "left" }}>Option Name</th>
                    <th style={{ textAlign: "left", width: "180px" }}>Code / Identifier</th>
                    <th style={{ textAlign: "left" }}>Config / Specifications</th>
                    <th style={{ textAlign: "center", width: "110px" }}>Status</th>
                    <th style={{ textAlign: "center", width: "130px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#475569" }}>
                        <AlertCircle size={28} style={{ margin: "0 auto 0.5rem auto", opacity: 0.5 }} />
                        <div style={{ fontWeight: 600, color: "#475569" }}>No options found</div>
                        <div style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                          {searchQuery
                            ? `No results matching "${searchQuery}"`
                            : "Click 'Add Option' above to create one in this category."}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, idx) => {
                      const isDefault = Boolean(item.isDefault);
                      const isActive = item.isActive !== false;
                      const itemIndex = (validPage - 1) * parsedRowsPerPage + idx + 1;

                      return (
                        <tr
                          key={item._id || item.id || idx}
                          style={{
                            background: isDefault ? "rgba(254, 243, 199, 0.15)" : "#ffffff",
                            opacity: isActive ? 1 : 0.6,
                            transition: "background 0.1s ease",
                          }}
                        >
                          {/* Order / Index */}
                          <td style={{ textAlign: "center", color: "#475569", fontWeight: 600 }}>
                            {itemIndex}
                          </td>

                          {/* Name + Default Badge */}
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontWeight: 600, color: isActive ? "#0f172a" : "#64748b" }}>
                                {item.name}
                              </span>
                              {isDefault && (
                                <span
                                  title="Default selected option for new forms"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    background: "#fef3c7",
                                    color: "#b45309",
                                    border: "1px solid #fde68a",
                                    padding: "1px 6px",
                                    borderRadius: "10px",
                                  }}
                                >
                                  <Star size={10} fill="#b45309" />
                                  DEFAULT
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Code */}
                          <td>
                            <code
                              style={{
                                fontSize: "0.75rem",
                                background: "#f1f5f9",
                                color: "#475569",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                            >
                              {item.code || "—"}
                            </code>
                          </td>

                          {/* Config / Specifications (Clean - No Description) */}
                          <td>
                            {item.config || item.defaultPrice > 0 ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {item.config && (
                                  <span style={{ fontSize: "0.75rem", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px", fontWeight: 500 }}>
                                    {item.config}
                                  </span>
                                )}
                                {item.defaultPrice > 0 && (
                                  <span style={{ fontSize: "0.75rem", background: "#ecfdf5", color: "#065f46", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
                                    ₹{Number(item.defaultPrice).toFixed(2)} / {item.unit || "pcs"}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "#475569", fontSize: "0.8rem" }}>—</span>
                            )}
                          </td>

                          {/* Live Active Toggle */}
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item)}
                              title={isActive ? "Click to Disable" : "Click to Enable"}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "3px 8px",
                                borderRadius: "12px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                border: "none",
                                cursor: "pointer",
                                background: isActive ? "#dcfce7" : "#f1f5f9",
                                color: isActive ? "#15803d" : "#64748b",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: isActive ? "#16a34a" : "#94a3b8",
                                }}
                              />
                              {isActive ? "Active" : "Inactive"}
                            </button>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              {/* Set as Default button */}
                              {!isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefault(item)}
                                  title="Set as Default Option"
                                  style={{
                                    background: "#fef3c7",
                                    border: "1px solid #fde68a",
                                    color: "#b45309",
                                    borderRadius: "4px",
                                    padding: "4px",
                                    cursor: "pointer",
                                    display: "flex",
                                  }}
                                >
                                  <Star size={13} />
                                </button>
                              )}

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                title="Edit Option"
                                style={{
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  color: "#334155",
                                  borderRadius: "4px",
                                  padding: "4px",
                                  cursor: "pointer",
                                  display: "flex",
                                }}
                              >
                                <Edit2 size={13} />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item)}
                                title="Delete Option"
                                style={{
                                  background: "#fee2e2",
                                  border: "1px solid #fca5a5",
                                  color: "#b91c1c",
                                  borderRadius: "4px",
                                  padding: "4px",
                                  cursor: "pointer",
                                  display: "flex",
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ──────────────── Pagination Controls Footer ──────────────── */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
                padding: "0.85rem 0.25rem 0.25rem 0.25rem",
                marginTop: "0.85rem",
                borderTop: "1px solid #f1f5f9",
                fontSize: "0.8125rem",
                color: "#475569",
              }}
            >
              {/* Left: Input field for rows per page & entries count */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontWeight: 500, color: "#475569" }}>Rows per page:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={rowsPerPage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRowsPerPage(val);
                      if (val && !isNaN(val) && parseInt(val, 10) > 0) {
                        setCurrentPage(1);
                      }
                    }}
                    onBlur={() => {
                      const num = parseInt(rowsPerPage, 10);
                      if (!num || num < 1) {
                        setRowsPerPage(8);
                      }
                    }}
                    style={{
                      width: "60px",
                      height: "32px",
                      textAlign: "center",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "#0f172a",
                      outline: "none",
                      background: "#f8fafc",
                    }}
                  />
                </div>

                <div style={{ color: "#475569" }}>
                  Showing <strong>{startIndex}</strong> to <strong>{endIndex}</strong> of{" "}
                  <strong>{totalEntries}</strong> entries
                </div>
              </div>

              {/* Right: Prev Page Next Navigation */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.78rem", color: "#475569", marginRight: "4px" }}>
                  Page <strong>{validPage}</strong> of <strong>{totalPages}</strong>
                </span>

                {/* Prev Button */}
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  disabled={validPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    height: "32px",
                    padding: "0 10px",
                    fontSize: "0.78rem",
                    borderRadius: "6px",
                    cursor: validPage <= 1 ? "not-allowed" : "pointer",
                    opacity: validPage <= 1 ? 0.45 : 1,
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                {/* Page number buttons */}
                <div style={{ display: "flex", gap: "3px" }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((num) => {
                      if (totalPages <= 5) return true;
                      return Math.abs(num - validPage) <= 1 || num === 1 || num === totalPages;
                    })
                    .map((num, i, arr) => {
                      const prevNum = arr[i - 1];
                      const showEllipsis = prevNum && num - prevNum > 1;
                      const isCurrent = num === validPage;

                      return (
                        <React.Fragment key={num}>
                          {showEllipsis && (
                            <span style={{ padding: "0 4px", alignSelf: "center", color: "#475569" }}>
                              ...
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(num)}
                            style={{
                              minWidth: "30px",
                              height: "32px",
                              padding: "0 6px",
                              borderRadius: "6px",
                              border: isCurrent ? "1px solid #059669" : "1px solid #e2e8f0",
                              background: isCurrent ? "#059669" : "#ffffff",
                              color: isCurrent ? "#ffffff" : "#334155",
                              fontWeight: isCurrent ? 700 : 500,
                              fontSize: "0.78rem",
                              cursor: "pointer",
                            }}
                          >
                            {num}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  disabled={validPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    height: "32px",
                    padding: "0 10px",
                    fontSize: "0.78rem",
                    borderRadius: "6px",
                    cursor: validPage >= totalPages ? "not-allowed" : "pointer",
                    opacity: validPage >= totalPages ? 0.45 : 1,
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT MODAL                                                          */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => !saving && setIsModalOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.04)",
              width: "100%",
              maxWidth: "460px",
              padding: "1.5rem",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "0.85rem",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                  {editingItem ? "Edit Option" : "Add Option"}
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#475569" }}>
                  Category: <strong>{activeCategory.displayName}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#475569",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {/* Option Name */}
                <div className="jf-form-group">
                  <label className="jf-label jf-label-required">Option Name / Title</label>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="e.g. 300 gsm Art Card or Die-Cut Round Corners"
                    value={modalForm.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* Code / SKU */}
                <div className="jf-form-group">
                  <label className="jf-label">System Code / Identifier (Optional)</label>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="e.g. ART_CARD_300"
                    value={modalForm.code}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, code: e.target.value }))}
                  />
                </div>

                {/* Config / Dimensions */}
                <div className="jf-form-group">
                  <label className="jf-label">Dimensions / Config Parameters (Optional)</label>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="e.g. 90 x 54 mm, or Saddle Stitch"
                    value={modalForm.config}
                    onChange={(e) =>
                      setModalForm((prev) => ({ ...prev, config: e.target.value }))
                    }
                  />
                </div>

                {/* Default Price & Unit */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="jf-form-group">
                    <label className="jf-label">Base Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="jf-input"
                      placeholder="0.00"
                      value={modalForm.defaultPrice}
                      onChange={(e) =>
                        setModalForm((prev) => ({ ...prev, defaultPrice: e.target.value }))
                      }
                    />
                  </div>

                  <div className="jf-form-group">
                    <label className="jf-label">Price Unit</label>
                    <input
                      type="text"
                      className="jf-input"
                      placeholder="e.g. pcs, side, sheet, job"
                      value={modalForm.unit}
                      onChange={(e) =>
                        setModalForm((prev) => ({ ...prev, unit: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Is Default Checkbox */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    background: "#fef3c7",
                    border: "1px solid #fde68a",
                    borderRadius: "8px",
                  }}
                >
                  <input
                    type="checkbox"
                    id="modalIsDefault"
                    checked={modalForm.isDefault}
                    onChange={(e) =>
                      setModalForm((prev) => ({ ...prev, isDefault: e.target.checked }))
                    }
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                  <label
                    htmlFor="modalIsDefault"
                    style={{ fontSize: "0.8rem", fontWeight: 600, color: "#92400e", cursor: "pointer" }}
                  >
                    ⭐ Set as Default Option for {activeCategory.displayName}
                  </label>
                </div>

                {/* Is Active Switch */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 2px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#0f172a" }}>
                      Active Status
                    </span>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "#475569" }}>
                      When active, this option appears in form dropdowns across the project.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={modalForm.isActive}
                    onChange={(e) =>
                      setModalForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    style={{ cursor: "pointer", width: "18px", height: "18px" }}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                  marginTop: "1.5rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="jf-btn jf-btn-primary"
                  disabled={saving}
                  style={{ background: "#059669", color: "#ffffff", fontWeight: 600 }}
                >
                  {saving ? "Saving..." : editingItem ? "Update Option" : "Add Option"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </JobFlowLayout>
  );
};

export default MasterSettingsPage;
