import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { MOTION_TIMINGS, MOTION_EASINGS, isReducedMotionPreferred } from "./motionTokens";

/**
 * Reusable MotionCard wrapper for stats widgets, panels, and container cards.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.hoverLift=false] - Whether to apply subtle hover lift elevation
 * @param {number} [props.delay=0] - Entrance delay in seconds for staggered grids
 * @param {string} [props.className]
 */
export const MotionCard = ({
  children,
  hoverLift = false,
  delay = 0,
  className = "",
  style = {},
  ...restProps
}) => {
  const prefersReduced = useMemo(() => isReducedMotionPreferred(), []);

  if (prefersReduced) {
    return (
      <div className={className} style={style} {...restProps}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: MOTION_TIMINGS.normal + 0.1,
        delay,
        ease: MOTION_EASINGS.easeOut,
      }}
      whileHover={
        hoverLift
          ? {
              y: -3,
              boxShadow: "0 14px 32px -8px rgba(15, 23, 42, 0.12)",
              transition: { duration: MOTION_TIMINGS.normal, ease: MOTION_EASINGS.easeOut },
            }
          : undefined
      }
      className={className}
      style={style}
      {...restProps}
    >
      {children}
    </motion.div>
  );
};

export default MotionCard;