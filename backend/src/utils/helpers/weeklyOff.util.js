// AttendancePolicy.weeklyOffDays stores day indices (0 = Sunday ... 6 = Saturday)
// while Branch.weeklyOffDays stores day names. The attendance policy is the
// authoritative schedule; these helpers convert and compare the two forms.
const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const toIndices = (values) => {
  const out = new Set();
  (Array.isArray(values) ? values : []).forEach((v) => {
    if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 6) {
      out.add(v);
      return;
    }
    const s = String(v ?? "").trim();
    if (/^[0-6]$/.test(s)) {
      out.add(Number(s));
      return;
    }
    const idx = DAY_NAMES.indexOf(s.toUpperCase());
    if (idx >= 0) out.add(idx);
  });
  return [...out].sort((a, b) => a - b);
};

const toNames = (values) => toIndices(values).map((i) => DAY_NAMES[i]);

const sameSchedule = (a, b) => {
  const x = toIndices(a);
  const y = toIndices(b);
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

module.exports = { DAY_NAMES, toIndices, toNames, sameSchedule };
