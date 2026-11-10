import React, { useState } from "react";
import { toast } from "react-toastify";
import mfgApi from "../api/mfgApi";
import { AVAILABILITY } from "../utils/mfgRole";
import { errorMessage } from "../../sale-order/utils/format";
import "../styles/mfg-unit.css";

// The designer tells the system whether new orders may be assigned to them.
export default function AvailabilitySwitch({ value, onChanged }) {
  const [saving, setSaving] = useState(false);

  const choose = async (next) => {
    if (next === value || saving) return;
    try {
      setSaving(true);
      const res = await mfgApi.setAvailability(next);
      const picked = res?.queueAssigned || 0;
      toast.success(next === "AVAILABLE" && picked > 0 ? `You are available. ${picked} waiting order(s) were assigned to you.` : `You are now ${next.toLowerCase().replace("_", " ")}.`);
      onChanged?.(next);
    } catch (err) {
      toast.error(errorMessage(err, "Could not change your availability."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mfg-avail">
      {AVAILABILITY.map((a) => (
        <button
          key={a.value}
          type="button"
          disabled={saving}
          className={`${value === a.value ? `active ${a.value}` : ""}`}
          onClick={() => choose(a.value)}
        >
          <span className="dot" /> {a.label}
        </button>
      ))}
    </div>
  );
}
