import React from "react";
import { STATUS_META, statusLabel } from "../../utils/saleOrderStatus";
import "../../styles/sale-order.css";

export function OrderStatusBadge({ status }) {
  const tone = STATUS_META[status]?.tone || "slate";
  return <span className={`so-badge ${tone}`}>{statusLabel(status)}</span>;
}

export function PriorityTag({ priority }) {
  const urgent = priority === "URGENT";
  return <span className={`so-priority ${urgent ? "urgent" : "normal"}`}>{urgent ? "URGENT" : "NORMAL"}</span>;
}

export default OrderStatusBadge;
