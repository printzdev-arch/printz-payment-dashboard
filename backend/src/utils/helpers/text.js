/**
 * Text from a request value. A string (or a number) becomes text; anything else (an object, an array, true, null)
 * becomes "" so a required-field check can reject it with a 400, instead of a ".trim is not a function" 500.
 */
const asText = (value) => (typeof value === "string" ? value : typeof value === "number" && Number.isFinite(value) ? String(value) : "");

module.exports = { asText };
