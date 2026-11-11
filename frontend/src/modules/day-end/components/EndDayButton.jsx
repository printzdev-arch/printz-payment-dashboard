import React, { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../../app/providers/AuthContext.jsx";
import dayEndApi from "../api/dayEndApi";

const MANAGER_ROLES = ["MANAGER", "BRANCH_MANAGER"];

/**
 * "End" button for branch managers (sits above Logout in the sidebar).
 * Clicking it compiles today's sale orders and receipts into one PDF and emails it to the admin.
 * Renders nothing for anyone who is not a branch manager.
 */
export const EndDayButton = () => {
  const { role } = useAuth();
  const [isEndingDay, setIsEndingDay] = useState(false);

  const isBranchManager = MANAGER_ROLES.includes(String(role || "").toUpperCase().replace(/\s+/g, "_"));
  if (!isBranchManager) return null;

  const handleEndDay = async () => {
    if (isEndingDay) return;
    const ok = window.confirm(
      "End the day? All of today's sale orders and sales receipts will be compiled into one PDF and emailed to the admin."
    );
    if (!ok) return;

    setIsEndingDay(true);
    try {
      const data = await dayEndApi.closeDay();
      if (data.delivered === false) {
        toast.warning("Report generated, but the email was not delivered: SMTP is not configured on the server.");
      } else {
        toast.success(`Day-end report emailed to ${data.sentTo || "admin"}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send the day-end report");
    } finally {
      setIsEndingDay(false);
    }
  };

  return (
    <button
      type="button"
      className="sidebar-logout-item sidebar-end-item"
      onClick={handleEndDay}
      disabled={isEndingDay}
      title="Close the day and email the day-end PDF to the admin"
    >
      <ClipboardCheck size={18} className="sidebar-logout-icon" />
      <span>{isEndingDay ? "Sending report..." : "End"}</span>
    </button>
  );
};

export default EndDayButton;
