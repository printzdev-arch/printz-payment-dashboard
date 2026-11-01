import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { isReducedMotionPreferred } from "./motionTokens";

/**
 * Reusable MotionBadge for status tags, live badges, and operational alert pills.
 *
 * @param {Object} props
 * @param {boolean} [props.pulse=false] - Whether to show a subtle breathing pulse
 * @param {React.ReactNode} props.children
 * @param {string} [props.className=""]
 */
export const MotionBadge = ({
  pulse = false,
  children,
  className = "",
  style = {},
  ...restProps
}) => {
  const prefersReduced = useMemo(() => isReducedMotionPreferred(), []);

  if (prefersReduced || !pulse) {
    return (
      <span className={className} style={style} {...restProps}>
        {children}
      </span>
    );
  }

  return (
    <motion.span
      animate={{
        scale: [1, 1.04, 1],
        opacity: [0.88, 1, 0.88],
      }}
      transition={{
        duration: 3.6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
      style={{ display: "inline-flex", alignItems: "center", ...style }}
      {...restProps}
    >
      {children}
    </motion.span>
  );
};

export default MotionBadge;