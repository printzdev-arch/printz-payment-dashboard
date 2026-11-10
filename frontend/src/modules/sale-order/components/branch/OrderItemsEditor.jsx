import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { PRODUCT_TYPES, UNITS, typeLabel } from "../../utils/saleOrderStatus";
import { emptyItem, lineAmount } from "../../utils/totals";
import { formatMoney } from "../../utils/format";
import "../../styles/sale-order.css";

// Editable order lines, one roomy card per item. Amounts shown are an estimate; the server recalculates on save.
export default function OrderItemsEditor({ items, onChange, disabled = false }) {
  const setField = (idx, field, value) => onChange(items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, emptyItem()]);

  return (
    <div className="so-item-list">
      {items.map((it, idx) => (
        <div className="so-item" key={idx}>
          <div className="so-item-head">
            <span className="so-item-num">Item {idx + 1}</span>
            {items.length > 1 && !disabled && (
              <button type="button" className="so-icon-btn danger" onClick={() => remove(idx)} title="Remove this item">
                <Trash2 size={15} />
              </button>
            )}
          </div>

          <div className="so-item-grid">
            <div className="so-field c4">
              <label>Product</label>
              <select className="so-select" value={it.productType} onChange={(e) => setField(idx, "productType", e.target.value)} disabled={disabled}>
                {PRODUCT_TYPES.map((p) => (
                  <option key={p} value={p}>{typeLabel(p)}</option>
                ))}
              </select>
            </div>
            <div className="so-field c8">
              <label>What to make <span className="req">*</span></label>
              <input
                className="so-input"
                placeholder="e.g. 500 visiting cards, matte finish"
                value={it.description}
                onChange={(e) => setField(idx, "description", e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="so-field c2">
              <label>Quantity <span className="req">*</span></label>
              <input type="number" min="0" className="so-input" value={it.quantity} onChange={(e) => setField(idx, "quantity", e.target.value)} disabled={disabled} />
            </div>
            <div className="so-field c2">
              <label>Unit</label>
              <select className="so-select" value={it.unit} onChange={(e) => setField(idx, "unit", e.target.value)} disabled={disabled}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="so-field c3">
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
            <div className="so-field c3">
              <label>Amount</label>
              <div className="so-item-amount">{formatMoney(lineAmount(it))}</div>
            </div>
          </div>
        </div>
      ))}

      {!disabled && (
        <button type="button" className="so-add-row" onClick={add}>
          <Plus size={15} /> Add another item
        </button>
      )}
    </div>
  );
}
