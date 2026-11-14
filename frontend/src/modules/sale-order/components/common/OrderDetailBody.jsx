import React, { useState } from "react";
import {
  AlertTriangle,
  FileText,
  IndianRupee,
  Info,
  MessageCircle,
  Package,
  Palette,
  Paperclip,
  Truck,
  User,
} from "lucide-react";
import Section from "./Section";
import DataTable from "../../../../shared/ui/DataTable/DataTable";
import { SPEC_FIELDS } from "../../utils/totals";
import OrderProgress from "./OrderProgress";
import DesignVersions from "./DesignVersions";
import { PriorityTag } from "./OrderStatusBadge";
import { fileUrl, formatDate, formatDateTime, formatMoney, initialsOf } from "../../utils/format";
import { typeLabel } from "../../utils/saleOrderStatus";
import "../../styles/sale-order.css";

const MESSAGE_TONE = { QUEUED: "slate", SENT: "blue", DELIVERED: "teal", READ: "green", FAILED: "red" };
const KV = { gridTemplateColumns: "112px 1fr" };

// Everything about one order, the same for the branch and the manufacturing unit:
//   customer | order details
//   item (full width)
//   design files + reference files (tabs) | payment
//   production & delivery | WhatsApp messages   (only when there is something to show)
export default function OrderDetailBody({ order, events }) {
  const [filesTab, setFilesTab] = useState("design");
  const hasMoney = order.grandTotal !== undefined;
  const c = order.customerSnapshot || {};
  const items = order.items || [];
  const designs = order.designs || [];
  const references = order.referenceFiles || [];
  const messages = order.whatsappMessages || [];
  const latestChange = [...designs]
    .filter((d) => d.status === "CHANGES_REQUESTED")
    .sort((a, b) => b.versionNo - a.versionNo)[0];
  const hasDelivery = order.printing?.startedAt || order.dispatch?.dispatchNo || order.delivery?.deliveredAt || order.cancellation?.cancelledAt;

  return (
    <>
      <OrderProgress status={order.status} events={events || []} />

      {["PLACED", "WAITING_FOR_DESIGNER", "ASSIGNED"].includes(order.status) && (
        <div className="so-alert info">
          <Info size={17} />
          <span>
            <strong>Waiting in the manufacturing unit's queue.</strong> Someone at the unit will take it and start the design.
          </span>
        </div>
      )}
      {order.status === "CHANGES_REQUESTED" && (
        <div className="so-alert warn">
          <AlertTriangle size={17} />
          <span>
            <strong>The customer asked for changes.</strong>{" "}
            {latestChange?.customerDecision?.changeNotes ? `“${latestChange.customerDecision.changeNotes}”` : ""} The
            manufacturing unit will upload a new version.
          </span>
        </div>
      )}

      {/* ── Row 1: customer | order details ─────────────────────────────────── */}
      <div className="so-two-col">
        <Section icon={User} title="Customer">
          <div className="so-person" style={{ marginBottom: 14 }}>
            <span className="so-avatar">{initialsOf(c.name)}</span>
            <div>
              <h4>{c.name || "—"}</h4>
              <p>{c.mobile || "—"}</p>
            </div>
          </div>
          <dl className="so-kv" style={KV}>
            <dt>WhatsApp</dt>
            <dd>
              {c.whatsappNumber || "—"}{" "}
              <span className={`so-badge ${c.whatsappOptIn ? "green" : "amber"}`}>
                {c.whatsappOptIn ? "Agreed to messages" : "Not agreed"}
              </span>
            </dd>
            {c.email ? (
              <>
                <dt>Email</dt>
                <dd>{c.email}</dd>
              </>
            ) : null}
            {c.address ? (
              <>
                <dt>Address</dt>
                <dd>{c.address}</dd>
              </>
            ) : null}
            <dt>Design brief</dt>
            <dd>{order.customerRequirements || <span className="so-hint">No brief was entered.</span>}</dd>
          </dl>
        </Section>

        <Section icon={FileText} title="Order Details">
          <div className="so-od-grid">
          <dl className="so-kv" style={KV}>
            <dt>Priority</dt>
            <dd><PriorityTag priority={order.priority} /></dd>
            <dt>Deliver by</dt>
            <dd>{formatDate(order.expectedDeliveryDate)}</dd>
            <dt>Branch</dt>
            <dd>{order.orderBranch?.name || "—"}</dd>
            <dt>Mfg. unit</dt>
            <dd>{order.manufacturingUnit?.name || "—"}</dd>
            <dt>Placed on</dt>
            <dd>{order.status === "DRAFT" ? "Not placed yet" : formatDateTime(order.orderDate)}</dd>
            <dt>Taken by</dt>
            <dd>
              {order.currentAssignment?.designerName || <span className="so-hint">Not taken yet</span>}
              {order.currentAssignment?.assignedAt && <div className="so-hint">{formatDateTime(order.currentAssignment.assignedAt)}</div>}
            </dd>
            {order.currentDesignVersion ? (
              <>
                <dt>Design</dt>
                <dd>Version {order.currentDesignVersion}</dd>
              </>
            ) : null}
          </dl>
          <aside className="so-od-files">
            <div className="so-od-files-title">Reference Files <span className="so-tab-count">{references.length}</span></div>
            {references.length === 0 ? (
              <div className="so-od-files-empty">
                <Paperclip size={22} />
                <span>No reference files attached</span>
              </div>
            ) : (
              <div className="so-thumbs">
                {references.map((f) => {
                  const isImage = /^image\//.test(f.mimeType || "");
                  return (
                    <a key={f._id} className="so-thumb" href={fileUrl(f.url)} target="_blank" rel="noreferrer" title={f.fileName}>
                      {isImage ? <img src={fileUrl(f.url)} alt={f.fileName} /> : <FileText size={22} />}
                    </a>
                  );
                })}
              </div>
            )}
          </aside>
          </div>
        </Section>
      </div>

      {/* ── Row 2: item ─────────────────────────────────────────────────────── */}
      <Section icon={Package} title="Item" flush>
        <DataTable
          searchable={false}
          pagination={false}
          data={items}
          columns={[
            {
              key: "item",
              label: "Item",
              render: (it) => {
                const chips = SPEC_FIELDS.map((f) => [f.label, it.specification?.[f.specKey]]).filter(([, v]) => v);
                return (
                  <>
                    <span className="strong">{typeLabel(it.productType)}</span>
                    <div className="muted">{it.description}</div>
                    {chips.length > 0 && (
                      <div className="so-chips">
                        {chips.map(([label, value]) => (
                          <span className="so-chip" key={label}><em>{label}</em><b>{value}</b></span>
                        ))}
                      </div>
                    )}
                  </>
                );
              },
            },
            {
              key: "quantity",
              label: "Qty",
              width: "110px",
              render: (it) => (
                <span style={{ whiteSpace: "nowrap" }}>
                  <span className="strong">{it.quantity}</span> {String(it.unit || "").toLowerCase()}
                </span>
              ),
            },
            ...(hasMoney
              ? [
                  { key: "unitPrice", label: "Rate", align: "right", width: "120px", render: (it) => formatMoney(it.unitPrice) },
                  { key: "taxRate", label: "Tax", align: "right", width: "90px", render: (it) => `${it.taxRate}%` },
                  {
                    key: "lineTotal",
                    label: "Total",
                    align: "right",
                    width: "130px",
                    render: (it) => <span className="strong">{formatMoney(it.lineTotal)}</span>,
                  },
                ]
              : []),
          ]}
        />
      </Section>

      {/* ── Row 3: files (design / reference tabs) | payment ────────────────── */}
      <div className="so-two-col">
        <section className="so-section">
          <div className="so-section-head">
            <span className="so-section-icon"><Palette size={18} /></span>
            <div className="so-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={filesTab === "design"} className={filesTab === "design" ? "active" : ""} onClick={() => setFilesTab("design")}>
                Design Files <span className="so-tab-count">{designs.length}</span>
              </button>
              <button type="button" role="tab" aria-selected={filesTab === "whatsapp"} className={filesTab === "whatsapp" ? "active" : ""} onClick={() => setFilesTab("whatsapp")}>
                WhatsApp Sent <span className="so-tab-count">{messages.length}</span>
              </button>
            </div>
          </div>
          <div className="so-section-body">
            {filesTab === "design" ? (
              <DesignVersions designs={designs} />
            ) : messages.length === 0 ? (
              <div className="so-empty" style={{ padding: "26px 10px" }}>
                <MessageCircle size={30} />
                <strong>No WhatsApp message sent yet</strong>
                Messages sent to the customer will be listed here.
              </div>
            ) : (
              <div className="so-rows">
                {messages.map((m) => (
                  <div className="so-row" key={m._id}>
                    <span>
                      <strong>{typeLabel(m.purpose)}</strong>
                      <div className="sub">
                        {formatDateTime(m.sentAt)} · to {m.toNumber}
                      </div>
                      {m.error ? <div className="sub" style={{ color: "#b91c1c" }}>{m.error}</div> : null}
                    </span>
                    <span className={`so-badge ${MESSAGE_TONE[m.status] || "slate"}`}>{m.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {hasMoney && (
          <Section icon={IndianRupee} title="Payment" flush>
            <div className="so-summary">
              <div className="so-summary-row">
                <span>Sub total</span>
                <strong>{formatMoney(order.subtotal)}</strong>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="so-summary-row">
                  <span>Discount</span>
                  <strong>− {formatMoney(order.discountAmount)}</strong>
                </div>
              )}
              {Number(order.urgentChargeAmount) > 0 && (
                <div className="so-summary-row" style={{ color: "#d97706" }}>
                  <span>
                    Urgent charge
                    {order.urgentChargeType === "PERCENTAGE" && order.urgentChargeValue ? ` (${order.urgentChargeValue}%)` : ""}
                  </span>
                  <strong>+ {formatMoney(order.urgentChargeAmount)}</strong>
                </div>
              )}
              <div className="so-summary-row">
                <span>Tax</span>
                <strong>{formatMoney(order.taxAmount)}</strong>
              </div>
              <div className="so-summary-row total">
                <span>Order total</span>
                <strong>{formatMoney(order.grandTotal)}</strong>
              </div>
              <div className="so-summary-row paid">
                <span>Paid</span>
                <strong>{formatMoney(order.amountPaid)}</strong>
              </div>
              <div className="so-summary-row due">
                <span>Balance due</span>
                <strong>{formatMoney(order.balanceDue)}</strong>
              </div>
            </div>
            {(order.payments || []).length > 0 && (
              <div className="so-rows so-pay-list">
                {order.payments.map((p) => (
                  <div className="so-row" key={p._id}>
                    <span>
                      <strong>{typeLabel(p.paymentType)}</strong> · {typeLabel(p.mode)}
                      <div className="sub">
                        {p.receiptNo} · {formatDateTime(p.collectedAt)}
                      </div>
                    </span>
                    <strong>{formatMoney(p.amount)}</strong>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>

      {/* ── Row 4: production & delivery (only once printing or dispatch has started) ── */}
      {hasDelivery && (
            <Section icon={Truck} title="Production & Delivery">
              <dl className="so-kv" style={KV}>
                {order.printing?.startedAt && (
                  <>
                    <dt>Printing</dt>
                    <dd>
                      {order.printing.completedAt
                        ? `${order.printing.printedQty} printed${order.printing.spoilageQty ? `, ${order.printing.spoilageQty} spoiled` : ""}`
                        : "In progress"}
                      <div className="so-hint">
                        {order.printing.completedAt ? `Finished ${formatDateTime(order.printing.completedAt)}` : `Started ${formatDateTime(order.printing.startedAt)}`}
                      </div>
                    </dd>
                  </>
                )}
                {order.dispatch?.dispatchNo && (
                  <>
                    <dt>Dispatch</dt>
                    <dd>
                      {order.dispatch.dispatchNo} · {typeLabel(order.dispatch.mode)} · {order.dispatch.packages} package(s)
                      <div className="so-hint">
                        {formatDateTime(order.dispatch.dispatchedAt)}
                        {order.dispatch.trackingRef ? ` · Tracking ${order.dispatch.trackingRef}` : ""}
                      </div>
                    </dd>
                  </>
                )}
                {order.dispatch?.receivedAtBranchAt && (
                  <>
                    <dt>Received</dt>
                    <dd>
                      {order.dispatch.packagesReceived} of {order.dispatch.packages} package(s)
                      <div className="so-hint">{formatDateTime(order.dispatch.receivedAtBranchAt)}</div>
                      {order.dispatch.receiveRemarks ? <div className="so-hint">{order.dispatch.receiveRemarks}</div> : null}
                    </dd>
                  </>
                )}
                {order.delivery?.deliveredAt && (
                  <>
                    <dt>Delivered</dt>
                    <dd>
                      To {order.delivery.receivedByName}
                      <div className="so-hint">{formatDateTime(order.delivery.deliveredAt)}</div>
                      {order.delivery.remarks ? <div className="so-hint">{order.delivery.remarks}</div> : null}
                    </dd>
                  </>
                )}
                {order.cancellation?.cancelledAt && (
                  <>
                    <dt>Cancelled</dt>
                    <dd>
                      {formatDateTime(order.cancellation.cancelledAt)}
                      <div className="so-hint">{order.cancellation.reason}</div>
                    </dd>
                  </>
                )}
              </dl>
            </Section>
      )}
    </>
  );
}
