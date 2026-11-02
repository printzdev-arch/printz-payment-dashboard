import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, CheckCircle2, ClipboardList, Clock, Package, Paperclip, Receipt, Search, User } from "lucide-react";
import saleOrderApi from "../api/saleOrderApi";
import Section from "../components/common/Section";
import KpiCard from "../components/common/KpiCard";
import OrderItemsEditor from "../components/branch/OrderItemsEditor";
import ReferenceFilePicker from "../components/branch/ReferenceFilePicker";
import { calcTotals, emptyItem } from "../utils/totals";
import { errorMessage, formatMoney, isoDay, toDateInput } from "../utils/format";
import "../styles/sale-order.css";

const blankForm = (branchId = "") => ({
  branchId,
  priority: "NORMAL",
  urgentChargeType: "AMOUNT",
  urgentChargeValue: "",
  expectedDeliveryDate: isoDay(3),
  customerRequirements: "",
  mobile: "",
  customerName: "",
  whatsappNumber: "",
  whatsappOptIn: true,
  email: "",
  address: "",
  discountAmount: "",
});

const isMobile = (v) => /^[6-9]\d{9}$/.test(String(v || "").replace(/\D/g, "").slice(-10));

// Create a new sale order draft, or edit an existing draft (when the URL has an id).
export default function CreateSaleOrderPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const scope = useMemo(() => saleOrderApi.getUserScope(), []);

  const [form, setForm] = useState(() => blankForm(scope.branchId));
  const [items, setItems] = useState([emptyItem()]);
  const [files, setFiles] = useState([]);
  const [attached, setAttached] = useState(0);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lookupNote, setLookupNote] = useState(null);
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    saleOrderApi.getBranches().then(setBranches);
  }, []);

  // Editing: load the draft into the form
  useEffect(() => {
    if (!editing) return;
    (async () => {
      try {
        const o = await saleOrderApi.get(id);
        if (o.status !== "DRAFT") {
          toast.info("Only a draft can be edited.");
          navigate(`/sale-orders/${id}`, { replace: true });
          return;
        }
        const c = o.customerSnapshot || {};
        setForm({
          branchId: String(o.orderBranchId || ""),
          priority: o.priority,
          urgentChargeType: o.urgentChargeType || "AMOUNT",
          urgentChargeValue: o.urgentChargeValue !== undefined && o.urgentChargeValue !== null ? String(o.urgentChargeValue) : "",
          expectedDeliveryDate: toDateInput(o.expectedDeliveryDate),
          customerRequirements: o.customerRequirements || "",
          mobile: c.mobile || "",
          customerName: c.name || "",
          whatsappNumber: c.whatsappNumber || "",
          whatsappOptIn: Boolean(c.whatsappOptIn),
          email: c.email || "",
          address: c.address || "",
          discountAmount: o.discountAmount ? String(o.discountAmount) : "",
        });
        setItems(
          (o.items || []).map((it) => ({
            productType: it.productType,
            description: it.description,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            taxRate: it.taxRate,
          }))
        );
        setAttached((o.referenceFiles || []).length);
      } catch (err) {
        setError(errorMessage(err, "Could not load this draft."));
      } finally {
        setLoading(false);
      }
    })();
  }, [editing, id, navigate]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const totals = useMemo(
    () => calcTotals(items, form.discountAmount, form.priority, form.urgentChargeType, form.urgentChargeValue),
    [items, form.discountAmount, form.priority, form.urgentChargeType, form.urgentChargeValue]
  );
  const totalQuantity = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0),
    [items]
  );
  const deliveryDisplay = useMemo(() => {
    if (!form.expectedDeliveryDate) return "—";
    try {
      const d = new Date(form.expectedDeliveryDate);
      if (isNaN(d.getTime())) return form.expectedDeliveryDate;
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    } catch {
      return form.expectedDeliveryDate;
    }
  }, [form.expectedDeliveryDate]);
  const branchName = branches.find((b) => String(b._id) === String(form.branchId))?.name || "";
  const eligibleBranches = branches.length > 0 ? (branches.filter((b) => b.manufacturingUnitId).length > 0 ? branches.filter((b) => b.manufacturingUnitId) : branches) : [];

  const findCustomer = async () => {
    setLookupNote(null);
    if (!isMobile(form.mobile)) {
      setLookupNote({ tone: "warn", text: "Enter a valid 10-digit mobile number first." });
      return;
    }
    try {
      setLooking(true);
      const res = await saleOrderApi.lookupCustomer(form.mobile.replace(/\D/g, "").slice(-10));
      if (res?.found) {
        const c = res.customer;
        setForm((f) => ({
          ...f,
          customerName: c.name || f.customerName,
          email: c.email || f.email,
          address: c.address || f.address,
        }));
        setLookupNote({ tone: "success", text: `Existing customer found: ${c.name}. Details were filled in.` });
      } else {
        setLookupNote({ tone: "info", text: "New customer. Please fill in the details below." });
      }
    } catch (err) {
      setLookupNote({ tone: "warn", text: errorMessage(err, "Could not search customers.") });
    } finally {
      setLooking(false);
    }
  };

  const validate = () => {
    if (!form.branchId) return "Please select the branch.";
    if (!form.customerName.trim()) return "Customer name is required.";
    if (!isMobile(form.mobile)) return "Mobile number must be 10 digits and start with 6, 7, 8 or 9.";
    if (form.whatsappNumber && !isMobile(form.whatsappNumber)) return "WhatsApp number must be a valid 10-digit mobile number.";
    const earliest = form.priority === "URGENT" ? isoDay(0) : isoDay(1);
    if (!form.expectedDeliveryDate || form.expectedDeliveryDate < earliest) {
      return form.priority === "URGENT" ? "Deliver-by date cannot be in the past." : "Deliver-by date must be tomorrow or later (urgent orders may use today).";
    }
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      if (!it.description.trim()) return `Item ${i + 1}: describe what to make.`;
      if (!(Number(it.quantity) > 0)) return `Item ${i + 1}: quantity must be more than 0.`;
      if (!(Number(it.unitPrice) > 0)) return `Item ${i + 1}: rate must be more than 0.`;
    }
    if (Number(form.discountAmount || 0) > totals.subtotal) return "Discount cannot be more than the sub total.";
    return "";
  };

  const save = async (andPlace) => {
    setError("");
    const problem = validate();
    if (problem) {
      setError(problem);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const body = {
      branchId: form.branchId,
      priority: form.priority,
      urgentChargeType: form.urgentChargeType || "AMOUNT",
      urgentChargeValue: form.priority === "URGENT" ? Number(form.urgentChargeValue || 0) : 0,
      expectedDeliveryDate: form.expectedDeliveryDate,
      customerRequirements: form.customerRequirements,
      customerName: form.customerName.trim(),
      mobile: form.mobile.replace(/\D/g, "").slice(-10),
      whatsappNumber: (form.whatsappNumber || form.mobile).replace(/\D/g, "").slice(-10),
      whatsappOptIn: form.whatsappOptIn,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      discountAmount: Number(form.discountAmount || 0),
      items: items.map((it) => ({
        productType: it.productType,
        description: it.description.trim(),
        quantity: Number(it.quantity),
        unit: it.unit,
        unitPrice: Number(it.unitPrice),
        taxRate: Number(it.taxRate || 0),
      })),
    };

    try {
      setSaving(true);
      const saved = editing ? await saleOrderApi.update(id, body) : await saleOrderApi.create(body);
      const orderId = saved?._id || id;
      if (files.length) {
        try {
          await saleOrderApi.uploadReferenceFiles(orderId, files);
        } catch (err) {
          toast.warn(`Draft saved, but the files could not be uploaded: ${errorMessage(err)}`);
        }
      }
      toast.success(editing ? "Draft updated" : "Draft saved");
      navigate(`/sale-orders/${orderId}${andPlace ? "?place=1" : ""}`);
    } catch (err) {
      setError(errorMessage(err, "Could not save the order."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="so-page"><div className="so-loading">Loading draft...</div></div>;

  return (
    <div className="so-page">
      <button type="button" className="so-back-link" onClick={() => navigate(editing ? `/sale-orders/${id}` : "/sale-orders")}>
        <ArrowLeft size={15} /> Back
      </button>
      <div className="so-header">
        <div className="so-title">
          <h1>{editing ? "Edit Draft Order" : "New Sale Order"}</h1>
        </div>
        <div className="so-header-actions">
          <button type="button" className="btn-printz-outline so-btn secondary" onClick={() => save(false)} disabled={saving}>
            Save as Draft
          </button>
          <button type="button" className="btn-printz-primary so-btn primary" onClick={() => save(true)} disabled={saving}>
            <CheckCircle2 size={16} /> {saving ? "Saving..." : "Save & Collect Advance"}
          </button>
        </div>
      </div>

      {/* ─── Dashboard UI KPI Cards ─────────────────────────────────── */}
      <div className="so-kpi-grid printz-kpi-grid">
        <KpiCard
          icon={Package}
          tone="teal"
          value={items.length}
          label="Order Items"
        />
        <KpiCard
          icon={ClipboardList}
          tone="blue"
          value={totalQuantity}
          label="Total Quantity"
        />
        <KpiCard
          icon={Clock}
          tone="amber"
          value={deliveryDisplay}
          label="Deliver By"
        />
        <KpiCard
          icon={Paperclip}
          tone="purple"
          value={files.length + attached}
          label="Reference Files"
        />
        <KpiCard
          icon={CheckCircle2}
          tone="green"
          value={formatMoney(totals.grandTotal)}
          label="Estimated Total"
        />
      </div>

      {error && <div className="so-alert error"><span>{error}</span></div>}

      <div className="so-create-grid">
        {/* ─── Row 1: Left 50% - Customer Details ────────────────────────────── */}
        <div className="so-grid-half">
          <Section icon={User} title="Customer Details">
            <div className="so-form-grid">
              <div className="so-field">
                <label>Mobile number <span className="req">*</span></label>
                <div className="so-input-group">
                  <input
                    className="so-input"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={form.mobile}
                    onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "") }))}
                    onBlur={() => isMobile(form.mobile) && !form.customerName && findCustomer()}
                  />
                  <button type="button" className="btn-printz-outline so-btn secondary" onClick={findCustomer} disabled={looking}>
                    <Search size={14} /> {looking ? "Searching" : "Find"}
                  </button>
                </div>
              </div>
              <div className="so-field">
                <label>Customer name <span className="req">*</span></label>
                <input className="so-input" value={form.customerName} onChange={set("customerName")} placeholder="Full name" />
              </div>

              {lookupNote && (
                <div className="so-span-2">
                  <div className={`so-alert ${lookupNote.tone}`} style={{ marginBottom: 0 }}><span>{lookupNote.text}</span></div>
                </div>
              )}

              <div className="so-field">
                <label>WhatsApp number</label>
                <input
                  className="so-input"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Same as mobile if left empty"
                  value={form.whatsappNumber}
                  onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value.replace(/\D/g, "") }))}
                />
                <span className="so-hint">The design is sent to this number for approval.</span>
              </div>
              <div className="so-field">
                <label>Email</label>
                <input className="so-input" type="email" value={form.email} onChange={set("email")} placeholder="Optional" />
              </div>
              <div className="so-field so-span-2">
                <label>Address</label>
                <input className="so-input" value={form.address} onChange={set("address")} placeholder="Optional" />
              </div>
              <div className="so-span-2">
                <label className="so-check">
                  <input type="checkbox" checked={form.whatsappOptIn} onChange={set("whatsappOptIn")} />
                  <span>
                    <strong>Customer agrees to receive WhatsApp messages</strong> about this order. The design cannot be
                    sent to the customer without this.
                  </span>
                </label>
              </div>
            </div>
          </Section>
        </div>

        {/* ─── Row 1: Right 50% - Order Details ───────────────────────────── */}
        <div className="so-grid-half">
          <Section icon={ClipboardList} title="Order Details">
            <div className="so-form-grid">
              <div className="so-field">
                <label>Branch <span className="req">*</span></label>
                {scope.isAdmin && !editing ? (
                  <select className="so-select" value={form.branchId} onChange={set("branchId")}>
                    <option value="">Select branch</option>
                    {eligibleBranches.map((b) => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                ) : (
                  <input className="so-input" value={branchName || "Your branch"} disabled />
                )}
                {scope.isAdmin && branches.length === 0 && (
                  <span className="so-field-error">No active branches found.</span>
                )}
              </div>
              <div className="so-field">
                <label>Priority</label>
                <div className="so-segmented">
                  <button type="button" className={form.priority === "NORMAL" ? "active" : ""} onClick={() => setForm((f) => ({ ...f, priority: "NORMAL" }))}>
                    Normal
                  </button>
                  <button type="button" className={`${form.priority === "URGENT" ? "active urgent" : ""}`} onClick={() => setForm((f) => ({ ...f, priority: "URGENT" }))}>
                    Urgent
                  </button>
                </div>
              </div>
              {form.priority === "URGENT" && (
                <div className="so-field">
                  <label>Urgent extra charge</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div className="so-segmented" style={{ padding: "2px", flexShrink: 0 }}>
                      <button
                        type="button"
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                        className={form.urgentChargeType === "AMOUNT" ? "active" : ""}
                        onClick={() => setForm((f) => ({ ...f, urgentChargeType: "AMOUNT" }))}
                      >
                        ₹ Amount
                      </button>
                      <button
                        type="button"
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                        className={form.urgentChargeType === "PERCENTAGE" ? "active" : ""}
                        onClick={() => setForm((f) => ({ ...f, urgentChargeType: "PERCENTAGE" }))}
                      >
                        % Percent
                      </button>
                    </div>
                    <div className="so-prefix" style={{ flex: 1 }}>
                      <span>{form.urgentChargeType === "PERCENTAGE" ? "%" : "₹"}</span>
                      <input
                        type="number"
                        min="0"
                        step={form.urgentChargeType === "PERCENTAGE" ? "0.1" : "1"}
                        className="so-input"
                        placeholder={form.urgentChargeType === "PERCENTAGE" ? "e.g. 10%" : "e.g. 100"}
                        value={form.urgentChargeValue}
                        onChange={(e) => setForm((f) => ({ ...f, urgentChargeValue: e.target.value }))}
                      />
                    </div>
                  </div>
                  {totals.urgentChargeAmount > 0 && (
                    <span className="so-hint" style={{ color: "#d97706", fontWeight: 500 }}>
                      + {formatMoney(totals.urgentChargeAmount)} extra charge
                      {form.urgentChargeType === "PERCENTAGE" ? ` (${form.urgentChargeValue}% of subtotal)` : ""}
                    </span>
                  )}
                </div>
              )}
              <div className="so-field">
                <label>Deliver by <span className="req">*</span></label>
                <input
                  type="date"
                  className="so-input"
                  min={form.priority === "URGENT" ? isoDay(0) : isoDay(1)}
                  value={form.expectedDeliveryDate}
                  onChange={set("expectedDeliveryDate")}
                />
              </div>
              <div className="so-field so-span-2">
                <label>Design brief</label>
                <textarea
                  className="so-textarea"
                  value={form.customerRequirements}
                  onChange={set("customerRequirements")}
                  placeholder="Tell the designer what the customer wants: colours, text, style, sizes..."
                />
              </div>
            </div>
          </Section>
        </div>

        {/* ─── Row 2: Full width 100% - Items ─────────────────────────────── */}
        <div className="so-grid-full">
          <Section icon={Package} title="Items">
            <OrderItemsEditor items={items} onChange={setItems} />
          </Section>
        </div>

        {/* ─── Row 3: Left 50% - Reference Files ──────────────────────────── */}
        <div className="so-grid-half">
          <Section icon={Paperclip} title="Reference Files">
            {editing && attached > 0 && <div className="so-hint" style={{ marginBottom: 10 }}>{attached} file(s) already attached.</div>}
            <ReferenceFilePicker files={files} onChange={setFiles} alreadyAttached={attached} />
          </Section>
        </div>

        {/* ─── Row 3: Right 50% - Order Summary ───────────────────────────── */}
        <div className="so-grid-half">
          <Section icon={Receipt} title="Order Summary" flush>
            <div className="so-summary">
              <div className="so-summary-row"><span>Sub total</span><strong>{formatMoney(totals.subtotal)}</strong></div>
              <div className="so-field" style={{ margin: "6px 0 10px 0" }}>
                <label style={{ fontSize: 12 }}>Discount (₹)</label>
                <div className="so-prefix">
                  <span>₹</span>
                  <input type="number" min="0" className="so-input" value={form.discountAmount} onChange={set("discountAmount")} placeholder="0" />
                </div>
              </div>
              {form.priority === "URGENT" && totals.urgentChargeAmount > 0 && (
                <div className="so-summary-row" style={{ color: "#d97706" }}>
                  <span>
                    Urgent charge
                    {form.urgentChargeType === "PERCENTAGE" && form.urgentChargeValue ? ` (${form.urgentChargeValue}%)` : ""}
                  </span>
                  <strong>+ {formatMoney(totals.urgentChargeAmount)}</strong>
                </div>
              )}
              <div className="so-summary-row"><span>Tax</span><strong>{formatMoney(totals.tax)}</strong></div>
              <div className="so-summary-row total"><span>Order total</span><strong>{formatMoney(totals.grandTotal)}</strong></div>
            </div>
            <div className="so-summary-actions">
              <button type="button" className="btn-printz-primary so-btn primary" onClick={() => save(true)} disabled={saving} style={{ width: "100%" }}>
                <CheckCircle2 size={16} /> {saving ? "Saving..." : "Save & Collect Advance"}
              </button>
              <button type="button" className="btn-printz-outline so-btn secondary" onClick={() => save(false)} disabled={saving} style={{ width: "100%" }}>
                Save as Draft
              </button>
              <span className="so-hint">
                The order reaches the manufacturing unit only after the advance is collected.
              </span>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
