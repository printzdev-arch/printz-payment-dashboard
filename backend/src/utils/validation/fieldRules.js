/**
 * Field rules shared by every module, so a mobile number, a name, an amount or a percentage is checked the
 * same way everywhere. The frontend mirrors these rules in frontend/src/shared/utils/validation.js.
 *
 *  - predicates (isMobile, isPersonName, ...) return true / false and never throw
 *  - chain builders (mobileRule, amountRule, ...) return express-validator chains for route validators
 *  - assert helpers (assertAmount, assertQuantity, ...) throw a 400 from inside a service
 */
const { body } = require("express-validator");
const mongoose = require("mongoose");
const ApiError = require("../errors/ApiError");

const LIMITS = {
  MAX_AMOUNT: 999999999.99, // largest money value accepted in one field
  MAX_QUANTITY: 10000000,
  MIN_AGE: 18,
  MAX_AGE: 100,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 64,
  NAME_MAX: 100,
};

const MOBILE_RE = /^\d{10}$/;
const PINCODE_RE = /^\d{6}$/;
// Letters (any language), spaces, and the marks real names use: . ' -
const PERSON_NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
// A customer can be a company ("3M India Pvt. Ltd."), so digits and a few business marks are allowed
const BUSINESS_NAME_RE = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 .,'&()/+-]*$/u;
const EMAIL_RE = /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const UNSAFE_TEXT_RE = /[<>]/; // no HTML / script tags in free text

const text = (v) => (v === undefined || v === null ? "" : String(v));
const isBlank = (v) => text(v).trim() === "";

/** A real, finite number. Rejects "", "abc", NaN, Infinity, "1e999", true, objects and arrays. */
const toFiniteNumber = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string" || v.trim() === "") return null;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(v.trim())) return null; // plain decimal only (no exponent, no hex)
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const isMobile = (v) => MOBILE_RE.test(text(v).trim());
const isPincode = (v) => PINCODE_RE.test(text(v).trim());
const isEmail = (v) => text(v).length <= 254 && EMAIL_RE.test(text(v).trim());
const isGstin = (v) => GSTIN_RE.test(text(v).trim().toUpperCase());
const isSafeText = (v) => !UNSAFE_TEXT_RE.test(text(v));
const hasLetter = (v) => /\p{L}/u.test(text(v));

const isPersonName = (v) => {
  const s = text(v).trim();
  return s.length >= 2 && s.length <= LIMITS.NAME_MAX && PERSON_NAME_RE.test(s);
};

const isBusinessName = (v) => {
  const s = text(v).trim();
  return s.length >= 2 && s.length <= LIMITS.NAME_MAX && BUSINESS_NAME_RE.test(s) && hasLetter(s);
};

/** Money: a finite number, zero or more, at most two decimals, within the allowed maximum. */
const isAmount = (v, { allowZero = true, max = LIMITS.MAX_AMOUNT } = {}) => {
  const n = toFiniteNumber(v);
  if (n === null || n < 0 || n > max) return false;
  if (!allowZero && n === 0) return false;
  return Math.abs(Math.round(n * 100) - n * 100) < 1e-6;
};

/** Quantity: a finite number greater than zero (whole numbers only when integer is set). */
const isQuantity = (v, { integer = false, max = LIMITS.MAX_QUANTITY } = {}) => {
  const n = toFiniteNumber(v);
  if (n === null || n <= 0 || n > max) return false;
  return integer ? Number.isInteger(n) : true;
};

const isPercentage = (v) => {
  const n = toFiniteNumber(v);
  return n !== null && n >= 0 && n <= 100;
};

/** A calendar date that really exists: "2026-02-31" is rejected (JavaScript would roll it into March). */
const isDateOnly = (v) => {
  const s = text(v);
  if (!DATE_ONLY_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

/** Any date value (date-only or full ISO timestamp) that parses to a real date. */
const isValidDate = (v) => {
  if (v instanceof Date) return !Number.isNaN(v.getTime());
  const s = text(v).trim();
  if (!s) return false;
  if (DATE_ONLY_RE.test(s)) return isDateOnly(s);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(s)) return false;
  return isDateOnly(s.slice(0, 10)) && !Number.isNaN(Date.parse(s));
};

const ageOn = (dob, on = new Date()) => {
  const d = new Date(dob);
  let age = on.getUTCFullYear() - d.getUTCFullYear();
  const m = on.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
};

const isAdultDateOfBirth = (v) => {
  if (!isValidDate(v)) return false;
  const age = ageOn(v);
  return age >= LIMITS.MIN_AGE && age <= LIMITS.MAX_AGE;
};

const PASSWORD_MESSAGE = `Password must be ${LIMITS.PASSWORD_MIN}-${LIMITS.PASSWORD_MAX} characters with an uppercase letter, a lowercase letter, a number and a special character.`;
const isStrongPassword = (v) => {
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

const isObjectId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v) && mongoose.Types.ObjectId.isValid(v);

// ---------------------------------------------------------------------------------------------------------
// express-validator chain builders. `required: false` skips the rule when the field is absent, null or "".
// ---------------------------------------------------------------------------------------------------------
const base = (field, label, required) => {
  const chain = body(field);
  if (required) {
    return chain.custom((v) => !isBlank(v)).withMessage(`${label} is required.`).bail();
  }
  return chain.optional({ values: "falsy" });
};

/** Numbers sent as 9845012345 are turned into "9845012345" before the check. */
const mobileRule = (field, label = "Mobile number", { required = true } = {}) =>
  base(field, label, required)
    .customSanitizer((v) => text(v).trim())
    .custom(isMobile)
    .withMessage(`${label} must be exactly 10 digits (numbers only).`);

const personNameRule = (field, label = "Name", { required = true } = {}) =>
  base(field, label, required)
    .customSanitizer((v) => text(v).trim().replace(/\s+/g, " "))
    .custom(isPersonName)
    .withMessage(`${label} may contain only letters, spaces, apostrophes, hyphens and dots (2-${LIMITS.NAME_MAX} characters).`);

const businessNameRule = (field, label = "Name", { required = true } = {}) =>
  base(field, label, required)
    .customSanitizer((v) => text(v).trim().replace(/\s+/g, " "))
    .custom(isBusinessName)
    .withMessage(`${label} must be 2-${LIMITS.NAME_MAX} characters and may not contain special characters such as < > # $ % ^ * = { }.`);

const emailRule = (field, label = "Email", { required = true } = {}) =>
  base(field, label, required)
    .customSanitizer((v) => text(v).trim().toLowerCase())
    .custom(isEmail)
    .withMessage(`${label} must be a valid email address (for example name@example.com).`);

const pincodeRule = (field, label = "PIN code", { required = false } = {}) =>
  base(field, label, required)
    .customSanitizer((v) => text(v).trim())
    .custom(isPincode)
    .withMessage(`${label} must be exactly 6 digits.`);

const gstinRule = (field, label = "GSTIN", { required = false } = {}) =>
  base(field, label, required)
    .customSanitizer((v) => text(v).trim().toUpperCase())
    .custom(isGstin)
    .withMessage(`${label} must be a valid 15-character GSTIN (for example 29ABCDE1234F1Z5).`);

/** null / "" count as "not sent" for an optional number; 0 is a real value and is checked. */
const numberBase = (field, label, required) => {
  const chain = body(field);
  if (required) return chain.custom((v) => !isBlank(v)).withMessage(`${label} is required.`).bail();
  return chain.optional({ values: "null" }).if((v) => v !== "");
};

const amountRule = (field, label = "Amount", { required = false, allowZero = true, max = LIMITS.MAX_AMOUNT } = {}) =>
  numberBase(field, label, required)
    .custom((v) => isAmount(v, { allowZero, max }))
    .withMessage(
      `${label} must be a number${allowZero ? " that is 0 or more" : " greater than 0"}, with at most 2 decimal places (maximum ${max}).`
    );

const quantityRule = (field, label = "Quantity", { required = false, integer = false, max = LIMITS.MAX_QUANTITY } = {}) =>
  numberBase(field, label, required)
    .custom((v) => isQuantity(v, { integer, max }))
    .withMessage(`${label} must be a ${integer ? "whole " : ""}number greater than 0 (maximum ${max}).`);

const percentageRule = (field, label = "Percentage", { required = false } = {}) =>
  numberBase(field, label, required).custom(isPercentage).withMessage(`${label} must be a number between 0 and 100.`);

const strongPasswordRule = (field = "password", label = "Password", { required = true } = {}) =>
  base(field, label, required).custom(isStrongPassword).withMessage(PASSWORD_MESSAGE);

const objectIdRule = (field, label, { required = true } = {}) =>
  base(field, label, required).custom(isObjectId).withMessage(`${label} is not a valid id.`);

const dateRule = (field, label = "Date", { required = false } = {}) =>
  base(field, label, required).custom(isValidDate).withMessage(`${label} is not a valid date.`);

const safeTextRule = (field, label, { required = false, max = 1000 } = {}) =>
  base(field, label, required)
    .custom((v) => typeof v === "string" && isSafeText(v) && v.length <= max)
    .withMessage(`${label} must be text of at most ${max} characters without < or >.`);

// ---------------------------------------------------------------------------------------------------------
// Assert helpers for services: throw a 400 with a field-specific message.
// ---------------------------------------------------------------------------------------------------------
const fail = (message) => {
  throw ApiError.badRequest(message);
};

const assertQuantity = (v, label = "Quantity", opts = {}) => {
  if (!isQuantity(v, opts)) fail(`${label} must be a ${opts.integer ? "whole " : ""}number greater than 0.`);
  return toFiniteNumber(v);
};

const assertAmount = (v, label = "Amount", opts = {}) => {
  if (!isAmount(v, opts)) {
    fail(`${label} must be a number${opts.allowZero === false ? " greater than 0" : " that is 0 or more"}, with at most 2 decimal places.`);
  }
  return toFiniteNumber(v);
};

const assertPercentage = (v, label = "Percentage") => {
  if (!isPercentage(v)) fail(`${label} must be a number between 0 and 100.`);
  return toFiniteNumber(v);
};

module.exports = {
  LIMITS,
  PASSWORD_MESSAGE,
  toFiniteNumber,
  isBlank,
  isMobile,
  isPincode,
  isEmail,
  isGstin,
  isSafeText,
  isPersonName,
  isBusinessName,
  isAmount,
  isQuantity,
  isPercentage,
  isDateOnly,
  isValidDate,
  isAdultDateOfBirth,
  isStrongPassword,
  isObjectId,
  ageOn,
  mobileRule,
  personNameRule,
  businessNameRule,
  emailRule,
  pincodeRule,
  gstinRule,
  amountRule,
  quantityRule,
  percentageRule,
  strongPasswordRule,
  objectIdRule,
  dateRule,
  safeTextRule,
  assertQuantity,
  assertAmount,
  assertPercentage,
};
