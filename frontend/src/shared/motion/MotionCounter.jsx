import React, { useEffect, useState, useMemo } from "react";
import { animate } from "framer-motion";
import { isReducedMotionPreferred } from "./motionTokens";

/**
 * Reusable MotionCounter for smooth numeric count-ups on KPI cards & totals.
 *
 * @param {Object} props
 * @param {number} props.value - Target numeric value
 * @param {number} [props.duration=0.9] - Animation duration in seconds
 * @param {string} [props.prefix=""] - E.g. "₹" or "$"
 * @param {string} [props.suffix=""] - E.g. "%" or " pcs"
 * @param {number} [props.decimals=0] - Decimal places
 * @param {string} [props.className=""]
 */
export const MotionCounter = ({
  value = 0,
  duration = 0.9,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}) => {
  const prefersReduced = useMemo(() => isReducedMotionPreferred(), []);
  const numericTarget = typeof value === "number" ? value : parseFloat(value) || 0;
  const [displayValue, setDisplayValue] = useState(prefersReduced ? numericTarget : 0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplayValue(numericTarget);
      return;
    }

    const controls = animate(0, numericTarget, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        setDisplayValue(latest);
      },
    });

    return () => controls.stop();
  }, [numericTarget, duration, prefersReduced]);

  const formatted = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

export default MotionCounter;