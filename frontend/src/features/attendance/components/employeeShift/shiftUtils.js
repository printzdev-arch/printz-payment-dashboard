// Shared helpers for the employee branch shifting UI.

const AVATAR_COLORS = [
  "#3b82f6",
  "#a855f7",
  "#6366f1",
  "#8b5cf6",
  "#4f46e5",
  "#0ea5e9",
  "#d946ef",
  "#059669",
  "#f59e0b",
];

export const getAvatarColor = (name = "") => {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
};

// Shifts are stored as UTC day boundaries, so always read them back as UTC dates.
export const toDateKey = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

export const formatShiftDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Inclusive day count between the first and last day of a shift.
export const shiftDayCount = (from, to) => {
  if (!from || !to) return 0;
  const ms = new Date(toDateKey(to)).getTime() - new Date(toDateKey(from)).getTime();
  return Math.round(ms / 86400000) + 1;
};

// The stored status can lag behind the dates, so prefer the computed one.
export const getShiftStatus = (shift) => shift?.effectiveStatus || shift?.status || "";

export const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
