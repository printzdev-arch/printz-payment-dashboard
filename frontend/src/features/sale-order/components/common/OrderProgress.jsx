import React from "react";
import { Check } from "lucide-react";
import { LIFECYCLE, stageIndexOf, statusLabel } from "../../utils/saleOrderStatus";
import "../../styles/sale-order.css";

// The whole journey as a stepper. Steps after the customer approval are shown dimmed ("later").
export default function OrderProgress({ status }) {
  const current = stageIndexOf(status);
  const cancelled = status === "CANCELLED";

  return (
    <div className="so-card spaced">
      <div className="so-flow">
        <div className="so-flow-title">
          Order Progress
          {status === "WAITING_FOR_DESIGNER" && (
            <span className="so-badge amber">Waiting for a free designer</span>
          )}
          {status === "CHANGES_REQUESTED" && (
            <span className="so-badge red">Customer asked for changes</span>
          )}
          {cancelled && <span className="so-badge gray">{statusLabel(status)}</span>}
        </div>
        <div className="so-flow-track">
          {LIFECYCLE.map((step, idx) => {
            let cls = "so-flow-step";
            if (!cancelled) {
              if (idx < current) cls += " done";
              else if (idx === current) cls += " current";
              else if (idx > 5) cls += " later"; // production onwards (built in a later phase)
            } else {
              cls += " later";
            }
            return (
              <div key={step.key} className={cls}>
                <span className="so-flow-num">{idx < current && !cancelled ? <Check size={14} /> : idx + 1}</span>
                <span>
                  <div className="so-flow-name">{step.label}</div>
                  <div className="so-flow-desc">{step.desc}</div>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
