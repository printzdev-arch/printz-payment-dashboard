import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Flag,
  Info,
  Layers,
  ListOrdered,
  Lock,
  Package,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Scissors,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import productionApi from "../api/productionApi";
import "../styles/production-planning.css";
import "../styles/production-theme.css";

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
/* Constants                                                                  */
/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */

const ROWS_PER_PAGE = 8;

// Same operation codes the server understands (productionSpecificationHelper)
const OPERATION_TYPES = [
  { code: "PREPRESS", name: "Prepress & Plate/Imposition Check" },
  { code: "PRINT", name: "Printing" },
  { code: "LAMINATION", name: "Lamination" },
  { code: "FOILING", name: "Foil Stamping" },
  { code: "UV_COATING", name: "UV Coating / Spot UV" },
  { code: "DIE_CUTTING", name: "Die-Cutting" },
  { code: "CUTTING", name: "Cutting / Trimming" },
  { code: "CREASING", name: "Creasing / Scoring" },
  { code: "PERFORATION", name: "Perforation" },
  { code: "FOLDING", name: "Folding" },
  { code: "BINDING", name: "Binding" },
  { code: "PERFECT_BINDING", name: "Perfect Binding" },
  { code: "MOUNTING", name: "Mounting" },
  { code: "NUMBERING", name: "Numbering" },
  { code: "PACKING", name: "Packaging & Bundling" },
];

const OP_ICONS = {
  PRINT: Printer,
  LAMINATION: Layers,
  CUTTING: Scissors,
  DIE_CUTTING: Scissors,
  CREASING: Scissors,
  FOLDING: BookOpen,
  BINDING: BookOpen,
  PERFECT_BINDING: BookOpen,
  PACKING: Package,
};

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const UNIT_OPTIONS = ["pcs", "sheets", "ml", "m", "kg"];

// Operations that have started or finished are owned by the shop floor and cannot be replanned
const LOCKED_OP_STATUSES = ["IN_PROGRESS", "RUNNING", "PAUSED", "COMPLETED", "SKIPPED", "FAILED"];

const TABS = [
  { id: "PLAN", label: "Waiting to Plan" },
  { id: "REVISE", label: "Planned (Revise)" },
];

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
/* Helpers                                                                    */
/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */

const pad = (n) => String(n).padStart(2, "0");
const toInputDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d) ? "" : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const todayInput = () => toInputDate(new Date());

const formatDay = (value) => {
  if (!value) return "ΓÇö";
  const d = new Date(value);
  return isNaN(d) ? "ΓÇö" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatMinutes = (m) => {
  const n = Math.round(Number(m) || 0);
  if (!n) return "ΓÇö";
  const h = Math.floor(n / 60);
  const r = n % 60;
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
};

const daysBetween = (start, end) => {
  if (!start || !end) return null;
  const diff = new Date(`${end}T00:00`) - new Date(`${start}T00:00`);
  if (Number.isNaN(diff) || diff < 0) return null;
  return Math.round(diff / 86400000) + 1;
};

const shortageFor = (required, available) => Math.max(0, (Number(required) || 0) - (Number(available) || 0));

const priorityLabel = (p) => PRIORITY_OPTIONS.find((o) => o.value === String(p || "").toUpperCase())?.label || "Normal";
const priorityTone = (p) => {
  const v = String(p || "").toUpperCase();
  return v === "HIGH" || v === "URGENT" || v === "RUSH" ? "high" : v === "LOW" ? "low" : "normal";
};

const unwrap = (res) => res?.data || res || {};
const errorMessage = (err, fallback) => {
  const d = err?.response?.data;
  const details = Array.isArray(d?.details) ? d.details.map((x) => x?.message).filter(Boolean).join(" ") : "";
  return details || d?.message || err?.message || fallback;
};
const listOf = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : d.items || d.branches || [];
};

const isLockedOp = (op) => LOCKED_OP_STATUSES.includes(op.status);

// Server row -> view model used by the plan screen
const mapRow = (row) => {
  const specs = row.specificationsSnapshot || {};
  const finishing = Array.isArray(specs.requiredFinishing) && specs.requiredFinishing.length ? specs.requiredFinishing.join(", ") : specs.lamination && specs.lamination !== "Not Required" ? specs.lamination : "";

  const suggested = [...(row.suggestedOperations || [])].sort((a, b) => a.sequenceNo - b.sequenceNo);
  const keyOfSeq = (seq) => `seq-${seq}`;

  return {
    id: row.productionOrderId || row.id || row._id,
    productionNo: row.productionNo,
    jobNo: row.jobNo || "",
    jobId: row.jobOrderId || row.jobId,
    estimateNo: row.estimateNo || "",
    customerName: row.customerName || "ΓÇö",
    customerSource: row.customerSource || "",
    companyName: row.customerCompany || row.customerName || "",
    productName: row.productName || specs.productName || "Print Job",
    quantity: Number(row.requiredQuantity) || 0,
    unit: row.unit || "pcs",
    dueDate: row.dueDate || null,
    priority: String(row.priority || "NORMAL").toUpperCase(),
    status: row.status || "UNASSIGNED",
    planningStatus: row.planningStatus || "UNPLANNED",
    planVersion: Number(row.planVersion) || 0,
    plannedStart: row.plannedStart || null,
    plannedEnd: row.plannedEnd || null,
    notes: row.notes || "",
    manager: row.productionManager || "",
    specialInstructions: specs.specialInstructions || row.specialInstructions || "",
    artwork: {
      url: row.approvedSample?.fileUrl || row.approvedSample?.thumbnailUrl || "",
      thumb: row.approvedSample?.thumbnailUrl || row.approvedSample?.fileUrl || "",
    },
    specs: {
      size: specs.size || "",
      paper: [specs.material, specs.paperGsm && `${specs.paperGsm} GSM`].filter(Boolean).join(" ┬╖ "),
      color: [specs.colorMode, specs.printingSide].filter(Boolean).join(" ┬╖ "),
      finishing,
    },
    operations: suggested.map((op) => ({
      id: keyOfSeq(op.sequenceNo),
      operationCode: op.operationCode,
      operationName: op.operationName,
      machineId: op.machineId || "",
      machine: op.machine || "",
      assignedEmployeeId: op.assignedEmployeeId || "",
      operator: op.operatorName || "",
      plannedStart: toInputDate(op.plannedStart),
      plannedEnd: toInputDate(op.plannedEnd),
      estimatedMinutes: Number(op.estimatedMinutes) || 20,
      dependsOnIds: (op.dependsOn || []).map(keyOfSeq),
      instructions: op.instructions || "",
      status: op.status || "PENDING",
      lockedSeq: op.sequenceNo,
      source: row.status === "UNASSIGNED" ? "Suggested" : "Planned",
    })),
    materials: (row.materials || []).map((m, i) => ({
      id: `mat-${i}`,
      name: m.name || "",
      spec: m.spec || "",
      requiredQty: Number(m.requiredQty) || 0,
      unit: m.unit || "pcs",
      availableStock: Number(m.availableStock) || 0,
      relatedOperation: m.relatedOperation || "General",
      remarks: m.remarks || "",
    })),
  };
};

// Sequence numbers for the editable rows: locked rows keep theirs, the rest fill the gaps in order
const assignSequences = (operations) => {
  const used = new Set(operations.filter(isLockedOp).map((o) => o.lockedSeq));
  let next = 1;
  const map = {};
  operations.forEach((op) => {
    if (isLockedOp(op)) {
      map[op.id] = op.lockedSeq;
    } else {
      while (used.has(next)) next += 1;
      map[op.id] = next;
      used.add(next);
    }
  });
  return map;
};

function OperationGlyph({ code }) {
  const Icon = OP_ICONS[code] || Package;
  return <Icon size={16} />;
}

function PriorityBadge({ priority }) {
  return <span className={`pp-badge pp-badge--${priorityTone(priority)}`}>{priorityLabel(priority)}</span>;
}

function Field({ label, required, hint, children }) {
  return (
    <div className="pp-field">
      <label className="pp-field-label">
        {label}
        {required && <span className="pp-required"> *</span>}
      </label>
      {children}
      {hint && <span className="pp-hint">{hint}</span>}
    </div>
  );
}

function CardHead({ step, title, note, subtitle, actions }) {
  return (
    <div className="pp-card-head">
      <div className="pp-card-head-text">
        <div className="pp-card-title-row">
          {step && <span className="pp-step">{step}</span>}
          <div>
            <h3 className="pp-card-title">
              {title}
              {note && <span className="pp-card-note"> {note}</span>}
            </h3>
            {subtitle && <p className="pp-card-sub">{subtitle}</p>}
          </div>
        </div>
      </div>
      {actions && <div className="pp-card-actions">{actions}</div>}
    </div>
  );
}

function Detail({ label, children }) {
  return (
    <div className="pp-detail">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="pp-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pp-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="pp-modal-head">
          <h3>{title}</h3>
          <button type="button" className="pp-icon-btn pp-icon-btn--neutral" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
/* Machine / operator pickers (real records, sends ids)                       */
/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */

function ResourceSelect({ value, fallbackName, items, emptyLabel, onChange, small, label }) {
  // A name saved before pickers existed is kept as an option so it is not lost
  const hasValue = !value || items.some((i) => String(i.id || i._id) === String(value));
  return (
    <div className="pp-select-wrap">
      <select
        className={`pp-select ${small ? "pp-select--sm" : ""}`}
        value={value || ""}
        aria-label={label}
        onChange={(e) => {
          const id = e.target.value;
          const item = items.find((i) => String(i.id || i._id) === id);
          onChange(id, item ? item.name : "");
        }}
      >
        <option value="">{!value && fallbackName ? `${fallbackName} (not linked)` : emptyLabel}</option>
        {!hasValue && <option value={value}>{fallbackName || "Current selection"}</option>}
        {items.map((i) => (
          <option key={i.id || i._id} value={i.id || i._id}>
            {i.name}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
/* Operation form                                                             */
/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */

function OperationForm({ initial, otherOps, machines, operators, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const invalidDates = form.plannedStart && form.plannedEnd && form.plannedEnd < form.plannedStart;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (invalidDates) {
      toast.error("Planned end date cannot be before the start date.");
      return;
    }
    const minutes = Number(form.estimatedMinutes);
    if (!minutes || minutes < 1) {
      toast.error("Enter the estimated minutes for this operation.");
      return;
    }
    const type = OPERATION_TYPES.find((t) => t.code === form.operationCode) || OPERATION_TYPES[0];
    onSubmit({ ...form, operationCode: type.code, operationName: type.name, estimatedMinutes: minutes });
  };

  return (
    <form className="pp-form" onSubmit={handleSubmit}>
      <div className="pp-modal-body">
        <div className="pp-form-grid">
          <Field label="Operation" required>
            <select className="pp-select" value={form.operationCode} onChange={(e) => update("operationCode", e.target.value)}>
              {OPERATION_TYPES.map((t) => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Est. Duration (minutes)" required>
            <input type="number" min="1" className="pp-input" value={form.estimatedMinutes} onChange={(e) => update("estimatedMinutes", e.target.value)} required />
          </Field>

          <Field label="Machine">
            <ResourceSelect
              value={form.machineId}
              fallbackName={form.machine}
              items={machines}
              emptyLabel="Not assigned"
              label="Machine"
              onChange={(id, name) => setForm((prev) => ({ ...prev, machineId: id, machine: name }))}
            />
          </Field>

          <Field label="Operator" hint="Leave empty to let any operator claim it from Tracking.">
            <ResourceSelect
              value={form.assignedEmployeeId}
              fallbackName={form.operator}
              items={operators}
              emptyLabel="Open for any operator"
              label="Operator"
              onChange={(id, name) => setForm((prev) => ({ ...prev, assignedEmployeeId: id, operator: name }))}
            />
          </Field>

          <Field label="Planned Start" required>
            <input type="date" className="pp-input" value={form.plannedStart} onChange={(e) => update("plannedStart", e.target.value)} required />
          </Field>

          <Field label="Planned End" required hint={invalidDates ? "End date must be on or after the start date." : undefined}>
            <input
              type="date"
              className={`pp-input ${invalidDates ? "pp-input--error" : ""}`}
              value={form.plannedEnd}
              min={form.plannedStart || undefined}
              onChange={(e) => update("plannedEnd", e.target.value)}
              required
            />
          </Field>

          <Field label="Starts After">
            <select className="pp-select" value={form.dependsOnIds[0] || ""} onChange={(e) => update("dependsOnIds", e.target.value ? [e.target.value] : [])}>
              <option value="">All earlier steps (default)</option>
              {otherOps.map((op) => (
                <option key={op.id} value={op.id}>{op.operationName}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Instructions">
          <textarea rows={3} maxLength={300} className="pp-textarea" value={form.instructions} onChange={(e) => update("instructions", e.target.value)} placeholder="Standard machine run" />
        </Field>
      </div>

      <footer className="pp-modal-foot">
        <button type="button" className="pp-btn pp-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="pp-btn pp-btn--primary">Save Operation</button>
      </footer>
    </form>
  );
}

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
/* Material form                                                              */
/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */

function MaterialForm({ initial, operationNames, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const shortage = shortageFor(form.requiredQty, form.availableStock);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      name: form.name.trim(),
      requiredQty: Number(form.requiredQty) || 0,
      availableStock: Number(form.availableStock) || 0,
    });
  };

  return (
    <form className="pp-form" onSubmit={handleSubmit}>
      <div className="pp-modal-body">
        <div className="pp-form-grid">
          <Field label="Material Name" required>
            <input type="text" className="pp-input" value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </Field>
          <Field label="Specification">
            <input type="text" className="pp-input" value={form.spec} onChange={(e) => update("spec", e.target.value)} />
          </Field>
          <Field label="Required Qty" required>
            <input type="number" min="0" className="pp-input" value={form.requiredQty} onChange={(e) => update("requiredQty", e.target.value)} required />
          </Field>
          <Field label="Unit">
            <select className="pp-select" value={form.unit} onChange={(e) => update("unit", e.target.value)}>
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="Available Stock" required hint="Entered by you. Stock is not read from Inventory here.">
            <input type="number" min="0" className="pp-input" value={form.availableStock} onChange={(e) => update("availableStock", e.target.value)} required />
          </Field>
          <Field label="Related Operation">
            <select className="pp-select" value={form.relatedOperation} onChange={(e) => update("relatedOperation", e.target.value)}>
              <option value="General">General</option>
              {operationNames.map((name, i) => (
                <option key={`${name}-${i}`} value={name}>{name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="pp-shortage-note">
          Shortage: <strong className={shortage > 0 ? "pp-text-danger" : ""}>{shortage} {form.unit}</strong>
          <span> (calculated from required and available quantity)</span>
        </div>

        <Field label="Remarks">
          <input type="text" className="pp-input" value={form.remarks} onChange={(e) => update("remarks", e.target.value)} placeholder="Optional" />
        </Field>
      </div>

      <footer className="pp-modal-foot">
        <button type="button" className="pp-btn pp-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="pp-btn pp-btn--primary">Save Material</button>
      </footer>
    </form>
  );
}

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
/* Plan production view                                                       */
/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */

function PlanProductionView({ job, machines, operators, onBack, onDone }) {
  const revising = job.status !== "UNASSIGNED";

  const [operations, setOperations] = useState(job.operations);
  const [materials, setMaterials] = useState(job.materials);
  const [reorderMode, setReorderMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allowShortage, setAllowShortage] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [schedule, setSchedule] = useState({
    startDate: toInputDate(job.plannedStart) || todayInput(),
    endDate: toInputDate(job.plannedEnd) || toInputDate(job.dueDate) || "",
    manager: job.manager,
    priority: job.priority === "RUSH" ? "URGENT" : job.priority,
    instructions: job.notes,
  });

  const [opModal, setOpModal] = useState(null); // { index: null | number }
  const [matModal, setMatModal] = useState(null);

  const updateSchedule = (key, value) => setSchedule((prev) => ({ ...prev, [key]: value }));

  const sequences = useMemo(() => assignSequences(operations), [operations]);
  const totalMinutes = operations.reduce((sum, op) => sum + (Number(op.estimatedMinutes) || 0), 0);
  const days = daysBetween(schedule.startDate, schedule.endDate);
  const durationLabel = days ? `${days} Day${days > 1 ? "s" : ""} (${formatMinutes(totalMinutes)} of work)` : "Set valid dates";
  const scheduleDatesInvalid = schedule.startDate && schedule.endDate && schedule.endDate < schedule.startDate;
  const operationNames = operations.map((op) => op.operationName);
  const hasShortage = materials.some((m) => shortageFor(m.requiredQty, m.availableStock) > 0);
  const nameOfOp = (id) => operations.find((o) => o.id === id)?.operationName;

  /* ΓöÇΓöÇ Operations ΓöÇΓöÇ */
  const resetToSuggested = () => {
    if (!window.confirm("Replace the editable operations with the suggested sequence? Operations already started stay as they are.")) return;
    const locked = operations.filter(isLockedOp);
    const lockedSeqs = new Set(locked.map((o) => o.lockedSeq));
    const fresh = job.operations.filter((o) => !isLockedOp(o) && !lockedSeqs.has(o.lockedSeq));
    setOperations([...locked, ...fresh].sort((a, b) => a.lockedSeq - b.lockedSeq));
    toast.success("Operations reset to the suggested sequence.");
  };

  const saveOperation = (data) => {
    if (opModal.index === null) {
      setOperations((prev) => [...prev, { ...data, id: `new-${Date.now()}`, status: "PENDING", lockedSeq: null, source: "Manual" }]);
      toast.success(`Added ${data.operationName}.`);
    } else {
      setOperations((prev) => prev.map((op, i) => (i === opModal.index ? { ...op, ...data } : op)));
      toast.success(`Updated ${data.operationName}.`);
    }
    setOpModal(null);
  };

  const removeOperation = (idx) => {
    const removed = operations[idx];
    setOperations((prev) =>
      prev.filter((_, i) => i !== idx).map((op) => ({ ...op, dependsOnIds: op.dependsOnIds.filter((d) => d !== removed.id) }))
    );
    toast.info(`Removed ${removed.operationName}.`);
  };

  // Moves an editable row past the next editable row (locked rows never move)
  const moveOperation = (idx, direction) => {
    let target = idx + direction;
    while (target >= 0 && target < operations.length && isLockedOp(operations[target])) target += direction;
    if (target < 0 || target >= operations.length) return;
    setOperations((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const updateOperationField = (idx, patch) => {
    setOperations((prev) => prev.map((op, i) => (i === idx ? { ...op, ...patch } : op)));
  };

  /* ΓöÇΓöÇ Materials ΓöÇΓöÇ */
  const saveMaterial = (data) => {
    if (matModal.index === null) {
      setMaterials((prev) => [...prev, { ...data, id: `mat-${Date.now()}` }]);
      toast.success(`Added ${data.name}.`);
    } else {
      setMaterials((prev) => prev.map((m, i) => (i === matModal.index ? { ...m, ...data } : m)));
      toast.success(`Updated ${data.name}.`);
    }
    setMatModal(null);
  };

  const removeMaterial = (idx) => {
    const removed = materials[idx];
    setMaterials((prev) => prev.filter((_, i) => i !== idx));
    toast.info(`Removed ${removed.name}.`);
  };

  /* ΓöÇΓöÇ Save / confirm ΓöÇΓöÇ */
  const buildPayload = (action) => {
    const editable = operations.filter((op) => !isLockedOp(op));
    return {
      action,
      plannedStartDate: schedule.startDate,
      plannedEndDate: schedule.endDate || undefined,
      priority: schedule.priority,
      notes: schedule.instructions,
      manager: schedule.manager || undefined,
      leadOperator: editable.find((o) => o.operator)?.operator || undefined,
      allowShortage: allowShortage || undefined,
      revisionReason: revising ? revisionReason.trim() || undefined : undefined,
      operations: editable.map((op) => ({
        sequenceNo: sequences[op.id],
        operationCode: op.operationCode,
        operationName: op.operationName,
        machine: op.machine,
        machineId: op.machineId || undefined,
        operator: op.operator,
        assignedEmployeeId: op.assignedEmployeeId || undefined,
        plannedStart: op.plannedStart || undefined,
        plannedEnd: op.plannedEnd || undefined,
        estimatedMinutes: Number(op.estimatedMinutes) || 20,
        dependsOn: op.dependsOnIds.map((d) => sequences[d]).filter(Boolean),
        instructions: op.instructions || "",
      })),
      materials: materials.map((m) => ({
        name: m.name,
        spec: m.spec,
        requiredQty: Number(m.requiredQty) || 0,
        unit: m.unit,
        availableStock: Number(m.availableStock) || 0,
        relatedOperation: m.relatedOperation,
        remarks: m.remarks,
      })),
    };
  };

  const validate = (confirming) => {
    if (!schedule.startDate) {
      toast.error("Planned start date is required.");
      return false;
    }
    if (confirming && !schedule.endDate) {
      toast.error("Planned end date is required to confirm the plan.");
      return false;
    }
    if (scheduleDatesInvalid) {
      toast.error("Planned end date cannot be before the start date.");
      return false;
    }
    if (confirming) {
      if (operations.length === 0) {
        toast.error("Add at least one operation before confirming the plan.");
        return false;
      }
      const bad = operations.findIndex((op) => op.plannedStart && op.plannedEnd && op.plannedEnd < op.plannedStart);
      if (bad !== -1) {
        toast.error(`Operation ${bad + 1} (${operations[bad].operationName}) ends before it starts.`);
        return false;
      }
    }
    return true;
  };

  const submit = async (action) => {
    const confirming = action === "CONFIRM";
    if (!validate(confirming)) return;
    setSaving(true);
    try {
      await productionApi.planProductionOrder(job.id, buildPayload(action));
      if (confirming) {
        toast.success(revising ? `Plan for ${job.jobNo || job.productionNo} revised.` : `${job.jobNo || job.productionNo} planned and queued for production.`);
      } else {
        toast.success(`Draft saved for ${job.jobNo || job.productionNo}.`);
      }
      onDone();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the plan."));
    } finally {
      setSaving(false);
    }
  };

  const editingOp = opModal && opModal.index !== null ? operations[opModal.index] : null;
  const editingMat = matModal && matModal.index !== null ? materials[matModal.index] : null;

  return (
    <div className="pp-page">

      <header className="pp-header">
        <div className="pp-header-left">
          <button type="button" className="pp-back" onClick={onBack}>
            <ChevronLeft size={16} /> Back to Orders
          </button>
          <div className="pp-title-wrap">
            <div className="pp-title-icon"><Calendar size={24} /></div>
            <div>
              <h2 className="pp-title">{revising ? "Revise Plan" : "Plan Production"} - {job.jobNo || job.productionNo}</h2>
              <p className="pp-subtitle">
                Job {job.jobNo || "—"}{revising ? ` · plan version ${job.planVersion}` : ""} · Plan operations, materials and schedule based on this job's approved specifications.
              </p>
            </div>
          </div>
        </div>

        <div className="pp-actions">
          {!revising && (
            <button type="button" className="pp-btn pp-btn--outline pp-btn--lg" onClick={() => submit("DRAFT")} disabled={saving} title="Saves the plan without releasing it">
              <Save size={16} /> {saving ? "Saving..." : "Save Draft"}
            </button>
          )}
          <button type="button" className="pp-btn pp-btn--primary pp-btn--lg" onClick={() => submit("CONFIRM")} disabled={saving} title={revising ? "Saves the revised plan" : "Confirms the plan and queues the work"}>
            <Send size={16} /> {saving ? "Saving..." : revising ? "Save Revision" : "Confirm & Release"}
          </button>
        </div>
      </header>

      <div className="pp-grid-main">
        <section className="pp-card">
          <CardHead step={1} title="Job Details" note="(From Approved Job)" subtitle="Details come from the approved job order and cannot be edited here." />
          <div className="pp-detail-grid">
            <dl className="pp-detail-col">
              <Detail label="Job Order No">{job.jobNo || job.productionNo || "—"}</Detail>
              <Detail label="Customer">{job.customerName}</Detail>
              <Detail label="Company Name">{job.companyName || "—"}</Detail>
              <Detail label="Product">{job.productName}</Detail>
              <Detail label="Approved Quantity">{job.quantity.toLocaleString()} {job.unit}</Detail>
            </dl>
            <dl className="pp-detail-col">
              <Detail label="Delivery Date">{formatDay(job.dueDate)}</Detail>
              <Detail label="Priority">
                <span className={`pp-prio pp-prio--${priorityTone(job.priority)}`}>
                  <Flag size={13} /> {priorityLabel(job.priority)}
                </span>
              </Detail>
              <Detail label="Special Instructions">{job.specialInstructions || "ΓÇö"}</Detail>
            </dl>
          </div>
        </section>

        <div className="pp-side-column">
          <section className="pp-card pp-card--compact">
            <h4 className="pp-label">Approved Design Files</h4>
            {job.artwork.url ? (
              <div className="pp-file">
                <img src={job.artwork.thumb} alt="Approved proof preview" className="pp-file-thumb" />
                <div className="pp-file-meta">
                  <strong>Approved sample</strong>
                </div>
                <a className="pp-icon-btn pp-icon-btn--neutral" href={job.artwork.url} target="_blank" rel="noopener noreferrer" download title="Open file" aria-label="Open file">
                  <Download size={17} />
                </a>
              </div>
            ) : (
              <p className="pp-muted">No approved sample is attached to this job.</p>
            )}
          </section>

          <section className="pp-card pp-card--compact pp-card--grow">
            <h4 className="pp-label">Product Specification</h4>
            <dl className="pp-spec-list">
              <div><dt>Size</dt><dd>{job.specs.size || "ΓÇö"}</dd></div>
              <div><dt>Paper</dt><dd>{job.specs.paper || "ΓÇö"}</dd></div>
              <div><dt>Color</dt><dd>{job.specs.color || "ΓÇö"}</dd></div>
              <div><dt>Finishing</dt><dd>{job.specs.finishing || "ΓÇö"}</dd></div>
            </dl>
          </section>
        </div>
      </div>

      <section className="pp-card">
        <CardHead
          step={2}
          title="Operation Sequence"
          
          actions={
            <>
              <button type="button" className="pp-btn pp-btn--outline" onClick={resetToSuggested} title="Restore the suggested operations">
                <Sparkles size={15} /> Reset to Suggested
              </button>
              <button type="button" className="pp-btn pp-btn--outline" onClick={() => setOpModal({ index: null })}>
                <Plus size={15} /> Add Operation
              </button>
              <button type="button" className={`pp-btn pp-btn--outline ${reorderMode ? "pp-btn--active" : ""}`} onClick={() => setReorderMode((v) => !v)} aria-pressed={reorderMode}>
                {reorderMode ? <Check size={15} /> : <ListOrdered size={15} />} {reorderMode ? "Done" : "Reorder"}
              </button>
            </>
          }
        />

        <div className="pp-info">
          <Info size={18} />
          <span>
            <strong>{revising ? "Operations that have started or finished are locked." : "Default operations are suggested based on this job's requirements."}</strong>
            <br />
           
          </span>
        </div>

        <div className="pp-table-wrap">
          <table className="pp-table pp-table--stack">
            <thead>
              <tr>
                <th className="pp-col-num">#</th>
                <th>Operation</th>
                <th>Source</th>
                <th>Machine</th>
                <th>Operator</th>
                <th>Planned Start</th>
                <th>Planned End</th>
                <th>Est. Duration</th>
                <th>Starts After</th>
                <th>Instructions</th>
                <th className="pp-td-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {operations.length === 0 ? (
                <tr className="pp-row-empty">
                  <td colSpan={11} className="pp-empty-cell">No operations yet. Add one or reset to the suggested sequence.</td>
                </tr>
              ) : (
                operations.map((op, idx) => {
                  const locked = isLockedOp(op);
                  const rowInvalid = op.plannedStart && op.plannedEnd && op.plannedEnd < op.plannedStart;
                  return (
                    <tr key={op.id} className={locked ? "pp2-locked" : undefined}>
                      <td className="pp-col-num" data-label="#">{sequences[op.id]}</td>
                      <td data-label="Operation">
                        <span className="pp-op-name">
                          <span className="pp-glyph"><OperationGlyph code={op.operationCode} /></span>
                          {op.operationName}
                        </span>
                      </td>
                      <td data-label="Source">
                        {locked ? (
                          <span className="pp2-lock"><Lock size={12} /> {op.status.replace("_", " ")}</span>
                        ) : (
                          <span className="pp-tag">{op.source}</span>
                        )}
                      </td>
                      <td data-label="Machine">
                        {locked ? (
                          op.machine || "ΓÇö"
                        ) : (
                          <ResourceSelect
                            small
                            label="Machine"
                            value={op.machineId}
                            fallbackName={op.machine}
                            items={machines}
                            emptyLabel="Not assigned"
                            onChange={(id, name) => updateOperationField(idx, { machineId: id, machine: name })}
                          />
                        )}
                      </td>
                      <td data-label="Operator">
                        {locked ? (
                          op.operator || "ΓÇö"
                        ) : (
                          <ResourceSelect
                            small
                            label="Operator"
                            value={op.assignedEmployeeId}
                            fallbackName={op.operator}
                            items={operators}
                            emptyLabel="Open for any operator"
                            onChange={(id, name) => updateOperationField(idx, { assignedEmployeeId: id, operator: name })}
                          />
                        )}
                      </td>
                      <td data-label="Planned Start">
                        {locked ? formatDay(op.plannedStart) : (
                          <input type="date" className="pp-input pp-input--sm" value={op.plannedStart} onChange={(e) => updateOperationField(idx, { plannedStart: e.target.value })} aria-label="Planned start" />
                        )}
                      </td>
                      <td data-label="Planned End">
                        {locked ? formatDay(op.plannedEnd) : (
                          <input
                            type="date"
                            className={`pp-input pp-input--sm ${rowInvalid ? "pp-input--error" : ""}`}
                            value={op.plannedEnd}
                            min={op.plannedStart || undefined}
                            onChange={(e) => updateOperationField(idx, { plannedEnd: e.target.value })}
                            aria-label="Planned end"
                          />
                        )}
                      </td>
                      <td data-label="Est. Duration" className="pp-muted">{formatMinutes(op.estimatedMinutes)}</td>
                      <td data-label="Starts After">
                        <span className={op.dependsOnIds.length ? "pp-body-text" : "pp-muted"}>
                          {op.dependsOnIds.length ? op.dependsOnIds.map(nameOfOp).filter(Boolean).join(", ") || "ΓÇö" : "Earlier steps"}
                        </span>
                      </td>
                      <td data-label="Instructions" className="pp-instructions">{op.instructions || "ΓÇö"}</td>
                      <td data-label="Action">
                        <div className="pp-row-actions">
                          {locked ? (
                            <span className="pp-muted">Locked</span>
                          ) : (
                            <>
                              {reorderMode && (
                                <>
                                  <button type="button" className="pp-icon-btn pp-icon-btn--neutral" onClick={() => moveOperation(idx, -1)} disabled={idx === 0} aria-label="Move up">
                                    <ArrowUp size={15} />
                                  </button>
                                  <button type="button" className="pp-icon-btn pp-icon-btn--neutral" onClick={() => moveOperation(idx, 1)} disabled={idx === operations.length - 1} aria-label="Move down">
                                    <ArrowDown size={15} />
                                  </button>
                                </>
                              )}
                              <button type="button" className="pp-icon-btn" onClick={() => setOpModal({ index: idx })} aria-label="Edit operation" title="Edit">
                                <Pencil size={15} />
                              </button>
                              <button type="button" className="pp-icon-btn pp-icon-btn--danger" onClick={() => removeOperation(idx)} aria-label="Remove operation" title="Remove">
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="pp-grid-bottom">
        <section className="pp-card">
          <CardHead
            step={3}
            title="Material Requirements"
            subtitle="Add the materials this order needs. Stock figures are entered by you."
            actions={
              <button type="button" className="pp-btn pp-btn--outline" onClick={() => setMatModal({ index: null })}>
                <Plus size={15} /> Add Material
              </button>
            }
          />

          {hasShortage && (
            <div className="pp-info pp-info--warn">
              <Info size={18} />
              <span>
                Some materials are short on stock. Raise a purchase request, or tick the box below to confirm anyway.
                <label className="pp2-check">
                  <input type="checkbox" checked={allowShortage} onChange={(e) => setAllowShortage(e.target.checked)} />
                  Proceed even though materials are short
                </label>
              </span>
            </div>
          )}

          <div className="pp-table-wrap">
            <table className="pp-table pp-table--compact pp-table--stack">
              <thead>
                <tr>
                  <th className="pp-col-num">#</th>
                  <th>Material</th>
                  <th>Specification</th>
                  <th>Required Qty</th>
                  <th>Unit</th>
                  <th>Available Stock</th>
                  <th>Shortage</th>
                  <th>Related Operation</th>
                  <th>Remarks</th>
                  <th className="pp-td-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr className="pp-row-empty">
                    <td colSpan={10} className="pp-empty-cell">No materials added.</td>
                  </tr>
                ) : (
                  materials.map((mat, idx) => {
                    const shortage = shortageFor(mat.requiredQty, mat.availableStock);
                    return (
                      <tr key={mat.id}>
                        <td className="pp-col-num" data-label="#">{idx + 1}</td>
                        <td data-label="Material"><span className="pp-strong">{mat.name}</span></td>
                        <td data-label="Specification" className="pp-muted">{mat.spec || "ΓÇö"}</td>
                        <td data-label="Required Qty">{Number(mat.requiredQty).toLocaleString()}</td>
                        <td data-label="Unit" className="pp-muted">{mat.unit}</td>
                        <td data-label="Available Stock">{Number(mat.availableStock).toLocaleString()}</td>
                        <td data-label="Shortage">{shortage > 0 ? <span className="pp-shortage">{shortage}</span> : <span className="pp-muted">0</span>}</td>
                        <td data-label="Related Operation">{mat.relatedOperation}</td>
                        <td data-label="Remarks" className="pp-muted">{mat.remarks || "ΓÇö"}</td>
                        <td data-label="Action">
                          <div className="pp-row-actions">
                            <button type="button" className="pp-icon-btn" onClick={() => setMatModal({ index: idx })} aria-label="Edit material" title="Edit">
                              <Pencil size={15} />
                            </button>
                            <button type="button" className="pp-icon-btn pp-icon-btn--danger" onClick={() => removeMaterial(idx)} aria-label="Remove material" title="Remove">
                              <Trash2 size={15} />
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
        </section>

        <section className="pp-card">
          <CardHead step={4} title="Production Schedule" subtitle="Set the overall schedule and priority for this job order." />

          <div className="pp-form-grid pp-form-grid--3">
            <Field label="Planned Start Date" required>
              <input type="date" className="pp-input" value={schedule.startDate} onChange={(e) => updateSchedule("startDate", e.target.value)} />
            </Field>
            <Field label="Planned End Date" required>
              <input
                type="date"
                className={`pp-input ${scheduleDatesInvalid ? "pp-input--error" : ""}`}
                value={schedule.endDate}
                min={schedule.startDate || undefined}
                onChange={(e) => updateSchedule("endDate", e.target.value)}
              />
            </Field>
            <Field label="Estimated Total Duration">
              <div className="pp-duration-box">{durationLabel}</div>
            </Field>
          </div>

          <div className="pp-form-grid">
            <Field label="Production Manager">
              <input type="text" className="pp-input" value={schedule.manager} onChange={(e) => updateSchedule("manager", e.target.value)} placeholder="Name (optional)" />
            </Field>
            <Field label="Production Priority">
              <div className={`pp-select-wrap pp-select-wrap--flag pp-select-wrap--${priorityTone(schedule.priority)}`}>
                <Flag size={14} className="pp-select-flag" />
                <select className="pp-select" value={schedule.priority} onChange={(e) => updateSchedule("priority", e.target.value)}>
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
            </Field>
          </div>

          <Field label="Production Instructions">
            <div className="pp-textarea-wrap">
              <textarea rows={3} maxLength={500} className="pp-textarea" value={schedule.instructions} onChange={(e) => updateSchedule("instructions", e.target.value)} placeholder="Ensure proper quality check at each stage." />
              <span className="pp-counter">{schedule.instructions.length}/500</span>
            </div>
          </Field>

          {revising && (
            <Field label="Reason for Revision" hint="Saved in the plan history.">
              <input type="text" className="pp-input" value={revisionReason} onChange={(e) => setRevisionReason(e.target.value)} placeholder="e.g. Customer changed the finishing" />
            </Field>
          )}
        </section>
      </div>

      {opModal && (
        <Modal title={editingOp ? "Edit Operation" : "Add Operation"} onClose={() => setOpModal(null)}>
          <OperationForm
            initial={
              editingOp
                ? { ...editingOp }
                : {
                    operationCode: "CUTTING",
                    operationName: "Cutting / Trimming",
                    machineId: "",
                    machine: "",
                    assignedEmployeeId: "",
                    operator: "",
                    plannedStart: schedule.startDate,
                    plannedEnd: schedule.startDate,
                    estimatedMinutes: 30,
                    dependsOnIds: operations.length ? [operations[operations.length - 1].id] : [],
                    instructions: "",
                  }
            }
            otherOps={operations.filter((_, i) => i !== opModal.index)}
            machines={machines}
            operators={operators}
            onCancel={() => setOpModal(null)}
            onSubmit={saveOperation}
          />
        </Modal>
      )}

      {matModal && (
        <Modal title={editingMat ? "Edit Material" : "Add Material"} onClose={() => setMatModal(null)}>
          <MaterialForm
            initial={
              editingMat
                ? { ...editingMat }
                : { name: "", spec: "", requiredQty: 0, unit: "pcs", availableStock: 0, relatedOperation: operationNames[0] || "General", remarks: "" }
            }
            operationNames={operationNames}
            onCancel={() => setMatModal(null)}
            onSubmit={saveMaterial}
          />
        </Modal>
      )}
    </div>
  );
}

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
/* Orders waiting to be planned                                               */
/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */

function PlanningListView({ tab, setTab, branches, onOpen, reloadKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("ALL");
  const [branch, setBranch] = useState("ALL");
  const [page, setPage] = useState(1);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const params = { mode: tab };
      if (branch !== "ALL") params.branchId = branch;
      const res = await productionApi.getPlanningJobs(params);
      if (requestId !== requestRef.current) return;
      const d = unwrap(res);
      setRows(Array.isArray(d) ? d : d.eligibleJobs || d.items || []);
    } catch (e) {
      if (requestId !== requestRef.current) return;
      setRows([]);
      setError(errorMessage(e, "Could not load the orders."));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [tab, branch]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (priority !== "ALL" && String(r.priority).toUpperCase() !== priority) return false;
      if (!q) return true;
      return [r.jobNo, r.productionNo, r.customerName, r.productName].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [rows, search, priority]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * ROWS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ROWS_PER_PAGE);

  const resetFilters = () => {
    setSearch("");
    setPriority("ALL");
    setBranch("ALL");
    setPage(1);
  };

  return (
    <div className="pp-page">

      <header className="pp-header">
        <div className="pp-title-wrap">
          <div className="pp-title-icon"><Calendar size={24} /></div>
          <div>
            <h2 className="pp-title">Production Planning</h2>
            
          </div>
        </div>
        <button type="button" className="pp-btn pp-btn--outline" onClick={load} disabled={loading}>
          <RefreshCw size={14} /> {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <div className="pp2-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`pp2-tab ${tab === t.id ? "pp2-tab--active" : ""}`} onClick={() => { setTab(t.id); setPage(1); }}>
            {t.label}
          </button>
        ))}
      </div>

      <section className="pp-filters">
        <div className="pp-field pp-field--search">
          <label className="pp-field-label" htmlFor="pp-search">Search</label>
          <div className="pp-input-wrap">
            <Search size={15} />
            <input id="pp-search" type="text" className="pp-input pp-input--icon" placeholder="Job number, order number, customer, product..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {branches.length > 1 && (
          <div className="pp-field">
            <label className="pp-field-label" htmlFor="pp-branch">Branch</label>
            <select id="pp-branch" className="pp-select" value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1); }}>
              <option value="ALL">All branches</option>
              {branches.map((b) => (
                <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="pp-field">
          <label className="pp-field-label" htmlFor="pp-priority">Priority</label>
          <select id="pp-priority" className="pp-select" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
            <option value="ALL">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <button type="button" className="pp-btn pp-btn--ghost" onClick={resetFilters}>
          <RotateCcw size={14} /> Reset
        </button>
      </section>

      {error && (
        <div className="pp2-error" role="alert">
          <span>{error}</span>
          <button type="button" className="pp-btn pp-btn--outline pp-btn--sm" onClick={load}>Retry</button>
        </div>
      )}

      <section className="pp-card pp-card--flush">
        <div className="pp-table-head">
          <div className="pp-table-head-title">
            <Calendar size={18} />
            <h3>
              {tab === "REVISE" ? "Planned Orders" : "Orders Waiting to Be Planned"} <span className="pp-muted">{tab === "REVISE" ? "(Plan can be revised)" : "(Ready for Production Planning)"}</span>
            </h3>
          </div>
          <span className="pp-count-pill">{filtered.length} Orders Found</span>
        </div>

        <div className="pp-table-wrap">
          <table className="pp-table pp-table--stack pp-table--clickable">
            <thead>
              <tr>
                <th className="pp-col-num">#</th>
                <th>Job Order No</th>
                <th>Customer</th>
                <th>Product</th>
                <th className="pp-td-center">Quantity</th>
                <th>Delivery Date</th>
                <th className="pp-td-center">Priority</th>
                <th className="pp-td-center">Plan</th>
                <th className="pp-td-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="pp-row-empty"><td colSpan={9} className="pp-empty-cell">Loading orders...</td></tr>
              ) : pageItems.length === 0 ? (
                <tr className="pp-row-empty">
                  <td colSpan={9} className="pp-empty-cell">
                    <div>{rows.length === 0 ? (tab === "REVISE" ? "No planned orders to revise." : "Nothing is waiting to be planned.") : "No orders match your filters."}</div>
                    {rows.length > 0 && (
                      <button type="button" className="pp-btn pp-btn--ghost pp-btn--sm" onClick={resetFilters}>
                        <RotateCcw size={13} /> Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                pageItems.map((row, idx) => {
                  const id = row.productionOrderId || row.id || row._id;
                  return (
                    <tr key={id} onClick={() => onOpen(id)}>
                      <td className="pp-col-num" data-label="#">{start + idx + 1}</td>
                      <td data-label="Job Order No"><span className="pp-strong">{row.jobNo || row.productionNo || "—"}</span></td>
                      <td data-label="Customer">{row.customerName || "—"}</td>
                      <td data-label="Product">{row.productName || "—"}</td>
                      <td className="pp-td-center" data-label="Quantity"><span className="pp-strong">{(Number(row.requiredQuantity) || 0).toLocaleString()}</span></td>
                      <td className="pp-muted" data-label="Delivery Date">{formatDay(row.dueDate)}</td>
                      <td className="pp-td-center" data-label="Priority"><PriorityBadge priority={row.priority} /></td>
                      <td className="pp-td-center" data-label="Plan">
                        <span className="pp-badge pp-badge--approved">{row.planningStatus === "DRAFT" ? "Draft" : row.status && row.status !== "UNASSIGNED" ? `v${row.planVersion || 1}` : "Unplanned"}</span>
                      </td>
                      <td className="pp-td-center" data-label="Action" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="pp-btn pp-btn--outline pp-btn--sm" onClick={() => onOpen(id)}>
                          {tab === "REVISE" ? "Revise Plan" : "Plan Production"} <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="pp-pagination">
          <span className="pp-muted">
            Showing {filtered.length === 0 ? 0 : start + 1} to {Math.min(start + ROWS_PER_PAGE, filtered.length)} of {filtered.length} orders
          </span>
          <div className="pp-pager">
            <button type="button" className="pp-page-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} aria-label="Previous page">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} type="button" className={`pp-page-btn ${p === safePage ? "pp-page-btn--active" : ""}`} onClick={() => setPage(p)} aria-current={p === safePage ? "page" : undefined}>
                {p}
              </button>
            ))}
            <button type="button" className="pp-page-btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} aria-label="Next page">
              <ChevronRight size={14} />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
/* Page                                                                       */
/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */

export const ProductionPlanningPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [tab, setTab] = useState("PLAN");
  const [activeJob, setActiveJob] = useState(null);
  const [opening, setOpening] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [branches, setBranches] = useState([]);
  const cameFromState = useRef(false);

  useEffect(() => {
    productionApi.getMachines({ lookup: true }).then((r) => setMachines(listOf(r))).catch(() => setMachines([]));
    productionApi.getOperators({ lookup: true }).then((r) => setOperators(listOf(r))).catch(() => setOperators([]));
    productionApi.getBranches().then((r) => setBranches(listOf(r))).catch(() => setBranches([]));
  }, []);

  const openJob = useCallback(async (identifier) => {
    setOpening(true);
    try {
      const res = await productionApi.getPlanningJobById(identifier);
      const d = unwrap(res);
      const row = d.jobItem || d.item || d;
      setActiveJob(mapRow(row));
    } catch (e) {
      toast.error(errorMessage(e, "Could not open this order for planning."));
    } finally {
      setOpening(false);
    }
  }, []);

  // Arriving from Orders / Dashboard: state = { productionOrderId, jobNo }
  useEffect(() => {
    const target = location.state?.productionOrderId || location.state?.jobNo;
    if (target && !cameFromState.current) {
      cameFromState.current = true;
      openJob(target);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate, openJob]);

  const closeJob = () => {
    setActiveJob(null);
    navigate("/production/orders");
  };
  const finished = () => {
    setActiveJob(null);
    setReloadKey((k) => k + 1);
    navigate("/production/orders");
  };

  if (opening && !activeJob) {
    return (
      <div className="pp-page">
        <div className="pp-card"><p className="pp2-loading-note">Opening order...</p></div>
      </div>
    );
  }

  if (activeJob) {
    return (
      <PlanProductionView
        key={activeJob.id}
        job={activeJob}
        machines={machines}
        operators={operators}
        onBack={closeJob}
        onDone={finished}
      />
    );
  }

  return <PlanningListView tab={tab} setTab={setTab} branches={branches} onOpen={openJob} reloadKey={reloadKey} />;
};

export default ProductionPlanningPage;
