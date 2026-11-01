const { getTodayDateString } = require("./dateUtils");

// Whole years between a date of birth and a reference date (default: today in IST).
// Returns null when the date of birth is missing or invalid.
function calculateAge(dateOfBirth, asOf = null) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const [dobY, dobM, dobD] = getTodayDateString(dob).split("-").map(Number);
  const ref = asOf ? getTodayDateString(new Date(asOf)) : getTodayDateString();
  const [refY, refM, refD] = ref.split("-").map(Number);

  let age = refY - dobY;
  if (refM < dobM || (refM === dobM && refD < dobD)) age -= 1;
  return age >= 0 ? age : null;
}

module.exports = { calculateAge };
