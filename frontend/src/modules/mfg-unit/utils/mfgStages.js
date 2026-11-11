import saleOrderApi from "../../sale-order/api/saleOrderApi";

// Everyone at the manufacturing unit shares the same portal and works the same orders.
// These match the stages the server uses (saleOrder.constants MFG_QUEUE / MFG_DESIGN).
export const QUEUE_STATUSES = ["PLACED", "WAITING_FOR_DESIGNER", "ASSIGNED"];
export const DESIGN_STATUSES = ["IN_DESIGN", "CHANGES_REQUESTED", "SENT_FOR_APPROVAL"];

// The unit's step an order is at, for filters
export const stageOf = (o) => {
  if (QUEUE_STATUSES.includes(o.status)) return "queue";
  if (DESIGN_STATUSES.includes(o.status)) return "design";
  if (o.status === "APPROVED") return "print";
  if (o.status === "PRINTING") return o.printing?.completedAt ? "dispatch" : "printing";
  return "done";
};

// The order's current stage in plain words, with the badge colour (so-badge tones)
export const stageInfo = (o) => {
  switch (o.status) {
    case "PLACED":
    case "WAITING_FOR_DESIGNER":
    case "ASSIGNED":
      return { label: "Waiting in Queue", tone: "amber" };
    case "IN_DESIGN":
      return { label: "Design in Progress", tone: "violet" };
    case "CHANGES_REQUESTED":
      return { label: "Design Revision", tone: "red" };
    case "SENT_FOR_APPROVAL":
      return { label: "Awaiting Customer Approval", tone: "orange" };
    case "APPROVED":
      return { label: "Ready to Print", tone: "green" };
    case "PRINTING":
      return o.printing?.completedAt ? { label: "Ready to Dispatch", tone: "cyan" } : { label: "Printing", tone: "teal" };
    case "DISPATCHED":
      return { label: "Dispatched", tone: "cyan" };
    case "RECEIVED_AT_BRANCH":
      return { label: "Received at Branch", tone: "lime" };
    case "DELIVERED":
      return { label: "Delivered", tone: "green" };
    case "CANCELLED":
      return { label: "Cancelled", tone: "gray" };
    default:
      return { label: String(o.status || "").replace(/_/g, " "), tone: "slate" };
  }
};

export const currentUser = () => saleOrderApi.getUserScope();

// Name of the person who took the order (the same for everyone who looks at it)
export const takenByLabel = (order) => order?.currentAssignment?.designerName || "";

export const waitingText = (mins) => {
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h} h ${mins % 60} min` : `${Math.floor(h / 24)} d ${h % 24} h`;
};
