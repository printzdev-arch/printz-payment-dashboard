import React from "react";
import {
  AlertTriangle,
  FileText,
  History,
  IndianRupee,
  Info,
  MessageCircle,
  Package,
  Paperclip,
  Palette,
  Truck,
  User,
} from "lucide-react";
import Section from "./Section";
import OrderProgress from "./OrderProgress";
import OrderTimeline from "./OrderTimeline";
import DesignVersions from "./DesignVersions";
import { PriorityTag } from "./OrderStatusBadge";
import { fileUrl, formatDate, formatDateTime, formatMoney, initialsOf } from "../../utils/format";
import { typeLabel } from "../../utils/saleOrderStatus";
import "../../styles/sale-order.css";

const MESSAGE_TONE = { QUEUED: "slate", SENT: "blue", DELIVERED: "teal", READ: "green", FAILED: "red" };

// Everything about one order. Used by the branch detail page and the manufacturing unit work page.
// Money blocks only show when the server sent money fields (designers do not receive them).
export default function OrderDetailBody({ order, events }) {
  const hasMoney = order.grandTotal !== undefined;
  const c = order.customerSnapshot || {};
  const latestChange = [...(order.designs || [])]
    .filter((d) => d.status === "CHANGES_REQUESTED")
    .sort((a, b) => b.versionNo - a.versionNo)[0];

  return (
    <>
      <OrderProgress status={order.status} />

      {order.status === "WAITING_FOR_DESIGNER" && (
        <div className="so-alert info">
          <Info size={17} />
          <span>
            <strong>No designer is free right now.</strong> The order is queued and will be assigned automatically as soon
            as a designer becomes available.
          </span>
        </div>
      )}
      {order.status === "CHANGES_REQUESTED" && (
        <div className="so-alert warn">
          <AlertTriangle size={17} />
          <span>
            <strong>The customer asked for changes.</strong>{" "}
            {latestChange?.customerDecision?.changeNotes ? `“${latestChange.customerDecision.changeNotes}”` : ""} The
            designer will upload a new version.
          </span>
        </div>
      )}

      <div className="so-detail-grid">
        <div className="so-detail-main">
          <Section icon={User} title="Customer" subtitle="Details taken when the order was created">
            <div className="so-person" style={{ marginBottom: 16 }}>
              <span className="so-avatar">{initialsOf(c.name)}</span>
              <div>
                <h4>{c.name || "—"}</h4>
                <p>
                  {c.mobile || "—"}
                  {c.email ? ` · ${c.email}` : ""}
                </p>
              </div>
            </div>
            <dl className="so-kv">
              <dt>WhatsApp</dt>
              <dd>
                {c.whatsappNumber || "—"}{" "}
                <span className={`so-badge ${c.whatsappOptIn ? "green" : "amber"}`}>
                  {c.whatsappOptIn ? "Agreed to messages" : "Not agreed"}
                </span>
              </dd>
              {c.address ? (
                <>
                  <dt>Address</dt>
                  <dd>{c.address}</dd>
                </>
              ) : null}
            </dl>
            <div className="so-hint" style={{ margin: "16px 0 8px 0", fontWeight: 600, color: "#334155" }}>
              Design brief
            </div>
            <div className="so-brief">{order.customerRequirements || "No brief was entered."}</div>
          </Section>

          <Section icon={Package} title="Items" subtitle={`${(order.items || []).length} item(s) in this order`} flush>
            <div className="so-table-wrap">
              <table className="so-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Item</th>
                    <th>Qty</th>
                    {hasMoney && <th className="right">Rate</th>}
                    {hasMoney && <th className="right">Tax</th>}
                    {hasMoney && <th className="right">Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((it) => (
                    <tr key={it._id}>
                      <td>{it.lineNo}</td>
                      <td>
                        <span className="strong">{typeLabel(it.productType)}</span>
                        <div className="muted">{it.description}</div>
                      </td>
                      <td>
                        {it.quantity} {String(it.unit || "").toLowerCase()}
                      </td>
                      {hasMoney && <td className="right">{formatMoney(it.unitPrice)}</td>}
                      {hasMoney && <td className="right">{it.taxRate}%</td>}
                      {hasMoney && <td className="right strong">{formatMoney(it.lineTotal)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            icon={Palette}
            title="Design Versions"
            subtitle="Designs prepared by the manufacturing unit and the customer's decision"
          >
            <DesignVersions designs={order.designs || []} />
          </Section>

          <Section icon={History} title="Activity" subtitle="Everything that happened to this order">
            <OrderTimeline events={events || []} />
          </Section>
        </div>

        <div className="so-detail-side">
          <Section icon={FileText} title="Order Details">
            <dl className="so-kv" style={{ gridTemplateColumns: "112px 1fr" }}>
              <dt>Priority</dt>
              <dd><PriorityTag priority={order.priority} /></dd>
              <dt>Deliver by</dt>
              <dd>{formatDate(order.expectedDeliveryDate)}</dd>
              <dt>Branch</dt>
              <dd>{order.orderBranch?.name || "—"}</dd>
              <dt>Mfg. unit</dt>
              <dd>{order.manufacturingUnit?.name || "—"}</dd>
              <dt>Designer</dt>
              <dd>{order.currentAssignment?.designerName || <span className="so-hint">Not assigned yet</span>}</dd>
              <dt>Placed on</dt>
              <dd>{order.status === "DRAFT" ? "Not placed yet" : formatDateTime(order.orderDate)}</dd>
            </dl>
          </Section>

          {(order.printing?.startedAt || order.dispatch?.dispatchNo || order.delivery?.deliveredAt || order.cancellation?.cancelledAt) && (
            <Section icon={Truck} title="Production & Delivery">
              <dl className="so-kv" style={{ gridTemplateColumns: "112px 1fr" }}>
                {order.printing?.startedAt && (
                  <>
                    <dt>Printing</dt>
                    <dd>
                      {order.printing.completedAt
                        ? `${order.printing.printedQty} printed${order.printing.spoilageQty ? `, ${order.printing.spoilageQty} spoiled` : ""} · ${formatDateTime(order.printing.completedAt)}`
                        : `Started ${formatDateTime(order.printing.startedAt)}`}
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
                      {order.dispatch.packagesReceived} of {order.dispatch.packages} package(s) · {formatDateTime(order.dispatch.receivedAtBranchAt)}
                      {order.dispatch.receiveRemarks ? <div className="so-hint">{order.dispatch.receiveRemarks}</div> : null}
                    </dd>
                  </>
                )}
                {order.delivery?.deliveredAt && (
                  <>
                    <dt>Delivered</dt>
                    <dd>
                      To {order.delivery.receivedByName} · {formatDateTime(order.delivery.deliveredAt)}
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
                <div className="so-rows" style={{ padding: "0 22px 14px 22px", borderTop: "1px solid #f1f5f9" }}>
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

          <Section icon={Paperclip} title="Reference Files" subtitle="Logos and samples from the customer">
            {(order.referenceFiles || []).length === 0 ? (
              <div className="so-hint">No reference files attached.</div>
            ) : (
              <div className="so-thumbs">
                {order.referenceFiles.map((f) => {
                  const isImage = /^image\//.test(f.mimeType || "");
                  return (
                    <a key={f._id} className="so-thumb" href={fileUrl(f.url)} target="_blank" rel="noreferrer" title={f.fileName}>
                      {isImage ? <img src={fileUrl(f.url)} alt={f.fileName} /> : (<><FileText size={22} /> {f.fileName}</>)}
                    </a>
                  );
                })}
              </div>
            )}
          </Section>

          {(order.whatsappMessages || []).length > 0 && (
            <Section icon={MessageCircle} title="WhatsApp Messages">
              <div className="so-rows">
                {order.whatsappMessages.map((m) => (
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
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
