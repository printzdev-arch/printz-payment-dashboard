import React from "react";
import { formatDateTime, } from "../../utils/format";
import { statusLabel, typeLabel } from "../../utils/saleOrderStatus";
import "../../styles/sale-order.css";

const ACTION_LABELS = {
  ORDER_CREATED: "Order created",
  ORDER_EDITED: "Draft edited",
  PLACED: "Order placed",
  ADVANCE_COLLECTED: "Advance payment collected",
  AUTO_ASSIGNED: "Assigned to a designer automatically",
  MANUAL_ASSIGNED: "Assigned to a designer by the unit manager",
  WAITING_FOR_DESIGNER: "Waiting for a free designer",
  REASSIGNED: "Reassigned to another designer",
  DESIGN_STARTED: "Designer started the design",
  DESIGN_VERSION_CREATED: "Design version uploaded",
  DESIGN_SENT: "Design sent to the customer on WhatsApp",
  CUSTOMER_APPROVED: "Customer approved the design",
  CHANGES_REQUESTED: "Customer requested changes",
  PRINT_STARTED: "Printing started",
  PRINT_FINISHED: "Printing finished",
  DISPATCHED: "Dispatched to the branch",
  RECEIVED_AT_BRANCH: "Received at the branch",
  FINAL_PAYMENT_COLLECTED: "Final payment collected",
  DELIVERED: "Delivered to the customer",
  CANCELLED: "Order cancelled",
};

export default function OrderTimeline({ events = [] }) {
  if (!events.length) {
    return <div className="so-hint">No activity yet.</div>;
  }
  return (
    <ul className="so-timeline">
      {events.map((e) => (
        <li key={e._id}>
          <div className="so-timeline-action">{ACTION_LABELS[e.action] || typeLabel(e.action)}</div>
          <div className="so-timeline-meta">
            {formatDateTime(e.createdAt)} · {e.actorRole === "system" ? "System" : typeLabel(e.actorRole)}
            {e.toStatus && e.fromStatus !== e.toStatus ? ` · ${statusLabel(e.toStatus)}` : ""}
          </div>
          {e.notes ? <div className="so-timeline-note">“{e.notes}”</div> : null}
        </li>
      ))}
    </ul>
  );
}
