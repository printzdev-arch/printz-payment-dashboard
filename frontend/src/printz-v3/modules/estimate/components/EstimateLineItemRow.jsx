import React from "react";
import { Trash2 } from "lucide-react";
import { LINE_ITEM_CATEGORIES, UNIT_OPTIONS } from "../constants/estimateConstants";
import { formatCurrency, roundToTwo } from "../utils/estimateCalculations";

export default function EstimateLineItemRow({
  line,
  index,
  totalLines,
  onChange,
  onRemove,
  readOnly = false
}) {
  const handleChange = (field, value) => {
    if (readOnly) return;
    const updated = { ...line, [field]: value };
    if (field === "quantity" || field === "rate") {
      const q = Math.max(0, Number(field === "quantity" ? value : updated.quantity) || 0);
      const r = Math.max(0, Number(field === "rate" ? value : updated.rate) || 0);
      updated.amount = roundToTwo(q * r);
    }
    onChange(index, updated);
  };

  const currentCat = LINE_ITEM_CATEGORIES.find((c) => c.id === line.category) || LINE_ITEM_CATEGORIES[0];

  return (
    <tr>
      {/* Index */}
      <td style={{ width: "32px", textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>
        {index + 1}
      </td>

      {/* Description */}
      <td style={{ minWidth: "220px" }}>
        {readOnly ? (
          <div>
            <strong style={{ color: "#0f172a", fontSize: "13px" }}>{line.description}</strong>
            {line.notes && <div style={{ fontSize: "11px", color: "#64748b" }}>{line.notes}</div>}
          </div>
        ) : (
          <input
            type="text"
            className="v3-table-input"
            value={line.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="e.g. 300 GSM Art Card Stock, Digital Print, Matte Lamination"
          />
        )}
      </td>

      {/* Category */}
      <td style={{ width: "160px" }}>
        {readOnly ? (
          <span
            className="v3-cat-badge"
            style={{
              backgroundColor: `${currentCat.color}15`,
              color: currentCat.color,
              border: `1px solid ${currentCat.color}35`
            }}
          >
            {currentCat.label.split("/")[0]}
          </span>
        ) : (
          <select
            className="v3-table-select"
            value={line.category || "MATERIAL"}
            onChange={(e) => handleChange("category", e.target.value)}
            style={{ width: "100%" }}
          >
            {LINE_ITEM_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        )}
      </td>

      {/* Quantity */}
      <td style={{ width: "95px" }}>
        {readOnly ? (
          <span style={{ fontWeight: 700 }}>{Number(line.quantity || 0).toLocaleString()}</span>
        ) : (
          <input
            type="number"
            min="0"
            step="any"
            className="v3-table-input"
            value={line.quantity ?? ""}
            onChange={(e) => handleChange("quantity", e.target.value)}
            style={{ textAlign: "right", fontWeight: 600 }}
          />
        )}
      </td>

      {/* Unit */}
      <td style={{ width: "95px" }}>
        {readOnly ? (
          <span style={{ fontSize: "12px", color: "#64748b" }}>{line.unit || "PCS"}</span>
        ) : (
          <select
            className="v3-table-select"
            value={line.unit || "PCS"}
            onChange={(e) => handleChange("unit", e.target.value)}
            style={{ width: "100%" }}
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        )}
      </td>

      {/* Rate */}
      <td style={{ width: "105px" }}>
        {readOnly ? (
          <span>{formatCurrency(line.rate || 0)}</span>
        ) : (
          <input
            type="number"
            min="0"
            step="any"
            className="v3-table-input"
            value={line.rate ?? ""}
            onChange={(e) => handleChange("rate", e.target.value)}
            style={{ textAlign: "right", fontWeight: 600 }}
          />
        )}
      </td>

      {/* Calculated Amount */}
      <td style={{ width: "115px", textAlign: "right", fontWeight: 800, color: "#047857", fontSize: "13px" }}>
        {formatCurrency(line.amount || (Number(line.quantity) * Number(line.rate)) || 0)}
      </td>

      {/* Action */}
      {!readOnly && (
        <td style={{ width: "40px", textAlign: "center" }}>
          {totalLines > 1 && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              title="Remove pricing component"
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "4px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              <Trash2 size={14} />
            </button>
          )}
        </td>
      )}
    </tr>
  );
}
