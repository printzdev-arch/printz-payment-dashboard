/**
 * Round a money value to 2 decimals, half away from zero, exactly as a person would on paper.
 * The common "(n + Number.EPSILON) * 100" trick still gets 10.075 wrong (it gives 10.07); shifting the decimal
 * point through the number's text avoids the binary error (10.075 -> 10.08). The frontend uses the same rule
 * (frontend/src/shared/utils/validation.js: round2), so both sides show the same total.
 */
const roundMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (Math.abs(n) >= 1e15) return n; // already beyond the precision of 2 decimals
  const s = String(Math.abs(n));
  // Very small or very large numbers are written with an exponent ("1e-7"); the shift trick does not apply
  const rounded = s.includes("e") ? Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100 : Number(`${Math.round(Number(`${s}e2`))}e-2`);
  return n < 0 ? -rounded : rounded;
};

module.exports = { roundMoney };
