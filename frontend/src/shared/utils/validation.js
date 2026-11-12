/**
 * Field rules shared by every form. They mirror backend/src/utils/validation/fieldRules.js exactly, so the
 * screen and the server accept and reject the same values. The server always checks again.
 *
 *  - is...()        true / false checks
 *  - ...Error()     "" when valid, otherwise the message to show under the field
 *  - only...()      clean typed or pasted text so invalid characters never stay in the box
 */
export const LIMITS = {
  MAX_AMOUNT: 999999999.99,
  MAX_QUANTITY: 10000000,
  MIN_AGE: 18,
  MAX_AGE: 100,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 64,
  NAME_MAX: 100,
};

const MOBILE_RE = /^\d{10}$/;
const PINCODE_RE = /^\d{6}$/;
const PERSON_NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const BUSINESS_NAME_RE = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 .,'&()/+-]*$/u;
const EMAIL_RE = /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

const text = (v) => (v === undefined || v === null ? "" : String(v));

/** A real, finite number from a number or a plain decimal string; null for "", "abc", "1e9", NaN, Infinity. */
export const toFiniteNumber = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string" || v.trim() === "") return null;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(v.trim())) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Round money to 2 decimals, half away from zero (same rule as backend utils/validation/roundMoney.js): 10.075 -> 10.08. */
export const round2 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (Math.abs(n) >= 1e15) return n;
  const s = String(Math.abs(n));
  const rounded = s.includes("e") ? Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100 : Number(`${Math.round(Number(`${s}e2`))}e-2`);
  return n < 0 ? -rounded : rounded;
};

export const isMobile = (v) => MOBILE_RE.test(text(v).trim());
export const isPincode = (v) => PINCODE_RE.test(text(v).trim());
export const isEmail = (v) => text(v).length <= 254 && EMAIL_RE.test(text(v).trim());
export const isGstin = (v) => GSTIN_RE.test(text(v).trim().toUpperCase());
export const isPersonName = (v) => {
  const s = text(v).trim();
  return s.length >= 2 && s.length <= LIMITS.NAME_MAX && PERSON_NAME_RE.test(s);
};
export const isBusinessName = (v) => {
  const s = text(v).trim();
  return s.length >= 2 && s.length <= LIMITS.NAME_MAX && BUSINESS_NAME_RE.test(s) && /\p{L}/u.test(s);
};

export const isAmount = (v, { allowZero = true, max = LIMITS.MAX_AMOUNT } = {}) => {
  const n = toFiniteNumber(v);
  if (n === null || n < 0 || n > max) return false;
  if (!allowZero && n === 0) return false;
  return Math.abs(Math.round(n * 100) - n * 100) < 1e-6;
};
export const isQuantity = (v, { integer = false, max = LIMITS.MAX_QUANTITY } = {}) => {
  const n = toFiniteNumber(v);
  if (n === null || n <= 0 || n > max) return false;
  return integer ? Number.isInteger(n) : true;
};
export const isPercentage = (v) => {
  const n = toFiniteNumber(v);
  return n !== null && n >= 0 && n <= 100;
};

export const isValidDate = (v) => {
  const s = text(v).trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return false;
  const d = new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s.slice(0, 10);
};

export const ageOn = (dob, on = new Date()) => {
  const d = new Date(dob);
  let age = on.getFullYear() - d.getFullYear();
  const m = on.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < d.getDate())) age -= 1;
  return age;
};

export const PASSWORD_MESSAGE = `Password must be ${LIMITS.PASSWORD_MIN}-${LIMITS.PASSWORD_MAX} characters with an uppercase letter, a lowercase letter, a number and a special character.`;
export const isStrongPassword = (v) => {
  const s = text(v);
  return (
    typeof v === "string" &&
    s.length >= LIMITS.PASSWORD_MIN &&
    s.length <= LIMITS.PASSWORD_MAX &&
    /[a-z]/.test(s) &&
    /[A-Z]/.test(s) &&
    /\d/.test(s) &&
    /[^A-Za-z0-9\s]/.test(s) &&
    !/\s/.test(s)
  );
};

// ---------- messages for a form field ("" = valid) ----------
const blank = (v) => text(v).trim() === "";
const req = (v, label) => (blank(v) ? `${label} is required.` : "");

export const mobileError = (v, { label = "Mobile number", required = true } = {}) =>
  blank(v) ? (required ? `${label} is required.` : "") : isMobile(v) ? "" : `${label} must be exactly 10 digits (numbers only).`;

export const personNameError = (v, { label = "Name", required = true } = {}) =>
  blank(v)
    ? required ? `${label} is required.` : ""
    : isPersonName(v) ? "" : `${label} may contain only letters, spaces, apostrophes, hyphens and dots (2-${LIMITS.NAME_MAX} characters).`;

export const businessNameError = (v, { label = "Name", required = true } = {}) =>
  blank(v)
    ? required ? `${label} is required.` : ""
    : isBusinessName(v) ? "" : `${label} must be 2-${LIMITS.NAME_MAX} characters and may not contain special characters such as < > # $ % ^ * = { }.`;

export const emailError = (v, { label = "Email", required = false } = {}) =>
  blank(v) ? (required ? `${label} is required.` : "") : isEmail(v) ? "" : `${label} must be a valid email address (for example name@example.com).`;

export const pincodeError = (v, { label = "PIN code", required = false } = {}) =>
  blank(v) ? (required ? `${label} is required.` : "") : isPincode(v) ? "" : `${label} must be exactly 6 digits.`;

export const gstinError = (v, { label = "GSTIN", required = false } = {}) =>
  blank(v) ? (required ? `${label} is required.` : "") : isGstin(v) ? "" : `${label} must be a valid 15-character GSTIN (for example 29ABCDE1234F1Z5).`;

export const amountError = (v, { label = "Amount", required = false, allowZero = true, max } = {}) =>
  blank(v)
    ? required ? `${label} is required.` : ""
    : isAmount(v, { allowZero, max }) ? "" : `${label} must be a number${allowZero ? " that is 0 or more" : " greater than 0"}, with at most 2 decimal places.`;

export const quantityError = (v, { label = "Quantity", required = true, integer = false } = {}) =>
  blank(v)
    ? required ? `${label} is required.` : ""
    : isQuantity(v, { integer }) ? "" : `${label} must be a ${integer ? "whole " : ""}number greater than 0.`;

export const percentageError = (v, { label = "Percentage", required = false } = {}) =>
  blank(v) ? (required ? `${label} is required.` : "") : isPercentage(v) ? "" : `${label} must be a number between 0 and 100.`;

export const dateOfBirthError = (v, { required = false } = {}) => {
  if (blank(v)) return required ? "Date of birth is required." : "";
  if (!isValidDate(v)) return "Date of birth is not a valid date.";
  const age = ageOn(v);
  return age >= LIMITS.MIN_AGE && age <= LIMITS.MAX_AGE
    ? ""
    : `Employee must be between ${LIMITS.MIN_AGE} and ${LIMITS.MAX_AGE} years old.`;
};

export const dateRangeError = (from, to, label = "End date") =>
  !blank(from) && !blank(to) && isValidDate(from) && isValidDate(to) && String(to).slice(0, 10) < String(from).slice(0, 10)
    ? `${label} cannot be before the start date.`
    : "";

export const passwordError = (v, { required = true } = {}) =>
  blank(v) ? (required ? "Password is required." : "") : isStrongPassword(v) ? "" : PASSWORD_MESSAGE;

export const confirmPasswordError = (password, confirm) =>
  blank(confirm) ? "Please confirm the password." : password === confirm ? "" : "Password and confirmation do not match.";

export const requiredError = req;

// ---------- clean typed / pasted text ----------
export const onlyDigits = (v, max) => text(v).replace(/\D/g, "").slice(0, max);
export const onlyMobile = (v) => {
  let d = text(v).replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2); // pasted +91 98450 12345
  return d.slice(0, 10);
};
export const onlyPersonName = (v) => text(v).replace(/[^\p{L}\p{M} .'-]/gu, "").replace(/\s{2,}/g, " ").slice(0, LIMITS.NAME_MAX);
export const onlyBusinessName = (v) => text(v).replace(/[^\p{L}\p{M}0-9 .,'&()/+-]/gu, "").replace(/\s{2,}/g, " ").slice(0, LIMITS.NAME_MAX);
/** Digits with at most one dot and two decimals, for money fields typed as text. */
export const onlyDecimal = (v, decimals = 2) => {
  const s = text(v).replace(/[^\d.]/g, "");
  const [whole, ...rest] = s.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, decimals)}` : whole;
};

/** Returns the first message in a list of "" / message values, or "" when all are valid. */
export const firstError = (...messages) => messages.find((m) => m) || "";

/** Runs a { field: message } map and returns only the fields that have an error. */
export const collectErrors = (checks) =>
  Object.fromEntries(Object.entries(checks).filter(([, message]) => message));
