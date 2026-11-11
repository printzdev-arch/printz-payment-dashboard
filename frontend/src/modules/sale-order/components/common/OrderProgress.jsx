import React from "react";
import { Check } from "lucide-react";
import { LIFECYCLE, stageIndexOf, statusLabel } from "../../utils/saleOrderStatus";
import { formatDateTime } from "../../utils/format";
import "../../styles/sale-order.css";

// When each step was reached, taken from the order's activity (the first time it moved into that status)
const reachedAt = (step, events) => {
  if (step.key === "DRAFT") return events[0]?.createdAt || null;
  return events.find((e) => e.toStatus === step.key)?.createdAt || null;
};

const shortTime = (value) =>
  value ? formatDateTime(value).replace(/\s\d{4},/, ",") : ""; // "11 Nov 2026, 04:59 pm" -> "11 Nov, 04:59 pm"

// Where the order is now, as a slim stepper with the date each step was reached.
export default function OrderProgress({ status, events = [] }) {
  const current = stageIndexOf(status);
  const cancelled = status === "CANCELLED";

  return (
    <div className="so-card spaced">
      <div className="so-flow">
        <div className="so-flow-title">
          <span>Order Progress</span>
          {status === "CHANGES_REQUESTED" && <span className="so-badge red">Customer asked for changes</span>}
          {cancelled && <span className="so-badge gray">{statusLabel(status)}</span>}
        </div>

        <div className="so-steps-wrap">
          <ol className="so-steps" style={{ "--n": LIFECYCLE.length }}>
            {LIFECYCLE.map((step, idx) => {
              let cls = "so-step";
              if (cancelled) cls += " later";
              else if (idx < current) cls += " done";
              else if (idx === current) cls += " current";
              else cls += " later";
              const when = !cancelled && idx <= current ? shortTime(reachedAt(step, events)) : "";
              return (
                <li key={step.key} className={cls}>
                  <span className="so-step-dot">{idx < current && !cancelled ? <Check size={14} strokeWidth={3} /> : idx + 1}</span>
                  <div className="so-step-name">{step.label}</div>
                  <div className="so-step-time">{when || " "}</div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
