import React from "react";
import {
  Trash2,
  Copy,
  Printer,
  FileSpreadsheet,
  Scissors,
  Palette,
  Maximize2,
  FileText,
  Check,
  Sparkles
} from "lucide-react";
import {
  ALL_PRODUCTS,
  PRODUCT_CATEGORIES,
  UNIT_OPTIONS,
  SIZE_PRESETS,
  SIZE_UNITS,
  PRINTING_SIDE_OPTIONS,
  COLOUR_MODE_OPTIONS,
  PAPER_MATERIALS,
  FINISHING_OPTIONS
} from "../constants/jobConstants";
import "../../customer/styles/customerV3.css";
import "../styles/jobV3.css";

export default function JobItemCard({
  item,
  index,
  totalItems,
  errors = {},
  onChange,
  onRemove,
  onDuplicate
}) {
  const itemErrors = (field) => errors[`items[${index}].${field}`];

  // Helper for nested field change
  const handleFieldChange = (field, value) => {
    onChange(index, { ...item, [field]: value });
  };

  const handleNestedFieldChange = (parentKey, subKey, value) => {
    onChange(index, {
      ...item,
      [parentKey]: {
        ...(item[parentKey] || {}),
        [subKey]: value
      }
    });
  };

  // Toggle finishing option
  const toggleFinishing = (finishingId) => {
    const currentList = Array.isArray(item.finishing) ? item.finishing : [];
    const exists = currentList.some((f) => (typeof f === "object" ? f.code === finishingId || f._id === finishingId : f === finishingId));
    const updated = exists
      ? currentList.filter((f) => (typeof f === "object" ? f.code !== finishingId && f._id !== finishingId : f !== finishingId))
      : [...currentList, finishingId];
    handleFieldChange("finishing", updated);
  };

  // Handle Size Preset selection
  const handleSizePresetChange = (presetValue) => {
    const preset = SIZE_PRESETS.find((p) => p.value === presetValue);
    if (!preset) return;

    if (preset.value === "CUSTOM") {
      onChange(index, {
        ...item,
        size: {
          type: "CUSTOM",
          presetName: "Custom Dimension",
          width: item.size?.width || "",
          height: item.size?.height || "",
          unit: item.size?.unit || "INCH"
        }
      });
    } else {
      onChange(index, {
        ...item,
        size: {
          type: "PRESET",
          presetName: preset.label,
          width: preset.width,
          height: preset.height,
          unit: preset.unit
        }
      });
    }
  };

  // Handle Paper Material selection
  const handlePaperTypeChange = (paperType) => {
    const found = PAPER_MATERIALS.find((p) => p.type === paperType);
    const defaultGsm = found?.gsmList?.[0] || 300;
    onChange(index, {
      ...item,
      material: {
        ...(item.material || {}),
        paperType,
        gsm: defaultGsm
      }
    });
  };

  // Handle smart product selection
  const handleProductSelect = (productName) => {
    let updatedItem = {
      ...item,
      itemName: productName,
      productType: productName
    };

    const pLower = (productName || "").toLowerCase();
    if (pLower.includes("visiting") || pLower.includes("business card")) {
      updatedItem.size = { type: "PRESET", presetName: "Visiting Card (3.5 × 2.0 in)", width: 3.5, height: 2.0, unit: "INCH" };
      updatedItem.material = { paperType: "Art Card", gsm: 300, paperSize: "SRA3", notes: "" };
      updatedItem.unit = "PCS";
      if (!updatedItem.quantity) updatedItem.quantity = 1000;
      updatedItem.finishing = ["CUTTING", "LAMINATION_MATTE"];
      updatedItem.printing = { side: "DOUBLE_SIDE", colourMode: "COLOUR" };
    } else if (pLower.includes("letterhead")) {
      updatedItem.size = { type: "PRESET", presetName: "A4 Letterhead (8.27 × 11.69 in)", width: 8.27, height: 11.69, unit: "INCH" };
      updatedItem.material = { paperType: "Maplitho / Bond Paper", gsm: 100, paperSize: "A4", notes: "" };
      updatedItem.unit = "PCS";
      if (!updatedItem.quantity) updatedItem.quantity = 500;
      updatedItem.printing = { side: "SINGLE_SIDE", colourMode: "COLOUR" };
    } else if (pLower.includes("brochure") || pLower.includes("flyer") || pLower.includes("leaflet")) {
      updatedItem.size = { type: "PRESET", presetName: "A4 (8.27 × 11.69 in)", width: 8.27, height: 11.69, unit: "INCH" };
      updatedItem.material = { paperType: "Art Paper / Gloss Paper", gsm: 170, paperSize: "A4", notes: "" };
      updatedItem.unit = "PCS";
      if (!updatedItem.quantity) updatedItem.quantity = 500;
    } else if (pLower.includes("flex") || pLower.includes("banner") || pLower.includes("signage")) {
      updatedItem.size = { type: "CUSTOM", presetName: "Custom Dimension", width: 10, height: 5, unit: "FEET" };
      updatedItem.material = { paperType: "Flex / Star Flex", gsm: 340, paperSize: "Roll", notes: "" };
      updatedItem.unit = "SQFT";
      if (!updatedItem.quantity) updatedItem.quantity = 1;
      updatedItem.printing = { side: "SINGLE_SIDE", colourMode: "COLOUR" };
    } else if (pLower.includes("envelope")) {
      updatedItem.size = { type: "PRESET", presetName: "#10 Envelope (9.5 × 4.125 in)", width: 9.5, height: 4.125, unit: "INCH" };
      updatedItem.material = { paperType: "Maplitho / Bond Paper", gsm: 100, paperSize: "Custom", notes: "" };
      updatedItem.unit = "PCS";
      if (!updatedItem.quantity) updatedItem.quantity = 500;
    } else if (pLower.includes("id card")) {
      updatedItem.size = { type: "PRESET", presetName: "ID Card (3.375 × 2.125 in)", width: 3.375, height: 2.125, unit: "INCH" };
      updatedItem.material = { paperType: "PVC / Plastic Card", gsm: 300, paperSize: "CR80", notes: "" };
      updatedItem.unit = "PCS";
      if (!updatedItem.quantity) updatedItem.quantity = 10;
    }

    onChange(index, updatedItem);
  };

  const currentPaper = PAPER_MATERIALS.find((p) => p.type === item.material?.paperType);
  const availableGsms = currentPaper ? currentPaper.gsmList : [70, 80, 100, 130, 170, 250, 300, 350, 400];

  return (
    <div className="v3-item-card">
      {/* Item Header */}
      <div className="v3-item-card-header">
        <div className="v3-item-badge-title">
          <div className="v3-item-index-badge">{index + 1}</div>
          <div>
            <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
              {item.itemName || `Job Item #${index + 1} (Unconfigured)`}
            </h4>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(index)}
              className="v3-btn-secondary"
              style={{ fontSize: "11px", padding: "4px 10px", height: "30px" }}
              title="Duplicate Item"
            >
              <Copy size={13} />
              Duplicate
            </button>
          )}

          {totalItems > 1 && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="v3-btn-secondary"
              style={{ fontSize: "11px", padding: "4px 10px", height: "30px", color: "#e11d48", borderColor: "#fecdd3" }}
              title="Remove Item"
            >
              <Trash2 size={13} />
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Row 1: Product / Service & Quantity */}
      <div className="v3-grid-12" style={{ marginBottom: "16px" }}>
        {/* Product / Service Name (6 cols) */}
        <div className="v3-col-6">
          <div className="v3-form-group">
            <label className="v3-form-label">
              Product / Service <span className="v3-required-star">*</span>
            </label>
            <div className="v3-input-wrapper">
              <input
                type="text"
                list={`products-list-${index}`}
                value={item.itemName || ""}
                onChange={(e) => handleProductSelect(e.target.value)}
                placeholder="-- Select or type product (e.g. Visiting Card, Flex Banner, Brochure) --"
                className={`v3-input no-icon ${itemErrors("itemName") ? "has-error" : ""}`}
              />
              <datalist id={`products-list-${index}`}>
                {ALL_PRODUCTS.map((prod) => (
                  <option key={prod} value={prod} />
                ))}
              </datalist>
            </div>
            {itemErrors("itemName") && <p className="v3-error-text">{itemErrors("itemName")}</p>}
          </div>
        </div>

        {/* Quantity (3 cols) */}
        <div className="v3-col-3">
          <div className="v3-form-group">
            <label className="v3-form-label">
              Quantity <span className="v3-required-star">*</span>
            </label>
            <div className="v3-input-wrapper">
              <input
                type="number"
                min="1"
                step="1"
                value={item.quantity || ""}
                onChange={(e) => handleFieldChange("quantity", e.target.value)}
                placeholder="e.g. 500, 1000"
                className={`v3-input no-icon ${itemErrors("quantity") ? "has-error" : ""}`}
                style={{ fontWeight: 700 }}
              />
            </div>
            {itemErrors("quantity") && <p className="v3-error-text">{itemErrors("quantity")}</p>}
          </div>
        </div>

        {/* Unit (3 cols) */}
        <div className="v3-col-3">
          <div className="v3-form-group">
            <label className="v3-form-label">
              Unit <span className="v3-required-star">*</span>
            </label>
            <div className="v3-input-wrapper">
              <select
                value={item.unit || "PCS"}
                onChange={(e) => handleFieldChange("unit", e.target.value)}
                className="v3-input no-icon"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SPEC SECTION A: Size Specification */}
      <div className="v3-spec-section">
        <div className="v3-spec-section-title">
          <Maximize2 size={13} color="#047857" />
          Size & Dimensions
        </div>

        <div className="v3-grid-12">
          {/* Preset dropdown (4 cols) */}
          <div className="v3-col-4">
            <div className="v3-form-group">
              <label className="v3-form-label">Size Preset</label>
              <select
                value={item.size?.type === "CUSTOM" ? "CUSTOM" : (item.size?.presetName ? SIZE_PRESETS.find(p => p.label === item.size.presetName)?.value || "CUSTOM" : "VC_STD")}
                onChange={(e) => handleSizePresetChange(e.target.value)}
                className="v3-input no-icon"
              >
                {SIZE_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Width (3 cols) */}
          <div className="v3-col-3">
            <div className="v3-form-group">
              <label className="v3-form-label">
                Width {item.size?.type === "CUSTOM" && <span className="v3-required-star">*</span>}
              </label>
              <input
                type="number"
                step="any"
                disabled={item.size?.type !== "CUSTOM"}
                value={item.size?.width !== undefined ? item.size.width : ""}
                onChange={(e) => handleNestedFieldChange("size", "width", e.target.value)}
                placeholder="Width"
                className={`v3-input no-icon ${itemErrors("size.width") ? "has-error" : ""}`}
              />
              {itemErrors("size.width") && <p className="v3-error-text">{itemErrors("size.width")}</p>}
            </div>
          </div>

          {/* Height (3 cols) */}
          <div className="v3-col-3">
            <div className="v3-form-group">
              <label className="v3-form-label">
                Height {item.size?.type === "CUSTOM" && <span className="v3-required-star">*</span>}
              </label>
              <input
                type="number"
                step="any"
                disabled={item.size?.type !== "CUSTOM"}
                value={item.size?.height !== undefined ? item.size.height : ""}
                onChange={(e) => handleNestedFieldChange("size", "height", e.target.value)}
                placeholder="Height"
                className={`v3-input no-icon ${itemErrors("size.height") ? "has-error" : ""}`}
              />
              {itemErrors("size.height") && <p className="v3-error-text">{itemErrors("size.height")}</p>}
            </div>
          </div>

          {/* Unit (2 cols) */}
          <div className="v3-col-2">
            <div className="v3-form-group">
              <label className="v3-form-label">Dimension Unit</label>
              <select
                disabled={item.size?.type !== "CUSTOM"}
                value={item.size?.unit || "INCH"}
                onChange={(e) => handleNestedFieldChange("size", "unit", e.target.value)}
                className="v3-input no-icon"
              >
                {SIZE_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SPEC SECTION B: Printing & Material Requirements */}
      <div className="v3-grid-12" style={{ marginBottom: "14px" }}>
        {/* Printing Requirements (6 cols) */}
        <div className="v3-col-6">
          <div className="v3-spec-section" style={{ height: "100%", margin: 0 }}>
            <div className="v3-spec-section-title">
              <Printer size={13} color="#047857" />
              Printing Specifications
            </div>

            <div className="v3-grid-12">
              <div className="v3-col-6">
                <div className="v3-form-group">
                  <label className="v3-form-label">Printing Side</label>
                  <select
                    value={item.printing?.side || "SINGLE_SIDE"}
                    onChange={(e) => handleNestedFieldChange("printing", "side", e.target.value)}
                    className="v3-input no-icon"
                  >
                    {PRINTING_SIDE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="v3-col-6">
                <div className="v3-form-group">
                  <label className="v3-form-label">Colour Mode</label>
                  <select
                    value={item.printing?.colourMode || "COLOUR"}
                    onChange={(e) => handleNestedFieldChange("printing", "colourMode", e.target.value)}
                    className="v3-input no-icon"
                  >
                    {COLOUR_MODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Paper / Material Requirements (6 cols) */}
        <div className="v3-col-6">
          <div className="v3-spec-section" style={{ height: "100%", margin: 0 }}>
            <div className="v3-spec-section-title">
              <FileSpreadsheet size={13} color="#047857" />
              Paper & Material
            </div>

            <div className="v3-grid-12">
              <div className="v3-col-8">
                <div className="v3-form-group">
                  <label className="v3-form-label">
                    Paper / Substrate <span className="v3-required-star">*</span>
                  </label>
                  <select
                    value={item.material?.paperType || "Art Card"}
                    onChange={(e) => handlePaperTypeChange(e.target.value)}
                    className={`v3-input no-icon ${itemErrors("material.paperType") ? "has-error" : ""}`}
                  >
                    {PAPER_MATERIALS.map((mat) => (
                      <option key={mat.type} value={mat.type}>
                        {mat.type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="v3-col-4">
                <div className="v3-form-group">
                  <label className="v3-form-label">GSM / Thickness</label>
                  <select
                    value={item.material?.gsm || availableGsms[0]}
                    onChange={(e) => handleNestedFieldChange("material", "gsm", Number(e.target.value))}
                    className="v3-input no-icon"
                  >
                    {availableGsms.map((gsm) => (
                      <option key={gsm} value={gsm}>
                        {gsm} GSM
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SPEC SECTION C: Finishing Requirements (Multi-Select Chips) */}
      <div className="v3-spec-section">
        <div className="v3-spec-section-title">
          <Scissors size={13} color="#047857" />
          Post-Press & Finishing Requirements (Select all that apply)
        </div>

        <div className="v3-chips-grid">
          {FINISHING_OPTIONS.map((opt) => {
            const isSelected = Array.isArray(item.finishing) && item.finishing.some((f) => (typeof f === "object" ? f.code === opt.id || f._id === opt.id : f === opt.id));
            return (
              <div
                key={opt.id}
                onClick={() => toggleFinishing(opt.id)}
                className={`v3-chip ${isSelected ? "active" : ""}`}
              >
                <div className="v3-chip-check">
                  {isSelected && <Check size={10} />}
                </div>
                <span>{opt.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SPEC SECTION D: Design Requirement & Item Notes */}
      <div className="v3-grid-12">
        {/* Design Toggle & Notes (6 cols) */}
        <div className="v3-col-6">
          <div className="v3-spec-section" style={{ height: "100%", margin: 0 }}>
            <div className="v3-spec-section-title">
              <Sparkles size={13} color="#047857" />
              Design & Artwork Requirement
            </div>

            <div className="v3-switch-row" style={{ marginBottom: item.designRequired ? "10px" : "0" }}>
              <div>
                <strong style={{ fontSize: "13px", color: "#0f172a" }}>Design Service Required?</strong>
                <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>
                  {item.designRequired ? "Yes (Our in-house design team will prepare artwork)" : "No (Customer will provide print-ready file)"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleFieldChange("designRequired", !item.designRequired)}
                className={`v3-switch-btn ${item.designRequired ? "active" : ""}`}
                aria-label="Toggle Design Required"
              >
                <div className="v3-switch-knob" />
              </button>
            </div>

            {item.designRequired && (
              <div className="v3-form-group" style={{ marginTop: "10px" }}>
                <label className="v3-form-label">Design Brief / Instructions</label>
                <textarea
                  rows="2"
                  value={item.designNotes || ""}
                  onChange={(e) => handleFieldChange("designNotes", e.target.value)}
                  placeholder="e.g. Modern minimalist design, use navy blue and gold, logo file sent on WhatsApp"
                  className="v3-input no-icon"
                  style={{ height: "auto", padding: "8px 12px", fontFamily: "inherit" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Item Technical Notes (6 cols) */}
        <div className="v3-col-6">
          <div className="v3-spec-section" style={{ height: "100%", margin: 0 }}>
            <div className="v3-spec-section-title">
              <FileText size={13} color="#047857" />
              Item Technical Notes
            </div>

            <div className="v3-form-group">
              <textarea
                rows={item.designRequired ? 4 : 2}
                value={item.notes || ""}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                placeholder="e.g. Keep 3mm bleed margin, sample approved on 15th Sep, pack in bundles of 100"
                className="v3-input no-icon"
                style={{ height: "auto", minHeight: "72px", padding: "8px 12px", fontFamily: "inherit" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
