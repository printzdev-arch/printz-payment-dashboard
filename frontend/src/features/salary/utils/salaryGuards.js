import { useEffect, useState } from "react";
import salaryApi from "../api/salaryApi";

const MAINTENANCE_CODE = "SALARY_PROCESSING_DISABLED";

const statusOf = (err) => err?.response?.status;
const codeOf = (err) => err?.response?.data?.code;

// Builds the Daily Attendance link for a payroll attendance error: opens the
// first problem date and filters to the affected employee.
export const attendanceLinkFor = (msg) => {
  const text = String(msg || "");
  const date = text.match(/\[(\d{4}-\d{2}-\d{2})/)?.[1] || text.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
  const emp = text.match(/EMP-[A-Za-z0-9_-]+/)?.[0];
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (emp) params.set("employee", emp);
  const qs = params.toString();
  return `/attendance/daily${qs ? `?${qs}` : ""}`;
};

export const isMaintenanceError = (err) =>
  codeOf(err) === MAINTENANCE_CODE || statusOf(err) === 503;

export const isConflictError = (err) => statusOf(err) === 409;

// Calculation errors that HR fixes on the Daily Attendance screen.
export const isAttendanceIssue = (msg) =>
  /Cannot calculate payroll/i.test(String(msg || "")) && /attendance/i.test(String(msg || ""));

// Maintenance flag shared by every salary page. It is set the first time any
// write call returns SALARY_PROCESSING_DISABLED and stays for the session.
let maintenanceActive = false;
const listeners = new Set();

export const setMaintenanceActive = (value) => {
  if (maintenanceActive === value) return;
  maintenanceActive = value;
  listeners.forEach((fn) => fn(value));
};

// Asks the backend whether salary writes are enabled; checked once per page
// load so the banner shows before the first failed write.
let statusChecked = false;
const checkProcessingStatus = async () => {
  if (statusChecked) return;
  statusChecked = true;
  try {
    const res = await salaryApi.getProcessingStatus();
    const enabled = res?.data?.enabled ?? res?.enabled;
    if (enabled === false) setMaintenanceActive(true);
  } catch {
    statusChecked = false; // retry on next mount
  }
};

export const useSalaryMaintenance = () => {
  const [active, setActive] = useState(maintenanceActive);
  useEffect(() => {
    listeners.add(setActive);
    setActive(maintenanceActive);
    checkProcessingStatus();
    return () => listeners.delete(setActive);
  }, []);
  return active;
};

// Returns true when the error was a maintenance error (flag is raised).
export const flagIfMaintenance = (err) => {
  if (!isMaintenanceError(err)) return false;
  setMaintenanceActive(true);
  return true;
};

const pad = (n) => String(n).padStart(2, "0");
const IST_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const istDate = (d) => IST_DATE.format(d instanceof Date ? d : new Date(d));

// Mirrors the backend approve rules: the period must be over, and the run must
// have been calculated after it ended.
export const getApprovalState = (run) => {
  if (!run?.payrollYear || !run?.payrollMonth) return { canApprove: true, reason: "" };
  const days = new Date(Date.UTC(run.payrollYear, run.payrollMonth, 0)).getUTCDate();
  const endDate = `${run.payrollYear}-${pad(run.payrollMonth)}-${pad(days)}`;
  const today = istDate(new Date());

  if (today <= endDate) {
    return {
      canApprove: false,
      midMonth: true,
      reason: `Final payroll can only be approved after the period concludes on ${endDate}.`,
    };
  }
  const calcDate = run.calculatedAt ? istDate(run.calculatedAt) : null;
  if (!calcDate || calcDate <= endDate) {
    return {
      canApprove: false,
      recalcRequired: true,
      reason: "Recalculate Required (Calculated mid-month). Recalculate with final attendance before approving.",
    };
  }
  return { canApprove: true, reason: "" };
};
