import React from "react";
import { Trash2 } from "lucide-react";
import SelectField from "../../../../shared/ui/selects/SelectField";
import { PRODUCT_TYPES, UNITS, typeLabel } from "../../utils/saleOrderStatus";
import { emptyItem, lineAmount } from "../../utils/totals";
import { formatMoney } from "../../utils/format";
import { useMasterDefaults } from "../../../jobflow/master-settings";
import "../../styles/sale-order.css";

// Same fallbacks the Job Order form uses when master settings have no entries
const SPEC_SELECTS = [
  { key: "paperType", label: "Paper Type", list: "paperTypes", fallback: ["Art Card", "Art Paper", "Simili Paper"], col: "c2" },
  { key: "paperGsm", label: "Paper GSM", list: "paperGsmList", fallback: ["260 gsm", "310 gsm", "157 gsm"], col: "c2" },
  { key: "size", label: "Size", list: "sizes", fallback: ["90 x 54 mm (Standard)", "A4 (210 x 297 mm)"], col: "c2" },
  { key: "color", label: "Color", list: "colors", fallback: ["Full Color (CMYK)", "Black & White (K-Only)"], col: "c2" },
  { key: "printingSide", label: "Printing Side", list: "printingSides", fallback: ["Double Sided", "Single Sided"], col: "c2" },
];

// Editable order lines, one roomy card per item. Amounts shown are an estimate; the server recalculates on save.
export default function OrderItemsEditor({ items, onChange, disabled = false }) {
  const master = useMasterDefaults();
  const optionsFor = (s, current) => {
    const names = (master[s.list] || []).length > 0 ? master[s.list].map((o) => o.name) : s.fallback;
    // Keep a saved value visible even if it was later removed from master settings
    return current && !names.includes(current) ? [current, ...names] : names;
  };
  const setField = (idx, field, value) => onChange(rows.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  // One order = one item. Older drafts saved with several items show a remove button
  // so they can be trimmed down to one before saving.
  const rows = items.length > 0 ? items : [emptyItem()];
  const remove = (idx) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <div className="so-item-list">
      {rows.length > 1 && (
        <div className="so-alert warn" style={{ marginBottom: 0 }}>
          <span>An order can have only one item. Remove the extra items before saving.</span>
        </div>
      )}
      {rows.map((it, idx) => (
        <div className="so-item" key={idx}>
          {rows.length > 1 && (
            <div className="so-item-head">
              <span className="so-item-num">Item {idx + 1}</span>
              {!disabled && (
                <button type="button" className="so-icon-btn danger" onClick={() => remove(idx)} title="Remove this item">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )}

          <div className="so-item-grid">
            <div className="so-field c4">
              <label>Product</label>
              <SelectField
                searchable={false}
                value={it.productType}
                onChange={(e) => setField(idx, "productType", e.target.value)}
                disabled={disabled}
                options={PRODUCT_TYPES.map((p) => ({ value: p, label: typeLabel(p) }))}
              />
            </div>
            <div className="so-field c6">
              <label>What to make <span className="req">*</span></label>
              <input
                className="so-input"
                placeholder="e.g. 500 visiting cards, matte finish"
                value={it.description}
                onChange={(e) => setField(idx, "description", e.target.value)}
                disabled={disabled}
              />
            </div>

            {SPEC_SELECTS.map((s) => (
              <div className={`so-field ${s.col}`} key={s.key}>
                <label>{s.label} <span className="req">*</span></label>
                <SelectField
                  searchable={false}
                  value={it[s.key] || ""}
                  onChange={(e) => setField(idx, s.key, e.target.value)}
                  disabled={disabled}
                  placeholder={`Select ${s.label}`}
                  options={optionsFor(s, it[s.key])}
                />
              </div>
            ))}

            <div className="so-field c2">
              <label>Quantity <span className="req">*</span></label>
              <input type="number" min="0" className="so-input" value={it.quantity} onChange={(e) => setField(idx, "quantity", e.target.value)} disabled={disabled} />
            </div>
            <div className="so-field c2">
              <label>Unit</label>
              <SelectField
                searchable={false}
                value={it.unit}
                onChange={(e) => setField(idx, "unit", e.target.value)}
                disabled={disabled}
                options={UNITS}
              />
            </div>
            <div className="so-field c2">
              <label>Rate (₹) <span className="req">*</span></label>
              <div className="so-prefix">
                <span>₹</span>
                <input type="number" min="0" step="0.01" className="so-input" value={it.unitPrice} onChange={(e) => setField(idx, "unitPrice", e.target.value)} disabled={disabled} />
              </div>
            </div>
            <div className="so-field c2">
              <label>Tax %</label>
              <input type="number" min="0" className="so-input" value={it.taxRate} onChange={(e) => setField(idx, "taxRate", e.target.value)} disabled={disabled} />
            </div>
            <div className="so-field c2">
              <label>Amount</label>
              <div className="so-item-amount">{formatMoney(lineAmount(it))}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
